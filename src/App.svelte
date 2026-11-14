<script lang="ts">
  // Página de muestra del rediseño: enseña la carta nueva en los cinco ámbitos.
  // Se sustituirá por el menú y la mesa de juego.
  import cartasJson from '../compartido/cartas.json'
  import type { Carta as TCarta, Fecha } from '../compartido/tipos'
  import Carta from './lib/Carta.svelte'

  const cartas = cartasJson as TCarta[]
  const muestra = ['001', '091', '250', '281', '189'].map((id) => cartas.find((c) => c.id === id)!)

  let fechas = $state<Record<string, Fecha>>({})
  let volteadas = $state<Record<string, boolean>>({})

  async function voltear(id: string) {
    if (!fechas[id]) {
      const anios = (await import('../compartido/anios.json')).default as unknown as Record<string, [number, number]>
      const [anio, circa] = anios[id]
      fechas[id] = { anio, circa: !!circa }
    }
    volteadas[id] = !volteadas[id]
  }
</script>

<main>
  <h1><span class="des">des</span><span class="a">a</span>crónico</h1>
  <p class="ayuda">Muestra del rediseño · toca una carta para voltearla</p>
  <div class="fila">
    {#each muestra as carta, i (carta.id)}
      <button class="hueco" style="--i: {i}" onclick={() => voltear(carta.id)} aria-label={carta.texto.replace(/<[^>]+>/g, '')}>
        <Carta {carta} fecha={fechas[carta.id]} volteada={volteadas[carta.id]} />
      </button>
    {/each}
  </div>
</main>

<style>
  main {
    padding: 1.5rem 16px 3rem;
    text-align: center;
  }
  h1 {
    margin: 0;
    font-weight: normal;
    font-size: clamp(2.4rem, 9vw, 4rem);
  }
  h1 .des { color: var(--gris); }
  h1 .a { color: #5c5c5c; }
  .ayuda {
    margin: 0.2rem 0 1.6rem;
    color: var(--gris-claro);
  }
  .fila {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 18px;
    --ancho: min(240px, 42vw);
  }
  .hueco {
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    animation: repartir 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
    animation-delay: calc(var(--i) * 90ms);
    transition: transform 0.2s;
  }
  .hueco:hover {
    transform: translateY(-6px);
  }
  @keyframes repartir {
    from {
      opacity: 0;
      transform: translateY(-60vh) rotate(-14deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .hueco { animation: none; }
  }
</style>
