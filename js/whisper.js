// Voz a texto con Whisper de Groq (gratis con la misma clave de Groq). El reconocedor del teléfono «arregla» lo
// que uno dice mal («I goed» sale «I go»), y así la corrección nunca ve el error. Whisper escribe lo que dijo
// de verdad, con sus errores. Graba con el micrófono, detecta solo cuándo se calla y, al terminar, manda el
// audio a Groq. Si no hay clave de Groq, está en modo demo o Groq llegó a su límite, se usa el del teléfono.
import * as store from './store.js';
import { GROQ_BASE, hourText, retryAfterMs } from './llm.js';

// Modelos de voz a texto de Groq, en orden (si uno deja de existir se prueba el otro).
export const WHISPER_MODELS = ['whisper-large-v3-turbo', 'whisper-large-v3'];
const nav = globalThis.navigator;
export const canRecord = typeof globalThis.MediaRecorder !== 'undefined' && !!nav?.mediaDevices?.getUserMedia;
const TIMEOUT_MS = 30000;
const MAX_MS = 180000;           // tope de una grabación (3 min), por si nadie la detiene
const TICK_MS = 50;
const CALIBRATE_MS = 350;        // primero mide el ruido del lugar para saber qué es voz
const SPEECH_FRAMES = 3;         // 150 ms seguidos de voz = empezó a hablar

// Guía de estilo para Whisper: con muletillas y errores, para que escriba tal cual y no «limpie» la frase.
export const VERBATIM_PROMPT = 'Um, so, I was, like... yesterday I go to the store, and, uh, I buy two apple. Hmm, she don\'t like it.';

const keyOf = s => String(s?.groqKey || '').trim();

// ¿Se usa Whisper ahora? Ajustes → «Pasar su voz a texto con Whisper» (encendido si hay clave de Groq).
export function whisperOn(st = store.get(), now = Date.now(), recordable = canRecord) {
  const k = keyOf(st.settings);
  return recordable && st.settings.whisper !== false && !!k && k.toLowerCase() !== 'demo' && !((st.groqPause || {}).whisper > now);
}

// Por qué no se usa (para Ajustes).
export function whisperStatus(st = store.get(), now = Date.now(), recordable = canRecord) {
  const k = keyOf(st.settings);
  if (!recordable) return 'Este navegador no deja grabar audio: se usa el reconocedor del teléfono.';
  if (!k) return 'Necesita su clave de Groq (arriba). Mientras tanto se usa el reconocedor del teléfono.';
  if (k.toLowerCase() === 'demo') return 'En modo demo se usa el reconocedor del teléfono.';
  if (st.settings.whisper === false) return 'Apagado: se usa el reconocedor del teléfono (más rápido, pero corrige sus errores sin avisar).';
  const until = (st.groqPause || {}).whisper;
  if (until > now) return `Groq llegó a su límite de voz a texto. Vuelve a las ${hourText(until)}; mientras, se usa el del teléfono.`;
  return 'Encendido: lo que dice se escribe tal cual, con errores incluidos, para que la corrección los vea.';
}

// El audio más cómodo que sepa grabar este navegador (Groq acepta webm, mp4, ogg…).
export function pickMime(isOk) {
  isOk = isOk || (t => globalThis.MediaRecorder?.isTypeSupported?.(t));
  for (const [type, ext] of [['audio/webm;codecs=opus', 'webm'], ['audio/webm', 'webm'], ['audio/mp4', 'm4a'], ['audio/ogg;codecs=opus', 'ogg']])
    if (isOk(type)) return { type, ext };
  return { type: '', ext: 'webm' };
}

// Whisper a veces «oye» frases de relleno en un audio casi vacío. Si fue muy corto y salió solo eso, no cuenta.
const GHOSTS = /^(thank you|thanks|thanks for watching|bye|you|okay|so)[.!]*$/i;
export function cleanTranscript(text, speechMs = 9999) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (speechMs < 1500 && GHOSTS.test(t)) return '';
  return t;
}

// Volumen (0..1) de un trozo de audio.
export function rms(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / Math.max(1, buf.length));
}
// Umbral de voz según el ruido del lugar. El ruido de un cuarto no pasa de ~0.02: si mide más es que ya estaba
// hablando, así que el umbral nunca sube tanto como para no oír su voz.
export const NOISE_CAP = 0.02;
export const speechThreshold = floor => Math.max(0.008, Math.min(floor, NOISE_CAP) * 3);   // 0,008: con la supresión de ruido de Android la voz llega bajita

const BARS = '▁▂▃▄▅▆▇';
const meter = level => BARS[Math.min(BARS.length - 1, Math.floor(level * 60))];
const clock = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function pauseWhisper(ms, now = Date.now()) {
  store.update(s => { s.groqPause = { ...(s.groqPause || {}), whisper: now + Math.max(30000, ms) }; });
}

