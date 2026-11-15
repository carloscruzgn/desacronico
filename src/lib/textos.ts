// Textos del reglamento, del tutorial y de los créditos (del «Reglamento.pdf» original, con erratas
// corregidas y con las aclaraciones de la versión digital). Es la única fuente: el reglamento, el
// tutorial y su narración leen de aquí.
import { toca } from './aparato'
import { cartas, textoPlano } from './datos'

/** Lo imprescindible del modo clásico, para quien abre el reglamento sin haber jugado nunca. */
export const resumen = `
<ol>
<li>En la mesa hay una carta con su año a la vista: con ella empieza la cronología.</li>
<li>Tus cartas no enseñan el año. Cuando te toque, elige una y colócala en un hueco de la cronología: a la izquierda de una carta si crees que ocurrió antes, a la derecha si crees que ocurrió después.</li>
<li>La carta se da la vuelta y enseña su año. Si has acertado, se queda en la mesa. Si no, va a los descartes (o a su sitio correcto, si se juega con la opción «se recoloca») y robas otra carta del mazo.</li>
<li>Si la carta tiene el mismo año que una de la mesa, vale a un lado o al otro. <i>c.</i> quiere decir que la fecha es aproximada, y el guion delante del año, que es antes de Cristo: -490 es el año 490 antes de Cristo.</li>
<li>Una ronda es una vuelta completa: juegan todos una vez, empezando por quien abrió la partida.</li>
<li>Gana quien es el único en colocar su última carta en una ronda. Quien se queda sin cartas espera a que los demás terminen la ronda; si alguien más acaba en esa misma ronda, desempatan entre ellos y los demás quedan fuera.</li>
</ol>
`

// ---------------------------------------------------------------------------------------------
// El tutorial y la escena del modo clásico

/** Los momentos de la escena del modo clásico (EscenaClasico): los usan el tutorial y el reglamento. */
export const PASOS_ESCENA = ['mesa', 'antes', 'acierto', 'fallo', 'entre', 'ronda', 'desempate'] as const
export type PasoEscena = (typeof PASOS_ESCENA)[number]

/** Los pasos del tutorial, uno por momento de la escena (y en el mismo orden). */
export const PASOS_TUTORIAL: { titulo: string; texto: string }[] = [
  {
    titulo: 'Tu mesa',
    texto: 'Arriba, los jugadores, el mazo y los descartes. En el centro, la cronología: empieza con una carta que enseña su año. Abajo, tus cartas, que no lo enseñan.',
  },
  {
    titulo: '¿Antes o después?',
    // «toca» con el dedo, «pulsa» con el ratón (la narración grabada dice «toca»)
    get texto() {
      return `Cuando te toque, elige una carta y ${toca()} un hueco: a la izquierda si crees que ocurrió antes; a la derecha, si después.`
    },
  },
  { titulo: 'Acierto', texto: 'La carta se da la vuelta y enseña su año. Si has acertado, se queda en la cronología.' },
  { titulo: 'Fallo', texto: 'Si no encaja, la carta va a los descartes y robas otra del mazo. Después le toca al siguiente.' },
  {
    titulo: 'Entre dos cartas',
    texto: 'Con más cartas en la mesa hay más huecos, también entre dos cartas. Si tu carta es del mismo año que una de la mesa, vale a un lado o al otro.',
  },
  {
    titulo: 'La ronda',
    texto: 'Una ronda es una vuelta: juegan todos una vez. Si colocas tu última carta, la ronda sigue hasta que jueguen todos. Si nadie más termina en ella, ganas.',
  },
  {
    titulo: 'Desempate',
    texto: 'Si otros también colocan su última carta en esa ronda, desempatan: roban una carta cada uno y siguen. Los que no terminaron quedan fuera.',
  },
]

/** La narración de cada paso del tutorial, escrita para decirla en voz alta (una voz alegre y cercana).
    Se graba en `public/voz/tutorial-01.mp3`, `-02`… en el mismo orden que PASOS_TUTORIAL. */
