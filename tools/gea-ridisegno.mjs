// Genera src/content/progetti/gea/ridisegno-marchio.svg per la cella `ridisegno` di G&A (scripts/ridisegno.ts):
// il marchio storico, lo zoom sul braccio di sinistra, il braccio che cambia forma fino a quello del marchio ridisegnato,
// lo zoom indietro sul marchio ridisegnato (idea di Roberto del 6/11/2026; tavola 15 di sorgenti/gea/gea-tavole.ai,
// "Ridisegnare il simbolo": dalla FIG 01 alla FIG 03).
//
//   node tools/gea-ridisegno.mjs
//
// Sorgenti, nella cartella del progetto: logo-vecchio.svg (i quattro pezzi gialli, cls-1: il marchio storico com'era)
// ed evoluzione-simbolo.svg (la FIG 03, i quattro pezzi ridisegnati, nel gruppo che si disegna al passo 1). Il braccio di
// sinistra (il traverso) ha in tutti e due la stessa struttura, 20 vertici: due code di rondine che sporgono a destra e
// due incastri sotto. Ogni vertice va nel suo: il braccio si accorcia e le code di rondine prendono le misure esatte.
// La FIG 03 sta nello spazio del vecchio con lo stesso centro di rotazione e bracci dello stesso spessore.
//
// Il file così com'è è lo stato finale (il marchio ridisegnato): senza JavaScript, o con riduci movimento, si vede quello.
// Annotazioni per lo script:
//   svg  data-viste   quattro riquadri [x, y, w, h] da inquadrare: marchio vecchio, braccio vecchio, braccio
//                     ridisegnato, marchio ridisegnato (il viewBox del file)
//   g    data-prima   gli altri tre bracci del vecchio (nel file nascosti), spariscono durante lo zoom
//   g    data-dopo    gli altri tre bracci ridisegnati, compaiono durante lo zoom indietro
//   g    data-guide   vuoto: lo script ci disegna lati, guide e quadratini dei vertici
//   polygon data-braccio  il braccio che cambia: data-forme = le sue tappe (stessi vertici in tutte, [x, y]),
//                     data-segni = per ogni tappa quanto si vede il quadratino di ogni vertice (0 o 1),
//                     data-linee = coppie di vertici per le guide (i lati e le misure delle code di rondine),
//                     data-colori = colore all'inizio e alla fine. Nel file i punti e il colore dell'ultima tappa.
// Tappe: 0 il pezzo come nel file (angoli arrotondati, resi con due vertici), 1 gli angoli vivi (durante lo zoom),
// 2 il braccio ridisegnato.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'src/content/progetti/gea/';
const vecchio = readFileSync(dir + 'logo-vecchio.svg', 'utf8');
const evoluzione = readFileSync(dir + 'evoluzione-simbolo.svg', 'utf8');
// lo stesso giallo dall'inizio alla fine: è lo stesso marchio, ridisegnato (il colore nuovo è nella cella palette)
const GIALLO = vecchio.match(/\.cls-1\s*\{[^}]*fill:\s*(#[0-9a-f]{6})/i)[1];
const pezziPrima = [...vecchio.matchAll(/<path class="cls-1" d="([^"]+)"/g)].map(m => m[1]);
// la FIG 03: i quattro tracciati (solo M e L) del gruppo che si disegna al passo 1
const fig03 = evoluzione.match(/<g data-passo="1" data-disegna="insieme"[^>]*>([\s\S]*?)<\/g>/)?.[1];
if (!fig03) throw new Error('FIG 03 non trovata in evoluzione-simbolo.svg');
const pezziDopo = [...fig03.matchAll(/ d="([^"]+)"/g)].map(m => {
  const n = m[1].match(/-?[\d.]+/g).map(Number), p = [];
  for (let i = 0; i < n.length; i += 2) p.push([n[i], n[i + 1]]);
  const [a, z] = [p[0], p.at(-1)];
  return a[0] === z[0] && a[1] === z[1] ? p.slice(0, -1) : p;   // il tracciato torna al primo punto
});
if (pezziPrima.length !== 4 || pezziDopo.length !== 4) throw new Error('mi aspettavo quattro pezzi per marchio');

// il braccio di sinistra della FIG 03: quello più a sinistra. Nel file gira al contrario del vecchio (alto a sinistra,
// basso a sinistra, incastri sotto, alto a destra… ): lo giro e lo faccio partire dall'angolo in alto a sinistra, così i
// vertici vanno nello stesso ordine del vecchio: TL, TR, 8 della destra dall'alto, BR, 8 di sotto da destra, BL
const sinistro = pezziDopo.reduce((a, p) => (Math.min(...p.map(q => q[0])) < Math.min(...a.map(q => q[0])) ? p : a));
const giro = [sinistro[0], ...sinistro.slice(1).reverse()];
if (giro.length !== 20) throw new Error(`il braccio della FIG 03 ha ${giro.length} vertici, ne aspettavo 20`);
const altri = pezziDopo.filter(p => p !== sinistro);

