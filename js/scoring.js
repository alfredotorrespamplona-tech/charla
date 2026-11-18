// El "algoritmo": puntos, estrellas, racha, relación, nivel (una escalera de 6) y familiaridad del vocabulario.
// Modelado sobre los campos observados en el APK (ver ANALISIS.md §5); los números son diseño propio.
import * as store from './store.js';
import { levelSettings, STARS_TO_UNLOCK_NEXT_LEVEL, MIN_STARS_TO_COUNT, RANKS, AFFECTION_MIN, AFFECTION_PER_LEVEL } from './data.js';

export const GRAMMAR_SCORE = { WrongLanguage: 0, ManyMistakes: 1, SomeMistakes: 2, MostlyCorrect: 3, Perfect: 4 };
export const APPROP_SCORE = { Inappropriate: 0, Somewhat: 1, Mostly: 2, Fully: 3 };

const POINTS = {
  base: 10,                // por turno válido (en inglés)
  objective: 30,           // por cada objetivo de misión cumplido
  vocabPerNewWord: 1,      // por palabra distinta nueva en la sesión (máx 10 por turno)
  vocabMaxPerTurn: 10,
  fluencyGood: 3,          // ≥ 60 palabras/min o respuesta rápida
  fluencyExcellent: 6,     // ≥ 90 palabras/min y demora < 4 s
  bookmarkUsed: 5,         // usó una palabra que tenía guardada
};
export const STAR_THRESHOLDS = [60, 140, 240];

export function words(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []).filter(w => w.length > 0);
}

// Puntos de un turno (PointsEarnedEvent).
export function scoreTurn({ text, durationMs, delayMs, usedSuggestion, analysis, objectivesCompleted, sessionWords, bookmarksUsed }) {
  const ws = words(text);
  const ev = { base: 0, objective: 0, vocabulary: 0, fluency: 0, bookmark: 0, excellentVocabulary: false, excellentFluency: false, wpm: 0, words: ws.length };
  const inEnglish = !analysis || analysis.grammar !== 'WrongLanguage';
  if (ws.length === 0 || !inEnglish) return { ...ev, total: 0 };

  ev.base = POINTS.base;
  ev.objective = objectivesCompleted * POINTS.objective;

  let fresh = 0;
  for (const w of new Set(ws)) if (!sessionWords.has(w)) { fresh++; sessionWords.add(w); }
  ev.vocabulary = usedSuggestion ? Math.floor(Math.min(fresh, POINTS.vocabMaxPerTurn) / 2) : Math.min(fresh, POINTS.vocabMaxPerTurn);
  ev.excellentVocabulary = fresh >= 8 && !usedSuggestion;

  ev.wpm = durationMs > 0 ? Math.round(ws.length / (durationMs / 60000)) : 0;
  if (!usedSuggestion && durationMs > 0 && ws.length >= 3) {
    if (ev.wpm >= 90 && delayMs < 4000) { ev.fluency = POINTS.fluencyExcellent; ev.excellentFluency = true; }
    else if (ev.wpm >= 60 || delayMs < 3000) ev.fluency = POINTS.fluencyGood;
  }
  ev.bookmark = bookmarksUsed * POINTS.bookmarkUsed;

  // La gramática afecta un poco el puntaje base (más estricto = más justo).
  const g = analysis ? GRAMMAR_SCORE[analysis.grammar] ?? 2 : 2;
  ev.base = Math.round(ev.base * (0.6 + g * 0.1));
  ev.total = ev.base + ev.objective + ev.vocabulary + ev.fluency + ev.bookmark;
  return ev;
}

// Transcripción (SessionTranscript): lo que dijo cada uno, con la corrección de las frases del aprendiz.
export const TRANSCRIPTS_KEPT = 60;   // charlas con transcripción guardada (para no llenar la memoria)
export function buildTranscript(session) {
  const turnAt = new Map(session.turns.map(t => [t.historyIndex, t]));
  return session.history.map((m, i) => {
    const a = m.role === 'learner' ? turnAt.get(i)?.analysis : null;
    const e = { role: m.role, text: m.text };
    if (a) {
      e.grade = a.grammar;
      if (a.has_feedback) e.fix = { corrected: a.corrected || '', better: a.better || '', explanation: a.explanation || '' };
    }
    return e;
  });
}

// Cierre de sesión (FinishSession): devuelve el resumen y aplica cambios al perfil.
import { missionLevel, totalMissionLevel, MISSION_LEVEL_COINS } from './lessons.js';
import { COINS_PER_STAR } from './coins.js';

