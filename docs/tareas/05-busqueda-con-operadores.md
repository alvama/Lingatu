# Tarea 05 — Búsqueda con operadores

**Prioridad**: Alta · **Esfuerzo estimado**: ~60-80 líneas (parser + comparador) · **Riesgo**: medio — `getFilteredLinks()` es la función más caliente de la app: un fallo ahí se ve en todo lo que se pinta

Antes de empezar, lee [`CLAUDE.md`](../../CLAUDE.md). Comportamiento actual de los filtros en la sección 4.3 de [`ESPECIFICACIONES.md`](../ESPECIFICACIONES.md).

## Objetivo

Que el mismo cuadro de búsqueda entienda `cat:desarrollo`, `#referencia`, `-#trabajo`, `site:github.com`, `is:inactivo` y `"frase exacta"`.

Sin UI nueva, sin nada que aprender para quien no lo use: escribir texto normal sigue funcionando. El problema que resuelve es de **recall**: recuerdas "aquel artículo sobre índices de base de datos" pero el título real es "B-trees in practice", y hoy la única forma de acotar es combinar filtros a mano en el lateral.

## Situación actual

`getFilteredLinks()` (`pinboard.html:1107-1126`) aplica los filtros en AND, y la búsqueda es **una única subcadena** sobre `title + " " + description + " " + tags`, en minúsculas (`pinboard.html:1120-1123`).

Dos detalles verificados que importan:

- **La URL no se busca hoy.** Añadirla al texto de búsqueda es lo que hace que pegar una URL encuentre su enlace, sin ninguna interacción especial (R2.2).
- **`getLinksForExport()` ignora la búsqueda a propósito** (`pinboard.html:1131-1132`). Los operadores son un filtro momentáneo más, así que **no deben afectar a lo que exporta el botón Exportar**. No toques esa función.

---

## R1 — Semántica: la regla de composición

Una sola regla, y es la que ya sigue la app:

> **Términos del mismo operador se combinan con OR. Operadores distintos se combinan con AND. Las negaciones son siempre AND NOT.**

No es una invención: el filtro de etiquetas del lateral ya es OR (decisión 3 de la sección 7) y la multi-selección de categorías también (4.18). Mantener eso hace que la búsqueda escrita y los filtros del lateral signifiquen lo mismo.

Ejemplos:

| Consulta | Significado |
|---|---|
| `cat:desarrollo cat:diseño` | categoría Desarrollo **o** Diseño |
| `#api #sdk` | tiene la etiqueta api **o** sdk |
| `cat:desarrollo #api` | categoría Desarrollo **y** etiqueta api |
| `python -#trabajo` | contiene "python" **y no** tiene la etiqueta trabajo |
| `site:github.com "getting started"` | del dominio github.com **y** con esa frase literal |

**R1.1 — Los operadores se combinan en AND con los filtros del lateral**, igual que todo lo demás (4.3). Es decir: si tienes la categoría "Desarrollo" seleccionada en el lateral y escribes `cat:diseño`, el resultado correcto es **cero enlaces**. Es coherente, pero desconcertante si no se explica — de ahí R4.

---

## R2 — Operadores

**R2.1 — Los operadores a implementar:**

| Operador | Compara contra | Notas |
|---|---|---|
| `cat:texto` | nombre de categoría | **Subcadena**, no coincidencia exacta: `cat:desar` encuentra "Desarrollo", y `cat:trabajo` encuentra "Trabajo / Clientes" (las rutas que genera la importación de marcadores) |
| `#texto` | nombres de etiquetas del enlace | Subcadena: `#ref` encuentra `#referencia` |
| `site:texto` | `hostname` de la URL | Subcadena. Extrae el hostname con `new URL()` dentro de un `try/catch`, como ya hace `hostnameForDisplay()` |
| `is:activo` / `is:inactivo` | campo `active` | Ver R2.3 |
| `"frase exacta"` | el texto de búsqueda completo | Subcadena literal, con espacios incluidos |
| `-` delante de cualquiera | — | Niega ese término: `-#trabajo`, `-cat:archivo`, `-site:twitter.com`, `-python` |
| palabra suelta | el texto de búsqueda completo | Ver R3 |

**R2.2 — Añadir la URL al texto donde se busca.** El texto de búsqueda pasa a ser `title + description + tags + url`. Con eso, **pegar una URL en el buscador encuentra su enlace** sin ningún caso especial ni interacción nueva, que era el objetivo apuntado en el backlog.

**R2.3 — `is:activo` / `is:inactivo` aprovechan una capacidad que ya existe y está dormida.** `getFilteredLinks()` reconoce internamente el valor `"inactive"` aunque **ningún control de la interfaz lo establece hoy** (nota en 4.3). Este operador es la primera forma de llegar a esos enlaces sin cambiar el toggle. Acepta también `is:active` / `is:inactive` en inglés, que es lo que el código usa internamente.

