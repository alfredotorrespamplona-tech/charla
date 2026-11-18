// Portada: lo primero que se ve al abrir la app. Resume el día (meta, racha, semana) y lleva
// directo a lo que toca: seguir la charla, repasar, la lección de gramática o el mapa.
import * as store from './store.js';
import { h, mount } from './ui.js';
import { CHARACTERS } from './data.js';
import * as scoring from './scoring.js';
import * as srs from './srs.js';
import * as G from './grammar.js';
import { PHRASES, learnedIds } from './phrases.js';
import { activeErrors } from './bitacora.js';
import { practiceDays } from './stats.js';

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

function tile({ icon, title, value, sub, onclick, accent }) {
  return h('button.dash-tile', { class: accent ? 'accent' : '', onclick },
    h('span.dash-tile-top', {}, icon, h('span', {}, title)),
    h('b.dash-tile-value', {}, value),
    sub ? h('small', {}, sub) : null);
}

// go = { map, resume, review, grammar, essentials, vocab, errors, stats, settings }
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
    h('section.card.dash-week', {},
      h('div.dash-week-head', {}, h('b', {}, 'Esta semana'), h('small.muted', {}, `${week.filter(d => d.done).length} de 7 días`)),
      h('div.dash-days', {}, week.map(d => h('div.dash-day', { class: [d.done ? 'done' : '', d.frozen ? 'frozen' : '', d.today ? 'today' : ''].join(' ') },
        h('span', {}, d.label), h('i', {}, d.done ? '✓' : d.frozen ? '🧊' : ''))))),
    h('h2.dash-title', {}, 'Para hoy'),
    h('div.dash-grid', {},
      tile({ icon: '🧠', title: 'Repaso', value: due ? `${due} ${due === 1 ? 'tarjeta' : 'tarjetas'}` : 'Al día', sub: due ? 'Le toca hoy' : 'Nada pendiente', onclick: go.review, accent: due > 0 }),
      tile({ icon: '🧱', title: 'Gramática', value: lesson ? lesson.title : '¡Todo aprobado!', sub: `${passed}/${G.LESSONS.length} lecciones`, onclick: go.grammar }),
      tile({ icon: '📚', title: 'Frases', value: `${learnedIds(s.vocab).size}/${PHRASES.length}`, sub: 'frases esenciales', onclick: go.essentials }),
      tile({ icon: '📒', title: 'Mis errores', value: errors ? `${errors} activos` : 'Ninguno', sub: 'su bitácora', onclick: go.errors }),
      tile({ icon: '📖', title: 'Vocabulario', value: String(s.vocab.filter(v => !v.archived).length), sub: 'palabras guardadas', onclick: go.vocab }),
      tile({ icon: '📊', title: 'Estadísticas', value: `${s.history.length}`, sub: 'charlas en total', onclick: go.stats })),
    h('div.dash-footer', {},
      h('button.link', { onclick: go.map }, '🗺️ Mapa'),
      h('button.link', { onclick: go.settings }, '⚙️ Ajustes')),
    !s.settings.apiKey ? h('p.warn', {}, '⚠️ Falta la clave de DeepSeek: vaya a Ajustes.') : null));
}
