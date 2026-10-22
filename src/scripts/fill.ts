/**
 * Footer sempre sul fondo della finestra. Il foglio è alto almeno quanto la finestra (global.css): se la pagina
 * è corta, lo spazio libero sopra il footer si riempie con un vuoto largo quanto la griglia, a righe intere
 * (.void--fill, ultimo figlio della griglia: Grid.astro), e il resto di riga lo prende il footer allungandosi
 * (.sheet.is-corta; lo spazio in più va sopra la barra, .foot__bar con margin-top: auto).
 * Così il footer tocca il fondo e il suo bordo alto resta sulla griglia.
 * Solo letture, niente "togli e rimisura": con prefers-reduced-motion ogni proprietà ha una transizione da
 * 0.01ms (global.css) e il footer, appena tolta la classe, risulterebbe ancora allungato.
 * Ricalcolo: a ogni pagina subito dopo lo swap (prima della foto della View Transition), al resize e dopo
 * i filtri dell'archivio (archive.ts).
 */

export function fillSheet() {
  const sheet = document.querySelector<HTMLElement>('.sheet');
  const fill = sheet?.querySelector<HTMLElement>(':scope > .grid > .void--fill');
  const foot = sheet?.querySelector<HTMLElement>(':scope > .foot');
  const cols = foot?.querySelector<HTMLElement>('.foot__cols');
  const bar = foot?.querySelector<HTMLElement>('.foot__bar');
  if (!sheet || !fill || !foot || !cols || !bar) return;
  // passo della griglia in px (registrato come lunghezza su <body>, uguale a --step)
  const step = parseFloat(getComputedStyle(document.body).getPropertyValue('--ruler-step'));
  if (!(step > 0)) return;

  // spazio libero = sotto il footer + quanto il footer è già cresciuto + le righe di riempimento già messe
  const bottom = sheet.getBoundingClientRect().bottom - parseFloat(getComputedStyle(sheet).paddingBottom);
  const below = bottom - foot.getBoundingClientRect().bottom;
  const grown = bar.offsetTop - (cols.offsetTop + cols.offsetHeight) - parseFloat(getComputedStyle(foot).rowGap);
  const rowsNow = fill.hidden ? 0 : Number(fill.style.getPropertyValue('--ch')) || 0;
  const free = below + grown + rowsNow * step;
  // un pelo di tolleranza: righe e finestra non sono agganciate ai pixel
  const rows = Math.max(0, Math.floor(free / step + 0.01));

  sheet.classList.toggle('is-corta', free > 0.5);
  fill.style.setProperty('--ch', String(rows));
  fill.hidden = rows < 1;
}

addEventListener('resize', fillSheet);
document.fonts.ready.then(fillSheet);  // l'altezza del footer dipende dai font
fillSheet();
