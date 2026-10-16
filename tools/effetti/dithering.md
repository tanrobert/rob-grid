# Dithering delle foto (provato e accantonato, 17/10/2026)

Celle progetto in bitmap a 1 bit: inchiostro rosso su carta, Atkinson, punto di 1 px CSS arrotondato ai pixel reali (1 sul monitor anche al 125%, 3 sul telefono ×3). Calcolato nel browser alla misura vera della cella (canvas), in un Web Worker, solo per le celle in vista e a View Transition finita; risultato in memoria per tutta la visita. Sotto linguetta, freccia e didascalia l'inchiostro diventa pieno (sfuma a punti in 24 px), se no le scritte chiare spariscono sulla carta. In hover i punti si tolgono in ordine Bayer 8×8 e sotto compare la foto a colori (nessun colore fuori palette). Sorgente: la foto in grigio (`tools/grigio.mjs`, tolto con l'effetto: è nella cronologia, `git show d84d8ab:tools/grigio.mjs`).

Tolto subito dopo averlo montato: Roberto ha deciso "nessun effetto di hover e nessun effetto sulle foto, leggero come un razzo". Il giro `vt:tour` era verde in Chrome e Firefox (foto pronta a ogni chiusura). Non verificato: la chiusura su una cella mai calcolata (entrata diretta in un progetto, ✕ → home), che passa dal calcolo sincrono in `astro:after-swap`.

Laboratorio (resta): `node tools/dither-lab.mjs`, poi `npm run vt:serve` → `/_out/dither/` (da `file://` Chrome non lascia leggere i pixel delle immagini). Sei stili (Atkinson, Floyd-Steinberg, Bayer 4 e 8, retino a quadrati, grana), punto, contrasto, luce, punto agganciato o libero, dissolvenza a dithering o normale, contatore di fotogrammi.

