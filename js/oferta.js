// Prepararse para una oferta de trabajo concreta (v46): pega el aviso, la IA arma las preguntas que
// probablemente le harán (con cómo empezar, su estructura y un ejemplo), las palabras de ese trabajo y preguntas
// para hacerles a ellos. Con eso practica, hace un simulacro de esa oferta y arma «Mi guion» para repasar la noche
// antes. Sin pantallas (están en ofertascreen.js): se prueba con node.
import { normalize } from './drills.js';
import { LAST_QUESTION } from './entrevista.js';

export const MAX_OFFERS = 10;
export const MAX_AD = 12000;          // caracteres del aviso que se guardan (un aviso normal tiene 2000 a 5000)
export const MIN_AD = 120;            // menos que esto no es un aviso
export const MOCK_SIZE = 8;           // preguntas de la oferta en el simulacro (más la de «¿tiene preguntas?»)
const FRAMES = ['qyq', 'psb', 'w5'];
const str = x => (typeof x === 'string' ? x.trim() : '');

// Lo que devuelve la IA, revisado: preguntas completas y sin repetir, palabras con traducción.
export function cleanOffer(r, { ad = '', role = '', date = '', at = Date.now() } = {}) {
  const seen = new Set();
  const questions = (Array.isArray(r?.questions) ? r.questions : []).map((q, i) => ({
    id: `oq-${i + 1}`, q: str(q?.q), es: str(q?.es), why: str(q?.why), frame: FRAMES.includes(q?.frame) ? q.frame : 'qyq',
    start: str(q?.start), startEs: str(q?.start_es), model: str(q?.model), modelEs: str(q?.model_es), group: 'oferta',
  })).filter(q => {
    if (!q.q || !q.es || !q.start || !q.model) return false;
    const k = normalize(q.q);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  questions.forEach((q, i) => { q.id = `oq-${i + 1}`; });
  const words = (Array.isArray(r?.words) ? r.words : []).map(w => ({ en: str(w?.en), es: str(w?.es), example: str(w?.example) })).filter(w => w.en && w.es);
  const ask = (Array.isArray(r?.ask) ? r.ask : []).map(a => ({ en: str(a?.en), es: str(a?.es) })).filter(a => a.en && a.es);
  return {
    id: `of-${at.toString(36)}`, at, date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    role: str(r?.role) || str(role), company: str(r?.company), summary: str(r?.summary_es),
    ad: String(ad || '').trim().slice(0, MAX_AD), questions, words, ask, answers: {},
  };
}
export const isUsable = o => o.questions.length >= 4;

// Guarda lo mejor de cada pregunta: lo que usted dijo (con su nota del teléfono) y su respuesta mejorada por la IA.
export function withAnswer(offer, qid, { said = '', score = null, en = '', es = '', from = '' } = {}, at = Date.now()) {
  const prev = offer.answers?.[qid] || {};
  const next = { ...prev };
  if (said && (prev.saidScore == null || (score ?? 0) >= prev.saidScore)) { next.said = said; next.saidScore = score ?? 0; }
  if (en) { next.en = en; next.es = es; next.from = from; }
  next.at = at;
  return { ...offer, answers: { ...(offer.answers || {}), [qid]: next } };
}

// La pregunta de la oferta que corresponde a un texto (para guardar lo del simulacro).
export const questionByText = (offer, text) => offer.questions.find(q => normalize(q.q) === normalize(text)) || null;

// Preguntas del simulacro de esta oferta: las primeras de la oferta y al final «¿tiene preguntas para nosotros?».
export function mockQuestions(offer, n = MOCK_SIZE) {
  return [...offer.questions.slice(0, n).map((q, i) => ({ en: q.q, es: q.es, frame: q.frame, start: q.start, slot: q.id, slotName: `Pregunta ${i + 1}`, follow: i === 0 || i === Math.min(n, offer.questions.length) - 1 })),
    { ...LAST_QUESTION, slot: 'preguntas', slotName: 'Sus preguntas', follow: false }];
}

// «Mi guion»: cada pregunta con la mejor respuesta que tenga (mejorada > la suya > el ejemplo, que debe cambiar
// por su historia), sus historias STAR, las palabras del puesto y sus preguntas para ellos.
export function script(offer, islas = []) {
  const items = offer.questions.map(q => {
    const a = offer.answers?.[q.id] || {};
    const best = a.en ? { kind: 'mejorada', en: a.en, es: a.es || '' }
      : a.said ? { kind: 'suya', en: a.said, es: '' }
        : { kind: 'ejemplo', en: q.model, es: q.modelEs };
    return { id: q.id, q: q.q, qEs: q.es, start: q.start, ...best };   // es = traducción de la respuesta
  });
  const ready = items.filter(x => x.kind !== 'ejemplo').length;
  const stories = (islas || []).filter(x => x.island === 'entrevista' && x.en && x.es).map(x => ({ en: x.en, es: x.es }));
  return { items, ready, total: items.length, stories, words: offer.words, ask: offer.ask };
}

// El guion como texto (para copiarlo o mandarlo).
export function scriptText(offer, sc) {
  const lines = [`MI GUION · ${offer.role || 'Entrevista'}${offer.company ? ` · ${offer.company}` : ''}${offer.date ? ` · ${offer.date}` : ''}`, ''];
  for (const it of sc.items) lines.push(`Q: ${it.q} (${it.qEs})`, `A: ${it.en}${it.kind === 'ejemplo' ? '  [ejemplo: cámbielo por su historia]' : ''}`, ...(it.es ? [`   (${it.es})`] : []), '');
  if (sc.stories.length) lines.push('MIS HISTORIAS', ...sc.stories.map(s => `- ${s.en} (${s.es})`), '');
  if (sc.words.length) lines.push('PALABRAS DEL PUESTO', ...sc.words.map(w => `- ${w.en}: ${w.es}`), '');
  if (sc.ask.length) lines.push('MIS PREGUNTAS PARA ELLOS', ...sc.ask.map(a => `- ${a.en} (${a.es})`));
  return lines.join('\n').trim();
}

// Días que faltan (null sin fecha; negativo si ya pasó).
export function daysLeft(offer, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(offer.date || '')) return null;
  const [y, m, d] = offer.date.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
}
export const daysText = n => (n == null ? '' : n < 0 ? 'ya pasó' : n === 0 ? 'es hoy' : n === 1 ? 'es mañana' : `es en ${n} días`);
