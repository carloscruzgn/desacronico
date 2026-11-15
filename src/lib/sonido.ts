// Sonido de mesa y voz (ANIM-6, ANIM-5 y A11Y-11). Un solo ajuste, guardado en este aparato, con dos
// interruptores: efectos (papel y cartulina, más la vibración de refuerzo) y voz (leer cartas y narrar el
// tutorial). En la primera visita, los efectos están encendidos y la voz apagada. Los efectos tienen su volumen. Nada se descarga hasta que hace falta: los efectos,
// la primera vez que suena uno (o al encenderlos); cada clip de voz, cuando se pide. Nada suena con la
// pestaña oculta, nada va en bucle y todo se calla con `callar()`.
//
// Uso (todo es seguro de llamar siempre: si el interruptor está apagado, no hace nada):
//   import { efecto, leerCarta, narrar, callar, vibrar, sonido } from './sonido'
//   efecto('voltear')              barajar · repartir · deslizar · voltear · asentar · apartar · robar · moneda
//   vibrar('acierto' | 'fallo')    [20] y [20, 40, 20]; solo con los efectos encendidos y sin movimiento reducido
//   leerCarta(id, fecha?)          botón «Escuchar»: lee el texto de la carta y, con fecha (boca arriba), su año.
//                                  Lo pide quien lo toca, así que suena aunque la voz esté apagada. Si falta un
//                                  clip (la 063) o no carga, lo dice speechSynthesis en es-ES.
//   narrar(url, texto?)            narración automática (tutorial): solo con la voz encendida. `narrar(null)` calla.
//   callar()                       corta la voz en curso (al cambiar de paso, cerrar una ventana, salir).
//   sonido.efectos, sonido.voz     estado reactivo (vale en plantillas y $derived/$effect de Svelte 5).
//   sonido.hablando                true mientras suena una voz (para un botón «Escuchar»/«Parar»).
//   ponerEfectos(b), ponerVoz(b)   cambian el ajuste y lo guardan. Encender los efectos suena un «voltear».
//   sonido.volumen, ponerVolumen(v) volumen de los efectos, de 0 a 1 (la voz va al volumen del aparato: en iOS
//                                  el de un elemento de audio no se puede cambiar desde la página).
//
// El AudioContext se crea y se desbloquea en un gesto del usuario (iOS lo exige). Los efectos van por Web Audio
// (decodeAudioData de MP3); la voz, por un único HTMLAudioElement que se reutiliza (en iOS no lo calla el
// interruptor de silencio, y una vez tocado en un gesto puede encadenar el clip del año).
import { createSubscriber } from 'svelte/reactivity'
import type { Fecha } from '../../compartido/tipos'
import { anioHablado, porId, textoPlano } from './datos'
import { reducido } from './movimiento'

export const EFECTOS = ['barajar', 'repartir', 'deslizar', 'voltear', 'asentar', 'apartar', 'robar', 'moneda'] as const
export type Efecto = (typeof EFECTOS)[number]

export interface Ajustes {
  efectos: boolean
  voz: boolean
  /** Volumen de los efectos, de 0 a 1. */
  volumen: number
}

export const AJUSTES_INICIALES: Ajustes = { efectos: true, voz: false, volumen: 0.55 }

/** Patrones de vibración: del mismo peso al acertar y al fallar, solo como refuerzo. */
export const VIBRACION = { acierto: [20], fallo: [20, 40, 20] } as const

const CLAVE = 'desacronico.sonido'
const PAUSA_VOZ = 260

// ---- Lógica pura (con pruebas en sonido.test.ts) ------------------------------------------------

/** Lee el ajuste guardado. Lo que falte o sea raro vale lo de la primera visita: efectos sí, voz no. */
export function leerAjustes(texto: string | null | undefined): Ajustes {
  try {
    const a = JSON.parse(texto ?? 'null') as Partial<Ajustes> | null
    const v = a?.volumen
    return {
      efectos: a?.efectos !== false,
      voz: a?.voz === true,
      volumen: typeof v === 'number' && v >= 0 && v <= 1 ? v : AJUSTES_INICIALES.volumen,
    }
  } catch {
    return { ...AJUSTES_INICIALES }
  }
}

