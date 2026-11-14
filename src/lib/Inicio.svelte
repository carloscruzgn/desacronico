<script lang="ts">
  import { barajar } from '../../compartido/clasico'
  import Carta from './Carta.svelte'
  import { cartas } from './datos'
  import Marca from './Marca.svelte'

  interface Props {
    hayGuardada: boolean
    /** Código de la sala en línea que se dejó abierta, si la hay. */
    sala: string
    onjugar: () => void
    onenlinea: () => void
    onsala: () => void
    oncontinuar: () => void
    onreglas: () => void
  }
  let { hayGuardada, sala, onjugar, onenlinea, onsala, oncontinuar, onreglas }: Props = $props()

  // En un ordenador o en la pizarra del aula no se habla de «móvil».
  const aparato = typeof matchMedia === 'function' && !matchMedia('(pointer: coarse)').matches ? 'ordenador' : 'móvil'

  // Abanico decorativo: cinco cartas al azar, una de cada ámbito
  const abanico = ['comunicacion', 'social', 'cientifico', 'mujer', 'coria'].map(
    (a) => barajar(cartas.filter((c) => c.ambito === a))[0],
  )
</script>

<main>
  <div class="abanico" aria-hidden="true">
    {#each abanico as carta, i (carta.id)}
      <div class="hoja" style="--i: {i - 2}">
        <Carta {carta} />
      </div>
    {/each}
  </div>

  <h1 tabindex="-1" data-titulo><Marca /></h1>
  <p class="lema">El juego de cartas para hacer cronologías</p>

  <nav aria-label="Menú">
    {#if hayGuardada}
      <button class="entrada" class:principal={true} onclick={oncontinuar}>
        <span><b>Continuar partida</b><small>La que quedó a medias en este {aparato}</small></span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
      </button>
    {/if}
    {#if sala}
      <button class="entrada" onclick={onsala}>
        <span><b>Volver a la sala {sala}</b><small>La partida en línea que dejaste abierta</small></span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
      </button>
    {/if}
    <button class="entrada" class:principal={!hayGuardada} onclick={onjugar}>
      <span><b>Jugar en este {aparato}</b><small>{aparato === 'móvil' ? 'Solo o por turnos, pasándose el móvil' : 'Solo o por turnos, en la misma pantalla'}</small></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
    </button>
    <button class="entrada" onclick={onenlinea}>
      <span><b>Jugar en línea</b><small>Cada jugador en su móvil, con un código</small></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
    </button>
    <button class="entrada" onclick={onreglas}>
      <span><b>Reglamento</b><small>Cómo se juega y quién lo hizo</small></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
    </button>
  </nav>

  <footer>
    Carlos Cruz González y Rodrigo Muñoz Martínez<br />
    CEPA de Coria, 2024 · CC BY-SA
  </footer>
</main>

<style>
  main {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 16px calc(16px + env(safe-area-inset-bottom));
    text-align: center;
    overflow: hidden;
  }

  .abanico {
    --ancho: min(30vw, 150px, 17dvh);
    position: relative;
    width: 100%;
    height: calc(var(--ancho) * 1.85);
    margin-top: 1dvh;
  }
  .hoja {
    position: absolute;
    left: 50%;
    top: 8%;
    margin-left: calc(var(--ancho) / -2);
    transform-origin: 50% 160%;
    transform: rotate(calc(var(--i) * 13deg));
    animation: abrir 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
    animation-delay: calc((var(--i) + 2) * 70ms + 100ms);
  }
  @keyframes abrir {
    from {
      transform: rotate(0deg) translateY(40%);
      opacity: 0;
    }
  }

  h1 {
    margin: 0.2em 0 0;
    font-weight: normal;
    font-size: clamp(2.8rem, 13vw, 4.6rem);
    line-height: 1;
  }
  .lema {
    margin: 0.5em 0 0;
    font-family: var(--fell);
    font-style: italic;
    color: var(--gris-claro);
    font-size: 1.15rem;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(100%, 360px);
    margin: auto 0;
    padding: 24px 0;
  }
  .entrada {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 64px;
    padding: 10px 12px 10px 18px;
    border: 1px solid rgb(235 233 217 / 0.3);
    border-radius: 12px;
    background: rgb(235 233 217 / 0.06);
    text-align: left;
    cursor: pointer;
    transition:
      background 0.15s,
      transform 0.12s;
  }
  .entrada:hover { background: rgb(235 233 217 / 0.14); }
  .entrada:active { transform: translateY(2px); }
  .entrada span {
    display: grid;
    gap: 1px;
  }
  .entrada b {
    font-size: 1.2rem;
    line-height: 1.2;
  }
  .entrada small {
    color: var(--gris-claro);
    font-size: 0.95rem;
    line-height: 1.2;
  }
  .entrada svg {
    flex: none;
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.6;
  }
  .entrada.principal {
    border-color: var(--papel);
    background: var(--papel);
    color: var(--tinta);
    box-shadow:
      0 2px 0 #b9b6a0,
      0 8px 18px rgb(0 0 0 / 0.35);
  }
  .entrada.principal small { color: #55544c; }

  footer {
    color: #a3a297;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  @media (prefers-reduced-motion: reduce) {
    .hoja { animation: none; }
  }
</style>
