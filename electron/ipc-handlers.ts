import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
    type HatStartError
} from '../src/shared/error-handling';
import { defaultErrorLogger } from '../src/shared/error-logging';
import { SystemDetector } from '../src/shared/system-detector.js';
import { MainProcessManifestLoader } from './manifest-loader-main';

const manifestLoader = new MainProcessManifestLoader();
let systemDetector: SystemDetector | null = null;

/**
 * Get or create system detector instance
 */
function getSystemDetector(): SystemDetector {
  if (!systemDetector) {
    systemDetector = new SystemDetector();
  }
  return systemDetector;
}

/**
 * Setup IPC handlers for manifest loading operations
 */
export function setupManifestIpcHandlers(): void {
  // Basic manifest loading with enhanced error logging
  ipcMain.handle('manifest:load', async (event, source: string) => {
    try {
      const result = await manifestLoader.loadManifestFromFile(source);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          metadata: result.metadata
        };
      } else {
        // Convert LoadError to HatStartError and log
        const hatStartError: HatStartError = {
          code: result.error?.code || 'UNKNOWN_ERROR',
          technicalMessage: result.error?.message || 'Unknown error',
          userMessage: 'Failed to load manifest. Please check the file path and try again.',
          severity: 'error',
          category: source.startsWith('http') ? 'network' : 'filesystem',
          timestamp: new Date().toISOString(),
          recoveryStrategies: ['retry', 'fallback'],
          context: {
            component: 'ipc-handlers',
            operation: 'manifest:load',
            resource: source
          }
        };
        
        await defaultErrorLogger.logError(hatStartError);
        
        return {
          success: false,
          error: {
            code: hatStartError.code,
            message: hatStartError.technicalMessage,
            severity: hatStartError.severity,
            category: hatStartError.category,
            userMessage: hatStartError.userMessage
          }
        };
      }
    } catch (error) {
      // Handle unexpected errors
      const hatStartError: HatStartError = {
        code: 'UNEXPECTED_ERROR',
        technicalMessage: error instanceof Error ? error.message : 'Unknown error occurred',
        userMessage: 'An unexpected error occurred. Please try again.',
        severity: 'error',
        category: 'system',
        timestamp: new Date().toISOString(),
        recoveryStrategies: ['retry'],
        context: {
          component: 'ipc-handlers',
          operation: 'manifest:load',
          resource: source
        }
      };
      
      await defaultErrorLogger.logError(hatStartError);
      
      return {
        success: false,
        error: {
          code: hatStartError.code,
          message: hatStartError.technicalMessage,
          severity: hatStartError.severity,
          category: hatStartError.category,
          userMessage: hatStartError.userMessage
        }
      };
    }
  });

  // Legacy support - single file loading
  ipcMain.handle('manifest:loadFile', async (event, filePath: string) => {
    // Reuse the main load handler
    return ipcMain.emit('manifest:load', event, filePath);
  });

  // Error monitoring endpoints  
  ipcMain.handle('manifest:getErrorMetrics', async () => {
    try {
      const metrics = defaultErrorLogger.getMetrics();
      return { success: true, metrics };
    } catch {
      return {
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to retrieve error metrics',
          severity: 'warning' as const,
          category: 'system' as const,
          userMessage: 'Unable to retrieve error statistics at this time.'
        }
      };
    }
  });

  // Cache management with error handling
  ipcMain.handle('manifest:ensureCacheDir', async () => {
    try {
      await manifestLoader.ensureCacheDir();
      return { success: true };
    } catch (error) {
      const hatStartError: HatStartError = {
        code: 'CACHE_SETUP_ERROR',
        technicalMessage: error instanceof Error ? error.message : 'Failed to setup cache',
        userMessage: 'Unable to setup cache directory.',
        severity: 'warning',
        category: 'filesystem',
        timestamp: new Date().toISOString(),
        recoveryStrategies: ['retry'],
        context: {
          component: 'ipc-handlers',
          operation: 'manifest:ensureCacheDir'
        }
      };
      
      await defaultErrorLogger.logError(hatStartError);
      
      return {
        success: false,
        error: {
          code: hatStartError.code,
          message: hatStartError.technicalMessage,
          severity: hatStartError.severity,
          category: hatStartError.category,
          userMessage: hatStartError.userMessage
        }
      };
    }
  });

  ipcMain.handle('manifest:clearCache', async () => {
    try {
      await manifestLoader.clearCache();
      return { success: true };
    } catch (error) {
      const hatStartError: HatStartError = {
        code: 'CACHE_CLEAR_ERROR',
        technicalMessage: error instanceof Error ? error.message : 'Failed to clear cache',
        userMessage: 'Unable to clear cache.',
        severity: 'warning',
        category: 'filesystem',
        timestamp: new Date().toISOString(),
        recoveryStrategies: ['retry'],
        context: {
          component: 'ipc-handlers',
          operation: 'manifest:clearCache'
        }
      };
      
      await defaultErrorLogger.logError(hatStartError);
      
      return {
        success: false,
        error: {
          code: hatStartError.code,
          message: hatStartError.technicalMessage,
          severity: hatStartError.severity,
          category: hatStartError.category,
          userMessage: hatStartError.userMessage
        }
      };
    }
  });
}

/**
 * Setup IPC handlers for system detection operations
 */
