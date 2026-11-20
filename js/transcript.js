// Transcripción de una charla (SessionTranscript): se ve durante la charla, en el resumen y en el historial.
// Cada línea se puede escuchar, traducir y practicar; la charla completa se copia como texto.
import { chatJson } from './llm.js';
import * as P from './prompts.js';
import { h, sheet, toast, richText } from './ui.js';
import { speak } from './speech.js';
import { practicePronunciation } from './pronounce.js';

const GRADE_ES = { Perfect: 'Perfecto', MostlyCorrect: 'Casi perfecto', SomeMistakes: 'Algunos errores', ManyMistakes: 'Varios errores', WrongLanguage: 'No fue en inglés' };
const GRADE_CLS = { Perfect: 'good', MostlyCorrect: 'good', SomeMistakes: 'warn', ManyMistakes: 'bad', WrongLanguage: 'bad' };

// Texto plano para copiar o compartir.
export function transcriptText(entries, { characterName = 'Personaje', learnerName = 'Yo', title = '', date } = {}) {
  const head = [title, date ? new Date(date).toLocaleString('es') : ''].filter(Boolean).join(' · ');
  const lines = entries.map(e => {
    const who = e.role === 'character' ? characterName : (learnerName || 'Yo');
    let line = `${who}: ${e.text}`;
    if (e.fix?.corrected && e.fix.corrected.trim().toLowerCase() !== e.text.trim().toLowerCase()) line += `\n   ✏️ ${e.fix.corrected}`;
    if (e.fix?.better) line += `\n   ✨ ${e.fix.better}`;
    return line;
  });
  return (head ? head + '\n\n' : '') + lines.join('\n');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('📋 Copiada como texto', 'good');
  } catch {
    if (navigator.share) { try { await navigator.share({ text }); return; } catch {} }
    toast('No se pudo copiar en este navegador.', 'bad');
  }
}

export function openTranscript(entries, { character, learnerName, title, date } = {}) {
  const name = character?.name || 'Personaje';
  const translations = new Map();
  const line = e => {
    const isChar = e.role === 'character';
    const tr = h('div.translation.hidden');
    const translate = async () => {
      if (!tr.classList.contains('hidden')) { tr.classList.add('hidden'); return; }
      tr.classList.remove('hidden');
      if (!translations.has(e.text)) {
        tr.textContent = '…';
        try { translations.set(e.text, (await chatJson('translate', P.translateMessages(e.text), { temperature: 0.2, maxTokens: 200, cache: true })).translation); }
        catch (err) { tr.textContent = err.message; return; }
      }
      tr.textContent = translations.get(e.text);
    };
    const changed = e.fix?.corrected && e.fix.corrected.trim().toLowerCase() !== e.text.trim().toLowerCase();
    return h('div.tline', { class: isChar ? 'char' : 'me' },
      h('div.who', {}, isChar ? name : (learnerName || 'Usted'),
        e.grade ? h('span.tgrade', { class: GRADE_CLS[e.grade] || '' }, GRADE_ES[e.grade] || '') : null),
      h('div.ttext', {}, e.text),
      tr,
      e.fix ? h('div.tfix', {},
        changed ? h('div', {}, h('small', {}, 'Corrección: '), e.fix.corrected) : null,
        e.fix.better ? h('div', {}, h('small', {}, 'Más natural: '), e.fix.better,
          ' ', h('button.tiny', { onclick: () => speak(e.fix.better, { character }) }, '🔊'),
          ' ', h('button.tiny', { onclick: () => practicePronunciation(e.fix.better, { character }) }, '🎤')) : null,
        e.fix.explanation ? h('p.muted', { html: richText(e.fix.explanation) }) : null) : null,
      h('div.actions', {},
        h('button.tiny', { onclick: () => speak(e.text, { character: isChar ? character : undefined, rate: 0.95 }) }, '🔊'),
        h('button.tiny', { onclick: translate }, '🌐'),
        h('button.tiny', { onclick: () => practicePronunciation(e.text, { character }) }, '🎤')));
  };
  sheet(h('div.transcript', {},
    h('div.transcript-head', {},
      h('h3', {}, '📜 ' + (title || 'Conversación')),
      h('button.small', { onclick: () => copyText(transcriptText(entries, { characterName: name, learnerName, title, date })) }, '📋 Copiar')),
    entries.length ? entries.map(line) : h('p.muted', {}, 'Todavía no hay nada que mostrar.')));
}
