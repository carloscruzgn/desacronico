// Recorta los fotogramas de la fila de arriba de cada avatar (normal y pensando) desde su lámina
// original y compone el fotograma del parpadeo, <id>-pensando-b.webp: el «pensando» con los ojos
// cerrados.
//
// Las láminas no están en el repositorio. Son las imágenes 1280x720 del flow de ElevenLabs
// dqM2OKtZPkALhlMvRaTC: <id>.png es la lámina original (gpt-image-2.5-sunburst) y <id>-ed.png es
// la misma lámina editada con bytedance-seedream-5.5, pidiendo solo cerrar los ojos de la moneda de
// arriba a la derecha. Seedream redibuja un poco toda la figura, así que del fotograma editado se
// toman SOLO los ojos (manchas blancas pequeñas del «pensando» que dejan de serlo), con alineación
// local, corrección de color y borde difuminado. Fuera de esa zona, pensando-b es idéntico a
// pensando, y los dos se codifican igual para que el parpadeo no salte.
//
// De paso se limpia un defecto de los recortes originales: el recuadro de la fila de arriba bajaba
// hasta asomar el canto de la moneda de abajo por el borde inferior. Antes de recortar, todo lo que
// queda bajo la moneda de arriba se pinta del color del fondo de la lámina; el encuadre no cambia.
//
// Uso: node scripts/avatares-parpadeo.mjs <dir-láminas> <dir-salida> [id ...]
// No forma parte de la compilación: los webp se suben ya hechos.

import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const N = 256
// «normal» va con pérdida, como antes. «pensando» y «pensando-b» van SIN pérdida: con pérdida, el
// codificador reparte el error distinto en cada imagen y los dos fotogramas diferían hasta 17 niveles
// lejos de los ojos (el parpadeo «temblaría»); sin pérdida son idénticos fuera de los ojos, bit a bit.
const WEBP = { quality: 88, alphaQuality: 100, effort: 6 }
const WEBP_EXACTO = { lossless: true, effort: 6 }
const raiz = fileURLToPath(new URL('..', import.meta.url))
const PUB = join(raiz, 'public', 'avatares')

// [x, y, lado] en la lámina de 1280x720 de los recortes publicados (sacados comparando con ellos).
const RECUADROS = {
  escritor: { normal: [250, 10, 350], pensando: [673, 10, 350] },
  monje: { normal: [250, 15, 345], pensando: [683, 15, 345] },
  ilustrada: { normal: [247, 7, 353], pensando: [678, 7, 353] },
  rey: { normal: [252, 9, 351], pensando: [675, 10, 350] },
  soldado: { normal: [243, 13, 347], pensando: [687, 13, 347] },
  faraona: { normal: [265, 12, 348], pensando: [665, 12, 348] },
  cientifica: { normal: [250, 11, 349], pensando: [680, 11, 349] },
  astronomo: { normal: [242, 8, 352], pensando: [682, 8, 352] },
  astronauta: { normal: [250, 11, 349], pensando: [678, 11, 349] },
  sufragista: { normal: [266, 15, 345], pensando: [666, 15, 345] },
  aviadora: { normal: [238, 7, 353], pensando: [683, 7, 353] },
  filosofa: { normal: [247, 12, 348], pensando: [682, 12, 348] },
  obispo: { normal: [253, 12, 348], pensando: [676, 12, 348] },
  aldeano: { normal: [227, 8, 352], pensando: [695, 8, 352] },
  corredor: { normal: [247, 8, 352], pensando: [678, 8, 352] },
}

const [dirLaminas, salida, ...pedidos] = process.argv.slice(2)
if (!dirLaminas || !salida) { console.error('Uso: node scripts/avatares-parpadeo.mjs <dir-láminas> <dir-salida> [id ...]'); process.exit(1) }
const ids = pedidos.length ? pedidos : Object.keys(RECUADROS)

