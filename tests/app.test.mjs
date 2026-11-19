// Pruebas automáticas: el algoritmo (puntos, estrellas, racha, nivel, familiaridad), la pronunciación
// y la coherencia del contenido. Ejecutar desde la carpeta charla:  node --test tests/
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// El código es para el navegador: simulamos lo mínimo que usa al importarse.
const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
globalThis.window = {};

const store = await import('../js/store.js');
const scoring = await import('../js/scoring.js');
const data = await import('../js/data.js');
const { compareWords, verdict } = await import('../js/pronounce.js');
const { timeOfDay } = await import('../js/prompts.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const day = (y, m, d) => new Date(y, m - 1, d, 12); // mediodía local: evita problemas de zona horaria

beforeEach(() => store.reset());

// ---------------- Puntos por turno ----------------
test('turno escrito: no gana fluidez (no hay duración de voz)', () => {
  const ev = scoring.scoreTurn({ text: 'I would like a large coffee please', durationMs: 0, delayMs: 1000, usedSuggestion: false, analysis: { grammar: 'Perfect' }, objectivesCompleted: 0, sessionWords: new Set(), bookmarksUsed: 0 });
  assert.equal(ev.fluency, 0);
  assert.equal(ev.base, 10);           // 10 × (0.6 + 4×0.1)
  assert.equal(ev.vocabulary, 7);      // 7 palabras nuevas
  assert.equal(ev.total, 17);
});

test('turno hablado rápido y sin demora: fluidez excelente', () => {
  const text = 'well I think we should take the earlier train because it is cheaper';
  const ev = scoring.scoreTurn({ text, durationMs: 6000, delayMs: 1500, usedSuggestion: false, analysis: { grammar: 'MostlyCorrect' }, objectivesCompleted: 1, sessionWords: new Set(), bookmarksUsed: 1 });
  assert.ok(ev.wpm >= 90);
  assert.equal(ev.fluency, 6);
  assert.equal(ev.excellentFluency, true);
  assert.equal(ev.objective, 30);
  assert.equal(ev.bookmark, 5);
});

test('en español (WrongLanguage) no da puntos', () => {
  const ev = scoring.scoreTurn({ text: 'quiero un cafe', durationMs: 2000, delayMs: 0, usedSuggestion: false, analysis: { grammar: 'WrongLanguage' }, objectivesCompleted: 0, sessionWords: new Set(), bookmarksUsed: 0 });
  assert.equal(ev.total, 0);
});

test('usar una sugerencia reduce el vocabulario a la mitad y quita la fluidez', () => {
  const ev = scoring.scoreTurn({ text: 'Could I get a cappuccino please', durationMs: 2000, delayMs: 500, usedSuggestion: true, analysis: { grammar: 'Perfect' }, objectivesCompleted: 0, sessionWords: new Set(), bookmarksUsed: 0 });
  assert.equal(ev.vocabulary, 3); // 6 nuevas / 2
  assert.equal(ev.fluency, 0);
});

test('las palabras repetidas en la sesión no vuelven a sumar vocabulario', () => {
  const seen = new Set();
  const a = scoring.scoreTurn({ text: 'hello there friend', durationMs: 0, delayMs: 0, usedSuggestion: false, analysis: null, objectivesCompleted: 0, sessionWords: seen, bookmarksUsed: 0 });
  const b = scoring.scoreTurn({ text: 'hello there friend', durationMs: 0, delayMs: 0, usedSuggestion: false, analysis: null, objectivesCompleted: 0, sessionWords: seen, bookmarksUsed: 0 });
  assert.equal(a.vocabulary, 3);
  assert.equal(b.vocabulary, 0);
});

// ---------------- Cierre de sesión ----------------
function fakeSession(turnPoints, { objectives = 0 } = {}) {
  const character = data.CHARACTERS.maya;
  const place = data.PLACES[0];
  const mission = { ...place.missions[0] };
  return {
    id: 't', place, character, mission, history: [], completed: new Set(mission.objectives.slice(0, objectives).map(o => o.id)),
    affection: 4, startedAt: Date.now() - 120000,
    turns: turnPoints.map(total => ({ text: 'some words here', durationMs: 3000, delayMs: 1000, usedSuggestion: false, analysis: { grammar: 'MostlyCorrect' }, points: { base: total, wpm: 60 } })),
  };
}

test('estrellas según los umbrales y bono del nivel', () => {
  store.update(s => { s.rank = 3; s.highestRank = 3; });
  const sum = scoring.finishSession(fakeSession([30, 30, 30, 30]));   // 120 brutos
  const mod = data.levelSettings(3, {}).scoreModifier;
  assert.equal(mod, data.rankById(3).scoreModifier);
  assert.equal(sum.score.levelBonus, Math.round(120 * (mod - 1)));
  const expectedStars = scoring.STAR_THRESHOLDS.filter(t => sum.score.total >= t).length;
  assert.equal(sum.stars, expectedStars);
  assert.equal(store.get().history.length, 1);
  assert.equal(sum.streak.qualified, true);   // 4 turnos ≥ 3
});

test('menos de 3 turnos no cuenta para la racha', () => {
  const sum = scoring.finishSession(fakeSession([20, 20]));
  assert.equal(sum.streak.qualified, false);
  assert.equal(store.get().streak.count, 0);
});

test('la relación sube un nivel cada 10 de cariño', () => {
  store.update(() => { store.relationship('maya').affection = 8; });
  const sum = scoring.finishSession(fakeSession([20, 20, 20]));      // +4 de la sesión +3 por calificar
  assert.equal(sum.relationship.after.affection, 15);
  assert.equal(sum.relationship.after.level, 1);
});

test('desbloquea el siguiente nivel al juntar estrellas y propone subir', () => {
  store.update(s => { s.starsTowardUnlock = data.STARS_TO_UNLOCK_NEXT_LEVEL - 1; });
  const sum = scoring.finishSession(fakeSession([100, 100, 100]));
  assert.equal(sum.levelUnlocked, 2);
  assert.equal(store.get().highestRank, 2);
  assert.equal(store.get().rank, 1);                       // no sube solo: se le propone
  assert.deepEqual(sum.rankProposal, { from: 1, to: 2, kind: 'up' });
  scoring.setLevel(2);
  assert.equal(store.get().rank, 2);
  assert.equal(store.get().rankProposal, null);
});

test('las charlas de menos de 2 estrellas no suman para subir', () => {
  const sum = scoring.finishSession(fakeSession([20, 20, 20]));   // 60 → 1 estrella
  assert.equal(sum.stars, 1);
  assert.equal(sum.starsCounted, false);
  assert.equal(store.get().starsTowardUnlock, 0);
});

test('sin candados: se puede elegir cualquier nivel, aunque datos viejos los traigan puestos', () => {
  store.update(s => { s.settings.levelLocks = true; s.rank = 1; s.highestRank = 1; });
  scoring.setLevel(5);
  assert.equal(store.get().rank, 5);
  store.importJson(JSON.stringify({ ...store.get(), settings: { ...store.get().settings, levelLocks: true } }));
  assert.equal(store.get().settings.levelLocks, undefined);
});

test('la primera charla ajusta el nivel de la autoevaluación', () => {
  store.update(s => { s.rank = 2; s.highestRank = 2; s.placementPending = true; });
  const ses = fakeSession([30, 30, 30]);
  ses.turns.forEach(t => { t.analysis = { grammar: 'ManyMistakes' }; });
  const sum = scoring.finishSession(ses);
  assert.deepEqual(sum.placement, { from: 2, to: 1 });
  assert.equal(store.get().rank, 1);
  assert.equal(store.get().placementPending, false);
  assert.equal(sum.rankProposal, null);
});

test('ajustes del nivel y multiplicador al personalizar', () => {
  const l1 = data.levelSettings(1, {});
  assert.equal(l1.speed, 'verySlow');
  assert.equal(l1.suggestionMs, 1000);
  assert.equal(data.levelSettings(5, {}).suggestionMs, 0);   // solo si las pide
  const harder = data.levelSettings(1, { speed: 'medium', response: 'after' });   // 2 + 1 pasos más difícil
  assert.equal(harder.scoreModifier, +(1 + 3 * data.SETTING_STEP_BONUS).toFixed(2));
  const easier = data.levelSettings(3, { speed: 'verySlow' });
  assert.ok(easier.scoreModifier < data.rankById(3).scoreModifier);
  assert.equal(data.levelSettings(1, { speed: 'nope' }).speed, 'verySlow');    // valor desconocido → el del nivel
});

// ---------------- Racha y protectores ----------------
test('racha: días seguidos suman, el mismo día no repite', () => {
  assert.equal(scoring.updateStreak(day(2026, 3, 1)).current, 1);
  assert.equal(scoring.updateStreak(day(2026, 3, 2)).current, 2);
  const again = scoring.updateStreak(day(2026, 3, 2));
  assert.equal(again.current, 2);
  assert.equal(again.firstToday, false);
});

test('racha: si falta un día sin protector, vuelve a 1', () => {
  scoring.updateStreak(day(2026, 3, 1));
  scoring.updateStreak(day(2026, 3, 2));
  assert.equal(scoring.streakStatus(day(2026, 3, 4)).count, 0);
  assert.equal(scoring.updateStreak(day(2026, 3, 4)).current, 1);
});

test('racha: el protector cubre el día perdido y se gasta', () => {
  scoring.updateStreak(day(2026, 3, 1));
  store.update(s => { s.streak.freezes = 1; });
  assert.equal(scoring.streakStatus(day(2026, 3, 3)).count, 1);
  const r = scoring.updateStreak(day(2026, 3, 3));
  assert.equal(r.current, 2);
  assert.equal(r.freezesUsed, 1);
  assert.equal(store.get().streak.freezes, 0);
});

test('uso personal: el protector de racha es gratis y tiene máximo', () => {
  assert.equal(scoring.buyFreeze().ok, true);                        // sin monedas igual se puede
  assert.equal(scoring.buyFreeze().ok, true);
  assert.equal(scoring.buyFreeze().ok, false);                       // máximo
  assert.equal(store.get().streak.freezes, scoring.MAX_FREEZES);
  assert.equal(store.get().coins, 0);
});

test('datos guardados de versiones anteriores reciben los campos nuevos', () => {
  store.importJson(JSON.stringify({ settings: { apiKey: 'x' }, rank: 3, difficulty: 2, highestDifficulty: 4, streak: { count: 3, record: 5, lastDate: '2026-01-01' } }));
  assert.equal(store.get().streak.freezes, 0);
  assert.equal(store.get().highestRank, 3);
  assert.equal(store.get().difficulty, undefined);
  assert.deepEqual(store.get().levelCustom, {});
  assert.equal(store.get().settings.model, 'deepseek-flash');
  assert.deepEqual(store.get().temario, { best: {}, exam: {}, say: {} });
  store.importJson(JSON.stringify({ settings: { apiKey: 'x' }, rank: 3, temario: { best: { 'b1-if2': 0.9 } } }));
  assert.deepEqual(store.get().temario, { best: { 'b1-if2': 0.9 }, exam: {}, say: {} });
  assert.throws(() => store.importJson('{"foo":1}'));
});

// ---------------- Nivel ----------------
test('propone bajar de nivel tras 3 malas sesiones (subir depende de las estrellas)', () => {
  const entry = (g, stars) => ({ rank: 2, stars, stats: { turns: 5, avgGrammar: g } });
  store.update(s => { s.rank = 2; s.highestRank = 2; s.history = [entry(3.5, 3), entry(3.4, 2), entry(3.3, 2)]; });
  assert.equal(scoring.evaluateRank(), null);
  store.update(s => { s.history = [entry(1, 0), entry(1.2, 1), entry(1.3, 0)]; s.rankProposal = null; });
  assert.deepEqual(scoring.evaluateRank(), { from: 2, to: 1, kind: 'down' });
  store.update(s => { s.history = [entry(2.5, 2), entry(2.5, 1)]; s.rankProposal = null; });
  assert.equal(scoring.evaluateRank(), null);
});

// ---------------- Vocabulario ----------------
test('familiaridad: sube de nivel y se mantiene entre 0 y 100', () => {
  store.update(s => { s.vocab = [{ id: 'v1', text: 'take off', score: 20 }]; });
  const u = scoring.bumpFamiliarity('v1', scoring.FAMILIARITY.usedInSpeech);
  assert.equal(u.tierUp, true);
  assert.equal(scoring.tierFor(u.toScore).key, 'Familiar');
  scoring.bumpFamiliarity('v1', 500);
  assert.equal(store.get().vocab[0].score, 100);
  scoring.bumpFamiliarity('v1', -500);
  assert.equal(store.get().vocab[0].score, 0);
});

test('encuentra palabras guardadas dentro de una frase', () => {
  store.update(s => { s.vocab = [{ id: 'a', text: 'take off', score: 0 }, { id: 'b', text: 'cab', score: 0 }]; });
  const found = scoring.findBookmarks('Our plane will take off soon, then grab a taxi.');
  assert.deepEqual(found.map(v => v.id), ['a']);
});

// ---------------- Pronunciación ----------------
test('pronunciación: compara palabra por palabra sin importar mayúsculas ni signos', () => {
  const r = compareWords("I'd like a large latte, please.", 'id like a large latte please');
  assert.equal(r.matched.filter(Boolean).length, 5);   // "I'd" ≠ "id"
  assert.equal(r.score, 83);
  assert.equal(compareWords('Good morning', 'good morning').score, 100);
  assert.equal(compareWords('Good morning', '').score, 0);
  assert.equal(verdict(95).cls, 'good');
  assert.equal(verdict(10).cls, 'bad');
});

test('hora del día para el personaje', () => {
  assert.match(timeOfDay(new Date(2026, 10, 17, 8, 5)), /Tuesday morning \(08:05\)/);
  assert.match(timeOfDay(new Date(2026, 10, 17, 20, 0)), /evening/);
});

// ---------------- Contenido ----------------
test('contenido: personajes, lugares y misiones son coherentes', () => {
  const ids = new Set();
  for (const p of data.PLACES) {
    assert.ok(p.characters.length > 0, `${p.id} sin personajes`);
    for (const c of p.characters) assert.ok(data.CHARACTERS[c], `${p.id}: personaje ${c} no existe`);
    assert.ok(p.missions.length >= 3, `${p.id}: necesita al menos 3 misiones para el sorteo`);
    for (const m of p.missions) {
      assert.ok(!ids.has(m.id), `misión repetida: ${m.id}`);
      ids.add(m.id);
      for (const k of ['icon', 'name', 'description', 'instruction']) assert.ok(m[k], `${m.id} sin ${k}`);
      const objIds = m.objectives.map(o => o.id);
      assert.equal(new Set(objIds).size, objIds.length, `${m.id}: objetivos repetidos`);
      assert.ok(Array.isArray(m.expressions));
    }
  }
  for (const c of Object.values(data.CHARACTERS)) {
    assert.ok(data.PLACES.some(p => p.characters.includes(c.id)), `${c.id} no está en ningún lugar`);
    for (const k of ['name', 'age', 'profession', 'hometown', 'personality', 'style']) assert.ok(c[k], `${c.id} sin ${k}`);
  }
});

test('contenido: cada avatar con imágenes tiene sus 4 cuadros', () => {
  for (const id of data.WITH_IMAGES) {
    for (const f of ['neutral', 'talk', 'blink', 'happy', 'mini']) {
      assert.ok(existsSync(join(ROOT, 'avatars', id, `${f}.webp`)), `falta avatars/${id}/${f}.webp`);
    }
  }
});

test('el service worker guarda todos los módulos de la app', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  for (const f of readdirSync(join(ROOT, 'js'))) assert.ok(sw.includes(`'js/${f}'`), `sw.js no incluye js/${f}`);
  for (const f of readdirSync(join(ROOT, 'icons'))) assert.ok(sw.includes(`'icons/${f}'`), `sw.js no incluye icons/${f}`);
});

