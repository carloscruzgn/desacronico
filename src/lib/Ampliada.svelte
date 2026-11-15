<script lang="ts">
  // La carta ampliada (INFO-10, UI-18, A11Y-6): la carta tal cual, sobre la mesa en penumbra con una luz suave
  // detrás para que las cartas negras y azul oscuro no se pierdan, y debajo una ficha con lo que la carta no
  // dice o dice en pequeño: el crédito entero de la imagen, la serie, la era y qué significan la «c.» y el guion.
  import { cubicOut } from 'svelte/easing'
  import { fade, scale } from 'svelte/transition'
  import { AMBITOS, eraDe, type Carta as TCarta, type Era, type Fecha } from '../../compartido/tipos'
  import Carta from './Carta.svelte'
  import { anioHablado, anioTexto, enMillones, textoPlano } from './datos'
  import { capa, cerrarCapa } from './capas'
  import { dura } from './movimiento'

  interface Props {
    carta: TCarta
    /** El año, si la carta ya se ha jugado. Sin él no se puede dar la vuelta. */
    fecha?: Fecha | null
    reverso: boolean
    onvolver: () => void
    oncerrar: () => void
  }
  let { carta, fecha = null, reverso, onvolver, oncerrar }: Props = $props()

  const ERA: Record<Era, string> = {
    antigua: 'Edad Antigua',
    media: 'Edad Media',
    moderna: 'Edad Moderna',
    contemporanea: 'Edad Contemporánea',
  }
  // Lo que dice la cara de la vista: el año y la era, solo por el reverso.
  const conAnio = $derived(reverso && !!fecha)
  const notas = $derived.by(() => {
    if (!conAnio || !fecha) return []
    const n: string[] = []
    if (fecha.circa) n.push('c. = fecha aproximada')
    if (fecha.anio < 0) n.push(`${anioTexto({ anio: fecha.anio, circa: false })} = ${enMillones(fecha.anio) ? '' : 'año '}${anioHablado({ anio: fecha.anio, circa: false })}`)
    return n
  })
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="ampliada"
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-label="Carta ampliada: {textoPlano(carta)}"
  aria-describedby="ficha-carta"
  use:capa={oncerrar}
  transition:fade={{ duration: dura(160) }}
  onclick={(e) => e.target === e.currentTarget && cerrarCapa()}
>
  <div class="carta-grande" in:scale={{ duration: dura(260), start: 0.8, easing: cubicOut }}>
    <Carta {carta} {fecha} volteada={reverso} imagen="grande" />
  </div>
  <div class="lado">
    <dl class="ficha" id="ficha-carta">
      {#if conAnio && fecha}
        <div><dt>Año</dt><dd class="cifras">{anioTexto(fecha)}<span class="sr-only">: {anioHablado(fecha)}</span> · {ERA[eraDe(fecha.anio)]}</dd></div>
      {/if}
      {#each notas as n (n)}<div class="nota"><dd>{n}</dd></div>{/each}
      <div><dt>Serie</dt><dd>{AMBITOS[carta.ambito]}</dd></div>
      <div><dt>Imagen</dt><dd>{carta.credito}</dd></div>
    </dl>
    <div class="botones">
      {#if fecha}<button class="boton secundario" onclick={onvolver}>Dar la vuelta</button>{/if}
      <button class="boton" data-foco onclick={cerrarCapa}>Cerrar</button>
    </div>
  </div>
</div>

<style>
  /* La mesa en penumbra, con una luz suave detrás de la carta. */
  .ampliada {
    --ancho: min(90vw, (100dvh - 250px) / 1.383, 460px);
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 14px;
    padding: 16px;
    background:
      linear-gradient(rgb(0 0 0 / 0.55), rgb(0 0 0 / 0.55)),
      var(--fondo-mesa);
    cursor: zoom-out;
  }
  .carta-grande {
    position: relative;
    cursor: default;
  }
  /* la luz, justo detrás de la carta: las cartas negras y azul oscuro conservan su silueta */
  .carta-grande::before {
    content: '';
    position: absolute;
    inset: -22% -30%;
    z-index: -1;
    background: radial-gradient(closest-side, rgb(235 233 217 / 0.2), rgb(235 233 217 / 0.07) 60%, transparent);
    pointer-events: none;
  }
  .lado {
    display: grid;
    gap: 12px;
    width: min(var(--ancho) + 40px, 100%);
    cursor: default;
  }
  .ficha {
    margin: 0;
    padding: 8px 14px;
    border-radius: var(--radio-ficha);
    background: var(--grano-papel), var(--papel-2);
    color: var(--tinta);
    box-shadow: var(--canto);
    font-size: 0.92rem;
    line-height: 1.3;
  }
  .ficha div {
    display: flex;
    gap: 8px;
    padding: 2px 0;
  }
  dt {
    flex: none;
    width: 4.2em;
    color: #55544c;
    font-style: italic;
  }
  dd {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .nota dd {
    padding-left: calc(4.2em + 8px);
    color: #55544c;
    font-style: italic;
  }
  .botones {
    display: flex;
    justify-content: center;
    gap: 10px;
  }
  .botones .boton {
    flex: 1;
    max-width: 220px;
    padding-inline: 0.8em;
    white-space: nowrap;
  }

  /* En pantallas anchas, la ficha va al lado de la carta. */
  @media (min-width: 900px) and (min-aspect-ratio: 1 / 1) {
    .ampliada {
      --ancho: min(42vw, (100dvh - 60px) / 1.383, 480px);
      grid-template-columns: auto 320px;
      align-items: center;
      gap: 28px;
    }
    .lado { width: 320px; }
  }
</style>
