/**
 * Tavolo della home (components/tavolo/Tavolo.astro): carta infinita, celle da spostare, lanciare e aprire,
 * zoom = misura del quadretto. Prototipo e scelte: tools/pages/tavolo.html.
 * Stessa visita = tavolo com'era (memoria.ts); visita nuova = disposizione pensata per la finestra vera.
 * C'è anche sotto i fogli aperti (components/foglio): lì è inerte finché il foglio resta aperto.
 */
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { BREAKPOINTS } from '../../lib/grid';
import { Q, PER_UNITA, pack, confine } from '../../lib/tavolo';
import { creaVista, scala, applica, aPixel, clampQ, ox, oy, limita, sulFoglio, type Vista } from './vista';
import { leggiPezzi, posa, alza, disponi, riordina, type Pezzo } from './pezzi';
import { initGesti, vai } from './gesti';
import { leggi, scrivi } from './memoria';
import { initMatita, type Matita } from './matita';
import { initSuono } from '../suono';
import { initPiede } from './piede';

gsap.registerPlugin(InertiaPlugin);

export interface Tavolo {
  v: Vista;
  pezzi: Pezzo[];
  /** ordine più alto in uso: la prossima cella presa va sopra */
  zTop: number;
  signal: AbortSignal;
  /** la matita (matita.ts), presa o posata */
  matita?: Matita;
  /** il foglio per la finestra di adesso (lib/tavolo.ts, confine): celle e vista tornano dentro */
  confina(): void;
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
    .forEach((p, n) => {
      // sul pezzo (caduta) e sulla cella, che ha già il suo turno scritto al build
      p.el.style.setProperty('--i', String(n));
      p.el.querySelector<HTMLElement>(':scope > .cell')?.style.setProperty('--i', String(n));
    });
}

/** Intro: la carta compare a giri dal centro del tavolo, al massimo 8 (crocini-in, global.css): su una finestra
    grande un giro copre più moduli */
function giri(v: Vista) {
  const S = v.q * PER_UNITA, x = ox(v), y = oy(v);
  const servono = Math.ceil(Math.max(x, v.vw - x, y, v.vh - y) / S);
  v.carta.style.setProperty('--passo-giro', `${S * Math.max(1, Math.ceil(servono / 8))}px`);
}

function initTavolo(el: HTMLElement): Tavolo {
  const ac = new AbortController();
  const v = creaVista(el);
  const pezzi = leggiPezzi(v.mondo);
  const versione = el.dataset.versione ?? '';
  let mosso = false;  // qualcosa è cambiato: da ricordare (anche a metà inerzia, se si cambia pagina)

  const t: Tavolo = {
    v, pezzi, zTop: 0, signal: ac.signal,
    confina: () => {
      // in quadretti di base, con la disposizione pensata per questa finestra: lo zoom non cambia il foglio
      const finestra = { vw: v.vw, vh: v.vh, q: v.vw < BREAKPOINTS.md ? Q.sm : Q.lg };
      v.foglio = confine(pezzi, pack(pezzi, finestra), finestra);
      for (const p of pezzi) {
        p.gx = sulFoglio(p.gx, p.w, v.foglio.x);
        p.gy = sulFoglio(p.gy, p.h, v.foglio.y);
      }
      limita(v);
    },
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
  t.confina();

  // da qui le posizioni sono quelle di GSAP (transform), non più quelle del build
  el.classList.add('is-vivo');
  t.posaTutti();
  applica(v);
  turni(pezzi);
  giri(v);
  t.nitide();
  InertiaPlugin.track(v.pan, 'x,y');
  t.matita = initMatita(t);
  initGesti(t);

  const attrezzi = document.querySelector<HTMLElement>('[data-attrezzi]');
  if (attrezzi) {
    attrezzi.hidden = false;
    attrezzi.querySelector('[data-riordina]')?.addEventListener('click', () => riordina(t), { signal: ac.signal });
    attrezzi.querySelector('[data-centro]')?.addEventListener('click', () => vai(t, 0, 0, 0.6), { signal: ac.signal });
    initSuono(ac.signal);
  }
  initPiede(ac.signal);

  // uscendo dalla pagina (anche verso la cache del browser, per tornare con indietro): il tavolo com'è adesso,
  // anche a metà inerzia
  addEventListener('pagehide', () => { if (mosso) t.salva(); }, { signal: ac.signal });
  return t;
}

const el = document.querySelector<HTMLElement>('[data-tavolo]');
/** Il tavolo della pagina, se c'è: lo usa scripts/foglio per aprire e chiudere i fogli dalle sue celle */
export const tavolo = el ? initTavolo(el) : null;