test('contenido: cada lugar con escena tiene su imagen', () => {
  for (const id of data.WITH_SCENES) {
    const p = data.PLACES.find(x => x.id === id);
    assert.ok(p, `escena para un lugar que no existe: ${id}`);
    assert.ok(existsSync(join(ROOT, p.image)), `falta ${p.image}`);
  }
});

test('mapa de la ciudad: imagen y puntos dentro del mapa (los demás lugares salen debajo)', () => {
  if (!data.CITY_MAP) return;
  assert.ok(existsSync(join(ROOT, data.CITY_MAP.image)), `falta ${data.CITY_MAP.image}`);
  for (const p of data.PLACES) {
    const s = data.CITY_MAP.spots[p.id];
    if (!s) continue;
    assert.ok(s.every(v => v >= 3 && v <= 97), `punto de ${p.id} fuera del mapa`);
  }
});

test('voz: une los resultados y quita las repeticiones de Android', async () => {
  const { joinResults } = await import('../js/speech.js');
  assert.equal(joinResults(['I want', ' a coffee'], false), 'I want a coffee');
  assert.equal(joinResults(['I want', 'I want a coffee', 'I want a coffee please'], true), 'I want a coffee please');
  assert.equal(joinResults(['I want a coffee', 'a coffee'], true), 'I want a coffee');
  assert.equal(joinResults(['hello', '', 'there'], true), 'hello there');
});

test('voz: espera más antes de la primera palabra y no se queda colgada leyendo', async () => {
  const { WAIT_FIRST_WORD_MS, WAIT_AFTER_SPEECH_MS, maxSpeechMs } = await import('../js/speech.js');
  assert.ok(WAIT_FIRST_WORD_MS >= 3 * WAIT_AFTER_SPEECH_MS);
  assert.ok(maxSpeechMs('Hi there, how are you?') < 10000);
  assert.ok(maxSpeechMs('word '.repeat(40), 0.55) > 30000); // lento: más margen
});

test('voz del teléfono: prefiere las naturales y evita las robóticas', async () => {
  const { voiceQuality } = await import('../js/speech.js');
  const v = (name, lang = 'en-US', localService = true) => ({ name, voiceURI: name, lang, localService });
  assert.ok(voiceQuality(v('Microsoft Ava Online (Natural) - English (United States)', 'en-US', false)) > voiceQuality(v('Google US English', 'en-US', false)));
  assert.ok(voiceQuality(v('Google US English', 'en-US', false)) > voiceQuality(v('Microsoft Zira - English (United States)')));
  assert.ok(voiceQuality(v('Microsoft David - English (United States)')) > voiceQuality(v('eSpeak English')));
  // Android: la voz "de red" de Google suena mejor que la local.
  assert.ok(voiceQuality(v('en-us-x-iol-network', 'en-US', false)) > voiceQuality(v('en-us-x-iol-local')));
  const { voiceLabel } = await import('../js/speech.js');
  assert.match(voiceLabel(v('Microsoft Ava Online (Natural) - English (United States)', 'en-US', false)), /^⭐ .*en línea$/);
  assert.doesNotMatch(voiceLabel(v('eSpeak English')), /⭐/);
});

test('voz natural: guarda frases ya dichas sin pasarse de memoria', async () => {
  const nv = await import('../js/natural-voice.js');
  const ch = n => [{ pcm: new Float32Array(n), rate: 24000 }];
  nv.cachePut('a', ch(24000 * 20));
  nv.cachePut('b', ch(24000 * 20));
  assert.ok(nv.cacheGet('a'));                 // 'a' recién usada: queda al final
  nv.cachePut('c', ch(24000 * 25));            // se pasa de 60 s: sale la menos usada ('b')
  assert.equal(nv.cacheGet('b'), undefined);
  assert.ok(nv.cacheGet('a') && nv.cacheGet('c'));
  assert.ok(nv.cacheSize().samples <= 24000 * 60);
  nv.cachePut('enorme', ch(24000 * 40));       // una sola frase de más de 30 s no se guarda
  assert.equal(nv.cacheGet('enorme'), undefined);
});

