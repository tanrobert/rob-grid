/**
 * Indice del foglio (9/11/2026, idea di Roberto per il telefono): un tocco sull'indicatore del righello (scripts/ruler.ts,
 * senza trascinarlo) apre l'elenco dei titoli delle celle del foglio in vista, nell'ordine in cui si leggono; un tocco
 * su un titolo porta lì. Pannello d'inchiostro da destra, dove sta il righello; ✕, Esc o un tocco fuori lo chiudono.
 * Un solo <dialog> per la visita, rifatto a ogni apertura: i fogli cambiano (scripts/foglio), i filtri dell'archivio
 * nascondono celle. Con riduci movimento compare e sparisce senza scivolare (T() = 0).
 * Lo stesso pannello fa l'indice del tavolo (10/11/2026, scripts/tavolo/indice.ts): chi lo apre passa una `Fonte`
 * con le sue voci e il modo di portare a una cella; senza, è quello del foglio.
 */
import { gsap } from 'gsap';
import { T, REDUCED } from './preferenze';

const DURATA = 0.3;   // s, uguale all'andata e al ritorno
// la ✕ (src/assets/close.svg), come nelle foto ingrandite
const CHIUDI = '<svg viewBox="0 0 701.75 701.75" aria-hidden="true"><polygon points="518.01 350.88 701.75 167.14 534.61 0 350.88 183.74 167.14 0 0 167.13 183.74 350.88 0 534.61 83.56 618.17 83.56 618.18 167.13 701.75 350.88 518.01 534.61 701.75 618.17 618.19 618.18 618.19 701.75 534.61 518.01 350.88"/></svg>';

const html = document.documentElement;
let parti: { dialog: HTMLDialogElement; pannello: HTMLElement; elenco: HTMLOListElement } | null = null;
let aperto = false;

export interface Voce { c: HTMLElement; titolo: string; numero: string; occhiello: string }
/** Da dove vengono le voci: il foglio in vista (qui sotto) o il tavolo (scripts/tavolo/indice.ts) */
export interface Fonte {
  /** nome del pannello per gli screen reader */
  nome: string;
  /** le voci in ordine, e quella dove si è adesso */
  voci(): { voci: Voce[]; qui: number };
  /** porta alla cella, a indice chiuso */
  vai(c: HTMLElement): void;
  /** appena si tocca la voce, mentre l'indice si chiude (il tavolo solleva la cella) */
  scelta?(c: HTMLElement): void;
}
let fonte: Fonte;
/** le celle dell'elenco, nello stesso ordine dei bottoni */
let celle: HTMLElement[] = [];

function dialogo() {
  if (parti) return parti;
  const dialog = document.createElement('dialog');
  dialog.className = 'indice';
  dialog.innerHTML = `<nav class="indice__pannello"><div class="indice__testa mono"><span>Indice</span><button type="button" class="indice__chiudi" aria-label="Chiudi l'indice">${CHIUDI}</button></div><ol class="indice__elenco"></ol></nav>`;
  document.body.append(dialog);
  const pannello = dialog.querySelector<HTMLElement>('.indice__pannello')!;
  pannello.tabIndex = -1;
  const elenco = dialog.querySelector<HTMLOListElement>('ol')!;
  // Esc chiude l'indice, non anche il foglio sotto (scripts/foglio ascolta Esc sul documento)
  dialog.addEventListener('keydown', e => { if (e.key === 'Escape') e.stopPropagation(); });
  dialog.addEventListener('cancel', e => { e.preventDefault(); chiudi(); });
  dialog.addEventListener('close', fine);
  dialog.addEventListener('click', async e => {
    const t = e.target as Element;
    const voce = t.closest<HTMLElement>('[data-voce]');
    if (voce) {
      const cella = celle[Number(voce.dataset.voce)];
      if (cella) fonte.scelta?.(cella);
      await chiudi();
      // (dopo la chiusura: il browser, chiudendo il dialog, rimette il fuoco dov'era e potrebbe scorrere)
      if (cella) fonte.vai(cella);
      return;
    }
    // fuori dal pannello o sulla ✕
    if (!pannello.contains(t) || t.closest('.indice__chiudi')) chiudi();
  });
  parti = { dialog, pannello, elenco };
  return parti;
}

const testo = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

