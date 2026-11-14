<script lang="ts">
  // La moneda de un jugador: su personaje grabado, con el gesto del momento y, si se pide,
  // las cartas que le quedan en una pestaña de papel.
  import { esAvatar } from '../../compartido/avatares'

  interface Props {
    avatar?: string
    /** Sin personaje se graba la inicial del nombre. */
    nombre?: string
    gesto?: 'normal' | 'pensando' | 'gana' | 'pierde'
    /** Cartas en la mano; sin ello no se pinta la pestaña. */
    n?: number
  }
  let { avatar = '', nombre = '', gesto = 'normal', n }: Props = $props()
</script>

<span class="moneda {gesto}">
  {#if esAvatar(avatar)}
    {#key gesto}
      <img src="/avatares/{avatar}-{gesto}.webp" alt="" draggable="false" />
    {/key}
  {:else}
    <span class="inicial">{nombre.trim().charAt(0).toUpperCase() || '?'}</span>
  {/if}
  {#if n !== undefined}
    <span class="cuenta">{n}<span class="sr-only">{n === 1 ? ' carta' : ' cartas'}</span></span>
  {/if}
</span>

<style>
  .moneda {
    position: relative;
    display: block;
    width: var(--lado, 46px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--papel);
    box-shadow:
      0 1px 0 #b9b6a0,
      0 3px 8px rgb(0 0 0 / 0.45);
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    animation: acunar 0.35s ease-out;
  }
  @keyframes acunar {
    from {
      opacity: 0.2;
      transform: scale(0.9);
    }
  }
  .inicial {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px rgb(29 29 27 / 0.55);
    color: var(--tinta);
    font-family: var(--fell-sc);
    font-size: calc(var(--lado, 46px) * 0.5);
    line-height: 1;
  }
  /* Las cartas que quedan: una cartita de papel que asoma por el canto */
  .cuenta {
    position: absolute;
    right: -14%;
    bottom: -10%;
    min-width: 46%;
    padding: 0 8%;
    border-radius: 3px;
    background: var(--papel-2);
    color: var(--tinta);
    box-shadow:
      0 0 0 1px rgb(29 29 27 / 0.55),
      0 2px 4px rgb(0 0 0 / 0.5);
    font-family: var(--fell-sc);
    font-size: calc(var(--lado, 46px) * 0.4);
    line-height: 1.35;
    text-align: center;
  }
  /* Las imágenes de la moneda perdedora ya vienen apagadas; se remata con un punto menos de color. */
  .pierde img { filter: saturate(0.7); }
  .pierde .inicial {
    filter: saturate(0.4) brightness(0.9);
  }

  @media (prefers-reduced-motion: reduce) {
    img { animation: none; }
  }
</style>
