import type { ImageMetadata } from 'astro';

// Versioni in bianco e nero delle foto (tools/grigio.mjs), trovate dal nome del file della foto
const files = import.meta.glob<{ default: ImageMetadata }>('../assets/grigio/*.webp', { eager: true });
const byName = new Map(Object.entries(files).map(([p, m]) => [p.split('/').pop()!.replace('.webp', ''), m.default]));

/** Nome del file senza cartella, hash ed estensione: /_astro/kiale.Bo0eq7QB.png e /@fs/…/kiale.png?… → kiale */
const nameOf = (img: ImageMetadata) => img.src.split('?')[0].split('/').pop()!.split('.')[0];

export const greyOf = (img?: ImageMetadata) => (img ? byName.get(nameOf(img)) : undefined);
