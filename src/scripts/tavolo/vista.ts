/**
 * La vista sul tavolo: spostamento (pan) e zoom. Lo zoom cambia il quadretto (--q): il tavolo si ridisegna
 * alla misura nuova, fili e testi restano netti. Tutto agganciato ai pixel reali dello schermo.
 */
import { PER_UNITA, ZOOM_MIN, Q } from '../../lib/tavolo';
import { BREAKPOINTS } from '../../lib/grid';
import type { Posto } from '../../lib/tavolo';

export interface Vista {
  el: HTMLElement;
  carta: HTMLElement;
  mondo: HTMLElement;
  /** il bordo del foglio: oltre c'è solo inchiostro (Tavolo.astro) */
  bordo: HTMLElement | null;
  /** metà dei lati del foglio, in quadretti dal centro (lib/tavolo.ts, confine) */
  foglio: Posto;
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
  bordo: el.querySelector<HTMLElement>('[data-bordo]'),
  foglio: { x: Infinity, y: Infinity },
  q: 0,
  pan: { x: 0, y: 0 },
  vw: innerWidth,
  vh: innerHeight,
});

/** px agganciati ai pixel reali (Windows al 125%: passi da 0.8px), se no i fili da 1px cadono tra due pixel */
export const aPixel = (n: number) => Math.round(n * devicePixelRatio) / devicePixelRatio;
/** Quadretto di base (zoom 1×): computer o telefono */
export const base = (v: Vista) => (v.vw < BREAKPOINTS.md ? Q.sm : Q.lg);
/** Quadretto dentro lo zoom ammesso: da ZOOM_MIN a 1× */
export const clampQ = (v: Vista, q: number) => Math.min(base(v), Math.max(base(v) * ZOOM_MIN, q));
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Origine del tavolo sullo schermo: centro della finestra più lo spostamento */
export const ox = (v: Vista) => aPixel(v.vw / 2 + v.pan.x);
export const oy = (v: Vista) => aPixel(v.vh / 2 + v.pan.y);

/** Un punto dello schermo sul tavolo, in quadretti dal centro */
export const sulTavolo = (v: Vista, sx: number, sy: number): Posto => ({ x: (sx - ox(v)) / v.q, y: (sy - oy(v)) / v.q });

/**
 * Fin dove si sposta la vista, px per lato. Foglio più grande della finestra: la finestra resta sul foglio;
 * più piccolo (zoom indietro): il foglio resta tutto nella finestra. Col margine di un quadretto: al bordo si vede
 * dove finisce la griglia
 */
export const limiti = (v: Vista): Posto => ({
  x: Math.abs((v.foglio.x + 1) * v.q - v.vw / 2),
  y: Math.abs((v.foglio.y + 1) * v.q - v.vh / 2),
});
const stringi = (n: number, l: number) => Math.min(l, Math.max(-l, n));
/** La vista dentro i limiti, di colpo (rotella, zoom, finestra che cambia) */
export function limita(v: Vista) {
  const l = limiti(v);
  v.pan.x = stringi(v.pan.x, l.x);
  v.pan.y = stringi(v.pan.y, l.y);
}
/** Trascinando oltre i limiti la vista tira come un elastico, sempre meno (al massimo mezza finestra) */
export function elastico(v: Vista, x: number, y: number) {
  const l = limiti(v);
  const tira = (n: number, l: number, d: number) => {
    const oltre = Math.abs(n) - l;
    return oltre <= 0 ? n : Math.sign(n) * (l + (1 - 1 / ((oltre * 0.55) / d + 1)) * d);
  };
  v.pan.x = tira(x, l.x, v.vw / 2);
  v.pan.y = tira(y, l.y, v.vh / 2);
}
/** Posizione `n` di una cella di lato `lato` (quadretti) dentro il foglio di metà lato `mezzo`, a un quadretto dal bordo */
export const sulFoglio = (n: number, lato: number, mezzo: number) => Math.min(mezzo - lato - 1, Math.max(1 - mezzo, n));

