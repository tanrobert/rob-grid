/**
 * Cella "barattolo" (components/cells/BarattoloCell.astro): mockup veri, l'etichetta piatta avvolta sul cilindro
 * misurato nel PSD (tools/barattolo-mockup.py), che gira trascinando e si sfoglia con ‹ ›. Laboratorio:
 * tools/pages/barattolo.html, da cui viene questo codice.
 * - Ogni barattolo ha il suo vaso, il più grande che ci sta e centrato (29/10/2026, scelta di Roberto: alla stessa
 *   scala del vaso alto i vasetti bassi restavano piccoli; ora sfogliando la misura può cambiare).
 * - Livelli dei vasi in public/barattolo/<mockup>/, scaricati quando la cella si avvicina allo schermo e solo per i
 *   vasi che servono; etichette a tre a tre (quella in vista e le vicine). Il modulo resta tra un foglio e l'altro:
 *   quello che è scaricato resta.
 * - L'etichetta si avvolge colonna per colonna in un canvas dritto, poi ruotato tutto insieme (le strisce ruotate
 *   una per una facevano righe); luci e ombre del mockup restano ferme sopra (vengono dalla stanza).
 * - Dentro il vetro un foglio avvolto anche lui fa da contenuto: la foto del barattolo (`interno`, che si ripete senza
 *   stacco ai lati: un cartoncino arrotolato), o un segnaposto disegnato qui (pezzi, crema, filetti).
 * - Un solo rAF per cella, acceso solo quando qualcosa si muove e la cella è in vista; con riduci movimento
 *   non gira da solo e lo sfoglia non scorre (il trascinamento resta: è un gesto).
 * - Fondo del colore della cella: segue Inverti e la tinta di Woberto.
 * - Parola della linea (Confetture, Sughi…) girata in verticale sul lato sinistro (sul destro coi vasi alti),
 *   appoggiata sopra la fascia del bordo, col colore del bordo: se resta la stessa cambia solo
 *   il colore, se cambia esce e rientra col barattolo.
 * - Ombra a terra nostra, una sola per tutti i vasi (quelle dei mockup non si usano): un'ellisse sfumata in una tela
 *   sua, ferma; sfogliando sparisce col barattolo che esce e torna con quello che entra.
 * - Bordo dell'etichetta (SVG del progetto) in grande in fondo alla cella, subito sopra la didascalia, coi tagli verso
 *   l'alto (29/10/2026; prima in verticale sul lato destro), in una tela sotto (`carta`): la
 *   scena del barattolo ha il bordo dentro il fondo (si vede attraverso il vetro e l'ombra ci cade sopra) ed è
 *   ritagliata sulla sagoma del vaso, così fuori resta la carta. Cambiando barattolo il bordo cambia colore e forma:
 *   le due forme, sfocate, si fondono l'una nell'altra e si riaffilano.
 */

type Geometria = { w: number; h: number; cx: number; cy: number; ang: number; r: number; t0: number; t1: number; e: number; piano: [number, number]; cima: number; largo: number; centro: number; piede: number };
type Voce = { nome: string; mockup: string; src: string; bordo?: string; parola?: string; interno?: string; tipo: 'pezzi' | 'crema' | 'filetti'; dentro: string; pezzi?: string };
type Dati = { mockup: Record<string, Geometria>; barattoli: Voce[] };
/** [file, fusione, tinta?]: con la tinta il file è una maschera (grigio = quanto) da riempire di quel colore */
type Livello = [string, GlobalCompositeOperation, string?];
type Canvas = HTMLCanvasElement & { dx?: number; dy?: number; su?: number };
type Immagine = CanvasImageSource & { width: number; height: number };

const OGNI_MS = 4500;            // da soli, il barattolo dopo ogni tanto…
const PAUSA_MS = 10000;          // …e dopo un gesto aspettano un po' di più
const COPERCHIO = '#8a5236';     // marrone dei coperchi Kiale
// `dalTitolo`: il vaso va dal titolo alla didascalia (i vasi alti, 29/10/2026); gli altri al centro, grandi RIEMPIE.
// `parolaDestra`: la parola della linea sul lato destro (di base a sinistra)
const MOCKUP: Record<string, { fondo: Livello[]; sopra: Livello[]; dalTitolo?: boolean; parolaDestra?: boolean }> = {
  // Food Jar Mockup 2: il contenuto ha un livello suo (maschera), il coperchio una maschera da colorare
  'vaso-basso': {
    fondo: [['vaso', 'source-over'], ['maschera-coperchio', 'multiply', COPERCHIO]],
    sopra: [['luci', 'screen']],
  },
  // Large Honey Jar Mockup 3: vetro reso neutro dallo strumento, coperchio = maschera colorata + le sue ombre
  'vaso-alto': {
    fondo: [['vaso', 'source-over'], ['maschera-coperchio', 'source-over', COPERCHIO], ['coperchio-ombre', 'multiply']],
    sopra: [['luci', 'screen']],
    dalTitolo: true,
    parolaDestra: true,
  },
};
const ETICHETTA = ['etichetta-ombre', 'etichetta-luci', 'maschera-contenuto'];
const BORDO_QUOTA = 0.25;        // la fascia del bordo: 4 mm d'etichetta larghi un quarto della cella
const BORDO_4MM = 11.34;         // 4 mm in punti (le unità degli SVG da Illustrator); i bordi sono alti 11,3–12,6
const BORDO_MAX = 13;            // la fascia più alta, in punti: larghezza delle maschere
const BORDO_MS = 520;            // cambio di colore e forma
const OMBRA = { y: 0.02, rx: 0.62, ry: 0.08 };   // ombra a terra, in larghezze del vetro: sopra il fondo, raggi
const RIEMPIE_ALTI = 0.95;    // i vasi dal titolo: quanto dell'altezza della tela, con la cima in alto
const RIEMPIE = 0.85;        // quanto dello spazio dei barattoli occupa il vaso (in larghezza il vetro, in altezza dalla cima al fondo)
const BORDO_FUORI = 1.5;         // la fascia esce un poco dal fondo della cella, in punti

