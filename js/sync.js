// Sincronizar el avance entre el teléfono y la computadora (v50).
// Sin cuentas ni contraseñas: un aparato crea un código secreto (XXXX-XXXX-XXXX-XXXX) y el otro lo escribe una vez.
// El avance se guarda en Netlify (función /api/sync) bajo ese código. Nunca viajan las claves de IA ni la voz.
// Cada aparato sube lo que cambió unos segundos después y, al abrir la app, trae lo que hizo el otro.
import * as store from './store.js';

export const ENDPOINT = '/api/sync';
const META_KEY = 'charla.sync';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin I, O, 0 ni 1 (se confunden al copiarlo a mano)
export const PUSH_DELAY_MS = 8000;

// ---------------- Código ----------------
export function newCode(rand = n => globalThis.crypto.getRandomValues(new Uint8Array(n))) {
  const b = rand(16);
  let out = '';
  for (let i = 0; i < 16; i++) { out += ALPHA[b[i] % 32]; if (i % 4 === 3 && i < 15) out += '-'; }
  return out;
}
// Lo que escribió el usuario (con o sin guiones, en minúsculas, con espacios) → XXXX-XXXX-XXXX-XXXX, o '' si no sirve.
export function normalizeCode(text) {
  const raw = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length !== 16 || [...raw].some(c => !ALPHA.includes(c))) return '';
  return raw.match(/.{4}/g).join('-');
}

// ---------------- Estado de la sincronización (en este aparato, fuera del avance) ----------------
const blank = () => ({ code: '', rev: 0, at: 0, device: '', dirty: false, lastOk: 0, lastError: '' });
export function meta() {
  try { return { ...blank(), ...JSON.parse(globalThis.localStorage?.getItem(META_KEY) || '{}') }; } catch { return blank(); }
}
function setMeta(patch) {
  const m = { ...meta(), ...patch };
  try { globalThis.localStorage?.setItem(META_KEY, JSON.stringify(m)); } catch {}
  return m;
}
export const isOn = () => !!meta().code;
export const deviceName = (ua = globalThis.navigator?.userAgent || '') => /Android|iPhone|iPad|Mobile/i.test(ua) ? 'teléfono' : 'computadora';

// ---------------- Llamada a la función ----------------
let fetchFn = (...a) => globalThis.fetch(...a);
export function _setFetch(f) { fetchFn = f; }   // para las pruebas

async function call(op, extra = {}, code = meta().code) {
  let res;
  try {
    res = await fetchFn(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-sync-code': code }, body: JSON.stringify({ op, ...extra }) });
  } catch { throw new Error('Sin conexión: se sincroniza cuando vuelva internet.'); }
  let body = {};
  try { body = await res.json(); } catch {}
  if (res.status === 409) return { ...body, conflict: true };
  if (!res.ok) throw new Error(body.error || `No se pudo sincronizar (${res.status}).`);
  return body;
}

// ---------------- Empezar y dejar ----------------
// En el aparato que tiene su avance: crea el código y sube lo de aquí.
export async function create() {
  const code = newCode();
  const r = await call('put', { base: 0, data: store.syncSnapshot(), device: deviceName() }, code);
  if (r.conflict) throw new Error('Ese código ya existía. Pruebe otra vez.');
  setMeta({ code, rev: r.rev, at: r.at, device: deviceName(), dirty: false, lastOk: Date.now(), lastError: '' });
  return code;
}
// En el otro aparato: trae el avance guardado con ese código (reemplaza lo de aquí, menos las claves y la voz).
export async function join(text) {
  const code = normalizeCode(text);
  if (!code) throw new Error('El código tiene 16 letras y números, como ABCD-EFGH-JKLM-NPQR.');
  const r = await call('get', {}, code);
  if (!r.data) throw new Error('Ese código no tiene nada guardado. Revise que esté bien escrito.');
  store.applySynced(r.data);
  setMeta({ code, rev: r.rev, at: r.at, device: r.device || '', dirty: false, lastOk: Date.now(), lastError: '' });
  return r;
}
export function leave() { try { globalThis.localStorage?.removeItem(META_KEY); } catch {} }

// ---------------- Sincronizar ----------------
// canApply: si se puede cambiar el avance de este aparato ahora (no a mitad de una charla).
// onConflict({ at, device }) → 'mine' | 'theirs' | null: los dos aparatos cambiaron algo desde la última vez.
let running = null;
export function syncNow(opts = {}) {
  if (!isOn()) return Promise.resolve('apagado');
  clearTimeout(timer);   // lo que estaba por subirse se sube ahora
  if (running) return running.then(() => syncNow(opts));
  running = doSync(opts).finally(() => { running = null; });
  return running;
}
async function doSync({ canApply = true, onConflict = null } = {}) {
  const m = meta();
  const can = () => (typeof canApply === 'function' ? canApply() : canApply);   // se pregunta justo antes de cambiar nada
  try {
    const remote = await call('get');
    let result = 'al día';
    if (!remote.data) result = await push(remote.rev, true);                       // se borró en la nube: se vuelve a subir
    else if (remote.rev === m.rev) { if (m.dirty) result = await push(remote.rev); }
    else if (!m.dirty) result = can() ? apply(remote) : 'pendiente';                // solo cambió el otro
    else {                                                                          // cambiaron los dos
      const pick = can() && onConflict ? await onConflict({ at: remote.at, device: remote.device }) : null;
      if (pick === 'mine') result = await push(remote.rev, true);
      else if (pick === 'theirs') result = apply(remote);
      else result = 'conflicto';
    }
    setMeta({ lastOk: Date.now(), lastError: '' });
    return result;
  } catch (e) {
    setMeta({ lastError: e.message });
    throw e;
  }
}
async function push(base, force = false) {
  const r = await call('put', { base, force, data: store.syncSnapshot(), device: deviceName() });
  if (r.conflict) { setMeta({ dirty: true }); return 'conflicto'; }
  setMeta({ rev: r.rev, at: r.at, device: r.device, dirty: false });
  return 'subido';
}
function apply(remote) {
  store.applySynced(remote.data);
  setMeta({ rev: remote.rev, at: remote.at, device: remote.device || '', dirty: false });
  return 'bajado';
}

// Cada cambio del avance se marca y se sube unos segundos después (juntando varios cambios en una subida).
let timer = null;
export function markChanged(delay = PUSH_DELAY_MS) {
  if (!isOn()) return;
  if (!meta().dirty) setMeta({ dirty: true });
  clearTimeout(timer);
  timer = setTimeout(() => { syncNow({ canApply: false }).catch(() => {}); }, delay);
}
// Al salir de la app: subir ya lo pendiente.
export function flush() {
  clearTimeout(timer);
  if (isOn() && meta().dirty) return syncNow({ canApply: false }).catch(() => {});
  return Promise.resolve();
}
export function watchStore() { return store.onSave(() => markChanged()); }

// Texto para Ajustes.
export function statusText(m = meta(), now = Date.now()) {
  if (!m.code) return 'Apagada: el avance queda solo en este aparato.';
  const ago = ms => { const min = Math.round(ms / 60000); return min < 1 ? 'hace un momento' : min < 60 ? `hace ${min} min` : min < 1440 ? `hace ${Math.round(min / 60)} h` : `hace ${Math.round(min / 1440)} días`; };
  if (m.lastError) return `⚠ ${m.lastError}`;
  return `Encendida. ${m.dirty ? 'Hay cambios por subir. ' : ''}Última vez: ${m.lastOk ? ago(now - m.lastOk) : 'nunca'}.`;
}
