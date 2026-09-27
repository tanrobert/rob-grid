/**
 * Carta millimetrata come stringa SVG: 10×10 quadretti per unità, mezzeria più marcata.
 * Usata sia al build (GridPaper.astro) sia nel browser (vuoti ricalcolati dopo i filtri).
 */
export function paperSVG(w: number, h: number, className = ''): string {
  const W = w * 10, H = h * 10;
  let lines = '';
  for (let x = 1; x < W; x++) lines += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"${x % 5 === 0 ? ' class="half"' : ''}/>`;
  for (let y = 1; y < H; y++) lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"${y % 5 === 0 ? ' class="half"' : ''}/>`;
  return `<svg class="paper ${className}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>`;
}
