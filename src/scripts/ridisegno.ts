/**
 * Cella `ridisegno` (G&A: il marchio storico ridisegnato con misure esatte, partendo da un braccio). Import dinamico da
 * cells.ts, solo se la cella c'è. L'SVG annotato (vedi tools/gea-ridisegno.mjs) è lo stato finale; qui una timeline
 * GSAP sola:
 * 1. il marchio vecchio, poi zoom sul braccio di sinistra (la vista è il viewBox) mentre gli altri tre spariscono;
 * 2. i quadratini sui vertici, uno dopo l'altro, poi i lati in rosso e le guide;
 * 3. il braccio prende la forma ridisegnata, ogni vertice verso il suo (le tappe di data-forme), e la vista lo segue;
 * 4. via i segni, zoom indietro e i tre bracci ridisegnati compaiono: il contrario dell'inizio.
 * Tutto passa da un oggetto `st` che GSAP anima e `disegna()` scrive nell'SVG a ogni fotogramma: punti del braccio,
 * viewBox, segni (quadratini sempre della stessa misura in pixel, qualunque sia lo zoom).
 * Parte quando se ne vede metà, ricomincia ogni volta che torna in vista. Righello Prima · Dopo (6/11/2026), come
 * l'evoluzione: il quadrato salta subito sullo stato scelto e l'animazione ci va; Dopo la fa (da capo se era al marchio
 * storico), Prima la riavvolge più veloce (INDIETRO), un clic sul disegno passa all'altro stato.
 * Senza script, o con riduci movimento, resta il marchio nuovo.
 */

import { gsap } from 'gsap';
import { REDUCED } from './preferenze';

const ZOOM = 1.4;        // s, zoom avanti e indietro
const SEGNI = 0.04;      // s tra un quadratino e l'altro
const FORMA = 1.8;       // s per tappa, il braccio che prende la forma nuova
const QUADRATINO = 7;    // px, lato dei quadratini sui vertici
const INDIETRO = 4;      // il ritorno al marchio storico è 4 volte più veloce

const NS = 'http://www.w3.org/2000/svg';
type P = [number, number];
type Box = [number, number, number, number];

const crea = <K extends keyof SVGElementTagNameMap>(tag: K, padre: Element, classe: string) => {
  const el = document.createElementNS(NS, tag);
  el.setAttribute('class', classe);
  padre.append(el);
  return el;
};

