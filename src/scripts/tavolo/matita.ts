/**
 * Matita (prototipo: tools/pages/tavolo.html). Segni neri, la mano di chi visita: il rosso è la stampa.
 * - Ogni tratto si taglia sui bordi delle celle: ogni pezzo appartiene al foglio su cui è stato tracciato
 *   (la cella più in alto in quel punto, o il tavolo) e lo segue quando si sposta.
 * - Coordinate in quadretti: allo zoom i segni si ridisegnano netti.
 * - Durano finché si resta qui (anche aprendo e chiudendo fogli): niente salvataggio.
 * - Col mouse la matita vola dalla scatolina (il pulsante) alla punta del puntatore e diventa il cursore;
 *   posata, torna a volo nella scatolina. Sul touch non c'è cursore: solo la scatolina.
 * I gesti (un dito o il mouse disegna, due dita spostano e zoomano) sono in gesti.ts.
 */
import { gsap } from 'gsap';
import type { Posto } from '../../lib/tavolo';
import { ox, oy, type VistaEvento } from './vista';
import type { Pezzo } from './pezzi';
import { REDUCED, T } from './tempi';
import type { Tavolo } from './index';

const SVGNS = 'http://www.w3.org/2000/svg';
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
/** misura della matita in volo e posizione della punta (px) */
const PENNA = 24, PUNTA = { x: 1.5, y: 22.5 };

