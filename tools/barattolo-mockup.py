# Mockup Photoshop di un vasetto → file leggeri per il laboratorio del barattolo che gira (tools/pages/barattolo.html).
# Solo sviluppo. Serve: pip install --user psd-tools pymupdf
#
#   python tools/barattolo-mockup.py <mockup.psd> <nome>                        → public/barattolo/<nome>/
#   python tools/barattolo-mockup.py --etichette <cartella> nome=file.pdf …     → <cartella>/<nome>.webp
#       (file PDF di stampa o immagini PNG/JPG; di solito la cartella è src/content/progetti/<progetto>/etichette)
#
# PSD della serie di mockups-design.com (stessa luce, vasetti sospesi e inclinati), in due varianti:
#   vaso-basso  (Food Jar Mockup 2): contenuto su un livello a parte (Inside color, maschera), Jar, Lid (maschera),
#               Highlights, Shadows (ombra sul piano, maschera)
#   vaso-alto   (Large Honey Jar Mockup 3): contenuto (miele) dentro il livello Jar, che si rende neutro;
#               gruppo Lid con la sua maschera, ombre e luci; Shadows (ombra sul piano, pixel)
#   tutti e due: gruppo Label con l'oggetto avanzato e le sue ombre e luci agganciate.
# Per ognuno:
#   1. misura il cilindro su cui è avvolta l'etichetta (centro, inclinazione, raggio, fascia, ellisse)
#      confrontando la sua sagoma con quella di un cilindro inclinato (coincidenza stampata);
#   2. ritaglia attorno al vasetto e alla sua ombra, a 1050 px di larghezza, ed esporta i livelli in WebP;
#   3. scrive geometria.json, che il laboratorio legge da solo.
import json, re, sys
from pathlib import Path
import numpy as np
from PIL import Image

BASE = Path(__file__).parent.parent / 'public' / 'barattolo'
LARGO = 1050


def etichette(out, args):
    """etichette piatte a 1280 px di larghezza (sul sito sono alte al massimo ~500 px reali), in WebP: dai PDF di stampa o da immagini RGB"""
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    for arg in args:
        nome, _, f = arg.rpartition('=')     # "fragole=etichetta.pdf" → fragole.webp
        nome = nome or re.sub(r'[^a-z0-9]+', '-', Path(f).stem.lower()).strip('-')
        if f.lower().endswith('.pdf'):
            import fitz
            pagina = fitz.open(f)[0]
            pix = pagina.get_pixmap(dpi=round(1280 / (pagina.rect.width / 72)), colorspace=fitz.csRGB)
            img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        else:
            img = Image.open(f).convert('RGB')
            img = img.resize((1280, round(img.height * 1280 / img.width)), Image.LANCZOS)
        img.save(out / f"{nome}.webp", quality=80)
        print('etichetta', nome, f'{img.width}×{img.height}', f'(proporzioni {img.width / img.height:.2f})')


if sys.argv[1] == '--etichette':
    etichette(sys.argv[2], sys.argv[3:]); sys.exit()

from psd_tools import PSDImage
psd_path, nome = sys.argv[1], sys.argv[2]
psd = PSDImage.open(psd_path)
per_nome = {}
for l in psd.descendants(): per_nome.setdefault(l.name, []).append(l)
tipo = 'vaso-basso' if 'Inside color' in per_nome else 'vaso-alto'
gruppo = next(l for l in psd if l.name == 'Label')
oggetto = next(l for l in gruppo if l.kind == 'smartobject')
print('tipo', tipo)


def per(n, kind=None, clip=None, dentro=None):
    return next(l for l in (dentro or per_nome[n]) if l.name == n and (kind is None or l.kind == kind) and (clip is None or l.clipping == clip))


# --- 1. geometria: cilindro inclinato che meglio copre la sagoma dell'etichetta (salita a coordinate) ---
A = np.array(oggetto.composite().convert('RGBA'))[..., 3] > 127
ox, oy = oggetto.bbox[:2]
k, pad = 4, 150
gy, gx = np.mgrid[oy - pad:oy + A.shape[0] + pad:k, ox - pad:ox + A.shape[1] + pad:k]
iy, ix = gy - oy, gx - ox
dentro = (iy >= 0) & (iy < A.shape[0]) & (ix >= 0) & (ix < A.shape[1])
T = np.zeros(gx.shape, bool); T[dentro] = A[iy[dentro], ix[dentro]]
gx, gy = gx.astype(float), gy.astype(float)


