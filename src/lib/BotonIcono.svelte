<script lang="ts">
  // Botón redondo de navegación: volver, cerrar, abrir el reglamento.
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
    reglas: 'M12 6.5C9.5 5 6.5 5 4 6v12.5c2.5-1 5.5-1 8 .5 2.5-1.5 5.5-1.5 8-.5V6c-2.5-1-5.5-1-8 .5zm0 0V19',
  }
</script>

<button class="icono" class:sobrePapel aria-label={etiqueta} title={etiqueta} {onclick}>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={trazos[icono]} /></svg>
</button>

<style>
  .icono {
    flex: none;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid rgb(235 233 217 / 0.32);
    border-radius: 50%;
    background: rgb(235 233 217 / 0.08);
    color: var(--papel);
    cursor: pointer;
    transition:
      background 0.15s,
      transform 0.12s;
  }
  .icono:hover { background: rgb(235 233 217 / 0.18); }
  .icono:active { transform: scale(0.92); }
  .icono.sobrePapel {
    border-color: rgb(29 29 27 / 0.3);
    background: rgb(29 29 27 / 0.06);
    color: var(--tinta);
  }
  .icono.sobrePapel:hover { background: rgb(29 29 27 / 0.14); }
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
