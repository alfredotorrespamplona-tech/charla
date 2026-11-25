// Tres técnicas del cerebro de inglés que faltaban (v45):
// - Grabarse y compararse (wiki/metodologias/autoevaluacion_grabandote.md): grabar 1 o 2 minutos, oírse con calma,
//   anotar los errores que uno mismo nota y comparar con la primera vez.
// - Diario en inglés (diario_en_ingles.md): escribir sin miedo, releer, y que la IA corrija con su «por qué».
// - Sonidos parecidos: pares de palabras que un hispanohablante confunde (ship / sheep, work / walk, thirteen / thirty).
// Contenido escrito con palabras propias. Sin pantallas (están en practicascreen.js): se prueba con node.
import { tokens } from './pronounce.js';
import { talkStats } from './tecnicas.js';

const str = x => (typeof x === 'string' ? x.trim() : '');
const norm = t => tokens(t).join(' ');
const shuffle = (list, rnd = Math.random) => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// =====================================================================================
// Sonidos parecidos
// =====================================================================================
export const PAIR_ROUND = 10;   // palabras por ronda
// Cada grupo: cómo se hace el sonido (en español, sin jerga) y pares [palabra, significado, palabra, significado]
// que solo cambian en ese sonido.
export const PAIR_GROUPS = [
  { id: 'i-ii', name: '«i» corta o «i» larga', example: 'ship / sheep',
    how: 'La «i» corta es floja y rápida, casi una «e»: ship. La larga se estira sonriendo, como «iii»: sheep. Si las dice igual, «I want to leave» (me quiero ir) suena a «I want to live» (quiero vivir).',
    pairs: [['ship', 'barco', 'sheep', 'oveja'], ['live', 'vivir', 'leave', 'irse'], ['sit', 'sentarse', 'seat', 'asiento'], ['fill', 'llenar', 'feel', 'sentir'],
      ['hit', 'golpear', 'heat', 'calor'], ['still', 'todavía', 'steal', 'robar'], ['rich', 'rico', 'reach', 'alcanzar'], ['bit', 'pedacito', 'beat', 'vencer']] },
  { id: 'a-uh', name: '«a» abierta o «a» floja', example: 'cat / cut',
    how: 'En cat la boca se abre mucho, como entre «a» y «e». En cut es una «a» corta y floja, con la boca casi cerrada.',
    pairs: [['cat', 'gato', 'cut', 'cortar'], ['bag', 'bolsa', 'bug', 'bicho'], ['hat', 'sombrero', 'hut', 'cabaña'], ['cap', 'gorra', 'cup', 'taza'],
      ['ran', 'corrió', 'run', 'correr'], ['match', 'partido', 'much', 'mucho'], ['lack', 'falta', 'luck', 'suerte']] },
  { id: 'e-a', name: '«e» o «a» abierta', example: 'pen / pan',
    how: 'pen es una «e» como en español. pan abre más la boca, entre «a» y «e». Ojo: man es un hombre y men son varios.',
    pairs: [['pen', 'bolígrafo', 'pan', 'sartén'], ['men', 'hombres', 'man', 'hombre'], ['bed', 'cama', 'bad', 'malo'], ['said', 'dijo', 'sad', 'triste'],
      ['then', 'entonces', 'than', 'que (al comparar)']] },
  { id: 'er-or', name: '«er» o «o» larga', example: 'work / walk',
    how: 'En work la lengua se recoge hacia atrás y suena una «er» sin abrir la boca. En walk la boca se redondea como una «o» larga, y la l casi no suena.',
    pairs: [['work', 'trabajar', 'walk', 'caminar'], ['shirt', 'camisa', 'short', 'corto'], ['bird', 'pájaro', 'board', 'tablero'], ['firm', 'empresa', 'form', 'formulario'],
      ['burn', 'quemar', 'born', 'nacido'], ['turn', 'girar', 'torn', 'roto']] },
  { id: 'b-v', name: 'b o v', example: 'best / vest',
    how: 'En español b y v suenan igual; en inglés no. La b junta los dos labios. La v apoya los dientes de arriba en el labio de abajo y vibra.',
    pairs: [['berry', 'baya', 'very', 'muy'], ['best', 'mejor', 'vest', 'chaleco'], ['ban', 'prohibir', 'van', 'camioneta'], ['boat', 'barco', 'vote', 'votar'],
      ['bet', 'apostar', 'vet', 'veterinario'], ['base', 'base', 'vase', 'florero']] },
  { id: 'sh-ch', name: 'sh o ch', example: 'share / chair',
    how: 'sh es el «shh» de pedir silencio: aire seguido, sin golpe. ch es como en «chocolate», con un golpecito al empezar.',
    pairs: [['ship', 'barco', 'chip', 'chip'], ['share', 'compartir', 'chair', 'silla'], ['wash', 'lavar', 'watch', 'mirar'], ['shoes', 'zapatos', 'choose', 'elegir'],
      ['cash', 'efectivo', 'catch', 'atrapar'], ['wish', 'deseo', 'witch', 'bruja'], ['sheet', 'hoja', 'cheat', 'hacer trampa']] },
  { id: 'j-y', name: 'j o y', example: 'jet / yet',
    how: 'La j inglesa es como «dch», con un golpecito y voz: jet. La y es suave, como la «i» de «hielo» dicha sin fuerza: yet.',
    pairs: [['jet', 'avión', 'yet', 'todavía'], ['jam', 'mermelada', 'yam', 'ñame'], ['joke', 'chiste', 'yolk', 'yema'], ['major', 'principal', 'mayor', 'alcalde']] },
  { id: 'th-t', name: 'th (soplando) o t', example: 'three / tree',
    how: 'th: la punta de la lengua sale un poquito entre los dientes y sopla, como la «z» de España. t: la lengua toca detrás de los dientes, sin salir.',
    pairs: [['three', 'tres', 'tree', 'árbol'], ['thin', 'delgado', 'tin', 'lata'], ['thank', 'agradecer', 'tank', 'tanque'], ['thought', 'pensó', 'taught', 'enseñó'],
      ['path', 'camino', 'pat', 'palmadita'], ['both', 'ambos', 'boat', 'barco'], ['math', 'matemáticas', 'mat', 'tapete']] },
  { id: 'th-d', name: 'th (con voz) o d', example: 'they / day',
    how: 'Igual que la anterior pero con voz: la lengua entre los dientes y la garganta vibra (they). La d solo toca detrás de los dientes (day).',
    pairs: [['they', 'ellos', 'day', 'día'], ['then', 'entonces', 'den', 'guarida'], ['though', 'aunque', 'dough', 'masa'], ['there', 'allí', 'dare', 'atreverse'],
      ['breathe', 'respirar', 'breed', 'criar']] },
  { id: 's-z', name: 's o z (zumbido)', example: 'price / prize',
    how: 'La z inglesa zumba como una abeja: «zzz», con la garganta vibrando. La s solo sopla. Importa mucho al final: plays, eyes, lose.',
    pairs: [['price', 'precio', 'prize', 'premio'], ['ice', 'hielo', 'eyes', 'ojos'], ['place', 'lugar', 'plays', 'juega'], ['race', 'carrera', 'raise', 'aumento'],
      ['bus', 'bus', 'buzz', 'zumbido'], ['loose', 'flojo', 'lose', 'perder']] },
  { id: 'h', name: 'con h o sin h', example: 'hair / air',
    how: 'La h inglesa es solo aire, como cuando empaña un vidrio: suave, nunca como la jota. Y si la palabra no tiene h, no se la ponga.',
    pairs: [['hair', 'pelo', 'air', 'aire'], ['heat', 'calor', 'eat', 'comer'], ['hold', 'sostener', 'old', 'viejo'], ['hear', 'oír', 'ear', 'oreja'],
      ['hand', 'mano', 'and', 'y'], ['his', 'su (de él)', 'is', 'es']] },
  { id: 'ed', name: 'presente o pasado (-ed)', example: 'play / played',
    how: 'El pasado se oye en el final: played suena «pleid», asked suena «askt», worked suena «workt». Si no lo dice, suena a presente. Contando su experiencia en una entrevista, todo va en pasado.',
    pairs: [['play', 'jugar', 'played', 'jugó'], ['call', 'llamar', 'called', 'llamó'], ['ask', 'preguntar', 'asked', 'preguntó'], ['open', 'abrir', 'opened', 'abrió'],
      ['clean', 'limpiar', 'cleaned', 'limpió'], ['work', 'trabajar', 'worked', 'trabajó'], ['watch', 'mirar', 'watched', 'miró']] },
  { id: 'num', name: 'trece o treinta (-teen o -ty)', example: 'thirteen / thirty',
    how: 'En los -teen la fuerza va al final y la n se oye: thir-TEEN. En los -ty la fuerza va al principio y termina suave: THIR-ty. En una entrevista importa: un salario de thirty no es uno de thirteen.',
    pairs: [['thirteen', 'trece', 'thirty', 'treinta'], ['fourteen', 'catorce', 'forty', 'cuarenta'], ['fifteen', 'quince', 'fifty', 'cincuenta'],
      ['sixteen', 'dieciséis', 'sixty', 'sesenta'], ['seventeen', 'diecisiete', 'seventy', 'setenta'], ['eighteen', 'dieciocho', 'eighty', 'ochenta'],
      ['nineteen', 'diecinueve', 'ninety', 'noventa']] },
];
export const pairGroupById = id => PAIR_GROUPS.find(g => g.id === id);