/** Nombre del clip de un año: el número, con «c» delante si es aproximado («c-2600», «1492», «-13797000000»). */
export const claveAnio = (f: Fecha) => `${f.circa ? 'c' : ''}${f.anio}`

export const urlEfecto = (e: Efecto) => `/sonido/${e}.mp3`
export const urlCarta = (id: string) => `/audio/cartas/${id}.mp3`
export const urlAnio = (f: Fecha) => `/audio/anios/${claveAnio(f)}.mp3`

export interface Indice {
  cartas: string[]
  anios: string[]
}
/** Un trozo de lo que se lee: el clip grabado, si lo hay, y el texto para speechSynthesis si no. */
export interface Trozo {
  url: string | null
  texto: string
}
/** Lo que se dice al pulsar «Escuchar»: el texto de la carta y, si está boca arriba, su año. */
export function trozosCarta(id: string, fecha: Fecha | null | undefined, indice: Indice | null, textos: { carta: string; anio: string }): Trozo[] {
  const cartas = new Set(indice?.cartas ?? [])
  const anios = new Set(indice?.anios ?? [])
  const t: Trozo[] = [{ url: cartas.has(id) ? urlCarta(id) : null, texto: textos.carta }]
  if (fecha) t.push({ url: anios.has(claveAnio(fecha)) ? urlAnio(fecha) : null, texto: textos.anio })
  return t
}

// ---- Estado reactivo ---------------------------------------------------------------------------

const hayVentana = typeof window !== 'undefined'

function guardado(): Ajustes {
  try {
    return leerAjustes(localStorage.getItem(CLAVE))
  } catch {
    return { ...AJUSTES_INICIALES }
  }
}
const estado: Ajustes = hayVentana ? guardado() : { ...AJUSTES_INICIALES }
let hablando = false

let avisar: (() => void) | null = null
const suscribir = createSubscriber((update) => {
  avisar = update
  return () => (avisar = null)
})
const cambio = () => avisar?.()

/** El ajuste de sonido, reactivo. Para cambiarlo, `ponerEfectos` y `ponerVoz`. */
export const sonido = {
  get efectos() {
    suscribir()
    return estado.efectos
  },
  get voz() {
    suscribir()
    return estado.voz
  },
  get volumen() {
    suscribir()
    return estado.volumen
  },
  get hablando() {
    suscribir()
    return hablando
  },
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado))
  } catch {
    // Sin almacenamiento (modo privado): el ajuste dura lo que la pestaña.
  }
  cambio()
}

export function ponerEfectos(si: boolean) {
  if (estado.efectos === si) return
  estado.efectos = si
  guardar()
  if (si) {
    // Se enciende con un toque: es el momento de crear el contexto y de oír que funciona.
    desbloquear()
    efecto('voltear')
  } else contexto?.suspend().catch(() => {})
}

/** Cambia el volumen de los efectos (0 a 1). Con `probar`, suena un «voltear» para oírlo. */
export function ponerVolumen(v: number, probar = false) {
  v = Math.min(1, Math.max(0, v))
  if (estado.volumen !== v) {
    estado.volumen = v
    if (salida) salida.gain.value = v
    guardar()
  }
  if (probar) efecto('voltear')
}

export function ponerVoz(si: boolean) {
  if (estado.voz === si) return
  estado.voz = si
  guardar()
  if (!si) callar()
}

// ---- Efectos (Web Audio) -----------------------------------------------------------------------

let contexto: AudioContext | null = null
let salida: GainNode | null = null
const buferes = new Map<Efecto, AudioBuffer>()
let cargando: Promise<void> | null = null

const oculta = () => hayVentana && document.visibilityState === 'hidden'

