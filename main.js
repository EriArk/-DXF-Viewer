const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

// Если будут проблемы с WebGL на Linux — раскомментируй:
// app.commandLine.appendSwitch("use-gl", "swiftshader");
// app.commandLine.appendSwitch("ignore-gpu-blacklist");

let pendingOpenPath = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#111",

    // убираем верхнюю полоску File/Edit/View...
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // на всякий случай — полностью прячем меню окна
  win.setMenuBarVisibility(false);
  win.removeMenu();

  win.loadFile(path.join(__dirname, "index.html"));

  win.webContents.on("did-finish-load", () => {
    if (pendingOpenPath) {
      win.webContents.send("open-dxf-path", pendingOpenPath);
      pendingOpenPath = null;
    }
  });

  return win;
}

function handleOpenPath(filePath) {
  if (filePath && filePath.toLowerCase().endsWith(".dxf")) {
    pendingOpenPath = filePath;
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.send("open-dxf-path", pendingOpenPath);
  }
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const p = argv.find((a) => typeof a === "string" && a.toLowerCase().endsWith(".dxf"));
    if (p) handleOpenPath(p);

    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // убираем Application Menu (File/Edit/View...) на Linux/Windows
    if (process.platform !== "darwin") {
      Menu.setApplicationMenu(null);
    }

    createWindow();

    const p = process.argv.find((a) => typeof a === "string" && a.toLowerCase().endsWith(".dxf"));
    if (p) handleOpenPath(p);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  handleOpenPath(filePath);
});

// Диалог выбора DXF
ipcMain.handle("pick-dxf", async () => {
  const res = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "DXF", extensions: ["dxf"] }]
  });

  if (res.canceled || !res.filePaths?.length) return null;
  return res.filePaths[0];
});

// Чтение DXF (текстовый)
ipcMain.handle("read-dxf", async (_evt, filePath) => {
  if (!filePath) return null;
  return fs.readFileSync(filePath, "utf8");
});

