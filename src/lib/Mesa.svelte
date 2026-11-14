<script lang="ts">
  import { onMount, tick, untrack } from 'svelte'
  import { flip } from 'svelte/animate'
  import { cubicOut } from 'svelte/easing'
  import { crossfade, fade, scale } from 'svelte/transition'
  import { jugar, type Anios, type EstadoClasico, type Resultado } from '../../compartido/clasico'
  import type { Fecha } from '../../compartido/tipos'
  import Carta from './Carta.svelte'
  import { guardarPartida, porId, textoPlano } from './datos'
  import Marca from './Marca.svelte'

  interface Props {
    inicial: EstadoClasico
    /** Partida recién creada: se reparte con animación. Si no, se retoma tal como estaba. */
    nueva: boolean
    anios: Anios
    onsalir: () => void
    onotra: () => void
  }
  let { inicial, nueva, anios, onsalir, onotra }: Props = $props()

  interface Pieza {
    id: string
    volteada: boolean
    marca: '' | 'ok' | 'fallo'
  }

  // `estado` es la partida según las reglas; lo demás es lo que se ve en la mesa,
  // que va por detrás mientras duran las animaciones de cada jugada.
  let estado = $state.raw(untrack(() => inicial))
  let crono = $state<Pieza[]>([])
  let mano = $state<string[]>([])
  let visible = $state(untrack(() => inicial.turno))
  let cuentas = $state(untrack(() => inicial.jugadores.map((j) => j.mano.length)))
  let nMazo = $state(untrack(() => inicial.mazo.length))
  let nDescartes = $state(untrack(() => inicial.descartes.length))
  let descarte = $state<string[]>(untrack(() => inicial.descartes.slice(-1)))
  let fechas = $state<Record<string, Fecha>>({})
  let seleccionada = $state<string | null>(null)
  let ocupado = $state(true)
  let aviso = $state<string | null>(null)
  let ampliada = $state<{ id: string; reverso: boolean } | null>(null)
  let fin = $state<number[] | null>(null)
  let verFin = $state(false)
  let veredicto = $state<'' | 'ok' | 'fallo'>('')

  let mazoEl: HTMLElement
  let cronoEl: HTMLElement
  let origen: 'mazo' | 'lado' = 'mazo'

  const solo = $derived(estado.jugadores.length === 1)
  const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

  function fechaDe(id: string): Fecha {
    return { anio: anios[id][0], circa: !!anios[id][1] }
  }

  // Cartas que entran sin venir de otro sitio de la mesa: salen del mazo o suben desde abajo.
  function entrada(node: Element, params: { delay?: number }, intro: boolean) {
    if (!intro) return { duration: 180, css: (t: number) => `opacity: ${t}` }
    if (origen === 'mazo' && mazoEl) {
      const r = node.getBoundingClientRect()
      const m = mazoEl.getBoundingClientRect()
      const dx = m.left + m.width / 2 - (r.left + r.width / 2)
      const dy = m.top + m.height / 2 - (r.top + r.height / 2)
      const s = m.width / r.width
      return {
        duration: 480,
        delay: params.delay ?? 0,
        easing: cubicOut,
        css: (t: number, u: number) =>
          `transform: translate(${u * dx}px, ${u * dy}px) scale(${1 - u * (1 - s)}) rotate(${u * -12}deg); opacity: ${Math.min(1, t * 4)}`,
      }
    }
    return {
      duration: 380,
      delay: params.delay ?? 0,
      easing: cubicOut,
      css: (t: number, u: number) => `transform: translateY(${u * 70}%); opacity: ${t}`,
    }
  }
  const [enviar, recibir] = crossfade({ duration: 480, easing: cubicOut, fallback: entrada })

  onMount(async () => {
    const e = estado
    if (nueva) {
      await espera(300)
      crono.push({ id: e.cronologia[0], volteada: false, marca: '' })
      await espera(520)
      fechas[e.cronologia[0]] = fechaDe(e.cronologia[0])
      crono[0].volteada = true
      await espera(450)
      for (const id of e.jugadores[visible].mano) {
        mano.push(id)
        await espera(150)
      }
    } else {
      for (const id of [...e.cronologia, ...e.descartes.slice(-1)]) fechas[id] = fechaDe(id)
      crono = e.cronologia.map((id) => ({ id, volteada: true, marca: '' }))
      mano = [...e.jugadores[visible].mano]
    }
    await espera(350)
    if (!solo) await anunciar(`Turno de ${e.jugadores[visible].nombre}`, 1000)
    ocupado = false
  })

  async function anunciar(texto: string, ms: number) {
    aviso = texto
    await espera(ms)
    aviso = null
  }

  function elegir(id: string) {
    if (ocupado || fin) return
    seleccionada = seleccionada === id ? null : id
  }

  async function jugarEn(posicion: number) {
    if (ocupado || !seleccionada) return
    const id = seleccionada
    const jugador = visible
    const { estado: nuevo, resultado: r } = jugar(estado, anios, id, posicion)
    ocupado = true
    seleccionada = null

    // 1. La carta vuela de la mano a su hueco
    mano = mano.filter((x) => x !== id)
    crono.splice(posicion, 0, { id, volteada: false, marca: '' })
    cuentas[jugador]--
    await tick()
    cronoEl.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    await espera(620)

    // 2. Se voltea y enseña el año
    const pieza = crono.find((p) => p.id === id)!
    fechas[id] = fechaDe(id)
    pieza.volteada = true
    await espera(800)

    if (r.acierto) {
      pieza.marca = veredicto = 'ok'
      await espera(800)
      pieza.marca = ''
    } else {
      // 3. Fallo: tiembla, va a los descartes y se roba otra
      pieza.marca = veredicto = 'fallo'
      navigator.vibrate?.(120)
      await espera(1000)
      crono = crono.filter((p) => p.id !== id)
      descarte = [id]
      nDescartes++
      await espera(520)
      if (r.robada) {
        origen = 'mazo'
        mano.push(r.robada)
        cuentas[jugador]++
        nMazo = Math.max(0, nMazo - 1)
        await espera(520)
      }
    }

    veredicto = ''
    estado = nuevo
    await cerrarJugada(r)
  }

  async function cerrarJugada(r: Resultado) {
    const e = estado
    cuentas = e.jugadores.map((j) => j.mano.length)
    nMazo = e.mazo.length
    nDescartes = e.descartes.length
    if (!e.descartes.length) descarte = []

    if (e.ganadores.length) {
      guardarPartida(null)
      await espera(300)
      fin = e.ganadores
      verFin = true
      return
    }
    guardarPartida(e)

    if (r.desempate.length) {
      const nombres = r.desempate.map((d) => e.jugadores[d.jugador].nombre).join(' y ')
      await anunciar(`${nombres} acaban a la vez: desempate`, 2200)
    }

    if (e.turno !== visible) {
      origen = 'lado'
      mano = []
      await espera(230)
      visible = e.turno
      mano = [...e.jugadores[visible].mano]
      await anunciar(`Turno de ${e.jugadores[visible].nombre}`, 1100)
    } else {
      origen = 'mazo'
      for (const id of e.jugadores[visible].mano) if (!mano.includes(id)) mano.push(id)
    }
    ocupado = false
  }

  function nombresGanadores(g: number[]) {
    return g.map((i) => estado.jugadores[i].nombre).join(' y ')
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && ((ampliada = null), (seleccionada = null))} />

