<script lang="ts">
  // Tutorial animado: una partida en miniatura que se juega sola, paso a paso, con cartas de verdad.
  import { flip } from 'svelte/animate'
  import { cubicOut } from 'svelte/easing'
  import { crossfade, fade, scale } from 'svelte/transition'
  import BotonIcono from './BotonIcono.svelte'
  import Carta from './Carta.svelte'
  import { porId } from './datos'
  import { dialogo } from './dialogo'
  import Moneda from './Moneda.svelte'
  import { dura } from './movimiento'

  interface Props {
    oncerrar: () => void
    /** Abierto desde el inicio, el último paso lleva a preparar una partida. Sin él (desde el reglamento), solo cierra. */
    onjugar?: () => void
  }
  let { oncerrar, onjugar }: Props = $props()

  // Las cartas del ejemplo y sus años (Colón, el Quijote, Marie Curie, la imprenta, la penicilina).
  const ANIOS: Record<string, number> = { '137': 1492, '047': 1605, '262': 1903, '036': 1453, '267': 1928 }

  const PASOS = [
    { titulo: 'La mesa', texto: 'En la mesa hay una carta con su año a la vista. Con ella empieza la cronología.', golpes: [700] },
    { titulo: 'Tus cartas', texto: 'Tus cartas no enseñan el año. Cuando te toque, elige una.', golpes: [1300] },
    { titulo: '¿Antes o después?', texto: 'Toca un hueco: a la izquierda si crees que ocurrió antes, a la derecha si crees que ocurrió después.', golpes: [] },
    { titulo: 'Acierto', texto: 'La carta se da la vuelta y enseña su año. Si has acertado, se queda en la mesa.', golpes: [1000, 2200] },
    { titulo: 'Fallo', texto: 'Si no encaja, la carta se retira y robas otra del mazo. Le toca al siguiente.', golpes: [1000, 2800] },
    { titulo: 'El final', texto: 'Gana quien se queda antes sin cartas. Si varios lo consiguen en la misma ronda, desempatan.', golpes: [] },
  ]

  let paso = $state(0)
  /** Cuántos «golpes» del paso han sonado ya: cada uno mueve algo en la escena. */
  let t = $state(0)

  $effect(() => {
    const golpes = PASOS[paso].golpes
    t = 0
    const relojes = golpes.map((ms, i) => setTimeout(() => (t = i + 1), ms))
    return () => relojes.forEach(clearTimeout)
  })

  interface Pieza {
    id: string
    volteada: boolean
    marca: '' | 'ok' | 'fallo'
  }
  const vista = (id: string): Pieza => ({ id, volteada: true, marca: '' })

  const crono = $derived.by((): Pieza[] => {
    if (paso === 0) return [{ id: '137', volteada: t >= 1, marca: '' }]
    if (paso < 3) return [vista('137')]
    if (paso === 3) return [vista('137'), { id: '047', volteada: t >= 1, marca: t === 1 ? 'ok' : '' }]
    if (paso === 4 && t < 2) return [{ id: '262', volteada: t >= 1, marca: t === 1 ? 'fallo' : '' }, vista('137'), vista('047')]
    return [vista('137'), vista('047')]
  })
  const mano = $derived(
    paso === 0 ? [] : paso < 3 ? ['047', '262', '036'] : paso === 3 ? ['262', '036'] : paso === 4 && t < 2 ? ['036'] : ['036', '267'],
  )
  const elegida = $derived((paso === 1 && t >= 1) || paso === 2 ? '047' : null)
  const huecos = $derived(paso === 2)

  const [enviar, recibir] = crossfade({
    duration: () => dura(520),
    easing: cubicOut,
    fallback: (nodo) => ({ duration: dura(300), css: (u: number) => `opacity: ${u}; transform: translateY(${(1 - u) * 30}%)` }),
  })

  const ultimo = PASOS.length - 1
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') oncerrar()
    if (e.key === 'ArrowRight' && paso < ultimo) paso++
    if (e.key === 'ArrowLeft' && paso > 0) paso--
  }}
/>

