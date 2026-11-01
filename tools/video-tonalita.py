# Cuoce su un video una sfumatura lineare orizzontale in metodo Tonalità (come Photoshop, opacità 100%). Solo sviluppo.
# Tonalità = tinta della sfumatura, saturazione e luminosità del video:
#   B(Cb, Cs) = SetLum(SetSat(Cs, Sat(Cb)), Lum(Cb))   (formule W3C/Photoshop, Lum 0,3/0,59/0,11)
# Sfumatura "Classica" (colori in mezzo calcolati in sRGB). Serve ffmpeg (winget Gyan.FFmpeg) e numpy.
#   python tools/video-tonalita.py ingresso.mp4 uscita.mp4 "#543962" "#a90009"             video intero, H.264 crf 16, audio copiato
#   python tools/video-tonalita.py ingresso.mp4 prova.png "#543962" "#a90009" --prova 5    un fotogramma (al secondo 5) per provare i colori
#   --larga 1200: rimpicciolisce prima di colorare (per il sito: in 4K ci mette più di un'ora, a 1200 px pochi minuti)
import subprocess, sys
import numpy as np

src, out, c_sx, c_dx = sys.argv[1:5]
prova = float(sys.argv[sys.argv.index('--prova') + 1]) if '--prova' in sys.argv else None

info = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries',
                       'stream=width,height,r_frame_rate', '-of', 'csv=p=0', src],
                      capture_output=True, text=True).stdout.strip().split(',')
W, H, fps = int(info[0]), int(info[1]), info[2]
if '--larga' in sys.argv:
    larga = int(sys.argv[sys.argv.index('--larga') + 1])
    W, H = larga, round(H * larga / W / 2) * 2

def rgb(hex_):
    hex_ = hex_.lstrip('#')
    return np.array([int(hex_[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255

# sfumatura "classica" (interpolazione in sRGB), una riga basta: è uguale in tutta l'altezza
t = np.linspace(0, 1, W, dtype=np.float32)[:, None]
grad = rgb(c_sx) * (1 - t) + rgb(c_dx) * t
# forma della tinta: (Cs − min) / (max − min), così SetSat(Cs, s) = forma × s
gmin, gmax = grad.min(1, keepdims=True), grad.max(1, keepdims=True)
forma = (grad - gmin) / np.maximum(gmax - gmin, 1e-6)

def lum(c):
    return c[..., 0] * 0.3 + c[..., 1] * 0.59 + c[..., 2] * 0.11

def tonalita(cb):
    sat = cb.max(2) - cb.min(2)
    c = forma[None] * sat[..., None]
    l = lum(cb)
    c += (l - lum(c))[..., None]
    # ClipColor
    l = l[..., None]
    n, x = c.min(2, keepdims=True), c.max(2, keepdims=True)
    c = np.where(n < 0, l + (c - l) * l / np.maximum(l - n, 1e-6), c)
    c = np.where(x > 1, l + (c - l) * (1 - l) / np.maximum(x - l, 1e-6), c)
    return c

dec = ['ffmpeg', '-v', 'error', '-i', src]
if prova is not None:
    dec += ['-ss', str(prova), '-frames:v', '1']
dec += ['-vf', f'scale={W}:{H}:flags=lanczos:in_color_matrix=bt709:in_range=tv', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
lettore = subprocess.Popen(dec, stdout=subprocess.PIPE)

if prova is not None:
    enc = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-i', '-', out]
else:
    enc = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', fps,
           '-i', '-', '-i', src, '-map', '0:v', '-map', '1:a?', '-c:a', 'copy',
           '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow',
           '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
           '-color_range', 'tv', '-movflags', '+faststart', out]
scrittore = subprocess.Popen(enc, stdin=subprocess.PIPE)

n = W * H * 3
i = 0
while True:
    buf = lettore.stdout.read(n)
    if len(buf) < n:
        break
    cb = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32) / 255
    res = tonalita(cb)
    scrittore.stdin.write((np.clip(res, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
    i += 1
    if i % 30 == 0:
        print(f'{i} fotogrammi', flush=True)

scrittore.stdin.close()
scrittore.wait()
lettore.wait()
print(f'fatto: {i} fotogrammi: {out}')