export function finishSession(session) {
  const s = store.get();
  const level = levelSettings(s.rank, s.levelCustom);
  const t = session.turns;
  const learnerTurns = t.filter(x => x.text);

  const sum = k => t.reduce((a, x) => a + (x.points?.[k] || 0), 0);
  const base = sum('base'), objective = sum('objective'), vocabulary = sum('vocabulary'), fluency = sum('fluency'), bookmark = sum('bookmark');
  const raw = base + objective + vocabulary + fluency + bookmark;

  // Racha (LearningStreakUpdate): califica con ≥ 3 turnos hablados.
  const qualifies = learnerTurns.length >= 3;
  const streakUpdate = qualifies ? updateStreak() : { qualified: false, current: streakStatus().count, record: s.streak.record, firstToday: false, newRecord: false, freezesUsed: 0 };
  const streakBonusFraction = streakUpdate.qualified ? Math.min(0.5, streakUpdate.current * 0.05) : 0;

  // Bono del nivel: cuanto más alto el nivel (y más difíciles los ajustes personalizados), más puntos.
  const levelBonus = Math.round(raw * (level.scoreModifier - 1));
  const streakBonus = Math.round(raw * streakBonusFraction);
  const total = Math.max(0, raw + levelBonus + streakBonus);

  const stars = STAR_THRESHOLDS.filter(th => total >= th).length;
  const next = STAR_THRESHOLDS[stars] ?? STAR_THRESHOLDS[2];
  const prev = STAR_THRESHOLDS[stars - 1] ?? 0;
  const starsFraction = stars >= 3 ? 1 : (total - prev) / (next - prev);

  const totalWords = learnerTurns.reduce((a, x) => a + words(x.text).length, 0);
  const distinct = new Set(learnerTurns.flatMap(x => words(x.text))).size;
  const suggestionWords = learnerTurns.filter(x => x.usedSuggestion).reduce((a, x) => a + words(x.text).length, 0);
  const avg = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const spoken = learnerTurns.filter(x => x.durationMs > 0);
  const stats = {
    turns: learnerTurns.length,
    totalWords,
    distinctWords: distinct,
    avgWpm: Math.round(avg(spoken.map(x => x.points?.wpm || 0))),
    avgDelaySec: +(avg(learnerTurns.map(x => x.delayMs || 0)) / 1000).toFixed(1),
    avgAnswerSec: +(avg(spoken.map(x => x.durationMs)) / 1000).toFixed(1),
    suggestionPct: totalWords ? Math.round((suggestionWords / totalWords) * 100) : 0,
    avgGrammar: +avg(learnerTurns.filter(x => x.analysis).map(x => GRAMMAR_SCORE[x.analysis.grammar] ?? 2)).toFixed(2),
    durationSec: Math.round((Date.now() - session.startedAt) / 1000),
    spokeSec: Math.round(learnerTurns.reduce((a, x) => a + (x.durationMs || 0), 0) / 1000),
  };
  // Primera charla: «habló X segundos y usó Y palabras» (como en la bienvenida de LingoLooper).
  const firstConversation = s.history.length === 0 && learnerTurns.length ? { seconds: stats.spokeSec, words: totalWords } : null;
  let missionProgress = null;
  let coinsEarned = 0;

  const isPersonalBest = total > (s.bestScore || 0);

  // Relación con el personaje: cariño acumulado → nivel cada 10 puntos.
  const relBefore = { ...store.relationship(session.character.id) };
  let relAfter;
  store.update(st => {
    const rel = store.relationship(session.character.id);
    rel.conversations += 1;
    // El cariño puede bajar (si el personaje se sintió mal tratado): Enemigo y Némesis.
    rel.affection = Math.max(AFFECTION_MIN, rel.affection + session.affection + (qualifies ? 3 : 0));
    rel.level = Math.floor(rel.affection / AFFECTION_PER_LEVEL);
    if (!rel.metDate) rel.metDate = new Date().toISOString();
    relAfter = { ...rel };

    st.points += total;
    // Monedas: 1 por estrella (como LingoLooper) y 5 más si la misión sube de nivel.
    coinsEarned = stars * COINS_PER_STAR;
    if (isPersonalBest) st.bestScore = total;
    if (session.mission.id !== 'free' && session.mission.objectives.length && session.completed.size >= session.mission.objectives.length) {
      st.missionLevels[session.mission.id] = (st.missionLevels[session.mission.id] || 0) + 1;
    }
    // Nivel de la misión (MissionProgression): cada estrella suma; cada 4, sube un nivel y da monedas.
    if (session.mission.id !== 'custom' && stars > 0) {
      const xp0 = st.missionXp[session.mission.id] || 0;
      const before = missionLevel(xp0), after = missionLevel(xp0 + stars);
      st.missionXp[session.mission.id] = xp0 + stars;
      const up = after.level - before.level;
      if (up > 0) coinsEarned += MISSION_LEVEL_COINS * up;
      missionProgress = { before: before.level, after: after.level, pct: after.pct, coins: up > 0 ? MISSION_LEVEL_COINS * up : 0, total: totalMissionLevel(st.missionXp) };
    }
    st.coins += coinsEarned;
    // Meta diaria: minutos de charla de hoy.
    const today = store.todayIso();
    if (st.daily?.date !== today) st.daily = { date: today, seconds: 0 };
    st.daily.seconds += stats.durationSec;
  });

  // Nivel inicial: la autoevaluación es solo un punto de partida; la primera charla de verdad lo ajusta.
  let placement = null;
  if (s.placementPending && learnerTurns.length >= 3) {
    const g = stats.avgGrammar, d = stats.distinctWords;
    const adj = g >= 3.2 && d >= 30 ? 1 : (g <= 1.5 || d < 10 ? -1 : 0);
    const to = Math.min(RANKS.length, Math.max(1, s.rank + adj));
    placement = { from: s.rank, to };
    store.update(st => {
      st.placementPending = false;
      if (to !== st.rank) st.levelCustom = {};
      st.rank = to; st.highestRank = to; st.starsTowardUnlock = 0;
    });
  }

  // Subir de nivel: las charlas de 2 o más estrellas en el nivel más alto desbloqueado juntan estrellas.
  // Al llegar a la meta se desbloquea el siguiente y se le propone subir (puede decir «Aún no»).
  let levelUnlocked = null, unlockProposal = null;
  if (!placement && stars >= MIN_STARS_TO_COUNT) {
    store.update(st => {
      if (st.rank !== st.highestRank || st.highestRank >= RANKS.length) return;
      st.starsTowardUnlock += stars;
      if (st.starsTowardUnlock >= STARS_TO_UNLOCK_NEXT_LEVEL) {
        st.highestRank += 1;
        st.starsTowardUnlock = 0;
        levelUnlocked = st.highestRank;
        unlockProposal = st.rankProposal = { from: st.rank, to: st.highestRank, kind: 'up' };
      }
    });
  }

  const summary = {
    id: session.id,
    date: new Date().toISOString(),
    placeId: session.place.id,
    characterId: session.character.id,
    missionId: session.mission.id,
    missionName: session.mission.name,
    rank: level.rank.id,
    scoreModifier: level.scoreModifier,
    score: { base, objective, vocabulary, fluency, bookmark, levelBonus, streakBonus, streakBonusFraction, total, isPersonalBest },
    stars, starsFraction, thresholds: STAR_THRESHOLDS,
    objectivesCompleted: [...session.completed],
    stats,
    streak: streakUpdate,
    relationship: { before: relBefore, after: relAfter },
    levelUnlocked,
    placement,
    starsCounted: !placement && stars >= MIN_STARS_TO_COUNT,
    missionProgress,
    coinsEarned,
    firstConversation,
    transcript: buildTranscript(session),
  };
  store.update(st => {
    st.history.push(summary);
    if (st.history.length > 200) st.history.shift();
    st.history.slice(0, -TRANSCRIPTS_KEPT).forEach(x => { delete x.transcript; });
  });

  summary.rankProposal = placement ? null : (unlockProposal || evaluateRank());
  return summary;
}

