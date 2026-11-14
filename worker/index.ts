import { esCodigo, LETRAS } from '../compartido/protocolo'

export { Partida } from './partida'

function codigoAlAzar(): string {
  const n = crypto.getRandomValues(new Uint8Array(4))
  return Array.from(n, (x) => LETRAS[x % LETRAS.length]).join('')
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    const partes = url.pathname.split('/') // '', 'api', 'partida', CÓDIGO, ...

    if (url.pathname === '/api/salud') return Response.json({ ok: true })

    // Crear una sala: se prueba con códigos al azar hasta dar con uno libre.
    if (url.pathname === '/api/partida' && request.method === 'POST') {
      for (let intento = 0; intento < 6; intento++) {
        const codigo = codigoAlAzar()
        const sala = env.PARTIDA.get(env.PARTIDA.idFromName(codigo))
        const r = await sala.fetch(new Request(`${url.origin}/api/partida/${codigo}`, { method: 'POST' }))
        if (r.ok) return r
      }
      return Response.json({ error: 'No se pudo crear la sala' }, { status: 503 })
    }

    // Consultar si existe (GET) o conectarse por WebSocket (GET …/ws).
    if (partes[2] === 'partida' && esCodigo(partes[3] ?? '') && request.method === 'GET') {
      return env.PARTIDA.get(env.PARTIDA.idFromName(partes[3])).fetch(request)
    }

    return Response.json({ error: 'No encontrado' }, { status: 404 })
  },
} satisfies ExportedHandler<Env>
