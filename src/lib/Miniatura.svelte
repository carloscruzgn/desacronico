<script lang="ts">
  // Una carta en miniatura para índices y montones: el color del ámbito, la ilustración pequeña
  // (public/cartas/mini) y, si se da el año, la banda del reverso con el color de su era.
  // Sin texto: a este tamaño no se leería.
  import { eraDe, type Fecha } from '../../compartido/tipos'
  import { anioTexto, porId } from './datos'

  let { id, fecha = null }: { id: string; fecha?: Fecha | null } = $props()

  const carta = $derived(porId[id])
</script>

<span class="mini {carta.ambito}" class:reverso={!!fecha}>
  <span class="ilustracion"><img src="/cartas/mini/{id}.webp" alt="" loading="lazy" draggable="false" /></span>
  {#if fecha}
    <span class="banda {eraDe(fecha.anio)}">{anioTexto(fecha)}</span>
  {/if}
</span>

<style>
  .mini {
    --fondo: var(--comunicacion);
    display: flex;
    flex-direction: column;
    width: var(--ancho, 60px);
    aspect-ratio: 554 / 766;
    container-type: inline-size;
    overflow: hidden;
    /* el radio, en función del ancho: los cqw de la propia caja se medirían contra la de fuera */
    border-radius: calc(var(--ancho, 60px) * 0.045);
    background: var(--fondo);
    box-shadow:
      0 1px 2px rgb(0 0 0 / 0.35),
      0 4px 10px rgb(0 0 0 / 0.25);
    outline: 1px solid rgb(255 255 255 / 0.14);
    outline-offset: -1px;
  }
  .social { --fondo: var(--social); }
  .cientifico { --fondo: var(--cientifico); }
  .mujer { --fondo: var(--mujer); }
  .coria { --fondo: var(--coria); }

  .ilustracion {
    display: block;
    margin-top: 10.83cqw;
    height: 90.6cqw;
    overflow: hidden;
    background: rgb(0 0 0 / 0.12);
  }
  .reverso .ilustracion {
    margin: 8.3cqw 8.3cqw 0;
    height: 73.3cqw;
    border-radius: 4cqw 4cqw 0 0;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }
  .banda {
    display: grid;
    place-items: center;
    margin: 0 0.5cqw;
    height: 19cqw;
    background: var(--gris);
    color: #fff;
    font-family: var(--fell-sc);
    font-size: 15.5cqw;
    line-height: 1;
    white-space: nowrap;
    text-shadow: 0 0 2px rgb(0 0 0 / 0.5);
  }
  .banda.antigua { background: var(--antigua); }
  .banda.media { background: var(--media); }
  .banda.moderna { background: var(--moderna); }
  .banda.contemporanea { background: var(--contemporanea); }
</style>
