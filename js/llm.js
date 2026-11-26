// Cliente de la IA (APIs compatibles con OpenAI). Primero Groq (gratis, con límite por minuto y por día);
// cuando un modelo de Groq llega a su límite se prueba el siguiente de Groq y, al final, DeepSeek (de pago).
// Clave "demo" = respuestas simuladas sin gastar tokens.
import * as store from './store.js';
import { BITACORA } from './cerebro.js';
import { addSpend, spendStatus, usd } from './budget.js';

export class LlmError extends Error {}

const TIMEOUT_MS = 35000;       // redes móviles: no dejar la pantalla colgada
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const wait = ms => new Promise(r => setTimeout(r, ms));

export const GROQ_BASE = 'https://api.groq.com/openai/v1';
// Modelos de Groq en orden de preferencia (revisados con la API el 2026-11-20). Cada modelo tiene su propio
// límite gratis, así que si uno se agota se sigue con el otro antes de pasar a DeepSeek.
export const GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
export const NAMES = { groq: 'Groq', deepseek: 'DeepSeek' };
// Si Groq pide esperar menos que esto (límite por minuto), se espera y se reintenta el mismo modelo.
export const GROQ_SHORT_WAIT_MS = 6000;

const clean = k => (k || '').trim();
function apiBase(s) { return (s.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, ''); }

// ¿Hay alguna clave de IA? (Groq o DeepSeek; «demo» cuenta).
export function hasAI(s = store.get().settings) { return !!(clean(s.groqKey) || clean(s.apiKey)); }
export function isDemo(s = store.get().settings) { return [s.groqKey, s.apiKey].some(k => clean(k).toLowerCase() === 'demo'); }

// Las rutas a probar, en orden: los modelos de Groq que no están en pausa y luego DeepSeek.
export function routes(st = store.get(), now = Date.now()) {
  const s = st.settings;
  const out = [];
  if (clean(s.groqKey)) {
    const pause = st.groqPause || {};
    const models = [s.groqModel || GROQ_MODELS[0], ...GROQ_MODELS].filter((m, i, a) => m && a.indexOf(m) === i);
    for (const model of models) if (!(pause[model] > now)) out.push({ provider: 'groq', base: GROQ_BASE, key: clean(s.groqKey), model });
  }
  if (clean(s.apiKey)) out.push({ provider: 'deepseek', base: apiBase(s), key: clean(s.apiKey), model: s.model || 'deepseek-flash' });
  return out;
}

// Cuánto esperar después de un 429 de Groq: la cabecera retry-after o el «try again in 1m30s» del mensaje.
export function retryAfterMs(res, body = '') {
  const h = Number(res?.headers?.get?.('retry-after'));
  if (h > 0) return h * 1000;
  const m = /try again in\s+((?:\d+(?:\.\d+)?[hms]\s*)+)/i.exec(body);
  if (m) {
    let ms = 0;
    for (const [, n, u] of m[1].matchAll(/(\d+(?:\.\d+)?)([hms])/g)) ms += Number(n) * { h: 3600000, m: 60000, s: 1000 }[u];
    if (ms > 0) return ms;
  }
  return 60000;
}

// Pone en pausa un modelo de Groq hasta que se le pase el límite.
function pauseGroq(model, ms, now = Date.now()) {
  store.update(s => {
    const p = { ...(s.groqPause || {}) };
    for (const k of Object.keys(p)) if (p[k] <= now) delete p[k];   // limpia las pausas vencidas
    p[model] = now + Math.max(5000, ms);
    s.groqPause = p;
  });
}

// Hasta cuándo está Groq sin ningún modelo disponible (0 = hay alguno libre).
export function groqBlockedUntil(st = store.get(), now = Date.now()) {
  const s = st.settings;
  if (!clean(s.groqKey)) return 0;
  const models = [s.groqModel || GROQ_MODELS[0], ...GROQ_MODELS].filter((m, i, a) => m && a.indexOf(m) === i);
  const until = models.map(m => (st.groqPause || {})[m] || 0);
  return until.every(u => u > now) ? Math.min(...until) : 0;
}

export const hourText = ms => new Date(ms).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

async function request(url, init, route) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    const name = NAMES[route?.provider] || 'la IA';
    if (e.name === 'AbortError') throw Object.assign(new LlmError(`${name} tardó demasiado en responder. Revise su conexión e intente otra vez.`), { slow: true });
    throw new LlmError(`No hay conexión con ${name}. Revise su internet.`);
  }
  finally {
    clearTimeout(t);
  }
}

