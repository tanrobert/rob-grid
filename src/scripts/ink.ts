/**
 * Luce del sito: accesa = inchiostro rosso su carta chiara (di base), spenta = rosso e bianco scambiati.
 * La alterna la R in alto a sinistra della home (SvgCell con ink). Lo stato sta in <html data-inchiostro="bianco">
 * (global.css scambia --inchiostro e --bianco e cambia i crocini) e in localStorage. Layout.astro lo
 * applica prima del primo disegno e dopo ogni swap del ClientRouter, che riscrive gli attributi di <html>.
 */

const KEY = 'inchiostro';
const root = document.documentElement;
const isSpenta = () => root.dataset.inchiostro === 'bianco';
// ultima transizione partita: con due click rapidi la prima, saltata, non deve togliere il cerchio della seconda
let latest: ViewTransition | undefined;

function apply(spenta: boolean) {
  if (spenta) root.dataset.inchiostro = 'bianco';
  else delete root.dataset.inchiostro;
  try { localStorage.setItem(KEY, spenta ? 'bianco' : 'rosso'); } catch {}
}

export function initInk(signal: AbortSignal, reduced: boolean) {
  document.querySelectorAll<HTMLButtonElement>('[data-ink]').forEach(btn => {
    // role=switch "Luce": accesa = inchiostro rosso su carta chiara
    const sync = () => {
      btn.setAttribute('aria-checked', String(!isSpenta()));
      btn.title = isSpenta() ? 'Accendi la luce' : 'Spegni la luce';
    };
    sync();

    btn.addEventListener('click', () => {
      const spenta = !isSpenta();
      const swap = () => { apply(spenta); sync(); };
      if (reduced || !document.startViewTransition) return swap();

      // il colore nuovo si allarga a cerchio dal centro della R fino all'angolo più lontano della finestra
      const r = btn.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.style.setProperty('--macchia-x', `${x}px`);
      root.style.setProperty('--macchia-y', `${y}px`);
      root.style.setProperty('--macchia-r', `${radius}px`);
      root.classList.add('vt-ink');
      const vt = latest = document.startViewTransition(swap);
      vt.finished.finally(() => {
        if (vt !== latest) return;
        root.classList.remove('vt-ink');
        for (const p of ['--macchia-x', '--macchia-y', '--macchia-r']) root.style.removeProperty(p);
      });
    }, { signal });
  });
}
