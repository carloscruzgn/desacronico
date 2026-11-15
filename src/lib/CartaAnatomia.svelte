<script lang="ts">
  // La anatomía de una carta: la 001 con llamadas numeradas que se dibujan, un botón para darle la
  // vuelta y otro para ver las cuatro eras (001, 024, 047 y 262). La lámina es decorativa para el
  // lector de pantalla: debajo va la misma información en una lista de texto.
  import Carta from './Carta.svelte'
  import { alVer } from './alVer'
  import { anioTexto, porId } from './datos'
  import { ANIOS_MUESTRA } from './muestras'
  import { ANATOMIA, ERAS } from './textos'

  // Dónde cae el punto de cada llamada, en % del ancho y del alto de la carta (medidas de la carta
  // impresa). Va al borde de cada parte, para no taparla; el número queda fuera, junto al rótulo.
  const SITIO: Record<number, [number, number]> = {
    1: [70, 4],
    2: [82, 30],
    3: [79, 66],
    4: [90, 86],
    5: [31, 10.5],
    6: [82, 34],
    7: [84, 65.3],
    8: [89, 92.6],
  }
  const CUATRO = ['001', '024', '047', '262']

  let cara = $state<'anverso' | 'reverso'>('anverso')
  let eras = $state(false)
  const llamadas = $derived(ANATOMIA.filter((p) => p.cara === cara))
  const estado = $derived(
    eras
      ? `Cuatro cartas por el ${cara}, una de cada era`
      : cara === 'anverso'
        ? 'Se ve el anverso de la carta, con las llamadas 1 a 4'
        : 'Se ve el reverso de la carta, con las llamadas 5 a 8',
  )
</script>

