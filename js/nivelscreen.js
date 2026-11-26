// Pantalla de la prueba de nivel del mes (contenido y notas en nivel.js): 4 partes, unos 10 minutos.
// Al final: «Está en B1 alto», nota por parte, la gráfica de un mes a otro, qué le falta para B2 y sus errores
// frecuentes ordenados por cuántas veces se repiten.
import * as store from './store.js';
import { chatJson, hasAI } from './llm.js';
import * as P from './prompts.js';
import { h, mount, toast, spinner, setText, buzz } from './ui.js';
import { speak, stopSpeaking, Listener, canListen, sendPauseMs } from './speech.js';
import { allErrors } from './bitacora.js';
import * as N from './nivel.js';
import { progressChart, skillBars } from './chart.js';

const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
const topbar = (title, onBack, icon = '←') => h('div.topbar', {}, h('button.icon', { 'aria-label': icon === '✕' ? 'Salir' : 'Volver', onclick: onBack }, icon), h('h2', {}, title));
const VOICE = { voice: { gender: 'female' } };
const fecha = at => new Date(at).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '');

export function nivelScreen({ home }) {
  stopSpeaking();
  const tests = store.get().nivel.tests;
  const last = tests[tests.length - 1];
  const due = N.isDue(tests);
  mount(h('div.screen.level-test', {},
    topbar('📏 Su nivel del mes', home),
    h('div.card', {},
      h('p', {}, 'Una prueba corta (unos 10 minutos) para ver su nivel real cada mes: escuchar, palabras, armar bien la frase y hablar.'),
      h('p.muted', {}, 'Al final le dice en qué nivel está, qué le falta para B2 y cuáles son sus errores más repetidos. Hágala una vez al mes: así ve cómo sube.'),
      h('ul', {}, N.PARTS.map(p => h('li', {}, `${p.icon} ${p.name}: ${p.n} ${p.id === 'speak' ? 'preguntas para responder hablando' : 'preguntas'}`))),
      !hasAI() ? h('p.muted', {}, 'Sin clave de IA, la parte hablada se mide solo por fluidez y variedad de palabras.') : null,
      h('button.primary.wide', { onclick: () => runTest({ home }) }, due ? '▶️ Hacer la prueba de este mes' : `▶️ Hacerla otra vez (le toca en ${N.daysUntilNext(tests)} días)`)),
    last ? h('div.card', {},
      h('div.dash-week-head', {}, h('b', {}, 'Su última prueba'), h('small.muted', {}, new Date(last.at).toLocaleDateString('es', { day: 'numeric', month: 'long' }))),
      h('p.big', {}, `Está en ${last.label} · ${last.score} / 100`),
      skillBars(N.PARTS.map(p => ({ label: p.name, value: last.parts[p.id] ?? null, note: last.parts[p.id] == null ? 'no la hizo' : '' })))) : null,
    tests.length >= 2 ? h('div.card', {}, h('b', {}, '📊 Su nivel de un mes a otro'),
      progressChart(tests.slice(-12).map(t => ({ label: fecha(t.at), value: t.score })), { title: 'Nota de la prueba' })) : null,
    errorsCard()));
}

// Sus errores más repetidos (los mismos de la bitácora), de más a menos veces.
function errorsCard() {
  const list = N.frequentErrors(allErrors());
  if (!list.length) return null;
  return h('div.card', {}, h('b', {}, '📒 Sus errores más repetidos'),
    list.map(e => h('div.level-err', {},
      h('p', {}, h('s.muted', {}, e.wrong[0]), ' → ', h('b', {}, e.right[0]), ' ',
        h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => speak(e.right[0], { rate: 0.9, character: VOICE }) }, '🔊')),
      h('small.muted', {}, [(e.count || 1) > 1 ? `${e.count} veces` : '1 vez', e.why ? String(e.why).slice(0, 140) : ''].filter(Boolean).join(' · ')))));
}

