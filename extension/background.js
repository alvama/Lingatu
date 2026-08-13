"use strict";

const STORAGE_KEY = "pinboardFileUrl";
const MENU_SAVE_PAGE = "pinboard-guardar-pagina";
const MENU_ADD_SELECTION_NOTE = "pinboard-anadir-seleccion-nota";

async function getPinboardUrl() {
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

async function findOrOpenPinboardTab(url) {
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

// Se ejecuta en el "MAIN world" de la pestaña de pinboard.html, así que puede
// llamar directamente a window.PinBoardBridge tal y como lo expone esa página.
//
// CONTRATO ESTABLE con pinboard.html — contrato completo en
// docs/ESPECIFICACIONES.md, sección 8. Si cambia la firma de
// PinBoardBridge.checkDuplicate/focusExisting/suggestCategory/prefillAndOpen/
// appendNote en pinboard.html, estas dos funciones dejan de funcionar
// (normalmente en silencio, solo con el badge rojo "!" de flashBadge más abajo).
async function callBridge(tabId, payload) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (data) => {
      if (!window.PinBoardBridge) {
        return { ok: false, reason: "bridge-not-found" };
      }
      const dup = window.PinBoardBridge.checkDuplicate(data.url);
      if (dup) {
        window.PinBoardBridge.focusExisting(data.url);
        return { ok: true, duplicate: true, existing: dup };
      }
      const category = window.PinBoardBridge.suggestCategory(data.title, data.description, data.url);
      window.PinBoardBridge.prefillAndOpen(Object.assign({}, data, { category }));
      return { ok: true, duplicate: false, category };
    },
    args: [payload]
  });
  return result;
}

// La bifurcación "si la URL existe añade la nota, si no crea el enlace con
// ella" la decide el propio puente: devuelve {ok, created, ...} y aquí solo se
// interpreta si hay que saltar a la pestaña de PinBoard o basta con el badge.
async function callBridgeAppendNote(tabId, payload) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (data) => {
      if (!window.PinBoardBridge || typeof window.PinBoardBridge.appendNote !== "function") {
        return { ok: false, reason: "bridge-not-found" };
      }
      return window.PinBoardBridge.appendNote(data);
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
  console.warn("PinBoard Connector: no se encontró el puente en la página. ¿Está actualizado pinboard.html?");
}

// Una selección entra como cita de Markdown: cada línea con "> ", incluidas las
// vacías, porque una línea en blanco sin marca cortaría la cita en dos.
function quoteSelection(text) {
  const clean = String(text || "").replace(/\r\n?/g, "\n").trim();
  if (!clean) return "";
  return clean.split("\n").map((line) => (line.trim() ? `> ${line}` : ">")).join("\n");
}

// Parte común de los dos flujos: comprueba que PinBoard está configurado, lee
// los datos de la pestaña activa y localiza (o abre en segundo plano) la
// pestaña de PinBoard. Devuelve null si no hay nada configurado todavía.
async function preparePinboardCall(tab) {
  const pinboardUrl = await getPinboardUrl();
  if (!pinboardUrl) {
    chrome.runtime.openOptionsPage();
    return null;
  }
  const pageData = await getActiveTabData(tab);
  const pinboardTab = await findOrOpenPinboardTab(pinboardUrl);
  return { pageData, pinboardTab };
}

async function focusPinboardTab(tabId) {
  await chrome.tabs.update(tabId, { active: true });
  const tabInfo = await chrome.tabs.get(tabId);
  await chrome.windows.update(tabInfo.windowId, { focused: true });
}

// Flujo de siempre (icono de la extensión y menú contextual de página): salta
// a PinBoard, que es donde el usuario tiene que mirar — o para confirmar el
// alta en el modal precargado, o para ver la ficha ya existente resaltada.
async function savePage(tab) {
  const ctx = await preparePinboardCall(tab);
  if (!ctx) return;
  const result = await callBridge(ctx.pinboardTab.id, ctx.pageData);

  await focusPinboardTab(ctx.pinboardTab.id);

  if (!result || !result.ok) warnBridgeMissing();
}

// Captura de una selección como nota. Si el enlace ya existe, la nota se añade
// sin modal y **sin cambiar de pestaña**: el usuario está leyendo y quiere
// seguir, así que la confirmación es el badge. Si no existe, hay que abrir el
// modal precargado, y entonces sí se salta a PinBoard porque tiene que actuar.
async function addSelectionNote(tab, selectionText) {
  const note = quoteSelection(selectionText);
  if (!note) return;
  const ctx = await preparePinboardCall(tab);
  if (!ctx) return;
  const result = await callBridgeAppendNote(ctx.pinboardTab.id, Object.assign({}, ctx.pageData, { note }));

  if (!result || !result.ok) {
    warnBridgeMissing();
    return;
  }
  if (result.created) {
    await focusPinboardTab(ctx.pinboardTab.id);
  } else {
    flashBadge("✓", "#1f9d55");
  }
}

chrome.runtime.onInstalled.addListener(() => {
  // removeAll antes de crear: onInstalled también se dispara al actualizar la
  // extensión, y crear un id que ya existe lanza error.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_SAVE_PAGE,
      title: "Guardar en PinBoard",
      contexts: ["page"]
    });
    chrome.contextMenus.create({
      id: MENU_ADD_SELECTION_NOTE,
      title: "Añadir selección como nota en PinBoard",
      contexts: ["selection"]
    });
  });
});

chrome.action.onClicked.addListener(async (activeTab) => {
  try {
    await savePage(activeTab);
  } catch (err) {
    flashBadge("!", "#c0392b");
    console.error("Error en PinBoard Connector:", err);
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
    console.error("Error en PinBoard Connector:", err);
  }
});
