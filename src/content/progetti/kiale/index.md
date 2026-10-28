---
title: "Kiale food service"
tags: [Ristorazione, Ospitalità, Branding, Print, Packaging]
period: "dal 2024"
description: "Sistema di brand per un format di ristorazione veloce con ingredienti locali."
featured: true
marchio: cliente
shape: { w: 4, h: 5 }
cells:
  # barattoli che girano, tutti in una cella: etichette 14×6 sul vaso basso, vellutate 14×9 sul vaso alto, alla stessa
  # scala (h 6: il vaso alto, limitato dall'altezza, arriva con la cima dove comincia il testo). Un terzo della larghezza, in colonna: testo in alto, barattoli sotto. Etichette in ./etichette (tools/barattolo-mockup.py --etichette).
  # Colori dell'interno chiari: si moltiplicano sul vetro. Testo: bozza da rivedere
  - type: barattolo
    w: 4
    h: 6
    md: { w: 4, h: 6 }
    sm: { w: 4, h: 6 }
    eyebrow: "Packaging · etichette"
    title: "Una famiglia di etichette per tutta la linea"
    body: "Confetture, composte, sott'olio, sughi pronti e vellutate: per ogni prodotto la stessa struttura, con ingredienti a sinistra, nome al centro e valori nutrizionali a destra. Cambiano colori e illustrazione. Due formati: 14×6 cm per i vasetti, 14×9 per le vellutate."
    barattoli:
      - { nome: "Confettura di fragole", mockup: vaso-basso, etichetta: ./etichette/confettura-fragole.webp, bordo: ./etichette/confettura-fragole.svg, parola: ./etichette/parola-confetture.svg, tipo: pezzi, dentro: "#a3141c", pezzi: "#c8202a" }
      - { nome: "Confettura di albicocche", mockup: vaso-basso, etichetta: ./etichette/confettura-albicocche.webp, bordo: ./etichette/confettura-albicocche.svg, parola: ./etichette/parola-confetture.svg, tipo: pezzi, dentro: "#e2741c", pezzi: "#f7a440" }
      - { nome: "Confettura di prugne", mockup: vaso-basso, etichetta: ./etichette/confettura-prugne.webp, bordo: ./etichette/confettura-prugne.svg, parola: ./etichette/parola-confetture.svg, tipo: pezzi, dentro: "#4a1238", pezzi: "#6e2a5a" }
      - { nome: "Zacuscă · composta di verdure", mockup: vaso-basso, etichetta: ./etichette/composta-zacusca.webp, bordo: ./etichette/composta-zacusca.svg, parola: ./etichette/parola-sottolio.svg, tipo: crema, dentro: "#d4542a" }
      - { nome: "Filetti di carote sott'olio", mockup: vaso-basso, etichetta: ./etichette/sottolio-filetti-carote.webp, bordo: ./etichette/sottolio-filetti-carote.svg, parola: ./etichette/parola-sottolio.svg, tipo: filetti, dentro: "#f2c25a", pezzi: "#f0761a" }
      - { nome: "Filetti di melanzane sott'olio", mockup: vaso-basso, etichetta: ./etichette/sottolio-filetti-melanzane.webp, bordo: ./etichette/sottolio-filetti-melanzane.svg, parola: ./etichette/parola-sottolio.svg, tipo: filetti, dentro: "#c9a356", pezzi: "#6b4a2a" }
      - { nome: "Pomodoro fresco · sugo pronto", mockup: vaso-basso, etichetta: ./etichette/sugo-pomodoro-fresco.webp, bordo: ./etichette/sugo-pomodoro-fresco.svg, parola: ./etichette/parola-sughi.svg, tipo: crema, dentro: "#d8301c" }
      - { nome: "Pomodoro datterino · sugo pronto", mockup: vaso-basso, etichetta: ./etichette/sugo-datterino.webp, bordo: ./etichette/sugo-datterino.svg, parola: ./etichette/parola-sughi.svg, tipo: pezzi, dentro: "#d02a18", pezzi: "#e8442a" }
      - { nome: "Pasta e fagioli · sugo pronto", mockup: vaso-basso, etichetta: ./etichette/sugo-pasta-fagioli.webp, bordo: ./etichette/sugo-pasta-fagioli.svg, parola: ./etichette/parola-paste.svg, tipo: pezzi, dentro: "#b8502e", pezzi: "#e8c8a0" }
      - { nome: "Vellutata di carote, patate e piselli", mockup: vaso-alto, etichetta: ./etichette/vellutata-carote-patate-piselli.webp, bordo: ./etichette/vellutata-carote-patate-piselli.svg, parola: ./etichette/parola-vellutate.svg, tipo: crema, dentro: "#ffa83c" }
      - { nome: "Vellutata di zucca e patate", mockup: vaso-alto, etichetta: ./etichette/vellutata-zucca-patate.webp, bordo: ./etichette/vellutata-zucca-patate.svg, parola: ./etichette/parola-vellutate.svg, tipo: crema, dentro: "#ffb83a" }
  # etichette a striscia delle vaschette termosaldate (135×45 mm), una sotto l'altra su fondo trasparente (la carta
  # della cella): python tools/strisce.py src/content/progetti/kiale/strisce.webp sorgenti/kiale/striscia-*.pdf
  # (grigliate, ripassato, tielle). Il mockup della vaschetta (tools/vaschetta-mockup.py) è per ora messo da parte
  - type: media
    w: 4
    h: 4
    md: { w: 4, h: 4 }
    sm: { w: 4, h: 4 }
    label: false
    image: ./strisce.webp
    alt: "Tre etichette a striscia Kiale per le vaschette: Grigliate al forno, Ripassato in padella, Tielle della tradizione"
---
