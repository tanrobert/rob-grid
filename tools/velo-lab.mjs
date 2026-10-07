// Laboratorio del velo sulle foto dei progetti: genera le immagini (originale, grigio e bicromie
// cotte con sharp) e una pagina con un effetto alla volta, intensità, hover simulato e contatore di
// fotogrammi per provare lo scroll. Solo sviluppo: il sito non cambia.
//   node tools/velo-lab.mjs   → tools/out/velo/index.html (si apre anche da file://)
//   sul telefono: npx astro build && npm run vt:serve → /_out/velo/
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUT } from './lib.mjs';

const ASSETS = fileURLToPath(new URL('../src/assets/', import.meta.url));
const DIR = path.join(OUT, 'velo');
fs.mkdirSync(DIR, { recursive: true });

const PHOTOS = ['eurofish-napoli', 'kiale', 'purple-piper', 'giardini-dell-eden', 'gea', 'spazioquadro', 'latorrerossa'];
const W = 800;
// palette di global.css
const ROSSO = [240, 63, 36], BIANCO = [231, 223, 223], NERO = [37, 29, 29];

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
/** Mappa la luminosità su una scala di colori (scuro → chiaro) */
const ramp = stops => t => {
  const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
  return mix(stops[seg], stops[seg + 1], t * (stops.length - 1) - seg);
};
const RAMPS = { duo: ramp([ROSSO, BIANCO]), tri: ramp([NERO, ROSSO, BIANCO]) };

async function bake(name) {
  const src = path.join(ASSETS, name + '.png');
  const base = sharp(src).resize(W);
  const { width, height } = await base.clone().webp().toBuffer({ resolveWithObject: true }).then(r => r.info);
  await base.clone().webp({ quality: 76 }).toFile(path.join(DIR, `${name}.webp`));
  await base.clone().greyscale().webp({ quality: 76 }).toFile(path.join(DIR, `${name}-grigio.webp`));
  const { data, info } = await base.clone().greyscale().normalise().raw().toBuffer({ resolveWithObject: true });
  for (const [key, fn] of Object.entries(RAMPS)) {
    const lut = Array.from({ length: 256 }, (_, g) => fn(g / 255));
    const rgb = Buffer.alloc(info.width * info.height * 3);
    for (let i = 0; i < info.width * info.height; i++) rgb.set(lut[data[i * info.channels]], i * 3);
    await sharp(rgb, { raw: { width: info.width, height: info.height, channels: 3 } })
      .webp({ quality: 76 }).toFile(path.join(DIR, `${name}-${key}.webp`));
  }
  return { name, width, height };
}

const photos = await Promise.all(PHOTOS.map(bake));
// 3 giri delle 7 foto: abbastanza celle per sentire lo scroll sul telefono
const cells = [0, 1, 2].flatMap(() => photos).map(({ name, width, height }) => `
  <figure class="cell" style="aspect-ratio:${width}/${height}">
    <img class="base" src="${name}.webp" alt="" loading="lazy" decoding="async">
    <img class="alt" data-name="${name}" alt="" loading="lazy" decoding="async">
    <figcaption>${name}</figcaption>
  </figure>`).join('');

const VARIANTS = {
  velo: 'Velo pieno (attuale): un riquadro rosso semitrasparente',
  grigio: 'Foto in grigio (cotta) + velo: tinta uniforme su chiare e scure',
  duo: 'Bicromia cotta rosso → bianco: ombre rosse, luci bianche',
  tri: 'Tricromia cotta nero → rosso → bianco: più contrasto',
  retino: 'Retino di punti rossi sopra la foto (sfondo statico)',
  righe: 'Righe orizzontali rosse da 1px (sfondo statico)',
  sfumato: 'Velo sfumato dal basso: la foto resta pulita in alto',
  tendina: 'Velo pieno che in hover scorre via (transform, non opacità)',
  multiply: 'Velo in multiply (blend mode): bicromia dal vivo. RISCHIO: provare lo scroll sul telefono',
};
const BAKED = { grigio: 'grigio', duo: 'duo', tri: 'tri' };

