// La lámina de la cronología en PNG (ANIM-16): la misma composición que se ve en pantalla, dibujada en un canvas
// al doble de resolución. Arriba la marca y el título; en filas, las cartas por el reverso, cada una con su año, y
// debajo de cada fila la línea del tiempo con un tramo del color de la era de cada carta; al pie, como en el
// reverso de la carta, CC BY-SA, los autores, el CEPA Coria y el crédito de cada imagen.
// Las cartas se dibujan a mano con las medidas de la carta impresa (las mismas de Carta.svelte, en centésimas
// del ancho), a partir de las miniaturas: nada se descarga de fuera de la web.
import detallesJson from '../../compartido/detalles.json'
import { eraDe, type Ambito, type Carta, type Esquina, type Fecha } from '../../compartido/tipos'
import { anioTexto, porId, textoPlano } from './datos'

const detalles = detallesJson as unknown as Record<string, [number, number, number] | null>

/** Lo que va en la lámina. */
export interface DatosLamina {
  ids: string[]
  fechas: Record<string, Fecha>
  /** «Gana Ana · 18 cartas». */
  subtitulo: string
  dia?: Date
}

/** Ancho de la lámina en píxeles de pantalla; el PNG sale al doble. */
const ANCHO = 960
const ESCALA = 2
const MARGEN = 56
const HUECO = 14

const FONDO: Record<Ambito, string> = {
  comunicacion: '#ebe9d9',
  social: '#000000',
  cientifico: '#c9d5cb',
  mujer: '#67598f',
  coria: '#0e265c',
}
const OSCURAS = new Set<Ambito>(['social', 'mujer', 'coria'])

/** Los colores de las eras, de las variables de la web (así siguen a app.css). */
function colorEra(era: string): string {
  const v = typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(`--${era}`).trim() : ''
  return v || { antigua: '#b46d7a', media: '#9b9765', moderna: '#5da09d', contemporanea: '#4e56a1' }[era] || '#797978'
}

/** Columnas de la lámina: filas de seis como mucho, sin dejar una fila casi vacía. */
export function columnasLamina(n: number, maximo = 6): number {
  if (n <= maximo) return Math.max(1, n)
  const filas = Math.ceil(n / maximo)
  return Math.ceil(n / filas)
}

/** «Fila a fila»: parte la lista en filas de `c`. */
export function enFilas<T>(lista: T[], c: number): T[][] {
  const filas: T[][] = []
  for (let i = 0; i < lista.length; i += c) filas.push(lista.slice(i, i + c))
  return filas
}

/** El crédito de cada imagen, con el año de su carta: «1476: Bibliothèque nationale de France». */
export function creditosLamina(ids: string[], fechas: Record<string, Fecha>): string {
  return ids.map((id) => `${anioTexto(fechas[id])}: ${porId[id].credito.replace(/\s*📷\s*/g, ' ').replace(/\s+/g, ' ').trim()}`).join(' · ')
}

export const AUTORES = 'Carlos Cruz González y Rodrigo Muñoz Martínez · CEPA Coria'

function cargar(src: string): Promise<HTMLImageElement | null> {
  return new Promise((listo) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => listo(img)
    img.onerror = () => listo(null)
    img.src = src
  })
}

function redondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Parte un texto en renglones que caben en `ancho`; si pasa de `maximo`, el último acaba en «…». */
function renglones(ctx: CanvasRenderingContext2D, texto: string, ancho: number, maximo = Infinity): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean)
  const lineas: string[] = []
  let actual = ''
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p
    if (ctx.measureText(prueba).width <= ancho || !actual) actual = prueba
    else {
      lineas.push(actual)
      actual = p
    }
  }
  if (actual) lineas.push(actual)
  if (lineas.length > maximo) {
    const cortadas = lineas.slice(0, maximo)
    let ultima = cortadas[maximo - 1]
    while (ultima && ctx.measureText(ultima + '…').width > ancho) ultima = ultima.replace(/\s*\S+$/, '')
    cortadas[maximo - 1] = ultima + '…'
    return cortadas
  }
  return lineas
}

