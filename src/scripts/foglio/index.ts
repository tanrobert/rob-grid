/**
 * Foglio aperto sopra il tavolo (components/foglio/Foglio.astro): le pagine info, extra, archivio e progetti
 * sono il tavolo con un foglio aperto sopra, anche da link diretto.
 * - Apertura (arrivo da una cella del tavolo, o indietro dopo una chiusura): la hero vola dalla cella
 *   d'origine al suo posto crescendo davvero (larghezza e altezza, come nel prototipo tools/pages/tavolo.html),
 *   il retino entra, le altre celle arrivano una dopo l'altra.
 * - Chiusura (✕, Esc, clic sulla hero o fuori dalle celle, celle "Indice"): il contrario, poi resta il tavolo,
 *   senza ricaricare, e l'indirizzo torna "/". Indietro riapre il foglio, avanti lo richiude.
 * - Arrivando da un altro foglio (archivio → progetto) la chiusura torna indietro, a quel foglio.
 * La hero che vola è una copia: quella vera resta nella griglia, che così non si ricompone.
 */
import { gsap } from 'gsap';
import { tavolo } from '../tavolo';
import { T } from '../tavolo/tempi';
import { homeTitle } from '../../data/site';

const html = document.documentElement;
const ORIGINE = 'tavolo:origine';

/** Click sinistro senza modificatori: gli altri (nuova scheda, ecc.) restano al browser */
const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

// clic su un link in una cella del tavolo: da quella cella si aprirà il foglio. I clic alla fine di un
// trascinamento non arrivano qui (li ferma scripts/tavolo/gesti.ts)
document.addEventListener('click', e => {
  const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[href]');
  const pezzo = a?.closest<HTMLElement>('[data-pezzo]');
  if (!a || !pezzo || e.defaultPrevented || !isPlainClick(e)) return;
  try { sessionStorage.setItem(ORIGINE, JSON.stringify({ href: a.pathname + a.search, id: pezzo.dataset.pezzo })); } catch {}
});

// precedente/successivo: la pagina sostituisce quella corrente nella cronologia, così la chiusura torna dove si era partiti
document.addEventListener('click', e => {
  const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[data-replace]');
  if (!a || e.defaultPrevented || !isPlainClick(e)) return;
  e.preventDefault();
  location.replace(a.href);
});

const foglio = document.querySelector<HTMLElement>('[data-foglio]');
const retino = document.querySelector<HTMLElement>('[data-retino]');
const hero = foglio?.querySelector<HTMLElement>('[data-hero]');
if (foglio && retino && hero) initFoglio(foglio, retino, hero);

