<script lang="ts" module>
  // La marca se despliega de «dac» a «desacrónico» solo la primera vez que se ve la portada en cada carga.
  let desplegadas = 0
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import detallesJson from '../../compartido/detalles.json'
  import { barajar } from '../../compartido/clasico'
  import type { Fecha } from '../../compartido/tipos'
  import Carta from './Carta.svelte'
  import { cargarAnios, cartas } from './datos'
  import Icono from './Icono.svelte'
  import Marca from './Marca.svelte'
  import { reducido } from './movimiento'

  interface Props {
    hayGuardada: boolean
    /** Código de la sala en línea que se dejó abierta, si la hay. */
    sala: string
    onjugar: () => void
    onenlinea: () => void
    onsala: () => void
    oncontinuar: () => void
    onreglas: () => void
    ontutorial: () => void
  }
  let { hayGuardada, sala, onjugar, onenlinea, onsala, oncontinuar, onreglas, ontutorial }: Props = $props()

  const yaDesplegada = desplegadas++ > 0

  // Abanico decorativo: cinco cartas al azar, una de cada ámbito
  const abanico = ['comunicacion', 'social', 'cientifico', 'mujer', 'coria'].map(
    (a) => barajar(cartas.filter((c) => c.ambito === a))[0],
  )

  // La portada enseña la regla (ANIM-13): cada 4-5 s se voltea una carta del abanico y enseña su año de verdad;
  // tras tres vueltas se queda quieta. Se voltean las que tienen el detalle del reverso menos ampliado, que
  // salen de la miniatura y no obligan a descargar la ilustración grande. Con movimiento reducido, nada.
  const detalles = detallesJson as unknown as Record<string, [number, number, number] | null>
  const orden = barajar([0, 1, 2, 3, 4])
    .sort((a, b) => (detalles[abanico[a].id]?.[2] ?? 1) - (detalles[abanico[b].id]?.[2] ?? 1))
    .slice(0, 3)
  const VUELTAS = 3
  let preparada = $state<boolean[]>([false, false, false, false, false])
  let volteada = $state<boolean[]>([false, false, false, false, false])
  let fechas = $state<(Fecha | null)[]>([null, null, null, null, null])

  onMount(() => {
    if (reducido()) return
    let vivo = true
    let reloj: ReturnType<typeof setTimeout> | undefined
    const espera = (ms: number) => new Promise<void>((r) => (reloj = setTimeout(r, ms)))
    // Con la pestaña oculta no se gasta ninguna vuelta.
    const visible = async () => {
      while (vivo && document.hidden) await espera(500)
    }
    ;(async () => {
      await espera(2600)
      const anios = await cargarAnios().catch(() => null)
      if (!anios) return
      for (const k of orden.slice(0, VUELTAS)) {
        if (!vivo) return
        const [anio, circa] = anios[abanico[k].id] ?? []
        if (anio === undefined) continue
        fechas[k] = { anio, circa: !!circa }
        preparada[k] = true
        await espera(1600)
        await visible()
        if (!vivo) return
        volteada[k] = true
        await espera(2600)
        volteada[k] = false
        await espera(800)
      }
    })()
    return () => {
      vivo = false
      clearTimeout(reloj)
    }
  })
</script>