async function explain(res, route) {
  const body = await res.text().catch(() => '');
  const name = NAMES[route.provider];
  if (res.status === 401) return new LlmError(`La clave de ${name} no es válida (401). Revísela en Ajustes.`);
  if (res.status === 402) return new LlmError('Su cuenta de DeepSeek no tiene saldo (402). Recárguela en platform.deepseek.com.');
  if (res.status === 429) return new LlmError(route.provider === 'groq'
    ? `Groq llegó a su límite gratis. Vuelve a las ${hourText(Date.now() + retryAfterMs(res, body))}; mientras, ponga su clave de DeepSeek en Ajustes para seguir.`
    : 'Demasiadas solicitudes seguidas (429). Espere un momento.');
  if ((res.status === 400 || res.status === 404) && /model/i.test(body)) return new LlmError(`El modelo «${route.model}» no existe en ${name}. Cámbielo en Ajustes (use «Probar conexión» para ver los disponibles).`);
  return new LlmError(`${name} respondió ${res.status}: ${body.slice(0, 160)}`);
}

// Parámetros propios de cada proveedor.
function bodyFor(route, { messages, temperature, budget, stream, thinking }) {
  const body = { model: route.model, messages, temperature, max_tokens: budget, response_format: { type: 'json_object' }, stream };
  if (stream) body.stream_options = { include_usage: true };
  if (route.provider === 'deepseek' && thinking) body.thinking = { type: 'disabled' };
  // Los modelos de Groq que «razonan» gastan tokens pensando: aquí son tareas cortas, así que lo mínimo.
  if (route.provider === 'groq') {
    if (/gpt-oss/.test(route.model)) body.reasoning_effort = 'low';
    else if (/qwen/.test(route.model)) body.reasoning_effort = 'none';
  }
  return body;
}

// Una llamada con una ruta. Si falla de un modo en que conviene probar la siguiente ruta, el error lleva next = true.
async function callRoute(route, messages, { temperature, maxTokens, onText }) {
  const groq = route.provider === 'groq';
  let stream = !!onText && typeof ReadableStream !== 'undefined';
  let thinking = true;          // DeepSeek: se quita si el modelo elegido no acepta el parámetro
  let budget = maxTokens;
  let waited = false;
  const next = (err, extra = {}) => Object.assign(err, { next: true }, extra);
  for (let round = 0; round < 3; round++) {
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + route.key },
      body: JSON.stringify(bodyFor(route, { messages, temperature, budget, stream, thinking })) };
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { res = await request(route.base + '/chat/completions', init, route); }
      catch (e) {
        if (groq) throw next(e);   // Groq sin red o lento: pasar a la siguiente ruta
        // Red móvil que se cae un momento: un reintento antes de rendirse (no si se agotó el tiempo).
        if (attempt === 0 && !e.slow) { await wait(1200); continue; }
        throw e;
      }
      // Groq ocupado o al límite: no se espera, se pasa enseguida a la siguiente ruta (el usuario está esperando).
      if (groq || !RETRY_STATUS.has(res.status) || attempt === 2) break;
      await wait(1200 * (attempt + 1));   // DeepSeek ocupado: esperar y reintentar
    }
    if (res.status === 400 && thinking && !groq) {
      const err = await res.clone().text().catch(() => '');
      if (/thinking/i.test(err)) { thinking = false; continue; }
    }
    if (res.status === 400 && stream) {
      const err = await res.clone().text().catch(() => '');
      if (!groq || /stream/i.test(err)) { stream = false; round--; continue; }
    }
    if (!res.ok) {
      if (groq && (res.status === 429 || res.status === 413)) {
        const body = await res.clone().text().catch(() => '');
        const pauseMs = res.status === 429 ? retryAfterMs(res, body) : 0;
        // Límite por minuto que se libera en unos segundos: vale más esperar y seguir con el mejor modelo que
        // pasar a uno más flojo. Una sola vez por llamada.
        if (res.status === 429 && pauseMs <= GROQ_SHORT_WAIT_MS && !waited) { waited = true; await wait(pauseMs + 300); round--; continue; }
        throw next(await explain(res, route), { pauseMs, limit: true });
      }
      // Clave mala, modelo que ya no existe, JSON que el modelo no supo armar o error del servidor: siguiente ruta.
      if (groq) throw next(await explain(res, route));
      throw await explain(res, route);
    }
    let text, finish;
    if (stream && res.body) {
      let r;
      let heard = false;
      try { r = await readStream(res, t => { heard = true; onText(t); }); }
      catch (e) {
        if (heard) throw e;                 // ya empezó a hablar: no se puede repetir a medias
        stream = false; round--; continue;  // falló antes de llegar nada: se pide entera
      }
      trackUsage(r.usage, route);
      ({ text, finish } = r);
    } else {
      const data = await res.json();
      trackUsage(data.usage, route);
      const choice = data.choices?.[0];
      text = choice?.message?.content || '';
      finish = choice?.finish_reason;
    }
    if (finish === 'length' && round < 2) { budget = Math.min(budget * 2 + 400, 8000); continue; }   // se cortó: más espacio
    if (!text && finish === 'length') throw new LlmError('La respuesta de la IA quedó cortada. Intente otra vez.');
    try { return parseJson(text); }
    catch (e) { if (groq) throw next(e); throw e; }
  }
  throw new LlmError('La respuesta de la IA quedó cortada. Intente otra vez.');
}

