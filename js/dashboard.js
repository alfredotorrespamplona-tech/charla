// Portada: lo primero que se ve al abrir la app. Resume el día (meta, racha, semana) y lleva
// directo a lo que toca: seguir la charla, repasar, la lección de gramática o el mapa.
import { PIECES } from './escuchar.js';
import { isDue as isTestDue, daysUntilNext } from './nivel.js';
import * as store from './store.js';
import { h, mount } from './ui.js';
import { CHARACTERS, rankById } from './data.js';
import * as scoring from './scoring.js';
import * as srs from './srs.js';
import * as G from './grammar.js';
import { PHRASES, learnedIds } from './phrases.js';
import { activeErrors } from './bitacora.js';
import { practiceDays } from './stats.js';
import * as M from './mil.js';
import { speak } from './speech.js';

// ¿Tiene alguna clave de IA? (Groq o DeepSeek). Igual que hasAI de llm.js, sin cargar ese módulo.
const hasAI = st => !!((st.groqKey || '').trim() || (st.apiKey || '').trim());

const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function greeting(now = new Date()) {
  const hr = now.getHours();
  return hr < 5 ? 'Buenas noches' : hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export function dateLine(now = new Date()) {
  const day = WEEKDAYS[now.getDay()];
  return `${day[0].toUpperCase() + day.slice(1)} ${now.getDate()} de ${MONTHS[now.getMonth()]}`;
}

// Los últimos 7 días (hoy al final): practicó, protegido con 🧊, o nada.
export function weekStrip(s = store.get(), now = new Date()) {
  const { practiced, frozen } = practiceDays(s);
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12);
    const iso = store.todayIso(d);
    out.push({ iso, label: DAYS[d.getDay()], today: i === 0, done: practiced.has(iso), frozen: frozen.has(iso) });
  }
  return out;
}

// Minutos de charla de hoy contra la meta diaria.
export function todayProgress(s = store.get()) {
  const secs = s.daily?.date === store.todayIso() ? s.daily.seconds : 0;
  const goal = s.dailyGoal || 10;
  return { min: Math.floor(secs / 60), goal, pct: Math.min(1, secs / (goal * 60)) };
}

function ring(pct, label, sub) {
  const r = 42, c = 2 * Math.PI * r;
  const svg = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="${r}" class="ring-track"/>
    <circle cx="50" cy="50" r="${r}" class="ring-fill" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/>
  </svg>`;
  return h('div.dash-ring', { role: 'img', 'aria-label': `${label} ${sub}` }, h('div', { html: svg }), h('div.dash-ring-text', {}, h('b', {}, label), h('small', {}, sub)));
}

function tile({ icon, title, value, sub, onclick, accent, wide }) {
  return h('button.dash-tile', { class: [accent ? 'accent' : '', wide ? 'wide' : ''].join(' ').trim(), onclick },
    h('span.dash-tile-top', {}, icon, h('span', {}, title)),
    h('b.dash-tile-value', {}, value),
    sub ? h('small', {}, sub) : null);
}

// Plan de hoy: lo que conviene hacer cada día, con su estado (hecho o cuánto falta).
export function todayPlan(s = store.get(), now = new Date()) {
  const today = todayProgress(s);
  const iso = store.todayIso(now);
  const mil = M.normalize(s.mil);
  const deck = M.quickCounts(mil, now.getTime(), iso);
  const due = srs.dueCount(s.vocab, now.getTime());
  const items = [
    { key: 'talk', icon: '🎤', title: 'Charlar', done: today.pct >= 1,
      detail: today.pct >= 1 ? `${today.min} min · meta cumplida` : `${today.min} de ${today.goal} min` },
    { key: 'mil', icon: '📇', title: 'Mil palabras', done: deck.toStudy === 0,
      detail: deck.toStudy === 0 ? `al día · sabe ${deck.learned}` : [deck.due && `${deck.due} ${deck.due === 1 ? 'repaso' : 'repasos'}`, deck.fresh && `${deck.fresh} ${deck.fresh === 1 ? 'nueva' : 'nuevas'}`].filter(Boolean).join(' + ') },
    // Escuchar: lo primero que pide el cerebro (input comprensible), una historia al día.
    { key: 'listen', icon: '🎧', title: 'Escuchar', done: (s.escuchar?.today?.date === iso ? s.escuchar.today.count : 0) > 0,
      detail: (s.escuchar?.today?.date === iso ? s.escuchar.today.count : 0) > 0 ? `${s.escuchar.today.count} ${s.escuchar.today.count === 1 ? 'historia' : 'historias'} hoy` : 'una historia corta' },
    // El repaso de su vocabulario solo aparece cuando ya tiene palabras guardadas.
    s.vocab.some(srs.isActive) ? { key: 'review', icon: '🧠', title: 'Repaso', done: due === 0,
      detail: due ? `${due} ${due === 1 ? 'tarjeta' : 'tarjetas'}` : 'nada pendiente' } : null,
  ].filter(Boolean);
  return { items, done: items.filter(i => i.done).length };
}

// Palabra del día: la próxima nueva del mazo (o una de repaso), con su voz y su frase.
async function wordOfDay(box, go) {
  const cards = await M.loadMilCards().catch(() => null);
  if (!cards?.length || !box.isConnected) { box.remove(); return; }
  const mil = M.normalize(store.get().mil);
  const fresh = cards.find(c => !mil.cards[c.id]);
  const c = fresh || cards[(new Date().getDate() * 37) % cards.length];
  const audio = (text, rate = 0.9) => () => speak(text, { rate, character: { voice: { gender: 'female' } } });
  box.replaceChildren(
    h('div.dash-wod-head', {}, h('small', {}, fresh ? `Palabra nueva #${c.id}` : `Para recordar #${c.id}`),
      h('button.tiny', { onclick: go.mil }, 'Estudiar →')),
    h('div.dash-wod-word', {}, h('b', {}, c.front), h('button.icon', { 'aria-label': 'Escuchar la palabra', onclick: audio(c.word, 0.8) }, '🔊')),
    h('div.muted', {}, c.defs.join(' · ')),
    c.sentence ? h('div.dash-wod-ex', {}, h('span', {}, c.sentence), h('button.icon', { 'aria-label': 'Escuchar la frase', onclick: audio(c.sentence) }, '🔊')) : null,
    c.translation ? h('small.muted', {}, c.translation) : null);
  box.classList.remove('hidden');
}

