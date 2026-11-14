<script lang="ts">
  // Ajustes de la partida: mazo, cartas iniciales y qué pasa al fallar. Sirve para la local y para la sala en línea.
  import { MANO_MAX, MANO_MIN, OPCIONES } from '../../compartido/clasico'
  import type { Config } from '../../compartido/protocolo'
  import { AMBITOS, type Ambito } from '../../compartido/tipos'
  import { cartas, cuentaPorAmbito } from './datos'

  interface Props {
    config: Config
    /** Solo lectura: lo ven así los que no son el anfitrión. */
    fija?: boolean
    oncambio: (c: Config) => void
  }
  let { config, fija = false, oncambio }: Props = $props()

  const ambitos = Object.keys(AMBITOS) as Ambito[]
  const total = $derived(cartas.filter((c) => config.ambitos.includes(c.ambito)).length)
  const n = $derived(config.opciones.cartasIniciales)

  function alternar(a: Ambito) {
    const lista = config.ambitos.includes(a) ? config.ambitos.filter((x) => x !== a) : ambitos.filter((x) => x === a || config.ambitos.includes(x))
    oncambio({ ...config, ambitos: lista })
  }
  function opciones(o: Partial<Config['opciones']>) {
    oncambio({ ...config, opciones: { ...config.opciones, ...o } })
  }
</script>

<section>
  <h3>Mazo <small>{total} cartas</small></h3>
  <div class="ambitos">
    {#each ambitos as a (a)}
      <button class="ambito" class:activo={config.ambitos.includes(a)} disabled={fija} aria-pressed={config.ambitos.includes(a)} onclick={() => alternar(a)}>
        <span class="muestra {a}"></span>
        {AMBITOS[a]}
        <small>{cuentaPorAmbito[a]}</small>
      </button>
    {/each}
  </div>
</section>

<section>
  <h3>Dificultad</h3>
  <div class="fila">
    <span>
      Cartas en la mano
      {#if n === OPCIONES.cartasIniciales}<small>como en el reglamento</small>{/if}
    </span>
    <span class="contador">
      <button disabled={fija || n <= MANO_MIN} aria-label="Menos cartas" onclick={() => opciones({ cartasIniciales: n - 1 })}>−</button>
      <b>{n}</b>
      <button disabled={fija || n >= MANO_MAX} aria-label="Más cartas" onclick={() => opciones({ cartasIniciales: n + 1 })}>+</button>
    </span>
  </div>
  <div class="fallo" role="radiogroup" aria-label="Al fallar">
    <button role="radio" aria-checked={config.opciones.alFallar === 'descartar'} disabled={fija} onclick={() => opciones({ alFallar: 'descartar' })}>
      <b>Al fallar, se descarta</b>
      <span>La carta sale de la mesa. Como en el reglamento.</span>
    </button>
    <button role="radio" aria-checked={config.opciones.alFallar === 'recolocar'} disabled={fija} onclick={() => opciones({ alFallar: 'recolocar' })}>
      <b>Al fallar, se recoloca</b>
      <span>La carta se queda en su sitio correcto. Más fácil.</span>
    </button>
  </div>
</section>

<style>
  h3 {
    margin: 1.4em 0 0.5em;
    font-family: 'Fell SC', serif;
    font-weight: normal;
    font-size: 1.25rem;
    border-bottom: 1px solid rgb(235 233 217 / 0.25);
    padding-bottom: 0.2em;
  }
  small {
    font-family: 'Fell', serif;
    font-style: italic;
    font-size: 0.92rem;
    color: var(--gris-claro);
    margin-left: 0.3em;
  }

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
    background: transparent;
    cursor: pointer;
    opacity: 0.5;
    transition:
      opacity 0.15s,
      background 0.15s;
  }
  .ambito.activo {
    opacity: 1;
    background: rgb(235 233 217 / 0.12);
    border-color: rgb(235 233 217 / 0.7);
  }
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

  .fila {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    font-size: 1.08rem;
  }
  .contador {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .contador b {
    min-width: 1.6em;
    text-align: center;
    font-family: 'Fell SC', serif;
    font-weight: normal;
    font-size: 1.5rem;
  }
  .contador button {
    width: 44px;
    height: 44px;
    border: 1px solid rgb(235 233 217 / 0.4);
    border-radius: 50%;
    background: transparent;
    font-size: 1.4rem;
    cursor: pointer;
  }

  .fallo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .fallo button {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    text-align: left;
    border: 1px solid rgb(235 233 217 / 0.3);
    border-radius: 6px;
    background: transparent;
    line-height: 1.25;
    cursor: pointer;
  }
  .fallo b {
    font-family: 'Fell SC', serif;
    font-weight: normal;
    font-size: 1.08rem;
  }
  .fallo span {
    font-size: 0.92rem;
    color: var(--gris-claro);
  }
  .fallo button[aria-checked='true'] {
    background: var(--papel);
    color: var(--tinta);
    border-color: var(--papel);
  }
  .fallo button[aria-checked='true'] span { color: #55544c; }

  button:disabled { cursor: default; }
  .contador button:disabled { opacity: 0.35; }
</style>
