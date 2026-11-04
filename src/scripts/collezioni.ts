/**
 * Cella `collezioni` (G&A: le linee di porte, una alla volta). Import dinamico da cells.ts, solo se la cella c'è.
 * Ogni collezione è una scena (foto, velo del colore della linea, logo bianco) e un passo è la sua mini animazione:
 * la foto entra sfumando sopra quella di prima, poi il velo, poi il logo che sale appena. Il primo passo parte quando
 * se ne vede metà, un clic sulla foto fa la collezione dopo (dopo l'ultima da capo), i quadratini del righello portano
 * a una collezione, anche indietro. Un clic a metà passo lo chiude e fa il dopo. Riduci movimento: le scene arrivano
 * già fatte. initCells riparte (un foglio sopra): la cella resta alla collezione dov'era (data-fatto).
 */

import { gsap } from 'gsap';
import { pad2 } from '../lib/format';
import { REDUCED } from './preferenze';

const FOTO = 0.6;    // s della foto che entra
const VELO = 0.5;    // s del velo colorato, dopo una pausa
const PAUSA = 0.15;
const LOGO = 0.6;    // s del logo, che parte un poco prima che il velo finisca
const SALE = 10;     // px di cui sale il logo entrando

export function initCollezioni(signal: AbortSignal) {
  document.querySelectorAll<HTMLElement>('[data-collezioni]').forEach(cella => {
    const avanti = cella.querySelector<HTMLButtonElement>('[data-avanti]');
    const righello = cella.querySelector<HTMLElement>('[data-righello]');
    const numero = cella.querySelector<HTMLElement>('[data-numero]');
    if (!avanti || !righello || !numero) return;
    const scene = [...cella.querySelectorAll<HTMLElement>('[data-scena]')];
    const tacche = [...cella.querySelectorAll<HTMLButtonElement>('[data-vai]')];
    const n = scene.length;
    const parti = (s: HTMLElement) => ['[data-foto]', '[data-velo]', '[data-logo]'].map(q => s.querySelector(q)!);

    /** la collezione k intera, le altre nascoste (k = 0: nessuna, prima che parta) */
    function stato(k: number) {
      scene.forEach((s, i) => {
        s.classList.toggle('is-attiva', i === k - 1);
        s.style.zIndex = '';
        gsap.set(parti(s), { clearProps: 'opacity,visibility,transform' });
      });
    }

    /** righello, numero e bottone della collezione k */
    function mostra(k: number) {
      righello!.style.setProperty('--at', String((k - 1) / (n - 1)));
      numero!.textContent = pad2(k);
      tacche.forEach((b, i) => (i === k - 1 ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
      avanti!.setAttribute('aria-label', `${scene[k - 1].dataset.nome}, avanti: ${scene[k % n].dataset.nome}`);
    }

    /** la scena k entra sopra quella di adesso */
    function gioca(k: number) {
      const s = scene[k - 1], [foto, velo, logo] = parti(s);
      s.classList.add('is-attiva');
      s.style.zIndex = '1';
      const tl = gsap.timeline({ onComplete: () => stato(k) });
      tl.fromTo(foto, { autoAlpha: 0 }, { autoAlpha: 1, duration: FOTO, ease: 'power1.inOut' })
        .fromTo(velo, { autoAlpha: 0 }, { autoAlpha: 1, duration: VELO, ease: 'power1.inOut' }, `+=${PAUSA}`)
        .fromTo(logo, { autoAlpha: 0, y: SALE }, { autoAlpha: 1, y: 0, duration: LOGO, ease: 'power2.out' }, `-=${VELO / 3}`);
      if (REDUCED) tl.progress(1);
      return tl;
    }

    let passo = cella.dataset.fatto ? +cella.dataset.fatto : 0;
    let tl: gsap.core.Timeline | undefined;
    // un clic a metà passo: quello finisce subito e parte il dopo
    const chiudi = () => { if (tl) { tl.kill(); tl = undefined; stato(passo); } };
    const vai = (k: number) => { chiudi(); passo = k; mostra(k); tl = gioca(k); };

    // da capo (la carta vuota finché non parte) o, se initCells riparte, dalla collezione dov'era
    stato(passo);
    mostra(Math.max(passo, 1));

    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.5 && passo === 0) { vai(1); io.disconnect(); }
    }, { threshold: [0, 0.5] });
    if (passo === 0) io.observe(avanti);
    avanti.addEventListener('click', () => vai(passo % n + 1), { signal });
    for (const b of tacche) b.addEventListener('click', () => vai(+b.dataset.vai!), { signal });

    signal.addEventListener('abort', () => {
      io.disconnect();
      chiudi();
      cella.dataset.fatto = String(passo);
    });
  });
}
