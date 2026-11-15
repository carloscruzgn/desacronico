<script lang="ts">
  // El ajuste de sonido: efectos de mesa (con su volumen) y voz. Va en Opciones (antes de repartir y en la sala)
  // y en el menú del botón de sonido de la barra. Es de este aparato, no de la partida.
  import { ponerEfectos, ponerVolumen, ponerVoz, sonido } from './sonido'

  interface Props {
    /** Sobre papel (el menú del botón) en lugar de sobre el tapete. */
    sobrePapel?: boolean
  }
  let { sobrePapel = false }: Props = $props()
</script>

<div class="ajustes-sonido" class:sobrePapel>
  <label>
    <input type="checkbox" role="switch" checked={sonido.efectos} onchange={(e) => ponerEfectos(e.currentTarget.checked)} />
    <b>Efectos de mesa</b>
    <span class="palanca" aria-hidden="true"></span>
  </label>
  <!-- El volumen de los efectos, justo debajo de su interruptor. Al soltar suena un «voltear», para oír cómo queda. -->
  <div class="volumen" class:apagado={!sonido.efectos}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /></svg>
    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      aria-label="Volumen de los efectos"
      disabled={!sonido.efectos}
      value={sonido.volumen}
      style="--v: {sonido.volumen * 100}%"
      oninput={(e) => ponerVolumen(+e.currentTarget.value)}
      onchange={(e) => ponerVolumen(+e.currentTarget.value, true)}
    />
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>
  </div>
  <label>
    <input type="checkbox" role="switch" checked={sonido.voz} onchange={(e) => ponerVoz(e.currentTarget.checked)} />
    <b>Voz</b>
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
    gap: 8px;
  }
  .sobrePapel {
    --linea: rgb(29 29 27 / 0.25);
    --suave: #55544c;
    --activo: var(--tinta);
    --fondo-activo: rgb(29 29 27 / 0.06);
  }
  label {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 52px;
    padding: 8px 12px;
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
  label input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }
  b {
    font-weight: 700;
    font-size: 1.05rem;
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

  /* El volumen de los efectos: a lo ancho, con un altavoz a cada lado. */
  .volumen {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 4px;
    color: var(--activo);
  }
  .volumen.apagado { opacity: 0.4; }
  .volumen svg {
    flex: none;
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  input[type='range'] {
    flex: 1;
    min-width: 0;
    height: 44px;
    margin: 0;
    background: transparent;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
  }
  input[type='range']:disabled { cursor: default; }
  input[type='range']:focus-visible {
    outline: 2px solid var(--foco);
    outline-offset: 2px;
    border-radius: 4px;
  }
  /* La pista: lo que suena, del color activo; lo que no, una línea suave. */
  input[type='range']::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, var(--activo) var(--v), var(--linea) var(--v));
  }
  input[type='range']::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, var(--activo) var(--v), var(--linea) var(--v));
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    margin-top: -9px;
    border: 0;
    border-radius: 50%;
    background: var(--activo);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
  }
  input[type='range']::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 50%;
    background: var(--activo);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
  }

  @media (prefers-reduced-motion: reduce) {
    .palanca,
    .palanca::after { transition: none; }
  }
</style>
