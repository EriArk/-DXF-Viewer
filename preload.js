const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("DXFAPP", {
  ping: () => "pong",
  pickDxf: () => ipcRenderer.invoke("pick-dxf"),
  readDxf: (filePath) => ipcRenderer.invoke("read-dxf", filePath),
  onOpenPath: (cb) => ipcRenderer.on("open-dxf-path", (_e, p) => cb(p))
});

