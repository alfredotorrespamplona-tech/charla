// Técnicas avanzadas para aprender más rápido, sacadas del cerebro de inglés (wiki/metodologias): dictado
// activo y simulacro con imprevisto (DLI), shadowing con intención, predicción, Just A Minute, super sentences,
// story retelling, traducción de ida y vuelta (Luca Lampariello), islas de lenguaje con STAR y la misma frase
// en 5 capas. Contenido escrito con palabras propias. Sin pantallas (están en tecnicasscreen.js): se prueba con node.
import { normalize, localCheck } from './drills.js';
import { tokens } from './pronounce.js';
import * as T from './temario.js';

export const DICTADO_SIZE = 6;      // frases por ronda de dictado
export const SOMBRA_SIZE = 5;       // frases por ronda de sombra
export const PREDICT_SIZE = 8;      // frases por ronda de «Adivine el final»
export const DAILY_SIZE = 5;        // «Las 5 de hoy»
export const JAM_SECONDS = 60;      // Just A Minute
export const LONG_PAUSE_MS = 3000;  // regla del JAM: pausas de más de 3 s cuentan
export const INCUBATION_MS = 8 * 3600 * 1000;   // ida y vuelta: dejar descansar unas horas (mejor un día)

// ---------------- Las técnicas (qué son, por qué funcionan, cómo se hacen) ----------------
export const GROUPS = [
  { id: 'oido', name: 'Entender inglés rápido' },
  { id: 'fluidez', name: 'Hablar con fluidez' },
  { id: 'armar', name: 'Armar frases usted solo' },
  { id: 'reaccionar', name: 'Reaccionar cuando algo cambia' },
  { id: 'pulir', name: 'Oírse, escribir y pronunciar claro' },
];

export const TECHNIQUES = [
  { id: 'dictado', group: 'oido', icon: '🎧', name: 'Dictado activo',
    what: 'Escucha una frase y la escribe palabra por palabra, sin verla.',
    why: 'Es tarea diaria de los militares de EE. UU. en el instituto de idiomas DLI. Escuchar «por encima» esconde huecos; el dictado le obliga a dar cuenta de cada palabra y le muestra justo cuáles se le escapan.',
    how: ['Escuche la frase las veces que necesite (también despacio).', 'Escriba exactamente lo que oye, sin adivinar por el sentido.', 'Compare: en color lo que no oyó. Si la palabra la conocía, fue el oído (palabras unidas al hablar rápido); si no la conocía, guárdela.'] },
  { id: 'prediccion', group: 'oido', icon: '🔮', name: 'Adivine el final',
    what: 'Oye el comienzo de una frase y elige cómo termina antes de oírla completa.',
    why: 'Un buen oyente no solo escucha: adelanta lo que viene. En español lo hace sin darse cuenta; en inglés hay que entrenarlo, y cuando lo logra, el inglés rápido deja de sonar rápido.',
    how: ['Oiga el comienzo (puede repetirlo).', 'Elija el final que tiene sentido.', 'Oiga la frase completa y repítala en voz alta.'] },
  { id: 'sombra', group: 'oido', icon: '🗣', name: 'Sombra con intención',
    what: 'Repite cada frase igual que la voz: mismo ritmo, misma melodía. Siempre con una intención.',
    why: 'El error más común es hacerlo como loro, en piloto automático: así los hábitos viejos siguen. Con una intención concreta (palabras fuertes, final que sube o baja, finales de palabra o palabras unidas) su oído y su boca cambian de verdad.',
    how: ['Elija una intención.', 'Escuche despacio, normal y rápido.', 'Repítala en voz alta: verá en color qué se entendió.', 'Mejor pocas frases muchas veces que muchas frases una vez.'] },
  { id: 'jam', group: 'fluidez', icon: '⏱', name: 'Un minuto sin parar (JAM)',
    what: 'Habla un minuto entero sobre un tema, tres veces, mejorando cada vez.',
    why: 'Viene de un programa de radio de la BBC. Entrena la fluidez sin compañero: obliga al cerebro a producir sin detenerse. La segunda y la tercera vez, con notas, notará mucha más soltura.',
    how: ['Ronda 1, a ciegas: hable el minuto sin prepararse.', 'Anote 3 o 4 ideas clave y hable otro minuto con esas notas.', 'Agregue uno o dos detalles y hágalo por tercera vez.', 'Reglas: no parar más de 3 segundos, no repetir ideas y no escribir mientras habla.'] },
  { id: 'crece', group: 'fluidez', icon: '🧱', name: 'Frase que crece',
    what: 'Una frase corta que crece pieza a pieza; cada vez la dice completa.',
    why: 'Casi nadie practica decir frases de más de 10 o 12 palabras. Aquí nunca enfrenta la frase larga de golpe: solo la última pieza es nueva, y de paso practica cómo se unen las ideas (because, so, but, even when…).',
    how: ['Escuche la frase.', 'Dígala completa, no solo la parte nueva.', 'Para más reto, oculte el texto y dígala de memoria.'] },
  { id: 'capas', group: 'fluidez', icon: '🎭', name: 'Una frase, 5 capas',
    what: 'La misma frase despacio, normal, con 3 emociones, rápido y en 3 situaciones.',
    why: 'Hablar también es un músculo: su boca nunca practicó el ritmo del inglés como practicó el del español. Repetir la misma frase cada vez más rápido y con emoción la vuelve parte de su voz, no un ejercicio.',
    how: ['Caliente la boca un minuto (opcional).', 'Dígala muy despacio, luego normal.', 'Dígala contento, nervioso y enojado.', 'Dígala rápido sin que deje de entenderse.', 'Úsela en 3 situaciones inventadas.'] },
  { id: 'cuento', group: 'armar', icon: '🔄', name: 'Cuéntelo de otra persona',
    what: 'Oye una historia en primera persona («I…») y la vuelve a contar de otra persona («He…» / «She…»).',
    why: 'Le saca del modo loro: al cambiar «I» por «he» tiene que ajustar todo en el momento (my → his, am → is, have → has, work → works). Es lo que hacemos todo el día al contar lo que otro dijo o hizo.',
    how: ['Escuche la frase con «I».', 'Dígala de la otra persona.', 'Mire en negrita las piezas que cambian.'] },
  { id: 'ida', group: 'armar', icon: '🔁', name: 'Ida y vuelta',
    what: 'Traduce un texto corto del inglés al español; horas después lo devuelve al inglés y lo compara con el original.',
    why: 'El método de Luca Lampariello. La espera hace que se le olviden las respuestas exactas y el cerebro tiene que trabajar. Al comparar verá justo qué palabritas (in, on, to…), palabras o finales le faltaron. Aprende cómo se arma el inglés sin estudiar reglas.',
    how: ['Ida: traduzca cada frase al español, con sus palabras.', 'Deje descansar el texto unas horas (mejor hasta mañana).', 'Vuelta: con su español a la vista, escríbalo o dígalo en inglés.', 'Compare con el original: en color lo que cambió.'] },
  { id: 'islas', group: 'armar', icon: '🏝', name: 'Mis frases (islas de lenguaje)',
    what: 'Escribe en español lo que de verdad dice en su vida; la IA lo pasa a inglés natural y lo practica de memoria.',
    why: 'Las listas de los libros son de otro. Sus propias frases (su trabajo, su día, su entrevista) son las que va a necesitar. Decirlas de memoria desde el español —y fallar al principio— es lo que las fija.',
    how: ['Elija una isla (trabajo, entrevista, su día…).', 'Escriba sus frases en español, una por línea.', 'La IA las pasa a inglés natural; guárdelas.', 'Practíquelas: de memoria, en sombra y en dictado.', 'Para la entrevista: arme sus historias con STAR.'] },
  { id: 'imprevisto', group: 'reaccionar', icon: '🎲', name: 'Simulacro con imprevisto',
    what: 'Una charla con la IA en la que, sin avisar, algo sale mal: un vuelo cancelado, una pregunta inesperada en la entrevista…',
    why: 'Otra técnica del DLI: practicar solo el guion perfecto no prepara para el momento en que algo cambia. Aquí entrena a reaccionar en inglés cuando el plan se rompe.',
    how: ['Elija la situación.', 'Charle normal: en algún momento pasará algo que no espera.', 'Resuélvalo en inglés, con calma.'] },
  { id: 'responder', group: 'reaccionar', icon: '🎯', name: 'Responder en el momento',
    what: 'Le hacen una pregunta y arma la respuesta en segundos: empieza con las palabras de la pregunta, la ordena en 3 partes y la dice corta y clara.',
    why: 'Lo que más frena al hablar no es la falta de palabras: es tener que decidir qué decir y cómo decirlo al mismo tiempo. Si roba las palabras de la pregunta, ya tiene el comienzo; si tiene una estructura lista (Qué · Y qué · Ahora qué, de Matt Abrahams en Stanford), solo piensa en el contenido. Y en bloques cortos se equivoca menos que en frases largas.',
    how: ['Escuche la pregunta.', 'Empiece con sus mismas palabras: «What do you do after work?» → «After work, I…».', 'Si necesita tiempo, use una frase para pensar («Good question. Let me think…»).', 'Diga 3 partes: la respuesta, por qué importa y qué sigue.', 'Corta y clara. Si se equivoca, corríjase y siga: lo importante es comunicar.', 'Compare con el ejemplo y dígala otra vez, mejor.'] },
  // v45 (pantallas en practicascreen.js, contenido en practica.js)
  { id: 'grabarse', group: 'pulir', icon: '🎙', name: 'Grabarse y compararse',
    what: 'Se graba 1 o 2 minutos respondiendo una pregunta o leyendo en voz alta, se oye con calma y compara con su primera vez.',
    why: 'Mientras habla, su cabeza está ocupada armando la frase y no nota los errores. Al oírse después, sí: usted mismo es el profesor que siempre tiene a mano. Y oír su voz en inglés en privado le quita los nervios de hablar frente a otros.',
    how: ['Grábese 1 o 2 minutos, 2 o 3 veces por semana.', 'Óigase una vez entera, sin parar.', 'Óigase otra vez, marque lo que notó y anote sus errores.', 'Compare con su primera grabación del mismo tema.'] },
  { id: 'diario', group: 'pulir', icon: '✍', name: 'Diario en inglés',
    what: 'Escribe unos minutos sobre su día o sus planes, lo relee y la IA lo corrige todo, explicando por qué.',
    why: 'Escribir y hablar usan la misma parte del cerebro: tiene que buscar las palabras y armar las frases, pero sin el apuro de una charla. Y como escribe de su vida, las palabras se le quedan mejor que de una lista.',
    how: ['Escriba sin parar a corregirse (unos 15 minutos, o menos).', 'Reléalo y corrija usted mismo lo que vea.', 'Lea las correcciones de la IA y su porqué.', 'Guarde las frases buenas en su repaso; sus errores quedan en «Mis errores».'] },
  { id: 'sonidos', group: 'pulir', icon: '👂', name: 'Sonidos parecidos',
    what: 'Pares de palabras que solo cambian en un sonido (ship / sheep, work / walk, thirteen / thirty): primero elige cuál oyó y después la dice.',
    why: 'El español tiene 5 vocales y el inglés unas 12, así que hay sonidos que a usted le parecen iguales. Si no los separa al oír, no entiende; si los dice igual, le entienden otra palabra. Entrenar el oído primero hace que la boca lo siga.',
    how: ['Elija un par de sonidos y lea cómo se hace cada uno.', 'Oiga la palabra y elija cuál de las dos fue.', 'Dígala usted: la app le dice cuál se entendió.', 'Repita unos días los que más le cuestan.'] },
];
export const techniqueById = id => TECHNIQUES.find(t => t.id === id);

