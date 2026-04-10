import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("mimicDice", {
  platform: process.platform
});
