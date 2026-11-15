// Esperas de la mesa que se pueden saltar con un toque (MENU-15). Una jugada se anima a golpe de
// `espera()`; si alguien toca la mesa, lo que queda se acorta: las pausas de animación terminan ya (o en
// cuanto se cumpla su mínimo, como el veredicto, que se ve al menos 600 ms) y los avisos duran lo justo
// para verse. Sirve igual para la revelación, el fallo que enseña o el reparto (ANIM-7, ANIM-8, ANIM-14).
import { dura } from './movimiento'

export interface Prisa {
  /** Pausa de animación: cero con movimiento reducido, salvo `minimo`, que es para leer (el veredicto). Con prisa,
      termina al cumplir `minimo`. */
  espera(ms: number, minimo?: number): Promise<void>
  /** Tiempo para leer un aviso: no depende del movimiento. Un toque lo cierra (tras `PARA_VER` ms). */
  leer(ms: number): Promise<void>
  /** Un toque: acorta todo lo pendiente y lo que venga hasta `calma()`. */
  apresurar(): void
  /** La jugada ha terminado: las siguientes esperas vuelven a su duración. */
  calma(): void
  readonly activa: boolean
}

/** Lo mínimo que se ve un aviso aunque se toque la pantalla, para que no desaparezca sin leerse. */
const PARA_VER = 400
/** Con la prisa ya puesta, un aviso nuevo dura como mucho esto. */
const AVISO_CON_PRISA = 900

export function crearPrisa(): Prisa {
  let activa = false
  /** Lo que hay que hacer en cada espera pendiente cuando llega un toque. */
  const pendientes = new Set<() => void>()

  function esperar(total: number, alTocar: (transcurrido: number) => number): Promise<void> {
    return new Promise((listo) => {
      const t0 = performance.now()
      let reloj: ReturnType<typeof setTimeout>
      const acabar = () => {
        clearTimeout(reloj)
        pendientes.delete(tocar)
        listo()
      }
      const tocar = () => {
        clearTimeout(reloj)
        reloj = setTimeout(acabar, Math.max(0, alTocar(performance.now() - t0)))
      }
      pendientes.add(tocar)
      reloj = setTimeout(acabar, Math.max(0, total))
    })
  }

  return {
    espera(ms, minimo = 0) {
      // El mínimo es tiempo de lectura (el veredicto), no de animación: se respeta también con movimiento reducido.
      const total = Math.max(dura(ms), Math.min(ms, minimo))
      if (activa) return esperar(Math.min(total, minimo), (t) => Math.min(total, minimo) - t)
      return esperar(total, (t) => Math.min(total, minimo) - t)
    },
    leer(ms) {
      const total = activa ? Math.min(ms, AVISO_CON_PRISA) : ms
      return esperar(total, (t) => PARA_VER - t)
    },
    apresurar() {
      activa = true
      for (const f of [...pendientes]) f()
    },
    calma() {
      activa = false
    },
    get activa() {
      return activa
    },
  }
}

/** Tiempo para leer un aviso de dos niveles: 1 s por cada 3 palabras, más 1 s (A11Y-12). */
export function tiempoDeLectura(...textos: string[]): number {
  const palabras = textos.join(' ').split(/\s+/).filter(Boolean).length
  return Math.round((palabras / 3) * 1000 + 1000)
}
