// Contenido de lecciones (texto propio de Charla). Completa lo que el APK de LingoLooper muestra que existe:
//  - sus 10 lugares (cafetería, barrio, supermercado, parque, centro, restaurante, gimnasio, oficina,
//    hospital y ayuntamiento): aquí están los que Charla no tenía (barrio, supermercado, ayuntamiento);
//  - cada misión adaptada a 3 niveles (FacetsBeginner / Intermediate / Advanced);
//  - el plan de aprendizaje de la bienvenida (meta diaria, intereses, edad).
// Las misiones de LingoLooper vienen de su servidor (no están en el APK), por eso estas son propias.

// ---------- Cómo cambia cada misión según el nivel ----------
// beginner = niveles 1–2, intermediate = 3, advanced = 4–6 (ver facetForRank en data.js).
export const FACETS = {
  cafe_order: {
    beginner: 'Keep the menu simple: coffee, tea, juice, croissant, muffin.',
    intermediate: 'Offer options: milk type, size, warm it up.',
    advanced: 'Recommend seasonal specials, chat about preferences.',
  },
  cafe_meet: {
    beginner: 'Ask simple personal questions one at a time: name, country, job.',
    intermediate: 'Share a short story about the neighbourhood and ask about their plans here.',
    advanced: 'Talk about culture differences, opinions and life goals; use humour.',
  },
  cafe_complain: {
    beginner: 'The mistake is obvious (tea instead of coffee). Apologise simply and fix it.',
    intermediate: 'Be a bit confused at first; offer a free cookie or a refund.',
    advanced: 'You are very busy and slightly defensive; the learner must stay polite but firm.',
  },
  cafe_work: {
    beginner: 'Answer with short facts: wifi password, outlet location, closing time.',
    intermediate: 'Explain house rules (time limit at busy hours, minimum order).',
    advanced: 'Negotiate: the café is full; suggest sharing a table or coming back later.',
  },
  cafe_dessert: {
    beginner: 'Use simple adjectives: sweet, big, chocolate, cold.',
    intermediate: 'Describe textures and flavours (creamy, crunchy, a hint of lemon).',
    advanced: 'Compare desserts in detail, mention ingredients, allergies and pairing with drinks.',
  },
  air_checkin: {
    beginner: 'Ask only for passport, destination and bags. Speak slowly.',
    intermediate: 'Add seat preference, liquids rules and boarding gate/time.',
    advanced: 'The bag is overweight: discuss fees, options and an upgrade offer.',
  },
  air_delay: {
    beginner: 'Say the new time clearly and offer a simple solution (a meal voucher).',
    intermediate: 'Explain the reason (weather) and options: wait, rebook or a later flight.',
    advanced: 'The connection will be missed: discuss compensation, hotel and rights.',
  },
  air_smalltalk: {
    beginner: 'Ask where they are going and why. Talk about the weather there.',
    intermediate: 'Share a past trip and ask for travel tips.',
    advanced: 'Debate travel styles (backpacking vs luxury) and the impact of tourism.',
  },
  air_lost: {
    beginner: 'Ask for the colour and size of the suitcase and a phone number.',
    intermediate: 'Ask what is inside, flight number, and explain the delivery process.',
    advanced: 'The bag may be lost for days: discuss essentials, reimbursement and claims.',
  },
  air_immigration: {
    beginner: 'Ask only: purpose of trip, how long, where they will stay.',
    intermediate: 'Add return ticket, job and money for the stay.',
    advanced: 'Be strict and ask detailed follow-up questions about inconsistencies.',
  },
  hotel_checkin: {
    beginner: 'Ask for the name and number of nights. Give the room number and breakfast time.',
    intermediate: 'Explain amenities (pool, gym, wifi) and ask about preferences.',
    advanced: 'The booking is missing: solve it together and offer an alternative room.',
  },
  hotel_problem: {
    beginner: 'One simple problem (no towels, TV broken). Promise to fix it.',
    intermediate: 'Ask for details, offer to send someone or change the room.',
    advanced: 'Second complaint of the day: handle frustration and offer compensation.',
  },
  hotel_tips: {
    beginner: 'Recommend one place and say it is near or far.',
    intermediate: 'Recommend options by interest and explain transport.',
    advanced: 'Give insider tips, opening hours, prices and how to avoid crowds.',
  },
  hotel_checkout: {
    beginner: 'Ask for the key and say goodbye. Offer to call a taxi.',
    intermediate: 'Review the bill (minibar) and arrange luggage storage.',
    advanced: 'There is an unexpected charge on the bill to discuss and remove.',
  },
  office_first: {
    beginner: 'Introduce the team and the desk; simple questions about their background.',
    intermediate: 'Explain tools, lunch habits and the first week plan.',
    advanced: 'Talk about company culture, expectations and goals for the first months.',
  },
  office_meeting: {
    beginner: 'Offer two simple times (Monday at 10, Tuesday at 3).',
    intermediate: 'Your calendar is full; negotiate day, time and duration.',
    advanced: 'Coordinate with time zones and agree on an agenda for the meeting.',
  },
  office_opinion: {
    beginner: 'Ask yes/no and simple "I like / I don\'t like" opinions.',
    intermediate: 'Ask for reasons and an alternative idea.',
    advanced: 'Push back with counter-arguments; reach a compromise diplomatically.',
  },
  office_tech: {
    beginner: 'Ask simple questions: Is it on? Is it charged? Restart it.',
    intermediate: 'Walk through troubleshooting steps and error messages.',
    advanced: 'Discuss options under time pressure: borrow a laptop, reschedule, call IT.',
  },
  park_weekend: {
    beginner: 'Use simple present and past: I go, I went, I like.',
    intermediate: 'Ask for details about plans and suggest an activity.',
    advanced: 'Share stories with humour and compare weekends in different countries.',
  },
  park_hobby: {
    beginner: 'Name hobbies and say how often (every day, on Sundays).',
    intermediate: 'Ask how they started and what they enjoy about it.',
    advanced: 'Discuss passion, mastery and balancing hobbies with work.',
  },
  park_pets: {
    beginner: 'Talk about pet names, colours and age.',
    intermediate: 'Tell funny pet stories and ask about pet care.',
    advanced: 'Discuss adopting vs buying, responsibilities and pets in cities.',
  },
  park_weather: {
    beginner: 'Hot, cold, sunny, rainy. What do you do when it rains?',
    intermediate: 'Talk about the forecast and plans for the week.',
    advanced: 'Talk about seasons, climate and how weather changes city life.',
  },
  diner_order: {
    beginner: 'Short menu: burger, salad, soup, drinks. One question at a time.',
    intermediate: 'Ask how they want it cooked, sides and substitutions.',
    advanced: 'Recommend specials, describe dishes and handle special requests.',
  },
  diner_bill: {
    beginner: 'The mistake is an extra drink. Say the total clearly.',
    intermediate: 'Splitting the bill, tip and payment method.',
    advanced: 'A discount was not applied; discuss it and the service charge.',
  },
  diner_allergy: {
    beginner: 'Answer simply: yes it has nuts / no it does not.',
    intermediate: 'Explain ingredients and offer safe options.',
    advanced: 'Discuss cross-contamination and talk to the chef about changes.',
  },
  clinic_symptoms: {
    beginner: 'Ask where it hurts and since when. Simple advice: rest, water.',
    intermediate: 'Ask about pain level, fever and medicines they take.',
    advanced: 'Ask detailed medical history and explain possible causes calmly.',
  },
  clinic_appointment: {
    beginner: 'Offer a day and time; ask name and phone.',
    intermediate: 'Ask the reason for the visit and insurance.',
    advanced: 'No appointments this week: negotiate urgent care or a cancellation list.',
  },
  clinic_pharmacy: {
    beginner: 'Say how many pills and how often (twice a day).',
    intermediate: 'Explain with or without food and what to avoid.',
    advanced: 'Explain side effects, interactions and what to do if a dose is missed.',
  },
  street_directions: {
    beginner: 'Use only: straight, left, right, next to, across from, blocks.',
    intermediate: 'Give directions with landmarks and an alternative route.',
    advanced: 'Give long directions fast; the learner must ask you to repeat or clarify.',
  },
  street_food: {
    beginner: 'Three dishes only; say if they are spicy or not.',
    intermediate: 'Explain ingredients, sizes and combos.',
    advanced: 'Talk about the recipe origin and recommend local favourites.',
  },
  street_lost: {
    beginner: 'Ask the colour and where they were.',
    intermediate: 'Ask what was inside and suggest calling the bank.',
    advanced: 'Guide them through a police report and cancelling cards.',
  },
  shop_size: {
    beginner: 'Sizes S, M, L and colours. Show the fitting room.',
    intermediate: 'Talk about fit (too tight, loose) and styles.',
    advanced: 'Give style advice and compare materials and prices.',
  },
  shop_return: {
    beginner: 'Ask for the receipt and offer a refund.',
    intermediate: 'Explain the return policy and offer an exchange.',
    advanced: 'The return period has passed: negotiate store credit.',
  },
  shop_gift: {
    beginner: 'Ask who the gift is for and the budget; show two options.',
    intermediate: 'Ask about their style and hobbies; offer gift wrapping.',
    advanced: 'Suggest creative gifts and discuss what makes a good present.',
  },
  gym_join: {
    beginner: 'Two plans only (monthly, yearly) and opening hours.',
    intermediate: 'Classes, personal trainer and a free trial day.',
    advanced: 'Compare plans in detail and negotiate a discount or cancellation terms.',
  },
  gym_routine: {
    beginner: 'Simple exercises: run, walk, lift. How many days a week.',
    intermediate: 'Ask about goals and design a weekly plan.',
    advanced: 'Discuss technique, injuries and progress tracking.',
  },
  gym_habits: {
    beginner: 'Food, water and sleep with simple words.',
    intermediate: 'Talk about routines and small changes that help.',
    advanced: 'Discuss motivation, stress and science-based habits.',
  },
  party_meet: {
    beginner: 'Ask name, how they know the host and what they do.',
    intermediate: 'Find things in common and tell a short story.',
    advanced: 'Use humour and keep the conversation flowing with follow-up questions.',
  },
  party_movies: {
    beginner: 'Name a movie and say if you like it.',
    intermediate: 'Describe the plot without spoilers and recommend something.',
    advanced: 'Discuss directors, acting and why a film is overrated or underrated.',
  },
  party_plans: {
    beginner: 'Suggest one activity and a day.',
    intermediate: 'Negotiate what, when and where; exchange contact.',
    advanced: 'Make complex plans with alternatives in case something changes.',
  },
  int_about: {
    beginner: 'Simple questions: name, studies, last job.',
    intermediate: 'Ask about experience and why they want this job.',
    advanced: 'Challenging follow-up questions about achievements and gaps.',
  },
  int_strengths: {
    beginner: 'Ask for one strength and one weakness.',
    intermediate: 'Ask for an example of each.',
    advanced: 'Use the STAR method and push for measurable results.',
  },
  int_questions: {
    beginner: 'Invite one question and say when they will hear back.',
    intermediate: 'Discuss team, schedule and next steps.',
    advanced: 'Negotiate salary, benefits and start date.',
  },
  nb_new: {
    beginner: 'Ask only name, where they are from and which apartment. Offer one simple help.',
    intermediate: 'Tell them about the building rules and the neighbours; ask about their move.',
    advanced: 'Share neighbourhood gossip and history; talk about what makes a good community.',
  },
  nb_borrow: {
    beginner: 'Say yes or no simply and ask when they will give it back.',
    intermediate: 'Ask what the job is, give a tip on how to use the tool.',
    advanced: 'You lent something before and it came back late: agree on clear conditions, with humour.',
  },
  nb_noise: {
    beginner: 'Say sorry simply and promise to be quiet after 10.',
    intermediate: 'Explain the reason (a party, a new baby, moving) and suggest a solution.',
    advanced: 'Be a little defensive at first; the learner must stay diplomatic and negotiate.',
  },
  nb_package: {
    beginner: 'Ask the name and apartment number; give the package.',
    intermediate: 'You opened it by mistake; apologise and explain.',
    advanced: 'The package is missing: discuss what to do with the delivery company together.',
  },
  nb_tips: {
    beginner: 'Recommend one place and say near or far.',
    intermediate: 'Compare two options (price, quality) and explain the way.',
    advanced: 'Give detailed local knowledge: hidden places, best times, what to avoid.',
  },
  groc_find: {
    beginner: 'Use simple places: aisle 3, near the bread, on the left.',
    intermediate: 'Explain where things are with landmarks; one item is sold out.',
    advanced: 'Talk about brands, organic options and when the item will be back in stock.',
  },
  groc_checkout: {
    beginner: 'Ask only: bag? card or cash? Say the total clearly.',
    intermediate: 'Ask about the store card and coupons; check the wrong price.',
    advanced: 'Handle the price problem: call a manager, explain the policy and offer a refund of the difference.',
  },
  groc_deli: {
    beginner: 'Use simple amounts: a little, a lot, 10 slices.',
    intermediate: 'Use pounds and ounces; offer to taste before buying.',
    advanced: 'Recommend cheeses and meats for a party, with pairing ideas.',
  },
  groc_recipe: {
    beginner: 'Simple dish (pasta, salad). Name the ingredients one by one.',
    intermediate: 'Suggest substitutes and compare prices and sizes.',
    advanced: 'Discuss the recipe, quantities for many people and dietary needs.',
  },
  ch_register: {
    beginner: 'Ask one data at a time and help with spelling.',
    intermediate: 'Explain the form and what document is missing.',
    advanced: 'Use formal language and explain the deadline and what happens if it is late.',
  },
  ch_permit: {
    beginner: 'Say the price and the days it takes.',
    intermediate: 'Explain the form, documents and the fee.',
    advanced: 'Discuss exceptions, neighbour approval and rules for noise and hours.',
  },
  ch_fine: {
    beginner: 'Ask why, where and when. Explain the next step simply.',
    intermediate: 'Explain the appeal form and the deadline.',
    advanced: 'Be strict: ask for evidence and explain the legal process formally.',
  },
  ch_services: {
    beginner: 'Answer with days and times only.',
    intermediate: 'Explain how to sign up and what to bring.',
    advanced: 'Explain rules, fees and exceptions in detail; suggest other city programs.',
  },
  free: {
    beginner: 'Short questions about daily life, one at a time.',
    intermediate: 'Mix questions and your own stories.',
    advanced: 'Explore opinions and deeper topics naturally.',
  },
};