/**
 * Sposta mondo e carta. La carta si muove solo del resto rispetto al modulo: sembra infinita.
 * Durante l'intro dice alla carta dov'è il centro del tavolo (i giri partono da lì, Tavolo.astro);
 * a ogni spostamento lo dice alle celle che girano col tavolo (la ghiera della cella mark, cells.ts)
 */
export function applica(v: Vista) {
  const x = ox(v), y = oy(v), S = v.q * PER_UNITA;
  v.mondo.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  v.carta.style.transform = `translate3d(${aPixel(mod(x, S))}px, ${aPixel(mod(y, S))}px, 0)`;
  if (v.bordo && Number.isFinite(v.foglio.x)) {
    // fuori dal foglio: quattro bande grandi quanto la finestra, una per lato, accostate al bordo (Tavolo.astro).
    // Solo transform: niente da ridisegnare. Lati in quadretti interi, sui pixel reali come le linee della carta
    // Tra la griglia e il rosso un quadretto di carta liscia (il margine): la griglia sembra stampata sul foglio
    const fx = v.foglio.x * v.q, fy = v.foglio.y * v.q, m = v.q;
    const [su, giu, sx, dx, margine] = v.bordo.children as HTMLCollectionOf<HTMLElement>;
    su.style.transform = `translate3d(0, ${y - fy - m - v.vh}px, 0)`;
    giu.style.transform = `translate3d(0, ${y + fy + m}px, 0)`;
    sx.style.transform = `translate3d(${x - fx - m - v.vw}px, 0, 0)`;
    dx.style.transform = `translate3d(${x + fx + m}px, 0, 0)`;
    // un pixel reale in più: la linea della carta sul bordo destro e in basso (ogni quadretto ha la sua a sinistra e in alto)
    margine.style.width = `${2 * fx + 1 / devicePixelRatio}px`;
    margine.style.height = `${2 * fy + 1 / devicePixelRatio}px`;
    margine.style.transform = `translate3d(${x - fx}px, ${y - fy}px, 0)`;
  }
  if (document.documentElement.classList.contains('is-intro')) {
    // la carta parte un modulo prima della finestra: il centro del tavolo, nelle sue coordinate
    v.carta.style.setProperty('--ox', `${S + x - mod(x, S)}px`);
    v.carta.style.setProperty('--oy', `${S + y - mod(y, S)}px`);
  }
  document.dispatchEvent(new CustomEvent<VistaEvento>('tavolo:vista', { detail: { y: v.pan.y, q: v.q } }));
}
/** Spostamento verticale della vista e quadretto, in px */
export interface VistaEvento { y: number; q: number }

/** Quadretto a `q`: lo leggono carta e celle (--q sul tavolo). --zoom = rispetto al quadretto di base: i testi e i
    margini interni delle celle (--pad, global.css) crescono e calano con lo zoom. Lo zoom si legge anche in alto a destra */
let indicatore: HTMLElement | null | undefined;
export function scala(v: Vista, q: number) {
  v.q = q;
  const zoom = q / base(v);
  v.el.style.setProperty('--q', `${q}px`);
  v.el.style.setProperty('--zoom', String(zoom));
  indicatore ??= document.querySelector<HTMLElement>('[data-zoom]');
  // come moltiplicatore, al ventesimo con la virgola: 1×, 0,75×, 0,5× (il quadretto intero lo sposta di poco)
  if (indicatore) indicatore.textContent = `${(Math.round(zoom * 20) / 20).toLocaleString('it-IT')}×`;
}

/** Zoom a `q` tenendo il punto `w` del tavolo (in quadretti) sotto il punto (fx, fy) dello schermo */
export function zoomTo(v: Vista, q: number, fx: number, fy: number, w: Posto) {
  scala(v, q);
  v.pan.x = fx - v.vw / 2 - w.x * q;
  v.pan.y = fy - v.vh / 2 - w.y * q;
}
