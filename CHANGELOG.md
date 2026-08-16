# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Añadido

- **`README.md` en inglés como puerta de entrada del repositorio**, con la
  demo en vivo, el GIF de importación y las capturas por delante; el README
  en español se conserva íntegro en `README.es.md`, con enlace cruzado en la
  primera línea de ambos. Motivo: el repositorio tenía cero estrellas, cero
  forks y ninguna imagen — nadie que llegara desde una búsqueda en inglés
  podía evaluar el proyecto sin descargarlo primero. Las dos versiones deben
  mantenerse en paridad (regla añadida a `CLAUDE.md`).

### Cambiado

- **Ahora eres tú quien decide dónde se guardan tus enlaces, y Lingatu nunca te
  enseña una lista sin poder decirte de dónde sale.** Hasta ahora, trabajar
  "con tu archivo" o "con el navegador" no era una decisión tuya: dependía de
  si el navegador recordaba el permiso, cosa que no hace de una sesión para
  otra. Así que el modo cambiaba solo, sin avisar, y la aplicación seguía
  funcionando con normalidad — con la copia del navegador delante y con toda
  la pinta de ser tu archivo. De ahí venía el caso que lo enseña entero: añades
  un enlace al abrir Chrome, pulsas «Reconectar», lo ves en pantalla… y en tu
  otro equipo no está, porque nunca llegó al archivo.
  - **El modo de trabajo se elige y se recuerda**, en el panel de Ajustes
    nuevo. Lo único que decide el permiso del navegador es si Lingatu puede
    trabajar ahora mismo o tiene que pedirte que abras tu archivo.
  - **Si tus enlaces están en un archivo y todavía no lo has abierto, no verás
    ninguna ficha**: verás una pantalla que dice, con el nombre delante, dónde
    están y cómo abrirlos. Mientras esté puesta no se puede crear, editar,
    borrar, importar **ni exportar** — exportar era el más traicionero de
    todos, porque te habría dado un archivo con los datos del navegador y el
    nombre de tu colección.
  - **La palabra «Reconectar» desaparece.** No describía nada reconocible y
    sonaba a avería. Ahora se llama **«Abrir mis enlaces»**, que es lo que hace.
  - **Si prefieres no abrirlo ahora**, puedes trabajar con los datos de este
    navegador: se ven, con un aviso que te dice **de cuándo son** y que tu
    archivo no se está tocando. Ese aviso solo aparece cuando **aplazas** la
    apertura, dura esa sesión y se puede cerrar: si has elegido a propósito
    guardar en el navegador, la aplicación no vuelve a proponerte que cambies
    —lo dice el indicador de arriba, y su tooltip lleva la fecha por si la
    buscas—. Al volver al archivo, si las dos versiones han cambiado, decide el
    diálogo de conflicto de siempre, con sus tres salidas.
  - **Dónde se está guardando se lee ahora en la barra de arriba**, siempre a
    la vista, en vez de al final del lateral. Pulsándolo se abren los ajustes.
  - **Nada de esto borra ni mueve un solo dato**: ni el archivo, ni lo que
    guarda el navegador, ni el archivo que Lingatu recuerda.

- **Los números del lateral ya concuerdan con lo que ves.** Hasta ahora podías
  tener cuatro cifras distintas en pantalla a la vez —«Todas 140», «Trabajo
  18», «127 enlaces» y «Trabajo 16»— porque unas contaban la colección entera
  y otras respetaban el filtro puesto. Ninguna mentía, pero juntas hacían
  dudar de todas. Ahora **el número de cada categoría dice cuántos enlaces
  verías al pulsarla**, con los filtros que tengas puestos; si quieres saber
  el total de la colección, pasa el ratón por encima o míralo en «Gestionar».
  Como el filtro «Activos» viene puesto de fábrica, esto le pasaba a todo el
  mundo desde el primer día.

- **Cuando un filtro deja la pantalla vacía, Lingatu te dice por qué y te
  ofrece salir.** Antes solo decía «no se encontraron enlaces con los filtros
  actuales»: ni qué filtro, ni cómo quitarlo. Quien no sabía que había un
  filtro puesto podía pensar que había perdido sus enlaces. Ahora se enumeran
  todas las restricciones activas —categoría, etiquetas incluidas y
  excluidas, vista, búsqueda y el propio Todos/Activos— y hay un botón
  **«Quitar los filtros»** que las quita todas de una vez.

- **Con la ventana estrecha, ahora se ven los enlaces.** Por debajo de cierto
  ancho el lateral se coloca encima del contenido, y con todo desplegado
  —categorías, vistas, etiquetas, botones y pie— había que desplazarse casi
  una pantalla entera para ver el primer enlace: medido, empezaba a 735 píxeles
  con la ventana a media pantalla y a 852 en un móvil. Ahora el lateral llega
  plegado, con un botón **«☰ Categorías y etiquetas»** que lo abre, y el primer
  enlace aparece a 289 y 338. Al elegir una categoría se pliega solo (salvo que
  tengas Ctrl pulsado para elegir varias), y nada de esto se recuerda: al
  ensanchar la ventana vuelve el lateral de siempre.

