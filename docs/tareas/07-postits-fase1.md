# Tarea 07 — Post-its en la página del enlace (fase 1)

**Prioridad**: Alta · **Esfuerzo estimado**: ~150 líneas en la extensión + un método en el puente · **Riesgo**: medio — código que se inyecta en páginas de terceros

Antes de empezar, lee [`CLAUDE.md`](../../CLAUDE.md), el análisis de las dos fases en la **sección 11.4** de [`ESPECIFICACIONES.md`](../ESPECIFICACIONES.md) y la funcionalidad de notas en su **sección 4.23**, que es el campo del que esta depende y **ya está implementada**.

## Objetivo

Que al volver a una página sobre la que anotaste algo, **esas notas vuelvan a aparecer** sin tener que abrir PinBoard.

Fase 1 significa: un panel plegable en una esquina, **sin anclar a ningún punto del contenido**. Eso lo hace inmune a los tres problemas que hunden la versión anclada (maquetación cambiante, contenido dinámico, SPA) y **no añade modelo de datos**: son las mismas notas de 4.23 en una segunda superficie.

## Requisito previo

**Cumplido**: el campo `notes` existe (4.23), con su formato por bloques con fecha, su indicador en las fichas y `appendNote` en el puente. La extensión ya declara `contextMenus` y ya tiene dos entradas de menú, así que sumar la tercera de esta tarea no cambia nada estructural.

---

## R0 — El disparador del panel

**Hay que decidirlo antes de escribir código.**

Estado actual: la tarea de notas **no implementó el popup**, precisamente porque declarar un `default_popup` **desactiva `chrome.action.onClicked`** y eso habría cambiado el comportamiento del flujo de siempre (pulsar el icono guarda la página). Así que hoy `chrome.action.onClicked` sigue ocupado por ese flujo, no por un popup.

División de responsabilidades, para cuando el popup exista:

| Superficie | Para qué | Por qué |
|---|---|---|
| **Popup** (si algún día se añade) | Escribir una nota, ver si la página está guardada | Transaccional: se abre, se hace algo, se cierra |
| **Panel en la página** (esta tarea) | Leer tus notas mientras lees la página | Persistente: sigue ahí mientras te desplazas y lees |

Esa es la justificación real del panel frente al popup, y conviene tenerla clara: **un popup se cierra en cuanto pulsas fuera**, lo que lo hace inservible como acompañante de lectura. El panel se queda.

**R0.1 — Disparadores del panel:**
- Una entrada de menú contextual, *"Ver mis notas de esta página"* (contexto `page`), junto a las dos que ya existen. **Este es el camino obligatorio**, y funciona exista o no el popup.
- **No uses `chrome.action.onClicked`**: hoy está ocupado por "guardar la página", que es comportamiento existente y no se puede cambiar sin más.
- Si en el futuro se añade el popup, además un botón dentro de él: *"Mostrar notas en la página"*.

---

## R1 — Leer las notas: método nuevo en el puente

**R1.1** `PinBoardBridge.getNotes(url)` → `{ id, title, category, notes }` o `null` si esa URL no está guardada.

**R1.2 — No modifiques `checkDuplicate`.** Devuelve hoy `{id, title, category}` y forma parte del contrato estable de la sección 8; cambiar su forma afectaría a código que ya funciona. Añade un método nuevo.

**R1.3 — La extensión nunca normaliza URLs por su cuenta.** Pasa la URL cruda y **la página decide** si coincide, reutilizando `normalizeUrlForCompare` / `findDuplicateUrl`. Si la extensión implementara su propia comparación, acabaría divergiendo de la de PinBoard y habría casos en los que una detecta el enlace y la otra no.

**R1.4** Para obtener las notas, el `background` usa el camino que ya existe: `findOrOpenPinboardTab()` (que abre la pestaña en segundo plano con `active:false` si no está abierta) y `chrome.scripting.executeScript` en el mundo `MAIN`, como `callBridge` (`background.js:53-73`). Si no hay URL de PinBoard configurada, abre la página de opciones, igual que hoy.

**R1.5 — Actualizar la sección 8** con `getNotes`: tabla y paso de checklist.

---

## R2 — El panel

**R2.1 — Aislamiento obligatorio con shadow DOM.** El panel se inyecta en páginas de terceros: sin shadow DOM, el CSS del sitio anfitrión deforma el panel y el CSS del panel puede alterar el sitio. Es la diferencia entre una función que funciona en cualquier web y una que funciona en algunas.

**R2.2 — Inserta el CSS con `chrome.scripting.insertCSS`, no con una etiqueta `<style>` en la página.** Los estilos inyectados así van con el origen de la extensión y **no los bloquea la CSP del sitio**; un `<style>` inline sí puede quedar bloqueado en sitios con política estricta, y el panel aparecería sin formato justo en las webs más serias.

