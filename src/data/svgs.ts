import LogoR from '../assets/logo-r.svg';
import Roberto from '../assets/roberto.svg';
import LogoCompleto from '../assets/logo-completo.svg';
import LogoCompletoVerticale from '../assets/logo-completo-verticale.svg';
import LogoCompletoOrizzontale from '../assets/logo-completo-orizzontale.svg';

/** SVG disponibili nelle celle: componente + nome letto dagli screen reader. */
export const svgs = {
  'logo-r':                    { component: LogoR,                   label: 'Logo R' },
  'roberto':                   { component: Roberto,                 label: 'Roberto' },
  'logo-completo':             { component: LogoCompleto,            label: 'Roberto — logo completo' },
  'logo-completo-verticale':   { component: LogoCompletoVerticale,   label: 'Roberto — logo completo' },
  'logo-completo-orizzontale': { component: LogoCompletoOrizzontale, label: 'Roberto — logo completo' },
};

export type SvgName = keyof typeof svgs;
