<script lang="ts">
  // Ajustes de la partida: mazo, cartas iniciales y qué pasa al fallar. Sirve para la local y para la sala en línea.
  import { MANO_MAX, MANO_MIN, OPCIONES } from '../../compartido/clasico'
  import type { Config } from '../../compartido/protocolo'
  import { AMBITOS, type Ambito } from '../../compartido/tipos'
  import { flip } from 'svelte/animate'
  import { cubicOut } from 'svelte/easing'
  import { crossfade } from 'svelte/transition'
  import { barajar } from '../../compartido/clasico'
  import Carta from './Carta.svelte'
  import { cartas, cuentaPorAmbito } from './datos'
  import AjustesSonido from './AjustesSonido.svelte'
  import { esteAparato, toca } from './aparato'
  import { dura } from './movimiento'

  interface Props {
    config: Config
    /** Solo lectura: lo ven así los que no son el anfitrión. */
    fija?: boolean
    oncambio: (c: Config) => void
  }
  let { config, fija = false, oncambio }: Props = $props()

  const ambitos = Object.keys(AMBITOS) as Ambito[]
  const elegidos = $derived(ambitos.filter((a) => config.ambitos.includes(a)))
  // La carta que enseña cada serie cuando está en el mazo: una cualquiera de las suyas.
  const muestra = Object.fromEntries(ambitos.map((a) => [a, barajar(cartas.filter((c) => c.ambito === a))[0]])) as Record<Ambito, (typeof cartas)[number]>
  // Al elegir una serie, su montón vuela al mazo de la partida; al quitarla, vuelve a su sitio.
  const [enviar, recibir] = crossfade({
    duration: () => dura(420),
    easing: cubicOut,
    fallback: () => ({ duration: dura(200), css: (t: number) => `opacity: ${t}` }),
  })
  const total = $derived(cartas.filter((c) => config.ambitos.includes(c.ambito)).length)
  const n = $derived(config.opciones.cartasIniciales)

  /** Aviso cuando se intenta quitar la última serie: el mazo no puede quedarse vacío. */
  let ultimaSerie = $state(false)
  let reloj: ReturnType<typeof setTimeout> | undefined
  function alternar(a: Ambito) {
    if (config.ambitos.length === 1 && config.ambitos.includes(a)) {
      ultimaSerie = true
      clearTimeout(reloj)
      reloj = setTimeout(() => (ultimaSerie = false), 4000)
      return
    }
    ultimaSerie = false
    const lista = config.ambitos.includes(a) ? config.ambitos.filter((x) => x !== a) : ambitos.filter((x) => x === a || config.ambitos.includes(x))
    oncambio({ ...config, ambitos: lista })
  }
  const nombreGrupo = `fallo-${Math.random().toString(36).slice(2, 8)}`
  function opciones(o: Partial<Config['opciones']>) {
    oncambio({ ...config, opciones: { ...config.opciones, ...o } })
  }
</script>

