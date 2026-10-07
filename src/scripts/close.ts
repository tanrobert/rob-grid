/**
 * Chiusura della pagina aperta da una cella: ✕ (a[data-close]) o Esc.
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

document.addEventListener('click', e => {
  const back = (e.target as Element).closest('a[data-close]');
  if (!back || !isPlainClick(e)) return;
  e.preventDefault();
  close();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.querySelector('[data-hero]')) close();
});
