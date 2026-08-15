"use strict";

// La clave conserva el nombre anterior del producto a propósito: la extensión
// se actualiza sola desde la Chrome Web Store, y renombrarla borraría de golpe
// la URL que cada usuario ya tiene configurada, sin ningún aviso. Es un detalle
// interno de chrome.storage.local, no afecta al nombre público (mismo criterio
// que el prefijo "enlaces_" de localStorage en la app).
const STORAGE_KEY = "pinboardFileUrl";
const MENU_SAVE_PAGE = "lingatu-guardar-pagina";
const MENU_ADD_SELECTION_NOTE = "lingatu-anadir-seleccion-nota";

// Los textos visibles salen de _locales/{es,en}/messages.json, el mecanismo
// nativo de Chrome: aquí el idioma lo decide el navegador, no el selector de la
// app. Los dos pueden divergir, y es una limitación aceptada — sincronizarlos
// exigiría un canal nuevo entre extensión y página (ver la tarea 14, R10).
function msg(key, sustituciones) {
  return chrome.i18n.getMessage(key, sustituciones);
}

// chrome.i18n no resuelve plurales, así que se eligen las dos formas a mano,
// igual que hace plural() en la app: español e inglés tienen las mismas dos.
function msgPlural(baseKey, n) {
  return msg(baseKey + (n === 1 ? "One" : "Other"), [String(n)]);
}

async function getLingatuUrl() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || null;
}

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function findOrOpenLingatuTab(url) {
  const tabs = await chrome.tabs.query({ url });
  if (tabs.length > 0) return tabs[0];
  const tab = await chrome.tabs.create({ url, active: false });
  await waitForTabComplete(tab.id);
  return tab;
}

async function getActiveTabData(tab) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const meta = document.querySelector('meta[name="description"]');
      return {
        url: location.href,
        title: document.title,
        description: meta ? meta.content : ""
      };
    }
  });
  return result;
}

// Se ejecuta en el "MAIN world" de la pestaña de lingatu.html, así que puede
// llamar directamente a window.LingatuBridge tal y como lo expone esa página.
//
// CONTRATO ESTABLE con lingatu.html — contrato completo en
// docs/ESPECIFICACIONES.md, sección 8. Si cambia la firma de
// LingatuBridge.checkDuplicate/focusExisting/suggestCategory/prefillAndOpen/
// appendNote en lingatu.html, estas dos funciones dejan de funcionar
// (normalmente en silencio, solo con el badge rojo "!" de flashBadge más abajo).
//
// El puente se busca primero como LingatuBridge y, si no está, como
// PinBoardBridge: esta extensión se actualiza sola, pero el archivo HTML lo
// tiene el usuario en su disco y no se actualiza nunca solo, así que hay que
// seguir hablando con los pinboard.html antiguos. Nunca al revés (el archivo
// nuevo expone los dos nombres, así que el orden solo importa aquí).
// Retirada del respaldo: no antes de la v1.12.0 de la app.
async function callBridge(tabId, payload) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (data) => {
      const bridge = window.LingatuBridge || window.PinBoardBridge;
      if (!bridge) {
        return { ok: false, reason: "bridge-not-found" };
      }
      const dup = bridge.checkDuplicate(data.url);
      if (dup) {
        bridge.focusExisting(data.url);
        return { ok: true, duplicate: true, existing: dup };
      }
      const category = bridge.suggestCategory(data.title, data.description, data.url);
      bridge.prefillAndOpen(Object.assign({}, data, { category }));
      return { ok: true, duplicate: false, category };
    },
    args: [payload]
  });
  return result;
}

// La bifurcación "si la URL existe añade la nota, si no crea el enlace con
// ella" la decide el propio puente: devuelve {ok, created, ...} y aquí solo se
// interpreta si hay que saltar a la pestaña de Lingatu o basta con el badge.
async function callBridgeAppendNote(tabId, payload) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (data) => {
      const bridge = window.LingatuBridge || window.PinBoardBridge;
      if (!bridge || typeof bridge.appendNote !== "function") {
        return { ok: false, reason: "bridge-not-found" };
      }
      return bridge.appendNote(data);
    },
    args: [payload]
  });
  return result;
}

function flashBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
}

function warnBridgeMissing() {
  flashBadge("!", "#c0392b");
  console.warn("Lingatu Connector: no se encontró el puente en la página. ¿Está actualizado lingatu.html?");
}

