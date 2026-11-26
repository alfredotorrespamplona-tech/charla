// Plan de hoy que se arma solo y resumen de la semana (v46). Usa lo que la app ya sabe de usted: sus errores
// repetidos, los sonidos que más falla, si le toca la prueba de nivel, cuándo es su entrevista y cuántos días
// lleva sin escribir o sin grabarse. Reparte las habilidades por día de la semana como dice el cerebro
// (wiki/metodologias/estructura_semanal_por_habilidad.md): un foco por día y, todos los días, un poco de «cardio»
// (escuchar y palabras). Sin pantallas: se prueba con node.
import * as store from './store.js';
import { weakGroups, pairGroupById } from './practica.js';

const DAY = 86400000;
export const KEEP_DAYS = 70;   // días que se guardan en el registro de actividad

// ---------------- Registro de actividad (store.logActivity): { 'AAAA-MM-DD': { tipo: veces } } ----------------
// Tipos: talk (charla), listen (historia), diary, record (grabarse), sounds (sonidos), tecnica, mock (simulacro),
// offer (preguntas de una oferta), words (Mil palabras y repaso), errors (practicar un error), test (prueba de nivel).
export const { logInto, logActivity } = store;
export const doneToday = (s, kind, now = new Date()) => ((s.activity || {})[store.todayIso(now)] || {})[kind] > 0;
// Días desde la última vez que hizo algo de este tipo (Infinity si nunca).
export function daysSince(s, kinds, now = new Date()) {
  const list = [].concat(kinds);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  for (let i = 0; i < KEEP_DAYS; i++) {
    const d = new Date(today.getTime() - i * DAY);
    const day = (s.activity || {})[store.todayIso(d)] || {};
    if (list.some(k => day[k] > 0)) return i;
  }
  // Lo que hizo antes de v46 no está en «activity»: se mira en su historial (diario, grabaciones, simulacros).
  const old = [];
  if (list.includes('diary')) old.push(...(s.practica?.diary || []).map(x => x.at));
  if (list.includes('record')) old.push(...(s.practica?.clips || []).map(x => x.at));
  if (list.includes('mock')) old.push(...(s.entrevista?.mocks || []).map(x => x.at));
  const last = Math.max(0, ...old.filter(Number.isFinite));
  if (!last) return Infinity;
  const d = new Date(last);
  return Math.max(0, Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)) / DAY));
}

// ---------------- Las habilidades y el foco de cada día ----------------
export const SKILLS = [
  { id: 'escuchar', name: 'Escuchar', icon: '🎧', kinds: ['listen'] },
  { id: 'hablar', name: 'Hablar', icon: '🗣', kinds: ['talk', 'tecnica'] },
  { id: 'entrevista', name: 'Entrevista', icon: '💼', kinds: ['mock', 'offer'] },
  { id: 'escribir', name: 'Escribir', icon: '✍', kinds: ['diary'] },
  { id: 'pronunciar', name: 'Pronunciar', icon: '👂', kinds: ['sounds', 'record'] },
  { id: 'palabras', name: 'Palabras', icon: '📇', kinds: ['words', 'errors'] },
];
export const skillById = id => SKILLS.find(k => k.id === id);
// 0 = domingo. El domingo el foco es la habilidad que menos practicó en la semana.
export const WEEK_FOCUS = { 1: 'pronunciar', 2: 'escribir', 3: 'hablar', 4: 'entrevista', 5: 'palabras', 6: 'escuchar', 0: null };
const WEEKDAY = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// ---------------- Resumen de la semana (de lunes a domingo) ----------------
const monday = now => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
function countWeek(activity, start, kinds) {
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const day = (activity || {})[store.todayIso(new Date(start.getTime() + i * DAY))] || {};
    for (const k of kinds) n += day[k] || 0;
  }
  return n;
}
export function weekSummary(activity, now = new Date()) {
  const start = monday(now), prev = new Date(start.getTime() - 7 * DAY);
  const rows = SKILLS.map(k => ({ id: k.id, name: k.name, icon: k.icon, now: countWeek(activity, start, k.kinds), before: countWeek(activity, prev, k.kinds) }));
  const total = rows.reduce((a, r) => a + r.now, 0);
  const missing = rows.filter(r => r.now === 0).map(r => r.name.toLowerCase());
  const up = rows.filter(r => r.now > r.before).sort((a, b) => (b.now - b.before) - (a.now - a.before))[0];
  const most = rows.slice().sort((a, b) => b.now - a.now)[0];
  let text;
  if (!total) text = 'Esta semana todavía no hay práctica. Empiece por el plan de hoy.';
  else {
    const good = up ? `mejoró en ${up.name.toLowerCase()} (${up.now} ${up.now === 1 ? 'vez' : 'veces'}, antes ${up.before})` : `lo que más practicó fue ${most.name.toLowerCase()} (${most.now} ${most.now === 1 ? 'vez' : 'veces'})`;
    text = `Esta semana ${good}.${missing.length ? ` Le falta ${listEs(missing)}.` : ' ¡Tocó todas las habilidades!'}`;
  }
  return { rows, total, missing, text };
}
const listEs = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

