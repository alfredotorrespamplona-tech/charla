// Escuchar: historias y diálogos propios por nivel (A2 → B2), para oír mucho inglés que se entienda casi todo
// (el primer principio del cerebro: input comprensible). Primero se escucha sin texto, después se responden
// 3 preguntas y al final se lee tocando las palabras; las frases que le gusten pasan a su repaso.
// Todo el texto es propio. El audio es la voz del teléfono (o la voz natural), sin grabaciones de terceros.
// Sin pantalla: se prueba con node. La pantalla está en escucharscreen.js.

export const LEVELS = [
  { id: 'A2', name: 'A2 · básico', about: 'Frases cortas, presente y pasado simple.' },
  { id: 'B1', name: 'B1 · intermedio', about: 'Historias de trabajo y viajes, con detalles.' },
  { id: 'B1+', name: 'B1 alto', about: 'Problemas, soluciones y opiniones.' },
  { id: 'B2', name: 'B2 · independiente', about: 'Ideas largas, matices y «would have».' },
];
export const KINDS = { historia: '📖 Historia', dialogo: '💬 Diálogo' };
export const SPEEDS = [{ rate: 0.75, label: '🐢 Lento' }, { rate: 0.9, label: 'Normal' }, { rate: 1.05, label: '🐇 Rápido' }];

// L(quién, inglés, español). Quién vacío = narración.
const L = (who, en, es) => ({ who, en, es });
// Q(pregunta, [opciones], índice de la correcta)
const Q = (q, options, answer) => ({ q, options, answer });

