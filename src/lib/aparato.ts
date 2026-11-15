// Cómo se llama el aparato y cómo se señala en él: «toca» con el dedo, «pulsa» con el ratón.
// Un móvil es un aparato con el lado corto de menos de 600 px; una tableta o la pizarra del aula no lo son.

const consulta = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches

/** Se señala con el dedo (la pantalla táctil es el puntero principal). */
export const conDedo = () => consulta('(pointer: coarse)')

/** «toca» o «pulsa», según el puntero. */
export const toca = () => (conDedo() ? 'toca' : 'pulsa')
/** «Toca» o «Pulsa», para empezar una frase. */
export const Toca = () => (conDedo() ? 'Toca' : 'Pulsa')

/** «móvil», «ordenador» o «pantalla» (una tableta o una pizarra digital). */
export function aparato(): 'móvil' | 'ordenador' | 'pantalla' {
  const corto = typeof screen === 'object' ? Math.min(screen.width, screen.height) : 1000
  if (corto < 600) return 'móvil'
  return conDedo() ? 'pantalla' : 'ordenador'
}

/** «este móvil», «este ordenador», «esta pantalla». */
export const esteAparato = () => {
  const a = aparato()
  return a === 'pantalla' ? 'esta pantalla' : `este ${a}`
}
