// Gramática por piezas (método de Pablo Bolen, notas del cerebro de inglés: equivalencia estructural y
// «puzzle verbal»). No se estudian reglas con nombres: se reconoce la forma en español (-ar, -ando, -ado,
// -ré, -ría, he…, había…, habría…) y se cambia por su pieza en inglés. Luego se arma la frase y se dice.
// Una lección por cada paso de la progresión del cerebro, dos por nivel (A1…C2). Contenido propio.
// Solo datos y revisión: las pantallas están en grammarscreen.js.
import { VERB_TABLE } from './cerebro.js';

// Ejercicio: [español, inglés, opciones falsas por pieza]. Lo que va entre [corchetes] es una pieza:
// la 1.ª pieza del español corresponde a la 1.ª del inglés, y así.
const LESSON_DATA = [
  { id: 'g-to', rank: 1, icon: '🧱', title: '-ar, -er, -ir → to + verbo',
    idea: 'La forma de diccionario (comer, vivir, hablar) en inglés lleva «to» delante: to eat, to live, to speak. Después de want, need, like o have va así: I want to eat.',
    table: [['querer', 'to want'], ['comer', 'to eat'], ['vivir', 'to live'], ['aprender', 'to learn']],
    ex: [
      ['Quiero [comer] pizza.', 'I want [to eat] pizza.', [['eat', 'eating']]],
      ['Necesito [trabajar] hoy.', 'I need [to work] today.', [['work', 'working']]],
      ['Me gusta [cocinar].', 'I like [to cook].', [['cook', 'cooked']]],
      ['Ella quiere [viajar] a Japón.', 'She wants [to travel] to Japan.', [['travel', 'traveled']]],
      ['Tengo que [llamar] a mi mamá.', 'I have [to call] my mom.', [['call', 'calling']]],
    ] },
  { id: 'g-ing', rank: 1, icon: '🏃', title: '-ando, -iendo → -ing',
    idea: 'Lo que pasa justo ahora: «estoy comiendo». «Estoy, está, estamos» es am, is, are, y el -ando / -iendo es -ing: I am eating.',
    table: [['estoy comiendo', 'I am eating'], ['está trabajando', 'he is working'], ['estamos hablando', 'we are talking']],
    ex: [
      ['[Estoy comiendo] ahora.', 'I [am eating] now.', [['am eat', 'eating']]],
      ['Ella [está trabajando] en casa.', 'She [is working] at home.', [['is work', 'are working']]],
      ['[Estamos hablando] inglés.', 'We [are speaking] English.', [['are speak', 'is speaking']]],
      ['¿Qué [estás haciendo]?', 'What [are you doing]?', [['you are doing', 'are you do']]],
      ['Él no [está escuchando].', 'He [is not listening].', [['not is listening', 'is not listen']]],
    ] },
  { id: 'g-will', rank: 2, icon: '🔮', title: 'Iré, comerás… → will + verbo',
    idea: 'En español el futuro cambia con cada persona (iré, irás, irá). En inglés es una sola pieza que nunca cambia: will + el verbo tal cual. I will go, she will go.',
    table: [['iré', 'I will go'], ['comerás', 'you will eat'], ['llamará', 'she will call']],
    ex: [
      ['Mañana [iré] al banco.', 'Tomorrow I [will go] to the bank.', [['will went', 'go will']]],
      ['Ella te [llamará] esta noche.', 'She [will call] you tonight.', [['will calls', 'calls']]],
      ['[Compraremos] pan después.', 'We [will buy] bread later.', [['will bought', 'buy']]],
      ['¿[Vendrás] a la fiesta?', '[Will you come] to the party?', [['You will come', 'Will you came']]],
      ['No [lloverá] mañana.', 'It [will not rain] tomorrow.', [['will rain not', 'not will rain']]],
    ] },
  { id: 'g-past', rank: 2, icon: '📅', title: 'Ayer: fui, comí → went, ate',
    idea: 'Lo que pasó y terminó, con fecha (ayer, el lunes, en 2020). Los verbos regulares suman -ed (worked); los irregulares tienen su propia forma (went, ate). Están en la Tabla de verbos, columna «Pasado».',
    table: [['trabajé', 'I worked'], ['fui', 'I went'], ['comimos', 'we ate'], ['no dormí', 'I did not sleep']],
    ex: [
      ['Ayer [trabajé] mucho.', 'Yesterday I [worked] a lot.', [['work', 'have worked']]],
      ['El lunes [fuimos] al cine.', 'On Monday we [went] to the movies.', [['go', 'gone']]],
      ['Ella [comió] pescado anoche.', 'She [ate] fish last night.', [['eated', 'eaten']]],
      ['[Compré] un teléfono nuevo la semana pasada.', 'I [bought] a new phone last week.', [['buyed', 'buy']]],
      ['No [dormí] bien anoche.', 'I [did not sleep] well last night.', [['did not slept', 'not slept']]],
    ] },
  { id: 'g-would', rank: 3, icon: '💭', title: 'Iría, comería… → would + verbo',
    idea: '-ría (iría, comería) es algo que pasaría si se cumple otra cosa. Igual que will, es una sola pieza para todas las personas: would + el verbo tal cual.',
    table: [['iría', 'I would go'], ['comprarías', 'you would buy'], ['me gustaría', 'I would like']],
    ex: [
      ['Yo [iría] contigo.', 'I [would go] with you.', [['will go', 'would went']]],
      ['Ella [compraría] esa casa.', 'She [would buy] that house.', [['would bought', 'buys']]],
      ['¿Qué [harías] tú?', 'What [would you do]?', [['you would do', 'would you did']]],
      ['[Me gustaría] un café.', '[I would like] a coffee.', [['I will like', 'I like would']]],
      ['Ellos no [entenderían] el chiste.', 'They [would not understand] the joke.', [['would not understood', 'not would understand']]],
    ] },
  { id: 'g-have', rank: 3, icon: '✅', title: 'He comido → have + participio',
    idea: '«He comido», «ha viajado»: algo del pasado que sigue conectado con hoy, sin decir cuándo. «He / ha» es have / has, y el -ado / -ido es la tercera columna de la Tabla de verbos (eaten, gone, worked).',
    table: [['he comido', 'I have eaten'], ['ha viajado', 'she has traveled'], ['hemos visto', 'we have seen']],
    ex: [
      ['[He terminado] mi tarea.', 'I [have finished] my homework.', [['have finish', 'finished have']]],
      ['Ella [ha viajado] mucho.', 'She [has traveled] a lot.', [['have traveled', 'has travel']]],
      ['[Hemos comido] demasiado.', 'We [have eaten] too much.', [['have ate', 'has eaten']]],
      ['Nunca [he visto] la nieve.', 'I [have never seen] snow.', [['have never saw', 'never have see']]],
      ['¿[Has estado] en Londres?', '[Have you been] to London?', [['Has you been', 'Have you were']]],
    ] },
  { id: 'g-had', rank: 4, icon: '⏪', title: 'Había comido → had + participio',
    idea: '«Había comido» o «hubiera comido»: un pasado que va antes de otro pasado, o algo que no pasó. En inglés las dos se dicen con la misma pieza: had + participio.',
    table: [['había salido', 'had left'], ['había perdido', 'had lost'], ['hubiera sabido', 'had known']],
    ex: [
      ['Cuando llegué, el tren [ya había salido].', 'When I arrived, the train [had already left].', [['has already left', 'had already leave']]],
      ['Ella [había perdido] las llaves.', 'She [had lost] her keys.', [['has lost', 'had lose']]],
      ['Nunca [había comido] sushi antes.', 'I [had never eaten] sushi before.', [['had never ate', 'have never eaten']]],
      ['[Ya habíamos terminado] cuando llegó el jefe.', 'We [had already finished] when the boss arrived.', [['have already finished', 'had already finish']]],
      ['Ella me dijo que [había visto] la película.', 'She told me she [had seen] the movie.', [['had saw', 'has seen']]],
    ] },
  { id: 'g-if2', rank: 4, icon: '🎲', title: 'Si tuviera…, -ría → If I had…, would',
    idea: 'Algo imaginado ahora: «Si tuviera tiempo, viajaría». Dos mitades: la del «si» va en pasado (had, knew, lived) y la otra con would. Would nunca va en la mitad del «if».',
    table: [['si tuviera', 'if I had'], ['si supiera', 'if I knew'], ['viajaría', 'I would travel']],
    ex: [
      ['Si [tuviera] tiempo, [viajaría] más.', 'If I [had] time, I [would travel] more.', [['would have', 'have'], ['will travel', 'traveled']]],
      ['Si [supiera] la respuesta, te la [diría].', 'If I [knew] the answer, I [would tell] you.', [['would know', 'know'], ['will tell', 'told']]],
      ['Si ella [viviera] aquí, la [vería] más.', 'If she [lived] here, I [would see] her more.', [['would live', 'lives'], ['will see', 'saw']]],
      ['Si [ganara] la lotería, [compraría] una casa.', 'If I [won] the lottery, I [would buy] a house.', [['would win', 'win'], ['will buy', 'bought']]],
      ['Si [hablaras] inglés, [conseguirías] ese trabajo.', 'If you [spoke] English, you [would get] that job.', [['would speak', 'speak'], ['will get', 'got']]],
    ] },
  { id: 'g-wouldhave', rank: 5, icon: '🧩', title: 'Habría ido → would have + participio',
    idea: '«Iría» es una pieza: todavía es posible. «Habría ido» son dos piezas: ya no pasó. Si en español hay «habría» + -ado / -ido, en inglés también van dos piezas: would have + participio (gone, worked).',
    table: [['iría', 'I would go'], ['habría ido', 'I would have gone'], ['habría trabajado', 'I would have worked']],
    ex: [
      ['Yo [habría ido] contigo.', 'I [would have gone] with you.', [['would go', 'would have went']]],
      ['Ella [habría ganado] la carrera.', 'She [would have won] the race.', [['would win', 'would have win']]],
      ['[Habríamos llegado] a tiempo.', 'We [would have arrived] on time.', [['would arrive', 'had arrived']]],
      ['Él no lo [habría creído].', 'He [would not have believed] it.', [['would not believe', 'had not believed']]],
      ['¿Qué [habrías hecho] tú?', 'What [would you have done]?', [['would you do', 'would you have did']]],
    ] },
  { id: 'g-if3', rank: 5, icon: '🔁', title: 'Si hubiera…, habría… → If I had…, would have',
    idea: 'Para lamentar o imaginar el pasado: «Si hubiera estudiado, habría aprobado». Las dos mitades hacen juego: had + participio con would have + participio. Es el error de su bitácora: el would no va con el if.',
    table: [['si hubiera sabido', 'if I had known'], ['habría llamado', 'I would have called']],
    ex: [
      ['Si [hubiera sabido], te [habría llamado].', 'If I [had known], I [would have called] you.', [['would have known', 'have known'], ['would call', 'had called']]],
      ['Si [hubiera estudiado], [habría aprobado] el examen.', 'If I [had studied], I [would have passed] the exam.', [['would have studied', 'studied'], ['would pass', 'had passed']]],
      ['Si ella [hubiera venido], [habríamos ido] a cenar.', 'If she [had come], we [would have gone] to dinner.', [['would have come', 'had came'], ['would go', 'would have went']]],
      ['Si no [hubiera llovido], [habríamos jugado] fútbol.', 'If it [had not rained], we [would have played] soccer.', [['would not have rained', 'did not rain'], ['would play', 'had played']]],
      ['Si [hubiera aprendido] inglés, [trabajaría] en una gran empresa.', 'If I [had learned] English, I [would work] for a big company.', [['would have learned', 'learned'], ['would have worked', 'will work']]],
    ] },
  { id: 'g-combo', rank: 6, icon: '🔗', title: 'Piezas que se suman',
    idea: 'Las piezas se juntan igual que en español: «estaré trabajando» = will + be working; «he estado esperando» = have been + waiting; «habré terminado» = will have + finished. Cambie cada pieza y júntelas.',
    table: [['estaré trabajando', 'I will be working'], ['he estado esperando', 'I have been waiting'], ['habré terminado', 'I will have finished']],
    ex: [
      ['Mañana a esta hora [estaré trabajando].', 'Tomorrow at this time I [will be working].', [['will working', 'will be work']]],
      ['[He estado esperando] una hora.', 'I [have been waiting] for an hour.', [['have waiting', 'have been wait']]],
      ['Para el viernes [habré terminado].', 'By Friday I [will have finished].', [['will finished', 'will have finish']]],
      ['Ella [había estado viviendo] en París.', 'She [had been living] in Paris.', [['had living', 'has been lived']]],
      ['Si me hubieras llamado, no [habría estado esperando] tanto.', 'If you had called me, I [would not have been waiting] so long.', [['would not be waiting', 'had not been waiting']]],
    ] },
  { id: 'g-mix', rank: 6, icon: '🌟', title: 'Todo junto: frases de la vida real',
    idea: 'Frases largas con varias piezas, como las que dice todos los días. Primero encuentre cada pieza, luego ármela entera y dígala en voz alta.',
    table: [['estoy aprendiendo', 'I am learning'], ['quiero viajar', 'I want to travel'], ['me gustaría quedarme', 'I would like to stay']],
    ex: [
      ['[Estoy aprendiendo] inglés porque [quiero viajar].', 'I [am learning] English because I [want to travel].', [['am learn', 'learning'], ['want travel', 'want traveling']]],
      ['Cuando [era] niño, [quería ser] piloto.', 'When I [was] a child, I [wanted to be] a pilot.', [['were', 'am'], ['wanted be', 'want to be']]],
      ['[He trabajado] aquí desde 2020 y [me gustaría quedarme].', 'I [have worked] here since 2020 and I [would like to stay].', [['worked', 'have work'], ['would like stay', 'will like to stay']]],
      ['Si [hubiera llegado] antes, [habría conocido] a tu hermana.', 'If I [had arrived] earlier, I [would have met] your sister.', [['have arrived', 'would have arrived'], ['would meet', 'had met']]],
      ['Le [dije] que [iría] a la reunión.', 'I [told] him I [would go] to the meeting.', [['said', 'tell'], ['will go', 'would went']]],
    ] },
];

