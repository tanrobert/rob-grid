---
title: "G&A Porte per interni"
tags: [Imprese, Prodotto, Logo, Web, Print]
period: "dal 2026"
description: "Brand e sito per un'azienda che produce porte su misura, casa madre di Spazioquadro."
featured: true
shape: { w: 6, h: 4 }
# il marchio di prima (SVG di Illustrator, 3/11/2026): intero e piccolo in un quadrato grigio molto chiaro in fondo
# alla cella, come il vecchio banner di Purple Piper (4/11/2026, scelta di Roberto)
contesto:
  foto: ./logo-vecchio.svg
  alt: "Il vecchio marchio di G&A: gli angoli di due finestre in legno affiancate, gialli, di ognuna un pezzo di montante e uno di traverso uniti dagli intagli a coda di rondine; sopra G&A e sotto Porte per interni, in grigio"
  fondo: "#e8e6e3"
cells:
  # gli obiettivi del restyling (tavola 4 di sorgenti/gea/gea-tavole.ai, "Obiettivi di allineamento"): una cella divisa
  # in quattro riquadri da un filo, in riga sul computer, 2×2 sul tablet, in colonna sul telefono (scelta di Roberto del
  # 4/11/2026). La prima dell'elenco (6/11/2026; provata 8×8 in 2×2 accanto al contesto e tornata in riga)
  - type: punti
    w: 12
    h: 3
    md: { w: 8, h: 8 }
    sm: { w: 4, h: 10 }
    eyebrow: "Obiettivi del restyling"
    punti:
      - title: "Evoluzione e riconoscibilità"
        icona: frecce
        body: "Modernizzare il brand elevandone l'estetica, preservando al contempo la **notorietà storica** e i **valori fondanti** del marchio."
      - title: "Armonizzazione e coerenza visiva"
        icona: cerchio-quadrato
        body: "Creare un'**identità aziendale coesa**, connettendo in modo fluido il simbolo al logotipo con un **bilanciamento tipografico e geometrico**."
      - title: "Versatilità e sistema dinamico"
        icona: quadrati
        body: "Trasformare il logo in un **sistema visivo** dinamico e flessibile, capace di adattarsi a **tutti i contesti** in cui l'azienda si presenta."
      - title: "Ottimizzazione tecnica e funzionale"
        icona: mirino
        body: "Perfezionare la **palette cromatica** e i **contrasti**: scalabilità, nitidezza e **leggibilità immediata** in qualsiasi dimensione o contesto."
  # la palette prima e dopo (tavole 5-9 di sorgenti/gea/gea-tavole.ai): il primo intervento sul marchio, quindi subito dopo
  # gli obiettivi, larga quanto la pagina (6/11/2026, prima 8×5 accanto alle versioni). Un clic passa da una all'altra; i
  # contrasti li calcola la cella (WCAG: nelle tavole c'erano numeri un po' diversi).
  # Colori di prima dal logo vecchio, nuovi dalle tavole 8-9. Testi: bozza
  - type: palette
    w: 12
    h: 5
    md: { w: 8, h: 5 }
    sm: { w: 4, h: 8 }
    eyebrow: "Colori"
    prima:
      nome: "Prima"
      title: "I colori di prima"
      body: "Un giallo acceso e un grigio chiaro, **troppo vicini**: su nessuno dei due un testo si legge bene. Testo di prova."
      colori:
        - { nome: "Giallo", hex: "#edce00" }
        - { nome: "Grigio", hex: "#a6a7a9" }
    dopo:
      nome: "Dopo"
      title: "La palette nuova"
      body: "Un giallo **più caldo**, un **antracite** al posto del grigio chiaro e due colori secondari: ogni colore ha un compagno che lo rende leggibile. Testo di prova."
      colori:
        - { nome: "Giallo Ambrato", hex: "#f6c32b" }
        - { nome: "Grigio Antracite", hex: "#4a4a48" }
        - { nome: "Grigio Pietra", hex: "#d1d1cf", secondario: true }
        - { nome: "Bianco Gesso", hex: "#f5f2ec", secondario: true }
  # il marchio storico ridisegnato (6/11/2026, idea di Roberto; tavola 15, dalla FIG 01 alla FIG 03): zoom sul braccio di
  # sinistra, il braccio che prende le misure della FIG 03, zoom indietro sulla FIG 03 intera, quella da cui parte
  # l'evoluzione (scripts/ridisegno.ts). Disegno generato da tools/gea-ridisegno.mjs (da logo-vecchio.svg e dalla FIG 03 di
  # evoluzione-simbolo.svg). 12×4, testo e disegno metà e metà, sotto il testo il righello Prima · Dopo (6/11/2026: prima 8×5 accanto al contesto, prima ancora quadrata 8×8; il contesto ora è orizzontale e il ridisegno sta al suo posto, dopo la palette), prima dell'evoluzione. Testo: bozza
  - type: ridisegno
    w: 12
    h: 4
    md: { w: 8, h: 5 }
    sm: { w: 4, h: 6 }
    eyebrow: "Marchio"
    title: "Ridisegnare il marchio"
    body: "Prima di cambiarlo, il marchio storico va **ridisegnato con misure esatte**: i quattro pezzi tutti uguali, le **code di rondine** e gli incastri della stessa misura. Si parte dal **traverso** di sinistra. Testo di prova."
    disegno: ./ridisegno-marchio.svg
    alt: "Il marchio storico di G&A, quattro pezzi gialli di montanti e traversi uniti dalle code di rondine, ridisegnato: il traverso di sinistra si ingrandisce, i suoi vertici segnati in rosso si spostano fino alle misure esatte, poi torna al suo posto tra gli altri tre pezzi ridisegnati"
  # l'evoluzione del simbolo, un passo per clic (scripts/evoluzione.ts): disegno dalle tavole di sorgenti/gea/gea-tavole.ai
  # (evoluzione-simbolo.svg, coi passi annotati). Larga: è il cuore del progetto (scelte di Roberto: alta 7, larga quanto
  # la riga di hero e contesto, 12; il disegno resta alto quanto la cella, lo spazio in più va al testo; sul tablet 8×5).
  # Testi provvisori, da scrivere
  - type: evoluzione
    w: 12
    h: 7
    md: { w: 8, h: 5 }
    sm: { w: 4, h: 7 }
    eyebrow: "Evoluzione del simbolo"
    disegno: ./evoluzione-simbolo.svg
    alt: "Il simbolo di G&A che cambia: gli angoli di due finestre in legno del marchio storico, montanti e traversi con gli intagli a coda di rondine e le linee di costruzione, tagliati dagli assi degli incastri fino al quadrato centrale"
    passi:
      - title: "Montanti e traversi"
        body: "Il marchio storico: gli **angoli** di due finestre in legno affiancate. Di ognuna si vede un pezzo di **montante** e uno di **traverso**, uniti dagli intagli a **coda di rondine**. Testo di prova."
      - title: "Il taglio"
        body: "Gli **assi** degli incastri tagliano la figura: resta il **cuore**, dove i quattro pezzi si incastrano. Testo di prova."
      - title: "Le code di rondine"
        body: "Da vicino, al centro, i quattro **trapezi** delle code di rondine: il giallo G&A li fa emergere. Testo di prova."
      - title: "Verso il centro"
        body: "I trapezi crescono verso il centro fin quasi a toccarsi: tra loro resta una **croce** sottile. Testo di prova."
      - title: "Rifinire il simbolo"
        body: "Un **rettangolo aureo** al centro, con la sua **spirale**, scava i quattro pezzi: si apre il vuoto del simbolo. Testo di prova."
      - title: "Simbolo e logotipo"
        body: "Sotto il simbolo, riga per riga, **G&A** e il payoff, costruiti sulle stesse linee. Alla fine il testo prende il **grigio** G&A. Testo di prova."
  # le versioni del logo, una alla volta (versione-*.svg, le risorse esportate da Illustrator il 4/11/2026): la prima ha
  # tutte le parti, le altre ne tolgono (si ricentrano) o le spostano (le orizzontali). Le parti di ogni versione le trova la
  # cella (lib/versioni.ts). 6×6 (6/11/2026: prima delle collezioni, sopra il catalogo, accanto alle collezioni), sul tablet 4×5 accanto al contesto.
  # Le parti stanno sotto il titoletto, così il logo prende tutta la larghezza
  - type: versioni
    w: 6
    h: 6
    md: { w: 4, h: 5 }
    sm: { w: 4, h: 6 }
    eyebrow: "Versioni del logo"
    alt: "Il logo di G&A: il marchio giallo, sotto o accanto il logotipo G&A in grigio, il descrittore Porte per interni e la firma Gruppo Gelfù"
    versioni:
      - { title: "Logo completo verticale", logo: ./versione-verticale-completa.svg }
      - { title: "Logo verticale", logo: ./versione-verticale.svg }
      - { title: "Marchio e logotipo", logo: ./versione-marchio-logotipo.svg }
      - { title: "Marchio", logo: ./versione-marchio.svg }
      - { title: "Logo orizzontale", logo: ./versione-orizzontale.svg }
      - { title: "Logo orizzontale compatto", logo: ./versione-orizzontale-compatta.svg }
      # ricavata da versione-marchio-logotipo.svg (6/11/2026): solo le forme grigie, viewBox stretto sul logotipo
      - { title: "Logotipo", logo: ./versione-logotipo.svg }
  # le collezioni, una alla volta (scripts/collezioni.ts): foto, velo del colore della linea, logo bianco al centro. Loghi
  # e foto in collezioni/ (foto dal catalogo: originali in sorgenti/gea/collezioni, quelle a doppia pagina tagliate alla
  # metà con la porta, ridotte a 1000 px), colori da sorgenti/gea/collezioni-colori.svg. Dopo le versioni (6/11/2026, scelta di Roberto: più grande, una volta e mezza): 6×12 a destra, a sinistra versioni 6×6 e catalogo 6×6
  - type: collezioni
    w: 6
    h: 12
    md: { w: 4, h: 8 }
    sm: { w: 4, h: 7 }
    eyebrow: "Collezioni"
    title: "Un logo per ogni linea"
    body: "Tredici collezioni, tredici **loghi** e un **colore** per ciascuna, dalla porta a filo muro al blindato. Testo di prova."
    collezioni:
      - { nome: "Sensazioni", colore: "#b85c46", logo: ./collezioni/sensazioni.svg, foto: ./collezioni/sensazioni.jpg, alt: "porta bianca aperta su uno studio con la scrivania in legno" }
      - { nome: "Minima", colore: "#8e8e8c", logo: ./collezioni/minima.svg, foto: ./collezioni/minima.jpg, alt: "porta in vetro satinato col telaio nero, in un soggiorno scuro col pavimento di marmo" }
      - { nome: "Essential", colore: "#a49b8c", logo: ./collezioni/essential.svg, foto: ./collezioni/essential.jpg, alt: "porta bianca a riquadri in un soggiorno col divano arancione" }
      - { nome: "Punto a capo", colore: "#3f6870", logo: ./collezioni/punto-a-capo.svg, foto: ./collezioni/punto-a-capo.jpg, alt: "porta scura col vetro satinato in un soggiorno chiaro" }
      - { nome: "Pant Evo", colore: "#748894", logo: ./collezioni/pant-evo.svg, foto: ./collezioni/pant-evo.jpg, alt: "porta bianca liscia in una stanza luminosa, con una sedia nera" }
      - { nome: "Compost", colore: "#6a5542", logo: ./collezioni/compost.svg, foto: ./collezioni/compost.jpg, alt: "porta bianca con tre inserti grigi su una parete grigia" }
      - { nome: "Telist", colore: "#8a7350", logo: ./collezioni/telist.svg, foto: ./collezioni/telist.jpg, alt: "porta a libro bianca aperta su un bagno" }
      - { nome: "Classica", colore: "#5a302b", logo: ./collezioni/classica.svg, foto: ./collezioni/classica.jpg, alt: "porta in legno a riquadri in un soggiorno dai toni caldi" }
      - { nome: "Techwood", colore: "#6f7256", logo: ./collezioni/techwood.svg, foto: ./collezioni/techwood.jpg, alt: "porta in legno con quattro vetri satinati, in un soggiorno con la cucina" }
      - { nome: "Hotel-REI", colore: "#713b49", logo: ./collezioni/hotel-rei.svg, foto: ./collezioni/hotel-rei.jpg, alt: "porta bianca su una parete nera a doghe, in una camera da letto" }
      - { nome: "Filomuro in linea", colore: "#bca27d", logo: ./collezioni/filomuro-in-linea.svg, foto: ./collezioni/filomuro-in-linea.jpg, alt: "porta a filo muro nella parete grigia di un loft" }
      - { nome: "Panto", colore: "#cc9478", logo: ./collezioni/panto.svg, foto: ./collezioni/panto.jpg, alt: "porta bianca con riquadri orizzontali in una stanza chiara" }
      - { nome: "Blindati", colore: "#4a413a", logo: ./collezioni/blindati.svg, foto: ./collezioni/blindati.jpg, alt: "portoncino d'ingresso in legno scuro tra due lanterne e due piante" }
  # biglietti da visita e carta intestata (la copertina di prima, sorgenti/gea/copertina-vecchia.png, ridotta a 1600 px):
  # fa da tappabuchi (6/11/2026, scelta di Roberto: scambiata col catalogo, ordine e misure): 6×6 sotto le versioni, accanto alle collezioni
  - type: media
    w: 6
    h: 6
    md: { w: 8, h: 7 }
    sm: { w: 4, h: 6 }
    image: ./cancelleria.jpg
    alt: "Biglietti da visita di G&A, uno bianco e uno giallo, su una cartellina col simbolo e il logo e le linee di costruzione, appoggiati su doghe di legno scuro e vetro"
    ingrandisci: true
    # gli altri mockup, a turno con la cancelleria ogni 4 s; il clic ingrandisce la foto in vista (5/11/2026, scelta di
    # Roberto). Originali in sorgenti/gea/mockup-*.png, ridotti a 1600 px
    immagini:
      - image: ./mockup-spilla.jpg
        alt: "Spilla gialla col simbolo di G&A sul taschino di una giacca grigio scuro"
      - image: ./mockup-insegna.jpg
        alt: "Insegna di G&A Porte per interni sulla facciata di un edificio: il simbolo giallo e la scritta bianca"
      - image: ./mockup-casco.jpg
        alt: "Casco da cantiere grigio col logo giallo di G&A, su fondo giallo"
      # 3:4 (originale in sorgenti/gea/mockup-portachiavi.png, 960×1280): nella cella si taglia sopra, il portachiavi resta intero
      - image: ./mockup-portachiavi.jpg
        alt: "Portachiavi in acciaio a forma di simbolo di G&A, appeso alla chiave nella serratura di una porta grigio scuro"
        taglio: sopra
  # due celle quadrate prima del catalogo (6/11/2026, richiesta di Roberto), disegni annotati per scripts/animato.ts:
  # sorgenti con testo vivo e annotazioni in sorgenti/gea (firma.svg, 90-anni.svg), in tracciati con
  # python tools/svg-testo-tracciati.py auto sorgenti/gea/<nome>.svg src/content/progetti/gea/animato-<nome>.svg --glifi
  # la firma che si scrive (Golden Hopes), lettera dopo lettera. Testo: bozza
  - type: animato
    w: 6
    h: 6
    md: { w: 4, h: 5 }
    sm: { w: 4, h: 6 }
    eyebrow: "Firma"
    title: "Qualità da metterci la firma"
    body: "La firma di **Antonio Gelfù** entra nel marchio: una **garanzia** scritta a mano su ogni porta. Testo di prova."
    disegno: ./animato-firma.svg
    alt: "La firma Antonio Gelfù, scritta a mano in grigio antracite e tagliata da un tratto obliquo"
  # il marchio circolare dei 90 anni: arrivano il 90 e G&A, gira la scritta, si scrive la firma, poi lo svolazzo sotto e Dal 1936.
  # Sull'antracite di G&A (ha scritte bianche e grigio chiaro). Testo: bozza
  - type: animato
    w: 6
    h: 6
    md: { w: 4, h: 5 }
    sm: { w: 4, h: 6 }
    eyebrow: "90 anni"
    title: "Celebrare i 90 anni"
    body: "Dal **1936** a oggi: un marchio circolare per l'anniversario, con il **90** al centro e la firma di famiglia. Testo di prova."
    disegno: ./animato-90-anni.svg
    alt: "Il marchio dei 90 anni di G&A: un grande 90 giallo in corsivo, in alto G&A, attorno la scritta Anni di porte di qualità ed eccellenza, sopra la firma Gelfù su uno svolazzo grigio chiaro e sotto Dal 1936"
    fondo: "#4a4a48"
  # il catalogo 2026: due mockup delle doppie pagine (sorgenti/gea/catalogo-*.png, 4500×3000, ridotti a 1600 px) in un
  # carosello sotto il testo, come le etichette di Kiale. L'ultima cella, a tutta larghezza (6/11/2026, scelta di Roberto: scambiata con la cancelleria, ordine e misure; prima 6×6 accanto alle collezioni, 8×8 prima ancora). Testo: bozza
  - type: text
    w: 12
    h: 8
    md: { w: 8, h: 5 }
    sm: { w: 4, h: 4 }
    size: s
    eyebrow: "Print · catalogo"
    title: "Il catalogo 2026"
    body: "Le porte G&A **ambientate**, collezione per collezione, con le **caratteristiche** e i prospetti di ogni modello. Testo di prova."
    immagini:
      - image: ./catalogo-libro.jpg
        alt: "Il catalogo 2026 di G&A aperto su un tavolo di legno: la porta a libro in un bagno con le piastrelle rosa e la vasca, pagine 108 e 109"
      - image: ./catalogo-arte.jpg
        alt: "Il catalogo 2026 di G&A aperto: la porta Arte con le cornici in un soggiorno rosa col camino e lo specchio tondo, pagine 26 e 27"
---
