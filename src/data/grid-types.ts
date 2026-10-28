import type { ImageMetadata } from 'astro';
import type { SvgName } from './svgs';
import type { TagCount } from '../lib/tags';

/** Unità occupate da una cella: w = colonne, h = righe (unità piccola: la casella quadrata base è 2×2). */
export interface Span {
  w: number;
  h: number;
}

/** Mockup dei barattoli (tools/barattolo-mockup.py → public/barattolo/<nome>/) */
export type Mockup = 'vaso-basso' | 'vaso-alto';
/** Un barattolo della cella `barattolo`: etichetta piatta e interno segnaposto (colori chiari: si moltiplicano sul vetro) */
export interface Barattolo {
  nome: string;
  /** vaso-basso per le etichette 14×6, vaso-alto per le 14×9 */
  mockup: Mockup;
  /** larga 14 cm: l'altezza vera viene dalle proporzioni del file, e dà la scala comune tra i vasi */
  etichetta: ImageMetadata;
  /** bordo vettoriale dell'etichetta (SVG da Illustrator, un colore + bianco): decorazione sul lato destro della cella */
  bordo?: ImageMetadata;
  /** la parola della linea (Confetture, Sughi…: SVG a tinta unica, vettorializzato), in basso a sinistra col colore del bordo */
  parola?: ImageMetadata;
  /** pezzi = frutta o legumi nella confettura o nel sugo · crema = vellutata, sugo liscio · filetti = sott'olio */
  tipo: 'pezzi' | 'crema' | 'filetti';
  dentro: string;
  pezzi?: string;
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
  /** Nasconde la cella su questi breakpoint. */
  hideOn?: Array<'lg' | 'md' | 'sm'>;
  /** Misura sul tavolo della home, in quadretti, quando non è w×h unità × 4 (lib/tavolo.ts) */
  q?: Span;
  /** Solo sul tavolo: nascosta sotto la cella `id`, spostata di x, y quadretti dal suo angolo in alto a sinistra.
      Fuori dalla spirale, sotto tutte le altre, invisibile nell'intro: si scopre spostando chi la copre */
  sotto?: Sotto;
}

export interface Sotto { id: string; x: number; y: number }

export type Cell = CellBase & (
  /** ink: la cella è l'interruttore Inverti, premuta scambia rosso e bianco del sito (scripts/ink.ts).
      tinta: Woberto, il marchio nero nascosto sotto la R: il primo clic porta il nero, i successivi invertono */
  | { type: 'svg'; svg: SvgName; fit?: 'contain' | 'bleed'; ink?: boolean; tinta?: boolean }
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
  /** barattoli col mockup vero (public/barattolo/<mockup>) e l'etichetta piatta avvolta, da girare e sfogliare; testo in alto a sinistra */
  | { type: 'barattolo'; barattoli: Barattolo[]; eyebrow?: string; title?: string; body?: string | string[] }
  /** mano col telefono (public/telefono) e una registrazione dello schermo che scorre dentro (mp4 in public, .webm e poster .webp accanto); testo sopra.
   *  `logo`: SVG del cliente (testo in tracciati) in basso a sinistra, sopra la mano, con la sua descrizione `logoAlt` */
  | { type: 'telefono'; video: string; alt: string; eyebrow?: string; title?: string; body?: string | string[]; logo?: ImageMetadata; logoAlt?: string }
  /** pagina d'errore: codice grande con glitch, titolo (h1) e link all'indice, su carta a quadretti */
  | { type: 'error'; code: string; title: string }
  /** recapiti (email, luogo, P.IVA, versione): cella del tavolo e dei fogli */
  | { type: 'contatti'; /** `false` = senza le scritte in basso (sul tavolo stanno nel box in basso a sinistra) */ piede?: false }
  // solo archivio
  | { type: 'archive-head'; total: number }
  | { type: 'tags'; tags: TagCount[] }
);
