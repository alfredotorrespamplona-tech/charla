// Contenido de la app: niveles, dificultades, lugares, personajes y misiones.
// Todo es original. Puede agregar lugares/personajes/misiones copiando la forma de los existentes.

// Una sola escalera de 6 niveles (como en el APK: "Dificultad N/6"). Cada nivel sube a la vez el lenguaje del
// personaje (largo de respuestas, vocabulario y gramática, también en las sugerencias), la velocidad de la voz
// y retrasa la ayuda. Los textos y los números son diseño propio.
export const RANKS = [
  { id: 1, code: 'A1', name: 'Principiante', scoreModifier: 1.0,
    about: 'Respuestas muy cortas con las palabras y la gramática más básicas. Voz muy lenta y ayuda inmediata.',
    prompt: 'CEFR A1. Replies VERY short: one sentence (two at most), max 8 words each. Only the most common words, present tense, one idea per sentence.',
    defaults: { speed: 'verySlow', response: 'word', suggestions: 1, translation: 'always', feedback: 'relaxed', pronunciation: 'auto' } },
  { id: 2, code: 'A2', name: 'Básico', scoreModifier: 1.2,
    about: 'Respuestas cortas con palabras y gramática básicas. Voz lenta; las sugerencias tardan un poco más.',
    prompt: 'CEFR A2. Replies short: 1–2 simple sentences, max 12 words each. Basic everyday vocabulary, simple past and future, no idioms.',
    defaults: { speed: 'slow', response: 'word', suggestions: 2, translation: 'always', feedback: 'relaxed', pronunciation: 'auto' } },
  { id: 3, code: 'B1', name: 'Intermedio', scoreModifier: 1.4,
    about: 'Respuestas de largo medio con vocabulario intermedio. Primero escucha y después lee la respuesta.',
    prompt: 'CEFR B1. Replies of medium length: 2–3 sentences. Natural everyday English with intermediate vocabulary and grammar; common phrasal verbs are fine.',
    defaults: { speed: 'medium', response: 'after', suggestions: 2, translation: 'words', feedback: 'balanced', pronunciation: 'request' } },
  { id: 4, code: 'B2', name: 'Intermedio alto', scoreModifier: 1.6,
    about: 'Respuestas de largo medio con vocabulario intermedio alto. La respuesta escrita y las sugerencias aparecen más tarde.',
    prompt: 'CEFR B2. Replies of medium length: 2–3 sentences. Upper-intermediate vocabulary and grammar, idioms and phrasal verbs, some complex sentences.',
    defaults: { speed: 'fast', response: 'after1', suggestions: 3, translation: 'words', feedback: 'balanced', pronunciation: 'request' } },
  { id: 5, code: 'C1', name: 'Avanzado', scoreModifier: 1.8,
    about: 'Respuestas que pueden ser largas, con gramática y vocabulario avanzados. Sugerencias solo si las pide.',
    prompt: 'CEFR C1. Replies can be long (up to 4 sentences). Advanced vocabulary and grammar, idioms, humor and nuance, like a native in casual conversation.',
    defaults: { speed: 'fast', response: 'after2', suggestions: 0, translation: 'request', feedback: 'strict', pronunciation: 'request' } },
  { id: 6, code: 'C2', name: 'Experto', scoreModifier: 2.1,
    about: 'Respuestas que pueden ser muy largas, con el inglés más avanzado. Voz muy rápida.',
    prompt: 'CEFR C2. Replies can be very long (up to 5 sentences). The most advanced, fully native and idiomatic English, cultural references and natural slang.',
    defaults: { speed: 'veryFast', response: 'after2', suggestions: 0, translation: 'request', feedback: 'strict', pronunciation: 'request' } },
];

// Lo que puede hacer al dominar cada nivel (pantalla «Contenido por nivel»). Texto propio.
const CAN_DO = {
  1: ['Presentarse y decir de dónde es y a qué se dedica', 'Pedir algo en un café, una tienda o un hotel', 'Entender preguntas sencillas si le hablan despacio'],
  2: ['Contar lo que hizo ayer y lo que va a hacer', 'Hablar de su familia, su trabajo y sus gustos', 'Resolver lo básico de un viaje: transporte, compras y direcciones'],
  3: ['Dar su opinión y explicar por qué', 'Contar una experiencia con detalles', 'Resolver problemas comunes: un reclamo, un cambio de planes, una cita'],
  4: ['Debatir con respeto y defender una idea', 'Hablar de hipótesis: qué pasaría si…', 'Participar en reuniones y conversaciones de trabajo'],
  5: ['Matizar lo que dice y suavizar un desacuerdo', 'Usar conectores y expresiones idiomáticas con naturalidad', 'Negociar y contar historias largas con detalle'],
  6: ['Entender ironía, humor y dobles sentidos', 'Pasar con soltura del registro formal al informal', 'Convencer y debatir casi como un hablante nativo'],
};
for (const r of RANKS) r.canDo = CAN_DO[r.id];

// Autoevaluación inicial (4 opciones, como en el APK). Es solo un punto de partida: la primera charla lo ajusta.
export const SELF_ASSESSMENT = [
  { key: 'Beginner', label: 'Casi no sé nada', rank: 1 },
  { key: 'Basic', label: 'Sé lo básico', rank: 2 },
  { key: 'Intermediate', label: 'Puedo tener una conversación', rank: 3 },
  { key: 'Advanced', label: 'Hablo casi con fluidez', rank: 4 },
];

