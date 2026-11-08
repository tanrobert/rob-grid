// Favicon: quadrato d'inchiostro col marchio R rosso al centro, lato del marchio = lato del quadrato / 1,61818.
// Il marchio viene da src/assets/logo-r.svg (il marchio esatto, quadrato), così se cambia basta rilanciare:
//   node tools/favicon.mjs
// Scrive in public/: favicon.svg, favicon.ico (16, 32 e 48 px, PNG dentro) e apple-touch-icon.png (180 px).
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const NERO = '#1c1a17';   // --nero (global.css)
const ROSSO = '#f03f24';  // --rosso
const AUREO = 1.61818;

const marchio = readFileSync(new URL('../src/assets/logo-r.svg', import.meta.url), 'utf8');
const lato = +marchio.match(/viewBox="0 0 ([\d.]+) [\d.]+"/)[1];
const tracciati = marchio.match(/<path [^>]+\/>/g).join('');

// viewBox del quadrato attorno al marchio, che resta nelle sue coordinate
const quadrato = +(lato * AUREO).toFixed(4);
const o = +(-(quadrato - lato) / 2).toFixed(4);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${o} ${o} ${quadrato} ${quadrato}">`
  + `<rect x="${o}" y="${o}" width="${quadrato}" height="${quadrato}" fill="${NERO}"/>`
  + `<g fill="${ROSSO}">${tracciati}</g></svg>\n`;

const pubblico = p => new URL(`../public/${p}`, import.meta.url);
writeFileSync(pubblico('favicon.svg'), svg);

// PNG: disegnato grande e rimpicciolito, così i bordi obliqui restano morbidi
const png = n => sharp(Buffer.from(svg), { density: 72 * 1024 / quadrato })
  .resize(n, n, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();

writeFileSync(pubblico('apple-touch-icon.png'), await png(180));

// ICO con PNG dentro: intestazione, una voce da 16 byte per misura, poi le immagini
const misure = [16, 32, 48];
const immagini = await Promise.all(misure.map(png));
const testa = Buffer.alloc(6 + 16 * misure.length);
testa.writeUInt16LE(0, 0); testa.writeUInt16LE(1, 2); testa.writeUInt16LE(misure.length, 4);
let inizio = testa.length;
misure.forEach((n, i) => {
  const v = 6 + 16 * i;
  testa.writeUInt8(n, v); testa.writeUInt8(n, v + 1);
  testa.writeUInt16LE(1, v + 4); testa.writeUInt16LE(32, v + 6);
  testa.writeUInt32LE(immagini[i].length, v + 8); testa.writeUInt32LE(inizio, v + 12);
  inizio += immagini[i].length;
});
writeFileSync(pubblico('favicon.ico'), Buffer.concat([testa, ...immagini]));

console.log(`favicon: quadrato ${quadrato}, marchio ${lato} (rapporto ${(quadrato / lato).toFixed(5)})`);
