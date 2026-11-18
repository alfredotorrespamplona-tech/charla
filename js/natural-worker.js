// Voz natural gratis: el modelo Kokoro (código abierto, Apache 2.0) corre dentro del equipo.
// Va en un "worker" para que la pantalla no se congele mientras genera el audio.
// Se descarga una sola vez desde Hugging Face y queda guardado en el navegador.
import { KokoroTTS } from '../vendor/kokoro/kokoro.web.js';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let loading = null;
const cancelled = new Set();
let queue = Promise.resolve(); // una frase a la vez: el modelo no puede generar dos cosas juntas

// Con tarjeta gráfica (WebGPU) es mucho más rápida, pero necesita el modelo completo (~330 MB).
// Sin ella se usa el procesador con el modelo comprimido (~90 MB).
// En celulares siempre el comprimido: el completo ocupa demasiada memoria y pone lento todo el teléfono.
export function isMobile(nav = self.navigator) {
  return !!(nav?.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(nav?.userAgent || ''));
}
async function pickDevice() {
  if (isMobile()) return { device: 'wasm', dtype: 'q8' };
  try { if (self.navigator?.gpu && await navigator.gpu.requestAdapter()) return { device: 'webgpu', dtype: 'fp32' }; } catch {}
  return { device: 'wasm', dtype: 'q8' };
}

function load(opts = {}) {
  if (loading) return loading;
  const files = new Map();
  let last = 0;
  loading = (async () => {
    const { device, dtype } = opts.device ? { device: opts.device, dtype: opts.dtype || 'q8' } : await pickDevice();
    postMessage({ type: 'device', device });
    const tts = await KokoroTTS.from_pretrained(MODEL, {
      dtype, device,
      progress_callback: p => {
        if (p.status !== 'progress' || !p.total) return;
        files.set(p.file, [p.loaded, p.total]);
        let loaded = 0, total = 0;
        for (const [l, t] of files.values()) { loaded += l; total += t; }
        const pct = Math.floor((loaded / total) * 100);
        if (pct !== last) { last = pct; postMessage({ type: 'progress', pct, mb: Math.round(total / 1e6) }); }
      },
    });
    // Calentamiento: la primera frase siempre es la más lenta. Con una muy corta basta; la segunda
    // mide la velocidad del equipo (segundos que tarda por cada segundo de voz) para avisarle al usuario.
    postMessage({ type: 'warming' });
    const t0 = performance.now();
    const a = await tts.generate('Hi.', { voice: 'af_heart' });
    const t1 = performance.now();
    const b = await tts.generate('How are you?', { voice: 'af_heart' });
    const slow = ((performance.now() - t1) / 1000) / (b.audio.length / b.sampling_rate);
    postMessage({ type: 'ready', device, dtype, slowness: +slow.toFixed(2), warmupMs: Math.round(t1 - t0), check: a.audio.length > 0 });
    return tts;
  })().catch(e => { loading = null; postMessage({ type: 'error', message: String(e?.message || e) }); throw e; });
  return loading;
}

async function speak({ id, text, voice, speed }) {
  try {
    const tts = await load();
    let i = 0;
    for await (const { text: part, audio } of tts.stream(text, { voice, speed })) {
      if (cancelled.has(id)) break;
      const pcm = audio.audio;
      postMessage({ type: 'chunk', id, i: i++, pcm, rate: audio.sampling_rate, text: part }, [pcm.buffer]);
    }
    postMessage({ type: 'done', id });
  } catch (e) {
    postMessage({ type: 'fail', id, message: String(e?.message || e) });
  } finally {
    cancelled.delete(id);
  }
}

onmessage = ({ data }) => {
  if (data.type === 'load') load(data).catch(() => {});
  else if (data.type === 'cancel') cancelled.add(data.id);
  else if (data.type === 'speak') queue = queue.then(() => cancelled.has(data.id) ? cancelled.delete(data.id) : speak(data));
};
