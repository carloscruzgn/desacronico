<script lang="ts" module>
  import type { Era } from '../../compartido/tipos'

  export interface Muesca {
    id: string
    /** El año tal como se lee en la tira («1492», «-3500», «-13797 M»); vacío si la carta aún no se ha volteado. */
    anio: string
    era: Era | null
  }
</script>

<script lang="ts">
  // Tira de años: toda la cronología de un vistazo, con la parte que se está viendo marcada. Tocar un año
  // (o un punto del mapa) lleva hasta su carta. Tres niveles, según lo que quepa y no según cuántas cartas haya,
  // para que una pantalla grande enseñe más años sin tocar nada: los años en una fila; si no caben, en dos;
  // y si tampoco, un mapa de muescas del color de su era. Para el lector de pantalla está la lista.
  interface Props {
    piezas: Muesca[]
    /** Parte de la cronología que se ve, en % del total. */
    ventana: { izq: number; ancho: number }
    /** Lleva la carta al centro de la vista; `instantaneo`, sin deslizarse (mientras se arrastra por el mapa). */
    oncentrar: (id: string, instantaneo?: boolean) => void
  }
  let { piezas, ventana, oncentrar }: Props = $props()

  let pista: HTMLElement
  let ancho = $state(0)
  /** Cuerpo de los años en px: crece con la pantalla (ver .pista). */
  let cuerpo = $state(16)
  $effect(() => {
    void ancho
    if (pista) cuerpo = parseFloat(getComputedStyle(pista).fontSize) || 16
  })
  const n = $derived(piezas.length)
  /** Cada año necesita unos tres cuerpos de ancho para leerse derecho. */
  const nivel = $derived.by(() => {
    if (!ancho) return 'una'
    const cabe = (columnas: number) => (ancho - 6 - 3 * (columnas - 1)) / columnas >= 2.8 * cuerpo
    if (cabe(n)) return 'una'
    if (cabe(Math.ceil(n / 2))) return 'dos'
    return 'mapa'
  })
  const todo = $derived(ventana.ancho >= 99.5)
  /** En dos filas no cabe un marco: se señalan los años que se ven. */
  const visto = (i: number) => {
    const c = ((i + 0.5) / n) * 100
    return !todo && c >= ventana.izq && c <= ventana.izq + ventana.ancho
  }

  // En el mapa, el dedo elige la carta más cercana y un globo de papel dice su año. Al arrastrar, la cronología
  // sigue al dedo sin animar; un toque solo la lleva hasta allí deslizándose, y el globo se queda un momento.
  let activa = $state<number | null>(null)
  let arrastre = false
  let movido = false
  let reloj: ReturnType<typeof setTimeout> | undefined
  function cartaEn(e: PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    return Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n)))
  }
  function bajar(e: PointerEvent) {
    clearTimeout(reloj)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    arrastre = true
    movido = false
    activa = cartaEn(e)
  }
  function mover(e: PointerEvent) {
    if (!arrastre) return
    const k = cartaEn(e)
    if (k === activa) return
    activa = k
    movido = true
    oncentrar(piezas[k].id, true)
  }
  function soltar() {
    if (!arrastre) return
    arrastre = false
    if (activa !== null && !movido) oncentrar(piezas[activa].id)
    reloj = setTimeout(() => (activa = null), movido ? 250 : 900)
  }
  $effect(() => () => clearTimeout(reloj))
  const globo = $derived(activa !== null && activa < n ? piezas[activa] : null)
</script>

