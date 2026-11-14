<script lang="ts">
  // El mazo: un montón de cartas que se baraja al empezar y suelta la de arriba cada vez que alguien roba.
  import { untrack } from 'svelte'
  import { fly } from 'svelte/transition'
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
</script>

<div class="mazo" class:vacio={n === 0} bind:this={el} role="img" aria-label="Mazo: {n} cartas">
  {#key vez}
    <div class="capas {gesto}" aria-hidden="true">
      <span class="capa c3"></span>
      <span class="capa c2"></span>
      <span class="capa c1"></span>
    </div>
  {/key}
  {#key n}
    <span class="n" in:fly={{ y: -10, duration: dura(240) }}>{n}</span>
  {/key}
</div>

<style>
  .mazo {
    position: relative;
    width: 40px;
    aspect-ratio: 554 / 766;
    display: grid;
    place-items: center;
  }
  .capas,
  .capa {
    position: absolute;
    inset: 0;
  }
  /* Dorso: papel con la banda de las cuatro eras */
  .capa {
    border-radius: 3px;
    background:
      linear-gradient(90deg, var(--antigua) 25%, var(--media) 25% 50%, var(--moderna) 50% 75%, var(--contemporanea) 75%) 0 72% / 100% 16% no-repeat,
      var(--papel);
    box-shadow:
      0 0 0 0.5px rgb(0 0 0 / 0.35),
      0 1px 2px rgb(0 0 0 / 0.35);
  }
  .c2 { transform: translate(2px, 2px); }
  .c3 {
    transform: translate(4px, 4px);
    box-shadow:
      0 0 0 0.5px rgb(0 0 0 / 0.35),
      3px 5px 9px rgb(0 0 0 / 0.45);
  }
  .vacio .capas { opacity: 0.25; }

  .n {
    position: relative;
    margin-bottom: 30%;
    color: var(--tinta);
    font-family: var(--fell-sc);
    font-size: 1.1rem;
    line-height: 1;
  }

  /* Barajar: las dos cartas de arriba se abren a los lados y vuelven, dos veces */
  .baraja .c1 { animation: abre-izq 0.95s cubic-bezier(0.4, 0, 0.3, 1); }
  .baraja .c2 { animation: abre-der 0.95s cubic-bezier(0.4, 0, 0.3, 1); }
  @keyframes abre-izq {
    0%, 50%, 100% { transform: none; }
    25%, 75% { transform: translate(-62%, -5%) rotate(-11deg); }
  }
  @keyframes abre-der {
    0%, 50%, 100% { transform: translate(2px, 2px); }
    25%, 75% { transform: translate(26%, 6%) rotate(8deg); }
  }

  /* Robar: la carta de arriba sale hacia la mesa y asoma la siguiente */
  .roba .c1 { animation: sale 0.5s ease-in; }
  .roba .c2 { animation: sube 0.5s ease-out; }
  @keyframes sale {
    0% { transform: none; opacity: 1; }
    55% { transform: translate(-45%, 55%) rotate(-16deg); opacity: 0; }
    56% { transform: translate(2px, 2px); opacity: 0; }
    100% { transform: none; opacity: 1; }
  }
  @keyframes sube {
    0%, 40% { transform: translate(2px, 2px); }
    70% { transform: translate(0, -3px); }
    100% { transform: translate(2px, 2px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .capa { animation: none !important; }
  }
</style>
