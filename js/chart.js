// Gráficas pequeñas y propias (sin librerías): la línea de cómo mejora de una prueba a otra y las barras de
// cada habilidad. Una sola serie, color de identidad (no de estado), números en tinta de texto, y una tabla
// para leerla sin la gráfica.
import { h } from './ui.js';

const W = 320, H = 150, PAD = { l: 30, r: 14, t: 14, b: 26 };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Geometría de la línea (sin DOM: se prueba con node). points = [{ label, value }] con value 0..max.
export function lineGeometry(points, max = 100) {
  const n = points.length;
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const x = i => PAD.l + (n <= 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = v => PAD.t + ih - (ih * Math.max(0, Math.min(max, v))) / max;
  return points.map((p, i) => ({ ...p, x: Math.round(x(i) * 10) / 10, y: Math.round(y(p.value) * 10) / 10 }));
}

// Línea de progreso. title = qué mide (la serie es una sola: no lleva leyenda).
export function progressChart(points, { max = 100, title = 'Nota', unit = '' } = {}) {
  const pts = lineGeometry(points, max);
  const grid = [0.25, 0.5, 0.75, 1].map(f => {
    const yy = PAD.t + (H - PAD.t - PAD.b) * (1 - f);
    return `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${yy}" y2="${yy}" class="ch-grid"/><text x="${PAD.l - 6}" y="${yy + 3}" class="ch-axis" text-anchor="end">${Math.round(max * f)}</text>`;
  }).join('');
  const base = `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${H - PAD.b}" y2="${H - PAD.b}" class="ch-base"/>`;
  const path = pts.length > 1 ? `<polyline points="${pts.map(p => `${p.x},${p.y}`).join(' ')}" class="ch-line"/>` : '';
  const every = Math.max(1, Math.ceil(pts.length / 5));
  const xl = pts.map((p, i) => (i % every === 0 || i === pts.length - 1)
    ? `<text x="${p.x}" y="${H - 8}" class="ch-axis" text-anchor="middle">${esc(p.label)}</text>` : '').join('');
  const dots = pts.map((p, i) => `<g class="ch-pt"><circle cx="${p.x}" cy="${p.y}" r="12" class="ch-hit"><title>${esc(p.label)}: ${p.value}${unit}</title></circle><circle cx="${p.x}" cy="${p.y}" r="4.5" class="ch-dot${i === pts.length - 1 ? ' last' : ''}"/></g>`).join('');
  const last = pts[pts.length - 1];
  const lab = last ? `<text x="${Math.min(last.x, W - PAD.r - 4)}" y="${Math.max(10, last.y - 10)}" class="ch-val" text-anchor="${last.x > W - 50 ? 'end' : 'middle'}">${last.value}${unit}</text>` : '';
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="ch" role="img" aria-label="${esc(title)}: ${pts.map(p => `${esc(p.label)} ${p.value}`).join(', ')}">${grid}${base}${path}${xl}${dots}${lab}</svg>`;
  const table = h('table.ch-table.hidden', {}, h('tr', {}, h('th', {}, 'Fecha'), h('th', {}, title)), points.map(p => h('tr', {}, h('td', {}, p.label), h('td', {}, `${p.value}${unit}`))));
  return h('div.ch-box', {}, h('div', { html: svg }),
    h('button.link', { onclick: e => { table.classList.toggle('hidden'); e.target.textContent = table.classList.contains('hidden') ? 'Ver como tabla' : 'Ocultar tabla'; } }, 'Ver como tabla'),
    table);
}

// Barras de habilidades: [{ label, value (0..100) o null, note }]. null = «necesita IA».
export function skillBars(rows) {
  return h('div.skill-bars', {}, rows.map(r => h('div.skill-row', {},
    h('span.skill-name', {}, r.label),
    h('span.skill-track', {}, r.value == null ? null : h('span.skill-fill', { style: { width: `${Math.max(2, Math.min(100, r.value))}%` } })),
    h('b.skill-val', {}, r.value == null ? '—' : String(r.value)),
    r.note ? h('small.muted.skill-note', {}, r.note) : null)));
}
