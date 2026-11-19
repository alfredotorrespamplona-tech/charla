// Lee un mazo de Anki (.apkg) en el propio teléfono, sin internet ni librerías: el .apkg es un zip con
// la base de datos del mazo (SQLite) y un archivo por cada audio o imagen. Nada sale del teléfono.
// Solo lee: no escribe ni ejecuta nada de lo que trae el archivo.

// ---------------- Zip ----------------
// Lee el índice del zip (al final del archivo) sin cargar el archivo entero en memoria.
export async function readZip(file) {
  const size = file.size;
  const tailLen = Math.min(size, 65557);
  const tail = new DataView(await file.slice(size - tailLen).arrayBuffer());
  let eocd = -1;
  for (let i = tailLen - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('El archivo no es un .apkg válido (no es un zip).');
  let count = tail.getUint16(eocd + 10, true);
  let cdSize = tail.getUint32(eocd + 12, true);
  let cdOffset = tail.getUint32(eocd + 16, true);
  // Zip64 (archivos o índices enormes)
  if (cdOffset === 0xffffffff || count === 0xffff) {
    const loc = eocd - 20;
    if (loc < 0 || tail.getUint32(loc, true) !== 0x07064b50) throw new Error('Zip64 no soportado.');
    const z64 = Number(tail.getBigUint64(loc + 8, true));
    const rec = new DataView(await file.slice(z64, z64 + 56).arrayBuffer());
    count = Number(rec.getBigUint64(32, true));
    cdSize = Number(rec.getBigUint64(40, true));
    cdOffset = Number(rec.getBigUint64(48, true));
  }
  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  const entries = new Map();
  let p = 0;
  for (let n = 0; n < count && p + 46 <= cd.byteLength; n++) {
    if (cd.getUint32(p, true) !== 0x02014b50) break;
    const method = cd.getUint16(p + 10, true);
    let compSize = cd.getUint32(p + 20, true);
    let rawSize = cd.getUint32(p + 24, true);
    const nameLen = cd.getUint16(p + 28, true), extraLen = cd.getUint16(p + 30, true), commentLen = cd.getUint16(p + 32, true);
    let offset = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen));
    // Tamaños de zip64 en el campo extra
    let e = p + 46 + nameLen;
    const end = e + extraLen;
    while (e + 4 <= end) {
      const id = cd.getUint16(e, true), len = cd.getUint16(e + 2, true);
      if (id === 1) {
        let q = e + 4;
        if (rawSize === 0xffffffff) { rawSize = Number(cd.getBigUint64(q, true)); q += 8; }
        if (compSize === 0xffffffff) { compSize = Number(cd.getBigUint64(q, true)); q += 8; }
        if (offset === 0xffffffff) { offset = Number(cd.getBigUint64(q, true)); }
      }
      e += 4 + len;
    }
    entries.set(name, { name, method, compSize, rawSize, offset });
    p = end + commentLen;
  }
  return entries;
}

// Contenido de un archivo del zip como Blob (los guardados sin comprimir no se copian: es un trozo del archivo).
export async function zipBlob(file, entry, type = '') {
  const head = new DataView(await file.slice(entry.offset, entry.offset + 30).arrayBuffer());
  if (head.getUint32(0, true) !== 0x04034b50) throw new Error('Zip dañado: ' + entry.name);
  const start = entry.offset + 30 + head.getUint16(26, true) + head.getUint16(28, true);
  const raw = file.slice(start, start + entry.compSize, type);
  if (entry.method === 0) return raw;
  if (entry.method !== 8) throw new Error('Compresión no soportada en ' + entry.name);
  if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador no puede abrir el archivo (actualice Chrome).');
  const out = await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
  return new Blob([out], { type });
}