ignora = np.zeros_like(T)
if tipo == 'vaso-alto':
    # l'etichetta del mockup continua con una fascetta stretta (~360 px) che sale sul coperchio e scende sotto:
    # raddrizzata la sagoma lungo l'orizzontale dell'etichetta, restano solo le righe lunghe almeno 800 px
    # (la fascia attorno al vaso). Quello che si toglie non conta nella misura, né come giusto né come sbagliato.
    q = np.array(oggetto.smart_object.transform_box).reshape(4, 2)
    gradi = np.degrees(np.arctan2(*(q[1] - q[0])[::-1]))
    dritta = np.array(Image.fromarray(T.astype(np.uint8) * 255).rotate(gradi, Image.NEAREST)) > 127
    lunghe = np.zeros_like(dritta)
    for i, riga in enumerate(dritta):
        bordi = np.flatnonzero(np.diff(np.r_[0, riga.astype(int), 0]))
        for a, b in zip(bordi[::2], bordi[1::2]):
            if b - a >= 800 / k: lunghe[i, a:b] = True
    fascia = np.array(Image.fromarray(lunghe.astype(np.uint8) * 255).rotate(-gradi, Image.NEAREST)) > 127
    ignora = T & ~fascia
    T = T & fascia


def locale(cx, cy, ang, X, Y):
    c, s = np.cos(-ang), np.sin(-ang)
    return c * (X - cx) - s * (Y - cy), s * (X - cx) + c * (Y - cy)


def sagoma(p):
    cx, cy, ang, R, t0, t1, e, ta, tb = p
    x, y = locale(cx, cy, ang, gx, gy)
    th = np.arcsin(np.clip(x / R, -1, 1)); t = y - e * R * np.cos(th)
    return (np.abs(x) < R) & (t >= t0) & (t <= t1) & (th >= ta) & (th <= tb)


def coincidenza(p):
    M = sagoma(p) & ~ignora; return (M & T).sum() / (M | T).sum()


def sali(p):
    passi = np.array([40, 40, np.radians(3), 30, 40, 40, 0.03, 0.1, 0.1])
    meglio = coincidenza(p)
    while passi[0] >= 0.5:
        migliorato = False
        for i in range(len(p)):
            for d in (1, -1):
                r = p.copy(); r[i] += d * passi[i]; v = coincidenza(r)
                if v > meglio: meglio, p, migliorato = v, r, True
        if not migliorato: passi *= 0.5
    return meglio, p

# partenze dal riquadro di trasformazione dell'oggetto avanzato. Il suo lato alto (q0 → q1) è l'orizzontale
# dell'etichetta, quella che gira attorno: dà l'inclinazione E il verso. L'asse girato di 180° con l'ellisse
# al contrario copre la stessa sagoma, ma disegnerebbe l'etichetta capovolta: si cerca solo il segno dell'ellisse.
# Più vedute e fasce di partenza (attorno al centro della sagoma), poi qualche scossa attorno alla migliore.
q = np.array(oggetto.smart_object.transform_box).reshape(4, 2)
c0 = [gx[T].mean(), gy[T].mean()]
giro = q[1] - q[0]
a0 = np.arctan2(giro[1], giro[0])
alto = (lambda x, y: np.ptp(y))(*locale(*c0, a0, gx[T], gy[T]))
partenze = [np.array([*c0, a0, np.linalg.norm(giro) / 2, alto * f0, alto * f1, e0, -1.5, 1.5])
            for e0 in (-0.4, -0.25, -0.1, 0.1, 0.25, 0.4) for f0, f1 in ((-0.5, 0.5), (-0.6, 0.4), (-0.4, 0.6))]
meglio, p = max((sali(x) for x in partenze), key=lambda x: x[0])
caso = np.random.default_rng(1)
for _ in range(6):
    v, r = sali(p + caso.normal(0, 1, 9) * np.array([20, 20, np.radians(1), 15, 20, 20, 0.02, 0.05, 0.05]))
    if v > meglio: meglio, p = v, r
print(f'coincidenza con la sagoma del mockup: {meglio:.1%}')
cx, cy, ang, R, t0, t1, e, *_ = p

# --- 2. livelli ritagliati: attorno a vasetto e coperchio, con spazio sotto e a destra per l'ombra sul piano ---
if tipo == 'vaso-basso':
    X0, Y0, X1, Y1 = 950, 450, 3500, 2800
else:
    bb = np.array([next(l for l in psd if l.name == n).bbox for n in ('Jar', 'Lid')])
    X0, Y0 = max(0, bb[:, 0].min() - 300), max(0, bb[:, 1].min() - 200)
    X1, Y1 = min(psd.width, bb[:, 2].max() + 300), min(psd.height, bb[:, 3].max() + 450)
