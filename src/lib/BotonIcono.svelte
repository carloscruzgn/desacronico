<script lang="ts">
  // Botón redondo de navegación: volver, cerrar, abrir el reglamento. El reglamento lleva su icono propio,
  // el mismo libro abierto de la portada; volver y cerrar, un trazo de tinta.
  import Icono from './Icono.svelte'
  interface Props {
    icono: 'atras' | 'cerrar' | 'reglas'
    /** Texto para lectores de pantalla y al pasar el ratón. */
    etiqueta: string
    /** Sobre fondo de papel en lugar de sobre el tapete. */
    sobrePapel?: boolean
    onclick: () => void
  }
  let { icono, etiqueta, sobrePapel = false, onclick }: Props = $props()

  const trazos = {
    atras: 'M19 12H5.5M11.5 5.5 5 12l6.5 6.5',
    cerrar: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  }
</script>

<button class="icono" class:sobrePapel aria-label={etiqueta} title={etiqueta} {onclick}>
  {#if icono === 'reglas'}<Icono nombre="reglas" lado={32} />{:else}<svg viewBox="0 0 24 24" aria-hidden="true"><path d={trazos[icono]} /></svg>{/if}
</button>

<style>
  .icono {
    flex: none;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    /* Navegación bien visible: sobre el tapete, de papel con el trazo de tinta, como «Repartir». */
    background: var(--grano-papel), var(--papel);
    color: var(--tinta);
    box-shadow:
      0 2px 0 #b9b6a0,
      0 4px 10px rgb(0 0 0 / 0.3);
    cursor: pointer;
    transition:
      filter 0.15s,
      transform 0.12s;
  }
  .icono:hover { filter: brightness(1.06); }
  .icono:active { transform: scale(0.92); }
  /* Sobre papel, al revés: de tinta con el trazo de papel. */
  .icono.sobrePapel {
    background: var(--tinta);
    color: var(--papel);
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.25);
  }
  .icono.sobrePapel:hover { filter: brightness(1.25); }
  svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
