import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/*
 * Progetti: una cartella per progetto in src/content/progetti/<slug>/
 *   index.md               dati in alto (frontmatter), testo sotto
 *   copertina.png|jpg|webp foto della cella e della hero (la trova data/projects.ts per nome)
 *   altre foto, video…     citati dalle celle con percorsi relativi (./foto.jpg)
 *
 * `cells`: le celle proprie della pagina progetto, in ordine, tra le celle fisse (hero, titolo
 * o contesto) e precedente/successivo. Ogni progetto usa solo i tipi che gli servono.
 * Un tipo nuovo: componente in components/cells/, voce in grid-types.ts, caso in CellContent.astro
 * e una voce in `cell` qui sotto.
 */

const unit = z.number().int().positive();
const colore = /^#[0-9a-f]{6}$/i;
// altezze anche a quarti di unità: un quarto = un quadretto (le righe dei fogli sono quadretti)
const quarti = z.number().positive().multipleOf(0.25);
const span = { w: unit, h: quarti };
// coda-link in fondo a una cella (components/CodaLink, es. Visita il sito): un indirizzo del sito (/archivio) o esterno (https://…)
const palette = z.strictObject({
  nome: z.string(), title: z.string(), body: z.string(),
  colori: z.array(z.strictObject({
    nome: z.string(), hex: z.string().regex(colore, 'hex: "#rrggbb"'), secondario: z.literal(true).optional(),
  })).min(1),
});
const fileCostruzione = z.string().regex(/^\.\/costruzione-[\w-]+\.svg$/, 'disegno: ./costruzione-<nome>.svg');
const bottone = z.strictObject({ label: z.string(), href: z.string().regex(/^(\/|https?:\/\/)/, 'href: "/pagina" o "https://…"') });

