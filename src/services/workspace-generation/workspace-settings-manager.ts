import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export interface SettingDefinition {
  key: string;
  scope: 'user' | 'workspace' | 'both';
  defaultValue: unknown;
  description: string;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  validation?: (value: unknown) => boolean;
}

export interface UserSettings {
  editor: {
    fontSize: number;
    fontFamily: string;
    theme: string;
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: string;
    minimap: boolean;
    lineNumbers: string;
  };
  terminal: {
    shell: string;
    fontSize: number;
    fontFamily: string;
  };
  git: {
    userName?: string;
    userEmail?: string;
    defaultBranch: string;
    autoFetch: boolean;
  };
  extensions: {
    autoUpdate: boolean;
    recommendations: boolean;
  };
  privacy: {
    telemetry: boolean;
    crashReporting: boolean;
  };
}

export interface WorkspaceSettings {
  editor: {
    formatOnSave?: boolean;
    codeActionsOnSave?: Record<string, boolean>;
    rulers?: number[];
    tabSize?: number;
    insertSpaces?: boolean;
    defaultFormatter?: string;
  };
  files: {
    exclude?: Record<string, boolean>;
    watcherExclude?: Record<string, boolean>;
    associations?: Record<string, string>;
  };
  search: {
    exclude?: Record<string, boolean>;
    useIgnoreFiles?: boolean;
  };
  languageSpecific: Record<string, Record<string, unknown>>;
  extensions: {
    recommendations?: string[];
    unwantedRecommendations?: string[];
  };
  tasks: {
    version: string;
    tasks: unknown[];
  };
  launch: {
    version: string;
    configurations: unknown[];
  };
}

export interface SettingsHierarchy {
  userSettings: UserSettings;
  workspaceSettings: WorkspaceSettings;
  effectiveSettings: Record<string, unknown>;
  conflicts: SettingsConflict[];
}

export interface SettingsConflict {
  key: string;
  userValue: unknown;
  workspaceValue: unknown;
  resolvedValue: unknown;
  resolution: 'user' | 'workspace' | 'merged';
  reason: string;
}

export interface SettingsProfile {
  name: string;
  description: string;
  ideType: 'VSCode' | 'Cursor' | 'JetBrains';
  language?: string;
  userSettings: Partial<UserSettings>;
  workspaceSettings: Partial<WorkspaceSettings>;
}

export class WorkspaceSettingsManager {
  private readonly settingDefinitions: Map<string, SettingDefinition>;
  private readonly ideConfigPaths: Map<string, { user: string; workspace: string }>;

  constructor() {
    this.settingDefinitions = new Map();
    this.ideConfigPaths = new Map();
    this.initializeSettingDefinitions();
    this.initializeIDEPaths();
  }

