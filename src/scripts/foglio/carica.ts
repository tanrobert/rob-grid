/**
 * Pagine dei fogli scaricate per aprirle sopra il tavolo senza ricaricare (scripts/foglio): HTML letto con
 * DOMParser, una volta per percorso (i filtri dell'archivio, ?tag=…, sono la stessa pagina). Si scaricano in
 * anticipo, quando il browser è libero, con la foto della hero: al clic il foglio è quasi sempre già pronto.
 */

/** Le pagine che si aprono come foglio sopra il tavolo */
export const eFoglio = (percorso: string) => /^\/(info|extra|archivio|progetti\/[^/]+)\/?$/.test(percorso);

const cache = new Map<string, Promise<Document>>();

export function carica(percorso: string): Promise<Document> {
  let p = cache.get(percorso);
  if (!p) {
    p = fetch(percorso, { credentials: 'same-origin' })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${percorso}`);
        return r.text();
      })
      .then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (!doc.querySelector('main[data-foglio]')) throw new Error(`nessun foglio in ${percorso}`);
        fotoInAnticipo(doc);
        return doc;
      });
    // se fallisce si riprova la volta dopo
    p.catch(() => cache.delete(percorso));
    cache.set(percorso, p);
  }
  return p;
}

/** La foto della hero nella cache del browser, alla misura che avrà nella pagina */
function fotoInAnticipo(doc: Document) {
  const img = doc.querySelector<HTMLImageElement>('main[data-foglio] [data-hero] img');
  if (!img) return;
  const pre = new Image();
  if (img.getAttribute('sizes')) pre.sizes = img.getAttribute('sizes')!;
  if (img.getAttribute('srcset')) pre.srcset = img.getAttribute('srcset')!;
  pre.src = img.getAttribute('src') ?? '';
}

/** Gli stili della pagina scaricata che qui mancano (ogni pagina ha i suoi <style> inline): con lo scope dei
    componenti, aggiungerli non cambia nulla di quello che c'è già. Pronti quando i fogli esterni sono caricati */
export function stili(doc: Document): Promise<unknown> {
  const head = document.head;
  const testi = new Set([...head.querySelectorAll('style')].map(s => s.textContent));
  const href = new Set([...head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map(l => l.href));
  const attese: Promise<unknown>[] = [];
  doc.head.querySelectorAll('style').forEach(s => {
    if (testi.has(s.textContent)) return;
    head.append(document.importNode(s, true));
  });
  doc.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach(l => {
    const url = new URL(l.getAttribute('href') ?? '', location.href).href;
    if (href.has(url)) return;
    const nuovo = document.importNode(l, true);
    attese.push(new Promise(r => { nuovo.onload = nuovo.onerror = r; setTimeout(r, 1500); }));
    head.append(nuovo);
  });
  return Promise.all(attese);
}

/** Scarica in anticipo le pagine dei link (quando il browser è libero) */
export function anticipa(percorsi: string[]) {
  const libero = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 600));
  for (const p of new Set(percorsi)) libero(() => { carica(p).catch(() => {}); });
}
