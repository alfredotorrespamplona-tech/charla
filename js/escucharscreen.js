// Pantalla «Escuchar» (contenido en escuchar.js). Cada historia en 3 pasos: 1) escucharla sin texto,
// 2) responder 3 preguntas, 3) leerla tocando las palabras que no sabe y llevar a su repaso las frases que le
// gusten. La voz es la del teléfono (o la natural); con IA puede crear historias nuevas sobre lo que quiera.
import * as store from './store.js';
import { chatJson, hasAI } from './llm.js';
import * as P from './prompts.js';
import { h, mount, toast, spinner, setText, buzz } from './ui.js';
import { speak, stopSpeaking } from './speech.js';
import { openWordExplorer, addVocab, findVocab } from './words.js';
import { practicePronunciation } from './pronounce.js';
import * as E from './escuchar.js';

const MAX_MINE = 30;
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
const topbar = (title, onBack) => h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: onBack }, '←'), h('h2', {}, title));
const data = () => store.get().escuchar;
const pct = x => `${Math.round(x * 100)} %`;
const voiceOf = (piece, who) => ({ voice: { gender: (piece.voices?.[who] || 'f') === 'm' ? 'male' : 'female' } });

// Guarda la nota y cuenta el tiempo de escucha de hoy (suma a los minutos del día).
function recordListen(piece, score, seconds) {
  store.update(s => {
    const e = s.escuchar, today = store.todayIso();
    if (score != null) e.done[piece.id] = Math.max(e.done[piece.id] ?? 0, Math.round(score * 100) / 100);
    if (e.today?.date !== today) e.today = { date: today, count: 0, seconds: 0 };
    if (score != null) e.today.count += 1;
    e.today.seconds += seconds;
    e.seconds = (e.seconds || 0) + seconds;
    if (seconds > 0) {
      if (s.daily?.date !== today) s.daily = { date: today, seconds: 0 };
      s.daily.seconds += seconds;
    }
  });
}

// Lista: su nivel primero, con las de la IA aparte.
export function escucharScreen({ home }) {
  stopSpeaking();
  const s = store.get();
  const done = s.escuchar.done;
  const level = E.levelForRank(s.rank, done);
  const next = E.nextPiece(s.rank, done);
  let shown = s.escuchar.level || level;
  const list = h('div.listen-list');
  const back = () => escucharScreen({ home });
  const card = p => h('button.listen-card', { class: (done[p.id] ?? -1) >= 2 / 3 ? 'done' : '', onclick: () => openPiece(p, back) },
    h('span.listen-icon', {}, p.icon || '🎧'),
    h('span.listen-text', {}, h('b', {}, p.titleEs), h('small', {}, `${E.KINDS[p.kind]} · ${p.level} · ${E.minutesOf(p)} min`)),
    h('span.listen-score', {}, done[p.id] != null ? `✓ ${pct(done[p.id])}` : '›'));
  const draw = () => {
    const mine = data().mine.filter(p => p.level === shown);
    fill(list,
      h('div.chips', {}, E.LEVELS.map(l => h('button.chip', { class: l.id === shown ? 'sel' : '',
        onclick: () => { shown = l.id; store.update(x => { x.escuchar.level = l.id; }); draw(); } }, l.name))),
      h('p.muted', {}, E.LEVELS.find(l => l.id === shown).about + (shown === level ? ' · Es su nivel.' : '')),
      E.PIECES.filter(p => p.level === shown).map(card),
      mine.length ? [h('h3', {}, '🤖 Las que creó con IA'), mine.map(card)] : null);
  };
  draw();
  const today = s.escuchar.today?.date === store.todayIso() ? s.escuchar.today : { count: 0, seconds: 0 };
  mount(h('div.screen.listen', {},
    topbar('🎧 Escuchar', home),
    h('div.card', {},
      h('p', {}, 'Oír mucho inglés que entienda casi todo es lo que más hace crecer su inglés: las frases se le quedan sin estudiarlas.'),
      h('ol.listen-steps', {}, h('li', {}, 'Escúchela sin mirar el texto.'), h('li', {}, 'Responda 3 preguntas.'),
        h('li', {}, 'Léala tocando las palabras que no sabe, y lleve a su repaso las frases que le gusten.')),
      h('small.muted', {}, `Hoy: ${today.count} ${today.count === 1 ? 'escuchada' : 'escuchadas'} · ${Math.round((s.escuchar.seconds || 0) / 60)} min en total`)),
    h('button.primary.wide', { onclick: () => openPiece(next, back) }, `▶️ Escuchar la siguiente: ${next.titleEs}`),
    list,
    aiBox(back)));
}

