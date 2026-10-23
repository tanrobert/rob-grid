import type { Cell } from './grid-types';
import { projects, getProject } from './projects';
import { allTags } from '../lib/tags';
import { firstYear } from '../lib/projects';
import { pad2 } from '../lib/format';
import { extraCells } from './extra';

/*
 * ─────────────────────────────────────────────────────────────────────
 *  TAVOLO DELLA HOME
 * ─────────────────────────────────────────────────────────────────────
 *  Ogni oggetto è una cella appoggiata sul tavolo. Misure: w/h in unità
 *  (1 unità = 4 quadretti), o `q` in quadretti quando serve una misura
 *  diversa (i numeri del prototipo, tools/pages/tavolo.html).
 *
 *  L'ordine conta due volte: è l'ordine di lettura (tastiera, screen
 *  reader) e quello della disposizione. La prima cella sta al centro,
 *  le altre a spirale attorno, ognuna nel posto libero più vicino
 *  (lib/tavolo.ts, pack). Gli id restano fissi: le posizioni spostate
 *  durante la visita si ritrovano per id.
 *
 *  Le celle progetto prendono la misura da `shape` nell'index.md del progetto.
 *  Tipi disponibili → src/data/grid-types.ts
 * ─────────────────────────────────────────────────────────────────────
 */

// i 9 tag più usati, ognuno apre l'archivio già filtrato
const topTags = [...allTags].sort((a, b) => b.count - a.count).slice(0, 9)
  .map(t => ({ label: t.tag, href: `/archivio?tag=${t.slug}` }));

// cella progetto: la misura è la forma del progetto (uguale in archivio, ×2 nella hero)
function projectCell(id: string, slug: string): Cell {
  const shape = getProject(slug)?.shape;
  if (!shape) throw new Error(`[tavolo] il progetto "${slug}" non ha una forma (shape nel suo index.md)`);
  return { id, type: 'project', slug, ...shape };
}

export const tavolo: Cell[] = [
  // al centro: la R è l'interruttore Inverti, premuta scambia rosso e bianco del sito
  { id: 'logo',     type: 'svg',      w: 2, h: 2, svg: 'logo-r', fit: 'bleed', label: false, frame: false, ink: true },
  // primo easter egg: sotto la R, dietro la sua asta, il marchio di Woberto (la R girata, nera). Si scopre
  // spostando la R; premuto cambia la tinta del sito (scripts/ink.ts)
  {
    id: 'woberto', type: 'svg', w: 1, h: 1, q: { w: 2, h: 2 }, svg: 'logo-r', fit: 'bleed', label: false, frame: false,
    tinta: true, sotto: { id: 'logo', x: 1, y: 1 },
  },
  { id: 'nome',     type: 'logotipo', w: 5, h: 1, q: { w: 20, h: 4 } },
  {
    id: 'intro', type: 'text', w: 4, h: 3, q: { w: 16, h: 10 }, as: 'h1', size: 'l',
    eyebrow: `Graphic designer · dal ${firstYear}`,
    title: 'Progetto identità visive e punti di contatto fisici e digitali.',
  },
  // progetti sul tavolo: Kiale, quello su cui si lavora, ed Eurofish col video del mare (il caso più pesante,
  // tenuto apposta per misurare il tavolo). Gli altri sono in archivio
  projectCell('kiale', 'kiale'),
  projectCell('eurofish', 'eurofish'),
  { id: 'archivio', type: 'stat',     w: 2, h: 2, href: '/archivio', value: pad2(projects.length), caption: 'Progetti in archivio', countUp: true },
  { id: 'info',     type: 'text',     w: 2, h: 2, tone: 'red', href: '/info', title: 'Bio', as: 'p', size: 'm', eyebrow: 'Chi sono' },
  { id: 'tag',      type: 'list',     w: 4, h: 2, title: 'Tag', items: topTags },
  {
    id: 'metodo', type: 'text', w: 4, h: 2, size: 's',
    title: 'Essenziale, accessibile, chiara.',
    body: ['Grafica essenziale e funzionale.', 'Design accessibile e immediato.', 'Comunicazione chiara ed efficace.'],
  },
  { id: 'extra',    type: 'stat',     w: 2, h: 2, href: '/extra', value: pad2(extraCells.length), caption: 'Celle extra', countUp: true },
  {
    id: 'contatti', type: 'text', w: 3, h: 2, q: { w: 12, h: 8 }, size: 'm', href: '/info',
    eyebrow: 'Nuovi progetti', title: 'Scrivimi_',
  },
  // il nastro "Roberto · progettazione visiva" girato in verticale, col font del logotipo. speed = secondi per giro:
  // il testo è lungo ~31 maiuscole, 155s = stessa velocità del vecchio logo (22,5 in 112s)
  { id: 'nastro',   type: 'marquee',  w: 1, h: 6, text: 'Roberto · progettazione visiva ·', speed: 155, ruotato: true },
  // il footer di oggi, come cella: email, luogo, P.IVA, versione
  { id: 'recapiti', type: 'contatti', w: 4, h: 2, tone: 'red' },
];
