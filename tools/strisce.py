# Etichette a striscia (PDF vettoriali) una sotto l'altra, centrate, su fondo trasparente (si vede la carta della cella,
# che segue Inverti), nella proporzione della cella. Solo sviluppo. Serve: pip install --user pymupdf pillow
#   python tools/strisce.py <uscita.webp> a.pdf b.pdf … [--cella 1:1] [--larga 0.8] [--spazio 0.035] [--px 2000]
#   --larga: larghezza delle strisce sulla cella; --spazio: spazio fra due strisce, sulla larghezza della cella
#   --sparse <seme>: flatlay, le strisce appoggiate alla rinfusa, più larghe della cella (--larga 1.1): posizione,
#   inclinazione, lato e ordine sopra/sotto a caso, ma nessuna copre le scritte di un'altra (controllato sui pixel: si
#   può coprire solo la carta vuota e la riga di 200 grammi e logo) e insieme coprono la cella. Prova molte posizioni per
#   striscia e tiene la prima che va; stesso seme = stessa disposizione
import random
import sys
import fitz
from PIL import Image, ImageFilter

args = sys.argv[1:]
opz = {'--cella': '1:1', '--larga': '0.8', '--spazio': '0.035', '--px': '2000', '--sparse': '', '--copre': '0.97'}
if '--sparse' in args and '--larga' not in args: opz['--larga'] = '1.1'
for k in list(opz):
    if k in args:
        i = args.index(k); opz[k] = args[i + 1]; del args[i:i + 2]
uscita, pdf = args[0], args[1:]

cw, ch = map(int, opz['--cella'].split(':'))
W = int(opz['--px']); H = round(W * ch / cw)
larga, spazio = round(W * float(opz['--larga'])), round(W * float(opz['--spazio']))
strisce = []
for f in pdf:
    p = fitz.open(f)[0]
    pix = p.get_pixmap(matrix=fitz.Matrix(larga / p.rect.width, larga / p.rect.width), alpha=False)
    strisce.append(Image.frombytes('RGB', (pix.width, pix.height), pix.samples))
if opz['--sparse']:
    import numpy as np
    INCLINA, SPOSTA, K = 9.0, 0.2, 8                  # gradi, frazione della cella, riduzione per i controlli
    n, h = len(strisce), strisce[0].height
    w8, h8 = W // K, H // K

    def scritte(img):
        # pixel delle scritte che non si possono coprire: staccano dal fondo, sopra la riga di 200 grammi e logo
        a = np.asarray(img, dtype=int)
        fondo = np.median(a[::4, ::4].reshape(-1, 3), axis=0)
        m = np.abs(a - fondo).sum(2) > 140
        m[int(img.height * 0.74):] = False
        return Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))   # con un po' di respiro

    # maschere già ridotte (carta, scritte): si ruotano piccole, a ogni prova
    ridotte = [(Image.new('L', (s.width // K, s.height // K), 255), scritte(s).resize((s.width // K, s.height // K))) for s in strisce]

    def posa(i, a, x, y):
        # maschere (carta, scritte) della striscia i inclinata di a col centro in (x, y), su una tela larga il triplo:
        # il bordo della cella può tagliare le scritte ai lati, non sopra né sotto
        def su_tela(img):
            r = img.rotate(a, resample=Image.BILINEAR, expand=True, fillcolor=0)
            c = Image.new('L', (3 * w8, h8), 0); c.paste(r, (round(w8 + x / K - r.width / 2), round(y / K - r.height / 2)))
            return np.asarray(c) > 127, (np.asarray(r) > 127).sum()
        (carta, _), (scr, tutte) = su_tela(ridotte[i][0]), su_tela(ridotte[i][1])
        return carta[:, w8:2 * w8], scr[:, w8:2 * w8], scr.sum() >= tutte

    COPRE = float(opz.get('--copre', 0.97))         # quanta cella devono coprire (il resto è carta tra le strisce)
    bloccate, migliore = 0, 0.0
    for prova in range(200):
        caso = random.Random(int(opz['--sparse']) * 1000 + prova)
        ordine = list(range(n)); caso.shuffle(ordine)
        messe = []                                     # (i, angolo, x, y, z, carta, scritte)
        riuscito = True
        for k, i in enumerate(ordine):
            base = (k + 0.5) / n * H                  # sparse in altezza, dall'alto in basso
            if k == 0: verso = caso.choice((-1, 1))
            lato = verso * (-1) ** k                   # una a destra, una a sinistra (quasi sempre)
            for _ in range(400):
                a = caso.uniform(-INCLINA, INCLINA)
                x = W / 2 + lato * caso.uniform(0.03, SPOSTA) * W * (1 if caso.random() < 0.8 else -1)
                y = base + caso.uniform(-0.45, 0.45) * h
                z = caso.random()
                carta, scr, intere = posa(i, a, x, y)
                # nessuno copre le scritte di un altro: chi sta sopra non tocca le scritte di chi sta sotto
                if intere and all(not (carta & m[6]).any() if z > m[4] else not (m[5] & scr).any() for m in messe):
                    messe.append((i, a, x, y, z, carta, scr)); break
            else:
                riuscito = False; break
        if not riuscito: bloccate += 1; continue
        coperta = np.logical_or.reduce([m[5] for m in messe]).mean()
        migliore = max(migliore, coperta)
        if coperta > COPRE: break
    else:
        sys.exit(f'nessuna disposizione: {bloccate} tentativi senza posto per le scritte, copertura migliore {migliore:.1%}; '
                 'cella più alta, --larga più piccola, meno strisce o --copre più basso')
    print(f'tentativo {prova}, cella coperta {coperta:.1%}')
    tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for i, a, x, y, z, _, _ in sorted(messe, key=lambda m: m[4]):
        foglio = strisce[i].convert('RGBA').rotate(a, resample=Image.BICUBIC, expand=True)
        ox, oy = x - foglio.width / 2, y - foglio.height / 2
        # ombra corta e morbida: la carta è appoggiata, la luce viene dall'alto
        ombra = Image.new('RGBA', foglio.size, (28, 26, 23, 0))
        ombra.putalpha(foglio.getchannel('A').point(lambda v: v * 0.22).filter(ImageFilter.GaussianBlur(W * 0.006)))
        tela.alpha_composite(ombra, (round(ox), round(oy + W * 0.004)))
        tela.alpha_composite(foglio, (round(ox), round(oy)))
    tela.save(uscita, quality=92)
    print(uscita, tela.size, 'flatlay, seme', opz['--sparse'])
    sys.exit()
alta = sum(s.height for s in strisce) + spazio * (len(strisce) - 1)
if alta > H * 0.94: sys.exit(f'non ci stanno: alte {alta} px su {H}; abbassa --larga o --spazio')
tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
y = (H - alta) // 2
for s in strisce:
    tela.paste(s, ((W - s.width) // 2, y)); y += s.height + spazio
tela.save(uscita, quality=92)
print(uscita, tela.size, f'strisce {larga} px, spazio {spazio} px')
