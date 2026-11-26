// Pantallas de las técnicas de la v45 (contenido y revisión en practica.js):
// - ✍ Diario en inglés: escribir sin miedo, releer y que la IA lo corrija todo con su «por qué»; los errores van a
//   «Mis errores» y las frases buenas, a su repaso.
// - 🎙 Grabarse y compararse: grabar 1 o 2 minutos, oírse, marcar qué notó, anotar errores y comparar con la
//   primera vez. El audio se queda en el teléfono.
// - 👂 Sonidos parecidos: oír cuál de las dos palabras sonó y decirlas para que se entienda la suya.
import * as store from './store.js';
import { chatJson, hasAI } from './llm.js';
import * as P from './prompts.js';
import { h, mount, toast, spinner, setText, buzz } from './ui.js';
import { speak, stopSpeaking, Listener, canListen } from './speech.js';
import { WhisperListener, whisperOn, canRecord } from './whisper.js';
import { wordStates, tokens } from './pronounce.js';
import { addVocab } from './words.js';
import { addFromAnalyses, activeErrors, setStatus } from './bitacora.js';
import { putClip, getClip, deleteClips } from './audiostore.js';
import * as R from './practica.js';

const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
const topbar = (title, onBack) => h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: onBack }, '←'), h('h2', {}, title));
const say = (t, rate = 0.9) => speak(t, { rate });
const pct = x => `${Math.round(x * 100)} %`;
const data = () => store.get().practica;
const dateText = at => new Date(at).toLocaleDateString('es', { day: 'numeric', month: 'short' });
const clock = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// Suma tiempo a la meta del día (los minutos de práctica).
function addDailySeconds(seconds) {
  if (!(seconds > 0)) return;
  store.update(s => {
    const today = store.todayIso();
    if (s.daily?.date !== today) s.daily = { date: today, seconds: 0 };
    s.daily.seconds += Math.round(seconds);
  });
}

// Guardar frases en su repaso.
function keepButton(list) {
  return h('button.small', { onclick: e => {
    let n = 0;
    for (const x of list) if (addVocab({ text: x.en, translation: x.es, type: 'Phrase', source: 'diario' })) n++;
    toast(n ? `${n} ${n === 1 ? 'frase guardada' : 'frases guardadas'} en su repaso` : 'Ya estaban en su repaso');
    e.currentTarget.disabled = true;
  } }, '⭐ Llevarlas a mi repaso');
}

// Los enlaces de audio de una pantalla se sueltan al cambiar de pantalla.
let urls = [];
const freeUrls = () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; };
function player(blob) {
  const src = URL.createObjectURL(blob);
  urls.push(src);
  return h('audio.rec-audio', { controls: true, preload: 'metadata', src });
}
// Reproductor de una grabación guardada (se busca en el teléfono al abrir).
function savedPlayer(id) {
  const box = h('div.rec-player', {}, h('small.muted', {}, 'Buscando el audio…'));
  getClip(id).then(blob => fill(box, blob ? player(blob) : h('small.muted', {}, 'El audio no está en este teléfono (quedó solo la fecha y los números).')));
  return box;
}

