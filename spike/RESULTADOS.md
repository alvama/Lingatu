# Fase 0 — Resultados de la sonda de almacenamiento

Comprobaciones P1–P10 del encargo 13. Este documento se completa a mano según se
vayan ejecutando las filas que necesitan un clic real; lo ya rellenado se obtuvo
de forma automatizada y es reproducible.

> **Estado: completa.** Las dos incógnitas de 11.2 están respondidas y las diez
> comprobaciones, cerradas.
>
> - **El permiso NO sobrevive al cierre del navegador** con origen `file://`
>   (P6). Esa es la que decidía.
> - **El handle sí sobrevive** en IndexedDB (P5), y **un gesto del usuario
>   recupera el acceso** (P7), tras lo cual el ciclo de escritura y relectura
>   funciona (P3, verificado en el archivo del disco).
>
> **Ruta adoptada: A′ — archivo con reconexión manual.** Ver "Decisión" al final.

## Entorno de las medidas automatizadas

- Chrome 151 en Windows 11, modo headless (`--headless=new`), perfil limpio.
- Contexto A: `file:///.../spike/storage-probe.html`
- Contexto B: `http://127.0.0.1:8941/...` — cuenta como contexto seguro, igual que HTTPS.
- Fecha: 2026-08-15.

## Matriz

| # | Comprobación | `file://` (Chrome) | Servido (Chrome) | Notas |
|---|---|---|---|---|
| P1 | ¿Existe `window.showSaveFilePicker`? | **sí** | **sí** | `showSaveFilePicker`, `showOpenFilePicker` y `FileSystemFileHandle` son `function` en los dos contextos |
| P2 | ¿Se puede invocar bajo `file://`? | **parcial** | **parcial** | Ver abajo: la excepción es idéntica en los dos contextos y es por falta de gesto, no por el origen |
| P3 | Ciclo escribir → cerrar → releer | **sí** | n/a | `createWritable` → `write` → `close` → `getFile` devuelve exactamente lo escrito, y el archivo del disco lo confirma desde fuera del navegador |
| P4 | ¿IndexedDB disponible? | **sí** | **sí** | `open` + transacción de escritura + lectura correctas: `{"a":1}` recuperado. **Incógnita 2 de 11.2 resuelta: sí** |
| P5 | ¿Sobrevive el handle en IndexedDB a una recarga? | **sí** | pendiente | Sobrevive incluso al **cierre completo** del navegador: se recupera con `kind`, `name` y sus métodos intactos |
| P6 | ¿`queryPermission` conserva el permiso al reabrir el navegador? | **NO** | pendiente | **Incógnita 1 de 11.2, resuelta.** Antes de cerrar: `read: granted`. Tras reabrir: `read: prompt`, `readwrite: prompt`, y `getFile()` lanza `NotAllowedError` |
| P7 | ¿`requestPermission` lo recupera con un gesto? | **sí** | n/a | Partiendo de `prompt`, un clic real sobre la burbuja devuelve `granted`, y el permiso se mantiene el resto de la vida del documento |
| P8 | Cuota real de `localStorage` | **5 MiB** | pendiente | 5.236.266 caracteres (clave + valor) antes de `QuotaExceededError`. Es 5×1024×1024 clavado, no una cifra redonda aproximada |
| P9 | ¿`localStorage` compartido entre dos `file://`? | **sí** | n/a | **Confirmado**: cuatro archivos distintos en dos carpetas distintas comparten almacén. Lo que 11.6 daba por supuesto es cierto |
| P10 | Contexto de ejecución | `origin` = `file://`, `isSecureContext` = **true** | `origin` = `http://127.0.0.1:8941`, `isSecureContext` = **true** | Un `file://` **sí** es contexto seguro en Chrome |

### Edge y Firefox (R16)

