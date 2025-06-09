/**
 * Version Manager Integration
 * Connects version managers with workspace configuration
 */

import { join } from 'path';
import type { Platform } from '../../shared/simple-manifest-types';
import { VersionManagerInstaller } from '../version-manager-installer';
import type {
    IVersionManager,
    VersionedTool,
    VersionManagerType,
    IVersionOperationResult,
    VersionSpecifier
} from '../version-manager-types';
import type {
    EnvironmentSyncResult,
    IWorkspaceConfigurationService,
    PathEntry,
    ShellIntegration,
    WorkspaceConfiguration,
    WorkspaceToolConfig
} from './types';

/**
 * Version manager integration service
 */
export class VersionManagerIntegration {
  private _installer: VersionManagerInstaller;
  private workspaceService: IWorkspaceConfigurationService;
  private versionManagers: Map<VersionManagerType, IVersionManager> = new Map();

  constructor(
    installer: VersionManagerInstaller,
    workspaceService: IWorkspaceConfigurationService,
  ) {
    this._installer = installer;
    this.workspaceService = workspaceService;
  }

  /**
   * Register a version manager
   */
  registerVersionManager(type: VersionManagerType, manager: IVersionManager): void {
    this.versionManagers.set(type, manager);
  }

  /**
   * Get version manager by type
   */
  private getVersionManager(type: VersionManagerType): IVersionManager {
    const manager = this.versionManagers.get(type);
    if (!manager) {
      throw new Error(`Version manager ${type} not registered`);
    }
    return manager;
  }

