// Mil palabras (mazo de Refold importado): repaso espaciado como en Anki, con 4 respuestas.
//  Otra vez · Difícil · Bien · Fácil. Cada palabra nueva se ve en orden de frecuencia (la 1 es la más usada),
//  unas pocas por día. Lo que falla vuelve en la misma sesión hasta que lo sepa, y mañana otra vez.
// Avance por tarjeta (en store.mil.cards[id]): { ivl: días, ease, due, reps, lapses }.
//  Sin avance = nueva · ivl 0 = aprendiéndola (toca hoy) · ivl ≥ 1 = en repaso · ivl ≥ 21 = madura.
// Sin DOM: se prueba con node.
import { dayStart, DAY } from './srs.js';

export const NEW_PER_DAY = [5, 10, 15, 20, 30];
export const DEFAULT_NEW = 10;
export const START_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MATURE_DAYS = 21;
export const MAX_DAYS = 3650;
export const AGAIN_GAP = 3;            // una que falla vuelve después de 3 tarjetas
export const STREAK_ANSWERS = 10;      // respuestas en el día para que cuente en la racha

export function emptyMil() {
  return { imported: false, total: 0, name: '', importedAt: 0, images: false, newPerDay: DEFAULT_NEW, autoplay: true, cards: {}, day: { date: '', newSeen: 0, answers: 0, bonus: 0 } };
}

// Completa lo que falte (datos viejos o de un respaldo).
export function normalize(m) {
  const d = emptyMil();
  const out = { ...d, ...(m && typeof m === 'object' ? m : {}) };
  if (!out.cards || typeof out.cards !== 'object') out.cards = {};
  if (!out.day || typeof out.day !== 'object') out.day = d.day;
  if (!NEW_PER_DAY.includes(out.newPerDay)) out.newPerDay = DEFAULT_NEW;
  return out;
}

// Contadores del día (se reinician solos al cambiar de día).
export function today(m, iso) {
  if (m.day?.date !== iso) m.day = { date: iso, newSeen: 0, answers: 0, bonus: 0 };
  return m.day;
}

// «5 nuevas más hoy»: sube el límite solo por hoy.
export function moreNew(m, iso, n = 5) { const d = today(m, iso); d.bonus = (d.bonus || 0) + n; return d; }
const newLeftToday = (m, iso) => {
  const day = iso && m.day?.date === iso ? m.day : { newSeen: 0, bonus: 0 };
  return Math.max(0, m.newPerDay + (day.bonus || 0) - (day.newSeen || 0));
};

export const isNew = st => !st;
export const isLearning = st => !!st && st.ivl < 1;
export const isMature = st => !!st && st.ivl >= MATURE_DAYS;

// Nuevo avance tras responder. answer: 'again' | 'hard' | 'good' | 'easy'.
export function grade(st, answer, now = Date.now()) {
  const ease0 = st?.ease || START_EASE;
  const ivl0 = st?.ivl || 0;
  const reps = (st?.reps || 0) + 1;
  let lapses = st?.lapses || 0;
  let ease = ease0, ivl;
  if (answer === 'again') {
    if (ivl0 >= 1) { lapses++; ease = Math.max(MIN_EASE, ease0 - 0.2); }
    ivl = 0;                                     // vuelve hoy mismo
  } else if (ivl0 < 1) {
    // Nueva o aprendiéndola: Difícil/Bien → mañana, Fácil → en 4 días.
    ivl = answer === 'easy' ? 4 : 1;
    if (answer === 'easy') ease = ease0 + 0.15;
  } else if (answer === 'hard') {
    ease = Math.max(MIN_EASE, ease0 - 0.15);
    ivl = Math.max(ivl0 + 1, Math.round(ivl0 * 1.2));
  } else if (answer === 'good') {
    ivl = Math.max(ivl0 + 1, Math.round(ivl0 * ease0));
  } else {
    ease = ease0 + 0.15;
    ivl = Math.max(ivl0 + 2, Math.round(ivl0 * ease0 * 1.3));
  }
  ivl = Math.min(MAX_DAYS, ivl);
  return { ivl, ease: +ease.toFixed(2), due: ivl ? dayStart(now, ivl) : now, reps, lapses, last: now };
}

