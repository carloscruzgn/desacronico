<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import BotonIcono from './BotonIcono.svelte'
  import { creditos, reglas } from './textos'

  let { oncerrar }: { oncerrar: () => void } = $props()
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && oncerrar()} />

<div class="velo" transition:fade={{ duration: 200 }} onclick={oncerrar} role="presentation"></div>
<div class="hoja" role="dialog" aria-modal="true" aria-label="Reglamento" transition:fly={{ y: 60, duration: 300 }}>
  <header>
    <h2>Reglamento</h2>
    <BotonIcono icono="cerrar" etiqueta="Cerrar" sobrePapel onclick={oncerrar} />
  </header>
  <div class="texto">
    {@html reglas}
    {@html creditos}
  </div>
</div>

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgb(0 0 0 / 0.6);
  }
  .hoja {
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
</style>