const tela = (w = 0, h = 0): Canvas => Object.assign(document.createElement('canvas'), { width: w, height: h });
const carica = (src: string) => new Promise<HTMLImageElement>((ok, ko) => {
  const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = ko; i.src = src;
});

// maschera (grigio) + colore → colore pieno con la maschera come trasparenza
function tinta(maschera: CanvasImageSource, colore: string, w: number, h: number) {
  const c = tela(w, h), g = c.getContext('2d')!;
  g.drawImage(maschera, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), p = d.data;
  const [r, gg, b] = colore.match(/\w\w/g)!.map(x => parseInt(x, 16));
  for (let i = 0; i < p.length; i += 4) { p[i + 3] = p[i]; p[i] = r; p[i + 1] = gg; p[i + 2] = b; }
  g.putImageData(d, 0, 0);
  return c;
}

// riquadro dove la trasparenza non è zero
function riquadro(c: HTMLCanvasElement) {
  const p = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++)
    if (p[(y * c.width + x) * 4 + 3] > 2) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

// livelli di un vaso: scaricati una volta, le tinte già colorate, la maschera del contenuto come trasparenza
type Pronti = { img: Record<string, CanvasImageSource>; mascheraInterno: HTMLCanvasElement; boxInterno: ReturnType<typeof riquadro> };
const vasi = new Map<string, Promise<Pronti>>();
function caricaVaso(nome: string, G: Geometria) {
  if (!vasi.has(nome)) vasi.set(nome, (async () => {
    const m = MOCKUP[nome], dir = `/barattolo/${nome}/`;
    const nomi = [...new Set([...m.fondo, ...m.sopra].map(([f]) => f).concat(ETICHETTA))];
    const img: Record<string, CanvasImageSource> = Object.fromEntries(await Promise.all(nomi.map(async f => [f, await carica(dir + f + '.webp')] as const)));
    for (const [f, , colore] of [...m.fondo, ...m.sopra]) if (colore) img[f + '+'] = tinta(img[f], colore, G.w, G.h);
    const mascheraInterno = tinta(img['maschera-contenuto'], '#ffffff', G.w, G.h);
    return { img, mascheraInterno, boxInterno: riquadro(mascheraInterno) };
  })());
  return vasi.get(nome)!;
}
const etichette = new Map<string, Promise<HTMLImageElement>>();
const caricaEtichetta = (src: string) => { if (!etichette.has(src)) etichette.set(src, carica(src)); return etichette.get(src)!; };

