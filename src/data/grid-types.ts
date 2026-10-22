import type { ImageMetadata } from 'astro';
import type { SvgName } from './svgs';
import type { TagCount } from '../lib/tags';

/** Unità occupate da una cella: w = colonne, h = righe (unità piccola: la casella quadrata base è 2×2). */
export interface Span {
  w: number;
  h: number;
}

/** Colore di fondo della cella. */
export type Tone = 'paper' | 'red';

interface CellBase extends Span {
  /** Identificativo unico: usato per le transizioni e il debug. */
  id: string;
  /** Override opzionale su tablet (8 colonne). Default: w ridotto a max 8. */
  md?: Partial<Span>;
  /** Override opzionale su mobile (4 colonne). Default: w ridotto a max 4. */
  sm?: Partial<Span>;
  tone?: Tone;
  /** Se presente, la cella è cliccabile e si espande nella pagina di destinazione. */
  href?: string;
  /** Il link sostituisce la pagina corrente nella history invece di aggiungerne una (progetto
      precedente/successivo: sfogliando, la ✕ torna comunque alla griglia di partenza). */
  replace?: boolean;
  /** Linguetta in alto a sinistra: solo il numero della cella. `false` per nasconderla. */
  label?: false;
  /** `false` = cella senza filo (es. il logo a tutta cella). */
  frame?: false;
  /** La cella è l'arrivo dell'espansione della cella con questo href (es. '/archivio'). */
  heroOf?: string;
  /** Nasconde la cella su questi breakpoint (il calcolo dei vuoti ne tiene conto). */
  hideOn?: Array<'lg' | 'md' | 'sm'>;
}

export type Cell = CellBase & (
  /** ink: la cella è l'interruttore della luce, premuta scambia rosso e bianco del sito (scripts/ink.ts) */
  | { type: 'svg'; svg: SvgName; fit?: 'contain' | 'bleed'; ink?: boolean }
  /** ROBERTO scritto col font del logotipo, largo quanto la cella */
  | { type: 'logotipo' }
  | {
      type: 'marquee'; /** secondi per un giro completo */ speed?: number; reverse?: boolean;
      /** cosa scorre: un logo del registro, o un testo scritto col font del logotipo (uno dei due) */
      svg?: SvgName; text?: string;
      /** Scorre dall'alto in basso invece che da destra a sinistra */
      vertical?: boolean;
      /** Logo orizzontale girato di 90° in una cella verticale: si legge dal basso, scorre verso il basso */
      ruotato?: boolean;
    }
  | {
      type: 'text'; eyebrow?: string; title: string;
      /** Testo sotto il titolo: una stringa = paragrafo, un array = elenco di righe */
      body?: string | string[]; as?: 'h1' | 'h2' | 'p'; size?: 's' | 'm' | 'l';
      /** Il titolo è l'arrivo del titolo della cella con questo href (scivola dalla didascalia). */
      titleOf?: string;
    }
  | { type: 'list'; title: string; items: Array<string | { label: string; href: string }> }
  | { type: 'stat'; value: string; caption: string; /** il numero sale da 0 quando la cella entra in vista */ countUp?: boolean; /** h1 nascosto: la cella fa da hero di una pagina */ heading?: string }
  | { type: 'media'; image?: ImageMetadata; video?: string; alt: string; caption?: string }
  | { type: 'project'; slug: string }
  | { type: 'clock' }
  | { type: 'cursor' }
  | { type: 'meter' }
  | { type: 'mark' }
  | { type: 'eye' }
  /** globo orientato come la Terra adesso, trascinabile */
  | { type: 'globe' }
  /** pagina d'errore: codice grande con glitch, titolo (h1) e link all'indice, su carta a quadretti */
  | { type: 'error'; code: string; title: string }
  // solo archivio
  | { type: 'archive-head'; total: number }
  | { type: 'tags'; tags: TagCount[] }
);
