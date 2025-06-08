/**
 * IDE Configuration Integration with CategoryInstaller
 * Extends the CategoryInstaller to handle IDE configuration after installation
 */

import type { InstallationCommand, ToolCategory } from '../../shared/manifest-types.js';
import { CategoryInstaller, type CategoryInstallationConfig, type ICategoryInstaller } from '../category-installer.js';
import type { InstallationOptions } from '../installer-types.js';
import { ExtensionManager } from './extension-manager.js';
import { SettingsGenerator, type ProjectPreferences, type ProjectTechStack, type SettingsGenerationContext } from './settings-generator.js';
import type { IDEType } from './types.js';

/**
 * IDE-specific configuration options
 */
export interface IDEConfigurationOptions {
  /** Whether to configure the IDE after installation */
  configureIDE?: boolean;
  /** Project technology stack for configuration */
  techStack?: ProjectTechStack;
  /** User preferences for IDE configuration */
  preferences?: ProjectPreferences;
  /** Extensions to install */
  extensions?: string[];
  /** Workspace root directory */
  workspaceRoot?: string;
  /** Project name for configuration */
  projectName?: string;
  /** Skip extension installation */
  skipExtensions?: boolean;
  /** Skip settings generation */
  skipSettings?: boolean;
}

/**
 * Enhanced CategoryInstaller with IDE configuration support
 */
export class IDECategoryInstaller extends CategoryInstaller implements ICategoryInstaller {
  private readonly extensionManager: ExtensionManager;
  private readonly settingsGenerator: SettingsGenerator;

  constructor() {
    super();
    this.extensionManager = new ExtensionManager('vscode', 'code'); // Default to VSCode
    this.settingsGenerator = new SettingsGenerator();
  }

  /**
   * Enhanced post-installation steps that include IDE configuration
   */
  public async executePostInstallationSteps(
    command: InstallationCommand,
    category: ToolCategory,
    options: InstallationOptions
  ): Promise<void> {
    // Execute standard post-installation steps first
    await super.executePostInstallationSteps(command, category, options);

    // Handle IDE-specific configuration for productivity tools
    if (category === 'productivity' && this.isIDETool(command.command)) {
      await this.configureIDE(command, options);
    }
  }

  /**
   * Enhanced productivity category configuration with IDE support
   */
  public getCategoryConfig(category: ToolCategory): CategoryInstallationConfig {
    if (category === 'productivity') {
      const baseConfig = super.getCategoryConfig('productivity');
      
      return {
        ...baseConfig,
        // Ensure IDEs get proper configuration
        createShortcuts: true,
        registerFileAssociations: true,
        updatePath: true,
        additionalVerification: [
          '--version',
          '--help'
        ]
      };
    }
    
    return super.getCategoryConfig(category);
  }

