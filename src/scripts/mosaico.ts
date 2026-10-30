/**
 * Mosaico dei fogli: il paragrafo non si rimpicciolisce mai per starci (scelta di Roberto, 30/10/2026), è la cella
 * che cresce. Se una riga di testo esce dalla cella, la cella si allunga di una riga della griglia (4 quadretti:
 * i bordi restano sulle righe, allineati alle celle accanto) finché ci sta. I testi cambiano spesso: così non va
 * ritoccata a mano la misura delle celle a ogni testo nuovo.
 * - Le righe in più sono `--piu` sulla cella (global.css: grid-row span --h + --piu), rifatte da capo al resize.
 * - Solo nei fogli e nella pagina vera (.grid): sul tavolo le celle hanno posti fissi in quadretti.
 * - Esclusi i titoloni (size 'l', si adattano loro alla cella: titoloni.ts) e i testi fuori dalla cella per scelta
 *   (didascalie dei progetti, nomi sotto i barattoli, titoli solo per gli screen reader).
 */

const MAX_PIU = 12;
const ATTESA = 150;  // ms senza resize prima di rimisurare
// il logotipo ha il riquadro rifilato sull'inchiostro: le righe del testo escono per costruzione
const FUORI = '[aria-hidden="true"], .cell__label, .caption, .sr-only, .logotipo, svg';

/** di quanti px il testo della cella esce dal suo rettangolo (0 = ci sta) */
function esce(cella: HTMLElement, rg: Range) {
  const r = cella.getBoundingClientRect();
  const testi = document.createTreeWalker(cella, NodeFilter.SHOW_TEXT);
  let fuori = 0;
  for (let n = testi.nextNode(); n; n = testi.nextNode()) {
    if (!n.textContent!.trim() || n.parentElement!.closest(FUORI)) continue;
    rg.selectNodeContents(n);
    const t = rg.getBoundingClientRect();
    if (t.height) fuori = Math.max(fuori, r.top - t.top, t.bottom - r.bottom);
  }
  return fuori > 0.5 ? fuori : 0;
}

const piu = (c: HTMLElement) => Number(c.style.getPropertyValue('--piu') || 0);
const metti = (c: HTMLElement, n: number) => (n ? c.style.setProperty('--piu', String(n)) : c.style.removeProperty('--piu'));

/** allunga le celle visibili finché il testo ci sta; `daCapo` = prima torna alle misure scritte (resize) */
function allunga(daCapo: boolean) {
  const celle = [...document.querySelectorAll<HTMLElement>('.grid > .cell')]
    .filter(c => c.getClientRects().length && !c.querySelector('.text--l'));
  if (daCapo) celle.forEach(c => metti(c, 0));
  const rg = document.createRange();
  // a giri: prima tutte le letture, poi tutte le scritture (una sola misura della pagina per giro).
  // Se una riga in più non fa uscire meno testo (numeri e titoli che crescono con la cella) la si toglie e basta
  let corte = new Map<HTMLElement, number>(celle.map(c => [c, Infinity]));  // cella → px fuori al giro prima
  for (let giro = 0; corte.size && giro <= MAX_PIU; giro++) {
    const misure = [...corte].map(([c, prima]) => [c, prima, esce(c, rg)] as const);
    corte = new Map();
    for (const [c, prima, fuori] of misure) {
      if (!fuori) continue;
      if (fuori >= prima - 0.5) { metti(c, piu(c) - 1); continue; }
      if (giro < MAX_PIU) { metti(c, piu(c) + 1); corte.set(c, fuori); }
    }
  }
}

export function initMosaico(signal: AbortSignal) {
  allunga(false);
  let timer = 0, larga = innerWidth;
  addEventListener('resize', () => {
    // solo se cambia la larghezza: l'altezza (barra del browser sul telefono) non cambia gli a capo
    if (innerWidth === larga) return;
    larga = innerWidth;
    clearTimeout(timer);
    timer = window.setTimeout(() => allunga(true), ATTESA);
  }, { signal });
  signal.addEventListener('abort', () => clearTimeout(timer));
}
