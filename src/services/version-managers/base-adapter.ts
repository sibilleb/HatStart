/**
 * Base Version Manager Adapter
 * Provides common functionality for all version manager implementations
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { Architecture, Platform } from '../../shared/manifest-types.js';
import type {
    IVersionManager,
    ProjectVersionConfig,
    VersionedTool,
    VersionInfo,
    VersionInstallOptions,
    VersionManagerCapabilities,
    VersionManagerConfig,
    VersionManagerStatus,
    VersionManagerType,
    VersionOperationResult,
    VersionSpecifier,
} from '../version-manager-types.js';

/**
 * Base adapter for version managers
 * Provides common functionality and abstract methods for specific implementations
 */
export abstract class BaseVersionManagerAdapter implements IVersionManager {
  public abstract readonly type: VersionManagerType;
  public abstract readonly capabilities: VersionManagerCapabilities;
  
  protected _status: VersionManagerStatus = 'not_installed';
  protected platform: Platform;
  protected architecture: Architecture;
  protected homeDir: string;
  protected shellType: string;

  constructor(platform: Platform, architecture: Architecture) {
    this.platform = platform;
    this.architecture = architecture;
    this.homeDir = os.homedir();
    this.shellType = this.detectShellType();
  }

  public get status(): VersionManagerStatus {
    return this._status;
  }

  /**
   * Initialize the version manager
   */
  public async initialize(): Promise<void> {
    try {
      // Check if installed
      const isInstalled = await this.isAvailable();
      
      if (isInstalled) {
        // Check if configured
        const isConfigured = await this.checkConfiguration();
        this._status = isConfigured ? 'configured' : 'installed';
        
        // Try to activate
        if (isConfigured) {
          const isActive = await this.checkIfActive();
          if (isActive) {
            this._status = 'active';
          }
        }
      } else {
        this._status = 'not_installed';
      }
    } catch (error) {
      this._status = 'error';
      throw error;
    }
  }

  /**
   * Check if the version manager is installed and configured
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const versionCommand = this.getVersionCommand();
      const result = await this.executeCommand(versionCommand.command, versionCommand.args);
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Install the version manager itself
   */
  public abstract installManager(): Promise<VersionOperationResult>;

  /**
   * Configure the version manager (shell integration, etc.)
   */
  public async configure(config: Partial<VersionManagerConfig>): Promise<VersionOperationResult> {
    const startTime = Date.now();
    
    try {
      // Update configuration
      const currentConfig = await this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      
      // Apply shell integration if needed
      if (config.shellIntegration !== undefined) {
        await this.updateShellIntegration(config.shellIntegration);
      }
      
      // Apply environment variables
      if (config.environment) {
        await this.updateEnvironmentVariables(config.environment);
      }
      
      // Save configuration
      await this.saveConfig(newConfig);
      
      return this.createSuccessResult('configure', undefined, 'Configuration updated successfully', startTime);
    } catch (error) {
      return this.createErrorResult('configure', undefined, error, startTime);
    }
  }

  /**
   * List installed versions for a tool
   */
  public async listInstalled(tool: VersionedTool): Promise<VersionInfo[]> {
    const command = this.getListInstalledCommand(tool);
    const result = await this.executeCommand(command.command, command.args);
    
    if (!result.success) {
      throw new Error(`Failed to list installed versions: ${result.stderr}`);
    }
    
    return this.parseInstalledVersions(tool, result.stdout);
  }

  /**
   * List available versions for a tool (remote)
   */
  public async listAvailable(tool: VersionedTool): Promise<VersionInfo[]> {
    if (!this.capabilities.supportsRemoteList) {
      throw new Error(`${this.type} does not support listing remote versions`);
    }
    
    const command = this.getListAvailableCommand(tool);
    const result = await this.executeCommand(command.command, command.args);
    
    if (!result.success) {
      throw new Error(`Failed to list available versions: ${result.stderr}`);
    }
    
    return this.parseAvailableVersions(tool, result.stdout);
  }

