import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = app.isPackaged ? path.dirname(app.getPath("exe")) : app.getAppPath();
const APP_ICON_PATH = path.join(__dirname, "assets", "icon.png");
const CAMPAIGN_EXTENSION = ".mimic-campaign.json";
const CAMPAIGN_CLOSE_SAVE_TIMEOUT_MS = 1800;
const campaignCloseStateByWebContentsId = new Map();

function getCampaignSaveDirectory() {
  return path.join(PROJECT_ROOT, "campaigns");
}

function getCampaignNameFromFilePath(filePath) {
  return path.basename(filePath)
    .replace(/\.mimic-campaign\.json$/i, "")
    .replace(/\.json$/i, "")
    .replace(/-/g, " ")
    .trim()
    || "Campaña";
}

function getCampaignSaveResult(filePath, directory, payload) {
  return {
    fileName: path.basename(filePath),
    filePath,
    directory,
    name: payload?.campaign?.name || getCampaignNameFromFilePath(filePath),
    payload
  };
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

function getSaveDialogDefaultPath(directory, fileName) {
  return path.join(directory, sanitizeCampaignFileName(fileName));
}

function getDialogWindow(event) {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

async function writeCampaignFile(filePath, payload, options = {}) {
  const nextPayload = {
    ...payload,
    campaign: {
      ...(payload?.campaign ?? {})
    }
  };

  if (options.deriveNameFromFile) {
    nextPayload.campaign.name = getCampaignNameFromFilePath(filePath);
  }

  await fs.writeFile(filePath, JSON.stringify(nextPayload, null, 2), "utf8");
  return nextPayload;
}

function getCampaignCloseState(webContentsId) {
  return campaignCloseStateByWebContentsId.get(webContentsId) ?? {
    closeSaveReady: false,
    hasUnsavedChanges: false
  };
}

function setCampaignCloseState(webContentsId, patch) {
  campaignCloseStateByWebContentsId.set(webContentsId, {
    ...getCampaignCloseState(webContentsId),
    ...patch
  });
}

ipcMain.handle("campaign:save", async (_event, { fileName, filePath: rawFilePath, payload } = {}) => {
  const requestedFilePath = rawFilePath ? path.resolve(String(rawFilePath)) : "";
  let directory = "";
  let filePath = "";

  if (requestedFilePath) {
    directory = path.dirname(requestedFilePath);
    await fs.mkdir(directory, { recursive: true });
    filePath = path.join(directory, sanitizeCampaignFileName(path.basename(requestedFilePath)));
  } else {
    directory = await ensureCampaignSaveDirectory();
    const safeFileName = sanitizeCampaignFileName(fileName);
    filePath = path.join(directory, safeFileName);
  }

  const savedPayload = await writeCampaignFile(filePath, payload);

  return getCampaignSaveResult(filePath, directory, savedPayload);
});

ipcMain.handle("campaign:save-as", async (event, { fileName, payload, deriveNameFromFile = true } = {}) => {
  const directory = await ensureCampaignSaveDirectory();
  const result = await dialog.showSaveDialog(getDialogWindow(event), {
    title: "Guardar campaña",
    defaultPath: getSaveDialogDefaultPath(directory, fileName),
    filters: [
      { name: "Campañas de Mimic Dice", extensions: ["json"] },
      { name: "JSON", extensions: ["json"] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return {
      canceled: true,
      directory
    };
  }

  const selectedDirectory = path.dirname(result.filePath);
  await fs.mkdir(selectedDirectory, { recursive: true });
  const safeFileName = sanitizeCampaignFileName(path.basename(result.filePath));
  const filePath = path.join(selectedDirectory, safeFileName);
  const savedPayload = await writeCampaignFile(filePath, payload, { deriveNameFromFile });

  return {
    canceled: false,
    ...getCampaignSaveResult(filePath, selectedDirectory, savedPayload)
  };
});

ipcMain.handle("campaign:load", async (event) => {
  const directory = await ensureCampaignSaveDirectory();
  const result = await dialog.showOpenDialog(getDialogWindow(event), {
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
    name: getCampaignNameFromFilePath(filePath),
    payload: JSON.parse(rawValue)
  };
});

ipcMain.on("campaign:close-save-ready", (event) => {
  setCampaignCloseState(event.sender.id, { closeSaveReady: true });
});

ipcMain.on("campaign:set-dirty-state", (event, payload = {}) => {
  setCampaignCloseState(event.sender.id, {
    hasUnsavedChanges: payload?.hasUnsavedChanges === true
  });
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0d1321",
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const windowWebContentsId = window.webContents.id;
  let canClose = false;
  setCampaignCloseState(windowWebContentsId, {
    closeSaveReady: false,
    hasUnsavedChanges: false
  });
  window.maximize();

  window.on("closed", () => {
    campaignCloseStateByWebContentsId.delete(windowWebContentsId);
  });

  window.on("close", (event) => {
    if (canClose || window.webContents.isDestroyed()) {
      return;
    }

    const closeState = getCampaignCloseState(windowWebContentsId);

    if (!closeState.closeSaveReady || !closeState.hasUnsavedChanges) {
      canClose = true;
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
  app.setAppUserModelId("com.mimicdice.app");
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
