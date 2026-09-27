import type { Project } from '../data/types';
import { projects } from '../data/projects';

/** "Ospitalità" → "ospitalita": chiave per URL e data-attribute */
export const tagSlug = (tag: string) =>
  tag.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const projectYear = (p: Project) => Number(p.period.match(/\d{4}/)?.[0] ?? 0);

/** Progetti dal più recente al più vecchio (a parità di anno: featured prima) */
export const projectsByYear = [...projects].sort(
  (a, b) => projectYear(b) - projectYear(a) || Number(!!b.featured) - Number(!!a.featured),
);

/** Tutti i tag con il numero di progetti, in ordine alfabetico */
export const allTags = [...new Set(projects.flatMap(p => p.tags))]
  .sort((a, b) => a.localeCompare(b, 'it'))
  .map(tag => ({ tag, slug: tagSlug(tag), count: projects.filter(p => p.tags.includes(tag)).length }));