export function initRidisegni(signal: AbortSignal) {
  if (REDUCED) return;
  document.querySelectorAll<HTMLElement>('[data-ridisegno]').forEach(cella => {
    const svg = cella.querySelector<SVGSVGElement>('svg[data-disegno]');
    const box = cella.querySelector<HTMLButtonElement>('[data-rifai]');
    const braccio = svg?.querySelector<SVGPolygonElement>('[data-braccio]');
    const prima = svg?.querySelector<SVGGElement>('[data-prima]');
    const dopo = svg?.querySelector<SVGGElement>('[data-dopo]');
    const guide = svg?.querySelector<SVGGElement>('[data-guide]');
    if (!svg || !box || !braccio || !prima || !dopo || !guide) return;
    const leggi = <T>(el: Element, nome: string) => JSON.parse(el.getAttribute(nome)!) as T;
    const viste = leggi<Box[]>(svg, 'data-viste');
    const forme = leggi<P[][]>(braccio, 'data-forme');
    const segni = leggi<number[][]>(braccio, 'data-segni');
    const linee = leggi<[number, number][]>(braccio, 'data-linee');
    const [gialloPrima, gialloDopo] = leggi<string[]>(braccio, 'data-colori');
    const fine = { vista: svg.getAttribute('viewBox')!, punti: braccio.getAttribute('points')! };

    // i segni, dietro i quadratini le guide e i lati
    const tracce = linee.map(() => crea('line', guide, 'guida'));
    const lati = crea('polygon', guide, 'lati');
    const vertici = forme[0].map(() => crea('rect', guide, 'vertice'));

    // lo stato: vista (x, y, w, h), tappa della forma (0…3, anche a metà), segni (0…1), comparsa di ogni quadratino
    const st = { x: 0, y: 0, w: 1, h: 1, tappa: 0, segni: 0 };
    const comparsa = vertici.map(() => ({ s: 0 }));
    let pixel = { w: 1, h: 1 };
    const ro = new ResizeObserver(([e]) => { pixel = { w: e.contentRect.width, h: e.contentRect.height }; disegna(); });

    const tra = (a: number, b: number, t: number) => a + (b - a) * t;
    function disegna() {
      svg!.setAttribute('viewBox', `${st.x} ${st.y} ${st.w} ${st.h}`);
      const i = Math.min(Math.floor(st.tappa), forme.length - 2), t = st.tappa - i;
      const punti = forme[i].map((p, k): P => [tra(p[0], forme[i + 1][k][0], t), tra(p[1], forme[i + 1][k][1], t)]);
      const testo = punti.map(p => p.join(',')).join(' ');
      braccio!.setAttribute('points', testo);
      lati.setAttribute('points', testo);
      lati.style.opacity = String(st.segni);
      // un pixel dello schermo in unità del disegno (preserveAspectRatio meet: conta il lato più stretto)
      const u = 1 / Math.min(pixel.w / st.w, pixel.h / st.h);
      vertici.forEach((r, k) => {
        // comparsa (con un rimbalzo oltre 1) per quanto il vertice c'è in questa tappa
        const quanto = tra(segni[i][k], segni[i + 1][k], t) * comparsa[k].s;
        const l = QUADRATINO * u * quanto;
        r.setAttribute('x', String(punti[k][0] - l / 2));
        r.setAttribute('y', String(punti[k][1] - l / 2));
        r.setAttribute('width', String(l));
        r.setAttribute('height', String(l));
        r.style.opacity = String(Math.min(quanto, 1));
      });
      // le guide: i lati principali allungati ben oltre la vista
      const lungo = 4 * Math.max(st.w, st.h);
      tracce.forEach((g, k) => {
        const [a, b] = linee[k].map(n => punti[n]), dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        g.setAttribute('x1', String(a[0] - (dx / d) * lungo));
        g.setAttribute('y1', String(a[1] - (dy / d) * lungo));
        g.setAttribute('x2', String(b[0] + (dx / d) * lungo));
        g.setAttribute('y2', String(b[1] + (dy / d) * lungo));
        g.style.opacity = String(st.segni);
      });
    }

    const vista = (b: Box) => ({ x: b[0], y: b[1], w: b[2], h: b[3] });
    // il marchio vecchio, intero: l'inizio della timeline e lo stato da fermo fuori vista
    const inizio = () => {
      Object.assign(st, vista(viste[0]), { tappa: 0, segni: 0 });
      comparsa.forEach(c => (c.s = 0));
      gsap.set(prima, { opacity: 1 });
      gsap.set(dopo, { opacity: 0 });
      gsap.set(braccio, { fill: gialloPrima });
      disegna();
    };
    inizio();
    // il righello: il quadrato salta sullo stato dove si sta andando (0 prima, 1 dopo), come nell'evoluzione
    const righello = cella.querySelector<HTMLElement>('[data-righello]');
    const numero = cella.querySelector<HTMLElement>('[data-numero]');
    const tacche = [...cella.querySelectorAll<HTMLButtonElement>('[data-vai]')];
    const nomi = tacche.map(b => b.getAttribute('aria-label')!);
    const segna = (k: number) => {
      righello?.style.setProperty('--at', String(k));
      if (numero) numero.textContent = nomi[k];
      tacche.forEach((b, i) => (i === k ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    };

    const tl = gsap.timeline({ paused: true, onUpdate: disegna, defaults: { ease: 'power2.inOut' } })
      // zoom sul braccio di sinistra, gli altri spariscono; intanto gli angoli arrotondati diventano vivi
      .to(st, { ...vista(viste[1]), duration: ZOOM }, 0.6)
      .to(st, { tappa: 1, duration: ZOOM }, '<')
      .to(prima, { opacity: 0, duration: 0.5, ease: 'power1.out' }, '<0.2')
      .addLabel('vicino', 0.6 + ZOOM)
      // i vertici, uno dopo l'altro, poi lati e guide
      .to(comparsa, { s: 1, duration: 0.3, ease: 'back.out(2.5)', stagger: SEGNI }, 'vicino-=0.1')
      .to(st, { segni: 1, duration: 0.4, ease: 'power1.out' }, '>-0.3')
      // il braccio prende la forma ridisegnata, vertice per vertice (una tappa dopo l'altra, se ce n'è più d'una);
      // la vista segue il braccio
      .addLabel('forma', '>0.3')
      .to(st, { tappa: forme.length - 1, duration: FORMA * (forme.length - 2), ease: 'power2.inOut' }, 'forma')
      .to(st, { ...vista(viste[2]), duration: FORMA * (forme.length - 2) }, 'forma')
      .to(braccio, { fill: gialloDopo, duration: FORMA * (forme.length - 2), ease: 'power1.inOut' }, 'forma')
      // via i segni, poi il contrario dell'inizio: zoom indietro e i tre bracci nuovi
      .to(st, { segni: 0, duration: 0.4, ease: 'power1.in' }, '>0.4')
      .to(comparsa, { s: 0, duration: 0.3, ease: 'power1.in' }, '<')
      .to(st, { ...vista(viste[3]), duration: ZOOM }, '>0.1')
      .to(dopo, { opacity: 1, duration: 0.5, ease: 'power1.in' }, `<${ZOOM - 0.6}`);

    // initCells riparte (un foglio nuovo sopra): se era già finita resta com'è finché non esce di vista
    let partita = box.hasAttribute('data-fatto');
    if (partita) tl.progress(1);
    segna(partita ? 1 : 0);
    ro.observe(box);

    const daCapo = () => { tl.pause(0); inizio(); segna(0); };
    // dopo: il ridisegno (da capo se si era al marchio storico); prima: indietro, più veloce
    const avanti = () => { if (tl.progress() === 0) daCapo(); segna(1); tl.timeScale(1).play(); partita = true; };
    const indietro = () => { segna(0); tl.timeScale(INDIETRO).reverse(); partita = true; };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) { tl.timeScale(1); daCapo(); partita = false; }
      else if (e.intersectionRatio >= 0.5 && !partita) avanti();
    }, { threshold: [0, 0.5] });
    io.observe(box);
    // un clic sul disegno: verso l'altro stato (se sta andando avanti torna indietro, e il contrario)
    box.addEventListener('click', () => (tl.progress() === 0 || tl.reversed() ? avanti() : indietro()), { signal });
    tacche.forEach((b, i) => b.addEventListener('click', i === 0 ? indietro : avanti, { signal }));
    signal.addEventListener('abort', () => {
      io.disconnect();
      ro.disconnect();
      box.toggleAttribute('data-fatto', partita);
      tl.kill();
      // il file torna com'era: il marchio nuovo
      guide.replaceChildren();
      svg.setAttribute('viewBox', fine.vista);
      braccio.setAttribute('points', fine.punti);
      gsap.set(braccio, { clearProps: 'fill' });
      gsap.set([prima, dopo], { clearProps: 'opacity' });
    });
  });
}