// bordo: l'SVG con il colore dell'etichetta portato a nero (resta il bianco della carta), per farne una maschera da
// tingere; misure in punti dal viewBox, scritte anche come width/height (Firefox non disegna SVG senza misure)
type Bordo = { img: HTMLImageElement; w: number; h: number; colore: number[] };
const bordi = new Map<string, Promise<Bordo | null>>();
function caricaBordo(src?: string) {
  if (!src) return Promise.resolve(null);
  if (!bordi.has(src)) bordi.set(src, (async () => {
    let svg = await (await fetch(src)).text();
    const [, , w, h] = svg.match(/viewBox="([^"]+)"/)![1].split(/[\s,]+/).map(Number);
    const hex = [...svg.matchAll(/#[0-9a-f]{6}\b/gi)].map(m => m[0].toLowerCase()).find(c => c !== '#ffffff')!;
    svg = svg.replace(new RegExp(hex, 'gi'), '#000000').replace('<svg ', `<svg width="${w}" height="${h}" `);
    const img = await carica(URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
    return { img, w, h, colore: hex.match(/\w\w/g)!.map(x => parseInt(x, 16)) };
  })().catch(() => null));
  return bordi.get(src)!;
}

// maschere di un bordo alla misura della carta: la fascia girata di 180°, il lato esterno dell'etichetta (dritto) in
// basso, un po' oltre (`BORDO_FUORI`), i tagli verso l'alto, centrata in larghezza (tagli uguali a destra e a
// sinistra). `netta` = copertura (0–255); `morbida` = la stessa sfocata, per il cambio di forma. Sotto si allunga prima
// di sfocare, così la fascia non sbiadisce verso il fondo della cella
type Maschere = { netta: Uint8ClampedArray; morbida: Uint8ClampedArray; chiave: string };
const maschere = new WeakMap<Bordo, Maschere>();
function maschera(b: Bordo, k: number, larga: number, mh: number): Maschere {
  const chiave = `${k} ${larga} ${mh}`, m = maschere.get(b);
  if (m?.chiave === chiave) return m;
  const pad = Math.ceil(2 * k), c = tela(larga + 2 * pad, mh + pad), g = c.getContext('2d', { willReadFrequently: true })!;
  g.translate(pad + larga / 2, mh + BORDO_FUORI * k); g.rotate(Math.PI); g.drawImage(b.img, -b.w * k / 2, 0, b.w * k, b.h * k);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  // nero = colore pieno, bianco = carta: copertura = trasparenza × scuro
  for (let i = 0; i < p.length; i += 4) { p[i + 3] = p[i + 3] * (255 - (p[i] + p[i + 1] + p[i + 2]) / 3) / 255; p[i] = p[i + 1] = p[i + 2] = 0; }
  g.putImageData(d, 0, 0);
  g.drawImage(c, 0, mh - 1, c.width, 1, 0, mh, c.width, pad);
  const leggi = (src: HTMLCanvasElement) => {
    const a = src.getContext('2d', { willReadFrequently: true })!.getImageData(pad, 0, larga, mh).data, out = new Uint8ClampedArray(larga * mh);
    for (let i = 0; i < out.length; i++) out[i] = a[i * 4 + 3];
    return out;
  };
  const sf = tela(c.width, c.height), gs = sf.getContext('2d', { willReadFrequently: true })!;
  gs.filter = `blur(${(1.1 * k).toFixed(1)}px)`; gs.drawImage(c, 0, 0);
  const nuove = { netta: leggi(c), morbida: leggi(sf), chiave };
  maschere.set(b, nuove);
  return nuove;
}
// stessa forma (stesso disegno con un altro colore: nei file i tracciati possono differire di poco): coperture quasi
// uguali, contate a campione
const simili = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
  let d = 0, n = 0;
  for (let i = 0; i < a.length; i += 7, n++) d += Math.abs(a[i] - b[i]);
  return d / n / 255 < 0.02;
};

// interno segnaposto, che si ripete senza stacco ai lati (ogni forma anche una larghezza prima e dopo)
function texturaInterno({ tipo, dentro, pezzi = dentro }: Voce) {
  const w = 1024, h = 512, c = tela(w, h), g = c.getContext('2d')!;
  g.fillStyle = dentro; g.fillRect(0, 0, w, h);
  let seme = 11; const caso = () => (seme = seme * 16807 % 2147483647) / 2147483647;
  if (tipo === 'filetti') {
    // strisce sottili e curve, in tutte le direzioni, nell'olio
    g.lineCap = 'round'; g.strokeStyle = pezzi;
    for (let i = 0; i < 260; i++) {
      const x = caso() * w, y = caso() * h, a = caso() * Math.PI, l = 40 + caso() * 90, curva = (caso() - 0.5) * 60;
      g.globalAlpha = 0.55 + caso() * 0.45; g.lineWidth = 3 + caso() * 5;
      for (const dx of [-w, 0, w]) {
        const x0 = x + dx - Math.cos(a) * l / 2, y0 = y - Math.sin(a) * l / 2;
        g.beginPath(); g.moveTo(x0, y0);
        g.quadraticCurveTo(x + dx + Math.sin(a) * curva, y - Math.cos(a) * curva, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); g.stroke();
      }
    }
    g.globalAlpha = 1;
    return c;
  }
  const crema = tipo === 'crema', [r0, r1] = crema ? [60, 140] : [18, 34];
  for (let i = 0; i < (crema ? 40 : 90); i++) {
    const x = caso() * w, y = caso() * h, r = r0 + caso() * (r1 - r0), chiara = caso() < 0.5;
    for (const dx of [-w, 0, w]) {
      const f = g.createRadialGradient(x + dx - r * 0.35, y - r * 0.35, r * 0.1, x + dx, y, r);
      if (crema) { f.addColorStop(0, chiara ? 'rgba(255,220,150,.22)' : 'rgba(90,40,0,.16)'); f.addColorStop(1, 'rgba(0,0,0,0)'); }
      else { f.addColorStop(0, 'rgba(255,255,255,.55)'); f.addColorStop(0.25, pezzi); f.addColorStop(1, dentro); }
      g.fillStyle = f; g.beginPath(); g.arc(x + dx, y, r, 0, 7); g.fill();
    }
  }
  return c;
}

// immagine portata una volta, con qualità alta, all'altezza in cui si disegna (avvolgi copia le colonne 1:1 in verticale)
const scalate = new WeakMap<CanvasImageSource, HTMLCanvasElement>();
function scalata(img: Immagine, alta: number): Immagine {
  const h = Math.max(1, Math.round(alta)), c = scalate.get(img);
  if (c?.height === h) return c;
  if (img.height === h) return img;
  const n = tela(Math.round(img.width * h / img.height), h), g = n.getContext('2d')!;
  g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, n.width, h);
  scalate.set(img, n);
  return n;
}

// fascia dell'etichetta: alta quanto la parte piatta del vetro, meno un piccolo margine sopra e sotto
const fascia = (G: Geometria): [number, number] => [G.piano[0] + 0.04 * G.r, G.piano[1] - 0.04 * G.r];

