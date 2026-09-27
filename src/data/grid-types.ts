import type { ImageMetadata } from 'astro';

/** Unità occupate da una cella: w = colonne, h = righe (1 unità = 1 quadrato della griglia). */
export interface Span {
  w: number;
  h: number;
}

/** SVG disponibili (vedi src/components/SvgAsset.astro). */
export type SvgName = 'logo-r' | 'roberto' | 'logo-completo';

/** Colore di fondo della cella. */
export type Tone = 'paper' | 'red';

interface CellBase extends Span {
  /** Identificativo unico: usato per le transizioni e il debug. */
  id: string;
  /** Override opzionale su tablet (4 colonne). Default: w ridotto a max 4. */
  md?: Partial<Span>;
  /** Override opzionale su mobile (2 colonne). Default: w ridotto a max 2. */
  sm?: Partial<Span>;
  tone?: Tone;
  /** Se presente, la cella è cliccabile e si espande nella pagina di destinazione. */
  href?: string;
  /** Etichetta tecnica in alto a sinistra. `false` per nasconderla. */
  label?: string | false;
  /** La cella è l'arrivo dell'espansione della cella con questo href (es. '/archivio'). */
  heroOf?: string;
  /** Nasconde la cella su questi breakpoint (il calcolo dei vuoti ne tiene conto). */
  hideOn?: Array<'lg' | 'md' | 'sm'>;
}

export type Cell = CellBase & (
  | { type: 'svg'; svg: SvgName; fit?: 'contain' | 'bleed' }
  | { type: 'marquee'; svg: SvgName; /** secondi per un giro completo */ speed?: number; reverse?: boolean }
  | {
      type: 'text'; eyebrow?: string; title: string; body?: string; as?: 'h1' | 'h2' | 'p'; size?: 's' | 'm' | 'l';
      /** Il titolo è l'arrivo del titolo della cella con questo href (scivola dalla didascalia). */
      titleOf?: string;
    }
  | { type: 'list'; title: string; items: Array<string | { label: string; href: string }> }
  | { type: 'stat'; value: string; caption: string }
  | { type: 'media'; image?: ImageMetadata; video?: string; alt: string; caption?: string }
  | { type: 'project'; slug: string }
  | { type: 'clock' }
  | { type: 'cursor' }
  | { type: 'meter' }
  | { type: 'mark' }
  // solo archivio
  | { type: 'archive-head'; total: number }
  | { type: 'tags'; tags: Array<{ tag: string; slug: string; count: number }> }
);

export type CellType = Cell['type'];
