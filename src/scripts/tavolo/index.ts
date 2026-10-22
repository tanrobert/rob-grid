/**
 * Tavolo della home (components/tavolo/Tavolo.astro): carta infinita, celle da spostare, lanciare e aprire,
 * zoom = misura del quadretto. Prototipo e scelte: tools/pages/tavolo.html.
 * Stessa visita = tavolo com'era (memoria.ts); visita nuova = disposizione pensata per la finestra vera.
 * Si avvia al primo caricamento e dopo ogni swap del ClientRouter (prima che la View Transition fotografi la
 * pagina nuova: tornando da una pagina la cella deve già essere al suo posto), si ripulisce prima dello swap.
 */
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { BREAKPOINTS } from '../../lib/grid';
import { Q, PER_UNITA } from '../../lib/tavolo';
import { creaVista, scala, applica, aPixel, clampQ, ox, oy, type Vista } from './vista';
import { leggiPezzi, posa, alza, disponi, riordina, type Pezzo } from './pezzi';
import { initGesti, vai } from './gesti';
import { leggi, scrivi } from './memoria';

gsap.registerPlugin(InertiaPlugin);

export interface Tavolo {
  v: Vista;
  pezzi: Pezzo[];
  /** ordine più alto in uso: la prossima cella presa va sopra */
  zTop: number;
  signal: AbortSignal;
  /** tutte le celle al loro posto alla misura del quadretto di adesso */
  posaTutti(): void;
  /** zoom finito: le foto ingrandite si ricaricano più grandi */
  nitide(): void;
  salva(): void;
}

/** Intro: le celle entrano in ordine di distanza dal marchio (la prima), sulla disposizione vera */
function turni(pezzi: Pezzo[]) {
  const centro = (p: Pezzo) => ({ x: p.gx + p.w / 2, y: p.gy + p.h / 2 });
  const m = centro(pezzi[0]);
  const lontano = (p: Pezzo) => Math.hypot(centro(p).x - m.x, centro(p).y - m.y);
  [...pezzi].sort((a, b) => lontano(a) - lontano(b))
    .forEach((p, n) => p.el.querySelector<HTMLElement>(':scope > .cell')?.style.setProperty('--i', String(n)));
}

/** Intro: la carta compare a giri dal centro del tavolo, al massimo 8 (crocini-in, global.css): su una finestra
    grande un giro copre più moduli */
function giri(v: Vista) {
  const S = v.q * PER_UNITA, x = ox(v), y = oy(v);
  const servono = Math.ceil(Math.max(x, v.vw - x, y, v.vh - y) / S);
  v.carta.style.setProperty('--passo-giro', `${S * Math.max(1, Math.ceil(servono / 8))}px`);
}

function initTavolo(el: HTMLElement): () => void {
  const ac = new AbortController();
  const v = creaVista(el);
  const pezzi = leggiPezzi(v.mondo);
  const versione = el.dataset.versione ?? '';
  let mosso = false;  // qualcosa è cambiato: da ricordare (anche a metà inerzia, se si cambia pagina)

  const t: Tavolo = {
    v, pezzi, zTop: 0, signal: ac.signal,
    posaTutti: () => pezzi.forEach(p => posa(p, v.q)),
    nitide: () => {
      // `sizes` dice al browser quanto è larga la foto: allo zoom cresce, mai più piccolo di com'era
      const base = v.vw < BREAKPOINTS.md ? Q.sm : Q.lg;
      for (const p of pezzi) {
        const px = Math.ceil(p.w * v.q);
        p.el.querySelectorAll<HTMLImageElement>('img[sizes]').forEach(img => {
          if (px <= Math.max(p.w * base, Number(img.dataset.px) || 0)) return;
          img.dataset.px = String(px);
          img.sizes = `${px}px`;
        });
      }
    },
    salva: () => {
      mosso = true;
      scrivi({
        v: versione, q: v.q, pan: [v.pan.x / v.q, v.pan.y / v.q],
        pos: Object.fromEntries(pezzi.map(p => [p.id, [p.gx, p.gy, p.z]])),
      });
    },
  };

  const saved = leggi(versione);
  scala(v, aPixel(clampQ(saved?.q ?? (v.vw < BREAKPOINTS.md ? Q.sm : Q.lg))));
  if (saved) {
    v.pan.x = saved.pan[0] * v.q;
    v.pan.y = saved.pan[1] * v.q;
    for (const p of pezzi) {
      [p.gx, p.gy] = saved.pos[p.id];
      alza(p, saved.pos[p.id][2]);
      t.zTop = Math.max(t.zTop, p.z);
    }
  } else disponi(t);

  // da qui le posizioni sono quelle di GSAP (transform), non più quelle del build
  el.classList.add('is-vivo');
  t.posaTutti();
  applica(v);
  turni(pezzi);
  giri(v);
  t.nitide();
  InertiaPlugin.track(v.pan, 'x,y');
  initGesti(t);

  const attrezzi = document.querySelector<HTMLElement>('[data-attrezzi]');
  if (attrezzi) {
    attrezzi.hidden = false;
    attrezzi.querySelector('[data-riordina]')?.addEventListener('click', () => riordina(t), { signal: ac.signal });
    attrezzi.querySelector('[data-centro]')?.addEventListener('click', () => vai(t, 0, 0, 0.6), { signal: ac.signal });
  }

  return () => {
    if (mosso) t.salva();
    ac.abort();
    gsap.killTweensOf([v.pan, ...pezzi.flatMap(p => (p.ombra ? [p.el, p.ombra] : [p.el]))]);
    InertiaPlugin.untrack(v.pan);
    pezzi.forEach(p => InertiaPlugin.untrack(p.el));
  };
}

let cleanup: (() => void) | null = null;
function start() {
  cleanup?.();
  cleanup = null;
  const el = document.querySelector<HTMLElement>('[data-tavolo]');
  if (el) cleanup = initTavolo(el);
}
start();
document.addEventListener('astro:after-swap', start);
document.addEventListener('astro:before-swap', () => { cleanup?.(); cleanup = null; });
