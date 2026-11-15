<script lang="ts">
  // El reglamento, como un librillo: capítulos con portadilla (una carta real que se posa), primero
  // lo que se juega en la web y al final la historia y los créditos. El modo clásico se cuenta sobre
  // la escena del tutorial, que cambia al leer y acaba en una partida de práctica.
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import BotonIcono from './BotonIcono.svelte'
  import Carta from './Carta.svelte'
  import CartaAnatomia from './CartaAnatomia.svelte'
  import CintaEras from './CintaEras.svelte'
  import EscenaClasico from './EscenaClasico.svelte'
  import Marca from './Marca.svelte'
  import Miniatura from './Miniatura.svelte'
  import Portadilla from './Portadilla.svelte'
  import Tutorial, { narrarTutorial } from './Tutorial.svelte'
  import { alVer } from './alVer'
  import { Toca } from './aparato'
  import { abrirCapa, type Capa } from './capas'
  import { anioTexto, porId, textoPlano } from './datos'
  import { dialogo } from './dialogo'
  import { desplazamiento, dura } from './movimiento'
  import { ANIOS_MUESTRA } from './muestras'
  import {
    ACLARACIONES,
    ANATOMIA_INTRO,
    CAPITULOS,
    COLORES,
    creditos,
    ESPECIFICACIONES,
    MODO_WEB,
    OTROS_MODOS,
    OTROS_MODOS_INTRO,
    PASOS_ESCENA,
    resumen,
    SOBRE_EL_JUEGO,
  } from './textos'
  import { AMBITOS, type Ambito } from '../../compartido/tipos'

  let { oncerrar }: { oncerrar: () => void } = $props()

  let tutorial = $state(false)
  // El tutorial abierto desde aquí tiene su propio paso en el historial: «atrás» lo cierra y deja el reglamento.
  let capaT: Capa | null = null
  function abrirTutorial() {
    tutorial = true
    capaT = abrirCapa(() => (tutorial = false))
  }
  let texto: HTMLElement | undefined = $state()
  let guion: HTMLElement | undefined = $state()
  /** Capítulo que se está leyendo. */
  let actual = $state(0)
  /** Trozo del modo de la web que se está leyendo; el último es «Pruébalo tú». */
  let bloque = $state(0)

  const pasoEscena = $derived(Math.max(0, PASOS_ESCENA.indexOf(MODO_WEB[Math.min(bloque, MODO_WEB.length - 1)].paso)))
  const jugando = $derived(bloque === MODO_WEB.length)
  const giro = (i: number) => (i % 2 ? 2 : -2)

  // Qué capítulo y qué trozo se leen: los que han pasado de una línea a un tercio de la pantalla
  // (en el modo de la web, de una línea algo por debajo de la escena fija).
  let pedido = 0
  function alDesplazar() {
    if (pedido) return
    pedido = requestAnimationFrame(() => {
      pedido = 0
      if (!texto) return
      const caja = texto.getBoundingClientRect()
      const linea = caja.top + caja.height * 0.3
      let i = 0
      texto.querySelectorAll<HTMLElement>('section.capitulo').forEach((s, k) => {
        if (s.getBoundingClientRect().top <= linea) i = k
      })
      if (texto.scrollTop + texto.clientHeight >= texto.scrollHeight - 4) i = CAPITULOS.length - 1
      actual = i
      if (guion) {
        const escena = guion.querySelector('.escena-fija')!.getBoundingClientRect()
        const lineaB = escena.bottom + (caja.bottom - escena.bottom) * 0.4
        let b = 0
        guion.querySelectorAll<HTMLElement>('.bloque').forEach((el, k) => {
          if (el.getBoundingClientRect().top <= lineaB) b = k
        })
        bloque = b
      }
    })
  }

  // Se desplaza solo la columna del texto (scrollIntoView movería también la hoja entera).
  function ir(i: number) {
    const titulo = document.getElementById(`cap-${CAPITULOS[i].id}`)
    const seccion = titulo?.closest('section')
    if (!texto || !titulo || !seccion) return
    const top = texto.scrollTop + seccion.getBoundingClientRect().top - texto.getBoundingClientRect().top
    texto.scrollTo({ top, behavior: desplazamiento() })
    titulo.focus({ preventScroll: true })
  }

  /** La carta de la columna fija se posa cada vez que cambia el capítulo. */
  function posar(_: Element, { giro }: { giro: number }) {
    return {
      duration: dura(480),
      easing: cubicOut,
      css: (t: number, u: number) => `opacity: ${Math.min(1, t * 2)}; transform: translateY(${-24 * u}px) rotate(${giro + 5 * u}deg) scale(${1 + 0.04 * u})`,
    }
  }

  const AMBITOS_MUESTRA: [Ambito, string, string][] = [
    ['comunicacion', '047', 'beige'],
    ['social', '137', 'negro'],
    ['cientifico', '262', 'verde claro'],
    ['mujer', '293', 'morado'],
    ['coria', '190', 'azul oscuro'],
  ]
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && !tutorial && oncerrar()} />