// ---------------- De dónde salen las frases ----------------
export const SOURCES = [
  { id: 'entrevista', icon: '🤝', name: 'Entrevista de trabajo' },
  { id: 'nivel', icon: '🎓', name: 'Frases de su nivel' },
  { id: 'mias', icon: '🏝', name: 'Mis frases' },
  { id: 'repaso', icon: '🧠', name: 'Mi repaso' },
];

// Frases típicas de una entrevista de trabajo (las del entrevistador, para entenderlas, y las suyas, para decirlas).
export const INTERVIEW = [
  ['Tell me about yourself.', 'Hábleme de usted.'],
  ['Can you walk me through your work experience?', '¿Me puede contar su experiencia laboral?'],
  ['What would you say is your greatest strength?', '¿Cuál diría que es su mayor fortaleza?'],
  ["What's an area you're working to improve?", '¿Qué está tratando de mejorar?'],
  ['What made you decide to leave your last job?', '¿Por qué decidió dejar su último trabajo?'],
  ['Where do you see yourself in five years?', '¿Dónde se ve en cinco años?'],
  ['Why should we hire you over other candidates?', '¿Por qué deberíamos contratarle a usted y no a otro candidato?'],
  ['What are your salary expectations?', '¿Cuáles son sus expectativas de salario?'],
  ["It's a pleasure to meet you. Thank you for having me.", 'Es un placer conocerle. Gracias por recibirme.'],
  ['I really appreciate the opportunity to speak with you today.', 'De verdad agradezco la oportunidad de hablar con usted hoy.'],
  ['In my last job, I was responsible for a team of five people.', 'En mi último trabajo, era responsable de un equipo de cinco personas.'],
  ["One thing I'm proud of is that I finished a big project ahead of time.", 'Algo que me enorgullece es que terminé un proyecto grande antes de tiempo.'],
  ["I'd say my greatest strength is that I stay calm under pressure.", 'Diría que mi mayor fortaleza es que mantengo la calma bajo presión.'],
  ["I used to struggle with time management, but I've been working on it.", 'Antes me costaba organizar mi tiempo, pero he estado trabajando en eso.'],
  ["I'm looking for a place where I can keep learning and growing.", 'Busco un lugar donde pueda seguir aprendiendo y creciendo.'],
  ["I've been using this time to improve my English and take some courses.", 'He usado este tiempo para mejorar mi inglés y hacer algunos cursos.'],
  ["I'm looking for something competitive based on the role and my experience.", 'Busco algo competitivo según el puesto y mi experiencia.'],
  ["I'm sorry, could you repeat the question?", 'Perdón, ¿podría repetir la pregunta?'],
  ['Just to clarify, are you asking about my last job?', 'Solo para aclarar: ¿me pregunta por mi último trabajo?'],
  ["That's a great question. Let me think about it for a moment.", 'Muy buena pregunta. Déjeme pensarlo un momento.'],
  ['What does a typical day in this role look like?', '¿Cómo es un día normal en este puesto?'],
  ["Can you tell me more about the team I'd be working with?", '¿Me puede contar más del equipo con el que trabajaría?'],
  ['What are the next steps in the process?', '¿Cuáles son los siguientes pasos del proceso?'],
  ['Thank you so much for your time. I really enjoyed our conversation.', 'Muchas gracias por su tiempo. Disfruté mucho la conversación.'],
  ["I'm very interested in this opportunity, and I look forward to hearing from you.", 'Me interesa mucho esta oportunidad y espero tener noticias suyas.'],
  ['I work well in a team, but I can also work on my own.', 'Trabajo bien en equipo, pero también puedo trabajar por mi cuenta.'],
  ['When there is a problem, I look for a solution, not someone to blame.', 'Cuando hay un problema, busco una solución, no un culpable.'],
  ["I learn fast, and I'm not afraid to ask questions.", 'Aprendo rápido y no me da miedo preguntar.'],
  ["I'd like to grow with the company in the long term.", 'Me gustaría crecer con la empresa a largo plazo.'],
  ['I could start in two weeks.', 'Podría empezar en dos semanas.'],
].map(([en, es]) => ({ en, es }));

const wordCount = t => tokens(t).length;
const levelCode = rank => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][Math.min(6, Math.max(1, rank | 0 || 1)) - 1];

// Frases { en, es } de una fuente. s = estado guardado (para «Mis frases», el repaso y el nivel).
export function sourcePool(source, s = {}) {
  if (source === 'entrevista') return INTERVIEW;
  if (source === 'mias') return (s.tecnicas?.islas || []).filter(x => x.en && x.es).map(x => ({ en: x.en, es: x.es }));
  if (source === 'repaso') return (s.vocab || []).filter(v => !v.archived && v.translation && wordCount(v.text) >= 4)
    .map(v => ({ en: v.text, es: v.translation }));
  return T.levelTopics(levelCode(s.rank)).flatMap(t => t.quiz.map(q => { const x = T.asQuestion(q, t); return { en: x.full, es: x.es }; }));
}

// Elige n frases distintas al azar.
export const pickSet = (pool, n, rnd = Math.random) => {
  const seen = new Set();
  return T.shuffle(pool, rnd).filter(x => { const k = normalize(x.en); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, n);
};

// «Las 5 de hoy» (repetición estructurada del DLI): las mismas frases todo el día en varias técnicas.
// Al azar, pero fijas para un día (semilla = la fecha).
export function seeded(seedText) {
  let h = 2166136261;
  for (const c of String(seedText)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909); return ((h >>>= 0) % 100000) / 100000; };
}
export const dailySet = (pool, iso, n = DAILY_SIZE) => pickSet(pool, n, seeded(iso));
export const DAILY_STEPS = [
  { id: 'dictado', icon: '🎧', name: 'Oírlas', sub: 'dictado' },
  { id: 'sombra', icon: '🗣', name: 'Repetirlas', sub: 'sombra' },
  { id: 'memoria', icon: '🎤', name: 'Decirlas de memoria', sub: 'desde el español' },
];

// ---------------- Revisión ----------------
// Dictado, vuelta y frases dichas: qué tanto coincide lo escrito (0..1) y si es la misma frase (con contracciones o números).
export function compare(target, attempt, accept = []) {
  const c = localCheck(target, attempt || '', accept);
  return { exact: c.result === 'exact', close: c.result === 'close', score: c.result === 'exact' ? 1 : c.score / 100 };
}

