import { app, BrowserWindow, dialog, ipcMain, protocol } from "electron";
import nodeFs from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = app.isPackaged ? path.dirname(app.getPath("exe")) : app.getAppPath();
const APP_ICON_PATH = path.join(__dirname, "assets", "icon.png");
const CAMPAIGN_EXTENSION = ".mimic-campaign.json";
const CAMPAIGN_CLOSE_SAVE_TIMEOUT_MS = 1800;
const DESKTOP_ASSET_PROTOCOL = "mimic-assets";
const campaignCloseStateByWebContentsId = new Map();

protocol.registerSchemesAsPrivileged([{
  scheme: DESKTOP_ASSET_PROTOCOL,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true
  }
}]);

function configureDesktopScaleNormalization() {
  if (process.platform !== "win32") {
    return;
  }

  // Keep desktop layout tied to real monitor resolution instead of Windows UI scale.
  app.commandLine.appendSwitch("high-dpi-support", "1");
  app.commandLine.appendSwitch("force-device-scale-factor", "1");
}

configureDesktopScaleNormalization();

function getCampaignSaveDirectory() {
  return path.join(PROJECT_ROOT, "campaigns");
}

function resolveDesktopAssetDirectory() {
  const candidateDirectories = [
    path.join(process.resourcesPath || "", "app-assets"),
    path.join(path.dirname(app.getPath("exe")), "resources", "app-assets"),
    path.join(path.dirname(app.getPath("exe")), "app-assets")
  ];

  return candidateDirectories.find((candidateDirectory) => {
    try {
      return candidateDirectory && requirePathExists(candidateDirectory);
    } catch {
      return false;
    }
  }) || "";
}

