// Taller de frases: Repeat and Juggle y Skeleton swapping, con ejercicios guiados, revisión con DeepSeek
// y ejercicios nuevos creados por la IA desde cualquier frase (también las corregidas en las charlas).
// El contenido y la revisión sin IA están en drills.js.
import * as store from './store.js';
import { chatJson } from './llm.js';
import * as P from './prompts.js';
import { h, mount, sheet, closeSheet, toast, spinner, progressBar, setText, buzz } from './ui.js';
import { Listener, speak, stopSpeaking, canListen } from './speech.js';
import { wordStates, verdict } from './pronounce.js';
import { addVocab } from './words.js';
import * as D from './drills.js';

const drills = () => store.get().drills || { done: {}, mine: [], inbox: [] };
const hasAI = () => !!store.get().settings.apiKey?.trim();
const say = t => speak(D.plain(t), { rate: 0.9 });
// Como replaceChildren, pero salta los vacíos (null/false) igual que h().
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));

function saveDrills(fn) {
  store.update(s => {
    s.drills = { done: {}, mine: [], inbox: [], ...(s.drills || {}) };
    fn(s.drills);
  });
}

// Guarda una frase de una charla para practicarla después en el taller (sin salir de la charla).
export function sendToWorkshop(text) {
  const t = (text || '').trim();
  if (!t) return;
  saveDrills(d => { d.inbox = [t, ...d.inbox.filter(x => x !== t)].slice(0, 20); });
  toast('🧩 Guardada para el Taller de frases', 'good');
}

// Texto con [marcas] en negrita.
const marked = t => h('span', {}, D.markParts(t).map(p => (p.mark ? h('b.jg-mark', {}, p.text) : p.text)));
// El esqueleto: huesos fijos y huecos con su pista.
const frameView = sk => h('div.skeleton', { 'aria-label': 'Esqueleto: ' + D.fillFrame(sk.frame, {}) },
  D.frameParts(sk.frame).map(p => (p.bone ? h('span.bone', {}, p.bone) : h('span.slot', {}, sk.slots?.[p.slot] || p.slot))));

// ---------------- Pantalla del taller ----------------
export function workshop({ home, tab = 'juggle' }) {
  const d = drills();
  const tabs = [{ key: 'juggle', label: '🔁 Repeat and Juggle' }, { key: 'skeleton', label: '🧩 Skeleton swapping' }];
  const back = () => workshop({ home, tab });
  const row = (x, kind, sub) => h('button.pack', { onclick: () => start(x, kind, back) },
    h('span.pack-icon', {}, x.icon || (kind === 'skeleton' ? '🧩' : '🔁')),
    h('span.pack-body', {}, h('span.pack-name', {}, x.title, x.level ? h('small.muted', {}, ` · ${x.level}`) : null),
      h('small.muted.drill-sub', {}, sub)),
    h('small.muted', {}, d.done[x.id] ? `✓ ${d.done[x.id]}` : ''));
  const jRow = x => row(x, 'juggle', D.plain(x.steps[0].en));
  const sRow = x => row(x, 'skeleton', D.fillFrame(x.frame, {}).replace(/___/g, '…'));
  const mine = d.mine.filter(x => x.kind === tab);

  const body = tab === 'juggle' ? [
    method('juggle'),
    createCard(tab, back),
    mine.length ? section('✨ Creados con IA', mine.map(jRow)) : null,
    section('Para empezar', D.JUGGLES.map(jRow)),
    h('div.section-head', {}, h('h2', {}, 'De su mazo de verbos')),
    h('p.muted', {}, 'Los 111 verbos de su cerebro de inglés: ahora → ayer → he… → había… → mañana.'),
    [...new Set(D.VERB_JUGGLES.map(x => x.cat))].map(cat => {
      const list = D.VERB_JUGGLES.filter(x => x.cat === cat);
      const done = list.filter(x => d.done[x.id]).length;
      return h('details.drill-group', {}, h('summary', {}, `${cat} `, h('small.muted', {}, `${done}/${list.length}`)), h('div.packs', {}, list.map(jRow)));
    }),
  ] : [
    method('skeleton'),
    createCard(tab, back),
    mine.length ? section('✨ Creados con IA', mine.map(sRow)) : null,
    D.SKELETON_GROUPS.map(g => section(`${g.icon} ${g.name}`, D.SKELETONS.filter(x => x.group === g.id).map(sRow))),
  ];

  mount(h('div.screen.workshop', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: home }, '←'), h('h2', {}, '🧩 Taller de frases')),
    h('div.segmented', {}, tabs.map(t => h('button', { class: t.key === tab ? 'sel' : '', onclick: () => workshop({ home, tab: t.key }) }, t.label))),
    body));
}

