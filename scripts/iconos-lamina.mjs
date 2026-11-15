// Saca los iconos de la portada de las láminas SVG de Recraft V4.1 Pro Vector (ElevenLabs, flow
// tr1qYYIjkIr7FuRIol7P): cada lámina trae cuatro iconos en una rejilla de 2x2 sobre un fondo claro.
// Separa los trazos por cuadrante, quita el fondo, lleva cada icono a un cuadro de 48x48 y cambia
// los colores por los del juego: el contorno pasa a tinta y el resto, a los tres colores de la identidad
// (ver ICONOS). Desde el 2026-11-15 los iconos son iguales sobre el tapete y sobre el papel: nada cambia con el
// fondo. Lo que antes era contorno claro sobre el tapete y decía algo (el grueso de la baraja, el arco de la
// carta que vuela, el trazo del reparto) pasa a mostaza, para que no se pierda en el tapete.
//
// Uso: node scripts/iconos-lamina.mjs <v1.svg> <v2.svg> <v3.svg> <v4.svg> > src/lib/iconos.ts
// v2: En local y En línea. v3 y v4: Lámina y Repartir. Cómo se juega, Reglamento, Crear sala y Unirse, a mano.
// (v1 ya no aporta ningún icono, pero se sigue pasando para no cambiar la llamada.)
// Las láminas no están en el repositorio (van en _local/iconos/).
import { readFileSync } from 'node:fs'

const [, v2, v3, v4] = process.argv.slice(2).map((f) => readFileSync(f, 'utf8'))
const LADO = 48

// Solo tres colores, más el contorno: principal (P), secundario (S) y acento (A). Sin tonos intermedios ni
// rellenos de papel. Cada icono dice qué color de la lámina pasa a cuál; el acento va a lo que se mueve
// o se señala (la carta que vuela, la que cae en el hueco, el marcapáginas). El tercer argumento de
// icono() cambia el color de un trazo concreto, por su número dentro del icono.
const P = 'var(--principal)', S = 'var(--secundario)', A = 'var(--acento)', T = 'var(--tinta)'
const TINTA = { 'rgb(21,18,20)': T, 'rgb(25,21,23)': T, 'rgb(24,21,23)': T, 'rgb(0,0,0)': T, 'rgb(20,17,23)': T }
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

// Iconos dibujados a mano en el mismo cuadro de 48x48, con contorno de 1,3 en tinta. Desde el
// 2026-11-15 los iconos nuevos se hacen así, no con Recraft.
const CONTORNO = 'stroke="var(--tinta)" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"'
const A_MANO = {
  // una tira de película (S) con sus perforaciones y el fotograma con el play (P), en tinta
  juega:
    `<path d="M7 7h34a3 3 0 0 1 3 3v28a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3z" fill="${S}" ${CONTORNO}/>` +
    [8, 16, 24, 32, 40].flatMap((x) => [9.6, 35.2].map((y) => `<rect x="${x - 1.8}" y="${y}" width="3.6" height="3.2" fill="var(--tinta)" ${CONTORNO}/>`)).join('') +
    `<rect x="10" y="15.4" width="28" height="17.2" rx="1.8" fill="var(--tinta)" ${CONTORNO}/>` +
    `<path d="M20.4 18.6v10.8l9.4-5.4z" fill="${P}" ${CONTORNO}/>`,
  // las dos puertas (crear sala y unirse) son la misma, con las proporciones de la de Recraft: marco
  // ancho con las esquinas de arriba redondeadas (A) por encima de todo, hueco oscuro y la hoja (S) abierta hacia dentro, sin salirse
  // del marco. Solo cambia lo que entra por la izquierda, a la misma altura: la llave o la flecha (P).
  puerta:
    `<path d="M16.5 44V10.5a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3V44z" fill="var(--tinta)"/>` +
    `<path d="M21 10.8 35.5 7.5V44L21 42.2z" fill="${S}" ${CONTORNO}/>` +
    `<path d="M12 44V10a7 7 0 0 1 7-7h14a7 7 0 0 1 7 7V44h-4.5V10.5a3 3 0 0 0-3-3H19.5a3 3 0 0 0-3 3V44z" fill="${A}" ${CONTORNO}/>`,
  llave:
    `<path d="M14.6 26.8H27.5V34.2H24.5V30.4H23V33H20.5V30.4H14.6A5.6 5.6 0 1 1 14.6 26.8z" fill="${P}" ${CONTORNO}/>` +
    `<circle cx="9.3" cy="28.6" r="2" fill="var(--tinta)" ${CONTORNO}/>`,
  flecha: `<path d="M4 26.8H17V22.4L26 28.6 17 34.8V30.4H4z" fill="${P}" ${CONTORNO}/>`,
  // un libro abierto de esquinas redondeadas (P), con tres renglones y el marcapáginas (A)
  reglas:
    `<path d="M24 14.5C18.5 10.6 13 9.6 8.6 10.1 7.4 10.2 6.5 11.2 6.5 12.4V37.6c0 1.3 1.1 2.3 2.4 2.2C14 39.4 19 40.4 24 43.5z" fill="${P}" ${CONTORNO}/>` +
    `<path d="M24 14.5C29.5 10.6 35 9.6 39.4 10.1 40.6 10.2 41.5 11.2 41.5 12.4V37.6c0 1.3-1.1 2.3-2.4 2.2C34 39.4 29 40.4 24 43.5z" fill="${P}" ${CONTORNO}/>` +
    `<path d="M30.5 11.6V25.5l2.6-2.4 2.6 2.4V10.3" fill="${A}" ${CONTORNO}/>` +
    `<path d="M10.5 17.5c3.5-.4 7 .3 9.8 2.1M10.5 23c3.5-.4 7 .3 9.8 2.1M10.5 28.5c3.5-.4 7 .3 9.8 2.1" fill="none" ${CONTORNO}/>`,
  // el altavoz del botón de sonido de la mesa: la caja (S) y la bocina (P); el sonido, en ondas (A), o tachado
  altavoz:
    `<rect x="5" y="17.5" width="9" height="13" rx="2.2" fill="${S}" ${CONTORNO}/>` +
    `<path d="M14 17.5 23.6 9.4C24.9 8.3 27 9.2 27 11V37C27 38.8 24.9 39.7 23.6 38.6L14 30.5z" fill="${P}" ${CONTORNO}/>`,
  onda: (r0, r1, grados) => {
    const a = (grados * Math.PI) / 180
    const p = (r, s) => `${(27 + r * Math.cos(a)).toFixed(2)} ${(24 + s * r * Math.sin(a)).toFixed(2)}`
    return `<path d="M${p(r1, -1)}A${r1} ${r1} 0 0 1 ${p(r1, 1)}L${p(r0, 1)}A${r0} ${r0} 0 0 0 ${p(r0, -1)}z" fill="${A}" ${CONTORNO}/>`
  },
  // un aspa: una cruz de brazos redondos girada 45°
  aspa: (() => {
    const [cx, cy, l, w] = [37.5, 24, 7, 1.9]
    const g = Math.SQRT1_2
    const giro = ([x, y]) => `${(cx + (x - y) * g).toFixed(2)} ${(cy + (x + y) * g).toFixed(2)}`
    const pts = [[w, l], [w, w], [l, w], [l, -w], [w, -w], [w, -l], [-w, -l], [-w, -w], [-l, -w], [-l, w], [-w, w], [-w, l]]
    return `<path d="M${pts.map(giro).join('L')}z" fill="${P}" ${CONTORNO}/>`
  })(),
}