// Cómo puede escribir el reconocedor de voz la misma palabra (números en cifras, palabras que suenan igual).
export const ALTS = {
  thirteen: ['13'], thirty: ['30'], fourteen: ['14'], forty: ['40', 'fourty'], fifteen: ['15'], fifty: ['50'], sixteen: ['16'], sixty: ['60'],
  seventeen: ['17'], seventy: ['70'], eighteen: ['18'], eighty: ['80'], nineteen: ['19'], ninety: ['90'],
  berry: ['bury'], base: ['bass'], witch: ['which'], yolk: ['yoke'], dough: ['doe'], raise: ['rays', 'raze'], prize: ['pries'], eyes: ["i's"],
  hear: ['here'], hair: ['hare'], air: ['heir'], beat: ['beet'], steal: ['steel'], board: ['bored'], born: ['borne'], walk: ['wok'],
  choose: ['chews'], shoes: ['shoos'], taught: ['taut'], mat: ['matt'], jam: ['jamb'], there: ['their', "they're"], bus: ['buss'],
};
const forms = w => [w, ...(ALTS[w] || [])].map(x => tokens(x).join(''));

export const pairWords = p => [{ en: p[0], es: p[1] }, { en: p[2], es: p[3] }];

// Una ronda: n palabras de los grupos elegidos (todos si no se elige ninguno). target = la que suena o la que debe decir.
export function pairRound(groupIds = [], n = PAIR_ROUND, rnd = Math.random) {
  const groups = PAIR_GROUPS.filter(g => !groupIds.length || groupIds.includes(g.id));
  const pool = groups.flatMap(g => g.pairs.map(p => ({ group: g.id, words: pairWords(p) })));
  if (!pool.length) return [];
  const out = [];
  while (out.length < n) out.push(...shuffle(pool, rnd));
  return out.slice(0, n).map(x => ({ ...x, target: rnd() < 0.5 ? 0 : 1 }));
}

