"""
Evoluzione del simbolo di G&A: scrive src/content/progetti/gea/evoluzione-simbolo.svg (cella `evoluzione`,
scripts/evoluzione.ts) dalle tavole della presentazione, sorgenti/gea/gea-tavole.ai (Illustrator col PDF dentro:
ogni tavola è una pagina, si legge con PyMuPDF).

    python tools/gea-evoluzione.py            (pip install --user pymupdf)

Il disegno della cella è un quadrato di 360 unità con la FIG 03 al centro (tavola 16). Le tavole dopo si portano
sullo stesso centro: la FIG 04 piccola (tavola 16) coincide con la FIG 03 tagliata sugli assi, la FIG 04 grande
(tavole 17 e 18) con la piccola ingrandita (lo zoom del passo 3); lo script controlla che combacino.
I due marchi sono gli angoli di due finestre in legno affiancate: di ognuna un pezzo di montante e uno di traverso,
con gli intagli a coda di rondine (non ante, né girandola).

Passi (vocabolario degli attributi in testa al file SVG e a scripts/evoluzione.ts):
  1. guide grigie e i quattro pezzi della FIG 03 che si disegnano;
  2. gli assi rossi tagliano la figura: i pezzi fuori scivolano via, resta la FIG 04;
  3. zoom su tutto: la FIG 04 e le linee di costruzione dei passi prima si ingrandiscono e restano (scelta di Roberto:
     niente linee che spariscono per ridisegnarle); poi gli assi rossi della tavola 17 e le sue guide grigie che non ci
     sono già (le altre sono le vecchie ingrandite), delle oblique solo le 8 più centrali, niente dritte attorno al centro, i quattro trapezi centrali delle code di rondine contornati di tratteggio rosso
     e poi pieni del giallo G&A (tavola 18);
  4. FIG 05 (tavola 19): svaniscono il contorno della FIG 04 e le guide che non c'entrano, si disegna la croce; poi i
     trapezi crescono verso il centro fino ai pezzi della FIG 05, le guide sui loro lati obliqui scorrono sulle rette
     nuove e gli assi rossi si allargano fino al riquadro;
  5. rifinire il simbolo (tavola 20): gli assi rossi del rettangolo aureo, poi quadrato, rettangolo e spirale; il
     rettangolo toglie a ogni pezzo il suo angolo interno (lo scalino si apre dall'angolo) e si arriva alla FIG 06 F
     (tavola 21), mentre la costruzione della spirale svanisce;
  6. simbolo + logotipo (tavole 25 e 26): svaniscono i tratteggi rossi, tutto sale per fare posto al testo (le linee
     continuano sotto), poi riga per riga le linee di costruzione e le lettere in giallo (G&A prima a contorno);
     alla fine il testo diventa grigio G&A e le linee di costruzione svaniscono: resta il logo.
"""
import os
import sys

import fitz

QUI = os.path.dirname(os.path.abspath(__file__))
AI = os.path.join(QUI, '..', 'sorgenti', 'gea', 'gea-tavole.ai')
SVG = os.path.join(QUI, '..', 'src', 'content', 'progetti', 'gea', 'evoluzione-simbolo.svg')
LATO = 360
GIALLO = '#f6c32b'   # Giallo Ambrato G&A (tavola 8)
GRIGIO = '#4a4a48'   # Grigio Antracite G&A (tavola 8): il testo del logo finale
SOTTO = 90           # di quanto le linee continuano sotto il quadrato (il disegno sale nel passo 6)

d = fitz.open(AI)
tav = lambda n: d[n - 1].get_drawings(extended=True)


def disegni(n, livello, tipo='s'):
    return [g for g in tav(n) if g.get('layer') == livello and g.get('type') == tipo]


def scatola(gs):
    return (min(g['rect'].x0 for g in gs), min(g['rect'].y0 for g in gs),
            max(g['rect'].x1 for g in gs), max(g['rect'].y1 for g in gs))


def centro(s):
    return ((s[0] + s[2]) / 2, (s[1] + s[3]) / 2)


def mappa(c, k=1.0):
    """punto della tavola → disegno della cella: centro c sul centro del quadrato, scala k"""
    return lambda p: ((p.x - c[0]) * k + LATO / 2, (p.y - c[1]) * k + LATO / 2)


