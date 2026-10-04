import type { Cell } from './grid-types';

/*
 *  CELLE EXTRA (pagina /extra)
 *  Celle che non servono a niente, ma ci sono: tolte dalla home per alleggerirla
 *  (script e animazioni girano solo qui). In home la cella "extra" ne mostra il numero.
 */
export const extraCells: Cell[] = [
  { id: 'ora',      type: 'clock',  w: 2, h: 2 },
  { id: 'misure',   type: 'meter',  w: 2, h: 2 },
  { id: 'cursore',  type: 'cursor', w: 2, h: 2 },
  { id: 'registro', type: 'mark',   w: 2, h: 2 },
  { id: 'occhio',   type: 'eye',    w: 2, h: 2 },
  { id: 'terra',    type: 'globe',  w: 2, h: 2 },
];
