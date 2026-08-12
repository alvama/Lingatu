# Especificaciones — PinBoard

Documento de referencia técnica y funcional de `pinboard.html`, para mantenimiento y futuras ampliaciones.

## 1. Propósito

Página web de un solo archivo (`pinboard.html`) para gestionar una colección personal de enlaces (marcadores), organizados por categorías y etiquetas, con búsqueda y filtros. Se ejecuta **100% en local**, abriendo el archivo directamente en el navegador (`file://`), sin servidor, sin build y sin dependencias externas.

## 2. Arquitectura

- **Un único archivo HTML** (`pinboard.html`) con CSS y JavaScript embebidos (sin frameworks, sin librerías externas, sin CDNs).
- **Persistencia**: `localStorage` del navegador. Los datos son locales al navegador/perfil desde el que se abre el archivo — no se sincronizan entre navegadores ni equipos.
- **JavaScript**: vanilla ES5-friendly (funciones `function`, `var`), todo envuelto en un único IIFE `(function(){ "use strict"; ... })();` para no contaminar el `window` global.
- **Sin build step**: se edita el HTML directamente y se recarga el navegador.

### Claves de `localStorage`

| Clave | Contenido |
|---|---|
| `enlaces_links_v1` | Array JSON con todos los enlaces (ver modelo de datos) |
| `enlaces_categories_v1` | Array JSON de nombres de categorías (lista maestra) |
| `enlaces_tags_v1` | Array JSON de etiquetas, cada una con prefijo `#` (lista maestra) |
| `enlaces_site_title_v1` | Texto del título de la página (por defecto `"PinBoard"`) |
| `enlaces_view_mode_v1` | `"comfortable"` o `"compact"` — modo de visualización de tarjetas |
| `enlaces_collapsed_categories_v1` | Array JSON con los nombres de las categorías actualmente plegadas |
| `enlaces_category_colors_v1` | Objeto JSON `{ "NombreCategoría": "#rrggbb" }` — colores personalizados por categoría |
| `enlaces_tag_colors_v1` | Objeto JSON `{ "#etiqueta": "#rrggbb" }` — colores personalizados por etiqueta |
| `enlaces_category_icons_v1` | Objeto JSON `{ "NombreCategoría": "clave-icono" }` — icono elegido de la librería fija (ver 4.15) |
| `enlaces_excluded_tags_v1` | Array JSON de etiquetas actualmente excluidas de la vista (ver 4.17) — a diferencia del resto de filtros, se fija hasta que el usuario las desmarca |
| `enlaces_view_profiles_v1` | Array JSON de perfiles de vista guardados `{ name, tags: [...], excludedTags: [...] }` (ver 4.17) |

Todas estas claves son independientes; borrar una no afecta a las demás. Para reiniciar la app por completo, borrar las 11 claves (o los datos del sitio desde el navegador).

> Nota: las claves conservan el prefijo `enlaces_` heredado del nombre original del proyecto, a propósito — cambiarlas invalidaría los datos ya guardados por usuarios existentes. Es un detalle interno, no afecta al nombre público "PinBoard".

## 3. Modelo de datos

Cada enlace es un objeto:

```json
{
  "id": "m8x2k1abc",
  "category": "Desarrollo",
  "title": "MDN Web Docs",
  "url": "https://developer.mozilla.org",
  "description": "Referencia de HTML, CSS y JavaScript.",
  "active": true,
  "tags": ["#referencia", "#web"]
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | string | sí | Generado con `Date.now().toString(36) + random` (`genId()`). No editable por el usuario. |
| `category` | string | sí | Texto libre, pero normalizado contra la lista maestra sin distinguir mayúsculas/minúsculas (ver `ensureCategory`). |
| `title` | string | sí | Texto libre. |
| `url` | string | sí | Validado como URL por el `<input type="url">` del formulario. |
| `description` | string | no | Texto libre, puede ir vacío `""`. |
| `active` | boolean | sí | Controla si el enlace se muestra difuminado y si aparece en el filtro "Activos". |
| `tags` | string[] | no | Cada etiqueta se normaliza con prefijo `#`, sin espacios, deduplicada sin distinguir mayúsculas/minúsculas. Array vacío si no hay etiquetas. |

**Orden**: `state.links` no se reordena nunca automáticamente (ni por título, ni por fecha). La **posición del enlace dentro del array es su orden manual** dentro de su categoría (ver 4.9 y `swapLinks`). Al crear un enlace se añade al final del array; al importar en modo fusión, los nuevos también se añaden al final.

**Duplicar**: desde el modal de edición de un enlace ya guardado (botón "Duplicar", oculto al crear uno nuevo) se crea una copia inmediata — nuevo `id` vía `genId()`, mismos campos, título con sufijo `" _copia"` — y el propio modal pasa a editar esa copia (`duplicateEditingLink()`). Como conserva la misma URL que el original, al guardar sin cambiarla se disparará el aviso normal de "URL duplicada" (ver decisión 9 de la sección 7) — es el comportamiento esperado, no un error.

`state.categories` sigue el mismo criterio: la **posición en el array es el orden manual** de las categorías (sidebar, cabecera de grupo en las fichas y listado del modal de gestión), no un orden alfabético. Se reordena con `swapCategories(nameA, nameB)` desde los botones ▲/▼ del modal de gestión. Renombrar una categoría conserva su posición (a menos que el nuevo nombre coincida con otra ya existente, en cuyo caso se fusionan y la que se renombra desaparece).

### Listas maestras de categorías y etiquetas

Además del array de enlaces, existen dos listas maestras independientes (`state.categories`, `state.allTags`) que permiten:
- Crear categorías/etiquetas **vacías** (sin ningún enlace asociado todavía).
- Mantener categorías/etiquetas aunque se borre el último enlace que las usaba.
- Evitar duplicados por mayúsculas/minúsculas (`"Diseño"` vs `"diseño"` se consideran la misma).

La función `ensureCategory(name)` / `ensureTag(tag)` es el punto único de verdad: busca coincidencia case-insensitive en la lista maestra y devuelve el nombre canónico ya existente, o registra el nuevo si no existía. Se invoca siempre que se crea/edita un enlace, se importa un archivo, o se usa el modal de gestión.

## 4. Funcionalidades

### 4.1 CRUD de enlaces
- **Crear**: botón "+ Nuevo enlace" (sidebar) → abre modal con formulario.
- **Editar**: icono ✏️ en la tarjeta/fila del enlace.
- **Eliminar**: icono 🗑️ en la tarjeta/fila, con `confirm()` antes de borrar.
- Formulario: Categoría\* (con autocompletado vía `<datalist>`), Título\*, Link\* (`type="url"`), Descripción, Etiquetas (editor de chips con autocompletado y entrada libre — ver 4.20), Activo (checkbox).
- Botón "Cancelar" y clic fuera del modal (overlay) cierran sin guardar. Tecla `Escape` también cierra el modal que esté abierto (enlace o gestión).

### 4.2 Agrupación por categorías
Los enlaces filtrados se agrupan siempre por categoría en el área principal. Cada grupo es un `<section class="category-group">` con:
- Cabecera (`h2.category-group-title`, con `data-category`): flecha de plegado + nombre de categoría + contador de enlaces del grupo.
- Contenido: cuadrícula (`links-grid`) o lista (`links-list`) según el modo de vista.

Las categorías se muestran en su orden manual (ver 4.14), no alfabético. Si se filtra por una categoría concreta desde el sidebar, solo aparece un grupo.

**Filtro por categoría (sidebar)**: `state.selectedCategories` (`Set`) guarda la selección. Un clic normal en un `.category-item` de `#categoryList` la sustituye por esa única categoría (o la deselecciona si ya era la única seleccionada); **Ctrl+clic o Cmd+clic** (`e.ctrlKey || e.metaKey`) añade o quita esa categoría del conjunto sin tocar el resto de la selección (selección múltiple, ver 4.18); un enlace coincide si su categoría está en el conjunto (OR). Clic en "Todas" vacía `state.selectedCategories` por completo, con o sin Ctrl.

**Plegar/expandir**: clic en la cabecera de un grupo (`toggleCategoryCollapse`) lo pliega u expande individualmente — el estado se guarda por nombre de categoría en `state.collapsedCategories` (`Set`) y persiste en `localStorage` (`enlaces_collapsed_categories_v1`), así que se recuerda entre sesiones. Visualmente, un grupo plegado oculta su `links-grid`/`links-list` vía CSS (`.category-group.collapsed`) y rota la flecha (`.group-toggle-arrow`) -90°. El botón **"Plegar todo" / "Expandir todo"** de la barra de herramientas (`#btnToggleAllGroups`) pliega o expande todas las categorías de golpe; su etiqueta se recalcula en cada `render()` (`syncToggleAllGroupsLabel`) según si *todas* las categorías están ya plegadas o no.

**Nota de diseño**: como la categoría ya es visible en la cabecera del grupo, **no se repite dentro de cada tarjeta/fila individual** (se quitó el badge de categoría de las tarjetas).

### 4.3 Búsqueda y filtros
- **Búsqueda** (`#searchInput`): coincidencia de subcadena (case-insensitive) sobre título + descripción + etiquetas concatenados.
- **Filtro de categoría**: menú lateral tipo lista, selección múltiple (`state.selectedCategories`, `Set` vacío = todas) — ver 4.18.
- **Filtro de etiquetas**: nube de etiquetas en el lateral y en cada tarjeta (`state.tags`, `Set`). Al hacer clic en una etiqueta —lateral o tarjeta— se **añade o quita** de la selección (multi-selección acumulativa); un enlace coincide si tiene *alguna* de las etiquetas seleccionadas (OR). El icono de escoba (🧹) junto a "Etiquetas" (`#btnClearTagSelection`) vacía de un golpe tanto las etiquetas incluidas como las excluidas (4.17); no toca el filtro de categoría.
- **Filtro de estado**: toggle "Todos / Activos" en la barra de herramientas (`state.activeFilter`). Valor por defecto: `"active"`. *(Nota: internamente `getFilteredLinks()` también reconoce el valor `"inactive"` por si se quisiera reintroducir esa opción en el futuro, pero actualmente no hay ningún control de UI que lo establezca.)*
- Todos los filtros son combinables (AND) y se aplican antes de agrupar por categoría.

### 4.4 Modo de vista: Cómoda / Compacta
Toggle en la barra de herramientas (`#viewToggle`), persistido en `localStorage`.
- **Cómoda** (`cardHtml`): tarjeta en cuadrícula (`links-grid`, `auto-fill minmax(280px,1fr)`), con título, descripción completa, etiquetas como chips, iconos de reordenar/editar/eliminar arriba a la derecha.
- **Compacta** (`cardHtmlCompact`): fila estrecha en lista vertical (`links-list`), con título en una sola línea (elipsis si no cabe; tooltip con título + descripción al pasar el ratón), etiquetas visibles solo en pantallas ≥780px, mismos iconos a la derecha.

### 4.5 Gestión de categorías y etiquetas
Botón "Gestionar" junto a cada sección del sidebar (Categorías / Etiquetas) abre un modal genérico (`#manageModalOverlay`, controlado por `manageType` = `"category"` | `"tag"`) con:
- **Añadir**: input + botón, crea una entrada vacía en la lista maestra (avisa si ya existe).
- **Renombrar (edición inline)**: el botón "Renombrar" convierte la fila en un `<input>` editable in situ (`manageEditingName` guarda qué fila está en edición); se confirma con el botón "Guardar" o la tecla `Enter`, y se cancela con "Cancelar" o `Escape`. La lógica de aplicación vive en `performRename(oldName, newValue)`, compartida por ambos disparadores. Actualiza el nombre en todos los enlaces que lo usan; si el nuevo nombre coincide (case-insensitive) con uno ya existente, se **fusionan** automáticamente.
- **Eliminar** (vía `confirm()`):
  - Categoría en uso → los enlaces afectados se reasignan a `"Sin categoría"` (se crea si no existe).
  - Etiqueta en uso → se quita de todos los enlaces afectados.

### 4.6 Título de la página personalizable
Icono ✏️ junto al `<h1>` del sidebar abre un `prompt()` para cambiar el texto. Actualiza `document.title` (pestaña del navegador) y el propio encabezado. Persistido en `localStorage`.

