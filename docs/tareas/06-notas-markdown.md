# Tarea 06 — Notas Markdown por enlace, capturadas desde la página

**Prioridad**: Alta · **Esfuerzo estimado**: ~200 líneas entre la página y la extensión · **Riesgo**: alto — campo nuevo en el modelo de datos, cambio en el contrato de la sección 8, y toca las fichas

Antes de empezar, lee [`CLAUDE.md`](../../CLAUDE.md), los requisitos funcionales de la **sección 11.3** de [`ESPECIFICACIONES.md`](../ESPECIFICACIONES.md) y el contrato de la **sección 8**.

Este documento no repite los requisitos funcionales de 11.3: los da por leídos y añade las decisiones de implementación, los invariantes y la verificación.

## Objetivo

Que un enlace guarde **lo que el usuario sabe o piensa sobre él**, y que anotar sea posible desde la página que se está leyendo, no solo desde PinBoard.

El valor no está en el Markdown: está en que la búsqueda encuentre un enlace por algo que tú escribiste sobre él.

---

## R1 — El campo `notes`: los cinco sitios

**Verificado en el código**: hay **cinco lugares** que enumeran los campos de un enlace uno por uno. Si falta el campo nuevo en cualquiera de ellos, se pierde en silencio. Ninguno da error.

| Lugar | Ubicación | Qué pasa si falta |
|---|---|---|
| `submit` del formulario, rama de **edición** | `:1674` (`if(editingId)`) | Editar las notas y guardar **no las guarda**: se escriben, se pulsa Guardar y desaparecen |
| `submit` del formulario, rama de **creación** | `:1674` (`state.links.push`) | Un enlace nuevo nunca puede nacer con notas |
| `duplicateEditingLink` | `:1616-1630` | Duplicar un enlace pierde sus notas |
| `performImportMerge` | `:2564-2572` | Importar fusionando pierde las notas del archivo |
| `performImportReplace` | `:2532-2542` | Importar sustituyendo pierde todas las notas |

La exportación no necesita cambios: usa `JSON.stringify` sobre el objeto completo (`:2514`).

**R1.1** `notes` es un string opcional. `undefined` y `""` se tratan igual. No hace falta escribir el campo en los enlaces que no tienen notas.

**R1.2** Retrocompatible sin migración: los enlaces ya guardados no lo tienen y deben seguir funcionando sin tocarlos.

---

## R2 — Interfaz en PinBoard

**R2.1 — `<textarea id="fieldNotes">` en el modal**, situado **después del campo de Etiquetas y antes de la casilla "Activo"**. Alto moderado (4-5 filas) y redimensionable en vertical. Va al final porque es el único campo que puede crecer mucho, y así no empuja al resto fuera de la vista.

**R2.2 — Indicador en las fichas.** Las fichas con notas muestran 📝 en **los dos modos de vista**. No es un adorno: es la única forma de saber que ahí hay algo escrito sin abrir el modal.

**R2.3 — El indicador es un botón que abre el modal con el foco en las notas.** Usa el patrón de delegación que ya existe (`data-action` + `data-id` en el listener de `#linksContainer`, `:2239`), con su propia acción. Abrir directamente donde está el contenido ahorra el paso de buscar el campo.

**R2.4 — La nota no se pinta en la ficha.** Puede tener cientos de líneas: reventaría la cuadrícula. La ficha solo indica que existe.

**R2.5 — Fase 1: texto plano.** Las notas se guardan en Markdown y se muestran **tal cual**, con `escapeHtml()` y `white-space: pre-wrap` para conservar los saltos de línea. Son para leerlas uno mismo; ahí el Markdown es una convención de escritura, no un formato de salida. El mini-renderizador es otra tarea del backlog (prioridad media) y **solo** si el uso real lo pide.

---

## R3 — Formato y acumulación

**R3.1** Las notas **se añaden al final, nunca se sobrescriben**.

**R3.2** Cada anotación entra como un bloque con encabezado de fecha:

```
## 12/08/2026

texto de la nota
```

**R3.3** Una captura de selección entra como cita:

```
## 12/08/2026

> el texto que estaba seleccionado
```

**R3.4** Siempre se añade un bloque nuevo, aunque ya exista uno con la fecha de hoy. Es predecible y el usuario puede reorganizar a mano.

**R3.5** Línea en blanco de separación entre bloques, y sin espacios en blanco sobrantes al final del campo.

---

## R4 — La extensión: menús contextuales

El `manifest.json` actual declara `activeTab`, `scripting` y `storage`, con `host_permissions` a `file:///*`.

**R4.1** Añadir el permiso **`contextMenus`** al manifest. Es el único permiso nuevo que necesita esta tarea: **no hace falta `<all_urls>` ni `tabs`**.

**R4.2** Dos entradas de menú contextual, creadas en `chrome.runtime.onInstalled`:

