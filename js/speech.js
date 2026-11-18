// Voz: reconocimiento (voz → texto) y lectura (texto → voz) usando lo que ya trae el teléfono. Gratis.
import * as store from './store.js';
import { naturalReady, speakNatural, stopNatural, naturalVoiceFor } from './natural-voice.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
export const canSpeak = 'speechSynthesis' in window;
export const IS_ANDROID = /Android/i.test(navigator.userAgent || '');

// Espera antes de dar el turno por terminado: más larga mientras no ha empezado a hablar (está pensando).
export const WAIT_FIRST_WORD_MS = 8000;
export const WAIT_AFTER_SPEECH_MS = 1600;

const MESSAGES = {
  'not-allowed': 'Permiso de micrófono denegado. Actívelo en el candado de la barra de dirección.',
  'service-not-allowed': 'Este navegador no deja usar el reconocimiento de voz. En Android abra la app en Chrome.',
  'audio-capture': 'No se encontró micrófono, o lo está usando otra app.',
  'network': 'El reconocimiento de voz necesita internet. Revise la conexión.',
  'language-not-supported': 'El teléfono no reconoce voz en este idioma.',
};

// Une los resultados finales del reconocimiento. Android Chrome, en modo continuo, a veces repite en cada
// resultado todo lo dicho antes ("I want" + "I want a coffee"); en ese caso se queda con el más completo.
export function joinResults(parts, dedupe = IS_ANDROID) {
  let out = '';
  for (const raw of parts) {
    const t = raw.trim();
    if (!t) continue;
    const a = out.toLowerCase(), b = t.toLowerCase();
    if (dedupe && a && b.startsWith(a)) out = t;
    else if (dedupe && a.endsWith(b)) continue;
    else out = out ? out + ' ' + t : t;
  }
  return out;
}

// ---------- Escuchar ----------
export class Listener {
  constructor() {
    this.rec = null;
    this.active = false;
  }

  // Devuelve { text, durationMs } cuando el usuario termina (silencio o stop()).
  start({ lang, onInterim }) {
    return new Promise((resolve, reject) => {
      if (!SR) return reject(new Error('Este navegador no reconoce voz. Use Chrome en Android o escriba.'));
      const rec = new SR();
      this.rec = rec;
      rec.lang = lang || 'en-US';
      rec.interimResults = true;
      rec.continuous = true;      // seguimos escuchando hasta que suelte el botón o haya silencio largo
      rec.maxAlternatives = 1;
      let finalText = '';
      let lastInterim = '';
      let firstSpeechAt = 0;
      let lastSpeechAt = 0;
      let silenceTimer = null;
      const armSilence = () => {
        clearTimeout(silenceTimer);
        // Silencio = fin del turno. Antes de la primera palabra se espera más (está pensando la respuesta).
        silenceTimer = setTimeout(() => { try { rec.stop(); } catch {} }, firstSpeechAt ? sendPauseMs() : WAIT_FIRST_WORD_MS);
      };
      rec.onresult = e => {
        const now = performance.now();
        if (!firstSpeechAt) firstSpeechAt = now;
        lastSpeechAt = now;
        const finals = [];
        let interim = '';
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finals.push(r[0].transcript);
          else interim = r[0].transcript;
        }
        finalText = joinResults(finals);
        lastInterim = interim;
        onInterim?.(joinResults([finalText, interim]));
        armSilence();
      };
      rec.onerror = e => {
        clearTimeout(silenceTimer);
        this.active = false;
        // Si alcanzó a decir algo, se envía igual (la grabación se cortó).
        const said = joinResults([finalText, lastInterim]).trim();
        if (said) resolve({ text: said, durationMs: firstSpeechAt ? Math.max(500, lastSpeechAt - firstSpeechAt + 600) : 0 });
        else if (e.error === 'no-speech' || e.error === 'aborted') resolve({ text: '', durationMs: 0 });
        else reject(new Error(MESSAGES[e.error] || 'Error de reconocimiento: ' + e.error));
      };
      rec.onend = () => {
        clearTimeout(silenceTimer);
        this.active = false;
        const durationMs = firstSpeechAt ? Math.max(500, lastSpeechAt - firstSpeechAt + 600) : 0;
        resolve({ text: (finalText || lastInterim).trim(), durationMs });
      };
      this.active = true;
      try { rec.start(); } catch (err) { this.active = false; return reject(new Error('No se pudo abrir el micrófono: ' + err.message)); }
      armSilence();
    });
  }

  stop() { try { this.rec?.stop(); } catch {} }
  abort() { try { this.rec?.abort(); } catch {} }
}

// Pausa de silencio que da el turno por terminado (Ajustes → «Enviar tras una pausa de»).
export const SEND_PAUSES = [1000, 1600, 2200, 3000];
export function sendPauseMs() {
  const v = store.get().settings.sendPauseMs;
  return SEND_PAUSES.includes(v) ? v : WAIT_AFTER_SPEECH_MS;
}

