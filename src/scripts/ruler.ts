/**
 * Righello al posto della scrollbar: le tacche sono uno sfondo di <body> (scorrono con la pagina),
 * qui si muove solo l'indicatore con la percentuale.
 * Trascinando l'indicatore o cliccando sul righello la pagina scorre, come una scrollbar vera (anche col dito, solo
 * dall'indicatore: il resto del righello lascia scorrere la pagina). Un tocco sull'indicatore apre l'indice.
 */

const ruler = document.querySelector<HTMLElement>('[data-ruler]');
const thumb = ruler?.querySelector<HTMLElement>('[data-ruler-thumb]');
const pct = ruler?.querySelector<HTMLElement>('[data-ruler-pct]');

if (ruler && thumb && pct) {
  const root = document.documentElement;
  // righello attivo → il CSS nasconde la scrollbar nativa
  root.classList.add('has-ruler');
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
  new ResizeObserver(schedule).observe(document.body);  // altezza della pagina (filtri, immagini, foglio chiuso)
  update();

  // ── Trascinamento dell'indicatore ─────────────────────
  // scrolla la pagina in proporzione: 1px di corsa = maxScroll/travel px di pagina
  const scrollToThumb = (thumbY: number) => {
    scrollTo({ top: (thumbY / travel()) * maxScroll(), behavior: 'instant' });
  };

  let grabOffset = 0;  // dove è stato preso l'indicatore, rispetto alla sua cima
  // presa senza trascinare = un tocco: apre l'indice del foglio (scripts/indice.ts, 9/11/2026)
  let presa: { y: number; t: number } | null = null;
  thumb.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    grabOffset = e.clientY - thumb.getBoundingClientRect().top;
    presa = { y: e.clientY, t: e.timeStamp };
    thumb.setPointerCapture(e.pointerId);
    root.classList.add('is-ruling');
  });
  thumb.addEventListener('pointermove', e => {
    if (!thumb.hasPointerCapture(e.pointerId)) return;
    if (presa && Math.abs(e.clientY - presa.y) < 6) return;
    presa = null;
    scrollToThumb(e.clientY - grabOffset);
  });
  const release = () => root.classList.remove('is-ruling');
  thumb.addEventListener('pointerup', e => {
    release();
    if (presa && e.timeStamp - presa.t < 500) import('./indice').then(m => m.apri());
    presa = null;
  });
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