- **Los controles son más fáciles de acertar y de leer.** Revisión con
  medición, no a ojo: los iconos de cada ficha y los botones de texto de la
  interfaz eran demasiado pequeños para pulsarlos con comodidad —algunos de 16
  píxeles de alto— y ahora todos llegan al mínimo recomendado. El texto gris
  secundario (contadores, avisos del pie) se ha oscurecido un punto para que se
  lea bien en los dos temas.

- **Las fichas ya no gritan.** Los iconos ▲▼✏️🗑️ de cada enlace están
  atenuados hasta que pasas el ratón por la ficha: con una colección de verdad
  eran cientos de iconos compitiendo con los títulos, que es lo que estabas
  leyendo. La atenuación es suave a propósito: más oscura dejaría los
  iconos por debajo del contraste mínimo que necesitan para verse. **En pantalla táctil no cambia nada** —ahí los ▲▼ son la única
  forma de reordenar—, y el indicador 📝 de las notas sigue siempre a la
  vista, porque eso no es un botón: es la única señal de que un enlace tiene
  algo escrito.

- **Detalles del formulario y de los paneles.** Al crear un enlace el cursor
  empieza en el campo del enlace (y al editar, en el título) en vez de en la
  categoría, que ya venía rellenada sola. El buscador deja de cortarse a media
  frase. Y «Cerrar» deja de ser el botón más llamativo de los paneles de
  ayuda, de revisión y de copias, donde no es la acción importante.

- **La pantalla de bienvenida lleva a alguna parte.** Los dos primeros pasos
  —crear tu primer enlace y traer los marcadores del navegador— son ahora
  botones de verdad, en el centro de la pantalla, en vez de un enlace de texto
  en mitad de un párrafo mientras el botón real estaba en el lateral. Y ya no
  te propone importar un archivo de ejemplo que vive en el repositorio y que,
  si te descargaste solo `lingatu.html`, nunca tuviste.

### Añadido

- **Un panel de Ajustes, con cuatro decisiones y ninguna que toque tus
  enlaces**: dónde trabajas (este navegador o un archivo tuyo), el idioma, el
  tema y el archivo de datos. Se abre desde el pie del lateral, desde la barra
  superior o con <kbd>Ctrl</kbd>+<kbd>K</kbd>.
  - **Tema claro, oscuro o el del sistema.** Hasta ahora Lingatu seguía
    siempre al sistema; ahora puedes forzarlo, y se conserva al recargar.
  - En Firefox la opción de archivo **no aparece**, ni siquiera en gris: ese
    navegador no puede abrir archivos, y enseñarlo desactivado parecería una
    avería de Lingatu en vez de una limitación suya.

- **Lingatu ya está en inglés, además de en español.** La página de descarga
  llevaba tiempo en los dos idiomas, así que quien llegaba en inglés leía la
  promesa en su idioma, se descargaba la aplicación y se encontraba una
  interfaz que no entendía. Ahora se cambia con un selector en el pie del
  lateral, o desde la paleta de comandos (<kbd>Ctrl</kbd>+<kbd>K</kbd>).
  - **Nada se recarga y ningún dato se toca.** Tus títulos, descripciones,
    categorías, etiquetas y notas son tuyos y siguen exactamente como los
    escribiste: lo único que cambia es el texto de la propia aplicación.
  - **Si ya usabas Lingatu, sigue en español.** Aunque tu navegador esté en
    inglés: nadie se encuentra la aplicación cambiada de idioma después de
    actualizar. La primera vez verás un aviso discreto de que ahora hay dónde
    cambiarlo, y no vuelve a aparecer. En una instalación nueva el idioma se
    deduce del navegador.
  - **Los atajos y los operadores de búsqueda no cambian.** <kbd>/</kbd>,
    <kbd>n</kbd>, <kbd>?</kbd> y <kbd>Ctrl</kbd>+<kbd>K</kbd> son los mismos, y
    `cat:`, `site:` e `is:` también — una búsqueda que tengas escrita sigue
    funcionando en los dos idiomas, y una que te pasen también.
  - **El panel de ayuda está entero en los dos idiomas**, con sus cinco
    bloques.
  - **La extensión también**, con el mecanismo propio de Chrome: su idioma lo
    decide el navegador, así que puede no coincidir con el que elijas en la
    aplicación.
  - Datos de ejemplo en inglés (`examples/example-links.json`), que es el que
    ofrece la pantalla de bienvenida cuando la aplicación está en ese idioma.

### Corregido

- **Al borrar una categoría en uso, sus enlaces ya no pueden acabar
  repartidos entre dos categorías por defecto.** El nombre de "Sin categoría"
  se guarda una sola vez y no cambia aunque cambies de idioma. Sin eso,
  traducir esa etiqueta habría partido la colección en dos —"Sin categoría" y
  "Uncategorized"— y habría añadido una más en cada cambio.

