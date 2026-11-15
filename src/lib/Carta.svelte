<script lang="ts" module>
  import detallesJson from '../../compartido/detalles.json'

  /** Detalle del reverso de cada carta: [x, y, escala]. (x, y) es un punto fijo en fracciones de la imagen:
      el píxel (x·ancho, y·alto) se ve en (x·W, y·H) del marco. La escala es respecto al «cover» de siempre. */
  const detalles = detallesJson as unknown as Record<string, [number, number, number] | null>

  /** Por debajo de este ancho la carta usa la miniatura (260 px) y deja fuera la letra pequeña. */
  const PEQUENA = 170
  /** Con más ampliación que esta, el detalle del reverso sale de la imagen original: la miniatura se vería blanda. */
  const AMPLIACION_MINI = 1.5
</script>

<script lang="ts">
  import { eraDe, type Carta, type Fecha } from '../../compartido/tipos'
  import { anioTexto } from './datos'

  interface Props {
    carta: Carta
    /** Año de la carta; solo se conoce cuando ya se ha jugado. */
    fecha?: Fecha | null
    /** Muestra el reverso (la cara con el año). */
    volteada?: boolean
    /** Qué ilustración se descarga: «mini» donde la carta siempre es pequeña (mano, abanicos), «grande» en la
        carta ampliada y «auto» para elegirla según el ancho con que se pinta. */
    imagen?: 'mini' | 'grande' | 'auto'
    /** Aquí la carta no se da la vuelta: no se descarga la ilustración del reverso. */
    soloAnverso?: boolean
    /** Al darse la vuelta, la revelación de la mesa (ANIM-7): se voltea como una cartulina, con el canto
        oscurecido; la banda se estampa con el color de su era desde el gris y caen las cifras del año. */
    revelar?: boolean
  }
  let { carta, fecha = null, volteada = false, imagen = 'auto', soloAnverso = false, revelar = false }: Props = $props()
  const anio = $derived(anioTexto(fecha))
  /** Las letras del año, una a una, para que caigan como tipos móviles: cada una es la de verdad. */
  const tipos = $derived([...anio])

  const oscura = $derived(carta.ambito === 'social' || carta.ambito === 'mujer' || carta.ambito === 'coria')
  const era = $derived(fecha ? eraDe(fecha.anio) : null)
  const detalle = $derived(detalles[carta.id] ?? null)

  let ancho = $state(0)
  /** Una carta que ya se ha visto grande se queda con la ilustración original, aunque luego encoja. */
  let crecida = $state(false)
  $effect(() => {
    if (ancho >= PEQUENA) crecida = true
  })
  const mini = $derived(imagen === 'mini' || (imagen === 'auto' && !crecida))
  // En «auto» se espera a conocer el ancho, para no descargar dos veces la misma ilustración.
  const lista = $derived(imagen !== 'auto' || ancho > 0)
  const original = $derived(`/cartas/${carta.id}.webp`)
  const miniatura = $derived(`/cartas/mini/${carta.id}.webp`)
  const srcAnverso = $derived(lista ? (mini ? miniatura : original) : undefined)
  const srcReverso = $derived(lista ? (mini && (detalle?.[2] ?? 1) <= AMPLIACION_MINI ? miniatura : original) : undefined)

  /** La ilustración entra con un fundido corto en cuanto llega. */
  const llega = (e: Event) => (e.currentTarget as HTMLElement).classList.add('llegada')
</script>

