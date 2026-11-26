// Prompts propios, uno por cada "rol" que la app necesita (ver ANALISIS.md §4).
import { COACH_RULES } from './cerebro.js';
import { activeErrors } from './bitacora.js';
import { whisperOn } from './whisper.js';
import { seasonLine } from './seasons.js';
import { rankById, facetForRank, relationshipStatus } from './data.js';
import { AGE_GROUPS, GENDERS } from './lessons.js';

const LEARNER_LANG = 'Spanish';

// Cómo quiere el usuario que lo corrijan y qué errores suele repetir (de su «cerebro de inglés»).
const coachRules = () => COACH_RULES.length
  ? `How this learner wants to be corrected (their own rules, follow them):\n${COACH_RULES.map(r => `- ${r}`).join('\n')}\n` : '';
// Los errores activos del cerebro y de la bitácora del teléfono (los marcados como resueltos no cuentan).
export const knownErrors = () => activeErrors().slice(0, 30);
// Cómo llegó el texto de su voz: con Whisper (tal cual, con sus errores) o con el reconocedor del teléfono.
export const heardNote = (on = whisperOn()) => on
  ? 'You get a word-for-word transcript of their voice (Whisper): grammar mistakes in it are really theirs, so correct them; ignore missing punctuation and fillers.'
  : 'You get the speech-recognition transcript: ignore recognition mistakes, missing punctuation and fillers.';
const knownErrorsText = () => knownErrors().length
  ? `This learner's recurring errors from their error log (watch for them; explain them WITHOUT the grammar labels used here):\n${knownErrors().map(b => `- id ${b.id}: said ${b.wrong.map(w => `"${w}"`).join(' / ')} → correct ${b.right.map(w => `"${w}"`).join(' / ')}. Why: ${(b.why || '').slice(0, 240)}`).join('\n')}\n` : '';

// Hora del día real del usuario, para que la escena sea creíble ("Good morning" a las 8 a. m.).
export function timeOfDay(d = new Date()) {
  const hr = d.getHours();
  const part = hr < 5 ? 'late night' : hr < 12 ? 'morning' : hr < 18 ? 'afternoon' : hr < 22 ? 'evening' : 'night';
  const day = d.toLocaleDateString('en-US', { weekday: 'long' });
  return `${day} ${part} (${String(hr).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')})`;
}

// ---- ConversationCommon + CharacterBackground + ConversationResponse ----
// Lo que sabemos del alumno por su plan (intereses, edad, motivo).
export function learnerProfile({ interests = [], ageGroup = '', motivation = '', gender = '' } = {}) {
  const age = AGE_GROUPS.find(a => a.id === ageGroup);
  const parts = [];
  if (interests.length) parts.push(`They are interested in: ${interests.join(', ')}. When it fits naturally (especially in free conversation), bring up one of these topics.`);
  if (age) parts.push(`Age group: ${age.en}; adapt formality and references to it.`);
  const g = GENDERS.find(x => x.id === gender && x.en);
  if (g) parts.push(`Gender: ${g.en}.`);
  if (motivation) parts.push(`Why they learn English (in Spanish): ${motivation}.`);
  return parts.length ? 'About the learner: ' + parts.join(' ') : '';
}

// Cómo se comporta según la relación (también cuando bajó a Enemigo o Némesis).
export function relationTone(level) {
  if (level <= -3) return 'You strongly dislike the learner after how they treated you: be cold, short and sarcastic, but keep talking; soften only if they apologise sincerely.';
  if (level < 0) return 'You are annoyed with the learner because of past rudeness: be distant and a bit dry; warm up if they are kind or apologise.';
  if (level >= 6) return 'The learner is one of your best friends: be warm, joke and share personal things.';
  if (level >= 3) return 'You are friends: be warm and relaxed.';
  return '';
}

function knownFacts(facts = {}) {
  const list = Object.values(facts || {});
  return list.length ? 'Things you already told the learner about yourself (stay consistent with them):\n' + list.map(f => '- ' + f).join('\n') : '';
}

