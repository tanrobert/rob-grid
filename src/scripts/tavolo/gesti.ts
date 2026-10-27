/**
 * Gesti sul tavolo. Un solo gesto alla volta:
 * - fondo: trascinato muove il tavolo, lasciato va avanti per inerzia;
 * - cella col mouse: dopo pochi px diventa trascinamento (si può lanciare);
 * - cella col dito: muove il tavolo, a meno di tenerla premuta (pressione lunga = presa);
 * - con la matita presa (matita.ts) un dito o il mouse disegna; due dita spostano e zoomano;
 * - due dita: zoom, e insieme spostano il tavolo. Rotella del mouse e Ctrl + rotella (il pizzico del
 *   trackpad arriva così): zoom; il trackpad con due dita sposta.
 * Senza movimento il click resta al browser: le celle sono link veri e aprono le pagine. Il click che
 * arriva alla fine di un gesto invece si ferma, se no lasciando una cella si aprirebbe.
 */
import { gsap } from 'gsap';
import { applica, aPixel, clampQ, sulTavolo, zoomTo, limita, limiti, elastico } from './vista';
import { prendi, porta, lascia, type Pezzo, type Presa } from './pezzi';
import { T, REDUCED, LONG, SLOP, QUIETE } from './tempi';
import type { Posto } from '../../lib/tavolo';
import type { Tavolo } from './index';

interface Attesa {
  mode: 'wait' | 'pan' | 'drag';
  id: number;
  touch: boolean;
  pezzo?: Pezzo;
  /** punto di partenza, ultimo punto (con l'ora) e velocità smorzata, px/s */
  sx: number; sy: number; px: number; py: number; pt: number; vx: number; vy: number;
  timer?: number;
  /** il foglio che si abbassa mentre il dito resta fermo */
  press?: gsap.core.Tween;
  pan0?: Posto;
  presa?: Presa;
}
interface Pizzico { mode: 'pinch'; d0: number; q0: number; w: Posto; m: Posto }
interface Disegno { mode: 'draw'; id: number; t0: number }

