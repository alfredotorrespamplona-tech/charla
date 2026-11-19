// Pantallas: bienvenida, inicio, lugar, misiones, resumen, vocabulario, repaso y ajustes.
import * as store from './store.js';
import { PLACES, CHARACTERS, FREE_TALK, CITY_MAP, RANKS, SELF_ASSESSMENT, SETTING_OPTIONS, rankById, levelSettings, relationshipStatus, STARS_TO_UNLOCK_NEXT_LEVEL, MIN_STARS_TO_COUNT } from './data.js';
import { h, mount, sheet, closeSheet, toast, spinner, stars, progressBar, richText, placeBackground, setText, placeIcon } from './ui.js';
import { miniAvatar } from './avatar.js';
import { applyCast, castNames, roleLine } from './cast.js';
import { checkForUpdate } from './update.js';
import { levelStudy, levelContent } from './levelscreen.js';
import { shortVersion } from './version.js';
import { startConversation } from './conversation.js';
import { chatJson, testConnection } from './llm.js';
import * as P from './prompts.js';
import * as scoring from './scoring.js';
import { addVocab, tierBadge, practiceVocab } from './words.js';
import { speak, rankedVoices, voiceLabel, canListen, onVoicesChanged, checkVoice, IS_ANDROID, SEND_PAUSES, sendPauseMs } from './speech.js';
import { dashboard } from './dashboard.js';
import { milScreen, milOf } from './milscreen.js';
import { quickCounts } from './mil.js';
import { practicePronunciation } from './pronounce.js';
import { review as startReview } from './review.js';
import { essentials } from './essentials.js';
import * as srs from './srs.js';
import { PHRASES, learnedIds } from './phrases.js';
import { openTranscript } from './transcript.js';
import { DAILY_GOALS, AGE_GROUPS, GENDERS, INTERESTS, missionLevel, totalMissionLevel, missionSlots, STARS_PER_MISSION_LEVEL, MISSION_LEVEL_COINS } from './lessons.js';
import { TOPICS, TOPIC_GROUPS, drawMissions } from './topics.js';
import { activeSeasonal } from './seasons.js';
import * as tutorial from './tutorial.js';
import { workshop } from './workshop.js';
import { grammarScreen, homeLabel as grammarLabel } from './grammarscreen.js';
import * as safety from './safety.js';
import { spendStatus, usd, PRICES } from './budget.js';
import * as bitacora from './bitacora.js';
import * as coins from './coins.js';
import * as inbox from './inbox.js';
import { homePlaceOf } from './people.js';
import { customTopicsCard } from './customtopics.js';
import { statsScreen, calendarView } from './stats.js';
import * as recap from './recap.js';
import { vocabScreen as openVocab, rememberSuggestions, pendingSuggestions } from './vocab.js';
import { setPeopleNav, characterSheet, contactsScreen, relationLine, levelFraction, nextDiscovery } from './people.js';
setPeopleNav({ home, chooseMission, isOpen: p => coins.isPlaceOpen(store.get(), p) });
import { NATURAL_VOICES, loadNatural, disableNatural, naturalStatus, onNaturalStatus, unlockAudio } from './natural-voice.js';

// ---------------- Bienvenida ----------------
function onboarding() {
  const s = store.get();
  const data = { name: s.name, rank: s.rank, apiKey: s.settings.apiKey };
  const plan = planEditor(s);
  const nameIn = h('input', { value: data.name, placeholder: 'Su nombre o apodo' });
  const keyIn = h('input', { value: data.apiKey, placeholder: 'sk-… (o escriba demo)', type: 'password', autocomplete: 'off' });
  const levels = h('div.choices', {}, SELF_ASSESSMENT.map(a =>
    h('button.choice', { class: data.rank === a.rank ? 'sel' : '', onclick: e => { data.rank = a.rank; [...levels.children].forEach(c => c.classList.remove('sel')); e.currentTarget.classList.add('sel'); } }, a.label)));

  mount(h('div.screen.onboarding', {},
    h('h1', {}, h('img.logo', { src: 'icon.svg', alt: '' }), 'Charla'),
    h('p', {}, 'Practique inglés hablando con personajes en lugares reales. La IA es DeepSeek y la voz es la de su teléfono.'),
    h('label', {}, '¿Cómo le llamamos?'), nameIn,
    h('label', {}, '¿Qué tanto inglés sabe?'), levels,
    h('p.muted', {}, 'Es solo un punto de partida: con su primera charla ajustamos el nivel.'),
    h('h3', {}, 'Su plan'), plan.el,
    h('label', {}, 'Clave de API de DeepSeek'), keyIn,
    h('p.muted', {}, 'Se guarda solo en este teléfono. Escriba «demo» para probar sin gastar.'),
    h('button.primary.wide', {
      onclick: () => {
        store.update(st => {
          st.name = nameIn.value.trim();
          st.rank = data.rank;
          st.highestRank = data.rank;
          st.starsTowardUnlock = 0;
          st.levelCustom = {};
          st.placementPending = true;
          plan.apply(st);
          st.settings.apiKey = keyIn.value.trim();
          st.onboarded = true;
        });
        home();
      },
    }, 'Empezar')));
}

// ---------------- Portada ----------------
export function cover() {
  if (!store.get().onboarded) return onboarding();
  dashboard({
    map: home,
    resume: resumeDraft,
    review: () => startReview({ home: cover }),
    grammar: () => grammarScreen({ home: cover }),
    essentials: () => essentials({ home: cover }),
    vocab: () => openVocab({ home: cover }),
    errors: () => bitacora.bitacoraScreen({ back: cover }),
    stats: () => statsScreen({ home: cover }),
    settings: () => settings({ back: cover }),
    mil: () => milScreen({ home: cover }),
    levels: () => levelScreen(undefined, cover),
  });
}

// Contenido de cada nivel (A1…C2). Los temas se charlan en la cafetería (con «una sola compañera», con Amy).
function levelScreen(rank, back = home) {
  levelStudy({ home: back, rank, startTopic: (topic, shown) => {
    const place = PLACES[0], character = CHARACTERS[place.characters[0]];
    startConversation({ place, character, mission: topic, onExit: () => levelScreen(shown, back), onFinish: session => summary(session) });
  } });
}

// Seguir una charla guardada (desde la portada, el inicio o al volver a la app).
function resumeDraft(d = store.get().draft) {
  const c = d && CHARACTERS[d.characterId], p = d && PLACES.find(x => x.id === d.placeId);
  if (!c || !p) return home();
  startConversation({ place: p, character: c, mission: d.mission, resume: d, onExit: home, onFinish: session => summary(session) });
}

