import type { Cell } from './grid-types';
import { projects, getProject } from './projects';
import { pad2 } from '../lib/format';
import { inProporzione } from '../lib/tavolo';
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

// cella progetto: sul tavolo, in quadretti, nella proporzione di quello che mostra (video o copertina) e grande più o
// meno quanto la sua forma (6/11/2026, scelta di Roberto: niente più moduli di 4 quadretti, la copertina si vede intera).
// Senza copertina vera la forma × 4. Archivio e hero restano sulla forma in unità
function projectCell(id: string, slug: string): Cell {
  const p = getProject(slug), shape = p?.shape;
  if (!shape) throw new Error(`[tavolo] il progetto "${slug}" non ha una forma (shape nel suo index.md)`);
  return { id, type: 'project', slug, ...shape, ...(p.proporzione && { q: inProporzione(shape, p.proporzione) }) };
}

export const tavolo: Cell[] = [
  // al centro: la R, rossa; premuta riordina il tavolo come il tasto della barra (1/11/2026)
  { id: 'logo',     type: 'svg',      w: 2, h: 2, svg: 'logo-r', fit: 'bleed', label: false, frame: false, riordina: true },
  // ROBERTO senza filo né fondo, sulla carta (31/10/2026): la cella è la parola, sollevata fa l'ombra delle lettere
  // (Tavolo.astro). Maiuscole (la R) alte 3 quadretti: la parola è larga 3 × 5,21 / 0,68 = 22,99 quadretti.
  // Agganciata sotto la R (8×8 quadretti), a un quadretto, a filo a sinistra: si apre col marchio intero.
  // Un clic apre la pagina del font, Rob Display (9/11/2026, idea di Roberto)
  { id: 'nome',     type: 'logotipo', w: 6, h: 1, q: { w: 23, h: 3 }, frame: false, presso: { id: 'logo', x: 0, y: 9 }, href: '/rob-display' },
  {
    id: 'intro', type: 'text', w: 5, h: 3, q: { w: 20, h: 10 }, as: 'h1', size: 'l',
    eyebrow: 'Graphic designer',
    title: 'Progetto identità visive e punti di contatto fisici e digitali.',
  },
  // progetti sul tavolo: Kiale, quello su cui si lavora, ed Eurofish col video del mare (il caso più pesante,
  // tenuto apposta per misurare il tavolo). Gli altri progetti del tavolo più in giù, gli altri ancora in archivio
  projectCell('kiale', 'kiale'),
  projectCell('eurofish', 'eurofish'),
  { id: 'archivio', type: 'stat',     w: 2, h: 2, href: '/archivio', value: pad2(projects.length), caption: 'Progetti in archivio', countUp: true },
  { id: 'info',     type: 'text',     w: 2, h: 2, tone: 'red', href: '/info', title: 'Bio', as: 'p', size: 'm', eyebrow: 'Chi sono' },
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
  // altri progetti (dal 25/10/2026; Luca Lebone dal 26/10): dopo le celle che portano in giro (archivio, Bio, extra),
  // così quelle restano attorno al marchio
  projectCell('purple', 'purple-piper'),
  // la radio Purple Piper (2/11/2026): nascosta finché il visitatore non la aggiunge (coda "Aggiungi il player alla home"
  // nel foglio di Purple Piper, dal 4/11/2026), allora compare attaccata sotto la cella del progetto (scelta di Roberto;
  // provata posata sopra il suo fondo); la ✕ la ferma e la toglie (un solo lettore, scripts/radio.ts)
  { id: 'radio', type: 'radio', w: 4, h: 2, q: { w: 16, h: 5 }, eyebrow: 'Radio live player', nascosta: { sotto: 'purple', y: 0 } },
  projectCell('gea', 'gea'),
  projectCell('torre', 'la-torre-rossa'),
  projectCell('cardogna', 'cardogna'),
  projectCell('luca', 'luca-lebone'),
  // il nastro "Roberto · progettazione visiva" girato in verticale, col font del logotipo. speed = secondi per giro:
  // il testo è lungo ~31 maiuscole, 155s = stessa velocità del vecchio logo (22,5 in 112s)
  { id: 'nastro',   type: 'marquee',  w: 1, h: 6, text: 'Roberto · progettazione visiva ·', speed: 155, ruotato: true },
  // il footer di oggi, come cella: email e luogo. P.IVA, informativa, anno e versione (27/10/2026) nella striscia
  // d'inchiostro in basso a sinistra (Tavolo.astro)
  { id: 'recapiti', type: 'contatti', w: 4, h: 2, tone: 'red', piede: false },
];
