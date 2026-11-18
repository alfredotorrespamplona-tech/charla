// Frases esenciales: aprender las expresiones más usadas en 3 pasos.
//  1. Escuchar y repetir en voz alta (shadowing): se aprende la frase entera, con su sonido.
//  2. Recordarla enseguida sin mirar (recuperación activa): las tarjetas del repaso, con estas frases.
//  3. Repaso espaciado: vuelven mañana, en 3 días, en una semana… (js/srs.js).
import * as store from './store.js';
import { PACKS, GROUPS, nextPhrases, packProgress, recommendedPack, toVocab, learnedIds } from './phrases.js';
import { h, mount, toast, progressBar } from './ui.js';
import { speak, stopSpeaking } from './speech.js';
import { practicePronunciation } from './pronounce.js';
import { review } from './review.js';
import { rankById } from './data.js';

export const BATCH = 5;          // frases por tanda
export const NEW_PER_DAY = 10;   // más que esto en un día se olvida antes de repasarlo

// Cuántas frases nuevas aprendió hoy (para no pasarse del límite diario).
export function learnedToday(vocab, now = Date.now()) {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return vocab.filter(v => v.source === 'core' && (v.createdAt || 0) >= start).length;
}

export function essentials({ home }) {
  const s = store.get();
  const code = rankById(s.rank).code;
  const rec = recommendedPack(s.vocab, code);
  const today = learnedToday(s.vocab);
  const left = Math.max(0, NEW_PER_DAY - today);
  const done = learnedIds(s.vocab);

  const start = pack => {
    if (!left) { toast(`Ya aprendió ${today} frases hoy. Mañana, después del repaso, siguen las nuevas.`); return; }
    const list = nextPhrases(pack.id, store.get().vocab, Math.min(BATCH, left));
    if (!list.length) { toast('Ya aprendió todas las frases de este paquete.'); return; }
    learn(pack, list, { home });
  };

  mount(h('div.screen.essentials', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: home }, '←'), h('h2', {}, '📚 Frases esenciales')),
    h('div.card.method', {},
      h('p', {}, 'Las frases que más se usan al hablar inglés, y las de su cerebro de inglés. Se aprenden enteras, como bloques, en tres pasos:'),
      h('ol.steps', {},
        h('li', {}, h('b', {}, 'Escuchar y repetir'), ' en voz alta, imitando el sonido.'),
        h('li', {}, h('b', {}, 'Recordarlas'), ' enseguida sin mirar.'),
        h('li', {}, h('b', {}, 'Repasarlas'), ' justo antes de olvidarlas: mañana, en 3 días, en una semana…')),
      rec
        ? h('button.primary.wide', { onclick: () => start(rec) }, left ? `Aprender ${Math.min(BATCH, left)} frases: ${rec.name}` : 'Por hoy ya está')
        : h('p.good', {}, '¡Aprendió todas las frases esenciales!'),
      h('p.muted.center', {}, left ? `Hoy: ${today} de ${NEW_PER_DAY} frases nuevas` : `Hoy aprendió ${today} frases. Mañana siguen las nuevas.`)),
    ...GROUPS.map(g => packList(g, s.vocab, done, start))));
}

// Una sección de paquetes con su progreso.
function packList(group, vocab, done, start) {
  const packs = PACKS.filter(p => p.group === group.id);
  if (!packs.length) return null;
  return h('div', {},
    h('div.section-head', {}, h('h2', {}, group.name)),
    h('div.packs', {}, packs.map(p => {
      const pr = packProgress(p, vocab, done);
      return h('button.pack', { onclick: () => start(p), 'aria-label': `${p.name}, nivel ${p.level}, ${pr.learned} de ${pr.total}` },
        h('span.pack-icon', {}, p.icon),
        h('span.pack-body', {},
          h('span.pack-name', {}, p.name, h('small.muted', {}, ` · ${p.level}`)),
          progressBar(pr.learned / pr.total, pr.learned === pr.total ? 'var(--good)' : '')),
        h('small.muted', {}, `${pr.learned}/${pr.total}`));
    })));
}

// Paso 1: una frase por pantalla; se escucha sola y se repite con el micrófono.
function learn(pack, list, { home }) {
  let i = 0;
  const screen = h('div.screen.essentials', {});
  mount(screen);

  function show() {
    const p = list[i];
    screen.innerHTML = '';
    const say = () => speak(p.en, { rate: 0.85 });
    screen.append(
      h('div.topbar', {}, h('button.icon', { 'aria-label': 'Salir', onclick: () => { stopSpeaking(); essentials({ home }); } }, '✕'),
        h('h2', {}, pack.name)),
      progressBar(i / list.length),
      h('p.muted', {}, `Frase ${i + 1} de ${list.length} · Escuche y repita en voz alta`),
      h('div.card.phrase-card', {},
        h('p.phrase-en', {}, p.en),
        h('p.phrase-es', {}, p.es),
        h('div.row.center', {},
          h('button', { onclick: say }, '🔊 Escuchar'),
          h('button', { onclick: () => speak(p.en, { rate: 0.65 }) }, '🐢 Despacio'),
          h('button', { onclick: () => practicePronunciation(p.en) }, '🎤 Repetir'))),
      h('p.muted.center', {}, 'Dígala 2 o 3 veces junto con el audio, hasta que le salga sin leer.'),
      h('button.primary.wide', { onclick: () => { stopSpeaking(); i++; if (i < list.length) show(); else finish(); } },
        i + 1 < list.length ? 'Siguiente' : 'Listo: ahora a recordarlas'));
    say();
  }

  // Paso 2: se guardan en el vocabulario y se ponen a prueba de inmediato (cuenta como primer repaso).
  function finish() {
    const now = Date.now();
    const ids = [];
    store.update(s => {
      for (const p of list) {
        if (s.vocab.some(v => v.coreId === p.id)) continue;
        const v = { id: crypto.randomUUID?.() || String(now + Math.random()), ...toVocab(p, now) };
        s.vocab.unshift(v);
        ids.push(v.id);
      }
    });
    toast(`📚 ${ids.length} frases nuevas en su vocabulario`, 'good');
    review({ home, only: ids, onDone: () => essentials({ home }) });
  }

  show();
}
