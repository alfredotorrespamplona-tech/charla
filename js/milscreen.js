// Pantallas del mazo de mil palabras (Refold Inglés-mil): importar el .apkg, estudiar y ver la lista.
// Cómo se estudia (como en Anki, al estilo Refold):
//  1. Ve la palabra y la escucha. Intenta recordar qué significa, sin mirar.
//  2. Toca «Mostrar»: ve el significado, la frase de ejemplo con su audio y la traducción.
//  3. Se califica con honestidad: Otra vez · Difícil · Bien · Fácil. Eso decide cuándo vuelve.
import * as store from './store.js';
import * as M from './mil.js';
import * as D from './deckdb.js';
import { openApkg, zipBlob, mimeOf } from './apkg.js';
import { h, mount, sheet, closeSheet, toast, progressBar, spinner, buzz, setText } from './ui.js';
import { speak, stopSpeaking } from './speech.js';
import { practicePronunciation } from './pronounce.js';
import { addVocab, findVocab } from './words.js';
import * as scoring from './scoring.js';
import { whenLabel } from './srs.js';

export const milOf = (s = store.get()) => M.normalize(s.mil);
function updateMil(fn) { store.update(s => { s.mil = M.normalize(s.mil); fn(s.mil, s); }); }

// ---------------- Audio del mazo ----------------
let player = null, playToken = 0;
const urls = new Map();
function urlFor(name, blob) {
  let u = urls.get(name);
  if (!u) {
    u = URL.createObjectURL(blob);
    urls.set(name, u);
    if (urls.size > 40) { const [k, old] = urls.entries().next().value; URL.revokeObjectURL(old); urls.delete(k); }
  }
  return u;
}
export function stopAudio() { playToken++; if (player) { player.pause(); player = null; } stopSpeaking(); }
function releaseAudio() { stopAudio(); for (const u of urls.values()) URL.revokeObjectURL(u); urls.clear(); }

// Suena el audio del mazo; si no está (no se importó), lo lee la voz del teléfono.
async function play(name, fallback, token = ++playToken) {
  if (player) { player.pause(); player = null; }
  stopSpeaking();
  const blob = name ? await D.getMedia(name).catch(() => null) : null;
  if (token !== playToken) return;
  if (!blob) { if (fallback) await speak(fallback, { rate: 0.9 }); return; }
  const a = new Audio(urlFor(name, blob));
  player = a;
  await new Promise(res => { a.onended = res; a.onerror = res; a.play().catch(res); });
  if (player === a) player = null;
}
// Varias seguidas (palabra y luego frase), cancelables.
async function playSeq(items) {
  const token = ++playToken;
  for (const [name, text] of items) {
    if (token !== playToken) return;
    await play(name, text, token);
    if (token !== playToken) return;
    await new Promise(r => setTimeout(r, 250));
  }
}

function imageEl(name) {
  if (!name) return null;
  const img = h('img.mil-img', { alt: '', decoding: 'async' });
  D.getMedia(name).then(b => { if (b) img.src = urlFor(name, b); else img.remove(); }).catch(() => img.remove());
  return img;
}

// Achica una imagen a 480 px (las del mazo pesan ~150 KB cada una; así quedan en ~25 KB).
async function shrinkImage(blob, max = 480) {
  try {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), hh = Math.max(1, Math.round(bmp.height * k));
    const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, hh) : Object.assign(document.createElement('canvas'), { width: w, height: hh });
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, hh);
    bmp.close?.();
    const out = canvas.convertToBlob
      ? await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 })
      : await new Promise(r => canvas.toBlob(r, 'image/webp', 0.8));
    return out && out.size && out.size < blob.size ? out : blob;
  } catch { return blob; }
}

