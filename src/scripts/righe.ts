/**
 * Intro dei titoli delle celle di testo: righe dal filo. Sul bordo basso di ogni riga si disegna un filo
 * da 1px (come quello delle celle), la riga esce da lì salendo e il filo si ritira verso destra. Righe a
 * PASSO l'una dall'altra. Parte quando entra il contenuto della sua cella (animazione fill-in di global.css):
 * stesso ritmo dell'intro, qualunque sia la misura della cella. Finito, il titolo torna com'era (a capo
 * liberi al resize).
 * Solo al caricamento "vero" (html.is-intro, mai con prefers-reduced-motion). Prova: tools/pages/testi.html.
 */

const RIGA = 720;    // salita di una riga
const FILO = 640;    // il filo si disegna (45%), resta, si ritira (dal 60%)
const ATTACCO = 160; // la riga parte quando il filo è a metà
const PASSO = 50;    // tra una riga e la successiva (stagger massimo del sito)

/** Le righe come le dispone il browser: parole raggruppate per altezza */
function lines(title: HTMLElement): string[][] {
  const words = (title.firstChild?.textContent ?? '').trim().split(/\s+/);
  const probe = words.map(w => Object.assign(document.createElement('span'), { textContent: w }));
  title.replaceChildren(...probe.flatMap((s, i) => (i ? [' ', s] : [s])));
  const out: string[][] = [];
  let top: number | null = null;
  for (const s of probe) {
    if (s.offsetTop !== top) { out.push([]); top = s.offsetTop; }
    out.at(-1)!.push(s.textContent!);
  }
  return out;
}

function split(title: HTMLElement, start: number, easing: string) {
  const original = [...title.childNodes];
  // il cursore di "Scrivimi_" (TextCell) resta in fondo all'ultima riga
  const caret = title.querySelector('.caret');
  const rows = lines(title);
  const anims: Animation[] = [];

  title.replaceChildren(...rows.map((words, n) => {
    const riga = Object.assign(document.createElement('span'), { className: 'riga' });
    const testo = Object.assign(document.createElement('span'), { className: 'riga__in', textContent: words.join(' ') });
    const filo = Object.assign(document.createElement('span'), { className: 'riga__filo' });
    if (caret && n === rows.length - 1) testo.append(caret);
    riga.append(testo, filo);

    const t = start + n * PASSO;
    const f = filo.animate([
      { transform: 'scaleX(0)', transformOrigin: 'left' },
      { transform: 'scaleX(1)', transformOrigin: 'left', offset: 0.45 },
      { transform: 'scaleX(1)', transformOrigin: 'right', offset: 0.6 },
      { transform: 'scaleX(0)', transformOrigin: 'right' },
    ], { duration: FILO, easing, fill: 'both' });
    const r = testo.animate([{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: RIGA, easing, fill: 'backwards' });
    f.startTime = t;
    r.startTime = t + ATTACCO;
    anims.push(f, r);
    return riga;
  }));

  Promise.allSettled(anims.map(a => a.finished)).then(() => title.replaceChildren(...original));
}

export async function initRighe(signal: AbortSignal) {
  const html = document.documentElement;
  if (!html.classList.contains('is-intro')) return;
  const titles = [...document.querySelectorAll<HTMLElement>('.cell > .text > .title')];
  // a capo giusti solo col font vero (Layout.astro lo precarica)
  await document.fonts.ready;
  const easing = getComputedStyle(html).getPropertyValue('--ease-out').trim();

  for (const title of titles) {
    const fill = title.closest('.cell')?.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'fill-in');
    if (fill && !signal.aborted && html.classList.contains('is-intro')) {
      await fill.ready;
      const start = (fill.startTime as number) + Number(fill.effect?.getTiming().delay ?? 0);
      // già entrato (font arrivato tardi): resta com'è
      if (start > (document.timeline.currentTime as number)) split(title, start, easing);
    }
    // da qui il titolo è visibile (global.css lo nasconde finché le righe non sono pronte)
    title.toggleAttribute('data-righe', true);
  }
}
