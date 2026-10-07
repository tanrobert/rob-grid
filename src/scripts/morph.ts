/**
 * Espansione cella → pagina (e ritorno) con le View Transitions. Coreografia e tempi: global.css.
 *
 * Una cella cliccabile (data-morph = il suo href) si apre nella hero della pagina d'arrivo
 * (data-hero = lo stesso href) e alla chiusura ci rientra. I pezzi che viaggiano sono marcati
 * nell'HTML col loro ruolo (data-part): foto, freccia ↔ ✕, titolo (dei progetti: arriva nella cella
 * del titolo, data-title-of, fuori dalla hero), numero, didascalie e occhielli. Viaggia ogni
 * ruolo presente da tutti e due i lati (uno per cella); il resto della cella resta nella finestra.
 *
 * Nell'HTML non c'è nessun view-transition-name: più celle portano alla stessa pagina e i nomi
 * doppi annullerebbero la transizione. Li assegna questo modulo, solo per una transizione e ai due
 * lati insieme, nel loader di Astro: lì ci sono entrambi i documenti e la pagina vecchia non è
 * ancora stata catturata. Alla fine della transizione i nomi si tolgono.
 * La chiusura con ✕ ed Esc (navigazione, non transizione) sta in close.ts.
 */

/** Ruolo di un pezzo: 'window' (la cella o la hero) o il valore di data-part */
type Parts = Map<string, HTMLElement>;
type Box = { width: string; height: string };
interface Couple { from: Parts; to: Parts; closing: boolean }

/**
 * Transizione in preparazione: fondo della finestra di partenza e foto. Si animano quando la
 * pagina nuova è al suo posto (lì si legge il fondo d'arrivo e si misura la foto d'arrivo)
 */
interface Pending { fill: { from: string; to: HTMLElement }; photo?: { from: Box; to: HTMLElement; ratio: number } }

/**
 * Ruoli dei pezzi e come viaggiano (classe della View Transition, comportamento in global.css):
 * frame = finestra che si allarga e rivela il contenuto · photo = foto che cresce sotto la finestra ·
 * scale = cambia misura e si scala (riquadro stretto sul contenuto, stesse proporzioni ai due lati) ·
 * text = si sposta restando della sua misura. Un ruolo nuovo viaggia come 'text' (in sviluppo lo
 * segnala la console): se serve un altro comportamento va aggiunto qui.
 */
const KIND: Record<string, 'frame' | 'photo' | 'scale' | 'text'> = {
  window: 'frame', media: 'photo',
  title: 'scale', num: 'scale', go: 'scale',
  eyebrow: 'text', note: 'text',
};

const NAMED = 'data-morphing';
const KEY = 'morph-origin';

/**
 * Firefox per Android: le View Transitions che cambiano misura scattano (anche con un riquadro solo,
 * vedi CLAUDE.md). Lì niente espansione: solo la dissolvenza della pagina, che non cambia misura.
 * Riconosciuto dallo user agent: la funzione c'è, è l'esecuzione a non reggere.
 */
const PLAIN = /Android.+Firefox\//.test(navigator.userAgent);

let pending: Pending | null = null;

/** Solo in sviluppo: un errore di marcatura non rompe niente, il pezzo semplicemente non viaggia */
const warn = (...msg: unknown[]) => { if (import.meta.env.DEV) console.warn('[morph]', ...msg); };

// ── Coppia origine → arrivo ───────────────────────────────

/** La finestra (cella o hero) e i suoi pezzi; la hero porta con sé la cella del titolo d'arrivo */
function parts(win: HTMLElement): Parts {
  const map: Parts = new Map([['window', win]]);
  const key = win.dataset.hero;
  const titleCell = key ? win.ownerDocument.querySelector<HTMLElement>(`[data-title-of="${CSS.escape(key)}"]`) : null;
  for (const root of [win, titleCell]) {
    root?.querySelectorAll<HTMLElement>('[data-part]').forEach(el => {
      const role = el.dataset.part!;
      if (map.has(role)) warn(`due pezzi "${role}" nella stessa cella: viaggia l'ultimo`, el);
      if (!(role in KIND)) warn(`ruolo "${role}" non in KIND: viaggia come text`, el);
      map.set(role, el);
    });
  }
  return map;
}

/**
 * Un pezzo che si scala viaggia solo se dice la stessa cosa ai due lati: due parole diverse scalate
 * una sull'altra si sovrappongono (Contatti "Scrivimi" → Info). Altrimenti resta nella finestra.
 */
