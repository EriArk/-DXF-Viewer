import { DxfViewer } from "dxf-viewer";
import { Color } from "three";

const viewerWrapEl = document.getElementById("viewer-wrap");
const viewerEl = document.getElementById("viewer");
const statusEl = document.getElementById("status");
const openBtn = document.getElementById("openBtn");
const openBtnStart = document.getElementById("openBtnStart");
const openFolderBtn = document.getElementById("openFolderBtn");
const openFolderBtnStart = document.getElementById("openFolderBtnStart");
const dropEl = document.getElementById("drop");
const welcomeRecentFilesEl = document.getElementById("welcomeRecentFiles");
const welcomeRecentFoldersEl = document.getElementById("welcomeRecentFolders");
const sidebarRecentFilesEl = document.getElementById("sidebarRecentFiles");
const sidebarRecentFoldersEl = document.getElementById("sidebarRecentFolders");
const sidebarFolderPathEl = document.getElementById("sidebarFolderPath");
const sidebarFolderFilesEl = document.getElementById("sidebarFolderFiles");
const settingsWrapEl = document.getElementById("settingsWrap");
const settingsBtnEl = document.getElementById("settingsBtn");
const settingsMenuEl = document.getElementById("settingsMenu");
const themeLightBtn = document.getElementById("themeLightBtn");
const themeDarkBtn = document.getElementById("themeDarkBtn");
const themeBtnStart = document.getElementById("themeBtnStart");
const lineThicknessSlider = document.getElementById("lineThicknessSlider");
const lineLevelEl = document.getElementById("lineLevel");
const helpBtn = document.getElementById("helpBtn");
const aboutBtn = document.getElementById("aboutBtn");
const helpModalEl = document.getElementById("helpModal");
const helpCloseBtn = document.getElementById("helpCloseBtn");
const aboutModalEl = document.getElementById("aboutModal");
const aboutCloseBtn = document.getElementById("aboutCloseBtn");
const rulerBtnEl = document.getElementById("rulerBtn");
const guideToggleEl = document.getElementById("guideToggle");
const snapToggleEl = document.getElementById("snapToggle");
const topRulerEl = document.getElementById("ruler-top");
const leftRulerEl = document.getElementById("ruler-left");
const measureInfoEl = document.getElementById("measureInfo");
const measureOverlayEl = document.getElementById("measure-overlay");
const guideV1El = document.getElementById("guide-v1");
const guideV2El = document.getElementById("guide-v2");
const guideH1El = document.getElementById("guide-h1");
const guideH2El = document.getElementById("guide-h2");

let dxfViewer = null;
let lastObjectUrl = null;
let lastLoadedPath = null;
let lastLoadedText = null;
let hasLoadedFile = false;
let modelUnitToMm = 1;
let lastMmPerPxX = 1;
let lastMmPerPxY = 1;
let resizeFitTimer = 0;
let showMarkerGuides = true;
let snapEnabled = true;
let renderGl = null;
let lineThicknessLevel = 0;
let recentFiles = [];
let recentFolders = [];
let recentFolderLastFile = {};
let currentFolderPath = "";
let currentFolderFiles = [];

const RECENT_FILES_KEY = "recentFiles";
const RECENT_FOLDERS_KEY = "recentFolders";
const RECENT_FOLDER_LAST_FILE_KEY = "recentFolderLastFile";
const MAX_RECENT_FILES = 12;
const MAX_RECENT_FOLDERS = 10;

const markers = {
  top: [60, 220],
  left: [60, 220],
  topWorld: [null, null],
  leftWorld: [null, null],
  dragging: null,
};

/* ---------------- Recent files / folders ---------------- */

function pathCompareKey(pathValue) {
  return String(pathValue || "").trim().replace(/\\/g, "/").toLowerCase();
}

function pathBaseName(pathValue) {
  const raw = String(pathValue || "").trim().replace(/[\\/]+$/, "");
  if (!raw) return "";
  const idx = Math.max(raw.lastIndexOf("/"), raw.lastIndexOf("\\"));
  return idx >= 0 ? raw.slice(idx + 1) : raw;
}

function pathDirName(pathValue) {
  const raw = String(pathValue || "").trim().replace(/[\\/]+$/, "");
  if (!raw) return "";
  const idx = Math.max(raw.lastIndexOf("/"), raw.lastIndexOf("\\"));
  if (idx <= 0) return idx === 0 ? raw.slice(0, 1) : "";
  return raw.slice(0, idx);
}

function loadRecentArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function saveRecentArray(key, values) {
  try { localStorage.setItem(key, JSON.stringify(values)); } catch {}
}

function loadRecentFolderLastFile() {
  try {
    const raw = localStorage.getItem(RECENT_FOLDER_LAST_FILE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      const key = String(k || "").trim();
      const val = String(v || "").trim();
      if (key && val) out[key] = val;
    }
    return out;
  } catch {
    return {};
  }
}

function saveRecentFolderLastFile() {
  try { localStorage.setItem(RECENT_FOLDER_LAST_FILE_KEY, JSON.stringify(recentFolderLastFile)); } catch {}
}

function upsertRecentPath(list, nextPath, maxItems) {
  const value = String(nextPath || "").trim();
  if (!value) return list;
  const key = pathCompareKey(value);
  const nextList = [value];
  for (const p of list) {
    if (pathCompareKey(p) !== key) nextList.push(p);
    if (nextList.length >= maxItems) break;
  }
  return nextList;
}

function addRecentFolder(folderPath) {
  const folder = String(folderPath || "").trim();
  if (!folder) return;
  recentFolders = upsertRecentPath(recentFolders, folder, MAX_RECENT_FOLDERS);
  saveRecentArray(RECENT_FOLDERS_KEY, recentFolders);
}

function addRecentFile(filePath) {
  const file = String(filePath || "").trim();
  if (!file) return;

  recentFiles = upsertRecentPath(recentFiles, file, MAX_RECENT_FILES);
  saveRecentArray(RECENT_FILES_KEY, recentFiles);

  const folder = pathDirName(file);
  if (folder) {
    addRecentFolder(folder);
    recentFolderLastFile[pathCompareKey(folder)] = file;
    saveRecentFolderLastFile();
  }
}

function removeRecentFile(filePath) {
  const key = pathCompareKey(filePath);
  recentFiles = recentFiles.filter((p) => pathCompareKey(p) !== key);
  saveRecentArray(RECENT_FILES_KEY, recentFiles);
}

function setCurrentFolderListing(folderPath, files) {
  currentFolderPath = String(folderPath || "").trim();
  currentFolderFiles = Array.isArray(files) ? files.map((p) => String(p || "").trim()).filter(Boolean) : [];
  renderCurrentFolderFiles();
}

function renderCurrentFolderFiles() {
  if (sidebarFolderPathEl) {
    sidebarFolderPathEl.textContent = currentFolderPath || "Open a folder to list all DXF files.";
  }
  if (!sidebarFolderFilesEl) return;

  sidebarFolderFilesEl.textContent = "";
  if (!currentFolderPath) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "recentEmpty";
    emptyEl.textContent = "No active folder.";
    sidebarFolderFilesEl.appendChild(emptyEl);
    return;
  }

  if (!currentFolderFiles.length) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "recentEmpty";
    emptyEl.textContent = "No .dxf files in this folder.";
    sidebarFolderFilesEl.appendChild(emptyEl);
    return;
  }

  const activeKey = pathCompareKey(lastLoadedPath);
  for (const filePath of currentFolderFiles) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "recentItem";
    btn.title = filePath;
    if (pathCompareKey(filePath) === activeKey) {
      btn.setAttribute("data-active", "true");
    }

    const primary = document.createElement("div");
    primary.className = "recentPrimary";
    primary.textContent = pathBaseName(filePath) || filePath;
    btn.appendChild(primary);

    const secondary = document.createElement("div");
    secondary.className = "recentSecondary";
    secondary.textContent = filePath;
    btn.appendChild(secondary);

    btn.addEventListener("click", () => {
      loadDxfFromPath(filePath).catch((e) => {
        console.error(e);
        setStatus(`Error: ${e?.message || e}`);
      });
    });

    sidebarFolderFilesEl.appendChild(btn);
  }
}

