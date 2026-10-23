/**
 * Inverti (nome scelto da Roberto, non "luce"): di base inchiostro rosso su carta chiara, invertiti = rosso e bianco
 * scambiati. La alterna la R in alto a sinistra della home (SvgCell con ink). Lo stato sta in <html data-inchiostro="bianco">
 * (global.css scambia --inchiostro e --bianco) e in localStorage. Layout.astro lo applica prima del primo disegno.
 * Due marchi, ognuno col suo colore: la R è il rosso, Woberto (la R girata e nera nascosta sotto: SvgCell con tinta)
 * il nero. Il primo clic sul marchio dell'altro colore cambia solo il colore (rosso ↔ nero, l'inversione resta); i clic
 * dopo, sullo stesso marchio, invertono. <html data-tinta="nero">, solo per la visita (sessionStorage).
 */
import { suona } from './suono';

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

/** Cambio di colori: il nuovo si allarga a cerchio dal centro di `da` fino all'angolo più lontano della finestra */
function cambia(da: HTMLElement, swap: () => void, reduced: boolean) {
  suona('inverti');
  if (reduced || !document.startViewTransition) return swap();
  const r = da.getBoundingClientRect();
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
}

// ── Tinta: rosso (di base, la R) o nero (Woberto) ──
type Tinta = 'rosso' | 'nero';
const TINTA = 'tinta';
const tintaDi = (): Tinta => (root.dataset.tinta === 'nero' ? 'nero' : 'rosso');
function metti(t: Tinta) {
  if (t === 'nero') root.dataset.tinta = 'nero';
  else delete root.dataset.tinta;
  try { t === 'nero' ? sessionStorage.setItem(TINTA, 'nero') : sessionStorage.removeItem(TINTA); } catch {}
}

export function initInk(signal: AbortSignal, reduced: boolean) {
  const luci = [...document.querySelectorAll<HTMLButtonElement>('[data-ink]')];
  // role=switch "Inverti i colori": attivo = inchiostro e carta scambiati
  const sync = () => luci.forEach(btn => {
    btn.setAttribute('aria-checked', String(isSpenta()));
  });
  sync();
  const scambia = () => { apply(!isSpenta()); sync(); };

  // il marchio del colore di adesso inverte; quello dell'altro colore prima porta il suo colore
  const premi = (btn: HTMLElement, colore: Tinta) =>
    cambia(btn, () => (tintaDi() === colore ? scambia() : metti(colore)), reduced);
  luci.forEach(btn => btn.addEventListener('click', () => premi(btn, 'rosso'), { signal }));
  document.querySelectorAll<HTMLButtonElement>('button[data-woberto]')
    .forEach(btn => btn.addEventListener('click', () => premi(btn, 'nero'), { signal }));
}
