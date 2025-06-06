"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    getPlatform: () => electron_1.ipcRenderer.invoke('get-platform'),
    // System detection APIs (to be implemented later)
    detectInstalledTools: () => electron_1.ipcRenderer.invoke('detect-installed-tools'),
    // Installation APIs (to be implemented later)
    installTool: (toolId) => electron_1.ipcRenderer.invoke('install-tool', toolId),
    // Progress tracking APIs (to be implemented later)
    onInstallProgress: (callback) => {
        electron_1.ipcRenderer.on('install-progress', (_event, progress) => callback(progress));
    },
    // Clean up listeners
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    },
});
//# sourceMappingURL=preload.js.map