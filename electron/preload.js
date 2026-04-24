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
    "data/BestiaryImages.json",
    "data/Items.csv",
    "data/ItemsImages.json",
    "data/Spells.csv"
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
  const assetDirectory = getDesktopAssetDirectory();

  if (!assetDirectory) {
    throw new Error("Desktop asset directory not available");
  }

  const normalizedRelativePath = String(relativePath || "").replace(/^[\\/]+/, "");

  if (!normalizedRelativePath) {
    throw new Error("Missing asset path");
  }

  const resolvedPath = path.resolve(assetDirectory, normalizedRelativePath);
  const normalizedAssetDirectory = `${path.resolve(assetDirectory)}${path.sep}`;

  if (resolvedPath !== path.resolve(assetDirectory) && !resolvedPath.startsWith(normalizedAssetDirectory)) {
    throw new Error("Asset path outside allowed directory");
  }

  return fs.promises.readFile(resolvedPath, "utf8");
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
  saveCampaign: (payload, fileName, filePath = "") => ipcRenderer.invoke("campaign:save", { payload, fileName, filePath }),
  saveCampaignAs: (payload, fileName, options = {}) => ipcRenderer.invoke("campaign:save-as", {
    payload,
    fileName,
    ...options
  }),
  loadCampaign: () => ipcRenderer.invoke("campaign:load"),
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
