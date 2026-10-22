/**
 * Filtri dell'archivio: un tag alla volta, stato nell'URL (?tag=…).
 * I progetti che non corrispondono escono sfumando, poi la griglia si ricompone con GSAP Flip: le celle
 * rimaste scivolano al nuovo posto (solo transform: fluido anche su Firefox per Android, dove le View
 * Transitions che cambiano misura scattano), quelle nuove entrano sfumando.
 * Un archivio per foglio: nella pila dei fogli (scripts/foglio) ce ne possono essere due, ognuno col suo filtro.
 * Nel foglio i buchi lasciano vedere il retino; in una griglia con i vuoti (Grid.astro) si ricalcolano qui.
 */
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
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
  document.querySelectorAll<HTMLElement>('.grid[data-filterable]').forEach(grid => initGrid(grid, signal));
}

gsap.registerPlugin(Flip);

function initGrid(grid: HTMLElement, signal: AbortSignal) {
  // tutto si cerca nel foglio dell'archivio, non nel documento
  const root = grid.closest('main') ?? document;
  const cells = [...grid.querySelectorAll<HTMLElement>('.cell[data-tags]')];
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button[data-tag]')];
  const count = root.querySelector('[data-count]');
  const noun = root.querySelector('[data-count-noun]');
  const current = root.querySelector('[data-current]');
  const known = new Set(buttons.map(b => b.dataset.tag).filter(Boolean));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = (s: number) => (reduced ? 0 : s);
  let active = '';
  // filtri chiesti finora: con due click rapidi il primo, se non ha ancora ricomposto la griglia, non lo fa più
  let giro = 0;

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
    active = grid.dataset.attivo = tag;
    // l'intro non deve ripartire sulle caselle che ricompaiono
    document.documentElement.classList.remove('is-intro');

    const url = new URL(location.href);
    if (tag) url.searchParams.set('tag', tag);
    else url.searchParams.delete('tag');
    history.replaceState(history.state, '', url);

    if (reduced) return render(tag);
    // il pulsante risponde subito, la griglia dopo l'uscita delle celle
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.tag === tag));
    // un filtro ancora in corso si ferma dov'è: conta l'ultimo click
    const mio = ++giro;
    gsap.killTweensOf(cells);
    gsap.set(cells, { clearProps: 'opacity,scale,transform' });
    // prima escono quelle che non c'entrano, poi le altre scivolano al nuovo posto e le nuove entrano
    const escono = cells.filter(c => !c.hidden && tag && !c.dataset.tags!.split(' ').includes(tag));
    const via = escono.length ? gsap.to(escono, { opacity: 0, scale: 0.96, duration: T(0.15), ease: 'power1.in' }) : null;
    gsap.delayedCall(via ? via.duration() : 0, () => {
      if (mio !== giro) return;
      const prima = Flip.getState(cells.filter(c => !c.hidden && !escono.includes(c)));
      const nascoste = new Set(cells.filter(c => c.hidden));
      render(tag);
      if (escono.length) gsap.set(escono, { clearProps: 'opacity,scale' });
      const entrano = cells.filter(c => !c.hidden && nascoste.has(c));
      const restano = cells.filter(c => !c.hidden && !entrano.includes(c));
      if (restano.length) Flip.from(prima, { targets: restano, duration: T(0.42), ease: 'power3.inOut' });
      if (entrano.length) {
        gsap.fromTo(entrano, { opacity: 0, scale: 0.96 }, {
          opacity: 1, scale: 1, duration: T(0.3), ease: 'power2.out', stagger: T(0.03), delay: T(0.12), clearProps: 'opacity,scale',
        });
      }
    });
  };

  // stato iniziale senza animazione: quello di prima se il foglio era già acceso (pila dei fogli), se no dall'URL
  const initial = grid.dataset.attivo ?? new URLSearchParams(location.search).get('tag') ?? '';
  active = grid.dataset.attivo = known.has(initial) ? initial : '';
  render(active);
  // striscia dei tag su mobile: il tag dell'URL può stare fuori a destra, lo si porta al centro.
  // scrollLeft e non scrollIntoView, che farebbe scorrere anche la pagina
  const bar = root.querySelector<HTMLElement>('.tagbar');
  const pressed = bar?.querySelector<HTMLElement>('[aria-pressed="true"]');
  if (bar && pressed) bar.scrollLeft = pressed.offsetLeft - (bar.clientWidth - pressed.offsetWidth) / 2;

  root.addEventListener('click', e => {
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
