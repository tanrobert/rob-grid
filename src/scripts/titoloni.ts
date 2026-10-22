/**
 * Titoloni: i titoli delle celle di testo grandi (TextCell size 'l', es. "Progetto identità visive…" in
 * home, la bio in Info).
 * - Misura: il corpo più grande con cui il titolo sta nella sua cella, col font vero. Lo spazio in più
 *   (HEADROOM) serve alla lente, che allarga le lettere. Si calcola prima che la pagina si veda: dopo lo
 *   caricamento, prima delle righe dell'intro (righe.ts,
 *   che leggono gli a capo). Il corpo si scrive in cqi (larghezza della cella): allo zoom del tavolo e al resize
 *   il titolo scala con la cella, e la misura esatta si rifà a misura ferma (ATTESA).
 * - Lente (idea di Roberto, ottobre 2026, provata in tools/pages/cinetica.html): col mouse il peso cresce
 *   ad area attorno al puntatore, 900 al centro e 500 al bordo (raggio = RAGGIO corpi). Gli a capo si
 *   bloccano alla prima passata (righe a filo, nowrap), se no le parole che ingrassano cambiano riga.
 *   Solo con mouse, mai con prefers-reduced-motion.
 */

const SELECTOR = '.cell > .text--l > .title';
const MIN = 20, MAX = 220;   // px
const HEADROOM = 0.94;       // il corpo trovato, ridotto: margine per le lettere più pesanti
const RAGGIO = 2.5;          // raggio della lente, in corpi del titolo
const SMORZA = 70;           // ms: quanto in fretta il peso insegue il puntatore
const ATTESA = 150;          // ms senza cambi di misura prima di rimisurare

const titles = () => [...document.querySelectorAll<HTMLElement>(SELECTOR)];

// ── Misura ────────────────────────────────────────────────

/** Il testo sta nella cella? Somma dei figli di .text (occhiello, titolo, testo) con gli spazi, e titolo non più largo */
function fits(title: HTMLElement) {
  const box = title.parentElement!, css = getComputedStyle(box);
  const kids = [...box.children] as HTMLElement[];
  const used = kids.reduce((s, el) => s + el.offsetHeight, 0) + parseFloat(css.rowGap || '0') * (kids.length - 1);
  const room = box.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
  return used <= room && title.scrollWidth <= box.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
}

function fit(title: HTMLElement) {
  unsplit(title);
  // con prefers-reduced-motion la regola globale dà a ogni proprietà una transizione da 0.01ms: il corpo
  // misurato resterebbe quello vecchio, tutto "ci sta" e il titolo usciva a MAX
  title.style.transition = 'none';
  let lo = MIN, hi = MAX;
  for (let n = 0; n < 9; n++) {
    const mid = (lo + hi) / 2;
    title.style.fontSize = `${mid}px`;
    if (fits(title)) lo = mid; else hi = mid;
  }
  // in cqi: la cella (container) è il riquadro più vicino con container-type
  const cella = title.closest<HTMLElement>('.cell')?.clientWidth;
  title.style.fontSize = cella ? `${(Math.floor(lo * HEADROOM) / cella) * 100}cqi` : `${Math.floor(lo * HEADROOM)}px`;
  title.style.transition = '';
}

export const fitTitles = () => titles().forEach(fit);

// ── Lente ─────────────────────────────────────────────────

interface Lens { text: string; letters: HTMLElement[]; weights: Float32Array }
const lenses = new WeakMap<HTMLElement, Lens>();

/** Titolo in lettere, con gli a capo di adesso bloccati. Il testo vero resta per gli screen reader */
function split(title: HTMLElement): Lens {
  const text = title.textContent ?? '';
  const words = text.trim().split(/\s+/);
  const probe = words.map(w => Object.assign(document.createElement('span'), { textContent: w }));
  title.replaceChildren(...probe.flatMap((s, i) => (i ? [' ', s] : [s])));
  const rows: string[][] = [];
  let top: number | null = null;
  for (const s of probe) {
    if (s.offsetTop !== top) { rows.push([]); top = s.offsetTop; }
    rows.at(-1)!.push(s.textContent!);
  }
  const letters: HTMLElement[] = [];
  title.replaceChildren(
    Object.assign(document.createElement('span'), { className: 'sr-only', textContent: text }),
    ...rows.map(row => {
      const riga = Object.assign(document.createElement('span'), { className: 'lente__riga' });
      riga.setAttribute('aria-hidden', 'true');
      row.forEach((word, i) => {
        if (i) riga.append(' ');
        for (const ch of word) {
          const k = Object.assign(document.createElement('span'), { textContent: ch });
          letters.push(k);
          riga.append(k);
        }
      });
      return riga;
    }),
  );
  const lens = { text, letters, weights: new Float32Array(letters.length).fill(500) };
  lenses.set(title, lens);
  return lens;
}

function unsplit(title: HTMLElement) {
  const lens = lenses.get(title);
  if (!lens) return;
  title.textContent = lens.text;
  lenses.delete(title);
}

export function initTitoloni(signal: AbortSignal, reduced: boolean) {
  const list = titles();
  if (!list.length) return;

  // resize, cambio di breakpoint, zoom del tavolo: intanto il titolo scala con la cella (cqi), a misura ferma si
  // rimisura. La prima notifica (all'observe) no: la prima misura la fanno lo swap o cells.ts, prima delle righe
  let timer = 0, first = true;
  const ro = new ResizeObserver(() => {
    if (first) { first = false; return; }
    clearTimeout(timer);
    timer = window.setTimeout(fitTitles, ATTESA);
  });
  list.forEach(t => ro.observe(t.parentElement!));
  signal.addEventListener('abort', () => { ro.disconnect(); clearTimeout(timer); });

  if (reduced || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  for (const title of list) {
    const cell = title.closest<HTMLElement>('.cell')!;
    let pointer: { x: number; y: number } | null = null, loop = 0, prev = 0;

    const frame = (now: number) => {
      const lens = lenses.get(title);
      if (!lens || signal.aborted) { loop = 0; return; }
      const dt = prev ? now - prev : 16, R = RAGGIO * parseFloat(getComputedStyle(title).fontSize);
      prev = now;
      // le posizioni si rileggono a ogni fotogramma: cambiando peso le lettere si spostano
      const rects = pointer ? lens.letters.map(el => el.getBoundingClientRect()) : null;
      let moving = false;
      lens.letters.forEach((el, i) => {
        let target = 500;
        if (rects && pointer) {
          const r = rects[i], d = Math.hypot(r.left + r.width / 2 - pointer.x, r.top + r.height / 2 - pointer.y);
          if (d < R) target = 500 + 400 * (0.5 + 0.5 * Math.cos((Math.PI * d) / R));
        }
        lens.weights[i] += (target - lens.weights[i]) * (1 - Math.exp(-dt / SMORZA));
        if (Math.abs(lens.weights[i] - target) > 0.5) moving = true;
        el.style.fontWeight = String(Math.round(lens.weights[i]));
      });
      loop = moving || pointer ? requestAnimationFrame(frame) : 0;
      if (!loop) prev = 0;
    };
    const start = () => { if (!loop) loop = requestAnimationFrame(frame); };

    cell.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      // durante l'intro le righe (righe.ts) riscrivono il titolo: la lente aspetta
      if (!lenses.has(title) && (title.querySelector('.riga') || document.documentElement.classList.contains('is-intro'))) return;
      if (!lenses.has(title)) split(title);
      pointer = { x: e.clientX, y: e.clientY };
      start();
    }, { signal });
    cell.addEventListener('pointerleave', () => { pointer = null; start(); }, { signal });
  }
}
