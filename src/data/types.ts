import type { ImageMetadata } from 'astro';
import type { Cell, Span } from './grid-types';

export interface Project {
  slug: string;
  title: string;
  /** Tag unici (temporanei, da definire): alimentano i filtri dell'archivio */
  tags: string[];
  period: string;
  description: string;
  featured?: boolean;
  /** Chi ha fatto il marchio: se non è mio, la pagina del progetto lo dice e il progetto non ha il tag Logo */
  marchio?: 'mio' | 'cliente' | { di: string };
  /** Forma dell'immagine in unità (desktop): cella in home e archivio, ×2 nella hero.
      Tavola Photoshop: w×600 × h×600 px, margini 300 sopra/sotto e 200 ai lati. */
  shape?: Span;
  image?: ImageMetadata;
  /** Video in loop (percorso in /public), mostrato al posto di `image`, che gli fa da poster */
  video?: string;
  /** Celle proprie della pagina progetto (cells in index.md), tra le celle fisse e precedente/successivo */
  cells?: Cell[];
}
