/**
 * Cella `costruzione` (Purple Piper: la P del logo). Import dinamico da cells.ts, solo se la cella c'è.
 * I tratti dell'SVG (preparato da lib/costruzione.ts) si disegnano come con una penna, a velocità costante:
 * - i livelli del file (figli dell'<svg>) uno dopo l'altro, con una pausa;
 * - dentro un gruppo i pezzi uno dopo l'altro (la penna fa il giro: angolino, linea, curva…), ma i gruppi fratelli
 *   e i sottotracciati di un tracciato composto insieme (contorno esterno e occhiello nello stesso momento);
 * - i tratti pieni si allungano (dashoffset), i tratteggiati si scoprono con la copia piena nella loro maschera;
 * - a tratti finiti entrano le campiture (data-pieno), poi cade l'ombra (data-ombra: un gruppo che non si disegna):
 *   esce da sotto il disegno, di colpo, come le celle che atterrano sul tavolo (la P di Purple Piper coi colori).
 * Parte quando se ne vede metà, ricomincia ogni volta che torna in vista; un clic lo rifà da capo.
 * Senza script, o con riduci movimento, il disegno è già completo.
 */

import { REDUCED } from './preferenze';

// altezze del disegno al secondo (del più alto, coi disegni affiancati: sono alla stessa scala, la penna va uguale in
// tutti): la stessa velocità qualunque sia la misura del file (circa le 2400 unità al secondo della P di costruzione)
const VELOCITA = 2.8;
const PAUSA = 150;      // penna alzata tra un livello e l'altro, ms
const PIENO = 240;      // campiture che entrano, ms
const OMBRA = 180;      // l'ombra che cade, ms (come pezzo-atterra in components/tavolo)

/** anima `nodo` a partire da `t` (ms), con la penna a `v` unità del disegno al ms, e restituisce quando finisce */
function disegna(nodo: Element, t: number, an: Animation[], v: number): number {
  if (nodo.hasAttribute('data-ombra')) return t;
  if (nodo instanceof SVGGElement) {
    const figli = [...nodo.children];
    // dentro un data-in-fila (lib/costruzione.ts) una cosa alla volta: anche i sottotracciati (prima il contorno, poi
    // il buco), con la penna che si alza tra l'una e l'altra
    const inFila = !!nodo.closest('[data-in-fila]');
    const insieme = (nodo.hasAttribute('data-composto') && !inFila) || figli.every(f => f instanceof SVGGElement);
    // in fila: nell'ordine dei livelli, o in quello di data-ordine se c'è (lib/costruzione.ts)
    const turno = (f: Element) => Number(f.getAttribute('data-ordine') ?? Infinity);
    const passo = (fine: number, f: Element) => {
      const dopo = disegna(f, fine, an, v);
      return inFila && dopo > fine ? dopo + PAUSA : dopo;
    };
    return insieme ? Math.max(t, ...figli.map(f => disegna(f, t, an, v)))
      : figli.sort((a, b) => (turno(a) - turno(b)) || 0).reduce(passo, t);
  }
  if (!(nodo instanceof SVGGeometryElement) || !nodo.hasAttribute('data-tratto')) return t;
  // tratteggiato: si anima la copia piena nella sua maschera
  const maschera = nodo.getAttribute('mask')?.match(/#([^)]+)/)?.[1];
  const penna = maschera ? nodo.ownerSVGElement!.querySelector(`#${maschera} [data-penna]`)! : nodo;
  const dur = nodo.getTotalLength() / v;
  an.push(penna.animate([{ strokeDashoffset: 1.02 }, { strokeDashoffset: 0 }], { duration: dur, delay: t, fill: 'both' }));
  return t + dur;
}

/** tutto il disegno di un SVG, da t = 0: tratti, campiture, ombra */
function programma(svg: SVGSVGElement, an: Animation[], v: number) {
  let t = 0;
  for (const livello of svg.children) if (livello.tagName !== 'defs') t = disegna(livello, t, an, v) + PAUSA;
  // le campiture fuori dall'ombra entrano insieme
  const pieni = [...svg.querySelectorAll('[data-pieno]')].filter(el => !el.closest('[data-ombra]'));
  pieni.forEach(el => an.push(el.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: PIENO, delay: t, fill: 'both', easing: 'ease-out' })));
  if (pieni.length) t += PIENO;
  // l'ombra: parte sotto il disegno (il suo angolo in basso a sinistra su quello del primo pieno: l'ombra della P,
  // l'estrusione della croce), poi esce di colpo dove sta nel file, comparendo mentre scivola
  svg.querySelectorAll<SVGGraphicsElement>('[data-ombra]').forEach(ombra => {
    const sotto = pieni[0] as SVGGraphicsElement | undefined, a = ombra.getBBox(), b = sotto?.getBBox() ?? a;
    const da = `${b.x - a.x}px ${b.y + b.height - a.y - a.height}px`;
    an.push(ombra.animate([
      { opacity: 0, translate: da }, { opacity: 1, translate: '0px 0px' },
    ], { duration: OMBRA, delay: t, fill: 'both', easing: 'cubic-bezier(0.32, 0, 0.67, 0)' }));
  });
}

export function initCostruzioni(signal: AbortSignal) {
  if (REDUCED) return;
  document.querySelectorAll<HTMLElement>('[data-costruzione]').forEach(cella => {
    // i disegni affiancati partono insieme, ognuno col suo ritmo
    const svgs = [...cella.querySelectorAll<SVGSVGElement>('svg[data-disegno]')];
    const box = cella.querySelector<HTMLElement>('[data-disegni]');
    if (!svgs.length || !box) return;
    const an: Animation[] = [];
    const v = VELOCITA * Math.max(...svgs.map(s => s.viewBox.baseVal.height)) / 1000;
    svgs.forEach(svg => programma(svg, an, v));

    const daCapo = (parti: boolean) => an.forEach(a => { a.currentTime = 0; parti ? a.play() : a.pause(); });
    // initCells riparte (un foglio nuovo sopra): se era già disegnato resta com'è finché non esce di vista
    let partito = box.hasAttribute('data-fatto');
    if (partito) an.forEach(a => a.finish()); else daCapo(false);

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) { daCapo(false); partito = false; }
      else if (e.intersectionRatio >= 0.5 && !partito) { daCapo(true); partito = true; }
    }, { threshold: [0, 0.5] });
    io.observe(box);
    box.addEventListener('click', () => { daCapo(true); partito = true; }, { signal });
    signal.addEventListener('abort', () => {
      io.disconnect();
      box.toggleAttribute('data-fatto', partito);
      an.forEach(a => a.cancel());
    });
  });
}
