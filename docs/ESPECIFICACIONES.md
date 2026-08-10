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
- Formulario: Categoría\* (con autocompletado vía `<datalist>`), Título\*, Link\* (`type="url"`), Descripción, Etiquetas (texto libre separado por espacios/comas, se autoprefija con `#`), Activo (checkbox).
- Botón "Cancelar" y clic fuera del modal (overlay) cierran sin guardar. Tecla `Escape` también cierra el modal que esté abierto (enlace o gestión).

### 4.2 Agrupación por categorías
Los enlaces filtrados se agrupan siempre por categoría en el área principal. Cada grupo es un `<section class="category-group">` con:
- Cabecera (`h2.category-group-title`, con `data-category`): flecha de plegado + nombre de categoría + contador de enlaces del grupo.
- Contenido: cuadrícula (`links-grid`) o lista (`links-list`) según el modo de vista.

Las categorías se muestran en su orden manual (ver 4.14), no alfabético. Si se filtra por una categoría concreta desde el sidebar, solo aparece un grupo.

**Filtro por categoría (sidebar)**: clic en un `.category-item` de `#categoryList` fija `state.category` a esa categoría. Un segundo clic sobre la **misma** categoría ya seleccionada la deselecciona (`state.category = null`), sin necesidad de volver a pulsar "Todas" — mismo resultado que clicar "Todas", pero como atajo directo sobre la categoría activa.

**Plegar/expandir**: clic en la cabecera de un grupo (`toggleCategoryCollapse`) lo pliega u expande individualmente — el estado se guarda por nombre de categoría en `state.collapsedCategories` (`Set`) y persiste en `localStorage` (`enlaces_collapsed_categories_v1`), así que se recuerda entre sesiones. Visualmente, un grupo plegado oculta su `links-grid`/`links-list` vía CSS (`.category-group.collapsed`) y rota la flecha (`.group-toggle-arrow`) -90°. El botón **"Plegar todo" / "Expandir todo"** de la barra de herramientas (`#btnToggleAllGroups`) pliega o expande todas las categorías de golpe; su etiqueta se recalcula en cada `render()` (`syncToggleAllGroupsLabel`) según si *todas* las categorías están ya plegadas o no.

**Nota de diseño**: como la categoría ya es visible en la cabecera del grupo, **no se repite dentro de cada tarjeta/fila individual** (se quitó el badge de categoría de las tarjetas).

### 4.3 Búsqueda y filtros
- **Búsqueda** (`#searchInput`): coincidencia de subcadena (case-insensitive) sobre título + descripción + etiquetas concatenados.
- **Filtro de categoría**: menú lateral tipo lista, un único valor seleccionable (`state.category`, `null` = todas).
- **Filtro de etiquetas**: nube de etiquetas en el lateral y en cada tarjeta (`state.tags`, `Set`). Al hacer clic en una etiqueta —lateral o tarjeta— se **añade o quita** de la selección (multi-selección acumulativa); un enlace coincide si tiene *alguna* de las etiquetas seleccionadas (OR).
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

### 4.7 Exportar / Importar (JSON)
- **Exportar**: descarga `pinboard_AAAA-MM-DD.json` (formato idéntico al modelo de datos, sin listas maestras de categorías/etiquetas — se regeneran al importar). `getLinksForExport()` decide qué exportar: **sin ninguna categoría ni etiqueta seleccionada** (`hasLinkSelection()` es `false`), exporta `state.links` completo; **con alguna selección activa** (categoría, etiquetas incluidas o excluidas — aplicar una vista guardada, 4.17, es solo un atajo para fijar estas mismas), exporta únicamente los enlaces que cumplen esos criterios. A propósito ignora la búsqueda de texto y el toggle Todos/Activos, para que ese filtro momentáneo no recorte una exportación sin que el usuario lo busque explícitamente. El título del botón (`syncExportButtonLabel`, llamado desde `render()`) indica en cada momento si va a exportar todo o cuántos enlaces de la selección actual.
- **Importar**: selecciona un `.json`, valida que sea un array con `category`, `title`, `url` en cada elemento, y abre el modal `#importModalOverlay` con dos opciones (además de "Cancelar"):
  - **Fusionar** (`performImportMerge`, recomendado — botón primario): añade solo los enlaces del archivo cuya URL (normalizada con `normalizeUrlForCompare`: `trim` + sin `/` final + minúsculas) no exista ya entre los enlaces actuales. Los añadidos se registran con un `id` nuevo y se normalizan sus categorías/etiquetas (`ensureCategory`/`ensureTag`). Al terminar, muestra un `alert()` con el recuento de añadidos/omitidos.
  - **Sustituir todo** (`performImportReplace`, botón `btn-danger`): pide una confirmación adicional y luego **reemplaza por completo** `state.links` por el contenido del archivo.
  - Tras cualquiera de las dos, se resetean los filtros a estado neutro (`resetFiltersAfterImport`: `activeFilter = "all"`, categoría = todas, etiquetas = ninguna, búsqueda vacía) para poder revisar el resultado.

