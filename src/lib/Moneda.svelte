<script lang="ts">
  // La moneda de un jugador: su personaje grabado, con el gesto del momento y, si se pide,
  // las cartas que le quedan en una pestaña de papel.
  import { esAvatar, tieneParpadeo } from '../../compartido/avatares'
  import { reducido } from './movimiento'

  interface Props {
    avatar?: string
    /** Sin personaje se graba la inicial del nombre. */
    nombre?: string
    gesto?: 'normal' | 'pensando' | 'gana' | 'pierde'
    /** Cartas en la mano; sin ello no se pinta la pestaña. */
    n?: number
    /** Ya no juega esta partida: la pestaña dice «fuera» en vez del número de cartas. */
    fuera?: boolean
    /** Abre la ronda: una etiqueta de papel en el canto de arriba. */
    abre?: boolean
  }
  let { avatar = '', nombre = '', gesto = 'normal', n, fuera = false, abre = false }: Props = $props()

  // El parpadeo (ANIM-17): solo al pensar, que en la mesa es a quien le toca. Un segundo fotograma, con los ojos
  // cerrados, se enseña de golpe 120-150 ms cada 4-7 s, encima del de siempre: la imagen del {#key gesto} no cambia,
  // así que no se repite el «acunar». La imagen se pide solo cuando la moneda piensa, y el primer parpadeo espera a
  // que haya cargado. Nunca con movimiento reducido ni con la pestaña oculta.
  // Con movimiento reducido al empezar a pensar, ni se pide la imagen; si se activa después, cada parpadeo lo mira.
  const parpadea = $derived(gesto === 'pensando' && tieneParpadeo(avatar) && !reducido())
  let ojos = $state<HTMLImageElement>()
  let cerrados = $state(false)
  $effect(() => {
    const img = ojos
    if (!parpadea || !img) return
    let vivo = true
    let reloj: ReturnType<typeof setTimeout> | undefined
    const programar = () => (reloj = setTimeout(parpadear, 4000 + Math.random() * 3000))
    function parpadear() {
      if (!vivo) return
      if (document.hidden || reducido()) return void programar()
      cerrados = true
      reloj = setTimeout(() => {
        cerrados = false
        programar()
      }, 120 + Math.random() * 30)
    }
    ;(img.complete ? Promise.resolve() : img.decode()).then(
      () => vivo && programar(),
      () => {},
    )
    return () => {
      vivo = false
      clearTimeout(reloj)
      cerrados = false
    }
  })
</script>

<span class="moneda {gesto}">
  {#if esAvatar(avatar)}
    {#key gesto}
      <img src="/avatares/{avatar}-{gesto}.webp" alt="" draggable="false" />
    {/key}
    {#if parpadea}
      {#key avatar}
        <img class="ojos" class:cerrados bind:this={ojos} src="/avatares/{avatar}-pensando-b.webp" alt="" aria-hidden="true" draggable="false" />
      {/key}
    {/if}
  {:else}
    <span class="inicial" aria-hidden="true">{nombre.trim().charAt(0).toUpperCase() || '?'}</span>
  {/if}
  {#if fuera}
    <span class="cuenta fuera">fuera<span class="sr-only"> de la partida</span></span>
  {:else if n !== undefined}
    <span class="cuenta">{n}<span class="sr-only">{n === 1 ? ' carta' : ' cartas'}</span></span>
  {/if}
  {#if abre}<span class="abre">abre<span class="sr-only"> la ronda</span></span>{/if}
</span>

<style>
  .moneda {
    position: relative;
    display: block;
    width: var(--lado, 46px);
    aspect-ratio: 1;
    border-radius: 50%;
    /* Un círculo limpio con un aro de papel, el blanco de «Repartir»; sin canto: no es una moneda. */
    box-shadow:
      0 0 0 max(2px, calc(var(--lado, 46px) * 0.045)) var(--papel),
      0 2px 6px rgb(0 0 0 / 0.35);
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    animation: acunar 0.35s ease-out;
  }
  /* El fotograma del parpadeo, encima y escondido; se ve de golpe, sin transición. */
  .ojos {
    position: absolute;
    inset: 0;
    visibility: hidden;
    animation: none;
  }
  .ojos.cerrados { visibility: visible; }
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
    background: var(--papel);
    color: var(--tinta);
    font-weight: 700;
    font-size: calc(var(--lado, 46px) * 0.45);
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
    font-weight: 700;
    font-variant-numeric: lining-nums tabular-nums;
    font-size: calc(var(--lado, 46px) * 0.36);
    line-height: 1.35;
    text-align: center;
  }
  .cuenta.fuera {
    right: -18%;
    padding: 0 6%;
    font-family: var(--ui);
    font-style: italic;
    font-size: calc(var(--lado, 46px) * 0.27);
    line-height: 1.45;
  }
  /* Quien abre la ronda: una etiqueta de papel pegada arriba, del mismo papel que la de las cartas. */
  .abre {
    position: absolute;
    left: -16%;
    top: -12%;
    padding: 0 5%;
    border-radius: 3px;
    background: var(--papel-2);
    color: var(--tinta);
    box-shadow:
      0 0 0 1px rgb(29 29 27 / 0.55),
      0 2px 4px rgb(0 0 0 / 0.5);
    font-style: italic;
    font-size: calc(var(--lado, 46px) * 0.27);
    line-height: 1.45;
    rotate: -8deg;
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