// Habla conectada: cómo suenan juntas algunas palabras cuando se dicen rápido.
export const CONNECTED = [
  [/\bwant to\b/i, 'want to', 'wanna'],
  [/\bgoing to\b(?!\s+(the|a|an|my|your|his|her|our|their|work|school|bed)\b)/i, 'going to', 'gonna'],
  [/\bgot to\b/i, 'got to', 'gotta'],
  [/\bhave to\b/i, 'have to', 'hafta'],
  [/\bhas to\b/i, 'has to', 'hasta'],
  [/\bdon'?t know\b/i, "don't know", 'dunno'],
  [/\bdid you\b/i, 'did you', 'didja'],
  [/\bwould you\b/i, 'would you', 'wouldja'],
  [/\bcould you\b/i, 'could you', 'couldja'],
  [/\bwhat do you\b/i, 'what do you', 'whaddaya'],
  [/\bwhat are you\b/i, 'what are you', 'whatcha'],
  [/\bgive me\b/i, 'give me', 'gimme'],
  [/\blet me\b/i, 'let me', 'lemme'],
  [/\bkind of\b/i, 'kind of', 'kinda'],
  [/\bout of\b/i, 'out of', 'outta'],
  [/\ba lot of\b/i, 'a lot of', 'a lotta'],
  [/\bshould have\b/i, 'should have', 'shoulda'],
  [/\bcould have\b/i, 'could have', 'coulda'],
  [/\bwould have\b/i, 'would have', 'woulda'],
  [/\btell me about\b/i, 'tell me about', "tell me 'bout"],
  [/\bbecause\b/i, 'because', "'cause"],
  [/\bthem\b/i, 'them', "'em"],
  [/\bdo you\b/i, 'do you', "d'you"],
];
export function connectedHints(text, max = 3) {
  const out = [];
  for (const [re, written, sounds] of CONNECTED) {
    if (out.length >= max) break;
    if (re.test(text || '') && !out.some(o => o.written.includes(written) || written.includes(o.written))) out.push({ written, sounds });
  }
  return out;
}

// ---------------- Sombra con intención ----------------
export const INTENTIONS = [
  { id: 'fuertes', icon: '💪', name: 'Palabras fuertes',
    how: 'Las palabras que llevan el mensaje (cosas, acciones, cómo es algo) suenan más largas y fuertes; las pequeñas (a, the, to, of, is) casi se tragan. Marque con la voz las de negrita.' },
  { id: 'melodia', icon: '🎵', name: 'Sube o baja al final',
    how: 'Fíjese solo en el final: en las preguntas de sí o no la voz sube; en lo demás (y en las preguntas con what, where, why…) baja. Copie esa curva.' },
  { id: 'finales', icon: '🎯', name: 'Los finales de las palabras',
    how: 'Quien habla español suele comerse el final: works, asked, don\'t, first. Pronuncie la última letra de las palabras marcadas: la -s, la -ed, la t y la d.' },
  { id: 'union', icon: '🔗', name: 'Palabras unidas',
    how: 'Los nativos no separan las palabras: las unen. Imite cómo suena todo junto, no palabra por palabra.' },
];

// Palabras pequeñas (sin acento) en una frase dicha normal.
const WEAK = new Set(('a an the to of in on at for with from by and but or so as than if that this these those there ' +
  'i you he she it we they me him her us them my your his its our their is am are was were be been being do does did ' +
  'have has had will would can could should shall may might must just very really some any about up out into ' +
  "i'm you're he's she's it's we're they're i've you've we've they've i'll you'll we'll i'd you'd it'll that's what's").split(' '));
// Cada palabra de la frase y si es fuerte (nombres, verbos, adjetivos, negaciones, palabras de pregunta).
export function stressMap(text) {
  return String(text || '').split(/\s+/).filter(Boolean).map(w => {
    const k = w.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z']/g, '');
    return { w, strong: !!k && (/n't$/.test(k) || !WEAK.has(k)) };
  });
}

const AUX = /^(do|does|did|is|are|am|was|were|can|could|would|will|have|has|had|should|shall|may|might|must|isn't|aren't|wasn't|weren't|don't|doesn't|didn't|can't|won't|wouldn't|couldn't|haven't|hasn't|shouldn't)$/i;
// ↗ preguntas de sí o no; ↘ afirmaciones y preguntas con what, where, how…
export function tune(text) {
  const t = String(text || '').trim();
  const first = (t.split(/\s+/)[0] || '').replace(/[^a-z']/gi, '');
  if (/\?\s*$/.test(t) && AUX.test(first)) return { dir: 'up', label: '↗ La voz sube al final: es una pregunta de sí o no.' };
  if (/\?\s*$/.test(t)) return { dir: 'down', label: '↘ La voz baja al final: es una pregunta con what, where, how… (no de sí o no).' };
  return { dir: 'down', label: '↘ La voz baja al final: es una afirmación.' };
}

// Palabras con final que se suele perder: -s, -ed, -nt / -n't, -st, -ct, -pt, -ld, -nd. split = dónde empieza el final.
export function endingMap(text) {
  return String(text || '').split(/\s+/).filter(Boolean).map(w => {
    const m = w.match(/^(.*?)([a-z'’]*?)([.,!?;:]*)$/i);
    const word = (m?.[1] || '') + (m?.[2] || '');
    const k = word.toLowerCase();
    let end = '';
    if (/n['’]t$/.test(k)) end = word.slice(-3);
    else if (k.length > 3 && /[^aeiou]ed$/.test(k)) end = word.slice(-2);
    else if (k.length > 3 && /(st|ct|pt|ld|nd|nt|ks|ts|ps)$/.test(k)) end = word.slice(-2);
    else if (k.length > 3 && /[^s'’u]s$/.test(k) && !/(is|us|ss|was|has|this|yes|his|its|as|always|perhaps|sometimes)$/.test(k)) end = word.slice(-1);
    return { w, base: end ? word.slice(0, -end.length) : word, end, punct: m?.[3] || '' };
  });
}

// ---------------- Adivine el final ----------------
// Corta una frase en comienzo y final (el final con 2 palabras o más).
export function splitForPrediction(en) {
  const ws = String(en).trim().split(/\s+/);
  if (ws.length < 6) return null;
  const k = Math.max(3, Math.min(ws.length - 2, Math.round(ws.length * 0.55)));
  return { start: ws.slice(0, k).join(' '), end: ws.slice(k).join(' ') };
}
// Rondas de predicción: el final bueno y dos finales de otras frases.
export function predictionSet(pool, n = PREDICT_SIZE, rnd = Math.random) {
  const usable = pickSet(pool.filter(x => splitForPrediction(x.en)), pool.length, rnd);
  const out = [];
  for (const x of usable) {
    if (out.length >= n) break;
    const sp = splitForPrediction(x.en);
    const others = T.shuffle(usable.filter(y => y !== x), rnd).map(y => splitForPrediction(y.en).end)
      .filter(e => normalize(e) !== normalize(sp.end));
    const wrong = [...new Set(others)].slice(0, 2);
    if (wrong.length < 2) continue;
    out.push({ ...sp, full: x.en, es: x.es, options: T.shuffle([sp.end, ...wrong], rnd) });
  }
  return out;
}

// ---------------- Un minuto sin parar (JAM) ----------------
export const JAM_TOPICS = [
  { group: 'entrevista', es: 'Hábleme de usted', en: 'Tell me about yourself.' },
  { group: 'entrevista', es: 'Su mayor fortaleza, con un ejemplo', en: 'What is your greatest strength?' },
  { group: 'entrevista', es: 'Algo que está mejorando y cómo', en: 'What is an area you are working to improve?' },
  { group: 'entrevista', es: 'Por qué quiere este trabajo', en: 'Why do you want this job?' },
  { group: 'entrevista', es: 'Un problema que resolvió en el trabajo', en: 'Tell me about a problem you solved at work.' },
  { group: 'entrevista', es: 'Dónde se ve en cinco años', en: 'Where do you see yourself in five years?' },
  { group: 'entrevista', es: 'Por qué dejó (o quiere dejar) su último trabajo', en: 'Why did you leave your last job?' },
  { group: 'entrevista', es: 'Por qué deberían contratarle', en: 'Why should we hire you?' },
  { group: 'vida', es: 'Su rutina de la mañana', en: 'Your morning routine' },
  { group: 'vida', es: 'Su medio de transporte favorito', en: 'Your favorite way to travel' },
  { group: 'vida', es: 'Su comida favorita', en: 'Your favorite food' },
  { group: 'vida', es: 'Un lugar que quiere conocer', en: 'A place you want to visit' },
  { group: 'vida', es: 'Su ciudad', en: 'Your city' },
  { group: 'vida', es: 'Un buen recuerdo de cuando era niño o niña', en: 'A good memory from your childhood' },
  { group: 'vida', es: 'Por qué aprende inglés', en: 'Why you are learning English' },
  { group: 'vida', es: 'El trabajo de sus sueños', en: 'Your dream job' },
  { group: 'vida', es: 'Un hábito que quiere cambiar', en: 'A habit you want to change' },
  { group: 'vida', es: 'Su fin de semana ideal', en: 'Your perfect weekend' },
  { group: 'vida', es: 'La última serie o película que vio', en: 'The last series or movie you watched' },
  { group: 'opinion', es: '¿Es mejor trabajar desde casa?', en: 'Is it better to work from home?' },
  { group: 'opinion', es: '¿El celular nos hace más felices?', en: 'Do phones make us happier?' },
  { group: 'opinion', es: '¿Ciudad o campo?', en: 'City or countryside?' },
  { group: 'opinion', es: '¿Los niños deberían aprender idiomas desde pequeños?', en: 'Should children learn languages very young?' },
  { group: 'opinion', es: '¿Qué hace a un buen jefe?', en: 'What makes a good boss?' },
];
export const JAM_GROUPS = [
  { id: 'entrevista', name: 'Para su entrevista' },
  { id: 'vida', name: 'Su vida' },
  { id: 'opinion', name: 'Opiniones' },
];
// Para no quedarse en blanco: idea → por qué o ejemplo → cierre.
export const JAM_FRAME = [
  ['Su idea', 'I think… / For me, the most important thing is…'],
  ['Por qué, o un ejemplo', 'because… / For example, once I…'],
  ['Cierre', "So that's why… / In the end…"],
];
export const JAM_ROUNDS = [
  { name: 'Ronda 1 · a ciegas', how: 'Hable el minuto completo sin prepararse. Si se queda en blanco, diga cualquier cosa relacionada.' },
  { name: 'Ronda 2 · con sus notas', how: 'Mismo tema, ahora con sus ideas clave a la vista. Ordene y estire lo que dijo.' },
  { name: 'Ronda 3 · con más detalles', how: 'Agregue uno o dos detalles a sus notas y hable el minuto otra vez.' },
];

const FILLERS = /\b(um+|uh+|uhm+|er+m?|ah+|hmm+|mm+|you know|i mean)\b/gi;
// Lo que dijo en el minuto: palabras, palabras por minuto, muletillas y variedad (palabras distintas / total).
export function talkStats(text, seconds = JAM_SECONDS, pauses = 0) {
  const fillers = (String(text || '').match(FILLERS) || []).length;
  const ws = tokens(String(text || '').replace(FILLERS, ' '));
  const wpm = seconds > 0 ? Math.round(ws.length / (seconds / 60)) : 0;
  const variety = ws.length ? Math.round((new Set(ws).size / ws.length) * 100) / 100 : 0;
  return { words: ws.length, wpm, fillers, pauses, variety };
}
// Cómo le fue respecto de la ronda 1 (para la tabla final).
export function jamProgress(rounds) {
  const first = rounds[0]?.wpm || 0, last = rounds[rounds.length - 1]?.wpm || 0;
  return { first, last, gain: first ? Math.round(((last - first) / first) * 100) : 0 };
}

// ---------------- Frase que crece (super sentences) ----------------
export const GROWING = [
  { id: 'gr-sales', icon: '💼', title: 'Mi trabajo', steps: [
    ['I work in sales.', 'Trabajo en ventas.'],
    ['I work in sales at a small company.', 'Trabajo en ventas en una empresa pequeña.'],
    ['I work in sales at a small company, and I talk to clients every day.', '…, y hablo con clientes todos los días.'],
    ['I work in sales at a small company, and I talk to clients every day because I like solving problems.', '…porque me gusta resolver problemas.'],
    ['I work in sales at a small company, and I talk to clients every day because I like solving problems, even when they are difficult.', '…, incluso cuando son difíciles.'],
  ] },
  { id: 'gr-job', icon: '🔍', title: 'Busco trabajo', steps: [
    ["I'm looking for a new job.", 'Estoy buscando un trabajo nuevo.'],
    ["I'm looking for a new job in a bigger company.", '…en una empresa más grande.'],
    ["I'm looking for a new job in a bigger company where I can grow.", '…donde pueda crecer.'],
    ["I'm looking for a new job in a bigger company where I can grow, so I'm improving my English.", '…, así que estoy mejorando mi inglés.'],
    ["I'm looking for a new job in a bigger company where I can grow, so I'm improving my English every single day.", '…todos los días, sin falta.'],
  ] },
  { id: 'gr-strength', icon: '💪', title: 'Mi fortaleza', steps: [
    ["I'm good at working with people.", 'Se me da bien trabajar con gente.'],
    ["I'm good at working with people from different backgrounds.", '…de distintos orígenes.'],
    ["I'm good at working with people from different backgrounds, and I always try to listen first.", '…, y siempre trato de escuchar primero.'],
    ["I'm good at working with people from different backgrounds, and I always try to listen first before I give my opinion.", '…antes de dar mi opinión.'],
    ["I'm good at working with people from different backgrounds, and I always try to listen first before I give my opinion, which helps the team make better decisions.", '…, lo que ayuda al equipo a tomar mejores decisiones.'],
  ] },
  { id: 'gr-experience', icon: '📞', title: 'Mi experiencia', steps: [
    ['I have worked in customer service.', 'He trabajado en servicio al cliente.'],
    ['I have worked in customer service for five years.', '…durante cinco años.'],
    ['I have worked in customer service for five years, mostly on the phone.', '…, sobre todo por teléfono.'],
    ['I have worked in customer service for five years, mostly on the phone, and I have learned to stay calm.', '…, y he aprendido a mantener la calma.'],
    ['I have worked in customer service for five years, mostly on the phone, and I have learned to stay calm when customers are angry.', '…cuando los clientes están enojados.'],
  ] },
  { id: 'gr-problem', icon: '⚠', title: 'Un problema en el trabajo', steps: [
    ['We had a problem.', 'Tuvimos un problema.'],
    ['We had a problem with an order.', '…con un pedido.'],
    ['We had a problem with an order from an important client.', '…de un cliente importante.'],
    ['We had a problem with an order from an important client, so I called him right away.', '…, así que lo llamé de inmediato.'],
    ['We had a problem with an order from an important client, so I called him right away and we found a solution together.', '…y encontramos una solución juntos.'],
  ] },
  { id: 'gr-morning', icon: '☀', title: 'Mis mañanas', steps: [
    ['I get up early.', 'Me levanto temprano.'],
    ['I get up early every morning.', '…todas las mañanas.'],
    ['I get up early every morning to go for a run.', '…para salir a correr.'],
    ['I get up early every morning to go for a run before I start working.', '…antes de empezar a trabajar.'],
    ['I get up early every morning to go for a run before I start working, but on Sundays I sleep in.', '…, pero los domingos duermo hasta tarde.'],
  ] },
  { id: 'gr-bus', icon: '🚌', title: 'Una mañana con mala suerte', steps: [
    ['I missed the bus.', 'Perdí el bus.'],
    ['I missed the bus this morning.', '…esta mañana.'],
    ["I missed the bus this morning because my alarm didn't go off.", '…porque no sonó mi alarma.'],
    ["I missed the bus this morning because my alarm didn't go off, so I had to take a taxi.", '…, así que tuve que tomar un taxi.'],
    ["I missed the bus this morning because my alarm didn't go off, so I had to take a taxi and I still arrived late.", '…y aun así llegué tarde.'],
  ] },
  { id: 'gr-travel', icon: '✈', title: 'Mis planes', steps: [
    ["I'm going to travel.", 'Voy a viajar.'],
    ["I'm going to travel to Canada.", '…a Canadá.'],
    ["I'm going to travel to Canada next year.", '…el próximo año.'],
    ["I'm going to travel to Canada next year if I can save enough money.", '…si logro ahorrar suficiente dinero.'],
    ["I'm going to travel to Canada next year if I can save enough money, and I want to visit my cousin there.", '…, y quiero visitar a mi primo allá.'],
  ] },
  { id: 'gr-opinion', icon: '💭', title: 'Lo que pienso del inglés', steps: [
    ['I think English is useful.', 'Creo que el inglés es útil.'],
    ['I think English is useful for work.', '…para el trabajo.'],
    ['I think English is useful for work and for traveling.', '…y para viajar.'],
    ['I think English is useful for work and for traveling, but it takes time to learn it well.', '…, pero toma tiempo aprenderlo bien.'],
    ["I think English is useful for work and for traveling, but it takes time to learn it well, especially if you don't practice every day.", '…, sobre todo si no practicas todos los días.'],
  ] },
  { id: 'gr-weekend', icon: '📚', title: 'Mi fin de semana', steps: [
    ["I'd like to rest.", 'Me gustaría descansar.'],
    ["I'd like to rest this weekend.", '…este fin de semana.'],
    ["I'd like to rest this weekend, but I have to study.", '…, pero tengo que estudiar.'],
    ["I'd like to rest this weekend, but I have to study for an exam.", '…para un examen.'],
    ["I'd like to rest this weekend, but I have to study for an exam that I can't fail.", '…que no puedo perder.'],
  ] },
];
// Lo que se agregó en un paso (para resaltarlo).
export function newPiece(steps, i) {
  if (!i) return steps[0][0];
  const prev = steps[i - 1][0].replace(/[.!?]$/, '');
  return steps[i][0].slice(prev.length).replace(/^[,\s]+/, '');
}

// ---------------- Cuéntelo de otra persona (story retelling) ----------------
// lines: [lo que dice con «I», la misma frase de la otra persona, en español].
export const STORIES = [
  { id: 'st-first-job', icon: '🍔', title: 'Mi primer trabajo', name: 'Carlos', who: 'he', lines: [
    ['I got my first job when I was eighteen.', 'He got his first job when he was eighteen.', 'Conseguí mi primer trabajo cuando tenía dieciocho años.'],
    ['I worked at a small restaurant near my house.', 'He worked at a small restaurant near his house.', 'Trabajaba en un restaurante pequeño cerca de mi casa.'],
    ['My boss was strict, but she taught me a lot.', 'His boss was strict, but she taught him a lot.', 'Mi jefa era estricta, pero me enseñó mucho.'],
    ['I learned to work fast and to smile at every customer.', 'He learned to work fast and to smile at every customer.', 'Aprendí a trabajar rápido y a sonreírle a cada cliente.'],
    ['I still use those skills today.', 'He still uses those skills today.', 'Todavía uso esas habilidades hoy.'],
  ] },
  { id: 'st-bad-morning', icon: '⏰', title: 'Una mañana difícil', name: 'Laura', who: 'she', lines: [
    ['I woke up late on Monday.', 'She woke up late on Monday.', 'Me desperté tarde el lunes.'],
    ['I had an important meeting at nine.', 'She had an important meeting at nine.', 'Tenía una reunión importante a las nueve.'],
    ['I ran to the station, but I forgot my phone at home.', 'She ran to the station, but she forgot her phone at home.', 'Corrí a la estación, pero se me quedó el teléfono en la casa.'],
    ['When I arrived, my team was waiting for me.', 'When she arrived, her team was waiting for her.', 'Cuando llegué, mi equipo me estaba esperando.'],
    ['I apologized and gave my presentation anyway.', 'She apologized and gave her presentation anyway.', 'Pedí disculpas y di mi presentación de todos modos.'],
  ] },
  { id: 'st-routine', icon: '☀', title: 'Mi rutina', name: 'Andrés', who: 'he', lines: [
    ['I live in a small apartment with my sister.', 'He lives in a small apartment with his sister.', 'Vivo en un apartamento pequeño con mi hermana.'],
    ['Every morning I make coffee and check my email.', 'Every morning he makes coffee and checks his email.', 'Todas las mañanas hago café y reviso mi correo.'],
    ["I take the bus to work because I don't have a car.", "He takes the bus to work because he doesn't have a car.", 'Tomo el bus al trabajo porque no tengo carro.'],
    ['In the evening I study English for thirty minutes.', 'In the evening he studies English for thirty minutes.', 'En la noche estudio inglés treinta minutos.'],
    ['I want to speak fluently before the end of the year.', 'He wants to speak fluently before the end of the year.', 'Quiero hablar con fluidez antes de que termine el año.'],
  ] },
  { id: 'st-interview', icon: '🤝', title: 'La entrevista', name: 'Sofía', who: 'she', lines: [
    ['I had a job interview yesterday.', 'She had a job interview yesterday.', 'Ayer tuve una entrevista de trabajo.'],
    ['I was very nervous, so I practiced my answers in the car.', 'She was very nervous, so she practiced her answers in the car.', 'Estaba muy nerviosa, así que practiqué mis respuestas en el carro.'],
    ['The manager asked me about my last job.', 'The manager asked her about her last job.', 'El gerente me preguntó por mi último trabajo.'],
    ['I told him about a difficult project that I finished on time.', 'She told him about a difficult project that she finished on time.', 'Le conté de un proyecto difícil que terminé a tiempo.'],
    ['I think I did well, and they are going to call me next week.', 'She thinks she did well, and they are going to call her next week.', 'Creo que me fue bien, y me van a llamar la próxima semana.'],
  ] },
  { id: 'st-holiday', icon: '🌳', title: 'Unas vacaciones', name: 'Diego', who: 'he', lines: [
    ['Last summer I went to the beach with my friends.', 'Last summer he went to the beach with his friends.', 'El verano pasado fui a la playa con mis amigos.'],
    ['We rented a small house near the sea.', 'They rented a small house near the sea.', 'Alquilamos una casa pequeña cerca del mar.'],
    ['I swam every day and I ate a lot of fish.', 'He swam every day and he ate a lot of fish.', 'Nadé todos los días y comí mucho pescado.'],
    ['One night our car broke down, and we had to walk back.', 'One night their car broke down, and they had to walk back.', 'Una noche se nos dañó el carro y tuvimos que volver caminando.'],
    ['It was my favorite trip.', 'It was his favorite trip.', 'Fue mi viaje favorito.'],
  ] },
  { id: 'st-change', icon: '🌱', title: 'Este año cambié', name: 'Marta', who: 'she', lines: [
    ['I have changed a lot this year.', 'She has changed a lot this year.', 'He cambiado mucho este año.'],
    ['I have started to exercise three times a week.', 'She has started to exercise three times a week.', 'He empezado a hacer ejercicio tres veces por semana.'],
    ["I haven't eaten fast food since January.", "She hasn't eaten fast food since January.", 'No he comido comida rápida desde enero.'],
    ['My friends say I look happier.', 'Her friends say she looks happier.', 'Mis amigos dicen que me veo más feliz.'],
    ['I feel proud of myself.', 'She feels proud of herself.', 'Me siento orgullosa de mí misma.'],
  ] },
  { id: 'st-cooking', icon: '🍳', title: 'Aprendí a cocinar', name: 'Luis', who: 'he', lines: [
    ["I couldn't cook when I moved out.", "He couldn't cook when he moved out.", 'No sabía cocinar cuando me fui de la casa.'],
    ['I ate pizza almost every day.', 'He ate pizza almost every day.', 'Comía pizza casi todos los días.'],
    ['Then I watched some videos and bought a few pans.', 'Then he watched some videos and bought a few pans.', 'Luego vi unos videos y compré unas ollas.'],
    ['Now I cook dinner for my family on weekends.', 'Now he cooks dinner for his family on weekends.', 'Ahora cocino la cena para mi familia los fines de semana.'],
    ['My favorite dish is chicken with rice.', 'His favorite dish is chicken with rice.', 'Mi plato favorito es el pollo con arroz.'],
  ] },
  { id: 'st-plans', icon: '🎯', title: 'Mis planes', name: 'Ana', who: 'she', lines: [
    ["I'm going to finish my course in June.", "She's going to finish her course in June.", 'Voy a terminar mi curso en junio.'],
    ["After that, I'll look for a job in an international company.", "After that, she'll look for a job in an international company.", 'Después, voy a buscar trabajo en una empresa internacional.'],
    ["I'd like to work with people from other countries.", "She'd like to work with people from other countries.", 'Me gustaría trabajar con gente de otros países.'],
    ["If I get a good job, I'll help my parents.", "If she gets a good job, she'll help her parents.", 'Si consigo un buen trabajo, voy a ayudar a mis papás.'],
    ["I know it won't be easy, but I'm ready.", "She knows it won't be easy, but she's ready.", 'Sé que no va a ser fácil, pero estoy lista.'],
  ] },
];
// Otras formas válidas: el nombre en vez de «He» / «She» al comienzo.
export function retellAccept(story, third) {
  const name = story.name;
  return /^(He|She)\b/.test(third) ? [third.replace(/^(He|She)\b/, name)] : [];
}
// Las palabras que cambian al pasar de «I» a la otra persona (para mostrarlas en negrita).
export function changedWords(first, third) {
  const a = new Set(tokens(first));
  return String(third).split(/\s+/).map(w => ({ w, changed: !!tokens(w)[0] && !a.has(tokens(w)[0]) }));
}

// ---------------- Ida y vuelta (traducción bidireccional) ----------------
export const TEXTS = [
  { id: 'tx-boss', icon: '💌', title: 'Un mensaje a mi jefe', lines: [
    ["Hi Mark, I'm sorry, but I can't come to the meeting tomorrow.", 'Hola, Mark: lo siento, pero no puedo ir a la reunión de mañana.'],
    ["I have a doctor's appointment at ten.", 'Tengo cita con el médico a las diez.'],
    ['Could we move it to Thursday afternoon?', '¿Podríamos pasarla al jueves en la tarde?'],
    ["I'll send you the report before then.", 'Le mando el informe antes de eso.'],
    ['Thanks for understanding.', 'Gracias por entender.'],
  ] },
  { id: 'tx-intro', icon: '🤝', title: 'Me presento en una entrevista', lines: [
    ['I have been working in logistics for six years.', 'Llevo seis años trabajando en logística.'],
    ['In my last job, I was in charge of a team of four people.', 'En mi último trabajo, estaba a cargo de un equipo de cuatro personas.'],
    ['We reduced delivery times by almost twenty percent.', 'Redujimos los tiempos de entrega casi un veinte por ciento.'],
    ["Now I'm looking for a role where I can use my English every day.", 'Ahora busco un puesto donde pueda usar mi inglés todos los días.'],
    ['I think this company is a great place to do that.', 'Creo que esta empresa es un gran lugar para hacerlo.'],
  ] },
  { id: 'tx-weakness', icon: '💪', title: 'Algo que estoy mejorando', lines: [
    ["One thing I'm working on is speaking in public.", 'Algo en lo que estoy trabajando es hablar en público.'],
    ['I used to get very nervous before presentations.', 'Antes me daban muchos nervios las presentaciones.'],
    ['So I joined a group where we practice every week.', 'Así que entré a un grupo donde practicamos cada semana.'],
    ["It isn't easy, but I feel more confident now.", 'No es fácil, pero ahora me siento con más confianza.'],
    ['Last month I gave a talk in front of thirty people.', 'El mes pasado di una charla delante de treinta personas.'],
  ] },
  { id: 'tx-help', icon: '💻', title: 'Pido ayuda a un compañero', lines: [
    ['Do you have a minute? I need your help with something.', '¿Tienes un minuto? Necesito que me ayudes con algo.'],
    ["I've been trying to open this file all morning.", 'Llevo toda la mañana tratando de abrir este archivo.'],
    ["It says I don't have permission.", 'Dice que no tengo permiso.'],
    ['Do you know who I should talk to?', '¿Sabes con quién debería hablar?'],
    ['Thanks, I owe you one.', 'Gracias, te debo una.'],
  ] },
  { id: 'tx-weekend', icon: '🌳', title: 'Un fin de semana', lines: [
    ['On Saturday we went to a small town in the mountains.', 'El sábado fuimos a un pueblo pequeño en las montañas.'],
    ['It was colder than we expected.', 'Hacía más frío de lo que esperábamos.'],
    ['We had lunch at a place that my uncle recommended.', 'Almorzamos en un sitio que nos recomendó mi tío.'],
    ['The food was so good that we stayed all afternoon.', 'La comida estaba tan buena que nos quedamos toda la tarde.'],
    ["We're thinking of going back next month.", 'Estamos pensando en volver el mes que viene.'],
  ] },
  { id: 'tx-hotel', icon: '🏨', title: 'Una queja en el hotel', lines: [
    ["Excuse me, there's a problem with my room.", 'Disculpe, hay un problema con mi habitación.'],
    ["The air conditioning doesn't work, and it's really hot.", 'El aire acondicionado no funciona, y hace mucho calor.'],
    ['I called reception last night, but nobody came.', 'Llamé a recepción anoche, pero no vino nadie.'],
    ['Would it be possible to change rooms?', '¿Sería posible cambiar de habitación?'],
    ["I'd really appreciate it.", 'Se lo agradecería mucho.'],
  ] },
  { id: 'tx-why', icon: '🎯', title: 'Por qué aprendo inglés', lines: [
    ['I started learning English seriously two years ago.', 'Empecé a estudiar inglés en serio hace dos años.'],
    ["At first I could understand a lot, but I couldn't speak.", 'Al principio entendía mucho, pero no podía hablar.'],
    ["Now I practice speaking every day, even if it's only ten minutes.", 'Ahora practico hablar todos los días, aunque sean diez minutos.'],
    ['My goal is to pass a job interview in English.', 'Mi meta es pasar una entrevista de trabajo en inglés.'],
    ["If I keep going like this, I know I'll make it.", 'Si sigo así, sé que lo voy a lograr.'],
  ] },
  { id: 'tx-doctor', icon: '🩺', title: 'Pido una cita', lines: [
    ["Hello, I'd like to make an appointment with Doctor Lee.", 'Hola, quisiera pedir una cita con el doctor Lee.'],
    ['Is there anything available this week?', '¿Hay algo disponible esta semana?'],
    ['Friday morning would be perfect for me.', 'El viernes en la mañana me quedaría perfecto.'],
    ['Should I bring anything with me?', '¿Tengo que llevar algo?'],
    ['Great, see you on Friday then.', 'Perfecto, nos vemos el viernes entonces.'],
  ] },
];
export const textById = id => TEXTS.find(t => t.id === id);

// Estado de un texto: 'nuevo', 'descansando' (con cuánto falta), 'listo' para la vuelta o 'hecho'.
export function idaState(saved, now = Date.now()) {
  if (!saved?.es?.length) return { state: 'nuevo' };
  if (saved.back != null) return { state: 'hecho', score: saved.back };
  const left = saved.at + INCUBATION_MS - now;
  return left > 0 ? { state: 'descansando', hours: Math.ceil(left / 3600000) } : { state: 'listo' };
}

// ---------------- Mis frases (islas de lenguaje) ----------------
export const ISLANDS = [
  { id: 'entrevista', icon: '🤝', name: 'Mi entrevista', star: true, prompts: [
    'Preséntese en tres frases: quién es y qué ha hecho.', '¿Por qué quiere este trabajo?', '¿Cuál es su mayor fortaleza? Dé un ejemplo.',
    '¿Qué está mejorando y cómo lo hace?', '¿Por qué dejó (o quiere dejar) su último trabajo?', '¿Qué le pregunta usted al entrevistador?'] },
  { id: 'trabajo', icon: '💼', name: 'Mi trabajo', prompts: [
    '¿A qué se dedica y qué hace en un día normal?', '¿Qué es lo que más le gusta de su trabajo?', '¿Qué le cuesta o le frustra?',
    '¿Con quién trabaja y cómo se llevan?', '¿Qué logro le enorgullece?'] },
  { id: 'dia', icon: '☀', name: 'Mi día', prompts: [
    '¿Qué hace al despertarse?', '¿Qué desayuna?', '¿Cómo va al trabajo o al estudio?', '¿Qué hace en la noche?', '¿Qué hace los fines de semana?'] },
  { id: 'opiniones', icon: '💭', name: 'Lo que pienso', prompts: [
    '¿Qué opina de trabajar desde casa?', '¿Qué le gusta y qué no de su ciudad?', '¿Qué consejo le daría a alguien que aprende inglés?',
    '¿Qué cambiaría de su país?', '¿Qué hace feliz a una persona?'] },
  { id: 'salidas', icon: '🍔', name: 'Comer y salir', prompts: [
    '¿Qué pide normalmente en un restaurante?', '¿Cuál es su comida favorita y por qué?', '¿Qué hace cuando sale con sus amigos?',
    '¿Qué le dice al mesero si algo sale mal?', 'Describa su lugar favorito para salir.'] },
  { id: 'problemas', icon: '⚠', name: 'Problemas y quejas', prompts: [
    'Algo que le molesta en el día a día.', 'Un problema con un pedido, un servicio o una compra.', '¿Qué dice cuando llega tarde?',
    '¿Cómo pide ayuda en el trabajo?', '¿Cómo dice con respeto que no está de acuerdo?'] },
];
export const islandById = id => ISLANDS.find(i => i.id === id);
// STAR: para contar una historia en la entrevista sin quedarse en blanco.
export const STAR = [
  { key: 'S', name: 'Situación', hint: '¿Dónde y cuándo pasó? Contexto breve.' },
  { key: 'T', name: 'Tarea', hint: '¿Qué tenía que lograr?' },
  { key: 'A', name: 'Acción', hint: '¿Qué hizo usted, exactamente?' },
  { key: 'R', name: 'Resultado', hint: '¿Cómo terminó? Si tiene un número, mejor.' },
];
// Las líneas que escribió (una frase por línea), sin vacías ni repetidas.
export const splitLines = text => [...new Set(String(text || '').split(/\n+/).map(l => l.trim()).filter(l => l.length >= 3))].slice(0, 12);
// Lo que devuelve la IA: solo pares completos y cortos.
export function validIslandItems(items) {
  return (Array.isArray(items) ? items : []).map(x => ({ es: String(x?.es || '').trim(), en: String(x?.en || '').trim() }))
    .filter(x => x.es && x.en && x.en.length <= 220 && x.es.length <= 260 && /[a-z]/i.test(x.en));
}
// Guarda frases nuevas en una isla (sin repetir las que ya tiene).
export function addIslandItems(list, island, items, now = Date.now()) {
  const have = new Set(list.map(x => normalize(x.en)));
  const fresh = items.filter(x => { const k = normalize(x.en); if (!k || have.has(k)) return false; have.add(k); return true; })
    .map((x, i) => ({ id: `is-${now.toString(36)}-${i}`, island, es: x.es, en: x.en, at: now }));
  return [...list, ...fresh];
}

// ---------------- Una frase, 5 capas ----------------
export const WARMUP = [
  'Vibre los labios como un motor: 5 segundos, 3 veces.',
  'Saque la lengua y métala despacio, 10 veces.',
  'Abra y cierre la boca bien grande, suave, 5 veces.',
  'Sonría lo más ancho que pueda 5 segundos y suelte; 2 veces.',
];
export const LAYERS = [
  { id: 'lento', icon: '🐢', name: 'Despacio y claro', how: 'Muy despacio, marcando cada sonido.', rate: 0.6 },
  { id: 'normal', icon: '🔊', name: 'Normal y unida', how: 'A velocidad normal, sin cortar entre palabras.', rate: 0.9 },
  { id: 'emociones', icon: '🎭', name: 'Con 3 emociones', how: 'Cambie la voz, el ritmo y la cara en cada una: así deja de sonar a robot.', rate: 0.9,
    emotions: ['😄 Contento', '😬 Nervioso', '😠 Enojado'] },
  { id: 'rapido', icon: '⚡', name: 'Rápido sin perder claridad', how: 'Lo más rápido que pueda sin que deje de entenderse.', rate: 1.15 },
  { id: 'contexto', icon: '🎯', name: 'En 3 situaciones', how: 'Invente una frase suya que la use en cada situación.',
    contexts: ['En una entrevista de trabajo', 'En un momento incómodo', 'Pidiendo disculpas'] },
];
// Palabras por minuto de una frase dicha (con la duración que mide el micrófono).
export const speechWpm = (text, ms) => (ms > 0 ? Math.round(tokens(text).length / (ms / 60000)) : 0);
// ¿La frase de la situación usa la frase practicada? (la mayoría de sus palabras, en orden)
export function usesPhrase(phrase, said) {
  const p = normalize(phrase).replace(/^(i|you|we|they|he|she|it) /, '');
  const a = p.split(' ').filter(Boolean), b = normalize(said).split(' ');
  let j = 0, hit = 0;
  for (const w of a) { const k = b.indexOf(w, j); if (k >= 0) { hit++; j = k + 1; } }
  return a.length > 0 && hit / a.length >= 0.7;
}

// ---------------- Simulacro con imprevisto ----------------
export const SIMULACROS = [
  { id: 'sim-int-about', place: 'interview', icon: '🤝', name: 'Entrevista: hábleme de usted',
    description: 'Una entrevista normal… hasta que algo cambia.',
    base: 'Conduct a job interview. Start with "Tell me about yourself", then ask about experience and strengths.',
    twists: ['tell the learner that the role has just changed: it now includes leading a small team, and ask how they would handle that',
      'say you noticed a gap of several months in their CV and ask them to explain it',
      'say that an emergency came up, so they only have one minute to tell you why you should hire them',
      'ask a completely unexpected question: "If you could have any job in the world, what would it be and why?"'],
    objectives: [['about', 'Present yourself professionally'], ['twist', 'Deal calmly with the unexpected change, in English'], ['close', 'Close the interview politely']],
    expressions: ['I have experience in…', "That's a great question. Let me think for a moment.", 'Thank you for your time.'] },
  { id: 'sim-int-offer', place: 'interview', icon: '💼', name: 'Entrevista: condiciones',
    description: 'Hablan de salario, horario y fecha de inicio. Algo no será como esperaba.',
    base: 'You are at the end of a job interview and talk about salary, schedule and start date.',
    twists: ['say the salary is lower than what the learner expected and see how they negotiate',
      'say they would have to start next Monday, much sooner than planned',
      'mention that the job requires traveling two weeks every month'],
    objectives: [['ask', 'Ask a question about the job'], ['twist', 'Respond to the unexpected condition and negotiate'], ['agree', 'Reach an agreement or ask for time to think']],
    expressions: ["I'm looking for something competitive.", 'Would it be possible to…?', 'Could I have a day to think about it?'] },
  { id: 'sim-airport', place: 'airport', icon: '✈', name: 'Aeropuerto',
    description: 'Hace el check-in para un vuelo internacional.',
    base: 'You are a check-in agent. The learner is checking in for an international flight.',
    twists: ['tell them their flight has just been cancelled', 'tell them their bag is five kilos over the limit and there is a fee',
      'notice that the name on the ticket is misspelled', 'tell them the flight is overbooked and ask if they can take the next one'],
    objectives: [['checkin', 'Start the check-in'], ['twist', 'Solve the unexpected problem'], ['plan', 'Agree on what happens next']],
    expressions: ["I'm checking in for the flight to…", 'What are my options?', 'Could you help me with that?'] },
  { id: 'sim-diner', place: 'diner', icon: '🍔', name: 'Restaurante',
    description: 'Pide la comida y paga. No todo saldrá bien.',
    base: 'You are a waiter. The learner orders a meal and later pays.',
    twists: ['bring them the wrong dish', 'say the card machine is not working', 'say the kitchen is closing in five minutes and some dishes are not available',
      'charge them for something they did not order'],
    objectives: [['order', 'Order a meal'], ['twist', 'Complain politely and solve the problem'], ['pay', 'Pay and say goodbye']],
    expressions: ["I'd like…", "Excuse me, I think there's a mistake.", 'Could you check the bill, please?'] },
  { id: 'sim-hotel', place: 'hotel', icon: '🏨', name: 'Hotel',
    description: 'Llega al hotel con su reserva.',
    base: 'You are a hotel receptionist. The learner arrives to check in.',
    twists: ['say you cannot find their reservation', 'say the room will not be ready for three more hours',
      'say the hotel is full and offer another hotel', 'say their card was declined'],
    objectives: [['checkin', 'Ask to check in'], ['twist', 'Handle the problem and propose a solution'], ['done', 'End with a clear plan']],
    expressions: ['I have a reservation under the name…', 'Is there anything you can do?', "I'd appreciate it."] },
  { id: 'sim-clinic', place: 'clinic', icon: '🩺', name: 'Consultorio',
    description: 'Va a su cita con el médico.',
    base: 'You are a receptionist at a medical clinic. The learner comes for an appointment.',
    twists: ['say their appointment was yesterday, not today', 'say the doctor is sick and offer another doctor or another day',
      'say their insurance does not cover this visit'],
    objectives: [['arrive', 'Say why you came'], ['twist', 'Deal with the unexpected problem'], ['next', 'Agree on what to do next']],
    expressions: ['I have an appointment at…', 'Is there another option?', 'How much would it cost?'] },
];

// La misión de la charla, con el imprevisto escondido (el personaje lo mete sin avisar).
export function simMission(sim, rnd = Math.random) {
  const twist = sim.twists[Math.floor(rnd() * sim.twists.length)];
  return {
    id: sim.id, icon: sim.icon, name: `Imprevisto: ${sim.name}`, description: sim.description, rankRequired: 1, simulacro: true,
    instruction: `${sim.base} UNEXPECTED PROBLEM (do not announce it and do not mention it at the start): after the learner's second or third answer, suddenly ${twist}. React realistically and stay firm, so the learner has to deal with it in English; help only if they are completely stuck. Then let the conversation reach a natural end.`,
    objectives: sim.objectives.map(([id, text]) => ({ id, text })),
    expressions: sim.expressions,
    facets: {},
  };
}

// ---------------- Responder en el momento ----------------
// Cerebro: construccion_oraciones_rapidas.md (Talk Emma: robar palabras de la pregunta, frases para empezar,
// bloques, corto, hablar primero y corregir después), tecnicas_comunicacion_oral.md (Matt Abrahams, Stanford:
// parafrasear, Qué · Y qué · Ahora qué y Problema · Solución · Beneficio) y metodo_5w.md (English with Tiffany).
// Las preguntas y las respuestas de ejemplo son propias.
export const ANSWER_SIZE = 3;   // preguntas por ronda

// Frases para ganar unos segundos sin decir «eh…» (cada una con su traducción).
export const STARTERS = [
  { es: 'Para ganar unos segundos', list: [["That's a good question.", 'Buena pregunta.'], ['Let me think for a second.', 'Déjeme pensar un segundo.'],
    ['Well, to be honest,', 'Bueno, para ser sincero,'], ['The thing is,', 'Lo que pasa es que']] },
  { es: 'Para repetir la pregunta con sus palabras', list: [['So, you want to know…', 'O sea, quiere saber…'],
    ["If I understand correctly, you're asking about…", 'Si entiendo bien, me pregunta sobre…']] },
  { es: 'Si la respuesta no es simple', list: [['It depends.', 'Depende.'], ['Yes and no.', 'Sí y no.']] },
];

// Las 3 estructuras: cada parte con lo que tiene que decir (en español) y bloques para empezarla.
export const FRAMES = {
  qyq: { name: 'Qué · Y qué · Ahora qué', use: 'Para presentarse, explicar algo o dar su opinión.', parts: [
    { es: 'Qué: la respuesta directa', chunks: [['I…', 'Yo…'], ['Right now, I…', 'Ahora mismo…']] },
    { es: 'Y qué: por qué importa', chunks: [['That matters because…', 'Eso importa porque…'], ["That's why…", 'Por eso…'], ['For example,…', 'Por ejemplo,…']] },
    { es: 'Ahora qué: qué sigue', chunks: [['Now I want to…', 'Ahora quiero…'], ["Next, I'd like to…", 'Después, me gustaría…']] }] },
  psb: { name: 'Problema · Solución · Beneficio', use: 'Para contar cómo resolvió algo o para convencer.', parts: [
    { es: 'Problema: qué pasaba', chunks: [['The problem was that…', 'El problema era que…'], ['We had an issue with…', 'Teníamos un problema con…']] },
    { es: 'Solución: qué hizo usted', chunks: [['So I decided to…', 'Así que decidí…'], ['What I did was…', 'Lo que hice fue…']] },
    { es: 'Beneficio: cómo terminó', chunks: [['As a result,…', 'Como resultado,…'], ['That way,…', 'Así,…']] }] },
  w5: { name: '¿Quién? ¿Qué? ¿Cuándo? ¿Dónde? ¿Por qué?', use: 'Para contar su rutina, su día o algo que pasó.', parts: [
    { es: 'Quién y qué', chunks: [['I usually…', 'Normalmente yo…'], ['My family and I…', 'Mi familia y yo…']] },
    { es: 'Cuándo y dónde', chunks: [['at around seven', 'a eso de las siete'], ['on Saturday', 'el sábado'], ['at home', 'en casa']] },
    { es: 'Por qué', chunks: [['because…', 'porque…'], ['so that…', 'para que…']] }] },
};

export const ANSWER_GROUPS = [
  { id: 'entrevista', icon: '🤝', name: 'Su entrevista' },
  { id: 'vida', icon: '☀', name: 'Su vida' },
  { id: 'opinion', icon: '💭', name: 'Su opinión' },
];

// q: la pregunta · start: cómo empezar robando sus palabras · frame: la estructura · model: una respuesta posible.
export const ANSWER_QUESTIONS = [
  { id: 'rq-about', group: 'entrevista', frame: 'qyq', q: 'Tell me about yourself.', es: 'Hábleme de usted.',
    start: 'Sure, let me tell you about myself.', startEs: 'Claro, le cuento de mí.',
    model: "Sure, let me tell you about myself. I'm a sales advisor with five years of experience. I love helping customers find what they need, and that's why I'm good with people. Now I want to grow in a bigger company like this one.",
    modelEs: 'Claro, le cuento de mí. Soy asesor de ventas con cinco años de experiencia. Me encanta ayudar a los clientes a encontrar lo que necesitan, y por eso me va bien con la gente. Ahora quiero crecer en una empresa más grande como esta.' },
  { id: 'rq-why-job', group: 'entrevista', frame: 'qyq', q: 'Why do you want this job?', es: '¿Por qué quiere este trabajo?',
    start: 'I want this job because…', startEs: 'Quiero este trabajo porque…',
    model: "I want this job because it matches my experience in sales. That matters to me because I can learn a lot here. Next, I'd like to grow with the team.",
    modelEs: 'Quiero este trabajo porque encaja con mi experiencia en ventas. Eso me importa porque aquí puedo aprender mucho. Después, me gustaría crecer con el equipo.' },
  { id: 'rq-strength', group: 'entrevista', frame: 'qyq', q: 'What is your greatest strength?', es: '¿Cuál es su mayor fortaleza?',
    start: 'My greatest strength is…', startEs: 'Mi mayor fortaleza es…',
    model: 'My greatest strength is that I stay calm under pressure. That helps the team because problems get solved faster. Now I want to use it in a role like this one.',
    modelEs: 'Mi mayor fortaleza es que mantengo la calma bajo presión. Eso ayuda al equipo porque los problemas se resuelven más rápido. Ahora quiero usarla en un puesto como este.' },
  { id: 'rq-problem', group: 'entrevista', frame: 'psb', q: 'Tell me about a problem you solved at work.', es: 'Cuénteme un problema que resolvió en el trabajo.',
    start: 'Sure. A problem I solved at work was that…', startEs: 'Claro. Un problema que resolví en el trabajo fue que…',
    model: 'Sure. A problem I solved at work was that our customers waited too long for answers. So I decided to write a simple list of common questions. As a result, we answered twice as fast.',
    modelEs: 'Claro. Un problema que resolví en el trabajo fue que nuestros clientes esperaban demasiado por una respuesta. Así que decidí escribir una lista sencilla de preguntas comunes. Como resultado, respondíamos el doble de rápido.' },
  { id: 'rq-leave', group: 'entrevista', frame: 'qyq', q: 'Why did you leave your last job?', es: '¿Por qué dejó su último trabajo?',
    start: 'I left my last job because…', startEs: 'Dejé mi último trabajo porque…',
    model: "I left my last job because I wanted new challenges. I learned a lot there, but I wasn't growing anymore. Now I want to find a place where I can grow.",
    modelEs: 'Dejé mi último trabajo porque quería nuevos retos. Aprendí mucho allí, pero ya no estaba creciendo. Ahora quiero encontrar un lugar donde pueda crecer.' },
  { id: 'rq-five', group: 'entrevista', frame: 'qyq', q: 'Where do you see yourself in five years?', es: '¿Dónde se ve en cinco años?',
    start: 'In five years, I see myself…', startEs: 'En cinco años, me veo…',
    model: "In five years, I see myself leading a small team. That matters to me because I enjoy helping others improve. That's why I'm improving my English now.",
    modelEs: 'En cinco años, me veo dirigiendo un equipo pequeño. Eso me importa porque disfruto ayudar a otros a mejorar. Por eso ahora estoy mejorando mi inglés.' },
  { id: 'rq-stress', group: 'entrevista', frame: 'psb', q: 'How do you handle stress?', es: '¿Cómo maneja el estrés?',
    start: 'I handle stress by…', startEs: 'Manejo el estrés con…',
    model: 'I handle stress by making a plan. When I have too much work, I feel stressed, so I make a list and do the most important things first. That way, I finish on time and I feel calm.',
    modelEs: 'Manejo el estrés con un plan. Cuando tengo demasiado trabajo, me estreso, así que hago una lista y hago primero lo más importante. Así termino a tiempo y me siento tranquilo.' },
  { id: 'rq-questions', group: 'entrevista', frame: 'qyq', q: 'Do you have any questions for us?', es: '¿Tiene alguna pregunta para nosotros?',
    start: "Yes, I do. I'd like to know…", startEs: 'Sí. Me gustaría saber…',
    model: "Yes, I do. I'd like to know what a normal day looks like in this role. That's important for me because I want to help the team from the first week.",
    modelEs: 'Sí. Me gustaría saber cómo es un día normal en este puesto. Eso es importante para mí porque quiero ayudar al equipo desde la primera semana.' },
  { id: 'rq-after-work', group: 'vida', frame: 'w5', q: 'What do you usually do after work?', es: '¿Qué suele hacer después del trabajo?',
    start: 'After work, I usually…', startEs: 'Después del trabajo, normalmente…',
    model: 'After work, I usually go to the gym with a friend. We go at around seven, near my house, because it helps me relax.',
    modelEs: 'Después del trabajo, normalmente voy al gimnasio con un amigo. Vamos a eso de las siete, cerca de mi casa, porque me ayuda a relajarme.' },
  { id: 'rq-weekend', group: 'vida', frame: 'w5', q: 'What did you do last weekend?', es: '¿Qué hizo el fin de semana pasado?',
    start: 'Last weekend, I…', startEs: 'El fin de semana pasado, yo…',
    model: "Last weekend, I visited my family. We had lunch at my mom's house on Sunday, because it was my brother's birthday.",
    modelEs: 'El fin de semana pasado visité a mi familia. Almorzamos en la casa de mi mamá el domingo, porque era el cumpleaños de mi hermano.' },
  { id: 'rq-commute', group: 'vida', frame: 'w5', q: 'How do you get to work?', es: '¿Cómo llega al trabajo?',
    start: 'I get to work by…', startEs: 'Llego al trabajo en…',
    model: "I get to work by bus. I leave home at around seven thirty, and I take the bus because it's cheaper than driving.",
    modelEs: 'Llego al trabajo en bus. Salgo de casa a eso de las siete y media, y tomo el bus porque es más barato que manejar.' },
  { id: 'rq-weekends', group: 'vida', frame: 'w5', q: 'What do you like to do on weekends?', es: '¿Qué le gusta hacer los fines de semana?',
    start: 'On weekends, I like to…', startEs: 'Los fines de semana, me gusta…',
    model: "On weekends, I like to cook with my family. We usually cook on Saturday at home, because it's the only time we're all together.",
    modelEs: 'Los fines de semana me gusta cocinar con mi familia. Normalmente cocinamos el sábado en casa, porque es el único momento en que estamos todos juntos.' },
  { id: 'rq-morning', group: 'vida', frame: 'w5', q: 'Tell me about your morning routine.', es: 'Cuénteme su rutina de la mañana.',
    start: 'Sure. In the morning, I…', startEs: 'Claro. En la mañana, yo…',
    model: 'Sure. In the morning, I wake up at six and make coffee. Then I read the news in the kitchen, because I like to start the day informed.',
    modelEs: 'Claro. En la mañana me levanto a las seis y hago café. Luego leo las noticias en la cocina, porque me gusta empezar el día informado.' },
  { id: 'rq-home-office', group: 'opinion', frame: 'qyq', q: 'What do you think about working from home?', es: '¿Qué opina de trabajar desde casa?',
    start: 'I think working from home is…', startEs: 'Creo que trabajar desde casa es…',
    model: "I think working from home is great for many people. That matters because you save time and money. But next year I'd like to go to the office once a week.",
    modelEs: 'Creo que trabajar desde casa es genial para mucha gente. Eso importa porque se ahorra tiempo y dinero. Pero el próximo año me gustaría ir a la oficina una vez por semana.' },
  { id: 'rq-english', group: 'opinion', frame: 'qyq', q: 'Is it important to learn English?', es: '¿Es importante aprender inglés?',
    start: "Yes, I think it's important to learn English because…", startEs: 'Sí, creo que es importante aprender inglés porque…',
    model: "Yes, I think it's important to learn English because it opens many doors. For example, you can get a better job. That's why I want to practice every day.",
    modelEs: 'Sí, creo que es importante aprender inglés porque abre muchas puertas. Por ejemplo, se puede conseguir un mejor trabajo. Por eso quiero practicar todos los días.' },
  { id: 'rq-city', group: 'opinion', frame: 'psb', q: 'What would you change about your city?', es: '¿Qué cambiaría de su ciudad?',
    start: 'If I could change something about my city, I would…', startEs: 'Si pudiera cambiar algo de mi ciudad, yo…',
    model: 'The problem in my city is the traffic. If I could change something, I would build more bike lanes. That way, people would get to work faster.',
    modelEs: 'El problema de mi ciudad es el tráfico. Si pudiera cambiar algo, construiría más ciclorrutas. Así, la gente llegaría más rápido al trabajo.' },
  { id: 'rq-save', group: 'opinion', frame: 'psb', q: "What's the best way to save money?", es: '¿Cuál es la mejor forma de ahorrar dinero?',
    start: 'I think the best way to save money is…', startEs: 'Creo que la mejor forma de ahorrar dinero es…',
    model: 'Many people spend money without noticing. I think the best way to save money is to write down every expense. That way, you see where your money goes and you spend less.',
    modelEs: 'Mucha gente gasta dinero sin darse cuenta. Creo que la mejor forma de ahorrar es anotar cada gasto. Así ve a dónde se va su dinero y gasta menos.' },
  { id: 'rq-travel', group: 'opinion', frame: 'qyq', q: 'Do you prefer to travel alone or with friends?', es: '¿Prefiere viajar solo o con amigos?',
    start: 'I prefer to travel with friends because…', startEs: 'Prefiero viajar con amigos porque…',
    model: "I prefer to travel with friends because it's more fun. For example, we share the costs and the stories. Next year, we want to go to the beach together.",
    modelEs: 'Prefiero viajar con amigos porque es más divertido. Por ejemplo, compartimos los gastos y las historias. El próximo año queremos ir juntos a la playa.' },
  // v44: 3 más por grupo.
  { id: 'rq-weakness', group: 'entrevista', frame: 'psb', q: "What's your biggest weakness?", es: '¿Cuál es su mayor debilidad?',
    start: 'My biggest weakness is…', startEs: 'Mi mayor debilidad es…',
    model: "My biggest weakness is that I find it hard to say no, so sometimes I have too much work. What I did was start a list of priorities every morning. As a result, I finish on time and I feel calmer.",
    modelEs: 'Mi mayor debilidad es que me cuesta decir que no, así que a veces tengo demasiado trabajo. Lo que hice fue empezar una lista de prioridades cada mañana. Como resultado, termino a tiempo y me siento más tranquilo.' },
  { id: 'rq-team', group: 'entrevista', frame: 'qyq', q: 'Do you prefer to work alone or in a team?', es: '¿Prefiere trabajar solo o en equipo?',
    start: 'I prefer to work in a team because…', startEs: 'Prefiero trabajar en equipo porque…',
    model: "I prefer to work in a team because we share ideas and solve problems faster. For example, in my last job we finished a big project early. Now I want to keep working with people who help each other.",
    modelEs: 'Prefiero trabajar en equipo porque compartimos ideas y resolvemos problemas más rápido. Por ejemplo, en mi último trabajo terminamos antes un proyecto grande. Ahora quiero seguir trabajando con gente que se ayuda.' },
  { id: 'rq-pressure', group: 'entrevista', frame: 'psb', q: 'How do you work under pressure?', es: '¿Cómo trabaja bajo presión?',
    start: 'When I work under pressure, I…', startEs: 'Cuando trabajo bajo presión, yo…',
    model: "When I work under pressure, I stay calm. Last month we had a difficult deadline with only two days. So I organized the tasks with my team, and in the end we delivered on time.",
    modelEs: 'Cuando trabajo bajo presión, mantengo la calma. El mes pasado tuvimos una fecha de entrega difícil, de solo dos días. Así que organicé las tareas con mi equipo y al final entregamos a tiempo.' },
  { id: 'rq-evening', group: 'vida', frame: 'w5', q: 'What do you usually do in the evening?', es: '¿Qué suele hacer en la noche?',
    start: 'In the evening, I usually…', startEs: 'En la noche, normalmente…',
    model: 'In the evening, I usually cook dinner at home with my family. After that, we watch a series, because it helps us relax after work.',
    modelEs: 'En la noche normalmente preparo la comida en casa con mi familia. Después vemos una serie, porque nos ayuda a relajarnos después del trabajo.' },
  { id: 'rq-lastweekend', group: 'vida', frame: 'w5', q: 'What did you do last weekend?', es: '¿Qué hizo el fin de semana pasado?',
    start: 'Last weekend, I…', startEs: 'El fin de semana pasado, yo…',
    model: "Last weekend, I visited my parents at their house. We cooked lunch together on Sunday, because I don't see them very often.",
    modelEs: 'El fin de semana pasado visité a mis papás en su casa. Cocinamos juntos el domingo, porque no los veo muy seguido.' },
  { id: 'rq-food', group: 'vida', frame: 'w5', q: "What's your favorite food?", es: '¿Cuál es su comida favorita?',
    start: 'My favorite food is…', startEs: 'Mi comida favorita es…',
    model: "My favorite food is my mom's chicken soup. She makes it at home every Sunday, and I love it because it reminds me of my childhood.",
    modelEs: 'Mi comida favorita es la sopa de pollo de mi mamá. La hace en casa todos los domingos, y me encanta porque me recuerda mi infancia.' },
  { id: 'rq-phones', group: 'opinion', frame: 'psb', q: 'Do people spend too much time on their phones?', es: '¿La gente pasa demasiado tiempo en el teléfono?',
    start: 'Yes, I think people spend too much time on their phones…', startEs: 'Sí, creo que la gente pasa demasiado tiempo en el teléfono…',
    model: "Yes, I think people spend too much time on their phones, and that is a problem for families. I think you should turn off notifications at dinner. That way, people talk more and feel better.",
    modelEs: 'Sí, creo que la gente pasa demasiado tiempo en el teléfono, y eso es un problema para las familias. Creo que se deberían apagar las notificaciones en la cena. Así la gente habla más y se siente mejor.' },
  { id: 'rq-study', group: 'opinion', frame: 'qyq', q: "What's the best way to learn a language?", es: '¿Cuál es la mejor forma de aprender un idioma?',
    start: 'I think the best way to learn a language is…', startEs: 'Creo que la mejor forma de aprender un idioma es…',
    model: "I think the best way to learn a language is to listen a lot and speak every day. It helps because you learn real phrases, not just rules. Next, I want to practice with more conversations.",
    modelEs: 'Creo que la mejor forma de aprender un idioma es escuchar mucho y hablar todos los días. Ayuda porque se aprenden frases reales, no solo reglas. Después quiero practicar con más conversaciones.' },
  { id: 'rq-money-happy', group: 'opinion', frame: 'qyq', q: 'Can money buy happiness?', es: '¿El dinero compra la felicidad?',
    start: "I don't think money can buy happiness, but…", startEs: 'No creo que el dinero compre la felicidad, pero…',
    model: "I don't think money can buy happiness, but it helps a lot. That is important because without money you worry all the time. In the future, I want a job that pays well and that I enjoy.",
    modelEs: 'No creo que el dinero compre la felicidad, pero ayuda mucho. Eso es importante porque sin dinero uno se preocupa todo el tiempo. En el futuro quiero un trabajo que pague bien y que me guste.' },
];
export const answerQuestionById = id => ANSWER_QUESTIONS.find(q => q.id === id);
// Una ronda: preguntas distintas del grupo, al azar.
export const answerSet = (group, rnd = Math.random) => T.shuffle(ANSWER_QUESTIONS.filter(q => q.group === group), rnd).slice(0, ANSWER_SIZE);

// Señales de cada parte de la estructura (revisión sin IA, aproximada). null = la parte 1 se cumple respondiendo.
// Van sobre el texto normalizado (contracciones abiertas: «that's» = «that is», «I'd like» = «i would like»).
const PART_KEYS = {
  qyq: [null,
    /\b(because|that is why|it helps|helps|matters|important|so i|which means|for example)\b/,
    /\b(now|next|in the future|want to|would like to|plan to|hope to|going to|from now on|next year)\b/],
  psb: [/\b(problem|issue|difficult|hard|challenge|stress|stressed|too much|too many|too long|was not|did not|could not|without)\b/,
    /\b(so i|so we|decided|what i did|if i could|i would|best way|you should|you can|i (created|made|started|talked|asked|changed|used|organized|make|do|try|write|wrote|take|took|build|built))\b/,
    /\b(as a result|result|thanks to|in the end|finally|that way|faster|better|improved|easier|cleaner|less|more|on time|calm)\b/],
  w5: [null,
    /\b(at|in the (morning|afternoon|evening)|every|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekends?)|around|oclock|yesterday|last|near|home|office|house|park|gym|by (bus|car|bike|train))\b/,
    /\b(because|so that|so i|since|that is why|in order to|it helps|to relax)\b/],
};

// Revisa la respuesta dicha o escrita, sin IA: ¿empezó con las palabras de la pregunta?, ¿tiene las 3 partes?,
// ¿es corta y clara? Devuelve también un consejo para la próxima.
export function answerCheck(item, said) {
  const text = normalize(said);
  const ws = text ? text.split(' ') : [];
  const startWords = normalize(String(item.start).replace(/…/g, ' ')).split(' ')
    .filter(w => w.length > 2 && !/^(the|and|you|sure|yes|let|tell|do)$/.test(w));
  const stole = startWords.length ? startWords.filter(w => ws.includes(w)).length / startWords.length >= 0.6 : true;
  const keys = PART_KEYS[item.frame] || PART_KEYS.qyq;
  const parts = keys.map((re, i) => (i === 0 && !re ? ws.length >= 4 : re.test(text)));
  const short = ws.length >= 8 && ws.length <= 70;
  const fillers = (String(said || '').match(/\b(um+|uh+|uhm+|er+m?|ah+|hmm+|you know|i mean)\b/gi) || []).length;
  const ok = [stole, ...parts, short].filter(Boolean).length;
  const frame = FRAMES[item.frame] || FRAMES.qyq;
  const miss = parts.findIndex(p => !p);
  const tip = !ws.length ? 'No se escuchó nada: dígala otra vez.'
    : !stole ? `Empiece con las palabras de la pregunta: «${item.start}»`
    : miss >= 0 ? `Le faltó «${frame.parts[miss].es}». Pruebe con «${frame.parts[miss].chunks[0][0]}»`
    : ws.length < 8 ? 'Muy corta: agregue por qué, con «because…».'
    : ws.length > 70 ? 'Se alargó: diga lo mismo en 3 frases cortas.'
    : '¡Así se responde! Dígala otra vez, un poco más rápido.';
  return { stole, parts, short, words: ws.length, fillers, score: ok / 5, tip };
}

// Robar palabras de la pregunta (para la charla): convierte la última pregunta del personaje en el comienzo de
// una respuesta. «What do you usually do after work?» → «After work, I usually…». null si no sabe.
const cap = t => (t ? t[0].toUpperCase() + t.slice(1) : t);
function swapPerson(t) {
  return String(t || '').replace(/\b(yourself|yours|your|you're|you|me|my|myself|us|our)\b/gi, (w, _, i, all) => {
    const k = w.toLowerCase();
    if (k === 'you') return /\b(to|for|with|call|tell|help|ask|give|about|at|see|meet|like|love|than)\s+$/i.test(all.slice(0, i)) ? 'me' : 'I';
    return { yourself: 'myself', yours: 'mine', your: 'my', "you're": "I'm", me: 'you', my: 'your', myself: 'yourself', us: 'you', our: 'your' }[k];
  }).trim();
}
export function stealStart(text) {
  const t = String(text || '');
  const tell = t.match(/\btell me (?:a (?:little )?bit |a little |more )?about ([^.!?]+)/i);
  const qs = t.match(/[^.!?]*\?/g);
  if (!qs) return tell ? `Sure. Let me tell you about ${swapPerson(tell[1])}.` : null;
  let q = qs[qs.length - 1].replace(/\?$/, '').trim().replace(/^(?:and|so|well|oh|ok|okay|great|nice|sure)\b[,!]?\s*/i, '');
  // «And how about you, what do you…» / «Anna, how was…»: la pregunta de verdad va después de la coma.
  const tail = q.match(/,\s*((?:what|how|why|where|when|do|did|are|have|would|can|could|is)\b.*)$/i);
  if (tail) q = tail[1];
  const R = [
    [/^(?:can|could) you tell me (?:a (?:little )?bit |a little |more )?about (.+)$/i, m => `Sure. Let me tell you about ${swapPerson(m[1])}.`],
    [/^what do you think (?:about|of) (.+)$/i, m => `I think ${swapPerson(m[1])} is…`],
    [/^what do you like (?:most |best )?about (.+)$/i, m => `What I like about ${swapPerson(m[1])} is…`],
    [/^what (do|did) you (usually |normally |often |like to |want to )?do\b\s*(.*)$/i, m => {
      const adv = (m[2] || '').trim(), rest = swapPerson(m[3]);
      if (!rest) return m[1].toLowerCase() === 'did' ? 'I…' : (adv ? `I ${adv}…` : 'I work as… / I usually…');
      return `${cap(rest)}, I${adv ? ' ' + adv : ''}…`;
    }],
    [/^what would you like(?: to (\w+))?\b.*$/i, m => (m[1] ? `I'd like to ${m[1]}…` : "I'd like…")],
    [/^what do you (usually |normally |often |really )?(\w+)\b\s*(.*)$/i, m => `I ${m[1] || ''}${m[2]}…${m[3] ? ' ' + swapPerson(m[3]) : ''}`],
    [/^what(?:'s| is) your (.+)$/i, m => `My ${swapPerson(m[1])} is…`],
    [/^how (was|is) your (.+)$/i, m => `My ${swapPerson(m[2])} ${m[1].toLowerCase()}…`],
    [/^why do you want (.+)$/i, m => `I want ${swapPerson(m[1])} because…`],
    [/^why did you (.+)$/i, m => `I decided to ${swapPerson(m[1])} because…`],
    [/^how long have you (.+)$/i, m => `I've ${swapPerson(m[1])} for…`],
    [/^where are you from$/i, () => "I'm from…"],
    [/^would you like (.+)$/i, m => `Yes, I'd like ${swapPerson(m[1])}… / No, thanks.`],
    [/^have you ever (.+)$/i, m => `Yes, I've ${swapPerson(m[1])}… / No, I've never ${swapPerson(m[1])}.`],
    [/^do you (.+)$/i, m => `Yes, I ${swapPerson(m[1]).replace(/\bany\b/i, 'some')}… / No, I don't.`],
    [/^did you (.+)$/i, () => "Yes, I did… / No, I didn't…"],
    [/^are you (.+)$/i, m => `Yes, I'm ${swapPerson(m[1])}… / No, I'm not.`],
  ];
  for (const [re, f] of R) { const m = q.match(re); if (m) return cap(f(m)); }
  return tell ? `Sure. Let me tell you about ${swapPerson(tell[1])}.` : null;
}
