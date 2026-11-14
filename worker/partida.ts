import { DurableObject } from 'cloudflare:workers'
import aniosJson from '../compartido/anios.json'
import { avatarLibre, esAvatar } from '../compartido/avatares'
import cartasJson from '../compartido/cartas.json'
import {
  abandonar,
  crear,
  jugar,
  MANO_MAX,
  MANO_MIN,
  MAX_JUGADORES,
  OPCIONES,
  vistaDe,
  type Anios,
  type EstadoClasico,
  type Resultado,
} from '../compartido/clasico'
import type { Config, DelCliente, DelServidor, Sala } from '../compartido/protocolo'
import { AMBITOS, type Ambito, type Carta } from '../compartido/tipos'

const anios = aniosJson as unknown as Anios
const cartas = cartasJson as Carta[]
const CADUCA = 24 * 60 * 60 * 1000

interface Asiento {
  /** Identificador secreto del dispositivo: permite volver a su sitio tras reconectar. */
  id: string
  nombre: string
  avatar?: string
}

interface Guardado {
  codigo: string
  partida: number
  fase: 'sala' | 'juego'
  asientos: Asiento[]
  config: Config
  estado: EstadoClasico | null
}

interface Etiqueta {
  id: string
  nombre: string
  avatar?: string
}

/** Una sala: sus jugadores, la configuración y la partida en curso. */
export class Partida extends DurableObject<Env> {
  private g: Guardado | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
    ctx.blockConcurrencyWhile(async () => {
      this.g = (await ctx.storage.get<Guardado>('g')) ?? null
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const codigo = url.pathname.split('/')[3]

    if (request.method === 'POST') {
      if (this.g) return Response.json({ error: 'ocupada' }, { status: 409 })
      this.g = {
        codigo,
        partida: 0,
        fase: 'sala',
        asientos: [],
        config: { ambitos: Object.keys(AMBITOS) as Ambito[], opciones: { ...OPCIONES } },
        estado: null,
      }
      await this.guardar()
      return Response.json({ codigo })
    }

    if (request.headers.get('Upgrade') !== 'websocket') return Response.json({ existe: !!this.g })
    if (!this.g) return Response.json({ error: 'No existe esa sala' }, { status: 404 })

    const id = url.searchParams.get('id') ?? ''
    const nombre = (url.searchParams.get('nombre') ?? '').trim().slice(0, 14) || 'Jugador'
    if (!/^[\w-]{8,64}$/.test(id)) return Response.json({ error: 'Identificador no válido' }, { status: 400 })
    const pedido = url.searchParams.get('avatar')
    const avatar = esAvatar(pedido) ? pedido : undefined

    // Un dispositivo, una conexión: la nueva sustituye a la anterior.
    for (const ws of this.ctx.getWebSockets()) if (this.etiqueta(ws)?.id === id) ws.close(4000, 'sustituida')

    const par = new WebSocketPair()
    this.ctx.acceptWebSocket(par[1])
    par[1].serializeAttachment({ id, nombre, avatar } satisfies Etiqueta)
    this.sentar(id, nombre, avatar)
    await this.guardar()
    this.difundir()
    return new Response(null, { status: 101, webSocket: par[0] })
  }

  async webSocketMessage(ws: WebSocket, texto: string | ArrayBuffer) {
    const g = this.g
    const quien = this.etiqueta(ws)
    if (!g || !quien || typeof texto !== 'string') return
    let m: DelCliente
    try {
      m = JSON.parse(texto)
    } catch {
      return
    }
    const sitio = g.asientos.findIndex((a) => a.id === quien.id)
    const anfitrion = sitio === 0
    let jugada: Resultado | undefined

    try {
      switch (m.t) {
        case 'config':
          if (anfitrion && g.fase === 'sala') g.config = validar(m.config)
          break

        case 'empezar': {
          if (!anfitrion || g.fase !== 'sala') break
          const ids = cartas.filter((c) => g.config.ambitos.includes(c.ambito)).map((c) => c.id)
          g.estado = crear(
            ids,
            g.asientos.map((a) => a.nombre),
            g.config.opciones,
          )
          g.estado.jugadores.forEach((j, i) => (j.avatar = g.asientos[i].avatar))
          g.fase = 'juego'
          g.partida++
          break
        }

        case 'jugar': {
          if (g.fase !== 'juego' || !g.estado || sitio !== g.estado.turno) throw new Error('No es tu turno')
          const r = jugar(g.estado, anios, m.carta, m.posicion)
          g.estado = r.estado
          jugada = r.resultado
          break
        }

        case 'quitar': {
          if (!anfitrion || m.jugador === 0 || !g.asientos[m.jugador]) break
          if (g.fase === 'sala') g.asientos.splice(m.jugador, 1)
          else if (g.estado) g.estado = abandonar(g.estado, m.jugador).estado
          break
        }

        case 'abandonar':
          if (g.fase === 'juego' && g.estado && sitio >= 0) g.estado = abandonar(g.estado, sitio).estado
          break

        case 'avatar':
          if (g.fase === 'sala' && sitio >= 0 && esAvatar(m.avatar) && !g.asientos.some((a, i) => i !== sitio && a.avatar === m.avatar)) g.asientos[sitio].avatar = m.avatar
          break

        case 'otra':
          if (anfitrion && g.fase === 'juego') this.aLaSala()
          break

        case 'salir':
          if (g.fase === 'sala' && sitio >= 0) g.asientos.splice(sitio, 1)
          ws.close(1000, 'salir')
          break
      }
    } catch (e) {
      this.enviar(ws, { t: 'error', mensaje: e instanceof Error ? e.message : 'Error' })
      return
    }

    await this.guardar()
    this.difundir(jugada)
  }

  webSocketClose(ws: WebSocket) {
    this.difundir(undefined, ws)
  }
  webSocketError(ws: WebSocket) {
    this.difundir(undefined, ws)
  }

  /** Nadie ha tocado la sala en un día: se borra. */
  async alarm() {
    for (const ws of this.ctx.getWebSockets()) ws.close(1001, 'caducada')
    this.g = null
    await this.ctx.storage.deleteAll()
  }

  private etiqueta(ws: WebSocket): Etiqueta | null {
    return ws.deserializeAttachment() as Etiqueta | null
  }

  private async guardar() {
    await this.ctx.storage.put('g', this.g)
    await this.ctx.storage.setAlarm(Date.now() + CADUCA)
  }

  /** Da sitio al dispositivo: el suyo si ya lo tenía; uno nuevo solo en la sala de espera. */
  private sentar(id: string, nombre: string, avatar?: string) {
    const g = this.g!
    const mio = g.asientos.find((a) => a.id === id)
    if (mio) {
      if (g.fase === 'sala') mio.nombre = nombre
      mio.avatar ??= avatar
    } else if (g.fase === 'sala' && g.asientos.length < MAX_JUGADORES) {
      // Si su personaje ya lo tiene otro, se le da uno libre: en la mesa no hay dos monedas iguales.
      const usados = g.asientos.map((a) => a.avatar)
      g.asientos.push({ id, nombre, avatar: avatar && !usados.includes(avatar) ? avatar : avatarLibre(usados) })
    }
  }

  /** Vuelta a la sala de espera: los que miraban pasan a ser jugadores si caben. */
  private aLaSala() {
    const g = this.g!
    g.fase = 'sala'
    g.estado = null
    for (const ws of this.ctx.getWebSockets()) {
      const e = this.etiqueta(ws)
      if (e && ws.readyState === WebSocket.OPEN) this.sentar(e.id, e.nombre, e.avatar)
    }
  }

  private enviar(ws: WebSocket, m: DelServidor) {
    try {
      ws.send(JSON.stringify(m))
    } catch {
      // conexión ya cerrada
    }
  }

  /** Manda a cada dispositivo la foto de la sala. `sin` es una conexión que se está cerrando. */
  private difundir(jugada?: Resultado, sin?: WebSocket) {
    const g = this.g
    if (!g) return
    const abiertas = this.ctx.getWebSockets().filter((ws) => ws !== sin && ws.readyState === WebSocket.OPEN)
    const conectados = new Set(abiertas.map((ws) => this.etiqueta(ws)?.id))
    const e = g.estado
    const fechas: Anios = {}
    if (e) for (const id of [...e.cronologia, ...e.descartes]) fechas[id] = anios[id]
    const base = {
      codigo: g.codigo,
      partida: g.partida,
      fase: g.fase,
      jugadores: g.asientos.map((a) => ({ nombre: a.nombre, avatar: a.avatar ?? '', conectado: conectados.has(a.id) })),
      config: g.config,
      vista: e ? vistaDe(e) : null,
      fechas,
    }
    for (const ws of abiertas) {
      const sitio = g.asientos.findIndex((a) => a.id === this.etiqueta(ws)?.id)
      const sala: Sala = { ...base, tu: sitio < 0 ? null : sitio }
      this.enviar(ws, { t: 'sala', sala, jugada })
    }
  }
}

function validar(c: Config): Config {
  const ambitos = (Object.keys(AMBITOS) as Ambito[]).filter((a) => c?.ambitos?.includes(a))
  const n = Number(c?.opciones?.cartasIniciales)
  if (!ambitos.length) throw new Error('Elige al menos un ámbito')
  if (!Number.isInteger(n) || n < MANO_MIN || n > MANO_MAX) throw new Error('Número de cartas no válido')
  return { ambitos, opciones: { cartasIniciales: n, alFallar: c.opciones.alFallar === 'recolocar' ? 'recolocar' : 'descartar' } }
}