### 4.8 Datos de ejemplo (primer arranque)
Si no hay datos guardados en `localStorage`, la app arranca sin ningún enlace (`state.links = []`). Para probarla con contenido de muestra, existe un archivo aparte, [`examples/ejemplo-enlaces.json`](../examples/ejemplo-enlaces.json), cargable con el botón "Importar".

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
- **`n`** — abre el modal de "Nuevo enlace".

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

### 4.17 Vistas guardadas (exclusión de etiquetas por nombre)
Objetivo: poder ocultar de la vista los enlaces de un contexto (p. ej. "trabajo") sin necesidad de un campo nuevo en el modelo de datos ni de un sistema de grupos aparte — reutiliza las etiquetas ya existentes.

**Exclusión de una etiqueta** (`#tagCloud` en el sidebar, no en las etiquetas de las tarjetas): cada clic cicla por 3 estados — neutra → incluida (mismo filtro `state.tags` de siempre, `.tag-chip.active`) → **excluida** (`state.excludedTags`, `.tag-chip.excluded`, con tachado y borde rojo) → neutra de nuevo. A diferencia de `state.tags`/`state.category`/`state.search` (que se resetean en cada carga de página), `state.excludedTags` se persiste en `enlaces_excluded_tags_v1` y **se mantiene fijo hasta que el usuario la desmarca**, incluso entre sesiones — es justo el comportamiento pedido ("fijar la exclusión hasta que se desmarque"). `getFilteredLinks()` descarta cualquier enlace cuyas `tags` intersequen con `state.excludedTags`.

**Perfiles de vista** (sección "Vistas" del sidebar, `#viewProfileList`): un perfil es `{ name, tags: [...], excludedTags: [...] }` — guarda **toda** la selección de etiquetas, tanto las incluidas como las excluidas, no solo la exclusión. Guardado en `state.viewProfiles` (`enlaces_view_profiles_v1`), independiente de los enlaces y de la lista maestra de etiquetas — si se borra una etiqueta que un perfil usaba, el perfil simplemente deja de tener efecto sobre ese texto, sin romper nada. `loadViewProfiles()` normaliza perfiles guardados antes de este cambio (sin `tags`) a un array vacío, por compatibilidad.
- **Guardar** (`btnSaveViewProfile`): pide un nombre (`prompt`) y guarda `state.tags` + `state.excludedTags` tal cual están *en ese momento* — sin exigir ningún mínimo, "todo sin filtrar" es una vista válida como cualquier otra. Si el nombre coincide (sin distinguir mayúsculas) con un perfil ya existente, pide confirmación para sobrescribirlo.
- **Aplicar / deseleccionar**: clic en el chip del perfil (`.view-profile-chip`) sustituye tanto `state.tags` como `state.excludedTags` por lo guardado. Si el perfil ya está activo (`currentSelectionMatchesProfile()`, vía `setsMatch()`), el mismo clic lo deselecciona en vez de reaplicarlo — vacía ambos conjuntos y vuelve a la vista general — mismo patrón de toggle que la selección de categoría (4.2).
- **Eliminar**: botón "✕" del propio chip (`data-action="delete-profile"`), con confirmación; no toca `state.excludedTags` si ese perfil estaba aplicado en ese momento (la exclusión vigente se queda como está, solo desaparece el atajo guardado).

**Interacción con la extensión** (ver sección 8): `checkDuplicate` sigue detectando bien un enlace ya guardado aunque esté oculto por una exclusión activa (consulta `state.links` directamente). `focusExisting`, en cambio, no podrá resaltarlo si su ficha no está renderizada por estar excluida — no es un fallo, es el mismo caso ya cubierto por la checklist de la sección 8.

## 5. Estructura del HTML