// =====================================================================================
// ✍ Diario en inglés
// =====================================================================================
export function diarioScreen({ home }) {
  stopSpeaking(); freeUrls();
  const self = () => diarioScreen({ home });
  const d = data();
  const started = Date.now();
  let start = d.draft.start;
  const area = h('textarea.diary-text', { rows: '9', placeholder: 'Escriba en inglés lo que se le venga a la cabeza. Sin miedo: los errores son los que después se corrigen.',
    autocapitalize: 'sentences', spellcheck: 'false', autocomplete: 'off', autocorrect: 'off' });
  area.value = d.draft.text;
  const count = h('small.muted', {}, '');
  const clockLine = h('small.muted', {}, '');
  const startLine = h('p.diary-start', {}, '');
  const showStart = () => { const st = R.DIARY_STARTS.find(x => x.en === start); setText(startLine, st ? `Empezó con: ${st.en} (${st.es})` : ''); };
  const updateCount = () => {
    const st = R.diaryStats(area.value);
    setText(count, `${st.words} palabras · ${st.sentences} ${st.sentences === 1 ? 'frase' : 'frases'}${st.links.length ? ` · une ideas con: ${st.links.join(', ')}` : ''}`);
  };
  let saveT = 0;
  const saveDraft = () => store.update(x => { x.practica.draft = { text: area.value, start }; });
  area.addEventListener('input', () => { updateCount(); clearTimeout(saveT); saveT = setTimeout(saveDraft, 400); });
  const tick = setInterval(() => {
    if (!area.isConnected) { clearInterval(tick); return; }
    const min = Math.floor((Date.now() - started) / 60000);
    setText(clockLine, `⏱ ${min} de ${R.DIARY_MINUTES} min${min >= R.DIARY_MINUTES ? ' · ¡Listo! Ya puede releerlo.' : ''}`);
  }, 15000);
  setText(clockLine, `⏱ 0 de ${R.DIARY_MINUTES} min`);

  const result = h('div', {});
  const goBtn = h('button.primary.wide', { onclick: () => correct() }, hasAI() ? '✅ Ya lo releí: corregirlo' : '💾 Guardar en mi diario');

  async function correct() {
    const text = area.value.trim();
    const st = R.diaryStats(text);
    if (st.words < R.DIARY_MIN_WORDS) { toast(`Escriba al menos ${R.DIARY_MIN_WORDS} palabras (lleva ${st.words}).`, 'bad'); return; }
    const minutes = Math.min(60, Math.round((Date.now() - started) / 60000));
    let review = null;
    if (hasAI()) {
      goBtn.disabled = true;
      fill(result, spinner('Corrigiendo todo su texto…'));
      try {
        const r = await chatJson('diary', P.diaryMessages({ text, rankId: store.get().rank, start }), { temperature: 0.3, maxTokens: 3000 });
        review = R.cleanDiaryReview(r, text);
      } catch (e) {
        fill(result, h('p.bad', {}, e.message, ' Su texto sigue aquí: puede intentarlo otra vez.'));
        goBtn.disabled = false;
        return;
      }
    }
    const entry = R.diaryEntry({ text, review, start, minutes });
    store.update(x => {
      x.practica.diary.unshift(entry);
      x.practica.diary = x.practica.diary.slice(0, R.DIARY_KEEP);
      x.practica.draft = { text: '', start: '' };
      x.activity = store.logInto(x.activity, 'diary');
    });
    addDailySeconds(minutes * 60);
    const added = review?.fixes.length ? addFromAnalyses(R.diaryAnalyses(review.fixes)) : 0;
    buzz('good');
    entryScreen(entry, self, { fresh: true, added });
  }

  const startChips = h('div.chips.diary-starts', {}, R.DIARY_STARTS.map(st => h('button.chip', { class: st.en === start ? 'sel' : '', onclick: e => {
    start = st.en;
    if (!area.value.trim()) area.value = st.en.replace('…', ' ');
    startChips.querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
    e.currentTarget.classList.add('sel');
    showStart(); updateCount(); saveDraft(); area.focus();
  } }, st.en)));

  const entries = d.diary;
  const streak = R.diaryStreak(entries);
  mount(h('div.screen.practica', {},
    topbar('✍ Diario en inglés', () => { clearTimeout(saveT); saveDraft(); home(); }),
    h('div.card', {},
      h('p', {}, 'Escribir y hablar usan la misma parte del cerebro: al escribir busca las palabras y arma las frases, pero sin el apuro de una charla. Lo que escribe hoy sale al hablar mañana.'),
      h('ol.tec-how', {},
        h('li', {}, `Escriba unos ${R.DIARY_MINUTES} minutos sin parar a corregirse: su día, sus planes, lo que piensa.`),
        h('li', {}, 'Reléalo y corrija usted mismo lo que vea: notar su propio error ya le enseña.'),
        h('li', {}, hasAI() ? 'Luego la IA corrige todo, le explica por qué y guarda los errores en «Mis errores».' : 'Con una clave de IA en Ajustes, también se lo corrige y le explica por qué.')),
      streak ? h('p.muted', {}, `🔥 ${streak} ${streak === 1 ? 'día' : 'días'} seguidos escribiendo`) : null),
    h('div.card', {},
      h('b', {}, '¿No sabe por dónde empezar?'),
      startChips, startLine,
      area, h('div.row.diary-meta', {}, count, clockLine),
      h('details.diary-links', {}, h('summary', {}, '🔗 Palabras para unir ideas (mírelas solo si se traba)'),
        h('div.chips', {}, R.DIARY_LINKS.map(([en, es]) => h('span.chip', {}, `${en} · ${es}`)))),
      goBtn, result),
    entries.length ? [h('div.section-head', {}, h('h2', {}, `📒 Lo que ha escrito (${entries.length})`)),
      h('div.packs', {}, entries.slice(0, 30).map(e => h('button.pack', { onclick: () => entryScreen(e, self) },
        h('span.pack-icon', {}, '✍'),
        h('span.pack-body', {}, h('span.pack-name', {}, `${dateText(e.at)} · ${e.words} palabras`),
          h('small.muted', {}, e.text.slice(0, 70) + (e.text.length > 70 ? '…' : ''))),
        h('small.muted', {}, e.review ? `${e.review.fixes.length} ${e.review.fixes.length === 1 ? 'corrección' : 'correcciones'}${e.review.level ? ` · ${e.review.level}` : ''}` : 'sin corregir'))))] : null));
  showStart(); updateCount();
}