// onText(textoAcumulado): si se pasa, la respuesta llega por partes (stream) y se avisa a medida que llega.
// Así el personaje empieza a hablar con la primera frase, sin esperar la respuesta completa.
// cache: true = tarea que siempre responde lo mismo (traducir, explicar una palabra…): se guarda la respuesta
// en el teléfono y la próxima vez no se gasta nada.
export async function chatJson(task, messages, { temperature = 0.8, maxTokens = 500, onText = null, cache = false } = {}) {
  const st = store.get();
  const s = st.settings;
  if (!hasAI(s)) throw new LlmError('Falta su clave de IA (Groq gratis o DeepSeek). Póngala en Ajustes.');
  const ckey = cache ? cacheKey(task, messages) : '';
  if (ckey) {
    const hit = cacheGet(ckey);
    if (hit) return hit;
  }
  if (isDemo(s)) {
    const r = await demo(task, messages);
    if (onText) await fakeStream(JSON.stringify(r), onText);
    if (ckey) cacheSet(ckey, r);
    return r;
  }
  let list = routes(st);
  // Tope de gasto con pausa activada: no se llama a DeepSeek hasta el mes siguiente (Groq, que es gratis, sigue).
  const spend = spendStatus(st);
  const capped = s.capBlock && spend.level === 'over';
  if (capped) list = list.filter(r => r.provider !== 'deepseek');
  if (!list.length) {
    if (capped && !clean(s.groqKey)) throw new LlmError(`Llegó a su tope de gasto de este mes (${usd(spend.usd)} de ${usd(spend.cap)}). Súbalo en Ajustes o espere al próximo mes.`);
    const until = groqBlockedUntil(st);
    throw new LlmError(`Groq llegó a su límite gratis. Vuelve a las ${hourText(until || Date.now() + 60000)}${capped ? ' (y DeepSeek está en pausa por su tope del mes)' : '; mientras, ponga su clave de DeepSeek en Ajustes para seguir'}.`);
  }
  let lastErr = null;
  let groqLimited = false;
  for (const route of list) {
    try {
      const r = await callRoute(route, messages, { temperature, maxTokens, onText });
      if (route.provider === 'deepseek' && groqLimited) notifySwitch();
      if (ckey) cacheSet(ckey, r);
      return r;
    } catch (e) {
      lastErr = e;
      if (e.limit) { groqLimited = true; if (e.pauseMs) pauseGroq(route.model, e.pauseMs); }
      if (!e.next) throw e;
    }
  }
  throw lastErr;
}

// Aviso (una vez por pausa) de que Groq se agotó y sigue DeepSeek.
function notifySwitch() {
  const until = groqBlockedUntil();
  if (!until || store.get().groqNotice === until) return;
  store.update(s => { s.groqNotice = until; });
  if (typeof globalThis.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    globalThis.dispatchEvent(new CustomEvent('charla:provider', { detail: { until } }));
  }
}

// Ajustes → «Probar conexión»: valida la clave y devuelve los modelos disponibles.
export async function testConnection(provider = 'deepseek', key = '', baseUrl = '') {
  const k = clean(key);
  if (!k) throw new LlmError('Escriba primero su clave.');
  if (k.toLowerCase() === 'demo') return [provider === 'groq' ? `${GROQ_MODELS[0]} (modo demo)` : 'deepseek-flash (modo demo)'];
  const route = { provider, model: '', base: provider === 'groq' ? GROQ_BASE : (baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '') };
  const res = await request(route.base + '/models', { headers: { Authorization: 'Bearer ' + k } }, route);
  if (!res.ok) throw await explain(res, route);
  const data = await res.json();
  // En Groq se muestran solo los modelos de texto (no los de voz ni los filtros).
  return (data.data || []).filter(m => m.active !== false && !/whisper|orpheus|guard|allam/i.test(m.id)).map(m => m.id);
}

// ---------- Respuestas guardadas (cache) ----------
// Viven aparte del progreso (no van en la copia de seguridad) y se guardan las últimas MAX_CACHE.
const CACHE_KEY = 'charla.ia-cache';
export const MAX_CACHE = 400;
const memCache = new Map();
export function cacheKey(task, messages) {
  const src = task + '|' + JSON.stringify(messages);
  let h1 = 5381, h2 = 52711;
  for (let i = 0; i < src.length; i++) { const c = src.charCodeAt(i); h1 = (h1 * 33) ^ c; h2 = (h2 * 33) ^ c; }
  return `${task}:${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}:${src.length}`;
}
function readCache() {
  try { return JSON.parse(globalThis.localStorage?.getItem(CACHE_KEY) || '{}') || {}; } catch { return {}; }
}
export function cacheGet(k) {
  if (memCache.has(k)) return structuredClone(memCache.get(k));
  const v = readCache()[k];
  return v ? structuredClone(v.v) : null;
}
export function cacheSet(k, v) {
  memCache.set(k, v);
  try {
    const all = readCache();
    all[k] = { v, t: Date.now() };
    const keys = Object.keys(all);
    if (keys.length > MAX_CACHE) keys.sort((a, b) => all[a].t - all[b].t).slice(0, keys.length - MAX_CACHE).forEach(x => delete all[x]);
    globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(all));
  } catch { /* sin espacio o sin localStorage: queda solo en memoria */ }
}
export function clearCache() { memCache.clear(); try { globalThis.localStorage?.removeItem(CACHE_KEY); } catch {} }

