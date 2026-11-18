# Análisis de LingoLooper 0.23.0 → metodología para "Charla"

Fuente: el APK que usted compartió (`com.lumilabs.LingoLooper`, versión 0.23.0, código 690).
Se leyó **solo la estructura**: nombres de clases, campos, enums y rutas de API dentro de
`global-metadata.dat` (Unity IL2CPP). **No se extrajo ningún dibujo, modelo 3D, sonido ni texto
de interfaz.** Todo lo que sigue son observaciones del código empaquetado; las partes marcadas
"(diseño propio)" son decisiones nuestras para reemplazar lo que ellos hacen en su servidor.

## 1. Tecnología que usan (observado)

| Pieza | Qué usan ellos | Qué usamos nosotros |
|---|---|---|
| Motor | Unity 6 (6000.3.14f1), IL2CPP, gráficos 3D URP | App web (HTML/JS) → se empaqueta como APK o PWA |
| Servidor | Backend propio (ASP.NET + SignalR), todo el "cerebro" está allá | DeepSeek directo desde el teléfono |
| IA de texto | Varios prompts en el servidor (ver §4) | Mismos roles de prompt, con DeepSeek |
| Voz → texto | Whisper, GPT-4o, Scribe (ElevenLabs), Groq Whisper | Reconocimiento de voz de Android/Chrome (gratis) |
| Texto → voz | Azure, ElevenLabs, Kokoro, OpenAI, Soniox | Lector de voz del teléfono (gratis) |
| Labios | SALSA LipSync (asset de pago) | Avatar 2D con boca animada por el audio |
| Pagos | RevenueCat, paywall | No aplica |

## 2. Estructura del contenido (observado)

```
Ciudad (CityDto: idioma, clima real, hora del día)
 └─ Lugar / "Level" (LevelDto: escena, precio, RankRequirementForUnlock)
     └─ Personaje (CharacterDto)
         · nombre, edad, sexo, profesión, ciudad natal, intereses
         · personalidad: Energetic | Calm | Playful | Serious | Confident | Cautious
         · estilo: Encouraging | Inquisitive | Thoughtful | Witty | Expressive | Blunt | Reserved | Contrarian
         · voz (proveedor, tono, velocidad, pausas extra)
         · relación con el jugador: Stranger → Acquaintance → Friend → BestFriend (RelationshipLevel)
     └─ Misión (MissionDto)
         · nombre, ícono, descripción, contexto, instrucción
         · FacetsBeginner / FacetsIntermediate / FacetsAdvanced  ← la misma misión cambia según nivel
         · progreso: MissionProgressCurrent / MissionProgressGoal
         · RelevantExpressions (frases útiles)
         · se "sortean" 3 misiones + FreeTalk, con re-roll (ReRollCounter)
     └─ Tema personalizado (CustomTopicDto: situación + personaje escritos por el usuario)
```

## 3. Flujo de una sesión ("loop") — observado en los DTO

1. `StartSession(LevelId)` → `DrawCharacters` → el usuario elige personaje.
2. `DrawMissions(personaje)` → 3 misiones + charla libre; se puede re-sortear.
3. `StartConversation` → el personaje **abre** la charla (`FirstMessage`, `MoodValence`).
4. **Bucle de turnos:**
   - El usuario habla → `speechToText` → `SpeakInConversation(Text, Duration, Delay)`.
     Fíjese en que mandan **duración** del habla y **demora** antes de hablar: así miden fluidez.
   - Respuesta: `Text`, `ConversationFinished`, `Mission` (progreso), `PointsEarnedEvent`,
     `FamiliarityUpdates` (vocabulario que usted usó).
   - En paralelo, `GetSpeechAnalysis` califica el turno:
     - `GrammaticalCorrectness`: WrongLanguage, ManyMistakes, SomeMistakes, MostlyCorrect, Perfect
     - `ContextualAppropriateness`: Inappropriate, Somewhat, Mostly, Fully
     - `HasFeedback` → se enciende un indicador; al tocarlo, `GetCoachInputFeedback` da
       la explicación del "coach" en su idioma con segmentos en el idioma meta.
   - `ReactToSpeak` → reacción del personaje (AffectionScore, MoodValence, EmotionReaction).
   - Ayudas: `SuggestForConversation` (respuestas sugeridas), `GetCustomSuggestion`
     ("¿cómo digo esto?" en español), `Translate…`, `ExploreWord` (definición, fonética,
     categoría, conjugación), marcar palabra (`BookmarkWord`), práctica de pronunciación.
   - Si no entiende el audio → `SpeechNotRecognized` (el personaje dice "¿perdón?").
   - `WaitInConversation`, `RequestGoodbye`, `RetryInConversation`.
