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
// due incastri sotto. Il vecchio resta quello del file, curve e imperfezioni comprese (26 ancoraggi: gli angoli
// arrotondati sono due, e due ancoraggi stanno a metà lato); ogni ancoraggio va nel suo vertice e le maniglie si
// chiudono (correzione di Roberto del 6/11/2026): il braccio si accorcia e le code di rondine prendono le misure esatte.
// La FIG 03 sta nello spazio del vecchio con lo stesso centro di rotazione e bracci dello stesso spessore.
//
// Il file così com'è è lo stato finale (il marchio ridisegnato): senza JavaScript, o con riduci movimento, si vede quello.
// Annotazioni per lo script:
//   svg  data-viste   quattro riquadri [x, y, w, h] da inquadrare: marchio vecchio, braccio vecchio, braccio
//                     ridisegnato, marchio ridisegnato (il viewBox del file)
//   g    data-prima   gli altri tre bracci del vecchio (nel file nascosti), spariscono durante lo zoom
//   g    data-dopo    gli altri tre bracci ridisegnati, compaiono durante lo zoom indietro
//   g    data-guide   vuoto: lo script ci disegna lati, guide, maniglie e quadratini degli ancoraggi
//   path data-braccio  il braccio che cambia: data-forme = le sue tappe, per ogni segmento [x, y] di ancoraggio, maniglia
//                     d'uscita e maniglia d'entrata del prossimo (stessi punti in tutte le tappe),
//                     data-linee = coppie di ancoraggi per le guide (i lati e le misure delle code di rondine),
//                     data-colori = colore all'inizio e alla fine. Nel file la forma e il colore dell'ultima tappa.
// Tappe: 0 il braccio come nel file (resta così per tutto lo zoom), 1 il braccio ridisegnato (tutto dritto, maniglie
// chiuse sugli ancoraggi).
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

// il braccio vecchio com'è nel file (curve, angoli arrotondati e imperfezioni comprese), in curve di Bézier assolute:
// un ancoraggio per segmento, i tratti dritti con le maniglie chiuse sugli ancoraggi (come in Illustrator)
const tracciato = d => {
  const t = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g), segmenti = [];
  let i = 0, cmd, x = 0, y = 0, inizio;
  const n = () => +t[i++];
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    const da = [x, y];
    if (cmd === 'M') { x = n(); y = n(); inizio = [x, y]; cmd = 'L'; continue; }
    if (cmd === 'z' || cmd === 'Z') { [x, y] = inizio; continue; }
    if (cmd === 'c') { const a = [x + n(), y + n()], b = [x + n(), y + n()]; x += n(); y += n(); segmenti.push([da, a, b]); continue; }
    if (cmd === 'h') x += n(); else if (cmd === 'v') y += n(); else if (cmd === 'L') { x = n(); y = n(); }
    else throw new Error(`comando ${cmd} non previsto nel braccio vecchio`);
    segmenti.push([da, da, [x, y]]);
  }
  // l'ultimo segmento finisce dove parte il primo (la z del file chiude un buco di 0,03)
  return segmenti.map(([a, c1, c2], k) => ({ a, c1, c2: k === segmenti.length - 1 && c2[0] === a[0] && c2[1] === a[1] ? segmenti[0][0] : c2 }));
};
const vecchi = tracciato(pezziPrima[0]);

