# Tarea 09 — Panel de ayuda "?" con la chuleta de atajos y gestos

**Prioridad**: Alta, **a acometer después de la paleta de comandos** (tarea 04) · **Esfuerzo estimado**: ~2-3 h, de las que la mayor parte es redacción · **Riesgo**: bajo (todo es contenido estático)

Antes de empezar, lee [`CLAUDE.md`](../../CLAUDE.md) y el diagnóstico completo de la **sección 11.5** de [`ESPECIFICACIONES.md`](../ESPECIFICACIONES.md).

## Objetivo

PinBoard no tiene un problema de documentación, tiene un problema de **descubribilidad**: acumula funciones potentes que nada en pantalla insinúa. Esta tarea las hace visibles desde dentro de la app, en una pantalla.

**Por qué embebido y no en el repositorio**: la ayuda alojada en GitHub no se puede leer desde la app, que corre en `file://`. La ayuda embebida **viaja dentro del archivo** — y eso importa especialmente si se implementa la exportación autocontenida (11.6) y los archivos empiezan a pasar de mano en mano. Un `pinboard.html` que alguien te pasa y se explica solo es un producto; uno que remite a un repositorio, no.

## Dependencia con la tarea 04

**La paleta de comandos ya documenta las *acciones* por su nombre**, así que este panel solo tiene que cubrir lo que una paleta no puede: los **gestos**, los **filtros** y el comportamiento de los **datos**. Eso es lo que hace que quepa en una pantalla en lugar de convertirse en un manual.

- **Si la tarea 04 está hecha**: no repitas la lista de acciones. Menciona `Ctrl+K` como la vía para todo lo demás y céntrate en los tres bloques de gestos, filtros y datos.
- **Si no está hecha**: añade un cuarto bloque con las acciones principales, y **déjalo marcado en el propio código con un comentario** para poder quitarlo cuando la paleta llegue. Sin esa marca, quedará duplicado para siempre.

---

## R1 — Apertura y cierre

**R1.1** Se abre con la tecla **`?`**. Está libre: el manejador de atajos actual compara `e.key === "/"` (`pinboard.html:2490`), y al pulsar Mayús+7 la tecla que llega es `?`, no `/`.

**R1.2** Se ignora con las mismas condiciones que `/` y `n` (decisión 15 de la sección 7): **mientras se escribe** en un campo de texto o elemento editable, y **con cualquier overlay abierto**.

**R1.3 — Además del atajo, un control visible.** El pie del sidebar (`#appFooter`) o junto al título. Una ayuda a la que solo se llega por un atajo que nadie te ha contado no ayuda a nadie: es el mismo razonamiento que el control visible de la paleta.

**R1.4** Overlay nuevo: necesita su regla `[hidden]{display:none}` (decisión 1) y quedar registrado en la comprobación de overlays abiertos — en `anyOverlayOpen()` si la tarea 04 ya la creó, o en **las dos listas escritas a mano** (`pinboard.html:1786-1791` y `:2493`) si no.

**R1.5** Si la paleta existe, añade **"Ayuda: atajos y gestos" como un comando más** del registro. Cierra el círculo: la paleta lleva a la ayuda y la ayuda remite a la paleta.

---

## R2 — Estructura del contenido

**R2.1** Todo el contenido vive en **un único array `HELP_SECTIONS` en el JS**, junto al código. Es la mitigación de su coste real de mantenimiento: cada función nueva pide su línea, y tiene que haber **un solo sitio** donde añadirla.

**R2.2 — Conductual y corto, nunca un espejo de este documento.** `ESPECIFICACIONES.md` es documentación de desarrollo y debe seguir siéndolo. Aquí se describe **qué puede hacer el usuario y cómo**, no cómo está implementado ni por qué.

**R2.3** Regla práctica de redacción: **una línea por cosa**. Si algo necesita un párrafo para explicarse, probablemente el problema esté en la interfaz y no en la ayuda — anótalo como candidato a mejora en vez de escribir un párrafo.

**R2.4** El contenido es texto de autor, no datos del usuario, así que no necesita `escapeHtml()`. **No interpoles nada dinámico**: mantenlo estático.

---

## R3 — Inventario de lo que hay que documentar

Esta es la parte de valor de la tarea. Está sacado de las especificaciones para que no haya que redescubrirlo, y **lo marcado con ★ es lo que hoy es indescubrible**.

### Atajos

- `/` enfoca el buscador · `n` crea un enlace · `?` abre esta ayuda.
- `Ctrl+K` abre la paleta de comandos (si la tarea 04 está hecha).
- `Escape` cierra el modal abierto.
- En el campo de Etiquetas: Enter, espacio o coma confirman una etiqueta; Backspace con el campo vacío quita la última; las flechas navegan las sugerencias. ★

### Gestos — el bloque más importante, porque es lo que una paleta no puede documentar