// Ajustes que cada nivel trae por defecto y que se pueden personalizar. Ordenados de más fácil a más difícil:
// elegir una opción más difícil que la del nivel suma puntos; una más fácil, resta.
export const SETTING_OPTIONS = {
  speed: { label: 'Velocidad de la voz', options: [
    { key: 'verySlow', label: 'Muy lenta', rate: 0.72 }, { key: 'slow', label: 'Lenta', rate: 0.85 },
    { key: 'medium', label: 'Normal', rate: 0.95 }, { key: 'fast', label: 'Rápida', rate: 1.08 }, { key: 'veryFast', label: 'Muy rápida', rate: 1.2 }] },
  response: { label: 'Texto de la respuesta', options: [
    { key: 'word', label: 'Palabra por palabra, mientras habla' }, { key: 'after', label: 'Al terminar de hablar' },
    { key: 'after1', label: '1 segundo después' }, { key: 'after2', label: '2 segundos después' }, { key: 'hidden', label: 'Oculto (toque para verlo)' }] },
  suggestions: { label: 'Sugerencias', options: [
    { key: 1, label: 'Después de 1 segundo' }, { key: 2, label: 'Después de 2 segundos' }, { key: 3, label: 'Después de 3 segundos' },
    { key: 4, label: 'Después de 4 segundos' }, { key: 0, label: 'Solo si las pide (💡)' }] },
  translation: { label: 'Traducciones', options: [
    { key: 'always', label: 'Siempre, automáticas' }, { key: 'words', label: 'Automáticas solo en palabras' }, { key: 'request', label: 'Solo si las pide' }] },
  pronunciation: { label: 'Pistas de pronunciación', options: [
    { key: 'auto', label: 'Automáticas' }, { key: 'request', label: 'Solo si las pide (🗣️)' }, { key: 'off', label: 'Apagadas' }] },
  feedback: { label: 'Corrección', options: [
    { key: 'off', label: 'Apagada' }, { key: 'relaxed', label: 'Suave' }, { key: 'balanced', label: 'Equilibrada' }, { key: 'strict', label: 'Estricta' }] },
};
export const SETTING_STEP_BONUS = 0.05; // por cada paso más difícil (o más fácil) que lo que trae el nivel

// Ajustes en uso: los del nivel, cambiados por lo que el usuario personalizó.
export function levelSettings(rankId, custom = {}) {
  const rank = rankById(rankId);
  const out = { rank, scoreModifier: rank.scoreModifier };
  let steps = 0;
  for (const [k, def] of Object.entries(SETTING_OPTIONS)) {
    const want = custom[k] ?? rank.defaults[k];
    const i = def.options.findIndex(o => o.key === want);
    const j = def.options.findIndex(o => o.key === rank.defaults[k]);
    const opt = def.options[i >= 0 ? i : j];
    out[k] = opt.key;
    if (i >= 0 && k !== 'feedback') steps += i - j;   // la corrección no cambia lo difícil de la charla
  }
  out.rate = SETTING_OPTIONS.speed.options.find(o => o.key === out.speed).rate;
  out.suggestionMs = out.suggestions * 1000;
  out.strictness = { off: 'Off', relaxed: 'Relaxed', balanced: 'Balanced', strict: 'Strict' }[out.feedback];
  out.scoreModifier = Math.max(0.5, +(rank.scoreModifier + steps * SETTING_STEP_BONUS).toFixed(2));
  return out;
}

// Para subir: juntar estrellas en el nivel más alto desbloqueado; solo cuentan las charlas de 2 o más estrellas.
export const STARS_TO_UNLOCK_NEXT_LEVEL = 6;
export const MIN_STARS_TO_COUNT = 2;

// La relación también baja: con cariño negativo el personaje pasa a Enemigo y luego a Némesis.
export const AFFECTION_PER_LEVEL = 10;
export const AFFECTION_MIN = -30;    // nivel -3
export const RELATIONSHIP_STATUS = [
  { min: -99, key: 'Nemesis', label: 'Némesis' },
  { min: -2, key: 'Enemy', label: 'Enemigo' },
  { min: 0, key: 'Stranger', label: 'Desconocido' },
  { min: 1, key: 'Acquaintance', label: 'Conocido' },
  { min: 3, key: 'Friend', label: 'Amigo' },
  { min: 6, key: 'BestFriend', label: 'Mejor amigo' },
];

