/**
 * La vista sul tavolo: spostamento (pan) e zoom. Lo zoom cambia il quadretto (--q): il tavolo si ridisegna
 * alla misura nuova, fili e testi restano netti. Tutto agganciato ai pixel reali dello schermo.
 */
import { PER_UNITA, QMIN, QMAX, Q } from '../../lib/tavolo';
import { BREAKPOINTS } from '../../lib/grid';
import type { Posto } from '../../lib/tavolo';

export interface Vista {
  el: HTMLElement;
  carta: HTMLElement;
  mondo: HTMLElement;
  /** lato del quadretto, px */
  q: number;
  /** spostamento del centro del tavolo dal centro della finestra, px */
  pan: { x: number; y: number };
  vw: number;
  vh: number;
}

export const creaVista = (el: HTMLElement): Vista => ({
  el,
  carta: el.querySelector<HTMLElement>('[data-carta]')!,
  mondo: el.querySelector<HTMLElement>('[data-mondo]')!,
  q: 0,
  pan: { x: 0, y: 0 },
  vw: innerWidth,
  vh: innerHeight,
});

/** px agganciati ai pixel reali (Windows al 125%: passi da 0.8px), se no i fili da 1px cadono tra due pixel */
export const aPixel = (n: number) => Math.round(n * devicePixelRatio) / devicePixelRatio;
export const clampQ = (q: number) => Math.min(QMAX, Math.max(QMIN, q));
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Origine del tavolo sullo schermo: centro della finestra più lo spostamento */
export const ox = (v: Vista) => aPixel(v.vw / 2 + v.pan.x);
export const oy = (v: Vista) => aPixel(v.vh / 2 + v.pan.y);

/** Un punto dello schermo sul tavolo, in quadretti dal centro */
export const sulTavolo = (v: Vista, sx: number, sy: number): Posto => ({ x: (sx - ox(v)) / v.q, y: (sy - oy(v)) / v.q });

/**
 * Sposta mondo e carta. La carta si muove solo del resto rispetto al modulo: sembra infinita.
 * Durante l'intro dice alla carta dov'è il centro del tavolo (i giri partono da lì, Tavolo.astro);
 * a ogni spostamento lo dice alle celle che girano col tavolo (la ghiera della cella mark, cells.ts)
 */
export function applica(v: Vista) {
  const x = ox(v), y = oy(v), S = v.q * PER_UNITA;
  v.mondo.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  v.carta.style.transform = `translate3d(${aPixel(mod(x, S))}px, ${aPixel(mod(y, S))}px, 0)`;
  if (document.documentElement.classList.contains('is-intro')) {
    // la carta parte un modulo prima della finestra: il centro del tavolo, nelle sue coordinate
    v.carta.style.setProperty('--ox', `${S + x - mod(x, S)}px`);
    v.carta.style.setProperty('--oy', `${S + y - mod(y, S)}px`);
  }
  document.dispatchEvent(new CustomEvent<VistaEvento>('tavolo:vista', { detail: { y: v.pan.y, q: v.q } }));
}
/** Spostamento verticale della vista e quadretto, in px */
export interface VistaEvento { y: number; q: number }

/** Quadretto a `q`: lo leggono carta e celle (--q sul tavolo). --zoom = rispetto al quadretto di base: i margini
    interni delle celle (--pad, Tavolo.astro) crescono e calano con lo zoom */
export function scala(v: Vista, q: number) {
  v.q = q;
  v.el.style.setProperty('--q', `${q}px`);
  v.el.style.setProperty('--zoom', String(q / (v.vw < BREAKPOINTS.md ? Q.sm : Q.lg)));
}

/** Zoom a `q` tenendo il punto `w` del tavolo (in quadretti) sotto il punto (fx, fy) dello schermo */
export function zoomTo(v: Vista, q: number, fx: number, fy: number, w: Posto) {
  scala(v, q);
  v.pan.x = fx - v.vw / 2 - w.x * q;
  v.pan.y = fy - v.vh / 2 - w.y * q;
}
