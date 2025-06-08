/**
 * IDE Extension Management System
 * Handles extension operations across different IDEs with unified interface
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import type {
    IDEConfigurationError,
    IDEConfigurationResult,
    IDEExtension,
    IDEType
} from './types.js';

const execAsync = promisify(exec);

/**
 * Extension installation options
 */
export interface ExtensionInstallOptions {
  /** Force installation even if extension exists */
  force?: boolean;
  /** Install pre-release version */
  preRelease?: boolean;
  /** Timeout for installation in milliseconds */
  timeout?: number;
  /** Additional installation flags */
  additionalFlags?: string[];
}

/**
 * Extension search criteria
 */
export interface ExtensionSearchCriteria {
  /** Search query */
  query: string;
  /** Category filter */
  category?: string;
  /** Publisher filter */
  publisher?: string;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Extension marketplace information
 */
export interface ExtensionMarketplaceInfo {
  /** Extension ID */
  id: string;
  /** Display name */
  name: string;
  /** Publisher name */
  publisher: string;
  /** Description */
  description: string;
  /** Version */
  version: string;
  /** Download count */
  downloadCount?: number;
  /** Rating */
  rating?: number;
  /** Categories */
  categories: string[];
  /** Tags */
  tags: string[];
  /** Repository URL */
  repository?: string;
  /** Homepage URL */
  homepage?: string;
}

/**
 * Extension dependency information
 */
export interface ExtensionDependency {
  /** Extension ID */
  id: string;
  /** Required version range */
  versionRange?: string;
  /** Whether dependency is optional */
  optional?: boolean;
}

/**
 * Extension validation result
 */
export interface ExtensionValidationResult {
  /** Whether extension is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Missing dependencies */
  missingDependencies: ExtensionDependency[];
}

/**
 * Extension manager for handling IDE extensions
 */
export class ExtensionManager {
  private readonly ideType: IDEType;
  private readonly ideCommand: string;

  constructor(ideType: IDEType, ideCommand: string) {
    this.ideType = ideType;
    this.ideCommand = ideCommand;
  }

  /**
   * Install an extension
   */
  async installExtension(
    extensionId: string,
    options: ExtensionInstallOptions = {}
  ): Promise<IDEConfigurationResult> {
    try {
      const flags = this.buildInstallFlags(options);
      const command = `${this.ideCommand} --install-extension ${extensionId} ${flags.join(' ')}`;
      
      const { stdout: _stdout, stderr } = await execAsync(command, {
        timeout: options.timeout || 60000
      });

      // Check if installation was successful
      const isInstalled = await this.isExtensionInstalled(extensionId);
      
             if (!isInstalled) {
         return {
           success: false,
           error: `Failed to install extension ${extensionId}: ${stderr || 'Unknown error'}`
         };
       }

       return {
         success: true,
         configured: {
           extensions: [extensionId]
         }
       };
         } catch (error) {
       return {
         success: false,
         error: `Error installing extension ${extensionId}: ${error instanceof Error ? error.message : 'Unknown error'}`
       };
     }
  }

  /**
   * Uninstall an extension
   */
  async uninstallExtension(extensionId: string): Promise<IDEConfigurationResult> {
    try {
      const command = `${this.ideCommand} --uninstall-extension ${extensionId}`;
      const { stdout: _stdout, stderr } = await execAsync(command, { timeout: 30000 });

      // Verify uninstallation
      const isInstalled = await this.isExtensionInstalled(extensionId);
      
             if (isInstalled) {
         return {
           success: false,
           error: `Failed to uninstall extension ${extensionId}: ${stderr || 'Unknown error'}`
         };
       }

       return {
         success: true,
         configured: {
           extensions: [extensionId]
         }
       };
     } catch (error) {
       return {
         success: false,
         error: `Error uninstalling extension ${extensionId}: ${error instanceof Error ? error.message : 'Unknown error'}`
       };
     }
  }

  /**
   * List all installed extensions
   */
  async listInstalledExtensions(): Promise<IDEExtension[]> {
    try {
      const command = `${this.ideCommand} --list-extensions --show-versions`;
      const { stdout } = await execAsync(command, { timeout: 30000 });
      
      return this.parseExtensionList(stdout);
    } catch {
      return [];
    }
  }

