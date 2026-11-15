<script lang="ts">
  // La escena del modo clásico: una mesa en miniatura (jugadores, mazo, descartes, cronología y
  // mano) con cartas de verdad. Tiene dos usos:
  //  · con guion: cada `paso` (ver PASOS_ESCENA) se juega solo, a golpes; un toque lo deja en su final.
  //  · jugable («Pruébalo tú»): una partida de práctica de tres cartas, con botones y teclado.
  // La usan el tutorial y el capítulo «El modo de la web» del reglamento.
  import { flip } from 'svelte/animate'
  import { cubicOut } from 'svelte/easing'
  import { crossfade, fade } from 'svelte/transition'
  import { barajar, cabe, vecinas } from '../../compartido/clasico'
  import { Toca } from './aparato'
  import Carta from './Carta.svelte'
  import { anioHablado, anioTexto, porId, textoPlano } from './datos'
  import Mazo from './Mazo.svelte'
  import Moneda from './Moneda.svelte'
  import { dura, reducido } from './movimiento'
  import { ANIOS_MUESTRA, ANIOS_REGLAS } from './muestras'
  import { efecto, vibrar } from './sonido'
  import { PASOS_ESCENA } from './textos'

  interface Props {
    /** Momento del guion (índice de PASOS_ESCENA). */
    paso?: number
    /** Partida de práctica en lugar del guion. */
    jugable?: boolean
  }
  let { paso = 0, jugable = false }: Props = $props()

  // ---- El guion ----------------------------------------------------------------------------
  // Cada paso es una sucesión de «golpes» (ms desde que empieza); `t` cuenta los que ya han sonado.
  const GOLPES: Record<(typeof PASOS_ESCENA)[number], number[]> = {
    mesa: [700, 1500],
    antes: [600, 1300],
    acierto: [500, 1200, 1950],
    fallo: [600, 1200, 1900, 2600, 3700],
    entre: [600, 1200, 1900, 2600, 3350],
    ronda: [600, 1200, 1900, 2900, 3800, 4700],
    desempate: [700, 1400, 2300, 3300],
  }
  const nombre = $derived(PASOS_ESCENA[Math.max(0, Math.min(paso, PASOS_ESCENA.length - 1))])
  let t = $state(0)

  $effect(() => {
    const golpes = GOLPES[nombre]
    if (reducido()) {
      t = golpes.length
      return
    }
    t = 0
    const relojes = golpes.map((ms, i) => setTimeout(() => (t = i + 1), ms))
    return () => relojes.forEach(clearTimeout)
  })

  /** Salta al final del paso: todo lo del guion se puede saltar con un toque. */
  export function saltar() {
    if (!jugable) t = GOLPES[nombre].length
  }

  interface Pieza {
    id: string
    volteada: boolean
    marca: '' | 'ok' | 'fallo'
  }
  interface Estado {
    crono: Pieza[]
    mano: string[]
    elegida: string | null
    /** Huecos a la vista (posiciones en la cronología) y el que se va a elegir. */
    huecos: number[]
    destino: number
    descarte: string | null
    mazo: number
    /** Jugador al que le toca (-1: nadie). */
    turno: number
    /** Cartas de Benito y de Carla (las tuyas son las de la mano). */
    otros: [number, number]
    fuera: boolean
    gana: boolean
    rotulos: boolean
  }
  const v = (id: string, marca: Pieza['marca'] = ''): Pieza => ({ id, volteada: true, marca })
  const oculta = (id: string): Pieza => ({ id, volteada: false, marca: '' })

  const guion = $derived.by((): Estado => {
    const e: Estado = {
      crono: [v('137')],
      mano: ['047', '262', '238'],
      elegida: null,
      huecos: [],
      destino: -1,
      descarte: null,
      mazo: 9,
      turno: 0,
      otros: [3, 3],
      fuera: false,
      gana: false,
      rotulos: false,
    }
    switch (nombre) {
      case 'mesa':
        e.crono = [{ id: '137', volteada: t >= 1, marca: '' }]
        e.rotulos = t >= 2
        break
      case 'antes':
        e.elegida = t >= 1 ? '047' : null
        if (t >= 2) [e.huecos, e.destino] = [[0, 1], 1]
        break
      case 'acierto':
        if (t < 1) [e.elegida, e.huecos, e.destino] = ['047', [0, 1], 1]
        else {
          e.crono = [v('137'), t >= 2 ? v('047', t >= 3 ? 'ok' : '') : oculta('047')]
          e.mano = ['262', '238']
        }
        break
      case 'fallo':
        e.crono = [v('137'), v('047')]
        e.mano = ['262', '238']
        e.elegida = t >= 1 && t < 3 ? '262' : null
        if (t === 2) [e.huecos, e.destino] = [[0, 1, 2], 0]
        if (t >= 3 && t < 5) {
          e.crono = [t >= 4 ? v('262', 'fallo') : oculta('262'), v('137'), v('047')]
          e.mano = ['238']
        }
        if (t >= 5) [e.descarte, e.mano, e.mazo] = ['262', ['238', '267'], 8]
        break
      case 'entre':
        e.crono = [v('137'), v('047')]
        e.mano = ['238', '267']
        e.descarte = '262'
        e.mazo = 8
        e.elegida = t >= 1 && t < 3 ? '238' : null
        if (t === 2) [e.huecos, e.destino] = [[0, 1, 2], 1]
        if (t >= 3) {
          e.crono = [v('137'), t >= 4 ? v('238', t >= 5 ? 'ok' : '') : oculta('238'), v('047')]
          e.mano = ['267']
        }
        break
      case 'ronda':
        e.crono = [v('137'), v('238'), v('047')]
        e.mano = ['267']
        e.descarte = '262'
        e.mazo = 8
        e.otros = [2, 3]
        e.elegida = t === 1 ? '267' : null
        if (t >= 2) {
          e.crono = [...e.crono, t >= 3 ? v('267', t === 3 ? 'ok' : '') : oculta('267')]
          e.mano = []
        }
        e.turno = t >= 6 ? -1 : t >= 5 ? 2 : t >= 4 ? 1 : 0
        e.gana = t >= 6
        break
      case 'desempate':
        e.crono = [v('137'), v('238'), v('047'), v('267')]
        e.mano = []
        e.descarte = '262'
        e.mazo = 8
        e.otros = [1, 3]
        e.turno = 1
        if (t >= 1) {
          e.crono = [v('137'), v('238'), v('047'), t >= 2 ? v('150', t === 2 ? 'ok' : '') : oculta('150'), v('267')]
          e.otros = [0, 3]
        }
        if (t >= 3) e.turno = 2
        if (t >= 4) [e.turno, e.fuera, e.mano, e.otros, e.mazo] = [-1, true, ['024'], [1, 3], 6]
        break
    }
    return e
  })

  // ---- La partida de práctica ----------------------------------------------------------------
  const BARAJA = ['001', '024', '036', '047', '060', '113', '120', '139', '150', '238', '262', '267']
  let pCrono = $state<Pieza[]>([])
  let pMano = $state<string[]>([])
  let pMazo = $state<string[]>([])
  let pDescarte = $state<string | null>(null)
  let pElegida = $state<string | null>(null)
  let ocupado = $state(false)
  let mensaje = $state('')
  let repartida = false

  /** Reparte la práctica. Solo suena al pedir «Otra vez»: la primera vez llega con el desplazamiento, sin un toque. */
  function repartir(conSonido = false) {
    if (conSonido) efecto('barajar')
    const b = barajar(BARAJA)
    pCrono = [v('137')]
    pMano = b.slice(0, 3)
    pMazo = b.slice(3)
    pDescarte = null
    pElegida = null
    mensaje = `${Toca()} una de tus cartas y después el hueco donde crees que va.`
  }
  $effect(() => {
    if (jugable && !repartida) {
      repartida = true
      repartir()
    }
  })

  const espera = (ms: number) => new Promise((r) => setTimeout(r, dura(ms)))
  const anio = (id: string) => anioTexto(ANIOS_MUESTRA[id])
  const dicho = (id: string) => anioHablado(ANIOS_MUESTRA[id])

  async function colocar(pos: number) {
    const id = pElegida
    if (!id || ocupado) return
    ocupado = true
    pElegida = null
    const antes = pCrono.map((p) => p.id)
    const bien = cabe(antes, ANIOS_REGLAS, id, pos)
    pMano = pMano.filter((x) => x !== id)
    pCrono = [...pCrono.slice(0, pos), oculta(id), ...pCrono.slice(pos)]
    efecto('deslizar')
    await espera(450)
    pCrono = pCrono.map((p) => (p.id === id ? v(id, bien ? 'ok' : '') : p))
    efecto('voltear')
    await espera(250)
    if (bien) {
      efecto('asentar')
      vibrar('acierto')
    } else vibrar('fallo')
    await espera(550)
    if (bien) {
      mensaje = `¡Bien! ${textoPlano(porId[id])}: ${dicho(id)}.`
    } else {
      const [a, d] = vecinas(antes, ANIOS_REGLAS, id)
      const iba = a && d ? `iba entre ${dicho(a)} y ${dicho(d)}` : a ? `iba después de ${dicho(a)}` : `iba antes de ${dicho(d!)}`
      pCrono = pCrono.map((p) => (p.id === id ? v(id, 'fallo') : p))
      mensaje = `No encaja: es de ${dicho(id)}, ${iba}. Va a los descartes y robas otra.`
      await espera(1300)
      pCrono = pCrono.filter((p) => p.id !== id)
      pDescarte = id
      efecto('apartar')
      if (pMazo.length) {
        await espera(350)
        efecto('robar')
        pMano = [...pMano, pMazo[0]]
        pMazo = pMazo.slice(1)
      }
    }
    if (!pMano.length) mensaje = '¡Has colocado todas tus cartas! En una partida, si nadie más termina en esa ronda, ganarías.'
    ocupado = false
  }

  function huecoEtiqueta(pos: number, crono: Pieza[]) {
    const a = crono[pos - 1]?.id
    const d = crono[pos]?.id
    if (a && d) return `Colocar entre ${dicho(a)} y ${dicho(d)}`
    if (d) return `Colocar antes de ${dicho(d)}`
    return `Colocar después de ${dicho(a!)}`
  }
  const nombreHueco = (pos: number, n: number) => (pos === 0 ? 'antes' : pos === n ? 'después' : 'entre')

  // ---- Lo que se pinta -----------------------------------------------------------------------
  const crono = $derived(jugable ? pCrono : guion.crono)
  const mano = $derived(jugable ? pMano : guion.mano)
  const elegida = $derived(jugable ? pElegida : guion.elegida)
  const huecos = $derived(jugable ? (pElegida && !ocupado ? crono.map((_, i) => i).concat(crono.length) : []) : guion.huecos)
  const descarte = $derived(jugable ? pDescarte : guion.descarte)
  const nMazo = $derived(jugable ? pMazo.length : guion.mazo)

  const JUGADORES = [
    { nombre: 'Tú', avatar: 'escritor' },
    { nombre: 'Benito', avatar: 'astronomo' },
    { nombre: 'Carla', avatar: 'sufragista' },
  ]
  const cuentas = $derived([mano.length, ...guion.otros])

  /** La cronología con sus huecos intercalados, en una sola fila para que todo se desplace junto. */
  const fila = $derived.by(() => {
    const f: { clave: string; pieza?: Pieza; pos: number }[] = []
    crono.forEach((p, i) => {
      if (huecos.includes(i)) f.push({ clave: `h${i}`, pos: i })
      f.push({ clave: p.id, pieza: p, pos: i })
    })
    if (huecos.includes(crono.length)) f.push({ clave: `h${crono.length}`, pos: crono.length })
    return f
  })

  const [enviar, recibir] = crossfade({
    duration: () => dura(480),
    easing: cubicOut,
    fallback: () => ({ duration: dura(280), css: (u: number) => `opacity: ${u}; transform: translateY(${(1 - u) * 24}px)` }),
  })
  // Las cartas vuelan entre la mano, la cronología y los descartes; los huecos solo se funden.
  const entra = (nodo: Element, x: { clave: string; pieza?: Pieza }) =>
    x.pieza ? recibir(nodo, { key: x.clave }) : fade(nodo, { duration: dura(180) })
  const sale = (nodo: Element, x: { clave: string; pieza?: Pieza }) =>
    x.pieza ? enviar(nodo, { key: x.clave }) : fade(nodo, { duration: dura(120) })
