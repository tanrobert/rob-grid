/**
 * Cella `versioni` (G&A: il logo nelle sue versioni, 4/11/2026): legge al build gli SVG delle versioni esportati da
 * Illustrator (stesse forme, a misure e posti diversi) e ne ricava i pezzi e dove sta ogni pezzo in ogni versione.
 * - Pezzi = i figli del gruppo che contiene il disegno (un tracciato, un poligono o un gruppo di lettere). Le forme di un
 *   colore diverso da quello del testo (il colore della maggior parte delle forme della prima versione) sono un pezzo
 *   solo: il marchio, sciolto o raggruppato che sia.
 * - Parti (le etichette): il marchio; i pezzi del testo con molte forme (righe di lettere) sono, dall'alto in basso
 *   nella prima versione, descrittore e firma; gli altri (lettere grandi e ®) il logotipo.
 * - La prima versione deve avere tutti i pezzi: le altre li ritrovano lì per numero di forme e proporzione, e per ogni
 *   pezzo si ricava scala e posto (dal riquadro dei punti dei tracciati: le forme sono le stesse, quindi è esatto).
 * - Il disegno della pagina è quello della prima versione; ogni versione è centrata in un palco grande quanto la più
 *   larga e la più alta.
 */

/** l'ordine delle parti, dall'alto (la riga delle parti sotto il titoletto) */
export const ORDINE = ['Marchio', 'Logotipo', 'Descrittore', 'Firma'];

export interface Trasformazione { x: number; y: number; s: number }
export interface Versioni {
  /** palco: larghezza e altezza */
  w: number; h: number;
  /** markup dei pezzi (gruppi <g data-pezzo="i">), posati nella prima versione */
  pezzi: string;
  /** parte di ogni pezzo */
  parti: string[];
  /** per versione, per pezzo: dove sta (null = non c'è) */
  posti: Array<Array<Trasformazione | null>>;
}

interface Nodo { tag: string; a: Record<string, string>; figli: Nodo[]; testo: string }
interface Box { x0: number; y0: number; x1: number; y1: number }

const FORME = new Set(['path', 'polygon', 'polyline', 'rect', 'circle', 'ellipse', 'line']);
const num = (v: number) => String(+v.toFixed(3));

/** XML minimo: tag aperti, chiusi e autochiusi (niente testo né CDATA: SVG di sole forme) */
function albero(svg: string): Nodo {
  const radice: Nodo = { tag: '#', a: {}, figli: [], testo: '' };
  const pila = [radice];
  const pulito = svg.replace(/<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->/g, '');
  for (const m of pulito.matchAll(/<(\/?)([\w:-]+)([^>]*?)(\/?)>/g)) {
    const [testo, chiude, tag, attr, auto] = m;
    if (chiude) { pila.pop(); continue; }
    const a = Object.fromEntries([...attr.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x => [x[1], x[2]]));
    const n: Nodo = { tag, a, figli: [], testo };
    pila.at(-1)!.figli.push(n);
    if (!auto) pila.push(n);
  }
  return radice.figli.find(n => n.tag === 'svg')!;
}

/** riquadro dei punti di un tracciato (punti di controllo compresi: per confrontare forme uguali basta) */
function punti(n: Nodo): number[][] {
  if (n.tag === 'polygon' || n.tag === 'polyline') {
    const v = n.a.points.trim().split(/[\s,]+/).map(Number);
    return v.flatMap((_, i) => (i % 2 ? [] : [[v[i], v[i + 1]]]));
  }
  if (n.tag === 'rect') {
    const x = +(n.a.x ?? 0), y = +(n.a.y ?? 0);
    return [[x, y], [x + +n.a.width, y + +n.a.height]];
  }
  if (n.tag !== 'path') throw new Error(`[versioni] forma non prevista: <${n.tag}>`);
  const t = n.a.d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const out: number[][] = [];
  let i = 0, cmd = '', x = 0, y = 0, x0 = 0, y0 = 0;
  const n_ = () => +t[i++];
  const quanti: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    const c = cmd.toLowerCase(), rel = cmd !== cmd.toUpperCase();
    if (c === 'z') { x = x0; y = y0; continue; }
    const v = Array.from({ length: quanti[c] }, n_);
    const px = (k: number) => (rel ? x : 0) + v[k], py = (k: number) => (rel ? y : 0) + v[k];
    if (c === 'h') { x = (rel ? x : 0) + v[0]; out.push([x, y]); continue; }
    if (c === 'v') { y = (rel ? y : 0) + v[0]; out.push([x, y]); continue; }
    if (c === 'a') { x = px(5); y = py(6); out.push([x, y]); continue; }
    for (let k = 0; k < v.length; k += 2) out.push([px(k), py(k + 1)]);
    x = px(v.length - 2); y = py(v.length - 1);
    if (c === 'm') { x0 = x; y0 = y; cmd = rel ? 'l' : 'L'; }
  }
  return out;
}

const foglie = (n: Nodo): Nodo[] => (FORME.has(n.tag) ? [n] : n.figli.flatMap(foglie));
function riquadro(ns: Nodo[]): Box {
  const p = ns.flatMap(foglie).flatMap(punti);
  return { x0: Math.min(...p.map(q => q[0])), y0: Math.min(...p.map(q => q[1])), x1: Math.max(...p.map(q => q[0])), y1: Math.max(...p.map(q => q[1])) };
}

