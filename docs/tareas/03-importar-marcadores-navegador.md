# Tarea 03 — Importar marcadores del navegador arrastrando el archivo

**Prioridad**: Alta · **Esfuerzo estimado**: ~60-80 líneas de parseo + el manejador de soltar · **Riesgo**: medio (un requisito de seguridad crítico, R1)

Antes de empezar, lee [`CLAUDE.md`](../../CLAUDE.md). Contexto en la sección 11.1 de [`ESPECIFICACIONES.md`](../ESPECIFICACIONES.md), y el flujo de importación actual en la 4.7.

## Objetivo

Poder soltar sobre la página el archivo de marcadores de cualquier navegador y que PinBoard lo entienda, sin herramientas externas.

Hoy el camino para un usuario nuevo con marcadores que quiere migrar es: instalar Python, ejecutar `tools/convertir_marcadores.py`, y —como escribir su JSON de configuración a mano es incómodo— usar además `tools/configurar_marcadores.html` para generarlo. Tres piezas y un intérprete externo para algo que el navegador hace con `DOMParser`.

**Esta es la única tarea del backlog que deja el proyecto más simple que antes**: al terminarla, `tools/` pasa a ser opcional.

---

## Requisitos

### R1 — Impedir que el navegador abra el archivo soltado (crítico)

**Este requisito va primero porque su incumplimiento destruye la sesión de trabajo del usuario.**

Los manejadores de arrastre existentes sobre `#linksContainer` empiezan los dos con `if(!draggedLinkId) return;` (`pinboard.html:2296` y `2310`), así que **un arrastre externo nunca llega a `preventDefault()`**. La acción por defecto del navegador al soltar un archivo sobre una página es **navegar a ese archivo**: la app desaparece, reemplazada por el volcado del fichero de marcadores.

Requisitos:

- **R1.1** Manejadores `dragover` y `drop` a nivel de `document` que llamen a `preventDefault()` para cualquier arrastre externo, de modo que soltar un archivo **en cualquier parte de la página** nunca navegue. Incluye el caso de soltar un archivo que no sabemos interpretar: primero se impide la navegación, después se avisa del error.
- **R1.2** Esos manejadores **no deben interferir con los arrastres internos**, que son dos: fichas de enlace (`draggedLinkId`) y categorías del lateral. Si hay un arrastre interno en curso, el manejador de `document` no hace nada y deja actuar a los de `#linksContainer` / `#categoryList`.
- **R1.3** Distinguir el tipo de arrastre externo por su contenido: `e.dataTransfer.files.length > 0` es un archivo. **Deja el camino despejado** para que la tarea de "arrastrar una URL desde otra ventana" (backlog, prioridad media) pueda añadir después la rama de `text/uri-list` sin rehacer esto.
- **R1.4** Alguna indicación visual mientras se arrastra un archivo sobre la página, coherente con las clases `.drag-over` que ya se usan.

### R2 — Formatos que hay que reconocer

**R2.1 Netscape Bookmark HTML** — el que exporta cualquier navegador (Ctrl+Shift+O → Exportar). Estructura:

```html
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
    <DT><H3 ADD_DATE="...">Nombre de carpeta</H3>
    <DL><p>
        <DT><A HREF="https://ejemplo.com" ADD_DATE="...">Título</A>
        <DD>Descripción opcional
    </DL><p>
</DL><p>
```

Es **HTML deliberadamente mal formado** (`<DT>` y `<p>` sin cerrar), y por eso hay que parsearlo con `DOMParser` y no con expresiones regulares: un parser de HTML real ya sabe reconstruir esa estructura, y las regex se rompen con cualquier variación entre navegadores.

Para obtener la ruta de carpetas de cada marcador, lo robusto es **partir de cada `A[href]` y subir por sus ancestros `<DL>`**, tomando para cada uno el `<H3>` que lo precede (que puede venir dentro de un `<DT>` o directamente como hermano anterior), y recorrer al revés lo recogido. No dependas de que `DOMParser` anide los `<DT>` de una forma concreta.

