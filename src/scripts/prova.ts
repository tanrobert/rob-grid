/**
 * Cella `prova` di Rob Display (ProvaCell.astro): la riga da scrivere. Import dinamico da cells.ts.
 * Il corpo è il più grande con cui il testo sta nella larghezza della riga, ma mai più della riga stessa (interlinea 1,
 * alta quanto lo spazio libero della cella) né più piccolo di MINIMO px: misurato a ogni tasto e quando la cella cambia misura.
 */

const MINIMO = 16;        // px di corpo, sotto non scende (poi la riga scorre, come un campo normale)
const PROVA = 100;        // px di corpo con cui si misura

export function initProve(signal: AbortSignal) {
  const misura = document.createElement('span');
  // transition: none, se no con riduci movimento (transizioni da 0,01ms su tutto, global.css) si legge il corpo di prima
  misura.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0;transition:none';
  document.body.append(misura);
  signal.addEventListener('abort', () => misura.remove());

  document.querySelectorAll<HTMLElement>('[data-prova]').forEach(cella => {
    const riga = cella.querySelector<HTMLInputElement>('[data-riga]');
    if (!riga) return;

    function adatta() {
      const s = getComputedStyle(riga!);
      misura.style.font = `${s.fontWeight} ${PROVA}px ${s.fontFamily}`;
      misura.style.textTransform = s.textTransform;
      misura.style.fontKerning = s.fontKerning;
      misura.textContent = riga!.value || ' ';
      const largo = riga!.clientWidth, alto = cella.clientHeight;
      // l'altezza libera: la cella meno la testa, la coda e i margini (il padding di .prova)
      const ps = getComputedStyle(cella);
      const libero = alto - parseFloat(ps.paddingTop) - parseFloat(ps.paddingBottom);
      const corpo = Math.max(MINIMO, Math.min(PROVA * largo / misura.offsetWidth * 0.98, libero));
      riga!.style.setProperty('--corpo', `${corpo}px`);
    }

    // la misura vale solo col font vero: si aspetta proprio lui (fonts.ready può arrivare prima che parta)
    const famiglia = getComputedStyle(riga).fontFamily.split(',')[0];
    document.fonts.load(`900 ${PROVA}px ${famiglia}`).then(() => !signal.aborted && adatta());
    riga.addEventListener('input', adatta, { signal });
    const ro = new ResizeObserver(adatta);
    ro.observe(cella);
    signal.addEventListener('abort', () => ro.disconnect());
  });
}