async function runTest({ home }) {
  const { MIL_WORDS } = await import('./milwords.js');
  const test = N.buildTest(MIL_WORDS);
  const picks = { listen: [], vocab: [], grammar: [] };
  const spoken = [];
  const listener = new Listener();
  let alive = true;
  const head = h('div.level-head');
  const body = h('div.level-body');
  const quit = () => { if (!confirm('¿Salir de la prueba? No se guarda.')) return; alive = false; listener.abort(); stopSpeaking(); nivelScreen({ home }); };
  mount(h('div.screen.level-run', {}, topbar('📏 Prueba de nivel', quit, '✕'), head, body));

  const steps = [
    ...test.listen.map((it, i) => ({ part: 0, it, i })),
    ...test.vocab.map((it, i) => ({ part: 1, it, i })),
    ...test.grammar.map((it, i) => ({ part: 2, it, i })),
    ...test.speak.map((it, i) => ({ part: 3, it, i })),
  ];
  let k = 0;
  const drawHead = () => {
    const st = steps[k], part = N.PARTS[st.part];
    fill(head, h('small.muted', {}, `Parte ${st.part + 1} de 4 · ${part.icon} ${part.name} · ${st.i + 1} de ${part.n}`),
      h('div.mock-progress', {}, h('span', { style: { width: `${Math.round((k / steps.length) * 100)}%` } })));
  };
  const advance = () => { k++; if (k < steps.length) show(); else finish(); };

  const options = (it, key, i) => h('div.listen-options', {}, it.choices.map((c, n) => h('button.option', {
    onclick: e => {
      picks[key][i] = n;
      [...e.target.parentNode.children].forEach(b => { b.disabled = true; });
      e.target.classList.add('sel');
      buzz('tap');
      setTimeout(advance, 350);    // sin decir si acertó: es una prueba
    } }, c.text)));

  const show = () => {
    drawHead();
    const { part, it, i } = steps[k];
    if (part === 0) {
      let plays = 0;
      const play = () => { if (plays >= 3) { toast('Ya la escuchó 3 veces'); return; } plays++; speak(it.en, { rate: 0.95, character: VOICE }); };
      fill(body, h('p', {}, '¿Qué dijo? Puede escucharla hasta 3 veces.'),
        h('button.primary.wide', { onclick: play }, '🔊 Escuchar'), options(it, 'listen', i));
      play();
    } else if (part === 1) {
      fill(body, h('p', {}, '¿Qué significa esta palabra?'),
        h('p.level-word', {}, it.word, ' ', h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => speak(it.word, { rate: 0.85, character: VOICE }) }, '🔊')),
        options(it, 'vocab', i),
        h('button.link', { onclick: () => { picks.vocab[i] = -1; advance(); } }, 'No la sé'));
    } else if (part === 2) {
      fill(body, h('p', {}, '¿Cuál está bien dicha?'), options(it, 'grammar', i),
        h('button.link', { onclick: () => { picks.grammar[i] = -1; advance(); } }, 'No sé'));
    } else {
      const heard = h('p.muted', {}, '');
      const input = h('input', { placeholder: 'O escriba su respuesta en inglés…', enterkeyhint: 'send', autocomplete: 'off', spellcheck: 'false' });
      const done = (text, durationMs) => { spoken[i] = { task: it.task, text, durationMs }; advance(); };
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) done(input.value.trim(), 0); });
      const mic = h('button.primary', { onclick: async () => {
        if (!canListen) { toast('Este navegador no reconoce voz: escriba la respuesta.', 'bad'); return; }
        if (listener.active) { listener.stop(); return; }
        setText(mic, '⏹ Terminé'); mic.classList.add('recording');
        try {
          const r = await listener.start({ lang: store.get().settings.targetLang, pauseMs: Math.max(5000, sendPauseMs() + 2000), firstWordMs: 30000,
            onInterim: t => { heard.textContent = t || 'Escuchando…'; } });
          if (!alive) return;
          if (r.text) done(r.text, r.durationMs); else heard.textContent = 'No se escuchó nada. Intente otra vez.';
        } catch (e) { heard.textContent = e.message; }
        finally { setText(mic, '🎤 Responder'); mic.classList.remove('recording'); }
      } }, '🎤 Responder');
      fill(body, h('p', {}, 'Responda hablando unos 45 segundos (3 o 4 frases).'),
        h('p.big', {}, it.task, ' ', h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => speak(it.task, { rate: 0.9, character: VOICE }) }, '🔊')),
        h('p.muted', {}, it.es),
        h('div.row', {}, mic, h('button', { onclick: () => input.value.trim() && done(input.value.trim(), 0) }, 'Enviar')), input, heard,
        h('button.link', { onclick: () => done('', 0) }, 'Saltar'));
      speak(it.task, { rate: 0.9, character: VOICE });
    }
  };

  const finish = async () => {
    alive = false; stopSpeaking();
    fill(head);
    fill(body, spinner('Calculando su nivel…'));
    const parts = { listen: N.partScore(test.listen, picks.listen), vocab: N.partScore(test.vocab, picks.vocab), grammar: N.partScore(test.grammar, picks.grammar) };
    let ai = null;
    const answered = spoken.filter(x => x?.text);
    if (answered.length) {
      if (hasAI()) {
        try { ai = await chatJson('levelSpeak', P.levelSpeakMessages({ items: spoken.filter(Boolean), rankId: store.get().rank }), { temperature: 0.2, maxTokens: 1200 }); }
        catch (e) { toast('No se pudo calificar la parte hablada con IA: ' + e.message, 'bad'); }
      }
      parts.speak = typeof ai?.score === 'number' ? Math.round(Math.max(0, Math.min(100, ai.score)))
        : N.localSpeakScore(answered, new Set(MIL_WORDS.map(r => r[1].toLowerCase())));
    }
    const rec = N.testRecord({ parts, aiLevel: ai?.level || '' });
    store.update(s => { s.nivel.tests = [...s.nivel.tests, rec].slice(-24); s.activity = store.logInto(s.activity, 'test'); });
    showResult({ home, rec, gaps: [...(ai?.gaps || []).map(g => ({ es: g.es, example: g.example })), ...N.gapsFrom(test, picks)], fixes: ai?.fixes || [], test, picks });
  };

  show();
}