// ---- utilidades de máscaras (1 canal, N x N) ----
const gris = (b) => sharp(Buffer.from(b), { raw: { width: N, height: N, channels: 1 } })
const umbral = (b, u) => Buffer.from(b.map((v) => (v > u ? 255 : 0)))
function dilatar(b, r) {
  const o = Buffer.alloc(N * N), off = []
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) off.push([i, j])
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0
    for (const [i, j] of off) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < N && yy < N && b[yy * N + xx] > v) v = b[yy * N + xx] }
    o[y * N + x] = v
  }
  return o
}
const difuminar = (b, s) => gris(b).blur(s).extractChannel(0).raw().toBuffer()
function manchas(m) { // componentes conexas (4-vecinos) de una máscara binaria
  const vis = new Uint8Array(N * N), lista = []
  for (let i = 0; i < N * N; i++) if (m[i] && !vis[i]) {
    const pila = [i], px = []; vis[i] = 1
    while (pila.length) {
      const p = pila.pop(); px.push(p); const x = p % N, y = (p / N) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue
        const q = yy * N + xx; if (m[q] && !vis[q]) { vis[q] = 1; pila.push(q) }
      }
    }
    lista.push(px)
  }
  return lista
}

// ---- recortes ----
// Localiza la moneda en el recorte de 256 px: el círculo cuyo canto crema (anillo claro) encaja mejor,
// buscando centro y radio exterior. Devuelve { cx, cy, r }.
const crema = (b, i) => { const r = b[i * 3], g = b[i * 3 + 1], v = b[i * 3 + 2]; return Math.min(r, g, v) > 170 && Math.max(r, g, v) - Math.min(r, g, v) < 70 }
function moneda(rgb) {
  const angulos = 240, cos = [], sin = []
  for (let k = 0; k < angulos; k++) { cos.push(Math.cos((2 * Math.PI * k) / angulos)); sin.push(Math.sin((2 * Math.PI * k) / angulos)) }
  const en = (x, y) => { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < N && y < N && crema(rgb, y * N + x) ? 1 : 0 }
  const nota = (cx, cy, r) => { let s = 0; for (let k = 0; k < angulos; k++) { for (const d of [2, 4]) s += en(cx + (r - d) * cos[k], cy + (r - d) * sin[k]); s -= 2 * en(cx + (r + 3) * cos[k], cy + (r + 3) * sin[k]) } return s }
  let mejor = [-1e9]
  for (let cy = 100; cy <= 150; cy += 2) for (let cx = 104; cx <= 152; cx += 2) for (let r = 104; r <= 132; r += 2) { const s = nota(cx, cy, r); if (s > mejor[0]) mejor = [s, cx, cy, r] }
  let [, bx, by, br] = mejor
  for (let cy = by - 2; cy <= by + 2; cy += 0.5) for (let cx = bx - 2; cx <= bx + 2; cx += 0.5) for (let r = br - 2; r <= br + 2; r += 0.5) { const s = nota(cx, cy, r); if (s > mejor[0]) mejor = [s, cx, cy, r] }
  return { cx: mejor[1], cy: mejor[2], r: mejor[3] }
}
// Borra la moneda de abajo que asomaba por el borde inferior: lo que queda fuera del círculo de la
// moneda (con su contorno) y por debajo de su centro se pinta del color del fondo de la lámina.
function limpiarBorde(rgb, fondo) {
  const { cx, cy, r } = moneda(rgb), limite = r + 2
  for (let y = Math.ceil(cy); y < N; y++) for (let x = 0; x < N; x++) {
    const t = Math.max(0, Math.min(1, Math.hypot(x - cx, y - cy) - limite)); if (!t) continue
    const p = (y * N + x) * 3; for (let c = 0; c < 3; c++) rgb[p + c] = Math.round(rgb[p + c] * (1 - t) + fondo[c] * t)
  }
  return { cx, cy, r }
}
const lamina = async (f, k = 1) => sharp(await sharp(f).removeAlpha().resize(1280 * k, 720 * k, { fit: 'fill' }).png().toBuffer())
const recorte = (img, [x, y, s], k = 1) => img.clone().extract({ left: Math.round(x * k), top: Math.round(y * k), width: s * k, height: s * k }).resize(N, N).raw().toBuffer()
const rgba = (rgb, a) => { const o = Buffer.alloc(N * N * 4); for (let i = 0; i < N * N; i++) { o.set(rgb.subarray(i * 3, i * 3 + 3), i * 4); o[i * 4 + 3] = a[i] } return o }
const webp = (buf, f, opciones = WEBP) => sharp(buf, { raw: { width: N, height: N, channels: 4 } }).webp(opciones).toFile(f)

