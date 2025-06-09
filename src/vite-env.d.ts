/// <reference types="vite/client" />

import type {
    CategoryManifest,
    ManifestData,
    MasterManifest,
    ToolManifest,
    ValidationResult
} from './shared/simple-manifest-types';

// Electron API interface for the renderer process
interface ElectronAPI {
  // Generic IPC invoke method
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  
  // Manifest-specific methods
  manifest: {
    loadToolManifest: (filePath: string) => Promise<ValidationResult<ToolManifest>>;
    loadCategoryManifest: (filePath: string) => Promise<ValidationResult<CategoryManifest>>;
    loadMasterManifest: (filePath: string) => Promise<ValidationResult<MasterManifest>>;
    loadManifestFile: (filePath: string) => Promise<ValidationResult<ManifestData>>;
    loadMultipleManifests: (filePaths: string[]) => Promise<ValidationResult<ManifestData>[]>;
    discoverManifests: (directory: string, recursive?: boolean) => Promise<string[]>;
    saveManifest: (data: ManifestData, filePath: string) => Promise<{ success: boolean; error?: string }>;
    getDefaultDirectories: () => Promise<string[]>;
    ensureCacheDirectory: () => Promise<{ success: boolean; path: string }>;
    clearCache: () => Promise<{ success: boolean }>;
  };
  
  // App info APIs
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  
  // System detection APIs (to be implemented later)
  detectInstalledTools: () => Promise<unknown>;
  
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
