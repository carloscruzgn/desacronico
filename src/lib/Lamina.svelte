<script lang="ts">
  // La lámina de la cronología (ANIM-16): al acabar, la cronología se compone en una hoja de papel, con las cartas
  // por el reverso en filas y, bajo cada fila, la línea del tiempo con el tramo de la era de cada carta. Se puede
  // guardar como PNG, con la marca y, al pie, la licencia, los autores y el crédito de cada imagen.
  import { fade, fly } from 'svelte/transition'
  import { eraDe, type Fecha } from '../../compartido/tipos'
  import BotonIcono from './BotonIcono.svelte'
  import Carta from './Carta.svelte'
  import { capa, cerrarCapa } from './capas'
  import { anioHablado, porId, textoPlano } from './datos'
  import { AUTORES, columnasLamina, creditosLamina, dibujarLamina, enFilas } from './lamina'
  import { dura } from './movimiento'

  interface Props {
    /** Las cartas de la cronología, de la más antigua a la más reciente. */
    cronologia: string[]
    fechas: Record<string, Fecha>
    /** «Gana Ana · 18 cartas». */
    subtitulo: string
    oncerrar: () => void
  }
  let { cronologia, fechas, subtitulo, oncerrar }: Props = $props()

  const HUECO = 10
  let ancho = $state(0)
  /** En pantalla, tantas columnas como quepan (con cartas de 88 px como poco), y como mucho las del PNG. */
  const columnas = $derived(Math.max(1, Math.min(columnasLamina(cronologia.length), Math.floor((ancho + HUECO) / (88 + HUECO)) || 1)))
  const lado = $derived(ancho ? Math.min(150, (ancho - (columnas - 1) * HUECO) / columnas) : 100)
  const filas = $derived(enFilas(cronologia, columnas))
  const creditos = $derived(creditosLamina(cronologia, fechas))
  const dia = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  let guardando = $state(false)
  let aviso = $state('')
  async function guardar() {
    guardando = true
    aviso = ''
    try {
      const png = await dibujarLamina({ ids: cronologia, fechas, subtitulo })
      const url = URL.createObjectURL(png)
      const a = document.createElement('a')
      a.href = url
      a.download = `desacronico-cronologia-${new Date().toISOString().slice(0, 10)}.png`
      document.body.append(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      aviso = 'Lámina guardada en tus descargas.'
    } catch {
      aviso = 'No se ha podido guardar la lámina. Inténtalo otra vez.'
    } finally {
      guardando = false
    }
  }
</script>

<div class="velo" transition:fade={{ duration: dura(180) }} onclick={(e) => e.target === e.currentTarget && cerrarCapa()} role="presentation">
  <div class="hoja" role="dialog" aria-modal="true" aria-labelledby="lamina-titulo" aria-describedby="lamina-sub" use:capa={oncerrar} in:fly={{ y: 24, duration: dura(260) }}>
    <header>
      <BotonIcono icono="cerrar" etiqueta="Cerrar la lámina" sobrePapel onclick={cerrarCapa} />
    </header>
    <div class="lamina">
      <p class="marca" aria-hidden="true"><span class="des">des</span><span class="a">a</span>crónico</p>
      <h2 id="lamina-titulo">La cronología de la partida</h2>
      <p class="sub" id="lamina-sub">{subtitulo} · {dia}</p>

      <div class="cartas" bind:clientWidth={ancho} style:--lado="{lado}px" style:--hueco="{HUECO}px">
        {#each filas as fila, k (k)}
          <ol class="fila" start={k * columnas + 1} style:--fila={k}>
            {#each fila as id, j (id)}
              {@const f = fechas[id]}
              <li class="pieza {f ? eraDe(f.anio) : ''}" style:--i={k * columnas + j}>
                <span class="sr-only">{f ? anioHablado(f) : ''}: {textoPlano(porId[id])}</span>
                <div class="carta" aria-hidden="true"><Carta carta={porId[id]} fecha={f} volteada imagen="mini" /></div>
              </li>
            {/each}
          </ol>
        {/each}
      </div>

      <footer>
        <img src="/img/cc-by-sa.png" alt="Licencia CC BY-SA" width="60" height="21" />
        <p class="autores"><span class="fell">desacrónico</span> · {AUTORES}</p>
        <p class="creditos">Imágenes: {creditos}</p>
      </footer>
    </div>
    <div class="acciones">
      <p class="aviso" role="status">{aviso}</p>
      <button class="boton" onclick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar lámina'}</button>
      <button class="boton secundario" data-foco onclick={cerrarCapa}>Cerrar</button>
    </div>
  </div>
</div>

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 38;
    display: grid;
    place-items: center;
    padding: 12px;
    background: rgb(0 0 0 / 0.66);
  }
  .hoja {
    --foco: var(--tinta);
    position: relative;
    width: min(100%, 960px);
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: var(--radio-hoja);
    background: var(--grano-papel), var(--papel-2);
    color: var(--tinta);
    box-shadow: var(--sombra-hoja);
  }
  header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    justify-content: flex-end;
    height: 0;
    /* la X, dentro del filete doble de la lámina (12 px de margen y 6 px de filete), sin pisarlo */
    padding: 0 24px;
  }
  /* con papel propio: al desplazar la hoja, la X pasa por encima de las cartas y tiene que seguir leyéndose */
  header :global(.icono) {
    margin-top: 24px;
    background: var(--papel-2);
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
  }
  header :global(.icono:hover) { background: var(--papel); }
  /* La lámina, con su filete de tinta doble, como una lámina impresa */
  .lamina {
    margin: 12px;
    padding: 26px clamp(10px, 4vw, 40px) 20px;
    outline: 1.5px solid var(--tinta);
    outline-offset: -1px;
    box-shadow: inset 0 0 0 5px var(--papel-2), inset 0 0 0 5.6px var(--tinta);
    text-align: center;
  }
  .marca {
    margin: 0;
    font-family: var(--fell);
    font-size: clamp(1.9rem, 7vw, 2.6rem);
    line-height: 1.1;
  }
  .marca .des { color: var(--gris); }
  .marca .a { color: #a9a9a6; }
  h2 {
    margin: 0.1em 0 0;
    font-family: var(--fell-sc);
    font-weight: normal;
    font-size: 1.3rem;
  }
  .sub {
    margin: 0.2em 0 18px;
    color: #55544c;
    font-style: italic;
  }

  /* Las cartas en filas; bajo cada fila, la línea del tiempo con un tramo por carta, del color de su era. */
  .cartas {
    display: grid;
    gap: 18px;
  }
  .fila {
    position: relative;
    display: flex;
    justify-content: center;
    gap: var(--hueco);
    margin: 0;
    padding: 0 0 18px;
    list-style: none;
  }
  /* la línea grabada de la fila */
  .fila::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 6px;
    width: calc(100% - 4px);
    max-width: calc(6 * (var(--lado) + var(--hueco)));
    height: 1px;
    translate: -50% 0;
    background: rgb(29 29 27 / 0.25);
  }
  .pieza {
    position: relative;
    flex: none;
    width: var(--lado);
    animation: posar-lamina 0.3s var(--curva-posar) calc(min(var(--i), 30) * 30ms) both;
  }
  .carta { --ancho: var(--lado); }
  /* el tramo de la era de cada carta, que se entinta fila a fila */
  .pieza::after {
    content: '';
    position: absolute;
    left: calc(var(--hueco) / -2);
    right: calc(var(--hueco) / -2);
    bottom: -13.5px;
    height: 4px;
    background: var(--tramo, transparent);
    transform-origin: left;
    animation: entintar-lamina 0.4s var(--curva-deslizar) calc(0.25s + min(var(--i), 30) * 30ms) both;
  }
  .antigua { --tramo: var(--antigua); }
  .media { --tramo: var(--media); }
  .moderna { --tramo: var(--moderna); }
  .contemporanea { --tramo: var(--contemporanea); }
  @keyframes posar-lamina {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
  @keyframes entintar-lamina {
    from { transform: scaleX(0); }
  }

  footer {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 12px;
    align-items: center;
    margin-top: 22px;
    padding-top: 12px;
    border-top: 1px solid rgb(29 29 27 / 0.45);
    text-align: left;
  }
  footer img { grid-row: span 2; align-self: start; }
  .autores {
    margin: 0;
    font-size: 0.95rem;
  }
  .fell { font-family: var(--fell); }
  .creditos {
    margin: 0;
    color: #55544c;
    font-size: 0.8rem;
    line-height: 1.3;
  }
  .acciones {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 10px;
    padding: 4px 12px 16px;
  }
  .aviso {
    flex-basis: 100%;
    min-height: 1.3em;
    margin: 0;
    color: #55544c;
    font-style: italic;
    text-align: center;
  }
  .acciones .boton:not(.secundario) {
    background: var(--tinta);
    color: var(--papel);
    box-shadow: 0 2px 0 #000;
  }
  .acciones .secundario { color: var(--tinta); }

  @media (prefers-reduced-motion: reduce) {
    .pieza,
    .pieza::after {
      animation: none;
    }
  }
</style>
