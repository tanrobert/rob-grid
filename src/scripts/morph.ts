/**
 * Espansione cella → pagina (e ritorno) con le View Transitions. Coreografia e tempi: global.css.
 *
 * Una cella cliccabile (data-morph = il suo href) si apre nella hero della pagina d'arrivo
 * (data-hero = lo stesso href) e alla chiusura ci rientra. I pezzi che viaggiano sono marcati
 * nell'HTML col loro ruolo (data-part): foto, freccia ↔ ✕, barra della didascalia ↔ cella del
 * titolo (data-title-of, fuori dalla hero), titolo, numero.
 *
 * Nell'HTML non c'è nessun view-transition-name: più celle portano alla stessa pagina e i nomi
 * doppi annullerebbero la transizione. Li assegna questo modulo, solo per una transizione e ai due
 * lati insieme, nel loader di Astro: lì ci sono entrambi i documenti e la pagina vecchia non è
 * ancora stata catturata. Alla fine della transizione i nomi si tolgono.
 */
import { navigate } from 'astro:transitions/client';

type Role = 'window' | 'media' | 'go' | 'caption' | 'title' | 'num';
type Parts = Map<Role, HTMLElement>;
type Box = { width: string; height: string };
interface Couple { from: Parts; to: Parts; closing: boolean }

/** Transizione in preparazione: la foto si anima quando la pagina nuova è al suo posto */
interface Pending { photo?: { from: Box; to: HTMLElement; ratio: number } }

const NAMED = 'data-morphing';
const KEY = 'morph-origin';
let pending: Pending | null = null;

// ── Coppia origine → arrivo ───────────────────────────────

/** La finestra (cella o hero) e i suoi pezzi; la hero porta con sé la cella del titolo d'arrivo */
function parts(win: HTMLElement): Parts {
  const map: Parts = new Map([['window', win]]);
  const key = win.dataset.hero;
  const titleCell = key ? win.ownerDocument.querySelector<HTMLElement>(`[data-title-of="${CSS.escape(key)}"]`) : null;
  if (titleCell) map.set('caption', titleCell);
  for (const root of [win, titleCell]) {
    root?.querySelectorAll<HTMLElement>('[data-part]').forEach(el => map.set(el.dataset.part as Role, el));
  }
  return map;
}

