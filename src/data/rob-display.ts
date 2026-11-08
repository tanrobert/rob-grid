/*
 *  ROB DISPLAY (pagina /rob-display): il font del logotipo, costruito dalle regole sulla griglia aurea.
 *  I glifi vengono da rob-display.json (tools/rob-display.mjs, dal laboratorio del font in wanama/font): ogni glifo
 *  a pezzi separati (asta, gamba, pancia…, già forati dalle controforme), ogni nodo con la regola che lo genera.
 *  Coordinate del font: origine sulla linea di base, y verso l'alto, 1000 unità per em; u = 200/11, maiuscole 34u.
 *  Utilità della griglia portate dal laboratorio (wanama/font/lab/src/lib/font.ts). Usato solo al build.
 */
import dati from './rob-display.json';

/** [x, y, 1 = nodo sul contorno · 0 = maniglia, regola che genera il nodo (null per le maniglie)] */
export type Nodo = [number, number, 0 | 1, string | null];
export interface Pezzo { nome: string; contro: boolean; d: string; nodi: Nodo[] }
export interface Glifo {
  nome: string; carattere: string; slug: string;
  marchio: boolean; numero: boolean; segno: boolean;
  riquadro: [number, number, number, number];
  pezzi: Pezzo[];
}
interface Misure {
  asta: number; pendenza: number; P: [number, number]; Q: [number, number];
  gamba: { interno_alto: number; esterno_alto: number; interno_basso: number; esterno_basso: number; base: number; spessore: number; angolo: number };
  pancia: { raggio: number; centro: [number, number] };
}
interface Dati { generato: string; sistema: { u: number; cap: number }; misure: Misure; coppie: number; glifi: Glifo[] }

export const font = dati as unknown as Dati;
export const { u: U, cap: CAP } = font.sistema;
export const misure = font.misure;

/** Fascia verticale uguale per tutti i glifi: da −10u a 44u (2u sotto la coda della Q, che scende a −8u). */
export const Y_MIN = -10 * U;
export const Y_MAX = 44 * U;

const glifo = (nome: string) => font.glifi.find(g => g.nome === nome)!;
export const marchio = font.glifi.find(g => g.marchio)!;
export const erre = glifo('R');
export const lettere = font.glifi.filter(g => !g.marchio && !g.numero && !g.segno && g.nome.length === 1);
export const numeri = font.glifi.filter(g => g.numero);
/** segni e lettere accentate */
export const segni = font.glifi.filter(g => g.segno);

/** Riquadro orizzontale del glifo, arrotondato al modulo, con `margine` u attorno; mai più stretto della tavola (0…34u). */
export function fasciaX(g: Glifo, margine = 2): [number, number] {
  const [a, , b] = g.riquadro;
  return [Math.floor((Math.min(0, a) - margine * U) / U) * U, Math.ceil((Math.max(CAP, b) + margine * U) / U) * U];
}

/** viewBox in coordinate SVG (il glifo sta in <g transform="scale(1,-1)">: y SVG = −y font) */
export const viewBox = ([x0, x1]: [number, number], y0 = Y_MIN, y1 = Y_MAX) => `${x0} ${-y1} ${x1 - x0} ${y1 - y0}`;

/** Le linee della griglia u dentro un intervallo */
export function lineeU(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = Math.ceil(a / U - 1e-9); i * U <= b + 1e-9; i++) out.push(i * U);
  return out;
}

/** numeri a 2 decimali nei tracciati scritti qui (in unità da 1000 per em: invisibile a qualunque misura) */
const r = (v: number) => +v.toFixed(2);

/** La griglia u in due tracciati: le linee sottili e il quadrato della tavola (x 0 e 34u, base e altezza delle maiuscole),
 *  che va disegnato sopra, se no le sottili che lo incrociano lo spezzano. `tavola: false` = solo le sottili */
