# Testo vivo di un SVG di Illustrator → tracciati, tutto il resto com'è (classi, stili, sfumature, gruppi).
# Ogni <text class="…" transform="translate(x y)"><tspan x y>…</tspan></text> diventa un <path class="…"> con gli
# stessi stili (le dichiarazioni font-* e letter-spacing del <style> si tolgono: non servono più). Un font per file.
# Solo sviluppo: il font sta sul computer di Roberto, non sul server della build. Serve: pip install --user uharfbuzz fonttools
# uso: python tools/svg-testo-tracciati.py font.otf entrata.svg uscita.svg
#   es. la P di Purple Piper (Museo Slab 900, tra i font dell'utente):
#   python tools/svg-testo-tracciati.py "%LOCALAPPDATA%/Microsoft/Windows/Fonts/Museo_Slab_3.otf"
#          sorgenti/purple-piper/p-live.svg src/content/progetti/purple-piper/costruzione-p-live.svg
import os, re, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

font_path, src, dst = (os.path.expandvars(a) for a in sys.argv[1:4])
svg = open(src, encoding='utf8').read()

stili = {}
blocco = re.search(r'<style>(.*?)</style>', svg, re.S)
for sel, corpo in re.findall(r'([^{}]+)\{([^}]*)\}', blocco.group(1) if blocco else ''):
    for c in re.findall(r'\.(cls-\d+)', sel):
        stili.setdefault(c, {}).update(dict((k.strip(), v.strip()) for k, v in re.findall(r'([\w-]+)\s*:\s*([^;]+)', corpo)))

blob = hb.Blob.from_file_path(font_path); hbfont = hb.Font(hb.Face(blob))
ft = TTFont(font_path); gs = ft.getGlyphSet(); nomi = ft.getGlyphOrder(); upm = ft['head'].unitsPerEm

def tracciato(classi, tx, ty, tspans):
    st = {}
    for c in classi.split():
        st.update(stili.get(c, {}))
    corpo = float(st['font-size'].replace('px', ''))
    ls = st.get('letter-spacing', '0')
    ls = float(ls.replace('em', '')) * corpo if 'em' in ls else 0.0
    k = corpo / upm
    pen = SVGPathPen(gs, ntos=lambda v: f'{v:.2f}'.rstrip('0').rstrip('.'))
    for x, y, testo in tspans:
        buf = hb.Buffer(); buf.add_str(testo); buf.guess_segment_properties()
        hb.shape(hbfont, buf, {})
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            gs[nomi[info.codepoint]].draw(TransformPen(pen, (k, 0, 0, -k, tx + x + pos.x_offset * k, ty + y - pos.y_offset * k)))
            x += pos.x_advance * k + ls
    return pen.getCommands()

def sostituisci(m):
    classi, tx, ty, dentro = m.group(1), float(m.group(2)), float(m.group(3)), m.group(4)
    tspans = [(float(x), float(y), t.replace('&apos;', "'").replace('&amp;', '&'))
              for x, y, t in re.findall(r'<tspan[^>]*?x="([-\d.]+)" y="([-\d.]+)"[^>]*>([^<]*)</tspan>', dentro)]
    if not tspans:
        raise SystemExit(f'testo senza tspan: {m.group(0)[:80]}')
    return f'<path class="{classi}" d="{tracciato(classi, tx, ty, tspans)}"/>'

n = len(re.findall(r'<text\b', svg))
svg = re.sub(r'<text class="([^"]+)" transform="translate\(([-\d.]+) ([-\d.]+)\)">(.*?)</text>', sostituisci, svg, flags=re.S)
if '<text' in svg:
    raise SystemExit('restano testi in una forma non prevista (transform diverso da translate?)')
# gli stili del testo non servono più
svg = re.sub(r'\s*(font-family|font-size|font-weight|letter-spacing)\s*:[^;}]*;?', '', svg)
svg = re.sub(r'\s*[^{}<>]+\{\s*\}', '', svg)
open(dst, 'w', encoding='utf8', newline='').write(svg)
print(dst, n, 'testi in tracciati')