// ---------------- Inicio ----------------
export function home() {
  const s = store.get();
  if (!s.onboarded) return onboarding();
  const rank = rankById(s.rank);
  const lv = levelSettings(s.rank, s.levelCustom);
  const streak = scoring.streakStatus();

  const header = h('div.home-header', {},
    h('div', {}, h('div.hello', {}, h('button.icon.cover-btn', { 'aria-label': 'Portada', onclick: () => cover() }, '🏠'), `Hola${s.name ? ', ' + s.name : ''}`), h('button.level-link', { onclick: () => levelSheet() }, `Nivel ${rank.id}/6 · ${rank.code} ${rank.name} · puntos ×${lv.scoreModifier.toFixed(2)} ⓘ`)),
    h('div.badges', {},
      h('button.badge', { class: streak.doneToday ? '' : 'pending', 'aria-label': `Racha: ${streak.count} ${streak.count === 1 ? "día" : "días"}${streak.doneToday ? ', hoy ya practicó' : ', hoy aún no practica'}`, onclick: () => streakSheet() }, '🔥 ' + streak.count + (streak.freezes ? ' 🧊' : '')),
      h('span.badge', { 'aria-label': `Puntos: ${s.points}` }, '⭐ ' + s.points)));

  const openPlace = p => coins.isPlaceOpen(s, p) ? choosePlace(p) : lockedPlaceSheet(p);
  const view = CITY_MAP && s.settings.homeView !== 'list' ? 'map' : 'list';
  const setView = v => { store.update(st => { st.settings.homeView = v; }); home(); };
  const viewSwitch = CITY_MAP ? h('div.segmented', { role: 'tablist' },
    h('button', { role: 'tab', 'aria-selected': String(view === 'map'), class: view === 'map' ? 'sel' : '', onclick: () => setView('map') }, '🗺️ Mapa'),
    h('button', { role: 'tab', 'aria-selected': String(view === 'list'), class: view === 'list' ? 'sel' : '', onclick: () => setView('list') }, '☰ Lista')) : null;

  const places = view === 'map' ? cityMap(s, openPlace) : h('div.places', {}, PLACES.map(p => {
    const locked = !coins.isPlaceOpen(s, p);
    return h('button.place', {
      class: (locked ? 'locked' : '') + (p.image ? ' with-scene' : ''),
      'aria-label': `${p.name}${locked ? ', disponible en el nivel ' + rankById(p.rankRequired).code : ''}`,
      style: { background: placeBackground(p, { shade: true }) },
      onclick: () => openPlace(p),
    }, placeIcon(p, { locked }), h('span.place-name', {}, p.name),
      h('span.place-chars', {}, castNames(p.characters)));
  }));

  const last = s.history.slice(-3).reverse();
  mount(h('div.screen.home', {},
    header,
    store.locksOn(s) ? (s.rankProposal ? rankProposalCard(s.rankProposal, home) : levelProgress(s)) : null,
    recap.streakNotice(),
    safety.spendCard(s),
    dailyGoal(s),
    recap.recapCard(s, new Date(), year => recap.recapScreen({ home, year })),
    recap.weeklyCard(s, home),
    safety.backupCard(s, home),
    reviewToday(s),
    seasonalCard(),
    draftCard(s),
    messagesCard(),
    naturalBanner(),
    h('div.section-head', {}, h('h2', {}, '¿A dónde vamos hoy?'), viewSwitch),
    places,
    h('div.home-actions', {},
      h('button.action', { onclick: () => levelScreen() }, '🎓 Por nivel', h('small', {}, `su nivel: ${rankById(s.rank).code}`)),
      h('button.action', { onclick: () => milScreen({ home }) }, '📇 Mil palabras', h('small', {}, milLabel(s))),
      h('button.action', { onclick: () => essentials({ home }) }, '📚 Frases', h('small', {}, `${learnedIds(s.vocab).size}/${PHRASES.length}`)),
      h('button.action', { onclick: () => vocabScreen() }, '📒 Vocabulario', h('small', {}, `${s.vocab.filter(v => !v.archived).length}${pendingSuggestions(s).length ? ' · 💡' + pendingSuggestions(s).length : ''}`)),
      h('button.action', { onclick: () => grammarScreen({ home }) }, '🧱 Gramática', h('small', {}, grammarLabel(s))),
      h('button.action', { onclick: () => workshop({ home }) }, '🧩 Taller', h('small', {}, (s.drills?.inbox?.length ? '💡' + s.drills.inbox.length + ' · ' : '') + 'juggle y esqueletos')),
      h('button.action', { onclick: () => contactsScreen() }, '👥 Contactos'),
      h('button.action', { onclick: () => statsScreen({ home }) }, '📊 Estadísticas'),
      h('button.action', { onclick: () => settings() }, '⚙️ Ajustes')),
    last.length ? h('div.section-head', {}, h('h2', {}, 'Últimas charlas'),
      s.history.length > 3 ? h('button.link', { onclick: () => historyScreen() }, `Ver todas (${s.history.length})`) : null) : null,
    h('div.history', {}, last.map(historyRow)),
    !s.settings.apiKey ? h('p.warn', {}, '⚠️ Falta la clave de DeepSeek: vaya a Ajustes.') : null));
}

// Etiqueta corta del mazo de mil palabras para el inicio.
function milLabel(s) {
  const m = milOf(s);
  const c = quickCounts(m, Date.now(), store.todayIso());
  return c.toStudy ? `${c.toStudy} para hoy` : `${c.learned}/${c.total}`;
}

// Evento de temporada (SeasonalEventGame): un tema especial en todos los lugares mientras dure.
function seasonalCard() {
  const ev = activeSeasonal()[0];
  if (!ev) return null;
  return h('div.card.notice.season', {}, h('b', {}, `${ev.icon} Tema de temporada: ${ev.name}`),
    h('div.muted', {}, `${ev.description} Aparece primero en las misiones de cualquier lugar.`));
}

// Charla a medias (ContinueConversation): seguirla o descartarla.
function draftCard(s) {
  const d = s.draft;
  if (!d) return null;
  const c = CHARACTERS[d.characterId], p = PLACES.find(x => x.id === d.placeId);
  if (!c || !p) return null;
  const n = d.turns?.length || 0;
  return h('div.card.draft', {},
    h('b', {}, `⏸️ Charla a medias con ${c.name}`),
    h('div.muted', {}, `${d.mission.icon} ${d.mission.name} · ${n} ${n === 1 ? 'turno' : 'turnos'}`),
    h('div.row', {},
      h('button.primary.small', { onclick: () => resumeDraft(d) }, '▶️ Continuar'),
      h('button.small', { onclick: e => {
        const b = e.currentTarget;
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = '¿Seguro?'; return; }
        store.update(st => { st.draft = null; }); home();
      } }, 'Descartar')));
}

// Mensajes de los personajes (uno al día como máximo, de alguien que ya conoce).
function messagesCard() {
  inbox.maybeNewMessage();
  const msgs = inbox.pendingMessages();
  if (!msgs.length) return null;
  return h('div.messages', {}, msgs.slice(0, 2).map(m => {
    const c = CHARACTERS[m.charId];
    if (!c) return null;
    const place = homePlaceOf(c.id, p => coins.isPlaceOpen(store.get(), p));
    const hours = Math.max(1, Math.round((new Date(m.expires) - Date.now()) / 3600000));
    return h('div.card.message', {},
      h('div.msg-head', {}, miniAvatar(c), h('div', {}, h('b', {}, `💌 ${c.name} le escribió`), h('small.muted', {}, `Responda en las próximas ${hours} h`))),
      h('p.msg-text', {}, m.text), h('small.muted', {}, m.es),
      h('div.row', {},
        h('button.primary.small', { onclick: () => startConversation({ place, character: c, mission: inbox.replyMission(m), onExit: home, onFinish: session => summary(session) }) }, '💬 Responder'),
        h('button.small', { onclick: () => speak(m.text, { character: c, rate: 0.9 }) }, '🔊'),
        h('button.small', { onclick: () => { inbox.dismissMessage(m.id); home(); } }, 'Ignorar')));
  }));
}

// Meta diaria (Casual 5 / Regular 10 / Serious 20 / Intense 30 min): minutos de charla de hoy.
function dailyGoal(s) {
  const secs = s.daily?.date === store.todayIso() ? s.daily.seconds : 0;
  const min = Math.floor(secs / 60), goal = s.dailyGoal || 10;
  const done = secs >= goal * 60;
  return h('button.daily-goal', { onclick: () => planSheet(), 'aria-label': `Meta diaria: ${min} de ${goal} minutos. Cambiar mi plan` },
    h('span', {}, done ? `✅ Meta de hoy cumplida: ${min} min` : `🎯 Hoy: ${min} de ${goal} min`),
    progressBar(secs / (goal * 60), done ? 'var(--good)' : ''));
}

// Repaso de hoy (repaso espaciado): cuántas tarjetas tocan, o cuándo es el próximo.
function reviewToday(s) {
  const due = srs.dueCount(s.vocab);
  const next = srs.nextDue(s.vocab);
  if (!due && !next) return h('button.daily-goal.review-today', { onclick: () => essentials({ home }) },
    h('span', {}, '📚 Empiece con las frases esenciales del inglés'));
  return h('button.daily-goal.review-today', { class: due ? 'due' : '', onclick: () => review() },
    h('span', {}, due ? `🧠 Repaso de hoy: ${due} ${due === 1 ? 'tarjeta' : 'tarjetas'}` : `✅ Repaso al día · el próximo ${srs.whenLabel(next.at)}`),
    due ? h('span.go', {}, 'Repasar') : null);
}

