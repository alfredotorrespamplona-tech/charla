// Pantallas del temario: la ficha de cada tema (en español primero, la forma, ejemplos y errores típicos),
// la práctica de opción múltiple, el examen del nivel y el paso a una charla enfocada en el tema.
// El contenido y la lógica están en temario.js.
import * as store from './store.js';
import { chatJson } from './llm.js';
import * as P from './prompts.js';
import { h, mount, toast, progressBar, setText, buzz, sheet, spinner } from './ui.js';
import { speak, stopSpeaking } from './speech.js';
import { addVocab } from './words.js';
import * as T from './temario.js';
import * as G from './grammar.js';
import { openLesson } from './grammarscreen.js';

const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
const say = (t, rate = 0.9) => speak(t, { rate });
const hasAI = () => !!store.get().settings.apiKey?.trim();
const pct = x => `${Math.round(x * 100)} %`;
const listen = (text, label = 'Escuchar') => h('button.tiny', { 'aria-label': label, onclick: () => say(text) }, '🔊');
// La frase con el hueco marcado.
const withGap = (en, inside = '') => {
  const [a, b] = en.split('___');
  return [a, h('span.gap', {}, inside || '      '), b];
};

function saveBest(kind, key, value) {
  store.update(s => {
    s.temario = s.temario || { best: {}, exam: {} };
    s.temario[kind] = s.temario[kind] || {};
    s.temario[kind][key] = Math.max(s.temario[kind][key] || 0, Math.round(value * 100) / 100);
  });
}

// ---------------- Ficha de un tema ----------------
// startChat(mission): abre la charla (lo pone app.js, que conoce lugares y personajes).
export function topicScreen(topic, { back, startChat }) {
  stopSpeaking();
  const s = store.get();
  const best = s.temario?.best?.[topic.id];
  const list = T.levelTopics(topic.level);
  const again = () => topicScreen(topic, { back, startChat });
  const lesson = topic.lesson ? G.lessonById(topic.lesson) : null;
  const prev = list[topic.order - 1], next = list[topic.order + 1];
  const more = h('button.wide', { onclick: () => moreWithAI(topic, again, more) }, '✨ 6 preguntas nuevas con IA');

  mount(h('div.screen.temario', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: back }, '←'), h('h2', {}, `${topic.icon} ${topic.title}`)),
    h('p.muted', {}, `Nivel ${topic.level} · tema ${topic.order + 1} de ${list.length}`,
      best != null ? h('span', { class: best >= T.PASS ? 'good' : '' }, ` · su mejor nota: ${best >= T.PASS ? '✓ ' : ''}${pct(best)}`) : null),
    h('div.card', {}, h('b', {}, 'Qué es y para qué sirve'), h('p', {}, topic.es)),
    h('div.card', {}, h('b', {}, 'Cómo se dice en inglés'), h('p', {}, topic.en)),
    h('div.card', {}, h('b', {}, 'La forma'),
      h('div.form-table', {}, topic.form.map(([label, en, es]) => h('div.form-row', {},
        h('small.muted.form-label', {}, label),
        h('div', {}, h('button.link', { onclick: () => say(en) }, en), h('br'), h('small.muted', {}, es)))))),
    h('div.card', {}, h('b', {}, 'Ejemplos'),
      h('ul.examples', {}, topic.ex.map(([en, es]) => h('li', {}, listen(en), ' ', en, h('br'), h('small.muted', {}, es))))),
    h('div.card.traps', {}, h('b', {}, '⚠ Errores típicos de quien habla español'),
      topic.traps.map(([wrong, right, why]) => h('div.trap', {},
        h('div', {}, h('s.bad', {}, wrong), ' → ', h('b.good', {}, right), ' ', listen(right)),
        h('small.muted', {}, why)))),
    h('button.primary.wide', { onclick: () => runQuiz({ title: topic.title, items: T.practiceSet(topic), topic, back: again, startChat }) },
      `✍ Practicar (${topic.quiz.length} preguntas)`),
    h('button.wide', { onclick: () => startChat(T.practiceMission(topic)) }, '🗣 Charlar usando esto'),
    lesson ? h('button.wide', { onclick: () => openLesson(lesson, again) }, `🧩 Rompecabezas: ${lesson.title}`) : null,
    hasAI() ? more : h('p.muted', {}, 'Con su clave de DeepSeek puede pedir más preguntas de este tema.'),
    h('div.row.topic-nav', {},
      prev ? h('button.small', { onclick: () => topicScreen(prev, { back, startChat }) }, `← ${prev.title.split(' → ')[0]}`) : h('span'),
      next ? h('button.small', { onclick: () => topicScreen(next, { back, startChat }) }, `${next.title.split(' → ')[0]} →`) : h('span'))));
}

