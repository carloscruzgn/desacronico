// Reglas del modo competitivo tradicional. Código puro: lo usan la partida local y el servidor.

/** id de carta → [año, 1 si la fecha es aproximada] */
export type Anios = Record<string, [number, number]>

export interface Jugador {
  nombre: string
  mano: string[]
  eliminado: boolean
  aciertos: number
  fallos: number
}

export interface EstadoClasico {
  modo: 'clasico'
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

export interface Resultado {
  jugador: number
  carta: string
  posicion: number
  acierto: boolean
  /** Carta que roba quien falla. */
  robada: string | null
  finRonda: boolean
  /** Jugadores que acabaron a la vez y roban una carta para desempatar. */
  desempate: { jugador: number; carta: string | null }[]
  eliminados: number[]
  ganadores: number[]
}

export const CARTAS_INICIALES = 4

export function barajar<T>(lista: T[], azar: () => number = Math.random): T[] {
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Cartas que hacen falta para empezar: las manos, la inicial y alguna para robar. */
export function minimoCartas(jugadores: number): number {
  return jugadores * CARTAS_INICIALES + 2
}

export function crear(ids: string[], nombres: string[], azar: () => number = Math.random): EstadoClasico {
  if (ids.length < minimoCartas(nombres.length)) throw new Error('Faltan cartas para esa cantidad de jugadores')
  const mazo = barajar(ids, azar)
  const jugadores = nombres.map((nombre) => ({
    nombre,
    mano: mazo.splice(0, CARTAS_INICIALES),
    eliminado: false,
    aciertos: 0,
    fallos: 0,
  }))
  return {
    modo: 'clasico',
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

function robar(e: EstadoClasico, azar: () => number): string | null {
  if (!e.mazo.length && e.descartes.length) {
    e.mazo = barajar(e.descartes, azar)
    e.descartes = []
  }
  return e.mazo.shift() ?? null
}

/** Jugadores que siguen en la partida, en orden de turno desde el que abre la ronda. */
function ordenDeRonda(e: EstadoClasico): number[] {
  const n = e.jugadores.length
  return Array.from({ length: n }, (_, k) => (e.inicial + k) % n).filter((i) => !e.jugadores[i].eliminado)
}

export function jugar(
  estado: EstadoClasico,
  anios: Anios,
  carta: string,
  posicion: number,
  azar: () => number = Math.random,
): { estado: EstadoClasico; resultado: Resultado } {
  if (estado.ganadores.length) throw new Error('La partida ha terminado')
  const e: EstadoClasico = JSON.parse(JSON.stringify(estado))
  const j = e.jugadores[e.turno]
  const enMano = j.mano.indexOf(carta)
  if (enMano < 0) throw new Error('Esa carta no está en la mano del jugador')
  if (!Number.isInteger(posicion) || posicion < 0 || posicion > e.cronologia.length) throw new Error('Hueco no válido')

  const r: Resultado = {
    jugador: e.turno,
    carta,
    posicion,
    acierto: cabe(e.cronologia, anios, carta, posicion),
    robada: null,
    finRonda: false,
    desempate: [],
    eliminados: [],
    ganadores: [],
  }

  j.mano.splice(enMano, 1)
  if (r.acierto) {
    e.cronologia.splice(posicion, 0, carta)
    j.aciertos++
  } else {
    e.descartes.push(carta)
    j.fallos++
    r.robada = robar(e, azar)
    if (r.robada) j.mano.push(r.robada)
  }

  const orden = ordenDeRonda(e)
  const sitio = orden.indexOf(e.turno)
  if (sitio < orden.length - 1) {
    e.turno = orden[sitio + 1]
    return { estado: e, resultado: r }
  }

  // Ha jugado el último de la ronda: se mira quién se ha quedado sin cartas.
  r.finRonda = true
  const acabaron = orden.filter((i) => e.jugadores[i].mano.length === 0)
  if (acabaron.length === 1) {
    e.ganadores = r.ganadores = acabaron
    return { estado: e, resultado: r }
  }
  if (acabaron.length > 1) {
    r.eliminados = orden.filter((i) => !acabaron.includes(i))
    for (const i of r.eliminados) e.jugadores[i].eliminado = true
    for (const i of acabaron) {
      const robo = robar(e, azar)
      if (robo) e.jugadores[i].mano.push(robo)
      r.desempate.push({ jugador: i, carta: robo })
    }
    // Sin cartas para desempatar, comparten la victoria.
    if (r.desempate.every((d) => d.carta === null)) {
      e.ganadores = r.ganadores = acabaron
      return { estado: e, resultado: r }
    }
  }
  e.ronda++
  e.turno = ordenDeRonda(e)[0]
  return { estado: e, resultado: r }
}
