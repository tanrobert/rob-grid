/**
 * Casella "terra": il globo segue l'orientamento reale (lib/globe.ts).
 * - all'ingresso fa un giro veloce e frena fino all'orientamento reale (una volta per visita);
 * - si trascina col mouse in tutte le direzioni, col dito solo in orizzontale;
 * - lasciato andare con slancio continua a girare e frena (free-spin); fermo, dopo una breve pausa
 *   torna all'orientamento reale, che intanto si aggiorna.
 * Le terre (data/land-110m.json, ~20 KB) si caricano solo se la casella c'è.
 */

import { drawGlobe, realSpin, type Spin } from '../lib/globe';

let introDone = false;  // il modulo sopravvive alle navigazioni del ClientRouter

const INTRO_MS = 2400;
const RETURN_DELAY_MS = 500;
const RETURN_MS = 900;
const FRICTION_MS = 700;   // free-spin: la velocità si riduce a ~1/3 ogni 700 ms
const MAX_SPEED = 3;       // °/ms, tetto allo slancio
const MIN_SPEED = 0.01;    // °/ms, sotto questa il globo è fermo
const RELEASE_IDLE_MS = 80; // se il dito era fermo da più di così, niente slancio
const easeOut = (k: number) => 1 - (1 - k) ** 3;
const easeInOut = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);
/** differenza angolare più breve, in (-180, 180] */
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

export async function initGlobe(signal: AbortSignal, reduced: boolean) {
  const root = document.querySelector<HTMLElement>('[data-globe]');
  if (!root) return;
  const { default: land } = await import('../data/land-110m.json');
  if (signal.aborted) return;

  const gridEl = root.querySelector('[data-globe-grid]')!;
  const landEl = root.querySelector('[data-globe-land]')!;
  const cell = root.closest<HTMLElement>('.cell');

  let spin: Spin = realSpin();
  const paint = () => {
    const g = drawGlobe(land as never, spin);
    gridEl.setAttribute('d', g.grid);
    landEl.setAttribute('d', g.land);
  };

  // ── animazioni: una alla volta ─────────────────────────
  let raf = 0;
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  /** porta il globo verso l'orientamento reale (ricalcolato a ogni fotogramma: è un bersaglio che si muove).
      dλ = scarto di partenza in longitudine: di default la strada più breve, -360 per un giro intero */
  const tweenToReal = (from: Spin, ms: number, ease: (k: number) => number, dλ = wrap(from[0] - realSpin()[0])) => {
    stop();
    if (reduced) { spin = realSpin(); paint(); return; }
    let t0 = 0;
    const step = (t: number) => {
      t0 ||= t;
      const k = Math.min(1, (t - t0) / ms);
      const [λr, φr] = realSpin();
      const e = ease(k);
      spin = [λr + dλ * (1 - e), φr + (from[1] - φr) * (1 - e)];
      paint();
      raf = k < 1 ? requestAnimationFrame(step) : 0;
    };
    raf = requestAnimationFrame(step);
  };
  addEventListener('pagehide', stop, { signal });
  signal.addEventListener('abort', stop);

  // ── ingresso: un giro intero che frena sull'orientamento reale ─
  if (!introDone && !reduced) {
    // posa di partenza: inclinato di 30°, poi un giro intero che frena sul reale
    const start = (): Spin => [realSpin()[0], 30];
    spin = start();
    paint();  // sostituisce subito il disegno del build (orientato all'ora del build)
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      introDone = true;
      tweenToReal(start(), INTRO_MS, easeOut, -360);
    }, { threshold: 0.5 });
    io.observe(root);
    signal.addEventListener('abort', () => io.disconnect());
  } else {
    paint();
  }

  // ── tempo reale: 0,25° al minuto, basta ridisegnare ogni tanto ─
  let dragging = false;
  let returnTimer = 0;
  const tick = setInterval(() => {
    if (dragging || raf || returnTimer || cell?.hasAttribute('data-offscreen')) return;
    spin = realSpin();
    paint();
  }, 20_000);
  signal.addEventListener('abort', () => { clearInterval(tick); clearTimeout(returnTimer); });

  const scheduleReturn = () => {
    returnTimer = window.setTimeout(() => { returnTimer = 0; tweenToReal(spin, RETURN_MS, easeInOut); }, RETURN_DELAY_MS);
  };

  /** free-spin: prosegue con la velocità del rilascio (°/ms) e frena in modo esponenziale */
  const coast = (v: [number, number]) => {
    stop();
    let tPrev = 0;
    const step = (t: number) => {
      const dt = tPrev ? Math.min(t - tPrev, 50) : 16;  // dopo una scheda in background non salta avanti
      tPrev = t;
      const f = Math.exp(-dt / FRICTION_MS);
      const travel = FRICTION_MS * (1 - f);  // integrale esatto della velocità che decade nel fotogramma
      const φ = spin[1] + v[1] * travel;
      spin = [spin[0] + v[0] * travel, Math.max(-90, Math.min(90, φ))];
      v = [v[0] * f, φ === spin[1] ? v[1] * f : 0];  // al polo l'asse verticale si ferma
      paint();
      if (Math.hypot(v[0], v[1]) > MIN_SPEED) raf = requestAnimationFrame(step);
      else { raf = 0; scheduleReturn(); }
    };
    raf = requestAnimationFrame(step);
  };

  // ── trascinamento ─────────────────────────────────────
  let last: [number, number] = [0, 0];
  let lastT = 0;
  let vel: [number, number] = [0, 0];
  let degPerPx = 1;
  root.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    stop();
    clearTimeout(returnTimer); returnTimer = 0;
    dragging = true;
    last = [e.clientX, e.clientY];
    lastT = e.timeStamp;
    vel = [0, 0];
    degPerPx = 180 / root.querySelector('svg')!.getBoundingClientRect().width;  // tutta la larghezza = mezzo giro
    root.setPointerCapture(e.pointerId);
  }, { signal });

  root.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - last[0], dy = e.clientY - last[1];
    last = [e.clientX, e.clientY];
    const vertical = e.pointerType === 'touch' ? 0 : dy;  // col dito solo in orizzontale
    const prev = spin;
    spin = [spin[0] + dx * degPerPx, Math.max(-90, Math.min(90, spin[1] - vertical * degPerPx))];
    // velocità media mobile: smussa gli scatti dei singoli eventi
    const dt = e.timeStamp - lastT;
    lastT = e.timeStamp;
    if (dt > 0) vel = [vel[0] * 0.5 + (spin[0] - prev[0]) / dt * 0.5, vel[1] * 0.5 + (spin[1] - prev[1]) / dt * 0.5];
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); });
  }, { signal });

  const release = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    const speed = Math.hypot(vel[0], vel[1]);
    if (reduced || e.type === 'pointercancel' || e.timeStamp - lastT > RELEASE_IDLE_MS || speed < MIN_SPEED * 5) {
      scheduleReturn();
      return;
    }
    const k = Math.min(1, MAX_SPEED / speed);
    coast([vel[0] * k, vel[1] * k]);
  };
  root.addEventListener('pointerup', release, { signal });
  root.addEventListener('pointercancel', release, { signal });
}