- **Lingatu ya avisa antes de que pierdas tus enlaces, y guarda copias de
  rescate por su cuenta.** Hasta ahora tus datos vivían dentro del navegador
  sin ninguna red debajo: nada te recordaba hacer una copia, y si el
  almacenamiento se llenaba, el cambio que acabaras de hacer se perdía sin
  decir ni una palabra. Cuatro cosas nuevas, todas en segundo plano:
  - **Aviso de copia de seguridad.** Si hace más de una semana que no exportas,
    el pie del lateral te lo recuerda discretamente; pasado un mes, con más
    énfasis (y lo puedes apartar hasta la próxima vez que abras la aplicación).
    Cuenta desde tu última exportación, sea de enlaces o de categorías.
  - **Aviso de espacio.** A partir del 60% de ocupación aparece cuánto llevas
    usado, y por encima del 85% el aviso se destaca con un botón para exportar
    en el acto. Las notas se acumulan sin borrar nunca nada, así que este
    número solo sube.
  - **Si un cambio no cabe, ahora te lo dice.** Antes fallaba en silencio y
    creías haber guardado. Ahora se abre un aviso que explica que lo que ves en
    pantalla **no está guardado**, y te deja exportarlo desde ahí mismo antes
    de tocar nada más.
  - **Tres copias automáticas.** Cada vez que abres Lingatu se guarda una
    instantánea de todo —enlaces, categorías, etiquetas, colores, iconos,
    vistas y notas— y se conservan las tres últimas. Para volver a una:
    "Revisar" → "Copias de seguridad y espacio" → "Restaurar una copia", o
    <kbd>Ctrl</kbd>+<kbd>K</kbd> y escribe "restaurar". Siempre pide
    confirmación diciéndote cuántos enlaces tienes ahora y cuántos tendrás
    después, y **restaurar nunca borra las demás copias**.
  - Estas copias te salvan de un borrado accidental o de una importación que
    salió mal, pero **no** de perder los datos del navegador: viven en el mismo
    sitio que el resto. La única copia que sobrevive a eso sigue siendo el
    archivo que exportas tú. La aplicación lo dice donde hace falta, para que
    nadie confíe en ellas más de lo que aguantan.

- **Tus enlaces pueden vivir ahora en un archivo tuyo, no solo dentro del
  navegador.** En el pie del lateral hay dos botones nuevos. **"Guardar en un
  archivo…"** es el de la primera vez: **no tienes que crear ningún archivo ni
  preparar nada**, se abre la ventana de guardar de tu sistema con un nombre ya
  propuesto, eliges la carpeta y el navegador lo crea en ese momento con todo
  lo que tienes dentro. **"Ya tengo uno"** es para cuando el archivo ya existe
  —otro equipo, una carpeta sincronizada, una reinstalación—: lo seleccionas,
  Lingatu lo lee **antes de tocar nada** y te pregunta si prefieres quedarte
  con lo que hay dentro o con lo que tengas en ese equipo. A partir de ahí,
  cada cambio se escribe también en el archivo. Si ese archivo está en una carpeta que ya sincronizas (OneDrive,
  Drive, Dropbox, una unidad de red…), tendrás tu colección en todos tus
  equipos sin que Lingatu se conecte a ningún servicio ni tengas que crear
  ninguna cuenta: el trabajo lo hace la carpeta.
  - **Tus datos siguen guardándose también en el navegador**, exactamente como
    antes. El archivo se suma, no sustituye: si un día pierdes el archivo,
    cambias de equipo o abres Lingatu en otro navegador, todo sigue ahí.
  - **Una vez por sesión hay que pulsar "Reconectar"** y darle permiso al
    navegador. No es un fallo: es la única forma en que los navegadores
    permiten que una página escriba en tus archivos, y el permiso caduca al
    cerrarlos. El archivo, en cambio, no hay que volver a elegirlo nunca.
  - **Si el archivo cambia por fuera** —lo has editado en otro equipo, o la
    carpeta sincronizada ha traído una versión nueva—, Lingatu **no escribe
    encima**: te enseña las dos versiones con su fecha y su número de enlaces,
    y te deja elegir. Una de las tres opciones es guardar la tuya aparte, para
    que no tengas que perder ninguna de las dos.
  - **Esto no es sincronización**, y la aplicación lo dice donde hace falta: es
    un archivo compartido. Sirve para trabajar en un equipo cada vez, no para
    tener Lingatu abierto en dos sitios a la vez.
  - El pie del lateral indica en todo momento dónde se está guardando, y avisa
    con claridad cuando algo que ves **no** ha llegado al archivo.
  - Funciona en **Chrome y Edge**. Firefox todavía no permite que una página
    escriba en un archivo tuyo, así que ahí la opción no aparece y todo sigue
    funcionando como siempre.

### Corregido

- **Lo que editabas antes de pulsar «Reconectar» no llegaba al archivo.** Si
  abrías Lingatu, añadías o cambiabas algo y luego reconectabas, ese cambio se
  quedaba solo en el navegador: el archivo no lo recibía, otro equipo no lo
  veía, y el pie decía «guardado a las HH:MM» delante de un archivo que no lo
  tenía. Ahora un cambio hecho sin permiso cuenta como pendiente, el indicador
  lo dice —«lo que has cambiado todavía no está ahí»— y al reconectar se
  compara el contenido del archivo con el tuyo y se vuelca si hace falta.
  También cubre el caso de cerrar el navegador sin reconectar y volver al día
  siguiente.

