// Comportamiento común de las ventanas que tapan la pantalla (reglamento, carta ampliada, final,
// confirmaciones): al abrirse reciben el foco, lo retienen mientras están abiertas y lo devuelven al cerrarse.

const ENFOCABLES = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function dialogo(nodo: HTMLElement) {
  const antes = document.activeElement as HTMLElement | null
  const enfocables = () => [...nodo.querySelectorAll<HTMLElement>(ENFOCABLES)]

  const inicial = nodo.querySelector<HTMLElement>('[data-foco]') ?? enfocables()[0] ?? nodo
  inicial.focus({ preventScroll: true })

  function tecla(e: KeyboardEvent) {
    if (e.key !== 'Tab') return
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
      if (antes?.isConnected) antes.focus({ preventScroll: true })
    },
  }
}
