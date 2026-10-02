import { geoGraticule, geoOrthographic, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';

/**
 * Globo della casella "terra": la Terra orientata com'è adesso nello spazio.
 * Rotazione siderale (un giro ogni 23h56m rispetto alle stelle): al centro c'è il meridiano
 * che guarda verso il punto d'equinozio; asse inclinato di 23,4° come un mappamondo.
 * Usato al build (primo disegno nell'HTML) e nel browser (scripts/globe.ts).
 */

const TILT = 23.44;
const VIEW = 100;  // viewBox dell'SVG
const RADIUS = 46; // come il cerchio dell'occhio (EyeCell): stessa misura nelle due caselle

/** [λ, φ] per d3: il punto al centro è [-λ, -φ]. */
export type Spin = [number, number];

/** Tempo siderale di Greenwich in gradi (formula IAU semplificata, errore < 0,1 s). */
function gmst(date: Date): number {
  const d = date.getTime() / 864e5 - 10957.5;  // giorni da J2000.0
  return (((280.46061837 + 360.98564736629 * d) % 360) + 360) % 360;
}

/** Orientamento reale adesso: al centro la longitudine -GMST, cioè quella rivolta all'equinozio. */
export const realSpin = (date = new Date()): Spin => [gmst(date), 0];

const graticule = geoGraticule().step([15, 15])();
const sphere: GeoPermissibleObjects = { type: 'Sphere' };

export interface GlobePaths { grid: string; land: string; rim: string }

export function drawGlobe(land: GeoPermissibleObjects, [λ, φ]: Spin): GlobePaths {
  const proj = geoOrthographic()
    .scale(RADIUS)
    .translate([VIEW / 2, VIEW / 2])
    .rotate([λ, φ, -TILT])  // γ: polo nord inclinato verso destra, come visto dall'equinozio
    .precision(0.3);
  const path = geoPath(proj).digits(2);
  return {
    grid: path(graticule) ?? '',
    land: path(land) ?? '',
    rim: path(sphere) ?? '',
  };
}