```
<div class="app">                       Grid de 2 columnas: sidebar (270px) + contenido
  <aside class="sidebar">
    Título editable (site-title)
    Botón "+ Nuevo enlace"
    Sección Categorías (lista + botón Gestionar)
    Sección Etiquetas (nube + botón Gestionar)
    Exportar / Importar
  </aside>
  <main class="content">
    Toolbar: buscador + toggle estado + toggle vista + contador resultados
    #linksContainer            ← agrupado por categoría (ver 4.2)
    #emptyState                ← mensaje "sin resultados"
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
| `getCategories()` / `getAllTags()` | Devuelven las listas con recuento de uso, a partir de las listas maestras. `getCategories()` respeta el orden manual de `state.categories`; `getAllTags()` sigue siendo alfabético |
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
| `toggleCategoryCollapse(cat)` | Pliega/expande un grupo de categoría y persiste el estado |
| `syncToggleAllGroupsLabel()` | Actualiza la etiqueta del botón "Plegar todo"/"Expandir todo" según el estado actual |
| `openManageModal(type)` / `renderManageList()` / `performRename(oldName, newValue)` | Modal de gestión: apertura, render (incluye modo edición inline y selector de color) y aplicación del renombrado |
| `performImportReplace(data)` / `performImportMerge(data)` | Las dos estrategias de importación (ver 4.7) |
| `escapeHtml(str)` | Sanitiza cualquier texto antes de insertarlo como HTML (previene XSS) |
| `normalizeTags(raw)` | Parsea el texto libre de etiquetas del formulario en un array `#etiqueta` deduplicado |
| `genId()` | Genera IDs únicos: `Date.now().toString(36) + random` |

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
16. **Favicon vía servicio externo, sin guardarlo en los datos**: se optó por pedirlo en cada render a `google.com/s2/favicons` (un servicio de terceros ampliamente usado para este propósito) en vez de descargarlo y guardarlo en base64 dentro del enlace, para no inflar el JSON de exportación ni la cuota de `localStorage`. Contrapartida: requiere conexión a internet para verse (si no hay red, simplemente no aparece ningún icono, sin romper nada) y ese servicio recibe el dominio de cada enlace que se muestra — ver limitación de privacidad en la sección 9.

## 8. Contrato con la extensión de Chrome

`extension/background.js` nunca accede al DOM de `pinboard.html` directamente: pasa siempre por una superficie mínima y estable, `window.PinBoardBridge`, expuesta al final de la IIFE (`pinboard.html:1215-1241`). Cualquier cambio a los elementos listados abajo debe ir acompañado de una revisión de `extension/background.js` (función `callBridge`, líneas 47-67) — si no, la extensión deja de funcionar, normalmente **en silencio**: solo se ve un badge rojo "!" sobre el icono de la extensión (`flashBadge`, `background.js:69-73`), sin ningún error visible dentro de `pinboard.html`.

**Superficie exacta que debe mantenerse estable:**

| Elemento | Ubicación en `pinboard.html` | Para qué lo usa la extensión |
|---|---|---|
| `PinBoardBridge.checkDuplicate(url)` → `{id,title,category}` o `null` | líneas 1217-1220 | Detecta si la URL de la pestaña activa ya está guardada |
| `PinBoardBridge.focusExisting(url)` | líneas 1222-1225 | Desplaza la vista y resalta la ficha si ya existe |
| `PinBoardBridge.suggestCategory(title, description, url)` → string | línea 1228 | Sugiere una categoría existente por coincidencia de palabras |
| `PinBoardBridge.prefillAndOpen({category,title,url,description})` | líneas 1231-1240 | Abre el modal de "Nuevo enlace" precargado |
| Clases `.link-card` / `.link-card-compact` + atributo `data-id` en el elemento raíz de cada ficha | `highlightLink()`, líneas 1207-1213 | `focusExisting` busca la ficha por estos selectores para resaltarla; si no los encuentra (p. ej. ficha filtrada/oculta), la llamada no hace nada, sin error |
| Ids de campo `fieldCategory`, `fieldTitle`, `fieldUrl`, `fieldDescription` | `openModal()`, líneas 1121-1133 | `prefillAndOpen` los rellena con `getElementById(...).value = ...` |

**Regla práctica al añadir cualquier funcionalidad nueva**: si no se toca ninguno de los elementos de la tabla, la extensión no se ve afectada. Si se toca alguno (p. ej. se sustituye el campo de etiquetas por un componente de chips, o se rediseñan las fichas de enlace), hay que comprobar expresamente que lo que exige esta tabla se mantiene, y pasar la checklist manual siguiente antes de dar el cambio por cerrado.

**Checklist de verificación manual** (no hay tests automatizados en el proyecto — ver sección 10):
1. Abrir una pestaña con una URL que **no** esté guardada y pulsar el icono de la extensión → debe abrirse `pinboard.html` con el modal "Nuevo enlace" ya precargado (título, URL, descripción, categoría sugerida).
2. Repetir con una URL que **sí** esté guardada → no debe abrirse el modal; la vista debe desplazarse hasta la ficha existente y resaltarla brevemente.
3. Si el paso 2 no resalta nada pero tampoco da error, comprobar si hay un filtro activo (categoría, etiqueta excluida, búsqueda) ocultando esa ficha — es el comportamiento esperado, no un fallo del puente.

## 9. Estructura del repositorio

