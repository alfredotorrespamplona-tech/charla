// Voz: reconocimiento (voz → texto) y lectura (texto → voz) usando lo que ya trae el teléfono. Gratis.
import * as store from './store.js';
import { naturalReady, speakNatural, stopNatural, naturalVoiceFor } from './natural-voice.js';
import { lipTrack, lipClock, sampleAt, babble, measuredUnitMs, REST } from './lipsync.js';
import { WhisperListener, whisperOn } from './whisper.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
export const canSpeak = 'speechSynthesis' in window;
export const IS_ANDROID = /Android/i.test(navigator.userAgent || '');

// Espera antes de dar el turno por terminado: mucho más larga mientras no ha empezado a hablar (está
// pensando la respuesta). Después de hablar, el silencio que se elige en Ajustes (3 s si no eligió).
export const WAIT_FIRST_WORD_MS = 20000;
export const WAIT_AFTER_SPEECH_MS = 3000;

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
const RESTART_MS = 120;
const FATAL = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'language-not-supported'];

class PhoneListener {
  constructor(Rec = SR) {
    this.Rec = Rec;
    this.rec = null;
    this.active = false;
    this.ending = false;
    this.end = null;
    this.cancel = null;
  }

  // Devuelve { text, durationMs } cuando el usuario termina: se calla un rato (pauseMs) después de hablar,
  // no dice nada en firstWordMs, o toca el micrófono (stop()).
  // Android corta el reconocimiento solo en la primera pausa (aunque se pida continuous) o a los ~5 s sin oír
  // nada. Si se corta antes de tiempo, se vuelve a abrir enseguida y se junta lo dicho: así puede pensar
  // con calma a mitad de la frase sin que se envíe un pedazo.
  start({ lang, onInterim, firstWordMs = WAIT_FIRST_WORD_MS, pauseMs = sendPauseMs(), restartMs = RESTART_MS } = {}) {
    return new Promise((resolve, reject) => {
      if (!this.Rec) return reject(new Error('Este navegador no reconoce voz. Use Chrome en Android o escriba.'));
      let said = '', finalText = '', lastInterim = '';
      let firstSpeechAt = 0, lastSpeechAt = 0, quickEnds = 0, opens = 0, done = false;
      let timer = null, restartTimer = null, safety = null;
      const durationMs = () => (firstSpeechAt ? Math.max(500, lastSpeechAt - firstSpeechAt + 600) : 0);
      const commit = () => { said = joinResults([said, (finalText || lastInterim).trim()]); finalText = ''; lastInterim = ''; };
      const finish = error => {
        if (done) return;
        done = true;
        clearTimeout(timer); clearTimeout(restartTimer); clearTimeout(safety);
        commit();
        this.active = false; this.rec = null; this.end = null; this.cancel = null;
        const text = said.trim();
        if (error && !text) return reject(new Error(MESSAGES[error] || 'Error de reconocimiento: ' + error));
        resolve({ text, durationMs: text ? durationMs() : 0 });
      };
      // Fin del turno: se pide al reconocedor lo último que oyó (llega en onend); entre dos grabaciones, ya.
      const close = how => {
        if (done) return;
        this.ending = true;
        clearTimeout(timer); clearTimeout(restartTimer);
        const rec = this.rec;
        if (!rec) return finish();
        try { rec[how](); } catch { return finish(); }
        safety = setTimeout(() => finish(), 1500);   // por si el teléfono nunca avisa que terminó
      };
      this.end = () => close('stop');
      this.cancel = () => close('abort');
      // Silencio = fin del turno. Antes de la primera palabra se espera mucho más (está pensando la respuesta).
      const arm = () => { clearTimeout(timer); timer = setTimeout(() => close('stop'), firstSpeechAt ? pauseMs : firstWordMs); };

      const open = () => {
        if (done || this.ending) return;
        const rec = new this.Rec();
        this.rec = rec;
        rec.lang = lang || 'en-US';
        rec.interimResults = true;
        rec.continuous = true;
        rec.maxAlternatives = 1;
        const openedAt = performance.now();
        let error = '', gotResult = false, closed = false;
        rec.onresult = e => {
          const now = performance.now();
          gotResult = true;
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
          onInterim?.(joinResults([said, finalText, interim]));
          if (!this.ending) arm();
        };
        rec.onerror = e => {
          error = e.error;
          // Sin permiso, sin micrófono o sin internet: no sirve volver a abrir.
          if (FATAL.includes(error) && !closed) { closed = true; finish(error); try { rec.abort(); } catch {} }
        };
        rec.onend = () => {
          if (closed || done) return;
          closed = true;
          if (this.rec === rec) this.rec = null;
          commit();
          if (this.ending || error === 'aborted') return finish();
          // Se cortó solo (pausa o silencio): se vuelve a abrir, salvo que falle enseguida una y otra vez.
          quickEnds = !gotResult && performance.now() - openedAt < 300 ? quickEnds + 1 : 0;
          if (quickEnds >= 4) return finish();
          restartTimer = setTimeout(open, restartMs);
        };
        try { rec.start(); opens++; } catch (err) {
          closed = true;
          this.rec = null;
          if (opens) return finish();   // al volver a abrir: termina con lo que ya dijo
          done = true;
          clearTimeout(timer);
          this.active = false; this.end = null; this.cancel = null;
          reject(new Error('No se pudo abrir el micrófono: ' + err.message));
        }
      };
      this.active = true;
      this.ending = false;
      arm();
      open();
    });
  }

