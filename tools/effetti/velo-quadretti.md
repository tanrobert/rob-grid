# Velo a quadretti (accantonato, ottobre 2026)

Effetto hover delle celle progetto fino alla versione 1.4.95: velo rosso semitrasparente sulle foto che, al passaggio del mouse, sparisce a quadretti (mezzo passo della griglia, in fase con la carta dei vuoti e coi crocini), a giri dal centro della cella, in 4 gruppi sfalsati in ordine casuale a ogni ingresso. Tolto quando le foto sono passate a piena opacità senza velo. Tenuto per usi futuri.

Per rimetterlo: il CSS va in `src/styles/global.css` (sezione Media), i 4 span e lo script in `src/components/cells/MediaCell.astro` dentro `.duo`. Il commit completo è `1.4.95` (`git show 4d1679b:src/styles/global.css`).

Note: niente filter né mix-blend-mode (scroll scattoso su mobile); a riposo il velo è intero (`.duo::after`) per non mostrare le giunture tra i 4 strati a zoom non interi.

## CSS (global.css)

```css
/* ── Media: foto con velo rosso ───────────────────────── */
/* Un solo velo semitrasparente, niente filtri né blend mode: su mobile filtro + due veli in
   multiply/screen per ogni foto rendevano lo scroll scattoso. Gli effetti vanno nelle immagini. */
/* Velo a quadretti: il velo rosso tagliato da una maschera a quadretti di mezzo passo, in fase con la carta dei
   vuoti e coi crocini, attaccati l'uno all'altro (senza linee in mezzo). In hover i quadretti
   spariscono a giri dal centro della cella, che cade sempre su un incrocio della carta, ma "in disordine":
   ogni quadretto sta in uno di 4 gruppi (motivo casuale di 7×5 quadretti che si ripete, data URI sotto) e
   i gruppi partono a mezzo giro l'uno dall'altro, in un ordine (--turno-0…3) che MediaCell.astro rimescola a
   ogni ingresso del mouse nella cella: 24 combinazioni. Un gruppo = uno strato (.velo--0…3 in MediaCell.astro):
   i quadretti dei gruppi non si sovrappongono, quindi gli strati insieme fanno un velo solo.
   Per ogni strato, --scopri = giri scoperti (0 → oltre i bordi). Maschera (strati dall'alto, composti dal
   basso): gruppo ∩ NON(giri scoperti); giri scoperti = quadrato dei giri
   finiti (pieno) sopra il quadrato col giro in corso (alfa = quanto ne è passato).
   A riposo il velo è intero (.duo::after): appena --scopri parte da 0 lascia il posto ai quadretti (stesso colore
   e opacità, a vista non cambia nulla) e torna quando --scopri è di nuovo 0. Così fermo non mostra mai le giunture
   tra i 4 strati (a zoom non interi i bordi dei quadretti sfumano). --rotto = 0 intero, 1 a quadretti. --scopri sta su .duo ed è ereditata: la leggono il velo intero e i 4 strati. */
@property --scopri { syntax: '<number>'; inherits: true; initial-value: 0; }
.duo {
  --velo: 0.35;  /* opacità del velo rosso */
  position: absolute; inset: 0; background: var(--bianco);
  --rotto: clamp(0, var(--scopri) * 1e6, 1);
  /* giri per arrivare ai bordi: il lato lungo in unità (= mezzi lati in quadretti) + 1, più i ritardi dei
     gruppi. Velocità costante: la durata cresce coi giri */
  --giri: calc(max(var(--cw), var(--ch)) + 1 + 3 * 0.5);
  transition: --scopri calc(var(--giri) * 80ms) cubic-bezier(0.4, 0, 0.2, 1);
}
.duo img, .duo video { width: 100%; height: 100%; object-fit: cover; }
.duo::after, .velo {
  content: '';
  position: absolute; inset: 0;
  background: var(--inchiostro);
  pointer-events: none;
}
.duo::after { opacity: calc(var(--velo) * (1 - var(--rotto))); }
.velo {
  opacity: calc(var(--velo) * var(--rotto));
  /* quadretto = mezzo passo, ricavato dalla cella (qui --step non vale: la cella è un container) */
  --t: calc((100cqw + var(--gap)) / (2 * var(--cw)));
  --s: max(0, var(--scopri) - var(--ritardo));     /* giri scoperti di questo gruppo (mai sotto 0) */
  --f: round(down, var(--s), 1);                   /* giri finiti */
  --p: calc(var(--s) - var(--f));                  /* giro in corso, 0–1 */
  --pieno: linear-gradient(#000, #000);
  mask-image:
    var(--gruppo),
    var(--pieno),
    var(--pieno),
    linear-gradient(rgb(0 0 0 / var(--p)), rgb(0 0 0 / var(--p)));
  mask-size:
    calc(7 * var(--t)) calc(5 * var(--t)), 100% 100%,
    calc(var(--f) * 2 * var(--t)) calc(var(--f) * 2 * var(--t)),
    calc((var(--f) + 1) * 2 * var(--t)) calc((var(--f) + 1) * 2 * var(--t));
  mask-position: calc((var(--gap) / -2)) calc((var(--gap) / -2)), 0 0, center, center;
  mask-repeat: repeat, no-repeat, no-repeat, no-repeat;
  mask-composite: intersect, exclude, add, add;
}
.velo--0 { --ritardo: calc(var(--turno-0, 0) * 0.5); --gruppo: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 7 5' preserveAspectRatio='none' shape-rendering='crispEdges'%3E%3Crect x='3' y='0' width='1' height='1'/%3E%3Crect x='5' y='0' width='1' height='1'/%3E%3Crect x='1' y='1' width='1' height='1'/%3E%3Crect x='6' y='1' width='1' height='1'/%3E%3Crect x='1' y='2' width='1' height='1'/%3E%3Crect x='3' y='2' width='1' height='1'/%3E%3Crect x='3' y='3' width='1' height='1'/%3E%3Crect x='1' y='4' width='1' height='1'/%3E%3Crect x='5' y='4' width='1' height='1'/%3E%3C/svg%3E"); }
.velo--1 { --ritardo: calc(var(--turno-1, 1) * 0.5); --gruppo: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 7 5' preserveAspectRatio='none' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1'/%3E%3Crect x='1' y='0' width='1' height='1'/%3E%3Crect x='3' y='1' width='1' height='1'/%3E%3Crect x='5' y='1' width='1' height='1'/%3E%3Crect x='0' y='2' width='1' height='1'/%3E%3Crect x='5' y='2' width='1' height='1'/%3E%3Crect x='1' y='3' width='1' height='1'/%3E%3Crect x='4' y='3' width='1' height='1'/%3E%3Crect x='2' y='4' width='1' height='1'/%3E%3C/svg%3E"); }
.velo--2 { --ritardo: calc(var(--turno-2, 2) * 0.5); --gruppo: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 7 5' preserveAspectRatio='none' shape-rendering='crispEdges'%3E%3Crect x='6' y='0' width='1' height='1'/%3E%3Crect x='0' y='1' width='1' height='1'/%3E%3Crect x='2' y='1' width='1' height='1'/%3E%3Crect x='4' y='1' width='1' height='1'/%3E%3Crect x='2' y='3' width='1' height='1'/%3E%3Crect x='5' y='3' width='1' height='1'/%3E%3Crect x='6' y='3' width='1' height='1'/%3E%3Crect x='0' y='4' width='1' height='1'/%3E%3Crect x='3' y='4' width='1' height='1'/%3E%3C/svg%3E"); }
.velo--3 { --ritardo: calc(var(--turno-3, 3) * 0.5); --gruppo: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 7 5' preserveAspectRatio='none' shape-rendering='crispEdges'%3E%3Crect x='2' y='0' width='1' height='1'/%3E%3Crect x='4' y='0' width='1' height='1'/%3E%3Crect x='2' y='2' width='1' height='1'/%3E%3Crect x='4' y='2' width='1' height='1'/%3E%3Crect x='6' y='2' width='1' height='1'/%3E%3Crect x='0' y='3' width='1' height='1'/%3E%3Crect x='4' y='4' width='1' height='1'/%3E%3Crect x='6' y='4' width='1' height='1'/%3E%3C/svg%3E"); }
@media (hover: hover) and (pointer: fine) {
  .cell--link:hover .duo { --scopri: var(--giri); }
}

/* Hero delle pagine progetto: senza velo, come la cella in hover.
   Così l'espansione parte e arriva sullo stesso stato, senza stacco. */
.cell[data-hero] .duo::after, .cell[data-hero] .velo { display: none; }
```

