// Saca los iconos de la portada de las láminas SVG de Recraft V4.1 Pro Vector (ElevenLabs, flow
// tr1qYYIjkIr7FuRIol7P): cada lámina trae cuatro iconos en una rejilla de 2x2 sobre un fondo claro.
// Separa los trazos por cuadrante, quita el fondo, lleva cada icono a un cuadro de 48x48 y cambia
// los colores por los del juego: el contorno pasa a currentColor (tinta sobre papel, papel sobre el
// tapete) y el resto, a los tres colores de la identidad (ver ICONOS).
//
// Uso: node scripts/iconos-lamina.mjs <v1.svg> <v2.svg> <v3.svg> <v4.svg> <v6.svg> > src/lib/iconos.ts
// v1 y v2: portada (En local y En línea; Cómo se juega y Reglamento ya van a mano). v3 y v4: Repartir y Lámina. Crear sala, a mano. v6: Unirse (puerta con flecha que entra).
// Las láminas no están en el repositorio (van en _local/iconos/).
import { readFileSync } from 'node:fs'

const [v1, v2, v3, v4, v6] = process.argv.slice(2).map((f) => readFileSync(f, 'utf8'))
const LADO = 48

// Solo tres colores, más el contorno: principal (P), secundario (S) y acento (A). Sin tonos intermedios ni
// rellenos de papel. Cada icono dice qué color de la lámina pasa a cuál; el acento va a lo que se mueve
// o se señala (la carta que vuela, la que cae en el hueco, el marcapáginas). El tercer argumento de
// icono() cambia el color de un trazo concreto, por su número dentro del icono.
const P = 'var(--principal)', S = 'var(--secundario)', A = 'var(--acento)'
const TINTA = { 'rgb(21,18,20)': 'currentColor', 'rgb(25,21,23)': 'currentColor', 'rgb(24,21,23)': 'currentColor', 'rgb(0,0,0)': 'currentColor', 'rgb(20,17,23)': 'currentColor' }
// En v3 y v4 el contorno es una forma negra por debajo de los colores: los blancos no pueden quedar
// transparentes (se vería el negro), así que van a uno de los tres colores.

function trazos(svg) {
  return [...svg.matchAll(/<path d="([^"]+)" fill="([^"]+)"/g)].map(([, d, fill]) => {
    const n = d.match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number)
    const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
    const caja = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
    return { d, fill, caja }
  })
}

/** Los trazos de un cuadrante (0 arriba izquierda, 1 arriba derecha, 2 abajo izquierda, 3 abajo derecha). */
function cuadrante(svg, q) {
  return trazos(svg).filter(({ caja: [x0, y0, x1, y1] }) => {
    if (x1 - x0 > 1500) return false // el fondo
    const k = ((y0 + y1) / 2 > 1024 ? 2 : 0) + ((x0 + x1) / 2 > 1024 ? 1 : 0)
    return k === q
  })
}

function icono(ts, colores, trazo = {}) {
  const x0 = Math.min(...ts.map((t) => t.caja[0])), y0 = Math.min(...ts.map((t) => t.caja[1]))
  const x1 = Math.max(...ts.map((t) => t.caja[2])), y1 = Math.max(...ts.map((t) => t.caja[3]))
  const lado = Math.max(x1 - x0, y1 - y0) * 1.06
  const ox = (x0 + x1) / 2 - lado / 2, oy = (y0 + y1) / 2 - lado / 2
  const k = LADO / lado
  const r = (v) => +v.toFixed(2)
  return ts
    .map(({ d, fill }, n) => {
      let i = 0
      const dd = d.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (m) => String(r((Number(m) - (i++ % 2 === 0 ? ox : oy)) * k)))
      const color = trazo[n] ?? TINTA[fill] ?? colores[fill]
      if (!color) throw new Error('color sin traducir: ' + fill)
      return `<path d="${dd.replace(/\s+/g, ' ').replace(/ ?([MCLz]) ?/g, '$1')}" fill="${color}"/>`
    })
    .join('')
}

