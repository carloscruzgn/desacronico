# desacrónico

Versión web de *desacrónico*, el juego de cartas para hacer cronologías de Carlos Cruz González y Rodrigo Muñoz Martínez (CEPA de Coria, 2024).

Las cartas se dibujan en el navegador con el diseño del juego impreso; las partidas en línea las lleva un Worker de Cloudflare con un Durable Object por partida.

## Desarrollo

```bash
npm install
```

```bash
npm run dev
```

- `src/`: la web (Svelte + TypeScript). `src/lib/Carta.svelte` es la carta.
- `compartido/`: datos y reglas que usan a la vez la web y el servidor. `cartas.json` no lleva años; van aparte en `anios.json`.
- `worker/`: el servidor de partidas.
- `public/cartas/`: las 323 ilustraciones, extraídas del PDF de impresión original.
- `public/avatares/`: las monedas de los jugadores (15 personajes, tres por serie de cartas, con cuatro gestos), de línea y color, generadas con un modelo de imagen y recortadas a 256 px.
- `public/fuentes/`: la tipografía IM FELL English (SIL Open Font License 1.1).

## Publicación

El repositorio está conectado a Cloudflare (Workers Builds): cada subida a `main` compila con `npm run build` y publica con `npx wrangler deploy`.

## Licencias

La licencia MIT del archivo `LICENSE` cubre solo el código. No se aplica a:

- **las cartas**: los textos y el diseño son de Carlos Cruz González y Rodrigo Muñoz Martínez, con licencia CC BY-SA;
- **las ilustraciones** (`public/cartas/`), cada una de su autor o institución, según los créditos de cada carta;
- **la tipografía** (`public/fuentes/`), con licencia SIL Open Font License 1.1.