<div class="tira-anios {nivel}" aria-hidden="true">
  {#if nivel === 'mapa'}
    <span class="extremo cifras">{piezas[0]?.anio || '?'}</span>
  {/if}
  <div class="pista" bind:this={pista} bind:clientWidth={ancho} style:--columnas={nivel === 'dos' ? Math.ceil(n / 2) : n}>
    {#if nivel === 'mapa'}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="muescas"
        style:--n={n}
        onpointerdown={bajar}
        onpointermove={mover}
        onpointerup={soltar}
        onpointercancel={soltar}
      >
        {#each piezas as p, i (p.id)}<i class={p.era ?? 'nueva'} class:activa={i === activa}></i>{/each}
      </div>
      {#if globo && activa !== null}
        <span class="globo cifras" style:--x="{((activa + 0.5) / n) * 100}%">
          <span class={globo.era ?? 'nueva'}>{globo.anio || '?'}</span>
        </span>
      {/if}
    {:else}
      {#each piezas as p, i (p.id)}
        <button
          tabindex="-1"
          class="cifras {p.era ?? 'nueva'}"
          class:largo={p.anio.length > 5}
          class:visto={nivel === 'dos' && visto(i)}
          onclick={() => oncentrar(p.id)}
        >
          <span>{p.anio || '?'}</span>
        </button>
      {/each}
    {/if}
    {#if !todo && nivel !== 'dos'}
      <b class="ventana" style:left="{ventana.izq}%" style:width="{ventana.ancho}%"></b>
    {/if}
  </div>
  {#if nivel === 'mapa'}
    <span class="extremo cifras">{piezas[n - 1]?.anio || '?'}</span>
  {/if}
</div>

<style>
  .tira-anios {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex: 1;
  }
  .pista {
    position: relative;
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(var(--columnas), minmax(0, 1fr));
    gap: 3px;
    padding: 3px;
    border-radius: var(--radio-ficha);
    background: rgb(0 0 0 / 0.22);
    /* El cuerpo de los años, que también decide cuántos caben (ver `nivel`). */
    font-size: clamp(0.95rem, 0.85rem + 0.5vw, 1.4rem);
  }
  .mapa .pista {
    display: flex;
  }
  button {
    min-width: 0;
    height: 2em;
    padding: 0;
    border: 0;
    border-bottom: max(3px, 0.2em) solid var(--gris);
    border-radius: 3px;
    background: rgb(235 233 217 / 0.1);
    color: var(--papel);
    font-size: 1em;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    cursor: pointer;
  }
  .dos button {
    height: 1.85em;
  }
  /* «-13797 M» y compañía: más apretados, para que quepan enteros. */
  button.largo span {
    font-size: 0.78em;
    letter-spacing: -0.02em;
  }
  button.antigua { border-color: var(--antigua); }
  button.media { border-color: var(--media); }
  button.moderna { border-color: var(--moderna); }
  button.contemporanea { border-color: var(--contemporanea); }
  /* En dos filas, los años que se están viendo, con el mismo trazo que el marco de la ventana. */
  button.visto {
    background: rgb(235 233 217 / 0.24);
    box-shadow: inset 0 0 0 1.5px rgb(235 233 217 / 0.85);
  }
  /* La carta que se acaba de colocar y aún no enseña su año: hueca y en mostaza, como los huecos de la cronología. */
  button.nueva {
    background: transparent;
    border-bottom-color: transparent;
    box-shadow: inset 0 0 0 1.5px var(--acento);
    color: var(--acento);
  }

  /* Mapa de muescas: una raya por carta, del color de su era; las que aún no se han volteado, en gris. */
  .muescas {
    position: relative;
    flex: 1;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    align-items: center;
    height: 1.75em;
    cursor: pointer;
    /* El arrastre de lado es del mapa; el de arriba abajo sigue siendo de la página. */
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
  }
  /* Zona de toque de 44 px como mínimo, más alta que la pista que se ve. */
  .muescas::before {
    content: '';
    position: absolute;
    inset: -9px 0;
  }
  .muescas i {
    justify-self: center;
    width: clamp(2px, 40%, 6px);
    height: 1em;
    border-radius: 1px;
    background: var(--gris);
    transition: height 0.12s;
  }
  .muescas i.activa {
    height: 1.45em;
  }
  @media (prefers-reduced-motion: reduce) {
    .muescas i {
      transition: none;
    }
  }

  /* Globo de papel sobre el dedo con el año de la carta; no se sale por los lados de la tira. */
  .globo {
    position: absolute;
    bottom: calc(100% + 8px);
    left: clamp(2.4em, var(--x), calc(100% - 2.4em));
    translate: -50% 0;
    z-index: 3;
    padding: 0.3em 0.6em 0.25em;
    border-radius: var(--radio-ficha);
    background: var(--papel);
    color: var(--tinta);
    box-shadow: var(--sombra-hoja);
    font-size: 1.15em;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    pointer-events: none;
  }
  .globo span {
    display: block;
    padding-bottom: 0.2em;
    border-bottom: max(3px, 0.18em) solid var(--gris);
  }
  .globo .antigua { border-color: var(--antigua); }
  .globo .media { border-color: var(--media); }
  .globo .moderna { border-color: var(--moderna); }
  .globo .contemporanea { border-color: var(--contemporanea); }
  .globo .nueva { border-color: var(--acento); }
  .muescas i.antigua { background: var(--antigua); }
  .muescas i.media { background: var(--media); }
  .muescas i.moderna { background: var(--moderna); }
  .muescas i.contemporanea { background: var(--contemporanea); }
  .muescas i.nueva {
    width: 6px;
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--acento);
  }
  .extremo {
    flex: none;
    color: var(--papel);
    font-size: clamp(0.9rem, 0.8rem + 0.4vw, 1.25rem);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* La parte de la cronología que se está viendo */
  .ventana {
    position: absolute;
    top: 0;
    bottom: 0;
    border: 1.5px solid rgb(235 233 217 / 0.85);
    border-radius: var(--radio-ficha);
    pointer-events: none;
    transition:
      left 0.15s,
      width 0.15s;
  }
  @media (prefers-reduced-motion: reduce) {
    .ventana {
      transition: none;
    }
  }
</style>
