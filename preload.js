const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("DXFAPP", {
  ping: () => "pong",
  pickDxf: () => ipcRenderer.invoke("pick-dxf"),
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  readDxf: (filePath) => ipcRenderer.invoke("read-dxf", filePath),
  listFolderDxf: (folderPath) => ipcRenderer.invoke("list-folder-dxf", folderPath),
  getAppEdition: () => ipcRenderer.invoke("get-app-edition"),
  onOpenPath: (cb) => ipcRenderer.on("open-dxf-path", (_e, p) => cb(p))
});
