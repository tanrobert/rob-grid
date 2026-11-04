import type { ImageMetadata } from 'astro';
import type { SvgName } from './svgs';
import type { TagCount } from '../lib/tags';

/** Unità occupate da una cella: w = colonne, h = righe (unità piccola: la cella quadrata di base è 2×2). */
export interface Span {
  w: number;
  h: number;
}

/** Mockup dei barattoli (tools/barattolo-mockup.py → public/barattolo/<nome>/) */
export type Mockup = 'vaso-basso' | 'vaso-alto';
/** Un barattolo della cella `barattolo`: etichetta piatta e interno segnaposto (colori chiari: si moltiplicano sul vetro) */
export interface Barattolo {
  nome: string;
  /** vaso-basso per le etichette 14×6, vaso-alto per le 14×9 */
  mockup: Mockup;
  /** larga 14 cm: l'altezza vera viene dalle proporzioni del file, e dà la scala comune tra i vasi */
  etichetta: ImageMetadata;
  /** bordo vettoriale dell'etichetta (SVG da Illustrator, un colore + bianco): in grande in fondo alla cella, sopra la didascalia */
  bordo?: ImageMetadata;
  /** la parola della linea (Confetture, Sughi…: SVG a tinta unica, vettorializzato), in verticale sopra la fascia del bordo, col suo colore */
  parola?: ImageMetadata;
  /** foto del contenuto (che si ripete senza stacco ai lati), avvolta come un cartoncino dentro il vetro al posto del segnaposto */
  interno?: ImageMetadata;
  /** pezzi = frutta o legumi nella confettura o nel sugo · crema = vellutata, sugo liscio · filetti = sott'olio */
  tipo: 'pezzi' | 'crema' | 'filetti';
  dentro: string;
  pezzi?: string;
}

/** Un'affissione della cella `affissione`: la foto e la stessa col solo cartellone scontornato (stessa misura, combaciano) */
export interface Affissione {
  foto: ImageMetadata;
  scontornata: ImageMetadata;
  alt: string;
  /** titolino sopra il paragrafo */
  subtitle?: string;
  body?: string;
}

/** Bottone sotto il testo di una cella (components/Bottone.astro): un link esterno si apre in una scheda nuova */
export interface Bottone { label: string; href: string }

/** un colore della cella palette; `secondario` = banda larga la metà */
export interface Colore { nome: string; hex: string; secondario?: true }
/** uno stato della cella palette: `nome` sul righello (Prima, Dopo), titolo e testo, i colori */
export interface Palette { nome: string; title: string; body: string; colori: Colore[] }

/** Colore di fondo della cella. */
export type Tone = 'paper' | 'red';

interface CellBase extends Span {
  /** Identificativo unico: memoria del tavolo, celle agganciate (presso), contatori. */
  id: string;
  /** Override opzionale su tablet (8 colonne). Default: w ridotto a max 8. */
  md?: Partial<Span>;
  /** Override opzionale su mobile (4 colonne). Default: w ridotto a max 4. */
  sm?: Partial<Span>;
  tone?: Tone;
  /** Se presente, la cella è cliccabile e apre la pagina come foglio sopra il tavolo. */
  href?: string;
  /** Il link sostituisce la pagina corrente nella history invece di aggiungerne una (progetto
      precedente/successivo: sfogliando, la ✕ torna comunque alla griglia di partenza). */
  replace?: boolean;
  /** Fogli: la cella sta dopo tutte le altre, sulla prima riga libera sotto la composizione, non nei buchi
      (precedente/successivo, recapiti; scripts/mosaico.ts) */
  coda?: boolean;
  /** Linguetta in alto a sinistra: solo il numero della cella. `false` per nasconderla. */
  label?: false;
  /** `false` = cella senza filo (es. il logo a tutta cella). */
  frame?: false;
  /** La cella è l'arrivo dell'espansione della cella con questo href (es. '/archivio'). */
  heroOf?: string;
  /** Nasconde la cella su questi breakpoint. */
  hideOn?: Array<'lg' | 'md' | 'sm'>;
  /** Misura sul tavolo della home, in quadretti, quando non è w×h unità × 4 (lib/tavolo.ts) */
  q?: Span;
  /** Solo sul tavolo: nella disposizione va accanto alla cella `id` (che viene prima nell'elenco), spostata di x, y
      quadretti dal suo angolo in alto a sinistra, invece del posto libero più vicino al centro. Visibile, e le altre
      celle le girano attorno (ROBERTO sotto la R) */
  presso?: Presso;
  /** Solo sul tavolo: nascosta finché qualcosa non la fa comparire (la radio, quando parte: scripts/radio.ts), e
      allora va sotto la cella `sotto` (che viene prima nell'elenco), a filo a sinistra, sopra le altre: `y` quadretti
      dal suo fondo (1 = un quadretto di stacco, di base; negativo = le si posa sopra). Nella disposizione non occupa
      posto: le altre celle non le girano attorno (lib/tavolo.ts, pack) */
  nascosta?: Nascosta;
}