// ---------------- El plan de hoy ----------------
// ctx: { errors: errores activos (de bitacora.js), testDue: le toca la prueba de nivel }.
// Devuelve hasta 2 tareas elegidas para hoy: [{ key, arg }]. Se eligen una vez al día (se guardan en s.coach).
export function pickToday(s, now = new Date(), ctx = {}) {
  const out = [];
  const add = (key, arg = '', why = '') => { if (!out.some(x => x.key === key)) out.push({ key, arg, why }); };
  const nextOffer = upcomingOffer(s, now);
  const weekday = now.getDay();
  let focus = WEEK_FOCUS[weekday];
  if (!focus) {   // domingo: lo que menos practicó esta semana
    const rows = weekSummary(s.activity, now).rows.filter(r => r.id !== 'escuchar');
    focus = rows.sort((a, b) => a.now - b.now)[0].id;
  }
  // 1) Lo urgente: la entrevista está cerca.
  if (nextOffer && nextOffer.days <= 7) add(nextOffer.days <= 2 ? 'guion' : 'offer', nextOffer.offer.id, 'entrevista');
  // 2) El foco del día.
  const focusTask = taskFor(focus, s, now);
  add(focusTask.key, focusTask.arg, 'foco');
  // 3) Lo que sus datos piden: su error más repetido, la prueba del mes, lo que dejó de hacer.
  const repeated = (ctx.errors || []).filter(e => (e.count || 1) >= 2).sort((a, b) => (b.count || 1) - (a.count || 1))[0];
  if (out.length < 2 && repeated) add('error', repeated.id, 'datos');
  if (out.length < 2 && ctx.testDue && (s.nivel?.tests || []).length) add('nivel', '', 'datos');
  if (out.length < 2 && daysSince(s, 'diary', now) >= 4) add('diary', '', 'datos');
  if (out.length < 2 && daysSince(s, ['sounds', 'record'], now) >= 5) add('sounds', weakGroups(s.practica?.pairs || {})[0] || '', 'datos');
  if (out.length < 2 && daysSince(s, ['mock', 'offer'], now) >= 7) add('mock', '', 'datos');
  return out.slice(0, 2);
}

// Qué tarea entrena cada habilidad hoy.
function taskFor(skill, s, now) {
  if (skill === 'pronunciar') {
    const weak = weakGroups(s.practica?.pairs || {})[0];
    if (!weak && daysSince(s, 'record', now) >= 4) return { key: 'record', arg: '' };
    return { key: 'sounds', arg: weak || '' };
  }
  if (skill === 'escribir') return { key: 'diary', arg: '' };
  if (skill === 'hablar') return { key: 'talk', arg: '' };
  if (skill === 'entrevista') { const o = (s.ofertas || [])[0]; return o ? { key: 'offer', arg: o.id } : { key: 'mock', arg: '' }; }
  if (skill === 'palabras') return { key: 'errors', arg: '' };
  return { key: 'listen2', arg: '' };
}

// La oferta con entrevista más próxima (hoy o en el futuro).
export function upcomingOffer(s, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const list = (s.ofertas || []).filter(o => /^\d{4}-\d{2}-\d{2}$/.test(o.date || '')).map(o => {
    const [y, m, d] = o.date.split('-').map(Number);
    return { offer: o, days: Math.round((new Date(y, m - 1, d).getTime() - today) / DAY) };
  }).filter(x => x.days >= 0).sort((a, b) => a.days - b.days);
  return list[0] || null;
}

