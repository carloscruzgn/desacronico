<script lang="ts">
  // El botón de sonido de la barra: un altavoz (tachado si todo está apagado) que abre un menú pequeño con
  // los dos interruptores, efectos y voz. Es el mismo ajuste que hay en Opciones.
  import AjustesSonido from './AjustesSonido.svelte'
  import Icono from './Icono.svelte'
  import { callar, sonido } from './sonido'

  interface Props {
    /** Sobre papel en lugar de sobre el tapete. */
    sobrePapel?: boolean
  }
  let { sobrePapel = false }: Props = $props()

  let abierto = $state(false)
  /** Dónde empieza el menú respecto del botón: debajo de él y sin salirse de la pantalla por ningún lado. */
  let izquierda = $state(0)
  function abrir() {
    const r = boton!.getBoundingClientRect()
    const ancho = Math.min(320, innerWidth - 32)
    izquierda = Math.max(16, Math.min(r.right - ancho, innerWidth - 16 - ancho)) - r.left
    abierto = true
  }
  let caja: HTMLElement | undefined = $state()
  let boton: HTMLButtonElement | undefined = $state()
  const id = `sonido-${Math.random().toString(36).slice(2, 8)}`

  const estado = $derived(
    sonido.efectos && sonido.voz ? 'efectos y voz' : sonido.efectos ? 'solo efectos' : sonido.voz ? 'solo voz' : 'apagado',
  )
  const algo = $derived(sonido.efectos || sonido.voz)

  function cerrar(devolverFoco = true) {
    if (!abierto) return
    abierto = false
    if (devolverFoco) boton?.focus()
  }

  // Con el menú abierto, un toque fuera lo cierra.
  $effect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => !caja?.contains(e.target as Node) && cerrar(false)
    addEventListener('pointerdown', fuera, true)
    return () => removeEventListener('pointerdown', fuera, true)
  })
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="sonido"
  bind:this={caja}
  onkeydown={(e) => {
    // Escape cierra solo el menú, no la ventana o la mesa de detrás.
    if (e.key === 'Escape' && abierto) {
      e.preventDefault()
      e.stopPropagation()
      cerrar()
    }
  }}
  onfocusout={(e) => abierto && !caja?.contains(e.relatedTarget as Node | null) && e.relatedTarget && cerrar(false)}
>
  <button
    bind:this={boton}
    class="icono"
    class:sobrePapel
    class:apagado={!algo}
    aria-label="Sonido: {estado}"
    title="Sonido: {estado}"
    aria-expanded={abierto}
    aria-controls={id}
    onclick={() => (abierto ? cerrar(false) : abrir())}
  >
    <!-- El altavoz propio, en color como el libro del reglamento: dos ondas con efectos y voz, una con uno solo,
         un aspa con todo apagado. -->
    <Icono nombre={sonido.efectos && sonido.voz ? 'sonido' : algo ? 'sonidoUno' : 'sonidoApagado'} lado={34} />
  </button>

  {#if abierto}
    <div class="menu" style:left="{izquierda}px" {id} role="group" aria-label="Sonido">
      <p class="titulo">Sonido</p>
      <AjustesSonido sobrePapel />
      {#if sonido.hablando}
        <button class="callar" onclick={callar}>Callar la voz</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .sonido {
    position: relative;
    flex: none;
  }
  .icono {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    padding: 0;
    /* Como los demás botones de navegación (BotonIcono): de papel sobre el tapete, de tinta sobre papel. */
    border: 0;
    border-radius: 50%;
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
  /* La caja y la bocina pesan más que las ondas: el altavoz, un poco a la derecha, para que se vea centrado. */
  .icono :global(.icono-juego) { translate: 2.5px 0; }
  .icono:hover { filter: brightness(1.06); }
  .icono:active { transform: scale(0.92); }
  .icono.sobrePapel {
    background: var(--tinta);
    color: var(--papel);
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.25);
  }
  .icono.sobrePapel:hover { filter: brightness(1.25); }

  .menu {
    --foco: var(--tinta);
    position: absolute;
    z-index: 30;
    top: calc(100% + 8px);
    width: min(320px, calc(100vw - 32px));
    display: grid;
    gap: 8px;
    padding: 12px;
    border-radius: var(--radio-hoja, 14px);
    background-color: var(--papel-2, var(--papel));
    background-image: var(--grano-papel, none);
    color: var(--tinta);
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.45);
    text-align: left;
  }
  .titulo {
    margin: 0 2px;
    font: 700 1.1rem/1.2 var(--ui);
  }
  .titulo small {
    font: italic 0.9rem var(--ui);
    color: #55544c;
    margin-left: 0.3em;
  }
  .callar {
    justify-self: start;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid rgb(29 29 27 / 0.45);
    border-radius: var(--radio-ficha, 8px);
    background: none;
    color: var(--tinta);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .callar:hover { background: rgb(29 29 27 / 0.08); }
  @media (prefers-reduced-motion: reduce) {
    .icono { transition: none; }
  }
</style>
