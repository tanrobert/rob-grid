# Portatile col sito che scorre (cella `portatile`, 9/11/2026, Spazioquadro). Dal PSD "sorgenti/mockup/mockup-portatile.psd"
# (MacBook Pro 16" della serie Mockupia: scena fotografica nello smart object "Device", schermo nello smart object "Screen",
# 3456×2234, messo in prospettiva sui quattro angoli e ritagliato da una maschera: tacca, angoli tondi, base davanti).
# Il sito non è un video: la pagina intera è un'immagine alta che la cella mette in prospettiva con un matrix3d (gli
# angoli dello schermo) e fa scorrere col CSS, così il testo resta nitido e il file è leggero.
#
# Scrive:
#   public/portatile/geometria.json   rapporto della scena, riquadro della maschera (vetro) in % della scena, matrice
#                                     dallo schermo (SCHERMO px di larghezza) al vetro, in unità della scena (larga 1000)
#   public/portatile/schermo.png      la maschera dello schermo sul riquadro del vetro (alfa)
# e, con --sito, nella cartella del sito (public/portatile/<nome>/):
#   pagina.webp   la pagina senza la barra fissa, larga LARGA px     barra.webp   la barra fissa, in cima allo schermo
#   scena.webp    la scena col sito fermo in cima (senza JavaScript, e finché la pagina non è scaricata)
#   sito.json     proporzioni di pagina e barra
# La pagina si fotografa a 1728×1117 (lo schermo a 1×) con puppeteer: pagina intera con la barra nascosta, e la barra
# ritagliata dalla cima di una foto con la barra (vedi la ricetta di Spazioquadro sotto). Solo sviluppo.
# Serve: pip install --user psd-tools pillow numpy.
#   python tools/portatile-mockup.py sorgenti/mockup/mockup-portatile.psd [--sito <pagina.png> <barra.png> public/portatile/<nome>]
# Spazioquadro (9/11/2026): spazioquadro.net con riduci movimento (le entrate non lasciano niente nascosto), scorsa tutta
# prima della foto (immagini lazy), banner dei cookie nascosto; la barra (nav fissa, 72 px) dalla cima della foto intera.
import json
import os
import sys
import numpy as np
from PIL import Image
from psd_tools import PSDImage

SCHERMO = 1000                       # px di larghezza dello schermo nella cella (unità del matrix3d)
LARGA = 1100                         # px della pagina e della barra salvate
SCENA = 2000                         # px della scena salvata
TAGLIO = (600, 900, 5550, 3684)      # la scena attorno al portatile e all'ombra, 16:9, sulla tela del PSD

args = sys.argv[1:]
sito = None
if '--sito' in args:
    i = args.index('--sito'); sito = args[i + 1:i + 4]; del args[i:i + 4]
p = PSDImage.open(args[0])
schermo = next(l for l in p.descendants() if l.name == 'Screen' and l.kind == 'smartobject')
device = next(l for l in p.descendants() if l.name == 'Device' and l.kind == 'smartobject')
t = schermo.smart_object.transform_box
angoli = [(t[i], t[i + 1]) for i in range(0, 8, 2)]      # alto sinistra, alto destra, basso destra, basso sinistra
interno = PSDImage.open(__import__('io').BytesIO(schermo.smart_object.data))
rapporto_schermo = interno.width / interno.height
alto = SCHERMO / rapporto_schermo
cartella = os.path.join('public', 'portatile')
os.makedirs(cartella, exist_ok=True)

def omografia(da, a):
    """i coefficienti h (h22 = 1) che portano i quattro punti da nei quattro punti a"""
    M, v = [], []
    for (x, y), (X, Y) in zip(da, a):
        M.append([x, y, 1, 0, 0, 0, -X * x, -X * y]); v.append(X)
        M.append([0, 0, 0, x, y, 1, -Y * x, -Y * y]); v.append(Y)
    return list(np.linalg.solve(np.array(M, float), np.array(v, float))) + [1.0]

