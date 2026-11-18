"""Genera los íconos PNG de la app (los pide Android para instalarla) a partir del logo hecho con ChatGPT.

Uso: python herramientas/generar_iconos.py [logo]
Por defecto usa herramientas/fuentes/logo.webp (cuadrado, rojo de borde a borde, burbuja blanca al centro).
Crea icons/icon-192.png, icons/icon-512.png (esquinas redondeadas), icons/maskable-512.png (Android lo
recorta a su forma; el dibujo queda dentro de la zona segura) y icons/apple-touch-icon.png (el iPhone redondea).
"""
import os
import sys
from PIL import Image, ImageDraw


def redondeado(src, tam):
    big = src.resize((tam * 4, tam * 4), Image.LANCZOS).convert('RGBA')
    mask = Image.new('L', big.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, big.size[0] - 1, big.size[1] - 1], radius=int(big.size[0] * 0.22), fill=255)
    big.putalpha(mask)
    return big.resize((tam, tam), Image.LANCZOS)


def main():
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo = sys.argv[1] if len(sys.argv) > 1 else os.path.join(raiz, 'herramientas', 'fuentes', 'logo.webp')
    src = Image.open(logo).convert('RGB')
    out = os.path.join(raiz, 'icons')
    os.makedirs(out, exist_ok=True)
    redondeado(src, 192).save(os.path.join(out, 'icon-192.png'))
    redondeado(src, 512).save(os.path.join(out, 'icon-512.png'))
    src.resize((512, 512), Image.LANCZOS).save(os.path.join(out, 'maskable-512.png'))
    src.resize((180, 180), Image.LANCZOS).save(os.path.join(out, 'apple-touch-icon.png'))
    print('listo:', out)


if __name__ == '__main__':
    main()
