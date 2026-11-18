"""Corta la hoja de 5x4 íconos rojos de ChatGPT en archivos sueltos con fondo transparente.
uso: python -I slice_badges.py <hoja.png> <carpeta salida> <vista.png>"""
import sys
import cv2
import numpy as np

src, outdir, vista = sys.argv[1], sys.argv[2], sys.argv[3]
IDS = ['cafe', 'airport', 'hotel', 'office', 'park', 'diner', 'clinic', 'street', 'shop', 'gym',
       'party', 'interview', 'neighborhood', 'grocery', 'cityhall', 'bank', 'school', 'mall', 'salon', 'chat']
im = cv2.imread(src)
b, g, r = [im[:, :, i].astype(int) for i in range(3)]
red = ((r > 110) & (r - g > 50) & (r - b > 40)).astype(np.uint8) * 255
red = cv2.morphologyEx(red, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
n, lab, stats, cent = cv2.connectedComponentsWithStats(red)
comps = [(stats[i], cent[i]) for i in range(1, n) if stats[i][4] > 4000]
comps = sorted(comps, key=lambda c: -c[0][4])[:20]
comps.sort(key=lambda c: c[1][1])
rows = [sorted(comps[i * 5:(i + 1) * 5], key=lambda c: c[1][0]) for i in range(4)]
tiles = [c for row in rows for c in row]
thumbs = []
for tid, (st, _) in zip(IDS, tiles):
    x, y, w, hgt = st[:4]
    pad = 3
    x0, y0, x1, y1 = max(0, x - pad), max(0, y - pad), min(im.shape[1], x + w + pad), min(im.shape[0], y + hgt + pad)
    crop = im[y0:y1, x0:x1].copy()
    m = red[y0:y1, x0:x1].copy()
    # Rellena los agujeros (el dibujo blanco dentro de la ficha): todo lo que no se alcanza desde el borde.
    ff = m.copy()
    mask = np.zeros((ff.shape[0] + 2, ff.shape[1] + 2), np.uint8)
    cv2.floodFill(ff, mask, (0, 0), 255)
    holes = cv2.bitwise_not(ff)
    alpha = cv2.bitwise_or(m, holes)
    alpha = cv2.erode(alpha, np.ones((2, 2), np.uint8))
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
    side = max(crop.shape[:2])
    sq = np.zeros((side, side, 4), np.uint8)
    oy, ox = (side - crop.shape[0]) // 2, (side - crop.shape[1]) // 2
    sq[oy:oy + crop.shape[0], ox:ox + crop.shape[1], :3] = crop
    sq[oy:oy + crop.shape[0], ox:ox + crop.shape[1], 3] = alpha
    sq = cv2.resize(sq, (128, 128), interpolation=cv2.INTER_AREA)
    cv2.imwrite(f'{outdir}/{tid}.webp', sq, [cv2.IMWRITE_WEBP_QUALITY, 92])
    # Vista sobre gris para revisar el recorte.
    bg = np.full((128, 128, 3), 90, np.uint8)
    a = sq[:, :, 3:4] / 255.0
    thumbs.append((sq[:, :, :3] * a + bg * (1 - a)).astype(np.uint8))
grid = np.vstack([np.hstack(thumbs[i * 5:(i + 1) * 5]) for i in range(4)])
cv2.imwrite(vista, grid)
print('ok', [int(t[0][2]) for t in tiles])
