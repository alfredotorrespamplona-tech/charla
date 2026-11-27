// Función de Netlify: guarda y devuelve el avance sincronizado (ver ../sync-core.mjs). Responde en /api/sync.
import { getStore } from '@netlify/blobs';
import { handle } from '../sync-core.mjs';

export default async req => {
  const blobs = getStore({ name: 'charla-sync', consistency: 'strong' });
  return handle(req, {
    get: key => blobs.get(key, { type: 'json' }),
    set: (key, value) => blobs.setJSON(key, value),
    del: key => blobs.delete(key),
  });
};

export const config = { path: '/api/sync' };
