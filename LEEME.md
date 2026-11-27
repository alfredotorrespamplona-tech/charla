# Charla — practique inglés hablando (uso personal)

App propia, modelada sobre la metodología de LingoLooper (ver `ANALISIS.md`), con:
- **Groq** como cerebro, gratis, y **DeepSeek** de respaldo cuando Groq llega a su límite (usted paga solo
  esos tokens). Ver «La IA: Groq primero, DeepSeek de respaldo» más abajo.
- **Voz del teléfono** para escuchar y hablar (gratis).
- **Amy, una sola compañera para todas las charlas** (Ajustes → Charlas): dibujada por código, con voz de
  mujer y los **labios al ritmo de la voz** (`js/lipsync.js` parte cada palabra en sílabas: la «a» abre la
  boca, la «o» la redondea, la «m» la cierra, y se vuelve a sincronizar con cada palabra que avisa la voz).
  Amy hace el papel de cada lugar (barista, médica, recepcionista…). Si se quita, vuelven las 15 compañeras
  con sus avatares de ChatGPT (ver `avatars/LEEME.md`); los papeles de hombre los sigue haciendo Amy, porque
  la voz de la app es de mujer: **nunca aparece un hombre**.
- **Se actualiza sola**: Android deja la app abierta en segundo plano días enteros y no recarga la página.
  Cada vez que vuelve a Charla, `js/update.js` compara su versión (`js/version.js`) con la publicada
  (`sw.js`) y, si hay una nueva, recarga; en una charla o un repaso, antes pregunta. Ajustes muestra la
  versión y tiene «🔄 Buscar actualización».
- **Escenas de fondo** para los 19 lugares, hechas con ChatGPT.

## Qué hace
- **Portada** al abrir la app: saludo, meta de hoy (anillo de minutos), racha, puntos, los 7 días de la
  semana, y accesos a lo que toca (seguir la charla a medias, repaso, la lección de gramática, frases,
  mis errores, vocabulario, estadísticas), con un **plan de hoy** (charlar, Mil palabras y repaso, que se
  marcan al hacerlos) y la **palabra del día** del mazo con su audio. El botón 🏠 del inicio vuelve a ella.
- **Salir y volver**: si sale a la pantalla del teléfono, al volver todo sigue igual (el micrófono y la voz
  se pausan al salir). Si Android cerró la app para liberar memoria y vuelve antes de 30 min, se abre
  donde estaba: en la charla (con todos los mensajes), en el inicio o en la portada.
- **Uso personal**: no hay tienda ni compras con monedas; sortear misiones es gratis y el protector de
  racha 🧊 también (máximo 2). **Sin candados**: los 6 niveles, los lugares, temas y lecciones
  están abiertos siempre (se quitaron en la v33, también si un respaldo viejo los traía puestos); el nivel
  que elige en Ajustes solo cambia cómo le hablan (velocidad, ayudas, vocabulario).
