# Tarea 02 — Selección múltiple de enlaces y acciones en lote

**Prioridad**: Muy alta · **Esfuerzo estimado**: medio · **Riesgo**: **alto** — toca las fichas de enlace, que son superficie protegida y comparten elementos con el arrastrar y soltar

Antes de empezar, lee [`CLAUDE.md`](../../CLAUDE.md) y la **sección 8** de [`ESPECIFICACIONES.md`](../ESPECIFICACIONES.md) (contrato con la extensión).

## Objetivo

Hoy toda operación es de uno en uno: poner una etiqueta a treinta enlaces son treinta viajes al modal de edición. Es el cuello de botella que crece con el tamaño de la colección.

Esta tarea añade un **modo selección** y una barra de acciones sobre lo seleccionado. No necesita ningún cambio en el modelo de datos.

---

## Decisiones de diseño ya tomadas

No son sugerencias: son parte de los requisitos. Están decididas porque cada una cierra una ambigüedad que, resuelta de otra forma, produce conflictos con funciones que ya existen.

**D1. La selección no se persiste.** `state.selectedLinks` es un `Set` de ids que vive solo en memoria, como `state.tags`. No se guarda en `localStorage`: recuperar al abrir la app una selección hecha ayer es desconcertante y peligroso.

**D2. En modo selección, el arrastrar y soltar se desactiva.** Arrastrar una ficha mientras se seleccionan fichas es ambiguo, y el drag & drop actual (`pinboard.html:2279-2330`) reordena y cambia de categoría. Las fichas pasan a `draggable="false"` mientras el modo esté activo.

**D3. En modo selección, un clic en cualquier parte de la ficha alterna su selección**, y el enlace `<a>` del título **no navega** (`preventDefault()`). Seleccionar solo desde una casilla diminuta hace inservible el trabajo en lote, que es justo el propósito de la tarea.

**D4. Cambiar de filtro, de búsqueda o de vista vacía la selección.** Igual que la exportación pide confirmación cuando hay un filtro activo (decisión 9 de la sección 7), aquí la precaución es la misma y más estricta: **nunca se debe poder aplicar una acción en lote a enlaces que el usuario no está viendo.** Vaciar la selección al cambiar lo que se ve elimina esa clase de error por completo.

**D5. Tras una acción en lote, la selección se conserva** —para poder encadenar varias sobre el mismo conjunto— **excepto al borrar**, donde necesariamente se vacía.

**D6. Los diálogos de las acciones usan `prompt()` / `confirm()` nativos.** Coherente con la decisión 10 de la sección 7: el modal nativo es la opción más simple para acciones puntuales de una línea. El editor de chips de etiquetas (4.20) queda como posible mejora posterior, no en esta tarea.

---

## Requisitos

### Entrada y salida del modo

**R1.** Botón nuevo en la barra de herramientas (junto a `#btnToggleAllGroups`, `pinboard.html:740`) que activa y desactiva el modo selección. Su etiqueta refleja el estado. Con `title`, como todo control nuevo.

**R2.** Con el modo activo, `#linksContainer` (o `.app`) lleva una clase que permite al CSS mostrar las casillas y marcar visualmente las fichas seleccionadas. Al desactivarlo, la selección se vacía y las fichas vuelven **exactamente** a su comportamiento anterior.

### Selección

**R3.** Cada ficha muestra una casilla de selección en ambos modos de vista (`cardHtml` y `cardHtmlCompact`). La ficha seleccionada se distingue visualmente además de por la casilla.

**R4.** Clic en cualquier zona de la ficha alterna su selección (D3). Los botones de acción existentes de la ficha —▲ ▼ ✏️ 🗑️— **no seleccionan**: o siguen funcionando con normalidad, o se ocultan mientras el modo esté activo. Elige una de las dos y sé consistente entre las dos vistas.

**R5.** La selección se gestiona en el listener delegado que ya existe en `#linksContainer` (`pinboard.html:2239`), respetando su estructura de `closest()` + `data-action`. No añadas listeners por ficha.

### Barra de acciones

**R6.** Aparece solo cuando hay al menos un enlace seleccionado, e indica **cuántos** hay.

**R7.** Acciones, todas sobre los enlaces de `state.selectedLinks`:

| Acción | Comportamiento |
|---|---|
| Añadir etiqueta | Pide la etiqueta y la añade a los seleccionados que no la tengan. Pasa por `ensureTag()` y respeta la normalización de `normalizeTags()`. |
| Quitar etiqueta | Pide la etiqueta y la quita de los seleccionados que la tengan. No la borra de la lista maestra. |
| Cambiar categoría | Pide la categoría y la asigna. Pasa por `ensureCategory()`, que la crea si no existía. |
| Activar / Desactivar | Fija `active` a `true` / `false`. |
| Eliminar | `confirm()` **con el recuento explícito**, y solo entonces borra. |

