<script lang="ts">
  import { onMount } from 'svelte'
  import detallesJson from '../../compartido/detalles.json'
  import { barajar } from '../../compartido/clasico'
  import type { Fecha } from '../../compartido/tipos'
  import { esteAparato } from './aparato'
  import Carta from './Carta.svelte'
  import { cargarAnios, cartas } from './datos'
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

  // «En este móvil» solo en un móvil de verdad; en la pizarra del aula, «en esta pantalla».
  const aqui = esteAparato()

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

    <h1 tabindex="-1" data-titulo><Marca /></h1>
    <p class="lema">Un juego de cartas para hacer cronologías</p>
  </div>

  <nav aria-label="Menú">
    {#if hayGuardada}
      <button class="entrada" class:principal={true} onclick={oncontinuar}>
        <span><b>Continuar partida</b><small>La que quedó a medias en {aqui}</small></span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
      </button>
    {/if}
    {#if sala}
      <button class="entrada" onclick={onsala}>
        <span><b>Volver a la sala <span class="codigo">{sala}</span></b><small>La partida en línea que dejaste abierta</small></span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
      </button>
    {/if}
    <button class="entrada" class:principal={!hayGuardada} onclick={onjugar}>
      <span><b>Juega en local</b></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
    </button>
    <button class="entrada" onclick={onenlinea}>
      <span><b>Juega en línea</b></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
    </button>
    <div class="pareja">
      <button class="entrada" onclick={ontutorial}>
        <svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M10.2 8.6v6.8l5.3-3.4z" /></svg>
        <span><b>Cómo se juega</b></span>
      </button>
      <button class="entrada" onclick={onreglas}>
        <svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C9.5 5 6.5 5 4 6v12.5c2.5-1 5.5-1 8 .5 2.5-1.5 5.5-1.5 8-.5V6c-2.5-1-5.5-1-8 .5zm0 0V19" /></svg>
        <span><b>Reglamento</b></span>
      </button>
    </div>
  </nav>

  <footer>
    <img src="/img/cepa.svg" alt="CEPA Coria" />
    <span>
      Carlos Cruz González y Rodrigo Muñoz Martínez<br />
      CEPA Coria, 2024 · CC BY-SA
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
  .entrada svg.icono {
    width: 24px;
    height: 24px;
    stroke-width: 1.6;
    opacity: 0.85;
  }
  .entrada.principal {
    border-color: var(--papel);
    background: var(--grano-papel), var(--papel);
    color: var(--tinta);
    box-shadow:
      0 2px 0 #b9b6a0,
      0 8px 18px rgb(0 0 0 / 0.35);
  }
  .entrada.principal small { color: #55544c; }

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