// ---------------- Pantalla principal del mazo ----------------
export async function milScreen({ home }) {
  releaseAudio();
  const screen = h('div.screen.mil', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: () => { releaseAudio(); home(); } }, '←'), h('h2', {}, '📇 Mil palabras')),
    spinner('Abriendo el mazo…'));
  mount(screen);
  const cards = await D.loadCards();
  if (!screen.isConnected) return;
  screen.lastChild.remove();
  const ctx = { home, cards };
  if (!cards?.length) { screen.append(...importView(ctx)); return; }
  screen.append(...deckView(ctx));
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
        h('div', {}, h('b', {}, m.name || 'Refold Inglés-mil'), h('small.muted', {}, `${c.total} palabras, de la más usada a la menos usada`)),
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
      h('label.check', {}, auto, ' 🔊 Reproducir el audio solo'),
      h('p.muted', {}, `El mazo está guardado solo en este teléfono${m.images ? ', con imágenes' : ''}. Su avance va en la copia de seguridad; el mazo no (en otro teléfono se vuelve a importar el archivo).`),
      h('div.row', {},
        h('button.small', { onclick: () => { mount(h('div.screen.mil', {}, h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: () => milScreen(ctx) }, '←'), h('h2', {}, '📂 Importar de nuevo')), ...importView({ ...ctx, again: true }))); } }, '📂 Importar de nuevo'),
        h('button.small.danger', { onclick: e => {
          const b = e.currentTarget;
          if (!b.dataset.armed) { b.dataset.armed = '1'; setText(b, '¿Seguro? Toque otra vez'); return; }
          D.clearDeck().then(() => { updateMil(x => { x.imported = false; }); toast('Mazo quitado del teléfono. Su avance se conserva.'); milScreen(ctx); })
            .catch(err => toast(err.message, 'bad'));
        } }, '🗑 Quitar el mazo'))),
  ];
}

// ---------------- Importar ----------------
function importView(ctx) {
  const m = milOf();
  const images = h('input', { type: 'checkbox', checked: !m.importedAt || m.images });
  const out = h('div.mil-import-out');
  const pick = h('button.primary.wide', { onclick: () => {
    const f = h('input', { type: 'file', accept: '.apkg,application/octet-stream,application/zip' });
    f.onchange = () => { if (f.files[0]) runImport(f.files[0], images.checked, out, pick, ctx); };
    f.click();
  } }, '📂 Elegir el archivo .apkg');
  const resumed = Object.keys(m.cards).length;
  return [
    h('div.card', {},
      h('p', {}, h('b', {}, 'Su mazo de Anki «Refold Inglés-mil»'), ': las 1000 palabras más usadas del inglés, cada una con su significado, una frase de ejemplo con traducción, y el audio de la palabra y de la frase.'),
      ctx.again ? null : h('p.muted', {}, '🔒 El archivo se lee aquí mismo, en el teléfono, y queda guardado solo en él. No se sube a internet.'),
      resumed ? h('p.good', {}, `Su avance (${resumed} palabras vistas) se conserva al importar.`) : null,
      h('ol.steps', {},
        h('li', {}, 'Pase ', h('b', {}, 'Refold-Ingles-mil-v2.apkg'), ' al teléfono: por ejemplo súbalo a Google Drive desde el computador, o envíeselo por correo o WhatsApp y descárguelo.'),
        h('li', {}, 'Toque el botón y búsquelo (en Drive o en Descargas).'),
        h('li', {}, 'Espere a que termine: tarda uno o dos minutos. Después funciona sin internet.')),
      h('label.check', {}, images, ' 🖼 Guardar también las imágenes (ocupa unos 10 MB más)'),
      pick,
      out),
  ];
}

