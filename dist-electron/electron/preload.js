"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // General IPC invoke method
    invoke: (channel, ...args) => electron_1.ipcRenderer.invoke(channel, ...args),
    // App info APIs
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    getPlatform: () => electron_1.ipcRenderer.invoke('get-platform'),
    // Manifest loading APIs
    loadManifestFile: (filePath, type) => electron_1.ipcRenderer.invoke('manifest:load-file', filePath, type),
    loadMultipleManifests: (filePaths) => electron_1.ipcRenderer.invoke('manifest:load-multiple', filePaths),
    discoverManifests: (directory, recursive) => electron_1.ipcRenderer.invoke('manifest:discover', directory, recursive),
    saveManifest: (data, filePath) => electron_1.ipcRenderer.invoke('manifest:save', data, filePath),
    getDefaultManifestDirs: () => electron_1.ipcRenderer.invoke('manifest:get-default-dirs'),
    ensureCacheDir: () => electron_1.ipcRenderer.invoke('manifest:ensure-cache-dir'),
    clearManifestCache: () => electron_1.ipcRenderer.invoke('manifest:clear-cache'),
    // System detection APIs
    detectInstalledTools: () => electron_1.ipcRenderer.invoke('system-detection:detect'),
    getSystemInfo: () => electron_1.ipcRenderer.invoke('system-detection:info'),
    detectTool: (toolName) => electron_1.ipcRenderer.invoke('system-detection:tool', toolName),
    // File operations APIs
    saveToFile: (options) => electron_1.ipcRenderer.invoke('file:save', options),
    loadFromFile: (options) => electron_1.ipcRenderer.invoke('file:load', options),
    fileExists: (options) => electron_1.ipcRenderer.invoke('file:exists', options),
    deleteFile: (options) => electron_1.ipcRenderer.invoke('file:delete', options),
    listFiles: (options) => electron_1.ipcRenderer.invoke('file:list', options),
    // Workspace APIs
    createWorkspace: (options) => electron_1.ipcRenderer.invoke('workspace:create', options),
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