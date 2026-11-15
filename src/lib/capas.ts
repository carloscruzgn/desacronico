// Capas: las ventanas que se abren encima de una pantalla (reglamento, tutorial, avatares, QR, confirmaciones,
// menú de la partida…). Cada capa apunta un paso en el historial, así que el botón «atrás» del móvil cierra
// la de arriba en vez de sacar de la web. La X y Escape hacen lo mismo que «atrás». Mientras hay una capa,
// lo de detrás es inerte (dialogo.ts) y Escape se atiende aquí, en un solo sitio.
//
// Uso:
// - En el marcado: `<div role="dialog" use:capa={() => (abierta = false)}>`. La función es lo que hay que
//   hacer para cerrarla (poner a falso el estado que la pinta). Para el botón de cerrar: `onclick={cerrarCapa}`,
//   que cierra la de arriba y quita su paso del historial. Si la capa se cierra por otra vía (el estado cambia
//   y el bloque desaparece), el paso se quita solo al desmontarse, pero conviene cerrar con cerrarCapa:
//   así el historial se pone al día al instante y no al acabar la transición de salida.
//   Con `use:capa={{ cerrar, escape: false }}` Escape no la cierra (la capa atiende su propio Escape).
// - Desde el código, para un componente que ya trae su propio diálogo (Reglas, Tutorial, Confirmar):
//   `const c = abrirCapa(() => (reglas = false))` al abrirlo y `c.cerrar()` en su `oncerrar`.
// - Pantallas: `apuntar({ dentro: true })` al entrar en una pantalla desde el menú y `volverAtras(1)` para
//   volver al menú (cierra antes las capas que haya). `guardiaAtras(fn)`: lo que hace una pantalla cuando
//   «atrás» la va a dejar sin ninguna capa abierta (la mesa abre su menú; la sala libera el asiento).
import { dialogo, dialogoArriba } from './dialogo'

/** Lo que se guarda en cada paso del historial. */
export interface Paso {
  /** Fuera del menú de inicio (una pantalla con su propio paso). */
  dentro?: boolean
  /** Capas abiertas en este paso. */
  capas?: number
  [clave: string]: unknown
}

interface Registro {
  cerrar: () => void
  nodo: HTMLElement | null
  escape: boolean
}

export interface Capa {
  /** Cierra la capa como si se pulsara «atrás». Se puede llamar más de una vez. */
  cerrar(): void
  readonly abierta: boolean
}

export interface OpcionesCapa {
  cerrar: () => void
  /** Escape la cierra (sí, salvo que se diga otra cosa). */
  escape?: boolean
}

const capas: Registro[] = []

// Los pasos que hay que deshacer se juntan y se deshacen de una vez (history.go(-n)) al final de la tarea:
// cerrar dos capas y volver al menú en el mismo toque es un solo viaje por el historial.
let deuda = 0
let programado = false
/** Viajes por el historial pedidos desde aquí cuyo popstate aún no ha llegado. */
let propios = 0
/** Paso que hay que escribir al llegar (apuntar con más de un paso por deshacer). */
let alLlegar: Paso | null = null

const estado = (): Paso => (history.state as Paso | null) ?? {}

function retroceder(n: number) {
  if (n <= 0) return
  deuda += n
  if (programado) return
  programado = true
  queueMicrotask(() => {
    programado = false
    if (deuda <= 0) return
    const n = deuda
    deuda = 0
    propios++
    history.go(-n)
  })
}

/** Apunta un paso nuevo en el historial. Si hay pasos pendientes de deshacer, se aprovecha el de arriba
    (cerrar el tutorial e ir a preparar una partida deja un solo paso, no dos). */
export function apuntar(paso: Paso) {
  const p = { capas: capas.length, ...paso }
  if (deuda === 0) history.pushState(p, '')
  else if (deuda === 1) {
    deuda = 0
    history.replaceState(p, '')
  } else {
    deuda--
    alLlegar = p
  }
}

/** Quita las capas desde la posición `i` (la de arriba primero) y les pide que se cierren. */
function quitarDesde(i: number, salvo?: Registro) {
  while (capas.length > i) {
    const r = capas.pop()!
    if (r !== salvo) r.cerrar()
  }
}

function registrar(r: Registro): Registro {
  capas.push(r)
  apuntar({ dentro: !!estado().dentro, capas: capas.length })
  return r
}