K = LARGO / (X1 - X0)
W, H = LARGO, round((Y1 - Y0) * K)
OUT = BASE / nome; OUT.mkdir(parents=True, exist_ok=True)


def piazza(img, bbox, mode='RGBA', fondo=(0, 0, 0, 0)):
    tela = Image.new(mode, psd.size, fondo)
    tela.paste(img, bbox[:2])
    return tela.crop((X0, Y0, X1, Y1)).resize((W, H), Image.LANCZOS)


def sfuma(m, f=40):
    """niente tagli netti ai bordi del ritaglio"""
    m = m.astype(float)
    m[:, :f] *= np.linspace(0, 1, f); m[:, -f:] *= np.linspace(1, 0, f)
    m[:f, :] *= np.linspace(0, 1, f)[:, None]; m[-f:, :] *= np.linspace(1, 0, f)[:, None]
    return m


def salva(m, nome_file, q=80):
    Image.fromarray(np.clip(m, 0, 255).astype(np.uint8)).save(OUT / f'{nome_file}.webp', quality=q)


def rgba(l):
    return np.array(piazza(l.topil().convert('RGBA'), l.bbox)).astype(float)


# coordinate dell'asse (x attorno, y lungo l'asse) per ogni pixel del ritaglio
Yp, Xp = np.mgrid[0:H, 0:W] / K + np.array([Y0, X0])[:, None, None]
x, y = locale(cx, cy, ang, Xp, Yp)

if tipo == 'vaso-basso':
    vaso = per('Jar', 'pixel')
    piazza(vaso.topil(), vaso.bbox).save(OUT / 'vaso.webp', quality=84)
    va = np.array(piazza(vaso.topil().convert('RGBA'), vaso.bbox))[..., 3].astype(float)
    lid_f = per('Lid', 'solidcolorfill')
    la = np.array(piazza(lid_f.mask.topil().convert('L'), lid_f.mask.bbox, 'L', 0)).astype(float)
    luci = per('Highlights', 'pixel', False)
    piazza(luci.topil().convert('RGB'), luci.bbox, 'RGB', (0, 0, 0)).save(OUT / 'luci.webp', quality=80)
    for nome_psd, f in [('Inside color', 'contenuto'), ('Lid', 'coperchio'), ('Shadows', 'ombra')]:
        l = per(nome_psd, 'solidcolorfill')
        salva(sfuma(np.array(piazza(l.mask.topil().convert('L'), l.mask.bbox, 'L', 0))), f'maschera-{f}')
else:
    jar_g, lid_g = next(l for l in psd if l.name == 'Jar'), next(l for l in psd if l.name == 'Lid')
    vaso = per('Jar', 'pixel', dentro=list(jar_g)); jar_luci = per('Highlights', 'pixel', dentro=list(jar_g))
    v = rgba(vaso)
    lum = 0.299 * v[..., 0] + 0.587 * v[..., 1] + 0.114 * v[..., 2]
    p60, p85 = np.percentile(lum[v[..., 3] > 200], [60, 85])
    # luci: quelle del vetro (scolorisci all'opacità del PSD), l'eccesso di luminosità, quelle del coperchio
    luce = lambda l: (lambda a: a[..., :3] / 255 * (a[..., 3:] / 255) * (l.opacity / 255))(rgba(l))
    eccesso = (np.clip((lum - p85) / (255 - p85), 0, 1) * (v[..., 3] / 255))[..., None]
    tot = np.zeros((H, W, 3))
    for strato in (luce(jar_luci), eccesso, luce(per('Highlights', 'pixel', dentro=list(lid_g)))):
        tot = 1 - (1 - tot) * (1 - strato)
    salva(tot * 255, 'luci')
    # coperchio: la maschera del gruppo (il colore lo dà il laboratorio) e le sue ombre, da moltiplicare
    salva(np.array(piazza(lid_g.mask.topil().convert('L'), lid_g.mask.bbox, 'L', 0)), 'maschera-coperchio')
    lo = rgba(per('Lid', 'pixel', dentro=list(lid_g)))
    salva(255 - (255 - lo[..., :3]) * (lo[..., 3:] / 255), 'coperchio-ombre', 84)
    # ombra sul piano: pixel in moltiplica all'opacità del PSD → grigio da moltiplicare sulla carta. Il livello ha
    # anche un velo grigio su tutta l'area, che sul sito faceva un rettangolo: si toglie il suo livello (mediana).
    # Al 75%, perché quella del vaso basso è più leggera: i due vasi stanno nella stessa cella
    sh = per('Shadows', 'pixel', False)
    so = rgba(sh)
    scuro = ((255 - so[..., :3]) * (so[..., 3:] / 255) * (sh.opacity / 255)).max(2)
    scuro = np.clip(scuro - np.median(scuro), 0, 255) * 0.75
    salva(255 - sfuma(scuro), 'ombra')
    # contenuto: dentro il vetro, da sotto il coperchio in giù (curvo come le ellissi)
    va = v[..., 3]
    la = np.array(piazza(lid_g.mask.topil().convert('L'), lid_g.mask.bbox, 'L', 0)).astype(float)
    t = y - e * R * np.cos(np.arcsin(np.clip(x / R, -1, 1)))
    if np.median(t[la > 128]) > 0: t = -t                      # coperchio verso le t negative
    collo = np.percentile(t[la > 128], 98) + 0.12 * R
    contenuto = va * (t > collo) * (np.abs(x) < 0.97 * R)
    salva(contenuto, 'maschera-contenuto')
    # vetro neutro al posto del miele, da moltiplicare sotto il contenuto: la luminosità riportata a vetro chiaro
    # (il 60° percentile ≈ bianco). Dove c'è il contenuto i chiari e scuri del miele (trasparente) lo facevano
    # sembrare un liquido: lì restano appena, sopra un'ombra morbida da cilindro, così regge anche una crema opaca.
    # Quello che supera l'85° percentile è già nelle luci.
    chiaro = np.clip(lum / p60 * 0.96, 0, 1)
    tondo = 0.8 + 0.2 * np.cos(np.arcsin(np.clip(x / R, -1, 1)))
    peso = contenuto / 255
    vetro = (chiaro * (1 - peso) + tondo * (0.88 + 0.12 * chiaro) * peso) * 255
    salva(np.dstack([vetro] * 3 + [va]), 'vaso', 84)

