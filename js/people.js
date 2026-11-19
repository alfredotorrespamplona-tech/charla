// Personajes: relación que sube y baja, ficha con cosas por descubrir, contactos y «conozca a alguien nuevo».
// Modelado sobre LingoLooper (estados Enemy/Nemesis, «+N para ser amigos», ~20 piezas de historia del avatar
// que se desbloquean conversando, borrar memoria, quitar de contactos, sorteo de personajes nuevos).
// Las piezas de historia las inventa el modelo al desbloquearlas, coherentes con el personaje.
import * as store from './store.js';
import { h, mount, sheet, closeSheet, toast, progressBar } from './ui.js';
import { miniAvatar } from './avatar.js';
import { roleLine } from './cast.js';
import { PLACES, CHARACTERS, RELATIONSHIP_STATUS, relationshipStatus, AFFECTION_MIN, AFFECTION_PER_LEVEL } from './data.js';

export { AFFECTION_MIN, AFFECTION_PER_LEVEL };

export function levelFor(affection) { return Math.floor(affection / AFFECTION_PER_LEVEL); }

// Cuánto cariño falta para el siguiente estado (o null si ya es el máximo).
export function nextStatus(rel) {
  const next = RELATIONSHIP_STATUS.find(r => r.min > rel.level);
  if (!next) return null;
  return { label: next.label, points: next.min * AFFECTION_PER_LEVEL - rel.affection };
}

// Barra dentro del nivel actual (funciona también con cariño negativo).
export function levelFraction(rel) {
  return (((rel.affection % AFFECTION_PER_LEVEL) + AFFECTION_PER_LEVEL) % AFFECTION_PER_LEVEL) / AFFECTION_PER_LEVEL;
}

// 20 cosas por descubrir de cada personaje: se abren con charlas y con amistad.
export const DISCOVERIES = [
  { key: 'hometown', emoji: '🏡', label: 'Dónde creció', en: 'where you grew up', conv: 1, level: 0 },
  { key: 'job', emoji: '💼', label: 'Cómo llegó a su trabajo', en: 'how you ended up in your job', conv: 2, level: 0 },
  { key: 'hobby', emoji: '🎨', label: 'Su pasatiempo', en: 'your favourite hobby and how you started it', conv: 3, level: 0 },
  { key: 'food', emoji: '🍜', label: 'Su comida favorita', en: 'your favourite food', conv: 4, level: 0 },
  { key: 'place', emoji: '📍', label: 'Su rincón de la ciudad', en: 'your favourite spot in the city', conv: 5, level: 1 },
  { key: 'family', emoji: '👪', label: 'Su familia', en: 'your family', conv: 6, level: 1 },
  { key: 'music', emoji: '🎵', label: 'Su música', en: 'the music you love', conv: 7, level: 1 },
  { key: 'pet', emoji: '🐾', label: 'Sus mascotas', en: 'your pets (current, past or wished for)', conv: 8, level: 1 },
  { key: 'childhood', emoji: '🧸', label: 'Un recuerdo de niñez', en: 'a childhood memory', conv: 9, level: 2 },
  { key: 'travel', emoji: '✈️', label: 'Un viaje inolvidable', en: 'an unforgettable trip', conv: 10, level: 2 },
  { key: 'peeve', emoji: '😤', label: 'Lo que le molesta', en: 'a small thing that annoys you', conv: 11, level: 2 },
  { key: 'bestday', emoji: '🌟', label: 'Su mejor día', en: 'the best day of your life', conv: 12, level: 3 },
  { key: 'hardday', emoji: '🌧️', label: 'Un día difícil', en: 'a hard time you went through', conv: 13, level: 3 },
  { key: 'goal', emoji: '🎯', label: 'Su meta de este año', en: 'your goal for this year', conv: 14, level: 3 },
  { key: 'guilty', emoji: '🍫', label: 'Su placer culpable', en: 'a guilty pleasure', conv: 15, level: 4 },
  { key: 'fear', emoji: '😱', label: 'Su miedo', en: 'something you are afraid of', conv: 16, level: 4 },
  { key: 'love', emoji: '💕', label: 'Su vida amorosa', en: 'your love life', conv: 17, level: 5 },
  { key: 'dream', emoji: '💭', label: 'Su gran sueño', en: 'your biggest dream', conv: 18, level: 5 },
  { key: 'motto', emoji: '📜', label: 'Su lema', en: 'a personal motto you live by', conv: 19, level: 6 },
  { key: 'secret', emoji: '🤫', label: 'Su secreto', en: 'a secret very few people know', conv: 20, level: 6 },
];