/** Una carta por el reverso, como Carta.svelte en pequeño (sin la letra pequeña del pie). */
function dibujarCarta(ctx: CanvasRenderingContext2D, c: Carta, f: Fecha | undefined, x: number, y: number, w: number, img: HTMLImageElement | null, logo: HTMLImageElement | null) {
  const u = w / 100
  const h = (w * 766) / 554
  const letra = OSCURAS.has(c.ambito) ? '#ffffff' : '#1d1d1b'
  // la cartulina, con su sombra sobre el papel
  ctx.save()
  ctx.shadowColor = 'rgb(0 0 0 / 0.28)'
  ctx.shadowBlur = 3 * u
  ctx.shadowOffsetY = 1.2 * u
  ctx.fillStyle = FONDO[c.ambito]
  redondeado(ctx, x, y, w, h, 4 * u)
  ctx.fill()
  ctx.restore()
  if (c.ambito === 'comunicacion' || c.ambito === 'cientifico') {
    ctx.strokeStyle = 'rgb(29 29 27 / 0.18)'
    ctx.lineWidth = 0.5
    redondeado(ctx, x, y, w, h, 4 * u)
    ctx.stroke()
  }
  // la ilustración: el detalle ampliado del reverso, como en la carta impresa
  const ix = x + 8.3 * u
  const iy = y + 8.3 * u
  const iw = w - 16.6 * u
  const ih = 73.3 * u
  ctx.save()
  redondeado(ctx, ix, iy, iw, ih, [4 * u, 4 * u, 0, 0])
  ctx.clip()
  ctx.fillStyle = 'rgb(0 0 0 / 0.12)'
  ctx.fillRect(ix, iy, iw, ih)
  if (img) {
    const [dx, dy, ds] = detalles[c.id] ?? [0.5, 0, 1]
    const s = Math.max(iw / img.naturalWidth, ih / img.naturalHeight)
    const dw = img.naturalWidth * s
    const dh = img.naturalHeight * s
    const ox = dx * iw
    const oy = dy * ih
    const px = (iw - dw) * dx
    const py = (ih - dh) * dy
    ctx.drawImage(img, ix + ox + (px - ox) * ds, iy + oy + (py - oy) * ds, dw * ds, dh * ds)
  }
  // la pestaña del logo, que muerde una esquina de la ilustración
  const pw = 27 * u
  const ph = 15 * u
  const r = 5.4 * u
  const esq: Esquina = c.logoReverso
  const px = esq.endsWith('l') ? ix : ix + iw - pw
  const py = esq.startsWith('t') ? iy : iy + ih - ph
  const radios: Record<Esquina, [number, number, number, number]> = { tl: [0, 0, r, 0], tr: [0, 0, 0, r], bl: [0, r, 0, 0], br: [r, 0, 0, 0] }
  ctx.fillStyle = FONDO[c.ambito]
  redondeado(ctx, px, py, pw, ph, radios[esq])
  ctx.fill()
  if (logo) {
    const lw = pw * 0.72
    const lh = (lw * logo.naturalHeight) / (logo.naturalWidth || 1)
    if (OSCURAS.has(c.ambito)) ctx.filter = 'invert(1)'
    ctx.drawImage(logo, px + (pw - lw) / 2, py + (ph - lh) / 2, lw, lh)
    ctx.filter = 'none'
  }
  ctx.restore()
  // la banda del año, del color de su era
  const by = iy + ih
  const bh = 17.3 * u
  ctx.fillStyle = f ? colorEra(eraDe(f.anio)) : '#797978'
  ctx.fillRect(x + 0.5 * u, by, w - u, bh)
  const anio = anioTexto(f)
  ctx.fillStyle = '#ffffff'
  ctx.font = `${(anio.length > 14 ? 13.4 : 15.2) * u}px "Fell SC", "Fell", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.shadowColor = 'rgb(0 0 0 / 0.5)'
  ctx.shadowBlur = 0.8 * u
  ctx.fillText(anio, x + w / 2, by + bh / 2 + 0.6 * u, w - 4 * u)
  ctx.restore()
  // el filete y el texto, en tres renglones como mucho, como la carta pequeña
  ctx.fillStyle = letra
  ctx.fillRect(x, by + bh + 2.2 * u, w, 0.45 * u)
  ctx.font = `${7.6 * u}px "Fell", serif`
  const lineas = renglones(ctx, textoPlano(c), w - 14 * u, 3)
  const alto = 7.6 * u * 1.15
  const ty = by + bh + 2.65 * u + (32 * u - lineas.length * alto) / 2 + alto / 2
  lineas.forEach((l, k) => ctx.fillText(l, x + w / 2, ty + k * alto))
}

/** Dibuja la lámina y la devuelve como PNG. */
export async function dibujarLamina(d: DatosLamina): Promise<Blob> {
  await Promise.all(['44px "Fell"', 'italic 20px "Fell"', '20px "Fell SC"', '14px "Alegreya Sans"', 'italic 14px "Alegreya Sans"'].map((f) => document.fonts.load(f).catch(() => [])))
  const [imagenes, logo, cc] = await Promise.all([
    Promise.all(d.ids.map((id) => cargar(`/cartas/mini/${id}.webp`))),
    cargar('/img/cepa.svg'),
    cargar('/img/cc-by-sa.png'),
  ])

  const n = d.ids.length
  const cols = columnasLamina(n)
  const util = ANCHO - 2 * MARGEN
  const w = Math.min(150, (util - (cols - 1) * HUECO) / cols)
  const h = (w * 766) / 554
  const filas = enFilas(d.ids, cols)
  const cabecera = 150
  const altoFila = h + 46

  // El pie se mide antes de saber el alto de la lámina.
  const medida = document.createElement('canvas').getContext('2d')!
  medida.font = '13px "Alegreya Sans", sans-serif'
  const creditos = renglones(medida, `Imágenes: ${creditosLamina(d.ids, d.fechas)}`, util)
  const pie = 104 + creditos.length * 17
  const alto = Math.ceil(cabecera + filas.length * altoFila + 20 + pie)

  const lienzo = document.createElement('canvas')
  lienzo.width = ANCHO * ESCALA
  lienzo.height = alto * ESCALA
  const ctx = lienzo.getContext('2d')!
  ctx.scale(ESCALA, ESCALA)

  // el papel, con un grano muy suave
  ctx.fillStyle = '#f5f4ea'
  ctx.fillRect(0, 0, ANCHO, alto)
  let semilla = 7
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647)
  for (let k = 0; k < (ANCHO * alto) / 90; k++) {
    ctx.fillStyle = azar() < 0.5 ? 'rgb(0 0 0 / 0.035)' : 'rgb(255 255 255 / 0.25)'
    ctx.fillRect(azar() * ANCHO, azar() * alto, 1, 1)
  }
  // un filete de tinta alrededor, como una lámina impresa
  ctx.strokeStyle = '#1d1d1b'
  ctx.lineWidth = 1.5
  ctx.strokeRect(20, 20, ANCHO - 40, alto - 40)
  ctx.lineWidth = 0.6
  ctx.strokeRect(25, 25, ANCHO - 50, alto - 50)

  // la marca y el título
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = '44px "Fell", serif'
  const partes: [string, string][] = [
    ['des', '#797978'],
    ['a', '#a9a9a6'],
    ['crónico', '#1d1d1b'],
  ]
  const total = partes.reduce((s, [t]) => s + ctx.measureText(t).width, 0)
  let mx = (ANCHO - total) / 2
  for (const [t, color] of partes) {
    ctx.fillStyle = color
    ctx.fillText(t, mx, 84)
    mx += ctx.measureText(t).width
  }
  ctx.textAlign = 'center'
  ctx.fillStyle = '#1d1d1b'
  ctx.font = '22px "Fell SC", "Fell", serif'
  ctx.fillText('La cronología de la partida', ANCHO / 2, 116)
  ctx.font = 'italic 16px "Alegreya Sans", sans-serif'
  ctx.fillStyle = '#55544c'
  const dia = (d.dia ?? new Date()).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  ctx.fillText(`${d.subtitulo} · ${dia}`, ANCHO / 2, 138)

  // las cartas, fila a fila, con su tramo de línea del tiempo debajo
  filas.forEach((fila, k) => {
    const anchoFila = fila.length * w + (fila.length - 1) * HUECO
    const x0 = (ANCHO - anchoFila) / 2
    const y0 = cabecera + 10 + k * altoFila
    // la línea grabada de la fila
    const ly = y0 + h + 18
    ctx.fillStyle = 'rgb(29 29 27 / 0.25)'
    ctx.fillRect(x0 - HUECO / 2, ly, anchoFila + HUECO, 1)
    fila.forEach((id, j) => {
      const x = x0 + j * (w + HUECO)
      const f = d.fechas[id]
      if (f) {
        ctx.fillStyle = colorEra(eraDe(f.anio))
        ctx.fillRect(x - HUECO / 2, ly - 1.5, w + HUECO, 4)
      }
      dibujarCarta(ctx, porId[id], f, x, y0, w, imagenes[k * cols + j], logo)
    })
  })

  // el pie: como en el reverso de la carta
  const py = cabecera + filas.length * altoFila + 24
  ctx.fillStyle = 'rgb(29 29 27 / 0.5)'
  ctx.fillRect(MARGEN, py, util, 0.8)
  if (cc) ctx.drawImage(cc, MARGEN, py + 14, 60, (60 * cc.naturalHeight) / cc.naturalWidth)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#1d1d1b'
  ctx.font = '15px "Fell", serif'
  ctx.fillText(`desacrónico · ${AUTORES}`, MARGEN + 72, py + 27)
  ctx.font = 'italic 13px "Alegreya Sans", sans-serif'
  ctx.fillStyle = '#55544c'
  ctx.fillText('Licencia CC BY-SA. Cada carta lleva en su reverso el crédito completo de la imagen.', MARGEN + 72, py + 45)
  ctx.font = '13px "Alegreya Sans", sans-serif'
  creditos.forEach((l, k) => ctx.fillText(l, MARGEN, py + 72 + k * 17))

  return new Promise((listo, mal) => lienzo.toBlob((b) => (b ? listo(b) : mal(new Error('sin lámina'))), 'image/png'))
}
