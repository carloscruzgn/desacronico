<script lang="ts">
  // Pregunta antes de hacer algo que no tiene vuelta atrás fácil (salir de una partida, quitar a un jugador).
  import { fade, scale } from 'svelte/transition'
  import { dialogo } from './dialogo'
  import { dura } from './movimiento'

  interface Props {
    titulo: string
    texto?: string
    si: string
    no?: string
    onsi: () => void
    onno: () => void
  }
  let { titulo, texto = '', si, no = 'Cancelar', onsi, onno }: Props = $props()
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    onno()
  }}
/>

<div class="velo" transition:fade={{ duration: dura(160) }} onclick={(e) => e.target === e.currentTarget && onno()} role="presentation">
  <div class="caja" role="alertdialog" aria-modal="true" aria-labelledby="confirmar-titulo" aria-describedby={texto ? 'confirmar-texto' : undefined} use:dialogo in:scale={{ duration: dura(220), start: 0.9 }}>
    <h2 id="confirmar-titulo">{titulo}</h2>
    {#if texto}<p id="confirmar-texto">{texto}</p>{/if}
    <div class="acciones">
      <button class="boton secundario" data-foco onclick={onno}>{no}</button>
      <button class="boton" onclick={onsi}>{si}</button>
    </div>
  </div>
</div>

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(0 0 0 / 0.66);
  }
  .caja {
    --foco: var(--tinta);
    width: min(100%, 380px);
    padding: 20px;
    border-radius: 12px;
    background: var(--grano-papel), var(--papel-2);
    color: var(--tinta);
    text-align: center;
    box-shadow: 0 20px 60px rgb(0 0 0 / 0.6);
  }
  h2 {
    margin: 0 0 0.3em;
    font-size: 1.5rem;
    line-height: 1.15;
  }
  p {
    margin: 0 0 0.4em;
    color: #55544c;
  }
  .acciones {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 16px;
  }
  .boton {
    padding-inline: 0.6em;
    background: var(--tinta);
    color: var(--papel);
    box-shadow: 0 2px 0 #000;
  }
  .boton.secundario {
    background: transparent;
    color: var(--tinta);
    box-shadow: inset 0 0 0 1px var(--gris);
  }
</style>