// Los 5 pasos del puzzle verbal (cerebro: ejercicio_puzzle_verbal.md), en palabras propias.
export const METHOD = [
  'Lea la frase en español.',
  'Encuentre los verbos y su forma (-ar, -ando, -ado, -ré, -ría, he…, había…, habría…), sin ponerles nombre.',
  'Cambie cada pieza por la del inglés.',
  'Arme la frase completa.',
  'Dígala en voz alta.',
];

export const plain = t => String(t || '').replace(/[[\]]/g, '');
const pieces = t => [...String(t).matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);

// Ejercicio con piezas, listo para la pantalla: { es, en, pieces: [{ es, en, wrong: [a, b] }] }.
export function makeExercise(es, en, wrongs, id = '') {
  const pe = pieces(es), pn = pieces(en);
  return { id, es: plain(es), en: plain(en), pieces: pn.map((x, i) => ({ es: pe[i] || '', en: x, wrong: (wrongs[i] || []).slice(0, 2) })) };
}

export const LESSONS = LESSON_DATA.map((l, i) => ({
  ...l, order: i,
  exercises: l.ex.map(([es, en, w], k) => makeExercise(es, en, w, `${l.id}-${k}`)),
}));
export const lessonById = id => LESSONS.find(l => l.id === id);

// Una lección se abre al llegar a su nivel o al aprobar (80 %) la anterior. La primera, siempre.
export const PASS = 0.8;
export function unlocked(lesson, rank, best = {}) {
  if (lesson.order === 0 || lesson.rank <= rank) return true;
  const prev = LESSONS[lesson.order - 1];
  return (best[prev.id] || 0) >= PASS;
}
// La que toca ahora: la primera abierta que todavía no aprobó.
export const nextLesson = (rank, best = {}) => LESSONS.find(l => unlocked(l, rank, best) && (best[l.id] || 0) < PASS) || null;

