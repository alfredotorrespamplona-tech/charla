// Labios al ritmo de la voz. La voz del teléfono no entrega el audio (no se puede medir el volumen):
// solo avisa qué palabra va diciendo. Por eso la boca se arma desde el texto:
//  · cada palabra se parte en sílabas aproximadas;
//  · cada vocal abre la boca con su forma: «a» abierta, «e»/«i» estirada, «o»/«u» redonda;
//  · las consonantes la cierran (m, b, p), muerden el labio (f, v), la redondean (w, sh, ch) o la dejan casi cerrada;
//  · las comas y los puntos son pausas con la boca cerrada.
// Todo se mide en «unidades» (≈ una sílaba); speech.js las pasa a milisegundos con el ritmo real de la voz
// y se vuelve a sincronizar cada vez que la voz avisa una palabra nueva. Sin DOM: se prueba con node.

export const REST = { open: 0, wide: 0.5, round: 0 };
const V = {
  a: { open: 0.85, wide: 0.6, round: 0 },
  e: { open: 0.5, wide: 0.85, round: 0 },
  i: { open: 0.3, wide: 1, round: 0 },
  o: { open: 0.68, wide: 0.2, round: 0.8 },
  u: { open: 0.32, wide: 0.05, round: 1 },
};
const C_CLOSED = { open: 0, wide: 0.45, round: 0 };      // m, b, p
const C_LIP = { open: 0.1, wide: 0.6, round: 0 };        // f, v
const C_ROUND = { open: 0.16, wide: 0.1, round: 0.85 };  // w, sh, ch, j
const C_OTHER = { open: 0.18, wide: 0.55, round: 0 };    // t, d, n, l, s, k, r…

// Cómo suenan algunas vocales dobles en inglés (aproximado: basta para que la boca se vea bien).
const PAIRS = { ee: 'i', ea: 'i', ie: 'i', ey: 'e', ay: 'e', ai: 'e', ei: 'e', oo: 'u', ou: 'a', ow: 'o', oa: 'o', oe: 'o', ew: 'u', ue: 'u', au: 'o', aw: 'o', oi: 'o', oy: 'o' };
const VOWEL = /[aeiouy]/;

export const UNIT = { vowel: 1, cons: 0.42, cluster: 0.6, gap: 0.12, comma: 1.6, stop: 2.6 };

function vowelShape(group) {
  const pair = PAIRS[group.slice(0, 2)];
  const k = pair || (group[0] === 'y' ? 'i' : group[0]);
  return V[k] || V.a;
}
function consonantShape(group) {
  if (/[mbp]/.test(group)) return C_CLOSED;
  if (/[fv]/.test(group)) return C_LIP;
  if (/w|sh|ch|j/.test(group)) return C_ROUND;
  return C_OTHER;
}

// Sílabas aproximadas de una palabra: [{shape, d}] (d en unidades).
export function wordShapes(word) {
  const w = String(word).toLowerCase().replace(/[^a-z0-9']/g, '');
  if (!w) return [];
  if (/\d/.test(w)) {                                   // números: «2», «10»… una sílaba por cifra
    return [...w.replace(/\D/g, '')].flatMap((_, i) => [{ shape: C_OTHER, d: UNIT.cons }, { shape: i % 2 ? V.e : V.a, d: UNIT.vowel }]);
  }
  let s = w.replace(/'/g, '');
  if (s.length > 3 && /[^aeiouy]e$/.test(s)) s = s.slice(0, -1);   // «make», «love»: la e final no suena
  const groups = s.match(/[aeiouy]+|[^aeiouy]+/g) || [];
  return groups.map(g => VOWEL.test(g[0])
    ? { shape: vowelShape(g), d: UNIT.vowel * (g.length > 2 ? 1.3 : 1) }
    : { shape: consonantShape(g), d: g.length > 1 ? UNIT.cluster : UNIT.cons });
}

// Pista completa del texto: frames [{u, d, shape}] y dónde empieza cada palabra (en letras y en unidades).
export function lipTrack(text) {
  const frames = [], words = [];
  let u = 0;
  const re = /([A-Za-z0-9']+)|([,;:—–-]+)|([.!?…]+)/g;
  let m;
  while ((m = re.exec(String(text)))) {
    if (m[1]) {
      words.push({ char: m.index, u });
      for (const f of wordShapes(m[1])) { frames.push({ u, d: f.d, shape: f.shape }); u += f.d; }
      frames.push({ u, d: UNIT.gap, shape: REST }); u += UNIT.gap;
    } else {
      const d = m[2] ? UNIT.comma : UNIT.stop;
      frames.push({ u, d, shape: REST }); u += d;
    }
  }
  return { frames, words, units: u };
}

const lerp = (a, b, t) => a + (b - a) * t;
export function mixShape(a, b, t) {
  return { open: lerp(a.open, b.open, t), wide: lerp(a.wide, b.wide, t), round: lerp(a.round, b.round, t) };
}

// Forma de la boca en el punto pos (en unidades). Al final de cada sílaba se mezcla con la siguiente,
// como hace la boca de verdad (coarticulación).
export function sampleAt(track, pos) {
  const f = track.frames;
  if (!f.length || pos < 0 || pos >= track.units) return REST;
  let lo = 0, hi = f.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (f[mid].u <= pos) lo = mid; else hi = mid - 1; }
  const cur = f[lo], next = f[lo + 1]?.shape || REST;
  const t = (pos - cur.u) / cur.d;
  return t > 0.6 ? mixShape(cur.shape, next, (t - 0.6) / 0.4) : cur.shape;
}

// Índice de la palabra que empieza en charIndex (o la última que empezó antes).
export function wordAt(track, charIndex) {
  let i = -1;
  for (let k = 0; k < track.words.length; k++) { if (track.words[k].char <= charIndex) i = k; else break; }
  return i;
}

// Reloj de la boca: convierte tiempo en posición. Empieza con el ritmo estimado (msPerUnit) y se
// corrige con cada aviso de palabra de la voz (boundary): se ajusta el ritmo y no se adelanta a la voz.
export function lipClock(track, msPerUnit) {
  let anchorU = 0, anchorT = 0, started = false, heard = -1, firstT = 0, firstU = 0, unitMs = msPerUnit;
  return {
    start(t) { anchorT = t; anchorU = 0; started = true; },
    get msPerUnit() { return unitMs; },
    word(charIndex, t) {
      const i = wordAt(track, charIndex);
      if (i < 0 || i <= heard) return;
      const u = track.words[i].u;
      if (heard < 0) { firstT = t; firstU = u; }
      else if (u - firstU > 1.5) {
        const seen = (t - firstT) / (u - firstU);
        unitMs = Math.min(msPerUnit * 2.2, Math.max(msPerUnit * 0.45, seen));
      }
      heard = i;
      anchorU = u; anchorT = t;
    },
    pos(t) {
      if (!started) return -1;
      let p = anchorU + (t - anchorT) / unitMs;
      // Si la voz avisa las palabras, la boca no pasa a la siguiente hasta que la voz llegue a ella.
      if (heard >= 0) { const next = track.words[heard + 1]; if (next && p > next.u - 0.05) p = next.u - 0.05; }
      return p;
    },
  };
}
