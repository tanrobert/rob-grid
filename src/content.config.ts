import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/*
 * Progetti: una cartella per progetto in src/content/progetti/<slug>/
 *   index.md               dati in alto (frontmatter), testo sotto
 *   copertina.png|jpg      foto della cella e della hero (la trova data/projects.ts per nome)
 *   altre foto, video…     citati dalle celle con percorsi relativi (./foto.jpg)
 *
 * `cells`: le celle proprie della pagina progetto, in ordine, tra le celle fisse (hero, titolo,
 * tag, anno…) e precedente/successivo. Ogni progetto usa solo i tipi che gli servono.
 * Un tipo nuovo: componente in components/cells/, voce in grid-types.ts, caso in CellContent.astro
 * e una voce in `cell` qui sotto.
 */

const unit = z.number().int().positive();
const colore = /^#[0-9a-f]{6}$/i;
const span = { w: unit, h: unit };
// bottone sotto il testo di una cella: un indirizzo del sito (/archivio) o esterno (https://…)
const bottone = z.strictObject({ label: z.string(), href: z.string().regex(/^(\/|https?:\/\/)/, 'href: "/pagina" o "https://…"') });

// campi comuni a tutte le celle (sottoinsieme di CellBase in data/grid-types.ts)
const base = {
  /** Facoltativo: senza id la cella prende c1, c2… */
  id: z.string().optional(),
  ...span,
  md: z.strictObject({ w: unit.optional(), h: unit.optional() }).optional(),
  sm: z.strictObject({ w: unit.optional(), h: unit.optional() }).optional(),
  tone: z.enum(['paper', 'red']).optional(),
  label: z.literal(false).optional(),
  hideOn: z.array(z.enum(['lg', 'md', 'sm'])).optional(),
};

const progetti = defineCollection({
  loader: glob({
    pattern: '*/index.md',
    base: './src/content/progetti',
    // id = nome della cartella = slug della pagina (/progetti/kiale)
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: ({ image }) => {
    const cell = z.discriminatedUnion('type', [
      z.strictObject({ ...base, type: z.literal('media'), image: image().optional(), video: z.string().optional(), alt: z.string(), caption: z.string().optional() }),
      z.strictObject({
        ...base, type: z.literal('text'), eyebrow: z.string().optional(), title: z.string(),
        body: z.union([z.string(), z.array(z.string())]).optional(),
        as: z.enum(['h2', 'p']).optional(), size: z.enum(['s', 'm', 'l']).optional(),
        // foto sotto il paragrafo, in un carosello che gira da solo
        immagini: z.array(z.strictObject({ image: image(), alt: z.string() })).min(2).optional(),
      }),
      z.strictObject({ ...base, type: z.literal('list'), title: z.string(), items: z.array(z.union([z.string(), z.strictObject({ label: z.string(), href: z.string() })])) }),
      // value anche numero in YAML (2024 senza virgolette)
      z.strictObject({ ...base, type: z.literal('stat'), value: z.union([z.string(), z.number()]).transform(String), caption: z.string() }),
      // barattoli che girano, da sfogliare, ognuno sul suo mockup (public/barattolo/<mockup>), etichette piatte nel progetto;
      // in colonna: occhiello, titolo e testo in alto a sinistra, i barattoli sotto
      z.strictObject({
        ...base, type: z.literal('barattolo'),
        eyebrow: z.string().optional(), title: z.string().optional(), body: z.union([z.string(), z.array(z.string())]).optional(),
        barattoli: z.array(z.strictObject({
          nome: z.string(), mockup: z.enum(['vaso-basso', 'vaso-alto']), etichetta: image(), bordo: image().optional(), parola: image().optional(), interno: image().optional(), tipo: z.enum(['pezzi', 'crema', 'filetti']),
          dentro: z.string().regex(colore, 'colore esadecimale, es. "#a3141c"'),
          pezzi: z.string().regex(colore, 'colore esadecimale, es. "#c8202a"').optional(),
        })).min(1),
      }),
      // mano col telefono e registrazione dello schermo dentro (video in public, .webm e poster .webp accanto)
      z.strictObject({
        ...base, type: z.literal('telefono'), video: z.string(), alt: z.string(), logo: image().optional(), logoAlt: z.string().optional(),
        eyebrow: z.string().optional(), title: z.string().optional(), body: z.union([z.string(), z.array(z.string())]).optional(),
      }),
      // sticker in un nastro infinito sotto un titolone (tools/sticker.mjs li prepara col bordo bianco)
      z.strictObject({
        ...base, type: z.literal('sticker'), immagini: z.array(image()).min(2), alt: z.string(),
        eyebrow: z.string().optional(), title: z.string().optional(), body: z.string().optional(), button: bottone.optional(),
      }),
      // affissioni nella loro strada, una dopo l'altra: foto intera e la stessa col solo cartellone scontornato (devono combaciare)
      z.strictObject({
        ...base, type: z.literal('affissione'), eyebrow: z.string().optional(), title: z.string().optional(),
        affissioni: z.array(z.strictObject({
          foto: image(), scontornata: image(), alt: z.string(), subtitle: z.string().optional(), body: z.string().optional(),
        })).min(1),
      }),
      // un sottologo e le sue applicazioni: il logo animato (un nome di data/loghi.ts) e le foto scontornate si alternano
      z.strictObject({
        ...base, type: z.literal('sottologo'), logo: z.string(),
        // lato: la foto è attaccata a quel lato della cella (es. un braccio che arriva dal bordo), entra ed esce da lì
        immagini: z.array(z.strictObject({ image: image(), alt: z.string(), lato: z.literal('sinistra').optional() })),
        eyebrow: z.string().optional(), title: z.string().optional(), body: z.string().optional(),
      }),
    ]);

    return z.strictObject({
      title: z.string(),
      /** Tag dei filtri dell'archivio (temporanei, da definire) */
      tags: z.array(z.string()).min(1),
      /** "dal 2024" / "nel 2016": l'anno ordina l'archivio */
      period: z.string().regex(/\d{4}/, 'period deve contenere un anno, es. "dal 2024"'),
      description: z.string(),
      featured: z.boolean().optional(),
      /** Chi ha fatto il marchio: `mio` (va col tag Logo), `cliente` (esistente) o `{ di: "Studio X" }`; senza = non detto */
      marchio: z.union([z.literal('mio'), z.literal('cliente'), z.strictObject({ di: z.string() })]).optional(),
      /** Forma della copertina in unità: cella in home e archivio, ×2 nella hero. Tavola: 600 px per unità */
      shape: z.strictObject(span).optional(),
      /** Foto di contesto (il posto, le persone): nella pagina progetto sotto titolo e descrizione */
      contesto: z.strictObject({ foto: image(), alt: z.string() }).optional(),
      /** Video in loop (percorso in /public), al posto della copertina, che gli fa da poster */
      video: z.string().optional(),
      cells: z.array(cell).optional(),
    });
  },
});

export const collections = { progetti };