function crearContexto(): AudioContext | null {
  if (contexto) return contexto
  const C = hayVentana ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined
  if (!C) return null
  try {
    contexto = new C()
    salida = contexto.createGain()
    salida.gain.value = estado.volumen
    salida.connect(contexto.destination)
  } catch {
    contexto = null
  }
  return contexto
}

/** En un gesto: crea el contexto (si hay efectos) y lo reanuda. En iOS, además, un búfer mudo lo desbloquea. */
function desbloquear() {
  if (!estado.efectos || oculta()) return
  const c = crearContexto()
  if (!c || c.state === 'running') return
  c.resume().catch(() => {})
  try {
    const b = c.createBufferSource()
    b.buffer = c.createBuffer(1, 1, 22050)
    b.connect(c.destination)
    b.start(0)
  } catch {
    // nada
  }
}

/** Descarga y descodifica los ocho efectos (unos 60 KB en total), una sola vez. */
function cargarEfectos(c: AudioContext): Promise<void> {
  return (cargando ??= Promise.all(
    EFECTOS.map(async (e) => {
      try {
        const r = await fetch(urlEfecto(e))
        if (!r.ok) return
        const datos = await r.arrayBuffer()
        // decodeAudioData con promesa no existe en Safari antiguo: se usa la forma con llamadas.
        const b = await new Promise<AudioBuffer>((ok, mal) => c.decodeAudioData(datos, ok, mal))
        buferes.set(e, b)
      } catch {
        // Un efecto que no carga se queda mudo; los demás siguen.
      }
    }),
  ).then(() => {}))
}

/** Suena un efecto de mesa. Si aún no se ha cargado, se carga y suena solo si llega a tiempo (medio segundo). */
export function efecto(nombre: Efecto) {
  if (!estado.efectos || oculta()) return
  const c = crearContexto()
  if (!c || !salida) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const b = buferes.get(nombre)
  if (b) return tocar(c, b)
  const pedido = performance.now()
  cargarEfectos(c).then(() => {
    const b = buferes.get(nombre)
    if (b && performance.now() - pedido < 500 && estado.efectos && !oculta()) tocar(c, b)
  })
}

function tocar(c: AudioContext, b: AudioBuffer) {
  try {
    const s = c.createBufferSource()
    s.buffer = b
    // Una pizca de variación, para que dos cartas seguidas no suenen idénticas.
    s.playbackRate.value = 0.96 + Math.random() * 0.08
    s.connect(salida!)
    s.start()
  } catch {
    // nada
  }
}

// ---- Vibración ---------------------------------------------------------------------------------

/** Refuerzo táctil al acertar o fallar. Nunca en bucle; no con movimiento reducido ni con los efectos apagados. */
export function vibrar(tipo: keyof typeof VIBRACION) {
  if (!estado.efectos || reducido() || oculta() || typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate([...VIBRACION[tipo]])
  } catch {
    // nada
  }
}

// ---- Voz ---------------------------------------------------------------------------------------

let audio: HTMLAudioElement | null = null
/** Cada lectura nueva sube el turno; lo que llega tarde de una lectura anterior se descarta. */
let turno = 0
let pausa: ReturnType<typeof setTimeout> | undefined
let indice: Promise<Indice | null> | null = null

function cargarIndice(): Promise<Indice | null> {
  return (indice ??= fetch('/audio/indice.json')
    .then((r) => (r.ok ? (r.json() as Promise<Indice>) : null))
    .catch(() => null))
}

function ponerHablando(si: boolean) {
  if (hablando === si) return
  hablando = si
  cambio()
}

/** Corta cualquier voz en curso (clip o speechSynthesis). */
export function callar() {
  turno++
  clearTimeout(pausa)
  if (audio) {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }
  if (hayVentana && 'speechSynthesis' in window) speechSynthesis.cancel()
  ponerHablando(false)
}

