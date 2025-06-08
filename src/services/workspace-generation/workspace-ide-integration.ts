/**
 * Workspace IDE Integration Service
 * Connects the workspace generation system with the IDE configuration systems from Task 11
 * Ensures seamless integration between workspace-specific and global IDE configurations
 */

import { promises as fs } from 'fs';
import * as path from 'path';
// Note: IDE configuration managers will be imported when available
// import { CursorConfigurationManager } from '../ide-configuration/cursor-configuration-manager.js';
// import { JetBrainsConfigurationManager } from '../ide-configuration/jetbrains-configuration-manager.js';
// import { VSCodeConfigurationManager } from '../ide-configuration/vscode-configuration-manager.js';
import type {
    ConfigValue,
    IDEConfigurationProfile,
    IDEExtension,
    IDELaunchConfiguration,
    IDESnippet,
    IDETask,
    IDEType,
    IDEUserSettings,
    IDEWorkspaceSettings,
    IIDEConfigurationManager
} from '../ide-configuration/types.js';
import type { WorkspaceExtensionProfile } from './extension-manager.js';
import type { WorkspaceLintingConfiguration } from './workspace-linter-formatter.js';
import type {
    TechnologyStack,
    WorkspaceRequirement
} from './workspace-requirements-service.js';
import type {
    TemplateType,
    WorkspaceTemplate
} from './workspace-template-manager.js';
import type { WorkspaceVersionConfiguration } from './workspace-version-manager.js';

/**
 * Integration configuration options
 */
export interface WorkspaceIDEIntegrationOptions {
  /** Whether to inherit global IDE settings */
  inheritGlobalSettings: boolean;
  /** Whether workspace settings should override global settings */
  allowWorkspaceOverrides: boolean;
  /** Whether to merge or replace extension lists */
  mergeExtensions: boolean;
  /** Whether to validate configurations before applying */
  validateConfigurations: boolean;
  /** Whether to backup existing configurations */
  backupExistingConfigurations: boolean;
  /** Custom settings to apply to all workspaces */
  globalWorkspaceSettings?: Record<string, unknown>;
  /** Settings that should never be overridden by workspace */
  protectedGlobalSettings?: string[];
}

/**
 * Workspace IDE configuration result
 */
export interface WorkspaceIDEConfigurationResult {
  success: boolean;
  workspacePath: string;
  ideType: IDEType;
  configuredFiles: string[];
  installedExtensions: string[];
  appliedSettings: string[];
  errors: string[];
  warnings: string[];
  backupPaths?: string[];
}

/**
 * Integration context for workspace configuration
 */
export interface WorkspaceIntegrationContext {
  workspacePath: string;
  workspaceName: string;
  stack: TechnologyStack;
  ideType: IDEType;
  templateType: TemplateType;
  requirements: WorkspaceRequirement;
  template: WorkspaceTemplate;
  extensionProfile: WorkspaceExtensionProfile;
  lintingConfig: WorkspaceLintingConfiguration;
  versionConfig: WorkspaceVersionConfiguration;
  options: WorkspaceIDEIntegrationOptions;
}

/**
 * Settings inheritance strategy
 */
export type SettingsInheritanceStrategy = 'merge' | 'override' | 'protect-global' | 'workspace-only';

/**
 * Main integration service class
 */
export class WorkspaceIDEIntegrationService {
  private ideManagers: Map<IDEType, IIDEConfigurationManager> = new Map();
  private defaultOptions: WorkspaceIDEIntegrationOptions = {
    inheritGlobalSettings: true,
    allowWorkspaceOverrides: true,
    mergeExtensions: true,
    validateConfigurations: true,
    backupExistingConfigurations: true,
    protectedGlobalSettings: [
      'workbench.colorTheme',
      'editor.fontFamily',
      'editor.fontSize',
      'terminal.integrated.fontFamily',
      'git.defaultBranchName'
    ]
  };

  constructor() {
    this.initializeIDEManagers();
  }

  /**
   * Initialize IDE configuration managers
   * Note: Managers will be initialized when the specific implementations are available
   */
  private initializeIDEManagers(): void {
    // TODO: Initialize managers when implementations are available
    // this.ideManagers.set('vscode', new VSCodeConfigurationManager());
    // this.ideManagers.set('cursor', new CursorConfigurationManager());
    // this.ideManagers.set('jetbrains', new JetBrainsConfigurationManager());
  }

