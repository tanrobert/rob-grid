import type { Cell, Span } from '../data/grid-types';

/** Colonne (minime: da 600px in su, se c'è posto, ce ne sono di più) e soglie per breakpoint: tenere allineati
    con --cols e le media query di global.css.
    Unità piccola: la "cella base" quadrata è 2×2, le unità singole danno le forme intermedie. */
export const COLS = { lg: 12, md: 8, sm: 4 } as const;
export const BREAKPOINTS = { md: 600, lg: 1024 } as const;
/** Quadretto massimo dei fogli da 600px in su: quello del tavolo (Q.lg in lib/tavolo.ts, --qf-max in Foglio.astro) */
export const QF_MAX = 25;
/** Pagine progetto (Foglio centrato, in prova dal 6/11/2026): sempre le colonne minime (12 computer, 8 tablet) e il
    quadretto che cresce con la finestra fino a questo (--qf-max in Foglio.astro); oltre, ai lati si vede il tavolo */
export const QF_MAX_PROGETTI = 28;
/** Altezza massima di una cella, in unità */
const MAX_H = 24;

/** larghezze in unità intere; altezze anche a quarti (righe a quadretti: un quarto di unità = un quadretto) */
const clamp = (n: number, max: number, passo = 1) => Math.max(1, Math.min(Math.round(n / passo) * passo, max));

export function resolveSpans(cell: Cell): Record<keyof typeof COLS, Span> {
  const lg = { w: clamp(cell.w, COLS.lg), h: clamp(cell.h, MAX_H, 0.25) };
  const md = { w: clamp(cell.md?.w ?? lg.w, COLS.md), h: clamp(cell.md?.h ?? lg.h, MAX_H, 0.25) };
  const sm = { w: clamp(cell.sm?.w ?? md.w, COLS.sm), h: clamp(cell.sm?.h ?? md.h, MAX_H, 0.25) };
  return { lg, md, sm };
}

/** Altezza in unità (a quarti) di una cella larga w unità con la proporzione r (larghezza / altezza): la cella è
    4w−1 quadretti per 4h−1, quindi l'altezza in quadretti più quello dello spazio sotto, diviso 4 */
export const altezzaInProporzione = (w: number, r: number) => (Math.max(3, Math.round((4 * w - 1) / r)) + 1) / 4;

/** Forma di un progetto scalata per ogni breakpoint (×1 in archivio, ×2 nella hero); se non ci sta nelle colonne va
    a tutta larghezza. Con `r` (la proporzione di quello che la cella mostra, video o copertina: `proporzione` in
    data/projects.ts) la forma dà solo la larghezza e l'altezza, in quadretti, viene da `r`: la cella ha la stessa
    proporzione che ha sul tavolo (6/11/2026, scelta di Roberto). Senza, il rapporto della forma. */
export function scaleShape(shape: Span, factor: number, r?: number): Span & { md: Span; sm: Span } {
  const fit = (cols: number): Span => {
    const w = Math.min(shape.w * factor, cols);
    return { w, h: r ? altezzaInProporzione(w, r) : Math.round((shape.h * factor * w) / (shape.w * factor)) };
  };
  return { ...fit(COLS.lg), md: fit(COLS.md), sm: fit(COLS.sm) };
}

/** Custom properties lette da .cell in global.css. */
export function spanStyle(cell: Cell): string {
  const { lg, md, sm } = resolveSpans(cell);
  return `--w:${lg.w};--h:${lg.h};--w-md:${md.w};--h-md:${md.h};--w-sm:${sm.w};--h-sm:${sm.h}`;
}

/** `sizes` per <Image>: larghezza reale della cella a ogni breakpoint (components/foglio). Una cella larga w unità
    è 4w−1 quadretti; il foglio è largo 4·colonne+1 quadretti, quindi finché il quadretto segue la finestra la cella
    ne è una frazione fissa, da QF_MAX in su (oltre si aggiungono colonne) ha una misura fissa in px. Sul telefono
    il foglio non ha margini ai lati (4·colonne−1 quadretti, components/foglio). Pagine progetto: qfMax = QF_MAX_PROGETTI */
export function mediaSizes(cell: Cell, qfMax = QF_MAX): string {
  const { lg, md, sm } = resolveSpans(cell);
  const q = (w: number) => 4 * w - 1;
  const vw = (w: number, cols: number, quadretti = 4 * cols + 1) => `${((q(w) / quadretti) * 100).toFixed(2)}vw`;
  const px = (w: number) => `${q(w) * qfMax}px`;
  const fisso = (cols: number) => (4 * cols + 1) * qfMax;
  return [
    `(min-width: ${fisso(COLS.lg)}px) ${px(lg.w)}`,
    `(min-width: ${BREAKPOINTS.lg}px) ${vw(lg.w, COLS.lg)}`,
    `(min-width: ${fisso(COLS.md)}px) ${px(md.w)}`,
    `(min-width: ${BREAKPOINTS.md}px) ${vw(md.w, COLS.md)}`,
    vw(sm.w, COLS.sm, 4 * COLS.sm - 1),
  ].join(', ');
}
