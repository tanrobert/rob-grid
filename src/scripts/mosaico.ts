/**
 * Mosaico dei fogli: il paragrafo non si rimpicciolisce mai per starci (scelta di Roberto, 30/10/2026), è la cella
 * che cresce. Se una riga di testo esce dalla cella, la cella si allunga di una riga della griglia (4 quadretti:
 * i bordi restano sulle righe, allineati alle celle accanto) finché ci sta. I testi cambiano spesso: così non va
 * ritoccata a mano la misura delle celle a ogni testo nuovo.
 * - Le righe in più sono `--piu` sulla cella (global.css: grid-row span --h + --piu), rifatte da capo al resize.
 * - Solo nei fogli e nella pagina vera (.grid): sul tavolo le celle hanno posti fissi in quadretti.
 * - Celle di coda (`coda`, data-coda: precedente/successivo, recapiti): sempre dopo la composizione, sulla prima riga
 *   libera sotto tutte le altre (--riga), non nei buchi che la griglia `dense` riempirebbe. Senza JavaScript restano
 *   in fondo all'ordine, come prima.
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
function allunga(daCapo: boolean, griglie = [...document.querySelectorAll<HTMLElement>('.grid')]) {
  const celle = griglie.flatMap(g => [...g.querySelectorAll<HTMLElement>(':scope > .cell')])
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

/** porta le celle di coda della griglia sotto le altre: dalla prima riga libera, una dopo l'altra come le metterebbe
    la griglia (al primo posto libero, a capo se non ci stanno: tutte sulla stessa riga, se le colonne non bastano,
    la griglia ne aggiungerebbe e cambierebbe la composizione). Misure di layout (offset*), non getBoundingClientRect:
    durante l'intro e i Flip dell'archivio le celle hanno transform */
export function chiudiCoda(grid: HTMLElement) {
  const celle = [...grid.querySelectorAll<HTMLElement>(':scope > .cell')].filter(c => !c.hidden);
  const coda = celle.filter(c => c.hasAttribute('data-coda'));
  if (!coda.length) return;
  coda.forEach(c => c.style.removeProperty('--riga'));
  const altre = celle.filter(c => !coda.includes(c) && c.offsetParent);
  if (!altre.length) return;
  const s = getComputedStyle(grid);
  const gap = parseFloat(s.rowGap);
  const passo = parseFloat(s.gridAutoRows) + gap;  // righe e colonne hanno la stessa misura (--u)
  const colonne = s.gridTemplateColumns.split(' ').length;
  const unita = (px: number) => Math.max(1, Math.round((px + gap) / passo));
  const prima = unita(Math.max(...altre.map(c => c.offsetTop + c.offsetHeight))) + 1;  // linee della griglia da 1
  const prese = new Set<string>();
  const libero = (r: number, k: number, w: number, h: number) => {
    for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) if (prese.has(`${r + i},${k + j}`)) return false;
    return true;
  };
  for (const c of coda.filter(c => c.offsetParent)) {
    const w = Math.min(unita(c.offsetWidth), colonne), h = unita(c.offsetHeight);
    for (let r = prima; ; r++) {
      const k = Array.from({ length: colonne - w + 1 }, (_, k) => k).find(k => libero(r, k, w, h));
      if (k === undefined) continue;
      for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) prese.add(`${r + i},${k + j}`);
      c.style.setProperty('--riga', String(r));
      break;
    }
  }
}

export function initMosaico(signal: AbortSignal) {
  const griglie = [...document.querySelectorAll<HTMLElement>('.grid')];
  allunga(false, griglie);
  // griglie già misurate: un foglio aperto dal tavolo arriva nascosto (scripts/foglio), si allunga quando compare
  const viste = new WeakSet<Element>(griglie.filter(g => g.getClientRects().length));
  // coda: rifatta a ogni cambio di misura della griglia, anche quando la finestra non cambia (il righello nasconde la
  // scrollbar e la griglia guadagna una colonna), quando una cella cresce e quando un foglio compare. Rimetterla a
  // posto non cambia di nuovo la misura, quindi non gira all'infinito
  const ro = new ResizeObserver(voci => voci.forEach(({ target, contentRect }) => {
    const g = target as HTMLElement;
    if (!contentRect.width) return;
    if (!viste.has(g)) { viste.add(g); allunga(false, [g]); }
    chiudiCoda(g);
  }));
  griglie.forEach(g => ro.observe(g));
  signal.addEventListener('abort', () => ro.disconnect());
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
