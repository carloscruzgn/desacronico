<script lang="ts">
  // La cronología y los descartes en lista, para consultarlos durante la partida (INFO-5, A11Y-16). Cada fila se
  // lee entera: el año, con cifras de interfaz, y el texto de la carta. Si le toca a quien la mira, se elige una
  // carta de la mano y se juega desde aquí con «Colocar aquí», entre fila y fila.
  import { tick } from 'svelte'
  import { fade, fly } from 'svelte/transition'
  import { eraDe, type Fecha } from '../../compartido/tipos'
  import BotonIcono from './BotonIcono.svelte'
  import { anioHablado, anioTexto, porId, textoPlano } from './datos'
  import { Toca } from './aparato'
  import { capa, cerrarCapa } from './capas'
  import { dura } from './movimiento'

  interface Props {
    /** Cartas de la cronología, de la más antigua a la más reciente. */
    cronologia: string[]
    descartes: string[]
    fechas: Record<string, Fecha>
    /** Con la opción de recolocar no hay descartes: no se enseña la pestaña. */
    conDescartes: boolean
    pestana: 'cronologia' | 'descartes'
    /** Si quien mira puede jugar ahora: su mano y la carta elegida. */
    juego: { mano: string[]; elegida: string | null } | null
    onelegir: (id: string) => void
    oncolocar: (posicion: number) => void
    /** `desde`: la miniatura de la fila, de la que sale la carta ampliada y a la que vuelve. */
    onampliar: (id: string, reverso: boolean, desde?: HTMLElement | null) => void
    oncerrar: () => void
  }
  let { cronologia, descartes, fechas, conDescartes, pestana = $bindable(), juego, onelegir, oncolocar, onampliar, oncerrar }: Props = $props()

  /** Con una carta ya elegida, la mano se pliega; «Cambiar» la vuelve a abrir. */
  let cambiando = $state(false)
  let hojaEl = $state<HTMLElement>()
  /** Al elegir, la mano se pliega y el foco va al primer «Colocar aquí». */
  async function escoger(id: string) {
    onelegir(id)
    cambiando = false
    await tick()
    hojaEl?.querySelector<HTMLElement>('.colocar')?.focus()
  }
  const anio = (id: string) => anioTexto(fechas[id])
  const dicho = (id: string | undefined) => (id ? anioHablado(fechas[id], false) : '')
  const recientes = $derived([...descartes].reverse())
  const elegida = $derived(juego?.elegida && juego.mano.includes(juego.elegida) ? juego.elegida : null)

  function dondeVa(k: number): string {
    const antes = cronologia[k - 1]
    const despues = cronologia[k]
    if (antes && despues) return `entre ${dicho(antes)} y ${dicho(despues)}`
    if (antes) return `al final, después de ${dicho(antes)}`
    return `al principio, antes de ${dicho(despues)}`
  }

  /** Pestañas: las flechas pasan de una a otra, como en cualquier lista de pestañas. */
  function teclaPestana(e: KeyboardEvent) {
    if (!conDescartes || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    e.preventDefault()
    pestana = pestana === 'cronologia' ? 'descartes' : 'cronologia'
    document.getElementById(`pestana-${pestana}`)?.focus()
  }
</script>

<div class="velo" transition:fade={{ duration: dura(180) }} onclick={(e) => e.target === e.currentTarget && cerrarCapa()} role="presentation">
  <div class="hoja" bind:this={hojaEl} role="dialog" aria-modal="true" aria-labelledby="lista-titulo" use:capa={oncerrar} in:fly={{ y: 24, duration: dura(240) }}>
    <header>
      <h2 id="lista-titulo">La partida en lista</h2>
      <BotonIcono icono="cerrar" etiqueta="Cerrar la lista" sobrePapel onclick={cerrarCapa} />
    </header>

    {#if juego}
      <section class="tuyas" aria-labelledby="lista-tuyas">
        {#if elegida && !cambiando}
          <h3 id="lista-tuyas">Vas a colocar</h3>
          <div class="elegida-fila">
            <p class="tuya elegida">{@html porId[elegida].texto}</p>
            <button class="cambiar" onclick={() => (cambiando = true)}>Cambiar</button>
          </div>
          <p class="pista">{Toca()} «Colocar aquí» donde creas que va.</p>
        {:else}
          <h3 id="lista-tuyas">Elige una de tus cartas</h3>
          <ul>
            {#each juego.mano as id, k (id)}
              <li>
                <button class="tuya" data-foco={k === 0 ? '' : undefined} onclick={() => escoger(id)} aria-label="{textoPlano(porId[id])}{elegida === id ? ', elegida' : ''}">
                  {@html porId[id].texto}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}

    <div class="pestanas" role="tablist" aria-label="Qué lista ver">
      <button id="pestana-cronologia" role="tab" aria-selected={pestana === 'cronologia'} aria-controls="lista-panel" tabindex={pestana === 'cronologia' ? 0 : -1} onclick={() => (pestana = 'cronologia')} onkeydown={teclaPestana}>
        Cronología <span class="cifras">({cronologia.length})</span>
      </button>
      {#if conDescartes}
        <button id="pestana-descartes" role="tab" aria-selected={pestana === 'descartes'} aria-controls="lista-panel" tabindex={pestana === 'descartes' ? 0 : -1} onclick={() => (pestana = 'descartes')} onkeydown={teclaPestana}>
          Descartes <span class="cifras">({descartes.length})</span>
        </button>
      {/if}
    </div>

    <div class="panel" id="lista-panel" role="tabpanel" aria-labelledby="pestana-{pestana}" tabindex="-1">
      {#if pestana === 'cronologia'}
        <ol>
          {#each cronologia as id, k (id)}
            {#if elegida}
              <li class="entre"><button class="colocar" onclick={() => oncolocar(k)} aria-label="Colocar aquí, {dondeVa(k)}">Colocar aquí</button></li>
            {/if}
            <li>
              <button class="fila" onclick={(e) => onampliar(id, true, e.currentTarget.querySelector('img'))}>
                <img src="/cartas/mini/{id}.webp" alt="" loading="lazy" />
                <span class="anio cifras {fechas[id] ? eraDe(fechas[id].anio) : ''}">{anio(id)}<span class="sr-only">: {anioHablado(fechas[id])}.</span></span>
                <span class="texto">{@html porId[id].texto}</span>
              </button>
            </li>
          {/each}
          {#if elegida}
            <li class="entre"><button class="colocar" onclick={() => oncolocar(cronologia.length)} aria-label="Colocar aquí, {dondeVa(cronologia.length)}">Colocar aquí</button></li>
          {/if}
        </ol>
      {:else if recientes.length}
        <p class="pista">La última descartada, arriba.</p>
        <ol>
          {#each recientes as id (id)}
            <li>
              <button class="fila" onclick={(e) => onampliar(id, true, e.currentTarget.querySelector('img'))}>
                <img src="/cartas/mini/{id}.webp" alt="" loading="lazy" />
                <span class="anio cifras {fechas[id] ? eraDe(fechas[id].anio) : ''}">{anio(id)}<span class="sr-only">: {anioHablado(fechas[id])}.</span></span>
                <span class="texto">{@html porId[id].texto}</span>
              </button>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="pista">Aún no hay cartas en los descartes.</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 28;
    display: grid;
    place-items: center;
    padding: 12px;
    background: rgb(0 0 0 / 0.66);
  }
  .hoja {
    --foco: var(--tinta);
    width: min(100%, 560px);
    max-height: calc(100dvh - 24px);
    display: flex;
    flex-direction: column;
    border-radius: var(--radio-hoja);
    background: var(--grano-papel), var(--papel-2);
    color: var(--tinta);
    box-shadow: var(--sombra-hoja);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 10px 0 18px;
  }
  h2 {
    margin: 0;
    font-size: 1.45rem;
    line-height: 1.1;
  }
  h3 {
    margin: 0 0 6px;
    font-family: var(--ui);
    font-weight: 700;
    font-size: 1rem;
  }
  .tuyas {
    margin: 8px 14px 0;
    padding: 10px 12px;
    border-radius: var(--radio-ficha);
    background: rgb(29 29 27 / 0.05);
    box-shadow: inset 0 0 0 1px rgb(29 29 27 / 0.15);
  }
  .tuyas ul {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tuya {
    width: 100%;
    min-height: 44px;
    padding: 6px 12px;
    border: 0;
    border-radius: var(--radio-ficha);
    background: transparent;
    box-shadow: var(--borde-fantasma);
    font-family: var(--fell);
    font-size: 1.02rem;
    line-height: 1.2;
    text-align: left;
    cursor: pointer;
  }
  .elegida-fila {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .tuya.elegida {
    flex: 1;
    margin: 0;
    display: flex;
    align-items: center;
    background: var(--tinta);
    color: var(--papel);
    box-shadow: none;
    cursor: default;
  }
  .cambiar {
    flex: none;
    min-height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: var(--radio-ficha);
    background: transparent;
    box-shadow: var(--borde-fantasma);
    color: var(--tinta);
    font-weight: 500;
    cursor: pointer;
  }
  .pista {
    margin: 6px 0 0;
    color: #55544c;
    font-style: italic;
    font-size: 0.92rem;
  }
  .pestanas {
    display: flex;
    gap: 4px;
    margin: 12px 14px 0;
    border-bottom: 1px solid rgb(29 29 27 / 0.25);
  }
  [role='tab'] {
    min-height: 44px;
    padding: 0 14px;
    border: 0;
    border-bottom: 3px solid transparent;
    background: none;
    color: #55544c;
    font-weight: 500;
    cursor: pointer;
  }
  [role='tab'][aria-selected='true'] {
    border-bottom-color: var(--tinta);
    color: var(--tinta);
    font-weight: 700;
  }
  .panel {
    padding: 4px 14px 16px;
  }
  .panel > .pista { margin: 8px 0 2px; }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .fila {
    display: grid;
    grid-template-columns: 40px minmax(4.6em, auto) 1fr;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 60px;
    padding: 6px 4px;
    border: 0;
    border-bottom: 1px solid rgb(29 29 27 / 0.12);
    background: none;
    text-align: left;
    cursor: zoom-in;
  }
  .fila img {
    width: 40px;
    height: 55px;
    object-fit: cover;
    border-radius: 3px;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
  }
  /* El año, con un filete del color de su era: el color informa de la era, como en la banda de la carta. */
  .anio {
    padding-left: 8px;
    border-left: 4px solid var(--gris);
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.15;
  }
  .anio.antigua { border-color: var(--antigua); }
  .anio.media { border-color: var(--media); }
  .anio.moderna { border-color: var(--moderna); }
  .anio.contemporanea { border-color: var(--contemporanea); }
  .texto {
    font-family: var(--fell);
    font-size: 1.02rem;
    line-height: 1.2;
  }
  .entre {
    display: flex;
    justify-content: center;
    padding: 4px 0;
  }
  .colocar {
    min-height: 40px;
    padding: 0 16px;
    border: 1.5px dashed rgb(29 29 27 / 0.55);
    border-radius: var(--radio-ficha);
    background: rgb(29 29 27 / 0.04);
    color: var(--tinta);
    font-weight: 700;
    cursor: pointer;
  }
  .colocar:hover { background: rgb(29 29 27 / 0.1); }
</style>
