// Instalar la web como app, sin pasar por ninguna tienda.
// - Chrome y Edge (Android y ordenador) avisan con `beforeinstallprompt` de que se puede instalar: se guarda el
//   aviso y el enlace de la portada lo lanza, y sale el diálogo propio del navegador. Llega una vez y pronto, así
//   que este módulo se carga desde main.ts, antes que la portada.
// - En iPhone y iPad no hay aviso: Safari solo lo hace a mano (Compartir → Añadir a pantalla de inicio), y el
//   enlace abre una guía con esos pasos. Safari no sabe si ya se añadió, así que ahí el enlace sigue saliendo
//   en el navegador (Carlos: no molesta).
// - Abierta ya como app (desde el icono), no sale nada.

interface AvisoInstalar extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const comoApp = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
/** iPhone, iPod o iPad (el iPad se presenta como un Mac, pero con pantalla táctil). */
const enApple = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

let aviso: AvisoInstalar | null = null

export const instalacion = $state({
  /** El navegador puede instalarla con su propio diálogo. */
  directa: false,
  /** iPhone o iPad: se instala a mano, con la guía. */
  aMano: false,
})

if (typeof window !== 'undefined' && !comoApp()) {
  instalacion.aMano = enApple()
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    aviso = e as AvisoInstalar
    instalacion.directa = true
  })
  addEventListener('appinstalled', () => {
    aviso = null
    instalacion.directa = false
  })
}

/** Lanza el diálogo de instalar del navegador. Si se rechaza, el aviso ya no sirve: el navegador manda otro más
    adelante, si quiere. */
export async function instalarDirecta() {
  const a = aviso
  if (!a) return
  aviso = null
  instalacion.directa = false
  await a.prompt()
}