function renderRecentPanel(listEl, paths, kind) {
  if (!listEl) return;
  listEl.textContent = "";

  if (!paths.length) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "recentEmpty";
    emptyEl.textContent = kind === "file" ? "No recent files yet." : "No recent folders yet.";
    listEl.appendChild(emptyEl);
    return;
  }

  for (const fullPath of paths) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "recentItem";
    btn.title = fullPath;

    const primary = document.createElement("div");
    primary.className = "recentPrimary";
    primary.textContent = pathBaseName(fullPath) || fullPath;
    btn.appendChild(primary);

    const secondary = document.createElement("div");
    secondary.className = "recentSecondary";
    secondary.textContent = kind === "file" ? pathDirName(fullPath) : fullPath;
    btn.appendChild(secondary);

    btn.addEventListener("click", () => {
      if (kind === "file") {
        loadDxfFromPath(fullPath).catch((e) => {
          console.error(e);
          removeRecentFile(fullPath);
          renderRecentLists();
        });
      } else {
        openFolderByPath(fullPath).catch((e) => {
          console.error(e);
          setStatus(`Error: ${e?.message || e}`);
        });
      }
    });

    listEl.appendChild(btn);
  }
}

function renderRecentLists() {
  renderRecentPanel(welcomeRecentFilesEl, recentFiles, "file");
  renderRecentPanel(sidebarRecentFilesEl, recentFiles, "file");
  renderRecentPanel(welcomeRecentFoldersEl, recentFolders, "folder");
  renderRecentPanel(sidebarRecentFoldersEl, recentFolders, "folder");
  renderCurrentFolderFiles();
}

function initRecents() {
  recentFiles = loadRecentArray(RECENT_FILES_KEY).slice(0, MAX_RECENT_FILES);
  recentFolders = loadRecentArray(RECENT_FOLDERS_KEY).slice(0, MAX_RECENT_FOLDERS);
  recentFolderLastFile = loadRecentFolderLastFile();
  renderRecentLists();
}

/* ---------------- Theme (Light/Dark) ---------------- */

function getSavedTheme() {
  try {
    const t = localStorage.getItem("theme");
    if (t === "dark" || t === "light") return t;
  } catch {}
  return null;
}

function setTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  const icon = (theme === "dark") ? "☀️" : "🌙";
  if (themeLightBtn) themeLightBtn.setAttribute("data-active", theme === "light" ? "true" : "false");
  if (themeDarkBtn) themeDarkBtn.setAttribute("data-active", theme === "dark" ? "true" : "false");
  if (themeBtnStart) themeBtnStart.textContent = icon;
  try { localStorage.setItem("theme", theme); } catch {}
}

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

function getSavedGuidesState() {
  try {
    return localStorage.getItem("showMarkerGuides");
  } catch {}
  return null;
}

function getSavedSnapState() {
  try {
    return localStorage.getItem("snapGuides");
  } catch {}
  return null;
}

function getSavedLineThicknessState() {
  try {
    return localStorage.getItem("lineThicknessLevel");
  } catch {}
  return null;
}

function setMarkerGuidesVisible(visible) {
  showMarkerGuides = !!visible;
  if (guideToggleEl) guideToggleEl.checked = showMarkerGuides;
  try { localStorage.setItem("showMarkerGuides", showMarkerGuides ? "1" : "0"); } catch {}
  syncGuideLines();
}

function setSnapEnabled(visible) {
  snapEnabled = !!visible;
  if (snapToggleEl) snapToggleEl.checked = snapEnabled;
  try { localStorage.setItem("snapGuides", snapEnabled ? "1" : "0"); } catch {}
}

function clampLineThicknessLevel(v) {
  return Math.max(0, Math.min(4, Math.round(v)));
}

function renderWithThickness() {
  if (!dxfViewer || !dxfViewer.__baseRender) return;
  if (lineThicknessLevel <= 0) {
    dxfViewer.Render = dxfViewer.__baseRender;
    return;
  }

  dxfViewer.Render = () => {
    const renderer = dxfViewer.GetRenderer?.();
    const camera = dxfViewer.GetCamera?.();
    const scene = dxfViewer.GetScene?.();
    const canvas = dxfViewer.GetCanvas?.();
    if (!renderer || !camera || !scene || !canvas) {
      dxfViewer.__baseRender();
      return;
    }

    const prevAutoClear = renderer.autoClear;
    const baseX = camera.position.x;
    const baseY = camera.position.y;

    const viewW = (camera.right - camera.left) / camera.zoom;
    const viewH = (camera.top - camera.bottom) / camera.zoom;
    const cssW = Math.max(1, canvas.clientWidth || canvas.width || 1);
    const cssH = Math.max(1, canvas.clientHeight || canvas.height || 1);
    const unitPerPxX = viewW / cssW;
    const unitPerPxY = viewH / cssH;
    const px = 0.33 * lineThicknessLevel;
    const passes = [
      [0, 0],
      [px, 0],
      [-px, 0],
      [0, px],
      [0, -px],
    ];

    renderer.autoClear = true;
    renderer.clear();
    renderer.autoClear = false;

    for (const [ox, oy] of passes) {
      camera.position.x = baseX + ox * unitPerPxX;
      camera.position.y = baseY + oy * unitPerPxY;
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
    }

    camera.position.x = baseX;
    camera.position.y = baseY;
    camera.updateMatrixWorld();
    renderer.autoClear = prevAutoClear;
  };
}

function applyLineThicknessMode() {
  if (!lineLevelEl) return;
  lineLevelEl.textContent = `${1 + lineThicknessLevel}x`;
  if (lineThicknessSlider) lineThicknessSlider.value = String(1 + lineThicknessLevel);
  if (!dxfViewer) return;
  if (!dxfViewer.__baseRender) {
    dxfViewer.__baseRender = dxfViewer.Render.bind(dxfViewer);
  }
  renderWithThickness();
  dxfViewer.Render();
}

function setLineThicknessLevel(next) {
  lineThicknessLevel = clampLineThicknessLevel(next);
  try { localStorage.setItem("lineThicknessLevel", String(lineThicknessLevel)); } catch {}
  applyLineThicknessMode();
}

function setRulersVisible(visible) {
  document.body.setAttribute("data-rulers", visible ? "on" : "off");
  if (rulerBtnEl) {
    rulerBtnEl.textContent = visible ? "➡" : "📏";
    rulerBtnEl.setAttribute("aria-label", visible ? "Hide rulers panel" : "Show rulers panel");
  }
  requestAnimationFrame(() => {
    if (hasLoadedFile) resizeViewerIfPossible();
    drawRulers();
    syncGuideLines();
    updateMeasureInfo();
  });
}

function isSettingsOpen() {
  return settingsWrapEl?.getAttribute("data-open") === "true";
}

function setSettingsOpen(open) {
  if (!settingsWrapEl) return;
  settingsWrapEl.setAttribute("data-open", open ? "true" : "false");
}

function isHelpOpen() {
  return helpModalEl?.getAttribute("data-open") === "true";
}

