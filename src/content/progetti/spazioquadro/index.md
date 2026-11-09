---
title: "Spazioquadro porte e finestre"
tags: [Imprese, Prodotto, Web, Print]
period: "dal 2026"
# il marchio non è di Roberto (9/11/2026): niente tag Logo né logo in copertina. Copertina = il capannone di Itri
# (originale sorgenti/spazioquadro/dsc4304.png, tagliato al centro a 4:3); quella di prima, col logo, è copertina-col-logo.png
marchio: cliente
# testo: dal sito spazioquadro.net (9/11/2026), da rileggere con Roberto
description: "La linea di **G&A** dedicata alle **finestre**, e a qualche porta: nasce nel 2020 dall'esperienza dell'azienda di Itri, che fa porte dal 1936.\n\nSerramenti in **PVC, legno e alluminio**, prodotti in casa e venduti soprattutto a **rivenditori e professionisti**."
featured: true
shape: { w: 4, h: 3 }
# le mani al lavoro su un telaio (originale in sorgenti/spazioquadro/dsc4330.jpg, ridotto a 1200 px)
contesto:
  foto: ./contesto.jpg
  alt: "Mani con i guanti da lavoro arancioni montano il telaio di una finestra in legno, in officina"
cells:
  # i colori (9/11/2026, tavola di Roberto): prima solo il grigio ferro, poi la palette allargata con un accento blu cielo.
  # Il grigio ferro primo anche dopo, così resta fermo e gli altri entrano; sopra ferro e carbonio, sotto cemento, blu e
  # alluminio, col blu al centro (scelta di Roberto). Testi: bozza
  - type: palette
    w: 12
    h: 5
    md: { w: 8, h: 5 }
    sm: { w: 4, h: 8 }
    eyebrow: "Colori"
    prima:
      nome: "Prima"
      title: "Il colore di prima"
      body: "Un solo colore, il **grigio ferro**: serio e solido, ma da solo non bastava a distinguere titoli, fondi e richiami."
      colori:
        - { nome: "Grigio Ferro", hex: "#3a3535" }
    dopo:
      nome: "Dopo"
      title: "La palette nuova"
      body: "Il grigio ferro resta, con **altri grigi**, dal carbonio all'alluminio, come i profili dei serramenti. E un accento **blu cielo** per quello che deve farsi notare."
      colori:
        - { nome: "Grigio Ferro", hex: "#3a3535" }
        - { nome: "Grigio Carbonio", hex: "#1d1b1b" }
        - { nome: "Grigio Cemento", hex: "#878787", secondario: true }
        - { nome: "Blu Cielo", hex: "#2e38c4", secondario: true }
        - { nome: "Grigio Alluminio", hex: "#d4d4d4", secondario: true }
  # le due brochure A4, a turno nel carosello (9/11/2026, scelta di Roberto): i serramenti e MINIMA. Mockup originali in
  # sorgenti/spazioquadro/ (a4-folded-brochure-4.png, a4-folded-brochure-2.png), rifilati a 16:9 attorno alla brochure,
  # così il carosello non le taglia
  - type: text
    w: 12
    h: 9
    md: { w: 8, h: 7 }
    sm: { w: 4, h: 4 }
    size: s
    eyebrow: "Stampati"
    title: "Le brochure"
    ingrandisci: true
    body: "Due brochure A4: una con **tutti i serramenti**, una facciata per linea, e una tutta per **MINIMA**, la porta in vetro e alluminio.\n\nFoto grandi, **testi brevi** e i dettagli tecnici in chiaro: finiture, cerniere, vetri."
    immagini:
      - image: ./brochure-serramenti.jpg
        alt: "Mockup della brochure A4 dei serramenti Spazioquadro, aperta su un piano scuro, fronte e retro: una facciata per linea (Magis 40, Drop, Amalfi, MINIMA, Alunext, Kömmerling 76 MD) e in copertina Eccellenza in ogni infisso"
      - image: ./brochure-minima.jpg
        alt: "Mockup della brochure A4 di MINIMA aperta su un piano grigio: in copertina design fra vetro e luce, dentro i dettagli di anta, cover e finiture dei vetri"
  # il sito sul portatile, che scorre fino al footer e torna su (9/11/2026, scelta di Roberto): mockup
  # sorgenti/mockup/mockup-portatile.psd, pagina fotografata da spazioquadro.net, tutto da tools/portatile-mockup.py
  - type: portatile
    w: 12
    h: 9
    md: { w: 8, h: 7 }
    sm: { w: 4, h: 4 }
    cartella: spazioquadro
    eyebrow: "Web · sito"
    title: "spazioquadro.net"
    # testo: bozza dal sito, da rileggere con Roberto
    body: "Un sito pensato per **rivenditori e professionisti**: le linee di serramenti con le loro schede, la produzione a Itri, le consegne e un modulo per **diventare partner**.\n\nScuro, col blu del marchio, e con i **dati in chiaro**."
    alt: "Il sito di Spazioquadro su un portatile: la pagina scorre dalla testata, Porte e finestre d'eccellenza per aziende e privati, fino al footer, e torna su"
    button: { label: "Visita il sito di Spazioquadro", href: "https://spazioquadro.net" }
---
