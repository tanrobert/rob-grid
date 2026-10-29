# Mano col telefono dal PSD ("sorgenti/mockup/mockup-tel-3.psd", serie "Hand Holding iPhone 17 Pro": scena fotografica con le maschere
# Hand Mask e iPhone Mask, schermo nello smart object "PUT YOUR DESIGN HERE", deformato in prospettiva sui quattro angoli)
# e registrazione dello schermo messa in prospettiva.
# Scrive in public/telefono/ mano.webp (mano e telefono con lo schermo bucato, fondo trasparente: si vede la carta della
# cella), geometria.json (riquadro del video e i quattro angoli dello schermo, in %) e schermo.png (sagoma dello schermo
# sul riquadro del video, per la maschera). Con --video anche il video già
# deformato (.mp4 H.264, .webm AV1 e il poster .webp), un rettangolo da mettere sotto la mano, mascherato con schermo.png.
# Il video d'ingresso deve avere la proporzione dello schermo (0,46). Solo sviluppo. Serve: pip install --user
# psd-tools, ffmpeg (winget Gyan.FFmpeg).
#   python tools/telefono-mockup.py <mockup.psd> [--px 1100] [--colore f23e23] [--video schermo.mp4 public/media/<nome>.mp4]
#   --colore: il telefono (nero) di quel colore: le luminanze della scocca diventano il colore, il nero del bordo
#   attorno allo schermo resta nero, le luci schiariscono; dove le dita stanno davanti al telefono si tinge solo il grigio
import json
import os
import subprocess
import sys
import numpy as np
from PIL import Image, ImageFilter
from psd_tools import PSDImage

args = sys.argv[1:]
px, video, colore = 1100, None, None
if '--px' in args:
    i = args.index('--px'); px = int(args[i + 1]); del args[i:i + 2]
if '--colore' in args:
    i = args.index('--colore'); colore = args[i + 1].lstrip('#'); del args[i:i + 2]
if '--video' in args:
    i = args.index('--video'); video = args[i + 1:i + 3]; del args[i:i + 3]
psd = args[0]
cartella = os.path.join('public', 'telefono')

p = PSDImage.open(psd)
livello = {l.name: l for l in p.descendants()}
schermo = livello['PUT YOUR DESIGN HERE']

def maschera(l):
    # sagoma del livello sulla tela intera (0–1)
    m = np.zeros((p.height, p.width), np.float32)
    m[l.top:l.top + l.height, l.left:l.left + l.width] = np.asarray(l.composite().convert('RGBA'))[..., 3] / 255
    return m

# lo schermo intero, senza l'isola dell'iPhone (un buco nella sagoma): ogni riga piena da un bordo all'altro (è convesso)
buco = maschera(schermo)
for r in np.nonzero((buco > .5).any(1))[0]:
    c = np.nonzero(buco[r] > .5)[0]
    buco[r, c[0] + 1:c[-1]] = 1
# la scena (fotografia con regolazioni) scontornata da mano e telefono, senza lo schermo
dita, telefono = maschera(livello['Hand Mask']), maschera(livello['iPhone Mask'])
alfa = np.clip(np.maximum(dita, telefono) - buco, 0, 1)
rgb = np.asarray(p.composite().convert('RGB')).astype(np.float32)
if colore:
    tinta = np.array([int(colore[i:i + 2], 16) for i in (0, 2, 4)], np.float32)
    luce = rgb @ np.array([.2126, .7152, .0722], np.float32)
    pelle = np.clip((rgb[..., 0] - rgb[..., 2] - 12) / 20, 0, 1)      # la pelle è più rossa che blu, la scocca grigia
    peso = (telefono * (1 - buco) * (1 - dita * pelle))[..., None]
    tinto = tinta * np.clip(luce / 60, 0, 1)[..., None] ** 0.8 + (255 - tinta) * np.clip((luce - 150) / 150, 0, .55)[..., None]
    rgb = rgb * (1 - peso) + tinto * peso