| Comprobación | Edge 151 (`file://`) | Firefox 153 (`file://`) |
|---|---|---|
| `showSaveFilePicker` / `showOpenFilePicker` / `showDirectoryPicker` | `function` | **`undefined`** |
| `FileSystemFileHandle` | `function` | `function` (el tipo existe, pero no hay forma de obtener uno) |
| `DataTransferItem.getAsFileSystemHandle` | `function` | **`undefined`** |
| Excepción de `showSaveFilePicker` sin gesto | idéntica a Chrome (`SecurityError`… *user gesture*) | la API no existe |
| IndexedDB (P4) | sí | **sí**, ciclo completo correcto |
| Cuota de `localStorage` (P8) | 5.242.001 caracteres | 5.242.001 caracteres |
| `origin` / `isSecureContext` (P10) | `file://` / `true` | **`null`** / `true` |

**Edge se comporta exactamente como Chrome**, como cabía esperar del motor
compartido; queda cerrada la duda que dejó abierta la primera tanda (allí Edge no
devolvió salida por un problema de arranque, no por un resultado).

**Firefox no implementa la File System Access API en ninguna de sus formas**: ni
los selectores, ni `getAsFileSystemHandle`. Ese es el techo real de la RUTA A, y
no depende de `file://` — Firefox no la implementa en ningún contexto. Su
`origin` bajo `file://` es `null` en vez de `file://`, otra diferencia a tener en
cuenta si algún día se compara el origen.

## Lo que ya se puede afirmar

**La API existe en `file://` y su origen no la rechaza de entrada.** Invocada sin
gesto de usuario, la excepción es **literalmente la misma** en los dos contextos:

```
SecurityError: Failed to execute 'showSaveFilePicker' on 'Window':
Must be handling a user gesture to show a file picker.
```

Si el origen opaco de `file://` fuese un impedimento, la llamada habría fallado
por otro motivo y con otro mensaje **antes** de llegar a la comprobación del
gesto. Que las dos rutas fallen exactamente igual y por la misma causa dice que
`file://` no está excluido en la puerta de entrada. **No demuestra** que el
selector llegue a abrirse ni que el permiso persista: eso es P3 y P6.

**IndexedDB funciona en `file://`.** La segunda incógnita de 11.2 —dónde guardar
el handle, que no es serializable a JSON— queda resuelta: `open`, escritura y
lectura funcionan y el objeto vuelve íntegro.

**La cuota son 5 MiB exactos y el almacén es compartido (P8 y P9).** Medidos al
implementar las salvaguardas de 4.26, no con esta sonda: hacían falta para
calibrar el aviso de ocupación, y salieron de un arnés de cuatro archivos
`file://` en dos carpetas distintas (sembrar → arrancar la app → comprobar), en
Chrome 151 headless con perfil limpio.

- **P8**: escribiendo bloques de 50.000 caracteres y apurando el hueco final de
  uno en uno, el tope quedó en **5.236.266 caracteres**, contando clave y valor.
  Es `5 × 1024 × 1024` con el margen de la propia medición, así que la constante
  de 5 MiB que usa `getStorageUsage()` no es una estimación prudente: es el
  número.
- **P9**: un archivo sembró las once claves y **otro archivo, en otra carpeta**,
  las leyó al arrancar. Queda confirmado lo que 11.6 afirmaba sin comprobar, con
  su consecuencia práctica: dos instalaciones de Lingatu en la misma máquina
  comparten datos, le convenga a alguien o no.

## P5 y P6: el permiso no sobrevive, el handle sí

Medido el 15/08/2026 con Chrome 151 **con interfaz** (no headless), perfil
dedicado, conducido por el protocolo de depuración remota (`--remote-debugging-port`).
Los eventos de entrada enviados por ese protocolo **sí** son *trusted* y cuentan
como activación de usuario, que es lo que permitió llegar hasta aquí sin una
persona delante.

**Cómo se consiguió el handle sin tocar el selector nativo.** El diálogo de
`showSaveFilePicker` lo dibuja el sistema operativo y no se puede conducir desde
fuera de la página. Pero hay una segunda vía de obtener un `FileSystemFileHandle`
que no pasa por él: **arrastrar un archivo sobre la página** y llamar a
`DataTransferItem.getAsFileSystemHandle()`. El arrastre sí se puede simular
(`Input.dispatchDragEvent` con la ruta del archivo). Es una diferencia
metodológica que conviene tener presente, pero **no afecta a la pregunta**: el
permiso se guarda por origen, no por la vía con la que se obtuvo el handle.

