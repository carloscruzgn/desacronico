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
  // Tira de años: toda la cronología de un vistazo, con la parte que se está viendo enmarcada. Tocar un año
  // (o un punto del mapa) lleva hasta su carta. Tres niveles según cuántas cartas haya y el sitio (INFO-4, UI-7):
  // años en horizontal hasta 12, en vertical de 13 a 16 y, con más, un mapa de muescas del color de su era.
  // Si los años no caben a lo ancho, se pasa antes al nivel siguiente. Para el lector de pantalla está la lista.
  interface Props {
    piezas: Muesca[]
    /** Parte de la cronología que se ve, en % del total. */
    ventana: { izq: number; ancho: number }
    oncentrar: (id: string) => void
  }
  let { piezas, ventana, oncentrar }: Props = $props()

  let ancho = $state(0)
  const n = $derived(piezas.length)
  /** Lo que ocupa cada año: horizontal, a partir de 44 px; vertical, de 20 px. */
  const nivel = $derived.by(() => {
    const sitio = ancho ? ancho / n : Infinity
    if (n <= 12 && sitio >= 44) return 'horizontal'
    if (n <= 16 && sitio >= 20) return 'vertical'
    return 'mapa'
  })
  const todo = $derived(ventana.ancho >= 99.5)

  /** En el mapa, el punto tocado lleva a la carta más cercana. */
  function tocarMapa(e: MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const k = Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n)))
    oncentrar(piezas[k].id)
  }
</script>

<div class="tira-anios {nivel}" aria-hidden="true">
  {#if nivel === 'mapa'}
    <span class="extremo cifras">{piezas[0]?.anio || '?'}</span>
  {/if}
  <div class="pista" bind:clientWidth={ancho}>
    {#if nivel === 'mapa'}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="muescas" onclick={tocarMapa} style:--n={n}>
        {#each piezas as p (p.id)}<i class={p.era ?? ''}></i>{/each}
      </div>
    {:else}
      {#each piezas as p (p.id)}
        <button tabindex="-1" class="cifras {p.era ?? ''}" onclick={() => oncentrar(p.id)}>
          <span>{p.anio || '?'}</span>
        </button>
      {/each}
    {/if}
    {#if !todo}
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
    display: flex;
    gap: 3px;
    padding: 3px;
    border-radius: var(--radio-ficha);
    background: rgb(0 0 0 / 0.22);
  }
  button {
    flex: 1 1 0;
    min-width: 0;
    height: 30px;
    padding: 0;
    border: 0;
    border-bottom: 3px solid var(--gris);
    border-radius: 3px;
    background: rgb(235 233 217 / 0.1);
    color: var(--papel);
    font-size: 0.92rem;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    cursor: pointer;
  }
  .vertical button {
    height: 58px;
    font-size: 0.8rem;
  }
  .vertical button span {
    display: inline-block;
    writing-mode: vertical-rl;
    rotate: 180deg;
    letter-spacing: -0.01em;
  }
  button.antigua { border-color: var(--antigua); }
  button.media { border-color: var(--media); }
  button.moderna { border-color: var(--moderna); }
  button.contemporanea { border-color: var(--contemporanea); }

  /* Mapa de muescas: una raya por carta, del color de su era; las que aún no se han volteado, en gris. */
  .muescas {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    align-items: center;
    height: 26px;
    cursor: pointer;
  }
  .muescas i {
    justify-self: center;
    width: max(2px, min(4px, 40%));
    height: 16px;
    border-radius: 1px;
    background: var(--gris);
  }
  .muescas i.antigua { background: var(--antigua); }
  .muescas i.media { background: var(--media); }
  .muescas i.moderna { background: var(--moderna); }
  .muescas i.contemporanea { background: var(--contemporanea); }
  .extremo {
    flex: none;
    color: var(--papel);
    font-size: 0.85rem;
    font-weight: 500;
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
