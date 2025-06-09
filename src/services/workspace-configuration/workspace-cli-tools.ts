/**
 * Workspace Configuration CLI Tools
 * Command-line interface for managing workspace-specific settings across team environments
 */

import { exec } from 'child_process';
import { access, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { promisify } from 'util';
import type { Architecture, Platform } from '../../shared/simple-manifest-types';
import type {
  VersionedTool,
  VersionManagerType,
  VersionSpecifier
} from '../version-manager-types';
import type {
  ConfigurationBackup,
  EnvironmentVariable,
  PathEntry,
  ValidationResult,
  WorkspaceConfiguration,
  WorkspaceDetectionResult,
  WorkspaceToolConfig
} from './types';
import { WorkspaceConfigurationService } from './workspace-configuration-service';

const execAsync = promisify(exec);

/**
 * CLI command result interface
 */
export interface CLICommandResult {
  success: boolean;
  message: string;
  data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  error?: string;
  warnings?: string[];
}

/**
 * Workspace initialization options
 */
export interface WorkspaceInitOptions {
  /** Workspace name */
  name?: string;
  /** Force initialization even if workspace already exists */
  force?: boolean;
  /** Initialize with default tools */
  withDefaults?: boolean;
  /** Template to use for initialization */
  template?: 'minimal' | 'web' | 'backend' | 'fullstack' | 'mobile';
  /** Git integration */
  gitIntegration?: boolean;
  /** Team configuration sharing */
  teamSharing?: boolean;
}

/**
 * Workspace sync options
 */
export interface WorkspaceSyncOptions {
  /** Sync direction */
  direction?: 'pull' | 'push' | 'both';
  /** Force sync even with conflicts */
  force?: boolean;
  /** Dry run mode */
  dryRun?: boolean;
  /** Backup before sync */
  backup?: boolean;
  /** Conflict resolution strategy */
  conflictResolution?: 'local' | 'remote' | 'merge' | 'interactive';
}

/**
 * Workspace update options
 */
export interface WorkspaceUpdateOptions {
  /** Update specific tools only */
  tools?: VersionedTool[];
  /** Update environment variables */
  environment?: boolean;
  /** Update PATH configuration */
  path?: boolean;
  /** Update shell integrations */
  shell?: boolean;
  /** Validate after update */
  validate?: boolean;
}

/**
 * Team configuration interface
 */
interface TeamConfiguration {
  name: string;
  tools: Array<{
    tool: VersionedTool;
    version: VersionSpecifier;
    manager: VersionManagerType;
    required: boolean;
  }>;
  environment: EnvironmentVariable[];
  pathConfiguration: PathEntry[];
  metadata: {
    version: string;
    lastUpdated: Date;
    createdBy?: string;
    updatedBy?: string;
  };
}

/**
 * Workspace CLI Tools implementation
 */
export class WorkspaceCLITools {
  private workspaceService: WorkspaceConfigurationService;
  private _configFileName = '.hatstart-workspace.json';
  private teamConfigFileName = '.hatstart-team.json';
  private gitIgnoreEntries = [
    '.hatstart-workspace.local.json',
    '.hatstart-cache/',
    '.hatstart-logs/'
  ];

  constructor() {
    this.workspaceService = new WorkspaceConfigurationService();
  }

  /**
   * Initialize workspace configuration
   */
  async initializeWorkspace(
    workspaceRoot: string = process.cwd(),
    options: WorkspaceInitOptions = {}
  ): Promise<CLICommandResult> {
    try {
      const resolvedRoot = resolve(workspaceRoot);
      
      // Check if workspace already exists
      const existingConfig = await this.workspaceService.loadConfiguration(resolvedRoot);
      if (existingConfig && !options.force) {
        return {
          success: false,
          message: 'Workspace already initialized. Use --force to reinitialize.',
          error: 'Workspace exists'
        };
      }

      // Detect existing workspace characteristics
      const detection = await this.workspaceService.detectWorkspace(resolvedRoot);
      
      // Create workspace configuration
      const config = await this.createWorkspaceConfiguration(resolvedRoot, options, detection);
      
      // Save configuration
      await this.workspaceService.saveConfiguration(config);
      
      // Initialize git integration if requested
      if (options.gitIntegration) {
        await this.setupGitIntegration(resolvedRoot);
      }
      
      // Create team configuration if requested
      if (options.teamSharing) {
        await this.createTeamConfiguration(resolvedRoot, config);
      }
      
      // Apply initial configuration
      const syncResult = await this.workspaceService.applyConfiguration(config);
      
      return {
        success: true,
        message: `Workspace initialized successfully at ${resolvedRoot}`,
        data: {
          config,
          syncResult,
          detection
        },
        warnings: syncResult.warnings
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to initialize workspace',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update workspace configuration
   */
  async updateWorkspace(
    workspaceRoot: string = process.cwd(),
    options: WorkspaceUpdateOptions = {}
  ): Promise<CLICommandResult> {
    try {
      const resolvedRoot = resolve(workspaceRoot);
      
      // Load existing configuration
      const config = await this.workspaceService.loadConfiguration(resolvedRoot);
      if (!config) {
        return {
          success: false,
          message: 'No workspace configuration found. Run init first.',
          error: 'Configuration not found'
        };
      }

      // Update configuration based on options
      const updatedConfig = await this.updateConfigurationSelectively(config, options);
      
      // Validate updated configuration
      if (options.validate) {
        const validation = await this.workspaceService.validateConfiguration(updatedConfig);
        if (!validation.valid) {
          return {
            success: false,
            message: 'Configuration validation failed',
            error: validation.errors.join(', '),
            warnings: validation.warnings
          };
        }
      }
      
      // Save updated configuration
      await this.workspaceService.saveConfiguration(updatedConfig);
      
      // Apply changes
      const syncResult = await this.workspaceService.applyConfiguration(updatedConfig);
      
      return {
        success: true,
        message: 'Workspace updated successfully',
        data: {
          config: updatedConfig,
          syncResult
        },
        warnings: syncResult.warnings
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update workspace',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Synchronize workspace with team configuration
   */
  async synchronizeWorkspace(
    workspaceRoot: string = process.cwd(),
    options: WorkspaceSyncOptions = {}
  ): Promise<CLICommandResult> {
    try {
      const resolvedRoot = resolve(workspaceRoot);
      
      // Create backup if requested
      if (options.backup) {
        await this.createBackup(resolvedRoot, 'pre-sync');
      }
      
      // Load local and team configurations
      const localConfig = await this.workspaceService.loadConfiguration(resolvedRoot);
      const teamConfig = await this.loadTeamConfiguration(resolvedRoot);
      
      if (!localConfig) {
        return {
          success: false,
          message: 'No local workspace configuration found',
          error: 'Local configuration missing'
        };
      }
      
      // Handle sync based on direction
      let syncedConfig: WorkspaceConfiguration;
      const conflicts: string[] = [];
      
      switch (options.direction) {
        case 'pull':
          syncedConfig = await this.pullFromTeam(localConfig, teamConfig, options, conflicts);
          break;
        case 'push':
          syncedConfig = await this.pushToTeam(localConfig);
          break;
        case 'both':
        default:
          syncedConfig = await this.bidirectionalSync(localConfig, teamConfig, options, conflicts);
          break;
      }
      
      // Handle conflicts if any
      if (conflicts.length > 0 && !options.force) {
        return await this.handleSyncConflicts(conflicts);
      }
      
      // Apply synchronized configuration
      if (!options.dryRun) {
        await this.workspaceService.saveConfiguration(syncedConfig);
        const syncResult = await this.workspaceService.applyConfiguration(syncedConfig);
        
        return {
          success: true,
          message: 'Workspace synchronized successfully',
          data: {
            config: syncedConfig,
            syncResult,
            conflicts
          },
          warnings: syncResult.warnings
        };
      } else {
        return {
          success: true,
          message: 'Dry run completed - no changes applied',
          data: {
            config: syncedConfig,
            conflicts
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to synchronize workspace',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Validate workspace configuration
   */
  async validateWorkspace(
    workspaceRoot: string = process.cwd()
  ): Promise<CLICommandResult> {
    try {
      const resolvedRoot = resolve(workspaceRoot);
      
      // Load configuration
      const config = await this.workspaceService.loadConfiguration(resolvedRoot);
      if (!config) {
        return {
          success: false,
          message: 'No workspace configuration found',
          error: 'Configuration not found'
        };
      }
      
      // Validate configuration
      const validation = await this.workspaceService.validateConfiguration(config);
      
      // Additional validations
      const additionalChecks = await this.performAdditionalValidations(resolvedRoot, config);
      
      return {
        success: validation.valid && additionalChecks.valid,
        message: validation.valid && additionalChecks.valid 
          ? 'Workspace configuration is valid' 
          : 'Workspace configuration has issues',
        data: {
          validation,
          additionalChecks
        },
        warnings: [...validation.warnings, ...additionalChecks.warnings]
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to validate workspace',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create workspace backup
   */
  async createBackup(
    workspaceRoot: string = process.cwd(),
    reason: string = 'manual'
  ): Promise<CLICommandResult> {
    try {
      const resolvedRoot = resolve(workspaceRoot);
      
      const backup = await this.workspaceService.createBackup(resolvedRoot, reason);
      
      return {
        success: true,
        message: `Backup created successfully: ${backup.timestamp.toISOString()}`,
        data: backup
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create backup',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Restore workspace from backup
   */
  async restoreBackup(
    backupId: string,
    workspaceRoot: string = process.cwd()
  ): Promise<CLICommandResult> {
    try {
      const resolvedRoot = resolve(workspaceRoot);
      
      // Load backup
      const backup = await this.loadBackup(resolvedRoot, backupId);
      if (!backup) {
        return {
          success: false,
          message: `Backup not found: ${backupId}`,
          error: 'Backup not found'
        };
      }
      
      // Restore configuration
      const syncResult = await this.workspaceService.restoreBackup(backup);
      
      return {
        success: true,
        message: `Workspace restored from backup: ${backupId}`,
        data: {
          backup,
          syncResult
        },
        warnings: syncResult.warnings
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to restore backup',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * List workspace tools
   */
  async listTools(
    workspaceRoot: string = process.cwd()
  ): Promise<CLICommandResult> {
    try {
      const resolvedRoot = resolve(workspaceRoot);
      
      const config = await this.workspaceService.loadConfiguration(resolvedRoot);
      if (!config) {
        return {
          success: false,
          message: 'No workspace configuration found',
          error: 'Configuration not found'
        };
      }
      
      return {
        success: true,
        message: `Found ${config.tools.length} tools in workspace`,
        data: {
          tools: config.tools,
          activeTools: config.tools.filter(t => t.active),
          inactiveTools: config.tools.filter(t => !t.active)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to list tools',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Add tool to workspace
   */
  async addTool(
    tool: VersionedTool,
    version: VersionSpecifier,
    manager: VersionManagerType,
    workspaceRoot: string = process.cwd()
  ): Promise<CLICommandResult> {
    try {
      const result = await this.workspaceService.addTool(tool, version, manager, workspaceRoot);
      
      return {
        success: result.success,
        message: result.message || `Added ${tool} to workspace`,
        data: result,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to add tool',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Remove tool from workspace
   */
  async removeTool(
    tool: VersionedTool,
    workspaceRoot: string = process.cwd()
  ): Promise<CLICommandResult> {
    try {
      const result = await this.workspaceService.removeTool(tool, workspaceRoot);
      
      return {
        success: result.success,
        message: result.message || `Removed ${tool} from workspace`,
        data: result,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to remove tool',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Private helper methods

  /**
   * Create workspace configuration based on options and detection
   */
  private async createWorkspaceConfiguration(
    workspaceRoot: string,
    options: WorkspaceInitOptions,
    detection: WorkspaceDetectionResult
  ): Promise<WorkspaceConfiguration> {
    let config: WorkspaceConfiguration = {
      workspaceRoot,
      name: options.name || detection.workspaceRoot?.split('/').pop() || 'workspace',
      tools: [],
      environment: [],
      pathConfiguration: [],
      shellIntegrations: [],
      projects: [],
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date(),
        platform: process.platform as Platform,
        architecture: process.arch as Architecture
      }
    };

    // Add default tools based on template
    if (options.withDefaults && options.template) {
      const defaultTools = await this.getDefaultToolsForTemplate(options.template);
      config = {
        ...config,
        tools: [...config.tools, ...defaultTools]
      };
    }

    // Add detected tools
    if (detection.detectedTools.length > 0) {
      const newTools: WorkspaceToolConfig[] = [];
      for (const tool of detection.detectedTools) {
        if (!config.tools.find(t => t.tool === tool)) {
          newTools.push({
            tool,
            version: 'latest',
            manager: detection.versionManagers[0] || 'mise',
            active: true
          });
        }
      }
      config = {
        ...config,
        tools: [...config.tools, ...newTools]
      };
    }

    return config;
  }

  /**
   * Get default tools for template
   */
  private async getDefaultToolsForTemplate(template: string): Promise<WorkspaceToolConfig[]> {
    const templates: Record<string, WorkspaceToolConfig[]> = {
      minimal: [],
      web: [
        { tool: 'node', version: 'lts', manager: 'mise', active: true }
      ],
      backend: [
        { tool: 'node', version: 'lts', manager: 'mise', active: true },
        { tool: 'python', version: '3.11', manager: 'mise', active: true }
      ],
      fullstack: [
        { tool: 'node', version: 'lts', manager: 'mise', active: true },
        { tool: 'python', version: '3.11', manager: 'mise', active: true },
        { tool: 'go', version: 'latest', manager: 'mise', active: true }
      ],
      mobile: [
        { tool: 'node', version: 'lts', manager: 'mise', active: true },
        { tool: 'java', version: '17', manager: 'mise', active: true }
      ]
    };

    return templates[template] || [];
  }

  /**
   * Setup git integration
   */
  private async setupGitIntegration(workspaceRoot: string): Promise<void> {
    try {
      // Check if git repository exists
      await access(join(workspaceRoot, '.git'));
      
      // Add gitignore entries
      const gitignorePath = join(workspaceRoot, '.gitignore');
      let gitignoreContent = '';
      
      try {
        gitignoreContent = await readFile(gitignorePath, 'utf-8');
      } catch {
        // File doesn't exist, will be created
      }
      
      // Add HatStart entries if not present
      const entriesToAdd = this.gitIgnoreEntries.filter(
        entry => !gitignoreContent.includes(entry)
      );
      
      if (entriesToAdd.length > 0) {
        const newContent = gitignoreContent + 
          (gitignoreContent.endsWith('\n') ? '' : '\n') +
          '\n# HatStart workspace files\n' +
          entriesToAdd.join('\n') + '\n';
        
        await writeFile(gitignorePath, newContent);
      }
    } catch {
      // Not a git repository or other error - skip git integration
    }
  }

  /**
   * Create team configuration
   */
  private async createTeamConfiguration(
    workspaceRoot: string,
    config: WorkspaceConfiguration
  ): Promise<void> {
    const teamConfig: TeamConfiguration = {
      name: config.name || 'workspace',
      tools: config.tools.map(tool => ({
        tool: tool.tool,
        version: tool.version,
        manager: tool.manager,
        required: true
      })),
      environment: [...config.environment],
      pathConfiguration: [...config.pathConfiguration],
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date(),
        createdBy: process.env.USER || 'unknown'
      }
    };

    const teamConfigPath = join(workspaceRoot, this.teamConfigFileName);
    await writeFile(teamConfigPath, JSON.stringify(teamConfig, null, 2));
  }

  /**
   * Load team configuration
   */
  private async loadTeamConfiguration(workspaceRoot: string): Promise<TeamConfiguration | null> {
    try {
      const teamConfigPath = join(workspaceRoot, this.teamConfigFileName);
      const content = await readFile(teamConfigPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Update configuration selectively
   */
  private async updateConfigurationSelectively(
    config: WorkspaceConfiguration,
    options: WorkspaceUpdateOptions
  ): Promise<WorkspaceConfiguration> {
    let updatedConfig = { ...config };

    // Update tools if specified
    if (options.tools && options.tools.length > 0) {
      // Re-detect tools and update versions
      const detection = await this.workspaceService.detectWorkspace(config.workspaceRoot);
      
      const newTools: WorkspaceToolConfig[] = [];
      for (const tool of options.tools) {
        const existingIndex = updatedConfig.tools.findIndex(t => t.tool === tool);
        if (existingIndex >= 0) {
          // Update existing tool
          const updatedTool = {
            ...updatedConfig.tools[existingIndex],
            version: 'latest' as VersionSpecifier
          };
          newTools.push(updatedTool);
        } else {
          // Add new tool
          newTools.push({
            tool,
            version: 'latest',
            manager: detection.versionManagers[0] || 'mise',
            active: true
          });
        }
      }
      
      // Replace tools array
      updatedConfig = {
        ...updatedConfig,
        tools: [
          ...updatedConfig.tools.filter(t => !options.tools!.includes(t.tool)),
          ...newTools
        ]
      };
    }

    // Update metadata
    updatedConfig = {
      ...updatedConfig,
      metadata: {
        ...updatedConfig.metadata,
        lastUpdated: new Date()
      }
    };

    return updatedConfig;
  }

  /**
   * Pull configuration from team
   */
  private async pullFromTeam(
    localConfig: WorkspaceConfiguration,
    teamConfig: TeamConfiguration | null,
    options: WorkspaceSyncOptions,
    conflicts: string[]
  ): Promise<WorkspaceConfiguration> {
    if (!teamConfig) {
      return localConfig;
    }

    let mergedConfig = { ...localConfig };

    // Merge tools
    const newTools: WorkspaceToolConfig[] = [];
    for (const teamTool of teamConfig.tools || []) {
      const localTool = mergedConfig.tools.find(t => t.tool === teamTool.tool);
      
      if (localTool) {
        if (localTool.version !== teamTool.version) {
          conflicts.push(`Tool ${teamTool.tool}: local=${localTool.version}, team=${teamTool.version}`);
          if (options.conflictResolution === 'remote') {
            newTools.push({
              ...localTool,
              version: teamTool.version
            });
          } else {
            newTools.push(localTool);
          }
        } else {
          newTools.push(localTool);
        }
      } else {
        newTools.push({
          tool: teamTool.tool,
          version: teamTool.version,
          manager: teamTool.manager,
          active: true
        });
      }
    }

    // Add local tools that aren't in team config
    for (const localTool of mergedConfig.tools) {
      if (!teamConfig.tools.find(t => t.tool === localTool.tool)) {
        newTools.push(localTool);
      }
    }

    mergedConfig = {
      ...mergedConfig,
      tools: newTools
    };

    return mergedConfig;
  }

  /**
   * Push configuration to team
   */
  private async pushToTeam(
    localConfig: WorkspaceConfiguration
  ): Promise<WorkspaceConfiguration> {
    // Create or update team configuration
    const updatedTeamConfig: TeamConfiguration = {
      name: localConfig.name || 'workspace',
      tools: localConfig.tools.map(tool => ({
        tool: tool.tool,
        version: tool.version,
        manager: tool.manager,
        required: true
      })),
      environment: [...localConfig.environment],
      pathConfiguration: [...localConfig.pathConfiguration],
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date(),
        updatedBy: process.env.USER || 'unknown'
      }
    };

    // Save team configuration
    const teamConfigPath = join(localConfig.workspaceRoot, this.teamConfigFileName);
    await writeFile(teamConfigPath, JSON.stringify(updatedTeamConfig, null, 2));

    return localConfig;
  }

  /**
   * Bidirectional sync
   */
  private async bidirectionalSync(
    localConfig: WorkspaceConfiguration,
    teamConfig: TeamConfiguration | null,
    options: WorkspaceSyncOptions,
    conflicts: string[]
  ): Promise<WorkspaceConfiguration> {
    // First pull from team
    const pulledConfig = await this.pullFromTeam(localConfig, teamConfig, options, conflicts);
    
    // Then push to team
    return this.pushToTeam(pulledConfig);
  }

  /**
   * Handle sync conflicts
   */
  private async handleSyncConflicts(
    conflicts: string[]
  ): Promise<CLICommandResult> {
    return {
      success: false,
      message: 'Sync conflicts detected',
      data: { conflicts },
      error: `${conflicts.length} conflicts found. Use --force or specify conflict resolution strategy.`
    };
  }

  /**
   * Perform additional validations
   */
  private async performAdditionalValidations(
    workspaceRoot: string,
    config: WorkspaceConfiguration
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Check if workspace root exists
    try {
      await access(workspaceRoot);
    } catch {
      result.errors.push(`Workspace root does not exist: ${workspaceRoot}`);
      result.valid = false;
    }

    // Check tool availability
    for (const tool of config.tools) {
      if (tool.active) {
        try {
          await execAsync(`which ${tool.tool}`, { timeout: 5000 });
        } catch {
          result.warnings.push(`Tool ${tool.tool} is not available in PATH`);
        }
      }
    }

    // Check version manager availability
    const versionManagers = [...new Set(config.tools.map(t => t.manager))];
    for (const manager of versionManagers) {
      try {
        await execAsync(`which ${manager}`, { timeout: 5000 });
      } catch {
        result.warnings.push(`Version manager ${manager} is not available`);
      }
    }

    return result;
  }

  /**
   * Load backup
   */
  private async loadBackup(
    workspaceRoot: string,
    backupId: string
  ): Promise<ConfigurationBackup | null> {
    try {
      const backupPath = join(workspaceRoot, '.hatstart-backups', `${backupId}.json`);
      const content = await readFile(backupPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

/**
 * Factory function to create workspace CLI tools
 */
export function createWorkspaceCLITools(): WorkspaceCLITools {
  return new WorkspaceCLITools();
}



