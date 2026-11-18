// Práctica de pronunciación: el usuario dice una frase y se compara palabra por palabra con lo que
// entendió el reconocimiento de voz. No gasta tokens. (PronunciationPractice en el análisis, §5)
import * as store from './store.js';
import { Listener, speak, stopSpeaking, canListen } from './speech.js';
import { h, sheet, toast, setText } from './ui.js';

const norm = w => w.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']/g, '');
export const tokens = text => (text || '').split(/\s+/).map(norm).filter(Boolean);

// Qué palabras de la frase objetivo aparecen, en orden, en lo que se reconoció (subsecuencia común más larga).
export function compareWords(target, heard) {
  const a = tokens(target), b = tokens(heard);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Array(a.length).fill(false);
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { matched[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  const hits = matched.filter(Boolean).length;
  return { matched, score: a.length ? Math.round((hits / a.length) * 100) : 0 };
}

// Parecido entre dos palabras (0..1) con la distancia de edición: sirve para el "casi" (ámbar).
export function similarity(a, b) {
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

// Estado de cada palabra: 'ok' (verde, se entendió), 'close' (ámbar: se entendió algo parecido) o 'miss' (rojo).
export function wordStates(target, heard) {
  const { matched, score } = compareWords(target, heard);
  const heardWords = tokens(heard);
  const states = tokens(target).map((w, i) => (matched[i] ? 'ok'
    : (w.length >= 2 && heardWords.some(x => similarity(w, x) >= 0.6) ? 'close' : 'miss')));
  return { states, score };
}

export function verdict(score) {
  if (score >= 90) return { label: '¡Suena muy bien!', cls: 'good' };
  if (score >= 70) return { label: 'Casi: se entendió casi todo.', cls: 'good' };
  if (score >= 40) return { label: 'Se entendió una parte. Escuche y repita despacio.', cls: 'warn' };
  return { label: 'No se entendió. Escuche el ejemplo y vuelva a intentar.', cls: 'bad' };
}

// Hoja de práctica. Se puede tocar una palabra para practicarla sola.
// onResult(score): en cada intento de la frase completa.
// onSend({ durationMs, score }): agrega «Enviar» (practicar una sugerencia antes de decírsela al personaje).
export function practicePronunciation(target, { onResult, onSend, character } = {}) {
  const words = target.split(/\s+/).filter(Boolean);
  const spans = words.map((w, i) => h('button.pron-word', { onclick: () => focusWord(i), title: 'Practicar solo esta palabra' }, w));
  const line = h('p.sentence.pron-line', {}, spans.flatMap((sp, i) => (i ? [' ', sp] : [sp])));
  const focusBox = h('div.pron-focus.hidden', {});
  const heardEl = h('p.muted', {}, '');
  const resultEl = h('p', {}, '');
  const listener = new Listener();
  const micBtn = h('button.primary', { onclick: () => record() }, '🎤 Decirlo');
  let best = 0, bestDuration = 0, focus = -1;
  const sendBtn = onSend ? h('button.send-practiced', {
    disabled: true,
    onclick: () => { listener.abort(); onSend({ durationMs: bestDuration, score: best }); },
  }, '📤 Enviar') : null;
  const bare = w => w.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '');
  const current = () => (focus >= 0 ? bare(words[focus]) : target);

  function focusWord(i) {
    if (listener.active) return;
    focus = i;
    spans.forEach((sp, k) => sp.classList.toggle('focus', k === i));
    focusBox.classList.remove('hidden');
    focusBox.replaceChildren(h('span', {}, `Practicando solo «${bare(words[i])}»`),
      h('button.tiny', { onclick: () => unfocus() }, '↩ Frase completa'));
    speak(bare(words[i]), { rate: 0.7, character });
  }
  function unfocus() {
    focus = -1;
    spans.forEach(sp => sp.classList.remove('focus'));
    focusBox.classList.add('hidden');
  }
  function paint(i, state) {
    spans[i].classList.remove('ok', 'close', 'miss');
    if (state) spans[i].classList.add(state);
  }

  async function record() {
    if (!canListen) { toast('Este navegador no reconoce voz. Use Chrome en Android.', 'bad'); return; }
    if (listener.active) { listener.stop(); return; }
    stopSpeaking();
    setText(micBtn, '⏹ Listo');
    micBtn.classList.add('recording');
    heardEl.textContent = 'Escuchando…';
    resultEl.textContent = '';
    try {
      const { text, durationMs } = await listener.start({ lang: store.get().settings.targetLang, onInterim: t => { heardEl.textContent = t || 'Escuchando…'; } });
      if (!text) { setText(heardEl, 'No se escuchó nada. Toque 🎤 y hable cerca del teléfono.'); return; }
      heardEl.textContent = 'Se entendió: «' + text + '»';
      if (focus >= 0) {
        // Una sola palabra: verde si la dijo, ámbar si dijo algo parecido.
        const w = tokens(words[focus])[0] || '';
        const heard = tokens(text);
        const state = heard.includes(w) ? 'ok' : heard.some(x => similarity(w, x) >= 0.6) ? 'close' : 'miss';
        paint(focus, state);
        resultEl.className = state === 'ok' ? 'good' : state === 'close' ? 'warn' : 'bad';
        resultEl.textContent = state === 'ok' ? '¡Bien dicha!' : state === 'close' ? 'Casi. Escúchela otra vez y repita.' : 'Todavía no. Escúchela despacio y repita.';
        return;
      }
      const { states, score } = wordStates(target, text);
      // Solo se colorean palabras "reales" (las que tienen letras o números).
      let k = 0;
      spans.forEach((sp, i) => { if (norm(sp.textContent)) paint(i, states[k++]); });
      const v = verdict(score);
      resultEl.className = v.cls;
      resultEl.textContent = `${score}% · ${v.label}` + (states.some(x => x !== 'ok') ? ' Toque una palabra para practicarla sola.' : '');
      if (score >= best) { best = score; bestDuration = durationMs; }
      if (sendBtn) { sendBtn.disabled = false; sendBtn.classList.toggle('primary', score >= 70); }
      onResult?.(score);
    } catch (e) {
      heardEl.textContent = e.message;
    } finally {
      setText(micBtn, '🎤 Decirlo');
      micBtn.classList.remove('recording');
    }
  }

  sheet(h('div.pronounce', {},
    h('h3', {}, onSend ? '🎯 Practíquela antes de enviarla' : '🗣️ Practique la pronunciación'),
    onSend ? h('p.muted', {}, 'Escúchela, repítala y, cuando suene bien, envíesela al personaje.') : null,
    line, focusBox,
    h('div.row', {},
      h('button', { onclick: () => speak(current(), { rate: 0.8, character }) }, '🔊 Escuchar'),
      h('button', { onclick: () => speak(current(), { rate: 0.55, character }) }, '🐢 Despacio'),
      micBtn, sendBtn),
    heardEl, resultEl,
    h('p.muted.small-print', {}, 'Verde: se entendió. Ámbar: casi. Rojo: repítala. El reconocimiento del teléfono es una guía, no un examen.')),
  { onClose: () => listener.abort() });
  return { get best() { return best; } };
}
