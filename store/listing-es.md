# Ficha de la Chrome Web Store — PinBoard Connector

Fuente única de verdad para copiar/pegar en el Developer Dashboard
(`chrome.google.com/webstore/devconsole`). Versión del paquete: **1.1.0**
(`store/PinBoard-Connector-v1.1.0.zip`, generado con
`tools/empaquetar_extension.py`).

## Store listing

**Nombre** (ya coincide con `manifest.json`, no hace falta cambiarlo):
PinBoard Connector

**Descripción corta** (132 car. máx. — 116 usados):
Añade la pestaña activa a tu PinBoard local con un clic: detecta duplicados y sugiere categoría automáticamente.

**Descripción detallada:**

PinBoard Connector es el complemento de navegador para PinBoard
(https://github.com/alvama/PinBoard), un gestor personal de enlaces que vive
en un único archivo HTML, sin servidor, sin cuentas y sin sincronización en
la nube: todos tus enlaces se guardan en el almacenamiento local de tu
propio navegador.

Esta extensión no funciona por sí sola: necesita que abras tu copia de
pinboard.html (normalmente como archivo local, file://) y que indiques su
URL una vez en la página de opciones de la extensión.

Qué hace al pulsar el icono:
- Captura el título, la URL y la meta-descripción de la pestaña activa.
- Busca o abre la pestaña donde tienes cargado tu pinboard.html.
- Si esa URL ya existe en tu PinBoard, enfoca la pestaña y resalta el
  enlace existente (evita duplicados).
- Si no existe, abre el formulario de alta de PinBoard ya relleno con el
  título, la URL, la descripción y una categoría sugerida automáticamente
  — tú decides si guardarlo, editarlo o cancelarlo.

Qué NO hace:
- No envía datos a ningún servidor propio ni de terceros. No hay
  analítica, cuentas, anuncios ni telemetría.
- No lee ni modifica páginas salvo la pestaña activa en el momento del
  clic y la propia pestaña de pinboard.html.
- Solo guarda, en el almacenamiento local de la extensión, la URL file://
  de tu pinboard.html que tú configuras.

Requiere tener tu propia copia de pinboard.html (incluida gratis y con
licencia MIT en https://github.com/alvama/PinBoard) abierta en el
navegador. Código fuente completo, sin minificar, disponible en el
repositorio.

**Categoría:** Productividad (Productivity)
**Idioma de la ficha:** Español
**Visibilidad:** No listada (Unlisted)

## Privacy practices

**Single purpose:**

El único propósito de esta extensión es capturar el título, la URL y la
descripción de la pestaña activa y pasarlos a la propia página web
pinboard.html del usuario (abierta localmente en otra pestaña) para
comprobar si el enlace ya existe o precargar su formulario de alta. No
tiene ninguna otra función.

**Justificación de permisos:**

- `activeTab`: se usa para leer el título, la URL y la meta-descripción de
  la pestaña que el usuario tiene activa en el momento en que pulsa el
  icono de la extensión, y solo en ese momento — no se accede a ninguna
  otra pestaña con este permiso.

- `scripting`: se usa chrome.scripting.executeScript para (1) extraer
  título/URL/meta-descripción del documento de la pestaña activa, y (2)
  invocar la función window.PinBoardBridge que la propia página
  pinboard.html expone, en el "MAIN world" de la pestaña de PinBoard del
  usuario, para comprobar duplicados o precargar el formulario de alta. No
  se inyecta código en ninguna otra página.

- `storage`: se usa chrome.storage.local para guardar únicamente la URL
  file:// de la copia de pinboard.html que el usuario configura una vez en
  la página de opciones. Ningún otro dato se almacena con este permiso.

- `host_permissions: file:///*`: imprescindible porque pinboard.html se
  ejecuta como archivo local (file://) y Chrome no permite por defecto a
  las extensiones interactuar con páginas file:// sin este permiso
  explícito, sumado a que el usuario debe activar manualmente "Permitir
  acceso a las URL de archivo" en chrome://extensions. Se usa
  exclusivamente para localizar la pestaña de pinboard.html del propio
  usuario (chrome.tabs.query/get sobre esa URL) y ejecutar en ella el
  puente PinBoardBridge; no se accede a ningún otro archivo ni carpeta del
  sistema.

(Nota: el permiso `tabs` se evaluó y se retiró en la v1.1.0 — todo el uso
real de `chrome.tabs.*` en `background.js` queda cubierto por `activeTab`
más `host_permissions: file:///*`, así que no aparece en la lista
anterior ni hace falta justificarlo.)

**¿Código remoto?** No. Todo el código está incluido en el paquete
subido; no se carga JavaScript desde ningún servidor.

**Datos de usuario recogidos:** "Website content" (título, URL y
meta-descripción de la pestaña activa).

**Justificación del uso de datos:**

Los únicos datos que la extensión trata son el título, la URL y la
meta-descripción de la pestaña que el usuario decide capturar pulsando el
icono. Estos datos se procesan en el propio dispositivo del usuario: se
pasan directamente a la página local pinboard.html (que el propio usuario
aloja y controla) para guardarse en el localStorage de su navegador. La
extensión no transmite estos datos a ningún servidor, no los comparte con
terceros y no realiza ninguna llamada de red.

**Certificaciones a marcar:** las tres casillas afirmativas de cumplimiento
(no se venden datos a terceros; no se usan para fines ajenos al propósito
único de la extensión; no se usan para determinar solvencia o conceder
préstamos).

**URL de la política de privacidad:**
https://alvama.github.io/PinBoard/privacy-policy.html

## Assets

- **Icono (128×128):** `extension/icons/icon128.png` (ya existe, reutilizar).
- **Capturas de pantalla (1280×800):** `store/screenshots/`
  - `01-vista-principal.png` — vista principal de pinboard.html con los
    enlaces de ejemplo importados.
  - `02-opciones-extension.png` — página de opciones de la extensión.
  - `03-formulario-precargado.png` — formulario de alta de pinboard.html
    con categoría/título/URL/descripción rellenos, representando el
    resultado del flujo de la extensión.

## Paquete a subir

`store/PinBoard-Connector-v1.1.0.zip` (generado con
`python tools/empaquetar_extension.py`; no versionado en git, regenerable
en cualquier momento).