// Zona de los ojos. Candidatas: manchas pequeñas y BLANCAS del «pensando» (el blanco del ojo) que en
// la editada han dejado de ser blancas casi enteras; si no hay ninguna (ojos dibujados como un punto
// negro, sin blanco), manchas pequeñas y compactas NEGRAS que en la editada dejan de serlo. De las
// candidatas se toma la mayor y las que están a su altura y cerca (el otro ojo, o el mismo ojo partido
// por la pupila); lo demás que cambia (encajes, turbantes, el canto) es redibujo y se descarta.
const esBlanco = (b, i) => { const r = b[i * 3], g = b[i * 3 + 1], v = b[i * 3 + 2]; return Math.min(r, g, v) > 190 && Math.max(r, g, v) - Math.min(r, g, v) < 45 }
const esNegro = (b, i) => Math.max(b[i * 3], b[i * 3 + 1], b[i * 3 + 2]) < 80
function zonaOjos(base, ed) {
  const dif = new Uint8Array(N * N)
  for (let i = 0; i < N * N; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(base[i * 3 + c] - ed[i * 3 + c])); dif[i] = d }
  const centro = (px) => [px.reduce((s, p) => s + (p % N), 0) / px.length, px.reduce((s, p) => s + ((p / N) | 0), 0) / px.length]
  const candidatas = (es, min, max, compacta) => {
    const m = Buffer.alloc(N * N); for (let i = 0; i < N * N; i++) m[i] = es(base, i) ? 255 : 0
    return manchas(m).filter((px) => {
      if (px.length < min || px.length > max) return false
      const cambia = px.filter((p) => dif[p] > 50 && !es(ed, p)).length / px.length
      if (cambia < 0.75) return false
      if (!compacta) return true
      const xs = px.map((p) => p % N), ys = px.map((p) => (p / N) | 0)
      return px.length / ((Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1)) > 0.45
    })
  }
  let c = candidatas(esBlanco, 5, 250, false), tipo = 'blanco'
  if (!c.length) { c = candidatas(esNegro, 8, 150, true); tipo = 'negro' }
  const ojos = Buffer.alloc(N * N), info = []
  if (!c.length) return { ojos, info, tipo }
  const ancla = centro(c.reduce((a, b) => (b.length > a.length ? b : a)))
  for (const px of c) {
    const [x, y] = centro(px)
    if (Math.abs(x - ancla[0]) < 50 && Math.abs(y - ancla[1]) < 22) { for (const p of px) ojos[p] = 255; info.push({ area: px.length, x: Math.round(x), y: Math.round(y) }) }
  }
  // Se suma lo oscuro que cambia junto al blanco (pupila, párpado de arriba): si no, quedan restos de
  // la pupila abierta asomando alrededor del ojo cerrado.
  const cerca = dilatar(ojos, 7)
  // (y lo que se oscurece: la línea del ojo cerrado)
  const oscuro = (b, i) => Math.max(b[i * 3], b[i * 3 + 1], b[i * 3 + 2]) < 110
  for (let i = 0; i < N * N; i++) if (cerca[i] && dif[i] > 50 && (oscuro(base, i) || oscuro(ed, i))) ojos[i] = 255
  return { ojos, info, tipo }
}