- **Unos datos ilegibles ya no se borran solos al abrir la aplicación.** Era el
  fallo más grave que quedaba, y era invisible: si el contenido guardado se
  estropeaba —un corte de luz a media escritura, un fallo del navegador—,
  Lingatu arrancaba con la lista vacía y **escribía esa lista vacía encima**,
  destruyendo la colección entera antes de que te diera tiempo a ver nada.
  Ahora, cuando algo no se puede leer, la aplicación **deja de escribir por su
  cuenta**, te avisa en el pie de que parte de tus datos no se está mostrando y
  te ofrece las dos salidas: restaurar una copia, o exportar lo que sí se ve.
  Lo que hubiera guardado sigue intacto y todavía se puede rescatar a mano.


- **Seguridad: importar un archivo de enlaces ajeno ya no puede alterar la
  página.** Cada enlace lleva un identificador interno que normalmente genera
  la propia aplicación, pero al importar con "Sustituir todo" se conservaba el
  que viniera dentro del archivo, y ese valor se escribía en la ficha sin
  comprobarlo. Un archivo preparado a mala idea podía aprovecharlo para colar
  contenido en la página. Ahora un identificador que no tenga la forma
  esperada se sustituye por uno nuevo al importar (también si viene repetido),
  y todos se limpian antes de pintarlos.
  - **No afecta a tus enlaces**: los identificadores de lo que ya tienes
    guardado no cambian, y un archivo exportado por la aplicación se importa
    exactamente igual que antes. No hay nada que revisar ni que rehacer.
  - Por el mismo motivo, los **colores** de un archivo de categorías
    importado solo se aceptan si son colores de verdad; cualquier otra cosa
    se descarta y la categoría se queda sin color, como cualquier otra.
  - Revisado además el resto de la aplicación buscando el mismo patrón. Los
    demás sitios ya estaban correctos.

### Cambiado

- **La aplicación pasa a llamarse Lingatu.** Antes se llamaba PinBoard, un
  nombre que ya usaba desde hace años un servicio de marcadores muy conocido:
  buscar el proyecto por su nombre no llevaba hasta aquí. Cambia el nombre y
  nada más — **ni un solo dato tuyo se toca**:
  - **Tus enlaces, categorías, etiquetas, notas, colores, iconos y vistas
    siguen exactamente donde estaban.** No hay que exportar, ni importar, ni
    volver a configurar nada.
  - **Si ya tenías tu propio título de página, se queda como estaba.** Solo
    cambia el título que aparece la primera vez, en una instalación nueva:
    ahora es "Lingatu".
  - **El archivo pasa a llamarse `lingatu.html`.** Si prefieres seguir con el
    `pinboard.html` que ya tienes descargado, puedes: funciona igual, con tus
    datos de siempre, y la extensión sigue hablándose con él. Y si te
    descargas el archivo nuevo, en Chrome y Edge encontrarás tu colección
    también ahí, porque todas las páginas abiertas desde un archivo comparten
    el mismo almacén. Aun así, la recomendación de siempre no cambia:
    **exporta tus enlaces antes de cambiar de archivo**, que es lo prudente
    con cualquier cambio.
  - **Los archivos que exportes ahora se llaman `lingatu_<fecha>.json`** (y
    `lingatu_categorias_<fecha>.json`). Los que exportaste antes, con el
    nombre antiguo, se siguen importando sin ningún cambio: el contenido es
    idéntico.
  - **La extensión pasa a llamarse Lingatu Connector**, en su versión
    **1.2.1**, que no cambia nada de cómo funciona respecto a la 1.2.0: el
    nombre que muestra la tienda viene dentro del propio paquete, así que
    cambiarlo obliga a publicar una versión nueva. Se actualiza sola desde la
    Chrome Web Store; no hay que reinstalarla ni volver a indicarle dónde está
    tu archivo. Sus dos opciones del menú del clic derecho ahora
    dicen "Guardar en Lingatu" y "Añadir selección como nota en Lingatu".
    Funciona indistintamente con el archivo nuevo y con el antiguo, y también
    al revés: una extensión que todavía no se haya actualizado funciona con
    el archivo nuevo.

### Nota técnica

- El puente con la extensión se expone como `window.LingatuBridge` y, además,
  como `window.PinBoardBridge` (el mismo objeto) para que las extensiones aún
  no actualizadas sigan funcionando; `callBridge` busca el primero y recurre
  al segundo. Las once claves de `localStorage` (`enlaces_*_v1`) y la clave
  `pinboardFileUrl` de la extensión conservan su nombre a propósito:
  renombrarlas habría borrado datos y configuración de los usuarios
  existentes. Detalle completo en la decisión 45 y la sección 8 de
  `docs/ESPECIFICACIONES.md`.

## [1.9.0] - 2026-08-14

### Añadido

