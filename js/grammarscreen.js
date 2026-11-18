// Pantallas de Gramática: lecciones por nivel con el método de piezas de Pablo Bolen, la tabla de verbos
// (infinitivo, pasado y participio con su español) y «Su frase», que la IA parte en piezas.
// El contenido y la revisión están en grammar.js.
import * as store from './store.js';
import { chatJson } from './llm.js';
import * as P from './prompts.js';
import { RANKS } from './data.js';
import { h, mount, sheet, closeSheet, toast, spinner, progressBar, setText, buzz } from './ui.js';
import { Listener, speak, stopSpeaking, canListen } from './speech.js';
import { wordStates, verdict } from './pronounce.js';
import { addVocab } from './words.js';
import * as G from './grammar.js';

const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
const hasAI = () => !!store.get().settings.apiKey?.trim();
const best = () => store.get().grammar?.best || {};
const say = (t, rate = 0.9) => speak(t, { rate });
const rankOf = id => RANKS.find(r => r.id === id) || RANKS[0];

// Texto del botón del inicio: la lección que toca o «todo aprobado».
export function homeLabel(s = store.get()) {
  const b = s.grammar?.best || {};
  const passed = G.LESSONS.filter(l => (b[l.id] || 0) >= G.PASS).length;
  return `${passed}/${G.LESSONS.length} · verbos`;
}

export function grammarScreen({ home, tab = 'lessons' }) {
  const tabs = [{ key: 'lessons', label: '🧱 Por niveles' }, { key: 'verbs', label: '📋 Verbos' }, { key: 'mine', label: '✨ Su frase' }];
  const go = key => grammarScreen({ home, tab: key });
  const body = tab === 'verbs' ? verbsTab(() => go('verbs')) : tab === 'mine' ? mineTab(() => go('mine')) : lessonsTab(() => go('lessons'));
  mount(h('div.screen.grammar', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: () => { stopSpeaking(); home(); } }, '←'), h('h2', {}, '🧱 Gramática')),
    h('div.segmented', {}, tabs.map(t => h('button', { class: t.key === tab ? 'sel' : '', onclick: () => go(t.key) }, t.label))),
    body));
}

// ---------------- Lecciones por nivel ----------------
function methodCard() {
  return h('details.card.method', {},
    h('summary', {}, h('b', {}, '💡 Cómo funciona: piezas, no reglas'), h('small.muted', {}, ' (método de Pablo Bolen)')),
    h('p.muted', {}, 'No hace falta saber qué es un «participio». Reconozca la forma del verbo en español y cámbiela por su pieza en inglés, como un rompecabezas. Cada ejercicio sigue 5 pasos:'),
    h('ol', {}, G.METHOD.map(m => h('li', {}, m))));
}

function lessonsTab(back) {
  const s = store.get(), b = best();
  const next = G.nextLesson(s.rank, b);
  return [
    methodCard(),
    next ? h('button.card.next-lesson', { onclick: () => lessonIntro(next, back) },
      h('small.muted', {}, 'Le toca'), h('b', {}, `${next.icon} ${next.title}`), h('small.muted', {}, `Nivel ${rankOf(next.rank).code}`)) : h('p.good', {}, '🌟 Aprobó todas las lecciones. Repítalas o pida más ejercicios con IA.'),
    RANKS.map(r => {
      const list = G.LESSONS.filter(l => l.rank === r.id);
      if (!list.length) return null;
      return h('div', {},
        h('div.section-head', {}, h('h2', {}, `${r.code} · ${r.name}`), r.id === s.rank ? h('small.chip.sel', {}, 'su nivel') : null),
        h('div.packs', {}, list.map(l => {
          const open = G.unlocked(l, store.reachRank(s) === 6 ? 6 : s.rank, b);
          const pct = b[l.id];
          return h('button.pack', { class: open ? '' : 'locked', onclick: () => open ? lessonIntro(l, back) : toast(`Se abre al llegar al nivel ${rankOf(l.rank).code} o al aprobar la lección anterior (80 %).`) },
            h('span.pack-icon', {}, open ? l.icon : '🔒'),
            h('span.pack-body', {}, h('span.pack-name', {}, l.title), h('small.muted', {}, l.table.slice(0, 2).map(([es, en]) => `${es} → ${en}`).join(' · '))),
            h('small', { class: pct >= G.PASS ? 'good' : 'muted' }, pct != null ? `${pct >= G.PASS ? '✓ ' : ''}${Math.round(pct * 100)} %` : ''));
        })));
    }),
  ];
}