export function setupSystemDetectionIpcHandlers(): void {
  // Run system detection
  ipcMain.handle('system-detection:detect', async () => {
    try {
      const detector = getSystemDetector();
      const report = await detector.detectTools();
      return {
        success: true,
        data: report
      };
    } catch (error) {
      const hatStartError: HatStartError = {
        code: 'SYSTEM_DETECTION_ERROR',
        technicalMessage: error instanceof Error ? error.message : 'System detection failed',
        userMessage: 'Failed to detect installed tools. Please try again.',
        severity: 'error',
        category: 'system',
        timestamp: new Date().toISOString(),
        recoveryStrategies: ['retry'],
        context: {
          component: 'ipc-handlers',
          operation: 'system-detection:detect'
        }
      };
      
      await defaultErrorLogger.logError(hatStartError);
      
      return {
        success: false,
        error: {
          code: hatStartError.code,
          message: hatStartError.technicalMessage,
          severity: hatStartError.severity,
          category: hatStartError.category,
          userMessage: hatStartError.userMessage
        }
      };
    }
  });

  // Get system info only
  ipcMain.handle('system-detection:info', async () => {
    try {
      const detector = getSystemDetector();
      const systemInfo = await detector.detectSystemInfo();
      return {
        success: true,
        data: systemInfo
      };
    } catch (error) {
      const hatStartError: HatStartError = {
        code: 'SYSTEM_INFO_ERROR',
        technicalMessage: error instanceof Error ? error.message : 'System info detection failed',
        userMessage: 'Failed to detect system information.',
        severity: 'warning',
        category: 'system',
        timestamp: new Date().toISOString(),
        recoveryStrategies: ['retry'],
        context: {
          component: 'ipc-handlers',
          operation: 'system-detection:info'
        }
      };
      
      await defaultErrorLogger.logError(hatStartError);
      
      return {
        success: false,
        error: {
          code: hatStartError.code,
          message: hatStartError.technicalMessage,
          severity: hatStartError.severity,
          category: hatStartError.category,
          userMessage: hatStartError.userMessage
        }
      };
    }
  });

  // Detect specific tool
  ipcMain.handle('system-detection:tool', async (event, toolName: string) => {
    try {
      const detector = getSystemDetector();
      const result = await detector.detectTool(toolName);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      const hatStartError: HatStartError = {
        code: 'TOOL_DETECTION_ERROR',
        technicalMessage: error instanceof Error ? error.message : 'Tool detection failed',
        userMessage: `Failed to detect ${toolName}. Please try again.`,
        severity: 'warning',
        category: 'system',
        timestamp: new Date().toISOString(),
        recoveryStrategies: ['retry'],
        context: {
          component: 'ipc-handlers',
          operation: 'system-detection:tool',
          resource: toolName
        }
      };
      
      await defaultErrorLogger.logError(hatStartError);
      
      return {
        success: false,
        error: {
          code: hatStartError.code,
          message: hatStartError.technicalMessage,
          severity: hatStartError.severity,
          category: hatStartError.category,
          userMessage: hatStartError.userMessage
        }
      };
    }
  });
}

/**
 * Setup IPC handlers for file operations
 */
export function setupFileOperationsIpcHandlers(): void {
  // Ensure a directory exists
  const ensureDirectoryExists = (dirPath: string): void => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  };

  // Get app data directory
  const getAppDataPath = (): string => {
    return app.getPath('userData');
  };

  // Resolve full path for a file
  const resolveFilePath = (fileName: string, directory?: string): string => {
    const appDataPath = getAppDataPath();
    const basePath = directory 
      ? path.join(appDataPath, directory) 
      : appDataPath;

    ensureDirectoryExists(basePath);
    return path.join(basePath, fileName);
  };

  // Save data to a file
  ipcMain.handle('file:save', async (event, options: { 
    fileName: string; 
    data: string; 
    directory?: string 
  }) => {
    try {
      const { fileName, data, directory } = options;
      const filePath = resolveFilePath(fileName, directory);
      
      fs.writeFileSync(filePath, data, 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  });

  // Load data from a file
  ipcMain.handle('file:load', async (event, options: { 
    fileName: string; 
    directory?: string 
  }) => {
    try {
      const { fileName, directory } = options;
      const filePath = resolveFilePath(fileName, directory);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error('Failed to load file:', error);
      return null;
    }
  });

  // Check if a file exists
  ipcMain.handle('file:exists', async (event, options: { 
    fileName: string; 
    directory?: string 
  }) => {
    try {
      const { fileName, directory } = options;
      const filePath = resolveFilePath(fileName, directory);
      
      return fs.existsSync(filePath);
    } catch (error) {
      console.error('Failed to check if file exists:', error);
      return false;
    }
  });

  // Delete a file
  ipcMain.handle('file:delete', async (event, options: { 
    fileName: string; 
    directory?: string 
  }) => {
    try {
      const { fileName, directory } = options;
      const filePath = resolveFilePath(fileName, directory);
      
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  });

  // List files in a directory
  ipcMain.handle('file:list', async (event, options: { 
    directory: string; 
    extension?: string 
  }) => {
    try {
      const { directory, extension } = options;
      const dirPath = resolveFilePath('', directory);
      
      if (!fs.existsSync(dirPath)) {
        return [];
      }
      
      const files = fs.readdirSync(dirPath);
      
      if (extension) {
        return files.filter((file: string) => file.endsWith(extension));
      }
      
      return files;
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  });
}
