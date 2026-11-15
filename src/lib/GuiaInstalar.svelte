<script lang="ts">
  // Instalar en iPhone y iPad: Safari no deja hacerlo con un botón, así que se cuentan los tres pasos. En las
  // versiones recientes, Compartir está dentro del menú «···».
  import { fade, fly } from 'svelte/transition'
  import { capa, cerrarCapa } from './capas'
  import Icono from './Icono.svelte'
  import { dura } from './movimiento'

  interface Props {
    oncerrar: () => void
  }
  let { oncerrar }: Props = $props()
</script>

<div class="velo" transition:fade={{ duration: dura(200) }} onclick={cerrarCapa} role="presentation"></div>
<div class="hoja" role="dialog" aria-modal="true" aria-labelledby="instalar-titulo" use:capa={oncerrar} transition:fly={{ y: 60, duration: dura(280) }}>
  <h2 id="instalar-titulo"><Icono nombre="instalar" lado={40} />Instala desacrónico</h2>
  <ol>
    <li>
      <span class="numero">1</span>
      <span>
        En Safari, toca Compartir
        <svg class="compartir" viewBox="0 0 24 24" role="img" aria-label="(el cuadrado con una flecha hacia arriba)"><path d="M12 3v12M8 7l4-4 4 4" /><path d="M8.5 10H6.5a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10h-2" /></svg>
        <small>Si no lo ves, está en el menú ···</small>
      </span>
    </li>
    <li>
      <span class="numero">2</span>
      <span>
        Elige <b>Añadir a pantalla de inicio</b>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3.5" /><path d="M12 8.5v7M8.5 12h7" /></svg>
      </span>
    </li>
    <li>
      <span class="numero">3</span>
      <span>Toca <b>Añadir</b>.</span>
    </li>
  </ol>
  <div class="acciones">
    <button class="boton" data-foco onclick={cerrarCapa}>Entendido</button>
  </div>
</div>

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgb(0 0 0 / 0.6);
  }
  .hoja {
    --foco: var(--tinta);
    position: fixed;
    z-index: 41;
    inset: auto 12px calc(16px + env(safe-area-inset-bottom));
    max-width: 440px;
    margin: 0 auto;
    padding: 20px 22px 16px;
    border-radius: 14px;
    background: var(--grano-papel), var(--papel-2);
    color: var(--tinta);
    box-shadow: 0 10px 40px rgb(0 0 0 / 0.5);
    text-align: left;
    font-size: 1.08rem;
    line-height: 1.35;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 10px;
    font-size: 1.3rem;
  }
  /* el móvil es estrecho dentro de su cuadro: se arrima al título */
  h2 :global(.icono-juego) { margin: 0 -6px 0 -8px; }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: 12px;
    align-items: start;
    padding: 10px 0;
    border-top: 1px solid rgb(29 29 27 / 0.12);
  }
  li > span:last-child { padding-top: 3px; }
  .numero {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--acento);
    box-shadow: 0 0 0 1.3px var(--tinta);
    font-weight: 700;
  }
  small {
    display: block;
    color: #55544c;
    font-size: 0.9rem;
  }
  svg {
    width: 22px;
    height: 22px;
    vertical-align: -5px;
    fill: none;
    stroke: var(--tinta);
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  /* el azul de los iconos de Safari, para reconocerlo de un vistazo */
  .compartir { stroke: #2f6fd6; }
  .acciones {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
  /* sobre papel, de tinta: como los botones de las ventanas de la partida */
  .acciones .boton {
    min-height: 46px;
    padding: 0 22px;
    background: var(--tinta);
    color: var(--papel);
    box-shadow:
      0 2px 0 #000,
      0 6px 14px rgb(0 0 0 / 0.25);
  }
</style>