const section = (title, items) => h('div', {}, h('div.section-head', {}, h('h2', {}, title)), h('div.packs', {}, items));

function method(kind) {
  if (kind === 'juggle') {
    return h('details.card.method', { open: !drills().done.__seenJuggle },
      h('summary', {}, h('b', {}, 'Cómo funciona Repeat and Juggle')),
      h('ol.steps', {},
        h('li', {}, h('b', {}, 'Repeat: '), 'escuche una frase real y repítala exactamente igual, en voz alta.'),
        h('li', {}, h('b', {}, 'Juggle: '), 'cámbiele una sola pieza (una palabra, el tiempo o vuélvala pregunta) sin volver a pensar toda la frase.')),
      h('p.muted', {}, 'Así se aprende la gramática sintiendo cómo cambia la frase, no estudiando reglas.'),
      h('div.correction', {}, h('small', {}, 'Ejemplo'),
        exampleLine("I'm really into [cooking].", 'la frase'),
        exampleLine("I'm really into [hiking].", 'otra palabra'),
        exampleLine("I [used to be] really into cooking.", 'antes'),
        exampleLine("I['ve been] really into cooking lately.", 'últimamente')));
  }
  return h('details.card.method', { open: !drills().done.__seenSkeleton },
    h('summary', {}, h('b', {}, 'Cómo funciona Skeleton swapping')),
    h('p', {}, 'Toda frase útil tiene un ', h('b', {}, 'esqueleto'), ': las palabras fijas que la sostienen. Si se aprende el esqueleto, solo hay que cambiar el relleno para decir cientos de cosas sin pensar la gramática.'),
    h('ol.steps', {},
      h('li', {}, 'Escuche y repita la frase modelo.'),
      h('li', {}, 'Mire el esqueleto: los huesos no cambian; los huecos sí.'),
      h('li', {}, 'Diga en inglés las frases en español con el mismo esqueleto.'),
      h('li', {}, 'Invente las suyas: la IA las revisa.')),
    h('div.correction', {}, h('small', {}, 'Ejemplo'),
      frameView({ frame: "I've been meaning to {a} for {b}.", slots: { a: 'acción', b: 'tiempo' } }),
      exampleLine("I've been meaning to [call my grandma] for [weeks].", 'hace semanas que quiero llamar a mi abuela'),
      exampleLine("I've been meaning to [fix my bike] for [months].", 'hace meses que quiero arreglar mi bici')));
}
const exampleLine = (en, note) => h('div.example-line', {}, h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(en) }, '🔊'), marked(en), h('small.muted', {}, ' · ' + note));

// ---------------- Crear con la IA ----------------
function createCard(kind, back) {
  const inbox = drills().inbox;
  return h('div.card.create-drill', {},
    h('b', {}, kind === 'juggle' ? '✨ Su propio Repeat and Juggle' : '✨ Su propio esqueleto'),
    h('p.muted', {}, 'Escriba una frase en inglés (o una idea en español) y DeepSeek arma el ejercicio.'),
    inbox.length ? h('p.muted', {}, `Tiene ${inbox.length} ${inbox.length === 1 ? 'frase guardada' : 'frases guardadas'} desde sus charlas.`) : null,
    h('button.primary.wide', { onclick: () => openCreate(kind, back) }, '✨ Crear desde una frase'));
}