/** una versione: i suoi pezzi (forme), il colore di ogni forma, il riquadro della tavola */
function leggi(svg: string, nome: string) {
  const root = albero(svg);
  const [vx, vy, vw, vh] = root.a.viewBox.split(/[\s,]+/).map(Number);
  // colori delle classi di Illustrator
  const classi: Record<string, string> = {};
  const stile = svg.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
  for (const [, sel, corpo] of stile.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const fill = corpo.match(/fill:\s*([^;]+)/)?.[1].trim();
    if (fill) for (const c of sel.matchAll(/\.([\w-]+)/g)) classi[c[1]] = fill;
  }
  // il gruppo che contiene il disegno: si scende finché c'è un solo gruppo
  let c = root;
  const disegno = (n: Nodo) => n.figli.filter(f => f.tag !== 'defs' && f.tag !== 'style');
  while (disegno(c).length === 1 && disegno(c)[0].tag === 'g') c = disegno(c)[0];
  const pezzi = disegno(c);
  if (!pezzi.length) throw new Error(`[versioni] ${nome}: nessuna forma`);
  const colore = (f: Nodo) => f.a.fill ?? classi[f.a.class?.split(/\s+/)[0] ?? ''] ?? '#000';
  return { vb: { x: vx, y: vy, w: vw, h: vh }, pezzi, colore, classi };
}

/** forma con gli attributi risolti (niente classi: nella pagina sarebbero globali) */
function scrivi(n: Nodo, colore: (f: Nodo) => string): string {
  if (n.tag === 'g') return `<g>${n.figli.map(f => scrivi(f, colore)).join('')}</g>`;
  const { class: _c, id: _i, 'data-name': _d, ...a } = n.a;
  a.fill = colore(n);
  return `<${n.tag}${Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join('')}/>`;
}

export function versioni(files: Array<{ svg: string; nome: string }>): Versioni {
  const vs = files.map(f => leggi(f.svg, f.nome));
  const [ref] = vs;
  // il colore del testo: quello della maggior parte delle forme della prima versione
  const conta = new Map<string, number>();
  ref.pezzi.flatMap(foglie).forEach(f => conta.set(ref.colore(f), (conta.get(ref.colore(f)) ?? 0) + 1));
  const testo = [...conta].sort((a, b) => b[1] - a[1])[0][0];

  /** pezzi di una versione: il marchio (tutte le forme d'altro colore insieme) e i pezzi del testo */
  const pezziDi = (v: (typeof vs)[number]) => {
    const marchio = v.pezzi.filter(p => foglie(p).every(f => v.colore(f) !== testo));
    const resto = v.pezzi.filter(p => !marchio.includes(p));
    return [{ nodi: marchio, forme: -1 }, ...resto.map(p => ({ nodi: [p], forme: foglie(p).length }))];
  };
  const pr = pezziDi(ref);
  const rr = pr.map(p => riquadro(p.nodi));
  // parti: marchio; righe di lettere dall'alto descrittore e firma; il resto logotipo
  const righe = pr.map((p, i) => i).filter(i => pr[i].forme >= 5).sort((a, b) => rr[a].y0 - rr[b].y0);
  const parti = pr.map((p, i) => (i === 0 ? 'Marchio' : righe[0] === i ? 'Descrittore' : righe[1] === i ? 'Firma' : 'Logotipo'));

  const W = Math.max(...vs.map(v => v.vb.w)), H = Math.max(...vs.map(v => v.vb.h));
  const posti = vs.map((v, k) => {
    const dx = (W - v.vb.w) / 2 - v.vb.x, dy = (H - v.vb.h) / 2 - v.vb.y;
    const out: Array<Trasformazione | null> = pr.map(() => null);
    for (const p of pezziDi(v)) {
      if (!p.nodi.length) continue;
      const b = riquadro(p.nodi), r = (b.x1 - b.x0) / (b.y1 - b.y0);
      // il pezzo della prima versione con lo stesso numero di forme e la proporzione più vicina, non ancora preso
      const cand = pr.map((q, i) => i).filter(i => pr[i].forme === p.forme && !out[i]);
      const i = cand.sort((a, c) => Math.abs((rr[a].x1 - rr[a].x0) / (rr[a].y1 - rr[a].y0) - r) - Math.abs((rr[c].x1 - rr[c].x0) / (rr[c].y1 - rr[c].y0) - r))[0];
      if (i === undefined) throw new Error(`[versioni] ${files[k].nome}: un pezzo che non c'è nella prima versione (${p.forme} forme)`);
      const s = (b.x1 - b.x0) / (rr[i].x1 - rr[i].x0);
      const sy = (b.y1 - b.y0) / (rr[i].y1 - rr[i].y0);
      if (Math.abs(s / sy - 1) > 0.02) throw new Error(`[versioni] ${files[k].nome}: il pezzo ${parti[i]} non ha la stessa forma che nella prima versione`);
      out[i] = { x: +(b.x0 + dx - s * rr[i].x0).toFixed(3), y: +(b.y0 + dy - s * rr[i].y0).toFixed(3), s: +s.toFixed(5) };
    }
    return out;
  });

  const pezzi = pr.map((p, i) => {
    const t = posti[0][i]!;
    return `<g data-pezzo="${i}" transform="translate(${num(t.x)} ${num(t.y)}) scale(${num(t.s)})">${p.nodi.map(n => scrivi(n, ref.colore)).join('')}</g>`;
  }).join('');
  return { w: W, h: H, pezzi, parti, posti };
}
