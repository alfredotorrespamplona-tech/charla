// Explorador de palabras (ExploreWord) y vocabulario guardado (Bookmarks).
import * as store from './store.js';
import { chatJson, hasAI } from './llm.js';
import * as P from './prompts.js';
import { speak } from './speech.js';
import { h, sheet, toast, spinner, setText } from './ui.js';
import { tierFor, bumpFamiliarity, FAMILIARITY } from './scoring.js';
import { practicePronunciation } from './pronounce.js';
import { levelSettings } from './data.js';

const CATEGORY_ES = { Noun: 'sustantivo', Verb: 'verbo', Adjective: 'adjetivo', Adverb: 'adverbio', Pronoun: 'pronombre', Preposition: 'preposición', Conjunction: 'conjunción', Determiner: 'determinante', Interjection: 'interjección', Phrase: 'frase', Other: 'otro' };

const FORMALITY_ES = { informal: 'informal', neutral: 'neutra', formal: 'formal' };
const USEFUL_ES = { high: 'muy útil', medium: 'útil', low: 'poco común' };

// VocabularyCEFRLevel + VocabularyFormality + VocabularyPedagogicalUsefulness
function wordChips(w) {
  const chips = [
    w.level ? h('span.chip', { title: 'Nivel en el que se suele aprender' }, w.level) : null,
    FORMALITY_ES[w.formality] ? h('span.chip', { title: 'Formalidad' }, FORMALITY_ES[w.formality]) : null,
    USEFUL_ES[w.usefulness] ? h('span.chip', { title: 'Utilidad al conversar' }, USEFUL_ES[w.usefulness]) : null,
  ].filter(Boolean);
  return chips.length ? h('div.word-chips', {}, chips) : null;
}

