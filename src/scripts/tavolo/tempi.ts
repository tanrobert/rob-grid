/** Tempi e soglie del tavolo. Con "riduci movimento" tutto arriva subito: niente lanci, inerzia, rotazioni */

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** durata in secondi (GSAP), zero con riduci movimento */
export const T = (s: number) => (REDUCED ? 0 : s);

/** ms di dito fermo su una cella per prenderla (sul telefono il dito sulla cella sposta il tavolo) */
export const LONG = 360;
/** px di movimento oltre i quali un tocco o un click diventano un gesto */
export const SLOP = 6;
/** px/s: lasciata più veloce di così, la cella vola e si ferma da sola */
export const LANCIO = 450;
/** ms: il click che arriva entro questo tempo dalla fine di un gesto è il suo, e non apre la cella */
export const QUIETE = 500;
