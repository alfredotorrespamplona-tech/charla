// Voz natural (Kokoro) del lado de la pantalla: descarga, estado y reproducción del audio por frases.
// Si no está lista o falla, speech.js usa la voz del teléfono.

// Voces de Kokoro con mejor nota de calidad (las de nota D o F suenan mal y no se usan).
export const NATURAL_VOICES = [
  { id: 'af_heart', name: 'Heart', accent: 'EE. UU.', gender: 'female' },
  { id: 'af_bella', name: 'Bella', accent: 'EE. UU.', gender: 'female' },
  { id: 'af_nicole', name: 'Nicole', accent: 'EE. UU.', gender: 'female' },
  { id: 'af_sarah', name: 'Sarah', accent: 'EE. UU.', gender: 'female' },
  { id: 'af_kore', name: 'Kore', accent: 'EE. UU.', gender: 'female' },
  { id: 'af_aoede', name: 'Aoede', accent: 'EE. UU.', gender: 'female' },
  { id: 'af_nova', name: 'Nova', accent: 'EE. UU.', gender: 'female' },
  { id: 'af_alloy', name: 'Alloy', accent: 'EE. UU.', gender: 'female' },
  { id: 'bf_emma', name: 'Emma', accent: 'Reino Unido', gender: 'female' },
  { id: 'bf_isabella', name: 'Isabella', accent: 'Reino Unido', gender: 'female' },
  { id: 'am_michael', name: 'Michael', accent: 'EE. UU.', gender: 'male' },
  { id: 'am_fenrir', name: 'Fenrir', accent: 'EE. UU.', gender: 'male' },
  { id: 'am_puck', name: 'Puck', accent: 'EE. UU.', gender: 'male' },
  { id: 'bm_george', name: 'George', accent: 'Reino Unido', gender: 'male' },
  { id: 'bm_fable', name: 'Fable', accent: 'Reino Unido', gender: 'male' },
];

export function naturalVoiceFor(character, chosen) {
  if (chosen && NATURAL_VOICES.some(v => v.id === chosen)) return chosen;
  if (character?.tts) return character.tts;
  return character?.voice?.gender === 'male' ? 'am_michael' : 'af_heart';
}

const supported = typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined'
  && typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);

let worker = null;
let status = { state: supported ? 'idle' : 'unsupported', pct: 0, mb: 0, error: '', device: '', slowness: 0 };
const listeners = new Set();
const set = patch => { status = { ...status, ...patch }; listeners.forEach(f => f(status)); };

export const naturalStatus = () => status;
export const naturalReady = () => status.state === 'ready';
export function onNaturalStatus(f) { listeners.add(f); return () => listeners.delete(f); }

// Empieza la descarga (la primera vez) y la carga del modelo en el worker.
export function loadNatural() {
  if (!supported || worker) return;
  set({ state: 'loading', error: '' });
  worker = new Worker(new URL('./natural-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') set({ pct: data.pct, mb: data.mb });
    else if (data.type === 'device') set({ device: data.device });
    else if (data.type === 'warming') set({ state: 'warming', pct: 100 });
    else if (data.type === 'ready') set({ state: 'ready', pct: 100, slowness: data.slowness });
    else if (data.type === 'error') { set({ state: 'error', error: data.message }); worker.terminate(); worker = null; }
    else jobs.get(data.id)?.(data);
  };
  worker.onerror = e => { set({ state: 'error', error: e.message || 'no se pudo iniciar' }); worker?.terminate(); worker = null; };
  worker.postMessage({ type: 'load' });
}

// ---------- Audio ----------
let ctx = null, analyser = null;
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.connect(ctx.destination);
  }
  return ctx;
}
// Los teléfonos solo dejan sonar audio después de un toque del usuario: se "despierta" en el primer toque.
export function unlockAudio() {
  if (!supported) return;
  try { const c = audio(); if (c.state === 'suspended') c.resume(); } catch {}
}

const jobs = new Map();
let nextId = 1;
let current = null;

export function stopNatural() { current?.stop(); }

// Lee el texto con la voz natural. Rechaza si no pudo empezar (para usar la voz del teléfono).
export function speakNatural(text, { voice, speed = 1, onStart, onLevel, onEnd } = {}) {
  return new Promise((resolve, reject) => {
    if (!naturalReady() || !worker) return reject(new Error('voz natural no lista'));
    current?.stop();
    const c = audio();
    if (c.state === 'suspended') c.resume();
    // Sin un toque previo el teléfono no deja sonar el audio: mejor la voz del teléfono que quedarse callado.
    if (c.state !== 'running') return reject(new Error('el audio está bloqueado hasta que toque la pantalla'));
    const id = nextId++;
    const sources = new Set();
    const buf = new Float32Array(analyser.fftSize);
    let endAt = 0, started = false, generated = false, finished = false, levelTimer = null, endTimer = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(levelTimer);
      clearTimeout(firstChunkTimer);
      clearTimeout(endTimer);
      jobs.delete(id);
      if (current === job) current = null;
      onLevel?.(0);
      onEnd?.();
      resolve();
    };
    const fail = err => {
      if (started) return finish();          // ya sonó una parte: terminar normal
      finished = true;
      clearTimeout(firstChunkTimer);
      jobs.delete(id);
      if (current === job) current = null;
      reject(err);
    };
    const job = {
      stop() {
        worker?.postMessage({ type: 'cancel', id });
        sources.forEach(s => { try { s.stop(); } catch {} });
        finish();
      },
    };
    current = job;
    // Si el teléfono es muy lento y no llega la primera frase, se usa la voz del teléfono.
    const firstChunkTimer = setTimeout(() => { worker?.postMessage({ type: 'cancel', id }); fail(new Error('la voz natural tardó demasiado')); }, 25000);

    jobs.set(id, data => {
      if (finished) return;
      if (data.type === 'chunk') {
        const b = c.createBuffer(1, data.pcm.length, data.rate);
        b.copyToChannel(data.pcm, 0);
        const src = c.createBufferSource();
        src.buffer = b;
        src.connect(analyser);
        const at = Math.max(c.currentTime + 0.03, endAt);
        src.start(at);
        endAt = at + b.duration;
        sources.add(src);
        src.onended = () => { sources.delete(src); if (generated && !sources.size) finish(); };
        if (!started) {
          started = true;
          clearTimeout(firstChunkTimer);
          onStart?.();
          // Boca del avatar según el volumen real del audio.
          levelTimer = setInterval(() => {
            analyser.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
            onLevel?.(Math.min(1, Math.sqrt(sum / buf.length) * 7));
          }, 60);
        }
      } else if (data.type === 'done') {
        generated = true;
        if (!sources.size) started ? finish() : fail(new Error('sin audio'));
        // Por si el navegador no avisa el final del último trozo.
        else endTimer = setTimeout(finish, Math.max(0, endAt - c.currentTime) * 1000 + 1500);
      } else if (data.type === 'fail') {
        generated = true;
        if (!sources.size) fail(new Error(data.message));
      }
    });
    worker.postMessage({ type: 'speak', id, text, voice, speed });
  });
}
