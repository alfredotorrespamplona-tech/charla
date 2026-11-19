// Repaso personalizado con 3 tipos de tarjeta, de más fácil a más difícil (PersonalizedReviewCardFamily):
//  - «meaning»: elegir el significado de la palabra dentro de una frase (reconocer),
//  - «completion»: completar la frase,
//  - «recall»: decirlo en inglés a partir del español (hablando).
// El tipo depende de qué tan bien conoce la palabra. Las que falla vuelven al final una vez, con ayuda.
// Cuándo vuelve cada una lo decide el repaso espaciado (js/srs.js): solo salen las que tocan hoy.
// Las frases esenciales (js/phrases.js) tienen tarjetas propias, sin IA; las demás las prepara la IA.
import * as store from './store.js';
import * as scoring from './scoring.js';
import { chatJson } from './llm.js';
import * as P from './prompts.js';
import { h, mount, sheet, closeSheet, toast, spinner, progressBar, setText } from './ui.js';
import { speak, Listener, canListen, stopSpeaking } from './speech.js';
import { compareWords } from './pronounce.js';
import * as srs from './srs.js';
import { coreCard } from './phrases.js';

export const REVIEW_SIZE = 6;

// Tipo de tarjeta según la familiaridad: primero reconocer, luego completar, al final producir.
export function familyFor(score) {
  if (score < scoring.TIERS[1].min) return 'meaning';
  if (score < scoring.TIERS[2].min) return 'completion';
  return 'recall';
}

// Palabras que tocan hoy según el repaso espaciado (primero las más atrasadas).
// extra = practicar igual aunque esté al día: las que tocan más pronto.
export function pickItems(vocab, n = REVIEW_SIZE, { now = Date.now(), extra = false } = {}) {
  const list = extra
    ? vocab.filter(srs.isActive).sort((a, b) => srs.dueOf(a) - srs.dueOf(b))
    : srs.dueItems(vocab, now);
  return list.slice(0, n).map(v => ({ ...v, family: familyFor(v.score) }));
}

// Por qué no hay repaso (como CaughtUpReason): nada toca hoy, no hay material o hace falta más.
export function caughtUpReason(vocab) {
  const active = vocab.filter(srs.isActive);
  if (!active.length) return 'no-material';
  if (active.length < 3) return 'need-more';
  return 'nothing-due';
}

// Tarjetas que vienen bien formadas de la IA (las demás se descartan).
export function validCard(c) {
  if (!c || !c.answer) return false;
  if (c.family === 'meaning') return !!c.sentence && Array.isArray(c.options) && c.options.length >= 2;
  if (c.family === 'recall') return !!c.prompt;
  return !!c.sentence && c.sentence.split('{{gap}}').length === 2 && Array.isArray(c.options);
}

// ¿Lo que dijo usa la palabra repasada? (todas o casi todas sus palabras, en orden)
export function recallOk(item, said) {
  return compareWords(item, said).score >= 80;
}

const REPORT_REASONS = [
  ['wrong', 'La respuesta está mal'],
  ['several', 'Sirve más de una respuesta'],
  ['unnatural', 'La frase suena rara'],
  ['broken', 'La tarjeta está mal hecha'],
  ['unwanted', 'No quiero aprender esta palabra'],
];

