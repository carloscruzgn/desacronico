<script lang="ts">
  // La carta ampliada (INFO-10, UI-18, A11Y-6): la carta tal cual, sobre la mesa en penumbra con una luz suave
  // detrás para que las cartas negras y azul oscuro no se pierdan, y debajo una ficha con lo que la carta no
  // dice o dice en pequeño: el crédito entero de la imagen, la serie, la era y qué significan la «c.» y el guion.
  import { cubicOut } from 'svelte/easing'
  import { fade } from 'svelte/transition'
  import { AMBITOS, eraDe, type Carta as TCarta, type Era, type Fecha } from '../../compartido/tipos'
  import Carta from './Carta.svelte'
  import { anioHablado, anioTexto, enMillones, textoPlano } from './datos'
  import { capa, cerrarCapa } from './capas'
  import { dura } from './movimiento'
  import { callar, leerCarta, sonido } from './sonido'
  import { onDestroy, tick } from 'svelte'

  interface Props {
    carta: TCarta
    /** El año, si la carta ya se ha jugado. Sin él no se puede dar la vuelta. */
    fecha?: Fecha | null
    reverso: boolean
    /** La carta de la mesa de la que sale (ANIM-15): la ampliada sale de su sitio y vuelve a él al cerrarse. */
    desde?: HTMLElement | null
    onvolver: () => void
    oncerrar: () => void
  }
  let { carta, fecha = null, reverso, desde = null, onvolver, oncerrar }: Props = $props()
  // De dónde sale se decide al abrirla: al cerrarse, la mesa ya no la tiene apuntada.
  // svelte-ignore state_referenced_locally
  const deDonde = desde

  /** La carta sale de su sitio en la mesa, crece hasta aquí y, al cerrar, vuelve. Mientras, su sitio queda vacío. */
  function viaje(node: HTMLElement, p: { desde: HTMLElement | null }, op?: { direction?: 'in' | 'out' | 'both' }) {
    const origen = p.desde?.isConnected ? p.desde : null
    const a = origen?.getBoundingClientRect()
    if (!origen || !a?.width || dura(1) === 0) return { duration: dura(200), easing: cubicOut, css: (t: number) => `opacity: ${t}; transform: scale(${0.85 + 0.15 * t})` }
    const b = node.getBoundingClientRect()
    const dx = a.left + a.width / 2 - (b.left + b.width / 2)
    const dy = a.top + a.height / 2 - (b.top + b.height / 2)
    const s = a.width / b.width
    const duracion = 320
    origen.style.opacity = '0'
    if (op?.direction === 'out') setTimeout(() => (origen.style.opacity = ''), duracion - 10)
    return {
      duration: duracion,
      easing: cubicOut,
      css: (t: number, u: number) => `transform: translate(${u * dx}px, ${u * dy}px) scale(${s + (1 - s) * t})`,
    }
  }
  // Por si la ventana se cierra sin su salida (la mesa se desmonta): la carta de la mesa vuelve a verse.
  onDestroy(() => {
    const d = deDonde
    if (d) setTimeout(() => (d.style.opacity = ''), 400)
  })

  // Girar la carta arrastrando el dedo (ANIM-15): sigue al dedo y, si pasa de canto, se da la vuelta; si no,
  // vuelve. Solo se inclina su sombra. «Dar la vuelta» hace lo mismo con un toque o con el teclado.
  let angulo = $state(0)
  let soltando = $state(false)
  let sinGiro = $state(false)
  let arrastre: { x: number; ancho: number; id: number } | null = null
  function bajar(e: PointerEvent) {
    if (!fecha || e.button > 0) return
    const el = e.currentTarget as HTMLElement
    arrastre = { x: e.clientX, ancho: el.offsetWidth, id: e.pointerId }
    el.setPointerCapture(e.pointerId)
  }
  function mover(e: PointerEvent) {
    if (!arrastre || e.pointerId !== arrastre.id) return
    const dx = e.clientX - arrastre.x
    angulo = Math.max(-180, Math.min(180, (dx / arrastre.ancho) * 180))
  }
  async function soltar() {
    if (!arrastre) return
    arrastre = null
    soltando = true
    if (Math.abs(angulo) < 90) {
      angulo = 0
      setTimeout(() => (soltando = false), dura(240))
      return
    }
    angulo = Math.sign(angulo) * 180
    await new Promise((r) => setTimeout(r, dura(220)))
    // Ya está del otro lado: se cambia la cara sin volver a girarla.
    sinGiro = true
    soltando = false
    angulo = 0
    onvolver()
    await tick()
    requestAnimationFrame(() => requestAnimationFrame(() => (sinGiro = false)))
  }
  const coseno = $derived(Math.abs(Math.cos((angulo * Math.PI) / 180)))

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
  // Al cerrar la carta deja de leerse.
  onDestroy(callar)
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
  onclick={(e) => e.target === e.currentTarget && cerrarCapa()}
