// Simulacro de entrevista completo (10 a 15 minutos): una entrevistadora hace 8 preguntas de principio a fin
// (apertura, motivación, fortalezas, una historia STAR, equipo, una situación, futuro y cierre), con
// repreguntas de la IA. Al final da nota de fluidez, gramática, vocabulario y orden de las respuestas, un informe
// y la gráfica de cómo mejora de un simulacro a otro. Preguntas propias.
// Sin pantalla: se prueba con node. La pantalla está en entrevistascreen.js.
import { answerCheck } from './tecnicas.js';

// Cada parte de la entrevista con 2 o 3 preguntas posibles (cambian de un simulacro a otro).
// frame: estructura que conviene (qyq = Qué · Y qué · Ahora qué; psb = Problema · Solución · Beneficio; w5 = las 5 preguntas).
const q = (en, es, frame, start) => ({ en, es, frame, start });
export const SLOTS = [
  { id: 'abrir', name: 'Apertura', follow: true, options: [
    q('To start, can you tell me a little about yourself?', 'Para empezar, ¿me cuenta un poco sobre usted?', 'qyq', 'Sure. I\'m… and I\'ve worked as…'),
    q('Walk me through your background.', 'Cuénteme su trayectoria.', 'qyq', 'Sure. I started my career as…'),
    q('How would your coworkers describe you?', '¿Cómo lo describirían sus compañeros?', 'qyq', 'I think my coworkers would describe me as…'),
    q('What do you do in your current job?', '¿Qué hace en su trabajo actual?', 'qyq', 'In my current job, I…'),
  ] },
  { id: 'motivo', name: 'Motivación', options: [
    q('Why are you interested in this position?', '¿Por qué le interesa este puesto?', 'qyq', 'I\'m interested in this position because…'),
    q('What do you know about our company, and why do you want to work here?', '¿Qué sabe de nuestra empresa y por qué quiere trabajar aquí?', 'qyq', 'I know that your company… and I want to work here because…'),
    q('Why are you looking for a new job?', '¿Por qué está buscando un trabajo nuevo?', 'qyq', 'I\'m looking for a new job because…'),
    q('What attracted you to this role?', '¿Qué le atrajo de este puesto?', 'qyq', 'What attracted me to this role is…'),
  ] },
  { id: 'fortaleza', name: 'Fortalezas', options: [
    q('What would you say is your greatest strength?', '¿Cuál diría que es su mayor fortaleza?', 'qyq', 'I\'d say my greatest strength is…'),
    q('What is something you\'re working to improve?', '¿Qué es algo que está trabajando para mejorar?', 'psb', 'Something I\'m working to improve is…'),
    q('What skills would you bring to our team?', '¿Qué habilidades traería a nuestro equipo?', 'qyq', 'I would bring…'),
    q('What are you most proud of in your career?', '¿De qué está más orgulloso en su carrera?', 'psb', 'I\'m most proud of the time I…'),
  ] },
  { id: 'star', name: 'Una historia (STAR)', follow: true, options: [
    q('Tell me about a time you solved a difficult problem at work.', 'Cuénteme de una vez que resolvió un problema difícil en el trabajo.', 'psb', 'One time, at my last job, we had a problem with…'),
    q('Tell me about a time you made a mistake. What did you do?', 'Cuénteme de una vez que cometió un error. ¿Qué hizo?', 'psb', 'One time I made a mistake when…'),
    q('Describe a situation where you had to meet a tight deadline.', 'Describa una situación en la que tuvo que cumplir un plazo muy corto.', 'psb', 'Once, I had to finish… in only…'),
    q('Tell me about a time you helped a difficult customer.', 'Cuénteme de una vez que ayudó a un cliente difícil.', 'psb', 'Once, a customer was very upset because…'),
    q('Tell me about a time you had to learn something quickly.', 'Cuénteme de una vez que tuvo que aprender algo rápido.', 'psb', 'Once, I had to learn… in only…'),
  ] },
  { id: 'equipo', name: 'Trabajo en equipo', options: [
    q('How do you handle disagreements with a coworker?', '¿Cómo maneja los desacuerdos con un compañero?', 'psb', 'When I disagree with a coworker, I…'),
    q('What role do you usually take in a team?', '¿Qué papel suele tomar en un equipo?', 'qyq', 'In a team, I usually…'),
    q('Tell me about a time you worked with someone very different from you.', 'Cuénteme de una vez que trabajó con alguien muy distinto a usted.', 'psb', 'Once, I worked with someone who…'),
    q('How do you give feedback to a coworker?', '¿Cómo le da comentarios a un compañero?', 'psb', 'When I give feedback, first I…'),
  ] },
  { id: 'situacion', name: 'Situación', options: [
    q('What would you do if a customer was very angry with you?', '¿Qué haría si un cliente estuviera muy enojado con usted?', 'psb', 'If a customer was very angry, first I would…'),
    q('What would you do if you had too many tasks and not enough time?', '¿Qué haría si tuviera demasiadas tareas y poco tiempo?', 'psb', 'If I had too many tasks, I would…'),
    q('What would you do if you disagreed with your manager?', '¿Qué haría si no estuviera de acuerdo con su jefe?', 'psb', 'If I disagreed with my manager, I would…'),
    q('What would you do if you made a mistake that nobody noticed?', '¿Qué haría si cometiera un error que nadie notó?', 'psb', 'If I made a mistake, I would…'),
  ] },
  { id: 'futuro', name: 'Futuro', options: [
    q('Where do you see yourself in five years?', '¿Dónde se ve en cinco años?', 'qyq', 'In five years, I see myself…'),
    q('What are your career goals?', '¿Cuáles son sus metas profesionales?', 'qyq', 'My main career goal is…'),
    q('How do you keep learning in your field?', '¿Cómo sigue aprendiendo en su área?', 'qyq', 'I keep learning by…'),
    q('What kind of manager helps you do your best work?', '¿Qué tipo de jefe le ayuda a dar lo mejor?', 'qyq', 'I do my best work with a manager who…'),
  ] },
  { id: 'cierre', name: 'Cierre', follow: true, options: [
    q('Why should we hire you?', '¿Por qué deberíamos contratarle?', 'qyq', 'You should hire me because…'),
    q('Is there anything else you\'d like us to know about you?', '¿Hay algo más que quiera que sepamos de usted?', 'qyq', 'Yes. I\'d like you to know that…'),
    q('What makes you different from other candidates?', '¿Qué lo hace diferente de los otros candidatos?', 'qyq', 'What makes me different is…'),
    q('What salary are you expecting?', '¿Qué sueldo espera?', 'qyq', 'Based on my experience, I\'m expecting…'),
  ] },
];
export const LAST_QUESTION = q('Do you have any questions for us?', '¿Tiene alguna pregunta para nosotros?', 'qyq', 'Yes, I\'d like to know…');
export const opening = role => `Hi, thanks for coming in today. I'm Laura, and I'll be interviewing you for the ${role || 'open'} position. It will take about fifteen minutes. Let's get started.`;
export const OPENING_ES = 'Hola, gracias por venir. Soy Laura y le voy a entrevistar para el puesto. Tomará unos quince minutos. Empecemos.';
export const CLOSING = 'Great, thank you. That\'s all from me. We\'ll be in touch soon. Have a nice day!';
export const CLOSING_ES = 'Muy bien, gracias. Eso es todo. Nos comunicaremos pronto. ¡Que tenga un buen día!';
export const SKILLS = [
  { id: 'fluency', name: 'Fluidez', about: 'Hablar seguido, sin pausas largas ni muletillas.' },
  { id: 'grammar', name: 'Gramática', about: 'Frases correctas (la revisa la IA).' },
  { id: 'vocabulary', name: 'Vocabulario', about: 'Palabras variadas y precisas, no siempre las mismas.' },
  { id: 'order', name: 'Orden', about: 'Respuestas con comienzo, 3 partes y un largo justo.' },
];

