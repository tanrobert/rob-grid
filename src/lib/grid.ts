import type { Cell, Span } from '../data/grid-types';

/** Colonne per breakpoint — tenere allineato con --cols in global.css. */
export const COLS = { lg: 6, md: 4, sm: 2 } as const;
export const BREAKPOINTS = { md: 600, lg: 1024 } as const;

const clamp = (n: number, max: number) => Math.max(1, Math.min(Math.round(n), max));

export function resolveSpans(cell: Cell): Record<keyof typeof COLS, Span> {
  const lg = { w: clamp(cell.w, COLS.lg), h: clamp(cell.h, 12) };
  const md = { w: clamp(cell.md?.w ?? lg.w, COLS.md), h: clamp(cell.md?.h ?? lg.h, 12) };
  const sm = { w: clamp(cell.sm?.w ?? md.w, COLS.sm), h: clamp(cell.sm?.h ?? md.h, 12) };
  return { lg, md, sm };
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

/** Nome condiviso tra cella e pagina di destinazione per la View Transition. */
export const morphName = (href: string) => `morph-${href.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`;

export interface Rect { col: number; row: number; w: number; h: number }

/**
 * Replica l'auto-placement CSS `grid-auto-flow: row dense` e restituisce
 * i buchi rimasti, raggruppati in rettangoli. Serve a riempirli con celle
 * "vuote" esplicite senza spostare nessun'altra cella.
 */
export function findVoids(spans: Span[], cols: number): Rect[] {
  const taken: boolean[][] = [];
  const isFree = (r: number, c: number) => !taken[r]?.[c];
  const fits = (r: number, c: number, s: Span) => {
    if (c + s.w > cols) return false;
    for (let y = r; y < r + s.h; y++) for (let x = c; x < c + s.w; x++) if (!isFree(y, x)) return false;
    return true;
  };
  for (const s of spans) {
    let placed = false;
    for (let r = 0; !placed; r++) {
      for (let c = 0; c < cols && !placed; c++) {
        if (!fits(r, c, s)) continue;
        for (let y = r; y < r + s.h; y++) for (let x = c; x < c + s.w; x++) (taken[y] ??= [])[x] = true;
        placed = true;
      }
    }
  }

  // raggruppa: prima run orizzontali per riga, poi unisce run identiche in verticale
  const voids: Rect[] = [];
  for (let r = 0; r < taken.length; r++) {
    for (let c = 0; c < cols; ) {
      if (!isFree(r, c)) { c++; continue; }
      let w = 1;
      while (c + w < cols && isFree(r, c + w)) w++;
      const above = voids.find(v => v.col === c + 1 && v.w === w && v.row + v.h === r + 1);
      if (above) above.h++;
      else voids.push({ col: c + 1, row: r + 1, w, h: 1 });
      c += w;
    }
  }
  return voids;
}
