// Cuidar el progreso: copia de seguridad cada dos semanas (sin la clave), aviso de gasto del mes y
// estado del almacenamiento del teléfono.
import * as store from './store.js';
import { h, toast } from './ui.js';
import { spendStatus, usd } from './budget.js';

export const BACKUP_EVERY_DAYS = 14;
const DAY = 86400000;

// ¿Toca recordarle la copia? Solo cuando ya hay algo que perder.
export function backupDue(s, now = Date.now()) {
  const worth = s.history.length >= 3 || s.vocab.length >= 10;
  if (!worth || (s.backup?.snoozeUntil || 0) > now) return false;
  return now - (s.backup?.last || 0) >= BACKUP_EVERY_DAYS * DAY;
}

export const backupName = (d = new Date()) => `charla-respaldo-${store.todayIso(d)}.json`;

// En el celular abre «Compartir» (Drive, WhatsApp, correo…); si no se puede, descarga el archivo.
export async function saveBackup() {
  const text = store.exportJson();
  const name = backupName();
  const file = typeof File === 'function' ? new File([text], name, { type: 'application/json' }) : null;
  let shared = false;
  if (file && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Copia de Charla' }); shared = true; }
    catch (e) { if (e.name === 'AbortError') return false; }   // canceló: no cuenta como copia
  }
  if (!shared) {
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }
  store.update(s => { s.backup = { ...(s.backup || {}), last: Date.now(), snoozeUntil: 0 }; });
  toast(shared ? '💾 Copia lista (sin su clave de DeepSeek)' : `💾 Copia descargada: ${name} (sin su clave)`, 'good');
  return true;
}

export function lastBackupText(s, now = Date.now()) {
  const last = s.backup?.last || 0;
  if (!last) return 'Todavía no ha guardado ninguna copia.';
  const days = Math.floor((now - last) / DAY);
  return days === 0 ? 'Última copia: hoy.' : `Última copia: hace ${days} ${days === 1 ? 'día' : 'días'}.`;
}

// Tarjeta del inicio.
export function backupCard(s, onChange) {
  if (!backupDue(s)) return null;
  return h('div.card.notice', {},
    h('b', {}, '💾 Guarde una copia de su progreso'),
    h('p.muted', {}, `${lastBackupText(s)} Si el teléfono se pierde o se borran los datos del navegador, con la copia lo recupera todo (Ajustes → Importar). No lleva su clave de DeepSeek.`),
    h('div.row', {},
      h('button.small.primary', { onclick: async () => { if (await saveBackup()) onChange?.(); } }, 'Guardar copia'),
      h('button.small', { onclick: () => { store.update(st => { st.backup = { ...(st.backup || {}), snoozeUntil: Date.now() + 3 * DAY }; }); onChange?.(); } }, 'En 3 días')));
}

// Tarjeta del inicio cuando el gasto del mes se acerca al tope o lo pasa.
export function spendCard(s) {
  const st = spendStatus(s);
  if (st.level === 'ok') return null;
  const over = st.level === 'over';
  return h('div.card.notice', { class: over ? 'risk' : '' },
    h('b', {}, over ? `💰 Llegó a su tope del mes: ${usd(st.usd)} de ${usd(st.cap)}` : `💰 Este mes lleva ${usd(st.usd)} de su tope de ${usd(st.cap)}`),
    h('p.muted', {}, over
      ? (s.settings.capBlock ? 'La IA está en pausa hasta el próximo mes. Puede subir el tope en Ajustes.' : 'Puede seguir practicando; si quiere, suba el tope o active la pausa en Ajustes.')
      : 'Es solo un aviso. El tope se cambia en Ajustes.'));
}

export function storageText(s) {
  if (s.storagePersisted === true) return '✅ El teléfono guarda sus datos de forma permanente.';
  if (s.storagePersisted === false) return '⚠️ El navegador podría borrar sus datos si le falta espacio. Instale Charla («Agregar a pantalla principal») y guarde copias.';
  return 'Guarde copias de vez en cuando: sus datos viven solo en este teléfono.';
}