# il vetro: il riquadro della maschera, in unità della scena (larga 1000) e in %
x0, y0, x1, y1 = TAGLIO
u = 1000 / (x1 - x0)
mx0, my0, mx1, my1 = schermo.mask.bbox
vetro = dict(left=(mx0 - x0) / (x1 - x0) * 100, top=(my0 - y0) / (y1 - y0) * 100,
             width=(mx1 - mx0) / (x1 - x0) * 100, height=(my1 - my0) / (y1 - y0) * 100)
# dallo schermo (SCHERMO × alto px) agli angoli, in unità della scena, dall'angolo del vetro
h = omografia([(0, 0), (SCHERMO, 0), (SCHERMO, alto), (0, alto)], [((x - mx0) * u, (y - my0) * u) for x, y in angoli])
# matrix3d per colonne: x' = h0 x + h1 y + h2, y' = h3 x + h4 y + h5, w = h6 x + h7 y + 1
matrice = [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, h[8]]
geo = {
    'rapporto': round((x1 - x0) / (y1 - y0), 4),
    'vetro': {k: round(v, 3) for k, v in vetro.items()},
    'unita': round((mx1 - mx0) * u, 3),          # larghezza del vetro in unità: --k = larghezza vera / unita
    'schermo': [SCHERMO, round(alto, 3)],
    'matrice': [float(f'{v:.9g}') for v in matrice],
}
with open(os.path.join(cartella, 'geometria.json'), 'w') as f: json.dump(geo, f)
maschera = schermo.mask.topil()
nera = Image.new('RGBA', maschera.size, (0, 0, 0, 0)); nera.putalpha(maschera)
nera.resize((1000, round(1000 * maschera.height / maschera.width)), Image.LANCZOS).save(os.path.join(cartella, 'schermo.png'), optimize=True)
print('geometria', json.dumps(geo))

if sito:
    pagina_png, barra_png, uscita = sito
    os.makedirs(uscita, exist_ok=True)
    pagina, barra = Image.open(pagina_png).convert('RGB'), Image.open(barra_png).convert('RGB')
    k = LARGA / pagina.width
    pagina.resize((LARGA, round(pagina.height * k)), Image.LANCZOS).save(os.path.join(uscita, 'pagina.webp'), quality=80, method=6)
    barra.resize((LARGA, round(barra.height * k)), Image.LANCZOS).save(os.path.join(uscita, 'barra.webp'), quality=85, method=6)
    with open(os.path.join(uscita, 'sito.json'), 'w') as f:
        json.dump({'pagina': round(pagina.height / pagina.width, 5), 'barra': round(barra.height / barra.width, 5)}, f)
    # la scena col sito fermo in cima: la prima schermata (barra compresa) in prospettiva, dentro la maschera
    prima = pagina.crop((0, 0, pagina.width, round(pagina.width / rapporto_schermo)))
    prima.paste(barra, (0, 0))
    c = omografia(angoli, [(0, 0), (prima.width, 0), (prima.width, prima.height), (0, prima.height)])[:8]
    sopra = prima.transform((p.width, p.height), Image.PERSPECTIVE, tuple(c), Image.BICUBIC)
    # la scena: lo smart object Device (più alto della tela: parte da y −240)
    scena = device.composite().convert('RGB').crop((0, -device.bbox[1], p.width, -device.bbox[1] + p.height))
    m = Image.new('L', (p.width, p.height), 0); m.paste(maschera, (mx0, my0))
    scena = Image.composite(sopra, scena, m)
    scena = scena.crop(TAGLIO)
    scena.resize((SCENA, round(SCENA * scena.height / scena.width)), Image.LANCZOS).save(os.path.join(uscita, 'scena.webp'), quality=82, method=6)
    print(uscita, 'pagina', LARGA, round(pagina.height * k))
