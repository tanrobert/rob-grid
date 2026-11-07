/**
 * Cella `sfumatura` (Purple Piper: il rosso sopra, il viola sotto). Import dinamico da cells.ts, solo se la cella c'è.
 * La sfumatura ondeggia: su una tela piccola (un pixel ogni PASSO px, il browser la ingrandisce morbida) ogni punto
 * prende il colore della sua altezza, spostata da tre onde lente. Le onde valgono zero al centro dei due quadrati in alto
 * e in basso (dove ci sono nome e HEX) e sono più ampie a metà: sopra resta il primo colore, sotto il secondo.
 * I colori si mescolano in OKLab (fra rosso e viola niente grigio sporco), una volta sola in una scala di 256 tinte.
 * Il tempo corre solo in vista (passo scalato su dt, uguale a ogni frequenza dello schermo); con riduci movimento la
 * tela si disegna una volta, ferma.
 */

import { REDUCED } from './preferenze';

const PASSO = 6;        // px della cella per ogni pixel della tela
const ONDA = 0.06;      // ampiezza delle onde, in altezze della cella
const VELOCITA = 1;     // 1 = un'onda lenta (giro di circa 6 s); per farla più nervosa, di più

type Rgb = [number, number, number];

const lineare = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** #rrggbb → OKLab */
function oklab(hex: string): Rgb {
  const [r, g, b] = [1, 3, 5].map(i => lineare(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab → sRGB 0–255 */
function srgb([L, A, B]: Rgb): Rgb {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(c => Math.round(gamma(Math.min(1, Math.max(0, c))) * 255)) as Rgb;
}

/** 256 tinte dal primo colore al secondo */
function scala(da: string, a: string) {
  const [p, q] = [oklab(da), oklab(a)];
  const tinte = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    tinte.set(srgb([0, 1, 2].map(k => p[k] + (q[k] - p[k]) * t) as Rgb), i * 3);
  }
  return tinte;
}

export function initSfumature(signal: AbortSignal) {
  document.querySelectorAll<HTMLElement>('[data-sfumatura]').forEach(el => {
    const tela = el.querySelector('canvas');
    const ctx = tela?.getContext('2d');
    if (!tela || !ctx) return;
    const [sopra, sotto] = JSON.parse(el.dataset.sfumatura!) as [string, string];
    const tinte = scala(sopra, sotto);

    let w = 0, h = 0, alta = 1, a = 0, b = 1;   // tela in pixel, altezza in larghezze, centri dei due quadrati (0–1)
    let img: ImageData | null = null;
    let tempo = 0, prima = 0, raf = 0;

    function disegna() {
      if (!img) return;
      const px = img.data, s = tempo * VELOCITA, zona = b - a;
      for (let y = 0; y < h; y++) {
        const v = (y + 0.5) / h, Y = v * alta;
        // l'onda muore ai centri dei quadrati: lì il colore è quello scritto
        const inviluppo = v > a && v < b ? Math.sin((Math.PI * (v - a)) / zona) * ONDA : 0;
        for (let x = 0; x < w; x++) {
          const X = (x + 0.5) / w;
          const d = inviluppo * (
            Math.sin(5 * X + 1.7 * Y + s) +
            0.7 * Math.sin(10 * X - 2.6 * Y - 1.4 * s) +
            0.5 * Math.sin(1.1 * Y + 0.6 * s)
          ) / 2.2;
          let u = (v + d - a) / zona;
          u = u < 0 ? 0 : u > 1 ? 1 : u;
          const i = Math.round(u * u * (3 - 2 * u) * 255) * 3, o = (y * w + x) * 4;
          px[o] = tinte[i]; px[o + 1] = tinte[i + 1]; px[o + 2] = tinte[i + 2]; px[o + 3] = 255;
        }
      }
      ctx!.putImageData(img, 0, 0);
    }

    function misura() {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;   // foglio nascosto: si misura quando ricompare
      w = Math.max(2, Math.ceil(width / PASSO));
      h = Math.max(2, Math.ceil(height / PASSO));
      tela!.width = w; tela!.height = h;
      img = ctx!.createImageData(w, h);
      alta = height / width;
      a = Math.min(0.5, width / 2 / height);
      b = 1 - a;
      disegna();
    }

    function giro(ora: number) {
      tempo += Math.min(0.1, (ora - (prima || ora)) / 1000);
      prima = ora;
      disegna();
      raf = requestAnimationFrame(giro);
    }
    const ferma = () => { cancelAnimationFrame(raf); raf = 0; prima = 0; };

    const ro = new ResizeObserver(misura);
    ro.observe(el);
    // gira solo in vista
    const io = new IntersectionObserver(([e]) => {
      if (REDUCED) return;
      if (e.isIntersecting && !raf) raf = requestAnimationFrame(giro);
      else if (!e.isIntersecting) ferma();
    }, { rootMargin: '10%' });
    io.observe(el);
    signal.addEventListener('abort', () => { ro.disconnect(); io.disconnect(); ferma(); });
  });
}
