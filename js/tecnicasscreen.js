// Pantallas de las técnicas avanzadas (contenido y revisión en tecnicas.js): «Las 5 de hoy», dictado activo,
// adivine el final, sombra con intención, un minuto sin parar (JAM), frase que crece, una frase en 5 capas,
// cuéntelo de otra persona, ida y vuelta, mis frases (islas de lenguaje con STAR), el simulacro con imprevisto y
// responder en el momento (robar palabras de la pregunta + estructura de 3 partes).
// Casi todo funciona sin IA (voz del teléfono + revisión local); la IA solo pasa sus frases a inglés y revisa el minuto.
import * as store from './store.js';
import { chatJson, hasAI as aiReady } from './llm.js';
import * as P from './prompts.js';
import { h, mount, toast, progressBar, setText, buzz, spinner } from './ui.js';
import { speak, stopSpeaking, Listener, canListen } from './speech.js';
import { wordStates, tokens, verdict } from './pronounce.js';
import { addVocab } from './words.js';
import * as X from './tecnicas.js';
import { sendToWorkshop } from './workshop.js';
import { diarioScreen, grabarseScreen, paresScreen } from './practicascreen.js';

const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
const hasAI = () => aiReady();
const say = (t, rate = 0.9) => speak(t, { rate });
const pct = x => `${Math.round(x * 100)} %`;
const tec = () => store.get().tecnicas;
const listen = (text, rate = 0.9, label = '🔊') => h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(text, rate) }, label);
const audioRow = text => h('div.row', {}, h('button.tiny', { onclick: () => say(text) }, '🔊 Escuchar'), h('button.tiny', { onclick: () => say(text, 0.65) }, '🐢 Despacio'));
const topbar = (title, onBack, icon = '←') => h('div.topbar', {}, h('button.icon', { 'aria-label': icon === '✕' ? 'Salir' : 'Volver', onclick: onBack }, icon), h('h2', {}, title));

// La frase objetivo con cada palabra en verde (está), ámbar (parecida) o rojo (falta).
function colored(target, heard) {
  const { states } = wordStates(target, heard);
  let k = 0;
  return String(target).split(/\s+/).map(w => [h('span.pron-word', { class: tokens(w).length ? (states[k++] || 'miss') : 'ok' }, w), ' ']);
}

function record(id, score = null) {
  store.update(s => {
    const t = s.tecnicas;
    t.done[id] = (t.done[id] || 0) + 1;
    s.activity = store.logInto(s.activity, 'tecnica');
    if (score != null) t.best[id] = Math.max(t.best[id] || 0, Math.round(score * 100) / 100);
  });
}

function reviewButton(list) {
  return h('button.small', { onclick: () => {
    let n = 0;
    for (const x of list) if (x.es && addVocab({ text: x.en, translation: x.es, type: 'Phrase', source: 'tecnicas' })) n++;
    if (!n) toast('Ya estaban en su repaso');
  } }, '📒 Llevarlas al repaso');
}

// Botón de micrófono: escucha y entrega { text, durationMs }. heard muestra lo que va oyendo.
function micButton(listener, onDone, { label = '🎤 Decirla', heard = null, opts = {} } = {}) {
  const btn = h('button.primary', { onclick: async () => {
    if (!canListen) { toast('Este navegador no reconoce voz: escriba la frase.', 'bad'); return; }
    if (listener.active) { listener.stop(); return; }
    stopSpeaking();
    setText(btn, '⏹ Listo'); btn.classList.add('recording');
    if (heard) heard.textContent = 'Escuchando…';
    try {
      const r = await listener.start({ lang: store.get().settings.targetLang, onInterim: t => { if (heard) heard.textContent = t || 'Escuchando…'; }, ...opts });
      if (heard) heard.textContent = r.text ? '' : 'No se escuchó nada. Intente otra vez.';
      if (r.text && btn.isConnected) onDone(r);
    } catch (e) { if (heard) heard.textContent = e.message; }
    finally { setText(btn, label); btn.classList.remove('recording'); }
  } }, label);
  return btn;
}

// Decirla con el micrófono o escribirla. onAnswer(texto, durationMs).
// giveUp: texto del enlace para ver la respuesta sin decirla (llama a onAnswer con '').
function answerBox(listener, onAnswer, { label = '🎤 Decirla', placeholder = 'O escríbala en inglés…', giveUp = '' } = {}) {
  const heard = h('p.muted', {}, '');
  const input = h('input', { placeholder, enterkeyhint: 'send', autocapitalize: 'sentences', autocomplete: 'off', spellcheck: 'false' });
  const send = () => { const v = input.value.trim(); if (v) onAnswer(v, 0); };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  return h('div.say-controls', {},
    h('div.row', {}, micButton(listener, r => onAnswer(r.text, r.durationMs), { label, heard }), h('button', { onclick: send }, 'Enviar')),
    input, heard,
    giveUp ? h('button.link', { onclick: () => onAnswer('', 0) }, giveUp) : null);
}

// Elegir de dónde salen las frases (entrevista, su nivel, mis frases, su repaso).
function sourceChooser(min, onChange) {
  const s = store.get();
  const current = s.tecnicas.source || 'entrevista';
  return h('div.tec-sources', {}, h('small.muted', {}, 'Frases de:'),
    h('div.chips', {}, X.SOURCES.map(src => {
      const n = X.sourcePool(src.id, s).length;
      return h('button.chip', { class: src.id === current ? 'sel' : '', disabled: n < min ? true : null,
        onclick: () => { store.update(st => { st.tecnicas.source = src.id; }); onChange(); } },
      `${src.icon} ${src.name} (${n})`);
    })));
}
const currentPool = () => X.sourcePool(tec().source || 'entrevista', store.get());

// =====================================================================================
// Pantalla principal
// =====================================================================================
// startSim(lugar, misión, volver): abre una charla (la pone app.js, que conoce lugares y personajes).
export function tecnicasScreen({ home, startSim, mock }) {
  stopSpeaking();
  const s = store.get();
  const go = { home, startSim };
  const self = () => tecnicasScreen(go);
  const row = t => h('button.pack', { onclick: () => openTechnique(t.id, go, self) },
    h('span.pack-icon', {}, t.icon),
    h('span.pack-body', {}, h('span.pack-name', {}, t.name), h('small.muted', {}, t.what)),
    h('small.muted', {}, techniqueBadge(t.id, s)));

  mount(h('div.screen.tecnicas', {},
    topbar('🚀 Técnicas avanzadas', home),
    h('p.muted', {}, 'Sacadas de su cerebro de inglés. Cada una entrena algo distinto: elija según lo que más le cuesta.'),
    dailyCard(go, self),
    h('div.card.tec-interview', {},
      h('b', {}, '🎯 Para su entrevista'),
      h('p.muted', {}, 'Prepare sus respuestas con sus propias historias, dígalas sin parar y practique cuando algo no sale como esperaba.'),
      h('div.packs', {},
        h('button.small', { onclick: () => islandScreen(X.islandById('entrevista'), go, self) }, '🏝 Mis respuestas con STAR'),
        h('button.small', { onclick: () => jamSetup(go, self, 'entrevista') }, '⏱ Un minuto: preguntas de entrevista'),
        h('button.small', { onclick: () => simScreen(go, self, 'interview') }, '🎲 Entrevista con imprevisto'),
        h('button.small', { onclick: () => runResponder(answerSet('entrevista'), self) }, '🎯 Responder en el momento'),
        mock ? h('button.small', { onclick: mock }, '💼 Simulacro completo con nota') : null)),
    X.GROUPS.map(g => h('div', {},
      h('div.section-head', {}, h('h2', {}, g.name)),
      h('div.packs', {}, X.TECHNIQUES.filter(t => t.group === g.id).map(row))))));
}

function techniqueBadge(id, s) {
  const t = s.tecnicas;
  if (id === 'islas') return t.islas.length ? `${t.islas.length} frases` : '';
  if (id === 'ida') { const n = X.TEXTS.filter(x => X.idaState(t.ida[x.id]).state === 'listo').length; return n ? `${n} listo${n === 1 ? '' : 's'}` : (t.done.ida ? `✓ ${t.done.ida}` : ''); }
  const best = t.best[id];
  return best != null ? `✓ ${pct(best)}` : t.done[id] ? `✓ ${t.done[id]}` : '';
}

// «Las 5 de hoy»: repetición estructurada del DLI (las mismas frases todo el día, de 3 maneras distintas).
function dailyCard(go, self) {
  const s = store.get();
  const today = store.todayIso();
  const steps = s.tecnicas.today.date === today ? s.tecnicas.today.steps : [];
  const pool = currentPool();
  if (pool.length < X.DAILY_SIZE) return null;
  const items = X.dailySet(pool, today);
  const markDone = id => store.update(st => {
    if (st.tecnicas.today.date !== today) st.tecnicas.today = { date: today, steps: [] };
    if (!st.tecnicas.today.steps.includes(id)) st.tecnicas.today.steps.push(id);
  });
  const run = id => {
    const done = () => { markDone(id); self(); };
    if (id === 'dictado') runDictado({ items, back: self, onDone: done, title: '🎧 Las 5 de hoy' });
    else if (id === 'sombra') runSombra({ items, intention: X.INTENTIONS[0], back: self, onDone: done });
    else runMemoria({ items, back: self, onDone: done, title: '🎤 Las 5 de hoy' });
  };
  return h('div.card.tec-daily', {},
    h('div.dash-week-head', {}, h('b', {}, '🔁 Las 5 de hoy'), h('small.muted', {}, `${steps.length} de ${X.DAILY_STEPS.length}`)),
    h('p.muted', {}, 'Las mismas 5 frases todo el día, de tres maneras distintas (así lo hacen en el DLI): primero las oye, luego las repite y al final las dice de memoria. Mañana salen otras.'),
    sourceChooser(X.DAILY_SIZE, self),
    h('div.tec-steps', {}, X.DAILY_STEPS.map(st => h('button.dash-plan-row', { class: steps.includes(st.id) ? 'done' : '', onclick: () => run(st.id) },
      h('span.dash-check', {}, steps.includes(st.id) ? '✓' : ''),
      h('span.dash-plan-text', {}, h('b', {}, `${st.icon} ${st.name}`), h('small', {}, st.sub)),
      h('span.dash-go', {}, '›')))));
}

