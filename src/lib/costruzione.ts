/**
 * Cella `costruzione`: prepara al build un SVG di costruzione esportato da Illustrator coi tratti vivi (non espansi),
 * perché scripts/costruzione.ts lo possa disegnare. Nessun ritocco a mano sul file: conta l'ordine dei livelli.
 * - Il <style> di Illustrator (.cls-N) diventa attributi sugli elementi: nella pagina sarebbe globale e le sue classi
 *   si scontrerebbero con quelle degli altri SVG di Illustrator.
 * - I tracciati composti diventano un <g data-composto> con un <path> per sottotracciato (si disegnano insieme).
 * - Spessore: 1 unità del file sarebbe mezzo pixel nella cella, diventa larghezza / SPESSORE (≈ 1 px, come --line).
 * - Tratti pieni: pathLength 1 e dasharray "1 2", già disegnati (dashoffset 0). Tratteggiati: tengono il tratteggio e
 *   si scoprono con una copia piena nella loro <mask>. Senza script il disegno è completo.
 */

const SPESSORE = 400;      // larghezza del viewBox / SPESSORE = spessore dei tratti
const PENNA = 4;           // la copia nella maschera è più spessa del tratto, così lo copre tutto
const FORME = 'path|line|polyline|polygon|rect|circle|ellipse';

const attributi = (s: string) => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
const scrivi = (a: Record<string, string>) => Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join('');
const num = (x: number) => String(+x.toFixed(3));
const hash = (s: string) => [...s].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381).toString(36);

export function costruzione(raw: string, { nome, alt }: { nome: string; alt: string }): string {
  const errore = (msg: string) => new Error(`[costruzione] ${nome}: ${msg}`);
  if (/<(linearGradient|radialGradient|clipPath|mask|use|image|text)\b/.test(raw)) throw errore('solo tratti (niente sfumature, maschere, immagini o testo vivo)');

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

  /** class → attributi, via id e data-name di Illustrator */
  const pulisci = (a: Record<string, string>) => {
    const { class: cls, id, 'data-name': _, ...resto } = a;
    for (const c of cls?.split(/\s+/) ?? []) Object.assign(resto, classi[c]);
    if ('stroke-width' in resto) resto['stroke-width'] = num(parseFloat(resto['stroke-width']) * larghezza);
    return resto;
  };

  /** una forma: i tratti diventano disegnabili (data-tratto) */
  const forma = (tag: string, a: Record<string, string>) => {
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
    .replace(/<g\b([^>]*)>/g, (_, a) => `<g${scrivi(pulisci(attributi(a)))}>`)
    .replace(new RegExp(`<(${FORME})\\b([^>]*?)\\/>`, 'g'), (_, tag: string, s: string) => {
      const a = pulisci(attributi(s));
      if (tag !== 'path') return forma(tag, a);
      if (/[zZ]\s*m/.test(a.d)) throw errore('sottotracciato con "m" relativo: riesportare il file');
      const pezzi = a.d.split(/(?=M)/).map(d => d.trim()).filter(Boolean);
      return pezzi.length < 2 ? forma('path', a) : `<g data-composto="">${pezzi.map(d => forma('path', { ...a, d })).join('')}</g>`;
    })
    .trim();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${alt.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}" data-disegno="">`
    + (maschere.length ? `<defs>${maschere.join('')}</defs>` : '') + corpo + '</svg>';
}