<section>
  <h2>Mazo <small>{total} cartas{fija ? '' : ` · ${toca()} una serie para quitarla o ponerla`}</small></h2>
  <div class="mazos">
    <div class="monton" class:vacio={!elegidos.length} aria-hidden="true">
      {#each elegidos as a, i (a)}
        <div class="hoja" animate:flip={{ duration: dura(350), easing: cubicOut }} in:recibir={{ key: a }} out:enviar={{ key: a }}>
          <div class="giro" style="--i: {i - (elegidos.length - 1) / 2}">
            <Carta carta={muestra[a]} imagen="mini" soloAnverso />
          </div>
        </div>
      {/each}
      <span class="total">{total}<small>cartas</small></span>
    </div>

    <div class="series">
      {#each ambitos as a (a)}
        {@const dentro = config.ambitos.includes(a)}
        <button class="serie {a}" class:dentro disabled={fija} aria-pressed={dentro} onclick={() => alternar(a)}>
          <span class="hueco">
            {#if !dentro}
              <span class="taco" in:recibir={{ key: a }} out:enviar={{ key: a }}></span>
            {:else}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5 10 17l8.5-9.5" /></svg>
            {/if}
          </span>
          <span class="nombre">{AMBITOS[a]}</span>
          <small>{cuentaPorAmbito[a]}<span class="sr-only"> cartas, {dentro ? 'en el mazo' : 'fuera del mazo'}</span></small>
        </button>
      {/each}
    </div>
    <p class="aviso-serie" role="status">{ultimaSerie ? 'Tiene que quedar al menos una serie' : ''}</p>
  </div>
</section>

<section>
  <h2>Dificultad</h2>
  <div class="fila">
    <span>
      Cartas por jugador
      <small>{n === OPCIONES.cartasIniciales ? 'como en el reglamento' : n < OPCIONES.cartasIniciales ? 'partida más corta' : 'partida más larga'}</small>
    </span>
    <span class="contador">
      <button disabled={fija || n <= MANO_MIN} aria-label="Menos cartas por jugador" onclick={() => opciones({ cartasIniciales: n - 1 })}>−</button>
      <b aria-live="polite" aria-atomic="true"><span class="sr-only">Cartas por jugador: </span>{n}</b>
      <button disabled={fija || n >= MANO_MAX} aria-label="Más cartas por jugador" onclick={() => opciones({ cartasIniciales: n + 1 })}>+</button>
    </span>
  </div>
  <!-- Botones de opción nativos: las flechas cambian de opción, como en cualquier formulario. -->
  <fieldset class="fallo" disabled={fija}>
    <legend class="sr-only">Al fallar</legend>
    <label>
      <input type="radio" name={nombreGrupo} value="descartar" checked={config.opciones.alFallar === 'descartar'} onchange={() => opciones({ alFallar: 'descartar' })} />
      <b>Al fallar, se descarta</b>
      <span>La carta sale de la mesa y se roba otra. Como en el reglamento.</span>
    </label>
    <label>
      <input type="radio" name={nombreGrupo} value="recolocar" checked={config.opciones.alFallar === 'recolocar'} onchange={() => opciones({ alFallar: 'recolocar' })} />
      <b>Al fallar, se recoloca</b>
      <span>La carta se queda en su sitio correcto y se roba otra. Más fácil.</span>
    </label>
  </fieldset>
</section>

<!-- El sonido es de cada aparato, no de la partida: se puede cambiar aunque los ajustes sean del anfitrión. -->
<section>
  <h2>Sonido <small>en {esteAparato()}</small></h2>
  <AjustesSonido />
</section>

<style>
  h2 {
    margin: 1.4em 0 0.5em;
    font-family: 'Fell SC', serif;
    font-weight: normal;
    font-size: 1.25rem;
    border-bottom: 1px solid rgb(235 233 217 / 0.25);
    padding-bottom: 0.2em;
  }
  small {
    font-family: var(--ui);
    font-style: italic;
    font-size: 0.95rem;
    color: var(--gris-claro);
    margin-left: 0.3em;
  }

  /* Elegir mazo: arriba, el mazo de la partida con una carta de cada serie elegida; abajo, las cinco
     series en su sitio. Tocar una serie la mete en el mazo o la saca. */
  .mazos {
    display: grid;
    gap: 6px;
  }
  .monton {
    --ancho: min(21vw, 92px);
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    height: calc(var(--ancho) * 1.383 + 30px);
    padding-top: 12px;
    border-radius: var(--radio-hoja, 14px);
    background: rgb(0 0 0 / 0.2);
    /* el abanico de la portada se cierra aquí y esto se pliega en el mazo de la mesa (App) */
    view-transition-name: baraja;
  }
  .monton.vacio {
    box-shadow: inset 0 0 0 1px rgb(240 163 163 / 0.5);
  }
  .hoja {
    margin: 0 calc(var(--ancho) * -0.24);
  }
  .giro {
    transform-origin: 50% 170%;
    transform: rotate(calc(var(--i) * 7deg));
    transition: transform 0.35s var(--curva-deslizar);
  }
  .total {
    position: absolute;
    left: 50%;
    bottom: 6px;
    translate: -50%;
    z-index: 2;
    display: flex;
    align-items: baseline;
    gap: 5px;
    padding: 0 12px;
    border-radius: 999px;
    background: var(--papel);
    color: var(--tinta);
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.5);
    font-family: var(--fell-sc);
    font-size: 1.35rem;
    line-height: 1.5;
  }
  .total small {
    margin: 0;
    color: #55544c;
    font-size: 0.85rem;
  }

  /* Con el texto al 200 % las series pasan a dos o tres filas en vez de apretarse. */
  .series {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(max(3.5rem, 17%), 1fr));
    gap: 4px;
  }
  .serie {
    --lomo: var(--gris);
    display: grid;
    justify-items: center;
    align-content: start;
    gap: 3px;
    min-height: 44px;
    padding: 4px 0 2px;
    border: 0;
    border-radius: 8px;
    background: none;
    cursor: pointer;
  }
  .serie.comunicacion { --lomo: var(--comunicacion); }
  .serie.social { --lomo: var(--social); }
  .serie.cientifico { --lomo: var(--cientifico); }
  .serie.mujer { --lomo: var(--mujer); }
  .serie.coria { --lomo: var(--coria); }
  /* El sitio de la serie: vacío y con su color cuando está en el mazo; con el montón apagado cuando no. */
  .hueco {
    position: relative;
    display: grid;
    place-items: center;
    width: 38px;
    aspect-ratio: 554 / 766;
    border-radius: 4px;
    border: 1.5px dashed rgb(235 233 217 / 0.35);
  }
  .dentro .hueco {
    border: 2px solid var(--papel);
    background: var(--lomo);
  }
  .hueco svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: var(--papel);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 2px #000) drop-shadow(0 0 1px #000);
  }
  .taco {
    position: absolute;
    inset: 2px;
    border-radius: 3px;
    background: var(--lomo);
    box-shadow:
      0 0 0 1.5px rgb(235 233 217 / 0.55),
      2px 2px 0 rgb(235 233 217 / 0.35),
      4px 4px 0 rgb(235 233 217 / 0.2);
    filter: saturate(0.6) brightness(0.85);
  }
  /* El nombre ocupa siempre dos renglones: las cifras de debajo quedan alineadas aunque alguno parta. */
  .nombre {
    min-height: 2.2em;
    display: grid;
    align-content: center;
    font-size: 0.82rem;
    line-height: 1.1;
    text-align: center;
    text-wrap: balance;
  }
  .serie small {
    margin: 0;
    font-size: 0.82rem;
  }
  .serie:not(.dentro) .nombre,
  .serie:not(.dentro) small {
    opacity: 0.6;
  }

  .fila {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    font-size: 1.08rem;
  }
  .fila small {
    display: block;
    margin-left: 0;
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
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  .fallo label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    text-align: left;
    border: 1px solid rgb(235 233 217 / 0.3);
    border-radius: var(--radio-ficha, 8px);
    background: transparent;
    line-height: 1.25;
    cursor: pointer;
  }
  .fallo b {
    font-weight: 700;
    font-size: 1.05rem;
  }
  .fallo span {
    font-size: 0.95rem;
    color: var(--gris-claro);
  }
  .fallo label {
    position: relative;
    padding-right: 34px;
    opacity: 0.75;
  }
  .fallo label:has(input:checked) {
    opacity: 1;
    background: rgb(235 233 217 / 0.14);
    border-color: var(--papel);
    box-shadow: inset 0 0 0 1px var(--papel);
  }
  /* el botón de opción de verdad no se ve: lo dibuja la etiqueta */
  .fallo input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }
  .fallo label:has(input:focus-visible) {
    outline: 2px solid var(--foco);
    outline-offset: 2px;
  }
  .fallo:disabled label { cursor: default; }
  /* el punto de la opción elegida */
  .fallo label::after {
    content: '';
    position: absolute;
    right: 10px;
    top: 12px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1.5px solid rgb(235 233 217 / 0.6);
  }
  .fallo label:has(input:checked)::after {
    border-color: var(--papel);
    background: radial-gradient(var(--papel) 0 45%, transparent 50%);
  }

  button:disabled { cursor: default; }
  .aviso-serie {
    min-height: 1.3em;
    margin: 2px 0 0;
    color: #f0a3a3;
    font-size: 0.95rem;
    text-align: center;
  }
  .contador button:disabled { opacity: 0.35; }
</style>
