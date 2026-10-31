/** Preferenze del sistema, lette una volta: ogni pagina è un caricamento vero (niente ClientRouter) */

/** riduci movimento: tutto arriva subito, niente lanci, inerzia, rotazioni, loop */
export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** durata in secondi (GSAP), zero con riduci movimento */
export const T = (s: number) => (REDUCED ? 0 : s);
/** mouse o trackpad (non il dito): lente dei titoloni, matita come cursore, pausa col mouse sopra */
export const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
