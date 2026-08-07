"use strict";

const STORAGE_KEY = "pinboardFileUrl";

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

function flashBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
}

chrome.action.onClicked.addListener(async (activeTab) => {
  try {
    const pinboardUrl = await getPinboardUrl();
    if (!pinboardUrl) {
      chrome.runtime.openOptionsPage();
      return;
    }

    const pageData = await getActiveTabData(activeTab);
    const pinboardTab = await findOrOpenPinboardTab(pinboardUrl);
    const result = await callBridge(pinboardTab.id, pageData);

    await chrome.tabs.update(pinboardTab.id, { active: true });
    const tabInfo = await chrome.tabs.get(pinboardTab.id);
    await chrome.windows.update(tabInfo.windowId, { focused: true });

    if (!result || !result.ok) {
      flashBadge("!", "#c0392b");
      console.warn("PinBoard Connector: no se encontró el puente en la página. ¿Está actualizado pinboard.html?");
    }
  } catch (err) {
    flashBadge("!", "#c0392b");
    console.error("Error en PinBoard Connector:", err);
  }
});
