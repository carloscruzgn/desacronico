<script lang="ts">
  // Partida en línea: primero nombre y sala (crear o unirse); después, la sala de espera y la mesa.
  import { onDestroy, tick } from 'svelte'
  import qrcode from 'qrcode-generator'
  import { fade, scale } from 'svelte/transition'
  import { avatarLibre } from '../../compartido/avatares'
  import { MAX_JUGADORES, minimoCartas } from '../../compartido/clasico'
  import { esCodigo } from '../../compartido/protocolo'
  import { avatarGuardado, Conexion, crearSala, existeSala, guardarAvatar, nombreGuardado, olvidarSala, salaGuardada } from './conexion.svelte'
  import Avatares from './Avatares.svelte'
  import { dialogo } from './dialogo'
  import Moneda from './Moneda.svelte'
  import { dura } from './movimiento'
  import BotonIcono from './BotonIcono.svelte'
  import Confirmar from './Confirmar.svelte'
  import { cartas } from './datos'
  import Mesa from './Mesa.svelte'
  import Opciones from './Opciones.svelte'

  interface Props {
    /** Código que viene en el enlace de invitación. */
    invitacion: string
    /** Entrar sin pasar por el formulario en la sala que se dejó abierta. */
    directo?: boolean
    onsalir: () => void
  }
  let { invitacion, directo = false, onsalir }: Props = $props()

  // svelte-ignore state_referenced_locally
  let codigo = $state(invitacion || salaGuardada())
  let nombre = $state(nombreGuardado())
  let error = $state('')
  let cargando = $state(false)
  let conexion = $state.raw<Conexion | null>(null)
  let copiado = $state(false)
  let enlaceALaVista = $state(false)
  let avatar = $state(avatarGuardado() || avatarLibre([]))
  let eligiendo = $state(false)
  let qrGrande = $state(false)
  let quitando = $state<number | null>(null)

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

  // Al pasar del formulario a la sala y de la sala a la mesa, el foco va al título de la pantalla nueva.
  // Solo cuando cambia la pantalla: los mensajes del servidor (una opción, una jugada) no deben mover el foco.
  const etapa = $derived(!conexion ? 'formulario' : !sala ? 'conectando' : sala.fase === 'sala' ? 'sala' : `mesa-${sala.partida}`)
  let primera = true
  $effect(() => {
    void etapa
    if (primera) return void (primera = false)
    tick().then(() => document.querySelector<HTMLElement>('[data-titulo]')?.focus({ preventScroll: true }))
  })

  // Al recargar la página en mitad de una partida se vuelve a entrar sin preguntar.
  // svelte-ignore state_referenced_locally
  if (nombre && esCodigo(codigo) && (directo || (invitacion && invitacion === salaGuardada()))) entrar(false)

  async function entrar(crear: boolean) {
    error = ''
    const quien = nombre.trim()
    if (!quien) return (error = 'Escribe tu nombre.')
    const c = codigo.trim().toUpperCase()
    if (!crear && !esCodigo(c))
      return (error = c.length === 4 ? 'Ese código no vale. Revísalo: son cuatro letras, sin vocales.' : 'El código son cuatro letras.')
    cargando = true
    try {
      const destino = crear ? await crearSala() : c
      if (!crear && !(await existeSala(destino))) {
        if (destino === salaGuardada()) olvidarSala()
        throw new Error('No hay ninguna sala con ese código. Puede que haya caducado.')
      }
      guardarAvatar(avatar)
      conexion = new Conexion(destino, quien, avatar)
      history.replaceState(history.state, '', `/?sala=${destino}`)
    } catch (e) {
      error = e instanceof Error ? e.message : 'No se pudo conectar.'
    }
    cargando = false
  }

  function salir(abandonar: boolean) {
    conexion?.cerrar(abandonar)
    conexion = null
    history.replaceState(history.state, '', '/')
    onsalir()
  }

  /** Vuelve a pedir sitio en la misma sala: tras abrirla en otra pestaña o si el anfitrión te quitó. */
  function reentrar() {
    if (!conexion) return
    const anterior = conexion
    anterior.cerrar()
    conexion = new Conexion(anterior.codigo, anterior.nombre, avatar)
  }

  function cambiarAvatar(a: string) {
    avatar = a
    guardarAvatar(a)
    eligiendo = false
    conexion?.enviar({ t: 'avatar', avatar: a })
  }

  async function compartir() {
    try {
      if (navigator.share) await navigator.share({ title: 'desacrónico', text: `Únete a mi partida de desacrónico: ${sala!.codigo}`, url: enlace })
      else {
        await navigator.clipboard.writeText(enlace)
        copiado = true
        setTimeout(() => (copiado = false), 1800)
      }
    } catch (e) {
      // Si el usuario cerró el menú de compartir no pasa nada; si no se pudo copiar, se enseña el enlace.
      if (!(e instanceof DOMException && e.name === 'AbortError')) enlaceALaVista = true
    }
  }
