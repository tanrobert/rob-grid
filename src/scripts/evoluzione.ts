/**
 * Cella `evoluzione` (G&A: dai montanti e traversi del marchio storico al simbolo nuovo). Import dinamico da cells.ts, solo se la cella c'è.
 * Il disegno va avanti a passi: il primo parte quando se ne vede metà, ogni clic sul disegno (o Invio) fa il passo dopo,
 * dopo l'ultimo si ricomincia; i quadratini del righello portano a un passo, anche indietro. Cambiando passo cambiano
 * titolo e testo e il quadrato pieno del righello va sul suo quadratino.
 * I passi stanno nell'SVG, sui gruppi figli dell'<svg> (vocabolario nel commento in testa a evoluzione-*.svg):
 * un passo è fatto di fasi, una dopo l'altra (data-fase, con una pausa in mezzo), e ogni fase dura quanto la sua azione
 * più lunga. Azioni di un gruppo nel passo in cui entra (data-passo):
 * - data-disegna="scaglioni|insieme" + data-durata, data-dopo: i tratti si disegnano (DrawSVG; i tratteggiati con la
 *   copia piena nella loro maschera, data-penna), a scaglioni uno dopo l'altro o tutti insieme;
 * - data-compare="durata": compare, sfumando (vuoto: di colpo);
 * - data-scivola: i pezzi scivolano via, ognuno nel suo data-verso, e svaniscono;
 * e nei passi dopo: data-via (sparisce, data-via-fase, data-via-durata) e data-zoom (si ingrandisce di data-scala
 * attorno al centro, nella fase 1). Anche su un elemento solo: data-via, e data-forme (JSON: tappe con passo, fase,
 * durata e attributi; in data-da quelli di prima), così le linee scorrono e le forme crescono, anche in più passi
 * (GSAP interpola i numeri, anche dentro `d` se comandi e vertici sono gli stessi). data-trasla (+ -y, -fase, -durata):
 * il gruppo sale o scende; data-colore (+ -da, -fase, -durata): --pieno passa dal colore di prima a quello del file;
 * data-uno-a-uno su un data-compare: i figli compaiono uno alla volta (le lettere di una riga).
 * Un clic durante un passo lo porta subito alla fine e fa il dopo. Riduci movimento: i passi arrivano già fatti.
 * initCells riparte (un foglio sopra): la cella resta al passo dov'era (data-fatto).
 */

import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { pad2 } from '../lib/format';
import { REDUCED } from './preferenze';

gsap.registerPlugin(DrawSVGPlugin);

const SCAGLIONE = 0.04;  // s tra un tratto e l'altro (stagger massimo 50 ms)…
const SCAGLIONI = 0.9;   // …ma tutti partiti entro questo tempo, anche se sono tanti
const PAUSA = 0.15;      // s tra una fase e l'altra
const SCIVOLA = 36;      // unità del disegno di cui scivolano i pezzi tagliati
const VIA = 0.8;         // s dei pezzi che scivolano
const ZOOM = 1.2;        // s dello zoom

type Azione = (t: number, tl: gsap.core.Timeline) => number;   // aggiunge alla timeline da t, restituisce quando finisce

