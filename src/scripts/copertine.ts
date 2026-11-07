/**
 * Cella `copertine` (Caleidoscopio, in Purple Piper): il muro di copertine che si alternano. Import dinamico da cells.ts.
 * A ogni visita le copertine si rimescolano; in vista, ogni PASSO ms una tessera a caso (non fra le ultime cambiate)
 * prende una copertina che non è nel muro, di colpo. Le copertine di riserva si scaricano quando la cella si avvicina
 * (sono pochi KB l'una) e si usano solo quelle già arrivate, così una tessera non resta mai vuota.
 * Fuori vista si ferma; con riduci movimento resta ferma (solo rimescolata).
 */

import { REDUCED } from './preferenze';

const PASSO = 110;       // ms fra un cambio e l'altro
const RIPOSO = 8;        // le ultime tessere cambiate non si ritoccano subito

const mescola = <T>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function initCopertine(signal: AbortSignal) {
  document.querySelectorAll<HTMLElement>('[data-copertine]').forEach(muro => {
    const tessere = [...muro.querySelectorAll('img')];
    const tutte = mescola(JSON.parse(muro.dataset.copertine!) as string[]);
    // initCells riparte (un foglio sopra): il muro resta com'è, si riprende da lì
    if (!muro.dataset.fatto) tessere.forEach((img, i) => { img.src = tutte[i]; });
    muro.dataset.fatto = '';
    if (REDUCED) return;

    const nelMuro = new Set(tessere.map(img => img.getAttribute('src')!));
    const pronte: string[] = [];   // di riserva, già scaricate
    let scaricate = false, timer = 0;
    const ultime: HTMLImageElement[] = [];

    function scarica() {
      if (scaricate) return;
      scaricate = true;
      for (const src of tutte) {
        if (nelMuro.has(src)) continue;
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => { if (!nelMuro.has(src)) pronte.push(src); };
        img.src = src;
      }
    }

    function cambia() {
      if (!pronte.length) return;
      const libere = tessere.filter(t => !ultime.includes(t));
      const tessera = libere[Math.floor(Math.random() * libere.length)];
      const nuova = pronte.splice(Math.floor(Math.random() * pronte.length), 1)[0];
      const vecchia = tessera.getAttribute('src')!;
      tessera.src = nuova;
      nelMuro.delete(vecchia); nelMuro.add(nuova);
      pronte.push(vecchia);
      ultime.push(tessera);
      if (ultime.length > RIPOSO) ultime.shift();
    }

    const ferma = () => { clearInterval(timer); timer = 0; };
    // le riserve quando la cella si avvicina, i cambi solo in vista
    const vicino = new IntersectionObserver(([e]) => { if (e.isIntersecting) { scarica(); vicino.disconnect(); } }, { rootMargin: '100%' });
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) timer = window.setInterval(cambia, PASSO);
      else if (!e.isIntersecting) ferma();
    });
    vicino.observe(muro);
    io.observe(muro);
    signal.addEventListener('abort', () => { vicino.disconnect(); io.disconnect(); ferma(); });
  });
}
