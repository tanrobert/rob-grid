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
function projectCell(id: string, slug: string): Cell {
  const shape = getProject(slug)?.shape;
  if (!shape) throw new Error(`[grid] il progetto "${slug}" non ha una forma (shape in projects.ts)`);
  return { id, type: 'project', slug, ...scaleShape(shape, 1) };
}

export const grid: Cell[] = [
  // ── riga 1 ────────────────────────────────────────────
  // la R è l'interruttore della luce: premuta, rosso e bianco del sito si scambiano
  { id: 'logo',    type: 'svg',     w: 1, h: 1, svg: 'logo-r', fit: 'bleed', label: false, frame: false, ink: true },
  { id: 'nome',    type: 'svg',     w: 4, h: 1, sm: { w: 3 }, svg: 'roberto' },
  { id: 'archivio', type: 'stat',   w: 2, h: 2, href: '/archivio', value: pad2(projects.length), caption: 'Progetti in archivio', countUp: true },

  // ── righe 2–3 ─────────────────────────────────────────
  {
    id: 'intro', type: 'text', w: 5, h: 2, md: { w: 4, h: 2 }, as: 'h1', size: 'l',
    eyebrow: `Graphic designer — dal ${firstYear}`,
    title: 'Progetto identità visive e punti di contatto fisici e digitali.',
  },
  // per ora l'unico progetto in home: è quello su cui si lavora. Gli altri sono in archivio
  projectCell('kiale', 'kiale'),
  // il nastro "Roberto · grafica, web" girato in verticale. speed = secondi per giro: il logo lungo è
  // ~2,8 volte il "roberto", 112s = stessa velocità dei 40s di prima
  { id: 'nastro',  type: 'marquee', w: 1, h: 6, svg: 'logo-completo-orizzontale-lungo', speed: 112, ruotato: true },
  { id: 'info',     type: 'text',    w: 2, h: 2, tone: 'red', href: '/info', title: 'Bio', as: 'p', size: 'm', eyebrow: 'Chi sono' },

  // ── righe 4–5 ─────────────────────────────────────────
  { id: 'tag',     type: 'list',    w: 4, h: 2, title: 'Tag', items: topTags },
  {
    id: 'metodo', type: 'text', w: 4, h: 2, size: 's',
    title: 'Essenziale, accessibile, chiara.',
    body: ['Grafica essenziale e funzionale.', 'Design accessibile e immediato.', 'Comunicazione chiara ed efficace.'],
  },

  // ── righe 6–7 ─────────────────────────────────────────
  { id: 'extra',   type: 'stat',    w: 2, h: 2, href: '/extra', value: pad2(extraCells.length), caption: 'Celle extra', countUp: true },
  {
    id: 'contatti', type: 'text', w: 4, h: 2, size: 'm', href: '/info',
    eyebrow: 'Nuovi progetti', title: 'Scrivimi_',
  },
];
