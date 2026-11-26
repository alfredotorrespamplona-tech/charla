// Pantallas para prepararse para una oferta concreta (lógica en oferta.js): pegar el aviso, practicar sus
// preguntas, hacer el simulacro de esa oferta y «Mi guion» para repasar la noche antes.
import * as store from './store.js';
import { chatJson, hasAI } from './llm.js';
import * as P from './prompts.js';
import { h, mount, toast, spinner, setText } from './ui.js';
import { speak, stopSpeaking } from './speech.js';
import { addVocab } from './words.js';
import { runResponder } from './tecnicasscreen.js';
import { runMock } from './entrevistascreen.js';
import * as O from './oferta.js';

const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
const topbar = (title, onBack) => h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: onBack }, '←'), h('h2', {}, title));
const say = (t, rate = 0.9) => speak(t, { rate });
const listen = t => h('button.tiny', { 'aria-label': 'Escuchar', onclick: () => say(t) }, '🔊');
const offers = () => store.get().ofertas;
const offerById = id => offers().find(o => o.id === id) || null;
const saveOffer = o => store.update(s => { s.ofertas = s.ofertas.map(x => (x.id === o.id ? o : x)); });
const dateEs = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }); };

// Lista de ofertas y formulario para pegar una nueva.
export function ofertasScreen({ home }) {
  stopSpeaking();
  const self = () => ofertasScreen({ home });
  const list = offers();
  const ad = h('textarea.offer-ad', { rows: '8', placeholder: 'Pegue aquí el aviso de trabajo completo (en inglés o en español): el puesto, las tareas, lo que piden…', spellcheck: 'false' });
  const role = h('input', { placeholder: 'Puesto (opcional, si el aviso no lo dice claro)', autocomplete: 'off' });
  const date = h('input', { type: 'date' });
  const result = h('div', {});
  const go = h('button.primary.wide', { disabled: hasAI() ? null : true, onclick: async () => {
    const text = ad.value.trim();
    if (text.length < O.MIN_AD) { toast('Pegue el aviso completo: así las preguntas salen de ese trabajo.', 'bad'); return; }
    go.disabled = true;
    fill(result, spinner('Leyendo el aviso y armando sus preguntas…'));
    try {
      const r = await chatJson('offer', P.offerMessages({ ad: text, role: role.value.trim(), rankId: store.get().rank }), { temperature: 0.5, maxTokens: 6000 });
      const o = O.cleanOffer(r, { ad: text, role: role.value.trim(), date: date.value });
      if (!O.isUsable(o)) throw new Error('La IA no devolvió suficientes preguntas. Intente otra vez.');
      store.update(s => { s.ofertas = [o, ...s.ofertas].slice(0, O.MAX_OFFERS); });
      offerScreen(o.id, self);
    } catch (e) { fill(result, h('p.bad', {}, e.message)); go.disabled = false; }
  } }, '📄 Preparar esta oferta');
  mount(h('div.screen.oferta', {},
    topbar('📄 Su oferta de trabajo', home),
    h('div.card', {},
      h('p', {}, 'Pegue el aviso del trabajo al que se presenta. La IA lee lo que piden y le arma las preguntas que probablemente le harán, con cómo empezar cada respuesta y un ejemplo, las palabras de ese trabajo y 3 preguntas para hacerles a ellos.'),
      h('p.muted', {}, 'Después las practica, hace un simulacro con esas preguntas y arma «Mi guion» para repasar la noche antes.'),
      ad, role,
      h('label.offer-date', {}, 'Fecha de la entrevista (si ya la sabe)', date),
      go,
      hasAI() ? null : h('p.muted', {}, 'Necesita su clave de IA (Groq gratis o DeepSeek) en Ajustes.'),
      result),
    list.length ? [h('div.section-head', {}, h('h2', {}, `Sus ofertas (${list.length})`)),
      h('div.packs', {}, list.map(o => {
        const n = O.daysLeft(o);
        const sc = O.script(o);
        return h('button.pack', { onclick: () => offerScreen(o.id, self) },
          h('span.pack-icon', {}, '💼'),
          h('span.pack-body', {}, h('span.pack-name', {}, o.role || 'Oferta'), h('small.muted', {}, [o.company, n != null ? `entrevista ${O.daysText(n)}` : ''].filter(Boolean).join(' · ') || `${o.questions.length} preguntas`)),
          h('small.muted', {}, `${sc.ready}/${sc.total}`));
      }))] : null));
}

