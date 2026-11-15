<script module lang="ts">
  /** Dónde estará grabada la narración de cada paso (la genera el hilo del sonido con NARRACION_TUTORIAL). */
  export const vozTutorial = (paso: number) => `/voz/tutorial-${String(paso + 1).padStart(2, '0')}.mp3`
  import { narrar } from './sonido'
  /** La narración con la voz grabada (speechSynthesis si no carga), lista para pasarla como `onnarrar`.
      Solo suena con la voz encendida; con el paso -1, calla. */
  export const narrarTutorial = (paso: number, texto: string) => narrar(paso < 0 ? null : vozTutorial(paso), texto)
</script>

<script lang="ts">
  // Tutorial animado: una partida en miniatura que se juega sola, paso a paso, con cartas de verdad.
  // Los textos (y su narración) están en textos.ts; la escena, en EscenaClasico, que comparte con el reglamento.
  import { fade } from 'svelte/transition'
  import BotonIcono from './BotonIcono.svelte'
  import { dialogo } from './dialogo'
  import EscenaClasico from './EscenaClasico.svelte'
  import { dura } from './movimiento'
  import { ponerVoz, sonido } from './sonido'
  import { NARRACION_TUTORIAL, PASOS_TUTORIAL } from './textos'

  interface Props {
    oncerrar: () => void
    /** Abierto desde el inicio, el último paso lleva a preparar una partida. Sin él (desde el reglamento), solo cierra. */
    onjugar?: () => void
    /** Gancho para la narración: se llama al llegar a cada paso con el texto que se dice (y su audio en
        `vozTutorial(paso)`); con paso -1 al cerrar, para que calle. Sin él, el tutorial es mudo. */
    onnarrar?: (paso: number, texto: string) => void
  }
  let { oncerrar, onjugar, onnarrar }: Props = $props()

  let paso = $state(0)
  const ultimo = PASOS_TUTORIAL.length - 1

  /** «Escuchar»: enciende la voz (el ajuste de sonido) y narra el paso en el que se está; otra vez, la apaga. */
  function alternarVoz() {
    if (sonido.voz) return ponerVoz(false)
    ponerVoz(true)
    onnarrar?.(paso, NARRACION_TUTORIAL[paso])
  }

  $effect(() => {
    onnarrar?.(paso, NARRACION_TUTORIAL[paso])
  })
  $effect(() => () => onnarrar?.(-1, ''))
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
    <div class="acciones">
      {#if onnarrar}
        <button class="escuchar" aria-pressed={sonido.voz} title={sonido.voz ? 'Apagar la voz' : 'Narrar el tutorial en voz alta'} onclick={alternarVoz}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3.5 9.5h3.5l4.5-4v13l-4.5-4H3.5z" />
            {#if sonido.voz}<path d="M15 9.2a4 4 0 0 1 0 5.6M17.8 6.5a7.8 7.8 0 0 1 0 11" />{:else}<path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />{/if}
          </svg>
          Escuchar
        </button>
      {/if}
      <BotonIcono icono="cerrar" etiqueta="Cerrar el tutorial" onclick={oncerrar} />
    </div>
  </header>

  <div class="escena">
    <EscenaClasico {paso} />
  </div>

  <div class="texto" aria-live="polite">
    {#key paso}
      <div in:fade={{ duration: dura(250) }}>
        <p class="paso">{paso + 1} de {PASOS_TUTORIAL.length} · {PASOS_TUTORIAL[paso].titulo}</p>
        <p class="explica">{PASOS_TUTORIAL[paso].texto}</p>
      </div>
    {/key}
  </div>

  <!-- Un solo botón que cambia de texto, para que el foco no se pierda en el último paso;
       «Anterior» no se desactiva del todo, para que el Tab no se lo salte. -->
  <footer>
    <button class="boton secundario" aria-disabled={paso === 0} onclick={() => paso > 0 && paso--}>Anterior</button>
    <span class="puntos" aria-hidden="true">
      {#each PASOS_TUTORIAL as _, i (i)}<i class:actual={i === paso} class:visto={i < paso}></i>{/each}
    </span>
    <button class="boton" data-foco onclick={() => (paso < ultimo ? paso++ : (onjugar ?? oncerrar)())}>
      {paso < ultimo ? 'Siguiente' : onjugar ? '¡A jugar!' : 'Entendido'}
    </button>
  </footer>
</div>

<style>
  .tutorial {
    position: fixed;
    inset: 0;
    z-index: 45;
    display: flex;
    flex-direction: column;
    background: var(--fondo-mesa, radial-gradient(120% 80% at 50% 0%, var(--tapete) 0%, var(--tapete-2) 70%));
    background-color: var(--tapete-2);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(10px + env(safe-area-inset-top)) 12px 2px 18px;
  }
  h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  .acciones {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .escuchar {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 14px 0 10px;
    border: 1px solid rgb(235 233 217 / 0.32);
    border-radius: 22px;
    background: rgb(235 233 217 / 0.08);
    color: var(--papel);
    font: inherit;
    font-size: 1rem;
    cursor: pointer;
  }
  .escuchar:hover { background: rgb(235 233 217 / 0.18); }
  .escuchar[aria-pressed='true'] {
    border-color: var(--papel);
    background: rgb(235 233 217 / 0.2);
    font-weight: 700;
  }
  .escuchar svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .escena {
    flex: 1;
    min-height: 0;
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
  }

  .texto {
    min-height: 7.4em;
    max-width: 34em;
    margin: 0 auto;
    padding: 6px 20px 0;
    text-align: center;
  }
  .texto p { margin: 0; }
  .paso {
    font-weight: 700;
    font-size: 1rem;
    color: var(--papel);
  }
  .explica {
    margin-top: 0.2em !important;
    font-size: 1.15rem;
    line-height: 1.32;
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
    padding: 8px 16px calc(14px + env(safe-area-inset-bottom));
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
    border: 1px solid rgb(235 233 217 / 0.45);
  }
  .puntos i.visto { background: rgb(235 233 217 / 0.45); }
  .puntos i.actual {
    background: var(--papel);
    border-color: var(--papel);
  }
</style>