function requirePathExists(targetPath) {
  try {
    return Boolean(targetPath) && nodeFs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function resolveWritableAssetRoot() {
  return resolveDesktopAssetDirectory() || path.join(PROJECT_ROOT, "public");
}

function resolveWritableAssetPath(relativePath) {
  const assetRoot = path.resolve(resolveWritableAssetRoot());
  const normalizedRelativePath = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const resolvedPath = path.resolve(assetRoot, normalizedRelativePath);
  const normalizedRoot = `${assetRoot}${path.sep}`;

  if (resolvedPath !== assetRoot && !resolvedPath.startsWith(normalizedRoot)) {
    throw new Error("Asset path outside allowed directory.");
  }

  return {
    assetRoot,
    resolvedPath,
    normalizedRelativePath
  };
}

function getMimeTypeForAsset(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".csv":
      return "text/csv; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".webp":
      return "image/webp";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

async function handleDesktopAssetRequest(request) {
  const assetDirectory = resolveDesktopAssetDirectory();

  if (!assetDirectory) {
    return new Response("Desktop asset directory not available.", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }

  const requestUrl = new URL(request.url);
  const normalizedRelativePath = decodeURIComponent(requestUrl.pathname || "/").replace(/^\/+/, "");

  if (!normalizedRelativePath) {
    return new Response("Missing asset path.", {
      status: 400,
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }

  const resolvedAssetDirectory = path.resolve(assetDirectory);
  const resolvedAssetPath = path.resolve(assetDirectory, normalizedRelativePath);
  const normalizedRoot = `${resolvedAssetDirectory}${path.sep}`;

  if (resolvedAssetPath !== resolvedAssetDirectory && !resolvedAssetPath.startsWith(normalizedRoot)) {
    return new Response("Asset path outside allowed directory.", {
      status: 403,
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }

  try {
    const data = await fs.readFile(resolvedAssetPath);

    return new Response(data, {
      status: 200,
      headers: {
        "content-type": getMimeTypeForAsset(resolvedAssetPath),
        "cache-control": "no-store"
      }
    });
  } catch {
    return new Response("Asset not found.", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }
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

function sanitizeJsonFileName(fileName, fallbackBaseName = "mimic-dice-export") {
  const baseName = path.basename(String(fileName || fallbackBaseName));
  const withoutExtension = baseName
    .replace(/\.json$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    || fallbackBaseName;

  return `${withoutExtension}.json`;
}

async function ensureCampaignSaveDirectory() {
  const directory = getCampaignSaveDirectory();
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

function getSaveDialogDefaultPath(directory, fileName) {
  return path.join(directory, sanitizeCampaignFileName(fileName));
}

function getJsonSaveDialogDefaultPath(directory, fileName) {
  return path.join(directory, sanitizeJsonFileName(fileName));
}

function getDialogWindow(event) {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

function isExternalRepositoryCsvPath(pathValue) {
  return String(pathValue || "").trim().toLowerCase().startsWith("external:");
}

function decodeExternalRepositoryCsvPath(pathValue) {
  return isExternalRepositoryCsvPath(pathValue)
    ? String(pathValue || "").trim().slice("external:".length)
    : "";
}

function resolveWritableRepositoryCsvPath(pathValue) {
  const normalizedPathValue = String(pathValue || "").trim();

  if (!normalizedPathValue) {
    throw new Error("Missing repository CSV path.");
  }

  const externalPath = decodeExternalRepositoryCsvPath(normalizedPathValue);

  if (externalPath) {
    const resolvedPath = path.resolve(externalPath);

    if (!/\.csv$/i.test(resolvedPath)) {
      throw new Error("Repository CSV path must point to a .csv file.");
    }

    return {
      resolvedPath,
      pathValue: normalizedPathValue,
      isExternal: true
    };
  }

  const { resolvedPath, normalizedRelativePath } = resolveWritableAssetPath(normalizedPathValue);

  if (!/\.csv$/i.test(resolvedPath)) {
    throw new Error("Repository CSV path must point to a .csv file.");
  }

  return {
    resolvedPath,
    pathValue: normalizedRelativePath,
    isExternal: false
  };
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

ipcMain.handle("data-exchange:save-json", async (event, {
  title = "Guardar JSON",
  fileName = "mimic-dice-export.json",
  payload = null
} = {}) => {
  const directory = await ensureCampaignSaveDirectory();
  const result = await dialog.showSaveDialog(getDialogWindow(event), {
    title: String(title || "Guardar JSON"),
    defaultPath: getJsonSaveDialogDefaultPath(directory, fileName),
    filters: [
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
  const safeFileName = sanitizeJsonFileName(path.basename(result.filePath));
  const filePath = path.join(selectedDirectory, safeFileName);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");

  return {
    canceled: false,
    directory: selectedDirectory,
    fileName: path.basename(filePath),
    filePath
  };
});

ipcMain.handle("data-exchange:load-json", async (event, {
  title = "Importar JSON"
} = {}) => {
  const directory = await ensureCampaignSaveDirectory();
  const result = await dialog.showOpenDialog(getDialogWindow(event), {
    title: String(title || "Importar JSON"),
    defaultPath: directory,
    properties: ["openFile"],
    filters: [
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
    directory,
    fileName: path.basename(filePath),
    filePath,
    payload: JSON.parse(rawValue)
  };
});

ipcMain.handle("repository-csv:pick", async (event, { repositoryKey = "" } = {}) => {
  const assetDirectory = resolveDesktopAssetDirectory();
  const defaultDirectory = assetDirectory
    ? path.join(assetDirectory, "data")
    : path.join(PROJECT_ROOT, "public", "data");
  const normalizedRepositoryKey = String(repositoryKey || "").trim().toLowerCase();
  const repositoryTitleByKey = {
    bestiary: "Seleccionar CSV del bestiario",
    items: "Seleccionar CSV de items",
    arcanum: "Seleccionar CSV del arcanum"
  };
  const result = await dialog.showOpenDialog(getDialogWindow(event), {
    title: repositoryTitleByKey[normalizedRepositoryKey] || "Seleccionar archivo CSV",
    defaultPath: defaultDirectory,
    properties: ["openFile"],
    filters: [
      { name: "CSV", extensions: ["csv"] },
      { name: "Todos los archivos", extensions: ["*"] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      canceled: true,
      filePath: ""
    };
  }

  return {
    canceled: false,
    filePath: path.resolve(result.filePaths[0])
  };
});

ipcMain.handle("asset:write-text", async (_event, { relativePath = "", content = "" } = {}) => {
  const { resolvedPath, normalizedRelativePath } = resolveWritableAssetPath(relativePath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, String(content), "utf8");
  return {
    ok: true,
    relativePath: normalizedRelativePath
  };
});

ipcMain.handle("repository-csv:write", async (_event, { pathValue = "", content = "" } = {}) => {
  const { resolvedPath } = resolveWritableRepositoryCsvPath(pathValue);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, String(content), "utf8");
  return {
    ok: true,
    filePath: resolvedPath
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
  protocol.handle(DESKTOP_ASSET_PROTOCOL, handleDesktopAssetRequest);
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
