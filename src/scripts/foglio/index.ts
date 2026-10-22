/**
 * Fogli aperti sopra il tavolo (components/foglio/Foglio.astro): le pagine info, extra, archivio e progetti
 * sono il tavolo con uno o più fogli aperti sopra, impilati (pila).
 * - Dal tavolo o da una cella di un foglio: il clic non cambia pagina. La pagina si scarica (carica.ts, di
 *   solito già in anticipo), il suo foglio si monta in cima alla pila e l'indirizzo cambia (pushState). Il
 *   foglio sotto resta montato e nascosto, coi suoi filtri e il suo scroll.
 * - Precedente/successivo sostituiscono il foglio in cima (replaceState).
 * - Apertura: le celle di quello che c'è sotto sfumano, la hero vola dalla cella cliccata al suo posto
 *   crescendo davvero (larghezza e altezza, come nel prototipo tools/pages/tavolo.html), le altre celle
 *   arrivano una dopo l'altra. Dal tavolo entra anche il retino.
 * - Chiusura (✕, Esc, clic sulla hero o fuori dalle celle): toglie il foglio in cima, la hero torna nella sua
 *   cella del foglio sotto o del tavolo. Celle "Indice": tutta la pila, fino al tavolo.
 * - Cronologia: ogni voce sa a che livello della pila è ({ livello, origine }; il tavolo è −1). Indietro e
 *   avanti (popstate) fanno quello che serve per arrivarci: segui().
 * - Da link diretto il primo foglio c'è già nella pagina (con l'intro); arrivando da un'altra pagina del sito
 *   entra dalla cella d'origine (in-arrivo, Layout.astro).
 * La hero che vola è una copia: quella vera resta nella griglia, che così non si ricompone.
 */
import { gsap } from 'gsap';
import { tavolo } from '../tavolo';
import { T } from '../tavolo/tempi';
import { initCells } from '../cells';
import { homeTitle } from '../../data/site';
import { carica, stili, anticipa, eFoglio } from './carica';

const html = document.documentElement;
const ORIGINE = 'tavolo:origine';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Click sinistro senza modificatori: gli altri (nuova scheda, ecc.) restano al browser */
const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** Da dove si apre un foglio e dove torna chiudendosi: una cella del tavolo o del foglio sotto */
interface Origine {
  cella: HTMLElement;
  /** cosa nascondere mentre la hero è fuori: sul tavolo tutto il pezzo (con l'ombra) */
  nascondi: HTMLElement;
}
interface Foglio {
  percorso: string;
  el: HTMLElement;
  hero: HTMLElement;
  titolo: string;
  origine: Origine | null;
  /** scroll della pagina quando un altro foglio l'ha coperto */
  scroll: number;
  /** aperto in questa pagina (pushState): chiuderlo è tornare indietro nella cronologia */
  qui: boolean;
  /** arrivato da un altro foglio con un caricamento vero: chiudere = tornare a quella pagina */
  daFoglio: boolean;
}
/** Voce della cronologia: livello nella pila e come trovare la cella d'origine */
type Stato = { livello?: number; origine?: { tavolo?: string; href?: string } } | null;

const stato = () => history.state as Stato;
const livello = () => (location.pathname === '/' ? -1 : (stato()?.livello ?? 0));

const pila: Foglio[] = [];
let retino = document.querySelector<HTMLElement>('[data-retino]');
/** un volo o uno scaricamento in corso: il resto aspetta la fine (segui) */
let occupato = false;
/** la cella appena cliccata: il prossimo volo parte da lì */
let partenza: HTMLElement | null = null;

const cellaDi = (el: Element | null | undefined) => el?.closest<HTMLElement>('.cell') ?? null;
/** Una cella da cui si può volare: nella pagina e visibile (un filtro dell'archivio la può aver nascosta) */
const visibile = (el: HTMLElement | null) => (el?.isConnected && el.getClientRects().length ? el : null);

