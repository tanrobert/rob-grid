---
title: "Kiale food service"
tags: [Ristorazione, Ospitalità, Branding, Print, Packaging]
period: "dal 2024"
description: "Sistema di brand per un **format di ristorazione veloce** con **ingredienti locali**."
featured: true
marchio: cliente
shape: { w: 4, h: 5 }
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
      - { nome: "Confettura di fragole", mockup: vaso-basso, etichetta: ./etichette/confettura-fragole.webp, bordo: ./etichette/confettura-fragole.svg, parola: ./etichette/parola-confetture.svg, tipo: pezzi, dentro: "#a3141c", pezzi: "#c8202a" }
      - { nome: "Confettura di albicocche", mockup: vaso-basso, etichetta: ./etichette/confettura-albicocche.webp, bordo: ./etichette/confettura-albicocche.svg, parola: ./etichette/parola-confetture.svg, tipo: pezzi, dentro: "#e2741c", pezzi: "#f7a440" }
      - { nome: "Confettura di prugne", mockup: vaso-basso, etichetta: ./etichette/confettura-prugne.webp, bordo: ./etichette/confettura-prugne.svg, parola: ./etichette/parola-confetture.svg, tipo: pezzi, dentro: "#4a1238", pezzi: "#6e2a5a" }
      - { nome: "Zacuscă · composta di verdure", mockup: vaso-basso, etichetta: ./etichette/composta-zacusca.webp, bordo: ./etichette/composta-zacusca.svg, parola: ./etichette/parola-composte.svg, tipo: crema, dentro: "#d4542a" }
      - { nome: "Filetti di carote sott'olio", mockup: vaso-basso, etichetta: ./etichette/sottolio-filetti-carote.webp, bordo: ./etichette/sottolio-filetti-carote.svg, parola: ./etichette/parola-sottolio.svg, tipo: filetti, dentro: "#f2c25a", pezzi: "#f0761a" }
      - { nome: "Filetti di melanzane sott'olio", mockup: vaso-basso, etichetta: ./etichette/sottolio-filetti-melanzane.webp, bordo: ./etichette/sottolio-filetti-melanzane.svg, parola: ./etichette/parola-sottolio.svg, tipo: filetti, dentro: "#c9a356", pezzi: "#6b4a2a" }
      - { nome: "Pomodoro fresco · sugo pronto", mockup: vaso-basso, etichetta: ./etichette/sugo-pomodoro-fresco.webp, bordo: ./etichette/sugo-pomodoro-fresco.svg, parola: ./etichette/parola-paste-e-sughi.svg, tipo: crema, dentro: "#d8301c" }
      - { nome: "Pomodoro datterino · sugo pronto", mockup: vaso-basso, etichetta: ./etichette/sugo-datterino.webp, bordo: ./etichette/sugo-datterino.svg, parola: ./etichette/parola-paste-e-sughi.svg, tipo: pezzi, dentro: "#d02a18", pezzi: "#e8442a" }
      - { nome: "Pasta e fagioli · sugo pronto", mockup: vaso-basso, etichetta: ./etichette/sugo-pasta-fagioli.webp, bordo: ./etichette/sugo-pasta-fagioli.svg, parola: ./etichette/parola-paste-e-sughi.svg, tipo: pezzi, dentro: "#b8502e", pezzi: "#e8c8a0" }
      - { nome: "Vellutata di carote, patate e piselli", mockup: vaso-alto, etichetta: ./etichette/vellutata-carote-patate-piselli.webp, bordo: ./etichette/vellutata-carote-patate-piselli.svg, parola: ./etichette/parola-vellutate.svg, tipo: crema, dentro: "#ffa83c" }
      - { nome: "Vellutata di zucca e patate", mockup: vaso-alto, etichetta: ./etichette/vellutata-zucca-patate.webp, bordo: ./etichette/vellutata-zucca-patate.svg, parola: ./etichette/parola-vellutate.svg, tipo: crema, dentro: "#ffb83a" }
  # il testo delle etichette, in una cella sua dopo i barattoli (il titolo dei barattoli è corto e grande)
  - type: text
    w: 4
    h: 2
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
    # logo del canale (da Illustrator, già espanso: "Risorsa 7.svg")
    logo: ./menu-giornaliero.svg
    logoAlt: "Kiale food service · canale WhatsApp · menù giornaliero"
    alt: "Il canale WhatsApp Kiale Food Service scorre sul telefono: una card del menù del giorno dopo l'altra"
  # il testo del canale, in una cella sua dopo il telefono (il titolo del telefono è corto e grande)
  - type: text
    w: 4
    h: 2
    size: s
    title: "Il canale WhatsApp"
    body: "Per il canale WhatsApp di Kiale **una card fissa per il menù del giorno**: primi, secondi e contorni, con lo stesso stile delle etichette.\n\nCambiano i piatti, **la pagina resta riconoscibile**."
  # sito web: i piatti di kiale.it come sticker in un nastro infinito, da destra a sinistra (foto scontornate del sito, kiale-astro/src/assets/img,
  # passate da tools/sticker.mjs: bordo bianco, stessa superficie)
  - type: sticker
    w: 4
    h: 5
    md: { w: 4, h: 5 }
    sm: { w: 4, h: 5 }
    eyebrow: "Web · sito"
    title: "Kiale.it, sul web come al banco"
    # testo: bozza dal sito (pagine e descrizioni di kiale-astro)
    body: "Per kiale.it un sito in **tre pagine**: la home, l'asporto con primi, secondi e contorni pronti ogni giorno, e i buffet per eventi e feste.\n\nUn sito web **in espansione** che raccoglie una parte delle preparazioni di Kiale food service. Ogni piatto **scontornato**, come sul banco."
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
  # poster estivo nel mockup (foto intera, ridotta a 2000 px da sorgenti/kiale/kiale-poster-1.png)
  - type: media
    w: 4
    h: 5
    md: { w: 4, h: 5 }
    sm: { w: 4, h: 5 }
    image: ./poster.jpg
    alt: "Poster Kiale tenuto in mano: Welcome, prima di andare al mare passa da noi; prima colazione, food delivery e prenotazioni"
---