def n2(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return '0' if s == '-0' else s


def tracciato(g, m):
    dd, ultimo = '', None
    for it in g['items']:
        if it[0] == 're':   # rettangolo
            r = it[1]
            v = [m(fitz.Point(x, y)) for x, y in ((r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1))]
            dd += f'M{n2(v[0][0])} {n2(v[0][1])}' + ''.join(f'L{n2(x)} {n2(y)}' for x, y in v[1:]) + 'Z'
            ultimo = None
            continue
        if it[0] not in ('l', 'c'):
            sys.exit(f'elemento non previsto: {it[0]}')
        a, b = m(it[1]), m(it[-1])
        if ultimo is None or abs(ultimo[0] - a[0]) > 1e-3 or abs(ultimo[1] - a[1]) > 1e-3:
            dd += f'M{n2(a[0])} {n2(a[1])}'
        if it[0] == 'l':
            dd += f'L{n2(b[0])} {n2(b[1])}'
        else:
            c1, c2 = m(it[2]), m(it[3])
            dd += f'C{n2(c1[0])} {n2(c1[1])} {n2(c2[0])} {n2(c2[1])} {n2(b[0])} {n2(b[1])}'
        ultimo = b
    return dd


def punti(g, m):
    return [m(it[2]) for it in g['items']]


def taglia(a, b):
    """segmento tagliato sul quadrato (None se resta fuori), ma lungo fino a SOTTO unità sotto il fondo: nel passo 6 il
    disegno sale e le linee devono continuare sotto (scelta di Roberto)"""
    if not ritaglia(a, b, LATO):
        return None
    # la retta intera, non il segmento: certe linee delle tavole finiscono poco sotto il quadrato (la croce della
    # tavola 19 a 401) e nel passo 6, salite, si vedevano finire prima delle altre
    dx, dy = b[0] - a[0], b[1] - a[1]
    return ritaglia((a[0] - 1000 * dx, a[1] - 1000 * dy), (b[0] + 1000 * dx, b[1] + 1000 * dy), LATO + SOTTO)


def ritaglia(a, b, alto):
    """segmento tagliato sul rettangolo 0…LATO × 0…alto (Liang-Barsky); None se resta fuori"""
    t0, t1 = 0.0, 1.0
    dx, dy = b[0] - a[0], b[1] - a[1]
    for p, q in ((-dx, a[0]), (dx, LATO - a[0]), (-dy, a[1]), (dy, alto - a[1])):
        if p == 0:
            if q < 0:
                return None
        else:
            r = q / p
            if p < 0:
                t0 = max(t0, r)
            else:
                t1 = min(t1, r)
    if t0 >= t1:
        return None
    return (a[0] + t0 * dx, a[1] + t0 * dy, a[0] + t1 * dx, a[1] + t1 * dy)


def linee(n, m):
    """linee di costruzione della tavola n (livello Gridlines), tagliate sul quadrato: (grigie, assi tratteggiati).
    Verso: dall'alto in giù, le orizzontali da sinistra. Doppioni via"""
    grigie, assi, viste = [], [], set()
    for g in disegni(n, 'Gridlines'):
        if len(g['items']) != 1 or g['items'][0][0] != 'l':
            continue
        (_, a, b), = g['items']
        s = taglia(m(a), m(b))
        if not s:
            continue
        x1, y1, x2, y2 = s
        if (x1 > x2) if abs(y2 - y1) < abs(x2 - x1) else (y1 > y2):
            x1, y1, x2, y2 = x2, y2, x1, y1
        chiave = tuple(round(v, 1) for v in (x1, y1, x2, y2))
        if chiave in viste:
            continue
        viste.add(chiave)
        r, _, bl = g['color']
        (assi if bl > 0.9 and r < 0.3 else grigie).append(f'<line x1="{n2(x1)}" y1="{n2(y1)}" x2="{n2(x2)}" y2="{n2(y2)}"/>')
    return grigie, assi


def maschere(nome, elementi):
    """ogni tratteggiato dietro una maschera con la sua copia piena (data-penna), che è quella che si disegna"""
    defs, vivi = [], []
    for i, el in enumerate(elementi, 1):
        id_ = f'gea-evo-{nome}-{i}'
        copia = el.replace('/>', ' stroke="#fff" stroke-width="4" fill="none" data-penna=""/>')
        defs.append(f'<mask id="{id_}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="{LATO + 20}" height="{LATO + SOTTO + 20}">{copia}</mask>')
        vivi.append(el.replace('/>', f' mask="url(#{id_})"/>'))
    return defs, vivi


# ── tavola 16: FIG 03 a sinistra, FIG 04 a destra ────────────────────────────────────────────────────────────────
pezzi16 = disegni(16, 'Livello 1')
fig3 = [g for g in pezzi16 if g['rect'].x1 < 400]
fig4 = [g for g in pezzi16 if g['rect'].x0 > 600]
s3, s4 = scatola(fig3), scatola(fig4)
m3, m4 = mappa(centro(s3)), mappa(centro(s4))
guide1, assi2 = linee(16, m3)
ZOOM = (s3[2] - s3[0]) / (s4[2] - s4[0])   # la FIG 04 grande quanto la FIG 03

# ── tavole 17 e 18: FIG 04 grande ────────────────────────────────────────────────────────────────────────────────
pezzi17 = [g for g in disegni(17, 'Livello 1') if g['color'] == (0.0, 0.0, 0.0)]
s17 = scatola(pezzi17)
m17 = mappa(centro(s17), (s3[2] - s3[0]) / (s17[2] - s17[0]))
guide3, assi3 = linee(17, m17)
gialli = [g for g in disegni(18, 'Livello 1', 'f') if g.get('fill') and g['fill'][2] < 0.5]
if any(abs(a - b) > 0.01 for a, b in zip(scatola([g for g in disegni(18, 'Livello 1') if g['color'] == (0.0, 0.0, 0.0)]), s17)):
    sys.exit('tavole 17 e 18: la FIG 04 grande non è nello stesso posto')

# controllo: la FIG 04 piccola ingrandita di ZOOM attorno al centro deve coincidere con quella grande
def ingrandito(p):
    x, y = m4(p)
    return ((x - LATO / 2) * ZOOM + LATO / 2, (y - LATO / 2) * ZOOM + LATO / 2)
# (Illustrator ha unito i segmenti allineati nella grande: ogni suo vertice deve stare su un vertice della piccola)
piccoli = [q for g in fig4 for q in punti(g, ingrandito)]
scarto = max(min(abs(p[0] - q[0]) + abs(p[1] - q[1]) for q in piccoli) for g in pezzi17 for p in punti(g, m17))
if scarto > 0.2:
    sys.exit(f'FIG 04 piccola ingrandita e grande non combaciano (scarto {scarto:.2f})')

# ── SVG ──────────────────────────────────────────────────────────────────────────────────────────────────────────
VERSO = []
for g in fig3:   # ogni pezzo scivola via dal lato dove sporge di più
    x0, y0, x1, y1 = (v - c for v, c in zip(g['rect'], (*centro(s3), *centro(s3))))
    sporge = {(0, -1): -y0, (0, 1): y1, (-1, 0): -x0, (1, 0): x1}
    VERSO.append(max(sporge, key=sporge.get))

# con lo zoom le linee vecchie restano e si ingrandiscono: della tavola 17 si disegnano solo quelle che non ci sono già
import json, math, re


def retta(el, k=1.0):
    x1, y1, x2, y2 = ((float(v) - LATO / 2) * k + LATO / 2 for v in re.findall(r'[xy][12]="([^"]+)"', el))
    ang = math.atan2(y2 - y1, x2 - x1) % math.pi
    return ang, -math.sin(ang) * x1 + math.cos(ang) * y1


vecchie = [retta(el, ZOOM) for el in guide1 + assi2]


def gia(el):
    a, o = retta(el)
    return any(abs((a - b + math.pi / 2) % math.pi - math.pi / 2) < math.radians(0.2) and abs(o - p) < 0.6 for b, p in vecchie)


def senza_doppioni(els):
    tenute = []
    for el in els:
        a, o = retta(el)
        if not any(abs((a - b + math.pi / 2) % math.pi - math.pi / 2) < math.radians(0.2) and abs(o - p) < 0.6 for b, p in map(retta, tenute)):
            tenute.append(el)
    return tenute


def obliqua(el):
    gradi = math.degrees(retta(el)[0]) % 90
    return 1 < gradi < 89


def dal_centro(el):
    a, o = retta(el)
    return abs(o - (-math.sin(a) + math.cos(a)) * LATO / 2)


tutte3 = len(guide3)
guide3 = [el for el in senza_doppioni(guide3) if not gia(el)]
# delle oblique nuove solo le 8 più vicine al centro (scelta di Roberto); orizzontali e verticali restano
OBLIQUE = 8
centrali = sorted((el for el in guide3 if obliqua(el)), key=dal_centro)[:OBLIQUE]
guide3 = [el for el in guide3 if obliqua(el) and el in centrali]   # la verticale quasi al centro non serve (Roberto)
# la guida orizzontale della tavola 16 quasi al centro non serve in nessun passo (Roberto): via
def dal_centro_zoom(el):
    a, o = retta(el, ZOOM)
    return abs(o - (-math.sin(a) + math.cos(a)) * LATO / 2)


CENTRO_LIBERO = 20   # unità del disegno attorno al centro senza guide dritte, a zoom fatto
via1 = [(i, el) for i, el in enumerate(guide1) if not obliqua(el) and dal_centro_zoom(el) < CENTRO_LIBERO]
guide1 = [el for el in guide1 if el not in [el for _, el in via1]]
assi3 = [el for el in senza_doppioni(assi3) if not gia(el)]

# ── passo 4: FIG 05 (tavola 19, stesso centro e stessa scala delle tavole 17-18) ─────────────────────────────────────
# I trapezi gialli crescono verso il centro fino ai pezzi della FIG 05 (stesso trapezio rettangolo, lati paralleli:
# basta spostare i vertici); le guide sui loro lati obliqui scorrono sulle rette nuove, gli assi rossi si allargano fino
# al riquadro della FIG 05; il contorno della FIG 04 e le altre guide svaniscono, le linee della croce si disegnano.


def forme(da, *tappe):
    """attributi per un elemento che cambia forma o posto: `da` = attributi prima, `tappe` = (passo, fase, durata, attributi).
    Nel file vanno gli attributi dell'ultima tappa (stato finale)"""
    lista = [{'passo': p, 'fase': f, 'durata': d, 'attr': a} for p, f, d, a in tappe]
    return "data-da='" + json.dumps(da) + "' data-forme='" + json.dumps(lista) + "'"


VIA4 = 'data-via="4" data-via-fase="1" data-via-durata="0.6"'


def vertici(g, m):
    """vertici veri di una campitura: senza doppioni né punti allineati (Illustrator ne lascia sui lati)"""
    q = []
    for it in g['items']:
        p = m(it[1])
        if not q or math.dist(p, q[-1]) > 0.05:
            q.append(p)
    if math.dist(q[0], q[-1]) < 0.05:
        q.pop()
    tenuti = []
    for i in range(len(q)):
        a, b, c = q[i - 1], q[i], q[(i + 1) % len(q)]
        seno = ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) / (math.dist(a, b) * math.dist(b, c))
        if abs(seno) > 0.01:   # c'è un angolo vero
            tenuti.append(b)
    return tenuti


