// Las grabaciones de «Grabarse y compararse» se guardan solo en este teléfono (IndexedDB). No van en la copia de
// seguridad (pesan mucho): allí viaja solo la lista con fechas, textos y números.
const DB = 'charla-audio', STORE = 'clips';
let dbp = null;

function db() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Este navegador no puede guardar audio.'));
  return (dbp ||= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => { dbp = null; reject(r.error); };
  }));
}

function run(mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const putClip = (id, blob) => run('readwrite', s => s.put(blob, id));
export const getClip = id => run('readonly', s => s.get(id)).catch(() => null);
export const deleteClips = ids => (ids.length ? run('readwrite', s => { ids.forEach(i => s.delete(i)); }) : Promise.resolve());
