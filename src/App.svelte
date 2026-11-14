<script lang="ts">
  import { crear } from '../compartido/clasico'
  import { esCodigo, type Config } from '../compartido/protocolo'
  import { controlLocal, type Controlador } from './lib/control'
  import { cargarAnios, guardarPartida, partidaGuardada } from './lib/datos'
  import EnLinea from './lib/EnLinea.svelte'
  import Inicio from './lib/Inicio.svelte'
  import Mesa from './lib/Mesa.svelte'
  import Preparacion from './lib/Preparacion.svelte'
  import Reglas from './lib/Reglas.svelte'

  // Un enlace de invitación (/?sala=ABCD) lleva directo a la partida en línea.
  const invitacion = (new URLSearchParams(location.search).get('sala') ?? '').toUpperCase()

  let pantalla = $state<'inicio' | 'preparacion' | 'mesa' | 'enlinea'>(esCodigo(invitacion) ? 'enlinea' : 'inicio')
  let reglas = $state(false)
  let guardada = $state.raw(partidaGuardada())

  // Lo necesario para montar la mesa local; `n` cambia en cada partida para empezar de cero.
  let partida = $state.raw<{ n: number; control: Controlador } | null>(null)
  let ultima: { nombres: string[]; ids: string[]; config: Config } | null = null

  async function empezar(nombres: string[], ids: string[], config: Config) {
    ultima = { nombres, ids, config }
    const estado = crear(ids, nombres, config.opciones)
    guardarPartida(estado)
    partida = { n: (partida?.n ?? 0) + 1, control: controlLocal(estado, await cargarAnios()) }
    pantalla = 'mesa'
  }

  async function continuar() {
    if (!guardada) return
    partida = { n: (partida?.n ?? 0) + 1, control: controlLocal(guardada, await cargarAnios()) }
    pantalla = 'mesa'
  }

  function salir() {
    guardada = partidaGuardada()
    pantalla = 'inicio'
  }
</script>

{#if pantalla === 'inicio'}
  <Inicio
    hayGuardada={!!guardada}
    onjugar={() => (pantalla = 'preparacion')}
    onenlinea={() => (pantalla = 'enlinea')}
    oncontinuar={continuar}
    onreglas={() => (reglas = true)}
  />
{:else if pantalla === 'preparacion'}
  <Preparacion onvolver={() => (pantalla = 'inicio')} onempezar={empezar} />
{:else if pantalla === 'enlinea'}
  <EnLinea invitacion={esCodigo(invitacion) ? invitacion : ''} onsalir={salir} />
{:else if partida}
  {#key partida.n}
    <Mesa
      control={partida.control}
      onsalir={salir}
      onotra={() => (ultima ? empezar(ultima.nombres, ultima.ids, ultima.config) : (pantalla = 'preparacion'))}
    />
  {/key}
{/if}

{#if reglas}
  <Reglas oncerrar={() => (reglas = false)} />
{/if}
