<script lang="ts">
  import { tick } from 'svelte'
  import { crear } from '../compartido/clasico'
  import { esCodigo, type Config } from '../compartido/protocolo'
  import { salaGuardada } from './lib/conexion.svelte'
  import { controlLocal, type Controlador } from './lib/control'
  import { cargarAnios, guardarPartida, partidaGuardada } from './lib/datos'
  import EnLinea from './lib/EnLinea.svelte'
  import Inicio from './lib/Inicio.svelte'
  import Mesa from './lib/Mesa.svelte'
  import Preparacion from './lib/Preparacion.svelte'
  import Reglas from './lib/Reglas.svelte'
  import Tutorial from './lib/Tutorial.svelte'

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

  // El botón «atrás» del móvil vuelve al menú (o cierra el reglamento) en vez de sacar de la web:
  // al salir del menú se apunta un paso en el historial, y volver es deshacerlo.
  function ir(a: Exclude<Pantalla, 'inicio'>) {
    if (pantalla === 'inicio') history.pushState({ dentro: true }, '')
    pantalla = a
  }
  function volver() {
    if (history.state?.dentro) history.back()
    else alInicio()
  }
  function alInicio() {
    guardada = partidaGuardada()
    sala = salaGuardada()
    directo = false
    // La invitación del enlace vale una vez: de vuelta en el menú ya no se recuerda.
    invitacion = ''
    if (location.search) history.replaceState(history.state, '', '/')
    pantalla = 'inicio'
  }
  function abrirReglas() {
    history.pushState({ dentro: true, reglas: true }, '')
    reglas = true
  }
  function cerrarReglas() {
    if (history.state?.reglas) history.back()
    else reglas = false
  }
  function atras() {
    if (reglas) reglas = false
    else if (pantalla !== 'inicio') alInicio()
  }

  async function empezar(nombres: string[], avatares: string[], ids: string[], config: Config) {
    ultima = { nombres, avatares, ids, config }
    const estado = crear(ids, nombres, config.opciones)
    estado.jugadores.forEach((j, i) => (j.avatar = avatares[i]))
    guardarPartida(estado)
    partida = { n: (partida?.n ?? 0) + 1, control: controlLocal(estado, await cargarAnios()) }
    ir('mesa')
  }

  async function continuar() {
    if (!guardada) return
    partida = { n: (partida?.n ?? 0) + 1, control: controlLocal(guardada, await cargarAnios()) }
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

<svelte:window onpopstate={atras} />

{#if pantalla === 'inicio'}
  <Inicio
    hayGuardada={!!guardada}
    {sala}
    onjugar={() => ir('preparacion')}
    onenlinea={() => ir('enlinea')}
    onsala={() => ((directo = true), ir('enlinea'))}
    oncontinuar={continuar}
    onreglas={abrirReglas}
    ontutorial={() => (tutorial = true)}
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
      onotra={() => (ultima ? empezar(ultima.nombres, ultima.avatares, ultima.ids, ultima.config) : (pantalla = 'preparacion'))}
    />
  {/key}
{/if}

{#if reglas}
  <Reglas oncerrar={cerrarReglas} />
{/if}

{#if tutorial}
  <Tutorial oncerrar={() => (tutorial = false)} />
{/if}
