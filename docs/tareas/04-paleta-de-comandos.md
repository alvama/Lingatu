# Tarea 04 — Paleta de comandos (Ctrl+K)

**Prioridad**: Alta · **Esfuerzo estimado**: ~150-180 líneas la paleta + ~40 de extracción previa · **Riesgo**: medio (la extracción toca todos los botones de la interfaz)

Antes de empezar, lee [`CLAUDE.md`](../../CLAUDE.md). Contexto en la sección 11.1 de [`ESPECIFICACIONES.md`](../ESPECIFICACIONES.md).

## Objetivo

Un único desplegable que busca a la vez **enlaces y acciones**: escribes "expo" y sale *Exportar enlaces*; escribes "mdn" y sale el enlace; escribes "desar" y sale *Ir a la categoría Desarrollo*.

Resuelve por la vía correcta lo que se descartó como "más atajos de teclado" (11.2): **un atajo en lugar de diez**, y descubrible leyendo en vez de memorizando. Con la consulta vacía muestra todas las acciones de la app con su atajo, así que es además medio sistema de ayuda — y por eso el panel "?" va después de esta tarea y solo tiene que cubrir los *gestos*.

---

## R0 — Requisito previo: centralizar la lista de overlays

**Hay que hacerlo antes de añadir la paleta, y arregla dos fallos vivos.**

La comprobación de "hay algún modal abierto" está escrita a mano en dos sitios y **ya está desactualizada**:

- El manejador de `Escape` (`pinboard.html:1786-1791`) cierra `overlay`, `manageOverlay` e `importModalOverlay`.
- `anyModalOpen` (`pinboard.html:2493`) comprueba esos mismos tres.

Pero existe un cuarto overlay, `importCategoriesModalOverlay` (`pinboard.html:2707`), añadido después con la importación de categorías (4.19) sin actualizar ninguna de las dos listas. Efectos hoy:

1. **`Escape` no cierra el modal de importar categorías.**
2. **Con ese modal abierto, pulsar `n` abre el modal de nuevo enlace encima**, porque el atajo no se considera bloqueado.

La paleta sería el quinto overlay de una lista a mano que ya falla. Requisitos:

- **R0.1** Una única estructura que registre todos los overlays con su función de cierre.
- **R0.2** `anyOverlayOpen()` derivada de ella, usada por el manejador de atajos.
- **R0.3** El cierre por `Escape` derivado de ella, de modo que cualquier overlay futuro quede cubierto por el solo hecho de registrarse.
- **R0.4** Los dos fallos anteriores quedan corregidos como consecuencia, y hay que comprobarlo explícitamente (ver checklist).

---

## R1 — La arquitectura: un registro de comandos como único origen de verdad

**Esta es la decisión que da o quita valor a la tarea a un año vista**, y por eso está tomada aquí y no se deja al criterio de quien implemente.

Hoy las acciones de la app viven dentro de sus `addEventListener`. Si la paleta duplica esas llamadas, funcionará a la primera y quedará desincronizada con la app en cuanto se añadan tres funciones más: alguien cambiará el comportamiento de un botón y la paleta seguirá haciendo lo de antes. **Eso está prohibido en esta tarea.**

La dirección de dependencia debe ser:

```
listener del botón  ──→  función con nombre  ←──  entrada del registro
```

Ambos llaman a la misma función. La duplicación pasa a ser imposible por construcción.

### R1.1 — Extraer a funciones con nombre la lógica que hoy está en línea

Verificado: siete manejadores tienen la lógica dentro del propio listener. Hay que extraerla **sin cambiar lo que hace**, dejando el listener como una llamada de una línea:

| Manejador | Ubicación | Función a extraer |
|---|---|---|
| `btnEditTitle` | `:1877-1885` | `promptSiteTitle()` |
| `btnToggleAllGroups` | `:2320-2330` | `toggleAllGroups()` |
| `btnClearTagSelection` | `:2411-2418` | `clearTagSelection()` |
| `btnSaveViewProfile` | `:2421-2440` | `promptSaveViewProfile()` |
| `statusToggle` | `:2466-2471` | `setStatusFilter(value)` |
| `viewToggle` | `:2473-2479` | `setViewMode(value)` |
| `btnExport` | `:2505-2524` | `exportLinks()` |

Estos tres ya llaman a funciones con nombre y **no necesitan extracción**: `btnAdd` → `openModal(null)`, `btnManageCategories` / `btnManageTags` → `openManageModal(tipo)`, `btnImport` → `fileImport.click()`.

**La extracción es movimiento puro de código.** No aproveches para mejorar nada: cualquier cambio de comportamiento aquí es una regresión en un botón que hoy funciona.

### R1.2 — El registro

Un array `COMMANDS` declarado **después** de esas funciones, con entradas de esta forma:

```js
{ id: "add-link", label: "Nuevo enlace", hint: "n", run: function(){ openModal(null); } }
```

