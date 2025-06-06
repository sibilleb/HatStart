// Shared types for IPC communication

export interface InstallProgress {
  step: string;
  progress: number;
  message: string;
  toolId: string;
}

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<NodeJS.Platform>;
  detectInstalledTools: () => Promise<Record<string, boolean>>;
  installTool: (toolId: string) => Promise<boolean>;
  onInstallProgress: (callback: (progress: InstallProgress) => void) => void;
  removeAllListeners: (channel: string) => void;
}

// Extend the Window interface to include our Electron API
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 