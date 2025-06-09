/**
 * IDE Settings Generator
 * Generates IDE-specific configuration files based on project requirements and technology stack
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type {
  ConfigValue,
  IDEConfigurationProfile,
  IDEConfigurationResult,
  IDELaunchConfiguration,
  IDESnippet,
  IDETask,
  IDEType,
  IDEWorkspaceSettings
} from './types';

/**
 * Project technology stack information
 */
export interface ProjectTechStack {
  /** Primary language */
  primaryLanguage: string;
  /** Additional languages used */
  languages: string[];
  /** Frameworks and libraries */
  frameworks: string[];
  /** Build tools */
  buildTools: string[];
  /** Testing frameworks */
  testingFrameworks: string[];
  /** Package managers */
  packageManagers: string[];
  /** Development tools */
  devTools: string[];
  /** Database systems */
  databases: string[];
  /** Cloud platforms */
  cloudPlatforms: string[];
}

/**
 * Project configuration preferences
 */
export interface ProjectPreferences {
  /** Code formatting preferences */
  formatting: {
    indentSize: number;
    indentType: 'spaces' | 'tabs';
    maxLineLength: number;
    insertFinalNewline: boolean;
    trimTrailingWhitespace: boolean;
  };
  /** Linting preferences */
  linting: {
    enabled: boolean;
    strictMode: boolean;
    autoFixOnSave: boolean;
  };
  /** Git integration preferences */
  git: {
    autoStage: boolean;
    showInlineBlame: boolean;
    enableGitLens: boolean;
  };
  /** Debug configuration preferences */
  debugging: {
    enableBreakpoints: boolean;
    showVariableTypes: boolean;
    enableHotReload: boolean;
  };
  /** Terminal preferences */
  terminal: {
    defaultShell: string;
    fontSize: number;
    enableBell: boolean;
  };
}

/**
 * Settings generation context
 */
export interface SettingsGenerationContext {
  /** Project root directory */
  projectRoot: string;
  /** Project name */
  projectName: string;
  /** Technology stack */
  techStack: ProjectTechStack;
  /** User preferences */
  preferences: ProjectPreferences;
  /** Target IDE */
  ideType: IDEType;
  /** Additional custom settings */
  customSettings?: Record<string, ConfigValue>;
}

/**
 * Settings template for specific technology
 */
export interface SettingsTemplate {
  /** Template name */
  name: string;
  /** Supported languages */
  languages: string[];
  /** Supported frameworks */
  frameworks: string[];
  /** Generate workspace settings */
  generateWorkspaceSettings(context: SettingsGenerationContext): IDEWorkspaceSettings;
  /** Generate tasks */
  generateTasks(context: SettingsGenerationContext): IDETask[];
  /** Generate launch configurations */
  generateLaunchConfigurations(context: SettingsGenerationContext): IDELaunchConfiguration[];
  /** Generate snippets */
  generateSnippets(context: SettingsGenerationContext): Record<string, IDESnippet[]>;
}

/**
 * Main settings generator class
 */
