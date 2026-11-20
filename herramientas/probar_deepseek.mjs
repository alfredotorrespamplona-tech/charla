// Prueba en vivo de cada llamada a la IA que hace Charla, con sus mismos prompts y parámetros.
// Las claves llegan por variables de entorno (no se guardan en ningún archivo): GROQ_KEY (Groq, gratis, se usa
// primero) y/o DEEPSEEK_KEY (DeepSeek, unos 16 000 tokens = centavos). GROQ_MODEL elige el modelo de Groq.
// Desde la carpeta charla, en PowerShell:
//   $env:GROQ_KEY = "gsk_..."; node herramientas/probar_deepseek.mjs
//   $env:DEEPSEEK_KEY = "sk-..."; node herramientas/probar_deepseek.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mod = f => import(pathToFileURL(join(ROOT, 'js', f)).href);
const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
globalThis.window = {};

const store = await mod('store.js');
const { chatJson, testConnection } = await mod('llm.js');
const P = await mod('prompts.js');
const D = await mod('drills.js');
const data = await mod('data.js');
const { customTopicMessages } = await mod('customtopics.js');

if (!process.env.DEEPSEEK_KEY && !process.env.GROQ_KEY) { console.error('Falta GROQ_KEY o DEEPSEEK_KEY'); process.exit(2); }
store.update(s => {
  s.settings.apiKey = process.env.DEEPSEEK_KEY || '';
  s.settings.groqKey = process.env.GROQ_KEY || '';
  if (process.env.GROQ_MODEL) s.settings.groqModel = process.env.GROQ_MODEL;
  s.rank = 2; s.interests = ['Cooking', 'Soccer'];
});

const results = [];
const short = v => JSON.stringify(v).slice(0, 420);
async function run(name, fn, check) {
  const t0 = Date.now();
  try {
    const out = await fn();
    const problems = check ? check(out) : [];
    results.push({ name, ok: !problems.length, ms: Date.now() - t0, problems });
    console.log(`\n${problems.length ? '✖' : '✔'} ${name} (${Date.now() - t0} ms)${problems.length ? '  → ' + problems.join('; ') : ''}\n  ${short(out)}`);
    return out;
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t0, problems: [e.message] });
    console.log(`\n✖ ${name} (${Date.now() - t0} ms) ERROR: ${e.message}`);
    return null;
  }
}
const need = (o, keys) => keys.filter(k => o?.[k] == null || o[k] === '').map(k => `falta «${k}»`);

// 0. Conexión y modelo configurado
const groq = !!process.env.GROQ_KEY;
const models = await run('conexión y modelos', () => (groq ? testConnection('groq', process.env.GROQ_KEY) : testConnection('deepseek', process.env.DEEPSEEK_KEY)),
  m => (Array.isArray(m) && m.length ? [] : ['sin modelos']));
const model = groq ? store.get().settings.groqModel : store.get().settings.model;
if (models && !models.includes(model)) console.log(`\n⚠ El modelo configurado «${model}» no está en la lista: ${models.join(', ')}`);

// 1. Charla: apertura, respuesta, análisis, despedida
const place = data.PLACES[0], character = data.CHARACTERS[place.characters[0]], mission = place.missions[0];
const rel = { level: 0, memory: [], facts: {} };
const system = P.characterSystem({ character, place, mission, rankId: 2, rel, learnerName: 'Prueba', learner: { interests: ['Cooking'] } });
const opening = await run('opening (saludo del personaje)', () => chatJson('opening', [{ role: 'system', content: system }, { role: 'user', content: P.openingUser() }], { maxTokens: 200 }), o => need(o, ['reply']));
const history = [{ role: 'character', text: opening?.reply || 'Hi! What can I get you?' }, { role: 'learner', text: 'Hi, I want a coffee with milk and a croissant please' }];
const base = () => [{ role: 'system', content: system }, ...history.map(m => ({ role: m.role === 'character' ? 'assistant' : 'user', content: m.role === 'character' ? JSON.stringify({ reply: m.text }) : m.text }))];
const reply = await run('reply (respuesta del personaje)', () => chatJson('reply', base(), { maxTokens: 260 }), o => [...need(o, ['reply']), ...(Array.isArray(o.objectives_completed) ? [] : ['objectives_completed no es lista'])]);
const analysis = await run('analysis (corrección del turno)', () => chatJson('analysis', P.analysisMessages({ characterLine: history[0].text, learnerLine: 'Yesterday I go to the market and buyed apples', rankId: 2, strictness: 'Normal', mission }), { temperature: 0.2, maxTokens: 320 }),
  o => [...need(o, ['grammar', 'corrected', 'explanation']), ...(/went/.test(o.corrected || '') ? [] : ['no corrigió «go → went»'])]);
