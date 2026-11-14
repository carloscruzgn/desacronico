<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { flip } from 'svelte/animate'
  import { cubicOut } from 'svelte/easing'
  import { crossfade, fade, scale } from 'svelte/transition'
  import type { Anios, VistaClasico } from '../../compartido/clasico'
  import type { Fecha } from '../../compartido/tipos'
  import Carta from './Carta.svelte'
  import type { Controlador, Suceso } from './control'
  import { porId, textoPlano } from './datos'
  import Marca from './Marca.svelte'

  interface Props {
    control: Controlador
    onsalir: () => void
    /** Empezar otra partida. Sin ella (en línea, si no eres el anfitrión) solo se puede esperar. */
    onotra?: () => void
  }
  let { control, onsalir, onotra }: Props = $props()

  interface Pieza {
    id: string
    volteada: boolean
    marca: '' | 'ok' | 'fallo'
  }

  // svelte-ignore state_referenced_locally
  const { asiento, anfitrion, inicial } = control
  /** Jugador cuya mano se enseña: la propia en línea; la de quien tiene el turno si el dispositivo es de todos. */
  const manoDe = (v: VistaClasico) => (typeof asiento === 'number' ? asiento : v.turno)

  // `vista` es la partida según el servidor o las reglas; lo demás es lo que se ve en la mesa,
  // que va por detrás mientras duran las animaciones de cada jugada.
  let vista = $state.raw(inicial.vista)
  let conectados = $state.raw(inicial.conectados ?? null)
  let crono = $state<Pieza[]>([])
  let mano = $state<string[]>([])
  let visible = $state(manoDe(inicial.vista))
  let cuentas = $state(inicial.vista.jugadores.map((j) => j.mano.length))
  let nMazo = $state(inicial.vista.nMazo)
  let nDescartes = $state(inicial.vista.descartes.length)
  let descarte = $state<string[]>(inicial.vista.descartes.slice(-1))
  let fechas = $state<Record<string, Fecha>>({})
  let seleccionada = $state<string | null>(null)
  let ocupado = $state(true)
  let aviso = $state<string | null>(null)
  let ampliada = $state<{ id: string; reverso: boolean } | null>(null)
  let fin = $state<number[] | null>(null)
  let verFin = $state(false)
  let veredicto = $state<'' | 'ok' | 'fallo' | 'recoloca'>('')

  let mazoEl: HTMLElement
  let cronoEl: HTMLElement
  let chips = $state<HTMLElement[]>([])
  /** De dónde salen las cartas que entran sin venir de otro sitio de la mesa. */
  let origen: HTMLElement | null = null

  const local = asiento === 'todos'
  const solo = local && inicial.vista.jugadores.length === 1
  const miTurno = $derived(!fin && (local || asiento === vista.turno))
  const nombreTurno = $derived(vista.jugadores[vista.turno]?.nombre ?? '')
  const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

  function anotar(f: Anios) {
    for (const id in f) fechas[id] ??= { anio: f[id][0], circa: !!f[id][1] }
  }

  function entrada(node: Element, params: { delay?: number }, intro: boolean) {
    if (!intro) return { duration: 180, css: (t: number) => `opacity: ${t}` }
    if (origen?.isConnected) {
      const r = node.getBoundingClientRect()
      const m = origen.getBoundingClientRect()
      const dx = m.left + m.width / 2 - (r.left + r.width / 2)
      const dy = m.top + m.height / 2 - (r.top + r.height / 2)
      const s = Math.min(1, m.height / r.height)
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

  // Los sucesos se atienden de uno en uno: una jugada no empieza hasta que acaba de animarse la anterior.
  let cola: Suceso[] = []
  let atendiendo = true
  async function atender() {
    atendiendo = true
    while (cola.length) {
      const s = cola.shift()!
      if (s.jugada) await animar(s)
      else poner(s)
    }
    atendiendo = false
  }

  onMount(() => {
    const dejar = control.escuchar((s) => {
      cola.push(s)
      if (!atendiendo) atender()
    })
    repartir().then(atender)
    return dejar
  })

  async function repartir() {
    const v = vista
    const sinEmpezar = v.cronologia.length === 1 && !v.descartes.length && v.jugadores.every((j) => !j.aciertos && !j.fallos)
    if (!sinEmpezar) {
      poner(inicial)
      await espera(300)
    } else {
      origen = mazoEl
      await espera(300)
      crono.push({ id: v.cronologia[0], volteada: false, marca: '' })
      await espera(520)
      anotar(inicial.fechas)
      crono[0].volteada = true
      await espera(450)
      for (const id of v.jugadores[visible]?.mano ?? []) {
        mano.push(id)
        await espera(150)
      }
      await espera(350)
    }
    if (!fin && !solo) await anunciar(asiento === v.turno ? 'Empiezas tú' : `Turno de ${v.jugadores[v.turno].nombre}`, 1000)
    ocupado = false
  }

  /** Pone la mesa como dice la vista, sin animar la jugada (al retomar, reconectar o si alguien se va). */
  function poner(s: Suceso) {
    const v = s.vista
    vista = v
    conectados = s.conectados ?? null
    anotar(s.fechas)
    origen = null
    crono = v.cronologia.map((id) => crono.find((p) => p.id === id) ?? { id, volteada: true, marca: '' })
    for (const p of crono) p.volteada = true
    visible = manoDe(v)
    mano = [...(v.jugadores[visible]?.mano ?? [])]
    contar(v)
    if (seleccionada && !mano.includes(seleccionada)) seleccionada = null
    if (v.ganadores.length && !fin) {
      fin = v.ganadores
      verFin = true
    }
  }

  function contar(v: VistaClasico) {
    cuentas = v.jugadores.map((j) => j.mano.length)
    nMazo = v.nMazo
    nDescartes = v.descartes.length
    descarte = v.descartes.slice(-1)
  }

  async function anunciar(texto: string, ms: number) {
    aviso = texto
    await espera(ms)
    aviso = null
  }

  function elegir(id: string) {
    if (fin) return
    if (seleccionada === id) ampliada = { id, reverso: false }
    else seleccionada = id
  }

  function jugarEn(posicion: number) {
    if (ocupado || !miTurno || !seleccionada) return
    ocupado = true
    control.jugar(seleccionada, posicion)
    // Si el servidor no contesta (conexión caída), se devuelve el control al jugador.
    setTimeout(() => !atendiendo && (ocupado = false), 4000)
  }

  async function animar(s: Suceso) {
    const r = s.jugada!
    const id = r.carta
    const jugador = r.jugador
    const suya = visible === jugador
    ocupado = true
    seleccionada = null
    conectados = s.conectados ?? null

    // 1. La carta vuela a su hueco: desde la mano, o desde el nombre de quien la juega
    origen = chips[jugador] ?? null
    mano = mano.filter((x) => x !== id)
    crono.splice(Math.min(r.posicion, crono.length), 0, { id, volteada: false, marca: '' })
    cuentas[jugador]--
    await tick()
    cronoEl.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    await espera(620)

    // 2. Se voltea y enseña el año
    const pieza = crono.find((p) => p.id === id)!
    anotar(s.fechas)
    pieza.volteada = true
    await espera(800)

    if (r.acierto) {
      pieza.marca = veredicto = 'ok'
      await espera(800)
      pieza.marca = ''
    } else {
      pieza.marca = 'fallo'
      veredicto = r.recolocada === null ? 'fallo' : 'recoloca'
      if (suya) navigator.vibrate?.(120)
      await espera(1000)
      if (r.recolocada === null) {
        // 3a. Fallo: a los descartes
        crono = crono.filter((p) => p.id !== id)
        descarte = [id]
        nDescartes++
        await espera(520)
      } else {
        // 3b. Fallo con recolocación: la carta se desliza hasta su sitio
        pieza.marca = ''
        const resto = crono.filter((p) => p.id !== id)
        resto.splice(r.recolocada, 0, pieza)
        crono = resto
        await tick()
        cronoEl.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        await espera(900)
      }
      if (r.robada) {
        origen = mazoEl
        if (suya) mano.push(r.robada)
        cuentas[jugador]++
        nMazo = Math.max(0, nMazo - 1)
        await espera(520)
      }
    }
    veredicto = ''

    // 4. Se pone al día con el resultado y pasa el turno
    const v = s.vista
    vista = v
    contar(v)
    if (v.ganadores.length) {
      await espera(300)
      fin = v.ganadores
      verFin = true
      return
    }
    if (r.desempate.length) {
      const empatados = r.desempate.map((d) => v.jugadores[d.jugador].nombre).join(' y ')
      await anunciar(`${empatados} acaban a la vez: desempate`, 2200)
    }
    if (manoDe(v) !== visible) {
      origen = null
      mano = []
      await espera(230)
      visible = manoDe(v)
      mano = [...v.jugadores[visible].mano]
      await anunciar(`Turno de ${v.jugadores[visible].nombre}`, 1100)
    } else {
      origen = mazoEl
      const debe = v.jugadores[visible]?.mano ?? []
      mano = mano.filter((x) => debe.includes(x))
      for (const x of debe) if (!mano.includes(x)) mano.push(x)
      if (!local && asiento === v.turno && jugador !== asiento) await anunciar('Tu turno', 900)
    }
    ocupado = false
  }

  function nombres(g: number[]) {
    return g.map((i) => vista.jugadores[i].nombre).join(' y ')
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && ((ampliada = null), (seleccionada = null))} />

<div class="mesa" class:eligiendo={!!seleccionada && !ocupado && miTurno}>
  <header class="barra">
    <button class="salir" onclick={onsalir} aria-label="Salir al menú">‹</button>
    <span class="titulo"><Marca /></span>
    <div class="pilas">
      <figure>
        <div class="pila mazo" bind:this={mazoEl}><span>{nMazo}</span></div>
        <figcaption>mazo</figcaption>
      </figure>
      {#if vista.opciones.alFallar === 'descartar'}
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
      {/if}
    </div>
  </header>

  {#if !solo}
    <ul class="jugadores">
      {#each vista.jugadores as j, i (i)}
        <li
          bind:this={chips[i]}
          class:activo={i === vista.turno && !fin}
          class:eliminado={j.eliminado}
          class:ganador={fin?.includes(i)}
          class:ausente={conectados && !conectados[i]}
        >
          <span class="nombre">{j.nombre}{i === asiento ? ' (tú)' : ''}</span>
          <span class="cartas" aria-label="{cuentas[i]} cartas">{cuentas[i]}</span>
        </li>
      {/each}
    </ul>
  {/if}

  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="crono" bind:this={cronoEl} onclick={(e) => e.target === e.currentTarget && (seleccionada = null)}>
    <div class="tira">
      {#each crono as p, i (p.id)}
        <div class="pieza" animate:flip={{ duration: 600, easing: cubicOut }}>
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
      <p class="texto">{solo ? 'Cronología completada' : `Gana ${nombres(fin)}`}</p>
    {:else if veredicto}
      <p class="veredicto {veredicto}" in:scale={{ duration: 220, start: 0.7 }}>
        {veredicto === 'ok' ? '¡Correcto!' : veredicto === 'fallo' ? 'No encaja: va a los descartes' : 'No encaja: se recoloca en su sitio'}
      </p>
    {:else if seleccionada}
      {#key seleccionada}
        <p class="texto" in:fade={{ duration: 180 }}>{@html porId[seleccionada].texto}</p>
      {/key}
      <p class="pista">
        {#if miTurno}Toca un hueco <b>+</b> para colocarla{:else}Espera tu turno{/if}
        <button class="ampliar" onclick={() => (ampliada = { id: seleccionada!, reverso: false })}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" /></svg> Ampliar</button>
      </p>
    {:else if !ocupado && miTurno}
      <p class="pista grande">{solo ? 'Elige una carta' : local ? `${nombreTurno}, elige una carta` : 'Tu turno: elige una carta'}</p>
      <p class="pista">Toca cualquier carta para leerla y ampliarla</p>
    {:else if !ocupado}
      <p class="pista grande">Juega {nombreTurno}…</p>
      {#if anfitrion && conectados && !conectados[vista.turno]}
        <p class="pista">
          Se ha desconectado ·
          <button class="enlace" onclick={() => control.quitar?.(vista.turno)}>quitar de la partida</button>
        </p>
      {/if}
    {/if}
  </div>

  <div class="mano">
    {#if fin}
      <div class="final" in:fade>
        {#if onotra}<button class="boton" onclick={onotra}>Otra partida</button>{/if}
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
            {#if seleccionada === id}<span class="lupa"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" /></svg></span>{/if}
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
    <span class="cerrar">Toca para cerrar</span>
  </button>
{/if}

{#if fin && verFin}
  <div class="velo" transition:fade={{ duration: 250 }}>
    <div class="premio" in:scale={{ duration: 450, start: 0.8, easing: cubicOut }}>
      <p class="corona">{solo ? 'Cronología completada' : 'Fin de la partida'}</p>
      <h2>{solo ? '¡Hecho!' : `¡Gana ${nombres(fin)}!`}</h2>
      <table>
        <thead><tr><th></th><th>aciertos</th><th>fallos</th></tr></thead>
        <tbody>
          {#each vista.jugadores as j, i (i)}
            <tr class:ganador={fin.includes(i)}>
              <td>{j.nombre}</td><td>{j.aciertos}</td><td>{j.fallos}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="acciones">
        {#if onotra}
          <button class="boton" onclick={onotra}>Otra partida</button>
        {:else}
          <p class="corona">El anfitrión puede empezar otra partida.</p>
        {/if}
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
  .jugadores li.ausente { border-style: dashed; }
  .jugadores li.ausente .nombre::after {
    content: ' ⌁';
    color: #f0a3a3;
  }
  .jugadores li.eliminado {
    opacity: 0.45;
    text-decoration: line-through;
  }
  .cartas {
    font-weight: 700;
    min-width: 20px;
    height: 26px;
    padding: 0 4px;
    border-radius: 3px;
    background: rgb(0 0 0 / 0.3);
    color: var(--papel);
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
    font-size: 1.15rem;
    font-weight: 500;
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
  .veredicto.fallo,
  .veredicto.recoloca {
    color: #f0a3a3;
  }
  .ampliar {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: 8px;
    min-height: 36px;
    padding: 0 12px 0 9px;
    border: 1px solid rgb(235 233 217 / 0.5);
    border-radius: 999px;
    background: rgb(235 233 217 / 0.1);
    color: var(--papel);
    font-style: normal;
    font-weight: 500;
    cursor: pointer;
    vertical-align: middle;
  }
  svg {
    width: 1.15em;
    height: 1.15em;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .lupa {
    position: absolute;
    right: -6px;
    top: -8px;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--oro);
    color: var(--tinta);
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.5);
    pointer-events: none;
  }
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
    --ancho: min(90vw, 60dvh, 480px);
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 14px;
    border: 0;
    padding: 0;
    background: rgb(0 0 0 / 0.88);
    cursor: zoom-out;
  }

  .cerrar {
    color: var(--gris-claro);
    font-style: italic;
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
