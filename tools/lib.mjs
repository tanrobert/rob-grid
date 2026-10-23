// Strumenti di verifica del sito (giro del tavolo, fotogrammi dei video, server per il telefono): solo sviluppo.
// Usano Chrome e Firefox già installati sul PC: puppeteer-core non scarica browser.
// Percorsi diversi: variabili d'ambiente CHROME_PATH / FIREFOX_PATH. Sito: VT_BASE (default preview).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BROWSERS = {
  chrome: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  firefox: process.env.FIREFOX_PATH ?? 'C:/Program Files/Mozilla Firefox/firefox.exe',
};
export const BASE = process.env.VT_BASE ?? 'http://localhost:4399';
/** Cartella dei risultati (screenshot, fogli), ignorata da git */
export const OUT = fileURLToPath(new URL('./out/', import.meta.url));
fs.mkdirSync(OUT, { recursive: true });

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Argomenti "--nome valore" e "--flag" dopo quelli posizionali */
export function args(argv = process.argv.slice(2)) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) { pos.push(argv[i]); continue; }
    const k = argv[i].slice(2), v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) opt[k] = true;
    else { opt[k] = v; i++; }
  }
  return { pos, opt };
}

export function launch(browser = 'chrome', { headless = true } = {}) {
  if (!BROWSERS[browser]) throw new Error(`browser sconosciuto: ${browser} (chrome | firefox)`);
  return puppeteer.launch(browser === 'firefox'
    ? { browser: 'firefox', executablePath: BROWSERS.firefox, headless }
    : { executablePath: BROWSERS.chrome, headless: headless ? 'new' : false });
}

/** Foglio di provini: le immagini in griglia, salvato come jpg (si apre con qualsiasi visualizzatore) */
export async function contactSheet(files, out, { cols = 6, colWidth = 230 } = {}) {
  const b = await launch('chrome');
  const p = await b.newPage();
  await p.setViewport({ width: cols * colWidth, height: 200 });
  const cells = files.map(f => `<figure><img src="file:///${f.replaceAll('\\', '/')}"><figcaption>${f.split(/[\\/]/).pop()}</figcaption></figure>`).join('');
  // su disco e aperto da file://: una pagina in memoria non può leggere le immagini locali
  const html = out.replace(/\.\w+$/, '.html');
  fs.writeFileSync(html, `<style>body{margin:0;background:#222;color:#fff;font:11px sans-serif;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px}figure{margin:0}img{width:100%;display:block}</style>${cells}`);
  await p.goto('file:///' + html.replaceAll('\\', '/'), { waitUntil: 'load' });
  await p.screenshot({ path: out, type: 'jpeg', quality: 80, fullPage: true });
  fs.rmSync(html);
  await b.close();
  return out;
}
