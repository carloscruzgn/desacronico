# desacrónico

Web de **desacrónico**, un juego de cartas para hacer cronologías de Carlos Cruz González y Rodrigo Muñoz Martínez (CEPA de Coria). Publicada en `desacronico.com`. La estructura del código está en `README.md`.

Este archivo resume, a 2026-11-16, las normas y decisiones que hasta ahora solo estaban en la memoria de Claude del ordenador de Carlos, para que una sesión abierta en otro equipo o en la nube arranque con ellas. En la nube no hay `_local/` (git lo ignora), ni el Drive, ni la memoria local: lo que dependa de eso se deja para el ordenador de Carlos.

## Cómo se trabaja

- **Commit y push a `main` sin preguntar** al acabar un bloque que compile y esté probado. Cada push publica solo (Cloudflare Workers Builds).
- Carlos revisa **desde el iPhone la web publicada**, con capturas pantalla a pantalla. Tras cada ronda: commit, push y comprobar que la web publicada ya lleva el cambio (por ejemplo, buscando con curl un texto nuevo en `/assets/`), y decírselo en el cierre.
- Prefiere avanzar rápido y pulir sobre una versión usable. **No reabrir lo aplazado** si no lo pide.
- Cuando dé un texto entre comillas, usarlo literal. En lemas y descripciones, artículo indefinido («un juego de cartas…»); no cambiar sus indefinidos.
- Lo que no es web (pruebas, maquetas, originales) va en `_local/`.
- Para probar dos jugadores en línea en local: `localhost` y `[::1]`.

## Diseño

**Colores** (`src/app.css`):
- **papel** (`--papel`, crema, con `--grano-papel`): botones destacados, navegación (volver, cerrar, reglamento, sonido), quitar o añadir jugador. Sobre papel, el texto y la navegación van en **tinta** (`--tinta`).
- **tapete**: el verde oscuro del fondo.
- Identidad: **terracota** (`--principal`), **salvia** (`--secundario`) y **mostaza** (`--acento`).
- **La mostaza es el color de realce**: foco sobre el tapete, lo elegido, quien juega, quien gana, huecos de la cronología. Todo lo nuevo que se destaque o se elija, en mostaza.
- Los colores de las edades (`--antigua`…) son de las cartas y no salen fuera de ellas, salvo la franja del pie de la portada.

**Tipografía**:
- **IM Fell** (`--fell`, `--fell-sc`) solo en lo que reproduce el juego impreso: marca y lema, cartas, texto de carta citado, interior del reglamento, lámina, sellos y el titular «¡Gana…!».
- **Alegreya Sans** (`--ui`) en toda la interfaz. Solo hay cargados 400, 400 cursiva, 500 y 700: no usar 600.

**Iconos propios** (`src/lib/iconos.ts`, generado por `scripts/iconos-lamina.mjs`):
- Los nuevos se dibujan **a mano en SVG** en el objeto `A_MANO` del script: cuadro de 48 × 48, contorno de 1,3 en `var(--tinta)`, rellenos solo en terracota, salvia o mostaza. No hace falta usar los tres.
- **Planos**: no cambian con el fondo; contorno siempre en tinta, nunca `currentColor`. Sin rellenos de papel ni tonos intermedios.
- Los de una misma familia son idénticos salvo lo que los distingue (Crear sala y Unirse comparten la puerta).
- Antes de poner uno nuevo, enseñárselo a Carlos en una lámina sobre tapete y sobre papel, en grande y a unos 36 px.

**Poco texto**: etiquetas, notas y avisos de una línea, que digan qué hace el control y no cómo funciona la regla. Lo que explican las reglas va en `src/lib/textos.ts`, no en pantalla. Al proponer algo nuevo, empezar por la versión con menos texto.

**Avatares**: se llaman «avatar», no «moneda», y no llevan nombre debajo. Línea limpia y colores planos; círculo limpio sin canto ni aro; fondo del color de su serie de cartas, tres personajes por serie. Los nuevos se generan en el ordenador de Carlos (ElevenLabs, y hacen falta las láminas de `_local/`).

## Reglas del juego

- **El reglamento impreso no se reimprime**: no proponer cambios al impreso ni a las cartas físicas. Las reglas que solo existen en la web (como la «cronología completa») van en el resumen y en `ACLARACIONES` de `src/lib/textos.ts`. Los `PASOS`, que copian el reglamento original, no se tocan.
- «Cronología completa»: al cerrar ronda con el tope de cartas en la mesa o más, gana quien tenga menos cartas en la mano; los empatados comparten. Tope ajustable de 15 a 60, 30 por defecto.
- Sonido apagado por defecto. Final con sello «Gana», sin confeti.

## Pendiente

- **Pantalla de aula**, el siguiente gran bloque: abrir la sala desde la pantalla grande del aula (Android), seguir allí la partida y que los alumnos jueguen desde su móvil. Mientras tanto, no dar por hecho que quien abre la sala juega, ni usar tamaños fijos que no escalen.
- Revisión desde el iPhone: quedan el resto de la sala de espera, el final, el reglamento y el tutorial.
- Propuesto y sin respuesta de Carlos: funcionamiento sin conexión con service worker; el botón «Entrar en la sala XXXX» con el icono a la izquierda, como «Unirse».
- Aplazados a propósito: modos de eras y cooperativo; móvil apaisado.
- Sin decidir: si en una partida de dos uno abandona, el otro sigue solo.
- Antes de hacer público el repositorio: el crédito de la carta 250 (Franklin).
- Dudas abiertas: contraste de la marca (no se tocó); texto recortado a tres renglones en las cartas pequeñas de la lámina; la narración grabada dice «toca» también en ordenador.
- Descartado: las tiendas de aplicaciones; la app se instala desde la portada.

Hermano de este proyecto: **DilemaoDebate**, en su propio repositorio (`carloscruzgn/dilemaodebate`) y en `dilemaodebate.desacronico.com`. No comparten código.
