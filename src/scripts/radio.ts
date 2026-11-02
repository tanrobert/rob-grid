/**
 * Cella `radio` (Purple Piper in diretta, components/cells/RadioCell.astro). Import dinamico da cells.ts, solo se la
 * cella c'è. Un solo lettore per la pagina, qui a livello di modulo: sopravvive alle ripartenze di initCells e ai fogli
 * che si aprono e si chiudono, così la radio partita dal tavolo continua mentre si gira il sito. Tutte le celle radio
 * della pagina (tavolo, foglio di Purple Piper) lo comandano e mostrano lo stesso stato.
 * Stati: fermo → attesa (connessione) → onda; errore se lo stream non parte entro ATTESA. Il brano in onda e il
 * prossimo si vedono subito, anche da ferma (invogliano ad ascoltare): si leggono quando una cella radio entra in
 * vista e poi ogni GIRO ms finché ce n'è una in vista e la pagina non è nascosta. Logica degli stati ripresa dal sito
 * purplepiper.eu (purplepiper-astro, RadioPlayer.astro).
 * Sul tavolo la radio è nascosta (grid-types, `nascosta`): quando parte compare sotto la cella di Purple Piper, così la
 * si ferma anche da lì; fermata resta, la sua ✕ la ferma e la toglie. Ricordato per la visita (sessionStorage).
 */
import { tavolo } from './tavolo';
import { compare, sparisce } from './tavolo/pezzi';

type Stato = 'fermo' | 'attesa' | 'onda' | 'errore';

const ATTESA = 15_000;
const GIRO = 20_000;
const SUL_TAVOLO = 'radio';  // sessionStorage: la radio è sul tavolo
const VELOCITA = 30;         // titoli che scorrono, px al secondo

const audio = new Audio();
audio.preload = 'none';
let stato: Stato = 'fermo';
let brani = { ora: '', dopo: '' };
let stream = '', statoUrl = '';
// ogni avvio ha un numero: i segnali di un tentativo vecchio (fermato o ripreso) non contano
let tentativo = 0;
let scadenza: number | undefined;
let lettura: number | undefined;
/** le celle radio che si vedono adesso */
const inVista = new Set<Element>();

const celle = () => document.querySelectorAll<HTMLElement>('[data-radio]');

function mostra() {
  celle().forEach(c => {
    c.dataset.stato = stato;
    const tasto = c.querySelector<HTMLButtonElement>('[data-radio-tasto]')!;
    tasto.hidden = false;
    tasto.setAttribute('aria-pressed', String(stato === 'attesa' || stato === 'onda'));
    for (const k of ['ora', 'dopo'] as const) {
      const box = c.querySelector<HTMLElement>(`[data-radio-titolo="${k}"]`)!;
      const testi = box.querySelectorAll<HTMLElement>('[data-testo]');
      box.parentElement!.hidden = !brani[k];
      // aria-live: si riscrive solo se il brano è cambiato, se no lo screen reader lo ripete
      if (testi[0].textContent === brani[k]) continue;
      testi.forEach(t => { t.textContent = brani[k]; });
      misura(box);
    }
  });
}

/** il titolo non ci sta: scorre (RadioCell.astro), a velocità costante */
function misura(box: HTMLElement) {
  const serie = box.querySelector<HTMLElement>('.serie')!;
  const scorre = serie.querySelector<HTMLElement>('[data-testo]')!.offsetWidth > box.clientWidth + 0.5;
  box.classList.toggle('is-scorre', scorre);
  if (scorre) box.style.setProperty('--durata', `${serie.offsetWidth / VELOCITA}s`);
}

function vai(s: Stato) {
  stato = s;
  clearTimeout(scadenza);
  if (s === 'attesa') scadenza = window.setTimeout(() => { spegni(); vai('errore'); }, ATTESA);
  leggiQuando();
  mostra();
}

function spegni() {
  audio.pause();
  audio.removeAttribute('src');  // src = '' farebbe scattare un errore
  audio.load();
}