export async function review({ home, only = null, extra = false, onDone = null }) {
  const s = store.get();
  const items = only
    ? s.vocab.filter(v => only.includes(v.id)).map(v => ({ ...v, family: familyFor(v.score) }))
    : pickItems(s.vocab, REVIEW_SIZE, { extra });
  // Al salir se corta el micrófono y la voz (si no, seguían escuchando con la pantalla ya cerrada).
  let liveListener = null;
  const exit = () => { liveListener?.abort(); stopSpeaking(); closeSheet(); home(); };
  const screen = h('div.screen.review', {}, h('div.topbar', {}, h('button.icon', { 'aria-label': 'Salir', onclick: exit }, '✕'), h('h2', {}, '🧠 Repaso')));
  mount(screen);
  if (!items.length) { screen.append(caughtUp(s, home)); return; }
  const body = h('div');
  screen.append(body);
  // Frases esenciales: tarjetas locales. Lo guardado de las charlas: tarjetas de la IA con su contexto.
  const local = items.filter(v => v.coreId).map(v => ({ ...coreCard(v, v.family), vocab: v })).filter(c => validCard(c));
  const forAi = items.filter(v => !v.coreId || !local.some(c => c.vocab.id === v.id));
  let cards = local;
  if (forAi.length) {
    body.append(spinner('Preparando su repaso personal…'));
    try {
      const made = (await chatJson('review', P.reviewMessages(forAi, s.rank), { temperature: 0.6, maxTokens: 1600 })).cards || [];
      const byText = t => forAi.find(v => v.text.toLowerCase() === (t || '').toLowerCase());
      cards = [...cards, ...made.filter(validCard).map(c => ({ ...c, vocab: byText(c.item) })).filter(c => c.vocab)];
    } catch (e) { if (!cards.length) { body.innerHTML = ''; body.append(h('p', {}, e.message)); return; } }
    body.innerHTML = '';
  }
  if (!cards.length) { body.append(h('p', {}, 'No se pudieron crear tarjetas. Intente otra vez.')); return; }
  // Mezcla para no repasar en el mismo orden en que se aprendieron.
  cards.sort(() => Math.random() - 0.5);

  const total = cards.length;
  const queue = [...cards];
  const stats = { correct: 0, answered: 0, removed: 0, retries: 0 };
  const scheduled = [];   // { text, due } para mostrar cuándo vuelve cada una
  let pos = 0;

  // Resultado de una tarjeta: sube o baja la familiaridad. Las falladas vuelven una vez al final, con ayuda.
  function record(card, outcome) {
    const v = card.vocab;
    const delta = outcome === 'right' ? (card.retry ? scoring.FAMILIARITY.reviewHint : scoring.FAMILIARITY.reviewCorrect)
      : outcome === 'hint' ? scoring.FAMILIARITY.reviewHint
        : outcome === 'self' ? scoring.FAMILIARITY.selfKnew
          : card.retry ? 0 : scoring.FAMILIARITY.reviewWrong;
    const u = delta ? scoring.bumpFamiliarity(v.id, delta) : null;
    // Solo la primera respuesta mueve la fecha; el segundo intento (con ayuda) es práctica.
    store.update(st => {
      const x = st.vocab.find(y => y.id === v.id);
      if (!x) return;
      x.lastReviewed = Date.now();
      if (!card.retry) {
        Object.assign(x, srs.schedule(x, outcome === 'self' ? 'right' : outcome));
        scheduled.push({ text: x.text, due: x.due });
      }
    });
    if (u?.tierUp) toast(`⭐ «${u.text}» ahora es ${scoring.tierFor(u.toScore).label}`, 'good');
    if (card.retry) stats.retries++;
    else {
      stats.answered++;
      if (outcome !== 'wrong') stats.correct++;
      else queue.push({ ...card, retry: true });
    }
  }

  function next() { pos++; show(); }

  function report(card) {
    sheet(h('div', {},
      h('h3', {}, '¿Qué tiene de malo?'),
      ...REPORT_REASONS.map(([key, label]) => h('button.option', {
        onclick: () => {
          closeSheet();
          if (key === 'unwanted') store.update(st => { const x = st.vocab.find(y => y.id === card.vocab.id); if (x) x.noReview = true; });
          if (!card.retry) stats.removed++;
          toast(key === 'unwanted' ? 'Esa palabra ya no saldrá en el repaso.' : 'Gracias: no volverá a ver esta tarjeta.');
          next();
        },
      }, label))));
  }

  function header(card, title) {
    return [
      progressBar(Math.min(pos, total) / total),
      h('div.review-head', {},
        h('p.muted', {}, card.retry ? '🔁 Un intento más, con ayuda' : `${pos + 1} de ${total} · ${title}`),
        h('button.link', { title: 'Reportar esta tarjeta', onclick: () => report(card) }, '🚩')),
    ];
  }

  function continueBtn() { return h('button.primary', { onclick: next }, 'Continuar'); }

  // --- Elegir opción (significado o completar) ---
  function choiceCard(card) {
    const meaning = card.family === 'meaning';
    const result = h('div');
    const hint = h('p.muted' + (card.retry ? '' : '.hidden'), {}, '💡 ' + (card.hint || card.translation || ''));
    let hintUsed = !!card.retry;
    let sentence;
    if (meaning) {
      // La frase con la palabra resaltada.
      const i = card.sentence.toLowerCase().indexOf(card.item.toLowerCase());
      sentence = i >= 0
        ? h('p.sentence', {}, card.sentence.slice(0, i), h('mark', {}, card.sentence.slice(i, i + card.item.length)), card.sentence.slice(i + card.item.length))
        : h('p.sentence', {}, card.sentence, ' ', h('mark', {}, card.item));
    } else {
      const [pre, post] = card.sentence.split('{{gap}}');
      sentence = h('p.sentence', {}, pre, h('span.gap', {}, '_____'), post);
    }
    const full = meaning ? card.sentence : card.sentence.replace('{{gap}}', card.answer);
    const opts = [...new Set([card.answer, ...(card.options || [])])].slice(0, 4).sort(() => Math.random() - 0.5);
    const optBox = h('div.options', {}, opts.map(o => h('button.option', {
      onclick: e => {
        [...optBox.children].forEach(b => { b.disabled = true; if (b.textContent === card.answer) b.classList.add('right'); });
        const ok = o === card.answer;
        if (!ok) e.currentTarget.classList.add('wrong');
        const gap = sentence.querySelector('.gap');
        if (gap) { gap.textContent = card.answer; gap.classList.add(ok ? 'right' : 'wrong'); }
        record(card, ok ? (hintUsed ? 'hint' : 'right') : 'wrong');
        result.append(h('p', { class: ok ? 'good' : 'bad' }, ok ? '¡Correcto!' : 'Todavía no. La respuesta era: ' + card.answer),
          card.translation ? h('p.muted', {}, card.translation) : null,
          !ok && !card.retry ? h('p.muted', {}, 'Volverá al final para un intento más con ayuda.') : null,
          continueBtn());
        speak(full, { rate: 0.9 });
      },
    }, o)));
    return [
      ...header(card, meaning ? 'Elija el significado' : 'Complete la frase'),
      meaning ? h('p.muted', {}, card.core ? (card.origin || 'Frase esencial') : 'De sus conversaciones') : null,
      sentence,
      h('div.row', {}, h('button.tiny', { onclick: () => speak(meaning ? card.sentence : card.sentence.replace('{{gap}}', '…'), { rate: 0.9 }) }, '🔊 Escuchar')),
      optBox,
      card.retry || !(card.hint || card.translation) ? null : h('button.link', { onclick: e => { hintUsed = true; hint.classList.remove('hidden'); e.currentTarget.remove(); } }, 'Ver pista'),
      hint, result,
    ];
  }

  // --- Decirlo en inglés (hablando o escribiendo) ---
  function recallCard(card) {
    const result = h('div');
    const heard = h('p.muted', {}, '');
    const input = h('input.text-input', { placeholder: 'O escríbalo en inglés…', enterkeyhint: 'send' });
    const hint = h('p.muted' + (card.retry ? '' : '.hidden'), {}, '💡 ' + (card.hint || ''));
    let hintUsed = !!card.retry, done = false;
    const listener = new Listener();
    liveListener = listener;
    const mic = h('button.primary', { onclick: () => listen() }, '🎤 Decirlo');

    function check(said) {
      if (done || !screen.isConnected) return;
      done = true;
      listener.abort();
      const ok = recallOk(card.item, said);
      const outcome = ok ? (hintUsed ? 'hint' : 'right') : 'wrong';
      controls.remove();
      result.append(
        h('p', { class: ok ? 'good' : 'bad' }, ok ? `¡Bien! Usó «${card.item}».` : `No se escuchó «${card.item}».`),
        said ? h('p.muted', {}, 'Usted dijo: «' + said + '»') : null,
        h('div.correction.better', {}, h('small', {}, 'Una forma de decirlo'), h('div', {}, card.answer),
          h('button.tiny', { onclick: () => speak(card.answer, { rate: 0.85 }) }, '🔊')),
      );
      speak(card.answer, { rate: 0.85 });
      if (ok) { record(card, outcome); result.append(continueBtn()); return; }
      // El teléfono a veces entiende mal: puede decir que sí lo sabía.
      result.append(h('div.row', {},
        h('button', { onclick: () => { record(card, 'self'); next(); } }, '✅ Lo tenía bien'),
        h('button.primary', { onclick: () => { record(card, 'wrong'); next(); } }, card.retry ? 'Continuar' : 'Todavía no')));
    }

    async function listen() {
      if (!canListen) { toast('Este navegador no reconoce voz: escríbalo.', 'bad'); input.focus(); return; }
      if (listener.active) { listener.stop(); return; }
      stopSpeaking();
      setText(mic, '⏹ Listo');
      mic.classList.add('recording');
      heard.textContent = 'Escuchando…';
      try {
        const { text } = await listener.start({ lang: store.get().settings.targetLang, onInterim: t => { heard.textContent = t || 'Escuchando…'; } });
        heard.textContent = '';
        if (text) check(text); else heard.textContent = 'No se escuchó nada. Intente otra vez.';
      } catch (e) { heard.textContent = e.message; }
      finally { setText(mic, '🎤 Decirlo'); mic.classList.remove('recording'); }
    }

    input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) check(input.value.trim()); });
    const controls = h('div', {},
      h('div.row', {}, mic,
        h('button', { onclick: () => input.value.trim() && check(input.value.trim()) }, 'Enviar'),
        card.retry ? null : h('button.link', { onclick: e => { hintUsed = true; hint.classList.remove('hidden'); e.currentTarget.remove(); } }, 'Ver pista'),
        h('button.link', { onclick: () => check('') }, 'Revelar')),
      input, heard);
    return [
      ...header(card, 'Dígalo en inglés'),
      h('p.sentence', {}, card.prompt),
      card.core ? null : h('p.muted', {}, `Use «${card.item}».`),
      hint, controls, result,
    ];
  }

  function show() {
    closeSheet();
    body.innerHTML = '';
    if (pos >= queue.length) return finish();
    const card = queue[pos];
    if (pos === total && card.retry) toast('Ahora, un intento más con las que falló.');
    body.append(...(card.family === 'recall' ? recallCard(card) : choiceCard(card)).filter(Boolean));
  }

  function finish() {
    const counts = stats.answered >= 2 && stats.correct >= Math.ceil(stats.answered / 2);
    if (counts) scoring.updateStreak();
    body.append(
      h('h2', {}, 'Repaso terminado'),
      h('div.stats', {},
        h('div.stat', {}, h('b', {}, `${stats.correct}/${stats.answered}`), h('small', {}, 'correctas')),
        stats.retries ? h('div.stat', {}, h('b', {}, stats.retries), h('small', {}, 'segundos intentos')) : null,
        stats.removed ? h('div.stat', {}, h('b', {}, stats.removed), h('small', {}, 'quitadas')) : null),
      h('p', {}, counts ? `🔥 Hoy cuenta para su racha (${store.get().streak.count} ${store.get().streak.count === 1 ? 'día' : 'días'}).` : 'Este repaso no cuenta para la racha: acierte al menos la mitad.'),
      scheduledList(scheduled),
      onDone ? h('div.row', {}, h('button.primary', { onclick: onDone }, 'Continuar'))
        : h('div.row', {},
          srs.dueCount(store.get().vocab) ? h('button.primary', { onclick: () => review({ home }) }, `Seguir (${srs.dueCount(store.get().vocab)} más)`) : null,
          h('button', { onclick: home }, 'Inicio')));
  }
  show();
}