// ---------- Personajes nuevos (sin imagen todavía: usan el avatar dibujado) ----------
export const NEW_CHARACTERS = {
  joe: { id: 'joe', title: 'cajero', name: 'Joe', age: 24, sex: 'male', profession: 'supermarket cashier and student', hometown: 'Columbus, Ohio', interests: ['basketball', 'video games', 'cooking cheap meals'], personality: 'Playful', style: 'Encouraging', voice: { pitch: 1.05, gender: 'male' }, look: { skin: '#c68642', hair: '#1c1c1c', hairStyle: 'short', shirt: '#d64545', bg: '#f3e1c4' } },
  ana: { id: 'ana', title: 'encargada', name: 'Ana', age: 38, sex: 'female', profession: 'grocery store manager', hometown: 'San Antonio, Texas', interests: ['gardening', 'baking', 'local markets'], personality: 'Calm', style: 'Thoughtful', voice: { pitch: 1.0, gender: 'female' }, look: { skin: '#d9a066', hair: '#2b1a10', hairStyle: 'bun', shirt: '#3d8b4f', bg: '#e8f0d8' } },
  helen: { id: 'helen', title: 'vecina', name: 'Helen', age: 71, sex: 'female', profession: 'retired school teacher', hometown: 'Boston, Massachusetts', interests: ['crosswords', 'roses', 'her cat Pepper'], personality: 'Inquisitive', style: 'Encouraging', voice: { pitch: 1.05, gender: 'female' }, look: { skin: '#f1c27d', hair: '#d9d9d9', hairStyle: 'short', shirt: '#7a5fa8', bg: '#efe3f4' } },
  omar: { id: 'omar', title: 'vecino', name: 'Omar', age: 32, sex: 'male', profession: 'nurse who works night shifts', hometown: 'Detroit, Michigan', interests: ['soccer', 'fixing bikes', 'podcasts'], personality: 'Reserved', style: 'Blunt', voice: { pitch: 0.95, gender: 'male' }, look: { skin: '#8d5524', hair: '#140c08', hairStyle: 'short', shirt: '#355c8c', bg: '#dde6f0' } },
  linda: { id: 'linda', title: 'funcionaria', name: 'Linda', age: 53, sex: 'female', profession: 'clerk at the city hall service desk', hometown: 'Sacramento, California', interests: ['history', 'choir singing', 'rules and order'], personality: 'Serious', style: 'Thoughtful', voice: { pitch: 0.98, gender: 'female' }, look: { skin: '#e0ac69', hair: '#5a3825', hairStyle: 'long', shirt: '#2f4f6f', bg: '#e3e8ee' } },
};
export const NEW_TTS = { joe: 'am_puck', ana: 'af_kore', helen: 'bf_emma', omar: 'am_fenrir', linda: 'af_nova' };

