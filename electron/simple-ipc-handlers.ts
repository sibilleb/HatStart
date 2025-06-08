/**
 * Simplified IPC Handlers
 * Replaces 489 lines of over-engineered IPC with straightforward handlers
 */

import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { SimpleTool, SimpleManifest } from '../src/shared/simple-manifest-types';

const execAsync = promisify(exec);

/**
 * Simple error handler that returns a plain error object
 */
function handleError(error: unknown): { error: string; details?: unknown } {
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: 'Unknown error occurred', details: error };
}

/**
 * Register all IPC handlers
 */
export function registerSimpleHandlers(): void {
  // Load manifest - keep for backward compatibility
  ipcMain.handle('load-manifest', async (): Promise<SimpleManifest | { error: string }> => {
    try {
      const manifestPath = path.join(__dirname, '../src/shared/default-tools.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest: SimpleManifest = JSON.parse(content);
      return manifest;
    } catch (error) {
      return handleError(error);
    }
  });

  // Manifest APIs expected by preload
  ipcMain.handle('manifest:load-file', async (_event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const manifest: SimpleManifest = JSON.parse(content);
      return { success: true, data: manifest };
    } catch (error) {
      return handleError(error);
    }
  });

  ipcMain.handle('manifest:get-default-dirs', async () => {
    return {
      success: true,
      data: [path.join(__dirname, '../src/shared')]
    };
  });

  // System detection API
  ipcMain.handle('system-detection:detect', async () => {
    try {
      const manifestResult = await loadManifestData();
      if ('error' in manifestResult) {
        return manifestResult;
      }
      
      // Group tools by category
      const categories = Array.from(new Set(manifestResult.tools.map(t => t.category)));
      const categorizedTools = categories.map(cat => ({
        id: cat,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        tools: manifestResult.tools.filter(t => t.category === cat)
      }));
      
      // Return in the expected format with success flag
      return {
        success: true,
        data: {
          systemInfo: {
            platform: process.platform,
            version: process.version,
            architecture: process.arch
          },
          categories: categorizedTools.map(cat => ({
            category: cat.id,
            tools: cat.tools.map(tool => ({
              name: tool.name,
              found: false, // Simple manifest doesn't track installed status
              version: tool.verification ? 'Unknown' : undefined
            }))
          })),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return handleError(error);
    }
  });

  // System info API
  ipcMain.handle('system-detection:info', async () => {
    return {
      success: true,
      data: {
        platform: process.platform,
        version: process.version,
        architecture: process.arch
      }
    };
  });

  // Install tools
  ipcMain.handle('install-tools', async (
    event: IpcMainInvokeEvent,
    toolIds: string[]
  ) => {
    try {
      const manifestResult = await loadManifestData();
      if ('error' in manifestResult) {
        return manifestResult;
      }

      const results = [];
      const platform = process.platform as 'darwin' | 'win32' | 'linux';

      // Find tools in manifest
      const toolsToInstall = manifestResult.tools.filter(tool => 
        toolIds.includes(tool.id)
      );

      // Install each tool
      for (let i = 0; i < toolsToInstall.length; i++) {
        const tool = toolsToInstall[i];
        const progress = ((i + 1) / toolsToInstall.length) * 100;
        
        // Send progress update
        event.sender.send('installation-progress', {
          message: `Installing ${tool.name}...`,
          progress: progress
        });

        try {
          // Get install command based on platform
          const command = getInstallCommand(tool, platform);
          if (!command) {
            results.push({
              success: false,
              tool: tool.id,
              message: `No installation method for ${tool.name} on ${platform}`
            });
            continue;
          }

          // Execute installation
          await execAsync(command);
          
          results.push({
            success: true,
            tool: tool.id,
            message: `Successfully installed ${tool.name}`
          });
        } catch (error) {
          results.push({
            success: false,
            tool: tool.id,
            message: `Failed to install ${tool.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      // Generate summary
      const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        alreadyInstalled: 0,
        failures: results.filter(r => !r.success).map(r => ({
          tool: r.tool,
          error: r.message
        }))
      };

      return { success: true, summary, results };
    } catch (error) {
      return handleError(error);
    }
  });

  // Check prerequisites
  ipcMain.handle('check-prerequisites', async () => {
    try {
      const platform = process.platform;
      const packageManagers: Record<string, string> = {
        darwin: 'brew',
        win32: 'choco',
        linux: 'apt-get'
      };
      
      const manager = packageManagers[platform] || 'unknown';
      
      try {
        await execAsync(`${manager} --version`);
        return {
          platform,
          packageManager: manager,
          available: true
        };
      } catch {
        return {
          platform,
          packageManager: manager,
          available: false
        };
      }
    } catch (error) {
      return handleError(error);
    }
  });

  // Get job roles
  ipcMain.handle('get-job-roles', async () => {
    try {
      const jobRolePath = path.join(__dirname, '../src/data/job-role-configs.ts');
      const content = await fs.readFile(jobRolePath, 'utf-8');
      
      // Extract the job roles array
      const rolesMatch = content.match(/export const jobRoleConfigs[^=]*=\s*(\[[\s\S]*?\]);/);
      if (!rolesMatch) {
        throw new Error('Could not parse job roles file');
      }
      
      const roles = new Function(`return ${rolesMatch[1]}`)();
      return { success: true, roles };
    } catch (error) {
      return handleError(error);
    }
  });

  // Version management placeholder
  ipcMain.handle('version-manager:list', async () => {
    return { success: true, managers: [] };
  });

  ipcMain.handle('version-manager:detect', async () => {
    return { success: true, detected: [] };
  });
}

/**
 * Load manifest data helper
 */
async function loadManifestData(): Promise<SimpleManifest | { error: string }> {
  try {
    const manifestPath = path.join(__dirname, '../src/shared/default-tools.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest: SimpleManifest = JSON.parse(content);
    return manifest;
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Get install command for a tool on a platform
 */
function getInstallCommand(tool: SimpleTool, platform: 'darwin' | 'win32' | 'linux'): string | null {
  // Check for custom install command first
  if (tool.customInstall?.[platform]) {
    return tool.customInstall[platform];
  }
  
  // Check for package name
  const packageName = tool.packageNames?.[platform];
  if (!packageName) {
    return null;
  }
  
  // Generate package manager command based on platform
  switch (platform) {
    case 'darwin':
      return `brew install ${packageName}`;
    case 'win32':
      return `choco install -y ${packageName}`;
    case 'linux':
      return `sudo apt-get install -y ${packageName}`;
    default:
      return null;
  }
}