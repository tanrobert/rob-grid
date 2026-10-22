import type { Cell, Span } from '../data/grid-types';
import { BREAKPOINTS } from './grid';

/*
 * Tavolo: la home come tavolo da lavoro su carta quadrettata (prototipo: tools/pages/tavolo.html).
 * Misure in quadretti: 1 unità della griglia di oggi = 4 quadretti, e i crocini ogni 4 quadretti
 * cadono sul vecchio modulo. Funzioni pure: le usano la build (disposizione senza JavaScript) e il
 * browser (disposizione per la finestra vera, Riordina).
 */

/** Quadretti per unità */
export const PER_UNITA = 4;
/** Lato del quadretto di base, in px: computer e telefono (sotto BREAKPOINTS.md) */
export const Q = { lg: 25, sm: 18 } as const;
/** Zoom: il quadretto va da QMIN a QMAX px. Sotto 16 i testi a misura fissa (11 e 14 px) non stavano più nelle celle */
export const QMIN = 16, QMAX = 48;

/** Misura di una cella sul tavolo: `q` scritto a mano, se no le unità × 4 */
export const inQuadretti = (cell: Cell): Span => cell.q ?? { w: cell.w * PER_UNITA, h: cell.h * PER_UNITA };

export interface Posto { x: number; y: number }
interface Rect extends Posto, Span {}

/** Le celle si tengono a un quadretto di distanza l'una dall'altra */
const hits = (a: Rect, b: Rect) => a.x < b.x + b.w + 1 && b.x < a.x + a.w + 1 && a.y < b.y + b.h + 1 && b.y < a.y + a.h + 1;
const free = (r: Rect, others: Rect[]) => others.every(o => !hits(r, o));

/** Fin dove si cerca un posto, in quadretti dal centro */
const RAGGIO = 70;

/** Posizioni da -RAGGIO a RAGGIO in ordine di distanza del centro della cella (lato `n`) dal centro del tavolo;
    a pari distanza prima la più piccola (in alto, a sinistra: come una lettura riga per riga) */
const orders = new Map<number, number[]>();
const order = (n: number) => orders.get(n) ?? orders.set(n, Array.from({ length: 2 * RAGGIO + 1 }, (_, i) => i - RAGGIO)
  .sort((a, b) => Math.abs(a + n / 2) - Math.abs(b + n / 2) || a - b)).get(n)!;

/**
 * Disposizione: la prima cella (il marchio) al centro, le altre a spirale, a un quadretto l'una
 * dall'altra. Ognuna va nel posto libero più vicino al centro, con la distanza misurata sulla forma
 * della finestra: su schermo largo il tavolo si allarga di lato, sul telefono cresce in alto e in basso.
 * Stesso risultato del prototipo (che provava tutti i posti), ma si ferma appena nessun posto
 * rimasto può essere più vicino: righe e colonne in ordine di distanza.
 */
export function pack(pezzi: Span[], { vw, vh, q }: { vw: number; vh: number; q: number }): Posto[] {
  const ax = vw / q, ay = (vh / q) * (vw < BREAKPOINTS.md ? 2.6 : 1);
  const placed: Rect[] = [];
  return pezzi.map(({ w, h }, i) => {
    let best: Posto = { x: 0, y: 0 }, score = Infinity;
    if (i === 0) best = { x: -Math.floor(w / 2), y: -Math.floor(h / 2) };
    else {
      const xs = order(w);
      for (const y of order(h)) {
        const dy = (y + h / 2) / ay, ty = dy * dy;
        if (ty > score) break;
        for (const x of xs) {
          const dx = (x + w / 2) / ax, s = dx * dx + ty;
          if (s > score) break;
          if (!free({ x, y, w, h }, placed)) continue;
          // a pari distanza vince quella più in alto, poi più a sinistra
          if (s < score || y < best.y || (y === best.y && x < best.x)) { best = { x, y }; score = s; }  // qui s ≤ score
          break;  // in questa riga le altre sono più lontane
        }
      }
    }
    placed.push({ ...best, w, h });
    return best;
  });
}

/** Finestre tipo della disposizione scritta al build (senza JavaScript), una per breakpoint */
export const FINESTRE = {
  lg: { vw: 1440, vh: 900, q: Q.lg },
  md: { vw: 820, vh: 1180, q: Q.lg },
  sm: { vw: 390, vh: 844, q: Q.sm },
} as const;

/** Firma delle celle (id e misure): se cambia, le posizioni salvate nella visita non valgono più */
export function versione(pezzi: Array<Span & { id: string }>): string {
  let h = 5381;
  for (const ch of pezzi.map(p => `${p.id}:${p.w}x${p.h}`).join('|')) h = (h * 33) ^ ch.charCodeAt(0);
  return (h >>> 0).toString(36);
}