// look: colores del avatar dibujado por código. images: ruta opcional a sus PNG de ChatGPT
// (avatars/<id>/neutral.png, talk.png, blink.png). Si existen, se usan en vez del dibujo.
export const CHARACTERS = {
  maya: { id: 'maya', title: 'barista', name: 'Maya', age: 27, sex: 'female', profession: 'barista', hometown: 'Portland, Oregon', interests: ['latte art', 'indie music', 'hiking'], personality: 'Energetic', style: 'Encouraging', voice: { pitch: 1.1, gender: 'female' }, look: { skin: '#e0ac69', hair: '#3b2219', hairStyle: 'long', shirt: '#2f7d6d', bg: '#f6d8b8' } },
  tom: { id: 'tom', title: 'profesor jubilado, cliente habitual', name: 'Tom', age: 58, sex: 'male', profession: 'retired teacher who comes to the café every morning', hometown: 'Boston', interests: ['crosswords', 'baseball', 'history'], personality: 'Calm', style: 'Thoughtful', voice: { pitch: 0.9, gender: 'male' }, look: { skin: '#f1c27d', hair: '#bdbdbd', hairStyle: 'short', shirt: '#7a4b2a', bg: '#e8d6c3' } },
  priya: { id: 'priya', title: 'agente de check-in', name: 'Priya', age: 34, sex: 'female', profession: 'check-in agent at the airport', hometown: 'London', interests: ['travel', 'cooking', 'podcasts'], personality: 'Confident', style: 'Inquisitive', voice: { pitch: 1.05, gender: 'female' }, look: { skin: '#a5754a', hair: '#1a1110', hairStyle: 'bun', shirt: '#1f4e8c', bg: '#cfe0f5' } },
  jack: { id: 'jack', title: 'piloto', name: 'Jack', age: 41, sex: 'male', profession: 'pilot waiting for his next flight', hometown: 'Sydney', interests: ['surfing', 'aviation', 'coffee'], personality: 'Playful', style: 'Witty', voice: { pitch: 1.0, gender: 'male' }, look: { skin: '#e8b98e', hair: '#c58b3a', hairStyle: 'short', shirt: '#22314d', bg: '#d6e4f0' } },
  sofia: { id: 'sofia', title: 'recepcionista', name: 'Sofia', age: 30, sex: 'female', profession: 'hotel receptionist', hometown: 'Miami', interests: ['salsa dancing', 'movies', 'the beach'], personality: 'Energetic', style: 'Expressive', voice: { pitch: 1.15, gender: 'female' }, look: { skin: '#c68642', hair: '#2a1a12', hairStyle: 'long', shirt: '#8c1f3f', bg: '#f3d1dc' } },
  david: { id: 'david', title: 'viajero de negocios', name: 'David', age: 45, sex: 'male', profession: 'business traveler staying at the hotel', hometown: 'Chicago', interests: ['jazz', 'running', 'economics'], personality: 'Serious', style: 'Blunt', voice: { pitch: 0.85, gender: 'male' }, look: { skin: '#8d5524', hair: '#111111', hairStyle: 'bald', shirt: '#33415c', bg: '#d9dde6' } },
  emma: { id: 'emma', title: 'gerente de proyectos', name: 'Emma', age: 29, sex: 'female', profession: 'project manager at a tech startup', hometown: 'Seattle', interests: ['board games', 'yoga', 'sci-fi books'], personality: 'Confident', style: 'Inquisitive', voice: { pitch: 1.0, gender: 'female' }, look: { skin: '#ffdbac', hair: '#a0522d', hairStyle: 'bob', shirt: '#4b3f72', bg: '#e2dcf2' } },
  carlos: { id: 'carlos', title: 'ingeniero de software, tu compañero', name: 'Carlos', age: 36, sex: 'male', profession: 'software engineer, your new coworker', hometown: 'Austin, Texas', interests: ['barbecue', 'video games', 'guitar'], personality: 'Calm', style: 'Encouraging', voice: { pitch: 0.95, gender: 'male' }, look: { skin: '#d1a37a', hair: '#2b1d14', hairStyle: 'short', shirt: '#2e6b3f', bg: '#d7ead9' } },
  rose: { id: 'rose', title: 'enfermera jubilada', name: 'Rose', age: 67, sex: 'female', profession: 'retired nurse who walks her dog in the park', hometown: 'Dublin', interests: ['gardening', 'her dog Biscuit', 'mystery novels'], personality: 'Calm', style: 'Thoughtful', voice: { pitch: 1.0, gender: 'female' }, look: { skin: '#f5d0b0', hair: '#e6e6e6', hairStyle: 'bob', shirt: '#6c8e3a', bg: '#e1efd2' } },
  leo: { id: 'leo', title: 'estudiante y músico callejero', name: 'Leo', age: 22, sex: 'male', profession: 'college student and street musician', hometown: 'New York', interests: ['skateboarding', 'hip hop', 'photography'], personality: 'Playful', style: 'Contrarian', voice: { pitch: 1.05, gender: 'male' }, look: { skin: '#6b4226', hair: '#0d0d0d', hairStyle: 'curly', shirt: '#c45a1c', bg: '#f5ddc6' } },
  nina: { id: 'nina', title: 'mesera', name: 'Nina', age: 39, sex: 'female', profession: 'waitress at a diner', hometown: 'Nashville', interests: ['country music', 'her kids', 'baking'], personality: 'Energetic', style: 'Witty', voice: { pitch: 1.1, gender: 'female' }, look: { skin: '#f0c8a0', hair: '#d4a017', hairStyle: 'long', shirt: '#2a6f97', bg: '#f7e7b4' } },
  sam: { id: 'sam', title: 'médico familiar', name: 'Sam', age: 50, sex: 'male', profession: 'family doctor', hometown: 'Toronto', interests: ['cycling', 'chess', 'healthy cooking'], personality: 'Cautious', style: 'Reserved', voice: { pitch: 0.9, gender: 'male' }, look: { skin: '#c99e74', hair: '#5a4632', hairStyle: 'short', shirt: '#f2f2f2', bg: '#d8eef0' } },
  dan: { id: 'dan', title: 'policía de tránsito', name: 'Dan', age: 48, sex: 'male', profession: 'police officer patrolling downtown', hometown: 'Philadelphia', interests: ['fishing', 'football', 'his grandkids'], personality: 'Calm', style: 'Reserved', voice: { pitch: 0.85, gender: 'male' }, look: { skin: '#c68e5a', hair: '#3a3a3a', hairStyle: 'short', shirt: '#1d2f5a', bg: '#d9e1ee' } },
  kim: { id: 'kim', title: 'dueña de un food truck', name: 'Kim', age: 31, sex: 'female', profession: 'owner of a Korean taco food truck', hometown: 'Los Angeles', interests: ['street food', 'K-dramas', 'running'], personality: 'Energetic', style: 'Witty', voice: { pitch: 1.12, gender: 'female' }, look: { skin: '#f1d0b0', hair: '#141414', hairStyle: 'bob', shirt: '#d1495b', bg: '#f8e1c4' } },
  olivia: { id: 'olivia', title: 'vendedora de ropa', name: 'Olivia', age: 25, sex: 'female', profession: 'sales assistant at a clothing store', hometown: 'San Diego', interests: ['fashion', 'thrifting', 'Instagram'], personality: 'Playful', style: 'Expressive', voice: { pitch: 1.15, gender: 'female' }, look: { skin: '#e8c4a0', hair: '#e2b45a', hairStyle: 'long', shirt: '#e07a9b', bg: '#f6dce6' } },
  marcus: { id: 'marcus', title: 'entrenador personal', name: 'Marcus', age: 33, sex: 'male', profession: 'personal trainer at the gym', hometown: 'Atlanta', interests: ['basketball', 'meal prep', 'motivational podcasts'], personality: 'Energetic', style: 'Encouraging', voice: { pitch: 0.95, gender: 'male' }, look: { skin: '#5c3a21', hair: '#0f0f0f', hairStyle: 'short', shirt: '#f2a541', bg: '#fbe6c5' } },
  grace: { id: 'grace', title: 'gerente de recursos humanos', name: 'Grace', age: 44, sex: 'female', profession: 'HR manager interviewing candidates', hometown: 'Denver', interests: ['marathons', 'leadership books', 'gardening'], personality: 'Serious', style: 'Inquisitive', voice: { pitch: 1.0, gender: 'female' }, look: { skin: '#d9a77c', hair: '#4a2c1a', hairStyle: 'bun', shirt: '#2b3a55', bg: '#dfe3ea' } },
  ben: { id: 'ben', title: 'anfitrión de la fiesta', name: 'Ben', age: 29, sex: 'male', profession: 'graphic designer hosting a house party', hometown: 'Brooklyn', interests: ['vinyl records', 'cooking', 'indie movies'], personality: 'Playful', style: 'Witty', voice: { pitch: 1.0, gender: 'male' }, look: { skin: '#f0c9a4', hair: '#8b5a2b', hairStyle: 'curly', shirt: '#3c7a89', bg: '#e9dcf0' } },
  lucy: { id: 'lucy', title: 'ilustradora, amiga de Ben', name: 'Lucy', age: 26, sex: 'female', profession: 'illustrator and friend of the host', hometown: 'Vancouver', interests: ['drawing', 'anime', 'cats', 'travel to Japan'], personality: 'Calm', style: 'Thoughtful', voice: { pitch: 1.08, gender: 'female' }, look: { skin: '#f6d5c2', hair: '#b5323c', hairStyle: 'long', shirt: '#2e2e2e', bg: '#f1e0ea' } },
};

