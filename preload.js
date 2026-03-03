const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("DXFAPP", {
  ping: () => "pong",
  pickDxf: () => ipcRenderer.invoke("pick-dxf"),
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  readDxf: (filePath) => ipcRenderer.invoke("read-dxf", filePath),
  listFolderDxf: (folderPath) => ipcRenderer.invoke("list-folder-dxf", folderPath),
  onOpenPath: (cb) => ipcRenderer.on("open-dxf-path", (_e, p) => cb(p))
});
