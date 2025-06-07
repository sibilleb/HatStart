import type { DetectionResult, SystemDetectionReport } from '../shared/detection-types.js';

// File operation types
export interface FileOperationOptions {
  fileName: string;
  directory?: string;
  extension?: string;
}

export interface SaveFileOptions extends FileOperationOptions {
  data: string;
}

// Electron API types
export interface ElectronAPI {
  // General IPC invoke method
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  
  // App info APIs
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  
  // Manifest loading APIs
  loadManifestFile: (filePath: string, type?: string) => Promise<unknown>;
  loadMultipleManifests: (filePaths: string[]) => Promise<unknown>;
  discoverManifests: (directory: string, recursive?: boolean) => Promise<string[]>;
  saveManifest: (data: unknown, filePath: string) => Promise<{ success: boolean }>;
  getDefaultManifestDirs: () => Promise<string[]>;
  ensureCacheDir: () => Promise<{ success: boolean }>;
  clearManifestCache: () => Promise<{ success: boolean }>;
  
  // System detection APIs
  detectInstalledTools: () => Promise<{
    success: boolean;
    data?: SystemDetectionReport;
    error?: {
      code: string;
      message: string;
      severity: string;
      category: string;
      userMessage: string;
    };
  }>;
  getSystemInfo: () => Promise<{
    success: boolean;
    data?: {
      platform: string;
      architecture: string;
      version: string;
      distribution?: string;
      distributionVersion?: string;
    };
    error?: {
      code: string;
      message: string;
      severity: string;
      category: string;
      userMessage: string;
    };
  }>;
  detectTool: (toolName: string) => Promise<{
    success: boolean;
    data?: DetectionResult;
    error?: {
      code: string;
      message: string;
      severity: string;
      category: string;
      userMessage: string;
    };
  }>;
  
  // File operations APIs
  saveToFile: (options: SaveFileOptions) => Promise<boolean>;
  loadFromFile: (options: FileOperationOptions) => Promise<string | null>;
  fileExists: (options: FileOperationOptions) => Promise<boolean>;
  deleteFile: (options: FileOperationOptions) => Promise<boolean>;
  listFiles: (options: { directory: string; extension?: string }) => Promise<string[]>;
  
  // Installation APIs (to be implemented later)
  installTool: (toolId: string) => Promise<unknown>;
  
  // Progress tracking APIs (to be implemented later)
  onInstallProgress: (callback: (progress: unknown) => void) => void;
  
  // Clean up listeners
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export { };
