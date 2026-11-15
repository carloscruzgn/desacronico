// Saca los iconos de la portada de las láminas SVG de Recraft V4.1 Pro Vector (ElevenLabs, flow
// tr1qYYIjkIr7FuRIol7P): cada lámina trae cuatro iconos en una rejilla de 2x2 sobre un fondo claro.
// Separa los trazos por cuadrante, quita el fondo, lleva cada icono a un cuadro de 48x48 y cambia
// los colores por los del juego: el contorno pasa a currentColor (tinta sobre papel, papel sobre el
// tapete) y el resto, a los tres colores de la identidad (ver ICONOS).
//
// Uso: node scripts/iconos-lamina.mjs <v1.svg> <v2.svg> > src/lib/iconos.ts
// Las láminas no están en el repositorio (van en _local/iconos/).
import { readFileSync } from 'node:fs'

const [v1, v2] = process.argv.slice(2).map((f) => readFileSync(f, 'utf8'))
const LADO = 48

// Solo tres colores, más el contorno: principal (P), secundario (S) y acento (A). Sin tonos intermedios ni
// rellenos de papel. Cada icono dice qué color de la lámina pasa a cuál; el acento va a lo que se mueve
// o se señala (la carta que vuela, la que cae en el hueco, el marcapáginas). El tercer argumento de
// icono() cambia el color de un trazo concreto, por su número dentro del icono.
const P = 'var(--principal)', S = 'var(--secundario)', A = 'var(--acento)'
const TINTA = { 'rgb(21,18,20)': 'currentColor', 'rgb(25,21,23)': 'currentColor' }

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
  // tres cartas en fila (P, S, P) y la que cae en el hueco (A, el trazo 4)
  juega: icono(cuadrante(v1, 2), {
    'rgb(197,116,120)': P, 'rgb(186,151,43)': S, 'rgb(78,142,154)': P, 'rgb(251,249,249)': S,
  }, { 4: A }),
  // un cuadernillo abierto (P, las dos páginas) con el marcapáginas (A); no lleva secundario
  reglas: icono(cuadrante(v1, 3), {
    'rgb(186,151,43)': P, 'rgb(197,116,120)': P, 'rgb(78,142,154)': A,
  }, { 4: A }),
}

console.log(`// Generado por scripts/iconos-lamina.mjs: no se edita a mano.
// Iconos de la portada, en un cuadro de ${LADO}x${LADO}. El contorno va en currentColor.
export const ICONOS = ${JSON.stringify(ICONOS, null, 2)} as const
export type NombreIcono = keyof typeof ICONOS
`)
