"""Quita el fondo liso (beige) de los cuadros de un avatar para ponerlo encima de la escena del lugar.

Los 4 cuadros (neutral, talk, blink, happy) comparten la misma silueta, porque componer_avatar.py solo
cambia la boca y los ojos. Por eso la máscara se calcula una vez, con el cuadro neutral, y se aplica a
los cuatro.

Uso:
  python herramientas/quitar_fondo.py avatars/tom [--vista salida.png]
  python herramientas/quitar_fondo.py --todos            (todos los avatares en avatars/)
Lea los cuadros con fondo (*.webp) y escribe la versión transparente encima.
Si un avatar ya no tiene fondo (canal alfa), lo deja igual.
"""
import argparse
import glob
import os

import cv2
import numpy as np

FRAMES = ('neutral', 'talk', 'blink', 'happy')


def _base(xs, ys):
    # Superficie suave para el degradado y la viñeta del fondo (polinomio de grado 3 en x, y).
    return np.stack([xs ** i * ys ** j for i in range(4) for j in range(4 - i)], 1)


def _rellenar_huecos(m):
    """Rellena huecos de la figura que no tocan los bordes de arriba ni de los lados."""
    h, w = m.shape
    inv = (m == 0).astype(np.uint8)
    n, cc = cv2.connectedComponents(inv)
    abiertos = set(np.unique(np.concatenate([cc[0], cc[:, 0], cc[:, -1]]))) - {0}
    for i in range(1, n):
        if i not in abiertos:
            m[cc == i] = 1
    return m


def mascara(img):
    h, w = img.shape[:2]
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    peso = np.array([0.6, 1.4, 1.4], np.float32)        # el color pesa más que la luz (sombras suaves)
    ys, xs = np.mgrid[0:h, 0:w]
    A = _base(xs.ravel() / w, ys.ravel() / h)

    # 1) Primera muestra del fondo: las esquinas de arriba y los lados, sin lo que no se parezca al fondo
    #    (el pelo puede tocar el borde superior).
    es_fondo = np.zeros((h, w), bool)
    es_fondo[:int(h * .45), :int(w * .14)] = True
    es_fondo[:int(h * .45), -int(w * .14):] = True
    es_fondo[:int(h * .6), :8] = True
    es_fondo[:int(h * .6), -8:] = True
    med = np.median(lab[es_fondo], axis=0)
    cerca = np.linalg.norm((lab - med) * peso, axis=2)
    es_fondo &= cerca < max(6.0, float(np.percentile(cerca[es_fondo], 60)) * 2)

    fig = None
    for _ in range(4):                                    # 2) Ajustar, clasificar y volver a ajustar.
        idx = np.flatnonzero(es_fondo.ravel())
        if len(idx) > 40000:
            idx = np.random.default_rng(0).choice(idx, 40000, replace=False)
        bg = np.empty_like(lab)
        for c in range(3):
            coef, *_ = np.linalg.lstsq(A[idx], lab[..., c].ravel()[idx], rcond=None)
            bg[..., c] = (A @ coef).reshape(h, w)
        d = np.linalg.norm((lab - bg) * peso, axis=2)
        ruido = max(2.5, float(np.percentile(d.ravel()[idx], 98)))
        umbral = ruido * 1.6
        nueva = (d > umbral).astype(np.uint8)
        nueva = cv2.morphologyEx(nueva, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        nueva = cv2.morphologyEx(nueva, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
        n, cc, st, _ = cv2.connectedComponentsWithStats(nueva)
        if n > 1:
            nueva = (cc == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
        nueva = _rellenar_huecos(nueva)
        resto = cv2.dilate(nueva, np.ones((25, 25), np.uint8)) == 0
        if resto.mean() < 0.05:                           # algo salió mal: quedarse con la anterior
            break
        fig, es_fondo = nueva, resto
    if fig is None:
        raise RuntimeError('no se pudo separar la figura del fondo')

    # 3) Borde suave: dentro de una franja alrededor del contorno, la opacidad sigue la distancia de color.
    duro = fig.astype(np.float32)
    franja = (cv2.dilate(fig, np.ones((7, 7), np.uint8)) - cv2.erode(fig, np.ones((7, 7), np.uint8))) > 0
    suave = np.clip((d - ruido) / (umbral * 1.5 - ruido), 0, 1)
    a = np.where(franja, np.maximum(suave, cv2.erode(fig, np.ones((7, 7), np.uint8)).astype(np.float32)), duro)
    a = cv2.GaussianBlur(a, (0, 0), 0.8)
    return a, None


def recortar(carpeta, vista=None):
    neutral = os.path.join(carpeta, 'neutral.webp')
    probe = cv2.imread(neutral, cv2.IMREAD_UNCHANGED)
    if probe is None:
        print('sin neutral.webp:', carpeta)
        return
    if probe.ndim == 3 and probe.shape[2] == 4:
        print('ya transparente:', carpeta)
        return
    a, _ = mascara(probe)
    salida = []
    for f in FRAMES:
        p = os.path.join(carpeta, f + '.webp')
        img = cv2.imread(p, cv2.IMREAD_COLOR)
        if img is None:
            continue
        # Quitar el tinte beige que queda en los bordes semitransparentes.
        bg = np.median(np.concatenate([img[:4].reshape(-1, 3), img[:, :4].reshape(-1, 3)]), axis=0)
        af = np.clip(a, 1e-3, 1)[..., None]
        col = np.clip((img.astype(np.float32) - (1 - af) * bg) / af, 0, 255)
        col = np.where(a[..., None] > 0.98, img, col).astype(np.uint8)
        rgba = np.dstack([col, (a * 255).astype(np.uint8)])
        cv2.imwrite(p, rgba, [cv2.IMWRITE_WEBP_QUALITY, 90])
        salida.append(rgba)
    if vista and salida:
        n = salida[0]
        fondos = []
        for color in ((40, 40, 40), (90, 160, 230), (240, 240, 240)):
            lienzo = np.full(n.shape[:2] + (3,), color, np.float32)
            al = n[..., 3:4].astype(np.float32) / 255
            fondos.append((n[..., :3] * al + lienzo * (1 - al)).astype(np.uint8))
        cv2.imwrite(vista, np.hstack(fondos))
    print('listo:', carpeta)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('carpeta', nargs='?')
    ap.add_argument('--todos', action='store_true')
    ap.add_argument('--vista')
    a = ap.parse_args()
    if a.todos:
        raiz = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'avatars')
        for c in sorted(glob.glob(os.path.join(raiz, '*'))):
            if os.path.isdir(c) and not os.path.basename(c).startswith('_'):
                recortar(c)
    elif a.carpeta:
        recortar(a.carpeta, a.vista)
    else:
        ap.error('indique una carpeta o --todos')


if __name__ == '__main__':
    main()
