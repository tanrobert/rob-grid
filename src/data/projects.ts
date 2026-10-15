import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import type { Project } from './types';
import dummyImg from '../assets/dummy.png';
import dummyGrey from '../assets/grigio/dummy.webp';

/*
 * I progetti stanno in src/content/progetti/<slug>/ (schema in src/content.config.ts).
 * Qui diventano `Project`, la forma che usa il resto del sito.
 */

// copertina e versione in grigio, per convenzione nella cartella del progetto
type Img = { default: ImageMetadata };
const byFolder = (files: Record<string, Img>) =>
  new Map(Object.entries(files).map(([p, m]) => [p.split('/').at(-2)!, m.default]));
const covers = byFolder(import.meta.glob<Img>('../content/progetti/*/copertina.{png,jpg,jpeg,webp}', { eager: true }));
const greys = byFolder(import.meta.glob<Img>('../content/progetti/*/copertina.grigio.webp', { eager: true }));

/** Tavola Photoshop: 600 px per unità della forma */
const UNIT_PX = 600;

export const projects: Project[] = (await getCollection('progetti')).map(({ id: slug, data }) => {
  const image = covers.get(slug);
  const { shape } = data;
  // avviso, non errore: diverse copertine sono ancora da rifare sul modulo
  if (image && shape && (image.width !== shape.w * UNIT_PX || image.height !== shape.h * UNIT_PX)) {
    console.warn(`[progetti] ${slug}: copertina ${image.width}×${image.height}, la forma ${shape.w}×${shape.h} vuole ${shape.w * UNIT_PX}×${shape.h * UNIT_PX}`);
  }
  return {
    ...data,
    slug,
    image: image ?? dummyImg,
    grey: image ? greys.get(slug) : dummyGrey,
    cells: data.cells?.map((c, i) => ({ ...c, id: c.id ?? `c${i + 1}` })),
  };
});

export function getProject(slug: string): Project | undefined {
  return projects.find(p => p.slug === slug);
}
