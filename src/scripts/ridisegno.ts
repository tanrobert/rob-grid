/**
 * Cella `ridisegno` (G&A: il marchio storico ridisegnato con misure esatte, partendo da un braccio). Import dinamico da
 * cells.ts, solo se la cella c'è. L'SVG annotato (vedi tools/gea-ridisegno.mjs) è lo stato finale; qui una timeline
 * GSAP sola:
 * 1. il marchio vecchio, poi zoom sul braccio di sinistra (la vista è il viewBox) mentre gli altri tre spariscono: il
 *    braccio resta quello del file, curve e imperfezioni comprese;
 * 2. a zoom finito compaiono tutti insieme i quadratini degli ancoraggi, le maniglie, i lati in rosso e le guide;
 * 3. il braccio prende la forma ridisegnata, ancoraggi e maniglie verso i loro punti (le tappe di data-forme: le
 *    maniglie si chiudono, i lati si raddrizzano), e la vista lo segue;
 * 4. via i segni, zoom indietro e i tre bracci ridisegnati compaiono: il contrario dell'inizio.
 * Tutto passa da un oggetto `st` che GSAP anima e `disegna()` scrive nell'SVG a ogni fotogramma: tracciato del braccio,
 * viewBox, segni (quadratini e maniglie sempre della stessa misura in pixel, qualunque sia lo zoom).
 * Parte quando se ne vede metà, ricomincia ogni volta che torna in vista. Righello Prima · Dopo (6/11/2026), come
 * l'evoluzione: il quadrato salta subito sullo stato scelto e l'animazione ci va; Dopo la fa (da capo se era al marchio
 * storico), Prima torna subito al marchio storico con una sfumata breve (SFUMA), un clic sul disegno passa all'altro stato.
 * Senza script, o con riduci movimento, resta il marchio nuovo.
 */

import { gsap } from 'gsap';
import { REDUCED } from './preferenze';

