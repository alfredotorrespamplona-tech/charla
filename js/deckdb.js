// Dónde se guarda el mazo de mil palabras en el teléfono (IndexedDB): las tarjetas y sus audios e imágenes.
// Es pesado (unos 60 MB) y es de la persona: nunca se sube a internet ni va en la copia de seguridad.
// Lo que sí va en la copia es el avance de cada tarjeta (store.mil), que es liviano.
const DB = 'charla-mazo';
const VERSION = 1;
let dbP = null;

function open() {
  if (dbP) return dbP;
  dbP = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Este navegador no puede guardar el mazo.'));
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbP = null; };
      resolve(db);
    };
    req.onerror = () => { dbP = null; reject(req.error || new Error('No se pudo abrir el almacenamiento del mazo.')); };
    req.onblocked = () => { dbP = null; reject(new Error('Cierre Charla en otras pestañas y vuelva a intentarlo.')); };
  });
  return dbP;
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    let out;
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error || new Error('Error al guardar el mazo'));
    t.onabort = () => reject(t.error || new Error(t.error?.name === 'QuotaExceededError' ? 'El teléfono no tiene espacio para el mazo.' : 'Se canceló el guardado del mazo.'));
    out = fn(t.objectStore(store));
  }));
}
const req = r => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

// Guarda varios archivos de una vez: [[nombre, Blob], …]
export function putMedia(entries) {
  return tx('media', 'readwrite', st => { for (const [k, v] of entries) st.put(v, k); });
}

const mediaCache = new Map();
export async function getMedia(name) {
  if (!name) return null;
  if (mediaCache.has(name)) return mediaCache.get(name);
  const db = await open();
  const blob = await req(db.transaction('media').objectStore('media').get(name));
  if (blob) { mediaCache.set(name, blob); if (mediaCache.size > 60) mediaCache.delete(mediaCache.keys().next().value); }
  return blob || null;
}

export async function mediaNames() {
  const db = await open();
  return new Set(await req(db.transaction('media').objectStore('media').getAllKeys()));
}

let cardsCache = null;
export async function saveCards(cards, info) {
  cardsCache = null;
  await tx('meta', 'readwrite', st => { st.put(cards, 'cards'); st.put(info, 'info'); });
  cardsCache = cards;
}

// Las tarjetas del mazo (null si aún no lo importa o el teléfono borró el almacenamiento).
export async function loadCards() {
  if (cardsCache) return cardsCache;
  try {
    const db = await open();
    cardsCache = (await req(db.transaction('meta').objectStore('meta').get('cards'))) || null;
  } catch { cardsCache = null; }
  return cardsCache;
}

export async function deckInfo() {
  try {
    const db = await open();
    return (await req(db.transaction('meta').objectStore('meta').get('info'))) || null;
  } catch { return null; }
}

// Borra el mazo del teléfono (el avance de las tarjetas se queda en el progreso).
export async function clearDeck() {
  cardsCache = null;
  mediaCache.clear();
  await tx('media', 'readwrite', st => st.clear());
  await tx('meta', 'readwrite', st => st.clear());
}
