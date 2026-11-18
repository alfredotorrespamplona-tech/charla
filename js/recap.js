// Resumen semanal (MarkWeeklySummaryAsOpened) y resumen del año («ReLoop»: mejor amigo, escenario
// favorito, cómo aprende, idioma y números del año), y avisos de la racha en el inicio
// (StreakExpiryReminder y StreakFreezeReceipt). Todo se calcula con el historial guardado en el teléfono.
import * as store from './store.js';
import { CHARACTERS, PLACES } from './data.js';
import * as scoring from './scoring.js';
import { h, mount, sheet } from './ui.js';

const DAY = 86400000;
const iso = d => store.todayIso(d);
const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Lunes (00:00) de la semana de la fecha.
export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

const most = list => {
  const n = new Map();
  for (const x of list) if (x) n.set(x, (n.get(x) || 0) + 1);
  let best = null, max = 0;
  for (const [k, v] of n) if (v > max) { best = k; max = v; }
  return best ? { key: best, count: max } : null;
};

// Números de un tramo de fechas [from, to).
export function periodStats(s, from, to) {
  const xs = s.history.filter(x => { const t = new Date(x.date).getTime(); return t >= from && t < to; });
  const minutes = Math.round(xs.reduce((a, x) => a + (x.stats?.durationSec || 0), 0) / 60);
  const byDay = new Map();
  for (const x of xs) byDay.set(iso(new Date(x.date)), (byDay.get(iso(new Date(x.date))) || 0) + (x.stats?.durationSec || 0));
  const bestDay = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const friend = most(xs.map(x => x.characterId));
  const place = most(xs.map(x => x.placeId));
  const mission = most(xs.map(x => x.missionName));
  const weekday = most(xs.map(x => new Date(x.date).getDay()));
  const hours = xs.map(x => new Date(x.date).getHours());
  const part = most(hours.map(hr => hr < 12 ? 'por la mañana' : hr < 19 ? 'por la tarde' : 'por la noche'));
  return {
    conversations: xs.length,
    minutes,
    spokeMin: Math.round(xs.reduce((a, x) => a + (x.stats?.spokeSec || 0), 0) / 60),
    words: xs.reduce((a, x) => a + (x.stats?.totalWords || 0), 0),
    stars: xs.reduce((a, x) => a + (x.stars || 0), 0),
    points: xs.reduce((a, x) => a + (x.score?.total || 0), 0),
    saved: s.vocab.filter(v => (v.createdAt || 0) >= from && (v.createdAt || 0) < to).length,
    days: byDay.size,
    bestDay: bestDay ? { date: bestDay[0], minutes: Math.round(bestDay[1] / 60) } : null,
    friend: friend && CHARACTERS[friend.key] ? { ...friend, name: CHARACTERS[friend.key].name } : null,
    place: place ? { ...place, name: PLACES.find(p => p.id === place.key)?.name || place.key } : null,
    mission,
    weekday: weekday ? WEEKDAYS_ES[weekday.key] : null,
    part: part?.key || null,
  };
}

// ---------------- Semana ----------------
export function lastWeek(s = store.get(), now = new Date()) {
  const to = weekStart(now).getTime();
  const from = to - 7 * DAY;
  return { key: iso(new Date(from)), from, to, ...periodStats(s, from, to) };
}

// Tarjeta del inicio: aparece una vez por semana si la semana pasada practicó.
export function weeklyCard(s, onChange) {
  const w = lastWeek(s);
  if (!w.conversations || s.weeklySeen === w.key) return null;
  return h('button.daily-goal.weekly', { onclick: () => { openWeekly(w); store.update(st => { st.weeklySeen = w.key; }); onChange?.(); } },
    h('span', {}, `📊 Su semana: ${w.conversations} ${w.conversations === 1 ? 'charla' : 'charlas'} · ${w.minutes} min · ⭐ ${w.stars}`),
    h('span.go', {}, 'Ver'));
}

export function openWeekly(w = lastWeek()) {
  const fmt = d => new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  sheet(h('div', {},
    h('h3', {}, '📊 Su semana'),
    h('p.muted', {}, `Del ${fmt(w.from)} al ${fmt(w.to - DAY)}`),
    h('div.stats', {},
      tile(w.conversations, 'charlas'), tile(w.minutes + ' min', 'de práctica'),
      tile(w.spokeMin + ' min', 'hablando'), tile(w.words, 'palabras dichas'),
      tile(w.saved, 'palabras guardadas'), tile(`${w.days}/7`, 'días con práctica')),
    w.bestDay ? h('p', {}, `🏆 Su mejor día fue el ${WEEKDAYS_ES[new Date(w.bestDay.date + 'T12:00').getDay()]}: ${w.bestDay.minutes} min.`) : null,
    w.friend ? h('p', {}, `👥 Con quien más habló: ${w.friend.name} (${w.friend.count} ${w.friend.count === 1 ? 'charla' : 'charlas'}).`) : null,
    h('p.muted', {}, weekAdvice(w))));
}

