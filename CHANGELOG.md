# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

## [1.8.0] - 2026-08-13

### Añadido

- **Notas por enlace, que también puedes capturar desde la página que estás
  leyendo**: cada enlace gana un campo de notas donde escribir lo que sabes o
  piensas sobre él. No es la descripción —esa es un resumen de una línea que
  se ve en la ficha—, sino texto largo que se acumula con el tiempo. Las notas
  **nunca se sobrescriben**: cada anotación entra como un bloque nuevo al
  final, encabezado por su fecha (`## 13/08/2026`).
  Las fichas con notas muestran un 📝 en los dos modos de vista, con el
  recuento en su tooltip: pulsarlo abre un **visor de solo lectura** con las
  notas de ese enlace —leer no es editar, y para editar sigue estando el
  lápiz de siempre—, con un botón "Editar notas" para pasar de una cosa a la
  otra. Y sobre todo, **la búsqueda las encuentra**: escribir en el buscador
  una palabra que solo aparece en una nota saca ese enlace.
- **El Markdown de las notas se ve formateado al leerlo**: encabezados (`#` a
  `######`), citas (`>`), listas con viñeta y numeradas, `**negrita**`,
  `*cursiva*`, `código` entre acentos graves y bloques de código enteros con
  la valla de tres acentos graves (lo de dentro se respeta literal, tal cual
  lo pegaste), **con un botón para copiar el bloque entero**. Se escribe en crudo —el campo
  del modal sigue siendo texto, siempre ves lo que guardaste— y se lee en
  limpio en el visor. Un salto de línea es un salto de línea, sin trucos de
  dos espacios al final. Los enlaces y las imágenes quedan fuera a propósito.
- **Menús contextuales en la extensión**: clic derecho en cualquier página →
  *"Guardar en PinBoard"* hace lo mismo que pulsar el icono. Y seleccionando
  texto → *"Añadir selección como nota en PinBoard"* guarda lo seleccionado
  como cita, con la fecha del día. Si la página ya está guardada, **la nota se
  añade sin cambiar de pestaña** —sigues leyendo, y un aviso en la esquina de
  la propia página confirma a qué enlace ha ido y cuántas notas lleva ya—; si
  no lo está, se abre PinBoard con el formulario ya relleno y la nota puesta,
  para que confirmes el alta.
- **El formulario de enlace pasa a dos columnas**, con las notas ocupando la
  derecha entera: es el único campo que puede crecer mucho, y así tiene sitio
  de sobra sin que aparezca scroll en el modal. En ventanas estrechas las dos
  columnas se apilan como antes.

### Cambiado

- El **formato de datos gana un campo opcional**, `notes`. Es
  retrocompatible en las dos direcciones y no hay ninguna migración: los
  enlaces que ya tenías siguen igual, y el campo solo se escribe en los
  enlaces que tienen algo anotado. Se conserva al exportar, al importar
  (fusionando y sustituyendo) y al duplicar un enlace.
- La **extensión sube a la versión 1.2.0** y pide un permiso nuevo,
  `contextMenus`, que es lo que le permite añadir sus dos entradas al menú del
  clic derecho. Al ser un permiso nuevo, **hay que recargar la extensión**
  después de actualizarla.

## [1.7.0] - 2026-08-13

### Añadido

- **Vistas guardadas a partir de una selección de enlaces**: hasta ahora una
  vista solo podía expresarse como "estas categorías y estas etiquetas".
  Ahora, en el modo selección, la barra de acciones en lote incluye **"Crear
  vista"**: marca los enlaces que quieras —de las categorías que sean, con o
  sin etiquetas en común— ponle nombre, y quedan guardados como una vista
  más. Su chip en el lateral se ve y funciona igual que el de cualquier otra:
  un clic muestra exactamente esos enlaces, otro clic la suelta, y la
  búsqueda y el toggle Todos/Activos siguen funcionando dentro de ese
  conjunto. Con la vista aplicada, "Exportar" exporta solo esos enlaces.
  Crear la vista **no** la aplica ni pierde la selección: puedes seguir
  encadenando acciones en lote sobre los mismos enlaces, que es para lo que
  el modo selección conserva la selección. Si más tarde borras alguno de esos
  enlaces, la vista sigue funcionando con los que queden.

## [1.6.0] - 2026-08-13

### Añadido