// Ficha de una técnica: qué es, por qué funciona y cómo se hace (del cerebro), y su forma de empezar.
function openTechnique(id, go, back) {
  stopSpeaking();
  const t = X.techniqueById(id);
  const again = () => openTechnique(id, go, back);
  const start = {
    dictado: () => [sourceChooser(X.DICTADO_SIZE, again),
      h('button.primary.wide', { onclick: () => runDictado({ items: X.pickSet(currentPool(), X.DICTADO_SIZE), back: again, again: true }) }, `🎧 Empezar (${X.DICTADO_SIZE} frases)`)],
    prediccion: () => {
      const n = X.predictionSet(currentPool(), X.PREDICT_SIZE).length;
      return [sourceChooser(12, again),
        n ? h('button.primary.wide', { onclick: () => runPrediccion({ items: X.predictionSet(currentPool(), X.PREDICT_SIZE), back: again }) }, `🔮 Empezar (${n} frases)`)
          : h('p.muted', {}, 'Esta fuente no tiene frases largas suficientes: elija otra.')];
    },
    sombra: () => sombraSetup(again),
    jam: () => [h('button.primary.wide', { onclick: () => jamSetup(go, again) }, '⏱ Elegir el tema')],
    crece: () => growingList(again),
    capas: () => capasSetup(again),
    cuento: () => storyList(again),
    ida: () => idaList(again),
    islas: () => islandsList(go, again),
    imprevisto: () => [h('button.primary.wide', { onclick: () => simScreen(go, again) }, '🎲 Elegir la situación')],
    grabarse: () => [h('button.primary.wide', { onclick: () => grabarseScreen({ home: again }) }, '🎙 Elegir qué grabar')],
    diario: () => [h('button.primary.wide', { onclick: () => diarioScreen({ home: again }) }, '✍ Abrir mi diario')],
    sonidos: () => [h('button.primary.wide', { onclick: () => paresScreen({ home: again }) }, '👂 Elegir los sonidos')],
    responder: () => [framesGuide(),
      h('div.packs', {}, X.ANSWER_GROUPS.map(g => h('button.pack', { onclick: () => runResponder(answerSet(g.id), again) },
        h('span.pack-icon', {}, g.icon),
        h('span.pack-body', {}, h('span.pack-name', {}, g.name), h('small.muted', {}, `${X.ANSWER_SIZE} preguntas al azar`)))))],
  }[id];
  mount(h('div.screen.tecnicas', {},
    topbar(`${t.icon} ${t.name}`, back),
    h('div.card', {}, h('b', {}, 'Qué es'), h('p', {}, t.what)),
    h('div.card', {}, h('b', {}, 'Por qué funciona'), h('p', {}, t.why)),
    h('div.card', {}, h('b', {}, 'Cómo se hace'), h('ol.tec-how', {}, t.how.map(x => h('li', {}, x)))),
    start()));
}

// =====================================================================================
// Dictado activo
// =====================================================================================
function runDictado({ items, back, onDone = null, again = false, title = '🎧 Dictado' }) {
  stopSpeaking();
  const screen = h('div.screen.drill.tecnica', {});
  const results = [];   // { x, score }
  let i = 0;
  mount(screen);
  const leave = () => { stopSpeaking(); back(); };

  function show() {
    if (i >= items.length) return finish();
    const x = items[i];
    let plays = 0, done = false;
    const count = h('small.muted', {}, '');
    const play = rate => { plays++; count.textContent = `Escuchó ${plays} ${plays === 1 ? 'vez' : 'veces'}`; say(x.en, rate); };
    const input = h('textarea', { rows: 2, placeholder: 'Escriba aquí exactamente lo que oye…', autocapitalize: 'sentences', autocomplete: 'off', spellcheck: 'false' });
    const result = h('div');
    const controls = h('div.say-controls', {},
      h('div.row', {}, h('button.primary', { onclick: () => play(0.9) }, '🔊 Escuchar'), h('button', { onclick: () => play(0.65) }, '🐢 Despacio')),
      count, input,
      h('div.row', {}, h('button.primary', { onclick: () => input.value.trim() && check(input.value.trim()) }, 'Revisar'),
        h('button.link', { onclick: () => check('') }, 'No entendí, muéstremela')));

    function check(typed) {
      if (done) return;
      done = true;
      const r = X.compare(x.en, typed);
      const entry = { x, score: r.score };
      results.push(entry);
      controls.remove();
      buzz(r.exact ? 'good' : 'bad');
      const hints = X.connectedHints(x.en);
      fill(result,
        h('p', { class: !typed ? 'muted' : r.exact ? 'good' : r.close ? 'warn' : 'bad' },
          !typed ? 'Así era:' : r.exact ? '✅ ¡Exacta!' : r.close ? '⚠ Casi: le falta o le sobra una palabra.' : `❌ Oyó bien el ${pct(r.score)}.`),
        typed && !r.exact ? h('p.muted.words', {}, 'Usted escribió: ', colored(typed, x.en)) : null,
        h('div.correction.better', {}, h('small', {}, 'La frase'), h('div.words', {}, typed && !r.exact ? colored(x.en, typed) : x.en),
          h('small', {}, x.es), audioRow(x.en)),
        hints.length ? h('div.tec-connected', {}, h('small.muted', {}, 'Así suena rápido:'),
          hints.map(c => h('span.chip', {}, `${c.written} → «${c.sounds}»`))) : null,
        !r.exact ? h('p.why', {}, h('b', {}, '💡 '), 'Mire las palabras marcadas en color. Si las conocía, fue el oído: al hablar rápido se unen y se comen sonidos; escúchela otra vez despacio. Si no las conocía, guarde la frase.') : null,
        !r.exact && x.es ? h('button.tiny', { onclick: () => addVocab({ text: x.en, translation: x.es, type: 'Phrase', source: 'tecnicas' }) }, '📒 Guardar en el repaso') : null,
        h('div.row', {},
          h('button', { onclick: () => { results.splice(results.indexOf(entry), 1); show(); } }, '🔁 Otra vez'),
          h('button.primary', { onclick: () => { i++; show(); } }, i + 1 < items.length ? 'Seguir' : 'Ver resultado')));
    }

    fill(screen,
      topbar(title, leave, '✕'),
      progressBar(i / items.length),
      h('p.muted.drill-step', {}, `${i + 1} de ${items.length} · escriba lo que oye, palabra por palabra`),
      controls, result);
    setTimeout(() => { if (screen.isConnected && !plays) play(0.9); }, 350);
  }

  function finish() {
    const avg = results.length ? results.reduce((a, r) => a + r.score, 0) / results.length : 0;
    record('dictado', avg);
    buzz(avg >= 0.8 ? 'good' : 'tap');
    const missed = results.filter(r => r.score < 1).map(r => r.x);
    fill(screen,
      topbar(title, back),
      h('div.card.center', {}, h('div.big-score', {}, pct(avg)), h('p', {}, `Exactas: ${results.filter(r => r.score >= 1).length} de ${items.length}.`),
        h('p.muted', {}, avg >= 0.8 ? '🌟 Su oído ya reconoce estas frases.' : 'Vuelva a escuchar las de abajo despacio y en voz alta: así se le pegan.')),
      missed.length ? h('div.card', {}, h('b', {}, 'Para volver a escuchar'),
        missed.map(x => h('p', {}, listen(x.en), ' ', x.en, h('br'), h('small.muted', {}, x.es))), reviewButton(missed)) : null,
      onDone ? h('button.primary.wide', { onclick: onDone }, 'Listo') : null,
      again ? h('button.primary.wide', { onclick: () => runDictado({ items: X.pickSet(currentPool(), items.length), back, again }) }, 'Otra ronda') : null,
      h('button.wide', { onclick: back }, 'Volver'));
  }

  show();
}

// =====================================================================================
// Adivine el final
// =====================================================================================
function runPrediccion({ items, back }) {
  stopSpeaking();
  const screen = h('div.screen.drill.tecnica', {});
  let i = 0, got = 0;
  mount(screen);
  const leave = () => { stopSpeaking(); back(); };

  function show() {
    if (i >= items.length) return finish();
    const x = items[i];
    let answered = false;
    const result = h('div');
    const sentence = h('p.sentence', {}, x.start, ' ', h('span.gap', {}, '…'));
    const opts = x.options.map(o => {
      const b = h('button.option', { onclick: () => pick(o, b) }, `…${o}`);
      return b;
    });
    function pick(o, b) {
      if (answered) return;
      answered = true;
      const ok = o === x.end;
      if (ok) got++;
      b.classList.add(ok ? 'right' : 'wrong');
      if (!ok) opts.find(y => y.textContent === `…${x.end}`)?.classList.add('right');
      fill(sentence, x.start, ' ', h('b', {}, x.end));
      buzz(ok ? 'good' : 'bad');
      fill(result,
        h('p', { class: ok ? 'good' : 'bad' }, ok ? '✅ ¡La adivinó!' : '❌ Terminaba de otra forma.'),
        h('small.muted', {}, x.es),
        h('p.muted', {}, 'Ahora repítala completa en voz alta.'),
        audioRow(x.full),
        h('button.primary.wide', { onclick: () => { i++; show(); } }, i + 1 < items.length ? 'Seguir' : 'Ver resultado'));
      say(x.full);
    }
    fill(screen,
      topbar('🔮 Adivine el final', leave, '✕'),
      progressBar(i / items.length),
      h('p.muted.drill-step', {}, `${i + 1} de ${items.length} · ¿cómo termina?`),
      h('div.row', {}, h('button', { onclick: () => say(x.start) }, '🔊 Oír el comienzo'), h('button', { onclick: () => say(x.start, 0.65) }, '🐢')),
      sentence, h('div.options', {}, opts), result);
    setTimeout(() => { if (screen.isConnected && !answered) say(x.start); }, 350);
  }

  function finish() {
    const score = items.length ? got / items.length : 0;
    record('prediccion', score);
    fill(screen,
      topbar('🔮 Adivine el final', back),
      h('div.card.center', {}, h('div.big-score', {}, pct(score)), h('p', {}, `Adivinó ${got} de ${items.length}.`),
        h('p.muted', {}, 'Para seguir entrenándolo: cuando vea un video, páuselo a mitad de una frase y adivine cómo termina.')),
      h('button.primary.wide', { onclick: () => runPrediccion({ items: X.predictionSet(currentPool(), X.PREDICT_SIZE), back }) }, 'Otra ronda'),
      h('button.wide', { onclick: back }, 'Volver'));
  }

  show();
}

