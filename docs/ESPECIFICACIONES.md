# Especificaciones — Lingatu

Documento de referencia técnica y funcional de `lingatu.html`, para mantenimiento y futuras ampliaciones.

> Este documento cita el código **por nombre de función o de elemento**, nunca por número de línea: los números caducan en cuanto alguien añade veinte líneas más arriba, y un nombre se encuentra igual de rápido buscando en el archivo. Mismo criterio que `CLAUDE.md`; si añades una referencia nueva, síguelo.

## 1. Propósito

Página web de un solo archivo (`lingatu.html`) para gestionar una colección personal de enlaces (marcadores), organizados por categorías y etiquetas, con búsqueda y filtros. Se ejecuta **100% en local**, abriendo el archivo directamente en el navegador (`file://`), sin servidor, sin build y sin dependencias externas.

## 2. Arquitectura

- **Un único archivo HTML** (`lingatu.html`) con CSS y JavaScript embebidos (sin frameworks, sin librerías externas, sin CDNs).
- **Persistencia**: `localStorage` del navegador. Los datos son locales al navegador/perfil desde el que se abre el archivo — no se sincronizan entre navegadores ni equipos.
- **JavaScript**: vanilla ES5-friendly (funciones `function`, `var`), todo envuelto en un único IIFE `(function(){ "use strict"; ... })();` para no contaminar el `window` global.
- **Sin build step**: se edita el HTML directamente y se recarga el navegador.

### Claves de `localStorage`

| Clave | Contenido |
|---|---|
| `enlaces_links_v1` | Array JSON con todos los enlaces (ver modelo de datos) |
| `enlaces_categories_v1` | Array JSON de nombres de categorías (lista maestra) |
| `enlaces_tags_v1` | Array JSON de etiquetas, cada una con prefijo `#` (lista maestra) |
| `enlaces_site_title_v1` | Texto del título de la página (por defecto `"Lingatu"`) |
| `enlaces_view_mode_v1` | `"comfortable"` o `"compact"` — modo de visualización de tarjetas |
| `enlaces_collapsed_categories_v1` | Array JSON con los nombres de las categorías actualmente plegadas |
| `enlaces_category_colors_v1` | Objeto JSON `{ "NombreCategoría": "#rrggbb" }` — colores personalizados por categoría |
| `enlaces_tag_colors_v1` | Objeto JSON `{ "#etiqueta": "#rrggbb" }` — colores personalizados por etiqueta |
| `enlaces_category_icons_v1` | Objeto JSON `{ "NombreCategoría": "clave-icono" }` — icono elegido de la librería fija (ver 4.15) |
| `enlaces_excluded_tags_v1` | Array JSON de etiquetas actualmente excluidas de la vista (ver 4.17) — a diferencia del resto de filtros, se fija hasta que el usuario las desmarca |
| `enlaces_view_profiles_v1` | Array JSON de perfiles de vista guardados `{ name, tags: [...], excludedTags: [...], selectedCategories: [...], linkIds: [...] }` (ver 4.17) |

Todas estas claves son independientes; borrar una no afecta a las demás. Para reiniciar la app por completo, borrar las 11 claves (o los datos del sitio desde el navegador).

Además, las **salvaguardas de datos** (4.26) usan seis claves más, que no forman parte del estado de la aplicación: son metadatos sobre él. Borrarlas no pierde ningún dato del usuario — solo la fecha de la última copia y las instantáneas de rescate.

| Clave | Contenido |
|---|---|
| `enlaces_last_export_v1` | Fecha ISO de la última exportación correcta (la escriben `exportLinks()` y `exportCategories()`) |
| `enlaces_backup_since_v1` | Fecha ISO desde la que se cuentan los días sin copia cuando **nunca** se ha exportado. Se registra la primera vez que la colección llega a 20 enlaces, y se borra en cuanto hay una exportación de verdad |
| `enlaces_backup_1_v1` … `enlaces_backup_3_v1` | Las tres últimas instantáneas rotativas del estado completo, con la envoltura de 4.26 |
| `enlaces_backup_session_v1` | En `sessionStorage`, no en `localStorage`: marca que esta sesión ya tomó su instantánea |
| `enlaces_file_meta_v1` | Archivo conectado (4.27): `{name, lastModified, savedAt}`. Permite nombrar el archivo antes de tener permiso y detectar que cambió por fuera. El **handle** no cabe aquí — no es serializable — y vive en IndexedDB (`lingatu_file_v1`, almacén `handles`) |
| `enlaces_lang_v1` | Idioma de la interfaz (4.28): `"es"` o `"en"`. Ausente = todavía no se ha elegido, y el idioma se deduce (preferencia → hay datos ⇒ español → `navigator.language`) |
| `enlaces_lang_notice_v1` | Marca de que ya se enseñó una vez el aviso de que existe selector de idioma (4.28, R9). Solo llega a escribirse en instalaciones anteriores a esa función |
| `enlaces_uncategorized_name_v1` | **Nombre de la categoría por defecto**, fijado una sola vez y nunca reescrito por un cambio de idioma. Es la clave que impide que traducir la interfaz parta la colección en dos categorías distintas (4.28, y decisión 59) |
| `enlaces_storage_mode_v1` | **Modo de trabajo elegido** (4.29): `"local"` o `"file"`. Lo elige el usuario y no se deduce nunca del permiso del navegador. Ausente = instalación anterior a esta función, y se migra según si había archivo recordado |
| `enlaces_theme_v1` | Tema de la interfaz (4.30): `"light"`, `"dark"` o `"system"`. Ausente = `"system"`, que es el comportamiento de siempre (`prefers-color-scheme`) |

> Las once claves de estado se enumeran **una sola vez en el código**, en `STATE_SLOTS`. El snapshot, el cálculo de ocupación y la restauración leen esa tabla en vez de repetir la lista, para que añadir una clave nueva no obligue a acordarse de tres sitios (y para que 11.6, que necesita el mismo inventario, no escriba un cuarto).

> Nota: las claves conservan el prefijo `enlaces_` heredado del nombre original del proyecto, a propósito — cambiarlas invalidaría los datos ya guardados por usuarios existentes. Es un detalle interno, no afecta al nombre público "Lingatu". Ya sobrevivió intacto al cambio de nombre a *PinBoard* y al posterior a *Lingatu* (decisión 45): el nombre público y el nombre de las claves son cosas distintas y solo una de las dos puede cambiarse sin romper nada.

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
  "tags": ["#referencia", "#web"],
  "notes": "## 12/08/2026\n\n> La referencia de `Array.prototype.at` está en la sección de métodos."
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
| `notes` | string | no | Notas del usuario sobre el enlace, acumuladas por bloques con sello de fecha (ver 4.23). **El campo solo existe si tiene contenido**: `undefined` y `""` se tratan igual, y al vaciarlo desde el modal se borra la clave en vez de guardarla vacía. Retrocompatible sin migración: los enlaces ya guardados no lo tienen y siguen funcionando sin tocarlos. |

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
- Formulario: Categoría\* (con autocompletado vía `<datalist>`), Título\*, Link\* (`type="url"`), Descripción, Etiquetas (editor de chips con autocompletado y entrada libre — ver 4.20), Activo (checkbox) y Notas (ver 4.23). **El modal de enlace va a dos columnas** (`.form-columns`, 880px de ancho frente a los 440px del resto): todos los campos anteriores a la izquierda y las notas a la derecha, ocupando el alto entero de la columna. Por debajo de 940px de ancho de ventana las dos columnas se apilan y las notas vuelven a un alto moderado.
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

- **Búsqueda** (`#searchInput`): un texto normal sigue siendo una coincidencia de subcadena (insensible a mayúsculas y acentos) sobre título + descripción + etiquetas + notas (4.23) + **URL** concatenados — la URL se añadió para que pegarla en el buscador encuentre su enlace sin ningún caso especial. **Varias palabras se combinan en AND** (`web docs` encuentra un enlace que contenga "web" y "docs", en cualquier orden y en cualquier campo) — cambio de comportamiento deliberado frente a la subcadena literal de antes; quien necesite la secuencia exacta la tiene entre comillas (`"web docs"`). Una consulta de una sola palabra se comporta igual que siempre.
- **Operadores**, combinables entre sí y con texto normal en la misma caja:

  | Operador | Compara contra | Notas |
  |---|---|---|
  | `cat:texto` | nombre de categoría | Subcadena: `cat:desar` encuentra "Desarrollo", `cat:trabajo` encuentra "Trabajo / Clientes" |
  | `#texto` | nombres de etiquetas del enlace | Subcadena: `#ref` encuentra `#referencia` |
  | `site:texto` | `hostname` de la URL | Subcadena; si la URL no es válida (`new URL()` lanza), simplemente no coincide, sin error |
  | `is:activo` / `is:inactivo` | campo `active` | También acepta `is:active` / `is:inactive`. Primera forma de llegar a los inactivos sin cambiar el toggle |
  | `"frase exacta"` | el texto de búsqueda completo | Subcadena literal, con espacios incluidos; también sirve tras un operador: `cat:"Trabajo / Clientes"` |
  | `-` delante de cualquiera | — | Niega ese término: `-#trabajo`, `-cat:archivo`, `-python` |
  | palabra suelta | el texto de búsqueda completo | Ver regla de composición |

  **Regla de composición** (la misma que ya siguen los filtros del lateral): términos del **mismo** operador se combinan con **OR** (`cat:a cat:b` = categoría A o B, igual que el filtro de etiquetas ya es OR), operadores **distintos** se combinan con **AND** (`cat:desarrollo #api` = categoría Desarrollo y etiqueta api), y las **negaciones son siempre AND NOT**. Los operadores se combinan en AND con los filtros del lateral, igual que todo lo demás: con "Desarrollo" seleccionado en el lateral y `cat:diseño` escrito, el resultado correcto es **cero enlaces** (ver estado vacío, más abajo).
  - Un operador desconocido (`foo:bar`) se busca como texto literal, sin error: las URLs llevan `:`.
  - **Los términos incompletos se ignoran, no filtran**: mientras se teclea, la consulta pasa por estados como `cat:`, `#`, `-` o `"frase sin cerrar`; un término cuyo contenido quede vacío tras quitarle el prefijo se descarta, y una comilla sin cerrar se trata como texto normal (nunca se queda la lista en cero a mitad de palabra).
- **Filtro de categoría**: menú lateral tipo lista, selección múltiple (`state.selectedCategories`, `Set` vacío = todas) — ver 4.18.
- **Filtro de etiquetas**: nube de etiquetas en el lateral y en cada tarjeta (`state.tags`, `Set`). Al hacer clic en una etiqueta —lateral o tarjeta— se **añade o quita** de la selección (multi-selección acumulativa); un enlace coincide si tiene *alguna* de las etiquetas seleccionadas (OR). El icono de escoba (🧹) junto a "Etiquetas" (`#btnClearTagSelection`) vacía de un golpe tanto las etiquetas incluidas como las excluidas (4.17); no toca el filtro de categoría.
- **Filtro de estado**: toggle "Todos / Activos" en la barra de herramientas (`state.activeFilter`). Valor por defecto: `"active"`. *(Nota: internamente `getFilteredLinks()` también reconoce el valor `"inactive"`; el operador `is:inactivo` es la primera forma de llegar a esos enlaces sin cambiar el toggle.)*
- **Foco de revisión** (`state.focusIds`, `Set` de ids, vacío = sin foco): lo fija "Ver estos N" del panel de limpieza (4.24) para recortar la vista a un conjunto concreto de enlaces que los demás filtros no pueden expresar. Momentáneo como la búsqueda: no se persiste, se vacía al recargar y también al tocar la categoría o las etiquetas a mano (`detachActiveView()`). Mientras está activo, un aviso sobre la lista (`#focusBanner`) lo recuerda con un botón "Quitar". Se ignora en `getLinksForExport()`/`hasLinkSelection()`, igual que la búsqueda (4.7).
- Todos los filtros son combinables (AND) y se aplican antes de agrupar por categoría.
- **Estado vacío con explicación**: si el resultado es cero y a la vez hay una búsqueda escrita **y** alguna selección en el lateral (categoría, etiquetas incluidas/excluidas o vista aplicada), `#emptyState` enumera las restricciones vigentes (categoría, etiquetas, estado, vista, texto buscado) en vez del mensaje genérico, para que el conflicto AND se entienda de un vistazo.

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
- **Exportar**: descarga `lingatu_AAAA-MM-DD.json` (formato idéntico al modelo de datos, sin listas maestras de categorías/etiquetas — se regeneran al importar). `getLinksForExport()` decide qué exportar: **sin ninguna categoría, etiqueta ni enlace seleccionado** (`hasLinkSelection()` es `false`), exporta `state.links` completo; **con alguna selección activa** (categoría, etiquetas incluidas o excluidas, o la lista de enlaces de una vista de selección — aplicar una vista guardada, 4.17, es solo un atajo para fijar estas mismas), exporta únicamente los enlaces que cumplen esos criterios. A propósito ignora la búsqueda de texto y el toggle Todos/Activos, para que ese filtro momentáneo no recorte una exportación sin que el usuario lo busque explícitamente. El título del botón (`syncExportButtonLabel`, llamado desde `render()`) indica en cada momento si va a exportar todo o cuántos enlaces de la selección actual. Además, si `hasLinkSelection()` es `true` en el momento de pulsar "Exportar", se pide confirmación explícita (`confirm()`, con el recuento de enlaces que se van a exportar) antes de generar el archivo, para que no se exporte sin querer solo la selección visible en vez de todos los enlaces.
- **Importar**: dos vías equivalentes, que comparten toda la lógica posterior — `handleImportFileText(text)` es la parte común (validar/parsear, rellenar el resumen, abrir el modal, asignar `pendingImportData`):
  - El botón "Importar" (`#fileImport`, con `accept` para `.json`/`.html`/`.htm`, aunque el archivo `Bookmarks` de Chromium no tiene extensión y requiere elegir "Todos los archivos" en el selector nativo).
  - **Soltar el archivo sobre cualquier parte de la página** (ver más abajo, "Arrastrar y soltar un archivo").
  
  `parseImportFile(text)` **enruta por contenido, no por extensión** (el `Bookmarks` de Chromium no tiene ninguna), sobre el texto ya leído y con `trim()`:

  | Empieza por / contiene | Formato | Parseo |
  |---|---|---|
  | `[` | JSON de Lingatu | `JSON.parse` + validación de `category`/`title`/`url` en cada elemento (comportamiento de siempre) |
  | `{` con una clave `roots` | `Bookmarks` de Chromium | `parseChromiumBookmarks(obj)` |
  | `NETSCAPE-Bookmark` o `<DL` | HTML de marcadores (Netscape, el que exporta cualquier navegador) | `parseNetscapeBookmarks(text)` |
  | cualquier otra cosa | — | error claro (`alert()`) |

  Como el enrutado mira el contenido y no el nombre, los archivos exportados antes del cambio de nombre (`pinboard_AAAA-MM-DD.json`, `pinboard_categorias_<fecha>.json`) se importan exactamente igual que los nuevos `lingatu_*.json`: el formato no cambió, solo el nombre con el que se descargan.

  Los dos parsers nuevos devuelven un array con la **misma forma** que el JSON de Lingatu (`category`, `title`, `url`, `description: ""`, `active: true`, `tags: []`), así que `performImportMerge`/`performImportReplace` los consumen sin ningún cambio — ninguno de los dos sabe de qué formato vino el archivo. Ambos deduplican **dentro del propio archivo** con un objeto-mapa (`seen[url]`), quedándose con la primera aparición: `performImportReplace` no dedupica por sí solo (a diferencia de `performImportMerge`, que sí lo hace incidentalmente contra sus propias adiciones), así que sin este dedupe en el parseo, "Sustituir todo" crearía duplicados de cualquier marcador presente en más de una carpeta. Ambos descartan en silencio lo que no es un marcador web navegable (`javascript:`, `chrome://`, `edge://`, `about:`, `place:`, cualquier URL que no empiece por `http://`/`https://`) y las carpetas vacías, sin avisar — no son errores.
  - `parseChromiumBookmarks(obj)`: replica la lógica de `tools/convertir_marcadores.py:16-41` (la referencia de comportamiento). Recorre `obj.roots` recursivamente; el nombre de cada carpeta (incluida la del nodo raíz de cada root, p. ej. "Barra de favoritos") se acumula en la ruta, las carpetas sin nombre no añaden nivel; `category` = la ruta unida con `" / "` o `"Sin categoría"` si queda vacía; `title` = `name`, o la URL si el nombre está vacío.
  - `parseNetscapeBookmarks(text)`: parsea con `DOMParser.parseFromString(text, "text/html")` — **nunca** con `innerHTML` ni expresiones regulares, porque el archivo es contenido no confiable y el formato es HTML deliberadamente mal formado (`<DT>`/`<p>` sin cerrar). Para cada `A[href]`, `netscapeFolderPath(anchor)` sube por los ancestros `<DL>` reconstruyendo la ruta de carpetas. Detalle no obvio verificado empíricamente: el HTML parser del navegador anida cada `<DL>` **dentro** del `<DT>` que lo precede (no como hermano, pese a que el HTML fuente los escribe como hermanos sin cerrar), así que la carpeta de un `<DL>` es el `<H3>` que sea **hijo directo de ese mismo `<DT>` contenedor** — de ahí que no se pueda asumir ninguna forma concreta de anidar los `<DT>` y haya que subir explícitamente por `dl.parentElement`.
  - `#importSummary` indica también el formato reconocido (`IMPORT_FORMAT_LABELS`), además del recuento de siempre. Sigue usando `textContent` (nunca HTML) porque los títulos importados son texto arbitrario.
  - **Fusionar** (`performImportMerge`, recomendado — botón primario): añade solo los enlaces del archivo cuya URL (normalizada con `normalizeUrlForCompare`: `trim` + sin `/` final + minúsculas) no exista ya entre los enlaces actuales. Los añadidos se registran con un `id` nuevo y se normalizan sus categorías/etiquetas (`ensureCategory`/`ensureTag`). Al terminar, muestra un `alert()` con el recuento de añadidos/omitidos.
  - **Sustituir todo** (`performImportReplace`, botón `btn-danger`): pide una confirmación adicional y luego **reemplaza por completo** `state.links` por el contenido del archivo. Es el único camino por el que entra un `id` que no ha generado esta app: se conserva el del archivo —para no romper referencias— **solo si `isValidId()` lo reconoce** como la forma alfanumérica de `genId()`, y se regenera en silencio en cualquier otro caso, incluidos los repetidos dentro del propio archivo (decisión 46). "Fusionar" siempre genera `id` nuevos, así que nunca estuvo expuesto.
  - Tras cualquiera de las dos, se resetean los filtros a estado neutro (`resetFiltersAfterImport`: `activeFilter = "all"`, categoría = todas, etiquetas = ninguna, búsqueda vacía) para poder revisar el resultado.

**Arrastrar y soltar un archivo (importación)**: manejadores `dragenter`/`dragover`/`dragleave`/`drop` a nivel de `document`, para que soltar un archivo de marcadores **en cualquier parte de la página** funcione y, sobre todo, para que **nunca navegue al archivo** (la acción por defecto del navegador al soltar un archivo). Sin esto la app desaparecería de la pantalla, sustituida por el volcado del archivo — los manejadores de arrastre interno (`#linksContainer`/`#categoryList`, 4.9/4.14) no lo evitan porque los dos empiezan comprobando su propio arrastre en curso (`draggedLinkId`/`draggedCategoryName`) y salen antes de llamar a `preventDefault()` si no hay ninguno.
- `isInternalDrag()` (`draggedLinkId || draggedCategoryName`) es la guarda: si hay un arrastre interno en curso, los manejadores de `document` no hacen nada y dejan actuar a los de `#linksContainer`/`#categoryList` sin interferir.
- Si no es un arrastre interno, se llama a `preventDefault()` incondicionalmente (cualquier arrastre externo, sea o no un archivo reconocible: primero se impide la navegación, después — si corresponde — se avisa del error). `#fileDropIndicator` (clase `.visible`) da feedback visual mientras dura el arrastre, con el mismo lenguaje visual que `.drag-over`.
- Solo si `e.dataTransfer.files.length > 0` se lee el primer archivo con `FileReader` y se pasa a `handleImportFileText`. Distinguir por `dataTransfer.files` (en vez de asumir que todo arrastre externo es un archivo) deja el hueco preparado para que "arrastrar una URL desde otra ventana" (backlog) añada después la rama de `text/uri-list` sin rehacer esto.

### 4.8 Estados vacíos: la bienvenida y el callejón sin salida
Si no hay datos guardados en `localStorage`, la app arranca sin ningún enlace (`state.links = []`). Para probarla con contenido de muestra existen dos archivos aparte, uno por idioma — [`examples/ejemplo-enlaces.json`](../examples/ejemplo-enlaces.json) y [`examples/example-links.json`](../examples/example-links.json) —, cargables con el botón "Importar". **El mensaje de bienvenida ya no los nombra**: viven en el repositorio, y quien se descarga un `lingatu.html` suelto —que es como se distribuye— no los tiene. Prometer ahí un archivo que el usuario no puede encontrar es peor que no ofrecer nada.

`renderCards()` distingue **tres** situaciones, y la distinción es el punto de esta sección:

- **Colección vacía** (`state.links.length === 0`): mensaje de bienvenida con **dos botones de verdad** —crear el primer enlace (reutiliza el manejador de `#btnAdd`) y traer los marcadores del navegador (abre el mismo selector que "Importar")— más el recordatorio de `/` para buscar. Antes la única acción era un enlace de texto en mitad de un párrafo, mientras el botón real vivía en el lateral, lejos de donde mira quien acaba de abrir la aplicación por primera vez.
- **Hay enlaces y alguna restricción activa**: se **enumeran las restricciones vigentes** (`describeActiveConstraints()`) y se ofrece un botón **«Quitar los filtros»** que llama a `clearAllFilters()`. Antes esta rama exigía búsqueda **y** selección a la vez, así que en los dos casos habituales —solo una búsqueda escrita, o solo una categoría pulsada— no llegaba a aparecer nunca: el mensaje útil estaba escrito desde 4.24 y casi nadie lo había visto.
- **Hay enlaces y ninguna restricción**: el mensaje genérico de siempre.

Los tres botones (`#btnEmptyStateAdd`, `#btnEmptyStateImport`, `#btnEmptyStateClear`) usan un listener delegado sobre `#emptyState`, registrado una sola vez en la inicialización (no en `render()`), porque ese elemento es estático y `render()` no lo destruye.

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
- **`Ctrl+K` / `Cmd+K`** — abre la paleta de comandos (4.22).

`/` y `n` se ignoran mientras el foco está en un campo de texto/`textarea`/elemento editable, o mientras hay algún overlay abierto (`anyOverlayOpen()`, 4.22), para no interferir con la escritura normal. `Ctrl+K` **sí** funciona con el foco en un campo de texto —es lo esperable de una paleta de comandos—, pero tampoco hace nada con un overlay abierto.

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