export function initEvoluzioni(signal: AbortSignal) {
  document.querySelectorAll<HTMLElement>('[data-evoluzione]').forEach(cella => {
    const svg = cella.querySelector<SVGSVGElement>('svg[data-disegno]');
    const avanti = cella.querySelector<HTMLButtonElement>('[data-avanti]');
    const righello = cella.querySelector<HTMLElement>('[data-righello]');
    const numero = cella.querySelector<HTMLElement>('[data-numero]');
    if (!svg || !avanti || !righello || !numero) return;
    const testi = [...cella.querySelectorAll<HTMLElement>('[data-testo]')];
    const tacche = [...cella.querySelectorAll<HTMLButtonElement>('[data-vai]')];
    const n = testi.length;
    const { x, y, width, height } = svg.viewBox.baseVal;
    const centro = `${x + width / 2} ${y + height / 2}`;
    const gruppi = [...svg.querySelectorAll<SVGGElement>(':scope > g[data-passo]')];
    // nel file i gruppi ingranditi o spostati hanno già il loro transform (stato finale): da qui lo tiene GSAP
    for (const g of gruppi) if ('zoom' in g.dataset || 'trasla' in g.dataset) g.removeAttribute('transform');
    // colore finale dei gruppi che cambiano colore (--pieno nel file), quello di prima in data-colore-da
    const colori = new Map(gruppi.filter(g => g.dataset.colore).map(g => [g, g.style.getPropertyValue('--pieno').trim()]));

    const num = (v: string | undefined, base = 0) => (v ? +v : base);
    // singoli elementi (non gruppi) che svaniscono in un passo, e quelli che cambiano forma o posto: nel file gli
    // attributi finali, in data-da quelli di prima (anche le penne delle maschere, così il tratteggio le segue)
    const vieSole = [...svg.querySelectorAll<SVGElement>('[data-via]')].filter(el => el.parentNode !== svg);
    type Tappa = { passo: number; fase?: number; durata?: number; attr: Record<string, string> };
    const forme = [...svg.querySelectorAll<SVGElement>('[data-forme]')].map(el => ({
      el, da: JSON.parse(el.dataset.da!) as Record<string, string>, tappe: JSON.parse(el.dataset.forme!) as Tappa[],
    }));
    // i tratti di un gruppo; un tratteggiato si disegna con la penna della sua maschera
    const tratti = (g: SVGGElement) => [...g.children].map(el => {
      const m = el.getAttribute('mask')?.match(/#([^)]+)/)?.[1];
      return m ? svg.querySelector(`#${CSS.escape(m)} [data-penna]`)! : el;
    });
    const pezzi = (g: SVGGElement) => [...g.children] as SVGGElement[];
    // tratti disegnati per intero: senza il tratteggio di DrawSVG, che con lo zoom (tratti che non si ingrandiscono)
    // lascerebbe dei buchi
    const pieni = (els: Element[]) => gsap.set(els, { clearProps: 'strokeDasharray,strokeDashoffset' });

    /** il disegno coi passi 1…k fatti e gli altri da fare */
    function stato(k: number) {
      // prima la geometria (DrawSVG misura i tratti quando li azzera)
      for (const f of forme) gsap.set(f.el, { attr: f.tappe.filter(t => t.passo <= k).at(-1)?.attr ?? f.da });
      for (const el of vieSole) gsap.set(el, { autoAlpha: num(el.dataset.via) <= k ? 0 : 1 });
      for (const g of gruppi) {
        const { passo, via, zoom, scala } = g.dataset;
        const entrato = num(passo) <= k, uscito = num(via, Infinity) <= k;
        if ('disegna' in g.dataset) entrato ? pieni(tratti(g)) : gsap.set(tratti(g), { drawSVG: '0%' });
        if ('scivola' in g.dataset) gsap.set(pezzi(g), { x: 0, y: 0, opacity: 1 });
        // scala e posto insieme, senza smoothOrigin: rimettendo la scala a 1 col gruppo ancora salito, GSAP "compensava"
        // l'origine e il gruppo restava spostato (le guide del passo 1, tornando da capo dopo il 6)
        const posto: gsap.TweenVars = {};
        if (zoom) Object.assign(posto, { scale: num(zoom) <= k ? num(scala, 1) : 1, svgOrigin: centro, smoothOrigin: false });
        if (g.dataset.trasla) posto.y = num(g.dataset.trasla) <= k ? num(g.dataset.traslaY) : 0;
        if (zoom || g.dataset.trasla) gsap.set(g, posto);
        if (colori.has(g)) g.style.setProperty('--pieno', num(g.dataset.colore) <= k ? colori.get(g)! : g.dataset.coloreDa!);
        if ('unoAUno' in g.dataset) gsap.set(g.children, { autoAlpha: 1 });
        gsap.set(g, { autoAlpha: entrato && !uscito && !('scivola' in g.dataset) ? 1 : 0 });
      }
    }

    /** le azioni del passo k, per fase */
    function copione(k: number) {
      const fasi = new Map<number, Azione[]>();
      const metti = (fase: number, a: Azione) => fasi.set(fase, [...(fasi.get(fase) ?? []), a]);
      for (const g of gruppi) {
        const d = g.dataset, fase = num(d.fase, 1);
        if (num(d.passo) === k) {
          if (d.disegna) {
            const els = tratti(g), dopo = num(d.dopo), durata = num(d.durata, 1);
            const passo = d.disegna === 'scaglioni' && els.length > 1 ? Math.min(SCAGLIONE, SCAGLIONI / (els.length - 1)) : 0;
            metti(fase, (t, tl) => {
              tl.set(g, { autoAlpha: 1 }, t)
                .to(els, { drawSVG: '100%', duration: durata, ease: passo ? 'power2.inOut' : 'power1.inOut', stagger: passo }, t + dopo);
              return t + dopo + durata + passo * (els.length - 1);
            });
          }
          if (d.compare !== undefined) metti(fase, (t, tl) => {
            const durata = num(d.compare);
            if ('unoAUno' in d) {   // un figlio alla volta (le lettere di una riga)
              const figli = [...g.children], passo = figli.length > 1 ? Math.min(SCAGLIONE, SCAGLIONI / (figli.length - 1)) : 0;
              tl.set(g, { autoAlpha: 1 }, t)
                .fromTo(figli, { autoAlpha: 0 }, { autoAlpha: 1, duration: durata, ease: 'power1.out', stagger: passo }, t);
              return t + durata + passo * (figli.length - 1);
            }
            durata ? tl.fromTo(g, { autoAlpha: 0 }, { autoAlpha: 1, duration: durata, ease: 'power1.out' }, t) : tl.set(g, { autoAlpha: 1 }, t);
            return t + durata;
          });
          if ('scivola' in d) metti(fase, (t, tl) => {
            tl.set(g, { autoAlpha: 1 }, t)
              .to(pezzi(g), {
                x: (_: number, p: SVGGElement) => +p.dataset.verso!.split(' ')[0] * SCIVOLA,
                y: (_: number, p: SVGGElement) => +p.dataset.verso!.split(' ')[1] * SCIVOLA,
                opacity: 0, duration: VIA, ease: 'power2.in',
              }, t)
              .set(g, { autoAlpha: 0 }, t + VIA);
            return t + VIA;
          });
        }
        if (num(d.zoom) === k) metti(1, (t, tl) => {
          tl.to(g, { scale: num(d.scala, 1), svgOrigin: centro, smoothOrigin: false, duration: ZOOM, ease: 'power2.inOut' }, t);
          return t + ZOOM;
        });
        if (num(d.trasla) === k) metti(num(d.traslaFase, 1), (t, tl) => {
          const durata = num(d.traslaDurata, 1);
          tl.to(g, { y: num(d.traslaY), duration: durata, ease: 'power2.inOut' }, t);
          return t + durata;
        });
        if (num(d.colore) === k) metti(num(d.coloreFase, 1), (t, tl) => {
          const durata = num(d.coloreDurata, 1);
          tl.fromTo(g, { '--pieno': d.coloreDa }, { '--pieno': colori.get(g), duration: durata, ease: 'power1.inOut' }, t);
          return t + durata;
        });
      }
      for (const el of [...gruppi, ...vieSole]) {
        const d = el.dataset;
        if (num(d.via) === k) metti(num(d.viaFase, 1), (t, tl) => {
          const durata = num(d.viaDurata);
          durata ? tl.to(el, { autoAlpha: 0, duration: durata, ease: 'power1.in' }, t) : tl.set(el, { autoAlpha: 0 }, t);
          return t + durata;
        });
      }
      for (const f of forme) for (const tappa of f.tappe) if (tappa.passo === k) metti(tappa.fase ?? 1, (t, tl) => {
        const durata = tappa.durata ?? 1;
        tl.to(f.el, { attr: tappa.attr, duration: durata, ease: 'power2.inOut' }, t);
        return t + durata;
      });
      return [...fasi].sort(([a], [b]) => a - b).map(([, azioni]) => azioni);
    }

    /** il passo k, dal disegno coi passi prima già fatti */
    function gioca(k: number) {
      stato(k - 1);
      const tl = gsap.timeline();
      let t = 0;
      for (const azioni of copione(k)) t = Math.max(...azioni.map(a => a(t, tl))) + PAUSA;
      tl.call(() => stato(k));   // a passo finito: lo stato pulito (tratti pieni, pezzi a posto)
      if (REDUCED) { tl.kill(); stato(k); }
      return tl;
    }

    /** testo, righello e bottone del passo k */
    function mostra(k: number) {
      testi.forEach((t, i) => t.classList.toggle('is-attivo', i === k - 1));
      if (!REDUCED) gsap.fromTo(testi[k - 1], { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' });
      righello!.style.setProperty('--at', String((k - 1) / (n - 1)));
      numero!.textContent = pad2(k);
      tacche.forEach((b, i) => (i === k - 1 ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
      avanti!.setAttribute('aria-label', k < n ? `Passo successivo, ${k + 1} di ${n}` : 'Da capo');
    }

    let passo = num(cella.dataset.fatto);
    let tl: gsap.core.Timeline | undefined;
    // un clic a metà passo: quello finisce subito (stato pulito) e parte il dopo
    const chiudi = () => { if (tl) { tl.kill(); tl = undefined; stato(passo); } };
    const vai = (k: number) => { chiudi(); passo = k; mostra(k); tl = gioca(k); };

    // da capo o, se initCells riparte, dal passo dov'era
    stato(passo);
    mostra(Math.max(passo, 1));

    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.5 && passo === 0) { vai(1); io.disconnect(); }
    }, { threshold: [0, 0.5] });
    if (passo === 0) io.observe(svg);
    avanti.addEventListener('click', () => vai(passo < n ? passo + 1 : 1), { signal });
    // i quadratini del righello: quel passo, anche indietro (dal disegno coi passi prima già fatti)
    for (const b of tacche) b.addEventListener('click', () => vai(+b.dataset.vai!), { signal });

    signal.addEventListener('abort', () => {
      io.disconnect();
      chiudi();
      cella.dataset.fatto = String(passo);
    });
  });
}
