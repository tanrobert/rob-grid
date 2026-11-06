import type { Cell, Span, Presso, Nascosta } from '../data/grid-types';
import { BREAKPOINTS } from './grid';

/*
 * Tavolo: la home come tavolo da lavoro su carta quadrettata (prototipo: tools/pages/tavolo.html).
 * Misure in quadretti: 1 unità della griglia dei fogli = 4 quadretti. Sulla carta niente crocini (dal 6/11/2026):
 * le celle si misurano a quadretti (i progetti nella proporzione di quello che mostrano, `inProporzione`). Funzioni pure: le usano la build (disposizione senza JavaScript) e il
 * browser (disposizione per la finestra vera, Riordina).
 */

/** Quadretti per unità */
export const PER_UNITA = 4;
/** Lato del quadretto di base, in px: computer e telefono (sotto BREAKPOINTS.md) */
export const Q = { lg: 25, sm: 18 } as const;
/** Zoom, rispetto al quadretto di base: si parte da 1× (il massimo) e si rimpicciolisce fino a ZOOM_MIN.
    Uno scatto della rotella = ZOOM_PASSO (31/10/2026, scelta di Roberto: 1×, 0,75×, 0,5×) */
export const ZOOM_MIN = 0.5, ZOOM_PASSO = 0.25;

/** Misura di una cella sul tavolo: `q` scritto a mano, se no le unità × 4 */
export const inQuadretti = (cell: Cell): Span => cell.q ?? { w: cell.w * PER_UNITA, h: cell.h * PER_UNITA };

/**
 * Misura in quadretti di una cella con la proporzione `r` (larghezza / altezza) e un'area vicina a quella della forma
 * in unità (`shape` × 4 × 4): fra le coppie di lati interi conta prima la proporzione (peso 4), poi l'area.
 * Così 6×4 con una foto 3:2 resta 24×16, una 4:3 su 3×2 diventa 12×9 invece di essere tagliata a 12×8.
 */
export function inProporzione(shape: Span, r: number): Span {
  const area = shape.w * shape.h * PER_UNITA ** 2;
  let best: Span = { w: shape.w * PER_UNITA, h: shape.h * PER_UNITA }, score = Infinity;
  for (let h = 2; h <= 80; h++) {
    const w = Math.max(1, Math.round(h * r));
    const s = 4 * Math.abs(Math.log(w / h / r)) + Math.abs(Math.log((w * h) / area));
    if (s < score) { score = s; best = { w, h }; }
  }
  return best;
}

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
export function pack(pezzi: Array<Span & { id?: string; presso?: Presso; nascosta?: Nascosta }>, { vw, vh, q }: Finestra): Posto[] {
  const ax = vw / q, ay = (vh / q) * (vw < BREAKPOINTS.md ? 2.6 : 1);
  const placed: Rect[] = [];
  const di = new Map<string | undefined, Rect>();
  return pezzi.map(({ w, h, id, presso, nascosta }, i) => {
    let best: Posto = { x: 0, y: 0 }, score = Infinity;
    if (nascosta) {
      // nascosta (grid-types, `nascosta`): sotto la sua ospite, senza occupare posto
      const ospite = di.get(nascosta.sotto);
      if (!ospite) throw new Error(`[tavolo] "${id}" compare sotto "${nascosta.sotto}", che deve venire prima nell'elenco`);
      return { x: ospite.x, y: ospite.y + ospite.h + (nascosta.y ?? 1) };
    }
    if (i === 0) best = { x: -Math.floor(w / 2), y: -Math.floor(h / 2) };
    else if (presso) {
      // agganciata alla sua ospite (grid-types, `presso`): il posto è quello, le celle dopo le girano attorno
      const ospite = di.get(presso.id);
      if (!ospite) throw new Error(`[tavolo] "${id}" sta presso "${presso.id}", che deve venire prima nell'elenco`);
      best = { x: ospite.x + presso.x, y: ospite.y + presso.y };
      if (!free({ ...best, w, h }, placed)) throw new Error(`[tavolo] "${id}" presso "${presso.id}" si sovrappone a un'altra cella`);
    } else {
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
    di.set(id, { ...best, w, h });
    return best;
  });
}

export interface Finestra { vw: number; vh: number; q: number }

/** Foglio rispetto alla finestra, al minimo: mezza finestra in più per lato, da esplorare */
const FOGLIO_MIN = 2;
/** Carta libera attorno alle celle, in quadretti: due moduli */
const ATTORNO = 2 * PER_UNITA;

/**
 * Confine del tavolo: il foglio quadrettato, oltre il quale c'è solo inchiostro. Stesse proporzioni della
 * finestra, grande almeno FOGLIO_MIN finestre e abbastanza da tenere le celle (`posti`) più ATTORNO:
 * più celle ci sono, più è grande. Misure in quadretti di base (`q`), quindi lo zoom non lo cambia.
 * Restituisce le metà dei lati, in quadretti interi.
 */
export function confine(pezzi: Span[], posti: Posto[], { vw, vh, q }: Finestra): Posto {
  let x = 0, y = 0;
  pezzi.forEach(({ w, h }, i) => {
    x = Math.max(x, -posti[i].x, posti[i].x + w);
    y = Math.max(y, -posti[i].y, posti[i].y + h);
  });
  const fx = vw / 2 / q, fy = vh / 2 / q;
  const k = Math.max(FOGLIO_MIN, (x + ATTORNO) / fx, (y + ATTORNO) / fy);
  return { x: Math.ceil(fx * k), y: Math.ceil(fy * k) };
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
