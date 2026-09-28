import { projects } from '../data/projects';

export interface TagCount {
  tag: string;
  slug: string;
  count: number;
}

/** "Ospitalità" → "ospitalita": chiave per URL e data-attribute */
export const tagSlug = (tag: string) =>
  tag.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Tutti i tag con il numero di progetti, in ordine alfabetico */
export const allTags: TagCount[] = [...new Set(projects.flatMap(p => p.tags))]
  .sort((a, b) => a.localeCompare(b, 'it'))
  .map(tag => ({ tag, slug: tagSlug(tag), count: projects.filter(p => p.tags.includes(tag)).length }));
