"""Convierte una hoja de expresiones 2x2 de ChatGPT en los cuadros del avatar.

Hoja esperada (una sola imagen cuadrada):
  arriba-izq = neutral | arriba-der = hablando
  abajo-izq  = ojos cerrados | abajo-der = sonrisa

Toma el panel neutral como base y le pega SOLO la boca (hablando, sonrisa) y los ojos
(parpadeo) de los otros paneles, alineados, para que la ropa y el encuadre no cambien.

Uso:
  python componer_avatar.py hoja.png carpeta_salida --boca X,Y,RX,RY --ojos X,Y,RX,RY [--ojos2 X,Y,RX,RY]
Coordenadas en píxeles del panel (0..tamaño del panel). Agregue --vista para guardar una
tira de comparación (vista.png).
"""
import argparse, os
import cv2
import numpy as np


def ellipse_arg(s):
    x, y, rx, ry = (int(float(v)) for v in s.split(','))
    return (x, y), (rx, ry)


def align(base, src, exclude):
    """Alinea src sobre base (afín) usando toda la cara menos las zonas que cambian."""
    h, w = base.shape[:2]
    gb = cv2.GaussianBlur(cv2.cvtColor(base, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.5)
    gs = cv2.GaussianBlur(cv2.cvtColor(src, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.5)
    mask = np.full((h, w), 255, np.uint8)
    for c, a in exclude:
        cv2.ellipse(mask, c, (int(a[0] * 1.4), int(a[1] * 1.6)), 0, 0, 360, 0, -1)
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        cc, warp = cv2.findTransformECC(gb, gs, warp, cv2.MOTION_AFFINE,
                                        (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-7), mask, 1)
    except cv2.error:
        cc = None
    out = cv2.warpAffine(src, warp, (w, h), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                         borderMode=cv2.BORDER_REFLECT)
    return out, cc


def detect(base, src, kind):
    """Busca solo la zona que cambia (boca u ojos) comparando con el panel neutral."""
    h, w = base.shape[:2]
    al, _ = align(base, src, [])
    d = cv2.absdiff(cv2.cvtColor(base, cv2.COLOR_BGR2GRAY), cv2.cvtColor(al, cv2.COLOR_BGR2GRAY))
    d = cv2.GaussianBlur(d, (0, 0), 3)
    roi = np.zeros_like(d)
    y0, y1 = (int(h * .2), int(h * .5)) if kind == 'ojos' else (int(h * .4), int(h * .75))
    roi[y0:y1, int(w * .2):int(w * .8)] = d[y0:y1, int(w * .2):int(w * .8)]
    thr = max(18, np.percentile(roi[y0:y1], 97))
    m = (roi > thr).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    comps = sorted(range(1, n), key=lambda i: -st[i, cv2.CC_STAT_AREA])
    want = 2 if kind == 'ojos' else 1
    out = []
    for i in comps[:want]:
        x, y, bw, bh = st[i, :4]
        out.append(((int(x + bw / 2), int(y + bh / 2)), (int(bw / 2 * 1.25) + 6, int(bh / 2 * 1.35) + 6)))
    return out


def paste(dst, src, ellipses, feather):
    h, w = dst.shape[:2]
    m = np.zeros((h, w), np.float32)
    for c, a in ellipses:
        cv2.ellipse(m, c, a, 0, 0, 360, 1.0, -1)
    hard = (m > 0).astype(np.uint8)
    ring = (cv2.dilate(hard, np.ones((25, 25), np.uint8)) - hard) > 0
    s = src.astype(np.float32).copy()
    d = dst.astype(np.float32)
    for ch in range(3):  # igualar el tono de piel en el borde
        s[..., ch] += d[..., ch][ring].mean() - s[..., ch][ring].mean()
    mb = cv2.GaussianBlur(m, (0, 0), feather)[..., None]
    return np.clip(d * (1 - mb) + s * mb, 0, 255).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('hoja')
    ap.add_argument('salida')
    ap.add_argument('--boca', type=ellipse_arg, help='si se omite, se detecta sola')
    ap.add_argument('--ojos', type=ellipse_arg, help='elipse que cubre un ojo o ambos; si se omite, se detectan')
    ap.add_argument('--ojos2', type=ellipse_arg, help='segundo ojo si se dan por separado')
    ap.add_argument('--tam', type=int, default=640)
    ap.add_argument('--vista', action='store_true')
    a = ap.parse_args()

    sheet = cv2.imread(a.hoja, cv2.IMREAD_COLOR)
    H, W = sheet.shape[:2]
    ph, pw = H // 2, W // 2
    tiles = {
        'neutral': sheet[:ph, :pw], 'talk': sheet[:ph, pw:pw * 2],
        'blink': sheet[ph:ph * 2, :pw], 'happy': sheet[ph:ph * 2, pw:pw * 2],
    }
    base = tiles['neutral'].copy()
    if a.ojos:
        eyes = [a.ojos] + ([a.ojos2] if a.ojos2 else [])
    else:
        eyes = detect(base, tiles['blink'], 'ojos')
    if not a.boca:
        (c, (rx, ry)), = detect(base, tiles['talk'], 'boca')[:1]
        a.boca = (c, (rx, max(ry, int(rx * .5))))
    print('boca', a.boca, 'ojos', eyes)
    frames = {'neutral': base}

    for name, region, feather in (('talk', [a.boca], 10), ('happy', [a.boca], 10), ('blink', eyes, 6)):
        aligned, cc = align(base, tiles[name], region)
        print(f'{name}: alineación {cc if cc is None else round(cc, 3)}')
        if name == 'happy':
            big = [((c[0], c[1]), (int(r[0] * 1.25), int(r[1] * 1.3))) for c, r in region]
            frames[name] = paste(base, aligned, big, feather)
        else:
            frames[name] = paste(base, aligned, region, feather)

    os.makedirs(a.salida, exist_ok=True)
    for name, im in frames.items():
        out = cv2.resize(im, (a.tam, a.tam), interpolation=cv2.INTER_AREA)
        cv2.imwrite(os.path.join(a.salida, f'{name}.webp'), out, [cv2.IMWRITE_WEBP_QUALITY, 88])
    if a.vista:
        strip = np.hstack([frames[k] for k in ('neutral', 'talk', 'blink', 'happy')])
        cv2.imwrite(os.path.join(a.salida, 'vista.png'), strip)
    print('listo:', a.salida)


if __name__ == '__main__':
    main()