  stop() { this.end?.(); }
  abort() { this.cancel?.(); }
}

// El micrófono de toda la app. Con clave de Groq usa Whisper (escribe lo que dijo tal cual, con errores);
// si no, el reconocedor del teléfono. Se decide en cada grabación (si Groq llega a su límite, sigue el teléfono).
export class Listener {
  constructor(Rec = SR) { this.Rec = Rec; this.phone = new PhoneListener(Rec); this.cur = null; }
  get active() { return !!this.cur?.active; }
  start(opts = {}) {
    const whisper = this.Rec === SR && whisperOn();
    this.cur = whisper ? new WhisperListener() : this.phone;
    return this.cur.start(whisper ? { firstWordMs: WAIT_FIRST_WORD_MS, pauseMs: sendPauseMs(), ...opts } : opts);
  }
  stop() { this.cur?.stop(); }
  abort() { this.cur?.abort(); }
}

// Pausa de silencio que da el turno por terminado (Ajustes → «Enviar tras una pausa de»).
export const SEND_PAUSES = [2000, 3000, 4000, 6000];
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

// Ritmo de los labios: ms por unidad (≈ una sílaba) a velocidad 1, medido frase a frase en este teléfono.
// Mientras no hay medida, se calcula con el ritmo por palabra.
export function lipUnitMs(rate, track, text) {
  const m = store.get().settings.lipUnitMs;
  if (m >= 60 && m <= 420) return m / (rate || 1);
  const words = String(text).trim().split(/\s+/).length;
  return Math.max(60, (msPerWord(rate) * words) / Math.max(1, track.end || track.units));
}
function learnLips(track, ms, rate, heardWords) {
  const sample = measuredUnitMs(track, ms, rate);
  store.update(st => {
    if (track.words.length >= 3) st.settings.voiceWords = !!heardWords;   // la voz avisa cada palabra (Ajustes lo muestra)
    if (!sample) return;
    const old = st.settings.lipUnitMs;
    st.settings.lipUnitMs = Math.round(old >= 60 && old <= 420 ? old * 0.6 + sample * 0.4 : sample);
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

function speakPhone(text, { character, rate = 1, onStart, onLevel, onMouth, onEnd, onBoundary, lang } = {}) {
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
    // Labios: con onMouth la boca sigue las sílabas del texto (lipsync.js), al ritmo aprendido de esta voz.
    const track = onMouth && !lang ? lipTrack(text) : null;
    const clock = track ? lipClock(track, lipUnitMs(rate, track, text)) : null;
    const tick = () => {
      if (clock) {
        const now = performance.now(), p = clock.pos(now);
        // Si la voz sigue sonando después de lo calculado, la boca sigue hablando suave (no se queda cerrada).
        onMouth(p >= track.end ? babble(now) : sampleAt(track, p));
        return;
      }
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
      if (startedAt && !cut && !lang) {
        learnPace(text.trim().split(/\s+/).length, performance.now() - startedAt, rate);
        if (track) learnLips(track, performance.now() - startedAt, rate, clock.heard);
      }
      onLevel?.(0);
      onMouth?.(REST);
      onEnd?.();
      resolve();
    };
    u.onstart = () => {
      startedAt = performance.now();
      clock?.start(startedAt);
      onStart?.();
      mouthTimer = setInterval(tick, clock ? 33 : 70);
      // Chrome de computador corta las frases largas a los ~15 s si no se le da este empujón.
      if (!IS_ANDROID) keepAlive = setInterval(() => { if (speechSynthesis.speaking) { speechSynthesis.pause(); speechSynthesis.resume(); } }, 10000);
    };
    // La voz avisa qué palabra va diciendo: el texto y la boca van exactamente con ella.
    u.onboundary = e => {
      boost = 0.5;
      if (!e.name || e.name === 'word') { clock?.word(e.charIndex, performance.now()); onBoundary?.(e.charIndex); }
    };
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
  const vw = store.get().settings.voiceWords;
  if (vw === true) out.push({ ok: true, text: 'La voz avisa cada palabra: los labios de Amy van con ella' });
  else if (vw === false) out.push({ ok: true, text: 'La voz no avisa cada palabra: los labios de Amy siguen el ritmo medido de esta voz (se ajusta solo con cada frase)' });
  return out;
}
