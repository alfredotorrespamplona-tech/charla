// Prompts propios, uno por cada "rol" que la app necesita (ver ANALISIS.md §4).
import { COACH_RULES } from './cerebro.js';
import { activeErrors } from './bitacora.js';
import { seasonLine } from './seasons.js';
import { rankById, facetForRank, relationshipStatus } from './data.js';
import { AGE_GROUPS, GENDERS } from './lessons.js';

const LEARNER_LANG = 'Spanish';

// Cómo quiere el usuario que lo corrijan y qué errores suele repetir (de su «cerebro de inglés»).
const coachRules = () => COACH_RULES.length
  ? `How this learner wants to be corrected (their own rules, follow them):\n${COACH_RULES.map(r => `- ${r}`).join('\n')}\n` : '';
// Los errores activos del cerebro y de la bitácora del teléfono (los marcados como resueltos no cuentan).
export const knownErrors = () => activeErrors().slice(0, 30);
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
Evaluate ONLY the learner's last utterance (transcribed from speech, so ignore capitalization and punctuation).
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
export function explainMessages({ original, corrected, explanation }) {
  return [
    { role: 'system', content: `The learner (native ${LEARNER_LANG}) did not understand a correction. Explain it with Pablo Bolen's method:
start from the ${LEARNER_LANG} sentence they meant, split its verbs into recognisable pieces (WITHOUT naming them grammatically: no "conditional", "participle", "subjunctive", "passive", "tense" names),
give the English equivalent of each piece, then assemble the English sentence. Simple ${LEARNER_LANG}, short.
${coachRules()}Return ONLY JSON: {"es": "the ${LEARNER_LANG} sentence they meant", "pieces": [{"es": "${LEARNER_LANG} piece, e.g. «hubiera sabido»", "en": "English piece, e.g. «had known»", "note": "very short plain ${LEARNER_LANG} note on what this piece does"}], "en": "the assembled English sentence", "tip": "one short sentence to remember it"}` },
    { role: 'user', content: `Learner said: "${original}"\nCorrection: "${corrected}"\nExplanation they did not understand: "${explanation || ''}"` },
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
