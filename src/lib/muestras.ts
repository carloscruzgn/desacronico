// Los años de las pocas cartas que salen en el tutorial y en el reglamento. Van aquí, y no en
// anios.json, para que enseñar las reglas no obligue a descargar los años de toda la baraja.
import type { Anios } from '../../compartido/clasico'
import type { Fecha } from '../../compartido/tipos'

export const ANIOS_MUESTRA: Record<string, Fecha> = {
  '001': { anio: -3500, circa: true },
  '010': { anio: -323, circa: false },
  '024': { anio: 1094, circa: false },
  '036': { anio: 1453, circa: false },
  '047': { anio: 1605, circa: false },
  '060': { anio: 1793, circa: false },
  '100': { anio: -2600, circa: true },
  '113': { anio: 80, circa: false },
  '120': { anio: 476, circa: false },
  '137': { anio: 1492, circa: false },
  '139': { anio: 1517, circa: false },
  '150': { anio: 1713, circa: false },
  '190': { anio: -800, circa: true },
  '211': { anio: 1879, circa: false },
  '234': { anio: 750, circa: true },
  '238': { anio: 1522, circa: false },
  '245': { anio: 1633, circa: false },
  '262': { anio: 1903, circa: false },
  '267': { anio: 1928, circa: false },
  '275': { anio: 1980, circa: false },
  '277': { anio: 1997, circa: false },
  '293': { anio: 1944, circa: false },
}

/** Los mismos años con la forma que usan las reglas de clasico.ts. */
export const ANIOS_REGLAS: Anios = Object.fromEntries(Object.entries(ANIOS_MUESTRA).map(([id, f]) => [id, [f.anio, f.circa ? 1 : 0]]))