/** La cella d'origine del foglio al livello `liv`: sul tavolo (livello 0) o nel foglio sotto */
function origineDi(liv: number, percorso: string, o?: { tavolo?: string; href?: string }): Origine | null {
  if (liv <= 0) {
    const p = tavolo?.pezzi.find(p => p.id === o?.tavolo)
      ?? tavolo?.pezzi.find(p => o?.href && p.el.querySelector(`a[href="${o.href}"]`))
      ?? tavolo?.pezzi.find(p => p.el.querySelector(`:scope > a.cell[href="${percorso}"]`));
    const c = p?.el.querySelector<HTMLElement>(':scope > .cell');
    return p && c ? { cella: c, nascondi: p.el } : null;
  }
  const sotto = pila[liv - 1];
  const c = (o?.href ? cellaDi(sotto?.el.querySelector(`a[href="${o.href}"]`)) : null)
    ?? sotto?.el.querySelector<HTMLElement>(`a.cell[href="${percorso}"]`) ?? null;
  return c ? { cella: c, nascondi: c } : null;
}

/** Tutto il foglio tranne la hero (e una cella da lasciare): celle e, nell'archivio, la striscia dei tag */
const altre = (f: Foglio, tranne?: HTMLElement | null) =>
  [...f.el.querySelectorAll<HTMLElement>(':scope > .grid > .cell:not([data-hero]):not([hidden]), :scope > :not(.grid)')]
    .filter(el => el !== tranne);

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

/** Il contenuto principale (id main, skip link) è quello che si vede: il foglio in cima, o il tavolo */
function principale() {
  pila.forEach((f, i) => { f.el.id = i === pila.length - 1 ? 'main' : ''; });
  if (tavolo) tavolo.v.el.id = pila.length ? '' : 'main';
}
/** Tavolo vivo (nessun foglio) o inerte sotto i fogli */
function tavoloVivo(vivo: boolean) {
  html.classList.toggle('is-tavolo', vivo);
  if (tavolo) tavolo.v.el.inert = !vivo;
}

/**
 * Il foglio `f` (già nella pila, al livello `liv`) entra: quello che c'era (il foglio sotto, quello che
 * sostituisce o il tavolo) lascia il posto, la hero vola dalla cella `da`.
 */
async function entra(f: Foglio, { da = null as HTMLElement | null, sostituito = null as Foglio | null, retinoPieno = false, fuoco = false } = {}) {
  occupato = true;
  const liv = pila.indexOf(f);
  const sotto = liv > 0 ? pila[liv - 1] : null;
  await fotoPronta(f.hero);
  const daRect = visibile(da)?.getBoundingClientRect();
  // quello che c'era se ne va, tranne la cella da cui si parte
  const via = sostituito ?? (sotto?.el.hidden ? null : sotto);
  if (via) {
    const resto = [...altre(via, da), ...(via.hero === da ? [] : [via.hero])];
    await gsap.to(resto, { opacity: 0, duration: T(0.14), ease: 'power1.in' });
    if (via === sotto) via.scroll = scrollY;
    via.el.hidden = true;
    gsap.set(resto, { clearProps: 'opacity' });
  }
  if (sostituito) {
    sostituito.el.remove();
    // sul tavolo torna visibile la cella del foglio sostituito, si nasconde quella del nuovo
    if (sostituito.origine && sostituito.origine.nascondi !== f.origine?.nascondi) gsap.set(sostituito.origine.nascondi, { clearProps: 'visibility' });
  }
  const dalTavolo = liv === 0 && !sostituito;
  tavoloVivo(false);
  f.el.hidden = false;
  principale();
  document.title = f.titolo;
  scrollTo(0, 0);
  const resto = altre(f);
  gsap.set(resto, { opacity: 0 });
  gsap.set(f.hero, { visibility: 'hidden' });
  if (retino) gsap.set(retino, { opacity: dalTavolo && !retinoPieno ? 0 : 1 });
  html.classList.remove('in-arrivo');

  const fine = f.hero.getBoundingClientRect();
  if (retino) gsap.to(retino, { opacity: 1, duration: T(0.3), ease: 'power1.out' });
  // i dettagli arrivano quando il foglio è quasi al suo posto, uno dopo l'altro
  const q = parseFloat(getComputedStyle(f.el).getPropertyValue('--gap')) || 20;
  gsap.fromTo(resto, { y: q * 0.5 }, {
    opacity: 1, y: 0, duration: T(0.3), ease: 'power2.out', stagger: T(0.03), delay: T(daRect ? 0.32 : 0.05),
    clearProps: 'opacity,transform',
  });
  if (liv === 0 && f.origine) gsap.set(f.origine.nascondi, { visibility: 'hidden' });
  if (daRect) {
    const v = copia(f.hero, daRect);
    await vola(v, fine, 0.55);
    v.remove();
    gsap.set(f.hero, { clearProps: 'visibility' });
  } else {
    await gsap.fromTo(f.hero, { opacity: 0, visibility: 'visible' }, { opacity: 1, duration: T(0.3), ease: 'power1.out', clearProps: 'opacity,visibility' });
  }
  if (fuoco) f.hero.querySelector<HTMLElement>('[data-close]')?.focus({ preventScroll: true });
  finito();
}

