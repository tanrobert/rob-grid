// Giro del tavolo della home: disposizione, gesti col mouse e col dito, zoom, memoria della visita, Riordina,
// riduzione del movimento, pixel netti al 125% e scatti durante il pan.
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
/** Home appena aperta, visita nuova (niente posizioni salvate) */
async function fresh(p) {
  await p.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await p.evaluate(() => sessionStorage.clear());
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
  await p.evaluate(() => sessionStorage.clear());
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
  await p.goBack();
  await sleep(1500);
  const s8 = await state(p);
  check(s8.path === '/' && grid(s8) === grid(s6), 'indietro: tavolo com\'era');
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
  await p.goBack();
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