function setHelpOpen(open) {
  if (!helpModalEl) return;
  helpModalEl.setAttribute("data-open", open ? "true" : "false");
  helpModalEl.setAttribute("aria-hidden", open ? "false" : "true");
}

function isAboutOpen() {
  return aboutModalEl?.getAttribute("data-open") === "true";
}

function setAboutOpen(open) {
  if (!aboutModalEl) return;
  aboutModalEl.setAttribute("data-open", open ? "true" : "false");
  aboutModalEl.setAttribute("aria-hidden", open ? "false" : "true");
}

function isEditableTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName;
  return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

async function switchTheme(next) {
  if (currentTheme() === next) return;
  setTheme(next);
  // On the welcome screen we only need UI theme switching.
  if (!hasLoadedFile && !lastLoadedText) return;

  // Recreate viewer with proper colors when a file is already loaded.
  try {
    await rebuildViewerAndRedraw();
  } catch (e) {
    console.error(e);
    setStatus(`Error: ${e?.message || e}`);
  }
}

async function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  await switchTheme(next);
}

if (themeBtnStart) themeBtnStart.addEventListener("click", toggleTheme);
if (themeLightBtn) themeLightBtn.addEventListener("click", () => switchTheme("light"));
if (themeDarkBtn) themeDarkBtn.addEventListener("click", () => switchTheme("dark"));
if (settingsBtnEl && settingsWrapEl) {
  settingsBtnEl.addEventListener("click", (e) => {
    e.stopPropagation();
    setSettingsOpen(!isSettingsOpen());
  });
}
if (settingsMenuEl) settingsMenuEl.addEventListener("click", (e) => e.stopPropagation());
window.addEventListener("click", () => {
  setSettingsOpen(false);
});
if (helpBtn) {
  helpBtn.addEventListener("click", () => {
    setSettingsOpen(false);
    setAboutOpen(false);
    setHelpOpen(true);
  });
}
if (helpCloseBtn) {
  helpCloseBtn.addEventListener("click", () => setHelpOpen(false));
}
if (helpModalEl) {
  helpModalEl.addEventListener("click", (e) => {
    if (e.target === helpModalEl) setHelpOpen(false);
  });
}
if (aboutBtn) {
  aboutBtn.addEventListener("click", () => {
    setSettingsOpen(false);
    setHelpOpen(false);
    setAboutOpen(true);
  });
}
if (aboutCloseBtn) {
  aboutCloseBtn.addEventListener("click", () => setAboutOpen(false));
}
if (aboutModalEl) {
  aboutModalEl.addEventListener("click", (e) => {
    if (e.target === aboutModalEl) setAboutOpen(false);
  });
}
if (rulerBtnEl) {
  rulerBtnEl.addEventListener("click", () => {
    const on = document.body.getAttribute("data-rulers") === "on";
    setRulersVisible(!on);
  });
}
if (guideToggleEl) {
  guideToggleEl.addEventListener("change", () => {
    setMarkerGuidesVisible(guideToggleEl.checked);
  });
}
if (snapToggleEl) {
  snapToggleEl.addEventListener("change", () => {
    setSnapEnabled(snapToggleEl.checked);
  });
}
if (lineThicknessSlider) {
  lineThicknessSlider.addEventListener("input", () => {
    const v = Number(lineThicknessSlider.value);
    setLineThicknessLevel(v - 1);
  });
}

window.addEventListener("keydown", (e) => {
  const key = e.key;
  const code = e.code;
  const ctrlOrMeta = e.ctrlKey || e.metaKey;

  if (key === "Escape") {
    if (isAboutOpen()) {
      setAboutOpen(false);
      e.preventDefault();
      return;
    }
    if (isHelpOpen()) {
      setHelpOpen(false);
      e.preventDefault();
      return;
    }
    if (isSettingsOpen()) {
      setSettingsOpen(false);
      e.preventDefault();
      return;
    }
  }

  if (key === "F1") {
    e.preventDefault();
    setAboutOpen(false);
    setHelpOpen(true);
    setSettingsOpen(false);
    return;
  }

  if (!ctrlOrMeta || isEditableTarget(e.target)) return;

  if (code === "KeyO" || key === "o" || key === "O") {
    e.preventDefault();
    if (e.shiftKey) openFolderDialog();
    else openDxfDialog();
    return;
  }
  if (code === "Comma" || key === ",") {
    e.preventDefault();
    setSettingsOpen(!isSettingsOpen());
    return;
  }
  if (code === "KeyR" || key === "r" || key === "R") {
    e.preventDefault();
    const on = document.body.getAttribute("data-rulers") === "on";
    setRulersVisible(!on);
    return;
  }
  if (code === "KeyF" || key === "f" || key === "F") {
    e.preventDefault();
    if (!hasLoadedFile) return;
    fitToViewIfPossible()
      .then(() => {
        drawRulers();
        syncGuideLines();
        updateMeasureInfo();
      })
      .catch(() => {
        drawRulers();
        syncGuideLines();
        updateMeasureInfo();
      });
    return;
  }
  if (code === "KeyX" || key === "x" || key === "X") {
    e.preventDefault();
    window.close();
    return;
  }
  if (code === "KeyT" || key === "t" || key === "T") {
    e.preventDefault();
    toggleTheme();
    return;
  }
  if (key === "=" || key === "+" || key === "Add") {
    e.preventDefault();
    setLineThicknessLevel(lineThicknessLevel + 1);
    return;
  }
  if (key === "-" || key === "_" || key === "Subtract") {
    e.preventDefault();
    setLineThicknessLevel(lineThicknessLevel - 1);
  }
});

(function initTheme() {
  const saved = getSavedTheme();
  if (saved) {
    setTheme(saved);
    return;
  }
  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  setTheme(prefersDark ? "dark" : "light");
})();

(function initRulers() {
  setRulersVisible(false);
})();

(function initGuides() {
  const saved = getSavedGuidesState();
  if (saved === "0") setMarkerGuidesVisible(false);
  else setMarkerGuidesVisible(true);
})();

(function initSnap() {
  const saved = getSavedSnapState();
  if (saved === "0") setSnapEnabled(false);
  else setSnapEnabled(true);
})();

(function initLineThickness() {
  const saved = getSavedLineThicknessState();
  const lvl = saved == null ? 0 : Number(saved);
  setLineThicknessLevel(Number.isFinite(lvl) ? lvl : 0);
})();

(function initRecentState() {
  initRecents();
})();

function startMarkerDrag(axis, index) {
  markers.dragging = { axis, index };
}

function stopMarkerDrag() {
  markers.dragging = null;
}

function markerIndexForPosition(values, pos) {
  const d0 = Math.abs(values[0] - pos);
  const d1 = Math.abs(values[1] - pos);
  if (Math.min(d0, d1) <= 14) return d0 <= d1 ? 0 : 1;
  return d0 <= d1 ? 0 : 1;
}

