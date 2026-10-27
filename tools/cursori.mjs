// Cursori disegnati da noi nella serie di freccia e manina di Windows 95 (tools/pages/cursori/): pixel a 1 bit,
// contorno ('#') e riempimento ('.').
// - Mano aperta e chiusa per il tavolo: stesse colonne delle dita e stessa pancia della manina; cambiano dove
//   partono le dita e il pollice (piegato nel pugno).
// - Matita: la penna di Windows 95, copiata pixel per pixel.
// Scrive i file in bianco e nero per il laboratorio (tools/pages/cursori/) e le versioni del sito in public/cursori/,
// una per coppia contorno-riempimento (global.css, --cursore-aperta/-chiusa; matita in Tavolo.astro), e la penna
// della cella sul tavolo (src/assets/matita.svg).
//   node tools/cursori.mjs
import fs from 'node:fs';

const W = 17, H = 22;
// colonne del filo tra le dita (indice 5-6, medio 8-9, anulare 11-12, mignolo 14-15) e riga del cappello di ogni dito
const FILI = [4, 7, 10, 13, 16];
const MANI = {
  aperta: { cappelli: [2, 0, 1, 4], pollice: 'aperto' },   // dita dritte: il medio più alto, il mignolo più basso
  chiusa: { cappelli: [6, 5, 6, 7], pollice: 'piegato' },  // pugno: dita piegate come nella manina, pollice davanti
};

function disegna({ cappelli, pollice }) {
  const g = Array.from({ length: H }, () => Array(W).fill(' '));
  const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  // pancia: bordo destro e sinistro per riga (dalla manina), fondo pieno. Col pollice piegato il fianco sporge
  // meno (dalla colonna 2 invece che dalla 0) e poi scende a scalini come nella manina
  const destro = y => (y <= 15 ? 16 : y <= 18 ? 15 : 14);
  const sinistro = y => (y === 10 && pollice === 'piegato' ? 2 : y <= 11 ? (pollice === 'piegato' ? 1 : null)
    : y === 12 ? 1 : y <= 14 ? 2 : y <= 16 ? 3 : y <= 18 ? 4 : 5);
  for (let y = 10; y < H - 1; y++) {
    const sx = sinistro(y) ?? 1, dx = destro(y);
    for (let x = sx; x <= dx; x++) set(x, y, '.');
    if (sinistro(y) != null) set(sx, y, '#');
    set(dx, y, '#');
  }
  for (let x = 5; x <= 14; x++) set(x, H - 1, '#');
  // dita: cappello sopra le due colonne, fili ai lati fino alla pancia
  cappelli.forEach((top, i) => {
    const a = FILI[i] + 1;
    set(a, top, '#'); set(a + 1, top, '#');
    for (let y = top + 1; y <= 10; y++) { set(a, y, '.'); set(a + 1, y, '.'); }
  });
  FILI.forEach((x, i) => {
    const da = Math.min(cappelli[i - 1] ?? 99, cappelli[i] ?? 99) + 1;
    const a = i === FILI.length - 1 ? 15 : i === 3 ? 10 : 9;  // fine dei fili: come nella manina
    for (let y = da; y <= a; y++) set(x, y, '#');
  });
  // pollice piegato: il suo bordo in alto, dall'indice al fianco
  if (pollice === 'piegato') { set(3, 10, '#'); set(4, 10, '#'); }
  // pollice aperto (dalla manina)
  if (pollice === 'aperto') {
    ['###', '#..#', '#...'].forEach((r, dy) => [...r].forEach((c, dx) => c !== ' ' && set(dx, 9 + dy, c)));
    set(4, 10, '#'); set(4, 11, '#');
  }
  return g.map(r => r.join(''));
}

// righe di caratteri → SVG: contorno ('#') e riempimento ('.') come rettangoli fusi per riga
function svg(righe, commento) {
  const W = Math.max(...righe.map(r => r.trimEnd().length)), H = righe.length;
  const CORSE = { '#': /#+/g, '.': /\.+/g };
  const path = ch => righe.flatMap((r, y) => [...r.matchAll(CORSE[ch])].map(m => `M${m.index} ${y}h${m[0].length}v1h-${m[0].length}z`)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">\n<!-- ${commento} -->\n<path d="${path('#')}"/>\n<path fill="#fff" d="${path('.')}"/>\n</svg>\n`;
}

// colori della palette (global.css) e coppie contorno-riempimento: base, Inverti, Woberto, Woberto invertito
const COLORI = { rosso: '#f03f24', carta: '#f5f3f0', nero: '#1c1a17' };
const COPPIE = [['rosso', 'carta'], ['carta', 'rosso'], ['nero', 'carta'], ['carta', 'nero']];

// matita = la penna di Windows 95 (penna-win95.svg, portata da Roberto il 27/10/2026), pixel per pixel ma senza
// l'alone chiaro attorno (le altre icone non ce l'hanno): corpo nero, luce chiara dentro. Punta in alto a sinistra: 0 0
const MATITA = [
  '#                     ',
  ' ##                   ',
  ' ####                 ',
  '  ##.#                ',
  '  ###.#               ',
  '   ##..#              ',
  '    ##..#             ',
  '     ##..#            ',
  '      ##..#           ',
  '       ##..#          ',
  '        ##..#         ',
  '         ##..#  #     ',
  '          #.#.#.##    ',
  '           ###.####   ',
  '            ###.#.##  ',
  '             ###.#.## ',
  '              ###.#.##',
  '               ###.#.#',
  '                ###.##',
  '                 ###.#',
  '                  ####',
  '                   ## ',
];

/** Scrive un cursore: bianco e nero per il laboratorio, a colori per il sito (una coppia contorno-riempimento per file) */
function scrivi(nome, righe, descrizione, coppie) {
  console.log(`\n${nome}\n` + righe.map((r, y) => `${String(y).padStart(2)} |${r}|`).join('\n'));
  const file = svg(righe, `${descrizione} (tools/cursori.mjs)`);
  fs.writeFileSync(new URL(`./pages/cursori/${nome}.svg`, import.meta.url), file);
  const pulito = file.replace(/<!--[\s\S]*?-->\n/, '');
  for (const [segno, fondo] of coppie) {
    fs.writeFileSync(new URL(`../public/cursori/${nome}-${segno}-${fondo}.svg`, import.meta.url),
      pulito.replace('<path d=', `<path fill="${COLORI[segno]}" d=`).replace('fill="#fff"', `fill="${COLORI[fondo]}"`));
  }
}

for (const [nome, mano] of Object.entries(MANI))
  scrivi(`mano-${nome}`, disegna(mano), `Mano ${nome} per il tavolo, nella serie della manina di Windows 95. Punta: 8 11`, COPPIE);
// la matita è la mano di chi visita: sempre nera (come i suoi segni), con qualunque colore del sito
scrivi('matita', MATITA, 'Matita: la penna di Windows 95. Punta: 0 0', [['nero', 'carta']]);
// la stessa penna appoggiata sul tavolo (cella `penna`, data/tavolo.ts): contorno = currentColor, dentro la carta
// (senza variabili: il file fa anche da maschera all'ombra a sagoma, Tavolo.astro)
fs.writeFileSync(new URL('../src/assets/matita.svg', import.meta.url),
  svg(MATITA, '').replace(/<!--[\s\S]*?-->\n/, '').replace('<path d=', '<path fill="currentColor" d=').replace('fill="#fff"', `fill="${COLORI.carta}"`));
