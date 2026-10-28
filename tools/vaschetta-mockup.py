# Mockup della vaschetta termosaldata: la striscia (PDF vettoriale) appoggiata sul film della vaschetta vista dall'alto
# (PNG scontornato), con le ombre della vaschetta moltiplicate sopra e i riflessi del film; su fondo carta con un'ombra
# morbida, già nella proporzione della cella. Solo sviluppo. Serve: pip install --user pymupdf pillow numpy
#   python tools/vaschetta-mockup.py <vaschetta.png> <striscia.pdf> <uscita.webp> [--larga-mm 137] [--cella 15:23]
#   es. python tools/vaschetta-mockup.py sorgenti/mockup/vaschetta.png sorgenti/kiale/striscia-polpette.pdf \
#         src/content/progetti/kiale/vaschetta-polpette.webp
# --larga-mm: larghezza vera della vaschetta (la scala della striscia); --cella: w:h della cella in quadretti (4×6 = 15:23)
import sys
import fitz
import numpy as np
from PIL import Image, ImageFilter

args = sys.argv[1:]
opz = {'--larga-mm': '137', '--cella': '15:23', '--fondo': '#f5f3f0', '--angoli': '', '--lunga-mm': '187'}
for k in list(opz):
    if k in args:
        i = args.index(k); opz[k] = args[i + 1]; del args[i:i + 2]
vaschetta, striscia, uscita = args