  /**
   * Initialize setting definitions with metadata
   */
  private initializeSettingDefinitions(): void {
    const definitions: SettingDefinition[] = [
      // Editor settings
      {
        key: 'editor.fontSize',
        scope: 'user',
        defaultValue: 14,
        description: 'Font size for the editor',
        category: 'editor',
        type: 'number',
        validation: (value) => typeof value === 'number' && value >= 8 && value <= 72
      },
      {
        key: 'editor.fontFamily',
        scope: 'user',
        defaultValue: 'Consolas, "Courier New", monospace',
        description: 'Font family for the editor',
        category: 'editor',
        type: 'string'
      },
      {
        key: 'editor.theme',
        scope: 'user',
        defaultValue: 'Default Dark+',
        description: 'Color theme for the editor',
        category: 'editor',
        type: 'string'
      },
      {
        key: 'editor.tabSize',
        scope: 'both',
        defaultValue: 4,
        description: 'Number of spaces for tab indentation',
        category: 'editor',
        type: 'number',
        validation: (value) => typeof value === 'number' && value >= 1 && value <= 8
      },
      {
        key: 'editor.insertSpaces',
        scope: 'both',
        defaultValue: true,
        description: 'Insert spaces when pressing Tab',
        category: 'editor',
        type: 'boolean'
      },
      {
        key: 'editor.formatOnSave',
        scope: 'workspace',
        defaultValue: false,
        description: 'Format files when saving',
        category: 'editor',
        type: 'boolean'
      },
      {
        key: 'editor.codeActionsOnSave',
        scope: 'workspace',
        defaultValue: {},
        description: 'Code actions to run on save',
        category: 'editor',
        type: 'object'
      },
      {
        key: 'editor.rulers',
        scope: 'workspace',
        defaultValue: [],
        description: 'Vertical rulers in the editor',
        category: 'editor',
        type: 'array'
      },
      {
        key: 'editor.defaultFormatter',
        scope: 'workspace',
        defaultValue: null,
        description: 'Default formatter for the workspace',
        category: 'editor',
        type: 'string'
      },
      // Files settings
      {
        key: 'files.exclude',
        scope: 'workspace',
        defaultValue: {},
        description: 'Files and folders to exclude from the file explorer',
        category: 'files',
        type: 'object'
      },
      {
        key: 'files.associations',
        scope: 'workspace',
        defaultValue: {},
        description: 'File associations for language modes',
        category: 'files',
        type: 'object'
      },
      // Extensions settings
      {
        key: 'extensions.autoUpdate',
        scope: 'user',
        defaultValue: true,
        description: 'Automatically update extensions',
        category: 'extensions',
        type: 'boolean'
      },
      {
        key: 'extensions.recommendations',
        scope: 'workspace',
        defaultValue: [],
        description: 'Recommended extensions for the workspace',
        category: 'extensions',
        type: 'array'
      },
      // Git settings
      {
        key: 'git.userName',
        scope: 'user',
        defaultValue: '',
        description: 'Git user name',
        category: 'git',
        type: 'string'
      },
      {
        key: 'git.userEmail',
        scope: 'user',
        defaultValue: '',
        description: 'Git user email',
        category: 'git',
        type: 'string'
      }
    ];

    for (const definition of definitions) {
      this.settingDefinitions.set(definition.key, definition);
    }
  }

  /**
   * Initialize IDE-specific configuration paths
   */
  private initializeIDEPaths(): void {
    const homeDir = os.homedir();
    
    // VSCode paths
    let vscodeUserPath: string;
    if (process.platform === 'win32') {
      vscodeUserPath = path.join(homeDir, 'AppData', 'Roaming', 'Code', 'User', 'settings.json');
    } else if (process.platform === 'darwin') {
      vscodeUserPath = path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
    } else {
      vscodeUserPath = path.join(homeDir, '.config', 'Code', 'User', 'settings.json');
    }

    this.ideConfigPaths.set('VSCode', {
      user: vscodeUserPath,
      workspace: '.vscode/settings.json'
    });

    // Cursor paths (similar to VSCode but in Cursor directory)
    let cursorUserPath: string;
    if (process.platform === 'win32') {
      cursorUserPath = path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'User', 'settings.json');
    } else if (process.platform === 'darwin') {
      cursorUserPath = path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json');
    } else {
      cursorUserPath = path.join(homeDir, '.config', 'Cursor', 'User', 'settings.json');
    }

    this.ideConfigPaths.set('Cursor', {
      user: cursorUserPath,
      workspace: '.cursor/settings.json'
    });

