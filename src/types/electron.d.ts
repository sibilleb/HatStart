import type { DetectionResult, SystemDetectionReport } from '../shared/detection-types';

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
      homeDirectory?: string;
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
  
  // Workspace APIs
  createWorkspace: (options: {
    path: string;
    files: Array<{
      path: string;
      content: string;
    }>;
  }) => Promise<{ success: boolean; error?: string }>;
  
  // Installation APIs
  installTools: (toolIds: string[]) => Promise<{
    success: boolean;
    summary?: {
      total: number;
      successful: number;
      failed: number;
      alreadyInstalled: number;
      failures: Array<{ tool: string; error: string }>;
    };
    results?: Array<{
      success: boolean;
      tool: string;
      message: string;
      error?: Error;
    }>;
    error?: string;
  }>;
  checkPrerequisites: () => Promise<{
    platform: string;
    packageManager: string;
    available: boolean;
  }>;
  
  // Tool detection APIs
  detectTools: (toolIds?: string[]) => Promise<{
    success: boolean;
    results?: Array<{
      toolId: string;
      installed: boolean;
      version?: string;
      lastChecked: Date;
    }>;
    error?: string;
  }>;
  detectSingleTool: (toolId: string) => Promise<{
    success: boolean;
    result?: {
      toolId: string;
      installed: boolean;
      version?: string;
      lastChecked: Date;
    };
    error?: string;
  }>;
  clearDetectionCache: (toolId?: string) => Promise<{ success: boolean }>;
  
  // Progress tracking APIs
  onInstallationProgress: (callback: (progress: { message: string; progress: number }) => void) => () => void;
  
  // Version Management APIs - Minimal MVP implementation
  versionManager: {
    // Get list of supported version managers
    list: () => Promise<{
      success: boolean;
      managers?: Array<{
        type: string;
        name: string;
        description: string;
        isInstalled: boolean;
        supportedTools: string[];
      }>;
      error?: string;
    }>;
    
    // Check if a version manager is installed
    checkInstalled: (managerType: string) => Promise<{
      success: boolean;
      isInstalled?: boolean;
      error?: string;
    }>;
    
    // Get installed versions for a tool
    listVersions: (tool: string) => Promise<{
      success: boolean;
      versions?: string[];
      error?: string;
    }>;
    
    // Get current active version for a tool
    getCurrentVersion: (tool: string) => Promise<{
      success: boolean;
      version?: string;
      error?: string;
    }>;
  };
  
  // Clean up listeners
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export { };
