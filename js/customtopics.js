// Temas propios guardados (CustomTopic de LingoLooper): se escriben en español, el modelo los revisa y los
// convierte en una misión (nombre, ícono, papel del personaje, objetivos y expresiones), y quedan guardados
// con las veces jugados, para editarlos o borrarlos.
import * as store from './store.js';
import { chatJson } from './llm.js';
import { rankById } from './data.js';
import { h, sheet, closeSheet, toast, spinner } from './ui.js';

export function customTopicMessages({ text, character, place, rankId }) {
  const rank = rankById(rankId);
  return [
    { role: 'system', content: `A Spanish-speaking English learner (${rank.code}) wrote a situation they want to role-play with ${character.name} (${character.age}, ${character.profession}) at: ${place.scene}
Check it and turn it into a role-play mission. Reject it only if it is sexual, hateful, dangerous or impossible to act out in a conversation.
Return ONLY JSON: {"ok": true|false, "reason": "if not ok: short reason in Spanish",
"name": "short title in Spanish (max 5 words)", "icon": "one emoji", "role": "who the character will play, in Spanish, starting with a noun (e.g. 'vendedor de la tienda')",
"description": "one sentence in Spanish addressed to the learner (tú)", "instruction": "instruction in English for the character: role, situation and one small complication",
"objectives": [{"id": "short_id", "text": "objective in English for the learner"}] (exactly 3), "expressions": ["3 useful English expressions"]}` },
    { role: 'user', content: text },
  ];
}

export function toMission(t) {
  return {
    id: 'ct_' + t.id, icon: t.icon || '✍️', name: t.name, description: t.description || t.text,
    instruction: `${t.instruction} (Play this role: ${t.roleEn || t.role}.)`,
    objectives: t.objectives || [], expressions: t.expressions || [], facets: {}, customTopicId: t.id,
  };
}

// Revisa el texto con el modelo y lo guarda (o actualiza si tiene id).
export async function saveCustomTopic({ text, character, place, rankId, id }) {
  const r = await chatJson('custom_topic', customTopicMessages({ text, character, place, rankId }), { temperature: 0.4, maxTokens: 600 });
  if (!r || r.ok === false) return { ok: false, reason: r?.reason || 'No se pudo usar ese tema.' };
  const topic = {
    id: id || (crypto.randomUUID?.() || String(Date.now())), text,
    name: String(r.name || 'Tema propio').slice(0, 40), icon: r.icon || '✍️', role: r.role || '',
    description: r.description || text, instruction: r.instruction || `Role-play this situation: ${text}`,
    objectives: (r.objectives || []).slice(0, 3).map((o, i) => ({ id: o.id || 'o' + i, text: o.text || String(o) })),
    expressions: (r.expressions || []).slice(0, 3),
    plays: 0, createdAt: Date.now(),
  };
  store.update(s => {
    const i = s.customTopics.findIndex(x => x.id === topic.id);
    if (i >= 0) s.customTopics[i] = { ...s.customTopics[i], ...topic, plays: s.customTopics[i].plays, createdAt: s.customTopics[i].createdAt };
    else s.customTopics.unshift(topic);
  });
  return { ok: true, topic };
}

export function countPlay(id) {
  store.update(s => { const t = s.customTopics.find(x => x.id === id); if (t) { t.plays = (t.plays || 0) + 1; t.lastPlayed = Date.now(); } });
}

export function deleteCustomTopic(id) {
  store.update(s => { s.customTopics = s.customTopics.filter(x => x.id !== id); });
}

// Tarjeta «Tema propio» de la pantalla de misiones: escribir uno nuevo y la lista de guardados.
export function customTopicsCard({ place, character, start, refresh }) {
  const s = store.get();
  const area = h('textarea', { rows: 2, placeholder: 'Ej.: Quiero devolver unos zapatos que me quedaron pequeños' });
  const btn = h('button.primary', { onclick: () => create() }, 'Revisar y guardar');
  const status = h('div');
  let editing = null;

  async function create() {
    const text = area.value.trim();
    if (text.length < 8) { toast('Escriba un poco más de detalle.'); return; }
    btn.disabled = true;
    status.replaceChildren(spinner('Revisando el tema…'));
    try {
      const r = await saveCustomTopic({ text, character, place, rankId: store.get().rank, id: editing });
      if (!r.ok) { status.replaceChildren(h('p.bad', {}, '⚠️ ' + r.reason)); btn.disabled = false; return; }
      toast(editing ? 'Tema actualizado' : `Guardado: ${r.topic.icon} ${r.topic.name}`, 'good');
      refresh();
    } catch (e) {
      status.replaceChildren(h('p.bad', {}, 'No se pudo revisar: ' + e.message));
      btn.disabled = false;
    }
  }

  const row = t => h('div.ctopic', {},
    h('button.ctopic-main', { onclick: () => { countPlay(t.id); start(toMission(t)); } },
      h('span.m-icon', {}, t.icon),
      h('div', {}, h('b', {}, t.name),
        h('div.muted', {}, t.role ? `${character.name} hará de ${t.role}` : t.description),
        h('small.muted', {}, t.plays ? `Jugado ${t.plays} ${t.plays === 1 ? 'vez' : 'veces'}` : 'Sin jugar todavía'))),
    h('div.ctopic-tools', {},
      h('button.tiny', { 'aria-label': 'Editar', onclick: () => { editing = t.id; area.value = t.text; btn.textContent = 'Revisar y actualizar'; area.focus(); } }, '✏️'),
      h('button.tiny', { 'aria-label': 'Borrar', onclick: e => {
        const b = e.currentTarget;
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = '¿Borrar?'; return; }
        deleteCustomTopic(t.id); refresh();
      } }, '🗑')));

  return h('div.card', {},
    h('b', {}, '✍️ Temas propios'),
    h('p.muted', {}, 'Describa en español una situación. Se revisa, se guarda y el personaje la actuará.'),
    s.customTopics.length ? h('div.ctopics', {}, s.customTopics.map(row)) : null,
    area, status, btn);
}