  /**
   * Configure IDE after installation
   */
  private async configureIDE(
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void> {
    const ideType = this.getIDEType(command.command);
    if (!ideType) {
      return;
    }

    console.log(`Configuring ${ideType} after installation...`);

    try {
      // Get IDE configuration options from installation options
      const ideOptions = this.getIDEConfigurationOptions(options);
      
      if (!ideOptions.configureIDE) {
        console.log(`IDE configuration skipped for ${ideType}`);
        return;
      }

      // Install extensions if requested
      if (!ideOptions.skipExtensions && ideOptions.extensions && ideOptions.extensions.length > 0) {
        await this.installIDEExtensions(ideType, ideOptions.extensions);
      }

      // Generate and apply settings if requested
      if (!ideOptions.skipSettings && ideOptions.techStack && ideOptions.preferences) {
        await this.generateIDESettings(ideType, ideOptions);
      }

      console.log(`Successfully configured ${ideType}`);
    } catch (error) {
      console.error(`Failed to configure ${ideType}:`, error);
      // Don't throw error to avoid breaking the installation process
    }
  }

  /**
   * Install IDE extensions
   */
  private async installIDEExtensions(ideType: IDEType, extensions: string[]): Promise<void> {
    console.log(`Installing ${extensions.length} extensions for ${ideType}...`);

    for (const extensionId of extensions) {
      try {
        const result = await this.extensionManager.installExtension(extensionId);
        if (result.success) {
          console.log(`✓ Installed extension: ${extensionId}`);
        } else {
          console.warn(`✗ Failed to install extension: ${extensionId} - ${result.error}`);
        }
      } catch (error) {
        console.warn(`✗ Error installing extension ${extensionId}:`, error);
      }
    }
  }

  /**
   * Generate and apply IDE settings
   */
  private async generateIDESettings(ideType: IDEType, options: IDEConfigurationOptions): Promise<void> {
    if (!options.techStack || !options.preferences || !options.workspaceRoot) {
      console.warn('Missing required options for settings generation');
      return;
    }

    console.log(`Generating settings for ${ideType}...`);

    const context: SettingsGenerationContext = {
      projectRoot: options.workspaceRoot,
      projectName: options.projectName || 'HatStart Project',
      techStack: options.techStack,
      preferences: options.preferences,
      ideType,
      customSettings: {}
    };

    try {
      // Generate configuration profile
      const profile = await this.settingsGenerator.generateProfile(context);
      
      // Write configuration files
      const result = await this.settingsGenerator.writeConfiguration(context, profile);
      
      if (result.success) {
        console.log(`✓ Generated settings for ${ideType}`);
        if (result.configured?.files) {
          console.log(`  Created ${result.configured.files.length} configuration files`);
        }
      } else {
        console.warn(`✗ Failed to generate settings: ${result.error}`);
      }
    } catch (error) {
      console.warn(`✗ Error generating settings for ${ideType}:`, error);
    }
  }

  /**
   * Check if a command is an IDE tool
   */
  private isIDETool(command: string): boolean {
    const ideCommands = [
      'code',
      'vscode',
      'cursor',
      'idea',
      'intellij',
      'pycharm',
      'webstorm',
      'phpstorm',
      'clion',
      'goland',
      'rider',
      'vim',
      'nvim',
      'neovim',
      'emacs',
      'sublime',
      'atom'
    ];

    return ideCommands.some(ide => 
      command.toLowerCase().includes(ide) || 
      command.toLowerCase() === ide
    );
  }

  /**
   * Get IDE type from command
   */
  private getIDEType(command: string): IDEType | null {
    const cmd = command.toLowerCase();
    
    if (cmd.includes('code') || cmd.includes('vscode')) {
      return 'vscode';
    }
    if (cmd.includes('cursor')) {
      return 'cursor';
    }
    if (cmd.includes('idea') || cmd.includes('intellij') || cmd.includes('pycharm') || 
        cmd.includes('webstorm') || cmd.includes('phpstorm') || cmd.includes('clion') || 
        cmd.includes('goland') || cmd.includes('rider')) {
      return 'jetbrains';
    }
    if (cmd.includes('vim') || cmd.includes('nvim') || cmd.includes('neovim')) {
      return 'vim';
    }
    
    return null;
  }

  /**
   * Extract IDE configuration options from installation options
   */
  private getIDEConfigurationOptions(options: InstallationOptions): IDEConfigurationOptions {
    // Check if IDE configuration options are provided in the options
    const ideOptions = (options as InstallationOptions & { ideConfiguration?: IDEConfigurationOptions }).ideConfiguration;
    
    if (ideOptions) {
      return ideOptions;
    }

    // Return default configuration
    return {
      configureIDE: true,
      skipExtensions: false,
      skipSettings: false,
      workspaceRoot: process.cwd(),
      projectName: 'HatStart Project',
      techStack: this.getDefaultTechStack(),
      preferences: this.getDefaultPreferences()
    };
  }

  /**
   * Get default technology stack
   */
  private getDefaultTechStack(): ProjectTechStack {
    return {
      primaryLanguage: 'typescript',
      languages: ['typescript', 'javascript', 'json'],
      frameworks: ['react', 'node'],
      buildTools: ['vite', 'npm'],
      testingFrameworks: ['vitest'],
      packageManagers: ['npm'],
      devTools: ['prettier', 'eslint'],
      databases: [],
      cloudPlatforms: []
    };
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): ProjectPreferences {
    return {
      formatting: {
        indentSize: 2,
        indentType: 'spaces',
        maxLineLength: 100,
        insertFinalNewline: true,
        trimTrailingWhitespace: true
      },
      linting: {
        enabled: true,
        strictMode: true,
        autoFixOnSave: true
      },
      git: {
        autoStage: false,
        showInlineBlame: true,
        enableGitLens: true
      },
      debugging: {
        enableBreakpoints: true,
        showVariableTypes: true,
        enableHotReload: true
      },
      terminal: {
        defaultShell: 'bash',
        fontSize: 14,
        enableBell: false
      }
    };
  }
}

/**
 * Factory function to create IDE-enhanced category installer
 */
export function createIDECategoryInstaller(): IDECategoryInstaller {
  return new IDECategoryInstaller();
}

/**
 * Helper function to create IDE configuration options
 */
export function createIDEConfigurationOptions(
  options: Partial<IDEConfigurationOptions> = {}
): IDEConfigurationOptions {
  return {
    configureIDE: true,
    skipExtensions: false,
    skipSettings: false,
    workspaceRoot: process.cwd(),
    projectName: 'HatStart Project',
    ...options
  };
} 