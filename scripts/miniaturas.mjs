// Genera las miniaturas de las ilustraciones de las cartas: public/cartas/mini/NNN.webp.
//
// Las cartas de la mano y de la mesa se ven en el móvil a 70-250 px de ancho CSS; para eso
// basta una imagen de 260 px, que pesa unas diez veces menos que la original. La carta
// ampliada sigue usando la original (public/cartas/NNN.webp).
//
// Las miniaturas se suben al repositorio ya hechas: este script no forma parte de la compilación.
// Se lanza a mano con `npm run miniaturas` cuando se añade o se cambia una ilustración.
// Salta las miniaturas que ya existen y son más nuevas que su original; con --todas las rehace todas.

import { mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ANCHO = 260
const CALIDAD = 70

const raiz = fileURLToPath(new URL('..', import.meta.url))
const origen = join(raiz, 'public', 'cartas')
const destino = join(origen, 'mini')
const todas = process.argv.includes('--todas')

await mkdir(destino, { recursive: true })

const archivos = (await readdir(origen)).filter((f) => /^\d{3}\.webp$/.test(f)).sort()
let hechas = 0
let saltadas = 0
let bytes = 0

for (const archivo of archivos) {
  const entrada = join(origen, archivo)
  const salida = join(destino, archivo)
  const original = await stat(entrada)
  const previa = await stat(salida).catch(() => null)

  if (!todas && previa && previa.mtimeMs >= original.mtimeMs) {
    saltadas++
    bytes += previa.size
    continue
  }

  const info = await sharp(entrada)
    .resize({ width: ANCHO, withoutEnlargement: true })
    .webp({ quality: CALIDAD, effort: 6, smartSubsample: true })
    .toFile(salida)
  hechas++
  bytes += info.size
}

const total = hechas + saltadas
console.log(
  `Miniaturas: ${hechas} generadas, ${saltadas} ya al día (${total} en total, ` +
    `${(bytes / 1024).toFixed(0)} KB, media ${(bytes / 1024 / Math.max(total, 1)).toFixed(1)} KB).`,
)