// Una entrada: lo que escribió, cada corrección con su porqué, el texto corregido y las frases para guardar.
function entryScreen(e, back, { fresh = false, added = 0 } = {}) {
  stopSpeaking();
  const r = e.review;
  mount(h('div.screen.practica', {},
    topbar(`✍ ${dateText(e.at)}`, back),
    fresh ? h('div.card.ok-card', {}, h('b', {}, '✅ Guardado en su diario'),
      h('p.muted', {}, r ? `${r.fixes.length ? `${r.fixes.length} ${r.fixes.length === 1 ? 'corrección' : 'correcciones'}` : 'Sin errores'}${added ? ` · ${added} ${added === 1 ? 'error nuevo' : 'errores nuevos'} en «Mis errores»` : ''}.` : 'Sin IA no se corrige, pero queda guardado para releerlo.')) : null,
    r?.good ? h('div.card', {}, h('b', {}, '👍 Lo que hizo bien'), h('p', {}, r.good)) : null,
    r?.level ? h('div.card', {}, h('b', {}, `📏 Su nivel hoy: ${r.level}`), r.levelWhy ? h('p.muted', {}, r.levelWhy) : null) : null,
    r?.fixes.length ? h('div.card', {}, h('b', {}, `✏ Correcciones (${r.fixes.length})`),
      h('div.diary-fixes', {}, r.fixes.map(f => h('div.diary-fix', {},
        h('p', {}, h('span.diary-said', {}, f.said), ' → ', h('b.diary-better', {}, f.better), ' ', h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(f.better) }, '🔊')),
        f.why ? h('small.muted', {}, f.why) : null)))) : null,
    r ? h('div.card', {}, h('div.row', {}, h('b', {}, '📝 Su texto corregido'), h('button.tiny', { onclick: () => say(r.corrected) }, '🔊 Escuchar')),
      h('p.diary-corrected', {}, r.corrected)) : null,
    r?.keep.length ? h('div.card', {}, h('b', {}, '⭐ Frases para guardar'),
      r.keep.map(k => h('p', {}, h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(k.en) }, '🔊'), ' ', h('b', {}, k.en), h('br'), h('small.muted', {}, k.es))),
      keepButton(r.keep)) : null,
    r?.tip ? h('div.card', {}, h('b', {}, '💡 Para mañana'), h('p', {}, r.tip)) : null,
    h('div.card', {}, h('b', {}, r ? 'Lo que escribió' : 'Su texto'), h('p.diary-original', {}, e.text)),
    h('button.wide', { onclick: back }, fresh ? 'Volver al diario' : 'Volver')));
}

// =====================================================================================
// 🎙 Grabarse y compararse
// =====================================================================================
export function grabarseScreen({ home }) {
  stopSpeaking(); freeUrls();
  const self = () => grabarseScreen({ home });
  const clips = data().clips;
  const card = t => {
    const mine = clips.filter(c => c.topic === t.id);
    const last = mine[mine.length - 1];
    return h('button.pack', { onclick: () => recTopicScreen(t, self) },
      h('span.pack-icon', {}, t.kind === 'leer' ? '📖' : t.kind === 'entrevista' ? '💼' : '💬'),
      h('span.pack-body', {}, h('span.pack-name', {}, t.kind === 'leer' ? t.titleEs : t.en), h('small.muted', {}, t.kind === 'leer' ? 'Leer en voz alta' : t.es)),
      h('small.muted', {}, last ? `${mine.length} · ${dateText(last.at)}` : '›'));
  };
  mount(h('div.screen.practica', {},
    topbar('🎙 Grabarse y compararse', home),
    h('div.card', {},
      h('p', {}, 'Mientras habla, su cabeza está ocupada armando la frase y no nota sus errores. Al oírse después, con calma, sí los nota: usted mismo es el profesor que siempre tiene a mano. Y oír cómo suena en inglés, en privado, le quita los nervios de hablar frente a otros.'),
      h('ol.tec-how', {},
        h('li', {}, 'Grábese 1 o 2 minutos (2 o 3 veces por semana).'),
        h('li', {}, 'Óigase una vez entera, sin parar.'),
        h('li', {}, 'Óigase otra vez y marque lo que notó; anote los errores en «Mis errores».'),
        h('li', {}, 'Cada tanto, compare con su primera grabación del mismo tema.')),
      h('small.muted', {}, whisperOn()
        ? 'Con su clave de Groq, la grabación también se pasa a texto: verá palabras por minuto y muletillas. El audio se queda solo en este teléfono.'
        : 'El audio se queda solo en este teléfono. Con una clave de Groq en Ajustes, además verá el texto, sus palabras por minuto y sus muletillas.')),
    canRecord ? null : h('p.bad', {}, 'Este navegador no deja grabar audio. Pruebe en Chrome del teléfono.'),
    R.REC_KINDS.map(k => [h('div.section-head', {}, h('h2', {}, k.name)), h('div.packs', {}, R.REC_TOPICS.filter(t => t.kind === k.id).map(card))])));
}