// Lo que se oyó al decir la palabra: 'ok' (dijo la suya), 'other' (sonó a la otra) o 'unclear' (ninguna de las dos).
export function judgeSaid(heard, item) {
  const toks = tokens(heard);
  const has = w => forms(w).some(f => toks.includes(f));
  const target = item.words[item.target].en, other = item.words[1 - item.target].en;
  if (has(target) && !has(other)) return 'ok';
  if (has(other)) return 'other';
  return 'unclear';
}

// Aciertos por grupo: { [grupo]: { hear: [bien, total], say: [bien, total] } }.
export function addPairResult(stats, group, mode, ok) {
  const out = { ...(stats || {}) };
  const g = { hear: [0, 0], say: [0, 0], ...(out[group] || {}) };
  const [a, n] = g[mode] || [0, 0];
  g[mode] = [a + (ok ? 1 : 0), n + 1];
  out[group] = g;
  return out;
}
export function groupScore(stats, id) {
  const g = (stats || {})[id] || {};
  const ok = (g.hear?.[0] || 0) + (g.say?.[0] || 0), n = (g.hear?.[1] || 0) + (g.say?.[1] || 0);
  return { ok, n, acc: n ? ok / n : null };
}
// Los grupos que más le cuestan (con al menos `min` intentos y menos de 85 % bien), del peor al mejor.
export function weakGroups(stats, min = 4) {
  return PAIR_GROUPS.map(g => ({ id: g.id, ...groupScore(stats, g.id) }))
    .filter(x => x.n >= min && x.acc < 0.85).sort((a, b) => a.acc - b.acc).map(x => x.id);
}

