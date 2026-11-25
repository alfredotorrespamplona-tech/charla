// Prueba de nivel del mes (unos 10 minutos): escuchar, palabras, armar bien la frase y hablar. Dice «está en
// B1 alto», qué le falta para B2 y sus errores frecuentes ordenados por cuántas veces se repiten.
// Preguntas propias. Sin pantalla: se prueba con node. La pantalla está en nivelscreen.js.
import { BANDS, bandFor, fluencyOf, vocabularyOf } from './entrevista.js';

export { bandFor, BANDS };
export const EVERY_DAYS = 30;
const DAY = 86400000;
// Cuánto vale acertar según el nivel de la pregunta (las difíciles pesan más).
export const WEIGHT = { A2: 1, B1: 1.5, 'B1+': 1.75, B2: 2 };
// Cuánto pesa cada parte en la nota final.
export const PARTS = [
  { id: 'listen', name: 'Escuchar', icon: '🎧', weight: 25, n: 5 },
  { id: 'vocab', name: 'Palabras', icon: '📖', weight: 20, n: 7 },
  { id: 'grammar', name: 'Armar la frase', icon: '🧱', weight: 30, n: 8 },
  { id: 'speak', name: 'Hablar', icon: '🗣', weight: 25, n: 2 },
];

// Escuchar: oye una frase y elige qué significa (la primera opción es la correcta; se barajan al mostrarlas).
const LI = (level, en, options) => ({ level, en, options });
export const LISTEN = [
  LI('A2', 'Could you speak more slowly, please?', ['¿Podría hablar más despacio, por favor?', '¿Podría hablar más fuerte, por favor?', '¿Podría repetir su nombre, por favor?']),
  LI('A2', 'I\'m going to visit my sister this weekend.', ['Voy a visitar a mi hermana este fin de semana.', 'Visité a mi hermana el fin de semana pasado.', 'Mi hermana me va a visitar este fin de semana.']),
  LI('B1', 'I\'ve already sent you the file.', ['Ya le envié el archivo.', 'Todavía no le he enviado el archivo.', 'Le voy a enviar el archivo.']),
  LI('B1', 'We ran out of time, so we\'ll finish it tomorrow.', ['Se nos acabó el tiempo, así que lo terminamos mañana.', 'Terminamos antes de tiempo, así que mañana descansamos.', 'Corrimos para terminar a tiempo.']),
  LI('B1', 'She used to work at a bank.', ['Antes trabajaba en un banco.', 'Está acostumbrada a trabajar en un banco.', 'Usa el banco para su trabajo.']),
  LI('B1+', 'If I were you, I\'d ask for a raise.', ['Yo que usted, pediría un aumento.', 'Si yo fuera usted, me darían un aumento.', 'Usted me pidió un aumento.']),
  LI('B1+', 'The meeting has been put off until next week.', ['La reunión se aplazó hasta la próxima semana.', 'La reunión se canceló para siempre.', 'La reunión se adelantó a esta semana.']),
  LI('B2', 'I wouldn\'t have taken the job if I\'d known about the hours.', ['No habría aceptado el trabajo si hubiera sabido del horario.', 'No acepté el trabajo porque ya conocía el horario.', 'Aceptaría el trabajo si supiera el horario.']),
  LI('B2', 'Hardly anyone showed up to the training.', ['Casi nadie fue a la capacitación.', 'Fue difícil llegar a la capacitación.', 'Todos llegaron temprano a la capacitación.']),
  LI('B2', 'It\'s not that I don\'t like it; it\'s just that it\'s too expensive.', ['No es que no me guste; es que es demasiado caro.', 'No me gusta porque es caro.', 'Me gusta aunque sea caro.']),
];