def baricentro(v):
    return (sum(p[0] for p in v) / len(v), sum(p[1] for p in v) / len(v))


def poligono(v):
    return 'M' + 'L'.join(f'{n2(x)} {n2(y)}' for x, y in v) + 'Z'


def lato_obliquo(v):
    """retta (angolo, distanza) del lato obliquo di un trapezio rettangolo"""
    for a, b in zip(v, v[1:] + v[:1]):
        ang = math.atan2(b[1] - a[1], b[0] - a[0]) % math.pi
        if 1 < math.degrees(ang) % 90 < 89:
            return ang, -math.sin(ang) * a[0] + math.cos(ang) * a[1]
    sys.exit('trapezio senza lato obliquo')


def stessa(r1, r2):
    return abs((r1[0] - r2[0] + math.pi / 2) % math.pi - math.pi / 2) < math.radians(0.2) and abs(r1[1] - r2[1]) < 0.6


def linea_su(r, k=1.0):
    """la retta r (coordinate del disegno) come <line> tagliata sul quadrato, nel gruppo ingrandito di k se k ≠ 1"""
    ang, off = r
    px, py, dx, dy = -math.sin(ang) * off, math.cos(ang) * off, math.cos(ang), math.sin(ang)
    loc = lambda x, y: ((x - LATO / 2) / k + LATO / 2, (y - LATO / 2) / k + LATO / 2)
    s = taglia(loc(px - 4000 * dx, py - 4000 * dy), loc(px + 4000 * dx, py + 4000 * dy))
    x1, y1, x2, y2 = s
    if (x1 > x2) if abs(y2 - y1) < abs(x2 - x1) else (y1 > y2):
        x1, y1, x2, y2 = x2, y2, x1, y1
    return x1, y1, x2, y2


