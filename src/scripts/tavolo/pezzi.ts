/**
 * Le celle sul tavolo (pezzi): prenderle, portarle, posarle, riordinarle. Le posizioni sono in quadretti
 * (gx, gy) e diventano px moltiplicate per il quadretto: allo zoom si ridisegnano dove erano.
 */
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { pack } from '../../lib/tavolo';
import { applica, sulFoglio } from './vista';
import { T, REDUCED, LANCIO } from './tempi';
import { suona } from '../suono';
import type { Tavolo } from './index';
import type { Sotto } from '../../data/grid-types';

export interface Pezzo {
  id: string;
  el: HTMLElement;
  ombra: HTMLElement | null;
  /** misure e posizione in quadretti */
  w: number; h: number; gx: number; gy: number;
  /** ordine sopra/sotto: l'ultima presa sta sopra; −1 = nascosta sotto un'altra, finché non si prende */
  z: number;
  /** nascosta sotto un'altra cella (grid-types, `sotto`): la disposizione la mette sotto la sua ospite */
  sotto?: Sotto;
}

/** z di partenza: le nascoste sotto tutte (anche per la matita, che disegna sulla cella più in alto) */
const zBase = (p: Pezzo) => (p.sotto ? -1 : 0);

export const leggiPezzi = (mondo: HTMLElement): Pezzo[] =>
  [...mondo.querySelectorAll<HTMLElement>('[data-pezzo]')].map(el => {
    const [id, x, y] = el.dataset.sotto?.split(' ') ?? [];
    const p: Pezzo = {
      id: el.dataset.pezzo!, el, ombra: el.querySelector<HTMLElement>('[data-ombra]'),
      w: Number(el.dataset.w), h: Number(el.dataset.h), gx: 0, gy: 0, z: 0,
      sotto: id ? { id, x: Number(x), y: Number(y) } : undefined,
    };
    p.z = zBase(p);
    return p;
  });

export const posa = (p: Pezzo, q: number) => gsap.set(p.el, { x: p.gx * q, y: p.gy * q });

export function alza(p: Pezzo, z: number) {
  p.z = z;
  p.el.style.zIndex = z ? String(z) : '';
}

/** Disposizione pensata per la finestra e il quadretto di adesso (lib/tavolo.ts) */
export function disponi(t: Tavolo) {
  pack(t.pezzi, t.v).forEach(({ x, y }, i) => { t.pezzi[i].gx = x; t.pezzi[i].gy = y; });
}

/** Cella in mano: da dove è stata presa, e come ruota e si piega mentre si muove */
export interface Presa {
  p: Pezzo;
  x0: number; y0: number;
  /** leve: quanto il punto di presa è lontano dal centro, da -1 a 1 */
  lx: number; ly: number;
  rot: (deg: number) => void;
  skew: (deg: number) => void;
}

/** Prende la cella nel punto (sx, sy) dello schermo: sale sopra le altre, si solleva con l'ombra */
export function prendi(t: Tavolo, p: Pezzo, sx: number, sy: number, touch: boolean): Presa {
  const { el } = p;
  const r = el.getBoundingClientRect();
  // punto di presa dentro il foglio: da lì ruota e da lì si solleva
  const ox = sx - r.left, oy = sy - r.top;
  gsap.killTweensOf(el);
  alza(p, ++t.zTop);
  gsap.set(el, { transformOrigin: `${ox}px ${oy}px` });
  gsap.to(el, { scale: 1.035, duration: T(0.18), ease: 'power2.out' });
  if (p.ombra) gsap.to(p.ombra, { x: t.v.q * 0.55, y: t.v.q * 0.55, duration: T(0.18), ease: 'power2.out' });
  InertiaPlugin.track(el, 'x,y');
  if (touch) try { navigator.vibrate?.(8); } catch {}
  suona('presa');
  return {
    p,
    x0: Number(gsap.getProperty(el, 'x')), y0: Number(gsap.getProperty(el, 'y')),
    lx: (ox - r.width / 2) / (r.width / 2), ly: (r.height / 2 - oy) / (r.height / 2),
    rot: gsap.quickTo(el, 'rotation', { duration: T(0.32), ease: 'power3' }),
    skew: gsap.quickTo(el, 'skewX', { duration: T(0.25), ease: 'power3' }),
  };
}

