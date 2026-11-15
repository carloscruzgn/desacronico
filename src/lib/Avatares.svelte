<script lang="ts">
  // Elegir personaje: las monedas disponibles, en una hoja de papel.
  import { fade, fly } from 'svelte/transition'
  import { SERIES_AVATARES } from '../../compartido/avatares'
  import { AMBITOS, type Ambito } from '../../compartido/tipos'
  import BotonIcono from './BotonIcono.svelte'
  import { dialogo } from './dialogo'
  import Moneda from './Moneda.svelte'
  import { dura } from './movimiento'

  interface Props {
    /** «Avatar de Ana»: de quién es la moneda que se elige. */
    titulo?: string
    actual: string
    /** Personajes que ya tienen otros jugadores. */
    ocupados?: string[]
    onelegir: (avatar: string) => void
    oncerrar: () => void
  }
  let { titulo = 'Tu avatar', actual, ocupados = [], onelegir, oncerrar }: Props = $props()
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && oncerrar()} />

<div class="velo" transition:fade={{ duration: dura(200) }} onclick={oncerrar} role="presentation"></div>
<div class="hoja" role="dialog" aria-modal="true" aria-labelledby="avatares-titulo" use:dialogo transition:fly={{ y: 60, duration: dura(280) }}>
  <header>
    <h2 id="avatares-titulo">{titulo}</h2>
    <BotonIcono icono="cerrar" etiqueta="Cerrar" sobrePapel onclick={oncerrar} />
  </header>
  <div class="series">
    {#each Object.entries(SERIES_AVATARES) as [serie, personajes] (serie)}
      <h3 class={serie}>{AMBITOS[serie as Ambito]}</h3>
      <div class="rejilla">
        {#each Object.entries(personajes) as [id, nombre] (id)}
          {@const cogido = ocupados.includes(id) && id !== actual}
          <button class:actual={id === actual} disabled={cogido} aria-pressed={id === actual} aria-label="{nombre}{cogido ? ' (ya elegido)' : ''}" title={nombre} data-foco={id === actual ? '' : undefined} onclick={() => onelegir(id)}>
            <Moneda avatar={id} gesto={id === actual ? 'gana' : 'normal'} />
          </button>
        {/each}
      </div>
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
  .series {
    overflow-y: auto;
    padding: 4px 14px calc(18px + env(safe-area-inset-bottom));
  }
  /* cada serie, con una raya de su color */
  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0 8px;
    font-family: var(--fell-sc);
    font-weight: normal;
    font-size: 1.1rem;
  }
  h3::before {
    content: '';
    width: 14px;
    height: 20px;
    border-radius: 2px;
    background: var(--serie);
    box-shadow: 0 0 0 1px rgb(29 29 27 / 0.4);
  }
  h3.comunicacion { --serie: var(--comunicacion); }
  h3.social { --serie: var(--social); }
  h3.cientifico { --serie: var(--cientifico); }
  h3.mujer { --serie: var(--mujer); }
  h3.coria { --serie: var(--coria); }
  .rejilla {
    --lado: min(20vw, 84px);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px 4px;
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
  button:active:not(:disabled) :global(.moneda) {
    transform: scale(0.94);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
