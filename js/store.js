// Estado del usuario guardado en el teléfono (localStorage). Una sola persona, sin servidor.
import { normalize as normalizeMil, emptyMil } from './mil.js';
const KEY = 'charla.v1';

// Técnicas avanzadas (tecnicas.js): veces hecha y mejor nota de cada una, rondas del minuto (JAM), textos de
// ida y vuelta, mis frases (islas de lenguaje) y lo hecho hoy de «las 5 de hoy».
const emptyTecnicas = () => ({ done: {}, best: {}, jam: [], ida: {}, islas: [], today: { date: '', steps: [] } });
function normalizeTecnicas(t) {
  const d = emptyTecnicas();
  if (!t || typeof t !== 'object') return d;
  return {
    done: { ...(t.done || {}) }, best: { ...(t.best || {}) },
    jam: Array.isArray(t.jam) ? t.jam.slice(-30) : [],
    ida: t.ida && typeof t.ida === 'object' ? { ...t.ida } : {},
    islas: Array.isArray(t.islas) ? t.islas.filter(x => x && x.en && x.es) : [],
    today: t.today && typeof t.today === 'object' ? { date: String(t.today.date || ''), steps: Array.isArray(t.today.steps) ? t.today.steps : [] } : d.today,
  };
}

// Escuchar (v43): nota de cada historia, las creadas con IA, velocidad y tiempo escuchado.
const emptyEscuchar = () => ({ done: {}, mine: [], rate: 0.9, level: '', seconds: 0, today: { date: '', count: 0, seconds: 0 } });
// Simulacro de entrevista (v43): el puesto y el resultado de cada simulacro (para la gráfica).
const emptyEntrevista = () => ({ role: '', mocks: [] });
// Prueba de nivel del mes (v43).
const emptyNivel = () => ({ tests: [] });
// Diario, sonidos parecidos y grabaciones (v45). Las grabaciones guardan aquí fecha, texto y números; el audio va
// aparte, en el teléfono (audiostore.js), y no viaja en la copia de seguridad.
const emptyPractica = () => ({ diary: [], draft: { text: '', start: '' }, pairs: {}, clips: [] });
const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
function normalizeExtras(out) {
  const e = obj(out.escuchar), d = emptyEscuchar();
  out.escuchar = { ...d, ...e, done: { ...obj(e.done) }, mine: Array.isArray(e.mine) ? e.mine.filter(p => p && p.id && Array.isArray(p.lines)) : [],
    today: { ...d.today, ...obj(e.today) } };
  const m = obj(out.entrevista);
  out.entrevista = { role: String(m.role || ''), mocks: Array.isArray(m.mocks) ? m.mocks.filter(x => x && x.at && x.scores).slice(-40) : [] };
  const n = obj(out.nivel);
  out.nivel = { tests: Array.isArray(n.tests) ? n.tests.filter(x => x && x.at && typeof x.score === 'number').slice(-24) : [] };
  const p = obj(out.practica), dr = obj(p.draft);
  out.practica = {
    diary: Array.isArray(p.diary) ? p.diary.filter(x => x && x.at && typeof x.text === 'string').slice(0, 60) : [],
    draft: { text: String(dr.text || ''), start: String(dr.start || '') },
    pairs: { ...obj(p.pairs) },
    clips: Array.isArray(p.clips) ? p.clips.filter(x => x && x.id && x.topic && x.at).slice(-120) : [],
  };
  // v46: registro de actividad por día (para el plan de hoy y el resumen de la semana), el plan elegido hoy y
  // las ofertas de trabajo preparadas.
  const act = obj(out.activity);
  out.activity = Object.fromEntries(Object.keys(act).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-70).map(k => [k, { ...obj(act[k]) }]));
  const c = obj(out.coach);
  out.coach = { date: String(c.date || ''), tasks: Array.isArray(c.tasks) ? c.tasks.filter(t => t && t.key) : [] };
  out.ofertas = Array.isArray(out.ofertas) ? out.ofertas.filter(o => o && o.id && Array.isArray(o.questions)).map(o => ({ ...o, answers: { ...obj(o.answers) } })).slice(0, 10) : [];
}

