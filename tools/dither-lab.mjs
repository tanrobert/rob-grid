// Laboratorio del dithering sulle foto dei progetti: bitmap a 1 bit in bicromia rosso/bianco, a pixel grossi.
// Il dithering si calcola nel browser alla misura vera della cella (canvas), così il punto può cadere sui
// pixel reali anche al 125%: è una delle cose da provare. Solo sviluppo: il sito non cambia.
//   node tools/dither-lab.mjs   → tools/out/dither/index.html (si apre anche da file://)
//   sul telefono: npx astro build && npm run vt:serve → /_out/dither/
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUT } from './lib.mjs';

const PROGETTI = fileURLToPath(new URL('../src/content/progetti/', import.meta.url));
const DIR = path.join(OUT, 'dither');
fs.mkdirSync(DIR, { recursive: true });

const PHOTOS = ['kiale', 'eurofish', 'purple-piper', 'giardini-dell-eden', 'gea', 'spazioquadro', 'la-torre-rossa'];
const W = 1200;

/** Copertina ritagliata sulla forma del progetto (shape dell'index.md), come nella cella */
async function bake(name) {
  const dir = path.join(PROGETTI, name);
  const cover = fs.readdirSync(dir).find(f => /^copertina\.(png|jpe?g|webp)$/i.test(f));
  const md = fs.readFileSync(path.join(dir, 'index.md'), 'utf8');
  const [, w = 4, h = 4] = md.match(/shape:\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+)/) ?? [];
  await sharp(path.join(dir, cover))
    .resize({ width: W, height: Math.round((W * h) / w), fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(path.join(DIR, `${name}.webp`));
  return { name, w: +w, h: +h };
}

const photos = await Promise.all(PHOTOS.map(bake));
// 2 giri delle foto: abbastanza celle per sentire lo scroll sul telefono
const cells = [0, 1].flatMap(() => photos).map(({ name, w, h }) => `
  <figure class="cell${w > 4 ? ' wide' : ''}" style="--w:${w};--h:${h}">
    <img class="foto" src="${name}.webp" alt="" decoding="async">
    <canvas></canvas>
    <figcaption>${name} · ${w}×${h}</figcaption>
  </figure>`).join('');

const ALGOS = {
  atkinson: 'Atkinson (Mac anni 80): diffusione dell\'errore che butta via un quarto, luci e ombre piene, grana contrastata (secondo riferimento)',
  floyd: 'Floyd-Steinberg: diffusione dell\'errore completa, più mezzitoni, grana più fitta e "vermi" nelle zone uniformi',
  bayer4: 'Bayer 4×4: dithering ordinato, trama regolare a crocette, molto "8 bit"; 17 livelli di grigio',
  bayer8: 'Bayer 8×8: ordinato, trama più fine e più livelli (65), sfumature più morbide',
  retino: 'Retino a quadrati: griglia fissa, il quadrato cresce con lo scuro (primo riferimento). Il passo è il doppio del punto',
  grana: 'Soglia con rumore: grana casuale tipo fotocopia, sporca e grafica',
};

fs.writeFileSync(path.join(DIR, 'index.html'), `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dither lab</title>
<style>
  :root { --rosso: #f03f24; --chiaro: #e7dfdf; --inchiostro: var(--rosso); --bianco: var(--chiaro); --t: 480ms; }
  :root.spenta { --inchiostro: var(--chiaro); --bianco: var(--rosso); }
  * { box-sizing: border-box; margin: 0; }
  body { background: var(--bianco); color: var(--inchiostro); font: 14px/1.3 system-ui, sans-serif; }
  header { position: sticky; top: 0; z-index: 5; background: var(--bianco); border-bottom: 1px solid var(--inchiostro); padding: 8px 10px; display: grid; gap: 6px; }
  .row { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; }
  .row > div { display: flex; flex-wrap: wrap; gap: 4px; }
  button { font: inherit; font-size: 12px; padding: 6px 8px; border: 1px solid var(--inchiostro); background: transparent; color: var(--inchiostro); }
  button[aria-pressed="true"] { background: var(--inchiostro); color: var(--bianco); }
  label { font-size: 12px; display: flex; gap: 6px; align-items: center; }
  input[type=range] { accent-color: var(--inchiostro); width: 110px; }
  #desc, #fps, #info { font-size: 12px; }
  #fps, #info { font: 11px ui-monospace, monospace; }
  main { --cols: 12; display: grid; grid-template-columns: repeat(var(--cols), 1fr); grid-auto-flow: row dense; gap: 10px; padding: 10px; max-width: 1840px; margin: 0 auto; }
  @media (max-width: 1023px) { main { --cols: 8; } }
  @media (max-width: 599px) { main { --cols: 4; } .cell.wide { grid-column: 1 / -1; } }
  .cell { grid-column: span var(--w); aspect-ratio: var(--w) / var(--h); position: relative; overflow: hidden; border: 1px solid var(--inchiostro); background: var(--chiaro); cursor: pointer; }
  .foto { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  canvas { position: absolute; left: 0; top: 0; image-rendering: pixelated; image-rendering: crisp-edges; }
  body:not(.snap) canvas { width: 100%; height: 100%; }
  [data-pass=fade] canvas { transition: opacity var(--t); opacity: calc(1 - var(--on, 0)); }
  figcaption { position: absolute; left: 6px; bottom: 6px; z-index: 2; font: 10px ui-monospace, monospace; text-transform: uppercase; color: var(--chiaro); background: var(--rosso); padding: 2px 4px; }
  @media (hover: hover) and (pointer: fine) { .cell:hover { --on: 1; } }
  .cell.on, body.all-on .cell { --on: 1; }
  @media (prefers-reduced-motion: reduce) { :root { --t: 0ms; } }
</style>
</head>
<body class="snap" data-pass="dither">
<header>
  <div class="row"><div id="algos">${Object.keys(ALGOS).map(a => `<button data-a="${a}">${a}</button>`).join('')}</div></div>
  <div class="row">
    <label>punto <input id="p" type="range" min="1" max="10" step="1"> <span id="pv"></span></label>
    <label>contrasto <input id="c" type="range" min="0.5" max="2.5" step="0.05"> <span id="cv"></span></label>
    <label>luce <input id="b" type="range" min="-0.4" max="0.4" step="0.02"> <span id="bv"></span></label>
  </div>
  <div class="row">
    <button id="snap" aria-pressed="true">aggancia ai pixel reali</button>
    <button id="norm" aria-pressed="true">normalizza</button>
    <button id="pass">hover: dissolvenza a dithering</button>
    <button id="all" aria-pressed="false">hover su tutte</button>
    <button id="ink" aria-pressed="false">luce spenta</button>
  </div>
  <p id="desc"></p>
  <div class="row"><span id="info"></span><span id="fps">scorri per misurare</span></div>
</header>
<main>${cells}</main>
<script>
  const ALGOS = ${JSON.stringify(ALGOS)};
  const ROSSO = [240, 63, 36], CHIARO = [231, 223, 223];
  const body = document.body, params = new URLSearchParams(location.search);
  const st = {
    a: ALGOS[params.get('a')] ? params.get('a') : 'atkinson',
    p: +(params.get('p') ?? 4), c: +(params.get('c') ?? 1.2), b: +(params.get('b') ?? 0),
    snap: params.get('snap') !== '0', norm: params.get('norm') !== '0', pass: params.get('pass') ?? 'dither',
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // soglie Bayer n×n (0..1)
  function bayer(n) {
    let m = [[0]];
    while (m.length < n) {
      const s = m.length, r = Array.from({ length: s * 2 }, () => Array(s * 2));
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const v = m[y][x] * 4;
        r[y][x] = v; r[y][x + s] = v + 2; r[y + s][x] = v + 3; r[y + s][x + s] = v + 1;
      }
      m = r;
    }
    return m.map(row => row.map(v => (v + 0.5) / (n * n)));
  }
  const B4 = bayer(4), B8 = bayer(8);
  const hash = i => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

  /** Luminosità 0..1 della foto ridotta a w×h, dimezzando a passi (un solo drawImage da 1200 a 80 px sgrana) */
  function sample(img, w, h) {
    let src = img, sw = img.naturalWidth, sh = img.naturalHeight;
    while (sw / 2 >= w * 1.5) {
      const c = document.createElement('canvas');
      c.width = sw = Math.round(sw / 2); c.height = sh = Math.round(sh / 2);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, sw, sh);
      src = c;
    }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
    for (let i = 0; i < L.length; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    return L;
  }

  /** Curva: normalizza (1° e 99° percentile), poi contrasto attorno a 0.5 e luce */
  function tone(L) {
    let lo = 0, hi = 1;
    if (st.norm) {
      const s = Float32Array.from(L).sort();
      lo = s[Math.floor(s.length * 0.01)]; hi = s[Math.floor(s.length * 0.99)];
      if (hi - lo < 0.05) { lo = 0; hi = 1; }
    }
    return L.map(v => Math.min(1, Math.max(0, ((v - lo) / (hi - lo) - 0.5) * st.c + 0.5 + st.b)));
  }

  /** 1 = carta (chiaro), 0 = inchiostro (rosso) */
  function dither(v, w, h, a) {
    const out = new Uint8Array(w * h);
    if (a === 'bayer4' || a === 'bayer8') {
      const B = a === 'bayer4' ? B4 : B8, n = B.length;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = v[y * w + x] > B[y % n][x % n] ? 1 : 0;
    } else if (a === 'grana') {
      for (let i = 0; i < v.length; i++) out[i] = v[i] + (hash(i) - 0.5) * 0.6 > 0.5 ? 1 : 0;
    } else {
      const K = a === 'atkinson'
        ? [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]]
        : [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]];
      const e = Float32Array.from(v);
      for (let y = 0; y < h; y++) {
        const dir = a === 'floyd' && y % 2 ? -1 : 1; // serpentina: meno "vermi"
        for (let k = 0; k < w; k++) {
          const x = dir > 0 ? k : w - 1 - k, i = y * w + x, bit = e[i] >= 0.5 ? 1 : 0, err = e[i] - bit;
          out[i] = bit;
          for (const [dx, dy, f] of K) {
            const nx = x + dx * dir, ny = y + dy;
            if (nx >= 0 && nx < w && ny < h) e[ny * w + nx] += err * f;
          }
        }
      }
    }
    return out;
  }

  /** Disegna una cella: canvas a punti (un pixel del canvas = un punto) o, per il retino, a pixel pieni */
  function render(cell) {
    const img = cell.querySelector('img'), cv = cell.querySelector('canvas');
    if (!img.complete || !img.naturalWidth) return img.addEventListener('load', () => render(cell), { once: true });
    const dpr = devicePixelRatio, cw = cell.clientWidth, ch = cell.clientHeight;
    // agganciato: punto in px CSS arrotondato ai pixel reali (1 → 1 sul monitor, 3 sul telefono ×3), il canvas
    // si ingrandisce di un numero intero; libero: punto in px CSS anche se non cade sui pixel
    const px = st.snap ? 1 / dpr : 1, fit = st.snap ? Math.ceil : Math.round;
    const dot = st.snap ? Math.max(1, Math.round(st.p * dpr)) : st.p;
    const retino = st.a === 'retino', P = retino ? dot * 2 : dot;
    const w = Math.max(1, fit(cw / (P * px))), h = Math.max(1, fit(ch / (P * px)));
    const v = tone(sample(img, w, h));
    let W = w, H = h, data;
    if (retino) {
      W = w * P; H = h * P; data = new Uint8ClampedArray(W * H * 4);
      for (let i = 0; i < W * H; i++) data.set([...CHIARO, 255], i * 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        // ×1.15: nello scuro i quadrati si chiudono, se no resta una grigliata di righine chiare
        const s = Math.min(P, Math.round(P * Math.sqrt(1 - v[y * w + x]) * 1.15)), o = (P - s) >> 1;
        for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) data.set(ROSSO, ((y * P + o + yy) * W + x * P + o + xx) * 4);
      }
    } else {
      const bits = dither(v, w, h, st.a);
      data = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h; i++) data.set([...(bits[i] ? CHIARO : ROSSO), 255], i * 4);
    }
    cv.width = W; cv.height = H;
    Object.assign(cell, { base: data, W, H, block: retino ? P : 1 });
    if (st.snap) {
      cv.style.width = W * (retino ? px : P * px) + 'px';
      cv.style.height = H * (retino ? px : P * px) + 'px';
      // il canvas parte su un pixel reale: toglie la parte frazionaria della posizione della cella
      const r = cell.getBoundingClientRect(), fx = ((r.left + cell.clientLeft) * dpr) % 1, fy = ((r.top + cell.clientTop + scrollY) * dpr) % 1;
      cv.style.transform = 'translate(' + -fx / dpr + 'px,' + -fy / dpr + 'px)';
    } else { cv.style.width = cv.style.height = cv.style.transform = ''; }
    paint(cell);
  }

  /** Dissolvenza a dithering: con t da 0 a 1 i punti si tolgono seguendo le soglie Bayer 8×8, sotto c'è la foto */
  function paint(cell) {
    const t = st.pass === 'dither' ? (cell.t ?? 0) : 0, { W, H, block } = cell;
    const d = t > 0 ? Uint8ClampedArray.from(cell.base) : cell.base;
    if (t > 0) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const bx = (x / block) | 0, by = (y / block) | 0;
      if (B8[by % 8][bx % 8] < t) d[(y * W + x) * 4 + 3] = 0;
    }
    cell.querySelector('canvas').getContext('2d').putImageData(new ImageData(d, W, H), 0, 0);
  }

  const T = 480;
  function animate(cell) {
    const target = getComputedStyle(cell).getPropertyValue('--on').trim() === '1' ? 1 : 0;
    if (cell.target === target) return;
    cell.target = target;
    if (reduced || st.pass !== 'dither') { cell.t = target; return paint(cell); }
    if (cell.raf) return;
    let last = performance.now();
    const step = now => {
      const dt = now - last; last = now;
      cell.t = Math.min(1, Math.max(0, (cell.t ?? 0) + (cell.target ? 1 : -1) * dt / T));
      paint(cell);
      cell.raf = cell.t !== cell.target ? requestAnimationFrame(step) : 0;
    };
    cell.raf = requestAnimationFrame(step);
  }

  const all = [...document.querySelectorAll('.cell')];
  const renderAll = () => {
    all.forEach(render);
    const dpr = devicePixelRatio, dot = st.p + ' px CSS → ' + (st.snap ? Math.max(1, Math.round(st.p * dpr)) + ' px reali' : +(st.p * dpr).toFixed(2) + ' px reali (non interi: punti irregolari)');
    document.getElementById('info').textContent = 'scala schermo ' + dpr + ' · punto ' + dot;
  };

  function sync() {
    document.querySelectorAll('#algos button').forEach(b => b.setAttribute('aria-pressed', b.dataset.a === st.a));
    document.getElementById('desc').textContent = ALGOS[st.a];
    for (const k of ['p', 'c', 'b']) { document.getElementById(k).value = st[k]; document.getElementById(k + 'v').textContent = st[k]; }
    body.classList.toggle('snap', st.snap); document.getElementById('snap').setAttribute('aria-pressed', st.snap);
    document.getElementById('norm').setAttribute('aria-pressed', st.norm);
    body.dataset.pass = st.pass;
    document.getElementById('pass').textContent = 'hover: ' + (st.pass === 'dither' ? 'dissolvenza a dithering' : 'dissolvenza normale');
    for (const [k, v] of Object.entries(st)) params.set(k, typeof v === 'boolean' ? +v : v);
    history.replaceState(null, '', '?' + params);
    renderAll();
  }

  document.getElementById('algos').addEventListener('click', e => { if (e.target.dataset.a) { st.a = e.target.dataset.a; sync(); } });
  for (const k of ['p', 'c', 'b']) document.getElementById(k).addEventListener('input', e => { st[k] = +e.target.value; sync(); });
  document.getElementById('snap').addEventListener('click', () => { st.snap = !st.snap; sync(); });
  document.getElementById('norm').addEventListener('click', () => { st.norm = !st.norm; sync(); });
  document.getElementById('pass').addEventListener('click', () => { st.pass = st.pass === 'dither' ? 'fade' : 'dither'; all.forEach(c => { c.t = c.target = 0; }); sync(); });
  document.getElementById('all').addEventListener('click', e => { e.target.setAttribute('aria-pressed', body.classList.toggle('all-on')); all.forEach(animate); });
  document.getElementById('ink').addEventListener('click', e => e.target.setAttribute('aria-pressed', document.documentElement.classList.toggle('spenta')));
  for (const c of all) {
    c.addEventListener('pointerenter', () => animate(c));
    c.addEventListener('pointerleave', () => animate(c));
    c.addEventListener('click', () => { c.classList.toggle('on'); animate(c); });
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderAll, 150); });
  sync();

  // fotogrammi durante lo scroll: media e fotogrammi lunghi (> 2 frame a 60Hz) dell'ultima scrollata
  const fps = document.getElementById('fps');
  let frames = [], last = 0, idle;
  function tick(t) {
    if (last) frames.push(t - last);
    last = t;
    if (frames.length) requestAnimationFrame(tick);
  }
  addEventListener('scroll', () => {
    if (!frames.length) { frames = [0]; last = 0; requestAnimationFrame(tick); }
    clearTimeout(idle);
    idle = setTimeout(() => {
      const f = frames.slice(1), avg = f.reduce((a, b) => a + b, 0) / f.length;
      fps.textContent = f.length ? Math.round(1000 / avg) + ' fps · ' + f.filter(d => d > 33).length + ' scatti su ' + f.length + ' fotogrammi' : '';
      frames = [];
    }, 300);
  }, { passive: true });
</script>
</body>
</html>
`);
console.log(path.join(DIR, 'index.html'));
