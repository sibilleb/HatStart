/**
 * Workspace Configuration Service
 * Main service for managing workspace-level configuration and environment
 */

import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { arch, platform } from 'os';
import { dirname, join } from 'path';
import type { Architecture, Platform } from '../../shared/manifest-types.js';
import type {
    VersionedTool,
    VersionManagerType,
    VersionOperationResult,
    VersionSpecifier
} from '../version-manager-types.js';
import { EnvironmentManager } from './environment-manager.js';
import type {
    ConfigurationBackup,
    EnvironmentSyncResult,
    IWorkspaceConfigurationService,
    ValidationResult,
    WorkspaceConfiguration,
    WorkspaceDetectionResult,
    WorkspaceToolConfig
} from './types.js';

/**
 * Workspace configuration service implementation
 */
export class WorkspaceConfigurationService implements IWorkspaceConfigurationService {
  private platform: Platform;
  private architecture: Architecture;
  private environmentManager: EnvironmentManager;
  private configFileName = '.hatstart-workspace.json';

  constructor() {
    this.platform = this.detectPlatform();
    this.architecture = this.detectArchitecture();
    this.environmentManager = new EnvironmentManager();
  }

  /**
   * Detect workspace configuration
   */
  public async detectWorkspace(directory?: string): Promise<WorkspaceDetectionResult> {
    const workspaceRoot = directory || process.cwd();
    const result: WorkspaceDetectionResult = {
      detected: false,
      confidence: 0,
      configFiles: [],
      versionManagers: [],
      detectedTools: [],
    };

    try {
      // Check for common workspace indicators
      const indicators = await this.findWorkspaceIndicators(workspaceRoot);
      
      if (indicators.length > 0) {
        result.detected = true;
        result.workspaceRoot = workspaceRoot;
        result.configFiles = indicators;
        
        // Determine workspace type
        result.workspaceType = this.determineWorkspaceType(indicators);
        
        // Detect version managers
        result.versionManagers = await this.detectVersionManagers(workspaceRoot);
        
        // Detect tools
        result.detectedTools = await this.detectTools(workspaceRoot, indicators);
        
        // Calculate confidence
        result.confidence = this.calculateConfidence(result);
      }

      return result;
    } catch (error) {
      console.warn('Failed to detect workspace:', error);
      return result;
    }
  }

  /**
   * Load workspace configuration
   */
  public async loadConfiguration(workspaceRoot: string): Promise<WorkspaceConfiguration | null> {
    try {
      const configPath = join(workspaceRoot, this.configFileName);
      await access(configPath);
      
      const content = await readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as WorkspaceConfiguration;
      
      // Validate and migrate if necessary
      return this.validateAndMigrateConfig(config);
         } catch {
       // Configuration file doesn't exist or is invalid
       return null;
     }
  }

