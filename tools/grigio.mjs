// Versioni in bianco e nero delle foto dei progetti, cotte nei file (niente filter nel browser: su mobile
// rendeva lo scroll scattoso). Da rilanciare quando si aggiunge o cambia una foto.
//   node tools/grigio.mjs   → src/assets/grigio/<nome>.webp (stesso nome della foto)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSETS = fileURLToPath(new URL('../src/assets/', import.meta.url));
const OUT = path.join(ASSETS, 'grigio');
fs.mkdirSync(OUT, { recursive: true });

const photos = fs.readdirSync(ASSETS).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
for (const f of photos) {
  const name = f.replace(/\.[^.]+$/, '');
  // 2400 px: la misura più grande che <Image> chiede (MediaCell, widths)
  await sharp(path.join(ASSETS, f))
    .resize({ width: 2400, withoutEnlargement: true })
    .greyscale()
    .webp({ quality: 84 })
    .toFile(path.join(OUT, `${name}.webp`));
  console.log('✓', name);
}