### 4.17 Vistas guardadas (categorías + exclusión de etiquetas por nombre)
Objetivo: poder ocultar de la vista los enlaces de un contexto (p. ej. "trabajo") sin necesidad de un campo nuevo en el modelo de datos ni de un sistema de grupos aparte — reutiliza las etiquetas ya existentes.

**Exclusión de una etiqueta** (`#tagCloud` en el sidebar, no en las etiquetas de las tarjetas): cada clic cicla por 3 estados — neutra → incluida (mismo filtro `state.tags` de siempre, `.tag-chip.active`) → **excluida** (`state.excludedTags`, `.tag-chip.excluded`, con tachado y borde rojo) → neutra de nuevo. A diferencia de `state.tags`/`state.category`/`state.search` (que se resetean en cada carga de página), `state.excludedTags` se persiste en `enlaces_excluded_tags_v1` y **se mantiene fijo hasta que el usuario la desmarca**, incluso entre sesiones — es justo el comportamiento pedido ("fijar la exclusión hasta que se desmarque"). `getFilteredLinks()` descarta cualquier enlace cuyas `tags` intersequen con `state.excludedTags`.

**Perfiles de vista** (sección "Vistas" del sidebar, `#viewProfileList`): un perfil es `{ name, tags: [...], excludedTags: [...], selectedCategories: [...], linkIds: [...] }` — guarda **toda** la selección activa: categorías, etiquetas incluidas, etiquetas excluidas y, si la vista es una lista explícita de enlaces, sus ids. Guardado en `state.viewProfiles` (`enlaces_view_profiles_v1`), independiente de los enlaces y de las listas maestras de categorías/etiquetas — si se borra una categoría, una etiqueta o un enlace que un perfil usaba, el perfil simplemente deja de tener efecto sobre ese nombre o ese id, sin romper nada (no hay purga de ids fantasma). `loadViewProfiles()` normaliza perfiles guardados antes de cada uno de estos cambios (sin `tags`, sin `selectedCategories` o sin `linkIds`) al array vacío correspondiente, por compatibilidad.

**Dos maneras de expresar una vista, un solo tipo de perfil**: una **vista de filtro** tiene categorías y/o etiquetas y `linkIds` vacío; una **vista de selección** tiene `linkIds` con contenido y las otras tres dimensiones vacías. No hay campo `type` que las distinga, y en el chip se ven y funcionan exactamente igual: `applyViewProfile()`/`clearActiveViewProfile()` tratan las cuatro dimensiones por igual, siempre (ver decisión 29).
- **Guardar** (`btnSaveViewProfile`): pide un nombre (`prompt`) y guarda `state.tags` + `state.excludedTags` + `state.selectedCategories` + `state.viewLinkIds` tal cual están *en ese momento* — sin exigir ningún mínimo, "todo sin filtrar" es una vista válida como cualquier otra. Si el nombre coincide (sin distinguir mayúsculas) con un perfil ya existente, pide confirmación para sobrescribirlo. La vista recién guardada queda como la aplicada (ver siguiente punto).
- **Crear vista desde el modo selección** (`bulkCreateView()`, 4.21): guarda los enlaces marcados como una vista de selección. A diferencia de "Guardar actual", **no** deja la vista aplicada ni vacía la selección en lote (decisión 31).
- **Vista aplicada, rastreada por nombre**: `state.activeViewProfile` guarda el nombre del perfil aplicado (o `null`), en vez de derivarse comparando la selección actual contra cada perfil. Es a propósito: dos perfiles pueden guardarse con la misma selección (o ninguna, un caso válido), y compararlos por coincidencia marcaría los dos a la vez como activos y el clic para desmarcar dejaría de tener efecto (de vacío a vacío, o de un conjunto a sí mismo). Se resetea a `null` en cada carga de página, igual que `state.tags`, y se suelta con `detachActiveView()` en cuanto se toca una categoría o una etiqueta a mano, se limpia la selección de etiquetas, se elige una categoría desde la paleta de comandos, se importan enlaces o se elimina el propio perfil aplicado — cualquier cambio manual invalida la vista aplicada porque la selección ya no es necesariamente la que esa vista representaba.
- **`state.viewLinkIds`** (`Set`, vacío = sin límite): los enlaces a los que limita una vista de selección aplicada. Se resetea en cada carga de página y **nunca se persiste** — mismo tratamiento que `state.tags`/`state.selectedCategories`, no el de `state.excludedTags`. Es la única de las cuatro dimensiones **sin ningún control propio en la UI** que la rellene: su único origen posible es `applyViewProfile()`. De ahí que soltar la vista tenga que vaciarla siempre, y que eso viva en una sola función, `detachActiveView()` (decisión 32).
- **Aplicar / deseleccionar**: clic en el chip del perfil (`.view-profile-chip`) llama a `applyViewProfile(profile)`, que sustituye `state.tags`, `state.excludedTags`, `state.selectedCategories` y `state.viewLinkIds` por lo guardado y fija `state.activeViewProfile` a ese nombre. Si el perfil ya es el aplicado, el mismo clic lo deselecciona con `clearActiveViewProfile()` —vacía los cuatro conjuntos y `state.activeViewProfile` vuelve a `null`— mismo patrón de toggle que la selección de categoría (4.2). Las dos funciones existen porque esa misma lógica la necesita también el grupo "Vistas" de la paleta de comandos (4.22), que llama **solo** a `applyViewProfile` (aplica, nunca alterna).
- **Eliminar**: botón "✕" del propio chip (`data-action="delete-profile"`), con confirmación; si el perfil eliminado era el aplicado, se llama a `detachActiveView()` (la selección de categorías/etiquetas vigente se respeta —sigue teniendo su control en el lateral—, pero la lista de enlaces sí se suelta: ya no queda ningún chip con el que desmarcarla).

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
- **Exportar** (`btnExportCategories`): descarga `lingatu_categorias_<fecha>.json`, un array en el mismo orden que `state.categories` (el orden es la posición) con `{ name, icon, color }` por categoría (`icon`/`color` a `null` si no tiene). Mismo mecanismo Blob + `URL.createObjectURL` que el exportador de enlaces.
- **Importar** (`btnImportCategories` → `fileImportCategories`, lectura con `FileReader`): valida que sea un array de objetos con `name`, y abre `#importCategoriesModalOverlay` con el resumen y dos acciones:
  - **Fusionar** (`performImportCategoriesMerge`): aditivo — para cada entrada llama a `ensureCategory(entry.name)`; si la categoría no existía, la crea al final y le asigna `icon`/`color` del archivo (validando que la clave de icono exista en `CATEGORY_ICONS` y que el color pase `safeColor()`, ver decisión 46: un color termina dentro de un atributo `style`, donde escapar no bastaría); si ya existía, no toca su posición, color ni icono actuales.
  - **Sustituir todo** (`performImportCategoriesReplace`, tras `confirm()`): reemplaza `state.categories`/`categoryColors`/`categoryIcons` íntegramente por el contenido del archivo (deduplicando por nombre, el orden del array = nueva posición), con la misma validación de icono y color que "Fusionar". Cualquier enlace cuya categoría ya no exista en la nueva lista se reasigna a `ensureCategory("Sin categoría")`, igual que hace el borrado manual de una categoría (4.5). También limpia de `state.selectedCategories` cualquier nombre que haya dejado de existir.

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
| Crear vista | `prompt()` con el nombre → guarda los seleccionados como una **vista de selección** (4.17), un perfil con `linkIds` y las demás dimensiones vacías. Si el nombre ya existe, pide confirmación para sobrescribirlo. **No aplica la vista ni vacía la selección** (decisión 31): se puede seguir encadenando acciones sobre el mismo conjunto, y aplicarla es un clic en su chip como el de cualquier otra vista. |
| Eliminar | `confirm()` con el recuento explícito; borrado irreversible, como el de la papelera individual (4.1). |

Cada acción recorre la selección, muta `state.links` y **guarda una sola vez al final** (`save()`, más `saveAllTags()`/`saveCategories()` si tocó una lista maestra), nunca una vez por enlace, y termina en `render()`.

**Vaciado de la selección** (`clearSelectionOnViewChange()`): cualquier cambio en lo que se está viendo la vacía — filtro de categoría, etiquetas del lateral (incluida la escoba), perfil de vista, toggle Todos/Activos, búsqueda, modo de vista e importación. Tras una acción en lote, en cambio, la selección **se conserva** para poder encadenar varias sobre el mismo conjunto; la única excepción es "Eliminar", donde necesariamente se vacía.

### 4.22 Paleta de comandos (Ctrl+K)

Objetivo: un único desplegable que busca a la vez **acciones y contenido**. "expo" saca *Exportar enlaces*, "mdn" saca el enlace, "desar" saca la categoría *Desarrollo*. Resuelve por la vía correcta lo que se descartó como "más atajos de teclado" (11.2): **un atajo en lugar de diez**, y descubrible leyendo en vez de memorizando.

**Registro de overlays (requisito previo, y corrección de dos fallos)**. Antes, la lista de overlays abiertos estaba escrita a mano en dos sitios —el manejador global de `Escape` y la comprobación de atajos bloqueados (decisión 15)— y se había quedado desactualizada: `#importCategoriesModalOverlay` (4.19) se añadió sin apuntarlo en ninguna de las dos, así que **`Escape` no cerraba ese modal** y **con él abierto la tecla `n` abría el modal de nuevo enlace encima**. Ahora hay una sola estructura, `OVERLAYS`, a la que cada overlay se da de alta con `registerOverlay(el, closeFn)` —la misma llamada que ya enlazaba el cierre por clic fuera—, y de ella derivan `anyOverlayOpen()` y `closeOpenOverlays()`. Los dos fallos quedan corregidos y cualquier overlay futuro queda cubierto por el solo hecho de registrarse.

**`COMMANDS`, único origen de verdad de las acciones**. Array declarado después de las funciones de acción; cada entrada llama a la misma función con nombre que llama su botón, nunca a una copia de su lógica (ver decisión 25). Forma de una entrada:

```js
{ id: "add-link", label: "Nuevo enlace", hint: "n", run: function(){ openModal(null); } }
```

- `label`: cadena **o función** que la devuelve. Hace falta para *Plegar todo* / *Expandir todo*, que es un solo comando con etiqueta cambiante; la lee del propio `#btnToggleAllGroups`, que `render()` ya mantiene sincronizado (`syncToggleAllGroupsLabel()`).
- `hint` (opcional): el atajo que ya existe para esa acción (`n`, `/`). Es lo que convierte la paleta en documentación.
- `available` (opcional): si devuelve `false`, el comando no se ofrece. Solo lo usa *Limpiar selección de etiquetas*, que no tiene sentido sin etiquetas incluidas o excluidas — por eso con la app recién abierta se listan **trece** comandos y catorce en cuanto hay una selección de etiquetas.

Quedan **fuera del registro** las acciones que solo existen dentro de un modal (`btnDuplicate`, `btnCancel`, exportar/importar categorías): un comando debe poder ejecutarse desde la vista principal.

**Cinco grupos de resultados**, cada uno con cabecera visible solo si tiene resultados:

| Grupo | Origen | Qué hace `Enter` | Tope |
|---|---|---|---|
| Comandos | `COMMANDS` | Ejecuta `run()` | todos |
| Enlaces | **`state.links` completo** | Abre la URL en una pestaña nueva | 8 |
| Categorías | `getCategories()` | Filtra por esa categoría, como un clic normal en el lateral | 5 |
| Vistas | `state.viewProfiles` | Aplica el perfil con `applyViewProfile()` (categorías, etiquetas incluidas y excluidas, y enlaces si es una vista de selección) | 5 |
| Etiquetas | `getAllTags()` | Añade la etiqueta a `state.tags` (solo incluir) | 5 |

- **Los enlaces se buscan sobre `state.links`, ignorando los filtros activos** — es el punto de la función: alcanzar algo que ahora mismo *no* se está viendo. Usar `getFilteredLinks()` aquí sería justo lo contrario. Busca sobre título, descripción, URL y etiquetas.
- Categorías, vistas y etiquetas **aplican, no alternan**: elegirlas explícitamente por su nombre no puede significar "deseleccionar". El ciclo de tres estados de la nube de etiquetas (4.17) no se replica: la paleta hace lo simple y predecible.
- **Con la consulta vacía se muestran solo los comandos**, todos, con su `hint`. Es el momento en que la paleta hace de ayuda.
- Todo lo que pinta es dato de usuario (títulos, categorías, vistas, etiquetas): pasa por `escapeHtml()` sin excepción.

**Coincidencia insensible a mayúsculas y acentos** (`normalizeForSearch()`, nombre genérico porque también la usa la búsqueda con operadores de 4.3 — un único normalizador para las dos, no dos copias): `normalize("NFD")` + eliminación del rango de marcas combinantes, aplicado igual a la consulta y al texto candidato. En español no es un adorno: `categoria` encuentra *Categorías* y `diseno` encuentra *Diseño*. Subcadena, sin coincidencia difusa.

**Interfaz y teclado**. Overlay propio `#commandPaletteOverlay` (registrado en `OVERLAYS`, con su regla `[hidden]` heredada de `.modal-overlay` — decisión 1), anclado arriba para que la lista crezca sin mover el campo. Se abre con `Ctrl+K`/`Cmd+K` y con el botón visible **"Comandos (Ctrl+K)"** de la barra de herramientas (`#btnCommandPalette`): si algún navegador no cediera el atajo la función sigue siendo accesible, y una función autodocumentada a la que solo se llega por un atajo que nadie te ha contado no documenta nada. `↑`/`↓` mueven la selección con el mismo patrón que las sugerencias de etiquetas (4.20), desplazando a la vista la entrada seleccionada; `Enter` ejecuta; el clic hace lo mismo que `Enter`; `Escape` cierra (vía el manejador global de overlays). Al ejecutar cualquier entrada la paleta **se cierra antes de ejecutar** —la acción puede abrir un modal o enfocar el buscador— y el campo se vacía, para que la siguiente apertura empiece limpia.

### 4.23 Notas por enlace, capturadas también desde la página

Objetivo: que un enlace guarde **lo que el usuario sabe o piensa sobre él**, y que anotar sea posible desde la página que se está leyendo, no solo desde Lingatu. La descripción es un resumen de una línea que se pinta en la ficha; una nota es texto largo que se acumula con el tiempo. El valor real aparece en la búsqueda (4.3): encontrar un enlace por algo que tú escribiste sobre él.

**El campo**: `notes` (string, opcional) en el modelo de datos de la sección 3. Como cualquier campo nuevo, hay que enumerarlo en los **cinco sitios** que reconstruyen un enlace campo a campo (las dos ramas del `submit` de `#linkForm`, `duplicateEditingLink`, `performImportMerge` y `performImportReplace`); omitir cualquiera es pérdida de datos silenciosa. La exportación no necesitó cambios: usa `JSON.stringify` sobre el objeto completo.

**Formato y acumulación**: las notas **se añaden al final, nunca se sobrescriben**. Cada anotación entra como un bloque encabezado por su fecha (`## DD/MM/AAAA`, `formatNoteBlock`), separado del anterior por una línea en blanco (`appendNoteToText`), y sin espacios sobrantes al final del campo. Se añade un bloque nuevo aunque ya exista uno con la fecha de hoy: es predecible y el usuario puede reorganizar a mano. Una selección capturada desde la extensión entra como cita (`> ` en cada línea, incluidas las vacías).

**El Markdown se guarda tal cual y se renderiza solo al leerlo** (`renderNotesInto`, en el visor). El campo del modal es un `<textarea>`, así que ahí siempre se ve el texto original: se escribe en crudo y se lee formateado. Construcciones soportadas: encabezados `#` a `######`, citas `>`, listas con viñeta `-` y numeradas (`1.`/`1)`, respetando el número inicial), `**negrita**`, `*cursiva*`, código entre backticks y **bloques de código con valla de tres backticks** (con identificador de lenguaje opcional, que se acepta y se ignora — no hay resaltado de sintaxis). Cada bloque de código lleva un botón 📋 para copiarlo entero (`copyTextToClipboard`), que confirma con un ✓ en el propio botón. Un salto de línea simple es un salto real, no una continuación de párrafo. **Fuera**: enlaces, imágenes, tablas y HTML crudo (decisión 38).

**En el modal**: `<textarea id="fieldNotes">` en la columna derecha del formulario (4.1). `openModal(link, focusNotes)` lo rellena al editar y **lo vacía al crear**; con `focusNotes` a `true` abre con el foco en el campo y el cursor al final.

**En las fichas**: las que tienen notas muestran 📝 (`notesIndicatorHtml`, compartida por `cardHtml` y `cardHtmlCompact`, así que sale en **los dos modos de vista**), con el recuento de notas en su `title`. Es la única forma de saber que ahí hay algo escrito sin abrir nada. **La nota no se pinta en la ficha** (puede tener cientos de líneas: reventaría la cuadrícula). El indicador vive dentro de `.card-icon-actions`, así que el modo selección (4.21) lo oculta con el mismo criterio que ▲▼✏️🗑️.

**El visor** (`#notesViewerOverlay`, `openNotesViewer(id)`): pulsar el 📝 abre las notas **en solo lectura** —título del enlace, su categoría y dominio, y el texto ya formateado por `renderNotesInto`—, no el formulario de edición (decisión 37). Desde ahí, "Editar notas" cierra el visor y abre el modal con el foco en el campo; para editar sin pasar por el visor está el lápiz de siempre. Es un overlay más: se registra con `registerOverlay`, así que se cierra con `Escape` o clicando fuera y bloquea los atajos de una tecla mientras está abierto.

**Desde la extensión** (ver sección 8): dos entradas de menú contextual —"Guardar en Lingatu" (contexto de página, hace lo mismo que pulsar el icono) y "Añadir selección como nota en Lingatu" (contexto de selección)—, que llaman a `LingatuBridge.appendNote`. Si la URL ya está guardada, la nota se añade sin modal y **sin cambiar de pestaña**, con un aviso efímero en la propia página que confirma la operación y dice cuántas notas tiene ya ese enlace (`showPageToast` en `background.js`, decisión 36); si no, se abre el modal precargado con la nota puesta (decisión 33).

### 4.24 Panel de limpieza

Botón "Revisar" en el sidebar, junto a Exportar/Importar (`#btnCleanup`, misma familia: es mantenimiento de la colección). Abre un modal (`#cleanupModalOverlay`) con ocho comprobaciones, cada una una fila plegable con su recuento; **las que salen a cero no se muestran**, y si todas están a cero el panel dice que no hay nada que revisar. Se recalcula todo (`computeCleanupChecks()`) cada vez que se abre, porque los datos cambian entre aperturas.

**Regla de diseño, la que mantiene esto en ~150 líneas**: *el panel no modifica nada, solo cuenta y te lleva*. Diagnostica; la reparación la hacen las herramientas que ya existen (el modal de gestión, la edición de un enlace, las acciones en lote de 4.21). No hay ningún botón de "arreglar todo" — ver decisión en la sección 7.

Las ocho comprobaciones, todas sobre `state.links`/`state.categories`/`state.allTags`, con un solo recorrido por mapas (nunca comparación de cada enlace con todos los demás):

| Comprobación | Cómo | Unidad de la cabecera |
|---|---|---|
| URLs duplicadas ya guardadas | Agrupa por `normalizeUrlForCompare(l.url)`, grupos de más de uno | grupos |
| Enlaces con URL inválida | `new URL(l.url)` dentro de `try/catch` | enlaces |
| Enlaces sin ninguna etiqueta | `l.tags.length === 0` | enlaces |
| Etiquetas que ya no usa ningún enlace | Recuento 0 en `getTagCounts()` sobre `state.allTags` | etiquetas |
| Categorías con 0 o 1 enlace | `getCategories()`, `count <= 1` | categorías |
| Títulos repetidos con URL distinta | Agrupa por título normalizado (`trim` + minúsculas), grupos de más de uno cuyas URLs normalizadas no sean todas iguales | grupos |
| Dominios repartidos entre varias categorías | Agrupa por `hostname`; dominios con 3+ enlaces repartidos en 2+ categorías | dominios |
| URLs con parámetros de seguimiento | Busca `utm_*`, `fbclid`, `gclid`, `mc_cid`, `mc_eid`, `igshid` en la query (`hasTrackingParams`) | enlaces |

La comprobación de parámetros de seguimiento no es cosmética: `normalizeUrlForCompare` solo quita la barra final y baja a minúsculas, así que la misma página guardada dos veces con distinto `utm_` **no la detecta como duplicada** el primer chequeo — esta es la que explica ese caso.

**"Ver estos N" — el puente entre diagnóstico y reparación.** Cada comprobación reduce a una lista de `{label, linkIds}`; al desplegar una fila se listan esos elementos (tope de 20, "y N más" si se pasa) y, si la unión de sus `linkIds` no está vacía, un botón "Ver estos N" (N = tamaño de esa unión, que puede no coincidir con el número de la cabecera — p. ej. "3 grupos" en la cabecera de duplicados, "Ver estos 7" enlaces en el botón). Pulsarlo cierra el modal y aplica `state.focusIds` (un `Set` de ids), que `getFilteredLinks()` respeta como una condición más en AND. Es una dimensión nueva porque los filtros existentes (categoría, etiquetas, búsqueda) no pueden expresar "estos 12 enlaces concretos". Ver `state.focusIds` en 4.3.

Algunas comprobaciones no tienen elementos que enfocar (una etiqueta sin uso, por definición, no la usa ningún enlace) — ahí no aparece el botón "Ver estos N", aunque la fila sí liste el nombre.

**Invariante**: `getLinksForExport()` y `hasLinkSelection()` ignoran `focusIds`, igual que ya ignoran la búsqueda (4.7). El foco de revisión es un filtro momentáneo más; si contara como selección, el botón "Exportar" podría exportar solo los enlaces enfocados creyendo que exporta todos.

### 4.25 Panel de ayuda ("?")

**Diagnóstico** (11.5): Lingatu no tiene un problema de documentación, tiene un problema de **descubribilidad** — acumula funciones potentes que nada en pantalla insinúa (el triple estado de una etiqueta, Ctrl+clic, arrastrar para cambiar de categoría...). La ayuda alojada en GitHub no se puede leer desde una app que corre en `file://`; la embebida sí viaja con el archivo.

Un modal (`#helpModalOverlay`) con cinco bloques — **Atajos, Gestos, Filtros, Datos y Tu archivo de datos** — que se abre con la tecla **`?`** (libre: el manejador de atajos comparaba solo `e.key === "/"`) o con el botón **"Ayuda (?)"** del pie del sidebar (`#appFooter`, pintado una sola vez en `renderFooter()`; el clic se delega sobre el contenedor porque `render()` no lo repinta, mismo criterio que `#btnEmptyStateAdd` sobre `#emptyState`). `?` se ignora bajo las mismas dos condiciones que `/` y `n` (decisión 15): mientras se escribe en un campo/elemento editable, y con cualquier overlay abierto. Es un overlay más, dado de alta con `registerOverlay()` (4.22): `Escape` y el clic fuera lo cierran sin código adicional.