function recTopicScreen(t, back) {
  stopSpeaking(); freeUrls();
  const self = () => recTopicScreen(t, back);
  const reading = t.kind === 'leer';
  let rec = null;
  const leave = () => { rec?.abort(); stopSpeaking(); back(); };
  const status = h('p.muted.rec-status', {}, '');
  const result = h('div', {});
  const esLine = h('p.muted', { hidden: true }, t.es);

  const recBtn = h('button.primary.wide', { disabled: canRecord ? null : true, onclick: async () => {
    if (rec?.active) { rec.stop(); return; }
    stopSpeaking();
    rec = new WhisperListener();
    setText(recBtn, '⏹ Terminar'); recBtn.classList.add('recording');
    fill(result);
    try {
      const r = await rec.start({ lang: store.get().settings.targetLang, keepAudio: true, transcribeAudio: whisperOn(),
        maxMs: R.REC_MAX_MS, pauseMs: R.REC_PAUSE_MS, firstWordMs: 20000,
        onInterim: x => setText(status, x.replace(/ {2}· .*$/, '  · toque ⏹ Terminar cuando acabe')) });
      setText(status, '');
      if (!r.audio) { if (recBtn.isConnected) setText(status, 'No se oyó nada. Toque 🎙 y hable cuando quiera.'); return; }
      if (recBtn.isConnected) await saveClip(t, r, result);
    } catch (e) { setText(status, e.message); }
    finally { rec = null; setText(recBtn, '🎙 Grabar otra vez'); recBtn.classList.remove('recording'); }
  } }, '🎙 Grabar');

  const mine = data().clips.filter(c => c.topic === t.id).sort((a, b) => b.at - a.at);
  mount(h('div.screen.practica', {},
    topbar(reading ? `📖 ${t.titleEs}` : '🎙 Grabarse', leave),
    h('div.card', {},
      reading ? h('p.rec-read', {}, t.en) : h('h3', {}, t.en),
      h('div.row', {},
        h('button.tiny', { onclick: () => say(t.en) }, reading ? '🔊 Oír cómo suena' : '🔊 Escuchar'),
        reading ? h('button.tiny', { onclick: () => say(t.en, 0.7) }, '🐢 Despacio') : null,
        h('button.tiny', { onclick: () => { esLine.hidden = !esLine.hidden; } }, 'Ver en español')),
      esLine,
      h('p.muted', {}, '💡 ', t.tip)),
    recBtn, status, result,
    mine.length ? [h('div.section-head', {}, h('h2', {}, `Sus grabaciones (${mine.length})`)),
      h('small.muted', {}, `Se guardan la primera y las últimas ${R.KEEP_LAST}.`),
      mine.map((c, i) => h('div.card.rec-old', {},
        h('div.row', {}, h('b', {}, `${dateText(c.at)}${i === mine.length - 1 ? ' · la primera' : ''}`), h('small.muted', {}, clipLine(c))),
        h('button.tiny', { onclick: e => e.currentTarget.replaceWith(savedPlayer(c.id)) }, '▶ Oírla')))] : null));

  async function saveClip(topic, r, box) {
    const at = Date.now();
    const id = `c-${at.toString(36)}`;
    const stats = R.clipStats(r.text, r.speechMs);
    let saved = true;
    try { await putClip(id, r.audio); } catch { saved = false; }
    store.update(x => { x.practica.clips.push({ id, topic: topic.id, at, ms: r.recordedMs || 0, text: r.text || '', stats, self: {} }); x.activity = store.logInto(x.activity, 'record'); });
    addDailySeconds((r.recordedMs || 0) / 1000);
    store.persistStorage?.();
    const drop = R.clipsToDrop(data().clips, topic.id);
    if (drop.length) { store.update(x => { x.practica.clips = x.practica.clips.filter(c => !drop.includes(c.id)); }); deleteClips(drop).catch(() => {}); }
    const { first, change } = R.firstAndLast(data().clips, topic.id);
    const checks = {};
    const checkRow = c => h('label.rec-check', {}, h('input', { type: 'checkbox', onchange: e => {
      checks[c.id] = e.currentTarget.checked;
      store.update(x => { const k = x.practica.clips.find(y => y.id === id); if (k) k.self = { ...checks }; });
    } }), ' ', c.q);
    const said = h('input', { placeholder: 'Lo que dije (en inglés)', autocomplete: 'off', spellcheck: 'false' });
    const right = h('input', { placeholder: 'Cómo es bien dicho', autocomplete: 'off', spellcheck: 'false' });
    const note = () => {
      const a = said.value.trim(), b = right.value.trim();
      if (!a || !b) { toast('Escriba lo que dijo y cómo es bien dicho.', 'bad'); return; }
      const n = addFromAnalyses([{ has_feedback: true, grammar: 'SomeMistakes', original: a, corrected: b, explanation: 'Lo notó al oírse grabado.' }]);
      toast(n ? 'Anotado en «Mis errores»' : 'Ese error ya estaba: se sumó una vez más');
      said.value = ''; right.value = '';
    };
    fill(box,
      h('div.card.ok-card', {}, h('b', {}, saved ? '✅ Grabación guardada' : '⚠ Se grabó, pero este teléfono no la pudo guardar'),
        h('p.muted', {}, 'Óigase una vez entera, sin parar. Después, otra vez con atención.'),
        player(r.audio)),
      r.error ? h('p.muted', {}, `No se pudo pasar a texto: ${r.error}`) : null,
      r.text ? h('div.card', {}, h('b', {}, 'Lo que se entendió'),
        reading ? h('p', {}, colored(topic.en, r.text)) : h('p', {}, r.text),
        reading ? h('small.muted', {}, 'En verde lo que se entendió; en rojo lo que no se oyó claro.') : null,
        stats ? h('p.muted', {}, statsText(stats)) : null) : null,
      h('div.card', {}, h('b', {}, 'Al oírse, ¿qué notó?'), R.SELF_CHECKS.map(checkRow)),
      h('div.card', {}, h('b', {}, '📒 Anotar un error que notó'), said, right, h('button.small', { onclick: note }, 'Guardar en «Mis errores»')),
      first && first.id !== id ? h('div.card', {}, h('b', {}, `⏪ Su primera vez (${dateText(first.at)})`),
        savedPlayer(first.id),
        change ? h('p', {}, changeText(change)) : h('small.muted', {}, 'Óigalas una después de la otra: ¿qué cambió?')) : null);
  }
}

