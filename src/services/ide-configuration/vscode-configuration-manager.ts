/**
 * VSCode Configuration Manager
 * Handles VSCode-specific IDE configuration operations
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
 * VSCode-specific configuration manager
 */
export class VSCodeConfigurationManager extends BaseIDEConfigurationManager {
  public readonly ideType: IDEType = 'vscode';

  /**
   * Get the command name for VSCode CLI
   */
  protected getIDECommand(): string {
    return 'code';
  }

  /**
   * Get the configuration directory path for VSCode
   */
  protected async getConfigurationDirectory(): Promise<string> {
    const home = homedir();
    
    switch (process.platform) {
      case 'win32':
        return join(home, 'AppData', 'Roaming', 'Code', 'User');
      case 'darwin':
        return join(home, 'Library', 'Application Support', 'Code', 'User');
      default:
        return join(home, '.config', 'Code', 'User');
    }
  }

  /**
   * Get the workspace configuration directory name
   */
  protected getWorkspaceConfigDirectory(): string {
    return '.vscode';
  }

  /**
   * Parse extension list output from CLI
   */
  protected parseExtensionList(output: string): IDEExtension[] {
    const lines = output.trim().split('\n');
    const extensions: IDEExtension[] = [];

    for (const line of lines) {
      if (line.trim()) {
        const [id, version] = line.split('@');
        if (id) {
          const [publisher, name] = id.split('.');
          extensions.push({
            id,
            name: name || id,
            publisher: publisher || 'unknown',
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
    return ['--install-extension', extensionId];
  }

  /**
   * Get extension uninstallation command arguments
   */
  protected getExtensionUninstallArgs(extensionId: string): string[] {
    return ['--uninstall-extension', extensionId];
  }

  /**
   * Convert settings to VSCode-specific format
   */
  protected convertSettingsFormat(settings: IDEWorkspaceSettings | IDEUserSettings): Record<string, ConfigValue> {
    const result: Record<string, ConfigValue> = {};

    // Handle workspace settings
    if ('editor' in settings && settings.editor) {
      Object.assign(result, settings.editor);
    }
    if ('languages' in settings && settings.languages) {
      Object.assign(result, settings.languages);
    }
    if ('extensions' in settings && settings.extensions) {
      Object.assign(result, settings.extensions);
    }
    if ('debug' in settings && settings.debug) {
      Object.assign(result, settings.debug);
    }
    if ('terminal' in settings && settings.terminal) {
      Object.assign(result, settings.terminal);
    }
    if ('custom' in settings && settings.custom) {
      Object.assign(result, settings.custom);
    }

    // Handle user settings
    if ('workbench' in settings && settings.workbench) {
      Object.assign(result, settings.workbench);
    }
    if ('files' in settings && settings.files) {
      Object.assign(result, settings.files);
    }
    if ('git' in settings && settings.git) {
      Object.assign(result, settings.git);
    }
    if ('search' in settings && settings.search) {
      Object.assign(result, settings.search);
    }

    return result;
  }

  /**
   * Convert from VSCode format to internal format
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

    // Categorize settings based on their prefixes
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('editor.')) {
        result.editor![key] = value;
      } else if (key.startsWith('debug.')) {
        result.debug![key] = value;
      } else if (key.startsWith('terminal.')) {
        result.terminal![key] = value;
      } else if (key.startsWith('[') && key.endsWith(']')) {
        // Language-specific settings
        const language = key.slice(1, -1);
        if (!result.languages![language]) {
          result.languages![language] = {};
        }
        if (typeof value === 'object' && value !== null) {
          Object.assign(result.languages![language], value);
        }
      } else if (key.includes('.')) {
        // Extension-specific settings
        result.extensions![key] = value;
      } else {
        // Custom settings
        result.custom![key] = value;
      }
    }

    return result;
  }

  /**
   * Get list extension command arguments
   */
  protected getListExtensionsArgs(): string[] {
    return ['--list-extensions', '--show-versions'];
  }
} 