export function griglia(x0: number, x1: number, y0: number, y1: number) {
  const forte = (v: number) => Math.abs(v) < 1e-6 || Math.abs(v - CAP) < 1e-6;
  const sottili = [
    ...lineeU(x0, x1).filter(x => !forte(x)).map(x => `M${r(x)} ${r(y0)}V${r(y1)}`),
    ...lineeU(y0, y1).filter(y => !forte(y)).map(y => `M${r(x0)} ${r(y)}H${r(x1)}`),
  ].join('');
  return { sottili, verticali: `M0 ${r(y0)}V${r(y1)}M${r(CAP)} ${r(y0)}V${r(y1)}`, orizzontali: `M${r(x0)} 0H${r(x1)}M${r(x0)} ${r(CAP)}H${r(x1)}` };
}

/** Nodi e maniglie di un glifo in tre tracciati (quadratini e pallini sono tratti lunghi zero: Glifo.astro) e, per il
 *  clic, l'elenco dei nodi con pezzo e regola */
export function segniNodi(g: Glifo) {
  const punto = (n: Nodo) => `M${n[0]} ${n[1]}h0.01`;
  const tutti = g.pezzi.flatMap(p => p.nodi.map(n => ({ n, p })));
  const leve = g.pezzi.flatMap(p => p.nodi.flatMap((n, i) => {
    if (n[2]) return [];
    const prima = p.nodi[(i - 1 + p.nodi.length) % p.nodi.length], dopo = p.nodi[(i + 1) % p.nodi.length];
    return [prima, dopo].filter(m => m[2]).map(m => `M${n[0]} ${n[1]}L${m[0]} ${m[1]}`);
  }));
  return {
    nodi: tutti.filter(({ n }) => n[2]).map(({ n }) => punto(n)).join(''),
    maniglie: tutti.filter(({ n }) => !n[2]).map(({ n }) => punto(n)).join(''),
    leve: leve.join(''),
  };
}

/** I nodi di più glifi per il clic (scripts/glifo.ts), in un JSON solo: per ogni glifo [x, y, pezzo, regola], con pezzo
 *  e regola come indici nell'elenco `nomi` (ogni scritta una volta sola) */
export function datiNodi(glifi: Glifo[]) {
  const nomi: string[] = [];
  const indice = (t: string) => { const i = nomi.indexOf(t); return i >= 0 ? i : nomi.push(t) - 1; };
  const per = glifi.map(g => g.pezzi.flatMap(p => p.nodi.filter(n => n[2]).map(n => [n[0], n[1], indice(p.nome), indice(n[3] ?? '')])));
  return JSON.stringify({ nomi, glifi: per });
}

/** Numeri all'italiana: virgola decimale, senza zeri inutili dopo la virgola */
export const num = (v: number, n = 2) => {
  const s = v.toFixed(n).replace(/\.?0+$/, '');
  return (s === '-0' ? '0' : s).replace('.', ',');
};

/** I quadrati della costruzione del marchio (wanama/famiglia/strumenti/griglia.py): nome, x, y (Illustrator, y in giù), larghezza, altezza in u.
 *  Il primo è l'asta (13 × 34), poi 21, 13, 8, 5, 3, 2, 1, 1 */
const FIBONACCI: Array<[number, number, number, number]> = [
  [0, 0, 13, 34], [13, 0, 21, 21], [21, 21, 13, 13], [13, 26, 8, 8], [13, 21, 5, 5],
  [18, 21, 3, 3], [19, 24, 2, 2], [18, 25, 1, 1], [18, 24, 1, 1],
];
/** gli stessi in coordinate del font: x, y (dal basso), larghezza, altezza */
export const fibonacci = FIBONACCI.map(([x, y, w, h]) => ({ x: x * U, y: (34 - y - h) * U, w: w * U, h: h * U }));

/** I passi della cella del marchio (MarchioCell): come è nata la R, dalla griglia al codice.
 *  Tono semplice (Roberto, 9/11/2026: "senza fare troppo gli scienziati"): cosa si vede e perché, pochi numeri */