import { FACETS, NEW_CHARACTERS, NEW_TTS, NEW_PLACES } from './lessons.js';
import { ROADMAP_CHARACTERS, ROADMAP_TTS, ROADMAP_PLACES } from './topics.js';

// Personajes nuevos de js/lessons.js (todavía sin imagen: usan el avatar dibujado).
Object.assign(CHARACTERS, NEW_CHARACTERS, ROADMAP_CHARACTERS);

// Personajes con imágenes propias en avatars/<id>/ (neutral, talk, blink, happy .webp).
// Al crear un avatar nuevo con herramientas/componer_avatar.py, agregue aquí su id.
export const WITH_IMAGES = ['maya', 'tom', 'priya', 'jack', 'sofia', 'david', 'emma', 'carlos', 'rose', 'leo', 'nina', 'sam', 'dan', 'kim', 'olivia', 'marcus', 'grace', 'ben', 'lucy',
  'joe', 'ana', 'helen', 'omar', 'linda', 'victor', 'paul', 'mei', 'chloe', 'tony'];
for (const id of WITH_IMAGES) {
  if (CHARACTERS[id]) CHARACTERS[id].images = { ext: 'webp', frames: ['neutral', 'talk', 'blink', 'happy'] };
}

// Cada misión: objetivos (lo que el personaje evalúa), frases útiles y "facetas" por nivel.
const FREE_TALK = { id: 'free', icon: '💬', name: 'Charla libre', description: 'Hablen de lo que quieran.', instruction: 'Have a natural friendly small-talk conversation. Ask about the learner and share things about yourself.', objectives: [], expressions: ['How about you?', 'That sounds great!', 'What do you mean?'], facets: {} };

