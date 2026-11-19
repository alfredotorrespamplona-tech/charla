// Labios al ritmo de la voz. La voz del teléfono no entrega el audio (no se puede medir el volumen):
// a lo sumo avisa qué palabra va diciendo, y en algunos teléfonos ni eso. Por eso la boca se arma desde el texto:
//  · una apertura por SÍLABA (como habla la gente: unas 4 o 5 por segundo), no una por letra;
//  · la vocal da la forma: «a» abierta, «e»/«i» estirada, «o»/«u» redonda; dentro de la sílaba la forma
//    no cambia, solo cuánto se abre (así no se ve nerviosa);
//  · solo m, b y p cierran del todo; las demás consonantes la entrecierran;
//  · las comas y los puntos son pausas con la boca cerrada.
// El ritmo: se mide cuánto dura cada frase en ESTE teléfono y se aprende (ms por unidad, ≈ una sílaba).
// Si la voz avisa las palabras, además se re-sincroniza en cada una y la boca nunca se adelanta.
// Sin DOM: se prueba con node.

export const REST = { open: 0, wide: 0.5, round: 0 };
const V = {
  a: { open: 0.85, wide: 0.55, round: 0 },
  e: { open: 0.6, wide: 0.7, round: 0 },
  i: { open: 0.45, wide: 0.8, round: 0 },
  o: { open: 0.7, wide: 0.35, round: 0.5 },
  u: { open: 0.45, wide: 0.25, round: 0.65 },
};
const CLOSED = { open: 0, wide: 0.5, round: 0 };          // m, b, p

// Cómo suenan algunas vocales dobles en inglés (aproximado: basta para que la boca se vea bien).
const PAIRS = { ee: 'i', ea: 'i', ie: 'i', ey: 'e', ay: 'e', ai: 'e', ei: 'e', oo: 'u', ou: 'a', ow: 'o', oa: 'o', oe: 'o', ew: 'u', ue: 'u', au: 'o', aw: 'o', oi: 'o', oy: 'o' };

export const UNIT = { syllable: 1, onset: 0.28, coda: 0.3, gap: 0.1, comma: 1.4, stop: 2.4 };

function vowelShape(group) {
  const k = PAIRS[group.slice(0, 2)] || (group[0] === 'y' ? 'i' : group[0]);
  return V[k] || V.a;
}
// Consonantes antes o después de la vocal: cierran (m, b, p), muerden el labio (f, v) o entrecierran
// manteniendo la forma de la vocal (para que la boca no cambie de forma a cada letra).
function consonant(group, vowel) {
  if (/[mbp]/.test(group)) return CLOSED;
  if (/[fv]/.test(group)) return { open: 0.1, wide: vowel.wide, round: 0 };
  if (/w|sh|ch|j/.test(group)) return { open: vowel.open * 0.35, wide: Math.min(vowel.wide, 0.35), round: Math.max(vowel.round, 0.5) };
  return { open: vowel.open * 0.4, wide: vowel.wide, round: vowel.round };
}

