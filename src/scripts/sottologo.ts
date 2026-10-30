/**
 * Cella `sottologo` (Kiale: I panini di Zio Chècco). Import dinamico da cells.ts, solo se la cella c'è.
 * - Vetrina: logo e foto si alternano ogni GIRO ms (la vecchia scena sfuma via, poi entra la nuova: le foto sono
 *   scontornate); un tocco passa alla scena dopo. Ferma fuori vista e col mouse sopra.
 * - Il logo si compone quando la cella entra in vista e ogni volta che torna: il cerchio si disegna, le lettere
 *   arrivano a timbro, il panino cade e la bandierina si apre, i raggi si disegnano dal panino verso fuori, poi le
 *   scritte dietro una penna dal bordo morbido inclinato come il corsivo, a velocità costante; il puntino della i
 *   dopo la sua parola. Le penne stanno nelle maschere del file, ferme a fine corsa: senza script, o con riduci
 *   movimento, il logo è già composto. Scelto da Roberto nel laboratorio tools/pages/zio-checco.html (30/10/2026).
 */

const GIRO = 6000;
const ESCE_SCENA = 300;  // = transition-delay di .scena.is-attiva (SottologoCell.astro)
const VELOCITA = 1800;   // penna, unità del disegno al secondo
const PAUSA = 120;       // penna alzata tra una parola e l'altra, ms
const BORDO = 36;        // sfumatura della penna (le sfumature del file), unità del disegno
const PIEGA = Math.tan(18 * Math.PI / 180);
const ESCE = 'cubic-bezier(.3, 1.5, .5, 1)';   // con un poco di rimbalzo
const MORBIDO = 'cubic-bezier(.45, 0, .55, 1)';

/** prepara il logo (misure lette al primo giro, quando è nella pagina) e restituisce la funzione che lo compone */
function compositore(svg: SVGSVGElement) {
  const $ = <T extends Element = SVGGraphicsElement>(s: string) => svg.querySelector<T>(s);
  type Penna = { id: string; el: SVGGElement[]; da: number; a: number };
  type Raggio = { el: SVGGeometryElement; rovescio: boolean };
  let penne: Penna[] | null = null, raggi: Raggio[] = [];

  function misura() {
    penne = [...svg.querySelectorAll<SVGGElement>('[data-scritta]')]
      .sort((x, y) => +x.dataset.ordine! - +y.dataset.ordine!)
      .map(g => {
        const id = g.dataset.scritta!, b = g.getBBox(), yc = b.y + b.height / 2, piega = PIEGA * b.height / 2;
        // la parola e il suo alone: due penne, una nella maschera della parola e una in quella dell'alone
        const el = [...svg.querySelectorAll<SVGGElement>(`[data-penna="${id}"]`)];
        el.forEach(p => p.firstElementChild!.setAttribute('transform', `translate(0 ${yc}) skewX(-18) translate(0 ${-yc})`));
        return { id, el, da: b.x - piega, a: b.x + b.width + piega + BORDO };
      });
    // raggi a coppie dall'alto in basso (i due lati insieme), ognuno dal panino verso fuori
    const pb = $('[data-panino]')!.getBBox(), cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    const dist = (pt: DOMPoint) => Math.hypot(pt.x - cx, pt.y - cy);
    raggi = [...svg.querySelectorAll<SVGGeometryElement>('[data-raggi] [data-tratto]')].map(el => {
      const len = el.getTotalLength(), p0 = el.getPointAtLength(0), p1 = el.getPointAtLength(len);
      return { el, rovescio: dist(p1) < dist(p0), y: (p0.y + p1.y) / 2 };
    }).sort((r, s) => r.y - s.y);
  }

  const disegna = (el: Element, t: number, dur: number, rovescio = false) => el.animate(
    [{ strokeDashoffset: rovescio ? -1.02 : 1.02 }, { strokeDashoffset: 0 }],
    { duration: dur, delay: t, fill: 'both', easing: MORBIDO });
  const timbro = (el: Element, t: number, dur: number, da: Keyframe = { opacity: 0, scale: 0.4 }) => el.animate(
    [da, { opacity: 1, scale: 1, translate: '0 0' }], { duration: dur, delay: t, fill: 'both', easing: ESCE });

  /** `dopo`: ms prima di cominciare (la scena del logo che deve ancora entrare) */
  return function componi(dopo = 0): Animation[] {
    svg.getAnimations({ subtree: true }).forEach(a => a.cancel());
    if (!penne) misura();
    const an: Animation[] = [];
    an.push(disegna($('[data-cerchio]')!, 0, 700));
    svg.querySelectorAll('[data-lettere] > *').forEach((el, i) => an.push(timbro(el, 120 + i * 40, 260)));
    an.push(timbro($('[data-panino]')!, 300, 460, { opacity: 0, scale: 0.2, translate: '0 -80px' }));
    an.push(timbro($('[data-bandiera]')!, 700, 220, { opacity: 0, scale: '0 1' }));
    raggi.forEach((r, i) => an.push(disegna(r.el, 560 + Math.floor(i / 2) * 40, 240, r.rovescio)));
    let t = 780;
    for (const p of penne!) {
      const dur = (p.a - p.da) / VELOCITA * 1000;
      p.el.forEach(el => an.push(el.animate([{ transform: `translateX(${p.da}px)` }, { transform: `translateX(${p.a}px)` }],
        { duration: dur, delay: t, fill: 'both', easing: MORBIDO })));
      t += dur;
      const segno = $(`[data-dopo="${p.id}"]`);
      if (segno?.hasAttribute('data-tratto')) an.push(disegna(segno, t + 30, 140));
      else if (segno) an.push(timbro(segno, t + 30, 160, { opacity: 0, scale: 0.3 }));
      t += PAUSA;
    }
    if (dopo) an.forEach(a => a.effect!.updateTiming({ delay: Number(a.effect!.getTiming().delay) + dopo }));
    return an;
  };
}

