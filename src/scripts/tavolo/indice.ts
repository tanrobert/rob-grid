/**
 * Indice del tavolo (10/11/2026, idea di Roberto): il tasto Indice in alto a destra apre lo stesso pannello
 * dell'indice dei fogli (scripts/indice.ts) con le celle del tavolo che si aprono,
 * nell'ordine di data/tavolo.ts (la spirale dal centro) anche se sono state spostate, coi lavori uno dopo l'altro.
 * Un tocco su una voce solleva subito la cella e porta la vista su di lei, al centro della finestra (col tavolo
 * rimpicciolito torna intanto a 1×); arrivata resta su un attimo e ricade secca: dice "sono qui" (10/11/2026, scelte di Roberto).
 * Se intanto si tocca il tavolo ricade subito; con riduci movimento resta giù.
 */
import { gsap } from 'gsap';
import { scala, applica, aPixel, base, limiti, stringi } from './vista';
import { solleva, abbassa, type Pezzo } from './pezzi';
import { suona } from '../suono';
import { T, REDUCED } from '../preferenze';
import type { Fonte } from '../indice';
import type { Tavolo } from './index';

/** La vista scivola sulla cella del pezzo: il centro della finestra, in quadretti, va al centro della cella mentre il
    quadretto torna a quello di base. Tween su v.pan: un gesto del tavolo lo ferma (gesti.ts, killTweensOf) */
function porta(t: Tavolo, el: HTMLElement) {
  const { v } = t;
  const p = t.pezzi.find(p => p.el === el);
  if (!p) return;
  const q0 = v.q, q1 = base(v);
  // dove arriva, dentro i limiti della vista a 1× (vista.ts)
  const l = limiti({ ...v, q: q1 });
  const x1 = stringi(-(p.gx + p.w / 2) * q1, l.x) / q1, y1 = stringi(-(p.gy + p.h / 2) * q1, l.y) / q1;
  const x0 = v.pan.x / q0, y0 = v.pan.y / q0;
  const passo = (k: number) => {
    const q = q0 + (q1 - q0) * k;
    if (q !== v.q) { scala(v, k === 1 ? aPixel(q) : q); t.posaTutti(); }
    v.pan.x = (x0 + (x1 - x0) * k) * v.q;
    v.pan.y = (y0 + (y1 - y0) * k) * v.q;
    applica(v);
  };
  gsap.killTweensOf(v.pan);
  const tw = gsap.to(v.pan, {
    duration: T(0.7), ease: 'power3.inOut',
    onUpdate: () => passo(tw.ratio),
    onComplete: () => {
      passo(1);
      t.salva();
      // il fuoco alla cella se è un link, per chi continua con la tastiera
      el.querySelector<HTMLElement>(':scope > a.cell')?.focus({ preventScroll: true });
      // arrivata: resta su ancora un poco
      if (su?.p === p) su.aspetta();
    },
  });
}

/** quanto resta su la cella quando la vista è arrivata, s */
const SU = 0.6;

/** La cella scelta, sollevata: ricade da sola SU secondi dopo l'arrivo della vista (aspetta), o prima (giu) */
let su: { p: Pezzo; aspetta(): void; giu(suono: boolean): void } | null = null;

/** La cella scelta si solleva dal centro appena si tocca la voce e viaggia su con la vista; arrivata resta su SU
    secondi e ricade secca, come nell'atterraggio dell'intro. Un tocco, la rotella o un tasto sul tavolo la fanno
    ricadere subito (anche a metà viaggio: il gesto ferma la vista); presa proprio lei, senza il suono della carta
    (se la si porta, la presa la solleva di nuovo) */
function scegli(t: Tavolo, el: HTMLElement) {
  const p = t.pezzi.find(p => p.el === el);
  if (REDUCED || !p) return;
  su?.giu(false);
  const ac = new AbortController();
  let attesa: gsap.core.Tween | undefined;
  const giu = (suono: boolean) => {
    if (ac.signal.aborted) return;
    ac.abort();
    attesa?.kill();
    if (su?.p === p) su = null;
    abbassa(p, 'power2.in');
    if (suono) suona('ricaduta', 0.2);
  };
  su = { p, giu, aspetta: () => { attesa = gsap.delayedCall(SU, () => giu(true)); } };
  solleva(t, p, (p.w * t.v.q) / 2, (p.h * t.v.q) / 2);
  const opt = { capture: true, signal: ac.signal };
  t.v.el.addEventListener('pointerdown', e => giu(!p.el.contains(e.target as Node)), opt);
  t.v.el.addEventListener('wheel', () => giu(true), opt);
  addEventListener('keydown', () => giu(true), opt);
  // un foglio che si apre (tastiera: Invio sulla cella col fuoco) o il tavolo che si chiude
  t.signal.addEventListener('abort', () => giu(false), { signal: ac.signal });
}

export function initIndice(t: Tavolo) {
  const tasto = document.querySelector<HTMLElement>('[data-indice]');
  if (!tasto) return;
  tasto.hidden = false;
  tasto.addEventListener('click', async () => {
    const { apri, descrivi } = await import('../indice');
    const fonte: Fonte = {
      nome: 'Indice del tavolo',
      voci: () => {
        // solo le celle che si aprono (link), nell'ordine di data/tavolo.ts, ma i lavori uno dopo l'altro: tutti al
        // posto del primo
        const celle = t.pezzi
          .filter(p => !p.el.hidden)
          .map(p => ({ p, c: p.el.querySelector<HTMLElement>(':scope > a.cell') }))
          .filter((x): x is { p: typeof x.p; c: HTMLElement } => !!x.c);
        const lavoro = (x: { c: HTMLElement }) => x.c.classList.contains('cell--project');
        const lavori = celle.filter(lavoro);
        const voci = celle.flatMap(x => !lavoro(x) ? [x] : x === lavori[0] ? lavori : [])
          // la voce porta al pezzo, non alla cella: è lui che sta sul tavolo
          .map(({ p, c }) => ({ ...descrivi(c), c: p.el }))
          .filter(v => v.titolo);
        // la cella più vicina al centro della finestra
        const lontano = (el: HTMLElement) => {
          const r = el.getBoundingClientRect();
          return Math.hypot(r.left + r.width / 2 - innerWidth / 2, r.top + r.height / 2 - innerHeight / 2);
        };
        let qui = 0;
        voci.forEach((v, i) => { if (lontano(v.c) < lontano(voci[qui].c)) qui = i; });
        return { voci, qui };
      },
      scelta: el => scegli(t, el),
      vai: el => porta(t, el),
    };
    apri(fonte);
  }, { signal: t.signal });
}