- `label` puede ser una **cadena o una función** que devuelva la cadena. Es necesario: *Plegar todo* / *Expandir todo* es un mismo comando con etiqueta cambiante, igual que ya hace `syncToggleAllGroupsLabel()`.
- `hint` (opcional) es el atajo de teclado que ya existe para esa acción (`n`, `/`). Es lo que convierte la paleta en documentación.
- `available` (opcional) es una función que devuelve si el comando tiene sentido ahora mismo; si no está, el comando siempre se ofrece. Útil para *Limpiar selección de etiquetas*, que ya comprueba internamente que haya algo que limpiar.

### R1.3 — Comandos que debe incluir

Los trece globales: nuevo enlace, cambiar el título de la página, gestionar categorías, gestionar etiquetas, plegar/expandir todo, limpiar selección de etiquetas, guardar la vista actual, exportar enlaces, importar enlaces, filtro de estado (todos / activos), modo de vista (cómoda / compacta) y enfocar el buscador.

**Fuera del registro** quedan las acciones que solo existen dentro de un modal: `btnDuplicate`, `btnCancel`, `btnExportCategories` y `btnImportCategories`. Un comando de la paleta debe poder ejecutarse desde la vista principal.

---

## R2 — Qué más busca la paleta, además de comandos

Cinco grupos, con cabecera visible solo si el grupo tiene resultados:

| Grupo | Origen | Qué hace `Enter` |
|---|---|---|
| **Comandos** | `COMMANDS` | Ejecuta `run()` |
| **Enlaces** | `state.links` | Abre la URL en una pestaña nueva |
| **Categorías** | `getCategories()` | Filtra por esa categoría, igual que un clic normal en el lateral |
| **Vistas** | `state.viewProfiles` | Aplica el perfil, igual que un clic en su chip |
| **Etiquetas** | `getAllTags()` | Añade la etiqueta al filtro de incluidas (`state.tags`) |

**R2.1 — Los enlaces se buscan sobre `state.links` completo, ignorando los filtros activos.** Es el punto de la función: alcanzar algo que ahora mismo *no* estás viendo. Usar `getFilteredLinks()` aquí sería un error de diseño. Busca sobre título, descripción, etiquetas y URL.

**R2.2 — Las etiquetas se limitan a incluir.** La paleta no replica el ciclo de tres estados del lateral (4.17); hace lo simple y predecible.

**R2.3 — Con la consulta vacía se muestran solo los comandos**, todos, con su `hint`. Es el momento en que la paleta hace de ayuda: abrirla y ver qué sabe hacer la app.

**R2.4 — Topes por grupo** cuando hay consulta: los comandos son pocos y caben todos; enlaces máximo 8; categorías, vistas y etiquetas máximo 5 cada uno.

---

## R3 — Coincidencia insensible a acentos

Subcadena, sin distinguir mayúsculas **ni acentos**. En español no es un adorno: `categoria` debe encontrar *Categorías* y `diseno` debe encontrar *Diseño*. Normaliza descomponiendo y quitando las marcas diacríticas (`normalize("NFD")` + eliminar el rango de combinantes) antes de comparar, tanto la consulta como el texto candidato.

Son tres líneas y es la diferencia entre una paleta que sirve y una que obliga a escribir con tildes.

---

## R4 — Interfaz y teclado

**R4.1** Overlay nuevo con un campo de texto y la lista de resultados. Sigue el patrón de los modales existentes y **necesita su regla `[hidden]{display:none}`** (decisión 1 de la sección 7). Se registra en la estructura de R0.

**R4.2** Se abre con **Ctrl+K y Cmd+K** (`e.ctrlKey || e.metaKey`, igual que la multi-selección de categorías ya hace). **Con `preventDefault()`**: en Chrome y Edge, Ctrl+K enfoca la barra de direcciones, y hay que impedirlo.

**R4.3 — Además del atajo, un control visible** para abrirla (barra de herramientas o pie del lateral). Por dos motivos: si algún navegador no cede el Ctrl+K, la función sigue siendo accesible; y una función autodocumentada a la que solo se llega por un atajo que nadie te ha contado es una contradicción.

**R4.4** A diferencia de `/` y `n`, **Ctrl+K sí funciona con el foco en un campo de texto** — es lo esperable de una paleta de comandos. Lo que **no** debe hacer es abrirse **con cualquier overlay abierto**, coherente con la decisión 15 de la sección 7 y usando `anyOverlayOpen()` de R0.

**R4.5** Teclado: `↑`/`↓` mueven la selección, `Enter` ejecuta la entrada seleccionada, `Escape` cierra. **Sigue el patrón ya escrito para las sugerencias de etiquetas** (4.20, `pinboard.html:1742`), incluido que la entrada seleccionada se desplace a la vista si queda fuera. Clic con el ratón ejecuta igual que `Enter`.

**R4.6** Al ejecutar cualquier entrada, la paleta se cierra y el campo se vacía, para que la siguiente apertura empiece limpia.

