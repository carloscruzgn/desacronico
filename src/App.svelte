<script lang="ts">
  import { flushSync, tick } from 'svelte'
  import { crear, topeValido } from '../compartido/clasico'
  import { esCodigo, type Config } from '../compartido/protocolo'
  import { abrirCapa, alVolver, apuntar, quedarse, volverAtras, type Capa, type Paso } from './lib/capas'
  import { salaGuardada } from './lib/conexion.svelte'
  import { controlLocal, type Controlador } from './lib/control'
  import { cargarAnios, cartas, guardarPartida, partidaGuardada, seriesDe } from './lib/datos'
  import EnLinea from './lib/EnLinea.svelte'
  import Inicio from './lib/Inicio.svelte'
  import Mesa from './lib/Mesa.svelte'
  import { reducido } from './lib/movimiento'
  import Preparacion from './lib/Preparacion.svelte'
  import Reglas from './lib/Reglas.svelte'
  import Tutorial, { narrarTutorial } from './lib/Tutorial.svelte'

  type Pantalla = 'inicio' | 'preparacion' | 'mesa' | 'enlinea'

  // Un enlace de invitación (/?sala=ABCD) lleva directo a la partida en línea.
  const deLaDireccion = (new URLSearchParams(location.search).get('sala') ?? '').toUpperCase()
  let invitacion = $state(esCodigo(deLaDireccion) ? deLaDireccion : '')

  let pantalla = $state<Pantalla>(esCodigo(deLaDireccion) ? 'enlinea' : 'inicio')
  let reglas = $state(false)
  let guardada = $state.raw(partidaGuardada())
  let sala = $state(salaGuardada())
  /** Entrar en la sala guardada sin pasar por el formulario. */
  let directo = $state(false)

  // Lo necesario para montar la mesa local; `n` cambia en cada partida para empezar de cero.
  let partida = $state.raw<{ n: number; control: Controlador } | null>(null)
  let ultima: { nombres: string[]; avatares: string[]; ids: string[]; config: Config } | null = null
  let tutorial = $state(false)

  // El historial: el menú es el paso de abajo; cada pantalla apunta uno encima y cada capa (reglamento,
  // tutorial, avatares, menú de la partida…) otro más (capas.ts). Así el «atrás» del móvil cierra primero
  // la capa de arriba, después vuelve al menú, y no saca de la web.
  // Quien llega con una invitación tiene el menú debajo: «atrás» le lleva a él, no fuera de la web.
  // svelte-ignore state_referenced_locally
  if (pantalla === 'enlinea' && !(history.state as Paso | null)?.dentro) {
    const aqui = location.pathname + location.search
    history.replaceState({ capas: 0 }, '', '/')
    history.pushState({ dentro: true, capas: 0 }, '', aqui)
  }

  /** Cambia de pantalla. Donde se puede, con una transición de vista: la marca, el abanico y el mazo
      viajan de una pantalla a otra (los nombres de vista están en el estilo de abajo). */
  function mostrar(a: Pantalla) {
    if (a === pantalla) return
    if (!document.startViewTransition || reducido()) return void (pantalla = a)
    // Si el navegador la salta (la ventana cambió de tamaño a mitad), el cambio de pantalla ya está hecho.
    document.startViewTransition(() => flushSync(() => (pantalla = a))).ready.catch(() => {})
  }

  function ir(a: Exclude<Pantalla, 'inicio'>) {
    if (pantalla === 'inicio') apuntar({ dentro: true })
    mostrar(a)
  }
  function volver() {
    if ((history.state as Paso | null)?.dentro) volverAtras(1)
    else {
      volverAtras(0)
      alInicio()
    }
  }
  function alInicio() {
    guardada = partidaGuardada()
    sala = salaGuardada()
    directo = false
    // La invitación del enlace vale una vez: de vuelta en el menú ya no se recuerda.
    invitacion = ''
    if (location.search) history.replaceState(history.state, '', '/')
    mostrar('inicio')
  }
  // «Atrás» que deja la pantalla sin ninguna capa abierta: antes se pregunta a la pantalla (la mesa puede
  // abrir su menú; la sala de espera libera el asiento o pide confirmación al anfitrión).
  alVolver((paso, propio) => {
    if (paso.dentro || pantalla === 'inicio') return
    if (!propio && quedarse()) return apuntar({ dentro: true })
    alInicio()
  })

  // El reglamento y el tutorial traen su propio diálogo y su Escape; aquí se les da su paso en el historial.
  let capaReglas: Capa | null = null
  function abrirReglas() {
    reglas = true
    capaReglas = abrirCapa(() => (reglas = false))
  }
  let capaTutorial: Capa | null = null
  function abrirTutorial() {
    tutorial = true
    capaTutorial = abrirCapa(() => (tutorial = false))
  }

  async function empezar(nombres: string[], avatares: string[], ids: string[], config: Config) {
    ultima = { nombres, avatares, ids, config }
    // Las series van con la partida, para poder decir con qué mazo se juega.
    const estado = crear(ids, nombres, { ...config.opciones, series: config.ambitos })
    estado.jugadores.forEach((j, i) => (j.avatar = avatares[i]))
    guardarPartida(estado)
    partida = { n: (partida?.n ?? 0) + 1, control: controlLocal(estado, await cargarAnios()) }
    ir('mesa')
  }

  async function continuar() {
    if (!guardada) return
    const g = guardada
    // Lo necesario para que «Otra partida» reparta con los mismos jugadores y el mismo mazo.
    const ambitos = seriesDe(g)
    g.opciones.series = ambitos
    ultima = {
      nombres: g.jugadores.map((j) => j.nombre),
      avatares: g.jugadores.map((j) => j.avatar ?? ''),
      ids: cartas.filter((c) => ambitos.includes(c.ambito)).map((c) => c.id),
      config: {
        ambitos,
        opciones: { cartasIniciales: g.opciones.cartasIniciales, alFallar: g.opciones.alFallar, topeCronologia: topeValido(g.opciones.topeCronologia) },
      },
    }
    partida = { n: (partida?.n ?? 0) + 1, control: controlLocal(g, await cargarAnios()) }
    ir('mesa')
  }

  // Cada pantalla tiene su título, y al cambiar se lleva el foco a él para quien usa lector de pantalla o teclado.
  const TITULOS: Record<Pantalla, string> = {
    inicio: 'desacrónico',
    preparacion: 'Nueva partida · desacrónico',
    mesa: 'Partida · desacrónico',
    enlinea: 'Partida en línea · desacrónico',
  }
  let primera = true
  $effect(() => {
    document.title = TITULOS[pantalla]
    if (primera) return void (primera = false)
    tick().then(() => document.querySelector<HTMLElement>('[data-titulo]')?.focus({ preventScroll: true }))
  })
