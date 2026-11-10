import { site } from './site';
import { siteVersion } from '../lib/version';

/** Le scritte piccole dei recapiti, in due coppie. `legale` (P.IVA, informativa) e `firma` (anno, versione) stanno in fondo
    alla cella recapiti dei fogli; sul tavolo `legale` sta nella cella con la mail (10/11/2026, scelta di Roberto) e
    nella striscia in basso a sinistra (Tavolo.astro) restano il nome, `anno` e `versione` (il nome c'è già: niente
    "© 2026 Roberto Tanasi" subito dopo "Roberto Tanasi"). Solo al build: la versione si legge da git */
export const anno = `© ${new Date().getFullYear()}`;
export const versione = `Portfolio modulare v.${siteVersion}`;
export const legale = [`P.IVA ${site.piva}`, 'Informativa privacy'];
export const firma = [`${anno} ${site.name}`, versione];
