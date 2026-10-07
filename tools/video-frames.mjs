// Fotogrammi di un video (es. registrato dal telefono) senza ffmpeg: Chrome apre il file e lo
// fotografa spostando currentTime. Utile per vedere una transizione fotogramma per fotogramma.
//   npm run vt:frames -- <video.mp4> [--step 0.5] [--from 0] [--to fine] [--cols 8]
//   (--step 0.0333 = tutti i fotogrammi di un video a 30 fps)
// Risultato: tools/out/<video>/NNN.jpg e il foglio di provini tools/out/<video>.jpg
import { args, launch, sleep, contactSheet, OUT } from './lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const { pos, opt } = args();
const video = pos[0] && path.resolve(pos[0]);
if (!video || !fs.existsSync(video)) { console.log('serve il percorso del video'); process.exit(1); }
const name = path.basename(video, path.extname(video));
const dir = path.join(OUT, name);
fs.mkdirSync(dir, { recursive: true });

const b = await launch('chrome');
const p = await b.newPage();
await p.setViewport({ width: 720, height: 1280 });
await p.goto('file:///' + video.replaceAll('\\', '/'));
// la pagina del video: altezza piena, sfondo nero
await p.evaluate(() => {
  const v = document.querySelector('video');
  v.removeAttribute('controls');
  Object.assign(v.style, { height: '100vh', width: 'auto', display: 'block', margin: 'auto' });
  document.body.style.cssText = 'margin:0;background:#000';
});
const duration = await p.evaluate(() => new Promise(r => {
  const v = document.querySelector('video');
  v.readyState >= 1 ? r(v.duration) : v.addEventListener('loadedmetadata', () => r(v.duration), { once: true });
}));
const step = +(opt.step ?? 0.5), from = +(opt.from ?? 0), to = Math.min(duration, +(opt.to ?? duration));

const files = [];
for (let t = from, i = 0; t < to; t += step, i++) {
  await p.evaluate(t => new Promise(r => {
    const v = document.querySelector('video');
    v.addEventListener('seeked', () => requestAnimationFrame(() => requestAnimationFrame(r)), { once: true });
    v.currentTime = t;
  }), t);
  const file = path.join(dir, `${String(i).padStart(3, '0')}-${t.toFixed(2)}s.jpg`);
  await p.screenshot({ path: file, type: 'jpeg', quality: 70 });
  files.push(file);
}
await b.close();
await sleep(100);
console.log(`${files.length} fotogrammi (${duration.toFixed(1)}s di video) in ${dir}`);
console.log(await contactSheet(files, path.join(OUT, `${name}.jpg`), { cols: +(opt.cols ?? 8), colWidth: 200 }));
