<script lang="ts">
  import { eraDe, type Carta, type Fecha } from '../../compartido/tipos'

  interface Props {
    carta: Carta
    /** Año de la carta; solo se conoce cuando ya se ha jugado. */
    fecha?: Fecha | null
    /** Muestra el reverso (la cara con el año). */
    volteada?: boolean
  }
  let { carta, fecha = null, volteada = false }: Props = $props()

  const oscura = $derived(carta.ambito === 'social' || carta.ambito === 'mujer' || carta.ambito === 'coria')
  const era = $derived(fecha ? eraDe(fecha.anio) : null)
  const imagen = $derived(`/cartas/${carta.id}.webp`)
</script>

<div class="carta {carta.ambito}" class:oscura class:volteada>
  <div class="giro">
    <div class="cara anverso">
      <div class="marca"><span><span class="des">des</span><span class="a">a</span>crónico</span></div>
      <div class="ilustracion">
        <img src={imagen} alt="" loading="lazy" draggable="false" />
        <div class="pestana {carta.logoAnverso}"><img src="/img/cepa.png" alt="CEPA Coria" draggable="false" /></div>
      </div>
      <div class="texto"><p>{@html carta.texto}</p></div>
    </div>

    <div class="cara reverso">
      <div class="ilustracion">
        <img src={imagen} alt="" loading="lazy" draggable="false" />
        <div class="pestana {carta.logoReverso}"><img src="/img/cepa.png" alt="" draggable="false" /></div>
      </div>
      <div class="banda {era ?? ''}">
        {#if fecha}{fecha.circa ? 'c. ' : ''}{fecha.anio}{/if}
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
    transition: transform 0.7s cubic-bezier(0.3, 1.3, 0.5, 1);
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
  }
  .anverso .ilustracion {
    height: 90.6cqw;
  }
  .reverso .ilustracion {
    margin: 8.3cqw 8.3cqw 0;
    height: 73.3cqw;
    border-radius: 4cqw 4cqw 0 0;
  }
  .reverso .ilustracion > img {
    object-position: center top;
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
    width: 66%;
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
  }
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

  @media (prefers-reduced-motion: reduce) {
    .giro { transition-duration: 0.01s; }
  }
</style>