export function characterSystem({ character, place, mission, rankId, rel, learnerName, learner, comedy = false }) {
  const rank = rankById(rankId);
  const status = relationshipStatus(rel.level);
  const objectives = mission.objectives.length
    ? mission.objectives.map(o => `- ${o.id}: ${o.text}`).join('\n')
    : '(no fixed objectives: free conversation)';
  const memory = rel.memory.length
    ? 'What you remember from previous conversations with the learner:\n' + rel.memory.slice(-4).map(m => '- ' + m).join('\n')
    : 'You have never talked with the learner before.';
  const facet = facetForRank(mission, rankId);

  return `You are ${character.name}, ${character.age}, ${character.profession}, from ${character.hometown}.
Interests: ${character.interests.join(', ')}. Personality: ${character.personality}. Interaction style: ${character.style}.
Place: ${place.scene}
It is ${timeOfDay()} right now; greet and act accordingly. ${seasonLine()}

You are talking (by voice) with ${learnerName || 'the learner'}, who is learning English. Their native language is ${LEARNER_LANG}.
Relationship: ${status.key} (level ${rel.level}). ${relationTone(rel.level)} ${memory}
${knownFacts(rel.facts)}
${learnerProfile(learner)}

SCENARIO: ${mission.name} — ${mission.instruction}
${facet ? 'Level adaptation: ' + facet : ''}
Objectives the learner should achieve (you track them):
${objectives}
Useful expressions for the learner: ${mission.expressions.join(' | ')}

LANGUAGE LEVEL: ${rank.prompt}

RULES:
- Stay fully in character. Never say you are an AI. Speak only English.
- Keep the reply length and the vocabulary/grammar exactly as LANGUAGE LEVEL says (it is read aloud). No emojis, no lists, no stage directions.
- Usually end with a question or a hook so the learner has something to answer.
- Gently steer the conversation so the learner can complete the objectives, but never do them for the learner.
- Do NOT correct grammar or explain English (a separate coach does that). If you did not understand, ask naturally ("Sorry, what do you mean?").
- If the learner writes in ${LEARNER_LANG}, react naturally and help them by rephrasing the idea in simple English as a question ("Oh, you mean you want a coffee?").
- When all objectives are done and the conversation reaches a natural end (or the learner says goodbye), say a warm goodbye and set "finished": true.
- If the learner asks you to wait or says they need a moment to think, say it's fine in a few words and let them talk.
${comedy ? '- COMEDY MODE is on: be playful and funny — light jokes, playful exaggeration, a little friendly teasing and wordplay the learner can follow at their level. Stay kind and inside the scenario.\n' : ''}
Answer ONLY with JSON:
{"reply": "what you say", "objectives_completed": ["ids completed by the learner's LAST message only"], "mood": number from -1 (upset) to 1 (happy), "affection": integer -2..2 (how much you liked this turn), "finished": boolean}`;
}

// RequestGoodbyeInConversation: el alumno tiene que irse y le pide al personaje que cierre la charla.
export function goodbyeUser() {
  return '[The learner has to leave now. Stay in character: wrap up warmly in 1–2 short sentences that fit the scenario (you may mention something from this conversation), say goodbye, do not ask a question, and set "finished": true.]';
}

export function openingUser() {
  return '[The learner just approached you. Open the conversation in character with a short greeting that fits the scenario. Return JSON with "reply" and "mood".]';
}

// ---- Análisis del turno (GetSpeechAnalysis + CoachInputFeedback) ----
export function analysisMessages({ characterLine, learnerLine, rankId, strictness, mission }) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `You are a friendly English coach for a ${LEARNER_LANG}-speaking learner (level ${rank.code}).
Evaluate ONLY the learner's last utterance (transcribed from speech, so ignore capitalization and punctuation).${whisperOn() ? ' The transcript is word-for-word (Whisper): grammar mistakes in it are really the learner’s own.' : ''}
Feedback strictness: ${strictness} (Relaxed = only mention errors that block understanding; Balanced = clear grammar/vocabulary errors; Strict = also unnatural phrasing).
Judge against what is expected at ${rank.code}.
Scenario: ${mission.name}.
${coachRules()}${knownErrorsText()}Return ONLY JSON:
{"grammar": "WrongLanguage|ManyMistakes|SomeMistakes|MostlyCorrect|Perfect",
 "appropriateness": "Inappropriate|Somewhat|Mostly|Fully",
 "learner_move": "Attempted|Redirected|LeftHanging|NothingAsked",
 "has_feedback": boolean,
 "corrected": "the learner sentence with minimal corrections (same meaning)",
 "better": "a more natural way a native would say it at this level",
 "explanation": "1–2 short sentences in ${LEARNER_LANG}: exactly which word or part failed, why (by what it is used for, never grammar labels) and the fix; quote English words in «»",
 "known_error": "the id of the learner's recurring error if this utterance repeats it, else empty"}` },
    { role: 'user', content: `Character said: "${characterLine}"\nLearner said: "${learnerLine}"` },
  ];
}

// ---- ConversationSuggestion ----
export function suggestionMessages({ history, rankId, mission, avoid = '' }) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `You help an English learner (${rank.code}, native ${LEARNER_LANG}) answer in a role-play.
Scenario: ${mission.name} — ${mission.description}. Pending objectives: ${mission.objectives.map(o => o.text).join('; ') || 'none'}.
Give ONE reply the learner could say next: the most natural one, helpful for the objectives.${avoid ? ` It must be different from: "${avoid}".` : ''}
Their length, vocabulary and grammar must match this level: ${rank.prompt}
Return ONLY JSON: {"suggestions": [{"text": "English reply", "translation": "${LEARNER_LANG} translation"}]}` },
    { role: 'user', content: historyText(history) },
  ];
}

// ---- ConversationCustomSuggestion ("¿cómo digo esto?") ----
export function customSuggestionMessages({ history, rankId, spanish }) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `Translate what the learner wants to say into natural spoken English that fits the conversation.
Use vocabulary and grammar of this level: ${rank.prompt}
Return ONLY JSON: {"text": "English", "translation": "the ${LEARNER_LANG} meaning"}` },
    { role: 'user', content: historyText(history) + `\n\nLearner wants to say (in ${LEARNER_LANG}): "${spanish}"` },
  ];
}

