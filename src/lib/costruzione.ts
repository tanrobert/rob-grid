/**
 * Cella `costruzione`: prepara al build un SVG di costruzione esportato da Illustrator coi tratti vivi (non espansi),
 * perché scripts/costruzione.ts lo possa disegnare. Nessun ritocco a mano sul file: conta l'ordine dei livelli.
 * - Il <style> di Illustrator (.cls-N) diventa attributi sugli elementi: nella pagina sarebbe globale e le sue classi
 *   si scontrerebbero con quelle degli altri SVG di Illustrator.
 * - I tracciati composti diventano un <g data-composto> con un <path> per sottotracciato (si disegnano insieme); la
 *   campitura di un tracciato composto resta un <path> intero, se no i buchi (l'occhiello della P) si riempirebbero.
 * - `data-ordine` su un gruppo (scritto nella sorgente, Illustrator non lo esporta): il turno del disegno fra i fratelli,
 *   quando non è quello dei livelli (il contorno della P sopra la linea sfumata, ma disegnato prima). `data-in-fila`
 *   su un gruppo: dentro, una cosa alla volta, anche i sottotracciati (prima il contorno esterno, poi il buco).
 * - Spessore: i tratti senza spessore (1, quello di Illustrator) sarebbero mezzo pixel nella cella, diventano
 *   larghezza / SPESSORE (≈ 1 px, come --line); quelli con uno spessore scritto nel file lo tengono (la P di Purple
 *   Piper coi colori: contorno 4, linea sfumata 9).
 * - Tratti pieni: pathLength 1 e dasharray "1 2", già disegnati (dashoffset 0). Tratteggiati: tengono il tratteggio e
 *   si scoprono con una copia piena nella loro <mask>. Senza script il disegno è completo.
 * - Campiture (fill): `data-pieno`, entrano a tratti finiti. Un gruppo chiamato "ombra" in Illustrator (id/data-name):
 *   `data-ombra`, non si disegna, cade alla fine (scripts/costruzione.ts).
 * - Sfumature (linearGradient, radialGradient nelle <defs>): restano, con un id unico nella pagina.
 * - Testo vivo: no (il font non c'è sul server), prima in tracciati con tools/svg-testo-tracciati.py.
 */

const SPESSORE = 400;      // larghezza del viewBox / SPESSORE = spessore dei tratti
const PENNA = 4;           // la copia nella maschera è più spessa del tratto, così lo copre tutto
const FORME = 'path|line|polyline|polygon|rect|circle|ellipse';

const attributi = (s: string) => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
const scrivi = (a: Record<string, string>) => Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join('');
const num = (x: number) => String(+x.toFixed(3));
const hash = (s: string) => [...s].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381).toString(36);