// =====================================================================================
// Sombra con intención
// =====================================================================================
function sombraSetup(again) {
  const s = store.get();
  const chosen = X.INTENTIONS.find(x => x.id === s.tecnicas.intention) || X.INTENTIONS[0];
  return [
    h('div.card', {}, h('b', {}, '1. Elija su intención'),
      h('div.packs', {}, X.INTENTIONS.map(it => h('button.pack', { class: it.id === chosen.id ? 'sel' : '',
        onclick: () => { store.update(st => { st.tecnicas.intention = it.id; }); again(); } },
      h('span.pack-icon', {}, it.icon), h('span.pack-body', {}, h('span.pack-name', {}, it.name), h('small.muted', {}, it.how)),
      h('small', {}, it.id === chosen.id ? '✓' : ''))))),
    h('div.card', {}, h('b', {}, '2. Elija las frases'), sourceChooser(X.SOMBRA_SIZE, again)),
    h('button.primary.wide', { onclick: () => runSombra({ items: X.pickSet(currentPool(), X.SOMBRA_SIZE), intention: chosen, back: again, again: true }) },
      `🗣 Empezar (${X.SOMBRA_SIZE} frases)`),
  ];
}

// La frase marcada según la intención.
function markedSentence(en, intention) {
  if (intention.id === 'fuertes') return X.stressMap(en).map(x => [h(x.strong ? 'b.stress' : 'span.weak', {}, x.w), ' ']);
  if (intention.id === 'finales') return X.endingMap(en).map(x => [h('span', {}, x.base, x.end ? h('u.ending', {}, x.end) : null, x.punct), ' ']);
  return en;
}

function runSombra({ items, intention, back, onDone = null, again = false }) {
  stopSpeaking();
  const screen = h('div.screen.drill.tecnica', {});
  const listener = new Listener();
  const best = items.map(() => 0);
  let i = 0;
  mount(screen);
  const leave = () => { listener.abort(); stopSpeaking(); back(); };

  function show() {
    if (i >= items.length) return finish();
    const x = items[i];
    const result = h('div');
    const heard = h('p.muted', {}, '');
    let tries = 0;
    const extra = intention.id === 'melodia' ? h('p.tec-tune', { class: X.tune(x.en).dir }, X.tune(x.en).label)
      : intention.id === 'union' ? (X.connectedHints(x.en).length
        ? h('div.tec-connected', {}, X.connectedHints(x.en).map(c => h('span.chip', {}, `${c.written} → «${c.sounds}»`)))
        : h('p.muted', {}, 'Escuche cómo el final de cada palabra se pega al comienzo de la siguiente.')) : null;
    const onSaid = ({ text }) => {
      tries++;
      const { score } = wordStates(x.en, text);
      best[i] = Math.max(best[i], score / 100);
      const v = verdict(score);
      buzz(score >= 70 ? 'good' : 'bad');
      fill(result,
        h('p', { class: v.cls }, `${score >= 90 ? '✅ ' : ''}${v.label} (${score} %)`),
        h('p.words', {}, colored(x.en, text)),
        h('small.muted', {}, `Intento ${tries}. Repítala las veces que quiera: una frase muchas veces vale más que muchas frases una vez.`));
    };
    fill(screen,
      topbar(`${intention.icon} Sombra: ${intention.name}`, leave, '✕'),
      progressBar(i / items.length),
      h('p.muted.drill-step', {}, `${i + 1} de ${items.length}`),
      h('details.tec-intent', {}, h('summary', {}, `Su intención: ${intention.name}`), h('p.muted', {}, intention.how)),
      h('p.sentence.tec-shadow', {}, markedSentence(x.en, intention)),
      extra,
      x.es ? h('p.muted', {}, x.es) : null,
      h('div.row.tec-speeds', {},
        h('button', { onclick: () => say(x.en, 0.65) }, '🐢 Despacio'),
        h('button', { onclick: () => say(x.en, 0.9) }, '🔊 Normal'),
        h('button', { onclick: () => say(x.en, 1.1) }, '🐇 Rápido')),
      h('div.say-controls', {},
        canListen ? micButton(listener, onSaid, { label: '🎤 Repetirla', heard }) : h('p.muted', {}, 'Este navegador no reconoce voz: repítala igual en voz alta, imitando la voz.'),
        heard),
      result,
      h('button.wide', { onclick: () => { listener.abort(); i++; show(); } }, i + 1 < items.length ? 'Siguiente frase →' : 'Terminar'));
    setTimeout(() => { if (screen.isConnected) say(x.en, 0.9); }, 350);
  }

  function finish() {
    const score = best.reduce((a, b) => a + b, 0) / (items.length || 1);
    const tried = best.some(b => b > 0);   // sin micrófono (o sin intentos) no hay nota
    record('sombra', tried ? score : null);
    fill(screen,
      topbar('🗣 Sombra', back),
      h('div.card.center', {}, tried ? h('div.big-score', {}, pct(score)) : null,
        h('p', {}, '¡Listo! Lo que entrena la sombra se nota en unos días: vuelva a hacerla con las mismas frases.'),
        h('p.muted', {}, 'Consejo: grabe una frase con la grabadora del teléfono y escúchese. Desde afuera se notan cosas que al hablar no.')),
      onDone ? h('button.primary.wide', { onclick: onDone }, 'Listo') : null,
      again ? h('button.primary.wide', { onclick: () => runSombra({ items, intention, back, again }) }, 'Las mismas otra vez') : null,
      again ? h('button.wide', { onclick: () => runSombra({ items: X.pickSet(currentPool(), items.length), intention, back, again }) }, 'Otras frases') : null,
      h('button.wide', { onclick: back }, 'Volver'));
  }

  show();
}

// =====================================================================================
// Decirlas de memoria (desde el español)
// =====================================================================================
function runMemoria({ items, back, onDone = null, title = '🎤 De memoria' }) {
  stopSpeaking();
  const screen = h('div.screen.drill.tecnica', {});
  const listener = new Listener();
  const results = [];
  let i = 0;
  mount(screen);
  const leave = () => { listener.abort(); stopSpeaking(); back(); };

  function show() {
    if (i >= items.length) return finish();
    const x = items[i];
    let done = false;
    const result = h('div');
    let box;
    const check = said => {
      if (done) return;
      done = true;
      listener.abort();
      box.remove();
      const r = X.compare(x.en, said);
      const entry = { x, ok: r.exact };
      results.push(entry);
      buzz(r.exact ? 'good' : 'bad');
      const selfOk = h('button', { onclick: () => { entry.ok = true; selfOk.remove(); toast('Anotada como bien dicha'); } }, '✅ Lo dije bien');
      fill(result,
        h('p', { class: !said ? 'muted' : r.exact ? 'good' : r.close ? 'warn' : 'bad' },
          !said ? 'Así se dice:' : r.exact ? '✅ ¡Perfecto!' : r.close ? '⚠ Casi: le sobra o le falta una palabra.' : '❌ No es la misma frase.'),
        said && !r.exact ? h('p.muted.words', {}, 'Usted dijo: ', colored(said, x.en)) : null,
        h('div.correction.better', {}, h('small', {}, 'Así se dice'), h('div.words', {}, said && !r.exact ? colored(x.en, said) : x.en), audioRow(x.en)),
        said && !r.exact ? h('p.muted', {}, '¿El teléfono le entendió mal? ', selfOk) : null,
        h('div.row', {},
          h('button', { onclick: () => { results.splice(results.indexOf(entry), 1); show(); } }, '🔁 Otra vez'),
          h('button.primary', { onclick: () => { i++; show(); } }, i + 1 < items.length ? 'Seguir' : 'Ver resultado')));
      say(x.en);
    };
    box = answerBox(listener, check, { giveUp: 'No me acuerdo, muéstremela' });
    fill(screen,
      topbar(title, leave, '✕'),
      progressBar(i / items.length),
      h('p.muted.drill-step', {}, `${i + 1} de ${items.length} · dígala en inglés, de memoria`),
      h('p.sentence.es', {}, x.es || '(sin traducción)'),
      box,
      result);
  }

  function finish() {
    const ok = results.filter(r => r.ok).length;
    const score = items.length ? ok / items.length : 0;
    record('memoria', score);
    const missed = results.filter(r => !r.ok).map(r => r.x);
    fill(screen,
      topbar(title, back),
      h('div.card.center', {}, h('div.big-score', {}, pct(score)), h('p', {}, `Dijo bien ${ok} de ${items.length}.`),
        h('p.muted', {}, score >= 0.8 ? '🌟 Ya son suyas.' : 'Fallar al principio está bien: ese esfuerzo de casi acordarse es lo que las fija. Repita en un rato.')),
      missed.length ? h('div.card', {}, h('b', {}, 'Para repetir'), missed.map(x => h('p', {}, listen(x.en), ' ', x.en, h('br'), h('small.muted', {}, x.es))), reviewButton(missed)) : null,
      onDone ? h('button.primary.wide', { onclick: onDone }, 'Listo') : null,
      h('button.wide', { onclick: () => runMemoria({ items: X.pickSet(items, items.length), back, onDone, title }) }, 'Otra vez'),
      h('button.wide', { onclick: back }, 'Volver'));
  }

  show();
}

// =====================================================================================
// Un minuto sin parar (JAM)
// =====================================================================================
function jamSetup(go, back, group = null) {
  stopSpeaking();
  const again = () => jamSetup(go, back, group);
  const s = store.get();
  const last = s.tecnicas.jam.slice(-1)[0];
  const groups = group ? X.JAM_GROUPS.filter(g => g.id === group) : X.JAM_GROUPS;
  const random = () => { const list = X.JAM_TOPICS.filter(t => !group || t.group === group); runJam(list[Math.floor(Math.random() * list.length)], again); };
  mount(h('div.screen.tecnicas', {},
    topbar('⏱ Un minuto sin parar', back),
    h('div.card', {}, h('b', {}, 'Las 3 reglas'),
      h('ol.tec-how', {}, h('li', {}, 'No pare: respirar está bien, pero nunca más de 3 segundos. Si se queda en blanco, diga cualquier cosa relacionada.'),
        h('li', {}, 'No repita la misma idea: obligue al cerebro a producir cosas nuevas.'), h('li', {}, 'No escriba mientras habla: solo hable.'))),
    h('div.card', {}, h('b', {}, 'Si se queda en blanco'),
      X.JAM_FRAME.map(([es, en]) => h('p', {}, h('b', {}, `${es}: `), h('span.muted', {}, en)))),
    last ? h('p.muted', {}, `La última vez: «${last.topic}», de ${last.rounds[0] || 0} a ${last.rounds[last.rounds.length - 1] || 0} palabras por minuto.`) : null,
    h('button.primary.wide', { onclick: random }, '🎲 Un tema al azar'),
    groups.map(g => h('div', {}, h('div.section-head', {}, h('h2', {}, g.name)),
      h('div.packs', {}, X.JAM_TOPICS.filter(t => t.group === g.id).map(t => h('button.pack', { onclick: () => runJam(t, again) },
        h('span.pack-body', {}, h('span.pack-name', {}, t.es), h('small.muted', {}, t.en)))))))));
}