export const NARRACION_TUTORIAL: string[] = [
  '¡Hola! Esta es tu mesa. Arriba están los jugadores, el mazo y los descartes. En el centro empieza la cronología, con una carta que enseña su año. Y abajo tienes tus cartas, que no lo enseñan.',
  'Cuando te toque, elige una de tus cartas. Después toca un hueco: a la izquierda, si crees que ocurrió antes. A la derecha, si crees que ocurrió después.',
  'La carta se da la vuelta y enseña su año. ¡Has acertado! Así que se queda en la cronología.',
  'Vaya, esta no encaja. La carta se va a los descartes y robas otra del mazo. No pasa nada: ahora le toca al siguiente.',
  'Cuantas más cartas hay en la mesa, más huecos tienes, también entre dos cartas. Y si tu carta es del mismo año que otra, vale a un lado o al otro.',
  'Una ronda es una vuelta completa: juegan todos una vez. Si colocas tu última carta, la ronda sigue hasta que jueguen todos. Y si nadie más termina, ¡has ganado!',
  '¿Y si otros también terminan en esa ronda? Entonces hay desempate. Quienes terminaron roban una carta cada uno y siguen jugando, y los demás quedan fuera. ¡Ya sabes jugar!',
]

// ---------------------------------------------------------------------------------------------
// El reglamento, por capítulos

export interface Capitulo {
  id: string
  /** Título completo, en la hoja. */
  titulo: string
  /** Título corto, en el índice. */
  corto: string
  /** Carta de la portadilla, por el reverso. */
  carta: string
}

/** Los capítulos, en el orden en que se leen: primero lo que se juega en la web, al final la historia. */
export const CAPITULOS: Capitulo[] = [
  { id: 'minuto', titulo: 'Cómo se juega, en un minuto', corto: 'En un minuto', carta: '001' },
  { id: 'modo-web', titulo: 'El modo de la web', corto: 'El modo de la web', carta: '137' },
  { id: 'aclaraciones', titulo: 'Aclaraciones y opciones de la web', corto: 'Aclaraciones', carta: '275' },
  { id: 'anatomia', titulo: 'Anatomía de una carta', corto: 'Anatomía', carta: '036' },
  { id: 'otros-modos', titulo: 'Otros modos del juego de mesa', corto: 'Otros modos', carta: '277' },
  { id: 'sobre', titulo: 'Sobre el juego', corto: 'Sobre el juego', carta: '190' },
  { id: 'creditos', titulo: 'Créditos', corto: 'Créditos', carta: '047' },
]

/** El modo competitivo tradicional, partido en trozos: cada uno mueve la escena del tutorial a su momento. */
export const MODO_WEB: { titulo?: string; paso: PasoEscena; html: string }[] = [
  {
    titulo: 'Objetivo',
    paso: 'mesa',
    html: `<p>En su turno, los jugadores han de situar sus cartas en una cronología ordenada, colocándolas por turno. El objetivo es ser el único jugador que coloque correctamente su última carta en una ronda.</p>`,
  },
  {
    titulo: 'Preparación',
    paso: 'mesa',
    html: `<p>Se escoge un mazo de cartas. Puede utilizarse uno de los ámbitos temáticos o cualquier mezcla de ellos. Este mazo se baraja y se coloca al alcance de los jugadores por su anverso (sin fecha). A su lado estará la pila de descartes. Cada jugador recibirá cuatro cartas que debe colocar frente a sí por el anverso (sin fecha). No se permite mirar la fecha hasta que la carta es jugada.</p>
<p>Se roba la primera carta del mazo y se coloca en el centro de la mesa por su reverso (con la fecha visible). Esta será la carta inicial a partir de la cual se construya la cronología.</p>`,
  },
  {
    titulo: 'Tu turno',
    paso: 'antes',
    html: `<p>El turno de juego va de un jugador a otro en el sentido de las agujas del reloj (en la web, por el orden de la lista de jugadores). El primer jugador deberá colocar una de sus cuatro cartas junto a la inicial. Si cree que el evento de la carta que coloca es anterior, lo coloca a la izquierda de la carta inicial. Si cree que es posterior, lo hará a la derecha.</p>`,
  },
  {
    paso: 'acierto',
    html: `<p>Una vez colocada, la carta se voltea y se comprueba si el jugador había acertado. Si acertó, permanece donde está, mostrando su fecha, construyendo la cronología.</p>`,
  },
  {
    paso: 'fallo',
    html: `<p>Si falló, la carta se va a la pila de descartes, y el jugador deberá robar una carta del mazo para colocarla frente a sí: fallar implica no reducir su mano de cartas.</p>`,
  },
  {
    paso: 'entre',
    html: `<p>El siguiente jugador tiene su turno ahora y, si el primero acertó en su colocación, tiene tres posibilidades: si el evento que coloca es anterior a los dos presentes en la cronología, ha de colocarlo a la izquierda; si cree que es posterior, a la derecha; y si cree que sucedió entre ambos, ha de colocarlo entre los dos de la mesa. Como antes, se voltea la carta, y si acertó se queda en la cronología tal cual, y si falló se va a la pila de descartes y el jugador ha de robar una nueva carta del mazo.</p>
<p>Hay que tener en cuenta que si un jugador juega una carta que tiene la misma fecha que una presente en la cronología, esta puede jugarse indistintamente a la izquierda o a la derecha de ella.</p>`,
  },
  {
    titulo: 'Fin de la partida',
    paso: 'ronda',
    html: `<p>Cuando en una ronda un jugador es el único en colocar su última carta, este es el ganador. La ronda empieza siempre por el jugador inicial: quien coloca su última carta espera a que jueguen los demás.</p>`,
  },
  {
    titulo: 'Desempate',
    paso: 'desempate',
    html: `<p>Si dos o más jugadores colocan su última carta en la misma ronda (tomando como referencia para el comienzo de ronda el jugador inicial), entonces los que no terminaron son eliminados y los jugadores empatados roban una nueva carta, para seguir jugando hasta que solo uno termine en esta ronda o posteriores.</p>`,
  },
]

