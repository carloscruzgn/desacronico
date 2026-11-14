import { describe, expect, it } from 'vitest'
import { cabe, crear, jugar, minimoCartas, type Anios, type EstadoClasico } from './clasico'

// Cartas «a1900»… cuyo año va en el propio id.
const anios: Anios = {}
const ids: string[] = []
for (let a = 1000; a < 1040; a++) {
  ids.push('a' + a)
  anios['a' + a] = [a, 0]
}
const sinAzar = () => 0.999999 // barajar deja la lista como está

function estado(manos: string[][], cronologia: string[], mazo: string[] = []): EstadoClasico {
  return {
    modo: 'clasico',
    mazo,
    descartes: [],
    cronologia,
    jugadores: manos.map((mano, i) => ({ nombre: 'J' + i, mano, eliminado: false, aciertos: 0, fallos: 0 })),
    turno: 0,
    inicial: 0,
    ronda: 1,
    ganadores: [],
  }
}

describe('modo clásico', () => {
  it('reparte cuatro cartas a cada jugador y abre la cronología', () => {
    const e = crear(ids, ['Ana', 'Luis', 'Eva'], sinAzar)
    expect(e.jugadores.map((j) => j.mano.length)).toEqual([4, 4, 4])
    expect(e.cronologia).toHaveLength(1)
    expect(e.mazo).toHaveLength(ids.length - 13)
    expect(() => crear(ids.slice(0, minimoCartas(3) - 1), ['Ana', 'Luis', 'Eva'])).toThrow()
  })

  it('acepta la carta entre sus vecinas y el mismo año a cualquier lado', () => {
    const c = ['a1010', 'a1020']
    expect(cabe(c, anios, 'a1015', 1)).toBe(true)
    expect(cabe(c, anios, 'a1015', 0)).toBe(false)
    expect(cabe(c, anios, 'a1015', 2)).toBe(false)
    const iguales: Anios = { ...anios, otra: [1010, 0] }
    expect(cabe(c, iguales, 'otra', 0)).toBe(true)
    expect(cabe(c, iguales, 'otra', 1)).toBe(true)
  })

  it('el acierto deja la carta en la cronología y pasa el turno', () => {
    const { estado: e, resultado: r } = jugar(estado([['a1015', 'a1001'], ['a1002', 'a1003']], ['a1010']), anios, 'a1015', 1)
    expect(r.acierto).toBe(true)
    expect(e.cronologia).toEqual(['a1010', 'a1015'])
    expect(e.jugadores[0].mano).toEqual(['a1001'])
    expect(e.turno).toBe(1)
  })

  it('el fallo descarta la carta y hace robar', () => {
    const { estado: e, resultado: r } = jugar(estado([['a1015', 'a1001'], ['a1002']], ['a1010'], ['a1030']), anios, 'a1015', 0)
    expect(r.acierto).toBe(false)
    expect(r.robada).toBe('a1030')
    expect(e.descartes).toEqual(['a1015'])
    expect(e.jugadores[0].mano).toEqual(['a1001', 'a1030'])
    expect(e.cronologia).toEqual(['a1010'])
  })

  it('con el mazo agotado baraja los descartes', () => {
    const inicio = estado([['a1015', 'a1001'], ['a1002']], ['a1010'])
    inicio.descartes = ['a1033']
    const { estado: e, resultado: r } = jugar(inicio, anios, 'a1015', 0, sinAzar)
    expect(r.robada).not.toBeNull()
    expect(e.jugadores[0].mano).toHaveLength(2)
    expect(e.mazo.length + e.descartes.length).toBe(1)
  })

  it('gana quien es el único en colocar su última carta en la ronda', () => {
    let e = estado([['a1015'], ['a1002', 'a1003']], ['a1010'])
    let r
    ;({ estado: e, resultado: r } = jugar(e, anios, 'a1015', 1))
    expect(r.ganadores).toEqual([]) // la ronda no ha terminado: falta el segundo jugador
    ;({ estado: e, resultado: r } = jugar(e, anios, 'a1002', 0))
    expect(r.finRonda).toBe(true)
    expect(e.ganadores).toEqual([0])
    expect(() => jugar(e, anios, 'a1003', 0)).toThrow()
  })

  it('si acaban dos a la vez, el resto queda eliminado y los empatados roban', () => {
    let e = estado([['a1015'], ['a1002'], ['a1003', 'a1004']], ['a1010'], ['a1030', 'a1031', 'a1032'])
    let r
    ;({ estado: e } = jugar(e, anios, 'a1015', 1))
    ;({ estado: e } = jugar(e, anios, 'a1002', 0))
    ;({ estado: e, resultado: r } = jugar(e, anios, 'a1003', 1))
    expect(r.eliminados).toEqual([2])
    expect(r.desempate.map((d) => d.jugador)).toEqual([0, 1])
    expect(e.jugadores.map((j) => j.mano.length)).toEqual([1, 1, 1])
    expect(e.jugadores[2].eliminado).toBe(true)
    expect(e.ronda).toBe(2)
    expect(e.turno).toBe(0)
    // En el desempate el eliminado ya no juega: tras el jugador 1 se cierra la ronda.
    ;({ estado: e } = jugar(e, anios, e.jugadores[0].mano[0], 0)) // falla: a1030 no va antes de a1002
    ;({ estado: e, resultado: r } = jugar(e, anios, e.jugadores[1].mano[0], e.cronologia.length))
    expect(r.finRonda).toBe(true)
    expect(e.ganadores).toEqual([1])
  })

  it('un solo jugador gana al vaciar la mano', () => {
    const { estado: e } = jugar(estado([['a1015']], ['a1010']), anios, 'a1015', 1)
    expect(e.ganadores).toEqual([0])
  })
})
