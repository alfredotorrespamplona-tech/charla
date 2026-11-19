// Contenido por nivel: todo lo que se estudia en cada nivel (A1…C2) en un solo lugar: el temario completo de
// gramática con su examen, los rompecabezas de verbos, frases, vocabulario y temas para charlar.
// No hay candados: se puede mirar y estudiar cualquier nivel.
import * as store from './store.js';
import { RANKS, rankById } from './data.js';
import { h, mount, progressBar, toast } from './ui.js';
import * as G from './grammar.js';
import { PACKS, packProgress, learnedIds } from './phrases.js';
import { TOPICS } from './topics.js';
import { openLesson } from './grammarscreen.js';
import { studyPack } from './essentials.js';
import { milScreen, milOf } from './milscreen.js';
import * as scoring from './scoring.js';
import * as T from './temario.js';
import { topicScreen, levelExam } from './temarioscreen.js';

// Las 1000 palabras más usadas, repartidas por nivel (el mismo reparto de los paquetes del cerebro).
export const MIL_RANGES = { A1: [1, 300], A2: [301, 600], B1: [601, 1000] };
const TOPICS_SHOWN = 8;

// Lo que trae un nivel. Sin pantalla: se prueba con node.
export function levelContent(rankId) {
  const r = rankById(rankId);
  return {
    rank: r,
    temario: T.levelTopics(r.code),
    lessons: G.LESSONS.filter(l => l.rank === r.id),
    phrases: PACKS.filter(p => p.level === r.code && (p.group === 'charla' || (p.group === 'cerebro' && p.id !== 'err'))),
    words: PACKS.filter(p => p.level === r.code && p.group === 'nivel'),
    mil: MIL_RANGES[r.code] || null,
    topics: TOPICS.filter(t => t.rankRequired === r.id),
  };
}

// Palabras de un tramo de Mil palabras que ya vio y que ya sabe (repaso de 1 día o más).
export function milRangeProgress(m, [from, to]) {
  let seen = 0, learned = 0;
  for (let id = from; id <= to; id++) {
    const x = m?.cards?.[id];
    if (x) { seen++; if (x.ivl >= 1) learned++; }
  }
  return { seen, learned, total: to - from + 1 };
}