const bitErr = P.knownErrors()[0];
if (bitErr) await run('analysis con error de su bitácora (known_error)', () => chatJson('analysis', P.analysisMessages({ characterLine: 'What happened?', learnerLine: bitErr.wrong[0], rankId: 2, strictness: 'Normal', mission }), { temperature: 0.2, maxTokens: 320 }),
  o => (o.known_error ? [] : [`no marcó known_error (dijo: ${bitErr.wrong[0]})`]));
await run('explain (❓ No entiendo, método Bolen)', () => chatJson('explain', P.explainMessages({ original: 'If I would know, I would call you', corrected: 'If I had known, I would have called you.', explanation: 'Use had known.' }), { temperature: 0.3, maxTokens: 500 }),
  o => [...need(o, ['es', 'en']), ...(Array.isArray(o.pieces) && o.pieces.length ? [] : ['sin piezas'])]);
history.push({ role: 'character', text: reply?.reply || 'Sure!' });
await run('goodbye (👋 despedirse)', () => chatJson('reply', [...base(), { role: 'user', content: P.goodbyeUser() }], { maxTokens: 200 }), o => [...need(o, ['reply']), ...(o.finished === true ? [] : ['finished no es true'])]);
await run('suggestions (💡 ideas)', () => chatJson('suggestions', P.suggestionMessages({ history, rankId: 2, mission }), { temperature: 0.7, maxTokens: 300 }),
  o => (Array.isArray(o.suggestions) && o.suggestions.length && o.suggestions.every(s => s.text && s.translation) ? [] : ['sugerencias incompletas']));
await run('custom_suggestion (🔁 ¿cómo se dice?)', () => chatJson('custom_suggestion', P.customSuggestionMessages({ history, rankId: 2, spanish: 'quiero pagar con tarjeta' }), { temperature: 0.3, maxTokens: 150 }), o => need(o, ['text', 'translation']));
await run('translate (🌐 traducir)', () => chatJson('translate', P.translateMessages('Would you like anything else with that?'), { temperature: 0.2, maxTokens: 200 }), o => need(o, ['translation']));
await run('pronunciation_hint (pistas)', () => chatJson('pronunciation_hint', P.pronunciationHintMessages(['Would', 'you', 'like', 'a', 'croissant?']), { temperature: 0.1, maxTokens: 60 + 5 * 14 }),
  o => (Array.isArray(o.hints) && o.hints.length === 5 ? [] : [`pistas: ${o.hints?.length}`]));
await run('word (explorador de palabras)', () => chatJson('word', P.wordMessages('croissant', 'I want a croissant'), { temperature: 0.2, maxTokens: 300 }), o => need(o, ['definition', 'translation', 'level', 'formality']));
await run('session_feedback (coach final)', () => chatJson('session_feedback', P.sessionFeedbackMessages({ history, character, mission, rankId: 2, analyses: [analysis ? { ...analysis, original: 'Yesterday I go to the market and buyed apples', has_feedback: true } : null], discovery: { key: 'childhood', en: 'one memory from your childhood' } }), { temperature: 0.5, maxTokens: 700 }),
  o => need(o, ['coach', 'memory', 'backstory']));
await run('custom_topic (tema propio)', () => chatJson('custom_topic', customTopicMessages({ text: 'Devolver un celular que salió dañado', character, place, rankId: 2 }), { temperature: 0.4, maxTokens: 600 }),
  o => (o.ok === false ? [`rechazado: ${o.reason}`] : need(o, ['name', 'instruction', 'objectives'])));
await run('review (tarjetas del repaso)', () => chatJson('review', P.reviewMessages([{ text: 'to go', translation: 'para llevar', family: 'meaning' }, { text: "I'd like", translation: 'me gustaría', family: 'completion' }, { text: 'the check', translation: 'la cuenta', family: 'recall' }], 2), { temperature: 0.6, maxTokens: 1600 }),
  o => (o.cards?.length === 3 ? [] : [`tarjetas: ${o.cards?.length}`]));

// 2. Taller de frases
const jg = await run('juggle_create (desde una idea en español)', () => chatJson('juggle_create', P.juggleCreateMessages('Me gusta cocinar los domingos con mi familia', 2), { temperature: 0.5, maxTokens: 900 }),
  o => [...(D.validJuggle(o) ? [] : ['no pasa validJuggle']), ...((o.steps || []).slice(1).filter(s => !/\[.+\]/.test(s.en)).map(s => `sin [pieza]: ${s.en}`))]);