</script>

{#if !conexion}
  <main>
    <header>
      <BotonIcono icono="atras" etiqueta="Volver al menú" onclick={onsalir} />
      <h1 tabindex="-1" data-titulo>Partida en línea</h1>
    </header>
    {#if invitacion}
      <p class="ayuda">Te han invitado a la sala <b class="sala">{invitacion}</b>. Escribe tu nombre para entrar.</p>
    {:else}
      <p class="ayuda">Cada jugador en su móvil. No hace falta registrarse: basta un nombre.</p>
    {/if}

    <form
      onsubmit={(e) => {
        e.preventDefault()
        entrar(false)
      }}
    >
      <div class="quien">
        <button type="button" class="moneda" aria-label="Cambiar tu avatar" onclick={() => (eligiendo = true)}>
          <Moneda {avatar} />
          <small>cambiar</small>
        </button>
        <label>
          Tu nombre
          <!-- svelte-ignore a11y_autofocus -->
          <input type="text" maxlength="14" bind:value={nombre} autocomplete="nickname" placeholder="Nombre" enterkeyhint="go" autofocus={!!invitacion && !nombre} />
        </label>
      </div>

      <div class="opcion">
        <h2 id="unirse-titulo">{invitacion ? 'Sala' : 'Unirse a una sala'}</h2>
        <div class="unirse">
          <input
            class="codigo"
            type="text"
            size="4"
            maxlength="4"
            bind:value={codigo}
            placeholder="CÓDIGO"
            aria-labelledby="unirse-titulo"
            aria-describedby="unirse-ayuda"
            autocapitalize="characters"
            autocomplete="off"
            spellcheck="false"
            enterkeyhint="go"
          />
          <button class="boton" disabled={cargando}>{invitacion ? 'Entrar' : 'Unirse'}</button>
        </div>
        {#if !invitacion}<p class="ayuda menor" id="unirse-ayuda">Las cuatro letras que te dé quien creó la sala.</p>{/if}
      </div>
      <p class="error" role="alert">{error}</p>
    </form>

    <div class="opcion">
      <h2>{invitacion ? '¿Prefieres crear otra sala?' : 'O crear una nueva'}</h2>
      <button class="boton secundario" disabled={cargando} onclick={() => entrar(true)}>Crear sala</button>
    </div>
  </main>
{:else if !sala}
  <main class="centro">
    <p class="ayuda" tabindex="-1" data-titulo>{conexion.estado === 'cerrada' ? conexion.error || 'No se pudo entrar en la sala.' : 'Conectando…'}</p>
    <button class="boton secundario" onclick={() => salir(false)}>Volver</button>
  </main>
{:else if sala.fase === 'sala'}
  <main>
    <header>
      <BotonIcono icono="atras" etiqueta="Salir de la sala" onclick={() => salir(true)} />
      <h1 tabindex="-1" data-titulo>Sala de espera</h1>
    </header>

    <div class="invitacion">
      <button class="qr" aria-label="Ampliar el código QR de la sala" onclick={() => (qrGrande = true)}>{@html qr}</button>
      <div>
        <p class="ayuda">Código de la sala</p>
        <p class="grande">{sala.codigo}</p>
        <button class="boton pequeno" onclick={compartir}>{copiado ? 'Enlace copiado' : 'Invitar'}</button>
      </div>
    </div>
    {#if enlaceALaVista}<p class="ayuda enlace-texto">Copia este enlace y envíalo: <b>{enlace}</b></p>{/if}

    <h2>Jugadores <small>{sala.jugadores.length} de {MAX_JUGADORES}</small></h2>
    <ul class="lista">
      {#each sala.jugadores as j, i (i)}
        <li class:ausente={!j.conectado}>
          {#if i === sala.tu}
            <button class="moneda" aria-label="Cambiar tu avatar" onclick={() => (eligiendo = true)}><Moneda avatar={j.avatar} nombre={j.nombre} /></button>
          {:else}
            <Moneda avatar={j.avatar} nombre={j.nombre} />
          {/if}
          <span>{j.nombre}{i === sala.tu ? ' (tú)' : ''}</span>
          {#if i === 0}<small>anfitrión</small>{/if}
          {#if !j.conectado}<small>desconectado</small>{/if}
          {#if anfitrion && i > 0}
            <button class="quitar" aria-label="Quitar a {j.nombre}" onclick={() => (quitando = i)}>×</button>
          {/if}
        </li>
      {/each}
    </ul>
    {#if sala.tu === null}
      {#if sala.jugadores.length >= MAX_JUGADORES}
        <p class="ayuda">La sala está llena: verás la partida sin jugar.</p>
      {:else}
        <p class="ayuda">
          No estás en la lista de jugadores: puede que el anfitrión te haya quitado.
          <button class="boton pequeno secundario" onclick={reentrar}>Volver a entrar</button>
        </p>
      {/if}
    {/if}

    <Opciones config={sala.config} fija={!anfitrion} oncambio={(config) => conexion!.enviar({ t: 'config', config })} />

    <div class="pie-fijo">
      <p class="error" role="alert">{conexion.error || (mazo < minimo ? `Hacen falta al menos ${minimo} cartas en el mazo.` : '')}</p>
      {#if anfitrion}
        {#if sala.jugadores.length === 1}<p class="ayuda centrado">Aún no ha entrado nadie más. Quien llegue después de repartir solo podrá mirar.</p>{/if}
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
    <span>{conexion.estado === 'cerrada' ? conexion.error || 'Conexión cerrada.' : 'Sin conexión. Reconectando…'}</span>
    {#if conexion.estado === 'cerrada'}
      <button class="enlace" onclick={reentrar}>{conexion.error.includes('otra pestaña') ? 'Seguir aquí' : 'Reintentar'}</button>
    {/if}
    <button class="enlace" onclick={() => salir(false)}>Salir</button>
  </div>
{/if}

{#if quitando !== null && sala?.jugadores[quitando]}
  <Confirmar
    titulo="¿Quitar a {sala.jugadores[quitando].nombre} de la sala?"
    texto="Podrá volver a entrar con el código."
    si="Quitar"
    onsi={() => (conexion!.enviar({ t: 'quitar', jugador: quitando! }), (quitando = null))}
    onno={() => (quitando = null)}
  />
{/if}

{#if eligiendo}
  <Avatares
    actual={sala && sala.tu !== null ? sala.jugadores[sala.tu].avatar : avatar}
    ocupados={sala ? sala.jugadores.filter((_, i) => i !== sala.tu).map((j) => j.avatar) : []}
    onelegir={cambiarAvatar}
    oncerrar={() => (eligiendo = false)}
  />
{/if}

{#if qrGrande && sala}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="qr-grande" role="dialog" tabindex="-1" aria-modal="true" aria-label="Código QR de la sala {sala.codigo}" use:dialogo transition:fade={{ duration: dura(160) }} onclick={() => (qrGrande = false)}>
    <div class="tarjeta" in:scale={{ duration: dura(260), start: 0.8 }}>
      <div class="qr" aria-hidden="true">{@html qr}</div>
      <p class="grande">{sala.codigo}</p>
    </div>
    <button class="cerrar">Toca para cerrar</button>
  </div>
{/if}

<style>
  main {
    max-width: 560px;
    margin: 0 auto;
    padding: 16px 16px 0;
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
  h1 {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.1;
  }
  h2 {
    margin: 1.4em 0 0.5em;
    font-size: 1.25rem;
    border-bottom: 1px solid rgb(235 233 217 / 0.25);
    padding-bottom: 0.2em;
  }
  small {
    font-family: var(--ui);
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
  .ayuda.centrado { margin: 0; }
  .ayuda.menor {
    margin: 0.4em 0 0;
    font-size: 0.95rem;
  }
  .sala {
    font-family: var(--fell-sc);
    font-style: normal;
    font-weight: normal;
    font-size: 1.2em;
    letter-spacing: 0.08em;
    color: var(--papel);
  }
  .enlace-texto b {
    font-style: normal;
    color: var(--papel);
    user-select: all;
    overflow-wrap: anywhere;
  }
  .ayuda .boton {
    display: flex;
    margin-top: 8px;
    font-style: normal;
  }

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
    font-weight: 400;
    font-size: 1.15rem;
  }
  input::placeholder { color: #a3a297; }
  .opcion {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
  .unirse {
    display: flex;
    gap: 8px;
  }
  .codigo {
    flex: 1 1 0;
    width: 0;
    text-transform: uppercase;
    letter-spacing: 0.3em;
    text-align: center;
    font-size: 1.4rem;
  }

  .invitacion {
    --foco: var(--tinta);
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
    color: #55544c;
  }
  .qr {
    width: 128px;
    flex: none;
    padding: 0;
    border: 0;
    background: none;
    color: var(--tinta);
    cursor: zoom-in;
  }
  /* El QR va en tinta sobre el propio papel, sin recuadro blanco */
  .qr :global(rect) { fill: none; }
  .qr :global(path) { fill: currentColor; }
  .qr-grande {
    position: fixed;
    inset: 0;
    z-index: 45;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 14px;
    background: rgb(0 0 0 / 0.9);
    cursor: zoom-out;
  }
  .tarjeta {
    padding: 16px 16px 12px;
    border-radius: 12px;
    background: var(--papel);
    color: var(--tinta);
    text-align: center;
  }
  .tarjeta .qr {
    width: min(78vw, 56dvh, 460px);
    cursor: zoom-out;
  }
  .tarjeta .grande {
    margin: 8px 0 0;
    font-size: 3.4rem;
  }
  .cerrar {
    min-height: 44px;
    padding: 0 16px;
    border: 0;
    background: none;
    color: var(--papel);
    font-style: italic;
    cursor: zoom-out;
  }
  .quien {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    margin-top: 1em;
  }
  .quien label {
    flex: 1;
    margin-top: 0;
  }
  .moneda {
    flex: none;
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: none;
    cursor: pointer;
  }
  .quien .moneda { --lado: 56px; }
  .moneda small {
    margin: 0;
    font-size: 0.8rem;
  }
  .lista { --lado: 34px; }
  .lista li { padding-left: 8px !important; gap: 10px !important; }
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
    width: 44px;
    height: 44px;
    border: 0;
    background: none;
    font-size: 1.4rem;
    cursor: pointer;
  }

  .error {
    margin: 0.6em 0 0;
    color: #f0a3a3;
    text-align: center;
  }

  .estado {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom));
    width: fit-content;
    margin-inline: auto;
    z-index: 50;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0 4px;
    padding: 2px 8px 2px 16px;
    border-radius: 24px;
    background: var(--fallo);
    color: #fff;
    --foco: #fff;
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.5);
  }
  .enlace {
    min-height: 44px;
    padding: 0 8px;
    font-weight: 700;
    white-space: nowrap;
    border: 0;
    background: none;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