export const PLACES = [
  {
    id: 'cafe', name: 'Cafetería', emoji: '☕', rankRequired: 1,
    scene: 'A cozy neighborhood coffee shop in the morning, smell of coffee, soft music.',
    gradient: ['#f3e0c7', '#c99a6b'],
    characters: ['maya', 'tom'],
    missions: [
      { id: 'cafe_order', icon: '🥐', name: 'Pide tu desayuno', description: 'Ordena una bebida y algo de comer, y paga.', instruction: 'You work here or are next to the counter. Help the learner order breakfast.', objectives: [{ id: 'drink', text: 'Order a drink' }, { id: 'food', text: 'Order something to eat' }, { id: 'pay', text: 'Ask the price or pay' }], expressions: ["I'd like a…", 'Can I get…?', 'How much is it?', 'For here or to go?'], facets: { beginner: 'Keep the menu simple: coffee, tea, juice, croissant, muffin.', intermediate: 'Offer options: milk type, size, warm it up.', advanced: 'Recommend seasonal specials, chat about preferences.' } },
      { id: 'cafe_meet', icon: '🙋', name: 'Conoce a alguien', description: 'Preséntate y averigua 2 cosas de la otra persona.', instruction: 'You are a regular at the café. Start chatting with the learner who sits near you.', objectives: [{ id: 'intro', text: 'Introduce yourself' }, { id: 'ask1', text: 'Learn one thing about the character' }, { id: 'ask2', text: 'Learn a second thing about the character' }], expressions: ["Nice to meet you.", 'What do you do?', 'Are you from around here?'], facets: {} },
      { id: 'cafe_complain', icon: '😕', name: 'Hubo un error', description: 'Te sirvieron mal tu pedido. Resuélvelo con amabilidad.', instruction: 'You served the learner the wrong order by mistake. Let the learner explain the problem politely, then fix it.', objectives: [{ id: 'explain', text: 'Explain the problem' }, { id: 'solution', text: 'Agree on a solution' }], expressions: ['Excuse me, I think there is a mistake.', 'I ordered…', 'No worries.'], facets: {} },
      { id: 'cafe_work', icon: '💻', name: 'Trabajar en el café', description: 'Pregunta por el wifi, un enchufe y una mesa tranquila.', instruction: 'The learner wants to work on their laptop here. Help them (wifi, outlets, quiet table, refills).', objectives: [{ id: 'wifi', text: 'Ask about the wifi' }, { id: 'outlet', text: 'Ask for an outlet or a quiet table' }, { id: 'refill', text: 'Ask about refills or how long you can stay' }], expressions: ['Is there wifi here?', 'Is there an outlet near…?', 'Do you mind if I stay a while?'], facets: {} },
      { id: 'cafe_dessert', icon: '🍰', name: 'Pide una recomendación', description: 'No sabes qué postre elegir. Pide consejo y decide.', instruction: "Recommend desserts and describe their taste. Ask about the learner's preferences.", objectives: [{ id: 'ask', text: 'Ask for a recommendation' }, { id: 'pref', text: 'Say what you like or dislike' }, { id: 'choose', text: 'Choose something' }], expressions: ['What do you recommend?', 'Is it very sweet?', "I'll go with…"], facets: { beginner: 'Use simple adjectives: sweet, big, chocolate, cold.' } },
    ],
  },
  {
    id: 'airport', name: 'Aeropuerto', emoji: '✈️', rankRequired: 1,
    scene: 'A busy international airport terminal, announcements in the background.',
    gradient: ['#d6e8fb', '#7ea6d8'],
    characters: ['priya', 'jack'],
    missions: [
      { id: 'air_checkin', icon: '🧳', name: 'Haz el check-in', description: 'Entrega tu pasaporte, documenta tu maleta y elige asiento.', instruction: 'You are the check-in agent (or help the learner through check-in if you are not).', objectives: [{ id: 'passport', text: 'Show passport / give destination' }, { id: 'bag', text: 'Check a bag' }, { id: 'seat', text: 'Choose a seat' }], expressions: ['Here is my passport.', "I'd like a window seat.", 'Is my flight on time?'], facets: {} },
      { id: 'air_delay', icon: '⏰', name: 'Vuelo retrasado', description: 'Tu vuelo se retrasó. Averigua cuánto y qué opciones tienes.', instruction: "The learner's flight is delayed by three hours. Help them understand what is happening and their options.", objectives: [{ id: 'howlong', text: 'Find out how long the delay is' }, { id: 'option', text: 'Ask about options (food voucher, other flight…)' }], expressions: ['How long is the delay?', 'Is there another flight?', 'What can I do?'], facets: {} },
      { id: 'air_smalltalk', icon: '🌍', name: 'Charla de viaje', description: 'Habla de tus viajes con alguien en la sala de espera.', instruction: 'You are both waiting at the gate. Chat about travel.', objectives: [{ id: 'where', text: 'Say where you are going and why' }, { id: 'favorite', text: 'Talk about a favorite trip' }], expressions: ["I'm going to…", 'Have you ever been to…?', 'It was amazing.'], facets: {} },
      { id: 'air_lost', icon: '🧳', name: 'Maleta perdida', description: 'Tu maleta no llegó. Descríbela y deja tus datos.', instruction: "The learner's suitcase did not arrive. You work at the lost-baggage desk: ask for details.", objectives: [{ id: 'describe', text: 'Describe the suitcase (color, size)' }, { id: 'contents', text: 'Say what is inside' }, { id: 'contact', text: 'Give an address or phone to deliver it' }], expressions: ["My suitcase didn't arrive.", "It's a large black…", 'Can you send it to my hotel?'], facets: {} },
      { id: 'air_immigration', icon: '🛂', name: 'Migración', description: 'Responde las preguntas del oficial de migración.', instruction: 'Act as an immigration officer (play the role even if it is not your usual job). Ask the typical questions: purpose, length of stay, where staying.', objectives: [{ id: 'purpose', text: 'Say the purpose of the trip' }, { id: 'length', text: 'Say how long you will stay' }, { id: 'where', text: 'Say where you will stay' }], expressions: ["I'm here on vacation.", "I'm staying for two weeks.", "I'm staying at…"], facets: {} },
    ],
  },
  {
    id: 'hotel', name: 'Hotel', emoji: '🏨', rankRequired: 2,
    scene: 'The elegant lobby of a mid-size city hotel.',
    gradient: ['#f6dbe4', '#b97a93'],
    characters: ['sofia', 'david'],
    missions: [
      { id: 'hotel_checkin', icon: '🔑', name: 'Registro en el hotel', description: 'Haz el check-in y pregunta por el desayuno y el wifi.', instruction: 'Help the learner check in to their room.', objectives: [{ id: 'reservation', text: 'Give name / reservation' }, { id: 'breakfast', text: 'Ask about breakfast' }, { id: 'wifi', text: 'Ask about the wifi' }], expressions: ['I have a reservation under…', 'What time is breakfast?', "What's the wifi password?"], facets: {} },
      { id: 'hotel_problem', icon: '🚿', name: 'Problema en la habitación', description: 'Algo no funciona en tu cuarto. Pide ayuda.', instruction: "Something is broken in the learner's room (they decide what). Handle the complaint.", objectives: [{ id: 'describe', text: 'Describe the problem' }, { id: 'fix', text: 'Get a solution or a new room' }], expressions: ["The … doesn't work.", 'Could you send someone?', 'Can I change rooms?'], facets: {} },
      { id: 'hotel_tips', icon: '🗺️', name: 'Pide recomendaciones', description: 'Pregunta qué visitar y cómo llegar.', instruction: 'Recommend places to visit in the city and explain how to get there.', objectives: [{ id: 'place', text: 'Get a recommendation' }, { id: 'directions', text: 'Ask how to get there' }], expressions: ['What do you recommend?', 'How do I get there?', 'Is it far?'], facets: {} },
      { id: 'hotel_checkout', icon: '🚕', name: 'Salida y taxi', description: 'Pide salir más tarde, revisa la cuenta y pide un taxi.', instruction: 'The learner is checking out. They may ask for late checkout and a taxi.', objectives: [{ id: 'late', text: 'Ask for a late checkout' }, { id: 'bill', text: 'Check the bill' }, { id: 'taxi', text: 'Ask for a taxi' }], expressions: ['Could I check out a bit later?', 'What is this charge?', 'Could you call me a taxi?'], facets: {} },
    ],
  },
  {
    id: 'office', name: 'Oficina', emoji: '💼', rankRequired: 3,
    scene: 'A modern open-plan office at a tech company.',
    gradient: ['#e4e0f5', '#8a7fc0'],
    characters: ['emma', 'carlos'],
    missions: [
      { id: 'office_first', icon: '👋', name: 'Primer día', description: 'Es tu primer día. Preséntate y pregunta cómo funciona todo.', instruction: "It is the learner's first day on your team. Welcome them.", objectives: [{ id: 'role', text: 'Explain your role' }, { id: 'question', text: 'Ask a question about the team or tools' }], expressions: ["I'm the new…", 'Who should I ask about…?', 'How does … work here?'], facets: {} },
      { id: 'office_meeting', icon: '📅', name: 'Agenda una reunión', description: 'Pónganse de acuerdo en día, hora y tema.', instruction: 'You need to schedule a meeting with the learner. Be a bit busy so they must negotiate.', objectives: [{ id: 'day', text: 'Agree on a day' }, { id: 'time', text: 'Agree on a time' }, { id: 'topic', text: 'Say what the meeting is about' }], expressions: ['Are you free on…?', 'How about…?', "That works for me."], facets: {} },
      { id: 'office_opinion', icon: '💡', name: 'Da tu opinión', description: 'Comenta una idea nueva del proyecto y defiende tu postura.', instruction: 'Propose an idea for the project and ask the learner what they think. Push back a little.', objectives: [{ id: 'opinion', text: 'Give your opinion' }, { id: 'reason', text: 'Explain why' }], expressions: ['In my opinion…', 'I see your point, but…', 'What if we…?'], facets: {} },
      { id: 'office_tech', icon: '🖥️', name: 'Problema técnico', description: 'Tu computador falla antes de una reunión. Pide ayuda.', instruction: "The learner's laptop has a problem just before a meeting. Ask questions to understand and help.", objectives: [{ id: 'problem', text: 'Explain the problem' }, { id: 'tried', text: 'Say what you already tried' }, { id: 'thanks', text: 'Thank them / agree on next step' }], expressions: ["My laptop won't turn on.", "I've already tried…", 'Could you take a look?'], facets: {} },
    ],
  },
  {
    id: 'park', name: 'Parque', emoji: '🌳', rankRequired: 1,
    scene: 'A sunny city park with joggers, dogs and a small lake.',
    gradient: ['#dff0d0', '#7fb069'],
    characters: ['rose', 'leo'],
    missions: [
      { id: 'park_weekend', icon: '🎒', name: 'Planes de fin de semana', description: 'Cuenta qué hiciste y qué vas a hacer el fin de semana.', instruction: 'Chat about weekend plans and what you did last weekend.', objectives: [{ id: 'past', text: 'Say what you did last weekend' }, { id: 'future', text: 'Say what you will do next weekend' }], expressions: ['Last weekend I…', "I'm going to…", 'Sounds fun!'], facets: {} },
      { id: 'park_hobby', icon: '🎸', name: 'Hobbies', description: 'Hablen de sus pasatiempos.', instruction: 'Talk about hobbies. Share yours with enthusiasm.', objectives: [{ id: 'mine', text: 'Describe one of your hobbies' }, { id: 'theirs', text: "Ask about the character's hobby" }], expressions: ['In my free time I…', 'How long have you been…?', "I've always wanted to try…"], facets: {} },
      { id: 'park_pets', icon: '🐕', name: 'Mascotas', description: 'Habla de mascotas con alguien que pasea a su perro.', instruction: 'Talk about pets. If you have a pet, talk about it with affection.', objectives: [{ id: 'ask', text: 'Ask about their pet' }, { id: 'share', text: 'Talk about your pet or a pet you would like' }], expressions: ["What a cute dog! What's his name?", 'How old is she?', 'I have a…'], facets: {} },
      { id: 'park_weather', icon: '☀️', name: 'El clima y la ciudad', description: 'Charla sobre el clima y qué hacer en la ciudad.', instruction: 'Small talk about the weather and things to do in the city this week.', objectives: [{ id: 'weather', text: 'Comment on the weather' }, { id: 'plan', text: 'Ask about or suggest something to do' }], expressions: ["Beautiful day, isn't it?", "It's supposed to rain tomorrow.", 'Have you been to…?'], facets: {} },
    ],
  },
  {
    id: 'diner', name: 'Restaurante', emoji: '🍔', rankRequired: 2,
    scene: 'A classic American diner with booths and a jukebox.',
    gradient: ['#fbecc0', '#e0a43a'],
    characters: ['nina'],
    missions: [
      { id: 'diner_order', icon: '🍳', name: 'Ordena la comida', description: 'Pide un plato, una bebida y algo especial (sin cebolla, etc.).', instruction: 'You are the waitress. Take the order and ask follow-up questions (how they want it cooked, sides…).', objectives: [{ id: 'main', text: 'Order a main dish' }, { id: 'drink', text: 'Order a drink' }, { id: 'special', text: 'Make a special request' }], expressions: ["I'll have the…", 'Could I get it without…?', 'Can I get the check, please?'], facets: {} },
      { id: 'diner_bill', icon: '🧾', name: 'La cuenta', description: 'Pide la cuenta, revísala y deja propina.', instruction: 'Bring the check. There is a small mistake on it for the learner to find.', objectives: [{ id: 'check', text: 'Ask for the check' }, { id: 'mistake', text: 'Point out the mistake' }], expressions: ['Could we have the check?', 'I think this is wrong.', 'Keep the change.'], facets: {} },
      { id: 'diner_allergy', icon: '🥜', name: 'Alergias', description: 'Tienes una alergia. Pregunta por ingredientes y pide algo seguro.', instruction: 'The learner has a food allergy. Answer questions about ingredients and suggest safe dishes.', objectives: [{ id: 'allergy', text: 'Explain your allergy' }, { id: 'ingredients', text: 'Ask about ingredients' }, { id: 'order', text: 'Order something safe' }], expressions: ["I'm allergic to…", 'Does this have…?', 'Can you make it without…?'], facets: {} },
    ],
  },
  {
    id: 'clinic', name: 'Consultorio', emoji: '🩺', rankRequired: 3,
    scene: 'A small, calm family doctor office.',
    gradient: ['#d8eef0', '#5fa8b0'],
    characters: ['sam'],
    missions: [
      { id: 'clinic_symptoms', icon: '🤒', name: 'Explica tus síntomas', description: 'Describe qué te pasa, desde cuándo, y pregunta qué hacer.', instruction: 'You are the doctor. Ask about symptoms, how long, and give simple advice. Nothing serious.', objectives: [{ id: 'symptom', text: 'Describe a symptom' }, { id: 'since', text: 'Say since when' }, { id: 'advice', text: 'Ask what to do' }], expressions: ["I've had a … since…", 'It hurts when…', 'Should I take something?'], facets: {} },
      { id: 'clinic_appointment', icon: '📞', name: 'Pide una cita', description: 'Llama para pedir una cita médica.', instruction: 'You are answering the phone at the clinic (play the receptionist). Schedule an appointment.', objectives: [{ id: 'reason', text: 'Say why you need an appointment' }, { id: 'date', text: 'Agree on a day and time' }, { id: 'name', text: 'Give your name and phone number' }], expressions: ["I'd like to make an appointment.", 'Do you have anything on…?', 'My number is…'], facets: {} },
      { id: 'clinic_pharmacy', icon: '💊', name: 'Cómo tomar la medicina', description: 'Entiende cómo tomar un medicamento.', instruction: 'Explain how to take a medicine (how often, with food, side effects). Check that the learner understood.', objectives: [{ id: 'how', text: 'Ask how often to take it' }, { id: 'food', text: 'Ask about food or alcohol' }, { id: 'confirm', text: 'Repeat the instructions to confirm' }], expressions: ['How often should I take it?', 'Can I take it with…?', 'So, twice a day after meals?'], facets: {} },
    ],
  },
  {
    id: 'street', name: 'En la calle', emoji: '🗺️', rankRequired: 1,
    scene: 'A busy downtown street corner with shops, a food truck and traffic.',
    gradient: ['#e3eaf2', '#8fa8c4'],
    characters: ['dan', 'kim'],
    missions: [
      { id: 'street_directions', icon: '🧭', name: 'Pide indicaciones', description: 'Estás perdido. Pregunta cómo llegar a la estación.', instruction: 'Give the learner directions to the train station (two blocks, turn left, next to the bank…). Check they understood.', objectives: [{ id: 'ask', text: 'Ask for directions' }, { id: 'repeat', text: 'Repeat the directions to confirm' }, { id: 'distance', text: 'Ask how far / how long it takes' }], expressions: ['Excuse me, how do I get to…?', 'So I go straight and turn left?', 'Is it far from here?'], facets: { beginner: 'Use only: straight, left, right, next to, across from, blocks.' } },
      { id: 'street_food', icon: '🌮', name: 'Comida callejera', description: 'Pide en un food truck y pregunta qué pica.', instruction: 'Take the order at the food truck, explain dishes and spice levels.', objectives: [{ id: 'ask', text: 'Ask what is good / spicy' }, { id: 'order', text: 'Order food' }, { id: 'pay', text: 'Pay (card or cash)' }], expressions: ["What's popular?", 'Is it spicy?', 'Can I pay by card?'], facets: {} },
      { id: 'street_lost', icon: '👛', name: 'Perdí mi cartera', description: 'Perdiste tu cartera. Repórtalo y descríbela.', instruction: 'The learner lost their wallet. Ask where and when, what it looks like and how to contact them.', objectives: [{ id: 'when', text: 'Say where and when you lost it' }, { id: 'describe', text: 'Describe the wallet' }, { id: 'contact', text: 'Give contact information' }], expressions: ['I lost my wallet.', 'I think it was around…', "It's brown and has…"], facets: {} },
    ],
  },
  {
    id: 'shop', name: 'Tienda de ropa', emoji: '👕', rankRequired: 2,
    scene: 'A trendy clothing store at the mall, music playing.',
    gradient: ['#f8e0ea', '#d48aa8'],
    characters: ['olivia'],
    missions: [
      { id: 'shop_size', icon: '📏', name: 'Busca tu talla', description: 'Pide una prenda en tu talla y en otro color, y pruébatela.', instruction: 'Help the learner find a piece of clothing in their size and color, and the fitting rooms.', objectives: [{ id: 'item', text: 'Say what you are looking for' }, { id: 'size', text: 'Ask for your size or another color' }, { id: 'try', text: 'Ask to try it on' }], expressions: ['Do you have this in medium?', 'Does it come in blue?', 'Where are the fitting rooms?'], facets: {} },
      { id: 'shop_return', icon: '🔄', name: 'Devolución', description: 'Quieres devolver algo que no te quedó.', instruction: 'The learner wants to return an item. Ask for the receipt and the reason; offer exchange or refund.', objectives: [{ id: 'return', text: 'Say you want to return something' }, { id: 'reason', text: 'Explain why' }, { id: 'option', text: 'Choose refund or exchange' }], expressions: ["I'd like to return this.", "It doesn't fit.", 'Can I get a refund?'], facets: {} },
      { id: 'shop_gift', icon: '🎁', name: 'Un regalo', description: 'Busca un regalo para alguien y pide consejo.', instruction: 'Help the learner choose a gift. Ask who it is for, their style and the budget.', objectives: [{ id: 'who', text: 'Say who the gift is for' }, { id: 'budget', text: 'Say your budget' }, { id: 'wrap', text: 'Ask for gift wrapping' }], expressions: ["I'm looking for a gift for…", 'Something under 50 dollars.', 'Could you wrap it?'], facets: {} },
    ],
  },
  {
    id: 'gym', name: 'Gimnasio', emoji: '🏋️', rankRequired: 2,
    scene: 'A bright modern gym with weights, treadmills and loud music.',
    gradient: ['#fdebd0', '#e8a94f'],
    characters: ['marcus'],
    missions: [
      { id: 'gym_join', icon: '📝', name: 'Inscríbete', description: 'Pregunta por planes, precios y horarios.', instruction: 'Explain memberships, prices and opening hours to a possible new member.', objectives: [{ id: 'plans', text: 'Ask about plans and prices' }, { id: 'hours', text: 'Ask about the opening hours' }, { id: 'decide', text: 'Decide on a plan' }], expressions: ['How much is a monthly membership?', 'What time do you open?', "I'll take the…"], facets: {} },
      { id: 'gym_routine', icon: '💪', name: 'Tu rutina', description: 'Cuéntale tus metas y pide una rutina.', instruction: "Ask about the learner's goals, experience and schedule, then suggest a simple routine.", objectives: [{ id: 'goal', text: 'Explain your fitness goal' }, { id: 'freq', text: 'Say how often you can train' }, { id: 'question', text: 'Ask a question about an exercise' }], expressions: ['I want to get stronger / lose weight.', 'I can come three times a week.', 'How many sets should I do?'], facets: {} },
      { id: 'gym_habits', icon: '🥗', name: 'Hábitos saludables', description: 'Hablen de comida, sueño y estrés.', instruction: 'Chat about healthy habits: food, sleep and stress. Be motivating.', objectives: [{ id: 'food', text: 'Talk about what you eat' }, { id: 'sleep', text: 'Talk about your sleep or stress' }], expressions: ['I usually eat…', "I don't sleep enough.", 'Any tips for…?'], facets: {} },
    ],
  },
  {
    id: 'party', name: 'Fiesta en casa', emoji: '🎉', rankRequired: 3,
    scene: 'A cozy apartment house party with music, snacks and friends chatting.',
    gradient: ['#ece0f4', '#a77fc2'],
    characters: ['ben', 'lucy'],
    missions: [
      { id: 'party_meet', icon: '🥤', name: 'Rompe el hielo', description: 'No conoces a nadie. Preséntate y saca tema.', instruction: "You don't know the learner yet. Make small talk: how they know the host, what they do.", objectives: [{ id: 'intro', text: 'Introduce yourself' }, { id: 'connection', text: 'Explain how you know the host' }, { id: 'common', text: 'Find something in common' }], expressions: ['How do you know Ben?', 'So, what do you do?', 'No way, me too!'], facets: {} },
      { id: 'party_movies', icon: '🎬', name: 'Series y películas', description: 'Recomienda una serie y pide recomendaciones.', instruction: 'Talk about movies and TV series. Have opinions and recommend something.', objectives: [{ id: 'recommend', text: 'Recommend a series or movie' }, { id: 'why', text: 'Explain why you like it' }, { id: 'ask', text: 'Ask for a recommendation' }], expressions: ['Have you seen…?', "It's about…", 'You should totally watch…'], facets: {} },
      { id: 'party_plans', icon: '📅', name: 'Hacer planes', description: 'Pónganse de acuerdo para verse otro día.', instruction: 'You get along well. Suggest meeting again; negotiate what, when and where.', objectives: [{ id: 'suggest', text: 'Suggest an activity' }, { id: 'when', text: 'Agree on when' }, { id: 'contact', text: 'Exchange contact (number or Instagram)' }], expressions: ['We should hang out sometime.', 'Are you free on Saturday?', "What's your number?"], facets: {} },
    ],
  },
  {
    id: 'interview', name: 'Entrevista de trabajo', emoji: '🤝', rankRequired: 4,
    scene: 'A quiet meeting room at a mid-size international company.',
    gradient: ['#e4e8ef', '#7d8ba3'],
    characters: ['grace'],
    missions: [
      { id: 'int_about', icon: '🙂', name: 'Háblame de ti', description: 'Preséntate profesionalmente y resume tu experiencia.', instruction: 'Conduct a job interview. Start with "Tell me about yourself" and ask follow-up questions about experience.', objectives: [{ id: 'about', text: 'Present yourself professionally' }, { id: 'experience', text: 'Describe a past job or project' }, { id: 'why', text: 'Explain why you want this job' }], expressions: ['I have X years of experience in…', 'In my last job I was responsible for…', "I'm interested in this role because…"], facets: {} },
      { id: 'int_strengths', icon: '⚖️', name: 'Fortalezas y debilidades', description: 'Responde las preguntas difíciles con ejemplos.', instruction: 'Ask about strengths, weaknesses and a difficult situation (STAR method). Push for concrete examples.', objectives: [{ id: 'strength', text: 'Describe a strength with an example' }, { id: 'weakness', text: 'Describe a weakness and how you improve it' }, { id: 'situation', text: 'Tell about a difficult situation' }], expressions: ['One of my strengths is…', "I'm working on…", 'For example, once I had to…'], facets: {} },
      { id: 'int_questions', icon: '❓', name: 'Tus preguntas', description: 'Al final, haz preguntas sobre el puesto y habla de condiciones.', instruction: 'Near the end of the interview, invite questions and discuss salary expectations and start date.', objectives: [{ id: 'question', text: 'Ask a question about the team or role' }, { id: 'salary', text: 'Talk about salary expectations' }, { id: 'start', text: 'Agree on a possible start date' }], expressions: ['What does a typical day look like?', 'My salary expectation is…', 'I could start on…'], facets: {} },
    ],
  },
];