async function moreWithAI(topic, back, btn) {
  btn.disabled = true; setText(btn, '✨ Creando…');
  try {
    const r = await chatJson('temario', P.temarioMessages({ topic, count: 6, rankId: topic.rank, done: topic.quiz.map(q => q[1].replace('___', q[2])) }), { temperature: 0.7, maxTokens: 1200 });
    const items = (r?.items || []).map(x => ({ ...x, wrong: (x.wrong || []).slice(0, 2), topic: topic.id, full: String(x.en || '').replace('___', x.answer) })).filter(T.validQuestion);
    if (!items.length) throw new Error('La IA no devolvió preguntas válidas. Intente otra vez.');
    runQuiz({ title: `${topic.title} · IA`, items, back, startChat: null });
  } catch (e) { toast(e.message, 'bad'); btn.disabled = false; setText(btn, '✨ 6 preguntas nuevas con IA'); }
}

// «No lo entiendo»: la IA lo explica pieza por pieza, en español primero (método de Pablo Bolen, como en la charla).
async function explainMore(q, chosen) {
  const box = h('div', {}, h('h3', {}, '🧩 Pieza por pieza'), spinner('Armando la explicación…'));
  sheet(box);
  try {
    const r = await chatJson('explain', P.explainMessages({ original: q.en.replace('___', chosen), corrected: q.full,
      explanation: T.explain(q, chosen), meant: q.es }), { temperature: 0.3, maxTokens: 500 });
    box.lastChild.remove();
    box.append(
      h('p', {}, 'Lo que quería decir: ', h('b', {}, r.es || q.es)),
      h('ol.pieces', {}, (r.pieces || []).map(p => h('li', {},
        h('span.piece-es', {}, p.es), ' → ', h('b.piece-en', {}, p.en), p.note ? h('small.muted', {}, p.note) : null))),
      h('div.correction.better', {}, h('small', {}, 'Armado en inglés'), h('div', {}, r.en || q.full),
        h('div.row', {}, h('button.tiny', { onclick: () => say(r.en || q.full) }, '🔊 Escuchar'))),
      r.tip ? h('p.muted', {}, '💡 ', r.tip) : null);
  } catch (e) { box.lastChild.remove(); box.append(h('p', {}, e.message)); }
}

// ---------------- Examen del nivel ----------------
export function levelExam(code, { back, startChat }) {
  const p = T.levelProgress(code, store.get().temario);
  const list = T.levelTopics(code);
  mount(h('div.screen.temario', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: back }, '←'), h('h2', {}, `📝 Examen de ${code}`)),
    h('div.card', {},
      h('p', {}, `${T.EXAM_SIZE} preguntas de los ${list.length} temas de gramática de ${code}, mezcladas. Cada vez salen otras.`),
      h('p', {}, `Con el ${T.PASS * 100} % o más, el nivel queda aprobado. Al final verá qué temas repasar.`),
      p.exam != null ? h('p', { class: p.exam >= T.PASS ? 'good' : 'muted' }, `Su mejor nota: ${p.exam >= T.PASS ? '✓ ' : ''}${pct(p.exam)}`) : null),
    h('button.primary.wide', { onclick: () => runQuiz({ title: `Examen de ${code}`, items: T.examSet(code), level: code, back, startChat }) }, 'Empezar el examen'),
    h('button.wide', { onclick: back }, 'Volver')));
}