**No repite las acciones de la paleta de comandos (4.22)**: esta cubre solo lo que una paleta no puede — gestos, filtros y comportamiento de los datos —, y el bloque "Atajos" remite a `Ctrl+K` para todo lo demás. La paleta, a su vez, incluye **"Ayuda: atajos y gestos"** (`hint: "?"`) como una entrada más de `COMMANDS`: cierra el círculo entre las dos superficies.

**Contenido**: un único array `HELP_SECTIONS`, junto al código, cada sección `{title, items}` con `items` como cadenas de HTML estático (pueden llevar `<kbd>` para teclas/gestos). `renderHelpPanel()` las concatena directamente — es texto de autor, no dato de usuario, así que no pasa por `escapeHtml()` y no interpola nada dinámico. **Regla permanente** (ver `CLAUDE.md`, "Al cerrar un cambio"): cualquier atajo, gesto o comportamiento de filtro nuevo añade su línea aquí, o el panel envejece con la primera función que no la tenga.

### 4.26 Salvaguardas de datos

**Problema de fondo**: hasta aquí, toda la colección vivía en `localStorage` y nada avisaba de los tres riesgos que eso implica — que "borrar datos de navegación" la elimina entera, que la cuota tiene un techo y las notas (4.23) crecen sin sobrescribir nunca, y que un guardado que no cabe fallaba **en silencio**, perdiendo el cambio sin decir nada. Esta sección no cambia dónde viven los datos: añade las salvaguardas que faltaban alrededor.

**Punto único de escritura.** Los once `saveX()` ya no llaman a `localStorage.setItem` cada uno por su cuenta: pasan por `storageWrite(key, value)`. Eso da un solo sitio donde muestrear la ocupación y, sobre todo, donde capturar el fallo por falta de espacio.

**Cuatro piezas:**

1. **Aviso de ocupación.** `getStorageUsage()` devuelve `{bytes, backupBytes, totalBytes, quotaEstimate, ratio}`. `bytes` son las once claves de estado; las copias se cuentan aparte, pero **el `ratio` incluye ambas**, porque lo que decide si el próximo guardado cabe es el total ocupado. Se remuestrea al abrir la app, al abrir el panel de limpieza y cada 20 guardados — no en cada tecla. Umbrales: por debajo del 60% no se dice nada; entre el 60% y el 85%, aviso discreto en `#appFooter`; por encima del 85%, aviso destacado con botón "Exportar ahora".

2. **Guardado que no cabe.** `storageWrite()` captura la excepción y abre `#storageFullOverlay`, que explica sin jerga que el cambio se ve en pantalla pero **no se ha guardado**, y ofrece exportar. `state` no se toca, así que la interfaz sigue mostrando lo que el usuario acaba de hacer y la exportación desde ese aviso lo incluye. Una guarda (`storageFullShown`) evita que un `save()` que escribe varias claves abra el aviso una vez por clave; se rearma al cerrarlo, porque el problema sigue ahí.

3. **Aviso de copia de seguridad.** Con exportación registrada, los días se cuentan desde ella; sin ninguna, desde que la colección llegó a 20 enlaces (antes de eso el aviso solo estorbaría). A los **7 días**, aviso discreto; a los **30**, destacado y descartable — y el descarte dura solo la sesión, porque el motivo no se ha ido. `hasEverExported()` separa los dos relojes: sin él, un contador recién arrancado diría "última copia guardada hoy" a quien no ha guardado ninguna en su vida.

4. **Copias rotativas locales.** Al arrancar, `rotateBackups()` guarda una instantánea del estado completo en `enlaces_backup_1_v1`, desplazando las anteriores y descartando la tercera. Tres guardas la protegen de hacer más mal que bien: la marca de sesión (recargar tres veces no tira las tres copias buenas), la comparación con la más reciente (no guardar tres veces lo mismo, que es una copia ocupando el triple) y la regla de que **una colección vacía o ilegible no desplaza a una copia con contenido**. `writeNewestBackup()` implementa la contrapartida: si no cabe, sacrifica las más antiguas, y si aun así no cabe no escribe nada y **no avisa** — una copia no puede ser nunca la causa de que falle un guardado real.

**Restaurar** (`#restoreBackupOverlay`, desde el panel de limpieza, desde el aviso del pie o con `Ctrl+K`): lista las copias con fecha, número de enlaces, tamaño y versión, y exige `confirm()` con **los dos recuentos** —lo que hay y lo que quedará— antes de aplicar. No borra ninguna copia: restaurar la equivocada tiene que poder deshacerse restaurando otra. Aplicar una copia escribe las once claves y recarga el estado por el mismo camino que el arranque (`reloadStateFromStorage()`), así que no hay una segunda copia de la lógica de deserialización.

**Datos ilegibles.** `readJson()` es el lector común de las nueve claves JSON. Si una tenía contenido y no se puede interpretar —o es un JSON válido con la forma equivocada, un objeto donde iba una lista— la clave queda anotada en `corruptKeys` y **el arranque deja de reescribir nada por su cuenta**: los tres guardados de normalización se saltan y no se toma instantánea. Unos datos rotos todavía se pueden rescatar a mano desde el navegador; no, si al abrir la app se han machacado ya con una lista vacía. Un aviso destacado en el pie lo dice y ofrece las dos salidas (restaurar una copia, o exportar lo que sí se ve).

**Envoltura del estado completo** (`getStateSnapshot()`), usada por las copias y disponible para 11.6:

```json
{ "format": "pinboard-state", "schemaVersion": 1, "appVersion": "1.9.0",
  "savedAt": "2026-08-15T10:00:00.000Z", "data": { "…las once claves…" } }
```

`readStateSnapshot()` o devuelve datos completos, o dice por qué no sirven: `invalid` (roto o de otro formato) y `newer` (`schemaVersion` superior al que entiende esta versión, que **no se carga**: aplicar a ciegas algo escrito por una versión más reciente destruye los campos que esta todavía no sabe leer). En el listado de copias, una así se muestra explicada y **sin botón de restaurar**.

**El JSON de exportación de 4.7 no cambia**: sigue siendo el canal oficial entre versiones. La envoltura es interna a esta sección.

**Fila en el panel de limpieza** (4.24): "Copias de seguridad y espacio", con los días sin copia, la ocupación desglosada y el número de instantáneas. Se pinta **siempre**, a diferencia de las ocho comprobaciones —que se ocultan a cero porque diagnostican defectos, mientras que esta informa de un estado que siempre existe—, y respeta la regla de la sección: cuenta y lleva a las herramientas que ya existen (exportar, restaurar), sin reparar nada por su cuenta.

### 4.27 El archivo como fuente de verdad

**Qué resuelve**: hasta aquí la colección vivía solo dentro del navegador, con las salvaguardas de 4.26 alrededor. Ahora puede vivir además en **un archivo del disco del usuario**, que se reescribe con cada cambio. Si ese archivo está en una carpeta sincronizada (OneDrive, Drive, Dropbox, una unidad de red, un repositorio git), la sincronización la da la carpeta: **Lingatu no integra ningún servicio, no abre ninguna conexión y no sabe qué hay debajo**.

**Es opcional y depende del navegador.** La File System Access API existe en Chrome y Edge, y **no existe en Firefox** (Fase 0, `spike/RESULTADOS.md`). `supportsFileMode()` decide si la acción se ofrece siquiera; donde no existe, la app funciona exactamente como antes.

**`localStorage` no se abandona: pasa a ser caché y red de seguridad.** Al conectar un archivo **no se borra nada**, y cada cambio se sigue escribiendo en las once claves de siempre, igual que antes. El archivo se escribe *además*. Eso hace que perder el archivo (o el permiso, o el navegador donde estaba) nunca deje al usuario sin datos, y es lo que permite arrancar y trabajar con normalidad mientras el permiso no esté concedido.

#### El adaptador

`StorageAdapter` es el punto por el que pasa la persistencia: `init()`, `loadAll()`, `saveAll()`, `getMode()`, `getStatusLabel()`, `disconnect()`. Los once `loadX()`/`saveX()` **se conservan tal cual** — los llaman `COMMANDS`, los listeners y el puente de la sección 8 — y siguen escribiendo en `localStorage`; lo que cambia es que `storageWrite()` (el punto único de escritura de 4.26) programa además el volcado al archivo cuando la clave es una de las once (`isStateKey`).

`loadAll()` solo se usa al arrancar con permiso ya concedido: lee el archivo, y `applyStateSnapshot()` vuelca su contenido a las once claves. A partir de ahí **todo el resto de la app funciona igual que siempre**, leyendo de `localStorage`. Es lo que mantiene el cambio pequeño: no hay dos caminos de lectura, hay uno solo con una fuente que a veces lo precede.

**Volcado con debounce de 500 ms**, más volcado forzado en `visibilitychange` (al ocultarse la pestaña) y en `beforeunload`. Este último solo interrumpe —con el aviso nativo del navegador— cuando de verdad queda algo sin escribir; en uso normal no aparece nunca.

#### Conexión y reconexión

Son **dos acciones distintas**, no una (decisión 57), disponibles en el pie del sidebar y en `Ctrl+K` con la misma función con nombre en los dos sitios:

- **«Guardar en un archivo…»** (`connectToFile`, `showSaveFilePicker`) — la primera vez. El archivo **no existe todavía y no lo crea el usuario**: se abre la ventana de guardar del sistema con el nombre sugerido `lingatu-datos.json`, y el navegador lo crea donde se le diga, ya con la colección dentro. Si el archivo elegido ya contenía una colección de Lingatu, se pregunta con los dos recuentos delante cuál se conserva.
- **«Ya tengo uno»** (`openExistingFile`, `showOpenFilePicker`) — segundo equipo, carpeta sincronizada, reinstalación. Aquí manda el archivo: se lee **antes de tocar nada** y se pregunta si se carga su contenido o se conserva el del equipo. Como "abrir" solo concede lectura, se pide `requestPermission({mode:"readwrite"})` aprovechando el mismo clic. Si el archivo no es de Lingatu, o lo guardó una versión más reciente, se avisa y no se escribe encima sin confirmación explícita.
- **«Abrir mis enlaces»** (`reconnectFile`): el permiso no sobrevive (Fase 0, P6; P11 descartó que fuera cosa del origen opaco de `file://`), así que al abrir Lingatu hay que devolverlo con un gesto.

  **Cuándo caduca, exactamente** (P12, medido a raíz de la pregunta *"¿tiene que pedirlo siempre?"*): el navegador retira el permiso **en cuanto el origen se queda sin ninguna pestaña abierta** — cerrar la pestaña de Lingatu basta, no hace falta cerrar el navegador. Recargar la página no lo pierde, y mientras quede otra pestaña del mismo origen abierta tampoco (con `file://`, cualquier página local cuenta, por P9). **No hay umbral de tiempo ni nada que optimizar**: es la regla de la plataforma.

  > **Esta viñeta cambió por completo en 4.29, y es el cambio más importante de este documento.** Se llamaba «Reconectar» y **la app no se bloqueaba esperando el permiso**: arrancaba con los datos del navegador y funcionaba con normalidad. Eso es justo lo que hacía imposible saber qué se estaba mirando. Ahora, en modo archivo y sin archivo disponible, **no se pinta ni una ficha**: se enseña la pantalla de apertura. Lo de abajo sigue siendo cierto para el otro camino que queda —volver a modo archivo tras haber trabajado en local—, que es el único en el que puede haber dos versiones.

  **Lo que se edita en modo local baja al archivo al volver a modo archivo.** `scheduleFileSave()` marca el cambio como pendiente aunque no pueda escribirlo todavía, y el indicador lo dice con esas palabras en vez de fingir que está guardado. Al recuperar el acceso, `syncAfterReconnect()` **compara el contenido del archivo con el estado local** y vuelca si difieren. No se fía de la bandera `dirty`: vive en memoria y se pierde al cerrar el navegador, así que unos cambios hechos ayer sin permiso no dejarían ningún rastro (decisión 58).
- **«Desconectar»**: suelta el archivo y olvida el handle. **No borra nada** — ni el archivo ni `localStorage` — y lo dice en la confirmación.
- Si el archivo ya no está donde estaba, se dice explícitamente y se ofrece elegir otro u olvidarlo. Tampoco ahí se borra nada.

El handle vive en **IndexedDB** (`lingatu_file_v1`), porque no es serializable a JSON; sobrevive al cierre del navegador aunque el permiso no. En `localStorage` se guarda solo su metadato (`enlaces_file_meta_v1`: nombre, `lastModified` y fecha del último guardado), para poder decir *"sin conectar con lingatu-datos.json"* antes de tener permiso.

#### Conflictos, y por qué esto no es sincronización

Tras cada escritura se guarda el `lastModified` del archivo. Antes de escribir se vuelve a leer: si no coincide, **no se sobrescribe nada** y se abre `#fileConflictOverlay` con las dos versiones (fecha, número de enlaces y versión de la app) y **tres salidas**: quedarse con la del archivo, quedarse con la de la sesión, o **guardar la de la sesión como archivo nuevo** — la tercera es la que garantiza que ninguna salida pierde datos, porque convierte el conflicto en dos archivos.

El propio modal lo dice sin rodeos: *no es sincronización, es un archivo compartido con detección de conflictos*. Sirve para "trabajo en un equipo cada vez", no para edición simultánea.

**Regla de reducción brusca**: una escritura que deje el archivo **vacío, o por debajo de la mitad** de lo que tenía, pide confirmación con los dos recuentos. No se pide en cada borrado —eso haría la app inusable— sino en el tipo de pérdida que no se hace sin querer (decisión 54).

#### Indicador de estado

**El estado vive ahora en la barra superior** (`#storageBadge`, 4.29) y **el pie conserva solo las acciones** (`#storageStatus`: abrir, buscar el archivo, crear otro, olvidarlo, «Guardar ahora», desconectar). El motivo del traslado es simple: en el pie del lateral había que desplazarse hasta el final para leer lo único que responde a "¿de dónde salen los enlaces que estoy viendo?".

Lo que no cambió es el principio: **que un cambio no esté en el archivo nunca se muestra como "guardado"**, ni cuando el usuario canceló una escritura, ni cuando cerró el conflicto sin elegir, ni cuando hubo un error. `syncStorageStatus()` refresca también el indicador de arriba, porque los guardados terminan fuera de cualquier repintado (debounce, `visibilitychange`).

### 4.28 Internacionalización (español / inglés)

Toda la interfaz existe en los dos idiomas. **Los datos del usuario no se traducen nunca**: títulos, descripciones, categorías, etiquetas y notas son suyos y cambiar de idioma no toca ni uno.

**El diccionario.** Un objeto `I18N` con dos mapas planos de clave → texto (`es`, `en`), embebido en `lingatu.html` entre las marcas `/* i18n:inicio */` y `/* i18n:fin */`. No hay archivo de idioma aparte porque no puede haberlo: la app corre en `file://` y no puede cargarlo. Las claves son jerárquicas por punto y están agrupadas por zona (`sidebar.*`, `toolbar.*`, `modal.*`, `manage.*`, `import.*`, `export.*`, `cleanup.*`, `file.*`, `help.*`, `palette.*`, `command.*`, `selection.*`, `empty.*`, `restore.*`, `storage.*`, `footer.*`, `lang.*`, `common.*`).

**Resolución.** `t(clave, params)` devuelve el texto del idioma activo, interpola `{nombre}` por sustitución literal (nunca evalúa nada) y, si la clave falta en ese idioma, **usa el español y lo avisa por `console.warn`**. Nunca se enseña la clave cruda: leer `cleanup.duplicateUrls` en pantalla es peor que leer la frase en el otro idioma.

**Plurales.** `plural(clave, n, params)` resuelve entre las dos formas de un valor `{one, other}` e interpola `{n}` siempre. Dos formas bastan para español e inglés, así que no se usa `Intl.PluralRules` (ES2018, fuera de la sintaxis ES5 que declara la sección 2). Lo usan el recuento de selección, `linkCountText()`, las notas de un enlace, los recuentos del panel de revisión, los enlaces por categoría, el resumen de importación y las confirmaciones de borrado.

**HTML estático.** Cuatro atributos, aplicados por `applyI18n()` al arrancar y en cada cambio de idioma: `data-i18n` (textContent), `data-i18n-html` (innerHTML, solo para los textos de autor que llevan `<strong>`/`<code>` dentro), `data-i18n-title`, `data-i18n-aria` y `data-i18n-placeholder`. En el `<body>` no queda ningún texto visible sin cubrir. Los dos botones cuyo texto depende del estado (`#btnToggleAllGroups`, `#btnSelectionMode`) van **vacíos** en el HTML: lo escribe `render()`, y repetirlo aquí dejaría una segunda fuente de verdad.

**Panel de ayuda.** `HELP_SECTIONS_BY_LANG = { es: [...], en: [...] }`, con la misma estructura `{title, icon, items}` y el mismo HTML de autor con `<kbd>`. Sigue sin pasar por `escapeHtml()` (decisión 44). **Regla permanente: cada atajo, gesto o filtro nuevo añade su línea en los DOS idiomas** — en uno solo deja el panel del otro incompleto sin que nada avise.

**Selector.** Un `<select>` en `#appFooter`, junto a la versión, más una entrada en `COMMANDS` que llama a la misma función con nombre (`setLanguage`/`toggleLanguage`, decisión 25). La etiqueta de ese comando nombra siempre el idioma **al que** se cambia, así que en cada diccionario está escrita en el otro idioma: buscar "english" en la paleta lo encuentra aunque la app esté en español. Cambiar de idioma **no recarga la página**: `applyI18n()` + `renderFooter()` + `render()`.

**Idioma por defecto.** Preferencia guardada → si no hay y **ya había datos en este navegador**, español → `navigator.language` que empiece por `es` → inglés. La segunda regla es la migración (R9): quien ya usaba Lingatu no se encuentra la interfaz cambiada tras actualizar, y ve una sola vez un aviso discreto en el pie de que ahora hay selector. `hadDataAtStartup` se calcula **una vez, antes de que el arranque escriba nada** — en cuanto `reloadStateFromStorage()` hace su primer guardado, la respuesta sería que sí siempre.

**Lo que no cambia con el idioma**, y no por descuido:

- **Los atajos de teclado.** `/`, `n`, `?` y `Ctrl+K` son idénticos. `n` sirve igual para *nuevo* y para *new*; cambiar teclas por idioma crearía dos modelos mentales y obligaría a mantener dos paneles de ayuda con teclas distintas.
- **Los operadores de búsqueda** (4.3). `cat:`, `site:` e `is:` son invariantes, e `is:` sigue aceptando `activo`/`active` e `inactivo`/`inactive`. Una consulta escrita debe seguir funcionando al cambiar de idioma, y una compartida entre dos usuarios también.
- **El encabezado de fecha de las notas** (4.23). `formatNoteBlock()` genera `## DD/MM/AAAA` **dentro del campo `notes`**, que es dato persistido, y `countNoteBlocks()` lo lee para contar bloques. Variarlo por idioma produciría notas del mismo usuario con dos formatos mezclados y pondría en riesgo el recuento que enseña la extensión (decisión 36). Queda fijo en todos los idiomas.
- **El formato de exportación** (4.7) y las claves de `localStorage`.

Las fechas que sí son **presentación** (el sello de las copias, `formatStamp()`) usan `toLocaleDateString`/`toLocaleTimeString` con el locale activo, forzando dos dígitos en día y mes: el locale decide el orden y el separador, que es lo que hay que localizar, pero sin cero delante la fecha no cuadra con el resto de sellos de la app.

**Verificación.** [`tools/verificar-i18n.html`](../tools/verificar-i18n.html) (R11) carga `lingatu.html` y enseña, en diez segundos, las claves que faltan en un idioma, las duplicadas dentro del mismo idioma, las definidas que no usa nadie y las usadas que no están definidas. Lee el bloque **recorriéndolo carácter a carácter**, no con `JSON.parse`: es JavaScript con comentarios y con plurales, y además `JSON.parse` se quedaría con la última de dos claves repetidas en silencio — justo el fallo que hay que ver.

**La extensión** usa el mecanismo nativo de Chrome (`_locales/{es,en}/messages.json` + `default_locale`), no este diccionario. Consecuencia aceptada: el idioma de la extensión lo decide el navegador y el de la app lo decide el usuario, así que **pueden divergir** (sección 10).

### 4.29 El modo de trabajo lo elige el usuario, y la pantalla de apertura

**Qué resuelve.** Hasta aquí, el modo de almacenamiento **no era una decisión del usuario: era un estado derivado del permiso del navegador**. `StorageAdapter.getMode()` devolvía `"file"` o `"localstorage"` según si Chrome había concedido acceso *en esa sesión*, así que el modo **cambiaba solo, bajo los pies del usuario**, y la aplicación seguía funcionando con normalidad como si nada. El escenario que lo enseña entero:

1. Abres Chrome. El permiso no sobrevivió al cierre, así que el modo es local aunque tú creas estar trabajando con tu archivo.
2. Añades un enlace. Se guarda… en el navegador.
3. Pulsas «Reconectar».
4. El enlace sigue en pantalla, así que das por hecho que está en el archivo.
5. Abres Edge, conectado al mismo archivo. El enlace no está.
6. Vuelves a Chrome y ahí sigue, pero no ha llegado nunca al archivo.

La decisión 58 arregló que el cambio del paso 2 llegue al archivo al reconectar. Esto arregla **la causa**: que en el paso 1 la aplicación enseñe una colección sin poder decir de dónde sale.

**La inversión.** El modo lo elige el usuario y se persiste (`enlaces_storage_mode_v1`). Lo único que decide el permiso es si la aplicación *puede trabajar ahora mismo* o tiene que **pedir que abras tu archivo**. Es el modelo mental de cualquier documento —o lo tienes abierto, o no lo tienes— y no exige entender qué es un permiso ni un handle.

#### Dos preguntas que antes eran una

| Función | Responde a | La decide |
|---|---|---|
| `StorageAdapter.getMode()` | ¿Dónde ha dicho el usuario que quiere trabajar? | El usuario (persistido) |
| `StorageAdapter.isFileReady()` | ¿Puedo leer y escribir el archivo ahora mismo? | El permiso del navegador |

Todo el código que antes preguntaba `getMode() !== "file"` para decidir *si podía escribir* pregunta ahora `isFileReady()`. Esa confusión entre las dos preguntas era el fallo.

**Migración.** Una instalación con archivo recordado (nombre en `enlaces_file_meta_v1`, o handle en IndexedDB) arranca en `"file"`; cualquier otra, en `"local"`. Nadie tiene que configurar nada para seguir como estaba. En un navegador sin File System Access API el modo archivo se corrige a local **en memoria**, sin tocar la preferencia guardada: quien abra el mismo archivo desde Firefox y luego vuelva a Chrome sigue en modo archivo.

#### La pantalla de apertura

Con modo `"file"` y el archivo **no disponible**, la aplicación **no carga los enlaces de `localStorage` en `state`** y **no pinta ninguna ficha**. En su lugar, `#openGate` ocupa la zona de contenido:

> **Tus enlaces están en `lingatu-datos.json`.**
> Ábrelo para verlos y trabajar con ellos.
> [ Abrir mis enlaces ] · Trabajar con los datos de este navegador