## Lezioni
- **Il punto va agganciato ai pixel reali.** Punto libero da 3 px CSS al 125% = 3,75 px reali: punti alternati da 3 e 4, trama irregolare. Canvas a un pixel per punto, ingrandito di un numero intero con `image-rendering: pixelated`.
- **Il punto va pensato in px CSS, non in pixel reali.** Punto "1 pixel reale" su un telefono ×3 = un terzo di px CSS: calcolo 9 volte più grande (14 celle: 6,6 s con CPU ÷4 contro 0,9 s) e l'occhio mescola rosso e carta: la foto sembra **rosa**.
- Costi misurati (Chrome, Atkinson, punto 1): calcolo 40–60 ms per cella sul monitor; un fotogramma della dissolvenza in hover < 3 ms; scroll gratis (il canvas è un'immagine ferma). Il calcolo iniziale (0,5 s per 14 celle) va fuori dal thread principale.
- `.duo` con `overflow: clip`: il canvas può sbordare di un punto e le istantanee delle View Transitions includono ciò che sborda.
- Chiusura dalla hero: la cella d'arrivo dev'essere disegnata in `astro:after-swap` (dalla memoria o calcolata lì), prima della foto della pagina nuova.
- Prima che il dithering sia pronto la cella resta carta (`@media (scripting: enabled)`), se no si vede la foto a colori e poi scatta.

## Per rimetterlo
- `src/lib/dither.ts`, `src/scripts/dither.worker.ts`, `src/scripts/dither.ts` (sotto), `import '../scripts/dither'` nel `<script>` di Layout.astro.
- MediaCell: prop `grey` (foto in grigio, `class="duo__grigio"`, stessi `widths`/`sizes`/`loading` della foto) e dopo `<canvas class="duo__dither" aria-hidden="true"></canvas>`. projects.ts: `grey` dalla cartella del progetto (`copertina.grigio.webp`), Grid.astro la passa.
- morph.ts, `photoReady`: nelle celle progetto prepara `img.duo__grigio`. vt-tour.mjs: "foto pronta" = `canvas.duo__dither[data-ready]`.

## CSS (global.css, sezione Media)

```css
.duo { position: absolute; inset: 0; background: var(--bianco); overflow: clip; }
.duo__dither { position: absolute; left: 0; top: 0; width: 100%; height: 100%; image-rendering: pixelated; }
.duo__grigio { position: absolute; inset: 0; }
@media (scripting: enabled) {
  .duo:has(> .duo__dither) > .duo__grigio { visibility: hidden; }
  /* finché il dithering non è pronto la cella resta carta: la foto a colori sotto non deve comparire */
  .duo:has(> .duo__dither:not([data-ready])) > img { visibility: hidden; }
}
```

## src/lib/dither.ts

```ts
/**
 * Dithering delle foto delle celle progetto: bitmap a 1 bit (inchiostro rosso / carta), Atkinson.
 * Calcolo puro su OffscreenCanvas: lo usano il worker (scripts/dither.worker.ts) e, quando non si
 * può aspettare, la pagina (scripts/dither.ts). Scelto nel laboratorio tools/dither-lab.mjs.
 */

/** Righe (in punti) dove l'inchiostro è pieno, sotto linguetta e didascalia, e quanto sfuma */
export interface Bands { top: number; bottom: number; fade: number }

/** Contrasto attorno al grigio medio, dopo la normalizzazione (laboratorio: 1.2) */
const CONTRAST = 1.2;

/** Atkinson: diffonde solo 6/8 dell'errore, luci e ombre restano piene (grana contrastata) */
const KERNEL = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];

/** Luminosità 0..1 della sorgente ritagliata a riempimento (come object-fit: cover) su w×h punti */
function sample(src: CanvasImageSource, sw: number, sh: number, w: number, h: number): Float32Array {
  const r = w / h;
  let cw = sw / sh > r ? sh * r : sw, ch = sw / sh > r ? sh : sw / r;
  let sx = (sw - cw) / 2, sy = (sh - ch) / 2, cur = src;
  // dimezzando a passi: un solo drawImage da 2400 a 100 px salta dei pixel e sgrana
  while (cw / 2 >= w * 1.5) {
    const c = new OffscreenCanvas(Math.round(cw / 2), Math.round(ch / 2));
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, sx, sy, cw, ch, 0, 0, c.width, c.height);
    [cur, sx, sy, cw, ch] = [c, 0, 0, c.width, c.height];
  }
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cur, sx, sy, cw, ch, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
  for (let i = 0; i < L.length; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  return L;
}

/** Normalizza (1° e 99° percentile, da istogramma), contrasto, inchiostro pieno nelle fasce */
function tone(L: Float32Array, w: number, h: number, { top, bottom, fade }: Bands) {
  const hist = new Uint32Array(256);
  for (const v of L) hist[Math.round(v * 255)]++;
  const at = (q: number) => { let n = 0, i = 0; while (i < 255 && (n += hist[i]) < q * L.length) i++; return i / 255; };
  let lo = at(0.01), hi = at(0.99);
  if (hi - lo < 0.05) [lo, hi] = [0, 1];
  for (let y = 0; y < h; y++) {
    // 0 nelle fasce, poi risale a 1 in `fade` righe: l'inchiostro sfuma a punti
    const k = Math.min(1, Math.max(0, (y - top) / fade), Math.max(0, (h - bottom - 1 - y) / fade));
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      L[i] = k * Math.min(1, Math.max(0, ((L[i] - lo) / (hi - lo) - 0.5) * CONTRAST + 0.5));
    }
  }
}

/** Bit per punto: 1 = carta, 0 = inchiostro */
export function ditherBits(src: CanvasImageSource, sw: number, sh: number, w: number, h: number, bands: Bands): Uint8Array {
  const e = sample(src, sw, sh, w, h);
  tone(e, w, h, bands);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, bit = e[i] >= 0.5 ? 1 : 0, err = (e[i] - bit) / 8;
    out[i] = bit;
    for (const [dx, dy] of KERNEL) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < w && ny < h) e[ny * w + nx] += err;
    }
  }
  return out;
}

/** Soglie Bayer 8×8 (0..1): l'ordine in cui i punti si tolgono nella dissolvenza */
export const BAYER8 = (() => {
  let m = [[0]];
  while (m.length < 8) {
    const s = m.length, r = Array.from({ length: s * 2 }, () => Array<number>(s * 2));
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const v = m[y][x] * 4;
      r[y][x] = v; r[y][x + s] = v + 2; r[y + s][x] = v + 3; r[y + s][x + s] = v + 1;
    }
    m = r;
  }
  return m.map(row => row.map(v => (v + 0.5) / 64));
})();
```

## src/scripts/dither.worker.ts

```ts
/** Dithering fuori dal thread principale: riceve la foto (ImageBitmap) e restituisce i bit (lib/dither.ts) */
import { ditherBits, type Bands } from '../lib/dither';

interface Job { id: number; bitmap: ImageBitmap; w: number; h: number; bands: Bands }
const scope = self as unknown as { postMessage(msg: unknown, transfer: Transferable[]): void };

addEventListener('message', (e: MessageEvent<Job>) => {
  const { id, bitmap, w, h, bands } = e.data;
  const bits = ditherBits(bitmap, bitmap.width, bitmap.height, w, h, bands);
  bitmap.close();
  scope.postMessage({ id, bits }, [bits.buffer]);
});
```

## src/scripts/dither.ts

```ts
/**
 * Celle progetto in dithering (lib/dither.ts): un canvas sopra la foto a colori, inchiostro rosso su
 * carta. Il punto è 1 px CSS arrotondato ai pixel reali (1 sul monitor, anche al 125%; 3 sul
 * telefono ×3): sempre netto e tutto uguale, e da vicino non diventa mai rosa.
 * - Calcolo nel worker, solo per le celle in vista e a View Transition finita. Il risultato resta in
 *   memoria per tutta la visita: tornando alla griglia le celle sono già pronte.
 * - La cella in cui si chiude una pagina va disegnata prima che la transizione catturi la pagina
 *   nuova (astro:after-swap), se no la foto si stringe su un riquadro vuoto: dalla memoria o, la
 *   prima volta, calcolata lì (la foto in grigio è già pronta, photoReady in morph.ts).
 * - Hover: i punti si tolgono in ordine Bayer e sotto compare la foto a colori.
 * Sorgente: la foto in grigio (tools/grigio.mjs), che si scarica anche su touch. Senza JavaScript,
 * OffscreenCanvas o worker resta la foto in grigio col velo (global.css).
 */
import { BAYER8, ditherBits, type Bands } from '../lib/dither';

const DOT = 1;        // punto, px CSS
const FADE = 24;      // px CSS: l'inchiostro pieno sotto linguetta e didascalia sfuma a punti in questa altezza
const T_HOVER = 300;  // ms, come la dissolvenza grigio → colori di prima
const KEEP = 48;      // celle tenute in memoria (un byte per punto)

interface Size { w: number; h: number; dot: number; bands: Bands; key: string }
interface State { bits?: Uint8Array; size?: Size; pending?: string; t: number; target: number; raf: number }

let supported = typeof OffscreenCanvas === 'function' && typeof Worker === 'function' && 'createImageBitmap' in window;
const cache = new Map<string, Uint8Array>();
const states = new WeakMap<HTMLCanvasElement, State>();
const state = (c: HTMLCanvasElement) => {
  let s = states.get(c);
  if (!s) states.set(c, s = { t: 0, target: 0, raf: 0 });
  return s;
};
const source = (c: HTMLCanvasElement) => c.parentElement!.querySelector<HTMLImageElement>('img.duo__grigio')!;
const all = () => [...document.querySelectorAll<HTMLCanvasElement>('canvas.duo__dither')];

/** Senza supporto: via i canvas, torna la foto in grigio col velo */
function giveUp() {
  supported = false;
  all().forEach(c => c.remove());
}

// ── Misure e colori ───────────────────────────────────────

/** Misura in punti della foto della cella, fasce sotto le scritte e chiave per la memoria */
function measure(canvas: HTMLCanvasElement): Size | null {
  const duo = canvas.parentElement!, cell = duo.parentElement!, r = duo.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const dpr = devicePixelRatio, dot = Math.max(1, Math.round(DOT * dpr));
  const dots = (px: number) => Math.ceil((px * dpr) / dot);
  let top = 0;
  for (const el of cell.querySelectorAll(':scope > .cell__label, :scope > .cell__go')) top = Math.max(top, el.getBoundingClientRect().bottom - r.top);
  const caption = cell.querySelector(':scope > .caption');
  const bottom = caption ? r.bottom - caption.getBoundingClientRect().top : 0;
  const w = dots(r.width), h = dots(r.height);
  const bands = { top: dots(top), bottom: dots(bottom), fade: Math.max(1, dots(FADE)) };
  return { w, h, dot, bands, key: [source(canvas).getAttribute('src'), w, h, dot, bands.top, bands.bottom, bands.fade].join(' ') };
}

/** Rosso e carta dalla palette (global.css). Fissi: le foto non si invertono a luce spenta */
let palette: number[][] | null = null;
function colors() {
  if (palette) return palette;
  const css = getComputedStyle(document.documentElement);
  const ctx = new OffscreenCanvas(2, 1).getContext('2d', { willReadFrequently: true })!;
  ['--rosso', '--chiaro'].forEach((v, i) => { ctx.fillStyle = css.getPropertyValue(v).trim(); ctx.fillRect(i, 0, 1, 1); });
  const d = ctx.getImageData(0, 0, 2, 1).data;
  return (palette = [[d[0], d[1], d[2]], [d[4], d[5], d[6]]]);
}

// ── Disegno ───────────────────────────────────────────────

/** Con t > 0 (hover) i punti con soglia Bayer sotto t diventano trasparenti: sotto c'è la foto a colori */
function paint(canvas: HTMLCanvasElement, st: State) {
  const { bits, size } = st;
  if (!bits || !size) return;
  const { w, h } = size, [ink, paper] = colors(), d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = BAYER8[y & 7];
    for (let x = 0; x < w; x++) {
      const i = y * w + x, c = bits[i] ? paper : ink;
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2];
      d[i * 4 + 3] = st.t > 0 && row[x & 7] < st.t ? 0 : 255;
    }
  }
  canvas.getContext('2d')!.putImageData(new ImageData(d, w, h), 0, 0);
}

/** Un punto del canvas = `dot` pixel reali: la misura CSS è un multiplo esatto (può sbordare di un punto, .duo taglia) */
function show(canvas: HTMLCanvasElement, size: Size, bits: Uint8Array) {
  const st = state(canvas);
  Object.assign(st, { bits, size, pending: undefined });
  if (canvas.width !== size.w || canvas.height !== size.h) [canvas.width, canvas.height] = [size.w, size.h];
  const px = size.dot / devicePixelRatio;
  canvas.style.width = `${size.w * px}px`;
  canvas.style.height = `${size.h * px}px`;
  paint(canvas, st);
  canvas.dataset.ready = '';
}

function remember(key: string, bits: Uint8Array) {
  cache.delete(key);
  cache.set(key, bits);
  if (cache.size > KEEP) cache.delete(cache.keys().next().value!);
}

/** Dalla memoria, se c'è. Sincrono */
function fromCache(canvas: HTMLCanvasElement, size: Size) {
  const bits = cache.get(size.key);
  if (bits) { remember(size.key, bits); show(canvas, size, bits); }
  return !!bits;
}

// ── Calcolo ───────────────────────────────────────────────

let worker: Worker | null = null, seq = 0;
const jobs = new Map<number, (bits: Uint8Array) => void>();
function work(bitmap: ImageBitmap, { w, h, bands }: Size): Promise<Uint8Array> {
  if (!worker) {
    worker = new Worker(new URL('./dither.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; bits: Uint8Array }>) => {
      jobs.get(e.data.id)?.(e.data.bits);
      jobs.delete(e.data.id);
    };
    worker.onerror = giveUp;
  }
  const id = ++seq;
  return new Promise(resolve => {
    jobs.set(id, resolve);
    worker!.postMessage({ id, bitmap, w, h, bands }, [bitmap]);
  });
}

/** Nel worker. Il risultato va in memoria anche se nel frattempo la pagina è cambiata */
async function compute(canvas: HTMLCanvasElement) {
  const size = measure(canvas), st = state(canvas);
  if (!size || st.size?.key === size.key || st.pending === size.key || fromCache(canvas, size)) return;
  st.pending = size.key;
  const img = source(canvas);
  try {
    await img.decode();  // lazy: se non c'è ancora si scarica ora
    const bits = await work(await createImageBitmap(img), size);
    remember(size.key, bits);
    if (st.pending === size.key && canvas.isConnected) show(canvas, size, bits);
  } catch {
    if (st.pending === size.key) st.pending = undefined;
  }
}

// La cella in cui si chiude la pagina (data-morphing, morph.ts) e quelle già in memoria: disegnate prima
// che la transizione catturi la pagina nuova
document.addEventListener('astro:after-swap', () => {
  if (!supported) return;
  for (const c of all()) {
    const size = measure(c);
    if (!size || fromCache(c, size) || !c.closest('[data-morphing]')) continue;
    const img = source(c);
    if (!img.complete || !img.naturalWidth) continue;
    const bits = ditherBits(img, img.naturalWidth, img.naturalHeight, size.w, size.h, size.bands);
    remember(size.key, bits);
    show(c, size, bits);
  }
});

// View Transition tra le pagine in corso: i calcoli aspettano che finisca (come il globo in cells.ts)
let transition: Promise<unknown> = Promise.resolve();
document.addEventListener('astro:before-swap', e => { transition = e.viewTransition.finished.catch(() => {}); });

// ── Celle della pagina ────────────────────────────────────

let teardown: (() => void) | null = null;
document.addEventListener('astro:page-load', () => {
  teardown?.();
  teardown = null;
  const canvases = all();
  if (!canvases.length) return;
  if (!supported) return giveUp();

  const ac = new AbortController(), { signal } = ac;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visible = new Set<HTMLCanvasElement>();
  const canvasOf = (el: Element) => el.querySelector<HTMLCanvasElement>(':scope > canvas.duo__dither')!;
  const run = (c: HTMLCanvasElement) => transition.then(() => { if (!signal.aborted && visible.has(c)) compute(c); });

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const c = canvasOf(e.target);
      if (e.isIntersecting) { visible.add(c); run(c); } else visible.delete(c);
    }
  }, { rootMargin: '50% 0px' });

  // cambio di misura (breakpoint, zoom, filtri dell'archivio): si ricalcola a resize finito
  let timer = 0;
  const ro = new ResizeObserver(entries => {
    if (!entries.some(e => state(canvasOf(e.target)).size)) return;  // prima misura: ci pensa io
    clearTimeout(timer);
    timer = window.setTimeout(() => visible.forEach(run), 150);
  });

  // hover: dissolvenza a dithering verso la foto a colori
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const fade = (c: HTMLCanvasElement, target: number) => {
    const st = state(c);
    st.target = target;
    if (reduced) { st.t = target; return paint(c, st); }
    if (st.raf) return;
    let last = performance.now();
    const step = (now: number) => {
      st.t = Math.min(1, Math.max(0, st.t + ((st.target ? 1 : -1) * (now - last)) / T_HOVER));
      last = now;
      paint(c, st);
      st.raf = st.t !== st.target && !signal.aborted ? requestAnimationFrame(step) : 0;
    };
    st.raf = requestAnimationFrame(step);
  };

  for (const c of canvases) {
    const duo = c.parentElement!;
    io.observe(duo);
    ro.observe(duo);
    const link = duo.closest('.cell--link');
    link?.addEventListener('pointerenter', () => hover.matches && fade(c, 1), { signal });
    link?.addEventListener('pointerleave', () => hover.matches && fade(c, 0), { signal });
  }

  teardown = () => {
    ac.abort();
    io.disconnect();
    ro.disconnect();
    clearTimeout(timer);
  };
  document.addEventListener('astro:before-swap', () => teardown?.(), { once: true });
});
```