### 4.7 Exportar / Importar (JSON, y marcadores de cualquier navegador)
- **Exportar**: descarga `pinboard_AAAA-MM-DD.json` (formato idéntico al modelo de datos, sin listas maestras de categorías/etiquetas — se regeneran al importar). `getLinksForExport()` decide qué exportar: **sin ninguna categoría ni etiqueta seleccionada** (`hasLinkSelection()` es `false`), exporta `state.links` completo; **con alguna selección activa** (categoría, etiquetas incluidas o excluidas — aplicar una vista guardada, 4.17, es solo un atajo para fijar estas mismas), exporta únicamente los enlaces que cumplen esos criterios. A propósito ignora la búsqueda de texto y el toggle Todos/Activos, para que ese filtro momentáneo no recorte una exportación sin que el usuario lo busque explícitamente. El título del botón (`syncExportButtonLabel`, llamado desde `render()`) indica en cada momento si va a exportar todo o cuántos enlaces de la selección actual. Además, si `hasLinkSelection()` es `true` en el momento de pulsar "Exportar", se pide confirmación explícita (`confirm()`, con el recuento de enlaces que se van a exportar) antes de generar el archivo, para que no se exporte sin querer solo la selección visible en vez de todos los enlaces.
- **Importar**: dos vías equivalentes, que comparten toda la lógica posterior — `handleImportFileText(text)` es la parte común (validar/parsear, rellenar el resumen, abrir el modal, asignar `pendingImportData`):
  - El botón "Importar" (`#fileImport`, con `accept` para `.json`/`.html`/`.htm`, aunque el archivo `Bookmarks` de Chromium no tiene extensión y requiere elegir "Todos los archivos" en el selector nativo).
  - **Soltar el archivo sobre cualquier parte de la página** (ver más abajo, "Arrastrar y soltar un archivo").
  
  `parseImportFile(text)` **enruta por contenido, no por extensión** (el `Bookmarks` de Chromium no tiene ninguna), sobre el texto ya leído y con `trim()`:

  | Empieza por / contiene | Formato | Parseo |
  |---|---|---|
  | `[` | JSON de PinBoard | `JSON.parse` + validación de `category`/`title`/`url` en cada elemento (comportamiento de siempre) |
  | `{` con una clave `roots` | `Bookmarks` de Chromium | `parseChromiumBookmarks(obj)` |
  | `NETSCAPE-Bookmark` o `<DL` | HTML de marcadores (Netscape, el que exporta cualquier navegador) | `parseNetscapeBookmarks(text)` |
  | cualquier otra cosa | — | error claro (`alert()`) |

  Los dos parsers nuevos devuelven un array con la **misma forma** que el JSON de PinBoard (`category`, `title`, `url`, `description: ""`, `active: true`, `tags: []`), así que `performImportMerge`/`performImportReplace` los consumen sin ningún cambio — ninguno de los dos sabe de qué formato vino el archivo. Ambos deduplican **dentro del propio archivo** con un objeto-mapa (`seen[url]`), quedándose con la primera aparición: `performImportReplace` no dedupica por sí solo (a diferencia de `performImportMerge`, que sí lo hace incidentalmente contra sus propias adiciones), así que sin este dedupe en el parseo, "Sustituir todo" crearía duplicados de cualquier marcador presente en más de una carpeta. Ambos descartan en silencio lo que no es un marcador web navegable (`javascript:`, `chrome://`, `edge://`, `about:`, `place:`, cualquier URL que no empiece por `http://`/`https://`) y las carpetas vacías, sin avisar — no son errores.
  - `parseChromiumBookmarks(obj)`: replica la lógica de `tools/convertir_marcadores.py:16-41` (la referencia de comportamiento). Recorre `obj.roots` recursivamente; el nombre de cada carpeta (incluida la del nodo raíz de cada root, p. ej. "Barra de favoritos") se acumula en la ruta, las carpetas sin nombre no añaden nivel; `category` = la ruta unida con `" / "` o `"Sin categoría"` si queda vacía; `title` = `name`, o la URL si el nombre está vacío.
  - `parseNetscapeBookmarks(text)`: parsea con `DOMParser.parseFromString(text, "text/html")` — **nunca** con `innerHTML` ni expresiones regulares, porque el archivo es contenido no confiable y el formato es HTML deliberadamente mal formado (`<DT>`/`<p>` sin cerrar). Para cada `A[href]`, `netscapeFolderPath(anchor)` sube por los ancestros `<DL>` reconstruyendo la ruta de carpetas. Detalle no obvio verificado empíricamente: el HTML parser del navegador anida cada `<DL>` **dentro** del `<DT>` que lo precede (no como hermano, pese a que el HTML fuente los escribe como hermanos sin cerrar), así que la carpeta de un `<DL>` es el `<H3>` que sea **hijo directo de ese mismo `<DT>` contenedor** — de ahí que no se pueda asumir ninguna forma concreta de anidar los `<DT>` y haya que subir explícitamente por `dl.parentElement`.
  - `#importSummary` indica también el formato reconocido (`IMPORT_FORMAT_LABELS`), además del recuento de siempre. Sigue usando `textContent` (nunca HTML) porque los títulos importados son texto arbitrario.
  - **Fusionar** (`performImportMerge`, recomendado — botón primario): añade solo los enlaces del archivo cuya URL (normalizada con `normalizeUrlForCompare`: `trim` + sin `/` final + minúsculas) no exista ya entre los enlaces actuales. Los añadidos se registran con un `id` nuevo y se normalizan sus categorías/etiquetas (`ensureCategory`/`ensureTag`). Al terminar, muestra un `alert()` con el recuento de añadidos/omitidos.
  - **Sustituir todo** (`performImportReplace`, botón `btn-danger`): pide una confirmación adicional y luego **reemplaza por completo** `state.links` por el contenido del archivo.
  - Tras cualquiera de las dos, se resetean los filtros a estado neutro (`resetFiltersAfterImport`: `activeFilter = "all"`, categoría = todas, etiquetas = ninguna, búsqueda vacía) para poder revisar el resultado.

**Arrastrar y soltar un archivo (importación)**: manejadores `dragenter`/`dragover`/`dragleave`/`drop` a nivel de `document`, para que soltar un archivo de marcadores **en cualquier parte de la página** funcione y, sobre todo, para que **nunca navegue al archivo** (la acción por defecto del navegador al soltar un archivo). Sin esto la app desaparecería de la pantalla, sustituida por el volcado del archivo — los manejadores de arrastre interno (`#linksContainer`/`#categoryList`, 4.9/4.14) no lo evitan porque los dos empiezan comprobando su propio arrastre en curso (`draggedLinkId`/`draggedCategoryName`) y salen antes de llamar a `preventDefault()` si no hay ninguno.
- `isInternalDrag()` (`draggedLinkId || draggedCategoryName`) es la guarda: si hay un arrastre interno en curso, los manejadores de `document` no hacen nada y dejan actuar a los de `#linksContainer`/`#categoryList` sin interferir.
- Si no es un arrastre interno, se llama a `preventDefault()` incondicionalmente (cualquier arrastre externo, sea o no un archivo reconocible: primero se impide la navegación, después — si corresponde — se avisa del error). `#fileDropIndicator` (clase `.visible`) da feedback visual mientras dura el arrastre, con el mismo lenguaje visual que `.drag-over`.
- Solo si `e.dataTransfer.files.length > 0` se lee el primer archivo con `FileReader` y se pasa a `handleImportFileText`. Distinguir por `dataTransfer.files` (en vez de asumir que todo arrastre externo es un archivo) deja el hueco preparado para que "arrastrar una URL desde otra ventana" (backlog) añada después la rama de `text/uri-list` sin rehacer esto.

### 4.8 Datos de ejemplo (primer arranque)
Si no hay datos guardados en `localStorage`, la app arranca sin ningún enlace (`state.links = []`). Para probarla con contenido de muestra, existe un archivo aparte, [`examples/ejemplo-enlaces.json`](../examples/ejemplo-enlaces.json), cargable con el botón "Importar".

`renderCards()` (`pinboard.html:1514`) distingue este caso de "sin filtros que coincidan": si `state.links.length === 0`, `#emptyState` muestra un mensaje de bienvenida (crear el primer enlace con un botón que reutiliza el manejador de `#btnAdd`, importar marcadores, o pulsar `/` para buscar) en vez del mensaje genérico de "sin resultados con los filtros actuales", que sigue mostrándose cuando sí hay enlaces pero el filtro activo no encuentra ninguno. El botón de bienvenida (`#btnEmptyStateAdd`) usa un listener delegado sobre `#emptyState`, registrado una sola vez en la inicialización (no en `render()`), porque ese elemento es estático y `render()` no lo destruye.

### 4.9 Reordenar enlaces manualmente
Cada tarjeta/fila incluye iconos ▲/▼ (junto a ✏️/🗑️) para mover el enlace un puesto arriba/abajo **dentro de su categoría y respetando el filtro/búsqueda actual** — es decir, "arriba" significa "con el enlace visible inmediatamente anterior en este mismo grupo", no con el anterior en el array completo. Detalles:
- `renderCards()` calcula, para cada enlace visible, el `id` de su vecino anterior/siguiente **dentro del grupo filtrado** (`prevId`/`nextId`) y se los pasa a `cardHtml`/`cardHtmlCompact`, que generan el botón ▲/▼ con `data-target` = ese id (o un `<span class="icon-disabled">` no interactivo si el enlace ya está en un extremo).
- Al hacer clic, `swapLinks(idA, idB)` intercambia esos dos enlaces de posición dentro de `state.links` (busca cada uno por `id` con `findIndex`, sin asumir que sean adyacentes en el array) y persiste con `save()`.
- Como consecuencia, **el orden ya no es alfabético por título** (se quitó ese `.sort()` de `getFilteredLinks()`): el orden de visualización es siempre el orden real de `state.links`, que el usuario controla con estos botones (ver también la nota "Orden" en la sección 3).

**Arrastrar y soltar**: como alternativa a los botones ▲/▼, cada tarjeta/fila tiene `draggable="true"` (con `draggable="false"` explícito en el enlace `<a>` interno, para que el navegador no inicie un arrastre nativo del link en su lugar). Arrastrar una tarjeta y soltarla:
- **Sobre otra tarjeta**: la inserta justo antes de esa tarjeta (misma lógica de "antes de" que ya usan los botones ▲/▼).
- **Sobre la cabecera de un grupo, o sobre el hueco vacío de un grupo** (incluido uno plegado): la añade al final de esa categoría.
- **Sobre una tarjeta de otra categoría**: además de reordenar, cambia la `category` del enlace arrastrado a la del grupo de destino — es decir, así es como se mueve un enlace de una categoría a otra.

Toda la lógica vive en `moveLinkTo(draggedId, targetCategory, beforeId)`, delegada mediante los eventos `dragstart`/`dragover`/`drop`/`dragend` en `#linksContainer` (clases `.dragging` y `.drag-over` para el feedback visual).

### 4.10 Colores personalizables por categoría y por etiqueta
En el modal de gestión (4.5), cada fila tiene un botón (`.manage-row-icon-btn`, con un punto del color actual) que abre/cierra un panel (`data-action="pick-color"`, mismo patrón que el selector de iconos de 4.15) con:
- Una **paleta simplificada** de 12 colores fijos (`COLOR_PALETTE`) para elegir rápido los tonos más comunes, con un check visual (`.color-swatch-btn.active`) sobre el que esté aplicado.
- El selector nativo `<input type="color">` (`.manage-row-color`) para cualquier color personalizado fuera de la paleta.
- Un botón "✕ Quitar color" (`reset-color`), visible solo si hay color asignado.

Elegir cualquiera de las tres opciones guarda y cierra el panel. Se guarda en un mapa `nombre → color` independiente de la lista maestra (`state.categoryColors` / `state.tagColors`, persistidos en `enlaces_category_colors_v1` / `enlaces_tag_colors_v1`), así que no hace falta tocar el modelo de datos de los enlaces.

Dónde se ve el color:
- **Categorías**: un punto de color (`categoryDotHtml`, clase `.cat-color-dot`) delante del nombre, tanto en la lista del sidebar como en la cabecera de cada grupo. Sin color personalizado, el punto usa `var(--text-muted)` como color neutro.
- **Etiquetas**: el propio chip (`.tag-chip` en el sidebar, `.tag` en las tarjetas) adopta el color como fondo, con el texto en blanco o negro según contraste (`contrastTextColor`, calculado por luminancia). Sin color personalizado, se usa el estilo por defecto (`--tag-bg`/`--tag-fg`).

Al **renombrar** una categoría/etiqueta (`performRename`) el color migra automáticamente a la nueva clave (o se descarta si el nuevo nombre se fusiona con una que ya tenía su propio color, para no pisarlo). Al **eliminar**, se borra también su entrada de color.

### 4.11 Favicon de cada enlace
Junto al título de cada tarjeta/fila (en ambos modos de vista) se muestra el favicon del sitio, obtenido en tiempo real vía el servicio público `https://www.google.com/s2/favicons?sz=32&domain=<dominio>` (`faviconUrl`/`faviconImgHtml`), a partir del `hostname` extraído de la URL con `new URL(l.url)`. No se guarda nada en el modelo de datos: se recalcula en cada render. Si la URL es inválida (`new URL()` lanza excepción) no se pinta ningún icono; si la imagen no carga, se elimina sola del DOM (`onerror="this.remove()"`) en vez de mostrar el icono roto del navegador.

### 4.12 Atajos de teclado
- **`/`** — enfoca el buscador (`#searchInput`).
- **`n`** — abre el modal de "Nuevo enlace". Insensible a mayúsculas (compara `e.key.toLowerCase()`), así que funciona igual con Bloq Mayús activado o pulsando Mayús.