const DEFAULT = {
  onboarded: false,
  name: '',
  settings: {
    apiKey: '',              // clave de DeepSeek (de pago): respaldo cuando Groq llega a su límite
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-flash',
    groqKey: '',             // clave de Groq (gratis, con límite por minuto y por día): se usa primero
    groqModel: 'openai/gpt-oss-120b',
    targetLang: 'en-US',
    voiceURI: '',
    voiceEngine: 'phone',    // 'phone' (voz del sistema, inmediata) o 'natural' (Kokoro, más bonita pero lenta)
    naturalVoice: '',        // '' = la de cada personaje
    autoListen: false,       // manos libres (LiveMode): escucha sola y envía tras una pausa
    haptics: true,           // vibrar al acertar, fallar, cumplir objetivos (HapticsManager)
    comedy: false,           // modo comedia: personajes más graciosos (SettingsUseComedyMode)
    oneCharacter: true,      // una sola compañera (Amy, dibujada, con labios sincronizados) en todas las charlas
    monthlyCap: 3,           // tope de gasto del mes en US$ (0 = sin tope): avisa al 80 % y al llegar
    capBlock: false,         // al llegar al tope, pausar la IA hasta el mes siguiente
  },
  rank: 1,                 // nivel en el que practica (1..6 = A1..C2): lenguaje, velocidad y ayudas
  highestRank: 1,          // nivel más alto desbloqueado
  starsTowardUnlock: 0,    // estrellas juntadas para desbloquear el siguiente
  levelCustom: {},         // ajustes personalizados sobre los del nivel (se borran al cambiar de nivel)
  placementPending: false, // la primera charla ajusta el nivel de la autoevaluación
  motivation: '',
  interests: [],
  points: 0,
  coins: 0,
  unlockedPlaces: [],      // lugares abiertos con monedas antes de llegar a su nivel
  rerolls: { date: '', used: 0 }, // sorteos de misiones de hoy (uno gratis al día)
  streak: { count: 0, record: 0, lastDate: '', freezes: 0, days: [], frozenDays: [] },
  relationships: {},       // charId -> { level, affection, conversations, memory: [] }
  missionLevels: {},       // missionId -> veces completada (con todos los objetivos)
  missionXp: {},           // missionId -> estrellas ganadas en esa misión (cada 4 = un nivel)
  dailyGoal: 10,           // meta diaria en minutos (5, 10, 20, 30)
  ageGroup: '',            // grupo de edad (ajusta el trato de los personajes)
  gender: '',              // 'f', 'm' o '' (no dice)
  draft: null,             // charla a medias para seguirla después
  drills: { done: {}, mine: [], inbox: [] }, // Taller de frases: veces hecho, creados con IA, frases traídas de las charlas
  grammar: { best: {} },   // Gramática por piezas: mejor nota (0..1) de cada lección
  tecnicas: emptyTecnicas(), // Técnicas avanzadas (ver arriba)
  temario: { best: {}, exam: {}, say: {} }, // Temario por nivel: mejor nota de cada tema (práctica y «Dígalo usted») y del examen de cada nivel
  myErrors: [],            // bitácora del teléfono: errores de las charlas (se copian al cerebro en el PC)
  errorStatus: {},         // id de un error del cerebro -> 'resuelto' marcado desde el teléfono
  usageMonth: null,        // { month: 'AAAA-MM', usd, calls, warned } gasto del mes para el tope
  usageDay: null,          // { date, groq: {calls, tokens}, deepseek: {calls, tokens} } uso de hoy por proveedor
  groqPause: {},           // modelo de Groq -> hasta cuándo (ms) no se usa porque llegó a su límite
  backup: { last: 0, snoozeUntil: 0 }, // última copia de seguridad y «más tarde»
  storagePersisted: null,  // el navegador prometió no borrar los datos (navigator.storage.persist)
  inbox: [],               // mensajes de los personajes
  inboxDate: '',           // día del último mensaje creado
  daily: { date: '', seconds: 0 }, // tiempo de charla de hoy
  vocab: [],               // palabras/frases guardadas
  suggestedVocab: [],      // palabras que propuso el coach y aún no guarda
  customTopics: [],        // temas propios guardados (revisados por el modelo)
  history: [],             // resúmenes de sesiones
  rankProposal: null,      // { from, to, kind: 'up' | 'down' }
  bestScore: 0,
  escuchar: emptyEscuchar(), // historias y diálogos para escuchar
  entrevista: emptyEntrevista(), // simulacros de entrevista con nota
  nivel: emptyNivel(),     // pruebas de nivel del mes
  practica: emptyPractica(), // diario, sonidos parecidos y grabaciones (v45)
  activity: {},            // v46: { 'AAAA-MM-DD': { talk, listen, diary, record, sounds, tecnica, mock, offer, words, errors, test } }
  coach: { date: '', tasks: [] }, // v46: las tareas del plan de hoy (se eligen una vez al día)
  ofertas: [],             // v46: ofertas de trabajo preparadas (preguntas, palabras, respuestas)
  mil: emptyMil(),         // mazo de mil palabras: avance de cada tarjeta (el mazo vive en IndexedDB)
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    return merge(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT);
  }
}

