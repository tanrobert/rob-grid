/**
 * Fogli aperti sopra il tavolo (components/foglio/Foglio.astro): le pagine info, extra, archivio e progetti
 * sono il tavolo con un foglio aperto sopra.
 * - Dal tavolo: il clic su una cella non cambia pagina. La pagina si scarica (carica.ts, di solito già in
 *   anticipo), il suo foglio si monta sopra il tavolo e l'indirizzo cambia (pushState).
 * - Da link diretto il foglio c'è già nella pagina (con l'intro); arrivando da un'altra pagina del sito entra
 *   dalla cella d'origine (in-arrivo, Layout.astro).
 * - Apertura: la hero vola dalla cella d'origine al suo posto crescendo davvero (larghezza e altezza, come nel
 *   prototipo tools/pages/tavolo.html), il retino entra, le altre celle arrivano una dopo l'altra.
 * - Chiusura (✕, Esc, clic sulla hero o fuori dalle celle, celle "Indice"): il contrario, poi resta il tavolo,
 *   indirizzo "/". Aperto dal tavolo si chiude tornando indietro nella cronologia, che così non cresce.
 *   Indietro e avanti aprono e chiudono (popstate → segui).
 * - Arrivando da un altro foglio (archivio → progetto, caricamento vero) la chiusura torna a quel foglio.
 * La hero che vola è una copia: quella vera resta nella griglia, che così non si ricompone.
 */
import { gsap } from 'gsap';
import { tavolo } from '../tavolo';
import type { Pezzo } from '../tavolo/pezzi';
import { T } from '../tavolo/tempi';
import { initCells } from '../cells';
import { homeTitle } from '../../data/site';
import { carica, stili, anticipa, eFoglio } from './carica';

const html = document.documentElement;
const ORIGINE = 'tavolo:origine';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Click sinistro senza modificatori: gli altri (nuova scheda, ecc.) restano al browser */
const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

interface Foglio {
  percorso: string;
  el: HTMLElement;
  retino: HTMLElement;
  hero: HTMLElement;
  titolo: string;
  /** la cella del tavolo da cui si apre e in cui si chiude */
  origine: Pezzo | null;
  /** arrivato da un altro foglio con un caricamento vero: chiudere = tornare lì */
  daFoglio: boolean;
}

let f: Foglio | null = null;
let aperto = false;
/** un volo o uno scaricamento in corso: indietro/avanti aspettano la fine (segui) */
let occupato = false;

/** La cella del tavolo per questo foglio: quella con questo id, se no la prima che porta qui */
const origineDi = (percorso: string, id?: string | null) =>
  tavolo?.pezzi.find(p => p.id === id)
  ?? tavolo?.pezzi.find(p => p.el.querySelector(`:scope > a.cell[href="${percorso}"]`))
  ?? null;
const cella = (p: Pezzo | null) => p?.el.querySelector<HTMLElement>(':scope > .cell') ?? null;

/** Tutto il foglio tranne la hero: celle e, nell'archivio, la striscia dei tag */
const altre = (f: Foglio) =>
  [...f.el.querySelectorAll<HTMLElement>(':scope > .grid > .cell:not([data-hero]):not([hidden]), :scope > :not(.grid)')];

/** La hero che vola: una copia fuori dalla griglia, ferma nella finestra */
function copia(hero: HTMLElement, r: DOMRect) {
  const c = hero.cloneNode(true) as HTMLElement;
  c.removeAttribute('data-hero');
  c.setAttribute('aria-hidden', 'true');
  c.inert = true;
  c.querySelectorAll('video').forEach(v => v.remove());
  // la foto già scaricata della hero: partendo piccola la copia sceglierebbe un file più piccolo, ancora da
  // scaricare, e volerebbe vuota
  const foto = hero.querySelectorAll('img');
  c.querySelectorAll('img').forEach((img, i) => {
    if (!foto[i]?.currentSrc) return;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.loading = 'eager';
    img.src = foto[i].currentSrc;
  });
  // visibile anche se la hero, all'apertura, è già nascosta in attesa del volo
  Object.assign(c.style, { position: 'fixed', left: '0', top: '0', margin: '0', zIndex: '45', pointerEvents: 'none', visibility: 'visible', opacity: '1' });
  gsap.set(c, { x: r.left, y: r.top, width: r.width, height: r.height });
  document.body.append(c);
  return c;
}
const vola = (el: HTMLElement, r: DOMRect, duration: number) =>
  gsap.to(el, { x: r.left, y: r.top, width: r.width, height: r.height, duration: T(duration), ease: 'power3.inOut' });

/** Foto della hero pronta prima del volo: se no la copia volerebbe vuota (al massimo 600ms) */
const fotoPronta = (hero: HTMLElement) => {
  const img = hero.querySelector('img');
  return img ? Promise.race([img.decode().catch(() => {}), sleep(600)]) : Promise.resolve();
};