def sposta(el, nuove):
    """una <line> che nel passo 4 va su `nuove` (x1, y1, x2, y2): nel file la posizione finale, in data-da quella di prima"""
    da = dict(zip(('x1', 'y1', 'x2', 'y2'), re.findall(r'[xy][12]="([^"]+)"', el)))
    fine = dict(zip(('x1', 'y1', 'x2', 'y2'), map(n2, nuove)))
    return (f'<line x1="{fine["x1"]}" y1="{fine["y1"]}" x2="{fine["x2"]}" y2="{fine["y2"]}" '
            + forme(da, (4, 2, 1.2, fine)) + '/>')


def svanisce(el):
    return el.replace('/>', f' {VIA4} visibility="hidden"/>')


pezzi5 = [vertici(g, m17) for g in disegni(19, 'Livello 1', 'f') if g.get('fill') and g['fill'][2] < 0.5]
riquadro5 = (min(p[0] for v in pezzi5 for p in v), min(p[1] for v in pezzi5 for p in v),
             max(p[0] for v in pezzi5 for p in v), max(p[1] for v in pezzi5 for p in v))
trapezi4, oblique4 = [], []   # (prima, dopo): tracciati dei pezzi gialli e rette dei lati obliqui
for g in gialli:
    t = vertici(g, m17)
    if len(t) != 4:
        sys.exit(f'trapezio con {len(t)} vertici')
    ct = baricentro(t)
    f = min(pezzi5, key=lambda v: math.dist(baricentro(v), ct))
    cf = baricentro(f)
    # stessi vertici nello stesso ordine: il giro (e il verso) che li sovrappone meglio
    giri = [f[i:] + f[:i] for i in range(len(f))]
    giri += [list(reversed(gg)) for gg in giri]
    f = min(giri, key=lambda v: sum(math.dist((a[0] - ct[0], a[1] - ct[1]), (b[0] - cf[0], b[1] - cf[1])) for a, b in zip(t, v)))
    trapezi4.append((t, f))
    oblique4.append((lato_obliquo(t), lato_obliquo(f)))


