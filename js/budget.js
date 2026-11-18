// Gasto en DeepSeek del mes y tope (solo cálculos: sin pantallas, para poder probarlo).
// Precios oficiales (api-docs.deepseek.com/quick_start/pricing, revisados el 2026-11-18), en US$ por millón de
// tokens. Se usa la hora pico, la más cara: fuera de ella cuesta la mitad, así que el gasto real es igual o menor.
export const PRICES = {
  'deepseek-flash': { hit: 0.006, miss: 0.3, out: 1.2 },
  'deepseek-v4-pro': { hit: 0.044, miss: 1.32, out: 3.96 },
};
export const NEAR = 0.8;   // avisa al llegar al 80 % del tope

export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Costo de una llamada a partir de lo que devuelve la API en «usage».
export function costOf(usage = {}, model = 'deepseek-flash') {
  const p = PRICES[model] || PRICES['deepseek-flash'];
  const hit = usage.prompt_cache_hit_tokens || 0;
  const miss = usage.prompt_cache_miss_tokens ?? Math.max(0, (usage.prompt_tokens || 0) - hit);
  const out = usage.completion_tokens || 0;
  return (hit * p.hit + miss * p.miss + out * p.out) / 1e6;
}

// El gasto del mes (empieza en cero cada mes).
export function month(s, now = new Date()) {
  const key = monthKey(now);
  return s.usageMonth?.month === key ? s.usageMonth : { month: key, usd: 0, calls: 0, warned: '' };
}

export function spendStatus(s, now = new Date()) {
  const m = month(s, now);
  const cap = Number(s.settings.monthlyCap) || 0;
  const pct = cap > 0 ? m.usd / cap : 0;
  const level = cap <= 0 ? 'ok' : m.usd >= cap ? 'over' : pct >= NEAR ? 'near' : 'ok';
  return { usd: m.usd, calls: m.calls, cap, pct, level, month: m.month };
}

// Suma una llamada al mes. Devuelve 'near' u 'over' la primera vez que se cruza cada umbral (para avisar una vez).
export function addSpend(s, usage, model, now = new Date()) {
  const m = { ...month(s, now) };
  m.usd += costOf(usage, model);
  m.calls += 1;
  s.usageMonth = m;
  const { level } = spendStatus(s, now);
  if (level !== 'ok' && m.warned !== level && !(m.warned === 'over' && level === 'near')) {
    m.warned = level;
    return level;
  }
  return null;
}

// «US$0,42» (centavos de dólar; menos de un centavo se muestra como «< US$0,01»).
export function usd(v) {
  if (v > 0 && v < 0.01) return '< US$0,01';
  return 'US$' + v.toFixed(2).replace('.', ',');
}