- **Panel de ayuda**: se abre con la tecla `?` o con el botón "Ayuda (?)" del
  pie del lateral, con cuatro bloques —**Atajos, Gestos, Filtros, Datos**—
  que reúnen todo lo que PinBoard sabe hacer pero nada en pantalla insinúa:
  el triple estado de una etiqueta al pulsarla (neutra → incluida →
  excluida), que arrastrar una ficha a otra categoría es como se mueve de
  categoría, Ctrl+clic para seleccionar varias categorías, que "Exportar"
  exporta solo lo filtrado si hay un filtro puesto, y que los datos viven
  solo en este navegador. Complementa la paleta de comandos (`Ctrl+K`), que
  ya documenta las acciones por su nombre: la paleta gana un comando más,
  "Ayuda: atajos y gestos", y el panel remite a `Ctrl+K` para todo lo demás.
- **Panel de limpieza**: botón "Revisar" en el lateral, junto a Exportar/Importar,
  que detecta ocho problemas típicos de una colección que ha crecido —
  URLs duplicadas ya guardadas, enlaces con URL inválida, enlaces sin ninguna
  etiqueta, etiquetas que ya no usa ningún enlace, categorías con 0 o 1
  enlace, títulos repetidos con URL distinta, dominios repartidos entre
  varias categorías y URLs con parámetros de seguimiento (`utm_*`, `fbclid`,
  `gclid`...). Cada comprobación es una fila plegable con su recuento; las
  que salen a cero no se muestran. **El panel no modifica nada**: diagnostica
  y, con el botón "Ver estos N" de cada fila, deja la vista recortada a
  exactamente esos enlaces para arreglarlos con las herramientas que ya
  existían (edición, gestión de categorías/etiquetas, selección en lote). Un
  aviso sobre la lista recuerda que hay un foco de revisión activo, con un
  botón para quitarlo. No afecta a lo que exporta "Exportar", igual que ya
  pasa con la búsqueda.

- **Búsqueda con operadores en el mismo `#searchInput` de siempre**: `cat:desarrollo`
  filtra por categoría (subcadena, así que `cat:desar` también vale),
  `#referencia` por etiqueta, `site:github.com` por dominio de la URL,
  `is:activo` / `is:inactivo` por estado, y `"frase exacta"` exige esa
  secuencia literal, con espacios incluidos. Cualquiera de ellos se niega
  anteponiendo `-` (`-#trabajo`, `-cat:archivo`). Se combinan entre sí y con
  los filtros del lateral con la misma regla que ya usaba la app: términos
  del mismo operador en OR (`cat:a cat:b` es la categoría A **o** la B, igual
  que Ctrl+clic en el lateral), operadores distintos en AND, negaciones
  siempre AND NOT. Un operador que no se reconoce (`foo:bar`) se busca tal
  cual, sin error, porque las URLs llevan `:` y se pegan enteras en el
  buscador — y ahora encuentran su enlace, porque **la URL entró al texto
  sobre el que se busca**. Sin ningún operador, escribir sigue funcionando
  exactamente igual que antes.
- Con una categoría seleccionada en el lateral y una búsqueda que no
  encuentra nada a la vez, el estado vacío ya no dice solo "sin resultados":
  enumera qué está acotando la vista (categoría, etiquetas, estado, vista
  aplicada, texto buscado), para que se entienda el porqué del cero.

### Cambiado

- **Cambio de comportamiento**: una búsqueda de varias palabras (`web docs`)
  dejó de exigir esa secuencia exacta y pasa a significar "contiene 'web' y
  contiene 'docs'", en cualquier orden y en cualquier campo — lo que
  cualquiera espera de un buscador. Quien necesite el comportamiento de
  antes lo tiene entre comillas (`"web docs"`). Una búsqueda de una sola
  palabra se comporta exactamente igual que siempre.

## [1.8.0] - 2026-08-13

### Añadido

- **Notas por enlace, que también puedes capturar desde la página que estás
  leyendo**: cada enlace gana un campo de notas donde escribir lo que sabes o
  piensas sobre él. No es la descripción —esa es un resumen de una línea que
  se ve en la ficha—, sino texto largo que se acumula con el tiempo. Las notas
  **nunca se sobrescriben**: cada anotación entra como un bloque nuevo al
  final, encabezado por su fecha (`## 13/08/2026`).
  Las fichas con notas muestran un 📝 en los dos modos de vista, con el
  recuento en su tooltip: pulsarlo abre un **visor de solo lectura** con las
  notas de ese enlace —leer no es editar, y para editar sigue estando el
  lápiz de siempre—, con un botón "Editar notas" para pasar de una cosa a la
  otra. Y sobre todo, **la búsqueda las encuentra**: escribir en el buscador
  una palabra que solo aparece en una nota saca ese enlace.
