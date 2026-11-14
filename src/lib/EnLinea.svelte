<script lang="ts">
  // Partida en línea: primero nombre y sala (crear o unirse); después, la sala de espera y la mesa.
  import { onDestroy } from 'svelte'
  import qrcode from 'qrcode-generator'
  import { MAX_JUGADORES, minimoCartas } from '../../compartido/clasico'
  import { esCodigo } from '../../compartido/protocolo'
  import { Conexion, crearSala, existeSala, nombreGuardado, salaGuardada } from './conexion.svelte'
  import { cartas } from './datos'
  import Mesa from './Mesa.svelte'
  import Opciones from './Opciones.svelte'

  interface Props {
    /** Código que viene en el enlace de invitación. */
    invitacion: string
    onsalir: () => void
  }
  let { invitacion, onsalir }: Props = $props()

  // svelte-ignore state_referenced_locally
  let codigo = $state(invitacion || salaGuardada())
  let nombre = $state(nombreGuardado())
  let error = $state('')
  let cargando = $state(false)
  let conexion = $state.raw<Conexion | null>(null)
  let copiado = $state(false)

  const sala = $derived(conexion?.sala ?? null)
  const anfitrion = $derived(sala?.tu === 0)
  const enlace = $derived(sala ? `${location.origin}/?sala=${sala.codigo}` : '')
  const qr = $derived.by(() => {
    if (!enlace) return ''
    const q = qrcode(0, 'M')
    q.addData(enlace)
    q.make()
    return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
  })
  const mazo = $derived(sala ? cartas.filter((c) => sala.config.ambitos.includes(c.ambito)).length : 0)
  const minimo = $derived(sala ? minimoCartas(sala.jugadores.length, sala.config.opciones.cartasIniciales) : 0)

  onDestroy(() => conexion?.cerrar())

  // Al recargar la página en mitad de una partida se vuelve a entrar sin preguntar.
  // svelte-ignore state_referenced_locally
  if (invitacion && invitacion === salaGuardada() && nombre) entrar(false)

  async function entrar(crear: boolean) {
    error = ''
    const quien = nombre.trim()
    if (!quien) return (error = 'Escribe tu nombre.')
    const c = codigo.trim().toUpperCase()
    if (!crear && !esCodigo(c)) return (error = 'El código son cuatro letras.')
    cargando = true
    try {
      const destino = crear ? await crearSala() : c
      if (!crear && !(await existeSala(destino))) throw new Error('No hay ninguna sala con ese código.')
      conexion = new Conexion(destino, quien)
      history.replaceState(null, '', `/?sala=${destino}`)
    } catch (e) {
      error = e instanceof Error ? e.message : 'No se pudo conectar.'
    }
    cargando = false
  }

  function salir(abandonar: boolean) {
    conexion?.cerrar(abandonar)
    conexion = null
    history.replaceState(null, '', '/')
    onsalir()
  }

  async function compartir() {
    try {
      if (navigator.share) await navigator.share({ title: 'desacrónico', text: `Únete a mi partida de desacrónico: ${sala!.codigo}`, url: enlace })
      else {
        await navigator.clipboard.writeText(enlace)
        copiado = true
        setTimeout(() => (copiado = false), 1800)
      }
    } catch {
      // el usuario cerró el menú de compartir
    }
  }
</script>

