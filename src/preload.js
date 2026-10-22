const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("clipForge", {
  getHistory: () => ipcRenderer.invoke("history:get"),
  copyItem: id => ipcRenderer.invoke("history:copy", id),
  togglePin: id => ipcRenderer.invoke("history:pin", id),
  deleteItem: id => ipcRenderer.invoke("history:delete", id),
  clearUnpinned: () => ipcRenderer.invoke("history:clear"),
  clearAll: () => ipcRenderer.invoke("history:clear-all"),
  setPaused: value => ipcRenderer.invoke("history:set-paused", value),
  getPaused: () => ipcRenderer.invoke("history:get-paused"),
  onHistoryUpdated: callback => {
    const listener = (_event, history) => callback(history);
    ipcRenderer.on("history:updated", listener);
    return () => ipcRenderer.removeListener("history:updated", listener);
  }
});
