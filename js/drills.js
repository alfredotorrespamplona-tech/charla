// Taller de frases: contenido y revisión de dos técnicas para practicar gramática sin estudiarla.
//
// · Repeat and Juggle (Keith Speaking Academy, nota del cerebro «tecnica_repeat_and_juggle.md»):
//   escuchar una frase real, repetirla igual en voz alta y después «malabarearla»: cambiarle UNA pieza
//   (una palabra, el tiempo, o volverla pregunta/negativa) sin volver a pensar toda la frase.
// · Skeleton swapping (cambiar el relleno del esqueleto): de una frase útil se queda el «esqueleto»
//   (las palabras fijas que la sostienen) y se le cambia el «relleno» para decir cosas propias.
//   «I've been meaning to ___ for ___» sirve para cientos de frases sin pensar la gramática.
//
// Los ejemplos de aquí son propios. Los Repeat and Juggle de verbos vienen del mazo del usuario
// (JUGGLE_SETS en cerebro.js). [corchetes] = la pieza que cambia; {hueco} = relleno del esqueleto.
import { JUGGLE_SETS } from './cerebro.js';

// ---------------- Repeat and Juggle propios (palabra + tiempo + forma) ----------------
// kind: repeat (repetir igual) · word (cambiar una palabra) · tense (cambiar el tiempo) · form (pregunta, negativa…)
const R = (en, es) => ({ kind: 'repeat', label: 'repetir igual', en, es });
const W = (en, es) => ({ kind: 'word', label: 'cambie la palabra', en, es });
const T = (label, en, es) => ({ kind: 'tense', label, en, es });
const F = (label, en, es) => ({ kind: 'form', label, en, es });