| Entrada | Contexto | Acción |
|---|---|---|
| "Guardar en PinBoard" | `page` | Lo mismo que hace hoy pulsar el icono |
| "Añadir selección como nota en PinBoard" | `selection` | Captura `info.selectionText` como cita (R3.3) |

**R4.3** El flujo actual de `chrome.action.onClicked` (`background.js:81-105`) **no cambia**. Reorganiza lo que haga falta para compartir código entre él y los menús, pero su comportamiento observable debe ser idéntico.

**R4.4 — Estilo del código de la extensión: JavaScript moderno.** `const`, `async`/`await`, funciones flecha, como el resto de `background.js`. La regla de sintaxis ES5 es solo para `pinboard.html`.

---

## R5 — El puente: `appendNote`, y la decisión de cuándo pedir confirmación

**R5.1** Método nuevo `PinBoardBridge.appendNote({url, note, title, description})`. Devuelve un resultado que `background.js` pueda interpretar, al estilo de lo que ya hace `callBridge`.

**R5.2 — Comportamiento según exista o no el enlace, y esta es la decisión de diseño de la tarea:**

- **Si la URL ya existe** → **añade la nota directamente**, sin modal. Guarda, repinta y resalta la ficha con `highlightLink()`. Es una operación aditiva sobre un enlace que el usuario ya curó: no destruye nada y pedir confirmación sería fricción sin ganancia.
- **Si la URL no existe** → **abre el modal precargado**, con la nota ya puesta en `#fieldNotes` y la categoría sugerida por `suggestCategory()`. El usuario confirma con "Guardar", igual que en `prefillAndOpen`.

La asimetría es deliberada y sigue el criterio que ya estableció `prefillAndOpen`: *crear* un enlace pasa por que el usuario confirme —porque la categoría es una heurística y puede fallar—, mientras que *añadir* a algo existente no necesita ceremonia.

**R5.3 — Al añadir a un enlace existente, no robes el foco al usuario.** El flujo actual siempre activa la pestaña de PinBoard y enfoca su ventana (`background.js:93-95`). Para un añadido silencioso eso es intrusivo: el usuario está leyendo una página y quiere seguir. Confirma con el **badge del icono** (`flashBadge`, que ya existe, con un ✓ y un color de éxito) y **deja la pestaña activa donde está**.

Cuando hay que abrir el modal (enlace nuevo) sí se salta a la pestaña de PinBoard, porque hace falta que el usuario actúe.

**R5.4 — Actualizar la sección 8.** `appendNote` pasa a formar parte de la superficie protegida: añádelo a la tabla, con su firma y para qué lo usa la extensión, y añade su paso a la checklist de verificación manual de esa sección.

---

## R6 — Escribir una nota a mano desde la página (popup)

Sin esto, desde la página solo se pueden capturar selecciones, y el objetivo era *tomar notas*.

**R6.1** Un `popup` en la acción de la extensión con un `<textarea>` y un botón de guardar, que llame al mismo `appendNote` que los menús.

**R6.2** El popup debe indicar si la URL actual **ya está en PinBoard** (usando `checkDuplicate` a través del puente) para que el usuario sepa si va a anotar sobre un enlace existente o a crear uno nuevo.

**R6.3 — Cuidado con la regresión aquí**: declarar un `default_popup` **desactiva `chrome.action.onClicked`**, que es el disparador de todo el flujo actual. Si añades popup, el "Guardar en PinBoard" de siempre tiene que seguir accesible desde el propio popup o desde el menú contextual de R4.2. **Comprobar expresamente que el flujo original sigue existiendo.**

Si el popup complica demasiado, es la parte separable de esta tarea: R1-R5 ya entregan valor completo con la captura de selección, y el popup puede ir después. Pero entonces hay que decirlo, no dejarlo a medias sin avisar.

---

## R7 — Búsqueda

**R7.1** `getFilteredLinks()` debe incluir `notes` en el texto donde busca (hoy concatena título, descripción y etiquetas en `:1121`). Es una línea y es la mitad del valor de la función.

**R7.2 — Coordinación con la tarea 05** (búsqueda con operadores), que reestructura ese mismo texto:
- Si la 05 ya está hecha, añade `notes` a su texto de búsqueda **y** el operador `note:`, que esa tarea dejó preparado a propósito.
- Si no lo está, añade `notes` al texto actual sin más, y la 05 lo encontrará ya integrado.

---

## Fuera de alcance

- **Renderizar el Markdown**: otra tarea del backlog (R2.5).
- **Post-its sobre la página del enlace**: es la tarea siguiente, encadenada a esta (análisis en 11.4). Esta tarea no debe adelantar nada de ella, en particular **nada de guardar notas en `chrome.storage`**: aquí el único almacén sigue siendo `localStorage` de `pinboard.html`.
- Notas por categoría o por etiqueta: las notas son por enlace.
- Adjuntar imágenes o archivos a una nota.
- Historial o versiones de una nota.

## Invariantes: no toques esto

