// Deja cada avatar en un círculo limpio: quita el canto oscuro, el aro de papel y el fino trazo
// interior que lo hacían parecer una moneda, y se queda solo con el disco de color del fondo y su
// personaje. Fuera del círculo, transparente.
//
// El disco se busca en cada imagen, porque las monedas no estaban todas igual de centradas en su
// recorte: desde el borde hacia el centro, en 360 direcciones, se salta el fondo y el canto, se
// atraviesa el aro claro y se anota dónde empieza el trazo oscuro que lo separa del disco. Con esos
// puntos se ajusta un círculo (descartando los que no casan: donde la figura invade el aro, como la
// mitra del obispo o las grietas del que pierde) y se recorta un poco por dentro del trazo.
//
// «pensando» y «pensando-b» se recortan con el MISMO círculo (el de «pensando») y sin pérdida, para
// que sigan siendo idénticos fuera de los ojos y el parpadeo no tiemble.
//
// Uso: node scripts/avatares-circulo.mjs <dir-entrada> <dir-salida> [id ...]
// Se aplica una sola vez sobre los webp con aro; no forma parte de la compilación.

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const N = 256
const WEBP = { quality: 90, alphaQuality: 100, effort: 6 }
const WEBP_EXACTO = { lossless: true, effort: 6 }
/** Cuánto se entra por dentro del borde del trazo oscuro, en píxeles de la imagen de entrada. */
const MARGEN = 2.5

const IDS = ['escritor', 'monje', 'ilustrada', 'rey', 'soldado', 'faraona', 'cientifica', 'astronomo', 'astronauta',
  'sufragista', 'aviadora', 'filosofa', 'obispo', 'aldeano', 'corredor']

const [entrada, salida, ...pedidos] = process.argv.slice(2)
if (!entrada || !salida) { console.error('Uso: node scripts/avatares-circulo.mjs <dir-entrada> <dir-salida> [id ...]'); process.exit(1) }
const ids = pedidos.length ? pedidos : IDS

async function leer(archivo) {
  const { data, info } = await sharp(archivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, w: info.width, h: info.height }
}

/** El disco de color: centro y radio, en píxeles de la imagen. */
function disco({ data, w, h }) {
  const px = (x, y) => {
    const i = (Math.round(y) * w + Math.round(x)) * 4
    return [data[i], data[i + 1], data[i + 2]]
  }
  const luz = ([r, g, b]) => (r + g + b) / 3
  const crema = (p) => luz(p) > 170 && p[0] - p[2] > 8
  const cx = w / 2, cy = h / 2
  const puntos = []
  for (let k = 0; k < 360; k++) {
    const a = (k * Math.PI) / 180
    const dx = Math.cos(a), dy = Math.sin(a)
    let enAro = false
    for (let r = w / 2 - 1; r > w / 4; r -= 0.5) {
      const p = px(cx + dx * r, cy + dy * r)
      if (!enAro) { if (crema(p)) enAro = true; continue }
      if (luz(p) < 150) { puntos.push([cx + dx * r, cy + dy * r]); break }
    }
  }
  // Ajuste de círculo por mínimos cuadrados (Kåsa), quitando cada vez los puntos que se alejan.
  let usados = puntos
  let c = ajustar(usados)
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    const dist = usados.map(([x, y]) => Math.abs(Math.hypot(x - c.x, y - c.y) - c.r))
    const lim = Math.max(1.5, mediana(dist) * 3)
    const quedan = usados.filter((_, i) => dist[i] <= lim)
    if (quedan.length === usados.length) break
    usados = quedan
    c = ajustar(usados)
  }
  return { ...c, puntos: puntos.length, validos: usados.length }
}

function mediana(v) {
  const s = [...v].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function ajustar(p) {
  // x² + y² + D x + E y + F = 0
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0
  for (const [x, y] of p) {
    const z = x * x + y * y
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sz += z; sxz += x * z; syz += y * z
  }
  const n = p.length
  // [sxx sxy sx][D]   [-sxz]
  // [sxy syy sy][E] = [-syz]
  // [sx  sy  n ][F]   [-sz ]
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]]
  const b = [-sxz, -syz, -sz]
  const [D, E, F] = resolver(A, b)
  const x = -D / 2, y = -E / 2
  return { x, y, r: Math.sqrt(x * x + y * y - F) }
}

function resolver(A, b) {
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  const d = det(A)
  return [0, 1, 2].map((j) => det(A.map((fila, i) => fila.map((v, k) => (k === j ? b[i] : v)))) / d)
}

/** Recorta el disco a N x N, con lo de fuera transparente y el borde suavizado. */
async function recortar(archivo, c, exacto) {
  const r = c.r - MARGEN
  // Se amplía primero para recortar con precisión de subpíxel.
  const S = 4
  const { w, h } = await sharp(archivo).metadata().then((m) => ({ w: m.width, h: m.height }))
  const grande = await sharp(archivo).ensureAlpha().resize(w * S, h * S, { kernel: 'lanczos3' }).toBuffer()
  const lado = Math.round(2 * r * S)
  const izq = Math.round((c.x - r) * S), arr = Math.round((c.y - r) * S)
  const cuadro = await sharp(grande).extract({ left: izq, top: arr, width: lado, height: lado }).resize(N, N, { kernel: 'lanczos3' }).raw().toBuffer()
  // Máscara circular con medio píxel de suavizado.
  const R = N / 2
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x + 0.5 - R, y + 0.5 - R)
    const a = Math.max(0, Math.min(1, R - d + 0.5))
    const i = (y * N + x) * 4
    cuadro[i + 3] = Math.round(cuadro[i + 3] * a)
  }
  return sharp(cuadro, { raw: { width: N, height: N, channels: 4 } }).webp(exacto ? WEBP_EXACTO : WEBP).toBuffer()
}

await mkdir(salida, { recursive: true })
for (const id of ids) {
  for (const gesto of ['normal', 'pensando', 'gana', 'pierde']) {
    const c = disco(await leer(join(entrada, `${id}-${gesto}.webp`)))
    console.log(`${id}-${gesto}: centro ${c.x.toFixed(1)},${c.y.toFixed(1)} radio ${c.r.toFixed(1)} (${c.validos}/${c.puntos} puntos)`)
    const exacto = gesto === 'pensando'
    const archivos = gesto === 'pensando' ? ['pensando', 'pensando-b'] : [gesto]
    for (const g of archivos) {
      const buf = await recortar(join(entrada, `${id}-${g}.webp`), c, exacto)
      await sharp(buf).toFile(join(salida, `${id}-${g}.webp`))
    }
  }
}
