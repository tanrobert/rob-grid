/**
 * Icone della cella `punti` (G&A: gli obiettivi del restyling). Import dinamico da cells.ts, solo se la cella c'è, col
 * mouse e senza riduci movimento. Col mouse sul riquadro l'icona fa la sua animazione una volta e torna com'era (ogni
 * timeline finisce nello stato di partenza); se è già in corso non riparte. Pezzi e ritagli in PuntiCell.astro.
 * Misure in unità del disegno (alto 100): GSAP muove gli elementi SVG nelle loro unità.
 */

import { gsap } from 'gsap';

const TIMELINE: Record<string, (svg: SVGSVGElement) => gsap.core.Timeline> = {
  // la linea resta ferma; la punta esce a destra dal quadrato (ritaglio), rientra da sinistra e torna al suo posto
  frecce: svg => {
    const f = svg.querySelector('[data-freccia]');
    return gsap.timeline({ paused: true })
      .to(f, { x: 80, duration: 0.35, ease: 'power2.in' })
      .set(f, { x: -70 })
      .to(f, { x: 0, duration: 0.5, ease: 'power3.out' });
  },
  // il cerchio diventa quadrato e il quadrato cerchio, poi al contrario
  'cerchio-quadrato': svg => {
    const c = svg.querySelector('[data-cerchio]');
    const q = svg.querySelector('[data-quadrato]');
    return gsap.timeline({ paused: true, defaults: { duration: 0.5, ease: 'power2.inOut' } })
      .to(c, { attr: { rx: 0 } }).to(q, { attr: { rx: 50 } }, '<')
      .to(c, { attr: { rx: 50 } }, '+=0.25').to(q, { attr: { rx: 0 } }, '<');
  },
  // due linee dividono il quadrato in basso a destra, poi la griglia lo porta a tutto il riquadro (scala 2 attorno
  // all'angolo in basso a destra): la figura è di nuovo quella di partenza e si rimette a posto di colpo
  quadrati: svg => {
    const zoom = svg.querySelector('[data-zoom]');
    // data-traccia="y2 100": l'attributo che allunga la linea e dove arriva
    const linee = [...svg.querySelectorAll<SVGElement>('[data-traccia]')].map(l => {
      const [attr, fine] = l.dataset.traccia!.split(' ');
      return { l, attr, inizio: Number(l.getAttribute(attr)), fine: Number(fine) };
    });
    const tl = gsap.timeline({ paused: true });
    linee.forEach(({ l, attr, fine }, i) => tl.to(l, { attr: { [attr]: fine }, duration: 0.35, ease: 'power2.out' }, i * 0.05));
    tl.to(zoom, { scale: 2, svgOrigin: '100 100', smoothOrigin: false, duration: 0.7, ease: 'power2.inOut' }, '+=0.15')
      .set(zoom, { scale: 1 });
    linee.forEach(({ l, attr, inizio }) => tl.set(l, { attr: { [attr]: inizio } }, '<'));
    return tl;
  },
  // gira di 90° attorno al centro, poi le linee si cancellano da un capo all'altro e si ritracciano
  mirino: svg => {
    const gira = svg.querySelector('[data-gira]');
    // data-ritraccia="y": la linea corre lungo y da 0 a 100. Il capo d'inizio la insegue fino in fondo (si cancella),
    // poi la linea si ritraccia dallo stesso inizio fino in fondo
    const linee = svg.querySelectorAll<SVGElement>('[data-ritraccia]');
    const tl = gsap.timeline({ paused: true })
      .to(gira, { rotation: 90, svgOrigin: '50 50', smoothOrigin: false, duration: 0.6, ease: 'power2.inOut' });
    linee.forEach(l => {
      const a = l.dataset.ritraccia!;
      tl.to(l, { attr: { [`${a}1`]: 100 }, duration: 0.4, ease: 'power2.in' }, 0.7)
        .set(l, { attr: { [`${a}1`]: 0, [`${a}2`]: 0 } }, 1.1)
        .to(l, { attr: { [`${a}2`]: 100 }, duration: 0.5, ease: 'power3.out' }, 1.1);
    });
    // girata di 90° la croce è quella di partenza: si rimette a zero senza che si veda
    return tl.set(gira, { rotation: 0 });
  },
};

export function initPunti(signal: AbortSignal) {
  document.querySelectorAll<SVGSVGElement>('svg[data-icona]').forEach(svg => {
    const tl = TIMELINE[svg.dataset.icona!]?.(svg);
    const punto = svg.closest('.punto');
    if (!tl || !punto) return;
    punto.addEventListener('mouseenter', () => { if (!tl.isActive()) tl.restart(); }, { signal });
    signal.addEventListener('abort', () => tl.progress(0).kill(), { once: true });
  });
}