function initFoglio(foglio: HTMLElement, retino: HTMLElement, hero: HTMLElement) {
  const percorso = location.pathname;
  const titolo = document.title;
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // arrivo da un altro foglio del sito (non dal tavolo): chiudere vuol dire tornare lì
  let daFoglio = false;
  try {
    const r = new URL(document.referrer);
    daFoglio = r.origin === location.origin && r.pathname !== '/' && r.pathname !== percorso;
  } catch {}

  /** La cella del tavolo da cui il foglio si apre e in cui si chiude: quella cliccata, se no la prima che porta qui */
  const origine = (() => {
    if (daFoglio || !tavolo) return null;
    let id: string | undefined;
    try {
      const o = JSON.parse(sessionStorage.getItem(ORIGINE) ?? 'null');
      if (o?.href === percorso + location.search) id = o.id;
    } catch {}
    return tavolo.pezzi.find(p => p.id === id)
      ?? tavolo.pezzi.find(p => p.el.querySelector(`:scope > a.cell[href="${percorso}"]`))
      ?? null;
  })();
  const cellaOrigine = origine?.el.querySelector<HTMLElement>(':scope > .cell') ?? null;

  /** Tutto il foglio tranne la hero: celle e, nell'archivio, la striscia dei tag */
  const altre = () => [...foglio.querySelectorAll<HTMLElement>(':scope > .grid > .cell:not([data-hero]):not([hidden]), :scope > :not(.grid)')];

  /** La hero che vola: una copia fuori dalla griglia, ferma nella finestra */
  const copia = (r: DOMRect) => {
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
  };
  const vola = (el: HTMLElement, r: DOMRect, duration: number) =>
    gsap.to(el, { x: r.left, y: r.top, width: r.width, height: r.height, duration: T(duration), ease: 'power3.inOut' });

  /** Foto della hero pronta prima del volo: se no la copia volerebbe vuota (al massimo 600ms) */
  const fotoPronta = () => {
    const img = hero.querySelector('img');
    return img ? Promise.race([img.decode().catch(() => {}), sleep(600)]) : Promise.resolve();
  };

  const tavoloVivo = (vivo: boolean) => {
    html.classList.toggle('is-tavolo', vivo);
    if (tavolo) tavolo.v.el.inert = !vivo;
  };

  let aperto = true;
  let inVolo = false;

  async function apri({ dalTavolo = true, fuoco = false } = {}) {
    aperto = inVolo = true;
    tavoloVivo(false);
    document.title = titolo;
    scrollTo(0, 0);
    const resto = altre();
    gsap.set(resto, { opacity: 0 });
    gsap.set(hero, { visibility: 'hidden' });
    // arrivando da un altro foglio il retino c'era già
    gsap.set(retino, { opacity: dalTavolo ? 0 : 1 });
    html.classList.remove('in-arrivo');

    await fotoPronta();
    const fine = hero.getBoundingClientRect();
    gsap.to(retino, { opacity: 1, duration: T(0.3), ease: 'power1.out' });
    // i dettagli arrivano quando il foglio è quasi al suo posto, uno dopo l'altro
    const q = parseFloat(getComputedStyle(foglio).getPropertyValue('--gap')) || 20;
    gsap.fromTo(resto, { y: q * 0.5 }, {
      opacity: 1, y: 0, duration: T(0.3), ease: 'power2.out', stagger: T(0.03), delay: T(dalTavolo ? 0.32 : 0.05),
      clearProps: 'opacity,transform',
    });
    if (dalTavolo && cellaOrigine && origine) {
      const v = copia(cellaOrigine.getBoundingClientRect());
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
    if (storia) history.pushState(null, '', '/');
    inVolo = true;
    document.title = homeTitle;
    const resto = altre();
    gsap.to(resto, { opacity: 0, duration: T(0.14), ease: 'power1.in' });
    gsap.to(retino, { opacity: 0, duration: T(0.38), delay: T(0.1), ease: 'power1.inOut' });
    if (cellaOrigine && origine) {
      const v = copia(hero.getBoundingClientRect());
      gsap.set(hero, { visibility: 'hidden' });
      await vola(v, cellaOrigine.getBoundingClientRect(), 0.48);
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
    const link = cellaOrigine?.matches('a') ? cellaOrigine : cellaOrigine?.querySelector<HTMLElement>('a');
    link?.focus({ preventScroll: true });
    finito();
  }

  // fine di un volo: se nel frattempo è cambiato l'indirizzo (indietro/avanti a metà), il foglio lo segue
  function finito() {
    inVolo = false;
    segui();
  }
  function segui() {
    if (inVolo) return;
    const qui = location.pathname === percorso;
    if (qui && !aperto) apri({ fuoco: true });
    else if (!qui && aperto) chiudi({ storia: false });
  }
  addEventListener('popstate', segui);

  const chiusura = () => {
    if (!aperto || inVolo) return;
    if (daFoglio) history.back();
    else chiudi();
  };

  /** Clic sulla hero (fuori da link e comandi, senza testo appena selezionato) o fuori dalle celle */
  const fuori = (t: Element) =>
    (!!t.closest('.cell[data-hero]') && !t.closest('a, button, input, select, textarea, label, [role="switch"]') && !!getSelection()?.isCollapsed)
    || t === foglio || t === retino || t.matches('.grid');

  // in cattura: prima dei link
  document.addEventListener('click', e => {
    if (!aperto || !isPlainClick(e)) return;
    const t = e.target as Element;
    if (!t.closest('a[data-close]') && !fuori(t)) return;
    e.preventDefault();
    chiusura();
  }, { capture: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') chiusura(); });

  // arrivo da una cella del tavolo o da un altro foglio: il foglio entra. Da un link esterno c'è già (intro)
  if (html.classList.contains('in-arrivo')) apri({ dalTavolo: !daFoglio });
  else tavoloVivo(false);
}
