// Guarda la app en el teléfono para que abra rápido y sin conexión (la IA sigue necesitando internet).
// Cambie CACHE cada vez que publique una versión nueva para que los teléfonos la descarguen.
const CACHE = 'charla-v38';
const FILES = ['./', 'index.html', 'styles.css', 'manifest.json', 'icon.svg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  'js/app.js', 'js/avatar.js', 'js/conversation.js', 'js/data.js', 'js/hints.js', 'js/lessons.js', 'js/topics.js', 'js/coins.js', 'js/people.js', 'js/vocab.js', 'js/stats.js', 'js/customtopics.js', 'js/inbox.js', 'js/icons.js', 'js/srs.js', 'js/phrases.js', 'js/cerebro.js', 'js/essentials.js', 'js/llm.js', 'js/natural-voice.js', 'js/natural-worker.js', 'js/prompts.js',
  'js/pronounce.js', 'js/review.js', 'js/scoring.js', 'js/speech.js', 'js/store.js', 'js/transcript.js', 'js/ui.js', 'js/words.js', 'js/recap.js', 'js/seasons.js', 'js/tutorial.js', 'js/drills.js', 'js/workshop.js', 'js/budget.js', 'js/safety.js', 'js/bitacora.js', 'js/grammar.js', 'js/grammarscreen.js', 'js/dashboard.js', 'js/mil.js', 'js/milwords.js', 'js/milscreen.js', 'js/lipsync.js', 'js/cast.js', 'js/version.js', 'js/update.js', 'js/levelscreen.js', 'js/temario.js', 'js/temario-a.js', 'js/temario-b.js', 'js/temario-c.js', 'js/temarioscreen.js', 'js/tecnicas.js', 'js/tecnicasscreen.js',
  'vendor/kokoro/kokoro.web.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Aislamiento (COOP/COEP): permite que la voz natural use varios núcleos del procesador (mucho más rápida).
// "credentialless" deja seguir cargando cosas de otros sitios que usan CORS (DeepSeek, el modelo de voz).
function isolate(r) {
  if (!r || r.type === 'opaque' || r.status === 0) return r;
  const h = new Headers(r.headers);
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Cross-Origin-Embedder-Policy', 'credentialless');
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // nunca tocar las llamadas a DeepSeek
  if (/\/(avatars|scenes|vendor)\//.test(url.pathname)) {
    // Imágenes y librerías: primero la copia guardada (no cambian), si no, se descargan y se guardan.
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    })).then(isolate));
    return;
  }
  // Código: primero la red (para recibir actualizaciones), si no hay conexión, la copia guardada.
  // "no-cache" pregunta al servidor si cambió, para no quedarse con una versión vieja del navegador.
  e.respondWith((req.mode === 'navigate' ? fetch(req) : fetch(req, { cache: 'no-cache' })).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  }).catch(() => caches.match(req).then(hit => hit || caches.match('index.html'))).then(isolate));
});