function colored(target, heard) {
  const { states } = wordStates(target, heard);
  let k = 0;
  return String(target).split(/\s+/).map(w => [h('span.pron-word', { class: tokens(w).length ? (states[k++] || 'miss') : 'ok' }, w), ' ']);
}
const statsText = st => `${st.words} palabras · ${st.wpm} por minuto · ${st.fillers} ${st.fillers === 1 ? 'muletilla' : 'muletillas'} · variedad ${pct(st.variety)}`;
const clipLine = c => [clock(c.ms || 0), c.stats ? `${c.stats.wpm} p/min` : '', c.self && Object.keys(c.self).length ? `${pct(R.selfScore(c.self))} bien` : ''].filter(Boolean).join(' · ');
function changeText(ch) {
  const parts = [];
  if (ch.wpm) parts.push(`${Math.abs(ch.wpm)} palabras por minuto ${ch.wpm > 0 ? 'más' : 'menos'}`);
  if (ch.fillers) parts.push(`${Math.abs(ch.fillers)} ${Math.abs(ch.fillers) === 1 ? 'muletilla' : 'muletillas'} ${ch.fillers < 0 ? 'menos' : 'más'}`);
  return parts.length ? `En ${ch.days} ${ch.days === 1 ? 'día' : 'días'}: ${parts.join(' y ')}.` : 'Habla al mismo ritmo que la primera vez.';
}

// =====================================================================================
// 👂 Sonidos parecidos
// =====================================================================================
const canSay = () => canListen || whisperOn();

export function paresScreen({ home, group = '' }) {
  stopSpeaking();
  if (group && R.pairGroupById(group)) { groupScreen(R.pairGroupById(group), () => paresScreen({ home })); return; }
  const self = () => paresScreen({ home });
  const stats = data().pairs;
  const weak = R.weakGroups(stats);
  const row = g => {
    const sc = R.groupScore(stats, g.id);
    return h('button.pack', { onclick: () => groupScreen(g, self) },
      h('span.pack-icon', {}, '👂'),
      h('span.pack-body', {}, h('span.pack-name', {}, g.name), h('small.muted', {}, g.example)),
      h('small.muted', {}, sc.n ? `✓ ${pct(sc.acc)}` : '›'));
  };
  mount(h('div.screen.practica', {},
    topbar('👂 Sonidos parecidos', home),
    h('div.card', {},
      h('p', {}, 'El español tiene 5 vocales y el inglés unas 12. Por eso hay palabras que a usted le suenan iguales, como ship y sheep, o work y walk. Si no las distingue al oír, no las entiende; si las dice igual, le entienden otra palabra.'),
      h('p.muted', {}, 'Primero entrene el oído (elegir cuál sonó) y después la boca (decirla para que se entienda la suya).')),
    h('div.row.pairs-mix', {},
      h('button.primary', { onclick: () => runHear(R.pairRound([]), self, 'Mezcla') }, '👂 Oír: mezcla'),
      h('button', { disabled: canSay() ? null : true, onclick: () => runSay(R.pairRound([]), self, 'Mezcla') }, '🎤 Decir: mezcla')),
    weak.length ? h('div.card', {}, h('b', {}, '🎯 Los que más le cuestan'),
      h('p.muted', {}, weak.map(id => R.pairGroupById(id).name).join(' · ')),
      h('button.small', { onclick: () => runHear(R.pairRound(weak), self, 'Los que más le cuestan') }, '👂 Practicarlos')) : null,
    h('div.packs', {}, R.PAIR_GROUPS.map(row))));
}

