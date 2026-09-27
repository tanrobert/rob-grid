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
  /** Path to a looping background video (in /public), shown instead of `image` on the fullscreen cover */
  video?: string;
}