// Crear una historia o un diálogo nuevo con IA, sobre lo que quiera y a su nivel.
function aiBox(back) {
  if (!hasAI()) return h('p.muted', {}, '🤖 Con una clave de IA (Ajustes) puede crear historias nuevas sobre lo que quiera.');
  const s = store.get();
  const topic = h('input', { placeholder: 'Sobre qué (ej.: mi primer día en un banco, una entrevista de ventas…)', enterkeyhint: 'go' });
  const kind = h('select', { 'aria-label': 'Tipo' }, h('option', { value: 'dialogo' }, '💬 Diálogo'), h('option', { value: 'historia' }, '📖 Historia'));
  const lvl = h('select', { 'aria-label': 'Nivel' }, E.LEVELS.map(l => h('option', { value: l.id, selected: l.id === E.levelForRank(s.rank, s.escuchar.done) }, l.name)));
  const out = h('div');
  const go = async () => {
    const t = topic.value.trim() || 'a normal day at work';
    fill(out, spinner('Escribiendo su historia…'));
    try {
      const raw = await chatJson('story', P.storyMessages({ topic: t, kind: kind.value, level: lvl.value }), { temperature: 0.8, maxTokens: 1600 });
      const piece = E.validPiece(raw, lvl.value);
      if (!piece) throw new Error('La IA no armó bien la historia. Intente otra vez.');
      store.update(x => { x.escuchar.mine = [piece, ...x.escuchar.mine].slice(0, MAX_MINE); x.escuchar.level = piece.level; });
      openPiece(piece, back);
    } catch (e) { fill(out, h('p.warn', {}, e.message)); }
  };
  topic.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  return h('div.card', {}, h('b', {}, '🤖 Historia nueva con IA'), topic, h('div.row', {}, kind, lvl), h('button.secondary', { onclick: go }, 'Crearla'), out);
}

