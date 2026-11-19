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
  // ---------- B2 ----------
  { id: 'debate', name: 'Debatir con respeto', level: 'B2', icon: '⚖', phrases: [
    ['I see your [point], but I disagree.', 'Entiendo tu punto, pero no estoy de acuerdo.'],
    ["That's [true] to some extent.", 'Eso es cierto hasta cierto punto.'],
    ["Let me [play] devil's advocate.", 'Déjame llevar la contraria a propósito.'],
    ["I couldn't [agree] more.", 'Estoy totalmente de acuerdo.'],
    ['Have you [considered] the costs?', '¿Has tenido en cuenta los costos?'],
    ['On the other [hand], it saves time.', 'Por otro lado, ahorra tiempo.'],
    ['I [doubt] that will work.', 'Dudo que eso funcione.'],
    ['Fair [enough].', 'Me parece justo.'],
    ["That's not [necessarily] true.", 'Eso no es necesariamente cierto.'],
    ["Let's agree to [disagree].", 'Aceptemos que no pensamos igual.'],
  ] },
  { id: 'hypothesis', name: 'Suponer e imaginar', level: 'B2', icon: '🎲', phrases: [
    ['What [if] we left earlier?', '¿Y si saliéramos más temprano?'],
    ['It [might] rain later.', 'Puede que llueva más tarde.'],
    ["I'd [rather] stay home tonight.", 'Prefiero quedarme en casa esta noche.'],
    ["If I were [you], I'd take the job.", 'Yo que tú, aceptaría el trabajo.'],
    ['Suppose you [won] the lottery.', 'Supón que ganaras la lotería.'],
    ['It [must] be hard for you.', 'Debe de ser difícil para ti.'],
    ["She can't [be] at home; the lights are off.", 'No puede estar en casa: las luces están apagadas.'],
    ['I [bet] he forgot.', 'Apuesto a que se le olvidó.'],
    ["Chances [are] it'll be late.", 'Lo más probable es que llegue tarde.'],
    ['Just in [case], bring an umbrella.', 'Por si acaso, trae un paraguas.'],
  ] },
  { id: 'meetings', name: 'Reuniones y trabajo', level: 'B2', icon: '💼', phrases: [
    ["Let's get [started].", 'Empecemos.'],
    ['Could you [walk] me through the plan?', '¿Me explicas el plan paso a paso?'],
    ["I'll [follow] up by email.", 'Hago el seguimiento por correo.'],
    ["Let's [keep] it short.", 'Seamos breves.'],
    ['Can we [push] the meeting to Friday?', '¿Podemos pasar la reunión al viernes?'],
    ["I'm [swamped] this week.", 'Estoy hasta arriba de trabajo esta semana.'],
    ["What's the [deadline]?", '¿Cuál es la fecha límite?'],
    ["Let's [touch] base tomorrow.", 'Hablamos mañana para ver cómo va.'],
    ["Who's in [charge] of this?", '¿Quién está a cargo de esto?'],
    ['To [sum] up, we need more time.', 'En resumen, necesitamos más tiempo.'],
  ] },
  // ---------- C1 ----------
  { id: 'nuance', name: 'Matizar y suavizar', level: 'C1', icon: '🤲', phrases: [
    ["I see where you're [coming] from.", 'Entiendo de dónde viene tu idea.'],
    ["With all due [respect], I think you're wrong.", 'Con todo respeto, creo que te equivocas.'],
    ["It's not [quite] what I expected.", 'No es exactamente lo que esperaba.'],
    ["I'm [inclined] to agree.", 'Me inclino a estar de acuerdo.'],
    ['That may be a bit of an [overstatement].', 'Eso quizá sea un poco exagerado.'],
    ["I'd [argue] that it's worth it.", 'Yo diría que vale la pena.'],
    ["Correct me if I'm [wrong], but I think it's closed.", 'Corrígeme si me equivoco, pero creo que está cerrado.'],
    ["It's [arguably] the best option.", 'Es, posiblemente, la mejor opción.'],
    ['I take your [point].', 'Acepto lo que dices.'],
    ['Up to a [point], yes.', 'Hasta cierto punto, sí.'],
  ] },
  { id: 'formal', name: 'Conectores formales', level: 'C1', icon: '🔗', phrases: [
    ['[Nevertheless], we decided to go ahead.', 'Sin embargo, decidimos seguir adelante.'],
    ['[Furthermore], the price is too high.', 'Además, el precio es demasiado alto.'],
    ['As a [result], sales dropped.', 'Como resultado, las ventas bajaron.'],
    ['[Despite] the rain, the event went well.', 'A pesar de la lluvia, el evento salió bien.'],
    ['In [contrast], the second option is cheaper.', 'En cambio, la segunda opción es más barata.'],
    ['[Whereas] I prefer tea, she loves coffee.', 'Mientras que yo prefiero el té, a ella le encanta el café.'],
    ["Given [that] we have little time, let's focus.", 'Dado que tenemos poco tiempo, concentrémonos.'],
    ["[Provided] you agree, we'll sign today.", 'Siempre que estés de acuerdo, firmamos hoy.'],
    ["In [light] of the results, we'll change the plan.", 'A la luz de los resultados, cambiaremos el plan.'],
    ['[Consequently], the flight was cancelled.', 'Por consiguiente, el vuelo se canceló.'],
  ] },
  { id: 'stories', name: 'Contar con detalle', level: 'C1', icon: '📖', phrases: [
    ['It all [started] when I missed the bus.', 'Todo empezó cuando perdí el bus.'],
    ['Out of [nowhere], she called me.', 'De la nada, me llamó.'],
    ['To make a long story [short], we got lost.', 'Para no hacer el cuento largo, nos perdimos.'],
    ['Little did I [know], it was a surprise party.', 'Yo no tenía ni idea: era una fiesta sorpresa.'],
    ["I'll never [forget] that day.", 'Nunca olvidaré ese día.'],
    ['It turned [out] to be a great idea.', 'Resultó ser una gran idea.'],
    ['All of a [sudden], the lights went out.', 'De repente, se fue la luz.'],
    ["Looking [back], I'd do it again.", 'Mirando atrás, lo volvería a hacer.'],
    ['The funny thing [is], nobody noticed.', 'Lo gracioso es que nadie se dio cuenta.'],
    ['In the [end], everything worked out.', 'Al final, todo salió bien.'],
  ] },
  // ---------- C2 ----------
  { id: 'register', name: 'Formal e informal', level: 'C2', icon: '📜', phrases: [
    ['I would be [grateful] if you could reply soon.', 'Le agradecería que respondiera pronto.'],
    ['Please do not [hesitate] to contact me.', 'No dude en contactarme.'],
    ["I'm [afraid] that won't be possible.", 'Me temo que eso no será posible.'],
    ['We regret to [inform] you that the event is cancelled.', 'Lamentamos informarle que el evento se canceló.'],
    ['No [worries], mate.', 'Tranquilo, amigo.'],
    ["I'm [down] for pizza.", 'Me apunto a la pizza.'],
    ["That's [beside] the point.", 'Eso no viene al caso.'],
    ["I [gather] you've been busy.", 'Tengo entendido que has estado ocupado.'],
    ['Should you need anything, let me [know].', 'Si necesitara algo, avíseme.'],
    ["It's not my cup of [tea].", 'No es lo mío.'],
  ] },
  { id: 'persuade', name: 'Convencer y negociar', level: 'C2', icon: '🎯', phrases: [
    ['Hear me [out] before you decide.', 'Escúchame hasta el final antes de decidir.'],
    ['What would it [take] to close the deal?', '¿Qué haría falta para cerrar el trato?'],
    ["I'm willing to meet you [halfway].", 'Estoy dispuesto a que lleguemos a un punto medio.'],
    ["That's my final [offer].", 'Es mi última oferta.'],
    ["Let's find a [compromise].", 'Busquemos un acuerdo en el que los dos cedamos.'],
    ['You drive a hard [bargain].', 'Negocias duro.'],
    ['Think of it as an [investment].', 'Piénsalo como una inversión.'],
    ['The [bottom] line is that it works.', 'Lo esencial es que funciona.'],
    ["I can't [commit] to that yet.", 'Todavía no me puedo comprometer a eso.'],
    ["It's a [win-win] situation.", 'Es una situación en la que todos ganan.'],
  ] },
  { id: 'humor', name: 'Ironía y humor', level: 'C2', icon: '🎭', phrases: [
    ['Oh, [great], another meeting.', 'Ay, qué maravilla, otra reunión (con ironía).'],
    ['Tell me about [it]!', '¡Ni me lo digas!'],
    ['I was only [joking].', 'Solo estaba bromeando.'],
    ["You're pulling my [leg].", 'Me estás tomando el pelo.'],
    ['No pun [intended].', 'Sin doble sentido, lo juro.'],
    ['[Nice] try, but no.', 'Buen intento, pero no.'],
    ["I'll take that as a [compliment].", 'Lo tomaré como un cumplido.'],
    ['Easier [said] than done.', 'Del dicho al hecho hay mucho trecho.'],
    ["Don't take it [personally].", 'No te lo tomes como algo personal.'],
    ['Laughter is the best [medicine].', 'La risa es el mejor remedio.'],
  ] },
];