<div class="mesa" class:eligiendo={!!seleccionada && !ocupado}>
  <header class="barra">
    <button class="salir" onclick={onsalir} aria-label="Salir al menú">‹</button>
    <span class="titulo"><Marca /></span>
    <div class="pilas">
      <figure>
        <div class="pila mazo" bind:this={mazoEl}><span>{nMazo}</span></div>
        <figcaption>mazo</figcaption>
      </figure>
      <figure>
        <button
          class="pila descartes"
          disabled={!descarte.length}
          onclick={() => descarte[0] && (ampliada = { id: descarte[0], reverso: true })}
          aria-label="Ver la última carta descartada"
        >
          {#each descarte as id (id)}
            <div class="encima" in:recibir={{ key: id }} out:enviar={{ key: id }}>
              <Carta carta={porId[id]} fecha={fechas[id]} volteada />
            </div>
          {/each}
          {#if nDescartes}<span class="cuenta">{nDescartes}</span>{/if}
        </button>
        <figcaption>descartes</figcaption>
      </figure>
    </div>
  </header>

  {#if !solo}
    <ul class="jugadores">
      {#each estado.jugadores as j, i (i)}
        <li class:activo={i === visible && !fin} class:eliminado={j.eliminado} class:ganador={fin?.includes(i)}>
          <span class="nombre">{j.nombre}</span>
          <span class="cartas" aria-label="{cuentas[i]} cartas">{cuentas[i]}</span>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="crono" bind:this={cronoEl}>
    <div class="tira">
      {#each crono as p, i (p.id)}
        <div class="pieza" animate:flip={{ duration: 380, easing: cubicOut }}>
          <button class="hueco" tabindex={seleccionada ? 0 : -1} onclick={() => jugarEn(i)} aria-label="Colocar aquí, antes de {fechas[p.id]?.anio ?? 'esta carta'}">
            <span>+</span>
          </button>
          <button
            class="naipe"
            data-id={p.id}
            in:recibir={{ key: p.id }}
            out:enviar={{ key: p.id }}
            onclick={() => (ampliada = { id: p.id, reverso: p.volteada })}
            aria-label={textoPlano(porId[p.id])}
          >
            <div class="cuerpo {p.marca}">
              <Carta carta={porId[p.id]} fecha={fechas[p.id]} volteada={p.volteada} />
            </div>
          </button>
        </div>
      {/each}
      <button class="hueco" tabindex={seleccionada ? 0 : -1} onclick={() => jugarEn(crono.length)} aria-label="Colocar aquí, al final">
        <span>+</span>
      </button>
    </div>
  </div>

  <div class="leyenda" aria-live="polite">
    {#if fin}
      <p class="texto">{solo ? 'Cronología completada' : `Gana ${nombresGanadores(fin)}`}</p>
    {:else if seleccionada}
      {#key seleccionada}
        <p class="texto" in:fade={{ duration: 180 }}>{@html porId[seleccionada].texto}</p>
      {/key}
      <p class="pista">
        Toca un hueco <b>+</b> de la cronología ·
        <button class="enlace" onclick={() => (ampliada = { id: seleccionada!, reverso: false })}>ampliar</button>
      </p>
    {:else if veredicto}
      <p class="veredicto {veredicto}" in:scale={{ duration: 220, start: 0.7 }}>
        {veredicto === 'ok' ? '¡Correcto!' : 'No encaja: va a los descartes'}
      </p>
    {:else if !ocupado}
      <p class="pista grande">{solo ? 'Elige una carta' : `${estado.jugadores[visible].nombre}, elige una carta`}</p>
    {/if}
  </div>

  <div class="mano">
    {#if fin}
      <div class="final" in:fade>
        <button class="boton" onclick={onotra}>Otra partida</button>
        <button class="boton secundario" onclick={onsalir}>Menú</button>
      </div>
    {:else}
      {#each mano as id (id)}
        <button
          class="naipe"
          class:elegida={seleccionada === id}
          animate:flip={{ duration: 300, easing: cubicOut }}
          in:recibir={{ key: id }}
          out:enviar={{ key: id }}
          onclick={() => elegir(id)}
          aria-pressed={seleccionada === id}
          aria-label={textoPlano(porId[id])}
        >
          <div class="cuerpo">
            <Carta carta={porId[id]} />
          </div>
        </button>
      {/each}
    {/if}
  </div>

  {#if aviso}
    <div class="aviso" transition:scale={{ duration: 260, start: 0.85 }}>{aviso}</div>
  {/if}
</div>

{#if ampliada}
  <button class="ampliada" transition:fade={{ duration: 160 }} onclick={() => (ampliada = null)} aria-label="Cerrar">
    <div in:scale={{ duration: 260, start: 0.7, easing: cubicOut }}>
      <Carta carta={porId[ampliada.id]} fecha={fechas[ampliada.id]} volteada={ampliada.reverso} />
    </div>
  </button>
{/if}

{#if fin && verFin}
  <div class="velo" transition:fade={{ duration: 250 }}>
    <div class="premio" in:scale={{ duration: 450, start: 0.8, easing: cubicOut }}>
      <p class="corona">{solo ? 'Cronología completada' : 'Fin de la partida'}</p>
      <h2>{solo ? '¡Hecho!' : `¡Gana ${nombresGanadores(fin)}!`}</h2>
      <table>
        <thead><tr><th></th><th>aciertos</th><th>fallos</th></tr></thead>
        <tbody>
          {#each estado.jugadores as j, i (i)}
            <tr class:ganador={fin.includes(i)}>
              <td>{j.nombre}</td><td>{j.aciertos}</td><td>{j.fallos}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="acciones">
        <button class="boton" onclick={onotra}>Otra partida</button>
        <button class="boton secundario" onclick={() => (verFin = false)}>Ver la cronología</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .mesa {
    --carta-crono: min(36vw, 200px, 29dvh);
    --carta-mano: min(22vw, 150px, 18dvh);
    --oro: #e8c66a;
    position: relative;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Barra superior: salir, marca y las dos pilas */
  .barra {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(12px + env(safe-area-inset-top)) 16px 4px 4px;
  }
  .salir {
    width: 44px;
    height: 44px;
    border: 0;
    background: none;
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
  }
  .titulo {
    font-size: 1.5rem;
    margin-right: auto;
  }
  .pilas {
    display: flex;
    gap: 14px;
  }
  figure {
    margin: 0;
    display: grid;
    justify-items: center;
    gap: 1px;
  }
  figcaption {
    font-size: 0.72rem;
    color: var(--gris-claro);
    font-style: italic;
  }
  .pila {
    position: relative;
    width: 34px;
    aspect-ratio: 554 / 766;
    border-radius: 3px;
    display: grid;
    place-items: center;
    font-family: 'Fell SC', serif;
    font-size: 1.05rem;
    padding: 0;
  }
  .mazo {
    background: var(--papel);
    color: var(--tinta);
    box-shadow:
      1px 1px 0 #cfccb8,
      2px 2px 0 #b9b6a0,
      3px 3px 0 #a19e8a,
      4px 5px 8px rgb(0 0 0 / 0.4);
  }
  .descartes {
    border: 1px dashed rgb(235 233 217 / 0.4);
    background: rgb(0 0 0 / 0.2);
    cursor: pointer;
  }
  .descartes:disabled { cursor: default; }
  .encima {
    --ancho: 100%;
    position: absolute;
    inset: 0;
  }
  .cuenta {
    position: absolute;
    right: -8px;
    top: -6px;
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    border-radius: 10px;
    background: var(--fallo);
    color: #fff;
    font-size: 0.8rem;
    line-height: 20px;
    text-align: center;
  }

  /* Jugadores */
  .jugadores {
    display: flex;
    gap: 6px;
    margin: 0;
    padding: 4px 12px;
    list-style: none;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .jugadores li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px 3px 12px;
    border-radius: 999px;
    border: 1px solid rgb(235 233 217 / 0.25);
    color: var(--gris-claro);
    white-space: nowrap;
    transition:
      background 0.3s,
      color 0.3s;
  }
  .jugadores li.activo {
    background: var(--papel);
    color: var(--tinta);
    border-color: var(--papel);
  }
  .jugadores li.ganador {
    background: var(--oro);
    color: var(--tinta);
    border-color: var(--oro);
  }
  .jugadores li.eliminado {
    opacity: 0.45;
    text-decoration: line-through;
  }
  .cartas {
    min-width: 20px;
    height: 26px;
    padding: 0 4px;
    border-radius: 3px;
    background: rgb(0 0 0 / 0.3);
    color: var(--papel);
    font-family: 'Fell SC', serif;
    line-height: 26px;
    text-align: center;
  }
  .activo .cartas,
  .ganador .cartas {
    background: var(--tinta);
  }

  /* Cronología */
  .crono {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    /* línea del tiempo detrás de las cartas */
    background: linear-gradient(rgb(235 233 217 / 0.16), rgb(235 233 217 / 0.16)) center / 100% 2px no-repeat;
  }
  @media (hover: hover) {
    .crono {
      scrollbar-width: thin;
      scrollbar-color: rgb(235 233 217 / 0.3) transparent;
    }
  }
  .tira {
    display: flex;
    align-items: center;
    width: max-content;
    margin: 0 auto;
    padding: 14px 12px;
  }
  .pieza {
    display: flex;
    align-items: center;
  }
  .crono .naipe {
    --ancho: var(--carta-crono);
    margin: 0 4px;
  }

  .hueco {
    flex: none;
    width: 0;
    height: calc(var(--carta-crono) * 1.2);
    padding: 0;
    border: 0 dashed var(--oro);
    border-radius: 8px;
    background: rgb(232 198 106 / 0.1);
    color: var(--oro);
    font-size: 1.7rem;
    opacity: 0;
    overflow: hidden;
    pointer-events: none;
    cursor: pointer;
    transition:
      width 0.28s cubic-bezier(0.3, 1.3, 0.5, 1),
      margin 0.28s,
      opacity 0.2s;
  }
  .eligiendo .hueco {
    width: 46px;
    margin: 0 3px;
    border-width: 2px;
    opacity: 1;
    pointer-events: auto;
    animation: latir 1.4s ease-in-out infinite;
  }
  .hueco:hover,
  .hueco:focus-visible {
    background: rgb(232 198 106 / 0.3);
  }
  @keyframes latir {
    50% { background: rgb(232 198 106 / 0.24); }
  }

  .naipe {
    display: block;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    border-radius: 6px;
  }
  .cuerpo {
    position: relative;
    border-radius: 6px;
    transition:
      transform 0.22s cubic-bezier(0.3, 1.4, 0.5, 1),
      filter 0.22s;
  }
  .cuerpo.ok {
    animation: acierto 0.7s ease-out;
  }
  .cuerpo.fallo {
    animation: fallo 0.55s ease-in-out;
    filter: drop-shadow(0 0 10px var(--fallo)) saturate(0.7);
  }
  @keyframes acierto {
    0% { filter: drop-shadow(0 0 0 #6fd08a); }
    30% { transform: scale(1.06); filter: drop-shadow(0 0 16px #6fd08a); }
    100% { filter: drop-shadow(0 0 0 transparent); }
  }
  @keyframes fallo {
    15%, 55% { transform: translateX(-7px) rotate(-2deg); }
    35%, 75% { transform: translateX(7px) rotate(2deg); }
  }

  /* Texto de la carta elegida y pistas */
  .leyenda {
    min-height: 76px;
    padding: 4px 16px 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }
  .leyenda p { margin: 0; }
  .texto {
    font-size: 1.12rem;
    line-height: 1.2;
    text-wrap: balance;
  }
  .pista {
    color: var(--gris-claro);
    font-style: italic;
    font-size: 0.95rem;
  }
  .pista b {
    color: var(--oro);
    font-style: normal;
  }
  .pista.grande { font-size: 1.1rem; }
  .veredicto {
    font-family: 'Fell SC', serif;
    font-size: 1.5rem;
  }
  .veredicto.ok { color: #8fdca4; }
  .veredicto.fallo { color: #f0a3a3; }
  .enlace {
    padding: 6px 2px;
    border: 0;
    background: none;
    color: var(--papel);
    text-decoration: underline;
    font-style: italic;
    cursor: pointer;
  }

  /* Mano */
  .mano {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 6px;
    min-height: calc(var(--carta-mano) * 1.383 + 30px);
    padding: 18px 10px calc(12px + env(safe-area-inset-bottom));
  }
  .mano .naipe {
    --ancho: 100%;
    flex: 0 1 var(--carta-mano);
    min-width: 0;
    transition: opacity 0.2s;
  }
  .mano .elegida .cuerpo {
    transform: translateY(-11%) scale(1.04);
    filter: drop-shadow(0 0 9px var(--oro));
  }
  .eligiendo .mano .naipe:not(.elegida) { opacity: 0.6; }
  .final {
    align-self: center;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }

  /* Avisos de turno */
  .aviso {
    position: absolute;
    left: 50%;
    top: 42%;
    translate: -50% -50%;
    z-index: 20;
    max-width: 88vw;
    padding: 0.5em 1.3em;
    border-radius: 8px;
    background: var(--papel);
    color: var(--tinta);
    font-family: 'Fell SC', serif;
    font-size: 1.6rem;
    text-align: center;
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.6);
    pointer-events: none;
  }

  /* Carta ampliada */
  .ampliada {
    --ancho: min(86vw, 58dvh, 460px);
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    border: 0;
    padding: 0;
    background: rgb(0 0 0 / 0.72);
    cursor: zoom-out;
  }

  /* Final de la partida */
  .velo {
    position: fixed;
    inset: 0;
    z-index: 35;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(0 0 0 / 0.66);
  }
  .premio {
    width: min(100%, 400px);
    padding: 22px 20px;
    border-radius: 12px;
    background: var(--papel-2);
    color: var(--tinta);
    text-align: center;
    box-shadow: 0 20px 60px rgb(0 0 0 / 0.6);
  }
  .corona {
    margin: 0;
    font-style: italic;
    color: var(--gris);
  }
  .premio h2 {
    margin: 0.1em 0 0.5em;
    font-size: 2.1rem;
    line-height: 1.1;
  }
  table {
    width: 100%;
    margin-bottom: 18px;
    border-collapse: collapse;
    font-size: 1.05rem;
  }
  th {
    font-weight: normal;
    font-style: italic;
    color: var(--gris);
    font-size: 0.9rem;
  }
  td {
    padding: 5px 4px;
    border-top: 1px solid var(--gris-claro);
  }
  td:first-child { text-align: left; }
  tr.ganador td { font-weight: bold; }
  .acciones {
    display: grid;
    gap: 10px;
  }
  .acciones .secundario {
    color: var(--tinta);
    box-shadow: inset 0 0 0 1px var(--gris);
  }

  @media (prefers-reduced-motion: reduce) {
    .eligiendo .hueco,
    .cuerpo.ok,
    .cuerpo.fallo {
      animation: none;
    }
  }
</style>
