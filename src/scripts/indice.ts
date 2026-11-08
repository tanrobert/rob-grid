/**
 * Indice del foglio (9/11/2026, idea di Roberto per il telefono): un tocco sull'indicatore del righello (scripts/ruler.ts,
 * senza trascinarlo) apre l'elenco dei titoli delle celle del foglio in vista, nell'ordine in cui si leggono; un tocco
 * su un titolo porta lì. Pannello d'inchiostro da destra, dove sta il righello; ✕, Esc o un tocco fuori lo chiudono.
 * Un solo <dialog> per la visita, rifatto a ogni apertura: i fogli cambiano (scripts/foglio), i filtri dell'archivio
 * nascondono celle. Con riduci movimento compare e sparisce senza scivolare (T() = 0).
 */
import { gsap } from 'gsap';
import { T, REDUCED } from './preferenze';

const DURATA = 0.3;   // s, uguale all'andata e al ritorno
// la ✕ (src/assets/close.svg), come nelle foto ingrandite
const CHIUDI = '<svg viewBox="0 0 701.75 701.75" aria-hidden="true"><polygon points="518.01 350.88 701.75 167.14 534.61 0 350.88 183.74 167.14 0 0 167.13 183.74 350.88 0 534.61 83.56 618.17 83.56 618.18 167.13 701.75 350.88 518.01 534.61 701.75 618.17 618.19 618.18 618.19 701.75 534.61 518.01 350.88"/></svg>';

const html = document.documentElement;
let parti: { dialog: HTMLDialogElement; pannello: HTMLElement; elenco: HTMLOListElement } | null = null;
let aperto = false;
/** le celle dell'elenco, nello stesso ordine dei bottoni */
let celle: HTMLElement[] = [];

function dialogo() {
  if (parti) return parti;
  const dialog = document.createElement('dialog');
  dialog.className = 'indice';
  dialog.setAttribute('aria-label', 'Indice della pagina');
  dialog.innerHTML = `<nav class="indice__pannello"><div class="indice__testa mono"><span>Indice</span><button type="button" class="indice__chiudi" aria-label="Chiudi l'indice">${CHIUDI}</button></div><ol class="indice__elenco"></ol></nav>`;
  document.body.append(dialog);
  const pannello = dialog.querySelector<HTMLElement>('.indice__pannello')!;
  pannello.tabIndex = -1;
  const elenco = dialog.querySelector<HTMLOListElement>('ol')!;
  // Esc chiude l'indice, non anche il foglio sotto (scripts/foglio ascolta Esc sul documento)
  dialog.addEventListener('keydown', e => { if (e.key === 'Escape') e.stopPropagation(); });
  dialog.addEventListener('cancel', e => { e.preventDefault(); chiudi(); });
  dialog.addEventListener('close', fine);
  dialog.addEventListener('click', e => {
    const t = e.target as Element;
    const voce = t.closest<HTMLElement>('[data-voce]');
    if (voce) return vai(celle[Number(voce.dataset.voce)]);
    // fuori dal pannello o sulla ✕
    if (!pannello.contains(t) || t.closest('.indice__chiudi')) chiudi();
  });
  parti = { dialog, pannello, elenco };
  return parti;
}

const testo = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

/** Le celle del foglio in vista che hanno un titolo (o almeno un occhiello), in ordine di lettura */
function voci() {
  const foglio = document.querySelector<HTMLElement>('main.foglio:not([hidden])');
  if (!foglio) return [];
  return [...foglio.querySelectorAll<HTMLElement>('.grid > .cell:not([hidden])')]
    .filter(c => c.getClientRects().length)
    .map(c => {
      // il primo titolo della cella (le celle a passi ne hanno uno per passo: conta quello in vista per primo)
      const titolo = testo(c.querySelector('h1, h2, h3, .title, .caption__title'))
        || testo(c.querySelector('.cell__label > :not([aria-hidden])'));
      const numero = testo(c.querySelector('.cell__label > [aria-hidden]'));
      // le celle che portano altrove (precedente, successivo) dicono dove: il loro occhiello sopra il titolo
      const occhiello = c.matches('a') ? testo(c.querySelector('.cell__label > :not([aria-hidden])')) : '';
      const r = c.getBoundingClientRect();
      return { c, titolo, numero, occhiello: occhiello === titolo ? '' : occhiello, top: Math.round(r.top), left: r.left };
    })
    .filter(v => v.titolo)
    // l'ordine in cui si vedono (la griglia è row dense: quello del documento non sempre)
    .sort((a, b) => a.top - b.top || a.left - b.left);
}

export async function apri() {
  if (aperto) return;
  const vv = voci();
  if (!vv.length) return;
  const { dialog, pannello, elenco } = dialogo();
  aperto = true;
  celle = vv.map(v => v.c);
  // la cella in lettura: l'ultima che comincia sopra un terzo della finestra
  let qui = 0;
  vv.forEach((v, i) => { if (v.top <= innerHeight / 3) qui = i; });
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

/** Porta la cella sotto la firma, con un quadretto di carta in mezzo come in cima al foglio */
async function vai(cella: HTMLElement | undefined) {
  if (!cella) return;
  await chiudi();
  const foglio = cella.closest<HTMLElement>('.foglio');
  const sopra = foglio ? parseFloat(getComputedStyle(foglio).paddingTop) : 0;
  // (dopo la chiusura: il browser, chiudendo il dialog, rimette il fuoco dov'era e potrebbe scorrere)
  scrollTo({ top: Math.max(0, cella.getBoundingClientRect().top + scrollY - sopra), behavior: REDUCED ? 'instant' : 'smooth' });
  // il fuoco alla cella se è un link, per chi continua con la tastiera
  if (cella.matches('a')) cella.focus({ preventScroll: true });
}