- **Paleta de comandos (Ctrl+K)**: un único desplegable que busca a la vez
  acciones y contenido. Escribe "expo" y sale *Exportar enlaces*; "mdn" y
  sale el enlace; "desar" y sale la categoría *Desarrollo*. Cinco grupos de
  resultados —comandos, enlaces, categorías, vistas y etiquetas—, navegables
  con ↑/↓ y Enter (o con el ratón). Se abre con `Ctrl+K`/`Cmd+K`, y también
  con el botón "Comandos (Ctrl+K)" de la barra de herramientas, para que la
  función no dependa de un atajo que nadie te ha contado. Con el campo vacío
  lista **todas** las acciones de la app con su atajo, así que hace además de
  chuleta. Los enlaces se buscan sobre la colección completa, ignorando los
  filtros activos: el propósito es alcanzar algo que ahora mismo *no* estás
  viendo. La coincidencia ignora mayúsculas **y acentos**: "categoria"
  encuentra *Categorías* y "diseno" encuentra *Diseño*.

- **Importar marcadores de cualquier navegador arrastrando el archivo**:
  suelta sobre la página el HTML que exporta cualquier navegador
  (Ctrl+Shift+O → Exportar) o el propio `Bookmarks` de Chrome/Edge, y
  PinBoard lo reconoce por contenido (sin necesidad de extensión) y lo
  parsea en el sitio, sin herramientas externas — `DOMParser` para el
  HTML Netscape (que es HTML deliberadamente mal formado), la misma
  lógica ya probada de `tools/convertir_marcadores.py` para el
  `Bookmarks` de Chromium. La ruta de carpetas se convierte en categoría
  (unida con `" / "`), deduplicando dentro del propio archivo. El botón
  "Importar" también acepta ya estos dos formatos, además del JSON de
  siempre. `tools/` pasa a ser opcional. Como parte imprescindible del
  cambio, soltar un archivo en cualquier parte de la página ya no navega
  a él (comportamiento por defecto del navegador que antes hacía
  desaparecer la app), sin afectar al arrastrar y soltar interno de
  fichas y categorías.
- **Selección múltiple de enlaces y acciones en lote**: botón "Seleccionar"
  en la barra de herramientas que activa un modo en el que cada ficha
  muestra una casilla y un clic en cualquier parte de la ficha la
  selecciona o la deselecciona. Con al menos un enlace seleccionado
  aparece abajo una barra con el recuento y seis acciones sobre todos
  ellos a la vez: añadir etiqueta, quitar etiqueta, cambiar de categoría
  (creándola si no existía), activar, desactivar y eliminar (con
  confirmación y el recuento explícito, sigue siendo irreversible).
  Etiquetar treinta enlaces deja de ser treinta viajes al modal de
  edición. La selección **no se guarda** entre sesiones, se vacía en
  cuanto cambia lo que se está viendo (filtro, búsqueda o vista) y se
  conserva tras cada acción para poder encadenar varias sobre el mismo
  conjunto. Mientras el modo está activo, el arrastrar y soltar y los
  iconos ▲▼✏️🗑️ de las fichas quedan desactivados; al salir, todo vuelve
  a funcionar exactamente como antes.
- **Mensaje de bienvenida en el estado vacío**: cuando no hay ningún enlace
  guardado, `#emptyState` deja de mostrar el mensaje de "sin resultados con
  los filtros actuales" (que ahora solo aparece cuando sí hay enlaces pero
  el filtro activo no encuentra ninguno) y en su lugar enseña las tres
  primeras acciones: crear el primer enlace (botón funcional que abre el
  mismo modal que "+ Nuevo enlace"), importar los marcadores del navegador
  o un archivo de PinBoard, y pulsar `/` para buscar.
- **Atributo `title` en once controles** que no lo tenían: "+ Nuevo enlace",
  "Gestionar" (categorías y etiquetas), "Guardar actual" (vistas), el
  buscador, los botones de Todos/Activos y Cómoda/Compacta, "Plegar todo",
  el item "Todas" de categorías, los chips de vistas guardadas y, sobre
  todo, los chips de etiqueta del lateral, que ahora explican su ciclo de
  tres estados (neutra → incluida → excluida) al pasar el ratón.

### Corregido

