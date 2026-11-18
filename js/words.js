// Explorador de palabras (ExploreWord) y vocabulario guardado (Bookmarks).
import * as store from './store.js';
import { chatJson } from './llm.js';
import * as P from './prompts.js';
import { speak } from './speech.js';
import { h, sheet, toast, spinner, setText } from './ui.js';
import { tierFor, bumpFamiliarity, FAMILIARITY } from './scoring.js';
import { practicePronunciation } from './pronounce.js';
import { levelSettings } from './data.js';

const CATEGORY_ES = { Noun: 'sustantivo', Verb: 'verbo', Adjective: 'adjetivo', Adverb: 'adverbio', Pronoun: 'pronombre', Preposition: 'preposición', Conjunction: 'conjunción', Determiner: 'determinante', Interjection: 'interjección', Phrase: 'frase', Other: 'otro' };

const cache = new Map();
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

export async function openWordExplorer(word, context) {
  if (!word) return;
  const panel = sheet(h('div', {}, spinner('Buscando «' + word + '»…')));
  const body = panel.lastChild;
  try {
    const key = word.toLowerCase() + '|' + context;
    const w = cache.get(key) || await chatJson('word', P.wordMessages(word, context), { temperature: 0.2, maxTokens: 300 });
    cache.set(key, w);
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
      w.conjugation ? h('p.muted', {}, 'Conjugación: ' + w.conjugation) : null,
      saveBtn].filter(Boolean));
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