function planSheet() {
  const plan = planEditor(store.get());
  sheet(h('div', {}, h('h3', {}, '🎯 Mi plan'), plan.el,
    h('button.primary.wide', { onclick: () => { store.update(plan.apply); closeSheet(); toast('Plan guardado', 'good'); home(); } }, 'Guardar')));
}

// Plan de aprendizaje de la bienvenida: motivo, meta diaria, edad e intereses.
const MOTIVATIONS = ['Viajar', 'Trabajo', 'Estudio', 'Mudarme', 'Familia', 'Gusto personal', 'Otro'];
function planEditor(s) {
  const data = { motivation: s.motivation, dailyGoal: s.dailyGoal, ageGroup: s.ageGroup, gender: s.gender || '', interests: new Set(s.interests || []) };
  const single = (items, key, value, label) => {
    const box = h('div.choices.small', {}, items.map(it => h('button.choice', {
      class: data[key] === value(it) ? 'sel' : '',
      onclick: e => { data[key] = value(it); [...box.children].forEach(c => c.classList.remove('sel')); e.currentTarget.classList.add('sel'); },
    }, label(it))));
    return box;
  };
  const count = h('small.muted', {}, '');
  const paintCount = () => { count.textContent = data.interests.size ? ` · ${data.interests.size} elegidos` : ' · elija los que quiera'; };
  const chips = h('div.chips', {}, INTERESTS.map(([en, es]) => h('button.chip', {
    class: data.interests.has(en) ? 'sel' : '', 'aria-pressed': String(data.interests.has(en)),
    onclick: e => {
      const b = e.currentTarget;
      if (data.interests.has(en)) data.interests.delete(en); else data.interests.add(en);
      b.classList.toggle('sel', data.interests.has(en));
      b.setAttribute('aria-pressed', String(data.interests.has(en)));
      paintCount();
    },
  }, es)));
  paintCount();
  return {
    el: h('div.plan', {},
      h('label', {}, '¿Para qué lo quiere?'), single(MOTIVATIONS, 'motivation', x => x, x => x),
      h('label', {}, '¿Cuánto quiere practicar?'), single(DAILY_GOALS, 'dailyGoal', g => g.min, g => g.label),
      h('label', {}, 'Su edad'), single(AGE_GROUPS, 'ageGroup', a => a.id, a => a.label),
      h('label', {}, 'Usted es'), single(GENDERS, 'gender', g => g.id, g => g.label),
      h('p.muted', {}, 'Así los personajes ajustan el trato.'),
      h('label', {}, 'Temas que le gustan', count), chips,
      h('p.muted', {}, 'Los personajes los sacan en las charlas, sobre todo en la charla libre.')),
    apply: st => { st.motivation = data.motivation; st.dailyGoal = data.dailyGoal || 10; st.ageGroup = data.ageGroup; st.gender = data.gender; st.interests = [...data.interests]; },
  };
}

// Una charla del historial: al tocarla se abre su transcripción.
function historyRow(x) {
  const has = Array.isArray(x.transcript) && x.transcript.length;
  return h('button.history-row', {
    class: has ? '' : 'no-transcript',
    onclick: () => has ? showTranscript(x) : toast('Esta charla es antigua y no guardó la conversación.'),
  },
  h('span', {}, `${has ? '📜 ' : ''}${CHARACTERS[x.characterId]?.name || ''} · ${x.missionName}`),
  stars(x.stars, 'small'),
  h('span.muted', {}, `${x.score.total} pts`));
}

function showTranscript(x) {
  const character = CHARACTERS[x.characterId];
  openTranscript(x.transcript || [], { character, learnerName: store.get().name, title: `${character?.name || ''} · ${x.missionName}`, date: x.date });
}

// Historial completo (Loop history), de la más reciente a la más antigua.
function historyScreen() {
  const s = store.get();
  const byDay = new Map();
  for (const x of [...s.history].reverse()) {
    const d = new Date(x.date).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(x);
  }
  mount(h('div.screen', {},
    h('div.topbar', {}, h('button.icon', { onclick: home }, '←'), h('h2', {}, '🕘 Historial')),
    h('p.muted', {}, `Toque una charla para ver la conversación. Se guardan las últimas ${scoring.TRANSCRIPTS_KEPT}.`),
    [...byDay].map(([d, xs]) => h('div', {}, h('h3', {}, d), h('div.history', {}, xs.map(historyRow))))));
}

// Racha y tienda: el "congelador" protege la racha un día que no practique.
function streakSheet() {
  const s = store.get();
  const st = scoring.streakStatus();
  const buyBtn = h('button.primary', {
    onclick: () => {
      const r = scoring.buyFreeze();
      if (!r.ok) { toast(r.reason, 'bad'); return; }
      toast('🧊 Protector agregado', 'good');
      closeSheet();
      home();
    },
  }, '🧊 Agregar protector (gratis)');
  sheet(h('div', {},
    h('h3', {}, `🔥 Racha: ${st.count} ${st.count === 1 ? 'día' : 'días'}`),
    h('p', {}, st.doneToday ? '✅ Hoy ya practicó.' : 'Hoy aún no ha practicado: haga una charla de 3 turnos o más, o un repaso.'),
    h('p.muted', {}, `Récord: ${s.streak.record}`),
    calendarView(),
    h('div.card', {},
      h('b', {}, `🧊 Protector de racha (${st.freezes}/${scoring.MAX_FREEZES})`),
      h('p.muted', {}, 'Si un día no practica, se gasta uno y su racha sigue viva.'),
      buyBtn)));
}

function lockedPlaceSheet(p) {
  sheet(h('div', {},
    h('h3', {}, placeIcon(p, { locked: true }), placeIcon(p), p.name),
    h('p', {}, `Se abre solo cuando llegue al nivel ${p.rankRequired} (${rankById(p.rankRequired).code}).`),
    h('p.muted', {}, 'Si quiere todo abierto, quite los candados en Ajustes → Nivel de inglés.'),
    h('button.primary.wide', { onclick: () => { closeSheet(); settings(); } }, '⚙️ Ir a Ajustes')));
}

// Guía para que el teléfono tenga voces buenas (gratis): las de Google se descargan en Android.
function betterVoicesGuide() {
  const android = [
    'Abra los <b>Ajustes</b> del teléfono y busque <b>«Salida de texto a voz»</b> (suele estar en Sistema → Idiomas, o en Accesibilidad).',
    'En <b>Motor preferido</b> elija <b>Servicios de voz de Google</b> (en Samsung viene el de Samsung, que suena peor). Si no aparece, instale «Servicios de voz de Google» desde la Play Store.',
    'Toque el engranaje ⚙ junto al motor → <b>Instalar datos de voz</b> → <b>English (United States)</b> → descárguelo.',
    'Dentro de English (United States) toque <b>Voz</b>, pruebe varias (I, II, III, IV…) y deje la que más le guste.',
    'Vuelva a Charla, cierre la app del todo y ábrala otra vez. En esta lista elija «Automática» o la voz con ⭐.',
  ];
  const other = [
    '<b>iPhone:</b> Ajustes → Accesibilidad → Contenido leído → Voces → English → descargue una voz <b>Mejorada</b> o <b>Premium</b> (Ava, Zoe, Evan…).',
    '<b>Windows:</b> Microsoft Edge trae voces «Online (Natural)» que suenan muy bien: abra Charla en Edge y elija una con ⭐.',
    '<b>Chrome de computador:</b> elija una voz «Google US English».',
  ];
  const list = items => h('ol.steps', {}, items.map(t => h('li', { html: t })));
  return h('details.voice-guide', { open: false },
    h('summary', {}, '🗣️ ¿Las voces suenan robóticas? Instale las buenas (gratis)'),
    IS_ANDROID ? list(android) : h('div', {}, h('p', {}, h('b', {}, 'En Android:')), list(android)),
    h('p.muted', {}, 'Otros equipos:'),
    h('ul.steps', {}, other.map(t => h('li', { html: t }))));
}

function slownessText(x) {
  if (!x) return '';
  if (x <= 0.8) return 'Su equipo es rápido: el personaje empieza a hablar casi enseguida.';
  const wait = Math.round(x * 2.5);
  return `En este equipo tarda unos ${wait} s en empezar cada respuesta${x > 2 ? ': es lento para conversar; la voz del teléfono responde al instante' : ''}.`;
}

