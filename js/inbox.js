// Mensajes de los personajes entre charlas (como los de LingoLooper: «responda a tiempo y gane extra»).
// Sin servidor no hay notificaciones: el mensaje aparece al abrir la app, como máximo uno al día, de alguien
// que ya conoce. Si lo responde (conversando con esa persona) antes de que venza, gana monedas extra.
import * as store from './store.js';
import { CHARACTERS } from './data.js';

export const REPLY_BONUS = 3;          // monedas por responder a tiempo
export const REPLY_HOURS = 24;         // horas para responder

// Plantillas propias. {name} = nombre del alumno.
const FRIENDLY = [
  ['Hey {name}! Something funny happened at work today. Come by and I\'ll tell you!', '¡Hola, {name}! Hoy me pasó algo chistoso en el trabajo. ¡Ven y te cuento!'],
  ['Hi {name}, I was thinking about what you told me last time. How did it go?', 'Hola, {name}, estaba pensando en lo que me contaste la última vez. ¿Cómo te fue?'],
  ['Good news, {name}! I finally finished a project I was working on. Want to hear about it?', '¡Buenas noticias, {name}! Por fin terminé un proyecto. ¿Quieres que te cuente?'],
  ['{name}, quick question: what are you doing this weekend?', '{name}, pregunta rápida: ¿qué vas a hacer este fin de semana?'],
  ['I tried a new recipe last night and it was a disaster. Ha! Do you cook?', 'Anoche probé una receta nueva y fue un desastre. ¡Ja! ¿Tú cocinas?'],
  ['Hi {name}! I miss our chats. Stop by when you can!', '¡Hola, {name}! Extraño nuestras charlas. ¡Pasa cuando puedas!'],
  ['I saw a great movie yesterday. I think you would like it. Ask me about it!', 'Ayer vi una película buenísima. Creo que te gustaría. ¡Pregúntame!'],
  ['{name}, I need your opinion on something. Do you have a minute?', '{name}, necesito tu opinión sobre algo. ¿Tienes un minuto?'],
];
const COLD = [
  ['{name}. I am still a bit upset about last time. Maybe we should talk.', '{name}. Todavía estoy algo molesto por lo de la última vez. Quizás deberíamos hablar.'],
  ['Hmm. I heard you were around. Are you going to say hello this time?', 'Mmm. Supe que andabas por aquí. ¿Esta vez vas a saludar?'],
];

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length) % arr.length];

// Crea el mensaje del día si toca. Devuelve el mensaje nuevo o null.
export function maybeNewMessage(now = new Date(), rnd = Math.random) {
  const s = store.get();
  const today = store.todayIso(now);
  if (s.inboxDate === today) return null;
  const known = Object.entries(s.relationships).filter(([id, r]) => CHARACTERS[id] && r.conversations > 0);
  if (!known.length) return null;
  // Más probable de quien tiene más relación (o está molesto con usted).
  const weighted = known.flatMap(([id, r]) => Array(1 + Math.min(5, Math.abs(r.level))).fill([id, r]));
  const [charId, rel] = pick(weighted, rnd);
  const [en, es] = pick(rel.level < 0 ? COLD : FRIENDLY, rnd);
  const fill = t => t.replaceAll('{name}', s.name || 'friend');
  const msg = { id: String(now.getTime()), charId, text: fill(en), es: fill(es), date: now.toISOString(),
    expires: new Date(now.getTime() + REPLY_HOURS * 3600000).toISOString(), answered: false };
  store.update(x => {
    x.inboxDate = today;
    x.inbox = [msg, ...x.inbox].slice(0, 20);
  });
  return msg;
}

export function pendingMessages(now = new Date(), s = store.get()) {
  return s.inbox.filter(m => !m.answered && !m.dismissed && new Date(m.expires) > now);
}

// Misión de conversación para responder el mensaje.
export function replyMission(msg) {
  return {
    id: 'free', icon: '💌', name: 'Responder el mensaje', messageId: msg.id,
    description: `Responda: «${msg.es}»`,
    instruction: `Earlier today you sent the learner this text message: "${msg.text}". Start by greeting them and referring to your message, then chat about it naturally.`,
    objectives: [], expressions: ['I got your message!', 'Tell me more about…', 'That sounds…'], facets: {},
  };
}

// Marca el mensaje como respondido; da el premio si fue a tiempo. Devuelve las monedas ganadas.
export function markAnswered(messageId, now = new Date()) {
  let bonus = 0;
  store.update(s => {
    const m = s.inbox.find(x => x.id === messageId);
    if (!m || m.answered) return;
    m.answered = true;
    if (new Date(m.expires) > now) { bonus = REPLY_BONUS; s.coins += bonus; }
  });
  return bonus;
}

export function dismissMessage(messageId) {
  store.update(s => { const m = s.inbox.find(x => x.id === messageId); if (m) m.dismissed = true; });
}