mano = np.dstack([rgb.clip(0, 255).astype(np.uint8), (alfa * 255).astype(np.uint8)])
img = Image.fromarray(mano)
x0, y0, x1, y1 = img.getbbox()
W, H = x1 - x0, y1 - y0
k = px / W
img.crop((x0, y0, x1, y1)).resize((px, round(H * k)), Image.LANCZOS).save(os.path.join(cartella, 'mano.webp'), quality=90)

# angoli dello schermo (alto sinistra, alto destra, basso destra, basso sinistra), sulla foto ritagliata
t = schermo.smart_object.transform_box
angoli = [(t[i] - x0, t[i + 1] - y0) for i in range(0, 8, 2)]
ax0, ay0 = min(a[0] for a in angoli), min(a[1] for a in angoli)
ax1, ay1 = max(a[0] for a in angoli), max(a[1] for a in angoli)
geo = {
    'rapporto': round(W / H, 4),
    # riquadro del video, in % della foto
    'left': round(ax0 / W * 100, 3), 'top': round(ay0 / H * 100, 3),
    'width': round((ax1 - ax0) / W * 100, 3), 'height': round((ay1 - ay0) / H * 100, 3),
    # angoli dello schermo, in % del riquadro del video (clip-path)
    'angoli': [[round((x - ax0) / (ax1 - ax0) * 100, 3), round((y - ay0) / (ay1 - ay0) * 100, 3)] for x, y in angoli],
}
with open(os.path.join(cartella, 'geometria.json'), 'w') as f: json.dump(geo, f)
# sagoma dello schermo (angoli tondi) sul riquadro del video, maschera del video: il quadrilatero degli angoli ha le punte
# vive, che uscirebbero dal telefono. Allargata di 2 px perché il video arrivi sotto la cornice
sagoma = Image.fromarray((buco * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
sagoma = sagoma.crop(tuple(round(v) for v in (ax0 + x0, ay0 + y0, ax1 + x0, ay1 + y0)))
sagoma = sagoma.resize((600, round(600 * sagoma.height / sagoma.width)), Image.LANCZOS)
nera = Image.new('RGBA', sagoma.size, (0, 0, 0, 0)); nera.putalpha(sagoma)
nera.save(os.path.join(cartella, 'schermo.png'), optimize=True)
print(os.path.join(cartella, 'mano.webp'), (px, round(H * k)), json.dumps(geo))

if video:
    sorgente, uscita = video
    # il riquadro del video con lo schermo largo quanto la registrazione (di più non aggiunge dettaglio), misure pari
    largo = float(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', sorgente],
                                 capture_output=True, text=True, check=True).stdout)
    s = largo / np.hypot(angoli[1][0] - angoli[0][0], angoli[1][1] - angoli[0][1])
    vw, vh = 2 * round((ax1 - ax0) * s / 2), 2 * round((ay1 - ay0) * s / 2)
    sx, sy = vw / (ax1 - ax0), vh / (ay1 - ay0)
    (a, b, c, d) = [((x - ax0) * sx, (y - ay0) * sy) for x, y in angoli]
    # perspective vuole alto sinistra, alto destra, basso sinistra, basso destra
    dove = ':'.join(f'{v:.1f}' for v in (*a, *b, *d, *c))
    filtro = f'fps=30,scale={vw}:{vh},perspective={dove}:sense=destination:interpolation=cubic,format=yuv420p'
    base = os.path.splitext(uscita)[0]
    ff = ['ffmpeg', '-v', 'error', '-y', '-i', sorgente, '-an', '-vf', filtro]
    subprocess.run(ff + ['-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-movflags', '+faststart', base + '.mp4'], check=True)
    subprocess.run(ff + ['-c:v', 'libsvtav1', '-crf', '40', '-preset', '6', '-svtav1-params', 'log-level=0', base + '.webm'],
                   check=True, stderr=subprocess.DEVNULL)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', base + '.mp4', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '85', base + '.webp'], check=True)
    print(base + '.mp4/.webm/.webp', (vw, vh))