5. `FinishSession` → resumen.

## 4. Los prompts que tiene su servidor (enum `PromptComponentType`)

CharacterGenerator, CharacterBackground, ConversationCommon, ConversationResponse,
ConversationSuggestion, ConversationCustomSuggestion, ConversationFeedbackSuggestion,
ConversationDynamicContext, ConversationMessageSummary (memoria), CoachInputFeedback,
CoachSessionFeedback, ProfileSummary, NotificationCharacterMessage, SpeechToText.

El texto de esos prompts **no está en el APK** (vive en su servidor). Escribimos los nuestros
para cada rol en `js/prompts.js` (diseño propio).

## 5. El algoritmo de progreso (campos observados → reglas de diseño propio)

**Puntos por turno** (`PointsEarnedEvent`): Base + ObjectiveBonus + VocabularyBonus + FluencyBonus,
con banderas ExcellentVocabulary / ExcellentFluency.

**Puntos de la sesión** (`SessionSummaryScoreDetailsDto`): PointsBase, VocabularyBonus, FluencyBonus,
StreakBonus (+ fracción), DifficultyBonus (modificador del nivel y de los ajustes), CompletedObjectives,
IsPersonalBest, **StarRating** con 3 umbrales (Star1/2/3Threshold).

**Estadísticas** (`FinishSessionResponseDto`): AverageDelay, AverageWordsPerMinute,
AverageAnswerDuration, DistinctWordsUsed, TotalAmountWordsUsed, SuggestionWordsUsedPercentage.

**Nivel = dificultad: una sola escalera de 6** (revisado a fondo en las tablas de texto y los DTO
del APK). El perfil muestra «Difficulty N/6» (`Rank.0`…`Rank.5`) y el resumen explica que el rango
decide la dificultad de las charlas. Cada nivel sube a la vez:
- el **lenguaje** del personaje, y también el de las sugerencias (`Difficulty.Description.0–5`:
  muy corto y lo más básico → corto/básico → largo medio/intermedio → largo medio/intermedio alto →
  puede ser largo/avanzado → muy largo/lo más avanzado);
- la **velocidad** de la voz;
- el **retraso de las ayudas**: el texto de la respuesta aparece después de escucharla, las
  sugerencias tardan más y al final solo salen si se piden.

Cada nivel trae ajustes por defecto que se pueden **personalizar**, y cada opción tiene su propio
`ScoreModifier` (la pantalla muestra el «modificador de puntaje» actual): `SpeakingSpeed` (5 opciones),
`ResponseTiming` (palabra por palabra / al terminar / 1 s / 2 s / oculto), `SuggestionTiming`
(1–4 s u «Off»), `TranslationBehavior` (siempre / solo palabras / a pedido), `FeedbackStrictness`
(Off/Relaxed/Balanced/Strict), `PronunciationHintBehavior`.

