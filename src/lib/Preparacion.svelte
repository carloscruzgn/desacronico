<script lang="ts">
  import { minimoCartas } from '../../compartido/clasico'
  import { AMBITOS, type Ambito } from '../../compartido/tipos'
  import { cartas, cuentaPorAmbito } from './datos'

  interface Props {
    onvolver: () => void
    onempezar: (nombres: string[], ids: string[]) => void
  }
  let { onvolver, onempezar }: Props = $props()

  const MAX_JUGADORES = 6
  const ambitos = Object.keys(AMBITOS) as Ambito[]

  let elegidos = $state<Record<Ambito, boolean>>({ comunicacion: true, social: true, cientifico: true, mujer: true, coria: true })
  let nombres = $state<string[]>(['', ''])

  const ids = $derived(cartas.filter((c) => elegidos[c.ambito]).map((c) => c.id))
  const error = $derived(
    ids.length === 0
      ? 'Elige al menos un ámbito.'
      : ids.length < minimoCartas(nombres.length)
        ? `Con ${nombres.length} jugadores hacen falta al menos ${minimoCartas(nombres.length)} cartas.`
        : '',
  )

  function empezar() {
    onempezar(
      nombres.map((n, i) => n.trim() || `Jugador ${i + 1}`),
      ids,
    )
  }
</script>

<main>
  <header>
    <button class="boton secundario pequeno" onclick={onvolver}>‹ Volver</button>
    <h2>Partida nueva</h2>
  </header>

  <section>
    <h3>Modo</h3>
    <div class="modos">
      <button class="modo activo">
        <b>Clásico</b>
        <span>Coloca tus cartas en la cronología. Gana quien se quede sin cartas.</span>
      </button>
      <button class="modo" disabled><b>Eras</b><span>Pronto</span></button>
      <button class="modo" disabled><b>Cooperativo</b><span>Pronto</span></button>
    </div>
  </section>

  <section>
    <h3>Mazo <small>{ids.length} cartas</small></h3>
    <div class="ambitos">
      {#each ambitos as a (a)}
        <label class="ambito" class:activo={elegidos[a]}>
          <input type="checkbox" bind:checked={elegidos[a]} />
          <span class="muestra {a}"></span>
          {AMBITOS[a]}
          <small>{cuentaPorAmbito[a]}</small>
        </label>
      {/each}
    </div>
  </section>

  <section>
    <h3>Jugadores <small>en este dispositivo, por turnos</small></h3>
    <div class="jugadores">
      {#each nombres as _, i (i)}
        <div class="jugador">
          <input type="text" maxlength="14" placeholder="Jugador {i + 1}" bind:value={nombres[i]} autocomplete="off" />
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

  <div class="pie">
    <p class="error" role="alert">{error}</p>
    <button class="boton" disabled={!!error} onclick={empezar}>Repartir</button>
  </div>
</main>

<style>
  main {
    max-width: 560px;
    margin: 0 auto;
    padding: 16px 16px calc(24px + env(safe-area-inset-bottom));
  }
  header {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  h2 {
    margin: 0;
    font-size: 1.7rem;
  }
  h3 {
    margin: 1.6em 0 0.5em;
    font-family: 'Fell SC', serif;
    font-weight: normal;
    font-size: 1.25rem;
    border-bottom: 1px solid rgb(235 233 217 / 0.25);
    padding-bottom: 0.2em;
  }
  h3 small {
    font-family: 'Fell', serif;
    font-style: italic;
    font-size: 0.95rem;
    color: var(--gris-claro);
    margin-left: 0.4em;
  }

  .modos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .modo {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    text-align: left;
    border: 1px solid rgb(235 233 217 / 0.3);
    border-radius: 6px;
    background: transparent;
    font-size: 0.95rem;
    line-height: 1.25;
  }
  .modo b {
    font-family: 'Fell SC', serif;
    font-weight: normal;
    font-size: 1.15rem;
  }
  .modo span { color: var(--gris-claro); }
  .modo.activo {
    grid-column: 1 / -1;
    background: var(--papel);
    color: var(--tinta);
    border-color: var(--papel);
  }
  .modo.activo span { color: #55544c; }
  .modo:disabled { opacity: 0.5; }

  .ambitos {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ambito {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 4px 12px 4px 8px;
    border: 1px solid rgb(235 233 217 / 0.3);
    border-radius: 999px;
    cursor: pointer;
    opacity: 0.55;
    transition:
      opacity 0.15s,
      background 0.15s;
  }
  .ambito.activo {
    opacity: 1;
    background: rgb(235 233 217 / 0.12);
    border-color: rgb(235 233 217 / 0.7);
  }
  .ambito input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .ambito:has(input:focus-visible) {
    outline: 2px solid #e8c66a;
  }
  .ambito small { color: var(--gris-claro); }
  .muestra {
    width: 22px;
    height: 30px;
    border-radius: 3px;
    border: 1px solid rgb(255 255 255 / 0.35);
  }
  .muestra.comunicacion { background: var(--comunicacion); }
  .muestra.social { background: var(--social); }
  .muestra.cientifico { background: var(--cientifico); }
  .muestra.mujer { background: var(--mujer); }
  .muestra.coria { background: var(--coria); }

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
  input::placeholder { color: var(--gris); }
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

  .pie {
    margin-top: 1.5em;
    display: grid;
    gap: 6px;
  }
  .error {
    min-height: 1.3em;
    margin: 0;
    color: #f0a3a3;
    text-align: center;
  }
</style>