**No puede parecerse a "no tienes enlaces"** — es la lectura que hará cualquiera ante un hueco vacío, y sugiere que se han perdido. Cuatro variantes, porque cuatro son las situaciones en que un archivo no está disponible, y decirlas con las mismas palabras sería mentir en tres de ellas:

| Variante | Cuándo | Acciones |
|---|---|---|
| `closed` | Hay handle recordado, falta el permiso de esta sesión | Abrir mis enlaces · trabajar en local |
| `pick` | **No hay handle** (perfil nuevo, IndexedDB vaciado), aunque se recuerde el nombre | Abrir uno que ya tengo · crear uno nuevo · trabajar en local |
| `missing` | El archivo ya no está donde estaba | Buscar mi archivo · trabajar en local |
| `unsupported` | El navegador no puede abrir archivos | Trabajar en local |

La distinción entre `closed` y `pick` es por el **handle**, no por el nombre, y no es un detalle: con nombre pero sin handle, tratarlo como `closed` acabaría llamando al selector de *guardar como* delante del archivo que contiene la única copia de la colección, con su *"¿desea reemplazarlo?"* — exactamente el diálogo que la decisión 57 eliminó.

**Mientras esa pantalla está puesta solo hay dos salidas**: abrir el archivo o cambiar el modo a local. Todo lo demás queda desactivado — crear, editar, borrar, importar, **exportar**, las acciones en lote, las vistas, el panel de revisión y la paleta de comandos. Exportar es el que más se olvida y el más traicionero: produciría un JSON de los datos del navegador con el nombre de tu colección, que es otra forma de acabar creyendo que tienes lo que no tienes.

El bloqueo se **ve**, y esa parte no es cosmética: un botón desactivado que sigue pintado de azul y con el cursor de mano se pulsa, no pasa nada visible y la lectura no es *"esto ahora no se puede"* sino *"esto está roto"*. Por eso hay una regla global de `:disabled` (opacidad, escala de grises y `cursor:not-allowed`), y por eso **las tres secciones del lateral —categorías, vistas y etiquetas— se ocultan** mientras dura la pantalla: describen una colección que no está cargada, y dejarlas visibles las llenaba de ceros y de *"sin etiquetas todavía"* justo al lado de un mensaje que dice que tus enlaces están en un archivo. El botón principal de la pantalla recibe además el foco al aparecer, para que baste con pulsar Enter.

El bloqueo tiene **dos capas, y las dos hacen falta**: `syncLockedUi()` pone `disabled` en los controles (nadie ve un botón que parece que funciona) y `bloqueadoPorApertura()` guarda los caminos que no pasan por un botón —atajos de teclado, arrastrar y soltar, la paleta— avisando con palabras, porque un clic que no responde parece una avería. El puente de la sección 8 tiene su propia guarda, `bridgeGuard()`, que **lanza**: la extensión lo interpreta como "no hay puente" y enseña su badge rojo, que es exactamente lo que debe pasar.

**Las copias automáticas rotativas (4.26) no se toman con la pantalla puesta.** El estado en memoria no representa la colección real; `rotateBackups()` ya tenía el precedente exacto de esta cautela con las claves ilegibles. Se toman al desbloquear (`unlockApp()`), que es cuando la instantánea significa algo.

#### Cambiar de modo

- **De archivo a local**: se cargan los datos del navegador y queda un **aviso permanente con su fecha** (`#modeNotice`, bajo la barra de herramientas) mientras dure ese modo teniendo un archivo recordado: *«Estás viendo la última copia guardada en este navegador el 14/08/2026 a las 18:52, no tu archivo `lingatu-datos.json`»*. Sin la fecha, el cambio de modo reintroduciría por la puerta de atrás la confusión que esta función elimina. Sale de `enlaces_file_meta_v1.savedAt`, que ya se guardaba.
- **De local a archivo habiendo tocado algo**: no se inventa nada nuevo. Se abre el archivo, se compara y, si las dos versiones divergen, decide el **modal de conflicto de tres salidas que ya existía** (4.27). Por eso `switchToFileMode()` **no vacía el estado antes de abrir**: lo que hay en memoria es justo la versión "de esta sesión" que ese modal necesita.
- **Al abrir desde la pantalla de apertura manda el archivo, sin preguntar** (`unlockFromFile()`): en memoria no hay ninguna colección con la que competir. Si el archivo está vacío —recién creado—, la única colección que existe es la del navegador y su sitio es ese archivo.
- **Cambiar de modo nunca borra nada**: ni el archivo, ni `localStorage`, ni el handle recordado. Soltar el archivo (`disconnect`) sí deja el modo en local, porque quedarse en modo archivo sin archivo dejaría la app pidiendo abrir algo que ya no existe.

#### El indicador, donde se vea

Sube del pie del lateral a la barra superior (`#storageBadge`), siempre visible, en el idioma de alguien que no sabe qué es un permiso. Pulsarlo abre los ajustes (4.30).

| Estado | Texto |
|---|---|
| Archivo abierto y al día | `📄 lingatu-datos.json · guardado a las 18:52` |
| Archivo con algo sin escribir | `⚠️ Hay cambios que aún no están en lingatu-datos.json` |
| Modo local | `💻 Guardando en este navegador` |
| Modo archivo, sin abrir todavía | `📄 lingatu-datos.json · sin abrir` |

### 4.30 Panel de ajustes

Overlay `#settingsOverlay`, registrado en `OVERLAYS` como todos, con su entrada en `COMMANDS` llamando a la misma función con nombre que los dos controles que lo abren (el botón «Ajustes» del pie y el propio indicador de la barra superior). **Cuatro ajustes, y ninguno toca un dato del usuario:**

| Ajuste | Valores | Clave |
|---|---|---|
| Modo de trabajo | Este navegador / Un archivo mío | `enlaces_storage_mode_v1` (4.29) |
| Idioma | Español / English | `enlaces_lang_v1` (4.28) |
| Tema | Claro / Oscuro / El del sistema | `enlaces_theme_v1` |
| Archivo de datos | Nombre del archivo y botones para elegirlo o soltarlo | `enlaces_file_meta_v1` (4.27) |

**El tema** se aplica con `data-theme` en `<html>`, que redefine las variables de `:root`. «El del sistema» **no pone atributo** y deja mandar a la `@media (prefers-color-scheme: dark)` de siempre: es el valor por defecto y el comportamiento anterior, y es lo que evita el parpadeo en claro al abrir, porque no depende de que el JavaScript haya llegado a ejecutarse. La paleta oscura está escrita **dos veces a propósito** (ver decisión 65) y las dos copias tienen que decir lo mismo.

**La ruta del archivo no se puede escribir a mano** y no es una carencia que vaya a resolverse: el navegador no da rutas y no existe forma de abrir un archivo por su ruta. Se muestra el nombre y se ofrecen los botones que ya existían (`openExistingFile`, `connectToFile`, `disconnectFile`). Prometer ahí un campo de texto sería mentir sobre lo que la plataforma permite.

**Donde `supportsFileMode()` es `false` (Firefox), el bloque del modo y el del archivo no se muestran** — ni siquiera desactivados. Enseñar en gris algo que ese navegador no podrá hacer nunca parece una avería de Lingatu, no una limitación del navegador.

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
    Toolbar: buscador + toggle estado + toggle vista + botón paleta (4.22) + contador resultados
             + #storageBadge   ← dónde se está guardando (4.29), abre los ajustes
    #modeNotice                ← aviso fechado de "estás viendo la copia del navegador" (4.29)
    #openGate                  ← pantalla de apertura; ocupa el sitio de las fichas (4.29)
    #linksContainer            ← agrupado por categoría (ver 4.2)
    #emptyState                ← mensaje "sin resultados"
    #selectionBar              ← barra de acciones en lote, fija abajo (ver 4.21)
  </main>
</div>

#modalOverlay                   Modal de alta/edición de enlace (dos columnas, ver 4.1)
#notesViewerOverlay             Visor de notas en solo lectura (4.23)
#manageModalOverlay             Modal de gestión de categorías/etiquetas (genérico, reutilizado)
#importModalOverlay             Modal de decisión al importar (Fusionar / Sustituir todo / Cancelar)
#importCategoriesModalOverlay   Modal de decisión al importar categorías (4.19)
#cleanupModalOverlay            Panel de limpieza (4.24)
#helpModalOverlay               Panel de ayuda (4.25)
#storageFullOverlay             Aviso de que un guardado no ha cabido (4.26)
#restoreBackupOverlay           Lista de copias de seguridad para restaurar (4.26)
#fileConflictOverlay            El archivo cambió por fuera: tres salidas (4.27)
#settingsOverlay                Panel de ajustes: modo, idioma, tema y archivo (4.30)
#commandPaletteOverlay          Paleta de comandos (4.22)
```

Todos los overlays se dan de alta con `registerOverlay()`, que es lo que los hace cerrables con `Escape` y lo que bloquea los atajos de una tecla mientras están abiertos (4.22). El pie del sidebar (`#appFooter`) incluye además `#footerNotices`, donde se pintan los avisos permanentes de 4.26.

## 6. Funciones JavaScript clave

| Función | Responsabilidad |
|---|---|
| `storageWrite(key, value)` | **Punto único de escritura** (4.26): por aquí pasan los once `saveX()`. Muestrea la ocupación y captura el fallo por falta de espacio, que antes se perdía en silencio |
| `readJson(key, fallback)` / `markCorrupt(key)` | Lector común de las nueve claves JSON (4.26): devuelve el valor por defecto si el contenido no se puede interpretar **o tiene la forma equivocada**, y anota la clave en `corruptKeys` para que nadie escriba encima |
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
| `getCategories()` / `getAllTags()` | `getCategories()` devuelve `[{name, count}]` con el recuento **absoluto** de uso, respetando el orden manual de `state.categories`. Lo usan el modal de gestión, el panel de revisión y la paleta, que hablan de la colección y no de la vista; **el lateral usa `getSidebarCounts()`**. **`getAllTags()` devuelve solo los nombres** (array de cadenas), ordenados alfabéticamente y **sin recuento** |
| `getSidebarCounts()` | Recuentos que enseña el lateral: cuántos enlaces verías **al pulsar cada categoría** con los filtros puestos ahora mismo, más el total equivalente para "Todas". Un solo recorrido de `state.links` (4.3) |
| `getTagCounts()` | Recuento de uso por etiqueta (`{tag: count}`), un solo recorrido de `state.links`. Compartida por `renderManageList()` y el panel de limpieza (4.24) — antes era un cálculo en línea duplicado |
| `swapCategories(nameA, nameB)` | Intercambia la posición de dos categorías en `state.categories` por nombre (reordenación manual con ▲/▼ en el modal de gestión) |
| `moveCategoryTo(draggedName, beforeName)` | Mueve una categoría a la posición justo antes de `beforeName` (o al final si es `null`) — arrastrar y soltar en `#categoryList` |
| `duplicateEditingLink()` | Duplica el enlace que se está editando (título + `" _copia"`) y hace que el modal pase a editar la copia recién creada |
| `renderViewProfileList()` | Pinta los chips de perfiles de vista guardados, marcando como activo el que coincide con `state.activeViewProfile` (por nombre, ver 4.17) |
| `applyViewProfile(profile)` / `clearActiveViewProfile()` | Aplican un perfil de vista (fijan sus cuatro dimensiones y `state.activeViewProfile`) / lo sueltan vaciándolas. Único sitio donde vive esa lógica: la comparten el chip del sidebar (que alterna entre las dos) y la paleta de comandos (que solo aplica) |
| `detachActiveView()` | Suelta la vista aplicada sin tocar categorías ni etiquetas: `state.activeViewProfile = null` **y** `state.viewLinkIds` vacío. Se llama desde todos los puntos donde el usuario cambia un filtro a mano (4.17) |
| `linkPassesFilters(l, query, salvo)` | Criterio único de "este enlace se ve o no": foco de revisión (4.24), enlaces de la vista aplicada (4.17), categoría, activos, etiquetas incluidas, etiquetas **excluidas** y búsqueda con operadores. `salvo` permite saltarse **una** restricción, que es lo que necesitan los recuentos del lateral para responder "cuántos verías al pulsar esto" |
| `getFilteredLinks()` | Aplica `linkPassesFilters()` sobre `state.links` sin saltarse nada y sin reordenar (ver nota "Orden" en sección 3). Parsea la búsqueda una sola vez con `parseSearchQuery()`, fuera del `filter` |
| `clearAllFilters()` | Quita **todas** las restricciones de la vista: categorías, etiquetas incluidas, etiquetas excluidas (y las persiste vacías), filtro de estado, vista aplicada, foco de revisión y búsqueda. La usan el botón «Quitar los filtros» del estado vacío (4.8) y `resetFiltersAfterImport()`, que quería decir exactamente esto |
| `parseSearchQuery(raw)` | Búsqueda con operadores (4.3): convierte el texto de `#searchInput` en `{text, textNeg, cat, catNeg, tag, tagNeg, site, siteNeg, is, isNeg}` — términos del mismo operador en OR, distintos en AND, negaciones siempre AND NOT (R1). Un token con contenido vacío tras quitar su prefijo se descarta |
| `tokenizeSearchQuery(raw)` / `classifySearchToken(token)` | Auxiliares de `parseSearchQuery`: trocean la consulta en palabras respetando frases entre comillas (una comilla sin cerrar se trata como texto normal) / deciden el operador, el valor y si el token está negado |
| `linkMatchesQuery(link, parsed)` | Decide si un enlace cumple la consulta ya parseada; `searchHaystack(l)` calcula el texto libre sobre el que buscan los términos sin operador (título + descripción + etiquetas + notas + URL) |
| `describeActiveConstraints()` | Enumera como texto las restricciones vigentes (categoría, etiquetas, estado, vista, búsqueda) para el estado vacío que explica un cero por conflicto AND (ver `renderCards()`) |
| `hasLinkSelection()` / `getLinksForExport()` | Deciden qué exporta el botón "Exportar" (4.7): sin categoría/etiquetas/enlaces seleccionados exporta todo; con alguna selección, solo esos enlaces (sin tener en cuenta búsqueda ni el toggle Todos/Activos) |
| `syncExportButtonLabel()` | Actualiza el `title` de `#btnExport` según `hasLinkSelection()`, llamada desde `render()` |
| `normalizeUrlForCompare(url)` | Normaliza una URL (trim, sin `/` final, minúsculas) para comparar duplicados |
| `findDuplicateUrl(url, excludeId)` | Busca un enlace existente con la misma URL normalizada, excluyendo un `id` (el que se está editando) |
| `computeCleanupChecks()` | Panel de limpieza (4.24): calcula las ocho comprobaciones sobre `state.links`/`categories`/`allTags`, cada una `{id, label, unit?, items:[{label, linkIds}]}`. Se llama solo al abrir el panel |
| `groupBy(items, keyFn)` | Auxiliar genérico de agrupación en un mapa (un recorrido, sin bucles anidados), usado por varias de las ocho comprobaciones |
| `hasTrackingParams(url)` | `true` si la query de la URL lleva algún `utm_*`, `fbclid`, `gclid`, `mc_cid`, `mc_eid` o `igshid`; `false` (sin error) si la URL es inválida |
| `cleanupCheckFocusIds(check)` | Unión (`Set`) de los `linkIds` de todos los items de una comprobación: el N real de su botón "Ver estos N" |
| `openCleanupPanel()` / `closeCleanupPanel()` / `renderCleanupPanel()` | Abren el modal (recalculando las comprobaciones), lo cierran, y pintan la lista de filas plegables con `escapeHtml()` en todo lo que viene de datos de usuario |
| `syncFocusBanner()` | Muestra/oculta `#focusBanner` según `state.focusIds`, llamada desde `render()` |
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
| `bulkCreateView()` | Sexta acción en lote (4.21): guarda los enlaces seleccionados como una vista de selección (4.17), sin aplicarla ni vaciar la selección |
| `syncSelectionUi()` | Etiqueta del botón del modo, clase `selection-mode` del contenedor y visibilidad/recuento de `#selectionBar`, llamada desde `render()` |
| `toggleCategoryCollapse(cat)` | Pliega/expande un grupo de categoría y persiste el estado |
| `syncToggleAllGroupsLabel()` | Actualiza la etiqueta del botón "Plegar todo"/"Expandir todo" según el estado actual |
| `openManageModal(type)` / `renderManageList()` / `performRename(oldName, newValue)` | Modal de gestión: apertura, render (incluye modo edición inline y selector de color) y aplicación del renombrado |
| `performImportReplace(data)` / `performImportMerge(data)` | Las dos estrategias de importación (ver 4.7) |
| `parseImportFile(text)` | Enruta el texto de un archivo importado por contenido (JSON de Lingatu / `Bookmarks` de Chromium / HTML Netscape) y devuelve `{data, format}` (4.7) |
| `parseChromiumBookmarks(obj)` / `parseNetscapeBookmarks(text)` | Convierten, respectivamente, un `Bookmarks` de Chromium ya parseado y un HTML Netscape (vía `DOMParser`) al formato de enlace de Lingatu, deduplicando dentro del propio archivo (4.7) |
| `netscapeFolderPath(anchor)` | Sube desde un `A[href]` por sus ancestros `<DL>` para reconstruir la ruta de carpetas del HTML Netscape (4.7) |
| `handleImportFileText(text)` | Parte compartida entre el botón "Importar" y soltar un archivo: parsea, rellena `#importSummary` y abre `#importModalOverlay` (4.7) |
| `isInternalDrag()` | `true` si hay un arrastre interno en curso (ficha o categoría); usada por los manejadores de `document` para no interferir con el drag & drop interno al soltar un archivo (4.7) |
| `formatNoteBlock(text)` / `appendNoteToText(existing, block)` / `countNoteBlocks(text)` | Notas (4.23): envuelven un texto en su bloque con encabezado de fecha (`## DD/MM/AAAA`) / lo añaden al final de las notas ya existentes, separado por una línea en blanco y sin espacios sobrantes / cuentan los bloques con encabezado, que es lo que `appendNote` devuelve como `noteCount` para el aviso de la extensión |
| `notesIndicatorHtml(l)` | Indicador 📝 de una ficha con notas, compartido por `cardHtml` y `cardHtmlCompact`; cadena vacía si el enlace no tiene notas |
| `openNotesViewer(id)` / `closeNotesViewer()` | Visor de notas en solo lectura (4.23): pinta título, categoría, dominio y las notas renderizadas, y lo cierra. Registrado en `OVERLAYS` como cualquier otro overlay |
| `renderNotesInto(container, text)` | Renderiza una nota como nodos del DOM (4.23, decisión 38): bloques línea a línea (encabezados, citas, listas, párrafos). **La única función de la app que produce marcado sin pasar por `escapeHtml`, porque no construye HTML desde cadenas**: todo texto entra por `textContent` |
| `copyTextToClipboard(text, btn)` / `flashCopyButton(btn, ok)` | Copian un texto al portapapeles con `navigator.clipboard` y **respaldo con `execCommand` sobre un `<textarea>` temporal**, porque en `file://` el API puede fallar según navegador y foco / confirman el resultado en el propio botón (✓ o ✕ durante segundo y medio). Hoy lo usa el botón de los bloques de código; sirve tal cual para "copiar URL" (11.1) |
| `renderNoteLinesInto(el, lineas)` / `renderInlineInto(el, texto)` / `renderEmphasisInto(el, texto)` / `isNoteBlockStart(linea)` | Auxiliares del anterior: saltos de línea reales entre líneas de un bloque / código con backticks (que se procesa primero y no se vuelve a tocar) / `**negrita**` y `*cursiva*` / si una línea abre un bloque nuevo, para saber dónde acaba un párrafo |
| `prefillAndOpen(data)` | Abre el modal de "Nuevo enlace" con los campos precargados (superficie del puente, sección 8). Es una función con nombre porque `appendNote` la reutiliza para el caso "la URL todavía no existe" |
| `t(clave, params)` | Texto de interfaz en el idioma activo (4.28), con interpolación de `{nombre}` por sustitución literal. Si la clave falta en ese idioma usa el español y avisa por `console.warn`; **nunca devuelve la clave cruda** |
| `plural(clave, n, params)` | Como `t()`, pero eligiendo entre las dos formas de un valor `{one, other}`. Interpola `{n}` siempre |
| `applyI18n()` | Aplica el diccionario al HTML estático (`data-i18n`, `-html`, `-title`, `-aria`, `-placeholder`) y fija el `lang` del documento. Se llama al arrancar y en cada cambio de idioma |
| `setLanguage(lang)` / `toggleLanguage()` | Cambian el idioma sin recargar la página y sin tocar ningún dato: persisten la preferencia y repintan (`applyI18n` + `renderFooter` + `render`). Los llaman el `<select>` del pie y el comando de la paleta, la misma función para los dos (decisión 25) |
| `initLang()` / `detectLang()` | Resuelven el idioma al arrancar y dejan anotado si **ya había datos** (`hadDataAtStartup`), que es lo que distingue una instalación nueva de una que viene de antes (4.28, R9) |
| `uncategorizedName()` / `setUncategorizedName(n)` / `initUncategorizedName()` | Leen, fijan y estrenan el nombre persistido de la categoría por defecto. **Todo `ensureCategory` de "Sin categoría" pasa por el primero**; el tercero solo actúa la primera vez, y con datos previos elige siempre el nombre español (decisión 58) |
| `currentLocale()` | Etiqueta de locale (`es-ES`/`en-GB`) para las fechas **de interfaz**. No afecta al encabezado de bloque de las notas, que es dato y queda fijo |
| `helpSections()` | Las secciones del panel de ayuda del idioma activo, con respaldo en español (4.28) |
| `cardEditDeleteHtml(l)` | Los iconos ✏️/🗑️ que llevan las dos plantillas de ficha. Extraído al traducirlos: escritos por duplicado, uno se habría quedado sin traducir |
| `escapeHtml(str)` | Sanitiza cualquier texto antes de insertarlo como HTML (previene XSS) |
| `safeColor(color)` | Devuelve el color solo si tiene forma hexadecimal (`#rgb`/`#rrggbb`); si no, `""`. Es lo que se pinta dentro de los atributos `style`, donde escapar no basta (decisión 46) |
| `isValidId(id)` | `true` si el id tiene la forma alfanumérica que produce `genId()`. Único filtro de los id que llegan de un archivo importado (4.7, decisión 46) |
| `normalizeTags(raw)` | Parsea el texto libre de etiquetas del formulario en un array `#etiqueta` deduplicado |
| `genId()` | Genera IDs únicos: `Date.now().toString(36) + random` |
| `tagsFieldSetChips(tags)` / `renderTagsChips()` | Editor de chips de etiquetas (4.20): fijan/repintan los chips confirmados a partir de un array, usado al abrir el modal (edición o alta) y al cancelarlo |
| `tagsFieldCommitToken(raw)` / `tagsFieldCommitFromText(raw)` | Confirman un texto como chip (resolviendo el nombre canónico existente sin tocar `state.allTags`) / trocean un texto pegado con varias etiquetas y confirman cada una |
| `tagsFieldResolveCanonical(raw)` | Versión de solo lectura de `ensureTag`: resuelve el nombre canónico ya existente (case-insensitive) o el texto limpio con `#`, sin registrar nada en la lista maestra |
| `getTagsFieldSuggestions()` / `refreshTagsSuggestions()` | Calculan y pintan el desplegable de sugerencias filtrado por el texto actual del campo |
| `registerOverlay(el, closeFn)` | Da de alta un overlay en `OVERLAYS` (único origen de verdad, 4.22) y le enlaza el cierre por clic fuera. Sustituye al antiguo `bindOverlayClose()` |
| `anyOverlayOpen()` / `closeOpenOverlays()` | Derivadas de `OVERLAYS`: si hay algún overlay abierto (bloquea `/`, `n` y `Ctrl+K`) / cierra los que lo estén (manejador global de `Escape`) |
| `promptSiteTitle()` | Pide el título de la página y lo guarda (antes en línea en el listener de `#btnEditTitle`) |
| `toggleAllGroups()` | Pliega o expande todas las categorías de golpe (antes en línea en `#btnToggleAllGroups`) |
| `clearTagSelection()` | Vacía las etiquetas incluidas y excluidas (antes en línea en `#btnClearTagSelection`) |
| `promptSaveViewProfile()` | Guarda la selección de etiquetas actual como vista, con su confirmación al sobrescribir (antes en línea en `#btnSaveViewProfile`) |
| `setStatusFilter(value)` / `setViewMode(value)` | Aplican el filtro Todos/Activos y el modo Cómoda/Compacta (antes en línea en los listeners de los dos toggles) |
| `exportLinks()` | Exporta a JSON **incluida la confirmación de filtro activo** (4.7): vive dentro de la función, no del listener, para que la paleta no pueda exportar una selección parcial sin avisar |
| `COMMANDS` | Registro de las acciones globales de la app (4.22): `{id, label, hint?, available?, run}`. Único origen de verdad de la paleta; cada `run` llama a la misma función con nombre que el botón |
| `normalizeForSearch(str)` / `textMatches(text, q)` | Comparación insensible a mayúsculas y acentos (`normalize("NFD")` + quitar combinantes), compartida por la paleta de comandos y la búsqueda con operadores (4.3) |
| `buildPaletteGroups(query)` / `paintPalette()` / `refreshPalette()` | Calculan los cinco grupos de resultados con sus topes / los pintan con `escapeHtml()` / recalculan y repintan tras cada tecleo |
| `openCommandPalette()` / `closeCommandPalette()` / `runPaletteItem(item)` / `movePaletteHighlight(delta)` | Apertura y cierre (vaciando siempre el campo), ejecución de una entrada (cierra antes de ejecutar) y navegación con ↑/↓ |
| `HELP_SECTIONS` | Panel de ayuda (4.25): array `[{title, items}]` con todo el contenido de la chuleta ("Atajos"/"Gestos"/"Filtros"/"Datos"), junto al código. Único origen de verdad — cada atajo/gesto/filtro nuevo añade su línea aquí (regla en `CLAUDE.md`) |
| `renderHelpPanel()` / `openHelpPanel()` / `closeHelpPanel()` | Pintan `HELP_SECTIONS` en `#helpModalBody` (sin `escapeHtml()`: es texto de autor estático) / abren y cierran `#helpModalOverlay` |
| `STATE_SLOTS` | Inventario de las once claves de estado (4.26): `{key, prop, get, raw?}`. **Único sitio donde se enumeran**; lo comparten el snapshot, la ocupación y la restauración. `raw` marca las dos que viajan como texto plano y no como JSON |
| `getStateSnapshot()` | Estado completo con envoltura (`format`/`schemaVersion`/`appVersion`/`savedAt`/`data`) |
| `readStateSnapshot(raw)` | Lee una envoltura: `{ok:true, data, savedAt, appVersion}` o `{ok:false, reason:"invalid"\|"newer"}`. Un esquema superior nunca se carga |
| `applyStateSnapshot(data)` / `reloadStateFromStorage()` | Vuelcan un `data` al almacén (una clave ausente deja la actual intacta, nunca la vacía) / cargan las once claves en `state` y renormalizan. La segunda la comparten el arranque y la restauración, para que restaurar recorra el mismo camino que abrir la app |
| `getStorageUsage()` / `refreshStorageUsage()` / `probeQuotaEstimate()` | Ocupación `{bytes, backupBytes, totalBytes, quotaEstimate, ratio}` / la recalculan y cachean / consultan `navigator.storage.estimate()`, aceptándola **solo si es menor** que los 5 MB por defecto (ver decisión 47) |
| `formatBytes(n)` / `usagePercent()` / `formatStamp(iso)` | Formateo para los avisos: tamaño legible / porcentaje ("menos del 1" en vez de "0") / fecha y hora |
| `markExportDone()` / `daysSince(iso)` / `daysWithoutBackup()` / `hasEverExported()` / `startBackupClockIfNeeded()` | Registran una exportación / días transcurridos / días sin copia / si alguna vez se exportó (los días significan cosas distintas según el reloj del que salgan) / arrancan el reloj al llegar a 20 enlaces sin ninguna exportación |
| `rotateBackups()` / `writeNewestBackup(text)` / `listBackups()` | Instantánea por sesión con sus tres guardas / escritura que sacrifica las copias antiguas antes de rendirse, siempre en silencio / listado con fecha, recuento, tamaño y estado de cada copia |
| `reportStorageFull()` / `closeStorageFull()` | Abren y cierran `#storageFullOverlay`, con la guarda que evita un aviso por clave escrita |
| `openRestoreBackup()` / `renderRestoreBackupList()` / `performRestoreBackup(key)` | Modal de restauración: apertura, listado (sin botón para las copias ilegibles o de versión superior) y aplicación con confirmación de los dos recuentos |
| `syncFooterNotices()` / `backupCheckHtml()` | Pintan los avisos permanentes de `#footerNotices` (llamada desde `render()`) y la fila "Copias de seguridad y espacio" del panel de limpieza |
| `exportCategories()` | Exportación de categorías (4.19), extraída del listener a una función con nombre para que también registre la fecha de la última copia |
| `StorageAdapter` | Punto por el que pasa la persistencia (4.27): `init` / `loadAll` / `saveAll` / `getMode` / **`isFileReady`** / `getStatusLabel` / `disconnect`. Los once `loadX`/`saveX` se conservan como fachada y no se renombran. `getMode()` devuelve el modo **elegido** y `isFileReady()` si el archivo está disponible ahora: separar las dos es 4.29 entera |
| `loadStorageMode()` / `saveStorageMode(modo)` / `initStorageMode()` | Modo de trabajo persistido (4.29) y su migración: con archivo recordado se arranca en `"file"`, y en un navegador sin la API se corrige a local en memoria sin tocar la preferencia guardada |
| `lockApp()` / `unlockApp()` | Ponen y quitan la pantalla de apertura. Bloquear **vacía el estado en memoria** (no `localStorage`); desbloquear es donde se toman las salvaguardas de 4.26 que el arranque se saltó |
| `unlockFromFile(actual)` | Desbloqueo cuando el archivo se abre: manda el archivo si trae algo, y si está vacío recibe la copia del navegador. No pregunta nada porque no hay dos versiones que comparar |
| `switchToLocalMode()` / `switchToFileMode()` | Los dos cambios de modo (4.29). El segundo no vacía el estado antes de abrir: es la versión "de esta sesión" que necesita el modal de conflicto |
| `gateVariant()` / `renderOpenGate()` | Cuál de las cuatro situaciones es (`closed`, `pick`, `missing`, `unsupported`) y su pintado. La distinción `closed`/`pick` es por el handle, no por el nombre |
| `syncLockedUi()` / `bloqueadoPorApertura(silencioso)` / `bridgeGuard()` | Las tres capas del bloqueo: `disabled` en los controles, guarda con aviso para lo que no pasa por un botón, y guarda del puente que **lanza** para que la extensión enseñe su badge rojo (sección 8) |
| `syncStorageBadge()` / `syncModeNotice()` | Indicador de la barra superior (4.29) y aviso fechado de modo local con archivo recordado. El primero lo refresca también `syncStorageStatus()`, porque los guardados terminan fuera de cualquier repintado |
| `loadTheme()` / `applyTheme()` / `initTheme()` / `setTheme(tema)` | Tema (4.30). `"system"` no pone atributo y deja mandar a `prefers-color-scheme`; los otros dos ponen `data-theme` en `<html>` |
| `renderSettings()` / `openSettings()` / `closeSettings()` / `radioHtml(...)` | Panel de ajustes (4.30). El cuerpo se pinta entero en cada apertura porque los cuatro ajustes dependen del estado y del idioma |
| `supportsFileMode()` / `isStateKey(key)` | Si el navegador tiene la File System Access API (en Firefox no existe) / si una clave es una de las once de estado, para decidir si un guardado programa además el volcado al archivo |
| `idbOpen()` / `idbSet(k,v)` / `idbGet(k)` / `idbDelete(k)` | Almacén del `FileSystemFileHandle` en IndexedDB (4.27), que es el único sitio donde cabe: no es serializable a JSON |
| `loadFileMeta()` / `saveFileMeta()` / `clearFileMeta()` | Metadatos del archivo conectado en `localStorage` (nombre, `lastModified`, fecha): permiten nombrar el archivo antes de tener permiso y detectar que cambió por fuera |
| `readFileState()` / `writeFileState(opciones)` | Leen y escriben la envoltura completa en el archivo. La escritura comprueba antes el conflicto (R25) y la reducción brusca (R26); con `{forzar:true}` se salta ambas, y solo lo usan los caminos donde el usuario ya ha confirmado |
| `perdidaGrande(nuevos, enArchivo)` | Si una escritura encoge la colección lo bastante como para parar y preguntar: vaciarla, o dejarla por debajo de la mitad |
| `scheduleFileSave()` / `flushFileSave()` | Volcado con debounce de 500 ms / volcado inmediato, usado por el temporizador, `visibilitychange` y `beforeunload` |
| `connectToFile()` / `reconnectFile()` / `disconnectFile()` | Las tres acciones del pie y de la paleta. Ninguna borra datos: desconectar deja intactos el archivo y `localStorage` |
| `openConflictModal(archivo)` / `closeConflictModal()` | Modal de conflicto con las dos versiones y sus tres salidas. Cerrarlo sin elegir cuenta como "ahora no" y deja el estado marcado como no guardado |
| `syncStorageStatus()` / `horaCorta(iso)` | Pinta **las acciones** del pie (4.27, revisado en 4.29: el estado subió a la barra superior) y refresca de paso `syncStorageBadge()` / hora `HH:MM` del último guardado |

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
15. **Atajos de teclado solo si no se está escribiendo ni hay un modal abierto**: `/` y `n` comprueban `e.target.tagName`/`isContentEditable` y `anyOverlayOpen()` antes de actuar, para no interceptar esas teclas mientras el usuario escribe en cualquier campo (incluida una descripción que contenga la letra "n" o el carácter "/"). *(La comprobación enumeraba a mano tres overlays hasta que se centralizó en `OVERLAYS` — 4.22; la lista a mano ya se había quedado desactualizada y provocaba dos fallos reales.)*
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