// Aviso en el inicio mientras se descarga la voz natural (solo la primera vez).
function naturalBanner() {
  if (store.get().settings.voiceEngine !== 'natural') return null;
  const el = h('div.voice-banner.hidden', {});
  const paint = st => {
    if (!el.isConnected && el.dataset.mounted) return stop();
    el.dataset.mounted = '1';
    const show = st.state === 'loading' || st.state === 'warming' || st.state === 'error';
    el.classList.toggle('hidden', !show);
    setText(el, st.state === 'error'
      ? '⚠️ No se pudo cargar la voz natural; se usa la del teléfono. Vea Ajustes.'
      : st.state === 'warming' ? '🎙️ Preparando la voz natural…'
      : `🎙️ Descargando la voz natural… ${st.pct || 0}%${st.mb ? ` de ${st.mb} MB` : ''} (solo la primera vez). Mientras tanto se usa la voz del teléfono.`);
  };
  const stop = onNaturalStatus(paint);
  paint(naturalStatus());
  return el;
}

// Mapa ilustrado de la ciudad con un botón sobre cada lugar.
function cityMap(s, openPlace) {
  const spots = PLACES.filter(p => CITY_MAP.spots[p.id]).map(p => {
    const [x, y] = CITY_MAP.spots[p.id];
    const locked = !coins.isPlaceOpen(s, p);
    return h('button.map-spot', {
      class: locked ? 'locked' : '',
      style: { left: x + '%', top: y + '%' },
      'aria-label': `${p.name}${locked ? ', disponible en el nivel ' + rankById(p.rankRequired).code : ''}`,
      onclick: () => openPlace(p),
    }, h('span.spot-icon', {}, placeIcon(p, { locked })), h('span.spot-name', {}, p.name));
  });
  const extra = PLACES.filter(p => !CITY_MAP.spots[p.id]).map(p => {
    const locked = !coins.isPlaceOpen(s, p);
    return h('button.chip', { class: locked ? 'locked' : '', onclick: () => openPlace(p),
      'aria-label': `${p.name}${locked ? ', disponible en el nivel ' + rankById(p.rankRequired).code : ''}` },
    placeIcon(p, { locked }), p.name);
  });
  return h('div', {},
    h('div.city-map', {}, h('img', { src: CITY_MAP.image, alt: 'Mapa de la ciudad', draggable: 'false' }), spots),
    extra.length ? h('div.more-places', {}, h('span.muted', {}, 'Más lugares:'), extra) : null);
}

// Propuesta de cambio de nivel: subir (desbloqueó el siguiente con estrellas) o bajar (le está costando).
function rankProposalCard(p, after) {
  const up = p.to > p.from;
  const to = rankById(p.to);
  return h('div.card.rank-card', {},
    h('b', {}, up ? `🔓 ¡Desbloqueó el nivel ${to.id}: ${to.code} ${to.name}!` : '🧩 ¿Probamos un nivel un poco más fácil?'),
    h('p', {}, up ? to.about : `Sus últimas charlas en ${rankById(p.from).code} costaron bastante. En ${to.code} el personaje habla más simple y despacio.`),
    up ? h('p.muted', {}, 'Si prefiere seguir donde está, puede subir después en Ajustes.') : null,
    h('div.row', {},
      h('button.primary', { onclick: () => { scoring.setLevel(p.to); toast(`Ahora practica en ${to.code}`, 'good'); after(); } }, up ? 'Subir de nivel' : 'Sí, más fácil'),
      h('button', { onclick: () => { store.update(s => { s.rankProposal = null; }); after(); } }, up ? 'Aún no' : 'Seguir así')));
}

// Progreso hacia el siguiente nivel (estrellas de charlas con 2★ o más).
function levelProgress(s) {
  if (s.placementPending) return h('div.card.muted', {}, '🧭 Su primera charla (3 turnos o más) ajusta su nivel inicial.');
  if (s.highestRank >= RANKS.length) return null;
  if (s.rank < s.highestRank) return h('div.card.muted', {}, `Practica en ${rankById(s.rank).code}; ya tiene desbloqueado hasta ${rankById(s.highestRank).code} (cámbielo en Ajustes).`);
  const next = rankById(s.highestRank + 1);
  return h('div.card', {},
    h('small', {}, `Para desbloquear ${next.code} ${next.name}: ⭐ ${s.starsTowardUnlock}/${STARS_TO_UNLOCK_NEXT_LEVEL} (cuentan las charlas de ${MIN_STARS_TO_COUNT}★ o más)`),
    progressBar(s.starsTowardUnlock / STARS_TO_UNLOCK_NEXT_LEVEL));
}

// Qué cambia en cada nivel.
function levelSheet() {
  const s = store.get();
  const label = (k, key) => SETTING_OPTIONS[k].options.find(o => o.key === key)?.label;
  sheet(h('div', {},
    h('h3', {}, 'Niveles'),
    h('p.muted', {}, 'Al subir, el personaje usa frases más largas y un inglés más avanzado (también en las sugerencias), habla más rápido y la ayuda aparece más tarde. Cada nivel da más puntos.'),
    RANKS.map(r => h('div.card', { class: r.id === s.rank ? 'current' : '' },
      h('b', {}, `${r.id}. ${r.code} · ${r.name}${r.id === s.rank ? ' ← usted' : ''}`),
      h('p', {}, r.about),
      h('small.muted', {}, `Voz ${label('speed', r.defaults.speed).toLowerCase()} · texto: ${label('response', r.defaults.response).toLowerCase()} · sugerencias: ${label('suggestions', r.defaults.suggestions).toLowerCase()} · puntos ×${r.scoreModifier.toFixed(1)}`),
      h('button.small.level-open', { onclick: () => { closeSheet(); levelScreen(r.id); } }, `🎓 Ver y estudiar el contenido de ${r.code}`)))));
}

// Ajustes: nivel en que practica + personalizar sus ayudas (cada cambio sube o baja el multiplicador de puntos).
function levelEditor(s) {
  let rankId = s.rank;
  let custom = { ...s.levelCustom };
  const reach = store.reachRank(s);
  const rankSel = h('select', {}, RANKS.map(r => h('option', { value: r.id, selected: r.id === s.rank, disabled: r.id > reach },
    `${r.id}. ${r.code} · ${r.name}${r.id > reach ? ' 🔒' : ''}`)));
  const about = h('p.muted', {});
  const contentBox = h('div.level-content-link', {});
  const modOut = h('span.mod', {});
  const grid = h('div.custom-grid', {});
  const paint = () => {
    const r = rankById(rankId);
    const lv = levelSettings(rankId, custom);
    about.textContent = r.about;
    const c = levelContent(rankId);
    contentBox.replaceChildren(
      h('small.muted', {}, `Contenido de ${r.code}: ${c.temario.length} temas de gramática con su examen, ${c.lessons.length} rompecabezas de verbos, ${c.phrases.length + c.words.length} paquetes de frases y palabras${c.mil ? `, las palabras ${c.mil[0]} a ${c.mil[1]} de Mil palabras` : ''} y ${c.topics.length} temas para charlar.`),
      h('button.small', { onclick: () => levelScreen(rankId, () => settings()) }, `🎓 Ver y estudiar el contenido de ${r.code}`));
    modOut.textContent = `×${lv.scoreModifier.toFixed(2)}`;
    grid.replaceChildren(...Object.entries(SETTING_OPTIONS).map(([k, def]) => {
      const sel = h('select', {}, def.options.map(o => h('option', { value: String(o.key), selected: o.key === lv[k] },
        o.label + (o.key === r.defaults[k] ? ' (del nivel)' : ''))));
      sel.onchange = () => {
        const opt = def.options.find(o => String(o.key) === sel.value);
        if (opt.key === r.defaults[k]) delete custom[k]; else custom[k] = opt.key;
        paint();
      };
      return h('label', { class: custom[k] !== undefined ? 'changed' : '' }, def.label, sel);
    }));
  };
  rankSel.onchange = () => { rankId = +rankSel.value; custom = {}; paint(); };
  paint();
  const el = h('div.card.level-card', {},
    h('label', {}, 'Nivel en que practica'), rankSel, about, contentBox,
    h('b', {}, 'Personalizar'),
    h('p.muted', {}, 'Cada nivel trae sus ayudas. Si elige algo más difícil gana más puntos; más fácil, menos.'),
    grid,
    h('div.level-row', {}, h('span', {}, 'Multiplicador de puntos: ', modOut),
      h('button.small', { onclick: () => { custom = {}; paint(); } }, 'Restablecer')));
  const apply = () => {
    if (rankId !== store.get().rank) scoring.setLevel(rankId);
    store.update(st => { st.levelCustom = { ...custom }; });
  };
  return { el, apply };
}

