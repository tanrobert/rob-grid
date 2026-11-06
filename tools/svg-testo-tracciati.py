# Testo vivo di un SVG di Illustrator → tracciati, tutto il resto com'è (classi, stili, sfumature, gruppi, attributi data-).
# Ogni <text class="…" transform="…"><tspan x y>…</tspan></text> diventa un <path class="…"> con gli stessi stili (le
# dichiarazioni font-* e letter-spacing del <style> si tolgono: non servono più). Un transform fatto solo di translate
# si cuoce nel tracciato; con rotate (lettere su un cerchio, firme inclinate) resta sull'elemento.
# Solo sviluppo: i font stanno sul computer di Roberto, non sul server della build. Serve: pip install --user uharfbuzz fonttools
# uso: python tools/svg-testo-tracciati.py <font.otf | auto> entrata.svg uscita.svg [--glifi]
#   auto: il font di ogni classe dal nome in font-family (es. UntitledSans-Black → UntitledSans-Black.otf), cercato tra
#         i font dell'utente e di Windows
#   --glifi: un tracciato per lettera, dentro un <g> con classe e transform del testo (per scriverle una alla volta)
#   es. la P di Purple Piper (Museo Slab 900, tra i font dell'utente):
#   python tools/svg-testo-tracciati.py "%LOCALAPPDATA%/Microsoft/Windows/Fonts/Museo_Slab_3.otf"
#          sorgenti/purple-piper/p-live.svg src/content/progetti/purple-piper/costruzione-p-live.svg
#   es. la firma e il marchio dei 90 anni di G&A (Golden Hopes, Untitled Sans e Serif):
#   python tools/svg-testo-tracciati.py auto sorgenti/gea/firma.svg src/content/progetti/gea/animato-firma.svg --glifi
#   python tools/svg-testo-tracciati.py auto sorgenti/gea/90-anni.svg src/content/progetti/gea/animato-90-anni.svg --glifi
import os, re, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

argomenti = [a for a in sys.argv[1:] if not a.startswith('--')]
GLIFI = '--glifi' in sys.argv
font_arg, src, dst = (os.path.expandvars(a) for a in argomenti[:3])
svg = open(src, encoding='utf8').read()

stili = {}
blocco = re.search(r'<style>(.*?)</style>', svg, re.S)
for sel, corpo in re.findall(r'([^{}]+)\{([^}]*)\}', blocco.group(1) if blocco else ''):
    for c in re.findall(r'\.(cls-\d+)', sel):
        stili.setdefault(c, {}).update(dict((k.strip(), v.strip()) for k, v in re.findall(r'([\w-]+)\s*:\s*([^;]+)', corpo)))

CARTELLE = [os.path.expandvars('%LOCALAPPDATA%/Microsoft/Windows/Fonts'), 'C:/Windows/Fonts']
font_cache = {}
def font_di(st):
    """(hbfont, glyphset, nomi, upm) del font: quello passato, o con auto quello di font-family"""
    if font_arg != 'auto':
        file = font_arg
    else:
        nome = st['font-family'].split(',')[0].strip().strip('\'"')
        file = next((os.path.join(d, nome + e) for d in CARTELLE for e in ('.otf', '.ttf') if os.path.exists(os.path.join(d, nome + e))), None)
        if not file:
            raise SystemExit(f'font non trovato: {nome}')
    if file not in font_cache:
        ft = TTFont(file)
        font_cache[file] = (hb.Font(hb.Face(hb.Blob.from_file_path(file))), ft.getGlyphSet(), ft.getGlyphOrder(), ft['head'].unitsPerEm)
    return font_cache[file]

def stile(classi):
    st = {}
    for c in classi.split():
        st.update(stili.get(c, {}))
    return st

num = lambda v: f'{v:.2f}'.rstrip('0').rstrip('.')

def glifi(classi, tx, ty, tspans):
    """i tracciati delle lettere (uno per lettera), già al loro posto"""
    st = stile(classi)
    hbfont, gs, nomi, upm = font_di(st)
    corpo = float(st['font-size'].replace('px', ''))
    k = corpo / upm
    fuori = []
    for x, y, testo, cl in tspans:
        ls = {**st, **stile(cl)}.get('letter-spacing', '0')
        ls = float(ls.replace('em', '')) * corpo if 'em' in ls else 0.0
        buf = hb.Buffer(); buf.add_str(testo); buf.guess_segment_properties()
        hb.shape(hbfont, buf, {})
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            pen = SVGPathPen(gs, ntos=num)
            gs[nomi[info.codepoint]].draw(TransformPen(pen, (k, 0, 0, -k, tx + x + pos.x_offset * k, ty + y - pos.y_offset * k)))
            fuori.append(pen.getCommands())
            x += pos.x_advance * k + ls
    return [d for d in fuori if d]

def sostituisci(m):
    classi, transform, dentro = m.group(1), m.group(2), m.group(3)
    tspans = [(float(re.search(r'\bx="([-\d.]+)"', a).group(1)), float(re.search(r'\by="([-\d.]+)"', a).group(1)),
               t.replace('&apos;', "'").replace('&amp;', '&'), (re.search(r'class="([^"]+)"', a) or [None, ''])[1])
              for a, t in re.findall(r'<tspan([^>]*)>([^<]*)</tspan>', dentro)]
    if not tspans:
        raise SystemExit(f'testo senza tspan: {m.group(0)[:80]}')
    solo = re.fullmatch(r'translate\(([-\d.]+) ([-\d.]+)\)', transform)
    tx, ty = (float(solo.group(1)), float(solo.group(2))) if solo else (0.0, 0.0)
    attr_t = '' if solo else f' transform="{transform}"'
    ds = glifi(classi, tx, ty, tspans)
    if not ds:
        return ''  # solo spazi
    if GLIFI:
        return f'<g class="{classi}"{attr_t}>' + ''.join(f'<path d="{d}"/>' for d in ds) + '</g>'
    return f'<path class="{classi}"{attr_t} d="{"".join(ds)}"/>'

n = len(re.findall(r'<text\b', svg))
svg = re.sub(r'<text class="([^"]+)" transform="([^"]+)">(.*?)</text>', sostituisci, svg, flags=re.S)
if '<text' in svg:
    raise SystemExit('restano testi in una forma non prevista (senza transform?)')
# gli stili del testo non servono più
svg = re.sub(r'\s*(font-family|font-size|font-weight|font-style|letter-spacing)\s*:[^;}]*;?', '', svg)
svg = re.sub(r'\s*[^{}<>]+\{\s*\}', '', svg)
open(dst, 'w', encoding='utf8', newline='').write(svg)
print(dst, n, 'testi in tracciati')
