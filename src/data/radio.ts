/**
 * La radio della cella `radio` (components/cells/RadioCell.astro, scripts/radio.ts): Purple Piper, dal 2/11/2026.
 * `stato` è il nostro indirizzo per lo stato del server Shoutcast (brano in onda, prossimo, in onda o no): lo gira
 * Vercel (rewrites in vercel.json), in `npm run dev` il proxy di astro.config.mjs. Stream e stato sono gli stessi del
 * sito purplepiper.eu (purplepiper-astro: RadioPlayer.astro, nowplaying.php).
 */
export const radio = {
  nome: 'Purple Piper',
  stream: 'https://s2.shoutitaly.com/radio/8030/;',
  stato: '/radio/stato',
  /** il blocco della cella: il viola del logo, il rosso del logo mentre suona */
  colore: '#543962',
  inOnda: '#a90009',
};
