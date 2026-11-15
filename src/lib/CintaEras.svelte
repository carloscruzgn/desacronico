<script lang="ts">
  // La cinta de las eras: la banda del año en sus cuatro colores, que se entinta de izquierda a
  // derecha como una pasada de rodillo, con un montón de tres cartas reales de cada era encima.
  // Con movimiento reducido (y al imprimir) se ve ya entintada.
  import Miniatura from './Miniatura.svelte'
  import { alVer } from './alVer'
  import { ANIOS_MUESTRA } from './muestras'
  import { ERAS } from './textos'

  const MONTONES: Record<(typeof ERAS)[number]['id'], string[]> = {
    antigua: ['100', '190', '120'],
    media: ['234', '024', '036'],
    moderna: ['139', '245', '060'],
    contemporanea: ['211', '293', '275'],
  }
  const GIROS = [-5, 4, -1.5]
</script>

<ol class="cinta" aria-label="Las cuatro eras" use:alVer={0.45}>
  {#each ERAS as e, i (e.id)}
    <li style="--i: {i}">
      <span class="monton" aria-hidden="true">
        {#each MONTONES[e.id] as id, j (id)}
          <span class="naipe" style="--j: {j}; --giro: {GIROS[j] + (i % 2 ? 1 : -1)}deg">
            <Miniatura {id} fecha={ANIOS_MUESTRA[id]} />
          </span>
        {/each}
      </span>
      <span class="tinta {e.id}" aria-hidden="true"></span>
      <span class="nombre">{e.nombre}</span>
      <span class="tramo">{e.tramo}</span>
    </li>
  {/each}
</ol>

<style>
  .cinta {
    --paso: 0.32s;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    margin: 1.4em 0 1.6em;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    align-content: start;
    justify-items: center;
    text-align: center;
    min-width: 0;
  }

  .monton {
    --ancho: min(62px, 17vw);
    position: relative;
    width: var(--ancho);
    height: calc(var(--ancho) * 1.383 + 14px);
    margin-bottom: 10px;
  }
  .naipe {
    position: absolute;
    left: 0;
    bottom: calc(var(--j) * 4px);
    rotate: var(--giro);
    translate: calc((var(--j) - 1) * 3px) 0;
  }

  /* La banda: cada tramo se entinta tras el anterior, de modo que se lee como una sola pasada. */
  .tinta {
    width: 100%;
    height: 16px;
    background:
      linear-gradient(90deg, rgb(255 255 255 / 0.1), transparent 40%, rgb(0 0 0 / 0.08) 75%, transparent),
      var(--color);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.15), inset 0 -1px 0 rgb(0 0 0 / 0.15);
  }
  li:first-child .tinta { border-radius: 3px 0 0 3px; }
  li:last-child .tinta { border-radius: 0 3px 3px 0; }
  .antigua { --color: var(--antigua); }
  .media { --color: var(--media); }
  .moderna { --color: var(--moderna); }
  .contemporanea { --color: var(--contemporanea); }

  .nombre {
    margin-top: 6px;
    padding: 0 2px;
    font: 0.98rem/1.05 var(--fell-sc);
    text-wrap: balance;
  }
  .tramo {
    font-size: 0.85rem;
    color: #55544c;
    font-variant-numeric: lining-nums;
  }

  /* Antes de verse: la tinta sin pasar y las cartas aún en el aire. */
  .tinta { clip-path: inset(0 100% 0 0); }
  .naipe { opacity: 0; transform: translateY(-14px); }
  .cinta:global(.visto) .tinta {
    clip-path: inset(0 0 0 0);
    transition: clip-path var(--paso) linear calc(var(--i) * var(--paso));
  }
  .cinta:global(.visto) .naipe {
    opacity: 1;
    transform: none;
    transition:
      opacity 0.2s,
      transform 0.38s var(--curva-posar, cubic-bezier(0.2, 0.7, 0.2, 1));
    transition-delay: calc(var(--i) * var(--paso) + 0.12s + var(--j) * 0.09s);
  }

  @media (min-width: 700px) {
    .monton { --ancho: 84px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cinta:global(.visto) .tinta,
    .cinta:global(.visto) .naipe { transition: none; }
  }
  @media print {
    .tinta { clip-path: none; }
    .naipe { opacity: 1; transform: none; }
  }
</style>