<div class="tutorial" role="dialog" aria-modal="true" aria-labelledby="tutorial-titulo" use:dialogo transition:fade={{ duration: dura(200) }}>
  <header>
    <h2 id="tutorial-titulo">Cómo se juega</h2>
    <BotonIcono icono="cerrar" etiqueta="Cerrar el tutorial" onclick={oncerrar} />
  </header>

  <div class="escena" aria-hidden="true">
    <div class="crono">
      {#if huecos}<span class="hueco" in:scale={{ duration: dura(250) }}>antes</span>{/if}
      {#each crono as p (p.id)}
        <div class="naipe {p.marca}" animate:flip={{ duration: dura(450), easing: cubicOut }} in:recibir={{ key: p.id }} out:enviar={{ key: p.id }}>
          <Carta carta={porId[p.id]} fecha={{ anio: ANIOS[p.id], circa: false }} volteada={p.volteada} />
        </div>
      {/each}
      {#if huecos}<span class="hueco destino" in:scale={{ duration: dura(250) }}>después</span>{/if}
    </div>

    <div class="mano">
      {#each mano as id (id)}
        <div class="naipe" class:elegida={elegida === id} animate:flip={{ duration: dura(350), easing: cubicOut }} in:recibir={{ key: id }} out:enviar={{ key: id }}>
          <Carta carta={porId[id]} />
        </div>
      {/each}
      {#if paso === ultimo}
        <div class="premio" in:scale={{ duration: dura(500), start: 0.5, easing: cubicOut }}>
          <Moneda avatar="escritor" gesto="gana" />
        </div>
      {/if}
    </div>
  </div>

  <div class="texto" aria-live="polite">
    {#key paso}
      <div in:fade={{ duration: dura(250) }}>
        <p class="paso">{paso + 1} de {PASOS.length} · {PASOS[paso].titulo}</p>
        <p class="explica">{PASOS[paso].texto}</p>
      </div>
    {/key}
  </div>

  <!-- Un solo botón que cambia de texto, para que el foco no se pierda en el último paso;
       «Anterior» no se desactiva del todo, para que el Tab no se lo salte. -->
  <footer>
    <button class="boton secundario" aria-disabled={paso === 0} onclick={() => paso > 0 && paso--}>Anterior</button>
    <span class="puntos" aria-hidden="true">
      {#each PASOS as _, i (i)}<i class:actual={i === paso}></i>{/each}
    </span>
    <button class="boton" data-foco onclick={() => (paso < ultimo ? paso++ : (onjugar ?? oncerrar)())}>
      {paso < ultimo ? 'Siguiente' : onjugar ? '¡A jugar!' : 'Entendido'}
    </button>
  </footer>
</div>

<style>
  .tutorial {
    --carta-crono: min(27vw, 150px, 21dvh);
    --carta-mano: min(20vw, 110px, 15dvh);
    --oro: #e8c66a;
    position: fixed;
    inset: 0;
    z-index: 45;
    display: flex;
    flex-direction: column;
    background: radial-gradient(120% 80% at 50% 0%, var(--tapete) 0%, var(--tapete-2) 70%);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(10px + env(safe-area-inset-top)) 12px 4px 18px;
  }
  h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .escena {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    overflow: hidden;
  }
  .crono {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: calc(var(--carta-crono) * 1.5);
    /* la línea del tiempo, como en la mesa */
    background: linear-gradient(rgb(235 233 217 / 0.16), rgb(235 233 217 / 0.16)) center / 100% 2px no-repeat;
  }
  .crono .naipe { --ancho: var(--carta-crono); }
  .mano {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 8px;
    min-height: calc(var(--carta-mano) * 1.5);
  }
  .mano .naipe {
    --ancho: var(--carta-mano);
    transition:
      transform 0.25s cubic-bezier(0.3, 1.4, 0.5, 1),
      filter 0.25s;
  }
  .mano .elegida {
    transform: translateY(-12%) scale(1.05);
    filter: drop-shadow(0 0 9px var(--oro));
  }

  .hueco {
    flex: none;
    width: 46px;
    height: calc(var(--carta-crono) * 1.2);
    display: grid;
    place-items: center;
    border: 2px dashed var(--oro);
    border-radius: 8px;
    background: rgb(232 198 106 / 0.1);
    color: var(--oro);
    font-size: 0.85rem;
    writing-mode: vertical-rl;
    rotate: 180deg;
    animation: latir 1.4s ease-in-out infinite;
  }
  .hueco.destino { background: rgb(232 198 106 / 0.3); }
  @keyframes latir {
    50% { background: rgb(232 198 106 / 0.28); }
  }

  .naipe.ok { animation: acierto 0.9s ease-out; }
  .naipe.fallo {
    animation: fallo 0.55s ease-in-out 0.5s;
    filter: drop-shadow(0 0 10px var(--fallo)) saturate(0.7);
  }
  @keyframes acierto {
    0% { filter: drop-shadow(0 0 0 #6fd08a); }
    45% { transform: scale(1.06); filter: drop-shadow(0 0 16px #6fd08a); }
    100% { filter: drop-shadow(0 0 0 transparent); }
  }
  @keyframes fallo {
    15%, 55% { transform: translateX(-7px) rotate(-2deg); }
    35%, 75% { transform: translateX(7px) rotate(2deg); }
  }

  .premio {
    --lado: calc(var(--carta-mano) * 1.1);
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    filter: drop-shadow(0 0 18px var(--oro));
  }

  .texto {
    min-height: 8.2em;
    padding: 0 20px;
    text-align: center;
  }
  .texto p { margin: 0; }
  .paso {
    color: var(--oro);
    font-family: var(--fell-sc);
    font-size: 1.2rem;
  }
  .explica {
    margin-top: 0.2em !important;
    font-size: 1.2rem;
    line-height: 1.3;
    text-wrap: balance;
  }

  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    max-width: 520px;
    width: 100%;
    margin: 0 auto;
    padding: 10px 16px calc(16px + env(safe-area-inset-bottom));
  }
  footer .boton { min-width: 7.2em; }
  footer .boton[aria-disabled='true'] {
    opacity: 0.45;
    cursor: default;
    transform: none;
  }
  .puntos {
    display: flex;
    gap: 6px;
  }
  .puntos i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgb(235 233 217 / 0.3);
  }
  .puntos i.actual { background: var(--oro); }

  @media (prefers-reduced-motion: reduce) {
    .hueco,
    .naipe.ok,
    .naipe.fallo {
      animation: none;
    }
  }
</style>
