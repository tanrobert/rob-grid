import type { Project } from '../data/types';
import { projects } from '../data/projects';

/** Anno letto da `period` ("dal 2024" → 2024). 0 se manca. Non si mostra più (28/10/2026): ordina l'archivio */
export const projectYear = (p: Project) => Number(p.period.match(/\d{4}/)?.[0] ?? 0);

/** Progetti dal più recente al più vecchio (a parità di anno: featured prima, poi per titolo) */
export const projectsByYear = [...projects].sort(
  (a, b) => projectYear(b) - projectYear(a) || Number(!!b.featured) - Number(!!a.featured) || a.title.localeCompare(b.title, 'it'),
);