</script>

{#if pantalla === 'inicio'}
  <Inicio
    hayGuardada={!!guardada}
    {sala}
    onjugar={() => ir('preparacion')}
    onenlinea={() => ir('enlinea')}
    onsala={() => ((directo = true), ir('enlinea'))}
    oncontinuar={continuar}
    onreglas={abrirReglas}
    ontutorial={abrirTutorial}
  />
{:else if pantalla === 'preparacion'}
  <Preparacion hayGuardada={!!guardada} onvolver={volver} onempezar={empezar} />
{:else if pantalla === 'enlinea'}
  <EnLinea {invitacion} {directo} onsalir={volver} />
{:else if partida}
  {#key partida.n}
    <Mesa
      control={partida.control}
      onsalir={volver}
      onotra={() => (ultima ? empezar(ultima.nombres, ultima.avatares, ultima.ids, ultima.config) : mostrar('preparacion'))}
      oncambiar={() => mostrar('preparacion')}
    />
  {/key}
{/if}

{#if reglas}
  <Reglas oncerrar={() => capaReglas?.cerrar()} />
{/if}

{#if tutorial}
  <!-- «¡A jugar!»: se cierra el tutorial y su paso en el historial pasa a ser el de la preparación. -->
  <Tutorial oncerrar={() => capaTutorial?.cerrar()} onjugar={() => (capaTutorial?.cerrar(), ir('preparacion'))} onnarrar={narrarTutorial} />
{/if}

<style>
  /* Una sola baraja que viaja entre pantallas (ANIM-12): la marca de la portada pasa a la barra de la mesa,
     el abanico de la portada se cierra en el montón de Opciones y este se pliega en el mazo de la mesa.
     Los nombres de la mesa se ponen desde aquí para no tocar su marcado. Con movimiento reducido no hay
     transición (mostrar() no la pide). */
  :global(.mesa .barra .titulo) {
    view-transition-name: marca;
  }
  :global(.mesa .pilas figure:first-child) {
    view-transition-name: baraja;
  }
  :global(::view-transition-group(*)) {
    animation-duration: 0.42s;
    animation-timing-function: var(--curva-deslizar);
  }
  :global(::view-transition-old(root)),
  :global(::view-transition-new(root)) {
    animation-duration: 0.28s;
  }
</style>