**Subir**: «completar loops con 2 o más estrellas»; se juntan estrellas en el nivel más alto
(`StarsEarnedTowardsNextUnlock / StarsRequired`) y al llegar sale un aviso para **aceptar o
rechazar** la subida (`RankChangeResponseType` Accepted/Rejected/NoResponse). Si cuesta, propone
«una dificultad un poco más fácil».
**Nivel inicial**: autoevaluación de 4 opciones + una primera charla, y luego «hemos determinado su
nivel inicial» (`DifficultyUnlockType.InitialPlacement`).
**Lugares**: «Disponible en el rango N» y además se pueden desbloquear con monedas (`BasePrice`).

En Charla (diseño propio, sin copiar títulos ni textos): niveles 1–6 con nombres A1…C2, ajustes por
nivel y personalizables con ±0,05 al multiplicador por cada paso más difícil o más fácil, 6 estrellas
de charlas de 2★ o más para desbloquear el siguiente, propuesta con «Subir de nivel / Aún no», propuesta
de bajar tras 3 charlas malas, y ubicación inicial ±1 según la gramática y las palabras distintas de la
primera charla de 3 turnos o más.

**Vocabulario**: cada palabra guardada tiene `FamiliarityScore` y tier
None → Seen → Familiar → Practiced → Mastered; sube al usarla en conversación.

**Repaso personalizado**: tarjetas con frase de completar (un único `{{gap}}`), opciones,
pista, revelar respuesta, autoevaluación, reportar tarjeta mala. Cuenta para la racha.
Lo que muestran los tipos del APK (metadatos IL2CPP):
- Estados de la entrada al repaso: no disponible, preparando, listo, continuar, al día.
  Al día tiene tres motivos (`CaughtUpReason`): nada toca hoy, no hay material, hace falta más material.
- Resultado de cada intento (`AttemptOutcome`): reconocida / no reconocida, recordada / todavía no,
  completada sin ayuda / con ayuda / no completada, y pendiente de calificar en el servidor.
- Cada tarjeta trae familia, forma de responder, contenido, si tiene pista y qué resultados admite.
- El resumen de la sesión cuenta tarjetas planeadas, respondidas, saltadas y reportadas, correcciones,
  resultados por tipo y duración, y si califica para la racha.
- **Las fechas de repaso las calcula su servidor** («nada toca hoy»): el APK no trae los intervalos.
  Charla no tiene servidor, así que usa un repaso espaciado propio en el teléfono (ver §6 y §6b).

**Racha**: un día cuenta si hubo actividad que califique (`QualifiedForLearningActivity`),
con récord y "congelador" de racha.

**Memoria del personaje**: guardan resúmenes de conversaciones pasadas y los inyectan al
siguiente prompt (`RelevantSummariesCount`).

## 6. Qué tiene Charla de cada pieza