Las cuatro siguientes son las decisiones de la **paleta de comandos** (4.22):

25. **`COMMANDS` es el único origen de verdad de las acciones, y la dependencia va `listener → función con nombre ← entrada del registro`**: se rechazó explícitamente la alternativa obvia —que la paleta duplicara las llamadas que hoy hacen los listeners—, que habría funcionado a la primera y habría quedado desincronizada en cuanto alguien cambiara el comportamiento de un botón: la paleta seguiría haciendo lo de antes, en silencio y sin que ningún test lo detecte (no hay tests). Con ambos lados llamando a la misma función, la desincronización es imposible por construcción. El precio es el requisito previo de extraer a funciones con nombre la lógica que vivía dentro de siete listeners (`promptSiteTitle`, `toggleAllGroups`, `clearTagSelection`, `promptSaveViewProfile`, `setStatusFilter`, `setViewMode`, `exportLinks`); se hizo como movimiento puro de código, sin aprovechar para mejorar nada, porque ahí cualquier cambio de comportamiento es una regresión en un botón que ya funcionaba.
26. **El `confirm()` de exportar con filtro activo se movió al interior de `exportLinks()`**: si se hubiera quedado en el listener del botón, la paleta se habría convertido en una vía para exportar una selección parcial **sin avisar** — justo lo que esa confirmación existe para evitar (4.7, decisión 22). Regla general que deja el caso: al extraer una función para el registro, se lleva consigo sus confirmaciones, no solo su "parte útil".
27. **Los enlaces de la paleta se buscan sobre `state.links` completo, no sobre `getFilteredLinks()`**: leyendo el código lo natural es reutilizar el filtrado que ya existe, y es un error de diseño — el propósito de la paleta es alcanzar algo que los filtros activos están ocultando ahora mismo. Es también la razón de que los resultados de enlace solo abran la URL: ejecutar acciones (editar, borrar) sobre un enlace que no se está viendo es otra decisión, y no se toma aquí.
28. **`Ctrl+K` llama siempre a `preventDefault()`, incluso cuando decide no abrirse**: en Chrome y Edge ese atajo enfoca la barra de direcciones. Prevenirlo solo al abrir dejaría un caso raro —con un modal abierto, `Ctrl+K` sacaría el foco del navegador de la página— cuando lo esperado es que no haga absolutamente nada. A diferencia de `/` y `n` (decisión 15), sí actúa con el foco dentro de un campo de texto, porque es lo esperable de una paleta de comandos.

Las cuatro siguientes son las decisiones de las **vistas por selección de enlaces** (4.17 + 4.21):

29. **Sin campo `type` que discrimine el tipo de vista**: el perfil pasa a ser `{ name, tags, excludedTags, selectedCategories, linkIds }` y punto. Una "vista de selección" es un perfil con las tres primeras dimensiones vacías y `linkIds` con contenido; una "vista de filtro" es lo contrario. No hace falta distinguirlas porque `applyViewProfile`/`clearActiveViewProfile` tratan las cuatro dimensiones exactamente igual, siempre. Un campo `type` sería un segundo lugar donde la misma información puede desincronizarse — y el historial de fallos de esta zona (dos vistas marcadas como activas a la vez, categorías que no se recordaban) es precisamente el de un estado derivado que dejó de coincidir con el real.
30. **`getFilteredLinks()` gana una condición `AND` más, no una rama nueva**: `if(state.viewLinkIds.size > 0 && !state.viewLinkIds.has(l.id)) return false;`, mismo patrón que las tres condiciones que ya había. Se compone sola con la búsqueda y con el toggle Todos/Activos, y también con categorías/etiquetas si alguna vez coincidieran a la vez — cosa que en la práctica no ocurre, porque `applyViewProfile` fija las cuatro dimensiones del mismo perfil de golpe, pero cuyo resultado (la intersección) sigue estando bien definido. No hacía falta impedir la combinación en el modelo.
31. **"Crear vista" (lote) no aplica la vista ni vacía la selección, al contrario que "Guardar actual"**: la asimetría es deliberada. Guardar desde el filtro actual no cambia nada visible (ya estabas viendo exactamente eso), así que dejar la vista aplicada es gratis; aplicar automáticamente una vista de selección justo después de una acción en lote **sí cambiaría de golpe lo que el usuario está viendo**, en mitad de una posible cadena de acciones sobre ese mismo conjunto (decisión 23). `bulkCreateView()` guarda el perfil y ya está: aplicarlo es un clic en su chip, como con cualquier otra vista.
32. **Soltar la vista vive en `detachActiveView()`, y esa es la única forma de hacerlo**: `state.viewLinkIds` es la única dimensión **sin ningún control en la UI que la rellene o la vacíe por su cuenta** (a diferencia de la lista de categorías y de la nube de etiquetas). Si un punto que suelta la vista activa olvidara vaciarla, quedaría un filtro invisible recortando lo que se ve sin que nadie lo haya puesto ahí. Juntar las dos líneas en una función y llamarla desde los seis puntos que sueltan la vista a mano (categoría, etiqueta, escoba, categoría desde la paleta, importación, y eliminar el perfil aplicado) evita que eso dependa de recordar la lista completa — que es exactamente el tipo de recuerdo que ya falló dos veces en esta zona. Un enlace borrado, en cambio, **no** necesita limpieza: su id deja de coincidir con nada y la vista sigue funcionando con los que queden, igual que ya pasaba con categorías y etiquetas borradas.

Las seis siguientes son las decisiones de las **notas por enlace** (4.23):

33. **Añadir una nota no pide confirmación previa; crear el enlace sí.** Si la URL ya existe, `appendNote` añade la nota directamente —guarda, repinta y resalta la ficha—, sin modal y **sin activar la pestaña de Lingatu**: es una operación aditiva sobre un enlace que el usuario ya curó, no destruye nada, y el usuario está leyendo una página y quiere seguir. Si la URL no existe, se abre el modal precargado con la nota puesta y se salta a esa pestaña, porque hace falta que el usuario actúe. La asimetría sigue el criterio que ya estableció `prefillAndOpen`: *crear* pasa por confirmación —la categoría es una heurística y puede fallar—, *añadir* a algo existente no necesita ceremonia. **"Sin confirmación previa" no es "sin señal": ver la decisión 36.**
34. **La cita la formatea la extensión; el bloque de fecha, el puente.** `appendNote` recibe el texto **ya como el usuario lo quiere ver** (una selección llega con su `> ` en cada línea, puesto por `quoteSelection` en `background.js`) y solo le añade el encabezado de fecha y lo acumula. Así el puente no necesita un campo "tipo de nota" que tendría que crecer con cada origen nuevo, y quien sabe de dónde viene el texto es quien decide cómo se ve.
35. **El modal de enlace pasó a dos columnas en vez de añadir el campo al final.** Las notas son el único campo que puede crecer mucho: apilado bajo Etiquetas dejaba un `<textarea>` estrecho y metía scroll en el modal, justo en el campo donde más se escribe. Duplicando el ancho (880px) y dándole la columna derecha entera, el campo tiene sitio de sobra y el modal vuelve a caber sin scroll. Por debajo de 940px de ventana las columnas se apilan, que es el comportamiento de antes.
36. **El badge del icono no vale como única confirmación de una acción silenciosa: el aviso va en la página que el usuario está leyendo.** Detectado en uso real, y es un fallo de usabilidad con consecuencia en los datos, no un detalle estético. La primera versión confirmaba el añadido de una nota solo con el badge ✓ del icono de la extensión, pero **Chrome esconde los iconos no fijados dentro del menú de extensiones**: el usuario no ve absolutamente nada, deduce que no ha funcionado y repite la captura — y como cada repetición añade un bloque nuevo (4.23), acaba con la misma nota tres veces creyendo que no tiene ninguna. `showPageToast()` inyecta un aviso efímero en la pestaña activa que dice **qué enlace** recibió la nota y **cuántas lleva** (`noteCount`): ver subir ese número es justo lo que corta la repetición por inercia. Detalles que lo hacen admisible: **no pide ningún permiso nuevo** (`activeTab` ya se concede al invocar el menú contextual), va en un **shadow DOM cerrado** para no mezclarse con el CSS del sitio ni alterarlo, el texto entra por **`textContent`** —el título del enlace es dato del usuario y la página anfitriona es terreno ajeno—, y si la inyección falla (páginas `chrome://`, la Web Store, un PDF) la nota ya está guardada igualmente y el badge queda como confirmación de reserva. Precedente para la fase 1 de los post-its (11.4), que inyecta un panel por la misma vía.

37. **El 📝 abre un visor de solo lectura, no el formulario.** En la primera versión abría el modal de edición con el foco en el campo de notas, es decir, **exactamente lo mismo que el lápiz** salvo dónde caía el cursor. Ese atajo tenía sentido cuando las notas iban apiladas al final de un formulario con scroll; al pasar el modal a dos columnas (decisión 35) el campo ya se ve entero nada más abrir, y el 📝 se quedó sin función propia: dos iconos contiguos en la misma ficha haciendo lo mismo. Ahora **leer y editar son acciones distintas** — el 📝 muestra las notas en un visor sin formulario alrededor, el lápiz sigue llevando a la edición completa, y el visor ofrece "Editar notas" para pasar de una a otra. Además prepara la fusión con la fase 1 de los post-its (11.4), que es este mismo contenido en una segunda superficie: mismo criterio de presentación (texto plano, saltos de línea por CSS, texto insertado con `textContent`), así que el día que se renderice el Markdown (11.1) hay que hacerlo en los dos sitios a la vez.

38. **El renderizador de notas construye nodos, no cadenas de HTML — y por eso puede existir.** El plan del backlog era un mini-renderizador de regex aplicado **después** de `escapeHtml`, sobre `innerHTML`. Se descartó ese camino: cambia la seguridad de *estructural* (con `textContent` no hay inyección posible) a *por disciplina* (depende de que nadie invierta el orden), y lo hace en el texto menos confiable de la app — el que viene copiado de páginas web arbitrarias. `renderNotesInto` recorre el texto **línea a línea** creando elementos con `createElement` y metiendo cada trozo con `textContent`: no hay ninguna cadena de HTML en juego, así que no hay nada que escapar ni orden que respetar. Consecuencias del enfoque, todas deliberadas:
    - **Sin enlaces ni imágenes.** Son lo único que obligaría a volver a `innerHTML` (o a construir un `href`, con su lista blanca de esquemas para que `javascript:` no pase). Si algún día se quieren, es una decisión aparte y con revisión de seguridad propia, no una línea más de regex.
    - **Los marcadores no cruzan saltos de línea.** Un `*` sin cerrar solo puede descolocar su propia línea, nunca el resto de la nota.
    - **`*` pegado a una palabra no abre énfasis**, así que `2*3*4` se lee tal cual. Es una desviación deliberada de CommonMark, que ahí pone el `3` en cursiva: en una nota personal eso es un despiste, no una intención.
    - **El código con backticks se procesa primero y su contenido no se vuelve a tocar**, que es la vía estándar para escribir `a*b` sin pelearse con el énfasis. Lo mismo con la valla de tres backticks, que además es la construcción **menos** ambigua de todas —delimitada por líneas propias y literal por dentro— y la que hace falta al pegar un fragmento de varias líneas copiado de una página. Una valla sin cerrar llega hasta el final de la nota, como en Markdown.
    - **Un salto de línea simple es un salto real**, no una continuación del párrafo. En notas personales lo escrito es lo que se quiere ver, y además conserva lo que ya hacía el visor con `white-space: pre-wrap`. Eso hace innecesaria la regla de "dos espacios al final de línea", que es invisible y que cualquier editor recorta sin avisar.
    - **Solo el guion abre viñeta**: aceptar también el asterisco chocaría con la cursiva.

Las dos siguientes son las decisiones de la **búsqueda con operadores** (4.3):

