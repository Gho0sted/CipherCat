const { contextBridge, ipcRenderer } = require("electron");

// Безопасный API для рендер-процесса
contextBridge.exposeInMainWorld("electronAPI", {
  // Файловые операции
  saveFile: (content) => ipcRenderer.invoke("save-file", content),
  openFile: () => ipcRenderer.invoke("open-file"),

  // Уведомления о безопасности
  showSecurityWarning: (message) => {
    console.warn("Security Warning:", message);
  },
});

// Блокируем доступ к Node.js API
delete window.require;
delete window.exports;
delete window.module;