// ---------- Lugares nuevos ----------
const m = (id, icon, name, description, instruction, objectives, expressions) =>
  ({ id, icon, name, description, instruction, objectives: objectives.map(([oid, text]) => ({ id: oid, text })), expressions, facets: FACETS[id] || {} });

export const NEW_PLACES = [
  {
    id: 'neighborhood', name: 'Tu barrio', emoji: '🏘️', rankRequired: 1,
    scene: 'A quiet residential street with small houses, front gardens and an apartment building entrance.',
    gradient: ['#e9f3e3', '#9cc08a'],
    characters: ['helen', 'omar'],
    missions: [
      m('nb_new', '👋', 'El vecino nuevo', 'Acabas de mudarte. Preséntate a tu vecino.', 'The learner just moved in next door. Welcome them, ask about them and offer help settling in.',
        [['greet', 'Introduce yourself'], ['where', 'Say where you are from or why you moved'], ['help', 'Ask about something in the area or accept help']],
        ["Hi, I'm your new neighbor.", 'I just moved in.', 'Is there a … near here?']),
      m('nb_borrow', '🪜', 'Pide algo prestado', 'Necesitas una escalera o una herramienta. Pídela prestada.', 'The learner asks to borrow something (a ladder, a drill, some sugar). Ask what for and agree when they will return it.',
        [['ask', 'Ask to borrow something politely'], ['why', 'Explain what you need it for'], ['return', 'Agree when you will give it back']],
        ['Could I borrow your…?', 'I need it to…', "I'll bring it back by…"]),
      m('nb_noise', '🔊', 'Mucho ruido', 'Tu vecino hace ruido de noche. Habla con él con amabilidad.', 'You have been making noise at night (music, moving furniture) without realising. React naturally to the learner\'s complaint and agree on a solution.',
        [['explain', 'Explain the problem politely'], ['when', 'Say when it happens'], ['agree', 'Agree on a solution']],
        ["I'm sorry to bother you, but…", "It's hard for me to sleep.", 'Would it be possible to…?']),
      m('nb_package', '📦', 'El paquete equivocado', 'Te llegó un paquete del vecino (o el tuyo está en su casa).', 'A package for the learner was delivered to your door by mistake (or the other way around). Sort it out.',
        [['explain', 'Explain the situation'], ['describe', 'Describe the package or your name/apartment'], ['thank', 'Thank them and say goodbye']],
        ['I think this is yours.', 'Did you get a package for me?', 'Thanks so much!']),
      m('nb_tips', '🗺️', 'Lugares del barrio', 'Pregunta por la mejor panadería, el médico o el autobús.', 'Give recommendations about the neighbourhood: shops, bus stops, a good doctor, where to walk.',
        [['ask', 'Ask for a recommendation'], ['how', 'Ask how to get there'], ['detail', 'Ask an extra detail (price, hours, best time)']],
        ['Do you know a good…?', 'How do I get there?', 'Is it open on Sundays?']),
    ],
  },
  {
    id: 'grocery', name: 'Supermercado', emoji: '🛒', rankRequired: 1,
    scene: 'A bright supermarket with fruit stands, aisles with signs, a deli counter and checkout lanes.',
    gradient: ['#fff3d6', '#f2b134'],
    characters: ['joe', 'ana'],
    missions: [
      m('groc_find', '🔎', 'Busca un producto', 'No encuentras algo. Pregunta en qué pasillo está.', 'Help the learner find products (aisle numbers, top shelf, next to…). One item is out of stock: suggest an alternative.',
        [['ask', 'Ask where something is'], ['understand', 'Repeat the location to confirm'], ['alternative', 'Accept or ask for an alternative']],
        ['Excuse me, where can I find…?', 'Which aisle is it in?', 'Do you have anything similar?']),
      m('groc_checkout', '🧾', 'En la caja', 'Paga tus compras. ¡Ojo! Un precio salió mal.', 'You are at the checkout. Ask about bags and a loyalty card, take the payment. One item scans at the wrong price.',
        [['bags', 'Answer about bags or a store card'], ['price', 'Point out the wrong price'], ['pay', 'Pay and ask for the receipt']],
        ['Can I get a bag, please?', 'I think this was on sale.', 'Can I have the receipt?']),
      m('groc_deli', '🧀', 'En la salchichonería', 'Pide jamón y queso por cantidad.', 'You work at the deli counter. Take orders by weight or slices (half a pound, thin slices) and offer samples.',
        [['order', 'Order something by quantity'], ['how', 'Say how you want it (sliced, thin, thick)'], ['more', 'Ask for something else or say that is all']],
        ["I'd like half a pound of…", 'Sliced thin, please.', "That's all, thanks."]),
      m('groc_recipe', '🍝', 'Ingredientes para una receta', 'Vas a cocinar algo. Pide ayuda para comprar todo.', 'The learner is cooking a dish and needs help buying ingredients. Ask what they are making, suggest products and compare prices or brands.',
        [['dish', 'Say what you are cooking'], ['ingredients', 'Ask for at least two ingredients'], ['choose', 'Choose between two options (price, brand, size)']],
        ["I'm making… tonight.", 'What do you recommend for…?', "Which one is cheaper?"]),
    ],
  },
  {
    id: 'cityhall', name: 'Ayuntamiento', emoji: '🏛️', rankRequired: 3,
    scene: 'A city hall service desk with ticket numbers, forms on the counter and a waiting area.',
    gradient: ['#e6e9f0', '#8a9bb5'],
    characters: ['linda'],
    missions: [
      m('ch_register', '📝', 'Registra tu dirección', 'Te mudaste. Llena el formulario de residencia.', 'Help the learner register their new address. Ask for full name (spelling), date of birth, address, phone and an ID. One document is missing.',
        [['spell', 'Spell your name'], ['data', 'Give your address and date of birth'], ['missing', 'Ask what to do about the missing document']],
        ["My last name is spelled…", 'I was born on…', 'What else do I need to bring?']),
      m('ch_permit', '🎫', 'Pide un permiso', 'Necesitas un permiso (fiesta en la calle, obra, estacionamiento).', 'The learner needs a permit. Explain requirements, fees, forms and how long it takes.',
        [['what', 'Explain what permit you need'], ['requirements', 'Ask about requirements and price'], ['time', 'Ask how long it takes']],
        ['I need a permit for…', 'What documents do I need?', 'How long does it take?']),
      m('ch_fine', '🚗', 'Una multa', 'Te pusieron una multa injusta. Explica y pide revisión.', 'The learner wants to contest a parking ticket. Listen, ask questions, explain the appeal process. Be formal and a little strict.',
        [['explain', 'Explain why the fine is unfair'], ['evidence', 'Offer evidence (photo, receipt)'], ['process', 'Ask about the appeal process']],
        ['I received a fine, but…', 'I have a photo that shows…', 'How can I appeal it?']),
      m('ch_services', 'ℹ️', 'Servicios de la ciudad', 'Pregunta por la basura, la biblioteca o el transporte.', 'Answer questions about city services: trash and recycling days, library card, public transport pass, opening hours.',
        [['ask', 'Ask about a city service'], ['how', 'Ask how to sign up or get it'], ['when', 'Ask about days or hours']],
        ['When is trash collected?', 'How can I get a library card?', 'Is it open on Saturdays?']),
    ],
  },
];