export function openCreate(kind, back, initial = '') {
  const s = store.get();
  const input = h('textarea.text-input', { rows: 3, placeholder: kind === 'juggle' ? 'Ej.: I love walking by the river.' : 'Ej.: Me da pereza levantarme temprano.' });
  input.value = initial;
  const fromChats = drills().inbox;
  const fromVocab = s.vocab.filter(v => !v.archived && D.plain(v.text).split(/\s+/).length >= 3).slice(0, 6).map(v => v.text);
  const picks = [...new Set([...fromChats, ...fromVocab])].slice(0, 8);
  const go = h('button.primary.wide', { onclick: () => create() }, kind === 'juggle' ? '🔁 Crear Repeat and Juggle' : '🧩 Crear esqueleto');
  const status = h('div');
  sheet(h('div', {},
    h('h3', {}, kind === 'juggle' ? '✨ Crear un Repeat and Juggle' : '✨ Crear un esqueleto'),
    input,
    picks.length ? h('div', {}, h('small.muted', {}, 'De sus charlas y su vocabulario:'),
      h('div.chips', {}, picks.map(t => h('button.chip', { onclick: () => { input.value = t; } }, t)))) : null,
    go, status));

  async function create() {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    if (!hasAI()) { toast('Para crear ejercicios necesita la clave de DeepSeek (Ajustes).', 'bad'); return; }
    go.disabled = true;
    fill(status, spinner('DeepSeek está armando el ejercicio…'));
    try {
      const st = store.get();
      const r = kind === 'juggle'
        ? await chatJson('juggle_create', P.juggleCreateMessages(text, st.rank), { temperature: 0.5, maxTokens: 900 })
        : await chatJson('skeleton_create', P.skeletonCreateMessages(text, st.rank, st.interests || []), { temperature: 0.5, maxTokens: 700 });
      const ok = kind === 'juggle' ? D.validJuggle(r) : D.validSkeleton(r);
      if (!ok) throw new Error('La IA devolvió un ejercicio incompleto. Intente con otra frase.');
      const item = { ...r, id: 'my-' + Date.now(), kind, mine: true, source: text, icon: '✨', title: r.title || 'Mi ejercicio' };
      if (kind === 'juggle') item.steps = r.steps.map((x, i) => ({ kind: i ? (x.kind || 'tense') : 'repeat', label: i ? (x.label || 'cambie una pieza') : 'repetir igual', en: x.en, es: x.es || '' }));
      saveDrills(d => { d.mine = [item, ...d.mine].slice(0, 60); d.inbox = d.inbox.filter(x => x !== text); });
      closeSheet();
      start(item, kind, back);
    } catch (e) {
      go.disabled = false;
      fill(status, h('p.bad', {}, e.message));
    }
  }
}

// ---------------- El ejercicio ----------------
function start(x, kind, back) {
  if (kind === 'juggle') {
    const base = x.steps[0];
    runDrill({ x, kind, back, steps: [
      { type: 'repeat', en: base.en, es: base.es, title: 'Repeat: escuche y repita igual' },
      ...x.steps.slice(1).map(st => ({ type: 'produce', en: st.en, es: st.es, label: st.label, title: `Juggle: ${st.label}` })),
      { type: 'free', title: 'Juggle libre: invente el suyo' },
    ] });
  } else {
    runDrill({ x, kind, back, steps: [
      { type: 'repeat', en: x.model.en, es: x.model.es, title: 'Escuche y repita el modelo' },
      ...x.swaps.map(sw => ({ type: 'produce', en: sw.en, es: sw.es, title: 'Cambie el relleno' })),
      { type: 'free', title: 'Ahora una frase suya' },
    ] });
  }
}

