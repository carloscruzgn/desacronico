import cartasJson from '../../compartido/cartas.json'
import { esAvatar } from '../../compartido/avatares'
import { MAX_JUGADORES, OPCIONES, type Anios, type EstadoClasico } from '../../compartido/clasico'
import type { Config } from '../../compartido/protocolo'
import type { Ambito, Carta } from '../../compartido/tipos'

export const cartas = cartasJson as Carta[]
export const porId: Record<string, Carta> = Object.fromEntries(cartas.map((c) => [c.id, c]))

export const cuentaPorAmbito = cartas.reduce(
  (n, c) => ((n[c.ambito] = (n[c.ambito] ?? 0) + 1), n),
  {} as Record<Ambito, number>,
)

/** Los años van en un archivo aparte que solo se descarga para jugar en este dispositivo. */
let anios: Promise<Anios> | null = null
export function cargarAnios(): Promise<Anios> {
  return (anios ??= import('../../compartido/anios.json').then((m) => m.default as unknown as Anios))
}

/** El año como se escribe en la carta: «c.» si es aproximado y un guion antes de nuestra era («c. -3500»).
    Es el guion corriente, como en la carta impresa: las letras del juego no tienen el signo menos tipográfico. */
export function anioTexto(f: { anio: number; circa: boolean } | null | undefined): string {
  if (!f) return ''
  // Las fechas del universo van en millones de años, como en la carta impresa: «-13797 millones».
  const numero = enMillones(f.anio) ? `${Math.abs(f.anio) / 1e6} millones` : `${Math.abs(f.anio)}`
  return `${f.circa ? 'c. ' : ''}${f.anio < 0 ? '-' : ''}${numero}`
}

/** Fechas de millones de años (el Big Bang, el Sistema Solar): se escriben y se dicen en millones. */
export const enMillones = (anio: number) => Math.abs(anio) >= 1e6 && anio % 1e6 === 0

/** El año dicho con palabras, para el lector de pantalla: «hacia el año 3500 antes de Cristo», «1492»,
    «hace 13.797 millones de años». Sin `conCirca`, solo el número (para decir entre qué años va un hueco). */
export function anioHablado(f: { anio: number; circa: boolean } | null | undefined, conCirca = true): string {
  if (!f) return ''
  if (enMillones(f.anio)) {
    const millones = String(Math.abs(f.anio) / 1e6).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    const cuando = f.anio < 0 ? `hace ${millones} millones de años` : `${millones} millones`
    return conCirca && f.circa ? `hacia ${cuando}` : cuando
  }
  const numero = f.anio < 0 ? `${-f.anio} antes de Cristo` : `${f.anio}`
  return conCirca && f.circa ? `hacia el año ${numero}` : numero
}

const lista = typeof Intl !== 'undefined' && 'ListFormat' in Intl ? new Intl.ListFormat('es', { type: 'conjunction' }) : null
/** «Ana», «Ana y Benito», «Ana, Benito y Carla». */
export function enLista(nombres: string[]): string {
  return lista ? lista.format(nombres) : nombres.join(' y ')
}

export function textoPlano(c: Carta): string {
  return c.texto.replace(/<[^>]+>/g, '')
}

// Partida local guardada, para que recargar la página en el móvil no la pierda.
const CLAVE = 'desacronico.partida'
export function guardarPartida(e: EstadoClasico | null) {
  try {
    if (e) localStorage.setItem(CLAVE, JSON.stringify(e))
    else localStorage.removeItem(CLAVE)
  } catch {
    // sin almacenamiento (modo privado): la partida sigue, pero no se conserva
  }
}
export function partidaGuardada(): EstadoClasico | null {
  try {
    const e = JSON.parse(localStorage.getItem(CLAVE) ?? 'null')
    if (!e || e.modo !== 'clasico' || e.ganadores.length || !e.cronologia.every((id: string) => porId[id])) return null
    e.opciones ??= { ...OPCIONES } // partidas guardadas antes de que hubiera opciones
    return e
  } catch {
    return null
  }
}

// Últimos ajustes elegidos, para proponerlos en la partida siguiente.
const CLAVE_CONFIG = 'desacronico.config'
export function configGuardada(): Config {
  const defecto: Config = { ambitos: Object.keys(cuentaPorAmbito) as Ambito[], opciones: { ...OPCIONES } }
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_CONFIG) ?? 'null')
    return c?.ambitos?.length && c.opciones ? { ambitos: c.ambitos, opciones: { ...OPCIONES, ...c.opciones } } : defecto
  } catch {
    return defecto
  }
}
export function guardarConfig(c: Config) {
  try {
    localStorage.setItem(CLAVE_CONFIG, JSON.stringify(c))
  } catch {
    // sin almacenamiento
  }
}

// Los jugadores de la última partida local (nombres tal como se escribieron y avatares), para no
// tener que escribirlos otra vez.
const CLAVE_JUGADORES = 'desacronico.jugadores'
export interface JugadoresGuardados {
  nombres: string[]
  avatares: string[]
}
export function jugadoresGuardados(): JugadoresGuardados | null {
  try {
    const j = JSON.parse(localStorage.getItem(CLAVE_JUGADORES) ?? 'null')
    const valen =
      Array.isArray(j?.nombres) &&
      Array.isArray(j?.avatares) &&
      j.nombres.length >= 1 &&
      j.nombres.length <= MAX_JUGADORES &&
      j.nombres.length === j.avatares.length &&
      j.nombres.every((n: unknown) => typeof n === 'string') &&
      j.avatares.every(esAvatar) &&
      new Set(j.avatares).size === j.avatares.length
    return valen ? { nombres: j.nombres.map((n: string) => n.slice(0, 14)), avatares: j.avatares } : null
  } catch {
    return null
  }
}
export function guardarJugadores(j: JugadoresGuardados) {
  try {
    localStorage.setItem(CLAVE_JUGADORES, JSON.stringify(j))
  } catch {
    // sin almacenamiento
  }
}

/** Series con las que se hizo el mazo de una partida (las de antes de guardarlas se deducen de sus cartas). */
export function seriesDe(e: Pick<EstadoClasico, 'opciones' | 'descartes' | 'cronologia' | 'jugadores'> & { mazo?: string[] }): Ambito[] {
  if (e.opciones.series?.length) return e.opciones.series
  const ids = [...(e.mazo ?? []), ...e.descartes, ...e.cronologia, ...e.jugadores.flatMap((j) => j.mano)]
  const hay = new Set(ids.map((id) => porId[id]?.ambito))
  return (Object.keys(cuentaPorAmbito) as Ambito[]).filter((a) => hay.has(a))
}