// Vocabulario de B2 a C2 (después de las 1000 palabras más usadas, que llegan hasta B1): phrasal verbs,
// combinaciones de palabras, modismos y palabras de cada nivel, cada una en una frase propia.
const LEVEL_WORDS = [
  { id: 'v-b2-phrasal', name: 'Phrasal verbs (B2)', level: 'B2', icon: '🔌', phrases: [
    ['She [came up with] a great idea.', 'A ella se le ocurrió una gran idea.'],
    ["Don't [put off] going to the dentist.", 'No dejes para después ir al dentista.'],
    ["I'll [look into] it.", 'Lo voy a revisar.'],
    ['It took me weeks to [get over] the flu.', 'Me tomó semanas recuperarme de la gripe.'],
    ["[Carry on], I'm listening.", 'Sigue, te escucho.'],
    ["Let's [sort out] the problem today.", 'Resolvamos el problema hoy.'],
    ['She [pointed out] a mistake in the report.', 'Ella señaló un error en el informe.'],
    ['He [turned down] the job offer.', 'Rechazó la oferta de trabajo.'],
    ['After hours of arguing, he finally [gave in].', 'Después de horas discutiendo, por fin cedió.'],
    ["Don't worry, it will [work out].", 'No te preocupes, todo se arreglará.'],
  ] },
  { id: 'v-b2-words', name: 'Palabras B2', level: 'B2', icon: '📒', phrases: [
    ['She finally [achieved] her goal.', 'Por fin logró su meta.'],
    ['This job [requires] a lot of patience.', 'Este trabajo requiere mucha paciencia.'],
    ["It's [likely] to snow tonight.", 'Es probable que nieve esta noche.'],
    ['We need a different [approach].', 'Necesitamos otro enfoque.'],
    ['The main [issue] is money.', 'El problema principal es el dinero.'],
    ['Is this seat [available]?', '¿Está libre este asiento?'],
    ["I'll [consider] your offer.", 'Voy a pensar tu oferta.'],
    ['There was a [significant] change.', 'Hubo un cambio importante.'],
    ['The hotel [provides] free breakfast.', 'El hotel ofrece desayuno gratis.'],
    ['We must [reduce] our expenses.', 'Tenemos que reducir nuestros gastos.'],
  ] },
  { id: 'v-c1-collocations', name: 'Combinaciones de palabras (C1)', level: 'C1', icon: '🧩', phrases: [
    ['We have to [take into account] the weather.', 'Tenemos que tener en cuenta el clima.'],
    ['The campaign aims to [raise awareness] about recycling.', 'La campaña busca crear conciencia sobre el reciclaje.'],
    ['They finally [reached an agreement].', 'Por fin llegaron a un acuerdo.'],
    ["It's hard to [meet the deadline].", 'Es difícil cumplir con la fecha límite.'],
    ["Don't [jump to conclusions].", 'No saques conclusiones apresuradas.'],
    ['Pollution [poses a threat] to wildlife.', 'La contaminación es una amenaza para la fauna.'],
    ['[Bear in mind] that the shop closes early.', 'Ten en cuenta que la tienda cierra temprano.'],
    ["She's still trying to [come to terms with] the news.", 'Todavía está tratando de aceptar la noticia.'],
    ['If we wait, we [run the risk] of losing it.', 'Si esperamos, corremos el riesgo de perderlo.'],
    ["It's hard to [strike a balance] between work and family.", 'Es difícil encontrar un equilibrio entre el trabajo y la familia.'],
  ] },
  { id: 'v-c1-words', name: 'Palabras C1', level: 'C1', icon: '📚', phrases: [
    ['The doctor was very [thorough].', 'El médico fue muy minucioso.'],
    ['He was [reluctant] to talk about it.', 'No tenía ganas de hablar de eso.'],
    ['Is the plan [feasible]?', '¿Es viable el plan?'],
    ['Rumors can [undermine] trust.', 'Los rumores pueden debilitar la confianza.'],
    ['We need a [comprehensive] report.', 'Necesitamos un informe completo.'],
    ['Change is [inevitable].', 'El cambio es inevitable.'],
    ['She [advocates] for animal rights.', 'Ella defiende los derechos de los animales.'],
    ['The decision is under [scrutiny].', 'La decisión está bajo la lupa.'],
    ['He made a [compelling] argument.', 'Presentó un argumento convincente.'],
    ['The message was [ambiguous].', 'El mensaje era ambiguo.'],
  ] },
  { id: 'v-c2-idioms', name: 'Modismos (C2)', level: 'C2', icon: '🎨', phrases: [
    ['Stop [beating around the bush] and tell me.', 'Deja de andarte con rodeos y dime.'],
    ["Let's talk about the [elephant in the room].", 'Hablemos del problema que nadie quiere mencionar.'],
    ['They [cut corners] to save money.', 'Hicieron las cosas a medias para ahorrar dinero.'],
    ['Losing that job was a [blessing in disguise].', 'Perder ese trabajo fue un mal que trajo un bien.'],
    ['You have to [read between the lines].', 'Hay que leer entre líneas.'],
    ["Let's [get the ball rolling].", 'Pongamos manos a la obra.'],
    ["I'm still [on the fence] about it.", 'Todavía no me decido.'],
    ["The plan failed, so we're [back to square one].", 'El plan falló, así que volvemos a empezar de cero.'],
    ['That was the [last straw].', 'Esa fue la gota que colmó el vaso.'],
    ['She [hit the nail on the head].', 'Dio en el clavo.'],
  ] },
  { id: 'v-c2-words', name: 'Palabras C2', level: 'C2', icon: '🏆', phrases: [
    ["There's a subtle [nuance] in her tone.", 'Hay un matiz sutil en su tono.'],
    ["He's [meticulous] about details.", 'Es meticuloso con los detalles.'],
    ['Smartphones are [ubiquitous] these days.', 'Hoy en día los teléfonos inteligentes están en todas partes.'],
    ['We need a [pragmatic] solution.', 'Necesitamos una solución práctica.'],
    ['She gave an [eloquent] speech.', 'Dio un discurso elocuente.'],
    ['These measures will [mitigate] the damage.', 'Estas medidas reducirán el daño.'],
    ['The situation is [unprecedented].', 'La situación no tiene precedentes.'],
    ["There's a [discrepancy] in the numbers.", 'Hay una diferencia en las cifras que no cuadra.'],
    ['The instructions were too [convoluted].', 'Las instrucciones eran demasiado enrevesadas.'],
    ['The link between the two events is [tenuous].', 'La relación entre los dos hechos es débil.'],
  ] },
];

const ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const norm = t => (t || '').toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Secciones de la pantalla de frases.
export const GROUPS = [
  { id: 'charla', name: 'Frases esenciales' },
  { id: 'nivel', name: 'Vocabulario por nivel (B2–C2)' },
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
  ...LEVEL_WORDS.map(pk => ({ ...pk, group: 'nivel', phrases: pk.phrases.map(([raw, es], i) => ({ id: `${pk.id}-${i}`, raw, es })) })),
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
export function recommendedPack(vocab, rankCode = 'A1', { exclude = [] } = {}) {
  const done = learnedIds(vocab);
  const open = PACKS.filter(p => !exclude.includes(p.group) && packPhrases(p.id).some(x => !done.has(x.id)));
  if (!open.length) return null;
  const lvl = ORDER.indexOf(rankCode);
  // Primero lo de su nivel; si ya lo aprendió todo, lo de niveles anteriores.
  return open.find(p => p.level === rankCode) || open.find(p => ORDER.indexOf(p.level) <= lvl) || open[0];
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