// startTopic(tema o misión, nivel): la abre app.js (necesita el lugar, el personaje y el resumen de la charla);
// al salir de la charla se vuelve a este mismo nivel. También la usan las charlas de práctica del temario.
export function levelStudy({ home, rank = store.get().rank, startTopic }) {
  const s = store.get();
  const c = levelContent(rank);
  const r = c.rank;
  const open = id => levelStudy({ home, rank: id, startTopic });
  const back = () => open(r.id);
  const best = s.grammar?.best || {};
  const done = learnedIds(s.vocab);
  const bar = (n, total) => progressBar(total ? n / total : 0, total && n === total ? 'var(--good)' : '');
  const chat = mission => startTopic?.(mission, r.id);
  const tp = T.levelProgress(r.code, s.temario);

  const section = (title, items, cls = 'packs') => items.length
    ? h('div', {}, h('div.section-head', {}, h('h2', {}, title)), h(`div.${cls}`, {}, items))
    : null;
  const grammarTopicBtn = t => {
    const pct = s.temario?.best?.[t.id];
    return h('button.pack', { onclick: () => topicScreen(t, { back, startChat: chat }) },
      h('span.pack-icon', {}, t.icon),
      h('span.pack-body', {}, h('span.pack-name', {}, t.title), h('small.muted', {}, t.ex[0][0])),
      h('small', { class: pct >= T.PASS ? 'good' : 'muted' }, pct != null ? `${pct >= T.PASS ? '✓ ' : ''}${Math.round(pct * 100)} %` : ''));
  };
  const lessonBtn = l => {
    const pct = best[l.id];
    return h('button.pack', { onclick: () => openLesson(l, back) },
      h('span.pack-icon', {}, l.icon),
      h('span.pack-body', {}, h('span.pack-name', {}, l.title),
        h('small.muted', {}, l.table.slice(0, 2).map(([es, en]) => `${es} → ${en}`).join(' · '))),
      h('small', { class: pct >= G.PASS ? 'good' : 'muted' }, pct != null ? `${pct >= G.PASS ? '✓ ' : ''}${Math.round(pct * 100)} %` : ''));
  };
  const packBtn = p => {
    const pr = packProgress(p, s.vocab, done);
    return h('button.pack', { onclick: () => studyPack(p, { home, after: back }), 'aria-label': `${p.name}, ${pr.learned} de ${pr.total}` },
      h('span.pack-icon', {}, p.icon),
      h('span.pack-body', {}, h('span.pack-name', {}, p.name), bar(pr.learned, pr.total)),
      h('small.muted', {}, `${pr.learned}/${pr.total}`));
  };
  const milBtn = range => {
    const pr = milRangeProgress(milOf(s), range);
    return h('button.pack', { onclick: () => milScreen({ home: back }) },
      h('span.pack-icon', {}, '📇'),
      h('span.pack-body', {}, h('span.pack-name', {}, `Mil palabras: de la ${range[0]} a la ${range[1]}`), bar(pr.learned, pr.total)),
      h('small.muted', {}, `${pr.learned}/${pr.total}`));
  };
  const topicBtn = t => h('button.mission', { onclick: () => startTopic?.(t, r.id) },
    h('span.m-icon', {}, t.icon),
    h('div', {}, h('b', {}, t.name), h('div.muted', {}, t.description)));
  // A1 tiene muchos temas: se muestran 8 y el resto a pedido.
  const topicItems = c.topics.map(topicBtn);
  const topics = section('🗣 Temas para charlar', topicItems.slice(0, TOPICS_SHOWN), 'missions');
  const moreTopics = topicItems.length > TOPICS_SHOWN ? h('button.small.more-topics', {
    onclick: e => { topics.querySelector('.missions').append(...topicItems.slice(TOPICS_SHOWN)); e.currentTarget.remove(); },
  }, `Ver los ${topicItems.length} temas`) : null;

  mount(h('div.screen.level-study', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: home }, '←'), h('h2', {}, '🎓 Contenido por nivel')),
    h('div.level-chips', { role: 'tablist', 'aria-label': 'Nivel' }, RANKS.map(x => h('button.chip', {
      class: x.id === r.id ? 'sel' : '', role: 'tab', 'aria-selected': String(x.id === r.id), onclick: () => open(x.id),
    }, x.code))),
    h('div.card.level-head', {},
      h('div.level-title', {}, h('b', {}, `${r.code} · ${r.name}`), r.id === s.rank ? h('small.chip.sel', {}, 'su nivel') : null),
      h('p.muted', {}, 'Con este nivel puede:'),
      h('ul.can-do', {}, r.canDo.map(x => h('li', {}, x))),
      h('div.level-progress', {},
        h('small', {}, `Gramática: ${tp.passed} de ${tp.total} temas aprobados${tp.exam != null ? ` · examen: ${Math.round(tp.exam * 100)} %` : ''}`),
        bar(tp.passed, tp.total)),
      h('button.primary.small', { onclick: () => levelExam(r.code, { back, startChat: chat }) }, `📝 Examen de ${r.code}`), ' ',
      r.id === s.rank ? null : h('button.small', {
        onclick: () => { scoring.setLevel(r.id); toast(`Ahora sus charlas son de nivel ${r.code}`, 'good'); back(); },
      }, `Charlar en nivel ${r.code}`)),
    section(`📖 Temario de gramática (${c.temario.length} temas)`, c.temario.map(grammarTopicBtn)),
    h('p.muted', {}, 'Cada tema trae: qué es en español, cómo se dice en inglés, ejemplos con audio, errores típicos, práctica y una charla para usarlo.'),
    section('🧩 Rompecabezas de verbos', c.lessons.map(lessonBtn)),
    section('💬 Frases', c.phrases.map(packBtn)),
    section('📇 Vocabulario', [c.mil ? milBtn(c.mil) : null, ...c.words.map(packBtn)].filter(Boolean)),
    c.mil ? h('p.muted', {}, 'Mil palabras las presenta en orden, de la más usada a la menos usada, con repaso como en Anki.') : null,
    topics, moreTopics,
    h('p.muted.center', {}, 'Todo está abierto: puede estudiar cualquier nivel, no solo el suyo.')));
}
