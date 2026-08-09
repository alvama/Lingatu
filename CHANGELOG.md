# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [1.1.0] - 2026-08-07

### Cambiado

- Extensión: se retira el permiso `tabs`, innecesario porque todo el uso
  de `chrome.tabs.*` en `background.js` ya queda cubierto por
  `activeTab` y `host_permissions: file:///*`. Reduce la superficie de
  permisos declarada de cara a la publicación en la Chrome Web Store.
- README: documentada la publicación de la extensión en la Chrome Web
  Store (enlace a la ficha, compatibilidad con otros navegadores basados
  en Chromium y aviso de que hay que activar "Permitir acceso a las URL
  de archivo" tras instalarla).

## [1.0.0] - 2026-08-07

Primera versión estable de PinBoard: gestor personal de enlaces en un solo
archivo HTML, sin servidor ni dependencias, con extensión opcional para
Chrome/Edge.

### Añadido

- `pinboard.html` — aplicación principal, funciona con `file://` y guarda
  los datos en `localStorage`.
- Extensión de navegador (Manifest V3) para capturar la pestaña activa y
  añadirla a PinBoard con un clic.
- Importador de marcadores de Chrome/Edge (`tools/`).
- Soporte para Chrome en el importador de marcadores.
- Icono compartido entre la app y la extensión.
- App vacía por defecto al primer uso.

[1.1.0]: https://github.com/alvama/PinBoard/releases/tag/v1.1.0
[1.0.0]: https://github.com/alvama/PinBoard/releases/tag/v1.0.0