/** Lo que cambia, o se puede elegir, en la versión digital del modo clásico. */
export const ACLARACIONES: { titulo: string; html: string }[] = [
  { titulo: 'Jugadores', html: 'En la web se juega de 1 a 6: también a solas, para practicar. En la mesa, de 2 a 6.' },
  { titulo: 'Turnos', html: 'El turno sigue el orden de la lista de jugadores, que hace las veces del sentido de las agujas del reloj.' },
  { titulo: 'Quién empieza', html: 'En la primera partida, se echa a suertes. En «Otra partida» empieza el jugador siguiente al que empezó la anterior.' },
  { titulo: 'El mazo', html: 'Se puede jugar con una sola serie o con varias mezcladas, como en la mesa.' },
  { titulo: 'Cartas por jugador', html: 'El reglamento dice cuatro. En la web se pueden repartir de 2 a 8, para una partida más corta o más larga.' },
  {
    titulo: 'Tras fallo',
    html: 'Como en el reglamento, la carta va a los descartes y se roba otra. Con la opción «se recoloca», la carta fallada se queda en su sitio correcto de la cronología, y también se roba otra.',
  },
  { titulo: 'Fechas aproximadas', html: 'Las cartas con <i>c.</i> se ordenan por el año que muestran, como las demás.' },
  { titulo: 'Mazo agotado', html: 'Si hay que robar y el mazo se ha agotado, se baraja la pila de descartes y pasa a ser el nuevo mazo.' },
  { titulo: 'En línea', html: 'Cada jugador puede usar su propio móvil: uno crea la sala y los demás entran con su código.' },
]

/** Las partes de la carta, con su número de llamada en la Anatomía. */
export const ANATOMIA: { cara: 'anverso' | 'reverso'; n: number; rotulo: string; texto: string }[] = [
  { cara: 'anverso', n: 1, rotulo: 'Nombre del juego', texto: '<i>desacrónico</i>, en la cabecera.' },
  { cara: 'anverso', n: 2, rotulo: 'Ilustración', texto: 'Una imagen del acontecimiento.' },
  {
    cara: 'anverso',
    n: 3,
    rotulo: 'Logo del CEPA Coria',
    texto: 'Muerde una de las cuatro esquinas de la ilustración, al azar. Sirve para el modo cooperativo.',
  },
  { cara: 'anverso', n: 4, rotulo: 'Texto', texto: 'El acontecimiento, sin el año.' },
  { cara: 'reverso', n: 5, rotulo: 'Logo en otra esquina', texto: 'En el reverso, el logo cambia de esquina.' },
  { cara: 'reverso', n: 6, rotulo: 'La misma ilustración', texto: 'Y el mismo texto, para reconocer la carta.' },
  {
    cara: 'reverso',
    n: 7,
    rotulo: 'Año, del color de su era',
    texto: '<i>c.</i> (<i>circa</i>) quiere decir que la fecha es aproximada, y el guion delante, que es antes de Cristo: <i>c. -3500</i> es hacia el año 3500 antes de Cristo.',
  },
  { cara: 'reverso', n: 8, rotulo: 'Créditos', texto: 'Los autores del juego, el crédito de la imagen y la licencia CC BY-SA.' },
]

