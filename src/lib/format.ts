/** 3 → "03": numerazione a due cifre usata in tutta la griglia */
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Testo dei paragrafi senza i segni di components/Paragrafi.astro (**concetto**, righe vuote): per meta e alt */
export const senzaSegni = (s: string) => s.replaceAll('**', '').replace(/\s*\n\s*\n\s*/g, ' ');
