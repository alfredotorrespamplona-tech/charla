// Temario completo de gramática por nivel (A1…C2). Junta los temas de temario-a/b/c.js y prepara lo que se hace
// con ellos: práctica de cada tema, examen del nivel y una charla con la IA enfocada en un tema.
// Sin pantallas (están en temarioscreen.js): se prueba con node.
import { A1, A2 } from './temario-a.js';
import { B1, B2 } from './temario-b.js';
import { C1, C2 } from './temario-c.js';
import { makeTopic } from './topics.js';

export const LEVELS = { A1, A2, B1, B2, C1, C2 };
export const CODES = Object.keys(LEVELS);
export const PASS = 0.8;        // nota para dar un tema o un examen por aprobado
export const EXAM_SIZE = 20;    // preguntas del examen del nivel

export const TOPICS = CODES.flatMap((level, li) => LEVELS[level].map((t, i) => ({ ...t, level, rank: li + 1, order: i })));
const BY_ID = new Map(TOPICS.map(t => [t.id, t]));
export const topicById = id => BY_ID.get(id);
export const levelTopics = code => TOPICS.filter(t => t.level === code);

// Pregunta de práctica: la frase en español, la inglesa con ___, la respuesta y 2 opciones falsas.
export const asQuestion = ([es, en, answer, wrong], topic = null) =>
  ({ es, en, answer, wrong, topic: topic?.id || null, full: en.replace('___', answer) });

const low = t => String(t || '').trim().toLowerCase();
export function validQuestion(q) {
  if (!q || typeof q.es !== 'string' || typeof q.en !== 'string' || typeof q.answer !== 'string') return false;
  if (!q.es.trim() || !q.answer.trim() || q.en.split('___').length !== 2) return false;
  if (!Array.isArray(q.wrong) || q.wrong.length !== 2) return false;
  const opts = [q.answer, ...q.wrong].map(low);
  return opts.every(Boolean) && new Set(opts).size === 3 && q.en.length < 220 && q.es.length < 220;
}

export function shuffle(list, rnd = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const practiceSet = (topic, rnd = Math.random) => shuffle(topic.quiz.map(q => asQuestion(q, topic)), rnd);

// Examen del nivel: una pregunta de cada tema y, si faltan, una segunda de los temas que más tienen.
export function examSet(code, n = EXAM_SIZE, rnd = Math.random) {
  const pools = shuffle(levelTopics(code), rnd).map(t => shuffle(t.quiz.map(q => asQuestion(q, t)), rnd));
  const out = [];
  while (out.length < n && pools.some(p => p.length)) {
    for (const p of pools) { if (out.length >= n) break; const q = p.shift(); if (q) out.push(q); }
  }
  return shuffle(out, rnd);
}

// answers: [{ topic, ok }] → nota, nota por tema y los temas para repasar (los peores primero).
export function examResult(answers) {
  const byTopic = {};
  for (const a of answers) {
    const t = byTopic[a.topic] || (byTopic[a.topic] = { got: 0, total: 0 });
    t.total++; if (a.ok) t.got++;
  }
  const got = answers.filter(a => a.ok).length;
  const weak = Object.entries(byTopic).filter(([, t]) => t.got < t.total)
    .sort((a, b) => a[1].got / a[1].total - b[1].got / b[1].total).map(([id]) => id);
  return { got, total: answers.length, pct: answers.length ? got / answers.length : 0, byTopic, weak };
}

// Avance del temario de un nivel: temas aprobados (best >= PASS) y nota del examen.
export function levelProgress(code, temario = {}) {
  const list = levelTopics(code);
  const best = temario.best || {};
  const passed = list.filter(t => (best[t.id] || 0) >= PASS).length;
  return { passed, total: list.length, exam: temario.exam?.[code] ?? null };
}

// Charla con la IA en la que el personaje le da ocasiones de usar el tema (y lo usa él mismo).
export function practiceMission(topic) {
  const [a, b] = topic.ex;
  return makeTopic(`gp-${topic.id}`, 'study', topic.icon, `Practicar: ${topic.title.split(' → ')[0]}`,
    `Una charla para usar «${topic.title.split(' → ')[1] || topic.title}» sin pensarlo.`,
    `a relaxed chat about the learner's life, work and plans in which you naturally create chances for them to use this structure: ${topic.ai}. Ask open questions that invite it (for example, questions whose natural answer would be like "${a[0]}" or "${b[0]}"), and use it yourself so they hear it. Do not explain grammar unless they ask; if they avoid the structure, ask a follow-up that makes it natural.`,
    [['use1', 'Use the target structure correctly in an answer'], ['use2', 'Use it again in a different sentence'], ['ask', 'Ask the character a question that uses it']],
    topic.ex.slice(0, 3).map(e => e[0]),
    ['Short, simple questions; repeat the structure in your own answers.', 'Everyday questions that call for the structure several times.', 'Natural, fast conversation that needs the structure in varied ways.'],
    topic.rank);
}
