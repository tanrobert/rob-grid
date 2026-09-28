/**
 * Espansione cella → pagina (e ritorno) con le View Transitions.
 *
 * Il nome di transizione NON è scritto nell'HTML delle celle: più celle possono
 * puntare alla stessa pagina e i nomi duplicati annullerebbero la transizione.
 * Lo assegniamo solo alla cella cliccata; al ritorno lo rimettiamo sulla stessa
 * cella nel documento in arrivo, così la pagina si "richiude" da dove era partita.
 */
import { navigate } from 'astro:transitions/client';

const KEY = 'morph-origin';

function setName(el: HTMLElement, name: string, cls = 'morph') {
  el.style.setProperty('view-transition-name', name);
  el.style.setProperty('view-transition-class', cls);
}

/** La cella si espande (finestra) e il suo titolo scivola al titolo della pagina */
function nameCell(cell: HTMLElement, name: string, withTitle: boolean) {
  setName(cell, name);
  const title = cell.querySelector<HTMLElement>('[data-morph-title]');
  if (title && withTitle) setName(title, `title-${name}`, 'title');
}

/** Click sinistro senza modificatori: gli altri (nuova scheda, ecc.) restano al browser */
const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

function remember(id: string) {
  try { sessionStorage.setItem(KEY, id); } catch {}
}
function recall(): string | null {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

// Andata: la cella cliccata prende il nome dell'hero di destinazione
document.addEventListener('click', e => {
  if (e.defaultPrevented || !isPlainClick(e)) return;
  const cell = (e.target as Element).closest<HTMLElement>('a[data-morph]');
  if (!cell) return;
  document.querySelectorAll<HTMLElement>('[data-morph], [data-morph-title]').forEach(el => el.style.removeProperty('view-transition-name'));
  nameCell(cell, cell.dataset.morph!, true);
  remember(cell.dataset.id!);
}, { capture: true });

// Ritorno: l'hero corrente si richiude nella cella corrispondente del documento in arrivo
document.addEventListener('astro:before-swap', e => {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const name = hero.dataset.hero!;
  const id = recall();
  const target =
    (id && e.newDocument.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"][data-morph="${name}"]`)) ||
    e.newDocument.querySelector<HTMLElement>(`[data-morph="${name}"]`);
  // il titolo torna nella didascalia solo se questa pagina ha il titolo "d'arrivo"
  if (target) nameCell(target, name, !!document.querySelector(`[data-title-hero="title-${name}"]`));
});

// Chiusura (✕ o Esc): se siamo arrivati navigando nel sito torniamo indietro nella
// history, così la griglia ritrova lo scroll e la cella d'origine è dove l'avevamo lasciata.
let inSite = false;
document.addEventListener('astro:after-swap', () => { inSite = true; });

function close() {
  if (inSite) history.back();
  else navigate('/');
}

document.addEventListener('click', e => {
  const back = (e.target as Element).closest('a[data-close]');
  if (!back || !isPlainClick(e)) return;
  e.preventDefault();
  close();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.querySelector('[data-hero]')) close();
});