function runJam(topic, back) {
  stopSpeaking();
  const screen = h('div.screen.drill.tecnica.tec-jam', {});
  const listener = new Listener();
  const rounds = [];   // { text, stats }
  let notes = '';
  let timer = null, saved = false;
  mount(screen);
  const stop = () => { clearInterval(timer); listener.abort(); stopSpeaking(); };
  const leave = () => { stop(); back(); };
  const topicCard = () => h('div.card.tec-topic', {}, h('small.muted', {}, 'Tema'), h('b', {}, topic.es), h('div', {}, h('span.muted', {}, topic.en), ' ', listen(topic.en)));

  // noMic: el micrófono falló (o no hay): se hace solo con el reloj, sin conteo de palabras.
  function round(n, noMic = false) {
    const useMic = canListen && !noMic;
    const info = X.JAM_ROUNDS[n];
    const notesBox = n > 0 ? h('textarea.tec-notes', { rows: 4, placeholder: n === 1 ? 'Sus 3 o 4 ideas clave (en inglés o en español)…' : 'Agregue uno o dos detalles a sus notas…' }) : null;
    if (notesBox) { notesBox.value = notes; notesBox.addEventListener('input', () => { notes = notesBox.value; }); }
    const clock = h('div.tec-clock', {}, '1:00');
    const live = h('p.muted.tec-live', {}, '');
    const startBtn = h('button.primary.wide', { onclick: () => go() }, useMic ? '🎤 Empezar el minuto' : '⏱ Empezar el minuto');
    fill(screen,
      topbar(`⏱ ${info.name}`, leave, '✕'),
      progressBar(n / X.JAM_ROUNDS.length),
      topicCard(),
      h('p', {}, info.how),
      notesBox ? h('div', {}, h('small.muted', {}, n === 1 ? 'Sus notas (anote antes de empezar)' : 'Sus notas'), notesBox) : null,
      h('details.tec-frame', {}, h('summary', {}, 'Si se queda en blanco'), X.JAM_FRAME.map(([es, en]) => h('p', {}, h('b', {}, `${es}: `), en))),
      clock, startBtn, live,
      !useMic ? h('p.muted', {}, `${canListen ? 'Sin micrófono' : 'Este navegador no reconoce voz'}: hable igual en voz alta con el reloj. No habrá conteo de palabras.`) : null,
      noMic && canListen ? h('button.link', { onclick: () => round(n) }, '🎤 Probar otra vez con el micrófono') : null);

    async function go() {
      startBtn.remove();
      if (notesBox) notesBox.readOnly = true;
      const t0 = performance.now();
      let lastSpeech = t0, lastText = '', inPause = false, pauses = 0, finished = false;
      const stopBtn = h('button.wide', { onclick: () => end() }, '⏹ Terminar antes');
      clock.after(stopBtn);
      buzz('tap');
      const end = () => { if (finished) return; finished = true; clearInterval(timer); if (useMic) listener.stop(); else done(''); };
      timer = setInterval(() => {
        const now = performance.now(), left = Math.max(0, X.JAM_SECONDS - (now - t0) / 1000);
        setText(clock, `0:${String(Math.ceil(left)).padStart(2, '0')}`.replace('0:60', '1:00'));
        clock.classList.toggle('low', left <= 10);
        if (now - lastSpeech > X.LONG_PAUSE_MS && !inPause && now - t0 > X.LONG_PAUSE_MS) { inPause = true; pauses++; clock.classList.add('pause'); }
        if (left <= 0) end();
      }, 200);
      const done = text => {
        clearInterval(timer);
        const elapsed = Math.min(X.JAM_SECONDS, (performance.now() - t0) / 1000);
        const secs = Math.max(5, elapsed);
        rounds[n] = { n, text, mic: useMic, secs: Math.round(elapsed), stats: X.talkStats(text, secs, useMic ? pauses : 0) };
        buzz('star');
        after(n);
      };
      if (!useMic) return;
      try {
        const r = await listener.start({ lang: store.get().settings.targetLang, firstWordMs: (X.JAM_SECONDS + 10) * 1000, pauseMs: (X.JAM_SECONDS + 10) * 1000,
          onInterim: t => {
            if (t && t !== lastText) { lastText = t; lastSpeech = performance.now(); inPause = false; clock.classList.remove('pause'); }
            live.textContent = t.split(/\s+/).slice(-14).join(' ');
          } });
        finished = true;
        if (screen.isConnected) done(r.text);
      } catch (e) { clearInterval(timer); toast(e.message, 'bad'); if (screen.isConnected) round(n, true); }
    }
  }

  function statsTable(list) {
    return h('table.tec-table', {},
      h('tr', {}, h('th', {}, ''), h('th', {}, 'Palabras por minuto'), h('th', {}, 'Pausas largas'), h('th', {}, 'Muletillas')),
      list.map(r => h('tr', {}, h('td', {}, `Ronda ${r.n + 1}`), h('td', {}, String(r.stats.wpm)), h('td', {}, String(r.stats.pauses)), h('td', {}, String(r.stats.fillers)))));
  }

  function after(n) {
    const r = rounds[n];
    const full = r.secs >= X.JAM_SECONDS - 5;   // sin micrófono: ¿llegó (casi) al minuto?
    const last = n + 1 >= X.JAM_ROUNDS.length;
    fill(screen,
      topbar(`⏱ ${X.JAM_ROUNDS[n].name}`, leave, '✕'),
      progressBar((n + 1) / X.JAM_ROUNDS.length),
      h('div.card.center', {},
        r.mic ? h('div.big-score', {}, String(r.stats.wpm)) : h('div.big-score', {}, full ? '✓' : `${r.secs} s`),
        r.mic ? h('p', {}, 'palabras por minuto') : h('p', {}, full ? '¡Un minuto completo!' : `Habló ${r.secs} segundos. La próxima vez intente llegar al minuto, aunque repita ideas con otras palabras.`),
        r.mic ? h('p.muted', {}, `${r.stats.words} palabras · ${r.stats.pauses} ${r.stats.pauses === 1 ? 'pausa' : 'pausas'} de más de 3 s${r.stats.fillers ? ` · ${r.stats.fillers} ${r.stats.fillers === 1 ? 'muletilla' : 'muletillas'}` : ''}`) : null,
        n > 0 && r.mic && rounds[0].mic ? h('p', { class: r.stats.wpm >= rounds[0].stats.wpm ? 'good' : 'muted' },
          r.stats.wpm >= rounds[0].stats.wpm ? `Más fluido que en la ronda 1 (${rounds[0].stats.wpm}).` : `En la ronda 1 fueron ${rounds[0].stats.wpm}: con las notas ordene y estire las ideas.`) : null),
      r.text ? h('div.card.said-card', {}, h('small.muted', {}, '🗣 Lo que se le entendió'), h('p', {}, r.text)) : null,
      n === 0 ? h('p', {}, 'Ahora anote 3 o 4 ideas clave de lo que dijo (o quiso decir). Con eso hará la ronda 2.') : null,
      !last ? h('button.primary.wide', { onclick: () => round(n + 1, !r.mic) }, `Seguir: ${X.JAM_ROUNDS[n + 1].name}`) : h('button.primary.wide', { onclick: () => finish() }, 'Ver resultado'),
      h('button.wide', { onclick: () => round(n, !r.mic) }, 'Repetir esta ronda'));
  }

  // Cuánto habló en total, para cuando no hubo conteo de palabras.
  function talkedText(list) {
    if (list.length === X.JAM_ROUNDS.length && list.every(r => r.secs >= X.JAM_SECONDS - 5)) return '¡Tres minutos hablando en inglés!';
    const total = list.reduce((a, r) => a + (r.secs || 0), 0);
    const time = total >= 60 ? `${Math.floor(total / 60)} min ${total % 60} s` : `${total} segundos`;
    return `¡${time} hablando en inglés!`;
  }

  function finish() {
    const list = rounds.filter(Boolean);
    const measured = list.filter(r => r.mic);
    const prog = X.jamProgress(measured.map(r => r.stats));
    if (!saved) {   // al volver de la sombra se vuelve a mostrar sin contarlo dos veces
      saved = true;
      if (measured.length) store.update(s => { s.tecnicas.jam = [...s.tecnicas.jam, { date: store.todayIso(), topic: topic.es, rounds: measured.map(r => r.stats.wpm) }].slice(-30); });
      record('jam');
    }
    const lastText = list[list.length - 1]?.text || '';
    const ai = h('div');
    fill(screen,
      topbar('⏱ Un minuto sin parar', back),
      topicCard(),
      h('div.card.center', {},
        measured.length > 1 && prog.first ? h('div.big-score', {}, `${prog.gain >= 0 ? '+' : ''}${prog.gain} %`) : h('div.big-score', {}, '🌟'),
        h('p', {}, measured.length > 1 && prog.first ? `De ${prog.first} a ${prog.last} palabras por minuto.` : talkedText(list)),
        h('p.muted', {}, 'Para seguir: grábese diciendo el minuto una cuarta vez y escúchese en unas semanas. Notará el avance.')),
      measured.length ? h('div.card', {}, statsTable(measured)) : null,
      hasAI() && lastText ? h('button.primary.wide', { onclick: e => aiFeedback(e.currentTarget) }, '🧑‍🏫 Que la IA revise lo que dije') : null,
      !hasAI() ? h('p.muted', {}, 'Con su clave de IA, la IA le dice qué decir mejor y le da una versión natural para practicar.') : null,
      ai,
      h('button.wide', { onclick: () => runJam(topic, back) }, 'Otra vez con este tema'),
      h('button.wide', { onclick: back }, 'Otro tema'));

    async function aiFeedback(btn) {
      btn.disabled = true;
      fill(ai, spinner('Revisando su minuto…'));
      try {
        const r = await chatJson('jam', P.jamMessages({ topic: topic.en, text: lastText, rankId: store.get().rank }), { temperature: 0.4, maxTokens: 900 });
        const version = (Array.isArray(r.version) ? r.version : []).filter(v => v?.en).map(v => ({ en: String(v.en), es: String(v.es || '') }));
        btn.remove();
        fill(ai,
          r.good ? h('p.good', {}, '👍 ', r.good) : null,
          (r.fixes || []).length ? h('div.card', {}, h('b', {}, 'Para decirlo mejor'), (r.fixes || []).map(f => h('div.trap', {},
            h('div', {}, h('s.bad', {}, f.said), ' → ', h('b.good', {}, f.better), ' ', listen(f.better)), h('small.muted', {}, f.why)))) : null,
          version.length ? h('div.card', {}, h('b', {}, 'Su minuto, dicho de forma natural'),
            version.map(v => h('p', {}, listen(v.en), ' ', v.en, v.es ? [h('br'), h('small.muted', {}, v.es)] : null)),
            h('div.row', {},
              h('button.small', { onclick: () => runSombra({ items: version, intention: X.INTENTIONS[0], back: () => finish() }) }, '🗣 Repetirla en sombra'),
              version.every(v => v.es) ? h('button.small', { onclick: () => saveVersion(version) }, '🏝 Guardarla en Mis frases') : null)) : null,
          r.tip ? h('p.muted', {}, '💡 ', r.tip) : null);
      } catch (e) { btn.disabled = false; fill(ai, h('p.bad', {}, e.message)); }
    }
    function saveVersion(version) {
      const island = topic.group === 'entrevista' ? 'entrevista' : topic.group === 'opinion' ? 'opiniones' : 'dia';
      const before = tec().islas.length;
      store.update(s => { s.tecnicas.islas = X.addIslandItems(s.tecnicas.islas, island, version); });
      const n = tec().islas.length - before;
      toast(n ? `🏝 ${n} frases guardadas en «${X.islandById(island).name}»` : 'Ya estaban en Mis frases', n ? 'good' : '');
    }
  }

  round(0);
}

