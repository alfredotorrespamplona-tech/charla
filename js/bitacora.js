// Bitácora de errores en el teléfono. Junta los errores del cerebro de inglés (cerebro.js, se actualiza desde
// el PC) con los que guarda desde sus charlas aquí mismo. El coach vigila los activos de los dos lados, y desde
// el celular se marcan como resueltos, se practican y se copian para pegarlos en bitacora/errores.md.
import * as store from './store.js';
import { BITACORA } from './cerebro.js';
import { h, mount, toast } from './ui.js';
import { speak } from './speech.js';

const norm = t => String(t || '').toLowerCase().replace(/[’]/g, "'").replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const brainWrongs = () => new Set(BITACORA.flatMap(b => b.wrong.map(norm)));
const day = (d = new Date()) => store.todayIso(d);
// Solo cuentan como error los turnos con fallos de verdad (no «suena más natural así» ni hablar en español).
const IS_ERROR = new Set(['SomeMistakes', 'ManyMistakes']);

// Un error del teléfono que ya se pasó al cerebro (y volvió con el script) no se muestra dos veces.
const inBrain = e => e.wrong.some(w => brainWrongs().has(norm(w)));
// ¿Este turno es un error que vale la pena guardar?
export const isSavable = a => !!(a && a.has_feedback && IS_ERROR.has(a.grammar) && a.original && a.corrected && norm(a.original) !== norm(a.corrected));

export function allErrors(s = store.get()) {
  const brain = BITACORA.map(b => ({ ...b, local: false, status: s.errorStatus?.[b.id] || b.status, count: b.count || 0 }));
  const mine = (s.myErrors || []).filter(e => !inBrain(e)).map(e => ({ ...e, local: true }));
  return [...mine, ...brain];
}
export const activeErrors = (s = store.get()) => allErrors(s).filter(e => e.status !== 'resuelto');
export const findError = id => allErrors().find(e => e.id === id) || null;

