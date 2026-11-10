// node tools/itri-svg.mjs <disegno di Illustrator>.svg src/assets/itri.svg
// Disegno di Itri da Illustrator → SVG per la cella meteo: classi tolte, inchiostro = currentColor, numeri a 1 decimale,
// viewBox stretto sul disegno, via il puntino in fondo. Spessori: li dà la cella (1px, non-scaling-stroke)
import fs from 'node:fs';
import sharp from 'sharp';
const [src, out] = process.argv.slice(2);
const s = fs.readFileSync(src, 'utf8');
const stile = s.match(/<style>([\s\S]*?)<\/style>/)[1];
const cls = {};
for (const [, sel, body] of stile.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  const props = Object.fromEntries([...body.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
  for (const c of sel.split(',').map(x => x.trim().replace(/^\./, ''))) cls[c] = { ...cls[c], ...props };
}
// a 1 decimale; "13.96.62" (due numeri separati dal punto) diventerebbe "140.6": uno spazio dove serve
const num = t => t.replace(/-?\d*\.?\d+(e-?\d+)?/g, (n, _e, i, tutto) => {
  const v = String(Math.round(parseFloat(n) * 10) / 10);
  return /[\d.]/.test(tutto[i - 1] ?? '') && !v.startsWith('-') ? ' ' + v : v;
});
const el = [...s.matchAll(/<(path|line|polyline|polygon|rect|circle|ellipse)\b([^>]*?)\/>/g)];
let tolti = 0;
const righe = el.map(([, tag, attrs]) => {
  const c = cls[(attrs.match(/class="([^"]+)"/) || [])[1]] ?? {};
  const geo = [...attrs.matchAll(/\b(d|x1|y1|x2|y2|points|x|y|width|height|cx|cy|r|rx|ry|transform)="([^"]*)"/g)];
  // il puntino in fondo (tre tracciati pieni senza tratto, y ~961)
  if (c['stroke-width'] === '0px' && /96\d\./.test(attrs)) { tolti++; return ''; }
  const a = geo.map(([, k, v]) => `${k}="${k === "transform" ? v : num(v)}"`);
  const fill = c.fill ?? (tag === 'line' || tag === 'polyline' ? 'none' : '#000');
  if (fill !== 'none') a.push('fill="currentColor"');
  if (fill !== 'none' && c['fill-rule']) a.push(`fill-rule="${c['fill-rule']}"`);
  if (c['stroke-width'] === '0px') a.push('stroke="none"');
  return `<${tag} ${a.join(' ')}/>`;
}).filter(Boolean);
const corpo = righe.join('');
// viewBox stretto: rendo e misuro i pixel d'inchiostro
const vb = s.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const prova = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2] * 2}" height="${vb[3] * 2}"><g fill="none" stroke="#000" stroke-width="1">${corpo}</g></svg>`;
const { data, info } = await sharp(Buffer.from(prova)).flatten({ background: '#fff' }).greyscale().raw().toBuffer({ resolveWithObject: true });
let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[y * info.width + x] < 200) {
  if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
}
const m = 1, k = 0.5;
const box = [x0 * k - m, y0 * k - m, (x1 - x0) * k + 2 * m, (y1 - y0) * k + 2 * m].map(n => Math.round(n * 10) / 10);
fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${corpo}</g></svg>\n`);
console.log({ elementi: righe.length, tolti, viewBox: box, kb: (fs.statSync(out).size / 1024).toFixed(1) });
