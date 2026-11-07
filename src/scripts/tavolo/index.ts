/**
 * Tavolo della home (components/tavolo/Tavolo.astro): carta con un confine, celle da spostare, lanciare e aprire,
 * zoom = misura del quadretto. Prototipo e scelte: tools/pages/tavolo.html.
 * Stessa visita = tavolo com'era (memoria.ts); visita nuova = disposizione pensata per la finestra vera.
 * C'è anche sotto i fogli aperti (components/foglio): lì è inerte finché il foglio resta aperto.
 */
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { PER_UNITA, pack, confine } from '../../lib/tavolo';
import { creaVista, scala, applica, aPixel, base, clampQ, ox, oy, limita, sulFoglio, type Vista } from './vista';
import { leggiPezzi, posa, alza, disponi, riordina, type Pezzo } from './pezzi';
import { initGesti } from './gesti';
import { leggi, scrivi } from './memoria';
import { initMatita, type Matita } from './matita';
import { initSuono } from '../suono';
import { initScuro } from './scuro';
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
  /** la disposizione di adesso è quella pensata: da qui si misura se il tavolo è scombinato */
  inOrdine(): void;
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

/** Intro: la carta compare a giri dal centro del tavolo, al massimo 8 (carta-in, global.css): su una finestra
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
  /** posizioni della disposizione pensata, in quadretti */
  let ordine: Record<string, [number, number]> = {};
  const posizioni = () => Object.fromEntries(pezzi.map(p => [p.id, [p.gx, p.gy] as [number, number]]));
  // il tasto Riordina della barra c'è solo col tavolo scombinato (7/11/2026, scelta di Roberto): una cella in vista
  // fuori dal suo posto. Vista e zoom non contano. La R al centro riordina sempre
  const tastoRiordina = document.querySelector<HTMLElement>('[data-attrezzi] [data-riordina]');
  const scombinato = () => pezzi.some(p => !p.el.hidden && (p.gx !== ordine[p.id]?.[0] || p.gy !== ordine[p.id]?.[1]));
  const mostraRiordina = () => {
    if (!tastoRiordina) return;
    const via = !scombinato();
    // premuto da tastiera sparisce sotto il fuoco: il fuoco passa al tasto dopo
    if (via && document.activeElement === tastoRiordina) document.querySelector<HTMLElement>('[data-attrezzi] [data-suono]')?.focus();
    tastoRiordina.hidden = via;
  };

  const t: Tavolo = {
    v, pezzi, zTop: 0, signal: ac.signal,
    confina: () => {
      // in quadretti di base, con la disposizione pensata per questa finestra: lo zoom non cambia il foglio
      const finestra = { vw: v.vw, vh: v.vh, q: base(v) };
      v.foglio = confine(pezzi, pack(pezzi, finestra), finestra);
      for (const p of pezzi) {
        p.gx = sulFoglio(p.gx, p.w, v.foglio.x);
        p.gy = sulFoglio(p.gy, p.h, v.foglio.y);
      }
      limita(v);
    },
    posaTutti: () => pezzi.forEach(p => posa(p, v.q)),
    inOrdine: () => { ordine = posizioni(); },
    salva: () => {
      mosso = true;
      scrivi({
        v: versione, q: v.q, pan: [v.pan.x / v.q, v.pan.y / v.q],
        pos: Object.fromEntries(pezzi.map(p => [p.id, [p.gx, p.gy, p.z]])), ordine,
      });
      mostraRiordina();
    },
  };

  const saved = leggi(versione);
  scala(v, aPixel(clampQ(v, saved?.q ?? base(v))));
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
  // memoria di prima che ci fosse `ordine`: in ordine com'è
  ordine = saved?.ordine ?? posizioni();
  mostraRiordina();

  // da qui le posizioni sono quelle di GSAP (transform), non più quelle del build
  el.classList.add('is-vivo');
  t.posaTutti();
  applica(v);
  turni(pezzi);
  giri(v);
  InertiaPlugin.track(v.pan, 'x,y');
  t.matita = initMatita(t);
  initGesti(t);

  const attrezzi = document.querySelector<HTMLElement>('[data-attrezzi]');
  if (attrezzi) {
    attrezzi.hidden = false;
    initScuro(ac.signal);
    initSuono(ac.signal);
  }
  // Riordina: il tasto della barra e la R al centro
  document.querySelectorAll('[data-riordina]').forEach(b => b.addEventListener('click', () => riordina(t), { signal: ac.signal }));
  initPiede(ac.signal);

  // uscendo dalla pagina (anche verso la cache del browser, per tornare con indietro): il tavolo com'è adesso,
  // anche a metà inerzia
  addEventListener('pagehide', () => { if (mosso) t.salva(); }, { signal: ac.signal });
  return t;
}

const el = document.querySelector<HTMLElement>('[data-tavolo]');
/** Il tavolo della pagina, se c'è: lo usa scripts/foglio per aprire e chiudere i fogli dalle sue celle */
export const tavolo = el ? initTavolo(el) : null;