export const passiMarchio: Array<{ nome: string; title: string; body: string }> = [
  {
    nome: 'Griglia',
    title: 'La griglia',
    body: "Tutto parte da un quadrato diviso nei **quadrati di Fibonacci**, quelli della sezione aurea. Ogni misura del font viene da qui.",
  },
  {
    nome: 'Asta',
    title: "L'asta",
    body: "Il primo rettangolo è l'**asta**. Tutte le aste del font sono larghe così: la I è lei, da sola.",
  },
  {
    nome: 'Gamba',
    title: 'La gamba',
    body: "Una **diagonale** della griglia. Alla base è un po' più larga dell'asta, così di traverso **sembra spessa uguale**.",
  },
  {
    nome: 'Pancia',
    title: 'La pancia',
    body: "Un **cerchio** che tocca il bordo in alto e quello a destra, e passa dal punto dove la gamba incontra la griglia.",
  },
  {
    nome: 'R',
    title: 'Dal marchio alla R',
    body: "Il marchio è la **R senza buco**, la lettera da cui sono nate tutte le altre. Con il buco diventa la R.",
  },
  {
    nome: 'Nodi',
    title: 'Dal disegno al codice',
    body: "Il marchio è nato in **Illustrator**, poi l'ho **ridisegnato col codice**: ogni punto viene da una regola, e le curve sono esatte.",
  },
];

/** Una o due righe per ogni lettera e numero (GlifoCell), dal piano del font (wanama/font/PIANO.md), in parole semplici */
export const testi: Record<string, string> = {
  A: "La **V capovolta**, con una traversa.",
  B: "L'asta e **due pance**, una sopra l'altra. Quella in alto è appena più stretta, se no sembrerebbe più larga.",
  C: "La **O aperta** a destra.",
  D: "L'asta e **metà della O**.",
  E: "La I con **testa, barra e piede**. Testa e piede sono un po' più corti della tavola: lunghi fino in fondo sembrerebbero troppo.",
  F: "La **E senza piede**.",
  G: "La **C chiusa** in basso da una barra e da uno sperone.",
  H: "**Due aste** e una barra al centro.",
  I: "**L'asta del marchio**, da sola.",
  J: "La **U** con il lato sinistro tagliato e una zampa in alto.",
  K: "L'asta, la **gamba della R** e la stessa gamba capovolta.",
  L: "L'asta e il **piede della E**.",
  M: "**Due N** una accanto all'altra, che si specchiano.",
  N: "Due aste e una **diagonale** da un angolo all'altro.",
  O: "La forma di tutte le tonde: a metà fra un **cerchio** e un **quadrato**. Esce appena dalla griglia, perché una curva sembra sempre più piccola di un dritto.",
  P: "La I con una **pancia** e il **buco della R**.",
  Q: "La **O con una coda** sotto.",
  R: "Il **marchio con il buco**.",
  S: "**Due C**, una girata, con lo stesso ritmo della E.",
  T: "Una **testa** larga quanto la tavola e l'asta al centro.",
  U: "**Due aste** che in basso diventano metà della O.",
  V: "**Due gambe** ripide che si incontrano in basso.",
  W: "**Due V** affiancate.",
  X: "**Due diagonali** che si incrociano, larga come la V.",
  Y: "In alto **la X**, in basso un'asta.",
  Z: "Testa e piede e una **diagonale** che li unisce da angolo ad angolo.",
  '0': "Una **O più stretta e più squadrata**. I numeri sono tutti larghi uguale.",
  '1': "Una **T capovolta** con una bandiera in alto.",
  '2': "La **Z con la testa della S**.",
  '3': "**Due C** aperte a sinistra e un braccio al centro.",
  '4': "La **diagonale della N** su una barra, con l'asta della H.",
  '5': "Una testa, un'asta e la **pancia della S**.",
  '6': "La **parte alta della S** e un anello chiuso.",
  '7': "La **testa della T** e la diagonale della N.",
  '8': "**Due anelli**, col ritmo della S.",
  '9': "Il **6 capovolto**.",
};
