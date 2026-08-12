# Tarea 08 — Panel de limpieza

**Prioridad**: Media · **Esfuerzo estimado**: ~150 líneas · **Riesgo**: bajo-medio (el cálculo es aditivo; el riesgo está en el filtro nuevo de R3)

Antes de empezar, lee [`CLAUDE.md`](../../CLAUDE.md). Contexto en la sección 11.1 de [`ESPECIFICACIONES.md`](../ESPECIFICACIONES.md).

## Objetivo

Convertir una lista pasiva de enlaces en algo que ayude a mantenerla. Todo son cálculos sobre `state.links`, que ya está en memoria: **cero cambios en el modelo de datos**.

Dos de las comprobaciones justifican el panel por sí solas:

- **Las URLs inválidas hoy fallan en silencio.** Si `new URL()` lanza, simplemente no se pinta el favicon (4.11): nada te dice que ese enlace está roto.
- **Los duplicados que ya están dentro no se listan en ningún sitio.** El dedupe solo actúa al guardar y al importar, así que los que entraron por "Sustituir todo" o aceptando el `confirm()` de la decisión 9 siguen ahí, invisibles.

---

## R1 — La regla que mantiene la tarea pequeña

> **El panel no modifica nada.** Solo cuenta y te lleva.

Diagnostica; la reparación la hacen las herramientas que ya existen (el modal de gestión, la edición de un enlace, y las acciones en lote de la tarea 02). Esto es lo que la mantiene en ~150 líneas y lo que evita que aparezca un segundo lugar donde se editan datos, con sus propias reglas y sus propios errores.

No introduzcas botones de "arreglar todo", ni siquiera para lo que parezca trivial.

---

## R2 — Interfaz

**R2.1** Botón "Revisar" en el sidebar, junto a Exportar/Importar: es una acción de mantenimiento, de la misma familia. Con `title`.

**R2.2** Abre un modal con la lista de comprobaciones, cada una una fila plegable con su nombre y su recuento:

```
URLs duplicadas ya guardadas                    3 grupos  ▸
Enlaces con URL inválida                              2   ▸
Enlaces sin ninguna etiqueta                         47   ▸
Etiquetas que ya no usa ningún enlace                 5   ▸
Categorías con 0 o 1 enlace                           4   ▸
Títulos repetidos con URL distinta                    2   ▸
Dominios repartidos entre varias categorías           3   ▸
URLs con parámetros de seguimiento                   11   ▸
```

**R2.3** Las comprobaciones **que salen a cero no se muestran**. Si todas están a cero, el modal dice que no hay nada que revisar. Un panel que enseña ocho ceros no invita a volver.

**R2.4** Al desplegar una fila se listan los elementos afectados (con un tope razonable y "y N más" si se pasa), y aparece el botón **"Ver estos N"** de R3.

**R2.5** El modal es un overlay nuevo: necesita su regla `[hidden]{display:none}` (decisión 1 de la sección 7) y quedar registrado en la comprobación de "hay algún overlay abierto".

**Coordinación con la tarea 04**, que centraliza esa comprobación en `anyOverlayOpen()`: si ya está hecha, regístrate ahí y no toques nada más. Si no, hay que añadir este overlay **a las dos listas escritas a mano** que existen hoy — el manejador de `Escape` (`pinboard.html:1786-1791`) y `anyModalOpen` (`pinboard.html:2493`) — y conviene saber que a ambas **ya les falta** `importCategoriesModalOverlay`.

**R2.6** Recalcula todo al abrir el panel. Los datos cambian entre aperturas.

---

## R3 — "Ver estos N": el puente entre diagnóstico y reparación

Sin esto el panel es un informe sin salida. Es también la única parte que toca el filtrado, así que es donde está el riesgo de la tarea.

**R3.1** Los filtros actuales (categoría, etiquetas, búsqueda) **no pueden expresar "estos 12 enlaces concretos"**. Hace falta una dimensión nueva: `state.focusIds`, un `Set` de ids.

