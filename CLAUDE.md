# Convenciones de PinBoard

Instrucciones para trabajar en este repositorio. **Léelas antes de tocar `pinboard.html`.**

La referencia funcional y técnica completa está en [`docs/ESPECIFICACIONES.md`](docs/ESPECIFICACIONES.md): qué hace cada función, por qué está así (sección 7) y qué no se puede romper (sección 8). El backlog priorizado está en su sección 11.

## Restricción de arquitectura (no negociable)

PinBoard es **una única página HTML autocontenida** que se abre directamente desde el disco (`file://`), sin servidor.

- **Un solo archivo**: `pinboard.html`, con CSS y JavaScript embebidos. No lo dividas en varios archivos.
- **Sin dependencias**: ni frameworks, ni librerías, ni CDNs, ni fuentes ni iconos remotos. Los iconos de categoría son SVG inline (`CATEGORY_ICONS`).
- **Sin paso de compilación**: se edita el HTML y se recarga el navegador. No introduzcas npm, bundlers ni transpiladores.
- **Se ejecuta en `file://`**: no puedes hacer `fetch` de archivos locales, ni usar service workers, ni asumir un origen seguro con permisos persistentes. Antes de usar una API del navegador, comprueba que funciona en ese contexto.

Cualquier propuesta que rompa alguno de esos cuatro puntos se rechaza, por buena que sea la funcionalidad.

## Estilo de código

Todo el JavaScript vive dentro de **un único IIFE con `"use strict"`** (`pinboard.html:844`), para no contaminar `window`. La única excepción deliberada es `window.PinBoardBridge`, expuesta al final para la extensión.

El estilo de **sintaxis** es ES5 a propósito. Respétalo aunque tu instinto diga otra cosa:

| Usa | No uses |
|---|---|
| `var` | `let`, `const` |
| `function(){}` | funciones flecha |
| `"a" + b + "c"` | template literals con backticks |
| `function nombre(){}` | `class` |

Las **APIs del DOM sí son modernas** (`Set`, `Array.prototype.find`/`findIndex`, `closest`, `forEach`, `padStart`): la restricción es de sintaxis y legibilidad homogénea, no de compatibilidad con navegadores antiguos.

Comentarios y textos de interfaz, **en español**.

## Seguridad: `escapeHtml` es el único saneador

Todo el HTML se genera concatenando cadenas. **Cualquier dato de usuario que se inserte como HTML pasa por `escapeHtml()`**, sin excepciones: títulos, URLs, descripciones, nombres de categoría, etiquetas, atributos `data-*` y `title`.

Si algún día se decora texto (por ejemplo, un renderizador Markdown), el orden es **escapar primero y decorar después**, nunca al revés.

## Patrones que debes seguir

**Estado → guardar → repintar.** No manipules el DOM a mano para reflejar un cambio. Modifica `state`, llama al `save*()` correspondiente y llama a `render()`, que orquesta `renderSidebar()` + `renderCards()` + los `sync*()`.

**Persistencia por pares.** Cada dato tiene su `loadX()`/`saveX()` y su clave de `localStorage`. Las claves conservan el prefijo heredado `enlaces_` **a propósito**: renombrarlas invalidaría los datos de los usuarios existentes. No las toques.

**Delegación de eventos.** Un listener en el contenedor, `e.target.closest(...)` para localizar el elemento, y atributos `data-action` / `data-id` / `data-target` para transportar la intención. No añadas listeners a elementos que `render()` va a destruir.

**El orden es la posición en el array.** `state.links` y `state.categories` no se ordenan nunca automáticamente: su posición *es* el orden manual del usuario. No introduzcas ningún `.sort()` sobre ellos.

**Modales.** Todo overlay nuevo necesita la regla `[hidden]{display:none}`, porque `.modal-overlay{display:flex}` (CSS de autor) pisa al `hidden` nativo. Ver decisión 1 de la sección 7.

**Normalización centralizada.** `ensureCategory()` / `ensureTag()` son el único punto de verdad para registrar categorías y etiquetas (comparación sin distinguir mayúsculas). Úsalos siempre; no escribas en las listas maestras por tu cuenta.

## Lo que se rompe en silencio

Dos avisos que valen más que el resto de este documento, porque el fallo **no da ningún error**:

1. **El contrato con la extensión** (sección 8 de las especificaciones). Si tocas las fichas de enlace (`.link-card` / `.link-card-compact`, el atributo `data-id`), los ids de campo del formulario (`fieldCategory`, `fieldTitle`, `fieldUrl`, `fieldDescription`) o los métodos del puente, la extensión deja de funcionar sin avisar dentro de la app. Pasa la checklist de verificación manual de esa sección antes de dar el cambio por cerrado.
2. **Los importadores reconstruyen los enlaces campo por campo con lista blanca** (`performImportReplace`, `pinboard.html:2532`, y `performImportMerge`, `pinboard.html:2564`). La exportación usa `JSON.stringify` y por tanto incluye todo, pero **cualquier campo nuevo del modelo de datos se descarta al importar si no lo añades a esas dos funciones**. Es pérdida de datos silenciosa.

## Verificación

**No hay tests automatizados.** La verificación es manual, así que:

- Prueba **los dos modos de vista** (cómoda y compacta): casi toda la UI está duplicada en `cardHtml` y `cardHtmlCompact`.
- Prueba con la lista **vacía**, con **filtros activos** y con **categorías plegadas**.
- Si tocaste fichas o formulario, pasa la checklist de la sección 8.
- Comprueba que no rompiste el arrastrar y soltar ni los botones ▲/▼, que conviven en los mismos elementos.

## Al cerrar un cambio

1. **Actualiza `docs/ESPECIFICACIONES.md`**: la funcionalidad en la sección 4, las funciones nuevas en la 6, y el *por qué* en la 7 si tomaste una decisión no obvia. Ese documento es el activo más valioso del proyecto y solo sigue siéndolo si cada cambio lo mantiene al día.
2. **Actualiza `CHANGELOG.md`** si el cambio es funcional.
3. **Quita del backlog** (sección 11) la entrada que acabas de implementar.

Rama de trabajo: `master`, sin pull request.
