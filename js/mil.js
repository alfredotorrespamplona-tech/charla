// Mil palabras (las 1000 más usadas, en js/milwords.js): repaso espaciado como en Anki, con 4 respuestas.
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

export const MIL_TOTAL = 1000;

export function emptyMil() {
  return { total: MIL_TOTAL, newPerDay: DEFAULT_NEW, autoplay: true, cards: {}, day: { date: '', newSeen: 0, answers: 0, bonus: 0 } };
}

// Las tarjetas vienen en la app (js/milwords.js, generado del cerebro de inglés). Se cargan solo al usarlas.
// Fila: [rank, palabra, significado, formas irregulares, frase, traducción].
export function rowToCard([id, word, meaning, forms, sentence, translation]) {
  return {
    id, word, front: word,
    defs: String(meaning || '').split(/;\s*/).map(d => d.trim()).filter(Boolean),
    forms: forms ? String(forms).split(/,\s*/).map(f => f.trim()).filter(Boolean) : [],
    sentence: sentence || '', translation: translation || '',
  };
}
let cardsP = null;
export function loadMilCards() {
  if (!cardsP) cardsP = import('./milwords.js').then(m => m.MIL_WORDS.map(rowToCard)).catch(e => { cardsP = null; throw e; });
  return cardsP;
}

// Completa lo que falte (datos viejos o de un respaldo).
export function normalize(m) {
  const d = emptyMil();
  const out = { ...d, ...(m && typeof m === 'object' ? m : {}) };
  if (!out.cards || typeof out.cards !== 'object') out.cards = {};
  if (!out.day || typeof out.day !== 'object') out.day = d.day;
  if (!NEW_PER_DAY.includes(out.newPerDay)) out.newPerDay = DEFAULT_NEW;
  out.total = MIL_TOTAL;
  delete out.imported; delete out.name; delete out.importedAt; delete out.images;   // de cuando se importaba un .apkg
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
// Formas regulares de una palabra: plurales, pasados, -ing, -er, -ly (family → families, stop → stopped…).
function variants(w) {
  const c = new Set([w]);
  for (const suf of ['s', 'es', 'ed', 'd', 'ing', 'er', 'est', 'ly']) c.add(w + suf);
  if (w.endsWith('e')) { c.add(w.slice(0, -1) + 'ing'); c.add(w.slice(0, -1) + 'y'); }
  if (w.endsWith('y')) for (const suf of ['ies', 'ied', 'ier', 'iest', 'ily']) c.add(w.slice(0, -1) + suf);
  if (/[^aeiou][aeiou][bdgklmnprt]$/.test(w)) for (const suf of ['ed', 'ing', 'er']) c.add(w + w.at(-1) + suf);
  return c;
}

export function highlightParts(sentence, card) {
  const bases = [card.word, ...String(card.front || '').split(/[,;/]/), ...(card.forms || []).flatMap(f => String(f).split(/[,;/]/))]
    .map(w => w.trim().toLowerCase()).filter(w => w.length > 1);
  if (!bases.length || !sentence) return [{ text: sentence, hit: false }];
  const cand = new Set();
  for (const b of bases) for (const v of variants(b.split(/\s+/)[0])) cand.add(v);   // «look for» → look
  const toks = [...sentence.matchAll(/[A-Za-z]+/g)];
  let m = toks.find(t => cand.has(t[0].toLowerCase()));
  const head = bases[0].split(/\s+/)[0];
  if (!m && head.length >= 3) m = toks.find(t => t[0].toLowerCase().includes(head));   // backyard, foggy
  if (!m) return [{ text: sentence, hit: false }];
  return [
    { text: sentence.slice(0, m.index), hit: false },
    { text: m[0], hit: true },
    { text: sentence.slice(m.index + m[0].length), hit: false },
  ].filter(p => p.text);
}

export { DAY };