const words = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const travels = (role: string, a: HTMLElement, b: HTMLElement) => KIND[role] !== 'scale' || words(a) === words(b);

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
  if (newDoc.querySelectorAll('[data-hero]').length > 1) warn('più di una hero nella pagina: vale la prima');
  const open = (cell: HTMLElement): Couple => {
    remember(cell.dataset.id);
    return { from: parts(cell), to: parts(target!), closing: false };
  };

  // la cella cliccata deve essere ancora nella pagina: con due click rapidi la prima navigazione può
  // aver già cambiato pagina, e la seconda partirebbe da una cella che non c'è più (mezza transizione)
  const clicked = target && source?.isConnected && source.closest<HTMLElement>(cellTo(target.dataset.hero!));
  if (clicked) return open(clicked);
  if (hero) {
    const origin = cellOf(newDoc, hero.dataset.hero!);
    if (origin) return { from: parts(hero), to: parts(origin), closing: true };
  }
  const remembered = target && !source && cellOf(oldDoc, target.dataset.hero!);
  return remembered ? open(remembered) : null;
}

// ── Nomi, solo per la durata di una transizione ───────────

function name(el: HTMLElement, role: string) {
  el.style.setProperty('view-transition-name', `morph-${role}`);
  el.style.setProperty('view-transition-class', `morph ${KIND[role] ?? 'text'}`);
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

/** Un tempo CSS in ms. La build comprime il CSS e riscrive i tempi (720ms → .72s): mai parseFloat da solo */
const toMs = (t: string) => parseFloat(t) * (t.trim().endsWith('ms') ? 1 : 1000);

/** Anima uno pseudo della View Transition con la durata e la curva della finestra (--t-morph, --ease-morph) */
function travel(pseudoElement: string, keyframes: PropertyIndexedKeyframes) {
  const css = getComputedStyle(document.documentElement);
  document.documentElement.animate(keyframes, {
    duration: toMs(css.getPropertyValue('--t-morph')),
    easing: css.getPropertyValue('--ease-morph').trim(),
    fill: 'both',
    pseudoElement,
  });
}

/**
 * Cella e hero possono ritagliare la foto in modo diverso (tablet: eurofish 6×4 → 8×5). Le due
 * istantanee stanno nel riquadro della foto intera (global.css), che qui cresce dalla foto di
 * partenza a quella d'arrivo con la curva della finestra: combaciano e la coprono sempre.
 * In px: le unità cq sugli pseudo delle View Transitions in Chrome si misurano sulla finestra.
 */
function growPhoto({ from, to, ratio }: NonNullable<Pending['photo']>) {
  const end = coverBox(to, ratio);
  for (const side of ['old', 'new']) {
    travel(`::view-transition-${side}(morph-media)`, { width: [from.width, end.width], height: [from.height, end.height] });
  }
}

/**
 * La finestra ha il fondo della cella (bianco, rosso; trasparente con la foto, che cresce sotto) e
 * passa a quello della hero. Le istantanee da sole non la riempiono: la cella piccola resta in alto
 * a sinistra mentre la finestra si allarga, e a metà dissolvenza sono tutte e due semitrasparenti.
 * Senza fondo lì si vedeva la pagina sotto (la "R" del logo dentro Extra, Info che diventava rosa).
 */
function fillWindow({ from, to }: Pending['fill']) {
  travel('::view-transition-group(morph-window)', { backgroundColor: [from, getComputedStyle(to).backgroundColor] });
}

// ── Navigazione ───────────────────────────────────────────

// Dopo il caricamento della pagina nuova e prima che la transizione catturi la vecchia: si sceglie
// la coppia, si danno i nomi ai pezzi presenti da entrambi i lati e si preparano fondo e foto
document.addEventListener('astro:before-preparation', e => {
  const load = e.loader;
  e.loader = async () => {
    await load();
    // superata da una navigazione più recente (doppio click): non tocca niente, nomi e stato sono suoi
    if (e.signal.aborted) return;
    pending = null;
    unname(document);  // nomi rimasti da una navigazione interrotta
    const newDoc = e.newDocument;
    if (!newDoc || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // le classi vanno sul documento nuovo: lo swap riscrive gli attributi di <html>
    newDoc.documentElement.classList.toggle('morph-plain', PLAIN);
    if (PLAIN) return;
    const couple = pair(document, newDoc, e.sourceElement);
    if (!couple) return;

    const { from, to, closing } = couple;
    for (const [role, el] of from) {
      const twin = to.get(role);
      if (twin && travels(role, el, twin)) { name(el, role); name(twin, role); }
    }
    newDoc.documentElement.classList.toggle('morph-close', closing);

    pending = { fill: { from: getComputedStyle(from.get('window')!).backgroundColor, to: to.get('window')! } };
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
  e.viewTransition.ready.then(() => {
    fillWindow(morph.fill);
    if (morph.photo) growPhoto(morph.photo);
  }).catch(() => {
    document.documentElement.classList.remove('morph-photo');
  });
  e.viewTransition.finished.finally(() => {
    unname(document);
    document.documentElement.classList.remove('morph-close', 'morph-photo');
  });
});