| Ruta | Propósito |
|---|---|
| `pinboard.html` | La aplicación (único archivo necesario para usarla) |
| `extension/` | Extensión de navegador (Chrome/Edge, Manifest V3) que captura la pestaña activa y la añade a `pinboard.html` — ver `README.md` para instalación |
| `tools/convertir_marcadores.py` | Script (Python) para convertir marcadores de Chrome y/o Edge (`Bookmarks`, formato Chromium JSON) al formato de importación de `pinboard.html`. No lleva ninguna ruta escrita: lee `sources` (lista de `{browser, profile, bookmarksPath}`) y `outputPath` desde un archivo de configuración JSON (`marcadores_config.json` junto al script por defecto, o `--config <ruta>`). Recorre recursivamente cada `Bookmarks`, usa la ruta de carpetas como `category` (unidas con `" / "`), deduplica por URL entre todas las fuentes, y escribe el resultado en `outputPath`. |
| `tools/configurar_marcadores.html` | Página autocontenida (sin dependencias) para generar `marcadores_config.json` con un formulario, en vez de escribirlo a mano. Incluye una tabla de referencia con las rutas típicas de `Bookmarks` por sistema operativo y navegador. |
| `tools/marcadores_config.example.json` | Plantilla de ejemplo del archivo de configuración anterior, con rutas ficticias. `marcadores_config.json` (el real, con rutas de tu máquina) no se versiona. |
| `examples/ejemplo-enlaces.json` | Enlaces de muestra (genéricos, no personales) cargables con "Importar" para ver la app con contenido. |
| `docs/ESPECIFICACIONES.md` | Este documento. |
| `README.md` | Instrucciones de instalación y configuración de la app y la extensión. |
| `LICENSE` | Licencia MIT. |

## 10. Compatibilidad y limitaciones conocidas

- Requiere un navegador moderno con soporte de `localStorage`, `<dialog>`-like overlays manuales, `Set`, `Array.prototype.find`/`findIndex`, plantillas de cadena no usadas (se usa concatenación `+` deliberadamente por compatibilidad ES5-friendly).
- No hay sincronización entre dispositivos/navegadores: cada `localStorage` es local a un perfil de navegador en una máquina. Exportar/Importar es el mecanismo manual de respaldo/traslado.
- No hay límite de enlaces impuesto por la app; el límite real es la cuota de `localStorage` del navegador (habitualmente 5-10 MB).
- El borrado en el modal de gestión, y el título de la página, siguen usando `confirm()`/`prompt()` nativos del navegador (el renombrado de categorías/etiquetas ya es inline — ver decisión 10 de la sección 7).
- El arrastrar y soltar usa la API nativa HTML5 Drag and Drop, pensada para ratón — en pantallas táctiles el reordenamiento solo es posible con los botones ▲/▼ (que si funcionan por toque).
- El selector de color es el `<input type="color">` nativo del navegador (su aspecto exacto varía entre Windows/Chrome/Edge/Firefox); no hay una paleta predefinida propia de la app.
- **Los favicons requieren internet y pasan por un tercero**: al mostrarse vía `google.com/s2/favicons`, cada dominio visible en tu lista de enlaces se envía a Google en cada carga de página (igual que hace cualquier navegador al mostrar el favicon de una pestaña, pero de forma explícita para *todos* los enlaces guardados a la vez, no solo el que estés visitando). Sin conexión, los enlaces se ven igualmente pero sin icono. Si esto es un problema, se puede sustituir `faviconUrl()` por una llamada directa a `https://<dominio>/favicon.ico` (menos fiable, pero sin intermediario).
- Diseño responsive básico: por debajo de 780px el sidebar pasa a estar apilado sobre el contenido y las etiquetas de la vista compacta se ocultan para ahorrar espacio.

## 11. Ideas para futuras ampliaciones (no implementadas)

Todas las ideas que figuraban aquí en rondas anteriores (multi-selección de etiquetas, plegado de categorías, edición inline, detección de duplicados, importación con fusión, reordenación manual, arrastrar y soltar, colores personalizados, atajos de teclado, plegar/expandir todo, y favicon por enlace) se implementaron — ver secciones 4.2 a 4.12 y las decisiones de la sección 7. Ideas nuevas pendientes, sin implementar todavía:

- Soporte táctil para el arrastrar y soltar (más allá de los botones ▲/▼, que ya funcionan por toque).
- Paleta de colores predefinida para elegir rápido, en vez de (o adicional a) el selector nativo.
- Más atajos de teclado: navegar entre enlaces con flechas, `Ctrl+E`/`Ctrl+D` para exportar/borrar, etc.
- Progressive Web App (manifest + service worker) para poder "instalar" la página y usarla offline como una app independiente.
- Reordenar las secciones del sidebar: actualmente es Nuevo enlace → Categorías → Etiquetas → Vistas → Exportar/Importar → créditos. Cambiar a Nuevo enlace → Categorías → **Vistas** → Etiquetas → Exportar/Importar → créditos (Vistas pasa a ir justo después de Categorías, antes de Etiquetas).