// ---------------- Preguntas (práctica de un tema o examen) ----------------
function runQuiz({ title, items, topic = null, level = null, back, startChat }) {
  stopSpeaking();
  const screen = h('div.screen.drill.temario-quiz', {});
  const answers = [];
  let i = 0;
  mount(screen);
  const leave = () => { stopSpeaking(); back(); };

  function show() {
    if (i >= items.length) return finish();
    const q = items[i];
    const result = h('div');
    const sentence = h('p.sentence', {}, withGap(q.en));
    let answered = false;
    const opts = T.shuffle([q.answer, ...q.wrong]).map(o => {
      const btn = h('button.option', { onclick: () => pick(o, btn) }, o);
      return btn;
    });
    function pick(o, btn) {
      if (answered) return;
      answered = true;
      const ok = o === q.answer;
      answers.push({ topic: q.topic, ok, q });
      btn.classList.add(ok ? 'right' : 'wrong');
      if (!ok) opts.find(b => b.textContent === q.answer)?.classList.add('right');
      fill(sentence, withGap(q.en, q.answer));
      buzz(ok ? 'good' : 'bad');
      const t = level && T.topicById(q.topic);
      const why = T.explain(q, o);
      fill(result,
        h('p', { class: ok ? 'good' : 'bad' }, ok ? '✅ ¡Bien!' : `❌ Es «${q.answer}»`),
        h('p', {}, listen(q.full), ' ', q.full),
        why ? h('p.why', {}, h('b', {}, '💡 Por qué: '), why) : null,
        !ok && hasAI() ? h('button.tiny', { onclick: () => explainMore(q, o) }, '❓ No lo entiendo') : null,
        t && !ok ? h('small.muted', {}, `Tema: ${t.title}`) : null,
        h('button.primary.wide', { onclick: () => { i++; show(); } }, i + 1 < items.length ? 'Seguir' : 'Ver resultado'));
      say(q.full);
    }
    fill(screen,
      h('div.topbar', {}, h('button.icon', { 'aria-label': 'Salir', onclick: leave }, '✕'), h('h2', {}, title)),
      progressBar(i / items.length),
      h('p.muted.drill-step', {}, `${i + 1} de ${items.length}`),
      h('p.sentence.es', {}, q.es),
      sentence,
      h('div.options', {}, opts),
      result);
  }

  function finish() {
    const r = T.examResult(answers);
    if (topic) saveBest('best', topic.id, r.pct);
    if (level) saveBest('exam', level, r.pct);
    buzz(r.pct >= T.PASS ? 'good' : 'tap');
    const missed = answers.filter(a => !a.ok).map(a => a.q);
    const toReview = () => {
      let n = 0;
      for (const q of missed) if (addVocab({ text: q.full, translation: q.es, type: 'Phrase', source: 'temario' })) n++;
      if (!n) toast('Ya estaban en su repaso');
    };
    const again = level ? T.examSet(level) : T.shuffle(items);
    const weak = level ? r.weak.map(T.topicById).filter(Boolean) : [];
    const verdict = r.pct >= T.PASS
      ? (level ? `🌟 ¡Nivel ${level} aprobado en gramática!` : '🌟 ¡Tema aprobado!')
      : `Para aprobar hace falta el ${T.PASS * 100} %. ${level ? 'Repase los temas de abajo y vuelva a intentarlo.' : 'Lea otra vez la ficha y repita.'}`;
    fill(screen,
      h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: back }, '←'), h('h2', {}, title)),
      h('div.card.center', {},
        h('div.big-score', {}, pct(r.pct)),
        h('p', {}, `${r.got} de ${r.total} bien.`),
        h('p', { class: r.pct >= T.PASS ? 'good' : 'muted' }, verdict)),
      weak.length ? h('div.card', {}, h('b', {}, 'Temas para repasar'),
        weak.map(t => {
          const x = r.byTopic[t.id];
          return h('button.pack', { onclick: () => topicScreen(t, { back, startChat }) },
            h('span.pack-icon', {}, t.icon),
            h('span.pack-body', {}, h('span.pack-name', {}, t.title)),
            h('small.bad', {}, `${x.got}/${x.total}`));
        })) : null,
      missed.length ? h('div.card', {}, h('b', {}, 'Las que falló'),
        missed.map(q => h('p', {}, listen(q.full), ' ', q.full, h('br'), h('small.muted', {}, q.es),
          T.explain(q) ? h('small.why', {}, '💡 ', T.explain(q)) : null)),
        h('button.small', { onclick: toReview }, '📒 Llevarlas al repaso')) : null,
      topic && startChat ? h('button.primary.wide', { onclick: () => startChat(T.practiceMission(topic)) }, '🗣 Ahora úselo hablando') : null,
      h('button.wide', { onclick: () => runQuiz({ title, items: again, topic, level, back, startChat }) }, level ? 'Otro examen' : 'Repetir'),
      h('button.wide', { onclick: back }, 'Volver'));
  }

  show();
}