export function translateMessages(text) {
  return [
    { role: 'system', content: `Translate the English text into natural ${LEARNER_LANG}. Return ONLY JSON: {"translation": "..."}` },
    { role: 'user', content: text },
  ];
}

// ---- Pistas de pronunciación (PronunciationHint) ----
export function pronunciationHintMessages(tokens) {
  return [
    { role: 'system', content: `You help a ${LEARNER_LANG}-speaking learner pronounce English.
For EACH token, write how it sounds using ${LEARNER_LANG} spelling, so a ${LEARNER_LANG} speaker can read it aloud.
Examples: "cappuccino" → "ka-pu-CHI-nou", "I'd" → "aid", "water" → "UA-rer", "though" → "dou", "think" → "zink", "please" → "pliis", "very" → "VE-ri", "the" → "da".
Rules: separate syllables with "-" and write the stressed syllable in CAPITALS (only for words with 2+ syllables);
"sh" for the English sh sound; double the vowel for long vowels ("ii", "uu"); ignore punctuation; numbers as words.
Return ONLY JSON: {"hints": [{"w": "token exactly as given", "say": "respelling"}]} with one item per token, same order.` },
    { role: 'user', content: JSON.stringify(tokens) },
  ];
}

// ---- ExploreWord ----
export function wordMessages(word, context) {
  return [
    { role: 'system', content: `You are a bilingual English–${LEARNER_LANG} dictionary for learners.
Return ONLY JSON: {"word": "base form", "phonetic": "IPA", "category": "Noun|Verb|Adjective|Adverb|Pronoun|Preposition|Conjunction|Determiner|Interjection|Phrase|Other",
"definition": "simple English definition", "translation": "${LEARNER_LANG} meaning in this context", "example": "short example sentence", "conjugation": "for verbs: base, past, past participle; else empty",
"level": "CEFR level where learners usually learn it: A1|A2|B1|B2|C1|C2", "formality": "informal|neutral|formal", "usefulness": "high|medium|low (how useful it is in everyday conversation)"}` },
    { role: 'user', content: `Word or phrase: "${word}"\nContext sentence: "${context}"` },
  ];
}

// ---- CoachSessionFeedback + ConversationMessageSummary + sugerencias de vocabulario ----
export function sessionFeedbackMessages({ history, character, mission, rankId, analyses, discovery }) {
  const rank = rankById(rankId);
  const errors = analyses.filter(a => a && a.has_feedback).map(a => `- "${a.original}" → "${a.corrected}"`).join('\n');
  return [
    { role: 'system', content: `You are an encouraging English coach for a ${LEARNER_LANG} speaker (${rank.code}).
After a role-play with ${character.name} (${mission.name}), return ONLY JSON.
${coachRules()}${knownErrorsText()}If a correction repeats one of those recurring errors, say plainly that it happened again and give the one-line fix.
{"coach": "3–4 sentences in ${LEARNER_LANG}: what went well, the 1–2 most important things to improve with examples in «»",
 "memory": "1–2 sentences in English, from ${character.name}'s point of view, of facts worth remembering about the learner for next time",
 "vocab_suggestions": [{"text": "useful English word or phrase from this conversation", "translation": "${LEARNER_LANG}", "type": "Phrase|Noun|Verb|Adjective|Adverb|Other"}]  // 3 to 5 items, useful for the learner's level
${discovery ? `, "backstory": "2 short sentences in simple English (${rank.code}), first person as ${character.name} (${character.age}, ${character.profession}, from ${character.hometown}, likes ${character.interests.join(', ')}), revealing ${discovery.en}. Invent concrete details that fit the character."` : ''}
}` },
    { role: 'user', content: historyText(history) + (errors ? `\n\nCorrections detected:\n${errors}` : '') },
  ];
}