function groupScreen(g, back) {
  stopSpeaking();
  const self = () => groupScreen(g, back);
  const sc = R.groupScore(data().pairs, g.id);
  mount(h('div.screen.practica', {},
    topbar(`👂 ${g.example}`, back),
    h('div.card', {}, h('b', {}, g.name), h('p', {}, g.how)),
    h('div.card.pairs-list', {}, g.pairs.map(p => {
      const [a, b] = R.pairWords(p);
      return h('div.pair-row', {},
        h('button.pair-word', { onclick: () => say(a.en, 0.8) }, h('b', {}, `🔊 ${a.en}`), h('small.muted', {}, a.es)),
        h('span.muted', {}, '/'),
        h('button.pair-word', { onclick: () => say(b.en, 0.8) }, h('b', {}, `🔊 ${b.en}`), h('small.muted', {}, b.es)));
    })),
    h('small.muted', {}, 'Toque cada palabra y fíjese en la diferencia antes de empezar.'),
    sc.n ? h('p.muted', {}, `Hasta ahora: ${sc.ok} de ${sc.n} bien (${pct(sc.acc)}).`) : null,
    h('div.row', {},
      h('button.primary', { onclick: () => runHear(R.pairRound([g.id]), self, g.example) }, `👂 Oír cuál es (${R.PAIR_ROUND})`),
      h('button', { disabled: canSay() ? null : true, onclick: () => runSay(R.pairRound([g.id]), self, g.example) }, `🎤 Decirlas (${R.PAIR_ROUND})`)),
    canSay() ? null : h('small.muted', {}, 'Este navegador no reconoce voz: puede entrenar el oído.')));
}

function savePair(item, mode, ok) {
  store.update(x => { x.practica.pairs = R.addPairResult(x.practica.pairs, item.group, mode, ok); x.activity = store.logInto(x.activity, 'sounds'); });
}

function pairFinal(title, items, results, back, again) {
  const ok = results.filter(Boolean).length;
  const missed = items.filter((_, i) => results[i] === false);
  mount(h('div.screen.practica', {},
    topbar(`👂 ${title}`, back),
    h('div.card.ok-card', {}, h('h3', {}, `${ok} de ${items.length} bien`),
      h('p.muted', {}, ok === items.length ? '¡Perfecto! Su oído ya las separa.' : ok >= items.length * 0.7 ? 'Muy bien. Repase las que fallaron.' : 'Estos sonidos cuestan al principio: repítalos unos días y verá el cambio.')),
    missed.length ? h('div.card', {}, h('b', {}, 'Las que fallaron'),
      missed.map(it => {
        const t = it.words[it.target], o = it.words[1 - it.target];
        return h('p', {}, h('button.tiny', { onclick: () => say(`${t.en}. ${o.en}.`, 0.8) }, '🔊'), ' ', h('b', {}, t.en), ` (${t.es}) no es `, h('b', {}, o.en), ` (${o.es})`);
      })) : null,
    h('div.row', {}, h('button.primary', { onclick: again }, 'Otra ronda'), h('button', { onclick: back }, 'Volver'))));
}