def nel_passo4(el, k=1.0):
    """le guide sui lati obliqui dei trapezi scorrono, le altre svaniscono"""
    r = retta(el, k)
    for prima, dopo in oblique4:
        if stessa(r, prima):
            return sposta(el, linea_su(dopo, k))
    return svanisce(el)


guide1 = [nel_passo4(el, ZOOM) for el in guide1]
guide3 = [nel_passo4(el) for el in guide3]
spostate = sum('data-forme' in el for el in guide1 + guide3)
if spostate != len(oblique4):
    sys.exit(f'passo 4: {spostate} guide sui lati obliqui dei trapezi, ne servono {len(oblique4)}')


def al_riquadro(el):
    x1, y1, x2, y2 = (float(v) for v in re.findall(r'[xy][12]="([^"]+)"', el))
    if abs(x1 - x2) < 1e-3:   # verticale: al lato del riquadro dalla sua parte
        x = riquadro5[0] if x1 < LATO / 2 else riquadro5[2]
        return sposta(el, (x, y1, x, y2))
    y = riquadro5[1] if y1 < LATO / 2 else riquadro5[3]
    return sposta(el, (x1, y, x2, y))


assi3 = [al_riquadro(el) for el in assi3]
# la croce: le guide dritte della tavola 19 che non sono già il riquadro (gli assi rossi lo diventano)
bordi5 = [(0.0, riquadro5[1]), (0.0, riquadro5[3]), (math.pi / 2, -riquadro5[0]), (math.pi / 2, -riquadro5[2])]
croce = [el for el in senza_doppioni(linee(19, m17)[0]) if not obliqua(el) and not any(stessa(retta(el), b) for b in bordi5)]
trapezi = [f'<path d="{poligono(t)}"/>' for t, _ in trapezi4]   # contorni del passo 3, sui trapezi
# ── passo 5: rifinire il simbolo (tavola 20: rettangolo aureo e spirale) e FIG 06 F (tavola 21) ─────────────────────────
# Il rettangolo aureo al centro toglie a ogni pezzo il suo angolo interno: la FIG 06 ha 6 vertici, uno scalino. Perché la
# forma possa crescere, tutte le forme del pezzo (trapezio, FIG 05, FIG 06) hanno 6 vertici: nel trapezio e nella FIG 05
# i tre dello scalino stanno sovrapposti nell'angolo interno, e nel passo 5 si aprono.
pezzi6 = [vertici(g, m17) for g in disegni(21, 'Livello 1', 'f') if g.get('fill') and g['fill'][2] < 0.5]
gialli = []
for t, f in trapezi4:
    s6 = min(pezzi6, key=lambda v: math.dist(baricentro(v), baricentro(f)))
    if len(s6) != 6:
        sys.exit(f'FIG 06: pezzo con {len(s6)} vertici')
    i = min(range(4), key=lambda j: math.dist(f[j], (LATO / 2, LATO / 2)))   # angolo interno: il più vicino al centro
    # nella FIG 06: i vertici che restano della FIG 05 e, tra il precedente e il seguente dell'angolo, i tre dello scalino
    dove = lambda p: min(range(6), key=lambda j: math.dist(s6[j], p))
    if (dove(f[i - 1]) + 4) % 6 != dove(f[(i + 1) % 4]):
        s6 = list(reversed(s6))
    prima = dove(f[i - 1])
    if (prima + 4) % 6 != dove(f[(i + 1) % 4]):
        sys.exit("FIG 06: lo scalino non sta tra i vertici accanto all'angolo interno")
    scalino = [s6[(prima + k) % 6] for k in (1, 2, 3)]
    sei = lambda v, tre: v[:i] + tre + v[i + 1:]
    t6, f6, g6 = sei(t, [t[i]] * 3), sei(f, [f[i]] * 3), sei(f, scalino)
    gialli.append(f'<path d="{poligono(g6)}" '
                  + forme({'d': poligono(t6)}, (4, 2, 1.2, {'d': poligono(f6)}), (5, 3, 1.0, {'d': poligono(g6)})) + '/>')

