import type { InstallProgress } from '@shared/types';
import { contextBridge, ipcRenderer } from 'electron';
import type { FileOperationOptions, SaveFileOptions } from '../src/types/electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // General IPC invoke method
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  
  // App info APIs
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Manifest loading APIs
  loadManifestFile: (filePath: string, type?: string) => ipcRenderer.invoke('manifest:load-file', filePath, type),
  loadMultipleManifests: (filePaths: string[]) => ipcRenderer.invoke('manifest:load-multiple', filePaths),
  discoverManifests: (directory: string, recursive?: boolean) => ipcRenderer.invoke('manifest:discover', directory, recursive),
  saveManifest: (data: unknown, filePath: string) => ipcRenderer.invoke('manifest:save', data, filePath),
  getDefaultManifestDirs: () => ipcRenderer.invoke('manifest:get-default-dirs'),
  ensureCacheDir: () => ipcRenderer.invoke('manifest:ensure-cache-dir'),
  clearManifestCache: () => ipcRenderer.invoke('manifest:clear-cache'),
  
  // System detection APIs
  detectInstalledTools: () => ipcRenderer.invoke('system-detection:detect'),
  getSystemInfo: () => ipcRenderer.invoke('system-detection:info'),
  detectTool: (toolName: string) => ipcRenderer.invoke('system-detection:tool', toolName),
  
  // File operations APIs
  saveToFile: (options: SaveFileOptions) => ipcRenderer.invoke('file:save', options),
  loadFromFile: (options: FileOperationOptions) => ipcRenderer.invoke('file:load', options),
  fileExists: (options: FileOperationOptions) => ipcRenderer.invoke('file:exists', options),
  deleteFile: (options: FileOperationOptions) => ipcRenderer.invoke('file:delete', options),
  listFiles: (options: { directory: string; extension?: string }) => ipcRenderer.invoke('file:list', options),
  
  // Workspace APIs
  createWorkspace: (options: {
    path: string;
    files: Array<{
      path: string;
      content: string;
    }>;
  }) => ipcRenderer.invoke('workspace:create', options),
  
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