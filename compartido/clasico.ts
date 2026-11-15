// Reglas del modo competitivo tradicional. Código puro: lo usan la partida local y el servidor.
import type { Ambito } from './tipos'

/** id de carta → [año, 1 si la fecha es aproximada] */
export type Anios = Record<string, [number, number]>

/** Ajustes que no están en el reglamento impreso. */
export interface Opciones {
  /** Cartas que recibe cada jugador al empezar. El reglamento dice cuatro. */
  cartasIniciales: number
  /** Qué pasa con la carta mal colocada: va a los descartes (reglamento) o se queda en su sitio correcto. */
  alFallar: 'descartar' | 'recolocar'
  /** Series con las que se hizo el mazo, para contarlo en la mesa. Falta en las partidas guardadas antes de tenerla. */
  series?: Ambito[]
}
export const OPCIONES: Opciones = { cartasIniciales: 4, alFallar: 'descartar' }
export const MANO_MIN = 2
export const MANO_MAX = 8
export const MAX_JUGADORES = 6

export interface Jugador {
  nombre: string
  /** Personaje de su moneda (ver avatares.ts). */
  avatar?: string
  mano: string[]
  eliminado: boolean
  aciertos: number
  fallos: number
}

export interface EstadoClasico {
  modo: 'clasico'
  opciones: Opciones
  mazo: string[]
  descartes: string[]
  /** Cartas ya colocadas, de la más antigua a la más reciente. */
  cronologia: string[]
  jugadores: Jugador[]
  /** Jugador al que le toca. */
  turno: number
  /** Jugador que abre cada ronda. */
  inicial: number
  ronda: number
  /** Vacío mientras se juega. Más de uno solo si no quedan cartas para desempatar. */
  ganadores: number[]
}

/** Lo que puede ver cualquier jugador: todo menos el orden del mazo. Los años van aparte. */
export type VistaClasico = Omit<EstadoClasico, 'mazo'> & { nMazo: number }

export function vistaDe(e: EstadoClasico): VistaClasico {
  const { mazo, ...resto } = e
  return { ...resto, nMazo: mazo.length }
}

export interface Cierre {
  finRonda: boolean
  /** Jugadores que acabaron a la vez y roban una carta para desempatar. */
  desempate: { jugador: number; carta: string | null }[]
  eliminados: number[]
  ganadores: number[]
}

export interface Resultado extends Cierre {
  jugador: number
  carta: string
  posicion: number
  acierto: boolean
  /** Con la opción de recolocar: hueco correcto en el que queda la carta fallada. */
  recolocada: number | null
  /** Carta que roba quien falla. */
  robada: string | null
}

