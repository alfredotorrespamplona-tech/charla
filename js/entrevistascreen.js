// Pantalla del simulacro de entrevista completo (lógica y preguntas en entrevista.js). Laura hace 9 preguntas
// con su voz; usted responde hablando (o escribiendo). Con IA hay repreguntas y un informe con nota por
// habilidad; sin IA, el teléfono mide fluidez, vocabulario y orden. Cada simulacro queda en la gráfica.
import * as store from './store.js';
import { chatJson, hasAI } from './llm.js';
import * as P from './prompts.js';
import { h, mount, toast, spinner, setText } from './ui.js';
import { speak, stopSpeaking, Listener, canListen, sendPauseMs } from './speech.js';
import { addVocab } from './words.js';
import * as E from './entrevista.js';
import { progressChart, skillBars } from './chart.js';

const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
const topbar = (title, onBack, icon = '←') => h('div.topbar', {}, h('button.icon', { 'aria-label': icon === '✕' ? 'Salir' : 'Volver', onclick: onBack }, icon), h('h2', {}, title));
const LAURA = { voice: { gender: 'female' } };
const say = (t, rate) => speak(t, { rate: rate || 0.95, character: LAURA });
const MAX_FOLLOWS = 3;
const clock = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const sign = n => (n > 0 ? `+${n}` : String(n));

// Portada: qué es, el puesto, la gráfica y el último resultado.
export function entrevistaScreen({ home }) {
  stopSpeaking();
  const s = store.get();
  const mocks = s.entrevista.mocks;
  const role = h('input', { value: s.entrevista.role || '', placeholder: 'Ej.: customer service agent, sales assistant…', autocapitalize: 'off' });
  const last = mocks[mocks.length - 1];
  const start = () => {
    store.update(x => { x.entrevista.role = role.value.trim(); });
    runMock({ home });
  };
  mount(h('div.screen.mock', {},
    topbar('💼 Simulacro de entrevista', home),
    h('div.card', {},
      h('p', {}, 'Una entrevista completa de 10 a 15 minutos, de principio a fin, en inglés. Laura le hace 9 preguntas (presentarse, por qué este puesto, fortalezas, una historia de su trabajo, equipo, una situación difícil, su futuro y el cierre).'),
      h('p.muted', {}, hasAI()
        ? 'Con IA, Laura le repregunta como en una entrevista de verdad y al final recibe su nota de fluidez, gramática, vocabulario y orden, con sus respuestas mejoradas.'
        : 'Sin clave de IA, el teléfono le pone nota de fluidez, vocabulario y orden. La gramática y las repreguntas necesitan IA (Ajustes).'),
      h('label', {}, 'Puesto al que aspira (en inglés, opcional)'), role,
      h('button.primary.wide', { onclick: start }, '▶️ Empezar la entrevista'),
      h('button.wide', { onclick: async () => (await import('./ofertascreen.js')).ofertasScreen({ home: () => entrevistaScreen({ home }) }) }, '📄 Prepararse para una oferta concreta')),
    last ? h('div.card', {},
      h('div.dash-week-head', {}, h('b', {}, 'Su último simulacro'), h('small.muted', {}, new Date(last.at).toLocaleDateString('es', { day: 'numeric', month: 'long' }))),
      h('p.big', {}, `${last.overall} / 100 · ${E.bandFor(last.overall).label}`),
      skillBars(E.SKILLS.map(k => ({ label: k.name, value: last.scores[k.id] ?? null, note: last.scores[k.id] == null ? 'necesita IA' : '' }))),
      s.entrevista.last ? h('button.small', { onclick: () => showReport({ home, ...s.entrevista.last, mock: last, saved: true }) }, '📋 Ver el informe') : null) : null,
    mocks.length >= 2 ? h('div.card', {}, h('b', {}, '📊 Cómo mejora de un simulacro a otro'), progressChart(E.chartPoints(mocks), { title: 'Nota general' })) : null,
    h('div.card', {}, h('b', {}, '💡 Antes de empezar'),
      h('ul', {}, h('li', {}, 'Empiece cada respuesta con las palabras de la pregunta.'),
        h('li', {}, 'Ordénela en 3 partes: qué, por qué, un ejemplo.'),
        h('li', {}, 'Para las historias: el problema, lo que usted hizo y el resultado.'),
        h('li', {}, 'Si se equivoca, corríjase y siga: lo que cuenta es comunicar.')))));
}

