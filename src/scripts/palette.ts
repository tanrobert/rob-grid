/**
 * Cella `palette` (G&A: i colori di prima e quelli nuovi). Import dinamico da cells.ts, solo se la cella c'è.
 * Si parte da prima; quando se ne vede metà, dopo una pausa, passa da sola a dopo. Poi un clic sui colori passa
 * all'altro stato, i quadratini del righello portano a quello. Cambiando stato le bande sfumano nei colori dell'altro
 * (--fondo e --testo, GSAP) e cambiano larghezza (flex-grow: i colori in più entrano allargandosi da zero); le schede
 * con nome e dati sfumano coi loro tempi CSS (PaletteCell.astro). Riduci movimento: il cambio è di colpo.
 * initCells riparte (un foglio sopra): la cella resta dov'era (data-fatto), e se è già cambiata una volta (data-mossa)
 * non passa più da sola.
 */

import { gsap } from 'gsap';
import { T } from './preferenze';

const ATTESA = 1;     // s in vista prima del passaggio da solo a dopo
const DURATA = 0.8;   // s del cambio di colori e larghezze

type Stato = { fondo: string; testo: string; peso: number };

export function initPalette(signal: AbortSignal) {
  document.querySelectorAll<HTMLElement>('[data-palette]').forEach(cella => {
    const colori = cella.querySelector<HTMLElement>('[data-colori]');
    const righello = cella.querySelector<HTMLElement>('[data-righello]');
    const numero = cella.querySelector<HTMLElement>('[data-numero]');
    if (!colori || !righello || !numero) return;
    const testi = [...cella.querySelectorAll<HTMLElement>('[data-testo]')];
    const tacche = [...cella.querySelectorAll<HTMLButtonElement>('[data-vai]')];
    const nomi = tacche.map(b => b.getAttribute('aria-label')!);
    const bande = [...cella.querySelectorAll<HTMLElement>('[data-banda]')].map(el => ({
      el, stati: JSON.parse(el.dataset.stati!) as Stato[], schede: [...el.querySelectorAll<HTMLElement>('[data-scheda]')],
    }));

    /** lo stato k (0 prima, 1 dopo), di colpo o col cambio */
    function metti(k: number, anima: boolean) {
      testi.forEach((t, i) => t.classList.toggle('is-attivo', i === k));
      righello!.style.setProperty('--at', String(k));
      numero!.textContent = nomi[k];
      tacche.forEach((b, i) => (i === k ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
      for (const b of bande) {
        const s = b.stati[k];
        b.schede.forEach(el => el.classList.toggle('is-attivo', +el.dataset.scheda! === k));
        const v = { '--fondo': s.fondo, '--testo': s.testo, flexGrow: s.peso };
        gsap.killTweensOf(b.el);
        anima ? gsap.to(b.el, { ...v, duration: T(DURATA), ease: 'power2.inOut' }) : gsap.set(b.el, v);
      }
      stato = k;
    }

    let stato = cella.dataset.fatto ? +cella.dataset.fatto : 0;
    let timer = 0;
    // dopo il primo cambio (da solo o col clic) non passa più da solo
    const vai = (k: number) => { clearTimeout(timer); io.disconnect(); cella.dataset.mossa = ''; metti(k, true); };
    metti(stato, false);

    // la prima volta passa da sola a dopo, quando se ne vede metà (fuori vista prima della pausa: aspetta di nuovo)
    const io = new IntersectionObserver(([e]) => {
      clearTimeout(timer);
      if (e.intersectionRatio >= 0.5) timer = window.setTimeout(() => vai(1), ATTESA * 1000);
    }, { threshold: [0, 0.5] });
    if (!('mossa' in cella.dataset)) io.observe(colori);

    colori.addEventListener('click', () => vai(1 - stato), { signal });
    for (const b of tacche) b.addEventListener('click', () => vai(+b.dataset.vai! - 1), { signal });

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      io.disconnect();
      cella.dataset.fatto = String(stato);
    });
  });
}
