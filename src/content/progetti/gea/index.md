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
  # biglietti da visita e carta intestata (la copertina di prima, sorgenti/gea/copertina-vecchia.png, ridotta a 1600 px):
  # cella di riempimento, 8×5 (5/11/2026, scelta di Roberto: alta come la palette, che a 16 colonne le sta accanto;
  # prima 8×8), la prima dell'elenco: la griglia (row dense) riempie i buchi
  # nell'ordine dell'elenco, così a 12 colonne riempie lei la riga accanto al contesto (la hero 12×8 prende la riga
  # intera), prima che ci finisca la palette (8×5)
  - type: media
    w: 8
    h: 5
    sm: { w: 4, h: 4 }
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
  # gli obiettivi del restyling (tavola 4 di sorgenti/gea/gea-tavole.ai, "Obiettivi di allineamento"): una cella divisa
  # in quattro riquadri da un filo, in riga a 12 colonne, 2×2 sul tablet, in colonna sul telefono (scelta di Roberto del
  # 4/11/2026). Larga quanto la pagina, così a 12 colonne va sotto contesto e cancelleria e prima della palette
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
  # la palette prima e dopo (tavole 5-9 di sorgenti/gea/gea-tavole.ai): il primo intervento sul marchio, quindi la prima
  # cella. Un clic passa da una all'altra; i contrasti li calcola la cella (WCAG: nelle tavole c'erano numeri un po' diversi).
  # Colori di prima dal logo vecchio, nuovi dalle tavole 8-9. Testi: bozza
  - type: palette
    w: 8
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
  # le versioni del logo, una alla volta (versione-*.svg, le risorse esportate da Illustrator il 4/11/2026): la prima ha
  # tutte le parti, le altre ne tolgono (si ricentrano) o le spostano (le orizzontali). Le parti di ogni versione le trova la
  # cella (lib/versioni.ts). 4×5 accanto alla palette (8×5: fanno la riga), sul tablet accanto al contesto (alto 5).
  # Le parti stanno sotto il titoletto, così il logo prende tutta la larghezza
  - type: versioni
    w: 4
    h: 5
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
  # le collezioni, una alla volta (scripts/collezioni.ts): foto, velo del colore della linea, logo bianco al centro. Loghi
  # e foto in collezioni/ (foto dal catalogo: originali in sorgenti/gea/collezioni, quelle a doppia pagina tagliate alla
  # metà con la porta, ridotte a 1000 px), colori da sorgenti/gea/collezioni-colori.svg. Prima del catalogo, con lui fa la riga; alta 8 (con 7 la foto perdeva sopra e sotto)
  - type: collezioni
    w: 4
    h: 8
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
  # il catalogo 2026: due mockup delle doppie pagine (sorgenti/gea/catalogo-*.png, 4500×3000, ridotti a 1600 px) in un
  # carosello sotto il testo, come le etichette di Kiale. Larga 8 perché le foto sono 3:2 e le pagine si leggano; alta 8 come le collezioni accanto. Testo: bozza
  - type: text
    w: 8
    h: 8
    md: { w: 8, h: 7 }
    sm: { w: 4, h: 6 }
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