// ---------- Plan de aprendizaje (bienvenida) ----------
export const DAILY_GOALS = [
  { min: 5, label: 'Tranquilo · 5 min al día' },
  { min: 10, label: 'Constante · 10 min al día' },
  { min: 20, label: 'En serio · 20 min al día' },
  { min: 30, label: 'Intenso · 30 min o más' },
];

export const AGE_GROUPS = [
  { id: 'u17', label: '17 o menos', en: '17 or younger' },
  { id: '18-24', label: '18 a 24', en: '18 to 24' },
  { id: '25-39', label: '25 a 39', en: '25 to 39' },
  { id: '40-64', label: '40 a 64', en: '40 to 64' },
  { id: '65+', label: '65 o más', en: '65 or older' },
];

// Temas para personalizar personajes y charlas (en inglés para la IA, en español para la pantalla).
export const INTERESTS = [
  ['Art', 'Arte'], ['Baking', 'Repostería'], ['Books', 'Libros'], ['Business', 'Negocios'], ['Cooking', 'Cocina'],
  ['Dancing', 'Baile'], ['Family', 'Familia'], ['Fashion', 'Moda'], ['Fishing', 'Pesca'], ['Finance', 'Finanzas'],
  ['Fitness', 'Ejercicio'], ['Food', 'Comida'], ['Gaming', 'Videojuegos'], ['Gardening', 'Jardinería'], ['Hiking', 'Senderismo'],
  ['History', 'Historia'], ['Knitting', 'Tejer'], ['Martial arts', 'Artes marciales'], ['Movies', 'Películas'], ['Music', 'Música'],
  ['Nature', 'Naturaleza'], ['Politics', 'Política'], ['Science', 'Ciencia'], ['Social media', 'Redes sociales'], ['Spirituality', 'Espiritualidad'],
  ['Sports', 'Deportes'], ['Technology', 'Tecnología'], ['Travel', 'Viajes'], ['TV shows', 'Series'], ['Yoga', 'Yoga'],
  ['Chess', 'Ajedrez'], ['Cars', 'Carros'], ['Animals', 'Animales'], ['Astrology', 'Astrología'], ['Photography', 'Fotografía'],
  ['Comedy', 'Comedia'], ['Philosophy', 'Filosofía'], ['Painting', 'Pintura'], ['Shopping', 'Compras'], ['Coffee', 'Café'],
  ['Climbing', 'Escalada'], ['Meditation', 'Meditación'], ['Theatre', 'Teatro'], ['Coding', 'Programación'], ['Socializing', 'Conocer gente'],
  ['Parties', 'Fiestas'], ['DIY', 'Manualidades'], ['Languages', 'Idiomas'], ['Podcasts', 'Pódcasts'], ['Sailing', 'Navegar'],
  ['Writing', 'Escritura'],
];