// Aviso efímero en la página que el usuario está leyendo. El badge del icono no
// vale como única confirmación: Chrome esconde los iconos no fijados dentro del
// menú de extensiones, así que el usuario no ve nada, cree que no ha funcionado
// y repite la captura — añadiendo la misma nota varias veces.
//
// No necesita permisos nuevos: activeTab se concede al invocar el menú
// contextual, igual que para leer los datos de la pestaña. Se inyecta en un
// shadow DOM cerrado para que el CSS del sitio no lo deforme ni él altere el
// sitio, y el texto entra siempre por textContent (el título del enlace es dato
// del usuario y la página anfitriona es terreno ajeno).
async function showPageToast(tabId, message, detail, isError) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (msg, det, err) => {
        const HOST_ID = "lingatu-connector-toast";
        const previo = document.getElementById(HOST_ID);
        if (previo) previo.remove();

        const host = document.createElement("div");
        host.id = HOST_ID;
        host.style.cssText = "all:initial;position:fixed;top:16px;right:16px;z-index:2147483647;";
        const root = host.attachShadow({ mode: "closed" });

        const style = document.createElement("style");
        style.textContent = `
          .toast{
            display:flex;flex-direction:column;gap:2px;
            font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
            background:#1b1e26;color:#e7e9ee;
            padding:12px 16px;border-radius:10px;
            border-left:4px solid #3ec472;
            box-shadow:0 10px 30px rgba(0,0,0,0.35);
            max-width:320px;
            animation:pbIn .18s ease-out;
          }
          .toast.error{border-left-color:#e5605c;}
          .titulo{font-size:14px;font-weight:600;}
          .detalle{font-size:12px;color:#9aa0ac;overflow-wrap:anywhere;}
          @keyframes pbIn{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:none;}}
        `;

        const caja = document.createElement("div");
        caja.className = err ? "toast error" : "toast";
        const titulo = document.createElement("div");
        titulo.className = "titulo";
        titulo.textContent = msg;
        caja.appendChild(titulo);
        if (det) {
          const detalle = document.createElement("div");
          detalle.className = "detalle";
          detalle.textContent = det;
          caja.appendChild(detalle);
        }

        root.append(style, caja);
        document.documentElement.appendChild(host);
        setTimeout(() => host.remove(), 3500);
      },
      args: [message, detail || "", !!isError]
    });
  } catch (err) {
    // Hay páginas donde no se puede inyectar nada (chrome://, la Chrome Web
    // Store, un PDF). No es un error de la operación —la nota ya está
    // guardada—, así que ahí el badge se queda como única confirmación.
    console.warn("Lingatu Connector: no se pudo mostrar el aviso en la página.", err);
  }
}

// Una selección entra como cita de Markdown: cada línea con "> ", incluidas las
// vacías, porque una línea en blanco sin marca cortaría la cita en dos.
function quoteSelection(text) {
  const clean = String(text || "").replace(/\r\n?/g, "\n").trim();
  if (!clean) return "";
  return clean.split("\n").map((line) => (line.trim() ? `> ${line}` : ">")).join("\n");
}

// Parte común de los dos flujos: comprueba que Lingatu está configurado, lee
// los datos de la pestaña activa y localiza (o abre en segundo plano) la
// pestaña de Lingatu. Devuelve null si no hay nada configurado todavía.
async function prepareLingatuCall(tab) {
  const lingatuUrl = await getLingatuUrl();
  if (!lingatuUrl) {
    chrome.runtime.openOptionsPage();
    return null;
  }
  const pageData = await getActiveTabData(tab);
  const lingatuTab = await findOrOpenLingatuTab(lingatuUrl);
  return { pageData, lingatuTab };
}

async function focusLingatuTab(tabId) {
  await chrome.tabs.update(tabId, { active: true });
  const tabInfo = await chrome.tabs.get(tabId);
  await chrome.windows.update(tabInfo.windowId, { focused: true });
}

// Flujo de siempre (icono de la extensión y menú contextual de página): salta
// a Lingatu, que es donde el usuario tiene que mirar — o para confirmar el
// alta en el modal precargado, o para ver la ficha ya existente resaltada.
async function savePage(tab) {
  const ctx = await prepareLingatuCall(tab);
  if (!ctx) return;
  const result = await callBridge(ctx.lingatuTab.id, ctx.pageData);

  await focusLingatuTab(ctx.lingatuTab.id);

  if (!result || !result.ok) warnBridgeMissing();
}

// Captura de una selección como nota. Si el enlace ya existe, la nota se añade
// sin modal y **sin cambiar de pestaña**: el usuario está leyendo y quiere
// seguir. Como no cambia nada delante de sus ojos, la confirmación tiene que
// ser explícita y estar en la página donde está mirando (showPageToast), con el
// recuento de notas de ese enlace; el badge se queda como refuerzo. Si el
// enlace no existe hay que abrir el modal precargado, y entonces sí se salta a
// Lingatu porque tiene que actuar.
async function addSelectionNote(tab, selectionText) {
  const note = quoteSelection(selectionText);
  if (!note) return;
  const ctx = await prepareLingatuCall(tab);
  if (!ctx) return;
  const result = await callBridgeAppendNote(ctx.lingatuTab.id, Object.assign({}, ctx.pageData, { note }));

  if (!result || !result.ok) {
    warnBridgeMissing();
    await showPageToast(tab.id, msg("toastNoteFailed"), msg("toastNoteFailedDetail"), true);
    return;
  }
  if (result.created) {
    await focusLingatuTab(ctx.lingatuTab.id);
  } else {
    flashBadge("✓", "#1f9d55");
    const notas = result.noteCount || 0;
    const detalle = (result.title || "") + (notas > 1 ? msgPlural("toastNoteCount", notas) : "");
    await showPageToast(tab.id, msg("toastNoteAdded"), detalle);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  // removeAll antes de crear: onInstalled también se dispara al actualizar la
  // extensión, y crear un id que ya existe lanza error.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_SAVE_PAGE,
      title: msg("menuSavePage"),
      contexts: ["page"]
    });
    chrome.contextMenus.create({
      id: MENU_ADD_SELECTION_NOTE,
      title: msg("menuAddSelectionNote"),
      contexts: ["selection"]
    });
  });
});

chrome.action.onClicked.addListener(async (activeTab) => {
  try {
    await savePage(activeTab);
  } catch (err) {
    flashBadge("!", "#c0392b");
    console.error("Error en Lingatu Connector:", err);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;
  try {
    if (info.menuItemId === MENU_SAVE_PAGE) {
      await savePage(tab);
    } else if (info.menuItemId === MENU_ADD_SELECTION_NOTE) {
      await addSelectionNote(tab, info.selectionText);
    }
  } catch (err) {
    flashBadge("!", "#c0392b");
    console.error("Error en Lingatu Connector:", err);
  }
});
