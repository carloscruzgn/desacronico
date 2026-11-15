// Comportamiento común de las ventanas que tapan la pantalla (reglamento, carta ampliada, final,
// confirmaciones): al abrirse reciben el foco, lo retienen mientras están abiertas, dejan inerte lo de
// detrás y devuelven el foco al cerrarse. El paso en el historial y el Escape van en capas.ts.

const ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

/** Las ventanas abiertas, de la de abajo a la de arriba: solo la de arriba retiene el foco
    (el tutorial abierto desde el reglamento no tiene que pelearse con el reglamento por el Tab). */
const pila: HTMLElement[] = []

/** La ventana de arriba, la única con la que se puede hablar. */
export const dialogoArriba = (): HTMLElement | null => pila[pila.length - 1] ?? null

/** Se puede llegar a él con el Tab: ni oculto, ni dentro de algo inerte, ni en un `details` cerrado. */
function alcanzable(el: HTMLElement): boolean {
  if (el.closest('[inert], [aria-hidden="true"]')) return false
  if (el.tagName !== 'SUMMARY' && el.closest('details:not([open])')) return false
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
}

/** El velo de una ventana (la capa oscura que la cierra al tocarla) no se vuelve inerte: tiene que seguir
    recibiendo el toque. Tampoco lo que no se pinta. */
const respetar = (el: Element) =>
  el.matches('script, style, template, [role="presentation"], .velo') || el.hasAttribute('data-velo')

/** Vuelve inerte todo lo que no es la ventana ni la contiene: los hermanos de cada antepasado, hasta el body.
    Devuelve lo que ha tocado, para devolverlo luego como estaba (lo que ya era inerte no se toca). */
function inertizar(nodo: HTMLElement): HTMLElement[] {
  const tocados: HTMLElement[] = []
  for (let el: HTMLElement | null = nodo; el && el !== document.body; el = el.parentElement) {
    const padre: HTMLElement | null = el.parentElement
    if (!padre) break
    for (const h of Array.from(padre.children) as Element[]) {
      if (h === el || !(h instanceof HTMLElement) || h.inert || respetar(h)) continue
      h.inert = true
      tocados.push(h)
    }
  }
  return tocados
}

export function dialogo(nodo: HTMLElement) {
  const antes = document.activeElement as HTMLElement | null
  const enfocables = () => [...nodo.querySelectorAll<HTMLElement>(ENFOCABLES)].filter(alcanzable)
  pila.push(nodo)
  const inertes = inertizar(nodo)

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
      for (const h of inertes) h.inert = false
      // Se devuelve el foco a donde estaba, salvo que alguien lo haya puesto ya en otro sitio
      // o que aquel elemento ya no se pueda enfocar (un hueco que se ha cerrado).
      const a = document.activeElement
      const sigueAqui = !a || a === document.body || nodo.contains(a)
      if (sigueAqui && antes?.isConnected && antes.tabIndex >= 0 && alcanzable(antes)) antes.focus({ preventScroll: true })
    },
  }
}
