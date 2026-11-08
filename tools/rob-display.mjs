// Rob Display: copia ridotta dei dati del font per la pagina /rob-display (src/data/rob-display.json).
// La fonte è il laboratorio del font, fuori da questo repo: wanama/font/lab/src/data/font.json, scritto da
// wanama/font/export_lab.py dalle regole (regole.toml + lettere.py). Si rilancia quando il font cambia:
//   node tools/rob-display.mjs [percorso di font.json]
// Tiene, per ogni glifo, i pezzi separati (contorno già forato dalle controforme) e i nodi con la regola che li genera;
// i numeri a 2 decimali nei tracciati e a 3 nei nodi (in unità da 1000 per em: invisibile a qualunque zoom della pagina).
import { readFileSync, writeFileSync } from 'node:fs';

const SORGENTE = process.argv[2] ?? 'C:/Users/rober/OneDrive/Desktop/wanama/font/lab/src/data/font.json';
const DESTINAZIONE = new URL('../src/data/rob-display.json', import.meta.url);

const font = JSON.parse(readFileSync(SORGENTE, 'utf8'));
const tondo = (v, n) => +v.toFixed(n);
const tracciato = d => d.replace(/-?\d+\.\d+/g, m => String(tondo(+m, 2)));

const glifi = font.glifi.map(g => ({
  nome: g.nome,
  carattere: g.carattere,
  slug: g.slug,
  marchio: g.marchio,
  numero: g.numero,
  segno: g.segno,
  riquadro: g.nuova.riquadro.map(v => tondo(v, 2)),
  pezzi: g.nuova.pezzi.map(p => ({
    nome: p.nome,
    contro: p.contro,
    d: tracciato(p.d),
    nodi: p.nodi.map(([x, y, sul, regola]) => [tondo(x, 3), tondo(y, 3), sul, regola]),
  })),
}));

const dati = {
  generato: font.generato,
  sistema: font.sistema,
  misure: font.misure,
  coppie: Object.keys(font.kerning).length,
  glifi,
};
writeFileSync(DESTINAZIONE, JSON.stringify(dati));
console.log(`${glifi.length} glifi, ${dati.coppie} coppie di kerning → src/data/rob-display.json (${(JSON.stringify(dati).length / 1024).toFixed(0)} KB)`);
