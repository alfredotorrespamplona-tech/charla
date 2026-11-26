// Pantallas de «Mil palabras»: las 1000 palabras más usadas del inglés, ya incluidas en la app
// (js/milwords.js, sacadas de la lista de su cerebro de inglés). No hay nada que importar.
// Cómo se estudia (como en Anki, al estilo Refold):
//  1. Ve la palabra y la escucha. Intenta recordar qué significa, sin mirar.
//  2. Toca «Mostrar»: ve el significado, la frase de ejemplo (la lee la voz) y la traducción.
//  3. Se califica con honestidad: Otra vez · Difícil · Bien · Fácil. Eso decide cuándo vuelve.
import * as store from './store.js';
import * as M from './mil.js';
import { h, mount, sheet, toast, progressBar, spinner, buzz, setText } from './ui.js';
import { speak, stopSpeaking } from './speech.js';
import { practicePronunciation } from './pronounce.js';
import { addVocab, findVocab } from './words.js';
import * as scoring from './scoring.js';
import { whenLabel } from './srs.js';

export const milOf = (s = store.get()) => M.normalize(s.mil);
function updateMil(fn) { store.update(s => { s.mil = M.normalize(s.mil); fn(s.mil, s); }); }

// ---------------- Voz ----------------
// La lee la voz del teléfono (la misma voz de mujer de las charlas).
const VOICE = { voice: { gender: 'female' } };
let playToken = 0;
export function stopAudio() { playToken++; stopSpeaking(); }
function play(text, rate = 0.9) {
  playToken++;
  stopSpeaking();
  return text ? speak(text, { rate, character: VOICE }) : Promise.resolve();
}

// ---------------- Pantalla principal del mazo ----------------
export async function milScreen({ home }) {
  stopAudio();
  const screen = h('div.screen.mil', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: () => { stopAudio(); home(); } }, '←'), h('h2', {}, '📇 Mil palabras')),
    spinner('Abriendo el mazo…'));
  mount(screen);
  let cards = null;
  try { cards = await M.loadMilCards(); } catch (e) { console.error(e); }
  if (!screen.isConnected) return;
  screen.lastChild.remove();
  if (!cards?.length) { screen.append(h('p.bad', {}, '⚠️ No se pudo abrir la lista de palabras. Revise la conexión y vuelva a intentarlo.')); return; }
  screen.append(...deckView({ home, cards }));
}

function deckView(ctx) {
  const { cards } = ctx;
  const m = milOf();
  const iso = store.todayIso();
  const c = M.counts(cards, m, Date.now(), iso);
  const day = m.day?.date === iso ? m.day : { answers: 0, newSeen: 0 };
  const start = () => study(ctx);
  const moreNew = () => { updateMil(x => { M.moreNew(x, iso); }); milScreen(ctx); };
  const nextAt = Object.values(m.cards).map(x => x.due).filter(d => d > Date.now()).sort((a, b) => a - b)[0];

  const newSel = h('select', { 'aria-label': 'Palabras nuevas por día', onchange: e => { updateMil(x => { x.newPerDay = +e.target.value; }); milScreen(ctx); } },
    M.NEW_PER_DAY.map(n => h('option', { value: n, selected: n === m.newPerDay }, `${n} por día${n === M.DEFAULT_NEW ? ' (recomendado)' : ''}`)));
  const auto = h('input', { type: 'checkbox', checked: m.autoplay !== false, onchange: e => updateMil(x => { x.autoplay = e.target.checked; }) });

  return [
    h('div.card.mil-hero', {},
      h('div.mil-hero-top', {},
        h('div', {}, h('b', {}, 'Las 1000 palabras más usadas'), h('small.muted', {}, 'De la más usada a la menos usada, cada una con su frase')),
        h('div.mil-big', {}, h('b', {}, String(c.learned)), h('small', {}, `de ${c.total}`))),
      progressBar(c.learned / Math.max(1, c.total), 'var(--good)'),
      h('div.mil-chips', {},
        h('span.mil-chip.due', {}, `🔁 ${c.due} ${c.due === 1 ? 'repaso' : 'repasos'}`),
        h('span.mil-chip.new', {}, `🆕 ${c.fresh} ${c.fresh === 1 ? 'nueva' : 'nuevas'}`),
        h('span.mil-chip', {}, `🌳 ${c.mature} maduras`)),
      c.toStudy
        ? h('button.primary.wide', { onclick: start }, `▶️ Estudiar (${c.toStudy})`)
        : h('div', {}, h('p.good.center', {}, `✅ Al día por hoy${day.answers ? ` · ${day.answers} respuestas` : ''}`),
          nextAt ? h('p.muted.center', {}, `Próximo repaso ${whenLabel(nextAt)}.`) : null,
          c.seen < c.total ? h('button.wide', { onclick: moreNew }, '➕ 5 palabras nuevas más hoy') : null),
      day.answers ? h('p.muted.center', {}, `Hoy: ${day.answers} respuestas · ${day.newSeen} ${day.newSeen === 1 ? 'nueva' : 'nuevas'}`) : null),
    h('button.secondary.wide', { onclick: () => listScreen(ctx) }, `📋 Ver las ${c.total} palabras`),
    h('details.card.mil-how', {},
      h('summary', {}, '¿Cómo se estudia?'),
      h('ol.steps', {},
        h('li', {}, 'Escuche la palabra e intente recordar qué significa, ', h('b', {}, 'sin mirar'), '.'),
        h('li', {}, 'Toque ', h('b', {}, 'Mostrar'), ': lea el significado y escuche la frase de ejemplo. Repítala en voz alta.'),
        h('li', {}, 'Califíquese con honestidad: ', h('b', {}, 'Otra vez'), ' si no la sabía (vuelve en unos minutos), ', h('b', {}, 'Difícil'), ', ', h('b', {}, 'Bien'), ' o ', h('b', {}, 'Fácil'), '. Eso decide cuándo vuelve.'),
        h('li', {}, 'Primero los repasos, después las nuevas. Pocas nuevas por día y todos los días: así no se acumulan.')),
      h('p.muted', {}, 'Cuando una palabra le salga en una charla, ya la va a reconocer.')),
    h('div.card', {},
      h('b', {}, '⚙️ Ajustes del mazo'),
      h('label', {}, 'Palabras nuevas'), newSel,
      h('label.check', {}, auto, ' 🔊 Leer la palabra y la frase en voz alta solas'),
      h('p.muted', {}, 'Las palabras vienen con la app y funcionan sin internet. Su avance va en la copia de seguridad.')),
  ];
}