// Formas de una palabra para buscarla en la lista: works → work, worked → work, making → make…
export function wordForms(word) {
  const w = String(word || '').toLowerCase().replace(/[’]/g, "'").replace(/[^a-z'-]/g, '');
  const out = [w];
  const add = x => { if (x && x.length > 1 && !out.includes(x)) out.push(x); };
  if (w.endsWith("'s")) add(w.slice(0, -2));
  if (w.endsWith('ies')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('s')) add(w.slice(0, -1));
  if (w.endsWith('ied')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) { add(w.slice(0, -2)); add(w.slice(0, -1)); if (/(.)\1ed$/.test(w)) add(w.slice(0, -3)); }
  if (w.endsWith('ing')) { add(w.slice(0, -3)); add(w.slice(0, -3) + 'e'); if (/(.)\1ing$/.test(w)) add(w.slice(0, -4)); }
  return out;
}

const MIL_CATEGORY = { 'sus.': 'Noun', 'v.': 'Verb', 'adj.': 'Adjective', 'adv.': 'Adverb', 'pron.': 'Pronoun', 'prep.': 'Preposition', 'conj.': 'Conjunction', 'interj.': 'Interjection' };

// La palabra sin IA: primero sus palabras guardadas y luego las Mil palabras (con sus formas irregulares).
// rows = MIL_WORDS ([rank, palabra, significado, formas, frase, traducción]).
export function localWord(word, rows = [], vocab = store.get().vocab || []) {
  const forms = wordForms(word);
  if (!forms[0]) return null;
  const saved = vocab.find(v => v.translation && forms.includes(String(v.text || '').toLowerCase()));
  if (saved) return { word: saved.text, translation: saved.translation, definition: saved.definition || '', phonetic: saved.phonetic || '',
    category: saved.type || '', example: saved.example || '', level: saved.level || '', formality: saved.formality || '', local: 'saved' };
  const row = rows.find(r => forms.includes(r[1].toLowerCase()))
    || rows.find(r => r[3] && r[3].toLowerCase().split(/\s*,\s*/).some(f => forms.includes(f)));
  if (!row) return null;
  const tag = (/^\((\w+\.)\)/.exec(row[2]) || [])[1];
  const meaning = row[2].replace(/\(\w+\.\)\s*/g, '').replace(/\.;\s*/g, '; ').replace(/\.$/, '');
  return { word: row[1], translation: meaning, definition: '', phonetic: '', category: MIL_CATEGORY[tag] || '',
    example: row[4], exampleEs: row[5], conjugation: row[3] ? `${row[1]} → ${row[3]}` : '', level: row[0] <= 300 ? 'A1' : row[0] <= 600 ? 'A2' : 'B1',
    rank: row[0], local: 'mil' };
}

export async function openWordExplorer(word, context, { ai = false } = {}) {
  if (!word) return;
  const panel = sheet(h('div', {}, spinner('Buscando «' + word + '»…')));
  const body = panel.lastChild;
  try {
    // Sin gastar: si la palabra ya está guardada o es de las Mil palabras, se muestra eso. La IA solo si la pide.
    let w = null;
    if (!ai) {
      const { MIL_WORDS } = await import('./milwords.js');
      w = localWord(word, MIL_WORDS);
    }
    if (!w) w = await chatJson('word', P.wordMessages(word, context), { temperature: 0.2, maxTokens: 300, cache: true });
    body.innerHTML = '';
    const existing = findVocab(w.word || word);
    const saveBtn = h('button.primary', {
      onclick: () => {
        addVocab({ text: w.word || word, translation: w.translation, type: w.category, definition: w.definition, phonetic: w.phonetic, example: w.example, context, level: w.level, formality: w.formality });
        saveBtn.disabled = true; setText(saveBtn, '⭐ Guardada');
      },
    }, existing ? '⭐ Ya está guardada' : '☆ Guardar palabra');
    if (existing) saveBtn.disabled = true;
    body.append(...[
      h('h2', {}, w.word || word, ' ', h('button.tiny', { onclick: () => speak(w.word || word, { rate: 0.85 }) }, '🔊'),
        ' ', h('button.tiny', { onclick: () => practiceVocab(w.word || word) }, '🎤 Pronunciar')),
      h('div.muted', {}, [w.phonetic, CATEGORY_ES[w.category] || w.category].filter(Boolean).join(' · ')),
      wordChips(w),
      translationLine(w.translation),
      h('p', {}, w.definition || ''),
      w.example ? h('p.example', {}, '“' + w.example + '” ', h('button.tiny', { onclick: () => speak(w.example, { rate: 0.9 }) }, '🔊'),
        ' ', h('button.tiny', { onclick: () => practicePronunciation(w.example) }, '🎤')) : null,
      w.exampleEs ? h('p.muted', {}, w.exampleEs) : null,
      w.conjugation ? h('p.muted', {}, 'Conjugación: ' + w.conjugation) : null,
      saveBtn,
      w.local ? h('p.muted', {}, w.local === 'saved' ? 'De sus palabras guardadas (sin gastar IA).' : `De las 1000 palabras más usadas, n.º ${w.rank} (sin gastar IA).`) : null,
      w.local && hasAI() ? h('button.small', { onclick: () => openWordExplorer(word, context, { ai: true }) }, '🤖 Ver qué significa en esta frase (con IA)') : null].filter(Boolean));
  } catch (e) {
    body.innerHTML = '';
    body.appendChild(h('p', {}, e.message));
  }
}

// En los niveles altos la traducción queda oculta hasta que la pida (primero intenta entender la definición).
function translationLine(text) {
  const st = store.get();
  if (!text) return null;
  if (levelSettings(st.rank, st.levelCustom).translation !== 'request') return h('p.big', {}, text);
  const p = h('p.big', {}, h('button.small', { onclick: () => { p.textContent = text; } }, '🌐 Ver traducción'));
  return p;
}

// Practicar una palabra; si está guardada y la dice bien, sube su familiaridad (una vez por práctica).
export function practiceVocab(text) {
  let rewarded = false;
  practicePronunciation(text, {
    onResult: score => {
      const v = findVocab(text);
      if (!v || rewarded || score < 80) return;
      rewarded = true;
      const u = bumpFamiliarity(v.id, FAMILIARITY.pronounced);
      if (u?.tierUp) toast(`⭐ «${u.text}» subió a ${tierFor(u.toScore).label}`, 'good');
    },
  });
}

export function findVocab(text) {
  const t = text.trim().toLowerCase();
  return store.get().vocab.find(v => v.text.toLowerCase() === t);
}

export function addVocab(item) {
  if (findVocab(item.text)) return false;
  store.update(s => s.vocab.unshift({
    id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
    score: 0, createdAt: Date.now(), lastUsed: 0, lastReviewed: 0, ...item,
  }));
  toast('⭐ Guardada: ' + item.text, 'good');
  return true;
}

export function tierBadge(score) {
  const t = tierFor(score);
  return h('span.tier', { class: 't-' + t.key }, t.label);
}