Ambos se ignoran mientras el foco está en un campo de texto/`textarea`/elemento editable, o mientras hay algún modal abierto (enlace, gestión o importación), para no interferir con la escritura normal.

### 4.13 Duplicar un enlace
Botón "Duplicar" (`#btnDuplicate`) en el modal de edición, oculto al crear un enlace nuevo (`openModal` hace `btnDuplicate.hidden = !link`). Al pulsarlo, `duplicateEditingLink()` crea de inmediato una copia del enlace que se está editando (nuevo `id` vía `genId()`, mismos campos, título con sufijo `" _copia"`), la guarda, y el propio modal pasa a editar esa copia. Al conservar la misma URL que el original, si se guarda sin cambiarla se dispara el aviso normal de "URL duplicada" (4.1) — es el comportamiento esperado.

### 4.14 Reordenar categorías manualmente
Mismo mecanismo que 4.9, aplicado a `state.categories`: la posición en el array es el orden de visualización (sidebar, cabecera de grupo, listado del modal de gestión), no un orden alfabético. Las etiquetas no tienen esta función (siguen alfabéticas). `performRename` conserva la posición de la categoría al renombrarla; solo se pierde si el nuevo nombre coincide con otra ya existente (fusión, la renombrada desaparece).

Dos formas de reordenar:
- **Botones ▲/▼** en el modal de gestión (4.5): cada fila de categoría los tiene (`moveHtml`, con `data-target` = nombre de la categoría vecina), llaman a `swapCategories(nameA, nameB)` (intercambio simple con la vecina).
- **Arrastrar y soltar** directamente en `#categoryList` (sidebar): cada `.category-item` (salvo "Todas") es `draggable="true"`. `moveCategoryTo(draggedName, beforeName)` saca la categoría arrastrada de su posición y la inserta justo antes de `beforeName` (o al final si es `null`) — a diferencia de `swapCategories`, permite moverla varias posiciones de una vez, no solo intercambiar con la vecina. Soltar sobre "Todas" la mueve al principio de la lista (`beforeName` = la categoría que hoy ocupa el primer puesto). Delegado con `dragstart`/`dragover`/`drop`/`dragend` en `#categoryList`, mismo patrón que el de los enlaces (4.9), clases `.dragging`/`.drag-over`.

### 4.15 Iconos de categoría
En el modal de gestión, cada fila de categoría tiene un botón (`.manage-row-icon-btn`) que abre/cierra un selector (`.icon-picker`) con una librería fija de 56 iconos SVG embebidos inline (`CATEGORY_ICONS`, sin CDN ni subida de archivos propios), cubriendo categorías típicas de marcadores (proyectos, documentación, desarrollo, diseño, finanzas, comunicación, seguridad, salud, viajes, ocio, etc.). Elegir uno guarda `state.categoryIcons[nombre] = clave` (mapa aparte, persistido en `enlaces_category_icons_v1`, mismo patrón que `categoryColors`); el botón "✕" del propio selector lo quita. El icono se pinta con el color personalizado de la categoría si lo tiene (`categoryIconSvg`).

Se evaluó también un estilo sólido/relleno y uno duotono con placa de fondo (más grandes, ~19px) frente al contorno fino actual (14px, trazo 2px); se descartaron por no parecerse al estilo de referencia que se buscaba, así que la librería se amplió (de ~20 a 56) manteniendo el mismo contorno fino de siempre.

`categoryDotHtml(name)` decide qué pintar: el icono si hay uno asignado, si no el punto de color de siempre (4.10) — por decisión explícita, **solo** en los sitios donde ya se representaba la categoría (sidebar, cabecera de grupo), no en cada ficha individual de enlace. Renombrar/fusionar y eliminar una categoría migran o borran su entrada de `categoryIcons` igual que ya hacían con `categoryColors`.

### 4.16 Vista cómoda: barra de color y URL bajo el título
Ajustes visuales sobre `cardHtml()` (solo vista cómoda, no la compacta):
- **Barra de color superior**: `.link-card` tiene `border-top-width:4px`; `categoryTopBarStyle(name)` fija `border-top-color` al color de la categoría del enlace (o el borde neutro por defecto si no tiene).
- **URL bajo el título**: `hostnameForDisplay(url)` (mismo patrón que `faviconUrl`, con su propio `try/catch`) muestra el `hostname` en `<div class="url">`, reutilizando una clase que ya existía en el CSS sin usar.
- **Densidad del grid**: `.links-grid` bajó su `minmax()` de 280px a 250px, lo que combinado con `.content{max-width:1200px}` encaja 4 columnas a una resolución de escritorio normal sin dejar de ser responsive (`auto-fill` sigue recalculando columnas por el ancho disponible).
- **Fichas más compactas**: padding de `.link-card` reducido de 16px a 12px/14px y el `gap` interno de 8px a 6px.
- **Título en color neutro**: `.link-card h3 a` fija `color:var(--text)` explícitamente (antes heredaba el azul del `a{color:var(--primary)}` genérico), igual que ya hacía `.compact-title` en la vista compacta.

### 4.17 Vistas guardadas (exclusión de etiquetas por nombre)
Objetivo: poder ocultar de la vista los enlaces de un contexto (p. ej. "trabajo") sin necesidad de un campo nuevo en el modelo de datos ni de un sistema de grupos aparte — reutiliza las etiquetas ya existentes.

**Exclusión de una etiqueta** (`#tagCloud` en el sidebar, no en las etiquetas de las tarjetas): cada clic cicla por 3 estados — neutra → incluida (mismo filtro `state.tags` de siempre, `.tag-chip.active`) → **excluida** (`state.excludedTags`, `.tag-chip.excluded`, con tachado y borde rojo) → neutra de nuevo. A diferencia de `state.tags`/`state.category`/`state.search` (que se resetean en cada carga de página), `state.excludedTags` se persiste en `enlaces_excluded_tags_v1` y **se mantiene fijo hasta que el usuario la desmarca**, incluso entre sesiones — es justo el comportamiento pedido ("fijar la exclusión hasta que se desmarque"). `getFilteredLinks()` descarta cualquier enlace cuyas `tags` intersequen con `state.excludedTags`.

**Perfiles de vista** (sección "Vistas" del sidebar, `#viewProfileList`): un perfil es `{ name, tags: [...], excludedTags: [...] }` — guarda **toda** la selección de etiquetas, tanto las incluidas como las excluidas, no solo la exclusión. Guardado en `state.viewProfiles` (`enlaces_view_profiles_v1`), independiente de los enlaces y de la lista maestra de etiquetas — si se borra una etiqueta que un perfil usaba, el perfil simplemente deja de tener efecto sobre ese texto, sin romper nada. `loadViewProfiles()` normaliza perfiles guardados antes de este cambio (sin `tags`) a un array vacío, por compatibilidad.
- **Guardar** (`btnSaveViewProfile`): pide un nombre (`prompt`) y guarda `state.tags` + `state.excludedTags` tal cual están *en ese momento* — sin exigir ningún mínimo, "todo sin filtrar" es una vista válida como cualquier otra. Si el nombre coincide (sin distinguir mayúsculas) con un perfil ya existente, pide confirmación para sobrescribirlo.
- **Aplicar / deseleccionar**: clic en el chip del perfil (`.view-profile-chip`) sustituye tanto `state.tags` como `state.excludedTags` por lo guardado. Si el perfil ya está activo (`currentSelectionMatchesProfile()`, vía `setsMatch()`), el mismo clic lo deselecciona en vez de reaplicarlo — vacía ambos conjuntos y vuelve a la vista general — mismo patrón de toggle que la selección de categoría (4.2).
- **Eliminar**: botón "✕" del propio chip (`data-action="delete-profile"`), con confirmación; no toca `state.excludedTags` si ese perfil estaba aplicado en ese momento (la exclusión vigente se queda como está, solo desaparece el atajo guardado).

**Interacción con la extensión** (ver sección 8): `checkDuplicate` sigue detectando bien un enlace ya guardado aunque esté oculto por una exclusión activa (consulta `state.links` directamente). `focusExisting`, en cambio, no podrá resaltarlo si su ficha no está renderizada por estar excluida — no es un fallo, es el mismo caso ya cubierto por la checklist de la sección 8.

### 4.18 Selección múltiple de categorías (Ctrl+clic)
`state.selectedCategories` sustituye al antiguo `state.category` único por un `Set` de nombres, siguiendo el mismo patrón que `state.tags`/`state.excludedTags` (4.3). Listener de clic sobre `#categoryList`:
- Clic en "Todas" (`data-category=""`): `state.selectedCategories.clear()`, siempre, tenga o no pulsado Ctrl.
- Clic normal sobre una categoría: comportamiento de selección simple — si es la única ya seleccionada, se deselecciona (`clear()`); si no, sustituye toda la selección por esa única categoría (`new Set([cat])`).
- **Ctrl+clic / Cmd+clic** (`e.ctrlKey || e.metaKey`) sobre una categoría: alterna solo esa categoría dentro del conjunto (`add`/`delete`) sin afectar a las demás — es el mecanismo de selección múltiple.

`getFilteredLinks()`/`getLinksForExport()` consideran que un enlace pasa el filtro si `state.selectedCategories.size === 0` o su categoría está en el conjunto. El valor por defecto del campo categoría al crear un enlace nuevo (`openModal`) usa la categoría seleccionada solo si hay **exactamente una** en el conjunto; con cero o varias, el campo queda vacío. `performRename` migra la entrada del conjunto igual que hace con `categoryColors`/`categoryIcons`; eliminar una categoría la quita del conjunto si estaba presente.

No hay un botón dedicado para vaciar la selección múltiple de categorías (a diferencia del icono de escoba de etiquetas, 4.3): clicar "Todas" ya cumple esa función.

### 4.19 Exportar/Importar categorías
En el modal de gestión de categorías (4.5), en la fila de `.modal-actions` junto al botón "Cerrar", dos botones (`btnExportCategories`/`btnImportCategories`, ocultos con `hidden` cuando `manageType === "tag"`) independientes del exportador/importador de enlaces (4.7):
- **Exportar** (`btnExportCategories`): descarga `pinboard_categorias_<fecha>.json`, un array en el mismo orden que `state.categories` (el orden es la posición) con `{ name, icon, color }` por categoría (`icon`/`color` a `null` si no tiene). Mismo mecanismo Blob + `URL.createObjectURL` que el exportador de enlaces.
- **Importar** (`btnImportCategories` → `fileImportCategories`, lectura con `FileReader`): valida que sea un array de objetos con `name`, y abre `#importCategoriesModalOverlay` con el resumen y dos acciones:
  - **Fusionar** (`performImportCategoriesMerge`): aditivo — para cada entrada llama a `ensureCategory(entry.name)`; si la categoría no existía, la crea al final y le asigna `icon`/`color` del archivo (validando que la clave de icono exista en `CATEGORY_ICONS`); si ya existía, no toca su posición, color ni icono actuales.
  - **Sustituir todo** (`performImportCategoriesReplace`, tras `confirm()`): reemplaza `state.categories`/`categoryColors`/`categoryIcons` íntegramente por el contenido del archivo (deduplicando por nombre, el orden del array = nueva posición). Cualquier enlace cuya categoría ya no exista en la nueva lista se reasigna a `ensureCategory("Sin categoría")`, igual que hace el borrado manual de una categoría (4.5). También limpia de `state.selectedCategories` cualquier nombre que haya dejado de existir.

### 4.20 Editor de chips en el campo Etiquetas

Objetivo: reutilizar etiquetas ya existentes sin tener que recordarlas ni escribirlas exactamente igual, manteniendo intacta la posibilidad de crear una etiqueta nueva escribiendo libremente — mismo problema que resolvió Categoría con su `<datalist>` (4.1), pero adaptado a que un enlace puede llevar ninguna, una o varias etiquetas a la vez.

**Estructura del campo** (`#tagsField`, dentro del `<label for="tagsInput">` de "Etiquetas"): un contenedor (`#tagsChipsWrap`) que combina las etiquetas ya confirmadas, pintadas como chips (`<span class="tag-chip tags-chip">`, reutilizando el mismo componente visual que la nube del sidebar — 4.10), con un `<input id="tagsInput">` de texto libre al final para seguir escribiendo. El envío del formulario sigue leyendo un `<input type="hidden" id="fieldTags">` sincronizado por JS con los chips (`syncTagsHiddenInput()`), así que `normalizeTags()`/`ensureTag()` y el resto del `submit` no cambiaron una sola línea respecto a cuando el campo era texto plano.

