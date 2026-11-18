// Pistas de pronunciación (PronunciationHint): debajo de cada palabra en inglés, cómo suena escrita
// con letras del español ("cappuccino" → "ka-pu-CHI-nou"). Automáticas, a pedido (🗣️) o apagadas, según el nivel.
import { chatJson } from './llm.js';
import * as P from './prompts.js';
import { h, setText } from './ui.js';

const cache = new Map();   // texto → Promise<[pistas por palabra]>

export const tokenize = text => text.split(/\s+/).filter(Boolean);
const norm = w => w.toLowerCase().replace(/[^a-z']/g, '');

// Une la respuesta del modelo con las palabras del texto (por orden; si no coincide el largo, por palabra).
export function alignHints(tokens, hints) {
  const list = Array.isArray(hints) ? hints.map(x => (typeof x === 'string' ? { w: '', say: x } : { w: x?.w || '', say: x?.say || '' })) : [];
  if (list.length === tokens.length) return list.map(x => String(x.say).trim());
  let j = 0;
  return tokens.map(t => {
    for (let k = j; k < list.length; k++) {
      if (norm(list[k].w) && norm(list[k].w) === norm(t)) { j = k + 1; return String(list[k].say).trim(); }
    }
    return '';
  });
}

export function getHints(text) {
  if (!cache.has(text)) {
    const tokens = tokenize(text);
    const p = chatJson('pronunciation_hint', P.pronunciationHintMessages(tokens), { temperature: 0.1, maxTokens: 60 + tokens.length * 14 })
      .then(r => alignHints(tokens, r.hints))
      .catch(e => { cache.delete(text); throw e; });
    cache.set(text, p);
  }
  return cache.get(text);
}

// Arma el texto con una etiqueta <ruby> por palabra (la pista va debajo y se muestra u oculta con una clase).
function decorate(spans, hints) {
  spans.forEach((sp, i) => {
    const word = sp.dataset.word || sp.textContent;
    sp.dataset.word = word;
    sp.replaceChildren(hints[i] ? h('ruby', {}, word, h('rt', {}, hints[i])) : document.createTextNode(word));
  });
}

// Conecta las pistas a un bloque de texto ya dividido en palabras (un <span> por palabra, en orden).
// mode: 'auto' (se cargan y muestran solas), 'request' (botón 🗣️) u 'off' (nada). Devuelve el botón o null.
export function attachHints(container, spans, text, mode) {
  if (mode === 'off' || !spans.length) return null;
  let loaded = false;
  const btn = h('button.tiny.hint-btn', { 'aria-pressed': 'false', title: 'Cómo se pronuncia', onclick: () => toggle() }, '🗣️ Pronunciación');
  const show = on => {
    container.classList.toggle('show-hints', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
  };
  const load = async () => {
    if (loaded) return true;
    btn.disabled = true;
    setText(btn, '🗣️ …');
    try {
      decorate(spans, await getHints(text));
      loaded = true;
      return true;
    } catch {
      return false;
    } finally {
      btn.disabled = false;
      setText(btn, '🗣️ Pronunciación');
    }
  };
  const toggle = async () => {
    if (container.classList.contains('show-hints')) { show(false); return; }
    if (await load()) show(true);
  };
  if (mode === 'auto') toggle();
  return btn;
}

// Texto suelto (sugerencias, versión «más natural») dividido en palabras, listo para attachHints.
export function wordLine(text, tag = 'span.hint-line') {
  const spans = [];
  const el = h(tag, {});
  tokenize(text).forEach((t, i) => {
    if (i) el.appendChild(document.createTextNode(' '));
    const sp = h('span.hw', {}, t);
    spans.push(sp);
    el.appendChild(sp);
  });
  return { el, spans };
}