    // JetBrains paths (simplified - varies by IDE)
    this.ideConfigPaths.set('JetBrains', {
      user: path.join(homeDir, '.config', 'JetBrains', 'settings.json'),
      workspace: '.idea/workspace.xml'
    });
  }

  /**
   * Load user settings for a specific IDE
   */
  async loadUserSettings(ideType: 'VSCode' | 'Cursor' | 'JetBrains'): Promise<UserSettings> {
    const paths = this.ideConfigPaths.get(ideType);
    if (!paths) {
      throw new Error(`Unsupported IDE type: ${ideType}`);
    }

    try {
      const content = await fs.readFile(paths.user, 'utf-8');
      const settings = JSON.parse(content);
      return this.normalizeUserSettings(settings);
    } catch {
      // Return default user settings if file doesn't exist or is invalid
      return this.getDefaultUserSettings();
    }
  }

  /**
   * Load workspace settings from workspace directory
   */
  async loadWorkspaceSettings(
    workspacePath: string,
    ideType: 'VSCode' | 'Cursor' | 'JetBrains'
  ): Promise<WorkspaceSettings> {
    const paths = this.ideConfigPaths.get(ideType);
    if (!paths) {
      throw new Error(`Unsupported IDE type: ${ideType}`);
    }

    const settingsPath = path.join(workspacePath, paths.workspace);

    try {
      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      return this.normalizeWorkspaceSettings(settings);
    } catch {
      // Return empty workspace settings if file doesn't exist or is invalid
      return this.getDefaultWorkspaceSettings();
    }
  }

  /**
   * Save user settings for a specific IDE
   */
  async saveUserSettings(
    ideType: 'VSCode' | 'Cursor' | 'JetBrains',
    settings: UserSettings
  ): Promise<void> {
    const paths = this.ideConfigPaths.get(ideType);
    if (!paths) {
      throw new Error(`Unsupported IDE type: ${ideType}`);
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(paths.user), { recursive: true });

    // Convert to IDE-specific format and save
    const ideSettings = this.convertToIDEFormat(settings, 'user');
    await fs.writeFile(paths.user, JSON.stringify(ideSettings, null, 2), 'utf-8');
  }

  /**
   * Save workspace settings to workspace directory
   */
  async saveWorkspaceSettings(
    workspacePath: string,
    ideType: 'VSCode' | 'Cursor' | 'JetBrains',
    settings: WorkspaceSettings
  ): Promise<void> {
    const paths = this.ideConfigPaths.get(ideType);
    if (!paths) {
      throw new Error(`Unsupported IDE type: ${ideType}`);
    }

    const settingsPath = path.join(workspacePath, paths.workspace);

    // Ensure directory exists
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });

    // Convert to IDE-specific format and save
    const ideSettings = this.convertToIDEFormat(settings, 'workspace');
    await fs.writeFile(settingsPath, JSON.stringify(ideSettings, null, 2), 'utf-8');
  }

  /**
   * Resolve settings hierarchy and conflicts
   */
  resolveSettingsHierarchy(
    userSettings: UserSettings,
    workspaceSettings: WorkspaceSettings
  ): SettingsHierarchy {
    const effectiveSettings: Record<string, unknown> = {};
    const conflicts: SettingsConflict[] = [];

    // Start with user settings as base
    this.mergeSettings(effectiveSettings, userSettings, 'user');

    // Apply workspace settings with conflict detection
    for (const [key, value] of Object.entries(this.flattenSettings(workspaceSettings))) {
      const definition = this.settingDefinitions.get(key);
      const userValue = this.getNestedValue(userSettings, key);

      if (userValue !== undefined && value !== undefined && userValue !== value) {
        // Conflict detected
        const conflict: SettingsConflict = {
          key,
          userValue,
          workspaceValue: value,
          resolvedValue: value, // Workspace takes precedence
          resolution: 'workspace',
          reason: 'Workspace settings override user settings for project-specific configuration'
        };

        // Special handling for certain settings
        if (definition?.scope === 'user') {
          conflict.resolvedValue = userValue;
          conflict.resolution = 'user';
          conflict.reason = 'User-scoped setting cannot be overridden by workspace';
        } else if (this.canMergeSettings(key, userValue, value)) {
          conflict.resolvedValue = this.mergeSettingValues(userValue, value);
          conflict.resolution = 'merged';
          conflict.reason = 'Settings merged to combine user preferences with workspace requirements';
        }

        conflicts.push(conflict);
        this.setNestedValue(effectiveSettings, key, conflict.resolvedValue);
      } else if (value !== undefined) {
        this.setNestedValue(effectiveSettings, key, value);
      }
    }

    return {
      userSettings,
      workspaceSettings,
      effectiveSettings,
      conflicts
    };
  }

  /**
   * Create language-specific workspace settings
   */
  createLanguageSpecificSettings(
    language: string,
    baseSettings: WorkspaceSettings
  ): WorkspaceSettings {
    const languageSettings = { ...baseSettings };

    // Language-specific configurations
    const languageConfigs: Record<string, Record<string, unknown>> = {
      javascript: {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.codeActionsOnSave': {
          'source.fixAll.eslint': true
        },
        'editor.tabSize': 2,
        'files.associations': {
          '*.js': 'javascript',
          '*.jsx': 'javascriptreact'
        }
      },
      typescript: {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.codeActionsOnSave': {
          'source.fixAll.eslint': true,
          'source.organizeImports': true
        },
        'editor.tabSize': 2,
        'typescript.preferences.quoteStyle': 'single',
        'files.associations': {
          '*.ts': 'typescript',
          '*.tsx': 'typescriptreact'
        }
      },
      python: {
        'editor.defaultFormatter': 'ms-python.black-formatter',
        'editor.codeActionsOnSave': {
          'source.organizeImports': true
        },
        'editor.tabSize': 4,
        'python.formatting.provider': 'black',
        'files.associations': {
          '*.py': 'python',
          '*.pyi': 'python'
        }
      },
      java: {
        'editor.defaultFormatter': 'redhat.java',
        'editor.tabSize': 2,
        'java.format.settings.url': 'https://raw.githubusercontent.com/google/styleguide/gh-pages/eclipse-java-google-style.xml',
        'files.associations': {
          '*.java': 'java'
        }
      }
    };

    const config = languageConfigs[language.toLowerCase()];
    if (config) {
      // Merge language-specific settings
      for (const [key, value] of Object.entries(config)) {
        this.setNestedValue(languageSettings, key, value);
      }

      // Add to language-specific section
      if (!languageSettings.languageSpecific) {
        languageSettings.languageSpecific = {};
      }
      languageSettings.languageSpecific[language] = config;
    }

    return languageSettings;
  }

  /**
   * Apply settings profile to workspace
   */
  async applySettingsProfile(
    workspacePath: string,
    profile: SettingsProfile
  ): Promise<{ success: boolean; appliedSettings: string[]; errors: string[] }> {
    const appliedSettings: string[] = [];
    const errors: string[] = [];

    try {
      // Load current settings
      const currentUser = await this.loadUserSettings(profile.ideType);
      const currentWorkspace = await this.loadWorkspaceSettings(workspacePath, profile.ideType);

      // Merge profile settings
      const newUserSettings = this.deepMerge(currentUser, profile.userSettings) as UserSettings;
      const newWorkspaceSettings = this.deepMerge(currentWorkspace, profile.workspaceSettings) as WorkspaceSettings;

      // Apply language-specific settings if specified
      let finalWorkspaceSettings = newWorkspaceSettings;
      if (profile.language) {
        finalWorkspaceSettings = this.createLanguageSpecificSettings(profile.language, newWorkspaceSettings);
        appliedSettings.push(`language-specific-${profile.language}`);
      }

      // Save updated settings
      await this.saveUserSettings(profile.ideType, newUserSettings);
      appliedSettings.push('user-settings');

      await this.saveWorkspaceSettings(workspacePath, profile.ideType, finalWorkspaceSettings);
      appliedSettings.push('workspace-settings');

      return {
        success: true,
        appliedSettings,
        errors
      };
    } catch (error) {
      errors.push(`Failed to apply settings profile: ${(error as Error).message}`);
      return {
        success: false,
        appliedSettings,
        errors
      };
    }
  }

  /**
   * Get default user settings
   */
  private getDefaultUserSettings(): UserSettings {
    return {
      editor: {
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        theme: 'Default Dark+',
        tabSize: 4,
        insertSpaces: true,
        wordWrap: 'off',
        minimap: true,
        lineNumbers: 'on'
      },
      terminal: {
        shell: process.platform === 'win32' ? 'powershell' : '/bin/bash',
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace'
      },
      git: {
        defaultBranch: 'main',
        autoFetch: true
      },
      extensions: {
        autoUpdate: true,
        recommendations: true
      },
      privacy: {
        telemetry: false,
        crashReporting: false
      }
    };
  }

  /**
   * Get default workspace settings
   */
  private getDefaultWorkspaceSettings(): WorkspaceSettings {
    return {
      editor: {},
      files: {
        exclude: {
          '**/node_modules': true,
          '**/.git': true,
          '**/.DS_Store': true
        }
      },
      search: {
        exclude: {
          '**/node_modules': true,
          '**/bower_components': true
        },
        useIgnoreFiles: true
      },
      languageSpecific: {},
      extensions: {
        recommendations: [],
        unwantedRecommendations: []
      },
      tasks: {
        version: '2.0.0',
        tasks: []
      },
      launch: {
        version: '0.2.0',
        configurations: []
      }
    };
  }

  /**
   * Normalize user settings to standard format
   */
  private normalizeUserSettings(settings: Record<string, unknown>): UserSettings {
    const defaults = this.getDefaultUserSettings();
    return this.deepMerge(defaults, settings) as UserSettings;
  }

  /**
   * Normalize workspace settings to standard format
   */
  private normalizeWorkspaceSettings(settings: Record<string, unknown>): WorkspaceSettings {
    const defaults = this.getDefaultWorkspaceSettings();
    return this.deepMerge(defaults, settings) as WorkspaceSettings;
  }

  /**
   * Convert settings to IDE-specific format
   */
  private convertToIDEFormat(
    settings: UserSettings | WorkspaceSettings,
    _scope: 'user' | 'workspace'
  ): Record<string, unknown> {
    // For VSCode/Cursor, the format is already correct
    // For other IDEs, this would need specific conversion logic
    return this.flattenSettings(settings);
  }

  /**
   * Flatten nested settings object
   */
  private flattenSettings(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const flattened: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenSettings(value as Record<string, unknown>, newKey));
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key] as Record<string, unknown>;
    }, obj);

    target[lastKey] = value;
  }

  /**
   * Merge settings objects
   */
  private mergeSettings(target: Record<string, unknown>, source: Record<string, unknown>, scope: string): void {
    for (const [key, value] of Object.entries(this.flattenSettings(source))) {
      const definition = this.settingDefinitions.get(key);
      if (!definition || definition.scope === scope || definition.scope === 'both') {
        this.setNestedValue(target, key, value);
      }
    }
  }

  /**
   * Check if settings can be merged
   */
  private canMergeSettings(key: string, userValue: unknown, workspaceValue: unknown): boolean {
    // Arrays and objects can often be merged
    return (Array.isArray(userValue) && Array.isArray(workspaceValue)) ||
           (typeof userValue === 'object' && typeof workspaceValue === 'object' && 
            userValue !== null && workspaceValue !== null);
  }

  /**
   * Merge setting values
   */
  private mergeSettingValues(userValue: unknown, workspaceValue: unknown): unknown {
    if (Array.isArray(userValue) && Array.isArray(workspaceValue)) {
      return [...userValue, ...workspaceValue];
    }
    
    if (typeof userValue === 'object' && typeof workspaceValue === 'object' && 
        userValue !== null && workspaceValue !== null) {
      return this.deepMerge(userValue, workspaceValue);
    }

    return workspaceValue; // Default to workspace value
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: unknown, source: unknown): unknown {
    if (typeof target !== 'object' || target === null || typeof source !== 'object' || source === null) {
      return source;
    }

    const result = { ...target } as Record<string, unknown>;

    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
} 