// Oír cuál de las dos sonó.
function runHear(items, back, title) {
  stopSpeaking();
  const results = [];
  let i = 0;
  const body = h('div', {});
  const progress = h('small.muted', {}, '');
  const show = () => {
    if (i >= items.length) { pairFinal(title, items, results, back, () => runHear(R.pairRound([...new Set(items.map(x => x.group))]), back, title)); return; }
    const it = items[i];
    const target = it.words[it.target];
    setText(progress, `${i + 1} de ${items.length}`);
    let answered = false;
    const feedback = h('div', {});
    const opt = (w, k) => h('button.option.pair-option', { onclick: e => {
      if (answered) return;
      answered = true;
      const ok = k === it.target;
      results.push(ok); savePair(it, 'hear', ok); buzz(ok ? 'good' : 'bad');
      e.currentTarget.classList.add(ok ? 'right' : 'wrong');
      if (!ok) body.querySelectorAll('.pair-option')[it.target].classList.add('right');
      const g = R.pairGroupById(it.group);
      fill(feedback,
        h('p', {}, ok ? '✓ ¡Bien!' : `Sonó «${target.en}» (${target.es}).`),
        ok ? null : h('small.muted', {}, g.how),
        h('div.row', {}, h('button.tiny', { onclick: () => say(`${it.words[0].en}. ${it.words[1].en}.`, 0.8) }, '🔊 Oír las dos'),
          h('button.primary', { onclick: () => { i++; show(); } }, i + 1 < items.length ? 'Siguiente' : 'Ver el resultado')));
    } }, h('b', {}, w.en), h('small.muted', {}, w.es));
    fill(body,
      h('div.card', {}, h('p', {}, '¿Cuál dijo?'),
        h('div.row', {}, h('button.tiny', { onclick: () => say(target.en, 0.9) }, '🔊 Otra vez'), h('button.tiny', { onclick: () => say(target.en, 0.65) }, '🐢 Despacio')),
        h('div.pair-options', {}, it.words.map(opt)), feedback));
    setTimeout(() => say(target.en, 0.9), 250);
  };
  mount(h('div.screen.practica', {}, topbar(`👂 ${title}`, () => { stopSpeaking(); back(); }), progress, body));
  show();
}

// Decir la palabra para que se entienda la suya (y no la otra).
function runSay(items, back, title) {
  stopSpeaking();
  const listener = new Listener();
  const results = [];
  let i = 0;
  const body = h('div', {});
  const progress = h('small.muted', {}, '');
  const show = () => {
    if (i >= items.length) { pairFinal(title, items, results, back, () => runSay(R.pairRound([...new Set(items.map(x => x.group))]), back, title)); return; }
    const it = items[i];
    const target = it.words[it.target], other = it.words[1 - it.target];
    const g = R.pairGroupById(it.group);
    setText(progress, `${i + 1} de ${items.length}`);
    const heard = h('p.muted', {}, '');
    const feedback = h('div', {});
    const next = h('button.primary', { onclick: () => { i++; show(); } }, i + 1 < items.length ? 'Siguiente' : 'Ver el resultado');
    let done = false;
    const mic = h('button.primary.wide', { onclick: async () => {
      if (listener.active) { listener.stop(); return; }
      stopSpeaking();
      setText(mic, '⏹ Listo'); mic.classList.add('recording');
      setText(heard, 'Escuchando…');
      try {
        const r = await listener.start({ lang: store.get().settings.targetLang, onInterim: t => setText(heard, t || 'Escuchando…') });
        if (!mic.isConnected) return;
        if (!r.text) { setText(heard, 'No se oyó nada. Intente otra vez.'); return; }
        setText(heard, `Se oyó: «${r.text}»`);
        const v = R.judgeSaid(r.text, it);
        if (v === 'unclear') { fill(feedback, h('p', {}, 'No sonó a ninguna de las dos. Dígala otra vez, sola y clara.')); return; }
        const ok = v === 'ok';
        if (!done) { results.push(ok); savePair(it, 'say', ok); done = true; }
        buzz(ok ? 'good' : 'bad');
        fill(feedback, h('p', {}, ok ? `✓ Se entendió «${target.en}».` : `Sonó a «${other.en}» (${other.es}).`),
          ok ? null : h('small.muted', {}, g.how), next);
      } catch (e) { setText(heard, e.message); }
      finally { setText(mic, '🎤 Decirla'); mic.classList.remove('recording'); }
    } }, '🎤 Decirla');
    fill(body,
      h('div.card.pair-say', {}, h('p.muted', {}, 'Diga esta palabra, sola:'),
        h('h2', {}, target.en), h('p.muted', {}, `${target.es} · no «${other.en}» (${other.es})`),
        h('div.row', {}, h('button.tiny', { onclick: () => say(target.en, 0.8) }, '🔊 Cómo suena'), h('button.tiny', { onclick: () => say(`${target.en}. ${other.en}.`, 0.8) }, '🔊 Las dos'))),
      mic, heard, feedback,
      h('button.link', { onclick: () => { if (!done) { results.push(false); savePair(it, 'say', false); } i++; show(); } }, 'Saltar'));
  };
  mount(h('div.screen.practica', {}, topbar(`🎤 ${title}`, () => { listener.abort(); stopSpeaking(); back(); }), progress, body));
  show();
}

// =====================================================================================
// 🎯 Sus errores repetidos (v46, desde el plan de hoy): decir bien lo que suele decir mal
// =====================================================================================
export const ERROR_REPS = 2;   // veces que hay que decirla bien para pasar a la siguiente

