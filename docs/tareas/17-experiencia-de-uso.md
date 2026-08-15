# Tarea 17 — Experiencia de uso: lo que se ve al mirar la aplicación

**Prioridad**: Alta · **Esfuerzo estimado**: medio (las partes A–C son ~1 h en total; D y E se pueden acometer sueltas) · **Riesgo**: bajo salvo la Parte E

Antes de empezar, lee [`CLAUDE.md`](../../CLAUDE.md). El *por qué* de fondo está en la sección 11.5 de [`ESPECIFICACIONES.md`](../ESPECIFICACIONES.md), que ya diagnosticó el problema: **Lingatu no tiene un problema de documentación, tiene un problema de descubribilidad.**

> **Estado: implementado, las seis partes.** Ver 4.8 (estados vacíos), 4.3 (recuentos del lateral), la sección 10 (ventana estrecha y atenuación de las fichas) y las decisiones 67 y 68 de [`ESPECIFICACIONES.md`](../ESPECIFICACIONES.md). Este documento se conserva porque explica **de dónde salió cada cambio** —qué se vio y qué se midió—, que es lo que no cabe en el CHANGELOG.
>
> De las dos salidas que la Parte C dejaba abiertas se eligió **retirar la promesa** del archivo de ejemplo, no embeberlo. La Parte E se acometió entera, no acotada al caso del portátil.
>
> Nació como propuesta: qué entraba, en qué orden y qué se descartaba lo decidió el autor del repositorio.

## De dónde sale esto

Auditoría del 16/08/2026: catorce estados de la aplicación capturados en Chrome 151, con una colección sembrada de **140 enlaces en ocho categorías** (con etiquetas, notas, enlaces inactivos y descripciones), a tres anchos de ventana. Se miraron las capturas una a una, con el usuario objetivo delante: **un oficinista no técnico**, no un desarrollador.

No es una lista de gustos. Todo lo que sigue es algo que **se ve** o algo que está **medido**.

---

## Parte A — Un solo criterio de recuento, o dilo

### Situación actual (medido)

Con la colección de 140 enlaces y el filtro por defecto («Activos»), la pantalla enseña **a la vez**:

| Dónde | Qué dice |
|---|---|
| Lateral, "Todas" | `140` |
| Lateral, "Trabajo" | `18` |
| Barra superior | `127 enlaces` |
| Cabecera del grupo Trabajo | `16` |

Ninguno miente: los del lateral cuentan toda la colección y los otros dos respetan el filtro activo. Pero **nada lo explica**, la misma palabra nombra las dos cosas, y el filtro «Activos» viene puesto de fábrica — así que esto le pasa a todo el mundo desde el primer día. Un usuario no técnico no concluye *"hay dos criterios de recuento"*: concluye que la aplicación se equivoca, y a partir de ahí desconfía de todos los números que le enseñe.

### Requisitos

**A1.** Los recuentos del lateral (categorías y "Todas") **respetan el filtro de estado activo**, igual que ya lo hacen el contador de la barra y las cabeceras de grupo. Es la opción que hace que los cuatro números concuerden sin añadir ni una palabra a la interfaz.

**A2.** Si al implementarlo se ve que perder el total absoluto empobrece el lateral —saber cuántos enlaces inactivos hay ahí guardados tiene valor—, la alternativa es enseñar **los dos números** con el formato `16 / 18` y un `title` que lo explique. **Elige una de las dos y aplícala a todos los recuentos del lateral**; lo que no puede quedar es un criterio distinto según el sitio.

**A3.** El recuento no puede empezar a mentir en la vista filtrada por búsqueda: si "Trabajo" dice 16 y al pulsarla se ven 3 porque hay una búsqueda escrita, no se ha arreglado nada. Comprueba el comportamiento con búsqueda activa antes de darlo por cerrado.

---

## Parte B — Ningún callejón sin salida

### Situación actual

Con una búsqueda que no encuentra nada, la aplicación dice: *«No se encontraron enlaces con los filtros actuales.»* No dice **qué** filtro, y no ofrece **quitarlo**. Es el final del camino.

Lo llamativo es que el mensaje bueno —el que enumera las restricciones vigentes, `describeActiveConstraints()`— **ya existe**, escrito para exactamente este problema. Pero está detrás de esta condición en `renderCards()`:

```js
} else if(state.search.trim() && hasLinkSelection()) {
```

Exige que haya búsqueda **y** selección de categoría/etiqueta a la vez. En los dos casos habituales —solo una búsqueda escrita, o solo una categoría pulsada— la condición es falsa y cae en el mensaje genérico. La función más útil de esa pantalla casi nunca aparece.

### Requisitos

**B1.** Enumerar las restricciones activas **siempre que haya al menos una**, sea cual sea. Basta con que la condición pregunte por `describeActiveConstraints().length > 0` en vez de por esa conjunción.

**B2.** Añadir un botón **«Quitar los filtros»** dentro de ese mensaje, que devuelva la vista a un estado sin restricciones: categorías, etiquetas incluidas y excluidas, vista aplicada, foco de revisión y búsqueda. **Reutiliza las funciones que ya hacen cada cosa** (`resetFiltersAfterImport()` hace casi exactamente eso) en vez de escribir una limpieza nueva en paralelo; si hay que extraer una función con nombre, extráela y que la usen las dos.