assi5 = senza_doppioni(linee(20, m17)[1])
# costruzione della spirale: il quadrato, il rettangolo aureo, la spirale con le suddivisioni (tratti pieni, senza doppioni)
costruzione5, viste5 = [], set()
for g in disegni(20, 'Gridlines'):
    if (len(g['items']) == 1 and g['items'][0][0] == 'l') or str(g.get('dashes', '')).startswith('[ 12'):
        continue
    d5 = tracciato(g, m17)
    if d5 not in viste5:
        viste5.add(d5)
        costruzione5.append((g['rect'].width * g['rect'].height, len(g['items']), d5))
# prima il quadrato (il più grande), poi il rettangolo, per ultima la spirale (la più articolata)
costruzione5.sort(key=lambda c: (c[1] > 1, -c[0]))
costruzione5 = [f'<path d="{d5}"/>' for _, _, d5 in costruzione5]
defs_a2, assi2_vivi = maschere('asse', assi2)
defs_a3, assi3_vivi = maschere('asse3', assi3)
defs_t, trapezi_vivi = maschere('trapezio', trapezi)
defs_a5, assi5_vivi = maschere('asse5', assi5)

# ── passo 6: simbolo + logotipo (tavola 25) e logo finale (tavola 26) ─────────────────────────────────────────────────
# Il simbolo della tavola 25 è la FIG 06 ingrandita: la si porta sulla nostra, poi tutto sale di SU perché il logo intero
# stia al centro del quadrato (le linee continuano sotto). Per ogni riga di testo: le sue linee di costruzione, poi le
# lettere (G&A prima a contorno, poi piene) in giallo; alla fine il testo diventa grigio e le linee svaniscono.
fill25 = disegni(25, 'Livello 1', 'f')
sim25 = [g for g in fill25 if g['rect'].y1 < 300]
s25, logo25 = scatola(sim25), scatola(fill25)
f6 = (min(p[0] for v in pezzi6 for p in v), min(p[1] for v in pezzi6 for p in v),
      max(p[0] for v in pezzi6 for p in v), max(p[1] for v in pezzi6 for p in v))
k25 = (f6[2] - f6[0]) / (s25[2] - s25[0])
SU = (centro(logo25)[1] - centro(s25)[1]) * k25
c25, cf6 = centro(s25), centro(f6)
m25 = lambda p: ((p.x - c25[0]) * k25 + cf6[0], (p.y - c25[1]) * k25 + cf6[1] - SU)
scarto25 = max(min(math.dist((x, y + SU), q) for v in pezzi6 for q in v) for g in sim25 for x, y in vertici(g, m25))
if scarto25 > 0.2:
    sys.exit(f'tavola 25: il simbolo non è la FIG 06 (scarto {scarto25:.2f})')

righe25 = {   # le tre righe di testo, dall'alto: (lettere, linee di costruzione)
    'ga': [g for g in fill25 if 300 < g['rect'].y0 < 420],
    'porte': [g for g in fill25 if 420 <= g['rect'].y0 < 455],
    'gruppo': [g for g in fill25 if 455 <= g['rect'].y0 < 480],
}
if sum(map(len, righe25.values())) + len(sim25) != len(fill25):
    sys.exit('tavola 25: lettere fuori dalle tre righe')
scatole25 = {nome: [*m25(fitz.Point(s[0], s[1])), *m25(fitz.Point(s[2], s[3]))] for nome, s in ((n, scatola(gs)) for n, gs in righe25.items())}
linee25 = {nome: [] for nome in righe25}
for el in senza_doppioni(linee(25, m25)[0]):
    x1, y1, x2, y2 = (float(v) for v in re.findall(r'[xy][12]="([^"]+)"', el))
    for nome, (sx0, sy0, sx1, sy1) in scatole25.items():
        orizzontale = abs(y1 - y2) < 1e-3 and sy0 - 1 <= y1 <= sy1 + 1
        verticale = abs(x1 - x2) < 1e-3 and min(abs(x1 - sx0), abs(x1 - sx1)) < 1
        if orizzontale or verticale:
            linee25[nome].append(el)
            break   # le altre sono del simbolo, e ci sono già


def chiuso(d):
    """contorno da disegnare: ogni sottotracciato chiuso"""
    return re.sub(r'(?<!^)M', 'ZM', d) + 'Z'