// =====================================================================================
// Frase que crece
// =====================================================================================
function growingList(back) {
  const best = tec().best;
  return [h('div.packs', {}, X.GROWING.map(g => h('button.pack', { onclick: () => runCrece(g, back) },
    h('span.pack-icon', {}, g.icon),
    h('span.pack-body', {}, h('span.pack-name', {}, g.title), h('small.muted', {}, g.steps[0][0])),
    h('small.muted', {}, best[`crece:${g.id}`] != null ? `✓ ${pct(best[`crece:${g.id}`])}` : ''))))];
}

function runCrece(chain, back, hidden = false) {
  stopSpeaking();
  const screen = h('div.screen.drill.tecnica', {});
  const listener = new Listener();
  const firstTry = chain.steps.map(() => null);   // true/false: la dijo bien al primer intento
  let i = 0, hide = hidden;
  mount(screen);
  const leave = () => { listener.abort(); stopSpeaking(); back(); };

  function show() {
    if (i >= chain.steps.length) return finish();
    const [en, es] = chain.steps[i];
    const piece = X.newPiece(chain.steps, i);
    const before = i ? en.slice(0, en.length - piece.length) : '';
    const result = h('div');
    const text = h('p.sentence.tec-grow', { class: hide ? 'hidden-text' : '' }, before, h('b.tec-new', {}, piece));
    const onSaid = said => {
      const r = X.compare(en, said);
      if (firstTry[i] == null) firstTry[i] = r.exact;
      buzz(r.exact ? 'good' : 'bad');
      fill(result,
        h('p', { class: r.exact ? 'good' : r.close ? 'warn' : 'bad' }, r.exact ? '✅ ¡Completa!' : r.close ? '⚠ Casi: le sobra o le falta una palabra.' : '❌ Falta parte de la frase.'),
        !r.exact ? h('p.words', {}, colored(en, said)) : null,
        h('div.row', {}, h('button.primary', { onclick: () => { listener.abort(); i++; show(); } }, i + 1 < chain.steps.length ? 'Siguiente pieza' : 'Ver resultado')));
    };
    fill(screen,
      topbar(`🧱 ${chain.title}`, leave, '✕'),
      progressBar(i / chain.steps.length),
      h('p.muted.drill-step', {}, `Nivel ${i + 1} de ${chain.steps.length} · ${tokens(en).length} palabras · dígala completa`),
      h('p.muted', {}, i ? 'Pieza nueva: ' : 'Para empezar: ', h('b', {}, es)),
      text,
      h('div.row', {}, h('button', { onclick: () => say(en) }, '🔊 Escuchar'), h('button', { onclick: () => say(en, 0.65) }, '🐢'),
        h('button', { onclick: e => { hide = !hide; text.classList.toggle('hidden-text', hide); setText(e.currentTarget, hide ? '👁 Mostrar el texto' : '🙈 Ocultar el texto'); } }, hide ? '👁 Mostrar el texto' : '🙈 Ocultar el texto')),
      answerBox(listener, onSaid, { label: '🎤 Decirla completa' }),
      result);
    setTimeout(() => { if (screen.isConnected) say(en); }, 350);
  }

  function finish() {
    const tried = firstTry.filter(x => x != null);
    const score = tried.length ? tried.filter(Boolean).length / chain.steps.length : 0;
    record('crece', score);
    store.update(s => { s.tecnicas.best[`crece:${chain.id}`] = Math.max(s.tecnicas.best[`crece:${chain.id}`] || 0, score); });
    const longest = chain.steps[chain.steps.length - 1][0];
    fill(screen,
      topbar(`🧱 ${chain.title}`, back),
      h('div.card.center', {}, h('div.big-score', {}, String(tokens(longest).length)), h('p', {}, 'palabras en una sola frase'),
        h('p.muted', {}, `Al primer intento: ${tried.filter(Boolean).length} de ${chain.steps.length} niveles.`)),
      h('div.correction.better', {}, h('small', {}, 'Su frase completa'), h('div', {}, longest), audioRow(longest)),
      h('p.muted', {}, 'Ahora invente la suya: tome una frase simple de su vida y agréguele una razón, una consecuencia, una condición o un contraste en cada paso.'),
      h('button.primary.wide', { onclick: () => runCrece(chain, back, true) }, 'Otra vez, con el texto oculto'),
      h('button.wide', { onclick: back }, 'Volver'));
  }

  show();
}

// =====================================================================================
// Una frase, 5 capas
// =====================================================================================
function capasSetup(again) {
  const s = store.get();
  const options = X.pickSet([...X.sourcePool('mias', s), ...X.INTERVIEW], 6);
  const own = h('input', { placeholder: 'O escriba una frase suya en inglés…', autocapitalize: 'sentences', autocomplete: 'off' });
  const startOwn = () => { const v = own.value.trim(); if (tokens(v).length >= 3) runCapas({ en: v, es: '' }, again); else toast('Escriba una frase de 3 palabras o más', 'bad'); };
  own.addEventListener('keydown', e => { if (e.key === 'Enter') startOwn(); });
  return [
    h('div.card', {}, h('b', {}, 'Calentamiento de boca (1 minuto, antes de hablar)'), h('ol.tec-how', {}, X.WARMUP.map(w => h('li', {}, w)))),
    h('div.section-head', {}, h('h2', {}, 'Elija una frase')),
    h('div.packs', {}, options.map(x => h('button.pack', { onclick: () => runCapas(x, again) },
      h('span.pack-body', {}, h('span.pack-name', {}, x.en), h('small.muted', {}, x.es))))),
    h('div.row', {}, own, h('button', { onclick: startOwn }, 'Usar')),
    h('button.link', { onclick: again }, '🎲 Otras frases'),
  ];
}

function runCapas(phrase, back) {
  stopSpeaking();
  const screen = h('div.screen.drill.tecnica', {});
  const listener = new Listener();
  const speeds = {};   // capa → palabras por minuto
  let k = 0;
  mount(screen);
  const leave = () => { listener.abort(); stopSpeaking(); back(); };

  function show() {
    if (k >= X.LAYERS.length) return finish();
    const layer = X.LAYERS[k];
    const result = h('div');
    const heard = h('p.muted', {}, '');
    const head = [
      topbar(`🎭 Capa ${k + 1} de ${X.LAYERS.length}`, leave, '✕'),
      progressBar(k / X.LAYERS.length),
      h('h3', {}, `${layer.icon} ${layer.name}`),
      h('p', {}, layer.how),
      h('div.correction.better', {}, h('div.sentence', {}, phrase.en), phrase.es ? h('small', {}, phrase.es) : null,
        h('div.row', {}, h('button.tiny', { onclick: () => say(phrase.en, layer.rate || 0.9) }, layer.rate && layer.rate < 0.8 ? '🐢 Escuchar despacio' : layer.rate > 1 ? '🐇 Escuchar rápido' : '🔊 Escuchar'))),
    ];
    const next = h('button.primary.wide', { onclick: () => { listener.abort(); k++; show(); } }, k + 1 < X.LAYERS.length ? 'Siguiente capa' : 'Terminar');
    let body;
    if (layer.emotions) {
      body = h('div.packs', {}, layer.emotions.map(em => {
        const out = h('small.muted', {}, '');
        return h('div.tec-emotion', {}, h('b', {}, em),
          canListen ? micButton(new Listener(), r => { const { score } = wordStates(phrase.en, r.text); out.textContent = `Se entendió el ${score} % · ${X.speechWpm(r.text, r.durationMs)} palabras por minuto`; }, { label: '🎤 Decirla así' }) : null, out);
      }));
    } else if (layer.contexts) {
      body = h('div.packs', {}, layer.contexts.map(ctx => {
        const out = h('div', {});
        const box = answerBox(new Listener(), said => {
          const ok = X.usesPhrase(phrase.en, said);
          fill(out, h('p', { class: ok ? 'good' : 'warn' }, ok ? '✅ La usó.' : '⚠ No se oyó la frase: inclúyala en lo que dice.'), h('small.muted', {}, `«${said}»`));
        }, { label: '🎤 Decir', placeholder: 'O escriba su frase…' });
        return h('div.tec-context', {}, h('b', {}, ctx), box, out);
      }));
    } else {
      body = canListen ? micButton(listener, r => {
        const { score } = wordStates(phrase.en, r.text);
        const wpm = X.speechWpm(r.text, r.durationMs);
        speeds[layer.id] = wpm;
        const v = verdict(score);
        fill(result, h('p', { class: v.cls }, `${v.label} (${score} %)`), h('p.words', {}, colored(phrase.en, r.text)),
          wpm ? h('p.muted', {}, `Velocidad: ${wpm} palabras por minuto`) : null,
          layer.id === 'rapido' && speeds.lento && wpm ? h('p.good', {}, `${(wpm / speeds.lento).toFixed(1)} veces más rápido que en la capa 1.`) : null);
      }, { label: '🎤 Decirla', heard }) : h('p.muted', {}, 'Dígala en voz alta (este navegador no reconoce voz).');
    }
    fill(screen, head, body, heard, result, next);
  }

  function finish() {
    record('capas');
    fill(screen,
      topbar('🎭 Una frase, 5 capas', back),
      h('div.card.center', {}, h('div.big-score', {}, '🌟'), h('p', {}, 'Esta frase ya es parte de su voz.'),
        speeds.lento && speeds.rapido ? h('p.muted', {}, `De ${speeds.lento} a ${speeds.rapido} palabras por minuto.`) : null),
      h('div.correction.better', {}, h('div', {}, phrase.en), phrase.es ? h('small', {}, phrase.es) : null, audioRow(phrase.en)),
      phrase.es ? h('button.small', { onclick: () => addVocab({ text: phrase.en, translation: phrase.es, type: 'Phrase', source: 'tecnicas' }) }, '📒 Guardarla en el repaso') : null,
      h('button.primary.wide', { onclick: back }, 'Otra frase'));
  }

  show();
}

