/**
 * Suoni del tavolo: solo dove c'è un gesto (presa, ricaduta, foglio, inverti), mai su hover o scroll.
 * Sintetizzati con Web Audio (rumore filtrato e oscillatori), nessun file: le 4 varianti scelte nel laboratorio
 * tools/pages/suoni.html. Ogni colpo varia un poco tono e volume, così non suona mai uguale.
 * Spento di base: lo accende l'icona nella barra del tavolo (Tavolo.astro), scelta in localStorage.
 */

export type Momento = 'presa' | 'ricaduta' | 'foglio' | 'inverti';

const KEY = 'suono';
/** volume generale (60 nel laboratorio, al quadrato) e di ogni momento (70) */
const MASTER = 0.6 ** 2, VOL = 0.7 ** 2;

let acceso = false;
try { acceso = localStorage.getItem(KEY) === 'si'; } catch {}

let ctx: AudioContext | undefined, out: GainNode, rumore: AudioBuffer;

/** L'audio nasce al primo suono, quindi sempre dentro un gesto (i browser lo richiedono) */
function avvia() {
  if (ctx) { if (ctx.state !== 'running') ctx.resume(); return ctx; }
  ctx = new AudioContext();
  out = ctx.createGain();
  out.gain.value = MASTER;
  out.connect(ctx.destination);
  // un secondo di rumore bianco, riusato da tutti i suoni
  rumore = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = rumore.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/** variazione casuale ±f */
const vari = (f: number) => 1 + (Math.random() * 2 - 1) * f;

/** inviluppo: sale in a secondi, scende in d, dal tempo t */
function inv(g: GainNode, t: number, picco: number, a: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(picco, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

interface Colpo { t: number; dest: AudioNode; picco?: number; a?: number; d?: number; f?: number; f2?: number }

/** colpo di rumore filtrato */
function soffio(c: AudioContext, { t, dest, tipo = 'bandpass', f = 2000, f2, Q = 1, picco = 0.3, a = 0.004, d = 0.08 }: Colpo & { tipo?: BiquadFilterType; Q?: number }) {
  const s = c.createBufferSource(); s.buffer = rumore;
  s.playbackRate.value = vari(0.1);
  const fl = c.createBiquadFilter(); fl.type = tipo; fl.Q.value = Q;
  fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  const g = c.createGain(); inv(g, t, picco, a, d);
  s.connect(fl).connect(g).connect(dest);
  s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.02);
}

/** colpo di oscillatore, con caduta di tono da f a f2 */
function tono(c: AudioContext, { t, dest, forma = 'sine', f = 200, f2, picco = 0.3, a = 0.002, d = 0.06 }: Colpo & { forma?: OscillatorType }) {
  const o = c.createOscillator(); o.type = forma;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  const g = c.createGain(); inv(g, t, picco, a, d);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + a + d + 0.02);
}

/** le ricette: p = tono (moltiplica le frequenze), k = intensità 0..1, chiude = il foglio esce */
const RICETTE: Record<Momento, (c: AudioContext, t: number, p: number, dest: AudioNode, k: number, chiude: boolean) => void> = {
  // Fruscio: la cella si solleva
  presa: (c, t, p, dest) => soffio(c, { t, dest, f: 3200 * p, Q: 0.8, picco: 0.35, a: 0.006, d: 0.09 }),
  // Carta: la cella si posa, più forte se lanciata
  ricaduta: (c, t, p, dest, k) => {
    const forza = 0.4 + 0.6 * k;
    soffio(c, { t, dest, f: 1300 * p, Q: 1.2, picco: 0.35 * forza, a: 0.003, d: 0.07 });
    tono(c, { t, dest, f: 220 * p, f2: 120 * p, picco: 0.18 * forza, d: 0.05 });
  },
  // Solleva: il tono sale aprendo, scende chiudendo
  foglio: (c, t, p, dest, _k, chiude) => {
    const [f, f2] = chiude ? [3000, 600] : [600, 3000];
    soffio(c, { t, dest, f: f * p, f2: f2 * p, Q: 0.7, picco: 0.22, a: 0.12, d: 0.2 });
  },
  // Interruttore: scatto e ritorno della levetta
  inverti: (c, t, p, dest) => {
    tono(c, { t, dest, forma: 'square', f: 2400 * p, picco: 0.05, d: 0.006 });
    soffio(c, { t, dest, tipo: 'highpass', f: 4000 * p, picco: 0.2, a: 0.001, d: 0.012 });
    soffio(c, { t: t + 0.045, dest, tipo: 'bandpass', f: 1800 * p, Q: 2, picco: 0.12, a: 0.001, d: 0.015 });
  },
};

/** Suona un momento, se il suono è acceso */
export function suona(id: Momento, k = 0.6, chiude = false) {
  if (!acceso) return;
  const c = avvia();
  const g = c.createGain(); g.gain.value = VOL * vari(0.15); g.connect(out);
  RICETTE[id](c, c.currentTime + 0.005, vari(0.06), g, k, chiude);
}

/** L'icona della barra del tavolo: accende e spegne, acceso suona subito l'interruttore come conferma */
export function initSuono(signal: AbortSignal) {
  const btn = document.querySelector<HTMLButtonElement>('[data-suono]');
  if (!btn) return;
  const sync = () => {
    btn.setAttribute('aria-pressed', String(acceso));
    btn.title = acceso ? 'Spegni il suono' : 'Accendi il suono';
  };
  sync();
  btn.addEventListener('click', () => {
    acceso = !acceso;
    try { localStorage.setItem(KEY, acceso ? 'si' : 'no'); } catch {}
    sync();
    suona('inverti');
  }, { signal });
}