**Confirmar una etiqueta como chip** — con Enter, espacio, coma, pegado de texto con separadores, o clic en una sugerencia:
- `tagsFieldResolveCanonical(raw)` busca en `state.allTags` un nombre existente que coincida sin distinguir mayúsculas y lo devuelve tal cual (mismo criterio que `ensureTag`, pero de solo lectura); si no hay coincidencia, limpia el texto y le antepone `#`.
- `tagsFieldCommitToken(raw)` añade ese nombre canónico a `tagsFieldChips` si no está ya presente (comparación case-insensitive) y repinta.
- **A propósito no se llama a `ensureTag` real hasta el `submit`**: así, cancelar el modal (botón, clic fuera o Escape) nunca deja una etiqueta a medio escribir registrada en la lista maestra — solo se registra si el enlace se llega a guardar.
- Pegar texto con varias etiquetas de golpe (p. ej. `#a #b, #c`) se trocea con `tagsFieldCommitFromText(raw)`, que llama a `tagsFieldCommitToken` por cada trozo.

**Sugerencias mientras se escribe** (`getTagsFieldSuggestions()`): filtra `getAllTags()` por el texto actual del input (subcadena, case-insensitive, ignorando el `#`), excluyendo las etiquetas que ya son chips, limitado a 8 resultados. Se muestran en un desplegable propio (`#tagsSuggestions`, `role="listbox"`, `position:absolute`) navegable con flechas ↑/↓ y Enter, o con clic. Como `render()` no se ejecuta mientras el modal está abierto (solo tras guardar), las sugerencias leen `state.allTags` directamente en cada tecleo, sin depender de un repintado global.

**Backspace y borrado**: con el input de texto vacío, Backspace quita el último chip; el botón `×` de cualquier chip (`.tags-chip-remove`, con `aria-label="Eliminar etiqueta …"`) lo quita sin importar su posición.

**Tecla Escape — comportamiento distinto al del resto de la app a propósito**: el listener global de Escape (4.1) cierra cualquier modal abierto sin mirar dónde está el foco. Dentro de este campo, si hay un desplegable de sugerencias abierto o texto sin confirmar, Escape hace `e.stopPropagation()` y solo limpia ese estado local (cierra el desplegable, vacía el texto), **sin cerrar el modal** — evita perder por accidente el título/URL/descripción ya rellenados solo por cancelar una sugerencia a medio escribir. Si el campo ya está "limpio" (sin sugerencias ni texto pendiente), Escape no se intercepta y burbujea con el comportamiento heredado de siempre (cierra el modal). Es una mejora deliberada y acotada a este campo, no aplicada a los demás inputs del formulario.

**Por qué el `<label>` lleva `for="tagsInput"` explícito**: un `<label>` sin `for` se asocia implícitamente con el primer elemento "labelable" que encuentra en el DOM. Como los chips (cada uno con un `<button>` interno para el `×`) se insertan **antes** que `#tagsInput` en el propio contenedor, ese primer botón pasaba a ser el control asociado implícito — y un clic en cualquier parte no interactiva de la etiqueta (por ejemplo, una sugerencia del desplegable) reenviaba, por comportamiento estándar del HTML, un clic sintético a ese botón, borrando el primer chip sin que el usuario lo pidiera. Es un caso real de la especificación (no un error del navegador), reproducible con clics reales; el `for="tagsInput"` explícito fija sin ambigüedad cuál es el control asociado y elimina el reenvío accidental.

### 4.21 Selección múltiple de enlaces y acciones en lote

Objetivo: dejar de operar de uno en uno. Poner una etiqueta a treinta enlaces eran treinta viajes al modal de edición; es el cuello de botella que crece con el tamaño de la colección. No necesita ningún campo nuevo en el modelo de datos: reutiliza `ensureCategory`/`ensureTag`, `save()` y `render()`.

**Entrar y salir del modo**: botón `#btnSelectionMode` en la barra de herramientas (junto a `#btnToggleAllGroups`), cuya etiqueta refleja el estado ("Seleccionar" / "Salir de selección"). Con el modo activo, `#linksContainer` lleva la clase `selection-mode`, de la que cuelga todo el CSS del modo. Al desactivarlo la selección se vacía y las fichas vuelven exactamente a su comportamiento anterior (arrastrables, con sus iconos ▲▼✏️🗑️ y con el enlace del título navegando).

**Selección** (`state.selectionMode`, `state.selectedLinks`, ambos solo en memoria):
- Cada ficha muestra una casilla (`selectCheckHtml`, compartida por `cardHtml` y `cardHtmlCompact`) y, si está seleccionada, la clase `selected` en su elemento raíz — que conserva `.link-card`/`.link-card-compact` y `data-id` intactos, porque son superficie protegida (sección 8).
- **Un clic en cualquier parte de la ficha alterna su selección** y el `<a>` del título no navega (`preventDefault()` en el listener delegado de `#linksContainer`, el mismo que ya resolvía ▲▼✏️🗑️ y las etiquetas).
- Los iconos ▲▼✏️🗑️ **se ocultan** mientras el modo está activo (`.selection-mode .card-icon-actions{display:none}`): si un clic en cualquier sitio selecciona, no puede haber zonas de la ficha que hagan otra cosa.
- El **arrastrar y soltar se desactiva**: las fichas se pintan con `draggable="false"` y el manejador de `dragstart` sale antes de hacer nada si el modo está activo.
- Plegar y expandir grupos sigue funcionando con el modo activo (la cabecera se comprueba antes que la ficha en el listener).

**Barra de acciones** (`#selectionBar`, fija abajo y centrada): aparece solo con al menos un enlace seleccionado e indica cuántos hay. Sus botones se resuelven por `data-action` en un listener delegado sobre la propia barra:

| Acción | Comportamiento |
|---|---|
| + Etiqueta | `prompt()` → `normalizeTags()` + `ensureTag()`; añade la(s) etiqueta(s) a los seleccionados que no las tengan. Como pasa por `normalizeTags`, escribir varias de golpe (`a b`) las añade todas. |
| − Etiqueta | `prompt()` → `tagsFieldResolveCanonical()` (resolución de solo lectura, 4.20); la quita de los seleccionados que la tengan, **sin borrarla de la lista maestra**. |
| Categoría | `prompt()` → `ensureCategory()`, que la crea si no existía; la asigna a todos los seleccionados. |
| Activar / Desactivar | Fija `active` a `true` / `false`. |
| Eliminar | `confirm()` con el recuento explícito; borrado irreversible, como el de la papelera individual (4.1). |

Cada acción recorre la selección, muta `state.links` y **guarda una sola vez al final** (`save()`, más `saveAllTags()`/`saveCategories()` si tocó una lista maestra), nunca una vez por enlace, y termina en `render()`.

**Vaciado de la selección** (`clearSelectionOnViewChange()`): cualquier cambio en lo que se está viendo la vacía — filtro de categoría, etiquetas del lateral (incluida la escoba), perfil de vista, toggle Todos/Activos, búsqueda, modo de vista e importación. Tras una acción en lote, en cambio, la selección **se conserva** para poder encadenar varias sobre el mismo conjunto; la única excepción es "Eliminar", donde necesariamente se vacía.

## 5. Estructura del HTML

```
<div class="app">                       Grid de 2 columnas: sidebar (270px) + contenido
  <aside class="sidebar">
    Título editable (site-title)
    Botón "+ Nuevo enlace"
    Sección Categorías (lista + botón Gestionar)
    Sección Vistas (perfiles guardados + botón Guardar actual)
    Sección Etiquetas (nube + botón Gestionar)
    Exportar / Importar
    Pie: versión + créditos (app-footer)
  </aside>
  <main class="content">
    Toolbar: buscador + toggle estado + toggle vista + contador resultados
    #linksContainer            ← agrupado por categoría (ver 4.2)
    #emptyState                ← mensaje "sin resultados"
    #selectionBar              ← barra de acciones en lote, fija abajo (ver 4.21)
  </main>
</div>

#modalOverlay         Modal de alta/edición de enlace
#manageModalOverlay   Modal de gestión de categorías/etiquetas (genérico, reutilizado)
#importModalOverlay   Modal de decisión al importar (Fusionar / Sustituir todo / Cancelar)
```

## 6. Funciones JavaScript clave

| Función | Responsabilidad |
|---|---|
| `load()` / `save()` | Leer/escribir `state.links` en `localStorage` |
| `loadCategories()` / `saveCategories()` | Ídem para la lista maestra de categorías |
| `loadAllTags()` / `saveAllTags()` | Ídem para la lista maestra de etiquetas |
| `loadSiteTitle()` / `saveSiteTitle()` | Ídem para el título de la página |
| `loadViewMode()` / `saveViewMode()` | Ídem para el modo de vista |
| `loadCollapsedCategories()` / `saveCollapsedCategories()` | Ídem para el `Set` de categorías plegadas |
| `loadCategoryColors()` / `saveCategoryColors()` | Ídem para el mapa de colores por categoría |
| `loadCategoryIcons()` / `saveCategoryIcons()` | Ídem para el mapa de iconos por categoría |
| `loadTagColors()` / `saveTagColors()` | Ídem para el mapa de colores por etiqueta |
| `loadExcludedTags()` / `saveExcludedTags()` | Ídem para el `Set` de etiquetas excluidas de la vista (a diferencia de `state.tags`, esto sí se persiste) |
| `loadViewProfiles()` / `saveViewProfiles()` | Ídem para el array de perfiles de vista guardados |
| `ensureCategory(name)` / `ensureTag(tag)` | Normaliza y registra en la lista maestra (case-insensitive), único punto de verdad |
| `getCategories()` / `getAllTags()` | `getCategories()` devuelve `[{name, count}]`, con el recuento de uso y respetando el orden manual de `state.categories`. **`getAllTags()` devuelve solo los nombres** (array de cadenas), ordenados alfabéticamente y **sin recuento**: el recuento de etiquetas se calcula aparte, hoy en línea dentro de `renderManageList()` |
| `swapCategories(nameA, nameB)` | Intercambia la posición de dos categorías en `state.categories` por nombre (reordenación manual con ▲/▼ en el modal de gestión) |
| `moveCategoryTo(draggedName, beforeName)` | Mueve una categoría a la posición justo antes de `beforeName` (o al final si es `null`) — arrastrar y soltar en `#categoryList` |
| `duplicateEditingLink()` | Duplica el enlace que se está editando (título + `" _copia"`) y hace que el modal pase a editar la copia recién creada |
| `renderViewProfileList()` / `currentSelectionMatchesProfile(profile)` | Pintan los chips de perfiles de vista guardados / comprueban si un perfil coincide exactamente con `state.tags` y `state.excludedTags` (para marcarlo como activo) |
| `getFilteredLinks()` | Aplica todos los filtros activos sobre `state.links` (categoría, activos, etiquetas incluidas, etiquetas **excluidas** — 4.17, búsqueda), sin reordenar (ver nota "Orden" en sección 3) |
| `hasLinkSelection()` / `getLinksForExport()` | Deciden qué exporta el botón "Exportar" (4.7): sin categoría/etiquetas seleccionadas exporta todo; con alguna selección, solo esos enlaces (sin tener en cuenta búsqueda ni el toggle Todos/Activos) |
| `syncExportButtonLabel()` | Actualiza el `title` de `#btnExport` según `hasLinkSelection()`, llamada desde `render()` |
| `normalizeUrlForCompare(url)` | Normaliza una URL (trim, sin `/` final, minúsculas) para comparar duplicados |
| `findDuplicateUrl(url, excludeId)` | Busca un enlace existente con la misma URL normalizada, excluyendo un `id` (el que se está editando) |
| `swapLinks(idA, idB)` | Intercambia la posición de dos enlaces en `state.links` por `id` (reordenación manual con ▲/▼) |
| `moveLinkTo(draggedId, targetCategory, beforeId)` | Mueve un enlace (arrastrado) a una categoría, insertado antes de `beforeId` o al final si es `null` |
| `contrastTextColor(hex)` | Elige texto blanco o negro según la luminancia de un color de fondo |
| `categoryDotHtml(name)` / `tagChipStyle(tag)` | Generan el icono o punto de color de una categoría / el `style` inline de una etiqueta, si tienen color personalizado |
| `categoryIconSvg(key, color)` / `categoryTopBarStyle(name)` | Generan el `<svg>` de un icono de `CATEGORY_ICONS` con el color dado / el `style` de la barra superior de color de una ficha (vista cómoda) |
| `faviconUrl(url)` / `faviconImgHtml(url)` | Calculan la URL del favicon (servicio de Google, por dominio) / generan el `<img>` correspondiente, o cadena vacía si la URL no es válida |
| `hostnameForDisplay(url)` | Extrae el `hostname` de una URL para mostrarlo bajo el título (vista cómoda); cadena vacía si la URL no es válida |
| `render()` | Orquesta `renderSidebar()` + `renderCards()` + `syncStatusToggle()` + `syncToggleAllGroupsLabel()` |
| `renderCards()` | Agrupa por categoría (respetando plegado), calcula vecinos prev/next por grupo y genera el HTML (cómodo o compacto) |
| `cardHtml(l, prevId, nextId)` / `cardHtmlCompact(l, prevId, nextId)` | Plantillas de tarjeta por enlace, una por modo de vista |
| `moveButtonsHtml(l, prevId, nextId)` | Genera los botones ▲/▼ (o placeholders deshabilitados) compartidos por ambas plantillas |
| `selectCheckHtml(l)` / `cardDragAttrs(base)` | Casilla de selección (4.21) y atributos `draggable`/`title` de la ficha, compartidos por ambas plantillas: `draggable="false"` y tooltip de selección con el modo activo, comportamiento de siempre sin él |
| `toggleLinkSelection(id)` / `setSelectionMode(on)` / `clearSelectionOnViewChange()` | Alterna la selección de un enlace / entra y sale del modo selección (vaciando siempre la selección) / vacía la selección cuando cambia lo que se ve (filtro, búsqueda, vista) |
| `getSelectedLinks()` / `linkCountText(n)` | Enlaces de `state.selectedLinks` en el orden real de `state.links` / texto "N enlace(s)" de los diálogos y del recuento |
| `bulkAddTag()` / `bulkRemoveTag()` / `bulkSetCategory()` / `bulkSetActive(active)` / `bulkDelete()` | Las cinco acciones en lote (4.21): una sola operación de guardado por acción |
| `syncSelectionUi()` | Etiqueta del botón del modo, clase `selection-mode` del contenedor y visibilidad/recuento de `#selectionBar`, llamada desde `render()` |
| `toggleCategoryCollapse(cat)` | Pliega/expande un grupo de categoría y persiste el estado |
| `syncToggleAllGroupsLabel()` | Actualiza la etiqueta del botón "Plegar todo"/"Expandir todo" según el estado actual |
| `openManageModal(type)` / `renderManageList()` / `performRename(oldName, newValue)` | Modal de gestión: apertura, render (incluye modo edición inline y selector de color) y aplicación del renombrado |
| `performImportReplace(data)` / `performImportMerge(data)` | Las dos estrategias de importación (ver 4.7) |
| `parseImportFile(text)` | Enruta el texto de un archivo importado por contenido (JSON de PinBoard / `Bookmarks` de Chromium / HTML Netscape) y devuelve `{data, format}` (4.7) |
| `parseChromiumBookmarks(obj)` / `parseNetscapeBookmarks(text)` | Convierten, respectivamente, un `Bookmarks` de Chromium ya parseado y un HTML Netscape (vía `DOMParser`) al formato de enlace de PinBoard, deduplicando dentro del propio archivo (4.7) |
| `netscapeFolderPath(anchor)` | Sube desde un `A[href]` por sus ancestros `<DL>` para reconstruir la ruta de carpetas del HTML Netscape (4.7) |
| `handleImportFileText(text)` | Parte compartida entre el botón "Importar" y soltar un archivo: parsea, rellena `#importSummary` y abre `#importModalOverlay` (4.7) |
| `isInternalDrag()` | `true` si hay un arrastre interno en curso (ficha o categoría); usada por los manejadores de `document` para no interferir con el drag & drop interno al soltar un archivo (4.7) |
| `escapeHtml(str)` | Sanitiza cualquier texto antes de insertarlo como HTML (previene XSS) |
| `normalizeTags(raw)` | Parsea el texto libre de etiquetas del formulario en un array `#etiqueta` deduplicado |
| `genId()` | Genera IDs únicos: `Date.now().toString(36) + random` |
| `tagsFieldSetChips(tags)` / `renderTagsChips()` | Editor de chips de etiquetas (4.20): fijan/repintan los chips confirmados a partir de un array, usado al abrir el modal (edición o alta) y al cancelarlo |
| `tagsFieldCommitToken(raw)` / `tagsFieldCommitFromText(raw)` | Confirman un texto como chip (resolviendo el nombre canónico existente sin tocar `state.allTags`) / trocean un texto pegado con varias etiquetas y confirman cada una |
| `tagsFieldResolveCanonical(raw)` | Versión de solo lectura de `ensureTag`: resuelve el nombre canónico ya existente (case-insensitive) o el texto limpio con `#`, sin registrar nada en la lista maestra |
| `getTagsFieldSuggestions()` / `refreshTagsSuggestions()` | Calculan y pintan el desplegable de sugerencias filtrado por el texto actual del campo |