// =====================================================================================
// Cuéntelo de otra persona
// =====================================================================================
function storyList(back) {
  const best = tec().best;
  return [h('div.packs', {}, X.STORIES.map(st => h('button.pack', { onclick: () => storyIntro(st, back) },
    h('span.pack-icon', {}, st.icon),
    h('span.pack-body', {}, h('span.pack-name', {}, st.title), h('small.muted', {}, `Cuéntela de ${st.name} (${st.who})`)),
    h('small.muted', {}, best[`cuento:${st.id}`] != null ? `✓ ${pct(best[`cuento:${st.id}`])}` : ''))))];
}

function storyIntro(story, back) {
  stopSpeaking();
  const all = story.lines.map(l => l[0]).join(' ');
  mount(h('div.screen.tecnicas', {},
    topbar(`🔄 ${story.title}`, back),
    h('p', {}, `Escuche la historia. Después va a contarla frase por frase, pero de ${story.name}: con «${story.who === 'he' ? 'He' : 'She'}…» en vez de «I…».`),
    h('div.card', {}, story.lines.map(l => h('p', {}, l[0], h('br'), h('small.muted', {}, l[2])))),
    h('div.row', {}, h('button', { onclick: () => say(all) }, '🔊 Escuchar la historia'), h('button', { onclick: () => say(all, 0.7) }, '🐢 Despacio')),
    h('button.primary.wide', { onclick: () => runCuento(story, back) }, `Empezar: cuéntela de ${story.name}`)));
}

function runCuento(story, back) {
  stopSpeaking();
  const screen = h('div.screen.drill.tecnica', {});
  const listener = new Listener();
  const results = [];
  let i = 0;
  mount(screen);
  const leave = () => { listener.abort(); stopSpeaking(); back(); };
  const pron = story.who === 'he' ? 'He' : 'She';

  function show() {
    if (i >= story.lines.length) return finish();
    const [first, third, es] = story.lines[i];
    let done = false, box;
    const result = h('div');
    const check = said => {
      if (done) return;
      done = true;
      listener.abort();
      box.remove();
      const r = X.compare(third, said, X.retellAccept(story, third));
      const entry = { ok: r.exact, line: { en: third, es } };
      results.push(entry);
      buzz(r.exact ? 'good' : 'bad');
      fill(result,
        h('p', { class: !said ? 'muted' : r.exact ? 'good' : r.close ? 'warn' : 'bad' },
          !said ? 'Así queda:' : r.exact ? '✅ ¡Bien contada!' : r.close ? '⚠ Casi: una palabra cambia.' : '❌ Revise las piezas que cambian.'),
        said && !r.exact ? h('p.muted.words', {}, 'Usted dijo: ', colored(said, third)) : null,
        h('div.correction.better', {}, h('small', {}, `De ${story.name} (en negrita lo que cambia)`),
          h('div.words', {}, X.changedWords(first, third).map(x => [x.changed ? h('b', {}, x.w) : x.w, ' '])), audioRow(third)),
        h('div.row', {},
          h('button', { onclick: () => { results.splice(results.indexOf(entry), 1); show(); } }, '🔁 Otra vez'),
          h('button.primary', { onclick: () => { i++; show(); } }, i + 1 < story.lines.length ? 'Seguir' : 'Ver resultado')));
      say(third);
    };
    box = answerBox(listener, check, { label: '🎤 Contarla', placeholder: `O escríbala: ${pron}…`, giveUp: 'Muéstreme cómo queda' });
    fill(screen,
      topbar(`🔄 ${story.title}`, leave, '✕'),
      progressBar(i / story.lines.length),
      h('p.muted.drill-step', {}, `${i + 1} de ${story.lines.length} · dígala de ${story.name}`),
      h('p.sentence', {}, first, ' ', listen(first)),
      h('p.muted', {}, es),
      h('p', {}, `Empiece con «${pron}…» (o con «${story.name}…»). Cambie también my, me, am, have y agregue la -s donde toca (work → works).`),
      box,
      result);
    setTimeout(() => { if (screen.isConnected) say(first); }, 350);
  }

  function finish() {
    const ok = results.filter(r => r.ok).length;
    const score = story.lines.length ? ok / story.lines.length : 0;
    record('cuento', score);
    store.update(s => { s.tecnicas.best[`cuento:${story.id}`] = Math.max(s.tecnicas.best[`cuento:${story.id}`] || 0, score); });
    const all = story.lines.map(l => l[1]).join(' ');
    fill(screen,
      topbar(`🔄 ${story.title}`, back),
      h('div.card.center', {}, h('div.big-score', {}, pct(score)), h('p', {}, `Contó bien ${ok} de ${story.lines.length} frases.`)),
      h('div.card', {}, h('b', {}, `La historia de ${story.name}`), h('p', {}, all), audioRow(all)),
      h('p.muted', {}, 'Para el reto: cuéntela entera de corrido, sin mirar, como si se la contara a un amigo.'),
      h('button.primary.wide', { onclick: () => runCuento(story, back) }, 'Otra vez'),
      h('button.wide', { onclick: back }, 'Otra historia'));
  }

  show();
}

// =====================================================================================
// Ida y vuelta
// =====================================================================================
function idaList(back) {
  const ida = tec().ida;
  const label = st => st.state === 'nuevo' ? 'nuevo' : st.state === 'descansando' ? `descansando · ${st.hours} h` : st.state === 'listo' ? '¡listo para la vuelta!' : `✓ ${pct(st.score)}`;
  return [h('div.packs', {}, X.TEXTS.map(t => {
    const st = X.idaState(ida[t.id]);
    return h('button.pack', { class: st.state === 'listo' ? 'ready' : '', onclick: () => idaText(t, back) },
      h('span.pack-icon', {}, t.icon),
      h('span.pack-body', {}, h('span.pack-name', {}, t.title), h('small.muted', {}, t.lines[0][0])),
      h('small', { class: st.state === 'listo' ? 'good' : 'muted' }, label(st)));
  }))];
}

function idaText(text, back) {
  stopSpeaking();
  const saved = tec().ida[text.id];
  const st = X.idaState(saved);
  const again = () => idaText(text, back);
  const reset = () => { store.update(s => { delete s.tecnicas.ida[text.id]; }); runIda(text, again); };
  const body = st.state === 'nuevo' ? [
    h('p', {}, 'Paso 1, la ida: lea y escuche cada frase y escríbala en español con sus palabras.'),
    h('button.primary.wide', { onclick: () => runIda(text, again) }, 'Empezar la ida'),
  ] : st.state === 'descansando' ? [
    h('div.card.center', {}, h('div.big-score', {}, `${st.hours} h`), h('p', {}, 'Su texto está descansando.'),
      h('p.muted', {}, 'La espera hace que se le olviden las palabras exactas: así, al volver, el cerebro trabaja de verdad. Vuelva más tarde o mañana.')),
    h('button.wide', { onclick: () => runVuelta(text, saved, again) }, '⏩ Hacer la vuelta ya (sirve menos)'),
    h('button.link', { onclick: reset }, 'Volver a empezar la ida'),
  ] : st.state === 'listo' ? [
    h('p', {}, 'Paso 2, la vuelta: con su español a la vista, dígalo o escríbalo en inglés. Al final lo compara con el original.'),
    h('button.primary.wide', { onclick: () => runVuelta(text, saved, again) }, 'Empezar la vuelta'),
  ] : [
    h('div.card.center', {}, h('div.big-score', {}, pct(st.score)), h('p', {}, 'Ida y vuelta terminada.')),
    h('div.card', {}, text.lines.map(([en, es], k) => h('p', {}, listen(en), ' ', en, h('br'), h('small.muted', {}, saved.es[k] || es)))),
    h('button.primary.wide', { onclick: reset }, 'Hacerlo otra vez'),
  ];
  mount(h('div.screen.tecnicas', {}, topbar(`🔁 ${text.title}`, back), body));
}

function runIda(text, back) {
  stopSpeaking();
  const screen = h('div.screen.drill.tecnica', {});
  const mine = [];
  let i = 0;
  mount(screen);
  const leave = () => { stopSpeaking(); back(); };

  function show() {
    if (i >= text.lines.length) return finish();
    const [en, es] = text.lines[i];
    const input = h('textarea', { rows: 2, placeholder: 'Su traducción al español…', autocomplete: 'off' });
    const ref = h('p.muted.hidden', {}, 'La de la app: ', es);
    const save = () => { mine[i] = input.value.trim() || es; i++; show(); };
    fill(screen,
      topbar(`🔁 Ida: ${text.title}`, leave, '✕'),
      progressBar(i / text.lines.length),
      h('p.muted.drill-step', {}, `${i + 1} de ${text.lines.length} · páselo al español`),
      h('p.sentence', {}, en, ' ', listen(en)),
      input,
      h('button.link', { onclick: () => ref.classList.remove('hidden') }, 'Ver la traducción de la app'), ref,
      h('button.primary.wide', { onclick: save }, i + 1 < text.lines.length ? 'Guardar y seguir' : 'Terminar la ida'));
    input.focus();
  }

  function finish() {
    store.update(s => { s.tecnicas.ida[text.id] = { es: mine, at: Date.now() }; });
    fill(screen,
      topbar(`🔁 ${text.title}`, back),
      h('div.card.center', {}, h('div.big-score', {}, '⏳'), h('p', {}, '¡Ida lista! Ahora déjelo descansar.'),
        h('p.muted', {}, `Vuelva en unas ${Math.round(X.INCUBATION_MS / 3600000)} horas (mejor mañana) para la vuelta: le avisamos en la lista con «¡listo para la vuelta!».`)),
      h('button.primary.wide', { onclick: back }, 'Entendido'));
  }

  show();
}