  /**
   * Get currently active version for a tool
   */
  public async getCurrentVersion(tool: VersionedTool): Promise<VersionInfo | null> {
    const command = this.getCurrentVersionCommand(tool);
    const result = await this.executeCommand(command.command, command.args);
    
    if (!result.success) {
      return null;
    }
    
    return this.parseCurrentVersion(tool, result.stdout);
  }

  /**
   * Install a specific version of a tool
   */
  public async installVersion(
    tool: VersionedTool,
    version: VersionSpecifier,
    options?: VersionInstallOptions
  ): Promise<VersionOperationResult> {
    const startTime = Date.now();
    
    try {
      // Resolve version specifier
      const resolvedVersion = await this.resolveVersionSpecifier(tool, version);
      
      // Check if already installed
      if (!options?.force) {
        const installed = await this.listInstalled(tool);
        if (installed.some(v => v.version === resolvedVersion)) {
          return this.createSuccessResult(
            'install',
            tool,
            `Version ${resolvedVersion} is already installed`,
            startTime,
            resolvedVersion
          );
        }
      }
      
      // Execute installation
      const command = this.getInstallCommand(tool, resolvedVersion);
      const result = await this.executeCommand(
        command.command,
        command.args,
        {
          timeout: options?.timeout,
          environment: options?.environment,
          onProgress: (data) => {
            if (options?.onProgress) {
              options.onProgress({
                tool,
                version: resolvedVersion,
                step: 'Installing',
                percentage: 50, // Simple progress for now
                details: data
              });
            }
          }
        }
      );
      
      if (!result.success) {
        throw new Error(result.stderr || 'Installation failed');
      }
      
      // Verify installation
      if (!options?.skipVerification) {
        const installed = await this.listInstalled(tool);
        if (!installed.some(v => v.version === resolvedVersion)) {
          throw new Error('Installation verification failed');
        }
      }
      
      return this.createSuccessResult(
        'install',
        tool,
        `Successfully installed ${tool} version ${resolvedVersion}`,
        startTime,
        resolvedVersion
      );
    } catch (error) {
      return this.createErrorResult('install', tool, error, startTime);
    }
  }

  /**
   * Uninstall a specific version of a tool
   */
  public async uninstallVersion(
    tool: VersionedTool,
    version: string
  ): Promise<VersionOperationResult> {
    const startTime = Date.now();
    
    try {
      if (!this.capabilities.canUninstall) {
        throw new Error(`${this.type} does not support uninstalling versions`);
      }
      
      const command = this.getUninstallCommand(tool, version);
      const result = await this.executeCommand(command.command, command.args);
      
      if (!result.success) {
        throw new Error(result.stderr || 'Uninstallation failed');
      }
      
      return this.createSuccessResult(
        'uninstall',
        tool,
        `Successfully uninstalled ${tool} version ${version}`,
        startTime,
        version
      );
    } catch (error) {
      return this.createErrorResult('uninstall', tool, error, startTime);
    }
  }

  /**
   * Switch to a specific version of a tool
   */
  public async switchVersion(
    tool: VersionedTool,
    version: string,
    scope: 'global' | 'local' | 'shell' = 'global'
  ): Promise<VersionOperationResult> {
    const startTime = Date.now();
    
    try {
      // Check if scope is supported
      if (scope === 'global' && !this.capabilities.supportsGlobal) {
        throw new Error(`${this.type} does not support global version setting`);
      }
      if (scope === 'local' && !this.capabilities.supportsLocal) {
        throw new Error(`${this.type} does not support local version setting`);
      }
      if (scope === 'shell' && !this.capabilities.supportsShell) {
        throw new Error(`${this.type} does not support shell-specific version setting`);
      }
      
      const command = this.getSwitchCommand(tool, version, scope);
      const result = await this.executeCommand(command.command, command.args);
      
      if (!result.success) {
        throw new Error(result.stderr || 'Version switch failed');
      }
      
      return this.createSuccessResult(
        'switch',
        tool,
        `Successfully switched ${tool} to version ${version} (${scope})`,
        startTime,
        version
      );
    } catch (error) {
      return this.createErrorResult('switch', tool, error, startTime);
    }
  }

