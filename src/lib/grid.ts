import type { Cell, Span } from '../data/grid-types';

/** Colonne e soglie per breakpoint — tenere allineati con --cols e le media query di global.css.
    Unità piccola: la "casella base" quadrata è 2×2, le unità singole danno le forme intermedie. */
export const COLS = { lg: 12, md: 8, sm: 4 } as const;
export const BREAKPOINTS = { md: 600, lg: 1024 } as const;
/** Altezza massima di una cella, in unità */
const MAX_H = 24;

const clamp = (n: number, max: number) => Math.max(1, Math.min(Math.round(n), max));

export function resolveSpans(cell: Cell): Record<keyof typeof COLS, Span> {
  const lg = { w: clamp(cell.w, COLS.lg), h: clamp(cell.h, MAX_H) };
  const md = { w: clamp(cell.md?.w ?? lg.w, COLS.md), h: clamp(cell.md?.h ?? lg.h, MAX_H) };
  const sm = { w: clamp(cell.sm?.w ?? md.w, COLS.sm), h: clamp(cell.sm?.h ?? md.h, MAX_H) };
  return { lg, md, sm };
}

/** Forma di un progetto scalata per ogni breakpoint (×1 in home e archivio, ×2 nella hero).
    Se non ci sta nelle colonne va a tutta larghezza con lo stesso rapporto: l'immagine non si deforma. */
export function scaleShape(shape: Span, factor: number): Span & { md: Span; sm: Span } {
  const fit = (cols: number): Span => {
    const w = shape.w * factor, h = shape.h * factor;
    return w <= cols ? { w, h } : { w: cols, h: Math.round((h * cols) / w) };
  };
  return { ...fit(COLS.lg), md: fit(COLS.md), sm: fit(COLS.sm) };
}

/** Custom properties lette da .cell in global.css. */
export function spanStyle(cell: Cell): string {
  const { lg, md, sm } = resolveSpans(cell);
  return `--w:${lg.w};--h:${lg.h};--w-md:${md.w};--h-md:${md.h};--w-sm:${sm.w};--h-sm:${sm.h}`;
}

/** `sizes` per <Image>: larghezza reale della cella a ogni breakpoint. */
export function mediaSizes(cell: Cell): string {
  const { lg, md, sm } = resolveSpans(cell);
  const pct = (w: number, cols: number) => `${((w / cols) * 100).toFixed(2)}vw`;
  return [
    `(min-width: ${BREAKPOINTS.lg}px) ${pct(lg.w, COLS.lg)}`,
    `(min-width: ${BREAKPOINTS.md}px) ${pct(md.w, COLS.md)}`,
    pct(sm.w, COLS.sm),
  ].join(', ');
}