export function initGesti(t: Tavolo) {
  const { v, signal } = t;
  const el = v.el;
  const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, opts: AddEventListenerOptions = {}) =>
    el.addEventListener(type, fn, { signal, ...opts });

  let g: Attesa | Pizzico | Disegno | null = null;
  const pts = new Map<number, Posto>();  // dita (o mouse) appoggiati adesso
  // fine dell'ultimo gesto che si è mosso: il click che lo segue (subito dopo) non apre niente
  let fermo = 0;
  let touch = false;                      // ultimo puntatore: dito o penna

  const pezzoDi = (target: EventTarget | null) => {
    const node = (target as Element | null)?.closest?.('[data-pezzo]');
    return node ? t.pezzi.find(p => p.el === node) : undefined;
  };
  // con la cattura il gesto continua anche fuori dalla finestra; un dito è già catturato dal browser
  const capture = (id: number) => { try { el.setPointerCapture(id); } catch {} };
  const mid = (a: Posto, b: Posto) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  // pressione lasciata a metà: il foglio torna com'era
  const unpress = (a: Attesa) => {
    if (!a.press || !a.pezzo) return;
    a.press.kill();
    a.press = undefined;
    gsap.to(a.pezzo.el, { scale: 1, duration: T(0.15), ease: 'power2.out' });
  };
  const pick = (a: Attesa) => {
    a.mode = 'drag';
    a.press?.kill();
    a.press = undefined;
    a.presa = prendi(t, a.pezzo!, a.sx, a.sy, a.touch);
    el.classList.add('is-panning');  // mano chiusa anche portando una cella (Tavolo.astro)
    capture(a.id);
  };

  // ── Zoom ────────────────────────────────────────────────
  const zoomAt = (q: number, fx: number, fy: number) => {
    zoomTo(v, q, fx, fy, sulTavolo(v, fx, fy));
    limita(v);
    t.posaTutti();
    applica(v);
  };
  const startPinch = () => {
    const [a, b] = [...pts.values()], m = mid(a, b);
    gsap.killTweensOf(v.pan);
    el.classList.remove('is-panning');
    g = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, q0: v.q, w: sulTavolo(v, m.x, m.y), m };
  };
  const pinch = (p: Pizzico) => {
    if (pts.size < 2) return;
    const [a, b] = [...pts.values()];
    p.m = mid(a, b);
    // le dita che si allargano zoomano, quelle che si spostano insieme portano il tavolo
    zoomTo(v, clampQ(p.q0 * Math.hypot(a.x - b.x, a.y - b.y) / p.d0), p.m.x, p.m.y, p.w);
    limita(v);
    t.posaTutti();
    applica(v);
  };
  // a gesto finito il quadretto si ferma su un numero intero di pixel: i fili da 1px restano netti
  const endPinch = (p: Pizzico) => {
    zoomAt(aPixel(v.q), p.m.x, p.m.y);
    t.nitide();
    t.salva();
    fermo = performance.now();
    g = null;  // il dito rimasto giù non fa nulla finché non si alza
  };

  // ── Puntatore ───────────────────────────────────────────
  on('pointerdown', e => {
    touch = e.pointerType !== 'mouse';
    if (!touch && e.button !== 0) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // secondo dito: pizzico (salvo mentre si porta una cella)
    if (pts.size === 2 && g?.mode !== 'drag') {
      // il primo dito ha appena iniziato un segno: era l'inizio del pizzico, non un disegno
      if (g?.mode === 'draw') { if (performance.now() - g.t0 < 250) t.matita?.annulla(); else t.matita?.fine(); }
      else if (g && g.mode !== 'pinch') { clearTimeout(g.timer); unpress(g); }
      startPinch();
      return;
    }
    if (g) return;
    fermo = 0;
    gsap.killTweensOf(v.pan);
    if (t.matita?.attiva()) {
      g = { mode: 'draw', id: e.pointerId, t0: performance.now() };
      t.matita.inizia(e.clientX, e.clientY);
      capture(e.pointerId);
      return;
    }
    const pezzo = pezzoDi(e.target);
    const a: Attesa = {
      mode: 'wait', id: e.pointerId, touch, pezzo,
      sx: e.clientX, sy: e.clientY, px: e.clientX, py: e.clientY, pt: performance.now(), vx: 0, vy: 0,
    };
    g = a;
    if (pezzo && touch) {
      // mentre il dito resta fermo il foglio si abbassa appena: si capisce che sta per staccarsi
      a.press = gsap.to(pezzo.el, { scale: 0.975, duration: T(LONG / 1000), ease: 'power1.in' });
      a.timer = window.setTimeout(() => { if (g === a && a.mode === 'wait') pick(a); }, LONG);
    }
  });

  on('pointermove', e => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g?.mode === 'pinch') { pinch(g); return; }
    if (!g || e.pointerId !== g.id) return;
    if (g.mode === 'draw') {
      // tutti i punti intermedi che il browser ha raccolto tra un fotogramma e l'altro: tratto continuo
      for (const ev of e.getCoalescedEvents?.() ?? [e]) t.matita?.continua(ev.clientX, ev.clientY);
      return;
    }
    const now = performance.now(), dt = Math.max(1, now - g.pt);
    // velocità in px/s, smorzata: guida rotazione e inclinazione del foglio, e il lancio
    g.vx += ((e.clientX - g.px) / dt * 1000 - g.vx) * 0.35;
    g.vy += ((e.clientY - g.py) / dt * 1000 - g.vy) * 0.35;
    g.px = e.clientX; g.py = e.clientY; g.pt = now;
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (g.mode === 'wait' && Math.hypot(dx, dy) > SLOP) {
      clearTimeout(g.timer);
      unpress(g);
      if (g.pezzo && !g.touch) pick(g);
      else {
        g.mode = 'pan';
        g.pan0 = { x: v.pan.x - dx, y: v.pan.y - dy };
        el.classList.add('is-panning');
        capture(g.id);
      }
    }
    if (g.mode === 'pan') { elastico(v, g.pan0!.x + dx, g.pan0!.y + dy); applica(v); }
    if (g.mode === 'drag') porta(g.presa!, dx, dy, g.vx, g.vy);
  });

  const end = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    if (g?.mode === 'pinch') { if (pts.size < 2) endPinch(g); return; }
    if (!g || e.pointerId !== g.id) return;
    // fine del tratto: il click che segue non apre la cella su cui si è disegnato
    if (g.mode === 'draw') { t.matita?.fine(); fermo = performance.now(); g = null; return; }
    const a = g;
    g = null;
    clearTimeout(a.timer);
    if (a.mode === 'wait') { unpress(a); return; }  // tocco o click: lo apre il browser
    fermo = performance.now();
    el.classList.remove('is-panning');
    if (a.mode === 'drag') { lascia(t, a.presa!, a.vx, a.vy); return; }
    // lasciato oltre il bordo, torna sul foglio; l'inerzia si ferma al bordo
    const l = limiti(v);
    if (REDUCED) { limita(v); applica(v); t.salva(); return; }
    gsap.to(v.pan, {
      inertia: { x: { velocity: 'auto', min: -l.x, max: l.x }, y: { velocity: 'auto', min: -l.y, max: l.y }, resistance: 900 },
      onUpdate: () => applica(v), onComplete: t.salva,
    });
  };
  on('pointerup', end);
  on('pointercancel', end);

  // in cattura, prima del link (e di scripts/foglio, che ricorda la cella cliccata)
  on('click', e => {
    if (performance.now() - fermo > QUIETE) return;
    fermo = 0;
    e.preventDefault();
    e.stopPropagation();
  }, { capture: true });
  // pressione lunga col dito: niente menu del link. Col mouse il tasto destro resta al browser
  on('contextmenu', e => { if (touch) e.preventDefault(); });
  // niente trascinamento nativo di link e immagini
  on('dragstart', e => e.preventDefault());

  // ── Rotella e trackpad ──────────────────────────────────
  let wheelEnd = 0;
  on('wheel', e => {
    e.preventDefault();
    // rotella del mouse: scatti grandi e regolari, solo in verticale (il trackpad manda movimenti piccoli e continui)
    const mouse = e.deltaMode === 1 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
    clearTimeout(wheelEnd);
    if (e.ctrlKey || mouse) {
      // passo limitato: uno scatto della rotella ≈ ±35%, il pizzico del trackpad resta continuo
      const d = gsap.utils.clamp(-40, 40, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
      zoomAt(clampQ(v.q * Math.exp(-d * 0.008)), e.clientX, e.clientY);
      wheelEnd = window.setTimeout(() => { zoomAt(aPixel(v.q), e.clientX, e.clientY); t.nitide(); t.salva(); }, 160);
      return;
    }
    gsap.killTweensOf(v.pan);
    const k = e.deltaMode === 1 ? 16 : 1;
    v.pan.x -= e.deltaX * k;
    v.pan.y -= e.deltaY * k;
    limita(v);
    applica(v);
    wheelEnd = window.setTimeout(t.salva, 160);
  }, { passive: false });

  // ── Tastiera: Tab tra le celle, il tavolo porta in vista quella col fuoco ──
  on('focusin', e => {
    const p = pezzoDi(e.target);
    if (!p || !(e.target as Element).matches(':focus-visible')) return;
    const r = p.el.getBoundingClientRect(), m = v.q * 2;
    if (r.left >= m && r.top >= m && r.right <= v.vw - m && r.bottom <= v.vh - m) return;
    vai(t, -(p.gx + p.w / 2) * v.q, -(p.gy + p.h / 2) * v.q, 0.5);
  });

  addEventListener('resize', () => { v.vw = innerWidth; v.vh = innerHeight; t.confina(); t.posaTutti(); applica(v); }, { signal });
}

/** La vista scivola allo spostamento (x, y) in px */
export function vai(t: Tavolo, x: number, y: number, duration: number) {
  gsap.killTweensOf(t.v.pan);
  const l = limiti(t.v);
  x = Math.min(l.x, Math.max(-l.x, x));
  y = Math.min(l.y, Math.max(-l.y, y));
  gsap.to(t.v.pan, { x, y, duration: T(duration), ease: 'power3.inOut', onUpdate: () => applica(t.v), onComplete: t.salva });
}