## 7. Decisiones de diseño relevantes (historial)

Recogidas aquí porque no son obvias a partir del código y explican *por qué* está así:

1. **`.modal-overlay[hidden]{display:none}`**: sin esta regla, un modal con `hidden` seguía visible porque la clase `.modal-overlay{display:flex}` (CSS de autor) pisaba al estilo nativo del atributo `hidden` (CSS de user-agent) — mismo nivel de especificidad, pero el origen "autor" siempre gana. Cualquier futuro overlay/modal debe respetar este patrón o añadir su propia regla `[hidden]`.
2. **Categorías/etiquetas con lista maestra separada de los enlaces**: se decidió así (en vez de derivarlas solo de `state.links`) para poder crear categorías/etiquetas vacías, conservarlas al borrar el último enlace que las usaba, y ofrecer un CRUD completo (renombrar/fusionar/eliminar) sin depender de que existan enlaces.
3. **Filtro de etiquetas multi-selección (OR)**: al hacer clic en una etiqueta se añade/quita de `state.tags` (`Set`); un enlace coincide si tiene alguna de las etiquetas seleccionadas. *(Nota histórica: en una versión anterior el clic sustituía la selección por una sola etiqueta; se cambió a acumulativa a petición explícita.)*
4. **Badge de categoría eliminado de las tarjetas**: al agrupar visualmente por categoría (sección 4.2), mostrarla también dentro de cada tarjeta era redundante. Se quitó del `cardHtml`/`cardHtmlCompact` y del CSS (`.badge`, `.badge.category`).
5. **Badges "Activo"/"Inactivo" eliminadas**: se sustituyeron por la opacidad reducida (`.link-card.inactive`, `.link-card-compact.inactive`) como único indicador visual de estado inactivo, para no duplicar información con el toggle "Todos/Activos".
6. **Iconos ✏️/🗑️/▲/▼ sin apariencia de botón**: clase `.icon-action-plain` (transparente, sin borde) en vez de `.btn-danger`/botón con relleno, para que no compitan visualmente con el título del enlace.
7. **Import: Fusionar vs Sustituir todo**: en vez de una sola sustitución completa, se ofrece elegir entre fusionar (deduplicando por URL normalizada) o sustituir. "Fusionar" es el botón primario (recomendado) porque es la opción no destructiva; "Sustituir todo" pide una confirmación adicional por ser irreversible. Tras cualquiera de las dos, el filtro de estado se resetea a `"all"` (no al valor por defecto `"active"`) para que el usuario vea inmediatamente el resultado, incluidos los inactivos.
8. **Reordenación manual basada en `id`, no en índices de array**: `swapLinks(idA, idB)` localiza ambos enlaces por `id` con `findIndex` antes de intercambiarlos, en vez de asumir posiciones. Los botones ▲/▼ se calculan sobre el **grupo ya filtrado** (`prevId`/`nextId` dentro de `groups[cat]`), no sobre `state.links` completo — así "subir" siempre mueve el enlace respecto a lo que el usuario ve en pantalla, aunque haya enlaces ocultos por el filtro intercalados en el array real.
9. **Duplicados por URL: avisan pero no bloquean**: tanto al guardar un enlace (`findDuplicateUrl`) como al fusionar una importación (`performImportMerge`) se compara por URL normalizada (sin barra final, minúsculas). Al crear/editar, se pregunta con `confirm()` y se permite continuar si el usuario insiste (puede haber razones legítimas, p. ej. mismo enlace en dos categorías). Al fusionar, en cambio, los duplicados se omiten silenciosamente (se informa el recuento al final) porque el objetivo explícito de "Fusionar" es no crear repetidos.
10. **Edición inline sustituyó a los `prompt()` de renombrado**: el modal de gestión ahora edita el nombre en la propia fila (`manageEditingName`); se mantuvo `prompt()`/`confirm()` para el título de la página y para las confirmaciones de borrado, por ser acciones puntuales de una sola línea donde el modal nativo sigue siendo la opción más simple.
11. **Arrastrar y soltar complementa, no sustituye, a los botones ▲/▼**: se mantuvieron ambos mecanismos porque el drag & drop es más rápido para mover un enlace lejos (a otra categoría o varias posiciones) pero es menos preciso/accesible que un botón; los botones ▲/▼ siguen siendo útiles para ajustes finos de un solo paso y para quien prefiera no usar el ratón de forma continua.
12. **Colores en mapas aparte, no en el modelo de datos de los enlaces**: `state.categoryColors`/`state.tagColors` son diccionarios `nombre → color` independientes de `state.links` y de las listas maestras. Así, añadir color no obliga a migrar el formato de los enlaces ya guardados (ni el JSON de exportación), y un color "huérfano" (de una categoría/etiqueta ya borrada) simplemente deja de usarse sin generar errores.
13. **El punto de color de categoría es solo un acento, no repinta la fila entera**: se descartó teñir el fondo completo de la tarjeta o del item de categoría porque con muchas categorías de colores fuertes el listado se vuelve difícil de leer; un punto pequeño basta para identificar de un vistazo sin comprometer la legibilidad del resto.
14. **El resaltado "activo" de una etiqueta usa `outline`, no solo `background`**: como el color personalizado de una etiqueta se aplica por `style` inline (que siempre gana a las reglas de clase), el estado "seleccionada" de una etiqueta ya no puede depender únicamente de cambiar su `background` por CSS — se añadió un `outline` en `.tag-chip.active`, que sí es una propiedad separada y por tanto visible incluso sobre un color inline.
15. **Atajos de teclado solo si no se está escribiendo ni hay un modal abierto**: `/` y `n` comprueban `e.target.tagName`/`isContentEditable` y el estado `hidden` de los tres overlays antes de actuar, para no interceptar esas teclas mientras el usuario escribe en cualquier campo (incluida una descripción que contenga la letra "n" o el carácter "/").
16. **Editor de chips de etiquetas: `ensureTag` real solo en el `submit`, nunca al escribir**: `tagsFieldResolveCanonical` reimplementa la búsqueda case-insensitive de `ensureTag` pero sin escribir en `state.allTags`. Si se hubiera llamado a `ensureTag` directamente en cada chip confirmado, cancelar el modal después de escribir una etiqueta nueva la habría dejado registrada en la lista maestra (visible en "Gestionar etiquetas") aunque el enlace nunca se guardara. Duplicar la lógica de resolución era preferible a esa fuga de estado.
17. **`<label for="tagsInput">` explícito en el campo de etiquetas**: sin el `for`, el `<label>` se asocia implícitamente con el primer elemento labelable en orden del DOM — y como los botones `×` de los chips (también `<button>`) se insertan antes que `#tagsInput`, un clic en cualquier descendiente no interactivo de la etiqueta (p. ej. una sugerencia del desplegable) reenviaba un clic sintético al primer chip y lo borraba. Comportamiento estándar de HTML, no un bug de navegador — se corrige fijando explícitamente el control asociado.
18. **Favicon vía servicio externo, sin guardarlo en los datos**: se optó por pedirlo en cada render a `google.com/s2/favicons` (un servicio de terceros ampliamente usado para este propósito) en vez de descargarlo y guardarlo en base64 dentro del enlace, para no inflar el JSON de exportación ni la cuota de `localStorage`. Contrapartida: requiere conexión a internet para verse (si no hay red, simplemente no aparece ningún icono, sin romper nada) y ese servicio recibe el dominio de cada enlace que se muestra — ver limitación de privacidad en la sección 9.

Las seis siguientes son las decisiones de la **selección múltiple y las acciones en lote** (4.21). Cada una cierra una ambigüedad que, resuelta de otra forma, choca con algo que ya existía:

19. **La selección no se persiste**: `state.selectedLinks` es un `Set` en memoria, como `state.tags`, y `state.selectionMode` tampoco se guarda. Recuperar al abrir la app una selección hecha ayer es desconcertante, y peligroso en cuanto la siguiente acción es un borrado en lote.
20. **En modo selección, el arrastrar y soltar se desactiva**: arrastrar mientras se seleccionan fichas es ambiguo, y el drag & drop de 4.9 no solo reordena, también cambia de categoría. Las fichas pasan a `draggable="false"` y `dragstart` sale antes de tiempo.
21. **Un clic en cualquier parte de la ficha alterna su selección, y el enlace del título no navega**: obligar a apuntar a una casilla diminuta haría inservible el trabajo en lote, que es justo el propósito de la función. Como contrapartida, los iconos ▲▼✏️🗑️ se ocultan mientras dura el modo, para que no queden zonas de la ficha que hagan otra cosa que seleccionar.
22. **Cambiar de filtro, de búsqueda o de vista vacía la selección**: mismo criterio que la confirmación al exportar con un filtro activo (decisión 9), y más estricto — **nunca se debe poder aplicar una acción en lote a enlaces que el usuario no está viendo**. Se aplica también al cambio de modo de vista (cómoda/compacta), donde no cambia *qué* se ve, por no dejar ninguna excepción que razonar.
23. **Tras una acción se conserva la selección, salvo al borrar**: encadenar "etiquetar + cambiar de categoría + desactivar" sobre el mismo conjunto es el uso normal. Al eliminar, los enlaces ya no existen y la selección se vacía. Nota: desactivar en lote con el filtro "Activos" puesto saca las fichas de la vista sin perder la selección — es deliberado, es el resultado de la acción que se acaba de pedir, no un cambio de filtro.
24. **Los diálogos usan `prompt()`/`confirm()` nativos**: coherente con la decisión 10 (el modal nativo es la opción más simple para una acción puntual de una línea). Reutilizar el editor de chips de etiquetas (4.20) queda como posible mejora posterior.