// Texto corto de cuándo vuelve (para los botones).
export function intervalLabel(st, answer, now = Date.now()) {
  if (answer === 'again') return '<1 min';
  const d = grade(st, answer, now).ivl;
  if (d < 30) return `${d} d`;
  if (d < 365) return `${Math.round(d / 30)} m`;
  return `${(d / 365).toFixed(1).replace('.0', '')} a`;
}

// Qué toca hoy: primero las que está aprendiendo, luego los repasos (los más atrasados primero)
// y al final las nuevas en orden de frecuencia, hasta el límite del día.
export function buildQueue(cards, m, now = Date.now(), iso = '') {
  const st = id => m.cards[id];
  const end = dayStart(now, 1);
  const learning = [], reviews = [], fresh = [];
  for (const c of cards) {
    const x = st(c.id);
    if (!x) fresh.push(c);
    else if (x.ivl < 1) learning.push(c);
    else if (x.due < end) reviews.push(c);
  }
  reviews.sort((a, b) => (st(a.id).due - st(b.id).due) || (a.id - b.id));
  learning.sort((a, b) => st(a.id).due - st(b.id).due);
  fresh.sort((a, b) => a.id - b.id);
  const newLeft = newLeftToday(m, iso);
  return { learning, reviews, fresh: fresh.slice(0, newLeft), newLeft };
}

// Resumen para la portada y la pantalla del mazo.
export function counts(cards, m, now = Date.now(), iso = '') {
  const q = buildQueue(cards, m, now, iso);
  let learned = 0, mature = 0;
  for (const c of cards) { const x = m.cards[c.id]; if (x && x.ivl >= 1) learned++; if (isMature(x)) mature++; }
  const seen = cards.filter(c => m.cards[c.id]).length;
  return { total: cards.length, due: q.reviews.length + q.learning.length, fresh: q.fresh.length, learned, mature, seen, toStudy: q.reviews.length + q.learning.length + q.fresh.length };
}

// Lo mismo sin las tarjetas cargadas (solo con el avance guardado y el total): para la portada,
// que se dibuja al instante sin abrir el almacenamiento del mazo.
export function quickCounts(m, now = Date.now(), iso = '') {
  const end = dayStart(now, 1);
  let due = 0, learned = 0, mature = 0, seen = 0;
  for (const x of Object.values(m.cards || {})) {
    seen++;
    if (x.ivl < 1 || x.due < end) due++;
    if (x.ivl >= 1) learned++;
    if (x.ivl >= MATURE_DAYS) mature++;
  }
  const fresh = Math.min(Math.max(0, (m.total || 0) - seen), newLeftToday(m, iso));
  return { total: m.total || 0, due, fresh, learned, mature, seen, toStudy: due + fresh };
}

// Estado para la lista: nueva, aprendiendo, joven o madura.
export function stageOf(st) {
  if (!st) return { key: 'new', label: 'Nueva' };
  if (st.ivl < 1) return { key: 'learning', label: 'Aprendiendo' };
  if (st.ivl < MATURE_DAYS) return { key: 'young', label: 'En repaso' };
  return { key: 'mature', label: 'Madura' };
}

// Marca en la frase la palabra estudiada (o una de sus formas: buy → bought).
export function highlightParts(sentence, card) {
  const forms = [card.word, ...String(card.front || '').split(/[,;/]/), ...(card.forms || []).flatMap(f => f.split(/[,;/]/))]
    .map(w => w.trim()).filter(w => w && w.length > 1).sort((a, b) => b.length - a.length);
  if (!forms.length) return [{ text: sentence, hit: false }];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b(${forms.map(esc).join('|')})(s|es|ed|d|ing)?\\b`, 'i');
  const m = sentence.match(re);
  if (!m) return [{ text: sentence, hit: false }];
  return [
    { text: sentence.slice(0, m.index), hit: false },
    { text: m[0], hit: true },
    { text: sentence.slice(m.index + m[0].length), hit: false },
  ].filter(p => p.text);
}

export { DAY };