export const JUGGLES = [
  { id: 'jm-into', icon: '🎵', title: 'Lo que me gusta', steps: [
    R("I'm really into [cooking].", 'Me encanta [cocinar].'),
    W("I'm really into [hiking].", 'Me encanta [hacer senderismo].'),
    W("I'm really into [old movies].", 'Me encantan [las películas viejas].'),
    T('antes (used to)', "I [used to be] really into cooking.", 'Antes me [encantaba] cocinar.'),
    T('últimamente (have been)', "I['ve been] really into cooking lately.", 'Últimamente me [ha dado] por cocinar.'),
    T('si… (would)', "I['d be] really into cooking if I had more time.", 'Me [encantaría] cocinar si tuviera más tiempo.')] },
  { id: 'jm-bus', icon: '🏃', title: 'Cómo voy al trabajo', steps: [
    R('I usually take [the bus] to work.', 'Normalmente tomo [el bus] para ir al trabajo.'),
    W('I usually take [the train] to work.', 'Normalmente tomo [el tren] para ir al trabajo.'),
    T('ayer', 'I [took] the bus to work yesterday.', 'Ayer [tomé] el bus para ir al trabajo.'),
    T('esta semana (ahora mismo)', "I['m taking] the bus to work this week.", 'Esta semana [estoy tomando] el bus para ir al trabajo.'),
    T('mañana', "I['ll take] the bus to work tomorrow.", 'Mañana [tomaré] el bus para ir al trabajo.'),
    F('pregunta', '[Do you usually take] the bus to work?', '¿[Normalmente toma] el bus para ir al trabajo?')] },
  { id: 'jm-coffee', icon: '☕', title: 'Pedir algo', steps: [
    R('Can I get [a coffee], please?', '¿Me da [un café], por favor?'),
    W('Can I get [a glass of water], please?', '¿Me da [un vaso de agua], por favor?'),
    W('Can I get [the check], please?', '¿Me da [la cuenta], por favor?'),
    F('más amable (could)', '[Could I] get a coffee, please?', '¿[Me podría dar] un café, por favor?'),
    F('decir lo que quiere', "[I'd like] a coffee, please.", '[Quisiera] un café, por favor.'),
    T('ayer, contándolo', 'I [got] a coffee on my way here.', '[Compré] un café de camino aquí.')] },
  { id: 'jm-works', icon: '💼', title: 'Dónde trabaja', steps: [
    R('She works at [a hospital].', 'Ella trabaja en [un hospital].'),
    W('She works at [a bank].', 'Ella trabaja en [un banco].'),
    F('pregunta', '[Does she work] at a hospital?', '¿Ella [trabaja] en un hospital?'),
    F('negativa', "She [doesn't work] at a hospital.", 'Ella [no trabaja] en un hospital.'),
    T('antes, por años', 'She [worked] at a hospital for ten years.', 'Ella [trabajó] en un hospital durante diez años.'),
    T('desde hace (has been)', "She['s been working] at a hospital since 2020.", 'Ella [trabaja] en un hospital desde 2020.')] },
  { id: 'jm-beach', icon: '☀️', title: 'Planes del fin de semana', steps: [
    R("We're going to [the beach] this weekend.", 'Vamos a ir a [la playa] este fin de semana.'),
    W("We're going to [a concert] this weekend.", 'Vamos a ir a [un concierto] este fin de semana.'),
    T('el fin pasado', 'We [went] to the beach last weekend.', '[Fuimos] a la playa el fin de semana pasado.'),
    F('pregunta', '[Are we going] to the beach this weekend?', '¿[Vamos a ir] a la playa este fin de semana?'),
    F('quizás (might)', 'We [might go] to the beach this weekend.', '[Quizás vayamos] a la playa este fin de semana.'),
    F('negativa', "We're [not going] to the beach this weekend.", '[No vamos a ir] a la playa este fin de semana.')] },
  { id: 'jm-never', icon: '🗺️', title: 'Nunca he ido', steps: [
    R("I've never been to [Mexico].", 'Nunca he ido a [México].'),
    W("I've never been to [a football game].", 'Nunca he ido a [un partido de fútbol].'),
    F('pregunta (ever)', '[Have you ever been] to Mexico?', '¿[Alguna vez ha ido] a México?'),
    T('antes de… (had)', 'I [had never been] to Mexico before that trip.', '[Nunca había ido] a México antes de ese viaje.'),
    T('pasado, una vez', 'I [went] to Mexico two years ago.', '[Fui] a México hace dos años.'),
    T('futuro', "I['m going to go] to Mexico next year.", '[Voy a ir] a México el año que viene.')] },
  { id: 'jm-need', icon: '🎯', title: 'Lo que tengo que hacer', steps: [
    R('I need to [call my mom].', 'Necesito [llamar a mi mamá].'),
    W('I need to [buy some milk].', 'Necesito [comprar leche].'),
    T('ayer', 'I [needed to] call my mom yesterday.', 'Ayer [necesitaba] llamar a mi mamá.'),
    T('más tarde (will)', "I['ll need to] call my mom later.", 'Más tarde [voy a tener que] llamar a mi mamá.'),
    F('negativa', "I [don't need to] call my mom.", '[No necesito] llamar a mi mamá.'),
    F('obligación (have to)', 'I [have to] call my mom.', '[Tengo que] llamar a mi mamá.')] },
  { id: 'jm-cold', icon: '🌧️', title: 'El clima', steps: [
    R("It's [too cold] today.", 'Hoy hace [demasiado frío].'),
    W("It's [really windy] today.", 'Hoy hace [mucho viento].'),
    T('ayer', 'It [was] too cold yesterday.', 'Ayer [hizo] demasiado frío.'),
    T('mañana (going to)', "It['s going to be] too cold tomorrow.", 'Mañana [va a hacer] demasiado frío.'),
    F('pregunta', '[Is it] too cold today?', '¿[Hace] demasiado frío hoy?'),
    T('toda la semana (has been)', "It['s been] too cold all week.", '[Ha hecho] demasiado frío toda la semana.')] },
  { id: 'jm-looking', icon: '🔍', title: 'Buscando algo', steps: [
    R("I'm looking for [my keys].", 'Estoy buscando [mis llaves].'),
    W("I'm looking for [my glasses].", 'Estoy buscando [mis lentes].'),
    T('cuando… (was)', 'I [was looking for] my keys when you called.', '[Estaba buscando] mis llaves cuando llamaste.'),
    T('toda la mañana (have been)', "I['ve been looking for] my keys all morning.", '[He estado buscando] mis llaves toda la mañana.'),
    F('pregunta', '[What are you looking for]?', '¿[Qué está buscando]?'),
    T('ya lo encontré', 'I [found] my keys.', '[Encontré] mis llaves.')] },
  { id: 'jm-guitar', icon: '🎵', title: 'Lo que sabe hacer', steps: [
    R('He plays [the guitar].', 'Él toca [la guitarra].'),
    W('He plays [the piano].', 'Él toca [el piano].'),
    T('antes, en una banda', 'He [played] the guitar in a band.', 'Él [tocaba] la guitarra en una banda.'),
    T('desde los diez (has)', "He['s played] the guitar since he was ten.", 'Él [toca] la guitarra desde los diez años.'),
    F('pregunta', '[Does he play] the guitar?', '¿Él [toca] la guitarra?'),
    F('puede (can)', 'He [can play] the guitar.', 'Él [sabe tocar] la guitarra.')] },
  { id: 'jm-if', icon: '💭', title: 'Si tengo tiempo…', steps: [
    R("If I have time, I'll [call you].", 'Si tengo tiempo, [te llamo].'),
    W("If I have time, I'll [help you].", 'Si tengo tiempo, [te ayudo].'),
    T('si tuviera (no es seguro)', "If I [had] time, I['d] call you.", 'Si [tuviera] tiempo, te [llamaría].'),
    T('si hubiera tenido (ya pasó)', 'If I [had had] time, I [would have called] you.', 'Si [hubiera tenido] tiempo, te [habría llamado].'),
    F('negativa', "If I [don't have] time, I['ll] call you tomorrow.", 'Si [no tengo] tiempo, te llamo mañana.'),
    F('cuando (when)', "[When] I have time, I'll call you.", '[Cuando] tenga tiempo, te llamo.')] },
  { id: 'jm-think', icon: '💡', title: 'Dar una opinión', steps: [
    R("I think [it's a good idea].", 'Creo que [es una buena idea].'),
    W("I think [it's too expensive].", 'Creo que [es demasiado caro].'),
    T('antes (pensaba)', 'I [thought] it [was] a good idea.', '[Pensaba] que [era] una buena idea.'),
    F('negativa', "I [don't think] it's a good idea.", '[No creo] que sea una buena idea.'),
    F('pregunta', '[Do you think] it\'s a good idea?', '¿[Cree] que es una buena idea?'),
    F('más seguro (I\'m sure)', "[I'm sure] it's a good idea.", '[Estoy seguro de] que es una buena idea.')] },
];