  /**
   * Switch tool version and update workspace configuration
   */
  async switchToolVersion(
    tool: VersionedTool,
    version: VersionSpecifier,
    manager: VersionManagerType,
    workspaceRoot?: string,
  ): Promise<IVersionOperationResult> {
    const startTime = Date.now();

    try {
      // Get version manager
      const versionManager = this.getVersionManager(manager);

             // Switch version using version manager
       const versionString = typeof version === 'string' ? version : `${version.major}.${version.minor || 0}.${version.patch || 0}`;
       const switchResult = await versionManager.switchVersion(tool, versionString);
       
       if (!switchResult.success) {
         return switchResult;
       }

      // Update workspace configuration
      await this.updateWorkspaceConfiguration(
        tool,
        version,
        manager,
        workspaceRoot,
      );

      // Synchronize environment
      const syncResult = await this.synchronizeEnvironment(workspaceRoot);
      
      if (!syncResult.success) {
        console.warn('Environment synchronization failed:', syncResult.error);
      }

      return {
        success: true,
        operation: 'switch',
        tool,
        version: typeof version === 'string' ? version : `${version.major}.${version.minor || 0}.${version.patch || 0}`,
        message: `Successfully switched ${tool} to version ${version} and updated workspace configuration`,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        operation: 'switch',
        tool,
        version: typeof version === 'string' ? version : `${version.major}.${version.minor || 0}.${version.patch || 0}`,
        message: `Failed to switch ${tool} to version ${version}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update workspace configuration with new tool version
   */
  private async updateWorkspaceConfiguration(
    tool: VersionedTool,
    version: VersionSpecifier,
    manager: VersionManagerType,
    workspaceRoot?: string,
  ): Promise<void> {
    const detectedWorkspace = await this.workspaceService.detectWorkspace(workspaceRoot);
    const configRoot = detectedWorkspace.workspaceRoot || workspaceRoot || process.cwd();

    // Load existing configuration
    let config = await this.workspaceService.loadConfiguration(configRoot);
    
    if (!config) {
      // Create new configuration
      config = await this.createDefaultWorkspaceConfiguration(configRoot);
    }

    // Update or add tool configuration
    const existingToolIndex = config.tools.findIndex(t => t.tool === tool);
    const toolConfig: WorkspaceToolConfig = {
      tool,
      version,
      manager,
      active: true,
      environment: await this.getToolEnvironmentVariables(tool, version, manager),
      pathEntries: await this.getToolPathEntries(tool, version, manager),
    };

    if (existingToolIndex >= 0) {
      config.tools[existingToolIndex] = toolConfig;
    } else {
      config.tools.push(toolConfig);
    }

    // Update metadata
    config.metadata.lastUpdated = new Date();

    // Save configuration
    await this.workspaceService.saveConfiguration(config);
  }

  /**
   * Create default workspace configuration
   */
  private async createDefaultWorkspaceConfiguration(
    workspaceRoot: string,
  ): Promise<WorkspaceConfiguration> {
    const detectionResult = await this.workspaceService.detectWorkspace(workspaceRoot);

    return {
      workspaceRoot,
      name: detectionResult.workspaceType || 'Unknown Project',
      tools: [],
      environment: [],
      pathConfiguration: [],
      shellIntegrations: [],
      projects: [],
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date(),
        platform: this.detectPlatform(),
        architecture: this.detectArchitecture(),
      },
    };
  }

  /**
   * Get tool-specific environment variables
   */
     private async getToolEnvironmentVariables(
     tool: VersionedTool,
     version: VersionSpecifier,
     manager: VersionManagerType,
   ): Promise<Record<string, string>> {
     try {
       const versionManager = this.getVersionManager(manager);
       await versionManager.getProjectConfig();
       
       // Extract environment variables from version manager configuration
       const environment: Record<string, string> = {};
       const versionString = typeof version === 'string' 
         ? version 
         : `${version.major}.${version.minor ?? 0}.${version.patch ?? 0}`;
       
       // Add tool-specific environment variables based on the tool type
       switch (tool) {
         case 'node': {
           environment.NODE_VERSION = versionString;
           break;
         }
         case 'python': {
           environment.PYTHON_VERSION = versionString;
           break;
         }
         case 'ruby': {
           environment.RUBY_VERSION = versionString;
           break;
         }
         default: {
           // Generic version environment variable
           environment[`${tool.toUpperCase()}_VERSION`] = versionString;
         }
       }

       return environment;
     } catch (error) {
       console.warn(`Failed to get environment variables for ${tool}:`, error);
       return {};
     }
   }

  /**
   * Get tool-specific PATH entries
   */
  private async getToolPathEntries(
    tool: VersionedTool,
    _version: VersionSpecifier,
    manager: VersionManagerType,
  ): Promise<PathEntry[]> {
    try {
      const versionManager = this.getVersionManager(manager);
      const config = await versionManager.getConfig();
      
      // Get installation path from config
      const installPath = config?.installationPath;
      
      if (!installPath) {
        return [];
      }

      // Create PATH entries for the tool
      const pathEntries: PathEntry[] = [];
      
      // Add bin directory to PATH
      const binPath = join(installPath, 'bin');
      pathEntries.push({
        path: binPath,
        priority: 1,
        position: 'prepend',
        tool,
        manager,
        conditional: true,
      });

      // Add tool-specific paths
      switch (tool) {
        case 'node': {
          // Add npm global bin path
          const npmGlobalPath = join(installPath, 'lib', 'node_modules', '.bin');
          pathEntries.push({
            path: npmGlobalPath,
            priority: 2,
            position: 'prepend',
            tool,
            manager,
            conditional: true,
          });
          break;
        }
        case 'python': {
          // Add Scripts directory for Windows
          if (this.detectPlatform() === 'win32') {
            pathEntries.push({
              path: join(installPath, 'Scripts'),
              priority: 2,
              position: 'prepend',
              tool,
              manager,
              conditional: true,
            });
          }
          break;
        }
      }

      return pathEntries;
    } catch (error) {
      console.warn(`Failed to get PATH entries for ${tool}:`, error);
      return [];
    }
  }

  /**
   * Synchronize environment with workspace configuration
   */
  async synchronizeEnvironment(workspaceRoot?: string): Promise<EnvironmentSyncResult> {
    try {
      return await this.workspaceService.synchronizeEnvironment(workspaceRoot);
    } catch (error) {
      return {
        success: false,
        changedVariables: [],
        modifiedPaths: [],
        updatedProfiles: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: [],
        duration: 0,
      };
    }
  }

  /**
   * Apply workspace configuration to environment
   */
  async applyWorkspaceConfiguration(
    workspaceRoot?: string,
  ): Promise<EnvironmentSyncResult> {
    try {
      const config = await this.workspaceService.getCurrentConfiguration(workspaceRoot);
      
      if (!config) {
        throw new Error('No workspace configuration found');
      }

      return await this.workspaceService.applyConfiguration(config);
    } catch (error) {
      return {
        success: false,
        changedVariables: [],
        modifiedPaths: [],
        updatedProfiles: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: [],
        duration: 0,
      };
    }
  }

  /**
   * Create shell integration for version managers
   */
  async createShellIntegration(
    managers: VersionManagerType[],
    _workspaceRoot?: string,
  ): Promise<ShellIntegration[]> {
    const integrations: ShellIntegration[] = [];

    for (const managerType of managers) {
      try {
        const manager = this.getVersionManager(managerType);
        const config = await manager.getConfig();
        
        if (!config.shellIntegration) {
          continue;
        }

        const integration: ShellIntegration = {
          profile: '.bashrc', // Default profile, should be detected dynamically
          initCommands: [],
          environmentVariables: [],
          pathEntries: [],
          enabled: true,
        };

        // Add manager-specific environment variables
        if (config?.environment) {
          for (const [name, value] of Object.entries(config.environment)) {
            integration.environmentVariables.push({
              name,
              value,
              operation: 'set',
              scope: 'user',
              persistent: true,
            });
          }
        }

        // Add manager-specific PATH entries
        if (config?.installationPath) {
          integration.pathEntries.push({
            path: join(config.installationPath, 'bin'),
            priority: 1,
            position: 'prepend',
            manager: managerType,
            conditional: true,
          });
        }

        integrations.push(integration);
      } catch (error) {
        console.warn(`Failed to create shell integration for ${managerType}:`, error);
      }
    }

    return integrations;
  }

  /**
   * Detect current platform
   */
  private detectPlatform(): Platform {
    const platformName = process.platform;
    switch (platformName) {
      case 'darwin':
        return 'darwin';
      case 'win32':
        return 'win32';
      case 'linux':
        return 'linux';
      default:
        return 'linux';
    }
  }

  /**
   * Detect current architecture
   */
  private detectArchitecture(): 'x64' | 'arm64' | 'x86' {
    const arch = process.arch;
    switch (arch) {
      case 'x64':
        return 'x64';
      case 'arm64':
        return 'arm64';
      case 'ia32':
        return 'x86';
      default:
        return 'x64';
    }
  }

  /**
   * Get all active tools in workspace
   */
  async getActiveTools(workspaceRoot?: string): Promise<WorkspaceToolConfig[]> {
    const config = await this.workspaceService.getCurrentConfiguration(workspaceRoot);
    return config?.tools.filter(tool => tool.active) || [];
  }

  /**
   * Refresh all version manager environments
   */
  async refreshAllEnvironments(): Promise<EnvironmentSyncResult[]> {
    const results: EnvironmentSyncResult[] = [];

    for (const [type, manager] of this.versionManagers) {
      try {
        await manager.refreshEnvironment();
        results.push({
          success: true,
          changedVariables: [],
          modifiedPaths: [],
          updatedProfiles: [],
          warnings: [],
          duration: 0,
        });
      } catch (error) {
        results.push({
          success: false,
          changedVariables: [],
          modifiedPaths: [],
          updatedProfiles: [],
          error: `Failed to refresh ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          warnings: [],
          duration: 0,
        });
      }
    }

    return results;
  }
} 