// Los errores activos que más se repiten (o uno en particular).
export function errorsToPractice(id = '', n = 3) {
  const list = activeErrors().slice().sort((a, b) => (b.count || 1) - (a.count || 1));
  const one = id ? list.find(e => e.id === id) : null;
  return one ? [one, ...list.filter(e => e.id !== id)].slice(0, n) : list.slice(0, n);
}

export function errorDrill({ back, id = '', review = null }) {
  stopSpeaking();
  const list = errorsToPractice(id);
  const listener = new Listener();
  const leave = () => { listener.abort(); stopSpeaking(); back(); };
  if (!list.length) {
    mount(h('div.screen.practica', {}, topbar('🎯 Sus errores', leave),
      h('div.card', {}, h('p', {}, 'No tiene errores activos. ¡Muy bien!'), h('p.muted', {}, 'Los errores de sus charlas, del diario y de sus grabaciones aparecen aquí cuando los guarda.')),
      review ? h('button.primary.wide', { onclick: review }, '🧠 Seguir con el repaso') : null));
    return;
  }
  let i = 0;
  const body = h('div', {});
  const show = () => {
    if (i >= list.length) {
      store.logActivity('errors');
      fill(body,
        h('div.card', {}, h('h3', {}, '✅ Listo'), h('p.muted', {}, 'Decir bien la frase varias veces, en voz alta, es lo que cambia el hábito. Mañana vuelva a decirlas una vez.'),
          list.map(e => h('div.row', {}, h('span', {}, `✓ ${e.right[0]}`), h('button.tiny', { onclick: ev => { setStatus(e, 'resuelto'); ev.currentTarget.replaceWith(h('small.good', {}, 'resuelto')); } }, 'Ya no me pasa')))),
        review ? h('button.primary.wide', { onclick: review }, '🧠 Seguir con el repaso') : null,
        h('button.wide', { onclick: leave }, 'Volver'));
      return;
    }
    const e = list[i];
    const target = e.right[0];
    let good = 0;
    const heard = h('p.muted', {}, '');
    const count = h('p.err-reps', {}, '');
    const drawCount = () => setText(count, `${'●'.repeat(good)}${'○'.repeat(Math.max(0, ERROR_REPS - good))}  ${good >= ERROR_REPS ? '¡Bien!' : `Dígala bien ${ERROR_REPS - good} ${ERROR_REPS - good === 1 ? 'vez' : 'veces'} más`}`);
    const next = h('button.primary.wide', { hidden: true, onclick: () => { i++; show(); } }, i + 1 < list.length ? 'Siguiente error' : 'Terminar');
    const judge = text => {
      const { score } = wordStates(target, text);
      fill(heard, h('span', {}, 'Se entendió: '), colored(target, text));
      if (score >= 80) { good++; buzz('good'); } else buzz('bad');
      drawCount();
      if (good >= ERROR_REPS) next.hidden = false;
    };
    const typed = h('input', { placeholder: 'O escríbala bien…', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'send' });
    typed.addEventListener('keydown', ev => { if (ev.key === 'Enter' && typed.value.trim()) { judge(typed.value); typed.value = ''; } });
    const mic = h('button.primary', { disabled: canListen || whisperOn() ? null : true, onclick: async () => {
      if (listener.active) { listener.stop(); return; }
      stopSpeaking();
      setText(mic, '⏹ Listo'); mic.classList.add('recording');
      setText(heard, 'Escuchando…');
      try {
        const r = await listener.start({ lang: store.get().settings.targetLang, onInterim: t => setText(heard, t || 'Escuchando…') });
        if (mic.isConnected) { if (r.text) judge(r.text); else setText(heard, 'No se oyó nada. Intente otra vez.'); }
      } catch (err) { setText(heard, err.message); }
      finally { setText(mic, '🎤 Decirla bien'); mic.classList.remove('recording'); }
    } }, '🎤 Decirla bien');
    fill(body,
      h('small.muted', {}, `${i + 1} de ${list.length}${e.count > 1 ? ` · le pasó ${e.count} veces` : ''}`),
      h('div.card', {},
        h('div.err-line.bad', {}, '✗ ', e.wrong[0]),
        h('div.err-line.good', {}, '✓ ', target, ' ', h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(target) }, '🔊'), h('button.tiny', { 'aria-label': 'Despacio', onclick: () => say(target, 0.65) }, '🐢')),
        e.why ? h('p.muted', {}, e.why) : null),
      count, h('div.row', {}, mic), typed, heard, next);
    drawCount();
    setTimeout(() => say(target), 250);
  };
  mount(h('div.screen.practica', {}, topbar('🎯 Sus errores', leave), body));
  show();
}