39. **La misma regla de composición que ya tenían los filtros del lateral (OR dentro del mismo operador, AND entre operadores distintos), con una única excepción explícita: varias palabras sueltas se combinan en AND, no en OR.** No inventar una semántica nueva —el filtro de etiquetas ya es OR (decisión 3) y la multi-selección de categorías también (4.18)— hace que `cat:a cat:b` signifique lo mismo que Ctrl+clic en dos categorías del lateral, sin que el usuario tenga que aprender dos modelos mentales para la misma app. La excepción de las palabras sueltas se aceptó a propósito (R3 de la tarea): con subcadena literal, `web docs` solo encontraba la secuencia exacta, y es una expectativa tan extendida de cualquier buscador que mantener el comportamiento antiguo como único habría sido sorprendente; quien lo necesite lo tiene con comillas. Es, por tanto, un cambio de comportamiento observable (no solo una funcionalidad nueva) y se documenta como tal en el `CHANGELOG.md`.
40. **Los términos incompletos se ignoran en vez de filtrar.** La alternativa obvia —parsear la consulta tal cual se teclea— deja la lista en cero cada vez que el usuario pasa por `cat:`, `#`, `-` o una comilla sin cerrar, que son estados por los que se pasa en **cada** tecla pulsada al escribir un operador. Se decidió que un término cuyo contenido quede vacío tras quitarle el prefijo se descarte sin filtrar nada, y que una comilla sin cerrar se trate como texto normal (no como el inicio fallido de una frase). Es el requisito que más se nota en el uso real: sin él, la búsqueda con operadores parpadearía a cero en mitad de cada palabra.

Las tres siguientes son las decisiones del **panel de limpieza** (4.24):

41. **El panel diagnostica; no repara nada, ni siquiera lo trivial.** Se consideró y se descartó un botón "arreglar todo" para casos que parecían seguros (etiquetas sin uso, parámetros de seguimiento): en cuanto se admite una excepción a "el panel no modifica nada", deja de haber una regla y aparece un segundo lugar donde se editan datos, con sus propias reglas y sus propios fallos por descubrir. La reparación real la hacen las herramientas que ya existían (modal de gestión, edición de un enlace, acciones en lote de 4.21); "Ver estos N" es el único puente entre diagnosticar y reparar, y deja al usuario al mando de qué cambiar y cómo.
42. **El foco de revisión (`state.focusIds`) se suelta en `detachActiveView()`, no en un manejador nuevo.** Esa función ya se llama en cada punto que cambia la categoría o las etiquetas a mano (clic en el lateral, escoba, paleta de categorías, y al soltar una vista), exactamente el disparador que pedía el foco de revisión — reutilizar ese enganche evita un segundo lugar donde "cambiar de filtro" tenga que recordarse a mano (mismo criterio que ya justificó centralizar ahí `viewLinkIds`, decisión 32). Deliberadamente **no** se engancha en la búsqueda ni en el toggle Todos/Activos: revisar 12 enlaces y luego escribir en el buscador para localizar uno concreto dentro de esos 12 es un uso razonable, y limpiar el foco en cada tecla lo rompería.
43. **La cabecera de una comprobación y el botón "Ver estos N" pueden mostrar números distintos, a propósito.** La cabecera cuenta *elementos de la comprobación* (grupos de URLs duplicadas, categorías con 0 o 1 enlace, etiquetas sin uso...); el foco siempre son *enlaces*, así que su número es la unión de los `linkIds` de esos elementos — puede ser mayor (varios enlaces por grupo de duplicados) o menor (una categoría vacía no aporta ningún enlace al foco) que la cabecera. Cuando esa unión queda vacía (una etiqueta sin uso no la tiene ningún enlace, por definición), el botón simplemente no aparece, en vez de ofrecer un "Ver estos 0" sin sentido.

La siguiente es la decisión del **panel de ayuda** (4.25):

44. **El panel no repite lo que ya documenta la paleta de comandos, y las dos superficies se remiten explícitamente la una a la otra.** La alternativa —una chuleta con las cuatro cosas, acciones incluidas— habría duplicado los trece/catorce comandos de `COMMANDS` en un segundo sitio que nadie mantendría sincronizado con el primero (mismo riesgo que la decisión 25 evitó para la propia paleta). En vez de eso, el bloque "Atajos" del panel remite a `Ctrl+K` para todo lo demás, y `COMMANDS` gana una entrada "Ayuda: atajos y gestos" que abre el panel: cada superficie documenta solo lo que la otra no puede (la paleta no puede explicar un gesto de arrastre; el panel no necesita repetir una lista de acciones que ya se busca escribiendo).

La siguiente es la decisión del **cambio de nombre a Lingatu** (ver `CHANGELOG.md`; el producto se llamó *PinBoard* hasta la v1.9.0):

45. **Al renombrar el producto, la compatibilidad se puso por encima de la limpieza, y en los tres sitios donde el nombre estaba incrustado en algo que ya existía en las máquinas de los usuarios no se tocó nada.** El nombre público cambió entero (archivo, título por defecto, interfaz, extensión, documentación, nombres de los archivos exportados), pero se quedaron con el nombre viejo: (1) las once claves `enlaces_*_v1` de `localStorage`, por el motivo de siempre —renombrarlas equivale a borrar los datos de todo el mundo—; (2) la clave `pinboardFileUrl` de `chrome.storage.local`, que guarda la URL configurada en la extensión: la extensión **sí** se actualiza sola, así que renombrarla habría dejado a todos los usuarios con la configuración vacía y la extensión aparentemente rota; y (3) `window.PinBoardBridge`, que sobrevive como alias del puente (sección 8). El caso 3 es el único donde un renombrado ingenuo rompe instalaciones reales **en los dos sentidos**, porque la extensión y el archivo HTML se actualizan por caminos distintos y a ritmos distintos. El criterio general: **el nombre público es texto y se cambia; un identificador que ya está escrito en el disco de otra persona es un contrato y no se cambia.** El título que cada usuario tuviera personalizado tampoco se toca: `loadSiteTitle()` solo cambió su valor por defecto, que es lo único que ve una instalación nueva.

La siguiente es la decisión del **escapado de atributos** (corrección de seguridad, ver `CHANGELOG.md`):

46. **Un identificador interno también es dato de usuario en cuanto entra por un archivo, y la sanidad de un atributo se resuelve en los dos extremos: al pintar y al entrar.** El fallo era que `cardHtml`, `cardHtmlCompact` y `moveButtonsHtml` concatenaban `data-id`/`data-target` sin `escapeHtml()`. No se percibía como dato de usuario —lo genera `genId()`— pero `performImportReplace` conserva el `id` que traiga el archivo importado, así que un JSON ajeno con una comilla en el `id` rompía el atributo, y con él el elemento raíz de la ficha y el contrato de la sección 8. Se corrigió por los dos lados a propósito: **escapar al pintar** es la corrección real (si mañana aparece otra vía de entrada, sigue cubierta), y **validar al importar** cierra la vía conocida (si mañana alguien añade un sitio donde se pinta el `id`, no hereda el problema). Cualquiera de las dos por separado deja el sistema dependiendo de que nadie toque la otra.

    Dos consecuencias que salieron del barrido y conviene no perder:

    - **En un atributo `style`, escapar no basta.** Con las comillas escapadas todavía se puede colar CSS dentro del propio atributo, y el color de una categoría entra por archivo (importación de categorías, 4.19): un `background-image:url(...)` habría hecho una petición a un tercero desde un archivo ajeno, que es una fuga de privacidad aunque no ejecute código. Por eso los colores no se escapan sino que se **validan** (`safeColor`), en los cinco sitios que los pintan y también al importarlos. Los dos orígenes legítimos —el `<input type="color">` y la paleta fija de 12 tonos— producen siempre ese formato, así que no se descarta nada real.
    - **Un `id` que entra en un selector CSS es otro contexto distinto**, con sus propias reglas de escapado. `highlightLink()` pasa por `CSS.escape` y envuelve el `querySelector` en `try`, para degradar sin excepción igual que ya hacía cuando la ficha está filtrada (sección 8). Es defensa en profundidad: con los `id` ya saneados al importar, no debería llegar nunca uno inválido — salvo desde una colección importada **antes** de esta corrección, que es justamente el caso que no se puede migrar.

    Los `id` ya guardados en `localStorage` no se tocan: migrarlos habría sido cambiar datos de usuario para arreglar un problema que el escapado al pintar ya resuelve.

Las siguientes son las decisiones de las **salvaguardas de datos** (4.26):

47. **`navigator.storage.estimate()` solo se acepta hacia abajo, nunca hacia arriba.** Parecía la fuente natural de la cuota, y es una trampa: esa API informa del espacio del **origen** (IndexedDB, Cache API...), que en Chrome son decenas de gigas, mientras que el almacén que de verdad se llena tiene un techo propio de unos 5 MB que esa cifra no refleja. Tomarla tal cual habría dejado el `ratio` pegado a cero y el aviso no habría saltado **jamás** — un aviso que no avisa es peor que ninguno, porque da falsa tranquilidad. Así que el valor por defecto son 5 MB y `estimate()` solo manda cuando devuelve **menos** (disco casi lleno, perfil restringido), que es el único caso en que describe un límite más apretado y real. Medido empíricamente en Chrome 151: el tope está en ~5.236.000 caracteres, es decir 5 MiB clavados, así que la constante no es una estimación prudente sino el número exacto.

48. **El `ratio` cuenta también las copias automáticas, aunque `bytes` no.** Es la única forma de que el aviso llegue a tiempo: con tres instantáneas del estado completo, una colección de 1 MB ocupa 4 MB de los 5 disponibles, y un porcentaje calculado solo sobre "los datos de verdad" habría dicho 20% con el almacén al 80%. Lo que decide si el próximo guardado cabe es el total ocupado, no la parte que consideramos útil. El desglose ("X de datos y Y de copias automáticas") se enseña en el panel de limpieza, que es donde tiene sitio para explicarse; el aviso del pie solo necesita un número.

49. **Restaurar una copia vive en el panel de limpieza sin romper su regla de "diagnostica, no repara" (decisión 41).** La fila informa —días sin copia, ocupación, cuántas instantáneas hay— y sus botones **llevan** a herramientas con su propia ventana y su propia confirmación: exportar, que ya existía, y el modal de restauración. Es el mismo patrón que "Ver estos N": el panel es el puente, nunca la herramienta. Y restaurar no es reparar un defecto diagnosticado, que es lo que la decisión 41 mantiene fuera; es recuperar una copia, una categoría distinta de acción. La fila, además, es la única que **se pinta siempre**: las ocho comprobaciones se ocultan a cero porque diagnostican defectos que pueden no existir, mientras que "cuántos días llevas sin copia" siempre tiene respuesta.

50. **Un fallo de lectura ya no puede vaciar los datos buenos, y esa era la salvaguarda más importante de todas.** El arranque leía cada clave con `try/catch`, se quedaba con una lista vacía si el JSON estaba roto, y a continuación **guardaba esa lista vacía encima**: un solo carácter corrupto —o un JSON válido con la forma equivocada— destruía la colección entera de forma irreversible, en silencio, antes de que al usuario le diera tiempo a ver la pantalla. Ahora `readJson()` anota la clave en `corruptKeys` y, mientras haya alguna, el arranque **no escribe nada por su cuenta**: ni los tres guardados de normalización, ni la instantánea rotativa (que además desplazaría hacia atrás las copias buenas y, en tres arranques, no dejaría ninguna). Lo que sí se permite es que el usuario siga trabajando: si edita algo, se guarda y se escribe encima, porque bloquear la app entera sería peor. La línea está en que **la aplicación no destruye nada por iniciativa propia**; con una acción explícita del usuario detrás, sí. El aviso del pie lo dice con esas palabras y ofrece las dos salidas antes de que eso pase.

51. **Las copias automáticas se anuncian como lo que son, no como una copia de seguridad.** Viven en el mismo almacén que protegen, así que desaparecen exactamente con el mismo suceso del que hay que protegerse: borrar los datos del navegador. Sirven para lo otro —una importación equivocada, un "Sustituir todo" a destiempo, un borrado accidental—, que es frecuente y hasta ahora no tenía ninguna red. Tanto el panel de ayuda como el modal de restauración lo dicen explícitamente, porque una salvaguarda que el usuario cree más fuerte de lo que es acaba sustituyendo a la que sí funciona: exportar a un archivo.

Las siguientes son las decisiones del **archivo como fuente de verdad** (4.27):

52. **`localStorage` no se abandona al conectar un archivo: se queda como caché y como red de seguridad.** Era tentador migrar y limpiar —"ahora la verdad está en el disco"—, y habría sido un error en las tres situaciones que de verdad ocurren: el permiso caduca en cada sesión, el archivo puede estar en una carpeta sincronizada que ese día no ha bajado, y el usuario puede abrir la app en otro navegador donde ese archivo ni existe. Manteniendo las once claves escritas siempre, **la app arranca y funciona con normalidad sin permiso, sin archivo y sin la API**, y el modo archivo se convierte en algo que se suma en vez de algo de lo que se depende. También es lo que hace que el cambio sea pequeño: no hay dos caminos de lectura en la app, solo uno con una fuente que a veces lo precede.

53. **El adaptador se enganchó al punto único de escritura que ya existía, en vez de reescribir los once pares.** `storageWrite()` nació en 4.26 para capturar el fallo de cuota; añadirle "y si la clave es de estado, programa el volcado" es una línea, y deja `save()`, `saveCategories()` y los demás exactamente como estaban — que es lo que exigía no tocar ninguna superficie observable (el puente de la sección 8 llama a varios de ellos). La alternativa, convertir los once en llamadas asíncronas al adaptador, habría cambiado el orden de ejecución de media aplicación a cambio de nada visible.

54. **La regla "nunca escribir menos de lo que hay" se aplicó por umbral, no al pie de la letra.** Literalmente exigiría confirmar cada borrado de un enlace, porque cada uno deja el archivo con menos elementos que antes: una app que pregunta dos veces por cada borrado es una app que nadie usa, y el usuario acabaría respondiendo que sí sin leer — que es exactamente el fallo que la regla quería evitar. El umbral elegido (vaciarla del todo, o dejarla por debajo de la mitad) cubre la pérdida que **no se hace sin querer** y deja en paz el trabajo normal. Y cancelar no vuelve a preguntar en bucle: marca el estado como *retenido* y lo enseña en el pie, porque la alternativa —quedarse callado— haría creer que está guardado.

55. **Cerrar el diálogo de conflicto sin elegir es una respuesta válida, y tiene consecuencia visible.** Escape y el clic fuera cierran todos los overlays de la app (4.22) y este no iba a ser la excepción, pero aquí "cerrar" deja el archivo y la pantalla diciendo cosas distintas. En vez de reintentar la escritura —que reabriría el modal en bucle— o de darlo por guardado, el estado queda marcado y el pie lo dice con un botón para resolverlo cuando el usuario quiera. **El principio general del indicador: lo que no está en el archivo no se muestra nunca como guardado.**

56. **La tercera salida del conflicto ("guardar la mía aparte") es la que hace que la regla se cumpla de verdad.** Con solo dos opciones, elegir siempre significa perder una de las dos versiones, y un usuario con prisa acaba destruyendo la buena. Con la tercera, el conflicto se resuelve **sin que nadie pierda nada**: pasan a ser dos archivos y ya se mirarán con calma. Es la única salida que no exige decidir bien en ese momento.

57. **Crear el archivo y abrir uno que ya existe son dos acciones separadas, y separarlas evita el peor diálogo posible.** La primera versión tenía un solo botón, «Conectar a un archivo», que usaba `showSaveFilePicker` para las dos cosas. Funciona —el selector permite elegir un archivo existente— pero al hacerlo el sistema pregunta ***"ya existe un archivo con ese nombre, ¿desea reemplazarlo?"*** justo delante del archivo que contiene la única copia de la colección. Es la peor pregunta posible en el peor momento: quien responda "no" (lo prudente) no puede conectar, y quien responda "sí" lo hace convencido de que está destruyendo sus datos. Con `showOpenFilePicker` para el caso "ya tengo uno", esa pregunta no aparece: se abre, se lee y se pregunta en los términos de la app, con los recuentos delante. El coste es un permiso más que pedir —"abrir" solo concede lectura— y se cubre con el mismo clic.

    Salió de una pregunta que da la medida del hueco: *"el usuario puede conectar a un archivo, pero ¿cuándo, quién y cómo se crea ese archivo?"*. No estaba explicado en ningún sitio, y al ir a explicarlo apareció que además faltaba una acción. **La ayuda no solo documenta la funcionalidad: comprobar que se puede explicar es lo que revela si está terminada.**

58. **Lo que decide si hay que volcar al reconectar es el contenido, no una bandera en memoria.** La primera versión salía de `scheduleFileSave()` en cuanto el modo no era «file», así que **un cambio hecho sin permiso no marcaba nada**; al reconectar, `flushDirtyOnReconnect()` veía `dirty === false` y no escribía. El enlace se quedaba en `localStorage`, el archivo no lo recibía nunca, otro equipo no lo veía — y el pie decía «guardado a las HH:MM» delante de un archivo que no lo tenía. Solo se manifestaba cuando **nadie más había tocado el archivo**: con el `lastModified` cambiado saltaba el modal de conflicto y ahí sí se salvaba, lo que hacía el fallo aún más difícil de ver, porque aparecía justo en el caso más común.

    El arreglo tiene dos mitades y las dos hacen falta. Una: un cambio con archivo recordado es un cambio pendiente **aunque no se pueda escribir todavía**, y el indicador lo dice. Otra, la que de verdad cierra el agujero: al reconectar se compara `getStateSnapshot().data` con lo que hay en el archivo, en vez de consultar `dirty`. Esa bandera solo sabe de la sesión en curso; si el usuario edita sin permiso, cierra el navegador y vuelve mañana, nace en `false` y el archivo se quedaría atrás para siempre. **El contenido es la única fuente que sobrevive a un cierre**, y compararlo cuesta un `JSON.stringify` que ya se hacía en `rotateBackups()` por la misma razón.

59. **"Sin categoría" es un valor de datos, no una cadena de interfaz, y tratarlo como lo segundo habría corrompido colecciones.** El literal acaba **escrito en el campo `category` de los enlaces**: `ensureCategory("Sin categoría")` se invoca al borrar una categoría en uso (4.5) y al sustituir categorías al importar (4.19). Si se hubiera traducido como cualquier otro texto, un usuario que cambiara a inglés habría visto sus enlaces repartidos entre "Sin categoría" y "Uncategorized" —dos categorías distintas para la misma idea— y, peor, cada cambio de idioma habría añadido otra. Eso no es un fallo cosmético: es pérdida de estructura. La solución es que el nombre **se decide una sola vez y se persiste** (`enlaces_uncategorized_name_v1`): en una instalación nueva según el idioma detectado, y **en una que ya tenía datos siempre en español**, porque esos enlaces ya pueden estar en "Sin categoría". Una vez fijado no cambia jamás — salvo que el usuario lo renombre desde el modal de gestión, y entonces `performRename` actualiza también la clave, o el siguiente borrado de una categoría en uso resucitaría el nombre viejo.

    La regla general que deja: **antes de traducir una cadena, mirar dónde acaba**. Si acaba dentro de los datos del usuario, no es interfaz.

60. **El sufijo `" _copia"` sí se traduce, y es la otra cara de la misma moneda.** También acaba dentro de un dato —el título de la copia—, pero ahí no identifica nada: es texto que el usuario ve, edita y borra a voluntad, y afecta solo a copias **nuevas**. Las copias ya creadas conservan su título tal cual. La diferencia con el caso anterior no es "dónde se guarda" sino "si algo lo usa después para reconocer un valor".

61. **Los atajos y los operadores de búsqueda no cambian con el idioma, a propósito.** Traducir `n` a `n` no cuesta nada, pero traducir `cat:` a `cat:` en un idioma y a otra cosa en el otro rompería dos cosas a la vez: una consulta escrita dejaría de funcionar al cambiar de idioma, y una compartida entre dos usuarios con idiomas distintos tampoco. `is:` ya aceptaba `activo` y `active` desde 4.3, así que la compatibilidad estaba resuelta de antes. Con los atajos el argumento es otro: teclas distintas por idioma crearían dos modelos mentales y obligarían a mantener dos paneles de ayuda que dicen teclas diferentes — el tipo de duplicación que envejece mal.

62. **La herramienta de paridad no usa `JSON.parse`, y esa es justo la razón de que sirva.** `tools/verificar-i18n.html` recorre el bloque `I18N` carácter a carácter, respetando cadenas y comentarios. Parsearlo como JSON habría sido más corto y habría fallado en lo único que ninguna otra comprobación puede dar: **las claves duplicadas**. Un objeto JavaScript —y `JSON.parse`— se queda con la última en silencio, así que una clave repetida sobrevive a cualquier prueba funcional y solo se manifiesta cuando alguien edita la primera y no ve ningún cambio. También es lo que permite señalar el número de línea de las dos.

63. **El modo de trabajo tenía que dejar de ser un estado derivado, y esa es la corrección de fondo de todo 4.29.** `getMode()` devolvía "file" o "localstorage" según el permiso del navegador, así que el modo cambiaba solo entre una sesión y otra sin que nada lo dijera. Todo lo demás —la pantalla de apertura, el bloqueo, el aviso fechado— sale de ahí: son consecuencias de haber separado *"dónde quiero trabajar"* de *"puedo trabajar ahora"*. La prueba de que estaban fundidas es que las mismas cuatro llamadas a `getMode()` servían para dos cosas distintas: decidir qué enseñar y decidir si se podía escribir. La decisión 58 arregló un síntoma de esa fusión; esto arregla la fusión.

64. **Bloquear la aplicación es peor que enseñar datos, salvo cuando no puedes decir de dónde salen.** La versión anterior (R24 del encargo 13) decidió expresamente **no** bloquear nunca esperando un permiso, y era un buen principio: dejar a alguien sin sus enlaces porque un permiso caducó sería inaceptable. Lo que no se vio entonces es que la alternativa elegida —seguir trabajando con la copia del navegador **sin decirlo**— no es "no bloquear", es "mentir por omisión". La regla nueva no invierte el principio, lo acota: **si no se puede afirmar el origen de lo que se enseña, no se enseña**; y como salida siempre está trabajar con la copia del navegador, con su fecha delante. Nadie se queda sin sus datos, pero nadie los ve creyendo que son otros. Por eso la salida a modo local está en las cuatro variantes de la pantalla, incluida la de Firefox, donde es la única.

65. **La paleta oscura está duplicada en el CSS a propósito, y es la menos mala de tres opciones malas.** Forzar un tema exige que sus valores existan **fuera** de la `@media (prefers-color-scheme)`, y CSS no deja reutilizar un bloque de declaraciones. Las alternativas eran peores: `light-dark()` deja la aplicación **ilegible** —no fea— en cualquier navegador anterior a 2024, en una app que se distribuye como archivo suelto y no controla qué navegador la abre; y un `<script>` en el `<head>` que ponga el atributo antes del primer pintado rompe la regla de "todo el JavaScript en un único IIFE" para ahorrar veinte líneas de CSS. Se eligió duplicar, con un comentario largo en las dos copias, porque el fallo que se arriesga (un color que se toca en una sola) es de mantenimiento y visible, no de usuario y silencioso.