**R2.3 — Posición y comportamiento**: `position: fixed` en una esquina, con un `z-index` alto, plegable y con botón de cierre. Que no tape contenido esencial ni impida desplazarse por la página.

**R2.4 — Contenido**: título del enlace, su categoría, y las notas. Fase 1 muestra el Markdown **como texto plano** con `white-space: pre-wrap`, igual que hace PinBoard con el campo de notas (4.23).

**Esto ya existe dentro de PinBoard**: el visor de notas (`#notesViewerOverlay`, decisión 37) muestra exactamente eso — título, categoría y dominio arriba, el texto debajo con `pre-wrap` y metido con `textContent`. **Míralo antes de diseñar el panel y parécete a él**: no se puede compartir el código (son dos entornos), pero sí el criterio y el aspecto, y así el día que se renderice el Markdown (fase 2) se hace en los dos sitios con la misma regla. La técnica de inyección también está resuelta: el aviso efímero de la extensión (`showPageToast`, decisión 36) ya usa shadow DOM cerrado con `activeTab` y sin permisos nuevos; el panel es lo mismo con contenido persistente.

**R2.5 — Construye el contenido con `textContent`, nunca con `innerHTML`.** Las notas pueden contener HTML porque a menudo *proceden* de selecciones de páginas web. Usando `textContent` la seguridad es estructural y no depende de acordarse de escapar.

**R2.6 — El segundo disparo cierra el panel** (comportamiento de alternancia). Si ya está inyectado, se quita en vez de duplicarse.

**R2.7 — Si la página está guardada pero no tiene notas**, el panel lo dice y ofrece añadir una, en lugar de aparecer vacío. Si la página **no** está en PinBoard, el panel lo indica y ofrece guardarla.

**R2.8 — No toques nada del documento anfitrión** más allá de añadir tu propio nodo: ni estilos de `body`, ni listeners globales de teclado, ni la posición del desplazamiento. Al cerrar el panel, la página debe quedar exactamente como estaba.

---

## R3 — El badge: la parte que da la "magia" (y la que introduce una caché)

Sin esto, el panel es un visor que hay que ir a abrir. Con esto, **ves pasivamente que en esta página tienes algo anotado**, que es lo que se pedía.

**R3.1** El badge del icono muestra el número de notas de la página activa, **por pestaña** (`chrome.action.setBadgeText({text, tabId})`), actualizado al cambiar de pestaña y al navegar.

**R3.2 — El problema de fondo, y su límite.** Para saber si la página activa tiene notas **sin que PinBoard esté abierto**, la extensión necesita una copia local. Eso obliga a `chrome.storage`, que es exactamente el "segundo almacén" del que advierte 11.4.

Lo que hace admisible esta versión, y **es una restricción, no un detalle**:

- Es una **proyección de solo lectura**: un mapa compacto `URL normalizada → número de notas`, nada más. **Sin texto de notas.**
- **Dirección única**: PinBoard escribe, la extensión lee. **Nunca al revés.** No hay cola de escrituras pendientes ni resolución de conflictos, que es lo que convertiría esto en un sistema de dos orígenes de verdad.
- Es **descartable**: se puede borrar en cualquier momento sin perder nada. El único origen de verdad sigue siendo el `localStorage` de `pinboard.html`.

**R3.3** La proyección se refresca cuando la extensión ya está hablando con una pestaña de PinBoard (al pulsar el icono, al guardar un enlace, al añadir una nota). **No abras una pestaña de PinBoard solo para refrescar el badge**: eso sería abrir pestañas a espaldas del usuario.

**R3.4 — Ante la duda, no mostrar nada.** Si la proyección no existe o está vacía, el badge se queda en blanco. Un badge obsoleto que diga "2" donde no hay notas es peor que ningún badge: enseña al usuario a desconfiar de la señal. Documenta que puede ir con retraso hasta el siguiente contacto con PinBoard.

**R3.5** Necesita el permiso **`tabs`** para leer la URL de la pestaña activa al cambiar de pestaña. Es el único permiso nuevo de esta tarea. **Sigue sin hacer falta `<all_urls>`**, que es el que pediría *"leer y cambiar todos tus datos en todos los sitios web"* en la instalación.

**R3.6** R3 es **separable**: si se decide dejarlo para después, R0-R2 entregan el panel funcionando y esta tarea sigue teniendo sentido. Pero entonces hay que decirlo explícitamente, porque es la mitad del valor.

---

## Fuera de alcance (esto es fase 2)