- **`Escape` no cerraba el modal de importar categorías**, y **con ese modal
  abierto la tecla `n` abría el modal de nuevo enlace encima**. Los dos
  fallos tenían la misma causa: la lista de modales abiertos estaba escrita
  a mano en dos sitios y el modal de importar categorías se añadió sin
  apuntarlo en ninguno de los dos. Ahora los overlays se registran en una
  sola estructura, de la que derivan tanto el cierre con `Escape` como el
  bloqueo de los atajos de una tecla, así que cualquier modal futuro queda
  cubierto por el solo hecho de registrarse.
- **La barra de herramientas se desbordaba en ventanas estrechas**, empujando
  fuera de la vista los botones "Guardar actual" (Vistas) y "Gestionar"
  (Categorías/Etiquetas): por debajo de 780px de ancho, `.toolbar` no
  envolvía sus botones y, al ser hija de un grid CSS sin `min-width:0`,
  forzaba el desbordamiento horizontal de toda la página. Ahora `.toolbar`
  envuelve (`flex-wrap`) y `.sidebar`/`.content` pueden encogerse dentro
  del grid.
- **Las vistas guardadas se quedaban marcadas a la vez y no se podían
  desmarcar** cuando dos perfiles compartían la misma selección de
  etiquetas (o ninguna, un caso válido a propósito): el estado "activa" se
  derivaba comparando la selección actual contra cada perfil, así que
  ambos coincidían siempre y el clic para desmarcar pasaba de vacío a
  vacío sin ningún efecto. Ahora se rastrea explícitamente qué vista está
  aplicada (`state.activeViewProfile`) en vez de derivarlo por
  coincidencia.
- **Las vistas guardadas no recordaban las categorías seleccionadas**,
  solo las etiquetas: una vista creada a partir de una selección de
  categorías (sin ninguna etiqueta) se guardaba vacía de facto y no
  filtraba nada al aplicarla. Los perfiles ahora también guardan
  `selectedCategories` y lo restauran al aplicar la vista.

## [1.5.0] - 2026-08-11

### Añadido

- **Editor de chips en el campo Etiquetas**: cada etiqueta ya añadida a un
  enlace se muestra como una pastilla dentro del propio campo (en vez de
  texto plano separado por espacios), con un desplegable de sugerencias
  que filtra las etiquetas ya existentes mientras escribes — para
  reutilizarlas con un clic en lugar de tener que recordarlas y
  volver a teclearlas exactamente igual. Sigue admitiendo crear una
  etiqueta nueva escribiendo libremente si no hay coincidencia. Se
  confirma un chip con Enter, espacio, coma o clic en una sugerencia; se
  borra con el botón "×" de cada chip o con Backspace sobre el campo
  vacío; pegar texto con varias etiquetas de golpe (p. ej. `#a #b, #c`)
  las trocea en chips independientes.

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
- Al pulsar "Exportar" con algún filtro activo (categoría, etiquetas o una
  vista guardada), se pide confirmación indicando cuántos enlaces se van a
  exportar, para no exportar por error solo la selección visible en vez
  de todos los enlaces.

### Cambiado

- Modal "Gestionar categorías": los botones "Exportar"/"Importar" (sin la
  palabra redundante "categorías" en su etiqueta) pasan a la fila de
  "Cerrar", dejando "Añadir" junto al campo de texto como antes, y la
  lista de categorías ocupa más alto para verse mejor.

### Corregido

- Los nombres de categoría largos ya no se cortan con "…" en el sidebar:
  ahora continúan en la línea siguiente mostrando el nombre completo.
- Vista cómoda: el título de cada enlace se veía en azul (heredado del
  color genérico de los enlaces); ahora usa el mismo color neutro que el
  resto del texto, igual que ya hacía la vista compacta.

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

[1.8.0]: https://github.com/alvama/PinBoard/releases/tag/v1.8.0
[1.7.0]: https://github.com/alvama/PinBoard/releases/tag/v1.7.0
[1.6.0]: https://github.com/alvama/PinBoard/releases/tag/v1.6.0
[1.5.0]: https://github.com/alvama/PinBoard/releases/tag/v1.5.0
[1.4.0]: https://github.com/alvama/PinBoard/releases/tag/v1.4.0
[1.3.0]: https://github.com/alvama/PinBoard/releases/tag/v1.3.0
[1.2.1]: https://github.com/alvama/PinBoard/releases/tag/v1.2.1
[1.2.0]: https://github.com/alvama/PinBoard/releases/tag/v1.2.0
[1.1.0]: https://github.com/alvama/PinBoard/releases/tag/v1.1.0
[1.0.0]: https://github.com/alvama/PinBoard/releases/tag/v1.0.0