## 8. Contrato con la extensión de Chrome

`extension/background.js` nunca accede al DOM de `pinboard.html` directamente: pasa siempre por una superficie mínima y estable, `window.PinBoardBridge`, expuesta al final de la IIFE (`pinboard.html:2046-2072`). Cualquier cambio a los elementos listados abajo debe ir acompañado de una revisión de `extension/background.js` (función `callBridge`, líneas 47-67) — si no, la extensión deja de funcionar, normalmente **en silencio**: solo se ve un badge rojo "!" sobre el icono de la extensión (`flashBadge`, `background.js:69-73`), sin ningún error visible dentro de `pinboard.html`.

**Superficie exacta que debe mantenerse estable:**

| Elemento | Ubicación en `pinboard.html` | Para qué lo usa la extensión |
|---|---|---|
| `PinBoardBridge.checkDuplicate(url)` → `{id,title,category}` o `null` | líneas 2048-2051 | Detecta si la URL de la pestaña activa ya está guardada |
| `PinBoardBridge.focusExisting(url)` | líneas 2053-2056 | Desplaza la vista y resalta la ficha si ya existe |
| `PinBoardBridge.suggestCategory(title, description, url)` → string | línea 2059 | Sugiere una categoría existente por coincidencia de palabras |
| `PinBoardBridge.prefillAndOpen({category,title,url,description})` | líneas 2062-2071 | Abre el modal de "Nuevo enlace" precargado |
| Clases `.link-card` / `.link-card-compact` + atributo `data-id` en el elemento raíz de cada ficha | `highlightLink()`, líneas 2038-2044 | `focusExisting` busca la ficha por estos selectores para resaltarla; si no los encuentra (p. ej. ficha filtrada/oculta), la llamada no hace nada, sin error |
| Ids de campo `fieldCategory`, `fieldTitle`, `fieldUrl`, `fieldDescription` | `openModal()`, línea 1847 | `prefillAndOpen` los rellena con `getElementById(...).value = ...` |

**Regla práctica al añadir cualquier funcionalidad nueva**: si no se toca ninguno de los elementos de la tabla, la extensión no se ve afectada. Si se toca alguno (p. ej. se rediseñan las fichas de enlace), hay que comprobar expresamente que lo que exige esta tabla se mantiene, y pasar la checklist manual siguiente antes de dar el cambio por cerrado.

*(Nota: el campo de etiquetas ya se rediseñó como editor de chips — 4.20 — precisamente porque `fieldTags` nunca formó parte de esta tabla protegida: `prefillAndOpen` no lo rellena, así que se pudo cambiar su estructura interna libremente sin tocar el contrato.)*

*(Nota: la selección múltiple — 4.21 — sí toca las fichas, y por eso la casilla se añade **dentro** de la ficha, sin envolverla en ningún contenedor que desplace su elemento raíz: la clase `.link-card`/`.link-card-compact` y el `data-id` siguen exactamente donde estaban, y la clase `selected` solo se suma a las que ya llevaba. `highlightLink()` sigue encontrando la ficha con el modo selección activo o sin él.)*

**Checklist de verificación manual** (no hay tests automatizados en el proyecto — ver sección 10):
1. Abrir una pestaña con una URL que **no** esté guardada y pulsar el icono de la extensión → debe abrirse `pinboard.html` con el modal "Nuevo enlace" ya precargado (título, URL, descripción, categoría sugerida).
2. Repetir con una URL que **sí** esté guardada → no debe abrirse el modal; la vista debe desplazarse hasta la ficha existente y resaltarla brevemente.
3. Si el paso 2 no resalta nada pero tampoco da error, comprobar si hay un filtro activo (categoría, etiqueta excluida, búsqueda) ocultando esa ficha — es el comportamiento esperado, no un fallo del puente.

## 9. Estructura del repositorio

| Ruta | Propósito |
|---|---|
| `pinboard.html` | La aplicación (único archivo necesario para usarla) |
| `extension/` | Extensión de navegador (Chrome/Edge, Manifest V3) que captura la pestaña activa y la añade a `pinboard.html` — ver `README.md` para instalación |
| `tools/convertir_marcadores.py` | **Opcional** — la vía recomendada para migrar marcadores es exportarlos del navegador (Ctrl+Shift+O → Exportar) y soltar el archivo sobre `pinboard.html` (4.7), que los reconoce sin ninguna herramienta externa. Este script sigue siendo útil para convertir **varios perfiles/navegadores de golpe** desde la línea de comandos: convierte marcadores de Chrome y/o Edge (`Bookmarks`, formato Chromium JSON) al formato de importación de `pinboard.html`. No lleva ninguna ruta escrita: lee `sources` (lista de `{browser, profile, bookmarksPath}`) y `outputPath` desde un archivo de configuración JSON (`marcadores_config.json` junto al script por defecto, o `--config <ruta>`). Recorre recursivamente cada `Bookmarks`, usa la ruta de carpetas como `category` (unidas con `" / "`), deduplica por URL entre todas las fuentes, y escribe el resultado en `outputPath`. Es la referencia de comportamiento que replica `parseChromiumBookmarks` dentro de `pinboard.html` (4.7). |
| `tools/configurar_marcadores.html` | Página autocontenida (sin dependencias) para generar `marcadores_config.json` con un formulario, en vez de escribirlo a mano. Incluye una tabla de referencia con las rutas típicas de `Bookmarks` por sistema operativo y navegador. |
| `tools/marcadores_config.example.json` | Plantilla de ejemplo del archivo de configuración anterior, con rutas ficticias. `marcadores_config.json` (el real, con rutas de tu máquina) no se versiona. |
| `examples/ejemplo-enlaces.json` | Enlaces de muestra (genéricos, no personales) cargables con "Importar" para ver la app con contenido. |
| `docs/ESPECIFICACIONES.md` | Este documento. |
| `docs/tareas/` | Requisitos detallados de las tareas del backlog listas para acometer, una por archivo (objetivo, decisiones ya tomadas, requisitos numerados, fuera de alcance, invariantes y checklist de verificación manual). Se borra el archivo al implementar la tarea. |
| `CLAUDE.md` | Convenciones de código y restricciones de arquitectura del proyecto, para cualquier agente o persona que vaya a modificar `pinboard.html`. |
| `README.md` | Instrucciones de instalación y configuración de la app y la extensión. |
| `LICENSE` | Licencia MIT. |

## 10. Compatibilidad y limitaciones conocidas

- Requiere un navegador moderno con soporte de `localStorage`, `<dialog>`-like overlays manuales, `Set`, `Array.prototype.find`/`findIndex`, plantillas de cadena no usadas (se usa concatenación `+` deliberadamente por compatibilidad ES5-friendly).
- No hay sincronización entre dispositivos/navegadores: cada `localStorage` es local a un perfil de navegador en una máquina. Exportar/Importar es el mecanismo manual de respaldo/traslado.
- No hay límite de enlaces impuesto por la app; el límite real es la cuota de `localStorage` del navegador (habitualmente 5-10 MB).
- El borrado en el modal de gestión, y el título de la página, siguen usando `confirm()`/`prompt()` nativos del navegador (el renombrado de categorías/etiquetas ya es inline — ver decisión 10 de la sección 7).
- El arrastrar y soltar usa la API nativa HTML5 Drag and Drop, pensada para ratón — en pantallas táctiles el reordenamiento solo es posible con los botones ▲/▼ (que si funcionan por toque).
- Para colores personalizados fuera de la paleta fija de 12 tonos (4.10) se usa el `<input type="color">` nativo del navegador, cuyo aspecto exacto varía entre Windows/Chrome/Edge/Firefox.
- **Los favicons requieren internet y pasan por un tercero**: al mostrarse vía `google.com/s2/favicons`, cada dominio visible en tu lista de enlaces se envía a Google en cada carga de página (igual que hace cualquier navegador al mostrar el favicon de una pestaña, pero de forma explícita para *todos* los enlaces guardados a la vez, no solo el que estés visitando). Sin conexión, los enlaces se ven igualmente pero sin icono. Si esto es un problema, se puede sustituir `faviconUrl()` por una llamada directa a `https://<dominio>/favicon.ico` (menos fiable, pero sin intermediario).
- Diseño responsive básico: por debajo de 780px el sidebar pasa a estar apilado sobre el contenido y las etiquetas de la vista compacta se ocultan para ahorrar espacio.

## 11. Backlog de ideas (no implementadas)

Todas las ideas que figuraban aquí en rondas anteriores (multi-selección de etiquetas, plegado de categorías, edición inline, detección de duplicados, importación con fusión, reordenación manual, arrastrar y soltar, colores personalizados —incluida la paleta predefinida de 12 tonos, 4.10—, atajos de teclado, plegar/expandir todo, contadores por categoría en el sidebar, favicon por enlace, y la selección múltiple de enlaces con acciones en lote) se implementaron — ver secciones 4.2 a 4.21 y las decisiones de la sección 7.

Cualquier idea de esta lista debe respetar la restricción de arquitectura de la sección 2: JS/CSS vanilla dentro del mismo `pinboard.html`, sin frameworks, sin build step y sin servidor.

### 11.1 Pendientes, por prioridad