export function initSottologhi(signal: AbortSignal, reduced: boolean) {
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll<HTMLElement>('[data-sottologo]').forEach(cella => {
    const vetrina = cella.querySelector<HTMLElement>('[data-vetrina]')!;
    const scene = [...vetrina.querySelectorAll<HTMLElement>('.scena')];
    const svg = vetrina.querySelector<SVGSVGElement>('svg[data-logo-animato]');
    const componi = svg && !reduced ? compositore(svg) : null;
    // il logo aspetta di entrare in vista: fermo al primo fotogramma (vuoto)
    let attesa = componi?.() ?? null;
    attesa?.forEach(a => a.pause());

    let i = 0, timer = 0, inVista = false, sopra = false;
    // la vecchia scena esce (CSS, ESCE_SCENA ms), poi entra la nuova: il logo comincia quando la sua scena è entrata
    const mostra = (prossima: number) => {
      scene[i].classList.remove('is-attiva');
      scene[prossima].classList.add('is-attiva');
      i = prossima;
      if (svg && scene[i].contains(svg)) componi?.(ESCE_SCENA);
    };
    const avanti = () => mostra((i + 1) % scene.length);
    const aggiorna = () => {
      clearInterval(timer);
      timer = inVista && !sopra && scene.length > 1 ? window.setInterval(avanti, GIRO) : 0;
    };
    vetrina.addEventListener('click', () => { if (scene.length > 1) { avanti(); aggiorna(); } }, { signal });
    if (mouse) {
      vetrina.addEventListener('pointerenter', () => { sopra = true; aggiorna(); }, { signal });
      vetrina.addEventListener('pointerleave', () => { sopra = false; aggiorna(); }, { signal });
    }
    const io = new IntersectionObserver(([e]) => {
      inVista = e.isIntersecting;
      // il logo parte quando se ne vede almeno metà
      if (attesa && e.intersectionRatio >= 0.5) { attesa.forEach(a => a.play()); attesa = null; }
      aggiorna();
    }, { threshold: [0, 0.5] });
    io.observe(vetrina);
    signal.addEventListener('abort', () => { io.disconnect(); clearInterval(timer); });
  });
}
