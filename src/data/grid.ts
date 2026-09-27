import type { Cell } from './grid-types';
import { projects } from './projects';
import { allTags } from '../lib/tags';

/*
 * ─────────────────────────────────────────────────────────────────────
 *  GRIGLIA HOME
 * ─────────────────────────────────────────────────────────────────────
 *  Ogni oggetto è una cella. Modifica w/h per cambiarne le unità:
 *    w = colonne occupate, h = righe occupate (1 unità = 1 quadrato).
 *
 *  Colonne: 6 desktop · 4 tablet · 2 mobile.
 *  Su tablet/mobile w viene ridotto automaticamente al massimo disponibile;
 *  per un comportamento diverso usa `md: { w, h }` o `sm: { w, h }`.
 *
 *  L'ordine conta: la griglia riempie da sinistra a destra, dall'alto
 *  in basso, e tappa i buchi con le celle successive che ci stanno.
 *
 *  Tipi disponibili → src/data/grid-types.ts
 * ─────────────────────────────────────────────────────────────────────
 */

// i 9 tag più usati, ognuno apre l'archivio già filtrato
const topTags = [...allTags].sort((a, b) => b.count - a.count).slice(0, 9)
  .map(t => ({ label: t.tag, href: `/archivio?tag=${t.slug}` }));
const firstYear = Math.min(...projects.map(p => Number(p.period.match(/\d{4}/)?.[0] ?? 9999)));

export const grid: Cell[] = [
  // ── riga 1 ────────────────────────────────────────────
  { id: 'logo',    type: 'svg',     w: 1, h: 1, svg: 'logo-r', label: false },
  { id: 'nome',    type: 'marquee', w: 3, h: 1, svg: 'roberto', speed: 40, md: { w: 3 } },
  { id: 'ora',     type: 'clock',   w: 1, h: 1 },
  { id: 'misure',  type: 'meter',   w: 1, h: 1 },

  // ── righe 2–3 ─────────────────────────────────────────
  {
    id: 'intro', type: 'text', w: 2, h: 2, as: 'h1', size: 'l',
    eyebrow: `Graphic designer — dal ${firstYear}`,
    title: 'Identità visive, packaging e siti web per attività che vogliono farsi ricordare.',
  },
  { id: 'eurofish', type: 'project', w: 3, h: 2, slug: 'eurofish', sm: { h: 1 } },
  { id: 'info',     type: 'text',    w: 1, h: 1, tone: 'red', href: '/info', title: 'Info', as: 'p', size: 'm', eyebrow: 'Chi sono' },
  { id: 'cursore',  type: 'cursor',  w: 1, h: 1 },

  // ── righe 4–5 ─────────────────────────────────────────
  { id: 'kiale',   type: 'project', w: 2, h: 2, slug: 'kiale' },
  { id: 'purple',  type: 'project', w: 1, h: 2, slug: 'purple-piper' },
  { id: 'tag',     type: 'list',    w: 2, h: 1, title: 'Tag', items: topTags },
  { id: 'archivio', type: 'stat',   w: 1, h: 1, href: '/archivio', value: String(projects.length).padStart(2, '0'), caption: 'Progetti in archivio' },
  {
    id: 'metodo', type: 'text', w: 2, h: 1, size: 's',
    eyebrow: 'Metodo',
    title: 'Griglia, misura, ripetizione.',
    body: 'Ogni progetto parte da un sistema: poche regole, applicate con rigore.',
  },
  { id: 'registro', type: 'mark', w: 1, h: 1 },

  // ── righe 6–7 ─────────────────────────────────────────
  { id: 'marchio', type: 'svg',     w: 2, h: 2, svg: 'logo-completo' },
  { id: 'giardini', type: 'project', w: 2, h: 1, slug: 'giardini-dell-eden', sm: { h: 2 } },
  {
    id: 'contatti', type: 'text', w: 2, h: 1, size: 'm', href: '/info',
    eyebrow: 'Nuovi progetti', title: 'Scrivimi_',
  },
  { id: 'nome-2', type: 'marquee', w: 4, h: 1, svg: 'roberto', speed: 60, reverse: true, tone: 'red' },
];