  /**
   * Set global default version for a tool
   */
  public async setGlobalVersion(
    tool: VersionedTool,
    version: string
  ): Promise<VersionOperationResult> {
    return this.switchVersion(tool, version, 'global');
  }

  /**
   * Set local (project) version for a tool
   */
  public async setLocalVersion(
    tool: VersionedTool,
    version: string,
    projectRoot?: string
  ): Promise<VersionOperationResult> {
    const startTime = Date.now();
    
    try {
      const root = projectRoot || process.cwd();
      const originalCwd = process.cwd();
      
      // Change to project directory
      process.chdir(root);
      
      try {
        const result = await this.switchVersion(tool, version, 'local');
        return result;
      } finally {
        // Restore original directory
        process.chdir(originalCwd);
      }
    } catch (error) {
      return this.createErrorResult('local', tool, error, startTime);
    }
  }

  /**
   * Get project version configuration
   */
  public async getProjectConfig(projectRoot?: string): Promise<ProjectVersionConfig | null> {
    const root = projectRoot || process.cwd();
    const configFile = await this.findProjectConfigFile(root);
    
    if (!configFile) {
      return null;
    }
    
    const content = await fs.readFile(configFile, 'utf-8');
    const versions = this.parseProjectConfig(content);
    
    return {
      projectRoot: root,
      versions,
      configFile,
      inherited: configFile !== path.join(root, this.getProjectConfigFileName())
    };
  }

  /**
   * Set project version configuration
   */
  public async setProjectConfig(
    config: ProjectVersionConfig
  ): Promise<VersionOperationResult> {
    const startTime = Date.now();
    
    try {
      const configFile = config.configFile || 
        path.join(config.projectRoot, this.getProjectConfigFileName());
      
      const content = this.formatProjectConfig(config.versions);
      await fs.writeFile(configFile, content, 'utf-8');
      
      return this.createSuccessResult(
        'local',
        undefined,
        'Project configuration updated successfully',
        startTime
      );
    } catch (error) {
      return this.createErrorResult('local', undefined, error, startTime);
    }
  }

  /**
   * Refresh environment (reload shell integration)
   */
  public async refreshEnvironment(): Promise<VersionOperationResult> {
    const startTime = Date.now();
    
    try {
      const initCommand = this.getInitCommand();
      const result = await this.executeCommand(initCommand.command, initCommand.args);
      
      if (!result.success) {
        throw new Error('Failed to refresh environment');
      }
      
      return this.createSuccessResult(
        'shell',
        undefined,
        'Environment refreshed successfully',
        startTime
      );
    } catch (error) {
      return this.createErrorResult('shell', undefined, error, startTime);
    }
  }

  /**
   * Get version manager configuration
   */
  public async getConfig(): Promise<VersionManagerConfig> {
    const configPath = await this.getConfigPath();
    const globalVersions: Record<VersionedTool, string> = {} as any;
    
    // Get global versions for supported tools
    for (const tool of this.capabilities.supportedTools) {
      const current = await this.getCurrentVersion(tool);
      if (current) {
        globalVersions[tool] = current.version;
      }
    }
    
    return {
      type: this.type,
      installationPath: await this.getInstallationPath(),
      configPath,
      shellIntegration: await this.checkShellIntegration(),
      autoSwitch: await this.checkAutoSwitch(),
      globalVersions,
      environment: await this.getEnvironmentVariables(),
      options: await this.getAdditionalOptions()
    };
  }

  /**
   * Update version manager configuration
   */
  public async updateConfig(config: Partial<VersionManagerConfig>): Promise<VersionOperationResult> {
    return this.configure(config);
  }

