// Función de Netlify: guarda y devuelve el avance sincronizado (ver ../sync-core.mjs). Responde en /api/sync.
// Consistencia fuerte: leer justo después de guardar debe dar lo nuevo (si no, un aparato podría traer algo viejo).
import { getStore } from '@netlify/blobs';
import { handle } from '../sync-core.mjs';

export default async req => {
  try {
    const blobs = getStore({ name: 'charla-sync', consistency: 'strong' });
    return await handle(req, {
      get: key => blobs.get(key, { type: 'json' }),
      set: (key, value) => blobs.setJSON(key, value),
      del: key => blobs.delete(key),
    });
  } catch (e) {
    console.error('sync', e);
    return new Response(JSON.stringify({ error: 'La nube no respondió: ' + (e?.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const config = { path: '/api/sync' };