**R2.2 `Bookmarks` de Chromium** (Chrome/Edge) — archivo JSON **sin extensión**. Estructura: objeto raíz con `roots`, cuyos valores son nodos carpeta; cada nodo tiene `type` (`"url"` o `"folder"`), `name`, y `url` o `children`.

Replica la lógica ya probada de `tools/convertir_marcadores.py:16-41`, que es la referencia de comportamiento:
- Solo `type === "url"` con URL que empiece por `http://` o `https://`.
- El nombre de cada carpeta se acumula en la ruta; las carpetas sin nombre no añaden nivel.
- `category` = la ruta unida con `" / "`, o `"Sin categoría"` si la ruta queda vacía.
- `title` = `name`, o la URL si el nombre está vacío.

**R2.3 Enrutado por contenido, no por extensión** — porque el `Bookmarks` de Chromium no tiene extensión. Sobre el texto ya leído y con `trim()`:

| Empieza por / contiene | Formato |
|---|---|
| `[` | JSON de PinBoard — comportamiento actual, sin cambios |
| `{` con una clave `roots` | `Bookmarks` de Chromium |
| `NETSCAPE-Bookmark` o `<DL` | Netscape HTML |
| cualquier otra cosa | error claro al usuario |

**R2.4** Extender también el `accept` de `#fileImport` (`pinboard.html:723`, hoy `application/json`) para que el botón "Importar" acepte los formatos nuevos. **El arrastre no puede ser la única vía**: sería una función indescubrible, justo el problema que ataca la tarea 01.

### R3 — Desembocar en el flujo de importación que ya existe

**R3.1** El resultado del parseo es un array de objetos con la **misma forma** que el JSON de PinBoard (`category`, `title`, `url`, `description`, `active`, `tags`), para que `performImportMerge` / `performImportReplace` lo consuman sin cambios.

**R3.2** Reutiliza el modal de importación (`#importModalOverlay`, con Fusionar / Sustituir todo / Cancelar) y su resumen `#importSummary`. **Extrae a una función la parte compartida** del listener actual de `fileImport` (`pinboard.html:2593-2614`) —validar, rellenar el resumen, abrir el modal, asignar `pendingImportData`— y llámala tanto desde el selector de archivo como desde el soltar. No dupliques ese bloque.

**R3.3** El resumen del modal debería indicar de qué formato se ha reconocido el archivo, además del recuento que ya muestra.

**R3.4 Deduplicar dentro del propio archivo**, quedándose con la primera aparición (así gana su carpeta). `performImportMerge` ya deduplica contra los enlaces existentes, pero no contra sí mismo: sin esto, "Sustituir todo" crearía duplicados, porque un mismo marcador puede estar en dos carpetas. Usa un objeto como mapa para no hacer una búsqueda lineal por entrada — un archivo real puede traer miles de marcadores.

**R3.5** Descarta en silencio lo que no es un marcador web navegable: `javascript:` (bookmarklets), `chrome://`, `edge://`, `about:`, `place:`, y las carpetas vacías. No son errores, no merecen aviso.

---

## Fuera de alcance

- **Exportar** a Netscape HTML: es otra entrada del backlog (prioridad baja). Al terminar las dos, PinBoard queda round-trip compatible con todos los navegadores, pero son tareas separadas.
- **Arrastrar una URL** desde otra ventana: entrada aparte (prioridad media). Esta tarea solo debe dejarle el hueco preparado (R1.3).
- El backup JSON comprimido de Firefox (`.jsonlz4`): requiere descomprimir LZ4, y Firefox exporta igualmente en Netscape HTML, que sí se cubre.
- Aprovechar `ADD_DATE`, `ICON` o las etiquetas propias del archivo: se ignoran.
- **Borrar `tools/`**: esta tarea lo vuelve opcional, no lo elimina. Es una decisión posterior.