if (jg) console.log('   pasos:', jg.steps.map(s => `${s.label}: ${s.en}`).join(' | '));
const sk = await run('skeleton_create (desde una frase)', () => chatJson('skeleton_create', P.skeletonCreateMessages("I'm so tired of waiting for the bus every morning", 2, ['Cooking', 'Soccer']), { temperature: 0.5, maxTokens: 700 }),
  o => [...(D.validSkeleton(o) ? [] : ['no pasa validSkeleton']), ...((o.swaps || []).filter(s => !D.keepsFrame(o.frame, s.en)).map(s => `cambio sin esqueleto: ${s.en}`))]);
if (sk) console.log('   esqueleto:', sk.frame, '|', sk.swaps.map(s => s.en).join(' | '));
const wish = D.SKELETONS.find(s => s.id === 'sk-wish');
await run('skeleton_more (✨ 3 cambios nuevos)', () => chatJson('skeleton_more', P.skeletonMoreMessages(wish, 2, ['Cooking', 'Soccer'], wish.swaps.map(s => s.en)), { temperature: 0.8, maxTokens: 500 }),
  o => { const ok = (o.swaps || []).filter(s => s?.es && s?.en && D.keepsFrame(wish.frame, s.en)); return ok.length >= 2 ? [] : [`solo ${ok.length} usan el esqueleto: ${short(o.swaps)}`]; });

const how = D.SKELETONS.find(s => s.id === 'sk-how-about');
const chk = (name, args, expect) => run(`drill_check: ${name}`, () => chatJson('drill_check', P.drillCheckMessages({ rankId: 2, ...args }), { temperature: 0.2, maxTokens: 350 }),
  o => (expect.includes(o.verdict) ? [] : [`veredicto «${o.verdict}», se esperaba ${expect.join('/')}`]));
await chk('otra forma correcta', { mode: 'skeleton', frame: how.frame, es: '¿Qué tal si comemos pizza el viernes?', target: 'How about having pizza on Friday?', attempt: 'how about eating pizza on friday' }, ['correct']);
await chk('error de tiempo', { mode: 'juggle', base: 'I take the bus to work.', es: 'Ayer tomé el bus para ir al trabajo.', target: 'I took the bus to work yesterday.', attempt: 'I take the bus to work yesterday' }, ['almost', 'wrong']);
await chk('no dice lo pedido', { mode: 'skeleton', frame: how.frame, es: '¿Qué tal si nos vemos mañana?', target: 'How about meeting tomorrow?', attempt: 'I like pizza' }, ['wrong']);
await chk('juggle libre bien hecho', { mode: 'juggle', base: "I'm really into cooking.", attempt: "I'm really into soccer" }, ['correct', 'almost']);
await chk('esqueleto libre con error', { mode: 'skeleton', frame: wish.frame, attempt: 'I wish I could to travel more' }, ['almost', 'wrong']);

// Gramática por piezas (método de Pablo Bolen): ejercicios nuevos de una lección y «Su frase».
const Gr = await import(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'grammar.js')).href);
const lessonIf3 = Gr.lessonById('g-if3');
await run('grammar (✨ 5 más de una lección)', () => chatJson('grammar', P.grammarMessages({ lesson: lessonIf3, count: 5, rankId: 2, done: lessonIf3.exercises.map(x => x.es) }), { temperature: 0.7, maxTokens: 1400 }),
  o => { const ok = (o.items || []).map(Gr.validExercise).filter(Boolean); return ok.length >= 4 ? [] : [`solo ${ok.length} ejercicios válidos: ${short(o.items)}`]; });
await run('grammar (Su frase en piezas)', () => chatJson('grammar', P.grammarMessages({ sentence: 'Si hubiera tenido tiempo, habría ido al gimnasio.', rankId: 2 }), { temperature: 0.3, maxTokens: 700 }),
  o => { const x = Gr.validExercise(o.items?.[0]); return x && x.pieces.length >= 2 ? [] : [`no se partió bien: ${short(o.items)}`]; });

const ok = results.filter(r => r.ok).length;
console.log(`\n==== ${ok}/${results.length} bien · ${Math.round(results.reduce((a, r) => a + r.ms, 0) / 1000)} s en total`);
const u = store.get().usage;
if (u) console.log(`Tokens: ${u.input} de entrada, ${u.output} de salida, ${u.calls} llamadas`);
const day = store.get().usageDay;
if (day) console.log(`Por proveedor: Groq ${day.groq.calls} llamadas · DeepSeek ${day.deepseek.calls} llamadas · pausas de Groq: ${JSON.stringify(store.get().groqPause || {})}`);
for (const r of results.filter(r => !r.ok)) console.log(`  ✖ ${r.name}: ${r.problems.join('; ')}`);