export { FREE_TALK };

// Lugares que completan los de LingoLooper (barrio, supermercado, ayuntamiento) y la versión de cada
// misión para principiante, intermedio y avanzado (js/lessons.js).
PLACES.push(...NEW_PLACES, ...ROADMAP_PLACES);
for (const p of PLACES) for (const m of p.missions) m.facets = { ...(FACETS[m.id] || {}), ...m.facets };
FREE_TALK.facets = { ...FACETS.free };

// Ilustración de cada lugar (scenes/<id>.webp, hecha con ChatGPT). Se usa de fondo en la conversación
// y en las tarjetas. Si un lugar no está en la lista, se usa su degradado de color.
// Voz natural de cada personaje (Kokoro). Acento británico para Londres, Dublín y Sídney.
const TTS = {
  maya: 'af_heart', sofia: 'af_bella', emma: 'af_nicole', nina: 'af_sarah', kim: 'af_kore',
  olivia: 'af_aoede', grace: 'af_nova', lucy: 'af_alloy', priya: 'bf_emma', rose: 'bf_isabella',
  tom: 'am_michael', david: 'am_fenrir', carlos: 'am_puck', leo: 'am_puck', sam: 'am_michael',
  dan: 'am_fenrir', marcus: 'am_michael', ben: 'am_puck', jack: 'bm_george',
};
Object.assign(TTS, NEW_TTS, ROADMAP_TTS);
for (const c of Object.values(CHARACTERS)) if (TTS[c.id]) c.tts = TTS[c.id];

