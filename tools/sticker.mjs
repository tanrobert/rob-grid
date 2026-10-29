// Foto scontornate (PNG con trasparenza) → sticker: bordo bianco attorno alla sagoma, già nel file (niente filter CSS
// sulle foto: su mobile rendono lo scroll scattoso). Niente ombra (scelta di Roberto del 29/10/2026). Tutti alla
// stessa superficie, così un piatto lungo e una coppetta pesano uguale. Solo sviluppo.
// uso: node tools/sticker.mjs <cartella-uscita> <foto.png> [<foto.png> …]
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const AREA = 230_000;   // pixel pieni di ogni piatto (≈ 480 × 480)
const BORDO = 14;       // bordo bianco, px

const [uscita, ...foto] = process.argv.slice(2);
if (!uscita || !foto.length) { console.error('uso: node tools/sticker.mjs <cartella-uscita> <foto.png> …'); process.exit(1); }
fs.mkdirSync(uscita, { recursive: true });

const pieni = async img => {
  const { data } = await img.clone().extractChannel('alpha').raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (const a of data) n += a / 255;
  return n;
};

for (const f of foto) {
  const tagliata = sharp(await sharp(f).ensureAlpha().trim({ threshold: 1 }).png().toBuffer());
  const { width: w0, height: h0 } = await tagliata.metadata();
  const k = Math.sqrt(AREA / await pieni(tagliata));
  const w = Math.round(w0 * k), h = Math.round(h0 * k), m = BORDO + 2;
  const piatto = await tagliata.resize(w, h).extend({ top: m, bottom: m, left: m, right: m, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const W = w + 2 * m, H = h + 2 * m;
  const alfa = await sharp(piatto).extractChannel('alpha').toBuffer();
  // bordo: la sagoma allargata (sfocata e riportata a pieno)
  const largo = await sharp(alfa).blur(BORDO / 2).threshold(8).toBuffer();
  const pieno = (r, g, b) => sharp({ create: { width: W, height: H, channels: 3, background: { r, g, b } } });
  const bianco = await pieno(255, 255, 255).joinChannel(largo).png().toBuffer();
  const nome = path.basename(f).replace(/\.\w+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const dove = path.join(uscita, `${nome}.webp`);
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: bianco }, { input: piatto }])
    .webp({ quality: 82, alphaQuality: 90 }).toFile(dove);
  console.log(dove, `${W}×${H}`, `${Math.round(fs.statSync(dove).size / 1024)} KB`);
}