const marked = (text, parts, cls = 'piece') => {
  // Resalta las piezas dentro de la frase (las busca sin importar mayúsculas).
  const out = []; let rest = text;
  for (const p of parts) {
    const i = rest.toLowerCase().indexOf(p.toLowerCase());
    if (!p || i < 0) continue;
    out.push(rest.slice(0, i), h('mark', { class: cls }, rest.slice(i, i + p.length)));
    rest = rest.slice(i + p.length);
  }
  out.push(rest);
  return out;
};

function lessonIntro(lesson, back) {
  stopSpeaking();
  const x = lesson.exercises[0];
  const more = h('button', { onclick: () => moreWithAI(lesson, back, more) }, '✨ 5 más con IA');
  mount(h('div.screen.grammar', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: back }, '←'), h('h2', {}, `${lesson.icon} ${lesson.title}`)),
    h('p.muted', {}, `Nivel ${rankOf(lesson.rank).code} · ${rankOf(lesson.rank).name}`),
    h('div.card', {}, h('p', {}, lesson.idea)),
    h('div.card', {}, h('b', {}, 'Las piezas'),
      h('div.piece-table', {}, lesson.table.map(([es, en]) => [h('span', {}, es), h('span.muted', {}, '→'), h('button.link', { onclick: () => say(en) }, en)]))),
    h('div.card', {}, h('b', {}, 'Ejemplo, pieza por pieza'),
      h('p.sentence.es', {}, marked(x.es, x.pieces.map(p => p.es))),
      h('ul.piece-steps', {}, x.pieces.map(p => h('li', {}, h('mark.piece', {}, p.es), ' → ', h('b', {}, p.en)))),
      h('p', {}, '→ ', h('b', {}, marked(x.en, x.pieces.map(p => p.en), 'piece en')), ' ', h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(x.en) }, '🔊'))),
    h('button.primary.wide', { onclick: () => runPuzzle({ title: lesson.title, items: lesson.exercises, lessonId: lesson.id, back: () => lessonIntro(lesson, back), done: back }) },
      `Empezar (${lesson.exercises.length} ejercicios)`),
    hasAI() ? h('div.row.center', {}, more) : h('p.muted', {}, 'Con su clave de DeepSeek puede pedir más ejercicios de esta lección.')));
}

async function moreWithAI(lesson, back, btn) {
  btn.disabled = true; setText(btn, '✨ Creando…');
  try {
    const r = await chatJson('grammar', P.grammarMessages({ lesson, count: 5, rankId: store.get().rank, done: lesson.exercises.map(x => x.es) }), { temperature: 0.7, maxTokens: 1400 });
    const items = (r?.items || []).map(G.validExercise).filter(Boolean);
    if (!items.length) throw new Error('La IA no devolvió ejercicios válidos. Intente otra vez.');
    runPuzzle({ title: `${lesson.title} · IA`, items, back: () => lessonIntro(lesson, back), done: () => lessonIntro(lesson, back) });
  } catch (e) { toast(e.message, 'bad'); btn.disabled = false; setText(btn, '✨ 5 más con IA'); }
}

