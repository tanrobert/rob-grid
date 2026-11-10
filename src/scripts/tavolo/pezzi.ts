/**
 * Le celle sul tavolo (pezzi): prenderle, portarle, posarle, riordinarle. Le posizioni sono in quadretti
 * (gx, gy) e diventano px moltiplicate per il quadretto: allo zoom si ridisegnano dove erano.
 */
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { pack } from '../../lib/tavolo';
import { applica, sulFoglio } from './vista';
import { T, REDUCED } from '../preferenze';
import { LANCIO } from './tempi';
import { suona } from '../suono';
import type { Tavolo } from './index';
import type { Nascosta, Presso } from '../../data/grid-types';

export interface Pezzo {
  id: string;
  el: HTMLElement;
  ombra: HTMLElement | null;
  /** misure e posizione in quadretti */
  w: number; h: number; gx: number; gy: number;
  /** ordine sopra/sotto: l'ultima presa sta sopra */
  z: number;
  /** agganciata accanto a un'altra (grid-types, `presso`): la disposizione la mette lì */
  presso?: Presso;
  /** nascosta finché non compare, poi sotto un'altra cella (grid-types, `nascosta`) */
  nascosta?: Nascosta;
}

/** "id x y" di data-presso (Tavolo.astro) */
const aggancio = (s?: string): Presso | undefined => {
  const [id, x, y] = s?.split(' ') ?? [];
  return id ? { id, x: Number(x), y: Number(y) } : undefined;
};

/** "id y" di data-nascosta (Tavolo.astro) */
const sotto = (s?: string): Nascosta | undefined => {
  const [id, y] = s?.split(' ') ?? [];
  return id ? { sotto: id, y: Number(y) } : undefined;
};

export const leggiPezzi = (mondo: HTMLElement): Pezzo[] =>
  [...mondo.querySelectorAll<HTMLElement>('[data-pezzo]')].map(el => ({
    id: el.dataset.pezzo!, el, ombra: el.querySelector<HTMLElement>('[data-ombra]'),
    w: Number(el.dataset.w), h: Number(el.dataset.h), gx: 0, gy: 0, z: 0,
    presso: aggancio(el.dataset.presso), nascosta: sotto(el.dataset.nascosta),
  }));

export const posa = (p: Pezzo, q: number) => gsap.set(p.el, { x: p.gx * q, y: p.gy * q });

export function alza(p: Pezzo, z: number) {
  p.z = z;
  p.el.style.zIndex = z ? String(z) : '';
}

/** Una cella nascosta compare (grid-types, `nascosta`): sotto la sua ospite, dov'è adesso, sopra le altre */
export function compare(t: Tavolo, p: Pezzo) {
  const o = t.pezzi.find(x => x.id === p.nascosta?.sotto);
  if (o) {
    p.gx = sulFoglio(o.gx, p.w, t.v.foglio.x);
    p.gy = sulFoglio(o.gy + o.h + (p.nascosta!.y ?? 1), p.h, t.v.foglio.y);
  }
  p.el.hidden = false;
  alza(p, ++t.zTop);
  posa(p, t.v.q);
  gsap.fromTo(p.el, { opacity: 0 }, { opacity: 1, duration: T(0.3), ease: 'power1.out', clearProps: 'opacity' });
  t.salva();
}

/** e sparisce di nuovo */
export function sparisce(t: Tavolo, p: Pezzo) {
  p.el.hidden = true;
  t.salva();
}

/** Disposizione pensata per la finestra di adesso (lib/tavolo.ts) */
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

/** La cella sale sopra le altre e si solleva con l'ombra, dal punto (ox, oy) del foglio (px dal suo angolo) */
export function solleva(t: Tavolo, p: Pezzo, ox: number, oy: number) {
  const { el } = p;
  gsap.killTweensOf(el);
  alza(p, ++t.zTop);
  gsap.set(el, { transformOrigin: `${ox}px ${oy}px` });
  gsap.to(el, { scale: 1.035, duration: T(0.18), ease: 'power2.out' });
  // a terra l'ombra è nascosta (Tavolo.astro): si mostra presa. overwrite: la posa di prima non la rinasconde
  if (p.ombra) {
    // opacity: durante l'intro l'ombra di una cella posata è trasparente (Tavolo.astro)
    p.ombra.style.visibility = 'inherit';
    p.ombra.style.opacity = '1';
    gsap.to(p.ombra, { x: t.v.q * 0.55, y: t.v.q * 0.55, duration: T(0.18), ease: 'power2.out', overwrite: true });
  }
  suona('presa');
}

/** E torna giù dov'è: l'ombra rientra appena dopo */
export function abbassa(p: Pezzo, ease = 'power2.inOut') {
  gsap.to(p.el, { scale: 1, duration: T(0.18), ease });
  if (p.ombra) {
    const ombra = p.ombra;
    gsap.to(ombra, { x: 0, y: 0, duration: T(0.18), ease, overwrite: true, onComplete: () => { ombra.style.visibility = ombra.style.opacity = ''; } });
  }
}

/** Prende la cella nel punto (sx, sy) dello schermo: sale sopra le altre, si solleva con l'ombra */
export function prendi(t: Tavolo, p: Pezzo, sx: number, sy: number, touch: boolean): Presa {
  const { el } = p;
  const r = el.getBoundingClientRect();
  // punto di presa dentro il foglio: da lì ruota e da lì si solleva
  const ox = sx - r.left, oy = sy - r.top;
  solleva(t, p, ox, oy);
  InertiaPlugin.track(el, 'x,y');
  if (touch) try { navigator.vibrate?.(8); } catch {}
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
    abbassa(p);
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
  t.inOrdine();
  t.pezzi.forEach(p => alza(p, 0));
  t.zTop = 0;
  [...t.pezzi].sort((a, b) => Math.hypot(a.gx, a.gy) - Math.hypot(b.gx, b.gy)).forEach((p, i) => {
    gsap.to(p.el, { x: p.gx * q, y: p.gy * q, rotation: 0, scale: 1, skewX: 0, duration: T(0.7), ease: 'power3.inOut', delay: T(i * 0.018) });
  });
  gsap.to(t.v.pan, { x: 0, y: 0, duration: T(0.7), ease: 'power3.inOut', onUpdate: () => applica(t.v) });
  t.salva();
}