---

## Fuera de alcance

- **Comandos con argumentos** ("añade la etiqueta X a la selección"): todos los comandos son globales y sin parámetros.
- Ordenar por uso reciente o frecuencia: exigiría persistencia y no aporta con trece comandos.
- Coincidencia difusa o con puntuación: subcadena es suficiente y predecible.
- Ejecutar acciones **sobre un enlace** desde la paleta (editar, borrar): `Enter` solo abre. Evaluable más adelante.
- Acciones internas de los modales (R1.3).

## Invariantes: no toques esto

1. **Todos los botones existentes deben seguir funcionando exactamente igual después de la extracción.** Es la principal superficie de regresión de esta tarea, mayor que la paleta en sí.
2. **`exportLinks()` debe conservar el `confirm()` que hoy vive dentro del listener** (`pinboard.html:2507-2513`), el que avisa de que hay un filtro activo y solo se van a exportar los enlaces de la selección. Si se queda fuera de la función extraída, la paleta se convierte en una vía para exportar una selección parcial sin avisar — justo lo que esa confirmación existe para evitar (4.7).
3. **La paleta pinta datos del usuario** (títulos de enlaces, nombres de categorías, etiquetas y vistas): `escapeHtml()` en todos ellos, sin excepción.
4. No cambies el comportamiento de `/` ni de `n`.
5. **Esta tarea no toca la superficie protegida de la sección 8**: ni las fichas, ni sus `data-id`, ni los ids de campo del formulario, ni el puente. No hace falta pasar su checklist completa, pero comprueba que `n` y `/` siguen respondiendo.
6. Sintaxis ES5 y sin dependencias. La paleta se pinta concatenando cadenas, como el resto.

## Checklist de verificación manual

**Los dos fallos que arregla R0:**

- [ ] Abrir el modal de importar categorías y pulsar `Escape`: **se cierra** (hoy no lo hace).
- [ ] Con ese modal abierto, pulsar `n`: **no** se abre el modal de nuevo enlace encima (hoy sí).

**Regresiones de la extracción — recórrelos uno a uno:**

- [ ] Cambiar el título de la página con ✏️.
- [ ] Plegar todo / Expandir todo, y que la etiqueta del botón siga alternando.
- [ ] El icono de escoba sigue limpiando etiquetas incluidas y excluidas.
- [ ] Guardar una vista, incluida la confirmación al sobrescribir una que ya existe.
- [ ] Los toggles Todos/Activos y Cómoda/Compacta, y que el modo de vista siga persistiendo al recargar.
- [ ] Exportar sin filtro exporta todo.
- [ ] **Exportar con una categoría o etiqueta seleccionada sigue pidiendo confirmación**, y el `title` del botón sigue diciendo cuántos enlaces va a exportar.
- [ ] Nuevo enlace, Gestionar categorías, Gestionar etiquetas, Importar.

**La paleta:**

- [ ] `Ctrl+K` la abre y **la barra de direcciones del navegador no toma el foco**.
- [ ] `Cmd+K` la abre en macOS.
- [ ] El control visible de R4.3 la abre también.
- [ ] Con el campo vacío se listan los trece comandos, y los que tienen atajo lo muestran.
- [ ] **Cada comando hace exactamente lo mismo que su botón.** Recórrelos todos.
- [ ] Escribir `categoria` encuentra *Categorías*; escribir `diseno` encuentra la categoría *Diseño*.
- [ ] Escribir el título de un enlace **que un filtro activo está ocultando ahora mismo**: aparece, y `Enter` lo abre en una pestaña nueva.
- [ ] Elegir una categoría filtra igual que un clic en el lateral.
- [ ] Elegir una vista guardada la aplica igual que su chip.
- [ ] Elegir una etiqueta la añade al filtro de incluidas.
- [ ] `↑`/`↓` mueven la selección, la entrada seleccionada se desplaza a la vista, `Enter` ejecuta, `Escape` cierra.
- [ ] Con un modal abierto, `Ctrl+K` no hace nada.
- [ ] Tras ejecutar algo y volver a abrirla, el campo está vacío.
- [ ] Un enlace cuyo título contenga `<script>alert(1)</script>` se ve como texto literal en la paleta.
- [ ] Con la lista de enlaces vacía, la paleta se abre sin errores y muestra solo comandos.

## Al cerrar

- `ESPECIFICACIONES.md`: nueva subsección en la 4, `COMMANDS` y las funciones extraídas en la tabla de la 6, la decisión de R1 (registro como único origen de verdad, y por qué se rechazó duplicar las llamadas) en la 7, la corrección de R0 documentada, y **quitar la entrada del backlog** (11.1).
- La entrada del panel "?" del backlog puede reducirse: la paleta ya documenta las acciones, así que a ese panel solo le quedan los gestos.
- `CHANGELOG.md`: entrada de cambio funcional.