def cella(img, sfondo):
    """su fondo carta, al centro, nella proporzione della cella"""
    cw, ch = map(int, opz['--cella'].split(':'))
    W = round(img.width * 1.08); H = round(W * ch / cw)
    if H < img.height * 1.08: H = round(img.height * 1.08); W = round(H * cw / ch)
    t = Image.new('RGB', (W, H), sfondo); t.paste(img, ((W - img.width) // 2, (H - img.height) // 2))
    return t


if opz['--angoli']:
    # FOTO IN PROSPETTIVA su fondo bianco (es. la foto del fornitore): --angoli = i quattro angoli del bordo, in pixel
    # della foto, nell'ordine sinistra · davanti · destra · dietro (lato lungo = sinistra→davanti, `--lunga-mm`;
    # lato corto = sinistra→dietro, `--larga-mm`). La striscia attraversa il lato corto, al centro del lato lungo,
    # deformata sul piano del bordo; il fondo bianco si moltiplica sulla carta (sparisce senza scontornare)
    foto = Image.open(vaschetta).convert('RGB')
    k = 2                                        # lavoro al doppio: la striscia resta netta anche se la foto è piccola
    foto = foto.resize((foto.width * k, foto.height * k), Image.LANCZOS)
    A = [tuple(float(c) * k for c in p.split(',')) for p in opz['--angoli'].split()]
    lunga, larga = float(opz['--lunga-mm']), float(opz['--larga-mm'])
    pdf = fitz.open(striscia)[0]
    sl, sh = pdf.rect.width / 72 * 25.4, pdf.rect.height / 72 * 25.4          # mm
    pix = pdf.get_pixmap(dpi=600, alpha=False)
    et = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)

    def sul_bordo(u, v):                         # u lungo il lato lungo, v lungo il lato corto (0–1) → pixel della foto
        M = omografia([(0, 0), (1, 0), (1, 1), (0, 1)], [A[0], A[1], A[2], A[3]])
        x, y, w = M @ np.array([u, v, 1.0])
        return x / w, y / w

    def omografia(da, a):
        r = []
        for (x, y), (X, Y) in zip(da, a):
            r += [[x, y, 1, 0, 0, 0, -X * x, -X * y, X], [0, 0, 0, x, y, 1, -Y * x, -Y * y, Y]]
        r = np.array(r, dtype=float)
        h = np.linalg.solve(r[:, :8], r[:, 8])
        return np.append(h, 1).reshape(3, 3)

    # angoli della striscia: in alto a sinistra, in alto a destra, in basso a destra, in basso a sinistra; la riga del
    # testo corre lungo il lato corto, l'alto del testo verso il lato sinistro→dietro (u minore)
    u0, u1 = 0.5 - sh / lunga / 2, 0.5 + sh / lunga / 2
    v0, v1 = 0.5 - sl / larga / 2, 0.5 + sl / larga / 2
    dove = [sul_bordo(u0, v0), sul_bordo(u0, v1), sul_bordo(u1, v1), sul_bordo(u1, v0)]
    # PIL vuole la trasformazione dalla foto alla striscia
    M = omografia(dove, [(0, 0), (et.width, 0), (et.width, et.height), (0, et.height)])
    coeff = (M / M[2, 2]).flatten()[:8]
    sopra = et.transform(foto.size, Image.PERSPECTIVE, tuple(coeff), Image.BICUBIC)
    maschera = Image.new('L', et.size, 255).transform(foto.size, Image.PERSPECTIVE, tuple(coeff), Image.BICUBIC)
    carta = np.array(Image.new('RGB', foto.size, opz['--fondo']), dtype=np.float32)
    img = carta * np.asarray(foto, dtype=np.float32) / 255
    m = np.asarray(maschera, dtype=np.float32)[..., None] / 255
    img = img * (1 - m) + np.asarray(sopra, dtype=np.float32) * m
    img = Image.fromarray(img.round().astype(np.uint8))
    img = cella(img, opz['--fondo'])
    if img.width > 1600: img = img.resize((1600, round(1600 * img.height / img.width)), Image.LANCZOS)
    img.save(uscita, quality=90)
    print(uscita, img.size)
    sys.exit()

v = Image.open(vaschetta).convert('RGBA')
v = v.crop(v.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
vw, vh = v.size
px_mm = vw / float(opz['--larga-mm'])

# striscia alla scala della vaschetta, al centro
pdf = fitz.open(striscia)[0]
larga = pdf.rect.width / 72 * 25.4 * px_mm
pix = pdf.get_pixmap(matrix=fitz.Matrix(larga / pdf.rect.width, larga / pdf.rect.width), alpha=False)
et = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
ex, ey = round((vw - et.width) / 2), round((vh - et.height) / 2)

# ombre e riflessi presi dalla vaschetta sotto la striscia: luminanza normalizzata sul bianco della plastica (moltiplica)
# e la parte più chiara dei dettagli fini (i riflessi del film, in schermo)
L = np.asarray(v.convert('L'), dtype=np.float32)
bianco = np.percentile(L[np.asarray(v.getchannel('A')) > 250], 95)
zona = (slice(ey, ey + et.height), slice(ex, ex + et.width))
ombra = np.clip(L[zona] / bianco, 0, 1)[..., None]
liscia = np.asarray(Image.fromarray(L.astype(np.uint8)).filter(ImageFilter.GaussianBlur(px_mm * 2)), dtype=np.float32)
luce = np.clip((L - liscia)[zona] / 255 * 2.2, 0, 1)[..., None]
e = np.asarray(et, dtype=np.float32) / 255 * ombra
e = 1 - (1 - e) * (1 - luce)
v.paste(Image.fromarray((e * 255).round().astype(np.uint8)), (ex, ey))

# su fondo carta, nella proporzione della cella, con un'ombra morbida sotto
cw, ch = map(int, opz['--cella'].split(':'))
H = round(vh * 1.16); W = round(H * cw / ch)
if W < vw * 1.12: W = round(vw * 1.12); H = round(W * ch / cw)
tela = Image.new('RGBA', (W, H), opz['--fondo'])
x, y = (W - vw) // 2, (H - vh) // 2
alfa = v.getchannel('A').filter(ImageFilter.GaussianBlur(px_mm * 4)).point(lambda a: a * 0.28)
ombra_img = Image.new('RGBA', v.size, (28, 26, 23, 0)); ombra_img.putalpha(alfa)
tela.alpha_composite(ombra_img, (x, y + round(px_mm * 3)))
tela.alpha_composite(v, (x, y))
tela = tela.convert('RGB')
if tela.width > 1600: tela = tela.resize((1600, round(1600 * tela.height / tela.width)), Image.LANCZOS)
tela.save(uscita, quality=90)
print(uscita, tela.size, f'{px_mm:.2f} px/mm, striscia {et.size}')
