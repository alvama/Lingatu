# PinBoard

Gestor personal de enlaces de un solo archivo HTML, sin servidor ni
dependencias, más una extensión de navegador opcional que captura la pestaña
activa y la añade con un clic.

- **`pinboard.html`** — la aplicación. Se abre directamente en el navegador
  (`file://`), guarda los datos en `localStorage` y no requiere instalación
  ni conexión a internet (salvo para los favicons).
- **`extension/`** — extensión para Chrome/Edge (Manifest V3) que captura la
  URL, el título y la descripción de la pestaña activa, comprueba si ya
  existe en PinBoard y, si no, abre el formulario de alta precargado con una
  categoría sugerida.

## Instalación de la app

1. Descarga o clona este repositorio.
2. Abre `pinboard.html` directamente en tu navegador (doble clic, o
   arrástralo a una pestaña).
3. Ya está — todos los datos se guardan localmente en el navegador
   (`localStorage`), no hay nada más que configurar.

Para pasar tus marcadores de Microsoft Edge a PinBoard, hay un script de
apoyo en `tools/convertir_marcadores.py` (ver cabecera del archivo); genera
un `marcadores_edge.json` que se puede cargar con el botón "Importar" de la
app.

## Instalación de la extensión (Chrome / Edge)

La extensión no está publicada en ninguna tienda; se instala en modo
desarrollador:

1. Ve a `chrome://extensions` (Chrome) o `edge://extensions` (Edge).
2. Activa **"Modo de desarrollador"**.
3. Pulsa **"Cargar descomprimida"** y selecciona la carpeta `extension/` de
   este repositorio.
4. En la tarjeta de la extensión, entra en **"Detalles"** y activa
   **"Permitir acceso a las URL de archivo"** (necesario porque
   `pinboard.html` se abre como `file://`).

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
├── pinboard.html              # Aplicación principal
├── extension/                 # Extensión de navegador (Chrome/Edge)
│   ├── manifest.json
│   ├── background.js
│   ├── options.html / options.js
│   └── icons/
├── tools/
│   └── convertir_marcadores.py   # Importar marcadores de Edge
├── docs/
│   └── ESPECIFICACIONES.md       # Documentación técnica detallada
├── README.md
└── LICENSE
```

Más detalle técnico (modelo de datos, decisiones de diseño, limitaciones
conocidas) en [`docs/ESPECIFICACIONES.md`](docs/ESPECIFICACIONES.md).

## Versionado

- La versión de la app se muestra en el pie de la barra lateral de
  `pinboard.html` (constante `APP_CONFIG.version` en el propio archivo).
- La versión de la extensión se muestra en su página de opciones, tomada
  directamente de `manifest.json`.

## Licencia

[MIT](LICENSE) © 2026 Alberto Vázquez Martín
