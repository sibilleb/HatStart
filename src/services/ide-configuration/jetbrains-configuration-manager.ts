/**
 * JetBrains Configuration Manager
 * Handles JetBrains IDE-specific configuration operations
 */

import { homedir } from 'os';
import { join } from 'path';
import { BaseIDEConfigurationManager } from './base-ide-configuration-manager.js';
import type {
    ConfigValue,
    IDEExtension,
    IDEType,
    IDEUserSettings,
    IDEWorkspaceSettings
} from './types.js';

/**
 * JetBrains-specific configuration manager
 */
export class JetBrainsConfigurationManager extends BaseIDEConfigurationManager {
  public readonly ideType: IDEType = 'jetbrains';

  /**
   * Get the command name for JetBrains CLI
   */
  protected getIDECommand(): string {
    // JetBrains IDEs have different command names, default to idea
    return 'idea';
  }

  /**
   * Get the configuration directory path for JetBrains
   */
  protected async getConfigurationDirectory(): Promise<string> {
    const home = homedir();
    
    switch (process.platform) {
      case 'win32':
        return join(home, 'AppData', 'Roaming', 'JetBrains');
      case 'darwin':
        return join(home, 'Library', 'Application Support', 'JetBrains');
      default:
        return join(home, '.config', 'JetBrains');
    }
  }

  /**
   * Get the workspace configuration directory name
   */
  protected getWorkspaceConfigDirectory(): string {
    return '.idea';
  }

  /**
   * Parse extension list output from CLI
   */
  protected parseExtensionList(output: string): IDEExtension[] {
    // JetBrains plugin format is different from VSCode
    const lines = output.trim().split('\n');
    const extensions: IDEExtension[] = [];

    for (const line of lines) {
      if (line.trim()) {
        // JetBrains plugins might have different format
        const parts = line.split(' ');
        if (parts.length >= 2) {
          const id = parts[0];
          const version = parts[1];
          extensions.push({
            id,
            name: id,
            publisher: 'jetbrains',
            version: version || 'unknown'
          });
        }
      }
    }

    return extensions;
  }

  /**
   * Format extension ID for installation command
   */
  protected formatExtensionId(extension: IDEExtension): string {
    return extension.id;
  }

  /**
   * Get extension installation command arguments
   */
  protected getExtensionInstallArgs(extensionId: string): string[] {
    // JetBrains uses different plugin installation approach
    return ['installPlugins', extensionId];
  }

  /**
   * Get extension uninstallation command arguments
   */
  protected getExtensionUninstallArgs(extensionId: string): string[] {
    return ['uninstallPlugins', extensionId];
  }

  /**
   * Convert settings to JetBrains-specific format
   */
  protected convertSettingsFormat(settings: IDEWorkspaceSettings | IDEUserSettings): Record<string, ConfigValue> {
    const result: Record<string, ConfigValue> = {};

    // JetBrains uses XML configuration files, but we'll convert to a simplified format
    // Handle workspace settings
    if ('editor' in settings && settings.editor) {
      Object.assign(result, this.convertToJetBrainsFormat(settings.editor, 'editor'));
    }
    if ('languages' in settings && settings.languages) {
      Object.assign(result, this.convertToJetBrainsFormat(settings.languages, 'languages'));
    }
    if ('extensions' in settings && settings.extensions) {
      Object.assign(result, this.convertToJetBrainsFormat(settings.extensions, 'plugins'));
    }
    if ('debug' in settings && settings.debug) {
      Object.assign(result, this.convertToJetBrainsFormat(settings.debug, 'debug'));
    }
    if ('terminal' in settings && settings.terminal) {
      Object.assign(result, this.convertToJetBrainsFormat(settings.terminal, 'terminal'));
    }
    if ('custom' in settings && settings.custom) {
      Object.assign(result, settings.custom);
    }

    // Handle user settings
    if ('workbench' in settings && settings.workbench) {
      Object.assign(result, this.convertToJetBrainsFormat(settings.workbench, 'ui'));
    }
    if ('files' in settings && settings.files) {
      Object.assign(result, this.convertToJetBrainsFormat(settings.files, 'files'));
    }
    if ('git' in settings && settings.git) {
      Object.assign(result, this.convertToJetBrainsFormat(settings.git, 'vcs'));
    }
    if ('search' in settings && settings.search) {
      Object.assign(result, this.convertToJetBrainsFormat(settings.search, 'search'));
    }

    return result;
  }

  /**
   * Convert from JetBrains format to internal format
   */
  protected convertFromIDEFormat(settings: Record<string, ConfigValue>): IDEWorkspaceSettings {
    const result: IDEWorkspaceSettings = {
      editor: {},
      languages: {},
      extensions: {},
      debug: {},
      terminal: {},
      custom: {}
    };

    // Convert JetBrains settings back to internal format
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('editor.')) {
        result.editor![key] = value;
      } else if (key.startsWith('debug.')) {
        result.debug![key] = value;
      } else if (key.startsWith('terminal.')) {
        result.terminal![key] = value;
      } else if (key.startsWith('plugins.')) {
        result.extensions![key] = value;
      } else if (key.startsWith('languages.')) {
        const language = key.split('.')[1];
        if (!result.languages![language]) {
          result.languages![language] = {};
        }
        result.languages![language][key] = value;
      } else {
        result.custom![key] = value;
      }
    }

    return result;
  }

  /**
   * Get list extension command arguments
   */
  protected getListExtensionsArgs(): string[] {
    return ['listPlugins'];
  }

  /**
   * Convert settings to JetBrains-specific format with namespace
   */
  private convertToJetBrainsFormat(settings: Record<string, ConfigValue>, namespace: string): Record<string, ConfigValue> {
    const result: Record<string, ConfigValue> = {};
    
    for (const [key, value] of Object.entries(settings)) {
      result[`${namespace}.${key}`] = value;
    }
    
    return result;
  }
} 