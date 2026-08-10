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

## Instalación de la app

1. Descarga o clona este repositorio.
2. Abre `pinboard.html` directamente en tu navegador (doble clic, o
   arrástralo a una pestaña).
3. Ya está — todos los datos se guardan localmente en el navegador
   (`localStorage`), no hay nada más que configurar.

PinBoard empieza completamente vacío. Si quieres ver la app con contenido de
muestra, usa el botón **"Importar"** y selecciona
[`examples/ejemplo-enlaces.json`](examples/ejemplo-enlaces.json).

Para pasar tus marcadores de Chrome y/o Edge a PinBoard:

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
extensión:

- Si la URL ya está guardada en PinBoard, se abre/enfoca la pestaña de
  PinBoard y resalta brevemente el enlace existente.
- Si no existe, abre el formulario de alta con la categoría, el título, la
  URL y la descripción precargados (la categoría es solo una sugerencia,
  siempre editable antes de guardar).

## Estructura del repositorio

```
PinBoard/
├── pinboard.html                 # Aplicación principal
├── extension/                    # Extensión de navegador (Chrome/Edge)
│   ├── manifest.json
│   ├── background.js
│   ├── options.html / options.js
│   └── icons/
├── tools/
│   ├── convertir_marcadores.py       # Importar marcadores de Chrome/Edge
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
- Última versión publicada: [v1.2.0](https://github.com/alvama/PinBoard/releases/tag/v1.2.0)
  ([todos los releases](https://github.com/alvama/PinBoard/releases)).

## Licencia

[MIT](LICENSE) © 2026 Alberto Vázquez Martín ([NLevia.org](https://www.nlevia.org))