// Sílabas de una palabra: [{shape, d}] (d en unidades). Cada sílaba: consonantes de entrada (corto) + vocal.
export function wordShapes(word) {
  const w = String(word).toLowerCase().replace(/[^a-z0-9']/g, '');
  if (!w) return [];
  if (/\d/.test(w)) {                                   // números: «2», «10»… una sílaba por cifra
    return [...w.replace(/\D/g, '')].flatMap((_, i) => {
      const v = i % 2 ? V.e : V.a;
      return [{ shape: consonant('t', v), d: UNIT.onset }, { shape: v, d: UNIT.syllable }];
    });
  }
  let s = w.replace(/'/g, '');
  if (s.length > 3 && /[^aeiouy]e$/.test(s)) s = s.slice(0, -1);   // «make», «love»: la e final no suena
  const groups = s.match(/[aeiouy]+|[^aeiouy]+/g) || [];
  const out = [];
  let onset = '';
  for (let k = 0; k < groups.length; k++) {
    const g = groups[k];
    if (/[aeiouy]/.test(g[0])) {
      const v = vowelShape(g);
      if (onset) out.push({ shape: consonant(onset, v), d: onset.length > 1 ? UNIT.onset * 1.4 : UNIT.onset });
      out.push({ shape: v, d: UNIT.syllable * (g.length > 2 ? 1.25 : 1) });
      onset = '';
    } else if (k === groups.length - 1 && out.length) {
      const last = out[out.length - 1].shape;           // consonantes del final: «dogs», «want»
      out.push({ shape: consonant(g, last), d: UNIT.coda * (g.length > 1 ? 1.3 : 1) });
    } else onset = g;
  }
  if (!out.length && onset) out.push({ shape: consonant(onset, V.e), d: UNIT.onset }, { shape: { open: 0.3, wide: 0.6, round: 0 }, d: 0.6 });
  return out;
}

// Pista completa del texto: frames [{u, d, shape}], dónde empieza y termina cada palabra (en letras y en
// unidades) y dónde termina de hablar (end: sin la pausa del punto final).
export function lipTrack(text) {
  const frames = [], words = [];
  let u = 0;
  const re = /([A-Za-z0-9']+)|([,;:—–-]+)|([.!?…]+)/g;
  let m;
  while ((m = re.exec(String(text)))) {
    if (m[1]) {
      const start = u;
      for (const f of wordShapes(m[1])) { frames.push({ u, d: f.d, shape: f.shape }); u += f.d; }
      words.push({ char: m.index, u: start, end: u, pauseAfter: false });
      frames.push({ u, d: UNIT.gap, shape: REST }); u += UNIT.gap;
    } else {
      const d = m[2] ? UNIT.comma : UNIT.stop;
      if (words.length) words[words.length - 1].pauseAfter = true;
      frames.push({ u, d, shape: REST }); u += d;
    }
  }
  const end = words.length ? words[words.length - 1].end : 0;
  return { frames, words, units: u, end };
}

const lerp = (a, b, t) => a + (b - a) * t;
export function mixShape(a, b, t) {
  return { open: lerp(a.open, b.open, t), wide: lerp(a.wide, b.wide, t), round: lerp(a.round, b.round, t) };
}

// Forma de la boca en el punto pos (en unidades). Al final de cada tramo se mezcla con el siguiente,
// como hace la boca de verdad.
export function sampleAt(track, pos) {
  const f = track.frames;
  if (!f.length || pos < 0 || pos >= track.units) return REST;
  let lo = 0, hi = f.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (f[mid].u <= pos) lo = mid; else hi = mid - 1; }
  const cur = f[lo], next = f[lo + 1]?.shape || REST;
  const t = (pos - cur.u) / cur.d;
  return t > 0.65 ? mixShape(cur.shape, next, (t - 0.65) / 0.35) : cur.shape;
}

// Mientras la voz sigue sonando pero la pista ya terminó (la voz va más lenta de lo calculado):
// la boca sigue hablando suave en vez de quedarse cerrada.
export function babble(t) {
  const s = Math.abs(Math.sin(t / 105));
  return { open: 0.12 + 0.45 * s, wide: 0.55, round: 0.05 };
}

// Índice de la palabra que empieza en charIndex (o la última que empezó antes).
export function wordAt(track, charIndex) {
  let i = -1;
  for (let k = 0; k < track.words.length; k++) { if (track.words[k].char <= charIndex) i = k; else break; }
  return i;
}

// Reloj de la boca: convierte tiempo en posición (unidades). Empieza con el ritmo aprendido (msPerUnit);
// si la voz avisa las palabras (boundary), cada aviso lo re-sincroniza y corrige el ritmo, y la boca espera
// a la voz en la última sílaba de la palabra (o en la pausa de la coma), sin adelantarse.
export function lipClock(track, msPerUnit) {
  let started = false, unitMs = msPerUnit, heard = -1, anchorU = 0, anchorT = 0, lastU = 0, lastT = 0;
  return {
    start(t) { started = true; anchorT = t; anchorU = 0; },
    get msPerUnit() { return unitMs; },
    get heard() { return heard >= 0; },
    word(charIndex, t) {
      const i = wordAt(track, charIndex);
      if (!started || i < 0 || i <= heard) return;
      const u = track.words[i].u;
      if (heard >= 0 && u > lastU) {
        const seen = (t - lastT) / (u - lastU);
        unitMs = unitMs * 0.5 + Math.min(msPerUnit * 2.5, Math.max(msPerUnit * 0.4, seen)) * 0.5;
      }
      heard = i; lastU = u; lastT = t;
      anchorU = u; anchorT = t;
    },
    pos(t) {
      if (!started) return -1;
      let p = anchorU + (t - anchorT) / unitMs;
      if (heard >= 0) {
        const w = track.words[heard], next = track.words[heard + 1];
        if (next) p = Math.min(p, w.pauseAfter ? next.u - 0.05 : w.end - 0.02);
      }
      return p;
    },
  };
}

// Ms por unidad medidos en una frase completa (a velocidad 1), o null si la medida no sirve.
export function measuredUnitMs(track, ms, rate = 1) {
  if (!track.end || track.end < 6 || ms < 600) return null;
  const v = (ms / track.end) * (rate || 1);
  return v >= 60 && v <= 420 ? v : null;
}