{#if !conexion}
  <main>
    <header>
      <button class="boton secundario pequeno" onclick={onsalir}>‹ Volver</button>
      <h2>Partida en línea</h2>
    </header>
    <p class="ayuda">Cada jugador en su móvil. No hace falta registrarse: basta un nombre.</p>

    <label>
      Tu nombre
      <input type="text" maxlength="14" bind:value={nombre} autocomplete="nickname" placeholder="Nombre" />
    </label>

    <div class="opcion">
      <h3>Unirse a una sala</h3>
      <div class="unirse">
        <input
          class="codigo"
          type="text"
          maxlength="4"
          bind:value={codigo}
          placeholder="CÓDIGO"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck="false"
          onkeydown={(e) => e.key === 'Enter' && entrar(false)}
        />
        <button class="boton" disabled={cargando} onclick={() => entrar(false)}>Unirse</button>
      </div>
    </div>

    <div class="opcion">
      <h3>O crear una nueva</h3>
      <button class="boton secundario" disabled={cargando} onclick={() => entrar(true)}>Crear sala</button>
    </div>

    <p class="error" role="alert">{error}</p>
  </main>
{:else if !sala}
  <main class="centro">
    <p class="ayuda">{conexion.estado === 'cerrada' ? conexion.error || 'No se pudo entrar en la sala.' : 'Conectando…'}</p>
    <button class="boton secundario" onclick={() => salir(false)}>Volver</button>
  </main>
{:else if sala.fase === 'sala'}
  <main>
    <header>
      <button class="boton secundario pequeno" onclick={() => salir(true)}>‹ Salir</button>
      <h2>Sala de espera</h2>
    </header>

    <div class="invitacion">
      <div class="qr" aria-hidden="true">{@html qr}</div>
      <div>
        <p class="ayuda">Código de la sala</p>
        <p class="grande">{sala.codigo}</p>
        <button class="boton pequeno" onclick={compartir}>{copiado ? 'Enlace copiado' : 'Invitar'}</button>
      </div>
    </div>

    <h3>Jugadores <small>{sala.jugadores.length} de {MAX_JUGADORES}</small></h3>
    <ul class="lista">
      {#each sala.jugadores as j, i (i)}
        <li class:ausente={!j.conectado}>
          <span>{j.nombre}{i === sala.tu ? ' (tú)' : ''}</span>
          {#if i === 0}<small>anfitrión</small>{/if}
          {#if !j.conectado}<small>desconectado</small>{/if}
          {#if anfitrion && i > 0}
            <button class="quitar" aria-label="Quitar a {j.nombre}" onclick={() => conexion!.enviar({ t: 'quitar', jugador: i })}>×</button>
          {/if}
        </li>
      {/each}
    </ul>
    {#if sala.tu === null}
      <p class="ayuda">La sala está llena: verás la partida sin jugar.</p>
    {/if}

    <Opciones config={sala.config} fija={!anfitrion} oncambio={(config) => conexion!.enviar({ t: 'config', config })} />

    <div class="pie">
      <p class="error" role="alert">{conexion.error || (mazo < minimo ? `Hacen falta al menos ${minimo} cartas en el mazo.` : '')}</p>
      {#if anfitrion}
        <button class="boton" disabled={mazo < minimo} onclick={() => conexion!.enviar({ t: 'empezar' })}>Repartir</button>
      {:else}
        <p class="ayuda centrado">Esperando a que {sala.jugadores[0]?.nombre ?? 'el anfitrión'} empiece la partida…</p>
      {/if}
    </div>
  </main>
{:else}
  {#key sala.partida}
    <Mesa
      control={conexion.control()}
      onsalir={() => salir(false)}
      onotra={anfitrion ? () => conexion!.enviar({ t: 'otra' }) : undefined}
    />
  {/key}
{/if}

{#if conexion && sala && conexion.estado !== 'abierta'}
  <div class="estado" role="status">
    {conexion.estado === 'cerrada' ? conexion.error || 'Conexión cerrada.' : 'Reconectando…'}
    {#if conexion.estado === 'cerrada'}<button class="enlace" onclick={() => salir(false)}>Salir</button>{/if}
  </div>
{/if}

<style>
  main {
    max-width: 560px;
    margin: 0 auto;
    padding: 16px 16px calc(24px + env(safe-area-inset-bottom));
  }
  main.centro {
    min-height: 100dvh;
    display: grid;
    place-content: center;
    gap: 16px;
    text-align: center;
  }
  header {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  h2 {
    margin: 0;
    font-size: 1.6rem;
  }
  h3 {
    margin: 1.4em 0 0.5em;
    font-family: 'Fell SC', serif;
    font-weight: normal;
    font-size: 1.25rem;
    border-bottom: 1px solid rgb(235 233 217 / 0.25);
    padding-bottom: 0.2em;
  }
  small {
    font-style: italic;
    font-size: 0.95rem;
    color: var(--gris-claro);
    margin-left: 0.3em;
  }
  .ayuda {
    margin: 0.8em 0;
    color: var(--gris-claro);
    font-style: italic;
  }
  .centrado { text-align: center; }

  label {
    display: grid;
    gap: 4px;
    margin-top: 1em;
    font-weight: 700;
    font-size: 1.05rem;
  }
  input {
    min-width: 0;
    min-height: 48px;
    padding: 0 12px;
    border: 1px solid rgb(235 233 217 / 0.35);
    border-radius: 6px;
    background: rgb(0 0 0 / 0.25);
    color: var(--papel);
    font: inherit;
    font-size: 1.15rem;
  }
  input::placeholder { color: var(--gris); }
  .opcion {
    display: grid;
  }
  .unirse {
    display: flex;
    gap: 8px;
  }
  .codigo {
    flex: 1;
    text-transform: uppercase;
    letter-spacing: 0.3em;
    text-align: center;
    font-size: 1.4rem;
  }

  .invitacion {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 16px;
    padding: 12px;
    border-radius: 10px;
    background: var(--papel);
    color: var(--tinta);
  }
  .invitacion .ayuda {
    margin: 0;
    color: var(--gris);
  }
  .qr {
    width: 128px;
    flex: none;
  }
  .qr :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
  .grande {
    margin: 0 0 8px;
    font-family: 'Fell SC', serif;
    font-size: 2.8rem;
    line-height: 1;
    letter-spacing: 0.12em;
  }
  .invitacion .boton {
    background: var(--tinta);
    color: var(--papel);
    box-shadow: none;
  }

  .lista {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 6px;
  }
  .lista li {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 6px 0 12px;
    border: 1px solid rgb(235 233 217 / 0.3);
    border-radius: 6px;
    font-size: 1.1rem;
  }
  .lista li.ausente { opacity: 0.55; }
  .lista .quitar {
    margin-left: auto;
    width: 40px;
    height: 40px;
    border: 0;
    background: none;
    font-size: 1.4rem;
    cursor: pointer;
  }

  .pie {
    margin-top: 1.5em;
    display: grid;
    gap: 6px;
  }
  .error {
    min-height: 1.3em;
    margin: 0.6em 0 0;
    color: #f0a3a3;
    text-align: center;
  }

  .estado {
    position: fixed;
    left: 50%;
    bottom: calc(12px + env(safe-area-inset-bottom));
    translate: -50%;
    z-index: 50;
    padding: 8px 16px;
    border-radius: 999px;
    background: var(--fallo);
    color: #fff;
    white-space: nowrap;
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.5);
  }
  .enlace {
    border: 0;
    background: none;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