// ---------------- Reverso de la tarjeta ----------------
function sentenceLine(card) {
  return h('p.mil-sentence', {}, M.highlightParts(card.sentence, card).map(p => p.hit ? h('b', {}, p.text) : p.text));
}

function cardBack(card) {
  const saved = !!findVocab(card.word);
  return h('div.mil-back', {},
    h('ul.mil-defs', {}, card.defs.map(d => h('li', {}, d))),
    card.forms.length ? h('p.muted.mil-forms', {}, 'Formas: ', h('b', {}, card.forms.join(' · '))) : null,
    card.sentence ? h('div.mil-example', {},
      sentenceLine(card),
      h('p.muted.mil-tr', {}, card.translation),
      h('div.row', {},
        h('button.tiny', { onclick: () => play(card.sentence) }, '🔊 Frase'),
        h('button.tiny', { onclick: () => play(card.sentence, 0.65) }, '🐢 Despacio'),
        h('button.tiny', { onclick: () => { stopAudio(); practicePronunciation(card.sentence); } }, '🎤 Decirla'),
        h('button.tiny', { disabled: saved, onclick: e => {
          if (addVocab({ text: card.word, translation: card.defs[0]?.replace(/^\([^)]*\)\s*/, '').replace(/\.$/, '') || '', type: typeFromDef(card.defs[0]), context: card.sentence })) { e.currentTarget.disabled = true; setText(e.currentTarget, '⭐ Guardada'); }
        } }, saved ? '⭐ Guardada' : '⭐ Guardar'))) : null);
}

// (v.) → Verb, (sus.) → Noun… para el vocabulario de la app.
export function typeFromDef(def = '') {
  const t = (def.match(/^\(([^)]+)\)/) || [])[1] || '';
  if (/^v/i.test(t)) return 'Verb';
  if (/^sus|^n/i.test(t)) return 'Noun';
  if (/^adj/i.test(t)) return 'Adjective';
  if (/^adv/i.test(t)) return 'Adverb';
  return '';
}

// ---------------- Estudiar ----------------
const ANSWERS = [
  { key: 'again', label: 'Otra vez', cls: 'again' },
  { key: 'hard', label: 'Difícil', cls: 'hard' },
  { key: 'good', label: 'Bien', cls: 'good' },
  { key: 'easy', label: 'Fácil', cls: 'easy' },
];