  // Abstract methods that must be implemented by specific adapters
  protected abstract getVersionCommand(): { command: string; args: string[] };
  protected abstract getListInstalledCommand(tool: VersionedTool): { command: string; args: string[] };
  protected abstract getListAvailableCommand(tool: VersionedTool): { command: string; args: string[] };
  protected abstract getCurrentVersionCommand(tool: VersionedTool): { command: string; args: string[] };
  protected abstract getInstallCommand(tool: VersionedTool, version: string): { command: string; args: string[] };
  protected abstract getUninstallCommand(tool: VersionedTool, version: string): { command: string; args: string[] };
  protected abstract getSwitchCommand(tool: VersionedTool, version: string, scope: 'global' | 'local' | 'shell'): { command: string; args: string[] };
  protected abstract getInitCommand(): { command: string; args: string[] };
  protected abstract parseInstalledVersions(tool: VersionedTool, output: string): VersionInfo[];
  protected abstract parseAvailableVersions(tool: VersionedTool, output: string): VersionInfo[];
  protected abstract parseCurrentVersion(tool: VersionedTool, output: string): VersionInfo | null;
  protected abstract getProjectConfigFileName(): string;
  protected abstract parseProjectConfig(content: string): Record<VersionedTool, VersionSpecifier>;
  protected abstract formatProjectConfig(versions: Record<VersionedTool, VersionSpecifier>): string;
  protected abstract getInstallationPath(): Promise<string | undefined>;
  protected abstract getConfigPath(): Promise<string | undefined>;