// ---------------- SQLite (solo lectura) ----------------
// Lo justo para recorrer las tablas de un mazo de Anki: páginas de árbol B de tablas y desbordes.
export function sqliteTables(buf) {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const magic = new TextDecoder().decode(u8.subarray(0, 15));
  if (magic !== 'SQLite format 3') throw new Error('La base de datos del mazo no es SQLite.');
  let pageSize = dv.getUint16(16);
  if (pageSize === 1) pageSize = 65536;
  const usable = pageSize - u8[20];
  const enc = dv.getUint32(56);
  const dec = new TextDecoder(enc === 2 ? 'utf-16le' : enc === 3 ? 'utf-16be' : 'utf-8');
  const pageOff = n => (n - 1) * pageSize;

  const varint = pos => {
    let v = 0n;
    for (let i = 0; i < 8; i++) {
      const b = u8[pos + i];
      v = (v << 7n) | BigInt(b & 0x7f);
      if (!(b & 0x80)) return [v, pos + i + 1];
    }
    v = (v << 8n) | BigInt(u8[pos + 8]);
    return [v, pos + 9];
  };

  // Contenido completo de una celda (si no cabe en la página sigue en páginas de desborde).
  const payload = (pos, size) => {
    const X = usable - 35;
    if (size <= X) return u8.subarray(pos, pos + size);
    const M = Math.floor(((usable - 12) * 32) / 255) - 23;
    const K = M + ((size - M) % (usable - 4));
    const local = K <= X ? K : M;
    const out = new Uint8Array(size);
    out.set(u8.subarray(pos, pos + local), 0);
    let got = local;
    let next = dv.getUint32(pos + local);
    let guard = 0;
    while (next && got < size && guard++ < 1e6) {
      const o = pageOff(next);
      const take = Math.min(usable - 4, size - got);
      out.set(u8.subarray(o + 4, o + 4 + take), got);
      got += take;
      next = dv.getUint32(o);
    }
    return out;
  };

  const record = (data, rowid) => {
    const rd = new DataView(data.buffer, data.byteOffset, data.byteLength);
    // varint sobre `data` (puede ser una copia por desborde)
    let hdrLen, p;
    const vi = pos => {
      let v = 0n;
      for (let i = 0; i < 8; i++) {
        const b = data[pos + i];
        v = (v << 7n) | BigInt(b & 0x7f);
        if (!(b & 0x80)) return [v, pos + i + 1];
      }
      return [(v << 8n) | BigInt(data[pos + 8]), pos + 9];
    };
    [hdrLen, p] = vi(0);
    const types = [];
    while (p < Number(hdrLen)) { let t; [t, p] = vi(p); types.push(Number(t)); }
    let q = Number(hdrLen);
    const row = [];
    for (const t of types) {
      if (t === 0) row.push(null);
      else if (t >= 1 && t <= 6) {
        const len = [0, 1, 2, 3, 4, 6, 8][t];
        let v = 0n;
        for (let i = 0; i < len; i++) v = (v << 8n) | BigInt(data[q + i]);
        if (data[q] & 0x80) v -= 1n << BigInt(len * 8);       // con signo
        row.push(v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v);
        q += len;
      } else if (t === 7) { row.push(rd.getFloat64(q)); q += 8; }
      else if (t === 8) row.push(0);
      else if (t === 9) row.push(1);
      else if (t >= 12) {
        const len = (t - (t % 2 ? 13 : 12)) / 2;
        const bytes = data.subarray(q, q + len);
        row.push(t % 2 ? dec.decode(bytes) : bytes.slice());
        q += len;
      } else row.push(null);
    }
    row.rowid = rowid;
    return row;
  };

  // Recorre una tabla (desde su página raíz) y devuelve todas sus filas.
  const scan = root => {
    const rows = [];
    const stack = [root];
    let guard = 0;
    while (stack.length && guard++ < 1e6) {
      const n = stack.pop();
      const base = pageOff(n);
      const h = n === 1 ? base + 100 : base;
      const type = u8[h];
      const cells = dv.getUint16(h + 3);
      const interior = type === 0x05;
      if (type !== 0x05 && type !== 0x0d) continue;   // índices: no hacen falta
      const ptrs = h + (interior ? 12 : 8);
      const kids = [];
      for (let i = 0; i < cells; i++) {
        const c = base + dv.getUint16(ptrs + i * 2);
        if (interior) kids.push(dv.getUint32(c));
        else {
          const [size, p1] = varint(c);
          const [rowid, p2] = varint(p1);
          rows.push(record(payload(p2, Number(size)), Number(rowid)));
        }
      }
      if (interior) kids.push(dv.getUint32(h + 8));
      for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
    }
    return rows;
  };

  // Tablas: nombre → { columns, rows() } (columnas leídas del CREATE TABLE).
  const master = scan(1);
  const tables = {};
  for (const r of master) {
    if (r[0] !== 'table') continue;
    const sql = String(r[4] || '');
    const inner = sql.slice(sql.indexOf('(') + 1, sql.lastIndexOf(')'));
    const columns = [];
    let depth = 0, cur = '';
    for (const ch of inner) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && !depth) { columns.push(cur); cur = ''; } else cur += ch;
    }
    columns.push(cur);
    const names = columns.map(c => c.trim().split(/\s+/)[0].replace(/["`[\]]/g, ''))
      .filter(c => c && !/^(primary|unique|check|foreign|constraint)$/i.test(c));
    const pk = columns.map(c => c.trim()).findIndex(c => /^\S+\s+integer\s+primary\s+key/i.test(c));
    const root = r[3];
    tables[r[1]] = {
      columns: names,
      rows() {
        return scan(root).map(row => {
          const o = {};
          names.forEach((name, i) => { o[name] = i === pk && row[i] == null ? row.rowid : row[i]; });
          return o;
        });
      },
    };
  }
  return tables;
}

// ---------------- Mazo de Anki → tarjetas ----------------
const strip = s => String(s || '')
  .replace(/\[sound:[^\]]*\]/g, '')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim();
