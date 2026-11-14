<script lang="ts">
  import { crear, type Anios, type EstadoClasico } from '../compartido/clasico'
  import { cargarAnios, guardarPartida, partidaGuardada } from './lib/datos'
  import Inicio from './lib/Inicio.svelte'
  import Mesa from './lib/Mesa.svelte'
  import Preparacion from './lib/Preparacion.svelte'
  import Reglas from './lib/Reglas.svelte'

  let pantalla = $state<'inicio' | 'preparacion' | 'mesa'>('inicio')
  let reglas = $state(false)
  let guardada = $state.raw(partidaGuardada())

  // Lo necesario para montar la mesa; `n` cambia en cada partida para empezar de cero.
  let partida = $state.raw<{ n: number; estado: EstadoClasico; nueva: boolean; anios: Anios } | null>(null)
  let ultima: { nombres: string[]; ids: string[] } | null = null

  async function empezar(nombres: string[], ids: string[]) {
    ultima = { nombres, ids }
    const estado = crear(ids, nombres)
    guardarPartida(estado)
    partida = { n: (partida?.n ?? 0) + 1, estado, nueva: true, anios: await cargarAnios() }
    pantalla = 'mesa'
  }

  async function continuar() {
    if (!guardada) return
    partida = { n: (partida?.n ?? 0) + 1, estado: guardada, nueva: false, anios: await cargarAnios() }
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
    oncontinuar={continuar}
    onreglas={() => (reglas = true)}
  />
{:else if pantalla === 'preparacion'}
  <Preparacion onvolver={() => (pantalla = 'inicio')} onempezar={empezar} />
{:else if partida}
  {#key partida.n}
    <Mesa
      inicial={partida.estado}
      nueva={partida.nueva}
      anios={partida.anios}
      onsalir={salir}
      onotra={() => (ultima ? empezar(ultima.nombres, ultima.ids) : (pantalla = 'preparacion'))}
    />
  {/key}
{/if}

{#if reglas}
  <Reglas oncerrar={() => (reglas = false)} />
{/if}