- **🎓 Contenido por nivel** (v34; botón «Por nivel» del inicio, cuadro de la portada, «Ver y estudiar el
  contenido» en la hoja de niveles y en Ajustes): una pantalla con los 6 niveles (A1…C2) arriba y, para el
  nivel elegido, qué puede hacer con él y todo lo que se estudia ahí:
  - **📖 Temario de gramática** (v35; v36: 10 preguntas por tema y el porqué de cada una): 78 temas en total
    (A1 15, A2 14, B1 14, B2 13, C1 12, C2 10) y 780 preguntas. Cada tema tiene una ficha escrita como pide su cerebro, en español primero y sin palabras
    de gramática: «Qué es y para qué sirve», «Cómo se dice en inglés», «La forma» (frases que se tocan para
    oírlas), ejemplos con audio y traducción, y «Errores típicos de quien habla español» (lo que se dice mal →
    cómo se dice, y por qué). Debajo:
    - **✍ Practicar**: 10 preguntas de completar la frase con 3 opciones. Con 80 % el tema queda aprobado (✓).
      Al responder (bien o mal) sale **💡 Por qué**: una línea en español, sin palabras de gramática, que dice
      por qué es esa respuesta (por ejemplo «Si tuviera → if + pasado: had»). Si falla y tiene su clave de
      DeepSeek, **❓ No lo entiendo** se lo explica pieza por pieza (método de Pablo Bolen, como en la charla).
      Al final, cada frase que falló trae también su porqué.
    - **🎤 Dígalo usted** (v37): pasar de reconocer a producir. Ve la frase en español y la dice entera en
      inglés con el micrófono (o la escribe). Son 6 frases por ronda, y cada ronda trae otras. Se revisa sin IA:
      - Acepta contracciones, mayúsculas y números dichos («I'd» = «I would»).
      - Solo cuenta si la frase es la misma. Una palabra de más o de menos es «⚠ Casi» y no cuenta, porque suele
        ser justo el error típico (por ejemplo «if you would lost»).
      - La palabra que sobra se marca en color en lo que dijo; la que faltó, en «Así se dice».
      - Luego vienen la frase con 🔊 y 🐢, el porqué y, con clave, «❓ No lo entiendo».
      - Si el teléfono le entendió mal, «✅ Lo dije bien» la cuenta como buena.
      - «Ver pista» muestra la frase en inglés sin la parte clave; con pista cuenta la mitad.
      - Hay «🔁 Otra vez» y «No sé, muéstremela».
      - Al final ve su nota («dicha: X %» en la ficha) y las frases para repetir, que puede llevar al repaso.
      Al terminar la práctica de un tema, el botón principal es «🎤 Ahora dígalas usted».
    - **🗣 Charlar usando esto**: una charla con Amy que le hace preguntas en las que ese tema sale solo,
      con 3 objetivos (usarlo, usarlo otra vez, preguntar con él).
    - **🧩 Rompecabezas** del tema, cuando lo hay.
    - **✨ 6 preguntas nuevas con IA** (con su clave de DeepSeek), distintas de las del tema y con su porqué.
    - Flechas para pasar al tema anterior o siguiente.
  - **📝 Examen de cada nivel**: 20 preguntas de todos los temas del nivel, cada vez otras. Con 80 % el
    nivel queda aprobado en gramática. Al final salen los temas para repasar (los peores primero, con un
    toque abren su ficha), las frases que falló con «📒 Llevarlas al repaso» y «Otro examen».
  - Arriba se ve el avance: «Gramática: X de N temas aprobados · examen: Y %».
  - El temario de B1 cubre la lista de «B1 sólido» de su cerebro: he ido / fui, for y since, había hecho,
    solía, si llueve / si tuviera, se hace / fue hecho, dijo que, que / quien / donde, -ing o to, debe de,
    phrasal verbs, preposiciones y pedir con cortesía.
  - **🧩 Rompecabezas de verbos**: las 3 lecciones de piezas del nivel (antes se llamaba «Gramática»).
  - **💬 Frases**: los paquetes de frases del nivel (de B2 a C2 son nuevos: debatir, hipótesis, reuniones,
    matices, inglés formal, contar historias, registro, persuadir y humor).
  - **📇 Vocabulario**: de A1 a B1, su tramo de Mil palabras (1–300, 301–600, 601–1000); en B1 además
    «Entrevista de trabajo»; de B2 a C2, 5 paquetes por nivel: B2 phrasal verbs, palabras B2, trabajo y
    oficina, dinero y compras, carácter y emociones; C1 colocaciones, palabras C1, trabajo avanzado,
    argumentar y phrasal verbs; C2 expresiones idiomáticas, palabras C2, palabras formales, phrasal verbs
    y matices y tono.
  - **🗣 Temas para charlar** del nivel (en A1 se ven 8 y «Ver los N temas» muestra el resto); al tocar uno
    empieza la charla en la cafetería y al salir vuelve al mismo nivel.
  - «Charlar en nivel X» cambia el nivel de sus charlas sin pasar por Ajustes.
  - Todo el contenido nuevo está escrito para Charla, con palabras propias.
- **🚀 Técnicas avanzadas** (v38; botón «Técnicas» del inicio y cuadro ancho de la portada): 11 técnicas
  sacadas del cerebro de inglés para aprender más rápido. Cada una abre con «Qué es», «Por qué funciona» y
  «Cómo se hace», en español y sin palabras de gramática. Están en 4 grupos:
  - **Entender inglés rápido**
    - 🎧 **Dictado activo** (DLI): oye la frase, la escribe y ve en color lo que no oyó, con pistas de las
      palabras que se unen al hablar («want to» → «wanna»).
    - 🔮 **Adivine el final**: oye el comienzo y elige entre 3 finales antes de oír la frase completa.
    - 🗣 **Sombra con intención**: repite igual que la voz con una intención (palabras fuertes, final que
      sube o baja, finales de palabra, palabras unidas); 3 velocidades y nota con el micrófono.
  - **Hablar con fluidez**
    - ⏱ **Un minuto sin parar (JAM)**: 3 rondas de un minuto (a ciegas, con notas, con más detalles) sobre
      24 temas (entrevista, vida, opinión). Mide palabras por minuto, pausas de más de 3 s y muletillas, y
      muestra cuánto mejoró. Con clave, la IA revisa el minuto y da una versión natural que se puede
      repetir en sombra o guardar en «Mis frases». Sin micrófono se hace solo con el reloj.
    - 🧱 **Frase que crece**: 10 frases que crecen pieza a pieza hasta 18–28 palabras; se dice completa
      cada vez, y se puede ocultar el texto.
    - 🎭 **Una frase, 5 capas**: calentamiento de boca, despacio, normal, 3 emociones, rápido y 3
      situaciones; mide la velocidad de cada capa.
  - **Armar frases usted solo**
    - 🔄 **Cuéntelo de otra persona**: 8 historias con «I…» que se cuentan con «He…» o «She…».
    - 🔁 **Ida y vuelta** (Luca Lampariello): 8 textos de 5 frases; los pasa al español, descansan unas
      8 horas y luego los devuelve al inglés y compara con el original.
    - 🏝 **Mis frases (islas)**: 6 islas (mi entrevista, mi trabajo, mi día…). Escribe en español lo que de
      verdad dice y la IA lo pasa a inglés natural. «Mi entrevista» tiene el formulario STAR (situación,
      tarea, acción, resultado). Se practican de memoria, en sombra y en dictado.
  - **Reaccionar cuando algo cambia**
    - 🎲 **Simulacro con imprevisto** (DLI): 6 charlas (2 de entrevista, aeropuerto, restaurante, hotel,
      consultorio) en las que, sin avisar, algo sale mal.
    - 🎯 **Responder en el momento** (v42): le hacen una pregunta (18 propias: entrevista, vida, opinión) y
      la arma en segundos. Empieza con las palabras de la pregunta, usa una frase para pensar si hace falta,
      la ordena en 3 partes (Qué · Y qué · Ahora qué, de Matt Abrahams; Problema · Solución · Beneficio; o
      las 5 preguntas) y la dice corta. El teléfono revisa la forma sin IA (comienzo, 3 partes, largo,
      muletillas) y muestra una respuesta de ejemplo. Con clave, la IA corrige la gramática y la devuelve
      natural; se guarda en «Mis frases» o va al Taller.
  - **🔁 Las 5 de hoy**: las mismas 5 frases todo el día de 3 maneras (oírlas, repetirlas, decirlas de
    memoria). Se eligen de: entrevista de trabajo, frases de su nivel, «Mis frases» o su repaso.
  - **🎯 Para su entrevista**: acceso directo a STAR, al minuto con preguntas de entrevista, al simulacro y a
    «Responder en el momento».
  - Todo el contenido es propio; el avance se guarda en `tecnicas` y viaja en la copia de seguridad.
- 19 lugares (cafetería, aeropuerto, hotel, oficina, parque, restaurante, consultorio, calle, tienda,
  gimnasio, fiesta, entrevista de trabajo, **tu barrio, supermercado, ayuntamiento, banco, escuela de
  idiomas, centro comercial y peluquería**) con 72 misiones, todas abiertas.
  Los 7 últimos salen debajo del mapa («Más lugares»).
- **55 temas de conversación** en 8 grupos (día a día, amigos y ocio, familia y hogar, trabajo, estudio,
  viajes, salud, actualidad y cultura), que sirven con cualquier personaje. Al elegir misión, una de las
  opciones sorteadas es un tema, y «Todos los temas de conversación» los muestra todos.
- Cada misión cambia según su nivel: versión principiante (A1–A2), intermedia (B1) y avanzada (B2–C2).
- **Nivel de cada misión**: cada estrella ganada en una misión suma; cada 4 estrellas la misión sube de
  nivel (+5 🪙). Al sumar niveles de misión se ven más misiones por lugar: 3 al empezar, 4 con nivel
  total 8 y 5 con nivel total 20.
- **Mi plan** (en la bienvenida, en Ajustes o tocando la meta del inicio): para qué quiere el inglés,
  meta diaria (5, 10, 20 o 30 min, con su avance en el inicio), edad y temas que le gustan; los
  personajes los usan en la charla. Al terminar la primera charla le dice cuánto habló y cuántas palabras usó.
- Personajes con personalidad, que **recuerdan** lo que usted les contó en charlas anteriores, y una
  relación que va subiendo (Desconocido → Conocido → Amigo → Mejor amigo).
- Misiones con objetivos que se marcan solos, más charla libre y **tema propio** (usted describe la
  situación en español).
- En cada frase suya: un punto verde/amarillo/rojo con la corrección, una versión más natural y la
  explicación en español.
- **↩️ Repetir**: si el teléfono entendió mal su frase, bórrela (con la respuesta del personaje) y dígala
  otra vez. Los puntos y objetivos de ese turno se descuentan.
- **🎤 Práctica de pronunciación**: en las palabras, en los ejemplos, en la versión «más natural» y en su
  vocabulario. Le marca en verde las palabras que se entendieron y en rojo las que debe repetir.
  No gasta tokens. Si dice bien una palabra guardada, sube su familiaridad.
- Los personajes saben la hora y el día reales («Good morning» por la mañana).
- Ayudas: **una** sugerencia de respuesta (con «🔄 Otra idea» si no le sirve), «¿cómo se dice?» (escribe en español y le da el inglés),
  traducir, tocar cualquier palabra para ver significado, pronunciación y guardarla.
- Resumen con puntos, 3 estrellas, palabras por minuto, demora al responder, palabras distintas,
  % de sugerencias, racha diaria, comentario del coach y palabras útiles para guardar.
- Vocabulario con niveles de familiaridad (Visto → Conocido → Practicado → Dominado) que suben al usar
  las palabras hablando y en el **Repaso**, con 3 tipos de tarjeta según qué tan bien conoce la palabra:
  elegir su significado dentro de una frase, completar la frase y, al final, decirla en inglés hablando.
  Las que falla vuelven una vez al final, con la pista a la vista.
- **🧠 Repaso espaciado**: cada tarjeta vuelve cuando toca, no todas a la vez.
  - Si acierta, vuelve cada vez más tarde: mañana, en 3 días, en 1 semana, 2 semanas, 1 mes, 2 y 4 meses.
  - Con pista, vuelve antes. Si falla, vuelve mañana.
  - En el inicio, «Repaso de hoy» dice cuántas tarjetas tocan.
  - Al terminar, «📅 Cuándo vuelven» muestra la fecha de cada una.
  - Si está al día, le dice cuándo es el próximo repaso; con «Practicar igual» repasa las más próximas.
- **📚 Frases esenciales** (botón «Frases» del inicio): 210 frases muy usadas del inglés en 21 paquetes,
  de A1 a C2 (saludos, cortesía, no entender, pedir, tiempo, sentimientos, reacciones, invitar, opiniones,
  día a día, problemas, conectores, debatir, hipótesis, reuniones, matices, formal, historias, registro,
  persuadir y humor), y **Vocabulario por nivel** (60 palabras y expresiones de B2 a C2 en 6 paquetes).
  El paquete recomendado es el de su nivel.
  - Se aprenden en tandas de 5: escuchar (🔊 o 🐢 despacio) y repetir en voz alta (🎤), luego recordarlas
    enseguida con tarjetas.
  - Después entran al repaso espaciado.
  - Máximo 10 nuevas al día.
  - Estas tarjetas no gastan tokens: se arman en el teléfono.
- **🧠 Paquetes de su cerebro de inglés** (en la misma pantalla de Frases, debajo de las esenciales):
  - **Frases cotidianas** (28) e **Idioms** (23): las de su wiki. En los idioms, una de las opciones falsas
    es la traducción palabra por palabra, para entrenar a no caer en ella.
  - **Verbos** (7 paquetes por categoría, 332 frases): de su Repeat and Juggle, cada verbo en 3 frases:
    ayer (*I was*), he… (*I have been*) y había… (*I had been*). Al completar la frase, las opciones son
    las otras formas del mismo verbo: justo el error de su bitácora (have/had + participio).
  - **Las 1000 palabras más usadas** (Refold, 10 paquetes de 100): la frase de ejemplo de cada palabra,
    con la palabra como hueco.
  - **🎯 Mis errores (bitácora)** (23): las correcciones de su `bitacora/errores.md`, primero las que
    todavía fallan. Al completar la frase, lo que usted dijo mal es una de las opciones falsas.
  - Las frases que ya estaban en las esenciales no se repiten.
- **🧑‍🏫 El coach corrige como usted pidió en su cerebro** (CLAUDE.md, «Enseñanza y corrección en vivo»):
  - sin jerga gramatical: dice qué palabra falló, por qué en una frase corta, y la versión correcta;
  - vigila los errores de su bitácora que no están resueltos. Si repite uno, la corrección muestra
    «🔁 Otra vez un error de su bitácora» y el comentario final lo menciona;
  - **❓ No entiendo** (en la corrección): explicación de emergencia con el método de Pablo Bolen: la frase
    en español, partida en piezas, cada pieza en inglés y luego armada;
  - **📒 Guardar en mi bitácora** (en el resumen de la charla): guarda los errores de esa charla en la
    **bitácora del teléfono**, y el coach los vigila desde la charla siguiente, sin pasar por el PC.
  - **📒 Mi bitácora** (Ajustes): los errores de sus charlas y los de su cerebro juntos. Cada uno se puede
    escuchar, mandar al repaso, marcar como **✓ Resuelto** (el coach deja de vigilarlo) o reactivar.
    **📋 Enviar para el cerebro** abre «Compartir» (WhatsApp, correo…) con los errores nuevos ya en el
    formato de la tabla de `bitacora/errores.md`. En el PC péguelos al final de esa tabla y corra
    `herramientas\publicar.ps1`: el cerebro y Charla quedan iguales (un error que ya llegó al cerebro
    no se muestra dos veces).
  - Si cambia el cerebro, vuelva a generarlos (lo ya aprendido no se pierde):
    `python herramientas/importar_cerebro.py "C:/Users/leoab/Documents/ingles cerebro"`
- **🧱 Gramática** (botón en el inicio), con el método de Pablo Bolen de su cerebro (equivalencia
  estructural y «puzzle verbal»): no se estudian reglas con nombre, se reconoce la forma del verbo en
  español y se cambia por su pieza en inglés.
  - **Por niveles**: 18 lecciones, tres por nivel, siguiendo la progresión del cerebro: A1 «-ar → to + verbo»,
    «-ando → -ing» y «soy, estoy, tengo… años → I am»; A2 «will», «ayer (went, ate)» y «voy a → going to»;
    B1 «would», «he comido → have eaten» y «puedo, podría, debería → can, could, should»; B2 «había →
    had + participio», «si tuviera…, -ría» y la pasiva «fue hecho → was made»; C1 «habría → would have»,
    «si hubiera…, habría…» y «ojalá tuviera → I wish I had»; C2 «debería haber → should have», piezas que
    se suman y frases largas. Todas abiertas (sin candados).
  - Cada ejercicio tiene los 5 pasos: frase en español → elegir la pieza en inglés de cada verbo → armar la
    frase con fichas → escucharla y decirla con el micrófono. Al final, nota, y las que falló van al repaso.
  - **✨ 5 más con IA** en cada lección: DeepSeek crea ejercicios nuevos del mismo patrón (se revisan antes
    de usarlos: cada pieza tiene que estar en la frase).
  - **📋 Verbos**: la tabla de los 111 verbos de su mazo (`tools/mazo_verbos_150`) con infinitivo, pasado y
    participio, **cada uno con su español** (to go / ir · went / fue · gone / ido). Irregulares en rojo,
    filtro Todos / Irregulares / Regulares, búsqueda en inglés o español sin tildes, ficha con ejemplo y
    audio de las tres formas, y **🎯 Pruébese**: «¿cómo se dice "fue"?» con tres opciones del mismo verbo.
  - **✨ Su frase**: escriba en español lo que quiere decir hoy; DeepSeek la parte en piezas y usted la arma.
- **🧩 Taller de frases** (botón «Taller» en el inicio): dos técnicas para practicar gramática sin estudiarla.
  - **🔁 Repeat and Juggle** (de su cerebro): escuche y repita una frase igual, y luego cámbiele una sola
    pieza (otra palabra, ayer / he… / había… / mañana, pregunta o negativa). Trae 12 ejercicios propios y
    los 111 verbos de su mazo, por categoría.
  - **🧩 Skeleton swapping**: de una frase útil se queda el esqueleto (las palabras fijas, en negrita) y se
    cambia el relleno (los huecos punteados). 20 esqueletos en 5 grupos: repetir el modelo, 3 frases en
    español para decir con el mismo esqueleto y una frase suya.
  - **Con DeepSeek:** «✨ Crear desde una frase» arma un Repeat and Juggle o un esqueleto con cualquier frase
    (también una idea en español); revisa las respuestas que no son idénticas y las frases libres, sin jerga y
    con sus reglas de corrección; y «✨ 3 cambios nuevos» inventa más práctica según sus intereses.
  - En la corrección de una charla, **🧩 Al taller** guarda la versión natural para practicarla después.
  - Sin clave, los ejercicios guiados se revisan en el teléfono (acepta contracciones y números dichos).
    Al terminar uno, su frase pasa al vocabulario y al repaso espaciado.
- **Lo que faltaba de LingoLooper** (todo con texto propio):
  - **👋 Despedirse:** al tocar 🏁 puede pedirle al personaje que cierre la charla él mismo.
    **⏳ Necesito un momento** le da hasta 90 s para pensar sin que lo apure.
  - **🎙 Manos libres** (arriba en la charla): el micrófono se abre solo y, cuando usted calla, muestra
    2,5 s para cancelar, seguir hablando o enviar ya.
  - **🔊 Escuchar todo** en Vocabulario: cada palabra en inglés, una pausa para repetirla y su traducción.
  - El explorador de palabras muestra el **nivel** (A1–C2), si es **formal o informal** y qué tan útil es.
  - **📊 Su semana**: una tarjeta en el inicio con la semana pasada. **✨ Su año en Charla** en Estadísticas.
  - **Avisos de racha** en el inicio: si se pierde esta noche o si un protector la está salvando.
  - **Temas de temporada** (Navidad, Halloween, año nuevo…): en sus fechas salen primero en las misiones.
    Los personajes también saben la fecha y la estación.
  - **Tutorial** en la primera charla (se puede saltar; Ajustes → «🧭 Ver otra vez el tutorial»).
  - **Ajustes → Charlas:** modo comedia (personajes más graciosos) y vibración.
- **6 niveles** (A1 → C2), como en LingoLooper: al subir, el personaje habla con frases más largas y un
  inglés más avanzado (también las sugerencias), más rápido, y la ayuda aparece más tarde (el texto
  primero palabra por palabra, luego después de escuchar, luego oculto; las sugerencias al final solo
  con 💡). Toque «Nivel N/6» en el inicio para ver qué trae cada uno.
- Su primera charla ajusta el nivel que eligió al empezar. Para subir, junte 6 estrellas con charlas de
  2★ o más; entonces se le propone subir («Subir de nivel» o «Aún no»). Si le cuesta mucho, le propone
  bajar uno.
- **🗣️ Pistas de pronunciación**: debajo de cada palabra en inglés aparece cómo suena escrita con letras
  del español («cappuccino» → «ka-pu-CHI-nou»; en MAYÚSCULAS la sílaba fuerte). En los niveles 1 y 2 salen
  solas; desde el 3, tocando 🗣️ en la respuesta, en la sugerencia elegida o en la versión «más natural».
- En Ajustes → Nivel de inglés puede **personalizar** velocidad, texto, sugerencias, traducciones,
  pistas de pronunciación y corrección: lo más difícil da más puntos, lo más fácil menos.
- Las monedas siguen contándose por dentro (`js/coins.js`, `SHOP_ENABLED = false`), pero no se muestran
  ni se gastan: Charla es para uso personal.
- En el Repaso puede reportar una tarjeta (🚩) y decir qué tiene de malo; con «No quiero aprender esta
  palabra» deja de salir en el repaso.
- **🎯 Practicar antes de enviar**: al elegir una sugerencia, tóquela en «Practicar». Cada palabra sale en
  verde (se entendió), ámbar (casi) o rojo; toque una palabra para practicarla sola y, cuando suene bien,
  «📤 Enviar» se la dice al personaje.
- **📜 Transcripción**: durante la charla (botón 📜), en el resumen y en el historial (toque una charla).
  Cada línea se puede escuchar, traducir y practicar; sus frases muestran la corrección. «📋 Copiar» la
  copia como texto. Se guardan las últimas 60 charlas.
- **La relación también baja**: si trata mal a un personaje pasa a Enemigo y luego a Némesis, y él le
  habla más seco. Siempre dice cuánto falta («+6 de cariño para ser Conocido»).
- **Ficha de cada personaje** (botón «Ficha» o desde el resumen): rasgos, intereses, desde cuándo se
  conocen, lo que recuerda de usted y **20 cosas por descubrir** (de dónde es, su familia, su sueño, su
  miedo, su secreto…), que se abren con más charlas y más amistad. Se puede borrar su memoria o quitarlo
  de contactos.
- **👥 Contactos**: las personas con las que ha hablado y «Conozca a alguien nuevo», que propone primero a
  quien comparte sus intereses.
- **📒 Vocabulario**: ordenar (recientes, familiaridad, usadas hace poco o hace tiempo, A–Z), filtrar por
  familiaridad y por tipo de palabra, archivar (deja de salir en el repaso), copiar todo como texto y
  «💡 Palabras sugeridas» del coach para guardar con un toque.
- **📊 Estadísticas** por semana, mes y año (puntos, charlas, minutos, tiempo hablado, demora, palabras
  por minuto, palabras distintas, estrellas) con gráfico, y **calendario de la racha** (🔥 practicó,
  🧊 salvado con protector), también en la hoja de la racha.
- **✍️ Temas propios guardados**: el modelo revisa el tema, le pone nombre, ícono, el papel del personaje
  y 3 objetivos. Quedan guardados con las veces jugados; se pueden editar y borrar.
- **⏸️ Charlas a medias**: ✕ pausa la charla y queda en el inicio para «▶️ Continuar» (también si se
  cierra la app). 🏁 pregunta antes de terminar, y si el personaje se despide puede «↩️ Seguir hablando».
- **¡Su turno!**: si se queda callado unos 25 s, el personaje lo anima a hablar. La grabación dura hasta
  45 s, avisa en los últimos 10 y envía lo que alcanzó a decir (también si se corta).
- **💌 Mensajes de los personajes**: al abrir la app, como máximo uno al día, de alguien que ya conoce
  (más secos si está molesto). Si lo responde conversando antes de 24 h gana +3 🪙. Sin servidor no hay
  notificaciones en el teléfono: aparecen al abrir la app.
- **Mi plan** incluye también su género, para que los personajes le hablen bien.
- **Dos tipos de voz, las dos gratis y sin clave** (Ajustes → Tipo de voz):
  - *Voz del teléfono*: responde al instante. La app elige la mejor voz instalada y no le cambia el tono.
    La lista de Ajustes las ordena de la que mejor suena a la peor (⭐ = natural; en Android las voces
    «-network» de Google ganan a las «-local»).
  - **Cómo tener voces buenas gratis** (también está en Ajustes → «¿Las voces suenan robóticas?»):
    - *Android*: Ajustes del teléfono → buscar «Salida de texto a voz» → Motor preferido: **Servicios de voz
      de Google** (en Samsung viene el de Samsung, que suena peor) → ⚙ → Instalar datos de voz → **English
      (United States)** → en «Voz» pruebe I, II, III, IV… y deje la que más le guste. Cierre Charla del todo
      y ábrala otra vez.
    - *iPhone*: Ajustes → Accesibilidad → Contenido leído → Voces → English → descargue una voz
      **Mejorada** o **Premium**.
    - *Windows*: abra Charla en **Microsoft Edge**, que trae voces «Online (Natural)» muy buenas.
  - *Natural Kokoro*: un modelo de voz de código abierto (Apache 2.0, `vendor/kokoro/`) que corre en el
    propio equipo. Suena mucho más humana y cada personaje tiene su voz, pero tarda unos segundos antes de
    cada respuesta (más en teléfonos). Se descarga una vez (90 MB; en computadores con tarjeta gráfica,
    330 MB) y Ajustes muestra cuánto tarda en su equipo. Para no poner lento el teléfono: en celulares
    siempre usa el modelo liviano, guarda las frases que ya dijo (repetirlas es instantáneo, hasta ~60 s de
    audio), duerme el audio cuando no habla y suelta el modelo si la app pasa 2 minutos en segundo plano.
    Al volver a «Voz del teléfono» se libera la memoria.
- **Liviana en el teléfono**: el personaje tiene sus caras apiladas y solo cambia cuál se ve (antes la
  imagen y su sombra se volvían a pintar unas 15 veces por segundo mientras hablaba). Las listas usan
  fotos pequeñas (`avatars/<id>/mini.webp`, 192 px) en vez de las de 640 px.
- **Ajustes → Micrófono y voz**: revisa si el teléfono puede usar el micrófono y si tiene voces en inglés,
  y dice qué hacer si algo falla. Trae botones para probar la voz y el micrófono.
- El micrófono espera hasta 20 s a que usted empiece a hablar (tiempo para pensar) y, cuando ya habló,
  da el turno por terminado tras 3 s de silencio (Ajustes: 2, 3, 4 o 6 s). Android corta el micrófono
  solo en la primera pausa: `Listener` (speech.js) lo vuelve a abrir enseguida y junta lo dicho, así una
  pausa para pensar no envía media frase. Si no dice nada, el personaje no lo apura: el micrófono queda
  listo. También puede tocar 🎤 otra vez para enviar ya.
- **Respuesta más rápida y sincronizada**: la respuesta de DeepSeek llega por partes (stream) y el
  personaje empieza a hablar apenas está la primera frase; el resto se agrega a la burbuja y lo dice a
  continuación. El texto aparece al ritmo de la voz: palabra exacta si la voz del teléfono lo avisa, por
  frase con la voz natural (sabe cuánto dura cada trozo de audio) y, si no, con el ritmo que la app mide
  de su voz. Con las 3 ideas de respuesta el personaje se achica y la lista se puede desplazar.
- **Mapa ilustrado de la ciudad** en el inicio: toque un lugar para entrar (o cambie a ☰ Lista). Cada
  lugar tiene su escena de fondo y el personaje aparece parado delante. Mapa, escenas y personajes son
  imágenes propias hechas con ChatGPT.

## Mil palabras
**📇 Mil palabras** (en la portada y en el inicio) estudia las 1000 palabras más usadas del inglés. **Vienen
con la app**: no hay que importar nada y funcionan sin internet. Cada tarjeta tiene la palabra, su
significado, las formas irregulares, una frase de ejemplo y su traducción; la palabra y la frase las lee la
voz del teléfono (🐢 para oírla despacio, 🎤 para decirla y que le corrija la pronunciación).

Se repasa como en Anki: **Otra vez · Difícil · Bien · Fácil** (cada botón dice cuándo vuelve la tarjeta). Las
nuevas salen en orden de frecuencia, 10 por día (se cambia en la pantalla del mazo: 5, 10, 15, 20 o 30), y
«➕ 5 palabras nuevas más hoy» sube el límite solo por hoy. Lo que falla vuelve en la misma sesión. Con 10
respuestas en el día cuenta para la racha. El avance va en la copia de seguridad.

Las palabras salen de la lista de su cerebro de inglés (`wiki/vocabulario/lista_1000_refold.md`):
`herramientas/importar_cerebro.py` genera `js/milwords.js` junto con `js/cerebro.js`. Los audios e imágenes
del mazo de Refold no se usan: son de Refold y el repositorio es público.

## Diseño
- **Rojo y blanco.** El rojo (#d11f35) da energía y ganas de actuar, así que solo marca lo que invita a
  hablar: el micrófono, el botón principal de cada pantalla y su propia voz en el chat. El fondo blanco y
  los grises cálidos dan calma, para que hablar en otro idioma no se sienta como un examen. Los títulos
  de resultado no van en rojo (no regañan) y el rojo de los errores es más oscuro que el de la marca.
- **Formas.** Círculos y píldoras (cercanía, conversación) para lo que se toca: botones, micrófono,
  avatares, etiquetas. Rectángulos redondeados (orden, confianza) para las tarjetas de información.
- **Íconos.** Ya no hay emojis en la pantalla. `js/icons.js` tiene íconos de línea propios (trazo
  parejo, toman el color del texto, se ven igual en todos los teléfonos) y cambia solo cualquier emoji del
  texto por su ícono, así se puede seguir escribiendo «🔥 3» en el código. Una prueba avisa si se usa un
  emoji que no tiene ícono.
- **Íconos de los lugares y logo** hechos con ChatGPT: fichas rojas en 3D con un dibujo blanco
  (`scenes/badges/`), en el mapa, la lista, la tienda y el título de cada lugar. Las hojas originales
  están en `herramientas/fuentes/`; `herramientas/cortar_iconos.py` corta la hoja de 5x4 y
  `herramientas/generar_iconos.py` hace los íconos de la app desde el logo.
- Modo claro y oscuro (sigue el del teléfono).

## Probar en el computador
```bash
python -m http.server 8765 --directory "C:/Users/leoab/Documents/REA/charla"
```
Abra http://localhost:8765 en **Chrome**. Escriba `demo` como clave para probar sin gastar tokens.

En **Ajustes → 🔌 Probar conexión** puede comprobar su clave de DeepSeek y ver los modelos disponibles
(se elige en el campo «Modelo»).

## Prueba con DeepSeek de verdad
`herramientas/probar_deepseek.mjs` llama una vez a cada tarea de la app (charla, correcciones, coach, repaso,
temas, Taller de frases…) con su clave y dice cuáles responden bien. Gasta unos centavos. Desde `charla`:
```powershell
$env:DEEPSEEK_KEY = "sk-..."; node herramientas/probar_deepseek.mjs
```
El modelo `deepseek-flash` (DeepSeek V4.1 Flash) «piensa» antes de contestar; Charla le apaga ese razonamiento
(`thinking: disabled`) porque gastaba el límite de la respuesta y la cortaba. Así responde en 1–2 s.

## Publicar una versión nueva (un solo comando)
Desde la carpeta `charla`, en PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File herramientas\publicar.ps1 -Mensaje "Lo que cambió"
```
Trae el cerebro de inglés, corre las pruebas (si alguna falla, se detiene), sube `CACHE` en `sw.js`
y la versión en `js/version.js` para que los teléfonos se actualicen, revisa que ningún archivo tenga una clave `sk-…`, guarda la
versión en git y la sube a GitHub (Pages la publica en 1 o 2 minutos). Con `-SinCerebro` se salta el primer paso.

La carpeta es un repositorio git (rama `main`). `avatars/_hojas/` (las hojas originales de los avatares)
no se sube: está en `.gitignore`.

## Pruebas automáticas
Revisan el algoritmo (puntos, estrellas, racha, protector, nivel, familiaridad), la pronunciación y que
el contenido sea coherente (cada personaje en un lugar, misiones sin ids repetidos, avatares completos).
Necesita Node.js. Desde la carpeta `charla`:
```bash
node --test
```

## Ponerla en el celular (gratis)
Está publicada en **https://alfredotorrespamplona-tech.github.io/charla/** (GitHub Pages; repositorio
https://github.com/alfredotorrespamplona-tech/charla). Hay dos formas de tenerla en el teléfono:

**A. Como app de Android (APK)**
1. En el teléfono abra https://github.com/alfredotorrespamplona-tech/charla/releases y descargue
   `Charla.apk` de la última versión.
2. Ábralo. Android le pedirá permitir «instalar apps de origen desconocido» para Chrome (o el
   administrador de archivos): acéptelo solo para esto.
3. La app abre la página publicada con el motor de Chrome, a pantalla completa: micrófono, voz y
   modo sin conexión funcionan igual que en el navegador. Si un día aparece una barra con la
   dirección arriba, es que no encontró `assetlinks.json` (ver abajo); la app sigue funcionando.

**B. Desde Chrome** (sin instalar nada): abra el enlace en **Chrome de Android** → menú ⋮ →
**Instalar app** (o **Agregar a la pantalla principal**).

En las dos, ponga su clave de Groq (gratis) y, si quiere, la de DeepSeek en Ajustes. Se guardan **solo en su
teléfono**, nunca en la página.
Las actualizaciones llegan solas: al publicar una versión nueva, la app la descarga la próxima vez que abra.
No hace falta volver a instalar el APK.

### Cómo está hecho el APK
- `android/` es una *Trusted Web Activity* generada con Bubblewrap (`android/twa-manifest.json`):
  una app mínima que abre la página en Chrome. No es una copia de la app: el contenido viene de Pages.
- Compilarlo otra vez (Java 17 y el SDK de Android ya están en este PC), desde `charla/android`:
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Java\jdk-17"; .\gradlew.bat assembleDebug
  ```
  Queda en `android/app/build/outputs/apk/debug/app-debug.apk`.
- Está firmado con la llave de depuración de este PC (`%USERPROFILE%\.android\debug.keystore`). Sirve
  para instalarlo usted, no para la Play Store. Si compila en otro PC o crea una llave propia, cambie la
  huella en `android/assetlinks.json` y en el repositorio `alfredotorrespamplona-tech.github.io`
  (archivo `.well-known/assetlinks.json`), que es lo que le dice a Android que la app y la página son
  del mismo dueño.

## La IA: Groq primero, DeepSeek de respaldo (v39)
- **Ajustes → 🤖 Inteligencia artificial** tiene dos claves: **Groq** (gratis, se saca en console.groq.com) y
  **DeepSeek** (de pago). Puede poner una sola o las dos. En la bienvenida, una clave que empieza con
  `gsk_` se guarda como de Groq y una `sk-…` como de DeepSeek.
- Orden de uso: `openai/gpt-oss-120b` (el que mejor corrige) → `qwen/qwen3.8-27b` → `openai/gpt-oss-20b` →
  DeepSeek. Cada modelo de Groq tiene su propio límite gratis (unas 1000 llamadas al día y 8000 tokens por
  minuto cada uno, revisado el 2026-11-20), así que cuando uno se agota se usa el siguiente.
- Cuando Groq responde «límite alcanzado» (429), ese modelo queda en pausa el tiempo que Groq dice
  (`groqPause` en el progreso) y no se le vuelve a llamar hasta entonces. Si se agotan los tres, sigue
  DeepSeek y aparece una vez el aviso «Groq llegó a su límite gratis: sigo con DeepSeek hasta las…».
  Sin clave de DeepSeek, la app dice a qué hora vuelve Groq.
- Ajustes muestra lo de hoy: llamadas y tokens de Groq (gratis) y de DeepSeek, y si Groq está en pausa.
- Solo DeepSeek suma al gasto del mes. Con «pausar al llegar al tope», DeepSeek se pausa pero Groq sigue.
- Probar todas las tareas de la app contra la IA de verdad (la clave va solo en la variable, nunca en un archivo):
  ```powershell
  $env:GROQ_KEY = "gsk_..."; node herramientas/probar_deepseek.mjs
  ```
  Con Groq salieron 23 de 25 bien (2026-11-20). La prueba hace 24 llamadas en un minuto y pasa el límite por
  minuto: si Groq pide esperar menos de 6 s, la app espera y sigue con el mejor modelo; si es más, pasa al
  siguiente. Los modelos de respaldo de Groq son más flojos: a veces rechazan un tema propio, arman mal un
  ejercicio del taller o no cierran la despedida.

### Arreglo de la voz con Whisper (v47)
- «Aparece grabando pero no sale el texto»: la grabadora de Whisper (`js/whisper.js`) botaba el audio si el medidor de
  volumen no notaba su voz (voz bajita, o el medidor en cero en algunos Android). Ahora: el medidor se crea en el mismo
  toque (si no, Android lo deja en pausa); si mide cero, graba hasta que toque ⏹; al tocar ⏹ siempre se pasa a texto;
  y el umbral de voz bajó a 0,008. El silencio de verdad sigue sin mandarse a Groq.
- En «Responder en el momento» lo que dijo sale a la vista («🗣 Usted dijo»), no escondido en «Lo que se le entendió».

### Plan de hoy que se arma solo y su oferta de trabajo (v46)
- **Plan de hoy inteligente** (`js/coach.js`): cada día elige 1 o 2 tareas, una sola vez al día (al hacerlas se marcan, no
  desaparecen). Cada día de la semana tiene un foco: lunes pronunciar, martes escribir, miércoles hablar, jueves entrevista,
  viernes palabras, sábado escuchar; el domingo, lo que menos practicó en la semana. Después mira sus datos: su error más
  repetido, la prueba de nivel del mes, y si dejó de escribir (4 días), de pronunciar (5) o de hacer simulacros (7). Si tiene
  una entrevista en 7 días o menos, va primero: prepararla, o repasar su guion si es en 2 días o menos (aunque la guarde ese mismo día).
  Debajo siguen escuchar, Mil palabras y el repaso. Cada pantalla anota lo que hizo en `activity` (70 días, va en la copia);
  lo de antes de v46 se toma de su diario, sus grabaciones y sus simulacros.
- **Resumen de la semana** (en «Esta semana»): cuántas veces practicó cada habilidad de lunes a domingo, comparado con la
  semana anterior (▲▼), y una frase: en qué mejoró y qué le falta.
- **Practicar un error** (`errorDrill` en `js/practicascreen.js`): decir bien la frase 2 veces (nota 80 o más) o marcar «Ya no me pasa».
- **📄 Su oferta de trabajo** (`js/oferta.js`, `js/ofertascreen.js`): pega el aviso completo (hasta 12.000 letras, va entero a la IA)
  y la fecha. La IA arma 10 preguntas probables de ese puesto, cada una con cómo empezar, la estructura (Qué · Y qué · Ahora qué,
  Problema · Solución · Beneficio o 5 preguntas) y un ejemplo con traducción; 12 a 15 palabras del puesto (se llevan al repaso)
  y 3 preguntas para hacerles a ellos. Se practican con «Responder en el momento» (se guarda su mejor respuesta y la versión
  mejorada de la IA) y con un **simulacro solo de esa oferta**. Guarda hasta 10 ofertas.
- **Mi guion**: para la noche antes. Por pregunta muestra su respuesta mejorada, o la suya, o el ejemplo marcado «cámbielo por
  su historia»; más sus historias de la isla Entrevista, las palabras y sus preguntas para ellos. Se copia, se comparte o se imprime.

### Oírse, escribir y pronunciar claro (v45)
Tres técnicas del cerebro que faltaban (`js/practica.js` el contenido, `js/practicascreen.js` las pantallas). Están en la
portada, en el grupo nuevo «Oírse, escribir y pronunciar», y en Técnicas (ahora son 14).
- **🎙 Grabarse y compararse** (`wiki/metodologias/autoevaluacion_grabandote.md`): 9 temas propios (4 de entrevista,
  2 de su vida y 3 textos para leer en voz alta con la voz del teléfono para comparar). Graba hasta 2 min y medio y se
  detiene sola tras 6 s de silencio. Después: oírse, marcar lo que notó (se entiende, finales -s/-ed, pausas, muletillas),
  anotar errores directo en «Mis errores» y oír su primera vez del mismo tema. Con clave de Groq también pasa a texto:
  palabras por minuto, muletillas y cuánto cambió desde la primera. El audio queda **solo en el teléfono** (IndexedDB,
  `js/audiostore.js`); de cada tema se guardan la primera y las últimas 4. La copia de seguridad lleva fechas y números, no el audio.
- **✍ Diario en inglés** (`diario_en_ingles.md`): escribir unos 15 min (con frases para arrancar y palabras para unir ideas),
  releerlo y que la IA lo corrija **todo**, con su porqué, su nivel de hoy, el texto corregido y frases para el repaso. El texto
  va completo a la IA, con sus reglas y sus errores. Cada corrección queda en «Mis errores». El borrador se guarda solo.
  Sin IA se guarda igual para releerlo. Cuenta los días seguidos escribiendo.
- **👂 Sonidos parecidos**: 13 grupos que un hispanohablante confunde (ship/sheep, cat/cut, pen/pan, work/walk, b/v, sh/ch,
  j/y, th/t, th/d, s/z, con h o sin h, presente o pasado -ed, thirteen/thirty), 81 pares con su significado y cómo se hace
  cada sonido, sin jerga. «Oír»: suena una y elige cuál fue. «Decir»: la dice y la app le muestra cuál se entendió (acepta
  cifras y palabras que suenan igual). Guarda los aciertos y propone practicar los que más le cuestan.

### Más iconos, mejor portada y más ejercicios (v44)
- **Portada ordenada por grupos**: «Escuchar y hablar», «Palabras y frases», «Gramática» y «Su progreso», cada
  uno con una línea que dice para qué sirve. Cada acceso lleva su icono dentro de una ficha de color (rojo, azul,
  dorado, verde o violeta) que se ve bien en modo claro y oscuro. Las tarjetas responden al tocarlas.
- **Iconos nuevos propios** (`js/icons.js`, dibujados en SVG, sin copiar los de otra app): cerebro, libreta,
  libros, bloques, tortuga, liebre (rápido) y hablar. Toda la app usa iconos propios en lugar de emojis.
- **Escuchar**: cada historia tiene su ficha de color según el nivel (A2 verde, B1 azul, B1 alto violeta, B2 dorado).
- **Más contenido, todo escrito para la app**:
  - Escuchar: de 16 a **24** historias y diálogos (6 por nivel): el supermercado, la familia, el hotel, la rutina,
    una reunión, un ascenso, el clima y negociar con un proveedor.
  - Responder en el momento: de 18 a **27** preguntas (debilidades, trabajar en equipo, presión, el fin de semana,
    la comida, las noches, el celular, cómo estudia, dinero y felicidad), cada una con su respuesta modelo.
  - Simulacro de entrevista: 2 preguntas más en cada una de las 8 partes (**33** en total), así cada
    simulacro sale distinto.
  - Prueba de nivel: escuchar **16**, armar la frase **28** (there is/are, plurales, going to, enough, make/do,
    since, unless, told, used to, would rather) y palabras de trabajo B2 **28**. La segunda tarea de hablar
    cambia cada mes entre 5 opciones; la primera siempre es contar su trabajo.

### Modo pro (v43)
- **🎯 Su voz tal cual, con Whisper de Groq** (`js/whisper.js`). El reconocedor del teléfono «arregla» lo que uno
  dice mal («I goed» sale «I go») y la corrección nunca veía el error. Con clave de Groq, el micrófono de toda la app
  graba, detecta solo cuándo se calla y manda el audio a Groq (`whisper-large-v3-turbo`, gratis con la misma clave),
  que escribe lo que dijo de verdad. El texto aparece un segundo después de terminar. Si no hay clave, está en modo
  demo, se apaga en Ajustes o Groq llega a su límite, se usa el reconocedor del teléfono (vuelve solo). La IA sabe
  cuándo el texto es tal cual: entonces corrige esos errores en vez de ignorarlos. Ajustes muestra cuántas veces se usó hoy.
- **🎧 Escuchar** (portada y «Plan de hoy»; `js/escuchar.js`, `js/escucharscreen.js`): 16 historias y diálogos
  propios (A2, B1, B1 alto, B2; trabajo, entrevistas, viajes, día a día). Primero se escucha sin texto, luego 3
  preguntas, y al final el texto: cada palabra se toca para ver qué significa, cada frase tiene 🔊, 🐢, español,
  repetir y ⭐ para llevarla al repaso. Tres velocidades. El tiempo escuchado suma a los minutos del día. Con IA
  crea historias nuevas sobre lo que pida, a su nivel. La voz es la del teléfono: sin grabaciones de nadie.
- **💼 Simulacro de entrevista con nota** (portada y Técnicas → Para su entrevista; `js/entrevista.js`,
  `js/entrevistascreen.js`): Laura hace 9 preguntas de principio a fin (10 a 15 min), con hasta 3 repreguntas de la
  IA. Nota de 0 a 100 en fluidez, gramática, vocabulario y orden: el teléfono mide palabras por minuto, muletillas,
  variedad de palabras y la estructura de 3 partes; la IA califica todo, da su nivel, lo que hizo bien, lo que más
  conviene corregir y cada respuesta mejorada (con 🔊 y ⭐). Gráfica de cómo mejora de un simulacro a otro y cambio
  por habilidad frente al anterior. Sin IA no hay nota de gramática ni repreguntas.
- **📏 Su nivel del mes** (portada; `js/nivel.js`, `js/nivelscreen.js`): unos 10 minutos en 4 partes: escuchar (5),
  palabras (7, de las Mil palabras y de trabajo B2), armar bien la frase (8, de A2 a B2) y hablar (2). Las difíciles
  pesan más. Dice «Está en B1 alto», cuántos puntos le faltan para B2, qué le falta (lo que falló y lo que ve la IA al
  hablar), las frases que falló bien dichas y sus errores más repetidos, de más a menos veces. La portada avisa
  cuando toca (cada 30 días) y hay gráfica de un mes a otro.
- Gráficas propias sin librerías (`js/chart.js`): una sola línea, números en tinta de texto y «Ver como tabla».

### Armar frases para comunicar (v42)
- Del cerebro (`wiki/metodologias/responder_en_el_momento.md`, síntesis de construccion_oraciones_rapidas,
  tecnicas_comunicacion_oral, metodo_5w y hacks_habla_articulada) más el método de Pablo Bolen.
- **En la charla**, al tocar 💡 sale primero «🎯 Empiece con sus palabras»: el comienzo de la respuesta armado
  con la última pregunta del personaje («What do you usually do after work?» → «After work, I usually…»).
  Se arma en el teléfono (`stealStart` en `js/tecnicas.js`), sin IA. 📋 abre las 3 estructuras.
- **Gramática → Su frase**: primero muestra las piezas de su frase en español sin IA (`spanishPieces` en
  `js/grammar.js`): «hubiera llegado» → had arrived, «habría conocido» → would have known, «si tuviera» →
  had (después de «si» va pasado, nunca would), «iré» → will go, «me gustaría quedarme» → would like to stay.
  El verbo en inglés sale de la tabla de verbos del cerebro. La IA solo arma el ejercicio y lo revisa.
- Las lecciones de gramática ya no dicen «participio»: dicen «forma terminada» (regla sin jerga).

### Lo que la IA recibe siempre completo (v41)
- La v40 resumió sus reglas y sus errores y cortó el historial para gastar menos, pero eso quitaba cosas que
  sí sirven. La v41 lo devolvió todo: sus 5 reglas tal cual están en el cerebro, sus errores frecuentes con
  todas las formas y su «por qué», la charla entera para el personaje y para las sugerencias.
- El ahorro se hace sin quitar nada: Groq gratis primero, respuestas guardadas (traducir, explicar), palabras
  y repaso sin IA, razonamiento apagado y tope de respuesta por tarea.

### Gastar menos (v39)
- **Respuestas guardadas**: traducir, explicar («❓ No entiendo / No lo entiendo»), las pistas de
  pronunciación y el significado de una palabra se guardan en el teléfono (`charla.ia-cache`, las últimas
  400). Si vuelve a pedir lo mismo, no se gasta nada.
- **Palabras sin IA**: al tocar una palabra se busca primero en sus palabras guardadas y en las Mil palabras
  (también sus formas: ran → run, getting → get, tried → try). Si está, se muestra sin gastar, con el botón
  «🤖 Ver qué significa en esta frase (con IA)» por si quiere más.
- **Repaso sin IA**: lo guardado de las charlas que tiene traducción se repasa con tarjetas armadas en el
  teléfono (significado, completar si hay frase de ejemplo, y decirlo). Solo lo que no tiene traducción se
  le pide a la IA.

## Costos
Cada turno hace 2 llamadas pequeñas a la IA (respuesta del personaje + corrección), y hay
llamadas extra si usa sugerencias, traducción o palabras. Con Groq no cuestan nada.

**💰 Tope de gasto** (Ajustes): muestra lo gastado este mes en dólares, calculado con el precio de hora
pico (el más caro; el real es igual o menor). Al llegar al 80 % y al tope avisa una vez (y una tarjeta en
el inicio). Si marca «pausar DeepSeek», al pasar el tope Charla no llama a DeepSeek hasta el mes siguiente (Groq sigue).
Viene en US$3; 0 = sin tope. Los precios están en `js/budget.js`.

## Su progreso está a salvo
- Al abrir, Charla le pide al navegador **guardar los datos de forma permanente** (para que no los borre
  si falta espacio). Ajustes → 💾 Copia de seguridad dice si lo consiguió; con la app instalada casi
  siempre sí.
- **Copia cada 2 semanas**: cuando ya tiene algo que perder (3 charlas o 10 palabras), el inicio le
  recuerda guardar una copia. En el celular abre «Compartir» (Drive, WhatsApp, correo); en el PC la
  descarga. Se puede posponer 3 días.
- **La copia no lleva sus claves de IA (Groq ni DeepSeek).** Al importarla en otro teléfono, ese teléfono
  conserva las suyas.

## Archivos
| Archivo | Para qué |
|---|---|
| `js/data.js` | Lugares, personajes, misiones y los 6 niveles con sus ajustes: **aquí agrega contenido** |
| `js/lessons.js` | Lugares nuevos, versión por nivel de cada misión, plan de aprendizaje y nivel de misión |
| `js/coins.js` | Monedas (sin tienda: `SHOP_ENABLED = false`) y si un lugar está abierto |
| `js/dashboard.js` | Portada: plan de hoy, palabra del día, meta de hoy, racha, semana y accesos |
| `js/mil.js` | Mil palabras: repaso como en Anki, qué toca hoy y nuevas por día (sin pantalla, se prueba con node) |
| `js/milwords.js` | Las 1000 palabras con su frase (generado por `importar_cerebro.py`: no editar a mano) |
| `js/milscreen.js` | Pantallas de Mil palabras: estudiar, lista y ajustes del mazo |
| `js/cast.js` | «Una sola compañera»: Amy en todas las charlas, con el papel de cada lugar; los papeles de hombre siempre los hace Amy |
| `js/version.js` | Versión de la app (la sube `publicar.ps1`: no editar a mano) |
| `js/update.js` | Al volver a la app revisa si hay una versión nueva y se actualiza |
| `js/levelscreen.js` | Contenido por nivel: temario, rompecabezas, frases, vocabulario y temas de cada nivel (A1…C2) |
| `js/temario.js` | Temario de gramática: junta los temas, práctica, examen del nivel, notas y la charla enfocada en un tema |
| `js/temario-a.js`, `temario-b.js`, `temario-c.js` | Los 78 temas (A1–A2, B1–B2, C1–C2): ficha, forma, ejemplos, errores típicos y preguntas |
| `js/temarioscreen.js` | Pantallas del temario: ficha del tema, práctica, examen y resultados |
| `js/lipsync.js` | Labios al ritmo de la voz: sílabas, formas de la boca y reloj que sigue a la voz |
| `js/people.js` | Relación que sube y baja, ficha del personaje, cosas por descubrir, contactos y gente nueva |
| `js/vocab.js` | Pantalla de vocabulario (ordenar, filtrar, archivar, copiar, sugeridas) |
| `js/stats.js` | Estadísticas por semana, mes y año, y calendario de la racha |
| `js/recap.js` | Resumen de la semana, «Su año en Charla» y avisos de la racha |
| `js/seasons.js` | Temas de temporada con sus fechas y la estación para el prompt |
| `js/tutorial.js` | Tutorial guiado de la primera charla |
| `js/drills.js` | Taller de frases: ejercicios de Repeat and Juggle y esqueletos, y la revisión sin IA |
| `js/workshop.js` | Pantallas del Taller de frases y lo que hace DeepSeek ahí |
| `js/customtopics.js` | Temas propios revisados y guardados |
| `js/inbox.js` | Mensajes de los personajes y premio por responder a tiempo |
| `js/topics.js` | Temas de conversación por grupo, sorteo de misiones y los lugares banco, escuela, centro comercial y peluquería |
| `js/prompts.js` | Las instrucciones que recibe la IA para cada tarea |
| `js/llm.js` | Cliente de la IA: Groq primero (3 modelos con pausas por límite), DeepSeek de respaldo, respuestas guardadas y modo demo |
| `js/scoring.js` | El algoritmo: puntos, estrellas, racha, relación, nivel, familiaridad |
| `js/conversation.js` | El bucle de la conversación |
| `js/speech.js` | Micrófono y voz |
| `js/avatar.js` | Avatar: Amy dibujada por código (labios, parpadeo, gestos) o las imágenes de cada personaje |
| `js/pronounce.js` | Práctica de pronunciación (verde/ámbar/rojo por palabra, practicar antes de enviar) |
| `js/review.js` | Repaso con 3 tipos de tarjeta y segundo intento; «al día» con su motivo |
| `js/srs.js` | Repaso espaciado: cajas, intervalos y qué toca hoy |
| `js/phrases.js` | Las 210 frases esenciales (A1–C2), el vocabulario por nivel (B2–C2) y sus tarjetas locales. **Agregue frases al final; no cambie el orden** (los ids van por posición) |
| `js/essentials.js` | Pantalla de frases esenciales: paquetes, escuchar y repetir, límite diario |
| `js/cerebro.js`, `herramientas/importar_cerebro.py` | Paquetes, bitácora de errores y reglas del coach sacados del cerebro de inglés (generado: no editar a mano, vuelva a correr el script) |
| `js/transcript.js` | Transcripción de cada charla |
| `js/hints.js` | Pistas de pronunciación |
| `js/grammar.js` | Gramática por piezas: las 18 lecciones, revisión de lo que crea la IA, tabla de verbos y preguntas de «Pruébese» |
| `js/grammarscreen.js` | Pantallas de Gramática (lecciones, rompecabezas, tabla de verbos, Su frase) |
| `js/bitacora.js` | Bitácora de errores del teléfono: guardar, resolver, juntar con la del cerebro y enviar al PC |
| `js/budget.js` | Gasto del mes en dólares, precios de DeepSeek y tope |
| `js/safety.js` | Copia de seguridad (sin clave), recordatorio cada 2 semanas y avisos de gasto |
| `herramientas/publicar.ps1` | Publica una versión nueva con un solo comando |
| `sw.js` | Modo sin conexión. **`publicar.ps1` sube `CACHE` solo**; si publica a mano, cámbielo (charla-v24 → v25…), sobre todo si cambia imágenes: los teléfonos guardan avatares y escenas y no los vuelven a pedir |
| `tests/` | Pruebas automáticas (`node --test`) |
| `icons/`, `icon.svg`, `herramientas/generar_iconos.py` | Íconos de la app instalada (desde `herramientas/fuentes/logo.webp`, hecho con ChatGPT) |
| `js/icons.js` | Íconos de línea de la interfaz y cambio automático de emojis por íconos |
| `scenes/badges/`, `herramientas/cortar_iconos.py` | Ícono de cada lugar (ChatGPT) y la herramienta que corta la hoja |
| `avatars/` | Imágenes de cada personaje y las hojas originales de ChatGPT |
| `herramientas/componer_avatar.py` | Convierte una hoja 2x2 de ChatGPT en los cuadros del avatar |
| `herramientas/quitar_fondo.py` | Quita el fondo del avatar para ponerlo encima de la escena |
| `scenes/` | Escena de fondo de cada lugar (1200x800) y el mapa de la ciudad (`mapa.webp`). Cómo hacerlas: `avatars/LEEME.md` |