// ---------------- Lugar → personaje ----------------
function choosePlace(place) {
  mount(h('div.screen', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: home }, '←'), h('h2', {}, placeIcon(place), place.name)),
    placeBanner(place),
    h('p.muted', {}, '¿Con quién quiere hablar?'),
    h('div.characters', {}, place.characters.map(id => {
      const c = CHARACTERS[id];
      const rel = store.relationship(id);
      const st = relationshipStatus(rel.level);
      return h('div.character-card.person', {},
        h('button.person-main', { onclick: () => chooseMission(place, c) },
          miniAvatar(c),
          h('div', {}, h('b', {}, c.name), h('div.muted', {}, roleLine(c)),
            h('div.rel', { class: rel.level < 0 ? 'bad' : '' }, `${relationLine(rel)} · ${rel.conversations} charlas`))),
        h('button.small', { 'aria-label': `Ficha de ${c.name}`, onclick: () => characterSheet(c, { onChange: () => choosePlace(place) }) }, 'Ficha'));
    }))));
}

function placeBanner(place) {
  return place.image ? h('div.place-banner', { role: 'img', 'aria-label': place.scene, style: { background: placeBackground(place) } }) : null;
}

// ---------------- Misiones (3 sorteadas + libre + tema propio) ----------------
function chooseMission(place, character, reroll = 0) {
  const s = store.get();
  const total = totalMissionLevel(s.missionXp);
  const { slots, next } = store.locksOn(s) ? missionSlots(total) : { slots: 5, next: null };
  const drawn = drawMissions(place, slots, store.reachRank(s));

  const missionCard = m => h('button.mission', { onclick: () => go(m) },
    h('span.m-icon', {}, m.icon),
    h('div', {}, h('b', {}, m.name), m.season ? h('span.m-topic.m-season', {}, 'Temporada') : m.topic ? h('span.m-topic', {}, 'Tema') : null, h('div.muted', {}, m.description),
      missionLevelTag(s, m)));
  const lockedSlot = next ? h('div.mission.locked', {},
    h('span.m-icon', {}, '🔒'),
    h('div', {}, h('b', {}, 'Más opciones'),
      h('div.muted', {}, `Llegue a nivel total de misiones ${next.total} para ver ${next.slots} misiones por lugar (lleva ${total}).`))) : null;

  const go = mission => startConversation({
    place, character, mission,
    onExit: () => chooseMission(place, character),
    onFinish: session => summary(session),
  });

  mount(h('div.screen', {},
    h('div.topbar', {}, h('button.icon', { onclick: () => choosePlace(place) }, '←'), h('h2', {}, `Con ${character.name}`)),
    h('div.missions', {}, activeSeasonal().map(missionCard), drawn.map(missionCard), lockedSlot, missionCard(FREE_TALK)),
    h('button.link', {
      onclick: () => {
        const r = coins.useReroll();
        if (!r.ok) { toast(r.reason, 'bad'); return; }
        chooseMission(place, character, reroll + 1);
      },
    }, '🎲 Otras misiones'),
    h('button.secondary.all-topics', { onclick: () => chooseTopic(place, character) }, `💬 Todos los temas de conversación (${TOPICS.length})`),
    customTopicsCard({ place, character, start: go, refresh: () => chooseMission(place, character, reroll) })));
}

// Nivel de una misión con su barra de avance (MissionProgression).
// Lista completa de temas de conversación, por grupo. Sirven con cualquier personaje.
function chooseTopic(place, character) {
  const s = store.get();
  const card = m => {
    const locked = store.reachRank(s) < m.rankRequired;
    return h('button.mission', {
      class: locked ? 'locked' : '',
      onclick: () => locked ? toast(`Disponible en el nivel ${m.rankRequired} (${rankById(m.rankRequired).code})`)
        : startConversation({ place, character, mission: m, onExit: () => chooseTopic(place, character), onFinish: session => summary(session) }),
    }, h('span.m-icon', {}, locked ? '🔒' : m.icon),
      h('div', {}, h('b', {}, m.name), h('div.muted', {}, m.description), missionLevelTag(s, m)));
  };
  mount(h('div.screen', {},
    h('div.topbar', {}, h('button.icon', { onclick: () => chooseMission(place, character) }, '←'), h('h2', {}, `Temas con ${character.name}`)),
    h('p.muted', {}, 'Charlas sobre la vida diaria. El personaje habla de sí mismo y le pregunta a usted.'),
    TOPIC_GROUPS.map(g => h('div.topic-group', {},
      h('h3', {}, `${g.emoji} ${g.name}`),
      h('div.missions', {}, TOPICS.filter(x => x.group === g.id).map(card))))));
}

function missionLevelTag(s, m) {
  const xp = s.missionXp[m.id] || 0;
  if (!xp) return null;
  const lv = missionLevel(xp);
  return h('div.m-level', {}, h('small', {}, `Nivel ${lv.level}`), progressBar(lv.pct / 100),
    s.missionLevels[m.id] ? h('small.muted', {}, `${s.missionLevels[m.id]}✓`) : null);
}