// Las preguntas de este simulacro: una de cada parte (rnd para probar), más la última «¿Tiene preguntas?».
export function pickQuestions(rnd = Math.random) {
  return [...SLOTS.map(s => ({ ...s.options[Math.floor(rnd() * s.options.length)], slot: s.id, slotName: s.name, follow: !!s.follow })),
    { ...LAST_QUESTION, slot: 'preguntas', slotName: 'Sus preguntas', follow: false }];
}

const FILLER_RE = /\b(um+|uh+|uhm+|er+m?|ah+|hmm+|you know|i mean|like,)\b/gi;
const WORD_RE = /[a-z']+/g;
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const STOP = new Set('the a an and or but so to of in on at for with is are was were be been am i you he she it we they my your our their me him her us them this that these those do did does have has had not no yes very really just also then there here what when where why how which who because if as from by about can could would will'.split(' '));

// Fluidez de una respuesta hablada (0..100): palabras por minuto y muletillas. null si fue escrita.
export function fluencyOf(words, durationMs, fillers) {
  if (!durationMs || durationMs < 3000 || !words) return null;
  const wpm = words / (durationMs / 60000);
  const speed = wpm < 40 ? 25 : wpm < 70 ? 25 + (wpm - 40) * 1.5 : wpm < 100 ? 70 + (wpm - 70) : wpm <= 150 ? 100 : wpm <= 190 ? 100 - (wpm - 150) * 0.5 : 80;
  return Math.round(clamp(speed - Math.min(30, (fillers / words) * 100 * 4)));
}

// Variedad de vocabulario (0..100) de todas las respuestas juntas: cuántas palabras distintas usa y cuántas van
// más allá de las 1000 más comunes (common = Set de esas palabras; vacío = no se mira).
export function vocabularyOf(texts, common = new Set()) {
  const all = texts.join(' ').toLowerCase().match(WORD_RE) || [];
  const content = all.filter(w => w.length > 2 && !STOP.has(w));
  if (content.length < 10) return content.length ? 30 : null;
  const variety = new Set(content).size / content.length;                 // 0.3 (repite mucho) … 0.8 (muy variado)
  const rare = common.size ? content.filter(w => !common.has(w) && !common.has(w.replace(/(ing|ed|es|s)$/, ''))).length / content.length : 0.12;
  return Math.round(clamp(25 + variety * 70 + rare * 120));
}

// Lo que el teléfono mide sin IA. answers = [{ q (pregunta), text, durationMs }].
export function localScores(answers, common) {
  const said = answers.filter(a => a.text && a.text.trim());
  const per = answers.map(a => {
    const text = String(a.text || '');
    const words = (text.toLowerCase().match(WORD_RE) || []).length;
    const fillers = (text.match(FILLER_RE) || []).length;
    const check = answerCheck({ start: a.q.start, frame: a.q.frame }, text);
    return { words, fillers, seconds: Math.round((a.durationMs || 0) / 1000), fluency: fluencyOf(words, a.durationMs, fillers), check };
  });
  const spoken = per.filter(p => p.fluency != null);
  const avgWords = said.length ? per.reduce((n, p) => n + p.words, 0) / answers.length : 0;
  // Sin voz: la fluidez se estima por el largo de las respuestas (escribir no mide pausas).
  const fluency = !said.length ? 0 : spoken.length ? Math.round(spoken.reduce((n, p) => n + p.fluency, 0) / spoken.length)
    : Math.round(clamp(20 + avgWords * 1.2, 0, 70));
  const order = !said.length ? 0 : Math.round((per.reduce((n, p) => n + p.check.score, 0) / per.length) * 100);
  return { per, fluency, grammar: null, vocabulary: vocabularyOf(said.map(a => a.text), common) ?? 0, order,
    spoken: spoken.length, answered: said.length, avgWords: Math.round(avgWords), fillers: per.reduce((n, p) => n + p.fillers, 0) };
}

// Junta lo medido en el teléfono con la nota de la IA (si la hay). Devuelve { fluency, grammar, vocabulary, order }.
export function blendScores(local, ai = null) {
  const n = v => (typeof v === 'number' && isFinite(v) ? Math.round(clamp(v)) : null);
  if (!ai) return { fluency: local.fluency, grammar: null, vocabulary: local.vocabulary, order: local.order };
  const mix = (l, a, wa) => (a == null ? l : Math.round(l * (1 - wa) + a * wa));
  return { fluency: mix(local.fluency, n(ai.fluency), 0.5), grammar: n(ai.grammar), vocabulary: mix(local.vocabulary, n(ai.vocabulary), 0.6), order: mix(local.order, n(ai.order), 0.6) };
}
export function overallOf(scores) {
  const v = Object.values(scores).filter(x => typeof x === 'number');
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
}

// Nota (0..100) → nivel aproximado, en palabras.
export const BANDS = [
  { min: 0, label: 'A2', es: 'básico' }, { min: 40, label: 'B1 bajo', es: 'intermedio, empezando' },
  { min: 55, label: 'B1 medio', es: 'intermedio' }, { min: 65, label: 'B1 alto', es: 'intermedio, casi B2' },
  { min: 75, label: 'B2', es: 'independiente' }, { min: 88, label: 'B2 alto', es: 'independiente, cerca de C1' },
];
export function bandFor(score) { let b = BANDS[0]; for (const x of BANDS) if (score >= x.min) b = x; return b; }

// Lo que se guarda de cada simulacro (para la gráfica).
export function mockRecord({ role, scores, minutes, ai, at = Date.now() }) {
  return { at, role: role || '', scores, overall: overallOf(scores), minutes: Math.max(1, Math.round(minutes || 0)), ai: !!ai };
}

// Puntos de la gráfica: un punto por simulacro (fecha corta y nota general).
export function chartPoints(mocks) {
  return mocks.slice(-12).map(m => ({ label: new Date(m.at).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', ''), value: m.overall }));
}

// Cambio frente al simulacro anterior, por habilidad: { fluency: +5, … } (null si no hay con qué comparar).
export function deltaVsPrevious(mocks) {
  if (mocks.length < 2) return null;
  const [a, b] = mocks.slice(-2);
  return Object.fromEntries(SKILLS.map(s => [s.id, a.scores[s.id] == null || b.scores[s.id] == null ? null : b.scores[s.id] - a.scores[s.id]]));
}
