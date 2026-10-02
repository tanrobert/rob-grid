import type { Cell } from './grid-types';
import { projects } from './projects';
import { allTags } from '../lib/tags';
import { firstYear } from '../lib/projects';
import { pad2 } from '../lib/format';

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

export const grid: Cell[] = [
  // ── riga 1 ────────────────────────────────────────────
  { id: 'logo',    type: 'svg',     w: 1, h: 1, svg: 'logo-r', label: false },
  { id: 'nome',    type: 'marquee', w: 3, h: 1, svg: 'roberto', speed: 40, md: { w: 3 } },
  { id: 'ora',     type: 'clock',   w: 1, h: 1 },
  { id: 'misure',  type: 'meter',   w: 1, h: 1 },

  // ── righe 2–3 ─────────────────────────────────────────
  {
    id: 'intro', type: 'text', w: 2, h: 1, as: 'h1', size: 'l',
    eyebrow: `Graphic designer — dal ${firstYear}`,
    title: 'Progetto identità visive e punti di contatto fisici e digitali.',
  },
  { id: 'eurofish', type: 'project', w: 3, h: 2, slug: 'eurofish', sm: { h: 1 } },
  { id: 'info',     type: 'text',    w: 1, h: 1, tone: 'red', href: '/info', title: 'Info', as: 'p', size: 'm', eyebrow: 'Chi sono' },
  { id: 'cursore',  type: 'cursor',  w: 1, h: 1 },

  // ── righe 4–5 ─────────────────────────────────────────
  { id: 'kiale',   type: 'project', w: 2, h: 2, slug: 'kiale' },
  { id: 'purple',  type: 'project', w: 2, h: 1, slug: 'purple-piper', label: 'Purple Piper' },
  { id: 'tag',     type: 'list',    w: 2, h: 1, title: 'Tag', items: topTags },
  { id: 'archivio', type: 'stat',   w: 1, h: 1, href: '/archivio', value: pad2(projects.length), caption: 'Progetti in archivio', countUp: true },
  {
    id: 'metodo', type: 'text', w: 2, h: 1, size: 's',
    title: 'Essenziale, accessibile, chiara.',
    body: ['Grafica essenziale e funzionale.', 'Design accessibile e immediato.', 'Comunicazione chiara ed efficace.'],
  },
  { id: 'registro', type: 'mark', w: 1, h: 1 },
  { id: 'occhio',   type: 'eye',  w: 1, h: 1 },

  // ── righe 6–7 ─────────────────────────────────────────
  { id: 'marchio', type: 'marquee', w: 1, h: 2, svg: 'logo-completo-verticale', speed: 9, vertical: true },
  { id: 'giardini', type: 'project', w: 2, h: 1, slug: 'giardini-dell-eden', sm: { h: 2 } },
  {
    id: 'contatti', type: 'text', w: 2, h: 1, size: 'm', href: '/info',
    eyebrow: 'Nuovi progetti', title: 'Scrivimi_',
  },
];
