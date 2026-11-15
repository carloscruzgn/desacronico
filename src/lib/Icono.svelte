<script lang="ts">
  // Un icono propio del juego (los de la portada, de src/lib/iconos.ts). El contorno toma el color de la letra:
  // tinta sobre papel y papel sobre el tapete. Es decorativo: el texto del botón ya dice qué hace.
  import { ICONOS, type NombreIcono } from './iconos'

  interface Props {
    nombre: NombreIcono
    /** Lado en píxeles. */
    lado?: number
  }
  let { nombre, lado = 32 }: Props = $props()
</script>

<svg class="icono-juego" viewBox="0 0 48 48" width={lado} height={lado} aria-hidden="true" focusable="false">{@html ICONOS[nombre]}</svg>

<style>
  .icono-juego {
    flex: none;
    display: block;
  }
</style>