/** Il foglio in cima esce: la hero torna nella sua cella, sotto riappare il foglio di prima o il tavolo */
async function esce() {
  const f = pila.at(-1);
  if (!f) return;
  occupato = true;
  const sotto = pila.at(-2) ?? null;
  const v = copia(f.hero, f.hero.getBoundingClientRect());
  gsap.set(f.hero, { visibility: 'hidden' });
  const resto = altre(f);
  let verso: HTMLElement | null = null;
  if (!sotto) {
    document.title = homeTitle;
    gsap.to(resto, { opacity: 0, duration: T(0.14), ease: 'power1.in' });
    if (retino) gsap.to(retino, { opacity: 0, duration: T(0.38), delay: T(0.1), ease: 'power1.inOut' });
    verso = visibile(f.origine?.cella ?? null);
    if (verso) await vola(v, verso.getBoundingClientRect(), 0.48);
    // posata: sotto c'è già la cella vera, la copia sfuma
    if (f.origine) gsap.set(f.origine.nascondi, { clearProps: 'visibility' });
    await gsap.to(v, { opacity: 0, duration: T(verso ? 0.1 : 0.3), ease: 'power1.out' });
    pila.pop();
    f.el.remove();
    tavoloVivo(true);
    if (retino) gsap.set(retino, { clearProps: 'opacity' });
  } else {
    await gsap.to(resto, { opacity: 0, duration: T(0.14), ease: 'power1.in' });
    pila.pop();
    f.el.remove();
    sotto.el.hidden = false;
    document.title = sotto.titolo;
    scrollTo(0, sotto.scroll);
    verso = visibile(f.origine?.cella ?? null);
    gsap.fromTo(altre(sotto, verso), { opacity: 0 }, { opacity: 1, duration: T(0.2), ease: 'power1.out', clearProps: 'opacity' });
    if (verso) {
      gsap.set(verso, { visibility: 'hidden' });
      await vola(v, verso.getBoundingClientRect(), 0.48);
      gsap.set(verso, { clearProps: 'visibility' });
    }
    await gsap.to(v, { opacity: 0, duration: T(verso ? 0.1 : 0.3), ease: 'power1.out' });
  }
  v.remove();
  principale();
  // il fuoco torna alla cella d'origine (sul tavolo, che porta in vista la cella col fuoco)
  (verso?.matches('a') ? verso : verso?.querySelector<HTMLElement>('a'))?.focus({ preventScroll: true });
  finito();
}