// Completa con valores por defecto lo que falte (respaldos o datos de versiones anteriores).
function merge(s) {
  const d = structuredClone(DEFAULT);
  const out = { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) }, streak: { ...d.streak, ...(s.streak || {}) } };
  // Versiones anteriores tenían "nivel" y "dificultad" por separado: ahora es una sola escalera de 6 niveles.
  out.rank = Math.min(6, Math.max(1, out.rank | 0 || 1));
  out.highestRank = Math.min(6, Math.max(out.rank, out.highestRank | 0));
  delete out.settings.levelLocks;   // los candados ya no existen (un respaldo viejo podía traerlos puestos)
  if (!out.levelCustom || typeof out.levelCustom !== 'object') out.levelCustom = {};
  delete out.difficulty; delete out.highestDifficulty;
  // Antes solo se contaban las veces completada: cada una vale 2 estrellas de experiencia de la misión.
  if (!out.missionXp || typeof out.missionXp !== 'object') out.missionXp = {};
  if (!Object.keys(out.missionXp).length) for (const [id, n] of Object.entries(out.missionLevels || {})) out.missionXp[id] = (n | 0) * 2;
  if (!out.daily || typeof out.daily !== 'object') out.daily = { date: '', seconds: 0 };
  if (!Array.isArray(out.interests)) out.interests = [];
  if (!Array.isArray(out.unlockedPlaces)) out.unlockedPlaces = [];
  if (!Array.isArray(out.suggestedVocab)) out.suggestedVocab = [];
  if (!Array.isArray(out.customTopics)) out.customTopics = [];
  if (!Array.isArray(out.inbox)) out.inbox = [];
  if (!out.rerolls || typeof out.rerolls !== 'object') out.rerolls = { date: '', used: 0 };
  if (!Array.isArray(out.myErrors)) out.myErrors = [];
  if (!out.grammar || typeof out.grammar !== 'object' || !out.grammar.best) out.grammar = { best: {} };
  if (!out.temario || typeof out.temario !== 'object') out.temario = { best: {}, exam: {}, say: {} };
  out.temario = { best: { ...(out.temario.best || {}) }, exam: { ...(out.temario.exam || {}) }, say: { ...(out.temario.say || {}) } };
  if (!out.errorStatus || typeof out.errorStatus !== 'object') out.errorStatus = {};
  if (!out.backup || typeof out.backup !== 'object') out.backup = { last: 0, snoozeUntil: 0 };
  out.tecnicas = normalizeTecnicas(out.tecnicas);
  out.mil = normalizeMil(out.mil);
  normalizeExtras(out);
  return out;
}

// Quien quiera saber cuándo cambió el avance (la sincronización, v50). quiet = guardado que no se vuelve a subir.
const saveListeners = new Set();
export function onSave(fn) { saveListeners.add(fn); return () => saveListeners.delete(fn); }

export function save(quiet = false) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('No se pudo guardar', e); }
  if (!quiet) for (const fn of saveListeners) { try { fn(); } catch {} }
}

