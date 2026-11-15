// La mesa no sabe si la partida es local o en línea: habla con un «controlador».
import { abandonar, jugar, siguienteEnEmpezar, vistaDe, type Anios, type EstadoClasico, type Resultado, type VistaClasico } from '../../compartido/clasico'
import { guardarPartida } from './datos'

/** Algo que ha pasado en la partida: una jugada (que la mesa anima) o una puesta al día. */
export interface Suceso {
  vista: VistaClasico
  /** Años de las cartas descubiertas hasta ahora. */
  fechas: Anios
  jugada?: Resultado
  /** En línea: quién sigue conectado. */
  conectados?: boolean[]
}

export interface Controlador {
  inicial: Suceso
  /** Sitio que juega este dispositivo: uno concreto, todos (partida local) o ninguno (solo mira). */
  asiento: number | 'todos' | null
  /** Puede quitar jugadores y repartir otra. En línea es el anfitrión efectivo (el primero conectado) y puede
      cambiar a mitad de partida: hay que leerlo como `control.anfitrion` donde se usa, no copiarlo al empezar. */
  anfitrion: boolean
  jugar(carta: string, posicion: number): void
  /** Sacar a un jugador de la partida: en línea, el anfitrión a quien no vuelve; en local, a quien se va de la mesa. */
  quitar?(jugador: number): void
  /** Dejar la partida. En línea, los demás siguen sin ti; en local, se da por terminada y no se guarda. */
  abandonar(): void
  /** En línea, el anfitrión devuelve a todos a la sala de espera. Solo está mientras eres el anfitrión. */
  aLaSala?(): void
  /** En línea: avisar con una vibración de que te toca (para quien no está mirando la pantalla). */
  tuTurno?(): void
  escuchar(f: (s: Suceso) => void): () => void
}

/** Sin jugadas todavía: la partida está tal como se repartió. */
const sinEmpezar = (e: EstadoClasico) =>
  e.ronda === 1 && e.cronologia.length === 1 && !e.descartes.length && e.jugadores.every((j) => !j.aciertos && !j.fallos)

/**
 * Quién empezó la última partida local de esta sesión, para que en «Otra partida» empiece el siguiente.
 * La primera partida (o la de otros jugadores) se queda con el sorteo que hizo `crear`. `reparto` identifica
 * la partida, para no volver a rotar al continuar una partida guardada antes de jugar nada.
 */
let anterior: { jugadores: string; inicial: number; reparto: string } | null = null

function quienEmpieza(e: EstadoClasico) {
  const jugadores = e.jugadores.map((j) => j.nombre).join('\n')
  const reparto = e.cronologia[0] + ':' + e.jugadores.map((j) => j.mano.join(',')).join('|')
  if (sinEmpezar(e) && anterior && anterior.reparto !== reparto && anterior.jugadores === jugadores) {
    e.inicial = e.turno = siguienteEnEmpezar(anterior.inicial, e.jugadores.length)
    guardarPartida(e)
  }
  anterior = { jugadores, inicial: e.inicial, reparto }
}

export function controlLocal(inicial: EstadoClasico, anios: Anios): Controlador {
  let estado = inicial
  quienEmpieza(estado)
  const oyentes = new Set<(s: Suceso) => void>()
  const suceso = (jugada?: Resultado): Suceso => {
    const fechas: Anios = {}
    const vistas = [...estado.cronologia, ...estado.descartes, ...estado.jugadores.flatMap((j) => j.falladas ?? [])]
    for (const id of vistas) fechas[id] = anios[id]
    return { vista: vistaDe(estado), fechas, jugada }
  }
  const avisar = (s: Suceso) => {
    for (const f of oyentes) f(s)
  }
  return {
    inicial: suceso(),
    asiento: 'todos',
    anfitrion: true,
    jugar(carta, posicion) {
      const r = jugar(estado, anios, carta, posicion)
      estado = r.estado
      guardarPartida(estado.ganadores.length ? null : estado)
      avisar(suceso(r.resultado))
    },
    quitar(jugador) {
      estado = abandonar(estado, jugador).estado
      guardarPartida(estado.ganadores.length ? null : estado)
      avisar(suceso())
    },
    abandonar() {
      guardarPartida(null)
    },
    escuchar(f) {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
  }
}