// Los errores de esta charla como filas de su bitácora (bitacora/errores.md del cerebro), para pegarlas allí.
export function bitacoraRows(analyses, date = new Date()) {
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const cell = t => String(t || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  return analyses.filter(a => a && a.has_feedback && a.corrected && a.original
      && a.corrected.trim().toLowerCase() !== a.original.trim().toLowerCase())
    .map(a => `| ${day} | "${cell(a.original)}" | "${cell(a.corrected)}" |  | ${cell(a.explanation)} | ${a.known_error ? 'Sí — se repitió en Charla' : ''} |`);
}

// ---- «No entiendo»: explicación de emergencia con el método de Pablo Bolen ----
// Español primero: la frase que quería decir, partida en piezas reconocibles, cada pieza en inglés y armada.
export function explainMessages({ original, corrected, explanation, meant = '' }) {
  return [
    { role: 'system', content: `The learner (native ${LEARNER_LANG}) did not understand a correction. Explain it with Pablo Bolen's method:
start from the ${LEARNER_LANG} sentence they meant, split its verbs into recognisable pieces (WITHOUT naming them grammatically: no "conditional", "participle", "subjunctive", "passive", "tense" names),
give the English equivalent of each piece, then assemble the English sentence. Simple ${LEARNER_LANG}, short.
${coachRules()}Return ONLY JSON: {"es": "the ${LEARNER_LANG} sentence they meant", "pieces": [{"es": "${LEARNER_LANG} piece, e.g. «hubiera sabido»", "en": "English piece, e.g. «had known»", "note": "very short plain ${LEARNER_LANG} note on what this piece does"}], "en": "the assembled English sentence", "tip": "one short sentence to remember it"}` },
    { role: 'user', content: `Learner said: "${original}"\n${meant ? `What they meant (${LEARNER_LANG}): "${meant}"\n` : ''}Correction: "${corrected}"\nExplanation they did not understand: "${explanation || ''}"` },
  ];
}

// ---- Taller de frases: Repeat and Juggle y Skeleton swapping ----
// Crear un Repeat and Juggle desde una frase del usuario (o una idea en español).
export function juggleCreateMessages(text, rankId) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `You build a "Repeat and Juggle" drill for an English learner (${rank.code}, native ${LEARNER_LANG}).
Repeat and Juggle: the learner repeats one natural, useful English sentence exactly, then "juggles" it: changes ONE piece at a time without rebuilding the whole sentence.
If the input is in ${LEARNER_LANG}, first turn it into a natural English sentence; if it has mistakes, use the corrected version.
Steps (6 in total): step 1 kind "repeat" = the base sentence. Then 1-2 "word" steps (swap one word or chunk for another of the same type), 2-3 "tense" steps (yesterday / have… / had… / will / used to / would, whatever fits naturally), and 1 "form" step (question, negative, or more polite).
Every step stays close to the base sentence. Put the piece that changed in [square brackets] in BOTH "en" and "es" (one or two short bracketed pieces, never the whole sentence).
"label" = very short ${LEARNER_LANG} cue for what to change, WITHOUT grammar names (e.g. "ayer", "he…", "había…", "mañana", "antes (used to)", "pregunta", "negativa", "cambie la palabra").
Sentences at the learner's level, natural, everyday.
Return ONLY JSON: {"title": "2-4 word ${LEARNER_LANG} title", "steps": [{"kind": "repeat|word|tense|form", "label": "...", "en": "...", "es": "natural ${LEARNER_LANG} translation"}]}` },
    { role: 'user', content: text },
  ];
}

// Sacar un esqueleto de una frase: partes fijas + huecos, con 3 cambios guiados.
export function skeletonCreateMessages(text, rankId, interests = []) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `You build a "Skeleton swapping" drill for an English learner (${rank.code}, native ${LEARNER_LANG}).
Skeleton swapping: keep the reusable frame of a sentence (the "bones": the fixed words that carry the grammar) and swap the content (the "meat") to say new things.
If the input is in ${LEARNER_LANG}, first turn it into a natural English sentence; fix mistakes.
"frame" = the sentence with 1-2 swappable parts replaced by {slot} names (lowercase letters only), e.g. "I've been meaning to {action} for {time}." Keep the bones exactly as in the model sentence so the model fits the frame.
"slots" = for each slot, a very short ${LEARNER_LANG} hint of what goes there (e.g. "una acción", "cuánto tiempo", "acción con -ing"), no grammar jargon.
"model" = the original (corrected) sentence and its ${LEARNER_LANG} translation.
"swaps" = 3 new ${LEARNER_LANG} sentences the learner must say in English with the SAME frame, plus the English answer. Everyday topics${interests.length ? `; when natural, use the learner's interests: ${interests.join(', ')}` : ''}.
"title" = 2-4 word ${LEARNER_LANG} title of what the skeleton is for.
Return ONLY JSON: {"title": "...", "frame": "...", "slots": {"slot": "hint"}, "model": {"en": "...", "es": "..."}, "swaps": [{"es": "...", "en": "..."}]}` },
    { role: 'user', content: text },
  ];
}

// Más cambios para un esqueleto, distintos de los ya hechos.
export function skeletonMoreMessages({ frame, slots, model }, rankId, interests = [], done = []) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `Create 3 new practice prompts for the English sentence frame below, for a learner (${rank.code}, native ${LEARNER_LANG}).
Each prompt is a ${LEARNER_LANG} sentence the learner must say in English using EXACTLY the same fixed words of the frame; only the {slots} change. Give the English answer.
Make them about everyday life${interests.length ? ` and, when natural, the learner's interests (${interests.join(', ')})` : ''}. Do not repeat these: ${done.join(' | ') || '(none)'}.
Return ONLY JSON: {"swaps": [{"es": "...", "en": "..."}]}` },
    { role: 'user', content: JSON.stringify({ frame, slots, model }) },
  ];
}

// Revisar un intento: guiado (hay respuesta esperada) o libre (inventó su propio cambio).
export function drillCheckMessages({ mode, base, frame, es, target, attempt, rankId }) {
  const rank = rankById(rankId);
  const task = mode === 'skeleton'
    ? `Skeleton swapping. Frame (fixed words must stay, {slots} change): "${frame}".`
    : `Repeat and Juggle. Base sentence: "${base}". The learner must change ONE piece of it (a word, the time, or question/negative) and keep the rest.`;
  return [
    { role: 'system', content: `You check one drill answer from an English learner (${rank.code}, native ${LEARNER_LANG}). ${task}