**R2.4 — Comillas después de un operador.** `cat:"Trabajo / Clientes"` debe funcionar, para nombres con espacios o con la barra de las rutas importadas.

**R2.5 — Un operador desconocido es texto literal.** `foo:bar` se busca tal cual, sin error. Es obligatorio: las URLs llevan `:` y el usuario pega URLs en el buscador.

**R2.6 — Los términos incompletos se ignoran, no filtran.** Mientras se teclea, la consulta pasa por estados como `cat:`, `#`, `-` o `"frase sin cerrar`. Un término cuyo contenido quede vacío tras quitarle el prefijo **se descarta**, y una comilla sin cerrar se trata como texto normal.

Sin esto, la lista se queda en cero enlaces a mitad de cada palabra que el usuario escribe, y el resultado es una búsqueda que parpadea y parece rota. **Es el requisito que más se nota en el uso real.**

---

## R3 — Cambio de comportamiento deliberado: varias palabras se combinan en AND

Hoy `web docs` solo encuentra enlaces donde aparezca literalmente la secuencia `"web docs"`. Pasa a significar **"contiene 'web' y contiene 'docs'"**, en cualquier orden y en cualquiera de los campos.

Es lo que cualquiera espera de un buscador, y quien necesite el comportamiento antiguo lo tiene en `"web docs"` con comillas.

**Es un cambio de comportamiento observable y hay que documentarlo como tal** en la sección 4.3 y en el `CHANGELOG.md`. Una consulta de una sola palabra se comporta exactamente igual que hoy: el cambio solo se manifiesta con dos o más.

---

## R4 — Estado vacío que explica por qué no hay resultados

Con la composición en AND (R1.1), es fácil llegar a cero resultados sin entender por qué: basta tener una categoría seleccionada en el lateral y escribir un `cat:` distinto, o pedir `is:inactivo` con el toggle en "Activos".

**Cuando el resultado sea cero y haya a la vez una selección activa en el lateral y una búsqueda escrita, el estado vacío debe enumerar qué está acotando la vista** (categorías seleccionadas, etiquetas incluidas y excluidas, el toggle de estado, y el texto buscado), para que el usuario vea el conflicto.

No intentes detectar contradicciones lógicas concretas: basta listar las restricciones vigentes.

**Coordinación con la tarea 01**, que reescribe ese mismo estado vacío:
- Si la tarea 01 ya está hecha, **añade este tercer caso** a los dos que introdujo (sin enlaces / sin resultados).
- Si no lo está, deja el mensaje genérico actual para el resto de casos y no te adelantes al resto de esa tarea.

Si el mensaje incluye el texto que escribió el usuario, **pásalo por `escapeHtml()`**.

---

## R5 — Estructura del código

**R5.1** Dos funciones nuevas: `parseSearchQuery(raw)`, que devuelve la consulta ya estructurada, y `linkMatchesQuery(link, parsed)`, que decide si un enlace la cumple.

**R5.2 — Parsea una sola vez por llamada, nunca por enlace.** `parseSearchQuery()` se invoca al principio de `getFilteredLinks()`, fuera del `filter`. `getFilteredLinks()` se ejecuta en cada `render()`, y `render()` se ejecuta en cada tecla pulsada en el buscador: parsear dentro del bucle multiplica el trabajo por el número de enlaces sin ninguna necesidad.

**R5.3** Si la consulta no tiene ningún término (vacía o solo términos incompletos), `linkMatchesQuery` devuelve `true` para todos, y el resto de filtros del lateral siguen aplicándose igual que hoy.

**R5.4 — Insensible a mayúsculas y a acentos.** `cat:diseno` debe encontrar "Diseño" y `categoria` debe encontrar "Categorías". Normaliza descomponiendo y quitando las marcas diacríticas (`normalize("NFD")` y eliminar el rango de combinantes) tanto en la consulta como en el texto candidato.

**La tarea 04 (paleta de comandos) ya está hecha y trae su normalizador**: `paletteNormalize(str)` (4.22 de `ESPECIFICACIONES.md`). **Reutilízalo** —renombrándolo si conviene a un nombre genérico— en vez de escribir un segundo. No acabéis con dos.

**R5.5 — Deja preparada la extensión para las notas.** Cuando exista el campo `notes` (tarea de notas Markdown, 11.3), habrá que añadirlo al texto de búsqueda y ofrecer un operador `note:`. Escribe el texto de búsqueda de forma que añadir un campo sea una línea. **No implementes `note:` ahora**: el campo todavía no existe.

---

## Fuera de alcance

