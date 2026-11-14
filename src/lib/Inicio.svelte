<script lang="ts">
  import { barajar } from '../../compartido/clasico'
  import Carta from './Carta.svelte'
  import { cartas } from './datos'
  import Marca from './Marca.svelte'

  interface Props {
    hayGuardada: boolean
    onjugar: () => void
    onenlinea: () => void
    oncontinuar: () => void
    onreglas: () => void
  }
  let { hayGuardada, onjugar, onenlinea, oncontinuar, onreglas }: Props = $props()

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

  <h1><Marca /></h1>
  <p class="lema">El juego de cartas para hacer cronologías</p>

  <nav>
    {#if hayGuardada}
      <button class="boton" onclick={oncontinuar}>Continuar partida</button>
    {/if}
    <button class="boton" class:secundario={hayGuardada} onclick={onjugar}>En este dispositivo</button>
    <button class="boton" class:secundario={hayGuardada} onclick={onenlinea}>En línea</button>
    <button class="boton secundario" onclick={onreglas}>Reglamento</button>
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
    --ancho: min(30vw, 150px, 21dvh);
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
    gap: 12px;
    width: min(100%, 320px);
    margin: auto 0;
    padding: 24px 0;
  }

  footer {
    color: var(--gris);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  @media (prefers-reduced-motion: reduce) {
    .hoja { animation: none; }
  }
</style>