<div class="velo" transition:fade={{ duration: dura(200) }} onclick={oncerrar} role="presentation"></div>
<div class="hoja" role="dialog" aria-modal="true" aria-labelledby="reglas-titulo" use:dialogo transition:fly={{ y: 60, duration: dura(300) }}>
  <header class="librillo">
    <div class="titulos">
      <span class="de"><Marca /></span>
      <h2 id="reglas-titulo">Reglamento</h2>
    </div>
    <BotonIcono icono="cerrar" etiqueta="Cerrar" sobrePapel onclick={oncerrar} />
  </header>

  <div class="cuerpo">
    <!-- Escritorio: la portadilla del capítulo que se lee, fija, y el índice debajo. -->
    <aside class="lateral">
      <div class="portada" aria-hidden="true">
        {#key actual}
          <div class="naipe" style="--g: {giro(actual)}deg" in:posar={{ giro: giro(actual) }}>
            <Carta carta={porId[CAPITULOS[actual].carta]} fecha={ANIOS_MUESTRA[CAPITULOS[actual].carta]} volteada />
          </div>
        {/key}
        <p class="pie">
          <span>{anioTexto(ANIOS_MUESTRA[CAPITULOS[actual].carta])}</span>
          {textoPlano(porId[CAPITULOS[actual].carta])}
        </p>
      </div>
      <nav aria-label="Capítulos">
        <ol>
          {#each CAPITULOS as c, i (c.id)}
            <li>
              <button aria-current={actual === i ? 'true' : undefined} onclick={() => ir(i)}>
                <span class="num">{i + 1}</span>{c.corto}
              </button>
            </li>
          {/each}
        </ol>
      </nav>
    </aside>

    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="texto" tabindex="0" role="region" aria-label="Texto del reglamento" bind:this={texto} onscroll={alDesplazar}>
      <!-- Móvil: el índice es una tira de portadillas en miniatura. -->
      <nav class="indice" aria-label="Capítulos">
        <ol>
          {#each CAPITULOS as c, i (c.id)}
            <li>
              <button onclick={() => ir(i)}>
                <span class="mini" style="--giro: {giro(i) / 2}deg"><Miniatura id={c.carta} fecha={ANIOS_MUESTRA[c.carta]} /></span>
                <span class="num" aria-hidden="true">{i + 1}</span>
                <span class="corto">{c.corto}</span>
              </button>
            </li>
          {/each}
        </ol>
      </nav>

      <!-- 1. En un minuto -->
      <section class="capitulo" aria-labelledby="cap-{CAPITULOS[0].id}">
        <Portadilla capitulo={CAPITULOS[0]} numero={1} giro={giro(0)} />
        <div class="resumen">{@html resumen}</div>
        <button class="boton tinta" onclick={abrirTutorial}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
          Ver el tutorial animado
        </button>
      </section>

      <!-- 2. El modo de la web, contado sobre la escena del tutorial -->
      <section class="capitulo" aria-labelledby="cap-{CAPITULOS[1].id}">
        <Portadilla capitulo={CAPITULOS[1]} numero={2} giro={giro(1)} />
        <p class="entradilla">Es el <b>modo competitivo tradicional</b> del juego de mesa. La escena de arriba lo va jugando mientras lees.</p>
        <div class="guion" bind:this={guion}>
          <div class="escena-fija">
            <EscenaClasico paso={pasoEscena} jugable={jugando} />
          </div>
          {#each MODO_WEB as b, i (i)}
            <div class="bloque" class:activo={!jugando && bloque === i}>
              {#if b.titulo}<h4>{b.titulo}</h4>{/if}
              {@html b.html}
            </div>
          {/each}
          <div class="bloque prueba" class:activo={jugando}>
            <h4>Pruébalo tú</h4>
            <p>Arriba tienes tres cartas y una cronología que empieza en 1492. {Toca()} una de tus cartas y después el hueco donde crees que va. Si fallas, va a los descartes y robas otra.</p>
            <p class="nota-baja">Es solo una práctica: no cuenta para nada.</p>
          </div>
        </div>
      </section>

      <!-- 3. Aclaraciones y opciones de la web -->
      <section class="capitulo" aria-labelledby="cap-{CAPITULOS[2].id}">
        <Portadilla capitulo={CAPITULOS[2]} numero={3} giro={giro(2)} />
        <p class="entradilla">Lo que la versión digital hace a su manera, y lo que se puede elegir antes de repartir.</p>
        <dl class="aclaraciones">
          {#each ACLARACIONES as a (a.titulo)}
            <div>
              <dt>{a.titulo}</dt>
              <dd>{@html a.html}</dd>
            </div>
          {/each}
        </dl>
      </section>

      <!-- 4. Anatomía de una carta -->
      <section class="capitulo" aria-labelledby="cap-{CAPITULOS[3].id}">
        <Portadilla capitulo={CAPITULOS[3]} numero={4} giro={giro(3)} />
        {@html ANATOMIA_INTRO}
        <CartaAnatomia />
        <h4>Los dos códigos de color</h4>
        {@html COLORES}
        <ul class="ambitos" aria-label="Los cinco ámbitos">
          {#each AMBITOS_MUESTRA as [a, id, color] (a)}
            <li>
              <span class="mini" aria-hidden="true"><Miniatura {id} /></span>
              <b>{AMBITOS[a]}</b>
              <span>{color}</span>
            </li>
          {/each}
        </ul>
        <CintaEras />
      </section>

      <!-- 5. Otros modos del juego de mesa -->
      <section class="capitulo" aria-labelledby="cap-{CAPITULOS[4].id}">
        <Portadilla capitulo={CAPITULOS[4]} numero={5} giro={giro(4)} />
        {@html OTROS_MODOS_INTRO}
        {#each OTROS_MODOS as m (m.titulo)}
          <article class="modo" use:alVer={0.6}>
            <h4>{m.titulo}</h4>
            <span class="sello">Aún no está en la web</span>
            <p><b>Objetivo:</b> {m.objetivo}</p>
            <details>
              <summary>Reglamento completo</summary>
              {@html m.html}
              <div class="nota">
                <h5>Cuando llegue a la web</h5>
                {@html m.web}
              </div>
            </details>
          </article>
        {/each}
      </section>

      <!-- 6. Sobre el juego -->
      <section class="capitulo" aria-labelledby="cap-{CAPITULOS[5].id}">
        <Portadilla capitulo={CAPITULOS[5]} numero={6} giro={giro(5)} />
        {@html SOBRE_EL_JUEGO}
        <h4>Especificaciones</h4>
        <ul class="fichas">
          {#each ESPECIFICACIONES as f (f.etiqueta)}
            <li>
              <span class="etiqueta">{f.etiqueta}</span>
              <span class="valor">{f.valor}</span>
              {#if f.nota}<span class="detalle">{f.nota}</span>{/if}
            </li>
          {/each}
        </ul>
      </section>

      <!-- 7. Créditos -->
      <section class="capitulo" aria-labelledby="cap-{CAPITULOS[6].id}">
        <Portadilla capitulo={CAPITULOS[6]} numero={7} giro={giro(6)} />
        <div class="creditos">{@html creditos}</div>
      </section>
    </div>
  </div>
</div>

<!-- El borde gastado del sello de tampón. -->
<svg class="filtros" aria-hidden="true">
  <filter id="tampon">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
    <feDisplacementMap in="SourceGraphic" scale="2.2" />
  </filter>
</svg>

{#if tutorial}
  <Tutorial oncerrar={() => capaT?.cerrar()} onnarrar={narrarTutorial} />
{/if}

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgb(0 0 0 / 0.45);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }
  .hoja {
    --foco: var(--tinta);
    position: fixed;
    z-index: 41;
    inset: 4dvh 0 0;
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--papel-2);
    background-image: var(--grano-papel, none);
    color: var(--tinta);
    border-radius: 14px 14px 0 0;
    box-shadow: 0 -10px 40px rgb(0 0 0 / 0.5);
  }

  /* ---- Cabecera de librillo ---- */
  .librillo {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 10px 10px 20px;
    border-bottom: 1px solid var(--tinta);
    box-shadow: 0 3px 0 -2px var(--papel-2), 0 4px 0 -2px rgb(29 29 27 / 0.5);
  }
  .titulos {
    display: grid;
    line-height: 1;
  }
  .de {
    font-size: 0.95rem;
  }
  .de :global(.marca) { color: var(--tinta); }
  .de :global(.marca .a) { color: var(--gris-claro); }
  h2 {
    margin: 2px 0 0;
    font-size: 1.6rem;
  }

  .cuerpo {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .lateral { display: none; }

  .texto {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 20px calc(40px + env(safe-area-inset-bottom));
    font-size: 1.05rem;
    line-height: 1.5;
  }
  .texto:focus-visible { outline-offset: -3px; }
  .texto :global(p) { margin: 0 0 0.75em; }
  .texto :global(h4) {
    margin: 1.3em 0 0.35em;
    font: normal 1.3rem/1.2 var(--fell-sc);
  }
  .texto :global(h5) {
    margin: 0 0 0.3em;
    font: normal 1.1rem var(--fell-sc);
  }
  .capitulo {
    padding-bottom: 1.6em;
  }
  .entradilla {
    font-size: 1.1rem;
    color: #3d3c37;
  }

  /* ---- Índice en tira (móvil) ---- */
  .indice {
    margin: 0 -20px;
    padding: 14px 0 10px;
    border-bottom: 1px solid var(--gris-claro);
  }
  .indice ol {
    display: flex;
    gap: 4px;
    margin: 0;
    padding: 4px 20px 6px;
    list-style: none;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-padding: 0 20px;
    scrollbar-width: none;
  }
  .indice ol::-webkit-scrollbar { display: none; }
  .indice li { scroll-snap-align: start; }
  .indice button {
    display: grid;
    justify-items: center;
    gap: 3px;
    width: 76px;
    padding: 6px 2px 4px;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--tinta);
    cursor: pointer;
  }
  .indice button:hover { background: rgb(29 29 27 / 0.06); }
  .indice .mini {
    --ancho: 46px;
    display: block;
    rotate: var(--giro);
    margin-bottom: 2px;
  }
  .indice .num {
    font: 0.95rem/1 var(--fell-sc);
    color: var(--gris);
  }
  .indice .corto {
    font-size: 0.85rem;
    line-height: 1.1;
    text-align: center;
    text-wrap: balance;
  }

  /* ---- En un minuto ---- */
  .resumen :global(ol) {
    margin: 0 0 1em;
    padding-left: 1.5em;
  }
  .resumen :global(li) {
    margin-bottom: 0.45em;
    padding-left: 0.2em;
  }
  .resumen :global(li::marker) {
    font-family: var(--fell-sc);
    font-size: 1.15em;
  }
  .boton.tinta {
    width: 100%;
    background: var(--tinta);
    color: var(--papel);
    box-shadow: 0 2px 0 #000;
  }
  .boton.tinta svg {
    width: 1.1em;
    height: 1.1em;
    fill: currentColor;
  }

  /* ---- El modo de la web: la escena fija arriba y el texto que pasa por debajo ---- */
  .escena-fija {
    position: sticky;
    top: 0;
    z-index: 3;
    height: min(50dvh, 430px);
    margin: 0 -20px 0.6em;
    background: var(--fondo-mesa, radial-gradient(120% 90% at 50% 0%, var(--tapete) 0%, var(--tapete-2) 75%));
    background-color: var(--tapete-2);
    box-shadow: 0 10px 14px -10px rgb(0 0 0 / 0.55);
  }
  .bloque {
    padding: 0.2em 0 0.2em 14px;
    border-left: 3px solid transparent;
    transition: border-color 0.25s;
  }
  .bloque.activo { border-left-color: var(--tinta); }
  .bloque :global(h4) { margin-top: 0.9em; }
  .prueba { min-height: 44dvh; }
  .nota-baja {
    font-size: 0.95rem;
    color: #55544c;
  }

  /* ---- Aclaraciones ---- */
  .aclaraciones {
    margin: 0;
  }
  .aclaraciones div {
    padding: 0.55em 0;
    border-top: 1px solid rgb(29 29 27 / 0.15);
  }
  .aclaraciones div:last-child { border-bottom: 1px solid rgb(29 29 27 / 0.15); }
  dt {
    font: 1.15rem/1.2 var(--fell-sc);
  }
  dd {
    margin: 0.1em 0 0;
  }

  /* ---- Anatomía: las minicartas de los ámbitos ---- */
  .ambitos {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin: 0.9em 0 0.4em;
    padding: 0;
    list-style: none;
  }
  .ambitos li {
    display: grid;
    align-content: start;
    justify-items: center;
    text-align: center;
    font-size: 0.85rem;
    line-height: 1.15;
  }
  .ambitos b {
    margin-top: 6px;
    font-weight: 700;
    text-wrap: balance;
  }
  .ambitos span:not(.mini) { color: #55544c; font-style: italic; }
  .ambitos .mini { --ancho: min(64px, 14vw); display: block; }

  /* ---- Otros modos, con su sello de tampón ---- */
  .modo {
    position: relative;
    margin: 1.2em 0;
    padding: 0.2em 16px 0.6em;
    border: 1px solid rgb(29 29 27 / 0.2);
    border-radius: 8px;
    background: rgb(255 255 255 / 0.25);
  }
  .modo h4 { margin-top: 0.7em; }
  .sello {
    display: inline-block;
    margin: 0.15em 0 0.9em 6px;
    padding: 4px 14px 3px;
    border: 3.5px double #5f5f5d;
    border-radius: 5px;
    color: #5f5f5d;
    font: 1.08rem/1.05 var(--fell-sc);
    letter-spacing: 0.03em;
    text-align: center;
    rotate: -7deg;
    filter: url(#tampon);
    opacity: 0;
    transform: scale(1.3);
  }
  .modo:global(.visto) .sello {
    opacity: 0.92;
    transform: none;
    transition:
      opacity 0.12s 0.15s,
      transform 0.22s var(--curva-posar, cubic-bezier(0.2, 0.7, 0.2, 1)) 0.15s;
  }
  .modo details {
    border-top: 1px solid rgb(29 29 27 / 0.15);
  }
  .modo summary,
  .creditos :global(summary) {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-weight: 700;
    cursor: pointer;
    list-style: none;
  }
  .modo summary::-webkit-details-marker,
  .creditos :global(summary::-webkit-details-marker) { display: none; }
  .modo summary::after,
  .creditos :global(summary::after) {
    content: '';
    flex: none;
    width: 9px;
    height: 9px;
    margin-right: 6px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    rotate: 45deg;
    translate: 0 -3px;
  }
  .modo details[open] summary::after,
  .creditos :global(details[open] summary::after) {
    rotate: 225deg;
    translate: 0 2px;
  }
  .nota {
    margin: 0.4em 0 0.6em;
    padding: 10px 14px 2px;
    border-left: 3px solid var(--tinta);
    background: rgb(29 29 27 / 0.05);
  }
  .filtros {
    position: absolute;
    width: 0;
    height: 0;
  }

  /* ---- Especificaciones, en fichas ---- */
  .fichas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(7.5em, 1fr));
    gap: 8px;
    margin: 0.6em 0 0;
    padding: 0;
    list-style: none;
  }
  .fichas li {
    display: grid;
    align-content: start;
    gap: 2px;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--papel);
    box-shadow:
      inset 0 0 0 1px rgb(29 29 27 / 0.18),
      0 1px 0 rgb(29 29 27 / 0.12);
  }
  .etiqueta {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #55544c;
  }
  .valor {
    font: 700 1.9rem/1 var(--ui);
    font-variant-numeric: lining-nums tabular-nums;
  }
  .detalle {
    font-size: 0.88rem;
    line-height: 1.2;
    color: #3d3c37;
  }

  /* ---- Créditos ---- */
  .creditos :global(h4) {
    font-size: 1.15rem;
    margin-top: 1em;
  }
  .creditos :global(details) {
    border-top: 1px solid var(--gris-claro);
    border-bottom: 1px solid var(--gris-claro);
  }
  .creditos :global(.lista-imagenes) {
    font-size: 0.9rem;
    padding-left: 1.4em;
  }

  /* ---- Escritorio: dos columnas, con la portadilla fija a la izquierda ---- */
  @media (min-width: 1024px) and (min-height: 620px) {
    .hoja {
      inset: 3dvh 24px 0;
      max-width: 1140px;
    }
    .lateral {
      flex: none;
      width: 320px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 26px 22px 20px;
      overflow-y: auto;
      background: var(--fondo-mesa, radial-gradient(120% 80% at 30% 0%, var(--tapete) 0%, var(--tapete-2) 80%));
      background-color: var(--tapete-2);
      color: var(--papel);
      box-shadow: inset -10px 0 14px -10px rgb(0 0 0 / 0.6);
      --foco: #e8c66a;
    }
    .portada {
      display: grid;
      justify-items: center;
      gap: 14px;
    }
    .portada .naipe {
      --ancho: min(200px, 26dvh);
      rotate: 0deg;
    }
    .portada .pie {
      margin: 0;
      min-height: 3.6em;
      text-align: center;
      font: italic 1rem/1.3 var(--fell);
      color: rgb(235 233 217 / 0.88);
      text-wrap: balance;
    }
    .portada .pie span {
      display: block;
      font: normal 1.15rem/1.2 var(--fell-sc);
      color: var(--papel);
    }
    .lateral ol {
      margin: 0;
      padding: 0;
      list-style: none;
      border-top: 1px solid rgb(235 233 217 / 0.2);
    }
    .lateral li button {
      display: flex;
      align-items: baseline;
      gap: 10px;
      width: 100%;
      min-height: 38px;
      padding: 6px 8px;
      border: 0;
      border-bottom: 1px solid rgb(235 233 217 / 0.12);
      background: none;
      color: rgb(235 233 217 / 0.8);
      font: 1.02rem var(--ui);
      text-align: left;
      cursor: pointer;
    }
    .lateral li button:hover { color: var(--papel); background: rgb(235 233 217 / 0.06); }
    .lateral li button[aria-current='true'] { color: var(--papel); font-weight: 700; }
    .lateral .num {
      width: 1.2em;
      font: normal 1rem var(--fell-sc);
      color: rgb(235 233 217 / 0.6);
    }
    .indice { display: none; }
    .texto {
      padding: 6px 48px 60px;
    }
    .texto :global(p),
    .texto :global(dd),
    .resumen :global(li) { max-width: 66ch; }
    .escena-fija {
      margin: 0 -48px 0.6em;
      height: min(52dvh, 440px);
    }
    .boton.tinta { width: auto; }
  }
  /* El giro estable de la portadilla fija: lo da el capítulo, y se mantiene al posarse. */
  .portada .naipe { transform: rotate(var(--g, 0deg)); }

  @media (prefers-reduced-motion: reduce) {
    .modo:global(.visto) .sello,
    .bloque { transition: none; }
  }
</style>