// La entrevista en sí.
// opts (v46): questions y role de una oferta; onReport({ qa, report }) para guardar sus respuestas mejoradas.
export function runMock({ home, questions: given = null, role: givenRole = null, onReport = null }) {
  const s = store.get();
  const role = givenRole ?? s.entrevista.role;
  const questions = given || E.pickQuestions();
  const qa = [];             // { q: {en, es, frame, start}, text, durationMs, follow }
  const listener = new Listener();
  const t0 = Date.now();
  let i = -1, follows = 0, alive = true, busy = false;
  const head = h('div.mock-head');
  const bubble = h('div.card.mock-q');
  const box = h('div.mock-answer');
  const tick = setInterval(() => { if (alive) drawHead(); }, 1000);
  const total = questions.length;
  const current = { q: null, isFollow: false };
  const drawHead = () => fill(head, h('small.muted', {}, `Pregunta ${Math.min(total, i + 1)} de ${total}${current.isFollow ? ' · repregunta' : ''} · ⏱ ${clock(Date.now() - t0)}`),
    h('div.mock-progress', {}, h('span', { style: { width: `${Math.round(((i + 1) / total) * 100)}%` } })));
  const quit = () => {
    if (qa.length && !confirm('¿Salir de la entrevista? No se guardará la nota.')) return;
    alive = false; clearInterval(tick); listener.abort(); stopSpeaking(); if (given) home(); else entrevistaScreen({ home });
  };

  const ask = async (q, isFollow = false) => {
    current.q = q; current.isFollow = isFollow;
    drawHead();
    const es = h('p.muted.hidden', {}, q.es);
    const help = h('p.mock-help.hidden', {}, '💡 Puede empezar así: ', h('b', {}, q.start || ''));
    fill(bubble, h('small.muted', {}, isFollow ? '👩 Laura repregunta' : `👩 Laura · ${q.slotName || ''}`),
      h('p.big', {}, q.en),
      es, help,
      h('div.row', {}, h('button.tiny', { onclick: () => say(q.en) }, '🔊 Otra vez'), h('button.tiny', { onclick: () => say(q.en, 0.7) }, '🐢 Despacio'),
        h('button.tiny', { onclick: () => es.classList.toggle('hidden') }, '🌐 Español'),
        q.start ? h('button.tiny', { onclick: () => help.classList.toggle('hidden') }, '💡 Ayuda') : null));
    drawAnswer();
    await say(q.en);
  };

  const drawAnswer = () => {
    const heard = h('p.muted', {}, '');
    const input = h('input', { placeholder: 'O escriba su respuesta en inglés…', enterkeyhint: 'send', autocomplete: 'off', spellcheck: 'false' });
    const send = (text, durationMs) => { if (!busy) answered(text, durationMs); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) send(input.value.trim(), 0); });
    const mic = h('button.primary', { onclick: async () => {
      if (!canListen) { toast('Este navegador no reconoce voz: escriba la respuesta.', 'bad'); return; }
      if (listener.active) { listener.stop(); return; }
      stopSpeaking();
      setText(mic, '⏹ Terminé'); mic.classList.add('recording');
      heard.textContent = 'Escuchando… tómese su tiempo.';
      try {
        // En una entrevista se piensa a mitad de la respuesta: la pausa para terminar es más larga.
        const r = await listener.start({ lang: store.get().settings.targetLang, pauseMs: Math.max(5000, sendPauseMs() + 2000), firstWordMs: 30000,
          onInterim: t => { heard.textContent = t || 'Escuchando…'; } });
        if (!alive) return;
        if (r.text) send(r.text, r.durationMs); else heard.textContent = 'No se escuchó nada. Toque el micrófono e intente otra vez.';
      } catch (e) { heard.textContent = e.message; }
      finally { setText(mic, '🎤 Responder'); mic.classList.remove('recording'); }
    } }, '🎤 Responder');
    fill(box, h('div.row', {}, mic, h('button', { onclick: () => input.value.trim() && send(input.value.trim(), 0) }, 'Enviar')), input, heard,
      h('button.link', { onclick: () => send('', 0) }, 'Saltar esta pregunta'));
  };

  const answered = async (text, durationMs) => {
    busy = true;
    qa.push({ q: current.q, text, durationMs, follow: current.isFollow });
    fill(box, text ? h('p.mock-said', {}, '🗣 ', text) : null, spinner(''));
    // Repregunta de la IA (como en una entrevista de verdad), en algunas preguntas.
    if (!current.isFollow && current.q.follow && text && follows < MAX_FOLLOWS && hasAI()) {
      try {
        const r = await chatJson('mockFollow', P.mockFollowMessages({ role, question: current.q.en, answer: text, rankId: store.get().rank }), { temperature: 0.7, maxTokens: 200 });
        if (!alive) return;
        if (r?.follow) { follows++; busy = false; return ask({ en: String(r.follow), es: String(r.es || ''), frame: 'qyq', start: '', slotName: current.q.slotName }, true); }
      } catch { /* sin repregunta: sigue la entrevista */ }
    }
    if (!alive) return;
    busy = false;
    next();
  };

  const next = () => {
    i++;
    if (i < questions.length) return ask(questions[i]);
    finish();
  };

  const finish = async () => {
    alive = false; clearInterval(tick);
    const minutes = (Date.now() - t0) / 60000;
    fill(bubble, h('small.muted', {}, '👩 Laura'), h('p.big', {}, E.CLOSING), h('p.muted', {}, E.CLOSING_ES));
    fill(box, spinner('Calculando su nota…'));
    say(E.CLOSING);
    const { MIL_WORDS } = await import('./milwords.js');
    const common = new Set(MIL_WORDS.map(r => r[1].toLowerCase()));
    const local = E.localScores(qa, common);
    let report = null;
    if (hasAI() && local.answered) {
      try {
        report = await chatJson('mockReport', P.mockReportMessages({ role, rankId: store.get().rank,
          qa: qa.map((x, k) => ({ q: x.q.en, a: x.text, spoken: !!x.durationMs, seconds: local.per[k].seconds, words: local.per[k].words })) }),
        { temperature: 0.3, maxTokens: 3500 });
      } catch (e) { toast('No se pudo pedir el informe a la IA: ' + e.message, 'bad'); }
    }
    const scores = E.blendScores(local, report?.scores);
    const mock = E.mockRecord({ role, scores, minutes, ai: !!report });
    const saved = local.answered > 0;
    const keepQa = qa.map(x => ({ q: { en: x.q.en, es: x.q.es }, text: x.text, durationMs: x.durationMs, follow: x.follow }));
    if (saved) store.update(x => {
      x.entrevista.mocks = [...x.entrevista.mocks, mock].slice(-40);
      x.activity = store.logInto(x.activity, 'mock');
      x.entrevista.last = { qa: keepQa, report, local: { fluency: local.fluency, vocabulary: local.vocabulary, order: local.order, spoken: local.spoken, answered: local.answered, avgWords: local.avgWords, fillers: local.fillers } };
    });
    if (saved) onReport?.({ qa: keepQa, report });
    showReport({ home, qa: keepQa, report, local, mock, saved, again: given ? () => runMock({ home, questions: given, role: givenRole, onReport }) : null });
  };

  mount(h('div.screen.mock-run', {}, topbar('💼 Entrevista', quit, '✕'), head, bubble, box));
  // Saludo de Laura y primera pregunta.
  fill(bubble, h('small.muted', {}, '👩 Laura'), h('p.big', {}, E.opening(role)), h('p.muted', {}, E.OPENING_ES));
  fill(box, h('button.primary.wide', { onclick: () => next() }, 'Estoy listo: primera pregunta'));
  say(E.opening(role));
}

