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
  # la P del logo coi tratti vivi (file di Roberto del 2/11/2026), si disegna da sola: titolo e testo segnaposto, da scrivere
  - type: costruzione
    w: 4
    h: 6
    md: { w: 4, h: 6 }
    disegno: ./costruzione-p.svg
    alt: "Costruzione della P di Purple Piper: il tratteggio dell'ombra, il contorno rosso della lettera e i contorni viola del bordo"
    title: "Come nasce la P"
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
