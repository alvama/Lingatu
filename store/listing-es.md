# Ficha de la Chrome Web Store — Lingatu Connector

Fuente única de verdad para copiar/pegar en el Developer Dashboard
(`chrome.google.com/webstore/devconsole`). Versión del paquete: **1.2.1**
(`store/Lingatu-Connector-v1.2.1.zip`, generado con
`tools/empaquetar_extension.py`).

> **Pendiente de aplicar en el Dashboard tras el cambio de nombre** (la
> extensión se llamaba PinBoard Connector): nombre, descripción corta,
> descripción detallada, URL de la política de privacidad y capturas. **El ID
> de la extensión no cambia**, así que las instalaciones existentes se
> actualizan solas; lo que sí cambia es la URL pública de la ficha, cuyo
> *slug* pasa a `lingatu-connector` — la antigua sigue resolviendo, porque
> Chrome Web Store enruta por el ID.
>
> **Por qué la 1.2.1 existe**: el nombre y la descripción que muestra la
> tienda salen del `manifest.json`, no de un campo editable del Dashboard, así
> que renombrar la extensión obliga a **subir un paquete nuevo**; y la tienda
> rechaza un número de versión ya publicado (lo estaba la 1.2.0). No hay
> ningún cambio de comportamiento entre 1.2.0 y 1.2.1: solo el nombre.
>
> **La política de privacidad se actualiza aparte y antes**: es un campo de la
> pestaña *Privacy practices* y no necesita paquete. Al renombrar el
> repositorio, la URL anterior
> (`https://alvama.github.io/PinBoard/privacy-policy.html`) **pasó a devolver
> 404 — comprobado el 15/08/2026**: la redirección de repositorio de GitHub no
> cubre las URLs de GitHub Pages. Mientras ese campo no se cambie, la ficha
> publicada apunta a una página rota.

## Store listing

**Nombre** (debe coincidir con `manifest.json`):
Lingatu Connector — marcadores

**Descripción corta** (132 car. máx. — 122 usados):
Guarda marcadores: añade la pestaña activa a tu Lingatu local, detecta duplicados y sugiere una categoría automáticamente.

**Descripción detallada:**

Lingatu Connector es el complemento de navegador para Lingatu
(https://github.com/alvama/Lingatu), un gestor personal de enlaces que vive
en un único archivo HTML, sin servidor, sin cuentas y sin sincronización en
la nube: todos tus enlaces se guardan en el almacenamiento local de tu
propio navegador.

Esta extensión no funciona por sí sola: necesita que abras tu copia de
lingatu.html (normalmente como archivo local, file://) y que indiques su
URL una vez en la página de opciones de la extensión.

Qué hace al pulsar el icono:
- Captura el título, la URL y la meta-descripción de la pestaña activa.
- Busca o abre la pestaña donde tienes cargado tu lingatu.html.
- Si esa URL ya existe en tu Lingatu, enfoca la pestaña y resalta el
  enlace existente (evita duplicados).
- Si no existe, abre el formulario de alta de Lingatu ya relleno con el
  título, la URL, la descripción y una categoría sugerida automáticamente
  — tú decides si guardarlo, editarlo o cancelarlo.

Qué NO hace:
- No envía datos a ningún servidor propio ni de terceros. No hay
  analítica, cuentas, anuncios ni telemetría.
- No lee ni modifica páginas salvo la pestaña activa en el momento del
  clic y la propia pestaña de lingatu.html.
- Solo guarda, en el almacenamiento local de la extensión, la URL file://
  de tu lingatu.html que tú configuras.

Requiere tener tu propia copia de lingatu.html (incluida gratis y con
licencia MIT en https://github.com/alvama/Lingatu) abierta en el
navegador. Código fuente completo, sin minificar, disponible en el
repositorio.

**Categoría:** Productividad (Productivity)
**Idioma de la ficha:** Español
**Visibilidad:** No listada (Unlisted)

## Privacy practices

**Single purpose:**

El único propósito de esta extensión es capturar el título, la URL y la
descripción de la pestaña activa y pasarlos a la propia página web
lingatu.html del usuario (abierta localmente en otra pestaña) para
comprobar si el enlace ya existe o precargar su formulario de alta. No
tiene ninguna otra función.

**Justificación de permisos:**

- `activeTab`: se usa para leer el título, la URL y la meta-descripción de
  la pestaña que el usuario tiene activa en el momento en que pulsa el
  icono de la extensión, y solo en ese momento — no se accede a ninguna
  otra pestaña con este permiso.

- `scripting`: se usa chrome.scripting.executeScript para (1) extraer
  título/URL/meta-descripción del documento de la pestaña activa, y (2)
  invocar la función window.LingatuBridge que la propia página
  lingatu.html expone, en el "MAIN world" de la pestaña de Lingatu del
  usuario, para comprobar duplicados o precargar el formulario de alta. No
  se inyecta código en ninguna otra página.

- `storage`: se usa chrome.storage.local para guardar únicamente la URL
  file:// de la copia de lingatu.html que el usuario configura una vez en
  la página de opciones. Ningún otro dato se almacena con este permiso.

- `host_permissions: file:///*`: imprescindible porque lingatu.html se
  ejecuta como archivo local (file://) y Chrome no permite por defecto a
  las extensiones interactuar con páginas file:// sin este permiso
  explícito, sumado a que el usuario debe activar manualmente "Permitir
  acceso a las URL de archivo" en chrome://extensions. Se usa
  exclusivamente para localizar la pestaña de lingatu.html del propio
  usuario (chrome.tabs.query/get sobre esa URL) y ejecutar en ella el
  puente LingatuBridge; no se accede a ningún otro archivo ni carpeta del
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
pasan directamente a la página local lingatu.html (que el propio usuario
aloja y controla) para guardarse en el localStorage de su navegador. La
extensión no transmite estos datos a ningún servidor, no los comparte con
terceros y no realiza ninguna llamada de red.

**Certificaciones a marcar:** las tres casillas afirmativas de cumplimiento
(no se venden datos a terceros; no se usan para fines ajenos al propósito
único de la extensión; no se usan para determinar solvencia o conceder
préstamos).

**URL de la política de privacidad:**
https://alvama.github.io/Lingatu/privacy-policy.html

## Assets

- **Icono (128×128):** `extension/icons/icon128.png` (ya existe, reutilizar —
  es un logotipo abstracto, sin iniciales ni nombre, así que el cambio de
  nombre no lo afecta).
- **Capturas de pantalla (1280×800):** `store/screenshots/` — **hay que
  rehacer las tres**: las actuales muestran todavía el nombre y el título
  antiguos en la cabecera de la app y en la página de opciones.
  - `01-vista-principal.png` — vista principal de lingatu.html con los
    enlaces de ejemplo importados.
  - `02-opciones-extension.png` — página de opciones de la extensión.
  - `03-formulario-precargado.png` — formulario de alta de lingatu.html
    con categoría/título/URL/descripción rellenos, representando el
    resultado del flujo de la extensión.

## Paquete a subir

`store/Lingatu-Connector-v1.2.1.zip` (generado con
`python tools/empaquetar_extension.py`; no versionado en git, regenerable
en cualquier momento).