${target ? `Expected answer: "${target}" (for the ${LEARNER_LANG} cue "${es || ''}"). Other correct, natural ways that mean the same and keep the structure are also correct.` : 'Free answer: there is no expected answer; judge whether it is a correct, natural English sentence that follows the drill.'}
The answer may come from speech recognition: ignore capital letters, punctuation and obvious recognition slips of tiny words.
verdict: "correct" (right and natural), "almost" (understandable, one small slip), or "wrong".
"kept" = true if the learner kept the frame/base structure as the drill asks.
"corrected" = the learner's sentence fixed with minimal changes (or the expected answer if it is unrelated). "natural" = how a native speaker would say it.
"explanation" = 1-2 short ${LEARNER_LANG} sentences: which word failed and why, WITHOUT grammar labels; empty if correct.
${coachRules()}Return ONLY JSON: {"verdict": "correct|almost|wrong", "kept": true, "corrected": "...", "natural": "...", "explanation": "..."}` },
    { role: 'user', content: attempt },
  ];
}

// ---- Gramática por piezas (método de Pablo Bolen) ----
// Con «sentence»: parte en piezas la frase en español que el alumno quiere decir.
// Sin ella: crea «count» ejercicios nuevos del patrón de la lección.
export function grammarMessages({ lesson, sentence = '', count = 5, rankId, done = [] }) {
  const rank = rankById(rankId);
  const shape = `{"es": "${LEARNER_LANG} sentence", "en": "natural English sentence", "pieces": [{"es": "${LEARNER_LANG} verb piece exactly as it appears in es", "en": "its English piece exactly as it appears in en", "wrong": ["tempting wrong English piece", "another tempting wrong piece"]}], "note": "one short ${LEARNER_LANG} tip"}`;
  const method = `Pablo Bolen's method: the learner recognises the FORM of each verb in ${LEARNER_LANG} (-ar/-er/-ir, -ando/-iendo, -ado/-ido, future -ré, conditional -ría, he…, había/hubiera…, habría…) and swaps it for its English piece (to + verb, -ing, -ed/participle, will, would, have + participle, had + participle, would have + participle), WITHOUT grammar names.
Pieces = only the verb groups (1 to 3 per sentence), each piece copied exactly from the sentences. "wrong" = 2 wrong English pieces a ${LEARNER_LANG} speaker would really say (other forms of the same verb, would in the if-half, regularised past like "goed"). Never use grammar labels in "note".`;
  const task = sentence
    ? `The learner wrote what they want to say: "${sentence}". If it is in English or has mistakes, use the ${LEARNER_LANG} sentence they mean. Return ONE item for it.`
    : `Create ${count} new everyday sentences (learner level ${rank.code}) that practise this pattern: «${lesson.title}». ${lesson.idea} Do not repeat: ${done.join(' | ') || '(none)'}.`;
  return [
    { role: 'system', content: `You make grammar puzzles for an English learner (native ${LEARNER_LANG}, level ${rank.code}).
${method}
${task}
${coachRules()}Return ONLY JSON: {"items": [${shape}]}` },
    { role: 'user', content: sentence || lesson.title },
  ];
}

// ---- Temario: más preguntas de práctica para un tema ----
export function temarioMessages({ topic, count = 6, rankId, done = [] }) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `You write gap-fill practice for an English learner (native ${LEARNER_LANG}, level ${rank.code}).
Topic: «${topic.title}». It practises: ${topic.ai}.
Create ${count} NEW everyday sentences (work, family, travel, plans, feelings) that practise exactly this. For each item:
- "es": a natural ${LEARNER_LANG} sentence with the same meaning (so the learner knows what to say);
- "en": the natural English sentence with exactly ONE gap written as ___ where the target words go;
- "answer": the words that fill the gap;
- "wrong": 2 tempting wrong options a ${LEARNER_LANG} speaker would really choose (other forms of the same structure), each clearly wrong in that sentence;
- "why": one very short, plain ${LEARNER_LANG} reason why the answer is right, starting from the ${LEARNER_LANG} meaning (e.g. «Si tuviera → if + pasado: had»).
Never use grammar labels. Do not repeat these sentences: ${done.join(' | ') || '(none)'}.
${coachRules()}Return ONLY JSON: {"items": [{"es": "...", "en": "... ___ ...", "answer": "...", "wrong": ["...", "..."], "why": "..."}]}` },
    { role: 'user', content: topic.title },
  ];
}

// ---- Técnicas: «Mis frases» (islas de lenguaje) ----
// Sus propias frases en español → inglés natural, a su nivel. Con STAR: una respuesta de entrevista.
export function islasMessages({ lines, island = '', rankId, star = false }) {
  const rank = rankById(rankId);
  const task = star
    ? `The learner wrote, in ${LEARNER_LANG}, the four parts of a true story for a job interview (Situation, Task, Action, Result). Turn it into a natural spoken interview answer in English, in the first person, 4 to 7 short sentences, keeping exactly their facts (do not invent numbers or details).`
    : `The learner wrote sentences in ${LEARNER_LANG} about their own life (topic: ${island || 'daily life'}). Turn each one into the natural English a person would really SAY, in the first person, keeping their meaning and facts (do not add details). If a line has several ideas, you may split it into two short sentences.`;
  return [
    { role: 'system', content: `${task}