| Pieza observada | En Charla |
|---|---|
| Lugares, personajes, misiones con facetas, sorteo de 3 + re-roll, tema propio | ✅ `js/data.js`, `js/app.js` |
| Los 10 escenarios del catálogo del APK (coffee-shop, neighborhood, grocerystore, park, downtown, restaurant, gym, office, hospital, cityhall) | ✅ los 7 que ya había equivalen a cafetería, parque, calle, restaurante, gimnasio, oficina y consultorio; se agregaron barrio, supermercado y ayuntamiento (`js/lessons.js`). Las misiones de LingoLooper las manda su servidor (`DrawMissions`) y no vienen en el APK: las de Charla son propias |
| Temas de conversación del servidor (no vienen en el APK). Sus páginas públicas nombran: presentarse, ponerse al día, clima, noticias, direcciones, qué hacer, trabajo, familia, mascotas, compras, moda, ejercicio, comida, música, transporte, diversidad e inclusión, eventos culturales y deportes; su web los agrupa en día a día, trabajo, estudio, viaje, salud, amigos y familia | ✅ 48 temas propios en `js/topics.js` (8 grupos, 3 niveles cada uno, algunos solo desde B1/B2). `drawMissions` mezcla misiones del lugar con un tema; pantalla «Todos los temas» |
| Lugares de su hoja de ruta pública (banco, escuela, centro comercial, peluquería) | ✅ `ROADMAP_PLACES` en `js/topics.js`, 4 misiones cada uno, 5 personajes propios |
| Facetas por nivel (`FacetsBeginner/Intermediate/Advanced`) en todas las misiones | ✅ `FACETS` en `js/lessons.js` |
| Nivel por misión con porcentaje (`MissionProgressionSnapshot`) y opciones bloqueadas hasta un nivel total (`LockedMissionSlot`, «Reach total topic level…») | ✅ 4 estrellas por nivel; 3 → 4 → 5 opciones con nivel total 8 y 20 |
| Bienvenida: nombre, nivel, primera charla con «habló X segundos y usó Y palabras»; plan: motivo, meta diaria (5/10/20/30+), intereses (51), grupo de edad | ✅ `js/app.js` (`planEditor`), intereses y edad van en el prompt del personaje (sin recordatorios: es una página web) |
| Apertura, turnos con duración y demora, personaje que no entiende | ✅ `js/conversation.js` |
| Análisis del turno (gramática, adecuación) + explicación del coach | ✅ |
| Sugerencias, «¿cómo digo esto?», traducir, explorar palabra, guardar | ✅ |
| Retry (repetir turno) | ✅ ↩️ en la última frase |
| Práctica de pronunciación | ✅ `js/pronounce.js` (reconocimiento del teléfono, sin tokens) |
| Hora del día de la ciudad y estación (`ClimateSeason`) | ✅ hora, día, fecha y estación (hemisferio norte, donde viven los personajes) en el prompt, sin clima real (`seasonLine` en `js/seasons.js`) |
| Eventos de temporada (`SeasonalEventGameDto`) | ✅ `js/seasons.js`: 9 temas propios con fechas (año nuevo, amor y amistad, primavera, día de la madre, verano, vuelta a la rutina, Halloween, dar las gracias, Navidad); salen primero en las misiones de cualquier lugar y con aviso en el inicio |
| Pedir despedirse (`RequestGoodbyeInConversation`) y pedir un momento (`WaitInConversation`) | ✅ 🏁 ofrece «👋 Despedirme de…» (el personaje cierra la charla); «⏳ Necesito un momento» hace que espere hasta 90 s sin gastar tokens |
| Manos libres (`LiveModeToggle`) con espera antes de enviar | ✅ botón 🎙 en la charla: escucha sola y, tras una pausa, muestra 2,5 s para cancelar, seguir hablando o enviar ya |
| Escuchar el vocabulario (`ListenToVocabulary`) | ✅ «🔊 Escuchar todo» en Vocabulario: inglés, pausa para repetir, español |
| Nivel MCER y formalidad de la palabra (`VocabularyCEFRLevel`, `VocabularyFormality`) | ✅ etiquetas en el explorador de palabras y guardadas con la palabra |
| Modo comedia (`SettingsUseComedyMode`) y vibración (`HapticsManager`) | ✅ en Ajustes → Charlas |
| Resumen semanal (`MarkWeeklySummaryAsOpened`) y del año (`ReLoop`) | ✅ `js/recap.js`: tarjeta «Su semana» una vez por semana; «✨ Su año en Charla» en Estadísticas (y en el inicio del 1 de diciembre al 15 de enero) con mejor amigo, escenario favorito, cuándo aprende y la racha más larga |
| Aviso de racha por vencer (`StreakExpiryReminder`) y recibo del protector (`StreakFreezeReceipt`) | ✅ tarjetas en el inicio (sin notificaciones del sistema: es una página web) |
| (No existe en LingoLooper) Repeat and Juggle y Skeleton swapping | ✅ «Taller de frases»: `js/drills.js` (12 juggles y 20 esqueletos propios + los 111 juggles de verbos del cerebro, `JUGGLE_SETS`) y `js/workshop.js`. DeepSeek crea ejercicios desde cualquier frase (`juggle_create`, `skeleton_create`), revisa intentos (`drill_check`) y genera más cambios (`skeleton_more`) |
| Tutorial de la primera charla (`Tutorial.*`) | ✅ `js/tutorial.js`: ilumina cada botón con su explicación; se puede saltar y repetir desde Ajustes |
| Puntos, estrellas, récord, bonos de racha y de nivel | ✅ `js/scoring.js` |
| Racha con récord y congelador | ✅ protector comprado con monedas |
| Relación con el personaje y memoria de charlas pasadas | ✅ |
| Una escalera de 6 niveles (lenguaje + velocidad + ayudas), ajustes personalizables con multiplicador | ✅ `js/data.js` (`RANKS`, `SETTING_OPTIONS`, `levelSettings`) |
| Subir con estrellas (charlas de 2★+), aceptar/«Aún no», propuesta de bajar, nivel inicial tras la 1.ª charla | ✅ |
| Texto de la respuesta palabra por palabra / después / oculto; traducción solo palabras o a pedido; corrección apagada | ✅ `js/conversation.js`, `js/words.js` |
| Pistas de pronunciación (`PronunciationHintBehavior`: automáticas / a pedido / apagadas) en respuestas, sugerencias y versión «más natural» | ✅ `js/hints.js` (escritura con letras del español, sílaba fuerte en MAYÚSCULAS) |
| Monedas: 1 por estrella, extra al subir una misión; abrir lugares pagando (`LevelDto.BasePrice`) y volver a sortear misiones pagando (`ReRollCounter`) | ✅ `js/coins.js` (precios propios: el APK no los trae; 1 sorteo gratis al día) |
| Ligas (Bronce/Plata/Oro) | ❌ necesitan otros jugadores; no aplica a una app personal |
| Familiaridad del vocabulario | ✅ |
| Repaso con 3 familias (`Recall`, `ContextualMeaningRecognition`, `ContextCompletion`), reintento guiado al final, reportar con motivo, «está al día» | ✅ `js/review.js` |
| Fechas de repaso calculadas por el servidor y «al día» con su motivo (`CaughtUpReason`) | ✅ `js/srs.js`: cajas de Leitner en el teléfono (1, 3, 7, 14, 30, 60, 120 días); solo salen las que tocan hoy; «al día» explica el motivo, cuándo es el próximo y ofrece «Practicar igual»; tarjeta «Repaso de hoy» en el inicio |
| (No existe en LingoLooper) Frases esenciales para empezar sin depender de lo guardado en las charlas | ✅ `js/phrases.js` (120 frases propias en 12 paquetes A1–B1) y `js/essentials.js` (escuchar y repetir → recordar → repaso espaciado; tarjetas locales sin IA). Más los paquetes del cerebro de inglés del usuario (`js/cerebro.js`): frases cotidianas, idioms con la trampa literal, verbos ayer / he… / había…, las 1000 palabras de Refold y «Mis errores» de su bitácora |
| Explicación del coach (`CoachInputFeedback`) | ✅ además sigue las reglas de corrección del cerebro del usuario (sin jerga, método de Pablo Bolen en «❓ No entiendo»), marca los errores repetidos de su bitácora (`known_error`) y copia los errores de la charla en el formato de la bitácora |
| Practicar una sugerencia antes de enviarla (`SendPracticedSuggestion`, verde/ámbar/rojo, practicar una palabra sola) | ✅ `js/pronounce.js` (sin «escuchar mi intento»: el reconocimiento del teléfono no guarda el audio) |
| Transcripción en la charla, el resumen y el historial; copiar como texto (`SessionTranscript`) | ✅ `js/transcript.js` |
| Relación que baja (Enemy/Nemesis) con «+N para ser amigos» | ✅ `js/people.js`, cariño hasta -30 |
| Ficha del avatar: ~20 piezas de historia desbloqueables, rasgos, fecha en que se conocieron, borrar memoria, quitar de contactos | ✅ `js/people.js` (las piezas las inventa el modelo al abrirlas, coherentes con el personaje) |
| Contactos y «conozca a alguien nuevo» (primero según intereses) | ✅ `js/people.js` |
| Vocabulario: ordenar por familiaridad/fechas, filtrar por tipo, archivar, copiar, palabras sugeridas | ✅ `js/vocab.js` |
| Estadísticas semana/mes/año con gráfico; calendario de la racha con días congelados | ✅ `js/stats.js` |
| Temas propios guardados (revisados, ícono, papel del personaje, veces jugados, editar/borrar) | ✅ `js/customtopics.js` |
| Continuar una charla a medias y deshacer «terminar» | ✅ `js/conversation.js` (borrador en el teléfono) |
| El personaje retoma si el alumno calla («¡Su turno!»); aviso de fin de grabación y envío de lo dicho | ✅ `js/conversation.js`, `js/speech.js` |
| Perfil: intereses, ambición (meta diaria), edad y género | ✅ «Mi plan» |
| Mensajes de los personajes entre charlas con premio por responder a tiempo | ✅ `js/inbox.js` (aparecen al abrir la app; sin notificaciones del sistema porque no hay servidor) |
| Cuenta en el servidor: el progreso no se pierde al cambiar de teléfono | ✅ sin servidor: `js/safety.js` pide almacenamiento permanente, recuerda una copia cada 2 semanas (sin la clave de DeepSeek) e importa en otro teléfono |
| Gasto de IA a cargo de la empresa | ✅ aquí lo paga el usuario: `js/budget.js` calcula el gasto del mes con los precios de DeepSeek, avisa al 80 % y al tope, y puede pausar la IA |
| (No existe en LingoLooper) Bitácora de errores propia, editable en el teléfono | ✅ `js/bitacora.js`: guarda los errores de cada charla, el coach los vigila al instante, se marcan resueltos y se envían al cerebro del PC; `herramientas/publicar.ps1` publica de vuelta |
| Ciudades/idiomas múltiples, clima real | ❌ no aplica a una app personal sin servidor |