/** Los años de la banda: las cuatro eras. («Contemporánea» lleva un guion blando para caber en las columnas estrechas.) */
export const ERAS: { id: 'antigua' | 'media' | 'moderna' | 'contemporanea'; nombre: string; tramo: string }[] = [
  { id: 'antigua', nombre: 'Antigüedad', tramo: 'hasta 499' },
  { id: 'media', nombre: 'Edad Media', tramo: '500 - 1499' },
  { id: 'moderna', nombre: 'Edad Moderna', tramo: '1500 - 1799' },
  { id: 'contemporanea', nombre: 'Edad Contem­poránea', tramo: 'desde 1800' },
]

export const ANATOMIA_INTRO = `<p>Cada carta tiene dos caras. El <b>anverso</b> es la que se ve mientras la carta está en la mano. El <b>reverso</b>, con el año, se descubre al colocarla.</p>`

export const COLORES = `<p>Hay dos códigos de colores. El color de los bordes dice el <b>ámbito</b> de la carta; la banda del año, su <b>era</b>.</p>`

/** Modos del juego de mesa que la web todavía no tiene. */
export const OTROS_MODOS_INTRO = `<p>El juego de mesa trae dos modos más. Aquí está su reglamento completo, para jugarlos con las cartas impresas.</p>`

