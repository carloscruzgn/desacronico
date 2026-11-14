<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import BotonIcono from './BotonIcono.svelte'
  import { dialogo } from './dialogo'
  import { dura } from './movimiento'
  import { creditos, reglas, resumen } from './textos'
  import Tutorial from './Tutorial.svelte'

  let { oncerrar }: { oncerrar: () => void } = $props()

  let tutorial = $state(false)

  // El reglamento, partido por sus títulos: cada apartado se pliega y la lista de títulos hace de índice.
  const apartados = reglas
    .split('<h3>')
    .slice(1)
    .map((trozo) => {
      const [titulo, cuerpo] = trozo.split('</h3>')
      return { titulo, cuerpo }
    })
  /** Modos del juego de mesa que la web todavía no tiene. */
  const pendiente = (titulo: string) => /eras|cooperativo/i.test(titulo)
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && !tutorial && oncerrar()} />

<div class="velo" transition:fade={{ duration: dura(200) }} onclick={oncerrar} role="presentation"></div>
<div class="hoja" role="dialog" aria-modal="true" aria-labelledby="reglas-titulo" use:dialogo transition:fly={{ y: 60, duration: dura(300) }}>
  <header>
    <h2 id="reglas-titulo">Reglamento</h2>
    <BotonIcono icono="cerrar" etiqueta="Cerrar" sobrePapel onclick={oncerrar} />
  </header>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="texto" tabindex="0" role="region" aria-label="Texto del reglamento">
    <section class="resumen">
      <h3>Cómo se juega, en un minuto</h3>
      {@html resumen}
      <button class="boton" onclick={() => (tutorial = true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
        Ver el tutorial animado
      </button>
    </section>

    <h3 class="rotulo">El reglamento del juego de mesa</h3>
    {#each apartados as a (a.titulo)}
      <details>
        <summary>
          <span>{a.titulo}{#if pendiente(a.titulo)}<small>aún no está en la web</small>{/if}</span>
        </summary>
        {@html a.cuerpo}
      </details>
    {/each}

    <h3 class="rotulo">Créditos</h3>
    <div class="creditos">{@html creditos}</div>
  </div>
</div>

{#if tutorial}
  <Tutorial oncerrar={() => (tutorial = false)} />
{/if}

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgb(0 0 0 / 0.6);
  }
  .hoja {
    --foco: var(--tinta);
    position: fixed;
    z-index: 41;
    inset: 4dvh 0 0;
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    background: var(--papel-2);
    color: var(--tinta);
    border-radius: 14px 14px 0 0;
    box-shadow: 0 -10px 40px rgb(0 0 0 / 0.5);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 10px 10px 20px;
    border-bottom: 1px solid var(--gris-claro);
  }
  h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  .texto {
    overflow-y: auto;
    padding: 4px 20px calc(32px + env(safe-area-inset-bottom));
    font-size: 1.08rem;
    line-height: 1.45;
  }
  .texto:focus-visible {
    outline-offset: -3px;
  }
  .texto :global(h3) {
    font-family: 'Fell SC', serif;
    font-weight: normal;
    font-size: 1.35rem;
    margin: 1.4em 0 0.3em;
  }
  .texto :global(p) {
    margin: 0 0 0.7em;
  }
  .texto :global(.nota) {
    padding: 10px 14px 2px;
    border-left: 3px solid var(--antigua);
    background: rgb(0 0 0 / 0.05);
  }

  .resumen {
    margin: 16px 0 0;
    padding: 2px 16px 16px;
    border-radius: 8px;
    background: var(--papel);
    box-shadow: inset 0 0 0 1px rgb(29 29 27 / 0.15);
  }
  .resumen h3 {
    margin-top: 0.6em;
  }
  .resumen :global(ol) {
    margin: 0 0 0.8em;
    padding-left: 1.3em;
  }
  .resumen :global(li) {
    margin-bottom: 0.35em;
    padding-left: 0.2em;
  }
  .resumen :global(li::marker) {
    font-family: var(--fell-sc);
    font-size: 1.15em;
  }
  .resumen .boton {
    width: 100%;
    background: var(--tinta);
    color: var(--papel);
    box-shadow: 0 2px 0 #000;
  }
  .resumen svg {
    width: 1.1em;
    height: 1.1em;
    fill: currentColor;
  }

  .rotulo {
    margin-bottom: 0.5em !important;
  }
  details {
    border-top: 1px solid var(--gris-claro);
  }
  details:last-of-type {
    border-bottom: 1px solid var(--gris-claro);
  }
  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 48px;
    font-family: var(--fell-sc);
    font-size: 1.2rem;
    line-height: 1.2;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::after {
    content: '';
    flex: none;
    width: 9px;
    height: 9px;
    margin-right: 6px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    rotate: 45deg;
    translate: 0 -3px;
    transition: rotate 0.2s;
  }
  details[open] summary::after {
    rotate: 225deg;
    translate: 0 2px;
  }
  summary small {
    display: block;
    font-family: var(--ui);
    font-style: italic;
    font-size: 0.9rem;
    color: #55544c;
  }
  details[open] {
    padding-bottom: 6px;
  }
  .creditos :global(h3) {
    font-size: 1.15rem;
    margin-top: 1em;
  }
</style>