function runDrill({ x, kind, back, steps }) {
  const listener = new Listener();
  const base = kind === 'juggle' ? D.plain(x.steps[0].en) : '';
  let i = 0, more = false;
  const scores = {};   // paso → 1 (bien), 0.5 (casi), 0 (mal). Repetir un paso reemplaza su nota.
  const screen = h('div.screen.drill', {});
  const leave = () => { listener.abort?.(); stopSpeaking(); back(); };
  mount(screen);
  saveDrills(dd => { dd.done[kind === 'juggle' ? '__seenJuggle' : '__seenSkeleton'] = 1; });

  function header(step) {
    return [
      h('div.topbar', {}, h('button.icon', { 'aria-label': 'Salir', onclick: leave }, '✕'), h('h2', {}, x.title)),
      progressBar(i / steps.length),
      h('p.muted.drill-step', {}, `${i + 1} de ${steps.length} · ${step.title}`),
      kind === 'skeleton' ? frameView(x) : (i > 0 ? h('div.drill-base', {}, h('small.muted', {}, 'Frase base'), h('div', {}, marked(x.steps[0].en), ' ', h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(base) }, '🔊'))) : null),
    ];
  }

  function show() {
    stopSpeaking();
    if (i >= steps.length) return finish();
    const step = steps[i];
    fill(screen, ...header(step), ...(step.type === 'repeat' ? repeatStep(step) : answerStep(step)));
    if (step.type === 'repeat') say(step.en);
  }
  const next = () => { i++; show(); };

  // Paso Repeat: escuchar y repetir exactamente igual (sin IA: se compara con lo que entendió el teléfono).
  function repeatStep(step) {
    const result = h('div');
    const mic = h('button.primary', { onclick: () => listen() }, '🎤 Repetir');
    async function listen() {
      if (!canListen) { toast('Este navegador no reconoce voz: dígala en voz alta y siga.', 'bad'); return; }
      if (listener.active) { listener.stop(); return; }
      stopSpeaking();
      setText(mic, '⏹ Listo'); mic.classList.add('recording');
      fill(result, h('p.muted', {}, 'Escuchando…'));
      try {
        const { text } = await listener.start({ lang: store.get().settings.targetLang, onInterim: t => { fill(result, h('p.muted', {}, t || 'Escuchando…')); } });
        if (!text) { fill(result, h('p.muted', {}, 'No se escuchó nada. Intente otra vez.')); return; }
        const { states, score } = wordStates(D.plain(step.en), text);
        const v = verdict(score);
        buzz(v.cls === 'bad' ? 'bad' : 'good');
        const ws = D.plain(step.en).split(/\s+/);
        fill(result, h('p.sentence.words', {}, ws.map((w, k) => [h('span.pron-word', { class: states[k] || 'miss' }, w), ' '])),
          h('p', { class: v.cls }, v.label));
      } catch (e) { fill(result, h('p.bad', {}, e.message)); }
      finally { setText(mic, '🎤 Repetir'); mic.classList.remove('recording'); }
    }
    return [
      h('p.sentence', {}, marked(step.en)),
      h('p.muted', {}, D.plain(step.es)),
      h('div.row', {}, h('button', { onclick: () => say(step.en) }, '🔊 Escuchar'), h('button', { onclick: () => speak(D.plain(step.en), { rate: 0.65 }) }, '🐢 Despacio'), mic),
      result,
      h('button.primary.wide', { onclick: next }, 'Siguiente'),
    ];
  }

  // Paso con respuesta: guiado (frase en español → inglés) o libre (inventa su propio cambio).
  function answerStep(step) {
    const free = step.type === 'free';
    const result = h('div');
    const input = h('input.text-input', { placeholder: 'Dígalo con el micrófono o escríbalo aquí…', enterkeyhint: 'send', autocapitalize: 'sentences' });
    const mic = h('button.primary', { onclick: () => listen() }, '🎤 Decirlo');
    let done = false;
    const controls = h('div.drill-controls', {},
      h('div.row', {}, mic, h('button', { onclick: () => input.value.trim() && check(input.value.trim()) }, 'Comprobar')),
      input,
      free ? null : h('button.link', { onclick: () => reveal() }, 'Ver la respuesta'));
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) check(input.value.trim()); });

    async function listen() {
      if (!canListen) { toast('Este navegador no reconoce voz: escríbalo.', 'bad'); input.focus(); return; }
      if (listener.active) { listener.stop(); return; }
      stopSpeaking();
      setText(mic, '⏹ Listo'); mic.classList.add('recording');
      try {
        const { text } = await listener.start({ lang: store.get().settings.targetLang, onInterim: t => { input.value = t; } });
        if (text) { input.value = text; check(text); }
      } catch (e) { toast(e.message, 'bad'); }
      finally { setText(mic, '🎤 Decirlo'); mic.classList.remove('recording'); }
    }

    function reveal() {
      if (done) return;
      done = true; scores[i] = 0;
      controls.remove();
      fill(result, answerBox(step.en), h('p.muted', {}, 'Dígala en voz alta antes de seguir.'), nextBtn());
      say(step.en);
    }

    async function check(attempt) {
      if (done) return;
      const local = free ? null : D.localCheck(D.plain(step.en), attempt);
      let r = null;
      if (local?.result === 'exact') r = { verdict: 'correct', corrected: '', explanation: '' };
      else if (hasAI()) {
        fill(result, spinner('Revisando…'));
        try {
          r = await chatJson('drill_check', P.drillCheckMessages({ mode: kind, base, frame: x.frame, es: D.plain(step.es || ''), target: free ? '' : D.plain(step.en), attempt, rankId: store.get().rank }), { temperature: 0.2, maxTokens: 350 });
        } catch (e) { r = null; toast(e.message, 'bad'); }
      }
      if (!r) {
        if (free) {
          // Sin IA: al menos se revisa que use el esqueleto.
          r = kind === 'skeleton' && !D.keepsFrame(x.frame, attempt)
            ? { verdict: 'wrong', explanation: 'No se reconoció el esqueleto: use las mismas palabras fijas y cambie solo los huecos.' }
            : { verdict: 'unchecked' };
        } else r = { verdict: local.result === 'close' ? 'almost' : 'wrong' };
      }
      // Sin el esqueleto no puede estar «correcto», diga lo que diga la IA (sí puede ser «casi» si el teléfono se comió una palabra).
      if (kind === 'skeleton' && r.verdict === 'correct' && (r.kept === false || !D.keepsFrame(x.frame, attempt))) {
        r.verdict = 'almost';
        r.explanation = r.explanation || 'Le faltó usar el esqueleto: mantenga las palabras fijas y cambie solo los huecos.';
      }
      done = true;
      controls.remove();
      const pts = r.verdict === 'correct' ? 1 : r.verdict === 'almost' ? 0.5 : 0;
      if (r.verdict !== 'unchecked') scores[i] = pts;
      buzz(pts === 1 ? 'good' : pts ? 'tap' : 'bad');
      const head = { correct: ['good', '✅ ¡Correcto!'], almost: ['warn', '🙂 Casi'], wrong: ['bad', '❌ Todavía no'], unchecked: ['muted', 'Sin la IA no se puede revisar una frase libre: compárela con el ejemplo.'] }[r.verdict] || ['bad', '❌ Todavía no'];
      const target = free ? (r.corrected || r.natural || '') : step.en;
      fill(result, 
        h('p', { class: head[0] }, head[1]),
        h('p.muted', {}, `Usted dijo: «${attempt}»`),
        r.explanation ? h('p', {}, r.explanation) : null,
        target && (r.verdict !== 'correct' || !free) ? answerBox(target, free ? 'Así queda bien' : 'La respuesta') : null,
        r.natural && D.normalize(r.natural) !== D.normalize(target) && D.normalize(r.natural) !== D.normalize(attempt) ? answerBox(r.natural, 'Como lo diría un nativo') : null,
        r.verdict === 'wrong' ? h('button', { onclick: () => show() }, 'Intentar otra vez') : null,
        nextBtn());
      if (target) say(target);
    }

    const cue = free
      ? (kind === 'juggle'
        ? [h('p', {}, 'Cambie usted una pieza de la frase base: otra palabra, otro tiempo o vuélvala pregunta. Dígala en inglés.')]
        : [h('p', {}, 'Diga una frase sobre su vida con este esqueleto. Cambie solo los huecos.')])
      : [kind === 'juggle' ? h('p.drill-cue', {}, h('span.m-topic', {}, step.label)) : null,
        h('p.sentence.es', {}, marked(step.es)),
        h('p.muted', {}, kind === 'juggle' ? 'Dígalo en inglés cambiando solo la parte marcada.' : 'Dígalo en inglés con el mismo esqueleto.')];
    return [...cue, controls, result];
  }

  const nextBtn = () => h('button.primary.wide', { onclick: next }, i + 1 < steps.length ? 'Siguiente' : 'Ver resultado');
  const answerBox = (en, label = 'La respuesta') => h('div.correction.better', {}, h('small', {}, label), h('div', {}, marked(en)),
    h('button.tiny', { onclick: () => say(en) }, '🔊'));
  show();   // después de definir next/nextBtn/answerBox, que usa el primer paso

  // Al final: resultado, la frase va al repaso espaciado y, en esqueletos, se pueden pedir más cambios.
  function finish() {
    const vals = Object.values(scores), graded = vals.length, points = vals.reduce((a, b) => a + b, 0);
    const pct = graded ? Math.round((points / graded) * 100) : 100;
    const firstTime = !drills().done[x.id];
    saveDrills(dd => { dd.done[x.id] = (dd.done[x.id] || 0) + 1; });
    const keep = kind === 'juggle' ? { en: D.plain(x.steps[0].en), es: D.plain(x.steps[0].es) } : { en: x.model.en, es: x.model.es };
    const saved = firstTime && addVocab({ text: keep.en, translation: keep.es, type: 'Phrase', source: 'drill', context: kind === 'skeleton' ? D.fillFrame(x.frame, {}) : '' });
    buzz(pct >= 70 ? 'star' : 'tap');
    fill(screen, 
      h('div.topbar', {}, h('button.icon', { 'aria-label': 'Salir', onclick: leave }, '✕'), h('h2', {}, x.title)),
      progressBar(1, 'var(--good)'),
      h('div.card.center', {},
        h('h3', {}, pct >= 90 ? '🌟 ¡Excelente!' : pct >= 60 ? '💪 ¡Bien hecho!' : '🌱 Buen comienzo'),
        h('p', {}, graded ? `Acertó ${points % 1 ? points.toFixed(1) : points} de ${graded}.` : 'Terminó el ejercicio.'),
        saved ? h('p.muted', {}, '📒 La frase quedó en su vocabulario: volverá en el repaso espaciado.') : null),
      kind === 'skeleton' ? h('button.wide', { onclick: () => moreSwaps() }, '✨ 3 cambios nuevos con IA') : null,
      h('button.primary.wide', { onclick: () => start(x, kind, back) }, '🔁 Otra vez'),
      h('button.wide', { onclick: leave }, 'Volver al taller'));
  }

  // Skeleton: DeepSeek inventa 3 cambios nuevos (según sus intereses) y se practican al momento.
  async function moreSwaps() {
    if (more) return;
    if (!hasAI()) { toast('Para crear cambios nuevos necesita la clave de DeepSeek (Ajustes).', 'bad'); return; }
    more = true;
    screen.append(spinner('DeepSeek está creando cambios nuevos…'));
    try {
      const st = store.get();
      const r = await chatJson('skeleton_more', P.skeletonMoreMessages(x, st.rank, st.interests || [], x.swaps.map(s => s.en)), { temperature: 0.8, maxTokens: 500 });
      const swaps = (r.swaps || []).filter(s => s?.es && s?.en && D.keepsFrame(x.frame, s.en)).slice(0, 3);
      if (!swaps.length) throw new Error('No llegaron cambios que usen el esqueleto. Intente otra vez.');
      runDrill({ x, kind, back, steps: swaps.map(sw => ({ type: 'produce', en: sw.en, es: sw.es, title: 'Cambio nuevo' })) });
    } catch (e) { more = false; screen.querySelector('.loading')?.remove(); toast(e.message, 'bad'); }
  }
}
