<script lang="ts">
  import { tick } from 'svelte'
  import { AVATARES, avatarLibre } from '../../compartido/avatares'
  import { MAX_JUGADORES, minimoCartas } from '../../compartido/clasico'
  import type { Config } from '../../compartido/protocolo'
  import { cartas, configGuardada, guardarConfig, guardarJugadores, jugadoresGuardados } from './datos'
  import Avatares from './Avatares.svelte'
  import BotonIcono from './BotonIcono.svelte'
  import Icono from './Icono.svelte'
  import Moneda from './Moneda.svelte'
  import Opciones from './Opciones.svelte'

  interface Props {
    /** Hay una partida a medias que se perderá al repartir otra. */
    hayGuardada?: boolean
    onvolver: () => void
    onempezar: (nombres: string[], avatares: string[], ids: string[], config: Config) => void
  }
  let { hayGuardada = false, onvolver, onempezar }: Props = $props()

  let config = $state.raw(configGuardada())
  // Se proponen los jugadores de la última partida; si no hay, dos sin nombre.
  // Cada jugador nuevo empieza sin avatar (un círculo con «+»); al repartir, el que no lo haya elegido
  // recibe uno al azar entre los que nadie ha cogido.
  function nuevos() {
    return { nombres: ['', ''], avatares: ['', ''] }
  }
  // De la última partida se recupera el avatar solo de quien tenía nombre: un «Jugador 2» sin nombre no es nadie
  // a quien recordar, así que empieza vacío, con el «+».
  const guardados = jugadoresGuardados()
  const deAntes = guardados
    ? { nombres: guardados.nombres, avatares: guardados.avatares.map((a, i) => (guardados.nombres[i].trim() ? a : '')) }
    : nuevos()
  let nombres = $state<string[]>(deAntes.nombres)
  let avatares = $state<string[]>(deAntes.avatares)
  let eligiendo = $state<number | null>(null)
  const hayNombres = $derived(nombres.some((n) => n.trim()))
  let lista = $state<HTMLElement>()

  /** Lleva el foco al nombre del jugador `i` (o, si ya no hay ninguno ahí, al botón de añadir). */
  async function enfocar(i: number) {
    await tick()
    const campos = lista?.querySelectorAll<HTMLInputElement>('input[type="text"]') ?? []
    ;(campos[Math.min(i, campos.length - 1)] ?? lista?.querySelector<HTMLElement>('.anadir'))?.focus()
  }

  function empezarDeCero() {
    const n = nuevos()
    nombres = n.nombres
    avatares = n.avatares
    enfocar(0)
  }

  function anadir() {
    nombres.push('')
    avatares.push('')
    enfocar(nombres.length - 1)
  }
  function quitar(i: number) {
    nombres.splice(i, 1)
    avatares.splice(i, 1)
    // El foco va al jugador que ha ocupado su sitio, o al anterior si era el último.
    enfocar(i)
  }

  const ids = $derived(cartas.filter((c) => config.ambitos.includes(c.ambito)).map((c) => c.id))
  const minimo = $derived(minimoCartas(nombres.length, config.opciones.cartasIniciales))
  const error = $derived(
    ids.length === 0
      ? 'Elige al menos una serie.'
      : ids.length < minimo
        ? `Con ${nombres.length} jugadores y ${config.opciones.cartasIniciales} cartas hacen falta al menos ${minimo} cartas en el mazo.`
        : '',
  )

  // Lo que se va a repartir, debajo de «Repartir»: para comprobarlo antes de empezar.
  const resumen = $derived.by(() => {
    const j = nombres.length
    const c = config.opciones.cartasIniciales
    return `${j} ${j === 1 ? 'jugador' : 'jugadores'} · ${c} ${c === 1 ? 'carta' : 'cartas'}${j === 1 ? '' : ' cada uno'} · mazo de ${ids.length} ${ids.length === 1 ? 'carta' : 'cartas'}`
  })

  function empezar() {
    guardarConfig(config)
    // Se guardan las elecciones tal cual: quien no eligió avatar vuelve a salir sin él la próxima vez.
    guardarJugadores({ nombres: nombres.map((n) => n.trim()), avatares: [...avatares] })
    const finales: string[] = []
    for (const a of avatares) finales.push(a || avatarLibre([...avatares, ...finales]))
    onempezar(
      nombres.map((n, i) => n.trim() || `Jugador ${i + 1}`),
      finales,
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

  <div class="columnas">
    <section class="jugadores-seccion" aria-labelledby="jugadores-titulo">
      <h2 id="jugadores-titulo">Jugadores <small>de 1 a {MAX_JUGADORES}</small></h2>
      <!-- Cabecera visible de la lista: qué es cada columna. -->
      <p class="cabecera" aria-hidden="true"><span>Avatar</span><span>Nombre</span></p>
      <div class="jugadores" bind:this={lista}>
        {#each nombres as _, i (i)}
          <div class="jugador">
            {#if avatares[i]}
              <button class="moneda" aria-label="Avatar del jugador {i + 1}: {AVATARES[avatares[i]]}. Cambiar" title="Cambiar el avatar" onclick={() => (eligiendo = i)}>
                <Moneda avatar={avatares[i]} />
              </button>
            {:else}
              <button class="moneda" aria-label="Elegir el avatar del jugador {i + 1} (si no, se da uno al azar)" title="Elegir el avatar" onclick={() => (eligiendo = i)}>
                <span class="vacio" aria-hidden="true">+</span>
              </button>
            {/if}
            <input type="text" maxlength="14" placeholder="Jugador {i + 1}" aria-label="Nombre del jugador {i + 1}" bind:value={nombres[i]} autocomplete="off" enterkeyhint="next" />
            {#if nombres.length > 1}
              <button class="quitar" aria-label="Quitar al jugador {i + 1}{nombres[i].trim() ? `, ${nombres[i].trim()}` : ''}" onclick={() => quitar(i)}>×</button>
            {/if}
          </div>
        {/each}
        {#if nombres.length < MAX_JUGADORES}
          <button class="anadir" onclick={anadir}>+ Añadir jugador</button>
        {/if}
        {#if hayNombres}
          <button class="de-cero" onclick={empezarDeCero}>Nuevos jugadores</button>
        {/if}
      </div>
    </section>

    <div class="ajustes">
      <Opciones {config} oncambio={(c) => (config = c)} />
    </div>
  </div>

  <div class="pie-fijo">
    <p class="error" role="alert">{error}</p>
    {#if hayGuardada && !error}<p class="nota">Al repartir se pierde la partida que quedó a medias.</p>{/if}
    <button class="boton repartir" disabled={!!error} onclick={empezar}>
      <span class="dos-lineas">
        <span class="titulo-repartir"><Icono nombre="repartir" lado={32} />Repartir</span>
        <small>{resumen}</small>
      </span>
    </button>
  </div>
</main>

{#if eligiendo !== null}
  <Avatares
    titulo="Avatar de {nombres[eligiendo]?.trim() || `Jugador ${eligiendo + 1}`}"
    actual={avatares[eligiendo]}
    ocupados={avatares}
    onelegir={(a) => ((avatares[eligiendo!] = a), (eligiendo = null))}
    oncerrar={() => (eligiendo = null)}
  />
{/if}

<style>
  /* Con el pie fijo, lo que recibe el foco no puede quedar tapado por él. */
  :global(html:has(.pie-fijo)) {
    scroll-padding-bottom: 8rem;
  }
  /* «Repartir» destaca: su propia franja, más alto y con el resumen de la partida debajo. */
  .pie-fijo {
    padding-top: 12px;
    background: var(--tapete-2);
    border-top: 1px solid rgb(235 233 217 / 0.25);
  }
  .repartir {
    min-height: 64px;
    padding-inline: 0.6em;
    font-size: 1.35rem;
    box-shadow:
      0 3px 0 #b9b6a0,
      0 10px 24px rgb(0 0 0 / 0.55);
  }
  .titulo-repartir {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35em;
  }
  .dos-lineas {
    display: grid;
    line-height: 1.15;
  }
  .dos-lineas small {
    font-weight: 400;
    font-size: 0.82rem;
    color: #55544c;
    text-wrap: balance;
  }
  main {
    --radio-ficha: 8px;
    max-width: 560px;
    margin: 0 auto;
    padding: 16px 16px 0;
  }
  /* El título, centrado en la pantalla y no pegado a la flecha. */
  header {
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    align-items: center;
    gap: 14px;
  }
  h1 {
    margin: 0;
    text-align: center;
    font-size: 1.6rem;
    line-height: 1.1;
  }
  h2 {
    margin: 1.4em 0 0.5em;
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
  .cabecera {
    display: flex;
    gap: 8px;
    margin: 0 0 4px;
    color: var(--gris-claro);
    font-size: 0.9rem;
  }
  .cabecera span:first-child {
    min-width: 54px;
    text-align: center;
  }

  .jugadores {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
  .jugador {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .moneda {
    flex: none;
    width: 54px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    cursor: pointer;
  }
  input[type='text'] {
    flex: 1;
    min-width: 0;
    min-height: 46px;
    padding: 0 12px;
    border: 1px solid rgb(235 233 217 / 0.35);
    border-radius: var(--radio-ficha);
    background: rgb(0 0 0 / 0.25);
    color: var(--papel);
    font: inherit;
    font-size: 1.1rem;
  }
  /* Sin avatar elegido: un círculo vacío con «+», del tamaño del avatar. */
  .vacio {
    display: grid;
    place-items: center;
    width: 46px;
    aspect-ratio: 1;
    border: 1.5px dashed rgb(235 233 217 / 0.5);
    border-radius: 50%;
    color: var(--papel);
    font-size: 1.6rem;
    line-height: 1;
    transition: background 0.15s;
  }
  .moneda:hover .vacio { background: rgb(235 233 217 / 0.1); }
  input::placeholder { color: #a3a297; }
  /* Quitar y añadir, de papel como «Repartir»: se ven como botones. */
  .quitar,
  .anadir {
    min-height: 46px;
    border: 0;
    border-radius: var(--radio-ficha);
    background: var(--grano-papel), var(--papel);
    color: var(--tinta);
    box-shadow: 0 2px 0 #b9b6a0;
    cursor: pointer;
    transition:
      filter 0.15s,
      transform 0.12s;
  }
  .quitar:hover,
  .anadir:hover { filter: brightness(1.06); }
  .quitar:active,
  .anadir:active { transform: translateY(2px); }
  .quitar {
    width: 46px;
    font-size: 1.4rem;
  }
  .anadir {
    font-size: 1.05rem;
    font-weight: 700;
  }
  .de-cero {
    min-height: 46px;
    border: 1px dashed rgb(235 233 217 / 0.35);
    border-radius: var(--radio-ficha);
    background: transparent;
    color: var(--gris-claro);
    cursor: pointer;
  }

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

  /* Escritorio: los jugadores a la izquierda y el mazo y la dificultad a la derecha; «Repartir» en medio. */
  @media (min-width: 960px) {
    main {
      max-width: 1100px;
      padding-inline: 32px;
    }
    .columnas {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
      gap: 0 56px;
      align-items: start;
    }
    .pie-fijo {
      justify-items: center;
      /* en escritorio todo cabe: el pie no hace falta que flote ni que tape */
      position: static;
      border-top: 0;
      background: none;
    }
    .pie-fijo .boton {
      min-width: 320px;
    }
  }
</style>