- **El Markdown de las notas se ve formateado al leerlo**: encabezados (`#` a
  `######`), citas (`>`), listas con viñeta y numeradas, `**negrita**`,
  `*cursiva*`, `código` entre acentos graves y bloques de código enteros con
  la valla de tres acentos graves (lo de dentro se respeta literal, tal cual
  lo pegaste), **con un botón para copiar el bloque entero**. Se escribe en crudo —el campo
  del modal sigue siendo texto, siempre ves lo que guardaste— y se lee en
  limpio en el visor. Un salto de línea es un salto de línea, sin trucos de
  dos espacios al final. Los enlaces y las imágenes quedan fuera a propósito.
- **Menús contextuales en la extensión**: clic derecho en cualquier página →
  *"Guardar en PinBoard"* hace lo mismo que pulsar el icono. Y seleccionando
  texto → *"Añadir selección como nota en PinBoard"* guarda lo seleccionado
  como cita, con la fecha del día. Si la página ya está guardada, **la nota se
  añade sin cambiar de pestaña** —sigues leyendo, y un aviso en la esquina de
  la propia página confirma a qué enlace ha ido y cuántas notas lleva ya—; si
  no lo está, se abre PinBoard con el formulario ya relleno y la nota puesta,
  para que confirmes el alta.
- **El formulario de enlace pasa a dos columnas**, con las notas ocupando la
  derecha entera: es el único campo que puede crecer mucho, y así tiene sitio
  de sobra sin que aparezca scroll en el modal. En ventanas estrechas las dos
  columnas se apilan como antes.

### Cambiado

- El **formato de datos gana un campo opcional**, `notes`. Es
  retrocompatible en las dos direcciones y no hay ninguna migración: los
  enlaces que ya tenías siguen igual, y el campo solo se escribe en los
  enlaces que tienen algo anotado. Se conserva al exportar, al importar
  (fusionando y sustituyendo) y al duplicar un enlace.
- La **extensión sube a la versión 1.2.0** y pide un permiso nuevo,
  `contextMenus`, que es lo que le permite añadir sus dos entradas al menú del
  clic derecho. Al ser un permiso nuevo, **hay que recargar la extensión**
  después de actualizarla.

## [1.7.0] - 2026-08-13

### Añadido

- **Vistas guardadas a partir de una selección de enlaces**: hasta ahora una
  vista solo podía expresarse como "estas categorías y estas etiquetas".
  Ahora, en el modo selección, la barra de acciones en lote incluye **"Crear
  vista"**: marca los enlaces que quieras —de las categorías que sean, con o
  sin etiquetas en común— ponle nombre, y quedan guardados como una vista
  más. Su chip en el lateral se ve y funciona igual que el de cualquier otra:
  un clic muestra exactamente esos enlaces, otro clic la suelta, y la
  búsqueda y el toggle Todos/Activos siguen funcionando dentro de ese
  conjunto. Con la vista aplicada, "Exportar" exporta solo esos enlaces.
  Crear la vista **no** la aplica ni pierde la selección: puedes seguir
  encadenando acciones en lote sobre los mismos enlaces, que es para lo que
  el modo selección conserva la selección. Si más tarde borras alguno de esos
  enlaces, la vista sigue funcionando con los que queden.

## [1.6.0] - 2026-08-13

### Añadido

- **Paleta de comandos (Ctrl+K)**: un único desplegable que busca a la vez
  acciones y contenido. Escribe "expo" y sale *Exportar enlaces*; "mdn" y
  sale el enlace; "desar" y sale la categoría *Desarrollo*. Cinco grupos de
  resultados —comandos, enlaces, categorías, vistas y etiquetas—, navegables
  con ↑/↓ y Enter (o con el ratón). Se abre con `Ctrl+K`/`Cmd+K`, y también
  con el botón "Comandos (Ctrl+K)" de la barra de herramientas, para que la
  función no dependa de un atajo que nadie te ha contado. Con el campo vacío
  lista **todas** las acciones de la app con su atajo, así que hace además de
  chuleta. Los enlaces se buscan sobre la colección completa, ignorando los
  filtros activos: el propósito es alcanzar algo que ahora mismo *no* estás
  viendo. La coincidencia ignora mayúsculas **y acentos**: "categoria"
  encuentra *Categorías* y "diseno" encuentra *Diseño*.

- **Importar marcadores de cualquier navegador arrastrando el archivo**:
  suelta sobre la página el HTML que exporta cualquier navegador
  (Ctrl+Shift+O → Exportar) o el propio `Bookmarks` de Chrome/Edge, y
  PinBoard lo reconoce por contenido (sin necesidad de extensión) y lo
  parsea en el sitio, sin herramientas externas — `DOMParser` para el
  HTML Netscape (que es HTML deliberadamente mal formado), la misma
  lógica ya probada de `tools/convertir_marcadores.py` para el
  `Bookmarks` de Chromium. La ruta de carpetas se convierte en categoría
  (unida con `" / "`), deduplicando dentro del propio archivo. El botón
  "Importar" también acepta ya estos dos formatos, además del JSON de
  siempre. `tools/` pasa a ser opcional. Como parte imprescindible del
  cambio, soltar un archivo en cualquier parte de la página ya no navega
  a él (comportamiento por defecto del navegador que antes hacía
  desaparecer la app), sin afectar al arrastrar y soltar interno de
  fichas y categorías.