async function parpadeo(base, alfa, E2, caja, radio = 5) {
  const edC = (dx, dy) => recorte(E2, [caja[0] + dx, caja[1] + dy, caja[2]], 2)
  let ed = await edC(0, 0)
  const { ojos, info, tipo } = zonaOjos(base, ed)
  if (!info.length || info.length > 4) return { info, tipo }
  const z = await difuminar(dilatar(ojos, radio), 2)
  // alineación local (medio píxel de lámina) en un anillo alrededor de los ojos
  const anillo = dilatar(umbral(z, 10), 14)
  let mejor = [1e9, 0, 0]
  for (let dy = -3; dy <= 3; dy += 0.5) for (let dx = -3; dx <= 3; dx += 0.5) {
    const e2 = await edC(dx, dy); let e = 0, n = 0
    for (let i = 0; i < N * N; i++) if (anillo[i] && z[i] < 10) { for (let c = 0; c < 3; c++) { const t = base[i * 3 + c] - e2[i * 3 + c]; e += t * t } n++ }
    const r = Math.sqrt(e / n / 3); if (r < mejor[0]) { mejor = [r, dx, dy]; ed = e2 }
  }
  // corrección de color: diferencia media por canal en el borde exterior de la zona
  const borde = dilatar(umbral(z, 5), 6), off = [0, 0, 0]; let n = 0
  for (let i = 0; i < N * N; i++) if (borde[i] && z[i] <= 5) {
    const dd = [0, 1, 2].map((c) => base[i * 3 + c] - ed[i * 3 + c])
    if (Math.max(...dd.map(Math.abs)) < 30) { for (let c = 0; c < 3; c++) off[c] += dd[c]; n++ }
  }
  for (let c = 0; c < 3; c++) off[c] = n ? off[c] / n : 0
  const res = Buffer.alloc(N * N * 3)
  for (let i = 0; i < N * N; i++) { const t = z[i] / 255; for (let c = 0; c < 3; c++) res[i * 3 + c] = Math.max(0, Math.min(255, Math.round(base[i * 3 + c] * (1 - t) + (ed[i * 3 + c] + off[c]) * t))) }
  return { info, tipo, rgba: rgba(res, alfa), mascara: z, deriva: [mejor[1], mejor[2]], color: off.map((v) => +v.toFixed(1)) }
}

await mkdir(salida, { recursive: true })
const informe = {}
for (const id of ids) {
  const cajas = RECUADROS[id]
  const orig = join(dirLaminas, `${id}.png`), editada = join(dirLaminas, `${id}-ed.png`)
  if (!cajas || !existsSync(orig)) { console.error(`${id}: falta la lámina o el recuadro`); continue }
  const L = await lamina(orig)
  const { data: px } = await L.clone().raw().toBuffer({ resolveWithObject: true })
  const fondo = [px[(5 * 1280 + 5) * 3], px[(5 * 1280 + 5) * 3 + 1], px[(5 * 1280 + 5) * 3 + 2]]
  const fila = {}
  informe[id] = { parpadeo: false }
  for (const g of ['normal', 'pensando']) {
    // el alfa (círculo) se conserva del fotograma publicado
    // (se lee a memoria primero: si la salida es public/avatares, el archivo se sobrescribe enseguida)
    const alfa = await sharp(await readFile(join(PUB, `${id}-${g}.webp`))).extractChannel(3).raw().toBuffer()
    const base = await recorte(L, cajas[g])
    const m = limpiarBorde(base, fondo)
    informe[id][g] = `moneda (${m.cx}, ${m.cy}) r ${m.r}`
    await webp(rgba(base, alfa), join(salida, `${id}-${g}.webp`), g === 'pensando' ? WEBP_EXACTO : WEBP)
    fila[g] = { base, alfa }
  }
  if (existsSync(editada)) {
    const r = await parpadeo(fila.pensando.base, fila.pensando.alfa, await lamina(editada, 2), cajas.pensando)
    informe[id].ojos = r.info.map((o) => `${r.tipo} ${o.area}px (${o.x},${o.y})`)
    if (r.rgba) {
      await webp(r.rgba, join(salida, `${id}-pensando-b.webp`), WEBP_EXACTO)
      if (resolve(salida) !== resolve(PUB)) await gris(r.mascara).extractChannel(0).png().toFile(join(salida, `${id}-pensando-b-mascara.png`))
      Object.assign(informe[id], { parpadeo: true, deriva: r.deriva, color: r.color })
    }
  }
  console.log(id, JSON.stringify(informe[id]))
}
