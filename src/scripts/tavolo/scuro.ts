/**
 * Tavolo scuro (7/11/2026, idea di Roberto): il bottone col cerchio mezzo pieno nella barra del tavolo (Tavolo.astro,
 * prima del suono) scambia inchiostro e carta, solo sul tavolo (global.css, html[data-scuro]). Scelta in localStorage
 * (`scuro`: `si`/`no`), rimessa da Layout.astro prima del primo disegno.
 */
import { suona } from '../suono';

const KEY = 'scuro';
const root = document.documentElement;

export function initScuro(signal: AbortSignal) {
  const btn = document.querySelector<HTMLButtonElement>('[data-tema]');
  if (!btn) return;
  const scuro = () => 'scuro' in root.dataset;
  const sync = () => {
    btn.setAttribute('aria-pressed', String(scuro()));
    btn.title = scuro() ? 'Tavolo chiaro' : 'Tavolo scuro';
  };
  sync();
  btn.addEventListener('click', () => {
    const si = !scuro();
    if (si) root.dataset.scuro = '';
    else delete root.dataset.scuro;
    try { localStorage.setItem(KEY, si ? 'si' : 'no'); } catch {}
    sync();
    suona('interruttore');
  }, { signal });
}
