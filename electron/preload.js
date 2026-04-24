import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { contextBridge, ipcRenderer } from "electron";

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
  hasExternalAssetDirectory: Boolean(getDesktopAssetDirectory()),
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
