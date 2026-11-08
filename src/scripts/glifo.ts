/**
 * Cella `glifo` di Rob Display (GlifoCell.astro): una lettera alla volta sulla griglia. Import dinamico da cells.ts.
 * Un clic sul disegno fa la lettera dopo (dopo il 9 da capo), i quadratini del righello portano a quella; un clic
 * vicino a un nodo (entro VICINO px) invece scrive nella coda il pezzo e la regola che lo genera. Cambiando lettera i
 * pezzi entrano uno dopo l'altro, poi i nodi (riduci movimento: di colpo).
 * L'atlante (AtlanteCell) chiede una lettera con l'evento `rob-display:glifo` ({ carattere }): la cella la mostra e
 * scorre in vista.
 * initCells riparte (un foglio sopra): la cella resta sulla lettera dov'era (data-fatto).
 */

import { gsap } from 'gsap';
import { T, REDUCED } from './preferenze';

const DURATA = 0.3;   // s di ogni pezzo che entra
const SCATTO = 0.06;  // s fra un pezzo e l'altro
const VICINO = 14;    // px: un clic più vicino di così a un nodo lo sceglie

export function initGlifi(signal: AbortSignal) {
  document.querySelectorAll<HTMLElement>('[data-glifo-cella]').forEach(cella => {
    const tela = cella.querySelector<HTMLElement>('[data-tela]');
    const righello = cella.querySelector<HTMLElement>('[data-righello]');
    const numero = cella.querySelector<HTMLElement>('[data-numero]');
    const regola = cella.querySelector<HTMLElement>('[data-regola]');
    if (!tela || !righello || !numero || !regola) return;
    const testi = [...cella.querySelectorAll<HTMLElement>('[data-testo]')];
    const disegni = [...tela.querySelectorAll<SVGGElement>('[data-glifo]')];
    const tacche = [...cella.querySelectorAll<HTMLButtonElement>('[data-vai]')];
    const n = disegni.length;
    // i nodi di ogni lettera, in coordinate del font: x, y e gli indici di pezzo e regola in `nomi` (datiNodi in data/rob-display.ts)
    const json = JSON.parse(cella.querySelector('[data-nodi-json]')?.textContent || '{"nomi":[],"glifi":[]}') as { nomi: string[]; glifi: number[][][] };
    const nodi = json.glifi;
    let scelto = -1;

    /** il nodo i della lettera attuale (−1 = nessuno): quadratino d'inchiostro e la sua regola nella coda */
    const scegli = (i: number) => {
      scelto = i;
      const n = nodi[stato]?.[i];
      disegni[stato]?.querySelector('[data-scelto]')?.setAttribute('d', n ? `M${n[0]} ${n[1]}h0.01` : '');
      regola!.textContent = n ? `${json.nomi[n[2]]} · ${json.nomi[n[3]]}` : regola!.dataset.base!;
    };

    function metti(k: number, anima: boolean) {
      k = (k + n) % n;
      testi.forEach((t, i) => t.classList.toggle('is-attivo', i === k));
      disegni.forEach((d, i) => d.classList.toggle('is-attivo', i === k));
      righello!.style.setProperty('--at', String(k / (n - 1)));
      numero!.textContent = testi[k].dataset.carattere!;
      tacche.forEach((b, i) => (i === k ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
      if (stato >= 0) disegni[stato]?.querySelector('[data-scelto]')?.setAttribute('d', '');
      stato = k;
      scegli(-1);
      if (anima && !REDUCED) {
        const pieni = disegni[k].querySelectorAll('[data-pieni] > path');
        const segni = disegni[k].querySelector('[data-nodi]');
        gsap.killTweensOf([pieni, segni]);
        gsap.fromTo(pieni, { opacity: 0 }, { opacity: 1, duration: T(DURATA), stagger: T(SCATTO), ease: 'power2.out', clearProps: 'opacity' });
        if (segni) gsap.fromTo(segni, { opacity: 0 }, { opacity: 1, duration: T(DURATA), delay: T(pieni.length * SCATTO), clearProps: 'opacity' });
      }
    }

    let stato = -1;
    const inizio = cella.dataset.fatto ? +cella.dataset.fatto : 0;
    metti(inizio, false);

    tela.addEventListener('click', e => {
      // da tastiera (detail 0) sempre la lettera dopo; col puntatore prima il nodo più vicino
      if (e.detail > 0) {
        const m = disegni[stato].getScreenCTM();
        let meglio = -1, d = VICINO;
        if (m) nodi[stato].forEach(([x, y], i) => {
          const p = new DOMPoint(x, y).matrixTransform(m);
          const dist = Math.hypot(p.x - e.clientX, p.y - e.clientY);
          if (dist < d) { d = dist; meglio = i; }
        });
        if (meglio >= 0) return scegli(meglio === scelto ? -1 : meglio);
      }
      metti(stato + 1, true);
    }, { signal });
    for (const b of tacche) b.addEventListener('click', () => metti(+b.dataset.vai! - 1, true), { signal });

    // dall'atlante: la lettera chiesta, e la cella in vista
    document.addEventListener('rob-display:glifo', e => {
      const k = testi.findIndex(t => t.dataset.carattere === (e as CustomEvent<{ carattere: string }>).detail.carattere);
      if (k < 0) return;
      metti(k, true);
      cella.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
    }, { signal });

    signal.addEventListener('abort', () => { cella.dataset.fatto = String(stato); });
  });

  // l'atlante chiede un carattere alla cella della lettera
  document.querySelectorAll<HTMLButtonElement>('[data-atlante]').forEach(b => b.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('rob-display:glifo', { detail: { carattere: b.dataset.atlante } }));
  }, { signal }));
}
