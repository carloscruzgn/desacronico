<script lang="ts">
  // Los dos interruptores del único ajuste de sonido: efectos de mesa y voz. Van en Opciones (antes de
  // repartir y en la sala) y en el menú del botón de sonido de la barra. Son de este aparato, no de la partida.
  import { ponerEfectos, ponerVoz, sonido } from './sonido'

  interface Props {
    /** Sobre papel (el menú del botón) en lugar de sobre el tapete. */
    sobrePapel?: boolean
  }
  let { sobrePapel = false }: Props = $props()
</script>

<div class="ajustes-sonido" class:sobrePapel>
  <label>
    <input type="checkbox" role="switch" checked={sonido.efectos} onchange={(e) => ponerEfectos(e.currentTarget.checked)} />
    <span class="texto">
      <b>Efectos de mesa</b>
      <span>Barajar, voltear, colocar… y una vibración breve al acertar o fallar</span>
    </span>
    <span class="palanca" aria-hidden="true"></span>
  </label>
  <label>
    <input type="checkbox" role="switch" checked={sonido.voz} onchange={(e) => ponerVoz(e.currentTarget.checked)} />
    <span class="texto">
      <b>Voz</b>
      <span>Narra el tutorial. «Escuchar» lee las cartas aunque esté apagada</span>
    </span>
    <span class="palanca" aria-hidden="true"></span>
  </label>
</div>

<style>
  .ajustes-sonido {
    --linea: rgb(235 233 217 / 0.3);
    --suave: var(--gris-claro);
    --activo: var(--papel);
    --fondo-activo: rgb(235 233 217 / 0.14);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    gap: 8px;
  }
  .sobrePapel {
    --linea: rgb(29 29 27 / 0.25);
    --suave: #55544c;
    --activo: var(--tinta);
    --fondo-activo: rgb(29 29 27 / 0.06);
    grid-template-columns: 1fr;
  }
  label {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid var(--linea);
    border-radius: var(--radio-ficha, 8px);
    line-height: 1.25;
    cursor: pointer;
  }
  label:has(input:checked) {
    border-color: var(--activo);
    background: var(--fondo-activo);
  }
  label:has(input:focus-visible) {
    outline: 2px solid var(--foco);
    outline-offset: 2px;
  }
  /* El interruptor de verdad no se ve: lo dibuja la etiqueta, y ocupa toda la ficha para el toque. */
  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }
  .texto {
    flex: 1;
    display: grid;
    gap: 2px;
  }
  b {
    font-weight: 700;
    font-size: 1.05rem;
  }
  .texto span {
    font-size: 0.92rem;
    color: var(--suave);
  }
  /* La palanca: un óvalo con una ficha que pasa de un lado al otro. */
  .palanca {
    flex: none;
    position: relative;
    width: 40px;
    height: 24px;
    border-radius: 12px;
    border: 1.5px solid var(--suave);
    transition: background 0.15s, border-color 0.15s;
  }
  .palanca::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: var(--suave);
    transition: translate 0.15s var(--curva-deslizar, ease-out), background 0.15s;
  }
  input:checked ~ .palanca {
    border-color: var(--activo);
    background: var(--activo);
  }
  input:checked ~ .palanca::after {
    translate: 16px 0;
    background: var(--tapete-2, #1d1d1b);
  }
  .sobrePapel input:checked ~ .palanca::after { background: var(--papel); }
  @media (prefers-reduced-motion: reduce) {
    .palanca,
    .palanca::after { transition: none; }
  }
</style>
