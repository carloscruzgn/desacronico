import cartasJson from '../../compartido/cartas.json'
import type { Anios, EstadoClasico } from '../../compartido/clasico'
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
    return e && e.modo === 'clasico' && !e.ganadores.length && e.cronologia.every((id: string) => porId[id]) ? e : null
  } catch {
    return null
  }
}