export const WITH_SCENES = ['cafe', 'airport', 'hotel', 'office', 'park', 'diner', 'clinic', 'street', 'shop', 'gym', 'party', 'interview',
  'neighborhood', 'grocery', 'cityhall', 'bank', 'school', 'mall', 'salon'];
for (const p of PLACES) if (WITH_SCENES.includes(p.id)) p.image = `scenes/${p.id}.webp`;
// Ícono propio de cada lugar (ficha roja hecha con ChatGPT, recortada de una hoja de 5x4).
for (const p of PLACES) p.badge = `scenes/badges/${p.id}.webp`;

// Mapa ilustrado de la ciudad para el inicio. spots = posición de cada lugar en % (x, y) sobre la imagen.
export const CITY_MAP = {
  image: 'scenes/mapa.webp',
  spots: {
    airport: [18, 15], hotel: [49, 14], office: [85, 13],
    cafe: [17, 36], park: [52, 38], diner: [85, 37],
    clinic: [16, 55], street: [55, 56], shop: [84, 56],
    gym: [16, 75], party: [51, 74], interview: [82, 75],
  },
};

export function placeById(id) { return PLACES.find(p => p.id === id); }
export function rankById(id) { return RANKS.find(r => r.id === id) || RANKS[0]; }
export function relationshipStatus(level) {
  let s = RELATIONSHIP_STATUS[0];
  for (const r of RELATIONSHIP_STATUS) if (level >= r.min) s = r;
  return s;
}
export function facetForRank(mission, rankId) {
  const f = mission.facets || {};
  if (rankId <= 2) return f.beginner || '';
  if (rankId <= 3) return f.intermediate || '';
  return f.advanced || '';
}
