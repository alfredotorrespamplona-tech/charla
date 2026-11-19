// Android deja la app abierta en segundo plano días enteros: al volver no recarga la página y seguiría con
// la versión vieja (por ejemplo, con los personajes de antes). Por eso, cada vez que vuelve a la app, se
// revisa si hay una versión nueva publicada: si la hay, se actualiza sola; en una charla o un repaso, pregunta.
import { VERSION, isNewer, shortVersion } from './version.js';
import { h, toast } from './ui.js';

const TRIED_KEY = 'charla.updateTried';

export async function publishedVersion() {
  try {
    const r = await fetch('sw.js', { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.text()).match(/charla-v\d+/)?.[0] || null;
  } catch { return null; }
}

let bar = null;
function offer(reload) {
  if (bar?.isConnected) return;
  bar = h('div.update-bar', { role: 'status' },
    h('span', {}, '🔄 Hay una versión nueva de Charla'),
    h('button.small.primary', { onclick: reload }, 'Actualizar'),
    h('button.icon', { 'aria-label': 'Ahora no', onclick: () => bar.remove() }, '✕'));
  document.body.appendChild(bar);
}

// busy(): está en una charla o repasando (antes de recargar se pregunta).
// beforeReload(): anota dónde estaba, para volver ahí después de actualizar.
export async function checkForUpdate({ busy = () => false, beforeReload = () => {}, manual = false } = {}) {
  const v = await publishedVersion();
  if (!v || !isNewer(v, VERSION)) {
    if (manual) toast(v ? `✅ Tiene la última versión (${shortVersion()})` : 'Sin conexión: no se pudo revisar', v ? 'good' : 'bad');
    return false;
  }
  navigator.serviceWorker?.getRegistration?.().then(r => r?.update()).catch(() => {});
  const reload = () => { beforeReload(); location.reload(); };
  // Si ya recargó por esta versión y sigue la vieja (el servidor aún no la entrega), no insiste: pregunta.
  let tried = '';
  try { tried = sessionStorage.getItem(TRIED_KEY) || ''; sessionStorage.setItem(TRIED_KEY, v); } catch {}
  if (!manual && (busy() || tried === v)) offer(reload);
  else reload();
  return true;
}