  /**
   * Integrate workspace with IDE configuration system
   */
  async integrateWorkspace(context: WorkspaceIntegrationContext): Promise<WorkspaceIDEConfigurationResult> {
    const result: WorkspaceIDEConfigurationResult = {
      success: false,
      workspacePath: context.workspacePath,
      ideType: context.ideType,
      configuredFiles: [],
      installedExtensions: [],
      appliedSettings: [],
      errors: [],
      warnings: []
    };

    try {
      // Get IDE manager for the specified IDE type
      const ideManager = this.ideManagers.get(context.ideType);
      if (!ideManager) {
        throw new Error(`No IDE manager found for ${context.ideType}`);
      }

      // Check if IDE is available
      const isAvailable = await ideManager.isIDEAvailable();
      if (!isAvailable) {
        result.warnings.push(`${context.ideType} is not installed or not available`);
      }

      // Backup existing configurations if requested
      if (context.options.backupExistingConfigurations) {
        result.backupPaths = await this.backupExistingConfigurations(context);
      }

      // Build integrated configuration profile
      const integratedProfile = await this.buildIntegratedProfile(context, ideManager);

      // Validate configuration if requested
      if (context.options.validateConfigurations) {
        const validationResult = await ideManager.validateConfiguration(integratedProfile);
        if (!validationResult.success) {
          result.errors.push(`Configuration validation failed: ${validationResult.error}`);
          return result;
        }
        if (validationResult.warnings) {
          result.warnings.push(...validationResult.warnings);
        }
      }

      // Apply workspace configuration
      const configResult = await ideManager.createWorkspaceConfiguration(
        context.workspacePath,
        integratedProfile
      );

      if (!configResult.success) {
        result.errors.push(`Failed to create workspace configuration: ${configResult.error}`);
        return result;
      }

      // Install extensions
      if (integratedProfile.extensions.length > 0) {
        const extensionResult = await ideManager.installExtensions(integratedProfile.extensions);
        if (extensionResult.success) {
          result.installedExtensions = extensionResult.configured?.extensions || [];
        } else {
          result.warnings.push(`Extension installation failed: ${extensionResult.error}`);
        }
      }

      // Update result with success information
      result.success = true;
      result.configuredFiles = configResult.configured?.files || [];
      result.appliedSettings = configResult.configured?.settings || [];
      if (configResult.warnings) {
        result.warnings.push(...configResult.warnings);
      }

      // Generate integration documentation
      await this.generateIntegrationDocumentation(context, result);

    } catch (error) {
      result.errors.push(`Integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Build integrated configuration profile combining workspace and global settings
   */
  private async buildIntegratedProfile(
    context: WorkspaceIntegrationContext,
    ideManager: IIDEConfigurationManager
  ): Promise<IDEConfigurationProfile> {
    // Get current global settings if inheritance is enabled
    let globalSettings: IDEUserSettings | null = null;
    if (context.options.inheritGlobalSettings) {
      globalSettings = await ideManager.getCurrentUserSettings();
    }

    // Build workspace settings with inheritance
    const workspaceSettings = await this.buildInheritedWorkspaceSettings(
      context,
      globalSettings
    );

    // Build extension list with merging
    const extensions = await this.buildMergedExtensions(
      context,
      ideManager
    );

    // Build tasks configuration
    const tasks = this.buildWorkspaceTasks(context);

    // Build launch configurations
    const launchConfigurations = this.buildLaunchConfigurations(context);

    // Build snippets
    const snippets = this.buildWorkspaceSnippets(context);

    return {
      name: `${context.workspaceName}-integrated`,
      description: `Integrated workspace configuration for ${context.workspaceName} (${context.stack})`,
      ideType: context.ideType,
      extensions,
      workspaceSettings,
      userSettings: context.options.inheritGlobalSettings ? globalSettings || undefined : undefined,
      tasks,
      launchConfigurations,
      snippets
    };
  }

  /**
   * Build workspace settings with proper inheritance from global settings
   */
  private async buildInheritedWorkspaceSettings(
    context: WorkspaceIntegrationContext,
    globalSettings: IDEUserSettings | null
  ): Promise<IDEWorkspaceSettings> {
    // Start with template settings
    const templateSettings = context.template.settings || {};
    
    // Add requirement-specific settings
    const requirementSettings = context.requirements.settings || {};
    
    // Add linting configuration settings
    const lintingSettings = this.extractLintingSettings(context.lintingConfig);
    
    // Add version management settings
    const versionSettings = this.extractVersionSettings(context.versionConfig);

    // Apply inheritance strategy
    const inheritedSettings = this.applySettingsInheritance(
      templateSettings,
      requirementSettings,
      lintingSettings,
      versionSettings,
      globalSettings,
      context.options
    );

    return {
      editor: (inheritedSettings.editor as Record<string, ConfigValue>) || {},
      languages: (inheritedSettings.languages as Record<string, Record<string, ConfigValue>>) || {},
      extensions: (inheritedSettings.extensions as Record<string, ConfigValue>) || {},
      debug: (inheritedSettings.debug as Record<string, ConfigValue>) || {},
      terminal: (inheritedSettings.terminal as Record<string, ConfigValue>) || {},
      custom: (inheritedSettings.custom as Record<string, ConfigValue>) || {}
    };
  }

  /**
   * Apply settings inheritance strategy
   */
  private applySettingsInheritance(
    templateSettings: Record<string, unknown>,
    requirementSettings: Record<string, unknown>,
    lintingSettings: Record<string, unknown>,
    versionSettings: Record<string, unknown>,
    globalSettings: IDEUserSettings | null,
    options: WorkspaceIDEIntegrationOptions
  ): Record<string, unknown> {
    let result: Record<string, unknown> = {};

    // Start with global settings if inheritance is enabled
    if (options.inheritGlobalSettings && globalSettings) {
      result = { ...this.flattenSettings(globalSettings) };
    }

    // Apply template settings
    result = { ...result, ...templateSettings };

    // Apply requirement-specific settings
    result = { ...result, ...requirementSettings };

    // Apply linting settings
    result = { ...result, ...lintingSettings };

    // Apply version management settings
    result = { ...result, ...versionSettings };

    // Apply global workspace settings
    if (options.globalWorkspaceSettings) {
      result = { ...result, ...options.globalWorkspaceSettings };
    }

    // Protect global settings if specified
    if (options.protectedGlobalSettings && globalSettings) {
      const flatGlobal = this.flattenSettings(globalSettings);
      for (const protectedKey of options.protectedGlobalSettings) {
        if (protectedKey in flatGlobal) {
          result[protectedKey] = flatGlobal[protectedKey];
        }
      }
    }

    return result;
  }

  /**
   * Build merged extension list
   */
  private async buildMergedExtensions(
    context: WorkspaceIntegrationContext,
    ideManager: IIDEConfigurationManager
  ): Promise<IDEExtension[]> {
    const extensions: IDEExtension[] = [];

    // Add template extensions (convert string IDs to IDEExtension objects)
    if (context.template.extensions) {
      const templateExtensions = context.template.extensions.map(ext => {
        if (typeof ext === 'string') {
          const [publisher, name] = ext.split('.');
          return {
            id: ext,
            name: name || ext,
            publisher: publisher || 'unknown',
            version: 'latest'
          } as IDEExtension;
        }
        return ext as IDEExtension;
      });
      extensions.push(...templateExtensions);
    }

    // Add requirement extensions
    const requirementExtensions = context.requirements.extensions.map(id => ({
      id,
      name: id.split('.').pop() || id,
      publisher: id.split('.')[0] || 'unknown',
      version: 'latest'
    }));
    extensions.push(...requirementExtensions);

    // Add extension profile extensions (convert ExtensionRecommendation to IDEExtension)
    if (context.extensionProfile.extensions) {
      const profileExtensions = context.extensionProfile.extensions.map(ext => ({
        id: ext.id,
        name: ext.name,
        publisher: ext.publisher || 'unknown',
        version: ext.version || 'latest',
        settings: ext.settings as Record<string, ConfigValue> | undefined
      } as IDEExtension));
      extensions.push(...profileExtensions);
    }

    // Merge with installed extensions if requested
    if (context.options.mergeExtensions) {
      try {
        const installedExtensions = await ideManager.listInstalledExtensions();
        const installedIds = new Set(installedExtensions.map(ext => ext.id));
        
        // Only add extensions that aren't already installed
        const newExtensions = extensions.filter(ext => !installedIds.has(ext.id));
        extensions.splice(0, extensions.length, ...newExtensions);
      } catch {
        // If we can't get installed extensions, proceed with all extensions
      }
    }

    // Remove duplicates
    const uniqueExtensions = new Map<string, IDEExtension>();
    for (const ext of extensions) {
      uniqueExtensions.set(ext.id, ext);
    }

    return Array.from(uniqueExtensions.values());
  }

  /**
   * Build workspace tasks
   */
  private buildWorkspaceTasks(context: WorkspaceIntegrationContext): IDETask[] {
    const tasks: IDETask[] = [];

    // Add template tasks
    if (context.template.tasks) {
      tasks.push(...context.template.tasks.map(task => ({
        label: task.label,
        type: task.type,
        command: task.command,
        args: task.args,
        group: task.group,
        cwd: '${workspaceFolder}',
        env: context.versionConfig.environmentVariables
      })));
    }

    // Add stack-specific tasks
    const stackTasks = this.getStackSpecificTasks(context.stack, context.versionConfig);
    tasks.push(...stackTasks);

    // Add linting tasks
    const lintingTasks = this.getLintingTasks(context.lintingConfig);
    tasks.push(...lintingTasks);

    return tasks;
  }

  /**
   * Build launch configurations for debugging
   */
  private buildLaunchConfigurations(context: WorkspaceIntegrationContext): IDELaunchConfiguration[] {
    const configs: IDELaunchConfiguration[] = [];

    // Add template launch configurations (if available)
    if (context.template && 'launchConfigurations' in context.template && context.template.launchConfigurations && Array.isArray(context.template.launchConfigurations)) {
      configs.push(...context.template.launchConfigurations);
    }

    // Add stack-specific debug configurations
    const stackConfigs = this.getStackDebugConfigurations(context.stack, context.versionConfig);
    configs.push(...stackConfigs);

    return configs;
  }

  /**
   * Build workspace snippets
   */
  private buildWorkspaceSnippets(context: WorkspaceIntegrationContext): Record<string, IDESnippet[]> {
    const snippets: Record<string, IDESnippet[]> = {};

    // Add template snippets (if available)
    if (context.template && 'snippets' in context.template && context.template.snippets) {
      Object.assign(snippets, context.template.snippets);
    }

    // Add stack-specific snippets
    const stackSnippets = this.getStackSnippets(context.stack);
    Object.assign(snippets, stackSnippets);

    return snippets;
  }

  /**
   * Extract linting settings from linting configuration
   */
  private extractLintingSettings(lintingConfig: WorkspaceLintingConfiguration): Record<string, unknown> {
    const settings: Record<string, unknown> = {};

    // Global linting settings
    if (lintingConfig.globalSettings.enableAutoFix) {
      settings['editor.codeActionsOnSave'] = {
        'source.fixAll': true
      };
    }

    if (lintingConfig.globalSettings.enableFormatOnSave) {
      settings['editor.formatOnSave'] = true;
    }

    // Language-specific settings
    for (const profile of lintingConfig.profiles) {
      const langKey = `[${profile.language}]`;
      settings[langKey] = {
        'editor.defaultFormatter': profile.formatters?.[0]?.name,
        'editor.tabSize': lintingConfig.globalSettings.indentSize,
        'editor.insertSpaces': lintingConfig.globalSettings.useSpaces
      };
    }

    return settings;
  }

  /**
   * Extract version management settings
   */
  private extractVersionSettings(versionConfig: WorkspaceVersionConfiguration): Record<string, unknown> {
    const settings: Record<string, unknown> = {};

    // Add environment variables to terminal
    if (Object.keys(versionConfig.environmentVariables).length > 0) {
      settings['terminal.integrated.env.linux'] = versionConfig.environmentVariables;
      settings['terminal.integrated.env.osx'] = versionConfig.environmentVariables;
      settings['terminal.integrated.env.windows'] = versionConfig.environmentVariables;
    }

    return settings;
  }

  /**
   * Get stack-specific tasks
   */
  private getStackSpecificTasks(stack: TechnologyStack, versionConfig: WorkspaceVersionConfiguration): IDETask[] {
    const tasks: IDETask[] = [];

    switch (stack) {
      case 'javascript':
      case 'typescript':
        tasks.push(
          {
            label: 'npm: install',
            type: 'shell',
            command: 'npm',
            args: ['install'],
            group: 'build',
            env: versionConfig.environmentVariables
          },
          {
            label: 'npm: start',
            type: 'shell',
            command: 'npm',
            args: ['start'],
            group: 'build',
            env: versionConfig.environmentVariables
          },
          {
            label: 'npm: test',
            type: 'shell',
            command: 'npm',
            args: ['test'],
            group: 'test',
            env: versionConfig.environmentVariables
          }
        );
        break;

      case 'python':
        tasks.push(
          {
            label: 'pip: install requirements',
            type: 'shell',
            command: 'pip',
            args: ['install', '-r', 'requirements.txt'],
            group: 'build',
            env: versionConfig.environmentVariables
          },
          {
            label: 'python: run main',
            type: 'shell',
            command: 'python',
            args: ['src/main.py'],
            group: 'build',
            env: versionConfig.environmentVariables
          },
          {
            label: 'pytest: run tests',
            type: 'shell',
            command: 'pytest',
            args: ['tests/'],
            group: 'test',
            env: versionConfig.environmentVariables
          }
        );
        break;

      case 'java':
        tasks.push(
          {
            label: 'maven: compile',
            type: 'shell',
            command: 'mvn',
            args: ['compile'],
            group: 'build',
            env: versionConfig.environmentVariables
          },
          {
            label: 'maven: test',
            type: 'shell',
            command: 'mvn',
            args: ['test'],
            group: 'test',
            env: versionConfig.environmentVariables
          }
        );
        break;

      case 'rust':
        tasks.push(
          {
            label: 'cargo: build',
            type: 'shell',
            command: 'cargo',
            args: ['build'],
            group: 'build',
            env: versionConfig.environmentVariables
          },
          {
            label: 'cargo: test',
            type: 'shell',
            command: 'cargo',
            args: ['test'],
            group: 'test',
            env: versionConfig.environmentVariables
          }
        );
        break;
    }

    return tasks;
  }

  /**
   * Get linting tasks
   */
  private getLintingTasks(lintingConfig: WorkspaceLintingConfiguration): IDETask[] {
    const tasks: IDETask[] = [];

    for (const profile of lintingConfig.profiles) {
      if (profile.linters && profile.linters.length > 0) {
        const linter = profile.linters[0];
        tasks.push({
          label: `${linter.name}: lint ${profile.language}`,
          type: 'shell',
          command: linter.packageName,
          args: ['.'],
          group: 'test'
        });
      }

      if (profile.formatters && profile.formatters.length > 0) {
        const formatter = profile.formatters[0];
        tasks.push({
          label: `${formatter.name}: format ${profile.language}`,
          type: 'shell',
          command: formatter.packageName,
          args: ['.'],
          group: 'build'
        });
      }
    }

    return tasks;
  }

  /**
   * Get stack-specific debug configurations
   */
  private getStackDebugConfigurations(stack: TechnologyStack, versionConfig: WorkspaceVersionConfiguration): IDELaunchConfiguration[] {
    const configs: IDELaunchConfiguration[] = [];

    switch (stack) {
      case 'javascript':
      case 'typescript':
        configs.push({
          name: 'Launch Node.js',
          type: 'node',
          request: 'launch',
          program: '${workspaceFolder}/src/main.js',
          env: versionConfig.environmentVariables
        });
        break;

      case 'python':
        configs.push({
          name: 'Python: Current File',
          type: 'python',
          request: 'launch',
          program: '${file}',
          env: versionConfig.environmentVariables
        });
        break;

      case 'java':
        configs.push({
          name: 'Launch Java',
          type: 'java',
          request: 'launch',
          mainClass: 'Main',
          env: versionConfig.environmentVariables
        });
        break;
    }

    return configs;
  }

  /**
   * Get stack-specific snippets
   */
  private getStackSnippets(stack: TechnologyStack): Record<string, IDESnippet[]> {
    const snippets: Record<string, IDESnippet[]> = {};

    switch (stack) {
      case 'javascript':
        snippets.javascript = [
          {
            name: 'Console Log',
            prefix: 'log',
            body: ['console.log($1);'],
            description: 'Log output to console'
          }
        ];
        break;

      case 'python':
        snippets.python = [
          {
            name: 'Print Statement',
            prefix: 'print',
            body: ['print($1)'],
            description: 'Print to console'
          }
        ];
        break;
    }

    return snippets;
  }

  /**
   * Backup existing configurations
   */
  private async backupExistingConfigurations(context: WorkspaceIntegrationContext): Promise<string[]> {
    const backupPaths: string[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(context.workspacePath, '.hatstart-backups', timestamp);

    try {
      await fs.mkdir(backupDir, { recursive: true });

      // Backup workspace configuration directory
      const workspaceConfigDir = this.getWorkspaceConfigDirectory(context.ideType);
      const configPath = path.join(context.workspacePath, workspaceConfigDir);

      try {
        await fs.access(configPath);
        const backupConfigPath = path.join(backupDir, workspaceConfigDir);
        await this.copyDirectory(configPath, backupConfigPath);
        backupPaths.push(backupConfigPath);
      } catch {
        // Configuration directory doesn't exist, nothing to backup
      }

    } catch {
      // Backup failed, but don't fail the entire operation
    }

    return backupPaths;
  }

  /**
   * Generate integration documentation
   */
  private async generateIntegrationDocumentation(
    context: WorkspaceIntegrationContext,
    result: WorkspaceIDEConfigurationResult
  ): Promise<void> {
    const docContent = `# Workspace IDE Integration Report

## Workspace Information
- **Name**: ${context.workspaceName}
- **Path**: ${context.workspacePath}
- **Technology Stack**: ${context.stack}
- **IDE Type**: ${context.ideType}
- **Template Type**: ${context.templateType}

## Integration Results
- **Success**: ${result.success}
- **Configured Files**: ${result.configuredFiles.length}
- **Installed Extensions**: ${result.installedExtensions.length}
- **Applied Settings**: ${result.appliedSettings.length}

## Configuration Files Created
${result.configuredFiles.map(file => `- ${file}`).join('\n')}

## Extensions Installed
${result.installedExtensions.map(ext => `- ${ext}`).join('\n')}

## Settings Applied
${result.appliedSettings.map(setting => `- ${setting}`).join('\n')}

${result.warnings.length > 0 ? `## Warnings\n${result.warnings.map(warning => `- ${warning}`).join('\n')}` : ''}

${result.errors.length > 0 ? `## Errors\n${result.errors.map(error => `- ${error}`).join('\n')}` : ''}

${result.backupPaths ? `## Backup Locations\n${result.backupPaths.map(path => `- ${path}`).join('\n')}` : ''}

---
Generated on: ${new Date().toISOString()}
`;

    const docPath = path.join(context.workspacePath, '.hatstart-integration-report.md');
    await fs.writeFile(docPath, docContent, 'utf-8');
  }

  /**
   * Utility methods
   */
  private getWorkspaceConfigDirectory(ideType: IDEType): string {
    switch (ideType) {
      case 'vscode':
        return '.vscode';
      case 'cursor':
        return '.cursor';
      case 'jetbrains':
        return '.idea';
      default:
        return '.vscode';
    }
  }

  private flattenSettings(settings: IDEUserSettings | IDEWorkspaceSettings): Record<string, unknown> {
    const flattened: Record<string, unknown> = {};
    
    if ('editor' in settings && settings.editor) {
      Object.assign(flattened, settings.editor);
    }
    if ('languages' in settings && settings.languages) {
      Object.assign(flattened, settings.languages);
    }
    if ('extensions' in settings && settings.extensions) {
      Object.assign(flattened, settings.extensions);
    }
    if ('debug' in settings && settings.debug) {
      Object.assign(flattened, settings.debug);
    }
    if ('terminal' in settings && settings.terminal) {
      Object.assign(flattened, settings.terminal);
    }
    if ('custom' in settings && settings.custom) {
      Object.assign(flattened, settings.custom);
    }

    return flattened;
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Public API methods for external integration
   */

  /**
   * Get available IDE managers
   */
  getAvailableIDEManagers(): IDEType[] {
    return Array.from(this.ideManagers.keys());
  }

  /**
   * Check if IDE is supported
   */
  isIDESupported(ideType: IDEType): boolean {
    return this.ideManagers.has(ideType);
  }

  /**
   * Get default integration options
   */
  getDefaultOptions(): WorkspaceIDEIntegrationOptions {
    return { ...this.defaultOptions };
  }

  /**
   * Update default integration options
   */
  updateDefaultOptions(options: Partial<WorkspaceIDEIntegrationOptions>): void {
    Object.assign(this.defaultOptions, options);
  }
} 