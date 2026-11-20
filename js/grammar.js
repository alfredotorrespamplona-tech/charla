// Gramática por piezas (método de Pablo Bolen, notas del cerebro de inglés: equivalencia estructural y
// «puzzle verbal»). No se estudian reglas con nombres: se reconoce la forma en español (-ar, -ando, -ado,
// -ré, -ría, he…, había…, habría…) y se cambia por su pieza en inglés. Luego se arma la frase y se dice.
// Una lección por cada paso de la progresión del cerebro, tres por nivel (A1…C2). Contenido propio.
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
  { id: 'g-be', rank: 1, icon: '🙋', title: 'Soy, estoy, tengo… años → I am',
    idea: 'Ser y estar son un solo verbo en inglés: to be. Yo → I am; él, ella o eso → he / she / it is; nosotros y ellos → we / they are. Ojo: la edad, el hambre y el frío van con «be», no con «have»: tengo 30 años → I am 30.',
    table: [['soy / estoy', 'I am'], ['es / está', 'he is · she is · it is'], ['somos / estamos', 'we are'], ['tengo 30 años', 'I am 30']],
    ex: [
      ['[Soy] de Colombia.', 'I [am] from Colombia.', [['is', 'have']]],
      ['Ella [está] cansada.', 'She [is] tired.', [['are', 'has']]],
      ['[Tengo] treinta años.', 'I [am] thirty years old.', [['have', 'is']]],
      ['[Estamos] en la cafetería.', 'We [are] at the café.', [['is', 'am']]],
      ['Mi hermano [tiene] hambre.', 'My brother [is] hungry.', [['has', 'are']]],
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
  { id: 'g-going', rank: 2, icon: '🗺', title: 'Voy a + verbo → going to + verbo',
    idea: 'Para planes que ya decidió: «voy a viajar». Voy / vas / va a → am / are / is going to, y después el verbo tal cual: I am going to travel. Al hablar suena «gonna».',
    table: [['voy a comer', 'I am going to eat'], ['va a llover', 'it is going to rain'], ['vamos a ver', 'we are going to see']],
    ex: [
      ['[Voy a visitar] a mi abuela.', 'I [am going to visit] my grandmother.', [['am going visit', 'going to visiting']]],
      ['[Va a llover] esta tarde.', 'It [is going to rain] this afternoon.', [['is going rain', 'are going to rain']]],
      ['[Vamos a cocinar] pasta.', 'We [are going to cook] pasta.', [['are go to cook', 'is going to cook']]],
      ['¿Qué [vas a hacer] mañana?', 'What [are you going to do] tomorrow?', [['you are going to do', 'are you going do']]],
      ['Ella no [va a venir].', 'She [is not going to come].', [['not is going to come', 'is not going come']]],
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
  { id: 'g-have', rank: 3, icon: '✅', title: 'He comido → have + forma terminada',
    idea: '«He comido», «ha viajado»: algo del pasado que sigue conectado con hoy, sin decir cuándo. «He / ha» es have / has, y el -ado / -ido es la tercera columna de la Tabla de verbos (eaten, gone, worked).',
    table: [['he comido', 'I have eaten'], ['ha viajado', 'she has traveled'], ['hemos visto', 'we have seen']],
    ex: [
      ['[He terminado] mi tarea.', 'I [have finished] my homework.', [['have finish', 'finished have']]],
      ['Ella [ha viajado] mucho.', 'She [has traveled] a lot.', [['have traveled', 'has travel']]],
      ['[Hemos comido] demasiado.', 'We [have eaten] too much.', [['have ate', 'has eaten']]],
      ['Nunca [he visto] la nieve.', 'I [have never seen] snow.', [['have never saw', 'never have see']]],
      ['¿[Has estado] en Londres?', '[Have you been] to London?', [['Has you been', 'Have you were']]],
    ] },
  { id: 'g-modals', rank: 3, icon: '🔑', title: 'Puedo, podría, debería → can, could, should',
    idea: 'Puedo / puede → can. Podría → could. Debería → should. Son piezas fijas: no cambian con la persona y el verbo que sigue va sin «to»: she can swim, you should rest.',
    table: [['puedo nadar', 'I can swim'], ['¿podrías ayudarme?', 'could you help me?'], ['deberías descansar', 'you should rest']],
    ex: [
      ['[Puedo hablar] un poco de inglés.', 'I [can speak] a little English.', [['can to speak', 'could speaking']]],
      ['¿[Podrías cerrar] la ventana?', '[Could you close] the window?', [['Can you to close', 'You could close']]],
      ['[Deberías descansar] más.', 'You [should rest] more.', [['should to rest', 'would rest']]],
      ['Ella [no puede venir] hoy.', 'She [cannot come] today.', [['can not to come', "doesn't can come"]]],
      ['[Deberíamos salir] temprano.', 'We [should leave] early.', [['should to leave', 'should leaving']]],
    ] },
  { id: 'g-had', rank: 4, icon: '⏪', title: 'Había comido → had + forma terminada',
    idea: '«Había comido» o «hubiera comido»: un pasado que va antes de otro pasado, o algo que no pasó. En inglés las dos se dicen con la misma pieza: had + forma terminada.',
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
  { id: 'g-passive', rank: 4, icon: '🏛', title: 'Fue hecho, se habla → was made, is spoken',
    idea: 'Cuando importa más la cosa que quién la hace: «la casa fue construida en 1990», «aquí se habla inglés». En inglés: am / is / are o was / were + forma terminada (made, built, spoken). Si quiere decir quién lo hizo, agregue «by».',
    table: [['fue construida', 'was built'], ['se habla', 'is spoken'], ['fueron vendidos', 'were sold'], ['será enviado', 'will be sent']],
    ex: [
      ['La casa [fue construida] en 1990.', 'The house [was built] in 1990.', [['built', 'was build']]],
      ['Aquí [se habla] inglés.', 'English [is spoken] here.', [['speaks', 'is speak']]],
      ['Todas las entradas [fueron vendidas].', 'All the tickets [were sold].', [['was sold', 'were sell']]],
      ['El paquete [será enviado] mañana.', 'The package [will be sent] tomorrow.', [['will send', 'will be send']]],
      ['Este libro [fue escrito] por mi profesora.', 'This book [was written] by my teacher.', [['was wrote', 'wrote']]],
    ] },
  { id: 'g-wouldhave', rank: 5, icon: '🧩', title: 'Habría ido → would have + forma terminada',
    idea: '«Iría» es una pieza: todavía es posible. «Habría ido» son dos piezas: ya no pasó. Si en español hay «habría» + -ado / -ido, en inglés también van dos piezas: would have + forma terminada (gone, worked).',
    table: [['iría', 'I would go'], ['habría ido', 'I would have gone'], ['habría trabajado', 'I would have worked']],
    ex: [
      ['Yo [habría ido] contigo.', 'I [would have gone] with you.', [['would go', 'would have went']]],
      ['Ella [habría ganado] la carrera.', 'She [would have won] the race.', [['would win', 'would have win']]],
      ['[Habríamos llegado] a tiempo.', 'We [would have arrived] on time.', [['would arrive', 'had arrived']]],
      ['Él no lo [habría creído].', 'He [would not have believed] it.', [['would not believe', 'had not believed']]],
      ['¿Qué [habrías hecho] tú?', 'What [would you have done]?', [['would you do', 'would you have did']]],
    ] },
  { id: 'g-if3', rank: 5, icon: '🔁', title: 'Si hubiera…, habría… → If I had…, would have',
    idea: 'Para lamentar o imaginar el pasado: «Si hubiera estudiado, habría aprobado». Las dos mitades hacen juego: had + forma terminada con would have + forma terminada. Es el error de su bitácora: el would no va con el if.',
    table: [['si hubiera sabido', 'if I had known'], ['habría llamado', 'I would have called']],
    ex: [
      ['Si [hubiera sabido], te [habría llamado].', 'If I [had known], I [would have called] you.', [['would have known', 'have known'], ['would call', 'had called']]],
      ['Si [hubiera estudiado], [habría aprobado] el examen.', 'If I [had studied], I [would have passed] the exam.', [['would have studied', 'studied'], ['would pass', 'had passed']]],
      ['Si ella [hubiera venido], [habríamos ido] a cenar.', 'If she [had come], we [would have gone] to dinner.', [['would have come', 'had came'], ['would go', 'would have went']]],
      ['Si no [hubiera llovido], [habríamos jugado] fútbol.', 'If it [had not rained], we [would have played] soccer.', [['would not have rained', 'did not rain'], ['would play', 'had played']]],
      ['Si [hubiera aprendido] inglés, [trabajaría] en una gran empresa.', 'If I [had learned] English, I [would work] for a big company.', [['would have learned', 'learned'], ['would have worked', 'will work']]],
    ] },
  { id: 'g-wish', rank: 5, icon: '✨', title: 'Ojalá tuviera… → I wish I had…',
    idea: 'Para desear algo distinto de lo que es: «ojalá tuviera más tiempo» → I wish I had more time (I wish + pasado). Para lamentar algo que ya pasó: «ojalá hubiera estudiado» → I wish I had studied (I wish + had + forma terminada).',
    table: [['ojalá tuviera', 'I wish I had'], ['ojalá supiera', 'I wish I knew'], ['ojalá hubiera ido', 'I wish I had gone']],
    ex: [
      ['[Ojalá tuviera] más tiempo.', '[I wish I had] more time.', [['I wish I have', 'I hope I had']]],
      ['[Ojalá supiera] cocinar.', '[I wish I knew] how to cook.', [['I wish I know', 'I wish I would know']]],
      ['[Ojalá hubiera estudiado] más.', '[I wish I had studied] more.', [['I wish I studied', 'I wish I have studied']]],
      ['[Ojalá no hubiera dicho] eso.', "[I wish I hadn't said] that.", [["I wish I didn't say", "I wish I haven't said"]]],
      ['[Ojalá vivieras] más cerca.', '[I wish you lived] closer.', [['I wish you live', 'I wish you would living']]],
    ] },
  { id: 'g-shouldhave', rank: 6, icon: '⏳', title: 'Debería haber, podría haber → should have, could have',
    idea: 'Para hablar de lo que no pasó: «debería haber llamado» → I should have called; «podríamos haber ganado» → we could have won. «Tendría que haber…» también es should have. Al hablar suena «should’ve», «could’ve».',
    table: [['debería haber llamado', 'I should have called'], ['podríamos haber ganado', 'we could have won'], ['no deberías haber ido', "you shouldn't have gone"]],
    ex: [
      ['[Debería haber llamado] antes.', 'I [should have called] earlier.', [['should called', 'should have call']]],
      ['[Podríamos haber ganado] el partido.', 'We [could have won] the match.', [['could won', 'could have win']]],
      ['[No deberías haber comprado] eso.', "You [shouldn't have bought] that.", [["shouldn't bought", "shouldn't have buy"]]],
      ['Ella [podría haber sido] doctora.', 'She [could have been] a doctor.', [['could be', 'could have be']]],
      ['[Tendrías que haberme dicho] la verdad.', 'You [should have told me] the truth.', [['should tell me', 'should have tell me']]],
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

// ---------------- Piezas de su frase, sin IA (método de Pablo Bolen) ----------------
// Cerebro: equivalencia_estructural_espanol_ingles.md y ejercicio_puzzle_verbal.md. Reconoce en la frase en
// español las formas del verbo (-ar, -ando, -ado, -ré, -ría, he…, había/hubiera…, habría…, voy a…) y dice qué
// pieza del inglés va en su lugar. El verbo en inglés sale de la tabla de verbos del cerebro; si no está, solo
// la pieza (ej.: «would + el verbo»). Es una guía para armarla usted: la IA solo hace falta para revisarla.
const ES_ENDING = /(ar|er|ir|ír)$/;
const IRREG_STEM = { tener: 'tendr', poner: 'pondr', salir: 'saldr', venir: 'vendr', poder: 'podr', saber: 'sabr', haber: 'habr',
  querer: 'querr', decir: 'dir', hacer: 'har', caber: 'cabr', valer: 'valdr' };
const IRREG_GER = { ir: 'yendo', leer: 'leyendo', traer: 'trayendo', creer: 'creyendo', oir: 'oyendo', decir: 'diciendo', dormir: 'durmiendo',
  pedir: 'pidiendo', sentir: 'sintiendo', venir: 'viniendo', poder: 'pudiendo', seguir: 'siguiendo', morir: 'muriendo', servir: 'sirviendo' };
const enBase = v => firstForm(v.base.replace(/\s*\(.*?\)/g, ''));
const enPp = v => (hasForm(v.pp) ? firstForm(v.pp) : enBase(v));
const DOUBLE = new Set(['run', 'get', 'put', 'sit', 'stop', 'swim', 'begin', 'plan', 'shop', 'cut', 'set', 'win', 'forget', 'hit', 'let']);
export function ingForm(base) {
  const [w, ...rest] = String(base).split(' ');
  const ing = DOUBLE.has(w) ? w + w.slice(-1) + 'ing' : w.endsWith('ie') ? w.slice(0, -2) + 'ying'
    : /[^aeiou]e$/.test(w) && w !== 'be' ? w.slice(0, -1) + 'ing' : w + 'ing';
  return [ing, ...rest].join(' ');
}

// Índices: infinitivo, participio, gerundio, futuro y condicional (sin tildes) → verbo de la tabla.
let IDX = null;
function index() {
  if (IDX) return IDX;
  IDX = { inf: new Map(), pp: new Map(), ger: new Map(), fut: new Map(), cond: new Map() };
  const put = (m, k, v) => { if (k && !m.has(k)) m.set(k, v); };
  for (const v of VERBS) {
    for (const alt of String(v.es).split('/')) {
      const inf = bare(alt.trim().split(' ')[0]).replace(/se$/, '');
      if (!ES_ENDING.test(inf)) continue;
      put(IDX.inf, inf, v);
      put(IDX.pp, inf.replace(/ar$/, 'ado').replace(/[ei]r$/, 'ido'), v);
      put(IDX.ger, IRREG_GER[inf] || inf.replace(/ar$/, 'ando').replace(/[ei]r$/, 'iendo'), v);
      const stem = IRREG_STEM[inf] || inf;
      for (const e of ['e', 'as', 'a', 'emos', 'an']) put(IDX.fut, stem + e, v);
      for (const e of ['ia', 'ias', 'iamos', 'ian']) put(IDX.cond, stem + e, v);
    }
    for (const alt of String(v.esPp || '').split('/')) put(IDX.pp, bare(alt.trim().split(' ')[0]), v);
  }
  // «Si tuviera…»: la forma que va después de «si» para algo imaginario (en inglés, el verbo en pasado).
  IDX.subj = new Map();
  for (const [inf, v] of IDX.inf) {
    const stem = SUBJ_STEM[inf] || inf.replace(/ar$/, 'ara').replace(/[ei]r$/, 'iera');
    for (const e of ['', 's', 'mos', 'n']) put(IDX.subj, (e === 'mos' ? stem.replace(/a$/, 'amos') : stem + e), v);
  }
  return IDX;
}
const SUBJ_STEM = { tener: 'tuviera', estar: 'estuviera', hacer: 'hiciera', poder: 'pudiera', querer: 'quisiera', saber: 'supiera',
  venir: 'viniera', poner: 'pusiera', ser: 'fuera', ir: 'fuera', decir: 'dijera', traer: 'trajera', dar: 'diera', ver: 'viera', haber: 'hubiera' };
// Palabras comunes que parecen formas del verbo y no lo son.
const NOT_VERB = new Set(['cuando', 'cuanto', 'mando', 'bando', 'comando', 'para', 'parar']);
// «quedarme» → «quedar»: el verbo sin el me/te/se/lo… pegado al final.
const noClitic = x => { const y = x.replace(/(me|te|se|nos|lo|la|le|los|las|les)$/, ''); return /(ar|er|ir)$/.test(y) ? y : x; };

const PIECE_INFO = {
  had: { en: 'had + forma terminada', idea: 'Algo que ya había pasado antes de otra cosa, o que no pasó («si hubiera…»).' },
  wouldhave: { en: 'would have + forma terminada', idea: 'Algo del pasado que ya no se puede cambiar: dos piezas en inglés.' },
  have: { en: 'have / has + forma terminada', idea: 'Empezó antes y sigue conectado con hoy.' },
  ing: { en: 'am / is / are (was, would be…) + -ing', idea: 'La acción en el momento en que ocurre.' },
  goingto: { en: 'going to + verbo', idea: 'Un plan que ya decidió.' },
  will: { en: 'will + verbo', idea: 'Algo que todavía no pasó, pero va a pasar. Igual para todas las personas.' },
  would: { en: 'would + verbo', idea: 'Algo que pasaría: todavía posible o imaginario. Una sola pieza.' },
  to: { en: 'to + verbo', idea: 'El verbo «en crudo» (-ar, -er, -ir) después de otro verbo o de «para».' },
  past: { en: 'el verbo en pasado (had, went, worked…)', idea: 'Después de «si», para algo imaginario: en inglés el verbo va en pasado y nunca lleva would.' },
};
const HAD = new Set(['hubiera', 'hubieras', 'hubieramos', 'hubieran', 'hubiese', 'hubieses', 'hubiesemos', 'hubiesen', 'habia', 'habias', 'habiamos', 'habian']);
const HABRIA = new Set(['habria', 'habrias', 'habriamos', 'habrian']);
const HE = { he: 'have', has: 'have', ha: 'has', hemos: 'have', han: 'have' };
const ESTAR = { estoy: 'am', estas: 'are', esta: 'is', estamos: 'are', estan: 'are', estaba: 'was', estabas: 'were', estabamos: 'were', estaban: 'were',
  estuve: 'was', estuvo: 'was', estuvimos: 'were', estuvieron: 'were', estare: 'will be', estaria: 'would be' };
const IR_A = new Set(['voy', 'vas', 'va', 'vamos', 'van', 'iba', 'ibas', 'ibamos', 'iban']);
// Verbos (o frases) que piden el otro verbo «en crudo»: qué pieza va en inglés.
const BEFORE_INF = [
  ['me gustaria', 'would like to'], ['le gustaria', 'would like to'], ['te gustaria', 'would like to'], ['nos gustaria', 'would like to'],
  ['me gusta', 'like to'], ['tengo que', 'have to'], ['tiene que', 'has to'], ['tienes que', 'have to'], ['tenemos que', 'have to'],
  ['tenia que', 'had to'], ['tuve que', 'had to'], ['trato de', 'try to'], ['trate de', 'tried to'], ['empece a', 'started to'],
  ['aprendi a', 'learned to'], ['acabo de', 'have just'],
  ['quiero', 'want to'], ['quieres', 'want to'], ['quiere', 'wants to'], ['queremos', 'want to'], ['quieren', 'want to'], ['queria', 'wanted to'], ['quise', 'wanted to'],
  ['necesito', 'need to'], ['necesita', 'needs to'], ['necesitamos', 'need to'], ['necesitaba', 'needed to'],
  ['puedo', 'can'], ['puede', 'can'], ['puedes', 'can'], ['podemos', 'can'], ['pueden', 'can'], ['pude', 'could'], ['podia', 'could'],
  ['debo', 'must'], ['deberia', 'should'], ['debes', 'should'], ['espero', 'hope to'], ['decidi', 'decided to'], ['intento', 'try to'],
  ['prefiero', 'prefer to'], ['suelo', 'usually'], ['para', 'to'],
];

// spanishPieces('Si hubiera llegado antes, habría conocido a tu hermana.') →
// [{ es: 'hubiera llegado', kind: 'had', en: 'had arrived', piece: 'had + forma terminada', idea }, …]
export function spanishPieces(text) {
  const { inf, pp, ger, fut, cond, subj } = index();
  const raw = String(text || '').match(/[\p{L}]+/gu) || [];
  const w = raw.map(x => bare(x));
  const out = [];
  const isPp = x => pp.has(x) || (/(ado|ido)$/.test(x) && x.length > 4);
  const isGer = x => !NOT_VERB.has(x) && (ger.has(x) || (/(ando|iendo|yendo)$/.test(x) && x.length > 5));
  const isInf = x => !NOT_VERB.has(noClitic(x)) && (inf.has(noClitic(x)) || (/(ar|er|ir)$/.test(noClitic(x)) && noClitic(x).length > 3));
  const infVerb = x => inf.get(noClitic(x));
  const add = (i, n, kind, en) => out.push({ es: raw.slice(i, i + n).join(' '), kind, en, piece: PIECE_INFO[kind].en, idea: PIECE_INFO[kind].idea });
  for (let i = 0; i < w.length; i++) {
    const a = w[i], b = w[i + 1] || '', c = w[i + 2] || '';
    if (HAD.has(a) && isPp(b)) { const v = pp.get(b); add(i, 2, 'had', v ? `had ${enPp(v)}` : 'had + (su verbo con -ed)'); i++; continue; }
    if (HABRIA.has(a) && isPp(b)) { const v = pp.get(b); add(i, 2, 'wouldhave', v ? `would have ${enPp(v)}` : 'would have + (su verbo con -ed)'); i++; continue; }
    if (HE[a] && isPp(b)) { const v = pp.get(b); add(i, 2, 'have', v ? `${HE[a]} ${enPp(v)}` : `${HE[a]} + (su verbo con -ed)`); i++; continue; }
    if (ESTAR[a] && isGer(b)) { const v = ger.get(b); add(i, 2, 'ing', v ? `${ESTAR[a]} ${ingForm(enBase(v))}` : `${ESTAR[a]} + (su verbo con -ing)`); i++; continue; }
    if (IR_A.has(a) && b === 'a' && isInf(c)) { const v = infVerb(c); add(i, 3, 'goingto', `${/^ib/.test(a) ? 'was going to' : 'going to'} ${v ? enBase(v) : '+ (su verbo)'}`); i += 2; continue; }
    const lead = BEFORE_INF.find(([k]) => { const ks = k.split(' '); return ks.every((x, j) => w[i + j] === x) && isInf(w[i + ks.length] || ''); });
    if (lead) {
      const n = lead[0].split(' ').length, v = infVerb(w[i + n]);
      add(i, n + 1, 'to', `${lead[1]} ${v ? enBase(v) : '+ (su verbo)'}`);
      i += n; continue;
    }
    // «si (yo/no) tuviera» → pasado: lo que más se confunde (would no va del lado del «si»).
    if ((w[i - 1] === 'si' || w[i - 2] === 'si') && !HAD.has(a) && (subj.has(a) || /(ara|aras|aramos|aran|iera|ieras|ieramos|ieran)$/.test(a))) {
      const v = subj.get(a); add(i, 1, 'past', v ? firstForm(v.past) : '(su verbo en pasado)'); continue;
    }
    if (cond.has(a) && !HABRIA.has(a)) { add(i, 1, 'would', `would ${enBase(cond.get(a))}`); continue; }
    const condStem = a.match(/^(.+)(ar|er|ir)(ia|ias|iamos|ian)$/);
    if (condStem && condStem[1].length >= 3 && !HABRIA.has(a) && raw[i].includes('í')) { add(i, 1, 'would', 'would + (su verbo)'); continue; }
    if (fut.has(a) && /[éá]/.test(raw[i])) { add(i, 1, 'will', `will ${enBase(fut.get(a))}`); continue; }
    if (isGer(a) && !ESTAR[w[i - 1]] && a.length > 5) { const v = ger.get(a); add(i, 1, 'ing', v ? ingForm(enBase(v)) : '(su verbo con -ing)'); }
  }
  return out;
}
