// Conexión con una sala en línea: WebSocket con reconexión automática.
import { esAvatar } from '../../compartido/avatares'
import type { Resultado } from '../../compartido/clasico'
import type { DelCliente, DelServidor, Sala } from '../../compartido/protocolo'
import type { Controlador, Suceso } from './control'

function guardado(clave: string): string {
  try {
    return localStorage.getItem(clave) ?? ''
  } catch {
    return ''
  }
}
function guardar(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // sin almacenamiento
  }
}

/** Identificador de este dispositivo: con él recupera su sitio al reconectar. */
function miId(): string {
  let id = guardado('desacronico.id')
  if (!id) guardar('desacronico.id', (id = crypto.randomUUID()))
  return id
}
// Sin almacenamiento, el identificador vale lo que dure la página.
const idDeSesion = miId()

export const nombreGuardado = () => guardado('desacronico.nombre')
export const avatarGuardado = () => (esAvatar(guardado('desacronico.avatar')) ? guardado('desacronico.avatar') : '')
export const guardarAvatar = (a: string) => guardar('desacronico.avatar', a)
export const salaGuardada = () => guardado('desacronico.sala')
export const olvidarSala = () => guardar('desacronico.sala', '')

/** Petición al servidor de partidas, con los fallos de red y del servidor dichos en cristiano. */
async function pedir(ruta: string, opciones?: RequestInit): Promise<unknown> {
  let r: Response
  try {
    r = await fetch(ruta, opciones)
  } catch {
    throw new Error('No hay conexión. Comprueba el wifi o los datos e inténtalo otra vez.')
  }
  if (!r.ok) throw new Error('El servidor no responde. Inténtalo otra vez dentro de un momento.')
  return r.json()
}

export async function crearSala(): Promise<string> {
  return ((await pedir('/api/partida', { method: 'POST' })) as { codigo: string }).codigo
}

export async function existeSala(codigo: string): Promise<boolean> {
  return ((await pedir(`/api/partida/${codigo}`)) as { existe: boolean }).existe
}

export class Conexion {
  sala = $state.raw<Sala | null>(null)
  estado = $state<'conectando' | 'abierta' | 'reconectando' | 'cerrada'>('conectando')
  error = $state('')

  private ws: WebSocket | null = null
  private oyentes = new Set<(sala: Sala, jugada?: Resultado) => void>()
  private intentos = 0
  /** Se dejó de reintentar tras muchos fallos seguidos. */
  private agotada = false
  private reloj: ReturnType<typeof setTimeout> | undefined
  private latido: ReturnType<typeof setInterval> | undefined
  private alVolver = () => {
    if (document.visibilityState !== 'visible') return
    // Al volver a la pestaña se reintenta, también si ya se había dejado de insistir.
    if (this.agotada) {
      this.agotada = false
      this.intentos = 0
      this.error = ''
      this.estado = 'reconectando'
    }
    if (this.estado === 'reconectando') this.abrir()
  }

  constructor(
    readonly codigo: string,
    readonly nombre: string,
    readonly avatar = '',
  ) {
    guardar('desacronico.nombre', nombre)
    guardar('desacronico.sala', codigo)
    document.addEventListener('visibilitychange', this.alVolver)
    this.abrir()
  }

  private abrir() {
    clearTimeout(this.reloj)
    this.ws?.close()
    const protocolo = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(
      `${protocolo}://${location.host}/api/partida/${this.codigo}/ws?id=${idDeSesion}&nombre=${encodeURIComponent(this.nombre)}&avatar=${encodeURIComponent(this.avatar)}`,
    )
    this.ws = ws
    ws.onopen = () => {
      this.estado = 'abierta'
      this.intentos = 0
      clearInterval(this.latido)
      this.latido = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 25000)
    }
    ws.onmessage = (ev) => {
      if (ev.data === 'pong') return
      const m = JSON.parse(ev.data) as DelServidor
      if (m.t === 'error') {
        this.error = m.mensaje
        return
      }
      this.error = ''
      this.sala = m.sala
      for (const f of this.oyentes) f(m.sala, m.jugada)
    }
    ws.onclose = (ev) => {
      if (this.ws !== ws) return
      clearInterval(this.latido)
      // Cierres definitivos: salida voluntaria, otra pestaña ocupa el sitio o la sala ha caducado.
      if (this.estado === 'cerrada' || ev.code === 1000 || ev.code === 4000 || ev.code === 1001) {
        if (ev.code === 4000) this.error = 'Has abierto la partida en otra pestaña.'
        this.estado = 'cerrada'
        return
      }
      // Tras muchos intentos seguidos se deja de insistir: la sala puede haber caducado.
      if (this.intentos >= 8) {
        this.error = 'No se puede conectar con la sala.'
        this.agotada = true
        this.estado = 'cerrada'
        return
      }
      this.estado = 'reconectando'
      this.reloj = setTimeout(() => this.abrir(), Math.min(8000, 800 * 2 ** this.intentos++))
    }
  }

  enviar(m: DelCliente) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m))
  }

  escuchar(f: (sala: Sala, jugada?: Resultado) => void) {
    this.oyentes.add(f)
    return () => this.oyentes.delete(f)
  }

  /** Deja de escuchar la sala. Con `abandonar`, además libera el sitio en la sala de espera. */
  cerrar(abandonar = false) {
    if (abandonar) {
      this.enviar({ t: 'salir' })
      olvidarSala()
    }
    this.estado = 'cerrada'
    clearTimeout(this.reloj)
    clearInterval(this.latido)
    document.removeEventListener('visibilitychange', this.alVolver)
    this.ws?.close(1000)
  }

  /** Controlador para la mesa de la partida que hay ahora en la sala. */
  control(): Controlador {
    const sala = this.sala!
    const partida = sala.partida
    const suceso = (s: Sala, jugada?: Resultado): Suceso => ({
      vista: s.vista!,
      fechas: s.fechas,
      jugada,
      conectados: s.jugadores.map((j) => j.conectado),
    })
    return {
      inicial: suceso(sala),
      asiento: sala.tu,
      anfitrion: sala.tu === 0,
      jugar: (carta, posicion) => this.enviar({ t: 'jugar', carta, posicion }),
      quitar: (jugador) => this.enviar({ t: 'quitar', jugador }),
      abandonar: () => this.enviar({ t: 'abandonar' }),
      aLaSala: sala.tu === 0 ? () => this.enviar({ t: 'otra' }) : undefined,
      escuchar: (f) => this.escuchar((s, jugada) => s.vista && s.partida === partida && f(suceso(s, jugada))),
    }
  }
}