/** come lo manda il server, genere compreso quando c'è (come sul sito purplepiper.eu): "Gong / Mandrake" → "Gong · Mandrake" */
const titolo = (t?: string) => (t ?? '').trim().replaceAll(' / ', ' · ');

async function leggi() {
  try {
    const r = await fetch(statoUrl, { cache: 'no-store' });
    if (!r.ok) return;
    const s = await r.json();
    brani = s.streamstatus === 1 ? { ora: titolo(s.songtitle), dopo: titolo(s.nexttitle) } : { ora: '', dopo: '' };
    mostra();
  } catch { /* il brano è un di più: senza, la radio suona lo stesso */ }
}

/** il brano si legge quando una cella radio è in vista (anche da ferma: invoglia ad ascoltare) e la pagina pure */
function leggiQuando() {
  const serve = inVista.size > 0 && !document.hidden;
  if (serve && lettura === undefined) { leggi(); lettura = window.setInterval(leggi, GIRO); }
  if (!serve && lettura !== undefined) { clearInterval(lettura); lettura = undefined; }
}

/** la cella radio del tavolo (nascosta finché la radio non parte) */
const pezzo = () => tavolo?.pezzi.find(p => p.el.querySelector('[data-radio]'));

function sulTavolo(si: boolean) {
  const p = pezzo();
  if (!tavolo || !p || p.el.hidden === !si) return;
  if (si) compare(tavolo, p); else sparisce(tavolo, p);
  try { if (si) sessionStorage.setItem(SUL_TAVOLO, 'si'); else sessionStorage.removeItem(SUL_TAVOLO); } catch { /* resta per questa pagina */ }
}

function ferma() {
  tentativo++;
  spegni();
  vai('fermo');
}

function premi() {
  if (stato !== 'fermo' && stato !== 'errore') { ferma(); return; }
  const questo = ++tentativo;
  sulTavolo(true);
  vai('attesa');
  audio.src = stream;
  audio.play().catch((e: DOMException) => {
    if (questo !== tentativo || e.name === 'AbortError') return;
    spegni();
    vai('errore');
  });
}

audio.addEventListener('playing', () => { if (stato !== 'fermo') vai('onda'); });
audio.addEventListener('waiting', () => { if (stato === 'onda') vai('attesa'); });
audio.addEventListener('error', () => {
  // senza src l'errore è quello di spegni(), non dello stream
  if (stato === 'fermo' || !audio.getAttribute('src')) return;
  spegni();
  vai('errore');
});
document.addEventListener('visibilitychange', leggiQuando);
// ricaricata la pagina durante la visita: la radio (ferma) è ancora sul tavolo, dove era rimasta (memoria del tavolo)
try { if (sessionStorage.getItem(SUL_TAVOLO)) { const p = pezzo(); if (p) p.el.hidden = false; } } catch { /* niente memoria */ }

export function initRadio(signal: AbortSignal) {
  celle().forEach(c => {
    stream ||= c.dataset.stream ?? '';
    statoUrl ||= c.dataset.statoUrl ?? '';
    c.querySelector('[data-radio-tasto]')!.addEventListener('click', premi, { signal });
    c.querySelector('[data-radio-togli]')?.addEventListener('click', () => { ferma(); sulTavolo(false); }, { signal });
  });
  // le celle nuove (un foglio appena montato) prendono lo stato di adesso
  mostra();
  // i titoli si rimisurano quando cambia lo spazio (anche quando la cella del tavolo compare), coi font giusti
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) inVista.add(e.target); else inVista.delete(e.target); });
    leggiQuando();
  });
  celle().forEach(c => io.observe(c));
  const ro = new ResizeObserver(es => es.forEach(e => misura(e.target as HTMLElement)));
  document.fonts.ready.then(() => { if (!signal.aborted) document.querySelectorAll<HTMLElement>('[data-radio-titolo]').forEach(b => ro.observe(b)); });
  signal.addEventListener('abort', () => { io.disconnect(); ro.disconnect(); inVista.clear(); leggiQuando(); });
}
