# rob-astro — portfolio di Roberto Tanasi

Portfolio da graphic designer costruito come **griglia modulare di caselle** in bicromia rosso/bianco.
Astro 6 statico, nessun framework UI, TypeScript. Unica libreria runtime: d3-geo (solo per il globo, caricata su richiesta). Dominio `https://roberto.design`, progetto Vercel `rob-grid`.
Lingua del sito e dei commenti nel codice: **italiano**.

## Comandi
- `npm run dev` · `npx astro build` (deve chiudere con `Complete!`, zero errori) · `npx astro preview`
- `astro check` non è installato (conflitto di dipendenze): non aggiungerlo senza chiedere.

## Struttura
```
src/
  layouts/Layout.astro      <head>, ClientRouter, script inline (intro + --dp), import di morph.ts e cells.ts
  pages/                    index · archivio (filtri per tag) · info · progetti/[slug]
  components/
    Grid.astro              rende le celle + calcola i "vuoti" per ogni breakpoint
    Cell.astro              guscio di ogni casella: <a> se cliccabile, <div> altrimenti; linguetta + freccia/✕
    PageHero.astro          casella d'arrivo dell'espansione (pagine info/progetto)
    SiteFooter.astro        footer = casella rossa sempre ultima, fuori dalla griglia
    SvgAsset.astro          rende un SVG dal registro
    TagButtons.astro        pulsanti filtro (casella tags + barra mobile dell'archivio)
    cells/*Cell.astro       un componente per ogni tipo di cella
  data/
    grid.ts                 GRIGLIA HOME: l'ordine e le misure delle celle si modificano qui
    grid-types.ts           tipo `Cell` (unione di tutti i tipi di cella)
    projects.ts, types.ts   progetti (period = "dal 2024"/"nel 2016")
    svgs.ts                 registro unico degli SVG: componente + label per screen reader
  lib/
    grid.ts                 COLS, BREAKPOINTS, resolveSpans, findVoids (replica di grid-auto-flow: row dense)
    projects.ts             projectYear, firstYear, projectsByYear
    tags.ts                 TagCount, tagSlug, allTags
    format.ts               pad2 ("03")
    globe.ts                proiezione del globo (d3-geo), orientamento siderale reale; usato al build e nel browser
    version.ts              versione del footer dal messaggio dell'ultimo commit
  scripts/
    cells.ts                comportamenti vivi (orologio, meteo Open-Meteo, occhio, cursore, misure, pausa offscreen); reinit su astro:page-load, cleanup su before-swap
    archive.ts              filtri archivio (?tag=), View Transition delle caselle, vuoti ricalcolati nel browser
    morph.ts                espansione cella → pagina e ritorno (view-transition-name assegnato solo alla cella cliccata)
    ruler.ts                righello al posto della scrollbar: indicatore + percentuale, trascinamento e click
    globe.ts                casella terra: giro d'ingresso, tempo reale, trascinamento e ritorno (import dinamico da cells.ts)
  styles/global.css         token, griglia, cella, media bicromia, intro, view transitions, reduced motion
  styles/fonts.css          tutte le @font-face (importato da global.css)
```