lettere25 = {nome: [f'<path d="{tracciato(g, m25)}"/>' for g in gs] for nome, gs in righe25.items()}
contorni25 = [f'<path d="{chiuso(tracciato(g, m25))}"/>' for g in righe25['ga']]
TRASLA = f'data-trasla="6" data-trasla-fase="2" data-trasla-durata="1" data-trasla-y="{-SU:.2f}"'
su = f'translate(0 {n2(-SU)})'
VIA6 = 'data-via="6" data-via-fase="10" data-via-durata="0.6"'   # le linee di costruzione, alla fine
COLORE6 = f'data-colore="6" data-colore-fase="10" data-colore-durata="0.6" data-colore-da="{GIALLO}"'
fuori = f'M-80 -80H{LATO + 80}V{LATO + 80}H-80Z M{n2(m4(fitz.Point(s4[0], 0))[0])} {n2(m4(fitz.Point(0, s4[1]))[1])}' \
        f'V{n2(m4(fitz.Point(0, s4[3]))[1])}H{n2(m4(fitz.Point(s4[2], 0))[0])}V{n2(m4(fitz.Point(0, s4[1]))[1])}Z'
zoom = f'matrix({n2(ZOOM)} 0 0 {n2(ZOOM)} {n2(LATO / 2 * (1 - ZOOM))} {n2(LATO / 2 * (1 - ZOOM))})'
solo_zoom = f'data-zoom="3" data-scala="{ZOOM:.4f}"'


def gruppo(attr, figli, nascosto=False, trasforma=None):
    extra = (' visibility="hidden"' if nascosto else '') + (f' transform="{trasforma}"' if trasforma else '')
    return [f'<g {attr}{extra}>', *figli, '</g>']


