/**
 * Foto che si ingrandiscono (celle media con `ingrandisci: true`, Purple Piper dal 2/11/2026). Import dinamico da
 * cells.ts, solo se ce ne sono. Un clic (o Invio, Spazio) e la foto vola dalla cella al centro dello schermo, intera,
 * sopra il retino a fori di carta: come un foglio che si apre, coi suoi tempi e il suo suono. ✕, Esc o un clic
 * ovunque la riportano nella cella. Un solo <dialog> per la visita: Esc, focus e lettori di schermo li gestisce il
 * browser. In volo la foto è quella già scaricata (currentSrc); arrivata, se la misura grande chiede un file più
 * grande lo scambia quando è pronto. Con riduci movimento compare e sparisce senza volo (T() = 0).
 */
import { gsap } from 'gsap';
import { T } from './preferenze';
import { suona } from './suono';

const MARGINE = 0.06;   // aria attorno alla foto, in frazione del lato corto della finestra
const VOLO = 0.48;      // s, come la hero che torna nella sua cella (scripts/foglio)
// la ✕ (src/assets/close.svg)
const CHIUDI = '<svg viewBox="0 0 701.75 701.75" aria-hidden="true"><polygon points="518.01 350.88 701.75 167.14 534.61 0 350.88 183.74 167.14 0 0 167.13 183.74 350.88 0 534.61 83.56 618.17 83.56 618.18 167.13 701.75 350.88 518.01 534.61 701.75 618.17 618.19 618.18 618.19 701.75 534.61 518.01 350.88"/></svg>';

const html = document.documentElement;
let parti: { dialog: HTMLDialogElement; foto: HTMLImageElement; retino: HTMLElement } | null = null;
/** la foto della cella che ora è aperta, e se è in volo */
let aperta: HTMLImageElement | null = null;
let inVolo = false;

function dialogo() {
  if (parti) return parti;
  const dialog = document.createElement('dialog');
  dialog.className = 'grande';
  dialog.tabIndex = -1;
  dialog.setAttribute('aria-label', 'Foto ingrandita');
  dialog.innerHTML = `<div class="grande__retino"></div><img class="grande__foto" alt=""><button type="button" class="grande__chiudi" aria-label="Chiudi la foto">${CHIUDI}</button>`;
  document.body.append(dialog);
  // Esc chiude la foto, non anche il foglio sotto (scripts/foglio ascolta Esc sul documento)
  dialog.addEventListener('keydown', e => { if (e.key === 'Escape') e.stopPropagation(); });
  dialog.addEventListener('cancel', e => { e.preventDefault(); chiudi(); });
  // chiusa di colpo (il browser, al secondo Esc di fila, non aspetta): si rimette tutto a posto
  dialog.addEventListener('close', fine);
  dialog.addEventListener('click', chiudi);
  parti = { dialog, foto: dialog.querySelector('img')!, retino: dialog.querySelector('div')! };
  return parti;
}

/** dove arriva la foto: intera, al centro, grande quanto la finestra lascia */
function arrivo(src: HTMLImageElement) {
  const w = innerWidth, h = innerHeight, m = Math.min(w, h) * MARGINE, k = src.naturalWidth / src.naturalHeight;
  let width = w - 2 * m, height = width / k;
  if (height > h - 2 * m) { height = h - 2 * m; width = height * k; }
  return { x: (w - width) / 2, y: (h - height) / 2, width, height };
}

const al = (r: DOMRect) => ({ x: r.left, y: r.top, width: r.width, height: r.height });

async function apri(src: HTMLImageElement) {
  if (aperta) return;
  const { dialog, foto, retino } = dialogo();
  aperta = src;
  foto.src = src.currentSrc || src.src;
  foto.alt = src.alt;
  // parte tagliata come nella cella (una foto del carosello può essere posata sul bordo di sotto, `taglio: sopra`)
  foto.style.objectPosition = getComputedStyle(src).objectPosition;
  gsap.set(foto, al(src.getBoundingClientRect()));
  gsap.set(retino, { opacity: 0 });
  dialog.showModal();
  // il fuoco sul dialogo, non sulla ✕: lo Spazio che ha aperto, rilasciato sulla ✕, la richiuderebbe
  dialog.focus();
  html.style.overflow = 'hidden';
  src.style.visibility = 'hidden';
  suona('foglio');
  const a = arrivo(src);
  gsap.to(retino, { opacity: 1, duration: T(0.3), ease: 'power1.out' });
  inVolo = true;
  await gsap.to(foto, { ...a, duration: T(VOLO), ease: 'power3.inOut' });
  inVolo = false;
  // il file adatto alla misura grande, scambiato quando è pronto (srcset delle celle: fino a 1600/2400 px)
  if (src.srcset && aperta === src) {
    const grande = new Image();
    grande.sizes = `${Math.round(a.width)}px`;
    grande.srcset = src.srcset;
    grande.decode().then(() => { if (aperta === src) foto.src = grande.currentSrc; }, () => {});
  }
}

async function chiudi() {
  if (!aperta || inVolo || !parti) return;
  const { foto, retino } = parti;
  inVolo = true;
  suona('foglio', 0.6, true);
  gsap.to(retino, { opacity: 0, duration: T(0.38), delay: T(0.1), ease: 'power1.inOut' });
  await gsap.to(foto, { ...al(aperta.getBoundingClientRect()), duration: T(VOLO), ease: 'power3.inOut' });
  fine();
}

function fine() {
  if (!aperta || !parti) return;
  const src = aperta;
  aperta = null;
  inVolo = false;
  gsap.killTweensOf([parti.foto, parti.retino]);
  src.style.visibility = '';
  html.style.overflow = '';
  if (parti.dialog.open) parti.dialog.close();
  src.focus({ preventScroll: true });
}

export function initIngrandisci(signal: AbortSignal) {
  document.querySelectorAll<HTMLImageElement>('img[data-ingrandisci]').forEach(img => {
    img.addEventListener('click', () => apri(img), { signal });
    img.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      apri(img);
    }, { signal });
  });
}