// Técnicas: «Las 5 de hoy» hechas, o cuántas técnicas ya probó.
export function techLabel(s = store.get()) {
  const t = s.tecnicas || {};
  const today = t.today?.date === store.todayIso() ? (t.today.steps || []).length : 0;
  if (today) return `Hoy: ${today}/3`;
  const tried = Object.keys(t.done || {}).filter(k => !k.includes(':')).length;
  return tried ? `${tried} probadas` : '11 técnicas';
}

// go = { map, resume, review, grammar, essentials, vocab, errors, stats, settings, mil, tecnicas, listen, mock, nivel }
export function dashboard(go) {
  const s = store.get();
  const now = new Date();
  const today = todayProgress(s);
  const streak = scoring.streakStatus(now);
  const due = srs.dueCount(s.vocab);
  const best = s.grammar?.best || {};
  const lesson = G.nextLesson(store.reachRank(s) === 6 ? 6 : s.rank, best);
  const passed = G.LESSONS.filter(l => (best[l.id] || 0) >= G.PASS).length;
  const errors = activeErrors(s).length;
  const draft = s.draft && CHARACTERS[s.draft.characterId] ? s.draft : null;
  const week = weekStrip(s, now);
  const doneGoal = today.pct >= 1;
  const plan = todayPlan(s, now);
  const mil = M.normalize(s.mil);
  const deck = M.quickCounts(mil, now.getTime(), store.todayIso(now));
  const planGo = { talk: draft ? () => go.resume(draft) : go.map, mil: go.mil, review: go.review, listen: go.listen };
  const mocks = s.entrevista?.mocks || [];
  const lastMock = mocks[mocks.length - 1];
  const tests = s.nivel?.tests || [];
  const lastTest = tests[tests.length - 1];
  const testDue = isTestDue(tests, now.getTime());
  const wod = h('section.card.dash-wod.hidden');
  wordOfDay(wod, go);

  const cta = draft
    ? h('button.primary.dash-cta', { onclick: () => go.resume(draft) },
      h('span', {}, `▶️ Seguir la charla con ${CHARACTERS[draft.characterId].name}`),
      h('small', {}, `${draft.mission?.icon || ''} ${draft.mission?.name || ''}`))
    : h('button.primary.dash-cta', { onclick: go.map },
      h('span', {}, '🎤 Empezar a hablar'),
      h('small', {}, doneGoal ? 'Meta de hoy cumplida: ¡una charla más suma!' : `Le faltan ${Math.max(1, today.goal - today.min)} min para la meta de hoy`));

  mount(h('div.screen.dashboard', {},
    h('header.dash-hero', {},
      h('div.dash-brand', {}, h('img', { src: 'icons/icon-192.png', alt: '', width: 44, height: 44 }), h('span', {}, 'Charla')),
      h('h1', {}, `${greeting(now)}${s.name ? ', ' + s.name : ''}`),
      h('p.dash-date', {}, dateLine(now)),
      h('div.dash-stats', {},
        ring(today.pct, `${today.min}/${today.goal}`, 'min hoy'),
        h('div.dash-side', {},
          h('div.dash-stat', {}, h('b', {}, `🔥 ${streak.count}`), h('small', {}, streak.count === 1 ? 'día seguido' : 'días seguidos')),
          h('div.dash-stat', {}, h('b', {}, `⭐ ${s.points}`), h('small', {}, 'puntos')),
          h('div.dash-stat', {}, h('b', {}, String(s.history.length)), h('small', {}, s.history.length === 1 ? 'charla' : 'charlas'))))),
    cta,
    draft ? h('button.secondary.wide.dash-map', { onclick: go.map }, '🗺️ Ir al mapa de la ciudad') : null,
    h('section.card.dash-plan', {},
      h('div.dash-week-head', {}, h('b', {}, 'Plan de hoy'), h('small.muted', {}, plan.done === plan.items.length ? '¡Todo listo! 🎉' : `${plan.done} de ${plan.items.length} listo`)),
      plan.items.map(it => h('button.dash-plan-row', { class: it.done ? 'done' : '', onclick: planGo[it.key] },
        h('span.dash-check', {}, it.done ? '✓' : ''),
        h('span.dash-plan-text', {}, h('b', {}, `${it.icon} ${it.title}`), h('small', {}, it.detail)),
        h('span.dash-go', {}, it.done ? '' : '›')))),
    wod,
    h('section.card.dash-week', {},
      h('div.dash-week-head', {}, h('b', {}, 'Esta semana'), h('small.muted', {}, `${week.filter(d => d.done).length} de 7 días`)),
      h('div.dash-days', {}, week.map(d => h('div.dash-day', { class: [d.done ? 'done' : '', d.frozen ? 'frozen' : '', d.today ? 'today' : ''].join(' ') },
        h('span', {}, d.label), h('i', {}, d.done ? '✓' : d.frozen ? '🧊' : ''))))),
    h('h2.dash-title', {}, 'Practicar'),
    h('div.dash-grid', {},
      tile({ icon: '🎧', title: 'Escuchar', value: `${Object.keys(s.escuchar?.done || {}).length}/${PIECES.length}`, sub: 'historias y diálogos', onclick: go.listen }),
      tile({ icon: '💼', title: 'Simulacro', value: lastMock ? `${lastMock.overall}/100` : 'Entrevista', sub: lastMock ? `${mocks.length} ${mocks.length === 1 ? 'hecho' : 'hechos'} · con nota` : '15 min con nota', onclick: go.mock }),
      tile({ icon: '📏', title: 'Su nivel', value: lastTest ? lastTest.label : 'Prueba', sub: testDue ? 'le toca este mes' : `próxima en ${daysUntilNext(tests, now.getTime())} días`, onclick: go.nivel, accent: testDue && !!lastTest, wide: true }),
      tile({ icon: '📇', title: 'Mil palabras', value: `${deck.learned}/${deck.total}`, sub: deck.toStudy ? `${deck.toStudy} para hoy` : 'al día', onclick: go.mil, accent: deck.toStudy > 0 }),
      tile({ icon: '🧠', title: 'Repaso', value: due ? `${due} ${due === 1 ? 'tarjeta' : 'tarjetas'}` : 'Al día', sub: due ? 'Le toca hoy' : 'Nada pendiente', onclick: go.review, accent: due > 0 }),
      tile({ icon: '🧱', title: 'Gramática', value: lesson ? lesson.title : '¡Todo aprobado!', sub: `${passed}/${G.LESSONS.length} lecciones`, onclick: go.grammar }),
      tile({ icon: '📚', title: 'Frases', value: `${learnedIds(s.vocab).size}/${PHRASES.length}`, sub: 'frases esenciales', onclick: go.essentials }),
      tile({ icon: '🚀', title: 'Técnicas', value: techLabel(s), sub: 'dictado, sombra, un minuto sin parar, mis frases…', onclick: go.tecnicas, wide: true }),
      tile({ icon: '🎓', title: 'Por nivel', value: `Nivel ${rankById(s.rank).code}`, sub: 'contenido de A1 a C2', onclick: go.levels }),
      tile({ icon: '📒', title: 'Mis errores', value: errors ? `${errors} activos` : 'Ninguno', sub: 'su bitácora', onclick: go.errors }),
      tile({ icon: '📖', title: 'Vocabulario', value: String(s.vocab.filter(v => !v.archived).length), sub: 'palabras guardadas', onclick: go.vocab }),
      tile({ icon: '📊', title: 'Estadísticas', value: `${s.history.length}`, sub: 'charlas en total', onclick: go.stats })),
    h('div.dash-footer', {},
      h('button.link', { onclick: go.map }, '🗺️ Mapa'),
      h('button.link', { onclick: go.settings }, '⚙️ Ajustes')),
    !hasAI(s.settings) ? h('p.warn', {}, '⚠️ Falta su clave de IA (Groq gratis o DeepSeek): vaya a Ajustes.') : null));
}