**B3.** El botón se registra con **delegación sobre `#emptyState`** o en la inicialización, nunca dentro de `renderCards()`: ese contenedor se repinta y registrar ahí acumularía listeners (mismo criterio que la tarea 01 con `#btnEmptyStateAdd`).

**B4.** El filtro de estado «Activos» cuenta como restricción y ya lo enumera `describeActiveConstraints()`. Compruébalo: es el que más veces será la única causa de que no se vea nada.

---

## Parte C — La bienvenida lleva a alguna parte

### Situación actual

El estado vacío de la primera apertura es un párrafo centrado con enlaces en línea. Dice, entre otras cosas:

> ¿Prefieres ver antes cómo queda con contenido? Importa `examples/ejemplo-enlaces.json`.

Ese archivo vive **en el repositorio**, no en el disco de quien se ha descargado un `lingatu.html` suelto — que es la forma en que la aplicación se distribuye. Se le está pidiendo a alguien que no es técnico que encuentre e importe un archivo que no tiene.

Además, la única acción real («+ Nuevo enlace») está en el lateral, lejos del centro donde está mirando, y dentro del mensaje aparece como un enlace de texto entre otras cuatro frases.

### Requisitos

**C1.** La primera acción del mensaje de bienvenida es un **botón visible**, no un enlace de texto entre frases. La tarea 01 ya introdujo `#btnEmptyStateAdd` reutilizando el manejador de `#btnAdd`: aquí solo hay que darle peso visual y sitio propio.

**C2.** La frase del archivo de ejemplo se resuelve de una de estas dos formas (**decide una**):
   - **Quitarla.** La opción honesta y de coste cero: quien quiera ejemplos los encuentra en el repositorio.
   - **Hacerla funcionar.** Un botón «Ver un ejemplo» que cree media docena de enlaces de muestra desde una constante embebida en el propio archivo. Cuesta unas pocas líneas y algo de peso, y a cambio la promesa se cumple sin salir de la aplicación. Si se elige esta, los enlaces de ejemplo **se crean como enlaces normales** —el usuario los borra o los edita como cualquier otro— y el texto tiene que decir que eso es lo que va a pasar.

**C3.** El texto de bienvenida es de autor y no lleva datos del usuario, así que sigue sin necesitar `escapeHtml()`. Si la Parte C2 acaba creando enlaces de ejemplo, esos sí pasan por el camino normal de alta (`ensureCategory`, `ensureTag`), no se escriben a mano en `state`.

**C4.** Todo texto nuevo va al diccionario `I18N`, **en los dos idiomas**. Si se añaden enlaces de ejemplo, ojo: sus títulos y categorías son **datos**, no interfaz — decide si se generan en el idioma activo en el momento de crearlos (correcto) o se traducen después (incorrecto, decisión 59).

---

## Parte D — La ficha deja de gritar

### Situación actual

Cada ficha lleva cuatro iconos permanentes (▲ ▼ ✏️ 🗑️) en su esquina superior. Con la colección de prueba visible, eso son unos **500 iconos en pantalla** compitiendo con los títulos, que son lo único que el usuario está buscando. En la vista compacta, cada fila lleva los mismos cuatro.

### Requisitos

**D1.** Bajar el peso visual de esos cuatro controles en reposo (opacidad reducida) y devolverlos a plena visibilidad al **pasar el ratón por la ficha o al enfocar** cualquiera de ellos con el teclado.

**D2. La trampa de este cambio, y es seria**: los ▲/▼ son **la única forma de reordenar en pantalla táctil** — el arrastrar y soltar no funciona ahí (sección 10). Una solución basada solo en `:hover` los haría inalcanzables en tableta y móvil. Usa `@media (hover: hover)` para aplicar la atenuación **solo donde hay ratón**, y déjalos siempre visibles donde no lo hay.

**D3.** No tocar la estructura de las fichas: `.link-card` / `.link-card-compact` y su `data-id` siguen exactamente donde están (contrato de la sección 8). Esto es un cambio de CSS; si acaba necesitando JavaScript, es que se ha ido de alcance.

**D4.** Comprobar que el arrastrar y soltar, los ▲/▼, el modo selección y el indicador 📝 de notas siguen funcionando en **los dos modos de vista**.

---

## Parte E — En ventana estrecha, los enlaces se ven

### Situación actual (medido)

Posición vertical donde empieza la primera ficha, con la misma colección:

| Ancho de ventana | La primera ficha empieza en |
|---|---|
| 1440 px | 116 px |
| 760 px | **735 px** |
| 390 px | **852 px** |

Por debajo de 780 px el lateral deja de ser una columna y se apila **encima** del contenido, con todo lo que lleva dentro: título, botón de alta, ocho categorías, vistas, la nube de etiquetas, tres botones de datos, el pie y los avisos. En una ventana a media pantalla de un portátil, Lingatu parece una lista de categorías y hay que desplazarse casi 800 píxeles para ver el primer enlace.

