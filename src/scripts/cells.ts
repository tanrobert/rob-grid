/**
 * Comportamenti delle celle "vive", del tavolo e del foglio. Si avvia una volta per pagina (Layout.astro).
 */

import { initArchive } from './archive';
import { initInk } from './ink';
import { initRighe } from './righe';
import { fitTitles, initTitoloni } from './titoloni';
import { pad2 } from '../lib/format';
import type { VistaEvento } from './tavolo/vista';

let cleanup: (() => void) | null = null;

// animazioni d'ingresso (global.css): finite quando il filo ha chiuso il giro, il contenuto è entrato e i crocini sono comparsi
const INTRO = ['frame-draw', 'fill-in', 'fade-in', 'crocini-in'];
function introDone(cell?: Element) {
  const anims = (cell ? cell.getAnimations({ subtree: true }) : document.getAnimations())
    .filter(a => a instanceof CSSAnimation && INTRO.includes(a.animationName));
  return Promise.allSettled(anims.map(a => a.finished));
}
// contatori già animati (per data-id della cella), per tutta la visita: ogni pagina è un caricamento nuovo
const CONTATI = 'contati';
const counted = {
  all(): string[] { try { return JSON.parse(sessionStorage.getItem(CONTATI) ?? '[]'); } catch { return []; } },
  has(key: string) { return this.all().includes(key); },
  add(key: string) { try { sessionStorage.setItem(CONTATI, JSON.stringify([...new Set([...this.all(), key])])); } catch {} },
};

