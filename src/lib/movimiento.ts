// Quien pide menos movimiento en su sistema no ve vuelos ni deslizamientos: las cosas aparecen en su sitio.
const consulta = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null

export const reducido = () => !!consulta?.matches

/** Duración de una animación: cero con movimiento reducido. */
export const dura = (ms: number) => (reducido() ? 0 : ms)

export const desplazamiento = (): ScrollBehavior => (reducido() ? 'auto' : 'smooth')
