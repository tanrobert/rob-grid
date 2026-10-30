import zioChecco from '../assets/loghi/zio-checco.svg?raw';

/**
 * Loghi animati della cella `sottologo`: SVG messi nella pagina così come sono (lo script ne anima i pezzi, vedi
 * scripts/sottologo.ts e il commento in testa a ogni file). Il nome è quello che si scrive in `logo:` nell'index.md.
 * I commenti del file restano fuori dall'HTML pubblicato.
 */
const senzaCommenti = (svg: string) => svg.replace(/<!--[\s\S]*?-->\s*/g, '');

export const loghi: Record<string, string> = {
  // I panini di Zio Chècco da Kiale, sottologo estivo (dal 30/10/2026)
  'zio-checco': senzaCommenti(zioChecco),
};
