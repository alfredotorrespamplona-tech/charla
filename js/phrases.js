// Frases esenciales: las expresiones más usadas del inglés hablado, en bloques que se dicen de una vez
// («chunks»). Las 1000–2000 palabras más frecuentes cubren cerca del 80 % de lo que se oye, y buena parte
// de una conversación son frases hechas: aprenderlas enteras da fluidez antes que la gramática.
// Contenido propio, ordenado por nivel. En cada frase, la palabra entre [corchetes] es el hueco de la
// tarjeta «Complete la frase». Los id (paquete-n) se guardan en el vocabulario: no reordenar, solo agregar.
// Además vienen los paquetes del «cerebro de inglés» del usuario (js/cerebro.js, generado por
// herramientas/importar_cerebro.py): frases cotidianas, idioms, verbos y las 1000 palabras de Refold.
import { CEREBRO_PACKS } from './cerebro.js';

const OWN_PACKS = [
  { id: 'basics', name: 'Para empezar', level: 'A1', icon: '👋', phrases: [
    ['Hi, how [are] you?', 'Hola, ¿cómo estás?'],
    ["I'm [fine], thanks.", 'Estoy bien, gracias.'],
    ['Nice to [meet] you.', 'Mucho gusto.'],
    ["What's your [name]?", '¿Cómo te llamas?'],
    ['Where are you [from]?', '¿De dónde eres?'],
    ['I live in a big [city].', 'Vivo en una ciudad grande.'],
    ['See you [later].', 'Nos vemos luego.'],
    ['Thank you very [much].', 'Muchas gracias.'],
    ["You're [welcome].", 'De nada.'],
    ['Have a nice [day].', 'Que tengas un buen día.'],
  ] },
  { id: 'courtesy', name: 'Cortesía', level: 'A1', icon: '🤝', phrases: [
    ['[Excuse] me.', 'Disculpe. / Con permiso.'],
    ["I'm [sorry].", 'Lo siento.'],
    ['No [problem].', 'No hay problema.'],
    ["Don't [worry].", 'No te preocupes.'],
    ['Of [course].', 'Claro. / Por supuesto.'],
    ['Can you [help] me?', '¿Me puedes ayudar?'],
    ['Thanks for your [help].', 'Gracias por tu ayuda.'],
    ["That's very [kind] of you.", 'Muy amable de tu parte.'],
    ["Sorry, I'm [late].", 'Perdón por llegar tarde.'],
    ['After [you].', 'Pase usted primero.'],
  ] },
  { id: 'understand', name: 'Entender y aclarar', level: 'A1', icon: '💬', phrases: [
    ["Sorry, I don't [understand].", 'Perdón, no entiendo.'],
    ['Could you say that [again]?', '¿Podrías repetirlo?'],
    ['Could you speak more [slowly]?', '¿Podrías hablar más despacio?'],
    ['What does that [mean]?', '¿Qué significa eso?'],
    ['How do you [say] this in English?', '¿Cómo se dice esto en inglés?'],
    ['How do you [spell] it?', '¿Cómo se escribe?'],
    ["I'm still [learning] English.", 'Todavía estoy aprendiendo inglés.'],
    ['What do you [mean]?', '¿Qué quieres decir?'],
    ['Let me [think].', 'Déjame pensar.'],
    ['Do you speak [Spanish]?', '¿Hablas español?'],
  ] },
  { id: 'asking', name: 'Pedir cosas', level: 'A1', icon: '🛒', phrases: [
    ["I'd [like] a coffee, please.", 'Quisiera un café, por favor.'],
    ['How [much] is it?', '¿Cuánto cuesta?'],
    ['Can I [pay] by card?', '¿Puedo pagar con tarjeta?'],
    ['Can I have the [bill], please?', '¿Me trae la cuenta, por favor?'],
    ['Where is the [bathroom]?', '¿Dónde está el baño?'],
    ["I'm [looking] for the station.", 'Estoy buscando la estación.'],
    ['Do you have this in a bigger [size]?', '¿Tiene esto en una talla más grande?'],
    ['Can I [ask] you something?', '¿Te puedo preguntar algo?'],
    ['Is it OK if I [sit] here?', '¿Puedo sentarme aquí?'],
    ["I'll [take] it.", 'Me lo llevo.'],
  ] },
  { id: 'time', name: 'Tiempo y planes', level: 'A1', icon: '📅', phrases: [
    ['What [time] is it?', '¿Qué hora es?'],
    ['See you [tomorrow].', 'Nos vemos mañana.'],
    ["I'm [free] on Saturday.", 'Estoy libre el sábado.'],
    ['Are you [busy] tonight?', '¿Estás ocupado esta noche?'],
    ["Let's [meet] at six.", 'Veámonos a las seis.'],
    ["I'll be there in ten [minutes].", 'Llego en diez minutos.'],
    ['What are you doing this [weekend]?', '¿Qué vas a hacer este fin de semana?'],
    ['I usually get up [early].', 'Normalmente me levanto temprano.'],
    ['Not right [now].', 'Ahora no.'],
    ['Maybe next [time].', 'Quizás la próxima vez.'],
  ] },
  { id: 'feelings', name: 'Cómo me siento', level: 'A2', icon: '🙂', phrases: [
    ["I'm a bit [tired].", 'Estoy un poco cansado.'],
    ["I'm a little [nervous].", 'Estoy un poco nervioso.'],
    ["I'm really [happy] for you.", 'Me alegro mucho por ti.'],
    ['I feel much [better].', 'Me siento mucho mejor.'],
    ["I'm not [sure].", 'No estoy seguro.'],
    ["I'm in a [hurry].", 'Tengo prisa.'],
    ["I'm [starving].", 'Me muero de hambre.'],
    ["I'm [bored].", 'Estoy aburrido.'],
    ['What a [relief]!', '¡Qué alivio!'],
    ["I can't [wait]!", '¡Qué ganas! / No puedo esperar.'],
  ] },
  { id: 'reactions', name: 'Reaccionar en una charla', level: 'A2', icon: '🗣', phrases: [
    ['Oh, I [see].', 'Ah, ya entiendo.'],
    ["That's [interesting].", 'Qué interesante.'],
    ['No [way]!', '¡No puede ser!'],
    ['Good for [you]!', '¡Qué bien por ti!'],
    ["That's too [bad].", 'Qué lástima.'],
    ['Me [too].', 'Yo también.'],
    ['Me [neither].', 'Yo tampoco.'],
    ['Sounds [good].', 'Me parece bien.'],
    ['Are you [serious]?', '¿En serio?'],
    ['That sounds [great]!', '¡Suena genial!'],
  ] },
  { id: 'invite', name: 'Invitar y proponer', level: 'A2', icon: '🎉', phrases: [
    ['Would you like to [come]?', '¿Te gustaría venir?'],
    ["Why don't we go to the [beach]?", '¿Por qué no vamos a la playa?'],
    ['How [about] a coffee?', '¿Qué tal un café?'],
    ["Let's [do] it.", 'Hagámoslo.'],
    ["I'd [love] to.", 'Me encantaría.'],
    ["Sorry, I [can't].", 'Lo siento, no puedo.'],
    ['Do you want to [join] us?', '¿Quieres venir con nosotros?'],
    ['Count me [in].', 'Cuenta conmigo.'],
    ['Let me [know].', 'Me avisas.'],
    ["It's up to [you].", 'Como tú quieras. / Tú decides.'],
  ] },
  { id: 'opinions', name: 'Dar mi opinión', level: 'B1', icon: '💭', phrases: [
    ['I [think] so.', 'Creo que sí.'],
    ["I don't think [so].", 'Creo que no.'],
    ['In my [opinion], it is too expensive.', 'En mi opinión, es demasiado caro.'],
    ['I [agree] with you.', 'Estoy de acuerdo contigo.'],
    ["I'm not so sure about [that].", 'No estoy tan seguro de eso.'],
    ['That makes [sense].', 'Tiene sentido.'],
    ['It [depends].', 'Depende.'],
    ["To be [honest], I don't like it.", 'Para ser sincero, no me gusta.'],
    ["You're [right].", 'Tienes razón.'],
    ["That's a good [point].", 'Buen punto.'],
  ] },
  { id: 'everyday', name: 'Verbos de todos los días', level: 'B1', icon: '🔁', phrases: [
    ['I have to [go].', 'Me tengo que ir.'],
    ["I'm [going] to stay home.", 'Me voy a quedar en casa.'],
    ['I used to [live] there.', 'Antes vivía allí.'],
    ["I've never [been] there.", 'Nunca he estado allí.'],
    ["I'm looking [forward] to it.", 'Tengo muchas ganas de que llegue.'],
    ['It [takes] twenty minutes.', 'Se tarda veinte minutos.'],
    ['We ran [out] of milk.', 'Se nos acabó la leche.'],
    ['Let me [check].', 'Déjame revisar.'],
    ["I'm getting [used] to it.", 'Me estoy acostumbrando.'],
    ['I [forgot] my phone.', 'Se me olvidó el teléfono.'],
  ] },
  { id: 'problems', name: 'Resolver problemas', level: 'B1', icon: '⚠', phrases: [
    ["It doesn't [work].", 'No funciona.'],
    ["I think there's a [mistake].", 'Creo que hay un error.'],
    ["This isn't what I [ordered].", 'Esto no es lo que pedí.'],
    ['Could you [check] it again?', '¿Podría revisarlo otra vez?'],
    ['I [lost] my keys.', 'Perdí mis llaves.'],
    ['I need some [help] with this.', 'Necesito ayuda con esto.'],
    ['Can I speak to the [manager]?', '¿Puedo hablar con el encargado?'],
    ["I'll call you [back].", 'Te devuelvo la llamada.'],
    ['What should I [do]?', '¿Qué debería hacer?'],
    ['It was my [fault].', 'Fue mi culpa.'],
  ] },
  { id: 'connectors', name: 'Unir ideas', level: 'B1', icon: '🧭', phrases: [
    ['By the [way], …', 'Por cierto, …'],
    ['[Anyway], …', 'En fin, … / Bueno, …'],
    ['On the other [hand], …', 'Por otro lado, …'],
    ['As far as I [know], …', 'Que yo sepa, …'],
    ['In [fact], …', 'De hecho, …'],
    ['For [example], …', 'Por ejemplo, …'],
    ["That's [why] …", 'Por eso …'],
    ['First of [all], …', 'Primero que todo, …'],
    ['In the [end], …', 'Al final, …'],
    ['[Actually], …', 'En realidad, …'],
  ] },
];

const ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const norm = t => (t || '').toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Secciones de la pantalla de frases.
export const GROUPS = [
  { id: 'charla', name: 'Frases esenciales' },
  { id: 'cerebro', name: 'De su cerebro de inglés' },
  { id: 'mil', name: 'Las 1000 palabras más usadas (Refold)' },
];

// Todas las frases con su id. Si una frase del cerebro ya está en otro paquete, se deja solo la primera.
const seen = new Set();
const make = (pack, p) => {
  const en = p.raw.replace(/[[\]]/g, '');
  if (seen.has(norm(en))) return null;
  seen.add(norm(en));
  return { ...p, pack: pack.id, level: pack.level, en, key: norm(en), gap: (p.raw.match(/\[([^\]]+)\]/) || [])[1] || '' };
};
const ALL = [
  ...OWN_PACKS.map(pk => ({ ...pk, group: 'charla', phrases: pk.phrases.map(([raw, es], i) => ({ id: `${pk.id}-${i}`, raw, es })) })),
  ...CEREBRO_PACKS,
];
export const PHRASES = [];
const BY_PACK = new Map();
const BY_ID = new Map();
for (const pk of ALL) {
  const list = pk.phrases.map(p => make(pk, p)).filter(Boolean);
  BY_PACK.set(pk.id, list);
  for (const p of list) { PHRASES.push(p); BY_ID.set(p.id, p); }
}
export const PACKS = ALL.map(({ phrases, ...pk }) => ({ ...pk, total: BY_PACK.get(pk.id).length })).filter(pk => pk.total);