// Cuándo vuelve cada tarjeta respondida (así se ve el método: lo que acierta se aleja).
function scheduledList(list) {
  if (!list.length) return null;
  return h('div.card.schedule', {},
    h('h3', {}, '📅 Cuándo vuelven'),
    h('ul.schedule-list', {}, list.map(x => h('li', {}, h('span', {}, x.text), h('b', {}, srs.whenLabel(x.due))))));
}

// Está al día (o no hay material): explica por qué y ofrece qué hacer.
function caughtUp(s, home) {
  const reason = caughtUpReason(s.vocab);
  const next = srs.nextDue(s.vocab);
  const learn = h('button.primary', { onclick: () => import('./essentials.js').then(m => m.essentials({ home })) }, '📚 Aprender frases esenciales');
  if (reason === 'no-material') return h('div.card', {},
    h('h3', {}, 'Todavía no hay nada que repasar'),
    h('p', {}, 'Empiece con las frases esenciales del inglés, o toque cualquier palabra de un personaje y pulse «Guardar».'),
    learn);
  return h('div.card', {},
    h('h3', {}, '✅ Está al día'),
    h('p', {}, next ? `Próximo repaso: ${srs.whenLabel(next.at)} (${next.count} ${next.count === 1 ? 'tarjeta' : 'tarjetas'}). Repasar antes de tiempo ayuda poco: lo que más fija es recordar justo cuando empieza a olvidarse.` : 'No hay repasos pendientes.'),
    reason === 'need-more' ? h('p.muted', {}, 'Tiene pocas palabras guardadas: aprenda frases esenciales para tener más repaso.') : null,
    h('div.row', {}, learn, h('button', { onclick: () => review({ home, extra: true }) }, 'Practicar igual')));
}
