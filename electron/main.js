import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CAMPAIGN_EXTENSION = ".mimic-campaign.json";
const CAMPAIGN_CLOSE_SAVE_TIMEOUT_MS = 4000;

function getCampaignSaveDirectory() {
  return path.join(app.getPath("userData"), "campaigns");
}

function sanitizeCampaignFileName(fileName) {
  const baseName = path.basename(String(fileName || "campana"));
  const withoutExtension = baseName
    .replace(/\.mimic-campaign\.json$/i, "")
    .replace(/\.json$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "campana";

  return `${withoutExtension}${CAMPAIGN_EXTENSION}`;
}

async function ensureCampaignSaveDirectory() {
  const directory = getCampaignSaveDirectory();
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

ipcMain.handle("campaign:save", async (_event, { fileName, payload } = {}) => {
  const directory = await ensureCampaignSaveDirectory();
  const safeFileName = sanitizeCampaignFileName(fileName);
  const filePath = path.join(directory, safeFileName);

  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");

  return {
    fileName: safeFileName,
    filePath,
    directory
  };
});

ipcMain.handle("campaign:load", async () => {
  const directory = await ensureCampaignSaveDirectory();
  const result = await dialog.showOpenDialog({
    title: "Cargar campana",
    defaultPath: directory,
    properties: ["openFile"],
    filters: [
      { name: "Campanas de Mimic Dice", extensions: ["json"] },
      { name: "JSON", extensions: ["json"] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      canceled: true,
      directory
    };
  }

  const [filePath] = result.filePaths;
  const rawValue = await fs.readFile(filePath, "utf8");

  return {
    canceled: false,
    fileName: path.basename(filePath),
    filePath,
    directory,
    payload: JSON.parse(rawValue)
  };
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0d1321",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  let canClose = false;

  window.on("close", (event) => {
    if (canClose || window.webContents.isDestroyed()) {
      return;
    }

    event.preventDefault();

    const requestId = `close-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const finishClose = () => {
      clearTimeout(timeout);
      ipcMain.off("campaign:save-before-close-done", handleSaveDone);
      canClose = true;

      if (!window.isDestroyed()) {
        window.close();
      }
    };
    const handleSaveDone = (_ipcEvent, payload) => {
      if (payload?.requestId !== requestId) {
        return;
      }

      finishClose();
    };
    const timeout = setTimeout(finishClose, CAMPAIGN_CLOSE_SAVE_TIMEOUT_MS);

    ipcMain.on("campaign:save-before-close-done", handleSaveDone);
    window.webContents.send("campaign:save-before-close", requestId);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