## Sistema a griglia
- Colonne: **6** desktop (≥1024) · **4** tablet (600–1023) · **2** mobile (<600). `COLS`/`BREAKPOINTS` in `lib/grid.ts` vanno tenuti allineati a `--cols` e alle media query di `global.css`.
- Unità `--u` = lato della cella quadrata, calcolata su `.grid` con `100cqw` (`.sheet` è il container). Tetto `--u-max` (300px): `.sheet` ha `max-width` di conseguenza e si centra, quindi la cella si ferma lì (da ~1870px con 6 colonne).
- Ogni cella: `w`/`h` in unità, override `md`/`sm`, `tone: 'red'`, `href`, `label`, `heroOf`, `hideOn`.
- L'ordine in `data/grid.ts` conta: la griglia è `row dense`. I buchi rimasti diventano `.void` (carta a quadretti fissi da 50px), calcolati al build per breakpoint e ricalcolati nel browser dopo i filtri.
- Tipi di cella: svg, marquee (anche `vertical`), text, list, stat, media, project, clock, cursor, meter, mark, eye, globe, archive-head, tags.
- Globo (`terra`): terre da `data/land-110m.json` (Natural Earth 1:110m via world-atlas, generato una volta, coordinate a 0,1°). Orientamento = rotazione siderale (meridiano rivolto all'equinozio), asse inclinato 23,44° verso destra.

## Font
- Due ruoli, file in `public/fonts/` come `ruolo-peso[-italic].woff2`:
  - **testo** = Untitled Sans (Klim), `var(--font-testo)`, pesi 300 400 500 700 900 + corsivi. Font di base; titoli e testi in 500.
  - **numeri** = Söhne Mono (Klim), `var(--font-numeri)`, pesi 200–900 + corsivi. Usato dalla classe `.mono` (10px, maiuscolo, cifre tabellari) per linguette, eyebrow, didascalie, orologio.
- Preload in Layout.astro: `testo-500` e `numeri-400`. Sorgenti originali in `D:\ROBERTO\Roberto file grafiche progetti\` (Untitled Sans, "Sohne OTF - fixed…"); conversione con fontTools (`pip install --user fonttools brotli`).
- Licenza web Klim da verificare per metterli online.

## Convenzioni
- **Filo delle celle** (`.cell::after`): quattro lati disegnati con gradienti, spessore `--line-dp` (= `--line` agganciato ai pixel reali). Nell'intro `--draw` (0→1, `@property`) fa crescere il filo dal vertice `data-from` (scelto a caso in Layout.astro) lungo il perimetro; poi entrano fondo e contenuto. Durata in `--t-draw`, da tenere allineata al timeout di `cells.ts`.
- **Righello** (al posto della scrollbar nativa, nascosta): tacche come sfondo di `<body>` nel margine destro (ogni 25px da 5px, ogni 100px larghe quanto il margine), scorrono con la pagina; indicatore fisso = rettangolo rosso con percentuale verticale bianca (`.ruler`, persistente tra le pagine). Posizioni e spessori agganciati a `--dp`. Su touch è solo indicatore. La scrollbar nativa si nasconde solo con `html.has-ruler` (messa da ruler.ts, riapplicata dopo ogni swap): senza JS resta la scrollbar normale.
- **Linee**: sempre `var(--line)` (1px). Per i fili usare `border`, mai `box-shadow`: i bordi vengono agganciati ai pixel reali, le ombre no (al 125% escono da 2px sfumati, più spessi del filo della casella). Se il filo deve stare dentro la misura, togliere `--line` dal padding. Linee secondarie: rosso al 22–35% o bianco al 45% sulle celle rosse.
- Colori: solo la palette, usata direttamente (niente alias di ruolo). Il sito usa `--rosso` e `--bianco` (`hsl(0 15% 89%)` ≈ `#e7dfdf`, unico bianco: fondo di pagina e caselle, e scritte/fili/loghi sulle caselle rosse). `--bianco-puro` (#fff) solo per l'hover di logo e link del footer. In palette anche `--nero`, `--giallo`, `--verde` (da terminal-astro). Niente hover con `opacity` su rosso/bianco: crea rosa fuori palette. Le caselle hanno fondo `--bianco` = colore della pagina (non trasparenti: coprono i crocini della griglia).
- Token in `:root` (`--m`=10px, `--gap`, `--pad`, `--pad-label` = padding sotto la linguetta, `--line`, `--dp`, font). Niente valori magici ripetuti: se un valore compare 2+ volte diventa un token o un helper.
- SVG nuovi: aggiungerli a `data/svgs.ts`; i file devono usare `fill: currentColor` (così si invertono sulle celle rosse). Nomi file in kebab-case, niente apostrofi.
- Stagger max 50ms, mai `transition: all`, `…` unicode, `prefers-reduced-motion` rispettato anche nei loop JS.
- Layout "content aware" quando i contenuti sono di lunghezza diversa (es. zone del footer distribuite con `space-between`), allineando comunque gli elementi principali alle colonne della griglia.

## Trappole note
- Aree con scroll interno (es. casella tags): niente `overscroll-behavior: contain`, Firefox blocca la rotella sulla casella anche quando non c'è nulla da scorrere.
- `.duo` (bicromia) ha `isolation: isolate`: senza, i veli in multiply/screen finiscono sopra linguetta e freccia della cella e le scuriscono.
- `@keyframes` **non sono scoped** in Astro: nomi unici (`eye-blink`, `caret-blink`…), altrimenti si sovrascrivono.
- I commenti HTML `<!-- -->` nei componenti finiscono nell'HTML pubblicato: commentare nel frontmatter.
- Il ClientRouter riscrive gli attributi di `<html>` a ogni navigazione: variabili inline su `<html>` (es. `--dp`) vanno riapplicate su `astro:after-swap`. Gli script `is:inline` in `<head>` girano solo al primo caricamento.
- Linee disegnate con gradienti non vengono agganciate ai pixel: con Windows al 125% escono sfocate/1-2px. Usare `--dp` (1 pixel reale) + `round()` come in `.void`.
- I crocini di registro sono un SVG data-URI nel token `--crocini` (`:root`): colore `#f03f24` e spessore 1px scritti a mano. Usati da `.grid` (nei gap) e da `.sheet::before/::after` (margini laterali quando scatta il tetto `--u-max`, allineati al passo delle colonne).
- `--u`/`--step` sono token in `:root` con `100cqw`: si risolvono dove vengono usati, quindi valgono solo in elementi il cui container è `.sheet` (non dentro le celle).

## Verifica (prima di dire "fatto")
1. `npx astro build` senza errori.
2. Per modifiche visive: `npx astro preview --port 4399` e screenshot con Chrome headless
   (`chrome.exe --headless=new --force-prefers-reduced-motion --window-size=W,H --screenshot=...`) a 1440 / 800 / 500 px.
   Chrome headless non scende sotto ~500px di larghezza. Per scale Windows usare `--force-device-scale-factor=1.25`. L'hover non è simulabile.
3. Per refactor: confrontare l'HTML generato prima/dopo.

## Git
Roberto fa commit e push da solo: committare solo se lo chiede. La versione nel footer ("Portfolio modulare v.X") si legge al build dal messaggio dell'ultimo commit (`lib/version.ts`, come in terminal-astro): il messaggio deve iniziare col numero, es. `1.0.1 footer`. Versioni: 1.0 → 1.1 → 1.2 (refactor, footer, marchio verticale, quadretti 50px).

## Aperti / idee
- Video Eurofish da 8.6 MB da comprimere.
- Tag sempre in coppia (Ristorazione+Ospitalità…): da ripensare. Molti progetti con `dummy.png` e testi segnaposto.
- Ultima riga della home: vuoti accanto a `marchio` (tolta `nome-2`).
- `logo-completo.svg` (quadrato) non più usato ma ancora nel registro.
- SEO (Open Graph, Schema.org, sitemap): da fare con la procedura "Review SEO Astro Rob".
- Scartato: cubo 3D sul logo della casella 1 (provato e annullato).
