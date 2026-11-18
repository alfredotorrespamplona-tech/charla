# Cómo poner avatares propios (hechos con ChatGPT)

Si un personaje no tiene imágenes, la app le dibuja un avatar sencillo por código.

Cada avatar con imagen tiene 4 cuadros en `avatars/<id>/`: `neutral.webp`, `talk.webp` (boca abierta),
`blink.webp` (ojos cerrados) y `happy.webp` (sonrisa). Para que la app los use, el id debe estar en la lista
`WITH_IMAGES` de `js/data.js`.

## 1. Pedir a ChatGPT una hoja 2x2

Pida **una sola imagen** con las 4 caras. Así salen casi idénticas, que es lo que permite animarlas.
Use un chat nuevo para cada personaje y cambie solo la parte de *Character*:

> Create ONE square image (1:1) that is a 2x2 character expression sheet of the SAME character, for a
> language-learning app avatar. Character: **Tom, 58, a friendly retired teacher from Boston; short grey
> hair, neat grey beard stubble, brown cardigan over a light blue collared shirt**. Style: stylized soft 3D
> animated-movie look (warm lighting, slightly exaggerated cartoon proportions), head and shoulders, centered,
> looking straight at the camera, plain solid light-beige background. All 4 panels must be IDENTICAL in pose,
> framing, camera distance, head position, clothes, hair and lighting; ONLY the face expression changes:
> top-left = neutral, mouth closed; top-right = talking, mouth half open; bottom-left = blinking, both eyes
> fully closed, mouth closed, neutral; bottom-right = warm smile showing teeth. No text, no labels, no borders
> between panels.

Guarde la imagen en `avatars/_hojas/<id>.png` (o `.webp`, que pesa menos).

## 2. Convertir la hoja en los 4 cuadros

```bash
python herramientas/componer_avatar.py avatars/_hojas/tom.webp avatars/tom --vista
```

El programa toma la cara neutral como base y le pega solo la boca y los ojos de las otras tres, alineados.
Así la ropa y el pelo no "saltan" al animar. Detecta la boca y los ojos solo. Revise `vista.png` y bórrela
después.

Si la detección falla, indique las zonas a mano. Son elipses en píxeles del panel: centro x,y y radios rx,ry.

```bash
python herramientas/componer_avatar.py avatars/_hojas/tom.webp avatars/tom --boca 318,362,72,40 --ojos 262,222,44,26 --ojos2 377,222,44,26 --vista
```

Necesita Python con `opencv-python` y `numpy` (`pip install opencv-python numpy`).

Después quite el fondo para que el personaje quede parado delante de la escena del lugar:

```bash
python herramientas/quitar_fondo.py avatars/tom --vista vista.png
```

`vista.png` muestra el personaje sobre fondo oscuro, azul y claro: revise que no le falte pelo ni ropa.

## 3. Activarlo

Agregue el id a `WITH_IMAGES` en `js/data.js`.

Si cambia las imágenes de un personaje que ya existía, suba `CACHE` en `sw.js`.

## Escenas de los lugares y mapa

Cada lugar puede tener una escena de fondo en `scenes/<id>.webp`, de 1200x800. Pídala a ChatGPT en un chat
nuevo con este texto, cambiando la descripción del lugar:

> Create ONE wide landscape image (3:2) to be used as a background scene in a language-learning app:
> *a cozy coffee shop with …*. Style: stylized soft 3D animated-movie look (warm lighting, rich but soft
> colors), matching cute 3D cartoon characters. Eye-level view as if standing inside the place, gentle depth
> of field, the lower-center area is open space where a character will be placed in front. Absolutely NO
> people, no text, no letters, no logos, no signs with writing.

Recórtela a 1200x800, guárdela como WebP y agregue el id a `WITH_SCENES` en `js/data.js`.

El mapa del inicio es `scenes/mapa.webp`. En `CITY_MAP.spots` de `js/data.js` está la posición de cada
lugar sobre el mapa, en porcentaje (x desde la izquierda, y desde arriba). Si agrega un lugar, agréguele su
punto; las pruebas avisan si falta.

## Personajes nuevos

Para crear un personaje nuevo, copie uno en `CHARACTERS` y póngale un id nuevo. Después agréguelo a la lista
`characters` de un lugar en `PLACES`.
