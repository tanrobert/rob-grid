// Giro del tavolo della home: disposizione, gesti col mouse e col dito, zoom, memoria della visita, Riordina,
// riduzione del movimento, pixel netti al 125% e scatti durante il pan. Poi i fogli aperti sopra il tavolo
// (scripts/foglio): dal tavolo senza ricaricare, link diretto, chiusure, indietro e avanti, archivio → progetto.
//   npm run tavolo:tour -- [chrome|firefox]
// Il tocco (CDP), riduci movimento, il 125% e gli scatti solo in Chrome. Esce con errore se qualcosa non torna.
import { args, launch, sleep, BASE } from './lib.mjs';

const { pos } = args();
const browser = pos[0] ?? 'chrome';
const chrome = browser === 'chrome';
const b = await launch(browser);
let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? '  ' + detail : ''}`);
};

async function page({ width = 1440, height = 900, touch = false, scale = 1, reduced = false } = {}) {
  const p = await b.newPage();
  await p.setViewport({ width, height, deviceScaleFactor: scale, ...(chrome && touch ? { isMobile: true, hasTouch: true } : {}) });
  if (reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  p.on('pageerror', e => { failures++; console.log('  !! errore nella pagina:', e.message); });
  // l'avviso di Chrome sui font precaricati "non usati" arriva solo ricaricando subito la home, coi font già
  // caricati dal preload (una richiesta sola per file): falso allarme, non lo conto
  p.on('console', m => ['warn', 'error'].includes(m.type()) && !m.text().includes('was preloaded using link preload')
    && console.log(`  !! console ${m.type()}:`, m.text()));
  return p;
}
/** Memoria della visita vuota anche dopo la ricarica: uscendo il tavolo salva (pagehide), qui si cancella dopo */
const forget = p => p.evaluate(() => {
  sessionStorage.clear();
  addEventListener('pagehide', () => sessionStorage.clear());
});
/** Home appena aperta, visita nuova (niente posizioni salvate) */
async function fresh(p) {
  await p.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await forget(p);
  await p.reload({ waitUntil: 'networkidle0' });
  await sleep(2500);  // fine dell'intro
}

/** Stato del tavolo: quadretto, origine, celle (in px e in quadretti dall'origine), indirizzo */
const state = p => p.evaluate(() => {
  const t = document.querySelector('[data-tavolo]');
  if (!t) return { path: location.pathname };
  const q = parseFloat(t.style.getPropertyValue('--q'));
  const m = new DOMMatrix(getComputedStyle(t.querySelector('[data-mondo]')).transform);
  const cells = {};
  for (const el of document.querySelectorAll('[data-pezzo]')) {
    const r = el.getBoundingClientRect();
    cells[el.dataset.pezzo] = { x: r.left, y: r.top, w: r.width, h: r.height, gx: Math.round((r.left - m.e) / q * 100) / 100, gy: Math.round((r.top - m.f) / q * 100) / 100 };
  }
  return {
    q, ox: m.e, oy: m.f, cells, path: location.pathname, vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio,
    vivo: t.classList.contains('is-vivo'), saved: sessionStorage.getItem('tavolo'),
    scroll: document.documentElement.scrollHeight - innerHeight, ruler: document.querySelector('[data-ruler]')?.hidden,
  };
});
const center = c => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 });
const overlaps = s => {
  const r = Object.entries(s.cells), out = [];
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const [ia, a] = r[i], [ib, c] = r[j];
    if (a.x < c.x + c.w - 0.5 && c.x < a.x + a.w - 0.5 && a.y < c.y + c.h - 0.5 && c.y < a.y + a.h - 0.5) out.push(`${ia}/${ib}`);
  }
  return out;
};
const grid = s => JSON.stringify(Object.fromEntries(Object.entries(s.cells).map(([id, c]) => [id, [c.gx, c.gy]])));
/** Un punto della carta, fuori dalle celle e dai pulsanti */
const background = p => p.evaluate(() => {
  for (let y = 200; y < innerHeight - 40; y += 17) for (let x = 340; x < innerWidth - 40; x += 23) {
    const el = document.elementFromPoint(x, y);
    if (el?.matches('[data-tavolo], [data-carta]')) return { x, y };
  }
  return null;
});
/** Centro della parte in vista di una cella (sotto i pulsanti) */
const inView = (s, id) => {
  const c = s.cells[id], x0 = Math.max(c.x, 0), x1 = Math.min(c.x + c.w, s.vw), y0 = Math.max(c.y, 70), y1 = Math.min(c.y + c.h, s.vh);
  return x1 - x0 > 40 && y1 - y0 > 40 ? { x: (x0 + x1) / 2, y: (y0 + y1) / 2 } : null;
};
/** Una cella intera in vista e lontana dai pulsanti */
const visible = (s, ids) => ids.find(id => { const c = s.cells[id]; return c && c.x > 10 && c.y > 70 && c.x + c.w < s.vw - 10 && c.y + c.h < s.vh - 10; });

async function mouseDrag(p, from, dx, dy, ms = 600, steps = 24) {
  await p.mouse.move(from.x, from.y);
  await p.mouse.down();
  for (let i = 1; i <= steps; i++) { await p.mouse.move(from.x + dx * i / steps, from.y + dy * i / steps); await sleep(ms / steps); }
  await p.mouse.up();
}

console.log(`${browser} — ${BASE}`);

// ── Mouse, 1440×900 ─────────────────────────────────────────────────────
{
  const p = await page();
  await fresh(p);
  const s0 = await state(p);
  const logo = center(s0.cells.logo);
  check(s0.vivo, 'tavolo disposto dal JavaScript');
  check(!overlaps(s0).length, 'nessuna cella sovrapposta', overlaps(s0).join(' '));
  check(Math.abs(logo.x - s0.vw / 2) <= s0.q / 2 && Math.abs(logo.y - s0.vh / 2) <= s0.q / 2, 'marchio al centro', `(${Math.round(logo.x)}, ${Math.round(logo.y)})`);
  check(s0.scroll === 0 && s0.ruler === true, 'pagina ferma, righello nascosto');
  const layout0 = grid(s0);

  // trascinare una cella-link: si sposta di quadretti interi, non apre la pagina, resta in memoria
  const id = visible(s0, ['archivio', 'extra', 'info']);
  await mouseDrag(p, center(s0.cells[id]), 3 * s0.q + 4, 2 * s0.q - 3);
  await sleep(900);
  const s1 = await state(p);
  const moved = [s1.cells[id].gx - s0.cells[id].gx, s1.cells[id].gy - s0.cells[id].gy];
  check(s1.path === '/', `trascinata "${id}" senza aprirla`);
  check(moved[0] === 3 && moved[1] === 2, 'agganciata ai quadretti', `spostata di ${moved.join(' × ')} quadretti`);
  check(JSON.parse(s1.saved ?? '{}').pos?.[id]?.[0] === s1.cells[id].gx, 'posizione salvata nella visita');

  // spostare il tavolo dal fondo: tutte le celle si muovono insieme
  const bg = await background(p);
  await mouseDrag(p, bg, -160, -90);
  await sleep(1500);
  const s2 = await state(p);
  const shift = s2.cells.logo.x - s1.cells.logo.x;
  check(shift < -120 && grid(s2) === grid(s1), 'pan dal fondo', `${Math.round(shift)}px, celle ferme sul tavolo`);

  // zoom con la rotella: il quadretto cambia, il punto sotto il cursore resta fermo, a fine gesto pixel interi
  const f = center(s2.cells.kiale);
  const before = { x: (f.x - s2.ox) / s2.q, y: (f.y - s2.oy) / s2.q };
  await p.mouse.move(f.x, f.y);
  await p.mouse.wheel({ deltaY: -100 });
  await sleep(500);
  const s3 = await state(p);
  const after = { x: (f.x - s3.ox) / s3.q, y: (f.y - s3.oy) / s3.q };
  const drift = Math.hypot(after.x - before.x, after.y - before.y) * s3.q;
  check(s3.q > s2.q, 'rotella: zoom', `quadretto ${s2.q} → ${s3.q}px`);
  check(drift < 2, 'punto sotto il cursore fermo', `${drift.toFixed(2)}px`);
  check(Math.abs(s3.q * s3.dpr - Math.round(s3.q * s3.dpr)) < 1e-6, 'quadretto su pixel interi a fine gesto');
  check(grid(s3) === grid(s2), 'celle ferme sul tavolo dopo lo zoom');

  // ricarica: stessa visita, tavolo com'era
  await p.reload({ waitUntil: 'networkidle0' });
  await sleep(1500);
  const s4 = await state(p);
  check(grid(s4) === grid(s3) && s4.q === s3.q && Math.abs(s4.ox - s3.ox) < 1, 'ricarica: tavolo com\'era');

  // torna al centro, poi riordina: la disposizione di partenza
  await p.click('[data-centro]');
  await sleep(1000);
  const s5 = await state(p);
  check(Math.abs(s5.ox - Math.round(s5.vw / 2)) < 1 && Math.abs(s5.oy - Math.round(s5.vh / 2)) < 1, 'torna al centro');
  // al quadretto di partenza, se no la disposizione si fa per lo zoom di adesso
  await forget(p);
  await p.reload({ waitUntil: 'networkidle0' });
  await sleep(1500);
  await mouseDrag(p, center((await state(p)).cells[id]), -5 * s0.q, 4 * s0.q);
  await sleep(900);
  await p.click('[data-riordina]');
  await sleep(1500);
  const s6 = await state(p);
  check(grid(s6) === layout0 && Math.abs(s6.ox - s0.ox) < 1, 'riordina: disposizione di partenza');

  // click senza movimento su una cella-link: apre la pagina (con l'espansione di oggi)
  const link = visible(s6, ['archivio', 'extra', 'info', 'kiale']);
  await p.mouse.click(center(s6.cells[link]).x, center(s6.cells[link]).y);
  await sleep(1500);
  const s7 = await state(p);
  check(s7.path !== '/', `click su "${link}": apre`, s7.path);
  await p.evaluate(() => history.back());
  await sleep(1500);
  const s8 = await state(p);
  check(s8.path === '/' && grid(s8) === grid(s6), 'indietro: tavolo com\'era');
  await p.close();
}

// ── Fogli sopra il tavolo ───────────────────────────────────────────────
/** Stato del foglio: aperto, tavolo inerte, h1, cella d'origine nascosta, copie in volo, fuoco */
const foglio = p => p.evaluate(() => {
  // il foglio in cima alla pila (quelli sotto sono nascosti)
  const f = document.querySelector('main[data-foglio]:not([hidden])');
  const html = document.documentElement;
  return {
    path: location.pathname + location.search,
    aperto: !!f && getComputedStyle(f).display !== 'none' && !html.classList.contains('is-tavolo'),
    inerte: !!document.querySelector('[data-tavolo]')?.inert,
    h1: [...document.querySelectorAll('h1')].length,
    h1vivi: [...document.querySelectorAll('h1')].filter(h => !h.closest('[inert]')).length,
    main: document.getElementById('main')?.matches('[data-foglio]') ? 'foglio' : document.getElementById('main')?.matches('[data-tavolo]') ? 'tavolo' : null,
    intro: html.classList.contains('is-intro'),
    nascoste: [...document.querySelectorAll('[data-pezzo]')].filter(el => getComputedStyle(el).visibility === 'hidden').map(el => el.dataset.pezzo),
    copie: document.querySelectorAll('body > .cell[aria-hidden]').length,
    fuoco: document.activeElement?.closest('[data-pezzo]')?.dataset.pezzo ?? null,
    titolo: document.title,
    voli: window.__voli ?? [],
  };
});
/** Ogni copia della hero che parte in volo: dove nasce (il riquadro di partenza) */
const spia = p => p.evaluateOnNewDocument(() => {
  window.__voli = [];
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType === 1 && n.matches('.cell[aria-hidden]') && n.parentElement === document.body) {
      const r = n.getBoundingClientRect();
      window.__voli.push({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), vista: getComputedStyle(n).visibility === 'visible', t: performance.now() });
    }
  }))).observe(document, { childList: true, subtree: true });
});
{
  const p = await page();
  // link diretto: il tavolo sotto, inerte, un solo h1
  await p.goto(BASE + '/info', { waitUntil: 'networkidle0' });
  await forget(p);
  await p.reload({ waitUntil: 'networkidle0' });
  await sleep(2500);
  let f = await foglio(p);
  check(f.aperto && f.inerte && f.h1 === 1, 'link diretto a /info: foglio aperto, tavolo inerte, un solo h1', `h1: ${f.h1}`);
  // Esc: la hero torna nella cella "info" del tavolo, indirizzo "/"
  await p.keyboard.press('Escape');
  await sleep(1000);
  f = await foglio(p);
  const st = await state(p);
  check(f.path === '/' && !f.aperto && !f.inerte && !f.copie && !f.nascoste.length, 'Esc: resta il tavolo, indirizzo /', f.path);
  check(f.titolo.startsWith('Roberto Tanasi ·') && f.fuoco === 'info', 'titolo della home, fuoco sulla cella d\'origine', `fuoco: ${f.fuoco}`);
  check(st.vivo && st.scroll === 0, 'tavolo vivo, pagina ferma');
  // indietro riapre, avanti richiude
  await p.evaluate(() => history.back());
  await sleep(1200);
  f = await foglio(p);
  check(f.path === '/info' && f.aperto && f.inerte && f.nascoste.join() === 'info', 'indietro: il foglio si riapre dalla cella');
  await p.evaluate(() => history.forward());
  await sleep(1200);
  f = await foglio(p);
  check(f.path === '/' && !f.aperto, 'avanti: si richiude');
  // tavolo vivo dopo la chiusura: una cella si trascina ancora
  const s0 = await state(p);
  const id = visible(s0, ['metodo', 'tag', 'nome']);
  await mouseDrag(p, center(s0.cells[id]), 2 * s0.q, 0);
  await sleep(900);
  const s1 = await state(p);
  check(s1.cells[id].gx - s0.cells[id].gx === 2 && s1.path === '/', 'dopo la chiusura il tavolo si usa come in home');
  await p.close();
}
/** Pause tra due fotogrammi da adesso a `stop` (headless non è legato ai 60 Hz: oltre 33ms = scatto visibile) */
const fotogrammi = p => p.evaluate(() => {
  window.__pause = []; let last = performance.now();
  const tick = t => { window.__pause.push([last, t - last]); last = t; window.__raf = requestAnimationFrame(tick); };
  window.__raf = requestAnimationFrame(tick);
});
/** volo: pausa più lunga da quando parte la copia della hero (spia); prima: quella del montaggio del foglio */
const stop = p => p.evaluate(() => {
  cancelAnimationFrame(window.__raf);
  const t0 = window.__voli?.at(-1)?.t ?? 0;
  const max = l => Math.max(0, ...l.map(([, d]) => d));
  return { volo: max(window.__pause.filter(([a]) => a >= t0)), prima: max(window.__pause.filter(([a]) => a < t0)) };
});
/** Clic sul centro della parte in vista di una cella del tavolo */
const clicCella = async (p, id) => { const pt = inView(await state(p), id); await p.mouse.click(pt.x, pt.y); };
{
  // dalla home: il clic apre il foglio sopra il tavolo nello stesso documento, la hero vola dalla cella
  const p = await page();
  await spia(p);
  await fresh(p);
  await p.evaluate(() => { window.__stesso = true; });
  const s0 = await state(p);
  const id = visible(s0, ['info', 'extra']);
  const c = s0.cells[id];
  const href = await p.$eval(`[data-pezzo="${id}"] a`, a => a.getAttribute('href'));
  const lunga = await p.evaluate(() => history.length);
  await fotogrammi(p);
  await p.mouse.click(center(c).x, center(c).y);
  await sleep(1500);
  const gap = await stop(p);
  let f = await foglio(p);
  const v = f.voli[0];
  check(await p.evaluate(() => window.__stesso === true), `click su "${id}": nessun caricamento di pagina`);
  check(f.path === href && f.aperto && f.inerte && f.nascoste.join() === id && !f.titolo.startsWith('Roberto Tanasi ·'), 'foglio aperto sopra il tavolo, indirizzo e titolo della pagina', `${f.path} · ${f.titolo}`);
  check(f.h1vivi === 1 && f.main === 'foglio', 'un solo h1 accessibile, il contenuto principale è il foglio', `h1: ${f.h1vivi} · main: ${f.main}`);
  check(v?.vista && Math.abs(v.x - c.x) < 2 && Math.abs(v.y - c.y) < 2 && Math.abs(v.w - c.w) < 2, 'la hero parte dalla cella, visibile', v ? `${v.x},${v.y} ${v.w}×${v.h} · cella ${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.w)}` : 'nessun volo');
  check(gap.volo < 34, 'volo: niente scatti', `pausa più lunga ${gap.volo.toFixed(0)}ms · montaggio prima del volo ${gap.prima.toFixed(0)}ms`);
  check(f.copie === 0, 'a volo finito la copia non c\'è più');
  // ✕: si torna indietro nella cronologia, la hero rientra nella sua cella
  await p.click('[data-hero] [data-close]');
  await sleep(1000);
  f = await foglio(p);
  const s1 = await state(p);
  check(f.path === '/' && !f.aperto && !f.nascoste.length && f.fuoco === id && f.main === 'tavolo', '✕: la hero torna nella sua cella, indirizzo /', f.path);
  check(Math.abs(s1.cells[id].x - c.x) < 1 && Math.abs(s1.cells[id].y - c.y) < 1, 'il tavolo è come era');
  // avanti riapre, indietro richiude
  await p.evaluate(() => history.forward());
  await sleep(1200);
  f = await foglio(p);
  check(f.path === href && f.aperto && f.nascoste.join() === id, 'avanti: il foglio si riapre dalla cella');
  // clic sulla hero e clic fuori dalle celle chiudono
  await p.click('[data-hero]', { offset: { x: 60, y: 120 } });
  await sleep(1000);
  check((await foglio(p)).path === '/', 'clic sulla hero: chiude');
  await clicCella(p, id);
  await sleep(1200);
  await p.mouse.click(8, 450);
  await sleep(1000);
  f = await foglio(p);
  check(f.path === '/' && await p.evaluate(() => history.length) === lunga + 1, 'clic fuori dal foglio: chiude, la cronologia non cresce', `history.length ${lunga} → ${await p.evaluate(() => history.length)}`);

  // archivio dal tavolo: gli stili della pagina arrivano col foglio, i filtri funzionano
  await clicCella(p, 'archivio');
  await sleep(1300);
  f = await foglio(p);
  const tagbar = await p.$eval('.foglio .tagbar', el => getComputedStyle(el).display);
  check(f.path === '/archivio' && f.aperto && tagbar === 'none', 'archivio: aperto, stili della pagina presenti', `striscia dei tag: ${tagbar}`);
  const tutte = await p.$$eval('.foglio .cell--project', l => l.length);
  await p.click('.foglio .cell--tags button[data-tag]:not([data-tag=""])');
  await sleep(900);
  const viste = await p.$$eval('.foglio .cell--project:not([hidden])', l => l.length);
  const conteggio = await p.$eval('.foglio [data-count]', el => Number(el.textContent));
  f = await foglio(p);
  check(viste < tutte && conteggio === viste && f.path.startsWith('/archivio?tag='), 'archivio: i filtri funzionano', `${viste}/${tutte} · ${f.path}`);
  await p.keyboard.press('Escape');
  await sleep(1000);
  check((await foglio(p)).path === '/', 'Esc: chiude l\'archivio');

  // extra: le celle vive partono anche nel foglio montato
  await clicCella(p, 'extra');
  await sleep(2500);
  const vive = await p.evaluate(() => ({
    ora: document.querySelector('.foglio [data-clock]')?.textContent?.trim(),
    globo: !!document.querySelector('.foglio [data-globe] path'),
  }));
  await sleep(1100);
  const ora2 = await p.evaluate(() => document.querySelector('.foglio [data-clock]')?.textContent?.trim());
  check(vive.globo && ora2 !== vive.ora, 'extra: orologio e globo vivi nel foglio');
  await p.keyboard.press('Escape');
  await sleep(1000);

  // doppio clic rapido: un foglio solo, aperto
  const pt = inView(await state(p), id);
  await p.mouse.click(pt.x, pt.y, { clickCount: 1 });
  await p.mouse.click(pt.x, pt.y, { clickCount: 2 });
  await sleep(1500);
  f = await foglio(p);
  const fogli = await p.$$eval('main[data-foglio]', l => l.length);
  check(f.path === href && f.aperto && fogli === 1 && f.copie === 0, 'doppio clic: un foglio solo, aperto', `fogli: ${fogli}`);
  check(await p.evaluate(() => window.__stesso === true), 'sempre nello stesso documento');
  await p.close();
}
if (chrome) {
  // apertura con CPU ×4
  const p = await page();
  await spia(p);
  await fresh(p);
  await sleep(1000);
  const cdp = await p.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const id = visible(await state(p), ['info', 'extra', 'archivio']);
  await fotogrammi(p);
  await clicCella(p, id);
  await sleep(2500);
  const gap = await stop(p);
  // il montaggio del foglio (stili, celle vive) prima del volo è un ritardo al clic, non uno scatto
  check((await foglio(p)).aperto && gap.volo < 50 && gap.prima < 200, 'volo con CPU ×4: niente scatti', `pausa più lunga ${gap.volo.toFixed(0)}ms · montaggio prima del volo ${gap.prima.toFixed(0)}ms`);
  await p.close();
}
if (chrome) {
  // scaricamento che non riesce: si apre lo stesso, con la pagina vera
  const p = await page();
  await p.evaluateOnNewDocument(() => { if (location.pathname === '/') window.fetch = () => Promise.reject(new Error('rete giù')); });
  await fresh(p);
  const id = visible(await state(p), ['info', 'extra']);
  await Promise.all([p.waitForNavigation({ waitUntil: 'load' }), clicCella(p, id)]);
  await sleep(1500);
  const f = await foglio(p);
  check(f.path !== '/' && f.aperto && f.nascoste.join() === id, 'scaricamento fallito: si apre la pagina vera, dalla cella', f.path);
  await p.close();
}
{
  // pila: tavolo → archivio (filtrato, scorso) → progetto → successivo → ✕ → archivio com'era → tag → Indice
  const p = await page();
  await spia(p);
  await fresh(p);
  await p.evaluate(() => { window.__stesso = true; });
  const cima = 'main[data-foglio]:not([hidden])';
  const fogli = () => p.$$eval('main[data-foglio]', l => l.map(m => (m.hidden ? 'nascosto' : 'in vista')).join(' '));
  const progettiVisti = () => p.$$eval(`${cima} .cell--project:not([hidden])`, l => l.length);
  await clicCella(p, 'archivio');
  await sleep(1300);
  await p.click(`${cima} .cell--tags button[data-tag]:not([data-tag=""])`);
  await sleep(900);
  const tagUrl = (await foglio(p)).path;
  const filtrati = await progettiVisti();
  await p.evaluate(() => scrollTo(0, 240));
  await sleep(300);
  const sc = await p.evaluate(() => scrollY);
  const c = await p.evaluate(sel => {
    for (const a of document.querySelectorAll(`${sel} .cell--project:not([hidden])`)) {
      const r = a.getBoundingClientRect();
      if (r.top > 10 && r.bottom < innerHeight - 10) return { href: a.getAttribute('href'), x: r.left, y: r.top, w: r.width, h: r.height };
    }
    return null;
  }, cima);
  const lunga = await p.evaluate(() => history.length);
  await p.mouse.click(c.x + c.w / 2, c.y + c.h / 2);
  await sleep(1500);
  let f = await foglio(p);
  const v = f.voli.at(-1);
  check(await p.evaluate(() => window.__stesso === true) && f.path === c.href && f.aperto && await fogli() === 'nascosto in vista', 'archivio → progetto: foglio in cima, archivio montato sotto', `${f.path} · ${await fogli()}`);
  check(v?.vista && Math.abs(v.x - c.x) < 2 && Math.abs(v.y - c.y) < 2, 'la hero parte dalla cella dell\'archivio', v ? `${v.x},${v.y} · cella ${Math.round(c.x)},${Math.round(c.y)}` : 'nessun volo');
  // successivo: sostituisce il foglio in cima
  await p.click(`${cima} a[data-id="succ"]`);
  await sleep(1500);
  f = await foglio(p);
  const succ = f.path;
  check(succ !== c.href && f.aperto && await p.evaluate(() => history.length) === lunga + 1 && await fogli() === 'nascosto in vista', 'successivo: sostituisce il foglio in cima, cronologia invariata', succ);
  // ✕: l'archivio com'era
  await p.click(`${cima} [data-hero] [data-close]`);
  await sleep(1300);
  f = await foglio(p);
  const sc2 = await p.evaluate(() => scrollY);
  check(f.path === tagUrl && f.aperto && await fogli() === 'in vista' && await progettiVisti() === filtrati && Math.abs(sc2 - sc) < 2, '✕: torna all\'archivio con lo stesso filtro e lo stesso scroll', `${f.path} · scroll ${sc} → ${sc2}`);
  check(f.copie === 0 && !f.titolo.startsWith('Roberto Tanasi ·'), 'nessuna copia rimasta, titolo dell\'archivio', f.titolo);
  // avanti e indietro ripercorrono la pila
  await p.evaluate(() => history.forward());
  await sleep(1500);
  f = await foglio(p);
  check(f.path === succ && f.aperto && await fogli() === 'nascosto in vista', 'avanti: di nuovo il progetto');
  await p.evaluate(() => history.back());
  await sleep(1500);
  f = await foglio(p);
  check(f.path === tagUrl && await fogli() === 'in vista', 'indietro: di nuovo l\'archivio');
  // tag di un progetto → archivio filtrato in cima
  await p.mouse.click(c.x + c.w / 2, c.y + c.h / 2);
  await sleep(1500);
  const tagLink = await p.$eval(`${cima} [data-id="tag"] a[href*="tag="]`, a => a.getAttribute('href'));
  await p.click(`${cima} [data-id="tag"] a[href="${tagLink}"]`);
  await sleep(1500);
  f = await foglio(p);
  const tutte = await p.$$eval(`${cima} .cell--project`, l => l.length);
  check(f.path === tagLink && await fogli() === 'nascosto nascosto in vista' && await progettiVisti() < tutte, 'tag del progetto: archivio filtrato in cima alla pila', `${f.path} · ${await fogli()}`);
  // indietro al progetto, poi Indice: tutta la pila, fino al tavolo
  await p.keyboard.press('Escape');
  await sleep(1300);
  await p.click(`${cima} a.cell[data-close]`);
  await sleep(1500);
  f = await foglio(p);
  check(f.path === '/' && !f.aperto && await fogli() === '' && f.main === 'tavolo' && !f.nascoste.length, 'Indice: dal progetto al tavolo in un colpo', `${f.path} · fogli: ${await fogli() || 'nessuno'}`);
  check(await p.evaluate(() => window.__stesso === true), 'sempre nello stesso documento');
  await p.close();
}
{
  // filtri dell'archivio con Flip: a fine animazione celle al posto della griglia, doppio clic veloce
  const p = await page();
  await p.goto(BASE + '/archivio', { waitUntil: 'networkidle0' });
  await sleep(2500);
  const bottoni = await p.$$('.foglio .cell--tags button[data-tag]:not([data-tag=""])');
  await bottoni[0].click();
  await bottoni[1].click();
  await sleep(1500);
  const r = await p.evaluate(() => {
    const viste = [...document.querySelectorAll('.foglio .cell--project:not([hidden])')];
    return {
      viste: viste.length,
      conteggio: Number(document.querySelector('.foglio [data-count]').textContent),
      // niente trasformazioni o opacità rimaste: ogni cella è dove la mette la griglia
      ferme: viste.every(c => getComputedStyle(c).transform === 'none' && getComputedStyle(c).opacity === '1'),
      path: location.pathname + location.search,
      premuto: document.querySelector('.foglio .cell--tags [aria-pressed="true"]')?.dataset.tag,
    };
  });
  check(r.viste === r.conteggio && r.ferme && r.path.endsWith(`tag=${r.premuto}`), 'filtri con Flip: doppio clic, celle ferme al loro posto, conteggio e indirizzo', `${r.viste} progetti · ${r.path}`);
  await p.close();
}
{
  // un tag della home apre l'archivio filtrato (pagina nuova: dopo un ritorno dalla cache Firefox non segue goto)
  const p = await page();
  await fresh(p);
  const s = await state(p);
  if (inView(s, 'tag')) {
    const tag = await p.$eval('[data-pezzo="tag"] a[href*="tag="]', a => a.getAttribute('href'));
    await p.click(`[data-pezzo="tag"] a[href="${tag}"]`);
    await sleep(1500);
    const f = await foglio(p);
    const viste = await p.$$eval('.foglio .cell--project:not([hidden])', l => l.length);
    const tutte = await p.$$eval('.foglio .cell--project', l => l.length);
    check(f.path === tag && f.aperto && viste < tutte && f.nascoste.join() === 'tag', 'tag in home: archivio filtrato sopra il tavolo, dalla cella dei tag', `${viste}/${tutte}`);
  } else check(false, 'cella dei tag in vista');
  await p.close();
}
if (chrome) {
  // riduci movimento: si chiude subito
  const p = await page({ reduced: true });
  await p.goto(BASE + '/extra', { waitUntil: 'networkidle0' });
  await sleep(300);
  await p.keyboard.press('Escape');
  await sleep(150);
  const f = await foglio(p);
  check(f.path === '/' && !f.aperto && !f.copie, 'riduci movimento: chiude subito');
  await p.close();
}

// ── Matita ──────────────────────────────────────────────────────────────
/** Segni: quanti tratti sul tavolo e su ogni cella, scala del gruppo del tavolo, stato dei pulsanti */
const segni = p => p.evaluate(() => {
  const celle = {};
  document.querySelectorAll('[data-pezzo]').forEach(el => {
    const n = el.querySelectorAll(':scope > [data-segni] path').length;
    if (n) celle[el.dataset.pezzo] = n;
  });
  const g = document.querySelector('[data-segni-tavolo]');
  return {
    tavolo: g.querySelectorAll('path').length, celle,
    scala: g.getAttribute('transform'),
    presa: document.querySelector('[data-matita]').getAttribute('aria-pressed') === 'true',
    cancella: !document.querySelector('[data-cancella]').hidden,
    mano: document.documentElement.classList.contains('matita-in-mano'),
  };
});
{
  const p = await page();
  await fresh(p);
  const s0 = await state(p);
  await p.click('[data-matita]');
  await sleep(500);
  let m = await segni(p);
  check(m.presa && m.mano && !m.cancella, 'matita presa: diventa il cursore, "Cancella tutto" ancora nascosto');
  // un tratto dalla carta dentro una cella: due pezzi, uno sul tavolo e uno sulla cella
  const id = visible(s0, ['archivio', 'extra', 'info']);
  const c = s0.cells[id];
  const bg = await background(p);
  const da = { x: c.x - s0.q * 2, y: c.y + c.h / 2 };
  await mouseDrag(p, da, s0.q * 4, 0, 300, 20);
  await sleep(700);
  m = await segni(p);
  let st = await state(p);
  check(m.tavolo >= 1 && m.celle[id] >= 1 && m.cancella, `tratto dalla carta su "${id}": tagliato sul bordo, un pezzo per foglio`, JSON.stringify({ tavolo: m.tavolo, celle: m.celle }));
  check(st.path === '/' && grid(st) === grid(s0), 'disegnando non si apre né si sposta niente');
  // Esc posa la matita; la cella spostata si porta dietro i suoi segni
  await p.keyboard.press('Escape');
  await sleep(500);
  m = await segni(p);
  check(!m.presa && !m.mano, 'Esc: matita posata');
  await mouseDrag(p, center(st.cells[id]), 3 * st.q, 2 * st.q);
  await sleep(900);
  m = await segni(p);
  check(m.celle[id] >= 1, 'la cella spostata si porta dietro i suoi segni');
  // zoom: i segni del tavolo scalano col quadretto
  await p.mouse.move(bg.x, bg.y);
  await p.mouse.wheel({ deltaY: -100 });
  await sleep(500);
  st = await state(p);
  m = await segni(p);
  check(m.scala === `scale(${st.q})`, 'zoom: i segni del tavolo seguono il quadretto', m.scala);
  // aprire e chiudere un foglio non li cancella
  const altra = visible(st, ['extra', 'info', 'archivio'].filter(x => x !== id)) ?? id;
  await clicCella(p, altra);
  await sleep(1300);
  await p.keyboard.press('Escape');
  await sleep(1100);
  m = await segni(p);
  check(m.tavolo >= 1 && m.celle[id] >= 1, 'aprendo e chiudendo un foglio i segni restano');
  // Cancella tutto
  await p.click('[data-cancella]');
  await sleep(500);
  m = await segni(p);
  check(!m.tavolo && !Object.keys(m.celle).length && !m.cancella, 'Cancella tutto: via i segni e il pulsante');
  await p.close();
}
if (chrome) {
  // dito: con la matita un dito disegna, due dita zoomano senza lasciare segni
  const p = await page({ width: 412, height: 860, touch: true });
  await fresh(p);
  const cdp = await p.createCDPSession();
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((pt, i) => ({ x: pt.x, y: pt.y, id: i })) });
  await p.tap('[data-matita]');
  await sleep(400);
  const s0 = await state(p);
  await touch('touchStart', [{ x: 120, y: 500 }]);
  for (let i = 1; i <= 12; i++) { await touch('touchMove', [{ x: 120 + i * 8, y: 500 + i * 3 }]); await sleep(20); }
  await touch('touchEnd', []);
  await sleep(400);
  let m = await segni(p);
  const n = m.tavolo + Object.values(m.celle).reduce((a, b) => a + b, 0);
  const s1 = await state(p);
  check(n >= 1 && s1.ox === s0.ox && s1.path === '/', 'dito con la matita: disegna, il tavolo resta fermo', `${n} tratti`);
  const mid = { x: 206, y: 430 };
  await touch('touchStart', [{ x: mid.x - 40, y: mid.y }]);
  await sleep(30);
  await touch('touchStart', [{ x: mid.x - 40, y: mid.y }, { x: mid.x + 40, y: mid.y }]);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: mid.x - 40 - i * 6, y: mid.y }, { x: mid.x + 40 + i * 6, y: mid.y }]); await sleep(25); }
  await touch('touchEnd', []);
  await sleep(500);
  m = await segni(p);
  const n2 = m.tavolo + Object.values(m.celle).reduce((a, b) => a + b, 0);
  check(n2 === n && (await state(p)).q > s1.q, 'due dita con la matita: zoom, nessun segno in più', `${n} → ${n2} tratti`);
  await p.close();
}

// ── Riduzione del movimento (emulata solo in Chrome) ────────────────────
if (chrome) {
  const p = await page({ reduced: true });
  await fresh(p);
  const s0 = await state(p);
  const id = visible(s0, ['metodo', 'archivio', 'info']);
  await mouseDrag(p, center(s0.cells[id]), 2 * s0.q, 0, 200, 8);
  await sleep(150);
  const s1 = await state(p);
  check(s1.cells[id].gx - s0.cells[id].gx === 2 && s1.path === '/', 'riduci movimento: la cella si posa subito');
  await p.click('[data-riordina]');
  await sleep(150);
  check(grid(await state(p)) === grid(s0), 'riduci movimento: riordina subito');
  await p.close();
}

if (chrome) {
  // ── Dito, 412×860 ─────────────────────────────────────────────────────
  const p = await page({ width: 412, height: 860, touch: true });
  await fresh(p);
  const cdp = await p.createCDPSession();
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((pt, i) => ({ x: pt.x, y: pt.y, id: i })) });
  async function swipe(from, dx, dy, { hold = 0, ms = 400, steps = 16 } = {}) {
    await touch('touchStart', [from]);
    if (hold) await sleep(hold);
    for (let i = 1; i <= steps; i++) { await touch('touchMove', [{ x: from.x + dx * i / steps, y: from.y + dy * i / steps }]); await sleep(ms / steps); }
    await touch('touchEnd', []);
  }
  const menu = () => p.evaluate(() => window.__menu ?? 0);
  // tocco: apre la pagina; indietro torna al tavolo
  const sT = await state(p);
  const link = ['archivio', 'kiale', 'info', 'extra', 'contatti'].find(id => inView(sT, id));
  await touch('touchStart', [inView(sT, link)]);
  await touch('touchEnd', []);
  await sleep(1500);
  check((await state(p)).path !== '/', `tocco su "${link}": apre`, (await state(p)).path);
  await p.evaluate(() => history.back());
  await sleep(1500);
  await p.evaluate(() => addEventListener('contextmenu', e => { if (!e.defaultPrevented) window.__menu = (window.__menu ?? 0) + 1; }));

  const s0 = await state(p);
  const id = visible(s0, ['archivio', 'kiale', 'intro']);
  // dito che scorre sulla cella: sposta il tavolo
  await swipe(center(s0.cells[id]), 0, -120);
  await sleep(1200);
  const s1 = await state(p);
  check(s1.path === '/' && grid(s1) === grid(s0) && s1.cells.logo.y < s0.cells.logo.y - 80, 'dito sulla cella: sposta il tavolo');

  // pressione lunga e poi movimento: prende la cella
  const s1b = await state(p);
  const c = center(s1b.cells[id]);
  await swipe(c, 2 * s1b.q, 3 * s1b.q, { hold: 500 });
  await sleep(1000);
  const s2 = await state(p);
  const moved = [s2.cells[id].gx - s1b.cells[id].gx, s2.cells[id].gy - s1b.cells[id].gy];
  check(s2.path === '/' && moved[0] === 2 && moved[1] === 3, 'pressione lunga: prende la cella', `${moved.join(' × ')} quadretti`);
  check(await menu() === 0, 'pressione lunga: niente menu del link');

  // pressione lunga senza muoversi: la prende e la posa, non apre
  const s2b = await state(p);
  await touch('touchStart', [center(s2b.cells[id])]);
  await sleep(600);
  await touch('touchEnd', []);
  await sleep(1200);
  check((await state(p)).path === '/', 'pressione lunga e via: non apre');

  // due dita che si allargano: zoom
  const s3 = await state(p);
  const m = { x: 206, y: 430 };
  await touch('touchStart', [{ x: m.x - 40, y: m.y }, { x: m.x + 40, y: m.y }]);
  for (let i = 1; i <= 12; i++) { await touch('touchMove', [{ x: m.x - 40 - i * 6, y: m.y }, { x: m.x + 40 + i * 6, y: m.y }]); await sleep(25); }
  await touch('touchEnd', []);
  await sleep(500);
  const s4 = await state(p);
  check(s4.q > s3.q * 1.5 && grid(s4) === grid(s3) && s4.path === '/', 'due dita: zoom', `quadretto ${s3.q} → ${s4.q}px`);

  await p.close();

  // ── Windows al 125%: quadretto e origine su pixel reali ──────────────
  {
    const p = await page({ scale: 1.25 });
    await fresh(p);
    const s = await state(p);
    const real = n => Math.abs(n * 1.25 - Math.round(n * 1.25)) < 1e-3;
    check(real(s.q) && real(s.ox) && real(s.oy) && Object.values(s.cells).every(c => real(c.x) && real(c.y)), '125%: fili sui pixel reali', `quadretto ${s.q}px`);
    await p.close();
  }

  // ── Scatti durante il pan, normale e con CPU ×4 ───────────────────────
  for (const rate of [1, 4]) {
    const p = await page();
    await fresh(p);
    const c = await p.createCDPSession();
    await c.send('Emulation.setCPUThrottlingRate', { rate });
    const bg = await background(p);
    // headless non è legato ai 60 Hz: conta la pausa più lunga tra due fotogrammi (oltre 33ms = scatto visibile)
    await p.evaluate(() => {
      window.__gap = 0; let last = performance.now();
      const tick = t => { window.__gap = Math.max(window.__gap, t - last); last = t; window.__raf = requestAnimationFrame(tick); };
      window.__raf = requestAnimationFrame(tick);
    });
    await mouseDrag(p, bg, -300, -150, 1000, 60);
    const gap = await p.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__gap; });
    check(gap < 34, `pan${rate > 1 ? ` con CPU ×${rate}` : ''}: niente scatti`, `pausa più lunga tra due fotogrammi ${gap.toFixed(0)}ms`);
    await p.close();
  }
}

await b.close();
console.log(failures ? `\n${failures} controlli con problemi` : '\ntutto a posto');
process.exit(failures ? 1 : 0);
