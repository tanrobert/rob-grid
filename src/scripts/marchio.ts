/**
 * Cella `marchio` di Rob Display (MarchioCell.astro): il marchio che si costruisce a passi. Import dinamico da cells.ts.
 * Ogni segno ha il suo passo (data-passo; i pezzi del glifo e i nodi lo prendono da data-pezzi e data-nodi-passo):
 * al passo k si vede tutto quello che ha un passo fino a k. Il primo passo parte quando se ne vede metà; poi un clic sul
 * disegno fa il dopo (dopo l'ultimo da capo) e il righello porta a un passo. Andando avanti i segni nuovi entrano:
 * i quadrati uno dopo l'altro, le diagonali che crescono, il resto che sfuma dentro; tornando indietro, di colpo.
 * Riduci movimento: tutto di colpo, e si parte già costruiti.
 * initCells riparte (un foglio sopra): la cella resta al passo dov'era (data-fatto).
 */

import { gsap } from 'gsap';
import { T, REDUCED } from './preferenze';

const DURATA = 0.45;  // s di ogni segno che entra
const SCATTO = 0.05;  // s fra un quadrato e l'altro

export function initMarchi(signal: AbortSignal) {
  document.querySelectorAll<HTMLElement>('[data-marchio]').forEach(cella => {
    const tela = cella.querySelector<HTMLElement>('[data-tela]');
    const righello = cella.querySelector<HTMLElement>('[data-righello]');
    const numero = cella.querySelector<HTMLElement>('[data-numero]');
    if (!tela || !righello || !numero) return;
    const testi = [...cella.querySelectorAll<HTMLElement>('[data-testo]')];
    const tacche = [...cella.querySelectorAll<HTMLButtonElement>('[data-vai]')];
    const nomi = tacche.map(b => b.getAttribute('aria-label')!);
    const n = testi.length;

    // il passo dei pezzi e dei nodi del glifo
    const pezzi = JSON.parse(cella.dataset.pezzi!) as Record<string, number>;
    tela.querySelectorAll<SVGElement>('[data-pieni] > path').forEach(p => { p.dataset.passo = String(pezzi[p.dataset.pezzo!] ?? 1); });
    const nodi = tela.querySelector<SVGElement>('[data-nodi]');
    if (nodi) nodi.dataset.passo = cella.dataset.nodiPasso;
    const segni = [...tela.querySelectorAll<SVGElement>('[data-passo]')];

    /** entra un segno: i figli uno dopo l'altro, una linea che cresce dal suo inizio, il resto che sfuma */
    function entra(el: SVGElement) {
      if (el.hasAttribute('data-uno-a-uno')) {
        gsap.fromTo(el.children, { opacity: 0 }, { opacity: 1, duration: T(DURATA), stagger: T(SCATTO), clearProps: 'opacity' });
        return;
      }
      const linee = el.querySelectorAll<SVGLineElement>('[data-cresce]');
      if (linee.length) {
        linee.forEach(l => {
          const fine = { x2: +l.getAttribute('x2')!, y2: +l.getAttribute('y2')! };
          gsap.fromTo(l, { attr: { x2: +l.getAttribute('x1')!, y2: +l.getAttribute('y1')! } }, { attr: fine, duration: T(DURATA * 1.6), ease: 'power2.inOut' });
        });
      }
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: T(DURATA), clearProps: 'opacity' });
    }

    /** il passo k (da 0), coi segni nuovi che entrano se `anima` */
    function metti(k: number, anima: boolean) {
      k = (k + n) % n;
      const avanti = k > stato;
      testi.forEach((t, i) => t.classList.toggle('is-attivo', i === k));
      righello!.style.setProperty('--at', String(k / (n - 1)));
      numero!.textContent = nomi[k];
      tacche.forEach((b, i) => (i === k ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
      for (const el of segni) {
        const p = +el.dataset.passo! - 1;
        el.classList.toggle('is-via', p > k);
        if (anima && avanti && p > stato && p <= k && !REDUCED) entra(el);
      }
      stato = k;
    }

    // si parte senza niente (stato −1) e il primo passo entra quando se ne vede metà; riduci movimento: già costruito
    let stato = cella.dataset.fatto ? +cella.dataset.fatto : REDUCED ? n - 1 : -1;
    if (stato < 0) {
      metti(0, false);
      segni.forEach(el => el.classList.add('is-via'));
      stato = -1;
    } else metti(stato, false);

    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio < 0.5) return;
      io.disconnect();
      if (stato < 0) metti(0, true);
    }, { threshold: [0, 0.5] });
    if (stato < 0) io.observe(tela);

    const vai = (k: number) => { io.disconnect(); metti(k, true); };
    // dopo l'ultimo passo il clic ricomincia da capo: via tutto, e il primo passo entra di nuovo
    tela.addEventListener('click', () => {
      if (stato + 1 >= n) { segni.forEach(el => el.classList.add('is-via')); stato = -1; }
      vai(stato + 1);
    }, { signal });
    for (const b of tacche) b.addEventListener('click', () => vai(+b.dataset.vai! - 1), { signal });

    signal.addEventListener('abort', () => { io.disconnect(); cella.dataset.fatto = String(Math.max(stato, 0)); });
  });
}
