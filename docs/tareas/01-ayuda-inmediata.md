# Tarea 01 — Ayuda inmediata: estados vacíos que enseñan + tooltips

**Prioridad**: Muy alta · **Esfuerzo estimado**: ~1 h · **Riesgo**: bajo (cambios aditivos y locales)

Antes de empezar, lee [`CLAUDE.md`](../../CLAUDE.md). Contexto del *por qué* en la sección 11.5 de [`ESPECIFICACIONES.md`](../ESPECIFICACIONES.md).

## Objetivo

PinBoard no tiene un problema de documentación, tiene un problema de **descubribilidad**: hay funciones potentes que nada en pantalla insinúa. Esta tarea ataca las dos más baratas de resolver, sin añadir ninguna pantalla nueva.

---

## Parte A — El estado vacío enseña en vez de disculparse

### Situación actual

`#emptyState` (`pinboard.html:744`) es un párrafo fijo: *"No se encontraron enlaces con los filtros actuales."* `renderCards()` lo muestra cuando `filtered.length === 0` (`pinboard.html:1358-1362`).

El problema: **ese mismo texto cubre dos situaciones opuestas.** Un usuario que abre PinBoard por primera vez —sin ningún enlace, sin ningún filtro puesto— lee que sus filtros no encuentran nada. Es el primer mensaje que ve la app en su vida y es desconcertante y además falso.

### Requisitos

**A1.** Distinguir los dos casos en `renderCards()`. Los dos datos necesarios ya están disponibles ahí: `filtered.length` y `state.links.length`.

- `state.links.length === 0` → **mensaje de bienvenida** (A2).
- `state.links.length > 0` y `filtered.length === 0` → el mensaje actual de filtros, sin cambios.

**A2.** El mensaje de bienvenida enseña las **tres** primeras acciones, en este orden:

1. Crear el primer enlace.
2. Importar los marcadores del navegador o un archivo de PinBoard (con el botón "Importar" del lateral).
3. Pulsar `/` para buscar en cualquier momento.

Redacción libre, pero **breve** (tres líneas, no un tutorial) y en español.

**A3.** La primera acción es un **botón funcional** dentro del mensaje, no solo texto: abre el modal de "Nuevo enlace" reutilizando el mismo manejador que `#btnAdd`. No dupliques la lógica de apertura.

**A4.** El listener de ese botón se registra **una sola vez en la inicialización**, no dentro de `renderCards()`. `#emptyState` es un elemento estático que `render()` no destruye, así que un listener delegado o directo registrado al arrancar es suficiente; registrarlo en cada repintado acumularía listeners duplicados.

**A5.** El texto de ambos mensajes es estático y de autor, así que no necesita `escapeHtml`. No insertes en él ningún dato del usuario.

---

## Parte B — `title` en todo control que hoy no lo tenga

### Requisitos

**B1.** Añadir `title` a estos controles, que hoy no lo tienen (verificado):

| Elemento | Ubicación | Qué debe explicar |
|---|---|---|
| `#btnAdd` | `:691` | Crear un enlace nuevo · mencionar el atajo `n` |
| `#btnManageCategories` | `:696` | Renombrar, reordenar, colorear y eliminar categorías |
| `#btnSaveViewProfile` | `:704` | Guardar la selección de etiquetas actual como vista reutilizable |
| `#btnManageTags` | `:714` | Renombrar, colorear y eliminar etiquetas |
| `#searchInput` | `:731` | Busca en título, descripción y etiquetas · **mencionar el atajo `/`** |
| Botones de `#statusToggle` | `:733-734` | Qué hace cada uno: todos los enlaces / solo los activos |
| Botones de `#viewToggle` | `:737-738` | Qué hace cada uno: fichas en cuadrícula / lista compacta |
| `#btnToggleAllGroups` | `:740` | Plegar o expandir todas las categorías de golpe |
| Item "Todas" de `#categoryList` | `:1299-1300` | Quitar el filtro de categoría |
| **Chips de `#tagCloud`** | `:1316` | **Ver B2** |
| Chips de `#viewProfileList` | `:1345` | Un clic aplica la vista; otro clic la deselecciona |

**B2. El más importante de la lista.** Los chips de etiqueta del lateral tienen un ciclo de **tres estados** al pulsarlos repetidamente —neutra → incluida → excluida → neutra— y hoy **nada lo insinúa**. Es una función indescubrible: nadie hace tres clics en el mismo sitio para ver qué pasa. El `title` debe explicar el ciclo completo en una frase.

**B3.** Los chips de `#tagCloud` y de `#viewProfileList` se generan concatenando cadenas en `renderSidebar()` / `renderViewProfileList()`. Si el `title` incluye el nombre de la etiqueta o de la vista, **pásalo por `escapeHtml()`**.

---

## Fuera de alcance

- El panel "?" con la chuleta completa: es la tarea de prioridad alta que va **después** de la paleta de comandos (sección 11.5).
- Cualquier tour, onboarding por pasos o mensaje emergente.
- Reescribir textos de interfaz que ya funcionan.

## Invariantes: no toques esto

1. **`#btnExport` ya tiene un `title` dinámico**, recalculado por `syncExportButtonLabel()` en cada `render()` según haya o no un filtro activo (`pinboard.html:1483-1491`). **No lo sustituyas por un texto fijo**: perderías el aviso de que la exportación va a incluir solo la selección.
2. Los controles que **ya tienen** `title` se quedan como están: `#btnEditTitle`, `#btnClearTagSelection`, `#btnImport`, los items de categoría (que ya explican el arrastre y el Ctrl+clic), y los botones ▲/▼/✏️/🗑️ de las fichas.
3. No cambies el `title` de las fichas de enlace: en la vista compacta transporta el título y la descripción completos, que es la única forma de leerlos cuando el texto se corta con elipsis.
4. No cambies el `id` ni la clase de `#emptyState`.

## Checklist de verificación manual

- [ ] **Con la lista vacía** (perfil de navegador nuevo, o borrando las claves `enlaces_*` de `localStorage`): aparece el mensaje de bienvenida, no el de filtros.
- [ ] El botón del mensaje de bienvenida abre el modal de "Nuevo enlace".
- [ ] Tras crear el primer enlace, el mensaje de bienvenida desaparece.
- [ ] **Con enlaces pero un filtro que no encuentra nada** (busca un texto inexistente): aparece el mensaje de filtros de siempre.
- [ ] Pulsar el botón del mensaje de bienvenida **dos veces seguidas** (entrando y saliendo del estado vacío) abre el modal una sola vez por clic — comprueba que no se acumularon listeners.
- [ ] Cada control de la tabla B1 muestra su tooltip al pasar el ratón, con el texto correcto.
- [ ] El tooltip de un chip de etiqueta explica los tres estados.
- [ ] **Regresión**: con una categoría o etiqueta seleccionada, el tooltip de "Exportar" sigue diciendo cuántos enlaces de la selección va a exportar.
- [ ] Probado en **los dos modos de vista**.

## Al cerrar

- `ESPECIFICACIONES.md`: describir el estado vacío en la sección 4 y **quitar las dos entradas correspondientes del backlog** (11.1).
- `CHANGELOG.md`: entrada de cambio funcional.