// dove va ogni ancoraggio: i vertici veri (misurati sul file) nel loro della FIG 03 (`s` = indice in `giro`; gli angoli
// arrotondati sono due ancoraggi che vanno nello stesso vertice, il secondo è `gemello`); gli altri ancoraggi scivolano sul lato nuovo, alla
// stessa frazione del lato vecchio
const vertici = [
  [3.53, 108.65, 0, 'gemello'], [6.24, 105.96, 0], [203.54, 105.96, 1], [206.17, 108.70, 1, 'gemello'],
  // code di rondine sul lato destro (sporgono): base, punta, punta, base, due volte
  [206.18, 113.76, 2], [214.61, 110.35, 3], [214.61, 122.11, 4], [206.37, 119.27, 5],
  [206.37, 134.58, 6], [214.52, 131.19, 7], [214.52, 143.06, 8], [206.56, 140.54, 9],
  [206.30, 155.65, 10], [204.07, 157.83, 10, 'gemello'],
  // incastri sul lato in basso (entrano): bordo, fondo, fondo, bordo, due volte
  [196.78, 157.80, 11], [199.76, 148.79, 12], [185.00, 148.79, 13], [188.34, 157.54, 14],
  [176.14, 157.54, 15], [178.63, 149.02, 16], [163.29, 149.02, 17], [166.15, 157.64, 18],
  [6.24, 157.79, 19], [3.53, 155.10, 19, 'gemello'],
];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const quale = vecchi.map(({ a }) => vertici.find(v => dist(a, v) < 0.1));
const s = quale.map(v => v?.[2]);
if (new Set(s.filter(x => x !== undefined)).size !== 20) throw new Error('non trovo tutti i 20 vertici nel braccio vecchio');
const dopo = vecchi.map(({ a }, k) => {
  if (s[k] !== undefined) return nel(giro[s[k]]);
  // fra il vertice vero di prima e quello di dopo, alla stessa frazione
  let p = k, q = k;
  while (s[p] === undefined) p = (p - 1 + vecchi.length) % vecchi.length;
  while (s[q] === undefined) q = (q + 1) % vecchi.length;
  const f = dist(vecchi[p].a, a) / (dist(vecchi[p].a, a) + dist(a, vecchi[q].a));
  const [A, B] = [nel(giro[s[p]]), nel(giro[s[q]])];
  return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
});
// tappe: per ogni segmento ancoraggio, maniglia d'uscita, maniglia d'entrata del prossimo; nel ridisegno tutti dritti,
// le maniglie si chiudono sui loro ancoraggi
const tond = p => p.map(n => +n.toFixed(2));
const tappe = [
  vecchi.flatMap(({ a, c1, c2 }) => [a, c1, c2].map(tond)),
  dopo.flatMap((a, k) => [a, a, dopo[(k + 1) % dopo.length]].map(tond)),
];
// guide: i quattro lati, la linea delle punte delle code di rondine, quella del fondo degli incastri (ancoraggi)
const ancora = sv => quale.findIndex(v => v?.[2] === sv && !v[3]);
const linee = [[0, 1], [1, 10], [10, 19], [19, 0], [3, 4], [12, 13]].map(([a, b]) => [ancora(a), ancora(b)]);

// riquadri da inquadrare, con un po' d'aria
const riquadro = punti => {
  const xs = punti.map(p => p[0]), ys = punti.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
};
const aria = ([x, y, w, h], f) => { const d = Math.max(w, h) * f; return [x - d, y - d, w + 2 * d, h + 2 * d].map(n => +n.toFixed(2)); };
// il vecchio: i quattro pezzi (dai riquadri misurati sul file: braccio 0 da 3.5, gli altri tre fino a 366.4 e 301.9)
const vistaPrima = aria([3.5, 9.3, 362.9, 292.6], 0.06);
const vistaBraccioPrima = aria(riquadro(tappe[0]), 0.08);
const vistaBraccioDopo = aria(riquadro(tappe[1]), 0.08);
const vistaDopo = aria(riquadro(pezziDopo.flat().map(nel)), 0.06);
const viste = [vistaPrima, vistaBraccioPrima, vistaBraccioDopo, vistaDopo];

const punti = ps => ps.map(p => p.join(',')).join(' ');
// le tappe in un tracciato: M ancoraggio, poi C maniglia, maniglia, ancoraggio dopo (lo stesso calcolo in scripts/ridisegno.ts)
const curve = t => t.reduce((d, p, k) => d + (k === 0 ? `M${p}` : k % 3 === 0 ? ` ${p}` : k % 3 === 1 ? `C${p}` : ` ${p}`), '') + ` ${t[0]}Z`;
const json = x => JSON.stringify(x).replace(/"/g, '&quot;');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vistaDopo.join(' ')}" data-viste="${json(viste)}">
<!-- generato da tools/gea-ridisegno.mjs: non modificare a mano -->
<g data-prima opacity="0" fill="${GIALLO}">
${pezziPrima.slice(1).map(d => `<path d="${d}"/>`).join('\n')}
</g>
<g data-dopo fill="${GIALLO}">
${altri.map(p => `<polygon points="${punti(p.map(nel).map(q => q.map(n => +n.toFixed(2))))}"/>`).join('\n')}
</g>
<path data-braccio fill="${GIALLO}" d="${curve(tappe[1])}" data-forme="${json(tappe)}" data-linee="${json(linee)}" data-colori="${json([GIALLO, GIALLO])}"/>
<g data-guide></g>
</svg>
`;
writeFileSync(dir + 'ridisegno-marchio.svg', svg);
console.log('ridisegno-marchio.svg', svg.length, 'byte · scala', K.toFixed(4), '· viste', JSON.stringify(viste));