## Markup e script (MediaCell.astro)

```astro
<div class="duo" data-part="media">
  {video ? (
    <video data-autoplay muted loop playsinline preload="none" poster={poster?.src} aria-label={alt}>
      <source src={video} type="video/mp4" />
    </video>
  ) : image && (
    <Image src={image} alt={alt} widths={[400, 800, 1200, 1600, 2400]} sizes={sizes} loading={priority ? 'eager' : 'lazy'} fetchpriority={priority ? 'high' : undefined} decoding="async" />
  )}
  {[0, 1, 2, 3].map(g => <span class={`velo velo--${g}`} aria-hidden="true" />)}
</div>

{title && (
  <div class="caption">
    <span class="caption__title" data-part="title">{title}</span>
    {meta && <span class="mono">{meta}</span>}
  </div>
)}

<script>
  // velo a quadretti (global.css): a ogni ingresso del mouse in una cella con foto, i 4 gruppi di quadretti
  // partono in un ordine nuovo (--turno-0…3 = posizione di ogni gruppo nella fila). Delegato al documento:
  // vale anche per le pagine caricate dal ClientRouter
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const cell = (e.target as Element).closest<HTMLElement>('.cell--link');
    if (!cell?.querySelector('.velo') || cell.contains(e.relatedTarget as Node | null)) return;
    const turni = [0, 1, 2, 3];
    for (let i = turni.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [turni[i], turni[j]] = [turni[j], turni[i]];
    }
    turni.forEach((t, g) => cell.style.setProperty(`--turno-${g}`, String(t)));
  });
</script>
```