// ---------- Ritmo de la voz ----------
// Cuánto tarda la voz del teléfono por palabra, medido en este teléfono (a velocidad 1). Sirve para
// mostrar el texto al mismo ritmo cuando la voz no avisa palabra por palabra.
const DEFAULT_MS_PER_WORD = 60000 / 165;
export function msPerWord(rate = 1) {
  const m = store.get().settings.paceMs;
  const base = m > 150 && m < 900 ? m : DEFAULT_MS_PER_WORD;
  return base / (rate || 1);
}
export function learnPace(words, ms, rate = 1) {
  if (words < 4 || ms < 800) return;                     // frases muy cortas: la medida no sirve
  const sample = (ms / words) * (rate || 1);
  if (sample < 150 || sample > 900) return;
  store.update(st => {
    const old = st.settings.paceMs;
    st.settings.paceMs = Math.round(old > 150 && old < 900 ? old * 0.7 + sample * 0.3 : sample);
  });
}

// ---------- Hablar ----------
let voices = [];
const voiceListeners = new Set();
function loadVoices() {
  voices = canSpeak ? speechSynthesis.getVoices() : [];
  voiceListeners.forEach(f => f());
}
if (canSpeak) { loadVoices(); speechSynthesis.addEventListener?.('voiceschanged', loadVoices); }
// En Android las voces llegan un rato después de abrir la app: avisa cuando cambian.
export function onVoicesChanged(f) { voiceListeners.add(f); return () => voiceListeners.delete(f); }

export function englishVoices() {
  const lang = (store.get().settings.targetLang || 'en-US').slice(0, 2);
  return voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(lang));
}

const FEMALE = /female|woman|zira|susan|samantha|victoria|karen|moira|tessa|fiona|serena|aria|jenny|libby|sonia|natasha|emma|ava|allison|kate|#f|-f-|en-us-x-(sfg|tpc|iob)/i;
const MALE = /male|man|david|mark|daniel|alex|fred|george|guy|ryan|thomas|oliver|tom|james|#m|-m-|en-us-x-(iom|tpd|iol)/i;

// Qué tan bien suena una voz del teléfono, según su nombre: las "naturales" y en línea suenan mucho mejor
// que las viejas voces robóticas (eSpeak, Microsoft David/Zira de Windows).
export function voiceQuality(v) {
  const n = `${v.name} ${v.voiceURI}`;
  let q = 0;
  if (/natural|neural|online|premium|enhanced|wavenet|studio|journey/i.test(n)) q += 6;
  if (/-network\b/i.test(n)) q += 4;          // Android: voces de Google "de red", más naturales que las -local
  if (/google/i.test(n)) q += 3;
  if (v.localService === false) q += 2;
  if (/^en-US/i.test(v.lang)) q += 1;
  if (/espeak|compact|robot|novelty|bad news|bells|whisper|zarvox|trinoids|albert|bahh|boing|bubbles|cellos|jester|organ|superstar/i.test(n)) q -= 10;
  if (/microsoft (david|zira|mark|hazel|george|susan)\b/i.test(n) && !/natural|online/i.test(n)) q -= 3;
  return q;
}

// Las voces en inglés de la mejor a la peor, para la lista de Ajustes.
export function rankedVoices() {
  return englishVoices().map(v => ({ v, q: voiceQuality(v) })).sort((a, b) => b.q - a.q || a.v.name.localeCompare(b.v.name));
}

// Nombre para mostrar en la lista: ⭐ = de las que mejor suenan.
export function voiceLabel(v, q = voiceQuality(v)) {
  const name = v.name.replace(/\s+/g, ' ');
  return `${q >= 6 ? '⭐ ' : ''}${name} (${v.lang})${v.localService === false ? ' · en línea' : ''}`;
}

export function voiceFor(character) {
  const list = englishVoices();
  if (!list.length) return null;
  const chosen = store.get().settings.voiceURI;
  const picked = chosen && list.find(v => v.voiceURI === chosen);
  if (picked) return picked;                 // la que eligió en Ajustes manda
  const best = arr => arr.slice().sort((a, b) => voiceQuality(b) - voiceQuality(a))[0];
  const want = character?.voice?.gender;
  if (want) {
    const re = want === 'female' ? FEMALE : MALE;
    const other = want === 'female' ? MALE : FEMALE;
    const matches = list.filter(v => re.test(v.name + ' ' + v.voiceURI) && !(want === 'male' && other.test(v.name)));
    // Solo se usa la del género pedido si no es mucho peor que la mejor disponible.
    if (matches.length && voiceQuality(best(matches)) >= voiceQuality(best(list)) - 3) return best(matches);
  }
  return best(list);
}

// Tiempo máximo que puede tardar en leer un texto: si Chrome no avisa que terminó, seguimos igual.
export function maxSpeechMs(text, rate = 1) {
  const words = String(text).trim().split(/\s+/).length;
  return Math.round((words / (2.2 * rate)) * 1000 + 5000);
}

let current = null; // Chrome pierde los eventos si la frase que se está leyendo no queda guardada en algún lado.