export const PIECES = [
  // ---------------- A2 ----------------
  { id: 'a2-manana', level: 'A2', kind: 'historia', icon: '☀', title: "Daniel's morning", titleEs: 'La mañana de Daniel',
    lines: [
      L('', 'Daniel wakes up at six o\'clock every day.', 'Daniel se despierta a las seis todos los días.'),
      L('', 'First, he takes a shower and gets dressed.', 'Primero se ducha y se viste.'),
      L('', 'He doesn\'t eat a big breakfast. He just has coffee and some bread.', 'No desayuna mucho. Solo toma café y un poco de pan.'),
      L('', 'At seven, he takes the bus to work.', 'A las siete toma el bus para ir al trabajo.'),
      L('', 'The bus is always full, so he listens to music on his phone.', 'El bus siempre va lleno, así que escucha música en su teléfono.'),
      L('', 'He works in an office near the city center.', 'Trabaja en una oficina cerca del centro.'),
      L('', 'He likes his job because his coworkers are friendly.', 'Le gusta su trabajo porque sus compañeros son amables.'),
      L('', 'But he wants to find a job closer to home.', 'Pero quiere encontrar un trabajo más cerca de su casa.'),
    ],
    questions: [
      Q('¿Qué desayuna Daniel?', ['Huevos y jugo', 'Café y un poco de pan', 'Nada'], 1),
      Q('¿Qué hace en el bus?', ['Lee un libro', 'Duerme', 'Escucha música'], 2),
      Q('¿Qué quiere cambiar?', ['Un trabajo más cerca de su casa', 'Más sueldo', 'Otros compañeros'], 0),
    ] },
  { id: 'a2-cafe', level: 'A2', kind: 'dialogo', icon: '☕', title: 'At the coffee shop', titleEs: 'En la cafetería', voices: { Barista: 'f', Leo: 'm' },
    lines: [
      L('Barista', 'Hi! What can I get you?', '¡Hola! ¿Qué le sirvo?'),
      L('Leo', 'Can I have a large coffee, please?', '¿Me da un café grande, por favor?'),
      L('Barista', 'Sure. Do you want milk in it?', 'Claro. ¿Lo quiere con leche?'),
      L('Leo', 'Just a little, please. And one of those cookies.', 'Solo un poquito, por favor. Y una de esas galletas.'),
      L('Barista', 'Is that for here or to go?', '¿Es para tomar aquí o para llevar?'),
      L('Leo', 'To go, please. I\'m in a hurry.', 'Para llevar, por favor. Tengo prisa.'),
      L('Barista', 'No problem. That\'s six fifty.', 'No hay problema. Son seis cincuenta.'),
      L('Leo', 'Can I pay by card?', '¿Puedo pagar con tarjeta?'),
      L('Barista', 'Of course. Here you go. Have a nice day!', 'Claro. Aquí tiene. ¡Que tenga un buen día!'),
    ],
    questions: [
      Q('¿Qué pide Leo?', ['Un té y un pastel', 'Un café grande y una galleta', 'Un jugo'], 1),
      Q('¿Por qué lo pide para llevar?', ['Porque tiene prisa', 'Porque no hay mesas', 'Porque llueve'], 0),
      Q('¿Cómo paga?', ['En efectivo', 'No paga', 'Con tarjeta'], 2),
    ] },
  { id: 'a2-finde', level: 'A2', kind: 'historia', icon: '🌳', title: "Laura's weekend", titleEs: 'El fin de semana de Laura',
    lines: [
      L('', 'Last weekend, Laura visited her parents in a small town.', 'El fin de semana pasado, Laura visitó a sus padres en un pueblo pequeño.'),
      L('', 'She left on Saturday morning and drove for three hours.', 'Salió el sábado por la mañana y manejó tres horas.'),
      L('', 'Her mother cooked a big lunch for the whole family.', 'Su mamá cocinó un almuerzo grande para toda la familia.'),
      L('', 'In the afternoon, they walked to the river with the dog.', 'Por la tarde caminaron hasta el río con el perro.'),
      L('', 'On Sunday it rained all day, so they stayed at home and played cards.', 'El domingo llovió todo el día, así que se quedaron en casa jugando cartas.'),
      L('', 'Laura didn\'t want to go back to the city.', 'Laura no quería volver a la ciudad.'),
      L('', 'She had a really good time.', 'La pasó muy bien.'),
    ],
    questions: [
      Q('¿Cómo viajó Laura?', ['En bus', 'Manejando', 'En avión'], 1),
      Q('¿Qué hicieron el domingo?', ['Fueron al río', 'Jugaron cartas en casa', 'Volvieron a la ciudad'], 1),
      Q('¿Por qué se quedaron en casa?', ['Porque llovió', 'Porque estaban cansados', 'Porque el perro estaba enfermo'], 0),
    ] },
  { id: 'a2-banco', level: 'A2', kind: 'dialogo', icon: '📍', title: 'Where is the bank?', titleEs: '¿Dónde queda el banco?', voices: { Ana: 'f', Man: 'm' },
    lines: [
      L('Ana', 'Excuse me, is there a bank near here?', 'Disculpe, ¿hay un banco cerca de aquí?'),
      L('Man', 'Yes, there\'s one on Main Street.', 'Sí, hay uno en la calle principal.'),
      L('Ana', 'How do I get there?', '¿Cómo llego?'),
      L('Man', 'Go straight for two blocks, and then turn left.', 'Siga derecho dos cuadras y luego gire a la izquierda.'),
      L('Man', 'The bank is next to a big supermarket.', 'El banco está al lado de un supermercado grande.'),
      L('Ana', 'Is it far? Can I walk?', '¿Está lejos? ¿Puedo ir caminando?'),
      L('Man', 'Yes, it\'s about five minutes on foot.', 'Sí, son como cinco minutos a pie.'),
      L('Ana', 'Great, thank you so much!', '¡Perfecto, muchas gracias!'),
    ],
    questions: [
      Q('¿Qué busca Ana?', ['Un supermercado', 'Un banco', 'Una parada de bus'], 1),
      Q('¿Hacia dónde gira después de dos cuadras?', ['A la izquierda', 'A la derecha', 'No gira'], 0),
      Q('¿Cuánto tarda caminando?', ['Media hora', 'Unos cinco minutos', 'Una hora'], 1),
    ] },

  // ---------------- B1 ----------------
  { id: 'b1-primerdia', level: 'B1', kind: 'historia', icon: '💼', title: 'The first day', titleEs: 'El primer día',
    lines: [
      L('', 'Carlos was nervous on his first day at the new company.', 'Carlos estaba nervioso en su primer día en la empresa nueva.'),
      L('', 'He arrived twenty minutes early because he didn\'t want to be late.', 'Llegó veinte minutos antes porque no quería llegar tarde.'),
      L('', 'His manager, Susan, showed him around the office and introduced him to the team.', 'Su jefa, Susan, le mostró la oficina y le presentó al equipo.'),
      L('', 'Everyone was very welcoming, but he forgot most of their names in five minutes.', 'Todos fueron muy acogedores, pero él olvidó casi todos los nombres en cinco minutos.'),
      L('', 'In the afternoon, he had to set up his computer and read a lot of documents.', 'Por la tarde tuvo que configurar su computador y leer muchos documentos.'),
      L('', 'It was a little boring, but it helped him understand how the company works.', 'Fue un poco aburrido, pero le ayudó a entender cómo funciona la empresa.'),
      L('', 'Before he left, Susan asked him how his day went.', 'Antes de irse, Susan le preguntó cómo le había ido.'),
      L('', 'He said, "It was a lot of information, but I\'m excited to start."', 'Él dijo: «Fue mucha información, pero estoy emocionado por empezar».'),
    ],
    questions: [
      Q('¿Por qué llegó temprano Carlos?', ['Porque no quería llegar tarde', 'Porque su jefa se lo pidió', 'Porque no había tráfico'], 0),
      Q('¿Qué le pasó con los nombres?', ['Los anotó todos', 'Los olvidó casi todos enseguida', 'Nadie se presentó'], 1),
      Q('¿Qué dijo al final del día?', ['Que quería renunciar', 'Que fue aburrido y no volvería', 'Que fue mucha información pero está emocionado'], 2),
    ] },
  { id: 'b1-entrevista', level: 'B1', kind: 'dialogo', icon: '🎯', title: 'A short interview', titleEs: 'Una entrevista corta', voices: { Interviewer: 'f', Sam: 'm' },
    lines: [
      L('Interviewer', 'Thanks for coming in today. Can you tell me a little about yourself?', 'Gracias por venir hoy. ¿Me puede contar un poco sobre usted?'),
      L('Sam', 'Sure. I\'ve worked in customer service for four years.', 'Claro. He trabajado en servicio al cliente durante cuatro años.'),
      L('Sam', 'I enjoy helping people, and I\'m good at staying calm when things get busy.', 'Me gusta ayudar a la gente, y soy bueno manteniendo la calma cuando hay mucho trabajo.'),
      L('Interviewer', 'Why do you want to work here?', '¿Por qué quiere trabajar aquí?'),
      L('Sam', 'Your company is growing fast, and I want to learn new skills.', 'Su empresa está creciendo rápido y quiero aprender cosas nuevas.'),
      L('Sam', 'I also like that you offer training for new employees.', 'También me gusta que ofrecen capacitación para los empleados nuevos.'),
      L('Interviewer', 'What is one thing you want to improve?', '¿Qué es algo que quiere mejorar?'),
      L('Sam', 'My English. I can communicate well, but I\'m taking classes to sound more natural.', 'Mi inglés. Me comunico bien, pero estoy tomando clases para sonar más natural.'),
      L('Interviewer', 'That\'s great. We\'ll be in touch by Friday.', 'Muy bien. Nos comunicaremos con usted antes del viernes.'),
    ],
    questions: [
      Q('¿Cuánto tiempo ha trabajado Sam en servicio al cliente?', ['Dos años', 'Cuatro años', 'Diez años'], 1),
      Q('¿Qué le gusta de la empresa?', ['Que paga mucho', 'Que está cerca de su casa', 'Que ofrece capacitación'], 2),
      Q('¿Qué quiere mejorar Sam?', ['Su inglés', 'Su puntualidad', 'Su manejo de computadores'], 0),
    ] },
  { id: 'b1-vuelo', level: 'B1', kind: 'historia', icon: '✈', title: 'The missed flight', titleEs: 'El vuelo perdido',
    lines: [
      L('', 'Last year, Marta was going to a conference in Mexico City.', 'El año pasado, Marta iba a una conferencia en Ciudad de México.'),
      L('', 'On the way to the airport, her taxi got stuck in a terrible traffic jam.', 'Camino al aeropuerto, su taxi quedó atrapado en un trancón terrible.'),
      L('', 'When she finally arrived, the gate was already closed.', 'Cuando por fin llegó, la puerta de embarque ya estaba cerrada.'),
      L('', 'She felt angry at first, but then she decided to stay calm.', 'Al principio se sintió furiosa, pero luego decidió mantener la calma.'),
      L('', 'She went to the airline desk and explained what happened.', 'Fue al mostrador de la aerolínea y explicó lo que pasó.'),
      L('', 'The agent was kind and put her on the next flight, three hours later.', 'El agente fue amable y la puso en el siguiente vuelo, tres horas después.'),
      L('', 'She sent an email to the organizers, and she still arrived in time for her talk.', 'Envió un correo a los organizadores, y aun así llegó a tiempo para su charla.'),
      L('', 'Since then, she always leaves for the airport much earlier.', 'Desde entonces, siempre sale para el aeropuerto mucho más temprano.'),
    ],
    questions: [
      Q('¿Por qué perdió el vuelo?', ['Se quedó dormida', 'Había mucho tráfico', 'Olvidó el pasaporte'], 1),
      Q('¿Qué hizo en el aeropuerto?', ['Gritó al agente', 'Volvió a su casa', 'Explicó lo que pasó en el mostrador'], 2),
      Q('¿Qué cambió desde entonces?', ['Sale mucho más temprano', 'Ya no viaja en avión', 'Siempre toma el metro'], 0),
    ] },
  { id: 'b1-medico', level: 'B1', kind: 'dialogo', icon: '🩺', title: 'At the doctor\'s', titleEs: 'En el consultorio', voices: { Doctor: 'f', Paul: 'm' },
    lines: [
      L('Doctor', 'Good morning. What seems to be the problem?', 'Buenos días. ¿Qué le pasa?'),
      L('Paul', 'I\'ve had a sore throat and a headache since Monday.', 'Tengo dolor de garganta y de cabeza desde el lunes.'),
      L('Doctor', 'Do you have a fever?', '¿Tiene fiebre?'),
      L('Paul', 'A little, last night. I also feel very tired.', 'Un poco, anoche. También me siento muy cansado.'),
      L('Doctor', 'Let me take a look. Open your mouth, please.', 'Déjeme ver. Abra la boca, por favor.'),
      L('Doctor', 'It looks like a cold. You need to rest and drink a lot of water.', 'Parece un resfriado. Necesita descansar y tomar mucha agua.'),
      L('Paul', 'Do I need any medicine?', '¿Necesito algún medicamento?'),
      L('Doctor', 'You can take something for the pain. If you don\'t feel better in three days, come back.', 'Puede tomar algo para el dolor. Si no se siente mejor en tres días, vuelva.'),
    ],
    questions: [
      Q('¿Desde cuándo se siente mal Paul?', ['Desde ayer', 'Desde el lunes', 'Desde hace un mes'], 1),
      Q('¿Qué tiene, según la doctora?', ['Un resfriado', 'Una alergia', 'Nada'], 0),
      Q('¿Cuándo debe volver?', ['Mañana', 'En una semana', 'Si no mejora en tres días'], 2),
    ] },

  // ---------------- B1 alto ----------------
  { id: 'b1p-proyecto', level: 'B1+', kind: 'historia', icon: '🧩', title: 'The late project', titleEs: 'El proyecto atrasado',
    lines: [
      L('', 'A few months ago, my team was working on a new website for a client.', 'Hace unos meses, mi equipo estaba haciendo una página web nueva para un cliente.'),
      L('', 'Two weeks before the deadline, we realized we were very behind.', 'Dos semanas antes de la fecha de entrega, nos dimos cuenta de que íbamos muy atrasados.'),
      L('', 'The problem was that everyone was doing their own part, but nobody was checking the whole thing.', 'El problema era que cada uno hacía su parte, pero nadie revisaba el conjunto.'),
      L('', 'So I suggested a short meeting every morning, just fifteen minutes.', 'Así que propuse una reunión corta cada mañana, de solo quince minutos.'),
      L('', 'In each meeting, we said what we had finished and what was blocking us.', 'En cada reunión decíamos qué habíamos terminado y qué nos estaba frenando.'),
      L('', 'It sounds simple, but it made a huge difference.', 'Parece simple, pero hizo una diferencia enorme.'),
      L('', 'We found problems earlier, and people helped each other more.', 'Encontrábamos los problemas antes, y la gente se ayudaba más.'),
      L('', 'In the end, we delivered the website on time, and the client was really happy.', 'Al final entregamos la página a tiempo, y el cliente quedó muy contento.'),
      L('', 'Now we use those short meetings in every project.', 'Ahora usamos esas reuniones cortas en todos los proyectos.'),
    ],
    questions: [
      Q('¿Cuál era el problema de fondo?', ['Nadie revisaba el conjunto', 'El cliente cambiaba todo', 'Faltaba gente en el equipo'], 0),
      Q('¿Qué propuso el narrador?', ['Trabajar el fin de semana', 'Una reunión corta cada mañana', 'Pedir más tiempo al cliente'], 1),
      Q('¿Cómo terminó?', ['Entregaron tarde', 'El cliente canceló', 'Entregaron a tiempo y el cliente quedó contento'], 2),
    ] },
  { id: 'b1p-sueldo', level: 'B1+', kind: 'dialogo', icon: '💰', title: 'Talking about salary', titleEs: 'Hablar del sueldo', voices: { Manager: 'f', Andrés: 'm' },
    lines: [
      L('Manager', 'We\'d like to offer you the position. How does that sound?', 'Nos gustaría ofrecerle el puesto. ¿Qué le parece?'),
      L('Andrés', 'That\'s great news, thank you! Could you tell me more about the salary?', '¡Qué buena noticia, gracias! ¿Me podría contar más sobre el sueldo?'),
      L('Manager', 'Sure. The starting salary is forty-two thousand a year.', 'Claro. El sueldo inicial es de cuarenta y dos mil al año.'),
      L('Andrés', 'I appreciate the offer. Based on my experience, I was hoping for something closer to forty-six.', 'Le agradezco la oferta. Por mi experiencia, esperaba algo más cerca de cuarenta y seis.'),
      L('Manager', 'I understand. I can\'t go that high, but I could offer forty-four.', 'Entiendo. No puedo llegar a tanto, pero podría ofrecer cuarenta y cuatro.'),
      L('Manager', 'And we could review it again after six months.', 'Y podríamos revisarlo otra vez a los seis meses.'),
      L('Andrés', 'That sounds fair. Would it be possible to start on the fifteenth instead of the first?', 'Me parece justo. ¿Sería posible empezar el quince en vez del primero?'),
      L('Manager', 'I think so. I\'ll check with HR and send you the details by email.', 'Creo que sí. Lo consulto con Recursos Humanos y le envío los detalles por correo.'),
    ],
    questions: [
      Q('¿Cuánto esperaba ganar Andrés?', ['Cuarenta y dos mil', 'Cuarenta y seis mil', 'Cincuenta mil'], 1),
      Q('¿Qué le ofrece la gerente al final?', ['Cuarenta y cuatro y revisarlo a los seis meses', 'Lo mismo del principio', 'Cuarenta y seis'], 0),
      Q('¿Qué más pide Andrés?', ['Trabajar desde casa', 'Más vacaciones', 'Empezar el quince'], 2),
    ] },
  { id: 'b1p-marta', level: 'B1+', kind: 'historia', icon: '🎧', title: 'How Marta learned English', titleEs: 'Cómo aprendió inglés Marta',
    lines: [
      L('', 'Marta studied English at school for years, but she couldn\'t really speak it.', 'Marta estudió inglés en el colegio durante años, pero no lo podía hablar de verdad.'),
      L('', 'She knew the rules, but when someone talked to her, she froze.', 'Sabía las reglas, pero cuando alguien le hablaba, se bloqueaba.'),
      L('', 'Then she changed her approach. Instead of studying grammar, she started listening every day.', 'Entonces cambió su forma de aprender. En vez de estudiar gramática, empezó a escuchar todos los días.'),
      L('', 'She chose podcasts and stories that were easy enough to understand.', 'Eligió pódcasts e historias lo bastante fáciles para entenderlos.'),
      L('', 'Every time she heard a useful phrase, she wrote it down and repeated it out loud.', 'Cada vez que oía una frase útil, la anotaba y la repetía en voz alta.'),
      L('', 'After a few months, she noticed that phrases came to her mind without thinking.', 'Después de unos meses, notó que las frases le llegaban a la mente sin pensar.'),
      L('', 'She still makes mistakes, but now she can have a real conversation.', 'Todavía comete errores, pero ahora puede tener una conversación de verdad.'),
      L('', 'Her advice is simple: listen a lot, and steal the phrases you like.', 'Su consejo es simple: escuche mucho y robe las frases que le gusten.'),
    ],
    questions: [
      Q('¿Cuál era el problema de Marta?', ['No sabía las reglas', 'Sabía las reglas pero se bloqueaba al hablar', 'No tenía tiempo'], 1),
      Q('¿Qué hacía con las frases útiles?', ['Las anotaba y las repetía en voz alta', 'Las traducía al español', 'Las olvidaba'], 0),
      Q('¿Cuál es su consejo?', ['Estudiar más gramática', 'Viajar a otro país', 'Escuchar mucho y robar frases'], 2),
    ] },
  { id: 'b1p-cliente', level: 'B1+', kind: 'dialogo', icon: '📞', title: 'An unhappy customer', titleEs: 'Un cliente molesto', voices: { Customer: 'm', Agent: 'f' },
    lines: [
      L('Customer', 'Hi, I ordered a laptop two weeks ago, and it still hasn\'t arrived.', 'Hola, pedí un portátil hace dos semanas y todavía no ha llegado.'),
      L('Agent', 'I\'m really sorry to hear that. Could you give me your order number?', 'Lamento mucho oír eso. ¿Me podría dar su número de pedido?'),
      L('Customer', 'It\'s four, five, eight, two, one.', 'Es cuatro, cinco, ocho, dos, uno.'),
      L('Agent', 'Thank you. I can see that the package was sent to an old address.', 'Gracias. Veo que el paquete se envió a una dirección vieja.'),
      L('Customer', 'That\'s strange. I updated my address last month.', 'Qué raro. Actualicé mi dirección el mes pasado.'),
      L('Agent', 'You\'re right, and that was our mistake. I\'ll send a new laptop today with express delivery.', 'Tiene razón, y fue un error nuestro. Le envío un portátil nuevo hoy con envío exprés.'),
      L('Agent', 'It should arrive tomorrow, and I\'ll refund the shipping cost.', 'Debería llegar mañana, y le devuelvo el costo del envío.'),
      L('Customer', 'OK, thanks. I appreciate your help.', 'Bueno, gracias. Le agradezco la ayuda.'),
    ],
    questions: [
      Q('¿Qué pasó con el portátil?', ['Llegó dañado', 'Se envió a una dirección vieja', 'Nunca se pidió'], 1),
      Q('¿De quién fue el error?', ['De la empresa', 'Del cliente', 'Del cartero'], 0),
      Q('¿Qué ofrece la agente?', ['Un descuento para la próxima compra', 'Cancelar el pedido', 'Un envío exprés y devolver el costo del envío'], 2),
    ] },

  // ---------------- B2 ----------------
  { id: 'b2-casa', level: 'B2', kind: 'historia', icon: '💻', title: 'Working from home', titleEs: 'Trabajar desde casa',
    lines: [
      L('', 'When my company let us work from home, I thought it would be perfect.', 'Cuando mi empresa nos dejó trabajar desde casa, pensé que sería perfecto.'),
      L('', 'No traffic, no long lunches, and more time with my family.', 'Sin tráfico, sin almuerzos largos y con más tiempo con mi familia.'),
      L('', 'And for a while, it was. I got more done than ever before.', 'Y por un tiempo lo fue. Hacía más cosas que nunca.'),
      L('', 'But after a few months, I started to feel a bit isolated.', 'Pero después de unos meses empecé a sentirme un poco aislado.'),
      L('', 'I missed the quick chats with coworkers, which is often where good ideas come from.', 'Extrañaba las charlas rápidas con los compañeros, que es muchas veces de donde salen las buenas ideas.'),
      L('', 'I also found it hard to switch off, because my office was also my living room.', 'También me costaba desconectarme, porque mi oficina era también mi sala.'),
      L('', 'Now I go to the office twice a week, and I work from home the rest of the time.', 'Ahora voy a la oficina dos veces por semana y trabajo desde casa el resto del tiempo.'),
      L('', 'For me, that balance works much better than either extreme.', 'Para mí, ese equilibrio funciona mucho mejor que cualquiera de los dos extremos.'),
    ],
    questions: [
      Q('¿Qué fue lo primero que notó al trabajar desde casa?', ['Que hacía más cosas que nunca', 'Que se aburría', 'Que ganaba menos'], 0),
      Q('¿Por qué le costaba desconectarse?', ['Porque su jefe lo llamaba de noche', 'Porque su oficina era también su sala', 'Porque tenía demasiado trabajo'], 1),
      Q('¿Qué decidió al final?', ['Volver a la oficina todos los días', 'Renunciar', 'Ir dos veces por semana y el resto desde casa'], 2),
    ] },
  { id: 'b2-feedback', level: 'B2', kind: 'dialogo', icon: '💬', title: 'A difficult conversation', titleEs: 'Una conversación difícil', voices: { Laura: 'f', Mike: 'm' },
    lines: [
      L('Laura', 'Mike, do you have a minute? There\'s something I\'d like to talk about.', 'Mike, ¿tienes un minuto? Hay algo de lo que me gustaría hablar.'),
      L('Mike', 'Sure, what\'s up?', 'Claro, ¿qué pasa?'),
      L('Laura', 'In the last two meetings, the reports arrived late, and the team had to wait.', 'En las dos últimas reuniones, los informes llegaron tarde y el equipo tuvo que esperar.'),
      L('Laura', 'I know you\'ve been really busy, so I wanted to understand what\'s going on.', 'Sé que has estado muy ocupado, así que quería entender qué está pasando.'),
      L('Mike', 'Honestly, I\'ve been covering two projects since Ana left, and I\'m a bit overwhelmed.', 'La verdad, he estado cubriendo dos proyectos desde que Ana se fue, y estoy un poco desbordado.'),
      L('Laura', 'I didn\'t realize that. Thanks for telling me.', 'No me había dado cuenta. Gracias por contármelo.'),
      L('Laura', 'What if we moved one of those projects to Tom until we hire someone?', '¿Y si le pasamos uno de esos proyectos a Tom hasta que contratemos a alguien?'),
      L('Mike', 'That would help a lot. I could focus on the reports again.', 'Eso ayudaría mucho. Podría concentrarme otra vez en los informes.'),
      L('Laura', 'Great. Let\'s talk to him this afternoon.', 'Perfecto. Hablemos con él esta tarde.'),
    ],
    questions: [
      Q('¿Cuál es el problema que menciona Laura?', ['Mike llega tarde a la oficina', 'Los informes llegan tarde', 'Mike no habla en las reuniones'], 1),
      Q('¿Por qué está desbordado Mike?', ['Cubre dos proyectos desde que Ana se fue', 'Está enfermo', 'Está buscando otro trabajo'], 0),
      Q('¿Qué solución proponen?', ['Despedir a alguien', 'Hacer menos reuniones', 'Pasarle un proyecto a Tom'], 2),
    ] },
  { id: 'b2-carrera', level: 'B2', kind: 'historia', icon: '🚀', title: 'Changing careers', titleEs: 'El cambio de carrera',
    lines: [
      L('', 'I worked as an accountant for eight years before I switched to data analysis.', 'Trabajé como contador ocho años antes de pasarme al análisis de datos.'),
      L('', 'Looking back, I would have made the change much earlier if I had known how much I\'d enjoy it.', 'Mirando atrás, habría hecho el cambio mucho antes si hubiera sabido cuánto lo iba a disfrutar.'),
      L('', 'The hardest part wasn\'t learning the new tools. It was believing I could do it.', 'Lo más difícil no fue aprender las herramientas nuevas. Fue creer que podía hacerlo.'),
      L('', 'I took online courses at night and practised with real data from my old job.', 'Hice cursos en línea por las noches y practiqué con datos reales de mi antiguo trabajo.'),
      L('', 'That turned out to be my biggest advantage, because I already understood the business.', 'Eso resultó ser mi mayor ventaja, porque ya entendía el negocio.'),
      L('', 'In my interviews, I didn\'t hide my background. I presented it as a strength.', 'En mis entrevistas no escondí mi pasado. Lo presenté como una fortaleza.'),
      L('', 'If you\'re thinking about a change, my advice is to start small, but start now.', 'Si está pensando en un cambio, mi consejo es empezar en pequeño, pero empezar ya.'),
    ],
    questions: [
      Q('¿Qué fue lo más difícil del cambio?', ['Aprender las herramientas', 'Creer que podía hacerlo', 'Encontrar cursos'], 1),
      Q('¿Cuál fue su mayor ventaja?', ['Que ya entendía el negocio', 'Que tenía un título nuevo', 'Que conocía al jefe'], 0),
      Q('¿Qué hizo con su pasado en las entrevistas?', ['Lo escondió', 'Mintió sobre él', 'Lo presentó como una fortaleza'], 2),
    ] },
  { id: 'b2-panel', level: 'B2', kind: 'dialogo', icon: '👥', title: 'The panel interview', titleEs: 'La entrevista con el panel', voices: { Interviewer: 'f', Daniela: 'f' },
    lines: [
      L('Interviewer', 'Tell us about a time you disagreed with your manager. How did you handle it?', 'Cuéntenos de una vez que no estuvo de acuerdo con su jefe. ¿Cómo lo manejó?'),
      L('Daniela', 'In my last job, my manager wanted to launch a product before it was fully tested.', 'En mi último trabajo, mi jefe quería lanzar un producto antes de probarlo por completo.'),
      L('Daniela', 'I was worried that customers would find errors and we\'d lose their trust.', 'Me preocupaba que los clientes encontraran errores y perdiéramos su confianza.'),
      L('Daniela', 'Instead of just saying no, I prepared a short report with the risks and a plan to test it in one week.', 'En vez de solo decir que no, preparé un informe corto con los riesgos y un plan para probarlo en una semana.'),
      L('Interviewer', 'And what did your manager say?', '¿Y qué dijo su jefe?'),
      L('Daniela', 'He wasn\'t happy at first, but he agreed to delay the launch by one week.', 'Al principio no le gustó, pero aceptó retrasar el lanzamiento una semana.'),
      L('Daniela', 'We found two serious bugs, and the launch went smoothly.', 'Encontramos dos fallas graves, y el lanzamiento salió bien.'),
      L('Interviewer', 'What did you learn from that?', '¿Qué aprendió de eso?'),
      L('Daniela', 'That it\'s easier to disagree when you bring data and a solution, not just a problem.', 'Que es más fácil no estar de acuerdo cuando uno lleva datos y una solución, no solo un problema.'),
    ],
    questions: [
      Q('¿En qué no estaba de acuerdo Daniela?', ['En lanzar un producto sin probarlo bien', 'En el precio del producto', 'En contratar a alguien'], 0),
      Q('¿Qué hizo en vez de solo decir que no?', ['Se quejó con Recursos Humanos', 'Preparó un informe con riesgos y un plan', 'Renunció'], 1),
      Q('¿Qué aprendió?', ['Que siempre hay que obedecer', 'Que no vale la pena discutir', 'Que es mejor llevar datos y una solución'], 2),
    ] },

  // ---------------- v44: 2 más por nivel ----------------
  { id: 'a2-super', level: 'A2', kind: 'dialogo', icon: '🛒', title: 'At the supermarket', titleEs: 'En el supermercado', voices: { Clerk: 'f', Tom: 'm' },
    lines: [
      L('Tom', 'Excuse me, where can I find the rice?', 'Disculpe, ¿dónde encuentro el arroz?'),
      L('Clerk', 'It\'s in aisle five, next to the pasta.', 'Está en el pasillo cinco, al lado de la pasta.'),
      L('Tom', 'Thanks. And do you have fresh bread today?', 'Gracias. ¿Y tienen pan fresco hoy?'),
      L('Clerk', 'Yes, but we only have a little left. It\'s by the door.', 'Sí, pero queda poquito. Está junto a la puerta.'),
      L('Tom', 'Great. How much are the bananas?', 'Perfecto. ¿Cuánto cuestan los bananos?'),
      L('Clerk', 'They\'re one dollar a kilo this week.', 'Están a un dólar el kilo esta semana.'),
      L('Tom', 'That\'s cheap! I\'ll take two kilos.', '¡Qué barato! Me llevo dos kilos.'),
      L('Clerk', 'Do you need a bag?', '¿Necesita una bolsa?'),
      L('Tom', 'No, thanks. I brought my own.', 'No, gracias. Traje la mía.'),
    ],
    questions: [
      Q('¿Dónde está el arroz?', ['Junto a la puerta', 'En el pasillo cinco', 'En la caja'], 1),
      Q('¿Cuántos kilos de bananos lleva Tom?', ['Dos', 'Uno', 'Cinco'], 0),
      Q('¿Por qué no necesita bolsa?', ['Porque compra poco', 'Porque cuestan mucho', 'Porque trajo la suya'], 2),
    ] },
  { id: 'a2-familia', level: 'A2', kind: 'historia', icon: '🏠', title: 'My family', titleEs: 'Mi familia',
    lines: [
      L('', 'My name is Sofía, and I live with my husband and our two kids.', 'Me llamo Sofía y vivo con mi esposo y nuestros dos hijos.'),
      L('', 'My son is eight, and my daughter is five.', 'Mi hijo tiene ocho años y mi hija cinco.'),
      L('', 'My husband works at a hospital. He\'s a nurse.', 'Mi esposo trabaja en un hospital. Es enfermero.'),
      L('', 'I work from home three days a week.', 'Yo trabajo desde casa tres días a la semana.'),
      L('', 'On Sundays, we usually visit my parents.', 'Los domingos casi siempre visitamos a mis papás.'),
      L('', 'My mother makes soup, and the kids play in the garden.', 'Mi mamá hace sopa y los niños juegan en el jardín.'),
      L('', 'We don\'t have a lot of free time, but we are happy together.', 'No tenemos mucho tiempo libre, pero somos felices juntos.'),
    ],
    questions: [
      Q('¿Cuántos años tiene la hija?', ['Ocho', 'Cinco', 'Tres'], 1),
      Q('¿En qué trabaja el esposo?', ['Es médico', 'Es profesor', 'Es enfermero'], 2),
      Q('¿Qué hacen los domingos?', ['Visitan a los papás de Sofía', 'Van al cine', 'Trabajan desde casa'], 0),
    ] },
  { id: 'b1-hotel', level: 'B1', kind: 'dialogo', icon: '🏨', title: 'A problem at the hotel', titleEs: 'Un problema en el hotel', voices: { Guest: 'm', Receptionist: 'f' },
    lines: [
      L('Guest', 'Hi, I\'m in room 312, and the air conditioning isn\'t working.', 'Hola, estoy en la habitación 312 y el aire acondicionado no funciona.'),
      L('Receptionist', 'I\'m sorry about that. Have you tried the remote control?', 'Lo siento. ¿Ya probó con el control remoto?'),
      L('Guest', 'Yes, I changed the batteries too, but nothing happens.', 'Sí, también le cambié las pilas, pero no pasa nada.'),
      L('Receptionist', 'OK. I\'ll send someone from maintenance right away.', 'Bueno. Le envío a alguien de mantenimiento enseguida.'),
      L('Guest', 'How long will it take? I have a meeting online in an hour.', '¿Cuánto se va a demorar? Tengo una reunión en línea en una hora.'),
      L('Receptionist', 'If you prefer, I can move you to another room now.', 'Si prefiere, lo puedo pasar a otra habitación ahora mismo.'),
      L('Receptionist', 'We have one on the fifth floor with a view of the park.', 'Tenemos una en el quinto piso con vista al parque.'),
      L('Guest', 'That would be perfect. Thank you for your help.', 'Eso sería perfecto. Gracias por su ayuda.'),
    ],
    questions: [
      Q('¿Qué no funciona?', ['La ducha', 'El aire acondicionado', 'El televisor'], 1),
      Q('¿Por qué tiene prisa el huésped?', ['Tiene una reunión en línea en una hora', 'Se va al aeropuerto', 'Quiere dormir'], 0),
      Q('¿Qué solución acepta?', ['Esperar a mantenimiento', 'Irse a otro hotel', 'Cambiarse a otra habitación'], 2),
    ] },
  { id: 'b1-rutina', level: 'B1', kind: 'historia', icon: '💪', title: 'A new habit', titleEs: 'Un hábito nuevo',
    lines: [
      L('', 'Last year, I felt tired all the time, so I decided to change one small thing.', 'El año pasado me sentía cansado todo el tiempo, así que decidí cambiar una cosa pequeña.'),
      L('', 'I started walking for twenty minutes every morning before work.', 'Empecé a caminar veinte minutos cada mañana antes del trabajo.'),
      L('', 'At first it was hard to get up early, especially when it was cold.', 'Al principio me costaba levantarme temprano, sobre todo cuando hacía frío.'),
      L('', 'But after two weeks, I noticed I had more energy during the day.', 'Pero después de dos semanas noté que tenía más energía durante el día.'),
      L('', 'I also started listening to English podcasts while I walked.', 'También empecé a escuchar pódcasts en inglés mientras caminaba.'),
      L('', 'Now I can\'t imagine my mornings without that walk.', 'Ahora no me imagino las mañanas sin esa caminata.'),
      L('', 'My advice? Don\'t try to change everything at once. Start with one habit.', '¿Mi consejo? No intente cambiar todo de una vez. Empiece con un hábito.'),
    ],
    questions: [
      Q('¿Qué cambió el narrador?', ['Empezó a caminar cada mañana', 'Dejó el café', 'Cambió de trabajo'], 0),
      Q('¿Qué notó después de dos semanas?', ['Que dormía menos', 'Que tenía más energía', 'Que hacía más frío'], 1),
      Q('¿Qué hace mientras camina?', ['Habla por teléfono', 'Escucha música en español', 'Escucha pódcasts en inglés'], 2),
    ] },
  { id: 'b1p-reunion', level: 'B1+', kind: 'dialogo', icon: '💻', title: 'The online meeting', titleEs: 'La reunión en línea', voices: { Paula: 'f', Diego: 'm' },
    lines: [
      L('Paula', 'Can everyone hear me? Diego, you\'re on mute.', '¿Todos me oyen? Diego, tienes el micrófono apagado.'),
      L('Diego', 'Sorry about that. Can you hear me now?', 'Perdón. ¿Ahora sí me oyes?'),
      L('Paula', 'Yes, perfect. So, the main topic today is the new schedule.', 'Sí, perfecto. Bueno, el tema principal hoy es el horario nuevo.'),
      L('Diego', 'Before we start, could you share your screen? It\'s easier to follow.', 'Antes de empezar, ¿podrías compartir tu pantalla? Es más fácil de seguir.'),
      L('Paula', 'Sure, give me a second. Can you see it?', 'Claro, dame un segundo. ¿La ves?'),
      L('Diego', 'Yes. I think the plan looks good, but Friday is a bit tight for us.', 'Sí. Creo que el plan se ve bien, pero el viernes nos queda un poco justo.'),
      L('Paula', 'Would Monday work better for your team?', '¿El lunes le sirve mejor a tu equipo?'),
      L('Diego', 'Monday would be great. That gives us time to check everything.', 'El lunes sería genial. Así tenemos tiempo de revisar todo.'),
      L('Paula', 'OK, let\'s move it to Monday. I\'ll send a summary after the call.', 'Listo, lo pasamos al lunes. Envío un resumen después de la llamada.'),
    ],
    questions: [
      Q('¿Qué problema tenía Diego al principio?', ['No tenía internet', 'Tenía el micrófono apagado', 'Llegó tarde'], 1),
      Q('¿Por qué no le sirve el viernes?', ['Le queda justo a su equipo', 'Es festivo', 'Está de vacaciones'], 0),
      Q('¿Qué hará Paula después de la llamada?', ['Llamar al jefe', 'Cancelar el plan', 'Enviar un resumen'], 2),
    ] },
  { id: 'b1p-ascenso', level: 'B1+', kind: 'historia', icon: '🏆', title: 'The promotion', titleEs: 'El ascenso',
    lines: [
      L('', 'When my boss told me about the team leader position, I almost didn\'t apply.', 'Cuando mi jefa me habló del puesto de líder de equipo, casi no me postulé.'),
      L('', 'I thought other people had more experience than me.', 'Pensaba que otras personas tenían más experiencia que yo.'),
      L('', 'But a coworker said, "You already help everyone. You\'re practically doing the job."', 'Pero un compañero me dijo: «Ya ayudas a todos. Prácticamente ya haces el trabajo».'),
      L('', 'So I prepared for the interview with real examples from my work.', 'Así que preparé la entrevista con ejemplos reales de mi trabajo.'),
      L('', 'I explained how I had trained new people and solved problems with clients.', 'Expliqué cómo había capacitado a gente nueva y resuelto problemas con clientes.'),
      L('', 'A week later, they offered me the position.', 'Una semana después me ofrecieron el puesto.'),
      L('', 'The lesson I learned is that you should never say no for the company. Let them decide.', 'Lo que aprendí es que nunca hay que decir que no por la empresa. Deje que ellos decidan.'),
    ],
    questions: [
      Q('¿Por qué casi no se postuló?', ['Creía que otros tenían más experiencia', 'No le interesaba el puesto', 'Pagaban poco'], 0),
      Q('¿Cómo preparó la entrevista?', ['Memorizó respuestas de internet', 'Con ejemplos reales de su trabajo', 'No la preparó'], 1),
      Q('¿Cuál es la lección?', ['Hay que tener mucha experiencia', 'Hay que pedir más sueldo', 'No decir que no por la empresa'], 2),
    ] },
  { id: 'b2-clima', level: 'B2', kind: 'historia', icon: '🌱', title: 'A greener office', titleEs: 'Una oficina más verde',
    lines: [
      L('', 'A couple of years ago, our office started looking for ways to reduce waste.', 'Hace un par de años, nuestra oficina empezó a buscar formas de reducir los desperdicios.'),
      L('', 'At first, people were skeptical. They assumed it would mean more work for everyone.', 'Al principio la gente era escéptica. Daban por hecho que iba a significar más trabajo para todos.'),
      L('', 'So instead of announcing big rules, we started with tiny changes.', 'Así que, en vez de anunciar grandes reglas, empezamos con cambios mínimos.'),
      L('', 'We got rid of plastic cups and put recycling bins next to every desk.', 'Quitamos los vasos de plástico y pusimos canecas de reciclaje junto a cada escritorio.'),
      L('', 'Within six months, our waste had dropped by almost forty percent.', 'En seis meses, nuestros desperdicios habían bajado casi un cuarenta por ciento.'),
      L('', 'What surprised me most was that people began suggesting their own ideas.', 'Lo que más me sorprendió fue que la gente empezó a proponer sus propias ideas.'),
      L('', 'Had we forced it from the start, I doubt it would have worked.', 'Si lo hubiéramos impuesto desde el principio, dudo que hubiera funcionado.'),
    ],
    questions: [
      Q('¿Qué pensaba la gente al principio?', ['Que iba a ser más trabajo', 'Que era una gran idea', 'Que costaba mucho dinero'], 0),
      Q('¿Cuánto bajaron los desperdicios?', ['Un diez por ciento', 'Casi un cuarenta por ciento', 'A la mitad'], 1),
      Q('¿Qué cree el narrador que habría pasado si lo imponían?', ['Habría funcionado más rápido', 'Nadie lo habría notado', 'Dudosamente habría funcionado'], 2),
    ] },
  { id: 'b2-negociar', level: 'B2', kind: 'dialogo', icon: '🤝', title: 'Negotiating with a supplier', titleEs: 'Negociar con un proveedor', voices: { Buyer: 'f', Supplier: 'm' },
    lines: [
      L('Buyer', 'We\'ve been happy with your service, but the new prices are higher than we expected.', 'Hemos estado contentos con su servicio, pero los precios nuevos son más altos de lo que esperábamos.'),
      L('Supplier', 'I understand. Our costs have gone up a lot this year, especially transport.', 'Entiendo. Nuestros costos subieron mucho este año, sobre todo el transporte.'),
      L('Buyer', 'That makes sense. Still, a fifteen percent increase is hard for us to accept.', 'Tiene sentido. Aun así, un aumento del quince por ciento es difícil de aceptar para nosotros.'),
      L('Supplier', 'What if we kept the increase at ten percent, provided you sign for two years?', '¿Y si dejamos el aumento en diez por ciento, siempre que firmen por dos años?'),
      L('Buyer', 'Two years is a long commitment. Could we agree on eighteen months instead?', 'Dos años es mucho compromiso. ¿Podríamos acordar dieciocho meses?'),
      L('Supplier', 'I could live with that, as long as payments are made within thirty days.', 'Podría aceptarlo, siempre y cuando los pagos se hagan dentro de treinta días.'),
      L('Buyer', 'That works for us. I\'ll ask our legal team to prepare the contract.', 'Eso nos sirve. Le pido a nuestro equipo legal que prepare el contrato.'),
    ],
    questions: [
      Q('¿Por qué subió los precios el proveedor?', ['Porque subieron sus costos, sobre todo el transporte', 'Porque tiene más clientes', 'Por error'], 0),
      Q('¿Qué pide el proveedor a cambio del diez por ciento?', ['Pagar por adelantado', 'Firmar por dos años', 'Comprar el doble'], 1),
      Q('¿En qué quedan?', ['Quince por ciento y un año', 'No llegan a un acuerdo', 'Dieciocho meses y pagos a treinta días'], 2),
    ] },
];