function runVuelta(text, saved, back) {
  stopSpeaking();
  const screen = h('div.screen.drill.tecnica', {});
  const listener = new Listener();
  const scores = [];
  let i = 0;
  mount(screen);
  const leave = () => { listener.abort(); stopSpeaking(); back(); };

  function show() {
    if (i >= text.lines.length) return finish();
    const [en, es] = text.lines[i];
    const mineEs = saved.es[i] || es;
    let done = false, box;
    const result = h('div');
    const check = said => {
      if (done) return;
      done = true;
      listener.abort();
      box.remove();
      const r = X.compare(en, said);
      scores[i] = r.score;
      buzz(r.exact ? 'good' : 'bad');
      fill(result,
        h('p', { class: !said ? 'muted' : r.exact ? 'good' : r.close ? 'warn' : 'bad' },
          !said ? 'El original:' : r.exact ? '✅ ¡Igual al original!' : r.close ? '⚠ Casi igual: cambia una palabra.' : `Se parece en un ${pct(r.score)}.`),
        said && !r.exact ? h('p.muted.words', {}, 'Usted: ', colored(said, en)) : null,
        h('div.correction.better', {}, h('small', {}, 'El original'), h('div.words', {}, said && !r.exact ? colored(en, said) : en), audioRow(en)),
        said && !r.exact ? h('p.muted', {}, '💡 Fíjese en lo marcado en color: suelen ser palabritas como in, on, for, to, o el final de una palabra (worked, works). Eso es justo lo que esta técnica le enseña.') : null,
        h('button.primary.wide', { onclick: () => { i++; show(); } }, i + 1 < text.lines.length ? 'Seguir' : 'Ver resultado'));
    };
    box = answerBox(listener, check, { label: '🎤 Decirla', giveUp: 'No me sale, muéstreme el original' });
    fill(screen,
      topbar(`🔁 Vuelta: ${text.title}`, leave, '✕'),
      progressBar(i / text.lines.length),
      h('p.muted.drill-step', {}, `${i + 1} de ${text.lines.length} · de su español al inglés`),
      h('p.sentence.es', {}, mineEs),
      box,
      result);
  }

  function finish() {
    const avg = scores.length ? scores.reduce((a, b) => a + (b || 0), 0) / text.lines.length : 0;
    store.update(s => { s.tecnicas.ida[text.id] = { ...(s.tecnicas.ida[text.id] || saved), back: Math.round(avg * 100) / 100 }; });
    record('ida', avg);
    const missed = text.lines.filter((_, k) => (scores[k] || 0) < 1).map(([en, es]) => ({ en, es }));
    fill(screen,
      topbar(`🔁 ${text.title}`, back),
      h('div.card.center', {}, h('div.big-score', {}, pct(avg)), h('p', {}, 'Parecido con el original.')),
      missed.length ? h('div.card', {}, h('b', {}, 'Las que cambiaron'), missed.map(x => h('p', {}, listen(x.en), ' ', x.en, h('br'), h('small.muted', {}, x.es))), reviewButton(missed)) : null,
      h('button.primary.wide', { onclick: back }, 'Listo'));
  }

  show();
}

// =====================================================================================
// Mis frases (islas de lenguaje)
// =====================================================================================
function islandsList(go, back) {
  const all = tec().islas;
  return [
    all.length >= 3 ? h('div.card', {}, h('b', {}, `Practicar todas (${all.length})`),
      h('div.row', {},
        h('button.small', { onclick: () => runMemoria({ items: X.pickSet(all, 8), back, title: '🏝 Mis frases' }) }, '🎤 De memoria'),
        h('button.small', { onclick: () => runSombra({ items: X.pickSet(all, 5), intention: X.INTENTIONS[0], back }) }, '🗣 Sombra'),
        h('button.small', { onclick: () => runDictado({ items: X.pickSet(all, 6), back }) }, '🎧 Dictado'))) : null,
    h('div.packs', {}, X.ISLANDS.map(isl => {
      const n = all.filter(x => x.island === isl.id).length;
      return h('button.pack', { onclick: () => islandScreen(isl, go, back) },
        h('span.pack-icon', {}, isl.icon),
        h('span.pack-body', {}, h('span.pack-name', {}, isl.name), h('small.muted', {}, isl.prompts[0])),
        h('small.muted', {}, n ? `${n} frases` : ''));
    })),
  ];
}

function islandScreen(island, go, back) {
  stopSpeaking();
  const again = () => islandScreen(island, go, back);
  const mine = tec().islas.filter(x => x.island === island.id);
  const out = h('div');
  const textarea = h('textarea', { rows: 5, placeholder: 'Escriba en español, una frase por línea. Tal cual lo diría usted.' });

  const showResults = items => {
    const keep = items.map(() => true);
    fill(out, h('div.card', {}, h('b', {}, 'Así se dice en inglés'),
      items.map((x, k) => h('label.tec-pick', {},
        h('input', { type: 'checkbox', checked: true, onchange: e => { keep[k] = e.target.checked; } }),
        h('span', {}, h('span', {}, x.en), h('br'), h('small.muted', {}, x.es)), listen(x.en))),
      h('button.primary.wide', { onclick: () => {
        const chosen = items.filter((_, k) => keep[k]);
        store.update(s => { s.tecnicas.islas = X.addIslandItems(s.tecnicas.islas, island.id, chosen); });
        toast(`🏝 Guardadas en «${island.name}»`, 'good');
        again();
      } }, 'Guardar las marcadas')));
  };
  const toEnglish = async (btn, lines, star = false) => {
    if (!lines.length) { toast(star ? 'Escriba al menos dos partes de su historia' : 'Escriba al menos una frase', 'bad'); return; }
    btn.disabled = true;
    fill(out, spinner('Pasando sus frases a inglés natural…'));
    try {
      const r = await chatJson('islas', P.islasMessages({ lines, island: island.name, rankId: store.get().rank, star }), { temperature: 0.4, maxTokens: 1200 });
      const items = X.validIslandItems(r?.items);
      if (!items.length) throw new Error('La IA no devolvió frases. Intente otra vez.');
      showResults(items);
    } catch (e) { fill(out, h('p.bad', {}, e.message)); }
    finally { btn.disabled = false; }
  };

  const manual = () => {
    const es = h('input', { placeholder: 'En español', autocomplete: 'off' });
    const en = h('input', { placeholder: 'En inglés', autocomplete: 'off', autocapitalize: 'sentences' });
    return h('div.card', {}, h('b', {}, 'Agregar una frase a mano'),
      h('p.muted', {}, 'Sin clave de IA, escriba usted las dos versiones (o pídasela a alguien que sepa).'),
      es, en, h('button.wide', { onclick: () => {
        if (!es.value.trim() || !en.value.trim()) return toast('Escriba las dos versiones', 'bad');
        store.update(s => { s.tecnicas.islas = X.addIslandItems(s.tecnicas.islas, island.id, [{ es: es.value.trim(), en: en.value.trim() }]); });
        again();
      } }, 'Agregar'));
  };

  const star = island.star ? (() => {
    const parts = X.STAR.map(p => h('textarea', { rows: 2, placeholder: `${p.name}: ${p.hint}` }));
    const btn = h('button.primary.wide', { onclick: () => toEnglish(btn, parts.map((t, k) => t.value.trim() ? `${X.STAR[k].name}: ${t.value.trim()}` : '').filter(Boolean), true) }, '✨ Armar mi respuesta en inglés');
    return h('div.card.tec-star', {}, h('b', {}, '⭐ Una historia con STAR'),
      h('p.muted', {}, 'Para no quedarse en blanco con «Cuénteme de una vez que…». Escriba una historia real suya en español, en 4 partes; le sirve para varias preguntas.'),
      X.STAR.map((p, k) => h('div.tec-star-part', {}, h('b', {}, `${p.key} · ${p.name}`), parts[k])),
      hasAI() ? btn : h('p.muted', {}, 'Con su clave de IA, la IA arma la respuesta en inglés.'));
  })() : null;

  const write = hasAI() ? (() => {
    const btn = h('button.primary.wide', { onclick: () => toEnglish(btn, X.splitLines(textarea.value)) }, '✨ Pasarlas a inglés natural');
    return h('div.card', {}, h('b', {}, '✍ Escriba sus frases'),
      h('details', {}, h('summary', {}, 'Ideas para empezar'), h('ul', {}, island.prompts.map(p => h('li', {}, p)))),
      textarea, btn);
  })() : manual();

  mount(h('div.screen.tecnicas', {},
    topbar(`${island.icon} ${island.name}`, back),
    h('p.muted', {}, 'Escriba lo que de verdad diría en su vida, en español. Esas frases son las que va a necesitar.'),
    mine.length ? h('div.card', {}, h('b', {}, `Practicar estas ${mine.length}`),
      h('div.row', {},
        h('button.small.primary', { onclick: () => runMemoria({ items: X.pickSet(mine, 8), back: again, title: `${island.icon} ${island.name}` }) }, '🎤 De memoria'),
        h('button.small', { onclick: () => runSombra({ items: X.pickSet(mine, 5), intention: X.INTENTIONS[0], back: again }) }, '🗣 Sombra'),
        h('button.small', { onclick: () => runDictado({ items: X.pickSet(mine, 6), back: again }) }, '🎧 Dictado'))) : null,
    star, write, out,
    mine.length ? h('div', {}, h('div.section-head', {}, h('h2', {}, 'Sus frases')),
      h('div.card', {}, mine.map(x => h('div.tec-mine', {},
        h('span', {}, listen(x.en), ' ', x.en, h('br'), h('small.muted', {}, x.es)),
        h('button.tiny', { 'aria-label': 'Borrar', onclick: () => { store.update(s => { s.tecnicas.islas = s.tecnicas.islas.filter(y => y.id !== x.id); }); again(); } }, '🗑'))),
      reviewButton(mine))) : null));
}