// ---------- Nivel de cada misión (MissionProgression) ----------
// Cada estrella ganada en una misión suma experiencia; cada 4 estrellas, la misión sube de nivel.
export const STARS_PER_MISSION_LEVEL = 4;
export const MISSION_LEVEL_COINS = 5;            // monedas extra al subir una misión de nivel
// Opciones de misión por lugar: 3 al empezar; más al sumar niveles de misión (en total).
export const MISSION_SLOTS = [{ slots: 3, total: 0 }, { slots: 4, total: 8 }, { slots: 5, total: 20 }];

export function missionLevel(xp = 0) {
  const level = Math.floor(xp / STARS_PER_MISSION_LEVEL);
  return { level, pct: Math.round(((xp % STARS_PER_MISSION_LEVEL) / STARS_PER_MISSION_LEVEL) * 100) };
}
export function totalMissionLevel(missionXp = {}) {
  return Object.values(missionXp).reduce((a, xp) => a + missionLevel(xp).level, 0);
}
export function missionSlots(total) {
  let n = MISSION_SLOTS[0].slots;
  for (const s of MISSION_SLOTS) if (total >= s.total) n = s.slots;
  const next = MISSION_SLOTS.find(s => s.total > total);
  return { slots: n, next };
}

// Género (para que los personajes usen el trato correcto).
export const GENDERS = [
  { id: 'f', label: 'Mujer', en: 'female' },
  { id: 'm', label: 'Hombre', en: 'male' },
  { id: '', label: 'Prefiero no decir', en: '' },
];