export function get() { return state; }

// Sin candados de niveles: los 6 niveles, todos los lugares, temas y lecciones están abiertos siempre
// (el usuario los quitó). El nivel solo cambia cómo le hablan: velocidad, ayudas y vocabulario.
export const locksOn = () => false;
export const reachRank = () => 6;

export function update(fn) { fn(state); save(); }

export function reset() { state = structuredClone(DEFAULT); save(); }

// Copia de seguridad SIN las claves de la IA: el archivo puede terminar en Drive, WhatsApp o el correo.
export function exportJson() {
  const copy = structuredClone(state);
  copy.settings.apiKey = '';
  copy.settings.groqKey = '';
  copy.backupOf = new Date().toISOString();
  return JSON.stringify(copy, null, 2);
}

// Al importar se conserva la clave que ya tiene este teléfono (la copia no la trae).
export function importJson(text) {
  const s = JSON.parse(text);
  if (!s || typeof s !== 'object' || !('settings' in s)) throw new Error('No es un respaldo de Charla');
  const { apiKey, groqKey } = state.settings;
  state = merge(s);
  if (!state.settings.apiKey) state.settings.apiKey = apiKey;
  if (!state.settings.groqKey) state.settings.groqKey = groqKey;
  delete state.backupOf;
  save();
}

// ---------------- Sincronización (v50) ----------------
// Lo propio de cada aparato no viaja: las claves de IA y la voz (cada teléfono tiene otras voces y otro ritmo).
export const DEVICE_SETTINGS = ['apiKey', 'groqKey', 'voiceURI', 'voiceEngine', 'naturalVoice', 'paceMs', 'lipUnitMs', 'voiceWords'];
const DEVICE_FIELDS = ['storagePersisted', 'groqPause'];
export function syncSnapshot() {
  const copy = structuredClone(state);
  for (const k of DEVICE_SETTINGS) delete copy.settings[k];
  for (const k of DEVICE_FIELDS) delete copy[k];
  return copy;
}
// Pone el avance que llegó del otro aparato, conservando lo propio de este.
export function applySynced(data) {
  if (!data || typeof data !== 'object' || !('settings' in data)) throw new Error('No es un avance de Charla');
  const local = state;
  state = merge(structuredClone(data));
  for (const k of DEVICE_SETTINGS) { if (k in local.settings) state.settings[k] = local.settings[k]; else delete state.settings[k]; }
  for (const k of DEVICE_FIELDS) { if (k in local) state[k] = local[k]; else delete state[k]; }
  save(true);
}

// Pide al navegador que no borre los datos aunque le falte espacio. Chrome lo concede sobre todo a las apps
// instaladas («Agregar a pantalla principal»). Se vuelve a pedir en cada arranque hasta que diga que sí.
export async function persistStorage() {
  const st = globalThis.navigator?.storage;
  if (!st?.persist) return null;
  try {
    const ok = (await st.persisted?.()) || (await st.persist());
    if (state.storagePersisted !== ok) update(s => { s.storagePersisted = ok; });
    return ok;
  } catch { return null; }
}

export function relationship(charId) {
  if (!state.relationships[charId]) state.relationships[charId] = { level: 0, affection: 0, conversations: 0, memory: [], facts: {}, metDate: '' };
  const r = state.relationships[charId];
  if (!r.facts) r.facts = {};
  if (!Array.isArray(r.memory)) r.memory = [];
  return r;
}

export function todayIso(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

// Registro de actividad por día (v46): { 'AAAA-MM-DD': { tipo: veces } }, los últimos 70 días. Lo usan el plan de
// hoy y el resumen de la semana (coach.js).
export function logInto(activity, kind, n = 1, iso = todayIso()) {
  const out = { ...(activity || {}) };
  out[iso] = { ...(out[iso] || {}), [kind]: ((out[iso] || {})[kind] || 0) + n };
  const keys = Object.keys(out).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 70))) delete out[k];
  return out;
}
export function logActivity(kind, n = 1) { update(s => { s.activity = logInto(s.activity, kind, n); }); }