## Invariantes: no toques esto

1. **El comportamiento actual del botón "Importar" con un JSON de PinBoard debe quedar idéntico**, incluida la validación (`category`, `title`, `url` en cada elemento) y los mensajes de error.
2. **No cambies la semántica de `performImportMerge` ni de `performImportReplace`.** Recuerda que reconstruyen los enlaces con lista blanca de campos (ver `CLAUDE.md`): esta tarea no añade campos nuevos, pero no los "arregles" de paso.
3. **El arrastrar y soltar interno debe seguir intacto**: reordenar fichas, moverlas de categoría, y reordenar categorías en el lateral.
4. **Parsea con `DOMParser.parseFromString(texto, "text/html")`**, que no ejecuta scripts. **Nunca metas el contenido del archivo en un `innerHTML`** para parsearlo: el archivo es contenido no confiable.
5. Los títulos de los marcadores son texto arbitrario y pueden contener `<`, `&` o comillas. Siguen el camino normal (`escapeHtml` al pintar), así que no requieren tratamiento especial — pero **no los insertes como HTML** en ningún punto del flujo de importación. El resumen del modal usa `textContent`; que siga así.
6. Sintaxis ES5 y sin dependencias: no añadas ninguna librería de parseo.

## Checklist de verificación manual

**El requisito crítico:**

- [ ] Soltar un archivo de marcadores sobre la página: **la app sigue en pantalla**, no la reemplaza el contenido del archivo.
- [ ] Soltar un archivo que no se puede interpretar (una imagen, un `.txt` cualquiera): la app sigue en pantalla y muestra un error claro.
- [ ] Soltar un archivo **fuera** de `#linksContainer` (sobre el lateral, sobre la barra de herramientas): mismo comportamiento, sin navegación.

**Formatos:**

- [ ] Exportar marcadores de Chrome o Edge (Ctrl+Shift+O → Exportar) y soltar el HTML: el modal indica el recuento, y al fusionar las carpetas aparecen como categorías con la ruta unida por `" / "`.
- [ ] El mismo archivo, importado con el botón "Importar" en lugar de arrastrando: resultado idéntico.
- [ ] Soltar un `Bookmarks` de Chromium (sin extensión): funciona.
- [ ] Soltar un JSON de PinBoard exportado por la propia app: **comportamiento de siempre**.
- [ ] Un archivo de marcadores con carpetas anidadas a tres niveles: la categoría refleja la ruta completa.
- [ ] Marcadores en la raíz, sin carpeta: caen en `"Sin categoría"`.
- [ ] Un archivo con la misma URL en dos carpetas distintas: entra una sola vez.
- [ ] Un archivo con bookmarklets (`javascript:`) o `chrome://`: se omiten sin error.
- [ ] Un marcador cuyo título contenga `<script>alert(1)</script>` o `&`: se ve como texto literal en la ficha, sin ejecutarse ni romper el HTML.

**Regresiones:**

- [ ] Arrastrar una ficha sobre otra sigue reordenando.
- [ ] Arrastrar una ficha a otra categoría sigue cambiándole la categoría.
- [ ] Arrastrar una categoría en el lateral sigue reordenándola.
- [ ] "Sustituir todo" y "Fusionar" siguen funcionando igual con un JSON de PinBoard.
- [ ] Probado en **los dos modos de vista**.

## Al cerrar

- `ESPECIFICACIONES.md`: ampliar la 4.7 con los formatos nuevos y el arrastre, añadir las funciones de parseo a la tabla de la 6, y **quitar la entrada del backlog** (11.1).
- **`README.md` y la sección 9**: indicar que `tools/` es ahora **opcional** — la vía recomendada para migrar marcadores es exportarlos del navegador y soltarlos en la página. Es la mitad del valor de esta tarea y se pierde si la documentación sigue enviando al script de Python.
- `CHANGELOG.md`: entrada de cambio funcional.