**R8.** Toda acción termina en `save()` + `render()` (más `saveAllTags()` / `saveCategories()` si tocó las listas maestras). Nunca modifiques el DOM a mano para reflejar el resultado.

**R9.** Una acción en lote es **una sola** operación de guardado, no una por enlace: recorre la selección, muta `state.links`, y guarda al final.

---

## Fuera de alcance

- Selección por rango con Mayús+clic.
- "Seleccionar todos los visibles" (evaluable después, pero fuera de esta entrega).
- Sustituir los `prompt()` por modales con el editor de chips (D6).
- Mover en lote a otra posición del orden manual: eso es lo que hace el arrastre, y no se toca.
- La papelera con deshacer: está en el backlog con prioridad muy baja y es una tarea aparte. **El borrado en lote sigue siendo irreversible**, con su `confirm()`.

## Invariantes: lo que se rompe en silencio

1. **Contrato con la extensión (sección 8).** El elemento raíz de cada ficha debe conservar su clase `.link-card` / `.link-card-compact` **y** su atributo `data-id`: `highlightLink()` los usa para localizar y resaltar una ficha, y si no los encuentra la extensión falla sin ningún error visible. Añade la casilla **dentro** de la ficha, sin envolverla en un contenedor nuevo que desplace la raíz.
2. **El arrastrar y soltar debe seguir intacto fuera del modo selección**: reordenar dentro de la categoría, mover a otra categoría soltando sobre otra ficha, y soltar sobre una cabecera de grupo o sobre un grupo plegado.
3. **Los botones ▲/▼ dependen de `prevId`/`nextId` calculados por grupo filtrado** en `renderCards()` (`pinboard.html:1381-1385`). No alteres ese cálculo ni el orden de `state.links`.
4. **No introduzcas ningún `.sort()`** sobre `state.links`: su posición en el array es el orden manual del usuario.
5. `escapeHtml()` en cualquier dato que entre en el HTML nuevo, incluidos los atributos.
6. Sintaxis ES5: `var`, `function`, concatenación. Ver `CLAUDE.md`.

## Checklist de verificación manual

**Regresiones (lo más importante de esta tarea):**

- [ ] Fuera del modo selección, arrastrar una ficha sobre otra la reordena.
- [ ] Fuera del modo selección, arrastrar una ficha a otra categoría cambia su categoría.
- [ ] Soltar sobre una cabecera de grupo y sobre un grupo **plegado** sigue funcionando.
- [ ] Los botones ▲/▼ siguen moviendo un puesto dentro del grupo filtrado.
- [ ] Clic en el título de un enlace sigue abriéndolo en una pestaña nueva.
- [ ] ✏️ y 🗑️ siguen funcionando como antes.
- [ ] **Checklist de la sección 8 completa** (pasos 1 a 3): la extensión detecta un duplicado, resalta la ficha existente y precarga el modal.

**Funcionalidad nueva:**

- [ ] Al activar el modo, aparecen las casillas; al desactivarlo, desaparecen y la selección se vacía.
- [ ] En modo selección, arrastrar una ficha **no** la mueve.
- [ ] En modo selección, un clic en el título **no** abre el enlace.
- [ ] Seleccionar 3 enlaces de **dos categorías distintas** y añadir una etiqueta: la reciben exactamente esos 3, y la etiqueta queda registrada en la lista maestra (visible en "Gestionar etiquetas").
- [ ] Quitar una etiqueta en lote no la borra de la lista maestra.
- [ ] Cambiar la categoría en lote a un nombre **que no existía**: se crea, y aparece en el lateral.
- [ ] Desactivar 2 enlaces y comprobar que el filtro "Activos" los oculta.
- [ ] Eliminar 2 enlaces: el `confirm()` dice cuántos son, y desaparecen solo esos.
- [ ] **Con enlaces seleccionados, cambiar de filtro o escribir en el buscador vacía la selección** (D4).
- [ ] Todo lo anterior probado en **los dos modos de vista**.

## Al cerrar

- `ESPECIFICACIONES.md`: nueva subsección en la 4, funciones nuevas en la tabla de la 6, las decisiones D1-D6 resumidas en la 7, y **quitar la entrada del backlog** (11.1).
- Si acabaste tocando algo de la tabla de la sección 8, actualízala.
- `CHANGELOG.md`: entrada de cambio funcional.
