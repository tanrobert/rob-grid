/**
 * Cella `costruzione` (Purple Piper: la P del logo). Import dinamico da cells.ts, solo se la cella c'è.
 * I tratti dell'SVG (preparato da lib/costruzione.ts) si disegnano come con una penna, a velocità costante:
 * - i livelli del file (figli dell'<svg>) uno dopo l'altro, con una pausa;
 * - dentro un gruppo i pezzi uno dopo l'altro (la penna fa il giro: angolino, linea, curva…), ma i gruppi fratelli
 *   e i sottotracciati di un tracciato composto insieme (contorno esterno e occhiello nello stesso momento);
 * - i tratti pieni si allungano (dashoffset), i tratteggiati si scoprono con la copia piena nella loro maschera.
 * Parte quando se ne vede metà, ricomincia ogni volta che torna in vista; un clic lo rifà da capo.
 * Senza script, o con riduci movimento, il disegno è già completo.
 */

import { REDUCED } from './preferenze';

const VELOCITA = 2400;  // unità del disegno al secondo
const PAUSA = 150;      // penna alzata tra un livello e l'altro, ms

/** anima `nodo` a partire da `t` (ms) e restituisce quando finisce */
function disegna(nodo: Element, t: number, an: Animation[]): number {
  if (nodo instanceof SVGGElement) {
    const figli = [...nodo.children];
    const insieme = nodo.hasAttribute('data-composto') || figli.every(f => f instanceof SVGGElement);
    return insieme ? Math.max(t, ...figli.map(f => disegna(f, t, an)))
      : figli.reduce((fine, f) => disegna(f, fine, an), t);
  }
  if (!(nodo instanceof SVGGeometryElement) || !nodo.hasAttribute('data-tratto')) return t;
  // tratteggiato: si anima la copia piena nella sua maschera
  const maschera = nodo.getAttribute('mask')?.match(/#([^)]+)/)?.[1];
  const penna = maschera ? nodo.ownerSVGElement!.querySelector(`#${maschera} [data-penna]`)! : nodo;
  const dur = nodo.getTotalLength() / VELOCITA * 1000;
  an.push(penna.animate([{ strokeDashoffset: 1.02 }, { strokeDashoffset: 0 }], { duration: dur, delay: t, fill: 'both' }));
  return t + dur;
}

export function initCostruzioni(signal: AbortSignal) {
  if (REDUCED) return;
  document.querySelectorAll<HTMLElement>('[data-costruzione]').forEach(cella => {
    const svg = cella.querySelector<SVGSVGElement>('svg[data-disegno]');
    if (!svg) return;
    const an: Animation[] = [];
    let t = 0;
    for (const livello of svg.children) if (livello.tagName !== 'defs') t = disegna(livello, t, an) + PAUSA;

    const daCapo = (parti: boolean) => an.forEach(a => { a.currentTime = 0; parti ? a.play() : a.pause(); });
    // initCells riparte (un foglio nuovo sopra): se era già disegnato resta com'è finché non esce di vista
    let partito = svg.hasAttribute('data-fatto');
    if (partito) an.forEach(a => a.finish()); else daCapo(false);

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) { daCapo(false); partito = false; }
      else if (e.intersectionRatio >= 0.5 && !partito) { daCapo(true); partito = true; }
    }, { threshold: [0, 0.5] });
    io.observe(svg);
    svg.parentElement!.addEventListener('click', () => { daCapo(true); partito = true; }, { signal });
    signal.addEventListener('abort', () => {
      io.disconnect();
      svg.toggleAttribute('data-fatto', partito);
      an.forEach(a => a.cancel());
    });
  });
}
