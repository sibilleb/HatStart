/**
 * Base IDE Configuration Manager
 * Abstract base class providing common functionality for IDE configuration managers
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import type {
  ConfigValue,
  IDEConfigurationError,
  IDEConfigurationProfile,
  IDEConfigurationResult,
  IDEConfigurationValidationResult,
  IDEExtension,
  IDELaunchConfiguration,
  IDESnippet,
  IDETask,
  IDEType,
  IDEUserSettings,
  IDEWorkspaceSettings,
  IIDEConfigurationManager
} from './types';

const execAsync = promisify(exec);

/**
 * Abstract base class for IDE configuration managers
 */
export abstract class BaseIDEConfigurationManager implements IIDEConfigurationManager {
  public abstract readonly ideType: IDEType;

  /**
   * Get the command name for the IDE CLI
   */
  protected abstract getIDECommand(): string;

  /**
   * Get the configuration directory path for the IDE
   */
  protected abstract getConfigurationDirectory(): Promise<string>;

  /**
   * Get the workspace configuration directory name (e.g., '.vscode')
   */
  protected abstract getWorkspaceConfigDirectory(): string;

  /**
   * Parse extension list output from CLI
   */
  protected abstract parseExtensionList(output: string): IDEExtension[];

  /**
   * Format extension ID for installation command
   */
  protected abstract formatExtensionId(extension: IDEExtension): string;

  /**
   * Get extension installation command arguments
   */
  protected abstract getExtensionInstallArgs(extensionId: string): string[];

  /**
   * Get extension uninstallation command arguments
   */
  protected abstract getExtensionUninstallArgs(extensionId: string): string[];

  /**
   * Convert settings to IDE-specific format
   */
  protected abstract convertSettingsFormat(settings: IDEWorkspaceSettings | IDEUserSettings): Record<string, ConfigValue>;

