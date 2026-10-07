// Giro completo delle espansioni: per ogni navigazione registra i pezzi con un nome (pagina vecchia e
// nuova), la foto d'arrivo pronta, la durata della transizione e la pulizia alla fine.
//   npm run vt:tour -- [chrome|firefox] [--width 412] [--android]
// Durata ~770ms = animata, ~20ms = interrotta. Esce con errore se qualcosa non torna.
// --android: si presenta come Firefox per Android (niente espansione, solo dissolvenza: morph.ts).
import { args, launch, open, sleep, BASE } from './lib.mjs';

const { pos, opt } = args();
const browser = pos[0] ?? 'chrome';
const ANDROID_UA = 'Mozilla/5.0 (Android 14; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0';

const b = await launch(browser);
const p = await open(b, { width: opt.width ?? 412, ua: opt.android ? ANDROID_UA : undefined });
await p.goto(BASE + '/', { waitUntil: 'networkidle0' });
await sleep(3500);  // fine dell'intro
await p.evaluate(() => {
  window.__log = [];
  const names = root => [...root.querySelectorAll('[data-morphing]')]
    .map(el => el.style.getPropertyValue('view-transition-name').replace('morph-', '')).sort().join(' ');
  document.addEventListener('astro:before-swap', e => {
    const t0 = performance.now();
    const entry = { from: e.from.pathname, to: e.to.pathname, old: names(document), neu: names(e.newDocument) };
    window.__log.push(entry);
    e.viewTransition.finished.finally(() => {
      entry.ms = Math.round(performance.now() - t0);
      entry.left = document.querySelectorAll('[data-morphing]').length;
    });
  });
  document.addEventListener('astro:after-swap', () => {
    const img = document.querySelector('[data-morphing][data-part="media"] img');
    const e = window.__log.at(-1);
    if (e && img) e.photo = img.complete ? 'pronta' : 'NON pronta';
  });
});

console.log(`${browser}${opt.android ? ' (come Firefox per Android)' : ''}, ${opt.width ?? 412}px — ${BASE}`);

// Marcature (gli stessi controlli che morph.ts fa in console solo in sviluppo): una sola hero per
// pagina, nessun ruolo doppio nella stessa cella o hero (con la sua cella del titolo)
const marks = await p.evaluate(async () => {
  const paths = ['/', '/archivio', '/info', '/extra', ...[...document.querySelectorAll('a[data-morph^="/progetti/"]')].map(a => a.getAttribute('href'))];
  const out = [];
  for (const path of [...new Set(paths)]) {
    const doc = new DOMParser().parseFromString(await (await fetch(path)).text(), 'text/html');
    const heroes = doc.querySelectorAll('[data-hero]');
    if (heroes.length > 1) out.push(`${path}: ${heroes.length} hero`);
    for (const win of doc.querySelectorAll('[data-morph], [data-hero]')) {
      const key = win.dataset.hero;
      const roots = [win, key && doc.querySelector(`[data-title-of="${CSS.escape(key)}"]`)].filter(Boolean);
      const roles = roots.flatMap(r => [...r.querySelectorAll('[data-part]')].map(el => el.dataset.part));
      const twice = roles.filter((r, i) => roles.indexOf(r) !== i);
      if (twice.length) out.push(`${path} ${win.dataset.id}: ruoli doppi ${[...new Set(twice)].join(', ')}`);
    }
  }
  return { pages: paths.length, problems: out };
});
console.log(marks.problems.length ? `✗ marcature: ${marks.problems.join(' · ')}` : `✓ marcature a posto (${marks.pages} pagine)`);
let failures = marks.problems.length ? 1 : 0;
async function step(label, act, { expectMorph = true, interrupts = 0 } = {}) {
  const n = await p.evaluate(() => window.__log.length);
  await act();
  await sleep(1600);
  // conta l'ultima transizione del passo: con due click rapidi la prima può partire ed essere
  // interrotta dalla seconda (ed è giusto così), oppure fermarsi prima di partire
  const all = await p.evaluate(n => window.__log.slice(n), n);
  const e = all.at(-1);
  if (!e) { console.log(`✗ ${label}: nessuna transizione`); failures++; return; }
  const morph = Boolean(e.old);
  const problems = [];
  if (all.length - 1 > interrupts) problems.push(`${all.length - 1} transizioni in più`);
  if (e.ms < 300) problems.push(`interrotta (${e.ms}ms)`);
  if (e.left) problems.push(`${e.left} nomi rimasti`);
  if (e.old !== e.neu) problems.push('pezzi diversi ai due lati');
  if (expectMorph !== 'any' && expectMorph !== morph) problems.push(morph ? 'espansione inattesa' : 'nessuna espansione');
  if (e.photo === 'NON pronta') problems.push('foto d\'arrivo non pronta');
  failures += problems.length ? 1 : 0;
  console.log(`${problems.length ? '✗' : '✓'} ${label.padEnd(34)} ${String(e.ms).padStart(4)}ms  ${e.from} → ${e.to}  [${e.old || '—'}]${e.photo ? ' foto ' + e.photo : ''}${problems.length ? '  ← ' + problems.join(', ') : ''}`);
}
const click = sel => () => p.evaluate(s => document.querySelector(s).click(), sel);
const CLOSE = '[data-hero] a[data-close]';
// con --android nessuna cella si deve espandere
const cell = { expectMorph: !opt.android };

await step('home → eurofish', click('a[data-morph="/progetti/eurofish"]'), cell);
await step('✕ → home', click(CLOSE), cell);
await step('home → kiale', click('a[data-morph="/progetti/kiale"]'), cell);
await step('indietro (browser)', () => p.goBack(), cell);
await step('avanti (browser)', () => p.goForward(), cell);
await step('Esc → home', () => p.keyboard.press('Escape'), cell);
await step('home → extra', click('a[data-morph="/extra"]'), cell);
await step('✕ → home', click(CLOSE), cell);
await step('home → info', click('a[data-id="info"]'), cell);
await step('✕ → home', click(CLOSE), cell);
await step('home → contatti → info', click('a[data-id="contatti"]'), cell);
await step('✕ → home', click(CLOSE), cell);
await step('home → archivio', click('a[data-morph="/archivio"]'), cell);
await step('archivio → gea', click('a[data-morph="/progetti/gea"]'), cell);
await step('✕ → archivio', click(CLOSE), cell);
await step('✕ → home', click(CLOSE), cell);
await step('home → tag (nessuna espansione)', click('a[href^="/archivio?tag="]'), { expectMorph: false });
await step('✕ → home', click(CLOSE), cell);
// doppio click: se la prima pagina arriva prima del secondo click Astro la mostra comunque, e la
// seconda parte da lì senza espansione (la cella cliccata non c'è più); se no si espande la seconda.
// Giusti tutti e due: l'errore è la mezza transizione (pezzi con nome da un lato solo)
await step('doppio click rapido', () => p.evaluate(() => {
  document.querySelector('a[data-morph="/progetti/purple-piper"]').click();
  setTimeout(() => document.querySelector('a[data-morph="/progetti/giardini-dell-eden"]')?.click(), 10);
}), { expectMorph: opt.android ? false : 'any', interrupts: 1 });
await b.close();
console.log(failures ? `\n${failures} passaggi con problemi` : '\ntutto a posto');
process.exit(failures ? 1 : 0);