const BY_ID = new Map(PIECES.map(p => [p.id, p]));
export const pieceById = (id, mine = []) => BY_ID.get(id) || mine.find(p => p.id === id) || null;

// Nivel que se le recomienda según su nivel de práctica (1..6 = A1..C2).
export function levelForRank(rank = 3, done = {}) {
  if (rank <= 2) return 'A2';
  if (rank >= 4) return 'B2';
  const b1 = PIECES.filter(p => p.level === 'B1');
  return b1.every(p => (done[p.id] ?? -1) >= 2 / 3) ? 'B1+' : 'B1';
}

// La siguiente que conviene escuchar: la primera de su nivel que no ha hecho (o con nota baja).
export function nextPiece(rank, done = {}) {
  const lvl = levelForRank(rank, done);
  const order = [lvl, ...LEVELS.map(l => l.id).filter(id => id !== lvl)];
  for (const id of order) {
    const p = PIECES.find(x => x.level === id && !((done[x.id] ?? -1) >= 2 / 3));
    if (p) return p;
  }
  return PIECES[0];
}

// Nota de las preguntas (0..1).
export function quizScore(piece, picks) {
  const qs = piece.questions || [];
  if (!qs.length) return 1;
  return qs.filter((q, i) => picks[i] === q.answer).length / qs.length;
}

