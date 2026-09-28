import type { Project } from '../data/types';
import { projects } from '../data/projects';

/** Anno letto da `period` ("dal 2024" → 2024). 0 se manca. */
export const projectYear = (p: Project) => Number(p.period.match(/\d{4}/)?.[0] ?? 0);

/** Anno del primo progetto in archivio */
export const firstYear = Math.min(...projects.map(projectYear).filter(Boolean));

/** Progetti dal più recente al più vecchio (a parità di anno: featured prima) */
export const projectsByYear = [...projects].sort(
  (a, b) => projectYear(b) - projectYear(a) || Number(!!b.featured) - Number(!!a.featured),
);
