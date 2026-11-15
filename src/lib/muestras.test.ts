import { describe, expect, it } from 'vitest'
import anios from '../../compartido/anios.json'
import { ANIOS_MUESTRA } from './muestras'
import { CAPITULOS, NARRACION_TUTORIAL, PASOS_ESCENA, PASOS_TUTORIAL } from './textos'

describe('textos del reglamento y del tutorial', () => {
  it('los años de muestra son los de la baraja', () => {
    for (const [id, f] of Object.entries(ANIOS_MUESTRA)) {
      const [anio, circa] = (anios as unknown as Record<string, [number, number]>)[id]
      expect({ id, anio: f.anio, circa: f.circa }).toEqual({ id, anio, circa: !!circa })
    }
  })
  it('cada portadilla tiene su año', () => {
    for (const c of CAPITULOS) expect(ANIOS_MUESTRA[c.carta], c.id).toBeDefined()
  })
  it('un paso del tutorial y una narración por cada momento de la escena, ocho como mucho', () => {
    expect(PASOS_TUTORIAL.length).toBe(PASOS_ESCENA.length)
    expect(NARRACION_TUTORIAL.length).toBe(PASOS_TUTORIAL.length)
    expect(PASOS_TUTORIAL.length).toBeLessThanOrEqual(8)
  })
  it('la narración se puede decir en voz alta: sin cifras ni símbolos', () => {
    for (const t of NARRACION_TUTORIAL) expect(t).not.toMatch(/[0-9<>«»"/*#&]/)
  })
})