- **Selección múltiple de enlaces y acciones en lote**: botón "Seleccionar"
  en la barra de herramientas que activa un modo en el que cada ficha
  muestra una casilla y un clic en cualquier parte de la ficha la
  selecciona o la deselecciona. Con al menos un enlace seleccionado
  aparece abajo una barra con el recuento y seis acciones sobre todos
  ellos a la vez: añadir etiqueta, quitar etiqueta, cambiar de categoría
  (creándola si no existía), activar, desactivar y eliminar (con
  confirmación y el recuento explícito, sigue siendo irreversible).
  Etiquetar treinta enlaces deja de ser treinta viajes al modal de
  edición. La selección **no se guarda** entre sesiones, se vacía en
  cuanto cambia lo que se está viendo (filtro, búsqueda o vista) y se
  conserva tras cada acción para poder encadenar varias sobre el mismo
  conjunto. Mientras el modo está activo, el arrastrar y soltar y los
  iconos ▲▼✏️🗑️ de las fichas quedan desactivados; al salir, todo vuelve
  a funcionar exactamente como antes.
- **Mensaje de bienvenida en el estado vacío**: cuando no hay ningún enlace
  guardado, `#emptyState` deja de mostrar el mensaje de "sin resultados con
  los filtros actuales" (que ahora solo aparece cuando sí hay enlaces pero
  el filtro activo no encuentra ninguno) y en su lugar enseña las tres
  primeras acciones: crear el primer enlace (botón funcional que abre el
  mismo modal que "+ Nuevo enlace"), importar los marcadores del navegador
  o un archivo de PinBoard, y pulsar `/` para buscar.
- **Atributo `title` en once controles** que no lo tenían: "+ Nuevo enlace",
  "Gestionar" (categorías y etiquetas), "Guardar actual" (vistas), el
  buscador, los botones de Todos/Activos y Cómoda/Compacta, "Plegar todo",
  el item "Todas" de categorías, los chips de vistas guardadas y, sobre
  todo, los chips de etiqueta del lateral, que ahora explican su ciclo de
  tres estados (neutra → incluida → excluida) al pasar el ratón.

### Corregido

- **`Escape` no cerraba el modal de importar categorías**, y **con ese modal
  abierto la tecla `n` abría el modal de nuevo enlace encima**. Los dos
  fallos tenían la misma causa: la lista de modales abiertos estaba escrita
  a mano en dos sitios y el modal de importar categorías se añadió sin
  apuntarlo en ninguno de los dos. Ahora los overlays se registran en una
  sola estructura, de la que derivan tanto el cierre con `Escape` como el
  bloqueo de los atajos de una tecla, así que cualquier modal futuro queda
  cubierto por el solo hecho de registrarse.
- **La barra de herramientas se desbordaba en ventanas estrechas**, empujando
  fuera de la vista los botones "Guardar actual" (Vistas) y "Gestionar"
  (Categorías/Etiquetas): por debajo de 780px de ancho, `.toolbar` no
  envolvía sus botones y, al ser hija de un grid CSS sin `min-width:0`,
  forzaba el desbordamiento horizontal de toda la página. Ahora `.toolbar`
  envuelve (`flex-wrap`) y `.sidebar`/`.content` pueden encogerse dentro
  del grid.
- **Las vistas guardadas se quedaban marcadas a la vez y no se podían
  desmarcar** cuando dos perfiles compartían la misma selección de
  etiquetas (o ninguna, un caso válido a propósito): el estado "activa" se
  derivaba comparando la selección actual contra cada perfil, así que
  ambos coincidían siempre y el clic para desmarcar pasaba de vacío a
  vacío sin ningún efecto. Ahora se rastrea explícitamente qué vista está
  aplicada (`state.activeViewProfile`) en vez de derivarlo por
  coincidencia.
- **Las vistas guardadas no recordaban las categorías seleccionadas**,
  solo las etiquetas: una vista creada a partir de una selección de
  categorías (sin ninguna etiqueta) se guardaba vacía de facto y no
  filtraba nada al aplicarla. Los perfiles ahora también guardan
  `selectedCategories` y lo restauran al aplicar la vista.

## [1.5.0] - 2026-08-11

### Añadido

- **Editor de chips en el campo Etiquetas**: cada etiqueta ya añadida a un
  enlace se muestra como una pastilla dentro del propio campo (en vez de
  texto plano separado por espacios), con un desplegable de sugerencias
  que filtra las etiquetas ya existentes mientras escribes — para
  reutilizarlas con un clic en lugar de tener que recordarlas y
  volver a teclearlas exactamente igual. Sigue admitiendo crear una
  etiqueta nueva escribiendo libremente si no hay coincidencia. Se
  confirma un chip con Enter, espacio, coma o clic en una sugerencia; se
  borra con el botón "×" de cada chip o con Backspace sobre el campo
  vacío; pegar texto con varias etiquetas de golpe (p. ej. `#a #b, #c`)
  las trocea en chips independientes.

## [1.4.0] - 2026-08-11

### Añadido