/** `alt` assente: il disegno è una parte di un'immagine descritta da chi lo contiene (aria-hidden) */
export function costruzione(raw: string, { nome, alt }: { nome: string; alt?: string }): string {
  const errore = (msg: string) => new Error(`[costruzione] ${nome}: ${msg}`);
  if (/<(clipPath|mask|use|image|pattern|filter)\b/.test(raw)) throw errore('solo tratti, campiture e sfumature (niente maschere, immagini, motivi o filtri)');
  if (/<text\b/.test(raw)) throw errore('testo vivo: prima in tracciati con tools/svg-testo-tracciati.py');

  // regole .cls-N { ... } → dichiarazioni per classe (l'ultima vince, come nel CSS)
  const classi: Record<string, Record<string, string>> = {};
  for (const [, selettori, corpo] of (raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const decl = Object.fromEntries(corpo.split(';').map(d => d.split(':').map(x => x.trim())).filter(d => d[0] && d[1]));
    for (const sel of selettori.split(',').map(s => s.trim())) {
      if (!/^\.[\w-]+$/.test(sel)) throw errore(`selettore non previsto nel <style>: "${sel}"`);
      Object.assign(classi[sel.slice(1)] ??= {}, decl);
    }
  }

  const viewBox = raw.match(/<svg\b[^>]*viewBox="([^"]+)"/)?.[1];
  if (!viewBox) throw errore('manca il viewBox');
  const [vx, vy, vw, vh] = viewBox.split(/[\s,]+/).map(Number);
  const larghezza = vw / SPESSORE;
  const prefisso = `costruzione-${hash(raw + nome)}`;
  const maschere: string[] = [];
  // sfumature: escono dalle <defs> (che si tolgono) con un id unico nella pagina; i riferimenti seguono
  const sfumature: string[] = [];
  for (const [g] of raw.matchAll(/<(linearGradient|radialGradient)\b[\s\S]*?<\/\1>/g)) {
    const vecchio = g.match(/\bid="([^"]+)"/)?.[1];
    if (!vecchio) continue;
    const nuovo = `${prefisso}-s${sfumature.length}`;
    sfumature.push(g.replace(/\s(id|data-name)="[^"]*"/g, '').replace(/^<(\w+)/, `<$1 id="${nuovo}"`));
    raw = raw.replaceAll(`url(#${vecchio})`, `url(#${nuovo})`).replaceAll(`href="#${vecchio}"`, `href="#${nuovo}"`);
    for (const decl of Object.values(classi)) for (const k in decl) decl[k] = decl[k].replaceAll(`url(#${vecchio})`, `url(#${nuovo})`);
  }

  /** class → attributi, via id e data-name di Illustrator */
  const pulisci = (a: Record<string, string>) => {
    const { class: cls, id, 'data-name': _, ...resto } = a;
    for (const c of cls?.split(/\s+/) ?? []) Object.assign(resto, classi[c]);
    if ('stroke-width' in resto) resto['stroke-width'] = num(parseFloat(resto['stroke-width']));
    return resto;
  };

  /** una forma: i tratti diventano disegnabili (data-tratto) */
  const forma = (tag: string, a: Record<string, string>) => {
    // campitura (senza fill è nera, come in SVG): entra a tratti finiti
    if (a.fill !== 'none') a['data-pieno'] = '';
    if (!a.stroke || a.stroke === 'none') return `<${tag}${scrivi(a)}/>`;
    a['stroke-width'] ??= num(larghezza);
    const tratteggio = a['stroke-dasharray'] && a['stroke-dasharray'] !== 'none';
    if (!tratteggio) return `<${tag}${scrivi({ ...a, pathLength: '1', 'stroke-dasharray': '1 2', 'stroke-dashoffset': '0', 'data-tratto': '' })}/>`;
    const id = `${prefisso}-${maschere.length}`;
    const geometria = Object.fromEntries(Object.entries(a).filter(([k]) => !/^(stroke|fill)/.test(k)));
    maschere.push(`<mask id="${id}" maskUnits="userSpaceOnUse" x="${vx}" y="${vy}" width="${vw}" height="${vh}">`
      + `<${tag}${scrivi({ ...geometria, fill: 'none', stroke: '#fff', 'stroke-width': num(parseFloat(a['stroke-width']) * PENNA), pathLength: '1', 'stroke-dasharray': '1 2', 'stroke-dashoffset': '0', 'data-penna': '' })}/></mask>`);
    return `<${tag}${scrivi({ ...a, mask: `url(#${id})`, 'data-tratto': '' })}/>`;
  };

  const corpo = raw
    .replace(/<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|<defs>[\s\S]*?<\/defs>/g, '')
    .replace(/<svg\b[^>]*>|<\/svg>/g, '')
    .replace(/<g\b([^>]*)>/g, (_, s: string) => {
      const a = attributi(s);
      const ombra = /^ombra\b/i.test(a['data-name'] ?? a.id ?? '');
      return `<g${scrivi({ ...pulisci(a), ...(ombra && { 'data-ombra': '' }) })}>`;
    })
    .replace(new RegExp(`<(${FORME})\\b([^>]*?)\\/>`, 'g'), (_, tag: string, s: string) => {
      const a = pulisci(attributi(s));
      if (tag !== 'path') return forma(tag, a);
      if (/[zZ]\s*m/.test(a.d)) throw errore('sottotracciato con "m" relativo: riesportare il file');
      const pezzi = a.d.split(/(?=M)/).map(d => d.trim()).filter(Boolean);
      const pieno = a.fill !== 'none', tratto = !!a.stroke && a.stroke !== 'none';
      if (pezzi.length < 2 || !tratto) return forma('path', a);
      // i tratti si dividono (i sottotracciati si disegnano insieme), la campitura resta intera: i buchi restano buchi
      const contorni = `<g data-composto="">${pezzi.map(d => forma('path', { ...a, d, fill: 'none' })).join('')}</g>`;
      return pieno ? forma('path', { ...a, stroke: 'none' }) + contorni : contorni;
    })
    .trim();

  const accessibile = alt === undefined ? 'aria-hidden="true"'
    : `role="img" aria-label="${alt.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ${accessibile} data-disegno="">`
    + (maschere.length || sfumature.length ? `<defs>${sfumature.join('')}${maschere.join('')}</defs>` : '') + corpo + '</svg>';
}
