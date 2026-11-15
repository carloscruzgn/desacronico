// Marca un elemento con la clase «visto» la primera vez que entra en pantalla, para que lo que lleva
// dentro se pose, se dibuje o se entinte entonces y no antes. Con movimiento reducido (o sin
// IntersectionObserver) se marca enseguida: todo aparece ya en su estado final.
import { reducido } from './movimiento'

export function alVer(nodo: HTMLElement, umbral = 0.3) {
  if (reducido() || typeof IntersectionObserver === 'undefined') {
    nodo.classList.add('visto')
    return
  }
  const observador = new IntersectionObserver(
    (entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return
      nodo.classList.add('visto')
      observador.disconnect()
    },
    { threshold: umbral },
  )
  observador.observe(nodo)
  return { destroy: () => observador.disconnect() }
}