| Prioridad | Idea | Notas de implementación |
|---|---|---|
| **Alta** | **Paleta de comandos (Ctrl+K)** | Un único desplegable que busca a la vez enlaces y *acciones* ("Exportar", "Gestionar categorías", "Ir a categoría X"), navegable con flechas y Enter. Es la forma correcta de resolver lo que se descartó como "más atajos de teclado" (11.2): **un atajo en lugar de diez**, y descubrible leyendo en vez de memorizando. Reutiliza `getFilteredLinks()` y el patrón de navegación por flechas ya escrito para las sugerencias de etiquetas (4.20). Efecto secundario valioso: al listar cada acción por su nombre, es en sí mismo un sistema de ayuda. **Requisitos listos para acometer en [`docs/tareas/04-paleta-de-comandos.md`](tareas/04-paleta-de-comandos.md)**, incluida la decisión de arquitectura del registro de comandos y un requisito previo que corrige dos fallos vivos en la comprobación de overlays abiertos. |
| **Alta** | **Búsqueda con operadores** | El mismo `#searchInput`, entendiendo `cat:desarrollo`, `#referencia`, `-#trabajo`, `site:github.com` y `"frase exacta"`. Un parser de ~40 líneas dentro de `getFilteredLinks()`; sin texto con operadores sigue funcionando como la subcadena de siempre (4.3), así que no hay UI nueva ni comportamiento que desaprender. Pegar una URL en el buscador encuentra su enlace sin ningún caso especial, con solo añadir la URL al texto sobre el que se busca (hoy no se incluye). **Requisitos listos para acometer en [`docs/tareas/05-busqueda-con-operadores.md`](tareas/05-busqueda-con-operadores.md)**, con un cambio de comportamiento deliberado: varias palabras pasan a combinarse en AND en vez de exigir la secuencia literal. |
| **Alta** | **Notas Markdown por enlace, capturadas desde la página** | Campo `notes` acumulativo por enlace, alimentado desde la extensión (incluida la captura de la selección de texto como cita). Convierte PinBoard de "donde guardo enlaces" en "donde guardo lo que sé sobre esos enlaces". **Requisitos funcionales en 11.3 y tarea completa en [`docs/tareas/06-notas-markdown.md`](tareas/06-notas-markdown.md)** — leer antes de implementar: hay cinco lugares que enumeran los campos de un enlace y omitir cualquiera destruye datos en silencio. |
| **Alta** | **Post-its en la propia página del enlace (fase 1)** | Al visitar una página que ya está en PinBoard, ver sus notas sin abrir PinBoard: panel plegable en una esquina, **sin anclar a ningún punto del contenido**. **Acometer a continuación de las notas (11.3)**, de las que depende directamente: no añade modelo de datos nuevo, son las mismas notas en una segunda superficie. **Análisis de las dos fases en 11.4** — la versión anclada al contenido es mucho más cara de lo que parece y rompe una premisa de la arquitectura; la fase 1 da la mayor parte del valor sin pagarla, y con el recuento en el badge del icono evita incluso el permiso `<all_urls>`. **Requisitos listos para acometer en [`docs/tareas/07-postits-fase1.md`](tareas/07-postits-fase1.md).** |
| **Alta** | **Ayuda: panel "?" con la chuleta de atajos y gestos** | Un modal con cuatro bloques (atajos, gestos de arrastre, filtros —los tres estados de etiqueta y Ctrl+clic—, datos). Se abre con `?`, que está libre: el manejador actual compara `e.key === "/"` y con Shift la tecla es `?`. Contenido en un único array `HELP_SECTIONS` en el JS, junto al código, porque tiene coste de mantenimiento real (cada función nueva pide su línea). Debe ser **conductual y corto**, nunca un espejo de este documento. **Acometer después de la paleta de comandos**: la paleta ya documenta las *acciones* por su nombre, así que lo que quedará por cubrir son los *gestos*, que no son comandos y no pueden salir en una paleta — y así el panel cabe en una pantalla. Ver 11.5. **Requisitos listos para acometer en [`docs/tareas/09-panel-de-ayuda.md`](tareas/09-panel-de-ayuda.md)**, que incluye el inventario completo de lo que hay que documentar, marcando lo que hoy es indescubrible. |
| **Alta** | **Corregir: el `id` de un enlace se inserta en el HTML sin escapar** | Fallo latente ya verificado. `cardHtml`, `cardHtmlCompact` y `moveButtonsHtml` concatenan `data-id="' + l.id + '"` (y `data-target`) **sin pasar por `escapeHtml()`**, saltándose la regla de que todo dato de usuario que entra como HTML se sanea. Con los `id` que genera la app (`genId()`, alfanuméricos) no puede pasar nada, pero **`performImportReplace` conserva el `id` que venga en el archivo importado** (`id: l.id || genId()`): basta un JSON ajeno con un `id` que contenga una comilla para romper el atributo y, desde ahí, inyectar atributos o marcado en la ficha. Efecto colateral en la misma línea: rompe el elemento raíz de la ficha y con él el contrato de la sección 8, y `highlightLink()` construye un selector con el `id` que lanzaría excepción. **Arreglo por los dos lados**: escapar el `id` allí donde se pinta (es la corrección real, ~4 líneas) y, además, sanear o regenerar los `id` no válidos al importar. Comprobar de paso el resto de valores que se concatenan como atributo sin escapar (`data-target`). |
| **Media** | **Exportación autocontenida: la app con los datos dentro** | Segundo formato en el botón "Exportar" existente (no un botón nuevo): un `pinboard.html` con **todo el estado** incrustado en un `<script type="application/json">` — enlaces, categorías con su orden/color/icono, etiquetas y sus colores, perfiles de vista, título y modo de vista. Un solo archivo que es programa y datos: USB, correo, equipo nuevo, sin paso de importación. Se serializa el DOM vivo con `document.documentElement.outerHTML` sobre un clon limpio (vaciando los ocho contenedores que se repintan: `#categoryList`, `#tagCloud`, el `<datalist>`, `#viewProfileList`, `#linksContainer`, sugerencias y chips de etiquetas, `#manageList`) — no hace falta leer el archivo del disco, imposible en `file://`. **Regla de compatibilidad**: el JSON de enlaces sigue siendo el canal oficial para mover datos entre versiones; este formato congela también el código de la app, así que el seed lleva sello de versión y fecha, y **nunca se aplica solo si ya hay datos** (reglas de siembra en 11.6). |
| **Media** | **Panel de limpieza** | Botón "Revisar" en el sidebar junto a Exportar/Importar (es mantenimiento, misma familia) que abre un modal con comprobaciones, cada una plegable con su recuento: URLs duplicadas ya guardadas, enlaces con URL inválida, enlaces sin etiquetas, etiquetas sin uso, categorías con un solo enlace, títulos repetidos con URL distinta, dominios repartidos entre varias categorías, URLs con parámetros de seguimiento. **El panel no modifica nada por sí mismo**: cada fila ofrece "Ver estos N", que cierra el modal y deja la vista filtrada en ese conjunto para arreglarlo con la UI normal — con la selección en lote (4.21), de un gesto. Eso es lo que lo mantiene en ~150 líneas. Cálculo puro sobre `state.links`, sin tocar el modelo. Dos comprobaciones lo justifican solas: las **URLs inválidas** hoy fallan en silencio (solo se manifiestan como falta de favicon, 4.11) y los **duplicados ya dentro** nunca se listan, porque el dedupe solo actúa al guardar e importar. Sitio natural para alojar más adelante el aviso de backup. **Requisitos listos para acometer en [`docs/tareas/08-panel-de-limpieza.md`](tareas/08-panel-de-limpieza.md).** |
| **Media** | **Fase 2 de las notas: mini-renderizador Markdown** | Cinco construcciones (negrita, cursiva, enlaces, listas, cita) en ~60 líneas de regex, aplicadas **después** de `escapeHtml`, nunca antes — ese orden es lo que lo mantiene a salvo de XSS y respeta que `escapeHtml` sea el único saneador de la app. Solo si la fase 1 (texto plano con `white-space: pre-wrap`) se queda corta en el uso real. Ver 11.3. |
| **Media** | **Copiar URL al portapapeles** | Icono junto a cada enlace (ambos modos de vista) que copie `l.url` con `navigator.clipboard.writeText`. Ojo: en `file://` el API de portapapeles puede estar restringido según navegador, así que conviene un `fallback` con `document.execCommand("copy")` sobre un `<textarea>` temporal. Requiere tocar `cardHtml`/`cardHtmlCompact` — revisar la tabla de la sección 8 antes de cerrar el cambio. |
| **Media** | **Arrastrar una URL desde otra ventana** | Soltar un enlace arrastrado desde otra pestaña/ventana sobre la página abre el modal de "Nuevo enlace" precargado; si se suelta sobre un grupo de categoría concreto, ya va clasificado en ella. El manejador de `drop` de `#linksContainer` ya existe para reordenar (4.9): basta distinguir el arrastre externo leyendo `text/uri-list` del `dataTransfer`. Funciona sin instalar la extensión. |
| **Baja** | **Exportar a Netscape Bookmark HTML** | Formato estándar que importan todos los navegadores. Es solo generar otra plantilla de texto (`<DL><DT><A HREF="...">`) con el mismo mecanismo Blob + `URL.createObjectURL` que ya usa 4.7; las categorías se mapean a carpetas `<H3>`. Debería respetar `getLinksForExport()` igual que el JSON. |
| **Baja** | **Exportar a Markdown** | Lista agrupada por categoría (`## Categoría` + `- [Título](url) — descripción`), para pegar en notas. Mismo mecanismo de descarga y misma decisión sobre qué enlaces incluye (`getLinksForExport()`). |
| **Baja** | **Icono generado localmente como *fallback* del favicon** | Hoy, si el favicon de Google no carga, el `<img>` se autodestruye (`onerror="this.remove()"`, 4.11) y queda un hueco. Cambio: sustituirlo por un icono generado en local — color derivado del hash del dominio + iniciales, como hacen Gmail o Notion con los avatares. Con red se ven los favicons reales de siempre; sin red, o con el servicio bloqueado, un icono legible en vez de nada. ~15 líneas, **sin ninguna opción que configurar**: es una mejora estricta sobre el estado actual. No resuelve la limitación de privacidad de la sección 10 (el dominio sigue enviándose a Google cuando hay red); eliminarla del todo exigiría hacer el icono local *siempre*, que es una decisión distinta —privacidad frente a reconocimiento visual de marca— y no se toma aquí. **Si algún día se añade un panel de Ajustes, reconsiderar la variante conmutable** (las dos fuentes de icono, a elección del usuario): hoy no se justifica un panel de configuración entero para una sola opción, pero hay al menos dos candidatas más esperando (aviso de backup, fuente de iconos). |
| **Muy baja** | **Papelera con deshacer** | Al borrar, mover el enlace a un array temporal con marca de tiempo y mostrar un aviso "Enlace eliminado — Deshacer" durante unos segundos, en vez del borrado inmediato e irreversible actual (4.1). Sustituiría el `confirm()` del icono 🗑️. |
| **Muy baja** | **Aviso de backup** | Guardar `lastExportDate` en `localStorage` al exportar (4.7) y mostrar un aviso discreto si han pasado, p. ej., 30 días sin exportar. Mitiga el riesgo de pérdida total por vivir solo en `localStorage` (limitación ya documentada en la sección 10). |
| **Muy baja** | **Contador de clics / último acceso** | Incrementar un contador local al abrir un enlace, para poder ordenar por "más usados". Choca de frente con la decisión de que el orden es siempre manual (sección 3 y 4.9): tendría que ser un modo de orden alternativo y explícito, nunca el de por defecto. |
| **Muy baja** | **Soporte táctil para arrastrar y soltar** | La API nativa HTML5 Drag and Drop está pensada para ratón; en pantallas táctiles solo funcionan los botones ▲/▼ (sección 10). Habría que implementarlo con eventos `touchstart`/`touchmove`/`touchend` en paralelo, reutilizando `moveLinkTo`/`moveCategoryTo` como punto de aplicación. |
| **Muy baja** | **QR local del enlace** | Generar el QR en canvas/SVG puro para abrir un enlace en el móvil sin escribir la URL. Encaja con la filosofía de no depender de red, pero implica escribir un codificador QR desde cero (no hay librería externa posible) — de ahí la prioridad. |

### 11.2 Descartadas y aparcadas (y por qué)

Se registran aquí para no volver a proponerlas en rondas futuras. **Aparcada** significa que la idea es buena pero se decidió no abordarla ahora; el análisis se conserva para cuando se retome.

- **(Aparcada) El archivo como fuente de verdad, con sincronización por carpeta sincronizada**: usar la File System Access API (`showSaveFilePicker` + handle persistido en IndexedDB) para que `save()` reescriba un JSON del disco, convirtiendo `localStorage` en caché. Si ese archivo vive en una carpeta sincronizada (OneDrive, Dropbox, Drive, Syncthing, unidad de red, un repo git), la sincronización la da la carpeta y PinBoard no integra ningún servicio: sin servidor, sin cuentas, sin API de terceros. Sería la única vía para eliminar la limitación nº 1 de la sección 10. Si se retoma, **hay dos incógnitas que se comprueban en cinco minutos**: (1) si el permiso sobre el handle sobrevive al cierre del navegador con origen `file://` (los permisos se guardan por origen y `file://` es un origen opaco, justo el caso en que no se pueden persistir), y (2) si IndexedDB funciona en `file://` en Chrome, porque sin ella no hay dónde guardar el handle —no es serializable a JSON, así que `localStorage` no sirve—. Si la respuesta es no, el modo degradado sigue siendo útil: un clic de "Reconectar" por sesión y el resto de la sesión escribe sola. Límite conceptual que habría que documentar sin ambigüedad: **no es sincronización, es un archivo compartido con detección de conflictos** (contador de revisión dentro del archivo, relectura al volver a la pestaña vía `visibilitychange`, y fusión reutilizando el dedupe por URL que ya existe); sirve para "trabajo en un equipo a la vez y quiero encontrarlo todo en el otro", no para edición simultánea. Regla de seguridad no negociable: **nunca escribir un array vacío sobre un archivo que tenía datos** sin confirmación explícita, para que un fallo de lectura no pueda vaciar el archivo bueno.
- **Tour interactivo guiado de bienvenida**: uno o dos días de trabajo, los usuarios lo saltan, y en un archivo único envejece mal. Es la opción de ayuda que parece más profesional y la que menos rinde; el retorno está en los estados vacíos y en la chuleta (11.5).
- **Variante de solo lectura de la exportación autocontenida** (el mismo archivo sin botones de edición, para consultar): descartada por no aportar sobre la exportación completa, que ya se puede consultar igual.

### 11.3 Notas Markdown por enlace — definición de requisitos

Objetivo: que un enlace guarde **lo que el usuario sabe o piensa sobre él**, no solo su título y descripción. La descripción es un resumen de una línea que se pinta en la ficha; una nota es texto largo que se acumula con el tiempo. El valor real aparece en la búsqueda: poder encontrar un enlace por algo que tú escribiste sobre él.

La extensión ya resuelve la mitad del problema sin cambios: `checkDuplicate(url)` **ya** dice si el enlace existe y `prefillAndOpen` **ya** crea uno nuevo (sección 8), así que la bifurcación "si existe añade la nota, si no créalo con ella" es una decisión que el puente ya sabe tomar.

**R1 — Campo nuevo, no reutilizar `description`.** Se añade `notes` (string, opcional) al modelo de datos de la sección 3. Retrocompatible sin migración: los enlaces ya guardados lo tienen `undefined`, que se trata como `""`.

