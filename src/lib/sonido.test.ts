import { describe, expect, it } from 'vitest'
import indice from '../../public/audio/indice.json'
import { claveAnio, EFECTOS, leerAjustes, trozosCarta, urlAnio, urlCarta, VIBRACION } from './sonido'

const textos = { carta: 'texto de la carta', anio: 'el año dicho' }

describe('sonido: ajuste guardado', () => {
  it('la primera visita (o un ajuste roto) deja todo apagado', () => {
    expect(leerAjustes(null)).toEqual({ efectos: false, voz: false })
    expect(leerAjustes('')).toEqual({ efectos: false, voz: false })
    expect(leerAjustes('{roto')).toEqual({ efectos: false, voz: false })
    expect(leerAjustes('"sí"')).toEqual({ efectos: false, voz: false })
    expect(leerAjustes('{"efectos":"true","voz":1}')).toEqual({ efectos: false, voz: false })
  })
  it('lee los dos interruptores por separado', () => {
    expect(leerAjustes('{"efectos":true}')).toEqual({ efectos: true, voz: false })
    expect(leerAjustes('{"efectos":false,"voz":true}')).toEqual({ efectos: false, voz: true })
  })
})

describe('sonido: clips', () => {
  it('nombra los años como los archivos grabados', () => {
    expect(claveAnio({ anio: 1492, circa: false })).toBe('1492')
    expect(claveAnio({ anio: -2600, circa: true })).toBe('c-2600')
    expect(claveAnio({ anio: -13797000000, circa: false })).toBe('-13797000000')
    expect(urlAnio({ anio: 722, circa: true })).toBe('/audio/anios/c722.mp3')
    expect(urlCarta('047')).toBe('/audio/cartas/047.mp3')
  })
  it('los ocho efectos y la vibración son los acordados', () => {
    expect([...EFECTOS].sort()).toEqual(['apartar', 'asentar', 'barajar', 'deslizar', 'moneda', 'repartir', 'robar', 'voltear'])
    expect(VIBRACION.acierto).toEqual([20])
    expect(VIBRACION.fallo).toEqual([20, 40, 20])
  })
  it('lee la carta y, boca arriba, su año, con clip si lo hay', () => {
    const f = { anio: 1492, circa: false }
    expect(trozosCarta('137', f, indice, textos)).toEqual([
      { url: '/audio/cartas/137.mp3', texto: textos.carta },
      { url: indice.anios.includes('1492') ? '/audio/anios/1492.mp3' : null, texto: textos.anio },
    ])
    expect(trozosCarta('137', null, indice, textos)).toHaveLength(1)
  })
  it('sin clip (la 063) o sin índice, se dice con la voz del sistema', () => {
    expect(trozosCarta('063', null, indice, textos)).toEqual([{ url: null, texto: textos.carta }])
    expect(trozosCarta('001', { anio: 5, circa: true }, null, textos).every((t) => t.url === null)).toBe(true)
  })
})