/** Porta la cella di (dx, dy) px dal punto di presa; (vx, vy) = velocità del puntatore, px/s */
export function porta(pr: Presa, dx: number, dy: number, vx: number, vy: number) {
  gsap.set(pr.p.el, { x: pr.x0 + dx, y: pr.y0 + dy });
  if (REDUCED) return;
  // foglio tenuto in un punto: la parte libera resta indietro rispetto al moto
  pr.rot(gsap.utils.clamp(-11, 11, (vx * pr.ly + vy * pr.lx) * 0.011));
  // piega leggera: insieme alla rotazione, di più sembrerebbe gomma invece che carta
  pr.skew(gsap.utils.clamp(-5, 5, -vx * 0.003));
}

/** Lascia la cella: se va veloce vola e si ferma da sola, poi si aggancia ai quadretti e si posa */
export function lascia(t: Tavolo, pr: Presa, vx: number, vy: number) {
  const { p } = pr, { el } = p, q = t.v.q, f = t.v.foglio;
  // si posa sui quadretti, dentro il foglio: lasciata o lanciata oltre il bordo, scivola dentro
  const snapX = (n: number) => sulFoglio(Math.round(n / q), p.w, f.x) * q;
  const snapY = (n: number) => sulFoglio(Math.round(n / q), p.h, f.y) * q;
  // lanciata forte, ricade più forte
  const forza = Math.min(1, Math.hypot(vx, vy) / 2000);
  const land = () => {
    suona('ricaduta', forza);
    InertiaPlugin.untrack(el);
    p.gx = Math.round(Number(gsap.getProperty(el, 'x')) / q);
    p.gy = Math.round(Number(gsap.getProperty(el, 'y')) / q);
    // il foglio si posa: l'ombra rientra appena dopo l'aggancio
    gsap.to(el, { scale: 1, duration: T(0.18), ease: 'power2.inOut' });
    if (p.ombra) gsap.to(p.ombra, { x: 0, y: 0, duration: T(0.18), ease: 'power2.inOut' });
    t.salva();
  };
  // raddrizzarsi con una piccola oscillazione, senza un ritorno secco
  gsap.to(el, { rotation: 0, skewX: 0, duration: T(0.7), ease: 'elastic.out(1, .55)' });
  if (!REDUCED && Math.hypot(vx, vy) > LANCIO) {
    gsap.to(el, {
      inertia: { x: { velocity: 'auto', end: snapX }, y: { velocity: 'auto', end: snapY }, resistance: 1400 },
      duration: { min: 0.25, max: 0.9 }, onComplete: land,
    });
  } else {
    gsap.to(el, {
      x: snapX(Number(gsap.getProperty(el, 'x'))), y: snapY(Number(gsap.getProperty(el, 'y'))),
      duration: T(0.34), ease: 'back.out(1.8)', onComplete: land,
    });
  }
}

/** Riordina: la disposizione pensata, e la vista torna al centro. Partono prima le più vicine al centro */
export function riordina(t: Tavolo) {
  const q = t.v.q;
  disponi(t);
  t.confina();
  t.pezzi.forEach(p => alza(p, zBase(p)));
  t.zTop = 0;
  [...t.pezzi].sort((a, b) => Math.hypot(a.gx, a.gy) - Math.hypot(b.gx, b.gy)).forEach((p, i) => {
    gsap.to(p.el, { x: p.gx * q, y: p.gy * q, rotation: 0, scale: 1, skewX: 0, duration: T(0.7), ease: 'power3.inOut', delay: T(i * 0.018) });
  });
  gsap.to(t.v.pan, { x: 0, y: 0, duration: T(0.7), ease: 'power3.inOut', onUpdate: () => applica(t.v) });
  t.salva();
}