// ---------------- El rompecabezas: piezas → armar → decir ----------------
function runPuzzle({ title, items, lessonId = null, back, done }) {
  const listener = new Listener();
  const screen = h('div.screen.drill.puzzle', {});
  const score = { got: 0, max: 0 };
  const missed = [];
  let i = 0;
  const leave = () => { listener.abort?.(); stopSpeaking(); back(); };
  mount(screen);

  const header = (step) => [
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Salir', onclick: leave }, '✕'), h('h2', {}, title)),
    progressBar(i / items.length),
    h('p.muted.drill-step', {}, `${i + 1} de ${items.length} · ${step}`),
  ];

  function show() {
    stopSpeaking();
    if (i >= items.length) return finish();
    piecesStep(items[i], 0, true);
  }

  // Pasos 1-3: la frase en español y, pieza por pieza, elegir su equivalente en inglés.
  function piecesStep(x, k, clean) {
    const p = x.pieces[k];
    const result = h('div');
    let answered = false;
    const opts = G.shuffle([p.en, ...p.wrong]).map(o => {
      const btn = h('button.option', { onclick: () => pick(o, btn) }, o);
      return btn;
    });
    function pick(o, btn) {
      if (answered) return;
      answered = true;
      const ok = o === p.en;
      score.max++; if (ok) score.got++;
      if (!ok) clean = false;
      btn.classList.add(ok ? 'right' : 'wrong');
      if (!ok) opts.find(b => b.textContent === p.en)?.classList.add('right');
      buzz(ok ? 'good' : 'bad');
      fill(result, h('p', { class: ok ? 'good' : 'bad' }, ok ? '✅ Esa es la pieza' : `❌ La pieza es «${p.en}»`),
        h('button.primary.wide', { onclick: () => k + 1 < x.pieces.length ? piecesStep(x, k + 1, clean) : buildStep(x, clean) }, 'Seguir'));
      say(p.en);
    }
    fill(screen, ...header(`pieza ${k + 1} de ${x.pieces.length}`),
      h('p.sentence.es', {}, marked(x.es, [p.es])),
      h('p', {}, '¿Cómo se dice ', h('mark.piece', {}, p.es), ' en inglés?'),
      h('div.options', {}, opts),
      result);
  }

  // Paso 4: armar la frase con las fichas.
  function buildStep(x, clean) {
    const pool = G.tiles(x.en).map((w, k) => ({ w, k }));
    const chosen = [];
    const area = h('div.tile-answer', {});
    const tray = h('div.tile-tray', {});
    const result = h('div');
    let checked = false;
    function draw() {
      fill(area, chosen.length ? chosen.map((t, j) => h('button.tile', { onclick: () => { if (checked) return; chosen.splice(j, 1); draw(); } }, t.w)) : h('small.muted', {}, 'Toque las palabras en orden…'));
      fill(tray, pool.filter(t => !chosen.includes(t)).map(t => h('button.tile', { onclick: () => { if (checked) return; chosen.push(t); draw(); if (chosen.length === pool.length) check(); } }, t.w)));
    }
    function check() {
      checked = true;
      const attempt = chosen.map(t => t.w).join(' ');
      const ok = G.sameSentence(attempt, x.en);
      score.max++; if (ok) score.got++;
      if (!ok || !clean) missed.push(x);
      area.classList.add(ok ? 'right' : 'wrong');
      buzz(ok ? 'good' : 'bad');
      fill(result, ok ? h('p.good', {}, '✅ ¡Armada!') : [h('p.bad', {}, '❌ El orden no es ese'),
        h('div.correction.better', {}, h('small', {}, 'Así queda'), h('div', {}, x.en))],
      ok ? null : h('button', { onclick: () => { chosen.length = 0; checked = false; area.classList.remove('wrong'); fill(result); draw(); } }, 'Armarla otra vez'),
      h('button.primary.wide', { onclick: () => sayStep(x) }, 'Seguir'));
      say(x.en);
    }
    fill(screen, ...header('arme la frase'),
      h('p.sentence.es', {}, marked(x.es, x.pieces.map(p => p.es))),
      h('p.muted', {}, 'Piezas: ', x.pieces.map((p, j) => [j ? ' · ' : '', h('b', {}, p.en)])),
      area, tray, result);
    draw();
  }

  // Paso 5: decirla en voz alta (el teléfono compara palabra por palabra; no cuenta para la nota).
  function sayStep(x) {
    const result = h('div');
    const mic = h('button.primary', { onclick: () => listen() }, '🎤 Decirla');
    async function listen() {
      if (!canListen) { toast('Este navegador no reconoce voz: dígala en voz alta y siga.', 'bad'); return; }
      if (listener.active) { listener.stop(); return; }
      stopSpeaking();
      setText(mic, '⏹ Listo'); mic.classList.add('recording');
      fill(result, h('p.muted', {}, 'Escuchando…'));
      try {
        const { text } = await listener.start({ lang: store.get().settings.targetLang, onInterim: t => fill(result, h('p.muted', {}, t || 'Escuchando…')) });
        if (!text) { fill(result, h('p.muted', {}, 'No se escuchó nada. Intente otra vez.')); return; }
        const { states, score: sc } = wordStates(x.en, text);
        const v = verdict(sc);
        buzz(v.cls === 'bad' ? 'bad' : 'good');
        fill(result, h('p.sentence.words', {}, x.en.split(/\s+/).map((w, k) => [h('span.pron-word', { class: states[k] || 'miss' }, w), ' '])), h('p', { class: v.cls }, v.label));
      } catch (e) { fill(result, h('p.bad', {}, e.message)); }
      finally { setText(mic, '🎤 Decirla'); mic.classList.remove('recording'); }
    }
    fill(screen, ...header('dígala en voz alta'),
      h('p.sentence', {}, marked(x.en, x.pieces.map(p => p.en), 'piece en')),
      h('p.muted', {}, x.es),
      x.note ? h('p.muted', {}, '💡 ', x.note) : null,
      h('div.row', {}, h('button', { onclick: () => say(x.en) }, '🔊 Escuchar'), h('button', { onclick: () => say(x.en, 0.65) }, '🐢 Despacio'), mic),
      result,
      h('button.primary.wide', { onclick: () => { listener.abort?.(); i++; show(); } }, i + 1 < items.length ? 'Siguiente frase' : 'Ver resultado'));
    say(x.en);
  }

  function finish() {
    const pct = score.max ? score.got / score.max : 0;
    let nextL = null;
    if (lessonId) {
      store.update(s => {
        s.grammar = s.grammar || { best: {} };
        s.grammar.best[lessonId] = Math.max(s.grammar.best[lessonId] || 0, Math.round(pct * 100) / 100);
      });
      const l = G.lessonById(lessonId);
      const after = G.LESSONS[l.order + 1];
      if (pct >= G.PASS && after && G.unlocked(after, store.reachRank() === 6 ? 6 : store.get().rank, best())) nextL = after;
    }
    buzz(pct >= G.PASS ? 'good' : 'tap');
    const toReview = () => {
      let n = 0;
      for (const x of missed) if (addVocab({ text: x.en, translation: x.es, type: 'Phrase', source: 'grammar' })) n++;
      if (!n) toast('Ya estaban en su repaso');
    };
    fill(screen,
      h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: done }, '←'), h('h2', {}, title)),
      h('div.card.center', {},
        h('div.big-score', {}, `${Math.round(pct * 100)} %`),
        h('p', {}, `${score.got} de ${score.max} piezas y frases bien a la primera.`),
        h('p', { class: pct >= G.PASS ? 'good' : 'muted' }, pct >= G.PASS ? '🌟 ¡Lección aprobada!' : `Para aprobar hace falta el ${G.PASS * 100} %. Repítala: así se vuelve automático.`)),
      missed.length ? h('div.card', {}, h('b', {}, 'Para repasar'),
        missed.map(x => h('p', {}, h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(x.en) }, '🔊'), ' ', x.en, h('br'), h('small.muted', {}, x.es))),
        h('button.small', { onclick: toReview }, '📒 Llevarlas al repaso')) : null,
      nextL ? h('button.primary.wide', { onclick: () => lessonIntro(nextL, done) }, `Siguiente: ${nextL.title}`) : null,
      h('button.wide', { onclick: () => runPuzzle({ title, items: G.shuffle(items), lessonId, back, done }) }, 'Repetir'),
      h('button.wide', { onclick: done }, 'Volver'));
  }

  show();
}