// ---------- Racha (LearningStreak + "congelador") ----------
export const FREEZE_PRICE = 15;   // monedas
export const MAX_FREEZES = 2;
const dayDiff = (fromIso, toIso) => Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86400000);

// Estado real de la racha hoy (la guardada puede estar vencida si no practicó).
export function streakStatus(now = new Date()) {
  const st = store.get().streak;
  const today = store.todayIso(now);
  const freezes = st.freezes || 0;
  if (!st.lastDate) return { count: 0, doneToday: false, missed: 0, freezes, alive: false };
  const missed = Math.max(0, dayDiff(st.lastDate, today) - 1);   // días sin practicar
  const alive = missed <= freezes;
  return { count: alive ? st.count : 0, doneToday: st.lastDate === today, missed, freezes, alive };
}

// Marca el día de hoy como practicado. Gasta congeladores si faltó algún día.
export function updateStreak(now = new Date()) {
  const today = store.todayIso(now);
  let firstToday = false, newRecord = false, freezesUsed = 0;
  store.update(s => {
    const st = s.streak;
    if (st.lastDate === today) return;
    firstToday = true;
    const missed = st.lastDate ? Math.max(0, dayDiff(st.lastDate, today) - 1) : Infinity;
    if (missed <= (st.freezes || 0)) {
      freezesUsed = missed;
      st.freezes = (st.freezes || 0) - missed;
      // Días salvados con protector (para el calendario).
      st.frozenDays = st.frozenDays || [];
      for (let i = 1; i <= missed; i++) st.frozenDays.push(store.todayIso(new Date(now.getTime() - i * 86400000)));
      st.frozenDays = st.frozenDays.slice(-120);
      st.count += 1;
    } else {
      st.count = 1;
    }
    st.lastDate = today;
    st.days = (st.days || []).concat(today).slice(-400);   // días practicados (calendario)
    if (st.count > st.record) { st.record = st.count; newRecord = true; }
  });
  const st = store.get().streak;
  return { qualified: true, current: st.count, record: st.record, firstToday, newRecord, freezesUsed };
}