export const OTROS_MODOS: { titulo: string; objetivo: string; html: string; web: string }[] = [
  {
    titulo: 'Modo competitivo de eras',
    objetivo:
      'En dos turnos, los jugadores seleccionan de su mano inicial un número determinado de cartas y tienen que conseguir agruparlas en dos eras cualesquiera. Gana el jugador con la puntuación más alta.',
    html: `<p><b>Preparación:</b> se escoge un mazo de cartas. Puede utilizarse uno de los ámbitos temáticos o cualquier mezcla de ellos. Este mazo se baraja y se coloca al alcance de los jugadores por su anverso (sin fecha). A su lado estará la pila de descartes. Cada jugador recibirá doce cartas que debe colocar frente a sí por el anverso (sin fecha). No se permite mirar la fecha hasta que la carta es jugada. Los turnos son simultáneos.</p>
<p><b>Desarrollo:</b> en la primera ronda, cada jugador debe seleccionar de entre sus doce cartas aquellas que crea que conforman el número mayor de cartas de una misma era. Antes de completar su selección, el jugador puede descartar y robar cartas del siguiente modo: si elige descartarse de una de sus cartas, la coloca en la pila de descartes y roba una nueva carta. Si decide descartarse de tres de sus cartas, las coloca en la pila de descartes y roba dos nuevas cartas. Si decide descartarse de cinco de sus cartas, roba tres nuevas cartas. Una vez hecha la selección las coloca más adelantadas. Todos los jugadores, al unísono, voltean dichas cartas mostrando las fechas. Para cada uno de ellos, si todas las cartas son de la misma era, se quedan como están. Si una de las cartas es errónea, esta se retira a la pila de descartes. Si dos cartas son erróneas, estas se retiran y además se retira una de las correctas. Siempre se retirarán las cartas erradas y el mismo número, menos uno, de cartas correctas. El mayor número de cartas que quedan determinará el ganador de la ronda.</p>
<p>Antes de comenzar la segunda ronda, los jugadores reponen su mano inicial hasta volver a tener doce cartas frente a sí. Una vez que todos están preparados, el desarrollo de la segunda ronda es igual a la primera, con selección de cartas y descarte y robo, en el número deseado por el jugador siguiendo las normas establecidas en la ronda anterior y sin ser obligatorio. La nueva selección tiene que ser para una era distinta a la realizada en la primera ronda. Estas cartas seleccionadas se colocan de nuevo en posición más adelantada, pero sin mezclarse con las de la primera ronda. Todos, al unísono, voltean su selección, y se reajusta del mismo modo que se hizo en la ronda anterior en función del número de errores, si los hay.</p>
<p><b>Fin de la partida:</b> tras jugarse las dos rondas, los jugadores suman los siguientes puntos: tres puntos si se es el ganador de la primera ronda y dos si se queda segundo en esta primera ronda (en caso de empate en el primer puesto, los ganadores se llevan los tres puntos, y lo mismo si sucede en el segundo puesto con dos puntos). En la segunda se repartirán dos y un punto, del mismo modo. Se suman los puntos y gana el jugador que tenga más en total. Si se acaba con empate a puntos en la primera posición, los jugadores empatados roban hasta disponer de nuevo de doce cartas y se enfrentan el número de rondas necesarias para encumbrar un único ganador.</p>`,
    web: `<p>Cada jugador hará su selección en secreto, pasándose el dispositivo; una pantalla intermedia ocultará la mano del anterior. El descarte se hará una sola vez por ronda y solo en las cantidades del reglamento (1, 3 o 5 cartas). Al seleccionar, el jugador declarará la era a la que cree que pertenecen sus cartas: son erróneas las que no son de esa era. Se podrá no seleccionar ninguna carta, y el resultado nunca bajará de cero. Solo puntúa quien conserva al menos una carta. Si hay empate en un puesto, el siguiente jugador ocupa el puesto inmediato (dos empatados en primer lugar y el siguiente es segundo). En las rondas de desempate se podrá elegir cualquier era y ganará quien conserve más cartas.</p>`,
  },
  {
    titulo: 'Modo cooperativo',
    objetivo: 'Los jugadores han de jugar juntos para intentar conseguir una cronología lo más extensa posible.',
    html: `<p><b>Preparación:</b> se escoge un mazo de cartas. Puede utilizarse uno de los ámbitos temáticos o cualquier mezcla de ellos. Este mazo ha de ser de 36 cartas, y se baraja y se coloca al alcance de los jugadores por su anverso (sin fecha). A su lado estará la pila de descartes. Cada jugador recibirá cuatro cartas que debe colocar frente a sí por el anverso (sin fecha). Se roba la primera carta del mazo y se coloca en el centro de la mesa por su reverso (con la fecha visible). Esta será la carta inicial a partir de la cual se construya la cronología. Se roba la segunda carta y se coloca por su reverso (con la fecha visible) en la pila de descartes.</p>
<p><b>Desarrollo:</b> en su turno cada jugador puede hacer dos acciones: o bien colocar dos cartas en la cronología, una por una, o bien descartarse de una carta. Al final del turno el jugador roba del mazo hasta volver a tener cuatro cartas y el turno pasa al siguiente jugador en el sentido de las agujas del reloj.</p>
<p>Para jugar una carta, el jugador ha de escogerla y voltearla. Una vez vista la fecha, esta se colocará a la izquierda o a la derecha de la carta inicial —o de las cartas, si ya hay varias—. En este modo no se colocan las cartas en los huecos, solo en los extremos, pero hay una cronología adicional. Si la carta levantada está entre dos fechas de la cronología, y por tanto no se puede colocar ni a la derecha ni a la izquierda, entonces se colocará encima, entre las dos, en la cronología adicional. Si la carta está entre dos fechas, y además entre ambas ya hay una carta en la cronología adicional, la devuelve a su mano, aunque puesta en horizontal, para indicar que se falló con ella, y su turno termina. Como resultará imposible volver a jugarla, tendrá que descartarla cuando pueda. En su turno, el jugador puede jugar una o dos cartas, según prefiera, pero obligatoriamente tendrá que jugar al menos una o descartarse de una.</p>
<p>Para descartarse de una carta, los jugadores deberán fijarse en el logo del CEPA Coria presente en las ilustraciones. Si el logo de la carta de la cual desea descartarse, que estará en su anverso, coincide en su posición (arriba/abajo y derecha/izquierda) con la de la pila de descartes, que estará en su reverso, podrá descartarse de ella y colocarla en la pila de descartes por su reverso, robando una nueva del mazo. Si no coincide, tendrá que esperar a otro momento para poder descartarse de ella.</p>
<p><b>Fin de la partida:</b> la partida termina cuando los jugadores ya no pueden jugar ninguna carta, que puede suceder tras agotarse el mazo y las cartas en mano de los jugadores, o bien cuando las cartas de todos están en horizontal y por tanto no puede jugarse ninguna más, aunque el mazo no esté agotado.</p>`,
    web: `<p>Si una carta tiene el mismo año que el extremo de la cronología, se colocará en ese extremo. El jugador que no pueda jugar ni descartarse de ninguna carta pasará su turno. El mazo agotado no se rehace con los descartes: forma parte del final de la partida.</p>`,
  },
]