// Armar la frase: elige la frase correcta. skill = qué mide, en palabras sencillas (para «qué le falta»).
const GR = (id, level, options, skill) => ({ id, level, options, skill });
export const GRAMMAR = [
  GR('g-past', 'A2', ['Yesterday I went to the bank.', 'Yesterday I go to the bank.', 'Yesterday I goed to the bank.'], 'Contar lo que pasó (went, bought, saw)'),
  GR('g-does', 'A2', ['She doesn\'t like coffee.', 'She don\'t like coffee.', 'She not like coffee.'], 'Decir lo que no hace otra persona (she doesn\'t…)'),
  GR('g-agree', 'A2', ['I agree with you.', 'I am agree with you.', 'I agreeing with you.'], 'Estar de acuerdo: «I agree», sin «am»'),
  GR('g-age', 'A2', ['I\'m thirty years old.', 'I have thirty years.', 'I have thirty years old.'], 'Decir la edad (I\'m … years old)'),
  GR('g-since', 'B1', ['I\'ve worked here since 2020.', 'I work here since 2020.', 'I am working here since 2020.'], 'Algo que empezó antes y sigue (I\'ve worked here since…)'),
  GR('g-used', 'B1', ['I used to live in Cali.', 'I use to lived in Cali.', 'I was used to live in Cali.'], 'Lo que hacía antes y ya no (I used to…)'),
  GR('g-if1', 'B1', ['If it rains, we will stay home.', 'If it will rain, we stay home.', 'If it rains, we would stayed home.'], 'Planes con condición (If it rains, we will…)'),
  GR('g-depend', 'B1', ['It depends on the price.', 'It depends of the price.', 'It depend the price.'], 'Palabras que van con su preposición (depends on, interested in)'),
  GR('g-ever', 'B1', ['Have you ever been to Mexico?', 'Did you ever went to Mexico?', 'Have you ever go to Mexico?'], 'Preguntar por experiencias (Have you ever…?)'),
  GR('g-if2', 'B1+', ['If I had more time, I would travel more.', 'If I would have more time, I would travel more.', 'If I have more time, I would travel more.'], 'Imaginar (If I had…, I would…)'),
  GR('g-been', 'B1+', ['I\'ve been studying English for two years.', 'I am studying English since two years.', 'I study English for two years.'], 'Algo que lleva tiempo haciendo (I\'ve been studying… for)'),
  GR('g-passive', 'B1+', ['The report was sent yesterday.', 'The report was send yesterday.', 'The report sent yesterday.'], 'Decir lo que se hizo sin decir quién (was sent, was made)'),
  GR('g-asked', 'B1+', ['She asked me where I worked.', 'She asked me where did I work.', 'She asked me where do I work.'], 'Contar lo que otro preguntó (She asked me where I worked)'),
  GR('g-if3', 'B2', ['If I had known, I would have called you.', 'If I would have known, I would call you.', 'If I knew, I would have called you.'], 'Lo que habría pasado (If I had known, I would have…)'),
  GR('g-wish', 'B2', ['I wish I had more time.', 'I wish I have more time.', 'I wish I would have more time.'], 'Desear algo distinto a lo que es (I wish I had…)'),
  GR('g-despite', 'B2', ['Despite the rain, we finished the project.', 'Despite of the rain, we finished the project.', 'Although the rain, we finished the project.'], 'Unir ideas opuestas (despite, although, however)'),
  GR('g-should', 'B2', ['You should have told me earlier.', 'You should told me earlier.', 'You should have tell me earlier.'], 'Lo que se debió hacer (should have told)'),
  GR('g-forward', 'B2', ['I look forward to hearing from you.', 'I look forward to hear from you.', 'I look forward hearing from you.'], 'Frases fijas de correo formal (look forward to hearing)'),
];

// Palabras de B2 propias de trabajo y entrevistas (las de A1 a B1 salen de las Mil palabras).
export const B2_WORDS = [
  ['achieve', 'lograr'], ['reliable', 'confiable'], ['deadline', 'fecha límite'], ['outcome', 'resultado'], ['negotiate', 'negociar'],
  ['approach', 'enfoque'], ['ensure', 'asegurarse de'], ['requirement', 'requisito'], ['budget', 'presupuesto'], ['overcome', 'superar'],
  ['accurate', 'preciso'], ['hire', 'contratar'], ['assess', 'evaluar'], ['weakness', 'debilidad'], ['delay', 'retraso'], ['purpose', 'propósito'],
];

// Hablar: dos tareas cortas (unos 45 segundos cada una).
export const SPEAK = [
  { task: 'Describe your job, or the job you want, and why you like it.', es: 'Describa su trabajo (o el que quiere) y por qué le gusta.' },
  { task: 'Tell me about a problem you had and how you solved it.', es: 'Cuénteme un problema que tuvo y cómo lo resolvió.' },
];

const shuffle = (a, rnd) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
// Opciones barajadas: [{ text, ok }].
const mix = (options, rnd) => shuffle(options.map((t, i) => ({ text: t, ok: i === 0 })), rnd);
// Toma n repartidas por nivel (de fácil a difícil).
function spread(pool, n, rnd) {
  const lv = ['A2', 'B1', 'B1+', 'B2'];
  const by = lv.map(l => shuffle(pool.filter(x => x.level === l), rnd));
  const out = [];
  for (let k = 0; out.length < n && k < 20; k++) for (const g of by) if (out.length < n && g[k]) out.push(g[k]);
  return out.sort((a, b) => lv.indexOf(a.level) - lv.indexOf(b.level));
}

