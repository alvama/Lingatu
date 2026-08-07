"use strict";

const STORAGE_KEY = "pinboardFileUrl";
const input = document.getElementById("url");
const status = document.getElementById("status");
const version = document.getElementById("version");

version.textContent = "v" + chrome.runtime.getManifest().version;

chrome.storage.local.get(STORAGE_KEY, (data) => {
  if (data[STORAGE_KEY]) input.value = data[STORAGE_KEY];
});

document.getElementById("save").addEventListener("click", () => {
  const url = input.value.trim();
  if (!url.startsWith("file://")) {
    status.textContent = "Debe ser una URL file:// (ábrela en el navegador y copia la barra de direcciones).";
    status.style.color = "#c0392b";
    return;
  }
  chrome.storage.local.set({ [STORAGE_KEY]: url }, () => {
    status.textContent = "Guardado.";
    status.style.color = "#2e7d32";
  });
});
