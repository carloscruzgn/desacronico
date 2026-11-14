"""Extrae las cartas de «Desacrónico (impresión original).pdf» para la versión digital.

Uso: python3 extraer_cartas.py RUTA_DEL_PDF CARPETA_JUEGO
Genera CARPETA_JUEGO/cartas/NNNa.jpg (anverso) y NNNr.jpg (reverso), y cards.json / problems.json
en la carpeta actual. Requiere: pip install pymupdf pillow
El PDF tiene 8 cartas por hoja: páginas impares = reversos; pares = anversos en espejo.
"""
import pymupdf, json, re, os, io, sys, collections
from PIL import Image
PDF, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT+"/cartas",exist_ok=True)
d=pymupdf.open(PDF)
W,H=184.3,255.1; SX,SY=189.95,260.8; X0,Y0=43.9,39.7
def rect(r,c):
    x=X0+c*SX; y=Y0+r*SY; return pymupdf.Rect(x,y,x+W,y+H)
def inside(b,R):
    cx=(b[0]+b[2])/2; cy=(b[1]+b[3])/2; return R.x0<=cx<=R.x1 and R.y0<=cy<=R.y1
def key(c): return tuple(round(x,2) for x in c)
def near(tab,c):
    best=min(tab,key=lambda k:sum((a-b)**2 for a,b in zip(k,c)))
    assert sum((a-b)**2 for a,b in zip(best,c))<0.003,c
    return tab[best]
AMB={key((0,0,0)):"social",key((0.922,0.916,0.851)):"comunicacion",key((0.787,0.837,0.795)):"cientifico",key((0.056,0.151,0.362)):"coria",key((0.405,0.351,0.559)):"mujer"}
BAND={key((0.707,0.427,0.478)):"antigua",key((0.619,0.604,0.404)):"media",key((0.403,0.697,0.682)):"moderna",key((0.306,0.335,0.633)):"contemporanea"}
def era(y): return "antigua" if y<=499 else "media" if y<=1499 else "moderna" if y<=1799 else "contemporanea"
def fills(P): return [g for g in P.get_drawings() if g.get('fill') is not None]
def logo(P,R,bg):
    # rectángulo de fondo del logo: ~44x31, del color de la carta
    for g in fills(P):
        rr=g['rect']
        if 40<rr.width<62 and 28<rr.height<35 and inside(rr,R) and sum((a-b)**2 for a,b in zip(g['fill'],bg))<0.003:
            cx=(rr.x0+rr.x1)/2-R.x0; cy=(rr.y0+rr.y1)/2-R.y0
            return ("t" if cy<100 else "b")+("l" if cx<W/2 else "r")
    return None
def esc(t): return t.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
def desc_html(P,R):
    lines=[]
    for b in P.get_text("dict")["blocks"]:
        if b['type']!=0: continue
        for l in b['lines']:
            ss=[s for s in l['spans'] if round(s['size'])==10 and inside(s['bbox'],R)]
            if not ss: continue
            h=""
            for s in ss:
                t=esc(s['text'].replace("\n",""))
                h+= f"<i>{t}</i>" if "Italic" in s['font'] and t.strip() else t
            lines.append((round(l['bbox'][1]),h))
    lines.sort(key=lambda x:x[0])
    txt=" ".join(h.strip() for _,h in lines)
    txt=re.sub(r"\s+"," ",txt).replace("</i> <i>"," ").replace("</i><i>","")
    return txt.strip()
def render(P,R,name):
    pix=P.get_pixmap(clip=R,matrix=pymupdf.Matrix(3,3),alpha=False)
    im=Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    im.save(f"{OUT}/cartas/{name}.jpg",quality=80,optimize=True,progressive=True)
cards=[]; problems=[]
for pn in range(0,len(d),2):
    P=d[pn]; A=d[pn+1]
    spans=[s for b in P.get_text("dict")["blocks"] if b['type']==0 for l in b['lines'] for s in l['spans']]
    F=fills(P)
    for r in range(2):
        for c in range(4):
            R=rect(r,c); ss=[s for s in spans if inside(s['bbox'],R)]
            if not ss: continue
            ytxt=" ".join(s['text'].strip() for s in ss if round(s['size'])==28).strip()
            small=[s for s in ss if round(s['size'])==5]
            credit="".join(s['text'] for s in small).split("\n",1)[-1]
            credit=re.sub(r"\s+"," ",credit).strip()
            big=[g for g in F if inside(g['rect'],R) and g['rect'].width>150 and g['rect'].height>150]
            bg=big[0]['fill']; amb=near(AMB,bg)
            band=[g for g in F if inside(g['rect'],R) and g['rect'].width>150 and 25<g['rect'].height<40]
            bandera=near(BAND,band[0]['fill'])
            m=re.fullmatch(r"(c\.\s*)?(-?\d+)",ytxt)
            if not m: problems.append(("año ilegible",pn+1,ytxt)); continue
            y=int(m.group(2))
            n=len(cards)+1; cid=f"{n:03d}"
            RA=rect(r,3-c)
            card=dict(id=cid,anio=y,circa=bool(m.group(1)),texto=desc_html(P,R),ambito=amb,era=era(y),
                      logoAnverso=logo(A,RA,bg),logoReverso=logo(P,R,bg),credito=credit,origen=f"p{pn+1} f{r+1} c{c+1}")
            if bandera!=card['era']: problems.append(("color de banda no coincide con la era",cid,y,bandera,card['texto']))
            if card['texto']!=desc_html(A,RA): problems.append(("texto anverso/reverso distinto",cid,card['texto'],desc_html(A,RA)))
            if not card['logoAnverso'] or not card['logoReverso']: problems.append(("logo no detectado",cid,card['logoAnverso'],card['logoReverso']))
            elif card['logoAnverso']==card['logoReverso']: problems.append(("logo en la misma esquina en ambas caras",cid,card['texto']))
            render(P,R,cid+"r"); render(A,RA,cid+"a")
            cards.append(card)
json.dump(cards,open("cards.json","w"),ensure_ascii=False,indent=1)
json.dump(problems,open("problems.json","w"),ensure_ascii=False,indent=1)
print(len(cards)); print(collections.Counter(c['ambito'] for c in cards)); print(collections.Counter(c['era'] for c in cards))
print(collections.Counter(c['logoAnverso'] for c in cards),collections.Counter(c['logoReverso'] for c in cards))
for p in problems: print(p)
