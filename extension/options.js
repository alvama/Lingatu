"use strict";

// Conserva el nombre anterior del producto a propósito: renombrar la clave
// borraría la URL ya configurada por cada usuario al actualizarse la extensión.
// Ver el comentario equivalente en background.js.
const STORAGE_KEY = "pinboardFileUrl";
const input = document.getElementById("url");
const status = document.getElementById("status");
const version = document.getElementById("version");

// Los textos salen de _locales, igual que en background.js. El idioma lo elige
// el navegador; esta página no tiene selector propio a propósito, para no
// insinuar que cambia también el de la app (son dos ajustes distintos).
function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
  });
  // Solo los párrafos de ayuda, que llevan <code>: texto propio de la extensión.
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = chrome.i18n.getMessage(el.dataset.i18nHtml);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", chrome.i18n.getMessage(el.dataset.i18nPlaceholder));
  });
  document.documentElement.lang = chrome.i18n.getUILanguage();
}

applyI18n();
version.textContent = "v" + chrome.runtime.getManifest().version;

chrome.storage.local.get(STORAGE_KEY, (data) => {
  if (data[STORAGE_KEY]) input.value = data[STORAGE_KEY];
});

document.getElementById("save").addEventListener("click", () => {
  const url = input.value.trim();
  if (!url.startsWith("file://")) {
    status.textContent = chrome.i18n.getMessage("optionsErrorFileUrl");
    status.style.color = "#c0392b";
    return;
  }
  chrome.storage.local.set({ [STORAGE_KEY]: url }, () => {
    status.textContent = chrome.i18n.getMessage("optionsSaved");
    status.style.color = "#2e7d32";
  });
});
