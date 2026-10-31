import LogoR from '../assets/logo-r.svg';

/** SVG disponibili nelle celle: componente + nome letto dagli screen reader */
interface SvgEntry { component: typeof LogoR; label: string }

const entries = {
  // il marchio esatto (22/10/2026): R su griglia Fibonacci, asta, gamba e pancia come forme separate.
  // Originale con le misure commentate: sorgenti/roberto/marchio-esatto.svg (fuori da git)
  'logo-r': { component: LogoR, label: 'Logo R' },
} satisfies Record<string, SvgEntry>;

export type SvgName = keyof typeof entries;
export const svgs: Record<SvgName, SvgEntry> = entries;
