<script lang="ts">
  import { MAX_JUGADORES, minimoCartas } from '../../compartido/clasico'
  import type { Config } from '../../compartido/protocolo'
  import { cartas, configGuardada, guardarConfig } from './datos'
  import BotonIcono from './BotonIcono.svelte'
  import Opciones from './Opciones.svelte'

  interface Props {
    /** Hay una partida a medias que se perderá al repartir otra. */
    hayGuardada?: boolean
    onvolver: () => void
    onempezar: (nombres: string[], ids: string[], config: Config) => void
  }
  let { hayGuardada = false, onvolver, onempezar }: Props = $props()

  let config = $state.raw(configGuardada())
  let nombres = $state<string[]>(['', ''])

  const ids = $derived(cartas.filter((c) => config.ambitos.includes(c.ambito)).map((c) => c.id))
  const minimo = $derived(minimoCartas(nombres.length, config.opciones.cartasIniciales))
  const error = $derived(
    ids.length === 0
      ? 'Elige al menos un ámbito.'
      : ids.length < minimo
        ? `Con ${nombres.length} jugadores y ${config.opciones.cartasIniciales} cartas hacen falta al menos ${minimo} cartas en el mazo.`
        : '',
  )

  function empezar() {
    guardarConfig(config)
    onempezar(
      nombres.map((n, i) => n.trim() || `Jugador ${i + 1}`),
      ids,
      config,
    )
  }
</script>

<main>
  <header>
    <BotonIcono icono="atras" etiqueta="Volver al menú" onclick={onvolver} />
    <h1 tabindex="-1" data-titulo>Nueva partida</h1>
  </header>

  <section>
    <h2>Jugadores <small>de 1 a {MAX_JUGADORES}; el nombre es opcional</small></h2>
    <div class="jugadores">
      {#each nombres as _, i (i)}
        <div class="jugador">
          <input type="text" maxlength="14" placeholder="Jugador {i + 1}" aria-label="Nombre del jugador {i + 1}" bind:value={nombres[i]} autocomplete="off" />
          {#if nombres.length > 1}
            <button class="quitar" aria-label="Quitar jugador {i + 1}" onclick={() => nombres.splice(i, 1)}>×</button>
          {/if}
        </div>
      {/each}
      {#if nombres.length < MAX_JUGADORES}
        <button class="anadir" onclick={() => nombres.push('')}>+ Añadir jugador</button>
      {/if}
    </div>
  </section>

  <Opciones {config} oncambio={(c) => (config = c)} />

  <div class="pie-fijo">
    <p class="error" role="alert">{error}</p>
    {#if hayGuardada && !error}<p class="nota">Al repartir se pierde la partida que quedó a medias.</p>{/if}
    <button class="boton" disabled={!!error} onclick={empezar}>Repartir</button>
  </div>
</main>

<style>
  main {
    max-width: 560px;
    margin: 0 auto;
    padding: 16px 16px 0;
  }
  header {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  h1 {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.1;
  }
  h2 {
    margin: 1.4em 0 0.5em;
    font-family: 'Fell SC', serif;
    font-weight: normal;
    font-size: 1.25rem;
    border-bottom: 1px solid rgb(235 233 217 / 0.25);
    padding-bottom: 0.2em;
  }
  h2 small {
    font-family: var(--ui);
    font-style: italic;
    font-size: 0.95rem;
    color: var(--gris-claro);
    margin-left: 0.3em;
  }

  .jugadores {
    display: grid;
    gap: 8px;
  }
  .jugador {
    display: flex;
    gap: 8px;
  }
  input[type='text'] {
    flex: 1;
    min-width: 0;
    min-height: 46px;
    padding: 0 12px;
    border: 1px solid rgb(235 233 217 / 0.35);
    border-radius: 6px;
    background: rgb(0 0 0 / 0.25);
    color: var(--papel);
    font: inherit;
    font-size: 1.1rem;
  }
  input::placeholder { color: #a3a297; }
  .quitar,
  .anadir {
    min-height: 46px;
    border: 1px dashed rgb(235 233 217 / 0.35);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
  }
  .quitar {
    width: 46px;
    font-size: 1.4rem;
  }
  .anadir { color: var(--gris-claro); }

  .nota {
    margin: 0;
    color: var(--gris-claro);
    font-style: italic;
    font-size: 0.95rem;
    text-align: center;
  }
  .error {
    margin: 0;
    color: #f0a3a3;
    text-align: center;
  }
</style>
