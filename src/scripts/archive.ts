/**
 * Filtri dell'archivio: un tag alla volta, stato nell'URL (?tag=…).
 * I progetti che non corrispondono vengono nascosti, la griglia si ricompone
 * con una View Transition (ogni casella scivola al suo nuovo posto). Nel foglio i buchi
 * lasciano vedere il retino; in una griglia con i vuoti (Grid.astro) si ricalcolano qui.
 */
import { BREAKPOINTS, COLS, findVoids } from '../lib/grid';
import { pad2 } from '../lib/format';
import { fillSheet } from './fill';

type Bp = keyof typeof COLS;

// stesse soglie delle media query di global.css
const MQ = {
  sm: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  md: `(max-width: ${BREAKPOINTS.lg - 1}px)`,
};

const breakpoint = (): Bp =>
  matchMedia(MQ.sm).matches ? 'sm' : matchMedia(MQ.md).matches ? 'md' : 'lg';

/** Stesso calcolo del build, sulle caselle visibili adesso */
function layoutVoids(grid: HTMLElement) {
  // nel foglio sopra il tavolo i buchi lasciano vedere il retino: niente vuoti
  if (grid.hasAttribute('data-senza-vuoti')) return;
  grid.querySelectorAll(':scope > .void:not(.void--fill)').forEach(v => v.remove());
  const bp = breakpoint();
  const suffix = bp === 'lg' ? '' : `-${bp}`;
  const spans = [...grid.querySelectorAll<HTMLElement>(':scope > .cell')]
    .filter(c => !c.hidden && !c.classList.contains(`hide-${bp}`))
    .map(c => ({
      w: Number(c.style.getPropertyValue(`--w${suffix}`)),
      h: Number(c.style.getPropertyValue(`--h${suffix}`)),
    }));
  for (const v of findVoids(spans, COLS[bp])) {
    const el = document.createElement('div');
    el.className = 'void void--live';
    el.setAttribute('aria-hidden', 'true');
    el.style.gridArea = `${v.row} / ${v.col} / span ${v.h} / span ${v.w}`;
    grid.append(el);
  }
  fillSheet();  // la griglia ha cambiato altezza
}

export function initArchive(signal: AbortSignal) {
  const grid = document.querySelector<HTMLElement>('.grid[data-filterable]');
  if (!grid) return;

  const cells = [...grid.querySelectorAll<HTMLElement>('.cell[data-tags]')];
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('button[data-tag]')];
  const count = document.querySelector('[data-count]');
  const noun = document.querySelector('[data-count-noun]');
  const current = document.querySelector('[data-current]');
  const known = new Set(buttons.map(b => b.dataset.tag).filter(Boolean));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = '';
  // ultima transizione partita: con due click rapidi la prima, saltata, non deve togliere i nomi della seconda
  let latest: ViewTransition | undefined;

  const render = (tag: string) => {
    let n = 0;
    for (const cell of cells) {
      const on = !tag || cell.dataset.tags!.split(' ').includes(tag);
      cell.hidden = !on;
      if (on) n++;
    }
    layoutVoids(grid);
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.tag === tag));
    if (count) count.textContent = pad2(n);
    if (noun) noun.textContent = n === 1 ? 'Progetto' : 'Progetti';
    if (current) current.textContent = tag ? buttons.find(b => b.dataset.tag === tag)?.dataset.label ?? tag : 'tutti';
  };

  const apply = (tag: string) => {
    if (tag === active) return;
    active = tag;
    // l'intro non deve ripartire sulle caselle che ricompaiono
    document.documentElement.classList.remove('is-intro');

    const url = new URL(location.href);
    if (tag) url.searchParams.set('tag', tag);
    else url.searchParams.delete('tag');
    history.replaceState(history.state, '', url);

    if (reduced || !document.startViewTransition) return render(tag);

    // un nome per casella: il browser anima lo spostamento di ognuna
    const html = document.documentElement;
    cells.forEach(c => {
      c.style.setProperty('view-transition-name', `tile-${c.dataset.id}`);
      c.style.setProperty('view-transition-class', 'tile');
    });
    html.classList.add('vt-filter');
    const vt = latest = document.startViewTransition(() => render(tag));
    vt.finished.finally(() => {
      if (vt !== latest) return;
      html.classList.remove('vt-filter');
      cells.forEach(c => {
        c.style.removeProperty('view-transition-name');
        c.style.removeProperty('view-transition-class');
      });
    });
  };

  // stato iniziale (da URL), senza animazione
  const initial = new URLSearchParams(location.search).get('tag') ?? '';
  active = known.has(initial) ? initial : '';
  render(active);
  // striscia dei tag su mobile: il tag dell'URL può stare fuori a destra, lo si porta al centro.
  // scrollLeft e non scrollIntoView, che farebbe scorrere anche la pagina
  const bar = document.querySelector<HTMLElement>('.tagbar');
  const pressed = bar?.querySelector<HTMLElement>('[aria-pressed="true"]');
  if (bar && pressed) bar.scrollLeft = pressed.offsetLeft - (bar.clientWidth - pressed.offsetWidth) / 2;

  document.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-tag]');
    if (!b) return;
    const tag = b.dataset.tag ?? '';
    // ricliccare il tag attivo lo azzera
    apply(tag && tag === active ? '' : tag);
  }, { signal });

  // cambio di breakpoint: colonne diverse, vuoti diversi
  for (const q of Object.values(MQ)) {
    matchMedia(q).addEventListener('change', () => layoutVoids(grid), { signal });
  }
}
