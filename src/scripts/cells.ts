/**
 * Comportamenti delle celle "vive". Si avvia al caricamento (Layout.astro) e riparte per ogni foglio montato
 * (scripts/foglio): i comportamenti vecchi si fermano (cleanup) e ripartono su tutto il documento.
 */

import { initArchive } from './archive';
import { initRighe } from './righe';
import { fitTitles, initTitoloni } from './titoloni';
import { initMosaico } from './mosaico';
import { pad2 } from '../lib/format';
import { REDUCED, FINE } from './preferenze';
import { giraDaSola } from './giro';

let cleanup: (() => void) | null = null;

// animazioni d'ingresso (global.css): finite quando il filo ha chiuso il giro, il contenuto è entrato e la carta è comparsa
const INTRO = ['frame-draw', 'fill-in', 'fade-in', 'carta-in', 'pezzo-atterra', 'ombra-compare'];
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

  const { signal } = ac;

  initArchive(signal);
  // globo: d3-geo e le terre si caricano solo se la cella c'è
  if (document.querySelector('[data-globe]')) {
    import('./globe').then(m => signal.aborted || m.initGlobe(signal));
  }
  // barattoli: lo script solo se la cella c'è (i livelli dei mockup quando si avvicina allo schermo)
  if (document.querySelector('[data-barattolo]')) {
    import('./barattolo').then(m => signal.aborted || m.initBarattoli(signal));
  }
  // sottologhi: il logo che si compone e le sue foto, solo se la cella c'è
  if (document.querySelector('[data-sottologo]')) {
    import('./sottologo').then(m => signal.aborted || m.initSottologhi(signal));
  }
  // la radio: un solo lettore per la pagina, solo se c'è una cella radio
  if (document.querySelector('[data-radio]')) {
    import('./radio').then(m => signal.aborted || m.initRadio(signal));
  }
  // foto che si ingrandiscono al clic, solo se ce ne sono
  if (document.querySelector('[data-ingrandisci]')) {
    import('./ingrandisci').then(m => signal.aborted || m.initIngrandisci(signal));
  }
  // costruzioni: il segno che si disegna da solo, solo se la cella c'è
  if (document.querySelector('[data-costruzione]')) {
    import('./costruzione').then(m => signal.aborted || m.initCostruzioni(signal));
  }
  // evoluzioni: il segno che cambia a passi, un clic alla volta, solo se la cella c'è
  if (document.querySelector('[data-evoluzione]')) {
    import('./evoluzione').then(m => signal.aborted || m.initEvoluzioni(signal));
  }
  // ridisegni: il marchio che cambia in un'animazione sola, solo se la cella c'è
  if (document.querySelector('[data-ridisegno]')) {
    import('./ridisegno').then(m => signal.aborted || m.initRidisegni(signal));
  }
  // disegni che si compongono da soli (firma, marchio dei 90 anni di G&A), solo se la cella c'è
  if (document.querySelector('[data-animato]')) {
    import('./animato').then(m => signal.aborted || m.initAnimati(signal));
  }
  // palette: i colori di prima e di dopo, un clic per passare dall'uno all'altro, solo se la cella c'è
  if (document.querySelector('[data-palette]')) {
    import('./palette').then(m => signal.aborted || m.initPalette(signal));
  }
  // sfumatura: due colori che sfumano ondeggiando, solo se la cella c'è
  if (document.querySelector('[data-sfumatura]')) {
    import('./sfumatura').then(m => signal.aborted || m.initSfumature(signal));
  }
  // copertine: il muro che si alterna (Caleidoscopio), solo se la cella c'è
  if (document.querySelector('[data-copertine]')) {
    import('./copertine').then(m => signal.aborted || m.initCopertine(signal));
  }
  // versioni del logo: una alla volta, le parti che vanno e vengono, un clic per la dopo, solo se la cella c'è
  if (document.querySelector('[data-versioni]')) {
    import('./versioni').then(m => signal.aborted || m.initVersioni(signal));
  }
  // icone degli obiettivi (cella punti): un'animazione col mouse sul riquadro, solo col mouse e senza riduci movimento
  if (FINE && !REDUCED && document.querySelector('svg[data-icona]')) {
    import('./punti').then(m => signal.aborted || m.initPunti(signal));
  }
  // Rob Display (pagina /rob-display): il marchio che si costruisce, le lettere sulla griglia (con l'atlante), la prova
  if (document.querySelector('[data-marchio]')) {
    import('./marchio').then(m => signal.aborted || m.initMarchi(signal));
  }
  if (document.querySelector('[data-glifo-cella]')) {
    import('./glifo').then(m => signal.aborted || m.initGlifi(signal));
  }
  if (document.querySelector('[data-prova]')) {
    import('./prova').then(m => signal.aborted || m.initProve(signal));
  }
  // collezioni: una alla volta, foto, velo e logo, un clic per la dopo, solo se la cella c'è
  if (document.querySelector('[data-collezioni]')) {
    import('./collezioni').then(m => signal.aborted || m.initCollezioni(signal));
  }
  // affissioni: col mouse il velo sulla strada è un hover (CSS). Con più affissioni la scena cambia ogni 7 s,
  // insieme al suo testo, ferma fuori vista e col mouse sulla foto; un clic (o un tocco) passa alla successiva.
  // Con una sola il tocco accende e spegne il velo
  document.querySelectorAll<HTMLElement>('[data-affissioni]').forEach(cella => {
    const foto = cella.querySelector<HTMLElement>('[data-affissione]')!;
    const scene = [...foto.querySelectorAll<HTMLElement>('.scena')];
    const testi = [...cella.querySelectorAll<HTMLElement>('.sotto')];
    if (scene.length < 2) {
      if (!FINE) foto.addEventListener('click', () => foto.classList.toggle('is-velo'), { signal });
      return;
    }
    foto.classList.add('is-sfogliabile');
    // initCells riparte (un foglio nuovo sopra): si riprende dalla scena dov'era
    let i = Math.max(0, scene.findIndex(s => s.classList.contains('is-attiva')));
    const avanti = () => {
      const prossima = (i + 1) % scene.length;
      // la nuova parte da trasparente anche se era la scena piena sotto: niente salto
      scene.forEach(s => s.classList.remove('is-prima'));
      void foto.offsetWidth;
      scene[i].classList.replace('is-attiva', 'is-prima');
      scene[prossima].classList.add('is-attiva');
      testi[i].classList.remove('is-attiva');
      testi[prossima].classList.add('is-attiva');
      i = prossima;
    };
    giraDaSola(foto, 7000, avanti, signal, { fermaSopra: true });
  });

  // caroselli delle celle di testo e media: gira sempre, da destra a sinistra, una foto ogni CAROSELLO ms (fermo solo
  // fuori vista e con una foto aperta in grande); un clic passa alla dopo, o la ingrandisce se le foto si ingrandiscono.
  // In fondo al nastro una copia della prima: arrivati lì si torna all'inizio senza transizione, così il giro non si
  // riavvolge all'indietro. Le foto fuori vista sono inert: il tasto Tab non ci arriva
  const CAROSELLO = 4000;
  document.querySelectorAll<HTMLElement>('[data-carosello]').forEach(car => {
    const nastro = car.firstElementChild as HTMLElement;
    const n = nastro.children.length;
    const copia = nastro.firstElementChild!.cloneNode(true) as HTMLElement;
    copia.setAttribute('aria-hidden', 'true');
    const img = copia.querySelector('img')!;
    img.alt = '';
    for (const a of ['data-ingrandisci', 'tabindex', 'role', 'aria-label']) img.removeAttribute(a);
    nastro.append(copia);
    const foto = [...nastro.children];
    let i = 0;
    const vai = (j: number, salto = false) => {
      nastro.classList.toggle('is-salto', salto);
      if (salto) void nastro.offsetWidth;
      nastro.style.setProperty('--foto', String(i = j));
      foto.forEach((f, k) => f.toggleAttribute('inert', k !== j));
      if (salto) { void nastro.offsetWidth; nastro.classList.remove('is-salto'); }
    };
    // initCells riparte (un foglio nuovo sopra): si riprende dalla foto dov'era
    const era = Number(nastro.style.getPropertyValue('--foto')) || 0;
    vai(era < n ? era : 0, true);
    const avanti = () => {
      if (document.querySelector('dialog.grande[open]')) return;   // una foto aperta in grande (scripts/ingrandisci)
      if (i === n) vai(0, true);  // la transizione verso la copia non è finita (scheda nascosta): riparto da capo
      vai(i + 1);
    };
    nastro.addEventListener('transitionend', e => { if (e.target === nastro && i === n) vai(0, true); }, { signal });
    giraDaSola(car, CAROSELLO, avanti, signal, { clic: !car.querySelector('[data-ingrandisci]') });
    teardown.push(() => copia.remove());
  });

  // Intro finita: tolgo la classe, così nessuna cella che ricompare
  // (filtri, cambio di breakpoint) rifà l'animazione d'ingresso
  const html = document.documentElement;
  const intro = html.classList.contains('is-intro');
  // titoloni: misurati col font vero, prima che le righe dell'intro ne leggano gli a capo
  initTitoloni(signal);
  document.fonts.ready.then(() => {
    if (signal.aborted) return;
    // celle allungate dove il testo non ci sta (col font vero), prima dei titoloni e delle righe dell'intro
    initMosaico(signal);
    fitTitles();
    if (intro) initRighe(signal);
  });
  if (intro) {
    // la durata del filo dipende dal perimetro di ogni cella: aspetto la fine delle animazioni vere
    introDone().then(() => { if (!signal.aborted) html.classList.remove('is-intro'); });
  }

  // ── Pausa fuori schermo (loop CSS + video) ─────────────
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const el = e.target as HTMLElement;
      el.toggleAttribute('data-offscreen', !e.isIntersecting);
      const video = el.querySelector<HTMLVideoElement>('video[data-autoplay]');
      if (!video || REDUCED) continue;
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
  const rings = [...document.querySelectorAll<SVGGElement>('[data-ring]')];
  if (rings.length && !REDUCED) {
    let frame = 0;
    let tick = 25;
    const measure = () => { tick = (parseFloat(getComputedStyle(document.body).getPropertyValue('--ruler-step')) || 100) / 4; };
    const turn = () => {
      frame = 0;
      const gradi = (-scrollY / tick) * 5;
      for (const r of rings) if (!r.closest('[data-offscreen]')) r.style.transform = `rotate(${gradi}deg)`;
    };
    addEventListener('scroll', () => { frame ||= requestAnimationFrame(turn); }, { passive: true, signal });
    addEventListener('resize', () => { measure(); frame ||= requestAnimationFrame(turn); }, { passive: true, signal });
    teardown.push(() => cancelAnimationFrame(frame));
    measure();
    turn();
  }

  // ── Contatore: sale da 0 al valore quando la cella è entrata in vista ─
  // Nell'HTML c'è già il numero finale (crawler, niente JS, riduci movimento).
  // Una volta sola per visita: tornando sulla pagina il numero resta quello finale.
  if (!REDUCED) document.querySelectorAll<HTMLElement>('[data-countup]').forEach(el => {
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
    // ripartendo (foglio nuovo) il numero torna quello finale: fermo a metà, o a 0 se non era ancora in vista
    teardown.push(() => { io.disconnect(); cancelAnimationFrame(raf); el.textContent = text; });
  });

  // ── Occhio: iride e pupilla seguono il puntatore ───────
  document.querySelectorAll<SVGSVGElement>('svg[data-eye]').forEach(svg => {
    const iris = svg.querySelector<SVGGElement>('[data-iris]')!;
    const pupil = svg.querySelector<SVGGElement>('[data-pupil]')!;
    // escursione massima (unità del viewBox 100×100): la mandorla è più larga che alta
    const IRIS = { x: 14, y: 6 }, PUPIL = { x: 4, y: 3 };

    // clic sulla cella: l'occhio si chiude e si riapre lentamente, poi torna al battito normale
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
      const k = REDUCED ? 1 : 1 - (1 - 0.18) ** (dt * 60 / 1000);
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
      const u = parseFloat(cs.gridTemplateColumns);  // un modulo (le righe sono quadretti)
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