// Manda el audio a Groq y devuelve el texto.
export async function transcribe(blob, { lang = 'en-US', ext = 'webm', fetchFn = globalThis.fetch, st = store.get() } = {}) {
  const key = keyOf(st.settings);
  let last = null;
  for (const model of WHISPER_MODELS) {
    const form = new FormData();
    form.append('file', blob, 'voz.' + ext);
    form.append('model', model);
    form.append('language', String(lang || 'en').slice(0, 2));
    form.append('temperature', '0');
    form.append('response_format', 'json');
    form.append('prompt', VERBATIM_PROMPT);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res;
    try { res = await fetchFn(GROQ_BASE + '/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: form, signal: ctrl.signal }); }
    catch (e) {
      throw new Error(e.name === 'AbortError' ? 'Groq tardó demasiado en pasar su voz a texto. Dígalo otra vez.' : 'No hay conexión para pasar su voz a texto. Revise su internet y dígalo otra vez.');
    } finally { clearTimeout(t); }
    if (res.ok) {
      const data = await res.json();
      store.update(x => {   // cuántas veces se usó hoy (Ajustes lo muestra junto al uso de la IA)
        const today = store.todayIso();
        if (x.usageDay?.date !== today) x.usageDay = { date: today, groq: { calls: 0, tokens: 0 }, deepseek: { calls: 0, tokens: 0 } };
        x.usageDay.whisper = (x.usageDay.whisper || 0) + 1;
      });
      return String(data.text || '');
    }
    const body = await res.text().catch(() => '');
    if (res.status === 429) {
      const ms = retryAfterMs(res, body);
      pauseWhisper(ms);
      throw new Error(`Groq llegó a su límite de voz a texto. Hasta las ${hourText(Date.now() + Math.max(30000, ms))} uso el micrófono del teléfono: dígalo otra vez.`);
    }
    if (res.status === 401) throw new Error('La clave de Groq no es válida (401). Revísela en Ajustes.');
    if ((res.status === 400 || res.status === 404) && /model/i.test(body)) { last = new Error(`Groq no tiene el modelo ${model}.`); continue; }
    throw new Error(`Groq no pudo pasar su voz a texto (${res.status}). Dígalo otra vez.`);
  }
  pauseWhisper(3600000);
  throw last || new Error('Groq no pudo pasar su voz a texto.');
}

// Igual que el reconocedor del teléfono (speech.js → Listener): start() devuelve { text, durationMs }.
// Mientras graba, onInterim muestra el tiempo y el volumen (el texto llega al terminar).
// «Grabarse y compararse» (v45) pide además el audio: keepAudio devuelve { audio, recordedMs }, y con
// transcribeAudio: false solo graba (sin clave de Groq no hay texto, pero se puede oír igual).
// v46.1: lo grabado no se bota. Si toca «Listo» se pasa a texto aunque el medidor no haya notado su voz,
// y si el medidor no oye nada (en algunos Android queda en cero) graba hasta que toque «Listo».
export const DEAF_MS = 1500;          // si en 1,5 s el medidor no marcó nada de nada, no sirve: se ignora
export const DEAF_LEVEL = 0.0005;
export const HEARD_LEVEL = 0.003;     // algo de sonido hubo (para no mandar a Groq un audio mudo)

// Qué hacer con lo grabado al terminar. heard = el medidor notó su voz; manual = tocó «Listo».
export function afterRecording({ aborted = false, chunks = 0, heard = false, manual = false, deaf = false, maxLevel = 0, recordedMs = 0, speechMs = 0 } = {}) {
  if (aborted || !chunks) return { send: false };
  if (heard) return { send: true, durationMs: speechMs, ghostMs: speechMs };
  // No notó su voz: si tocó «Listo», si el medidor está sordo o si hubo algo de sonido, se manda igual
  // (Whisper dirá si había palabras; las frases fantasma de un audio vacío se quitan).
  if (recordedMs >= 600 && (manual || deaf || maxLevel >= HEARD_LEVEL)) return { send: true, durationMs: recordedMs, ghostMs: 1000 };
  return { send: false };
}

export class WhisperListener {
  // deps (para las pruebas): getUserMedia, MediaRecorder, AudioContext, transcribe, isTypeSupported, tickMs.
  constructor(deps = {}) {
    this.deps = deps;
    this.active = false; this.end = null; this.cancel = null;
  }

  start({ lang = 'en-US', onInterim, firstWordMs = 20000, pauseMs = 3000, keepAudio = false, transcribeAudio = true, maxMs = MAX_MS } = {}) {
    const d = this.deps;
    const getUserMedia = d.getUserMedia || (c => nav.mediaDevices.getUserMedia(c));
    const Recorder = d.MediaRecorder || globalThis.MediaRecorder;
    const AC = 'AudioContext' in d ? d.AudioContext : (globalThis.AudioContext || globalThis.webkitAudioContext);
    const toText = d.transcribe || transcribe;
    const tick = d.tickMs || TICK_MS;
    return new Promise((resolve, reject) => {
      let stream = null, ctx = null, rec = null, timer = null, done = false, aborted = false, manual = false, deaf = false;
      let floor = 0, calib = 0, calibN = 0, run = 0, firstSpeechAt = 0, lastSpeechAt = 0, maxLevel = 0;
      const chunks = [];
      const startedAt = performance.now();
      const mime = pickMime(d.isTypeSupported);
      // El medidor de volumen se crea ya, en el mismo toque: si se crea después, Android lo deja en pausa y mide cero.
      try { if (AC) { ctx = new AC(); ctx.resume?.()?.catch?.(() => {}); } } catch { ctx = null; }
      const release = () => {
        clearInterval(timer);
        try { stream?.getTracks().forEach(t => t.stop()); } catch {}
        try { ctx?.close?.(); } catch {}
        this.active = false; this.end = null; this.cancel = null;
      };
      const fail = err => { if (done) return; done = true; release(); reject(err); };
      const finish = async () => {
        release();
        const recordedMs = Math.round(performance.now() - startedAt);
        const speechMs = firstSpeechAt ? Math.max(500, lastSpeechAt - firstSpeechAt + 600) : 0;
        const plan = afterRecording({ aborted, chunks: chunks.length, heard: !!firstSpeechAt, manual, deaf, maxLevel, recordedMs, speechMs });
        if (!plan.send) return resolve({ text: '', durationMs: 0 });
        const blob = new Blob(chunks, { type: mime.type || 'audio/webm' });
        const kept = keepAudio ? { audio: blob, recordedMs, speechMs: plan.durationMs } : {};
        if (!transcribeAudio) return resolve({ text: '', durationMs: plan.durationMs, ...kept });
        onInterim?.('⏳ Pasando su voz a texto…');
        try {
          const text = cleanTranscript(await toText(blob, { lang, ext: mime.ext }), plan.ghostMs);
          resolve({ text, durationMs: text ? plan.durationMs : 0, whisper: true, ...kept });
        } catch (e) {
          if (keepAudio) resolve({ text: '', durationMs: plan.durationMs, error: e.message, ...kept });   // la grabación no se pierde
          else reject(e);
        }
      };
      const close = () => {
        if (done) return;
        done = true;
        clearInterval(timer);
        if (rec && rec.state !== 'inactive') { rec.onstop = finish; try { rec.stop(); } catch { finish(); } }
        else finish();
      };
      this.end = () => { manual = true; close(); };
      this.cancel = () => { aborted = true; close(); };
      this.active = true;

      getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(s => {
        stream = s;
        if (done) { release(); return; }
        rec = new Recorder(s, mime.type ? { mimeType: mime.type } : undefined);
        rec.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
        rec.start(250);
        let an = null, buf = null;
        if (ctx) {
          try {
            if (ctx.state === 'suspended') ctx.resume?.()?.catch?.(() => {});
            an = ctx.createAnalyser();
            an.fftSize = 1024;
            buf = new Float32Array(an.fftSize);
            ctx.createMediaStreamSource(s).connect(an);
          } catch { an = null; }
        }
        if (!an) deaf = true;
        timer = setInterval(() => {
          const now = performance.now(), el = now - startedAt;
          let level = 0;
          if (an) { an.getFloatTimeDomainData(buf); level = rms(buf); }
          if (level > maxLevel) maxLevel = level;
          // Medidor en cero todo el rato: no oye (pasa en algunos Android). Se graba hasta que toque «Listo».
          if (an && !deaf && !firstSpeechAt && el > DEAF_MS && maxLevel < DEAF_LEVEL) deaf = true;
          if (deaf) {
            onInterim?.(`🎤 Grabando ${clock(el)}  ·  hable y toque ⏹ (o el micrófono) cuando termine`);
            if (el > maxMs) close();
            return;
          }
          // Los primeros instantes miden el ruido del lugar (solo lo que suena a ruido, no su voz).
          if (el < CALIBRATE_MS && level < NOISE_CAP) { calib += level; calibN++; floor = calib / calibN; }
          if (level > speechThreshold(floor)) {
            if (++run >= SPEECH_FRAMES && !firstSpeechAt) firstSpeechAt = now - SPEECH_FRAMES * tick;
            if (run >= SPEECH_FRAMES || firstSpeechAt) lastSpeechAt = now;
          } else run = 0;
          onInterim?.(`🎤 Grabando ${clock(el)} ${meter(level)}  ·  ${firstSpeechAt ? 'al callarse se pasa a texto (o toque ⏹)' : 'hable cuando quiera y toque ⏹ al terminar'}`);
          if (el > maxMs) close();
          else if (firstSpeechAt && now - lastSpeechAt > pauseMs) close();
          else if (!firstSpeechAt && el > firstWordMs) { if (maxLevel < DEAF_LEVEL) deaf = true; else close(); }
        }, tick);
      }).catch(e => fail(new Error(e?.name === 'NotAllowedError' ? 'Permiso de micrófono denegado. Actívelo en el candado de la barra de dirección.'
        : e?.name === 'NotFoundError' ? 'No se encontró micrófono, o lo está usando otra app.' : 'No se pudo abrir el micrófono: ' + (e?.message || e))));
    });
  }

  stop() { this.end?.(); }
  abort() { this.cancel?.(); }
}
