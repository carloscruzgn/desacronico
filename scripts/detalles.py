"""Detalle ampliado del reverso de cada carta (ANIM-22).

En la carta impresa, el reverso no repite la ilustración entera: muestra un
detalle ampliado. Este script casa la zona de imagen de cada reverso escaneado
(`_local/juego-original/cartas/NNNr.jpg`) con la ilustración de la web
(`public/cartas/NNN.webp`) y guarda en `compartido/detalles.json` cómo hay que
recolocar la imagen del reverso para que se vea el mismo detalle.

Uso (necesita opencv-python-headless y numpy):
    python scripts/detalles.py                  # las 323 cartas
    python scripts/detalles.py 137 024 262      # solo esas
    python scripts/detalles.py --hojas DIR      # además, hojas de contactos en DIR
Opciones:
    --salida RUTA     otro JSON de salida (por defecto compartido/detalles.json)
    --fijar NNN=null  fuerza un valor tras revisarlo a ojo (se puede repetir;
                      las forzadas de siempre están en FORZADAS, más abajo)

CONVENCIÓN DE LOS VALORES  { "NNN": [x, y, s] | null }
-----------------------------------------------------------------------------
Marco: la ilustración del reverso en Carta.svelte (83,4 × 73,3 cqw, relación
1,1378), con la imagen en `object-fit: cover`.

  s  Ampliación respecto a cómo pinta hoy `object-fit: cover` (s >= 1).
     s = 1 es la imagen a tamaño «cover», sin ampliar.
  x, y  Punto fijo, en fracción 0-1 del ancho y alto de la imagen. Es el
     punto de la imagen que queda en la misma fracción del marco: el píxel de
     la imagen en (x·ancho, y·alto) se ve en (x·W, y·H) del marco. Con eso
     basta CSS puro, sin conocer la proporción de cada imagen:

       object-fit: cover;
       object-position: calc(var(--x) * 100%) calc(var(--y) * 100%);
       transform: scale(var(--s));
       transform-origin: calc(var(--x) * 100%) calc(var(--y) * 100%);

     Relación con el recorte visible: si el detalle ocupa en la imagen el
     rectángulo [x0, x0 + w] × [y0, y0 + h] (en fracciones), entonces
     x = x0 / (1 - w), y = y0 / (1 - h) (0,5 si w o h valen 1), y
     s = w_cover / w, donde w_cover es la fracción del ancho que enseña hoy
     `cover`. El centro del detalle está en (x0 + w/2, y0 + h/2).
  null  Sin reverso escaneado, ilustración vacía, o el reverso no casa con la
     ilustración: otra parte de la obra que la web no tiene, imagen en espejo,
     o un detalle que cae tan fuera del recorte de la web que lo pintable se
     aparta más de un 30 % del impreso. Carta.svelte pinta entonces la imagen
     como hoy (los valores por defecto 0,5 / 0 / 1 equivalen a `center top`).
Los valores se redondean a 4 decimales (x, y) y 3 (s).

Cómo se calcula: SIFT + RANSAC (similitud) entre el marco del reverso, sin la
pestaña del logo, y la ilustración; reajuste a escala + traslación sin giro; si
SIFT no basta (logotipos), plantilla multiescala. Confianza: correlación (NCC)
entre el reverso y la ilustración casada en bruto (aceptadas: >= 0,957), y
«desvío»: cuánto se aparta el detalle pintable del impreso cuando la ilustración
de la web está recortada más ceñida que la del impreso y hay que recolocarlo
dentro de ella (> 0,03 sale en las hojas de dudosas; > 0,3 se deja null).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
ESCANEOS = RAIZ / '_local' / 'juego-original' / 'cartas'
ILUSTRACIONES = RAIZ / 'public' / 'cartas'
CARTAS = RAIZ / 'compartido' / 'cartas.json'
SALIDA = RAIZ / 'compartido' / 'detalles.json'

# Geometría de la carta impresa (554 × 766), igual que Carta.svelte en cqw.
ANCHO_CARTA = 554
CQW = ANCHO_CARTA / 100
MARCO = (round(8.3 * CQW), round(8.3 * CQW), round(91.7 * CQW), round((8.3 + 73.3) * CQW))  # x0 y0 x1 y1
W_MARCO = MARCO[2] - MARCO[0]
H_MARCO = MARCO[3] - MARCO[1]
R_MARCO = 83.4 / 73.3
PESTANA = (27 * CQW, 15 * CQW)  # pestaña del logo en el reverso
RADIO = 4 * CQW

UMBRAL_NCC = 0.6        # correlación mínima entre el reverso y la ilustración casada en bruto
UMBRAL_DESVIO = 0.03    # por encima, la carta sale en la hoja de dudosas para revisarla a ojo
UMBRAL_NULL = 0.3       # por encima, el detalle pintable se aparta tanto del impreso que se deja null

# Decisiones tomadas a ojo sobre las hojas de contactos: NNN -> None (no casa).
FORZADAS: dict[str, None] = {}


def leer(ruta: Path) -> np.ndarray | None:
    if not ruta.exists():
        return None
    datos = np.fromfile(str(ruta), dtype=np.uint8)
    return cv2.imdecode(datos, cv2.IMREAD_COLOR)


def mascara_marco(logo: str) -> np.ndarray:
    """Zona útil del marco del reverso: sin la pestaña del logo ni las esquinas redondeadas."""
    m = np.full((H_MARCO, W_MARCO), 255, np.uint8)
    pw, ph = int(PESTANA[0]) + 6, int(PESTANA[1]) + 6
    if logo:
        y = 0 if logo[0] == 't' else H_MARCO - ph
        x = 0 if logo[1] == 'l' else W_MARCO - pw
        m[y:y + ph, x:x + pw] = 0
    r = int(RADIO) + 3
    m[:r, :r] = 0
    m[:r, -r:] = 0
    m[-3:, :] = 0
    m[:3, :] = 0
    m[:, :3] = 0
    m[:, -3:] = 0
    return m


def cover(iw: int, ih: int, w: float, h: float) -> float:
    return max(w / iw, h / ih)


def matriz_css(iw: int, ih: int, x: float, y: float, s: float, w: float = W_MARCO, h: float = H_MARCO) -> np.ndarray:
    """Afín imagen -> marco tal como la pinta el CSS de la cabecera."""
    c = cover(iw, ih, w, h)
    ox = (w - iw * c) * x
    oy = (h - ih * c) * y
    px, py = x * w, y * h  # transform-origin
    # F = (ox + u c, oy + v c);  F' = P + s (F - P)
    return np.array([[s * c, 0, px + s * (ox - px)],
                     [0, s * c, py + s * (oy - py)]], np.float64)


def pintar_css(img: np.ndarray, x: float, y: float, s: float) -> np.ndarray:
    ih, iw = img.shape[:2]
    return cv2.warpAffine(img, matriz_css(iw, ih, x, y, s), (W_MARCO, H_MARCO),
                          flags=cv2.INTER_AREA if s < 1 else cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 0, 255))


def ncc(a: np.ndarray, b: np.ndarray, mascara: np.ndarray) -> float:
    ga = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32)
    gb = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32)
    ga = cv2.GaussianBlur(ga, (5, 5), 0)
    gb = cv2.GaussianBlur(gb, (5, 5), 0)
    sel = mascara > 0
    va, vb = ga[sel], gb[sel]
    va = va - va.mean()
    vb = vb - vb.mean()
    den = float(np.sqrt((va * va).sum() * (vb * vb).sum()))
    return float((va * vb).sum() / den) if den > 0 else 0.0


SIFT = cv2.SIFT_create(nfeatures=4000)
MATCHER = cv2.BFMatcher(cv2.NORM_L2)


def casar(rev: np.ndarray, ilu: np.ndarray, mascara: np.ndarray):
    """Similitud (escala + traslación) que lleva el marco del reverso a la ilustración."""
    g1 = cv2.cvtColor(rev, cv2.COLOR_BGR2GRAY)
    g2 = cv2.cvtColor(ilu, cv2.COLOR_BGR2GRAY)
    k1, d1 = SIFT.detectAndCompute(g1, mascara)
    k2, d2 = SIFT.detectAndCompute(g2, None)
    if d1 is None or d2 is None or len(k1) < 8 or len(k2) < 8:
        return None
    buenos = []
    for par in MATCHER.knnMatch(d1, d2, k=2):
        if len(par) == 2 and par[0].distance < 0.75 * par[1].distance:
            buenos.append(par[0])
    if len(buenos) < 6:
        return None
    p1 = np.float32([k1[m.queryIdx].pt for m in buenos])
    p2 = np.float32([k2[m.trainIdx].pt for m in buenos])
    M, inl = cv2.estimateAffinePartial2D(p1, p2, method=cv2.RANSAC, ransacReprojThreshold=4.0,
                                         maxIters=5000, confidence=0.999)
    if M is None:
        return None
    inl = inl.ravel().astype(bool)
    # Reajuste solo con escala + traslación (sin giro) sobre los inliers.
    a, b = p1[inl], p2[inl]
    if len(a) < 4:
        return None
    ma, mb = a.mean(0), b.mean(0)
    da, db = a - ma, b - mb
    k = float((da * db).sum() / (da * da).sum())
    t = mb - k * ma
    giro = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
    return k, t, int(inl.sum()), len(buenos), giro


def casar_plantilla(rev: np.ndarray, ilu: np.ndarray, mascara: np.ndarray):
    """Plan B para imágenes con pocos rasgos (logotipos): plantilla multiescala con la parte
    central del marco. Devuelve lo mismo que casar()."""
    g1 = cv2.cvtColor(rev, cv2.COLOR_BGR2GRAY).astype(np.float32)
    g2 = cv2.cvtColor(ilu, cv2.COLOR_BGR2GRAY).astype(np.float32)
    mx, my = int(W_MARCO * 0.2), int(H_MARCO * 0.2)
    plant = g1[my:H_MARCO - my, mx:W_MARCO - mx]
    masc = mascara[my:H_MARCO - my, mx:W_MARCO - mx].astype(np.float32) / 255
    mejor = None
    for k in np.geomspace(0.4, 4.0, 80):  # píxeles de ilustración por píxel de reverso
        esc = cv2.resize(g2, None, fx=1 / k, fy=1 / k, interpolation=cv2.INTER_AREA)
        if esc.shape[0] < plant.shape[0] or esc.shape[1] < plant.shape[1]:
            break
        r = cv2.matchTemplate(esc, plant, cv2.TM_CCOEFF_NORMED, mask=masc)
        r[~np.isfinite(r)] = -1
        _, v, _, p = cv2.minMaxLoc(r)
        if mejor is None or v > mejor[0]:
            mejor = (v, k, p)
    if mejor is None or mejor[0] < 0.5:
        return None
    v, k, (px, py) = mejor
    t = np.array([(px - mx) * k, (py - my) * k])
    return float(k), t, 0, 0, 0.0


def calcular(nnn: str, logo: str):
    rev_completo = leer(ESCANEOS / f'{nnn}r.jpg')
    ilu = leer(ILUSTRACIONES / f'{nnn}.webp')
    info = {'id': nnn}
    if rev_completo is None or ilu is None:
        info['motivo'] = 'sin reverso' if rev_completo is None else 'sin ilustración'
        return None, info
    x0, y0, x1, y1 = MARCO
    rev = rev_completo[y0:y1, x0:x1]
    mascara = mascara_marco(logo)
    info['rev'] = rev
    info['ilu'] = ilu
    info['mascara'] = mascara
    if float(ilu.std()) < 1:  # ilustración vacía (p. ej., toda blanca)
        info['motivo'] = 'ilustración vacía'
        return None, info
    candidatos = []
    r = casar(rev, ilu, mascara)
    if r is not None:
        candidatos.append(evaluar(r, False, rev, ilu, mascara))
    if not candidatos or not candidatos[0][0]:
        r = casar_plantilla(rev, ilu, mascara)
        if r is not None:
            candidatos.append(evaluar(r, True, rev, ilu, mascara))
    if not candidatos:
        info['motivo'] = 'sin casar'
        return None, info
    ok, valor, datos = max(candidatos, key=lambda c: (c[0], c[2]['ncc_bruto']))
    info.update(datos)
    if not ok:
        info['motivo'] = 'fuera de la ilustración' if datos['ncc_bruto'] >= UMBRAL_NCC             and datos['desvio'] > UMBRAL_NULL else 'confianza baja'
        return None, info
    return valor, info


def evaluar(r, plantilla: bool, rev: np.ndarray, ilu: np.ndarray, mascara: np.ndarray):
    """De la similitud reverso -> ilustración saca [x, y, s] y las medidas de confianza."""
    k, t, n_inl, n_buenos, giro = r
    ih, iw = ilu.shape[:2]
    # Rectángulo del marco en píxeles de la ilustración.
    X0, Y0 = t
    X1, Y1 = t + k * np.array([W_MARCO, H_MARCO])
    wf, hf = (X1 - X0) / iw, (Y1 - Y0) / ih
    x0f, y0f = X0 / iw, Y0 / ih
    c = cover(iw, ih, W_MARCO, H_MARCO)
    w_cover = W_MARCO / (iw * c)
    s = w_cover / wf
    fuera = max(0.0, -x0f, -y0f, x0f + wf - 1, y0f + hf - 1)
    sx = 0.5 if wf >= 0.999 else x0f / (1 - wf)
    sy = 0.5 if hf >= 0.999 else y0f / (1 - hf)
    x = float(np.clip(sx, 0, 1))
    y = float(np.clip(sy, 0, 1))
    s = float(np.clip(s, 1.0, 20.0))
    # Cuánto se aparta el detalle que se puede pintar del impreso (la ilustración de la web suele
    # estar recortada más ceñida que la del impreso), en fracción del marco: centro y tamaño.
    wv, hv = w_cover / s, (H_MARCO / (ih * c)) / s
    vx0 = x * (1 - wv)
    vy0 = y * (1 - hv)
    desvio = max(abs((vx0 + wv / 2) - (x0f + wf / 2)) / wf, abs((vy0 + hv / 2) - (y0f + hf / 2)) / hf,
                 abs(wv / wf - 1))
    pintado = pintar_css(ilu, x, y, s)
    valor_ncc = ncc(rev, pintado, mascara)
    # Casado en bruto, sin recolocar dentro de la imagen: mide si el reverso es de verdad
    # un trozo de la ilustración aunque la web la tenga recortada más ceñida que el impreso.
    A = np.array([[1 / k, 0, -t[0] / k], [0, 1 / k, -t[1] / k]])
    bruto = cv2.warpAffine(ilu, A, (W_MARCO, H_MARCO), borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 0, 255))
    validos = cv2.warpAffine(np.full(ilu.shape[:2], 255, np.uint8), A, (W_MARCO, H_MARCO),
                             flags=cv2.INTER_NEAREST, borderValue=0)
    m_bruto = cv2.bitwise_and(mascara, validos)
    ncc_bruto = ncc(rev, bruto, m_bruto) if (m_bruto > 0).mean() > 0.3 else 0.0
    datos = dict(k=k, inliers=n_inl, buenos=n_buenos, giro=giro, fuera=fuera, desvio=desvio, ncc=valor_ncc,
                 ncc_bruto=ncc_bruto, bruto=bruto, pintado=pintado, crudo=[sx, sy, w_cover / wf],
                 plantilla=plantilla)
    valor = [round(x, 4), round(y, 4), round(s, 3)]
    ok = ncc_bruto >= UMBRAL_NCC and (n_inl >= 8 or plantilla) and abs(giro) < 3 and desvio <= UMBRAL_NULL
    return ok, valor, datos


def rotular(img: np.ndarray, texto: str, color=(0, 0, 0)) -> np.ndarray:
    barra = np.full((26, img.shape[1], 3), 255, np.uint8)
    cv2.putText(barra, texto, (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)
    return np.vstack([barra, img])


def ficha(info, valor) -> np.ndarray:
    vacio = np.full((H_MARCO, W_MARCO, 3), 200, np.uint8)
    rev = info.get('rev', vacio)
    pint = info.get('pintado', vacio)
    if 'ilu' in info and 'pintado' not in info:
        pint = pintar_css(info['ilu'], 0.5, 0, 1.0)
    pint = pint.copy()
    m = info.get('mascara')
    if m is not None:
        rev = rev.copy()
        rev[m == 0] = (rev[m == 0] * 0.4).astype(np.uint8)
    t1 = f"{info['id']}r  escaneo"
    estado = ('OK' if valor else 'NULL ' + info.get('motivo', '')) + (' plantilla' if info.get('plantilla') else '')
    t2 = f"{estado} ncc={info.get('ncc', 0):.2f} inl={info.get('inliers', 0)} " \
         f"s={valor[2] if valor else '-'} giro={info.get('giro', 0):.1f}"
    col = (0, 120, 0) if valor else (0, 0, 200)
    sep = np.full((H_MARCO + 26, 8, 3), 255, np.uint8)
    bruto = info.get('bruto', vacio)
    t3 = f"en bruto ncc={info.get('ncc_bruto', 0):.2f} desvio={info.get('desvio', 0):.2f}"
    return np.hstack([rotular(rev, t1), sep, rotular(bruto, t3), sep, rotular(pint, t2, col)])


def hojas(fichas, directorio: Path, prefijo: str, por_hoja: int = 4):
    directorio.mkdir(parents=True, exist_ok=True)
    rutas = []
    for i in range(0, len(fichas), por_hoja):
        grupo = fichas[i:i + por_hoja]
        filas = []
        for f in grupo:
            filas.append(f)
            filas.append(np.full((14, f.shape[1], 3), 255, np.uint8))
        hoja = np.vstack(filas)
        ruta = directorio / f'{prefijo}-{i // por_hoja + 1:02d}.jpg'
        cv2.imencode('.jpg', hoja, [cv2.IMWRITE_JPEG_QUALITY, 85])[1].tofile(str(ruta))
        rutas.append(ruta)
    return rutas


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('ids', nargs='*')
    ap.add_argument('--hojas', type=Path)
    ap.add_argument('--todas', action='store_true', help='hojas de contactos de todas, no solo las dudosas')
    ap.add_argument('--salida', type=Path, default=SALIDA)
    ap.add_argument('--fijar', action='append', default=[])
    args = ap.parse_args(argv)

    cartas = json.loads(CARTAS.read_text(encoding='utf-8'))
    logos = {c['id']: c.get('logoReverso', '') for c in cartas}
    ids = args.ids or [c['id'] for c in cartas]
    forzadas = dict(FORZADAS)
    for f in args.fijar:
        nnn, _, v = f.partition('=')
        forzadas[nnn] = None if v == 'null' else json.loads(v)

    resultado, fichas_dudosas, fichas_todas, filas = {}, [], [], []
    for nnn in ids:
        valor, info = calcular(nnn, logos.get(nnn, ''))
        if nnn in forzadas:
            valor = forzadas[nnn]
            info['motivo'] = 'fijada a mano'
        resultado[nnn] = valor
        dudosa = (valor is None and info.get('motivo') != 'sin reverso') or info.get('desvio', 0) > UMBRAL_DESVIO
        filas.append((nnn, valor, info.get('ncc', 0), info.get('inliers', 0), info.get('fuera', 0),
                      info.get('motivo', ''), dudosa))
        if args.hojas:
            f = ficha(info, valor)
            fichas_todas.append(f)
            if dudosa:
                fichas_dudosas.append(f)
        print(f"{nnn} {json.dumps(valor)} ncc={info.get('ncc', 0):.3f} bruto={info.get('ncc_bruto', 0):.3f} inl={info.get('inliers', 0)} "
              f"fuera={info.get('fuera', 0):.3f} desvio={info.get('desvio', 0):.3f} crudo={np.round(info.get('crudo', []), 3).tolist()} "
              f"{info.get('motivo', '')}{' DUDOSA' if dudosa else ''}", flush=True)

    if args.hojas:
        hojas(fichas_dudosas, args.hojas, 'dudosas')
        if args.todas:
            hojas(fichas_todas, args.hojas, 'todas')

    if not args.ids or args.salida != SALIDA:
        previo = {}
        if args.salida.exists() and args.ids:
            previo = json.loads(args.salida.read_text(encoding='utf-8'))
        previo.update(resultado)
        orden = dict(sorted(previo.items()))
        texto = '{\n' + ',\n'.join(f'  "{k}": {json.dumps(v)}' for k, v in orden.items()) + '\n}\n'
        args.salida.write_text(texto, encoding='utf-8')

    casan = sum(1 for _, v, *_ in filas if v is not None)
    dudosas = sum(1 for f in filas if f[-1])
    print(f'\n{casan} casan, {len(filas) - casan} null, {dudosas} dudosas', file=sys.stderr)


if __name__ == '__main__':
    main()
