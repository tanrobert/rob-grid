// Dati del sito in un posto solo: footer, contatti, titoli delle pagine
export const site = {
  name: 'Roberto Tanasi',
  email: 'info@robertotanasi.it',
  piva: '03362040598',
  place: 'Itri (LT), Italia',
};

/** Titolo della scheda: "Pagina · Roberto Tanasi" */
export const pageTitle = (page: string) => `${page} · ${site.name}`;

/** Titolo della home: anche quello che torna chiudendo un foglio (scripts/foglio) */
export const homeTitle = `${site.name} · Graphic designer`;
