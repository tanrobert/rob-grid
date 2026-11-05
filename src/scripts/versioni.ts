/**
 * Cella `versioni` (G&A: il logo nelle sue versioni). Import dinamico da cells.ts, solo se la cella c'è.
 * I pezzi del logo (preparati da lib/versioni.ts) vanno da una versione all'altra in un gesto solo (5/11/2026: a fasi
 * separate, con le pause in mezzo, "ciondolava"): quelli che nella nuova non ci sono sfumano mentre gli altri partono
 * verso il loro posto (e cambiano misura se serve), e quelli nuovi compaiono a metà scivolata, già al loro posto. Titoletto
 * e riga delle parti (MARCHIO + LOGOTIPO…) cambiano col passo. Un clic sul logo fa la versione dopo (dopo l'ultima da
 * capo), i quadratini del righello portano a una versione. Riduci movimento: tutto subito. initCells riparte: la
 * cella resta dov'era (data-fatto).
 */

import { gsap } from 'gsap';
import { pad2 } from '../lib/format';
import { T } from './preferenze';

const ESCE = 0.25;      // s, i pezzi che vanno via
const ATTESA = 0.08;    // s, dopo quanto partono gli altri se qualcuno va via (giusto il tempo di vederlo sfumare)
const SCIVOLA = 0.6;    // s, i pezzi che restano verso il nuovo posto
const ENTRA = 0.3;      // s, i pezzi nuovi
const QUANDO = 0.5;     // a che punto della scivolata compaiono i nuovi

interface Posto { x: number; y: number; s: number }
interface Dati { posti: Array<Array<Posto | null>>; titoli: string[]; parti: string[] }

export function initVersioni(signal: AbortSignal) {
  document.querySelectorAll<HTMLElement>('[data-versioni]').forEach(cella => {
    const dati: Dati = JSON.parse(cella.dataset.versioni!);
    const logo = cella.querySelector<HTMLButtonElement>('[data-avanti]')!;
    const titolo = cella.querySelector<HTMLElement>('[data-titolo]')!;
    const parti = cella.querySelector<HTMLElement>('[data-parti]')!;
    const righello = cella.querySelector<HTMLElement>('[data-righello]')!;
    const numero = cella.querySelector<HTMLElement>('[data-numero]')!;
    const tacche = [...cella.querySelectorAll<HTMLButtonElement>('[data-vai]')];
    const pezzi = [...cella.querySelectorAll<SVGGElement>('[data-pezzo]')];
    const n = dati.posti.length;

    // dove sta ogni pezzo adesso (o = opacità)
    const ora = dati.posti[0].map(p => ({ ...p!, o: 1 }));

    function disegna() {
      pezzi.forEach((el, i) => {
        const p = ora[i];
        el.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${p.s})`);
        el.style.opacity = p.o < 1 ? String(p.o) : '';
      });
    }

    function mostra(k: number) {
      righello.style.setProperty('--at', String((k - 1) / (n - 1)));
      numero.textContent = pad2(k);
      tacche.forEach((b, i) => (i === k - 1 ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
      titolo.textContent = dati.titoli[k - 1];
      parti.textContent = dati.parti[k - 1];
      logo.setAttribute('aria-label', `${dati.titoli[k - 1]}, avanti: ${dati.titoli[k % n]}`);
    }

    let passo = cella.dataset.fatto ? +cella.dataset.fatto : 1;
    let tl: gsap.core.Timeline | undefined;

    /** la versione k, già fatta (quando initCells riparte) */
    function fermo(k: number) {
      dati.posti[k - 1].forEach((p, i) => { if (p) Object.assign(ora[i], p, { o: 1 }); else ora[i].o = 0; });
      disegna();
    }

    function vai(k: number) {
      // un clic a metà passo riparte da dove sono i pezzi adesso: prima saltavano alla fine del passo e poi ripartivano
      // (5/11/2026, "si assestano e poi si muovono di nuovo")
      tl?.kill();
      passo = k;
      mostra(k);
      const meta = dati.posti[k - 1];
      tl = gsap.timeline({ onUpdate: disegna, onComplete: () => { tl = undefined; fermo(k); } });
      const escono = ora.filter((p, i) => p.o > 0 && !meta[i]);
      const restano = ora.map((p, i) => (p.o > 0 && meta[i] ? i : -1)).filter(i => i >= 0);
      const entrano = ora.map((p, i) => (p.o === 0 && meta[i] ? i : -1)).filter(i => i >= 0);
      const parte = escono.length ? T(ATTESA) : 0;
      if (escono.length) tl.to(escono, { o: 0, duration: T(ESCE), ease: 'power1.out' }, 0);
      // anche quelli che stavano comparendo o sfumando: finiscono di comparire mentre vanno al posto nuovo
      restano.forEach(i => tl!.to(ora[i], { ...meta[i]!, o: 1, duration: T(SCIVOLA), ease: 'power2.inOut' }, parte));
      // i nuovi compaiono insieme, già al loro posto, mentre gli altri arrivano
      const t0 = restano.length ? parte + T(SCIVOLA) * QUANDO : parte;
      entrano.forEach(i => {
        tl!.set(ora[i], { ...meta[i]! }, t0);
        tl!.to(ora[i], { o: 1, duration: T(ENTRA), ease: 'power1.out' }, t0);
      });
    }

    fermo(passo);
    mostra(passo);
    logo.addEventListener('click', () => vai(passo % n + 1), { signal });
    for (const b of tacche) b.addEventListener('click', () => vai(+b.dataset.vai!), { signal });

    signal.addEventListener('abort', () => {
      if (tl) { tl.kill(); fermo(passo); }
      cella.dataset.fatto = String(passo);
    });
  });
}
