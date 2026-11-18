// Estadísticas por semana, mes y año (como la pantalla de LingoLooper: puntos, charlas, demora al responder,
// palabras por minuto, palabras distintas y tiempo hablado, con gráfico) y calendario mensual de la racha
// con los días practicados y los salvados con protector.
import * as store from './store.js';
import { h, mount } from './ui.js';
import { recapScreen } from './recap.js';

export const PERIODS = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Año' },
];

export const METRICS = [
  { key: 'points', label: 'Puntos', unit: '' },
  { key: 'minutes', label: 'Minutos', unit: ' min' },
  { key: 'conversations', label: 'Charlas', unit: '' },
  { key: 'spoke', label: 'Hablado', unit: ' min' },
];

const iso = d => store.todayIso(d);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Grupos del gráfico: 7 días, los días del mes actual o los 12 meses del año.
export function buckets(period, now = new Date()) {
  if (period === 'year') {
    return MONTHS.map((m, i) => ({ key: `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`, label: m }));
  }
  if (period === 'month') {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
      return { key: iso(d), label: String(i + 1) };
    });
  }
  const monday = addDays(now, -((now.getDay() + 6) % 7));
  return WEEKDAYS.map((w, i) => ({ key: iso(addDays(monday, i)), label: w }));
}

// Resumen del periodo a partir del historial de charlas.
export function computeStats(history, period, now = new Date()) {
  const bs = buckets(period, now);
  const keyOf = x => period === 'year' ? iso(new Date(x.date)).slice(0, 7) : iso(new Date(x.date));
  const inPeriod = history.filter(x => bs.some(b => b.key === keyOf(x)));
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const series = bs.map(b => {
    const xs = inPeriod.filter(x => keyOf(x) === b.key);
    return {
      ...b,
      points: xs.reduce((a, x) => a + (x.score?.total || 0), 0),
      minutes: Math.round(xs.reduce((a, x) => a + (x.stats?.durationSec || 0), 0) / 60),
      conversations: xs.length,
      spoke: Math.round(xs.reduce((a, x) => a + (x.stats?.spokeSec || 0), 0) / 60),
    };
  });
  const withWpm = inPeriod.filter(x => x.stats?.avgWpm);
  return {
    conversations: inPeriod.length,
    points: inPeriod.reduce((a, x) => a + (x.score?.total || 0), 0),
    minutes: Math.round(inPeriod.reduce((a, x) => a + (x.stats?.durationSec || 0), 0) / 60),
    spokeMin: +(inPeriod.reduce((a, x) => a + (x.stats?.spokeSec || 0), 0) / 60).toFixed(1),
    avgDelaySec: +avg(inPeriod.map(x => x.stats?.avgDelaySec || 0)).toFixed(1),
    avgWpm: Math.round(avg(withWpm.map(x => x.stats.avgWpm))),
    avgDistinct: Math.round(avg(inPeriod.map(x => x.stats?.distinctWords || 0))),
    totalWords: inPeriod.reduce((a, x) => a + (x.stats?.totalWords || 0), 0),
    stars: inPeriod.reduce((a, x) => a + (x.stars || 0), 0),
    series,
  };
}

// Días practicados (racha) y días salvados con protector, para el calendario.
export function practiceDays(s = store.get()) {
  const days = new Set(s.streak.days || []);
  for (const x of s.history) if ((x.stats?.turns || 0) >= 3) days.add(iso(new Date(x.date)));
  return { practiced: days, frozen: new Set(s.streak.frozenDays || []) };
}

export function calendar(year, month, s = store.get(), now = new Date()) {
  const { practiced, frozen } = practiceDays(s);
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const today = iso(now);
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    const key = iso(new Date(year, month, d));
    cells.push({ day: d, key, practiced: practiced.has(key), frozen: frozen.has(key), today: key === today, future: key > today });
  }
  return { label: `${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][month]} ${year}`, cells,
    count: cells.filter(c => c?.practiced).length };
}

export function calendarView(initial = new Date()) {
  let y = initial.getFullYear(), m = initial.getMonth();
  const box = h('div.calendar');
  const paint = () => {
    const c = calendar(y, m);
    box.innerHTML = '';
    box.append(
      h('div.cal-head', {},
        h('button.icon', { 'aria-label': 'Mes anterior', onclick: () => { m--; if (m < 0) { m = 11; y--; } paint(); } }, '‹'),
        h('b', {}, `${c.label} · ${c.count} ${c.count === 1 ? 'día' : 'días'}`),
        h('button.icon', { 'aria-label': 'Mes siguiente', onclick: () => { m++; if (m > 11) { m = 0; y++; } paint(); } }, '›')),
      h('div.cal-grid', {},
        WEEKDAYS.map(w => h('span.cal-wd', {}, w)),
        c.cells.map(x => x ? h('span.cal-day', {
          class: [x.practiced ? 'done' : '', x.frozen ? 'frozen' : '', x.today ? 'today' : '', x.future ? 'future' : ''].join(' '),
          title: x.practiced ? 'Practicó' : x.frozen ? 'Salvado con protector' : '',
        }, x.practiced ? '🔥' : x.frozen ? '🧊' : String(x.day)) : h('span'))),
      h('small.muted', {}, '🔥 practicó · 🧊 salvado con protector'));
  };
  paint();
  return box;
}

export function statsScreen({ home }) {
  let period = 'week', metric = 'minutes';
  const body = h('div');
  const seg = (opts, get, set) => h('div.segmented', {}, opts.map(o => h('button', {
    class: get() === o.key ? 'sel' : '', onclick: () => { set(o.key); paint(); },
  }, o.label)));
  const tile = (v, label) => h('div.stat', {}, h('b', {}, v), h('small', {}, label));
  function paint() {
    const st = computeStats(store.get().history, period);
    const mt = METRICS.find(x => x.key === metric);
    const max = Math.max(1, ...st.series.map(x => x[metric]));
    body.innerHTML = '';
    body.append(
      seg(PERIODS, () => period, v => { period = v; }),
      h('div.stats', {},
        tile(st.points, 'puntos'),
        tile(st.conversations, 'charlas'),
        tile(st.minutes + ' min', 'de práctica'),
        tile(st.spokeMin + ' min', 'hablando'),
        tile(st.avgDelaySec ? st.avgDelaySec + ' s' : '—', 'demora al responder'),
        tile(st.avgWpm || '—', 'palabras/min'),
        tile(st.avgDistinct || '—', 'palabras distintas por charla'),
        tile(st.stars, 'estrellas')),
      seg(METRICS, () => metric, v => { metric = v; }),
      h('div.chart', { role: 'img', 'aria-label': `${mt.label} por ${period === 'year' ? 'mes' : 'día'}` },
        st.series.map(x => h('div.bar-col', { title: `${x.label}: ${x[metric]}${mt.unit}` },
          h('div.bar', { style: { height: `${Math.round((x[metric] / max) * 100)}%` } }),
          h('small', {}, period === 'month' && +x.label % 5 !== 1 ? '' : x.label)))),
      ...(st.conversations ? [] : [h('p.muted', {}, 'Todavía no hay charlas en este periodo.')]));
  }
  mount(h('div.screen', {},
    h('div.topbar', {}, h('button.icon', { onclick: home }, '←'), h('h2', {}, '📊 Estadísticas')),
    body,
    h('h3', {}, '🔥 Calendario de la racha'),
    calendarView(),
    h('button.daily-goal', { onclick: () => recapScreen({ home: () => statsScreen({ home }) }) }, `✨ Su ${new Date().getFullYear()} en Charla`)));
  paint();
}