function cerrarRegistro(r: Registro, llamar = true) {
  const i = capas.indexOf(r)
  if (i < 0) return
  const k = capas.length - i
  quitarDesde(i, llamar ? undefined : r)
  retroceder(k)
}

/** Abre una capa sin marcado propio: para componentes que ya traen su diálogo (Reglas, Tutorial, Confirmar).
    Escape no la cierra salvo que se pida: esos componentes atienden su propio Escape y llaman a `cerrar`. */
export function abrirCapa(cerrar: () => void, { escape = false }: { escape?: boolean } = {}): Capa {
  const r = registrar({ cerrar, nodo: null, escape })
  return {
    cerrar: () => cerrarRegistro(r),
    get abierta() {
      return capas.includes(r)
    },
  }
}

/** Acción para el elemento del diálogo: foco retenido, fondo inerte, paso en el historial y Escape. */
export function capa(nodo: HTMLElement, op: OpcionesCapa | (() => void)) {
  const leer = (o: OpcionesCapa | (() => void)) => (typeof o === 'function' ? { cerrar: o, escape: true } : { cerrar: o.cerrar, escape: o.escape ?? true })
  const d = dialogo(nodo)
  const r = registrar({ ...leer(op), nodo })
  return {
    update(o: OpcionesCapa | (() => void)) {
      Object.assign(r, leer(o))
    },
    destroy() {
      // Si se cierra sin pasar por cerrarCapa (el estado cambió por otra vía), su paso se quita ahora.
      cerrarRegistro(r, false)
      d.destroy()
    },
  }
}

/** Cierra la capa de arriba: lo que hacen la X y Escape. */
export function cerrarCapa() {
  const r = capas[capas.length - 1]
  if (r) cerrarRegistro(r)
}

export const hayCapas = () => capas.length > 0

/** Vuelve `pasos` pantallas atrás, cerrando antes todas las capas abiertas. */
export function volverAtras(pasos: number) {
  const n = capas.length
  quitarDesde(0)
  retroceder(n + pasos)
}

const guardias: (() => boolean)[] = []
/** Lo que hace una pantalla cuando «atrás» la va a dejar sin capas abiertas. Si devuelve true, se queda
    (y vuelve a apuntar su paso). La última registrada pregunta primero. Devuelve la función para quitarla. */
export function guardiaAtras(fn: () => boolean): () => void {
  guardias.push(fn)
  return () => {
    const i = guardias.lastIndexOf(fn)
    if (i >= 0) guardias.splice(i, 1)
  }
}
/** Pregunta a las pantallas si «atrás» las deja salir. */
export function quedarse(): boolean {
  for (let i = guardias.length - 1; i >= 0; i--) if (guardias[i]()) return true
  return false
}

let oyente: ((paso: Paso, propio: boolean) => void) | null = null
/** Para App: qué hacer con un «atrás» una vez cerradas las capas. `propio` dice si lo pidió la propia web
    (volverAtras) o el usuario (botón o gesto «atrás» del navegador). */
export function alVolver(fn: (paso: Paso, propio: boolean) => void) {
  oyente = fn
}

if (typeof window !== 'undefined') {
  // Al recargar con una capa abierta, el paso guardado dice que hay capas que ya no están.
  if (estado().capas) history.replaceState({ ...estado(), capas: 0 }, '')

  addEventListener('popstate', () => {
    const propio = propios > 0
    if (propio) propios--
    if (alLlegar) {
      history.replaceState(alLlegar, '')
      alLlegar = null
      return
    }
    const n = estado().capas ?? 0
    // «Atrás» con capas abiertas: se cierra la de arriba (o las que sobren). Si el paso al que se llega es
    // de la misma pantalla, App no hace nada más.
    if (capas.length > n) quitarDesde(n)
    // «Adelante» hacia una capa que ya se cerró: se deshace.
    else if (capas.length < n) return retroceder(n - capas.length)
    oyente?.(estado(), propio)
  })

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return
    const r = capas[capas.length - 1]
    // Solo si la de arriba atiende Escape y no hay encima otra ventana que no sea capa.
    if (!r?.escape || (r.nodo && dialogoArriba() !== r.nodo)) return
    e.preventDefault()
    e.stopImmediatePropagation()
    cerrarRegistro(r)
  })
}
