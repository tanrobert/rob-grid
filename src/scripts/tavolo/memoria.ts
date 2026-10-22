/**
 * Il tavolo com'era, per la durata della visita (sessionStorage): quadretto, vista e posizione di ogni cella.
 * Visita nuova = disposizione pensata. `v` è la firma delle celle (lib/tavolo.ts, versione): se le celle del
 * sito cambiano, le posizioni salvate non valgono più.
 */

const KEY = 'tavolo';

export interface Salvato {
  v: string;
  /** lato del quadretto, px */
  q: number;
  /** spostamento della vista, in quadretti (così vale a qualunque zoom) */
  pan: [number, number];
  /** id → [x, y, ordine sopra/sotto], in quadretti */
  pos: Record<string, [number, number, number]>;
}

export function leggi(v: string): Salvato | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Salvato | null;
    return s?.v === v ? s : null;
  } catch {
    return null;
  }
}

export function scrivi(s: Salvato) {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