export class SettingsGenerator {
  private readonly templates: Map<string, SettingsTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Register a settings template
   */
  registerTemplate(template: SettingsTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Generate complete IDE configuration profile
   */
  async generateProfile(context: SettingsGenerationContext): Promise<IDEConfigurationProfile> {
    const workspaceSettings = this.generateWorkspaceSettings(context);
    const tasks = this.generateTasks(context);
    const launchConfigurations = this.generateLaunchConfigurations(context);
    const snippets = this.generateSnippets(context);

    return {
      name: `${context.projectName}-${context.ideType}`,
      description: `Generated configuration for ${context.projectName}`,
      ideType: context.ideType,
      extensions: [], // Extensions will be handled by ExtensionManager
      workspaceSettings,
      tasks,
      launchConfigurations,
      snippets
    };
  }

  /**
   * Generate workspace settings
   */
  generateWorkspaceSettings(context: SettingsGenerationContext): IDEWorkspaceSettings {
    const baseSettings: IDEWorkspaceSettings = {
      editor: this.generateEditorSettings(context),
      languages: this.generateLanguageSettings(context),
      extensions: this.generateExtensionSettings(context),
      debug: this.generateDebugSettings(context),
      terminal: this.generateTerminalSettings(context)
    };

    // Apply template-specific settings
    const applicableTemplates = this.getApplicableTemplates(context);
    for (const template of applicableTemplates) {
      const templateSettings = template.generateWorkspaceSettings(context);
      this.mergeSettings(baseSettings, templateSettings);
    }

    return baseSettings;
  }

  /**
   * Generate tasks configuration
   */
  generateTasks(context: SettingsGenerationContext): IDETask[] {
    const tasks: IDETask[] = [];

    // Add common tasks based on tech stack
    if (context.techStack.packageManagers.includes('npm')) {
      tasks.push(...this.generateNpmTasks(context));
    }

    if (context.techStack.packageManagers.includes('yarn')) {
      tasks.push(...this.generateYarnTasks(context));
    }

    if (context.techStack.buildTools.includes('vite')) {
      tasks.push(...this.generateViteTasks(context));
    }

    if (context.techStack.buildTools.includes('webpack')) {
      tasks.push(...this.generateWebpackTasks(context));
    }

    if (context.techStack.testingFrameworks.length > 0) {
      tasks.push(...this.generateTestTasks(context));
    }

    // Apply template-specific tasks
    const applicableTemplates = this.getApplicableTemplates(context);
    for (const template of applicableTemplates) {
      tasks.push(...template.generateTasks(context));
    }

    return tasks;
  }

  /**
   * Generate launch configurations
   */
  generateLaunchConfigurations(context: SettingsGenerationContext): IDELaunchConfiguration[] {
    const configurations: IDELaunchConfiguration[] = [];

    // Generate configurations based on primary language
    switch (context.techStack.primaryLanguage) {
      case 'typescript':
      case 'javascript':
        configurations.push(...this.generateNodeLaunchConfigurations(context));
        break;
      case 'python':
        configurations.push(...this.generatePythonLaunchConfigurations(context));
        break;
      case 'java':
        configurations.push(...this.generateJavaLaunchConfigurations(context));
        break;
      case 'csharp':
        configurations.push(...this.generateDotNetLaunchConfigurations(context));
        break;
    }

    // Apply template-specific configurations
    const applicableTemplates = this.getApplicableTemplates(context);
    for (const template of applicableTemplates) {
      configurations.push(...template.generateLaunchConfigurations(context));
    }

    return configurations;
  }

  /**
   * Generate code snippets
   */
  generateSnippets(context: SettingsGenerationContext): Record<string, IDESnippet[]> {
    const snippets: Record<string, IDESnippet[]> = {};

    // Generate language-specific snippets
    for (const language of context.techStack.languages) {
      snippets[language] = this.generateLanguageSnippets(language, context);
    }

    // Apply template-specific snippets
    const applicableTemplates = this.getApplicableTemplates(context);
    for (const template of applicableTemplates) {
      const templateSnippets = template.generateSnippets(context);
      for (const [lang, langSnippets] of Object.entries(templateSnippets)) {
        if (!snippets[lang]) {
          snippets[lang] = [];
        }
        snippets[lang].push(...langSnippets);
      }
    }

    return snippets;
  }

  /**
   * Write configuration files to disk
   */
  async writeConfiguration(
    context: SettingsGenerationContext,
    profile: IDEConfigurationProfile
  ): Promise<IDEConfigurationResult> {
    try {
      const configDir = this.getConfigurationDirectory(context);
      await fs.mkdir(configDir, { recursive: true });

      const files: string[] = [];

      // Write workspace settings
      if (profile.workspaceSettings) {
        const settingsFile = await this.writeWorkspaceSettings(configDir, profile.workspaceSettings, context.ideType);
        files.push(settingsFile);
      }

      // Write tasks
      if (profile.tasks && profile.tasks.length > 0) {
        const tasksFile = await this.writeTasks(configDir, profile.tasks, context.ideType);
        files.push(tasksFile);
      }

      // Write launch configurations
      if (profile.launchConfigurations && profile.launchConfigurations.length > 0) {
        const launchFile = await this.writeLaunchConfigurations(configDir, profile.launchConfigurations, context.ideType);
        files.push(launchFile);
      }

      // Write snippets
      if (profile.snippets) {
        const snippetFiles = await this.writeSnippets(configDir, profile.snippets, context.ideType);
        files.push(...snippetFiles);
      }

      return {
        success: true,
        configured: {
          files
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Error writing configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate editor settings
   */
  private generateEditorSettings(context: SettingsGenerationContext): Record<string, ConfigValue> {
    const { preferences } = context;
    
    return {
      'editor.tabSize': preferences.formatting.indentSize,
      'editor.insertSpaces': preferences.formatting.indentType === 'spaces',
      'editor.rulers': [preferences.formatting.maxLineLength],
      'editor.trimAutoWhitespace': preferences.linting.autoFixOnSave,
      'editor.formatOnSave': preferences.linting.autoFixOnSave,
      'files.insertFinalNewline': preferences.formatting.insertFinalNewline,
      'files.trimTrailingWhitespace': preferences.formatting.trimTrailingWhitespace,
      'editor.codeActionsOnSave': {
        'source.fixAll.eslint': preferences.linting.autoFixOnSave
      }
    };
  }

  /**
   * Generate language-specific settings
   */
  private generateLanguageSettings(context: SettingsGenerationContext): Record<string, Record<string, ConfigValue>> {
    const languageSettings: Record<string, Record<string, ConfigValue>> = {};

    for (const language of context.techStack.languages) {
      switch (language) {
        case 'typescript':
          languageSettings['[typescript]'] = {
            'editor.defaultFormatter': 'esbenp.prettier-vscode',
            'editor.codeActionsOnSave': {
              'source.organizeImports': true
            }
          };
          break;
        case 'javascript':
          languageSettings['[javascript]'] = {
            'editor.defaultFormatter': 'esbenp.prettier-vscode'
          };
          break;
        case 'python':
          languageSettings['[python]'] = {
            'editor.defaultFormatter': 'ms-python.black-formatter',
            'editor.formatOnSave': true
          };
          break;
        case 'json':
          languageSettings['[json]'] = {
            'editor.defaultFormatter': 'esbenp.prettier-vscode'
          };
          break;
      }
    }

    return languageSettings;
  }

  /**
   * Generate extension-specific settings
   */
  private generateExtensionSettings(context: SettingsGenerationContext): Record<string, ConfigValue> {
    const settings: Record<string, ConfigValue> = {};

    // ESLint settings
    if (context.techStack.languages.some(lang => ['typescript', 'javascript'].includes(lang))) {
      settings['eslint.enable'] = context.preferences.linting.enabled;
      settings['eslint.autoFixOnSave'] = context.preferences.linting.autoFixOnSave;
    }

    // Prettier settings
    if (context.techStack.devTools.includes('prettier')) {
      settings['prettier.tabWidth'] = context.preferences.formatting.indentSize;
      settings['prettier.useTabs'] = context.preferences.formatting.indentType === 'tabs';
      settings['prettier.printWidth'] = context.preferences.formatting.maxLineLength;
    }

    // Git settings
    settings['git.autofetch'] = context.preferences.git.autoStage;
    settings['git.showInlineOpenFileAction'] = context.preferences.git.showInlineBlame;

    return settings;
  }

  /**
   * Generate debug settings
   */
  private generateDebugSettings(context: SettingsGenerationContext): Record<string, ConfigValue> {
    return {
      'debug.allowBreakpointsEverywhere': context.preferences.debugging.enableBreakpoints,
      'debug.showVariableTypes': context.preferences.debugging.showVariableTypes,
      'debug.inlineValues': context.preferences.debugging.showVariableTypes
    };
  }

  /**
   * Generate terminal settings
   */
  private generateTerminalSettings(context: SettingsGenerationContext): Record<string, ConfigValue> {
    return {
      'terminal.integrated.defaultProfile.osx': context.preferences.terminal.defaultShell,
      'terminal.integrated.defaultProfile.linux': context.preferences.terminal.defaultShell,
      'terminal.integrated.defaultProfile.windows': context.preferences.terminal.defaultShell,
      'terminal.integrated.fontSize': context.preferences.terminal.fontSize,
      'terminal.integrated.enableBell': context.preferences.terminal.enableBell
    };
  }

  /**
   * Generate NPM tasks
   */
  private generateNpmTasks(_context: SettingsGenerationContext): IDETask[] {
    return [
      {
        label: 'npm: install',
        type: 'shell',
        command: 'npm',
        args: ['install'],
        group: 'build',
        problemMatcher: []
      },
      {
        label: 'npm: start',
        type: 'shell',
        command: 'npm',
        args: ['start'],
        group: 'build',
        isDefault: true
      },
      {
        label: 'npm: build',
        type: 'shell',
        command: 'npm',
        args: ['run', 'build'],
        group: 'build'
      },
      {
        label: 'npm: test',
        type: 'shell',
        command: 'npm',
        args: ['test'],
        group: 'test'
      }
    ];
  }

  /**
   * Generate Yarn tasks
   */
  private generateYarnTasks(_context: SettingsGenerationContext): IDETask[] {
    return [
      {
        label: 'yarn: install',
        type: 'shell',
        command: 'yarn',
        args: ['install'],
        group: 'build'
      },
      {
        label: 'yarn: start',
        type: 'shell',
        command: 'yarn',
        args: ['start'],
        group: 'build',
        isDefault: true
      },
      {
        label: 'yarn: build',
        type: 'shell',
        command: 'yarn',
        args: ['build'],
        group: 'build'
      },
      {
        label: 'yarn: test',
        type: 'shell',
        command: 'yarn',
        args: ['test'],
        group: 'test'
      }
    ];
  }

  /**
   * Generate Vite tasks
   */
  private generateViteTasks(_context: SettingsGenerationContext): IDETask[] {
    return [
      {
        label: 'vite: dev',
        type: 'shell',
        command: 'npm',
        args: ['run', 'dev'],
        group: 'build',
        isDefault: true
      },
      {
        label: 'vite: build',
        type: 'shell',
        command: 'npm',
        args: ['run', 'build'],
        group: 'build'
      },
      {
        label: 'vite: preview',
        type: 'shell',
        command: 'npm',
        args: ['run', 'preview'],
        group: 'build'
      }
    ];
  }

  /**
   * Generate Webpack tasks
   */
  private generateWebpackTasks(_context: SettingsGenerationContext): IDETask[] {
    return [
      {
        label: 'webpack: dev',
        type: 'shell',
        command: 'npm',
        args: ['run', 'dev'],
        group: 'build',
        isDefault: true
      },
      {
        label: 'webpack: build',
        type: 'shell',
        command: 'npm',
        args: ['run', 'build'],
        group: 'build'
      }
    ];
  }

  /**
   * Generate test tasks
   */
  private generateTestTasks(context: SettingsGenerationContext): IDETask[] {
    const tasks: IDETask[] = [];

    if (context.techStack.testingFrameworks.includes('jest')) {
      tasks.push({
        label: 'jest: test',
        type: 'shell',
        command: 'npm',
        args: ['run', 'test'],
        group: 'test'
      });
    }

    if (context.techStack.testingFrameworks.includes('vitest')) {
      tasks.push({
        label: 'vitest: test',
        type: 'shell',
        command: 'npm',
        args: ['run', 'test'],
        group: 'test'
      });
    }

    return tasks;
  }

  /**
   * Generate Node.js launch configurations
   */
  private generateNodeLaunchConfigurations(_context: SettingsGenerationContext): IDELaunchConfiguration[] {
    return [
      {
        name: 'Launch Program',
        type: 'node',
        request: 'launch',
        program: '${workspaceFolder}/src/index.ts',
        outFiles: ['${workspaceFolder}/dist/**/*'],
        env: {
          NODE_ENV: 'development'
        }
      },
      {
        name: 'Attach to Process',
        type: 'node',
        request: 'attach',
        port: 9229
      }
    ];
  }

  /**
   * Generate Python launch configurations
   */
  private generatePythonLaunchConfigurations(_context: SettingsGenerationContext): IDELaunchConfiguration[] {
    return [
      {
        name: 'Python: Current File',
        type: 'python',
        request: 'launch',
        program: '${file}',
        cwd: '${workspaceFolder}'
      },
      {
        name: 'Python: Module',
        type: 'python',
        request: 'launch',
        program: '${workspaceFolder}/main.py',
        cwd: '${workspaceFolder}'
      }
    ];
  }

  /**
   * Generate Java launch configurations
   */
  private generateJavaLaunchConfigurations(_context: SettingsGenerationContext): IDELaunchConfiguration[] {
    return [
      {
        name: 'Launch Java Program',
        type: 'java',
        request: 'launch',
        mainClass: 'Main',
        cwd: '${workspaceFolder}'
      }
    ];
  }

  /**
   * Generate .NET launch configurations
   */
  private generateDotNetLaunchConfigurations(_context: SettingsGenerationContext): IDELaunchConfiguration[] {
    return [
      {
        name: 'Launch .NET Core',
        type: 'coreclr',
        request: 'launch',
        program: '${workspaceFolder}/bin/Debug/net6.0/${workspaceFolderBasename}.dll',
        cwd: '${workspaceFolder}'
      }
    ];
  }

  /**
   * Generate language-specific snippets
   */
  private generateLanguageSnippets(language: string, _context: SettingsGenerationContext): IDESnippet[] {
    const snippets: IDESnippet[] = [];

    switch (language) {
      case 'typescript':
        snippets.push(
          {
            name: 'React Functional Component',
            prefix: 'rfc',
            body: [
              'import React from \'react\';',
              '',
              'interface ${1:ComponentName}Props {',
              '  $2',
              '}',
              '',
              'const ${1:ComponentName}: React.FC<${1:ComponentName}Props> = ({ $3 }) => {',
              '  return (',
              '    <div>',
              '      $4',
              '    </div>',
              '  );',
              '};',
              '',
              'export default ${1:ComponentName};'
            ],
            description: 'Create a React functional component with TypeScript'
          }
        );
        break;
      case 'javascript':
        snippets.push(
          {
            name: 'Console Log',
            prefix: 'log',
            body: ['console.log($1);'],
            description: 'Log output to console'
          }
        );
        break;
    }

    return snippets;
  }

  /**
   * Get applicable templates for the context
   */
  private getApplicableTemplates(context: SettingsGenerationContext): SettingsTemplate[] {
    const applicable: SettingsTemplate[] = [];

    for (const template of this.templates.values()) {
      const hasLanguage = template.languages.some(lang => 
        context.techStack.languages.includes(lang)
      );
      const hasFramework = template.frameworks.some(fw => 
        context.techStack.frameworks.includes(fw)
      );

      if (hasLanguage || hasFramework) {
        applicable.push(template);
      }
    }

    return applicable;
  }

  /**
   * Merge settings objects
   */
  private mergeSettings(target: IDEWorkspaceSettings, source: IDEWorkspaceSettings): void {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!target[key as keyof IDEWorkspaceSettings]) {
          (target as Record<string, unknown>)[key] = {};
        }
        Object.assign(target[key as keyof IDEWorkspaceSettings] as Record<string, unknown>, value);
      } else {
        (target as Record<string, unknown>)[key] = value;
      }
    }
  }

  /**
   * Get configuration directory for IDE
   */
  private getConfigurationDirectory(context: SettingsGenerationContext): string {
    switch (context.ideType) {
      case 'vscode':
      case 'cursor':
        return join(context.projectRoot, '.vscode');
      case 'jetbrains':
        return join(context.projectRoot, '.idea');
      default:
        return join(context.projectRoot, '.ide-config');
    }
  }

  /**
   * Write workspace settings to file
   */
  private async writeWorkspaceSettings(
    configDir: string,
    settings: IDEWorkspaceSettings,
    ideType: IDEType
  ): Promise<string> {
    const fileName = ideType === 'jetbrains' ? 'workspace.xml' : 'settings.json';
    const filePath = join(configDir, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf8');
    return filePath;
  }

  /**
   * Write tasks to file
   */
  private async writeTasks(
    configDir: string,
    tasks: IDETask[],
    ideType: IDEType
  ): Promise<string> {
    const fileName = ideType === 'jetbrains' ? 'runConfigurations.xml' : 'tasks.json';
    const filePath = join(configDir, fileName);
    
    const tasksConfig = {
      version: '2.0.0',
      tasks
    };
    
    await fs.writeFile(filePath, JSON.stringify(tasksConfig, null, 2), 'utf8');
    return filePath;
  }

  /**
   * Write launch configurations to file
   */
  private async writeLaunchConfigurations(
    configDir: string,
    configurations: IDELaunchConfiguration[],
    ideType: IDEType
  ): Promise<string> {
    const fileName = ideType === 'jetbrains' ? 'runConfigurations.xml' : 'launch.json';
    const filePath = join(configDir, fileName);
    
    const launchConfig = {
      version: '0.2.0',
      configurations
    };
    
    await fs.writeFile(filePath, JSON.stringify(launchConfig, null, 2), 'utf8');
    return filePath;
  }

  /**
   * Write snippets to files
   */
  private async writeSnippets(
    configDir: string,
    snippets: Record<string, IDESnippet[]>,
    ideType: IDEType
  ): Promise<string[]> {
    const files: string[] = [];
    
    if (ideType === 'vscode' || ideType === 'cursor') {
      const snippetsDir = join(configDir, 'snippets');
      await fs.mkdir(snippetsDir, { recursive: true });
      
      for (const [language, langSnippets] of Object.entries(snippets)) {
        const fileName = `${language}.json`;
        const filePath = join(snippetsDir, fileName);
        
        const snippetConfig: Record<string, Omit<IDESnippet, 'name'>> = {};
        for (const snippet of langSnippets) {
          snippetConfig[snippet.name] = {
            prefix: snippet.prefix,
            body: snippet.body,
            description: snippet.description
          };
        }
        
        await fs.writeFile(filePath, JSON.stringify(snippetConfig, null, 2), 'utf8');
        files.push(filePath);
      }
    }
    
    return files;
  }

  /**
   * Register default templates
   */
  private registerDefaultTemplates(): void {
    // React template
    this.registerTemplate({
      name: 'react',
      languages: ['typescript', 'javascript'],
      frameworks: ['react'],
      generateWorkspaceSettings: (_context) => ({
        extensions: {
          'emmet.includeLanguages': {
            'javascript': 'javascriptreact',
            'typescript': 'typescriptreact'
          }
        }
      }),
      generateTasks: () => [],
      generateLaunchConfigurations: () => [],
      generateSnippets: () => ({})
    });

    // Vue template
    this.registerTemplate({
      name: 'vue',
      languages: ['typescript', 'javascript'],
      frameworks: ['vue'],
      generateWorkspaceSettings: () => ({
        extensions: {
          'vetur.validation.template': false
        }
      }),
      generateTasks: () => [],
      generateLaunchConfigurations: () => [],
      generateSnippets: () => ({})
    });
  }
} 