// Fichas para armar la frase (las palabras en desorden, sin que quede igual a la respuesta).
export function tiles(en, rnd = Math.random) {
  const words = en.split(/\s+/).filter(Boolean);
  const out = shuffle(words, rnd);
  if (words.length > 1 && out.join(' ') === words.join(' ')) out.push(out.shift());
  return out;
}
export function shuffle(list, rnd = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const norm = t => String(t || '').toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
export const sameSentence = (a, b) => norm(a) === norm(b);

// Revisa lo que crea la IA antes de usarlo: cada pieza tiene que estar en la frase y sus opciones falsas
// tienen que ser distintas de la buena. Devuelve el ejercicio arreglado o null.
export function validExercise(x) {
  if (!x || typeof x.es !== 'string' || typeof x.en !== 'string' || !x.es.trim() || !x.en.trim()) return null;
  const en = plain(x.en).trim(), es = plain(x.es).trim();
  const list = (Array.isArray(x.pieces) ? x.pieces : []).map(p => ({
    es: String(p?.es || '').trim(), en: String(p?.en || '').trim(),
    wrong: [...new Set((Array.isArray(p?.wrong) ? p.wrong : []).map(w => String(w || '').trim()))].filter(w => w && norm(w) !== norm(p?.en)).slice(0, 2),
  })).filter(p => p.en && p.es && norm(en).includes(norm(p.en)) && p.wrong.length === 2);
  if (!list.length || en.split(/\s+/).length > 22) return null;
  return { es, en, pieces: list.slice(0, 3), note: String(x.note || x.tip || '').slice(0, 220) };
}

// ---------------- Tabla de verbos ----------------
export const VERBS = VERB_TABLE;
export const KIND = { R: 'regular', I: 'irregular', M: 'modal' };
const firstForm = f => String(f).split('/')[0].trim();
const hasForm = f => f && !f.startsWith('(');

// Busca en inglés o en español (sin importar tildes), por comienzo de palabra: «ido» encuentra «ido», no «decidido».
const bare = t => norm(String(t).normalize('NFD').replace(/[̀-ͯ]/g, ''));
export function searchVerbs(q = '', kind = 'all') {
  const n = bare(q);
  return VERBS.filter(v => {
    if (kind !== 'all' && v.type !== kind && !(kind === 'I' && v.type === 'M')) return false;
    if (!n) return true;
    const text = bare([v.es, v.base, v.past, v.pp, v.esPast, v.esPp].join(' '));
    return n.includes(' ') ? text.includes(n) : text.split(' ').some(w => w.startsWith(n));
  });
}

// Forma «regularizada» que un hispanohablante diría por error (goed, eated, buyed).
function regularized(base) {
  const [w, ...rest] = base.replace(/\s*\(.*?\)/g, '').split(' ');
  const ed = w.endsWith('e') ? w + 'd' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ied' : w + 'ed';
  return [ed, ...rest].join(' ');
}
const third = base => { const [w, ...r] = base.replace(/\s*\(.*?\)/g, '').split(' '); return [/(s|x|ch|sh|o)$/.test(w) ? w + 'es' : w + 's', ...r].join(' '); };

// Preguntas del «Pruébese»: «¿Cómo se dice fue?» con 3 opciones (la buena y dos formas del mismo verbo).
export function verbQuestions(list, n = 8, rnd = Math.random) {
  const pool = shuffle(list.filter(v => hasForm(v.past) && hasForm(v.pp) && v.esPast && v.esPp), rnd).slice(0, n);
  const qs = [];
  for (const v of pool) {
    const base = v.base.replace(/\s*\(.*?\)/g, '');
    const past = firstForm(v.past), pp = firstForm(v.pp);
    const reg = regularized(v.base);
    const mk = (kind, right, es, cands) => {
      const wrong = [...new Set(cands.filter(c => c && norm(c) !== norm(right)))].slice(0, 2);
      return { verb: v, kind, es, right, options: shuffle([right, ...wrong], rnd) };
    };
    const extra = v.base === 'be' ? ['is', 'are'] : [];
    // Al final, por si las formas se repiten (put / put / put): la de «he/she» y la de -ing.
    const spare = [third(v.base), base.split(' ')[0] + 'ing'];
    qs.push(mk('past', past, firstForm(v.esPast), [...extra, ...(v.type === 'R' ? [base, third(v.base)] : [reg, pp !== past ? pp : base, base]), ...spare]));
    qs.push(mk('pp', pp, firstForm(v.esPp), [...extra, ...(v.type === 'R' ? [base, third(v.base)] : [past !== pp ? past : reg, reg, base]), ...spare]));
  }
  return qs;
}