function remember(id?: string) {
  try { if (id) sessionStorage.setItem(KEY, id); } catch {}
}
function recall(): string | null {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

const cellTo = (key: string) => `[data-morph="${CSS.escape(key)}"]`;

/** La cella che porta a `key`: quella da cui eravamo partiti se c'è ancora, se no la prima */
function cellOf(doc: Document, key: string): HTMLElement | null {
  const id = recall();
  return (id && doc.querySelector<HTMLElement>(`${cellTo(key)}[data-id="${CSS.escape(id)}"]`)) || doc.querySelector<HTMLElement>(cellTo(key));
}

/**
 * Tre casi, in quest'ordine:
 * 1. apertura dal click: la cella cliccata si apre nella hero della pagina nuova (anche da una
 *    pagina che ha già la sua hero, es. una cella dell'archivio);
 * 2. chiusura: la hero della pagina corrente rientra nella sua cella della pagina nuova;
 * 3. apertura dalla history (avanti del browser): dalla cella ricordata.
 * Un link qualsiasi verso una pagina con hero (es. un tag verso l'archivio) non apre niente.
 */
function pair(oldDoc: Document, newDoc: Document, source?: Element): Couple | null {
  const target = newDoc.querySelector<HTMLElement>('[data-hero]');
  const hero = oldDoc.querySelector<HTMLElement>('[data-hero]');
  const open = (cell: HTMLElement): Couple => {
    remember(cell.dataset.id);
    return { from: parts(cell), to: parts(target!), closing: false };
  };

  const clicked = target && source?.closest<HTMLElement>(cellTo(target.dataset.hero!));
  if (clicked) return open(clicked);
  if (hero) {
    const origin = cellOf(newDoc, hero.dataset.hero!);
    if (origin) return { from: parts(hero), to: parts(origin), closing: true };
  }
  const remembered = target && !source && cellOf(oldDoc, target.dataset.hero!);
  return remembered ? open(remembered) : null;
}

// ── Nomi, solo per la durata di una transizione ───────────

function name(el: HTMLElement, role: Role) {
  el.style.setProperty('view-transition-name', `morph-${role}`);
  el.style.setProperty('view-transition-class', 'morph');
  el.setAttribute(NAMED, '');
}

function unname(doc: Document) {
  doc.querySelectorAll<HTMLElement>(`[${NAMED}]`).forEach(el => {
    el.style.removeProperty('view-transition-name');
    el.style.removeProperty('view-transition-class');
    el.removeAttribute(NAMED);
  });
}

// ── Foto ──────────────────────────────────────────────────

/**
 * La foto d'arrivo deve essere già disegnata quando la transizione cattura la pagina nuova,
 * se no quella di partenza sfuma su un riquadro vuoto (flash bianco). Le celle della griglia sono
 * lazy e la hero usa un file più grande: si scarica e decodifica ora, con un tetto per le reti lente.
 */
function photoReady(media: HTMLElement): Promise<unknown> {
  const img = media.querySelector('img');
  const src = img?.getAttribute('src') ?? media.querySelector('video')?.getAttribute('poster');
  if (!src) return Promise.resolve();
  const pre = new Image();
  if (img) {
    img.loading = 'eager';
    img.decoding = 'sync';
    pre.sizes = img.sizes;
    pre.srcset = img.srcset;
  }
  pre.src = src;
  return Promise.race([pre.decode().catch(() => {}), new Promise(r => setTimeout(r, 1000))]);
}

/** Proporzioni della foto intera (prima del ritaglio della cella), da width/height di <Image> o dal video */
function mediaRatio(media: HTMLElement): number | undefined {
  const m = media.querySelector('img, video');
  const r = m instanceof HTMLVideoElement
    ? m.videoWidth / m.videoHeight
    : Number(m?.getAttribute('width')) / Number(m?.getAttribute('height'));
  return r > 0 && Number.isFinite(r) ? r : undefined;
}

/** Riquadro della foto intera che copre la foto ritagliata */
function coverBox(media: HTMLElement, r: number): Box {
  const { width: w, height: h } = media.getBoundingClientRect();
  return w / h > r ? { width: `${w}px`, height: `${w / r}px` } : { width: `${h * r}px`, height: `${h}px` };
}

/**
 * Cella e hero possono ritagliare la foto in modo diverso (tablet: eurofish 6×4 → 8×5). Le due
 * istantanee stanno nel riquadro della foto intera (global.css), che qui cresce dalla foto di
 * partenza a quella d'arrivo con la curva della finestra: combaciano e la coprono sempre.
 * In px: le unità cq sugli pseudo delle View Transitions in Chrome si misurano sulla finestra.
 */
function growPhoto({ from, to, ratio }: NonNullable<Pending['photo']>) {
  const end = coverBox(to, ratio);
  const css = getComputedStyle(document.documentElement);
  const timing = { duration: parseFloat(css.getPropertyValue('--t-morph')), easing: css.getPropertyValue('--ease-morph').trim(), fill: 'both' as const };
  for (const side of ['old', 'new']) {
    document.documentElement.animate(
      { width: [from.width, end.width], height: [from.height, end.height] },
      { ...timing, pseudoElement: `::view-transition-${side}(morph-media)` },
    );
  }
}

// ── Navigazione ───────────────────────────────────────────

// Dopo il caricamento della pagina nuova e prima che la transizione catturi la vecchia: si sceglie
// la coppia, si danno i nomi ai pezzi presenti da entrambi i lati e si prepara la foto
document.addEventListener('astro:before-preparation', e => {
  const load = e.loader;
  e.loader = async () => {
    await load();
    pending = null;
    unname(document);  // nomi rimasti da una navigazione interrotta
    const newDoc = e.newDocument;
    if (!newDoc || e.signal.aborted || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const couple = pair(document, newDoc, e.sourceElement);
    if (!couple) return;

    const { from, to, closing } = couple;
    for (const [role, el] of from) {
      const twin = to.get(role);
      if (twin) { name(el, role); name(twin, role); }
    }
    // la classe va sul documento nuovo: lo swap riscrive gli attributi di <html>
    newDoc.documentElement.classList.toggle('morph-close', closing);

    pending = {};
    const fromMedia = from.get('media'), toMedia = to.get('media');
    if (!fromMedia || !toMedia) return;
    const ratio = mediaRatio(fromMedia);
    if (ratio) {
      pending.photo = { from: coverBox(fromMedia, ratio), to: toMedia, ratio };
      newDoc.documentElement.classList.add('morph-photo');
    }
    await photoReady(toMedia);
  };
});

document.addEventListener('astro:before-swap', e => {
  const morph = pending;
  pending = null;
  if (!morph) return;
  e.viewTransition.ready.then(() => morph.photo && growPhoto(morph.photo)).catch(() => {
    document.documentElement.classList.remove('morph-photo');
  });
  e.viewTransition.finished.finally(() => {
    unname(document);
    document.documentElement.classList.remove('morph-close', 'morph-photo');
  });
});

// ── Chiusura (✕ o Esc) ────────────────────────────────────
// Se siamo arrivati navigando nel sito torniamo indietro nella history, così la griglia ritrova
// lo scroll e la cella d'origine è dove l'avevamo lasciata.
let inSite = false;
document.addEventListener('astro:after-swap', () => { inSite = true; });

function close() {
  if (inSite) history.back();
  else navigate('/');
}

/** Click sinistro senza modificatori: gli altri (nuova scheda, ecc.) restano al browser */
const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

document.addEventListener('click', e => {
  const back = (e.target as Element).closest('a[data-close]');
  if (!back || !isPlainClick(e)) return;
  e.preventDefault();
  close();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.querySelector('[data-hero]')) close();
});