1. **Los cinco sitios de R1.** Es el requisito con más probabilidad de quedarse a medias y el único cuyo incumplimiento **destruye datos del usuario en silencio**. El más traicionero es la rama de edición del `submit`: si falta ahí, el campo aparece en el modal, se puede escribir en él, se pulsa Guardar y el texto se evapora sin ningún error.
2. **El contrato de la sección 8.** Esta tarea toca las fichas (indicador de R2.2), así que hay que conservar las clases `.link-card` / `.link-card-compact` y el atributo `data-id` en el elemento raíz, y **pasar la checklist completa de esa sección**. También amplía el puente, así que la tabla se queda desactualizada si no se toca (R5.4).
3. **El flujo actual de la extensión debe seguir funcionando igual**: pulsar el icono con una URL nueva abre el modal precargado; con una URL ya guardada, resalta la ficha existente.
4. **`escapeHtml()` sobre el contenido de las notas** en cualquier sitio donde se pinte. El texto viene de páginas web arbitrarias: una selección puede contener `<`, `&`, comillas o HTML completo. Es la entrada menos confiable que ha tenido nunca esta app.
5. `openModal()` debe rellenar `#fieldNotes` al editar y **vaciarlo al crear**, como hace con el resto de campos. Un campo que arrastra el valor del enlace anterior es un error clásico en ese patrón.
6. Sintaxis ES5 en `pinboard.html`; JavaScript moderno en `extension/`.

## Checklist de verificación manual

**Pérdida de datos — hazlo primero:**

- [ ] Escribir una nota en un enlace, guardar, **cerrar y reabrir el modal**: la nota sigue ahí.
- [ ] Recargar la página: la nota sigue ahí.
- [ ] **Duplicar** un enlace con notas: la copia las conserva.
- [ ] **Exportar** e inspeccionar el JSON: el campo `notes` aparece.
- [ ] **Importar fusionando** ese archivo en un PinBoard vacío: las notas llegan.
- [ ] **Importar sustituyendo**: las notas llegan.
- [ ] Editar cualquier otro campo de un enlace con notas y guardar: **las notas no se borran**.
- [ ] Crear un enlace nuevo desde el modal escribiendo notas: se guardan.
- [ ] Abrir el modal para crear un enlace nuevo justo después de editar uno con notas: **el campo está vacío**.

**Interfaz:**

- [ ] El indicador 📝 aparece solo en las fichas con notas, en **los dos modos de vista**.
- [ ] Pulsarlo abre el modal de ese enlace con el foco en las notas.
- [ ] Una nota de 200 líneas no descuadra la ficha ni la cuadrícula.
- [ ] Los saltos de línea se conservan al reabrir el modal.

**Extensión:**

- [ ] Recargar la extensión tras añadir el permiso `contextMenus` (los permisos nuevos exigen recarga).
- [ ] Seleccionar texto en una página **ya guardada** → menú contextual → la nota se añade a ese enlace, **sin cambiar de pestaña**, y el badge confirma.
- [ ] Volver a PinBoard: la nota está, como cita, con la fecha de hoy.
- [ ] Repetir en la misma página: se añade un **segundo** bloque, sin borrar el primero.
- [ ] Seleccionar texto en una página **no guardada** → se abre PinBoard con el modal precargado y la nota puesta; al guardar, el enlace nace con ella.
- [ ] Seleccionar un texto que contenga `<script>alert(1)</script>` o `&`: se guarda literal y se ve literal, sin ejecutarse.
- [ ] Seleccionar un texto muy largo (varios párrafos): no rompe nada.
- [ ] **Regresión**: pulsar el icono de la extensión en una URL nueva sigue abriendo el modal precargado.
- [ ] **Regresión**: pulsar el icono en una URL ya guardada sigue resaltando su ficha.
- [ ] Si se implementó el popup: el flujo de "Guardar en PinBoard" **sigue estando accesible** (R6.3).
- [ ] **Checklist completa de la sección 8**, pasos 1 a 3.

**Búsqueda:**

- [ ] Buscar una palabra que solo aparece en las notas de un enlace: lo encuentra.
- [ ] Si la tarea 05 ya está hecha, `note:palabra` funciona.

## Al cerrar

- `ESPECIFICACIONES.md`: nueva subsección en la 4, el campo `notes` en la tabla del modelo de datos de la **sección 3**, las funciones nuevas en la 6, **`appendNote` en la tabla de la sección 8 y su paso en la checklist**, la decisión de R5.2 (por qué añadir es silencioso y crear pide confirmación) en la 7, y **quitar la entrada del backlog** (11.1).
- Actualizar 11.3 para reflejar lo realmente implementado, y **11.4**, porque la fase 1 de los post-its depende de este campo.
- `CHANGELOG.md`: entrada de cambio funcional, mencionando que el formato de datos gana un campo opcional.
- La versión del `manifest.json` de la extensión sube, porque cambia su comportamiento y sus permisos.