// ---------------- Tabla de verbos ----------------
const st = { q: '', kind: 'all' };
function verbsTab(back) {
  const list = h('div.verb-list', {});
  const count = h('small.muted', {});
  const draw = () => {
    const found = G.searchVerbs(st.q, st.kind);
    setText(count, `${found.length} ${found.length === 1 ? 'verbo' : 'verbos'}`);
    const cats = [...new Set(found.map(v => v.catName))];
    fill(list, found.length ? cats.map(c => [
      h('h3.verb-cat', {}, c),
      found.filter(v => v.catName === c).map(verbRow),
    ]) : h('p.muted', {}, 'No hay verbos con esa búsqueda.'));
  };
  const input = h('input.text-input', { type: 'search', placeholder: 'Buscar en inglés o en español (ir, went, hecho…)', value: st.q, 'aria-label': 'Buscar verbo',
    oninput: e => { st.q = e.target.value; draw(); } });
  const kinds = [['all', 'Todos'], ['I', 'Irregulares'], ['R', 'Regulares']];
  const seg = h('div.segmented', {}, kinds.map(([k, label]) => h('button', { class: st.kind === k ? 'sel' : '', onclick: e => {
    st.kind = k; [...seg.children].forEach(b => b.classList.toggle('sel', b === e.currentTarget)); draw(); } }, label)));
  draw();
  return [
    h('p.muted', {}, 'Los verbos de su cerebro de inglés con sus tres formas. Los regulares solo suman -ed; los irregulares (en rojo) hay que aprenderlos. Toque uno para escucharlo y ver un ejemplo.'),
    input,
    h('div.row', {}, seg, count),
    h('button.primary.small', { onclick: () => verbQuiz(G.searchVerbs(st.q, st.kind), back) }, '🎯 Pruébese con estos verbos'),
    h('div.verb-head', {}, h('span', {}, 'Infinitivo'), h('span', {}, 'Pasado'), h('span', {}, 'Participio')),
    list,
  ];
}