/** Tavolo vivo (foglio chiuso) o inerte sotto il foglio. Il contenuto principale (id main, skip link) è chi si vede */
function tavoloVivo(vivo: boolean) {
  html.classList.toggle('is-tavolo', vivo);
  if (!tavolo) return;
  tavolo.v.el.inert = !vivo;
  tavolo.v.el.id = vivo ? 'main' : '';
  if (f) f.el.id = vivo ? '' : 'main';
}

async function apri({ dalTavolo = true, fuoco = false } = {}) {
  if (!f) return;
  const { el, retino, hero, origine } = f;
  aperto = occupato = true;
  tavoloVivo(false);
  document.title = f.titolo;
  scrollTo(0, 0);
  const resto = altre(f);
  gsap.set(resto, { opacity: 0 });
  gsap.set(hero, { visibility: 'hidden' });
  // arrivando da un altro foglio il retino c'era già
  gsap.set(retino, { opacity: dalTavolo ? 0 : 1 });
  html.classList.remove('in-arrivo');

  await fotoPronta(hero);
  const fine = hero.getBoundingClientRect();
  gsap.to(retino, { opacity: 1, duration: T(0.3), ease: 'power1.out' });
  // i dettagli arrivano quando il foglio è quasi al suo posto, uno dopo l'altro
  const q = parseFloat(getComputedStyle(el).getPropertyValue('--gap')) || 20;
  gsap.fromTo(resto, { y: q * 0.5 }, {
    opacity: 1, y: 0, duration: T(0.3), ease: 'power2.out', stagger: T(0.03), delay: T(dalTavolo ? 0.32 : 0.05),
    clearProps: 'opacity,transform',
  });
  const da = dalTavolo ? cella(origine) : null;
  if (da && origine) {
    const v = copia(hero, da.getBoundingClientRect());
    gsap.set(origine.el, { visibility: 'hidden' });
    await vola(v, fine, 0.55);
    v.remove();
    gsap.set(hero, { clearProps: 'visibility' });
  } else {
    await gsap.fromTo(hero, { opacity: 0, visibility: 'visible' }, { opacity: 1, duration: T(0.3), ease: 'power1.out', clearProps: 'opacity,visibility' });
  }
  if (fuoco) hero.querySelector<HTMLElement>('[data-close]')?.focus({ preventScroll: true });
  finito();
}

async function chiudi({ storia = true } = {}) {
  if (!f) return;
  const { retino, hero, origine } = f;
  if (storia) history.pushState(null, '', '/');
  occupato = true;
  document.title = homeTitle;
  const resto = altre(f);
  gsap.to(resto, { opacity: 0, duration: T(0.14), ease: 'power1.in' });
  gsap.to(retino, { opacity: 0, duration: T(0.38), delay: T(0.1), ease: 'power1.inOut' });
  const a = cella(origine);
  if (a && origine) {
    const v = copia(hero, hero.getBoundingClientRect());
    gsap.set(hero, { visibility: 'hidden' });
    await vola(v, a.getBoundingClientRect(), 0.48);
    // posata: sotto c'è già la cella vera, la copia sfuma
    gsap.set(origine.el, { clearProps: 'visibility' });
    await gsap.to(v, { opacity: 0, duration: T(0.1), ease: 'power1.out' });
    v.remove();
  } else {
    await gsap.to(hero, { opacity: 0, duration: T(0.3), ease: 'power1.in' });
  }
  aperto = false;
  tavoloVivo(true);
  gsap.set([...resto, hero, retino], { clearProps: 'opacity,transform,visibility' });
  // il fuoco torna alla cella d'origine (o al tavolo, che porta in vista la cella col fuoco)
  const link = a?.matches('a') ? a : a?.querySelector<HTMLElement>('a');
  link?.focus({ preventScroll: true });
  finito();
}

/** Il foglio della pagina scaricata, sopra il tavolo al posto di quello di prima (chiuso) */
async function monta(doc: Document, percorso: string, origine?: string | null) {
  await stili(doc);
  const el = document.importNode(doc.querySelector<HTMLElement>('main[data-foglio]')!, true);
  const retino = document.importNode(doc.querySelector<HTMLElement>('[data-retino]')!, true);
  f?.el.remove();
  f?.retino.remove();
  el.id = '';
  tavolo!.v.el.after(retino, el);
  // le celle nuove non rifanno l'ingresso
  html.classList.remove('is-intro');
  html.classList.add('ha-foglio');
  f = { percorso, el, retino, hero: el.querySelector<HTMLElement>('[data-hero]')!, titolo: doc.title, origine: origineDi(percorso, origine), daFoglio: false };
  // orologi, archivio, globo, titoloni… anche per le celle nuove
  initCells();
}

