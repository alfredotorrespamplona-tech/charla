// Tutorial guiado de la primera charla (como el Tutorial de LingoLooper): oscurece la pantalla, ilumina un
// botón y explica para qué sirve. Se guarda en s.tutorial para no repetirlo; en Ajustes se puede reiniciar.
import * as store from './store.js';
import { h } from './ui.js';

export const needed = key => !store.get().tutorial?.[key] && !store.get().tutorial?.skipped;
const mark = patch => store.update(s => { s.tutorial = { ...(s.tutorial || {}), ...patch }; });
export const reset = () => store.update(s => { s.tutorial = {}; });

// steps: [{ el, text }]. Devuelve una promesa que se cumple al terminar o saltar.
export function tour(key, steps) {
  steps = steps.filter(x => x.el && x.el.isConnected && x.el.offsetParent !== null);
  if (!steps.length || !needed(key) || document.querySelector('.tut-layer')) return Promise.resolve();
  return new Promise(resolve => {
    let i = 0;
    const hole = h('div.tut-hole');
    const text = h('p.tut-text');
    const count = h('small.muted');
    const nextBtn = h('button.small.primary', { onclick: () => go(i + 1) }, 'Siguiente');
    const bubble = h('div.tut-bubble', { role: 'dialog', 'aria-live': 'polite' }, text,
      h('div.row', {}, count, h('button.small', { onclick: () => end(true) }, 'Saltar tutorial'), nextBtn));
    // La capa tapa los toques: durante el tutorial solo se usa la burbuja.
    const layer = h('div.tut-layer', {}, hole, bubble);
    const place = () => {
      const r = steps[i].el.getBoundingClientRect();
      const pad = 6;
      Object.assign(hole.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + 2 * pad}px`, height: `${r.height + 2 * pad}px` });
      const below = r.top + r.height / 2 < window.innerHeight / 2;
      bubble.style.top = below ? `${Math.min(window.innerHeight - 180, r.bottom + 16)}px` : '';
      bubble.style.bottom = below ? '' : `${Math.max(16, window.innerHeight - r.top + 16)}px`;
    };
    function go(n) {
      if (n >= steps.length) { end(false); return; }
      i = n;
      steps[i].el.scrollIntoView?.({ block: 'nearest' });
      text.replaceChildren(...h('span', {}, steps[i].text).childNodes);
      count.textContent = steps.length > 1 ? `${i + 1}/${steps.length}` : '';
      nextBtn.textContent = i + 1 < steps.length ? 'Siguiente' : 'Entendido';
      place();
    }
    function end(skipped) {
      window.removeEventListener('resize', place);
      layer.remove();
      mark(skipped ? { [key]: true, skipped: true } : { [key]: true });
      resolve();
    }
    window.addEventListener('resize', place);
    document.body.appendChild(layer);
    go(0);
    nextBtn.focus();
  });
}
