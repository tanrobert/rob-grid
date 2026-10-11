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
    // role=switch "Luce": accesa (sole) = inchiostro rosso
    const sync = () => {
      btn.setAttribute('aria-checked', String(!isNero()));
      btn.title = isNero() ? 'Accendi la luce' : 'Spegni la luce';
    };
    sync();

    btn.addEventListener('click', () => {
      const nero = !isNero();
      const swap = () => { apply(nero); sync(); };
      if (reduced || !document.startViewTransition) return swap();

      // il colore nuovo si allarga a cerchio dall'interruttore fino all'angolo più lontano della finestra;
      // sole e luna si scambiano (InkCell.astro) dentro la pagina nuova, che resta viva durante la transizione
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
    }, { signal });
  });
}