function study(ctx) {
  const iso = store.todayIso();
  const q = M.buildQueue(ctx.cards, milOf(), Date.now(), iso);
  const queue = [...q.learning, ...q.reviews, ...q.fresh];
  if (!queue.length) { toast('Nada que estudiar por ahora ✅'); return milScreen(ctx); }
  const stats = { answered: 0, right: 0, fresh: 0, again: 0 };
  let undo = null;
  let revealed = false;
  const screen = h('div.screen.mil.mil-study', {});
  mount(screen);

  const leave = () => { cleanup(); milScreen(ctx); };
  const onKey = e => {
    if (e.target.closest?.('input, textarea, select') || document.querySelector('.sheet-backdrop')) return;
    if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); reveal(); }
    else if (revealed && ['1', '2', '3', '4'].includes(e.key)) answer(ANSWERS[+e.key - 1].key);
  };
  const onHide = () => { if (document.hidden) stopAudio(); };
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);
  const cleanup = () => { document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onHide); stopAudio(); };

  const remaining = () => {
    const m = milOf();
    let n = 0, r = 0, l = 0;
    for (const c of queue) { const x = m.cards[c.id]; if (!x) n++; else if (x.ivl < 1) l++; else r++; }
    return { n, r, l };
  };

  let card, back, answersRow, showBtn;
  function show() {
    card = queue[0];
    revealed = false;
    const m = milOf();
    const st = m.cards[card.id];
    const stage = M.stageOf(st);
    const left = remaining();
    back = h('div.mil-back-wrap.hidden');
    answersRow = h('div.mil-answers.hidden', {}, ANSWERS.map((a, i) => h('button.mil-ans', { class: a.cls, onclick: () => answer(a.key), 'aria-label': `${a.label} (${i + 1})` },
      h('b', {}, a.label), h('small', {}, M.intervalLabel(st, a.key)))));
    showBtn = h('button.primary.wide.mil-show', { onclick: reveal }, 'Mostrar respuesta');
    screen.replaceChildren(
      h('div.topbar', {},
        h('button.icon', { 'aria-label': 'Salir', onclick: leave }, '✕'),
        h('div.mil-counts', { 'aria-label': `${left.n} nuevas, ${left.l} aprendiendo, ${left.r} repasos` },
          h('span.c-new', {}, String(left.n)), h('span.c-learn', {}, String(left.l)), h('span.c-rev', {}, String(left.r))),
        undo ? h('button.icon', { 'aria-label': 'Deshacer la última respuesta', title: 'Deshacer', onclick: doUndo }, '↩️') : null),
      h('div.card.mil-card', {},
        h('div.mil-meta', {}, h('small.muted', {}, `#${card.id}`), h('span.mil-stage', { class: stage.key }, stage.label)),
        h('div.mil-word', {}, card.front),
        h('button.mil-play', { 'aria-label': 'Escuchar la palabra', onclick: () => play(card.word, 0.8) }, '🔊'),
        back),
      showBtn,
      answersRow);
    if (milOf().autoplay !== false) play(card.word, 0.8);
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    back.replaceChildren(cardBack(card));
    back.classList.remove('hidden');
    showBtn.remove();
    answersRow.classList.remove('hidden');
    if (milOf().autoplay !== false && card.sentence) play(card.sentence);
    back.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }

  function answer(key) {
    if (!revealed) return;
    stopAudio();
    const m = milOf();
    const prev = m.cards[card.id] ? { ...m.cards[card.id] } : null;
    const dayBefore = m.day?.date === iso ? { ...m.day } : { date: iso, newSeen: 0, answers: 0, bonus: 0 };
    const next = M.grade(prev, key);
    undo = { card, prev, dayBefore, queue: queue.slice(), stats: { ...stats } };
    let reachedStreak = false;
    store.logActivity('words');
    updateMil(x => {
      x.cards[card.id] = next;
      const d = M.today(x, iso);
      d.answers++;
      if (!prev) d.newSeen++;
      reachedStreak = d.answers === M.STREAK_ANSWERS;
    });
    if (reachedStreak && !scoring.streakStatus().doneToday) { scoring.updateStreak(); toast(`🔥 ${M.STREAK_ANSWERS} respuestas: hoy cuenta para su racha`, 'good'); }
    stats.answered++;
    if (!prev) stats.fresh++;
    if (key === 'again') { stats.again++; buzz('bad'); } else stats.right++;
    queue.shift();
    if (key === 'again') queue.splice(Math.min(queue.length, M.AGAIN_GAP), 0, card);
    if (queue.length) show(); else done();
  }

  function doUndo() {
    if (!undo) return;
    const u = undo;
    undo = null;
    updateMil(x => {
      if (u.prev) x.cards[u.card.id] = u.prev; else delete x.cards[u.card.id];
      x.day = u.dayBefore;
    });
    queue.splice(0, queue.length, ...u.queue);
    Object.assign(stats, u.stats);
    show();
  }

  function done() {
    cleanup();
    const m = milOf();
    const c = M.counts(ctx.cards, m, Date.now(), iso);
    const nextAt = Object.values(m.cards).map(x => x.due).filter(d => d > Date.now()).sort((a, b) => a - b)[0];
    buzz('star');
    mount(h('div.screen.mil', {},
      h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: () => milScreen(ctx) }, '←'), h('h2', {}, '📇 Mil palabras')),
      h('div.card.mil-done', {},
        h('h2', {}, '✅ ¡Listo por ahora!'),
        h('div.stats', {},
          h('div.stat', {}, h('b', {}, String(stats.answered)), h('small', {}, 'respuestas')),
          h('div.stat', {}, h('b', {}, String(stats.fresh)), h('small', {}, 'nuevas')),
          h('div.stat', {}, h('b', {}, stats.answered ? Math.round((stats.right / stats.answered) * 100) + '%' : '—'), h('small', {}, 'acertadas'))),
        h('p', {}, `Sabe ${c.learned} de ${c.total} palabras.`),
        nextAt ? h('p.muted', {}, `Próximo repaso ${whenLabel(nextAt)}.`) : null),
      c.seen < c.total ? h('button.wide', { onclick: () => { updateMil(x => { M.moreNew(x, iso); }); study(ctx); } }, '➕ 5 palabras nuevas más') : null,
      h('button.primary.wide', { onclick: () => ctx.home() }, 'Volver al inicio')));
  }

  show();
}

