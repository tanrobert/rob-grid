/**
 * Chiusura della pagina aperta da una cella: ✕ (a[data-close]), click sulla cella aperta (la hero) o Esc.
 * La transizione di ritorno (la hero che rientra nella sua cella) la fa morph.ts.
 */
import { navigate } from 'astro:transitions/client';

// Se siamo arrivati navigando nel sito torniamo indietro nella history, così la griglia ritrova
// lo scroll e la cella d'origine è dove l'avevamo lasciata.
let inSite = false;
document.addEventListener('astro:after-swap', () => { inSite = true; });

function close() {
  if (inSite) history.back();
  else navigate('/');
}

/** Click sinistro senza modificatori: gli altri (nuova scheda, ecc.) restano al browser */
const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** Click sulla hero, fuori da link e comandi e senza testo appena selezionato: come la ✕ */
const onHero = (t: Element) =>
  !!t.closest('.cell[data-hero]') && !t.closest('a, button, input, select, textarea, label, [role="switch"]')
  && !!getSelection()?.isCollapsed;

document.addEventListener('click', e => {
  if (!isPlainClick(e)) return;
  const t = e.target as Element;
  if (!t.closest('a[data-close]') && !onHero(t)) return;
  e.preventDefault();
  close();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.querySelector('[data-hero]')) close();
});
