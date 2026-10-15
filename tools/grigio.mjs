// Versioni in bianco e nero delle copertine dei progetti, cotte nei file (niente filter nel browser: su mobile
// rendeva lo scroll scattoso). Da rilanciare quando si aggiunge o cambia una copertina.
//   node tools/grigio.mjs   → src/content/progetti/<slug>/copertina.grigio.webp (accanto alla copertina)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROGETTI = fileURLToPath(new URL('../src/content/progetti/', import.meta.url));

for (const slug of fs.readdirSync(PROGETTI)) {
  const dir = path.join(PROGETTI, slug);
  const cover = fs.existsSync(dir) && fs.readdirSync(dir).find(f => /^copertina\.(png|jpe?g|webp)$/i.test(f));
  if (!cover) continue;
  // 2400 px: la misura più grande che <Image> chiede (MediaCell, widths)
  await sharp(path.join(dir, cover))
    .resize({ width: 2400, withoutEnlargement: true })
    .greyscale()
    .webp({ quality: 84 })
    .toFile(path.join(dir, 'copertina.grigio.webp'));
  console.log('✓', slug);
}