righe = [
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LATO} {LATO}">',
    '<!-- Evoluzione del simbolo di G&A (cella evoluzione, scripts/evoluzione.ts), generato da tools/gea-evoluzione.py dalle',
    '     tavole 16-25 di sorgenti/gea/gea-tavole.ai: non modificare a mano. Gli angoli di due finestre in legno affiancate',
    '     (montante e traverso, intagli a coda di rondine) diventano il cuore del simbolo nuovo.',
    "     Ogni gruppo figlio dell'svg dice cosa fa e quando. data-passo = passo in cui entra, data-fase = fase del passo",
    "     (le fasi una dopo l'altra, ognuna dura quanto la sua azione più lunga), poi l'azione:",
    '       data-disegna="scaglioni|insieme" + data-durata (+ data-dopo, ritardo nella fase): i tratti si disegnano',
    '       data-compare="durata" compare (vuoto: di colpo) · data-scivola: i figli scivolano via nel loro data-verso',
    '     data-via = passo in cui sparisce (data-via-fase, data-via-durata: di colpo se manca).',
    '     data-zoom = passo in cui si ingrandisce di data-scala attorno al centro (fase 1, insieme al primo svanire).',
    '     Anche su un elemento solo: data-via (svanisce) e data-forme (tappe: passo, fase, durata, attributi; in data-da quelli',
    "     di prima): linee che scorrono, forme che crescono. Gli attributi del file sono quelli dell'ultima tappa.",
    '     data-trasla = passo in cui il gruppo sale o scende di data-trasla-y (data-trasla-fase, data-trasla-durata).',
    '     data-colore = passo in cui --pieno passa da data-colore-da al colore del file. data-uno-a-uno: compare un figlio',
    '     alla volta (le lettere).',
    '     data-tinta = colore (guida, segno, rosso, pieno con --pieno). I tratteggiati si disegnano con la copia piena',
    "     nella loro maschera (data-penna). Così com'è, il file è lo stato finale (senza JavaScript). -->",
    '<defs>',
    f'<clipPath id="gea-evo-fuori"><path clip-rule="evenodd" d="{fuori}"/></clipPath>',
    *defs_a2, *defs_a3, *defs_t, *defs_a5,
    '</defs>',
    *gruppo(f'data-passo="1" data-disegna="scaglioni" data-durata="1.1" {solo_zoom} {TRASLA} {VIA6} data-tinta="guida"', guide1, True,
            trasforma=f'{su} {zoom}'),
    *gruppo(f'data-passo="3" data-fase="3" data-disegna="scaglioni" data-durata="1.1" {TRASLA} {VIA6} data-tinta="guida"', guide3, True, trasforma=su),
    *gruppo(f'data-passo="3" data-fase="5" data-compare="0.5" {TRASLA} data-tinta="pieno" style="--pieno: {GIALLO}"', gialli, trasforma=su),
    *gruppo(f'data-passo="4" data-disegna="scaglioni" data-durata="0.8" data-dopo="0.2" {TRASLA} {VIA6} data-tinta="guida"', croce, True, trasforma=su),
    # passo 6: per ogni riga le sue linee di costruzione, poi le lettere (G&A prima a contorno) in giallo; alla fine grigio
    *gruppo(f'data-passo="6" data-fase="3" data-disegna="scaglioni" data-durata="0.8" {VIA6} data-tinta="guida"', linee25['ga'], True),
    *gruppo('data-passo="6" data-fase="4" data-disegna="insieme" data-durata="1.4" data-via="6" data-via-fase="5" data-via-durata="0.4" '
            'data-tinta="segno"', contorni25, True),
    *gruppo(f'data-passo="6" data-fase="5" data-compare="0.5" {COLORE6} data-tinta="pieno" style="--pieno: {GRIGIO}"', lettere25['ga']),
    *gruppo(f'data-passo="6" data-fase="6" data-disegna="scaglioni" data-durata="0.6" {VIA6} data-tinta="guida"', linee25['porte'], True),
    *gruppo(f'data-passo="6" data-fase="7" data-compare="0.3" data-uno-a-uno="" {COLORE6} data-tinta="pieno" style="--pieno: {GRIGIO}"',
            lettere25['porte']),
    *gruppo(f'data-passo="6" data-fase="8" data-disegna="scaglioni" data-durata="0.6" {VIA6} data-tinta="guida"', linee25['gruppo'], True),
    *gruppo(f'data-passo="6" data-fase="9" data-compare="0.3" data-uno-a-uno="" {COLORE6} data-tinta="pieno" style="--pieno: {GRIGIO}"',
            lettere25['gruppo']),
    *gruppo('data-passo="1" data-disegna="insieme" data-durata="2.2" data-dopo="0.15" data-via="2" data-via-fase="2" data-tinta="segno"',
            [f'<path d="{tracciato(g, m3)}"/>' for g in fig3], True),
    *gruppo('data-passo="2" data-fase="2" data-scivola="" data-tinta="segno"',
            [f'<g data-verso="{v[0]} {v[1]}"><path d="{tracciato(g, m3)}" clip-path="url(#gea-evo-fuori)"/></g>' for g, v in zip(fig3, VERSO)], True),
    *gruppo(f'data-passo="2" data-fase="2" data-compare="" data-zoom="3" data-scala="{ZOOM:.4f}" {VIA4} data-tinta="segno"',
            [f'<path d="{tracciato(g, m4)}"/>' for g in fig4], True, trasforma=zoom),
    *gruppo(f'data-passo="2" data-disegna="scaglioni" data-durata="0.7" {solo_zoom} {VIA4} data-tinta="rosso" data-tratteggio=""', assi2_vivi, True, trasforma=zoom),
    *gruppo('data-passo="3" data-fase="2" data-disegna="scaglioni" data-durata="0.8" data-via="6" data-via-durata="0.5" '
            'data-tinta="rosso" data-tratteggio=""', assi3_vivi, True),
    *gruppo('data-passo="3" data-fase="4" data-disegna="insieme" data-durata="0.7" data-via="3" data-via-fase="5" data-via-durata="0.5" '
            'data-tinta="rosso" data-tratteggio=""', trapezi_vivi, True),
    *gruppo('data-passo="5" data-disegna="scaglioni" data-durata="0.8" data-via="6" data-via-durata="0.5" '
            'data-tinta="rosso" data-tratteggio=""', assi5_vivi, True),
    # quadrato, rettangolo e spirale uno dopo l'altro (la spirale più lenta), poi svaniscono: resta la FIG 06 F
    *[r for k, el in enumerate(costruzione5) for r in gruppo(
        f'data-passo="5" data-fase="2" data-disegna="insieme" data-durata="{1.8 if k == len(costruzione5) - 1 else 0.6}" '
        f'data-dopo="{0.45 * k:.2f}" data-via="5" data-via-fase="4" data-via-durata="0.6" data-tinta="rosso"', [el], True)],
    '</svg>',
]
with open(SVG, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(righe) + '\n')
print(f'passo 6: sale di {SU:.1f}, scala {k25:.4f}, scarto simbolo {scarto25:.3f}, linee ' + str({n: len(v) for n, v in linee25.items()}) + ', lettere ' + str({n: len(v) for n, v in lettere25.items()}))
print(f'passo 5: assi {len(assi5)}, costruzione {len(costruzione5)}')
print(f'passo 4: croce {len(croce)}, guide che scorrono {spostate}, riquadro {[round(v, 1) for v in riquadro5]}')
print(f'{os.path.relpath(SVG)}: guide {len(guide1)} (- {len(via1)} al centro) + {len(guide3)} nuove (su {tutte3}), assi {len(assi2)} + {len(assi3)}, '
      f'trapezi {len(trapezi)}, zoom ×{ZOOM:.4f}, scarto FIG 04 {scarto:.3f}, versi {VERSO}')
