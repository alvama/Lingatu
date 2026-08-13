# PinBoard

Gestor personal de enlaces de un solo archivo HTML, sin servidor ni
dependencias, más una extensión de navegador opcional que captura la pestaña
activa y la añade con un clic.

- **`pinboard.html`** — la aplicación. Se abre directamente en el navegador
  (`file://`), guarda los datos en `localStorage` y no requiere instalación
  ni conexión a internet (salvo para los favicons).
- **`extension/`** — [extensión publicada en la Chrome Web Store](https://chromewebstore.google.com/detail/pinboard-connector/kljfmjpiflhpedkbcldmkomhmepnimdl)
  (Manifest V3, también compatible con otros navegadores basados en Chromium
  como Edge o Brave) que captura la URL, el título y la descripción de la
  pestaña activa, comprueba si ya existe en PinBoard y, si no, abre el
  formulario de alta precargado con una categoría sugerida.

## Funcionalidades

- **Enlaces**: alta/edición/borrado, duplicar con un clic, reordenar
  manualmente (drag & drop o botones ▲/▼), favicon automático.
- **Categorías**: crear, renombrar, eliminar y reordenar (drag & drop o
  ▲/▼); color e icono propios (56 iconos a elegir); selección múltiple en
  el sidebar con Ctrl+clic; exportar/importar el conjunto completo de
  categorías (nombre, icono, color y posición) por separado de los
  enlaces.
- **Etiquetas**: editor de chips con autocompletado (sugiere y reutiliza
  las ya existentes mientras escribes, sin dejar de admitir crear una
  nueva libremente), color propio, filtrado por inclusión y exclusión
  (clic / clic de nuevo / clic otra vez — ciclo de 3 estados), icono de
  escoba para limpiar la selección de golpe.
- **Vistas guardadas**: guardar la combinación activa de categorías y
  etiquetas incluidas/excluidas con un nombre y volver a aplicarla con un
  clic. Una vista también puede ser **una lista concreta de enlaces**,
  creada desde el modo selección con "Crear vista".
- **Notas por enlace**: texto largo que se acumula con el tiempo (cada
  anotación entra como un bloque nuevo con su fecha, nunca se sobrescribe
  lo anterior), escrito en Markdown y **formateado al leerlo** en un visor
  de solo lectura —encabezados, citas, listas, negrita, cursiva y bloques
  de código con botón para copiarlos—. Se pueden capturar desde cualquier
  página con el menú del clic derecho de la extensión, y **la búsqueda las
  encuentra**.
- **Búsqueda y filtros combinables**, con exportación que respeta la
  selección activa (categoría, etiquetas o los enlaces de una vista) en
  vez de exportar siempre todo.
- **Dos modos de vista**: cómoda (con barra de color y URL bajo el
  título) y compacta.
- **Exportar/Importar enlaces** en JSON, con opción de fusionar
  (deduplicando por URL) o sustituir todo.
- **Importar marcadores de cualquier navegador**: arrastra sobre la página
  (o usa el botón "Importar") el HTML que exporta cualquier navegador o el
  `Bookmarks` de Chrome/Edge, sin herramientas externas.
- **Selección múltiple de enlaces y acciones en lote**: modo "Seleccionar"
  para etiquetar, cambiar de categoría, activar, desactivar, eliminar o
  guardar como vista varios enlaces a la vez.
- **Paleta de comandos** (`Ctrl+K`/`Cmd+K`): busca a la vez acciones,
  enlaces, categorías, vistas y etiquetas desde un único desplegable.
- Modo oscuro automático, atajos de teclado (`/` buscar, `n` nuevo
  enlace), título de la página personalizable.
- Cero servidor, cero cuentas: todo vive en `localStorage` de tu
  navegador.

Detalle técnico completo en
[`docs/ESPECIFICACIONES.md`](docs/ESPECIFICACIONES.md).

## Instalación de la app

1. Descarga o clona este repositorio.
2. Abre `pinboard.html` directamente en tu navegador (doble clic, o
   arrástralo a una pestaña).
3. Ya está — todos los datos se guardan localmente en el navegador
   (`localStorage`), no hay nada más que configurar.

PinBoard empieza completamente vacío. Si quieres ver la app con contenido de
muestra, usa el botón **"Importar"** y selecciona
[`examples/ejemplo-enlaces.json`](examples/ejemplo-enlaces.json).

Para pasar tus marcadores de cualquier navegador a PinBoard, la vía
recomendada es exportarlos y soltar el archivo sobre la página:

1. En tu navegador, exporta los marcadores a HTML (en Chrome/Edge:
   `Ctrl+Shift+O` → menú "⋮" → **Exportar marcadores**).
2. Arrastra ese archivo `.html` sobre `pinboard.html` (o pulsa el botón
   "Importar" y selecciónalo). PinBoard reconoce el formato
   automáticamente, respeta la estructura de carpetas como categorías
   (unidas con `" / "`) y abre el modal de siempre para elegir entre
   fusionar o sustituir.

También reconoce directamente el archivo `Bookmarks` de Chrome/Edge (sin
extensión), por si lo tienes más a mano que exportar.

`tools/` sigue disponible como alternativa **opcional**, útil sobre todo
para convertir varios perfiles/navegadores de golpe desde la línea de
comandos sin pasar por el navegador:

1. Abre `tools/configurar_marcadores.html` en el navegador y rellena, para
   cada perfil que quieras importar, el navegador y la ruta completa a su
   archivo `Bookmarks` (la propia página indica dónde suele estar en
   Windows/macOS/Linux), más la ruta donde quieres el JSON de salida.
2. Pulsa "Generar marcadores_config.json" y guarda el archivo descargado
   junto a `tools/convertir_marcadores.py`.
3. Ejecuta `python tools/convertir_marcadores.py` — genera el JSON indicado,
   listo para cargarlo con el botón "Importar" de la app.

Ni el script ni la página de configuración llevan ninguna ruta escrita de
antemano: todo sale del `marcadores_config.json` que generas tú (que no se
versiona, por contener rutas de tu máquina).

## Instalación de la extensión (Chrome / Edge / navegadores basados en Chromium)

La extensión está publicada en la Chrome Web Store:

**[PinBoard Connector](https://chromewebstore.google.com/detail/pinboard-connector/kljfmjpiflhpedkbcldmkomhmepnimdl)**

Al estar basada en Manifest V3 y no usar APIs exclusivas de Chrome, también
funciona en otros navegadores basados en Chromium (Edge, Brave, Opera...)
instalándola desde esa misma URL o cargándola en modo desarrollador (ver más
abajo).

Tras instalarla, **es imprescindible** activar el acceso a archivos locales,
ya que `pinboard.html` se abre como `file://`:

1. Ve a `chrome://extensions` (o `edge://extensions`, etc.).
2. Busca la tarjeta de **PinBoard Connector** y entra en **"Detalles"**.
3. Activa **"Permitir acceso a las URL de archivo"**.

Sin este paso, la extensión no podrá detectar ni abrir tu `pinboard.html`.

### Instalación en modo desarrollador (alternativa)

Si prefieres instalar la extensión directamente desde este repositorio (por
ejemplo, para modificar el código):

1. Ve a `chrome://extensions` (Chrome) o `edge://extensions` (Edge).
2. Activa **"Modo de desarrollador"**.
3. Pulsa **"Cargar descomprimida"** y selecciona la carpeta `extension/` de
   este repositorio.
4. En la tarjeta de la extensión, entra en **"Detalles"** y activa
   **"Permitir acceso a las URL de archivo"**.

### Configurar la extensión

1. Abre tu `pinboard.html` normalmente en el navegador y copia la URL
   completa de la barra de direcciones (empieza por `file:///`).
2. Clic derecho sobre el icono de la extensión → **"Opciones"** (o
   `chrome://extensions` → tarjeta de la extensión → "Opciones de la
   extensión").
3. Pega la URL y pulsa **Guardar**.

### Uso

Con `pinboard.html` ya configurado, en cualquier página pulsa el icono de la
extensión (o usa el menú del clic derecho → **"Guardar en PinBoard"**, que
hace exactamente lo mismo):

- Si la URL ya está guardada en PinBoard, se abre/enfoca la pestaña de
  PinBoard y resalta brevemente el enlace existente.
- Si no existe, abre el formulario de alta con la categoría, el título, la
  URL y la descripción precargados (la categoría es solo una sugerencia,
  siempre editable antes de guardar).

**Guardar una cita como nota**: selecciona texto en cualquier página y usa el
menú del clic derecho → **"Añadir selección como nota en PinBoard"**. Se
guarda como cita, con la fecha del día, en las notas de ese enlace.

- Si la página **ya está** en PinBoard, la nota se añade sin cambiar de
  pestaña: sigues leyendo, y un aviso en la esquina superior derecha confirma
  a qué enlace ha ido y cuántas notas lleva ya. Cada nota nueva se añade al
  final, sin borrar las anteriores.
- Si **no está**, se abre PinBoard con el formulario de alta y la nota ya
  puesta, para que confirmes el alta como siempre.

## Estructura del repositorio

```
PinBoard/
├── pinboard.html                 # Aplicación principal
├── extension/                    # Extensión de navegador (Chrome/Edge)
│   ├── manifest.json
│   ├── background.js
│   ├── options.html / options.js
│   └── icons/
├── tools/                         # Opcional: conversión por lotes desde la
│   │                              # línea de comandos (la vía recomendada es
│   │                              # arrastrar el HTML exportado del navegador)
│   ├── convertir_marcadores.py       # Convierte varios perfiles Chrome/Edge de golpe
│   ├── configurar_marcadores.html    # Genera marcadores_config.json
│   └── marcadores_config.example.json
├── examples/
│   └── ejemplo-enlaces.json      # Datos de muestra para "Importar"
├── docs/
│   └── ESPECIFICACIONES.md       # Documentación técnica detallada
├── README.md
├── CHANGELOG.md
└── LICENSE
```

Más detalle técnico (modelo de datos, decisiones de diseño, limitaciones
conocidas) en [`docs/ESPECIFICACIONES.md`](docs/ESPECIFICACIONES.md).

## Versionado

- La versión de la app se muestra en el pie de la barra lateral de
  `pinboard.html` (constante `APP_CONFIG.version` en el propio archivo).
- La versión de la extensión se muestra en su página de opciones, tomada
  directamente de `manifest.json`.
- El historial de cambios de cada versión se documenta en
  [`CHANGELOG.md`](CHANGELOG.md).
- Última versión publicada: [v1.8.0](https://github.com/alvama/PinBoard/releases/tag/v1.8.0)
  ([todos los releases](https://github.com/alvama/PinBoard/releases)).

## Licencia

[MIT](LICENSE) © 2026 A. Vazquez ([NLevia.org](https://www.nlevia.org))