**R3.2** `getFilteredLinks()` lo respeta como una condición más en AND: si `focusIds` no está vacío, solo pasan los enlaces cuyo `id` esté dentro.

**R3.3 — No se persiste.** Es un foco momentáneo de revisión, como la búsqueda. Se vacía al recargar la página.

**R3.4** Mientras está activo, un aviso visible sobre la lista: *"Mostrando 12 enlaces de la revisión — Quitar"*, con el botón que lo vacía. **Sin ese aviso el usuario no entiende por qué ve solo una parte de su colección**, y es exactamente el tipo de estado invisible que genera desconcierto.

**R3.5** Se vacía también al cambiar el filtro de categoría o de etiquetas, por el mismo criterio que la tarea 02 aplica a su selección: no dejar activos dos recortes que el usuario no puede ver a la vez.

**R3.6** Pulsar "Ver estos N" cierra el modal y aplica el foco.

---

## R4 — Las ocho comprobaciones

Todas sobre `state.links`, `state.categories` y `state.allTags`.

| Comprobación | Cómo | Notas |
|---|---|---|
| **URLs duplicadas ya guardadas** | Agrupar por `normalizeUrlForCompare(l.url)` y quedarse con los grupos de más de uno | **Reutiliza esa función**, no escribas otra normalización |
| **URL inválida** | `new URL(l.url)` dentro de un `try/catch` | Hoy solo se manifiesta como falta de favicon |
| **Sin ninguna etiqueta** | `l.tags.length === 0` | Suele ser el grupo más numeroso; encaja con etiquetar en lote |
| **Etiquetas sin uso** | Recuento 0 sobre `state.allTags` | Ver R5 |
| **Categorías con 0 o 1 enlace** | `getCategories()`, `count <= 1` | Candidatas a fusionar |
| **Títulos repetidos con URL distinta** | Agrupar por título normalizado (sin espacios sobrantes, sin mayúsculas) y quedarse con grupos de más de uno cuya URL normalizada difiera | Posible duplicado real que el dedupe por URL no ve |
| **Dominios repartidos entre varias categorías** | Agrupar por `hostname`; informar si el dominio tiene **3 o más enlaces** repartidos en **2 o más categorías** | Los umbrales evitan ruido. Candidato a categoría propia |
| **URLs con parámetros de seguimiento** | Buscar `utm_*`, `fbclid`, `gclid`, `mc_cid`, `mc_eid`, `igshid` en la query | Ver abajo |

**Sobre los parámetros de seguimiento**, que es la comprobación cuyo valor es menos evidente: **defeitan la detección de duplicados**. `normalizeUrlForCompare` solo quita la barra final y baja a minúsculas, así que la misma página guardada dos veces con distintos `utm_` **no se detecta como duplicada**. No es solo estética: explica duplicados que el usuario no entiende.

Su reparación es manual (editar cada enlace), y así se queda: R1 no admite excepciones. Una acción en lote de "limpiar parámetros" sería otra tarea.

---

## R5 — Extraer el recuento de etiquetas, que hoy está duplicado

**Verificado**: `getCategories()` devuelve `[{name, count}]`, pero **`getAllTags()` devuelve solo nombres, sin recuento** (`pinboard.html:1101-1103`), y el recuento de etiquetas se calcula **en línea dentro de `renderManageList()`** (`pinboard.html:1931-1936`).

Este panel necesita ese mismo recuento. **Extráelo a una función compartida** y haz que `renderManageList()` la use, en vez de crear una tercera copia de la misma cuenta. Mismo criterio que el registro de comandos de la tarea 04: una cuenta duplicada acaba divergiendo.

---

## R6 — Rendimiento

Un solo recorrido de `state.links` donde se pueda, y **mapas para agrupar, nunca bucles anidados**. Detectar duplicados comparando cada enlace con todos los demás es O(n²) y con unos miles de enlaces se nota al abrir el panel. `performImportMerge` ya usa un objeto como mapa (`pinboard.html:2555-2556`): mismo patrón.

---

## Fuera de alcance