<div class="carta {carta.ambito}" class:oscura class:volteada class:revela={revelar} bind:clientWidth={ancho}>
  <div class="giro">
    <!-- El lector de pantalla solo lee la cara que se ve (A11Y-6). -->
    <div class="cara anverso" aria-hidden={volteada ? 'true' : undefined}>
      <div class="marca"><span class="sr-only">desacrónico</span><span aria-hidden="true"><span class="des">des</span><span class="a">a</span>crónico</span></div>
      <div class="ilustracion">
        {#if srcAnverso}<img src={srcAnverso} alt="" loading="lazy" draggable="false" onload={llega} onerror={llega} />{/if}
        <div class="pestana {carta.logoAnverso}"><img src="/img/cepa.svg" alt="CEPA Coria" draggable="false" /></div>
      </div>
      <div class="texto"><p>{@html carta.texto}</p></div>
    </div>

    <div class="cara reverso" aria-hidden={volteada ? undefined : 'true'}>
      <div class="ilustracion" style:--dx={detalle?.[0]} style:--dy={detalle?.[1]} style:--ds={detalle?.[2]}>
        {#if srcReverso && (!soloAnverso || volteada)}<img src={srcReverso} alt="" loading="lazy" draggable="false" onload={llega} onerror={llega} />{/if}
        <div class="pestana {carta.logoReverso}"><img src="/img/cepa.svg" alt="" draggable="false" /></div>
      </div>
      <div class="banda {era ?? ''}" class:larga={anio.length > 14}>
        {#if revelar}<span class="tipos">{#each tipos as t, k (k)}<span class="tipo" style:--k={k}>{t}</span>{/each}</span>{:else}{anio}{/if}
      </div>
      <hr />
      <div class="texto"><p>{@html carta.texto}</p></div>
      <div class="pie">
        <img class="cc" src="/img/cc-by-sa.png" alt="CC BY-SA" draggable="false" />
        <div class="creditos">
          Carlos Cruz González | Rodrigo Muñoz Martínez<br />
          Imagen: {carta.credito}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Todas las medidas van en cqw (centésimas del ancho de la carta), tomadas de la carta impresa
     de 554 × 766: así la carta es idéntica a cualquier tamaño. */
  .carta {
    --fondo: var(--comunicacion);
    --letra: var(--tinta);
    font-family: 'Fell', 'Times New Roman', serif;
    line-height: 1.2;
    width: var(--ancho, 240px);
    aspect-ratio: 554 / 766;
    container-type: inline-size;
    perspective: 1200px;
    user-select: none;
  }
  .carta.social { --fondo: var(--social); }
  .carta.cientifico { --fondo: var(--cientifico); }
  .carta.mujer { --fondo: var(--mujer); }
  .carta.coria { --fondo: var(--coria); }
  .carta.oscura { --letra: #fff; }

  .giro {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.6s var(--curva-voltear, ease-in-out);
  }
  .volteada .giro {
    transform: rotateY(180deg);
  }

  .cara {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 4cqw;
    background: var(--fondo);
    color: var(--letra);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    box-shadow:
      0 0.4cqw 0.8cqw rgb(0 0 0 / 0.35),
      0 2cqw 5cqw rgb(0 0 0 / 0.3);
    /* borde fino para que las cartas claras y oscuras se recorten igual sobre el tapete */
    outline: 0.25cqw solid rgb(255 255 255 / 0.14);
    outline-offset: -0.25cqw;
  }
  .reverso {
    transform: rotateY(180deg);
  }

  .marca {
    height: 10.83cqw;
    display: grid;
    place-items: center;
    font-size: 6.5cqw;
    line-height: 1;
  }
  .marca .des { color: var(--gris); }
  .marca .a { color: var(--gris-claro); }
  .oscura .marca .a { color: #5c5c5c; }

  .ilustracion {
    position: relative;
    overflow: hidden;
    background: rgb(0 0 0 / 0.12);
  }
  .ilustracion > img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .ilustracion > img:global(.llegada) {
    opacity: 1;
  }
  .anverso .ilustracion {
    height: 90.6cqw;
  }
  .reverso .ilustracion {
    margin: 8.3cqw 8.3cqw 0;
    height: 73.3cqw;
    border-radius: 4cqw 4cqw 0 0;
  }
  /* El reverso enseña un detalle de la ilustración, ampliado, como la carta impresa. Sin datos, la parte de arriba. */
  .reverso .ilustracion > img {
    object-position: calc(var(--dx, 0.5) * 100%) calc(var(--dy, 0) * 100%);
    transform: scale(var(--ds, 1));
    transform-origin: calc(var(--dx, 0.5) * 100%) calc(var(--dy, 0) * 100%);
  }

  /* La pestaña del logo muerde una esquina de la ilustración, como en la carta impresa */
  .pestana {
    position: absolute;
    width: 31.8cqw;
    height: 16.8cqw;
    background: var(--fondo);
    display: grid;
    place-items: center;
  }
  .reverso .pestana {
    width: 27cqw;
    height: 15cqw;
  }
  .pestana img {
    width: 72%;
    height: auto;
  }
  .oscura .pestana img,
  .oscura .cc {
    filter: invert(1);
  }
  .pestana.tl { top: 0; left: 0; border-bottom-right-radius: 5.4cqw; }
  .pestana.tr { top: 0; right: 0; border-bottom-left-radius: 5.4cqw; }
  .pestana.bl { bottom: 0; left: 0; border-top-right-radius: 5.4cqw; }
  .pestana.br { bottom: 0; right: 0; border-top-left-radius: 5.4cqw; }

  .texto p {
    margin: 0;
  }
  .texto {
    padding: 0 7cqw;
    text-align: center;
    font-size: 5.43cqw;
    line-height: 1.2;
    text-wrap: balance;
  }
  .anverso .texto {
    height: 36.8cqw;
    display: grid;
    place-items: center;
  }
  .reverso .texto {
    height: 22cqw;
    display: grid;
    place-items: center;
  }

  .banda {
    margin: 0 0.5cqw;
    height: 17.3cqw;
    display: grid;
    place-items: center;
    background: var(--gris);
    color: #fff;
    font-family: 'Fell SC', 'Fell', serif;
    font-size: 15.2cqw;
    line-height: 1;
    letter-spacing: 0.02em;
    /* En pantalla, una sombra fina ayuda a leer el blanco sobre las bandas claras sin cambiar sus colores. */
    text-shadow:
      0 0 0.5cqw rgb(0 0 0 / 0.45),
      0 0.4cqw 1.2cqw rgb(0 0 0 / 0.3);
  }
  .banda { white-space: nowrap; }
  /* «-13797 millones»: el año más largo de la baraja cabe en un renglón, un poco más pequeño */
  .banda.larga { font-size: 13.4cqw; }
  .banda.antigua { background: var(--antigua); }
  .banda.media { background: var(--media); }
  .banda.moderna { background: var(--moderna); }
  .banda.contemporanea { background: var(--contemporanea); }

  hr {
    margin: 2.2cqw 0 0;
    border: 0;
    border-top: 0.45cqw solid var(--letra);
  }

  .pie {
    display: flex;
    align-items: center;
    gap: 3cqw;
    padding: 0 7.8cqw;
    height: 10cqw;
  }
  .cc {
    width: 15.7cqw;
    height: auto;
  }
  .creditos {
    font-size: 2.71cqw;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* La carta pequeña se queda limpia: fuera la letra que no se puede leer y el texto, más grande y en tres renglones
     como mucho. El recorte va en el párrafo, para no romper el centrado de .texto. La carta grande no cambia. */
  @container (max-width: 169.98px) {
    .reverso .pie { display: none; }
    .reverso .texto {
      height: 32cqw;
      font-size: 7.6cqw;
      line-height: 1.15;
    }
    .reverso .texto p {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      overflow: hidden;
    }
    /* El año, con un contorno fino: a este tamaño la sombra suave no basta para leer el blanco. */
    .banda {
      text-shadow:
        0 0 1px rgb(0 0 0 / 0.9),
        0 0 2px rgb(0 0 0 / 0.55);
    }
  }
  @container (max-width: 119.98px) {
    .anverso .texto {
      font-size: 8.6cqw;
      line-height: 1.12;
    }
    .anverso .texto p {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      overflow: hidden;
    }
  }

  /* La revelación (ANIM-7), en 1 s: la cartulina gira sin pasarse de los 180° y su cara se oscurece al ponerse
     de canto; la banda pasa del gris al color de su era con un golpe de tampón y las cifras caen una a una,
     cada una la suya, como tipos móviles. Nada rebota. */
  .revela.volteada .giro {
    transition: none;
    animation: voltear-cartulina 0.48s var(--curva-voltear) 0.08s both;
  }
  @keyframes voltear-cartulina {
    from { transform: rotateY(0deg); }
    to { transform: rotateY(180deg); }
  }
  .revela .cara::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: #000;
    opacity: 0;
    pointer-events: none;
  }
  .revela.volteada .cara::after {
    animation: canto 0.48s linear 0.08s both;
  }
  @keyframes canto {
    50% { opacity: 0.5; }
    to { opacity: 0; }
  }
  .revela.volteada .banda {
    animation: estampar-banda 0.24s var(--curva-posar) 0.5s both;
  }
  @keyframes estampar-banda {
    from {
      background-color: var(--gris);
      transform: scale(1.04);
    }
  }
  .tipo {
    display: inline-block;
    white-space: pre;
  }
  .revela.volteada .tipo {
    animation: caer 0.2s var(--curva-posar) calc(0.52s + var(--k) * 0.035s) both;
  }
  @keyframes caer {
    from {
      transform: translateY(-75%);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .giro { transition-duration: 0.01s; }
    .ilustracion > img { transition: none; }
    .revela.volteada .giro,
    .revela.volteada .cara::after,
    .revela.volteada .banda,
    .revela.volteada .tipo {
      animation: none;
    }
  }
</style>