// Guarda los errores de una charla. Devuelve cuántos son nuevos (los repetidos suben su contador).
export function addFromAnalyses(analyses, now = new Date()) {
  let added = 0;
  store.update(s => {
    s.myErrors = s.myErrors || [];
    for (const a of analyses) {
      if (!isSavable(a)) continue;
      const same = s.myErrors.find(e => (a.known_error && e.id === a.known_error) || e.wrong.some(w => norm(w) === norm(a.original)));
      if (same) {
        same.count = (same.count || 1) + 1;
        same.status = 'activo';
        if (!same.wrong.some(w => norm(w) === norm(a.original))) { same.wrong.push(a.original); same.right.push(a.corrected); }
        continue;
      }
      if (a.known_error && BITACORA.some(b => b.id === a.known_error)) {   // ya está en el cerebro: se reactiva
        if (s.errorStatus?.[a.known_error] === 'resuelto') delete s.errorStatus[a.known_error];
        continue;
      }
      // id único aunque se guarden dos charlas en el mismo milisegundo
      s.myErrors.unshift({ id: `mine-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, date: day(now), wrong: [a.original], right: [a.corrected],
        why: a.explanation || '', status: 'activo', count: 1, exported: false });
      added++;
    }
    s.myErrors = s.myErrors.slice(0, 200);
  });
  return added;
}

export function setStatus(e, status) {
  store.update(s => {
    if (e.local) { const x = s.myErrors.find(m => m.id === e.id); if (x) x.status = status; }
    else if (status === 'resuelto') s.errorStatus[e.id] = 'resuelto';
    else delete s.errorStatus[e.id];
  });
}
export const removeError = id => store.update(s => { s.myErrors = s.myErrors.filter(e => e.id !== id); });

// Filas para pegar en la tabla de bitacora/errores.md del cerebro:
// | Fecha | Qué dije | Corrección | Traducción | Por qué | ¿Se repite? |
const cell = t => String(t || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
export function errorRows(list) {
  return list.map(e => `| ${e.date} | ${e.wrong.map(w => `"${cell(w)}"`).join(' / ')} | ${e.right.map(w => `"${cell(w)}"`).join(' / ')} |  | ${cell(e.why)} | ${e.count > 1 ? `Sí — ${e.count} veces en Charla` : ''}${e.status === 'resuelto' ? ' (resuelto en Charla)' : ''} |`);
}
export const pendingExport = (s = store.get()) => (s.myErrors || []).filter(e => !e.exported && !inBrain(e));

// ---------------- Pantalla ----------------
export function bitacoraScreen({ back }) {
  const s = store.get();
  const all = allErrors(s);
  const mine = all.filter(e => e.local), brain = all.filter(e => !e.local);
  const pending = pendingExport(s);
  const refresh = () => bitacoraScreen({ back });

  // Para llevarlos al PC: «Compartir» (WhatsApp, correo, Drive…); si no hay, el portapapeles; si tampoco,
  // un cuadro con el texto para copiarlo a mano.
  const markSent = () => {
    store.update(st => { for (const e of st.myErrors) if (pending.some(p => p.id === e.id)) e.exported = true; });
    toast(`📋 ${pending.length} ${pending.length === 1 ? 'error listo' : 'errores listos'}: péguelos al final de bitacora/errores.md`, 'good');
    refresh();
  };
  const send = async () => {
    const text = errorRows(pending).join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: 'Errores para el cerebro de inglés', text }); markSent(); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); markSent(); return; } catch { /* sigue abajo */ }
    const area = h('textarea.text-input', { readonly: true, rows: 6, 'aria-label': 'Filas para la bitácora' }, text);
    sendBox.replaceChildren(h('p.muted', {}, 'Copie este texto (manténgalo presionado → Seleccionar todo → Copiar):'), area,
      h('button.small', { onclick: markSent }, 'Listo, ya lo copié'));
    area.focus(); area.select();
  };
  const sendBox = h('div', {}, pending.length ? h('button.primary.small', { onclick: send }, `📋 Enviar ${pending.length} para el cerebro`) : null);

  const card = e => h('div.card.error-card', { class: e.status === 'resuelto' ? 'done' : '' },
    h('div.err-line.bad', {}, '✗ ', e.wrong[0]),
    h('div.err-line.good', {}, '✓ ', e.right[0], ' ', h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => speak(e.right[0], { rate: 0.9 }) }, '🔊')),
    e.wrong.length > 1 ? h('small.muted', {}, `y ${e.wrong.length - 1} ${e.wrong.length === 2 ? 'ejemplo más' : 'ejemplos más'}`) : null,
    e.why ? h('p.muted', {}, e.why.length > 220 ? e.why.slice(0, 220) + '…' : e.why) : null,
    h('div.row', {},
      h('small.muted', {}, [e.date, e.count > 1 ? `${e.count} veces` : '', e.status === 'resuelto' ? 'resuelto' : '', e.local && e.exported ? 'copiado' : ''].filter(Boolean).join(' · ')),
      h('button.tiny', { onclick: async () => { const { addVocab } = await import('./words.js'); if (!addVocab({ text: e.right[0], translation: '', type: 'Phrase', source: 'error', context: e.wrong[0] })) toast('Ya está en su repaso'); } }, '📒 Al repaso'),
      h('button.tiny', { onclick: () => { setStatus(e, e.status === 'resuelto' ? 'activo' : 'resuelto'); refresh(); } }, e.status === 'resuelto' ? '↩️ Reactivar' : '✓ Resuelto'),
      e.local ? h('button.tiny', { onclick: () => { removeError(e.id); refresh(); } }, '🗑 Borrar') : null));

  mount(h('div.screen.bitacora', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: back }, '←'), h('h2', {}, '📒 Mi bitácora')),
    h('p.muted', {}, 'El coach vigila los errores activos y le avisa si se repiten. Márquelos como resueltos cuando ya no le pasen.'),
    h('div.card', {},
      h('b', {}, 'Pasar al cerebro de inglés'),
      h('p.muted', {}, pending.length
        ? `${pending.length} ${pending.length === 1 ? 'error nuevo' : 'errores nuevos'} de sus charlas. Envíeselos (por WhatsApp o correo), en el PC péguelos al final de la tabla de bitacora/errores.md y corra herramientas\\publicar.ps1. Mientras tanto el coach ya los vigila aquí.`
        : 'No hay errores nuevos para enviar.'),
      sendBox),
    h('div.section-head', {}, h('h2', {}, `De sus charlas (${mine.length})`)),
    mine.length ? mine.map(card) : h('p.muted', {}, 'Todavía no hay. Al final de una charla, toque «📒 Guardar en mi bitácora».'),
    h('div.section-head', {}, h('h2', {}, `De su cerebro de inglés (${brain.length})`)),
    brain.map(card)));
}