function getRenderCanvasAndGl() {
  const canvas = viewerEl.querySelector("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) return null;
  if (!renderGl || renderGl.canvas !== canvas) {
    renderGl = canvas.getContext("webgl2") ||
               canvas.getContext("webgl") ||
               canvas.getContext("experimental-webgl");
  }
  if (!renderGl) return null;
  return { canvas, gl: renderGl };
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function luminanceAt(buf, idx) {
  const r = buf[idx];
  const g = buf[idx + 1];
  const b = buf[idx + 2];
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function dominantLuminance(buf, stride, count, sampleStep = 2) {
  const bins = new Array(32).fill(0);
  for (let i = 0; i < count; i += sampleStep) {
    const lum = luminanceAt(buf, i * stride);
    const b = Math.max(0, Math.min(31, Math.floor(lum / 8)));
    bins[b]++;
  }
  let best = 0;
  for (let i = 1; i < bins.length; i++) {
    if (bins[i] > bins[best]) best = i;
  }
  return best * 8 + 4;
}

function refineSnapToStrokeCenterX(data, w, h, approxCol) {
  const minCol = Math.max(0, approxCol - 10);
  const maxCol = Math.min(w - 1, approxCol + 10);
  const bgLum = dominantLuminance(data, 4, w * h, 3);
  let bestCol = approxCol;
  let bestInk = -1;
  for (let col = minCol; col <= maxCol; col++) {
    let ink = 0;
    for (let y = 0; y < h; y += 2) {
      const i = (y * w + col) * 4;
      const lum = luminanceAt(data, i);
      ink += Math.abs(lum - bgLum);
    }
    if (ink > bestInk) {
      bestInk = ink;
      bestCol = col;
    }
  }
  return bestCol;
}

function refineSnapToStrokeCenterY(data, w, h, approxRow) {
  const minRow = Math.max(0, approxRow - 10);
  const maxRow = Math.min(h - 1, approxRow + 10);
  const bgLum = dominantLuminance(data, 4, w * h, 3);
  let bestRow = approxRow;
  let bestInk = -1;
  for (let row = minRow; row <= maxRow; row++) {
    let ink = 0;
    for (let x = 0; x < w; x += 2) {
      const i = (row * w + x) * 4;
      const lum = luminanceAt(data, i);
      ink += Math.abs(lum - bgLum);
    }
    if (ink > bestInk) {
      bestInk = ink;
      bestRow = row;
    }
  }
  return bestRow;
}

function snapPositionToEdge(axis, cssPos, markerIdx = 0) {
  if (!snapEnabled || !hasLoadedFile) return cssPos;
  let sampledFromBase = false;
  let result = cssPos;
  try {
    if (lineThicknessLevel > 0 && dxfViewer?.__baseRender) {
      dxfViewer.__baseRender();
      sampledFromBase = true;
    }

    const pair = getRenderCanvasAndGl();
    if (!pair) return snapToBoundsFallback(axis, cssPos);
    const { canvas, gl } = pair;
    const rect = canvas.getBoundingClientRect();
    const fbW = canvas.width | 0;
    const fbH = canvas.height | 0;
    if (fbW <= 2 || fbH <= 2 || rect.width <= 0 || rect.height <= 0) {
      return snapToBoundsFallback(axis, cssPos);
    }

    const searchCss = 12;
    const threshold = 24;
    const step = 2;
    if (axis === "top") {
      const xFb = clampInt((cssPos / rect.width) * fbW, 0, fbW - 1);
      const searchFb = Math.max(2, Math.round((searchCss / rect.width) * fbW));
      const x0 = clampInt(xFb - searchFb, 0, fbW - 1);
      const x1 = clampInt(xFb + searchFb, 0, fbW - 1);
      const w = x1 - x0 + 1;
      if (w < 3) return snapToBoundsFallback(axis, cssPos);
      const data = new Uint8Array(w * fbH * 4);
      gl.readPixels(x0, 0, w, fbH, gl.RGBA, gl.UNSIGNED_BYTE, data);

      let bestCol = -1;
      let bestScore = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let col = 1; col < w - 1; col++) {
        let score = 0;
        for (let y = 1; y < fbH - 1; y += step) {
          const i = (y * w + col) * 4;
          const lumL = luminanceAt(data, i - 4);
          const lumR = luminanceAt(data, i + 4);
          const lumU = luminanceAt(data, i + w * 4);
          const lumD = luminanceAt(data, i - w * 4);
          const gx = Math.abs(lumR - lumL);
          const gy = Math.abs(lumU - lumD);
          const g = Math.max(gx, gy);
          if (g > threshold) score += g;
        }
        const dist = Math.abs((x0 + col) - xFb);
        if (score > bestScore || (score === bestScore && dist < bestDist)) {
          bestScore = score;
          bestCol = col;
          bestDist = dist;
        }
      }
      if (bestCol < 0 || bestScore < 120) return snapToBoundsFallback(axis, cssPos);
      const centerCol = refineSnapToStrokeCenterX(data, w, fbH, bestCol);
      const snappedFb = x0 + centerCol;
      result = clamp(((snappedFb + 0.5) / fbW) * rect.width, 0, rect.width);
      return result;
    }

    const yFbTop = clampInt((cssPos / rect.height) * fbH, 0, fbH - 1);
    const yFb = fbH - 1 - yFbTop;
    const searchFb = Math.max(2, Math.round((searchCss / rect.height) * fbH));
    const y0 = clampInt(yFb - searchFb, 0, fbH - 1);
    const y1 = clampInt(yFb + searchFb, 0, fbH - 1);
    const h = y1 - y0 + 1;
    if (h < 3) return snapToBoundsFallback(axis, cssPos);
    const data = new Uint8Array(fbW * h * 4);
    gl.readPixels(0, y0, fbW, h, gl.RGBA, gl.UNSIGNED_BYTE, data);

    let bestRow = -1;
    let bestScore = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let row = 1; row < h - 1; row++) {
      let score = 0;
      for (let x = 1; x < fbW - 1; x += step) {
        const i = (row * fbW + x) * 4;
        const lumL = luminanceAt(data, i - 4);
        const lumR = luminanceAt(data, i + 4);
        const lumU = luminanceAt(data, i + fbW * 4);
        const lumD = luminanceAt(data, i - fbW * 4);
        const gx = Math.abs(lumR - lumL);
        const gy = Math.abs(lumU - lumD);
        const g = Math.max(gx, gy);
        if (g > threshold) score += g;
      }
      const dist = Math.abs((y0 + row) - yFb);
      if (score > bestScore || (score === bestScore && dist < bestDist)) {
        bestScore = score;
        bestRow = row;
        bestDist = dist;
      }
    }
    if (bestRow < 0 || bestScore < 120) return snapToBoundsFallback(axis, cssPos);
    const centerRow = refineSnapToStrokeCenterY(data, fbW, h, bestRow);
    const snappedFb = y0 + centerRow;
    const snappedTopFb = fbH - 1 - snappedFb;
    result = clamp(((snappedTopFb + 0.5) / fbH) * rect.height, 0, rect.height);
    return result;
  } finally {
    if (sampledFromBase && dxfViewer) {
      dxfViewer.Render();
    }
  }
}

function snapToBoundsFallback(axis, cssPos) {
  if (!dxfViewer) return cssPos;
  const bounds = dxfViewer.GetBounds?.();
  const cam = dxfViewer.GetCamera?.();
  const origin = dxfViewer.GetOrigin?.() || { x: 0, y: 0 };
  if (!bounds || !cam) return cssPos;

  const viewWpx = Math.max(1, Math.floor(viewerEl.clientWidth));
  const viewHpx = Math.max(1, Math.floor(viewerEl.clientHeight));
  const worldW = (cam.right - cam.left) / cam.zoom;
  const worldH = (cam.top - cam.bottom) / cam.zoom;
  const unitPerPxX = worldW / viewWpx;
  const unitPerPxY = worldH / viewHpx;
  const minWorldX = cam.position.x - worldW / 2;
  const maxWorldY = cam.position.y + worldH / 2;

  const minX = (bounds.minX - origin.x - minWorldX) / unitPerPxX;
  const maxX = (bounds.maxX - origin.x - minWorldX) / unitPerPxX;
  const minY = (maxWorldY - (bounds.maxY - origin.y)) / unitPerPxY;
  const maxY = (maxWorldY - (bounds.minY - origin.y)) / unitPerPxY;
  const snapRadius = 14;

  if (axis === "top") {
    const cands = [minX, maxX].filter((v) => Number.isFinite(v));
    let best = cssPos;
    let bestDist = snapRadius + 1;
    for (const c of cands) {
      const d = Math.abs(c - cssPos);
      if (d < bestDist) {
        best = c;
        bestDist = d;
      }
    }
    return bestDist <= snapRadius ? clamp(best, 0, viewWpx) : cssPos;
  }

  const cands = [minY, maxY].filter((v) => Number.isFinite(v));
  let best = cssPos;
  let bestDist = snapRadius + 1;
  for (const c of cands) {
    const d = Math.abs(c - cssPos);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return bestDist <= snapRadius ? clamp(best, 0, viewHpx) : cssPos;
}

function onTopRulerMouseDown(e) {
  if (document.body.getAttribute("data-rulers") !== "on" || !hasLoadedFile) return;
  if (!(topRulerEl instanceof HTMLCanvasElement)) return;
  const rect = topRulerEl.getBoundingClientRect();
  const raw = clamp(e.clientX - rect.left, 0, rect.width);
  const idx = markerIndexForPosition(markers.top, raw);
  const x = snapPositionToEdge("top", raw, idx);
  markers.top[idx] = x;
  const m = getViewMetrics();
  if (m && snapEnabled) markers.topWorld[idx] = screenToWorldX(x, m);
  if (!snapEnabled) markers.topWorld[idx] = null;
  startMarkerDrag("top", idx);
  drawRulers();
  syncGuideLines();
  updateMeasureInfo();
  e.preventDefault();
}

function onLeftRulerMouseDown(e) {
  if (document.body.getAttribute("data-rulers") !== "on" || !hasLoadedFile) return;
  if (!(leftRulerEl instanceof HTMLCanvasElement)) return;
  const rect = leftRulerEl.getBoundingClientRect();
  const raw = clamp(e.clientY - rect.top, 0, rect.height);
  const idx = markerIndexForPosition(markers.left, raw);
  const y = snapPositionToEdge("left", raw, idx);
  markers.left[idx] = y;
  const m = getViewMetrics();
  if (m && snapEnabled) markers.leftWorld[idx] = screenToWorldY(y, m);
  if (!snapEnabled) markers.leftWorld[idx] = null;
  startMarkerDrag("left", idx);
  drawRulers();
  syncGuideLines();
  updateMeasureInfo();
  e.preventDefault();
}

function onGlobalMouseMove(e) {
  if (!markers.dragging) return;
  if (markers.dragging.axis === "top" && topRulerEl instanceof HTMLCanvasElement) {
    const rect = topRulerEl.getBoundingClientRect();
    const raw = clamp(e.clientX - rect.left, 0, rect.width);
    const x = snapPositionToEdge("top", raw, markers.dragging.index);
    markers.top[markers.dragging.index] = x;
    const m = getViewMetrics();
    if (m && snapEnabled) markers.topWorld[markers.dragging.index] = screenToWorldX(x, m);
    if (!snapEnabled) markers.topWorld[markers.dragging.index] = null;
  } else if (markers.dragging.axis === "left" && leftRulerEl instanceof HTMLCanvasElement) {
    const rect = leftRulerEl.getBoundingClientRect();
    const raw = clamp(e.clientY - rect.top, 0, rect.height);
    const y = snapPositionToEdge("left", raw, markers.dragging.index);
    markers.left[markers.dragging.index] = y;
    const m = getViewMetrics();
    if (m && snapEnabled) markers.leftWorld[markers.dragging.index] = screenToWorldY(y, m);
    if (!snapEnabled) markers.leftWorld[markers.dragging.index] = null;
  }
  normalizeMarkers();
  drawRulers();
  syncGuideLines();
  updateMeasureInfo();
}

if (topRulerEl) topRulerEl.addEventListener("mousedown", onTopRulerMouseDown);
if (leftRulerEl) leftRulerEl.addEventListener("mousedown", onLeftRulerMouseDown);
window.addEventListener("mousemove", onGlobalMouseMove);
window.addEventListener("mouseup", stopMarkerDrag);

/* ---------------- Status / Busy ---------------- */

function setStatus(msg) {
  statusEl.textContent = msg;
}

function setBusy(isBusy) {
  if (openBtn) {
    openBtn.disabled = isBusy;
    openBtn.style.opacity = isBusy ? "0.6" : "1";
  }
  if (openBtnStart) {
    openBtnStart.disabled = isBusy;
    openBtnStart.style.opacity = isBusy ? "0.6" : "1";
  }
  if (openFolderBtn) {
    openFolderBtn.disabled = isBusy;
    openFolderBtn.style.opacity = isBusy ? "0.6" : "1";
  }
  if (openFolderBtnStart) {
    openFolderBtnStart.disabled = isBusy;
    openFolderBtnStart.style.opacity = isBusy ? "0.6" : "1";
  }
}

function setUiHasFile(value) {
  hasLoadedFile = !!value;
  document.body.setAttribute("data-has-file", hasLoadedFile ? "true" : "false");
  if (!hasLoadedFile) {
    clearRulerCanvases();
    updateMeasureInfo();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getViewMetrics() {
  if (!dxfViewer) return null;
  const cam = dxfViewer.GetCamera?.();
  if (!cam) return null;
  const renderCanvas = viewerEl.querySelector("canvas");
  const canvasRect = renderCanvas instanceof HTMLCanvasElement
    ? renderCanvas.getBoundingClientRect()
    : null;
  const viewWpx = Math.max(1, Math.floor(canvasRect?.width || viewerEl.clientWidth));
  const viewHpx = Math.max(1, Math.floor(canvasRect?.height || viewerEl.clientHeight));
  const worldW = (cam.right - cam.left) / cam.zoom;
  const worldH = (cam.top - cam.bottom) / cam.zoom;
  const unitPerPxX = worldW / viewWpx;
  const unitPerPxY = worldH / viewHpx;
  const minWorldX = cam.position.x - worldW / 2;
  const maxWorldY = cam.position.y + worldH / 2;
  return { viewWpx, viewHpx, worldW, worldH, unitPerPxX, unitPerPxY, minWorldX, maxWorldY };
}

function screenToWorldX(px, m) {
  return m.minWorldX + px * m.unitPerPxX;
}

function screenToWorldY(px, m) {
  return m.maxWorldY - px * m.unitPerPxY;
}

function worldToScreenX(wx, m) {
  return (wx - m.minWorldX) / m.unitPerPxX;
}

function worldToScreenY(wy, m) {
  return (m.maxWorldY - wy) / m.unitPerPxY;
}

function normalizeMarkers() {
  const w = Math.max(1, Math.floor(topRulerEl?.clientWidth || 1));
  const h = Math.max(1, Math.floor(leftRulerEl?.clientHeight || 1));
  markers.top[0] = clamp(markers.top[0], 0, w);
  markers.top[1] = clamp(markers.top[1], 0, w);
  markers.left[0] = clamp(markers.left[0], 0, h);
  markers.left[1] = clamp(markers.left[1], 0, h);
}

function initMarkersIfNeeded() {
  const w = Math.max(1, Math.floor(topRulerEl?.clientWidth || 1));
  const h = Math.max(1, Math.floor(leftRulerEl?.clientHeight || 1));
  if ((markers.topWorld[0] == null && markers.topWorld[1] == null) &&
      (markers.top[1] > w || markers.top[0] > w || markers.top[0] === markers.top[1])) {
    markers.top[0] = Math.round(w * 0.25);
    markers.top[1] = Math.round(w * 0.75);
  }
  if ((markers.leftWorld[0] == null && markers.leftWorld[1] == null) &&
      (markers.left[1] > h || markers.left[0] > h || markers.left[0] === markers.left[1])) {
    markers.left[0] = Math.round(h * 0.25);
    markers.left[1] = Math.round(h * 0.75);
  }
  normalizeMarkers();
}

function syncGuideLines() {
  if (!guideV1El || !guideV2El || !guideH1El || !guideH2El) return;
  const rulersOn = document.body.getAttribute("data-rulers") === "on" && hasLoadedFile;
  const guidesOn = rulersOn && showMarkerGuides;
  const display = guidesOn ? "block" : "none";
  guideV1El.style.display = display;
  guideV2El.style.display = display;
  guideH1El.style.display = display;
  guideH2El.style.display = display;
  if (!rulersOn) return;

  guideV1El.style.left = `${Math.round(markers.top[0])}px`;
  guideV2El.style.left = `${Math.round(markers.top[1])}px`;
  guideH1El.style.top = `${Math.round(markers.left[0])}px`;
  guideH2El.style.top = `${Math.round(markers.left[1])}px`;
}

function updateMeasureInfo() {
  if (!measureInfoEl) return;
  if (!hasLoadedFile || document.body.getAttribute("data-rulers") !== "on") {
    measureInfoEl.textContent = "ΔX: - mm | ΔY: - mm";
    return;
  }
  const hasWorldX = markers.topWorld[0] != null && markers.topWorld[1] != null;
  const hasWorldY = markers.leftWorld[0] != null && markers.leftWorld[1] != null;
  const dxMm = hasWorldX
    ? Math.abs(markers.topWorld[1] - markers.topWorld[0]) * modelUnitToMm
    : Math.abs(markers.top[1] - markers.top[0]) * lastMmPerPxX;
  const dyMm = hasWorldY
    ? Math.abs(markers.leftWorld[1] - markers.leftWorld[0]) * modelUnitToMm
    : Math.abs(markers.left[1] - markers.left[0]) * lastMmPerPxY;
  measureInfoEl.textContent = `ΔX: ${dxMm.toFixed(2)} mm | ΔY: ${dyMm.toFixed(2)} mm`;
}

/* ---------------- Bridge ---------------- */

function assertBridge() {
  if (!window.DXFAPP || typeof window.DXFAPP.ping !== "function") {
    setStatus("Error: preload bridge (DXFAPP) failed to load. Check main.js -> webPreferences.preload.");
    if (openBtn) openBtn.disabled = true;
    if (openBtnStart) openBtnStart.disabled = true;
    if (openFolderBtn) openFolderBtn.disabled = true;
    if (openFolderBtnStart) openFolderBtnStart.disabled = true;
    return false;
  }
  return true;
}

/* ---------------- URL cleanup ---------------- */

function revokeLastUrl() {
  if (lastObjectUrl) {
    try { URL.revokeObjectURL(lastObjectUrl); } catch (_) {}
    lastObjectUrl = null;
  }
}

/* ---------------- Rulers (mm) ---------------- */

function getModelUnitToMmFromHeader() {
  const dxf = dxfViewer?.GetDxf?.();
  const header = dxf?.header || {};
  const insUnits = Number(header.$INSUNITS);
  const byInsUnits = {
    1: 25.4,          // inch
    2: 304.8,         // foot
    3: 1609344,       // mile
    4: 1,             // mm
    5: 10,            // cm
    6: 1000,          // m
    7: 1000000,       // km
    8: 0.0000254,     // microinch
    9: 0.0254,        // mil
    10: 914.4,        // yard
    11: 0.0000001,    // angstrom
    12: 0.000001,     // nm
    13: 0.001,        // micron
    14: 100,          // dm
    15: 10000,        // dam
    16: 100000,       // hm
    17: 1000000000000,// Gm
    18: 149597870700000, // AU
    19: 9460730472580800000, // light year
    20: 30856775814913670000, // parsec
    21: 304.8006096,  // US survey foot
  };
  if (Number.isFinite(insUnits) && byInsUnits[insUnits]) return byInsUnits[insUnits];

  // Fallback: for metric drawings without explicit INSUNITS assume mm.
  const measurement = Number(header.$MEASUREMENT);
  if (measurement === 0) return 25.4; // likely imperial.
  return 1;
}

function chooseNiceStepMm(rawStepMm) {
  if (!Number.isFinite(rawStepMm) || rawStepMm <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(rawStepMm)));
  const n = rawStepMm / power;
  const base = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return base * power;
}

function formatMm(valueMm, stepMm) {
  const absStep = Math.abs(stepMm);
  if (absStep >= 1) return `${Math.round(valueMm)}`;
  const digits = Math.min(6, Math.max(0, Math.ceil(-Math.log10(absStep)) + 1));
  return valueMm.toFixed(digits);
}

function clearRulerCanvases() {
  for (const c of [topRulerEl, leftRulerEl]) {
    if (!c || !(c instanceof HTMLCanvasElement)) continue;
    const ctx = c.getContext("2d");
    if (!ctx) continue;
    ctx.clearRect(0, 0, c.width || 0, c.height || 0);
  }
  syncGuideLines();
}

function drawRulers() {
  if (document.body.getAttribute("data-rulers") !== "on") {
    clearRulerCanvases();
    return;
  }
  if (!dxfViewer || !hasLoadedFile) {
    clearRulerCanvases();
    return;
  }
  if (!(topRulerEl instanceof HTMLCanvasElement) || !(leftRulerEl instanceof HTMLCanvasElement)) {
    return;
  }

  const m = getViewMetrics();
  if (!m) return;
  const { viewWpx, viewHpx, worldW, worldH, unitPerPxX, unitPerPxY } = m;
  if (!Number.isFinite(unitPerPxX) || unitPerPxX <= 0) return;

  const mmPerPx = unitPerPxX * modelUnitToMm;
  const mmPerPxY = unitPerPxY * modelUnitToMm;
  lastMmPerPxX = mmPerPx;
  lastMmPerPxY = mmPerPxY;
  const majorStepMmX = chooseNiceStepMm(mmPerPx * 90);
  const majorStepMmY = chooseNiceStepMm(mmPerPxY * 90);
  const majorStepPxX = majorStepMmX / mmPerPx;
  const majorStepPxY = majorStepMmY / mmPerPxY;
  const minorStepPxX = majorStepPxX / 10;
  const minorStepPxY = majorStepPxY / 10;
  const drawMinorX = minorStepPxX >= 7;
  const drawMinorY = minorStepPxY >= 7;

  const dpr = window.devicePixelRatio || 1;
  const topW = Math.max(1, Math.floor(topRulerEl.clientWidth));
  const topH = Math.max(1, Math.floor(topRulerEl.clientHeight));
  const leftW = Math.max(1, Math.floor(leftRulerEl.clientWidth));
  const leftH = Math.max(1, Math.floor(leftRulerEl.clientHeight));
  topRulerEl.width = Math.max(1, Math.floor(topW * dpr));
  topRulerEl.height = Math.max(1, Math.floor(topH * dpr));
  leftRulerEl.width = Math.max(1, Math.floor(leftW * dpr));
  leftRulerEl.height = Math.max(1, Math.floor(leftH * dpr));

  const topCtx = topRulerEl.getContext("2d");
  const leftCtx = leftRulerEl.getContext("2d");
  if (!topCtx || !leftCtx) return;

  const css = getComputedStyle(document.documentElement);
  const lineColor = css.getPropertyValue("--ruler-line").trim() || "#999";
  const textColor = css.getPropertyValue("--ruler-text").trim() || "#666";

  const drawAxis = (ctx, w, h, horizontal) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = lineColor;
    ctx.fillStyle = textColor;
    ctx.lineWidth = 1;
    ctx.font = "10px sans-serif";
    ctx.textBaseline = "top";

    if (horizontal) {
      for (let x = 0; x <= w + majorStepPxX; x += majorStepPxX) {
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, h);
        ctx.lineTo(Math.round(x) + 0.5, h - 10);
        ctx.stroke();
        const mm = x * mmPerPx;
        ctx.fillText(formatMm(mm, majorStepMmX), x + 2, 2);
      }
      if (drawMinorX) {
        for (let x = minorStepPxX; x <= w + minorStepPxX; x += minorStepPxX) {
          const majorIndex = Math.round(x / majorStepPxX);
          if (Math.abs(x - majorIndex * majorStepPxX) < 0.2) continue;
          ctx.beginPath();
          ctx.moveTo(Math.round(x) + 0.5, h);
          ctx.lineTo(Math.round(x) + 0.5, h - 5);
          ctx.stroke();
        }
      }
    } else {
      for (let y = 0; y <= h + majorStepPxY; y += majorStepPxY) {
        ctx.beginPath();
        ctx.moveTo(w, Math.round(y) + 0.5);
        ctx.lineTo(w - 10, Math.round(y) + 0.5);
        ctx.stroke();
        const mm = y * mmPerPxY;
        ctx.save();
        ctx.translate(2, y + 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(formatMm(mm, majorStepMmY), 0, 0);
        ctx.restore();
      }
      if (drawMinorY) {
        for (let y = minorStepPxY; y <= h + minorStepPxY; y += minorStepPxY) {
          const majorIndex = Math.round(y / majorStepPxY);
          if (Math.abs(y - majorIndex * majorStepPxY) < 0.2) continue;
          ctx.beginPath();
          ctx.moveTo(w, Math.round(y) + 0.5);
          ctx.lineTo(w - 5, Math.round(y) + 0.5);
          ctx.stroke();
        }
      }
    }
  };

  drawAxis(topCtx, topW, topH, true);
  drawAxis(leftCtx, leftW, leftH, false);

  initMarkersIfNeeded();
  if (markers.topWorld[0] != null) markers.top[0] = clamp(worldToScreenX(markers.topWorld[0], m), 0, topW);
  if (markers.topWorld[1] != null) markers.top[1] = clamp(worldToScreenX(markers.topWorld[1], m), 0, topW);
  if (markers.leftWorld[0] != null) markers.left[0] = clamp(worldToScreenY(markers.leftWorld[0], m), 0, leftH);
  if (markers.leftWorld[1] != null) markers.left[1] = clamp(worldToScreenY(markers.leftWorld[1], m), 0, leftH);
  topCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  topCtx.fillStyle = "rgba(53,132,228,0.95)";
  for (const x of markers.top) {
    const px = Math.round(x) + 0.5;
    topCtx.beginPath();
    topCtx.moveTo(px, topH - 1);
    topCtx.lineTo(px - 5, topH - 7);
    topCtx.lineTo(px + 5, topH - 7);
    topCtx.closePath();
    topCtx.fill();
  }

  leftCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  leftCtx.fillStyle = "rgba(53,132,228,0.95)";
  for (const y of markers.left) {
    const py = Math.round(y) + 0.5;
    leftCtx.beginPath();
    leftCtx.moveTo(leftW - 1, py);
    leftCtx.lineTo(leftW - 7, py - 5);
    leftCtx.lineTo(leftW - 7, py + 5);
    leftCtx.closePath();
    leftCtx.fill();
  }

  syncGuideLines();
  updateMeasureInfo();
}

/* ---------------- Viewer Colors ---------------- */

function viewerColorsForTheme(theme) {
  // Important: dxf-viewer expects Color objects (THREE.Color), not numbers.
  if (theme === "light") {
    // Dark lines on white background
    return {
      clearColor: new Color("#ffffff"),
      color: new Color("#000000"),
    };
  }
  // White lines on dark background
  return {
    clearColor: new Color("#0d0d0d"),
    color: new Color("#ffffff"),
  };
}

/* ---------------- Viewer creation / resize ---------------- */

function createFreshViewer() {
  renderGl = null;
  if (dxfViewer && typeof dxfViewer.Destroy === "function") {
    try { dxfViewer.Destroy(); } catch (_) {}
  }
  // Remove stale canvases but keep guides overlay.
  const staleCanvases = viewerEl.querySelectorAll("canvas");
  for (const c of staleCanvases) c.remove();

  const theme = currentTheme();
  const { clearColor, color } = viewerColorsForTheme(theme);

  // Create fresh viewer
  dxfViewer = new DxfViewer(viewerEl, {
    clearColor,
    color,
    preserveDrawingBuffer: true,
  });
  if (typeof dxfViewer.Subscribe === "function") {
    dxfViewer.Subscribe("viewChanged", () => drawRulers());
    dxfViewer.Subscribe("resized", () => drawRulers());
    dxfViewer.Subscribe("loaded", () => {
      modelUnitToMm = getModelUnitToMmFromHeader();
      drawRulers();
    });
  }

  // Keep canvas stretched to container
  const canvas = viewerEl.querySelector("canvas");
  if (canvas) {
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
  }
  // Ensure overlay is always above canvas.
  if (measureOverlayEl && measureOverlayEl.parentElement === viewerEl) {
    viewerEl.appendChild(measureOverlayEl);
  }

  resizeViewerIfPossible();
  applyLineThicknessMode();
  drawRulers();
  return dxfViewer;
}

function ensureViewer() {
  if (dxfViewer) return dxfViewer;
  return createFreshViewer();
}

function resizeViewerIfPossible() {
  if (!dxfViewer) return;

  const rect = viewerEl.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));

  try {
    if (typeof dxfViewer.Resize === "function") dxfViewer.Resize(w, h);
    else if (typeof dxfViewer.SetSize === "function") dxfViewer.SetSize(w, h);
    else if (typeof dxfViewer.resize === "function") dxfViewer.resize(w, h);
  } catch (e) {
    console.warn("Resize failed:", e);
  }

  const canvas = viewerEl.querySelector("canvas");
  if (canvas) {
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
  }
  drawRulers();
}