## 6b. Base de la técnica de repaso y frases (investigación)

Lo que coinciden en recomendar los expertos en adquisición de vocabulario, resumido en nuestras palabras:
- **Frecuencia primero**: unas pocas miles de palabras cubren la gran mayoría de lo que se oye a diario;
  conviene aprender primero lo más usado.
- **Frases enteras (bloques o «chunks»)**: el habla está hecha en buena parte de expresiones fijas.
  Aprenderlas completas da fluidez antes que juntar palabras sueltas con reglas.
- **Recuperación activa**: intentar recordar sin mirar fija más que volver a leer.
  Por eso cada tanda termina con tarjetas enseguida.
- **Repaso espaciado**: repasar justo cuando empieza a olvidarse, con intervalos que crecen si acierta
  y se acortan si falla.
- **Escuchar y repetir en voz alta (shadowing)**: imitar el audio une sonido, ritmo y significado.
- **Poco cada día**: un límite de frases nuevas al día (10) evita acumular más repaso del que se puede
  sostener.

Cómo lo aplica Charla:
- Intervalos 0 → 1 → 3 → 7 → 14 → 30 → 60 → 120 días.
- Acertar sube una caja. Con ayuda, misma caja y la mitad del intervalo. Fallar baja dos cajas y vuelve
  mañana.
- Solo la primera respuesta de la sesión cambia la fecha; el segundo intento es práctica.
- Las palabras guardadas antes de esto toman caja y fecha de su familiaridad.
- Frases en tandas de 5, máximo 10 nuevas al día.
- El paquete recomendado depende del nivel y de lo ya aprendido. Lo guardado desde una charla también
  cuenta como aprendido.

## 7. Lo que NO copiamos

Personajes, caras, ropa, escenas 3D, música, sonidos, textos de interfaz, nombre y marca.
Los avatares de Charla los genera usted (ChatGPT) o usa el avatar dibujado por código que trae la app.