- Coincidencia difusa o tolerante a erratas.
- Operadores por fecha (`before:` / `after:`): no hay ninguna fecha en el modelo de datos.
- `note:`: el campo no existe todavía (R5.5).
- Paréntesis, `OR` explícito o cualquier álgebra más allá de la regla de R1.
- Autocompletado de operadores mientras se escribe: evaluable después, y en parte lo cubrirá la paleta de comandos.
- Guardar consultas como vistas: las Vistas (4.17) guardan selección de etiquetas, no texto. Sería otra tarea.

## Invariantes: no toques esto

1. **No toques `getLinksForExport()` ni `hasLinkSelection()`.** Ignoran la búsqueda a propósito para que un filtro momentáneo no recorte una exportación (4.7). Los operadores son búsqueda: **no deben cambiar lo que se exporta**.
2. **No cambies el orden de los resultados.** `getFilteredLinks()` no ordena, porque la posición en `state.links` es el orden manual del usuario. No introduzcas relevancia ni ningún `.sort()`.
3. **El resto de filtros del lateral se comportan igual**: categorías (OR), etiquetas incluidas (OR), etiquetas excluidas, toggle de estado. Esta tarea añade una condición más en AND, no reescribe las existentes.
4. Una consulta de una sola palabra sin operadores debe devolver **exactamente** lo mismo que hoy (más los aciertos nuevos por URL, R2.2).
5. Esta tarea **no toca la superficie protegida de la sección 8**.
6. Sintaxis ES5 y sin dependencias: el parser se escribe a mano, sin librerías.

## Checklist de verificación manual

**Compatibilidad con lo de antes:**

- [ ] Buscar una sola palabra devuelve lo mismo que antes del cambio.
- [ ] Vaciar el buscador vuelve a mostrar todo lo que permitan los filtros del lateral.
- [ ] Los filtros del lateral siguen funcionando solos, sin nada escrito.
- [ ] **Con una categoría seleccionada, el `title` del botón Exportar sigue diciendo cuántos enlaces exporta, y escribir en el buscador no cambia ese número.**

**Operadores:**

- [ ] `cat:desar` encuentra los de "Desarrollo".
- [ ] `cat:"Trabajo / Clientes"` funciona con nombre entre comillas.
- [ ] `cat:a cat:b` devuelve la unión de las dos categorías.
- [ ] `#ref` encuentra los que tienen `#referencia`.
- [ ] `#a #b` devuelve los que tienen cualquiera de las dos.
- [ ] `-#trabajo` excluye los que la tienen.
- [ ] `site:github.com` encuentra solo los de ese dominio.
- [ ] `site:` sobre una colección con **alguna URL inválida** no lanza ningún error.
- [ ] `is:inactivo` con el toggle en "Todos" muestra solo los inactivos.
- [ ] `"frase exacta"` exige la secuencia literal.
- [ ] `python -#trabajo` combina texto y negación.
- [ ] Pegar una URL completa en el buscador encuentra su enlace.
- [ ] `foo:bar` se busca como texto literal, sin error.

**Lo que más se nota (R2.6):**

- [ ] Teclear `cat:desarrollo` **letra por letra**: la lista no se queda en cero al llegar a `cat:`.
- [ ] Teclear `"una frase` con la comilla sin cerrar: no rompe nada y trata el texto como normal.
- [ ] Escribir solo `-`, solo `#` o solo `is:`: la lista no se vacía.

**Composición y explicación:**

- [ ] `web docs` (dos palabras) encuentra un enlace titulado "Docs para la web".
- [ ] `"web docs"` sobre ese mismo enlace **no** lo encuentra.
- [ ] Con la categoría "Desarrollo" seleccionada en el lateral y `cat:diseño` escrito: cero resultados, y el estado vacío **enumera las dos restricciones**.
- [ ] `cat:diseno` (sin tilde) encuentra "Diseño".
- [ ] Con muchos enlaces, escribir en el buscador no produce un retardo perceptible.
- [ ] Probado en **los dos modos de vista**.

## Al cerrar

- `ESPECIFICACIONES.md`: reescribir el punto de búsqueda de la 4.3 con la tabla de operadores y la regla de composición, añadir `parseSearchQuery` / `linkMatchesQuery` a la tabla de la 6, registrar en la 7 la decisión de R3 (varias palabras en AND, y por qué se aceptó cambiar el comportamiento) y la de R1 (misma semántica OR/AND que los filtros del lateral), y **quitar la entrada del backlog** (11.1).
- **`title` de `#searchInput`**: debe mencionar que existen operadores. Si la tarea 01 ya lo puso, amplíalo; si no, tenlo en cuenta al hacerla.
- La entrada del panel "?" del backlog debe incluir los operadores entre lo que ese panel documentará.
- `CHANGELOG.md`: entrada de cambio funcional, **señalando explícitamente el cambio de comportamiento de R3**.