// Una oferta: resumen, fecha, y lo que se puede hacer con ella.
export function offerScreen(id, back) {
  stopSpeaking();
  const o = offerById(id);
  if (!o) { back(); return; }
  const self = () => offerScreen(id, back);
  const n = O.daysLeft(o);
  const sc = O.script(o, store.get().tecnicas.islas);
  const date = h('input', { type: 'date', value: o.date || '', onchange: e => { saveOffer({ ...offerById(id), date: e.currentTarget.value }); self(); } });
  const practice = () => runResponder(o.questions, self, {
    title: `🎯 ${o.role || 'Su oferta'}`,
    again: practice,
    onAnswer: (item, text, c) => { store.logActivity('offer'); saveOffer(O.withAnswer(offerById(id), item.id, { said: text, score: c.score })); },
    onVersion: (item, version) => saveOffer(O.withAnswer(offerById(id), item.id, { en: version.map(v => v.en).join(' '), es: version.map(v => v.es).join(' '), from: 'responder' })),
  });
  const mock = () => runMock({ home: self, questions: O.mockQuestions(o), role: o.role, onReport: ({ qa, report }) => {
    let cur = offerById(id);
    for (const a of report?.answers || []) {
      const x = qa[Number(a.i) - 1];
      const q = x && O.questionByText(cur, x.q.en);
      if (q && a.better_en) cur = O.withAnswer(cur, q.id, { en: a.better_en, es: a.better_es || '', from: 'simulacro' });
    }
    for (const x of qa) { const q = O.questionByText(cur, x.q.en); if (q && x.text) cur = O.withAnswer(cur, q.id, { said: x.text, score: 0.5 }); }
    saveOffer(cur);
  } });
  mount(h('div.screen.oferta', {},
    topbar(`💼 ${o.role || 'Su oferta'}`, back),
    h('div.card', {},
      o.company ? h('b', {}, o.company) : null,
      o.summary ? h('p', {}, o.summary) : null,
      h('label.offer-date', {}, n != null ? `📅 Entrevista: ${dateEs(o.date)} (${O.daysText(n)})` : '📅 ¿Cuándo es la entrevista?', date),
      h('p.muted', {}, `Respuestas listas: ${sc.ready} de ${sc.total}. Las que no practicó salen en su guion con el ejemplo.`)),
    h('div.offer-actions', {},
      h('button.primary.wide', { onclick: practice }, `🎯 Practicar sus ${o.questions.length} preguntas`),
      h('button.wide', { onclick: mock }, `💼 Simulacro de esta oferta (${O.mockQuestions(o).length} preguntas)`),
      h('button.wide', { onclick: () => guionScreen(id, self) }, '📜 Mi guion')),
    h('div.card', {}, h('b', {}, '❓ Lo que le van a preguntar'),
      o.questions.map(q => h('div.offer-q', {},
        h('p', {}, listen(q.q), ' ', h('b', {}, q.q), h('br'), h('small.muted', {}, q.es)),
        q.why ? h('small.muted', {}, `💡 ${q.why}`) : null,
        o.answers?.[q.id]?.en ? h('small.good', {}, ' ✓ respuesta lista') : null))),
    o.words.length ? h('div.card', {}, h('b', {}, '📖 Palabras de este trabajo'),
      o.words.map(w => h('p', {}, listen(w.en), ' ', h('b', {}, w.en), ` · ${w.es}`, w.example ? [h('br'), h('small.muted', {}, w.example)] : null)),
      h('button.small', { onclick: e => {
        let k = 0;
        for (const w of o.words) if (addVocab({ text: w.en, translation: w.es, type: 'Word', source: 'oferta', context: w.example })) k++;
        toast(k ? `${k} palabras en su repaso` : 'Ya estaban en su repaso');
        e.currentTarget.disabled = true;
      } }, '📒 Llevarlas a mi repaso')) : null,
    o.ask.length ? h('div.card', {}, h('b', {}, '🙋 Para preguntarles a ellos al final'),
      o.ask.map(a => h('p', {}, listen(a.en), ' ', a.en, h('br'), h('small.muted', {}, a.es)))) : null,
    o.ad ? h('details.card', {}, h('summary', {}, 'Ver el aviso'), h('p.offer-adtext', {}, o.ad)) : null,
    h('button.link', { onclick: () => {
      if (!confirm('¿Borrar esta oferta y sus respuestas?')) return;
      store.update(s => { s.ofertas = s.ofertas.filter(x => x.id !== id); });
      back();
    } }, '🗑 Borrar esta oferta')));
}

