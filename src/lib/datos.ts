import cartasJson from '../../compartido/cartas.json'
import { OPCIONES, type Anios, type EstadoClasico } from '../../compartido/clasico'
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

/** El año como se escribe en la carta: «c.» si es aproximado y signo menos tipográfico antes de nuestra era. */
export function anioTexto(f: { anio: number; circa: boolean } | null | undefined): string {
  if (!f) return ''
  return `${f.circa ? 'c. ' : ''}${f.anio < 0 ? '−' + -f.anio : f.anio}`
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
