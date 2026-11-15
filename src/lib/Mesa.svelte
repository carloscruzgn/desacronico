<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { flip } from 'svelte/animate'
  import { cubicOut } from 'svelte/easing'
  import { crossfade, fade, scale } from 'svelte/transition'
  import { mismoAnio, vecinas, type Anios, type VistaClasico } from '../../compartido/clasico'
  import { AMBITOS, eraDe, type Fecha } from '../../compartido/tipos'
  import Carta from './Carta.svelte'
  import type { Controlador, Suceso } from './control'
  import { anioHablado, anioTexto, cuentaPorAmbito, enLista, enMillones, porId, textoPlano } from './datos'
  import BotonIcono from './BotonIcono.svelte'
  import Confirmar from './Confirmar.svelte'
  import { dialogo } from './dialogo'
  import { desplazamiento, dura } from './movimiento'
  import Marca from './Marca.svelte'
  import Mazo from './Mazo.svelte'
  import Moneda from './Moneda.svelte'
  import Reglas from './Reglas.svelte'

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
  const { asiento, anfitrion, inicial } = control
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
  let nDescartes = $state(inicial.vista.descartes.length)
  let descarte = $state<string[]>(inicial.vista.descartes.slice(-1))
  let fechas = $state<Record<string, Fecha>>({})
  let seleccionada = $state<string | null>(null)
  let ocupado = $state(true)
  let aviso = $state<string | null>(null)
  let ampliada = $state<{ id: string; reverso: boolean } | null>(null)
  let fin = $state<number[] | null>(null)
  let verFin = $state(false)
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
    if (c && lista) lista.scrollTo({ left: c.offsetLeft - lista.offsetLeft - lista.clientWidth / 2 + c.offsetWidth / 2, behavior: desplazamiento() })
  })

  /** Con teclado, las flechas llevan de la carta elegida a los huecos y de un hueco a otro. */
  function flechas(e: KeyboardEvent) {
    if (!puedeColocar || ampliada || reglas || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
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
  /** Pausa entre los pasos de una animación: con movimiento reducido no hay animación y no se espera. */
  const espera = (ms: number) => new Promise((r) => setTimeout(r, dura(ms)))
  /** Tiempo para leer un aviso: no depende del movimiento. */
  const leer = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const anioDe = (id: string) => anioTexto(fechas[id])
  const anioDicho = (id: string | null, conCirca = true) => (id ? anioHablado(fechas[id], conCirca) : '')
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
  let confirma = $state<'' | 'abandonar' | 'sala'>('')

  /** Gesto de la moneda de cada jugador según cómo le va. */
  function gestoDe(i: number): 'normal' | 'pensando' | 'gana' | 'pierde' {
    if (fin) return fin.includes(i) ? 'gana' : 'pierde'
    if (vista.jugadores[i].eliminado) return 'pierde'
    return i === vista.turno ? 'pensando' : 'normal'
  }

  // Tira de años: qué parte de la cronología se está viendo.
  let ventana = $state({ izq: 0, ancho: 100 })
  function medirVentana() {
    if (!cronoEl) return
    const total = cronoEl.scrollWidth || 1
    ventana = { izq: (cronoEl.scrollLeft / total) * 100, ancho: Math.min(100, (cronoEl.clientWidth / total) * 100) }
  }
  $effect(() => {
    void [crono.length, puedeColocar]
    const reloj = setTimeout(medirVentana, 350)
    return () => clearTimeout(reloj)
  })

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
    repartir().then(atender)
    return dejar
  })

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
      const texto = asiento === v.turno ? (sinEmpezar ? 'Empiezas tú' : 'Tu turno') : `Turno de ${v.jugadores[v.turno].nombre}`
      narra = texto
      await anunciar(texto, 1000)
    }
    ocupado = false
  }

  /** Pone la mesa como dice la vista, sin animar la jugada (al retomar, reconectar o si alguien se va). */
  function poner(s: Suceso) {
    const v = s.vista
    // Si el turno cambia sin jugada (el anfitrión quita a alguien), también se cuenta.
    if (v.turno !== vista.turno && !v.ganadores.length)
      narra = asiento === v.turno ? 'Tu turno' : `Turno de ${v.jugadores[v.turno].nombre}`
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
    nDescartes = v.descartes.length
    descarte = v.descartes.slice(-1)
  }

  /** Un aviso a la vista. No habla: lo que oye el lector de pantalla va junto en `narra`, una vez por jugada. */
  async function anunciar(texto: string, ms: number) {
    aviso = texto
    await leer(ms)
    aviso = null
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

  async function animar(s: Suceso) {
    const r = s.jugada!
    const id = r.carta
    const jugador = r.jugador
    const suya = visible === jugador
    /** La partida antes de la jugada: con ella se dice dónde iba la carta. */
    const antes = vista
    ocupado = true
    // Quien lee una de sus cartas mientras juega otro no pierde la selección.
    if (seleccionada === id || visible === jugador) seleccionada = null
    conectados = s.conectados ?? null

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
      await espera(800)
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
      partes.push(`No encaja: ${dondeDicho}. ${destino}.${roba ? ` ${roba} carta.` : ''}`)
      detalle = `${donde} · ${detalle}`
      if (suya) navigator.vibrate?.(120)
      await espera(1700)
      if (r.recolocada === null) {
        // 3a. Fallo: a los descartes
        crono = crono.filter((p) => p.id !== id)
        descarte = [id]
        nDescartes++
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
      return
    }

    // Avisos de lo que no pasa en todas las jugadas, y de quién juega ahora.
    const avisos: [string, number][] = []
    // Quien coloca su última carta no gana todavía: los demás acaban la ronda.
    if (r.acierto && !r.finRonda && quedan === 0)
      avisos.push([`${tu && !local ? 'Te quedas' : quien + ' se queda'} sin cartas: los demás terminan la ronda`, 2400])
    if (r.desempate.length) {
      const empatados = enLista(r.desempate.map((d) => v.jugadores[d.jugador].nombre))
      const fuera = r.eliminados.length ? `. ${enLista(r.eliminados.map((i) => v.jugadores[i].nombre))} ${r.eliminados.length > 1 ? 'quedan' : 'queda'} fuera` : ''
      avisos.push([`${empatados} acaban a la vez: desempate${fuera}`, 2200])
    }
    const cambiaMano = manoDe(v) !== visible
    let turno = ''
    if (!solo) {
      if (local) turno = cambiaMano ? `Turno de ${v.jugadores[v.turno].nombre}` : ''
      else if (asiento === v.turno) turno = jugador !== asiento ? 'Tu turno' : ''
      else turno = `Turno de ${v.jugadores[v.turno].nombre}`
    }
    narra = [...partes, ...avisos.map(([t]) => t + '.'), turno && turno + '.'].filter(Boolean).join(' ')

    for (const [t, ms] of avisos) await anunciar(t, ms)
    if (cambiaMano) {
      origen = null
      // La carta elegida era de la mano que se va.
      seleccionada = null
      mano = []
      await espera(230)
      visible = manoDe(v)
      mano = [...v.jugadores[visible].mano]
      await anunciar(`Turno de ${v.jugadores[visible].nombre}`, 1100)
    } else {
      origen = mazoEl ?? null
      const debe = v.jugadores[visible]?.mano ?? []
      mano = mano.filter((x) => debe.includes(x))
      for (const x of debe) if (!mano.includes(x)) mano.push(x)
      if (!local && asiento === v.turno && jugador !== asiento) await anunciar('Tu turno', 900)
    }
    if (seleccionada && !mano.includes(seleccionada)) seleccionada = null
    ocupado = false
    recuperarFoco(id)
  }

  /** Cierra el panel final. El foco no puede volver al hueco de la última jugada, que ya no está a la vista. */
  async function cerrarFin() {
    verFin = false
    await tick()
    manoEl?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
  }

  /** «Ana», «Ana y Benito»… */
  function nombres(g: number[]) {
    return enLista(g.map((i) => vista.jugadores[i].nombre))
  }
  /** «Gana Ana», «Ganan Ana y Benito». */
  const ganan = (g: number[]) => `${g.length > 1 ? 'Ganan' : 'Gana'} ${nombres(g)}`
</script>

<svelte:window
  onkeydown={(e) => {
    if (menu || confirma) {
      if (e.key === 'Escape' && menu) menu = false
      return
    }
    flechas(e)
    if (e.key === 'Escape' && !reglas && quitando === null) {
      // el hueco con el foco va a desaparecer: el foco vuelve a la carta que estaba elegida
      if (document.activeElement?.classList.contains('hueco')) manoEl?.querySelector<HTMLElement>('.naipe.elegida')?.focus()
      ampliada = null
      seleccionada = null
    }
  }}
/>

<main class="mesa" class:eligiendo={puedeColocar}>
  <h1 class="sr-only" tabindex="-1" data-titulo>Partida</h1>
  <header class="barra">
    <BotonIcono icono="atras" etiqueta={fin ? 'Salir al menú' : 'Salir o abandonar la partida'} onclick={() => (fin ? onsalir() : (menu = true))} />
    <span class="titulo"><Marca /></span>
    <BotonIcono icono="reglas" etiqueta="Reglamento" onclick={() => (reglas = true)} />
    <div class="pilas">
      <figure>
        <Mazo n={nMazo} bind:el={mazoEl} />
        <figcaption>mazo</figcaption>
      </figure>
      {#if vista.opciones.alFallar === 'descartar'}
        <figure>
          <button
            class="pila descartes"
            disabled={!descarte.length}
            onclick={() => descarte[0] && (ampliada = { id: descarte[0], reverso: true })}
            aria-label="Descartes: {nDescartes} {nDescartes === 1 ? 'carta' : 'cartas'}. Ver la última"
          >
            {#each descarte as id (id)}
              <div class="encima" in:recibir={{ key: id }} out:enviar={{ key: id }}>
                <Carta carta={porId[id]} fecha={fechas[id]} volteada imagen="mini" />
              </div>
            {/each}
            {#if nDescartes}<span class="cuenta" aria-hidden="true">{nDescartes}</span>{/if}
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
          {#if j.eliminado}<span class="sr-only">, fuera de la partida</span>{/if}
          <span class="sr-only">, </span>
          <Moneda avatar={j.avatar} nombre={j.nombre} gesto={gestoDe(i)} n={fin ? undefined : cuentas[i]} />
        </li>
      {/each}
  </ul>

  <h2 class="sr-only">{tituloCrono}</h2>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="crono" bind:this={cronoEl} onscroll={medirVentana} onclick={(e) => e.target === e.currentTarget && (seleccionada = null)}>
    <!-- Cada carta lleva delante su hueco; la última, también el de detrás. Así la lista tiene una entrada por carta. -->
    <div class="tira" role="list" style:--n={Math.max(1, crono.length)}>
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

  {#if crono.length > 2}
    <!-- Tira de años: toda la cronología de un vistazo; tocar un año lleva hasta su carta. -->
    <div class="anios cifras" class:densa={crono.length > 8} aria-hidden="true" transition:fade={{ duration: dura(200) }}>
      {#each crono as p (p.id)}
        <button tabindex="-1" class={p.volteada && fechas[p.id] ? eraDe(fechas[p.id].anio) : ''} onclick={() => centrar(p.id)}>
          <span>{p.volteada && fechas[p.id] ? anioTexto({ anio: fechas[p.id].anio, circa: false }).replace(' millones', ' M') : '?'}</span>
        </button>
      {/each}
      <i style="left: {ventana.izq}%; width: {ventana.ancho}%"></i>
    </div>
  {/if}

  <p class="sr-only" role="status">{narra}</p>
  <div class="leyenda">
    {#if fin}
      <p class="resultado">{solo ? 'Cronología completada' : ganan(fin)}</p>
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
        {#if puedeColocar}{local && !solo ? `${nombreTurno}: ¿antes` : '¿Antes'} o después? Toca el hueco <b>+</b> donde creas que va<span class="sr-only">. Con el teclado, las flechas izquierda y derecha llevan a los huecos.</span>{:else if mirando || fuera}Estás mirando la partida{:else if !miTurno}Espera tu turno{/if}
        <button class="ampliar" onclick={() => (ampliada = { id: seleccionada!, reverso: false })}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" /></svg> Ampliar</button>
      </p>
    {:else}
      {#if !ocupado && miTurno}
        <p class="pista grande">{solo ? 'Elige una carta' : local ? `${nombreTurno}, elige una carta` : 'Tu turno: elige una carta'}</p>
        {#if novato(vista.turno)}
          <p class="pista">{crono.length < 2 ? 'Ordena las cartas por fecha: elige una y colócala antes o después' : 'Toca una carta para leerla; tócala otra vez para ampliarla'}</p>
        {/if}
      {:else if !ocupado}
        <p class="pista grande">Juega {nombreTurno}…</p>
        {#if conectados && !conectados[vista.turno]}
          <p class="pista">
            {nombreTurno} se ha desconectado. Esperando a que vuelva…
            {#if anfitrion}<button class="enlace" onclick={() => (quitando = vista.turno)}>Quitar de la partida</button>{/if}
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
  <div class="mano" class:muchas={mano.length > 5} bind:this={manoEl} role={!fin && mano.length ? 'group' : undefined} aria-labelledby={!fin && mano.length ? 'mano-titulo' : undefined}>
    {#if fin}
      <div class="final" in:fade>
        {#if onotra}<button class="boton" onclick={onotra}>Otra partida</button>{/if}
        <button class="boton secundario" onclick={onsalir}>Menú</button>
      </div>
    {:else}
      {#each mano as id (id)}
        <button
          class="naipe"
          class:elegida={seleccionada === id}
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

  {#if aviso}
    <div class="aviso" transition:scale={{ duration: dura(260), start: 0.85 }}>{aviso}</div>
  {/if}
</main>

{#if reglas}
  <Reglas oncerrar={() => (reglas = false)} />
{/if}

{#if ampliada}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="ampliada"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Carta ampliada. {ampliada.reverso && anioDe(ampliada.id) ? anioDicho(ampliada.id) + '. ' : ''}{textoPlano(porId[ampliada.id])}{ampliada.reverso ? '. Imagen: ' + porId[ampliada.id].credito : ''}"
    use:dialogo
    transition:fade={{ duration: dura(160) }}
    onclick={() => (ampliada = null)}
  >
    <div in:scale={{ duration: dura(260), start: 0.7, easing: cubicOut }}>
      <Carta carta={porId[ampliada.id]} fecha={fechas[ampliada.id]} volteada={ampliada.reverso} imagen="grande" />
    </div>
    <button class="cerrar">Toca para cerrar</button>
  </div>
{/if}

{#if menu}
  <div class="velo" transition:fade={{ duration: dura(180) }} onclick={(e) => e.target === e.currentTarget && (menu = false)} role="presentation">
    <div class="premio" role="dialog" aria-modal="true" aria-labelledby="menu-titulo" use:dialogo in:scale={{ duration: dura(220), start: 0.9 }}>
      <h2 id="menu-titulo">La partida</h2>
      <ul class="condiciones" aria-label="Condiciones de esta partida">
        {#each condiciones as c (c)}<li>{c}</li>{/each}
      </ul>
      <div class="acciones">
        <button class="boton" data-foco onclick={() => (menu = false)}>Seguir jugando</button>
        <button class="opcion" onclick={onsalir}>
          <b>Salir al menú</b>
          <small>{local ? 'La partida queda guardada para continuarla' : 'La partida sigue: podrás volver con el código de la sala'}</small>
        </button>
        {#if control.aLaSala}
          <button class="opcion" onclick={() => ((menu = false), (confirma = 'sala'))}>
            <b>Volver todos a la sala de espera</b>
            <small>Termina esta partida para todos</small>
          </button>
        {/if}
        {#if !mirando && !fuera}
          <button class="opcion" onclick={() => ((menu = false), (confirma = 'abandonar'))}>
            <b>Abandonar la partida</b>
            <small>{local ? 'Se termina aquí y no se guarda' : 'Tus cartas van a los descartes y los demás siguen'}</small>
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if confirma === 'abandonar'}
  <Confirmar
    titulo="¿Abandonar la partida?"
    texto={local ? 'La partida se termina y no se podrá continuar.' : 'Ya no podrás jugar esta partida, aunque sí seguir mirándola.'}
    si="Abandonar"
    no="Seguir jugando"
    onsi={() => {
      confirma = ''
      control.abandonar()
      if (local) onsalir()
    }}
    onno={() => (confirma = '')}
  />
{:else if confirma === 'sala'}
  <Confirmar
    titulo="¿Volver todos a la sala de espera?"
    texto="Esta partida se termina para todos los jugadores."
    si="Volver a la sala"
    no="Seguir jugando"
    onsi={() => ((confirma = ''), control.aLaSala?.())}
    onno={() => (confirma = '')}
  />
{/if}

{#if quitando !== null}
  <Confirmar
    titulo="¿Quitar a {vista.jugadores[quitando]?.nombre} de la partida?"
    texto="No podrá volver a esta partida."
    si="Quitar"
    onsi={() => (control.quitar?.(quitando!), (quitando = null))}
    onno={() => (quitando = null)}
  />
{/if}

{#if fin && verFin}
  <div class="velo" transition:fade={{ duration: dura(250) }}>
    <div class="premio" role="dialog" aria-modal="true" aria-labelledby="fin-titulo" use:dialogo in:scale={{ duration: dura(450), start: 0.8, easing: cubicOut }}>
      <p class="corona">{solo ? 'Cronología completada' : 'Fin de la partida'}</p>
      <div class="podio" aria-hidden="true">
        {#each fin as i (i)}
          <div class="ganadora"><Moneda avatar={vista.jugadores[i].avatar} nombre={vista.jugadores[i].nombre} gesto="gana" /></div>
        {/each}
      </div>
      <h2 id="fin-titulo">{solo ? '¡Hecho!' : `¡${ganan(fin)}!`}</h2>
      {#if !solo}
        <ul class="vencidos" aria-hidden="true">
          {#each vista.jugadores as j, i (i)}
            {#if !fin.includes(i)}
              <li style="--i: {i}; --giro: {((i * 37) % 17) - 8}deg"><Moneda avatar={j.avatar} nombre={j.nombre} gesto="pierde" /></li>
            {/if}
          {/each}
        </ul>
      {/if}
      <table>
        <thead><tr><th><span class="sr-only">Jugador</span></th><th>aciertos</th><th>fallos</th></tr></thead>
        <tbody>
          {#each vista.jugadores as j, i (i)}
            <tr class:ganador={fin.includes(i)}>
              <td>{j.nombre}</td><td>{j.aciertos}</td><td>{j.fallos}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="acciones">
        {#if onotra}
          <button class="boton" onclick={onotra}>Otra partida</button>
        {:else}
          <p class="corona">El anfitrión puede empezar otra partida.</p>
        {/if}
        {#if oncambiar}<button class="boton secundario" onclick={oncambiar}>Cambiar jugadores o mazo</button>{/if}
        <button class="boton secundario" onclick={cerrarFin}>Ver la cronología</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .mesa {
    --carta-crono: min(36vw, 200px, 29dvh);
    --carta-mano: min(22vw, 150px, 18dvh);
    position: relative;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Barra superior: salir, marca y las dos pilas */
  .barra {
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

  /* Jugadores */
  /* Jugadores: cada uno su moneda, con las cartas que le quedan y el nombre debajo */
  /* Las fichas se reparten el ancho según cuántos juegan: con seis, todas a la vista en un móvil de 390 px.
     Si aun así no caben (pantallas más estrechas), la lista se desplaza y el borde derecho se funde. */
  .jugadores {
    --ficha: clamp(54px, (100vw - 24px) / var(--j, 2) - 4px, 72px);
    --lado: clamp(42px, var(--ficha) - 16px, 46px);
    display: flex;
    gap: 4px;
    margin: 0;
    padding: 8px 12px 2px;
    list-style: none;
    overflow-x: auto;
    scrollbar-width: none;
    mask-image: linear-gradient(90deg, #000 calc(100% - 12px), transparent);
  }
  .jugadores li {
    flex: none;
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    gap: 5px;
    width: var(--ficha);
    color: var(--gris-claro);
    transition: opacity 0.3s;
  }
  .jugadores .nombre {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  /* Cronología */
  .crono {
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
    display: flex;
    align-items: center;
    width: max-content;
    margin: 0 auto;
    padding: 14px 12px;
  }
  .pieza {
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

  /* Tira de años */
  .anios {
    position: relative;
    display: flex;
    gap: 3px;
    margin: 2px 12px 0;
    padding: 3px;
    border-radius: 6px;
    background: rgb(0 0 0 / 0.22);
  }
  .anios button {
    flex: 1 1 0;
    min-width: 0;
    height: 30px;
    padding: 0;
    border: 0;
    border-bottom: 3px solid var(--gris);
    border-radius: 3px;
    background: rgb(235 233 217 / 0.1);
    color: var(--papel);
    font: inherit;
    font-size: 0.92rem;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    cursor: pointer;
  }
  .anios button.antigua { border-color: var(--antigua); }
  .anios button.media { border-color: var(--media); }
  .anios button.moderna { border-color: var(--moderna); }
  .anios button.contemporanea { border-color: var(--contemporanea); }
  .anios.densa button {
    height: 52px;
    font-size: 0.85rem;
  }
  .anios.densa span {
    display: inline-block;
    writing-mode: vertical-rl;
    rotate: 180deg;
  }
  /* la parte de la cronología que se está viendo */
  .anios i {
    position: absolute;
    top: 0;
    bottom: 0;
    border: 1.5px solid rgb(235 233 217 / 0.85);
    border-radius: 6px;
    pointer-events: none;
    transition:
      left 0.15s,
      width 0.15s;
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
    border-radius: 8px;
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

  /* Texto de la carta elegida y pistas */
  .leyenda {
    /* los años de la leyenda, con cifras de igual alto: el 1 no se confunde con una I */
    font-variant-numeric: lining-nums;
    min-height: 140px;
    padding: 4px 16px 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
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
    border: 1px solid rgb(235 233 217 / 0.5);
    border-radius: 999px;
    background: rgb(235 233 217 / 0.1);
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

  /* Mano */
  .mano {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 6px;
    min-height: calc(var(--carta-mano) * 1.383 + 30px);
    padding: 18px 10px calc(12px + env(safe-area-inset-bottom));
  }
  .mano .naipe {
    --ancho: 100%;
    flex: 0 1 var(--carta-mano);
    min-width: 0;
    transition: opacity 0.2s;
  }
  /* La elegida se alza de la mano: sube y su sombra se alarga, como una cartulina que se levanta. */
  .mano .elegida .cuerpo {
    transform: translateY(-12%);
    filter: drop-shadow(0 14px 10px rgb(0 0 0 / 0.55));
  }
  .eligiendo .mano .naipe:not(.elegida) { opacity: 0.6; }
  /* Con muchas cartas, dos filas: en una sola quedarían demasiado pequeñas para leerlas y tocarlas. */
  .mano.muchas {
    --carta-mano: min(19vw, 130px, 12dvh);
    flex-wrap: wrap;
    align-content: flex-end;
    row-gap: 10px;
    min-height: 0;
  }
  .mano.muchas .naipe { flex: 0 0 var(--carta-mano); }
  .final {
    align-self: center;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }

  /* Avisos de turno */
  .aviso {
    position: absolute;
    left: 50%;
    top: 42%;
    translate: -50% -50%;
    z-index: 20;
    max-width: 88vw;
    padding: 0.5em 1.3em;
    border-radius: 8px;
    background: var(--grano-papel), var(--papel);
    color: var(--tinta);
    font-family: 'Fell SC', serif;
    font-size: 1.6rem;
    text-align: center;
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.6);
    pointer-events: none;
  }

  /* Carta ampliada */
  .ampliada {
    --ancho: min(90vw, 60dvh, 480px);
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 14px;
    border: 0;
    padding: 0;
    background: rgb(0 0 0 / 0.94);
    cursor: zoom-out;
  }

  .cerrar {
    min-height: 44px;
    padding: 0 16px;
    border: 0;
    background: none;
    color: var(--papel);
    font-style: italic;
    cursor: zoom-out;
  }

  /* Final de la partida */
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
    padding: 22px 20px;
    border-radius: 12px;
    background: var(--grano-papel), var(--papel-2);
    color: var(--tinta);
    text-align: center;
    box-shadow: 0 20px 60px rgb(0 0 0 / 0.6);
  }
  .corona {
    margin: 0;
    font-style: italic;
    color: #55544c;
  }
  .premio h2 {
    margin: 0.1em 0 0.5em;
    font-size: 2.1rem;
    line-height: 1.1;
  }
  table {
    width: 100%;
    margin-bottom: 18px;
    border-collapse: collapse;
    font-size: 1.05rem;
  }
  th {
    font-weight: normal;
    font-style: italic;
    color: #55544c;
    font-size: 0.9rem;
  }
  td {
    padding: 5px 4px;
    border-top: 1px solid var(--gris-claro);
  }
  td:first-child { text-align: left; }
  tr.ganador td { font-weight: bold; }
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
    border-radius: 6px;
    background: transparent;
    box-shadow: inset 0 0 0 1px var(--gris);
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

  /* El final: la moneda de quien gana da una sola vuelta y se posa, con un filete de tinta;
     las de los demás, debajo */
  .podio {
    --lado: min(30vw, 116px);
    display: flex;
    justify-content: center;
    gap: 14px;
    margin: 4px 0 6px;
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
  .vencidos {
    --lado: 44px;
    display: flex;
    justify-content: center;
    gap: 10px;
    margin: 0 0 14px;
    padding: 0;
    list-style: none;
  }
  .vencidos li {
    rotate: var(--giro);
    animation: caer 0.5s var(--curva-posar) both;
    animation-delay: calc(0.7s + var(--i) * 0.12s);
  }
  @keyframes caer {
    from {
      transform: translateY(-40px);
      opacity: 0;
    }
  }

  .acciones .boton:not(.secundario) {
    background: var(--tinta);
    color: var(--papel);
    box-shadow:
      0 2px 0 #000,
      0 6px 14px rgb(0 0 0 / 0.25);
  }
  .acciones .secundario {
    color: var(--tinta);
    box-shadow: inset 0 0 0 1px var(--gris);
  }

  @media (prefers-reduced-motion: reduce) {
    .ganadora,
    .vencidos li,
    .eligiendo .hueco,
    .cuerpo.ok {
      animation: none;
    }
    .cuerpo,
    .hueco {
      transition: none;
    }
  }
</style>
