/**
 * Inchiostro del sito, rosso (di base) o nero: lo alterna l'interruttore della luce (cells/InkCell.astro).
 * Lo stato sta in <html data-inchiostro="nero"> (global.css cambia --inchiostro e i crocini) e in
 * localStorage. Layout.astro lo applica prima del primo disegno e dopo ogni swap del ClientRouter,
 * che riscrive gli attributi di <html>.
 */

const KEY = 'inchiostro';
const root = document.documentElement;
const isNero = () => root.dataset.inchiostro === 'nero';

function apply(nero: boolean) {
  if (nero) root.dataset.inchiostro = 'nero';
  else delete root.dataset.inchiostro;
  try { localStorage.setItem(KEY, nero ? 'nero' : 'rosso'); } catch {}
}

export function initInk(signal: AbortSignal, reduced: boolean) {
  document.querySelectorAll<HTMLButtonElement>('[data-ink]').forEach(btn => {
    const lens = btn.querySelector('[data-lens]')!;
    const lever = btn.querySelector<SVGGElement>('[data-lever]')!;
    const sync = () => {
      btn.setAttribute('aria-checked', String(!isNero()));
      btn.title = isNero() ? 'Passa al rosso' : 'Passa al nero';
    };
    sync();

    const toggle = () => {
      const nero = !isNero();
      const swap = () => { apply(nero); sync(); };
      if (reduced || !document.startViewTransition) return swap();

      // il colore nuovo si allarga a cerchio dall'interruttore fino all'angolo più lontano della finestra
      const r = lens.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.style.setProperty('--macchia-x', `${x}px`);
      root.style.setProperty('--macchia-y', `${y}px`);
      root.style.setProperty('--macchia-r', `${radius}px`);
      root.classList.add('vt-ink');
      document.startViewTransition(swap).finished.finally(() => {
        root.classList.remove('vt-ink');
        for (const p of ['--macchia-x', '--macchia-y', '--macchia-r']) root.style.removeProperty(p);
      });
    };

    // Trascinamento (dito o mouse): la leva segue il gesto, su verso il rosso e giù verso il nero.
    // Al rilascio scatta dalla parte in cui è stata lasciata (col rimbalzo del CSS); se è rimasta dalla
    // sua parte torna al posto. Sotto DEAD px è un tocco: resta il clic.
    const DEAD = 6;
    let drag: { y: number; from: number; travel: number } | null = null;
    let scale = 1, dragged = false;
    btn.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      // corsa completa (da su a giù) = 70% dell'altezza della levetta: col dito basta poco
      drag = { y: e.clientY, from: isNero() ? -1 : 1, travel: lens.getBoundingClientRect().height * 0.35 };
      dragged = false;
      btn.setPointerCapture(e.pointerId);
    }, { signal });
    btn.addEventListener('pointermove', e => {
      if (!drag) return;
      const dy = e.clientY - drag.y;
      if (!dragged && Math.abs(dy) < DEAD) return;
      dragged = true;
      scale = Math.max(-1.1, Math.min(1.1, drag.from - dy / drag.travel));
      lever.style.transition = 'none';
      lever.style.transform = `scaleY(${scale})`;
    }, { signal });
    const release = (commit: boolean) => {
      if (!drag) return;
      drag = null;
      // senza stile in linea la leva torna allo stato del CSS con la sua transizione a molla
      lever.style.removeProperty('transition');
      lever.style.removeProperty('transform');
      if (commit && dragged && (scale < 0) !== isNero()) toggle();
    };
    btn.addEventListener('pointerup', () => release(true), { signal });
    btn.addEventListener('pointercancel', () => release(false), { signal });

    // il clic che segue un trascinamento è già stato deciso al rilascio
    btn.addEventListener('click', () => {
      if (dragged) { dragged = false; return; }
      toggle();
    }, { signal });
  });
}
