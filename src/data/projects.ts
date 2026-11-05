import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import type { Project } from './types';
import dummyImg from '../assets/dummy.png';

/*
 * I progetti stanno in src/content/progetti/<slug>/ (schema in src/content.config.ts).
 * Qui diventano `Project`, la forma che usa il resto del sito.
 */

// copertina, per convenzione nella cartella del progetto
type Img = { default: ImageMetadata };
const byFolder = (files: Record<string, Img>) =>
  new Map(Object.entries(files).map(([p, m]) => [p.split('/').at(-2)!, m.default]));
const covers = byFolder(import.meta.glob<Img>('../content/progetti/*/copertina.{png,jpg,jpeg,webp}', { eager: true }));
// SVG delle celle costruzione, evoluzione e versioni, così come sono (per cartella e nome: "purple-piper/costruzione-p.svg")
const disegni = new Map(Object.entries(import.meta.glob<string>('../content/progetti/*/{costruzione,evoluzione,versione}-*.svg', { query: '?raw', import: 'default', eager: true }))
  .map(([p, svg]) => [p.split('/').slice(-2).join('/'), svg]));

/** Tavola Photoshop: 600 px per unità della forma */
const UNIT_PX = 600;

export const projects: Project[] = (await getCollection('progetti')).map(({ id: slug, data }) => {
  const image = covers.get(slug);
  const { shape } = data;
  // avviso, non errore: diverse copertine sono ancora da rifare sul modulo
  if (image && shape && (image.width !== shape.w * UNIT_PX || image.height !== shape.h * UNIT_PX)) {
    console.warn(`[progetti] ${slug}: copertina ${image.width}×${image.height}, la forma ${shape.w}×${shape.h} vuole ${shape.w * UNIT_PX}×${shape.h * UNIT_PX}`);
  }
  // marchio e tag Logo devono dire la stessa cosa
  const { marchio, tags } = data;
  if (marchio && (marchio === 'mio') !== tags.includes('Logo')) {
    console.warn(`[progetti] ${slug}: marchio ${marchio === 'mio' ? 'mio senza' : 'non mio con'} il tag Logo`);
  }
  return {
    ...data,
    slug,
    image: image ?? dummyImg,
    cells: data.cells?.map((c, i) => {
      const id = c.id ?? `c${i + 1}`;
      const leggi = (d: string) => {
        const file = `${slug}/${d.slice(2)}`, svg = disegni.get(file);
        if (!svg) throw new Error(`[progetti] ${slug} · ${id}: manca ${file}`);
        return svg;
      };
      if (c.type === 'versioni') {
        return { ...c, id, versioni: c.versioni.map(v => ({ title: v.title, nome: `${slug} · ${id} · ${v.logo}`, svg: leggi(v.logo) })) };
      }
      if (c.type !== 'costruzione' && c.type !== 'evoluzione') return { ...c, id };
      // costruzione: uno o più disegni affiancati
      if (c.type === 'costruzione') return { ...c, id, svg: [c.disegno].flat().map(leggi) };
      return { ...c, id, svg: leggi(c.disegno) };
    }),
  };
});

export function getProject(slug: string): Project | undefined {
  return projects.find(p => p.slug === slug);
}
