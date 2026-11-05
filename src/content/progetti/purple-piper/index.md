---
# nebulosa con la sfumatura già cotta da Roberto (originale 3814×2174: sorgenti/purple-piper/ppmm.mp4): AV1 .webm 1920 px crf 32 (1,5 MB),
# H.264 .mp4 1280 px crf 22 (2 MB), poster .webp; sopra il logo. logo.svg con viewBox allargato alla tavola 4×3 (stessa scatola del logo di prima, centrato);
# logo-orizzontale.svg: per dopo
video: /media/purple-piper.mp4
overlay: ./logo.svg
title: "Purple Piper progressive web radio"
tags: [Consulenza, Media, Logo, Branding, Web]
period: "dal 2018"
description: "Purple Piper è la radio di **Andrea**, da Cascina (Pisa): una vita di rock progressivo e una collezione enorme di dischi, vinili e cassette. Trasmette su Shoutcast dal 2008, ma si ascoltava quasi solo dai siti che raccolgono radio da tutto il mondo: il suo sito non era responsive e funzionava su pochi dispositivi.\n\nNel 2018 ho disegnato **la nuova immagine** e un **sito dedicato**: la radio si ascolta da qualsiasi dispositivo, col **brano in onda in diretta**, il file .pls per il proprio player e la playlist delle ultime ore su Shoutcast.\n\nDa allora radio e sito crescono insieme, con aggiornamenti anche recenti."
featured: true
shape: { w: 4, h: 4 }
# il primo logo, dal vecchio sito di prima del 2018 (banner 300×250 recuperato e rimontato da Roberto): intero, sul suo rosso
contesto:
  foto: ./logo-pre-2018.png
  alt: "Il primo logo di Purple Piper, dal vecchio sito di prima del 2018: scritta rossa in rilievo su fondo rosso, Progressive Rock e una croce bianca"
  fondo: "#e23736"
cells:
  # il sito sul telefono (screenshot di Roberto del 3/11/2026, 822×1140): testo in alto, sotto lo screenshot fermo,
  # poi due righe e il bottone per il sito
  - type: text
    w: 4
    h: 8
    size: s
    eyebrow: "Il sito"
    title: "Una radio che si ascolta ovunque"
    body: "Il vecchio sito funzionava su pochi dispositivi. Quello nuovo è **responsive**: la radio si ascolta dal telefono come dal computer, col **brano in onda in diretta**, il player e la **playlist** delle ultime ore."
    immagini:
      - image: ./sito-telefono.png
        alt: "Il sito di Purple Piper sul telefono: il logo rosso sopra un dipinto con una figura alata, e sotto il pannello viola col tasto Live, il brano in onda, Playlist, Player e il motto In prog we trust"
    after: "In fondo, i **link** alle case del prog: Arlequins, Prog Archives, Musicstack, Bandcamp e Discogs."
    button: { label: "Visita il sito", href: "https://www.purplepiper.eu" }
  # la croce barbata e la P del logo coi colori (file di Roberto del 4/11/2026), la croce sopra la P, disegnate insieme, una cosa
  # alla volta: contorno, buco, linea sfumata, il rosso, poi cade l'ombra (gruppo "ombra"). La P: sorgenti/purple-piper/p-live.svg,
  # testo in tracciati con tools/svg-testo-tracciati.py; la croce (stessi spessori della P) così com'è, con le stesse annotazioni. Prima la P di costruzione coi tratti vivi
  # (costruzione-p.svg, 2/11/2026), ancora nella cartella. Alta 8 per starci tutte e due. Titolo e testo da scrivere
  - type: costruzione
    w: 4
    h: 8
    md: { w: 4, h: 8 }
    disegno: [./costruzione-croce.svg, ./costruzione-p-live.svg]
    alt: "La croce barbata e la P di Purple Piper, rosse con il contorno nero, una linea interna che sfuma dal viola al cremisi e l'ombra nera in basso a sinistra"
    title: "La nuova P"
    body: "Testo da scrivere."
  # la radio in diretta: la stessa della cella sul tavolo (un solo lettore per la pagina, scripts/radio.ts)
  - type: radio
    w: 4
    h: 2
    label: false
    eyebrow: "Radio live player"
  # merchandising (materiali di Roberto del 2/11/2026; originali in sorgenti/purple-piper, foto ridotte a 1600 px):
  # le due grafiche SVG così come sono, ognuna con la sua maglia, e le spille
  # le due maglie nella stessa cella, una sopra l'altra: la viola di schiena (tagliata in orizzontale attorno al motto:
  # provata intera il 2/11/2026, Roberto la preferisce tagliata), sotto la bianca
  - type: media
    w: 6
    h: 8
    sm: { w: 4, h: 6 }
    image: ./maglia-motto.jpg
    alt: "Maglia viola di Purple Piper vista di schiena, col motto In prog we trust tra le croci rosse"
    ingrandisci: true
    seconda:
      image: ./maglia-cerchio.jpg
      alt: "Maglia bianca di Purple Piper con la grafica circolare, le PP al centro e la scritta Purple Piper Progressive Rock, su pannelli fonoassorbenti viola"
  # la grafica circolare e sotto, nella stessa cella, le spille
  - type: media
    w: 4
    h: 8
    image: ./cerchio-pp.svg
    alt: "Grafica circolare di Purple Piper: le PP al centro, due croci e attorno la scritta Purple Piper Progressive Rock"
    ingrandisci: true
    seconda:
      image: ./spille.jpg
      alt: "Spille viola di Purple Piper con le PP rosse, alcune girate sul retro"
  # sotto il cerchio, larga come lui: stretta 2 la griglia (row dense) la portava nel buco accanto alla hero
  - type: media
    w: 4
    h: 7
    image: ./in-prog-we-trust.svg
    alt: "Il motto In prog we trust, rosso con le croci, in colonna"
---
