// Comportamiento común de las ventanas que tapan la pantalla (reglamento, carta ampliada, final,
// confirmaciones): al abrirse reciben el foco, lo retienen mientras están abiertas y lo devuelven al cerrarse.

const ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

/** Las ventanas abiertas, de la de abajo a la de arriba: solo la de arriba retiene el foco
    (el tutorial abierto desde el reglamento no tiene que pelearse con el reglamento por el Tab). */
const pila: HTMLElement[] = []

/** Se puede llegar a él con el Tab: ni oculto, ni dentro de algo inerte, ni en un `details` cerrado. */
function alcanzable(el: HTMLElement): boolean {
  if (el.closest('[inert], [aria-hidden="true"]')) return false
  if (el.tagName !== 'SUMMARY' && el.closest('details:not([open])')) return false
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
}

export function dialogo(nodo: HTMLElement) {
  const antes = document.activeElement as HTMLElement | null
  const enfocables = () => [...nodo.querySelectorAll<HTMLElement>(ENFOCABLES)].filter(alcanzable)
  pila.push(nodo)

  const inicial = nodo.querySelector<HTMLElement>('[data-foco]') ?? enfocables()[0] ?? nodo
  inicial.focus({ preventScroll: true })

  function tecla(e: KeyboardEvent) {
    if (e.key !== 'Tab' || pila[pila.length - 1] !== nodo) return
    const lista = enfocables()
    if (!lista.length) return e.preventDefault()
    const primero = lista[0]
    const ultimo = lista[lista.length - 1]
    const actual = document.activeElement
    if (!nodo.contains(actual)) {
      e.preventDefault()
      primero.focus()
    } else if (e.shiftKey && actual === primero) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && actual === ultimo) {
      e.preventDefault()
      primero.focus()
    }
  }
  document.addEventListener('keydown', tecla)

  return {
    destroy() {
      document.removeEventListener('keydown', tecla)
      const i = pila.lastIndexOf(nodo)
      if (i >= 0) pila.splice(i, 1)
      // Se devuelve el foco a donde estaba, salvo que alguien lo haya puesto ya en otro sitio
      // o que aquel elemento ya no se pueda enfocar (un hueco que se ha cerrado).
      const a = document.activeElement
      const sigueAqui = !a || a === document.body || nodo.contains(a)
      if (sigueAqui && antes?.isConnected && antes.tabIndex >= 0 && alcanzable(antes)) antes.focus({ preventScroll: true })
    },
  }
}