// Los 111 verbos del mazo del usuario, con el mismo formato.
export const VERB_JUGGLES = JUGGLE_SETS.map(j => ({
  id: j.id, icon: '🔁', title: j.verb, cat: j.catName, fromBrain: true,
  steps: j.steps.map((st, i) => ({ kind: i ? 'tense' : 'repeat', label: i ? st.label : 'repetir igual', en: st.en, es: st.es })),
}));

// ---------------- Esqueletos propios ----------------
export const SKELETON_GROUPS = [
  { id: 'me', name: 'Hablar de usted', icon: '🙂' },
  { id: 'opinion', name: 'Opinar y explicar', icon: '💬' },
  { id: 'plans', name: 'Planes y deseos', icon: '📅' },
  { id: 'ask', name: 'Pedir y proponer', icon: '🙋' },
  { id: 'past', name: 'Contar lo que pasó', icon: '📜' },
];
const S = (id, group, frame, slots, model, swaps, level = 'A2') => ({ id, group, frame, slots, model: { en: model[0], es: model[1] }, swaps: swaps.map(([es, en]) => ({ es, en })), level });

export const SKELETONS = [
  S('sk-meaning', 'plans', "I've been meaning to {action} for {time}.", { action: 'algo que quiere hacer', time: 'cuánto tiempo' },
    ["I've been meaning to call my grandma for weeks.", 'Hace semanas que quiero llamar a mi abuela.'],
    [['Hace meses que quiero arreglar mi bicicleta.', "I've been meaning to fix my bike for months."],
     ['Hace años que quiero aprender a nadar.', "I've been meaning to learn to swim for years."],
     ['Hace días que quiero ordenar mi cuarto.', "I've been meaning to clean my room for days."]], 'B1'),
  S('sk-thing-is', 'opinion', "The thing is, I don't have {thing}.", { thing: 'lo que le falta' },
    ["The thing is, I don't have time.", 'Lo que pasa es que no tengo tiempo.'],
    [['Lo que pasa es que no tengo dinero.', "The thing is, I don't have money."],
     ['Lo que pasa es que no tengo carro.', "The thing is, I don't have a car."],
     ['Lo que pasa es que no tengo su número.', "The thing is, I don't have her number."]]),
  S('sk-depends', 'opinion', 'It depends on {thing}.', { thing: 'de qué depende' },
    ['It depends on the weather.', 'Depende del clima.'],
    [['Depende del precio.', 'It depends on the price.'],
     ['Depende de mi jefe.', 'It depends on my boss.'],
     ['Depende de cuánto cueste.', 'It depends on how much it costs.']]),
  S('sk-thinking', 'plans', "I'm thinking about {doing}.", { doing: 'acción con -ing' },
    ["I'm thinking about changing jobs.", 'Estoy pensando en cambiar de trabajo.'],
    [['Estoy pensando en mudarme.', "I'm thinking about moving."],
     ['Estoy pensando en comprar un carro.', "I'm thinking about buying a car."],
     ['Estoy pensando en tomar clases de baile.', "I'm thinking about taking dance classes."]]),
  S('sk-how-about', 'ask', 'How about {doing} {when}?', { doing: 'acción con -ing', when: 'cuándo' },
    ['How about going for a walk after lunch?', '¿Qué tal si salimos a caminar después del almuerzo?'],
    [['¿Qué tal si vemos una película esta noche?', 'How about watching a movie tonight?'],
     ['¿Qué tal si nos vemos mañana?', 'How about meeting tomorrow?'],
     ['¿Qué tal si comemos pizza el viernes?', 'How about having pizza on Friday?']]),
  S('sk-mind', 'ask', 'Do you mind if I {action}?', { action: 'lo que quiere hacer' },
    ['Do you mind if I open the window?', '¿Le molesta si abro la ventana?'],
    [['¿Le molesta si me siento aquí?', 'Do you mind if I sit here?'],
     ['¿Le molesta si uso su cargador?', 'Do you mind if I use your charger?'],
     ['¿Le molesta si llego un poco tarde?', 'Do you mind if I arrive a little late?']], 'B1'),
  S('sk-used-to', 'me', 'I used to {before}, but now I {now}.', { before: 'lo que hacía antes', now: 'lo que hace ahora' },
    ['I used to drink coffee, but now I drink tea.', 'Antes tomaba café, pero ahora tomo té.'],
    [['Antes vivía en el campo, pero ahora vivo en la ciudad.', 'I used to live in the country, but now I live in the city.'],
     ['Antes jugaba fútbol, pero ahora corro.', 'I used to play soccer, but now I run.'],
     ['Antes trabajaba de noche, pero ahora trabajo de día.', 'I used to work at night, but now I work during the day.']]),
  S('sk-wish', 'plans', 'I wish I could {action}.', { action: 'lo que le gustaría poder hacer' },
    ['I wish I could speak French.', 'Ojalá pudiera hablar francés.'],
    [['Ojalá pudiera viajar más.', 'I wish I could travel more.'],
     ['Ojalá pudiera dormir hasta tarde.', 'I wish I could sleep in.'],
     ['Ojalá pudiera ver a mi familia más seguido.', 'I wish I could see my family more often.']], 'B1'),
  S('sk-if-i-were', 'opinion', 'If I were you, I would {advice}.', { advice: 'el consejo' },
    ['If I were you, I would take the job.', 'Yo que usted, aceptaría el trabajo.'],
    [['Yo que usted, hablaría con él.', 'If I were you, I would talk to him.'],
     ['Yo que usted, esperaría un poco.', 'If I were you, I would wait a little.'],
     ['Yo que usted, iría al médico.', 'If I were you, I would go to the doctor.']], 'B1'),
  S('sk-last-time', 'past', 'The last time I {did} was {when}.', { did: 'acción en pasado', when: 'cuándo fue' },
    ['The last time I went to the beach was two years ago.', 'La última vez que fui a la playa fue hace dos años.'],
    [['La última vez que vi a mi primo fue en Navidad.', 'The last time I saw my cousin was at Christmas.'],
     ['La última vez que cociné fue el domingo.', 'The last time I cooked was on Sunday.'],
     ['La última vez que me enfermé fue en enero.', 'The last time I got sick was in January.']], 'B1'),
  S('sk-not-sure', 'opinion', "I'm not sure if {idea}.", { idea: 'lo que no sabe' },
    ["I'm not sure if the store is open.", 'No estoy seguro de si la tienda está abierta.'],
    [['No estoy seguro de si él viene.', "I'm not sure if he's coming."],
     ['No estoy seguro de si tengo tiempo.', "I'm not sure if I have time."],
     ['No estoy seguro de si es una buena idea.', "I'm not sure if it's a good idea."]]),
  S('sk-takes-me', 'me', 'It takes me {time} to {action}.', { time: 'cuánto tiempo', action: 'qué hace' },
    ['It takes me twenty minutes to get to work.', 'Me toma veinte minutos llegar al trabajo.'],
    [['Me toma una hora cocinar la cena.', 'It takes me an hour to cook dinner.'],
     ['Me toma cinco minutos bañarme.', 'It takes me five minutes to take a shower.'],
     ['Me toma mucho tiempo dormirme.', 'It takes me a long time to fall asleep.']]),
  S('sk-could-you', 'ask', 'Could you {action}, please?', { action: 'lo que pide' },
    ['Could you speak more slowly, please?', '¿Podría hablar más despacio, por favor?'],
    [['¿Podría repetir eso, por favor?', 'Could you repeat that, please?'],
     ['¿Podría ayudarme con esto, por favor?', 'Could you help me with this, please?'],
     ['¿Podría cerrar la puerta, por favor?', 'Could you close the door, please?']], 'A1'),
  S('sk-rather', 'me', "I'd rather {this} than {that}.", { this: 'lo que prefiere', that: 'lo otro' },
    ["I'd rather stay home than go out tonight.", 'Prefiero quedarme en casa que salir esta noche.'],
    [['Prefiero caminar que tomar un taxi.', "I'd rather walk than take a taxi."],
     ['Prefiero cocinar que pedir comida.', "I'd rather cook than order food."],
     ['Prefiero leer que ver televisión.', "I'd rather read than watch TV."]], 'B1'),
  S('sk-cant-stand', 'me', "I can't stand {thing}.", { thing: 'lo que no soporta' },
    ["I can't stand waiting in line.", 'No soporto hacer fila.'],
    [['No soporto el ruido.', "I can't stand the noise."],
     ['No soporto levantarme temprano.', "I can't stand getting up early."],
     ['No soporto a la gente grosera.', "I can't stand rude people."]]),
  S('sk-like-most', 'opinion', 'What I like most about {thing} is {reason}.', { thing: 'de qué habla', reason: 'lo que más le gusta' },
    ['What I like most about my job is the people.', 'Lo que más me gusta de mi trabajo es la gente.'],
    [['Lo que más me gusta de mi ciudad es la comida.', 'What I like most about my city is the food.'],
     ['Lo que más me gusta del verano es el sol.', 'What I like most about summer is the sun.'],
     ['Lo que más me gusta de mi casa es la luz.', 'What I like most about my house is the light.']], 'B1'),
  S('sk-ever', 'past', 'Have you ever {done}?', { done: 'experiencia (forma terminada)' },
    ['Have you ever tried sushi?', '¿Alguna vez ha probado el sushi?'],
    [['¿Alguna vez ha visto la nieve?', 'Have you ever seen snow?'],
     ['¿Alguna vez ha perdido un vuelo?', 'Have you ever missed a flight?'],
     ['¿Alguna vez ha montado a caballo?', 'Have you ever ridden a horse?']]),
  S('sk-calling-about', 'ask', "I'm calling about {thing}.", { thing: 'el motivo de la llamada' },
    ["I'm calling about my order.", 'Llamo por mi pedido.'],
    [['Llamo por la cita de mañana.', "I'm calling about tomorrow's appointment."],
     ['Llamo por el apartamento.', "I'm calling about the apartment."],
     ['Llamo por la factura.', "I'm calling about the bill."]]),
  S('sk-not-that', 'opinion', "It's not that {reason1}, it's just that {reason2}.", { reason1: 'lo que no es', reason2: 'la razón real' },
    ["It's not that I don't like it, it's just that it's too expensive.", 'No es que no me guste, es solo que es muy caro.'],
    [['No es que esté cansado, es solo que tengo mucho trabajo.', "It's not that I'm tired, it's just that I have a lot of work."],
     ['No es que no quiera ir, es solo que no tengo tiempo.', "It's not that I don't want to go, it's just that I don't have time."],
     ['No es que sea difícil, es solo que toma tiempo.', "It's not that it's hard, it's just that it takes time."]], 'B2'),
  S('sk-forward', 'plans', "I'm looking forward to {thing}.", { thing: 'lo que espera (con -ing o algo)' },
    ["I'm looking forward to seeing you.", 'Tengo ganas de verte.'],
    [['Tengo ganas de que lleguen las vacaciones.', "I'm looking forward to the holidays."],
     ['Tengo ganas de probar ese restaurante.', "I'm looking forward to trying that restaurant."],
     ['Tengo ganas de conocer a tu familia.', "I'm looking forward to meeting your family."]], 'B1'),
];