// La siguiente cosa que se puede descubrir con esta relación (o null).
export function nextDiscovery(rel) {
  const facts = rel.facts || {};
  return DISCOVERIES.find(d => !facts[d.key] && rel.conversations >= d.conv && rel.level >= d.level) || null;
}

export function discoveryRequirement(d) {
  const st = relationshipStatus(d.level);
  return d.level > 0 ? `${d.conv} charlas y ser ${st.label}` : `${d.conv} ${d.conv === 1 ? 'charla' : 'charlas'}`;
}

export function forgetMemory(charId) {
  store.update(() => { store.relationship(charId).memory = []; });
}

export function removeContact(charId) {
  store.update(s => { delete s.relationships[charId]; });
}

export function contacts(s = store.get()) {
  return Object.entries(s.relationships)
    .filter(([id, r]) => CHARACTERS[id] && r.conversations > 0)
    .map(([id, r]) => ({ character: CHARACTERS[id], rel: r }))
    .sort((a, b) => b.rel.affection - a.rel.affection);
}

// Dónde vive cada personaje (el primer lugar abierto donde aparece).
export function homePlaceOf(charId, isOpen = () => true) {
  const all = PLACES.filter(p => p.characters.includes(charId));
  return all.find(isOpen) || all[0];
}

// «Conozca a alguien nuevo»: personajes que todavía no conoce, en lugares abiertos. El primero que se le
// propone es el que más comparte sus intereses (como el primer avatar que elige LingoLooper según su plan).
export function newPeople(s, isOpen, rnd = Math.random) {
  const known = new Set(Object.entries(s.relationships).filter(([, r]) => r.conversations > 0).map(([id]) => id));
  const mine = (s.interests || []).map(x => x.toLowerCase());
  const score = c => c.interests.filter(i => mine.some(m => i.toLowerCase().includes(m) || m.includes(i.toLowerCase()))).length;
  const pool = Object.values(CHARACTERS)
    .filter(c => !known.has(c.id) && PLACES.some(p => p.characters.includes(c.id) && isOpen(p)))
    .map(c => ({ c, k: score(c) * 10 + rnd() }))
    .sort((a, b) => b.k - a.k)
    .map(x => x.c);
  return pool;
}

// ---------------- Pantallas ----------------
let nav = { home() {}, chooseMission() {}, isOpen: () => true };
export function setPeopleNav(n) { nav = { ...nav, ...n }; }

export function relationLine(rel) {
  const st = relationshipStatus(rel.level);
  const nx = nextStatus(rel);
  return nx ? `${st.label} · +${nx.points} de cariño para ser ${nx.label}` : `${st.label} · relación al máximo`;
}

