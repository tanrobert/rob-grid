import type { ImageMetadata } from 'astro';

export interface Project {
  slug: string;
  title: string;
  /** Tag unici (temporanei, da definire): alimentano i filtri dell'archivio */
  tags: string[];
  period: string;
  description: string;
  featured?: boolean;
  image?: ImageMetadata;
  /** Video in loop (percorso in /public), mostrato al posto di `image`, che gli fa da poster */
  video?: string;
}