/** Il foglio della pagina scaricata, montato nascosto in cima alla pila */
async function monta(doc: Document, percorso: string, liv: number, o?: { tavolo?: string; href?: string }) {
  await stili(doc);
  if (!retino) {
    retino = document.importNode(doc.querySelector<HTMLElement>('[data-retino]')!, true);
    tavolo!.v.el.after(retino);
  }
  const el = document.importNode(doc.querySelector<HTMLElement>('main[data-foglio]')!, true);
  el.id = '';
  el.hidden = true;
  (pila.at(-1)?.el ?? retino).after(el);
  // le celle nuove non rifanno l'ingresso
  html.classList.remove('is-intro');
  html.classList.add('ha-foglio');
  const f: Foglio = {
    percorso, el, hero: el.querySelector<HTMLElement>('[data-hero]')!, titolo: doc.title,
    origine: origineDi(liv, percorso, o), scroll: 0, qui: true, daFoglio: false,
  };
  // orologi, archivio, globo, titoloni… anche per le celle nuove
  initCells();
  return f;
}

// fine di un volo o di uno scaricamento: se nel frattempo è cambiato l'indirizzo (indietro/avanti), si segue
function finito() {
  occupato = false;
  segui();
}

/** Porta la pila al livello dell'indirizzo di adesso: un passo alla volta, ognuno animato */
async function segui() {
  if (occupato) return;
  const L = livello(), p = location.pathname, cima = pila.length - 1;
  if (L === cima && (L < 0 || pila[cima].percorso === p)) return;
  const da = partenza;
  partenza = null;

  if (L < cima) {
    // più livelli in un colpo (Indice, cronologia): via subito quelli in mezzo, il foglio in cima torna
    // nella cella da cui era partito il primo di loro
    if (L + 1 < cima) {
      const primo = pila[L + 1];
      pila[cima].origine = primo.origine;
      for (const f of pila.splice(L + 1, cima - L - 1)) f.el.remove();
    }
    return esce();
  }
  if (!eFoglio(p)) return location.reload();
  const liv = Math.min(L, cima + 1);
  occupato = true;
  let f: Foglio;
  try {
    f = await monta(await carica(p), p, liv, stato()?.origine);
  } catch {
    location.reload();
    return;
  }
  if (liv === cima) {
    // stesso livello, altra pagina: sostituisce (precedente/successivo)
    const vecchio = pila[cima];
    pila[cima] = f;
    return entra(f, { da, sostituito: vecchio });
  }
  pila.push(f);
  entra(f, { da: da ?? f.origine?.cella ?? null, fuoco: !da });
}
addEventListener('popstate', () => { segui(); });

/** Chiude il foglio in cima (o tutta la pila, `tutto`) */
function chiusura(tutto = false) {
  if (!pila.length || occupato) return;
  const L = livello();
  if (tutto && L > 0) {
    // Indice: fino al tavolo in un colpo
    if (pila[0].qui) history.go(-(L + 1));
    else { history.pushState({ livello: -1 }, '', '/'); segui(); }
    return;
  }
  // aperto in questa pagina, o arrivato da un altro foglio: si torna indietro
  if (pila.at(-1)!.qui || pila[0].daFoglio) history.back();
  else { history.pushState({ livello: -1 }, '', '/'); segui(); }
}

/** Clic sulla hero (fuori da link e comandi, senza testo appena selezionato) o fuori dalle celle */
const fuori = (t: Element) => {
  const f = pila.at(-1);
  return (!!t.closest('.cell[data-hero]') && !t.closest('a, button, input, select, textarea, label, [role="switch"]') && !!getSelection()?.isCollapsed)
    || t === f?.el || t === retino || (t.matches('.grid') && !!f?.el.contains(t));
};

// in cattura: prima dei link. La ✕ della hero chiude un foglio, le celle "Indice" tutta la pila
document.addEventListener('click', e => {
  if (!pila.length || html.classList.contains('is-tavolo') || !isPlainClick(e)) return;
  const t = e.target as Element;
  const x = t.closest<HTMLElement>('a[data-close]');
  if (!x && !fuori(t)) return;
  e.preventDefault();
  chiusura(!!x && !x.classList.contains('cell__go'));
}, { capture: true });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !html.classList.contains('is-tavolo')) chiusura(); });