// Lee el texto: con la voz natural si está lista; si no, o si falla, con la voz del teléfono.
// onLevel(0..1) sirve para mover la boca del avatar.
export async function speak(text, opts = {}) {
  const s = store.get().settings;
  if (text && !opts.lang && s.voiceEngine === 'natural' && naturalReady()) {
    try {
      return await speakNatural(text, {
        voice: naturalVoiceFor(opts.character, s.naturalVoice),
        speed: opts.rate || 1,
        onStart: opts.onStart, onLevel: opts.onLevel, onEnd: opts.onEnd, onSegment: opts.onSegment,
      });
    } catch (e) { console.warn('Voz natural:', e.message); }
  }
  return speakPhone(text, opts);
}

function speakPhone(text, { character, rate = 1, onStart, onLevel, onEnd, onBoundary, lang } = {}) {
  return new Promise(resolve => {
    if (!canSpeak || !text) { onEnd?.(); return resolve(); }
    const wasBusy = speechSynthesis.speaking || speechSynthesis.pending;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    current = u;
    // lang = otro idioma (ej. 'es' para leer la traducción); si no, la voz del personaje.
    const v = lang ? voices.find(x => x.lang?.toLowerCase().startsWith(lang)) : voiceFor(character);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = lang || store.get().settings.targetLang;
    u.rate = rate;
    u.pitch = 1; // cambiar el tono deforma la voz y la hace sonar robótica
    let mouthTimer = null, keepAlive = null, safety = null, done = false, startedAt = 0, cut = false;
    let boost = 0;
    const tick = () => {
      // Movimiento de boca: oscilación + golpe en cada palabra (evento boundary).
      boost *= 0.75;
      const base = 0.25 + 0.35 * Math.abs(Math.sin(performance.now() / 85));
      onLevel?.(Math.min(1, base * (0.6 + Math.random() * 0.5) + boost));
    };
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(mouthTimer);
      clearInterval(keepAlive);
      clearTimeout(safety);
      if (current !== u) cut = true;               // la cortó otra frase
      if (current === u) current = null;
      // Mide el ritmo real de esta voz para sincronizar el texto la próxima vez.
      if (startedAt && !cut && !lang) learnPace(text.trim().split(/\s+/).length, performance.now() - startedAt, rate);
      onLevel?.(0);
      onEnd?.();
      resolve();
    };
    u.onstart = () => {
      startedAt = performance.now();
      onStart?.();
      mouthTimer = setInterval(tick, 70);
      // Chrome de computador corta las frases largas a los ~15 s si no se le da este empujón.
      if (!IS_ANDROID) keepAlive = setInterval(() => { if (speechSynthesis.speaking) { speechSynthesis.pause(); speechSynthesis.resume(); } }, 10000);
    };
    // La voz avisa qué palabra va diciendo: el texto y la boca van exactamente con ella.
    u.onboundary = e => { boost = 0.5; if (!e.name || e.name === 'word') onBoundary?.(e.charIndex); };
    u.onend = finish;
    u.onerror = () => { cut = true; finish(); };
    safety = setTimeout(() => { cut = true; if (current === u) speechSynthesis.cancel(); finish(); }, maxSpeechMs(text, rate));
    // Justo después de cancel() Chrome a veces ignora la frase nueva: se espera un instante.
    if (wasBusy) setTimeout(() => { if (!done) speechSynthesis.speak(u); }, 60);
    else speechSynthesis.speak(u);
  });
}

export function stopSpeaking() { stopNatural(); if (canSpeak) speechSynthesis.cancel(); }

// Revisión rápida para Ajustes: qué funciona en este teléfono y qué hacer si algo falla.
export async function checkVoice() {
  const out = [];
  const secure = window.isSecureContext !== false;
  out.push(secure
    ? { ok: true, text: 'Conexión segura (https o este computador)' }
    : { ok: false, text: 'La app no está en https: el teléfono no dejará usar el micrófono. Ábrala desde la dirección https publicada.' });
  out.push(canListen
    ? { ok: true, text: 'El navegador reconoce voz' }
    : { ok: false, text: 'Este navegador no reconoce voz. Use Chrome en Android (o escriba con ⌨️).' });
  try {
    const st = await navigator.permissions?.query({ name: 'microphone' });
    if (st?.state === 'denied') out.push({ ok: false, text: 'El micrófono está bloqueado para esta página. Actívelo en el candado de la barra de dirección.' });
    else if (st?.state === 'granted') out.push({ ok: true, text: 'Permiso de micrófono concedido' });
    else if (st) out.push({ ok: true, text: 'El permiso de micrófono se pedirá la primera vez que hable' });
  } catch {}
  const n = englishVoices().length;
  if (!canSpeak) out.push({ ok: false, text: 'Este navegador no puede leer en voz alta.' });
  else if (n) out.push({ ok: true, text: `${n} voz${n === 1 ? '' : 'es'} en inglés instalada${n === 1 ? '' : 's'}` });
  else out.push({ ok: false, text: 'No hay voces en inglés (pueden tardar unos segundos en cargar). En Android: Ajustes → Sistema → Idiomas → Salida de texto a voz → instale el inglés.' });
  return out;
}