// ---------------- Resumen de sesión ----------------
function summary(session) {
  const sum = scoring.finishSession(session);
  const s = store.get();
  const relB = sum.relationship.before, relA = sum.relationship.after;
  const replyBonus = session.mission.messageId && sum.stats.turns >= 1 ? inbox.markAnswered(session.mission.messageId) : 0;
  const coachBox = h('div.card', {}, spinner('El coach está revisando su conversación…'));
  const vocabBox = h('div');
  // Cosa por descubrir del personaje que se abre con esta charla (la inventa el modelo, coherente con él).
  const discovery = sum.stats.turns >= 2 ? nextDiscovery(store.relationship(session.character.id)) : null;
  const discBox = discovery ? h('div.card', {}, spinner(`🔍 Descubriendo algo de ${session.character.name}…`)) : null;

  const line = (label, v) => v ? h('div.score-line', {}, h('span', {}, label), h('b', {}, '+' + v)) : null;
  mount(h('div.screen.summary', {},
    h('h1', {}, sum.stars === 3 ? '¡Excelente!' : sum.stars === 2 ? '¡Muy bien!' : sum.stars === 1 ? '¡Bien hecho!' : 'Buen intento'),
    stars(sum.stars, 'big'),
    h('div.total', {}, sum.score.total, h('small', {}, ' puntos')),
    sum.score.isPersonalBest ? h('div.badge.good', {}, '🏆 ¡Nuevo récord personal!') : null,
    replyBonus ? h('div.card.good', {}, `💌 Respondió a tiempo el mensaje de ${session.character.name}`) : null,
    h('div.card', {},
      line('Participación', sum.score.base),
      line('Objetivos', sum.score.objective),
      line('Vocabulario', sum.score.vocabulary),
      line('Fluidez', sum.score.fluency),
      line('Palabras guardadas usadas', sum.score.bookmark),
      line(`Nivel ${rankById(sum.rank).code} (×${sum.scoreModifier.toFixed(2)})`, sum.score.levelBonus),
      line(`Racha (${Math.round(sum.score.streakBonusFraction * 100)}%)`, sum.score.streakBonus)),
    h('div.stats', {},
      stat(sum.stats.turns, 'turnos'),
      stat(sum.stats.distinctWords, 'palabras distintas'),
      stat(sum.stats.avgWpm || '—', 'palabras/min'),
      stat(sum.stats.avgDelaySec + ' s', 'demora al responder'),
      stat(sum.stats.suggestionPct + '%', 'de sugerencias'),
      stat(Math.round(sum.stats.durationSec / 60) + ' min', 'duración')),
    sum.firstConversation ? h('div.card.good', {}, h('b', {}, '🎉 ¡Su primera charla en inglés!'),
      h('p', {}, sum.firstConversation.seconds
        ? `Habló ${sum.firstConversation.seconds} segundos y usó ${sum.firstConversation.words} palabras. Cada charla suma.`
        : `Usó ${sum.firstConversation.words} palabras en inglés. La próxima vez pruebe hablando con 🎤.`)) : null,
    sum.missionProgress ? h('div.card', {},
      h('b', {}, sum.missionProgress.after > sum.missionProgress.before
        ? `⬆️ ${session.mission.icon} ${session.mission.name}: ¡nivel ${sum.missionProgress.after}!`
        : `${session.mission.icon} ${session.mission.name}: nivel ${sum.missionProgress.after}`),
      progressBar(sum.missionProgress.pct / 100),
      h('small.muted', {}, `Cada ${STARS_PER_MISSION_LEVEL} estrellas en esta misión sube un nivel. Nivel total de misiones: ${sum.missionProgress.total}.`)) : null,
    session.mission.objectives.length ? h('div.card', {}, h('b', {}, `${session.mission.icon} ${session.mission.name}`),
      h('ul.objectives', {}, session.mission.objectives.map(o => h('li', { class: session.completed.has(o.id) ? 'done' : '' }, session.completed.has(o.id) ? '✅ ' : '⬜ ', o.text)))) : null,
    h('div.card', {},
      h('b', {}, `${session.character.name}: ${relationshipStatus(relA.level).label}`),
      relA.level > relB.level ? h('div.good', {}, '💛 ¡Su relación subió de nivel!') : null,
      relA.level < relB.level ? h('div.bad', {}, `💔 ${session.character.name} quedó molesto: su relación bajó.`) : null,
      progressBar(levelFraction(relA), relA.level < 0 ? 'var(--bad)' : 'var(--gold)'),
      h('small.muted', {}, relationLine(relA)),
      h('button.link', { onclick: () => characterSheet(session.character) }, `Ver la ficha de ${session.character.name}`)),
    discBox,
    sum.streak.qualified ? h('div.card', {}, `🔥 Racha: ${sum.streak.current} ${sum.streak.current === 1 ? 'día' : 'días'}`, sum.streak.newRecord ? ' · ¡récord!' : '',
      sum.streak.freezesUsed ? h('div.muted', {}, `🧊 Se usó ${sum.streak.freezesUsed} protector${sum.streak.freezesUsed > 1 ? 'es' : ''} por los días sin practicar.`) : null) : h('div.card.muted', {}, 'Hable al menos 3 turnos para que cuente en su racha.'),
    sum.placement ? h('div.card.good', {}, h('b', {}, `🧭 Hemos determinado su nivel inicial: ${rankById(sum.placement.to).code} ${rankById(sum.placement.to).name}`),
      h('p', {}, sum.placement.to > sum.placement.from ? 'Habló mejor de lo que dijo: empezamos un nivel más arriba.'
        : sum.placement.to < sum.placement.from ? 'Empezamos un nivel más abajo para que vaya cómodo; subirá rápido.'
        : 'Su autoevaluación fue acertada.'), h('p.muted', {}, rankById(sum.placement.to).about)) : null,
    store.locksOn(s) && !sum.placement && !sum.rankProposal && s.rank === s.highestRank && s.highestRank < RANKS.length
      ? h('div.card', {}, h('small', {}, sum.starsCounted ? `Para el nivel ${rankById(s.highestRank + 1).code}: ⭐ ${s.starsTowardUnlock}/${STARS_TO_UNLOCK_NEXT_LEVEL}`
        : `Esta charla no sumó para subir: cuentan las de ${MIN_STARS_TO_COUNT}★ o más (lleva ${s.starsTowardUnlock}/${STARS_TO_UNLOCK_NEXT_LEVEL}).`),
        progressBar(s.starsTowardUnlock / STARS_TO_UNLOCK_NEXT_LEVEL)) : null,
    sum.rankProposal ? rankProposalCard(sum.rankProposal, home) : null,
    coachBox,
    vocabBox,
    h('button.wide', { onclick: () => openTranscript(sum.transcript, { character: session.character, learnerName: s.name, title: `${session.character.name} · ${session.mission.name}`, date: sum.date }) }, '📜 Ver la conversación'),
    h('div.row.wide', {},
      h('button.primary', { onclick: () => chooseMission(session.place, session.character) }, 'Otra vez'),
      h('button', { onclick: home }, 'Inicio'))));

  // Coach + memoria + palabras sugeridas (CoachSessionFeedback + ConversationMessageSummary)
  chatJson('session_feedback', P.sessionFeedbackMessages({
    history: session.history, character: session.character, mission: session.mission, rankId: s.rank,
    analyses: session.turns.map(t => t.analysis), discovery,
  }), { temperature: 0.5, maxTokens: 700 }).then(r => {
    if (discBox) {
      discBox.innerHTML = '';
      if (r.backstory) {
        store.update(() => { store.relationship(session.character.id).facts[discovery.key] = r.backstory; });
        discBox.append(h('b', {}, `🔓 Descubrió: ${discovery.emoji} ${discovery.label} de ${session.character.name}`), h('p', {}, r.backstory),
          h('button.tiny', { onclick: () => speak(r.backstory, { rate: 0.9 }) }, '🔊 Escuchar'));
      } else discBox.remove();
    }
    coachBox.innerHTML = '';
    coachBox.append(h('b', {}, '🧑‍🏫 Comentario del coach'), h('p', { html: richText(r.coach || '') }), ...[bitacoraButton(session)].filter(Boolean));
    if (r.memory) store.update(() => { const rel = store.relationship(session.character.id); rel.memory.push(r.memory); if (rel.memory.length > 12) rel.memory.shift(); });
    const sugg = (r.vocab_suggestions || []).slice(0, 5);
    rememberSuggestions(sugg);
    if (sugg.length) {
      vocabBox.append(h('div.card', {}, h('b', {}, '📒 Palabras útiles de esta charla'),
        sugg.map(v => h('div.vocab-sugg', {},
          h('span', {}, h('b', {}, v.text), ' — ', v.translation),
          h('button.tiny', { onclick: () => speak(v.text, { rate: 0.85 }) }, '🔊'),
          h('button.tiny.primary', { onclick: e => { addVocab({ text: v.text, translation: v.translation, type: v.type, context: '' }); e.currentTarget.disabled = true; setText(e.currentTarget, '⭐ Guardada'); } }, '+ Guardar')))));
    }
  }).catch(e => { coachBox.innerHTML = ''; coachBox.append(h('p.muted', {}, 'No se pudo obtener el comentario: ' + e.message)); discBox?.remove(); });
}

const stat = (v, label) => h('div.stat', {}, h('b', {}, v), h('small', {}, label));

// Guarda los errores de la charla en la bitácora del teléfono (el coach los vigila desde ya);
// desde «Mi bitácora» se copian para el cerebro en el PC.
function bitacoraButton(session) {
  const analyses = session.turns.map(t => t.analysis);
  if (!analyses.some(bitacora.isSavable)) return null;
  const btn = h('button.tiny', { onclick: () => {
    const n = bitacora.addFromAnalyses(analyses);
    toast(n ? `📒 ${n} ${n === 1 ? 'error guardado' : 'errores guardados'} en su bitácora` : '📒 Ya estaban en su bitácora: el coach los sigue vigilando', 'good');
    btn.replaceWith(h('button.tiny', { onclick: () => bitacora.bitacoraScreen({ back: home }) }, '📒 Ver mi bitácora'));
  } }, '📒 Guardar en mi bitácora');
  return btn;
}

// ---------------- Vocabulario ----------------
function vocabScreen() { openVocab({ home }); }

// ---------------- Repaso personalizado (js/review.js) ----------------
const review = () => startReview({ home });

