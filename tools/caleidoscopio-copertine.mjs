// Copertine per la cella `copertine` della pagina di Purple Piper (Caleidoscopio, 6/11/2026): ne pesca N a caso
// dall'archivio di Caleidoscopio (covers.json del progetto caleidoscopio.astro, copertine da Deezer), le scarica nella
// misura piccola di Deezer e le salva in WebP leggerissimi in public/caleidoscopio/copertine/ (01.webp, 02.webp…).
// Le vecchie si cancellano: per un'altra pescata basta rilanciarlo.
//
//   node tools/caleidoscopio-copertine.mjs [quante=60] [lato=160]

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const QUANTE = Number(process.argv[2] ?? 60);
const LATO = Number(process.argv[3] ?? 160);
const ARCHIVIO = path.resolve('../caleidoscopio.astro/src/data/covers.json');
const USCITA = path.resolve('public/caleidoscopio/copertine');

const copertine = [...new Set(Object.values(JSON.parse(fs.readFileSync(ARCHIVIO, 'utf8'))).flat().map(a => a.coverUrl))];
// mescolate (Fisher-Yates), poi si prende la prima che si scarica, finché bastano
for (let i = copertine.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [copertine[i], copertine[j]] = [copertine[j], copertine[i]];
}

fs.rmSync(USCITA, { recursive: true, force: true });
fs.mkdirSync(USCITA, { recursive: true });

let fatte = 0, peso = 0;
for (const url of copertine) {
  if (fatte === QUANTE) break;
  // Deezer: la misura sta nell'indirizzo (1000x1000 → 250x250)
  const piccola = url.replace(/\/\d+x\d+-/, '/250x250-');
  try {
    const r = await fetch(piccola);
    if (!r.ok) continue;
    const buf = Buffer.from(await r.arrayBuffer());
    const { width, height } = await sharp(buf).metadata();
    if (!width || width !== height) continue;   // solo quadrate
    // il segnaposto di Deezer per gli album senza copertina (cerchio grigio su grigio chiaro, quasi uniforme): via
    const { channels } = await sharp(buf).stats();
    if (channels.slice(0, 3).every(c => c.stdev < 15)) continue;
    const file = path.join(USCITA, `${String(fatte + 1).padStart(2, '0')}.webp`);
    await sharp(buf).resize(LATO, LATO).webp({ quality: 55, effort: 6 }).toFile(file);
    peso += fs.statSync(file).size;
    fatte++;
  } catch { /* copertina che non risponde: la prossima */ }
}
console.log(`${fatte} copertine da ${LATO}px in ${path.relative(process.cwd(), USCITA)}, ${(peso / 1024).toFixed(0)} KB in tutto`);
