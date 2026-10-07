// Strumenti di verifica delle View Transitions (solo sviluppo, non finiscono nel sito).
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

/** Pagina a misura di telefono (default 412×860); in Chrome anche touch e viewport mobile */
export async function open(b, { width = 412, height = 860, ua } = {}) {
  const p = await b.newPage();
  const chrome = !(await b.version()).toLowerCase().includes('firefox');
  await p.setViewport({ width: +width, height: +height, ...(chrome && +width < 600 ? { isMobile: true, hasTouch: true } : {}) });
  if (ua) await p.setUserAgent(ua);
  p.on('pageerror', e => console.log('  !! errore nella pagina:', e.message));
  // avvisi della pagina (es. [morph] in sviluppo: pezzi segnati male)
  p.on('console', m => ['warn', 'warning', 'error'].includes(m.type()) && console.log(`  !! console ${m.type()}:`, m.text()));
  return p;
}

/**
 * Rallenta le transizioni (×factor) riscrivendo i token di global.css: li legge anche morph.ts,
 * quindi rallentano pure le animazioni create da script (DevTools setPlaybackRate quelle no).
 */
export function slowDown(p, factor = 10) {
  return p.evaluate(f => {
    // prima via il rallentamento precedente: se no i tempi letti sono già moltiplicati (×100)
    document.adoptedStyleSheets = [];
    const css = getComputedStyle(document.documentElement);
    const ms = t => parseFloat(t) * (t.trim().endsWith('ms') ? 1 : 1000);
    const tokens = ['--t-morph', '--t-swap', '--t-page', '--t-tile']
      .map(n => `${n}:${ms(css.getPropertyValue(n)) * f}ms !important`).join(';');
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`:root{${tokens}}`);
    document.adoptedStyleSheets = [sheet];
  }, factor);
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