// Lee una respuesta por partes (Server-Sent Events: líneas «data: {...}») y junta el texto.
// Si deja de llegar texto por un rato (la red se colgó a medias), se corta en vez de esperar para siempre.
export const STALL_MS = 20000;
export async function readStream(res, onText, stallMs = STALL_MS) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', text = '', finish = null, usage = null;
  const line = raw => {
    const l = raw.trim();
    if (!l.startsWith('data:')) return;          // comentarios «: keep-alive» y líneas vacías
    const payload = l.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    let j;
    try { j = JSON.parse(payload); } catch { return; }
    if (j.usage) usage = j.usage;
    const ch = j.choices?.[0];
    const d = ch?.delta?.content;
    if (d) { text += d; try { onText?.(text); } catch (e) { console.warn(e); } }
    if (ch?.finish_reason) finish = ch.finish_reason;
  };
  let stallTimer = null;
  const stalled = () => new Promise((_, reject) => {
    stallTimer = setTimeout(() => { reader.cancel().catch(() => {}); reject(new Error('stall')); }, stallMs);
  });
  try {
    for (;;) {
      const { value, done } = await Promise.race([reader.read(), stalled()]).finally(() => clearTimeout(stallTimer));
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { line(buf.slice(0, i)); buf = buf.slice(i + 1); }
    }
  } catch {
    throw new LlmError('Se cortó la conexión con la IA. Revise su internet.');
  }
  if (buf) line(buf);
  return { text, finish, usage };
}

// Modo demo: simula que la respuesta llega por partes.
async function fakeStream(json, onText) {
  for (let i = 24; i < json.length + 24; i += 24) {
    onText(json.slice(0, i));
    await wait(60);
  }
}

