<script lang="ts">
  // Partida en línea: primero nombre y sala (crear o unirse); después, la sala de espera y la mesa.
  import { onDestroy, onMount, tick } from 'svelte'
  import qrcode from 'qrcode-generator'
  import { fade, fly, scale } from 'svelte/transition'
  import { avatarLibre } from '../../compartido/avatares'
  import { MAX_JUGADORES, minimoCartas } from '../../compartido/clasico'
  import { esCodigo, type JugadorSala } from '../../compartido/protocolo'
  import { avatarGuardado, Conexion, crearSala, esAnfitrion, existeSala, guardarAvatar, nombreGuardado, olvidarSala, salaGuardada } from './conexion.svelte'
  import { Toca } from './aparato'
  import Avatares from './Avatares.svelte'
  import { abrirCapa, capa, cerrarCapa, guardiaAtras, type Capa } from './capas'
  import Moneda from './Moneda.svelte'
  import { dura } from './movimiento'
  import BotonIcono from './BotonIcono.svelte'
  import Confirmar from './Confirmar.svelte'
  import { cartas, enLista } from './datos'
  import Marca from './Marca.svelte'
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
  /** Errores junto a su campo (A11Y-14) y el error general (la red, el servidor). */
  let errorNombre = $state('')
  let errorCodigo = $state('')
  let error = $state('')
  let cargando = $state(false)
  let conexion = $state.raw<Conexion | null>(null)
  let copiado = $state(false)
  let enlaceALaVista = $state(false)
  let avatar = $state(avatarGuardado() || avatarLibre([]))
  let eligiendo = $state(false)
  let qrGrande = $state(false)
  let quitando = $state<number | null>(null)
  /** Repartir con jugadores desconectados: se pregunta si se les quita (en la sala o en «Otra partida»). */
  let repartiendo = $state<'empezar' | 'repetir' | null>(null)
  /** El anfitrión quiere salir de la sala con gente dentro. */
  let saliendo = $state(false)
  let campoNombre = $state<HTMLInputElement>()
  let campoCodigo = $state<HTMLInputElement>()
  let codigoEnfocado = $state(false)
  /** Con el código ya escrito (o en una invitación), Intro en el nombre entra; si no, pasa al código. */
  const codigoListo = $derived(esCodigo(codigo.trim().toUpperCase()))

  const sala = $derived(conexion?.sala ?? null)
  const anfitrion = $derived(esAnfitrion(sala))
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
  const ausentes = $derived(sala ? sala.jugadores.filter((j) => !j.conectado) : [])
  /** Quién repartirá si el anfitrión se va: el siguiente conectado. */
  const sucesor = $derived(sala ? sala.jugadores.find((j, i) => i !== sala.tu && j.conectado) : undefined)

  onDestroy(() => conexion?.cerrar())

  // «Atrás» en la sala libera el asiento, como la flecha; si el anfitrión deja gente dentro, antes se le pregunta.
  // En la mesa, «atrás» lleva al menú y el asiento se guarda (la mesa puede quedarse con él para abrir su menú).
  onMount(() =>
    guardiaAtras(() => {
      if (!conexion || sala?.fase !== 'sala') return false
      if (anfitrion && sucesor) {
        // Después de que App vuelva a apuntar el paso de la sala, para que la pregunta quede encima.
        queueMicrotask(pedirSalida)
        return true
      }
      conexion.cerrar(true)
      conexion = null
      return false
    }),
  )

  // Al pasar del formulario a la sala y de la sala a la mesa, el foco va al título de la pantalla nueva.
  // Solo cuando cambia la pantalla: los mensajes del servidor (una opción, una jugada) no deben mover el foco.
  const etapa = $derived(!conexion ? 'formulario' : !sala ? 'conectando' : sala.fase === 'sala' ? 'sala' : `mesa-${sala.partida}`)
  let primera = true
  $effect(() => {
    void etapa
    if (primera) return void (primera = false)
    tick().then(() => document.querySelector<HTMLElement>('[data-titulo]')?.focus({ preventScroll: true }))
  })

  // Lo que pasa en la sala se cuenta en una región en vivo: quién entra, quién sale, quién se desconecta.
  // Y a quien pasa a ser anfitrión porque el anterior se fue, se le avisa: «Ahora repartes tú».
  let anuncio = $state('')
  let aviso = $state('')
  let relojAviso: ReturnType<typeof setTimeout> | undefined
  let antes: { jugadores: JugadorSala[]; anfitrion: boolean; fase: string } | null = null
  $effect(() => {
    if (!sala) return void (antes = null)
    const ahora = { jugadores: sala.jugadores, anfitrion, fase: sala.fase }
    if (antes && antes.fase === 'sala' && ahora.fase === 'sala') {
      const partes = cambios(antes.jugadores, ahora.jugadores)
      if (partes.length) anuncio = partes.join('. ')
    }
    if (antes && !antes.anfitrion && ahora.anfitrion && sala.tu !== null) {
      aviso = ahora.fase === 'sala' ? 'Ahora repartes tú' : 'Ahora haces tú de anfitrión'
      anuncio = `${aviso}: ${ahora.fase === 'sala' ? 'puedes cambiar los ajustes y repartir' : 'puedes quitar a quien no vuelva y repartir otra partida'}.`
      clearTimeout(relojAviso)
      relojAviso = setTimeout(() => (aviso = ''), 5000)
    }
    antes = ahora
  })
  onDestroy(() => clearTimeout(relojAviso))

  const clave = (j: JugadorSala) => `${j.nombre}|${j.avatar}`
  function cambios(a: JugadorSala[], b: JugadorSala[]): string[] {
    const partes: string[] = []
    const enA = new Map(a.map((j) => [clave(j), j]))
    const enB = new Map(b.map((j) => [clave(j), j]))
    for (const [k, j] of enB) {
      const previo = enA.get(k)
      if (!previo) partes.push(`Ha entrado ${j.nombre} (${b.length} de ${MAX_JUGADORES})`)
      else if (previo.conectado && !j.conectado) partes.push(`${j.nombre} se ha desconectado`)
      else if (!previo.conectado && j.conectado) partes.push(`${j.nombre} ha vuelto`)
    }
    for (const [k, j] of enA) if (!enB.has(k)) partes.push(`Ha salido ${j.nombre} (quedan ${b.length})`)
    return partes
  }

  // Al recargar la página en mitad de una partida se vuelve a entrar sin preguntar.
  // svelte-ignore state_referenced_locally
  if (nombre && esCodigo(codigo) && (directo || (invitacion && invitacion === salaGuardada()))) entrar(false)

  async function entrar(crear: boolean) {
    errorNombre = errorCodigo = error = ''
    const quien = nombre.trim()
    if (!quien) {
      errorNombre = 'Escribe tu nombre para que los demás sepan quién eres.'
      campoNombre?.focus()
      return
    }
    const c = codigo.trim().toUpperCase()
    if (!crear && !esCodigo(c)) {
      errorCodigo = c.length === 4 ? 'Ese código no vale. Revísalo: son cuatro letras, sin vocales.' : 'El código son cuatro letras.'
      campoCodigo?.focus()
      return
    }
    cargando = true
    try {
      const destino = crear ? await crearSala() : c
      if (!crear && !(await existeSala(destino))) {
        if (destino === salaGuardada()) olvidarSala()
        errorCodigo = 'No hay ninguna sala con ese código. Puede que haya caducado.'
        campoCodigo?.focus()
        cargando = false
        return
      }
      guardarAvatar(avatar)
      conexion = new Conexion(destino, quien, avatar)
      history.replaceState(history.state, '', `/?sala=${destino}`)
    } catch (e) {
      error = e instanceof Error ? e.message : 'No se pudo conectar.'
    }
    cargando = false
  }

  /** El código se escribe en un solo campo: solo letras, en mayúsculas y cuatro como mucho. */
  function escribirCodigo(e: Event) {
    const campo = e.currentTarget as HTMLInputElement
    codigo = campo.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
    campo.value = codigo
    errorCodigo = ''
  }

  function salir(abandonar: boolean) {
    conexion?.cerrar(abandonar)
    conexion = null
    history.replaceState(history.state, '', '/')
    onsalir()
  }

  // Las confirmaciones (Confirmar) traen su propio diálogo y su Escape: aquí se les da su paso en el historial.
  let capaSalida: Capa | null = null
  function pedirSalida() {
    saliendo = true
    capaSalida = abrirCapa(() => (saliendo = false))
  }
  /** La flecha de la sala: si el anfitrión deja gente dentro, se le pregunta antes. */
  function flechaSala() {
    if (anfitrion && sucesor) pedirSalida()
    else salir(true)
  }
  let capaQuitar: Capa | null = null
  function pedirQuitar(i: number) {
    quitando = i
    capaQuitar = abrirCapa(() => (quitando = null))
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

  /** Repartir (en la sala) u otra partida (desde la mesa). Con alguien desconectado, antes se pregunta. */
  function repartir(que: 'empezar' | 'repetir') {
    if (ausentes.length) repartiendo = que
    else conexion?.enviar({ t: que })
  }
  function repartirYa(sinAusentes: boolean) {
    const que = repartiendo
    cerrarCapa()
    if (que) conexion?.enviar({ t: que, sinAusentes })
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

  const letras = $derived([0, 1, 2, 3].map((k) => codigo.trim().toUpperCase()[k] ?? ''))
</script>

{#if !conexion}
  <main class="formulario">
    <header>
      <BotonIcono icono="atras" etiqueta="Volver al menú" onclick={onsalir} />
      <h1 tabindex="-1" data-titulo>Partida en línea</h1>
    </header>
    {#if invitacion}
      <p class="ayuda">Te han invitado a la sala <b class="sala-codigo">{invitacion}</b>. Escribe tu nombre para entrar.</p>
    {:else}
      <p class="ayuda">Cada jugador en su móvil. No hace falta registrarse: basta un nombre.</p>
    {/if}

    <form
      novalidate
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
        <div class="campo">
          <label for="campo-nombre">Tu nombre</label>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            id="campo-nombre"
            bind:this={campoNombre}
            type="text"
            maxlength="14"
            bind:value={nombre}
            oninput={() => (errorNombre = '')}
            autocomplete="nickname"
            placeholder="Nombre"
            enterkeyhint={codigoListo ? 'go' : 'next'}
            autofocus={!!invitacion && !nombre}
            aria-invalid={errorNombre ? 'true' : undefined}
            aria-describedby={errorNombre ? 'nombre-error' : undefined}
            onkeydown={(e) => {
              if (e.key === 'Enter' && !codigoListo) {
                e.preventDefault()
                campoCodigo?.focus()
              }
            }}
          />
        </div>
      </div>
      <p class="error campo-error" id="nombre-error" role="alert">{errorNombre}</p>

      {#if invitacion}
        <!-- Con invitación, el código ya se sabe: un solo botón ancho para entrar. -->
        <button class="boton ancho" disabled={cargando}>Entrar en la sala <span class="codigo-boton">{invitacion}</span></button>
        <p class="error campo-error" role="alert">{errorCodigo}</p>
      {:else}
        <div class="opcion">
          <h2 id="unirse-titulo">Unirse a una sala</h2>
          <label class="sr-only" for="campo-codigo">Código de la sala, cuatro letras</label>
          <!-- Un solo campo, pintado como cuatro fichas de papel (UI-20). -->
          <div class="fichas" class:enfocado={codigoEnfocado} class:invalido={!!errorCodigo}>
            <input
              id="campo-codigo"
              class="codigo"
              bind:this={campoCodigo}
              type="text"
              maxlength="4"
              value={codigo}
              oninput={escribirCodigo}
              onfocus={() => (codigoEnfocado = true)}
              onblur={() => (codigoEnfocado = false)}
              aria-describedby={errorCodigo ? 'codigo-error unirse-ayuda' : 'unirse-ayuda'}
              aria-invalid={errorCodigo ? 'true' : undefined}
              autocapitalize="characters"
              autocomplete="off"
              spellcheck="false"
              enterkeyhint="go"
            />
            {#each letras as l, k (k)}
              <span class="ficha" class:actual={codigoEnfocado && k === Math.min(codigo.length, 3)} aria-hidden="true">{l}</span>
            {/each}
          </div>
          <p class="error campo-error" id="codigo-error" role="alert">{errorCodigo}</p>
          <p class="ayuda menor" id="unirse-ayuda">Las cuatro letras que te dé quien creó la sala.</p>
          <button class="boton ancho" disabled={cargando}>Unirse a la sala</button>
        </div>
      {/if}
      <p class="error" role="alert">{error}</p>
    </form>

    {#if invitacion}
      <p class="otra-sala"><button class="enlace" disabled={cargando} onclick={() => entrar(true)}>O crear una sala nueva</button></p>
    {:else}
      <div class="opcion">
        <h2>O crear una nueva</h2>
        <button class="boton secundario" disabled={cargando} onclick={() => entrar(true)}>Crear sala</button>
      </div>
    {/if}
  </main>
{:else if !sala}
  <main class="centro">
    <p class="ayuda" tabindex="-1" data-titulo>{conexion.estado === 'cerrada' ? conexion.error || 'No se pudo entrar en la sala.' : 'Conectando…'}</p>
    <button class="boton secundario" onclick={() => salir(false)}>Volver</button>
  </main>
{:else if sala.fase === 'sala'}
  <main class="sala">
    <header>
      <BotonIcono icono="atras" etiqueta="Salir de la sala" onclick={flechaSala} />
      <h1 tabindex="-1" data-titulo>Sala de espera</h1>
    </header>
    <p class="sr-only" role="status">{anuncio}</p>

    <div class="columnas">
      <div>
        <!-- La invitación, con forma de reverso de carta: la marca, el QR de ilustración, la pestaña del CEPA
             y una banda en tinta con el código. -->
        <div class="invitacion">
          <div class="naipe">
            <div class="marca-naipe" aria-hidden="true"><Marca /></div>
            <div class="ilustracion">
              <button class="qr" aria-label="Ampliar el código QR de la sala" onclick={() => (qrGrande = true)}>{@html qr}</button>
              <div class="pestana" aria-hidden="true"><img src="/img/cepa.svg" alt="" /></div>
            </div>
            <p class="banda"><span class="sr-only">Código de la sala: </span>{sala.codigo}</p>
          </div>
          <div class="invitar">
            <p class="ayuda">Para entrar, los demás escanean el QR o escriben estas cuatro letras en <b>Jugar en línea</b>.</p>
            <button class="boton" onclick={compartir}>{copiado ? 'Enlace copiado' : 'Invitar'}</button>
            <p class="ayuda menor">{Toca()} el QR para verlo en grande.</p>
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
              <span class="nombre">{j.nombre}{i === sala.tu ? ' (tú)' : ''}</span>
              {#if i === sala.anfitrion}<small>reparte</small>{/if}
              {#if !j.conectado}<small>desconectado</small>{/if}
              {#if anfitrion && i !== sala.tu}
                <button class="quitar" aria-label="Quitar a {j.nombre}" onclick={() => pedirQuitar(i)}>×</button>
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
      </div>

      <div>
        <Opciones config={sala.config} fija={!anfitrion} oncambio={(config) => conexion!.enviar({ t: 'config', config })} />
      </div>
    </div>

    <div class="pie-fijo">
      <p class="error" role="alert">{conexion.error || (mazo < minimo ? `Hacen falta al menos ${minimo} cartas en el mazo.` : '')}</p>
      {#if anfitrion}
        {#if sala.jugadores.length === 1}<p class="ayuda centrado">Aún no ha entrado nadie más. Quien llegue después de repartir solo podrá mirar.</p>{/if}
        <button class="boton" disabled={mazo < minimo} onclick={() => repartir('empezar')}>Repartir</button>
      {:else}
        <p class="ayuda centrado">Esperando a que {sala.jugadores[sala.anfitrion]?.nombre ?? 'el anfitrión'} reparta…</p>
      {/if}
    </div>
  </main>
{:else}
  {#key sala.partida}
    <Mesa
      control={conexion.control()}
      onsalir={() => salir(false)}
      onotra={anfitrion ? () => repartir('repetir') : undefined}
      oncambiar={anfitrion ? () => conexion!.enviar({ t: 'otra' }) : undefined}
    />
  {/key}
{/if}

{#if aviso}
  <div class="aviso" role="status" transition:fly={{ y: -16, duration: dura(220) }}>
    <b>{aviso}</b>
    <span>{sala?.fase === 'sala' ? 'Puedes cambiar los ajustes y repartir.' : 'Puedes quitar a quien no vuelva y repartir otra partida.'}</span>
  </div>
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
    onsi={() => (conexion!.enviar({ t: 'quitar', jugador: quitando! }), capaQuitar?.cerrar())}
    onno={() => capaQuitar?.cerrar()}
  />
{/if}

{#if saliendo}
  <Confirmar
    titulo="¿Salir de la sala?"
    texto="{sucesor?.nombre ?? 'Otro jugador'} pasará a repartir. Podrás volver a entrar con el código."
    si="Salir"
    onsi={() => (capaSalida?.cerrar(), salir(true))}
    onno={() => capaSalida?.cerrar()}
  />
{/if}

{#if repartiendo}
  <div class="velo" transition:fade={{ duration: dura(160) }} onclick={(e) => e.target === e.currentTarget && cerrarCapa()} role="presentation">
    <div class="caja" role="alertdialog" aria-modal="true" aria-labelledby="repartir-titulo" aria-describedby="repartir-texto" use:capa={() => (repartiendo = null)} in:scale={{ duration: dura(220), start: 0.9 }}>
      <h2 id="repartir-titulo">{enLista(ausentes.map((j) => j.nombre))} {ausentes.length > 1 ? 'se han desconectado' : 'se ha desconectado'}</h2>
      <p id="repartir-texto">
        Si repartes contando con {ausentes.length > 1 ? 'quien no está' : enLista(ausentes.map((j) => j.nombre))}, la partida se parará en su turno hasta que vuelva.
      </p>
      <div class="acciones">
        <button class="boton" data-foco onclick={() => repartirYa(true)}>Quitar y repartir</button>
        <button class="boton secundario" onclick={() => repartirYa(false)}>Repartir igualmente</button>
        <button class="enlace" onclick={cerrarCapa}>Cancelar</button>
      </div>
    </div>
  </div>
{/if}

{#if eligiendo}
  <Avatares
    titulo={nombre.trim() ? `Avatar de ${nombre.trim()}` : 'Tu avatar'}
    actual={sala && sala.tu !== null ? sala.jugadores[sala.tu].avatar : avatar}
    ocupados={sala ? sala.jugadores.filter((_, i) => i !== sala.tu).map((j) => j.avatar) : []}
    onelegir={cambiarAvatar}
    oncerrar={() => (eligiendo = false)}
  />
{/if}

{#if qrGrande && sala}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="qr-grande" role="dialog" tabindex="-1" aria-modal="true" aria-label="Código QR de la sala {sala.codigo}" use:capa={() => (qrGrande = false)} transition:fade={{ duration: dura(160) }} onclick={cerrarCapa}>
    <div class="tarjeta" in:scale={{ duration: dura(260), start: 0.8 }}>
      <div class="qr" aria-hidden="true">{@html qr}</div>
      <p class="grande">{sala.codigo}</p>
    </div>
    <button class="cerrar" data-foco>Cerrar</button>
  </div>
{/if}

<style>
  /* Con el pie fijo, lo que recibe el foco no puede quedar tapado por él. */
  :global(html:has(.pie-fijo)) {
    scroll-padding-bottom: 8rem;
  }
  main {
    --radio-ficha: 8px;
    --radio-hoja: 14px;
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
  .sala-codigo {
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

  .campo {
    flex: 1;
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  label {
    font-weight: 700;
    font-size: 1.05rem;
  }
  input {
    min-width: 0;
    min-height: 48px;
    padding: 0 12px;
    border: 1px solid rgb(235 233 217 / 0.35);
    border-radius: var(--radio-ficha);
    background: rgb(0 0 0 / 0.25);
    color: var(--papel);
    font: inherit;
    font-weight: 400;
    font-size: 1.15rem;
  }
  input[aria-invalid='true'] {
    border-color: #f0a3a3;
    box-shadow: inset 0 0 0 1px #f0a3a3;
  }
  input::placeholder { color: #a3a297; }
  .opcion {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
  .boton.ancho {
    width: 100%;
    margin-top: 12px;
  }
  .codigo-boton {
    font-family: var(--fell-sc);
    font-weight: normal;
    letter-spacing: 0.08em;
  }
  .otra-sala {
    margin: 18px 0 0;
    text-align: center;
  }

  /* El código: cuatro fichas de papel con un solo campo encima. Las letras las pintan las fichas;
     el campo, transparente, recibe el dedo, el teclado y el pegado. */
  .fichas {
    position: relative;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    max-width: 340px;
  }
  .ficha {
    display: grid;
    place-items: center;
    aspect-ratio: 554 / 680;
    border-radius: var(--radio-ficha);
    background: var(--grano-papel), var(--papel);
    color: var(--tinta);
    font-family: var(--fell-sc);
    font-size: clamp(1.8rem, 9vw, 2.6rem);
    line-height: 1;
    box-shadow:
      0 2px 0 #b9b6a0,
      0 6px 14px rgb(0 0 0 / 0.35);
    transition: transform 0.15s var(--curva-posar);
  }
  /* la ficha que se va a escribir, levantada y con el anillo de foco */
  .ficha.actual {
    transform: translateY(-3px);
    outline: 2px solid var(--foco);
    outline-offset: 3px;
  }
  .fichas.invalido .ficha {
    box-shadow:
      0 0 0 2px #f0a3a3,
      0 6px 14px rgb(0 0 0 / 0.35);
  }
  .fichas .codigo {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: transparent;
    caret-color: transparent;
    font-size: 16px;
    letter-spacing: 0;
    text-transform: uppercase;
    cursor: text;
  }
  .fichas .codigo:focus-visible { outline: none; }
  .fichas .codigo::selection { background: transparent; }

  /* La invitación de la sala, con forma de reverso de carta */
  .invitacion {
    display: grid;
    grid-template-columns: minmax(0, 44%) minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    margin-top: 16px;
  }
  .naipe {
    --foco: var(--tinta);
    container-type: inline-size;
    aspect-ratio: 554 / 766;
    display: flex;
    flex-direction: column;
    border-radius: 4cqw;
    background: var(--grano-papel), var(--papel);
    color: var(--tinta);
    box-shadow:
      0 0.4cqw 0.8cqw rgb(0 0 0 / 0.35),
      0 2cqw 5cqw rgb(0 0 0 / 0.3);
    overflow: hidden;
  }
  .marca-naipe {
    height: 11cqw;
    display: grid;
    place-items: center;
    font-size: 7cqw;
    line-height: 1;
  }
  /* en la carta, la marca va en tinta sobre el papel */
  .marca-naipe :global(.marca) { color: var(--tinta); }
  .marca-naipe :global(.des) { color: var(--gris); }
  .marca-naipe :global(.a) { color: var(--gris-claro); }
  .ilustracion {
    position: relative;
    margin: 0 8.3cqw;
    flex: 1;
    display: grid;
    place-items: center;
    border-radius: 4cqw 4cqw 0 0;
    box-shadow: inset 0 0 0 0.4cqw rgb(29 29 27 / 0.18);
  }
  .pestana {
    position: absolute;
    top: 0;
    right: 0;
    width: 27cqw;
    height: 15cqw;
    display: grid;
    place-items: center;
    background: var(--papel);
    border-bottom-left-radius: 5.4cqw;
    box-shadow: -0.4cqw 0.4cqw 0 rgb(29 29 27 / 0.18);
  }
  .pestana img {
    width: 72%;
    height: auto;
  }
  .naipe .qr {
    width: 82%;
    margin-top: 6cqw;
  }
  .banda {
    margin: 2cqw 0.5cqw 9cqw;
    height: 19cqw;
    display: grid;
    place-items: center;
    background: var(--tinta);
    color: var(--papel);
    font-family: var(--fell-sc);
    font-size: 15cqw;
    line-height: 1;
    letter-spacing: 0.08em;
  }
  .invitar {
    display: grid;
    gap: 10px;
  }
  .invitar .ayuda {
    margin: 0;
  }
  .invitar .ayuda b {
    font-style: normal;
    font-weight: 700;
    color: var(--papel);
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
  .qr :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
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
    border-radius: var(--radio-hoja, 14px);
    background: var(--grano-papel), var(--papel);
    color: var(--tinta);
    text-align: center;
  }
  .tarjeta .qr {
    width: min(78vw, 56dvh, 460px);
    cursor: zoom-out;
  }
  .grande {
    margin: 8px 0 0;
    font-family: 'Fell SC', serif;
    font-size: 3.4rem;
    line-height: 1;
    letter-spacing: 0.12em;
  }
  .cerrar {
    min-height: 44px;
    padding: 0 22px;
    border: 1px solid rgb(235 233 217 / 0.45);
    border-radius: 999px;
    background: none;
    color: var(--papel);
    font-weight: 700;
    cursor: pointer;
  }
  .quien {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    margin-top: 1em;
  }
  .moneda {
    flex: none;
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 0;
    border: 0;
    border-radius: var(--radio-ficha);
    background: none;
    cursor: pointer;
  }
  .quien .moneda { --lado: 56px; }
  .moneda small {
    margin: 0;
    font-size: 0.8rem;
  }

  .lista {
    --lado: 34px;
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 6px;
  }
  .lista li {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 6px 0 8px;
    border: 1px solid rgb(235 233 217 / 0.3);
    border-radius: var(--radio-ficha);
    font-size: 1.1rem;
  }
  .lista .nombre {
    min-width: 0;
    overflow-wrap: anywhere;
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
  .error.campo-error {
    margin: 4px 0 0;
    text-align: left;
    font-size: 0.98rem;
  }
  .error.campo-error:empty { margin: 0; }

  /* «Ahora repartes tú»: una cinta de papel arriba, unos segundos */
  .aviso {
    /* no tapa los botones de la barra: los toques pasan a través */
    pointer-events: none;
    position: fixed;
    top: calc(12px + env(safe-area-inset-top));
    left: 12px;
    right: 12px;
    z-index: 55;
    width: fit-content;
    max-width: 420px;
    margin-inline: auto;
    display: grid;
    gap: 2px;
    padding: 10px 18px;
    border-radius: var(--radio-ficha);
    background: var(--grano-papel), var(--papel);
    color: var(--tinta);
    text-align: center;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.45);
  }
  .aviso b {
    font-family: var(--fell-sc);
    font-weight: normal;
    font-size: 1.35rem;
    line-height: 1.1;
  }
  .aviso span {
    color: #55544c;
    font-size: 0.98rem;
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
  .otra-sala .enlace {
    color: var(--gris-claro);
    font-weight: 400;
  }

  /* Repartir con desconectados: como Confirmar, con tres salidas */
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
    width: min(100%, 400px);
    padding: 20px;
    border-radius: var(--radio-hoja);
    background: var(--grano-papel), var(--papel-2);
    color: var(--tinta);
    text-align: center;
    box-shadow: 0 20px 60px rgb(0 0 0 / 0.6);
  }
  .caja h2 {
    margin: 0 0 0.3em;
    border: 0;
    padding: 0;
    font-size: 1.45rem;
    line-height: 1.15;
  }
  .caja p {
    margin: 0 0 0.4em;
    color: #55544c;
  }
  .caja .acciones {
    display: grid;
    gap: 10px;
    margin-top: 16px;
  }
  .caja .boton {
    background: var(--tinta);
    color: var(--papel);
    box-shadow: 0 2px 0 #000;
  }
  .caja .boton.secundario {
    background: transparent;
    color: var(--tinta);
    box-shadow: inset 0 0 0 1px var(--gris);
  }

  /* Escritorio: la sala en dos columnas, como la preparación; «Repartir» en medio. */
  @media (min-width: 960px) {
    main.sala {
      max-width: 1100px;
      padding-inline: 32px;
    }
    .sala .columnas {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
      gap: 0 56px;
      align-items: start;
    }
    .sala .pie-fijo {
      justify-items: center;
      /* en escritorio todo cabe: el pie no hace falta que flote ni que tape */
      position: static;
      background: none;
    }
    .sala .pie-fijo .boton {
      min-width: 320px;
    }
    .invitacion {
      grid-template-columns: 200px minmax(0, 1fr);
    }
  }
</style>