66. **Con la pantalla de apertura puesta, el puente lanza en vez de devolver un resultado vacío.** Es la diferencia entre fallar y mentir: `checkDuplicate()` con la colección sin cargar devolvería "no hay duplicado" —que es falso—, la extensión daría el guardado por bueno y el enlace no existiría en ningún sitio. Lanzando, la función inyectada de la extensión devuelve `undefined`, cae en su rama `!result.ok` y enseña el badge rojo "!" que ya usa cuando no encuentra el puente. **No hubo que tocar la extensión**, y ese es el argumento: el contrato de la sección 8 ya tenía un camino para "esto no se puede hacer ahora", solo había que usarlo.

67. **Los recuentos del lateral cuentan lo que verías al pulsar, no lo que tienes guardado.** Antes eran totales absolutos, y eso ponía cuatro números distintos en pantalla a la vez —"Todas 140", "Trabajo 18", "127 enlaces", "Trabajo 16"— sin que nada explicara que unos cuentan la colección entera y otros respetan el filtro activo. Ninguno mentía; juntos hacían dudar de todos, y con el filtro "Activos" puesto de fábrica le ocurría a cualquiera desde el primer día. El criterio nuevo es el de cualquier búsqueda con facetas: **el número que acompaña a un filtro dice cuántos resultados da ese filtro**. El total absoluto no se pierde —sigue en el modal de gestión, en el panel de revisión y en el `title` del propio número cuando difieren—, pero deja de competir por el mismo sitio. La consecuencia técnica es la que ordena el código: el criterio de filtrado se extrajo a `linkPassesFilters()` con un parámetro para saltarse **una** restricción, porque tener dos copias de esa lógica era la forma segura de que las dos respuestas dejaran de concordar en cuanto alguien añadiera un filtro nuevo.

68. **Un estado vacío que no ofrece salida es un fallo, no un mensaje.** El texto "no se encontraron enlaces con los filtros actuales" no dice qué filtro ni cómo quitarlo: quien no sabe que hay un filtro puesto —el de "Activos" viene puesto— concluye que ha perdido sus enlaces. La enumeración de restricciones existía desde 4.24, pero su condición exigía búsqueda **y** selección simultáneas, así que en los dos casos habituales no aparecía nunca. Es un patrón que conviene recordar: **una rama defensiva con una condición más estrecha de lo que su propósito requiere equivale a no tenerla**, y no se manifiesta en ninguna prueba porque el código sí está escrito.

65. **Atenuar cromo sí; atenuar información, no.** Los cuatro controles de cada ficha compiten con el título, que es lo que el usuario busca: con una colección de verdad son cientos de iconos sobre el texto. Bajarles el peso en reposo es barato y se nota. Pero el indicador 📝 **está dentro del mismo contenedor** —y ahí está a propósito, para que el modo selección lo oculte con el mismo criterio (decisión 21)— y no es un control: es la única señal de que un enlace tiene algo escrito. Se excluye explícitamente de la regla. La misma cautela vale para los controles desactivados: su atenuación ya significa otra cosa.

66. **El `@media (hover: hover)` de esa regla es una condición de accesibilidad, no una optimización.** En pantalla táctil el arrastrar y soltar no funciona (sección 10) y los ▲▼ son **la única** forma de reordenar. Una atenuación basada en `:hover` los habría dejado medio visibles para siempre en tableta y móvil, sin ninguna forma de "pasar el ratón" para recuperarlos. Es el tipo de detalle que no aparece probando en un portátil.

## 8. Contrato con la extensión de Chrome

`extension/background.js` nunca accede al DOM de `lingatu.html` directamente: pasa siempre por una superficie mínima y estable, `window.LingatuBridge`, expuesta al final de la IIFE. Cualquier cambio a los elementos listados abajo debe ir acompañado de una revisión de `extension/background.js` (función `callBridge`) — si no, la extensión deja de funcionar, normalmente **en silencio**: solo se ve un badge rojo "!" sobre el icono de la extensión (`flashBadge`, en `background.js`), sin ningún error visible dentro de `lingatu.html`.

**El contrato no depende del idioma.** Los cinco métodos, las clases `.link-card`/`.link-card-compact` con su `data-id` y los ids `fieldCategory`/`fieldTitle`/`fieldUrl`/`fieldDescription`/`fieldNotes` son los mismos en español y en inglés — son identificadores, no texto. En particular **`suggestCategory()` sigue comparando contra las categorías reales del usuario**, nunca contra cadenas traducidas: propone una categoría que ya existe en esa colección, y esas las escribió el usuario en su idioma. Y `appendNote()` genera el mismo encabezado `## DD/MM/AAAA` en los dos idiomas (4.28), así que el recuento de notas que la extensión enseña al confirmar no cambia.

**Alias `window.PinBoardBridge` (compatibilidad con el nombre anterior).** El puente se expone con **dos** nombres: `window.LingatuBridge` y `window.PinBoardBridge`, que es el mismo objeto, no una copia. Y `callBridge` busca en ese orden: primero `LingatuBridge`, y si no está, `PinBoardBridge` — nunca al revés. El motivo es una asimetría de actualización que no se puede resolver de otro modo: **la extensión se actualiza sola desde la Chrome Web Store, pero el archivo HTML lo tiene el usuario descargado en su disco y no se actualiza nunca solo**, así que durante meses convivirán extensiones nuevas con `pinboard.html` antiguos y extensiones antiguas con `lingatu.html` nuevos. Con los dos nombres y el respaldo, las cuatro combinaciones funcionan; sin ellos, dos de las cuatro se rompen en silencio (decisión 45). **Retirada del alias y del respaldo: no antes de la v1.12.0** — dos versiones menores contadas desde la primera publicada ya como Lingatu (la 1.10.0). Y aun entonces, solo si se acepta que quien no haya descargado el archivo nuevo se quede sin extensión.

**Superficie exacta que debe mantenerse estable:**

| Elemento | Dónde vive en `lingatu.html` | Para qué lo usa la extensión |
|---|---|---|
| `LingatuBridge.checkDuplicate(url)` → `{id,title,category}` o `null` | Método de `window.LingatuBridge` | Detecta si la URL de la pestaña activa ya está guardada |
| `LingatuBridge.focusExisting(url)` | Método de `window.LingatuBridge`, delega en `highlightLink()` | Desplaza la vista y resalta la ficha si ya existe |
| `LingatuBridge.suggestCategory(title, description, url)` → string | Método de `window.LingatuBridge`, expone la función `suggestCategory` | Sugiere una categoría existente por coincidencia de palabras |
| `LingatuBridge.prefillAndOpen({category,title,url,description})` | Método de `window.LingatuBridge`, llama a `openModal(null)` | Abre el modal de "Nuevo enlace" precargado |
| `LingatuBridge.appendNote({url,note,title,description})` → `{ok, created, id?, title?, category?, noteCount?}` | Método de `window.LingatuBridge`, usa `findDuplicateUrl` + `formatNoteBlock`/`appendNoteToText`/`countNoteBlocks` o `prefillAndOpen` | Añade una nota al enlace de esa URL (4.23). Si existe, la añade y guarda —`created:false`, y la extensión se queda donde está y avisa en la propia página con `title` y `noteCount` (decisión 36)—; si no existe, abre el modal precargado con la nota puesta —`created:true`, y la extensión salta a la pestaña de Lingatu—. El texto llega ya formateado (una selección, como cita); aquí solo se le pone el encabezado de fecha. Devuelve `{ok:false, reason:"empty-note"}` si falta la URL o la nota |
| Clases `.link-card` / `.link-card-compact` + atributo `data-id` en el elemento raíz de cada ficha | `cardHtml()` / `cardHtmlCompact()`, leídas por `highlightLink()` | `focusExisting` busca la ficha por estos selectores para resaltarla; si no los encuentra (p. ej. ficha filtrada/oculta), la llamada no hace nada, sin error |
| Ids de campo `fieldCategory`, `fieldTitle`, `fieldUrl`, `fieldDescription`, `fieldNotes` | Formulario `#linkForm`, rellenados por `openModal()` | `prefillAndOpen` rellena los cuatro primeros con `getElementById(...).value = ...`; `appendNote` rellena además `fieldNotes` cuando el enlace todavía no existe. Su **posición** en el formulario no forma parte del contrato —el modal pasó a dos columnas (4.1) sin tocar ningún id— pero los ids sí |

**Regla práctica al añadir cualquier funcionalidad nueva**: si no se toca ninguno de los elementos de la tabla, la extensión no se ve afectada. Si se toca alguno (p. ej. se rediseñan las fichas de enlace), hay que comprobar expresamente que lo que exige esta tabla se mantiene, y pasar la checklist manual siguiente antes de dar el cambio por cerrado.

*(Nota: el campo de etiquetas ya se rediseñó como editor de chips — 4.20 — precisamente porque `fieldTags` nunca formó parte de esta tabla protegida: `prefillAndOpen` no lo rellena, así que se pudo cambiar su estructura interna libremente sin tocar el contrato.)*

*(Nota: la selección múltiple — 4.21 — sí toca las fichas, y por eso la casilla se añade **dentro** de la ficha, sin envolverla en ningún contenedor que desplace su elemento raíz: la clase `.link-card`/`.link-card-compact` y el `data-id` siguen exactamente donde estaban, y la clase `selected` solo se suma a las que ya llevaba. `highlightLink()` sigue encontrando la ficha con el modo selección activo o sin él.)*

*(Nota: el indicador 📝 de las notas — 4.23 — también toca las fichas, y sigue el mismo criterio: se añade **dentro** de `.card-icon-actions`, sin envolver la ficha ni desplazar su elemento raíz, así que `.link-card`/`.link-card-compact` y el `data-id` siguen donde estaban.)*

*(Nota: con la **pantalla de apertura** puesta — 4.29 — los cinco métodos siguen existiendo, pero **lanzan**. La extensión ya sabe qué hacer con eso: su función inyectada devuelve `undefined`, cae en `!result.ok` y enseña el badge rojo "!". Es deliberado que falle de forma visible en vez de devolver un resultado plausible: `checkDuplicate()` diciendo "no hay duplicado" con la colección sin cargar haría que la extensión diera por guardado un enlace que no existe en ninguna parte. No hubo que tocar la extensión.)*

**Checklist de verificación manual** (no hay tests automatizados en el proyecto — ver sección 10):
0. Con la pantalla de apertura puesta (modo archivo, archivo sin abrir), pulsar el icono de la extensión → **badge rojo "!"**, y al abrir el archivo después, la colección no debe tener ningún enlace fantasma.
1. Abrir una pestaña con una URL que **no** esté guardada y pulsar el icono de la extensión → debe abrirse `lingatu.html` con el modal "Nuevo enlace" ya precargado (título, URL, descripción, categoría sugerida).
2. Repetir con una URL que **sí** esté guardada → no debe abrirse el modal; la vista debe desplazarse hasta la ficha existente y resaltarla brevemente.
3. Si el paso 2 no resalta nada pero tampoco da error, comprobar si hay un filtro activo (categoría, etiqueta excluida, búsqueda) ocultando esa ficha — es el comportamiento esperado, no un fallo del puente.
4. Seleccionar texto en una página **ya guardada** → menú contextual → "Añadir selección como nota en Lingatu": la nota debe añadirse **sin cambiar de pestaña**, y en esa misma página debe aparecer un aviso —"Nota añadida a Lingatu", con el título del enlace— que desaparece solo a los pocos segundos. Al volver a Lingatu, la nota está como cita con la fecha de hoy, y repetir la operación añade un **segundo** bloque sin borrar el primero, con el aviso indicando ya "2 notas en este enlace".
5. Repetir en una página **no guardada** → debe abrirse Lingatu con el modal precargado y la nota ya puesta en el campo Notas; al guardar, el enlace nace con ella.

**Mientras viva el alias `PinBoardBridge`**, esta checklist se pasa además contra un `pinboard.html` anterior al cambio de nombre (basta con la copia que cualquier usuario tenga descargada, o el archivo de la v1.9.0 del repositorio): las **cuatro** combinaciones —extensión nueva o antigua × archivo nuevo o antiguo— tienen que funcionar, y en ninguna puede aparecer el badge rojo "!". Es la única forma de comprobar el respaldo, porque el fallo que evita no da ningún error dentro de la app.

## 9. Estructura del repositorio

| Ruta | Propósito |
|---|---|
| `lingatu.html` | La aplicación (único archivo necesario para usarla) |
| `extension/` | Extensión de navegador (Chrome/Edge, Manifest V3) que captura la pestaña activa y la añade a `lingatu.html` — ver `README.md` para instalación |
| `tools/convertir_marcadores.py` | **Opcional** — la vía recomendada para migrar marcadores es exportarlos del navegador (Ctrl+Shift+O → Exportar) y soltar el archivo sobre `lingatu.html` (4.7), que los reconoce sin ninguna herramienta externa. Este script sigue siendo útil para convertir **varios perfiles/navegadores de golpe** desde la línea de comandos: convierte marcadores de Chrome y/o Edge (`Bookmarks`, formato Chromium JSON) al formato de importación de `lingatu.html`. No lleva ninguna ruta escrita: lee `sources` (lista de `{browser, profile, bookmarksPath}`) y `outputPath` desde un archivo de configuración JSON (`marcadores_config.json` junto al script por defecto, o `--config <ruta>`). Recorre recursivamente cada `Bookmarks`, usa la ruta de carpetas como `category` (unidas con `" / "`), deduplica por URL entre todas las fuentes, y escribe el resultado en `outputPath`. Es la referencia de comportamiento que replica `parseChromiumBookmarks` dentro de `lingatu.html` (4.7). |
| `tools/configurar_marcadores.html` | Página autocontenida (sin dependencias) para generar `marcadores_config.json` con un formulario, en vez de escribirlo a mano. Incluye una tabla de referencia con las rutas típicas de `Bookmarks` por sistema operativo y navegador. |
| `tools/marcadores_config.example.json` | Plantilla de ejemplo del archivo de configuración anterior, con rutas ficticias. `marcadores_config.json` (el real, con rutas de tu máquina) no se versiona. |
| `tools/verificar-i18n.html` | Página autocontenida (sin dependencias) que comprueba la paridad de los dos idiomas del diccionario `I18N` (4.28): claves que faltan en uno, duplicadas, definidas sin usar y usadas sin definir. |
| `examples/ejemplo-enlaces.json` | Enlaces de muestra en español (genéricos, no personales) cargables con "Importar" para ver la app con contenido. |
| `examples/example-links.json` | El equivalente en inglés del anterior. El estado de bienvenida nombra el que corresponde al idioma activo (4.8). |
| `extension/_locales/{es,en}/messages.json` | Textos de la extensión en los dos idiomas, con el mecanismo nativo de Chrome (4.28). El idioma lo elige el navegador, no el selector de la app. |
| `docs/ESPECIFICACIONES.md` | Este documento. |
| `docs/tareas/` | Requisitos detallados de las tareas del backlog listas para acometer, una por archivo (objetivo, decisiones ya tomadas, requisitos numerados, fuera de alcance, invariantes y checklist de verificación manual). Se borra el archivo al implementar la tarea. |
| `CLAUDE.md` | Convenciones de código y restricciones de arquitectura del proyecto, para cualquier agente o persona que vaya a modificar `lingatu.html`. |
| `README.md` | Instrucciones de instalación y configuración de la app y la extensión. |
| `LICENSE` | Licencia MIT. |

## 10. Compatibilidad y limitaciones conocidas

- **El idioma de la extensión y el de la app pueden no coincidir.** La app lo elige el usuario en su pie (4.28); la extensión lo decide el navegador, porque usa el mecanismo nativo de Chrome. Con el navegador en inglés y la app en español, los menús contextuales salen en inglés. Sincronizarlos exigiría un canal nuevo entre extensión y página solo para eso, y no compensa.
- **El nombre de la categoría por defecto no viaja en las copias ni en el archivo.** `enlaces_uncategorized_name_v1` no está en `STATE_SLOTS`, así que restaurar una copia o abrir un archivo en un navegador que arrancó en otro idioma puede acabar creando una segunda categoría por defecto con el otro nombre (por ejemplo "Uncategorized" junto a "Sin categoría"). No se pierde ni un enlace ni queda ninguno huérfano —las dos son categorías normales, y se pueden fusionar renombrando una con el nombre de la otra—, pero conviene saberlo. Meterla en `STATE_SLOTS` cambiaría el formato de la envoltura y de la exportación, que es un cambio mayor por un caso de borde.

- Requiere un navegador moderno con soporte de `localStorage`, `<dialog>`-like overlays manuales, `Set`, `Array.prototype.find`/`findIndex`, plantillas de cadena no usadas (se usa concatenación `+` deliberadamente por compatibilidad ES5-friendly).
- **El modo archivo (4.27, 4.29) solo existe en Chrome y Edge.** Firefox no implementa la File System Access API, así que ahí ni la acción ni el ajuste se ofrecen —tampoco desactivados— y la app funciona como siempre, en modo local. Y aun donde existe, **el archivo hay que abrirlo con un clic cada vez que se cierra la última pestaña de la app** — no solo al cerrar el navegador (P12). El permiso no sobrevive, y no por el origen `file://`: P11 lo midió igual en un origen normal (`spike/RESULTADOS.md`). Es una limitación de la plataforma, no algo que se pueda pulir; quien no quiera ese clic tiene el modo local en los ajustes, con lo que eso significa.
- **El tema forzado (4.30) tiene la paleta oscura duplicada en el CSS.** Es una consecuencia de que CSS no permita reutilizar un bloque de declaraciones dentro y fuera de una `@media`; ver decisión 65. Quien toque un color oscuro tiene que tocarlo en las dos copias.
- No hay sincronización entre dispositivos/navegadores: cada `localStorage` es local a un perfil de navegador en una máquina. Conectar un archivo en una carpeta sincronizada (4.27) acerca el resultado, pero **no es sincronización**: es un archivo compartido con detección de conflictos, para trabajar en un equipo cada vez. Exportar/Importar sigue siendo el mecanismo manual de respaldo/traslado. **Las salvaguardas de 4.26 mitigan el riesgo, no lo eliminan**: avisan de que hace días que no exportas y guardan tres instantáneas de rescate, pero esas instantáneas viven en el mismo almacén y se pierden con él. La única copia que sobrevive a un borrado de datos del navegador sigue siendo el archivo exportado.
- No hay límite de enlaces impuesto por la app; el límite real es la cuota de `localStorage` del navegador. Medido en Chrome 151: **5 MiB exactos** (~5.236.000 caracteres, contando clave y valor), compartidos por todas las páginas `file://`. La app avisa a partir del 60% de ocupación y explica el fallo cuando un guardado no cabe (4.26), en vez de perderlo en silencio como hacía antes.
- El borrado en el modal de gestión, y el título de la página, siguen usando `confirm()`/`prompt()` nativos del navegador (el renombrado de categorías/etiquetas ya es inline — ver decisión 10 de la sección 7).
- El arrastrar y soltar usa la API nativa HTML5 Drag and Drop, pensada para ratón — en pantallas táctiles el reordenamiento solo es posible con los botones ▲/▼ (que si funcionan por toque).
- Para colores personalizados fuera de la paleta fija de 12 tonos (4.10) se usa el `<input type="color">` nativo del navegador, cuyo aspecto exacto varía entre Windows/Chrome/Edge/Firefox.
- **Los favicons requieren internet y pasan por un tercero**: al mostrarse vía `google.com/s2/favicons`, cada dominio visible en tu lista de enlaces se envía a Google en cada carga de página (igual que hace cualquier navegador al mostrar el favicon de una pestaña, pero de forma explícita para *todos* los enlaces guardados a la vez, no solo el que estés visitando). Sin conexión, los enlaces se ven igualmente pero sin icono. Si esto es un problema, se puede sustituir `faviconUrl()` por una llamada directa a `https://<dominio>/favicon.ico` (menos fiable, pero sin intermediario).
- **Por debajo de 780 px el lateral se pliega.** Se apila sobre el contenido (una sola columna) y **sus tres secciones —categorías, vistas y etiquetas—, los botones de datos y el pie llegan plegados**, con un control «☰ Categorías y etiquetas» que los despliega. Antes venían todos desplegados, y eso enterraba la colección: medido con una colección normal, la primera ficha empezaba a **735 px** con la ventana a 760 y a **852 px** con la ventana a 390; ahora empieza a **289** y **338**. El estado plegado/desplegado **no se persiste** —es consecuencia del ancho, no una preferencia— y elegir una categoría vuelve a plegarlo, salvo con Ctrl/Cmd (selección múltiple, 4.18). Las etiquetas de la vista compacta se siguen ocultando para ahorrar espacio.
- **Los controles de cada ficha (▲▼✏️🗑️) se atenúan en reposo solo donde hay ratón** (`@media (hover: hover)`), y vuelven a plena visibilidad al pasar por encima o al enfocar cualquiera con el teclado. Donde no hay ratón no se atenúa nada, porque ahí los ▲▼ son la única forma de reordenar. El indicador 📝 queda fuera de la atenuación: es información, no un control.

## 11. Backlog de ideas (no implementadas)

Todas las ideas que figuraban aquí en rondas anteriores (multi-selección de etiquetas, plegado de categorías, edición inline, detección de duplicados, importación con fusión, reordenación manual, arrastrar y soltar, colores personalizados —incluida la paleta predefinida de 12 tonos, 4.10—, atajos de teclado, plegar/expandir todo, contadores por categoría en el sidebar, favicon por enlace, y la selección múltiple de enlaces con acciones en lote) se implementaron — ver secciones 4.2 a 4.21 y las decisiones de la sección 7.

Cualquier idea de esta lista debe respetar la restricción de arquitectura de la sección 2: JS/CSS vanilla dentro del mismo `lingatu.html`, sin frameworks, sin build step y sin servidor.

### 11.1 Pendientes, por prioridad

Ordenado por prioridad, con una excepción deliberada: las ideas relacionadas entre sí (por ejemplo, las de exportación/importación, o las de arrastrar y soltar) se agrupan físicamente aunque tengan prioridades distintas, para leerlas juntas. La prioridad real de cada una sigue siendo la de su columna, no su posición en la tabla.