function showResult({ home, rec, gaps, fixes, test, picks }) {
  const tests = store.get().nivel.tests;
  const prev = tests[tests.length - 2];
  const band = N.bandFor(rec.score);
  const toB2 = Math.max(0, 75 - rec.score);
  const ex = t => (t ? h('span', {}, ' «', h('i', {}, t), '» ', h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => speak(t, { rate: 0.9, character: VOICE }) }, '🔊')) : null);
  const wrongGrammar = test.grammar.filter((g, i) => !g.choices[picks.grammar[i]]?.ok);
  mount(h('div.screen.level-result', {},
    topbar('📏 Su nivel', () => nivelScreen({ home })),
    h('div.card.mock-score', {},
      h('small.muted', {}, new Date(rec.at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })),
      h('p.mock-big', {}, band.label),
      h('p.big', {}, `Está en ${band.label} (${band.es}) · ${rec.score} / 100`),
      prev ? h('p.muted', {}, rec.score >= prev.score ? `↗ Subió ${rec.score - prev.score} puntos desde la prueba anterior (${prev.label}).` : `↘ Bajó ${prev.score - rec.score} puntos desde la anterior (${prev.label}). Pasa: un mal día no cambia su nivel.`) : null,
      rec.aiLevel ? h('p.muted', {}, `En la parte hablada, la IA le ve un nivel ${rec.aiLevel}.`) : null,
      h('p', {}, toB2 ? `Le faltan ${toB2} puntos para B2.` : '¡Ya está en B2! Siga así para afianzarlo.')),
    h('div.card', {}, h('b', {}, 'Por parte'),
      skillBars(N.PARTS.map(p => ({ label: p.name, value: rec.parts[p.id] ?? null, note: rec.parts[p.id] == null ? 'no la hizo' : '' })))),
    tests.length >= 2 ? h('div.card', {}, h('b', {}, '📊 De un mes a otro'),
      progressChart(tests.slice(-12).map(t => ({ label: fecha(t.at), value: t.score })), { title: 'Nota de la prueba' })) : null,
    gaps.length ? h('div.card', {}, h('b', {}, '🎯 Qué le falta para B2'),
      h('ol', {}, gaps.slice(0, 6).map(g => h('li', {}, g.es, ex(g.example))))) : null,
    wrongGrammar.length ? h('div.card', {}, h('b', {}, '🧱 Las frases que falló, bien dichas'),
      wrongGrammar.map(g => h('p', {}, h('b', {}, g.options[0]), ' ',
        h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => speak(g.options[0], { rate: 0.9, character: VOICE }) }, '🔊'), h('small.muted', {}, ' ' + g.skill)))) : null,
    fixes.length ? h('div.card', {}, h('b', {}, '🗣 Lo que dijo y cómo se dice'),
      fixes.map(f => h('div.mock-fix', {}, h('p', {}, h('s.muted', {}, f.said), ' → ', h('b', {}, f.better)), h('small.muted', {}, f.why)))) : null,
    errorsCard(),
    h('button.primary.wide', { onclick: () => nivelScreen({ home }) }, 'Listo')));
}
