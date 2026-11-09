import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Project } from './types';
import dummyImg from '../assets/dummy.png';
import { COLS, QF_MAX_PROGETTI } from '../lib/grid';

/*
 * I progetti stanno in src/content/progetti/<slug>/ (schema in src/content.config.ts).
 * Qui diventano `Project`, la forma che usa il resto del sito.
 */

// copertina, per convenzione nella cartella del progetto
type Img = { default: ImageMetadata };
const byFolder = (files: Record<string, Img>) =>
  new Map(Object.entries(files).map(([p, m]) => [p.split('/').at(-2)!, m.default]));
const covers = byFolder(import.meta.glob<Img>('../content/progetti/*/copertina.{png,jpg,jpeg,webp}', { eager: true }));
// SVG delle celle costruzione, evoluzione, ridisegno, animato e versioni, così come sono (per cartella e nome: "purple-piper/costruzione-p.svg")
const disegni = new Map(Object.entries(import.meta.glob<string>('../content/progetti/*/{costruzione,evoluzione,ridisegno,animato,versione}-*.svg', { query: '?raw', import: 'default', eager: true }))
  .map(([p, svg]) => [p.split('/').slice(-2).join('/'), svg]));

/** Larghezza in px che serve alla copertina per essere nitida nella hero della pagina progetto, la misura più grande
    in cui si vede: la forma ×2 (al massimo le colonne del computer), 4w−1 quadretti col quadretto più grande, su
    schermo 2×. L'altezza no: la cella prende la proporzione della copertina (6/11/2026) */
const larghezzaHero = (w: number) => (4 * Math.min(w * 2, COLS.lg) - 1) * QF_MAX_PROGETTI * 2;

/** Proporzione (larghezza / altezza) di un video in public/: dal poster .webp accanto, se c'è, se no dal box `tkhd`
    dell'.mp4 (la traccia video ha larghezza e altezza, in 16.16, negli ultimi 8 byte del box), così niente ffprobe */
async function proporzioneVideo(video: string): Promise<number | undefined> {
  const file = path.join(process.cwd(), 'public', video);
  const poster = file.replace(/\.mp4$/, '.webp');
  if (fs.existsSync(poster)) {
    const { width, height } = await sharp(poster).metadata();
    if (width && height) return width / height;
  }
  const b = fs.readFileSync(file);
  for (let i = b.indexOf('tkhd'); i >= 0; i = b.indexOf('tkhd', i + 4)) {
    const fine = i + 4 + (b[i + 4] === 1 ? 96 : 84);
    if (fine > b.length) break;
    const w = b.readUInt32BE(fine - 8) / 65536, h = b.readUInt32BE(fine - 4) / 65536;
    if (w > 0 && h > 0) return w / h;
  }
  console.warn(`[progetti] ${video}: misura del video non trovata, sul tavolo vale la copertina`);
}

export const projects: Project[] = await Promise.all((await getCollection('progetti')).map(async ({ id: slug, data }) => {
  const image = covers.get(slug);
  const { shape } = data;
  // avviso, non errore: copertina troppo stretta per la hero (col video si vede il video, che ha la sua misura)
  if (image && shape && !data.video && image.width < larghezzaHero(shape.w)) {
    console.warn(`[progetti] ${slug}: copertina larga ${image.width}px, nella hero ne servono ${larghezzaHero(shape.w)} (forma larga ${shape.w})`);
  }
  // marchio e tag Logo devono dire la stessa cosa
  const { marchio, tags } = data;
  if (marchio && (marchio === 'mio') !== tags.includes('Logo')) {
    console.warn(`[progetti] ${slug}: marchio ${marchio === 'mio' ? 'mio senza' : 'non mio con'} il tag Logo`);
  }
  // quello che si vede nella cella del tavolo: il video, se no la copertina (la segnaposto no: resta la forma)
  const proporzione = (data.video && await proporzioneVideo(data.video)) || (image && image.width / image.height) || undefined;
  return {
    ...data,
    slug,
    image: image ?? dummyImg,
    proporzione,
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
      if (c.type !== 'costruzione' && c.type !== 'evoluzione' && c.type !== 'ridisegno' && c.type !== 'animato') return { ...c, id };
      // costruzione: uno o più disegni affiancati
      if (c.type === 'costruzione') return { ...c, id, svg: [c.disegno].flat().map(leggi) };
      return { ...c, id, svg: leggi(c.disegno) };
    }),
  };
}));

export function getProject(slug: string): Project | undefined {
  return projects.find(p => p.slug === slug);
}
