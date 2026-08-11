# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [1.4.0] - 2026-08-11

### Añadido

- Sección "Funcionalidades" en el README, con el listado completo de lo
  que se puede hacer en PinBoard.
- **Exportar/importar categorías**: en "Gestionar categorías", exportar
  el conjunto completo de categorías (nombre, icono, color y posición) a
  un JSON independiente de los enlaces, e importarlo de nuevo fusionando
  (añade solo las que no existan) o sustituyendo todo (los enlaces de
  categorías eliminadas pasan a "Sin categoría").
- **Selección múltiple de categorías** en el sidebar: Ctrl+clic (o
  Cmd+clic) añade o quita una categoría de la selección sin perder las
  demás; un clic normal sigue seleccionando solo una, y "Todas" limpia la
  selección.

### Cambiado

- Modal "Gestionar categorías": los botones "Exportar"/"Importar" (sin la
  palabra redundante "categorías" en su etiqueta) pasan a la fila de
  "Cerrar", dejando "Añadir" junto al campo de texto como antes, y la
  lista de categorías ocupa más alto para verse mejor.

### Corregido

- Los nombres de categoría largos ya no se cortan con "…" en el sidebar:
  ahora continúan en la línea siguiente mostrando el nombre completo.

## [1.3.0] - 2026-08-11

### Añadido

- Icono de escoba junto a "Etiquetas" en el sidebar que limpia de golpe
  la selección de etiquetas (incluidas y excluidas), sin tocar el
  filtro de categoría.

### Corregido

- El atajo de teclado `n` (abrir "Nuevo enlace") no funcionaba con Bloq
  Mayús activado ni pulsando Mayús+n, solo con la `n` en minúscula
  estricta.

## [1.2.1] - 2026-08-10

### Cambiado

- Orden de las secciones del sidebar: "Vistas" pasa a ir justo después de
  "Categorías" y antes de "Etiquetas" (antes iba tras Etiquetas).

## [1.2.0] - 2026-08-10

### Añadido

- **Duplicar enlaces**: icono junto a cada enlace que crea una copia (título
  + `" _copia"`) y abre el modal de edición sobre ella.
- **Reordenar categorías**: arrastrar y soltar en el sidebar y en el modal de
  gestión, además de los botones ▲/▼ para pantallas táctiles.
- **Iconos de categoría**: cada categoría puede llevar un icono de una
  librería de 56 iconos de contorno, visible en el sidebar y en la cabecera
  de cada grupo.
- **Paleta de colores** para categorías y etiquetas, además del selector de
  color nativo.
- **Vistas guardadas**: guardar la combinación de etiquetas incluidas y
  excluidas activa en ese momento con un nombre, y volver a aplicarla con un
  clic; aplicar una vista ya activa la deselecciona.
- **Exclusión de enlaces por etiqueta**: además de filtrar por etiquetas
  incluidas, ahora se puede excluir una etiqueta (p. ej. ocultar todo lo
  marcado "trabajo"), y queda fijada hasta desmarcarla.
- **Exportar respeta la selección activa**: con alguna categoría o etiqueta
  seleccionada, "Exportar" descarga solo esos enlaces en vez del listado
  completo (ignorando a propósito la búsqueda y el toggle Todos/Activos).
- Rediseño de la vista cómoda de las tarjetas de enlace.

### Cambiado

- Deseleccionar una categoría con un clic sobre la ya activa, igual que las
  etiquetas.
- El pie de la barra lateral ya no muestra un nombre de autor, solo la
  versión, el enlace a NLevia.org y el enlace a GitHub.

### Corregido

- El modal ya no se cierra accidentalmente al seleccionar texto dentro de
  él (por ejemplo, al arrastrar el ratón sobre una URL para copiarla).

## [1.1.0] - 2026-08-07

### Cambiado

- Extensión: se retira el permiso `tabs`, innecesario porque todo el uso
  de `chrome.tabs.*` en `background.js` ya queda cubierto por
  `activeTab` y `host_permissions: file:///*`. Reduce la superficie de
  permisos declarada de cara a la publicación en la Chrome Web Store.
- README: documentada la publicación de la extensión en la Chrome Web
  Store (enlace a la ficha, compatibilidad con otros navegadores basados
  en Chromium y aviso de que hay que activar "Permitir acceso a las URL
  de archivo" tras instalarla).

## [1.0.0] - 2026-08-07

Primera versión estable de PinBoard: gestor personal de enlaces en un solo
archivo HTML, sin servidor ni dependencias, con extensión opcional para
Chrome/Edge.

### Añadido

- `pinboard.html` — aplicación principal, funciona con `file://` y guarda
  los datos en `localStorage`.
- Extensión de navegador (Manifest V3) para capturar la pestaña activa y
  añadirla a PinBoard con un clic.
- Importador de marcadores de Chrome/Edge (`tools/`).
- Soporte para Chrome en el importador de marcadores.
- Icono compartido entre la app y la extensión.
- App vacía por defecto al primer uso.

[1.4.0]: https://github.com/alvama/PinBoard/releases/tag/v1.4.0
[1.3.0]: https://github.com/alvama/PinBoard/releases/tag/v1.3.0
[1.2.1]: https://github.com/alvama/PinBoard/releases/tag/v1.2.1
[1.2.0]: https://github.com/alvama/PinBoard/releases/tag/v1.2.0
[1.1.0]: https://github.com/alvama/PinBoard/releases/tag/v1.1.0
[1.0.0]: https://github.com/alvama/PinBoard/releases/tag/v1.0.0
