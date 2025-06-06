import type { InstallProgress } from '@shared/types';
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // System detection APIs (to be implemented later)
  detectInstalledTools: () => ipcRenderer.invoke('detect-installed-tools'),
  
  // Installation APIs (to be implemented later)
  installTool: (toolId: string) => ipcRenderer.invoke('install-tool', toolId),
  
  // Progress tracking APIs (to be implemented later)
  onInstallProgress: (callback: (progress: InstallProgress) => void) => {
    ipcRenderer.on('install-progress', (_event, progress) => callback(progress));
  },
  
  // Clean up listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
}); 