// Nombre de cada esqueleto en español (lo que sirve para decir).
const SK_TITLES = {
  'sk-meaning': 'Hace tiempo que quiero…', 'sk-thing-is': 'Lo que pasa es que…', 'sk-depends': 'Depende de…',
  'sk-thinking': 'Estoy pensando en…', 'sk-how-about': '¿Qué tal si…?', 'sk-mind': '¿Le molesta si…?',
  'sk-used-to': 'Antes…, pero ahora…', 'sk-wish': 'Ojalá pudiera…', 'sk-if-i-were': 'Yo que usted…',
  'sk-last-time': 'La última vez que…', 'sk-not-sure': 'No estoy seguro de si…', 'sk-takes-me': 'Me toma… hacer…',
  'sk-could-you': '¿Podría…, por favor?', 'sk-rather': 'Prefiero… que…', 'sk-cant-stand': 'No soporto…',
  'sk-like-most': 'Lo que más me gusta de…', 'sk-ever': '¿Alguna vez ha…?', 'sk-calling-about': 'Llamo por…',
  'sk-not-that': 'No es que…, es solo que…', 'sk-forward': 'Tengo ganas de…',
};
for (const s of SKELETONS) s.title = SK_TITLES[s.id];

export const ALL_JUGGLES = () => [...JUGGLES, ...VERB_JUGGLES];
export const drillById = (id, mine = []) => [...JUGGLES, ...VERB_JUGGLES, ...SKELETONS, ...mine].find(x => x.id === id);