export function phraseById(id) { return BY_ID.get(id); }
export function packPhrases(packId) { return BY_PACK.get(packId) || []; }

// Frases ya aprendidas: las que están en el vocabulario (por id o porque guardó la misma frase).
export function learnedIds(vocab) {
  const ids = new Set(vocab.map(v => v.coreId).filter(Boolean));
  const texts = new Set(vocab.map(v => norm(v.text)));
  for (const p of PHRASES) if (texts.has(p.key)) ids.add(p.id);
  return ids;
}

export function packProgress(pack, vocab, done = learnedIds(vocab)) {
  const list = packPhrases(pack.id);
  return { learned: list.filter(p => done.has(p.id)).length, total: list.length };
}

// Paquete recomendado: el primero sin terminar, empezando por el nivel del usuario o el más bajo pendiente.
export function recommendedPack(vocab, rankCode = 'A1') {
  const done = learnedIds(vocab);
  const open = PACKS.filter(p => packPhrases(p.id).some(x => !done.has(x.id)));
  if (!open.length) return null;
  const lvl = ORDER.indexOf(rankCode);
  return open.find(p => ORDER.indexOf(p.level) <= lvl) || open[0];
}

// Las próximas n frases sin aprender de un paquete.
export function nextPhrases(packId, vocab, n = 5) {
  const done = learnedIds(vocab);
  return packPhrases(packId).filter(p => !done.has(p.id)).slice(0, n);
}