function captureCurrentViewState() {
  if (!dxfViewer || typeof dxfViewer.GetCamera !== "function") return null;
  try {
    const cam = dxfViewer.GetCamera();
    if (!cam) return null;
    return {
      centerX: cam.position.x,
      centerY: cam.position.y,
      width: (cam.right - cam.left) / cam.zoom,
    };
  } catch {
    return null;
  }
}

function restoreViewState(state) {
  if (!state || !dxfViewer || typeof dxfViewer.SetView !== "function") return;
  try {
    dxfViewer.SetView({ x: state.centerX, y: state.centerY }, state.width);
  } catch (_) {}
}

async function fitToViewIfPossible() {
  if (!dxfViewer) return;
  const candidates = ["FitToView", "FitToViewer", "fitToView", "fitToViewer"];
  let usedBuiltIn = false;
  for (const name of candidates) {
    if (typeof dxfViewer[name] === "function") {
      try {
        const r = dxfViewer[name]();
        if (r && typeof r.then === "function") await r;
        usedBuiltIn = true;
      } catch (e) {
        console.warn(`${name} failed:`, e);
      }
      if (usedBuiltIn) return;
    }
  }

  // Fallback: fit bounds into current viewport and reset pan/zoom.
  if (typeof dxfViewer.SetView !== "function") return;
  const bounds = dxfViewer.GetBounds?.();
  if (!bounds) return;
  const origin = dxfViewer.GetOrigin?.() || { x: 0, y: 0 };

  const minX = bounds.minX - origin.x;
  const maxX = bounds.maxX - origin.x;
  const minY = bounds.minY - origin.y;
  const maxY = bounds.maxY - origin.y;
  const width = Math.max(1e-6, maxX - minX);
  const height = Math.max(1e-6, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const rect = viewerEl.getBoundingClientRect();
  const viewW = Math.max(1, rect.width || viewerEl.clientWidth || 1);
  const viewH = Math.max(1, rect.height || viewerEl.clientHeight || 1);
  const aspect = viewW / viewH;

  // SetView expects horizontal view width.
  const targetWidth = Math.max(width, height * aspect) * 1.03;
  try {
    dxfViewer.SetView({ x: cx, y: cy }, targetWidth);
  } catch (e) {
    console.warn("SetView fallback failed:", e);
  }
}

/* ---------------- Loading DXF ---------------- */

async function loadTextIntoViewer(text) {
  const v = ensureViewer();

  resizeViewerIfPossible();

  revokeLastUrl();
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  lastObjectUrl = url;

  if (typeof v.Load === "function") {
    await v.Load({ url });
  } else if (typeof v.load === "function") {
    await v.load({ url });
  } else if (typeof v.loadDxf === "function") {
    await v.loadDxf(url);
  } else {
    throw new Error("No supported viewer load method found (Load/load/loadDxf).");
  }

  resizeViewerIfPossible();
  await fitToViewIfPossible();
  modelUnitToMm = getModelUnitToMmFromHeader();
  drawRulers();
}

async function rebuildViewerAndRedraw() {
  const prevViewState = captureCurrentViewState();
  if (lastLoadedText) {
    createFreshViewer();
    setStatus("Redrawing…");
    await loadTextIntoViewer(lastLoadedText);
    restoreViewState(prevViewState);
    drawRulers();
    setStatus(lastLoadedPath ? `Loaded: ${lastLoadedPath}` : "Loaded");
  } else {
    setStatus("Ready: drop a .dxf file or click Open file/folder.");
    drawRulers();
  }
}

async function loadDxfFromPath(filePath) {
  const wasHasFile = hasLoadedFile;
  try {
    if (!assertBridge()) return;

    setBusy(true);
    setStatus(`Loading: ${filePath}`);

    const text = await window.DXFAPP.readDxf(filePath);
    if (!text) {
      setStatus("Failed to read file.");
      return;
    }

    lastLoadedPath = filePath;
    lastLoadedText = text;

    // Show shell before loading to avoid 1x1 viewer size.
    if (!wasHasFile) {
      setUiHasFile(true);
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    await loadTextIntoViewer(text);
    addRecentFile(filePath);
    renderRecentLists();
    setStatus(`Loaded: ${filePath}`);
  } catch (e) {
    console.error(e);
    if (!wasHasFile) setUiHasFile(false);
    setStatus(`Error: ${e?.message || e}`);
  } finally {
    setBusy(false);
  }
}

/* ---------- Open file button ---------- */

async function openDxfDialog() {
  try {
    if (!assertBridge()) return;

    if (hasLoadedFile) setStatus("Opening file dialog…");
    const p = await window.DXFAPP.pickDxf();

    if (p) await loadDxfFromPath(p);
    else if (hasLoadedFile) setStatus("Canceled.");
  } catch (e) {
    console.error(e);
    setStatus(`Error: ${e?.message || e}`);
  }
}

async function openFolderByPath(folderPath) {
  try {
    if (!assertBridge()) return;
    if (typeof window.DXFAPP.listFolderDxf !== "function") {
      setStatus("Error: folder listing is unavailable in this build.");
      return;
    }

    const folder = String(folderPath || "").trim();
    if (!folder) return;

    setStatus(`Scanning folder: ${folder}`);
    const files = await window.DXFAPP.listFolderDxf(folder);
    addRecentFolder(folder);
    const folderFiles = Array.isArray(files) ? files : [];
    setCurrentFolderListing(folder, folderFiles);

    if (!folderFiles.length) {
      renderRecentLists();
      setStatus("No .dxf files found in selected folder.");
      return;
    }

    const folderKey = pathCompareKey(folder);
    const preferredPath = recentFolderLastFile[folderKey];
    const selectedPath = folderFiles.find((p) => pathCompareKey(p) === pathCompareKey(preferredPath)) || folderFiles[0];
    renderRecentLists();
    await loadDxfFromPath(selectedPath);
  } catch (e) {
    console.error(e);
    setStatus(`Error: ${e?.message || e}`);
  }
}

async function openFolderDialog() {
  try {
    if (!assertBridge()) return;
    if (typeof window.DXFAPP.pickFolder !== "function") {
      setStatus("Error: folder picker is unavailable in this build.");
      return;
    }

    if (hasLoadedFile) setStatus("Opening folder dialog…");
    const folderPath = await window.DXFAPP.pickFolder();

    if (folderPath) await openFolderByPath(folderPath);
    else if (hasLoadedFile) setStatus("Canceled.");
  } catch (e) {
    console.error(e);
    setStatus(`Error: ${e?.message || e}`);
  }
}

if (openBtn) openBtn.addEventListener("click", openDxfDialog);
if (openBtnStart) openBtnStart.addEventListener("click", openDxfDialog);
if (openFolderBtn) openFolderBtn.addEventListener("click", openFolderDialog);
if (openFolderBtnStart) openFolderBtnStart.addEventListener("click", openFolderDialog);

/* ---------- Drag & Drop ---------- */

function isFileDrag(evt) {
  const types = evt.dataTransfer?.types;
  if (!types) return false;
  for (const t of types) if (t === "Files") return true;
  return false;
}

window.addEventListener("dragenter", (e) => {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  dropEl.classList.add("visible");
});
window.addEventListener("dragover", (e) => {
  if (!isFileDrag(e)) return;
  e.preventDefault();
});
window.addEventListener("dragleave", (e) => {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  dropEl.classList.remove("visible");
});
window.addEventListener("drop", (e) => {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  dropEl.classList.remove("visible");

  const f = e.dataTransfer.files?.[0];
  if (f?.path && f.path.toLowerCase().endsWith(".dxf")) {
    loadDxfFromPath(f.path);
  } else {
    setStatus("Please drop a valid .dxf file.");
  }
});

/* ---------- Resize observer ---------- */

let resizeRaf = 0;
function scheduleViewportResize() {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    if (!hasLoadedFile) return;
    resizeViewerIfPossible();
    // Keep drawing fitted to viewport on any window resize.
    clearTimeout(resizeFitTimer);
    resizeFitTimer = setTimeout(() => {
      fitToViewIfPossible()
        .then(() => {
          drawRulers();
          syncGuideLines();
          updateMeasureInfo();
        })
        .catch(() => {
          drawRulers();
          syncGuideLines();
          updateMeasureInfo();
        });
    }, 30);
  });
}

const ro = new ResizeObserver(() => scheduleViewportResize());
ro.observe(viewerWrapEl);
ro.observe(viewerEl);
window.addEventListener("resize", scheduleViewportResize);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", scheduleViewportResize);
}

/* ---------- Open file via association / second instance ---------- */

if (window.DXFAPP && typeof window.DXFAPP.onOpenPath === "function") {
  window.DXFAPP.onOpenPath((p) => {
    if (p) loadDxfFromPath(p);
  });
}

/* ---------- Start ---------- */

if (assertBridge()) {
  setUiHasFile(false);
  setStatus("Ready: drop a .dxf file or click Open file/folder.");
}