// =====================================================================================
// Diario en inglés
// =====================================================================================
export const DIARY_MINUTES = 15;     // lo que sugiere el cerebro (sin presión: puede ser menos)
export const DIARY_MIN_WORDS = 15;   // menos que esto no vale la pena corregirlo
export const DIARY_KEEP = 60;        // entradas guardadas
// Para arrancar cuando no sabe qué escribir.
export const DIARY_STARTS = [
  { en: 'Yesterday I…', es: 'Ayer yo…' },
  { en: 'Today I…', es: 'Hoy yo…' },
  { en: 'This weekend I would love to…', es: 'Este fin de semana me encantaría…' },
  { en: "Recently I've been thinking about…", es: 'Últimamente he estado pensando en…' },
  { en: 'Something that made me happy this week was…', es: 'Algo que me hizo feliz esta semana fue…' },
  { en: 'In my next job, I want to…', es: 'En mi próximo trabajo quiero…' },
  { en: 'Something I find difficult in English is…', es: 'Algo que me cuesta en inglés es…' },
  { en: 'If I could change one thing in my day, I would…', es: 'Si pudiera cambiar una cosa de mi día, yo…' },
];
// Palabras para unir ideas: mírelas solo si se traba.
export const DIARY_LINKS = [
  ['because', 'porque'], ['so', 'así que'], ['but', 'pero'], ['then', 'luego'], ['after that', 'después de eso'],
  ['for example', 'por ejemplo'], ['also', 'también'], ['however', 'sin embargo'], ['although', 'aunque'], ['in the end', 'al final'],
];

export function diaryStats(text) {
  const ws = tokens(text);
  const sentences = String(text || '').split(/[.!?]+/).filter(x => tokens(x).length).length;
  const t = ` ${norm(text)} `;
  const links = DIARY_LINKS.filter(([en]) => t.includes(` ${en} `)).map(([en]) => en);
  return { words: ws.length, sentences, links };
}

// Lo que devuelve la IA, revisado: correcciones que de verdad cambian algo, frases para guardar con traducción.
export function cleanDiaryReview(r, text) {
  const fixes = (Array.isArray(r?.fixes) ? r.fixes : [])
    .map(f => ({ said: str(f?.said), better: str(f?.better), why: str(f?.why) }))
    .filter(f => f.said && f.better && norm(f.said) !== norm(f.better));
  const keep = (Array.isArray(r?.keep) ? r.keep : []).map(k => ({ en: str(k?.en), es: str(k?.es) })).filter(k => k.en && k.es);
  const level = /^(A1|A2|B1\+?|B2|C1|C2)$/.test(str(r?.level)) ? str(r.level) : '';
  return { good: str(r?.good), fixes, corrected: str(r?.corrected) || String(text || '').trim(), level, levelWhy: str(r?.level_why), keep, tip: str(r?.tip) };
}

