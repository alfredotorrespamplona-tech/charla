// Pantalla de conversación: el bucle de turnos (abrir → hablar → responder + analizar → … → terminar).
import * as store from './store.js';
import { chatJson, LlmError, partialField, firstSentence } from './llm.js';
import * as P from './prompts.js';
import { Avatar } from './avatar.js';
import { Listener, speak, stopSpeaking, canListen, msPerWord } from './speech.js';
import { levelSettings } from './data.js';
import * as scoring from './scoring.js';
import { h, mount, sheet, closeSheet, toast, spinner, richText, placeBackground, setText, buzz } from './ui.js';
import { openWordExplorer } from './words.js';
import { practicePronunciation } from './pronounce.js';
import { attachHints, wordLine } from './hints.js';
import { openTranscript } from './transcript.js';
import { findError } from './bitacora.js';
import * as tutorial from './tutorial.js';
import { sendToWorkshop } from './workshop.js';

// Si se queda callado, el personaje retoma (una vez por turno; después solo se marca «¡Su turno!»).
const NUDGES = ["Take your time. I'm listening!", 'No rush. What do you think?', 'Are you still there? Your turn!', "Go ahead, I'm all ears."];
export const NUDGE_MS = 25000;
export const COMMIT_MS = 2500;   // manos libres: pausa antes de enviar lo dicho (se puede cancelar)
const WAIT_MS = 90000;           // «necesito un momento»: el personaje espera sin apurar
const WAIT_LINES = ['Sure, take your time.', "No problem, I'll wait.", 'Of course. Take a moment.'];
// Grabación: máximo 45 s; en los últimos 10 avisa, y al final envía lo que alcanzó a decir.
export const MAX_RECORD_MS = 45000;
export const RECORD_WARN_MS = 10000;

const NOT_HEARD = ["Sorry, I didn't catch that. Could you say it again?", 'Hmm, what was that?', 'Sorry, can you repeat that?', "I didn't quite hear you. One more time?"];
const GRADE = {
  Perfect: { color: 'good', label: 'Perfecto' },
  MostlyCorrect: { color: 'good', label: 'Casi perfecto' },
  SomeMistakes: { color: 'warn', label: 'Algunos errores' },
  ManyMistakes: { color: 'bad', label: 'Varios errores' },
  WrongLanguage: { color: 'bad', label: 'No fue en inglés' },
};