// Elementos del vocabulario para guardar las frases aprendidas.
export function toVocab(p, now = Date.now()) {
  return { text: p.en, translation: p.es, type: 'Phrase', source: 'core', coreId: p.id, context: '', score: 0, createdAt: now, lastUsed: 0, lastReviewed: 0 };
}

// Tarjetas hechas aquí mismo (sin IA, al instante y sin gastar): los distractores salen de otras frases.
export function coreCard(v, family) {
  const p = phraseById(v.coreId);
  if (!p) return null;
  const card = coreCardFor(p, family);
  return card && { ...card, origin: ORIGIN[PACKS.find(x => x.id === p.pack)?.group] };
}

const ORIGIN = { charla: 'Frase esencial', cerebro: 'De su cerebro de inglés', mil: 'Las 1000 palabras más usadas' };

function coreCardFor(p, family) {
  const start = PHRASES.indexOf(p);
  const rotate = list => [...list.slice(start % (list.length || 1)), ...list.slice(0, start % (list.length || 1))];
  const uniq = (first, list, n) => [first, ...[...new Set(list)].filter(x => x && x !== first)].slice(0, n + 1);
  if (family === 'meaning') {
    // En los idioms, una de las opciones falsas es la traducción palabra por palabra (la trampa).
    const same = rotate(packPhrases(p.pack).filter(x => x.id !== p.id)).map(x => x.es);
    return { item: p.en, family, core: true, sentence: p.en, answer: p.es, options: uniq(p.es, [p.trap, ...same], 3), translation: '' };
  }
  if (family === 'completion' && p.gap) {
    // En los verbos, las opciones falsas son las otras formas del mismo verbo (was / have been / had been…).
    const sentence = p.raw.replace(/\[[^\]]+\]/, '{{gap}}');
    const words = norm(sentence.replace('{{gap}}', ' ')).split(' ');
    const others = rotate(PHRASES.filter(x => x.id !== p.id && x.pack === p.pack)).concat(rotate(PHRASES.filter(x => x.pack !== p.pack)));
    const pool = [...(p.alts || []), ...others.map(x => x.gap)]
      .filter(g => g && norm(g) !== norm(p.gap) && !words.includes(norm(g)));
    return { item: p.en, family, core: true, sentence, answer: p.gap, options: uniq(p.gap, pool, 3), hint: p.es, translation: p.es };
  }
  const w = p.en.split(/\s+/).map(x => x.replace(/[,.…?!]+$/, ''));
  const first = w[0].length <= 2 && w[1] && !p.verb ? `${w[0]} ${w[1]}` : w[0];
  return { item: p.en, family: 'recall', core: true, prompt: p.es, answer: p.en, hint: p.verb ? `Verbo: ${p.verb}` : `Empieza con «${first}…»` };
}