Level ${rank.code}: ${rank.prompt}
Prefer short, common, spoken sentences (contractions are fine). For each English sentence give "es": a natural ${LEARNER_LANG} version of exactly that sentence, so the learner can practise saying it from ${LEARNER_LANG}.
${coachRules()}Return ONLY JSON: {"items": [{"es": "...", "en": "..."}]}` },
    { role: 'user', content: lines.join('\n') },
  ];
}

// ---- Técnicas: «Responder en el momento»: corrige la respuesta y la devuelve natural, con la misma estructura ----
export function answerMessages({ question, frame, text, rankId }) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `The learner (native ${LEARNER_LANG}, level ${rank.code}) was asked "${question}" and answered on the spot, trying to start with the words of the question and to follow the structure "${frame}". ${heardNote()}
Give short, encouraging feedback for a speaker, in plain ${LEARNER_LANG}, never using grammar labels:
- "good": one sentence about what went well (communication first: was the answer clear and on topic?);
- "fixes": up to 3 of the most useful corrections, each {"said": "what they said", "better": "how to say it", "why": "very short ${LEARNER_LANG} reason, starting from the meaning"};
- "version": their own answer said naturally in English at their level, keeping their ideas, starting with the words of the question and following the structure, as 3 or 4 short sentences, each {"en": "...", "es": "natural ${LEARNER_LANG} version"};
- "tip": one short idea for answering better next time.
${coachRules()}${knownErrorsText()}Return ONLY JSON: {"good": "...", "fixes": [{"said": "...", "better": "...", "why": "..."}], "version": [{"en": "...", "es": "..."}], "tip": "..."}` },
    { role: 'user', content: text },
  ];
}

// ---- Escuchar: historia o diálogo nuevo, a su nivel (input comprensible) ----
const LISTEN_LEVEL = {
  A2: 'CEFR A2: short sentences (max 12 words), everyday words, present and simple past, no idioms.',
  B1: 'CEFR B1: clear sentences (max 18 words), common work and travel vocabulary, past, future and present perfect.',
  'B1+': 'CEFR B1 high: natural sentences, problems and solutions, opinions, a few common phrasal verbs.',
  B2: 'CEFR B2: natural spoken English, linking words, conditionals (would / would have), some nuance.',
};
export function storyMessages({ topic, kind = 'dialogo', level = 'B1' }) {
  return [
    { role: 'system', content: `Write an ORIGINAL short ${kind === 'dialogo' ? 'dialogue between two people (give each a first name as "who")' : 'story told by a narrator ("who": "")'} in English for a ${LEARNER_LANG}-speaking learner to LISTEN to. Level: ${LISTEN_LEVEL[level] || LISTEN_LEVEL.B1}
It must be easy enough to understand almost everything (comprehensible input), with useful phrases the learner can reuse at work or in daily life. 7 to 10 lines, one or two sentences per line.
For every line give "es": a natural ${LEARNER_LANG} translation of exactly that line.
Then 3 comprehension questions in ${LEARNER_LANG}, each with 3 short ${LEARNER_LANG} options and the index (0-2) of the right one; vary the position of the right answer.
Return ONLY JSON: {"title": "English title", "titleEs": "título en español", "lines": [{"who": "", "en": "...", "es": "..."}], "questions": [{"q": "...", "options": ["...", "...", "..."], "answer": 0}]}` },
    { role: 'user', content: `Topic: ${topic}` },
  ];
}

// ---- Simulacro de entrevista: una repregunta corta, como haría una entrevistadora de verdad ----
export function mockFollowMessages({ role, question, answer, rankId }) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `You are Laura, a friendly but professional job interviewer${role ? ` hiring for the "${role}" position` : ''}. The candidate (level ${rank.code} English) just answered your question "${question}".
Ask ONE short, natural follow-up question about something specific they said (max 15 words, simple words for ${rank.code}). If the answer was empty or off topic, kindly ask them to give an example instead. Do not give feedback.
Return ONLY JSON: {"follow": "the question", "es": "natural ${LEARNER_LANG} translation"}` },
    { role: 'user', content: answer || '(no answer)' },
  ];
}

// ---- Simulacro de entrevista: informe con nota por habilidad ----
export function mockReportMessages({ role, qa, rankId }) {
  const rank = rankById(rankId);
  const lines = qa.map((x, i) => `Q${i + 1}: ${x.q}\nA${i + 1} (${x.spoken ? `${x.seconds}s spoken` : 'typed'}, ${x.words} words): ${x.a || '(no answer)'}`).join('\n\n');
  return [
    { role: 'system', content: `You are an English speaking examiner and job-interview coach. A native ${LEARNER_LANG} speaker (practising at level ${rank.code}) just did a full mock job interview in English${role ? ` for a "${role}" position` : ''}. ${heardNote()}