- Sección "Funcionalidades" en el README, con el listado completo de lo
  que se puede hacer en PinBoard.
- **Exportar/importar categorías**: en "Gestionar categorías", exportar
  el conjunto completo de categorías (nombre, icono, color y posición) a
  un JSON independiente de los enlaces, e importarlo de nuevo fusionando
  (añade solo las que no existan) o sustituyendo todo (los enlaces de
  categorías eliminadas pasan a "Sin categoría").
- **Selección múltiple de categorías** en el sidebar: Ctrl+clic (o
  Cmd+clic) añade o quita una categoría de la selección sin perder las
  demás; un clic normal sigue seleccionando solo una, y "Todas" limpia la
  selección.
- Al pulsar "Exportar" con algún filtro activo (categoría, etiquetas o una
  vista guardada), se pide confirmación indicando cuántos enlaces se van a
  exportar, para no exportar por error solo la selección visible en vez
  de todos los enlaces.

### Cambiado

- Modal "Gestionar categorías": los botones "Exportar"/"Importar" (sin la
  palabra redundante "categorías" en su etiqueta) pasan a la fila de
  "Cerrar", dejando "Añadir" junto al campo de texto como antes, y la
  lista de categorías ocupa más alto para verse mejor.

### Corregido

- Los nombres de categoría largos ya no se cortan con "…" en el sidebar:
  ahora continúan en la línea siguiente mostrando el nombre completo.
- Vista cómoda: el título de cada enlace se veía en azul (heredado del
  color genérico de los enlaces); ahora usa el mismo color neutro que el
  resto del texto, igual que ya hacía la vista compacta.

## [1.3.0] - 2026-08-11

### Añadido

- Icono de escoba junto a "Etiquetas" en el sidebar que limpia de golpe
  la selección de etiquetas (incluidas y excluidas), sin tocar el
  filtro de categoría.

### Corregido

- El atajo de teclado `n` (abrir "Nuevo enlace") no funcionaba con Bloq
  Mayús activado ni pulsando Mayús+n, solo con la `n` en minúscula
  estricta.

## [1.2.1] - 2026-08-10

### Cambiado

- Orden de las secciones del sidebar: "Vistas" pasa a ir justo después de
  "Categorías" y antes de "Etiquetas" (antes iba tras Etiquetas).

## [1.2.0] - 2026-08-10

### Añadido

- **Duplicar enlaces**: icono junto a cada enlace que crea una copia (título
  + `" _copia"`) y abre el modal de edición sobre ella.
- **Reordenar categorías**: arrastrar y soltar en el sidebar y en el modal de
  gestión, además de los botones ▲/▼ para pantallas táctiles.
- **Iconos de categoría**: cada categoría puede llevar un icono de una
  librería de 56 iconos de contorno, visible en el sidebar y en la cabecera
  de cada grupo.
- **Paleta de colores** para categorías y etiquetas, además del selector de
  color nativo.
- **Vistas guardadas**: guardar la combinación de etiquetas incluidas y
  excluidas activa en ese momento con un nombre, y volver a aplicarla con un
  clic; aplicar una vista ya activa la deselecciona.
- **Exclusión de enlaces por etiqueta**: además de filtrar por etiquetas
  incluidas, ahora se puede excluir una etiqueta (p. ej. ocultar todo lo
  marcado "trabajo"), y queda fijada hasta desmarcarla.
- **Exportar respeta la selección activa**: con alguna categoría o etiqueta
  seleccionada, "Exportar" descarga solo esos enlaces en vez del listado
  completo (ignorando a propósito la búsqueda y el toggle Todos/Activos).
- Rediseño de la vista cómoda de las tarjetas de enlace.

### Cambiado

- Deseleccionar una categoría con un clic sobre la ya activa, igual que las
  etiquetas.
- El pie de la barra lateral ya no muestra un nombre de autor, solo la
  versión, el enlace a NLevia.org y el enlace a GitHub.

### Corregido

- El modal ya no se cierra accidentalmente al seleccionar texto dentro de
  él (por ejemplo, al arrastrar el ratón sobre una URL para copiarla).

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

[1.9.0]: https://github.com/alvama/PinBoard/releases/tag/v1.9.0
[1.8.0]: https://github.com/alvama/PinBoard/releases/tag/v1.8.0
[1.7.0]: https://github.com/alvama/PinBoard/releases/tag/v1.7.0
[1.6.0]: https://github.com/alvama/PinBoard/releases/tag/v1.6.0
[1.5.0]: https://github.com/alvama/PinBoard/releases/tag/v1.5.0
[1.4.0]: https://github.com/alvama/PinBoard/releases/tag/v1.4.0
[1.3.0]: https://github.com/alvama/PinBoard/releases/tag/v1.3.0
[1.2.1]: https://github.com/alvama/PinBoard/releases/tag/v1.2.1
[1.2.0]: https://github.com/alvama/PinBoard/releases/tag/v1.2.0
[1.1.0]: https://github.com/alvama/PinBoard/releases/tag/v1.1.0
[1.0.0]: https://github.com/alvama/PinBoard/releases/tag/v1.0.0