### Requisitos

**E1.** Por debajo del punto de ruptura, **el contenido va primero** y el lateral se pliega. La forma más barata es un lateral plegable con un control visible («Categorías y etiquetas») que lo despliega; el orden se puede invertir solo con CSS (`order` sobre el grid), sin tocar el HTML ni el JavaScript.

**E2.** El estado plegado/desplegado **no se persiste**: es una consecuencia del tamaño de la ventana, no una preferencia. Si el usuario ensancha la ventana, vuelve el lateral de siempre.

**E3.** Nada de esto puede añadir una dependencia ni un `<script>` nuevo: es CSS y, como mucho, un `hidden` conmutado desde el IIFE existente.

**E4.** Comprobar los tres anchos con la lista vacía, con filtros activos y con categorías plegadas, y que los ▲/▼ siguen alcanzables con el dedo.

> **Duda legítima antes de acometerla**: Lingatu se abre desde `file://`, y eso en un móvil es incómodo hasta para alguien técnico. Puede que el ancho estrecho que importa de verdad no sea el móvil sino **la ventana a media pantalla en un portátil**, que ya sufre el problema a 760 px. Si es así, la Parte E se puede acotar a ese caso y salir más barata.

---

## Parte F — Detalles de forma

**F1.** El formulario de alta pide **la categoría antes que el enlace**, y «Notas» ocupa media ventana siendo lo último que se escribe al capturar algo. Propuesta: que el foco inicial vaya al campo del enlace o del título, y que la categoría llegue **precargada con la que esté filtrada** en ese momento (si hay una sola seleccionada), que es lo que el usuario suele querer. **No cambies los cinco `id` de los campos** — `fieldCategory`, `fieldTitle`, `fieldUrl`, `fieldDescription`, `fieldNotes` — porque la extensión los rellena por nombre (sección 8).

**F2.** En los paneles de Ajustes y de Revisar, **«Cerrar» es hoy el botón más llamativo**: azul y a todo lo ancho, más que las acciones reales del panel. Debe ser secundario.

**F3.** El buscador se corta a media frase (*«Buscar por título, descripció…»*). Que crezca con el espacio disponible en la barra.

**F4.** El aviso de idioma se desborda por abajo en el lateral y queda cortado a media palabra.

---

## Fuera de alcance

- **Rediseño visual**: paleta, tipografía, iconografía o rejilla. Esta tarea corrige lo que confunde, no cambia el aspecto.
- **Tocar el modelo de datos**, el formato del archivo, el de exportación o las claves de `localStorage`.
- **Añadir dependencias, build o peticiones de red.** Sigue vigente la sección 2 entera.
- **La distribución como aplicación instalada**, que es la única vía por la que desaparecería el paso de apertura. Es una pregunta abierta propia, con su coste, y no se decide aquí.
- El *fallback* local del favicon, que ya tiene su entrada en el backlog (11.1).

## Invariantes: no toques esto

1. **El contrato de la sección 8**: `.link-card` / `.link-card-compact` con su `data-id`, los cinco `id` de campo del formulario y los cinco métodos del puente.
2. **Todo texto visible nuevo va al diccionario en los dos idiomas** (4.28), entre las marcas `i18n:inicio` / `i18n:fin`, y se resuelve con `t()` o `plural()`.
3. **El orden es la posición en el array**: ningún `.sort()` sobre `state.links` ni `state.categories`.
4. **Sintaxis ES5** (`var`, `function`, concatenación) dentro del IIFE único.
5. Cualquier dato de usuario que se pinte como HTML pasa por `escapeHtml()`.

## Checklist de verificación manual

1. Los cuatro recuentos concuerdan, con el filtro «Activos» y con «Todos», y también con una búsqueda escrita.
2. Búsqueda sin resultados: se enumeran las restricciones y el botón de quitarlas las quita **todas**.
3. Primera apertura sin datos: el botón de alta funciona, y no se promete ningún archivo que el usuario no tenga.
4. Fichas: iconos legibles al pasar el ratón; **en un navegador sin ratón, siempre visibles**.
5. Los tres anchos (1440 / 760 / 390), en los dos modos de vista y con categorías plegadas.
6. Los dos idiomas y los tres temas (claro, oscuro y el del sistema).
7. Arrastrar y soltar, ▲/▼, modo selección y notas siguen funcionando.
8. Checklist de la sección 8 con la extensión, si se tocó el formulario.
9. `tools/verificar-i18n.html`: cero claves faltantes, cero duplicadas, cero sin usar.

## Al cerrar

1. **`docs/ESPECIFICACIONES.md`**: la funcionalidad en la sección 4, las funciones nuevas en la 6 y el *por qué* en la 7 si alguna decisión no es obvia. La sección 11.5 debería recoger que la descubribilidad se atacó también por aquí.
2. **`CHANGELOG.md`**, en lenguaje de usuario.
3. **Panel de ayuda** (`HELP_SECTIONS_BY_LANG`, 4.25) **en los dos idiomas** si el cambio añade un gesto o un comportamiento de filtro nuevo — el lateral plegable de la Parte E lo es.