// fine di un volo o di uno scaricamento: se nel frattempo è cambiato l'indirizzo (indietro/avanti), il foglio lo segue
function finito() {
  occupato = false;
  segui();
}
async function segui() {
  if (occupato) return;
  const p = location.pathname;
  if (aperto && f?.percorso === p) return;
  if (aperto) return chiudi({ storia: false });  // poi, se serve, finito() apre quello giusto
  if (!eFoglio(p)) return;
  const id = (history.state as { origine?: string } | null)?.origine;
  if (f?.percorso === p) f.origine = origineDi(p, id) ?? f.origine;
  else {
    occupato = true;
    try {
      await monta(await carica(p), p, id);
    } catch {
      location.reload();
      return;
    }
    occupato = false;
    if (location.pathname !== p) return segui();
  }
  apri({ fuoco: true });
}
addEventListener('popstate', () => { segui(); });

function chiusura() {
  if (!f || !aperto || occupato) return;
  // aperto dal tavolo in questa pagina, o arrivato da un altro foglio: si torna indietro
  if (f.daFoglio || (history.state as { foglio?: boolean } | null)?.foglio) history.back();
  else chiudi();
}

/** Clic sulla hero (fuori da link e comandi, senza testo appena selezionato) o fuori dalle celle */
const fuori = (t: Element) =>
  (!!t.closest('.cell[data-hero]') && !t.closest('a, button, input, select, textarea, label, [role="switch"]') && !!getSelection()?.isCollapsed)
  || t === f?.el || t === f?.retino || (t.matches('.grid') && !!f?.el.contains(t));

// in cattura: prima dei link
document.addEventListener('click', e => {
  if (!aperto || !isPlainClick(e)) return;
  const t = e.target as Element;
  if (!t.closest('a[data-close]') && !fuori(t)) return;
  e.preventDefault();
  chiusura();
}, { capture: true });
document.addEventListener('keydown', e => { if (e.key === 'Escape') chiusura(); });

// clic su una cella del tavolo che porta a un foglio: si apre qui, senza cambiare pagina. I clic alla fine di
// un trascinamento non arrivano qui (li ferma scripts/tavolo/gesti.ts)
document.addEventListener('click', async e => {
  const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[href]');
  const pezzo = a?.closest<HTMLElement>('[data-pezzo]');
  if (!a || !pezzo || e.defaultPrevented || !isPlainClick(e) || a.origin !== location.origin || !eFoglio(a.pathname)) return;
  e.preventDefault();
  if (occupato || aperto) return;
  const id = pezzo.dataset.pezzo!;
  // se lo scaricamento non riesce: la pagina vera, che si apre da questa cella (in-arrivo)
  try { sessionStorage.setItem(ORIGINE, JSON.stringify({ href: a.pathname + a.search, id })); } catch {}
  occupato = true;
  let doc: Document;
  try {
    doc = await carica(a.pathname);
  } catch {
    location.assign(a.href);
    return;
  }
  history.pushState({ foglio: true, origine: id }, '', a.pathname + a.search + a.hash);
  await monta(doc, a.pathname, id);
  occupato = false;
  apri();
});

// precedente/successivo: la pagina sostituisce quella corrente nella cronologia, così la chiusura torna dove si era partiti
document.addEventListener('click', e => {
  const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[data-replace]');
  if (!a || e.defaultPrevented || !isPlainClick(e)) return;
  e.preventDefault();
  location.replace(a.href);
});

// ── Avvio ────────────────────────────────────────────────
const el = document.querySelector<HTMLElement>('main[data-foglio]');
const retino = document.querySelector<HTMLElement>('[data-retino]');
const hero = el?.querySelector<HTMLElement>('[data-hero]');
if (el && retino && hero) {
  // foglio già nella pagina (link diretto o caricamento vero)
  const percorso = location.pathname;
  let daFoglio = false;
  try {
    const r = new URL(document.referrer);
    daFoglio = r.origin === location.origin && r.pathname !== '/' && r.pathname !== percorso;
  } catch {}
  let id: string | undefined;
  try {
    const o = JSON.parse(sessionStorage.getItem(ORIGINE) ?? 'null');
    if (o?.href === percorso + location.search) id = o.id;
  } catch {}
  f = { percorso, el, retino, hero, titolo: document.title, origine: daFoglio ? null : origineDi(percorso, id), daFoglio };
  aperto = true;
  if (html.classList.contains('in-arrivo')) apri({ dalTavolo: !daFoglio });
  else tavoloVivo(false);
}

// le pagine delle celle del tavolo, scaricate in anticipo: subito quando il browser è libero, e comunque
// appena il puntatore si avvicina a una cella
if (tavolo) {
  const percorsi = [...tavolo.v.el.querySelectorAll<HTMLAnchorElement>('[data-pezzo] a[href]')]
    .filter(a => a.origin === location.origin && eFoglio(a.pathname)).map(a => a.pathname);
  setTimeout(() => anticipa(percorsi), html.classList.contains('is-intro') ? 2000 : 300);
  const vicino = (e: Event) => {
    const a = (e.target as Element).closest?.<HTMLAnchorElement>('[data-pezzo] a[href]');
    if (a && a.origin === location.origin && eFoglio(a.pathname)) carica(a.pathname).catch(() => {});
  };
  tavolo.v.el.addEventListener('pointerover', vicino, { passive: true });
  tavolo.v.el.addEventListener('pointerdown', vicino, { passive: true });
}