test('voz natural: en celulares usa el modelo liviano', async () => {
  const src = (await import('node:fs')).readFileSync(join(ROOT, 'js/natural-worker.js'), 'utf8');
  const body = src.slice(src.indexOf('export function isMobile'), src.indexOf('async function pickDevice'));
  const isMobile = new Function(`return (${body.replace('export function isMobile', 'function')})`)();
  assert.ok(isMobile({ userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) Chrome/131 Mobile Safari/537.36' }));
  assert.ok(isMobile({ userAgentData: { mobile: true }, userAgent: '' }));
  assert.ok(!isMobile({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131 Safari/537.36' }));
  assert.match(src, /if \(isMobile\(\)\) return \{ device: 'wasm', dtype: 'q8' \}/);
});

test('voz natural: cada personaje tiene una voz buena de Kokoro', async () => {
  const { NATURAL_VOICES, naturalVoiceFor } = await import('../js/natural-voice.js');
  const ids = new Set(NATURAL_VOICES.map(v => v.id));
  for (const c of Object.values(data.CHARACTERS)) {
    assert.ok(ids.has(c.tts), `${c.id} sin voz natural válida`);
    const v = NATURAL_VOICES.find(x => x.id === c.tts);
    assert.equal(v.gender, c.voice.gender, `${c.id}: la voz no coincide con el género`);
  }
  assert.equal(naturalVoiceFor(data.CHARACTERS.maya, 'bf_emma'), 'bf_emma'); // la elegida en Ajustes manda
  assert.equal(naturalVoiceFor({ voice: { gender: 'male' } }, ''), 'am_michael');
});

// ---------------- Pistas de pronunciación ----------------
test('pistas de pronunciación: una por palabra y según el nivel', async () => {
  const { alignHints, tokenize } = await import('../js/hints.js');
  const toks = tokenize("Hi! I'd like a cappuccino, please.");
  assert.equal(toks.length, 6);
  // Mismo largo: por orden.
  assert.deepEqual(alignHints(['a', 'b'], [{ w: 'a', say: 'ei' }, { w: 'b', say: 'bi' }]), ['ei', 'bi']);
  // El modelo se saltó una palabra: se alinea por la palabra y la que falta queda vacía.
  assert.deepEqual(alignHints(['Hi!', "I'd", 'like'], [{ w: 'hi', say: 'jai' }, { w: 'like', say: 'laik' }]), ['jai', '', 'laik']);
  assert.deepEqual(alignHints(['x'], null), ['']);
  assert.equal(data.levelSettings(1, {}).pronunciation, 'auto');
  assert.equal(data.levelSettings(4, {}).pronunciation, 'request');
  // Apagarlas es más difícil: suma al multiplicador.
  assert.ok(data.levelSettings(4, { pronunciation: 'off' }).scoreModifier > data.rankById(4).scoreModifier);
});

// ---------------- Practicar antes de enviar ----------------
test('pronunciación: verde, ámbar (casi) y rojo por palabra', async () => {
  const { wordStates, similarity } = await import('../js/pronounce.js');
  assert.ok(similarity('cappuccino', 'capuccino') >= 0.6);
  assert.ok(similarity('please', 'table') < 0.6);
  const r = wordStates("I'd like a cappuccino please", 'like a capuchino')
  assert.deepEqual(r.states, ['miss', 'ok', 'ok', 'close', 'miss']);
});

// ---------------- Repaso con 3 tipos de tarjeta ----------------
test('repaso: el tipo de tarjeta sube con la familiaridad', async () => {
  const rv = await import('../js/review.js');
  assert.equal(rv.familyFor(0), 'meaning');
  assert.equal(rv.familyFor(30), 'completion');
  assert.equal(rv.familyFor(70), 'recall');
  const vocab = [
    { id: 'a', text: 'latte', score: 10 }, { id: 'b', text: 'to go', score: 60 },
    { id: 'c', text: 'done', score: 90 }, { id: 'd', text: 'skip me', score: 0, noReview: true },
  ];
  const items = rv.pickItems(vocab);
  assert.deepEqual(items.map(i => [i.text, i.family]), [['latte', 'meaning'], ['to go', 'recall'], ['done', 'recall']]);  // sin fecha: tocan todas
  assert.ok(rv.validCard({ family: 'meaning', sentence: 'A latte, please.', answer: 'café', options: ['café', 'mesa'] }));
  assert.ok(rv.validCard({ family: 'completion', sentence: 'A {{gap}}, please.', answer: 'latte', options: ['latte'] }));
  assert.ok(!rv.validCard({ family: 'completion', sentence: 'no gap', answer: 'x', options: [] }));
  assert.ok(rv.validCard({ family: 'recall', prompt: 'Para llevar, por favor.', answer: 'To go, please.' }));
  assert.ok(rv.recallOk('to go', 'Can I get it to go please'));
  assert.ok(!rv.recallOk('to go', 'for here please'));
});

// ---------------- Transcripción ----------------
test('transcripción: se guarda con las correcciones y solo en las últimas charlas', async () => {
  const ses = fakeSession([30, 30, 30]);
  ses.history = [{ role: 'character', text: 'Hi!' }, { role: 'learner', text: 'I want coffee' }, { role: 'character', text: 'Sure.' }];
  ses.turns[0].historyIndex = 1;
  ses.turns[0].analysis = { grammar: 'SomeMistakes', has_feedback: true, corrected: 'I want a coffee', better: "I'd like a coffee", explanation: 'Falta «a».' };
  const sum = scoring.finishSession(ses);
  assert.equal(sum.transcript.length, 3);
  assert.equal(sum.transcript[1].grade, 'SomeMistakes');
  assert.equal(sum.transcript[1].fix.better, "I'd like a coffee");
  assert.equal(sum.transcript[0].fix, undefined);
  const { transcriptText } = await import('../js/transcript.js');
  const txt = transcriptText(sum.transcript, { characterName: 'Maya', learnerName: 'Ana' });
  assert.match(txt, /Maya: Hi!/);
  assert.match(txt, /Ana: I want coffee\n {3}✏️ I want a coffee/);
  store.update(s => { s.history = Array.from({ length: scoring.TRANSCRIPTS_KEPT + 5 }, () => ({ ...sum })); });
  scoring.finishSession(fakeSession([10, 10, 10]));
  const h = store.get().history;
  assert.equal(h.filter(x => x.transcript).length, scoring.TRANSCRIPTS_KEPT);
  assert.ok(h.at(-1).transcript);
});

// ---------------- Lecciones: todos los lugares de LingoLooper y 3 niveles por misión ----------------
test('lecciones: los 10 tipos de lugar de LingoLooper están cubiertos', () => {
  // cafetería, barrio, supermercado, parque, centro (calle), restaurante (diner), gimnasio, oficina,
  // hospital (clínica) y ayuntamiento.
  for (const id of ['cafe', 'neighborhood', 'grocery', 'park', 'street', 'diner', 'gym', 'office', 'clinic', 'cityhall']) {
    assert.ok(data.placeById(id), `falta el lugar ${id}`);
  }
});

test('lecciones: cada misión tiene versión principiante, intermedia y avanzada', () => {
  const ids = new Set();
  for (const p of data.PLACES) {
    assert.ok(p.missions.length >= 3, `${p.id} necesita al menos 3 misiones`);
    for (const id of p.characters) {
      assert.ok(data.CHARACTERS[id], `${p.id}: falta el personaje ${id}`);
      assert.ok(data.CHARACTERS[id].tts, `${id} no tiene voz natural`);
    }
    for (const m of p.missions) {
      assert.ok(!ids.has(m.id), `misión repetida ${m.id}`);
      ids.add(m.id);
      for (const k of ['beginner', 'intermediate', 'advanced']) assert.ok(m.facets[k], `${m.id} sin faceta ${k}`);
      assert.ok(m.objectives.length >= 2 && m.expressions.length >= 2, `${m.id} incompleta`);
      assert.notEqual(data.facetForRank(m, 1), data.facetForRank(m, 6));
    }
  }
  assert.ok(data.FREE_TALK.facets.beginner);
  assert.ok(ids.size >= 56, `solo hay ${ids.size} misiones`);
});

test('nivel por misión: 4 estrellas por nivel y más opciones al sumar niveles', async () => {
  const L = await import('../js/lessons.js');
  assert.deepEqual(L.missionLevel(0), { level: 0, pct: 0 });
  assert.deepEqual(L.missionLevel(6), { level: 1, pct: 50 });
  assert.equal(L.totalMissionLevel({ a: 8, b: 5, c: 3 }), 3);
  assert.equal(L.missionSlots(0).slots, 3);
  assert.equal(L.missionSlots(0).next.total, 8);
  assert.equal(L.missionSlots(8).slots, 4);
  assert.equal(L.missionSlots(25).slots, 5);
  assert.equal(L.missionSlots(25).next, undefined);
});

test('cierre de sesión: sube el nivel de la misión, la meta diaria y la primera charla', () => {
  const ses = fakeSession([100, 100, 100]);             // 3 estrellas
  store.update(s => { s.missionXp[ses.mission.id] = 2; });
  const coins0 = store.get().coins;
  const sum = scoring.finishSession(ses);
  assert.equal(sum.stars, 3);
  assert.equal(store.get().missionXp[ses.mission.id], 5);
  assert.deepEqual([sum.missionProgress.before, sum.missionProgress.after, sum.missionProgress.pct], [0, 1, 25]);
  assert.equal(sum.coinsEarned, 3 + 5);                // 1 por estrella + 5 por subir la misión
  assert.equal(store.get().coins - coins0, 8);
  assert.deepEqual(sum.firstConversation, { seconds: 9, words: 9 });
  assert.equal(store.get().daily.date, store.todayIso());
  assert.ok(store.get().daily.seconds >= 119);
  const sum2 = scoring.finishSession(fakeSession([10]));
  assert.equal(sum2.firstConversation, null);
});

test('respaldo antiguo: las misiones completadas pasan a experiencia de misión', () => {
  store.importJson(JSON.stringify({ settings: {}, missionLevels: { cafe_order: 3 } }));
  assert.equal(store.get().missionXp.cafe_order, 6);
  assert.equal(store.get().dailyGoal, 10);
  assert.deepEqual(store.get().interests, []);
});

test('plan: intereses y edad llegan al personaje', async () => {
  const P = await import('../js/prompts.js');
  assert.equal(P.learnerProfile({}), '');
  const t = P.learnerProfile({ interests: ['Chess', 'Cooking'], ageGroup: '65+', motivation: 'Viajar' });
  assert.match(t, /Chess, Cooking/);
  assert.match(t, /65 or older/);
  const sys = P.characterSystem({ character: data.CHARACTERS.helen, place: data.placeById('neighborhood'), mission: data.placeById('neighborhood').missions[0], rankId: 1, rel: { level: 0, memory: [] }, learnerName: 'Ana', learner: { interests: ['Chess'] } });
  assert.match(sys, /interested in: Chess/);
  assert.match(sys, /Level adaptation: /);
});

// ---------------- Temas de conversación y lugares de la hoja de ruta ----------------
test('temas: cubren las categorías públicas de LingoLooper y tienen 3 niveles', async () => {
  const T = await import('../js/topics.js');
  const ids = new Set(data.PLACES.flatMap(p => p.missions.map(m => m.id)));
  for (const x of T.TOPICS) {
    assert.ok(!ids.has(x.id), `id repetido ${x.id}`);
    ids.add(x.id);
    assert.ok(T.TOPIC_GROUPS.some(g => g.id === x.group), `${x.id}: grupo desconocido`);
    for (const k of ['beginner', 'intermediate', 'advanced']) assert.ok(x.facets[k], `${x.id} sin faceta ${k}`);
    assert.equal(x.objectives.length, 3);
    assert.ok(x.expressions.length >= 3);
    assert.ok(x.rankRequired >= 1 && x.rankRequired <= 6);
  }
  for (const id of ['t_meet', 't_catchup', 't_weather', 't_news', 't_directions', 't_weekend', 't_job', 't_family', 't_pets',
    't_shopping', 't_fashion', 't_fitness', 't_food', 't_diversity', 't_commute', 't_music', 't_events', 't_sports']) {
    assert.ok(T.topicById(id), `falta el tema ${id}`);
  }
  for (const g of T.TOPIC_GROUPS) assert.ok(T.TOPICS.some(x => x.group === g.id), `grupo vacío ${g.id}`);
  assert.ok(T.TOPICS.length >= 45);
});

test('temas: el sorteo mezcla misiones del lugar y un tema permitido por el nivel', async () => {
  const T = await import('../js/topics.js');
  const place = data.placeById('cafe');
  for (const slots of [3, 4, 5]) {
    const d = T.drawMissions(place, slots, 1);
    assert.equal(d.length, slots);
    assert.equal(d.filter(m => m.topic).length, 1);
    assert.equal(new Set(d.map(m => m.id)).size, slots);
    assert.ok(d.every(m => !m.topic || m.rankRequired <= 1));
  }
});

test('lugares de la hoja de ruta: banco, escuela, centro comercial y peluquería', () => {
  for (const id of ['bank', 'school', 'mall', 'salon']) {
    const p = data.placeById(id);
    assert.ok(p, `falta ${id}`);
    assert.ok(p.missions.length >= 4);
    for (const c of p.characters) assert.ok(data.CHARACTERS[c].tts, `${c} sin voz`);
  }
});

// ---------------- Economía de monedas ----------------
test('sin candados de niveles: todos los niveles, lugares y lecciones abiertos siempre', async () => {
  const C = await import('../js/coins.js');
  const G = await import('../js/grammar.js');
  store.update(s => { s.highestRank = 1; s.rank = 1; s.unlockedPlaces = []; });
  const office = data.placeById('office');                 // nivel 3
  assert.equal(store.locksOn(), false);
  assert.equal(store.reachRank(), 6);
  assert.equal(C.isPlaceOpen(store.get(), office), true);  // sin candados: abierto
  scoring.setLevel(5);
  assert.equal(store.get().rank, 5);                         // cualquier nivel
  assert.ok(G.LESSONS.every(l => G.unlocked(l, store.reachRank(), {})));
  store.update(s => { s.settings.levelLocks = true; s.rank = 1; });   // un respaldo viejo con candados
  assert.equal(store.locksOn(), false);
  assert.equal(store.reachRank(), 6);
  assert.ok(data.PLACES.every(p => C.isPlaceOpen(store.get(), p)));
  scoring.setLevel(6);
  assert.equal(store.get().rank, 6);
});

test('uso personal: no hay tienda y sortear misiones siempre es gratis', async () => {
  const C = await import('../js/coins.js');
  assert.equal(C.SHOP_ENABLED, false);
  store.update(s => { s.coins = 0; s.rerolls = { date: store.todayIso(), used: 9 }; });
  assert.equal(C.rerollCost(), 0);
  assert.equal(C.useReroll().ok, true);
  assert.equal(store.get().coins, 0);
});

test('respaldo antiguo: agrega lugares comprados y sorteos', () => {
  store.importJson(JSON.stringify({ settings: {}, coins: 40 }));
  assert.deepEqual(store.get().unlockedPlaces, []);
  assert.equal(store.get().rerolls.used, 0);
  assert.equal(store.get().coins, 40);
});

// ---------------- Personajes: relación que baja, cosas por descubrir, contactos ----------------
test('relación: puede bajar a Enemigo y Némesis, con aviso de cuánto falta', async () => {
  const people = await import('../js/people.js');
  assert.equal(data.relationshipStatus(-1).label, 'Enemigo');
  assert.equal(data.relationshipStatus(-3).label, 'Némesis');
  assert.equal(data.relationshipStatus(0).label, 'Desconocido');
  assert.deepEqual(people.nextStatus({ level: 0, affection: 4 }), { label: 'Conocido', points: 6 });
  assert.deepEqual(people.nextStatus({ level: -1, affection: -7 }), { label: 'Desconocido', points: 7 });
  assert.equal(people.nextStatus({ level: 6, affection: 70 }), null);
  assert.equal(people.levelFraction({ affection: -7 }), 0.3);
  const ses = fakeSession([5]);                 // 1 turno: no suma los 3 de cortesía
  ses.affection = -12;
  const sum = scoring.finishSession(ses);
  assert.equal(sum.relationship.after.affection, -12);
  assert.equal(sum.relationship.after.level, -2);
  assert.ok(store.get().relationships.maya.metDate);
  ses.affection = -50;
  assert.equal(scoring.finishSession(ses).relationship.after.affection, data.AFFECTION_MIN);
});

test('ficha: 20 cosas por descubrir que se abren con charlas y amistad', async () => {
  const people = await import('../js/people.js');
  assert.equal(people.DISCOVERIES.length, 20);
  assert.equal(people.nextDiscovery({ conversations: 0, level: 0, facts: {} }), null);
  assert.equal(people.nextDiscovery({ conversations: 1, level: 0, facts: {} }).key, 'hometown');
  const four = { hometown: 'x', job: 'x', hobby: 'x', food: 'x' };
  assert.equal(people.nextDiscovery({ conversations: 9, level: 0, facts: four }), null);   // falta amistad
  assert.equal(people.nextDiscovery({ conversations: 9, level: 1, facts: four }).key, 'place');
  const P = await import('../js/prompts.js');
  const msgs = P.sessionFeedbackMessages({ history: [], character: data.CHARACTERS.maya, mission: data.FREE_TALK, rankId: 1, analyses: [], discovery: people.DISCOVERIES[0] });
  assert.match(msgs[0].content, /backstory/);
  const sys = P.characterSystem({ character: data.CHARACTERS.maya, place: data.PLACES[0], mission: data.FREE_TALK, rankId: 1, rel: { level: -3, memory: [], facts: { hometown: 'I grew up in Maine.' } }, learnerName: 'Ana' });
  assert.match(sys, /strongly dislike/);
  assert.match(sys, /I grew up in Maine/);
});

test('contactos: quitar, borrar memoria y conocer a alguien nuevo según intereses', async () => {
  const people = await import('../js/people.js');
  store.update(s => { s.interests = ['Hiking']; });
  const first = people.newPeople(store.get(), () => true, () => 0.5)[0];
  assert.ok(first.interests.some(i => /hiking/i.test(i)));
  store.update(() => { const r = store.relationship('maya'); r.conversations = 2; r.memory = ['a']; });
  assert.equal(people.contacts().length, 1);
  assert.ok(!people.newPeople(store.get(), () => true).some(c => c.id === 'maya'));
  people.forgetMemory('maya');
  assert.deepEqual(store.get().relationships.maya.memory, []);
  people.removeContact('maya');
  assert.equal(people.contacts().length, 0);
});

// ---------------- Vocabulario ----------------
test('vocabulario: ordenar, filtrar por tipo, archivar y sugeridas', async () => {
  const V = await import('../js/vocab.js');
  const now = Date.now();
  store.update(s => { s.vocab = [
    { id: '1', text: 'latte', type: 'Noun', score: 80, createdAt: now - 3000, lastUsed: now },
    { id: '2', text: 'to go', type: '', score: 10, createdAt: now - 1000, lastUsed: 0 },
    { id: '3', text: 'order', type: 'Verb', score: 40, createdAt: now - 2000, lastUsed: now - 5000 },
  ]; });
  const ids = opts => V.filterVocab(store.get().vocab, opts).map(v => v.id).join('');
  assert.equal(ids({ sort: 'recent' }), '231');
  assert.equal(ids({ sort: 'weak' }), '231');
  assert.equal(ids({ sort: 'used' }), '132');
  assert.equal(ids({ type: 'Phrase' }), '2');
  assert.equal(ids({ q: 'ord' }), '3');
  V.setArchived('1', true);
  assert.equal(ids({}), '23');
  assert.equal(ids({ archived: true }), '1');
  assert.equal(store.get().vocab[0].noReview, true);
  assert.match(V.vocabAsText(store.get().vocab), /latte\t/);
  V.rememberSuggestions([{ text: 'to go', translation: 'para llevar' }, { text: 'receipt', translation: 'recibo' }]);
  assert.deepEqual(V.pendingSuggestions().map(x => x.text), ['receipt']);
});

// ---------------- Estadísticas y calendario ----------------
test('estadísticas por semana, mes y año, y calendario de la racha', async () => {
  const S = await import('../js/stats.js');
  const now = day(2026, 11, 18);   // miércoles
  const mk = (d, total, sec) => ({ date: d.toISOString(), score: { total }, stars: 2, stats: { durationSec: sec, spokeSec: 30, avgDelaySec: 2, avgWpm: 80, distinctWords: 20, totalWords: 40, turns: 4 } });
  const history = [mk(day(2026, 11, 16), 100, 300), mk(day(2026, 11, 18), 50, 120), mk(day(2026, 11, 3), 70, 60), mk(day(2026, 2, 1), 10, 60)];
  const w = S.computeStats(history, 'week', now);
  assert.equal(w.conversations, 2);
  assert.equal(w.points, 150);
  assert.equal(w.minutes, 7);
  assert.equal(w.series.length, 7);
  assert.equal(w.series[0].points, 100);        // lunes 16
  assert.equal(S.computeStats(history, 'month', now).conversations, 3);
  const y = S.computeStats(history, 'year', now);
  assert.equal(y.conversations, 4);
  assert.equal(y.series[1].conversations, 1);   // febrero
  store.update(s => { s.history = history; s.streak.frozenDays = [store.todayIso(day(2026, 11, 17))]; });
  const cal = S.calendar(2026, 10, store.get(), now);
  assert.equal(cal.cells.filter(Boolean).length, 30);
  assert.equal(cal.count, 3);
  assert.ok(cal.cells.find(c => c?.day === 17).frozen);
});

test('racha: guarda los días practicados y los salvados con protector', () => {
  scoring.updateStreak(day(2026, 11, 10));
  store.update(s => { s.streak.freezes = 1; });
  scoring.updateStreak(day(2026, 11, 12));
  const st = store.get().streak;
  assert.deepEqual(st.days, [store.todayIso(day(2026, 11, 10)), store.todayIso(day(2026, 11, 12))]);
  assert.deepEqual(st.frozenDays, [store.todayIso(day(2026, 11, 11))]);
  assert.equal(st.count, 2);
});

// ---------------- Temas propios guardados ----------------
test('temas propios: se revisan, se guardan, cuentan las veces y se borran', async () => {
  const CT = await import('../js/customtopics.js');
  store.update(s => { s.settings.apiKey = 'demo'; });
  const ctx = { character: data.CHARACTERS.maya, place: data.PLACES[0], rankId: 1 };
  const bad = await CT.saveCustomTopic({ ...ctx, text: 'quiero comprar un arma' });
  assert.equal(bad.ok, false);
  const r = await CT.saveCustomTopic({ ...ctx, text: 'Quiero devolver unos zapatos pequeños' });
  assert.equal(r.ok, true);
  assert.equal(store.get().customTopics.length, 1);
  const m = CT.toMission(r.topic);
  assert.equal(m.id, 'ct_' + r.topic.id);
  assert.equal(m.objectives.length, 3);
  CT.countPlay(r.topic.id); CT.countPlay(r.topic.id);
  assert.equal(store.get().customTopics[0].plays, 2);
  await CT.saveCustomTopic({ ...ctx, text: 'Quiero devolver unas botas', id: r.topic.id });
  assert.equal(store.get().customTopics.length, 1);
  assert.equal(store.get().customTopics[0].plays, 2);
  CT.deleteCustomTopic(r.topic.id);
  assert.equal(store.get().customTopics.length, 0);
});

// ---------------- Mensajes de los personajes ----------------
test('mensajes: uno al día de alguien conocido; responder a tiempo da monedas', async () => {
  const I = await import('../js/inbox.js');
  const now = day(2026, 11, 18);
  assert.equal(I.maybeNewMessage(now), null);                 // no conoce a nadie
  store.update(s => { s.name = 'Ana'; store.relationship('tom').conversations = 1; });
  const m = I.maybeNewMessage(now, () => 0);
  assert.equal(m.charId, 'tom');
  assert.ok(!m.text.includes('{name}'));
  assert.equal(I.maybeNewMessage(now), null);                 // ya hubo uno hoy
  assert.equal(I.pendingMessages(now).length, 1);
  assert.equal(I.replyMission(m).messageId, m.id);
  const coins0 = store.get().coins;
  assert.equal(I.markAnswered(m.id, now), I.REPLY_BONUS);
  assert.equal(store.get().coins - coins0, I.REPLY_BONUS);
  assert.equal(I.markAnswered(m.id, now), 0);                 // una sola vez
  assert.equal(I.pendingMessages(now).length, 0);
  const late = I.maybeNewMessage(day(2026, 11, 19), () => 0);
  assert.equal(I.markAnswered(late.id, day(2026, 11, 21)), 0); // vencido
});

test('perfil: el género llega al personaje', async () => {
  const P = await import('../js/prompts.js');
  assert.match(P.learnerProfile({ gender: 'f' }), /Gender: female/);
  assert.equal(P.learnerProfile({ gender: '' }), '');
});

// ---- Diseño: íconos propios en lugar de emojis ----
test('todos los emojis que usa la app tienen su ícono', async () => {
  const { iconName, ICONS } = await import('../js/icons.js');
  const { readdirSync, readFileSync } = await import('node:fs');
  const re = /(?:\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*|[←✓✕★☆⬜ⓘ☰↩⏹⏸⏯]️?)/gu;
  const sinIcono = new Set();
  for (const f of readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js') && !['prompts.js', 'llm.js', 'icons.js'].includes(f))) {
    for (const m of readFileSync(join(ROOT, 'js', f), 'utf8').matchAll(re)) {
      const name = iconName(m[0]);
      if (!name || !ICONS[name]) sinIcono.add(`${m[0]} (${f})`);
    }
  }
  assert.deepEqual([...sinIcono], []);
});

test('cada lugar tiene su ícono hecho con ChatGPT', () => {
  for (const p of data.PLACES) {
    assert.ok(p.badge, `${p.id} sin ícono`);
    assert.ok(existsSync(join(ROOT, p.badge)), `falta ${p.badge}`);
  }
});

test('la app usa la paleta roja', async () => {
  const { readFileSync } = await import('node:fs');
  const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  assert.equal(manifest.theme_color, '#c3122b');
  assert.match(readFileSync(join(ROOT, 'styles.css'), 'utf8'), /--brand: #d11f35/);
});

// ---------------- Repaso espaciado (cajas de Leitner) ----------------
test('repaso espaciado: acertar aleja el repaso, fallar lo trae a mañana', async () => {
  const srs = await import('../js/srs.js');
  const now = day(2026, 3, 10).getTime();
  let v = { id: 'x', text: 'to go', score: 0 };
  assert.ok(srs.isDue(v, now));                         // nueva: toca ya
  const gaps = [];
  for (let i = 0; i < 5; i++) {
    const r = srs.schedule(v, 'right', now);
    gaps.push(r.days);
    v = { ...v, ...r };
  }
  assert.deepEqual(gaps, [1, 3, 7, 14, 30]);            // intervalos cada vez más largos
  assert.equal(v.box, 5);
  assert.equal(srs.whenLabel(v.due, now), 'en 4 semanas');
  const w = srs.schedule(v, 'wrong', now);
  assert.equal(w.box, 3); assert.equal(w.days, 1); assert.equal(w.lapses, 1);
  assert.equal(srs.whenLabel(w.due, now), 'mañana');
  const hint = srs.schedule({ box: 3 }, 'hint', now);   // con ayuda: misma caja, medio intervalo
  assert.equal(hint.box, 3); assert.equal(hint.days, 4);
  assert.ok(!srs.isDue({ ...v, ...w }, now));           // no toca hoy…
  assert.ok(srs.isDue({ ...v, ...w }, now + srs.DAY));  // …sí mañana
});

test('repaso espaciado: las palabras antiguas sin fecha toman caja y fecha de su familiaridad', async () => {
  const srs = await import('../js/srs.js');
  const now = day(2026, 3, 10).getTime();
  assert.equal(srs.boxOf({ score: 90 }), 4);
  assert.equal(srs.boxOf({ score: 30 }), 1);
  const mastered = { score: 90, lastReviewed: now - 3 * srs.DAY };       // dominada hace 3 días: vuelve en 2 semanas
  assert.ok(!srs.isDue(mastered, now));
  assert.ok(srs.isDue({ score: 90, lastReviewed: now - 20 * srs.DAY }, now));
  assert.ok(!srs.isDue({ score: 0, archived: true }, now));              // archivadas no salen
  const vocab = [{ score: 0, due: now + 2 * srs.DAY }, { score: 0, due: now + 2 * srs.DAY }, { score: 0, due: now + 5 * srs.DAY }];
  assert.equal(srs.dueCount(vocab, now), 0);
  assert.deepEqual(srs.nextDue(vocab, now), { at: now + 2 * srs.DAY, count: 2 });
});

test('repaso: solo salen las que tocan hoy, y «practicar igual» trae las próximas', async () => {
  const rv = await import('../js/review.js');
  const later = Date.now() + 5 * 86400000;
  const vocab = [
    { id: 'a', text: 'latte', score: 10 },
    { id: 'b', text: 'to go', score: 60, due: later, box: 2 },
    { id: 'c', text: 'skip', score: 0, noReview: true },
  ];
  assert.deepEqual(rv.pickItems(vocab).map(i => i.text), ['latte']);
  assert.deepEqual(rv.pickItems(vocab, 6, { extra: true }).map(i => i.text), ['latte', 'to go']);
  assert.equal(rv.caughtUpReason([]), 'no-material');
  assert.equal(rv.caughtUpReason(vocab), 'need-more');
});

// ---------------- Cerebro: reglas del coach y bitácora de errores ----------------
test('coach: usa las reglas y los errores de la bitácora del cerebro', async () => {
  const C = await import('../js/cerebro.js');
  const P = await import('../js/prompts.js');
  assert.ok(C.COACH_RULES.length >= 3 && C.COACH_RULES.some(r => /jerga/i.test(r)));
  assert.ok(C.BITACORA.length >= 5);
  const active = P.knownErrors();
  assert.ok(active.length && active.every(b => b.status !== 'resuelto'));
  const sys = P.analysisMessages({ characterLine: 'Hi', learnerLine: 'if i would know i will call', rankId: 1, strictness: 'Balanced', mission: { name: 'Café' } })[0].content;
  assert.ok(sys.includes(active[0].id) && sys.includes('known_error') && /jerga/i.test(sys));
  const ex = P.explainMessages({ original: 'a', corrected: 'b', explanation: 'c' });
  assert.match(ex[0].content, /Bolen/);
});

test('mis errores: lo que dijo mal es una opción falsa del hueco', async () => {
  const ph = await import('../js/phrases.js');
  const list = ph.packPhrases('err');
  assert.ok(list.length >= 10);
  const p = list.find(x => x.raw.includes('[eaten]') && x.said.includes('ate'));
  const c = ph.coreCard({ coreId: p.id }, 'completion');
  assert.equal(c.answer, 'eaten');
  assert.ok(c.options.includes('ate'));
  assert.equal(c.origin, 'De su cerebro de inglés');
});

test('bitácora: los errores de una charla salen como filas para pegar', async () => {
  const { bitacoraRows } = await import('../js/prompts.js');
  const rows = bitacoraRows([{ has_feedback: true, original: 'i have went', corrected: 'I have gone', explanation: 'x | y', known_error: 'err-1' }, { has_feedback: false }], new Date(2026, 10, 18));
  assert.deepEqual(rows, ['| 2026-11-18 | "i have went" | "I have gone" |  | x / y | Sí — se repitió en Charla |']);
});

// ---------------- Frases esenciales ----------------
test('frases esenciales: cada frase tiene un hueco, traducción e id único', async () => {
  const ph = await import('../js/phrases.js');
  assert.ok(ph.PHRASES.length >= 100);
  assert.equal(new Set(ph.PHRASES.map(p => p.id)).size, ph.PHRASES.length);
  assert.equal(new Set(ph.PHRASES.map(p => p.en.toLowerCase())).size, ph.PHRASES.length, 'frase repetida');
  for (const p of ph.PHRASES) {
    assert.equal((p.raw.match(/\[/g) || []).length, 1, `una sola [palabra] en: ${p.raw}`);
    assert.ok(p.gap && p.es && !/[[\]]/.test(p.en), p.raw);
    assert.ok(p.en.includes(p.gap), p.raw);
  }
  for (const pk of ph.PACKS) assert.ok(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(pk.level), pk.id);
  for (const pk of ph.PACKS) assert.ok(ph.GROUPS.some(g => g.id === pk.group), pk.id);
});

test('cerebro de inglés: frases cotidianas, idioms, verbos y las 1000 de Refold como paquetes', async () => {
  const ph = await import('../js/phrases.js');
  const groups = id => ph.PACKS.filter(p => p.group === id);
  assert.ok(groups('cerebro').length >= 9);
  assert.equal(groups('mil').length, 10);
  assert.ok(ph.PHRASES.filter(p => p.id.startsWith('mil-')).length >= 990);
  // repetidas con las frases de Charla: se queda la primera
  assert.equal(ph.PHRASES.filter(p => p.key === 'nice to meet you').length, 1);
  // idiom: la traducción literal es una opción falsa
  const idm = ph.phraseById('idm-it-s-raining-cats-and-dogs');
  const m = ph.coreCard({ coreId: idm.id }, 'meaning');
  assert.ok(m.options.includes(idm.trap) && m.answer === idm.es);
  // verbo: las opciones son las formas del mismo verbo
  const c = ph.coreCard({ coreId: 'vrb-be-2' }, 'completion');
  assert.equal(c.sentence, 'I {{gap}} tired all week.');
  assert.equal(c.answer, 'have been');
  assert.ok(c.options.includes('was') && c.options.includes('had been'));
  assert.equal(ph.coreCard({ coreId: 'vrb-be-2' }, 'recall').hint, 'Verbo: be');
  // Refold: la palabra (o su forma) es el hueco
  assert.equal(ph.phraseById('mil-3').gap, 'buy');
  assert.equal(ph.phraseById('mil-95').gap, 'woke');
});

test('frases esenciales: tarjetas locales válidas para los 3 tipos, sin dar la respuesta', async () => {
  const ph = await import('../js/phrases.js');
  const rv = await import('../js/review.js');
  for (const p of ph.PHRASES) {
    const v = { ...ph.toVocab(p), id: p.id };
    for (const fam of ['meaning', 'completion', 'recall']) {
      const c = ph.coreCard(v, fam);
      assert.ok(rv.validCard(c), `${fam}: ${p.raw}`);
      assert.equal(c.family, fam);
      if (c.options) {
        assert.equal(new Set(c.options).size, c.options.length, `opciones repetidas: ${p.raw}`);
        assert.ok(c.options.length === 4, `${fam} con ${c.options.length} opciones: ${p.raw}`);
      }
      if (fam === 'recall') assert.ok(!c.prompt.includes(p.en));
    }
  }
});

test('frases esenciales: paquete recomendado según nivel y lo ya aprendido', async () => {
  const ph = await import('../js/phrases.js');
  assert.equal(ph.recommendedPack([], 'A1').id, 'basics');
  const five = ph.nextPhrases('basics', [], 5);
  assert.equal(five.length, 5);
  const vocab = five.map(p => ph.toVocab(p));
  vocab.push({ text: 'See you later!' });                      // guardada desde una charla: cuenta como aprendida
  assert.equal(ph.packProgress(ph.PACKS[0], vocab).learned, 6);
  assert.deepEqual(ph.nextPhrases('basics', vocab, 10).map(p => p.id), ['basics-5', 'basics-7', 'basics-8', 'basics-9']);
  const all = ph.PHRASES.filter(p => p.pack === 'basics').map(p => ph.toVocab(p));
  assert.equal(ph.recommendedPack(all, 'A1').id, 'courtesy');
  assert.equal(ph.recommendedPack([], 'B1').id, 'opinions');           // primero lo de su nivel
  const es = await import('../js/essentials.js');
  assert.equal(es.learnedToday([{ source: 'core', createdAt: Date.now() }, { source: 'core', createdAt: 1 }]), 1);
});

// ---------------- Lo que faltaba de LingoLooper ----------------
test('temporada: eventos por fecha (cruzan el año) y estación en el prompt', async () => {
  const S = await import('../js/seasons.js');
  const T = await import('../js/topics.js');
  assert.deepEqual(S.activeSeasonal(day(2026, 11, 18)).map(e => e.id), ['s_thanksgiving']);
  assert.deepEqual(S.activeSeasonal(day(2026, 12, 30)).map(e => e.id), ['s_new_year']);
  assert.deepEqual(S.activeSeasonal(day(2027, 1, 5)).map(e => e.id), ['s_new_year']);
  assert.deepEqual(S.activeSeasonal(day(2026, 3, 1)), []);
  assert.equal(S.season(day(2026, 11, 18)), 'late autumn');
  assert.equal(S.season(day(2026, 1, 10)), 'winter');
  assert.equal(S.season(day(2026, 7, 4)), 'summer');
  assert.match(S.seasonLine(day(2026, 11, 18)), /November 18.*late autumn.*Thanksgiving/);
  const ids = new Set(T.TOPICS.map(x => x.id));
  for (const e of S.SEASONAL) {
    assert.equal(e.objectives.length, 3, e.id);
    assert.ok(e.season && e.topic && e.facets.advanced && e.expressions.length, e.id);
    assert.ok(!ids.has(e.id), `${e.id} choca con un tema`);
  }
  // Cada fecha del año tiene como mucho un evento.
  for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) assert.ok(S.activeSeasonal(d).length <= 1, d.toDateString());
  const P = await import('../js/prompts.js');
  const sys = P.characterSystem({ character: data.CHARACTERS.maya, place: data.PLACES[0], mission: data.FREE_TALK, rankId: 1, rel: { level: 0, memory: [] }, learnerName: 'Ana' });
  assert.match(sys, /where you live/);
});

test('resumen semanal y del año: cuenta charlas, mejor día y mejor amigo', async () => {
  const R = await import('../js/recap.js');
  assert.equal(R.weekStart(day(2026, 11, 18)).getDate(), 16);          // miércoles → lunes 16
  assert.equal(R.weekStart(day(2026, 11, 22)).getDate(), 16);          // domingo → lunes 16
  const conv = (d, characterId, min) => ({ date: d.toISOString(), characterId, placeId: 'cafe', missionName: 'Pedir un café', stars: 2, score: { total: 50 }, stats: { durationSec: min * 60, spokeSec: 60, totalWords: 40 } });
  store.update(s => {
    s.history = [conv(day(2026, 11, 10), 'maya', 5), conv(day(2026, 11, 12), 'maya', 12), conv(day(2026, 11, 12), 'ben', 3), conv(day(2026, 11, 17), 'ben', 4), conv(day(2025, 6, 1), 'ben', 4)];
    s.vocab = [{ text: 'latte', createdAt: day(2026, 11, 11).getTime() }, { text: 'Hi', source: 'core', createdAt: day(2026, 3, 1).getTime() }];
    s.streak.record = 9;
  });
  const w = R.lastWeek(store.get(), day(2026, 11, 18));
  assert.equal(w.conversations, 3);
  assert.equal(w.minutes, 20);
  assert.equal(w.stars, 6);
  assert.equal(w.saved, 1);
  assert.equal(w.days, 2);
  assert.equal(w.bestDay.date, '2026-11-12');
  assert.equal(w.friend.name, 'Maya');
  const y = R.yearRecap(store.get(), 2026);
  assert.equal(y.conversations, 4);
  assert.equal(y.phrases, 1);
  assert.equal(y.record, 9);
  assert.equal(y.mission.key, 'Pedir un café');
  assert.equal(R.recapCard(store.get(), day(2026, 6, 1), () => {}), null);   // fuera de diciembre/enero no aparece
});

test('tutorial: se muestra una vez, se puede saltar y reiniciar', async () => {
  const tut = await import('../js/tutorial.js');
  assert.ok(tut.needed('conv'));
  store.update(s => { s.tutorial = { conv: true }; });
  assert.ok(!tut.needed('conv'));
  assert.ok(tut.needed('dot'));
  store.update(s => { s.tutorial.skipped = true; });
  assert.ok(!tut.needed('dot'));
  tut.reset();
  assert.ok(tut.needed('conv') && tut.needed('dot'));
});

test('despedida, comedia y palabras con nivel en los prompts', async () => {
  const P = await import('../js/prompts.js');
  const base = { character: data.CHARACTERS.maya, place: data.PLACES[0], mission: data.FREE_TALK, rankId: 1, rel: { level: 0, memory: [] }, learnerName: 'Ana' };
  assert.ok(P.characterSystem({ ...base, comedy: true }).length > P.characterSystem(base).length);
  assert.match(P.goodbyeUser(), /leave/);
  assert.match(JSON.stringify(P.wordMessages('latte', 'I want a latte')), /formality/);
});

// ---------------- Taller de frases: Repeat and Juggle y Skeleton swapping ----------------
test('taller: contenido completo (propios, mazo de verbos del cerebro y esqueletos)', async () => {
  const D = await import('../js/drills.js');
  assert.equal(D.JUGGLES.length, 12);
  assert.ok(D.VERB_JUGGLES.length >= 100, 'faltan los verbos del cerebro');
  assert.equal(D.SKELETONS.length, 20);
  const ids = [...D.JUGGLES, ...D.VERB_JUGGLES, ...D.SKELETONS].map(x => x.id);
  assert.equal(new Set(ids).size, ids.length, 'ids repetidos');
  for (const j of D.ALL_JUGGLES()) {
    assert.ok(D.validJuggle(j), j.id);
    assert.equal(j.steps[0].kind, 'repeat', j.id);
    for (const st of j.steps.slice(1)) assert.ok(/\[.+\]/.test(st.en), `${j.id}: sin pieza marcada en «${st.en}»`);
  }
  for (const s of D.SKELETONS) {
    assert.ok(D.validSkeleton(s), s.id);
    assert.ok(s.title, `${s.id}: sin título`);
    assert.ok(D.SKELETON_GROUPS.some(g => g.id === s.group), s.id);
    for (const p of D.frameParts(s.frame).filter(p => p.slot)) assert.ok(s.slots[p.slot], `${s.id}: hueco sin pista ${p.slot}`);
    for (const sw of s.swaps) assert.ok(D.keepsFrame(s.frame, sw.en), `${s.id}: «${sw.en}» no usa el esqueleto`);
  }
});

test('taller: la revisión acepta contracciones, mayúsculas y números dichos', async () => {
  const D = await import('../js/drills.js');
  assert.equal(D.normalize("I'd been there. He's got 2 cats; it's fine, I'd go"), 'i had been there he has got two cats it is fine i would go');
  assert.equal(D.localCheck("I['ve been] really into cooking lately.", "i have been really into cooking lately").result, 'exact');
  assert.equal(D.localCheck('It takes me twenty minutes to get to work.', 'It takes me 20 minutes to get to work').result, 'exact');
  assert.equal(D.localCheck("I'm thinking about moving.", 'I thinking about moving').result, 'close');
  assert.equal(D.localCheck("I'm thinking about moving.", 'I like pizza').result, 'wrong');
  assert.equal(D.localCheck('Could you repeat that, please?', '').result, 'wrong');
  assert.ok(D.keepsFrame("I've been meaning to {action} for {time}.", 'I have been meaning to paint my house for two years'));
  assert.ok(!D.keepsFrame("I've been meaning to {action} for {time}.", 'I want to paint my house'));
  assert.deepEqual(D.markParts('I [was] tired.'), [{ text: 'I ', mark: false }, { text: 'was', mark: true }, { text: ' tired.', mark: false }]);
  assert.equal(D.fillFrame('Do you mind if I {action}?', { action: 'sit here' }), 'Do you mind if I sit here?');
});

test('taller: los ejercicios de la IA se validan antes de guardarlos', async () => {
  const D = await import('../js/drills.js');
  assert.ok(!D.validJuggle({ steps: [{ en: 'Hi', es: 'Hola' }] }));
  assert.ok(!D.validSkeleton({ frame: 'No slots here.', model: { en: 'No slots here.' }, swaps: [{ es: 'a', en: 'b' }] }));
  assert.ok(!D.validSkeleton({ frame: 'I love {thing}.', model: { en: 'You like dogs.' }, swaps: [{ es: 'a', en: 'b' }] }), 'el modelo no usa el esqueleto');
  store.update(s => { s.settings.apiKey = 'demo'; });
  const { chatJson } = await import('../js/llm.js');
  const P = await import('../js/prompts.js');
  assert.ok(D.validJuggle(await chatJson('juggle_create', P.juggleCreateMessages('I like walking', 1))));
  assert.ok(D.validSkeleton(await chatJson('skeleton_create', P.skeletonCreateMessages('Voy a nadar los sábados', 1))));
  const bad = await chatJson('drill_check', P.drillCheckMessages({ mode: 'juggle', base: 'I go to work.', target: 'I went to work.', attempt: 'I goed to work', rankId: 1 }));
  assert.equal(bad.verdict, 'almost');
  assert.match(JSON.stringify(P.drillCheckMessages({ mode: 'skeleton', frame: 'I wish I could {a}.', attempt: 'x', rankId: 2 })), /fixed words must stay/);
});

test('DeepSeek: apaga el razonamiento y, si la respuesta se corta, pide más espacio', async () => {
  const { chatJson } = await import('../js/llm.js');
  store.update(s => { s.settings.apiKey = 'sk-prueba'; s.settings.model = 'deepseek-flash'; });
  const bodies = [];
  const real = globalThis.fetch;
  let n = 0;
  globalThis.fetch = async (url, init) => {
    bodies.push(JSON.parse(init.body));
    n++;
    const content = n === 1 ? '' : '{"ok": true}';
    return new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: n === 1 ? 'length' : 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1 } }), { status: 200 });
  };
  try {
    assert.deepEqual(await chatJson('x', [{ role: 'user', content: 'hi' }], { maxTokens: 100 }), { ok: true });
  } finally { globalThis.fetch = real; }
  assert.deepEqual(bodies[0].thinking, { type: 'disabled' });
  assert.equal(bodies.length, 2);
  assert.ok(bodies[1].max_tokens > 100, 'el segundo intento tiene más espacio');
});

// ---------------- Cuidar el progreso: gasto, copias y bitácora del teléfono ----------------
test('gasto: costo por llamada, avisos al 80 % y al tope una sola vez, y el mes nuevo empieza en cero', async () => {
  const b = await import('../js/budget.js');
  // 1M de entrada sin caché + 1M de salida en flash = 0,3 + 1,2
  assert.equal(b.costOf({ prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 1e6, completion_tokens: 1e6 }, 'deepseek-flash'), 1.5);
  assert.ok(Math.abs(b.costOf({ prompt_tokens: 1e6, prompt_cache_hit_tokens: 1e6 }, 'deepseek-v4-pro') - 0.044) < 1e-9);
  const s = store.get();
  s.settings.monthlyCap = 1;
  const nov = new Date(2026, 10, 18);
  const big = { prompt_cache_miss_tokens: 0, completion_tokens: 350000 };   // US$0,42 cada una
  assert.equal(b.addSpend(s, big, 'deepseek-flash', nov), null);
  assert.equal(b.addSpend(s, big, 'deepseek-flash', nov), 'near');          // 0,84
  assert.equal(b.spendStatus(s, nov).level, 'near');
  assert.equal(b.addSpend(s, big, 'deepseek-flash', nov), 'over');          // 1,26
  assert.equal(b.addSpend(s, big, 'deepseek-flash', nov), null);            // ya avisó
  assert.equal(b.spendStatus(s, nov).calls, 4);
  const dic = new Date(2026, 11, 1);
  assert.equal(b.spendStatus(s, dic).usd, 0);
  assert.equal(b.spendStatus(s, dic).level, 'ok');
  s.settings.monthlyCap = 0;
  assert.equal(b.spendStatus(s, nov).level, 'ok');                         // 0 = sin tope
  assert.equal(b.usd(0.004), '< US$0,01');
  assert.equal(b.usd(1.26), 'US$1,26');
});

test('copia de seguridad: no lleva la clave, al importar se queda la del teléfono, y se recuerda cada 2 semanas', async () => {
  store.update(s => { s.settings.apiKey = 'sk-secreta'; s.name = 'Ana'; });
  const json = store.exportJson();
  assert.ok(!json.includes('sk-secreta'));
  assert.equal(JSON.parse(json).name, 'Ana');
  store.update(s => { s.name = 'Otro'; s.settings.apiKey = 'sk-del-telefono'; });
  store.importJson(json);
  assert.equal(store.get().name, 'Ana');
  assert.equal(store.get().settings.apiKey, 'sk-del-telefono');
  assert.throws(() => store.importJson('{"hola":1}'));

  const { backupDue, backupName } = await import('../js/safety.js');
  const DAY = 86400000, now = Date.UTC(2026, 10, 18);
  const s = store.get();
  assert.equal(backupDue(s, now), false);                                  // todavía no hay nada que perder
  s.history = [{}, {}, {}];
  assert.equal(backupDue(s, now), true);
  s.backup = { last: now - 13 * DAY, snoozeUntil: 0 };
  assert.equal(backupDue(s, now), false);
  s.backup = { last: now - 15 * DAY, snoozeUntil: now + DAY };
  assert.equal(backupDue(s, now), false);                                  // lo pospuso
  assert.equal(backupName(new Date(2026, 10, 18)), 'charla-respaldo-2026-11-18.json');
});

test('bitácora del teléfono: guarda errores de la charla, suma repeticiones y junta con el cerebro', async () => {
  const bit = await import('../js/bitacora.js');
  const { BITACORA } = await import('../js/cerebro.js');
  const { knownErrors } = await import('../js/prompts.js');
  const activeBrain = BITACORA.filter(b => b.status !== 'resuelto').length;
  assert.equal(bit.activeErrors().length, activeBrain);

  const day1 = new Date(2026, 10, 18, 12);
  const turns = [
    { has_feedback: true, grammar: 'SomeMistakes', original: 'She don\'t like coffee', corrected: 'She doesn\'t like coffee', explanation: 'he/she/it lleva does' },
    { has_feedback: true, grammar: 'MostlyCorrect', original: 'I am agree', corrected: 'I agree' },       // solo «más natural»: no se guarda
    { has_feedback: true, grammar: 'ManyMistakes', original: 'Hello', corrected: 'hello!' },                 // igual al corregirlo
    { has_feedback: false },
  ];
  assert.equal(bit.addFromAnalyses(turns, day1), 1);
  assert.equal(bit.addFromAnalyses([turns[0]], day1), 0);                  // repetido: sube el contador
  const mine = store.get().myErrors;
  assert.equal(mine.length, 1);
  assert.equal(mine[0].count, 2);
  assert.equal(bit.activeErrors().length, activeBrain + 1);
  assert.ok(knownErrors().some(e => e.id === mine[0].id), 'el coach vigila el error nuevo');
  assert.equal(bit.findError(mine[0].id).right[0], 'She doesn\'t like coffee');

  // Filas para el cerebro, con el formato de bitacora/errores.md
  assert.deepEqual(bit.errorRows(bit.pendingExport()), ['| 2026-11-18 | "She don\'t like coffee" | "She doesn\'t like coffee" |  | he/she/it lleva does | Sí — 2 veces en Charla |']);

  // Resolver desde el teléfono: uno propio y uno del cerebro
  const brainOne = bit.allErrors().find(e => !e.local && e.status !== 'resuelto');
  bit.setStatus(brainOne, 'resuelto');
  bit.setStatus(bit.findError(mine[0].id), 'resuelto');
  assert.equal(bit.activeErrors().length, activeBrain - 1);
  bit.setStatus(bit.findError(brainOne.id), 'activo');
  assert.equal(bit.activeErrors().length, activeBrain);

  // Si el error propio ya llegó al cerebro (script en el PC), no se muestra dos veces
  const fromBrain = { has_feedback: true, grammar: 'SomeMistakes', original: BITACORA[0].wrong[0], corrected: BITACORA[0].right[0] };
  bit.addFromAnalyses([fromBrain], day1);
  assert.equal(bit.allErrors().filter(e => e.local).length, 1);
  bit.removeError(mine[0].id);
  assert.equal(store.get().myErrors.length, 1);
});

test('ningún archivo tiene caracteres de control escondidos (p. ej. \b roto en una expresión regular)', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const bad = readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js'))
    .filter(f => /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(readFileSync(join(ROOT, 'js', f), 'utf8')));
  assert.deepEqual(bad, []);
});

// ---------------- Gramática por piezas (Pablo Bolen) y tabla de verbos ----------------
test('gramática: 3 lecciones por nivel, cada pieza está en su frase y sus opciones falsas son distintas', async () => {
  const G = await import('../js/grammar.js');
  for (let r = 1; r <= 6; r++) assert.equal(G.LESSONS.filter(l => l.rank === r).length, 3, `nivel ${r}`);
  for (let i = 1; i < G.LESSONS.length; i++) assert.ok(G.LESSONS[i].rank >= G.LESSONS[i - 1].rank, 'en orden de nivel');
  assert.equal(new Set(G.LESSONS.map(l => l.id)).size, G.LESSONS.length);
  for (const l of G.LESSONS) {
    assert.ok(l.idea && l.table.length >= 2 && l.exercises.length >= 5, l.id);
    for (const x of l.exercises) {
      assert.ok(!/[[\]]/.test(x.es + x.en), x.id);
      assert.ok(x.pieces.length >= 1, x.id);
      for (const p of x.pieces) {
        assert.ok(x.es.toLowerCase().includes(p.es.toLowerCase()), `${x.id}: «${p.es}» en «${x.es}»`);
        assert.ok(x.en.includes(p.en), `${x.id}: «${p.en}» en «${x.en}»`);
        assert.equal(new Set([p.en, ...p.wrong]).size, 3, `${x.id}: opciones repetidas`);
      }
      assert.ok(G.validExercise(x), x.id);
    }
  }
});

test('gramática: las lecciones se abren por nivel o al aprobar la anterior; las fichas se arman', async () => {
  const G = await import('../js/grammar.js');
  assert.equal(G.nextLesson(1, {}).id, 'g-to');
  assert.equal(G.nextLesson(1, { 'g-to': 0.9 }).id, 'g-ing');
  assert.equal(G.unlocked(G.lessonById('g-will'), 1, {}), false);
  assert.equal(G.unlocked(G.lessonById('g-will'), 1, { 'g-be': 0.8 }), true);    // aprobó la anterior
  assert.equal(G.unlocked(G.lessonById('g-if3'), 5, {}), true);                  // su nivel
  assert.equal(G.nextLesson(6, Object.fromEntries(G.LESSONS.map(l => [l.id, 1]))), null);
  const x = G.lessonById('g-if3').exercises[0];
  const t = G.tiles(x.en);
  assert.notEqual(t.join(' '), x.en);
  assert.deepEqual([...t].sort(), x.en.split(' ').sort());
  assert.ok(G.sameSentence('if i had known I would have called you', x.en));
  assert.ok(!G.sameSentence('If I would have known, I had called you.', x.en));
});

test('gramática: lo que crea la IA se revisa (pieza fuera de la frase u opciones repetidas no sirven)', async () => {
  const G = await import('../js/grammar.js');
  const good = { es: 'Si hubiera sabido, te habría llamado.', en: 'If I had known, I would have called you.', pieces: [{ es: 'hubiera sabido', en: 'had known', wrong: ['would have known', 'have known'] }] };
  assert.equal(G.validExercise(good).pieces.length, 1);
  assert.equal(G.validExercise({ ...good, pieces: [{ es: 'habría ido', en: 'would have gone', wrong: ['a', 'b'] }] }), null);
  assert.equal(G.validExercise({ ...good, pieces: [{ es: 'hubiera sabido', en: 'had known', wrong: ['had known', 'have known'] }] }), null);
  assert.equal(G.validExercise({ es: '', en: 'x' }), null);
});

test('tabla de verbos: 111 verbos del cerebro con sus tres formas en inglés y en español, con tildes', async () => {
  const G = await import('../js/grammar.js');
  assert.equal(G.VERBS.length, 111);
  const go = G.VERBS.find(v => v.base === 'go');
  assert.deepEqual([go.es, go.past, go.esPast, go.pp, go.esPp], ['ir', 'went', 'fue', 'gone', 'ido']);
  const talk = G.VERBS.find(v => v.base === 'talk');
  assert.equal(talk.type, 'R');
  assert.equal(talk.esPast, 'habló');
  assert.equal(G.VERBS.find(v => v.base === 'fall').esPp, 'caído');
  assert.equal(G.VERBS.find(v => v.base === 'say').esPast, 'dijo');            // pasado fuerte: sin tilde
  assert.equal(G.VERBS.find(v => v.base === 'miss').es, 'extrañar');
  for (const v of G.VERBS) assert.ok(v.base && v.past && v.pp && v.es && v.esPast && v.esPp, v.base);
  // Búsqueda por comienzo de palabra, sin importar tildes; filtro de irregulares
  assert.deepEqual(G.searchVerbs('went').map(v => v.base), ['go']);
  assert.ok(G.searchVerbs('hablo').some(v => v.base === 'speak'));
  assert.ok(G.searchVerbs('', 'I').every(v => v.type !== 'R'));
  assert.ok(G.searchVerbs('', 'R').every(v => v.type === 'R'));
  // Pruébese: la respuesta buena está entre 3 opciones distintas
  const qs = G.verbQuestions(G.VERBS, 200);                                // todos (menos los que no tienen forma)
  assert.equal(qs.length, 2 * G.VERBS.filter(v => !v.past.startsWith('(') && !v.pp.startsWith('(')).length);
  assert.ok(G.VERBS.every(v => !/\*/.test(v.past + v.pp)), 'sin asteriscos del mazo');
  for (const q of qs) {
    assert.equal(q.options.length, 3, q.verb.base);
    assert.equal(new Set(q.options).size, 3, q.verb.base);
    assert.ok(q.options.includes(q.right));
  }
});

// ---------------- Charla más rápida y sincronizada ----------------
test('respuesta por partes: se lee el texto del personaje aunque el JSON esté a medias', async () => {
  const { partialField, firstSentence } = await import('../js/llm.js');
  assert.equal(partialField('{"rep', 'reply'), null);
  assert.deepEqual(partialField('{"reply": "Hi there! How ar', 'reply'), { text: 'Hi there! How ar', done: false });
  assert.deepEqual(partialField(String.raw`{"reply":"Say \"hi\"\nnow","mood":0.5}`, 'reply'), { text: 'Say "hi"'+'\n'+'now', done: true });
  assert.deepEqual(partialField(String.raw`{"reply":"caf\u00e9 time`, 'reply'), { text: 'café time', done: false });
  assert.equal(partialField(String.raw`{"reply":"ab\u00`, 'reply').text, 'ab');          // escape incompleto: espera
  assert.equal(firstSentence('Oh, nice to hear that! And wh'), 'Oh, nice to hear that!');
  assert.equal(firstSentence('Oh, nice to hear that!'), null);                  // aún no se sabe si terminó
  assert.equal(firstSentence('Oh. Really now? I love'), 'Oh. Really now?');   // no corta en «Oh.» (mínimo 12 letras)
});

test('respuesta por partes: lee el stream de DeepSeek (SSE) y cuenta los tokens', async () => {
  const { readStream } = await import('../js/llm.js');
  const enc = new TextEncoder();
  const lines = [
    ': keep-alive\n\n',
    'data: {"choices":[{"delta":{"content":"{\\"reply\\":\\"Hel"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"lo!\\"}"},"finish_reason":"stop"}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":9,"completion_tokens":4}}\n',
    '\ndata: [DONE]\n\n',
  ];
  const body = new ReadableStream({ start(c) { lines.forEach(l => c.enqueue(enc.encode(l))); c.close(); } });
  const seen = [];
  const r = await readStream({ body }, t => seen.push(t));
  assert.equal(r.text, '{"reply":"Hello!"}');
  assert.equal(r.finish, 'stop');
  assert.deepEqual(r.usage, { prompt_tokens: 9, completion_tokens: 4 });
  assert.deepEqual(seen, ['{"reply":"Hel', '{"reply":"Hello!"}']);
});

test('modo demo: la respuesta también llega por partes', async () => {
  const { chatJson } = await import('../js/llm.js');
  store.update(s => { s.settings.apiKey = 'demo'; });
  const parts = [];
  const r = await chatJson('opening', [{ role: 'system', content: 'You are Emma, a barista.' }], { onText: t => parts.push(t) });
  assert.ok(parts.length > 2);
  assert.equal(parts.at(-1), JSON.stringify(r));
});

test('texto al ritmo de la voz: mide el ritmo del teléfono y la pausa para enviar', async () => {
  const sp = await import('../js/speech.js');
  assert.ok(Math.abs(sp.msPerWord() - 60000 / 165) < 1);       // sin medir: ritmo normal
  sp.learnPace(10, 5000);                                         // 500 ms por palabra
  assert.equal(store.get().settings.paceMs, 500);
  sp.learnPace(10, 3000);                                         // se promedia, no salta
  assert.equal(store.get().settings.paceMs, 440);
  assert.equal(sp.msPerWord(2), 220);                              // más rápido = menos ms
  sp.learnPace(2, 3000);                                          // frase corta: no cuenta
  assert.equal(store.get().settings.paceMs, 440);
  assert.equal(sp.sendPauseMs(), sp.WAIT_AFTER_SPEECH_MS);
  assert.ok(sp.WAIT_AFTER_SPEECH_MS >= 3000);                      // da tiempo de pensar a mitad de la frase
  store.update(s => { s.settings.sendPauseMs = 6000; });
  assert.equal(sp.sendPauseMs(), 6000);
  store.update(s => { s.settings.sendPauseMs = 1600; });           // la pausa corta de antes pasa a la normal
  assert.equal(sp.sendPauseMs(), sp.WAIT_AFTER_SPEECH_MS);
  store.update(s => { s.settings.sendPauseMs = 123; });
  assert.equal(sp.sendPauseMs(), sp.WAIT_AFTER_SPEECH_MS);
});

// Reconocedor falso que se porta como el de Android: se corta solo en cada pausa o tras un rato sin oír nada.
function fakeRecognizer(plans) {
  const made = [];
  class FakeRec {
    constructor() { this.plan = plans.shift() || { end: 60, error: 'no-speech' }; made.push(this); }
    start() {
      const results = [];
      this.timers = (this.plan.said || []).map(([ms, text, fin = true]) => setTimeout(() => {
        results.push(Object.assign([{ transcript: text }], { isFinal: fin }));
        this.onresult?.({ results: [...results] });
      }, ms));
      this.timers.push(setTimeout(() => this.finish(this.plan.error), this.plan.end));
    }
    finish(error) {
      if (this.done) return;
      this.done = true;
      this.timers.forEach(clearTimeout);
      if (error) this.onerror?.({ error });
      this.onend?.();
    }
    stop() { setTimeout(() => this.finish(), 5); }
    abort() { setTimeout(() => this.finish('aborted'), 5); }
  }
  return { FakeRec, made };
}

test('escuchar: si el teléfono se corta en una pausa, sigue escuchando y junta toda la frase', async () => {
  const { Listener } = await import('../js/speech.js');
  // Se queda pensando (el teléfono se corta sin oír nada), dice «I think», piensa otra vez y termina la frase.
  const { FakeRec, made } = fakeRecognizer([
    { end: 80, error: 'no-speech' },
    { said: [[20, 'I think']], end: 60 },
    { said: [[90, 'I would like a coffee']], end: 130 },
  ]);
  const l = new Listener(FakeRec);
  const t0 = Date.now();
  const r = await l.start({ firstWordMs: 2000, pauseMs: 250, restartMs: 10 });
  assert.equal(r.text, 'I think I would like a coffee');
  assert.ok(made.length >= 3, `abrió ${made.length} veces`);
  assert.ok(Date.now() - t0 >= 250, 'espera la pausa elegida después de la última palabra');
  assert.ok(!l.active);
});

test('escuchar: da tiempo para pensar antes de hablar y el micrófono termina el turno al tocarlo', async () => {
  const { Listener } = await import('../js/speech.js');
  // Nadie habla: no se rinde en el primer corte del teléfono, espera todo el tiempo para pensar.
  const silent = fakeRecognizer([]);
  const t0 = Date.now();
  const r = await new Listener(silent.FakeRec).start({ firstWordMs: 300, pauseMs: 100, restartMs: 10 });
  assert.equal(r.text, '');
  assert.ok(Date.now() - t0 >= 290 && silent.made.length >= 3);
  // Tocar el micrófono envía ya lo que dijo, sin esperar la pausa.
  const talk = fakeRecognizer([{ said: [[20, 'Hello there']], end: 5000 }]);
  const l = new Listener(talk.FakeRec);
  const p = l.start({ firstWordMs: 3000, pauseMs: 3000, restartMs: 10 });
  await new Promise(res => setTimeout(res, 60));
  const t1 = Date.now();
  l.stop();
  assert.equal((await p).text, 'Hello there');
  assert.ok(Date.now() - t1 < 500);
  // Sin permiso de micrófono: avisa en vez de quedarse abriendo una y otra vez.
  const denied = fakeRecognizer([{ end: 10, error: 'not-allowed' }]);
  await assert.rejects(new Listener(denied.FakeRec).start({ restartMs: 10 }), /Permiso de micrófono/);
  assert.equal(denied.made.length, 1);
});

test('voz natural: cada trozo de audio sabe dónde empieza en el texto', async () => {
  const { segmentOffsets } = await import('../js/natural-voice.js');
  const text = 'Hi there! How are you today? I am fine.';
  const where = segmentOffsets(text);
  assert.deepEqual(where('Hi there!'), { offset: 0, length: 9 });
  assert.deepEqual(where(' How are you today?'), { offset: 10, length: 18 });
  assert.deepEqual(where('I am fine.'), { offset: 29, length: 10 });
});

test('portada: saludo, semana y meta del día', async () => {
  const D = await import('../js/dashboard.js');
  assert.equal(D.greeting(new Date(2026, 10, 18, 8)), 'Buenos días');
  assert.equal(D.greeting(new Date(2026, 10, 18, 15)), 'Buenas tardes');
  assert.equal(D.greeting(new Date(2026, 10, 18, 22)), 'Buenas noches');
  assert.equal(D.dateLine(new Date(2026, 10, 18, 12)), 'Miércoles 18 de noviembre');
  const now = new Date(2026, 10, 18, 12);
  store.update(s => { s.streak.days = ['2026-11-18', '2026-11-16']; s.streak.frozenDays = ['2026-11-17']; });
  const w = D.weekStrip(store.get(), now);
  assert.equal(w.length, 7);
  assert.ok(w[6].today && w[6].done);
  assert.ok(w[5].frozen && !w[5].done);
  assert.ok(w[4].done);
  store.update(s => { s.daily = { date: store.todayIso(), seconds: 300 }; s.dailyGoal = 10; });
  assert.deepEqual(D.todayProgress(), { min: 5, goal: 10, pct: 0.5 });
});

test('respuesta por partes: con DeepSeek simulado habla por partes y, si no la acepta, la pide entera', async () => {
  const { chatJson } = await import('../js/llm.js');
  store.update(s => { s.settings.apiKey = 'clave-de-prueba'; s.settings.capBlock = false; });
  const realFetch = globalThis.fetch;
  const bodies = [];
  const sse = chunks => new Response(new ReadableStream({ start(c) { const e = new TextEncoder(); chunks.forEach(x => c.enqueue(e.encode(x))); c.close(); } }), { status: 200 });
  try {
    // 1) acepta el stream
    globalThis.fetch = async (url, init) => {
      bodies.push(JSON.parse(init.body));
      return sse(['data: {"choices":[{"delta":{"content":"{\\"reply\\":\\"Hi"}}]}\n\n', 'data: {"choices":[{"delta":{"content":" you!\\"}"},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":3}}\n\n', 'data: [DONE]\n\n']);
    };
    const seen = [];
    const r = await chatJson('reply', [{ role: 'user', content: 'x' }], { onText: t => seen.push(t) });
    assert.deepEqual(r, { reply: 'Hi you!' });
    assert.equal(bodies[0].stream, true);
    assert.equal(seen.length, 2);
    // 2) no acepta el stream (400): la pide entera y funciona igual
    bodies.length = 0;
    globalThis.fetch = async (url, init) => {
      const b = JSON.parse(init.body);
      bodies.push(b);
      if (b.stream) return new Response('stream_options not supported', { status: 400 });
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"reply":"Hello"}' }, finish_reason: 'stop' }] }), { status: 200 });
    };
    const r2 = await chatJson('reply', [{ role: 'user', content: 'x' }], { onText: () => {} });
    assert.deepEqual(r2, { reply: 'Hello' });
    assert.deepEqual(bodies.map(b => b.stream), [true, false]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ---------------- Mil palabras (vienen en la app) ----------------
test('mil palabras: las 1000 vienen en la app, en orden, con significado, frase y traducción', async () => {
  const M = await import('../js/mil.js');
  const cards = await M.loadMilCards();
  assert.equal(cards.length, M.MIL_TOTAL);
  assert.deepEqual(cards.map(c => c.id), Array.from({ length: 1000 }, (_, i) => i + 1));
  for (const c of cards) {
    assert.ok(c.word && c.front && c.defs.length && c.sentence && c.translation, `tarjeta ${c.id} incompleta`);
  }
  const have = cards[0];
  assert.equal(have.word, 'have');
  assert.deepEqual(have.defs, ['(v.) Tener.', '(v.) Haber.']);
  assert.deepEqual(have.forms, ['has', 'had']);
  // La palabra (o una de sus formas) se marca en casi todas las frases.
  const hits = cards.filter(c => M.highlightParts(c.sentence, c).some(p => p.hit)).length;
  assert.ok(hits >= 960, `solo ${hits} frases marcan su palabra`);
  assert.equal(await M.loadMilCards(), cards);                          // se carga una sola vez
  assert.deepEqual(M.rowToCard([5, 'get', '(v.) Obtener.', '', 'I get it.', 'Lo entiendo.']).forms, []);
});

test('labios: una apertura por sílaba, misma forma dentro de la sílaba y pausas en la puntuación', async () => {
  const L = await import('../js/lipsync.js');
  const mom = L.wordShapes('mom');
  assert.equal(mom[0].shape.open, 0);                                   // m: labios cerrados
  assert.ok(mom[1].shape.round >= 0.5);                                 // o: redonda
  assert.equal(mom[2].shape.open, 0);                                   // m final: cierra
  const see = L.wordShapes('see');
  assert.ok(see[1].shape.wide >= 0.8);                                  // ee: estirada
  assert.equal(see[0].shape.wide, see[1].shape.wide);                   // la «s» no cambia la forma, solo entrecierra
  assert.equal(L.wordShapes('make').length, 3);                         // m-a-k: la e final no suena
  const t = L.lipTrack('Hi, how are you?');
  assert.deepEqual(t.words.map(w => w.char), [0, 4, 8, 12]);
  assert.ok(t.words[0].pauseAfter && !t.words[1].pauseAfter);
  assert.ok(t.frames.some(f => f.d === L.UNIT.comma && f.shape === L.REST));
  assert.ok(t.end < t.units);                                           // el punto final no es habla
  assert.equal(L.sampleAt(t, -1), L.REST);
  assert.equal(L.sampleAt(t, t.units + 1), L.REST);
  assert.equal(L.wordAt(t, 9), 2);
  // En una respuesta normal la boca casi no se cierra dentro de las palabras (solo con m, b, p)
  // y cambia unas 4–6 veces por segundo, no a cada letra.
  const reply = L.lipTrack('Sure, the wifi password is on the receipt. There is an outlet near the window, and you can stay as long as you like.');
  let inWords = 0, closed = 0;
  for (const w of reply.words) for (const f of reply.frames) if (f.u >= w.u && f.u < w.end) { inWords += f.d; if (f.shape.open < 0.15) closed += f.d; }
  assert.ok(closed / inWords < 0.15, `cerrada ${Math.round((100 * closed) / inWords)} % del tiempo`);
  const opens = reply.frames.filter(f => f.shape.open >= 0.4).length;
  const seconds = (reply.end * 170) / 1000;
  assert.ok(opens / seconds > 3 && opens / seconds < 7, `${(opens / seconds).toFixed(1)} aperturas por segundo`);
});

// Voz simulada: cada unidad dura trueMs (el teléfono real), con ±15 % de variación por palabra.
function simulateVoice(L, text, trueMs, seed = 7) {
  const track = L.lipTrack(text);
  let x = seed;
  const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
  const at = [];                                                        // [tiempo real, posición real] al empezar cada palabra
  let t = 0, prevU = 0;
  for (const w of track.words) { t += (w.u - prevU) * trueMs * (0.85 + 0.3 * rnd()); at.push([t, w.u, w.char]); prevU = w.u; }
  const endT = t + (track.end - prevU) * trueMs;
  const truePos = time => {
    let k = 0;
    while (k + 1 < at.length && at[k + 1][0] <= time) k++;
    const [t0, u0] = at[k], [t1, u1] = at[k + 1] || [endT, track.end];
    return u0 + ((time - t0) / (t1 - t0)) * (u1 - u0);
  };
  return { track, at, endT, truePos };
}

test('labios: siguen a la voz aunque vaya a otro ritmo, con o sin aviso de palabras', async () => {
  const L = await import('../js/lipsync.js');
  const text = "Sure! The wifi password is on the receipt, and there's an outlet right next to the window table.";
  const v = simulateVoice(L, text, 175);
  // 1) La voz avisa cada palabra: la app arranca creyendo 110 ms y se corrige sola.
  const c = L.lipClock(v.track, 110);
  c.start(0);
  let k = 0, err = 0, n = 0, ahead = 0;
  for (let time = 0; time < v.endT; time += 20) {
    while (k < v.at.length && v.at[k][0] <= time) { c.word(v.at[k][2], v.at[k][0]); k++; }
    const p = c.pos(time), real = v.truePos(time);
    if (k >= 3) { err += Math.abs(p - real); n++; }
    const next = v.track.words[k];
    if (next && p > next.u) ahead++;
  }
  assert.equal(ahead, 0, 'la boca nunca va por delante de la palabra que dice la voz');
  assert.ok(err / n < 0.5, `desfase medio ${(err / n).toFixed(2)} sílabas`);
  // 2) La voz NO avisa las palabras: tras medir una frase, la siguiente termina casi a la vez que la voz.
  const learned = L.measuredUnitMs(v.track, v.endT, 1);
  assert.ok(Math.abs(learned - 175) / 175 < 0.15);
  const v2 = simulateVoice(L, 'I usually come here on Mondays because the coffee is great and the music is quiet.', 175, 99);
  const c2 = L.lipClock(v2.track, learned);
  c2.start(0);
  let tEnd = 0;
  for (let time = 0; time < 20000 && !tEnd; time += 10) if (c2.pos(time) >= v2.track.end) tEnd = time;
  assert.ok(Math.abs(tEnd - v2.endT) / v2.endT < 0.12, `la boca termina en ${tEnd} ms y la voz en ${Math.round(v2.endT)} ms`);
  assert.ok(L.babble(123).open > 0);                                    // si la voz sigue, la boca no se queda cerrada
});

test('Amy: una sola compañera con voz de mujer, labios que se abren y se puede volver a los personajes', async () => {
  const { CHARACTERS } = await import('../js/data.js');
  const C = await import('../js/cast.js');
  const A = await import('../js/avatar.js');
  C.applyCast(true);
  for (const c of Object.values(CHARACTERS)) {
    assert.equal(c.name, 'Amy');
    assert.equal(c.voice.gender, 'female');
    assert.equal(c.images, undefined);
    assert.ok(c.solo && c.profession);                                   // conserva su papel en el lugar
  }
  assert.equal(C.castNames(['maya', 'tom']), 'Amy');
  C.applyCast(false);
  // Sin «una sola compañera» vuelven las mujeres con sus imágenes, pero nunca un hombre (la voz es de mujer).
  for (const c of Object.values(CHARACTERS)) {
    assert.equal(c.sex, 'female', `${c.id} no puede ser hombre`);
    assert.equal(c.voice.gender, 'female');
    assert.ok(!/\b(his|him|he)\b/.test(`${c.profession} ${(c.interests || []).join(' ')}`), c.id);
  }
  assert.equal(CHARACTERS.tom.name, 'Amy');
  assert.ok(CHARACTERS.tom.solo && !CHARACTERS.tom.images);
  assert.equal(CHARACTERS.maya.name, 'Maya');
  assert.ok(!CHARACTERS.maya.solo && CHARACTERS.maya.images?.frames.includes('neutral'));
  assert.equal(C.castNames(['maya', 'tom']), 'Maya · Amy');
  assert.match(C.roleLine(CHARACTERS.tom), /^hace de profesora jubilada/);
  C.applyCast(true);
  const closed = A.mouthGeometry({ open: 0, wide: 0.5, round: 0 });
  const open = A.mouthGeometry({ open: 1, wide: 0.6, round: 0 });
  const round = A.mouthGeometry({ open: 0.7, wide: 0.2, round: 0.8 });
  assert.equal(closed.height, 0);
  assert.ok(open.height > 9);
  assert.ok(round.width < open.width);
  assert.ok(!/NaN/.test(open.upper + open.lower + open.inner + round.inner));
});

test('versión: la de la app es la del service worker y se sabe cuándo hay una nueva', async () => {
  const V = await import('../js/version.js');
  const { readFileSync } = await import('node:fs');
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  assert.equal(sw.match(/charla-v\d+/)[0], V.VERSION, 'js/version.js y sw.js deben tener la misma versión');
  assert.ok(V.isNewer('charla-v31', 'charla-v30') && !V.isNewer('charla-v30', 'charla-v30') && !V.isNewer('charla-v9', 'charla-v30'));
  assert.ok(!V.isNewer(null, 'charla-v30'));
  assert.equal(V.shortVersion('charla-v31'), 'v31');
  const ps = readFileSync(join(ROOT, 'herramientas', 'publicar.ps1'), 'utf8');
  assert.ok(ps.includes("js\\version.js"), 'publicar.ps1 debe subir también js/version.js');
});

test('contenido por nivel: cada nivel, de A1 a C2, trae gramática, frases, vocabulario y temas', async () => {
  const L = await import('../js/levelscreen.js');
  const P = await import('../js/phrases.js');
  for (let r = 1; r <= 6; r++) {
    const c = L.levelContent(r);
    assert.ok(c.temario.length >= 10, `${c.rank.code}: temario de gramática`);
    assert.ok(c.lessons.length >= 3, `${c.rank.code}: rompecabezas`);
    assert.ok(c.phrases.length >= 3, `${c.rank.code}: frases`);
    assert.ok(c.mil || c.words.length >= 5, `${c.rank.code}: vocabulario`);
    assert.ok(c.topics.length >= 3, `${c.rank.code}: temas`);
    assert.equal(c.rank.canDo.length, 3, `${c.rank.code}: qué puede hacer`);
  }
  // En los paquetes nuevos la respuesta del hueco no se ve en el resto de la frase.
  for (const pk of P.PACKS.filter(p => ['B2', 'C1', 'C2'].includes(p.level) || p.group === 'nivel')) {
    assert.equal(P.packPhrases(pk.id).length, 10, pk.id);
    for (const x of P.packPhrases(pk.id)) assert.ok(!x.en.replace(x.gap, '').toLowerCase().includes(x.gap.toLowerCase()), x.id);
  }
  assert.equal(P.recommendedPack([], 'C1').level, 'C1');
  assert.deepEqual(L.milRangeProgress({ cards: { 1: { ivl: 2 }, 2: { ivl: 0 }, 400: { ivl: 5 } } }, [1, 300]), { seen: 2, learned: 1, total: 300 });
});

test('temario: todos los temas de A1 a C2, en español primero, sin jerga y con práctica válida', async () => {
  const T = await import('../js/temario.js');
  const G = await import('../js/grammar.js');
  const P = await import('../js/prompts.js');
  for (const c of T.CODES) assert.ok(T.levelTopics(c).length >= 10, c);
  const ids = new Set();
  const jerga = /participio|condicional|subjuntivo|pasiva|cláusula|gerundio|infinitivo|auxiliar/i;
  for (const t of T.TOPICS) {
    assert.ok(!ids.has(t.id), `repetido: ${t.id}`); ids.add(t.id);
    assert.ok(t.es && t.en && t.ai && t.form.length >= 2 && t.ex.length >= 3 && t.traps.length >= 1, t.id);
    for (const k of ['title', 'es', 'en']) assert.ok(!jerga.test(t[k]), `${t.id}: jerga en ${k}`);
    for (const f of t.form) assert.equal(f.length, 3, `${t.id}: forma`);
    for (const e of t.ex) assert.equal(e.length, 2, `${t.id}: ejemplo`);
    for (const r of t.traps) assert.equal(r.length, 3, `${t.id}: error típico`);
    if (t.lesson) assert.ok(G.lessonById(t.lesson), `${t.id}: ${t.lesson}`);
    assert.ok(t.quiz.length >= 10, `${t.id}: ${t.quiz.length} preguntas`);
    const seen = new Set();
    for (const q of t.quiz) {
      const x = T.asQuestion(q, t);
      assert.ok(T.validQuestion(x), `${t.id}: ${q[1]}`);
      assert.ok(!seen.has(x.full), `${t.id}: repetida ${x.full}`); seen.add(x.full);
      // Cada pregunta explica por qué, en español y sin jerga.
      assert.ok(x.why && x.why.length < 200 && !jerga.test(x.why), `${t.id}: porqué de ${q[1]}`);
    }
  }
  // El porqué: el de la pregunta; si no lo trae, el error típico del tema que corresponde.
  const be = T.topicById('a1-be');
  assert.match(T.explain(T.asQuestion(be.quiz[0], be), 'is'), /am/);
  assert.equal(T.explain({ es: 'x', en: 'I ___ 30.', answer: "I'm 30", wrong: [], topic: 'a1-be' }, 'I have 30 years.'), be.traps[0][2]);
  assert.equal(T.explain({ es: 'x', en: '___', answer: 'zzz', wrong: [], topic: 'a1-be' }, 'qqq'), '');
  assert.ok(!T.validQuestion({ es: 'x', en: 'a ___ b', answer: 'c', wrong: ['d', 'e'], why: 5 }));
  // «Dígalo usted»: decir la frase entera. Acepta contracciones y números dichos. Una palabra de más o de
  // menos es «casi» y no cuenta: suele ser justo el error típico.
  const teacher = T.asQuestion(be.quiz[0], be);   // I ___ a teacher. → am
  assert.ok(T.sayCheck(teacher, "I'm a teacher").ok);
  assert.ok(T.sayCheck(teacher, 'i am a teacher.').ok);
  const close = T.sayCheck(teacher, 'I am teacher');
  assert.ok(!close.ok && close.close && close.key);
  const if2 = T.topicById('b1-if2');
  const lost = T.asQuestion(if2.quiz.find(x => x[2] === 'lost'), if2);
  const typical = T.sayCheck(lost, 'What would you do if you would lost your job');
  assert.ok(!typical.ok && typical.close, 'el «would» de más no puede contar como bien');
  const bad = T.sayCheck(teacher, 'I is a teacher');
  assert.ok(!bad.ok && !bad.key);
  assert.ok(!T.sayCheck(teacher, '').ok);
  assert.ok(T.hasPiece('There were a lot of people', 'There were') && !T.hasPiece('There was a lot', 'There were'));
  assert.equal(T.sayHint(teacher), 'I … a teacher.');
  const round = T.saySet(be);
  assert.equal(round.length, T.SAY_SIZE);
  assert.equal(new Set(round.map(q => q.full)).size, T.SAY_SIZE);
  // Todas las frases del temario, dichas tal cual, cuentan como bien y tienen su parte clave.
  for (const t of T.TOPICS) for (const raw of t.quiz) {
    const q = T.asQuestion(raw, t);
    assert.ok(T.sayCheck(q, q.full).ok && T.hasPiece(q.full, q.answer), `${t.id}: ${q.full}`);
  }
  assert.match(P.temarioMessages({ topic: be, rankId: 1 })[0].content, /"why"/);
  assert.match(P.explainMessages({ original: 'I is a teacher.', corrected: 'I am a teacher.', meant: 'Soy profesor.' })[1].content, /Soy profesor/);
  // La lista «B1 sólido» del cerebro de inglés está en B1.
  for (const id of ['b1-ppvsps', 'b1-pastperf', 'b1-passive', 'b1-deduce', 'b1-reported', 'b1-relative', 'b1-ingto', 'b1-phrasal', 'b1-prep']) assert.equal(T.topicById(id)?.level, 'B1', id);
  // Examen: 20 preguntas que tocan todos los temas del nivel.
  const exam = T.examSet('B1', 20, () => 0.3);
  assert.equal(exam.length, 20);
  assert.equal(new Set(exam.map(q => q.topic)).size, T.levelTopics('B1').length);
  const r = T.examResult([{ topic: 'a', ok: true }, { topic: 'b', ok: false }, { topic: 'b', ok: true }, { topic: 'c', ok: false }]);
  assert.equal(r.got, 2);
  assert.deepEqual(r.weak, ['c', 'b']);
  assert.deepEqual(T.levelProgress('A1', { best: { 'a1-be': 0.9, 'a1-pron': 0.5 }, exam: { A1: 0.85 } }), { passed: 1, total: T.levelTopics('A1').length, exam: 0.85 });
  // Charla para usar el tema: una misión completa para el personaje.
  const m = T.practiceMission(T.topicById('b1-if2'));
  assert.equal(m.objectives.length, 3);
  assert.match(m.instruction, /second conditional/);
  assert.equal(m.rankRequired, 3);
  // Lo que crea la IA se revisa antes de usarlo.
  assert.ok(T.validQuestion({ es: 'x', en: 'a ___ b', answer: 'c', wrong: ['d', 'e'] }));
  assert.ok(!T.validQuestion({ es: 'x', en: 'a b', answer: 'c', wrong: ['d', 'e'] }));
  assert.ok(!T.validQuestion({ es: 'x', en: 'a ___ b', answer: 'c', wrong: ['C', 'e'] }));
});

test('sugerencias: pide una sola respuesta y, con «Otra idea», una distinta', async () => {
  const P = await import('../js/prompts.js');
  const mission = { name: 'Pide tu desayuno', description: 'Ordena', objectives: [] };
  const one = P.suggestionMessages({ history: [], rankId: 1, mission })[0].content;
  assert.match(one, /Give ONE reply/);
  assert.doesNotMatch(one, /3 different/);
  const other = P.suggestionMessages({ history: [], rankId: 1, mission, avoid: "I'd like a coffee." })[0].content;
  assert.match(other, /different from: "I'd like a coffee\."/);
});

test('mil palabras: Otra vez · Difícil · Bien · Fácil como en Anki', async () => {
  const M = await import('../js/mil.js');
  const now = new Date(2026, 10, 18, 12).getTime();
  const tomorrow = new Date(2026, 10, 19).getTime();
  assert.deepEqual([M.grade(null, 'good', now).ivl, M.grade(null, 'hard', now).ivl, M.grade(null, 'easy', now).ivl, M.grade(null, 'again', now).ivl], [1, 1, 4, 0]);
  assert.equal(M.grade(null, 'good', now).due, tomorrow);
  assert.equal(M.grade(null, 'again', now).due, now);                    // vuelve hoy mismo
  const r = { ivl: 10, ease: 2.5, reps: 3, lapses: 0 };
  assert.equal(M.grade(r, 'good', now).ivl, 25);
  assert.deepEqual([M.grade(r, 'hard', now).ivl, M.grade(r, 'hard', now).ease], [12, 2.35]);
  assert.deepEqual([M.grade(r, 'easy', now).ivl, M.grade(r, 'easy', now).ease], [33, 2.65]);
  const lapse = M.grade(r, 'again', now);
  assert.deepEqual([lapse.ivl, lapse.lapses, lapse.ease], [0, 1, 2.3]);
  assert.equal(M.grade(lapse, 'good', now).ivl, 1);                       // reaprendida: mañana
  assert.ok(M.grade({ ivl: 3000, ease: 3 }, 'easy', now).ivl <= M.MAX_DAYS);
  assert.equal(M.intervalLabel(null, 'again'), '<1 min');
  assert.equal(M.intervalLabel(r, 'good', now), '25 d');
  assert.equal(M.intervalLabel({ ivl: 40, ease: 2.5 }, 'good', now), '3 m');
  assert.equal(M.intervalLabel({ ivl: 200, ease: 2.5 }, 'good', now), '1.4 a');
});

test('mil palabras: qué toca hoy (aprendiendo, repasos y unas pocas nuevas por día)', async () => {
  const M = await import('../js/mil.js');
  const now = new Date(2026, 10, 18, 12).getTime(), iso = '2026-11-18';
  const cards = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, word: 'w' + (i + 1) }));
  const m = M.normalize({ newPerDay: 10, total: 50, cards: {
    1: { ivl: 0, due: now - 1000 },                                   // aprendiéndola
    2: { ivl: 3, due: new Date(2026, 10, 18).getTime() },             // toca hoy
    3: { ivl: 5, due: new Date(2026, 10, 10).getTime() },             // atrasada
    4: { ivl: 30, due: new Date(2026, 11, 1).getTime() },             // todavía no
  }, day: { date: iso, newSeen: 7, answers: 9 } });
  const q = M.buildQueue(cards, m, now, iso);
  assert.deepEqual(q.learning.map(c => c.id), [1]);
  assert.deepEqual(q.reviews.map(c => c.id), [3, 2]);                 // la más atrasada primero
  assert.deepEqual(q.fresh.map(c => c.id), [5, 6, 7]);                // quedan 3 de 10 nuevas hoy
  M.moreNew(m, iso);
  assert.equal(M.buildQueue(cards, m, now, iso).fresh.length, 8);
  assert.equal(M.buildQueue(cards, m, now, '2026-11-19').fresh.length, 10);   // otro día: se reinicia
  const c = M.counts(cards, m, now, iso), qc = M.quickCounts(m, now, iso);
  assert.deepEqual([c.due, c.fresh, c.learned, c.seen], [3, 8, 3, 4]);
  assert.deepEqual([qc.due, qc.fresh, qc.learned, qc.seen], [3, 8, 3, 4]);
  assert.equal(M.stageOf(null).key, 'new');
  assert.equal(M.stageOf({ ivl: 0 }).key, 'learning');
  assert.equal(M.stageOf({ ivl: 30 }).key, 'mature');
  assert.equal(M.normalize({ newPerDay: 999 }).newPerDay, M.DEFAULT_NEW);
});

test('mil palabras: la frase marca la palabra (o su forma), el tipo y la búsqueda', async () => {
  const M = await import('../js/mil.js');
  const S = await import('../js/milscreen.js');
  const buy = { id: 3, word: 'buy', front: 'buy', forms: ['bought'], defs: ['(v.) Comprar.'] };
  assert.deepEqual(M.highlightParts('Yesterday I bought bread.', buy).filter(p => p.hit).map(p => p.text), ['bought']);
  assert.deepEqual(M.highlightParts('She buys food.', buy).filter(p => p.hit).map(p => p.text), ['buys']);
  assert.deepEqual(M.highlightParts('Nothing here.', buy), [{ text: 'Nothing here.', hit: false }]);
  const until = { word: 'until', front: 'until, till', forms: [] };
  assert.deepEqual(M.highlightParts('Wait till noon.', until).filter(p => p.hit).map(p => p.text), ['till']);
  assert.equal(S.typeFromDef('(v.) Comprar.'), 'Verb');
  assert.equal(S.typeFromDef('(sus.) Comida'), 'Noun');
  assert.equal(S.typeFromDef('(adj.) Grande'), 'Adjective');
  const cards = [buy, { id: 2, word: 'food', front: 'food', forms: [], defs: ['(sus.) Comida'] }];
  const m = M.normalize({ cards: { 2: { ivl: 40 } } });
  assert.deepEqual(S.filterCards(cards, m, 'comida').map(c => c.id), [2]);
  assert.deepEqual(S.filterCards(cards, m, '', 'mature').map(c => c.id), [2]);
  assert.deepEqual(S.filterCards(cards, m, '', 'new').map(c => c.id), [3]);
});

test('mil palabras: el avance va en la copia de seguridad y la portada arma el plan de hoy', async () => {
  const D = await import('../js/dashboard.js');
  assert.equal(store.get().mil.total, 1000);                           // vienen en la app: nada que importar
  let plan = D.todayPlan(store.get(), new Date());
  assert.match(plan.items.find(i => i.key === 'mil').detail, /10 nuevas/);
  store.update(s => { s.mil.cards = { 1: { ivl: 4, due: Date.now() + 9e8 } }; });
  plan = D.todayPlan(store.get(), new Date());
  assert.match(plan.items.find(i => i.key === 'mil').detail, /10 nuevas/);
  store.importJson(JSON.stringify({ settings: {}, mil: { imported: true, name: 'Refold', images: true, cards: { 1: { ivl: 4, due: Date.now() + 9e8 } } } }));
  assert.equal(store.get().mil.imported, undefined);                   // lo del .apkg viejo se limpia
  assert.equal(store.get().mil.cards[1].ivl, 4);                       // el avance se conserva
  const backup = store.exportJson();
  store.reset();
  store.importJson(backup);
  assert.equal(store.get().mil.cards[1].ivl, 4);
  store.importJson(JSON.stringify({ settings: {} }));                  // respaldo viejo, sin mazo
  assert.equal(store.get().mil.newPerDay, 10);
  assert.deepEqual(store.get().mil.cards, {});
});