// la FIG 03 nello spazio del vecchio: centro di rotazione (dove si incontrano i bracci) su quello del vecchio,
// spessore dei bracci uguale
const ys = giro.map(p => p[1]);
const SPESSORE_PRIMA = 157.8 - 105.96, SPESSORE_DOPO = Math.max(...ys) - Math.min(...ys);
const xsTutti = pezziDopo.flat().map(p => p[0]), ysTutti = pezziDopo.flat().map(p => p[1]);
const CENTRO_DOPO = [(Math.min(...xsTutti) + Math.max(...xsTutti)) / 2, (Math.min(...ysTutti) + Math.max(...ysTutti)) / 2];
const CENTRO = [216.3, 160.5], K = SPESSORE_PRIMA / SPESSORE_DOPO;
const nel = ([x, y]) => [CENTRO[0] + (x - CENTRO_DOPO[0]) * K, CENTRO[1] + (y - CENTRO_DOPO[1]) * K];

// il braccio vecchio, ricalcato sul tracciato del file (le curve sono tutte dritte, salvo gli angoli arrotondati, che
// qui sono due vertici: `gemello` è il secondo, che coincide col primo da angolo vivo in poi). `s` = il vertice della
// FIG 03 dove va (ordine di `giro`), `ang` = l'angolo vivo
const T = 105.96, B = 157.8, L = 3.53, R = 206.3;
const v = [
  { p: [3.53, 108.65], s: 0, ang: [L, T], gemello: true },
  { p: [6.24, 105.96], s: 0, ang: [L, T] },
  { p: [203.54, 105.96], s: 1, ang: [R, T] },
  { p: [206.17, 108.70], s: 1, ang: [R, T], gemello: true },
  // code di rondine sul lato destro (sporgono): base, punta, punta, base, due volte
  { p: [206.18, 113.76], s: 2 },
  { p: [214.61, 110.35], s: 3 },
  { p: [214.61, 122.11], s: 4 },
  { p: [206.37, 119.27], s: 5 },
  { p: [206.37, 134.58], s: 6 },
  { p: [214.52, 131.19], s: 7 },
  { p: [214.52, 143.06], s: 8 },
  { p: [206.56, 140.54], s: 9 },
  { p: [206.30, 155.65], s: 10, ang: [R, B] },
  { p: [204.07, 157.83], s: 10, ang: [R, B], gemello: true },
  // incastri sul lato in basso (entrano): bordo, fondo, fondo, bordo, due volte
  { p: [196.78, 157.80], s: 11 },
  { p: [199.76, 148.79], s: 12 },
  { p: [185.00, 148.79], s: 13 },
  { p: [188.34, 157.54], s: 14 },
  { p: [176.14, 157.54], s: 15 },
  { p: [178.63, 149.02], s: 16 },
  { p: [163.29, 149.02], s: 17 },
  { p: [166.15, 157.64], s: 18 },
  { p: [6.24, 157.79], s: 19, ang: [L, B] },
  { p: [3.53, 155.10], s: 19, ang: [L, B], gemello: true },
];

const tappe = [[], [], []], segni = [[], [], []];
v.forEach(x => {
  [x.p, x.ang ?? x.p, nel(giro[x.s])].forEach((p, t) => tappe[t].push(p.map(n => +n.toFixed(2))));
  // quadratini: dopo lo zoom su tutti i vertici veri
  [0, x.gemello ? 0 : 1, x.gemello ? 0 : 1].forEach((s, t) => segni[t].push(s));
});
// guide: i quattro lati, la linea delle punte delle code di rondine, quella del fondo degli incastri
const vertice = s => v.findIndex(x => x.s === s && !x.gemello);
const linee = [[0, 1], [1, 10], [10, 19], [19, 0], [3, 4], [12, 13]].map(([a, b]) => [vertice(a), vertice(b)]);

// riquadri da inquadrare, con un po' d'aria
const riquadro = punti => {
  const xs = punti.map(p => p[0]), ys = punti.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
};
const aria = ([x, y, w, h], f) => { const d = Math.max(w, h) * f; return [x - d, y - d, w + 2 * d, h + 2 * d].map(n => +n.toFixed(2)); };
// il vecchio: i quattro pezzi (dai riquadri misurati sul file: braccio 0 da 3.5, gli altri tre fino a 366.4 e 301.9)
const vistaPrima = aria([3.5, 9.3, 362.9, 292.6], 0.06);
const vistaBraccioPrima = aria(riquadro(tappe[1]), 0.08);
const vistaBraccioDopo = aria(riquadro(tappe[2]), 0.08);
const vistaDopo = aria(riquadro(pezziDopo.flat().map(nel)), 0.06);
const viste = [vistaPrima, vistaBraccioPrima, vistaBraccioDopo, vistaDopo];

const punti = ps => ps.map(p => p.join(',')).join(' ');
const json = x => JSON.stringify(x).replace(/"/g, '&quot;');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vistaDopo.join(' ')}" data-viste="${json(viste)}">
<!-- generato da tools/gea-ridisegno.mjs: non modificare a mano -->
<g data-prima opacity="0" fill="${GIALLO}">
${pezziPrima.slice(1).map(d => `<path d="${d}"/>`).join('\n')}
</g>
<g data-dopo fill="${GIALLO}">
${altri.map(p => `<polygon points="${punti(p.map(nel).map(q => q.map(n => +n.toFixed(2))))}"/>`).join('\n')}
</g>
<polygon data-braccio fill="${GIALLO}" points="${punti(tappe[2])}" data-forme="${json(tappe)}" data-segni="${json(segni)}" data-linee="${json(linee)}" data-colori="${json([GIALLO, GIALLO])}"/>
<g data-guide></g>
</svg>
`;
writeFileSync(dir + 'ridisegno-marchio.svg', svg);
console.log('ridisegno-marchio.svg', svg.length, 'byte · scala', K.toFixed(4), '· viste', JSON.stringify(viste));