  /**
   * Check if the IDE is installed and available
   */
  public async isIDEAvailable(): Promise<boolean> {
    try {
      const command = this.getIDECommand();
      await execAsync(`${command} --version`, { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the IDE version
   */
  public async getIDEVersion(): Promise<string | null> {
    try {
      const command = this.getIDECommand();
      const { stdout } = await execAsync(`${command} --version`, { timeout: 10000 });
      return this.parseVersionFromOutput(stdout.trim());
    } catch {
      return null;
    }
  }

  /**
   * Install extensions
   */
  public async installExtensions(extensions: IDEExtension[]): Promise<IDEConfigurationResult> {
    const result: IDEConfigurationResult = {
      success: true,
      warnings: [],
      configured: { extensions: [] }
    };

    if (!await this.isIDEAvailable()) {
      return {
        success: false,
        error: `${this.ideType} is not installed or not available in PATH`
      };
    }

    const command = this.getIDECommand();
    const installedExtensions: string[] = [];
    const warnings: string[] = [];

    for (const extension of extensions) {
      try {
        const extensionId = this.formatExtensionId(extension);
        const args = this.getExtensionInstallArgs(extensionId);
        
        await execAsync(`${command} ${args.join(' ')}`, { timeout: 60000 });
        installedExtensions.push(extensionId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (extension.required) {
          result.success = false;
          result.error = `Failed to install required extension ${extension.id}: ${errorMessage}`;
          break;
        } else {
          warnings.push(`Failed to install optional extension ${extension.id}: ${errorMessage}`);
        }
      }
    }

    result.configured!.extensions = installedExtensions;
    result.warnings = warnings;

    return result;
  }

  /**
   * Uninstall extensions
   */
  public async uninstallExtensions(extensionIds: string[]): Promise<IDEConfigurationResult> {
    const result: IDEConfigurationResult = {
      success: true,
      warnings: [],
      configured: { extensions: [] }
    };

    if (!await this.isIDEAvailable()) {
      return {
        success: false,
        error: `${this.ideType} is not installed or not available in PATH`
      };
    }

    const command = this.getIDECommand();
    const uninstalledExtensions: string[] = [];
    const warnings: string[] = [];

    for (const extensionId of extensionIds) {
      try {
        const args = this.getExtensionUninstallArgs(extensionId);
        await execAsync(`${command} ${args.join(' ')}`, { timeout: 60000 });
        uninstalledExtensions.push(extensionId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        warnings.push(`Failed to uninstall extension ${extensionId}: ${errorMessage}`);
      }
    }

    result.configured!.extensions = uninstalledExtensions;
    result.warnings = warnings;

    return result;
  }

  /**
   * List installed extensions
   */
  public async listInstalledExtensions(): Promise<IDEExtension[]> {
    try {
      if (!await this.isIDEAvailable()) {
        return [];
      }

      const command = this.getIDECommand();
      const { stdout } = await execAsync(`${command} --list-extensions --show-versions`, { timeout: 30000 });
      return this.parseExtensionList(stdout);
    } catch {
      return [];
    }
  }

  /**
   * Apply workspace settings
   */
  public async applyWorkspaceSettings(workspaceRoot: string, settings: IDEWorkspaceSettings): Promise<IDEConfigurationResult> {
    try {
      const workspaceConfigDir = join(workspaceRoot, this.getWorkspaceConfigDirectory());
      await this.ensureDirectoryExists(workspaceConfigDir);

      const settingsPath = join(workspaceConfigDir, 'settings.json');
      const convertedSettings = this.convertSettingsFormat(settings);

      // Merge with existing settings if they exist
      let existingSettings = {};
      try {
        const existingContent = await fs.readFile(settingsPath, 'utf-8');
        existingSettings = JSON.parse(existingContent);
      } catch {
        // File doesn't exist or is invalid, start fresh
      }

      const mergedSettings = { ...existingSettings, ...convertedSettings };
      await fs.writeFile(settingsPath, JSON.stringify(mergedSettings, null, 2), 'utf-8');

      return {
        success: true,
        configured: {
          settings: Object.keys(convertedSettings),
          files: [settingsPath]
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to apply workspace settings: ${errorMessage}`
      };
    }
  }

  /**
   * Apply user settings
   */
  public async applyUserSettings(settings: IDEUserSettings): Promise<IDEConfigurationResult> {
    try {
      const configDir = await this.getConfigurationDirectory();
      await this.ensureDirectoryExists(configDir);

      const settingsPath = join(configDir, 'settings.json');
      const convertedSettings = this.convertSettingsFormat(settings);

      // Merge with existing settings if they exist
      let existingSettings = {};
      try {
        const existingContent = await fs.readFile(settingsPath, 'utf-8');
        existingSettings = JSON.parse(existingContent);
      } catch {
        // File doesn't exist or is invalid, start fresh
      }

      const mergedSettings = { ...existingSettings, ...convertedSettings };
      await fs.writeFile(settingsPath, JSON.stringify(mergedSettings, null, 2), 'utf-8');

      return {
        success: true,
        configured: {
          settings: Object.keys(convertedSettings),
          files: [settingsPath]
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to apply user settings: ${errorMessage}`
      };
    }
  }

  /**
   * Create workspace configuration files
   */
  public async createWorkspaceConfiguration(workspaceRoot: string, profile: IDEConfigurationProfile): Promise<IDEConfigurationResult> {
    const results: IDEConfigurationResult[] = [];

    // Apply workspace settings
    if (Object.keys(profile.workspaceSettings).length > 0) {
      const settingsResult = await this.applyWorkspaceSettings(workspaceRoot, profile.workspaceSettings);
      results.push(settingsResult);
    }

    // Create extensions.json if extensions are specified
    if (profile.extensions.length > 0) {
      const extensionsResult = await this.createExtensionsConfiguration(workspaceRoot, profile.extensions);
      results.push(extensionsResult);
    }

    // Create tasks.json if tasks are specified
    if (profile.tasks && profile.tasks.length > 0) {
      const tasksResult = await this.createTasksConfiguration(workspaceRoot, profile.tasks);
      results.push(tasksResult);
    }

    // Create launch.json if launch configurations are specified
    if (profile.launchConfigurations && profile.launchConfigurations.length > 0) {
      const launchResult = await this.createLaunchConfiguration(workspaceRoot, profile.launchConfigurations);
      results.push(launchResult);
    }

    // Create snippets if specified
    if (profile.snippets) {
      const snippetsResult = await this.createSnippetsConfiguration(workspaceRoot, profile.snippets);
      results.push(snippetsResult);
    }

    // Combine results
    const combinedResult: IDEConfigurationResult = {
      success: results.every(r => r.success),
      warnings: results.flatMap(r => r.warnings || []),
      configured: {
        extensions: results.flatMap(r => r.configured?.extensions || []),
        settings: results.flatMap(r => r.configured?.settings || []),
        files: results.flatMap(r => r.configured?.files || [])
      }
    };

    if (!combinedResult.success) {
      combinedResult.error = results.find(r => !r.success)?.error || 'Unknown error occurred';
    }

    return combinedResult;
  }

  /**
   * Validate configuration
   */
  public async validateConfiguration(profile: IDEConfigurationProfile): Promise<IDEConfigurationResult> {
    const validationResult = await this.validateConfigurationProfile(profile);
    
    return {
      success: validationResult.isValid,
      error: validationResult.errors.length > 0 ? validationResult.errors[0].message : undefined,
      warnings: validationResult.warnings.map(w => w.message)
    };
  }

  /**
   * Get current workspace settings
   */
  public async getCurrentWorkspaceSettings(workspaceRoot: string): Promise<IDEWorkspaceSettings | null> {
    try {
      const settingsPath = join(workspaceRoot, this.getWorkspaceConfigDirectory(), 'settings.json');
      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      return this.convertFromIDEFormat(settings);
    } catch {
      return null;
    }
  }

  /**
   * Get current user settings
   */
  public async getCurrentUserSettings(): Promise<IDEUserSettings | null> {
    try {
      const configDir = await this.getConfigurationDirectory();
      const settingsPath = join(configDir, 'settings.json');
      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      return this.convertFromIDEFormat(settings);
    } catch {
      return null;
    }
  }

  // Protected helper methods

  /**
   * Parse version from command output
   */
  protected parseVersionFromOutput(output: string): string | null {
    const lines = output.split('\n');
    const versionLine = lines[0];
    const versionMatch = versionLine.match(/(\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[1] : null;
  }

  /**
   * Ensure directory exists
   */
  protected async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Create extensions configuration file
   */
  protected async createExtensionsConfiguration(workspaceRoot: string, extensions: IDEExtension[]): Promise<IDEConfigurationResult> {
    try {
      const workspaceConfigDir = join(workspaceRoot, this.getWorkspaceConfigDirectory());
      await this.ensureDirectoryExists(workspaceConfigDir);

      const extensionsPath = join(workspaceConfigDir, 'extensions.json');
      const extensionsConfig = {
        recommendations: extensions.filter(ext => !ext.required).map(ext => ext.id),
        unwantedRecommendations: []
      };

      await fs.writeFile(extensionsPath, JSON.stringify(extensionsConfig, null, 2), 'utf-8');

      return {
        success: true,
        configured: {
          extensions: extensions.map(ext => ext.id),
          files: [extensionsPath]
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to create extensions configuration: ${errorMessage}`
      };
    }
  }

  /**
   * Create tasks configuration file
   */
  protected async createTasksConfiguration(workspaceRoot: string, tasks: IDETask[]): Promise<IDEConfigurationResult> {
    try {
      const workspaceConfigDir = join(workspaceRoot, this.getWorkspaceConfigDirectory());
      await this.ensureDirectoryExists(workspaceConfigDir);

      const tasksPath = join(workspaceConfigDir, 'tasks.json');
      const tasksConfig = {
        version: '2.0.0',
        tasks: tasks
      };

      await fs.writeFile(tasksPath, JSON.stringify(tasksConfig, null, 2), 'utf-8');

      return {
        success: true,
        configured: {
          files: [tasksPath]
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to create tasks configuration: ${errorMessage}`
      };
    }
  }

  /**
   * Create launch configuration file
   */
  protected async createLaunchConfiguration(workspaceRoot: string, configurations: IDELaunchConfiguration[]): Promise<IDEConfigurationResult> {
    try {
      const workspaceConfigDir = join(workspaceRoot, this.getWorkspaceConfigDirectory());
      await this.ensureDirectoryExists(workspaceConfigDir);

      const launchPath = join(workspaceConfigDir, 'launch.json');
      const launchConfig = {
        version: '0.2.0',
        configurations: configurations
      };

      await fs.writeFile(launchPath, JSON.stringify(launchConfig, null, 2), 'utf-8');

      return {
        success: true,
        configured: {
          files: [launchPath]
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to create launch configuration: ${errorMessage}`
      };
    }
  }

  /**
   * Create snippets configuration
   */
  protected async createSnippetsConfiguration(workspaceRoot: string, snippets: Record<string, IDESnippet[]>): Promise<IDEConfigurationResult> {
    try {
      const workspaceConfigDir = join(workspaceRoot, this.getWorkspaceConfigDirectory());
      const snippetsDir = join(workspaceConfigDir, 'snippets');
      await this.ensureDirectoryExists(snippetsDir);

      const createdFiles: string[] = [];

      for (const [language, languageSnippets] of Object.entries(snippets)) {
        const snippetsPath = join(snippetsDir, `${language}.json`);
        const snippetsConfig: Record<string, {
          prefix: string;
          body: string[];
          description: string;
        }> = {};

        for (const snippet of languageSnippets) {
          snippetsConfig[snippet.name] = {
            prefix: snippet.prefix,
            body: snippet.body,
            description: snippet.description || snippet.name
          };
        }

        await fs.writeFile(snippetsPath, JSON.stringify(snippetsConfig, null, 2), 'utf-8');
        createdFiles.push(snippetsPath);
      }

      return {
        success: true,
        configured: {
          files: createdFiles
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to create snippets configuration: ${errorMessage}`
      };
    }
  }

  /**
   * Validate configuration profile
   */
  protected async validateConfigurationProfile(profile: IDEConfigurationProfile): Promise<IDEConfigurationValidationResult> {
    const errors: IDEConfigurationError[] = [];
    const warnings: IDEConfigurationError[] = [];

    // Validate profile structure
    if (!profile.name || profile.name.trim() === '') {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Profile name is required',
        path: 'name',
        severity: 'error'
      });
    }

    if (profile.ideType !== this.ideType) {
      errors.push({
        code: 'INVALID_IDE_TYPE',
        message: `Profile IDE type '${profile.ideType}' does not match manager type '${this.ideType}'`,
        path: 'ideType',
        severity: 'error'
      });
    }

    // Validate extensions
    for (let i = 0; i < profile.extensions.length; i++) {
      const extension = profile.extensions[i];
      if (!extension.id || extension.id.trim() === '') {
        errors.push({
          code: 'MISSING_EXTENSION_ID',
          message: 'Extension ID is required',
          path: `extensions[${i}].id`,
          severity: 'error'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convert from IDE-specific format to our format
   */
  protected convertFromIDEFormat(settings: Record<string, ConfigValue>): IDEWorkspaceSettings {
    // Default implementation - subclasses should override for IDE-specific conversion
    return {
      custom: settings
    };
  }
} 