| Prioridad | Idea | Notas de implementación |
|---|---|---|
| **Alta** | **Post-its en la propia página del enlace (fase 1)** | Al visitar una página que ya está en Lingatu, ver sus notas sin abrir Lingatu: panel plegable en una esquina, **sin anclar a ningún punto del contenido**. **Ya se puede acometer: las notas de las que depende están implementadas (4.23)** y no añade modelo de datos nuevo, son las mismas notas en una segunda superficie. **Análisis de las dos fases en 11.4** — la versión anclada al contenido es mucho más cara de lo que parece y rompe una premisa de la arquitectura; la fase 1 da la mayor parte del valor sin pagarla, y con el recuento en el badge del icono evita incluso el permiso `<all_urls>`. **Requisitos listos para acometer en [`docs/tareas/07-postits-fase1.md`](tareas/07-postits-fase1.md).** |
| **Alta** | **Exportar: más formatos y control de qué incluye** *(grupo Exportar/Importar, 1 de 2)* | Une tres ideas del backlog que tocan el mismo botón "Exportar" (4.7) en una sola mejora: **(1) Selector de formato** — JSON (el de siempre), **Netscape Bookmark HTML** (`<DL><DT><A HREF="...">`, el estándar que importan todos los navegadores; las categorías se mapean a carpetas `<H3>`) y **Markdown** (`## Categoría` + `- [Título](url) — descripción`, para pegar en notas). Los tres comparten mecanismo de descarga (Blob + `URL.createObjectURL`) y la misma decisión de qué enlaces incluyen (`getLinksForExport()`, filtro/selección activa). **(2) Checkbox "Notas"**, marcado por defecto: incluye el campo `notes` de cada enlace — pensado para compartir la colección sin arrastrar los comentarios personales escritos sobre cada uno. Solo se aplica a los formatos que pueden llevar ese contenido: el JSON (comportamiento actual, `JSON.stringify` completo) y Markdown (como texto bajo cada enlace); **el formato Netscape no tiene un campo portable para notas en ningún navegador, así que nunca las lleva**, marque lo que marque el checkbox — precisión que hay que dejar clara en la interfaz para no prometer algo que ese formato no puede cumplir. **Importar no necesita una opción simétrica para las notas**: si el JSON las trae, se importan igual que hoy, sin preguntar — los otros dos formatos son solo de exportación, Lingatu no los importa. **No afecta a la exportación autocontenida** (siguiente fila, 11.6): ese formato reproduce el estado exacto en otro equipo y siempre incluye las notas, sin este control. |
| **Media** | **Exportación autocontenida: la app con los datos dentro** *(grupo Exportar/Importar, 2 de 2)* | Segundo formato en el botón "Exportar" existente (no un botón nuevo): un `lingatu.html` con **todo el estado** incrustado en un `<script type="application/json">` — enlaces, categorías con su orden/color/icono, etiquetas y sus colores, perfiles de vista, título y modo de vista. Un solo archivo que es programa y datos: USB, correo, equipo nuevo, sin paso de importación. Se serializa el DOM vivo con `document.documentElement.outerHTML` sobre un clon limpio (vaciando los ocho contenedores que se repintan: `#categoryList`, `#tagCloud`, el `<datalist>`, `#viewProfileList`, `#linksContainer`, sugerencias y chips de etiquetas, `#manageList`) — no hace falta leer el archivo del disco, imposible en `file://`. **Regla de compatibilidad**: el JSON de enlaces sigue siendo el canal oficial para mover datos entre versiones; este formato congela también el código de la app, así que el seed lleva sello de versión y fecha, y **nunca se aplica solo si ya hay datos** (reglas de siembra en 11.6). |
| **Media** | **Arrastrar una URL desde otra ventana** *(grupo Arrastrar y soltar, 1 de 2)* | Soltar un enlace arrastrado desde otra pestaña/ventana sobre la página abre el modal de "Nuevo enlace" precargado; si se suelta sobre un grupo de categoría concreto, ya va clasificado en ella. El manejador de `drop` de `#linksContainer` ya existe para reordenar (4.9): basta distinguir el arrastre externo leyendo `text/uri-list` del `dataTransfer`. Funciona sin instalar la extensión. |
| **Muy baja** | **Soporte táctil para arrastrar y soltar** *(grupo Arrastrar y soltar, 2 de 2)* | La API nativa HTML5 Drag and Drop está pensada para ratón; en pantallas táctiles solo funcionan los botones ▲/▼ (sección 10). Habría que implementarlo con eventos `touchstart`/`touchmove`/`touchend` en paralelo, reutilizando `moveLinkTo`/`moveCategoryTo` como punto de aplicación. |
| **Media** | **Copiar URL al portapapeles** | Icono junto a cada enlace (ambos modos de vista) que copie `l.url`. **La parte delicada ya está resuelta**: `copyTextToClipboard(text, btn)` (sección 6) hace el `navigator.clipboard` con respaldo de `execCommand`, que hacía falta porque en `file://` el API puede fallar según navegador y foco, y confirma en el propio botón. Queda solo añadir el icono a `cardHtml`/`cardHtmlCompact` y su `data-action` en el listener delegado — revisar la tabla de la sección 8 antes de cerrar el cambio, porque toca las fichas. |
| **Baja** | **Enlaces en las notas** | Lo único del Markdown habitual que quedó fuera del renderizador (4.23, decisión 38), y a propósito: es lo que obliga a construir un `href` y, con él, a una lista blanca de esquemas para que un `javascript:` copiado de una página no acabe siendo un clic ejecutable. Hoy una URL pegada en una nota se lee y se copia, que cubre el caso normal. Si se retoma: `[texto](url)` validando `http`/`https`/`mailto`, **sin** imágenes (cargarían recursos de terceros desde tus notas), y con revisión de seguridad propia — no es "una regex más". |
| **Baja** | **Icono generado localmente como *fallback* del favicon** | Hoy, si el favicon de Google no carga, el `<img>` se autodestruye (`onerror="this.remove()"`, 4.11) y queda un hueco. Cambio: sustituirlo por un icono generado en local — color derivado del hash del dominio + iniciales, como hacen Gmail o Notion con los avatares. Con red se ven los favicons reales de siempre; sin red, o con el servicio bloqueado, un icono legible en vez de nada. ~15 líneas, **sin ninguna opción que configurar**: es una mejora estricta sobre el estado actual. No resuelve la limitación de privacidad de la sección 10 (el dominio sigue enviándose a Google cuando hay red); eliminarla del todo exigiría hacer el icono local *siempre*, que es una decisión distinta —privacidad frente a reconocimiento visual de marca— y no se toma aquí. **El panel de Ajustes ya existe (4.30), así que la variante conmutable —las dos fuentes de icono, a elección del usuario— ya no exige inventar dónde ponerla**; lo que sí sigue en pie es el criterio de 4.30 de no pasar de cuatro ajustes sin una razón buena. |
| **Muy baja** | **Papelera con deshacer** | Al borrar, mover el enlace a un array temporal con marca de tiempo y mostrar un aviso "Enlace eliminado — Deshacer" durante unos segundos, en vez del borrado inmediato e irreversible actual (4.1). Sustituiría el `confirm()` del icono 🗑️. |
| **Muy baja** | **Contador de clics / último acceso** | Incrementar un contador local al abrir un enlace, para poder ordenar por "más usados". Choca de frente con la decisión de que el orden es siempre manual (sección 3 y 4.9): tendría que ser un modo de orden alternativo y explícito, nunca el de por defecto. |
| **Muy baja** | **QR local del enlace** | Generar el QR en canvas/SVG puro para abrir un enlace en el móvil sin escribir la URL. Encaja con la filosofía de no depender de red, pero implica escribir un codificador QR desde cero (no hay librería externa posible) — de ahí la prioridad. |

### 11.2 Descartadas y aparcadas (y por qué)

Se registran aquí para no volver a proponerlas en rondas futuras. **Aparcada** significa que la idea es buena pero se decidió no abordarla ahora; el análisis se conserva para cuando se retome.

- **(Implementado — 4.27) El archivo como fuente de verdad, con sincronización por carpeta sincronizada.** Se acometió tras responder empíricamente las dos incógnitas que esta entrada dejó planteadas (Fase 0, [`spike/RESULTADOS.md`](../spike/RESULTADOS.md)):
  - **IndexedDB funciona en `file://`**, así que hay dónde guardar el handle — que no es serializable a JSON y por tanto no cabía en `localStorage`. Segunda incógnita: resuelta que sí.
  - **El permiso NO sobrevive al cierre del navegador.** Primera incógnita: resuelta que no. La entrada sospechaba que la causa era la opacidad del origen `file://`, y **eso resultó ser falso**: P11 midió después lo mismo con `http://127.0.0.1` —un origen normal, seguro y estable— y el permiso también vuelve a `prompt`. No es cosa del origen; Chrome solo conserva ese permiso para aplicaciones instaladas. Se adoptó por tanto el **modo degradado que esta misma entrada declaraba aceptable**: un clic por sesión para abrir el archivo, y el resto de la sesión escribe sola. Lo que 4.29 cambió después es qué pasa **mientras** ese clic no llega: ya no se sigue trabajando con la copia del navegador como si nada.
  - Se cumplieron los dos límites que la entrada fijaba: **no es sincronización, es un archivo compartido con detección de conflictos** (dicho así en el propio diálogo), y **nunca se escribe un estado vacío sobre un archivo que tenía datos** sin confirmación con recuentos — regla que se aplicó por umbral y no al pie de la letra, ver decisión 54.
  - Lo que no se pudo prever al escribir esta entrada: **Firefox no implementa la API en ninguna forma**, así que el modo archivo es opcional y depende del navegador, no el sustituto universal de `localStorage` que aquí se imaginaba.

- **Tour interactivo guiado de bienvenida**: uno o dos días de trabajo, los usuarios lo saltan, y en un archivo único envejece mal. Es la opción de ayuda que parece más profesional y la que menos rinde; el retorno está en los estados vacíos y en la chuleta (11.5).
- **Variante de solo lectura de la exportación autocontenida** (el mismo archivo sin botones de edición, para consultar): descartada por no aportar sobre la exportación completa, que ya se puede consultar igual.

### 11.3 Notas por enlace — qué se implementó y qué quedó fuera

**Implementado** (funcionalidad completa en 4.23, decisiones 33-38 de la sección 7, superficie del puente en la 8): el campo `notes` en los cinco sitios que reconstruyen un enlace, el `<textarea>` del modal, el indicador 📝 en las fichas de los dos modos de vista con su visor de solo lectura, el renderizado del Markdown al leer, `appendNote` en el puente, los dos menús contextuales de la extensión (permiso `contextMenus`) con su aviso en la propia página, y `notes` dentro del texto donde busca `getFilteredLinks()`.

La "fase 2" que este documento reservaba para más adelante (el renderizador) acabó entrando en la misma tanda, pero **por un camino distinto al planeado**: sin `innerHTML` y sin enlaces, ver decisión 38.

**Fuera de alcance, a propósito:**

- **Enlaces, imágenes, tablas y HTML crudo dentro de una nota**: lo único del Markdown corriente que no se renderiza. Los enlaces quedan en 11.1 con prioridad baja y revisión de seguridad propia.
- **Popup de la extensión para escribir una nota a mano** (sin selección previa). Se dejó fuera por un choque real: **declarar un `default_popup` desactiva `chrome.action.onClicked`**, que es el disparador del flujo de siempre (pulsar el icono guarda la página). Añadirlo obliga a mover ese flujo dentro del popup, es decir, a cambiar el comportamiento observable de lo que ya funcionaba. Hoy se anota desde la página capturando una selección, y desde Lingatu escribiendo en el modal. **Si se retoma**, hay que decidir antes qué pasa con el clic del icono, y tenerlo en cuenta junto con el panel de post-its (11.4), que tiene el mismo problema de disparador.
- **Notas por categoría o por etiqueta**, adjuntar archivos a una nota, e historial o versiones de una nota.
- **Guardar notas en `chrome.storage`**: el único almacén sigue siendo el `localStorage` de `lingatu.html`. Es la línea que separa esta tarea de la de post-its (11.4).

### 11.4 Post-its en la página del enlace — análisis y fases

Idea: que al volver a una página sobre la que se tomaron notas, esas notas reaparezcan **sobre la propia página**, sin abrir Lingatu.

**Valoración**: la idea es excelente y es lo que hacen productos de anotación web como Hypothesis o Diigo — con servidor. Pero en su versión completa **rompe una premisa de la arquitectura**, y conviene ver exactamente dónde antes de decidir el alcance.

**El problema de fondo: dónde viven los datos.** Las notas están en el `localStorage` de `lingatu.html`, que un *content script* inyectado en otra página **no puede leer** (origen distinto), y el puente de la sección 8 solo funciona cuando la pestaña de Lingatu está abierta. Para que un post-it aparezca "al volver a la página", el dato tiene que estar disponible sin que Lingatu esté abierto — lo que obliga a guardarlo también en `chrome.storage.local`. Es decir: **un segundo almacén de datos y un protocolo de sincronización entre los dos**, con cola de escrituras pendientes y resolución de conflictos. Lingatu deja de ser "un archivo HTML con sus datos" y pasa a ser un sistema de dos piezas con estado propio cada una. Es un salto mucho mayor que cualquier otra cosa de este backlog, y casi todo el coste cae en la extensión, que hoy es deliberadamente un cliente fino con cinco métodos.

**Los otros dos problemas de la versión anclada:**
- **Anclaje.** Situar un post-it *en un punto* de la página es un problema conocidamente difícil: por coordenadas absolutas se rompe con cualquier cambio de maquetación o de tamaño de ventana; por selector CSS o por texto seleccionado se rompe cuando la página cambia de contenido, y en una SPA se rompe al navegar.
- **Permisos.** Requiere un content script sobre `<all_urls>`, que en la instalación pide *"leer y cambiar todos tus datos en todos los sitios web"*. Para una extensión que se instala descomprimida, es un coste de confianza real y desproporcionado si el usuario solo quería marcadores.

**Fase 1 (la recomendada, en 11.1 con prioridad alta): recordatorio, no post-it anclado.** Al visitar una página que ya está en Lingatu, sus notas se muestran en un panel plegable en una esquina — **sin anclar a ningún punto del contenido**, lo que lo hace inmune a todos los problemas de anclaje. Da la mayor parte del valor ("vuelvo aquí y veo lo que anoté") por una fracción del coste, y **no necesita modelo de datos nuevo**: las notas ya existen (4.23), con su campo `notes`, su formato por bloques con fecha y su `appendNote` en el puente. Una sola función de notas, dos superficies donde se ven. La dependencia está resuelta: esta fase ya se puede acometer.

**Y ya hay una de esas dos superficies escrita**: el visor de notas de Lingatu (`#notesViewerOverlay`, decisión 37) muestra exactamente lo mismo que tendrá que mostrar el panel en la página — título, categoría y las notas renderizadas. `renderNotesInto` está escrita como función pura, sin depender del DOM de Lingatu ni de `state`, **para que el panel pueda portarla tal cual**: no se puede compartir el archivo (son dos entornos, la página y la extensión), pero sí el código y el criterio. La contrapartida es que quedarán dos copias, y tocar una obliga a tocar la otra o la misma nota se verá distinta en cada sitio. El aviso efímero que ya inyecta la extensión al añadir una nota (decisión 36) resuelve además la parte técnica: shadow DOM cerrado, `activeTab` sin permisos nuevos y `textContent`; el panel es esa misma técnica con contenido persistente en vez de efímero.

Truco para evitar `<all_urls>` incluso en la fase 1: el `background` puede leer la URL de la pestaña activa con el permiso `tabs` y **poner el recuento en el badge del icono** ("2"), sin inyectar nada en ninguna página; el panel se inyecta solo bajo una acción explícita del usuario, con `activeTab`. Se conserva casi toda la magia —ves que hay algo anotado ahí— sin pedir permiso para modificar todos los sitios web.

Dos precisiones que salieron al detallar la tarea (requisitos completos en [`docs/tareas/07-postits-fase1.md`](tareas/07-postits-fase1.md)):

- **El disparador no puede ser "pulsar el icono" si existe el popup** de escritura de notas: declarar un `default_popup` desactiva `chrome.action.onClicked`. Es exactamente el motivo por el que ese popup quedó fuera de la tarea de notas (11.3), así que **el problema sigue abierto y hay que resolverlo aquí**: el panel se dispara desde una entrada de menú contextual —hoy ya hay dos, así que sumar una tercera no cambia nada estructural— y opcionalmente desde un botón del propio popup, si algún día existe. La división de trabajo entre ambas superficies es clara: el popup es transaccional (escribir y cerrar) y el panel es persistente (leer las notas mientras lees la página) — **un popup se cierra al pulsar fuera, y eso lo hace inservible como acompañante de lectura**.
- **El badge sí obliga a una copia local**, porque hay que saber si la página tiene notas sin Lingatu abierto. Lo que la mantiene dentro de los límites de la fase 1 es que sea una **proyección de solo lectura** (mapa `URL → número de notas`, sin el texto), de **dirección única** (Lingatu escribe, la extensión lee, nunca al revés, así que no hay cola de pendientes ni conflictos) y **descartable** en cualquier momento sin pérdida. En cuanto haya escritura de vuelta, se ha entrado en la fase 2.

**Fase 2 (post-its anclados al contenido, varios por página): sin priorizar, no descartada.** Exige modelo de datos propio (posición o ancla, id, color), el segundo almacén con su sincronización, y aislamiento en shadow DOM para no chocar con el CSS ni con la CSP del sitio anfitrión. Reevaluar **solo** si la fase 1 demuestra que la función se usa de verdad.

### 11.5 Ayuda al usuario — diagnóstico y decisión

Diagnóstico: **no hay un problema de documentación, hay un problema de descubribilidad.** Son cosas distintas y se arreglan en sitios distintos. La landing del proyecto y el README de GitHub sirven para *evaluar* ("¿me sirve esto?") e *instalar*; no sirven para *operar*. Un usuario que necesita salir de la app y buscar en GitHub cómo se hace algo no lo hace: abandona la función y sigue usando el 30% que descubrió solo.

Y Lingatu acumula mucha potencia invisible. Hoy nada en pantalla insinúa que existan: **Ctrl+clic** para multi-selección de categorías (4.18); el **triple estado** de una etiqueta al pulsarla repetidamente —neutra → incluida → excluida— (4.17), que es directamente indescubrible porque nadie hace tres clics en el mismo sitio para ver qué pasa; que se pueden **arrastrar** tanto enlaces como categorías (4.9, 4.14); los perfiles de Vistas; los atajos `/` y `n` (4.12); que la cabecera de un grupo se pliega al pulsarla (4.2); que "Exportar" cambia de significado si hay un filtro puesto (4.7).

**Asimetría estructural que decide la cuestión**: la ayuda alojada en GitHub no se puede leer desde la app, que corre en `file://`. La ayuda embebida **viaja dentro del archivo** — y eso pesa mucho más si se implementa la exportación autocontenida (11.6) y los archivos empiezan a pasar de mano en mano. Un `lingatu.html` que alguien te pasa y se explica solo es un producto; uno que remite a un repositorio, no.

Decisión adoptada, por orden de retorno: **estados vacíos que enseñan y `title` en todo lo interactivo** (prioridad muy alta, media hora cada uno, ninguna decisión que tomar — pendiente, [`docs/tareas/01-ayuda-inmediata.md`](tareas/01-ayuda-inmediata.md)); **panel "?" con la chuleta** (prioridad alta; la paleta de comandos —4.22— cubre las acciones y deja solo los gestos, filtros y datos por documentar); **tour interactivo guiado, descartado** (11.2).

**Implementado**: el panel "?" (4.25), con sus cinco bloques —Atajos, Gestos, Filtros, Datos y Tu archivo de datos— y el inventario completo de este diagnóstico como contenido. Sigue pendiente la otra mitad de la decisión: estados vacíos que enseñan (más allá del caso ya cubierto por la búsqueda con operadores, 4.3) y `title` en el resto de controles interactivos.

### 11.6 Exportación autocontenida — reglas de siembra

**Qué incluye el bloque incrustado: todo el estado, no solo los enlaces.** Es la diferencia esencial con el JSON de enlaces de 4.7, que a propósito omite las listas maestras porque se regeneran al importar. Aquí el objetivo es abrir el archivo en otro equipo y encontrarlo **igual**, así que el seed lleva enlaces (con sus `notes`, 4.23 — y ojo: ese campo es el sexto sitio que enumera los campos de un enlace, así que el seed tiene que incluirlo explícitamente), categorías con su orden, colores e iconos, etiquetas con sus colores, perfiles de vista, título de la página y modo de vista. Más un sello de versión de la app, fecha de exportación y recuento, para el aviso del punto siguiente.

**Cuándo se aplica.** El seed **nunca sobrescribe datos existentes de forma automática**:
- Seed presente y `localStorage` vacío → siembra directa. Es el caso que da valor a la idea (USB, equipo nuevo, archivo recibido por correo).
- Seed presente y ya hay datos → **no toca nada** y muestra un aviso discreto: *"Este archivo contiene una copia de 412 enlaces exportada el 12/08/2026 con Lingatu v1.5.0 — Fusionar / Sustituir todo / Ignorar"*.

Con eso, **el seed se convierte en una fuente de importación más que desemboca en el modal y las funciones que ya existen** (4.7 para enlaces, 4.19 para categorías: `performImportMerge` valida campos y `ensureCategory` respeta color/icono/posición de las que ya existían, así que la fusión ya está definida). El problema de compatibilidad entre versiones se resuelve reutilizando el mecanismo que ya lo tenía resuelto, en vez de inventar uno nuevo.

**Preferencias de interfaz**: título de la página y modo de vista se aplican en la siembra directa y en "Sustituir todo", pero **no** al fusionar — fusionar datos ajenos no debe cambiarte el título de tu propia página.

**Por qué esta regla también cubre un caso raro pero desconcertante**: en Chrome y Edge todas las páginas `file://` comparten el mismo `localStorage`, así que un archivo autocontenido abierto en la máquina donde ya usas Lingatu vería tus datos actuales y no los que lleva dentro. Como con datos previos nunca siembra solo y siempre avisa, el comportamiento es correcto y explícito sea cual sea la política de cada navegador — el diseño no depende de ese detalle.

**Riesgo que el sello de versión hace visible**: abrir una exportación vieja significa **ejecutar la app de la versión en que se exportó**. Sin el aviso, se volvería a una versión anterior sin notarlo. De ahí la regla general: **el JSON de enlaces sigue siendo el canal oficial para mover datos entre versiones**; el formato autocontenido es una foto, y es también una foto de la app.

- **Favoritos / enlaces fijados** (estrella que ancla el enlace arriba de su categoría): ya lo resuelve la reordenación manual existente (4.9) — subir un enlace al principio de su grupo es exactamente la misma acción, sin añadir un campo nuevo al modelo de datos ni un segundo criterio de orden compitiendo con el manual.
- **Campo "leído/pendiente"** (read-it-later con filtro): fuera del propósito de la app (sección 1), que es organizar una colección estable de enlaces, no gestionar una cola de lectura.
- **Más atajos de teclado** (navegar con flechas, `Ctrl+E`/`Ctrl+D`…): los dos actuales (`/` y `n`, ver 4.12) cubren lo que se necesita; añadir más aumenta la superficie de conflictos con los atajos del navegador y con la escritura en campos (decisión 15 de la sección 7) sin ganancia real.
- **Progressive Web App** (manifest + service worker): incompatible con el modo de uso real de la app, que se abre como archivo local (`file://`) — un service worker exige un origen `http(s)`, así que "instalarla" obligaría a servirla desde un servidor, rompiendo la premisa de la sección 2.
- **Comprobación de salud de los enlaces** (detectar enlaces caídos delegando las peticiones de red en la extensión, que desde su `background` con `host_permissions` sí puede leer el código de estado real): descartada por **falsos positivos**. Muchos sitios responden 403/429 a peticiones automatizadas o bloquean `HEAD` estando perfectamente vivos, así que la lista de "enlaces roídos" sería poco fiable — y una señal de calidad en la que no puedes confiar es peor que no tener ninguna.