</script>

<!-- Con guion, la escena es decorativa (el texto lo cuenta todo) y un toque la deja en su final. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="escena"
  class:jugable
  aria-hidden={jugable ? undefined : 'true'}
  role={jugable ? 'group' : undefined}
  aria-label={jugable ? 'Partida de práctica' : undefined}
  onclick={saltar}
>
  <div class="arriba">
    <ol class="jugadores">
      {#each jugable ? JUGADORES.slice(0, 1) : JUGADORES as j, i (j.nombre)}
        <li class:activo={!jugable && guion.turno === i} class:fuera={!jugable && guion.fuera && i === 2}>
          <span class="aro"><Moneda avatar={j.avatar} gesto={!jugable && guion.gana && i === 0 ? 'gana' : 'normal'} n={cuentas[i]} /></span>
          <span class="nombre">{j.nombre}</span>
          {#if !jugable && guion.fuera && i === 2}<span class="marbete" in:fade={{ duration: dura(200) }}>fuera</span>{/if}
          {#if !jugable && guion.gana && i === 0}<span class="marbete sello" in:fade={{ duration: dura(200) }}>gana</span>{/if}
        </li>
      {/each}
    </ol>
    {#if guion.rotulos && !jugable}<span class="rotulo r-jugadores">Jugadores</span>{/if}
    {#if guion.rotulos && !jugable}<span class="rotulo r-mazo">Mazo y descartes</span>{/if}
    <div class="montones">
      <Mazo n={nMazo} />
      <div class="descartes">
        {#if descarte}
          {#key descarte}
            <div class="naipe" in:recibir={{ key: descarte }} out:enviar={{ key: descarte }}>
              <Carta carta={porId[descarte]} fecha={ANIOS_MUESTRA[descarte]} volteada />
            </div>
          {/key}
        {/if}
      </div>
    </div>
  </div>

  <div class="crono" style="--n: {Math.max(crono.length, 1)}; --nh: {huecos.length}">
    {#if guion.rotulos && !jugable}<span class="rotulo r-crono">Cronología</span>{/if}
    {#each fila as x (x.clave)}
      <div class="sitio" animate:flip={{ duration: dura(420), easing: cubicOut }} in:entra={x} out:sale={x}>
        {#if x.pieza}
          <div class="naipe {x.pieza.marca}">
            <Carta carta={porId[x.pieza.id]} fecha={ANIOS_MUESTRA[x.pieza.id]} volteada={x.pieza.volteada} />
          </div>
        {:else}
          {@render hueco(x.pos)}
        {/if}
      </div>
    {/each}
    {#if jugable}
      <p class="estado" role="status">{mensaje}</p>
    {/if}
  </div>

  <div class="mano" style="--n: {Math.max(mano.length, 3)}">
    {#if guion.rotulos && !jugable}<span class="rotulo r-mano">Tus cartas</span>{/if}
    {#each mano as id (id)}
      <div class="naipe" class:elegida={elegida === id} animate:flip={{ duration: dura(340), easing: cubicOut }} in:recibir={{ key: id }} out:enviar={{ key: id }}>
        {#if jugable}
          <button
            class="carta-boton"
            disabled={ocupado}
            aria-label="{textoPlano(porId[id])}{pElegida === id ? ', elegida' : ''}"
            onclick={() => (pElegida = pElegida === id ? null : id)}
          >
            <Carta carta={porId[id]} />
          </button>
        {:else}
          <Carta carta={porId[id]} />
        {/if}
      </div>
    {/each}
    {#if jugable && !pMano.length && !ocupado}
      <button class="boton pequeno otra" in:fade={{ duration: dura(200) }} onclick={() => repartir(true)}>Otra vez</button>
    {/if}
  </div>
</div>

{#snippet hueco(pos: number)}
  {#if jugable}
    <button class="hueco" class:destino={false} aria-label={huecoEtiqueta(pos, crono)} onclick={(e) => (e.stopPropagation(), colocar(pos))}>
      <span aria-hidden="true">{nombreHueco(pos, crono.length)}</span>
    </button>
  {:else}
    <span class="hueco" class:destino={pos === guion.destino}>
      {nombreHueco(pos, crono.length)}
    </span>
  {/if}
{/snippet}

<style>
  .escena {
    --foco: var(--papel);
    position: relative;
    height: 100%;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 2cqh;
    padding: 1.5cqh 12px 2cqh;
    container-type: size;
    color: var(--papel);
    -webkit-user-select: none;
    user-select: none;
  }

  /* ---- Arriba: jugadores, mazo y descartes, como en la mesa ---- */
  .arriba {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .jugadores {
    display: flex;
    gap: min(14px, 3cqw);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .jugadores li {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 7px;
    --lado: min(44px, 8.5cqh);
    transition: opacity 0.3s;
  }
  .aro {
    display: block;
    border-radius: 50%;
    outline: 2.5px solid transparent;
    outline-offset: 2px;
    transition: outline-color 0.25s;
  }
  .activo .aro { outline-color: var(--papel); }
  .fuera { opacity: 0.45; }
  .nombre {
    font-size: min(0.85rem, 2.6cqh);
    line-height: 1;
    color: rgb(235 233 217 / 0.85);
  }
  .activo .nombre { color: var(--papel); font-weight: 700; }
  .marbete {
    position: absolute;
    top: calc(var(--lado) + 7px + min(0.85rem, 2.6cqh) + 3px);
    left: 50%;
    translate: -50% 0;
    padding: 0 5px;
    border-radius: 3px;
    background: var(--papel);
    color: var(--tinta);
    font-size: 0.72rem;
    font-style: italic;
    line-height: 1.4;
    rotate: 6deg;
  }
  .marbete.sello {
    background: transparent;
    color: var(--papel);
    border: 1.5px solid var(--papel);
    font-family: var(--fell-sc);
    font-style: normal;
    font-size: 0.8rem;
    rotate: -8deg;
  }

  .montones {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .descartes {
    --ancho: 40px;
    width: 40px;
    aspect-ratio: 554 / 766;
    border: 1.5px dashed rgb(235 233 217 / 0.3);
    border-radius: 4px;
  }
  .descartes .naipe { margin: -1.5px; }

  /* ---- La cronología ---- */
  .crono {
    --ancho: min(150px, 26cqh, calc((100cqw - 24px - var(--nh) * 46px) / var(--n) - 8px));
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 0;
    /* la línea del tiempo, como en la mesa */
    background: linear-gradient(rgb(0 0 0 / 0.35), rgb(0 0 0 / 0.35)) center calc(50% - 1px) / 100% 1px no-repeat,
      linear-gradient(rgb(235 233 217 / 0.16), rgb(235 233 217 / 0.16)) center calc(50% + 1px) / 100% 1px no-repeat;
  }
  .sitio { flex: none; }
  .naipe {
    flex: none;
    transition:
      transform 0.3s var(--curva-posar, cubic-bezier(0.2, 0.7, 0.2, 1)),
      filter 0.3s;
  }
  /* Acierto: la carta se asienta con un golpe seco. Fallo: se levanta y se ladea, sin halos. */
  .naipe.ok { animation: asentar 0.32s var(--curva-posar, cubic-bezier(0.2, 0.7, 0.2, 1)); }
  .naipe.fallo { transform: translateY(-6px) rotate(-4deg); }
  @keyframes asentar {
    from { transform: translateY(-7px) scale(1.035); }
  }

  .hueco {
    flex: none;
    width: 38px;
    height: calc(var(--ancho) * 1.15);
    display: grid;
    place-items: center;
    padding: 0;
    border: 2px dashed rgb(235 233 217 / 0.55);
    border-radius: 6px;
    background: transparent;
    color: var(--papel);
    font: italic 0.8rem var(--ui);
    writing-mode: vertical-rl;
    rotate: 180deg;
  }
  .hueco.destino {
    border-style: solid;
    border-color: var(--papel);
    background: rgb(235 233 217 / 0.2);
    animation: latir 0.7s ease-in-out 2;
  }
  button.hueco { cursor: pointer; }
  button.hueco:hover,
  button.hueco:focus-visible { background: rgb(235 233 217 / 0.2); border-color: var(--papel); }
  @keyframes latir {
    50% { background: rgb(235 233 217 / 0.32); }
  }

  .estado {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    padding: 0 8px;
    text-align: center;
    font-size: min(0.95rem, 3.4cqh);
    line-height: 1.2;
    text-wrap: balance;
    color: var(--papel);
  }

  /* ---- La mano ---- */
  .mano {
    --ancho: min(108px, 17cqh, calc((100cqw - 40px) / var(--n) - 8px));
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 8px;
    min-height: calc(var(--ancho) * 1.383 + 3cqh);
  }
  .mano .elegida {
    transform: translateY(-14%);
    filter: drop-shadow(0 14px 10px rgb(0 0 0 / 0.5));
  }
  .carta-boton {
    display: block;
    padding: 0;
    border: 0;
    background: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .carta-boton:disabled { cursor: default; }
  .otra {
    align-self: center;
    margin-bottom: 4cqh;
  }

  /* ---- Rótulos de «Tu mesa»: se dibujan con un trazo ---- */
  .rotulo {
    position: absolute;
    z-index: 2;
    padding-bottom: 2px;
    font: italic min(0.95rem, 3.2cqh) var(--fell);
    color: var(--papel);
    white-space: nowrap;
    pointer-events: none;
    animation: aparecer 0.3s var(--curva-deslizar, cubic-bezier(0.3, 0.6, 0.2, 1)) both;
  }
  .rotulo::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: var(--papel);
    transform-origin: left;
    animation: trazar 0.45s var(--curva-deslizar, cubic-bezier(0.3, 0.6, 0.2, 1)) 0.15s both;
  }
  .r-jugadores { left: 0; top: calc(100% + 6px); }
  .r-mazo { right: 0; top: calc(100% + 6px); }
  .r-crono { left: 4px; bottom: calc(50% + 6px); animation-delay: 0.15s; }
  .r-mano { left: 4px; top: 0; animation-delay: 0.3s; }
  .r-crono::after { animation-delay: 0.3s; }
  .r-mano::after { animation-delay: 0.45s; }
  @keyframes aparecer {
    from { opacity: 0; }
  }
  @keyframes trazar {
    from { transform: scaleX(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .naipe,
    .aro,
    .jugadores li { transition: none; }
    .naipe.ok,
    .hueco.destino,
    .rotulo,
    .rotulo::after { animation: none; }
  }
</style>