/** Titolo, numero e occhiello di una cella (il titolo vuoto = la cella non va nell'indice) */
export function descrivi(c: HTMLElement): Voce {
  // il primo titolo della cella (le celle a passi ne hanno uno per passo: conta quello in vista per primo)
  const titolo = c.dataset.nomeIndice
    || testo(c.querySelector('h1, h2, h3, .title, .caption__title'))
    || testo(c.querySelector('.cell__label > :not([aria-hidden])'))
    // le celle dei numeri (stat) hanno solo la didascalia: "Progetti in archivio"
    || testo(c.querySelector('.stat > .mono'));
  const numero = testo(c.querySelector('.cell__label > [aria-hidden]'));
  // le celle che portano altrove (precedente, successivo) dicono dove: il loro occhiello sopra il titolo
  const occhiello = c.matches('a') ? testo(c.querySelector('.cell__label > :not([aria-hidden])')) : '';
  return { c, titolo, numero, occhiello: occhiello === titolo ? '' : occhiello };
}

/** Indice del foglio: le celle del foglio in vista che hanno un titolo (o almeno un occhiello), in ordine di lettura */
const foglio: Fonte = {
  nome: 'Indice della pagina',
  voci() {
    const f = document.querySelector<HTMLElement>('main.foglio:not([hidden])');
    const voci = [...f?.querySelectorAll<HTMLElement>('.grid > .cell:not([hidden])') ?? []]
      .filter(c => c.getClientRects().length)
      .map(c => {
        const r = c.getBoundingClientRect();
        return { ...descrivi(c), top: Math.round(r.top), left: r.left };
      })
      .filter(v => v.titolo)
      // l'ordine in cui si vedono (la griglia è row dense: quello del documento non sempre)
      .sort((a, b) => a.top - b.top || a.left - b.left);
    // la cella in lettura: l'ultima che comincia sopra un terzo della finestra
    let qui = 0;
    voci.forEach((v, i) => { if (v.top <= innerHeight / 3) qui = i; });
    return { voci, qui };
  },
  /** Porta la cella sotto la firma, con un quadretto di carta in mezzo come in cima al foglio */
  vai(cella) {
    const f = cella.closest<HTMLElement>('.foglio');
    const sopra = f ? parseFloat(getComputedStyle(f).paddingTop) : 0;
    scrollTo({ top: Math.max(0, cella.getBoundingClientRect().top + scrollY - sopra), behavior: REDUCED ? 'instant' : 'smooth' });
    // il fuoco alla cella se è un link, per chi continua con la tastiera
    if (cella.matches('a')) cella.focus({ preventScroll: true });
  },
};

export async function apri(da: Fonte = foglio) {
  if (aperto) return;
  const { voci: vv, qui } = da.voci();
  if (!vv.length) return;
  const { dialog, pannello, elenco } = dialogo();
  aperto = true;
  fonte = da;
  dialog.setAttribute('aria-label', da.nome);
  celle = vv.map(v => v.c);
  elenco.replaceChildren(...vv.map((v, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'indice__voce';
    b.dataset.voce = String(i);
    if (i === qui) b.setAttribute('aria-current', 'location');
    b.innerHTML = `<span class="indice__numero mono" aria-hidden="true"></span><span class="indice__titolo"><span class="indice__occhiello mono"></span><span></span></span>`;
    b.firstElementChild!.textContent = v.numero;
    const [occhiello, titolo] = b.lastElementChild!.children as unknown as HTMLElement[];
    if (v.occhiello) occhiello.textContent = v.occhiello; else occhiello.remove();
    titolo.textContent = v.titolo;
    li.append(b);
    return li;
  }));
  dialog.showModal();
  html.style.overflow = 'hidden';
  // il fuoco sul pannello, non su una voce: col dito non deve comparire un contorno; da lì il Tab entra nell'elenco
  pannello.focus({ preventScroll: true });
  elenco.children[qui]?.scrollIntoView({ block: 'center' });
  await gsap.fromTo(pannello, { xPercent: 100 }, { xPercent: 0, duration: T(DURATA), ease: 'power3.out' });
}

async function chiudi() {
  if (!parti || !aperto) return;
  aperto = false;
  await gsap.to(parti.pannello, { xPercent: 100, duration: T(DURATA), ease: 'power3.in' });
  parti.dialog.close();
}

/** Chiuso (anche di colpo, dal browser): la pagina torna a scorrere */
function fine() {
  aperto = false;
  html.style.overflow = '';
  if (parti) gsap.set(parti.pannello, { clearProps: 'transform' });
}
