<script lang="ts">
  // El mazo: un montón de cartulina crema visto de canto, que adelgaza a medida que se roba. No tiene dorso
  // (la carta impresa no lo tiene): solo cantos de papel y el número de cartas que quedan.
  import { untrack } from 'svelte'
  import { fade } from 'svelte/transition'
  import { dura } from './movimiento'

  let { n, el = $bindable() }: { n: number; el?: HTMLElement } = $props()

  let gesto = $state<'baraja' | 'roba'>('baraja')
  let vez = $state(0)
  let previo = untrack(() => n)

  $effect(() => {
    if (n === previo) return
    gesto = n < previo ? 'roba' : 'baraja' // si crece, es que se han barajado los descartes
    previo = n
    vez++
  })

  /** Grosor del montón: medio píxel por cada tres cartas, entre un canto de 2 px y 26 px. */
  const grosor = $derived(n ? Math.min(26, 2 + n / 6) : 0)
</script>

<div class="mazo" class:vacio={n === 0} bind:this={el} role="img" aria-label="Mazo: {n} {n === 1 ? 'carta' : 'cartas'}">
  {#key n}
    <span class="n" aria-hidden="true" in:fade={{ duration: dura(200) }}>{n}</span>
  {/key}
  <div class="monton" style:--grosor="{grosor}px" aria-hidden="true">
    {#key vez}
      <div class="canto {gesto}">
        <span class="mitad arriba"></span>
        <span class="mitad abajo"></span>
      </div>
    {/key}
  </div>
</div>

<style>
  .mazo {
    position: relative;
    width: 40px;
    aspect-ratio: 554 / 766;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    gap: 3px;
  }
  .n {
    color: var(--papel);
    font-family: var(--fell-sc);
    font-size: 1.15rem;
    line-height: 1;
  }
  .monton {
    position: relative;
    width: 100%;
    height: var(--grosor);
    transition: height 0.4s var(--curva-deslizar, ease);
  }
  /* El canto: las cartas apiladas se ven como rayas finas de cartulina, con la de arriba un poco más clara. */
  .canto,
  .mitad {
    position: absolute;
    inset: 0;
  }
  .mitad {
    border-radius: 1.5px;
    background:
      linear-gradient(var(--papel-2), var(--papel-2)) top / 100% 1.5px no-repeat,
      repeating-linear-gradient(var(--papel) 0 1.2px, #b9b6a0 1.2px 1.6px),
      var(--papel);
    box-shadow:
      0 0 0 0.5px rgb(0 0 0 / 0.3),
      0 2px 4px rgb(0 0 0 / 0.45);
  }
  .arriba { bottom: 50%; }
  .abajo {
    top: 50%;
    background: repeating-linear-gradient(var(--papel) 0 1.2px, #b9b6a0 1.2px 1.6px), var(--papel);
  }
  .vacio .monton {
    height: 2px;
    border-top: 1px dashed rgb(235 233 217 / 0.4);
  }
  .vacio .n { color: var(--gris-claro); }

  /* Barajar: el montón se parte en dos, las mitades se cruzan y vuelven a juntarse, una vez. */
  .baraja .arriba { animation: cortar-arriba 0.8s var(--curva-deslizar, ease) both; }
  .baraja .abajo { animation: cortar-abajo 0.8s var(--curva-deslizar, ease) both; }
  @keyframes cortar-arriba {
    0%, 100% { transform: none; }
    45% { transform: translate(-45%, -2px); }
  }
  @keyframes cortar-abajo {
    0%, 100% { transform: none; }
    45% { transform: translate(45%, 2px); }
  }

  /* Robar: una lámina sale de lo alto del montón hacia la mesa. */
  .roba::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: -1px;
    height: 2px;
    border-radius: 1px;
    background: var(--papel-2);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.4);
    animation: sale 0.45s var(--curva-deslizar, ease) both;
  }
  @keyframes sale {
    to {
      transform: translate(-70%, 14px) rotate(-14deg);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mitad,
    .roba::after {
      animation: none !important;
    }
    .roba::after { display: none; }
  }
</style>