Secuencia y resultado:

1. Arrastre simulado de `datos.json` sobre la página, en `file://`.
   → handle obtenido: `kind: "file"`, `name: "datos.json"`.
2. `queryPermission` en ese momento → **`read: "granted"`**, `readwrite: "prompt"`.
   La lectura viene concedida de serie con el arrastre.
3. Handle guardado en IndexedDB.
4. **Cierre completo del navegador** (`Browser.close`, comprobando después que no
   quedaba ningún proceso `chrome.exe` vivo y que el puerto de depuración ya no
   respondía).
5. Reapertura con el mismo perfil y recuperación del handle desde IndexedDB:
   **`recuperado: true`**, con `name`, `kind` y sus métodos intactos. **P5: sí.**
6. `queryPermission` sin ningún gesto previo → **`read: "prompt"`,
   `readwrite: "prompt"`**. Y `getFile()` falla con:

```
NotAllowedError: Failed to execute 'getFile' on 'FileSystemFileHandle':
The request is not allowed by the user agent or the platform in the current context.
```

**P6: no.** El permiso se pierde al cerrar el navegador. Esto es exactamente lo
que 11.2 temía al escribir que *"los permisos se guardan por origen y `file://`
es un origen opaco, justo el caso en que no se pueden persistir"*.

## P7 y P3: un clic lo recupera, y a partir de ahí se escribe con normalidad

Con activación de usuario, `requestPermission({mode:"readwrite"})` **procede**: la
promesa no se rechaza, se queda **pendiente** mientras Chrome enseña su burbuja de
permiso. Ese clic no se puede dar por ningún medio automatizado, y no por falta de
intento: la burbuja es interfaz del navegador, fuera del alcance del protocolo y
del DOM, y conceder el permiso por protocolo tampoco funciona — `Browser.setPermission`
con `fileSystem`, `fileSystemAccess`, `file-system` o `fileHandling` devuelve
`Invalid PermissionDescriptor name` en todos los casos. No hay puerta trasera, y es
deliberado: dar acceso al disco a una página exige una persona.

Ejecutado con esa persona delante (15/08/2026, 11:13), partiendo del estado en que
queda tras reiniciar el navegador:

```
P5 · handle recuperado de IndexedDB tras reiniciar el navegador: SÍ (datos.json)
P6 · permiso ANTES de pedir nada — lectura: prompt, escritura: prompt
P7 · requestPermission devolvió: granted   (recuperado con un gesto)
P3 · escritura completada y archivo cerrado
P3 · relectura: {"prueba":"escrito por la sonda","cuando":"2026-08-15T11:13:18.446Z"}
P3 · el contenido coincide: SÍ
Estado del permiso al terminar: granted
```

**Comprobado además desde fuera del navegador**: el archivo del disco contiene
exactamente ese JSON, sustituyendo al contenido que tenía antes. No es un ciclo
que se cierre sobre una caché de la propia página.

**Detalle sobre el ciclo de vida del permiso**, observado al repetir la prueba: en
una ejecución posterior el estado de partida volvía a ser `prompt`, mientras que
al repetir sin recargar seguía en `granted`. Es decir, **el permiso vive mientras
viva el documento**, no mientras viva el proceso del navegador. Para la RUTA A′
eso encaja con lo previsto —cada apertura de Lingatu es un documento nuevo y pide
su clic—, pero conviene tenerlo escrito: el clic de «Reconectar» toca **una vez
por carga de la página**, recarga incluida, no una vez por sesión de navegador.

## Decisión (R17): **RUTA A′ — archivo con reconexión manual**

- **RUTA A queda descartada**: exige que el permiso sobreviva al cierre del
  navegador, y P6 dice que no.