export function initBarattoli(signal: AbortSignal, reduced: boolean) {
  document.querySelectorAll<HTMLElement>('[data-barattolo]').forEach(root => {
    // scarica e prepara solo quando la cella si avvicina allo schermo
    const vicino = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      vicino.disconnect();
      avvia(root, signal, reduced);
    }, { rootMargin: '400px' });
    vicino.observe(root);
    signal.addEventListener('abort', () => vicino.disconnect());
  });
}

async function avvia(root: HTMLElement, signal: AbortSignal, reduced: boolean) {
  const dati: Dati = JSON.parse(root.dataset.barattolo!);
  const voci = dati.barattoli, n = voci.length;
  const cv = root.querySelector<HTMLCanvasElement>('[data-tela]')!, ctx = cv.getContext('2d')!;
  const carta = root.querySelector<HTMLCanvasElement>('[data-carta]')!, cc = carta.getContext('2d')!;
  const ombra = root.querySelector<HTMLCanvasElement>('[data-ombra]')!;
  const parola = root.querySelector<HTMLElement>('[data-parola]')!;
  const didascalia = root.querySelector<HTMLElement>('.caption');
  const titolo = root.querySelector<HTMLElement>('.titolo');
  const cella = root.closest<HTMLElement>('.cell') ?? root;
  // il segnaposto subito; la foto, se c'è, quando è scaricata (applica)
  const interni: Immagine[] = voci.map(texturaInterno), foto = voci.map(() => false);
  let at = 0, W = 0, H = 0, giro = 0, vel = 0, auto = !reduced, raf = 0, ultimo = 0, inVista = true;
  let presa: { x: number; y: number; t: number } | null = null;
  // vaso in vista: geometria, livelli, scala (pixel reali per unità del ritaglio), fascia dell'etichetta, etichetta
  let G: Geometria, M: (typeof MOCKUP)[string], P: Pronti, s = 1, t0 = 0, t1 = 0, lab: HTMLImageElement;
  const scena = tela(), sc = scena.getContext('2d')!;
  const fondo = tela(), strato: Canvas = tela(), forma = tela(), interno: Canvas = tela(), sagoma = tela();
  // bordo: quello di prima (`da`, solo durante il cambio) e quello di adesso; tela del barattolo dentro la carta (ox, oy)
  let bordo: { da: Bordo | null; a: Bordo | null; t: number } = { da: null, a: null, t: 0 }, ox = 0, oy = 0, bordoFermo = true;
  let sx = 0, sy = 0;   // scena dentro la tela
  const dritto = { etichetta: tela(), interno: tela() };

  // scaricare (vaso, etichetta, bordo, foto dell'interno) e applicare sono separati: lo stato cambia solo quando si può
  // disegnare tutto. La foto dell'interno, se non arriva, lascia il segnaposto
  const caricaInterno = (w: Voce) => (w.interno ? caricaEtichetta(w.interno).catch(() => null) : Promise.resolve(null));
  const scarica = (i: number) => Promise.all([caricaVaso(voci[i].mockup, dati.mockup[voci[i].mockup]), caricaEtichetta(voci[i].src), caricaBordo(voci[i].bordo), caricaInterno(voci[i])]);
  function applica(i: number, [p, l, b, f]: Awaited<ReturnType<typeof scarica>>) {
    at = i; G = dati.mockup[voci[i].mockup]; M = MOCKUP[voci[i].mockup]; P = p; lab = l; [t0, t1] = fascia(G);
    if (f) { interni[i] = f; foto[i] = true; }
    // il bordo nuovo: di colpo la prima volta e con riduci movimento, se no si trasforma da quello in vista
    bordo = { da: reduced || !bordo.a ? null : bordo.a, a: b, t: performance.now() }; bordoFermo = !bordo.da;
    // le vicine in anticipo, quando il browser è libero
    const dopo = () => [voci[(i + 1) % n], voci[(i - 1 + n) % n]].forEach(w => { caricaEtichetta(w.src); caricaVaso(w.mockup, dati.mockup[w.mockup]); caricaBordo(w.bordo); caricaInterno(w); });
    'requestIdleCallback' in window ? requestIdleCallback(dopo) : setTimeout(dopo, 300);
  }

  function livelli(g: CanvasRenderingContext2D, lista: Livello[]) {
    for (const [f, fusione, colore] of lista) { g.globalCompositeOperation = fusione; g.drawImage(P.img[colore ? f + '+' : f], 0, 0, G.w, G.h); }
    g.globalCompositeOperation = 'source-over';
  }

  // misura e tutto quello che non gira: carta del colore della cella, ombra, vetro, coperchio
  function prepara() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = Math.round(r.width * dpr); H = cv.height = Math.round(r.height * dpr);
    const rc = root.getBoundingClientRect();
    carta.width = ombra.width = Math.round(rc.width * dpr); carta.height = ombra.height = Math.round(rc.height * dpr);
    // posizione di layout (la vetrina sta a 0,0 della cella): il rettangolo vero includerebbe lo spostamento dello sfoglia
    ox = Math.round(cv.offsetLeft * dpr); oy = Math.round(cv.offsetTop * dpr);
    // pixel reali per unità del ritaglio. Il canvas comincia un poco dentro l'ultima riga del titolo (margine negativo)
    // e finisce sulla didascalia. In larghezza conta solo il vetro (`largo`): l'ombra ai lati può uscire, sfuma nella
    // cella. Il vaso dal titolo parte dalla cima della tela, alto RIEMPIE_ALTI; gli altri stanno al centro dello spazio tra il
    // fondo del titolo e la fascia del bordo (fino alle punte), grandi RIEMPIE
    const alto = G.piede - G.cima;
    const dentro = M.dalTitolo || !titolo ? 0 : Math.max(0, -parseFloat(getComputedStyle(titolo).marginBottom)) * dpr;
    const punte = !M.dalTitolo && bordo.a ? (bordo.a.h - BORDO_FUORI) * carta.width * BORDO_QUOTA / BORDO_4MM : 0;
    const libero = Math.max(1, H - dentro - punte);
    s = (M.dalTitolo ? RIEMPIE_ALTI : RIEMPIE) * Math.min(W / G.largo, libero / alto);
    sy = Math.round(M.dalTitolo ? -G.cima * s : dentro + (libero - alto * s) / 2 - G.cima * s);
    scena.width = fondo.width = sagoma.width = Math.round(G.w * s); scena.height = fondo.height = sagoma.height = Math.round(G.h * s);
    sx = Math.round(W / 2 - G.centro * s);
    ritaglia();
    dipingiBordo(performance.now());
    // ombra: sotto il fondo del vetro, in proporzione al vaso
    const go = ombra.getContext('2d')!, vetro = G.largo * s;
    go.clearRect(0, 0, ombra.width, ombra.height);
    go.setTransform(OMBRA.rx * vetro, 0, 0, OMBRA.ry * vetro, ox + sx + G.centro * s, oy + sy + G.piede * s - OMBRA.y * vetro);
    const sfuma = go.createRadialGradient(0, 0, 0, 0, 0, 1);
    sfuma.addColorStop(0, 'rgba(28, 26, 23, .3)'); sfuma.addColorStop(0.5, 'rgba(28, 26, 23, .14)'); sfuma.addColorStop(1, 'rgba(28, 26, 23, 0)');
    go.fillStyle = sfuma; go.beginPath(); go.arc(0, 0, 1, 0, 2 * Math.PI); go.fill();
    go.setTransform(1, 0, 0, 1, 0, 0);
    const box = (B: { x0: number; y0: number; x1: number; y1: number }, c: Canvas) => {
      const dx = Math.floor(B.x0 * s), dy = Math.floor(B.y0 * s);
      c.width = Math.ceil(B.x1 * s) - dx; c.height = Math.ceil(B.y1 * s) - dy; c.dx = dx; c.dy = dy;
    };
    // riquadro della fascia ruotata (con la curva e un margine): solo lì si ridisegna l'etichetta
    const pts: number[][] = [];
    for (const x of [-G.r, G.r]) for (const y of [t0 - Math.abs(G.e) * G.r, t1 + Math.abs(G.e) * G.r]) pts.push([x, y]);
    const c = Math.cos(G.ang), sn = Math.sin(G.ang);
    const xs = pts.map(([x, y]) => G.cx + c * x - sn * y), ys = pts.map(([x, y]) => G.cy + sn * x + c * y);
    box({ x0: Math.max(0, Math.min(...xs) - 4), y0: Math.max(0, Math.min(...ys) - 4), x1: Math.min(G.w, Math.max(...xs) + 4), y1: Math.min(G.h, Math.max(...ys) + 4) }, strato);
    forma.width = strato.width; forma.height = strato.height;
    box(P.boxInterno, interno);
    disegna();
  }

  // dove c'è il vaso (vetro e coperchio): i livelli del fondo su un grigio neutro, e tutto quello che non è più quel grigio
  function ritaglia() {
    const g = sagoma.getContext('2d', { willReadFrequently: true })!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#808080'; g.fillRect(0, 0, sagoma.width, sagoma.height);
    g.setTransform(s, 0, 0, s, 0, 0); livelli(g, M.fondo); g.setTransform(1, 0, 0, 1, 0, 0);
    const d = g.getImageData(0, 0, sagoma.width, sagoma.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) p[i + 3] = Math.abs(p[i] - 128) + Math.abs(p[i + 1] - 128) + Math.abs(p[i + 2] - 128) > 3 ? 255 : 0;
    g.putImageData(d, 0, 0);
  }

  // il fondo della scena: la carta della cella col bordo, poi ombra, vetro e coperchio
  function rifaiFondo() {
    const f = fondo.getContext('2d')!;
    f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over';
    f.fillStyle = getComputedStyle(cella).backgroundColor; f.fillRect(0, 0, fondo.width, fondo.height);
    f.drawImage(carta, -(ox + sx), -(oy + sy));
    f.setTransform(s, 0, 0, s, 0, 0);
    livelli(f, M.fondo);
  }

  // il bordo sulla carta, al punto `adesso` del cambio: copertura da → a (sfocate a metà strada, nette agli estremi),
  // colore da → a; poi il fondo della scena, che lo contiene
  let pixel: ImageData | null = null;
  function dipingiBordo(adesso: number) {
    cc.clearRect(0, 0, carta.width, carta.height);
    const { da, a } = bordo, dpr = carta.width / Math.max(1, root.clientWidth);
    // sopra la didascalia, che resta sulla carta
    const larga = carta.width, sotto = Math.round((didascalia?.offsetHeight ?? 0) * dpr);
    const k = carta.width * BORDO_QUOTA / BORDO_4MM, mh = Math.min(carta.height - sotto, Math.ceil(BORDO_MAX * k));
    // quanto sale la fascia sopra la didascalia (fino alle punte), in px CSS: la parola ci si appoggia sopra
    if (a) root.style.setProperty('--bordo-alto', `${((a.h - BORDO_FUORI) * k / dpr).toFixed(1)}px`);
    if ((a || da) && larga > 0 && mh > 0) {
      const p = da ? Math.min(1, (adesso - bordo.t) / BORDO_MS) : 1, e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      const A = da && maschera(da, k, larga, mh), B = a && maschera(a, k, larga, mh);
      // sciolta: quanto le forme sono sfocate (zero agli estremi; zero sempre se la forma è la stessa: cambia solo il
      // colore); netto: la soglia che le tiene col contorno pulito
      const sciolta = A && B && !simili(A.netta, B.netta) ? Math.sin(Math.PI * e) : 0, netto = Math.min(1, 4 * sciolta);
      const ca = (da ?? a)!.colore, cb = (a ?? da)!.colore, col = ca.map((v, j) => v + (cb[j] - v) * e);
      if (pixel?.width !== larga || pixel.height !== mh) pixel = cc.createImageData(larga, mh);
      const q = pixel.data;
      for (let i = 0, j = 0; i < larga * mh; i++, j += 4) {
        const fa = A ? A.netta[i] + (A.morbida[i] - A.netta[i]) * sciolta : 0;
        const fb = B ? B.netta[i] + (B.morbida[i] - B.netta[i]) * sciolta : 0;
        const f = (fa + (fb - fa) * e) / 255;
        const x = Math.min(1, Math.max(0, (f - 0.42) / 0.16)), soglia = x * x * (3 - 2 * x);
        q[j] = col[0]; q[j + 1] = col[1]; q[j + 2] = col[2]; q[j + 3] = 255 * (f + (soglia - f) * netto);
      }
      cc.putImageData(pixel, 0, carta.height - sotto - mh);
      if (p >= 1) bordo.da = null;
    }
    bordoFermo = !bordo.da;
    rifaiFondo();
  }

  // avvolge un'immagine su un cilindro di raggio r, in un canvas dritto (asse verticale) a pixel reali: una colonna per
  // pixel, alta quanto l'immagine, spostata della curva dell'ellisse. `giri`: si ripete tante volte attorno (interno);
  // senza, copre `span` radianti centrati sulla fronte (etichetta).
  function avvolgi(c: Canvas, img: Immagine, r: number, { span = 0, giri = 0 }) {
    const R = r * s, cala = G.e * R, su = Math.max(0, -cala);
    c.width = Math.ceil(2 * R); c.height = img.height + Math.ceil(Math.abs(cala)) + 1;
    const g = c.getContext('2d')!;
    const arco = giri ? 2 * Math.PI / giri : span, fronte = giri ? 0 : span / 2;
    for (let i = 0; i < c.width; i++) {
      const th = Math.asin(Math.max(-1, Math.min(1, (i + 0.5 - R) / R))), cos = Math.cos(th);
      let a = (th - giro + fronte) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI;
      if (!giri && a >= span) continue;
      const u = (a % arco) / arco * img.width;
      const sw = Math.min(img.width - u, Math.max(0.5, img.width / arco / (R * Math.max(cos, 0.02))));
      if (sw > 0) g.drawImage(img, u, 0, sw, img.height, i, su + cala * cos, 1, img.height);
    }
    c.su = su;
    return c;
  }
  // il canvas dritto al suo posto: centro dell'asse, inclinazione, bordo della fascia
  function posa(g: CanvasRenderingContext2D, c: Canvas, r: number, ta: number, dx: number, dy: number) {
    g.setTransform(1, 0, 0, 1, -dx, -dy);
    g.translate(G.cx * s, G.cy * s); g.rotate(G.ang);
    g.drawImage(c, -r * s, ta * s - c.su!);
  }

  function disegna() {
    if (!W) return;
    sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = 'source-over';
    sc.drawImage(fondo, 0, 0);
    // contenuto: il foglio avvolto su un cilindro poco più stretto del vetro, ritagliato dalla maschera, moltiplicato.
    // Segnaposto: alto quasi 5 raggi, ripetuto a giri interi (si deforma un poco, non si vede). Foto: nelle sue
    // proporzioni, un giro (o più, se resta alta abbastanza) = la sua larghezza, centrata sul contenuto del vaso
    const ri = G.r * 0.96, giro1 = 2 * Math.PI * ri * Math.sqrt(1 - G.e * G.e) * interni[at].height / interni[at].width;
    const B = P.boxInterno, alto = B.y1 - B.y0, mezzo = (B.y0 + B.y1) / 2 - G.cy;
    const hf = foto[at] ? giro1 / Math.max(1, Math.floor(giro1 / alto)) : 4.8 * G.r;
    const ia = foto[at] ? mezzo - hf / 2 : -2.4 * G.r, ib = ia + hf;
    const tex = scalata(interni[at], (ib - ia) * s);
    const giri = Math.max(1, Math.round(2 * Math.PI * ri / ((ib - ia) / Math.sqrt(1 - G.e * G.e) * tex.width / tex.height)));
    const gi = interno.getContext('2d')!;
    gi.setTransform(1, 0, 0, 1, 0, 0); gi.globalCompositeOperation = 'source-over'; gi.clearRect(0, 0, interno.width, interno.height);
    posa(gi, avvolgi(dritto.interno, tex, ri, { giri }), ri, ia, interno.dx!, interno.dy!);
    gi.setTransform(s, 0, 0, s, -interno.dx!, -interno.dy!);
    gi.globalCompositeOperation = 'destination-in'; gi.drawImage(P.mascheraInterno, 0, 0);
    sc.globalCompositeOperation = 'multiply'; sc.drawImage(interno, interno.dx!, interno.dy!);
    sc.setTransform(s, 0, 0, s, 0, 0); livelli(sc, M.sopra); sc.setTransform(1, 0, 0, 1, 0, 0);
    // etichetta, poi luci e ombre del mockup ferme sopra (solo dove c'è etichetta), allungate dalla fascia del mockup alla nostra
    const et = scalata(lab, (t1 - t0) * s);
    const span = Math.min(2 * Math.PI, (et.width / et.height) * (t1 - t0) / Math.sqrt(1 - G.e * G.e) / G.r);
    const l = strato.getContext('2d')!, mf = forma.getContext('2d')!;
    l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, strato.width, strato.height);
    posa(l, avvolgi(dritto.etichetta, et, G.r, { span }), G.r, t0, strato.dx!, strato.dy!);
    mf.globalCompositeOperation = 'copy'; mf.drawImage(strato, 0, 0);
    const k = (t1 - t0) / (G.t1 - G.t0);
    l.setTransform(s, 0, 0, s, -strato.dx!, -strato.dy!);
    l.translate(G.cx, G.cy); l.rotate(G.ang); l.translate(0, t0 - k * G.t0); l.scale(1, k); l.rotate(-G.ang); l.translate(-G.cx, -G.cy);
    l.globalCompositeOperation = 'multiply'; l.drawImage(P.img['etichetta-ombre'], 0, 0, G.w, G.h);
    l.globalCompositeOperation = 'screen'; l.drawImage(P.img['etichetta-luci'], 0, 0, G.w, G.h);
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'destination-in'; l.drawImage(forma, 0, 0);
    sc.drawImage(strato, strato.dx!, strato.dy!);
    // la scena ritagliata sul vaso, in basso al centro: attorno si vede la carta col bordo
    sc.globalCompositeOperation = 'destination-in'; sc.drawImage(sagoma, 0, 0); sc.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(scena, sx, sy);
  }

  // --- movimento: un solo rAF, acceso solo quando qualcosa si muove e la cella è in vista; passo scalato sul tempo ---
  function muovi() { if (!raf && inVista && W) { ultimo = performance.now(); raf = requestAnimationFrame(avanza); } }
  function avanza(t: number) {
    const dt = Math.min(0.05, (t - ultimo) / 1000); ultimo = t;
    if (!presa) {
      if (Math.abs(vel) > 0.02) { giro += vel * dt; vel *= Math.exp(-2.5 * dt); }
      else { vel = 0; if (auto) giro += 0.35 * dt; }
    }
    if (!bordoFermo) dipingiBordo(t);
    disegna();
    raf = inVista && (presa || vel || auto || !bordoFermo) ? requestAnimationFrame(avanza) : 0;
  }

  const primo = await scarica(0).catch(() => null);
  if (!primo || signal.aborted) return;
  applica(0, primo);
  scriviParola();

  // gesti sul barattolo: trascinato lento gira; tocco o clic = il prossimo; swipe rapido di lato = prossimo o precedente
  const opz = { signal };
  let gesto: { x: number; y: number; t: number; giro: number } | null = null;
  cv.addEventListener('pointerdown', ev => {
    presa = { x: ev.clientX, y: ev.clientY, t: ev.timeStamp }; vel = 0;
    gesto = { x: ev.clientX, y: ev.clientY, t: ev.timeStamp, giro };
    cv.setPointerCapture(ev.pointerId); muovi(); programma(PAUSA_MS);
  }, opz);
  cv.addEventListener('pointermove', ev => {
    if (!presa) return;
    // il gesto lungo la circonferenza (perpendicolare all'asse inclinato): la superficie segue il dito al centro
    const R = G.r * s * cv.clientWidth / W;      // raggio in px CSS (s è in pixel reali)
    const d = ((ev.clientX - presa.x) * Math.cos(G.ang) + (ev.clientY - presa.y) * Math.sin(G.ang)) / R;
    const dt = Math.max(0.008, (ev.timeStamp - presa.t) / 1000);
    giro += d; vel = vel * 0.6 + (d / dt) * 0.4;
    presa = { x: ev.clientX, y: ev.clientY, t: ev.timeStamp };
  }, opz);
  const lascia = (ev: PointerEvent) => {
    if (!presa || !gesto) return;
    const dx = ev.clientX - gesto.x, dy = ev.clientY - gesto.y, durata = ev.timeStamp - gesto.t;
    const tocco = Math.hypot(dx, dy) < 6 && durata < 500;
    const swipe = durata < 300 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy);
    if (ev.type === 'pointerup' && (tocco || swipe)) {
      giro = gesto.giro; vel = 0; presa = gesto = null;     // lo swipe non fa girare: si torna dov'era
      sfoglia(tocco || dx < 0 ? 1 : -1);
      return;
    }
    if (ev.timeStamp - presa.t > 80) vel = 0;   // fermo prima di lasciare: niente lancio
    presa = gesto = null; muovi();
  };
  cv.addEventListener('pointerup', lascia, opz);
  cv.addEventListener('pointercancel', lascia, opz);

  // da soli: il prossimo ogni OGNI_MS, solo in vista, mai mentre c'è il mouse sopra, il fuoco dentro o un gesto in corso;
  // con riduci movimento no (il movimento automatico è proprio quello da evitare)
  let timer = 0, sopra = false, fuoco = false;
  function programma(ms = OGNI_MS) {
    clearTimeout(timer);
    if (reduced || n < 2) return;
    timer = window.setTimeout(() => {
      if (inVista && !presa && !sopra && !fuoco && !document.hidden) sfoglia(1, true);
      programma();
    }, ms);
  }
  root.addEventListener('pointerenter', ev => { if (ev.pointerType === 'mouse') sopra = true; }, opz);
  root.addEventListener('pointerleave', () => { sopra = false; }, opz);
  root.addEventListener('focusin', () => { fuoco = true; }, opz);
  root.addEventListener('focusout', () => { fuoco = false; }, opz);

  // sfoglia: il barattolo esce di lato e il prossimo entra (di colpo con riduci movimento); conta l'ultimo clic
  const nome = root.querySelector('[data-nome]'), conta = root.querySelector('[data-conta]');
  const due = (x: number) => String(x).padStart(2, '0');
  let turno = 0, voluto = 0;
  // la parola del barattolo in vista: maschera e colore del bordo (il colore passa da solo, con la transizione CSS)
  function scriviParola() {
    const src = voci[at].parola, c = bordo.a?.colore;
    if (src) parola.style.setProperty('--parola', `url("${src}")`);
    if (c) parola.style.setProperty('--parola-colore', `rgb(${c.join(' ')})`);
    parola.style.opacity = src && c ? '1' : '0';
    parola.classList.toggle('parola--destra', !!M.parolaDestra);
  }
  async function sfoglia(p: number, daSolo = false) {
    if (!daSolo) programma(PAUSA_MS);
    // il nome nuovo si annuncia solo se l'ha chiesto chi visita: ogni 4,5 s sarebbe un disturbo per lo screen reader
    nome?.setAttribute('aria-live', daSolo ? 'off' : 'polite');
    const mio = ++turno, verso = p > 0 ? -1 : 1, i = voluto = (voluto + p + n) % n;
    const pronto = scarica(i).catch(() => null);
    cv.getAnimations().forEach(a => a.cancel()); ombra.getAnimations().forEach(a => a.cancel()); parola.getAnimations().forEach(a => a.cancel());
    // l'uscita resta ferma alla fine (fill) finché il barattolo nuovo non è pronto, poi si toglie
    const fuori = reduced ? null : cv.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${verso * 30}%)`, opacity: 0 }], { duration: 200, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    // l'ombra non scivola: sparisce in fretta e torna col barattolo nuovo
    const via = reduced ? null : ombra.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out', fill: 'forwards' });
    // la parola esce solo se cambia (Confetture → Sughi); se è la stessa cambia solo colore
    const cambia = voci[i].parola !== voci[at].parola;
    const parolaVia = reduced || !cambia || !voci[at].parola ? null : parola.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out', fill: 'forwards' });
    const [cose] = await Promise.all([pronto, fuori?.finished.catch(() => {})]);
    if (mio !== turno || signal.aborted) return;
    if (cose) applica(i, cose);
    if (nome) nome.textContent = voci[at].nome;
    if (conta) conta.textContent = `${due(at + 1)}/${due(n)}`;
    cv.setAttribute('aria-label', `${voci[at].nome}: trascina per girare il barattolo`);
    prepara();
    muovi();
    if (cambia) parola.style.transition = 'none';     // parola nuova: già del suo colore quando rientra
    scriviParola();
    if (cambia) { parola.offsetWidth; parola.style.transition = ''; }
    fuori?.cancel(); via?.cancel(); parolaVia?.cancel();
    if (!reduced) cv.animate([{ transform: `translateX(${-verso * 30}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
    if (!reduced) ombra.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 60, easing: 'ease-out', fill: 'backwards' });
    if (!reduced && cambia && voci[at].parola) parola.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 60, easing: 'ease-out', fill: 'backwards' });
  }
  root.querySelectorAll<HTMLElement>('[data-passo]').forEach(b => b.addEventListener('click', () => sfoglia(+b.dataset.passo!), opz));

  // in vista: gira; fuori: fermo. Misura nuova al resize; colori nuovi con Inverti e con la tinta di Woberto
  const io = new IntersectionObserver(([e]) => { inVista = e.isIntersecting; if (inVista) muovi(); });
  io.observe(cv);
  const ro = new ResizeObserver(() => { prepara(); muovi(); });
  ro.observe(cv);
  const mo = new MutationObserver(() => requestAnimationFrame(prepara));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-inchiostro', 'data-tinta'] });
  programma();
  signal.addEventListener('abort', () => { io.disconnect(); ro.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); clearTimeout(timer); });
}