// Informe: nota general, nivel, habilidades, gráfica, correcciones y sus respuestas mejoradas.
function showReport({ home, qa, report, local, mock, saved, again = null }) {
  stopSpeaking();
  const mocks = store.get().entrevista.mocks;
  const delta = saved ? E.deltaVsPrevious(mocks) : null;
  const band = E.bandFor(mock.overall);
  const star = (en, es) => {
    const b = h('button.tiny', { 'aria-label': 'Llevar al repaso', onclick: () => { if (addVocab({ text: en, translation: es || '', type: 'Phrase', source: 'entrevista' })) { b.disabled = true; setText(b, '⭐'); } } }, '☆');
    return b;
  };
  const listen = en => h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(en, 0.9) }, '🔊');
  const better = new Map((report?.answers || []).map(a => [Number(a.i), a]));
  mount(h('div.screen.mock-report', {},
    topbar('📋 Su informe', () => entrevistaScreen({ home })),
    h('div.card.mock-score', {},
      h('small.muted', {}, `${mock.minutes} min · ${qa.length} respuestas${mock.role ? ' · ' + mock.role : ''}`),
      h('p.mock-big', {}, String(mock.overall), h('small', {}, ' / 100')),
      h('p.big', {}, `Está en ${band.label} (${band.es})`),
      report?.level ? h('p.muted', {}, `Según la IA, sus respuestas muestran un nivel ${report.level}.`) : null,
      report?.summary ? h('p', {}, report.summary) : null,
      !saved ? h('p.warn', {}, 'No respondió ninguna pregunta: este simulacro no se guarda.') : null),
    h('div.card', {}, h('b', {}, 'Por habilidad'),
      skillBars(E.SKILLS.map(k => ({ label: k.name, value: mock.scores[k.id] ?? null,
        note: mock.scores[k.id] == null ? 'necesita IA' : delta && delta[k.id] != null && delta[k.id] !== 0 ? `${sign(delta[k.id])} desde el anterior` : '' }))),
      h('small.muted', {}, `Medido en el teléfono: ${local.spoken} respuestas habladas, ${local.avgWords} palabras por respuesta en promedio, ${local.fillers} muletillas.`)),
    mocks.length >= 2 ? h('div.card', {}, h('b', {}, '📊 Cómo mejora'), progressChart(E.chartPoints(mocks), { title: 'Nota general' })) : null,
    report?.strengths?.length ? h('div.card', {}, h('b', {}, '✅ Lo que hizo bien'), h('ul', {}, report.strengths.map(t => h('li', {}, t)))) : null,
    report?.fixes?.length ? h('div.card', {}, h('b', {}, '📝 Lo que más conviene corregir'),
      report.fixes.map(f => h('div.mock-fix', {}, h('p', {}, h('s.muted', {}, f.said), ' → ', h('b', {}, f.better), ' ', listen(f.better), ' ', star(f.better, '')), h('small.muted', {}, f.why)))) : null,
    h('div.card', {}, h('b', {}, '🗣 Sus respuestas'),
      qa.map((x, k) => {
        const b = better.get(k + 1);
        const c = local.per?.[k]?.check;
        return h('div.mock-qa', {},
          h('p', {}, h('b', {}, `${x.follow ? '↩ ' : ''}${x.q.en}`)),
          h('p.mock-said', {}, x.text || '(sin respuesta)'),
          c && x.text && !b ? h('small.muted', {}, c.tip) : null,
          b ? h('div.mock-better', {}, h('p', {}, '✨ ', b.better_en, ' ', listen(b.better_en), ' ', star(b.better_en, b.better_es)), h('small.muted', {}, b.better_es), b.tip ? h('p.muted', {}, '💡 ', b.tip) : null) : null);
      })),
    report?.next?.length ? h('div.card', {}, h('b', {}, '🎯 Para el próximo simulacro'), h('ol', {}, report.next.map(t => h('li', {}, t)))) : null,
    h('button.primary.wide', { onclick: () => (again ? again() : runMock({ home })) }, '🔁 Otro simulacro'),
    h('button.secondary.wide', { onclick: () => entrevistaScreen({ home }) }, 'Listo')));
}