Score the WHOLE interview from 0 to 100 on four skills, judged against what a confident B2 candidate would do (B2 = 75-85, solid B1 = 55-65, A2 = 30-40):
- "fluency": keeps talking, answers have a natural length, few long pauses or fillers;
- "grammar": correct sentences (verb forms, tenses, word order, articles); count real mistakes, ignore punctuation;
- "vocabulary": range and precision of words and phrases, work vocabulary, not repeating the same words;
- "order": answers that start by answering the question, have a clear structure (what, why, example; or problem, solution, result; STAR for stories) and end clearly.
Then give feedback in plain ${LEARNER_LANG}, never using grammar labels (explain from the meaning):
- "level": the CEFR level these answers show (e.g. "B1", "B1+", "B2");
- "summary": 2 sentences: how the interview went overall, communication first;
- "strengths": 2 or 3 short points;
- "fixes": up to 6 of the most repeated or most important mistakes, each {"said": "what they said", "better": "correct version", "why": "very short reason"};
- "answers": for each answer number "i" (1-based) a better version of THEIR answer, keeping their ideas, natural at about B2, 2 to 4 sentences ("better_en", "better_es") and one short tip;
- "next": 3 concrete things to practise before the next interview.
${coachRules()}${knownErrorsText()}Return ONLY JSON: {"scores": {"fluency": 0, "grammar": 0, "vocabulary": 0, "order": 0}, "level": "B1", "summary": "...", "strengths": ["..."], "fixes": [{"said": "...", "better": "...", "why": "..."}], "answers": [{"i": 1, "better_en": "...", "better_es": "...", "tip": "..."}], "next": ["..."]}` },
    { role: 'user', content: lines },
  ];
}

// ---- Prueba de nivel del mes: la parte hablada ----
export function levelSpeakMessages({ items, rankId }) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `You are a CEFR speaking examiner. A native ${LEARNER_LANG} speaker answered short speaking tasks in English. ${heardNote()}
Judge only what they said. Give "score" from 0 to 100 (A2 = 30-40, B1 = 50-60, B1 high = 65-72, B2 = 75-85, C1 = 90+), "level" (e.g. "B1", "B1+", "B2"),
"gaps": the 3 most important things they still need to reach B2, in plain ${LEARNER_LANG} without grammar labels, each with a tiny English example ("es", "example"),
and "fixes": up to 4 real mistakes {"said", "better", "why"} (why in ${LEARNER_LANG}, short). Their practice level is ${rank.code}.
${coachRules()}${knownErrorsText()}Return ONLY JSON: {"score": 0, "level": "B1", "gaps": [{"es": "...", "example": "..."}], "fixes": [{"said": "...", "better": "...", "why": "..."}]}` },
    { role: 'user', content: items.map((x, i) => `Task ${i + 1}: ${x.task}\nAnswer: ${x.text || '(no answer)'}`).join('\n\n') },
  ];
}

// ---- Técnicas: «Un minuto sin parar» (JAM): qué decir mejor, en español primero ----
export function jamMessages({ topic, text, rankId }) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `The learner (native ${LEARNER_LANG}, level ${rank.code}) spoke for one minute without stopping about: "${topic}". ${heardNote()}
Give short, encouraging feedback for a speaker, in plain ${LEARNER_LANG}, never using grammar labels:
- "good": one sentence about what went well;
- "fixes": up to 3 of the most useful corrections, each {"said": "what they said", "better": "how to say it", "why": "very short ${LEARNER_LANG} reason, starting from the meaning"};
- "version": the same ideas said naturally in English at their level, as 4 to 6 short sentences in the first person, each {"en": "...", "es": "natural ${LEARNER_LANG} version"};
- "tip": one short idea to try in the next minute.
${coachRules()}${knownErrorsText()}Return ONLY JSON: {"good": "...", "fixes": [{"said": "...", "better": "...", "why": "..."}], "version": [{"en": "...", "es": "..."}], "tip": "..."}` },
    { role: 'user', content: text },
  ];
}

// ---- Diario en inglés (v45, cerebro: diario_en_ingles.md) ----
// Recibe el texto completo, sin cortar. Corrige todo lo que esté mal (no solo 3 cosas), como pide el cerebro.
export function diaryMessages({ text, rankId, start = '' }) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `The learner (native ${LEARNER_LANG}, practising at level ${rank.code}) wrote a free diary entry in English${start ? `, starting from the prompt "${start}"` : ''}. It is written, not spoken, so spelling counts too.
Correct it like a kind, detailed teacher, in plain ${LEARNER_LANG}, never using grammar labels (explain from the meaning, e.g. "ayer ya pasó, así que va en pasado"):
- "good": one or two sentences about what they did well (specific, honest);
- "fixes": EVERY real mistake (grammar, word choice, spelling, missing words), in the order they appear, each {"said": "the exact words they wrote", "better": "the corrected words", "why": "short ${LEARNER_LANG} reason"}. Do not list style preferences as mistakes;
- "corrected": the whole entry rewritten correctly and naturally, keeping their ideas, their voice and their level;
- "level": their level today from this text, one of A1, A2, B1, B1+, B2, C1, C2; "level_why": one short ${LEARNER_LANG} sentence explaining it;
- "keep": 2 to 4 useful natural phrases from the corrected entry worth memorising, each {"en": "...", "es": "natural ${LEARNER_LANG} translation"};
- "tip": one short idea for tomorrow's entry.
${coachRules()}${knownErrorsText()}Return ONLY JSON: {"good": "...", "fixes": [{"said": "...", "better": "...", "why": "..."}], "corrected": "...", "level": "B1", "level_why": "...", "keep": [{"en": "...", "es": "..."}], "tip": "..."}` },
    { role: 'user', content: text },
  ];
}

// ---- Preparar una oferta de trabajo concreta (v46) ----
// Recibe el aviso completo, tal cual lo pegó.
export function offerMessages({ ad, role = '', rankId }) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `You are a job-interview coach. A native ${LEARNER_LANG} speaker (English level ${rank.code}) has an interview in English for the job ad below${role ? ` (the position: "${role}")` : ''}. Prepare them for THIS job, using what the ad asks for (tasks, skills, tools, values).
Return:
- "role": the position in English, short; "company": the company name if it appears, else "";
- "summary_es": 2 sentences in ${LEARNER_LANG}: what they are looking for and what to highlight;
- "questions": 10 questions this interviewer will very likely ask, from the opening to the closing, including at least 3 specific to the tasks or skills in the ad and 2 behavioural ("Tell me about a time…"). Each: {"q": "the question in natural spoken English", "es": "${LEARNER_LANG} translation", "why": "very short ${LEARNER_LANG} note on what they want to hear", "frame": "qyq" (what / so what / now what: to present or give an opinion) or "psb" (problem / solution / benefit: stories and how they solved something) or "w5" (who, what, when, where, why: routines and facts), "start": "how to begin the answer reusing the words of the question, ending with …", "start_es": "${LEARNER_LANG}", "model": "a model answer at about ${rank.code === 'B2' || rank.code.startsWith('C') ? 'B2' : 'B1-B2'} level, 3 or 4 short sentences, first person, following the frame and starting with the start; generic enough that they can replace the details with their own story", "model_es": "${LEARNER_LANG}"};
- "words": 12 to 15 words or short phrases from this job or the ad that they should be able to say, each {"en": "...", "es": "${LEARNER_LANG}", "example": "short English sentence using it, about the job"};
- "ask": 3 good questions they can ask the interviewer about this job, each {"en": "...", "es": "${LEARNER_LANG}"}.
Never use grammar labels in ${LEARNER_LANG}. Return ONLY JSON: {"role": "...", "company": "...", "summary_es": "...", "questions": [{"q": "...", "es": "...", "why": "...", "frame": "qyq", "start": "...", "start_es": "...", "model": "...", "model_es": "..."}], "words": [{"en": "...", "es": "...", "example": "..."}], "ask": [{"en": "...", "es": "..."}]}` },
    { role: 'user', content: ad },
  ];
}

// ---- Repaso personalizado (tarjetas con {{gap}}) ----
export function reviewMessages(items, rankId) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `Create review cards for an English learner (${rank.code}, native ${LEARNER_LANG}), one card per item, of the "family" given for each item.
Use the item's original sentence ("context") when it helps, so the card feels like their own conversations. Sentences must be natural and at the learner's level.
- "meaning" (recognise the meaning in context): "sentence" = English sentence containing the item exactly as written; "answer" = the ${LEARNER_LANG} meaning of the item in that sentence; "options" = 4 ${LEARNER_LANG} meanings (the answer + 3 plausible wrong ones); "translation" = ${LEARNER_LANG} translation of the sentence.
- "completion" (complete the thought): "sentence" = English sentence with exactly one "{{gap}}" where the item goes; "answer" = exact text for the gap; "options" = 4 English options (answer + 3 distractors of the same type); "hint" = short clue in ${LEARNER_LANG}; "translation" = ${LEARNER_LANG} translation of the full sentence.
- "recall" (say it in English): "prompt" = a short ${LEARNER_LANG} sentence the learner must say in English; "answer" = a natural English version that uses the item; "hint" = short clue in ${LEARNER_LANG} (e.g. the first word).
Return ONLY JSON: {"cards": [{"item": "item exactly as given", "family": "meaning|completion|recall", ...fields above}]}` },
    { role: 'user', content: JSON.stringify(items.map(i => ({ item: i.text, meaning: i.translation || '', context: i.context || '', family: i.family }))) },
  ];
}

function historyText(history) {
  return history.map(m => `${m.role === 'character' ? 'Character' : 'Learner'}: ${m.text}`).join('\n');
}