<main>
  <div class="portada">
    <div class="abanico" aria-hidden="true">
      {#each abanico as carta, i (carta.id)}
        <div class="hoja" class:alzada={volteada[i]} class:centro={i === 2} style="--i: {i - 2}; --z: {5 - Math.abs(i - 2)}">
          <Carta {carta} imagen="mini" soloAnverso={!preparada[i]} volteada={volteada[i]} fecha={fechas[i]} />
        </div>
      {/each}
    </div>

    <h1 tabindex="-1" data-titulo><Marca despliega={!yaDesplegada} /></h1>
    <p class="lema">Un juego de cartas para hacer cronologías</p>
  </div>

  <nav aria-label="Menú">
    {#if hayGuardada}
      <button class="entrada" class:principal={true} onclick={oncontinuar}>
        <span><b>Continuar partida</b></span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
      </button>
    {/if}
    {#if sala}
      <button class="entrada" onclick={onsala}>
        <span><b>Volver a la sala</b><small>Sala actual: <span class="codigo">{sala}</span></small></span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
      </button>
    {/if}
    <button class="entrada" class:principal={!hayGuardada} onclick={onjugar}>
      <Icono nombre="local" lado={36} />
      <span><b>Juega en local</b></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
    </button>
    <button class="entrada" onclick={onenlinea}>
      <Icono nombre="linea" lado={36} />
      <span><b>Juega en línea</b></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
    </button>
    <div class="pareja">
      <button class="entrada" onclick={ontutorial}>
        <Icono nombre="juega" lado={34} />
        <span><b>Cómo se juega</b></span>
      </button>
      <button class="entrada" onclick={onreglas}>
        <Icono nombre="reglas" lado={34} />
        <span><b>Reglamento</b></span>
      </button>
    </div>
  </nav>

  <footer>
    <!-- La franja del icono: los colores de las cuatro edades, de la Antigua a la Contemporánea. -->
    <span class="franja" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <!-- «dac», como el icono de la app, junto al logo del CEPA. -->
    <span class="sellos">
      <span class="dac" aria-hidden="true"><span class="d">d</span><span class="a">a</span>c</span>
      <span class="raya" aria-hidden="true"></span>
      <img src="/img/cepa.svg" alt="CEPA Coria" />
    </span>
    <span>
      Carlos Cruz González y Rodrigo Muñoz Martínez<br />
      <span class="con-licencia">CEPA Coria, 2024 <img class="licencia" src="/img/cc-by-sa.png" alt="Licencia CC BY-SA" width="88" height="31" /></span>
    </span>
  </footer>
</main>

<style>
  main {
    --radio-ficha: 8px;
    --radio-hoja: 14px;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 18px 16px calc(14px + env(safe-area-inset-bottom));
    text-align: center;
    overflow: hidden;
  }
  .portada {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .abanico {
    --ancho: min(39vw, 180px, 21dvh);
    position: relative;
    width: 100%;
    height: calc(var(--ancho) * 1.72);
    margin-top: 2.5dvh;
    view-transition-name: baraja;
  }
  .hoja {
    position: absolute;
    z-index: var(--z);
    left: 50%;
    top: 6%;
    margin-left: calc(var(--ancho) / -2);
    transform-origin: 50% 160%;
    transform: rotate(calc(var(--i) * var(--abre, 9deg)));
    animation: abrir 0.9s var(--curva-posar) both;
    animation-delay: calc((var(--i) + 2) * 70ms + 100ms);
    transition: translate 0.5s var(--curva-voltear);
  }
  /* la del centro, por delante y un poco adelantada */
  .hoja.centro {
    transform: translateY(-5%) scale(1.06);
  }
  /* la que se voltea se alza un poco del abanico, como si se cogiera para mirarla */
  .hoja.alzada {
    translate: 0 -6%;
  }
  @keyframes abrir {
    from {
      transform: rotate(0deg) translateY(40%);
      opacity: 0;
    }
  }

  h1 {
    margin: 0.15em 0 0;
    font-weight: normal;
    font-size: min(4.6rem, 15vw);
    line-height: 1;
    view-transition-name: marca;
  }
  .lema {
    margin: 0.4em 0 0;
    font-family: var(--fell);
    font-style: italic;
    color: var(--gris-claro);
    font-size: 1.15rem;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(100%, 380px);
    margin: auto 0;
    padding: 16px 0 12px;
  }
  .entrada {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 58px;
    padding: 9px 12px 9px 18px;
    border: 1px solid rgb(235 233 217 / 0.3);
    border-radius: var(--radio-ficha);
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
    flex: 1;
    min-width: 0;
  }
  .entrada b {
    font-size: 1.2rem;
    line-height: 1.2;
  }
  .entrada small {
    font-size: 0.95rem;
    line-height: 1.2;
    color: var(--gris-claro);
  }
  .entrada .codigo {
    display: inline;
    font-family: var(--fell-sc);
    font-weight: normal;
    letter-spacing: 0.06em;
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
    background: var(--grano-papel), var(--papel);
    color: var(--tinta);
    box-shadow:
      0 2px 0 #b9b6a0,
      0 8px 18px rgb(0 0 0 / 0.35);
  }

  .pareja {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
    gap: 10px;
  }
  .pareja .entrada {
    justify-content: flex-start;
    gap: 10px;
    padding-inline: 14px 8px;
  }
  footer {
    display: grid;
    justify-items: center;
    gap: 6px;
    color: #a3a297;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  /* La franja de las edades, de lado a lado de la pantalla. */
  .franja {
    display: flex;
    width: 100vw;
    height: 6px;
    margin-bottom: 12px;
  }
  .franja i { flex: 1; }
  .franja i:nth-child(1) { background: var(--antigua); }
  .franja i:nth-child(2) { background: var(--media); }
  .franja i:nth-child(3) { background: var(--moderna); }
  .franja i:nth-child(4) { background: var(--contemporanea); }
  .sellos {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .dac {
    font-family: 'Fell', serif;
    font-size: 2rem;
    line-height: 1;
    color: var(--papel);
    opacity: 0.85;
  }
  .dac .d { color: var(--gris); }
  .dac .a { color: #5c5c5c; }
  .raya {
    width: 1px;
    height: 26px;
    background: rgb(235 233 217 / 0.3);
  }
  .con-licencia {
    white-space: nowrap;
  }
  footer img.licencia {
    height: 1.35em;
    vertical-align: -0.35em;
    margin-left: 0.3em;
    filter: none;
    opacity: 0.8;
  }
  footer img {
    flex: none;
    height: 30px;
    width: auto;
    /* el logo es de tinta: sobre el tapete se pasa a papel */
    filter: invert(1) sepia(0.25) brightness(0.92);
    opacity: 0.85;
  }

  /* Escritorio: la portada a la izquierda y el menú a la derecha, sin huecos muertos. */
  @media (min-width: 900px) and (min-height: 560px) {
    main {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
      grid-template-rows: 1fr auto;
      align-items: center;
      column-gap: clamp(24px, 5vw, 80px);
      max-width: 1180px;
      margin: 0 auto;
      padding-inline: 32px;
    }
    .abanico {
      --ancho: min(17vw, 210px, 30dvh);
      --abre: 12deg;
    }
    nav {
      justify-self: start;
      margin: 0;
      width: min(100%, 420px);
    }
    footer {
      grid-column: 1 / -1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hoja {
      animation: none;
      transition: none;
    }
  }
</style>
