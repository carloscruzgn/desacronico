// Mensajes entre el navegador y el servidor de partidas (JSON por WebSocket).
import type { Anios, Opciones, Resultado, VistaClasico } from './clasico'
import type { Ambito } from './tipos'

export interface Config {
  ambitos: Ambito[]
  opciones: Opciones
}

export interface JugadorSala {
  nombre: string
  avatar: string
  conectado: boolean
}

/** Foto completa de la sala tal como la puede ver un dispositivo. */
export interface Sala {
  codigo: string
  /** Cambia en cada partida que se empieza, para que la mesa arranque de cero. */
  partida: number
  fase: 'sala' | 'juego'
  /** En la sala de espera, los apuntados; durante la partida, los jugadores en su orden. */
  jugadores: JugadorSala[]
  config: Config
  /** Tu sitio entre los jugadores, o null si solo miras. */
  tu: number | null
  /** Quién hace de anfitrión: el primero de la lista que está conectado (el 0, si está). Puede quitar
      jugadores, cambiar los ajustes, repartir y volver a la sala. -1 si no hay nadie conectado. */
  anfitrion: number
  vista: VistaClasico | null
  /** Años de las cartas ya descubiertas. */
  fechas: Anios
}

export type DelServidor =
  | { t: 'sala'; sala: Sala; jugada?: Resultado }
  | { t: 'error'; mensaje: string }

export type DelCliente =
  | { t: 'config'; config: Config }
  /** Repartir. Con `sinAusentes`, antes se quita de la sala a los que no están conectados. */
  | { t: 'empezar'; sinAusentes?: boolean }
  | { t: 'jugar'; carta: string; posicion: number }
  /** El anfitrión quita a un jugador: de la sala de espera, o de la partida si no vuelve. */
  | { t: 'quitar'; jugador: number }
  /** El anfitrión devuelve a todos a la sala de espera («Cambiar ajustes»). */
  | { t: 'otra' }
  /** El anfitrión reparte otra partida con la misma gente y los mismos ajustes, sin pasar por la sala
      («Otra partida»). Los que miraban entran si caben. Con `sinAusentes`, sin los desconectados. */
  | { t: 'repetir'; sinAusentes?: boolean }
  /** Un jugador deja la partida en curso: sus cartas van a los descartes y los demás siguen. */
  | { t: 'abandonar' }
  /** Cambiar de personaje en la sala de espera. */
  | { t: 'avatar'; avatar: string }
  | { t: 'salir' }

export const LETRAS = 'BCDFGHJKLMNPRSTVWXZ'
export const esCodigo = (s: string) => new RegExp(`^[${LETRAS}]{4}$`).test(s)