function verbRow(v) {
  const irr = v.type !== 'R';
  const cell = (en, es, show) => h('span.verb-cell', { class: show && irr ? 'irr' : '' }, h('b', {}, en), h('small.muted', {}, es));
  return h('button.verb-row', { onclick: () => verbSheet(v) },
    cell(v.base === 'be' || v.type === 'M' ? v.base : `to ${v.base}`, v.es),
    cell(v.past, v.esPast, true),
    cell(v.pp, v.esPp, true));
}

function verbSheet(v) {
  const forms = [v.base, v.past, v.pp].filter(f => !f.startsWith('(')).join(', ');
  say(forms, 0.8);
  sheet(h('div', {},
    h('h3', {}, `${v.base} — ${v.es}`),
    h('p.muted', {}, `Verbo ${G.KIND[v.type]}${v.type === 'R' ? ': pasado y participio con -ed' : ''}.`),
    v.note ? h('p', {}, '💡 ', v.note) : null,
    h('table.verb-forms', {},
      h('tr', {}, h('th', {}, ''), h('th', {}, 'Inglés'), h('th', {}, 'Español')),
      [['Infinitivo', v.base, v.es], ['Pasado', v.past, v.esPast], ['Participio', v.pp, v.esPp]].map(([k, en, es]) =>
        h('tr', {}, h('td.muted', {}, k), h('td', {}, h('b', {}, en)), h('td', {}, es)))),
    v.example ? h('div.correction.better', {}, h('small', {}, 'Ejemplo'), h('div', {}, v.example), h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(v.example) }, '🔊')) : null,
    h('div.row', {},
      h('button', { onclick: () => say(forms, 0.8) }, '🔊 Las tres formas'),
      h('button', { onclick: () => addVocab({ text: `${v.base} / ${v.past} / ${v.pp}`, translation: `${v.es} / ${v.esPast} / ${v.esPp}`, type: 'Verb', source: 'grammar', context: v.example }) }, '📒 Al repaso')),
    h('button.wide', { onclick: closeSheet }, 'Cerrar')));
}

