<script lang="ts">
  // La entrada de un capítulo del reglamento: una franja de tapete con una carta real por el reverso,
  // que se posa al entrar en pantalla, y el rótulo con un filete que se dibuja.
  // En escritorio la carta va fija en la columna de la izquierda y aquí solo queda el rótulo.
  import Carta from './Carta.svelte'
  import { alVer } from './alVer'
  import { anioTexto, porId, textoPlano } from './datos'
  import { ANIOS_MUESTRA } from './muestras'
  import type { Capitulo } from './textos'

  interface Props {
    capitulo: Capitulo
    numero: number
    /** Giro estable de la carta, en grados (±2). */
    giro?: number
  }
  let { capitulo, numero, giro = -2 }: Props = $props()

  const carta = $derived(porId[capitulo.carta])
</script>

<header class="cabeza" use:alVer={0.4}>
  <div class="franja" aria-hidden="true">
    <div class="naipe" style="--giro: {giro}deg">
      <Carta {carta} fecha={ANIOS_MUESTRA[capitulo.carta]} volteada />
    </div>
    <p class="pie">
      <span class="anio">{anioTexto(ANIOS_MUESTRA[capitulo.carta])}</span>
      {textoPlano(carta)}
    </p>
  </div>
  <h3 id="cap-{capitulo.id}" tabindex="-1">
    <span class="num" aria-hidden="true">{numero}</span>
    {capitulo.titulo}
  </h3>
</header>

<style>
  .cabeza {
    margin: 0 0 0.8em;
  }
  .franja {
    display: flex;
    align-items: center;
    gap: 18px;
    margin: 0 -20px 1.1em;
    padding: 20px 24px 22px 28px;
    background: var(--fondo-mesa, radial-gradient(120% 120% at 30% 0%, var(--tapete) 0%, var(--tapete-2) 80%));
    background-color: var(--tapete-2);
    /* las hojas de papel, encima del tapete, le dan sombra por arriba y por abajo */
    box-shadow:
      inset 0 10px 12px -10px rgb(0 0 0 / 0.7),
      inset 0 -10px 12px -10px rgb(0 0 0 / 0.6);
    color: var(--papel);
  }
  .naipe {
    --ancho: 96px;
    flex: none;
    rotate: var(--giro);
    opacity: 0;
    transform: translateY(-22px) rotate(5deg) scale(1.04);
  }
  .cabeza:global(.visto) .naipe {
    opacity: 1;
    transform: none;
    transition:
      opacity 0.25s,
      transform 0.55s var(--curva-posar, cubic-bezier(0.2, 0.7, 0.2, 1));
  }
  .pie {
    margin: 0;
    max-width: 16em;
    font: italic 1rem/1.3 var(--fell);
    color: rgb(235 233 217 / 0.88);
    text-wrap: balance;
  }
  .anio {
    display: block;
    margin-bottom: 2px;
    font: normal 1.15rem/1 var(--fell-sc);
    color: var(--papel);
  }

  h3 {
    position: relative;
    margin: 0;
    padding-bottom: 10px;
    font: normal 1.65rem/1.15 var(--fell-sc);
    text-wrap: balance;
    scroll-margin-top: 12px;
  }
  h3:focus { outline: none; }
  .num {
    margin-right: 0.25em;
    color: var(--gris);
  }
  /* Filete doble, como en un librillo impreso, que se dibuja de izquierda a derecha. */
  h3::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 5px;
    background: linear-gradient(var(--tinta) 0 2px, transparent 2px 3.5px, var(--tinta) 3.5px 4.5px, transparent 4.5px);
    transform-origin: left;
    transform: scaleX(0);
  }
  .cabeza:global(.visto) h3::after {
    transform: none;
    transition: transform 0.7s var(--curva-deslizar, cubic-bezier(0.3, 0.6, 0.2, 1)) 0.2s;
  }

  /* En escritorio, la carta va en la columna fija de la izquierda. */
  @media (min-width: 1024px) and (min-height: 620px) {
    .franja { display: none; }
    .cabeza { margin-top: 0.4em; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cabeza:global(.visto) .naipe,
    .cabeza:global(.visto) h3::after { transition: none; }
  }
  @media print {
    .naipe { opacity: 1; transform: none; }
    h3::after { transform: none; }
  }
</style>
