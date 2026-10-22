const { app, BrowserWindow, clipboard, ipcMain, globalShortcut } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const MAX_ITEMS = 500;
const MAX_TEXT_LENGTH = 100_000;
const POLL_INTERVAL_MS = 700;

let mainWindow;
let pollingTimer;
let paused = false;
let lastClipboardText = "";
let history = [];

const dataFile = () => path.join(app.getPath("userData"), "clipboard-history.json");

function loadHistory() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile(), "utf8"));
    history = Array.isArray(parsed)
      ? parsed.filter(item =>
          item &&
          typeof item.id === "string" &&
          typeof item.text === "string" &&
          typeof item.createdAt === "number"
        ).slice(0, MAX_ITEMS)
      : [];
  } catch {
    history = [];
  }
}

function saveHistory() {
  try {
    const file = dataFile();
    const tempFile = `${file}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(history, null, 2), "utf8");
    fs.renameSync(tempFile, file);
  } catch (error) {
    console.error("Could not save clipboard history:", error.message);
  }
}

function sendHistory() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("history:updated", history);
  }
}

function addClipboardText(text) {
  if (paused || typeof text !== "string") return;
  const cleaned = text.trimEnd();
  if (!cleaned || cleaned.length > MAX_TEXT_LENGTH) return;
  if (cleaned === lastClipboardText) return;

  lastClipboardText = cleaned;

  // Avoid consecutive duplicates while keeping older matching entries available.
  if (history[0]?.text === cleaned) return;

  history.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: cleaned,
    createdAt: Date.now(),
    pinned: false
  });

  if (history.length > MAX_ITEMS) {
    const pinned = history.filter(item => item.pinned);
    const unpinned = history.filter(item => !item.pinned);
    history = [...pinned, ...unpinned.slice(0, Math.max(0, MAX_ITEMS - pinned.length))]
      .slice(0, MAX_ITEMS);
  }

  saveHistory();
  sendHistory();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 680,
    minHeight: 520,
    backgroundColor: "#10131a",
    title: "ClipForge",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  loadHistory();
  lastClipboardText = clipboard.readText();
  createWindow();

  pollingTimer = setInterval(() => {
    if (paused) return;
    const currentText = clipboard.readText();
    addClipboardText(currentText);
  }, POLL_INTERVAL_MS);

  // Optional global shortcut. Registration can fail if another app owns it.
  globalShortcut.register("CommandOrControl+Shift+V", () => {
    if (!mainWindow) createWindow();
    else if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  ipcMain.handle("history:get", () => history);
  ipcMain.handle("history:copy", (_event, id) => {
    const item = history.find(entry => entry.id === id);
    if (!item) return { ok: false, error: "Item not found" };
    clipboard.writeText(item.text);
    lastClipboardText = item.text;
    return { ok: true };
  });

  ipcMain.handle("history:pin", (_event, id) => {
    const item = history.find(entry => entry.id === id);
    if (!item) return { ok: false };
    item.pinned = !item.pinned;
    history.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
    saveHistory();
    sendHistory();
    return { ok: true };
  });

  ipcMain.handle("history:delete", (_event, id) => {
    history = history.filter(item => item.id !== id);
    saveHistory();
    sendHistory();
    return { ok: true };
  });

  ipcMain.handle("history:clear", () => {
    history = history.filter(item => item.pinned);
    saveHistory();
    sendHistory();
    return { ok: true };
  });

  ipcMain.handle("history:clear-all", () => {
    history = [];
    saveHistory();
    sendHistory();
    return { ok: true };
  });

  ipcMain.handle("history:set-paused", (_event, value) => {
    paused = Boolean(value);
    if (paused) lastClipboardText = clipboard.readText();
    return paused;
  });

  ipcMain.handle("history:get-paused", () => paused);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  if (pollingTimer) clearInterval(pollingTimer);
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