- **Anclar el post-it a un punto del contenido.** Es el problema difícil: por coordenadas se rompe al cambiar la maquetación o el ancho; por selector o por texto se rompe al cambiar el contenido; en una SPA se rompe al navegar.
- **Varias notas independientes por página**, con posición, color o identidad propia.
- **Escribir desde el panel de vuelta a `chrome.storage`** con cola de pendientes. La dirección sigue siendo única (R3.2).
- **Content script sobre `<all_urls>`** para que el panel aparezca solo, sin ningún clic.
- Detectar cambios de ruta en SPAs o de fragmento (`#`) para reevaluar la página.
- Sincronizar entre navegadores o equipos.

## Invariantes: no toques esto

1. **El flujo actual de la extensión debe seguir igual**: guardar la pestaña activa, detectar duplicados y resaltar la ficha existente. Esta tarea añade superficies, no cambia las que hay.
2. **El único origen de verdad sigue siendo `localStorage` de `pinboard.html`.** Si esta tarea termina con notas guardadas en `chrome.storage`, se ha implementado otra cosa distinta y se ha entrado en fase 2 por la puerta de atrás.
3. **Nada de `<all_urls>`.** Si te encuentras necesitándolo, has salido del alcance: replantea el disparador.
4. **El código inyectado no puede romper la página anfitriona** (R2.1, R2.2, R2.8). Se prueba en sitios reales, no solo en una página de prueba.
5. `getNotes` amplía la superficie protegida de la sección 8: hay que documentarlo (R1.5).
6. JavaScript moderno en `extension/`; sintaxis ES5 solo en `pinboard.html`.

## Checklist de verificación manual

**El panel:**

- [ ] En una página **guardada y con notas**, el disparador muestra el panel con el título, la categoría y las notas.
- [ ] Los saltos de línea de las notas se conservan.
- [ ] Disparar otra vez **cierra** el panel; no aparecen dos.
- [ ] Cerrar el panel deja la página **exactamente** como estaba: sin saltos de desplazamiento ni estilos alterados.
- [ ] En una página guardada **sin** notas, el panel lo dice y ofrece añadir una.
- [ ] En una página **no guardada**, el panel lo dice y ofrece guardarla.
- [ ] Con PinBoard **cerrado**, el panel funciona igual (abre la pestaña en segundo plano y la usa).
- [ ] Sin URL de PinBoard configurada, se abre la página de opciones.

**Aislamiento — pruébalo en sitios reales, no en una página de prueba:**

- [ ] Probado en al menos **cuatro sitios muy distintos**, incluyendo uno con CSS agresivo (un periódico o una tienda) y uno con **CSP estricta** (GitHub sirve bien para esto): el panel se ve con su formato correcto en todos.
- [ ] El panel no descoloca la maquetación del sitio ni tapa su navegación.
- [ ] Una nota que contenga `<script>alert(1)</script>`, `<img onerror=...>` o HTML completo se muestra **como texto literal** y no ejecuta nada.
- [ ] Una nota muy larga: el panel se desplaza por dentro, no crece sin límite.

**El badge:**

- [ ] Con la proyección al día, al cambiar a una pestaña de una página con notas el badge muestra el número.
- [ ] Al cambiar a una pestaña sin notas, el badge **se limpia** (no arrastra el número de la pestaña anterior).
- [ ] Con la proyección vacía o recién instalada la extensión, el badge está en blanco y **nada falla**.
- [ ] Añadir una nota y volver a la página: el badge refleja el cambio tras el siguiente contacto con PinBoard.
- [ ] **La extensión no abre pestañas de PinBoard por su cuenta** solo por navegar entre pestañas.

**Regresiones:**

- [ ] Recargar la extensión tras añadir el permiso `tabs`.
- [ ] Pulsar el icono en una URL nueva: sigue funcionando el flujo de guardar.
- [ ] Pulsar el icono en una URL ya guardada: sigue resaltando la ficha.
- [ ] La captura de selección como nota (4.23) y "Guardar en PinBoard" del menú contextual siguen funcionando.
- [ ] **Checklist completa de la sección 8.**

## Al cerrar

- `ESPECIFICACIONES.md`: la nueva superficie en la sección 4, **`getNotes` en la tabla de la sección 8** con su paso de checklist, y en la 7 la decisión de R3.2 (por qué una proyección de solo lectura es admisible y en qué se diferencia de un segundo origen de verdad).
- **Reescribir 11.4** con lo realmente implementado, y dejar la fase 2 con lo que quede pendiente y su valoración actualizada. **Ahí se decide si la fase 2 se prioriza o no**, y el criterio ya estaba fijado: solo si la fase 1 demuestra que la función se usa de verdad.
- **Quitar la entrada del backlog** (11.1).
- `CHANGELOG.md` y subida de versión del `manifest.json`, que cambia permisos y comportamiento.
- El `README.md` describe la extensión: hay que añadir el panel y el badge, y **mencionar el permiso `tabs` y por qué se pide**. Quien instala una extensión descomprimida ve la lista de permisos y merece saber a qué corresponde.