let vozEs: SpeechSynthesisVoice | null | undefined
function vozEspanola(): SpeechSynthesisVoice | null {
  if (vozEs) return vozEs
  const voces = speechSynthesis.getVoices()
  vozEs = voces.find((v) => v.lang === 'es-ES') ?? voces.find((v) => v.lang.startsWith('es')) ?? null
  return vozEs
}

/** Dice un texto con la voz del sistema. Resuelve al acabar (o al fallar: sin voz no hay nada que esperar). */
function decir(texto: string, mio: number): Promise<void> {
  return new Promise((listo) => {
    if (!texto || !('speechSynthesis' in window) || mio !== turno) return listo()
    const u = new SpeechSynthesisUtterance(texto)
    u.lang = 'es-ES'
    const v = vozEspanola()
    if (v) u.voice = v
    u.onend = () => listo()
    u.onerror = () => listo()
    speechSynthesis.speak(u)
  })
}

/** Toca un clip por el elemento de audio. Resuelve true si sonó entero, false si no se pudo (y hay que decirlo). */
function sonarClip(url: string, mio: number): Promise<boolean> {
  return new Promise((listo) => {
    audio ??= new Audio()
    const a = audio
    a.preload = 'auto'
    let hecho = false
    const fin = (bien: boolean) => {
      if (hecho) return
      hecho = true
      a.onended = a.onerror = null
      listo(bien)
    }
    a.onended = () => fin(true)
    a.onerror = () => fin(false)
    a.src = url
    a.play().catch((e: unknown) => {
      // Si lo cortó otra lectura (AbortError), no se dice nada; si el navegador no deja o no carga, se dice.
      if (mio !== turno || (e instanceof DOMException && e.name === 'AbortError')) return fin(true)
      fin(false)
    })
  })
}

/** Lee unos trozos uno tras otro, con una pausa breve entre ellos. */
async function leer(trozos: Trozo[], mio: number) {
  ponerHablando(true)
  for (let i = 0; i < trozos.length; i++) {
    if (mio !== turno || oculta()) break
    if (i > 0) await new Promise((r) => (pausa = setTimeout(r, PAUSA_VOZ)))
    if (mio !== turno) break
    const t = trozos[i]
    const sono = t.url ? await sonarClip(t.url, mio) : false
    if (!sono && mio === turno) await decir(t.texto, mio)
  }
  if (mio === turno) ponerHablando(false)
}

/** «Escuchar»: lee la carta y, si se da su fecha (está boca arriba), el año. Suena aunque la voz esté apagada,
    porque lo pide quien pulsa el botón. Pulsar otra vez mientras habla, mejor con `callar()`. */
export async function leerCarta(id: string, fecha?: Fecha | null) {
  callar()
  const mio = turno
  if (oculta()) return
  const carta = porId[id]
  if (!carta) return
  ponerHablando(true)
  const ind = await cargarIndice()
  if (mio !== turno) return
  await leer(trozosCarta(id, fecha, ind, { carta: textoPlano(carta), anio: fecha ? anioHablado(fecha) : '' }), mio)
}

/** Narración automática (el tutorial): solo con la voz encendida. Con `null`, calla. Corta lo que sonara antes. */
export function narrar(url: string | null, texto = '') {
  callar()
  if (!url || !estado.voz || oculta()) return
  void leer([{ url, texto }], turno)
}

// ---- Gestos y pestaña oculta -------------------------------------------------------------------

if (hayVentana) {
  // El primer gesto (y cualquiera después de una interrupción) desbloquea el audio. Solo si hay efectos:
  // con todo apagado no se crea nada.
  for (const ev of ['pointerdown', 'keydown', 'touchend'] as const) addEventListener(ev, desbloquear, { capture: true, passive: true })
  document.addEventListener('visibilitychange', () => {
    if (oculta()) {
      callar()
      contexto?.suspend().catch(() => {})
    }
    // Al volver se reanuda en el siguiente gesto o efecto, no antes.
  })
}
