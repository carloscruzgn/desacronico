<script lang="ts">
  // La marca: «des» en gris, la «a» en gris oscuro y «crónico» en papel. Con `despliega`, empieza siendo «dac»,
  // como el icono de la app, y se abre hasta «desacrónico» (portada, una vez por carga).
  interface Props {
    despliega?: boolean
  }
  let { despliega = false }: Props = $props()
</script>

<!-- El lector de pantalla lee la palabra entera, no sus trozos. -->
<span class="marca" class:despliega
  ><span class="sr-only">desacrónico</span><span aria-hidden="true"
    ><span class="des">d<span class="crece es">es</span></span><span class="a">a</span>c<span class="crece ronico">rónico</span></span
  ></span
>

<style>
  .marca {
    font-family: 'Fell', serif;
    color: var(--papel);
    white-space: nowrap;
  }
  .des { color: var(--gris); }
  .a { color: #5c5c5c; }

  /* El despliegue: «dac» un momento y luego «es» y «rónico» se abren desde dentro de la palabra. */
  /* Al acabar no queda ningún tope (fill backwards): la palabra es la de siempre. */
  .despliega .crece {
    display: inline-block;
    vertical-align: top;
    overflow: hidden;
    animation: abrir 0.95s var(--curva-deslizar) 0.75s backwards;
  }
  .despliega .es { --hasta: 1.1em; }
  .despliega .ronico { --hasta: 3.3em; }
  @keyframes abrir {
    from {
      max-width: 0;
      opacity: 0;
    }
    40% { opacity: 1; }
    to {
      max-width: var(--hasta);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .despliega .crece { animation: none; }
  }
</style>