// Saca el texto de un campo ("reply") de un JSON que todavía está llegando a medias.
// done = el texto del campo ya terminó (llegó la comilla de cierre).
export function partialField(src, key) {
  const m = new RegExp(`"${key}"\\s*:\\s*"`).exec(src);
  if (!m) return null;
  const ESC = { n: '\n', t: '\t', r: '', b: '', f: '', '"': '"', '\\': '\\', '/': '/' };
  let out = '';
  for (let i = m.index + m[0].length; i < src.length;) {
    const c = src[i];
    if (c === '"') return { text: out, done: true };
    if (c === '\\') {
      const n = src[i + 1];
      if (n === undefined) break;
      if (n === 'u') {
        const hex = src.slice(i + 2, i + 6);
        if (hex.length < 4) break;
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      out += ESC[n] ?? n;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return { text: out, done: false };
}

// Primera frase completa de un texto que todavía está llegando (sabemos que terminó porque ya
// empezó la siguiente). Mínimo 12 letras para no cortar en «Oh.» o «Mr.».
export function firstSentence(text) {
  const m = /^\s*([\s\S]{12,}?[.!?…])\s+\S/.exec(text);
  return m ? m[1] : null;
}

function parseJson(text) {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  throw new LlmError('La IA devolvió una respuesta que no se pudo leer.');
}

// Cuenta de tokens para que usted vea cuánto gasta, y el uso de hoy de cada proveedor.
// Solo DeepSeek suma al gasto del mes (Groq es gratis); al cruzar el 80 % o el tope avisa una vez.
export function trackUsage(u, route) {
  if (!u) return;
  let crossed = null;
  store.update(s => {
    s.usage = s.usage || { input: 0, output: 0, calls: 0 };
    s.usage.input += u.prompt_tokens || 0;
    s.usage.output += u.completion_tokens || 0;
    s.usage.calls += 1;
    const today = store.todayIso();
    const d = s.usageDay?.date === today ? s.usageDay : { date: today, groq: { calls: 0, tokens: 0 }, deepseek: { calls: 0, tokens: 0 } };
    const p = d[route.provider] || (d[route.provider] = { calls: 0, tokens: 0 });
    p.calls += 1;
    p.tokens += (u.prompt_tokens || 0) + (u.completion_tokens || 0);
    s.usageDay = d;
    if (route.provider === 'deepseek') crossed = addSpend(s, u, route.model);
  });
  if (crossed && typeof globalThis.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    globalThis.dispatchEvent(new CustomEvent('charla:spend', { detail: { level: crossed, ...spendStatus(store.get()) } }));
  }
}

// ---------- Modo demo (para probar la app sin clave) ----------
async function demo(task, messages) {
  await wait(500);
  const last = messages[messages.length - 1]?.content || '';
  switch (task) {
    case 'opening': {
      const name = (messages[0]?.content.match(/^You are ([^,]+),/) || [, 'there'])[1];
      return { reply: `Hi! I'm ${name}. Nice to meet you. How's your day going?`, mood: 0.6 };
    }
    case 'reply': {
      if (/has to leave now/.test(last)) return { reply: 'Oh, you have to go? It was really nice to chat with you. See you soon!', objectives_completed: [], mood: 0.7, affection: 1, finished: true };
      const n = messages.filter(m => m.role === 'user').length;
      const finished = n >= 6;
      return { reply: finished ? 'It was really nice talking to you. See you next time!' : pick(["Oh, nice! And how about you, what do you usually like?", "Really? That sounds interesting. Tell me more!", "Sure thing. Anything else I can help you with?"]), objectives_completed: n === 1 ? ['drink'] : n === 2 ? ['food'] : [], mood: 0.5, affection: 1, finished };
    }
    case 'analysis': {
      const said = (last.match(/Learner said: "([\s\S]*)"$/) || [, last])[1];
      const hasEs = /\b(quiero|por favor|gracias|cómo|que)\b/i.test(last);
      // Si repite una frase de la bitácora del cerebro, se marca como error conocido.
      const n = t => t.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
      const k = BITACORA.flatMap(b => b.wrong.map((w, i) => ({ b, i, w }))).find(x => n(x.w) === n(said));
      if (k) {
        const right = k.b.right[k.i] || k.b.right[0];
        return { grammar: 'SomeMistakes', appropriateness: 'Mostly', has_feedback: true, corrected: right, better: right, explanation: '(demo) Después de «if» va «had» + la forma terminada del verbo, y del otro lado «would have».', learner_move: 'Attempted', known_error: k.b.id };
      }
      // Demo: una revisión mínima de concordancia para poder probar la bitácora sin IA.
      let fixed = said;
      for (const [re, to] of [[/\b(I|you|we|they) has\b/gi, '$1 have'], [/\b(he|she|it) don't\b/gi, "$1 doesn't"], [/\b(he|she|it) have\b/gi, '$1 has']]) fixed = fixed.replace(re, to);
      if (fixed !== said) return { grammar: 'SomeMistakes', appropriateness: 'Mostly', has_feedback: true, corrected: fixed, better: fixed, explanation: "(demo) Concordancia: I/you/we/they van con have y don't; he/she/it con has y doesn't.", learner_move: 'Attempted' };
      return hasEs
        ? { grammar: 'WrongLanguage', appropriateness: 'Somewhat', has_feedback: true, corrected: "I'd like a coffee, please.", better: "Could I get a coffee, please?", explanation: 'Intenta decirlo en inglés: «I would like…» es la forma amable de pedir.', learner_move: 'Attempted' }
        : { grammar: 'MostlyCorrect', appropriateness: 'Fully', has_feedback: true, corrected: said.replace(/^i /i, 'I '), better: "I'd like a large latte, please.", explanation: 'Muy bien. Para sonar más natural puedes usar «I\'d like…» en vez de «I want…».', learner_move: 'Attempted' };
    }
    case 'explain': return { es: 'Si hubiera sabido, te habría llamado.', pieces: [
      { es: 'si', en: 'if', note: 'igual que en español' },
      { es: 'hubiera sabido', en: 'had known', note: 'algo que no pasó: «had» + la forma de «known»' },
      { es: 'habría llamado', en: 'would have called', note: 'lo que habría pasado: «would have» + «called»' }],
      en: 'If I had known, I would have called you.', tip: 'Las dos mitades hacen juego: «had known» con «would have called».' };
    case 'suggestions': return { suggestions: [{ text: "I'd like a cappuccino, please.", translation: 'Me gustaría un capuchino, por favor.' }, { text: 'What do you recommend?', translation: '¿Qué me recomiendas?' }, { text: 'How much is a muffin?', translation: '¿Cuánto cuesta un muffin?' }] };
    case 'custom_topic': return /arma|droga|sexo/i.test(last)
      ? { ok: false, reason: 'Ese tema no se puede practicar aquí. Pruebe con otra situación.' }
      : { ok: true, name: 'Devolver unos zapatos', icon: '👟', role: 'vendedor de la zapatería', description: 'Devuelve unos zapatos que te quedaron pequeños.', instruction: 'You work at a shoe store. The learner wants to return shoes that are too small. Ask for the receipt; the exact size is sold out, so offer another model or a refund.', objectives: [{ id: 'explain', text: 'Explain the problem' }, { id: 'receipt', text: 'Answer about the receipt' }, { id: 'choose', text: 'Choose a refund or an exchange' }], expressions: ["They're too small.", 'Here is the receipt.', "I'd prefer a refund."] };
    case 'custom_suggestion': return { text: 'Can I pay by card?', translation: '¿Puedo pagar con tarjeta?' };
    case 'translate': return { translation: '(demo) Traducción al español de la frase.' };
    case 'word': return { word: 'latte', phonetic: '/ˈlɑː.teɪ/', category: 'Noun', definition: 'A coffee drink made with espresso and steamed milk.', translation: 'café con leche (latte)', example: "I'll have a latte, please.", conjugation: '', level: 'A2', formality: 'neutral', usefulness: 'high' };
    case 'session_feedback': return { coach: '¡Buen trabajo! Pediste tu desayuno y te hiciste entender. Practica «I\'d like…» para pedir con más cortesía.', memory: 'The learner ordered breakfast and seemed friendly.', backstory: 'I grew up in a small town near the coast. My grandma had a bakery, and I spent every summer there.', vocab_suggestions: [{ text: "I'd like", translation: 'me gustaría', type: 'Phrase' }, { text: 'to go', translation: 'para llevar', type: 'Phrase' }] };
    case 'review': {
      let items = [];
      try { items = JSON.parse(last); } catch {}
      return { cards: items.map(it => it.family === 'meaning'
        ? { item: it.item, family: 'meaning', sentence: `I really need ${it.item} right now.`, answer: it.meaning || '(demo) significado', options: [it.meaning || '(demo) significado', 'mesa', 'correr', 'mañana'], translation: '(demo) Lo necesito ahora mismo.' }
        : it.family === 'recall'
          ? { item: it.item, family: 'recall', prompt: `(demo) Diga en inglés una frase con «${it.meaning || it.item}».`, answer: `I would like ${it.item}, please.`, hint: 'Empieza con «I would like…»' }
          : { item: it.item, family: 'completion', sentence: 'Could I have {{gap}}, please?', answer: it.item, options: [it.item, 'tomorrow', 'quickly', 'under'], hint: '(demo) Lo que guardó.', translation: '(demo) ¿Me podría dar…, por favor?' }) };
    }
    case 'juggle_create': return { title: 'Me gusta caminar', steps: [
      { kind: 'repeat', label: 'repetir igual', en: 'I like [walking] in the park.', es: 'Me gusta [caminar] en el parque.' },
      { kind: 'word', label: 'cambie la palabra', en: 'I like [running] in the park.', es: 'Me gusta [correr] en el parque.' },
      { kind: 'tense', label: 'ayer', en: 'I [walked] in the park yesterday.', es: 'Ayer [caminé] en el parque.' },
      { kind: 'tense', label: 'antes (used to)', en: 'I [used to walk] in the park.', es: '[Antes caminaba] en el parque.' },
      { kind: 'tense', label: 'mañana', en: "I['ll walk] in the park tomorrow.", es: 'Mañana [caminaré] en el parque.' },
      { kind: 'form', label: 'pregunta', en: '[Do you like] walking in the park?', es: '¿[Le gusta] caminar en el parque?' }] };
    case 'skeleton_create': return { title: 'Contar una costumbre', frame: 'I usually {action} on {day}.', slots: { action: 'lo que hace', day: 'qué día' },
      model: { en: 'I usually go swimming on Saturdays.', es: 'Normalmente voy a nadar los sábados.' },
      swaps: [{ es: 'Normalmente visito a mis papás los domingos.', en: 'I usually visit my parents on Sundays.' },
        { es: 'Normalmente cocino los viernes.', en: 'I usually cook on Fridays.' },
        { es: 'Normalmente juego fútbol los martes.', en: 'I usually play soccer on Tuesdays.' }] };
    case 'skeleton_more': {
      // Demo: rellena el esqueleto pedido con palabras de ejemplo (la IA real inventa frases según sus intereses).
      let frame = 'I wish I could {action}.';
      try { frame = JSON.parse(last).frame || frame; } catch {}
      const fills = [['cooking', 'tonight'], ['playing chess', 'on Sunday'], ['dancing', 'tomorrow']];
      return { swaps: fills.map(f => { let k = 0; const en = frame.replace(/\{[a-z0-9_]+\}/gi, () => f[k++ % 2]); return { es: `(demo) Diga: ${en}`, en }; }) };
    }
    case 'temario': return { items: [
      { es: '(demo) Ella vive aquí desde 2019.', en: 'She ___ here since 2019.', answer: 'has lived', wrong: ['lives', 'is living'], why: 'Desde 2019 hasta hoy → has + forma terminada.' },
      { es: '(demo) ¿Cuándo llegaste?', en: 'When ___ you arrive?', answer: 'did', wrong: ['have', 'do'], why: 'Cuándo pregunta por un momento exacto → did.' },
    ] };
    case 'islas': {
      // Demo: frases de ejemplo (la IA real pasa a inglés lo que escribió).
      const lines = last.split('\n').filter(Boolean);
      const en = ['I work in sales, and I talk to clients every day.', 'I usually get up at six.', 'I like my job because I learn something new every day.',
        "I'm looking for a job where I can use my English.", 'In my last job, I solved a big problem with a client.', 'In the end, the client stayed with us.'];
      return { items: lines.slice(0, 6).map((l, i) => ({ es: `(demo) ${l}`, en: en[i % en.length] })) };
    }
    case 'jam': return { good: '(demo) Habló el minuto completo y se le entendió la idea principal.',
      fixes: [{ said: 'I am agree', better: 'I agree', why: 'En inglés «estar de acuerdo» es un solo verbo: agree.' },
        { said: 'People is busy', better: 'People are busy', why: '«People» es varias personas: va con are.' }],
      version: [{ en: 'I think working from home is great.', es: 'Creo que trabajar desde la casa es genial.' },
        { en: "I save time because I don't travel.", es: 'Ahorro tiempo porque no me desplazo.' },
        { en: 'But sometimes I feel alone.', es: 'Pero a veces me siento solo.' },
        { en: 'So I go to the office once a week.', es: 'Así que voy a la oficina una vez por semana.' }],
      tip: 'Use «because» y «for example» para estirar cada idea.' };
    case 'offer': {
      const oq = (q, es, frame, start, model, why = '(demo) Quieren ver si sabe hacerlo.') => ({ q, es, why, frame, start, start_es: '(demo) Empiece así.', model, model_es: '(demo) Traducción del ejemplo.' });
      return { role: 'Customer Service Agent', company: 'Demo Corp', summary_es: '(demo) Buscan a alguien que atienda clientes por teléfono y correo. Destaque su paciencia y su experiencia resolviendo problemas.',
        questions: [
          oq('Tell me about yourself.', 'Hábleme de usted.', 'qyq', 'Sure. I\'m…', "Sure. I'm a customer service agent with three years of experience. I like helping people. Now I want to grow in a bigger team."),
          oq('Why do you want to work in customer service?', '¿Por qué quiere trabajar en servicio al cliente?', 'qyq', 'I want to work in customer service because…', 'I want to work in customer service because I enjoy solving problems. It matters because customers come back. Next, I want to learn your tools.'),
          oq('How do you handle an angry customer?', '¿Cómo maneja a un cliente enojado?', 'psb', 'When a customer is angry, I…', 'When a customer is angry, I listen first. Then I find a solution. As a result, the customer feels heard.'),
          oq('Tell me about a time you solved a difficult problem.', 'Cuénteme de una vez que resolvió un problema difícil.', 'psb', 'One time, a customer…', 'One time, a customer lost a package. I checked the system and sent a new one. In the end, he placed another order.'),
          oq('How do you organize your work when you have many tickets?', '¿Cómo organiza su trabajo cuando tiene muchos casos?', 'w5', 'When I have many tickets, I…', 'When I have many tickets, I start with the urgent ones. I check my list every hour. That way, nothing gets lost.'),
          oq('Why should we hire you?', '¿Por qué deberíamos contratarle?', 'qyq', 'You should hire me because…', 'You should hire me because I am patient and organized. That matters in this job. I am ready to start soon.'),
        ],
        words: [{ en: 'ticket', es: 'caso (de un cliente)', example: 'I closed thirty tickets yesterday.' }, { en: 'follow up', es: 'hacer seguimiento', example: 'I always follow up with the customer.' }, { en: 'refund', es: 'reembolso', example: 'I processed the refund the same day.' }],
        ask: [{ en: 'What does a typical day look like in this role?', es: '(demo) ¿Cómo es un día normal en este puesto?' }, { en: 'How do you measure success in this team?', es: '(demo) ¿Cómo miden el éxito en este equipo?' }] };
    }
    case 'diary': return { good: '(demo) Contó su día en orden y se entiende todo.',
      fixes: [{ said: 'Yesterday I go', better: 'Yesterday I went', why: 'Ayer ya pasó, así que va en pasado: go → went.' },
        { said: 'I am agree', better: 'I agree', why: 'En inglés «estar de acuerdo» es un solo verbo: agree.' }],
      corrected: 'Yesterday I went to the park with my family. I agree that walking is good for me.',
      level: 'B1', level_why: '(demo) Une ideas con because y so, pero a veces se le escapa el pasado.',
      keep: [{ en: 'Walking is good for me.', es: 'Caminar me hace bien.' }, { en: 'I went to the park with my family.', es: 'Fui al parque con mi familia.' }],
      tip: 'Mañana cuente algo que pasó y use «because» dos veces.' };
    case 'story': return { title: 'A new coworker', titleEs: '(demo) Una compañera nueva',
      lines: [{ who: 'Nina', en: 'Hi, are you the new designer?', es: 'Hola, ¿eres la diseñadora nueva?' },
        { who: 'Eva', en: 'Yes, I started today. I\'m Eva.', es: 'Sí, empecé hoy. Soy Eva.' },
        { who: 'Nina', en: 'Nice to meet you. Do you need help with anything?', es: 'Mucho gusto. ¿Necesitas ayuda con algo?' },
        { who: 'Eva', en: 'Actually, yes. Where can I get a coffee?', es: 'La verdad, sí. ¿Dónde puedo tomar un café?' },
        { who: 'Nina', en: 'There\'s a kitchen on the second floor. I\'ll show you.', es: 'Hay una cocina en el segundo piso. Te muestro.' }],
      questions: [{ q: '¿Qué busca Eva?', options: ['Un café', 'Su escritorio', 'El baño'], answer: 0 },
        { q: '¿Dónde está la cocina?', options: ['En el primer piso', 'En el segundo piso', 'Afuera'], answer: 1 },
        { q: '¿Cuándo empezó Eva?', options: ['Ayer', 'La semana pasada', 'Hoy'], answer: 2 }] };
    case 'mockFollow': return { follow: 'Can you give me a specific example of that?', es: '(demo) ¿Me puede dar un ejemplo concreto de eso?' };
    case 'mockReport': return { scores: { fluency: 62, grammar: 58, vocabulary: 60, order: 66 }, level: 'B1',
      summary: '(demo) Se le entendió todo y respondió cada pregunta. Lo que más le sube la nota ahora es cuidar los verbos en pasado.',
      strengths: ['Empieza respondiendo la pregunta', 'Da ejemplos de su trabajo'],
      fixes: [{ said: 'I am agree', better: 'I agree', why: '«Estar de acuerdo» en inglés es un solo verbo: agree.' },
        { said: 'I work there since 2020', better: 'I\'ve worked there since 2020', why: 'Si todavía sigue ahí, se dice «I\'ve worked».' }],
      answers: [{ i: 1, better_en: 'Sure. I\'m a customer service agent with four years of experience.', better_es: 'Claro. Soy agente de servicio al cliente con cuatro años de experiencia.', tip: 'Termine con por qué le interesa el puesto.' }],
      next: ['Prepare 2 historias STAR', 'Practique «I\'ve worked…»', 'Responda en 3 frases cortas'] };
    case 'levelSpeak': return { score: 62, level: 'B1', gaps: [{ es: '(demo) Contar algo que empezó antes y sigue ahora', example: 'I\'ve lived here for two years.' },
      { es: 'Unir ideas con «although», «however»', example: 'It was hard. However, I finished it.' },
      { es: 'Hablar de lo que habría pasado', example: 'If I had known, I would have called.' }],
      fixes: [{ said: 'I am agree', better: 'I agree', why: 'Es un solo verbo.' }] };
    case 'answer': return { good: '(demo) Respondió la pregunta y se le entendió la idea principal.',
      fixes: [{ said: 'I am agree', better: 'I agree', why: 'En inglés «estar de acuerdo» es un solo verbo: agree.' }],
      version: [{ en: 'After work, I usually go to the gym.', es: 'Después del trabajo, normalmente voy al gimnasio.' },
        { en: 'I go at around seven, near my house.', es: 'Voy a eso de las siete, cerca de mi casa.' },
        { en: 'It helps me relax after a long day.', es: 'Me ayuda a relajarme después de un día largo.' }],
      tip: 'Empiece siempre con las palabras de la pregunta: así no se queda en blanco.' };
    case 'grammar': {
      // Demo: siempre el mismo ejercicio de «si hubiera…, habría…» (sin IA no se analiza la frase del alumno).
      return { items: [{ es: 'Si hubiera sabido, te habría llamado.',
        en: 'If I had known, I would have called you.',
        pieces: [{ es: 'hubiera sabido', en: 'had known', wrong: ['would have known', 'have known'] },
          { es: 'habría llamado', en: 'would have called', wrong: ['would call', 'had called'] }],
        note: '(demo) Las dos mitades hacen juego: had + known con would have + called.' }] };
    }
    case 'drill_check': {
      const expected = (messages[0]?.content.match(/Expected answer: "([^"]*)"/) || [])[1];
      const ws = t => t.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);
      if (expected) {
        const e = new Set(ws(expected)), shared = ws(last).filter(w => e.has(w)).length;
        if (shared / Math.max(e.size, 1) < 0.5) return { verdict: 'wrong', kept: false, corrected: expected, natural: expected, explanation: '(demo) Esa frase no dice lo que se pedía. Compárela con la respuesta.' };
      }
      const bad = /\b(goed|thinked|i is|he have|she have|i has)\b/i.test(last);
      return !bad ? { verdict: 'correct', kept: true, corrected: last, natural: last, explanation: '' }
        : { verdict: 'almost', kept: true, corrected: last.replace(/goed/i, 'went').replace(/thinked/i, 'thought').replace(/\bi is\b/i, 'I am').replace(/\b(he|she) have\b/i, '$1 has').replace(/\bi has\b/i, 'I have'), natural: '', explanation: '(demo) Una palabra cambia de forma: revise el verbo.' };
    }
    case 'pronunciation_hint': {
      const known = { "i'd": 'aid', like: 'laik', a: 'a', cappuccino: 'ka-pu-CHI-nou', please: 'pliis', what: 'uat', do: 'du', you: 'yu', recommend: 're-ko-MEND', how: 'jau', much: 'mach', is: 'is', muffin: 'MA-fin', the: 'da', coffee: 'KO-fi', hi: 'jai', "i'm": 'aim', nice: 'nais', to: 'tu', meet: 'miit', "how's": 'jaus', your: 'yor', day: 'dei', going: 'GOU-in' };
      let tokens = [];
      try { tokens = JSON.parse(last); } catch {}
      return { hints: tokens.map(w => ({ w, say: known[w.toLowerCase().replace(/[^a-z']/g, '')] || w.toLowerCase().replace(/[^a-z']/g, '') })) };
    }
    default: return {};
  }
}
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
