import { site } from './site';
import { siteVersion } from '../lib/version';

/** Le scritte piccole dei recapiti (P.IVA, informativa, anno, versione): in fondo alla cella recapiti dei fogli e,
    sul tavolo, nel box in basso a sinistra (Tavolo.astro). Solo al build: la versione si legge da git */
export const piede = [
  `P.IVA ${site.piva}`,
  'Informativa privacy',
  `© ${new Date().getFullYear()} ${site.name}`,
  `Portfolio modulare v.${siteVersion}`,
];