  /**
   * Save workspace configuration
   */
  public async saveConfiguration(config: WorkspaceConfiguration): Promise<void> {
    const configPath = join(config.workspaceRoot, this.configFileName);
    
    // Update metadata
    config.metadata.lastUpdated = new Date();
    config.metadata.platform = this.platform;
    config.metadata.architecture = this.architecture;
    
    // Ensure directory exists
    await mkdir(dirname(configPath), { recursive: true });
    
    // Save configuration
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Apply workspace configuration
   */
  public async applyConfiguration(config: WorkspaceConfiguration): Promise<EnvironmentSyncResult> {
    const startTime = Date.now();
    const result: EnvironmentSyncResult = {
      success: false,
      changedVariables: [],
      modifiedPaths: [],
      updatedProfiles: [],
      warnings: [],
      duration: 0,
    };

    try {
      // Apply environment variables
      for (const envVar of config.environment) {
        const success = await this.environmentManager.setEnvironmentVariable(
          envVar.name,
          envVar.value,
          envVar.scope,
          envVar.persistent
        );
        
        if (success) {
          result.changedVariables.push(envVar.name);
        } else {
          result.warnings.push(`Failed to set environment variable: ${envVar.name}`);
        }
      }

      // Apply PATH configuration
      if (config.pathConfiguration.length > 0) {
        const pathSuccess = await this.environmentManager.updatePath(config.pathConfiguration);
        if (pathSuccess) {
          result.modifiedPaths = config.pathConfiguration.map(p => p.path);
        } else {
          result.warnings.push('Failed to update PATH configuration');
        }
      }

      // Apply tool-specific configurations
      for (const tool of config.tools) {
        if (tool.active) {
          await this.applyToolConfiguration(tool, result);
        }
      }

      result.success = result.warnings.length === 0 || result.changedVariables.length > 0;
      result.duration = Date.now() - startTime;

      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Synchronize environment with current configuration
   */
  public async synchronizeEnvironment(workspaceRoot?: string): Promise<EnvironmentSyncResult> {
    const root = workspaceRoot || process.cwd();
    const config = await this.loadConfiguration(root);
    
    if (!config) {
      return {
        success: false,
        error: 'No workspace configuration found',
        changedVariables: [],
        modifiedPaths: [],
        updatedProfiles: [],
        warnings: [],
        duration: 0,
      };
    }

    return this.applyConfiguration(config);
  }

  /**
   * Update tool version in workspace
   */
  public async updateToolVersion(
    tool: VersionedTool,
    version: VersionSpecifier,
    manager: VersionManagerType,
    workspaceRoot?: string
  ): Promise<VersionOperationResult> {
    const startTime = Date.now();
    const root = workspaceRoot || process.cwd();

    try {
      let config = await this.loadConfiguration(root);
      
      if (!config) {
        // Create new configuration
        config = await this.createDefaultConfiguration(root);
      }

      // Find existing tool configuration
      const existingToolIndex = config.tools.findIndex(t => t.tool === tool);
      
      if (existingToolIndex >= 0) {
        // Update existing tool
        config.tools[existingToolIndex].version = version;
        config.tools[existingToolIndex].manager = manager;
      } else {
        // Add new tool
        const toolConfig: WorkspaceToolConfig = {
          tool,
          version,
          manager,
          active: true,
        };
        config.tools.push(toolConfig);
      }

      // Save configuration
      await this.saveConfiguration(config);

      // Apply changes
      await this.synchronizeEnvironment(root);

             return {
         success: true,
         operation: 'switch',
         tool,
         version: typeof version === 'string' ? version : `${version.major}.${version.minor || 0}.${version.patch || 0}`,
         message: `Updated ${tool} to version ${version}`,
         duration: Date.now() - startTime,
         timestamp: new Date(),
       };
    } catch (error) {
      return {
        success: false,
        operation: 'switch',
        tool,
        version,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Add tool to workspace
   */
  public async addTool(
    tool: VersionedTool,
    version: VersionSpecifier,
    manager: VersionManagerType,
    workspaceRoot?: string
  ): Promise<VersionOperationResult> {
    return this.updateToolVersion(tool, version, manager, workspaceRoot);
  }

  /**
   * Remove tool from workspace
   */
  public async removeTool(
    tool: VersionedTool,
    workspaceRoot?: string
  ): Promise<VersionOperationResult> {
    const startTime = Date.now();
    const root = workspaceRoot || process.cwd();

    try {
      const config = await this.loadConfiguration(root);
      
      if (!config) {
        return {
          success: false,
          operation: 'remove',
          tool,
          error: 'No workspace configuration found',
          duration: Date.now() - startTime,
        };
      }

      // Remove tool from configuration
      const initialLength = config.tools.length;
      config.tools = config.tools.filter(t => t.tool !== tool);

      if (config.tools.length === initialLength) {
        return {
          success: false,
          operation: 'remove',
          tool,
          error: `Tool ${tool} not found in workspace configuration`,
          duration: Date.now() - startTime,
        };
      }

      // Save configuration
      await this.saveConfiguration(config);

      // Apply changes
      await this.synchronizeEnvironment(root);

      return {
        success: true,
        operation: 'remove',
        tool,
        message: `Removed ${tool} from workspace`,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        operation: 'remove',
        tool,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get current workspace configuration
   */
  public async getCurrentConfiguration(workspaceRoot?: string): Promise<WorkspaceConfiguration | null> {
    const root = workspaceRoot || process.cwd();
    return this.loadConfiguration(root);
  }

  /**
   * Create backup of current configuration
   */
  public async createBackup(
    workspaceRoot: string,
    reason: string
  ): Promise<ConfigurationBackup> {
    const config = await this.loadConfiguration(workspaceRoot);
    
    if (!config) {
      throw new Error('No configuration to backup');
    }

    const timestamp = new Date();
    const backupDir = join(workspaceRoot, '.hatstart', 'backups');
    const backupName = `workspace-${timestamp.toISOString().replace(/[:.]/g, '-')}.json`;
    const backupPath = join(backupDir, backupName);

    // Ensure backup directory exists
    await mkdir(backupDir, { recursive: true });

    // Save backup
    await writeFile(backupPath, JSON.stringify(config, null, 2), 'utf-8');

    return {
      timestamp,
      configuration: config,
      backedUpFiles: [backupPath],
      backupDirectory: backupDir,
      reason,
    };
  }

  /**
   * Restore configuration from backup
   */
  public async restoreBackup(backup: ConfigurationBackup): Promise<EnvironmentSyncResult> {
    // Save current configuration as backup
    await this.createBackup(backup.configuration.workspaceRoot, 'Pre-restore backup');

    // Restore configuration
    await this.saveConfiguration(backup.configuration);

    // Apply restored configuration
    return this.applyConfiguration(backup.configuration);
  }

  /**
   * Validate workspace configuration
   */
  public async validateConfiguration(config: WorkspaceConfiguration): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Validate workspace root
    if (!config.workspaceRoot) {
      result.errors.push('Workspace root is required');
      result.valid = false;
    }

    // Validate tools
    for (const tool of config.tools) {
      if (!tool.tool || !tool.version || !tool.manager) {
        result.errors.push(`Invalid tool configuration: ${JSON.stringify(tool)}`);
        result.valid = false;
      }
    }

    // Validate environment variables
    for (const envVar of config.environment) {
      if (!envVar.name || envVar.value === undefined) {
        result.errors.push(`Invalid environment variable: ${JSON.stringify(envVar)}`);
        result.valid = false;
      }
    }

    // Validate PATH entries
    for (const pathEntry of config.pathConfiguration) {
      if (!pathEntry.path) {
        result.errors.push(`Invalid PATH entry: ${JSON.stringify(pathEntry)}`);
        result.valid = false;
      }
    }

    // Add suggestions
    if (config.tools.length === 0) {
      result.suggestions.push('Consider adding tool configurations to manage versions');
    }

    if (config.environment.length === 0) {
      result.suggestions.push('Consider adding environment variables for better tool integration');
    }

    return result;
  }

  /**
   * Detect platform
   */
  private detectPlatform(): Platform {
    const osPlatform = platform();
    switch (osPlatform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        return 'linux';
    }
  }

  /**
   * Detect architecture
   */
  private detectArchitecture(): Architecture {
    const osArch = arch();
    switch (osArch) {
      case 'x64':
        return 'x64';
      case 'arm64':
        return 'arm64';
      case 'arm':
        return 'arm64'; // Map arm to arm64
      default:
        return 'x64';
    }
  }

  /**
   * Find workspace indicators
   */
  private async findWorkspaceIndicators(directory: string): Promise<string[]> {
    const indicators: string[] = [];
    const commonFiles = [
      'package.json',
      'Cargo.toml',
      'go.mod',
      'requirements.txt',
      'Pipfile',
      'pyproject.toml',
      'pom.xml',
      'build.gradle',
      'Gemfile',
      '.tool-versions',
      '.nvmrc',
      '.python-version',
      '.ruby-version',
      '.git',
      '.gitignore',
      'README.md',
      'LICENSE',
    ];

    for (const file of commonFiles) {
      try {
        const filePath = join(directory, file);
        await access(filePath);
        indicators.push(file);
      } catch {
        // File doesn't exist, continue
      }
    }

    return indicators;
  }

  /**
   * Determine workspace type
   */
  private determineWorkspaceType(indicators: string[]): WorkspaceDetectionResult['workspaceType'] {
    if (indicators.includes('package.json')) return 'npm';
    if (indicators.includes('Cargo.toml')) return 'rust';
    if (indicators.includes('go.mod')) return 'go';
    if (indicators.includes('requirements.txt') || indicators.includes('Pipfile') || indicators.includes('pyproject.toml')) return 'python';
    if (indicators.includes('pom.xml') || indicators.includes('build.gradle')) return 'java';
    if (indicators.includes('.git')) return 'git';
    return 'generic';
  }

  /**
   * Detect version managers
   */
  private async detectVersionManagers(workspaceRoot: string): Promise<VersionManagerType[]> {
    const managers: VersionManagerType[] = [];
    const versionFiles = [
      { file: '.tool-versions', managers: ['mise', 'asdf'] },
      { file: '.nvmrc', managers: ['nvm'] },
      { file: '.python-version', managers: ['pyenv'] },
      { file: '.ruby-version', managers: ['rbenv'] },
    ];

    for (const { file, managers: fileManagers } of versionFiles) {
      try {
        await access(join(workspaceRoot, file));
        managers.push(...fileManagers as VersionManagerType[]);
      } catch {
        // File doesn't exist
      }
    }

    return [...new Set(managers)]; // Remove duplicates
  }

  /**
   * Detect tools
   */
  private async detectTools(workspaceRoot: string, indicators: string[]): Promise<VersionedTool[]> {
    const tools: VersionedTool[] = [];

    // Detect based on files
    if (indicators.includes('package.json')) tools.push('node');
    if (indicators.includes('Cargo.toml')) tools.push('rust');
    if (indicators.includes('go.mod')) tools.push('go');
    if (indicators.includes('requirements.txt') || indicators.includes('Pipfile') || indicators.includes('pyproject.toml')) {
      tools.push('python');
    }
    if (indicators.includes('Gemfile')) tools.push('ruby');

    // Detect from version manager files
    try {
      const toolVersionsPath = join(workspaceRoot, '.tool-versions');
      await access(toolVersionsPath);
      const content = await readFile(toolVersionsPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      
      for (const line of lines) {
        const [tool] = line.split(' ');
        if (tool && this.isValidTool(tool)) {
          tools.push(tool as VersionedTool);
        }
      }
    } catch {
      // File doesn't exist
    }

    return [...new Set(tools)]; // Remove duplicates
  }

  /**
   * Check if tool name is valid
   */
  private isValidTool(tool: string): boolean {
    const validTools = ['node', 'python', 'ruby', 'go', 'rust', 'java', 'php'];
    return validTools.includes(tool);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(result: WorkspaceDetectionResult): number {
    let score = 0;

    // Base score for detection
    if (result.detected) score += 0.3;

    // Score for config files
    score += Math.min(result.configFiles.length * 0.1, 0.3);

    // Score for version managers
    score += Math.min(result.versionManagers.length * 0.15, 0.3);

    // Score for detected tools
    score += Math.min(result.detectedTools.length * 0.05, 0.1);

    return Math.min(score, 1.0);
  }

  /**
   * Validate and migrate configuration
   */
  private async validateAndMigrateConfig(config: WorkspaceConfiguration): Promise<WorkspaceConfiguration> {
    // Ensure metadata exists
    if (!config.metadata) {
      config.metadata = {
        version: '1.0.0',
        lastUpdated: new Date(),
        platform: this.platform,
        architecture: this.architecture,
      };
    }

    // Ensure arrays exist
    config.tools = config.tools || [];
    config.environment = config.environment || [];
    config.pathConfiguration = config.pathConfiguration || [];
    config.shellIntegrations = config.shellIntegrations || [];
    config.projects = config.projects || [];

    return config;
  }

  /**
   * Create default configuration
   */
  private async createDefaultConfiguration(workspaceRoot: string): Promise<WorkspaceConfiguration> {
    const detection = await this.detectWorkspace(workspaceRoot);
    
    return {
      workspaceRoot,
      name: workspaceRoot.split('/').pop() || 'workspace',
      tools: [],
      environment: [],
      pathConfiguration: [],
      shellIntegrations: [],
      projects: [],
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date(),
        platform: this.platform,
        architecture: this.architecture,
      },
    };
  }

  /**
   * Apply tool configuration
   */
  private async applyToolConfiguration(
    tool: WorkspaceToolConfig,
    result: EnvironmentSyncResult
  ): Promise<void> {
    // Apply tool-specific environment variables
    if (tool.environment) {
      for (const [name, value] of Object.entries(tool.environment)) {
        const success = await this.environmentManager.setEnvironmentVariable(
          name,
          value,
          'workspace',
          false
        );
        
        if (success) {
          result.changedVariables.push(name);
        } else {
          result.warnings.push(`Failed to set ${tool.tool} environment variable: ${name}`);
        }
      }
    }

    // Apply tool-specific PATH entries
    if (tool.pathEntries && tool.pathEntries.length > 0) {
      const pathSuccess = await this.environmentManager.updatePath(tool.pathEntries);
      if (pathSuccess) {
        result.modifiedPaths.push(...tool.pathEntries.map(p => p.path));
      } else {
        result.warnings.push(`Failed to update PATH for ${tool.tool}`);
      }
    }
  }
} 