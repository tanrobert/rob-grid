/**
 * Comportamenti delle celle "vive". Si reinizializza a ogni astro:page-load
 * e ripulisce tutto (listener, timer, observer) prima dello swap di pagina.
 */

import { initArchive } from './archive';

let cleanup: (() => void) | null = null;

export function initCells() {
  cleanup?.();
  const ac = new AbortController();
  const teardown: Array<() => void> = [() => ac.abort()];
  cleanup = () => { teardown.forEach(fn => fn()); cleanup = null; };
  document.addEventListener('astro:before-swap', () => cleanup?.(), { once: true });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { signal } = ac;

  initArchive(signal);

  // Intro finita: tolgo la classe, così nessuna casella che ricompare
  // (filtri, cambio di breakpoint) rifà l'animazione d'ingresso
  const html = document.documentElement;
  if (html.classList.contains('is-intro')) {
    const cellsN = document.querySelectorAll('.cell').length;
    const id = setTimeout(() => html.classList.remove('is-intro'), cellsN * 30 + 1000);
    teardown.push(() => clearTimeout(id));
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
  }, { rootMargin: '10% 0px' });
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
    const tick = () => {
      const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]));
      hm.textContent = `${p.hour}:${p.minute}`;
      s.textContent = p.second;
      date.textContent = `${p.year}.${p.month}.${p.day}`;
    };
    tick();
    const id = setInterval(tick, 1000);
    teardown.push(() => clearInterval(id));
  });

  // ── Meteo ──────────────────────────────────────────────
  document.querySelectorAll<HTMLElement>('[data-weather]').forEach(el => {
    loadWeather(Number(el.dataset.lat), Number(el.dataset.lon), signal).then(w => {
      if (!w || signal.aborted) return;
      const [key, label] = weatherIcon(w.code, w.isDay);
      el.querySelector(`[data-w="${key}"]`)?.classList.add('on');
      el.querySelector('[data-icon]')?.setAttribute('aria-label', `Meteo a Itri: ${label}, ${w.temp}°`);
      const temp = el.closest('.clock')?.querySelector('[data-temp]');
      if (temp) temp.textContent = `${w.temp}°`;
    });
  });

  // ── Misure della griglia ───────────────────────────────
  const grid = document.querySelector<HTMLElement>('.grid');
  const meter = document.querySelector<HTMLElement>('[data-meter]');
  if (grid && meter) {
    const set = (k: string, v: string) => { const dd = meter.querySelector(`[data-key="${k}"]`); if (dd) dd.textContent = v; };
    const measure = () => {
      const cs = getComputedStyle(grid);
      const cols = cs.gridTemplateColumns.split(' ').length;
      const u = parseFloat(cs.gridAutoRows);
      set('cols', String(cols).padStart(2, '0'));
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

async function loadWeather(lat: number, lon: number, signal: AbortSignal): Promise<Weather | null> {
  const key = `meteo:${lat},${lon}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (cached && Date.now() - cached.t < WEATHER_TTL) return cached.w;
  } catch {}
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=Europe%2FRome`;
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