  /**
   * Check if an extension is installed
   */
  async isExtensionInstalled(extensionId: string): Promise<boolean> {
    try {
      const installedExtensions = await this.listInstalledExtensions();
      return installedExtensions.some(ext => ext.id.toLowerCase() === extensionId.toLowerCase());
    } catch {
      return false;
    }
  }

  /**
   * Get extension information
   */
  async getExtensionInfo(extensionId: string): Promise<IDEExtension | null> {
    try {
      const installedExtensions = await this.listInstalledExtensions();
      return installedExtensions.find(ext => ext.id.toLowerCase() === extensionId.toLowerCase()) || null;
    } catch {
      return null;
    }
  }

  /**
   * Search for extensions in marketplace
   */
  async searchExtensions(_criteria: ExtensionSearchCriteria): Promise<ExtensionMarketplaceInfo[]> {
    // This would typically integrate with the IDE's marketplace API
    // For now, return empty array as this requires IDE-specific implementation
    return [];
  }

  /**
   * Validate extension dependencies
   */
  async validateExtensionDependencies(extensionId: string): Promise<ExtensionValidationResult> {
    try {
      const extension = await this.getExtensionInfo(extensionId);
      
      if (!extension) {
        return {
          isValid: false,
          errors: [`Extension ${extensionId} is not installed`],
          warnings: [],
          missingDependencies: []
        };
      }

      // For now, return basic validation
      // In a real implementation, this would check extension manifest for dependencies
      return {
        isValid: true,
        errors: [],
        warnings: [],
        missingDependencies: []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Error validating extension ${extensionId}: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        missingDependencies: []
      };
    }
  }