const MIL_MEANING = m => String(m).replace(/\(\w+\.\)\s*/g, '').split(/[;.]/)[0].trim();
// La prueba de este mes. milRows = MIL_WORDS ([rank, palabra, significado, …]).
export function buildTest(milRows = [], rnd = Math.random) {
  const listen = spread(LISTEN, PARTS[0].n, rnd).map(x => ({ ...x, choices: mix(x.options, rnd) }));
  const grammar = spread(GRAMMAR, PARTS[2].n, rnd).map(x => ({ ...x, choices: mix(x.options, rnd) }));
  const range = (a, b) => milRows.filter(r => r[0] >= a && r[0] <= b && MIL_MEANING(r[2]));
  const vocabFrom = (rows, level, n) => shuffle(rows, rnd).slice(0, n).map(r => {
    const right = MIL_MEANING(r[2]);
    const wrong = shuffle(rows.filter(o => MIL_MEANING(o[2]) !== right), rnd).slice(0, 2).map(o => MIL_MEANING(o[2]));
    return { level, word: r[1], choices: mix([right, ...wrong], rnd) };
  });
  const b2 = B2_WORDS.map(([w, es]) => [0, w, es]);
  const vocab = [...vocabFrom(range(301, 600), 'A2', 2), ...vocabFrom(range(601, 1000), 'B1', 2), ...vocabFrom(b2, 'B2', 3)];
  return { listen, vocab, grammar, speak: SPEAK.map(x => ({ ...x })) };
}

// Nota (0..100) de una parte de opciones: aciertos pesados por nivel. picks[i] = índice elegido.
export function partScore(items, picks) {
  let got = 0, all = 0;
  items.forEach((it, i) => { const w = WEIGHT[it.level] || 1; all += w; if (it.choices[picks[i]]?.ok) got += w; });
  return all ? Math.round((got / all) * 100) : 0;
}

// La parte hablada sin IA: fluidez y variedad de palabras.
export function localSpeakScore(answers, common) {
  const said = answers.filter(a => a.text?.trim());
  if (!said.length) return 0;
  const flu = said.map(a => fluencyOf((a.text.match(/[a-z']+/gi) || []).length, a.durationMs, (a.text.match(/\b(um+|uh+|er+m?|hmm+)\b/gi) || []).length)).filter(v => v != null);
  const f = flu.length ? flu.reduce((a, b) => a + b, 0) / flu.length : 40;
  const v = vocabularyOf(said.map(a => a.text), common) ?? 30;
  return Math.round(Math.min(80, (f + v) / 2));   // sin IA no se puede ver la gramática: tope de 80
}

// Nota final: promedio pesado de las partes hechas (si saltó hablar, cuenta el resto).
export function totalScore(parts) {
  let sum = 0, w = 0;
  for (const p of PARTS) if (typeof parts[p.id] === 'number') { sum += parts[p.id] * p.weight; w += p.weight; }
  return w ? Math.round(sum / w) : 0;
}

// Lo que le falta para B2: las frases que falló de B1 en adelante (sin repetir), y las palabras de B2 que no supo.
export function gapsFrom(test, picks) {
  const gaps = [];
  test.grammar.forEach((g, i) => { if (!g.choices[picks.grammar[i]]?.ok && g.level !== 'A2') gaps.push({ es: g.skill, example: g.options[0], level: g.level }); });
  test.listen.forEach((l, i) => { if (!l.choices[picks.listen[i]]?.ok && (l.level === 'B1+' || l.level === 'B2')) gaps.push({ es: 'Entender frases largas dichas a velocidad normal', example: l.en, level: l.level }); });
  const missedB2 = test.vocab.filter((v, i) => v.level === 'B2' && !v.choices[picks.vocab[i]]?.ok).map(v => v.word);
  if (missedB2.length) gaps.push({ es: `Palabras de trabajo de nivel B2 (${missedB2.join(', ')})`, example: '', level: 'B2' });
  const seen = new Set();
  return gaps.filter(g => !seen.has(g.es) && seen.add(g.es));
}

// Sus errores frecuentes (bitácora del teléfono y del cerebro), de más a menos repetidos.
export function frequentErrors(errors, n = 8) {
  return [...errors].filter(e => e.status !== 'resuelto')
    .sort((a, b) => (b.count || 1) - (a.count || 1) || String(b.date || '').localeCompare(String(a.date || ''))).slice(0, n);
}

// ¿Le toca la prueba de este mes?
export function isDue(tests = [], now = Date.now()) {
  const last = tests[tests.length - 1];
  return !last || now - last.at >= EVERY_DAYS * DAY;
}
export function daysUntilNext(tests = [], now = Date.now()) {
  const last = tests[tests.length - 1];
  return last ? Math.max(0, Math.ceil((last.at + EVERY_DAYS * DAY - now) / DAY)) : 0;
}

// Lo que se guarda de cada prueba.
export function testRecord({ parts, aiLevel = '', at = Date.now() }) {
  const score = totalScore(parts);
  return { at, score, label: bandFor(score).label, parts, aiLevel };
}