export function barajar<T>(lista: T[], azar: () => number = Math.random): T[] {
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Cartas que hacen falta para empezar: las manos, la inicial y alguna para robar. */
export function minimoCartas(jugadores: number, cartasIniciales = OPCIONES.cartasIniciales): number {
  return jugadores * cartasIniciales + 2
}

export function crear(
  ids: string[],
  nombres: string[],
  opciones: Opciones = OPCIONES,
  azar: () => number = Math.random,
): EstadoClasico {
  const n = opciones.cartasIniciales
  if (!Number.isInteger(n) || n < MANO_MIN || n > MANO_MAX) throw new Error('Número de cartas iniciales no válido')
  if (nombres.length < 1 || nombres.length > MAX_JUGADORES) throw new Error('Número de jugadores no válido')
  if (ids.length < minimoCartas(nombres.length, n)) throw new Error('Faltan cartas para esa cantidad de jugadores')
  const mazo = barajar(ids, azar)
  const jugadores = nombres.map((nombre) => ({
    nombre,
    mano: mazo.splice(0, n),
    eliminado: false,
    aciertos: 0,
    fallos: 0,
  }))
  return {
    modo: 'clasico',
    opciones: { ...opciones },
    mazo,
    descartes: [],
    cronologia: [mazo.shift()!],
    jugadores,
    turno: 0,
    inicial: 0,
    ronda: 1,
    ganadores: [],
  }
}

/** ¿Es correcta la carta en ese hueco? Con el mismo año vale a cualquier lado. */
export function cabe(cronologia: string[], anios: Anios, carta: string, posicion: number): boolean {
  const anio = anios[carta][0]
  const antes = posicion > 0 ? anios[cronologia[posicion - 1]][0] : -Infinity
  const despues = posicion < cronologia.length ? anios[cronologia[posicion]][0] : Infinity
  return antes <= anio && anio <= despues
}

/** Hueco en el que la carta queda bien colocada (tras las de su mismo año). */
export function lugarCorrecto(cronologia: string[], anios: Anios, carta: string): number {
  const anio = anios[carta][0]
  return cronologia.filter((c) => anios[c][0] <= anio).length
}

/** Las cartas entre las que iba una carta: la anterior y la siguiente de su lugar correcto (null en los extremos). */
export function vecinas(cronologia: string[], anios: Anios, carta: string): [string | null, string | null] {
  const i = lugarCorrecto(cronologia, anios, carta)
  return [cronologia[i - 1] ?? null, cronologia[i] ?? null]
}

/** Si la carta, puesta en ese hueco, toca otra de su mismo año, esa otra (la regla del mismo año). */
export function mismoAnio(cronologia: string[], anios: Anios, carta: string, posicion: number): string | null {
  const anio = anios[carta][0]
  const junto = [cronologia[posicion - 1], cronologia[posicion]].filter((c): c is string => !!c)
  return junto.find((c) => anios[c][0] === anio) ?? null
}

function robar(e: EstadoClasico, azar: () => number): string | null {
  if (!e.mazo.length && e.descartes.length) {
    e.mazo = barajar(e.descartes, azar)
    e.descartes = []
  }
  return e.mazo.shift() ?? null
}

/** Jugadores en orden de turno desde el que abre la ronda. */
function ordenDeRonda(e: EstadoClasico): number[] {
  const n = e.jugadores.length
  return Array.from({ length: n }, (_, k) => (e.inicial + k) % n)
}
const activos = (e: EstadoClasico, orden: number[]) => orden.filter((i) => !e.jugadores[i].eliminado)

/**
 * Pasa el turno tras la jugada (o el abandono) de `e.turno`. `orden` es el de la ronda en curso,
 * con ese jugador dentro aunque acabe de abandonar. Si era el último, cierra la ronda.
 */
function pasarTurno(e: EstadoClasico, orden: number[], c: Cierre, azar: () => number) {
  const resto = activos(e, orden.slice(orden.indexOf(e.turno) + 1))
  if (resto.length) {
    e.turno = resto[0]
    return
  }
  c.finRonda = true
  const enJuego = activos(e, orden)
  const acabaron = enJuego.filter((i) => e.jugadores[i].mano.length === 0)
  if (acabaron.length === 1) {
    e.ganadores = c.ganadores = acabaron
    return
  }
  if (acabaron.length > 1) {
    c.eliminados = enJuego.filter((i) => !acabaron.includes(i))
    for (const i of c.eliminados) e.jugadores[i].eliminado = true
    for (const i of acabaron) {
      const robo = robar(e, azar)
      if (robo) e.jugadores[i].mano.push(robo)
      c.desempate.push({ jugador: i, carta: robo })
    }
    // Sin cartas para desempatar, comparten la victoria.
    if (c.desempate.every((d) => d.carta === null)) {
      e.ganadores = c.ganadores = acabaron
      return
    }
  }
  const siguientes = activos(e, ordenDeRonda(e))
  if (siguientes.length) {
    e.ronda++
    e.turno = siguientes[0]
  }
}

const sinCierre = (): Cierre => ({ finRonda: false, desempate: [], eliminados: [], ganadores: [] })
const copia = (e: EstadoClasico): EstadoClasico => JSON.parse(JSON.stringify(e))

export function jugar(
  estado: EstadoClasico,
  anios: Anios,
  carta: string,
  posicion: number,
  azar: () => number = Math.random,
): { estado: EstadoClasico; resultado: Resultado } {
  if (estado.ganadores.length) throw new Error('La partida ha terminado')
  const e = copia(estado)
  const j = e.jugadores[e.turno]
  const enMano = j.mano.indexOf(carta)
  if (enMano < 0) throw new Error('Esa carta no está en la mano del jugador')
  if (!Number.isInteger(posicion) || posicion < 0 || posicion > e.cronologia.length) throw new Error('Hueco no válido')

  const r: Resultado = {
    jugador: e.turno,
    carta,
    posicion,
    acierto: cabe(e.cronologia, anios, carta, posicion),
    recolocada: null,
    robada: null,
    ...sinCierre(),
  }

  j.mano.splice(enMano, 1)
  if (r.acierto) {
    e.cronologia.splice(posicion, 0, carta)
    j.aciertos++
  } else {
    j.fallos++
    if (e.opciones.alFallar === 'recolocar') {
      r.recolocada = lugarCorrecto(e.cronologia, anios, carta)
      e.cronologia.splice(r.recolocada, 0, carta)
    } else {
      e.descartes.push(carta)
    }
    r.robada = robar(e, azar)
    if (r.robada) j.mano.push(r.robada)
  }

  pasarTurno(e, ordenDeRonda(e), r, azar)
  return { estado: e, resultado: r }
}

/** Un jugador deja la partida (en línea): sus cartas van a los descartes y, si le tocaba, pasa el turno. */
export function abandonar(
  estado: EstadoClasico,
  jugador: number,
  azar: () => number = Math.random,
): { estado: EstadoClasico; cierre: Cierre } {
  const e = copia(estado)
  const c = sinCierre()
  const j = e.jugadores[jugador]
  if (!j || j.eliminado || e.ganadores.length) return { estado: e, cierre: c }
  j.eliminado = true
  e.descartes.push(...j.mano)
  j.mano = []
  if (e.turno === jugador) pasarTurno(e, ordenDeRonda(e), c, azar)
  return { estado: e, cierre: c }
}