export interface Matita {
  attiva(): boolean;
  /** inizio di un tratto nel punto (sx, sy) dello schermo */
  inizia(sx: number, sy: number): void;
  continua(sx: number, sy: number): void;
  fine(): void;
  /** il tratto appena iniziato era l'inizio di un pizzico: via */
  annulla(): void;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
/** tratto morbido: curve tra i punti medi */
function pathD(p: Posto[]) {
  if (p.length === 1) return `M${r3(p[0].x)},${r3(p[0].y)}l0,0`;
  let d = `M${r3(p[0].x)},${r3(p[0].y)}`;
  for (let i = 1; i < p.length - 1; i++) d += `Q${r3(p[i].x)},${r3(p[i].y)} ${r3((p[i].x + p[i + 1].x) / 2)},${r3((p[i].y + p[i + 1].y) / 2)}`;
  const l = p[p.length - 1];
  return d + `L${r3(l.x)},${r3(l.y)}`;
}

export function initMatita(t: Tavolo): Matita {
  const { v, signal } = t;
  const html = document.documentElement;
  const sulTavolo = v.mondo.querySelector<SVGGElement>('[data-segni-tavolo]')!;
  const fogli = new Map(t.pezzi.map(p => [p, p.el.querySelector<SVGSVGElement>(':scope > [data-segni]')!]));
  const pulsante = document.querySelector<HTMLButtonElement>('[data-matita]');
  const cancella = document.querySelector<HTMLButtonElement>('[data-cancella]');
  const volo = document.querySelector<SVGSVGElement>('[data-matita-volo]');
  const scatolina = pulsante?.querySelector<SVGSVGElement>('.matita__ico');
  let attiva = false;

  // i segni del tavolo sono in quadretti: il gruppo scala col quadretto
  const scala = (q: number) => sulTavolo.setAttribute('transform', `scale(${q})`);
  scala(v.q);
  document.addEventListener('tavolo:vista', e => scala((e as CustomEvent<VistaEvento>).detail.q), { signal });

  /** il foglio sotto un punto del tavolo (in quadretti): la cella più in alto, o null = il tavolo */
  const foglioIn = (x: number, y: number) => {
    let sopra: Pezzo | null = null, iSopra = -1;
    t.pezzi.forEach((p, i) => {
      if (x < p.gx || x >= p.gx + p.w || y < p.gy || y >= p.gy + p.h) return;
      if (!sopra || p.z > sopra.z || (p.z === sopra.z && i > iSopra)) { sopra = p; iSopra = i; }
    });
    return sopra as Pezzo | null;
  };

  // ── Il tratto in corso: un pezzo per ogni foglio attraversato ──
  let tratto: { paths: SVGPathElement[]; ultimo: Posto; seg: { su: Pezzo | null; path: SVGPathElement; pts: Posto[] } } | null = null;
  const punto = (sx: number, sy: number): Posto => ({ x: (sx - ox(v)) / v.q, y: (sy - oy(v)) / v.q });
  const aggiungi = (pt: Posto) => {
    const { seg } = tratto!;
    seg.pts.push(seg.su ? { x: pt.x - seg.su.gx, y: pt.y - seg.su.gy } : pt);
    seg.path.setAttribute('d', pathD(seg.pts));
  };
  const pezzoDiTratto = (su: Pezzo | null, pt: Posto) => {
    const path = document.createElementNS(SVGNS, 'path');
    (su ? fogli.get(su)! : sulTavolo).append(path);
    tratto!.paths.push(path);
    tratto!.seg = { su, path, pts: [] };
    aggiungi(pt);
  };

  /** "Cancella tutto" c'è solo quando c'è qualcosa da cancellare */
  const segni = () => [...v.mondo.querySelectorAll<SVGPathElement>('.segni path')];
  const aggiornaCancella = () => { if (cancella) cancella.hidden = !segni().length; };

  // ── Prendere e posare ──
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; } }, { passive: true, signal });
  function prendi(on: boolean) {
    if (on === attiva) return;
    attiva = on;
    v.el.classList.toggle('is-matita', on);
    pulsante?.setAttribute('aria-pressed', String(on));
    if (!volo || !scatolina) return;
    const r = scatolina.getBoundingClientRect(), piccola = r.width / PENNA;
    gsap.killTweensOf(volo);
    html.classList.remove('matita-in-volo');
    if (!FINE || REDUCED) {
      scatolina.classList.toggle('is-vuota', on);
      html.classList.toggle('matita-in-mano', on && FINE);
      return;
    }
    if (on) {
      // si stacca dalla scatolina: resta la sagoma, la matita cresce e va sotto il puntatore
      scatolina.classList.add('is-vuota');
      html.classList.add('matita-in-volo');
      gsap.set(volo, { visibility: 'visible', x: r.left, y: r.top, scale: piccola, transformOrigin: '0 0' });
      gsap.to(volo, {
        x: () => mouse.x - PUNTA.x, y: () => mouse.y - PUNTA.y, scale: 1, duration: 0.28, ease: 'power3.out',
        onComplete() { html.classList.replace('matita-in-volo', 'matita-in-mano'); gsap.set(volo, { visibility: 'hidden' }); },
      });
    } else {
      html.classList.remove('matita-in-mano');
      gsap.set(volo, { visibility: 'visible', x: mouse.x - PUNTA.x, y: mouse.y - PUNTA.y, scale: 1, transformOrigin: '0 0' });
      gsap.to(volo, {
        x: r.left, y: r.top, scale: piccola, duration: 0.26, ease: 'power3.inOut',
        onComplete() { gsap.set(volo, { visibility: 'hidden' }); scatolina.classList.remove('is-vuota'); },
      });
    }
  }
  pulsante?.addEventListener('click', () => prendi(!attiva), { signal });
  cancella?.addEventListener('click', () => {
    const tutti = segni();
    gsap.to(tutti, { opacity: 0, duration: T(0.25), ease: 'power1.in', onComplete: () => { tutti.forEach(p => p.remove()); aggiornaCancella(); } });
  }, { signal });
  // Esc posa la matita (col foglio aperto Esc chiude il foglio: scripts/foglio)
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && attiva && html.classList.contains('is-tavolo')) prendi(false); }, { signal });

  return {
    attiva: () => attiva,
    inizia(sx, sy) {
      const pt = punto(sx, sy);
      tratto = { paths: [], ultimo: pt, seg: null! };
      pezzoDiTratto(foglioIn(pt.x, pt.y), pt);
      aggiornaCancella();
    },
    continua(sx, sy) {
      if (!tratto) return;
      const pt = punto(sx, sy);
      if (Math.hypot(pt.x - tratto.ultimo.x, pt.y - tratto.ultimo.y) < 0.04) return;
      const su = foglioIn(pt.x, pt.y);
      if (su !== tratto.seg.su) {
        // bordo tra due fogli: lo cerco a metà, poi i due pezzi si sovrappongono di un niente (il bordo li taglia)
        let a = tratto.ultimo, b = pt;
        for (let k = 0; k < 10; k++) {
          const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          if (foglioIn(m.x, m.y) === tratto.seg.su) a = m; else b = m;
        }
        aggiungi(b);
        pezzoDiTratto(su, a);
      }
      aggiungi(pt);
      tratto.ultimo = pt;
    },
    fine() { tratto = null; },
    annulla() {
      tratto?.paths.forEach(p => p.remove());
      tratto = null;
      aggiornaCancella();
    },
  };
}