// ---------------- Ajustes ----------------
function settings({ back = home } = {}) {
  const again = () => settings({ back });
  const s = store.get();
  const key = h('input', { value: s.settings.apiKey, type: 'password', autocomplete: 'off' });
  const modelList = h('datalist', { id: 'model-list' });
  const model = h('input', { value: s.settings.model, list: 'model-list', autocomplete: 'off' });
  const connOut = h('p.muted', {}, '');
  const testBtn = h('button.small', {
    onclick: async () => {
      // Probar con lo que está escrito ahora (aunque no se haya guardado).
      const prev = { ...store.get().settings };
      Object.assign(store.get().settings, { apiKey: key.value.trim(), baseUrl: baseUrl.value.trim() || 'https://api.deepseek.com' });
      testBtn.disabled = true;
      connOut.className = 'muted';
      connOut.textContent = 'Probando…';
      try {
        const ids = await testConnection();
        modelList.innerHTML = '';
        ids.forEach(id => modelList.appendChild(h('option', { value: id })));
        connOut.className = 'good';
        setText(connOut, '✅ Conexión correcta. Modelos: ' + (ids.join(', ') || '—'));
      } catch (e) {
        connOut.className = 'bad';
        setText(connOut, '❌ ' + e.message);
      } finally {
        Object.assign(store.get().settings, prev);
        testBtn.disabled = false;
      }
    },
  }, '🔌 Probar conexión');
  const baseUrl = h('input', { value: s.settings.baseUrl });
  const levelEd = levelEditor(s);
  const plan = planEditor(s);
  const voiceOptions = () => [h('option', { value: '' }, 'Automática: la mejor según el personaje'),
    ...rankedVoices().map(({ v, q }) => h('option', { value: v.voiceURI, selected: v.voiceURI === store.get().settings.voiceURI }, voiceLabel(v, q)))];
  const voiceSel = h('select', {}, voiceOptions());
  const engineSel = h('select', {},
    h('option', { value: 'phone', selected: s.settings.voiceEngine !== 'natural' }, 'Voz del teléfono (inmediata)'),
    h('option', { value: 'natural', selected: s.settings.voiceEngine === 'natural' }, 'Natural Kokoro (más bonita, tarda en responder)'));
  const naturalSel = h('select', {}, h('option', { value: '' }, 'La de cada personaje'),
    NATURAL_VOICES.map(v => h('option', { value: v.id, selected: v.id === s.settings.naturalVoice }, `${v.name} · ${v.gender === 'female' ? 'mujer' : 'hombre'} · ${v.accent}`)));
  const naturalOut = h('p.muted', {}, '');
  const naturalBox = h('div', {}, h('label', {}, 'Voz natural'), naturalSel, naturalOut);
  const phoneBox = h('div', {}, h('label', {}, 'Voz del teléfono'), voiceSel,
    h('p.muted', {}, 'Ordenadas de la que mejor suena a la peor. ⭐ = voz natural.'),
    betterVoicesGuide());
  const paintNatural = st => {
    if (!naturalOut.isConnected && naturalOut.dataset.mounted) return stopNatural();
    naturalOut.dataset.mounted = '1';
    naturalOut.textContent = {
      idle: 'Gratis y sin cuenta: el modelo corre en su equipo. Se descarga una sola vez (90 a 330 MB). Use wifi.',
      loading: `Descargando… ${st.pct || 0}%${st.mb ? ` de ${st.mb} MB` : ''}. Mientras tanto se usa la voz del teléfono.`,
      warming: 'Midiendo la velocidad de su equipo…',
      ready: `✅ Lista (${st.device === 'webgpu' ? 'con tarjeta gráfica' : 'con el procesador'}). ${slownessText(st.slowness)}`,
      error: '⚠️ No se pudo cargar: ' + st.error + '. Se usa la voz del teléfono.',
      unsupported: '⚠️ Este navegador no puede usar la voz natural. Se usa la voz del teléfono.',
    }[st.state];
  };
  const stopNatural = onNaturalStatus(paintNatural);
  paintNatural(naturalStatus());
  const showEngine = () => {
    const nat = engineSel.value === 'natural';
    naturalBox.classList.toggle('hidden', !nat);
    phoneBox.classList.toggle('hidden', nat);
    if (nat) loadNatural();
    else disableNatural(); // libera la memoria del modelo
  };
  engineSel.onchange = showEngine;
  showEngine();
  const saveVoice = st => { st.settings.voiceEngine = engineSel.value; st.settings.naturalVoice = naturalSel.value; st.settings.voiceURI = voiceSel.value; };
  const voiceCheck = h('ul.checklist', {});
  const refreshCheck = () => checkVoice().then(items => voiceCheck.replaceChildren(...items.map(i => h('li', { class: i.ok ? 'ok' : 'bad' }, (i.ok ? '✅ ' : '⚠️ ') + i.text))));
  refreshCheck();
  // En Android las voces llegan tarde: rehacer la lista cuando aparezcan.
  const stopVoices = onVoicesChanged(() => {
    if (!voiceSel.isConnected) return stopVoices();
    const keep = voiceSel.value;
    voiceSel.replaceChildren(...voiceOptions());
    voiceSel.value = keep;
    refreshCheck();
  });
  const auto = h('input', { type: 'checkbox', checked: s.settings.autoListen });
  const pauseSel = h('select', { 'aria-label': 'Pausa para enviar' }, SEND_PAUSES.map(ms => h('option', { value: ms, selected: ms === sendPauseMs() },
    `${(ms / 1000).toLocaleString('es')} s${ms === 2000 ? ' (rápido)' : ms === 3000 ? ' (normal)' : ms === 6000 ? ' (para pensar con calma)' : ''}`)));
  const haptics = h('input', { type: 'checkbox', checked: s.settings.haptics !== false });
  const solo = h('input', { type: 'checkbox', checked: s.settings.oneCharacter !== false });
  const comedy = h('input', { type: 'checkbox', checked: !!s.settings.comedy });
  const u = s.usage || { input: 0, output: 0, calls: 0 };

  mount(h('div.screen.settings', {},
    h('div.topbar', {}, h('button.icon', { 'aria-label': 'Volver', onclick: () => back() }, '←'), h('h2', {}, '⚙️ Ajustes')),
    h('label', {}, 'Clave de API de DeepSeek'), key,
    h('div.row', {}, testBtn), connOut,
    h('label', {}, 'Modelo'), model, modelList,
    h('p.muted', {}, 'Por defecto deepseek-flash. Puede poner otro modelo compatible.'),
    h('label', {}, 'Dirección de la API'), baseUrl,
    h('h3', {}, 'Nivel de inglés'),
    h('p.muted', {}, '🔓 Los 6 niveles están abiertos, igual que todos los lugares, temas y lecciones: elija el que quiera. El nivel solo cambia cómo le hablan (velocidad, ayudas, vocabulario).'),
    levelEd.el,
    h('h3', {}, 'Mi plan'), plan.el,
    h('h3', {}, 'Micrófono y voz'), voiceCheck,
    h('label', {}, 'Tipo de voz'), engineSel,
    naturalBox, phoneBox,
    h('div.row', {},
      h('button.small', { onclick: () => { store.update(saveVoice); speak("Hi! I'm so glad to meet you. How was your day?", { character: { voice: { gender: 'female' } } }); } }, '🔊 Probar voz'),
      h('button.small', { onclick: () => practicePronunciation('Hello, how are you today?', { onResult: refreshCheck }) }, '🎤 Probar micrófono')),
    h('label.check', {}, auto, ' 🎙 Manos libres: escuchar solo cuando termina el personaje y enviar tras una pausa'),
    h('label', {}, 'Cuando deja de hablar, enviar tras un silencio de'), pauseSel,
    h('p.muted', {}, 'Antes de su primera palabra tiene 20 segundos para pensar. Si le corta las frases mientras piensa, súbalo. Para enviar sin esperar, toque el micrófono.'),
    h('h3', {}, 'Charlas'),
    h('label.check', {}, solo, ' 👩 Una sola compañera en todas las charlas: Amy, con voz de mujer y los labios al ritmo de la voz'),
    h('p.muted', {}, 'Amy hace el papel de cada lugar (barista, médica, recepcionista…). Si lo quita, vuelven las demás compañeras con sus imágenes; los papeles de hombre los sigue haciendo Amy, porque la voz es de mujer.'),
    h('label.check', {}, comedy, ' Modo comedia: los personajes bromean más'),
    h('label.check', {}, haptics, ' Vibrar al acertar, fallar o cumplir un objetivo'),
    h('button.small', { onclick: () => { tutorial.reset(); toast('El tutorial se mostrará en su próxima charla', 'good'); } }, '🧭 Ver otra vez el tutorial'),
    h('button.primary.wide', {
      onclick: () => {
        store.update(st => {
          st.settings.apiKey = key.value.trim();
          st.settings.model = model.value.trim() || 'deepseek-flash';
          st.settings.baseUrl = baseUrl.value.trim() || 'https://api.deepseek.com';
          saveVoice(st);
          st.settings.autoListen = auto.checked;
          st.settings.sendPauseMs = +pauseSel.value;
          st.settings.haptics = haptics.checked;
          st.settings.comedy = comedy.checked;
          st.settings.oneCharacter = solo.checked;
          plan.apply(st);
        });
        applyCast(solo.checked);
        levelEd.apply();
        toast('Guardado', 'good');
        back();
      },
    }, 'Guardar'),
    spendSettings(s, u, again),
    h('div.card', {}, h('b', {}, '📒 Mi bitácora de errores'),
      h('p.muted', {}, 'Los errores de sus charlas que el coach vigila, y los de su cerebro de inglés. Desde aquí se marcan como resueltos y se copian para el cerebro.'),
      h('button.small', { onclick: () => bitacora.bitacoraScreen({ back: again }) }, `Abrir (${bitacora.activeErrors().length} activos)`)),
    h('div.card', {}, h('b', {}, '💾 Copia de seguridad'),
      h('p.muted', {}, safety.lastBackupText(s) + ' La copia no lleva su clave de DeepSeek: al importarla se conserva la de este teléfono.'),
      h('p.muted', {}, safety.storageText(s)),
      h('div.row', {},
        h('button.small', { onclick: async () => { if (await safety.saveBackup()) again(); } }, 'Exportar'),
        h('button.small', { onclick: () => { const f = h('input', { type: 'file', accept: 'application/json' }); f.onchange = async () => { try { store.importJson(await f.files[0].text()); toast('Importado', 'good'); home(); } catch { toast('Archivo no válido', 'bad'); } }; f.click(); } }, 'Importar'),
        h('button.small.danger', { onclick: () => { if (confirm('¿Borrar todo su progreso? No se puede deshacer.')) { store.reset(); home(); } } }, 'Borrar todo'))),
    h('div.card', {}, h('b', {}, `📱 Versión de Charla: ${shortVersion()}`),
      h('p.muted', {}, 'Al volver a la app se revisa sola si hay una versión nueva y se actualiza.'),
      h('button.small', { onclick: () => checkForUpdate({ manual: true, beforeReload: noteAway }) }, '🔄 Buscar actualización'))));
}

