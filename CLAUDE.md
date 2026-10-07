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
  pages/                    index · archivio (filtri per tag) · info · extra · progetti/[slug]
  components/
    Grid.astro              rende le celle + calcola i "vuoti" per ogni breakpoint
    Cell.astro              guscio di ogni casella: <a> se cliccabile, <div> altrimenti; linguetta + freccia/✕.
                            Tutte le hero sono celle della griglia con `heroOf`: stesso tipo della cella di partenza, al doppio (progetti: forma ×2; info, extra, archivio: 2×2 → 4×4, su mobile 4×2)
    SiteFooter.astro        footer = casella rossa sempre ultima, fuori dalla griglia
    SvgAsset.astro          rende un SVG dal registro
    TagButtons.astro        pulsanti filtro (casella tags + barra mobile dell'archivio)
    cells/*Cell.astro       un componente per ogni tipo di cella
  data/
    grid.ts                 GRIGLIA HOME: l'ordine e le misure delle celle si modificano qui
    extra.ts                celle extra (orologio, misure, cursore, registro, occhio, globo): pagina /extra, il numero in home si aggiorna da solo
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
    morph.ts                espansione cella → pagina e ritorno. Nell'HTML solo chiavi e ruoli: `data-morph` (href della cella) = `data-hero` (hero d'arrivo), `data-title-of` (cella del titolo d'arrivo), `data-part` = il ruolo di un pezzo (media, go, caption, title, num, note, eyebrow…: **qualsiasi ruolo presente da tutti e due i lati viaggia**, uno per cella; il resto resta nella finestra). Come viaggia lo dice la classe (`KIND` in morph.ts): frame (finestre), photo, scale (titolo, numero, freccia: riquadro stretto sul contenuto), text (tutto il resto, resta della sua misura). I nomi (`morph-<ruolo>`, classe `morph` + tipo) li dà solo `morph.ts`, nel loader di Astro (entrambi i documenti, pagina vecchia non ancora catturata), ai pezzi presenti da tutti e due i lati, e li toglie a fine transizione (`data-morphing`). Lì anche fondo della finestra, foto d'arrivo pronta e riquadro della foto. Coreografia in global.css. In `npm run dev` la console avvisa dei pezzi segnati male (ruolo doppio o sconosciuto, due hero)
    close.ts                chiusura della pagina aperta da una cella: ✕ (a[data-close]) ed Esc → history.back() (o la home se si è entrati da fuori)
    ruler.ts                righello al posto della scrollbar: indicatore + percentuale, trascinamento e click
    globe.ts                casella terra: giro d'ingresso, tempo reale, trascinamento e ritorno (import dinamico da cells.ts)
  styles/global.css         token, griglia, cella, media con velo, intro, view transitions, reduced motion
  styles/fonts.css          tutte le @font-face (importato da global.css)
tools/                      verifica delle View Transitions, solo sviluppo (vedi "Verifica"); risultati in tools/out/ (ignorata da git)
```

## Sistema a griglia
- Colonne: **12** desktop (≥1024) · **8** tablet (600–1023) · **4** mobile (<600). `COLS`/`BREAKPOINTS` in `lib/grid.ts` vanno tenuti allineati a `--cols` e alle media query di `global.css`.
- **Unità piccola**: la cella quadrata "base" è **2×2** unità; le misure dispari danno le forme intermedie (es. 4×3, anche su mobile). Unità `--u` calcolata su `.grid` con `100cqw` (`.sheet` è il container). Tetto `--u-max` (145px = cella 2×2 da 300px): `.sheet` ha `max-width` di conseguenza e si centra (da ~1870px). I crocini stanno a ogni incrocio di unità.
- Ogni cella: `w`/`h` in unità, override `md`/`sm`, `tone: 'red'`, `href`, `label`, `heroOf`, `hideOn`.
- L'ordine in `data/grid.ts` conta: la griglia è `row dense`. I buchi rimasti diventano `.void` (carta a quadretti fissi da 50px), calcolati al build per breakpoint e ricalcolati nel browser dopo i filtri.
- **Forma dei progetti**: `shape` (w×h in unità) in `projects.ts` è l'unica misura del progetto. `scaleShape` (`lib/grid.ts`) la usa ×1 per la cella in home (`projectCell` in `data/grid.ts`) e in archivio, ×2 per la hero della pagina progetto; se non ci sta nelle colonne va a tutta larghezza con lo stesso rapporto (su mobile la hero "si sposta" senza crescere). Niente `md`/`sm` a mano sui progetti: il rapporto deve restare quello dell'immagine. Senza `shape`: archivio 4×4/2×2, hero 6×6.
- **Tavola Photoshop per progetto**: modulo 600 px per unità (es. 4×3 → 2400×1800), layout guide con canale 0 e margini 300 sopra/sotto · 200 ai lati (½ e ⅓ di unità: liberi da linguetta, freccia e didascalia nella cella più piccola). Forme più larghe di 4 unità si stringono su mobile e tagliano i lati: margini maggiori (eurofish 6×4 → 400 · 500).
- Tipi di cella: svg, marquee (anche `vertical`), text, list, stat, media, project, clock, cursor, meter, mark, eye, globe, archive-head, tags.
- Globo (`terra`): terre da `data/land-110m.json` (Natural Earth 1:110m via world-atlas, generato una volta, coordinate a 0,1°). Orientamento = rotazione siderale (meridiano rivolto all'equinozio), asse inclinato 23,44° verso destra.

## Font
- Due ruoli, file in `public/fonts/` come `ruolo-peso[-italic].woff2`:
  - **testo** = Untitled Sans (Klim), `var(--font-testo)`, pesi 300 400 500 700 900 + corsivi. Font di base; titoli e testi in 500.
  - **numeri** = Söhne Mono (Klim), `var(--font-numeri)`, pesi 200–900 + corsivi. Usato dalla classe `.mono` (10px, maiuscolo, cifre tabellari) per linguette, eyebrow, didascalie, orologio.
- Preload in Layout.astro: `testo-500` e `numeri-400`. Sorgenti originali in `D:\ROBERTO\Roberto file grafiche progetti\` (Untitled Sans, "Sohne OTF - fixed…"); conversione con fontTools (`pip install --user fonttools brotli`).
- Licenza web Klim da verificare per metterli online.

## Convenzioni
- **Filo delle celle** (`.cell::after`): quattro lati disegnati con gradienti, spessore `--line-dp` (= `--line` agganciato ai pixel reali). Nell'intro `--draw` (0→1, `@property`) fa crescere il filo dal vertice `data-from` (scelto a caso in Layout.astro) lungo il perimetro; poi entrano fondo e contenuto. Velocità costante: durata = perimetro in unità × `--t-draw-u` (70ms), quindi le celle piccole compaiono prima; `cells.ts` toglie `is-intro` quando finiscono le animazioni vere (`getAnimations`), niente timeout da allineare.
- **Righello** (al posto della scrollbar nativa, nascosta): tacche come sfondo di `<body>` nel margine destro (ogni 25px da 5px, ogni 100px larghe quanto il margine), scorrono con la pagina; indicatore fisso = rettangolo rosso con percentuale verticale bianca (`.ruler`, persistente tra le pagine). Posizioni e spessori agganciati a `--dp`. Su touch è solo indicatore. La scrollbar nativa si nasconde solo con `html.has-ruler` (messa da ruler.ts, riapplicata dopo ogni swap): senza JS resta la scrollbar normale.
- **Linee**: sempre `var(--line)` (1px). Per i fili usare `border`, mai `box-shadow`: i bordi vengono agganciati ai pixel reali, le ombre no (al 125% escono da 2px sfumati, più spessi del filo della casella). Se il filo deve stare dentro la misura, togliere `--line` dal padding. Linee secondarie: rosso al 22–35% o bianco al 45% sulle celle rosse.
- Colori: solo la palette, usata direttamente (niente alias di ruolo). Il sito usa `--rosso` e `--bianco` (`hsl(0 15% 89%)` ≈ `#e7dfdf`, unico bianco: fondo di pagina e caselle, e scritte/fili/loghi sulle caselle rosse). `--bianco-puro` (#fff) solo per l'hover di logo e link del footer. In palette anche `--nero`, `--giallo`, `--verde` (da terminal-astro). Niente hover con `opacity` su rosso/bianco: crea rosa fuori palette. Le caselle hanno fondo `--bianco` = colore della pagina (non trasparenti: coprono i crocini della griglia).
- Token in `:root` (`--m`=10px, `--gap`, `--pad`, `--pad-label` = padding sotto la linguetta, `--line`, `--dp`, font). Niente valori magici ripetuti: se un valore compare 2+ volte diventa un token o un helper.
- SVG nuovi: aggiungerli a `data/svgs.ts`; i file devono usare `fill: currentColor` (Illustrator riesporta con il colore fisso, es. `fill: #f13e23`: va rimesso a mano, se no il logo non diventa bianco sulle celle rosse) (così si invertono sulle celle rosse). Nomi file in kebab-case, niente apostrofi.
- Stagger max 50ms, mai `transition: all`, `…` unicode, `prefers-reduced-motion` rispettato anche nei loop JS.
- Layout "content aware" quando i contenuti sono di lunghezza diversa (es. zone del footer distribuite con `space-between`), allineando comunque gli elementi principali alle colonne della griglia.

## Trappole note
- Aree con scroll interno (es. casella tags): niente `overscroll-behavior: contain`, Firefox blocca la rotella sulla casella anche quando non c'è nulla da scorrere.
- Media (`.duo`): solo un velo rosso semitrasparente (`--velo`), niente `filter` né `mix-blend-mode` sulle foto: su mobile rendevano lo scroll scattoso (soprattutto in archivio, 20 foto). Gli effetti grafici vanno cotti nelle immagini.
- `@keyframes` **non sono scoped** in Astro: nomi unici (`eye-blink`, `caret-blink`…), altrimenti si sovrascrivono.
- I commenti HTML `<!-- -->` nei componenti finiscono nell'HTML pubblicato: commentare nel frontmatter.
- Il ClientRouter riscrive gli attributi di `<html>` a ogni navigazione: variabili inline su `<html>` (es. `--dp`) vanno riapplicate su `astro:after-swap`. Gli script `is:inline` in `<head>` girano solo al primo caricamento.
- Linee disegnate con gradienti non vengono agganciate ai pixel: con Windows al 125% escono sfocate/1-2px. Usare `--dp` (1 pixel reale) + `round()` come in `.void`.
- I crocini di registro sono un SVG data-URI nel token `--crocini` (`:root`): colore `#f03f24` e spessore 1px scritti a mano. Usati da `.grid` (nei gap) e da `.sheet::before/::after` (margini laterali quando scatta il tetto `--u-max`, allineati al passo delle colonne).
- Foto d'arrivo pronta prima delle istantanee: le celle della griglia sono `lazy` e la hero usa un file più grande. Se l'istantanea della pagina nuova la cattura vuota, la foto di partenza sfuma su un riquadro bianco (flash). `morph.ts` (`photoReady`, nel loader) la mette eager + `decoding=sync` e la scarica/decodifica prima, con un tetto di 1s. La hero resta comunque `loading="eager"` (prop `priority` di MediaCell).
- View Transitions in Firefox: se un elemento con `view-transition-name` sparisce (`display: none`) a transizione già avviata, Firefox annulla tutta l'animazione e la pagina cambia di scatto (Chrome no). Caso reale: il righello si nasconde sulle pagine che non scorrono (hero piccola → pagina progetto più corta della finestra); per questo `ruler.ts` si aggiorna in `astro:after-swap`, prima della foto della pagina nuova. Per i test: Firefox con `layout.css.devPixelsPerPx` (zoom) e finestre strette.
- Foto delle celle progetto: in hover sparisce solo il velo, niente zoom (tolto: nella View Transition la foto della cella e quella della hero devono combaciare, e lo zoom andava annullato al click e tagliato con `overflow: clip`).
- Foto nella View Transition, Firefox: `::view-transition-old/new` non tagliano ciò che sborda → `overflow: clip` sull'`image-pair` della foto, se no esce dal filo. Cella e hero possono avere proporzioni diverse (tablet: eurofish 6×4 → 8×5) e quindi ritagli diversi della foto: adattate "a riempimento" si sdoppiano. Le due istantanee stanno in `contain` dentro il riquadro della foto intera (proporzioni da width/height di `<Image>`), centrato: `morph.ts` lo anima in px (Web Animations sugli pseudo `::view-transition-old/new(morph-media)`) dalla foto di partenza a quella d'arrivo, con `--t-morph` e `--ease-morph`. **Niente unità `cq` sugli pseudo delle View Transitions**: Chrome non li tratta come contenitori, `100cqh` diventa l'altezza della finestra e la foto esce ingrandita ~4 volte (Firefox invece funzionava, per questo era sfuggito).
- Pagina intera nella View Transition (`root`): la vecchia resta piena (`animation: none`) e la nuova la copre entrando. Se sfumano tutte e due in tempi diversi, nel mezzo resta il foglio vuoto: "flash bianco" a ogni click (luminosità media 145 → 177 → 141 nel video di Roberto).
- **Fondo della finestra** (`morph-window`): le istantanee da sole non la riempiono (la cella piccola resta in alto a sinistra mentre la finestra si allarga; a metà dissolvenza sono tutte e due semitrasparenti, con `mix-blend-mode: normal`). Senza fondo si vedeva la pagina sotto: la "R" del logo dentro Extra su mobile, Info che diventava rosa all'apertura e alla chiusura. `morph.ts` (`fillWindow`) anima il fondo del gruppo da quello della cella a quello della hero (letto dal CSS: bianco, rosso, trasparente con la foto che cresce sotto).
- **Firefox mobile (telefono e tablet, ottobre 2026): ogni View Transition che cambia misura è scattosa** (progetti compresi). Non è il nostro codice: lo fa anche una pagina di prova con un solo riquadro. Misure dal video di Roberto, bordi del riquadro a 30 fps: View Transition che cambia misura → lati destro e basso avanti e indietro di 20–60px; View Transition stessa misura, animazione CSS di width/height, transform → fluide. Provato e **scartato**: rifare il movimento dei gruppi con left/top + width/height (Web Animations, tutto sullo stesso thread) → in Firefox mobile scatta uguale, e a Roberto non piaceva l'effetto. Chrome mobile va bene. **Scelta (ottobre 2026): su Firefox per Android niente espansione, solo la dissolvenza della pagina** (`PLAIN` in morph.ts, riconosciuto dallo user agent `Android…Firefox/`; `html.morph-plain` fa partire subito la pagina nuova). Approvata da Roberto provandola sul telefono. Da ricontrollare quando Firefox migliora: togliere `PLAIN` e riprovare sul telefono vero (Firefox desktop e la vista mobile del PC non mostrano il problema). Pagina di prova: `tools/pages/vt-test.html` (con `npm run vt:serve`, su `/_vt/vt-test.html` dal telefono).
- **Pezzi `scale` con testo diverso ai due lati non viaggiano** (`travels` in morph.ts): due parole diverse scalate una sull'altra si sovrappongono per tutta la corsa (Contatti "Scrivimi_" → Info). Restano nella finestra, che le scambia in 220ms. Vale anche per il numero dell'archivio filtrato ("05") che torna al "20" della home.
- **Contatore che riparte durante la transizione**: `cells.ts` fa salire i numeri da 0 alla prima visita della home. Entrando dal link diretto di Extra/Archivio e chiudendo, la home si carica a transizione in corso e il numero che viaggia passava 06 → 03 → 05 → 06. Ora un numero con `data-morphing` (in viaggio) non riparte.
- **Doppio click rapido su due celle**: (1) il preparativo della prima navigazione, annullata, può finire dopo quello della seconda: deve uscire subito (`e.signal.aborted` appena dopo `load()`), se no toglie i nomi appena dati dalla seconda; (2) se la prima pagina arriva prima del secondo click Astro la mostra comunque, e la seconda partirebbe da una cella non più nella pagina (mezza transizione): la cella cliccata deve essere `isConnected`. In quel caso niente espansione, e la ✕ torna al primo progetto (è nella history).
- Pezzi `scale` (titolo, numero): le lettere combaciano solo se il testo ha le stesse proporzioni ai due lati (spaziatura in em, peso). La hero va fatta con lo stesso componente della cella di partenza: la vecchia hero di Info (PageHero, -0.06em contro -0.04em della cella) sdoppiava "Info".
- Barra della didascalia ↔ cella del titolo: forme diverse, l'istantanea non riempie la finestra mentre cambia forma → fondo `--bianco` su `::view-transition-group(morph-caption)`, se no resta un riquadro vuoto e alla fine il colore "flasha". Per lo stesso motivo il filo vero delle celle con nome (`.cell::after`) è nascosto durante la transizione (`.cell[data-morphing]`): le istantanee non si deformano, e il filo della cella d'arrivo comparirebbe già alla misura finale dentro la finestra (eurofish: didascalia larga 6 → titolo largo 4). Il filo lo disegna l'`outline` della finestra.
- Test delle View Transitions rallentate: `Animation.setPlaybackRate` (DevTools Protocol) rallenta le animazioni CSS ma non quelle create da script (`element.animate` in `morph.ts`), che arrivano subito alla fine. Rallentare invece `--t-morph` con `adoptedStyleSheets` (lo legge anche `morph.ts`).
- Test delle View Transitions in Firefox: le prove "a fermo immagine" (`pause()` + `currentTime` sulle animazioni) mostrano bene posizioni e misure ma **non le opacità**. Per le dissolvenze rallentare `--t-morph` (es. 7200ms, via `adoptedStyleSheets` subito prima del click) e catturare lo schermo mentre gira.
- Chiusura di una cella espansa = apertura al contrario: lo scambio delle istantanee (cella grande ↔ piccola) avviene alla fine (`html.morph-close`, messa da `morph.ts` sul documento nuovo, perché lo swap riscrive gli attributi di `<html>`). Se l'istantanea della cella piccola entrasse subito, il suo filo scivolerebbe sopra la foto che si stringe.
- Nomi delle View Transitions mai nell'HTML: più celle portano alla stessa pagina e due nomi uguali annullano la transizione. Un click su una cella vince sulla chiusura: dall'archivio (che ha la sua hero) una cella si apre nel progetto; un link qualsiasi (es. un tag) verso una pagina con hero non apre niente.
- Celle che si aprono con il contenuto in basso (Extra, Archivio, Info): la finestra tiene fermo il contenuto in alto a sinistra (la linguetta), quindi quello che sta in basso sparirebbe all'inizio e ricomparirebbe di colpo alla fine. Tutto ciò che deve restare in vista va marcato con `data-part` ai due lati. I pezzi `scale` sono centrati in verticale: con interlinee diverse (Info: 1 nella cella, 0.76 nella hero) i centri delle lettere combaciano comunque, allineati in alto si sdoppiano.
- Casella freccia/✕ nella transizione: viaggia sopra la finestra e il suo fondo copriva il filo in alto e a destra (a riposo quei lati sono il filo della cella, disegnato sopra). Il suo `image-pair` è tagliato di `--line-dp` in alto e a destra: si vede il filo della finestra sotto.
- **Tempi CSS letti da JavaScript**: la build comprime il CSS e riscrive `720ms` come `.72s`. Con `parseFloat` la foto dell'espansione durava 0,72ms (saltava subito alla misura finale) solo sul sito pubblicato, non in dev. Usare `toMs` (morph.ts). Nei test non sovrascrivere i token con valori scritti a mano senza provare anche quelli veri della build: lo nascondevano.
- **Lavori pesanti durante la View Transition**: `astro:page-load` scatta a transizione appena partita. Il globo (d3-geo + terre) avviato lì faceva saltare la prima apertura di Extra (82 fotogrammi contro 131 della seconda, col modulo già in cache). In `cells.ts` gli avvii pesanti aspettano `transition` (= `viewTransition.finished`). Per misurare: contare i fotogrammi con `requestAnimationFrame` durante la transizione, prima e seconda volta, anche con `emulateCPUThrottling(4)`.
- Tasto ✕ delle hero: uno solo per tutte (30px, `.cell__go` + `data-close`), uguale alla freccia della cella. Niente misure o hover propri nelle singole hero (Info ne aveva uno da 44px).
- `--u`/`--step` sono token in `:root` con `100cqw`: si risolvono dove vengono usati, quindi valgono solo in elementi il cui container è `.sheet` (non dentro le celle).

## Verifica (prima di dire "fatto")
1. `npx astro build` senza errori. Se Roberto ha `npm run dev` acceso (porta 4321), la build rigenera la cache di Vite e il dev server risponde 504 ai moduli: niente ClientRouter, niente View Transitions. Avvisarlo di riavviare il dev server dopo la build.
2. **Transizioni**: `npx astro preview --port 4399` acceso, poi `npm run vt:tour -- chrome` e `npm run vt:tour -- firefox` (giro completo: aperture, chiusure, indietro/avanti, Esc, archivio, tag, doppio click; controlla anche le marcature delle pagine). `--android` lo ripete come Firefox per Android (solo dissolvenza). Esce con errore se una transizione si interrompe, resta un nome, i pezzi non combaciano o la foto d'arrivo non è pronta.
   Per vedere com'è: `npm run vt:film -- 'a[data-id="info"]' --close` → foto della transizione rallentata ×10 e foglio di provini in `tools/out/` (solo Chrome: gli screenshot di Firefox non catturano le View Transitions).
   Telefono vero (stesso Wi-Fi): `npm run vt:serve` → sito e pagina di prova sulla rete di casa. Video di Roberto: `npm run vt:frames -- video.mp4 --step 0.0333` (fotogrammi senza ffmpeg).
   `puppeteer-core` usa Chrome e Firefox installati (percorsi in `tools/lib.mjs`, o `CHROME_PATH`/`FIREFOX_PATH`).
3. Per modifiche visive: screenshot con Chrome headless
   (`chrome.exe --headless=new --force-prefers-reduced-motion --window-size=W,H --screenshot=...`) a 1440 / 800 / 500 px.
   Chrome headless non scende sotto ~500px di larghezza. Per scale Windows usare `--force-device-scale-factor=1.25`. L'hover non è simulabile.
4. Per refactor: confrontare l'HTML generato prima/dopo.

### Debug View Transitions (metodo che ha risolto l'"apertura di scatto", ottobre 2026)
Sintomo: alcune celle si aprivano senza animazione, solo in Firefox, e il problema sembrava legato alla misura delle celle. Strada seguita:
1. **Video di Roberto analizzato fotogramma per fotogramma**: senza ffmpeg, si apre l'mp4 in Chrome headless e si fanno screenshot via DevTools Protocol, spostando `currentTime`. Ha mostrato che la transizione era assente del tutto (niente dissolvenza della pagina), non solo brutta. Il secondo video ha rivelato la finestra stretta e zoomata (griglia tablet su uno schermo largo).
2. **Diagnostica in console** (temporanea, solo dev): su `astro:before-swap`, `e.viewTransition.ready/finished` più i `view-transition-name` delle due pagine. Ha detto "PARTITA": quindi la transizione non veniva rifiutata, ma interrotta dopo.
3. **Riproduzione nell'ambiente vero**: `puppeteer-core` con Firefox installato (`browser: 'firefox'`), finestra visibile, zoom via `extraPrefsFirefox: { 'layout.css.devPixelsPerPx': '1.5' }`. Misurando quanto passa tra `startViewTransition` e `finished`: ~770ms = animata, ~18ms = interrotta. Gli screenshot di Firefox **non** catturano i livelli della transizione: servono le misure o la cattura dello schermo.
4. **Esclusione una per una**: scrollbar, scroll della home, titolo, cella. Il fattore era la pagina d'arrivo che non scorre → `ruler.ts` nascondeva il righello (che ha un `view-transition-name`) a transizione avviata. Vedi "Trappole note".
Lezioni: Chrome headless non basta per le View Transitions; provare Firefox, finestre strette e zoom. Gli stili iniettati nella pagina vecchia vengono cancellati dallo swap (per i test, modificare `e.newDocument` in `astro:before-swap`).

## Git
Roberto fa commit e push da solo: committare solo se lo chiede. La versione nel footer ("Portfolio modulare v.X") si legge al build dal messaggio dell'ultimo commit (`lib/version.ts`, come in terminal-astro): il messaggio deve iniziare col numero, es. `1.0.1 footer`. Versioni: 1.0 → 1.1 → 1.2 (refactor, footer, marchio verticale, quadretti 50px).

## Aperti / idee
- Video Eurofish in panchina (commentato in `projects.ts`, al suo posto il png): 8.6 MB 1080p, appesantiva lo scroll. Prova: 1280×720 H.264 crf31 ≈ 3.1 MB senza perdita visibile; se scatta ancora, bicromia "cotta" nel video.
- Tag sempre in coppia (Ristorazione+Ospitalità…): da ripensare. Molti progetti con `dummy.png` e testi segnaposto.
- Ultima riga della home: vuoti accanto a `marchio` (tolta `nome-2`).
- `logo-completo.svg` (quadrato) non più usato ma ancora nel registro.
- SEO (Open Graph, Schema.org, sitemap): da fare con la procedura "Review SEO Astro Rob".
- Scartato: cubo 3D sul logo della casella 1 (provato e annullato).
- Firefox per Android: per ora solo dissolvenza (vedi "Trappole note"). Riprovare l'espansione ai prossimi aggiornamenti di Firefox; eventualmente segnalarlo a Mozilla.
