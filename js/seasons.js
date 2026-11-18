// Eventos de temporada (como los SeasonalEventGame de LingoLooper) y la estación del año para el prompt
// (ClimateSeason). Los temas son propios de Charla: cada uno aparece solo en sus fechas, en todos los lugares.
import { makeTopic } from './topics.js';

const ev = (from, to, ...args) => ({ from, to, ...makeTopic(...args), season: true });

export const SEASONAL = [
  ev('12-26', '01-10', 's_new_year', 'world', '🎉', 'Año nuevo', 'Cuente cómo recibió el año y qué propósitos tiene.',
    "the New Year: how each of you celebrated New Year's Eve, family traditions and resolutions for the year ahead.",
    [['party', "Say how you spent New Year's Eve"], ['resolution', 'Share one resolution for this year'], ['why', 'Explain why it matters to you']],
    ['Happy New Year!', 'This year I want to…', "I'm going to try to…"],
    ['Simple future with "I want to" and "I am going to".', 'Explain reasons and ask about their resolutions.', 'Discuss why resolutions fail and how to keep them.']),
  ev('02-07', '02-15', 's_valentine', 'friends', '💕', 'Amor y amistad', 'Hablen de las personas que quieren y de un buen plan para celebrarlo.',
    "Valentine's Day and friendship: plans for the day, gifts, and what makes a good friend or partner.",
    [['plan', 'Describe a nice plan for the day'], ['gift', 'Talk about a gift you gave or got'], ['friend', 'Say what makes a good friend']],
    ['A good friend is someone who…', 'I gave her…', 'We could go to…'],
    ['Short sentences about people you love.', 'Compare plans and give opinions with "I think".', 'Debate whether the holiday is too commercial.']),
  ev('03-15', '04-10', 's_spring', 'daily', '🌱', 'Llega la primavera', 'Planeen algo al aire libre para estos días más largos.',
    'spring: longer days, spring cleaning, a short break, and outdoor plans.',
    [['change', 'Say what changes in spring where you live'], ['plan', 'Suggest an outdoor plan'], ['agree', 'Agree on a day and time']],
    ['The days are getting longer.', 'How about a picnic?', "Let's meet on…"],
    ['Weather words and "Let\'s…".', 'Make and accept suggestions politely.', 'Talk about how seasons change your mood and routine.']),
  ev('05-01', '05-12', 's_mothers_day', 'family', '🎁', 'Día de la madre', 'Elijan un regalo y cuenten algo de su mamá.',
    "Mother's Day: choosing a gift, family plans for the day, and a good memory with mom.",
    [['describe', 'Describe your mom or a mother figure'], ['gift', 'Choose a gift together'], ['memory', 'Tell a nice memory']],
    ['My mom is very…', 'She would love…', 'I remember when…'],
    ['Adjectives to describe people.', 'Past tense memories and suggestions.', 'Family roles and how they are changing.']),
  ev('06-20', '07-31', 's_summer', 'travel', '☀️', 'Vacaciones de verano', 'Cuenten a dónde les gustaría ir estas vacaciones.',
    'summer holidays: where to go, beach or mountains, travel plans and past trips.',
    [['where', 'Say where you would like to go'], ['past', 'Tell about a past trip'], ['ask', 'Ask about their plans']],
    ["I'd love to go to…", 'Last summer I…', 'Are you going anywhere?'],
    ['"I would like to go to…" and simple past.', 'Compare places and give reasons.', 'Discuss tourism, budgets and travel trade-offs.']),
  ev('08-15', '09-10', 's_back_to_routine', 'study', '📚', 'Volver a la rutina', 'Cuente cómo vuelve a la rutina después de las vacaciones.',
    'going back to school or work after the holidays: new routines, goals for the term, and missing the vacation.',
    [['routine', 'Describe your new routine'], ['goal', 'Share a goal for these months'], ['miss', 'Say what you miss from the holidays']],
    ['I usually get up at…', 'This term I want to…', 'I miss…'],
    ['Present simple for routines.', 'Goals and plans with "want to" and "going to".', 'Productivity, habits and balance.']),
  ev('10-20', '11-01', 's_halloween', 'friends', '🎭', 'Halloween', 'Hablen de disfraces, fiestas y alguna historia de miedo.',
    'Halloween: costumes, parties, scary movies and a short spooky story.',
    [['costume', 'Describe a costume'], ['scary', 'Say what scares you'], ['story', 'Tell a short spooky story']],
    ["I'm going to dress up as…", "I'm scared of…", 'It was a dark night and…'],
    ['Simple words: costume, scary, party.', 'Tell a short story in the past.', 'Build suspense in a longer story and react to theirs.']),
  ev('11-10', '11-30', 's_thanksgiving', 'family', '💛', 'Dar las gracias', 'Cuenten por qué están agradecidos este año y cómo es una cena familiar.',
    'Thanksgiving and gratitude: what you are thankful for this year, a big family dinner and favourite dishes.',
    [['thankful', 'Say one thing you are thankful for'], ['dinner', 'Describe a family dinner'], ['dish', 'Talk about your favourite dish']],
    ["I'm thankful for…", 'We usually eat…', 'My favourite dish is…'],
    ['"I am thankful for" and food words.', 'Describe traditions and compare them with theirs.', 'Reflect on the year and what gratitude means to you.']),
  ev('12-01', '12-25', 's_christmas', 'family', '🎄', 'Navidad', 'Hablen de regalos, comidas y tradiciones de diciembre.',
    'Christmas and December holidays: gifts, food, decorations and family traditions.',
    [['tradition', 'Describe one family tradition'], ['gift', 'Talk about a gift you want to give'], ['food', 'Describe a holiday dish']],
    ['Merry Christmas!', 'We always…', "I'm going to give my brother…"],
    ['Simple sentences about family and food.', 'Compare traditions in your countries.', 'Discuss consumerism, family time and what the season means.']),
];

const mmdd = d => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inWindow = (e, d) => {
  const x = mmdd(d);
  return e.from <= e.to ? x >= e.from && x <= e.to : x >= e.from || x <= e.to;   // la ventana puede cruzar el año
};

// Eventos activos en la fecha (normalmente uno).
export function activeSeasonal(d = new Date()) { return SEASONAL.filter(e => inWindow(e, d)); }
export const seasonalById = id => SEASONAL.find(e => e.id === id);

const EN = { s_new_year: "New Year's", s_valentine: "Valentine's Day", s_spring: 'the start of spring', s_mothers_day: "Mother's Day", s_summer: 'the summer holidays', s_back_to_routine: 'back-to-school season', s_halloween: 'Halloween', s_thanksgiving: 'Thanksgiving', s_christmas: 'Christmas' };

// Línea para el prompt del personaje: fecha, estación y fiesta cercana (sin forzar el tema).
export function seasonLine(d = new Date()) {
  const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const near = activeSeasonal(d).map(e => EN[e.id]).filter(Boolean);
  return `Today is ${date}; it is ${season(d)} where you live.` + (near.length ? ` It is the season of ${near.join(' and ')}: you may mention it naturally if it fits, but do not force it.` : '');
}

// Estación del año donde viven los personajes (EE. UU. y Reino Unido: hemisferio norte).
export function season(d = new Date()) {
  const x = mmdd(d);
  if (x >= '03-20' && x < '06-21') return x < '04-20' ? 'early spring' : 'spring';
  if (x >= '06-21' && x < '09-22') return 'summer';
  if (x >= '09-22' && x < '12-21') return x >= '11-01' ? 'late autumn' : 'autumn';
  return 'winter';
}