// Para «Mis errores»: cada corrección del diario se guarda como un error de una charla.
export const diaryAnalyses = fixes => fixes.map(f => ({ has_feedback: true, grammar: 'SomeMistakes', original: f.said, corrected: f.better, explanation: f.why }));

// Una entrada del diario (se guarda en el teléfono y en la copia de seguridad).
export function diaryEntry({ text, review = null, start = '', at = Date.now(), minutes = 0 }) {
  const st = diaryStats(text);
  return { id: `d-${at.toString(36)}`, at, start, text: String(text || '').trim(), words: st.words, minutes,
    review: review ? { good: review.good, fixes: review.fixes, corrected: review.corrected, level: review.level, levelWhy: review.levelWhy, keep: review.keep, tip: review.tip } : null };
}

// Días seguidos con diario (hasta hoy o ayer).
export function diaryStreak(entries, today = new Date()) {
  const days = new Set((entries || []).map(e => dayIso(new Date(e.at))));
  let n = 0;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  if (!days.has(dayIso(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayIso(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const dayIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// =====================================================================================
// Grabarse y compararse
// =====================================================================================
export const REC_MAX_MS = 150000;   // 2 minutos y medio como mucho
export const REC_PAUSE_MS = 6000;   // se detiene sola tras 6 s de silencio (o al tocar ⏹)
export const KEEP_LAST = 4;         // de cada tema se guardan la primera grabación y las últimas 4
export const REC_KINDS = [
  { id: 'entrevista', name: 'Para su entrevista' },
  { id: 'vida', name: 'Su vida' },
  { id: 'leer', name: 'Leer en voz alta' },
];
export const REC_TOPICS = [
  { id: 'yourself', kind: 'entrevista', en: 'Tell me about yourself.', es: 'Hábleme de usted.',
    tip: 'Qué hace hoy, qué ha hecho antes y qué busca ahora. Entre 1 y 2 minutos.' },
  { id: 'strength', kind: 'entrevista', en: 'What is your greatest strength?', es: '¿Cuál es su mayor fortaleza?',
    tip: 'Diga la fortaleza, cuente un ejemplo real y diga qué ganó la empresa con eso.' },
  { id: 'lastjob', kind: 'entrevista', en: 'Tell me about your last job.', es: 'Cuénteme de su último trabajo.',
    tip: 'Dónde era, qué hacía cada día y algo de lo que se siente orgulloso. Todo en pasado.' },
  { id: 'hire', kind: 'entrevista', en: 'Why should we hire you?', es: '¿Por qué deberíamos contratarle?',
    tip: 'Tres razones cortas y cierre con lo que puede aportar al equipo.' },
  { id: 'yesterday', kind: 'vida', en: 'What did you do yesterday?', es: '¿Qué hizo ayer?',
    tip: 'Todo en pasado: fíjese en que se oigan los finales (worked, called, asked).' },
  { id: 'plans', kind: 'vida', en: 'What are your plans for this year?', es: '¿Qué planes tiene para este año?',
    tip: 'Use «I\'m going to…», «I want to…» y «I hope to…».' },
  { id: 'read-intro', kind: 'leer', titleEs: 'Mi presentación',
    en: "Good morning, and thank you for having me. I have worked in customer service for several years. In my last job, I helped clients solve problems on the phone and by email. I enjoy working with people, and I stay calm when things get busy. Right now, I'm looking for a new challenge where I can keep learning and grow with a team.",
    es: 'Buenos días, y gracias por recibirme. He trabajado en servicio al cliente varios años. En mi último trabajo ayudaba a los clientes a resolver problemas por teléfono y por correo. Me gusta trabajar con gente y mantengo la calma cuando hay mucho trabajo. Ahora busco un nuevo reto donde pueda seguir aprendiendo y crecer con un equipo.',
    tip: 'Léalo en voz alta, con calma. Después oiga la voz del teléfono y compare.' },
  { id: 'read-day', kind: 'leer', titleEs: 'Un día de trabajo',
    en: "I usually start work at eight o'clock. First, I check my email and make a list of the most important tasks. Then I talk with my team about the plan for the day. After lunch, I have meetings or calls with clients. Before I leave, I write down what I finished and what I need to do tomorrow.",
    es: 'Normalmente empiezo a trabajar a las ocho. Primero reviso mi correo y hago una lista de las tareas más importantes. Luego hablo con mi equipo del plan del día. Después del almuerzo tengo reuniones o llamadas con clientes. Antes de irme, anoto lo que terminé y lo que tengo que hacer mañana.',
    tip: 'Fíjese en las palabras unidas: «check my email», «talk with my team».' },
  { id: 'read-problem', kind: 'leer', titleEs: 'Un problema resuelto',
    en: 'Last month, a client called because his order had not arrived. He was very upset. I listened carefully, apologized, and checked the system. The package was lost, so I sent a new one the same day and called him back to confirm. In the end, he thanked me and placed another order.',
    es: 'El mes pasado llamó un cliente porque su pedido no había llegado. Estaba muy molesto. Lo escuché con atención, me disculpé y revisé el sistema. El paquete se había perdido, así que le envié uno nuevo ese mismo día y lo volví a llamar para confirmar. Al final me dio las gracias e hizo otro pedido.',
    tip: 'Todo en pasado: que se oigan los finales (called, listened, apologized, checked).' },
];
export const recTopicById = id => REC_TOPICS.find(t => t.id === id);

// Lo que se revisa al oírse (el cerebro: escucharse una vez entera y otra anotando errores).
export const SELF_CHECKS = [
  { id: 'clear', q: '¿Se le entiende todo, sin mirar el texto?' },
  { id: 'endings', q: '¿Se oyen los finales (-s, -ed)?' },
  { id: 'pauses', q: '¿Habló sin quedarse callado mucho rato?' },
  { id: 'fillers', q: '¿Evitó muletillas («eh», «este», «um»)?' },
];

// Números de una grabación con texto (Whisper): palabras, palabras por minuto, muletillas y variedad.
export const clipStats = (text, speechMs) => (str(text) && speechMs > 0 ? talkStats(text, speechMs / 1000) : null);

// Qué grabaciones de un tema se borran: se guardan la primera (para ver cuánto avanzó) y las últimas KEEP_LAST.
export function clipsToDrop(clips, topic) {
  const list = (clips || []).filter(c => c.topic === topic).sort((a, b) => a.at - b.at);
  if (list.length <= KEEP_LAST + 1) return [];
  return list.slice(1, list.length - KEEP_LAST).map(c => c.id);
}

// La primera y la última de un tema, y cuánto cambió (si las dos tienen texto).
export function firstAndLast(clips, topic) {
  const list = (clips || []).filter(c => c.topic === topic).sort((a, b) => a.at - b.at);
  if (list.length < 2) return { first: list[0] || null, last: null, change: null };
  const first = list[0], last = list[list.length - 1];
  const change = first.stats && last.stats ? {
    wpm: last.stats.wpm - first.stats.wpm, fillers: last.stats.fillers - first.stats.fillers,
    words: last.stats.words - first.stats.words, days: Math.max(0, Math.round((last.at - first.at) / 86400000)),
  } : null;
  return { first, last, change };
}

// Cómo se oyó (lo que marcó usted): de 0 a 1.
export const selfScore = checks => (checks ? SELF_CHECKS.filter(c => checks[c.id]).length / SELF_CHECKS.length : 0);