// Palabras tocables de una frase: [{ t: texto tal cual, w: palabra limpia o '' si es solo puntuación }].
export function tappable(en) {
  return String(en).split(/(\s+)/).filter(Boolean).map(t => ({ t, w: /\s/.test(t) ? '' : t.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '') }));
}

// Cuánto dura más o menos (para mostrar «1 min»).
export function minutesOf(piece) {
  const words = piece.lines.reduce((n, l) => n + l.en.split(/\s+/).length, 0);
  return Math.max(1, Math.round(words / 120));
}

// Valida una historia hecha por la IA y la deja con la misma forma que las propias.
export function validPiece(x, level = 'B1', now = Date.now()) {
  if (!x || typeof x !== 'object' || !Array.isArray(x.lines)) return null;
  const lines = x.lines.filter(l => l && typeof l.en === 'string' && typeof l.es === 'string' && l.en.trim())
    .slice(0, 16).map(l => L(String(l.who || '').slice(0, 20), l.en.trim(), l.es.trim()));
  if (lines.length < 4) return null;
  const questions = (Array.isArray(x.questions) ? x.questions : [])
    .filter(q => q && q.q && Array.isArray(q.options) && q.options.length === 3 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3)
    .slice(0, 3).map(q => Q(String(q.q), q.options.map(String), q.answer));
  const whos = [...new Set(lines.map(l => l.who).filter(Boolean))];
  const kind = whos.length >= 2 ? 'dialogo' : 'historia';
  return { id: 'mine-' + now.toString(36), level: LEVELS.some(l => l.id === level) ? level : 'B1', kind, icon: kind === 'dialogo' ? '💬' : '📖',
    title: String(x.title || 'My story').slice(0, 60), titleEs: String(x.titleEs || x.title || 'Mi historia').slice(0, 60),
    voices: kind === 'dialogo' ? Object.fromEntries(whos.map((w, i) => [w, i % 2 ? 'm' : 'f'])) : undefined,
    lines, questions, mine: true, createdAt: now };
}