const ICONOS = {
  // un móvil (P) con un abanico de cartas (S) y la de encima en acento; debajo del móvil, una carta en
  // acento (el trazo 8) hace de grueso de la baraja
  local: icono(cuadrante(v2, 0), {
    'rgb(174,93,114)': P,
    'rgb(157,139,105)': S, 'rgb(142,127,102)': S, 'rgb(72,160,176)': S, 'rgb(83,139,160)': S,
    'rgb(54,51,114)': A,
  }, { 8: A }),
  // dos móviles (S y P) y la carta que pasa de uno a otro (A), con su arco de puntos (trazos 17 a 23) en A
  linea: icono(cuadrante(v2, 1), {
    'rgb(157,139,105)': S, 'rgb(142,127,102)': S,
    'rgb(72,160,176)': P, 'rgb(83,139,160)': P,
    'rgb(54,51,114)': A,
  }, { 17: A, 18: A, 19: A, 20: A, 21: A, 22: A, 23: A }),
  // a mano: una tira de película con el play, que recuerda al icono de vídeo de antes
  juega: A_MANO.juega,
  // a mano: el cuadernillo de Recraft era de esquinas vivas y desentonaba con los demás
  reglas: A_MANO.reglas,
  // a mano, para el botón de sonido de la mesa: con efectos y voz, dos ondas; con uno de los dos, una; apagado, un aspa
  sonido: A_MANO.altavoz + A_MANO.onda(5.5, 9, 46) + A_MANO.onda(12.5, 16, 44),
  sonidoUno: A_MANO.altavoz + A_MANO.onda(5.5, 9, 46),
  sonidoApagado: A_MANO.altavoz + A_MANO.aspa,
  // un montón (P) del que sale un abanico de cartas (S), con el trazo del movimiento (10 y 11) en A
  repartir: icono(cuadrante(v4, 0), {
    'rgb(185,76,65)': P, 'rgb(135,158,145)': S, 'rgb(133,146,140)': S,
  }, { 10: A, 11: A }),
  // a mano: la puerta con una llave
  sala: A_MANO.puerta + A_MANO.llave,
  // a mano: la misma puerta con una flecha que entra (la de Recraft tenía otro marco)
  unirse: A_MANO.puerta + A_MANO.flecha,
  // un cartel (S) con la línea del tiempo: cartas en P y A
  lamina: icono(cuadrante(v3, 3), {
    'rgb(148,163,158)': S, 'rgb(249,247,245)': S, 'rgb(220,147,73)': A, 'rgb(187,82,59)': P,
  }),
}

console.log(`// Generado por scripts/iconos-lamina.mjs: no se edita a mano.
// Iconos de la portada, en un cuadro de ${LADO}x${LADO}. El contorno va en tinta, sobre cualquier fondo.
export const ICONOS = ${JSON.stringify(ICONOS, null, 2)} as const
export type NombreIcono = keyof typeof ICONOS
`)