// Gasto: lo de este mes, el tope y la pausa (se guardan al cambiarlos).
function spendSettings(s, u, again) {
  const st = spendStatus(s);
  const cap = h('input.text-input', { type: 'number', min: 0, step: 0.5, value: String(s.settings.monthlyCap ?? 3), 'aria-label': 'Tope mensual en dólares',
    onchange: e => { store.update(x => { x.settings.monthlyCap = Math.max(0, Number(e.target.value) || 0); }); again(); } });
  const block = h('input', { type: 'checkbox', checked: !!s.settings.capBlock, onchange: e => store.update(x => { x.settings.capBlock = e.target.checked; }) });
  const p = PRICES[s.settings.model] || PRICES['deepseek-flash'];
  return h('div.card', {}, h('b', {}, '💰 Gasto en DeepSeek'),
    h('p', {}, `Este mes: ${usd(st.usd)}${st.cap ? ` de ${usd(st.cap)}` : ''} · ${st.calls} llamadas`),
    st.cap ? progressBar(Math.min(1, st.pct), st.level === 'over' ? 'var(--bad)' : st.level === 'near' ? 'var(--warn)' : '') : null,
    h('label', {}, 'Tope del mes (US$, 0 = sin tope)', cap),
    h('label.check', {}, block, ' Al llegar al tope, pausar la IA hasta el mes siguiente'),
    h('p.muted', {}, `Calculado con el precio más caro de DeepSeek (hora pico: US$${p.miss} por millón de tokens de entrada y US$${p.out} de salida); fuera de esas horas cuesta la mitad. En total: ${u.calls} llamadas, ${u.input.toLocaleString()} tokens de entrada y ${u.output.toLocaleString()} de salida.`));
}

// ---------------- Arranque ----------------
window.addEventListener('error', e => console.error(e.error || e.message));
// El audio de la voz natural solo puede sonar después de un toque: se activa con el primero.
window.addEventListener('pointerdown', unlockAudio, { capture: true });
if (store.get().settings.voiceEngine === 'natural') setTimeout(loadNatural, 1500); // después de pintar el inicio
// Avisa una vez al cruzar el 80 % o el tope de gasto del mes.
window.addEventListener('charla:spend', e => toast(e.detail.level === 'over' ? `💰 Llegó a su tope del mes (${usd(e.detail.cap)})` : `💰 Ya usó el 80 % de su tope del mes (${usd(e.detail.usd)} de ${usd(e.detail.cap)})`, 'bad'));
store.persistStorage();   // que el navegador no borre los datos

// Al salir a la pantalla del teléfono se anota dónde estaba. Si Android cerró la app para liberar
// memoria, al volver se abre en el mismo lugar (la charla sigue tal cual) en vez de empezar de cero.
const AWAY_KEY = 'charla.away';
const RETURN_WINDOW_MS = 30 * 60 * 1000;
let awayAt = 0;
function noteAway() {
  awayAt = Date.now();
  const screen = document.querySelector('#app > .convo') ? 'convo' : document.querySelector('#app > .dashboard') ? 'cover'
    : document.querySelector('#app > .mil') ? 'mil' : 'home';
  try { localStorage.setItem(AWAY_KEY, JSON.stringify({ at: awayAt, screen })); } catch {}
}
// En una charla o repasando, antes de actualizar se pregunta (la recarga vuelve a la misma pantalla).
const busyScreen = () => !!document.querySelector('#app > .convo, #app > .mil');
let checkedAt = 0;
function updateCheck() {
  if (Date.now() - checkedAt < 60000) return;
  checkedAt = Date.now();
  checkForUpdate({ busy: busyScreen, beforeReload: noteAway });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return noteAway();
  updateCheck();
  // Volvió sin que la app se cerrara: la pantalla queda igual. La portada y el inicio se
  // actualizan (meta del día, racha, mensajes) sin moverse de donde estaba.
  if (awayAt && Date.now() - awayAt > 60000) {
    const y = window.scrollY;
    if (document.querySelector('#app > .dashboard')) cover();
    else if (document.querySelector('#app > .home')) home();
    else return;
    window.scrollTo(0, y);
  }
});
window.addEventListener('pagehide', noteAway);

export function boot() {
  applyCast(store.get().settings.oneCharacter !== false);
  // Las mil palabras ya vienen en la app: si quedó un mazo importado de la versión anterior, se borra (~60 MB).
  try {
    if (!localStorage.getItem('charla.mazoBorrado')) { indexedDB?.deleteDatabase('charla-mazo'); localStorage.setItem('charla.mazoBorrado', '1'); }
  } catch {}
  let away = null;
  try { away = JSON.parse(localStorage.getItem(AWAY_KEY) || 'null'); } catch {}
  try { localStorage.removeItem(AWAY_KEY); } catch {}
  const recent = away && Date.now() - away.at < RETURN_WINDOW_MS;
  const s = store.get();
  if (recent && away.screen === 'convo' && s.onboarded && s.draft) return resumeDraft(s.draft);
  if (recent && away.screen === 'home' && s.onboarded) return home();
  if (recent && away.screen === 'mil' && s.onboarded) return milScreen({ home: cover });
  cover();
}
boot();
