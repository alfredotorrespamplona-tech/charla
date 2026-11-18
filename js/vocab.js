// Pantalla de vocabulario, como la de LingoLooper: ordenar por familiaridad o por fecha (agregada / usada),
// filtrar por nivel de familiaridad y por tipo de palabra, archivar, copiar todo como texto y
// «palabras sugeridas» (las que el coach propone al final de cada charla) para guardar con un toque.
import * as store from './store.js';
import * as scoring from './scoring.js';
import { h, mount, toast, progressBar, setText, sheet } from './ui.js';
import { speak, stopSpeaking } from './speech.js';
import { tierBadge, practiceVocab, addVocab, findVocab } from './words.js';

export const SORTS = [
  { key: 'recent', label: 'Agregadas hace poco', fn: (a, b) => (b.createdAt || 0) - (a.createdAt || 0) },
  { key: 'weak', label: 'Menos familiares', fn: (a, b) => a.score - b.score },
  { key: 'strong', label: 'Más familiares', fn: (a, b) => b.score - a.score },
  { key: 'used', label: 'Usadas hace poco', fn: (a, b) => (b.lastUsed || 0) - (a.lastUsed || 0) },
  { key: 'unused', label: 'Sin usar hace tiempo', fn: (a, b) => (a.lastUsed || 0) - (b.lastUsed || 0) },
  { key: 'az', label: 'A–Z', fn: (a, b) => a.text.localeCompare(b.text) },
];

export const TYPES = [
  { key: '', label: 'Todo' },
  { key: 'Noun', label: 'Sustantivos' },
  { key: 'Verb', label: 'Verbos' },
  { key: 'Adjective', label: 'Adjetivos' },
  { key: 'Adverb', label: 'Adverbios' },
  { key: 'Phrase', label: 'Frases' },
  { key: 'Other', label: 'Otras' },
];
const MAIN_TYPES = TYPES.slice(1, -1).map(t => t.key);

export function typeOf(v) {
  const t = (v.type || '').trim();
  if (MAIN_TYPES.includes(t)) return t;
  if (!t && /\s/.test(v.text.trim())) return 'Phrase';
  return 'Other';
}

// Lista filtrada y ordenada (sin DOM: se prueba en tests).
export function filterVocab(vocab, { q = '', tier = '', type = '', sort = 'recent', archived = false } = {}) {
  const query = q.trim().toLowerCase();
  const by = (SORTS.find(x => x.key === sort) || SORTS[0]).fn;
  return vocab
    .filter(v => !!v.archived === archived)
    .filter(v => !query || v.text.toLowerCase().includes(query) || (v.translation || '').toLowerCase().includes(query))
    .filter(v => !tier || scoring.tierFor(v.score).key === tier)
    .filter(v => !type || typeOf(v) === type)
    .slice().sort(by);
}

export function vocabAsText(vocab) {
  return vocab.map(v => [v.text, v.translation || '', scoring.tierFor(v.score).label].join('\t')).join('\n');
}

// ListenToVocabulary: escuchar las palabras guardadas como una lista de audio:
// la palabra en inglés, una pausa para repetirla en voz alta y su traducción.
export function listenVocab(list) {
  const items = list.filter(v => !v.archived).slice(0, 60);
  if (!items.length) { toast('No hay palabras para escuchar con estos filtros.'); return; }
  let i = 0, playing = false, token = 0;
  const now = h('div.listen-now');
  const count = h('p.muted.center');
  const playBtn = h('button.primary', { onclick: () => (playing ? pause() : play()) }, 'Pausa');
  const panel = sheet(h('div', {},
    h('h3', {}, '🔊 Escuchar su vocabulario'),
    h('p.muted', {}, 'Cada palabra en inglés, una pausa para repetirla en voz alta y su traducción.'),
    now, count,
    h('div.row.center', {},
      h('button', { onclick: () => { i = Math.max(0, i - 1); play(); } }, 'Anterior'),
      playBtn,
      h('button', { onclick: () => { i = Math.min(items.length - 1, i + 1); play(); } }, 'Siguiente'))),
    { onClose: () => { if (playing) pause(); } });   // al cerrar, se calla de inmediato
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function pause() { playing = false; token++; stopSpeaking(); setText(playBtn, 'Seguir'); }
  async function play() {
    const my = ++token;
    const ok = () => my === token && playing && panel.isConnected;
    playing = true; setText(playBtn, 'Pausa');
    stopSpeaking();
    while (ok() && i < items.length) {
      const v = items[i];
      now.replaceChildren(h('b.listen-en', {}, v.text), h('div.muted', {}, v.translation || ''));
      count.textContent = `${i + 1} de ${items.length}`;
      await speak(v.text, { rate: 0.85 }); if (!ok()) return;
      await wait(1800); if (!ok()) return;              // tiempo para repetirla
      if (v.translation) { await speak(v.translation, { lang: 'es' }); if (!ok()) return; }
      await wait(900); if (!ok()) return;
      i++;
    }
    if (ok() && i >= items.length) { now.replaceChildren(h('b', {}, '✅ Terminó la lista')); playing = false; i = 0; setText(playBtn, 'Otra vez'); }
  }
  play();
}

export function setArchived(id, archived) {
  store.update(s => {
    const v = s.vocab.find(x => x.id === id);
    if (v) { v.archived = archived; v.noReview = archived; }
  });
}