  /**
   * Install multiple extensions
   */
  async installExtensions(
    extensionIds: string[],
    options: ExtensionInstallOptions = {}
  ): Promise<IDEConfigurationResult[]> {
    const results: IDEConfigurationResult[] = [];
    
    for (const extensionId of extensionIds) {
      const result = await this.installExtension(extensionId, options);
      results.push(result);
      
      // Add delay between installations to avoid overwhelming the system
      if (extensionIds.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Update all extensions
   */
  async updateAllExtensions(): Promise<IDEConfigurationResult> {
    try {
      // Most IDEs don't have a direct command for updating all extensions
      // This would need to be implemented per IDE
      const installedExtensions = await this.listInstalledExtensions();
      const updateResults: IDEConfigurationResult[] = [];
      
      for (const extension of installedExtensions) {
        // Reinstall to get latest version
        const result = await this.installExtension(extension.id, { force: true });
        updateResults.push(result);
      }
      
      const failedUpdates = updateResults.filter(r => !r.success);
      
      return {
        success: failedUpdates.length === 0,
        data: {
          totalExtensions: installedExtensions.length,
          successfulUpdates: updateResults.length - failedUpdates.length,
          failedUpdates: failedUpdates.length,
          results: updateResults
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('EXTENSION_UPDATE_ERROR', 'Error updating extensions', error)
      };
    }
  }

  /**
   * Export extension list
   */
  async exportExtensionList(filePath: string): Promise<IDEConfigurationResult> {
    try {
      const extensions = await this.listInstalledExtensions();
      const exportData = {
        ideType: this.ideType,
        exportDate: new Date().toISOString(),
        extensions: extensions.map(ext => ({
          id: ext.id,
          name: ext.name,
          version: ext.version,
          enabled: ext.enabled
        }))
      };
      
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
      
      return {
        success: true,
        data: {
          filePath,
          extensionCount: extensions.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('EXTENSION_EXPORT_ERROR', 'Error exporting extension list', error)
      };
    }
  }

  /**
   * Import extension list
   */
  async importExtensionList(filePath: string, options: ExtensionInstallOptions = {}): Promise<IDEConfigurationResult> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const importData = JSON.parse(fileContent);
      
      if (!importData.extensions || !Array.isArray(importData.extensions)) {
        return {
          success: false,
          error: {
            code: 'INVALID_IMPORT_FILE',
            message: 'Invalid extension list file format'
          }
        };
      }
      
      const extensionIds = importData.extensions.map((ext: { id: string }) => ext.id);
      const results = await this.installExtensions(extensionIds, options);
      
      const failedInstalls = results.filter(r => !r.success);
      
      return {
        success: failedInstalls.length === 0,
        data: {
          totalExtensions: extensionIds.length,
          successfulInstalls: results.length - failedInstalls.length,
          failedInstalls: failedInstalls.length,
          results
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('EXTENSION_IMPORT_ERROR', 'Error importing extension list', error)
      };
    }
  }

  /**
   * Build installation flags based on options
   */
  private buildInstallFlags(options: ExtensionInstallOptions): string[] {
    const flags: string[] = [];
    
    if (options.force) {
      flags.push('--force');
    }
    
    if (options.preRelease) {
      flags.push('--pre-release');
    }
    
    if (options.additionalFlags) {
      flags.push(...options.additionalFlags);
    }
    
    return flags;
  }

  /**
   * Parse extension list output
   */
  private parseExtensionList(output: string): IDEExtension[] {
    const lines = output.trim().split('\n').filter(line => line.trim());
    const extensions: IDEExtension[] = [];
    
    for (const line of lines) {
      const match = line.match(/^(.+?)@(.+?)$/);
      if (match) {
        const [, id, version] = match;
        extensions.push({
          id: id.trim(),
          name: id.split('.').pop() || id,
          version: version.trim(),
          publisher: id.split('.')[0] || 'unknown'
        });
      }
    }
    
    return extensions;
  }

  /**
   * Create standardized error object
   */
  private createError(code: string, message: string, originalError?: unknown): IDEConfigurationError {
    return {
      code,
      message,
      details: originalError instanceof Error ? {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      } : originalError
    };
  }
}

/**
 * Factory function to create extension manager for specific IDE
 */
export function createExtensionManager(ideType: IDEType): ExtensionManager | null {
  const ideCommands: Record<IDEType, string> = {
    vscode: 'code',
    cursor: 'cursor',
    jetbrains: '', // JetBrains IDEs don't have a unified CLI
    vim: '', // Vim extensions are managed differently
    neovim: '' // Neovim extensions are managed differently
  };
  
  const command = ideCommands[ideType];
  if (!command) {
    return null;
  }
  
  return new ExtensionManager(ideType, command);
}

/**
 * Extension recommendation system
 */
export class ExtensionRecommendationEngine {
  private readonly ideType: IDEType;
  
  constructor(ideType: IDEType) {
    this.ideType = ideType;
  }
  
  /**
   * Get recommended extensions for a project type
   */
  getRecommendationsForProject(projectType: string): IDEExtension[] {
    const recommendations: Record<string, IDEExtension[]> = {
      'typescript': [
        {
          id: 'ms-vscode.vscode-typescript-next',
          name: 'TypeScript Importer',
          version: 'latest',
          enabled: true,
          publisher: 'microsoft'
        }
      ],
      'react': [
        {
          id: 'bradlc.vscode-tailwindcss',
          name: 'Tailwind CSS IntelliSense',
          version: 'latest',
          enabled: true,
          publisher: 'bradlc'
        },
        {
          id: 'esbenp.prettier-vscode',
          name: 'Prettier',
          version: 'latest',
          enabled: true,
          publisher: 'esbenp'
        }
      ],
      'vue': [
        {
          id: 'vue.volar',
          name: 'Vue Language Features',
          version: 'latest',
          enabled: true,
          publisher: 'vue'
        }
      ],
      'python': [
        {
          id: 'ms-python.python',
          name: 'Python',
          version: 'latest',
          enabled: true,
          publisher: 'microsoft'
        }
      ]
    };
    
    return recommendations[projectType] || [];
  }
  
  /**
   * Get essential extensions for the IDE
   */
  getEssentialExtensions(): IDEExtension[] {
    const essentials: Record<IDEType, IDEExtension[]> = {
      vscode: [
        {
          id: 'ms-vscode.vscode-eslint',
          name: 'ESLint',
          version: 'latest',
          enabled: true,
          publisher: 'microsoft'
        },
        {
          id: 'esbenp.prettier-vscode',
          name: 'Prettier',
          version: 'latest',
          enabled: true,
          publisher: 'esbenp'
        }
      ],
      cursor: [
        {
          id: 'ms-vscode.vscode-eslint',
          name: 'ESLint',
          version: 'latest',
          enabled: true,
          publisher: 'microsoft'
        }
      ],
      jetbrains: [],
      vim: [],
      neovim: []
    };
    
    return essentials[this.ideType] || [];
  }
} 