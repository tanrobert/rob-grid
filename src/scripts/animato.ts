/**
 * Celle `animato` (components/cells/AnimatoCell.astro; G&A, 6/11/2026: la firma che si scrive, il marchio dei 90 anni
 * che arriva a pezzi). Import dinamico da cells.ts, solo se la cella c'è. Parte quando se ne vede metà, ricomincia ogni
 * volta che torna in vista, un clic la rifà. Riduci movimento: niente, il disegno resta finito com'è nel file.
 *
 * Vocabolario delle annotazioni, sui gruppi dell'SVG (scritte a mano nella sorgente in sorgenti/, che
 * tools/svg-testo-tracciati.py --glifi porta in tracciati lasciandole com'erano):
 * - data-passo="n"     quando parte: 1, 2, … Stesso numero = insieme; il passo dopo parte quando è finito il più lungo
 *                      di quello prima (meno ACCAVALLO).
 * - data-scrivi        i tracciati dentro si scrivono uno dopo l'altro: ognuno si scopre lungo la sua riga (l'asse x del
 *                      suo sistema, quindi anche inclinata), alla stessa velocità per tutti (VELOCITA).
 * - data-da="dx dy"    arriva da lì (unità del disegno) sfumando; "0 0" sfuma soltanto.
 * - data-gira="cx cy g" gira attorno a (cx, cy) da g gradi a 0, mentre i figli compaiono uno alla volta.
 * - data-durata="s"    durata del gruppo, al posto di quella di base del suo tipo.
 */

import { gsap } from 'gsap';
import { REDUCED } from './preferenze';

const VELOCITA = 0.75;   // la penna di data-scrivi: larghezze del disegno al secondo
const ARRIVO = 0.7;      // s di data-da
const GIRO = 1.2;        // s di data-gira
const ACCAVALLO = 0.15;  // s: il passo dopo parte un poco prima della fine di quello prima
const NS = 'http://www.w3.org/2000/svg';

export function initAnimati(signal: AbortSignal) {
  if (REDUCED) return;
  document.querySelectorAll<HTMLElement>('[data-animato]').forEach((cella, n) => {
    const svg = cella.querySelector<SVGSVGElement>('svg[data-disegno]');
    const box = cella.querySelector<HTMLButtonElement>('[data-rifai]');
    if (!svg || !box) return;
    const larghezza = svg.viewBox.baseVal.width || 1;
    const gruppi = [...svg.querySelectorAll<SVGGElement>('[data-passo]')];
    const durata = (g: Element, base: number) => Number(g.getAttribute('data-durata')) || base;

    // le maschere della scrittura: un rettangolo per tracciato, nel suo sistema, che si allarga lungo la riga
    const defs = document.createElementNS(NS, 'defs');
    const maschere: SVGRectElement[] = [];
    const scritti: SVGGraphicsElement[] = [];
    let tl: gsap.core.Timeline | null = null;

    // si prepara quando la cella si avvicina alla finestra: le misure (getBBox) servono a foglio visibile, e un foglio
    // si monta nascosto (scripts/foglio)
    const prepara = () => {
      if (tl) return tl;
      svg.prepend(defs);
      tl = gsap.timeline({ paused: true });
      componi(tl);
      return tl;
    };

    // un passo dopo l'altro: ogni gruppo aggiunge la sua animazione al passo; il passo dura quanto il più lungo
    const componi = (tl: gsap.core.Timeline) => {
      const passi = [...new Set(gruppi.map(g => Number(g.dataset.passo)))].sort((a, b) => a - b);
      let t = 0.2;
      for (const p of passi) {
        let fine = t;
        for (const g of gruppi.filter(g => Number(g.dataset.passo) === p)) {
          let d = 0;
          if ('scrivi' in g.dataset) {
            let at = t;
            for (const el of g.querySelectorAll<SVGGraphicsElement>('path, polygon, rect, circle, ellipse')) {
              const b = el.getBBox();
              const margine = b.height * 0.1;
              const rect = document.createElementNS(NS, 'rect');
              Object.entries({ x: b.x - margine, y: b.y - margine, width: 0, height: b.height + margine * 2 })
                .forEach(([k, v]) => rect.setAttribute(k, String(v)));
              const clip = document.createElementNS(NS, 'clipPath');
              clip.id = `animato-${n}-${maschere.length}`;
              clip.append(rect);
              defs.append(clip);
              el.setAttribute('clip-path', `url(#${clip.id})`);
              maschere.push(rect);
              scritti.push(el);
              const s = durata(g, 0) || (b.width + margine * 2) / (larghezza * VELOCITA);
              tl.fromTo(rect, { attr: { width: 0 } }, { attr: { width: b.width + margine * 2 }, duration: s, ease: 'none' }, at);
              at += s;
            }
            d = at - t;
          } else if (g.dataset.da) {
            const [x, y] = g.dataset.da.split(/\s+/).map(Number);
            d = durata(g, ARRIVO);
            tl.fromTo(g, { x, y, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: d, ease: 'power3.out' }, t);
          } else if (g.dataset.gira) {
            const [cx, cy, gradi] = g.dataset.gira.split(/\s+/).map(Number);
            d = durata(g, GIRO);
            const figli = [...g.children];
            tl.fromTo(g, { rotation: gradi, svgOrigin: `${cx} ${cy}`, smoothOrigin: false },
              { rotation: 0, svgOrigin: `${cx} ${cy}`, smoothOrigin: false, duration: d, ease: 'power3.out' }, t);
            tl.fromTo(figli, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out', stagger: (d * 0.6) / figli.length }, t);
          }
          fine = Math.max(fine, t + d);
        }
        t = fine - ACCAVALLO;
      }
    };

    // initCells riparte (un foglio nuovo sopra): se era già finita resta com'è finché non esce di vista
    let partita = box.hasAttribute('data-fatto');

    const parti = () => { prepara().restart(); partita = true; };
    // vicina alla finestra: pronta e al punto di partenza, così entrando in vista non si vede finita
    const vicino = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !partita) prepara().pause(0);
    }, { rootMargin: '50% 0px' });
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) { tl?.pause(0); partita = false; }
      else if (e.intersectionRatio >= 0.5 && !partita) parti();
    }, { threshold: [0, 0.5] });
    vicino.observe(box);
    io.observe(box);
    box.addEventListener('click', parti, { signal });

    signal.addEventListener('abort', () => {
      vicino.disconnect();
      io.disconnect();
      box.toggleAttribute('data-fatto', partita);
      tl?.kill();
      // il file torna com'era: il disegno finito
      defs.remove();
      scritti.forEach(el => el.removeAttribute('clip-path'));
      gsap.set(gruppi, { clearProps: 'all' });
      gruppi.forEach(g => gsap.set([...g.children], { clearProps: 'opacity' }));
    });
  });
}
