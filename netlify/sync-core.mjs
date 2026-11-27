// Sincronización entre aparatos (v50): la lógica del servidor, sin depender de Netlify (así se prueba con node --test).
// Cada usuario tiene un código secreto (XXXX-XXXX-XXXX-XXXX). En la nube se guarda bajo el SHA-256 del código,
// nunca el código mismo. Lo guardado es el avance de la app SIN las claves de IA (el teléfono las quita antes).
export const CODE_RE = /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/;
export const MAX_BYTES = 4 * 1024 * 1024;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function keyFor(code) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('charla-sync:' + code));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// store: { get(key) → objeto | null, set(key, objeto), del(key) }.
export async function handle(req, store, now = Date.now()) {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  const code = String(req.headers.get('x-sync-code') || '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return json({ error: 'Código no válido' }, 400);
  const text = await req.text();
  if (text.length > MAX_BYTES) return json({ error: 'El avance es demasiado grande para sincronizar' }, 413);
  let body;
  try { body = JSON.parse(text || '{}'); } catch { return json({ error: 'Pedido no válido' }, 400); }
  const key = await keyFor(code);
  const cur = await store.get(key);
  const meta = cur ? { rev: cur.rev, at: cur.at, device: cur.device || '' } : { rev: 0, at: 0, device: '' };

  if (body.op === 'get') return json({ ok: true, ...meta, data: cur ? cur.data : null });

  if (body.op === 'put') {
    if (!body.data || typeof body.data !== 'object' || !('settings' in body.data)) return json({ error: 'No es un avance de Charla' }, 400);
    // Si otro aparato guardó algo después de lo último que vio este, no se pisa: se avisa.
    if ((body.base | 0) !== meta.rev && !body.force) return json({ conflict: true, ...meta }, 409);
    const data = structuredClone(body.data);
    if (data.settings) { data.settings.apiKey = ''; data.settings.groqKey = ''; }   // por si acaso: nunca claves
    const next = { rev: meta.rev + 1, at: now, device: String(body.device || '').slice(0, 40), data };
    await store.set(key, next);
    return json({ ok: true, rev: next.rev, at: next.at, device: next.device });
  }

  if (body.op === 'delete') { if (cur) await store.del(key); return json({ ok: true }); }
  return json({ error: 'Operación desconocida' }, 400);
}
