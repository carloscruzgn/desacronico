<script lang="ts">
  // Elegir personaje: las monedas disponibles, en una hoja de papel.
  import { fade, fly } from 'svelte/transition'
  import { AVATARES, IDS_AVATARES } from '../../compartido/avatares'
  import BotonIcono from './BotonIcono.svelte'
  import { dialogo } from './dialogo'
  import Moneda from './Moneda.svelte'
  import { dura } from './movimiento'

  interface Props {
    actual: string
    /** Personajes que ya tienen otros jugadores. */
    ocupados?: string[]
    onelegir: (avatar: string) => void
    oncerrar: () => void
  }
  let { actual, ocupados = [], onelegir, oncerrar }: Props = $props()
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && oncerrar()} />

<div class="velo" transition:fade={{ duration: dura(200) }} onclick={oncerrar} role="presentation"></div>
<div class="hoja" role="dialog" aria-modal="true" aria-labelledby="avatares-titulo" use:dialogo transition:fly={{ y: 60, duration: dura(280) }}>
  <header>
    <h2 id="avatares-titulo">Elige tu moneda</h2>
    <BotonIcono icono="cerrar" etiqueta="Cerrar" sobrePapel onclick={oncerrar} />
  </header>
  <div class="rejilla">
    {#each IDS_AVATARES as id (id)}
      {@const cogido = ocupados.includes(id) && id !== actual}
      <button class:actual={id === actual} disabled={cogido} aria-pressed={id === actual} data-foco={id === actual ? '' : undefined} onclick={() => onelegir(id)}>
        <Moneda avatar={id} gesto={id === actual ? 'gana' : 'normal'} />
        <span>{AVATARES[id]}{#if cogido}<small> (cogida)</small>{/if}</span>
      </button>
    {/each}
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
    --foco: var(--tinta);
    position: fixed;
    z-index: 41;
    inset: auto 0 0;
    max-width: 560px;
    max-height: 92dvh;
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
  .rejilla {
    --lado: min(19vw, 84px);
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--lado) + 8px), 1fr));
    gap: 14px 4px;
    padding: 16px 12px calc(20px + env(safe-area-inset-bottom));
  }
  button {
    display: grid;
    justify-items: center;
    align-content: start;
    gap: 6px;
    padding: 4px 0;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--tinta);
    font-size: 0.85rem;
    line-height: 1.15;
    text-align: center;
    cursor: pointer;
  }
  button :global(.moneda) {
    transition: transform 0.15s;
  }
  button.actual :global(.moneda) {
    outline: 3px solid var(--tinta);
    outline-offset: 3px;
  }
  button.actual span {
    font-weight: 700;
  }
  button:active:not(:disabled) :global(.moneda) {
    transform: scale(0.94);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  small {
    font-style: italic;
  }
</style>