function weekAdvice(w) {
  if (w.days >= 5) return '¡Semana muy constante! Lo que más ayuda es hablar un poco cada día, y lo está haciendo.';
  if (w.days >= 3) return 'Buena semana. Intente sumar un día más: varias charlas cortas rinden más que una larga.';
  return 'Esta semana intente practicar al menos 3 días, aunque sean 5 minutos.';
}

const tile = (v, label) => h('div.stat', {}, h('b', {}, String(v)), h('small', {}, label));

// ---------------- Año («ReLoop») ----------------
export function yearRecap(s = store.get(), year = new Date().getFullYear()) {
  const from = new Date(year, 0, 1).getTime(), to = new Date(year + 1, 0, 1).getTime();
  const st = periodStats(s, from, to);
  const phrases = s.vocab.filter(v => v.source === 'core' && (v.createdAt || 0) >= from && (v.createdAt || 0) < to).length;
  const rel = st.friend ? store.get().relationships[st.friend.key] : null;
  return { year, ...st, phrases, record: s.streak.record || 0, friendLevel: rel?.level ?? null };
}

// Entre el 1 de diciembre y el 15 de enero, una tarjeta en el inicio con el resumen del año.
export function recapCard(s, now = new Date(), open) {
  const year = now.getMonth() === 11 ? now.getFullYear() : now.getMonth() === 0 && now.getDate() <= 15 ? now.getFullYear() - 1 : null;
  if (!year || s.recapSeen === year) return null;
  const r = yearRecap(s, year);
  if (r.conversations < 5) return null;
  return h('button.daily-goal.weekly', { onclick: () => { store.update(st => { st.recapSeen = year; }); open(year); } },
    h('span', {}, `✨ Su ${year} en Charla: ${r.conversations} charlas`), h('span.go', {}, 'Ver'));
}

export function recapScreen({ home, year = new Date().getFullYear() }) {
  const r = yearRecap(store.get(), year);
  const card = (title, big, text) => h('div.card.recap-card', {}, h('small.muted', {}, title), h('div.recap-big', {}, big), text ? h('p', {}, text) : null);
  mount(h('div.screen.recap', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: home }, '←'), h('h2', {}, `✨ Su ${year} en Charla`)),
    !r.conversations ? h('p.muted', {}, 'Todavía no hay charlas este año.') : null,
    r.conversations ? [
      card('Charlas', String(r.conversations), `${r.minutes} minutos de práctica y ${r.spokeMin} hablando en inglés.`),
      card('Palabras que dijo', r.words.toLocaleString('es'), `Guardó ${r.saved} palabras y aprendió ${r.phrases} frases esenciales.`),
      r.friend ? card('Su mejor amigo', r.friend.name, `Hablaron ${r.friend.count} ${r.friend.count === 1 ? 'vez' : 'veces'}.`) : null,
      r.mission ? card('Su escenario favorito', r.mission.key, r.place ? `Y el lugar al que más fue: ${r.place.name}.` : '') : null,
      r.weekday ? card('Cómo aprende', `Los ${r.weekday}`, `Su día con más charlas${r.part ? ', casi siempre ' + r.part : ''}.`) : null,
      card('Racha más larga', `🔥 ${r.record} ${r.record === 1 ? 'día' : 'días'}`, `Y juntó ⭐ ${r.stars} estrellas.`),
    ] : null));
}

// ---------------- Avisos de la racha ----------------
// StreakExpiryReminder: desde la tarde, si hoy no practicó y la racha se pierde a medianoche.
// StreakFreezeReceipt: si faltó días y los protectores la están salvando.
export function streakNotice(now = new Date()) {
  const st = scoring.streakStatus(now);
  if (!st.count || st.doneToday) return null;
  if (st.missed > 0 && st.alive) {
    return h('div.card.notice', {}, `🧊 Faltó ${st.missed === 1 ? 'un día' : st.missed + ' días'}, pero su racha de ${st.count} ${st.count === 1 ? 'día' : 'días'} sigue viva: si practica hoy, ${st.missed === 1 ? 'un protector cubre ese día' : st.missed + ' protectores cubren esos días'}.`);
  }
  if (st.missed === 0 && now.getHours() >= 17) {
    const left = 24 - now.getHours();
    return h('div.card.notice.risk', {}, `🔥 Su racha de ${st.count} ${st.count === 1 ? 'día' : 'días'} se pierde a medianoche (quedan ~${left} h). Una charla de 3 turnos la salva.`);
  }
  return null;
}