// Ficha del personaje.
export function characterSheet(character, { onChange } = {}) {
  const rel = store.relationship(character.id);
  const st = relationshipStatus(rel.level);
  const facts = rel.facts || {};
  const found = DISCOVERIES.filter(d => facts[d.key]).length;
  const place = homePlaceOf(character.id, nav.isOpen);
  const confirmBtn = (label, ask, action) => h('button.small', {
    onclick: e => {
      const b = e.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = ask; return; }
      action();
    },
  }, label);

  sheet(h('div.char-sheet', {},
    h('div.char-head', {}, miniAvatar(character),
      h('div', {}, h('h3', {}, character.name), h('div.muted', {}, roleLine(character)),
        h('div.muted', {}, `De ${character.hometown}`))),
    h('div.card', {},
      h('b', {}, `${rel.level < 0 ? '💔' : '💛'} ${st.label}`),
      progressBar(levelFraction(rel), rel.level < 0 ? '#c0392b' : '#f2b134'),
      h('small.muted', {}, relationLine(rel)),
      h('div.muted', {}, rel.conversations
        ? `${rel.conversations} ${rel.conversations === 1 ? 'charla' : 'charlas'}${rel.metDate ? ' · se conocieron el ' + new Date(rel.metDate).toLocaleDateString('es') : ''}`
        : 'Todavía no han hablado.'),
      rel.level < 0 ? h('p.muted', {}, 'Está molesto con usted. Sea amable, discúlpese y complete misiones para recuperar la relación.') : null),
    h('div.chips', {},
      h('span.chip', {}, `🧠 ${character.personality}`),
      h('span.chip', {}, `💬 ${character.style}`),
      character.interests.map(i => h('span.chip', {}, i))),
    h('h4', {}, `🔍 Cosas por descubrir (${found}/${DISCOVERIES.length})`),
    h('div.discoveries', {}, DISCOVERIES.map(d => facts[d.key]
      ? h('div.discovery', {}, h('b', {}, `${d.emoji} ${d.label}`), h('p', {}, facts[d.key]))
      : h('div.discovery.locked', {}, h('b', {}, `🔒 ${d.label}`), h('small.muted', {}, `Con ${discoveryRequirement(d)}`)))),
    rel.memory?.length ? h('div', {}, h('h4', {}, '📝 Lo que recuerda de usted'),
      h('ul.memory', {}, rel.memory.slice().reverse().map(m => h('li', {}, m)))) : null,
    place ? h('button.primary.wide', { onclick: () => { closeSheet(); nav.chooseMission(place, character); } }, `Hablar con ${character.name}`) : null,
    rel.conversations ? h('div.row.wide.danger-zone', {},
      confirmBtn('🧽 Borrar su memoria', '¿Seguro? Toque otra vez', () => { forgetMemory(character.id); toast(`${character.name} ya no recuerda sus charlas`); closeSheet(); onChange?.(); }),
      confirmBtn('🗑️ Quitar de contactos', '¿Seguro? Se pierde todo', () => { removeContact(character.id); toast(`${character.name} salió de sus contactos`); closeSheet(); onChange?.(); })) : null));
}

// Contactos: personas con las que ya habló, y sorteo de alguien nuevo.
export function contactsScreen() {
  const s = store.get();
  const list = contacts(s);
  const fresh = newPeople(s, nav.isOpen);
  const draw = fresh.slice(0, 3);
  mount(h('div.screen', {},
    h('div.topbar', {}, h('button.icon', { onclick: () => nav.home() }, '←'), h('h2', {}, '👥 Contactos')),
    h('h3', {}, '✨ Conozca a alguien nuevo'),
    draw.length ? h('div.characters', {}, draw.map(c => personCard(c, homePlaceOf(c.id, nav.isOpen), true)))
      : h('p.muted', {}, 'Ya conoce a todas las personas de los lugares abiertos.'),
    fresh.length > 3 ? h('button.link', { onclick: () => contactsScreen() }, '🎲 Otras personas') : null,
    h('h3', {}, `Sus contactos (${list.length})`),
    list.length ? h('div.characters', {}, list.map(({ character }) => personCard(character, homePlaceOf(character.id, nav.isOpen), false)))
      : h('p.muted', {}, 'Todavía no ha hablado con nadie.')));
}

function personCard(c, place, isNew) {
  const rel = store.relationship(c.id);
  return h('div.character-card.person', {},
    h('button.person-main', { onclick: () => characterSheet(c, { onChange: contactsScreen }) },
      miniAvatar(c),
      h('div', {}, h('b', {}, c.name), h('div.muted', {}, roleLine(c)),
        h('div.rel', {}, isNew ? `${place?.emoji || ''} ${place?.name || ''} · le gusta ${c.interests[0]}` : relationLine(rel)))),
    place ? h('button.small', { onclick: () => nav.chooseMission(place, c) }, 'Hablar') : null);
}
