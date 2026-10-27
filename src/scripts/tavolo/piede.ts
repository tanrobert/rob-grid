/**
 * Le scritte piccole nella barra del tavolo (Tavolo.astro, .piede): ferme se ci stanno, altrimenti scorrono come un
 * marquee. Si misura la prima serie senza stacco contro lo spazio del box, dopo i font e a ogni cambio di misura.
 * Velocità costante: la durata cresce con la lunghezza della serie.
 */
const VELOCITA = 40;  // px al secondo

export function initPiede(signal: AbortSignal) {
  const box = document.querySelector<HTMLElement>('[data-piede]');
  const serie = box?.querySelector<HTMLElement>('.piede__serie');
  if (!box || !serie) return;
  const misura = () => {
    const cs = getComputedStyle(box);
    const spazio = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const stacco = serie.querySelector<HTMLElement>('.piede__stacco')?.offsetWidth ?? 0;
    // testo della serie: con lo stacco visibile (scorre) va tolto
    const scorre = serie.offsetWidth - stacco > spazio + 0.5;
    box.classList.toggle('is-scorre', scorre);
    if (scorre) box.style.setProperty('--durata', `${serie.offsetWidth / VELOCITA}s`);
  };
  const ro = new ResizeObserver(misura);
  document.fonts.ready.then(() => { if (!signal.aborted) ro.observe(box); });
  signal.addEventListener('abort', () => ro.disconnect());
}