/** Scarica la pagina prima di cambiare indirizzo: se non riesce, la pagina vera */
async function prepara(a: HTMLAnchorElement, sostituisci = false) {
  occupato = true;
  try {
    await carica(a.pathname);
  } catch {
    if (sostituisci) location.replace(a.href);
    else location.assign(a.href);
    return false;
  }
  occupato = false;
  return true;
}

// clic su una cella che porta a un foglio, sul tavolo o nel foglio in cima: si apre qui, senza cambiare
// pagina. I clic alla fine di un trascinamento non arrivano qui (li ferma scripts/tavolo/gesti.ts)
document.addEventListener('click', async e => {
  const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[href]');
  if (!a || e.defaultPrevented || !isPlainClick(e) || a.origin !== location.origin || !eFoglio(a.pathname)) return;
  const pezzo = a.closest<HTMLElement>('[data-pezzo]');
  const cima = pila.at(-1);
  const nelFoglio = !!cima && cima.el.contains(a) && !html.classList.contains('is-tavolo');
  if (!pezzo && !nelFoglio) return;
  e.preventDefault();
  if (occupato) return;
  const url = a.pathname + a.search + a.hash;
  if (pezzo) {
    if (!html.classList.contains('is-tavolo') && pila.length) return;
    const id = pezzo.dataset.pezzo!;
    // se lo scaricamento non riesce: la pagina vera, che si apre da questa cella (in-arrivo)
    try { sessionStorage.setItem(ORIGINE, JSON.stringify({ href: a.pathname + a.search, id })); } catch {}
    if (!(await prepara(a))) return;
    partenza = cellaDi(a);
    history.pushState({ livello: 0, origine: { tavolo: id } }, '', url);
  } else {
    const sostituisci = a.hasAttribute('data-replace');
    if (!(await prepara(a, sostituisci))) return;
    partenza = cellaDi(a);
    const L = livello();
    if (sostituisci) history.replaceState({ livello: L, origine: { href: a.pathname } }, '', url);
    else history.pushState({ livello: L + 1, origine: { href: a.getAttribute('href')! } }, '', url);
  }
  segui();
});

// ── Avvio ────────────────────────────────────────────────
const el = document.querySelector<HTMLElement>('main[data-foglio]');
const hero = el?.querySelector<HTMLElement>('[data-hero]');
if (el && hero && retino) {
  // foglio già nella pagina (link diretto o caricamento vero): il primo della pila
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
  const f: Foglio = {
    percorso, el, hero, titolo: document.title, scroll: 0, qui: false, daFoglio,
    origine: daFoglio ? null : origineDi(0, percorso, { tavolo: id }),
  };
  pila.push(f);
  if (html.classList.contains('in-arrivo')) entra(f, { da: f.origine?.cella ?? null, retinoPieno: daFoglio });
  else {
    tavoloVivo(false);
    principale();
    if (f.origine) gsap.set(f.origine.nascondi, { visibility: 'hidden' });
  }
}

// le pagine delle celle del tavolo, scaricate in anticipo: subito quando il browser è libero, e comunque
// appena il puntatore si avvicina a una cella (anche nei fogli)
if (tavolo) {
  const percorsi = [...tavolo.v.el.querySelectorAll<HTMLAnchorElement>('[data-pezzo] a[href]')]
    .filter(a => a.origin === location.origin && eFoglio(a.pathname)).map(a => a.pathname);
  setTimeout(() => anticipa(percorsi), html.classList.contains('is-intro') ? 2000 : 300);
  const vicino = (e: Event) => {
    const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[href]');
    if (a && a.origin === location.origin && eFoglio(a.pathname)) carica(a.pathname).catch(() => {});
  };
  document.addEventListener('pointerover', vicino, { passive: true });
  document.addEventListener('pointerdown', vicino, { passive: true });
}