# parte piatta: lungo l'asse, dove la larghezza della sagoma del vetro (senza coperchio) cambia piano, prima che
# i fianchi curvino verso spalla e fondo. Non "larga quanto il punto più largo": il vaso alto si rastrema del 4%
# ed è piatto lo stesso per un'etichetta. Si parte dal centro della fascia del mockup e ci si allarga finché la
# pendenza resta sotto 0,15. Sui fianchi visti di taglio cos θ = 0, quindi lì t = y: si misura sulla y.
corpo = (va > 128) & (la < 128)
yl = np.round(y[corpo] * K).astype(int); xs = x[corpo] * K
ks = np.unique(yl)
w = np.array([xs[yl == k].max() - xs[yl == k].min() for k in ks])
n = 15      # pendenza su ±15 px: pixel per pixel la larghezza salta di ±1 e il rumore supera la soglia
pendenza = np.abs(np.r_[[np.inf] * n, (w[2 * n:] - w[:-2 * n]) / (ks[2 * n:] - ks[:-2 * n]), [np.inf] * n])
i = j = int(np.argmin(np.abs(ks - (t0 + t1) / 2 * K)))
while i > 0 and pendenza[i - 1] < 0.15: i -= 1
while j < len(ks) - 1 and pendenza[j + 1] < 0.15: j += 1
piano = [ks[i] / K, ks[j] / K]
print(f'parte piatta: {piano[0] * K:.1f} … {piano[1] * K:.1f} (fascia del mockup {t0 * K:.1f} … {t1 * K:.1f})')

ombre, luci_et = per('Shadows', 'pixel', True, list(gruppo)), per('Highlights', 'pixel', True, list(gruppo))
piazza(ombre.topil(), ombre.bbox, 'RGBA', (255, 255, 255, 0)).save(OUT / 'etichetta-ombre.webp', quality=82)
piazza(luci_et.topil(), luci_et.bbox, 'RGBA', (0, 0, 0, 0)).save(OUT / 'etichetta-luci.webp', quality=82)

# --- 3. geometria nelle coordinate del ritaglio ---
G = dict(tipo=tipo, w=W, h=H, cx=round((cx - X0) * K, 2), cy=round((cy - Y0) * K, 2), ang=round(float(ang), 5),
         r=round(R * K, 2), t0=round(t0 * K, 2), t1=round(t1 * K, 2), e=round(float(e), 4),
         piano=[round(float(v) * K, 2) for v in piano],
         # cima del vasetto (vetro o coperchio) nel ritaglio: il sito ci allinea il margine alto del testo
         cima=int(np.flatnonzero(((va > 128) | (la > 128)).any(1))[0]),
         luciEtichetta='screen', opacitaLuci=round(luci_et.opacity / 255, 2), coincidenza=round(float(meglio), 4))
(OUT / 'geometria.json').write_text(json.dumps(G, indent=2))
print('G =', json.dumps(G))