// =====================================================================================
// Simulacro con imprevisto
// =====================================================================================
function simScreen(go, back, place = null) {
  stopSpeaking();
  const list = X.SIMULACROS.filter(x => !place || x.place === place);
  mount(h('div.screen.tecnicas', {},
    topbar('🎲 Simulacro con imprevisto', back),
    h('p', {}, 'Charle normal con la IA. En algún momento pasará algo que no espera: no le decimos qué. Resuélvalo en inglés, con calma.'),
    h('p.muted', {}, 'Si se bloquea: «Sorry, could you say that again?» o «Let me think for a moment» le dan tiempo.'),
    hasAI() ? null : h('p.warn', {}, '⚠ Necesita su clave de IA (Ajustes).'),
    h('div.packs', {}, list.map(sim => h('button.pack', { disabled: hasAI() ? null : true, onclick: () => {
      record('imprevisto');
      go.startSim(sim.place, X.simMission(sim), back);
    } },
    h('span.pack-icon', {}, sim.icon),
    h('span.pack-body', {}, h('span.pack-name', {}, sim.name), h('small.muted', {}, sim.description)))))));
}

// =====================================================================================
// Responder en el momento (robar palabras de la pregunta + estructura de 3 partes + corto y claro)
// =====================================================================================
const answerSet = group => X.answerSet(group);
const ANSWER_ISLAND = { entrevista: 'entrevista', oferta: 'entrevista', vida: 'dia', opinion: 'opiniones' };

// Las 3 estructuras y las frases para ganar tiempo (también se abren desde la charla).
export function framesGuide(open = false) {
  return h('details.card.tec-frame', open ? { open: true } : {},
    h('summary', {}, h('b', {}, '📋 Las 3 estructuras y las frases para ganar tiempo')),
    Object.values(X.FRAMES).map(f => h('div', {},
      h('p', {}, h('b', {}, f.name), h('br'), h('small.muted', {}, f.use)),
      h('ol.tec-how', {}, f.parts.map(p => h('li', {}, p.es, h('br'), h('small', {}, p.chunks.map(([en, es]) => `${en} (${es})`).join(' · '))))))),
    X.STARTERS.map(g => h('p', {}, h('b', {}, g.es), h('br'), g.list.map(([en, es]) => [listen(en), ' ', en, ' ', h('small.muted', {}, `(${es})`), h('br')]))));
}

// opts (v46, para las ofertas): title, again (otra ronda), onAnswer(item, texto, revisión), onVersion(item, versión de la IA).
export function runResponder(items, back, { title = '🎯 Responder en el momento', again = null, onAnswer = null, onVersion = null } = {}) {
  stopSpeaking();
  const screen = h('div.screen.drill.tecnica.tec-answer', {});
  const listener = new Listener();
  const best = items.map(() => null);   // mejor revisión de cada pregunta
  mount(screen);
  const leave = () => { listener.abort(); stopSpeaking(); back(); };
  const check = ok => h('span', { class: ok ? 'good' : 'muted' }, ok ? '✅ ' : '⬜ ');

  function show(i) {
    const item = items[i];
    const frame = X.FRAMES[item.frame];
    fill(screen,
      topbar(title, leave, '✕'),
      progressBar(i / items.length),
      h('p.muted.drill-step', {}, `${i + 1} de ${items.length}`),
      h('div.card.tec-topic', {}, h('small.muted', {}, 'Le preguntan'),
        h('div', {}, h('b', {}, item.q), ' ', listen(item.q), ' ', listen(item.q, 0.65, '🐢')),
        h('small.muted', {}, item.es)),
      h('div.card', {}, h('b', {}, '1 · Empiece con las palabras de la pregunta'),
        h('p', {}, listen(item.start), ' ', item.start, h('br'), h('small.muted', {}, item.startEs))),
      h('div.card', {}, h('b', {}, `2 · Ordénela: ${frame.name}`),
        h('ol.tec-how', {}, frame.parts.map(p => h('li', {}, p.es, h('br'), h('small.muted', {}, p.chunks.map(([en, es]) => `${en} (${es})`).join(' · ')))))),
      h('details.tec-frame', {}, h('summary', {}, 'Si necesita unos segundos para pensar'),
        X.STARTERS[0].list.concat(X.STARTERS[1].list).map(([en, es]) => h('p', {}, listen(en), ' ', en, ' ', h('small.muted', {}, `(${es})`)))),
      h('p', {}, h('b', {}, '3 · Dígala corta y clara. '), h('span.muted', {}, 'Si se equivoca, corríjase y siga.')),
      answerBox(listener, text => result(i, text), { label: '🎤 Responder', placeholder: 'O escriba su respuesta en inglés…', giveUp: 'Ver un ejemplo sin responder' }));
    say(item.q);
  }

  function result(i, text) {
    const item = items[i];
    const frame = X.FRAMES[item.frame];
    const c = X.answerCheck(item, text);
    if (text && (!best[i] || c.score >= best[i].score)) best[i] = { ...c, text };
    if (text) onAnswer?.(item, text, c);
    if (text) buzz(c.score >= 0.8 ? 'good' : 'tap');
    const last = i + 1 >= items.length;
    const ai = h('div');
    fill(screen,
      topbar(title, leave, '✕'),
      progressBar((i + 1) / items.length),
      h('div.card.tec-topic', {}, h('small.muted', {}, 'Le preguntaron'), h('b', {}, item.q)),
      // Lo que dijo, a la vista (antes quedaba escondido en «Lo que se le entendió» y parecía que no salía nada).
      text ? h('div.card.said-card', {}, h('small.muted', {}, '🗣 Usted dijo'), h('p', {}, `«${text}»`)) : null,
      text ? h('div.card', {},
        h('div.big-score', {}, `${Math.round(c.score * 5)}/5`),
        h('p', {}, check(c.stole), 'Empezó con las palabras de la pregunta'),
        frame.parts.map((p, k) => h('p', {}, check(c.parts[k]), p.es)),
        h('p', {}, check(c.short), `Corta y clara (${c.words} palabras)`),
        c.fillers ? h('p.muted', {}, `${c.fillers} ${c.fillers === 1 ? 'muletilla' : 'muletillas'} (um, eh…): en su lugar use una frase para pensar.`) : null,
        h('p', { class: c.score >= 0.8 ? 'good' : '' }, '💡 ', c.tip),
        h('small.muted', {}, 'Revisión del teléfono, sin IA: mira la forma de la respuesta, no la gramática.')) : null,
      h('div.card', {}, h('b', {}, 'Una forma de decirlo'),
        h('p', {}, listen(item.model), ' ', item.model, h('br'), h('small.muted', {}, item.modelEs)),
        h('div.row', {},
          h('button.small', { onclick: () => say(item.model, 0.8) }, '🗣 Oírla y repetirla'),
          h('button.small', { onclick: () => saveModel(item) }, '🏝 A Mis frases'),
          h('button.small', { onclick: () => sendToWorkshop(item.model) }, '🧩 Al taller'))),
      text && hasAI() ? h('button.wide', { onclick: e => aiFix(e.currentTarget, item, text, ai) }, '🧑‍🏫 Que la IA corrija mi respuesta') : null,
      text && !hasAI() ? h('p.muted', {}, 'Con su clave de IA, la IA le corrige la gramática y le da su respuesta dicha de forma natural.') : null,
      ai,
      h('button.wide', { onclick: () => show(i) }, '🔁 Responder otra vez'),
      h('button.primary.wide', { onclick: () => (last ? end() : show(i + 1)) }, last ? 'Ver resultado' : 'Siguiente pregunta'));
  }

  async function aiFix(btn, item, text, box) {
    btn.disabled = true;
    fill(box, spinner('Revisando su respuesta…'));
    try {
      const r = await chatJson('answer', P.answerMessages({ question: item.q, frame: X.FRAMES[item.frame].name, text, rankId: store.get().rank }), { temperature: 0.4, maxTokens: 700 });
      const version = (Array.isArray(r.version) ? r.version : []).filter(v => v?.en).map(v => ({ en: String(v.en), es: String(v.es || '') }));
      if (version.length) onVersion?.(item, version);
      btn.remove();
      fill(box,
        r.good ? h('p.good', {}, '👍 ', r.good) : null,
        (r.fixes || []).length ? h('div.card', {}, h('b', {}, 'Para decirlo mejor'), (r.fixes || []).map(f => h('div.trap', {},
          h('div', {}, h('s.bad', {}, f.said), ' → ', h('b.good', {}, f.better), ' ', listen(f.better)), h('small.muted', {}, f.why)))) : null,
        version.length ? h('div.card', {}, h('b', {}, 'Su respuesta, dicha de forma natural'),
          version.map(v => h('p', {}, listen(v.en), ' ', v.en, v.es ? [h('br'), h('small.muted', {}, v.es)] : null)),
          version.every(v => v.es) ? h('button.small', { onclick: () => saveVersion(item, version) }, '🏝 Guardarla en Mis frases') : null) : null,
        r.tip ? h('p.muted', {}, '💡 ', r.tip) : null);
    } catch (e) { btn.disabled = false; fill(box, h('p.bad', {}, e.message)); }
  }

  function saveVersion(item, version) {
    const island = ANSWER_ISLAND[item.group] || 'dia';
    const before = tec().islas.length;
    store.update(s => { s.tecnicas.islas = X.addIslandItems(s.tecnicas.islas, island, version); });
    const n = tec().islas.length - before;
    toast(n ? `🏝 ${n} ${n === 1 ? 'frase guardada' : 'frases guardadas'} en «${X.islandById(island).name}»` : 'Ya estaban en Mis frases', n ? 'good' : '');
  }
  const saveModel = item => saveVersion(item, item.model.split(/(?<=[.!?])\s+/).map((en, k) => ({ en, es: item.modelEs.split(/(?<=[.!?])\s+/)[k] || '' })).filter(x => x.es));

  function end() {
    const tried = best.filter(Boolean);
    const score = tried.length ? tried.reduce((a, b) => a + b.score, 0) / items.length : 0;
    record('responder', tried.length ? score : null);
    fill(screen,
      topbar(title, back),
      h('div.card.center', {},
        h('div.big-score', {}, tried.length ? pct(score) : '—'),
        h('p', {}, tried.length === items.length && score >= 0.8 ? '🌟 ¡Respuestas claras y ordenadas!' : 'Repita las que le costaron: la segunda vez sale más fácil.')),
      h('div.card', {}, items.map((it, k) => h('p', {}, h('b', {}, it.q), h('br'),
        h('small.muted', {}, best[k] ? `${Math.round(best[k].score * 5)}/5 · ${best[k].tip}` : 'Sin responder')))),
      h('button.primary.wide', { onclick: () => (again ? again() : runResponder(X.answerSet(items[0].group), back)) }, 'Otra ronda'),
      h('button.wide', { onclick: back }, 'Volver'));
  }

  show(0);
}
