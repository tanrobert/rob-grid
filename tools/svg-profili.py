# Testo vivo degli SVG di Illustrator → tracciati (stesse posizioni dei tspan, calt applicato con HarfBuzz)
# Solo sviluppo. Serve: pip install --user uharfbuzz fonttools
# uso: python tools/svg-profili.py font.otf entrata.svg uscita.svg  (es. le parole di Kiale: font Intro Script Bold)
import re, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

font_path, src, dst = sys.argv[1:4]
svg = open(src, encoding='utf8').read()
vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
stili = {}
for sel, corpo in re.findall(r'([^{}]+)\{([^}]*)\}', re.search(r'<style>(.*?)</style>', svg, re.S).group(1)):
    for c in re.findall(r'\.(cls-\d+)', sel):
        stili.setdefault(c, {}).update(dict((k.strip(), v.strip()) for k, v in re.findall(r'([\w-]+)\s*:\s*([^;]+)', corpo)))
m = re.search(r'<text class="([^"]+)" transform="translate\(([-\d.]+) ([-\d.]+)\)">(.*?)</text>', svg, re.S)
cls_testo, tx, ty, dentro = m.group(1), float(m.group(2)), float(m.group(3)), m.group(4)
corpo = float(stili[cls_testo]['font-size'].replace('px', ''))
pezzi = []
for cls, x, testo in re.findall(r'<tspan class="([^"]+)" x="([-\d.]+)" y="[-\d.]+">([^<]*)</tspan>', dentro):
    ls = stili.get(cls, {}).get('letter-spacing', '0')
    ls = float(ls.replace('em', '')) if 'em' in ls else 0.0
    pezzi.append((float(x), testo.replace('&apos;', "'"), ls))

parola = ''.join(t for _, t, _ in pezzi)
blob = hb.Blob.from_file_path(font_path); face = hb.Face(blob); hbfont = hb.Font(face)
buf = hb.Buffer(); buf.add_str(parola); buf.guess_segment_properties()
hb.shape(hbfont, buf, {})
ft = TTFont(font_path); gs = ft.getGlyphSet(); nomi = ft.getGlyphOrder(); upm = ft['head'].unitsPerEm
k = corpo / upm
# per ogni carattere: il pezzo a cui appartiene e la posizione dentro
inizio = []
for i, (_, t, _) in enumerate(pezzi):
    inizio += [(i, j) for j in range(len(t))]
pen = SVGPathPen(gs)
x_pezzo = None
for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
    i, j = inizio[info.cluster]
    x0, _, ls = pezzi[i]
    if j == 0:
        x = x0
    x_glifo = x + pos.x_offset * k
    nome, alza = nomi[info.codepoint], 0
    if parola[info.cluster] in "’'" and nome in ('.notdef', 'quotesingle'):
        # il font demo non ha l'apostrofo (filigrana DEMO): la virgola alzata con la cima all'altezza delle maiuscole
        from fontTools.pens.boundsPen import BoundsPen
        bv, bo = BoundsPen(gs), BoundsPen(gs); gs['comma'].draw(bv); gs['O'].draw(bo)
        nome, alza = 'comma', bo.bounds[3] - bv.bounds[3]
    tp = TransformPen(pen, (k, 0, 0, -k, tx + x_glifo, ty - (pos.y_offset + alza) * k))
    gs[nome].draw(tp)
    x += pos.x_advance * k + ls * corpo
d = pen.getCommands()
open(dst, 'w', encoding='utf8').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><path fill="currentColor" d="{d}"/></svg>\n')
print(dst, parola, len(d))