- Arrastrar una ficha **sobre otra** la coloca justo antes. ★
- Arrastrar una ficha **sobre la cabecera de un grupo** (o sobre su hueco vacío, incluso plegado) la manda al final de esa categoría. ★
- Arrastrar una ficha **a otra categoría** además le cambia la categoría — **así es como se mueve un enlace de categoría**. ★
- Los botones ▲/▼ mueven un solo puesto dentro de lo que estás viendo.
- Arrastrar una **categoría** en el lateral la reordena, y puede moverla varias posiciones de golpe (los ▲/▼ del modal solo la intercambian con la vecina). ★
- Soltar una categoría sobre **"Todas"** la manda al principio. ★
- Pulsar la **cabecera de un grupo** lo pliega o despliega, y se recuerda entre sesiones. ★
- En pantalla táctil el arrastre no funciona (es una API de ratón): usa ▲/▼, que sí responden al toque.

### Filtros

- **Una etiqueta del lateral cicla por tres estados al pulsarla: neutra → incluida → excluida.** ★ **Es la función más indescubrible de la app**: nadie pulsa tres veces en el mismo sitio para ver qué pasa. Si solo se documenta una cosa, es esta.
- Las etiquetas **de las fichas** no ciclan: solo activan o desactivan la inclusión. ★
- **Ctrl+clic** (o Cmd+clic) en una categoría selecciona varias a la vez. ★
- Un clic normal en una categoría sustituye la selección; volver a pulsarla la quita. "Todas" limpia el filtro de categoría.
- La escoba 🧹 limpia de golpe las etiquetas incluidas **y** las excluidas.
- **Las etiquetas excluidas se mantienen entre sesiones; las incluidas no.** ★ Es a propósito, pero sorprende si no se sabe.
- Una **Vista** guarda las dos cosas: las etiquetas incluidas y las excluidas.
- Los operadores de búsqueda, si la tarea 05 está hecha.

### Datos

- **Con un filtro puesto, "Exportar" exporta solo lo filtrado**, y avisa antes. ★
- Al importar: **Fusionar** añade lo que no tengas (comparando por URL) y **Sustituir todo** reemplaza; la segunda no se puede deshacer.
- Las categorías se exportan e importan **aparte**, desde su modal de gestión. ★
- **Tus datos viven solo en este navegador y en este equipo.** No se sincronizan. Exportar es el mecanismo de respaldo, y borrar los datos del sitio en el navegador los elimina. ★ Es lo más importante que un usuario nuevo debería saber.

---

## Fuera de alcance

- **Tour interactivo guiado**: descartado (11.2). Uno o dos días de trabajo, los usuarios lo saltan y en un archivo único envejece mal.
- Mensajes de ayuda contextuales que aparezcan solos, o globos de "¿sabías que...?".
- Vídeos, imágenes o GIFs: harían crecer el archivo, y hay que inlinearlos.
- Traducciones: la app es en español.
- Duplicar aquí las decisiones de diseño de la sección 7: eso es documentación de desarrollo.
- Los `title` de los controles: son la tarea 01.

## Invariantes: no toques esto

1. **No cambies el comportamiento de `/` ni de `n`**, ni las condiciones bajo las que se ignoran.
2. **No conviertas esto en un espejo de `ESPECIFICACIONES.md`.** Si el panel crece más allá de unas pocas pantallas, la tarea ha fallado en su propósito.
3. **Un solo sitio para el contenido** (R2.1). Contenido repartido entre el HTML y el JS garantiza que uno de los dos se quede obsoleto.
4. Esta tarea **no toca la superficie protegida de la sección 8** ni el modelo de datos.
5. Sintaxis ES5.

## Checklist de verificación manual

- [ ] `?` abre el panel.
- [ ] `?` **no** hace nada mientras se escribe en el buscador, en el título de un enlace o en la descripción.
- [ ] `?` **no** hace nada con un modal abierto.
- [ ] `Escape` cierra el panel, y el clic en el fondo también.
- [ ] El control visible de R1.3 lo abre.
- [ ] Si la paleta existe, "Ayuda" aparece como comando y lo abre.
- [ ] **Cada afirmación del panel es cierta**: recórrelas una a una probándolas en la app. Una ayuda con un dato falso es peor que no tenerla.
- [ ] El triple estado de las etiquetas está documentado y descrito con exactitud.
- [ ] El panel se lee en una ventana estrecha (por debajo de 780px) sin desbordarse.
- [ ] Con contenido largo, el panel se desplaza por dentro.
- [ ] Probado en **los dos modos de vista** (aunque el panel sea independiente de ellos).

## Al cerrar

- `ESPECIFICACIONES.md`: describir el panel en la sección 4, `HELP_SECTIONS` en la 6, y **quitar la entrada del backlog** (11.1). Actualizar 11.5 con lo realmente implementado.
- **Regla nueva y permanente**: a partir de aquí, **cualquier tarea que añada un atajo, un gesto o un comportamiento de filtro tiene que añadir su línea a `HELP_SECTIONS`**. Está recogido en `CLAUDE.md`, en el apartado de cierre de cambios.
- `CHANGELOG.md`: entrada de cambio funcional.
