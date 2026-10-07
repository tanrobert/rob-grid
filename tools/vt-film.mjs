// Transizione rallentata ×10, fotografata a intervalli: apertura (e chiusura) di una cella.
//   npm run vt:film -- <selettore della cella> [--close] [--width 412] [--height 860] [--start /]
//   es. npm run vt:film -- 'a[data-id="info"]' --close
// Risultato: tools/out/<nome>-open-NN.png (+ -close-) e un foglio di provini <nome>-open.jpg.
// Solo Chrome: gli screenshot di Firefox non catturano i livelli della View Transition.
import { args, launch, open, sleep, slowDown, contactSheet, BASE, OUT } from './lib.mjs';
import path from 'node:path';

const { pos, opt } = args();
const sel = pos[0];
if (!sel) { console.log('serve il selettore della cella, es. \'a[data-id="info"]\''); process.exit(1); }
const name = opt.name ?? sel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
const SHOTS = 12, GAP = 650;  // 12 foto ogni 650ms: coprono la transizione ×10 (7,2s)

const b = await launch('chrome');
const p = await open(b, { width: opt.width ?? 412, height: opt.height ?? 860 });
await p.goto(BASE + (opt.start ?? '/'), { waitUntil: 'networkidle0' });
await sleep(4000);
await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
await sleep(300);

const sheets = [];
async function film(phase, act) {
  await slowDown(p);
  await act();
  const files = [];
  for (let i = 0; i < SHOTS; i++) {
    await sleep(i ? GAP : 150);
    const file = path.join(OUT, `${name}-${phase}-${String(i).padStart(2, '0')}.png`);
    await p.screenshot({ path: file });
    files.push(file);
  }
  await sleep(1500);
  sheets.push([files, path.join(OUT, `${name}-${phase}.jpg`)]);
}

await film('open', () => p.evaluate(s => document.querySelector(s).click(), sel));
if (opt.close) await film('close', () => p.evaluate(() => document.querySelector('[data-hero] a[data-close]').click()));
await b.close();
// i fogli alla fine: un secondo browser aperto a metà ferma il disegno del primo
for (const [files, out] of sheets) console.log(await contactSheet(files, out));
