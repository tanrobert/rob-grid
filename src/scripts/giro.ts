/**
 * Celle che cambiano da sole (affissioni, vetrina del sottologo, carosello delle foto): `avanti` ogni `ogni` ms
 * finché `el` è in vista e, con `fermaSopra`, finché il mouse non ci sta sopra. Un clic passa subito alla dopo
 * e il tempo riparte. `entra`: chi deve sapere anche lui quando l'elemento entra in vista (con le sue `soglie`).
 */
import { FINE } from './preferenze';

interface Opzioni { fermaSopra?: boolean; soglie?: number[]; entra?: (e: IntersectionObserverEntry) => void }

export function giraDaSola(el: HTMLElement, ogni: number, avanti: () => void, signal: AbortSignal,
  { fermaSopra = false, soglie = [0], entra }: Opzioni = {}) {
  let timer = 0, inVista = false, sopra = false;
  const aggiorna = () => {
    clearInterval(timer);
    timer = inVista && !sopra ? window.setInterval(avanti, ogni) : 0;
  };
  el.addEventListener('click', () => { avanti(); aggiorna(); }, { signal });
  if (fermaSopra && FINE) {
    el.addEventListener('pointerenter', () => { sopra = true; aggiorna(); }, { signal });
    el.addEventListener('pointerleave', () => { sopra = false; aggiorna(); }, { signal });
  }
  const io = new IntersectionObserver(([e]) => { inVista = e.isIntersecting; entra?.(e); aggiorna(); }, { threshold: soglie });
  io.observe(el);
  signal.addEventListener('abort', () => { io.disconnect(); clearInterval(timer); });
}