export const SOBRE_EL_JUEGO = `
<h4>El juego</h4>
<p>Este juego, <i>desacrónico</i>, surge en 2024 producto de la colaboración entre Carlos Cruz González y Rodrigo Muñoz Martínez compartiendo espacios y horarios en el CEPA Coria.</p>
<p>La idea de realizar una variante personalizada del popular juego Timeline cristalizó tras numerosas conversaciones y cafés en torno a la afición común a los juegos de mesa, en los que discutíamos sus aplicaciones en el aula, dentro de un contexto de la ludificación de la enseñanza. De varios juegos que se probaron de manera efectiva con los alumnos, el Timeline original se descubrió como un juego ágil y eficaz, útil tanto para trabajar contenidos específicos en el aula, como para abordar un enfoque competencial de la enseñanza o, sencillamente, para destensar algunas sesiones largas y concentradas, permitiendo relajar a los alumnos sin dejar de lado el proceso continuo de aprendizaje. Era cuestión de tiempo que, por su idoneidad, nos decidiéramos a realizar nuestra propia variante, con tarjetas más adaptadas a los contenidos que impartimos, tanto desde el ámbito de Comunicación (Carlos) como el social (Rodrigo). Algo que, por extensión, sirva para toda la Secundaria.</p>
<p>El resultado final no se contenta con ofrecer dos barajas adaptadas a nuestros ámbitos (identificados por colores, siendo el beige para el de comunicación y el negro para el social), sino que se han ampliado con contenidos para el ámbito científico, así como para la historia y reivindicación de la mujer y el género. Y ofrecemos, por último, una colección de cartas de alcance local, centrada en Coria.</p>
<h4>¿Por qué <i>desacrónico</i>?</h4>
<p>Chronos (χρόνος) fue la personificación del tiempo, que a menudo se confunde con el titán Cronos (Κρόνος), el padre de Zeus. Sea como sea, de ellos viene la familia léxica <i>crono-</i>. Algo ácrono es algo fuera del tiempo. El juego pretende romper esa acronía, esto es, desacronizar, si se nos permite el palabro. Por eso las cartas no tienen año por una de sus caras y será el alumno o jugador el que tenga que encontrar su lugar y establecer la cronología correcta.</p>
`

/** Las especificaciones de la caja, en fichas. */
export const ESPECIFICACIONES: { etiqueta: string; valor: string; nota?: string }[] = [
  { etiqueta: 'Edad', valor: '+12' },
  { etiqueta: 'Jugadores', valor: '1-6', nota: 'en la web · 2-6 en la mesa' },
  { etiqueta: 'Tiempo', valor: '15', nota: 'minutos' },
  { etiqueta: 'Cartas', valor: String(cartas.length) },
]

/** La lista de los créditos de imagen, sacada de las propias cartas. */
const listaImagenes = cartas.map((c) => `<li><b>${c.id}</b> · ${textoPlano(c)}: ${c.credito}</li>`).join('\n')

export const creditos = `
<h4>desacrónico</h4>
<p>Un juego de cartas para hacer cronologías, creado en 2024 por <b>Carlos Cruz González</b> y <b>Rodrigo Muñoz Martínez</b> en el CEPA Coria. Cinco copias físicas impresas, con su caja.</p>
<p>Versión digital realizada a partir del PDF de impresión original.</p>
<p>Las cartas llevan licencia Creative Commons Reconocimiento-CompartirIgual (CC BY-SA), como indica su reverso.</p>

<h4>Tipografía</h4>
<p>IM FELL English, de Igino Marini, con licencia SIL Open Font License 1.1 (se incluye en la carpeta <i>fuentes</i>).</p>
<p>Alegreya Sans, de Juan Pablo del Peral (Huerta Tipográfica), con licencia SIL Open Font License 1.1.</p>

<h4>Imágenes</h4>
<p>Cada carta lleva en el reverso el crédito de su imagen, como la carta impresa: amplíala para leerlo. El símbolo 📷 precede al nombre del fotógrafo.</p>
<details>
<summary>Los créditos de las ${cartas.length} imágenes</summary>
<ol class="lista-imagenes">
${listaImagenes}
</ol>
</details>
`