<div class="anatomia" use:alVer>
  <div class="mandos">
    <button class="ficha" onclick={() => (cara = cara === 'anverso' ? 'reverso' : 'anverso')}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" /></svg>
      Dale la vuelta
    </button>
    <button class="ficha" aria-pressed={eras} onclick={() => ((eras = !eras), eras && (cara = 'reverso'))}>
      {eras ? 'Volver a una carta' : 'Ver las cuatro eras'}
    </button>
  </div>
  <p class="sr-only" aria-live="polite">{estado}</p>

  {#if !eras}
    <div class="lamina" aria-hidden="true">
      <div class="carta">
        <Carta carta={porId['001']} fecha={ANIOS_MUESTRA['001']} volteada={cara === 'reverso'} />
      </div>
      {#key cara}
        {#each llamadas as p, i (p.n)}
          <div class="llamada" style="--x: {SITIO[p.n][0]}; --y: {SITIO[p.n][1]}; --i: {i}">
            <span class="punto"></span>
            <span class="trazo"></span>
            <span class="pin">{p.n}</span>
            <span class="rotulo">{p.rotulo}</span>
          </div>
        {/each}
      {/key}
    </div>
  {:else}
    <ol class="cuatro" aria-hidden="true">
      {#each CUATRO as id, i (id)}
        <li style="--i: {i}">
          <Carta carta={porId[id]} fecha={ANIOS_MUESTRA[id]} volteada={cara === 'reverso'} />
          <span class="era">{ERAS[i].nombre}</span>
          <span class="tramo">{ERAS[i].tramo}</span>
        </li>
      {/each}
    </ol>
  {/if}

  <div class="leyenda">
    <div>
      <h5>Anverso</h5>
      <ol>
        {#each ANATOMIA.filter((p) => p.cara === 'anverso') as p (p.n)}
          <li value={p.n}><b>{p.rotulo}.</b> {@html p.texto}</li>
        {/each}
      </ol>
    </div>
    <div>
      <h5>Reverso</h5>
      <ol>
        {#each ANATOMIA.filter((p) => p.cara === 'reverso') as p (p.n)}
          <li value={p.n}><b>{p.rotulo}.</b> {@html p.texto}</li>
        {/each}
      </ol>
      <p class="ejemplo">En la carta del ejemplo, <i>{anioTexto(ANIOS_MUESTRA['001'])}</i>: hacia el año 3500 antes de Cristo.</p>
    </div>
  </div>
</div>

<style>
  .anatomia {
    --carta: min(200px, 50vw);
    margin: 1.2em 0 1.6em;
  }
  .mandos {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 18px;
  }
  .ficha {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    min-height: 44px;
    padding: 0.35em 1em;
    border: 1.5px solid var(--tinta);
    border-radius: 6px;
    background: var(--papel);
    color: var(--tinta);
    font: 700 1rem var(--ui);
    cursor: pointer;
    box-shadow: 0 2px 0 rgb(29 29 27 / 0.35);
    transition: transform 0.12s var(--curva-posar, cubic-bezier(0.2, 0.7, 0.2, 1));
  }
  .ficha:active { transform: translateY(2px); box-shadow: none; }
  .ficha[aria-pressed='true'] { background: var(--tinta); color: var(--papel); }
  .ficha svg {
    width: 1.15em;
    height: 1.15em;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* La lámina: la carta a la izquierda y los rótulos a la derecha, unidos por un trazo de tinta. */
  .lamina {
    position: relative;
    width: 100%;
    max-width: calc(var(--carta) + 40px + 11em);
    height: calc(var(--carta) * 766 / 554);
    margin: 14px 0 6px;
  }
  .carta {
    --ancho: var(--carta);
    position: absolute;
    left: 0;
    top: 0;
  }
  .llamada {
    position: absolute;
    left: calc(var(--carta) * var(--x) / 100);
    right: 0;
    top: calc(var(--carta) * 766 / 554 * var(--y) / 100);
    display: flex;
    align-items: center;
    translate: 0 -50%;
  }
  .punto {
    position: absolute;
    left: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tinta);
    box-shadow: 0 0 0 2px var(--papel-2);
  }
  .pin {
    flex: none;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--tinta);
    color: var(--papel);
    box-shadow: 0 0 0 2px var(--papel-2);
    font: 0.95rem/1 var(--fell-sc);
  }
  .trazo {
    flex: none;
    width: calc(var(--carta) * (100 - var(--x)) / 100 + 8px);
    height: 1.5px;
    background: var(--tinta);
    box-shadow: 0 0 0 1px rgb(245 244 234 / 0.75);
    transform-origin: left;
  }
  .rotulo {
    flex: 1;
    min-width: 0;
    padding-left: 7px;
    font-size: 0.98rem;
    line-height: 1.12;
  }
  /* Se dibujan al entrar en pantalla y al dar la vuelta (el {#key} los vuelve a crear). */
  .trazo,
  .rotulo,
  .punto,
  .pin { opacity: 0; }
  .anatomia:global(.visto) .punto { opacity: 1; animation: aparecer 0.2s calc(0.2s + var(--i) * 0.16s) both; }
  .anatomia:global(.visto) .pin { opacity: 1; animation: aparecer 0.25s calc(0.6s + var(--i) * 0.16s) both; }
  .anatomia:global(.visto) .trazo { opacity: 1; animation: trazar 0.45s var(--curva-deslizar, cubic-bezier(0.3, 0.6, 0.2, 1)) calc(0.35s + var(--i) * 0.16s) both; }
  .anatomia:global(.visto) .rotulo { opacity: 1; animation: aparecer 0.3s calc(0.65s + var(--i) * 0.16s) both; }
  @keyframes trazar {
    from { transform: scaleX(0); }
  }
  @keyframes aparecer {
    from { opacity: 0; }
  }

  .cuatro {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    max-width: 560px;
    margin: 14px 0 6px;
    padding: 0;
    list-style: none;
  }
  .cuatro li {
    --ancho: 100%;
    display: grid;
    justify-items: center;
    gap: 2px;
    text-align: center;
    animation: posar 0.4s var(--curva-posar, cubic-bezier(0.2, 0.7, 0.2, 1)) calc(var(--i) * 0.08s) both;
  }
  .cuatro li > :global(.carta) { margin-bottom: 6px; }
  .era {
    font: 0.95rem/1.1 var(--fell-sc);
  }
  .tramo {
    font-size: 0.85rem;
    color: #55544c;
  }
  @keyframes posar {
    from { opacity: 0; transform: translateY(-10px) rotate(-2deg); }
  }

  .leyenda {
    display: grid;
    gap: 0 28px;
    margin-top: 10px;
  }
  .leyenda h5 {
    margin: 0.6em 0 0.2em;
    font: 1.1rem var(--fell-sc);
  }
  .leyenda ol {
    margin: 0;
    padding-left: 1.6em;
  }
  .leyenda li {
    margin-bottom: 0.3em;
  }
  .leyenda li::marker {
    font-family: var(--fell-sc);
  }
  .ejemplo {
    font-size: 0.95rem;
    color: #55544c;
  }

  @media (min-width: 700px) {
    .anatomia { --carta: 230px; }
    .leyenda { grid-template-columns: 1fr 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    .anatomia:global(.visto) .pin,
    .anatomia:global(.visto) .punto,
    .anatomia:global(.visto) .trazo,
    .anatomia:global(.visto) .rotulo,
    .cuatro li { animation: none; }
  }
</style>