// Palabras sugeridas por el coach que todavía no guardó.
export function rememberSuggestions(list) {
  if (!list?.length) return;
  store.update(s => {
    for (const x of list) {
      if (!x?.text || s.suggestedVocab.some(y => y.text.toLowerCase() === x.text.toLowerCase())) continue;
      s.suggestedVocab.unshift({ text: x.text, translation: x.translation || '', type: x.type || '' });
    }
    s.suggestedVocab = s.suggestedVocab.slice(0, 30);
  });
}

export function pendingSuggestions(s = store.get()) {
  return s.suggestedVocab.filter(x => !findVocab(x.text));
}

export function vocabScreen({ home }) {
  const st = { q: '', tier: '', type: '', sort: 'recent', archived: false };
  const list = h('div.vocab-list');
  const search = h('input', { placeholder: 'Buscar…', oninput: () => { st.q = search.value; render(); } });
  const sortSel = h('select', { 'aria-label': 'Ordenar', onchange: () => { st.sort = sortSel.value; render(); } },
    SORTS.map(x => h('option', { value: x.key }, x.label)));
  const chips = (opts, key) => {
    const box = h('div.chips.vocab-filter', {}, opts.map(o => h('button.chip', {
      class: st[key] === o.key ? 'sel' : '',
      onclick: e => { st[key] = o.key; [...box.children].forEach(c => c.classList.remove('sel')); e.currentTarget.classList.add('sel'); render(); },
    }, o.label)));
    return box;
  };
  const tierChips = chips([{ key: '', label: 'Todas' }, ...scoring.TIERS], 'tier');
  const typeChips = chips(TYPES, 'type');
  const archBtn = h('button.link', { onclick: () => { st.archived = !st.archived; render(); } });
  const suggBox = h('div');

  function renderSuggestions() {
    suggBox.innerHTML = '';
    const sugg = pendingSuggestions();
    if (!sugg.length || st.archived) return;
    suggBox.append(h('div.card', {}, h('b', {}, `💡 Palabras sugeridas (${sugg.length})`),
      h('p.muted', {}, 'Las propuso el coach en sus charlas. Guarde las que quiera aprender.'),
      sugg.slice(0, 8).map(v => h('div.vocab-sugg', {},
        h('span', {}, h('b', {}, v.text), ' — ', v.translation),
        h('button.tiny', { onclick: () => speak(v.text, { rate: 0.85 }) }, '🔊'),
        h('button.tiny.primary', { onclick: () => { addVocab({ text: v.text, translation: v.translation, type: v.type, context: '' }); render(); } }, '+ Guardar')))));
  }

  function render() {
    const all = store.get().vocab;
    const items = filterVocab(all, st);
    const nArch = all.filter(v => v.archived).length;
    setText(archBtn, st.archived ? '← Volver a las palabras activas' : `🗄️ Archivadas (${nArch})`);
    archBtn.hidden = !st.archived && !nArch;
    renderSuggestions();
    list.innerHTML = '';
    if (!items.length) list.appendChild(h('p.muted', {}, all.length ? 'Ninguna palabra con estos filtros.' : 'Aún no hay palabras. Toque una palabra en la conversación para guardarla.'));
    for (const v of items) {
      list.appendChild(h('div.vocab-row', {},
        h('div', {}, h('b', {}, v.text), ' ', tierBadge(v.score), h('div.muted', {}, v.translation || ''),
          h('small.muted', {}, (TYPES.find(t => t.key === typeOf(v)) || TYPES[6]).label.replace(/s$/, '') + (v.lastUsed ? ` · usada ${new Date(v.lastUsed).toLocaleDateString('es')}` : ' · sin usar todavía')),
          progressBar(v.score / 100)),
        h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => speak(v.text, { rate: 0.85 }) }, '🔊'),
        h('button.tiny', { 'aria-label': 'Practicar pronunciación', onclick: () => practiceVocab(v.text) }, '🎤'),
        h('button.tiny', { 'aria-label': v.archived ? 'Desarchivar' : 'Archivar', onclick: () => { setArchived(v.id, !v.archived); toast(v.archived ? 'Vuelve a sus palabras' : 'Archivada: ya no sale en el repaso'); render(); } }, v.archived ? '↩️' : '🗄️'),
        h('button.tiny', { 'aria-label': 'Borrar', onclick: e => {
          const b = e.currentTarget;
          if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = '¿Borrar?'; return; }
          store.update(s => { s.vocab = s.vocab.filter(x => x.id !== v.id); }); render();
        } }, '🗑')));
    }
  }

  mount(h('div.screen', {},
    h('div.topbar', {}, h('button.icon', { onclick: home }, '←'), h('h2', {}, '📒 Vocabulario')),
    h('div.vocab-tools', {}, search, sortSel),
    tierChips, typeChips,
    suggBox,
    list,
    h('div.row.wide', {},
      archBtn,
      h('button.link', { onclick: () => listenVocab(filterVocab(store.get().vocab, st)) }, '🔊 Escuchar todo'),
      h('button.link', { onclick: () => { navigator.clipboard?.writeText(vocabAsText(filterVocab(store.get().vocab, st))); toast('Copiado como texto'); } }, '📋 Copiar todo'))));
  render();
}