// Iconos dibujados a mano en el mismo cuadro de 48x48, con contorno de 1,3 en currentColor. Desde el
// 2026-11-15 los iconos nuevos se hacen así, no con Recraft.
const CONTORNO = 'stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"'
const CONTORNO_TINTA = CONTORNO.replace('currentColor', 'var(--tinta)') // el mismo trazo, siempre en tinta
const A_MANO = {
  // una tira de película (S) con sus perforaciones y el fotograma con el play (P); perforaciones y
  // fotograma van siempre en tinta, también su borde: solo el contorno de la tira cambia entre tapete y papel
  juega:
    `<path d="M7 7h34a3 3 0 0 1 3 3v28a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3z" fill="${S}" ${CONTORNO}/>` +
    [8, 16, 24, 32, 40].flatMap((x) => [9.6, 35.2].map((y) => `<rect x="${x - 1.8}" y="${y}" width="3.6" height="3.2" fill="var(--tinta)" ${CONTORNO_TINTA}/>`)).join('') +
    `<rect x="10" y="15.4" width="28" height="17.2" rx="1.8" fill="var(--tinta)" ${CONTORNO_TINTA}/>` +
    `<path d="M20.4 18.6v10.8l9.4-5.4z" fill="${P}" ${CONTORNO_TINTA}/>`,
  sala:
    `<path d="M11 44V14.5a9 9 0 0 1 9-9h8a9 9 0 0 1 9 9V44h-4.6V15a4.6 4.6 0 0 0-4.6-4.6h-7.6A4.6 4.6 0 0 0 15.6 15v29z" fill="${A}" ${CONTORNO}/>` +
    `<path d="M15.6 44V15a4.6 4.6 0 0 1 4.6-4.6h7.6a4.6 4.6 0 0 1 4.6 4.6v29z" fill="currentColor"/>` +
    `<path d="M23.6 13.6 32.4 11V43.2L23.6 46z" fill="${S}" ${CONTORNO}/>` +
    `<path d="M18.6 25.9A6.4 6.4 0 1 1 22.6 25.9V31H26V34H22.6V35.6H25.2V38.6H22.6V41.4L20.6 43.6 18.6 41.4z" fill="${P}" ${CONTORNO}/>` +
    `<circle cx="20.6" cy="19.8" r="2.3" fill="currentColor" ${CONTORNO}/>`,
  // un libro abierto de esquinas redondeadas (P), con tres renglones y el marcapáginas (A)
  reglas:
    `<path d="M24 14.5C18.5 10.6 13 9.6 8.6 10.1 7.4 10.2 6.5 11.2 6.5 12.4V37.6c0 1.3 1.1 2.3 2.4 2.2C14 39.4 19 40.4 24 43.5z" fill="${P}" ${CONTORNO}/>` +
    `<path d="M24 14.5C29.5 10.6 35 9.6 39.4 10.1 40.6 10.2 41.5 11.2 41.5 12.4V37.6c0 1.3-1.1 2.3-2.4 2.2C34 39.4 29 40.4 24 43.5z" fill="${P}" ${CONTORNO}/>` +
    `<path d="M30.5 11.6V25.5l2.6-2.4 2.6 2.4V10.3" fill="${A}" ${CONTORNO}/>` +
    `<path d="M10.5 17.5c3.5-.4 7 .3 9.8 2.1M10.5 23c3.5-.4 7 .3 9.8 2.1M10.5 28.5c3.5-.4 7 .3 9.8 2.1" fill="none" ${CONTORNO}/>`,
}

const ICONOS = {
  // un móvil (P) con un abanico de cartas (S) y la de encima en acento
  local: icono(cuadrante(v2, 0), {
    'rgb(174,93,114)': P,
    'rgb(157,139,105)': S, 'rgb(142,127,102)': S, 'rgb(72,160,176)': S, 'rgb(83,139,160)': S,
    'rgb(54,51,114)': A,
  }),
  // dos móviles (S y P) y la carta que pasa de uno a otro (A)
  linea: icono(cuadrante(v2, 1), {
    'rgb(157,139,105)': S, 'rgb(142,127,102)': S,
    'rgb(72,160,176)': P, 'rgb(83,139,160)': P,
    'rgb(54,51,114)': A,
  }),
  // a mano: una tira de película con el play, que recuerda al icono de vídeo de antes
  juega: A_MANO.juega,
  // a mano: el cuadernillo de Recraft era de esquinas vivas y desentonaba con los demás
  reglas: A_MANO.reglas,
  // un montón (P) del que sale un abanico de cartas (S)
  repartir: icono(cuadrante(v4, 0), {
    'rgb(185,76,65)': P, 'rgb(135,158,145)': S, 'rgb(133,146,140)': S,
  }),
  // Dibujado a mano (la llave de Recraft no convenció): la misma puerta que «unirse», con marco
  // redondeado (A), hueco oscuro y hoja abierta (S), y una llave (P) en lugar de la flecha.
  sala: A_MANO.sala,
  // una puerta abierta (marco A, hoja S) con una flecha que entra (P)
  unirse: icono(cuadrante(v6, 0), {
    'rgb(236,154,21)': A, 'rgb(143,160,160)': S, 'rgb(207,101,68)': P, 'rgb(251,251,250)': 'none', 'rgb(237,229,224)': 'none',
  }),
  // un cartel (S) con la línea del tiempo: cartas en P y A
  lamina: icono(cuadrante(v3, 3), {
    'rgb(148,163,158)': S, 'rgb(249,247,245)': S, 'rgb(220,147,73)': A, 'rgb(187,82,59)': P,
  }),
}

console.log(`// Generado por scripts/iconos-lamina.mjs: no se edita a mano.
// Iconos de la portada, en un cuadro de ${LADO}x${LADO}. El contorno va en currentColor.
export const ICONOS = ${JSON.stringify(ICONOS, null, 2)} as const
export type NombreIcono = keyof typeof ICONOS
`)
