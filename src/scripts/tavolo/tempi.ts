/** Soglie dei gesti del tavolo (durate e riduci movimento: scripts/preferenze.ts) */

/** ms di dito fermo su una cella per prenderla (sul telefono il dito sulla cella sposta il tavolo) */
export const LONG = 360;
/** px di movimento oltre i quali un tocco o un clic diventano un gesto */
export const SLOP = 6;
/** px/s: lasciata più veloce di così, la cella vola e si ferma da sola */
export const LANCIO = 450;
/** ms: il clic che arriva entro questo tempo dalla fine di un gesto è il suo, e non apre la cella */
export const QUIETE = 500;