fs.writeFileSync(path.join(DIR, 'index.html'), `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Velo lab</title>
<style>
  :root { --rosso: #f03f24; --bianco: #e7dfdf; --k: .35; --t: 400ms; }
  * { box-sizing: border-box; margin: 0; }
  body { background: var(--bianco); color: var(--rosso); font: 14px/1.3 system-ui, sans-serif; }
  header { position: sticky; top: 0; z-index: 5; background: var(--bianco); border-bottom: 1px solid var(--rosso); padding: 8px 10px; display: grid; gap: 6px; }
  .row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  button { font: inherit; font-size: 12px; padding: 6px 8px; border: 1px solid var(--rosso); background: transparent; color: var(--rosso); }
  button[aria-pressed="true"] { background: var(--rosso); color: var(--bianco); }
  #desc { font-size: 12px; min-height: 2.6em; }
  #fps { font: 11px ui-monospace, monospace; }
  input[type=range] { accent-color: var(--rosso); width: 140px; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 10px; padding: 10px; }
  .cell { position: relative; overflow: hidden; border: 1px solid var(--rosso); background: var(--bianco); cursor: pointer; }
  .cell img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .cell .alt { display: none; transition: opacity var(--t); }
  .cell::after { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0; }
  figcaption { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2; background: var(--bianco); border-top: 1px solid var(--rosso); padding: 6px 10px; font-size: 12px; }

  /* stato "hover": vero hover col mouse, tocco sul telefono, o tutte con il pulsante */
  @media (hover: hover) and (pointer: fine) { .cell:hover { --on: 1; } }
  .cell.on, body.all-on .cell { --on: 1; }

  [data-v=velo] .cell::after, [data-v=grigio] .cell::after, [data-v=tendina] .cell::after {
    background: var(--rosso); opacity: calc(var(--k) * (1 - var(--on, 0))); transition: opacity var(--t), transform var(--t);
  }
  [data-v=grigio] .alt, [data-v=duo] .alt, [data-v=tri] .alt { display: block; opacity: calc(1 - var(--on, 0)); }
  [data-v=retino] .cell::after {
    background: radial-gradient(circle, var(--rosso) 0 1.3px, transparent 1.6px) 0 0 / 4px 4px;
    opacity: calc(min(1, var(--k) * 2.6) * (1 - var(--on, 0))); transition: opacity var(--t);
  }
  [data-v=righe] .cell::after {
    background: repeating-linear-gradient(var(--rosso) 0 1px, transparent 1px 3px);
    opacity: calc(min(1, var(--k) * 2.6) * (1 - var(--on, 0))); transition: opacity var(--t);
  }
  [data-v=sfumato] .cell::after {
    background: linear-gradient(to top, var(--rosso), transparent 75%);
    opacity: calc(min(1, var(--k) * 2.2) * (1 - var(--on, 0))); transition: opacity var(--t);
  }
  [data-v=tendina] .cell::after { opacity: var(--k); transform-origin: bottom; transform: scaleY(calc(1 - var(--on, 0))); }
  [data-v=multiply] .cell::after {
    background: var(--rosso); mix-blend-mode: multiply;
    opacity: calc(min(1, var(--k) * 2.6) * (1 - var(--on, 0))); transition: opacity var(--t);
  }
  @media (prefers-reduced-motion: reduce) { :root { --t: 0ms; } }
</style>
</head>
<body data-v="velo">
<header>
  <div class="row" id="variants">${Object.keys(VARIANTS).map(v => `<button data-v="${v}">${v}</button>`).join('')}</div>
  <div class="row">
    <label>intensità <input id="k" type="range" min="0" max="1" step="0.05" value="0.35"></label> <span id="kv">0.35</span>
    <button id="all" aria-pressed="false">hover su tutte</button>
    <span id="fps">scorri per misurare</span>
  </div>
  <p id="desc"></p>
</header>
<main>${cells}</main>
<script>
  const VARIANTS = ${JSON.stringify(VARIANTS)}, BAKED = ${JSON.stringify(BAKED)};
  const body = document.body, k = document.getElementById('k');
  const params = new URLSearchParams(location.search);
  function setVariant(v) {
    body.dataset.v = v;
    document.getElementById('desc').textContent = VARIANTS[v];
    for (const b of document.querySelectorAll('#variants button')) b.setAttribute('aria-pressed', b.dataset.v === v);
    // le immagini cotte si caricano solo per la variante che le usa
    for (const img of document.querySelectorAll('.alt')) {
      if (BAKED[v]) img.src = img.dataset.name + '-' + BAKED[v] + '.webp'; else img.removeAttribute('src');
    }
    params.set('v', v); history.replaceState(null, '', '?' + params);
  }
  function setK(val) {
    document.documentElement.style.setProperty('--k', val);
    document.getElementById('kv').textContent = (+val).toFixed(2);
    k.value = val; params.set('k', val); history.replaceState(null, '', '?' + params);
  }
  document.getElementById('variants').addEventListener('click', e => e.target.dataset.v && setVariant(e.target.dataset.v));
  k.addEventListener('input', () => setK(k.value));
  document.getElementById('all').addEventListener('click', e => {
    const on = body.classList.toggle('all-on'); e.target.setAttribute('aria-pressed', on);
  });
  document.querySelector('main').addEventListener('click', e => e.target.closest('.cell')?.classList.toggle('on'));
  setVariant(VARIANTS[params.get('v')] ? params.get('v') : 'velo');
  setK(params.get('k') ?? 0.35);

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