export function buyFreeze() {
  const s = store.get();
  if ((s.streak.freezes || 0) >= MAX_FREEZES) return { ok: false, reason: `Ya tiene el máximo (${MAX_FREEZES}).` };
  // Sin tienda (uso personal): el protector es gratis, hasta el máximo.
  store.update(x => { x.streak.freezes = (x.streak.freezes || 0) + 1; });
  return { ok: true };
}

// Propuesta de bajar de nivel (SkillRankChange): si las últimas 3 charlas en el nivel actual salieron mal,
// se le sugiere un nivel un poco más fácil. Subir depende de las estrellas (ver finishSession).
export function evaluateRank() {
  const s = store.get();
  if (s.rank <= 1) return null;
  const recent = s.history.filter(h => h.rank === s.rank && h.stats.turns >= 3).slice(-3);
  if (recent.length < 3) return null;
  const g = recent.reduce((a, h) => a + h.stats.avgGrammar, 0) / 3;
  const st = recent.reduce((a, h) => a + h.stars, 0) / 3;
  if (!(st <= 1 && g <= 1.6)) return null;
  const proposal = { from: s.rank, to: s.rank - 1, kind: 'down' };
  store.update(x => { x.rankProposal = proposal; });
  return proposal;
}

// Cambiar el nivel en el que practica (aceptar una propuesta o elegirlo en Ajustes).
export function setLevel(to) {
  store.update(s => {
    to = Math.min(store.reachRank(s), Math.max(1, to));
    if (to !== s.rank) s.levelCustom = {};
    s.rank = to;
    s.rankProposal = null;
  });
}

// ---------- Familiaridad del vocabulario ----------
export const TIERS = [
  { key: 'Seen', label: 'Visto', min: 0 },
  { key: 'Familiar', label: 'Conocido', min: 25 },
  { key: 'Practiced', label: 'Practicado', min: 50 },
  { key: 'Mastered', label: 'Dominado', min: 85 },
];
export function tierFor(score) { let t = TIERS[0]; for (const x of TIERS) if (score >= x.min) t = x; return t; }

export const FAMILIARITY = { usedInSpeech: 15, seenInConversation: 3, reviewCorrect: 20, reviewHint: 8, reviewWrong: -10, selfKnew: 12, selfDidNot: -5, pronounced: 6 };

// Cambia la familiaridad y devuelve el FamiliarityUpdate (para mostrar "subió de nivel").
export function bumpFamiliarity(vocabId, delta) {
  let upd = null;
  store.update(s => {
    const v = s.vocab.find(x => x.id === vocabId);
    if (!v) return;
    const fromTier = tierFor(v.score).key, fromScore = v.score;
    v.score = Math.max(0, Math.min(100, v.score + delta));
    v.lastUsed = Date.now();
    const toTier = tierFor(v.score).key;
    upd = { text: v.text, fromScore, toScore: v.score, fromTier, toTier, tierUp: toTier !== fromTier && v.score > fromScore };
  });
  return upd;
}

// Busca palabras guardadas dentro de un texto.
export function findBookmarks(text) {
  const t = ' ' + text.toLowerCase().replace(/[^a-z' ]+/g, ' ') + ' ';
  return store.get().vocab.filter(v => t.includes(' ' + v.text.toLowerCase().replace(/[^a-z' ]+/g, ' ').trim() + ' '));
}