>
  <!-- La penumbra se funde aparte: la carta no se desvanece, viaja desde su sitio y vuelve a él. -->
  <div class="fondo" transition:fade={{ duration: dura(160) }} onclick={cerrarCapa} aria-hidden="true"></div>
  <div class="carta-grande" in:viaje={{ desde: deDonde }} out:viaje={{ desde: deDonde }}>
    <!-- la sombra en la mesa: lo único que se inclina mientras se gira -->
    <div
      class="sombra"
      aria-hidden="true"
      style:transform="translateX({angulo * 0.12}px) skewX({-angulo * 0.1}deg) scaleX({0.35 + 0.65 * coseno})"
      style:transition={soltando ? 'transform 0.22s var(--curva-voltear)' : 'none'}
    ></div>
    <!-- El gesto es un atajo: «Dar la vuelta» hace lo mismo con un toque o con el teclado. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="volteo"
      class:girable={!!fecha}
      class:sin-giro={sinGiro}
      style:transform="rotateY({angulo}deg)"
      style:transition={soltando ? 'transform 0.22s var(--curva-voltear)' : 'none'}
      onpointerdown={bajar}
      onpointermove={mover}
      onpointerup={soltar}
      onpointercancel={soltar}
    >
      <Carta {carta} {fecha} volteada={reverso} imagen="grande" />
    </div>
  </div>
  <div class="lado" transition:fade={{ duration: dura(160) }}>
    <dl class="ficha" id="ficha-carta">
      {#if conAnio && fecha}
        <div><dt>Año</dt><dd class="cifras">{anioTexto(fecha)}<span class="sr-only">: {anioHablado(fecha)}</span> · {ERA[eraDe(fecha.anio)]}</dd></div>
      {/if}
      {#each notas as n (n)}<div class="nota"><dd>{n}</dd></div>{/each}
      <div><dt>Serie</dt><dd>{AMBITOS[carta.ambito]}</dd></div>
      <div><dt>Imagen</dt><dd>{carta.credito}</dd></div>
    </dl>
    <div class="botones">
      <!-- Escuchar: el texto y, si se ve el reverso, el año. -->
      <button class="boton secundario" onclick={() => (sonido.hablando ? callar() : leerCarta(carta.id, reverso ? fecha : null))}>{sonido.hablando ? 'Parar' : 'Escuchar'}</button>
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
    cursor: zoom-out;
  }
  .fondo {
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(rgb(0 0 0 / 0.55), rgb(0 0 0 / 0.55)),
      var(--fondo-mesa);
  }
  .carta-grande {
    position: relative;
    cursor: default;
    perspective: 1400px;
  }
  .volteo {
    position: relative;
    transform-style: preserve-3d;
  }
  .girable {
    cursor: grab;
    touch-action: none;
  }
  .girable:active { cursor: grabbing; }
  /* Al cambiar de cara tras girarla a mano, la carta no se vuelve a girar sola. */
  .sin-giro :global(.giro) { transition: none !important; }
  .sombra {
    position: absolute;
    left: 8%;
    right: 8%;
    bottom: -3%;
    height: 10%;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgb(0 0 0 / 0.55), transparent);
    filter: blur(4px);
    pointer-events: none;
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
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  .botones .boton {
    flex: 1 1 auto;
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
