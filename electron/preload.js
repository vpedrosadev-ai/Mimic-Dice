import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("mimicDice", {
  platform: process.platform,
  saveCampaign: (payload, fileName) => ipcRenderer.invoke("campaign:save", { payload, fileName }),
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
  finishCampaignSaveBeforeClose: (requestId, result) => {
    ipcRenderer.send("campaign:save-before-close-done", { requestId, result });
  }
});
