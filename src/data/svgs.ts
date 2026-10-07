import LogoR from '../assets/logo-r.svg';
import Roberto from '../assets/roberto.svg';
import LogoCompleto from '../assets/logo-completo.svg';
import LogoCompletoVerticale from '../assets/logo-completo-verticale.svg';
import LogoCompletoOrizzontale from '../assets/logo-completo-orizzontale.svg';
import LogoCompletoOrizzontaleLungo from '../assets/logo-completo-orizzontale-lungo.svg';

/**
 * SVG disponibili nelle celle: componente + nome letto dagli screen reader.
 * `gap` (solo per i marquee): spazio tra una copia e l'altra, in frazione del lato corto del logo
 * (altezza se scorre in orizzontale, larghezza in verticale), misurato nel file.
 */
interface SvgEntry { component: typeof LogoR; label: string; gap?: number }

const entries = {
  'logo-r':                    { component: LogoR,                   label: 'Logo R' },
  // spazio O→B del lettering: tra la O finale e la R iniziale si forma la stessa coppia tonda→asta
  'roberto':                   { component: Roberto,                 label: 'Roberto', gap: 29.1 / 123.6 },
  'logo-completo':             { component: LogoCompleto,            label: 'Roberto — logo completo' },
  // stacco tra lettering e R grande nel logo
  'logo-completo-verticale':   { component: LogoCompletoVerticale,   label: 'Roberto — logo completo', gap: 82.94 / 247.21 },
  'logo-completo-orizzontale': { component: LogoCompletoOrizzontale, label: 'Roberto — logo completo' },
  // finisce con un quadratino: dopo, lo stesso spazio che c'è attorno agli altri quadratini
  'logo-completo-orizzontale-lungo': { component: LogoCompletoOrizzontaleLungo, label: 'Roberto — grafica, web', gap: 49.14 / 127.76 },
} satisfies Record<string, SvgEntry>;

export type SvgName = keyof typeof entries;
export const svgs: Record<SvgName, SvgEntry> = entries;