const soundOf = s => (String(s || '').match(/\[sound:([^\]]+)\]/) || [])[1] || '';
const imageOf = s => (String(s || '').match(/<img[^>]*src=["']?([^"' >]+)/i) || [])[1] || '';

// Qué campo es cada cosa, por su nombre (mazos de Refold en español o en inglés).
export function fieldMap(names) {
  const find = re => names.findIndex(n => re.test(n));
  const all = re => names.map((n, i) => re.test(n) ? i : -1).filter(i => i >= 0);
  const word = find(/^(palabra|word|target ?word)$/i);
  return {
    rank: find(/índice|indice|orden|rank|index|freq/i),
    word,
    front: find(/anverso|^front$/i),
    defs: all(/defini|meaning|significado/i),
    forms: all(/formas|irregular|forms/i),
    sentence: find(/ejemplo|^sentence$|example/i),
    translation: find(/traducci|translation/i),
    wordAudio: find(/audio.*(palabra|word)|(palabra|word).*audio/i),
    sentenceAudio: find(/audio.*(frase|sentence)|(frase|sentence).*audio/i),
    image: find(/imagen|image|picture/i),
  };
}

// Convierte las notas del mazo en tarjetas. `notes` = filas de la tabla notes; `models` = JSON de col.models.
export function notesToCards(notes, models) {
  const byModel = new Map();
  for (const m of Object.values(models || {})) byModel.set(String(m.id), m);
  const cards = [];
  for (const n of notes) {
    const m = byModel.get(String(n.mid));
    if (!m) continue;
    const f = fieldMap(m.flds.map(x => x.name));
    if (f.word < 0 && f.front < 0) continue;
    const v = String(n.flds || '').split('\x1f');
    const at = i => (i >= 0 ? v[i] : '');
    const word = strip(at(f.word)) || strip(at(f.front));
    if (!word) continue;
    const rank = parseInt(strip(at(f.rank)), 10);
    cards.push({
      id: Number.isFinite(rank) ? rank : cards.length + 1,
      word,
      front: strip(at(f.front)) || word,
      defs: f.defs.map(i => strip(v[i])).filter(Boolean),
      forms: f.forms.map(i => strip(v[i])).filter(Boolean),
      sentence: strip(at(f.sentence)),
      translation: strip(at(f.translation)),
      wordAudio: soundOf(at(f.wordAudio)) || soundOf(at(f.word)) || soundOf(at(f.front)),
      sentenceAudio: soundOf(at(f.sentenceAudio)) || soundOf(at(f.sentence)),
      image: imageOf(at(f.image)),
    });
  }
  // Orden de frecuencia (la 1 es la más usada). Si se repite un índice, se renumera.
  cards.sort((a, b) => a.id - b.id);
  const seen = new Set();
  let next = (cards.at(-1)?.id || 0) + 1;
  for (const c of cards) { if (seen.has(c.id)) c.id = next++; seen.add(c.id); }
  return cards;
}

// Abre el .apkg: tarjetas + qué archivo del zip es cada audio o imagen.
export async function openApkg(file) {
  const zip = await readZip(file);
  const col = zip.get('collection.anki21') || zip.get('collection.anki2');
  if (!col) {
    if (zip.has('collection.anki21b')) throw new Error('Este .apkg viene en el formato nuevo de Anki. En Anki: Archivo → Exportar → marque «Compatibilidad con versiones antiguas» y vuelva a exportarlo.');
    throw new Error('El archivo no trae un mazo de Anki.');
  }
  const db = sqliteTables(await (await zipBlob(file, col)).arrayBuffer());
  if (!db.notes || !db.col) throw new Error('El mazo no tiene notas.');
  const colRow = db.col.rows()[0] || {};
  let models = {};
  try { models = JSON.parse(colRow.models || '{}'); } catch {}
  const cards = notesToCards(db.notes.rows(), models);
  if (!cards.length) throw new Error('No se encontraron palabras en el mazo.');
  // media: { "0": "have_word.mp3", … } → nombre del archivo → entrada del zip
  let mediaMap = {};
  const mediaEntry = zip.get('media');
  if (mediaEntry) {
    try { mediaMap = JSON.parse(await (await zipBlob(file, mediaEntry)).text()); }
    catch { throw new Error('Los audios del mazo vienen en el formato nuevo de Anki. En Anki: Archivo → Exportar → marque «Compatibilidad con versiones antiguas».'); }
  }
  const media = new Map();
  for (const [k, name] of Object.entries(mediaMap)) if (zip.has(k)) media.set(name, zip.get(k));
  const deckName = (() => {
    try { const d = Object.values(JSON.parse(colRow.decks || '{}')).find(x => x.name && x.name !== 'Default'); return d?.name || ''; } catch { return ''; }
  })();
  return { cards, media, zip, name: deckName || file.name.replace(/\.apkg$/i, '') };
}

export const MIME = { mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
export const mimeOf = name => MIME[String(name).split('.').pop().toLowerCase()] || '';
