# desacrónico — versión digital

Versión digital de *desacrónico*, el juego de cartas para hacer cronologías de Carlos Cruz González y Rodrigo Muñoz Martínez (CEPA de Coria, 2024).

## Cómo jugar

1. En esta página de GitHub, pulsa el botón verde **Code** y luego **Download ZIP**.
2. Descomprime el archivo descargado.
3. Abre la carpeta `juego` y haz doble clic en **`index.html`**.

El juego se abre en el navegador del ordenador (Chrome, Edge, Firefox o Safari). No necesita internet ni instalar nada, y funciona igual en Windows y en Mac. Se puede copiar la carpeta `juego` a un USB y llevarla a cualquier ordenador.

## Contenido

- `juego/`: el juego completo.
  - `cartas/`: las dos caras de las 323 cartas, extraídas del PDF de impresión original.
  - `datos.js`: año, texto, ámbito, era, posición del logo y crédito de cada carta.
  - `textos.js`: el reglamento y los créditos.
  - `juego.js`, `estilos.css`, `index.html`: el programa.
  - `fuentes/`: la tipografía IM FELL English, con licencia SIL Open Font License.
- `herramientas/extraer_cartas.py`: el programa que extrajo las cartas del PDF, por si hubiera que volver a generarlas.

La carta de broma («Un buen ciego sienta las bases para desacrónico») no se incluye.

## Licencias

La licencia MIT del archivo `LICENSE` cubre solo el código del programa. No se aplica a:

- **las cartas** (`juego/cartas/`): los textos y el diseño son de Carlos Cruz González y Rodrigo Muñoz Martínez, y las cartas impresas llevan el icono CC BY-SA;
- **las imágenes de las cartas**, cada una de su autor o institución, según los créditos que figuran en el reverso;
- **la tipografía** (`juego/fuentes/`), con licencia SIL Open Font License 1.1 (`juego/fuentes/OFL.txt`).
