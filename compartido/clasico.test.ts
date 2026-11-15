import { describe, expect, it } from 'vitest'
import aniosReales from './anios.json'
import { abandonar, cabe, crear, enRonda, jugar, lugarCorrecto, minimoCartas, mismoAnio, OPCIONES, topeValido, siguienteEnEmpezar, vecinas, vistaDe, type Anios, type EstadoClasico } from './clasico'

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
    opciones: { ...OPCIONES },
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
    const e = crear(ids, ['Ana', 'Luis', 'Eva'], OPCIONES, sinAzar)
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

  it('reparte el número de cartas elegido', () => {
    const e = crear(ids, ['Ana', 'Luis'], { cartasIniciales: 6, alFallar: 'descartar' }, sinAzar)
    expect(e.jugadores.map((j) => j.mano.length)).toEqual([6, 6])
    expect(() => crear(ids, ['Ana'], { cartasIniciales: 1, alFallar: 'descartar' })).toThrow()
    expect(minimoCartas(3, 6)).toBe(20)
  })

  it('con la opción de recolocar, la carta fallada queda en su sitio y se roba igual', () => {
    const inicio = estado([['a1015', 'a1001'], ['a1002']], ['a1005', 'a1010', 'a1020'], ['a1030'])
    inicio.opciones.alFallar = 'recolocar'
    expect(lugarCorrecto(inicio.cronologia, anios, 'a1015')).toBe(2)
    const { estado: e, resultado: r } = jugar(inicio, anios, 'a1015', 0)
    expect(r.acierto).toBe(false)
    expect(r.recolocada).toBe(2)
    expect(e.cronologia).toEqual(['a1005', 'a1010', 'a1015', 'a1020'])
    expect(e.descartes).toEqual([])
    expect(e.jugadores[0].mano).toEqual(['a1001', 'a1030'])
    expect(e.jugadores[0].fallos).toBe(1)
  })

  it('quien abandona en su turno pasa el turno y sus cartas van a los descartes', () => {
    const inicio = estado([['a1015'], ['a1002', 'a1003'], ['a1004']], ['a1010'])
    const { estado: e } = abandonar(inicio, 0)
    expect(e.jugadores[0].eliminado).toBe(true)
    expect(e.descartes).toEqual(['a1015'])
    expect(e.turno).toBe(1)
    // Abandona el último de la ronda cuando le toca: se cierra la ronda y sigue el primero activo.
    let f = estado([['a1015', 'a1016'], ['a1002', 'a1003']], ['a1010'])
    ;({ estado: f } = jugar(f, anios, 'a1015', 1))
    const { estado: g, cierre } = abandonar(f, 1)
    expect(cierre.finRonda).toBe(true)
    expect(g.turno).toBe(0)
    expect(g.ronda).toBe(2)
    // Fuera de su turno no cambia a quién le toca.
    expect(abandonar(inicio, 2).estado.turno).toBe(0)
  })

  it('la vista para los jugadores no lleva el orden del mazo', () => {
    const v = vistaDe(crear(ids, ['Ana'], OPCIONES, sinAzar))
    expect('mazo' in v).toBe(false)
    expect(v.nMazo).toBe(ids.length - 5)
  })

  it('un solo jugador gana al vaciar la mano', () => {
    const { estado: e } = jugar(estado([['a1015']], ['a1010']), anios, 'a1015', 1)
    expect(e.ganadores).toEqual([0])
  })

  it('dice entre qué cartas iba una carta fallada', () => {
    const c = ['a1005', 'a1010', 'a1020']
    expect(vecinas(c, anios, 'a1015')).toEqual(['a1010', 'a1020'])
    expect(vecinas(c, anios, 'a1001')).toEqual([null, 'a1005'])
    expect(vecinas(c, anios, 'a1030')).toEqual(['a1020', null])
  })

  it('reconoce el acierto por la regla del mismo año', () => {
    const c = ['a1005', 'a1010']
    const iguales: Anios = { ...anios, otra: [1010, 0] }
    expect(mismoAnio(c, iguales, 'otra', 1)).toBe('a1010')
    expect(mismoAnio(c, iguales, 'otra', 2)).toBe('a1010')
    expect(mismoAnio(c, anios, 'a1007', 1)).toBeNull()
  })

  it('la partida recuerda con qué series se hizo el mazo', () => {
    const e = crear(ids, ['Ana', 'Luis'], { ...OPCIONES, series: ['social', 'coria'] }, sinAzar)
    expect(vistaDe(e).opciones.series).toEqual(['social', 'coria'])
  })

  it('el Big Bang y el Sistema Solar van antes que el Homo sapiens', () => {
    const reales = aniosReales as unknown as Anios
    const sapiens = Object.keys(reales).find((id) => reales[id][0] === -300000)!
    expect(sapiens).toBeDefined()
    expect(cabe([sapiens], reales, '219', 0)).toBe(true)
    expect(cabe([sapiens], reales, '220', 0)).toBe(true)
    expect(cabe([sapiens], reales, '219', 1)).toBe(false)
    expect(lugarCorrecto(['219', sapiens], reales, '220')).toBe(1)
  })

  it('quién empieza: por sorteo, o el que se pide', () => {
    const nombres = ['Ana', 'Luis', 'Eva']
    // sinAzar da 0,999999: el sorteo cae en el último.
    const e = crear(ids, nombres, OPCIONES, sinAzar)
    expect([e.turno, e.inicial]).toEqual([2, 2])
    const f = crear(ids, nombres, OPCIONES, () => 0)
    expect(f.turno).toBe(0)
    const g = crear(ids, nombres, OPCIONES, sinAzar, 1)
    expect([g.turno, g.inicial]).toEqual([1, 1])
    expect(siguienteEnEmpezar(2, 3)).toBe(0)
    expect(siguienteEnEmpezar(0, 3)).toBe(1)
  })

  it('recuerda las cartas falladas de cada jugador', () => {
    let e = estado([['a1015', 'a1001'], ['a1002', 'a1003']], ['a1010'], ['a1030', 'a1031'])
    ;({ estado: e } = jugar(e, anios, 'a1015', 0)) // falla
    ;({ estado: e } = jugar(e, anios, 'a1002', 0)) // acierta
    ;({ estado: e } = jugar(e, anios, 'a1001', 2)) // falla
    expect(e.jugadores[0].falladas).toEqual(['a1015', 'a1001'])
    expect(e.jugadores[1].falladas ?? []).toEqual([])
  })

  it('avisa cuando baraja los descartes', () => {
    const inicio = estado([['a1015', 'a1001'], ['a1002']], ['a1010'])
    inicio.descartes = ['a1033']
    expect(jugar(inicio, anios, 'a1015', 0, sinAzar).resultado.barajado).toBe(true)
    const conMazo = estado([['a1015', 'a1001'], ['a1002']], ['a1010'], ['a1030'])
    expect(jugar(conMazo, anios, 'a1015', 0).resultado.barajado).toBeFalsy()
  })

  it('cuenta la ronda: quién abre, quién falta y quién se desempata', () => {
    let e = estado([['a1015'], ['a1002'], ['a1003', 'a1004']], ['a1010'], ['a1030', 'a1031', 'a1032'])
    expect(enRonda(e)).toEqual({ abre: 0, faltan: [0, 1, 2], sinCartas: [] })
    ;({ estado: e } = jugar(e, anios, 'a1015', 1))
    expect(enRonda(e)).toEqual({ abre: 0, faltan: [1, 2], sinCartas: [0] })
    ;({ estado: e } = jugar(e, anios, 'a1002', 0))
    ;({ estado: e } = jugar(e, anios, 'a1003', 1))
    expect(e.desempate).toEqual([0, 1])
    expect(enRonda(e)).toEqual({ abre: 0, faltan: [0, 1], sinCartas: [] })
    // Si el jugador inicial queda fuera, abre el siguiente que sigue en juego.
    const f = estado([['a1015'], ['a1002'], ['a1003']], ['a1010'])
    f.jugadores[0].eliminado = true
    f.turno = 1
    expect(enRonda(f).abre).toBe(1)
  })

  describe('cronología completa', () => {
    const conTope = (manos: string[][], tope: number | undefined) => {
      const e = estado(manos, ['a1010', 'a1020', 'a1025', 'a1030'], ['a1035', 'a1036'])
      e.opciones.topeCronologia = tope
      return e
    }

    it('al cerrar la ronda con el tope, gana quien tenga menos cartas', () => {
      let e = conTope([['a1015', 'a1016'], ['a1001', 'a1003']], 5)
      let r
      ;({ estado: e, resultado: r } = jugar(e, anios, 'a1015', 1))
      expect(r.ganadores).toEqual([]) // ya hay cinco cartas, pero la ronda no ha terminado
      ;({ estado: e, resultado: r } = jugar(e, anios, 'a1003', 2)) // falla y roba
      expect(r.finRonda).toBe(true)
      expect(r.completa).toBe(true)
      expect(e.completa).toBe(true)
      expect(e.ganadores).toEqual([0])
    })

    it('con las mismas cartas, comparten la victoria', () => {
      let e = conTope([['a1015', 'a1016'], ['a1001', 'a1003']], 5)
      ;({ estado: e } = jugar(e, anios, 'a1015', 1))
      ;({ estado: e } = jugar(e, anios, 'a1001', 0))
      expect(e.ganadores).toEqual([0, 1])
    })

    it('los que acaban a la vez con el tope comparten la victoria sin desempatar', () => {
      let e = conTope([['a1015'], ['a1001'], ['a1002', 'a1003']], 5)
      ;({ estado: e } = jugar(e, anios, 'a1015', 1))
      ;({ estado: e } = jugar(e, anios, 'a1001', 0))
      ;({ estado: e } = jugar(e, anios, 'a1002', 1))
      expect(e.ganadores).toEqual([0, 1])
      expect(e.completa).toBe(true)
    })

    it('quien es el único en acabar gana como siempre, aunque se llegue al tope', () => {
      let e = conTope([['a1015'], ['a1001', 'a1003']], 5)
      ;({ estado: e } = jugar(e, anios, 'a1015', 1))
      ;({ estado: e } = jugar(e, anios, 'a1001', 0))
      expect(e.ganadores).toEqual([0])
      expect(e.completa).toBeUndefined()
    })

    it('las partidas guardadas sin tope siguen sin él', () => {
      let e = conTope([['a1015', 'a1016'], ['a1001', 'a1003']], undefined)
      ;({ estado: e } = jugar(e, anios, 'a1015', 1))
      ;({ estado: e } = jugar(e, anios, 'a1001', 0))
      expect(e.ganadores).toEqual([])
    })

    it('el tope va de 15 a 60; si no vale, 30', () => {
      expect([topeValido(15), topeValido(60), topeValido(45)]).toEqual([15, 60, 45])
      expect([topeValido(10), topeValido(61), topeValido('x'), topeValido(undefined)]).toEqual([30, 30, 30, 30])
      expect(crear(ids, ['Ana', 'Luis'], { cartasIniciales: 4, alFallar: 'descartar' }, sinAzar).opciones.topeCronologia).toBe(30)
    })
  })
})
