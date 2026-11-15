<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { flip } from 'svelte/animate'
  import { cubicOut } from 'svelte/easing'
  import { crossfade, fade, fly, scale } from 'svelte/transition'
  import { enRonda, mismoAnio, vecinas, type Anios, type VistaClasico } from '../../compartido/clasico'
  import { AMBITOS, eraDe, type Fecha } from '../../compartido/tipos'
  import Ampliada from './Ampliada.svelte'
  import Carta from './Carta.svelte'
  import type { Controlador, Suceso } from './control'
  import { anioHablado, anioTexto, cuentaPorAmbito, enLista, enMillones, porId, textoPlano } from './datos'
  import BotonIcono from './BotonIcono.svelte'
  import Confirmar from './Confirmar.svelte'
  import { abrirCapa, capa, cerrarCapa, guardiaAtras, type Capa } from './capas'
  import { Toca, toca } from './aparato'
  import ListaCrono from './ListaCrono.svelte'
  import { desplazamiento, dura } from './movimiento'
  import Marca from './Marca.svelte'
  import Mazo from './Mazo.svelte'
  import Moneda from './Moneda.svelte'
  import { crearPrisa, tiempoDeLectura } from './prisa'
  import Reglas from './Reglas.svelte'
  import TiraAnios from './TiraAnios.svelte'

  interface Props {
    control: Controlador
    onsalir: () => void
    /** Empezar otra partida. Sin ella (en línea, si no eres el anfitrión) solo se puede esperar. */
    onotra?: () => void
    /** Volver a preparar la partida (otros jugadores u otro mazo). Solo en local. */
    oncambiar?: () => void
  }
  let { control, onsalir, onotra, oncambiar }: Props = $props()

  interface Pieza {
    id: string
    volteada: boolean
    marca: '' | 'ok' | 'fallo'
  }

  // svelte-ignore state_referenced_locally
  // `control.anfitrion` y `control.aLaSala` no se copian: en línea cambian si el anfitrión se desconecta.
  const { asiento, inicial } = control
  /** Jugador cuya mano se enseña: la propia en línea; la de quien tiene el turno si el dispositivo es de todos. */
  const manoDe = (v: VistaClasico) => (typeof asiento === 'number' ? asiento : v.turno)

  // `vista` es la partida según el servidor o las reglas; lo demás es lo que se ve en la mesa,
  // que va por detrás mientras duran las animaciones de cada jugada.
  let vista = $state.raw(inicial.vista)
  let conectados = $state.raw(inicial.conectados ?? null)
  let crono = $state<Pieza[]>([])
  let mano = $state<string[]>([])
  let visible = $state(manoDe(inicial.vista))
  let cuentas = $state(inicial.vista.jugadores.map((j) => j.mano.length))
  let nMazo = $state(inicial.vista.nMazo)
  /** Todas las cartas descartadas, de la primera a la última: la pila enseña la última y la lista, todas. */
  let descartes = $state<string[]>([...inicial.vista.descartes])
  let fechas = $state<Record<string, Fecha>>({})
  let seleccionada = $state<string | null>(null)
  let ocupado = $state(true)
  /**
   * Un aviso en la franja de la leyenda, sin tapar la cronología (UI-6, ANIM-9, INFO-8). El de turno es una cinta de
   * papel con la moneda del jugador («Turno de» y el nombre); los excepcionales llevan un título corto y una línea
   * de detalle («¡Desempate!» / «Ana y Benito roban una carta»).
   */
  interface Aviso {
    titulo: string
    /** Delante del título, en cursiva: «Turno de», «Empieza». */
    antes?: string
    detalle?: string
    /** Jugador cuya moneda lleva la cinta. */
    jugador?: number
  }
  let aviso = $state<Aviso | null>(null)
  let ampliada = $state<{ id: string; reverso: boolean } | null>(null)
  let fin = $state<number[] | null>(null)
  let verFin = $state(false)
  let verLista = $state(false)
  let pestanaLista = $state<'cronologia' | 'descartes'>('cronologia')
  interface Veredicto {
    tipo: 'ok' | 'fallo' | 'recoloca'
    titulo: string
    /** Segunda parte del título, en letra de interfaz: «es de 1518, iba entre 1304 y 1639». */
    sub?: string
    /** Debajo del título: dónde iba la carta, qué pasa con ella, la regla del mismo año… */
    detalle: string
    /** Aclaraciones de la fecha: la «c.» o un año antes de Cristo. */
    notas: string[]
  }
  /** Lo que dice la mesa mientras se resuelve una jugada. */
  let veredicto = $state<Veredicto | null>(null)
  /** La jugada anterior, para que quien juega después sepa qué ha pasado. */
  let ultima = $state<{ texto: string; acierto: boolean; detalle: string; notas: string[] } | null>(null)
  /** El guion de los años antes de Cristo se explica la primera vez que sale en la partida. */
  let negativoExplicado = false
  /** Lo que acaba de pasar, contado entero para el lector de pantalla. */
  let narra = $state('')
  let quitando = $state<number | null>(null)

  let mazoEl = $state<HTMLElement>()
  let reglas = $state(false)
  let cronoEl: HTMLElement
  let chips = $state<HTMLElement[]>([])
  /** De dónde salen las cartas que entran sin venir de otro sitio de la mesa. */
  let origen: HTMLElement | null = null

  const local = asiento === 'todos'
  const solo = local && inicial.vista.jugadores.length === 1
  /** Entró con la partida empezada: ve la mesa pero no juega. */
  const mirando = asiento === null
  const miTurno = $derived(!fin && (local || asiento === vista.turno))
  /** El anfitrión lo quitó de esta partida: sigue en la mesa, pero solo mira. */
  const fuera = $derived(typeof asiento === 'number' && !!vista.jugadores[asiento]?.eliminado && !fin)

  // Con muchos jugadores la lista no cabe: se lleva a la vista la ficha de quien tiene el turno.
  $effect(() => {
    const c = chips[vista.turno]
    const lista = c?.parentElement
    if (!c || !lista || lista.scrollWidth <= lista.clientWidth) return
    lista.scrollTo({ left: c.offsetLeft - lista.offsetLeft - lista.clientWidth / 2 + c.offsetWidth / 2, behavior: desplazamiento() })
  })

  /** Con teclado, las flechas llevan de la carta elegida a los huecos y de un hueco a otro. */
  function flechas(e: KeyboardEvent) {
    if (!puedeColocar || ampliada || reglas || verLista || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    const huecos = [...cronoEl.querySelectorAll<HTMLElement>('.hueco')]
    const i = huecos.indexOf(document.activeElement as HTMLElement)
    const paso = e.key === 'ArrowLeft' ? -1 : 1
    const destino = i < 0 ? (paso < 0 ? huecos.length - 1 : 0) : Math.max(0, Math.min(huecos.length - 1, i + paso))
    e.preventDefault()
    huecos[destino]?.focus()
  }
  // La carta elegida tiene que estar en la mano que se ve: si se eligió durante la animación de otra
  // jugada y la mano ha cambiado, no sirve para colocar.
  const puedeColocar = $derived(!!seleccionada && mano.includes(seleccionada) && !ocupado && miTurno)
  const nombreTurno = $derived(vista.jugadores[vista.turno]?.nombre ?? '')

  /** Las pausas de cada jugada se acortan si se toca la mesa (MENU-15). */
  const prisa = crearPrisa()
  /** Pausa entre los pasos de una animación: con movimiento reducido no hay animación y no se espera. */
  const espera = prisa.espera
  /** Un toque en la mesa mientras se anima una jugada o se lee un aviso: lo que queda va deprisa. */
  function apresurar() {
    if (ocupado || aviso) prisa.apresurar()
  }

  const anioDe = (id: string) => anioTexto(fechas[id])
  const anioDicho = (id: string | null, conCirca = true) => (id ? anioHablado(fechas[id], conCirca) : '')
  /** El año para la tira y el intervalo: sin la «c.» y con los millones en corto. */
  const anioCorto = (id: string) => (fechas[id] ? anioTexto({ anio: fechas[id].anio, circa: false }).replace(' millones', ' M') : '')
  /** Las dos primeras jugadas de cada jugador llevan la pista de cómo se juega. */
  const novato = (i: number) => (vista.jugadores[i] ? vista.jugadores[i].aciertos + vista.jugadores[i].fallos < 2 : false)

  // Condiciones de la partida, para el menú «La partida».
  const condiciones = $derived.by(() => {
    const o = vista.opciones
    const lista: string[] = []
    if (o.series?.length) {
      const total = o.series.reduce((n, a) => n + (cuentaPorAmbito[a] ?? 0), 0)
      const cuales = o.series.length === Object.keys(AMBITOS).length ? 'todas las series' : enLista(o.series.map((a) => AMBITOS[a]))
      lista.push(`Mazo: ${cuales} (${total} cartas)`)
    }
    lista.push(`${o.cartasIniciales} cartas por jugador`)
    lista.push(o.alFallar === 'recolocar' ? 'Al fallar se recoloca' : 'Al fallar se descarta')
    lista.push(`Ronda ${vista.ronda}`)
    return lista
  })

  /** La ronda en curso: quién la abre, quién falta y quién ya no tiene cartas (INFO-1). */
  const ronda = $derived(enRonda(vista))
  /**
   * La franja de la ronda, siempre a la vista entre los jugadores y la cronología. Se calcula desde la vista, así
   * que también sale bien al retomar una partida o al reconectar.
   */
  const franja = $derived.by(() => {
    if (solo) return null
    const v = vista
    const nombre = (i: number) => v.jugadores[i].nombre
    if (fin) return { ronda: `Ronda ${v.ronda}`, estado: 'Fin de la partida' }
    let estado = ''
    const empatados = (v.desempate ?? []).filter((i) => !v.jugadores[i].eliminado)
    if (empatados.length > 1) {
      const fueraJ = v.jugadores.flatMap((j, i) => (j.eliminado ? [i] : []))
      estado = `Desempate entre ${enLista(empatados.map(nombre))}`
      if (fueraJ.length) estado += ` · ${enLista(fueraJ.map(nombre))} ${fueraJ.length > 1 ? 'quedan' : 'queda'} fuera`
    }
    if (ronda.sinCartas.length) {
      const n = ronda.sinCartas.length
      estado = `Última ronda: ${enLista(ronda.sinCartas.map(nombre))} ya no ${n > 1 ? 'tienen' : 'tiene'} cartas`
      if (ronda.faltan.length) estado += ` · ${ronda.faltan.length > 1 ? 'faltan' : 'falta'} ${enLista(ronda.faltan.map(nombre))}`
    }
    return { ronda: `Ronda ${v.ronda}`, estado }
  })

  // Encabezados ocultos para el lector de pantalla: qué hay en la mesa y de quién es la mano.
  const tituloCrono = $derived.by(() => {
    const vistas = crono.filter((p) => p.volteada && fechas[p.id])
    const n = `${crono.length} ${crono.length === 1 ? 'carta' : 'cartas'}`
    if (!vistas.length) return `Cronología: ${n}`
    const [a, b] = [vistas[0].id, vistas[vistas.length - 1].id]
    return `Cronología: ${n}, ${a === b ? anioDicho(a, false) : `de ${anioDicho(a, false)} a ${anioDicho(b, false)}`}`
  })
  const tituloMano = $derived(solo || !local ? 'Tus cartas' : `Cartas de ${vista.jugadores[visible]?.nombre ?? ''}`)

  let menu = $state(false)
  let confirma = $state<'' | 'abandonar' | 'sala' | 'quitar'>('')

  // Las ventanas de la mesa son capas (capas.ts): cada una apunta un paso en el historial, así que el «atrás»
  // del móvil, la X y Escape cierran la de arriba. Las que traen su propio diálogo (Reglas, Confirmar) se
  // abren con abrirCapa; las de aquí llevan use:capa en su marcado.
  let capaReglas: Capa | null = null
  function abrirReglas() {
    reglas = true
    capaReglas = abrirCapa(() => (reglas = false))
  }
  let capaConfirma: Capa | null = null
  /** Del menú a una pregunta: el menú se cierra y su paso en el historial pasa a ser el de la pregunta. */
  function preguntar(que: 'abandonar' | 'sala' | 'quitar') {
    cerrarCapa()
    confirma = que
    // El selector de a quién se quita es una ventana de aquí (use:capa); las otras dos, Confirmar.
    if (que !== 'quitar') capaConfirma = abrirCapa(() => (confirma = ''))
  }
  let capaQuitando: Capa | null = null
  function pedirQuitar(i: number) {
    quitando = i
    capaQuitando = abrirCapa(() => (quitando = null))
  }
  /** En local se cambian jugadores o mazo; en línea se vuelve a la sala, donde se cambian los ajustes. */
  const textoCambiar = local ? 'Cambiar jugadores o mazo' : 'Cambiar ajustes'
  /** En línea, quién reparte la siguiente si no eres tú: el primero que sigue conectado. */
  const quienReparte = $derived.by(() => {
    if (!conectados) return ''
    const i = conectados.findIndex(Boolean)
    return i >= 0 ? (vista.jugadores[i]?.nombre ?? '') : ''
  })
  /** En local, quitar a alguien que se va de la mesa: solo si quedan al menos dos jugando. */
  const enJuego = $derived(vista.jugadores.flatMap((j, i) => (j.eliminado ? [] : [i])))
  const puedeQuitar = $derived(local && !solo && !fin && enJuego.length > 1)

  /** Gesto de la moneda de cada jugador según cómo le va. */
  function gestoDe(i: number): 'normal' | 'pensando' | 'gana' | 'pierde' {
    if (fin) return fin.includes(i) ? 'gana' : 'pierde'
    if (vista.jugadores[i].eliminado) return 'pierde'
    return i === vista.turno ? 'pensando' : 'normal'
  }

  // Tira de años: qué parte de la cronología se está viendo y entre qué años.
  let ventana = $state({ izq: 0, ancho: 100 })
  let rango = $state('')
  function medirVentana() {
    if (!cronoEl) return
    const total = cronoEl.scrollWidth || 1
    ventana = { izq: (cronoEl.scrollLeft / total) * 100, ancho: Math.min(100, (cronoEl.clientWidth / total) * 100) }
    const caja = cronoEl.getBoundingClientRect()
    // Solo las cartas que siguen en la cronología: la que se va a los descartes aún está saliendo.
    const ids = new Set(crono.filter((p) => p.marca !== 'fallo').map((p) => p.id))
    const vistas = [...cronoEl.querySelectorAll<HTMLElement>('.naipe')].filter((el) => {
      if (!ids.has(el.dataset.id ?? '')) return false
      const r = el.getBoundingClientRect()
      const centro = r.left + r.width / 2
      return centro >= caja.left && centro <= caja.right
    })
    const a = vistas[0]?.dataset.id
    const b = vistas[vistas.length - 1]?.dataset.id
    rango = a && b && fechas[a] && fechas[b] ? (a === b ? anioCorto(a) : `${anioCorto(a)} – ${anioCorto(b)}`) : ''
  }
  $effect(() => {
    void [crono.length, puedeColocar, fin]
    const reloj = setTimeout(medirVentana, 650)
    return () => clearTimeout(reloj)
  })
  const piezasTira = $derived(
    crono.map((p) => {
      const f = p.volteada ? fechas[p.id] : null
      return { id: p.id, anio: f ? anioCorto(p.id) : '', era: f ? eraDe(f.anio) : null }
    }),
  )

  /** La carta de la cronología que está más cerca del centro de la vista. */
  function cartaCentral(): string | null {
    const medio = cronoEl.getBoundingClientRect().left + cronoEl.clientWidth / 2
    let mejor: string | null = null
    let distancia = Infinity
    for (const el of cronoEl.querySelectorAll<HTMLElement>('.naipe')) {
      const r = el.getBoundingClientRect()
      const d = Math.abs(r.left + r.width / 2 - medio)
      if (d < distancia) [mejor, distancia] = [el.dataset.id ?? null, d]
    }
    return mejor
  }

  /** Lleva una carta de la cronología al centro de la vista. Usa su sitio en la maquetación, no el que
      tiene en pantalla, porque mientras vuela o se desliza está en otra parte. */
  function centrar(id: string) {
    const el = cronoEl?.querySelector<HTMLElement>(`[data-id="${id}"]`)
    if (!el) return
    let x = 0
    for (let n: HTMLElement | null = el; n && n !== cronoEl; n = n.offsetParent as HTMLElement | null) x += n.offsetLeft
    cronoEl.scrollTo({ left: x + el.offsetWidth / 2 - cronoEl.clientWidth / 2, behavior: desplazamiento() })
  }

  /** Tras una jugada, el foco se ha quedado en un hueco que se cierra o en una carta que ya no está:
      va a la mano de quien juega ahora o, si no le toca a este dispositivo, a la carta recién colocada. */
  async function recuperarFoco(id: string) {
    await tick()
    const a = document.activeElement as HTMLElement | null
    const perdido = !a || a === document.body || !a.isConnected || !!a.closest('[inert]') || a.classList.contains('hueco')
    if (!perdido) return
    const enMano = manoEl?.querySelector<HTMLElement>('.naipe')
    const colocada = cronoEl?.querySelector<HTMLElement>(`.naipe[data-id="${id}"]`)
    ;((miTurno ? enMano : null) ?? colocada ?? enMano)?.focus({ preventScroll: true })
  }
  let manoEl = $state<HTMLElement>()

  function anotar(f: Anios) {
    for (const id in f) fechas[id] ??= { anio: f[id][0], circa: !!f[id][1] }
  }

  function entrada(node: Element, params: { delay?: number }, intro: boolean) {
    if (!intro || dura(1) === 0) return { duration: dura(180), css: (t: number) => `opacity: ${t}` }
    if (origen?.isConnected) {
      const r = node.getBoundingClientRect()
      const m = origen.getBoundingClientRect()
      const dx = m.left + m.width / 2 - (r.left + r.width / 2)
      const dy = m.top + m.height / 2 - (r.top + r.height / 2)
      const s = Math.min(1, m.height / r.height)
      return {
        duration: 480,
        delay: params.delay ?? 0,
        easing: cubicOut,
        css: (t: number, u: number) =>
          `transform: translate(${u * dx}px, ${u * dy}px) scale(${1 - u * (1 - s)}) rotate(${u * -12}deg); opacity: ${Math.min(1, t * 4)}`,
      }
    }
    return {
      duration: 380,
      delay: params.delay ?? 0,
      easing: cubicOut,
      css: (t: number, u: number) => `transform: translateY(${u * 70}%); opacity: ${t}`,
    }
  }
  const [enviar, recibir] = crossfade({ duration: () => dura(480), easing: cubicOut, fallback: entrada })

  // Los sucesos se atienden de uno en uno: una jugada no empieza hasta que acaba de animarse la anterior.
  let cola: Suceso[] = []
  let atendiendo = true
  async function atender() {
    atendiendo = true
    while (cola.length) {
      const s = cola.shift()!
      if (s.jugada) await animar(s)
      else poner(s)
    }
    atendiendo = false
  }

  onMount(() => {
    const dejar = control.escuchar((s) => {
      cola.push(s)
      if (!atendiendo) atender()
    })
    // «Atrás» sin ninguna ventana abierta no saca de la partida: abre el menú «La partida». Con la partida
    // acabada, sí vuelve al menú de inicio.
    const soltar = guardiaAtras(() => {
      if (fin) return false
      menu = true
      return true
    })
    repartir().then(atender)
    return () => {
      dejar()
      soltar()
    }
  })

  /** Un aviso a la vista. No habla: lo que oye el lector de pantalla va junto en `narra`, una vez por jugada.
      Dura 1 s por cada 3 palabras más 1 s (A11Y-12), o hasta que alguien toque la mesa; la cinta de turno, algo menos. */
  async function avisar(a: Aviso) {
    aviso = a
    await prisa.leer(a.detalle === undefined && a.jugador !== undefined ? 1300 : tiempoDeLectura(a.antes ?? '', a.titulo, a.detalle ?? ''))
    aviso = null
  }
  /** La cinta del turno: con la moneda de quien juega. */
  function cintaDe(jugador: number, empieza = false): Aviso {
    const nombre = vista.jugadores[jugador]?.nombre ?? ''
    if (!local && jugador === asiento) return { titulo: empieza ? 'Empiezas tú' : 'Tu turno', jugador }
    return { antes: empieza ? 'Empieza' : 'Turno de', titulo: nombre, jugador }
  }

  async function repartir() {
    const v = vista
    const sinEmpezar = v.cronologia.length === 1 && !v.descartes.length && v.jugadores.every((j) => !j.aciertos && !j.fallos)
    if (!sinEmpezar) {
      poner(inicial)
      await espera(300)
    } else {
      origen = mazoEl ?? null
      await espera(300)
      crono.push({ id: v.cronologia[0], volteada: false, marca: '' })
      await espera(520)
      anotar(inicial.fechas)
      crono[0].volteada = true
      await espera(450)
      for (const id of v.jugadores[visible]?.mano ?? []) {
        mano.push(id)
        await espera(150)
      }
      await espera(350)
    }
    if (!fin && !solo && !fuera) {
      // «Empieza Ana»: quién abre la partida lo ha echado a suertes (o rota en «Otra partida»).
      const cinta = cintaDe(v.turno, sinEmpezar)
      narra = cinta.antes ? `${cinta.antes} ${cinta.titulo}` : cinta.titulo
      // En línea, a quien le toca le vibra el móvil, por si no está mirando (A11Y-18).
      if (!local && v.turno === asiento) control.tuTurno?.()
      await avisar(cinta)
    }
    prisa.calma()
    ocupado = false
  }

  /** Pone la mesa como dice la vista, sin animar la jugada (al retomar, reconectar o si alguien se va). */
  function poner(s: Suceso) {
    const v = s.vista
    // Si el turno cambia sin jugada (se quita a alguien), también se cuenta.
    if (v.turno !== vista.turno && !v.ganadores.length) {
      narra = asiento === v.turno ? 'Tu turno' : `Turno de ${v.jugadores[v.turno].nombre}`
      if (!local && asiento === v.turno) control.tuTurno?.()
    }
    vista = v
    conectados = s.conectados ?? null
    anotar(s.fechas)
    origen = null
    crono = v.cronologia.map((id) => crono.find((p) => p.id === id) ?? { id, volteada: true, marca: '' })
    for (const p of crono) p.volteada = true
    visible = manoDe(v)
    mano = [...(v.jugadores[visible]?.mano ?? [])]
    contar(v)
    if (seleccionada && !mano.includes(seleccionada)) seleccionada = null
    if (v.ganadores.length && !fin) {
      fin = v.ganadores
      verFin = true
    }
  }

  function contar(v: VistaClasico) {
    cuentas = v.jugadores.map((j) => j.mano.length)
    nMazo = v.nMazo
    descartes = [...v.descartes]
  }

  function elegir(id: string) {
    // En local, mientras se anima una jugada la mano va a cambiar de dueño: no se elige nada.
    if (fin || (local && ocupado)) return
    if (seleccionada === id) ampliada = { id, reverso: false }
    else {
      // Al elegir, las cartas de la mesa encogen para que quepan más huecos: se conserva la que estaba en el centro.
      const central = !seleccionada && miTurno && !ocupado ? cartaCentral() : null
      seleccionada = id
      if (central) setTimeout(() => centrar(central), 300)
    }
  }

  function jugarEn(posicion: number) {
    if (!puedeColocar || !seleccionada) return
    ocupado = true
    try {
      control.jugar(seleccionada, posicion)
    } catch {
      // Una jugada que las reglas no aceptan no puede dejar la mesa bloqueada.
      seleccionada = null
      ocupado = false
      return
    }
    // Si el servidor no contesta (conexión caída), se devuelve el control al jugador.
    setTimeout(() => !atendiendo && (ocupado = false), 4000)
  }

  /** Años de unas cartas ya descubiertas, en el formato de las reglas. */
  function aniosDe(ids: string[]): Anios {
    const a: Anios = {}
    for (const id of ids) if (fechas[id]) a[id] = [fechas[id].anio, fechas[id].circa ? 1 : 0]
    return a
  }

  /** Aclaraciones de una fecha recién descubierta: el guion la primera vez que sale y, si no, la «c.». */
  function notasDe(id: string): string[] {
    const f = fechas[id]
    if (!f) return []
    if (f.anio < 0 && !negativoExplicado) {
      negativoExplicado = true
      return [`${anioTexto(f)} = ${f.circa || enMillones(f.anio) ? '' : 'año '}${anioHablado(f)}`]
    }
    return f.circa ? ['c. = fecha aproximada'] : []
  }

  /** Se acabó el mazo: los descartes, barajados, pasan a ser el mazo. */
  async function rebarajar() {
    nMazo += descartes.length
    descartes = []
    await avisar({ titulo: 'Se acabó el mazo', detalle: 'Se barajan los descartes' })
  }

  async function animar(s: Suceso) {
    const r = s.jugada!
    const id = r.carta
    const jugador = r.jugador
    const suya = visible === jugador
    /** La partida antes de la jugada: con ella se dice dónde iba la carta. */
    const antes = vista
    prisa.calma()
    ocupado = true
    // Quien lee una de sus cartas mientras juega otro no pierde la selección.
    if (seleccionada === id || visible === jugador) seleccionada = null
    conectados = s.conectados ?? null
    let barajado = false

    // 1. La carta vuela a su hueco: desde la mano, o desde el nombre de quien la juega
    origen = chips[jugador] ?? null
    mano = mano.filter((x) => x !== id)
    crono.splice(Math.min(r.posicion, crono.length), 0, { id, volteada: false, marca: '' })
    cuentas[jugador]--
    // Se centra cuando los huecos ya se han cerrado, para acertar con el sitio definitivo.
    await espera(320)
    centrar(id)
    await espera(300)

    // 2. Se voltea y enseña el año
    const pieza = crono.find((p) => p.id === id)!
    anotar(s.fechas)
    pieza.volteada = true
    await espera(800)

    // Cómo se cuenta: «tú» si la jugada es de este dispositivo; si no, con el nombre.
    const quien = antes.jugadores[jugador]?.nombre ?? ''
    const tu = solo || asiento === jugador
    const texto = textoPlano(porId[id])
    const anio = anioDe(id)
    const anios = aniosDe([...antes.cronologia, id])
    const notas = notasDe(id)
    /** Lo que se dirá al lector de pantalla, todo junto al final. */
    const partes = [`${tu ? 'Colocas' : quien + ' coloca'} «${texto}», ${anioDicho(id)}.`]
    let detalle = ''
    if (r.acierto) {
      const igual = mismoAnio(antes.cronologia, anios, id, r.posicion)
      detalle = igual ? `Mismo año que «${textoPlano(porId[igual])}»: vale a un lado o al otro` : ''
      pieza.marca = 'ok'
      veredicto = { tipo: 'ok', titulo: solo ? '¡Correcto!' : tu ? '¡Aciertas!' : `¡${quien} acierta!`, detalle, notas }
      partes.push(`Correcto.${igual ? ' Tiene el mismo año que la carta de al lado.' : ''}`)
      // El veredicto se ve al menos 600 ms aunque se toque la mesa.
      await espera(800, 600)
      pieza.marca = ''
    } else {
      // Dónde iba: entre qué años de la cronología que había antes de jugar.
      const [a, b] = vecinas(antes.cronologia, anios, id)
      const junto = a && fechas[a]?.anio === fechas[id]?.anio
      const donde = junto ? `iba junto a la de ${anioDe(a)}` : a && b ? `iba entre ${anioDe(a)} y ${anioDe(b)}` : a ? `iba después de ${anioDe(a)}` : `iba antes de ${anioDe(b!)}`
      const dondeDicho = junto
        ? `iba junto a la de ${anioDicho(a, false)}`
        : a && b
          ? `iba entre ${anioDicho(a, false)} y ${anioDicho(b, false)}`
          : a
            ? `iba después de ${anioDicho(a, false)}`
            : `iba antes de ${anioDicho(b, false)}`
      const destino = r.recolocada === null ? 'Va a los descartes' : 'Se recoloca en su sitio'
      const roba = r.robada ? (tu ? 'Robas otra' : `${quien} roba otra`) : ''
      detalle = [destino, roba].filter(Boolean).join(' · ')
      pieza.marca = 'fallo'
      veredicto = { tipo: r.recolocada === null ? 'fallo' : 'recoloca', titulo: 'No encaja', sub: `es de ${anio}, ${donde}`, detalle, notas }
      // Si para robar hay que barajar los descartes, se cuenta antes del robo.
      const sinMazo = !!r.robada && !!r.barajado && nMazo === 0
      partes.push(`No encaja: ${dondeDicho}. ${destino}.${sinMazo ? ' Se acabó el mazo: se barajan los descartes.' : ''}${roba ? ` ${roba} carta.` : ''}`)
      detalle = `${donde} · ${detalle}`
      if (suya) navigator.vibrate?.(120)
      await espera(1700, 600)
      if (r.recolocada === null) {
        // 3a. Fallo: a los descartes
        crono = crono.filter((p) => p.id !== id)
        descartes = [...descartes, id]
        await espera(520)
      } else {
        // 3b. Fallo con recolocación: la carta se desliza hasta su sitio
        pieza.marca = ''
        const resto = crono.filter((p) => p.id !== id)
        resto.splice(r.recolocada, 0, pieza)
        crono = resto
        await tick()
        centrar(id)
        await espera(1100)
      }
      if (r.robada) {
        // Con el mazo vacío, se barajan los descartes antes de robar (A11Y-12).
        if (sinMazo) {
          barajado = true
          await rebarajar()
        }
        origen = mazoEl ?? null
        if (suya) mano.push(r.robada)
        cuentas[jugador]++
        nMazo = Math.max(0, nMazo - 1)
        await espera(520)
      }
    }
    veredicto = null
    ultima = { texto: `${tu ? 'Colocaste' : quien + ' colocó'} «${texto}», ${anio}`, acierto: r.acierto, detalle, notas }

    // 4. Se pone al día con el resultado y pasa el turno
    const v = s.vista
    if (r.barajado && !barajado) {
      // Se barajó para robar las cartas del desempate.
      partes.push('Se acabó el mazo: se barajan los descartes.')
      await rebarajar()
    }
    vista = v
    contar(v)
    const quedan = v.jugadores[jugador]?.mano.length ?? 0
    if (!v.ganadores.length && quedan > 0)
      partes.push(`${tu ? 'Te' : `A ${quien} le`} ${quedan === 1 ? 'queda 1 carta' : `quedan ${quedan} cartas`}.`)

    if (v.ganadores.length) {
      narra = [...partes, solo ? 'Cronología completada.' : `${ganan(v.ganadores)}.`].join(' ')
      await espera(300)
      fin = v.ganadores
      verFin = true
      prisa.calma()
      return
    }

    // Avisos de lo que no pasa en todas las jugadas, y de quién juega ahora.
    const avisos: Aviso[] = []
    // Quien coloca su última carta no gana todavía: los demás acaban la ronda.
    if (r.acierto && !r.finRonda && quedan === 0)
      avisos.push({ titulo: '¡Última ronda!', detalle: `${tu && !local ? 'Te quedas' : quien + ' se queda'} sin cartas: los demás terminan la ronda` })
    if (r.desempate.length) {
      const roban = r.desempate.filter((d) => d.carta)
      const empatados = enLista(roban.map((d) => v.jugadores[d.jugador].nombre))
      const fueraJ = r.eliminados.length ? ` · ${enLista(r.eliminados.map((i) => v.jugadores[i].nombre))} ${r.eliminados.length > 1 ? 'quedan' : 'queda'} fuera` : ''
      avisos.push({ titulo: '¡Desempate!', detalle: `${empatados} ${roban.length > 1 ? 'roban' : 'roba'} una carta${fueraJ}` })
    }
    const cambiaMano = manoDe(v) !== visible
    let turno = ''
    if (!solo) {
      if (local) turno = cambiaMano ? `Turno de ${v.jugadores[v.turno].nombre}` : ''
      else if (asiento === v.turno) turno = jugador !== asiento ? 'Tu turno' : ''
      else turno = `Turno de ${v.jugadores[v.turno].nombre}`
    }
    narra = [...partes, ...avisos.map((a) => `${a.titulo} ${(a.detalle ?? '').replace(/ · /g, '. ')}.`), turno && turno + '.'].filter(Boolean).join(' ')

    for (const a of avisos) await avisar(a)
    if (cambiaMano) {
      origen = null
      // La carta elegida era de la mano que se va.
      seleccionada = null
      mano = []
      await espera(230)
      visible = manoDe(v)
      mano = [...v.jugadores[visible].mano]
      await avisar(cintaDe(v.turno))
    } else {
      origen = mazoEl ?? null
      const debe = v.jugadores[visible]?.mano ?? []
      mano = mano.filter((x) => debe.includes(x))
      for (const x of debe) if (!mano.includes(x)) mano.push(x)
      if (!local && asiento === v.turno && jugador !== asiento) {
        control.tuTurno?.()
        await avisar(cintaDe(v.turno))
      }
    }
    if (seleccionada && !mano.includes(seleccionada)) seleccionada = null
    prisa.calma()
    ocupado = false
    recuperarFoco(id)
  }

  /** Cierra el panel final. El foco no puede volver al hueco de la última jugada, que ya no está a la vista. */
  async function cerrarFin() {
    verFin = false
    await tick()
    manoEl?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
  }

  function abrirLista(pestana: 'cronologia' | 'descartes') {
    pestanaLista = pestana
    verLista = true
  }
  /** Jugar desde la lista: se cierra y la jugada se anima en la mesa. */
  function colocarDesdeLista(posicion: number) {
    cerrarCapa()
    jugarEn(posicion)
  }

  /** «Ana», «Ana y Benito»… */
  function nombres(g: number[]) {
    return enLista(g.map((i) => vista.jugadores[i].nombre))
  }
  /** «Gana Ana», «Ganan Ana y Benito». */
  const ganan = (g: number[]) => `${g.length > 1 ? 'Ganan' : 'Gana'} ${nombres(g)}`
  const cartas = (n: number) => `${n} ${n === 1 ? 'carta' : 'cartas'}`

  /** Por qué ha acabado la partida, debajo del título (INFO-6). */
  const causa = $derived.by(() => {
    if (!fin) return ''
    const v = vista
    if (solo) {
      const j = v.jugadores[0]
      return `Has colocado todas tus cartas: ${j.aciertos} ${j.aciertos === 1 ? 'acierto' : 'aciertos'} y ${j.fallos} ${j.fallos === 1 ? 'fallo' : 'fallos'}.`
    }
    if (fin.length > 1) return `${nombres(fin)} colocaron su última carta en la ronda ${v.ronda} y ya no quedaban cartas para desempatar.`
    const otros = v.jugadores.flatMap((j, i) => {
      if (fin!.includes(i)) return []
      // Quien queda fuera por un desempate conserva sus cartas; quien deja la partida, no.
      if (j.eliminado) return [j.mano.length ? `${j.nombre} quedó fuera en el desempate` : `${j.nombre} dejó la partida`]
      return [`${j.nombre} acabó con ${cartas(j.mano.length)}`]
    })
    return `${nombres(fin)} colocó su última carta en la ronda ${v.ronda}${otros.length ? '; ' + enLista(otros) : ''}.`
  })
  /** Marcador: por las cartas que quedan, sin puestos ni números de orden. Primero quien gana; los de fuera, al final. */
  const marcador = $derived(
    vista.jugadores
      .map((j, i) => ({ j, i }))
      .sort((a, b) => {
        const peso = (x: { j: (typeof vista.jugadores)[number]; i: number }) => (fin?.includes(x.i) ? 0 : x.j.eliminado ? 2 : 1)
        return peso(a) - peso(b) || a.j.mano.length - b.j.mano.length || a.i - b.i
      }),
  )
  /** Repaso de las cartas que no encajaron, de cada jugador en el orden en que las jugó. */
  const falladas = $derived(vista.jugadores.flatMap((j, i) => (j.falladas ?? []).map((id) => ({ id, quien: i }))))
</script>

<svelte:window
  onresize={medirVentana}
  onkeydown={(e) => {
    // Con una ventana abierta, Escape es suyo (capas.ts lo atiende) y las flechas no mueven la mesa.
    if (confirma || quitando !== null || menu || ampliada || verLista || reglas || (fin && verFin)) return
    if (e.key === 'Escape') apresurar()
    flechas(e)
    if (e.key === 'Escape' && quitando === null) {
      // el hueco con el foco va a desaparecer: el foco vuelve a la carta que estaba elegida
      if (document.activeElement?.classList.contains('hueco')) manoEl?.querySelector<HTMLElement>('.naipe.elegida')?.focus()
      seleccionada = null
    }
  }}
/>

<!-- Un toque en cualquier sitio de la mesa acelera lo que queda de la jugada (MENU-15). -->
<main class="mesa" class:eligiendo={puedeColocar} class:acabada={!!fin} onpointerdown={apresurar}>
  <h1 class="sr-only" tabindex="-1" data-titulo>Partida</h1>
  <header class="barra">
    <BotonIcono icono="atras" etiqueta={fin ? 'Salir al menú' : 'Salir o abandonar la partida'} onclick={() => (fin ? onsalir() : (menu = true))} />
    <span class="titulo"><Marca /></span>
    <BotonIcono icono="reglas" etiqueta="Reglamento" onclick={abrirReglas} />
    <div class="pilas">
      <figure>
        <Mazo n={nMazo} bind:el={mazoEl} />
        <figcaption>mazo</figcaption>
      </figure>
      {#if vista.opciones.alFallar === 'descartar'}
        <figure>
          <button
            class="pila descartes"
            disabled={!descartes.length}
            onclick={() => abrirLista('descartes')}
            aria-label="Descartes: {cartas(descartes.length)}. Ver la lista"
          >
            {#each descartes.slice(-1) as id (id)}
              <div class="encima" in:recibir={{ key: id }} out:enviar={{ key: id }}>
                <Carta carta={porId[id]} fecha={fechas[id]} volteada imagen="mini" />
              </div>
            {/each}
            {#if descartes.length}<span class="cuenta" aria-hidden="true">{descartes.length}</span>{/if}
          </button>
          <figcaption>descartes</figcaption>
        </figure>
      {/if}
    </div>
  </header>

  <ul class="jugadores" class:solo aria-label="Jugadores" style:--j={vista.jugadores.length}>
    {#each vista.jugadores as j, i (i)}
      <li
        bind:this={chips[i]}
        class:activo={i === vista.turno && !fin}
        class:eliminado={j.eliminado}
        class:ganador={fin?.includes(i)}
        class:ausente={conectados && !conectados[i]}
        aria-current={i === vista.turno && !fin ? 'true' : undefined}
      >
        <span class="nombre">{j.nombre}{i === asiento ? ' (tú)' : ''}</span>
        {#if conectados && !conectados[i]}<span class="sr-only">, sin conexión</span>{/if}
        <span class="sr-only">, </span>
        <Moneda avatar={j.avatar} nombre={j.nombre} gesto={gestoDe(i)} n={fin ? undefined : cuentas[i]} fuera={j.eliminado && !fin} abre={!fin && !solo && i === ronda.abre} />
      </li>
    {/each}
  </ul>

  {#if franja}
    <p class="franja">
      <span class="ronda">{franja.ronda}</span>{#if franja.estado}<span class="sep" aria-hidden="true">{" · "}</span><span class="sr-only">. </span><span class="estado">{franja.estado}</span>{/if}
    </p>
  {/if}

  <h2 class="sr-only">{tituloCrono}</h2>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="crono" bind:this={cronoEl} onscroll={medirVentana} onclick={(e) => e.target === e.currentTarget && (seleccionada = null)}>
    <!-- Cada carta lleva delante su hueco; la última, también el de detrás. Así la lista tiene una entrada por carta. -->
    <div class="tira" class:entintada={!!fin && !solo} role="list" style:--n={Math.max(1, crono.length)}>
      {#each crono as p, i (p.id)}
        <div class="pieza" role="listitem" animate:flip={{ duration: dura(600), easing: cubicOut }}>
          <button class="hueco" inert={!puedeColocar} onclick={() => jugarEn(i)} aria-label="Colocar aquí, {i > 0 ? `entre ${anioDicho(crono[i - 1].id, false) || 'la anterior'} y ` : 'antes de '}{anioDicho(p.id, false) || 'esta carta'}">
            <span>+</span>
          </button>
          <button
            class="naipe"
            data-id={p.id}
            in:recibir={{ key: p.id }}
            out:enviar={{ key: p.id }}
            onclick={() => (ampliada = { id: p.id, reverso: p.volteada })}
            aria-label="{p.volteada && anioDe(p.id) ? anioDicho(p.id) + '. ' : ''}{textoPlano(porId[p.id])}"
          >
            <div class="cuerpo {p.marca}">
              <Carta carta={porId[p.id]} fecha={fechas[p.id]} volteada={p.volteada} />
            </div>
          </button>
          {#if i === crono.length - 1}
            <button class="hueco" inert={!puedeColocar} onclick={() => jugarEn(crono.length)} aria-label="Colocar aquí, al final, después de {anioDicho(p.id, false) || 'la última'}">
              <span>+</span>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  {#if crono.length > 2 || fin}
    <div class="anios" transition:fade={{ duration: dura(200) }}>
      <!-- Tira de años: toda la cronología de un vistazo; tocar un año lleva hasta su carta. -->
      <TiraAnios piezas={piezasTira} {ventana} {rango} oncentrar={centrar} />
      <button class="ver-lista" onclick={() => abrirLista('cronologia')} aria-label="Ver la cronología en lista">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg>
        <span>Lista</span>
      </button>
    </div>
  {/if}

  <p class="sr-only" role="status">{narra}</p>
  <div class="leyenda">
    {#if aviso}
      <!-- La cinta de turno y los avisos: en la franja de la leyenda, sin tapar la cronología. -->
      <div class="cinta" class:excepcional={!!aviso.detalle} in:fly={{ y: 12, duration: dura(220), easing: cubicOut }}>
        {#if aviso.jugador !== undefined}
          <span class="moneda-cinta">
            {#key aviso}<span class="gira"><Moneda avatar={vista.jugadores[aviso.jugador]?.avatar} nombre={vista.jugadores[aviso.jugador]?.nombre} /></span>{/key}
          </span>
        {/if}
        <span class="cinta-texto">
          <span class="cinta-titulo">{#if aviso.antes}<i>{aviso.antes}</i>{" "}{/if}<b>{aviso.titulo}</b></span>
          {#if aviso.detalle}<span class="cinta-detalle">{aviso.detalle}</span>{/if}
        </span>
      </div>
    {:else if fin}
      <p class="resultado">{solo ? 'Cronología completada' : ganan(fin)}</p>
      <p class="pista">{causa}</p>
    {:else if veredicto}
      <p class="veredicto {veredicto.tipo}" in:fade={{ duration: dura(180) }}>
        {veredicto.titulo}{#if veredicto.sub}<span class="sr-only">:</span> <span class="sub cifras">{veredicto.sub}</span>{/if}
      </p>
      {#if veredicto.detalle}<p class="pista">{veredicto.detalle}</p>{/if}
      {#each veredicto.notas as n (n)}<p class="pista nota">{n}</p>{/each}
    {:else if seleccionada}
      {#key seleccionada}
        <p class="texto" in:fade={{ duration: dura(180) }}>{@html porId[seleccionada].texto}</p>
      {/key}
      <p class="pista">
        {#if puedeColocar}{local && !solo ? `${nombreTurno}: ¿antes` : '¿Antes'} o después? {Toca()} el hueco <b>+</b> donde creas que va<span class="sr-only">. Con el teclado, las flechas izquierda y derecha llevan a los huecos.</span>{:else if mirando || fuera}Estás mirando la partida{:else if !miTurno}Espera tu turno{/if}
        <button class="ampliar" onclick={() => (ampliada = { id: seleccionada!, reverso: false })}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" /></svg> Ampliar</button>
      </p>
    {:else}
      {#if !ocupado && miTurno}
        <p class="pista grande">{solo ? 'Elige una carta' : local ? `${nombreTurno}, elige una carta` : 'Tu turno: elige una carta'}</p>
        {#if novato(vista.turno)}
          <p class="pista">{crono.length < 2 ? 'Ordena las cartas por fecha: elige una y colócala antes o después' : `${Toca()} una carta para leerla; ${toca() === 'toca' ? 'tócala' : 'púlsala'} otra vez para ampliarla`}</p>
        {/if}
      {:else if !ocupado}
        <p class="pista grande">Juega {nombreTurno}…</p>
        {#if conectados && !conectados[vista.turno]}
          <p class="pista">
            {nombreTurno} se ha desconectado. Esperando a que vuelva…
            {#if control.anfitrion}<button class="enlace" onclick={() => pedirQuitar(vista.turno)}>Quitar de la partida</button>{/if}
          </p>
        {:else if fuera}
          <p class="pista">Ya no juegas esta partida, pero puedes seguir mirándola. Podrás jugar en la siguiente.</p>
        {:else if mirando}
          <p class="pista">Estás mirando: la partida ya había empezado. Podrás jugar en la siguiente.</p>
        {/if}
      {/if}
      {#if ultima}
        <!-- La jugada anterior, para quien no la ha visto: el veredicto dura poco. -->
        <p class="pista antes">
          Antes: {ultima.texto}
          <span class="marca-jugada {ultima.acierto ? 'ok' : 'fallo'}" aria-hidden="true">{ultima.acierto ? '✓' : '✗'}</span><span class="sr-only">, {ultima.acierto ? 'acierto' : 'no encajaba'}</span>
          {#if ultima.detalle}<span class="detalle">{ultima.detalle}</span>{/if}
        </p>
        {#each ultima.notas as n (n)}<p class="pista nota">{n}</p>{/each}
      {/if}
    {/if}
  </div>

  {#if !fin && mano.length}<h2 class="sr-only" id="mano-titulo">{tituloMano}</h2>{/if}
  <div class="mano" style:--n={Math.max(1, mano.length)} bind:this={manoEl} role={!fin && mano.length ? 'group' : undefined} aria-labelledby={!fin && mano.length ? 'mano-titulo' : undefined}>
    {#if fin}
      <div class="final" in:fade>
        <button class="boton" onclick={() => (verFin = true)}>Resultados</button>
        <button class="boton secundario" onclick={() => abrirLista('cronologia')}>Lista</button>
        {#if onotra}<button class="boton secundario" onclick={onotra}>Otra partida</button>{/if}
        {#if oncambiar}<button class="boton secundario" onclick={oncambiar}>{local ? 'Cambiar' : 'Ajustes'}<span class="sr-only">{local ? ' jugadores o mazo' : ' de la sala'}</span></button>{/if}
        <button class="boton secundario" onclick={onsalir}>Menú</button>
      </div>
    {:else}
      {#each mano as id, k (id)}
        {@const d = k - (mano.length - 1) / 2}
        {@const mitad = Math.max(1, (mano.length - 1) / 2)}
        <!-- En abanico, ±3° como mucho (ANIM-10): la mano se abre un poco, sin girar las cartas hasta no leerlas. -->
        <button
          class="naipe"
          class:elegida={seleccionada === id}
          style:--giro="{mano.length > 1 ? (d / mitad) * Math.min(3, (mano.length - 1) * 1) : 0}deg"
          style:--baja="{(d / mitad) ** 2 * 4}px"
          animate:flip={{ duration: dura(300), easing: cubicOut }}
          in:recibir={{ key: id }}
          out:enviar={{ key: id }}
          onclick={() => elegir(id)}
          aria-label="{textoPlano(porId[id])}{seleccionada === id ? ', elegida' : ''}"
        >
          <div class="cuerpo">
            <Carta carta={porId[id]} imagen="mini" soloAnverso />
            {#if seleccionada === id}<span class="lupa"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" /></svg></span>{/if}
          </div>
        </button>
      {/each}
    {/if}
  </div>
</main>

{#if reglas}
  <Reglas oncerrar={() => capaReglas?.cerrar()} />
{/if}

{#if verLista}
  <ListaCrono
    cronologia={crono.filter((p) => p.volteada).map((p) => p.id)}
    {descartes}
    {fechas}
    conDescartes={vista.opciones.alFallar === 'descartar'}
    bind:pestana={pestanaLista}
    juego={miTurno && !ocupado && !mirando && !fuera ? { mano, elegida: seleccionada } : null}
    onelegir={(id) => (seleccionada = id)}
    oncolocar={colocarDesdeLista}
    onampliar={(id, reverso) => (ampliada = { id, reverso })}
    oncerrar={() => (verLista = false)}
  />
{/if}

{#if ampliada}
  <Ampliada
    carta={porId[ampliada.id]}
    fecha={fechas[ampliada.id]}
    reverso={ampliada.reverso}
    onvolver={() => ampliada && (ampliada = { ...ampliada, reverso: !ampliada.reverso })}
    oncerrar={() => (ampliada = null)}
  />
{/if}

{#if menu}
  <div class="velo" transition:fade={{ duration: dura(180) }} onclick={(e) => e.target === e.currentTarget && cerrarCapa()} role="presentation">
    <div class="premio" role="dialog" aria-modal="true" aria-labelledby="menu-titulo" use:capa={() => (menu = false)} in:scale={{ duration: dura(220), start: 0.9 }}>
      <h2 id="menu-titulo">La partida</h2>
      <ul class="condiciones" aria-label="Condiciones de esta partida">
        {#each condiciones as c (c)}<li>{c}</li>{/each}
      </ul>
      <div class="acciones">
        <button class="boton" data-foco onclick={cerrarCapa}>Seguir jugando</button>
        <button class="opcion" onclick={onsalir}>
          <b>Salir al menú</b>
          <small>{local ? 'La partida queda guardada para continuarla' : 'La partida sigue: podrás volver con el código de la sala. Mientras, en tu turno los demás tendrán que esperarte'}</small>
        </button>
        {#if puedeQuitar}
          <button class="opcion" onclick={() => preguntar('quitar')}>
            <b>Quitar a un jugador</b>
            <small>Si alguien se va de la mesa: sus cartas van a los descartes y los demás siguen</small>
          </button>
        {/if}
        {#if control.aLaSala}
          <button class="opcion" onclick={() => preguntar('sala')}>
            <b>Volver todos a la sala de espera</b>
            <small>Termina esta partida para todos</small>
          </button>
        {/if}
        {#if !mirando && !fuera}
          <button class="opcion" onclick={() => preguntar('abandonar')}>
            <b>{local ? 'Terminar la partida' : 'Abandonar la partida'}</b>
            <small>{local ? (solo ? 'Se termina aquí y no se guarda' : 'Se acaba para todos y no se guarda') : 'Tus cartas van a los descartes y los demás siguen'}</small>
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if confirma === 'quitar'}
  <!-- En local: quién se va de la mesa. -->
  <div class="velo" transition:fade={{ duration: dura(180) }} onclick={(e) => e.target === e.currentTarget && cerrarCapa()} role="presentation">
    <div class="premio" role="dialog" aria-modal="true" aria-labelledby="quitar-titulo" use:capa={() => (confirma = '')} in:scale={{ duration: dura(220), start: 0.9 }}>
      <h2 id="quitar-titulo">¿A quién quitas?</h2>
      <p class="corona">Sus cartas van a los descartes y los demás siguen jugando.</p>
      <ul class="quien">
        {#each enJuego as i (i)}
          <li>
            <button class="opcion fila-jugador" onclick={() => (cerrarCapa(), pedirQuitar(i))}>
              <Moneda avatar={vista.jugadores[i].avatar} nombre={vista.jugadores[i].nombre} />
              <b>{vista.jugadores[i].nombre}</b>
            </button>
          </li>
        {/each}
      </ul>
      <div class="acciones">
        <button class="boton secundario" data-foco onclick={cerrarCapa}>Cancelar</button>
      </div>
    </div>
  </div>
{:else if confirma === 'abandonar'}
  <Confirmar
    titulo={local ? '¿Terminar la partida?' : '¿Abandonar la partida?'}
    texto={local ? 'Se acaba para todos y no se podrá continuar.' : 'Ya no podrás jugar esta partida, aunque sí seguir mirándola.'}
    si={local ? 'Terminar' : 'Abandonar'}
    no="Seguir jugando"
    onsi={() => {
      capaConfirma?.cerrar()
      control.abandonar()
      if (local) onsalir()
    }}
    onno={() => capaConfirma?.cerrar()}
  />
{:else if confirma === 'sala'}
  <Confirmar
    titulo="¿Volver todos a la sala de espera?"
    texto="Esta partida se termina para todos los jugadores."
    si="Volver a la sala"
    no="Seguir jugando"
    onsi={() => {
      const ir = control.aLaSala
      capaConfirma?.cerrar()
      ir?.()
    }}
    onno={() => capaConfirma?.cerrar()}
  />
{/if}

{#if quitando !== null}
  <Confirmar
    titulo="¿Quitar a {vista.jugadores[quitando]?.nombre} de la partida?"
    texto={local ? 'Sus cartas van a los descartes y no podrá volver a esta partida.' : 'No podrá volver a esta partida.'}
    si="Quitar"
    onsi={() => {
      const i = quitando!
      capaQuitando?.cerrar()
      control.quitar?.(i)
    }}
    onno={() => capaQuitando?.cerrar()}
  />
{/if}

{#if fin && verFin}
  <div class="velo" transition:fade={{ duration: dura(250) }} onclick={(e) => e.target === e.currentTarget && cerrarCapa()} role="presentation">
    <div class="premio final-partida" role="dialog" aria-modal="true" aria-labelledby="fin-titulo" aria-describedby="fin-causa" use:capa={cerrarFin} in:scale={{ duration: dura(450), start: 0.85, easing: cubicOut }}>
      <p class="corona">{solo ? 'Cronología completada' : 'Fin de la partida'}</p>
      <!-- Quien gana: su moneda da una vuelta y se le estampa el sello, en tinta, como en la imprenta. -->
      <div class="podio" aria-hidden="true">
        {#each fin as i (i)}
          <div class="ganadora"><Moneda avatar={vista.jugadores[i].avatar} nombre={vista.jugadores[i].nombre} gesto="gana" /></div>
        {/each}
        <span class="sello">{solo ? 'Hecho' : fin.length > 1 ? 'Ganan' : 'Gana'}</span>
      </div>
      <h2 id="fin-titulo">{solo ? '¡Hecho!' : `¡${ganan(fin)}!`}</h2>
      <p class="causa" id="fin-causa">{causa}</p>
      <h3 class="sr-only">Cartas que le quedan a cada uno</h3>
      <ul class="marcador">
        {#each marcador as { j, i } (i)}
          <li class:ganador={fin.includes(i)}>
            <span class="moneda-marcador"><Moneda avatar={j.avatar} nombre={j.nombre} gesto={fin.includes(i) ? 'gana' : 'pierde'} /></span>
            <span class="quien-es">
              <b>{j.nombre}</b>
              <small>{j.aciertos} {j.aciertos === 1 ? 'acierto' : 'aciertos'} · {j.fallos} {j.fallos === 1 ? 'fallo' : 'fallos'}</small>
            </span>
            <span class="quedan" class:fuera={j.eliminado}>
              {#if j.eliminado}fuera{:else}<span class="cartita cifras">{j.mano.length}</span><span class="sr-only">{j.mano.length === 1 ? ' carta' : ' cartas'}</span>{/if}
            </span>
          </li>
        {/each}
      </ul>
      {#if falladas.length}
        <details class="repaso">
          <summary>Cartas que no encajaron <span class="cifras">({falladas.length})</span></summary>
          <ul>
            {#each falladas as f (f.id + f.quien)}
              <li>
                <span class="anio cifras">{anioDe(f.id) || '?'}</span>
                <span class="texto-fallada">{@html porId[f.id].texto}{#if !solo}<small> · {vista.jugadores[f.quien].nombre}</small>{/if}</span>
              </li>
            {/each}
          </ul>
        </details>
      {/if}
      <div class="acciones">
        {#if onotra}
          <button class="boton" onclick={onotra}>Otra partida</button>
        {:else}
          <p class="corona">{quienReparte ? `Esperando a que ${quienReparte} reparta otra` : 'Quien reparte puede empezar otra partida'}</p>
        {/if}
        {#if oncambiar}<button class="boton secundario" onclick={oncambiar}>{textoCambiar}</button>{/if}
        <button class="boton secundario" onclick={cerrarCapa}>Ver la cronología</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .mesa {
    /* La mano, solapada y algo mayor que antes (UI-5): unos 105 px en un móvil. */
    --carta-mano: min(27vw, 150px, 16.5dvh);
    position: relative;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Barra superior: salir, marca y las dos pilas */
  .barra {
    grid-area: barra;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(10px + env(safe-area-inset-top)) 18px 4px 12px;
  }
  .titulo {
    min-width: 0;
    overflow: hidden;
    font-size: 1.5rem;
    margin-right: auto;
  }
  .pilas {
    display: flex;
    gap: 16px;
    margin-left: 6px;
  }
  figure {
    margin: 0;
    display: grid;
    justify-items: center;
    gap: 1px;
  }
  figcaption {
    font-size: 0.82rem;
    color: var(--gris-claro);
    font-style: italic;
  }
  .pila {
    position: relative;
    width: 40px;
    aspect-ratio: 554 / 766;
    border-radius: 3px;
    display: grid;
    place-items: center;
    font-family: 'Fell SC', serif;
    font-size: 1.05rem;
    padding: 0;
  }
  .descartes {
    border: 1px dashed rgb(235 233 217 / 0.4);
    background: rgb(0 0 0 / 0.2);
    cursor: pointer;
  }
  .descartes:disabled { cursor: default; }
  /* zona táctil más amplia que el dibujo */
  .descartes::after {
    content: '';
    position: absolute;
    inset: -8px -8px -20px;
  }
  .encima {
    --ancho: 100%;
    position: absolute;
    inset: 0;
  }
  /* Cuántas cartas hay en los descartes: una cartita de papel, como la de las monedas; no es una alarma. */
  .cuenta {
    position: absolute;
    right: -8px;
    top: -6px;
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    border-radius: 3px;
    background: var(--papel-2);
    color: var(--tinta);
    box-shadow:
      0 0 0 1px rgb(29 29 27 / 0.55),
      0 2px 4px rgb(0 0 0 / 0.5);
    font-family: var(--fell-sc);
    font-size: 0.85rem;
    line-height: 20px;
    text-align: center;
  }

  /* Jugadores: cada uno su moneda, con las cartas que le quedan y el nombre debajo.
     Las fichas se reparten el ancho según cuántos juegan: con seis, todas a la vista en un móvil de 390 px.
     Si aun así no caben (pantallas más estrechas), la lista se desplaza y el borde derecho se funde. */
  .jugadores {
    grid-area: jugadores;
    --ficha: clamp(54px, (100vw - 24px) / var(--j, 2) - 4px, 72px);
    --lado: clamp(42px, var(--ficha) - 16px, 46px);
    display: flex;
    gap: 4px;
    margin: 0;
    padding: 10px 12px 2px;
    list-style: none;
    overflow-x: auto;
    scrollbar-width: none;
    mask-image: linear-gradient(90deg, #000 calc(100% - 12px), transparent);
  }
  /* La ficha tiene un ancho mínimo y crece con el nombre (A11Y-9): con el texto al 200 % el nombre va en dos
     renglones y, si aun así no cabe, la lista se desplaza. */
  .jugadores li {
    flex: none;
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    gap: 5px;
    min-width: var(--ficha);
    max-width: max(var(--ficha), 5.4em);
    padding-top: 4px;
    color: var(--gris-claro);
    transition: opacity 0.3s;
  }
  .jugadores .nombre {
    max-width: 100%;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    text-align: center;
    font-size: 0.82rem;
    line-height: 1.15;
  }
  .jugadores li :global(.moneda) {
    outline: 2px solid transparent;
    outline-offset: 2px;
    transition:
      outline-color 0.3s,
      transform 0.3s var(--curva-posar);
  }
  /* Quien juega: un aro de papel alrededor de su moneda, sin brillo. */
  .jugadores li.activo { color: var(--papel); }
  .jugadores li.activo .nombre { font-weight: 700; }
  .jugadores li.activo :global(.moneda) {
    outline-color: var(--papel);
    transform: scale(1.08);
  }
  .jugadores li.ganador { color: var(--papel); }
  .jugadores li.ganador .nombre { font-weight: 700; }
  .jugadores li.ganador :global(.moneda) {
    outline: 3px solid var(--papel);
  }
  .jugadores li.ausente :global(.moneda) { opacity: 0.5; }
  .jugadores li.ausente .nombre::after {
    content: ' ⌁';
    color: #f0a3a3;
  }
  .jugadores li.eliminado { opacity: 0.6; }
  .jugadores li.eliminado .nombre { text-decoration: line-through; }

  /* La franja de la ronda: siempre a la vista, entre los jugadores y la cronología (INFO-1). */
  .franja {
    grid-area: franja;
    margin: 4px 16px 0;
    color: var(--gris-claro);
    font-size: 0.9rem;
    line-height: 1.25;
    text-align: center;
    text-wrap: balance;
  }
  .franja .ronda {
    color: var(--papel);
    font-family: var(--fell-sc);
    font-size: 1.02rem;
  }
  .franja .estado { font-style: italic; }

  /* Cronología */
  .crono {
    grid-area: crono;
    position: relative;
    flex: 1;
    min-height: 0;
    /* las cartas se miden contra el alto que queda libre, para que nunca se recorten */
    container-type: size;
    display: flex;
    align-items: center;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    /* La línea del tiempo, grabada en el tapete: un filete de sombra y, debajo, uno de luz. */
    background:
      linear-gradient(rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.5)) 0 calc(50% - 1px) / 100% 1.5px no-repeat,
      linear-gradient(rgb(235 233 217 / 0.13), rgb(235 233 217 / 0.13)) 0 calc(50% + 1px) / 100% 1px no-repeat;
  }
  @media (hover: hover) {
    .crono {
      scrollbar-width: thin;
      scrollbar-color: rgb(235 233 217 / 0.3) transparent;
    }
  }
  /* Las cartas de la cronología, a la medida de la mesa: tan grandes como dejen el alto libre y el ancho
     repartido entre las cartas que hay (--n), entre un mínimo legible y un máximo. Con una carta en un móvil
     de 390 px salen unos 240 px; con muchas, el mínimo, y la cronología se desplaza. */
  .tira {
    /* el alto de la carta, con aire para que al alzarse o ladearse no se recorte */
    --alto: calc((100cqh - 34px) / 1.42);
    --reparto: calc((100cqw - 24px) / var(--n) - 8px);
    --carta-crono: clamp(min(var(--alto), max(124px, 40cqw), 260px), var(--reparto), min(260px, var(--alto)));
    position: relative;
    display: flex;
    align-items: center;
    width: max-content;
    margin: 0 auto;
    padding: 14px 12px;
  }
  .pieza {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
  }
  /* Mientras se elige hueco las cartas encogen: caben más cartas y más huecos (52 px cada uno) a la vista. */
  .eligiendo .tira {
    --reparto: calc((100cqw - 24px - (var(--n) + 1) * 52px) / var(--n) - 8px);
    --carta-crono: clamp(min(var(--alto) * 0.84, max(96px, 28cqw), 220px), var(--reparto), min(220px, var(--alto) * 0.84));
  }
  .crono .naipe :global(.carta) {
    transition: width 0.28s var(--curva-deslizar);
  }
  /* Al acabar, sin mano, las cartas de la cronología crecen con el sitio que queda (UI-8). */
  .acabada .tira {
    --carta-crono: clamp(min(var(--alto), max(124px, 54cqw), 260px), var(--reparto), min(260px, var(--alto)));
  }
  /* Al acabar, la línea del tiempo se entinta de punta a punta, como una pasada de rodillo. */
  .tira.entintada::before {
    content: '';
    position: absolute;
    left: 6px;
    right: 6px;
    top: calc(50% - 1px);
    height: 2.5px;
    border-radius: 2px;
    background: rgb(235 233 217 / 0.7);
    transform-origin: left;
    animation: entintar 1.4s var(--curva-deslizar) 0.5s both;
  }
  @keyframes entintar {
    from { transform: scaleX(0); }
  }

  /* La tira de años y el botón de la lista */
  .anios {
    grid-area: anios;
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 2px 12px 0;
  }
  .ver-lista {
    flex: none;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    min-width: 44px;
    min-height: 44px;
    padding: 2px 6px;
    border: 0;
    border-radius: var(--radio-ficha);
    background: transparent;
    box-shadow: var(--borde-fantasma);
    color: var(--papel);
    font-size: 0.78rem;
    line-height: 1;
    cursor: pointer;
  }

  .crono .naipe {
    --ancho: var(--carta-crono);
    margin: 0 4px;
  }

  /* El hueco: la silueta discontinua de una carta, en color papel. Late dos veces al aparecer y se queda quieto. */
  .hueco {
    flex: none;
    width: 0;
    height: calc(var(--carta-crono) * 1.2);
    padding: 0;
    border: 0 dashed rgb(235 233 217 / 0.75);
    border-radius: var(--radio-ficha);
    background: rgb(235 233 217 / 0.08);
    color: var(--papel);
    font-size: 1.7rem;
    opacity: 0;
    overflow: hidden;
    pointer-events: none;
    cursor: pointer;
    transition:
      width 0.28s var(--curva-deslizar),
      height 0.28s var(--curva-deslizar),
      margin 0.28s var(--curva-deslizar),
      opacity 0.2s,
      background 0.15s;
  }
  .hueco span { pointer-events: none; }
  .eligiendo .hueco {
    width: 46px;
    margin: 0 3px;
    border-width: 2px;
    opacity: 1;
    pointer-events: auto;
    animation: latir 1.2s ease-in-out 2;
  }
  .hueco:hover,
  .hueco:focus-visible {
    background: rgb(235 233 217 / 0.2);
  }
  @keyframes latir {
    50% { background: rgb(235 233 217 / 0.2); }
  }

  .naipe {
    display: block;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    border-radius: 6px;
  }
  .cuerpo {
    position: relative;
    border-radius: 6px;
    transition:
      transform 0.25s var(--curva-posar),
      filter 0.25s;
  }
  /* Acierto: la carta se asienta en la mesa con un golpe seco. Fallo: se levanta un poco y se ladea, sin
     halo ni sacudida; lo que ha pasado lo dice el texto. */
  .cuerpo.ok {
    animation: asentar 0.32s var(--curva-posar);
  }
  @keyframes asentar {
    from { transform: translateY(-8px) scale(1.03); }
  }
  .cuerpo.fallo {
    transform: translateY(-6px) rotate(-4deg);
    filter: drop-shadow(0 10px 8px rgb(0 0 0 / 0.4));
  }

  /* Texto de la carta elegida, pistas y avisos */
  .leyenda {
    grid-area: leyenda;
    /* los años de la leyenda, con cifras de igual alto: el 1 no se confunde con una I */
    font-variant-numeric: lining-nums;
    min-height: 132px;
    padding: 4px 16px 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  .leyenda p { margin: 0; }
  .texto {
    font-size: 1.15rem;
    font-weight: 500;
    line-height: 1.2;
    text-wrap: balance;
  }
  .pista {
    text-wrap: balance;
    color: var(--gris-claro);
    font-style: italic;
    font-size: 0.95rem;
  }
  /* con el botón «Ampliar», el texto va entero en su renglón y el botón debajo */
  .pista:has(.ampliar) { text-wrap: wrap; }
  .pista b {
    color: var(--papel);
    font-style: normal;
  }
  .pista.grande {
    color: var(--papel);
    font-style: normal;
    font-weight: 500;
    font-size: 1.2rem;
  }
  /* El veredicto, en tinta de papel para todos: acertar y fallar se dicen con palabras, no con un color que
     señale a nadie. El título corto va en Fell SC; los años, debajo y en letra de interfaz, en un renglón. */
  .veredicto,
  .resultado {
    color: var(--papel);
    font-family: var(--fell-sc);
    font-size: 1.5rem;
    line-height: 1.15;
  }
  .veredicto .sub {
    display: block;
    margin-top: 1px;
    font-size: 1.12rem;
    font-weight: 500;
    line-height: 1.25;
    text-wrap: balance;
  }
  /* La jugada anterior, en pequeño bajo lo que toca hacer ahora */
  .pista.antes {
    margin-top: 6px;
    font-size: 0.9rem;
  }
  .antes .detalle { display: block; }
  /* ✓ y ✗ en tintas apagadas, del tono de la cartulina: informan sin destacar */
  .marca-jugada {
    margin-left: 0.15em;
    font-style: normal;
    font-weight: 700;
  }
  .marca-jugada.ok { color: #a9c7a4; }
  .marca-jugada.fallo { color: #d7aa9c; }
  .pista.nota { font-size: 0.88rem; }

  /* La cinta de turno (UI-6): una tira de papel con la moneda de quien juega, «Turno de» en cursiva y el nombre en
     Fell SC, enmarcada con un filete de tinta, como un rótulo impreso. El mismo papel para los avisos de dos niveles. */
  .cinta {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: min(100%, 460px);
    padding: 8px 22px 8px 10px;
    border-radius: var(--radio-ficha);
    background: var(--grano-papel), var(--papel);
    color: var(--tinta);
    box-shadow:
      inset 0 0 0 2px var(--tinta),
      inset 0 0 0 5px var(--papel),
      inset 0 0 0 6px rgb(29 29 27 / 0.4),
      0 10px 28px rgb(0 0 0 / 0.5);
    text-align: left;
  }
  .cinta.excepcional {
    padding: 12px 22px;
    text-align: center;
  }
  .moneda-cinta {
    --lado: 46px;
    flex: none;
    perspective: 400px;
  }
  /* La moneda de quien entra da una sola vuelta y se posa, sin rebote (ANIM-9). */
  .gira {
    display: block;
    animation: girar-moneda 0.6s var(--curva-voltear) both;
  }
  .cinta-texto {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .cinta-titulo {
    font-size: 1.6rem;
    line-height: 1.1;
  }
  .cinta-titulo i {
    font-family: var(--fell);
    font-size: 1.15rem;
  }
  .cinta-titulo b {
    font-family: var(--fell-sc);
    font-weight: normal;
    overflow-wrap: anywhere;
  }
  .cinta-detalle {
    color: #46453f;
    font-style: italic;
    font-size: 1rem;
    line-height: 1.25;
    text-wrap: balance;
  }

  /* Menú de la partida: las condiciones en una línea */
  .condiciones {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin: -0.2em 0 14px;
    padding: 0;
    list-style: none;
    color: #55544c;
    font-size: 0.92rem;
    line-height: 1.3;
  }
  /* el punto va al final de cada condición, para que ningún renglón empiece por él */
  .condiciones li:not(:last-child)::after {
    content: '\00a0·';
    margin-right: 0.4em;
  }
  .ampliar {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: 8px;
    min-height: 44px;
    padding: 0 12px 0 9px;
    border: 0;
    border-radius: 999px;
    background: rgb(235 233 217 / 0.1);
    box-shadow: var(--borde-fantasma);
    color: var(--papel);
    font-style: normal;
    font-weight: 500;
    cursor: pointer;
    vertical-align: middle;
  }
  svg {
    width: 1.15em;
    height: 1.15em;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .ver-lista svg {
    width: 20px;
    height: 20px;
  }
  .lupa {
    position: absolute;
    right: -6px;
    top: -8px;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--papel-2);
    color: var(--tinta);
    box-shadow:
      0 0 0 1.5px var(--tinta),
      0 2px 6px rgb(0 0 0 / 0.5);
    pointer-events: none;
  }
  .enlace {
    min-height: 44px;
    padding: 6px 8px;
    border: 0;
    background: none;
    color: var(--papel);
    text-decoration: underline;
    font-style: italic;
    cursor: pointer;
  }

  /* Mano: las cartas solapadas, en un abanico de ±3° como mucho (UI-5, ANIM-10). Si caben, con 6 px entre ellas;
     si no, se montan lo justo para caber en una fila. */
  .mano {
    grid-area: mano;
    container-type: inline-size;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    min-height: calc(var(--carta-mano) * 1.383 + 34px);
    padding: 18px 10px calc(16px + env(safe-area-inset-bottom));
  }
  .mano .naipe {
    --ancho: 100%;
    position: relative;
    flex: none;
    width: var(--carta-mano);
    margin-left: min(6px, (100cqw - var(--n) * var(--carta-mano)) / max(1, var(--n) - 1));
    rotate: var(--giro, 0deg);
    translate: 0 var(--baja, 0px);
    transform-origin: 50% 120%;
    transition:
      opacity 0.2s,
      rotate 0.25s var(--curva-posar),
      translate 0.25s var(--curva-posar);
  }
  .mano .naipe:first-child { margin-left: 0; }
  /* La elegida se alza de la mano: se endereza, sube y su sombra se alarga, como una cartulina que se levanta. */
  .mano .elegida {
    z-index: 2;
    rotate: 0deg;
    translate: 0 0;
  }
  .mano .elegida .cuerpo {
    transform: translateY(-12%);
    filter: drop-shadow(0 14px 10px rgb(0 0 0 / 0.55));
  }
  @media (hover: hover) {
    .mano .naipe:not(.elegida):hover .cuerpo { transform: translateY(-5%); }
  }
  .eligiendo .mano .naipe:not(.elegida) { opacity: 0.6; }
  .final {
    align-self: center;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  .final {
    gap: 8px;
  }
  .final .boton {
    min-height: 44px;
    padding-inline: 0.8em;
    font-size: 1.02rem;
  }

  /* Con la partida acabada, la cronología crece y ocupa la mesa (UI-8). */
  .acabada .mano {
    min-height: 0;
    padding-top: 8px;
  }
  .acabada .leyenda { min-height: 0; padding-block: 6px; }

  /* Final de la partida y ventanas de papel */
  .velo {
    position: fixed;
    inset: 0;
    z-index: 35;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(0 0 0 / 0.66);
  }
  .premio {
    --foco: var(--tinta);
    width: min(100%, 400px);
    max-height: calc(100dvh - 32px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 22px 20px;
    border-radius: var(--radio-hoja);
    background: var(--grano-papel), var(--papel-2);
    color: var(--tinta);
    text-align: center;
    box-shadow: var(--sombra-hoja);
  }
  .final-partida { width: min(100%, 420px); }
  .corona {
    margin: 0;
    font-style: italic;
    color: #55544c;
  }
  .premio h2 {
    margin: 0.1em 0 0.3em;
    font-size: 2.1rem;
    line-height: 1.1;
  }
  .causa {
    margin: 0 0 14px;
    color: #46453f;
    font-size: 1rem;
    line-height: 1.3;
    text-wrap: balance;
  }
  .acciones {
    display: grid;
    gap: 10px;
  }
  /* Menú de la partida */
  .opcion {
    display: grid;
    gap: 1px;
    min-height: 56px;
    padding: 8px 14px;
    border: 0;
    border-radius: var(--radio-ficha);
    background: transparent;
    box-shadow: var(--borde-fantasma);
    color: var(--tinta);
    text-align: left;
    cursor: pointer;
  }
  .opcion b { font-size: 1.1rem; }
  .opcion small {
    color: #55544c;
    font-size: 0.92rem;
    line-height: 1.2;
  }
  /* Quitar a un jugador: su moneda y su nombre */
  .quien {
    display: grid;
    gap: 8px;
    margin: 12px 0 14px;
    padding: 0;
    list-style: none;
  }
  .fila-jugador {
    --lado: 38px;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* El final: la moneda de quien gana da una sola vuelta y se posa, con un filete de tinta, y encima se le
     estampa un sello de tinta, como un tampón: sin dorado, sin brillo y sin rebote. */
  .podio {
    --lado: min(26vw, 104px, 15dvh);
    position: relative;
    display: flex;
    justify-content: center;
    gap: 14px;
    margin: 6px auto 8px;
    width: max-content;
    perspective: 600px;
  }
  .ganadora {
    position: relative;
    animation: girar-moneda 0.9s var(--curva-voltear) both;
  }
  .ganadora :global(.moneda) {
    box-shadow:
      0 0 0 3px var(--tinta),
      0 6px 16px rgb(0 0 0 / 0.4);
  }
  @keyframes girar-moneda {
    from {
      transform: rotateY(360deg);
      opacity: 0;
    }
    20% { opacity: 1; }
  }
  .sello {
    position: absolute;
    z-index: 2;
    right: -66px;
    bottom: 2px;
    /* un velo de papel bajo la tinta, para que el sello se lea aunque pise el canto de la moneda */
    background: rgb(245 244 234 / 0.6);
    padding: 1px 10px 0;
    border: 2.5px solid currentColor;
    border-radius: 5px;
    outline: 1px solid currentColor;
    outline-offset: 2px;
    color: rgb(29 29 27 / 0.86);
    font-family: var(--fell-sc);
    font-size: 1.45rem;
    letter-spacing: 0.06em;
    line-height: 1.2;
    rotate: -12deg;
    animation: estampar 0.32s var(--curva-posar) 0.95s both;
  }
  @keyframes estampar {
    from {
      transform: scale(1.7);
      opacity: 0;
    }
    to { opacity: 1; }
  }

  /* Marcador: monedas y cartitas con las cartas que quedan, en orden de cartas y sin puestos. */
  .marcador {
    --lado: 34px;
    display: grid;
    gap: 6px;
    margin: 0 0 12px;
    padding: 0;
    list-style: none;
    text-align: left;
  }
  .marcador li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 8px;
    border-top: 1px solid rgb(29 29 27 / 0.15);
  }
  .marcador li.ganador {
    border-top-color: transparent;
    border-radius: var(--radio-ficha);
    box-shadow: inset 0 0 0 1.5px var(--tinta);
  }
  .moneda-marcador { flex: none; }
  .quien-es {
    flex: 1;
    display: grid;
    min-width: 0;
    line-height: 1.2;
  }
  .quien-es b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .quien-es small {
    color: #55544c;
    font-size: 0.85rem;
  }
  /* las cartas que quedan, en una cartita de papel, de pie */
  .cartita {
    display: inline-grid;
    place-items: center;
    width: 26px;
    height: 36px;
    border-radius: 3px;
    background: var(--papel);
    box-shadow:
      0 0 0 1px rgb(29 29 27 / 0.55),
      0 2px 3px rgb(0 0 0 / 0.25);
    font-size: 1.05rem;
    font-weight: 700;
  }
  .quedan.fuera {
    color: #55544c;
    font-style: italic;
    font-size: 0.9rem;
  }

  /* Repaso de las cartas que no encajaron, plegado */
  .repaso {
    margin: 0 0 14px;
    text-align: left;
  }
  .repaso summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 0.3em;
    padding: 0 8px;
    border-radius: var(--radio-ficha);
    box-shadow: var(--borde-fantasma);
    font-weight: 500;
    cursor: pointer;
  }
  .repaso summary::before {
    content: '▸';
    color: #55544c;
  }
  .repaso[open] summary::before { content: '▾'; }
  .repaso ul {
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
  }
  .repaso li {
    display: grid;
    grid-template-columns: 5.4em 1fr;
    gap: 10px;
    padding: 5px 4px;
    border-bottom: 1px solid rgb(29 29 27 / 0.12);
    font-size: 0.95rem;
    line-height: 1.25;
  }
  .repaso .anio { font-weight: 700; }
  .texto-fallada { font-family: var(--fell); }
  .texto-fallada small {
    font-family: var(--ui);
    font-style: italic;
    color: #55544c;
  }

  .acciones .boton:not(.secundario) {
    background: var(--tinta);
    color: var(--papel);
    box-shadow:
      0 2px 0 #000,
      0 6px 14px rgb(0 0 0 / 0.25);
  }
  .acciones .secundario { color: var(--tinta); }

  /* Escritorio (UI-3, INFO-9): dos columnas. A la izquierda, los jugadores en columna y la leyenda debajo;
     a la derecha, la ronda, la cronología, la tira y la mano. Las cartas de la cronología llegan a unos 250 px. */
  @media (min-width: 1024px) and (min-height: 620px) {
    .mesa {
      --carta-mano: min(150px, 19dvh);
      display: grid;
      grid-template-columns: clamp(250px, 23vw, 330px) minmax(0, 1fr);
      grid-template-rows: auto auto minmax(0, 1fr) auto auto;
      grid-template-areas:
        'barra barra'
        'jugadores franja'
        'jugadores crono'
        'leyenda anios'
        'leyenda mano';
    }
    .jugadores {
      --lado: 52px;
      flex-direction: column;
      gap: 12px;
      padding: 18px 12px 12px 22px;
      overflow: hidden auto;
      mask-image: none;
    }
    .jugadores li {
      flex-direction: row-reverse;
      justify-content: flex-end;
      gap: 14px;
      width: auto;
      max-width: none;
      padding: 6px 0 2px 6px;
    }
    .jugadores .nombre {
      font-size: 1.08rem;
      text-align: left;
    }
    .leyenda {
      align-self: stretch;
      padding: 8px 12px 18px 22px;
    }
    .anios { margin: 4px 22px 0 12px; }
    .franja { margin-top: 10px; }
  }

  /* Pantallas bajas (UI-5): la cronología manda, con 110 px por carta como mínimo; la leyenda, sin alto fijo,
     las fichas, compactas, y la mano, más baja. */
  @media (max-height: 700px) {
    .mesa { --carta-mano: min(24vw, 140px, 13.5dvh); }
    .barra { padding-top: calc(6px + env(safe-area-inset-top)); }
    .jugadores {
      --lado: clamp(34px, var(--ficha) - 22px, 38px);
      padding-top: 6px;
    }
    .jugadores li { gap: 3px; }
    .jugadores .nombre { font-size: 0.76rem; }
    .franja { margin-top: 2px; font-size: 0.84rem; }
    .franja .ronda { font-size: 0.95rem; }
    .crono { min-height: calc(110px * 1.42 + 34px); }
    .eligiendo .tira {
      --carta-crono: clamp(min(var(--alto), max(96px, 28cqw), 220px), var(--reparto), min(220px, var(--alto)));
    }
    .leyenda {
      min-height: 0;
      padding-block: 4px;
    }
    .texto { font-size: 1.05rem; }
    .veredicto { font-size: 1.3rem; }
    .veredicto .sub { font-size: 1rem; }
    .cinta-titulo { font-size: 1.35rem; }
    .moneda-cinta { --lado: 38px; }
    .mano { padding-top: 12px; }
    /* al acabar, la causa ya está en el panel de resultados: la cronología se queda con el sitio */
    .acabada .leyenda .pista { display: none; }
    .acabada .resultado { font-size: 1.25rem; }
  }
  /* En los móviles más estrechos, la barra deja la marca para que quepan los botones y las pilas. */
  @media (max-width: 379.98px) {
    .titulo { visibility: hidden; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ganadora,
    .gira,
    .sello,
    .tira.entintada::before,
    .eligiendo .hueco,
    .cuerpo.ok {
      animation: none;
    }
    .cuerpo,
    .hueco,
    .mano .naipe {
      transition: none;
    }
  }
</style>
