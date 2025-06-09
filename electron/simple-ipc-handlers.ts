/**
 * Simplified IPC Handlers
 * Replaces 489 lines of over-engineered IPC with straightforward handlers
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { SimpleTool, SimpleManifest } from '../src/shared/simple-manifest-types';
import { toolDetectionService } from '../src/services/tool-detection-service';

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
      console.log('load-manifest: Loading from:', manifestPath);
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest: SimpleManifest = JSON.parse(content);
      console.log('load-manifest: Loaded', manifest.tools.length, 'tools');
      return manifest;
    } catch (error) {
      console.error('load-manifest: Failed:', error);
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
      
      // Detect all tools
      const detectionResults = await toolDetectionService.detectMultipleTools(manifestResult.tools);
      const detectionMap = new Map(detectionResults.map(r => [r.toolId, r]));
      
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
            platform: process.platform as 'darwin' | 'win32' | 'linux',
            version: process.version,
            architecture: process.arch as 'x64' | 'arm64'
          },
          categories: categorizedTools.map(cat => ({
            category: cat.id,
            tools: cat.tools.map(tool => {
              const detection = detectionMap.get(tool.id);
              console.log(`system-detection:detect - Tool: ${tool.id} (${tool.name}) - Installed: ${detection?.installed}`);
              return {
                name: tool.id, // Use tool.id so it matches when installing
                found: detection?.installed || false,
                version: detection?.version || (tool.verification ? 'Unknown' : undefined),
                path: '',
                detectionMethod: 'command' as const,
                error: null,
                // Add metadata to pass display name
                metadata: {
                  displayName: tool.name,
                  description: tool.description
                }
              };
            })
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
      console.log('install-tools: Received tool IDs:', toolIds);
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
      console.log('install-tools: Found tools to install:', toolsToInstall.map(t => t.id));

      // If no tools found, check if it's a naming mismatch
      if (toolsToInstall.length === 0) {
        console.log('install-tools: No exact matches. Available tools:', manifestResult.tools.map(t => ({ id: t.id, name: t.name })));
      }

      // Install each tool
      let alreadyInstalled = 0;
      
      for (let i = 0; i < toolsToInstall.length; i++) {
        const tool = toolsToInstall[i];
        const progress = ((i + 1) / toolsToInstall.length) * 100;
        
        // Send progress update
        event.sender.send('installation-progress', {
          message: `Checking ${tool.name}...`,
          progress: progress * 0.3 // 30% for checking
        });

        // Check if already installed
        const detection = await toolDetectionService.detectTool(tool);
        if (detection.installed) {
          console.log(`install-tools: ${tool.name} is already installed (version: ${detection.version})`);
          alreadyInstalled++;
          results.push({
            success: true,
            tool: tool.id,
            message: `${tool.name} is already installed${detection.version ? ` (version ${detection.version})` : ''}`
          });
          continue;
        }

        // Send progress update
        event.sender.send('installation-progress', {
          message: `Installing ${tool.name}...`,
          progress: progress * 0.6 + 30 // 60% for installing + 30% from checking
        });

        try {
          // Get install command based on platform
          const command = getInstallCommand(tool, platform);
          console.log(`install-tools: Installing ${tool.name} with command: ${command}`);
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
          
          // Clear cache for this tool so next detection is fresh
          toolDetectionService.clearCache(tool.id);
          
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
        total: toolIds.length, // Use requested count, not found count
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        alreadyInstalled: alreadyInstalled,
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

  // Detect installed tools
  ipcMain.handle('detect-tools', async (
    _event: IpcMainInvokeEvent,
    toolIds?: string[]
  ) => {
    try {
      const manifestResult = await loadManifestData();
      if ('error' in manifestResult) {
        return manifestResult;
      }

      // Filter tools if specific IDs provided
      const toolsToCheck = toolIds 
        ? manifestResult.tools.filter(tool => toolIds.includes(tool.id))
        : manifestResult.tools;

      // Detect tools
      const detectionResults = await toolDetectionService.detectMultipleTools(toolsToCheck);
      
      return { 
        success: true, 
        results: detectionResults 
      };
    } catch (error) {
      return handleError(error);
    }
  });

  // Detect single tool
  ipcMain.handle('detect-tool', async (
    _event: IpcMainInvokeEvent,
    toolId: string
  ) => {
    try {
      const manifestResult = await loadManifestData();
      if ('error' in manifestResult) {
        return manifestResult;
      }

      const tool = manifestResult.tools.find(t => t.id === toolId);
      if (!tool) {
        return { error: `Tool ${toolId} not found in manifest` };
      }

      const result = await toolDetectionService.detectTool(tool);
      return { success: true, result };
    } catch (error) {
      return handleError(error);
    }
  });

  // Clear detection cache
  ipcMain.handle('clear-detection-cache', async (
    _event: IpcMainInvokeEvent,
    toolId?: string
  ) => {
    try {
      toolDetectionService.clearCache(toolId);
      return { success: true };
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
    // Fix path - in compiled output, __dirname is dist-electron/electron
    const manifestPath = path.join(__dirname, '../src/shared/default-tools.json');
    console.log('Loading manifest from:', manifestPath);
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest: SimpleManifest = JSON.parse(content);
    console.log('Loaded manifest with', manifest.tools.length, 'tools');
    return manifest;
  } catch (error) {
    console.error('Failed to load manifest:', error);
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