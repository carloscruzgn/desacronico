// La mesa no sabe si la partida es local o en línea: habla con un «controlador».
import { jugar, vistaDe, type Anios, type EstadoClasico, type Resultado, type VistaClasico } from '../../compartido/clasico'
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
  anfitrion: boolean
  jugar(carta: string, posicion: number): void
  /** En línea, el anfitrión puede sacar de la partida a quien no vuelve. */
  quitar?(jugador: number): void
  escuchar(f: (s: Suceso) => void): () => void
}

export function controlLocal(inicial: EstadoClasico, anios: Anios): Controlador {
  let estado = inicial
  const oyentes = new Set<(s: Suceso) => void>()
  const suceso = (jugada?: Resultado): Suceso => {
    const fechas: Anios = {}
    for (const id of [...estado.cronologia, ...estado.descartes]) fechas[id] = anios[id]
    return { vista: vistaDe(estado), fechas, jugada }
  }
  return {
    inicial: suceso(),
    asiento: 'todos',
    anfitrion: true,
    jugar(carta, posicion) {
      const r = jugar(estado, anios, carta, posicion)
      estado = r.estado
      guardarPartida(estado.ganadores.length ? null : estado)
      for (const f of oyentes) f(suceso(r.resultado))
    },
    escuchar(f) {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
  }
}