export function startConversation({ place, character, mission, onFinish, onExit, resume }) {
  const s = store.get();
  // Ajustes del nivel (velocidad, texto de la respuesta, sugerencias, traducciones, corrección).
  const level = () => { const st = store.get(); return levelSettings(st.rank, st.levelCustom); };
  const rel = store.relationship(character.id);
  const session = {
    id: crypto.randomUUID?.() || String(Date.now()),
    place, character, mission,
    history: [],        // [{role, text}]
    turns: [],          // turnos del aprendiz con métricas
    completed: new Set(),
    affection: 0,
    startedAt: Date.now(),
    sessionWords: new Set(),
    lastCharacterEndAt: Date.now(),
    finished: false,
  };
  // Charla que quedó a medias: se recupera tal cual.
  if (resume) {
    session.id = resume.id || session.id;
    session.history = resume.history || [];
    session.turns = (resume.turns || []).map(t => ({ ...t, els: [], removed: false }));
    session.completed = new Set(resume.completed || []);
    session.affection = resume.affection || 0;
    session.startedAt = Date.now() - (resume.elapsedMs || 0);
    session.sessionWords = new Set(resume.sessionWords || []);
  }
  const system = P.characterSystem({ character, place, mission, rankId: s.rank, rel, learnerName: s.name,
    learner: { interests: s.interests, ageGroup: s.ageGroup, motivation: s.motivation, gender: s.gender }, comedy: !!s.settings.comedy });
  const handsFree = () => !!store.get().settings.autoListen;
  const listener = new Listener();
  let busy = false;
  let suggestionTimer = null;
  let listenStartedAt = 0;
  let pendingSuggestion = null;
  let alive = true;
  let lastCharacterBubble = null;
  let nudgeTimer = null, nudged = false;
  let waitUntil = 0;

  // ---------- UI ----------
  const avatarBox = h('div.avatar-box');
  const stage = h('div.stage', { class: place.image ? 'with-scene' : '', style: { background: placeBackground(place) } },
    h('div.scene-label', {}, `${place.emoji} ${place.name}`), avatarBox,
    h('div.char-name', {}, character.name));
  const avatar = new Avatar(avatarBox, character);

  const objList = h('ul.objectives');
  const missionChip = h('button.mission-chip', { onclick: () => objList.classList.toggle('hidden') });
  const refreshMission = () => {
    const n = mission.objectives.length;
    setText(missionChip, `${mission.icon} ${mission.name}${n ? ` · ${session.completed.size}/${n}` : ''}`);
    objList.innerHTML = '';
    for (const o of mission.objectives) objList.appendChild(h('li', { class: session.completed.has(o.id) ? 'done' : '' }, session.completed.has(o.id) ? '✅ ' : '⬜ ', o.text));
    if (!n) objList.appendChild(h('li.muted', {}, 'Sin objetivos: conversa libremente.'));
  };
  refreshMission();

  const chat = h('div.chat', { 'aria-live': 'polite' });
  const interim = h('div.interim.hidden');
  const suggestBox = h('div.suggestions.hidden');
  const status = h('div.status');

  const micBtn = h('button.mic', { 'aria-label': 'Hablar', onclick: () => toggleMic() }, '🎤');
  const keyBtn = h('button.round', { 'aria-label': 'Escribir', onclick: () => toggleKeyboard() }, '⌨️');
  const hintBtn = h('button.round', { 'aria-label': 'Sugerencias', onclick: () => showSuggestions() }, '💡');
  const endBtn = h('button.round', { 'aria-label': 'Terminar', onclick: () => finish() }, '🏁');
  const input = h('input.text-input', { placeholder: 'Escriba en inglés (o en español y toque 🔁)', enterkeyhint: 'send' });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendTyped(); });
  const keyboardRow = h('div.keyboard-row.hidden', {}, input,
    h('button.small', { title: '¿Cómo se dice en inglés?', onclick: () => howToSay() }, '🔁'),
    h('button.small.primary', { onclick: () => sendTyped() }, 'Enviar'));
  const controls = h('div.controls', {}, hintBtn, keyBtn, micBtn, endBtn);
  // LiveMode: manos libres. Escucha sola cuando el personaje termina y envía después de una pausa corta.
  const liveBtn = h('button.icon.live-toggle', { 'aria-label': 'Manos libres', 'aria-pressed': String(handsFree()), class: handsFree() ? 'on' : '', title: 'Manos libres', onclick: () => toggleLive() }, '🎙');

  const transcriptBtn = h('button.icon', { 'aria-label': 'Ver la transcripción', title: 'Transcripción', onclick: () => openTranscript(scoring.buildTranscript(session), { character, learnerName: s.name, title: `${character.name} · ${mission.name}` }) }, '📜');

  const screen = h('div.screen.convo', {},
    h('div.topbar', {},
      h('button.icon', { 'aria-label': 'Salir', onclick: () => exit() }, '✕'),
      missionChip,
      transcriptBtn,
      liveBtn,
      h('span.timer', {}, '')),
    objList,
    stage,
    chat,
    h('div.bottom', {}, interim, suggestBox, status, keyboardRow, controls));
  objList.classList.add('hidden');
  mount(screen);

  const timer = screen.querySelector('.timer');
  const timerInt = setInterval(() => {
    const sec = Math.round((Date.now() - session.startedAt) / 1000);
    timer.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }, 1000);

  const setStatus = t => { status.dataset.raw = t || ''; setText(status, t || ''); };
  const scrollChat = () => { chat.scrollTop = chat.scrollHeight; };

  // ---------- Burbujas ----------
  // El texto de la respuesta aparece según el nivel: palabra por palabra mientras habla, al terminar,
  // 1 o 2 segundos después, u oculto hasta que lo toque (así primero entrena el oído).
  function characterBubble(text) {
    const lv = level();
    const mode = lv.response;
    const words = h('div.text');
    let spans = [];
    let full = '';
    let shown = false, wordTimer = null, laterTimer = null, segTimers = [];
    // Agrega texto a la burbuja (la respuesta puede llegar en dos partes). Cada palabra sabe dónde empieza.
    const addText = more => {
      more = String(more || '').trim();
      if (!more) return;
      if (full) { words.appendChild(document.createTextNode(' ')); full += ' '; }
      let pos = full.length;
      for (const part of more.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { words.appendChild(document.createTextNode(part)); pos += part.length; continue; }
        const sp = h('span.word', { onclick: () => openWordExplorer(part.replace(/[^A-Za-z'’-]/g, ''), full) }, part);
        sp.at = pos;
        if (mode === 'word' && !shown) sp.classList.add('pending');
        spans.push(sp);
        words.appendChild(sp);
        pos += part.length;
      }
      full += more;
      scrollChat();
    };
    addText(text);
    const tr = h('div.translation.hidden');
    const translate = async () => {
      if (!tr.classList.contains('hidden')) { tr.classList.add('hidden'); return; }
      tr.classList.remove('hidden');
      tr.textContent = '…';
      try { tr.textContent = (await chatJson('translate', P.translateMessages(full), { temperature: 0.2, maxTokens: 200, cache: true })).translation; }
      catch (e) { tr.textContent = e.message; }
    };
    const stopTimers = () => { clearInterval(wordTimer); wordTimer = null; segTimers.forEach(clearTimeout); segTimers = []; };
    const showBtn = h('button.tiny.show-text', { onclick: () => showText() }, '👁 Ver texto');
    const showText = () => {
      if (shown) return;
      shown = true;
      stopTimers(); clearTimeout(laterTimer);
      words.classList.remove('veiled');
      spans.forEach(x => x.classList.remove('pending'));
      showBtn.remove();
      if (lv.translation === 'always') translate();
    };
    if (mode !== 'word') words.classList.add('veiled');
    const actions = h('div.actions', {},
      mode === 'word' ? null : showBtn,
      h('button.tiny', { onclick: () => say(full) }, '🔊'),
      h('button.tiny', { onclick: translate }, '🌐 Traducir'));
    const b = h('div.bubble.character', {}, words, tr, actions);
    b.addText = addText;
    b.fullText = () => full;
    // Cambia todo el texto (si la respuesta final no coincide con lo que ya se dijo).
    b.resetText = t => { words.replaceChildren(); spans = []; full = ''; addText(t); };
    // Cuando ya está todo el texto: las pistas de pronunciación se piden para la frase completa.
    let completed = false;
    b.complete = () => {
      if (completed) return;
      completed = true;
      const hintBtn = attachHints(words, spans, full, lv.pronunciation);
      if (hintBtn) actions.appendChild(hintBtn);
    };
    const live = () => mode === 'word' && !shown;
    const inRange = (from, len) => spans.filter(sp => sp.at >= from && sp.at < from + len);
    const showUpTo = idx => spans.forEach(sp => { if (sp.at <= idx) sp.classList.remove('pending'); });
    // Texto al ritmo de la voz. Hay 3 formas, de la más exacta a la aproximada:
    //  at(i)      la voz del teléfono avisa la palabra que va diciendo;
    //  segment()  la voz natural dice cuándo empieza y cuánto dura cada frase;
    //  piece()    respaldo: ritmo medido de la voz de este teléfono.
    b.reveal = {
      piece(from, len) {
        if (!live()) return;
        stopTimers();
        const list = inRange(from, len);
        let i = 0;
        list[i++]?.classList.remove('pending');
        wordTimer = setInterval(() => { list[i++]?.classList.remove('pending'); if (i >= list.length) { clearInterval(wordTimer); wordTimer = null; } }, msPerWord(lv.rate));
      },
      at(idx) { if (!live()) return; clearInterval(wordTimer); wordTimer = null; showUpTo(idx); },
      segment(from, len, inMs, durMs) {
        if (!live()) return;
        clearInterval(wordTimer); wordTimer = null;
        for (const sp of inRange(from, len)) {
          const when = inMs + ((sp.at - from) / Math.max(1, len)) * durMs;
          segTimers.push(setTimeout(() => sp.classList.remove('pending'), Math.max(0, when)));
        }
      },
      pieceEnd(from, len) { if (live()) showUpTo(from + len); },
      end() {
        if (shown) return;
        if (mode === 'word' || mode === 'after') showText();
        else if (mode === 'after1') laterTimer = setTimeout(showText, 1000);
        else if (mode === 'after2') laterTimer = setTimeout(showText, 2000);
      },
    };
    chat.appendChild(b);
    lastCharacterBubble = b;
    scrollChat();
    return b;
  }

  function learnerBubble(text) {
    const dot = h('button.grade.pending', { 'aria-label': 'Ver corrección' }, '');
    // Solo el último turno se puede repetir (RetryInConversation).
    chat.querySelectorAll('.retry').forEach(x => x.remove());
    const retry = h('button.tiny.retry', { title: 'El teléfono entendió mal: borrar y decirlo otra vez', onclick: () => retryLast() }, '↩️ Repetir');
    const b = h('div.bubble.learner', {}, h('div.text', {}, text), dot, retry);
    chat.appendChild(b);
    scrollChat();
    return { el: b, dot };
  }

  function showAnalysis(dot, a, original) {
    dot.classList.remove('pending');
    if (level().feedback === 'off') { dot.remove(); return; }   // corrección apagada: no se muestra
    if (!a) { dot.classList.add('none'); dot.textContent = '·'; return; }
    const g = GRADE[a.grammar] || GRADE.SomeMistakes;
    dot.classList.add(g.color);
    setText(dot, a.has_feedback ? '!' : '✓');
    if (tutorial.needed('dot')) setTimeout(() => tutorial.tour('dot', [{ el: dot, text: 'Este punto es la corrección de lo que dijo: verde está bien, amarillo tiene detalles y rojo hay que revisarlo. Tóquelo para ver la versión correcta y la explicación.' }]), 600);
    dot.onclick = () => {
      const panel = h('div', {},
        h('h3', {}, g.label),
        knownError(a.known_error),
        a.explanation ? h('p', { html: richText(a.explanation) }) : null,
        a.corrected && a.corrected.trim().toLowerCase() !== original.trim().toLowerCase()
          ? h('div.correction', {}, h('small', {}, 'Corrección'), h('div', {}, a.corrected),
            h('button.tiny', { onclick: () => explainBolen(original, a) }, '❓ No entiendo')) : null,
        a.better ? hintedBlock(a.better, (line, hint) => h('div.correction.better', {}, h('small', {}, 'Más natural'), line,
          h('div.row', {},
            h('button.tiny', { onclick: () => say(a.better) }, '🔊 Escuchar'),
            h('button.tiny', { onclick: () => practicePronunciation(a.better) }, '🎤 Practicar'),
            h('button.tiny', { title: 'Practicarla después con Repeat and Juggle o con su esqueleto', onclick: () => sendToWorkshop(a.better) }, '🧩 Al taller'),
            hint))) : null,
        h('p.muted', {}, `Adecuado al contexto: ${({ Fully: 'sí', Mostly: 'casi', Somewhat: 'más o menos', Inappropriate: 'no' })[a.appropriateness] || '—'}`));
      sheet(panel);
    };
  }

  // Si repite un error de su bitácora, se lo dice con el ejemplo correcto que ya tenía anotado.
  function knownError(id) {
    const b = id && findError(id);
    if (!b) return null;
    return h('div.known-error', {}, h('b', {}, '🔁 Otra vez un error de su bitácora'),
      h('p.muted', {}, 'Como en: ', h('i', {}, b.right[0])));
  }

  // «No entiendo»: la frase en español, partida en piezas, cada una en inglés (método de Pablo Bolen).
  async function explainBolen(original, a) {
    const box = h('div', {}, h('h3', {}, '🧩 Pieza por pieza'), spinner('Armando la explicación…'));
    sheet(box);
    try {
      const r = await chatJson('explain', P.explainMessages({ original, corrected: a.corrected, explanation: a.explanation }), { temperature: 0.3, maxTokens: 500, cache: true });
      box.lastChild.remove();
      box.append(
        h('p', {}, 'Lo que quería decir: ', h('b', {}, r.es || '')),
        h('ol.pieces', {}, (r.pieces || []).map(p => h('li', {},
          h('span.piece-es', {}, p.es), ' → ', h('b.piece-en', {}, p.en),
          p.note ? h('small.muted', {}, p.note) : null))),
        h('div.correction.better', {}, h('small', {}, 'Armado en inglés'), h('div', {}, r.en || a.corrected),
          h('div.row', {}, h('button.tiny', { onclick: () => say(r.en || a.corrected) }, '🔊 Escuchar'),
            h('button.tiny', { onclick: () => practicePronunciation(r.en || a.corrected) }, '🎤 Practicar'))),
        r.tip ? h('p.muted', {}, '💡 ', r.tip) : null);
    } catch (e) { box.lastChild.remove(); box.append(h('p', {}, e.message)); }
  }

  // Frase en inglés con su botón de pistas de pronunciación (según el nivel).
  function hintedBlock(text, build) {
    const { el, spans } = wordLine(text, 'div.hint-line');
    return build(el, attachHints(el, spans, text, level().pronunciation));
  }

  function pointsPop(ev) {
    if (!ev.total) return;
    const parts = [`+${ev.total}`];
    if (ev.objective) parts.push('🎯');
    if (ev.excellentFluency) parts.push('⚡');
    if (ev.excellentVocabulary) parts.push('📚');
    const p = h('div.points-pop', {}, parts.join(' '));
    stage.appendChild(p);
    setTimeout(() => p.remove(), 1800);
  }

  // ---------- Voz del personaje ----------
  // from = dónde empieza este trozo dentro de la burbuja (la respuesta puede decirse en dos partes).
  async function say(text, reveal, from = 0) {
    // Con la app en segundo plano no se habla: al volver, el texto ya está ahí.
    if (document.hidden) { reveal?.pieceEnd(from, text.length); return; }
    await speak(text, {
      character, rate: level().rate,
      onStart: () => reveal?.piece(from, text.length),
      onBoundary: i => reveal?.at(from + i),
      onSegment: seg => reveal?.segment(from + seg.offset, seg.length, seg.inMs, seg.durMs),
      onLevel: l => avatar.setLevel(l),
      onMouth: v => avatar.setMouth(v),
      onEnd: () => avatar.setLevel(0),
    });
    reveal?.pieceEnd(from, text.length);
  }

  // Pide la respuesta del personaje y empieza a hablar apenas llega la primera frase completa
  // (la respuesta llega por partes), en vez de esperar todo el texto. Devuelve { r, early }.
  async function fetchAndSpeak(task, msgs, opts) {
    let early = null;
    const onText = partial => {
      if (early || !alive) return;
      const p = partialField(partial, 'reply');
      if (!p) return;
      const first = p.done ? p.text.trim() : firstSentence(p.text);
      if (!first) return;
      setStatus('');
      const bubble = characterBubble(first);
      early = { text: first, bubble, speaking: say(first, bubble.reveal) };
    };
    try {
      return { r: await chatJson(task, msgs, { ...opts, onText }), early };
    } catch (e) {
      if (early) { stopSpeaking(); avatar.setLevel(0); early.bubble.remove(); lastCharacterBubble = null; }
      throw e;
    }
  }

  async function characterSays(text, mood, { remember = true, early = null } = {}) {
    if (mood != null) avatar.setMood(mood);
    if (remember) session.history.push({ role: 'character', text });
    // Palabras guardadas que aparecen en lo que dice el personaje: +familiaridad.
    for (const v of scoring.findBookmarks(text)) scoring.bumpFamiliarity(v.id, scoring.FAMILIARITY.seenInConversation);
    setStatus('');
    let bubble;
    if (early) {
      // Ya está diciendo la primera frase: se agrega el resto y se dice cuando termine.
      bubble = early.bubble;
      const k = text.indexOf(early.text);
      const rest = k >= 0 ? text.slice(k + early.text.length).trim() : null;
      if (rest === null) bubble.resetText(text);
      else if (rest) bubble.addText(rest);
      bubble.complete();
      await early.speaking;
      // Si la respuesta final cambió (DeepSeek la rehízo), se dice la nueva entera para que voz y texto coincidan.
      if (rest === null && alive) await say(text, bubble.reveal);
      else if (rest && alive) await say(rest, bubble.reveal, bubble.fullText().length - rest.length);
    } else {
      bubble = characterBubble(text);
      bubble.complete();
      await say(text, bubble.reveal);
    }
    bubble.reveal.end();
    session.lastCharacterEndAt = Date.now();
    if (!alive) return;
    if (session.finished) {
      endBtn.classList.add('pulse');
      // Deshacer «terminar»: el personaje se despidió, pero puede seguir hablando.
      status.replaceChildren(document.createTextNode('La conversación terminó. Toque 🏁 para ver su resultado. '),
        h('button.tiny', { onclick: () => { session.finished = false; endBtn.classList.remove('pulse'); setStatus('Siga cuando quiera 🎤'); armNudge(); } }, '↩️ Seguir hablando'));
      return;
    }
    if (Date.now() < waitUntil) { setStatus('⏳ Tómese su tiempo. Toque 🎤 cuando esté listo.'); armNudge(); return; }
    if (!session.turns.length && tutorial.needed('conv')) { await tutorial.tour('conv', tourSteps(bubble)); if (!alive) return; }
    armSuggestions();
    armNudge();
    if (handsFree() && canListen && !document.hidden) toggleMic();
  }

  // Tutorial de la primera charla: qué hace cada botón.
  const tourSteps = bubble => [
    { el: bubble.querySelector('.text'), text: `Esto es lo que dice ${character.name}. Toque cualquier palabra para ver qué significa, cómo se pronuncia y guardarla en su vocabulario.` },
    { el: micBtn, text: '🎤 Toque el micrófono y conteste en inglés. Si una palabra no le sale, dígala en español: el coach le enseña cómo se dice.' },
    { el: hintBtn, text: '💡 ¿No sabe qué decir? Aquí hay ideas de respuesta con su traducción.' },
    { el: keyBtn, text: '⌨️ Si prefiere, puede escribir en vez de hablar.' },
    { el: liveBtn, text: '🎙 Manos libres: el micrófono se abre solo cuando el personaje termina, y envía después de una pausa.' },
    { el: transcriptBtn, text: '📜 Aquí ve toda la charla escrita, con las correcciones.' },
    { el: endBtn, text: '🏁 Cuando quiera terminar, toque aquí: puede despedirse del personaje y luego verá su puntaje y qué mejorar.' },
  ];

  function toggleLive() {
    const on = !handsFree();
    store.update(st => { st.settings.autoListen = on; });
    liveBtn.classList.toggle('on', on);
    liveBtn.setAttribute('aria-pressed', String(on));
    toast(on ? '🎙 Manos libres: escucha solo y envía tras una pausa' : 'Manos libres apagado: toque 🎤 para hablar');
    if (on && !busy && !listener.active && !session.finished && canListen) toggleMic();
  }

  // WaitInConversation: pide un momento para pensar; el personaje espera sin gastar tokens.
  async function waitMoment() {
    if (busy) return;
    listener.abort();
    waitUntil = Date.now() + WAIT_MS;
    clearTimeout(suggestionTimer);
    await characterSays(WAIT_LINES[Math.floor(Math.random() * WAIT_LINES.length)], null, { remember: false });
  }
  const waitButton = () => h('button.tiny', { onclick: () => waitMoment() }, '⏳ Necesito un momento');
  const turnStatus = text => status.replaceChildren(document.createTextNode(text + ' '), waitButton());

  // RequestGoodbyeInConversation: el personaje cierra la charla con una despedida.
  async function requestGoodbye() {
    if (busy || session.finished) return;
    busy = true;
    listener.abort();
    clearTimeout(suggestionTimer); clearTimeout(nudgeTimer);
    suggestBox.classList.add('hidden');
    setStatus(`${character.name} se está despidiendo…`);
    try {
      const { r, early } = await fetchAndSpeak('reply', [...baseMessages(), { role: 'user', content: P.goodbyeUser() }], { maxTokens: 200 });
      busy = false;
      session.finished = true;
      await characterSays(r.reply || 'It was really nice talking to you. See you soon!', r.mood ?? 0.6, { early });
      saveDraft();
    } catch (e) { busy = false; setStatus(''); errorBox(e, requestGoodbye); }
  }
  const baseMessages = () => [{ role: 'system', content: system }, ...session.history.map(m => ({ role: m.role === 'character' ? 'assistant' : 'user', content: m.role === 'character' ? JSON.stringify({ reply: m.text }) : m.text }))];

  function armSuggestions() {
    clearTimeout(suggestionTimer);
    const d = level().suggestionMs;   // 0 = solo si las pide con 💡
    if (d > 0) suggestionTimer = setTimeout(() => { if (!busy && !listener.active && !document.hidden) showSuggestions(); }, d);
  }

  // Si no responde en un rato, el personaje lo anima a hablar.
  function armNudge() {
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(async () => {
      if (!alive || busy || listener.active || session.finished || document.hidden || document.activeElement === input) return;
      micBtn.classList.add('pulse');
      if (nudged) { turnStatus('🎤 ¡Su turno! Toque el micrófono o pida una idea con 💡'); return; }
      nudged = true;
      await characterSays(NUDGES[Math.floor(Math.random() * NUDGES.length)], null, { remember: false });
      if (alive && !busy && !listener.active) turnStatus('🎤 ¡Su turno!');
    }, Math.max(NUDGE_MS, waitUntil - Date.now()));
  }

  // Guarda la charla para poder seguirla después (si sale con ✕ o se cierra la app).
  function saveDraft() {
    if (!session.history.length || !alive) return;
    store.update(st => {
      st.draft = { id: session.id, placeId: place.id, characterId: character.id, mission,
        history: session.history, turns: session.turns.map(({ els, ...t }) => t), completed: [...session.completed],
        affection: session.affection, elapsedMs: Date.now() - session.startedAt, sessionWords: [...session.sessionWords], savedAt: Date.now() };
    });
  }
  const clearDraft = () => store.update(st => { st.draft = null; });

  // Vuelve a dibujar una charla guardada, sin hablar ni gastar tokens.
  function restoreChat() {
    const els = {};
    session.history.forEach((m, i) => {
      if (m.role === 'character') { const b = characterBubble(m.text); b.complete(); b.querySelector('.show-text')?.click(); b.reveal.end(); els[i] = b; }
      else els[i] = learnerBubble(m.text);
    });
    for (const t of session.turns) {
      const le = els[t.historyIndex], ce = els[t.historyIndex + 1];
      t.els = [le?.el, ce].filter(Boolean);
      if (le) showAnalysis(le.dot, t.analysis, t.text);
    }
    refreshMission();
    session.lastCharacterEndAt = Date.now();
    setStatus('⏯️ Charla retomada. Su turno 🎤');
    armSuggestions();
    armNudge();
  }

  // ---------- Abrir ----------
  async function open() {
    busy = true;
    setStatus(`${character.name} está pensando…`);
    try {
      const { r, early } = await fetchAndSpeak('opening', [{ role: 'system', content: system }, { role: 'user', content: P.openingUser() }], { maxTokens: 200 });
      busy = false;
      await characterSays(r.reply || 'Hi!', r.mood ?? 0.4, { early });
    } catch (e) {
      busy = false;
      setStatus('');
      errorBox(e, open);
    }
  }

  function errorBox(e, retry) {
    const box = h('div.error-box', {}, h('p', {}, e instanceof LlmError ? e.message : 'Error: ' + e.message),
      h('button.small', { onclick: () => { box.remove(); retry(); } }, 'Reintentar'));
    chat.appendChild(box);
    scrollChat();
  }

  // ---------- Turno del aprendiz ----------
  async function learnerTurn(text, { durationMs = 0, usedSuggestion = false } = {}) {
    if (busy || session.finished) return;
    clearTimeout(suggestionTimer);
    clearTimeout(nudgeTimer); nudged = false; waitUntil = 0; micBtn.classList.remove('pulse');
    suggestBox.classList.add('hidden');
    text = text.trim();
    if (!text) {
      // SpeechNotRecognized: respuesta local, sin gastar tokens.
      const line = NOT_HEARD[Math.floor(Math.random() * NOT_HEARD.length)];
      await characterSays(line, null, { remember: false });   // no va al historial de la IA
      return;
    }
    busy = true;
    const delayMs = Math.max(0, (listenStartedAt || Date.now()) - session.lastCharacterEndAt);
    listenStartedAt = 0;
    const lastCharacterLine = [...session.history].reverse().find(m => m.role === 'character')?.text || '';
    const historyIndex = session.history.length;
    session.history.push({ role: 'learner', text });
    const { el: learnerEl, dot } = learnerBubble(text);
    setStatus(`${character.name} está pensando…`);

    const msgs = baseMessages();
    const s = store.get();
    const replyP = fetchAndSpeak('reply', msgs, { maxTokens: 260 });
    const analysisP = chatJson('analysis', P.analysisMessages({ characterLine: lastCharacterLine, learnerLine: text, rankId: s.rank, strictness: level().feedback === 'off' ? 'Relaxed' : level().strictness, mission }), { temperature: 0.2, maxTokens: 320 })
      .catch(() => null);

    let reply, early;
    try {
      ({ r: reply, early } = await replyP);
    } catch (e) {
      busy = false;
      session.history.length = historyIndex;
      learnerEl.remove();
      setStatus('');
      errorBox(e, () => learnerTurn(text, { durationMs, usedSuggestion }));
      return;
    }

    // Objetivos cumplidos
    const valid = new Set(mission.objectives.map(o => o.id));
    const newly = (reply.objectives_completed || []).filter(id => valid.has(id) && !session.completed.has(id));
    newly.forEach(id => session.completed.add(id));
    if (newly.length) { refreshMission(); toast('🎯 Objetivo cumplido: ' + mission.objectives.find(o => o.id === newly[0]).text, 'good'); }
    const affectionDelta = Math.max(-2, Math.min(2, Math.round(reply.affection || 0)));
    session.affection += affectionDelta;
    session.finished = !!reply.finished;

    // Vocabulario guardado usado al hablar
    const used = scoring.findBookmarks(text);
    for (const v of used) {
      const u = scoring.bumpFamiliarity(v.id, scoring.FAMILIARITY.usedInSpeech);
      if (u?.tierUp) toast(`⭐ «${u.text}» subió a ${scoring.tierFor(u.toScore).label}`, 'good');
    }

    const turn = { text, durationMs, delayMs, usedSuggestion, analysis: null, points: null, objectivesCompleted: newly.length,
      historyIndex, newly, affectionDelta, els: [learnerEl], freshWords: [], removed: false };
    session.turns.push(turn);
    busy = false;
    const speakingDone = characterSays(reply.reply || '…', reply.mood, { early });
    turn.els.push(lastCharacterBubble);
    saveDraft();

    const analysis = await analysisP;
    if (turn.removed || !alive) return;
    turn.analysis = analysis;
    if (analysis) analysis.original = text;
    showAnalysis(dot, analysis, text);
    saveDraft();
    turn.freshWords = [...new Set(scoring.words(text))].filter(w => !session.sessionWords.has(w));
    turn.points = scoring.scoreTurn({ text, durationMs, delayMs, usedSuggestion, analysis, objectivesCompleted: newly.length, sessionWords: session.sessionWords, bookmarksUsed: used.length });
    pointsPop(turn.points);
    await speakingDone;
  }

  // Deshace el último turno (frase del aprendiz + respuesta del personaje) para decirlo otra vez.
  function retryLast() {
    if (busy) { toast('Espere a que termine la respuesta…'); return; }
    const turn = session.turns.at(-1);
    if (!turn) return;
    stopSpeaking();
    avatar.setLevel(0);
    listener.abort();
    clearTimeout(suggestionTimer);
    turn.removed = true;
    session.turns.pop();
    session.history.length = turn.historyIndex;
    turn.els.forEach(el => el?.remove());
    turn.newly.forEach(id => session.completed.delete(id));
    turn.freshWords.forEach(w => session.sessionWords.delete(w));
    session.affection -= turn.affectionDelta;
    session.finished = false;
    endBtn.classList.remove('pulse');
    refreshMission();
    session.lastCharacterEndAt = Date.now();
    setStatus('Listo. Diga su frase otra vez 🎤');
    saveDraft();
  }

  // ---------- Micrófono ----------
  async function toggleMic() {
    if (listener.active) { listener.stop(); return; }
    if (busy || session.finished) return;
    if (!canListen) { toast('Su navegador no reconoce voz: use el teclado ⌨️'); toggleKeyboard(true); return; }
    stopSpeaking();
    avatar.setLevel(0);
    clearTimeout(suggestionTimer);
    clearTimeout(nudgeTimer); micBtn.classList.remove('pulse');
    listenStartedAt = Date.now();
    waitUntil = 0;
    buzz('tap');
    const leftBefore = leftCount;
    try {
      // Manos libres: después de hablar hay una pausa corta para cancelar, seguir hablando o enviar ya.
      let text = '', durationMs = 0, cancelled = false;
      for (;;) {
        const r = await listenOnce(text);
        text = [text, r.text].filter(Boolean).join(' ').trim();
        durationMs += r.durationMs;
        if (!alive || !handsFree() || !text) break;
        const choice = await commitDelay(text);
        if (choice === 'more') continue;
        cancelled = choice === 'cancel';
        break;
      }
      if (!alive) return;
      // No dijo nada: el personaje no lo apura con «no le entendí»; el micrófono queda listo para cuando quiera.
      if (!text && leftCount === leftBefore) {
        micBtn.classList.add('pulse');
        turnStatus('🎤 Tómese su tiempo. Toque el micrófono cuando esté listo.');
        armNudge();
        return;
      }
      // Salió de la app mientras grababa: no se envía un pedazo; se sigue cuando vuelva.
      if (leftCount !== leftBefore) { setStatus('🎤 Se pausó el micrófono al salir. Tóquelo para seguir.'); return; }
      if (cancelled) { setStatus('Cancelado. Toque 🎤 cuando quiera hablar.'); return; }
      const usedSuggestion = !!pendingSuggestion && similarity(text, pendingSuggestion) > 0.6;
      pendingSuggestion = null;
      await learnerTurn(text, { durationMs, usedSuggestion });
    } catch (e) {
      toast(e.message, 'bad');
    }
  }

  // Una grabación (hasta que se calla o llega al máximo), con el texto que se va reconociendo.
  async function listenOnce(before = '') {
    const startedAt = Date.now();
    // Aviso de que la grabación está por terminar; al final se envía lo que alcanzó a decir.
    const recWatch = setInterval(() => {
      const left = MAX_RECORD_MS - (Date.now() - startedAt);
      if (left <= 0) { listener.stop(); clearInterval(recWatch); }
      else if (left <= RECORD_WARN_MS) setStatus(`⏳ Quedan ${Math.ceil(left / 1000)} s de grabación: se enviará lo que alcance a decir.`);
    }, 500);
    micBtn.classList.add('recording');
    avatar.setListening(true);
    interim.classList.remove('hidden');
    const LISTENING = 'Escuchando… tómese su tiempo (toque el micrófono para enviar)';
    interim.textContent = before || LISTENING;
    try {
      return await listener.start({ lang: store.get().settings.targetLang, onInterim: t => { interim.textContent = [before, t].filter(Boolean).join(' ') || LISTENING; } });
    } finally {
      clearInterval(recWatch);
      if (/^⏳/.test(status.dataset.raw || '')) setStatus('');
      micBtn.classList.remove('recording');
      avatar.setListening(false);
      interim.classList.add('hidden');
    }
  }

  // LiveModeCommitDelay: muestra lo que entendió y lo envía solo después de una pausa corta.
  function commitDelay(text) {
    return new Promise(resolve => {
      const done = v => { clearTimeout(t); box.remove(); resolve(v); };
      const box = h('div.commit', { role: 'status' },
        h('div.commit-text', {}, text),
        h('div.commit-bar', { style: { animationDuration: COMMIT_MS + 'ms' } }),
        h('div.row', {},
          h('button.tiny', { onclick: () => done('cancel') }, '✕ Cancelar'),
          h('button.tiny', { onclick: () => done('more') }, '🎤 Seguir hablando'),
          h('button.tiny.primary', { onclick: () => done('send') }, 'Enviar ya')));
      interim.after(box);
      const t = setTimeout(() => done(alive ? 'send' : 'cancel'), COMMIT_MS);
    });
  }

  function toggleKeyboard(force) {
    const show = force ?? keyboardRow.classList.contains('hidden');
    keyboardRow.classList.toggle('hidden', !show);
    if (show) input.focus();
  }

  function sendTyped() {
    const t = input.value.trim();
    if (!t) return;
    input.value = '';
    const usedSuggestion = !!pendingSuggestion && similarity(t, pendingSuggestion) > 0.6;
    pendingSuggestion = null;
    learnerTurn(t, { durationMs: 0, usedSuggestion });
  }

  // "¿Cómo se dice?" (ConversationCustomSuggestion)
  async function howToSay() {
    const es = input.value.trim();
    if (!es) { toast('Escriba en español lo que quiere decir.'); return; }
    setStatus('Buscando cómo decirlo…');
    try {
      const r = await chatJson('custom_suggestion', P.customSuggestionMessages({ history: session.history, rankId: store.get().rank, spanish: es }), { temperature: 0.3, maxTokens: 150 });
      setStatus('');
      input.value = '';
      offerSuggestion(r.text, r.translation);
    } catch (e) { setStatus(''); toast(e.message, 'bad'); }
  }

  // Sugerencia (ConversationSuggestion): una sola, con «Otra idea» por si no le sirve.
  let lastIdea = '';
  async function showSuggestions(another = false) {
    if (busy || session.finished) return;
    if (!another) lastIdea = '';
    suggestBox.classList.remove('hidden');
    suggestBox.innerHTML = '';
    suggestBox.appendChild(spinner('Pensando ideas…'));
    try {
      const r = await chatJson('suggestions', P.suggestionMessages({ history: session.history, rankId: store.get().rank, mission: { ...mission, objectives: mission.objectives.filter(o => !session.completed.has(o.id)) }, avoid: lastIdea }), { temperature: another ? 0.9 : 0.7, maxTokens: 140 });
      suggestBox.innerHTML = '';
      const list = (r.suggestions || []).filter(x => x?.text);
      const pickIdea = list.find(x => x.text !== lastIdea) || list[0];
      for (const sug of pickIdea ? [pickIdea] : []) {
        lastIdea = sug.text;
        // En modo automático la pista va en la tarjeta; a pedido, en la tarjeta de practicar.
        const { el: line, spans } = wordLine(sug.text, 'span.hint-line');
        if (level().pronunciation === 'auto') attachHints(line, spans, sug.text, 'auto');
        suggestBox.appendChild(h('button.suggestion', { onclick: () => offerSuggestion(sug.text, sug.translation) },
          line, h('small', {}, sug.translation || '')));
        suggestBox.appendChild(h('button.tiny.another-idea', { onclick: () => showSuggestions(true) }, '🔄 Otra idea'));
      }
    } catch (e) { suggestBox.innerHTML = ''; suggestBox.appendChild(h('div.muted', {}, e.message)); }
  }

  function offerSuggestion(text, translation) {
    pendingSuggestion = text;
    suggestBox.classList.remove('hidden');
    suggestBox.innerHTML = '';
    const { el: line, spans } = wordLine(text, 'b.hint-line');
    const hint = attachHints(line, spans, text, level().pronunciation);
    suggestBox.appendChild(h('div.practice', {},
      h('div', {}, line, h('small', {}, translation || '')),
      h('div.row', {}, hint,
        h('button.tiny', { onclick: () => say(text) }, '🔊'),
        // Practicarla primero (verde/ámbar/rojo por palabra) y enviarla cuando suene bien.
        h('button.tiny', { onclick: () => practicePronunciation(text, {
          character,
          onSend: ({ durationMs }) => {
            closeSheet();
            suggestBox.classList.add('hidden');
            pendingSuggestion = null;
            learnerTurn(text, { durationMs, usedSuggestion: true });
          },
        }) }, '🎯 Practicar'),
        h('button.tiny.primary', { onclick: () => { suggestBox.classList.add('hidden'); toggleMic(); } }, '🎤 Dígalo'),
        h('button.tiny', { onclick: () => { suggestBox.classList.add('hidden'); pendingSuggestion = text; input.value = text; sendTyped(); } }, 'Enviar escrito'))));
  }

  // ---------- Salir a la pantalla del teléfono y volver ----------
  // Al salir: se para el micrófono y la voz y se guarda la charla (por si el teléfono cierra la app).
  // Al volver: todo sigue donde estaba, sin recargar ni repetir nada.
  let leftCount = 0;
  const onVisibility = () => {
    if (!alive) return;
    if (document.hidden) {
      leftCount++;
      listener.abort();
      stopSpeaking();
      avatar.setLevel(0);
      clearTimeout(suggestionTimer);
      clearTimeout(nudgeTimer);
      saveDraft();
    } else {
      avatar.setLevel(0);
      lastCharacterBubble?.reveal?.end();
      scrollChat();
      if (!busy && !listener.active && !session.finished) {
        setStatus('👋 De vuelta. Siga cuando quiera 🎤');
        armNudge();
      }
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ---------- Terminar ----------
  function cleanup() {
    alive = false;
    document.removeEventListener('visibilitychange', onVisibility);
    clearInterval(timerInt);
    clearTimeout(suggestionTimer);
    clearTimeout(nudgeTimer);
    listener.abort();
    stopSpeaking();
    avatar.destroy();
    closeSheet();
  }

  // ✕ = pausa: la charla queda guardada para seguirla desde el inicio.
  function exit() {
    if (session.turns.length >= 1) {
      saveDraft();
      cleanup();
      toast('⏸️ Charla guardada: puede seguirla desde el inicio');
      onExit();
      return;
    }
    clearDraft();
    cleanup();
    onExit();
  }

  // 🏁 = terminar y ver el resultado (pide confirmar si el personaje no se ha despedido).
  function finish(confirmed = false) {
    if (busy) { toast('Espere a que termine la respuesta…'); return; }
    if (session.turns.length === 0) { clearDraft(); cleanup(); onExit(); return; }
    if (!confirmed && !session.finished) {
      sheet(h('div', {},
        h('h3', {}, '¿Terminar la charla?'),
        h('p.muted', {}, `Lleva ${session.turns.length} ${session.turns.length === 1 ? 'turno' : 'turnos'}. Si termina, verá su resultado. Si sale con ✕, la puede seguir después.`),
        h('button.primary.wide', { onclick: () => { closeSheet(); requestGoodbye(); } }, `👋 Despedirme de ${character.name}`),
        h('p.muted.center', {}, `${character.name} cierra la charla y luego toca 🏁 para ver su resultado.`),
        h('button.wide', { onclick: () => { closeSheet(); finish(true); } }, '🏁 Terminar ya'),
        h('button.wide', { onclick: () => closeSheet() }, '↩️ Seguir hablando')));
      return;
    }
    clearDraft();
    cleanup();
    onFinish(session);
  }

  if (resume) restoreChat(); else open();
}

function similarity(a, b) {
  const A = new Set(scoring.words(a)), B = new Set(scoring.words(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const w of A) if (B.has(w)) inter++;
  return inter / Math.max(A.size, B.size);
}