// «Mi guion»: para leer en voz alta la noche antes. No se memoriza palabra por palabra: son sus ideas.
export function guionScreen(id, back) {
  stopSpeaking();
  const o = offerById(id);
  if (!o) { back(); return; }
  store.logActivity('offer');
  const sc = O.script(o, store.get().tecnicas.islas);
  const n = O.daysLeft(o);
  const status = h('small.muted', {}, '');
  const copy = async () => {
    const text = O.scriptText(o, sc);
    try {
      if (navigator.share) { await navigator.share({ title: 'Mi guion', text }); return; }
      await navigator.clipboard.writeText(text); setText(status, 'Copiado.');
    } catch (e) { if (e?.name !== 'AbortError') setText(status, 'No se pudo copiar en este navegador.'); }
  };
  const KIND = { mejorada: '✨ Su respuesta mejorada', suya: '🗣 Lo que usted dijo', ejemplo: '📝 Ejemplo: cámbielo por su historia' };
  mount(h('div.screen.oferta.guion', {},
    topbar('📜 Mi guion', back),
    h('div.card', {},
      h('b', {}, `${o.role || 'Su entrevista'}${o.company ? ` · ${o.company}` : ''}`),
      n != null ? h('p', {}, `📅 ${dateEs(o.date)} (${O.daysText(n)})`) : null,
      h('p.muted', {}, 'Léalo en voz alta una o dos veces. No lo memorice palabra por palabra: son sus ideas, y en la entrevista las dirá con sus palabras.'),
      h('p.muted', {}, `${sc.ready} de ${sc.total} respuestas son suyas.${sc.ready < sc.total ? ' Practique las demás para cambiar los ejemplos por sus historias.' : ''}`),
      h('div.row.no-print', {}, h('button.small', { onclick: copy }, '📋 Copiar o enviar'), h('button.small', { onclick: () => window.print() }, 'Imprimir'), status)),
    sc.items.map(it => h('div.card.guion-item', { class: it.kind },
      h('p', {}, listen(it.q), ' ', h('b', {}, it.q), h('br'), h('small.muted', {}, it.qEs)),
      h('small.guion-kind', {}, KIND[it.kind]),
      h('p.guion-answer', {}, listen(it.en), ' ', it.en),
      it.es ? h('small.muted', {}, it.es) : null)),
    sc.stories.length ? h('div.card', {}, h('b', {}, '🏝 Sus historias'), sc.stories.map(s => h('p', {}, listen(s.en), ' ', s.en, h('br'), h('small.muted', {}, s.es)))) : null,
    sc.words.length ? h('div.card', {}, h('b', {}, '📖 Palabras del puesto'), h('p', {}, sc.words.map(w => `${w.en} (${w.es})`).join(' · '))) : null,
    sc.ask.length ? h('div.card', {}, h('b', {}, '🙋 Sus preguntas para ellos'), sc.ask.map(a => h('p', {}, listen(a.en), ' ', a.en, h('br'), h('small.muted', {}, a.es)))) : null,
    h('div.card', {}, h('b', {}, '💡 Si no entiende o necesita pensar'),
      [["I'm sorry, could you repeat the question?", 'Perdón, ¿podría repetir la pregunta?'],
        ['Just to clarify, are you asking about…?', 'Solo para aclarar: ¿me pregunta por…?'],
        ["That's a great question. Let me think for a moment.", 'Muy buena pregunta. Déjeme pensar un momento.']]
        .map(([en, es]) => h('p', {}, listen(en), ' ', en, h('br'), h('small.muted', {}, es))))));
}