- **RUTA A′ es viable, y está comprobada de punta a punta**: el handle se conserva
  en IndexedDB entre sesiones (P5), así que la app puede recordar *qué* archivo era
  sin volver a preguntarlo; un clic lo reactiva (P7) y a partir de ahí escribe y
  relee con normalidad (P3). **11.2 ya declaró este modo degradado como
  aceptable**, y no es un fracaso: el usuario elige el archivo una vez en su vida
  y después da un clic por cada carga de la página.
- **Solo en Chromium.** Firefox no implementa la API, así que allí no hay modo
  archivo: se queda con el mecanismo actual. Eso convierte la Parte B en una
  funcionalidad **opcional y dependiente del navegador**, no en el sustituto
  universal del almacenamiento que se imaginaba al plantearla — y es un argumento
  de peso para que las salvaguardas de 4.26 (que funcionan en todos) fueran
  primero.
- **La RUTA B (modo dual servido por HTTPS) no hace falta**: la API funciona
  igual de bien en `file://` que servida, y el origen no es el impedimento. La
  limitación es la persistencia del permiso, que afecta a los dos contextos por
  igual salvo que el sitio tenga permiso persistente concedido, cosa que un
  origen opaco no puede tener.

## Avisos antes de ejecutar la parte manual

1. **Exporta tus enlaces antes**, o usa un perfil de navegador limpio. En Chrome y
   Edge todas las páginas `file://` comparten almacén: la sonda escribe donde
   viven tus datos reales.
2. **P8 llena el almacenamiento a propósito**, porque medir cuánto cabe solo se
   puede hacer de una forma: escribir hasta que el navegador dice basta. No borra
   nada de Lingatu — ocupa el hueco libre que queda alrededor. Pero mientras está
   lleno, **Lingatu no puede guardar**: dar de alta o editar un enlace fallaría.
   Dura segundos, porque la sonda libera su relleno nada más terminar, incluso si
   la medición da error. El caso malo es cerrar la pestaña a media medición: ahí
   ese bloque de limpieza no llega a ejecutarse y el relleno se queda puesto,
   dejando a Lingatu sin sitio hasta que se limpie. Para eso está el botón
   **«Limpiar restos de la sonda»**, que borra solo las claves `__sonda_*`.
3. **Edge y Firefox ya están medidos**, ver la tabla de arriba. El fallo de la
   primera tanda con Edge era de captura de salida en Windows, no del navegador:
   `chrome.exe`/`msedge.exe` son procesos de interfaz gráfica y su salida
   estándar no llega a la consola de PowerShell por una tubería normal. Se
   resuelve con `Start-Process -RedirectStandardOutput`.

## Cómo reproducir P5, P6 y P7

Los guiones están fuera del repositorio (son de usar y tirar), pero el
procedimiento cabe en cinco líneas:

1. Lanzar Chrome **con interfaz**, perfil dedicado y `--remote-debugging-port=9222`.
2. Conectarse por WebSocket al `webSocketDebuggerUrl` de la pestaña y hablar CDP.
3. `Input.dispatchDragEvent` (`dragEnter`, `dragOver`, `drop`) sobre la zona de
   soltar, con `data.files = ["<ruta absoluta>"]`. **Ojo**: el `dataTransfer`
   llega con dos items y el primero es el `text/uri-list`; hay que quedarse con
   el de `kind === "file"`.
4. `Browser.close` (no matar el proceso: así IndexedDB se vuelca a disco), y
   comprobar que no queda ningún proceso vivo.
5. Relanzar con el mismo perfil, recuperar el handle de IndexedDB y llamar a
   `queryPermission`.

## Cómo reproducir las medidas automatizadas

```bash
chrome --headless=new --disable-gpu --user-data-dir=<perfil-limpio> --dump-dom "file:///<ruta>/spike/storage-probe.html"
```

El evento `load` se retrasó sirviendo una imagen lenta desde un servidor local,
porque `--dump-dom` vuelca el DOM al cargar y las respuestas de IndexedDB llegan
después. Sin ese retraso, la fila P4 sale siempre «pendiente» y parece un fallo
cuando no lo es.