async function runImport(file, withImages, out, pick, ctx) {
  pick.disabled = true;
  const status = h('p.muted', {}, 'Leyendo el mazo…');
  const bar = h('div', {}, progressBar(0));
  out.replaceChildren(status, bar);
  const paint = (text, frac) => { setText(status, text); bar.replaceChildren(progressBar(frac)); };
  // Que la pantalla no se apague mientras importa (si el teléfono lo permite).
  let lock = null;
  try { lock = await navigator.wakeLock?.request('screen'); } catch {}
  try {
    const deck = await openApkg(file);
    const have = await D.mediaNames().catch(() => new Set());
    const keepImage = c => c.image && deck.media.has(c.image) && (withImages || have.has(c.image));
    const needed = new Set();
    for (const c of deck.cards) {
      for (const n of [c.wordAudio, c.sentenceAudio]) if (n && deck.media.has(n)) needed.add(n);
      if (withImages && keepImage(c)) needed.add(c.image);
    }
    const todo = [...needed].filter(n => !have.has(n));
    paint(`Guardando ${deck.cards.length} palabras con sus audios…`, 0);
    let batch = [], done = 0;
    for (const name of todo) {
      const type = mimeOf(name);
      let blob = await zipBlob(file, deck.media.get(name), type);
      if (type.startsWith('image/')) blob = await shrinkImage(blob);
      batch.push([name, blob]);
      done++;
      if (batch.length >= 40) { await D.putMedia(batch); batch = []; }
      if (done % 20 === 0 || done === todo.length) paint(`Guardando audios${withImages ? ' e imágenes' : ''}… ${done} de ${todo.length}`, done / todo.length);
    }
    if (batch.length) await D.putMedia(batch);
    const cards = deck.cards.map(c => ({ ...c, image: keepImage(c) ? c.image : '' }));
    await D.saveCards(cards, { name: deck.name, count: cards.length, importedAt: Date.now(), images: withImages });
    updateMil(x => { x.imported = true; x.total = cards.length; x.name = deck.name; x.importedAt = Date.now(); x.images = withImages; });
    store.persistStorage();
    buzz('good');
    toast(`📇 Listo: ${cards.length} palabras en su teléfono`, 'good');
    milScreen({ home: ctx.home });
  } catch (e) {
    console.error(e);
    pick.disabled = false;
    out.replaceChildren(h('p.bad', {}, '⚠️ ', e.message || 'No se pudo importar el mazo.'));
  } finally {
    try { await lock?.release(); } catch {}
  }
}

// ---------------- Reverso de la tarjeta ----------------
function sentenceLine(card) {
  return h('p.mil-sentence', {}, M.highlightParts(card.sentence, card).map(p => p.hit ? h('b', {}, p.text) : p.text));
}

function cardBack(card) {
  const saved = !!findVocab(card.word);
  return h('div.mil-back', {},
    imageEl(card.image),
    h('ul.mil-defs', {}, card.defs.map(d => h('li', {}, d))),
    card.forms.length ? h('p.muted.mil-forms', {}, 'Formas: ', h('b', {}, card.forms.join(' · '))) : null,
    card.sentence ? h('div.mil-example', {},
      sentenceLine(card),
      h('p.muted.mil-tr', {}, card.translation),
      h('div.row', {},
        h('button.tiny', { onclick: () => play(card.sentenceAudio, card.sentence) }, '🔊 Frase'),
        h('button.tiny', { onclick: () => { stopAudio(); speak(card.sentence, { rate: 0.7 }); } }, '🐢 Despacio'),
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
  const cleanup = () => { document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onHide); releaseAudio(); };

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
        h('button.mil-play', { 'aria-label': 'Escuchar la palabra', onclick: () => play(card.wordAudio, card.word) }, '🔊'),
        back),
      showBtn,
      answersRow);
    if (milOf().autoplay !== false) play(card.wordAudio, card.word);
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    back.replaceChildren(cardBack(card));
    back.classList.remove('hidden');
    showBtn.remove();
    answersRow.classList.remove('hidden');
    if (milOf().autoplay !== false && card.sentence) playSeq([[card.sentenceAudio, card.sentence]]);
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
      h('div.mil-word', {}, c.front, ' ', h('button.tiny', { onclick: () => play(c.wordAudio, c.word) }, '🔊')),
      cardBack(c),
      x && x.ivl >= 1 ? h('p.muted', {}, `Vuelve ${whenLabel(x.due)} · la ha visto ${x.reps} ${x.reps === 1 ? 'vez' : 'veces'}`) : null), { onClose: stopAudio });
  };
  mount(h('div.screen.mil', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: () => { releaseAudio(); milScreen(ctx); } }, '←'), h('h2', {}, '📋 Las mil palabras')),
    search, seg, count, list));
  paint();
}