// ---------------- Texto ----------------
export const plain = t => (t || '').replace(/[[\]]/g, '');

// Partes de un texto con [marcas]: [{ text, mark }]
export function markParts(t) {
  return (t || '').split(/(\[[^\]]*\])/).filter(Boolean).map(p => p.startsWith('[') ? { text: p.slice(1, -1), mark: true } : { text: p, mark: false });
}

// Partes de un esqueleto: hueso (fijo) o hueco {slot}.
export function frameParts(frame) {
  return frame.split(/(\{[a-z0-9_]+\})/i).filter(Boolean).map(p => /^\{.+\}$/.test(p) ? { slot: p.slice(1, -1) } : { bone: p });
}

// ---------------- Revisión sin IA ----------------
const NUM = { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
  11: 'eleven', 12: 'twelve', 15: 'fifteen', 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 100: 'a hundred' };
const HAD_NEXT = /^(been|had|done|gone|seen|known|got|gotten|made|taken|given|eaten|written|never|already|just|\w+ed)$/;

// Minúsculas, sin puntuación, contracciones abiertas y números en letras: «I'd been» = «I had been».
export function normalize(t) {
  let s = plain(t).toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ');
  s = s.replace(/\bcan't\b/g, 'can not').replace(/\bcannot\b/g, 'can not').replace(/\bwon't\b/g, 'will not').replace(/n't\b/g, ' not')
    .replace(/'m\b/g, ' am').replace(/'re\b/g, ' are').replace(/'ve\b/g, ' have').replace(/'ll\b/g, ' will');
  s = s.replace(/'d (\w+)/g, (_, w) => (HAD_NEXT.test(w) ? ' had ' : ' would ') + w).replace(/'d\b/g, ' would');
  s = s.replace(/\b(he|she|it|that|there|what|who|where|here|how|this)'s (\w+)/g, (_, a, w) => `${a} ${/^(been|got|gotten|had)$/.test(w) ? 'has' : 'is'} ${w}`)
    .replace(/\b(he|she|it|that|there|what|who|where|here|how|this)'s\b/g, '$1 is').replace(/'s\b/g, 's').replace(/'/g, '');
  s = s.replace(/\b\d+\b/g, n => NUM[n] ?? n);
  return s.replace(/\s+/g, ' ').trim();
}
const words = t => normalize(t).split(' ').filter(Boolean);

// Palabras en común en orden (subsecuencia más larga): cuánto se parece el intento al objetivo.
function lcs(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  return dp[0][0];
}

// 'exact' (igual, aunque cambien mayúsculas, puntos o contracciones), 'close' (le falta o sobra 1 palabra) o 'wrong'.
export function localCheck(target, attempt, accept = []) {
  const b = words(attempt);
  if (!b.length) return { result: 'wrong', score: 0 };
  let best = { result: 'wrong', score: 0 };
  for (const t of [target, ...accept]) {
    const a = words(t);
    if (a.join(' ') === b.join(' ')) return { result: 'exact', score: 100 };
    const common = lcs(a, b);
    const score = Math.round((common / Math.max(a.length, b.length)) * 100);
    const diff = Math.max(a.length, b.length) - common;
    const result = diff <= 1 && a.length >= 3 ? 'close' : 'wrong';
    if (score > best.score) best = { result, score };
  }
  return best;
}

// ¿El intento usa el esqueleto? Los huesos (palabras fijas) deben aparecer en orden.
export function keepsFrame(frame, attempt) {
  const bones = frameParts(frame).filter(p => p.bone).map(p => words(p.bone)).filter(x => x.length);
  let rest = words(attempt);
  for (const bone of bones) {
    let found = -1;
    for (let i = 0; i + bone.length <= rest.length; i++) if (bone.every((w, k) => rest[i + k] === w)) { found = i; break; }
    if (found < 0) return false;
    rest = rest.slice(found + bone.length);
  }
  return true;
}

// Rellena un esqueleto con valores: fill('Do you mind if I {action}?', { action: 'sit here' }).
export const fillFrame = (frame, values) => frame.replace(/\{([a-z0-9_]+)\}/gi, (_, k) => values[k] ?? '___');

// Un ejercicio creado por la IA se valida antes de guardarlo (que no rompa la pantalla).
export function validJuggle(x) {
  return !!x && Array.isArray(x.steps) && x.steps.length >= 3 && x.steps.every(s => s && typeof s.en === 'string' && s.en.trim() && typeof s.es === 'string');
}
export function validSkeleton(x) {
  if (!x || typeof x.frame !== 'string' || !/\{[a-z0-9_]+\}/i.test(x.frame) || !x.model?.en) return false;
  if (!Array.isArray(x.swaps) || !x.swaps.length || !x.swaps.every(s => s?.es && s?.en)) return false;
  return keepsFrame(x.frame, x.model.en);
}
