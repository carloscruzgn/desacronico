import { DurableObject } from 'cloudflare:workers'

/** Una partida en curso. De momento solo reserva el sitio: la lógica llega con el multijugador. */
export class Partida extends DurableObject<Env> {
  async fetch(): Promise<Response> {
    return Response.json({ error: 'Partidas en línea todavía no disponibles' }, { status: 501 })
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/salud') return Response.json({ ok: true })
    const sala = url.pathname.match(/^\/api\/partida\/([A-Z]{4})$/)
    if (sala) return env.PARTIDA.get(env.PARTIDA.idFromName(sala[1])).fetch(request)
    return Response.json({ error: 'No encontrado' }, { status: 404 })
  },
} satisfies ExportedHandler<Env>