- **Cualquier reparación automática** (R1): ni borrar duplicados, ni limpiar URLs, ni fusionar categorías, ni eliminar etiquetas sin uso.
- **Comprobar si un enlace sigue vivo**: descartado del backlog por falsos positivos (11.2). Este panel es 100% local y sin red.
- Puntuaciones de "salud" o porcentajes globales.
- Guardar un histórico de revisiones.
- El **aviso de backup** (backlog, prioridad muy baja): el panel es su sitio natural, pero no es esta tarea.

## Invariantes: no toques esto

1. **`getLinksForExport()` y `hasLinkSelection()` deben ignorar `focusIds`.** Ignoran la búsqueda a propósito para que un filtro momentáneo no recorte una exportación (4.7); el foco de revisión es exactamente eso. **Si `focusIds` acabara afectando a la exportación, el usuario podría exportar 12 enlaces creyendo que exporta todos.**
2. **No cambies el orden de los resultados.** La posición en `state.links` es el orden manual del usuario: el panel no ordena nada.
3. **No cambies la semántica de los filtros existentes.** `focusIds` es una condición más en AND, no reemplaza a ninguna.
4. **Reutiliza `normalizeUrlForCompare`** para todo lo que compare URLs. Una segunda normalización daría resultados distintos a los del dedupe real, y el panel informaría de duplicados que la app no considera duplicados.
5. `escapeHtml()` en todo lo que el panel pinte: títulos, URLs, nombres de categoría y de etiqueta.
6. Esta tarea **no toca la superficie protegida de la sección 8**.
7. Sintaxis ES5.

## Checklist de verificación manual

**Preparación**: hazte una colección de prueba con un caso de cada cosa — dos enlaces con la misma URL, uno con URL inválida (`http://`, sin más), varios sin etiquetas, una etiqueta creada y no usada, una categoría vacía, dos títulos iguales con URL distinta, tres enlaces de un mismo dominio en dos categorías, y una URL con `?utm_source=x`.

- [ ] Cada una de las ocho comprobaciones detecta su caso, con el recuento correcto.
- [ ] Las comprobaciones a cero **no aparecen**.
- [ ] Con una colección limpia, el panel dice que no hay nada que revisar.
- [ ] Desplegar una fila lista los afectados.
- [ ] **El panel no modifica nada**: abrirlo, desplegarlo todo y cerrarlo deja los datos idénticos.

**El foco de revisión (R3):**

- [ ] "Ver estos N" cierra el modal y deja la vista con exactamente esos enlaces.
- [ ] El aviso aparece con el recuento correcto y "Quitar" lo desactiva.
- [ ] Con el foco activo, el contador de resultados de la barra cuadra con lo que se ve.
- [ ] Cambiar de categoría o de etiqueta en el lateral **quita el foco**.
- [ ] Recargar la página **quita el foco**.
- [ ] **Con el foco activo, el `title` del botón Exportar sigue diciendo el total de siempre y exportar sigue exportando todo.** Es el invariante 1.
- [ ] Con el foco activo, plegar y desplegar categorías sigue funcionando.

**Casos límite:**

- [ ] Colección **vacía**: el panel se abre sin errores.
- [ ] Un enlace con URL inválida no rompe las comprobaciones que usan `hostname` (dominios, seguimiento).
- [ ] Una etiqueta o categoría con caracteres raros (`<`, `&`, comillas) se muestra literal.
- [ ] Con varios cientos de enlaces, el panel abre sin retardo perceptible.
- [ ] Probado en **los dos modos de vista**.

## Al cerrar

- `ESPECIFICACIONES.md`: nueva subsección en la 4 con las ocho comprobaciones y la regla de R1, las funciones nuevas en la 6 (incluida la del recuento de etiquetas extraída en R5), `state.focusIds` donde se describen los filtros (4.3), en la 7 la decisión de R1 (por qué el panel no repara) y **quitar la entrada del backlog** (11.1).
- Actualizar la entrada del **aviso de backup** del backlog para apuntar que su sitio es este panel.
- `CHANGELOG.md`: entrada de cambio funcional.