export function initCells() {
  cleanup?.();
  const ac = new AbortController();
  const teardown: Array<() => void> = [() => ac.abort()];
  cleanup = () => { teardown.forEach(fn => fn()); cleanup = null; };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { signal } = ac;

  initArchive(signal);
  initInk(signal, reduced);
  // globo: d3-geo e le terre si caricano solo se la casella c'è
  if (document.querySelector('[data-globe]')) {
    import('./globe').then(m => signal.aborted || m.initGlobe(signal, reduced));
  }

  // Intro finita: tolgo la classe, così nessuna casella che ricompare
  // (filtri, cambio di breakpoint) rifà l'animazione d'ingresso
  const html = document.documentElement;
  const intro = html.classList.contains('is-intro');
  // titoloni: misurati col font vero, prima che le righe dell'intro ne leggano gli a capo
  initTitoloni(signal, reduced);
  document.fonts.ready.then(() => {
    if (signal.aborted) return;
    fitTitles();
    if (intro) initRighe(signal);
  });
  if (intro) {
    // la durata del filo dipende dal perimetro di ogni cella: aspetto la fine delle animazioni vere
    let live = true;
    introDone().then(() => { if (live) html.classList.remove('is-intro'); });
    teardown.push(() => { live = false; });
  }

  // ── Pausa fuori schermo (loop CSS + video) ─────────────
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const el = e.target as HTMLElement;
      el.toggleAttribute('data-offscreen', !e.isIntersecting);
      const video = el.querySelector<HTMLVideoElement>('video[data-autoplay]');
      if (!video || reduced) continue;
      if (e.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }
  }, { rootMargin: '10%' });  // anche di lato: sul tavolo le celle escono a destra e a sinistra
  document.querySelectorAll('.cell').forEach(el => io.observe(el));
  teardown.push(() => io.disconnect());

  // ── Orologio ───────────────────────────────────────────
  document.querySelectorAll<HTMLElement>('[data-clock]').forEach(el => {
    const tz = el.dataset.tz ?? 'Europe/Rome';
    const hm = el.querySelector('[data-hm]')!;
    const s = el.querySelector('[data-s]')!;
    const date = el.querySelector('[data-date]')!;
    const fmt = new Intl.DateTimeFormat('it-IT', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit',
      year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23',
    });
    // scrive solo se il testo cambia: la data sta in una regione aria-live
    const put = (node: Element, text: string) => { if (node.textContent !== text) node.textContent = text; };
    const tick = () => {
      const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]));
      put(hm, `${p.hour}:${p.minute}`);
      put(s, p.second);
      put(date, `${p.year}.${p.month}.${p.day}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    teardown.push(() => clearInterval(id));
  });

  // ── Meteo ──────────────────────────────────────────────
  document.querySelectorAll<HTMLElement>('[data-weather]').forEach(el => {
    const clock = el.closest<HTMLElement>('[data-clock]');
    const tz = clock?.dataset.tz ?? 'Europe/Rome';
    loadWeather(Number(el.dataset.lat), Number(el.dataset.lon), tz, signal).then(w => {
      if (!w || signal.aborted) return;
      const [key, label] = weatherIcon(w.code, w.isDay);
      el.querySelector(`[data-w="${key}"]`)?.classList.add('on');
      el.querySelector('[data-icon]')?.setAttribute('aria-label', `Meteo a ${el.dataset.place}: ${label}, ${w.temp}°`);
      const temp = clock?.querySelector('[data-temp]');
      if (temp) temp.textContent = `${w.temp}°`;
    });
  });

  // ── Registro: la ghiera gira con lo scroll, in sincrono col righello ─
  // un quarto di riga della griglia = una tacca (5°), come il righello (--ruler-step in global.css).
  // Scorrendo in giù le tacche a destra salgono, come quelle del righello.
  // Sul tavolo gira col pan (scripts/tavolo/vista.ts): un quadretto = una tacca (il modulo è 4 quadretti);
  // nel foglio sopra il tavolo con lo scroll
  const rings = [...document.querySelectorAll<SVGGElement>('[data-ring]')];
  if (rings.length && !reduced) {
    let frame = 0;
    let tick = 25;
    let tavolo: VistaEvento | null = null;
    const measure = () => { tick = (parseFloat(getComputedStyle(document.body).getPropertyValue('--ruler-step')) || 100) / 4; };
    const turn = () => {
      frame = 0;
      const pan = tavolo ? (tavolo.y / tavolo.q) * 5 : 0, scroll = (-scrollY / tick) * 5;
      for (const r of rings) {
        if (r.closest('[data-offscreen]')) continue;
        r.style.transform = `rotate(${r.closest('[data-tavolo]') ? pan : scroll}deg)`;
      }
    };
    addEventListener('scroll', () => { frame ||= requestAnimationFrame(turn); }, { passive: true, signal });
    document.addEventListener('tavolo:vista', e => { tavolo = (e as CustomEvent<VistaEvento>).detail; frame ||= requestAnimationFrame(turn); }, { signal });
    addEventListener('resize', () => { measure(); frame ||= requestAnimationFrame(turn); }, { passive: true, signal });
    teardown.push(() => cancelAnimationFrame(frame));
    measure();
    turn();
  }

  // ── Contatore: sale da 0 al valore quando la cella è entrata in vista ─
  // Nell'HTML c'è già il numero finale (crawler, niente JS, riduci movimento).
  // Una volta sola per visita: tornando sulla pagina il numero resta quello finale.
  if (!reduced) document.querySelectorAll<HTMLElement>('[data-countup]').forEach(el => {
    const text = el.textContent?.trim() ?? '';
    const target = Number(text);
    if (!text || !Number.isFinite(target)) return;
    const key = el.closest<HTMLElement>('[data-id]')?.dataset.id ?? text;
    if (counted.has(key)) return;
    const show = (n: number) => { el.textContent = String(n).padStart(text.length, '0'); };
    // stessa curva per tutti, durata proporzionale al valore (come il filo dell'intro): i numeri piccoli finiscono prima
    const DURATION = target * 90;
    let raf = 0;
    show(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      counted.add(key);
      let t0 = 0;
      const step = (t: number) => {
        t0 ||= t; // il cronometro parte dal primo fotogramma
        const k = Math.min(1, (t - t0) / DURATION);
        // il numero n arriva al tempo (n/target)³: ogni scatto dura più del precedente, il valore finale
        // solo alla fine (con round + ease-out i numeri piccoli arrivavano a metà e poi restavano fermi)
        show(Math.floor(target * Math.cbrt(k)));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      // parte quando la cella ha finito di entrare (nell'intro, dopo filo e contenuto)
      introDone(el.closest('.cell') ?? el).then(() => { if (!signal.aborted) raf = requestAnimationFrame(step); });
    });
    io.observe(el);
    teardown.push(() => { io.disconnect(); cancelAnimationFrame(raf); });
  });

  // ── Occhio: iride e pupilla seguono il puntatore ───────
  document.querySelectorAll<SVGSVGElement>('svg[data-eye]').forEach(svg => {
    const iris = svg.querySelector<SVGGElement>('[data-iris]')!;
    const pupil = svg.querySelector<SVGGElement>('[data-pupil]')!;
    // escursione massima (unità del viewBox 100×100): la mandorla è più larga che alta
    const IRIS = { x: 14, y: 6 }, PUPIL = { x: 4, y: 3 };

    // clic sulla casella: l'occhio si chiude e si riapre lentamente, poi torna al battito normale
    const lid = svg.querySelector<SVGGElement>('[data-lid]')!;
    svg.closest('.cell')?.addEventListener('click', () => {
      // già chiuso: resta chiuso, l'animazione non riparte
      lid.classList.add('is-shut');
    }, { signal });
    lid.addEventListener('animationend', e => {
      if (e.animationName.includes('eye-shut')) lid.classList.remove('is-shut');
    }, { signal });
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, last = 0;

    const frame = (now: number) => {
      // inseguimento morbido, 18% della distanza ogni 60esimo di secondo: a 120Hz due passi più corti,
      // stessa velocità. Con "riduci movimento" va dritto al bersaglio
      const dt = last ? Math.min(now - last, 100) : 1000 / 60;
      last = now;
      const k = reduced ? 1 : 1 - (1 - 0.18) ** (dt * 60 / 1000);
      x += (tx - x) * k; y += (ty - y) * k;
      iris.setAttribute('transform', `translate(${(x * IRIS.x).toFixed(2)} ${(y * IRIS.y).toFixed(2)})`);
      pupil.setAttribute('transform', `translate(${(x * PUPIL.x).toFixed(2)} ${(y * PUPIL.y).toFixed(2)})`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(frame) : 0;
      if (!raf) last = 0;
    };

    addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      // direzione verso il cursore; l'intensità cresce con la distanza fino a ~mezzo viewport
      const d = Math.hypot(dx, dy) || 1;
      const f = Math.min(1, d / (Math.min(innerWidth, innerHeight) * 0.5));
      tx = (dx / d) * f; ty = (dy / d) * f;
      if (!raf) raf = requestAnimationFrame(frame);
    }, { signal, passive: true });
    teardown.push(() => cancelAnimationFrame(raf));
  });

  // ── Misure della griglia ───────────────────────────────
  // la griglia in cui sta la cella (nella pila dei fogli ce ne possono essere più d'una)
  const meter = document.querySelector<HTMLElement>('[data-meter]');
  const grid = meter?.closest<HTMLElement>('.grid');
  if (grid && meter) {
    const set = (k: string, v: string) => { const dd = meter.querySelector(`[data-key="${k}"]`); if (dd) dd.textContent = v; };
    const measure = () => {
      const cs = getComputedStyle(grid);
      const cols = cs.gridTemplateColumns.split(' ').length;
      const u = parseFloat(cs.gridAutoRows);
      set('cols', pad2(cols));
      set('u', `${u.toFixed(1)}px`);
      set('gap', cs.columnGap);
      set('vw', `${innerWidth}×${innerHeight}`);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    teardown.push(() => ro.disconnect());
  }

  // ── Cursore ────────────────────────────────────────────
  const cursor = document.querySelector<HTMLElement>('[data-cursor]');
  if (cursor) {
    const frame = cursor.querySelector<HTMLElement>('[data-frame]')!;
    const dot = cursor.querySelector<HTMLElement>('[data-dot]')!;
    const ax = cursor.querySelector<HTMLElement>('[data-ax]')!;
    const ay = cursor.querySelector<HTMLElement>('[data-ay]')!;
    const xEl = cursor.querySelector('[data-x]')!;
    const yEl = cursor.querySelector('[data-y]')!;
    let x = innerWidth / 2, y = innerHeight / 2, raf = 0;

    const render = () => {
      raf = 0;
      const fx = x / innerWidth, fy = y / innerHeight;
      const w = frame.clientWidth, h = frame.clientHeight;
      dot.style.transform = `translate(${fx * w}px, ${fy * h}px)`;
      ax.style.transform = `translateX(${fx * w}px)`;
      ay.style.transform = `translateY(${fy * h}px)`;
      xEl.textContent = String(Math.round(x)).padStart(4, '0');
      yEl.textContent = String(Math.round(y)).padStart(4, '0');
    };
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(render);
    }, { signal, passive: true });
    render();
    teardown.push(() => cancelAnimationFrame(raf));
  }
}

// ── Meteo: Open-Meteo, cache 15 minuti in sessionStorage ─
interface Weather { code: number; isDay: boolean; temp: number }
const WEATHER_TTL = 15 * 60 * 1000;

async function loadWeather(lat: number, lon: number, tz: string, signal: AbortSignal): Promise<Weather | null> {
  const key = `meteo:${lat},${lon}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (cached && Date.now() - cached.t < WEATHER_TTL) return cached.w;
  } catch {}
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=${encodeURIComponent(tz)}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const { current: c } = await res.json();
    const w: Weather = { code: c.weather_code, isDay: c.is_day === 1, temp: Math.round(c.temperature_2m) };
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), w })); } catch {}
    return w;
  } catch {
    return null;
  }
}

/** Codici WMO → icona + etichetta leggibile */
function weatherIcon(code: number, isDay: boolean): [string, string] {
  if (code <= 1) return isDay ? ['sun', 'sereno'] : ['moon', 'sereno'];
  if (code === 2) return isDay ? ['partly', 'poco nuvoloso'] : ['cloud', 'poco nuvoloso'];
  if (code === 3) return ['cloud', 'nuvoloso'];
  if (code === 45 || code === 48) return ['fog', 'nebbia'];
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['snow', 'neve'];
  if (code >= 95) return ['storm', 'temporale'];
  return ['rain', 'pioggia'];
}