// Cómo se ve cada tarea: título, detalle, por qué y si ya la hizo hoy.
export function describe(task, s, now = new Date(), ctx = {}) {
  const { key, arg, why } = task;
  const done = kinds => [].concat(kinds).some(k => doneToday(s, k, now));
  const offer = (s.ofertas || []).find(o => o.id === arg);
  const when = offer ? upcomingOffer({ ofertas: [offer] }, now) : null;
  const daysText = when ? (when.days === 0 ? 'es hoy' : when.days === 1 ? 'es mañana' : `es en ${when.days} días`) : '';
  const reason = why === 'foco' ? `Foco del ${WEEKDAY[now.getDay()]}: ${skillById(skillOf(key))?.name.toLowerCase() || ''}` : '';
  switch (key) {
    case 'guion': return { icon: '📜', title: 'Repasar su guion', detail: offer ? `Su entrevista ${daysText}: léalo en voz alta` : 'Léalo en voz alta', done: done('offer') };
    case 'offer': return { icon: '📄', title: offer ? `Preparar: ${offer.role || 'su oferta'}` : 'Preparar su oferta', detail: daysText ? `Su entrevista ${daysText} · preguntas de esa oferta` : reason || 'Las preguntas de esa oferta', done: done(['offer', 'mock']) };
    case 'sounds': { const g = pairGroupById(arg); return { icon: '👂', title: 'Sonidos parecidos', detail: g ? `${g.example}: es el que más le cuesta` : reason || 'Una ronda de oír y decir', done: done('sounds') }; }
    case 'record': return { icon: '🎙', title: 'Grabarse', detail: why === 'datos' ? 'Hace días que no se oye: 1 minuto' : reason || '1 minuto y oírse', done: done('record') };
    case 'diary': return { icon: '✍', title: 'Diario', detail: why === 'datos' ? diaryGap(daysSince(s, 'diary', now)) : reason || 'Unos minutos sobre su día', done: done('diary') };
    case 'talk': return { icon: '🗣', title: 'Una charla', detail: reason || '10 minutos hablando', done: done('talk') };
    case 'mock': return { icon: '💼', title: 'Simulacro de entrevista', detail: why === 'datos' ? 'Hace más de una semana del último' : reason || '15 minutos con nota', done: done('mock') };
    case 'errors': return { icon: '📒', title: 'Sus errores y su repaso', detail: reason || 'Decir bien lo que suele decir mal', done: done(['errors', 'words']) };
    case 'error': { const e = (ctx.errors || []).find(x => x.id === arg); return { icon: '🎯', title: 'Su error más repetido', detail: e ? `«${e.wrong[0]}» → «${e.right[0]}» (${e.count || 1} veces)` : 'Dígalo bien 3 veces', done: done('errors') }; }
    case 'nivel': return { icon: '📏', title: 'Prueba de nivel del mes', detail: 'Le toca: unos 10 minutos', done: done('test') };
    case 'listen2': return { icon: '🎧', title: 'Escuchar 2 historias', detail: reason || 'Sin texto primero', done: (((s.activity || {})[store.todayIso(now)] || {}).listen || 0) >= 2 };
    default: return { icon: '✓', title: key, detail: '', done: false };
  }
}
const diaryGap = n => n === Infinity ? 'Todavía no ha escrito: empiece hoy' : n > 60 ? 'Hace mucho que no escribe' : `Hace ${n} días que no escribe`;
const skillOf = key => ({ sounds: 'pronunciar', record: 'pronunciar', diary: 'escribir', talk: 'hablar', mock: 'entrevista', offer: 'entrevista', guion: 'entrevista', errors: 'palabras', error: 'palabras', listen2: 'escuchar' }[key] || '');

// Las tareas de hoy, elegidas una sola vez por día (si no, al hacer una desaparecería en vez de marcarse).
export function todayTasks(now = new Date(), ctx = {}) {
  const s = store.get();
  const iso = store.todayIso(now);
  if (s.coach?.date !== iso) store.update(x => { x.coach = { date: iso, tasks: pickToday(x, now, ctx) }; });
  // Si hoy guardó una oferta con entrevista cercana, entra al plan ya (no mañana).
  const next = upcomingOffer(store.get(), now);
  const tasks = store.get().coach.tasks;
  if (next && next.days <= 7 && !tasks.some(t => (t.key === 'offer' || t.key === 'guion') && t.arg === next.offer.id))
    store.update(x => { x.coach.tasks = [{ key: next.days <= 2 ? 'guion' : 'offer', arg: next.offer.id, why: 'entrevista' }, ...x.coach.tasks].slice(0, 3); });
  return store.get().coach.tasks;
}
export const focusName = (now = new Date()) => { const f = WEEK_FOCUS[now.getDay()]; return f ? skillById(f).name : 'lo que menos practicó'; };
