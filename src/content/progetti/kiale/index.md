---
title: "Kiale food service"
tags: [Ristorazione, Ospitalità, Branding, Print, Packaging]
period: "dal 2024"
description: "Sistema di brand per un **format di ristorazione veloce** con **ingredienti locali**."
featured: true
marchio: cliente
# copertina: manifesti e volantini sparsi (da sorgenti/kiale/kiale-copertina-volantini.png, 4500×3000, portata a 3600×2400).
# Prima era il poster estivo nel mockup (sorgenti/kiale/kiale-poster-1.png, 4×5)
shape: { w: 6, h: 4 }
# la foto che era la copertina (sorgenti/kiale/dsc5018.jpg): nella cella 02, sotto titolo e descrizione
contesto:
  foto: ./contesto.jpg
  alt: "I titolari di Kiale dietro al banco, con la cuffia per i capelli, tra le vetrine dei piatti pronti"
cells:
  # barattoli che girano, tutti in una cella: etichette 14×6 sul vaso basso, vellutate 14×9 sul vaso alto, alla stessa
  # scala (h 7 dal 29/10/2026: col titolone il vasetto resta grande come prima). Un terzo della larghezza, in colonna: testo in alto, barattoli sotto. Etichette in ./etichette (tools/barattolo-mockup.py --etichette).
  # Colori dell'interno chiari: si moltiplicano sul vetro. Testo: bozza da rivedere
  - type: barattolo
    w: 4
    h: 7
    md: { w: 4, h: 7 }
    sm: { w: 4, h: 7 }
    eyebrow: "Packaging · etichette"
    title: "Conserve diverse, etichette di famiglia."
    barattoli:
      - { nome: "Confettura di fragole", mockup: vaso-basso, etichetta: ./etichette/confettura-fragole.webp, bordo: ./etichette/confettura-fragole.svg, parola: ./etichette/parola-confetture.svg, interno: ./etichette/interno-fragole.webp, tipo: pezzi, dentro: "#a3141c", pezzi: "#c8202a" }
      - { nome: "Confettura di albicocche", mockup: vaso-basso, etichetta: ./etichette/confettura-albicocche.webp, bordo: ./etichette/confettura-albicocche.svg, parola: ./etichette/parola-confetture.svg, interno: ./etichette/interno-albicocche.webp, tipo: pezzi, dentro: "#e2741c", pezzi: "#f7a440" }
      - { nome: "Confettura di prugne", mockup: vaso-basso, etichetta: ./etichette/confettura-prugne.webp, bordo: ./etichette/confettura-prugne.svg, parola: ./etichette/parola-confetture.svg, interno: ./etichette/interno-prugne.webp, tipo: pezzi, dentro: "#4a1238", pezzi: "#6e2a5a" }
      - { nome: "Zacuscă · composta di verdure", mockup: vaso-basso, etichetta: ./etichette/composta-zacusca.webp, bordo: ./etichette/composta-zacusca.svg, parola: ./etichette/parola-composte.svg, interno: ./etichette/interno-zacusca.webp, tipo: crema, dentro: "#d4542a" }
      - { nome: "Filetti di carote sott'olio", mockup: vaso-basso, etichetta: ./etichette/sottolio-filetti-carote.webp, bordo: ./etichette/sottolio-filetti-carote.svg, parola: ./etichette/parola-sottolio.svg, interno: ./etichette/interno-carote.webp, tipo: filetti, dentro: "#f2c25a", pezzi: "#f0761a" }
      - { nome: "Filetti di melanzane sott'olio", mockup: vaso-basso, etichetta: ./etichette/sottolio-filetti-melanzane.webp, bordo: ./etichette/sottolio-filetti-melanzane.svg, parola: ./etichette/parola-sottolio.svg, interno: ./etichette/interno-melanzane.webp, tipo: filetti, dentro: "#c9a356", pezzi: "#6b4a2a" }
      - { nome: "Pomodoro fresco · sugo pronto", mockup: vaso-basso, etichetta: ./etichette/sugo-pomodoro-fresco.webp, bordo: ./etichette/sugo-pomodoro-fresco.svg, parola: ./etichette/parola-paste-e-sughi.svg, interno: ./etichette/interno-pomodoro-fresco.webp, tipo: crema, dentro: "#d8301c" }
      - { nome: "Pasta e fagioli · sugo pronto", mockup: vaso-basso, etichetta: ./etichette/sugo-pasta-fagioli.webp, bordo: ./etichette/sugo-pasta-fagioli.svg, parola: ./etichette/parola-paste-e-sughi.svg, interno: ./etichette/interno-pasta-fagioli.webp, tipo: pezzi, dentro: "#b8502e", pezzi: "#e8c8a0" }
      - { nome: "Vellutata di carote, patate e piselli", mockup: vaso-alto, etichetta: ./etichette/vellutata-carote-patate-piselli.webp, bordo: ./etichette/vellutata-carote-patate-piselli.svg, parola: ./etichette/parola-vellutate.svg, interno: ./etichette/interno-carote-patate-piselli.webp, tipo: crema, dentro: "#ffa83c" }
      - { nome: "Vellutata di zucca e patate", mockup: vaso-alto, etichetta: ./etichette/vellutata-zucca-patate.webp, bordo: ./etichette/vellutata-zucca-patate.svg, parola: ./etichette/parola-vellutate.svg, interno: ./etichette/interno-zucca-patate.webp, tipo: crema, dentro: "#ffb83a" }
  # il testo delle etichette, in una cella sua dopo i barattoli (il titolo dei barattoli è corto e grande)
  - type: text
    w: 4
    h: 3
    size: s
    title: "Le etichette"
    body: "Confetture, composte, sott'olio, sughi pronti e vellutate: per ogni prodotto **la stessa struttura**, con ingredienti a sinistra, nome al centro e valori nutrizionali a destra.\n\nCambiano **colori e illustrazione**. Due formati: **14×6 cm** per i vasetti, **14×9** per le vellutate."
  # canale WhatsApp: registrazione dello schermo (tema chiaro, primi 11 secondi: ffmpeg -t 11) con un margine bianco attorno (gli angoli tondi
  # non tagliano ora e tasti), messa in prospettiva nello schermo del telefono da tools/telefono-mockup.py ("sorgenti/mockup/mockup-tel-3.psd"
  # → public/telefono e public/media/kiale-canale). Cella stretta come i barattoli, testo sopra il telefono. Testo: bozza
  - type: telefono
    w: 4
    h: 6
    md: { w: 4, h: 6 }
    sm: { w: 4, h: 6 }
    eyebrow: "Social · canale WhatsApp"
    title: "Il menù, ogni giorno sul canale"
    video: /media/kiale-canale.mp4
    # logo del canale, versione verticale (da Illustrator, già espanso, 30/10/2026)
    logo: ./canale-whatsapp.svg
    logoAlt: "Kiale · canale WhatsApp · menù giornaliero"
    alt: "Il canale WhatsApp Kiale Food Service scorre sul telefono: una card del menù del giorno dopo l'altra"
  # il testo del canale, in una cella sua dopo il telefono (il titolo del telefono è corto e grande)
  - type: text
    w: 4
    h: 3
    size: s
    title: "Il canale WhatsApp"
    body: "Per il canale WhatsApp di Kiale **una card fissa per il menù del giorno**: primi, secondi e contorni, con lo stesso stile delle etichette.\n\nCambiano i piatti, **la pagina resta riconoscibile**."
  # sito web: i piatti di kiale.it come sticker in un nastro infinito, da destra a sinistra (foto scontornate del sito, kiale-astro/src/assets/img,
  # passate da tools/sticker.mjs: bordo bianco, stessa superficie)
  - type: sticker
    w: 4
    h: 6
    md: { w: 4, h: 6 }
    sm: { w: 4, h: 6 }
    eyebrow: "Web · sito"
    title: "Kiale.it, sul web come sul banco"
    # testo: bozza dal sito (pagine e descrizioni di kiale-astro)
    body: "Per kiale.it un sito in **tre pagine**: la home, l'asporto con primi, secondi e contorni pronti ogni giorno, e i buffet per eventi e feste.\n\nUn sito web **in espansione** che raccoglie una parte delle preparazioni di Kiale food service. Ogni piatto **scontornato**, come sul banco."
    button: { label: "Visita il sito", href: "https://kiale.it" }
    alt: "I piatti del sito di Kiale, uno sull'altro come sticker: coppette, burger, pokè, fritti, pasta, dolci"
    immagini:
      - ./piatti/coppetta-polpo-patate.webp
      - ./piatti/tris-mini-burger.webp
      - ./piatti/poke.webp
      - ./piatti/ciambella.webp
      - ./piatti/fritti-misti.webp
      - ./piatti/pomodori-ripieni-riso-patate.webp
      - ./piatti/farfalle-pesto-pomodorini.webp
      - ./piatti/cornetto-salato.webp
      - ./piatti/coppetta-riso-zucchine-gamberi.webp
      - ./piatti/mix-verdure-grigliate.webp
      - ./piatti/tris-gamberi.webp
      - ./piatti/pasticcini-crema.webp
  # affissioni a Itri, una dopo l'altra: per ognuna la foto intera e la stessa col solo cartellone (sorgenti/kiale/affissione-*.png,
  # ridotte a 1500 px); passando sulla foto la strada si schiarisce
  - type: affissione
    w: 4
    h: 7
    md: { w: 4, h: 7 }
    sm: { w: 4, h: 7 }
    eyebrow: "Affissioni · manifesto"
    title: "Affissioni"
    # testi: bozze dai manifesti
    affissioni:
      - subtitle: "Zio Checco · inaugurazione"
        body: "Per l'estate Kiale apre **I Panini di Zio Checco**, una panineria serale da asporto, dal 15 giugno al 15 settembre.\n\nUn manifesto **da leggere al volo**: il marchio al centro, i panini in primo piano, orari, indirizzo e telefono grandi."
        alt: "Il manifesto dei Panini di Zio Checco su un cartellone in una strada di Itri, accanto a una macchina parcheggiata"
        foto: ./affissione-zio-checco.webp
        scontornata: ./affissione-zio-checco-scontornata.webp
      - subtitle: "Kiale · componi il tuo piatto"
        body: "Il pranzo di Kiale in **tre combinazioni a prezzo fisso**: un primo con l'acqua a 6 €, primo e secondo oppure secondo e contorno a 10 €, con acqua e caffè.\n\nI piatti in primo piano, i prezzi **nei bollini verdi**, il QR del menù del giorno in basso."
        alt: "Il manifesto Componi il tuo piatto di Kiale su un cartellone appeso a un muro di pietra a Itri"
        foto: ./affissione-componi-piatto.webp
        scontornata: ./affissione-componi-piatto-scontornata.webp
      - subtitle: "Kiale · prima di andare al mare"
        body: "Per l'estate il pranzo **da portare in spiaggia**: insalate fresche, primi e secondi, piatti leggeri, acqua e bevande, in confezioni pratiche con vaschette e posate monouso.\n\nAttorno al titolo **i piatti visti dall'alto**, in basso indirizzo, telefono e il QR del menù del giorno."
        alt: "Il manifesto Prima di andare al mare passa da noi di Kiale su un cartellone in strada, tra le macchine parcheggiate"
        foto: ./affissione-prima-del-mare.webp
        scontornata: ./affissione-prima-del-mare-scontornata.webp
      - subtitle: "Kiale · istituzionale"
        body: "Il manifesto **di Kiale food service**: il marchio grande al centro e i tre servizi, gastronomia, buffet per eventi e pausa pranzo.\n\nAttorno, **le foto del banco e della cucina**; in basso indirizzo, telefono e QR."
        alt: "Il manifesto istituzionale di Kiale food service su un cartellone appeso a un muro di pietra"
        foto: ./affissione-istituzionale.webp
        scontornata: ./affissione-istituzionale-scontornata.webp
  # sottologo estivo: il logo che si compone (src/assets/loghi/zio-checco.svg, dal file di Illustrator in sorgenti/kiale) e,
  # a turno, la carta del panino e la busta (sorgenti/kiale/zio-checco-*.png, ritagliate e portate a 1400 px). Testo: bozza
  - type: sottologo
    w: 4
    h: 7
    md: { w: 4, h: 7 }
    sm: { w: 4, h: 7 }
    eyebrow: "Sottomarchio · estate"
    title: "La sera i panini di Zio Checco"
    logo: zio-checco
    body: "Da giugno a settembre Kiale apre **anche la sera**, con i panini da asporto di Francesco, per tutti **Zio Checco**.\n\nPer questo volto estivo un **sottomarchio a timbro**: il panino al centro, sulla carta che avvolge i panini e sulle buste."
    immagini:
      - image: ./zio-checco-panino.webp
        alt: "Un panino avvolto nella carta arancione col timbro I panini di Zio Checco da Kiale"
      - image: ./zio-checco-busta.webp
        lato: sinistra
        alt: "Una mano regge una busta arancione da asporto col timbro I panini di Zio Checco da Kiale e la scritta Pronti da gustare"
---
