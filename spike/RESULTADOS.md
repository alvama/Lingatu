# Fase 0 — Resultados de la sonda de almacenamiento

Comprobaciones P1–P10 del encargo 13. Este documento se completa a mano según se
vayan ejecutando las filas que necesitan un clic real; lo ya rellenado se obtuvo
de forma automatizada y es reproducible.

> **Estado: incompleto.** Lo automatizable está hecho y apunta a que la RUTA A es
> viable, pero **la decisión de R17 no puede tomarse todavía**: falta el ciclo
> completo del selector de archivo y, sobre todo, la supervivencia del permiso al
> cerrar el navegador (P6), que es la incógnita 1 de 11.2.
>
> Quedan **cinco filas** por comprobar a mano —P3, P5, P6, P7 y el P2 completo—,
> todas por el mismo motivo: exigen un clic de verdad sobre un diálogo del
> sistema operativo. P8 y P9 ya no están entre ellas: se resolvieron al
> implementar las salvaguardas de 4.26.

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
| P3 | Ciclo escribir → cerrar → releer | pendiente | pendiente | Requiere elegir un archivo en el selector; no automatizable |
| P4 | ¿IndexedDB disponible? | **sí** | **sí** | `open` + transacción de escritura + lectura correctas: `{"a":1}` recuperado. **Incógnita 2 de 11.2 resuelta: sí** |
| P5 | ¿Sobrevive el handle en IndexedDB a una recarga? | pendiente | pendiente | Depende de P2/P3 |
| P6 | ¿`queryPermission` conserva el permiso al reabrir el navegador? | **pendiente — la que decide** | pendiente | Incógnita 1 de 11.2 |
| P7 | ¿`requestPermission` lo recupera con un gesto? | pendiente | pendiente | Solo importa si P6 sale negativo |
| P8 | Cuota real de `localStorage` | **5 MiB** | pendiente | 5.236.266 caracteres (clave + valor) antes de `QuotaExceededError`. Es 5×1024×1024 clavado, no una cifra redonda aproximada |
| P9 | ¿`localStorage` compartido entre dos `file://`? | **sí** | n/a | **Confirmado**: cuatro archivos distintos en dos carpetas distintas comparten almacén. Lo que 11.6 daba por supuesto es cierto |
| P10 | Contexto de ejecución | `origin` = `file://`, `isSecureContext` = **true** | `origin` = `http://127.0.0.1:8941`, `isSecureContext` = **true** | Un `file://` **sí** es contexto seguro en Chrome |

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

## Lo que falta, y por qué no se puede automatizar

`showSaveFilePicker` exige *user activation*: un evento de confirmación real del
usuario. Un clic sintético desde JavaScript no cuenta (`isTrusted` es `false`), y
el diálogo que abre es del sistema operativo, fuera del alcance de la página. Por
eso P2 (completo), P3, P5, P6 y P7 se ejecutan a mano con `spike/storage-probe.html`,
que ya trae un botón por cada uno.

**P6 es la que decide la ruta**, y su procedimiento no admite atajos: conectar un
archivo, cerrar **todas** las ventanas del navegador, volver a abrir el archivo y
pulsar «Recuperar handle» sin tocar nada más.

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
3. **Edge y Firefox siguen pendientes.** Edge no devolvió salida en modo headless
   en esta máquina (limitación del arranque, no un resultado); comparte motor con
   Chrome, así que lo esperable es que coincida, pero R16 pide comprobarlo.
   Firefox es el caso interesante: si no implementa la API, marca el techo real de
   la RUTA A.

## Cómo reproducir las medidas automatizadas

```bash
chrome --headless=new --disable-gpu --user-data-dir=<perfil-limpio> --dump-dom "file:///<ruta>/spike/storage-probe.html"
```

El evento `load` se retrasó sirviendo una imagen lenta desde un servidor local,
porque `--dump-dom` vuelca el DOM al cargar y las respuestas de IndexedDB llegan
después. Sin ese retraso, la fila P4 sale siempre «pendiente» y parece un fallo
cuando no lo es.