const ZOOM = 1.4;        // s, zoom avanti e indietro
const FORMA = 1.8;       // s per tappa, il braccio che prende la forma nuova
const QUADRATINO = 7;    // px, lato dei quadratini sugli ancoraggi
const PRESA = 2.5;       // px, raggio del pallino in cima alle maniglie
const SFUMA = 0.3;       // s, la sfumata del ritorno al marchio storico (subito, senza riavvolgere)

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
    const braccio = svg?.querySelector<SVGPathElement>('[data-braccio]');
    const prima = svg?.querySelector<SVGGElement>('[data-prima]');
    const dopo = svg?.querySelector<SVGGElement>('[data-dopo]');
    const guide = svg?.querySelector<SVGGElement>('[data-guide]');
    if (!svg || !box || !braccio || !prima || !dopo || !guide) return;
    const leggi = <T>(el: Element, nome: string) => JSON.parse(el.getAttribute(nome)!) as T;
    const viste = leggi<Box[]>(svg, 'data-viste');
    const forme = leggi<P[][]>(braccio, 'data-forme');
    const linee = leggi<[number, number][]>(braccio, 'data-linee');
    const [gialloPrima, gialloDopo] = leggi<string[]>(braccio, 'data-colori');
    const fine = { vista: svg.getAttribute('viewBox')!, d: braccio.getAttribute('d')! };
    // ogni segmento sono tre punti: ancoraggio, maniglia d'uscita, maniglia d'entrata dell'ancoraggio dopo
    const n = forme[0].length / 3;
    const dopoDi = (k: number) => 3 * ((k + 1) % n);

    // i segni: dietro le guide, poi i lati, le maniglie e sopra i quadratini
    const tracce = linee.map(() => crea('line', guide, 'guida'));
    const lati = crea('path', guide, 'lati');
    const aste = forme[0].map((_, k) => (k % 3 ? crea('line', guide, 'maniglia') : null));
    const prese = forme[0].map((_, k) => (k % 3 ? crea('circle', guide, 'presa') : null));
    const vertici = Array.from({ length: n }, () => crea('rect', guide, 'vertice'));

    // lo stato: vista (x, y, w, h), tappa della forma (0…1, anche a metà), segni (0…1, con un rimbalzo oltre 1)
    const st = { x: 0, y: 0, w: 1, h: 1, tappa: 0, segni: 0 };
    let pixel = { w: 1, h: 1 };
    const ro = new ResizeObserver(([e]) => { pixel = { w: e.contentRect.width, h: e.contentRect.height }; disegna(); });

    const tra = (a: number, b: number, t: number) => a + (b - a) * t;
    function disegna() {
      svg!.setAttribute('viewBox', `${st.x} ${st.y} ${st.w} ${st.h}`);
      const i = Math.min(Math.floor(st.tappa), forme.length - 2), t = st.tappa - i;
      const punti = forme[i].map((p, k): P => [tra(p[0], forme[i + 1][k][0], t), tra(p[1], forme[i + 1][k][1], t)]);
      // M ancoraggio, poi C maniglia, maniglia, ancoraggio dopo (lo stesso calcolo in tools/gea-ridisegno.mjs)
      let d = `M${punti[0]}`;
      for (let k = 0; k < n; k++) d += `C${punti[3 * k + 1]} ${punti[3 * k + 2]} ${punti[dopoDi(k)]}`;
      d += 'Z';
      braccio!.setAttribute('d', d);
      lati.setAttribute('d', d);
      const visibile = Math.min(st.segni, 1);
      lati.style.opacity = String(visibile);
      // un pixel dello schermo in unità del disegno (preserveAspectRatio meet: conta il lato più stretto)
      const u = 1 / Math.min(pixel.w / st.w, pixel.h / st.h);
      vertici.forEach((r, k) => {
        const l = QUADRATINO * u * st.segni, [x, y] = punti[3 * k];
        r.setAttribute('x', String(x - l / 2));
        r.setAttribute('y', String(y - l / 2));
        r.setAttribute('width', String(l));
        r.setAttribute('height', String(l));
        r.style.opacity = String(visibile);
      });
      // le maniglie, dal loro ancoraggio (quello prima per l'uscita, quello dopo per l'entrata): chiudendosi
      // sull'ancoraggio sfumano
      aste.forEach((a, k) => {
        if (!a) return;
        const [x, y] = punti[k], [ax, ay] = punti[k % 3 === 1 ? k - 1 : dopoDi((k - 2) / 3)];
        const aperta = String(Math.min(Math.hypot(x - ax, y - ay) / u / (2 * PRESA), 1) * visibile);
        a.setAttribute('x1', String(ax));
        a.setAttribute('y1', String(ay));
        a.setAttribute('x2', String(x));
        a.setAttribute('y2', String(y));
        a.style.opacity = aperta;
        const c = prese[k]!;
        c.setAttribute('cx', String(x));
        c.setAttribute('cy', String(y));
        c.setAttribute('r', String(PRESA * u * st.segni));
        c.style.opacity = aperta;
      });
      // le guide: i lati principali allungati ben oltre la vista
      const lungo = 4 * Math.max(st.w, st.h);
      tracce.forEach((g, k) => {
        const [a, b] = linee[k].map(v => punti[3 * v]), dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        g.setAttribute('x1', String(a[0] - (dx / d) * lungo));
        g.setAttribute('y1', String(a[1] - (dy / d) * lungo));
        g.setAttribute('x2', String(b[0] + (dx / d) * lungo));
        g.setAttribute('y2', String(b[1] + (dy / d) * lungo));
        g.style.opacity = String(visibile);
      });
    }

    const vista = (b: Box) => ({ x: b[0], y: b[1], w: b[2], h: b[3] });
    // il marchio vecchio, intero: l'inizio della timeline e lo stato da fermo fuori vista
    const inizio = () => {
      Object.assign(st, vista(viste[0]), { tappa: 0, segni: 0 });
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
      // zoom sul braccio di sinistra, gli altri spariscono; il braccio resta com'è
      .to(st, { ...vista(viste[1]), duration: ZOOM }, 0.6)
      .to(prima, { opacity: 0, duration: 0.5, ease: 'power1.out' }, '<0.2')
      // a zoom finito, tutti insieme: quadratini, maniglie, lati e guide
      .to(st, { segni: 1, duration: 0.35, ease: 'back.out(2.5)' }, 0.6 + ZOOM)
      // il braccio prende la forma ridisegnata, ancoraggi e maniglie insieme (una tappa dopo l'altra, se ce n'è più
      // d'una); la vista segue il braccio
      .addLabel('forma', '>0.4')
      .to(st, { tappa: forme.length - 1, duration: FORMA * (forme.length - 1), ease: 'power2.inOut' }, 'forma')
      .to(st, { ...vista(viste[2]), duration: FORMA * (forme.length - 1) }, 'forma')
      .to(braccio, { fill: gialloDopo, duration: FORMA * (forme.length - 1), ease: 'power1.inOut' }, 'forma')
      // via i segni, poi il contrario dell'inizio: zoom indietro e i tre bracci nuovi
      .to(st, { segni: 0, duration: 0.4, ease: 'power1.in' }, '>0.4')
      .to(st, { ...vista(viste[3]), duration: ZOOM }, '>0.1')
      .to(dopo, { opacity: 1, duration: 0.5, ease: 'power1.in' }, `<${ZOOM - 0.6}`);

    // initCells riparte (un foglio nuovo sopra): se era già finita resta com'è finché non esce di vista
    let partita = box.hasAttribute('data-fatto');
    if (partita) tl.progress(1);
    segna(partita ? 1 : 0);
    ro.observe(box);

    const daCapo = () => { tl.pause(0); inizio(); segna(0); };
    // dopo: il ridisegno (da capo se si era al marchio storico); prima: subito il marchio storico, con una sfumata breve
    // (9/11/2026, scelta di Roberto: riavvolta faceva rivedere l'animazione; come l'evoluzione tornando al passo 1)
    const avanti = () => { if (tl.progress() === 0) daCapo(); segna(1); tl.play(); partita = true; };
    const indietro = () => {
      daCapo();
      gsap.fromTo(svg, { opacity: 0 }, { opacity: 1, duration: SFUMA, ease: 'power1.out', overwrite: true });
      partita = true;
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) { daCapo(); partita = false; }
      else if (e.intersectionRatio >= 0.5 && !partita) avanti();
    }, { threshold: [0, 0.5] });
    io.observe(box);
    // un clic sul disegno: verso l'altro stato (se sta andando avanti torna indietro, e il contrario)
    box.addEventListener('click', () => (tl.progress() === 0 ? avanti() : indietro()), { signal });
    tacche.forEach((b, i) => b.addEventListener('click', i === 0 ? indietro : avanti, { signal }));
    signal.addEventListener('abort', () => {
      io.disconnect();
      ro.disconnect();
      box.toggleAttribute('data-fatto', partita);
      tl.kill();
      gsap.killTweensOf(svg);
      // il file torna com'era: il marchio nuovo
      guide.replaceChildren();
      svg.setAttribute('viewBox', fine.vista);
      braccio.setAttribute('d', fine.d);
      gsap.set(braccio, { clearProps: 'fill' });
      gsap.set([prima, dopo, svg], { clearProps: 'opacity' });
    });
  });
}
