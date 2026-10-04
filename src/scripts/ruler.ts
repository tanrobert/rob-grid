/**
 * Righello al posto della scrollbar: le tacche sono uno sfondo di <body> (scorrono con la pagina),
 * qui si muove solo l'indicatore con la percentuale.
 * Trascinando l'indicatore o cliccando sul righello la pagina scorre, come una scrollbar vera.
 * L'elemento è persistente tra le pagine (transition:persist): si inizializza una volta sola.
 */

const ruler = document.querySelector<HTMLElement>('[data-ruler]');
const thumb = ruler?.querySelector<HTMLElement>('[data-ruler-thumb]');
const pct = ruler?.querySelector<HTMLElement>('[data-ruler-pct]');

if (ruler && thumb && pct) {
  const root = document.documentElement;
  // righello attivo → il CSS nasconde la scrollbar nativa.
  // Lo swap del ClientRouter riscrive le classi di <html>: la rimetto dopo ogni navigazione.
  const activate = () => root.classList.add('has-ruler');
  activate();
  document.addEventListener('astro:after-swap', activate);
  const maxScroll = () => root.scrollHeight - innerHeight;
  // corsa dell'indicatore: dall'alto della finestra al basso, meno la sua altezza
  const travel = () => ruler.clientHeight - thumb.offsetHeight;

  let frame = 0;
  const update = () => {
    frame = 0;
    const max = maxScroll();
    ruler.hidden = max <= 0;
    if (max <= 0) return;
    const p = Math.min(1, Math.max(0, scrollY / max));
    // posizione agganciata ai pixel reali: la linea resta netta
    const y = Math.round(p * travel() * devicePixelRatio) / devicePixelRatio;
    thumb.style.transform = `translateY(${y}px)`;
    const text = `${Math.round(p * 100)}`.padStart(3, '0') + '%';
    if (pct.textContent !== text) pct.textContent = text;
  };
  const schedule = () => { frame ||= requestAnimationFrame(update); };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(document.body);  // altezza della pagina (filtri, immagini, navigazione)
  document.addEventListener('astro:page-load', schedule);
  // subito dopo lo swap, prima che la View Transition fotografi la pagina nuova: se il righello
  // sparisse a transizione avviata (pagina che non scorre), Firefox annullerebbe tutta l'animazione
  document.addEventListener('astro:after-swap', update);
  update();

  // ── Trascinamento dell'indicatore ─────────────────────
  // scrolla la pagina in proporzione: 1px di corsa = maxScroll/travel px di pagina
  const scrollToThumb = (thumbY: number) => {
    scrollTo({ top: (thumbY / travel()) * maxScroll(), behavior: 'instant' });
  };

  let grabOffset = 0;  // dove è stato preso l'indicatore, rispetto alla sua cima
  thumb.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    grabOffset = e.clientY - thumb.getBoundingClientRect().top;
    thumb.setPointerCapture(e.pointerId);
    root.classList.add('is-ruling');
  });
  thumb.addEventListener('pointermove', e => {
    if (thumb.hasPointerCapture(e.pointerId)) scrollToThumb(e.clientY - grabOffset);
  });
  const release = () => root.classList.remove('is-ruling');
  thumb.addEventListener('pointerup', release);
  thumb.addEventListener('lostpointercapture', release);

  // ── Click sul righello: l'indicatore va dove si clicca (centrato) e resta trascinabile ──
  ruler.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target !== ruler) return;
    e.preventDefault();
    grabOffset = thumb.offsetHeight / 2;
    scrollToThumb(e.clientY - grabOffset);
    thumb.setPointerCapture(e.pointerId);
    root.classList.add('is-ruling');
  });
}