// ---------------- Lista de las mil ----------------
const FILTERS = [['', 'Todas'], ['new', 'Nuevas'], ['learning', 'Aprendiendo'], ['young', 'En repaso'], ['mature', 'Maduras']];
export function filterCards(cards, m, q = '', stage = '') {
  const t = q.trim().toLowerCase();
  return cards.filter(c => (!stage || M.stageOf(m.cards[c.id]).key === stage)
    && (!t || c.word.toLowerCase().includes(t) || c.front.toLowerCase().includes(t) || c.defs.some(d => d.toLowerCase().includes(t)) || String(c.id) === t));
}

function listScreen(ctx) {
  let stage = '', q = '';
  const m = milOf();
  const list = h('div.mil-list');
  const count = h('small.muted');
  const paint = () => {
    const rows = filterCards(ctx.cards, m, q, stage);
    count.textContent = `${rows.length} palabras`;
    const frag = document.createDocumentFragment();
    for (const c of rows.slice(0, 400)) {
      const st = M.stageOf(m.cards[c.id]);
      frag.append(h('button.mil-row', { onclick: () => detail(c) },
        h('small.muted.mil-n', {}, String(c.id)),
        h('span.mil-row-word', {}, h('b', {}, c.front), h('small', {}, c.defs[0] || '')),
        h('span.mil-dot', { class: st.key, title: st.label })));
    }
    list.replaceChildren(frag);
    if (rows.length > 400) list.append(h('p.muted.center', {}, `Hay ${rows.length - 400} más: busque una palabra.`));
  };
  let t = null;
  const search = h('input.text-input', { type: 'search', placeholder: 'Buscar en inglés o en español', oninput: e => { clearTimeout(t); t = setTimeout(() => { q = e.target.value; paint(); }, 150); } });
  const seg = h('div.chips', {}, FILTERS.map(([k, label]) => h('button.chip', { class: k === stage ? 'sel' : '', onclick: e => {
    stage = k; [...seg.children].forEach(b => b.classList.remove('sel')); e.currentTarget.classList.add('sel'); paint();
  } }, label)));
  const detail = c => {
    const st = M.stageOf(m.cards[c.id]);
    const x = m.cards[c.id];
    sheet(h('div.mil-detail', {},
      h('div.mil-meta', {}, h('small.muted', {}, `#${c.id}`), h('span.mil-stage', { class: st.key }, st.label)),
      h('div.mil-word', {}, c.front, ' ', h('button.tiny', { onclick: () => play(c.word, 0.8) }, '🔊')),
      cardBack(c),
      x && x.ivl >= 1 ? h('p.muted', {}, `Vuelve ${whenLabel(x.due)} · la ha visto ${x.reps} ${x.reps === 1 ? 'vez' : 'veces'}`) : null), { onClose: stopAudio });
  };
  mount(h('div.screen.mil', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: () => { stopAudio(); milScreen(ctx); } }, '←'), h('h2', {}, '📋 Las mil palabras')),
    search, seg, count, list));
  paint();
}