export interface Nascosta { sotto: string; y?: number }

export interface Presso { id: string; x: number; y: number }

export type Cell = CellBase & (
  /** riordina: la cella è un tasto Riordina del tavolo, come quello della barra (scripts/tavolo) */
  | { type: 'svg'; svg: SvgName; fit?: 'contain' | 'bleed'; riordina?: boolean }
  /** ROBERTO scritto col font del logotipo, largo quanto la cella */
  | { type: 'logotipo' }
  | {
      /** un testo che scorre, scritto col font del logotipo */
      type: 'marquee'; text: string; /** secondi per un giro completo */ speed?: number;
      /** nastro girato di 90° in una cella verticale: si legge dal basso, scorre verso il basso */
      ruotato?: boolean;
    }
  | {
      type: 'text'; eyebrow?: string; title: string;
      /** Testo sotto il titolo: una stringa = paragrafo, un array = elenco di righe */
      body?: string | string[]; as?: 'h1' | 'h2' | 'p'; size?: 's' | 'm' | 'l';
      /** foto sotto il paragrafo, in un carosello che gira da solo (una sola: ferma) */
      immagini?: Array<{ image: ImageMetadata; alt: string }>;
      /** sotto le foto: un altro paragrafo e un bottone */
      after?: string; button?: Bottone;
    }
  | { type: 'list'; title: string; items: Array<string | { label: string; href: string }> }
  | { type: 'stat'; value: string; caption: string; /** il numero sale da 0 quando la cella entra in vista */ countUp?: boolean; /** h1 nascosto: la cella fa da hero di una pagina */ heading?: string }
  | { type: 'media'; image?: ImageMetadata; video?: string; overlay?: ImageMetadata; etichette?: 'scure'; alt: string; caption?: string;
      /** un'altra foto sotto la prima, nella stessa cella (metà altezza ciascuna) */ seconda?: { image: ImageMetadata; alt: string };
      /** le foto si ingrandiscono al clic, sopra il retino (scripts/ingrandisci.ts) */ ingrandisci?: true }
  | { type: 'project'; slug: string }
  | { type: 'clock' }
  | { type: 'cursor' }
  | { type: 'meter' }
  | { type: 'mark' }
  | { type: 'eye' }
  /** globo orientato come la Terra adesso, trascinabile */
  | { type: 'globe' }
  /** barattoli col mockup vero (public/barattolo/<mockup>) e l'etichetta piatta avvolta, da girare e sfogliare; testo in alto a sinistra */
  | { type: 'barattolo'; barattoli: Barattolo[]; eyebrow?: string; title?: string; body?: string | string[] }
  /** mano col telefono (public/telefono) e una registrazione dello schermo che scorre dentro (mp4 in public, .webm e poster .webp accanto); testo sopra.
   *  `logo`: SVG del cliente (testo in tracciati) in basso a sinistra, sopra la mano, con la sua descrizione `logoAlt` */
  | { type: 'telefono'; video: string; alt: string; eyebrow?: string; title?: string; body?: string | string[]; logo?: ImageMetadata; logoAlt?: string }
  /** sticker (WebP col bordo bianco, tools/sticker.mjs) in un nastro infinito sotto il titolone, da destra a
   *  sinistra (solo CSS), e un paragrafo in fondo. `alt` descrive l'insieme */
  | { type: 'sticker'; immagini: ImageMetadata[]; alt: string; eyebrow?: string; title?: string; body?: string; button?: Bottone }
  /** affissioni nella loro strada, una dopo l'altra (sfumano ogni tanto, il testo sotto cambia con loro): per ognuna la foto
   *  intera e, sopra, la stessa col solo cartellone scontornato; passando sulla foto la strada si schiarisce (al tocco si
   *  accende e si spegne). Titolone in alto, in fondo il paragrafo di ogni affissione col suo titolino `subtitle` */
  | { type: 'affissione'; affissioni: Affissione[]; eyebrow?: string; title?: string }
  /** un sottologo e le sue applicazioni: titolone, una vetrina dove si alternano il logo animato (`logo`: un nome di
   *  data/loghi.ts, si compone ogni volta che torna) e le foto scontornate, paragrafo in fondo. `lato`: foto attaccata a
   *  quel lato della cella (più grande, a filo del bordo), che entra ed esce scivolando da lì */
  | { type: 'sottologo'; logo: string; immagini: Array<{ image: ImageMetadata; alt: string; lato?: 'sinistra' }>; eyebrow?: string; title?: string; body?: string }
  /** la radio Purple Piper in diretta (data/radio.ts, scripts/radio.ts): logo, bottone, brano in onda e prossimo */
  | { type: 'radio'; eyebrow?: string }
  /** la costruzione di un segno che si disegna da sola (SVG di Illustrator coi tratti vivi, `svg` = il file così
   *  com'è, lib/costruzione.ts): titolone, il disegno, paragrafo in fondo. `alt` descrive il disegno */
  | { type: 'costruzione'; svg: string; alt: string; eyebrow?: string; title?: string; body?: string }
  /** l'evoluzione di un segno a passi (G&A: dai montanti e traversi del marchio storico al simbolo nuovo): il disegno a destra, a sinistra titolo e
   *  testo del passo e un righello col passo attuale; un clic sul disegno fa il passo dopo (scripts/evoluzione.ts).
   *  `svg` = il file annotato coi passi (data-passo, data-disegna…), così com'è; `alt` descrive il disegno */
  | { type: 'evoluzione'; svg: string; alt: string; eyebrow?: string; passi: Array<{ title: string; body: string }> }
  /** la palette di un marchio prima e dopo (G&A): a sinistra titolo e testo dello stato e il righello Prima · Dopo, a destra
   *  i colori in bande, coi contrasti WCAG; un clic passa all'altro stato (scripts/palette.ts) */
  | { type: 'palette'; eyebrow?: string; prima: Palette; dopo: Palette }
  /** le collezioni di un marchio una alla volta (G&A: le linee di porte): foto, velo del colore della linea, logo bianco al
   *  centro; un clic sulla foto fa la dopo, il righello porta a una collezione (scripts/collezioni.ts) */
  | { type: 'collezioni'; eyebrow?: string; title?: string; body?: string; collezioni: Array<{ nome: string; colore: string; logo: ImageMetadata; foto: ImageMetadata; alt: string }> }
  /** cella 02 delle pagine progetto con la foto di contesto: titolo (h1) e descrizione, sotto la foto a tutta larghezza */
  | { type: 'contesto'; eyebrow?: string; title: string; body?: string; image: ImageMetadata; alt: string; fondo?: string }
  /** pagina d'errore: codice grande con glitch, titolo (h1) e link all'indice, su carta a quadretti */
  | { type: 'error'; code: string; title: string }
  /** recapiti (email, luogo, P.IVA, versione): cella del tavolo e dei fogli */
  | { type: 'contatti'; /** `false` = senza le scritte in basso (sul tavolo stanno nel box in basso a sinistra) */ piede?: false }
  // solo archivio
  | { type: 'archive-head'; total: number }
  | { type: 'tags'; tags: TagCount[] }
);