  // Helper methods
  protected async executeCommand(
    command: string,
    args: string[] = [],
    options: {
      timeout?: number;
      environment?: Record<string, string>;
      workingDirectory?: string;
      onProgress?: (data: string) => void;
    } = {}
  ): Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    try {
      const fullCommand = `${command} ${args.join(' ')}`;
      const execOptions = {
        timeout: options.timeout || 30000,
        env: { ...process.env, ...options.environment },
        cwd: options.workingDirectory
      };
      
      const { stdout, stderr } = await execAsync(fullCommand, execOptions);
      
      if (options.onProgress && stdout) {
        options.onProgress(stdout);
      }
      
      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    } catch (error: any) {
      return {
        success: false,
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || error.message,
        exitCode: error.code || 1
      };
    }
  }

  protected createSuccessResult(
    operation: VersionOperationResult['operation'],
    tool?: VersionedTool,
    message: string = 'Operation completed successfully',
    startTime: number = Date.now(),
    version?: string
  ): VersionOperationResult {
    return {
      success: true,
      operation,
      tool: tool || ('' as VersionedTool),
      version,
      message,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }

  protected createErrorResult(
    operation: VersionOperationResult['operation'],
    tool?: VersionedTool,
    error: unknown,
    startTime: number = Date.now()
  ): VersionOperationResult {
    return {
      success: false,
      operation,
      tool: tool || ('' as VersionedTool),
      message: `Operation failed: ${operation}`,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }

  protected detectShellType(): string {
    if (this.platform === 'windows') {
      return 'powershell';
    }
    
    const shell = process.env.SHELL || '';
    if (shell.includes('zsh')) return 'zsh';
    if (shell.includes('bash')) return 'bash';
    if (shell.includes('fish')) return 'fish';
    
    return 'bash'; // Default
  }

  protected async checkConfiguration(): Promise<boolean> {
    // Check if shell integration is set up
    return this.checkShellIntegration();
  }

  protected async checkIfActive(): Promise<boolean> {
    // Try to get version of any supported tool
    for (const tool of this.capabilities.supportedTools) {
      const version = await this.getCurrentVersion(tool);
      if (version) {
        return true;
      }
    }
    return false;
  }

  protected async checkShellIntegration(): Promise<boolean> {
    const profileFile = await this.getShellProfileFile();
    if (!profileFile) return false;
    
    try {
      const content = await fs.readFile(profileFile, 'utf-8');
      return content.includes(this.type);
    } catch {
      return false;
    }
  }

  protected async checkAutoSwitch(): Promise<boolean> {
    // Default implementation - can be overridden
    return false;
  }

  protected async getEnvironmentVariables(): Promise<Record<string, string>> {
    // Default implementation - can be overridden
    return {};
  }

  protected async getAdditionalOptions(): Promise<Record<string, unknown>> {
    // Default implementation - can be overridden
    return {};
  }

  protected async updateShellIntegration(enabled: boolean): Promise<void> {
    const profileFile = await this.getShellProfileFile();
    if (!profileFile) return;
    
    const initCommand = this.getInitCommand();
    const initLine = `${initCommand.command} ${initCommand.args.join(' ')}`;
    
    try {
      let content = await fs.readFile(profileFile, 'utf-8');
      
      if (enabled && !content.includes(initLine)) {
        content += `\n# ${this.type} initialization\n${initLine}\n`;
        await fs.writeFile(profileFile, content, 'utf-8');
      } else if (!enabled && content.includes(initLine)) {
        content = content.replace(new RegExp(`.*${initLine}.*\n`, 'g'), '');
        await fs.writeFile(profileFile, content, 'utf-8');
      }
    } catch (error) {
      // Profile file might not exist yet
      if (enabled) {
        await fs.writeFile(profileFile, `# ${this.type} initialization\n${initLine}\n`, 'utf-8');
      }
    }
  }

  protected async updateEnvironmentVariables(vars: Record<string, string>): Promise<void> {
    // Platform-specific implementation needed
    // For now, just update process.env
    Object.assign(process.env, vars);
  }

  protected async saveConfig(config: VersionManagerConfig): Promise<void> {
    // Default implementation - can be overridden
    // Most version managers don't have a unified config file
  }

  protected async getShellProfileFile(): Promise<string | null> {
    const home = this.homeDir;
    
    switch (this.shellType) {
      case 'zsh':
        return path.join(home, '.zshrc');
      case 'bash':
        // Check for .bashrc first, then .bash_profile
        const bashrc = path.join(home, '.bashrc');
        const bashProfile = path.join(home, '.bash_profile');
        try {
          await fs.access(bashrc);
          return bashrc;
        } catch {
          return bashProfile;
        }
      case 'fish':
        return path.join(home, '.config', 'fish', 'config.fish');
      case 'powershell':
        return path.join(home, 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1');
      default:
        return null;
    }
  }

  protected async findProjectConfigFile(projectRoot: string): Promise<string | null> {
    const configFileName = this.getProjectConfigFileName();
    let currentDir = projectRoot;
    
    while (currentDir !== path.dirname(currentDir)) {
      const configPath = path.join(currentDir, configFileName);
      try {
        await fs.access(configPath);
        return configPath;
      } catch {
        // Continue searching up the directory tree
      }
      currentDir = path.dirname(currentDir);
    }
    
    return null;
  }

  protected async resolveVersionSpecifier(
    tool: VersionedTool,
    version: VersionSpecifier
  ): Promise<string> {
    if (typeof version === 'string') {
      if (version === 'latest') {
        const available = await this.listAvailable(tool);
        const stable = available.filter(v => !v.isPrerelease);
        if (stable.length === 0) {
          throw new Error('No stable versions available');
        }
        return stable[0].version;
      } else if (version === 'lts' && this.capabilities.supportsLTS) {
        const available = await this.listAvailable(tool);
        const lts = available.filter(v => v.isLTS);
        if (lts.length === 0) {
          throw new Error('No LTS versions available');
        }
        return lts[0].version;
      } else if (version === 'system') {
        return 'system';
      }
      return version;
    } else {
      // Semantic version matching
      const available = await this.listAvailable(tool);
      const matching = available.filter(v => {
        const parts = v.version.split('.');
        const major = parseInt(parts[0]);
        const minor = parseInt(parts[1] || '0');
        const patch = parseInt(parts[2] || '0');
        
        if (version.major !== undefined && major !== version.major) return false;
        if (version.minor !== undefined && minor !== version.minor) return false;
        if (version.patch !== undefined && patch !== version.patch) return false;
        if (version.prerelease && !v.version.includes(version.prerelease)) return false;
        
        return true;
      });
      
      if (matching.length === 0) {
        throw new Error('No matching versions found');
      }
      
      return matching[0].version;
    }
  }
} 