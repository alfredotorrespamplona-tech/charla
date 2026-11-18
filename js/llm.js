// Cliente de DeepSeek (API compatible con OpenAI). Clave "demo" = respuestas simuladas sin gastar tokens.
import * as store from './store.js';
import { BITACORA } from './cerebro.js';
import { addSpend, spendStatus, usd } from './budget.js';

export class LlmError extends Error {}

const TIMEOUT_MS = 35000;       // redes móviles: no dejar la pantalla colgada
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const wait = ms => new Promise(r => setTimeout(r, ms));

function apiBase(s) { return (s.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, ''); }

async function request(url, init) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new LlmError('DeepSeek tardó demasiado en responder. Revise su conexión e intente otra vez.');
    throw new LlmError('No hay conexión con DeepSeek. Revise su internet.');
  } finally {
    clearTimeout(t);
  }
}

async function explain(res, model) {
  const body = await res.text().catch(() => '');
  if (res.status === 401) return new LlmError('La clave de API no es válida (401). Revísela en Ajustes.');
  if (res.status === 402) return new LlmError('Su cuenta de DeepSeek no tiene saldo (402). Recárguela en platform.deepseek.com.');
  if (res.status === 429) return new LlmError('Demasiadas solicitudes seguidas (429). Espere un momento.');
  if (res.status === 400 && /model/i.test(body)) return new LlmError(`El modelo «${model}» no existe. Cámbielo en Ajustes (use «Probar conexión» para ver los disponibles).`);
  return new LlmError(`DeepSeek respondió ${res.status}: ${body.slice(0, 160)}`);
}

// onText(textoAcumulado): si se pasa, la respuesta llega por partes (stream) y se avisa a medida que llega.
// Así el personaje empieza a hablar con la primera frase, sin esperar la respuesta completa.
export async function chatJson(task, messages, { temperature = 0.8, maxTokens = 500, onText = null } = {}) {
  const s = store.get().settings;
  if (!s.apiKey) throw new LlmError('Falta la clave de API de DeepSeek. Póngala en Ajustes.');
  if (s.apiKey.trim().toLowerCase() === 'demo') {
    const r = await demo(task, messages);
    if (onText) await fakeStream(JSON.stringify(r), onText);
    return r;
  }
  // Si DeepSeek no acepta la respuesta por partes, se pide entera (como antes) y sigue funcionando igual.
  let stream = !!onText && typeof ReadableStream !== 'undefined';

  // Tope de gasto con pausa activada: no se llama a la IA hasta el mes siguiente.
  const spend = spendStatus(store.get());
  if (s.capBlock && spend.level === 'over') throw new LlmError(`Llegó a su tope de gasto de este mes (${usd(spend.usd)} de ${usd(spend.cap)}). Súbalo en Ajustes o espere al próximo mes.`);
  const model = s.model || 'deepseek-flash';
  // deepseek-flash (V4.1) «piensa» antes de contestar y ese razonamiento gasta max_tokens: las respuestas
  // largas se cortaban sin JSON. Aquí no hace falta pensar (son tareas cortas con formato fijo), así que se apaga:
  // responde en la mitad del tiempo y con muchos menos tokens.
  let thinking = true;          // se quita si el modelo elegido no acepta el parámetro
  let budget = maxTokens;
  for (let round = 0; round < 3; round++) {
    const body = { model, messages, temperature, max_tokens: budget, response_format: { type: 'json_object' }, stream };
    if (stream) body.stream_options = { include_usage: true };
    if (thinking) body.thinking = { type: 'disabled' };
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.apiKey.trim() }, body: JSON.stringify(body) };
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { res = await request(apiBase(s) + '/chat/completions', init); }
      catch (e) {
        // Red móvil que se cae un momento: un reintento antes de rendirse (no si se agotó el tiempo).
        if (attempt === 0 && !/tardó/.test(e.message)) { await wait(1200); continue; }
        throw e;
      }
      if (!RETRY_STATUS.has(res.status) || attempt === 2) break;
      await wait(1200 * (attempt + 1));   // el servidor está ocupado: esperar y reintentar
    }
    if (res.status === 400 && thinking) {
      const err = await res.clone().text().catch(() => '');
      if (/thinking/i.test(err)) { thinking = false; continue; }
    }
    if (res.status === 400 && stream) { stream = false; round--; continue; }
    if (!res.ok) throw await explain(res, model);
    let text, finish;
    if (stream && res.body) {
      let r;
      let heard = false;
      try { r = await readStream(res, t => { heard = true; onText(t); }); }
      catch (e) {
        if (heard) throw e;                 // ya empezó a hablar: no se puede repetir a medias
        stream = false; round--; continue;  // falló antes de llegar nada: se pide entera
      }
      trackUsage(r.usage, model);
      ({ text, finish } = r);
    } else {
      const data = await res.json();
      trackUsage(data.usage, model);
      const choice = data.choices?.[0];
      text = choice?.message?.content || '';
      finish = choice?.finish_reason;
    }
    if (finish === 'length' && round < 2) { budget = Math.min(budget * 2 + 400, 8000); continue; }   // se cortó: más espacio
    if (!text && finish === 'length') throw new LlmError('La respuesta de la IA quedó cortada. Intente otra vez.');
    return parseJson(text);
  }
  throw new LlmError('La respuesta de la IA quedó cortada. Intente otra vez.');
}

// Ajustes → «Probar conexión»: valida la clave y devuelve los modelos disponibles.
export async function testConnection() {
  const s = store.get().settings;
  if (!s.apiKey) throw new LlmError('Escriba primero su clave.');
  if (s.apiKey.trim().toLowerCase() === 'demo') return ['deepseek-flash (modo demo)'];
  const res = await request(apiBase(s) + '/models', { headers: { Authorization: 'Bearer ' + s.apiKey.trim() } });
  if (!res.ok) throw await explain(res, s.model);
  const data = await res.json();
  return (data.data || []).map(m => m.id);
}

// Lee una respuesta por partes (Server-Sent Events: líneas «data: {...}») y junta el texto.
export async function readStream(res, onText) {
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
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { line(buf.slice(0, i)); buf = buf.slice(i + 1); }
    }
  } catch {
    throw new LlmError('Se cortó la conexión con DeepSeek. Revise su internet.');
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

// Cuenta de tokens para que usted vea cuánto gasta.
// También suma el gasto del mes; al cruzar el 80 % o el tope avisa una vez (la app lo muestra con un aviso).
function trackUsage(u, model) {
  if (!u) return;
  let crossed = null;
  store.update(s => {
    s.usage = s.usage || { input: 0, output: 0, calls: 0 };
    s.usage.input += u.prompt_tokens || 0;
    s.usage.output += u.completion_tokens || 0;
    s.usage.calls += 1;
    crossed = addSpend(s, u, model);
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