**R2 — Las notas no se pueden perder en ningún camino.** Requisito explícito, y hay un **fallo latente ya verificado en el código actual**: la exportación usa `JSON.stringify(links)` (`pinboard.html:2514`), que serializa el objeto completo y por tanto incluiría `notes` sola; pero **cinco lugares enumeran los campos de un enlace uno por uno**, y en todos ellos un campo nuevo se descarta en silencio: `performImportReplace` (`pinboard.html:2532-2542`), `performImportMerge` (`pinboard.html:2564-2572`), `duplicateEditingLink` (`pinboard.html:1616-1630`) y las dos ramas del `submit` del formulario —edición y creación— (`pinboard.html:1674`). Es una línea en cada uno, pero omitir cualquiera produce pérdida de datos silenciosa, que es el peor tipo. Aplica igual a la exportación autocontenida (11.6).

**R3 — Formato y acumulación.** Las notas se añaden al final, cada una con un sello de fecha como encabezado Markdown (`## DD/MM/AAAA` y el texto debajo). Predecible, editable a mano, sin lógica de listas. Nunca se sobrescribe una nota anterior.

**R4 — Captura desde la extensión.** Dos entradas de menú contextual (`chrome.contextMenus`), que no necesitan popup:
- *"Guardar en PinBoard"* — el comportamiento actual.
- *"Añadir selección como nota en PinBoard"* — sobre una selección de texto: la captura como cita (`>`) con su fecha y la asocia al enlace de esa página, creándolo si no existía. **Esta es la función que da el valor**: convierte PinBoard en una herramienta de investigación ligera sin cambiar lo que es — sigue siendo una lista de enlaces, solo que los enlaces recuerdan por qué se guardaron.

**R5 — Superficie del puente.** Un método nuevo `PinBoardBridge.appendNote({url, note, title, description})`: si la URL existe, añade la nota al enlace; si no, crea el enlace con ella. **Es una ampliación de la superficie protegida de la sección 8 y hay que documentarla ahí**, con su entrada en la tabla y su paso en la checklist de verificación manual.

**R6 — Visualización en PinBoard.** No se pinta la nota en la ficha (reventaría la cuadrícula): un indicador discreto (📝) en las fichas que tienen notas, y un `<textarea>` en el modal de edición. **Fase 1: el Markdown se guarda y se muestra tal cual**, escapado con `escapeHtml` y con `white-space: pre-wrap` para conservar los saltos de línea — las notas son para leerlas uno mismo, no para publicarlas, así que ahí el MD es una convención de escritura, no un formato de salida. La fase 2 (mini-renderizador) está en 11.1 con prioridad media y **solo** si el uso real la pide.

**R7 — Búsqueda.** `getFilteredLinks()` debe incluir `notes` en el texto sobre el que busca (hoy concatena título + descripción + etiquetas, 4.3). Es una palabra de código y es la mitad del valor de la función. Compone con la búsqueda por operadores de 11.1: `note:índices`.

### 11.4 Post-its en la página del enlace — análisis y fases

Idea: que al volver a una página sobre la que se tomaron notas, esas notas reaparezcan **sobre la propia página**, sin abrir PinBoard.

**Valoración**: la idea es excelente y es lo que hacen productos de anotación web como Hypothesis o Diigo — con servidor. Pero en su versión completa **rompe una premisa de la arquitectura**, y conviene ver exactamente dónde antes de decidir el alcance.

**El problema de fondo: dónde viven los datos.** Las notas están en el `localStorage` de `pinboard.html`, que un *content script* inyectado en otra página **no puede leer** (origen distinto), y el puente de la sección 8 solo funciona cuando la pestaña de PinBoard está abierta. Para que un post-it aparezca "al volver a la página", el dato tiene que estar disponible sin que PinBoard esté abierto — lo que obliga a guardarlo también en `chrome.storage.local`. Es decir: **un segundo almacén de datos y un protocolo de sincronización entre los dos**, con cola de escrituras pendientes y resolución de conflictos. PinBoard deja de ser "un archivo HTML con sus datos" y pasa a ser un sistema de dos piezas con estado propio cada una. Es un salto mucho mayor que cualquier otra cosa de este backlog, y casi todo el coste cae en la extensión, que hoy es deliberadamente un cliente fino con cinco métodos.

**Los otros dos problemas de la versión anclada:**
- **Anclaje.** Situar un post-it *en un punto* de la página es un problema conocidamente difícil: por coordenadas absolutas se rompe con cualquier cambio de maquetación o de tamaño de ventana; por selector CSS o por texto seleccionado se rompe cuando la página cambia de contenido, y en una SPA se rompe al navegar.
- **Permisos.** Requiere un content script sobre `<all_urls>`, que en la instalación pide *"leer y cambiar todos tus datos en todos los sitios web"*. Para una extensión que se instala descomprimida, es un coste de confianza real y desproporcionado si el usuario solo quería marcadores.

**Fase 1 (la recomendada, en 11.1 con prioridad media): recordatorio, no post-it anclado.** Al visitar una página que ya está en PinBoard, sus notas se muestran en un panel plegable en una esquina — **sin anclar a ningún punto del contenido**, lo que lo hace inmune a todos los problemas de anclaje. Da la mayor parte del valor ("vuelvo aquí y veo lo que anoté") por una fracción del coste, y **no necesita modelo de datos nuevo**: las notas son las de 11.3. Una sola función de notas, dos superficies donde se ven.

Truco para evitar `<all_urls>` incluso en la fase 1: el `background` puede leer la URL de la pestaña activa con el permiso `tabs` y **poner el recuento en el badge del icono** ("2"), sin inyectar nada en ninguna página; el panel se inyecta solo bajo una acción explícita del usuario, con `activeTab`. Se conserva casi toda la magia —ves que hay algo anotado ahí— sin pedir permiso para modificar todos los sitios web.

Dos precisiones que salieron al detallar la tarea (requisitos completos en [`docs/tareas/07-postits-fase1.md`](tareas/07-postits-fase1.md)):

- **El disparador no puede ser "pulsar el icono" si existe el popup** de escritura de notas (R6 de la tarea 06): declarar un `default_popup` desactiva `chrome.action.onClicked`. El panel se dispara desde una entrada de menú contextual, y opcionalmente desde un botón del propio popup. La división de trabajo entre ambas superficies es clara: el popup es transaccional (escribir y cerrar) y el panel es persistente (leer las notas mientras lees la página) — **un popup se cierra al pulsar fuera, y eso lo hace inservible como acompañante de lectura**.
- **El badge sí obliga a una copia local**, porque hay que saber si la página tiene notas sin PinBoard abierto. Lo que la mantiene dentro de los límites de la fase 1 es que sea una **proyección de solo lectura** (mapa `URL → número de notas`, sin el texto), de **dirección única** (PinBoard escribe, la extensión lee, nunca al revés, así que no hay cola de pendientes ni conflictos) y **descartable** en cualquier momento sin pérdida. En cuanto haya escritura de vuelta, se ha entrado en la fase 2.

**Fase 2 (post-its anclados al contenido, varios por página): sin priorizar, no descartada.** Exige modelo de datos propio (posición o ancla, id, color), el segundo almacén con su sincronización, y aislamiento en shadow DOM para no chocar con el CSS ni con la CSP del sitio anfitrión. Reevaluar **solo** si la fase 1 demuestra que la función se usa de verdad.

### 11.5 Ayuda al usuario — diagnóstico y decisión

Diagnóstico: **no hay un problema de documentación, hay un problema de descubribilidad.** Son cosas distintas y se arreglan en sitios distintos. La landing del proyecto y el README de GitHub sirven para *evaluar* ("¿me sirve esto?") e *instalar*; no sirven para *operar*. Un usuario que necesita salir de la app y buscar en GitHub cómo se hace algo no lo hace: abandona la función y sigue usando el 30% que descubrió solo.

Y PinBoard acumula mucha potencia invisible. Hoy nada en pantalla insinúa que existan: **Ctrl+clic** para multi-selección de categorías (4.18); el **triple estado** de una etiqueta al pulsarla repetidamente —neutra → incluida → excluida— (4.17), que es directamente indescubrible porque nadie hace tres clics en el mismo sitio para ver qué pasa; que se pueden **arrastrar** tanto enlaces como categorías (4.9, 4.14); los perfiles de Vistas; los atajos `/` y `n` (4.12); que la cabecera de un grupo se pliega al pulsarla (4.2); que "Exportar" cambia de significado si hay un filtro puesto (4.7).

**Asimetría estructural que decide la cuestión**: la ayuda alojada en GitHub no se puede leer desde la app, que corre en `file://`. La ayuda embebida **viaja dentro del archivo** — y eso pesa mucho más si se implementa la exportación autocontenida (11.6) y los archivos empiezan a pasar de mano en mano. Un `pinboard.html` que alguien te pasa y se explica solo es un producto; uno que remite a un repositorio, no.

Decisión adoptada, por orden de retorno: **estados vacíos que enseñan y `title` en todo lo interactivo** (prioridad muy alta, media hora cada uno, ninguna decisión que tomar); **panel "?" con la chuleta** (prioridad alta, después de la paleta de comandos, que ya cubre las acciones y deja solo los gestos por documentar); **tour interactivo guiado, descartado** (11.2).

### 11.6 Exportación autocontenida — reglas de siembra

**Qué incluye el bloque incrustado: todo el estado, no solo los enlaces.** Es la diferencia esencial con el JSON de enlaces de 4.7, que a propósito omite las listas maestras porque se regeneran al importar. Aquí el objetivo es abrir el archivo en otro equipo y encontrarlo **igual**, así que el seed lleva enlaces (con sus `notes`, R2 de 11.3), categorías con su orden, colores e iconos, etiquetas con sus colores, perfiles de vista, título de la página y modo de vista. Más un sello de versión de la app, fecha de exportación y recuento, para el aviso del punto siguiente.

**Cuándo se aplica.** El seed **nunca sobrescribe datos existentes de forma automática**:
- Seed presente y `localStorage` vacío → siembra directa. Es el caso que da valor a la idea (USB, equipo nuevo, archivo recibido por correo).
- Seed presente y ya hay datos → **no toca nada** y muestra un aviso discreto: *"Este archivo contiene una copia de 412 enlaces exportada el 12/08/2026 con PinBoard v1.5.0 — Fusionar / Sustituir todo / Ignorar"*.

Con eso, **el seed se convierte en una fuente de importación más que desemboca en el modal y las funciones que ya existen** (4.7 para enlaces, 4.19 para categorías: `performImportMerge` valida campos y `ensureCategory` respeta color/icono/posición de las que ya existían, así que la fusión ya está definida). El problema de compatibilidad entre versiones se resuelve reutilizando el mecanismo que ya lo tenía resuelto, en vez de inventar uno nuevo.

**Preferencias de interfaz**: título de la página y modo de vista se aplican en la siembra directa y en "Sustituir todo", pero **no** al fusionar — fusionar datos ajenos no debe cambiarte el título de tu propia página.

**Por qué esta regla también cubre un caso raro pero desconcertante**: en Chrome y Edge todas las páginas `file://` comparten el mismo `localStorage`, así que un archivo autocontenido abierto en la máquina donde ya usas PinBoard vería tus datos actuales y no los que lleva dentro. Como con datos previos nunca siembra solo y siempre avisa, el comportamiento es correcto y explícito sea cual sea la política de cada navegador — el diseño no depende de ese detalle.

**Riesgo que el sello de versión hace visible**: abrir una exportación vieja significa **ejecutar la app de la versión en que se exportó**. Sin el aviso, se volvería a una versión anterior sin notarlo. De ahí la regla general: **el JSON de enlaces sigue siendo el canal oficial para mover datos entre versiones**; el formato autocontenido es una foto, y es también una foto de la app.

- **Favoritos / enlaces fijados** (estrella que ancla el enlace arriba de su categoría): ya lo resuelve la reordenación manual existente (4.9) — subir un enlace al principio de su grupo es exactamente la misma acción, sin añadir un campo nuevo al modelo de datos ni un segundo criterio de orden compitiendo con el manual.
- **Campo "leído/pendiente"** (read-it-later con filtro): fuera del propósito de la app (sección 1), que es organizar una colección estable de enlaces, no gestionar una cola de lectura.
- **Más atajos de teclado** (navegar con flechas, `Ctrl+E`/`Ctrl+D`…): los dos actuales (`/` y `n`, ver 4.12) cubren lo que se necesita; añadir más aumenta la superficie de conflictos con los atajos del navegador y con la escritura en campos (decisión 15 de la sección 7) sin ganancia real.
- **Progressive Web App** (manifest + service worker): incompatible con el modo de uso real de la app, que se abre como archivo local (`file://`) — un service worker exige un origen `http(s)`, así que "instalarla" obligaría a servirla desde un servidor, rompiendo la premisa de la sección 2.
- **Comprobación de salud de los enlaces** (detectar enlaces caídos delegando las peticiones de red en la extensión, que desde su `background` con `host_permissions` sí puede leer el código de estado real): descartada por **falsos positivos**. Muchos sitios responden 403/429 a peticiones automatizadas o bloquean `HEAD` estando perfectamente vivos, así que la lista de "enlaces roídos" sería poco fiable — y una señal de calidad en la que no puedes confiar es peor que no tener ninguna.
