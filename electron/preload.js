import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { contextBridge, ipcRenderer } from "electron";

const DESKTOP_ASSET_PROTOCOL_BASE_URL = "mimic-assets://local";

function resolveDesktopAssetDirectory() {
  const candidateDirectories = [
    path.join(process.resourcesPath || "", "app-assets"),
    path.join(path.dirname(process.execPath), "resources", "app-assets"),
    path.join(path.dirname(process.execPath), "app-assets")
  ];

  return candidateDirectories.find((candidateDirectory) => {
    try {
      return candidateDirectory && fs.existsSync(candidateDirectory);
    } catch {
      return false;
    }
  }) || "";
}

function getDesktopBuildSignature() {
  try {
    const stat = fs.statSync(process.execPath);
    return `${process.execPath}:${stat.size}:${Math.floor(stat.mtimeMs)}`;
  } catch {
    return "";
  }
}

function getDesktopAssetBaseUrl() {
  try {
    const assetDirectory = resolveDesktopAssetDirectory();
    return fs.existsSync(assetDirectory) ? DESKTOP_ASSET_PROTOCOL_BASE_URL : "";
  } catch {
    return "";
  }
}

function getDesktopAssetFileBaseUrl() {
  try {
    const assetDirectory = resolveDesktopAssetDirectory();
    return fs.existsSync(assetDirectory) ? pathToFileURL(assetDirectory).href.replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

function getDesktopAssetDirectory() {
  try {
    const assetDirectory = resolveDesktopAssetDirectory();
    return fs.existsSync(assetDirectory) ? assetDirectory : "";
  } catch {
    return "";
  }
}

function getDesktopDebugInfo() {
  const assetDirectory = getDesktopAssetDirectory();
  const candidateDirectories = [
    path.join(process.resourcesPath || "", "app-assets"),
    path.join(path.dirname(process.execPath), "resources", "app-assets"),
    path.join(path.dirname(process.execPath), "app-assets")
  ];
  const requiredFiles = [
    "data/Bestiary.csv",
    "data/Bestiary_ES.csv",
    "data/BestiaryImages.json",
    "data/Items.csv",
    "data/Items_ES.csv",
    "data/ItemsImages.json",
    "data/Spells.csv",
    "data/Spells_ES.csv"
  ];

  return {
    execPath: process.execPath,
    resourcesPath: process.resourcesPath || "",
    assetDirectory,
    assetBaseUrl: getDesktopAssetBaseUrl(),
    assetFileBaseUrl: getDesktopAssetFileBaseUrl(),
    candidates: candidateDirectories.map((candidatePath) => ({
      path: candidatePath,
      exists: Boolean(candidatePath) && fs.existsSync(candidatePath)
    })),
    files: requiredFiles.map((relativePath) => {
      const absolutePath = assetDirectory ? path.join(assetDirectory, relativePath) : "";
      return {
        relativePath,
        absolutePath,
        exists: absolutePath ? fs.existsSync(absolutePath) : false
      };
    })
  };
}

async function readDesktopAssetText(relativePath) {
  return ipcRenderer.invoke("asset:read-text", { relativePath });
}

async function listDesktopAssetFiles(relativeDirectory = "data", extension = ".csv") {
  return ipcRenderer.invoke("asset:list-files", { relativeDirectory, extension });
}

async function readRepositoryCsvText(filePath) {
  const normalizedPath = path.resolve(String(filePath || ""));

  if (!normalizedPath || !/\.csv$/i.test(normalizedPath)) {
    throw new Error("Invalid CSV file path");
  }

  return fs.promises.readFile(normalizedPath, "utf8");
}

contextBridge.exposeInMainWorld("mimicDice", {
  platform: process.platform,
  isPackaged: !Boolean(process.env.VITE_DEV_SERVER_URL),
  buildSignature: getDesktopBuildSignature(),
  assetBaseUrl: getDesktopAssetBaseUrl(),
  assetFileBaseUrl: getDesktopAssetFileBaseUrl(),
  hasExternalAssetDirectory: Boolean(getDesktopAssetDirectory()),
  getDesktopDebugInfo: () => getDesktopDebugInfo(),
  readAssetText: (relativePath) => readDesktopAssetText(relativePath),
  writeAssetText: (relativePath, content) => ipcRenderer.invoke("asset:write-text", { relativePath, content }),
  pickRepositoryCsv: (repositoryKey) => ipcRenderer.invoke("repository-csv:pick", { repositoryKey }),
  readRepositoryCsvText: (filePath) => readRepositoryCsvText(filePath),
  writeRepositoryCsvText: (pathValue, content) => ipcRenderer.invoke("repository-csv:write", { pathValue, content }),
  listAssetFiles: (relativeDirectory, extension) => listDesktopAssetFiles(relativeDirectory, extension),
  saveCampaign: (payload, fileName, filePath = "", options = {}) => ipcRenderer.invoke("campaign:save", {
    payload,
    fileName,
    filePath,
    ...options
  }),
  saveCampaignAs: (payload, fileName, options = {}) => ipcRenderer.invoke("campaign:save-as", {
    payload,
    fileName,
    ...options
  }),
  loadCampaign: () => ipcRenderer.invoke("campaign:load"),
  saveJsonFile: (payload, fileName, title = "Guardar JSON") => ipcRenderer.invoke("data-exchange:save-json", {
    payload,
    fileName,
    title
  }),
  loadJsonFile: (title = "Importar JSON") => ipcRenderer.invoke("data-exchange:load-json", {
    title
  }),
  onCampaignSaveBeforeClose: (callback) => {
    const listener = (_event, requestId) => callback(requestId);
    ipcRenderer.on("campaign:save-before-close", listener);
    return () => ipcRenderer.removeListener("campaign:save-before-close", listener);
  },
  markCampaignCloseReady: () => {
    ipcRenderer.send("campaign:close-save-ready");
  },
  setCampaignDirtyState: (payload = {}) => {
    ipcRenderer.send("campaign:set-dirty-state", payload);
  },
  finishCampaignSaveBeforeClose: (requestId, result) => {
    ipcRenderer.send("campaign:save-before-close-done", { requestId, result });
  }
});
