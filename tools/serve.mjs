// Il sito costruito (dist/) e le pagine di prova (tools/pages/, all'indirizzo /_vt/) sulla rete di
// casa: per provare sul telefono vero, collegato allo stesso Wi-Fi del PC.
//   npx astro build && npm run vt:serve -- [--port 4400]
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { args, OUT } from './lib.mjs';

const { opt } = args();
const port = +(opt.port ?? 4400);
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGES = fileURLToPath(new URL('./pages/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain',
};

/** /percorso → file: cartelle con index.html, /_vt/… dalle pagine di prova, /_out/… dai risultati (es. velo-lab) */
function resolve(url) {
  const p = decodeURIComponent(url.split('?')[0]);
  const [root, rel] = p.startsWith('/_vt/') ? [PAGES, p.slice(5)] : p.startsWith('/_out/') ? [OUT, p.slice(6)] : [DIST, p];
  let f = path.join(root, rel);
  if (!f.startsWith(root)) return null;
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  return fs.existsSync(f) ? f : null;
}

if (!fs.existsSync(DIST)) { console.log('manca dist/: prima npx astro build'); process.exit(1); }
http.createServer((req, res) => {
  const f = resolve(req.url);
  if (!f) {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    return fs.createReadStream(path.join(DIST, '404.html')).on('error', () => res.end('404')).pipe(res);
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(port, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i?.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('Sul telefono (stesso Wi-Fi):');
  for (const ip of ips) console.log(`  sito:            http://${ip}:${port}/\n  pagina di prova: http://${ip}:${port}/_vt/vt-test.html\n  velo lab:        http://${ip}:${port}/_out/velo/`);
  console.log('Ctrl+C per spegnere.');
});