// Una historia: escuchar → preguntas → texto.
export function openPiece(piece, back) {
  stopSpeaking();
  let rate = store.get().escuchar.rate || 0.9;
  let playing = false, stopFlag = false, showText = false, current = -1, listenedMs = 0, recorded = false;
  const picks = [];
  const player = h('div.listen-player');
  const quiz = h('div.listen-quiz');
  const text = h('div.listen-text-box');
  const status = h('p.muted');

  const lineEls = [];
  const playAll = async (from = 0) => {
    if (playing) { stopFlag = true; stopSpeaking(); return; }
    playing = true; stopFlag = false;
    drawPlayer();
    const t0 = Date.now();
    for (let i = from; i < piece.lines.length && !stopFlag; i++) {
      current = i;
      lineEls.forEach((el, k) => el.classList.toggle('now', k === i));
      const l = piece.lines[i];
      await speak(l.en, { rate, character: voiceOf(piece, l.who) });
      if (!stopFlag) await new Promise(r => setTimeout(r, l.who ? 350 : 250));
    }
    listenedMs += Date.now() - t0;
    playing = false; current = -1;
    lineEls.forEach(el => el.classList.remove('now'));
    if (!stopFlag) setText(status, showText ? '' : 'Ahora responda las preguntas sin mirar el texto. Puede escucharla otra vez.');
    drawPlayer();
  };
  const drawPlayer = () => fill(player,
    h('button.primary.wide', { onclick: () => playAll(0) }, playing ? '⏹ Parar' : listenedMs ? '🔁 Escuchar otra vez' : '▶️ Escuchar'),
    h('div.chips', {}, E.SPEEDS.map(sp => h('button.chip', { class: sp.rate === rate ? 'sel' : '',
      onclick: () => { rate = sp.rate; store.update(s => { s.escuchar.rate = rate; }); drawPlayer(); } }, sp.label))),
    status);

  const drawQuiz = () => {
    const qs = piece.questions || [];
    if (!qs.length) { fill(quiz); return; }
    const answered = picks.filter(x => x != null).length;
    fill(quiz, h('h3', {}, '❓ ¿Qué entendió?'),
      qs.map((q, i) => h('div.listen-q', {},
        h('p', {}, h('b', {}, `${i + 1}. `), q.q),
        h('div.listen-options', {}, q.options.map((o, k) => h('button.option', {
          class: picks[i] == null ? '' : k === q.answer ? 'right' : k === picks[i] ? 'wrong' : 'dim',
          disabled: picks[i] != null ? true : null,
          onclick: () => { picks[i] = k; buzz(k === q.answer ? 'good' : 'bad'); drawQuiz(); if (picks.filter(x => x != null).length === qs.length) finishQuiz(); },
        }, o))))),
      answered === qs.length ? h('p.big', {}, `${E.quizScore(piece, picks) >= 2 / 3 ? '🎉' : '💪'} ${qs.filter((q, i) => picks[i] === q.answer).length} de ${qs.length}`) : null);
  };
  const finishQuiz = () => {
    const score = E.quizScore(piece, picks);
    if (!recorded) { recorded = true; recordListen(piece, score, Math.round(listenedMs / 1000)); listenedMs = 0; }
    showText = true;
    drawText();
    setText(status, score >= 2 / 3 ? '¡Bien! Ahora léala: toque las palabras que no sepa.' : 'Léala ahora con el texto y escúchela otra vez: la segunda vez se entiende mucho más.');
  };

  const drawText = () => {
    lineEls.length = 0;
    if (!showText) {
      fill(text, h('button.secondary.wide', { onclick: () => { showText = true; drawText(); } }, '👁 Ver el texto (mejor después de las preguntas)'));
      return;
    }
    fill(text, h('h3', {}, '📜 El texto'), h('p.muted', {}, 'Toque una palabra para ver qué significa. ⭐ lleva la frase a su repaso.'),
      piece.lines.map((l, i) => {
        const es = h('p.listen-es.hidden', {}, l.es);
        const saved = !!findVocab(l.en);
        const star = h('button.tiny', { 'aria-label': 'Llevar al repaso', disabled: saved ? true : null,
          onclick: () => { if (addVocab({ text: l.en, translation: l.es, type: 'Phrase', source: 'escuchar', context: piece.title })) { star.disabled = true; setText(star, '⭐'); } } }, saved ? '⭐' : '☆');
        const row = h('div.listen-line', {},
          l.who ? h('small.listen-who', {}, l.who) : null,
          h('p.listen-en', {}, E.tappable(l.en).map(tk => tk.w
            ? h('button.word', { onclick: () => openWordExplorer(tk.w, l.en) }, tk.t) : tk.t)),
          es,
          h('div.row.listen-tools', {},
            h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => speak(l.en, { rate, character: voiceOf(piece, l.who) }) }, '🔊'),
            h('button.tiny', { 'aria-label': 'Despacio', onclick: () => speak(l.en, { rate: 0.7, character: voiceOf(piece, l.who) }) }, '🐢'),
            h('button.tiny', { onclick: () => es.classList.toggle('hidden') }, '🌐 Español'),
            h('button.tiny', { 'aria-label': 'Repetirla', onclick: () => practicePronunciation(l.en) }, '🗣 Repetir'),
            star));
        lineEls.push(row);
        return row;
      }),
      h('div.row', {},
        h('button.small', { onclick: () => {
          let n = 0;
          for (const l of piece.lines) if (addVocab({ text: l.en, translation: l.es, type: 'Phrase', source: 'escuchar', context: piece.title })) n++;
          if (!n) toast('Ya estaban todas en su repaso'); else drawText();
        } }, '📒 Todas al repaso'),
        h('button.small', { onclick: () => playAll(0) }, '🔊 Escucharla leyendo')));
  };

  const exit = () => {
    stopFlag = true; stopSpeaking();
    if (!recorded && listenedMs > 5000) recordListen(piece, null, Math.round(listenedMs / 1000));   // cuenta el rato que escuchó
    back();
  };
  drawPlayer(); drawQuiz(); drawText();
  mount(h('div.screen.listen-piece', {},
    topbar(`${piece.icon || '🎧'} ${piece.titleEs}`, exit),
    h('p.muted', {}, `${E.KINDS[piece.kind]} · ${piece.level} · «${piece.title}»`),
    player, quiz, text,
    piece.mine ? h('button.link', { onclick: () => {
      if (!confirm('¿Borrar esta historia?')) return;
      store.update(s => { s.escuchar.mine = s.escuchar.mine.filter(p => p.id !== piece.id); });
      exit();
    } }, '🗑 Borrar esta historia') : null));
}