// campi comuni a tutte le celle (sottoinsieme di CellBase in data/grid-types.ts)
const base = {
  /** Facoltativo: senza id la cella prende c1, c2… */
  id: z.string().optional(),
  ...span,
  md: z.strictObject({ w: unit.optional(), h: quarti.optional() }).optional(),
  sm: z.strictObject({ w: unit.optional(), h: quarti.optional() }).optional(),
  tone: z.enum(['paper', 'red']).optional(),
  label: z.literal(false).optional(),
  /** false: senza filo (e una cella media con un disegno anche senza fondo, grande quanto la cella) */
  frame: z.literal(false).optional(),
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
      // pila: altre foto sotto la prima, nella stessa cella, in colonna
      z.strictObject({
        ...base, type: z.literal('media'), image: image().optional(), video: z.string().optional(), alt: z.string(), caption: z.string().optional(),
        pila: z.array(z.strictObject({ image: image(), alt: z.string() })).min(1).optional(),
        // altre foto a turno con la prima, in un carosello che gira da solo (cells.ts). taglio: sopra = la foto
        // resta posata sul bordo di sotto e, se non ci sta, perde solo la parte alta
        immagini: z.array(z.strictObject({ image: image(), alt: z.string(), taglio: z.literal('sopra').optional() })).min(1).optional(),
        // le foto si ingrandiscono al clic (scripts/ingrandisci.ts)
        ingrandisci: z.literal(true).optional(),
        // colore del campo sotto un disegno SVG (es. un logo sul fondo del suo sito): numero e freccia chiari
        fondo: z.string().regex(colore, 'fondo: "#rrggbb"').optional(),
      }),
      // muro di copertine che si alternano (Caleidoscopio): le copertine in public/<cartella>
      z.strictObject({
        ...base, type: z.literal('copertine'), cartella: z.string().regex(/^\/[\w/-]+$/, 'cartella: "/cartella/in/public"'),
        alt: z.string(), righe: unit.optional(),
      }),
      z.strictObject({
        ...base, type: z.literal('text'), eyebrow: z.string().optional(), title: z.string(),
        body: z.union([z.string(), z.array(z.string())]).optional(),
        as: z.enum(['h2', 'p']).optional(), size: z.enum(['s', 'm', 'l']).optional(),
        // foto sotto il paragrafo, in un carosello che gira da solo (una sola: ferma)
        immagini: z.array(z.strictObject({ image: image(), alt: z.string() })).min(1).optional(),
        // le foto si ingrandiscono al clic invece di passare alla dopo (scripts/ingrandisci.ts)
        ingrandisci: z.literal(true).optional(),
        // sotto le foto: un altro paragrafo; button = coda in fondo alla cella
        after: z.string().optional(), button: bottone.optional(),
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
        // fondo della testa: una forma (SVG) dietro occhiello e titolo, che sborda dalla cella e mostra solo il lato di sotto
        testata: image().optional(),
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
      // la radio Purple Piper in diretta (data/radio.ts): logo, bottone, brano in onda
      z.strictObject({ ...base, type: z.literal('radio'), eyebrow: z.string().optional() }),
      // la costruzione di un segno che si disegna da sola: `disegno` = SVG coi tratti vivi nella cartella del progetto,
      // chiamato costruzione-*.svg (data/projects.ts lo legge), o più SVG da affiancare, da sinistra a destra
      z.strictObject({
        ...base, type: z.literal('costruzione'),
        disegno: z.union([fileCostruzione, z.array(fileCostruzione).min(1)]),
        alt: z.string(), eyebrow: z.string().optional(), title: z.string().optional(), body: z.string().optional(),
      }),
      // l'evoluzione di un segno a passi, uno per clic: `disegno` = SVG annotato coi passi (evoluzione-*.svg nella cartella
      // del progetto, vedi scripts/evoluzione.ts), `passi` = titolo e testo di ognuno, tanti quanti i passi dell'SVG
      z.strictObject({
        ...base, type: z.literal('evoluzione'), disegno: z.string().regex(/^\.\/evoluzione-[\w-]+\.svg$/, 'disegno: ./evoluzione-<nome>.svg'),
        alt: z.string(), eyebrow: z.string().optional(),
        passi: z.array(z.strictObject({ title: z.string(), body: z.string() })).min(2),
      }),
      // un marchio ridisegnato, in un'animazione sola: `disegno` = SVG annotato (ridisegno-*.svg nella cartella del
      // progetto, generato da uno script in tools/, vedi scripts/ridisegno.ts)
      z.strictObject({
        ...base, type: z.literal('ridisegno'), disegno: z.string().regex(/^\.\/ridisegno-[\w-]+\.svg$/, 'disegno: ./ridisegno-<nome>.svg'),
        alt: z.string(), eyebrow: z.string().optional(), title: z.string().optional(), body: z.string().optional(),
      }),
      // un disegno che si compone da solo (la firma che si scrive, le parti di un marchio che arrivano): `disegno` = SVG
      // annotato (animato-*.svg nella cartella del progetto, vedi scripts/animato.ts), `fondo` = colore sotto il disegno
      z.strictObject({
        ...base, type: z.literal('animato'), disegno: z.string().regex(/^\.\/animato-[\w-]+\.svg$/, 'disegno: ./animato-<nome>.svg'),
        alt: z.string(), eyebrow: z.string().optional(), title: z.string().optional(), body: z.string().optional(),
        fondo: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
      }),
      // una cella divisa in riquadri da un filo, ognuno con titoletto e paragrafo (gli obiettivi di un progetto)
      z.strictObject({
        ...base, type: z.literal('punti'), eyebrow: z.string().optional(),
        punti: z.array(z.strictObject({
          title: z.string(), body: z.string(),
          // icona a fil di linea rossa in alto nel riquadro (PuntiCell)
          icona: z.enum(['frecce', 'cerchio-quadrato', 'quadrati', 'mirino']).optional(),
        })).min(2),
      }),
      // le versioni di un logo, una alla volta: `logo` = SVG di Illustrator nella cartella del progetto, chiamato
      // versione-*.svg (data/projects.ts lo legge); la prima versione ha tutte le parti (lib/versioni.ts)
      z.strictObject({
        ...base, type: z.literal('versioni'), eyebrow: z.string().optional(), alt: z.string(),
        versioni: z.array(z.strictObject({
          title: z.string(), logo: z.string().regex(/^\.\/versione-[\w-]+\.svg$/, 'logo: ./versione-<nome>.svg'),
        })).min(2),
      }),
      // la palette prima e dopo, un clic per passare dall'una all'altra: il colore i di prima diventa il colore i di dopo,
      // quelli in più (dopo ne ha almeno quanti prima) entrano allargandosi; `secondario` = banda larga la metà
      z.strictObject({
        ...base, type: z.literal('palette'), eyebrow: z.string().optional(), prima: palette, dopo: palette,
      }).refine(c => c.dopo.colori.length >= c.prima.colori.length, 'palette: dopo deve avere almeno i colori di prima'),
      // due colori che sfumano, il primo sopra e il secondo sotto, con nome e HEX
      z.strictObject({
        ...base, type: z.literal('sfumatura'),
        colori: z.tuple([
          z.strictObject({ nome: z.string(), hex: z.string().regex(colore, 'hex: "#rrggbb"') }),
          z.strictObject({ nome: z.string(), hex: z.string().regex(colore, 'hex: "#rrggbb"') }),
        ]),
      }),
      // le collezioni una alla volta, un clic per passare: per ognuna la foto, il velo del suo colore e il logo (SVG a un
      // colore, diventa bianco)
      z.strictObject({
        ...base, type: z.literal('collezioni'), eyebrow: z.string().optional(), title: z.string().optional(), body: z.string().optional(),
        collezioni: z.array(z.strictObject({
          nome: z.string(), colore: z.string().regex(colore, 'colore: "#rrggbb"'), logo: image(), foto: image(), alt: z.string(),
        })).min(2),
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
      /** Foto di contesto (il posto, le persone): nella pagina progetto sotto titolo e descrizione.
          `fondo` (colore del fondo della foto): foto intera, mai ingrandita, al centro di un campo di quel colore (immagini piccole).
          `didascalia`: una riga in alto a sinistra sulla foto o sul campo (es. "Logo originale · prima del 2018") */
      contesto: z.strictObject({ foto: image(), alt: z.string(), fondo: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), didascalia: z.string().optional() }).optional(),
      /** Video in loop (percorso in /public), al posto della copertina, che gli fa da poster */
      video: z.string().optional(),
      /** PNG trasparente sopra video o copertina (es. il logo sopra il video), stessa tavola della copertina */
      overlay: image().optional(),
      /** Numero, freccia e ✕ della copertina scuri (copertine chiare); di base chiari */
      etichette: z.literal('scure').optional(),
      cells: z.array(cell).optional(),
    });
  },
});

export const collections = { progetti };
