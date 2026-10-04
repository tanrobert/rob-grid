import type { Cell } from './grid-types';
import { projects, getProject } from './projects';
import { allTags } from '../lib/tags';
import { firstYear } from '../lib/projects';
import { pad2 } from '../lib/format';
import { scaleShape } from '../lib/grid';
import { extraCells } from './extra';

/*
 * ─────────────────────────────────────────────────────────────────────
 *  GRIGLIA HOME
 * ─────────────────────────────────────────────────────────────────────
 *  Ogni oggetto è una cella. Modifica w/h per cambiarne le unità:
 *    w = colonne occupate, h = righe occupate. Unità piccola: la casella
 *    quadrata base è 2×2; le misure dispari danno le forme intermedie (es. 4×3).
 *
 *  Colonne: 12 desktop · 8 tablet · 4 mobile.
 *  Su tablet/mobile w viene ridotto automaticamente al massimo disponibile;
 *  per un comportamento diverso usa `md: { w, h }` o `sm: { w, h }`.
 *
 *  L'ordine conta: la griglia riempie da sinistra a destra, dall'alto
 *  in basso, e tappa i buchi con le celle successive che ci stanno.
 *
 *  Le celle progetto prendono la misura da `shape` in projects.ts.
 *  Tipi disponibili → src/data/grid-types.ts
 * ─────────────────────────────────────────────────────────────────────
 */

// i 9 tag più usati, ognuno apre l'archivio già filtrato
const topTags = [...allTags].sort((a, b) => b.count - a.count).slice(0, 9)
  .map(t => ({ label: t.tag, href: `/archivio?tag=${t.slug}` }));

// cella progetto: la misura è la forma del progetto (projects.ts), uguale in archivio e ×2 nella hero
function projectCell(id: string, slug: string, label?: string): Cell {
  const shape = getProject(slug)?.shape;
  if (!shape) throw new Error(`[grid] il progetto "${slug}" non ha una forma (shape in projects.ts)`);
  return { id, type: 'project', slug, label, ...scaleShape(shape, 1) };
}

export const grid: Cell[] = [
  // ── riga 1 ────────────────────────────────────────────
  { id: 'logo',    type: 'svg',     w: 2, h: 2, svg: 'logo-r', label: false },
  { id: 'nome',    type: 'marquee', w: 6, h: 2, svg: 'roberto', speed: 40, md: { w: 6 } },
  { id: 'extra',   type: 'stat',    w: 2, h: 2, href: '/extra', value: pad2(extraCells.length), caption: 'Celle extra' },
  { id: 'archivio', type: 'stat',   w: 2, h: 2, href: '/archivio', value: pad2(projects.length), caption: 'Progetti in archivio', countUp: true },

  // ── righe 2–3 ─────────────────────────────────────────
  {
    id: 'intro', type: 'text', w: 4, h: 2, as: 'h1', size: 'l',
    eyebrow: `Graphic designer — dal ${firstYear}`,
    title: 'Progetto identità visive e punti di contatto fisici e digitali.',
  },
  projectCell('eurofish', 'eurofish'),
  { id: 'info',     type: 'text',    w: 2, h: 2, tone: 'red', href: '/info', title: 'Info', as: 'p', size: 'm', eyebrow: 'Chi sono' },

  // ── righe 4–5 ─────────────────────────────────────────
  projectCell('kiale', 'kiale'),
  projectCell('purple', 'purple-piper', 'Purple Piper'),
  { id: 'tag',     type: 'list',    w: 4, h: 2, title: 'Tag', items: topTags },
  {
    id: 'metodo', type: 'text', w: 4, h: 2, size: 's',
    title: 'Essenziale, accessibile, chiara.',
    body: ['Grafica essenziale e funzionale.', 'Design accessibile e immediato.', 'Comunicazione chiara ed efficace.'],
  },

  // ── righe 6–7 ─────────────────────────────────────────
  { id: 'marchio', type: 'marquee', w: 2, h: 4, svg: 'logo-completo-verticale', speed: 9, vertical: true },
  projectCell('giardini', 'giardini-dell-eden'),
  projectCell('gea', 'gea', 'G&A'),
  {
    id: 'contatti', type: 'text', w: 4, h: 2, size: 'm', href: '/info',
    eyebrow: 'Nuovi progetti', title: 'Scrivimi_',
  },
];