// «Pruébese»: ¿cómo se dice «fue»? con tres opciones del mismo verbo.
function verbQuiz(list, back) {
  const qs = G.verbQuestions(list, 8);
  if (!qs.length) { toast('No hay verbos para practicar con ese filtro.'); return; }
  const screen = h('div.screen.drill.puzzle', {});
  let i = 0, got = 0;
  const misses = [];
  mount(screen);
  function show() {
    if (i >= qs.length) return end();
    const q = qs[i];
    const result = h('div');
    let answered = false;
    const opts = q.options.map(o => {
      const b = h('button.option', { onclick: () => {
        if (answered) return;
        answered = true;
        const ok = o === q.right;
        if (ok) got++; else misses.push(q);
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) opts.find(x => x.textContent === q.right)?.classList.add('right');
        buzz(ok ? 'good' : 'bad');
        say(`${q.verb.base}, ${q.verb.past}, ${q.verb.pp}`.replace(/\(.*?\)/g, ''), 0.8);
        fill(result, h('p', { class: ok ? 'good' : 'bad' }, ok ? '✅ ¡Bien!' : `❌ Es «${q.right}»`),
          h('p.muted', {}, `${q.verb.base} → ${q.verb.past} → ${q.verb.pp}`),
          h('button.primary.wide', { onclick: () => { i++; show(); } }, i + 1 < qs.length ? 'Siguiente' : 'Ver resultado'));
      } }, o);
      return b;
    });
    fill(screen,
      h('div.topbar', {}, h('button.icon', { 'aria-label': 'Salir', onclick: () => { stopSpeaking(); back(); } }, '✕'), h('h2', {}, '🎯 Tabla de verbos')),
      progressBar(i / qs.length),
      h('p.muted.drill-step', {}, `${i + 1} de ${qs.length}`),
      h('p.sentence.es', {}, `«${q.es}»`),
      h('p', {}, `¿Cómo se dice en inglés? (${q.kind === 'past' ? 'pasado' : 'participio'} de «${q.verb.es}», to ${q.verb.base})`),
      h('div.options', {}, opts),
      result);
  }
  function end() {
    fill(screen,
      h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: back }, '←'), h('h2', {}, '🎯 Tabla de verbos')),
      h('div.card.center', {}, h('div.big-score', {}, `${got}/${qs.length}`),
        h('p', {}, got === qs.length ? '🌟 ¡Perfecto!' : 'Repase los que fallaron y vuelva a probar.')),
      misses.length ? h('div.card', {}, h('b', {}, 'Para repasar'),
        [...new Set(misses.map(q => q.verb))].map(v => h('p', {}, h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(`${v.base}, ${v.past}, ${v.pp}`, 0.8) }, '🔊'), ` ${v.base} → ${v.past} → ${v.pp}`, h('br'), h('small.muted', {}, `${v.es} → ${v.esPast} → ${v.esPp}`)))) : null,
      h('button.primary.wide', { onclick: () => verbQuiz(list, back) }, 'Otra ronda'),
      h('button.wide', { onclick: back }, 'Volver a la tabla'));
  }
  show();
}

// ---------------- Su frase (con IA) ----------------
function mineTab(back) {
  const input = h('textarea.text-input', { rows: 3, placeholder: 'Ej.: Si hubiera tenido tiempo, habría ido al gimnasio.', 'aria-label': 'Su frase en español' });
  const btn = h('button.primary', { onclick: () => go() }, '🧩 Partirla en piezas');
  async function go() {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    if (!hasAI()) { toast('Para esto hace falta su clave de DeepSeek (Ajustes). Para probar, escriba «demo».', 'bad'); return; }
    btn.disabled = true; setText(btn, 'Partiendo…');
    try {
      const r = await chatJson('grammar', P.grammarMessages({ sentence: text, rankId: store.get().rank }), { temperature: 0.3, maxTokens: 700 });
      const x = G.validExercise(r?.items?.[0]);
      if (!x) throw new Error('No se pudo partir esa frase. Pruebe con una frase que tenga verbos.');
      runPuzzle({ title: 'Su frase', items: [x], back, done: back });
    } catch (e) { toast(e.message, 'bad'); btn.disabled = false; setText(btn, '🧩 Partirla en piezas'); }
  }
  return [
    h('div.card', {},
      h('b', {}, 'Lo que usted quiere decir hoy'),
      h('p.muted', {}, 'Escriba en español una frase de su día. DeepSeek la parte en piezas y usted la arma en inglés con los mismos 5 pasos.'),
      input, btn),
    methodCard(),
  ];
}
