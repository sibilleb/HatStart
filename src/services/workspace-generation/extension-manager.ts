import { promises as fs } from 'fs';
import * as path from 'path';
import { IDEType } from '../ide-configuration/types';
import { TechnologyStack } from './workspace-requirements-service';

export interface ExtensionRecommendation {
  id: string;
  name: string;
  description: string;
  publisher?: string;
  version?: string;
  required: boolean;
  category: ExtensionCategory;
  supportedIDEs: IDEType[];
  supportedLanguages: TechnologyStack[];
  conflictsWith?: string[];
  dependsOn?: string[];
  settings?: Record<string, unknown>;
}

export enum ExtensionCategory {
  LANGUAGE_SUPPORT = 'language-support',
  LINTING = 'linting',
  FORMATTING = 'formatting',
  DEBUGGING = 'debugging',
  VERSION_CONTROL = 'version-control',
  TESTING = 'testing',
  PRODUCTIVITY = 'productivity',
  THEMES = 'themes',
  SNIPPETS = 'snippets',
  DOCUMENTATION = 'documentation',
  BUILD_TOOLS = 'build-tools',
  PACKAGE_MANAGEMENT = 'package-management',
  DATABASE = 'database',
  CLOUD = 'cloud',
  SECURITY = 'security',
}

export interface ExtensionConfiguration {
  recommendations: string[];
  unwantedRecommendations: string[];
  settings: Record<string, unknown>;
  keybindings?: Array<{
    key: string;
    command: string;
    when?: string;
  }>;
  tasks?: Array<{
    type: string;
    label: string;
    command: string;
    group?: string;
  }>;
}

export interface WorkspaceExtensionProfile {
  stack: TechnologyStack;
  ide: IDEType;
  extensions: ExtensionRecommendation[];
  configuration: ExtensionConfiguration;
  installationInstructions: string[];
  conflictResolution: string[];
}

export class ExtensionManager {
  private extensionDatabase: Map<string, ExtensionRecommendation>;
  private stackExtensionMap: Map<TechnologyStack, string[]>;
  private ideExtensionMap: Map<IDEType, string[]>;

  constructor() {
    this.extensionDatabase = new Map();
    this.stackExtensionMap = new Map();
    this.ideExtensionMap = new Map();
    this.initializeExtensionDatabase();
  }

  /**
   * Get extension recommendations for a specific technology stack and IDE
   */
  getExtensionsForStack(
    stack: TechnologyStack,
    ide: IDEType,
    includeOptional: boolean = true
  ): ExtensionRecommendation[] {
    const stackExtensions = this.stackExtensionMap.get(stack) || [];
    const ideExtensions = this.ideExtensionMap.get(ide) || [];
    
    // Get extensions that support both the stack and IDE
    const relevantExtensionIds = stackExtensions.filter(id => {
      const extension = this.extensionDatabase.get(id);
      return extension && 
             extension.supportedIDEs.includes(ide) &&
             extension.supportedLanguages.includes(stack) &&
             (includeOptional || extension.required);
    });

    // Add IDE-specific extensions that are general purpose
    const generalExtensions = ideExtensions.filter(id => {
      const extension = this.extensionDatabase.get(id);
      return extension && 
             (extension.supportedLanguages.length === 0 || extension.supportedLanguages.includes(stack)) &&
             (includeOptional || extension.required);
    });

    const allExtensionIds = [...new Set([...relevantExtensionIds, ...generalExtensions])];
    
    return allExtensionIds
      .map(id => this.extensionDatabase.get(id))
      .filter((ext): ext is ExtensionRecommendation => ext !== undefined)
      .sort((a, b) => {
        // Sort by required first, then by category
        if (a.required !== b.required) {
          return a.required ? -1 : 1;
        }
        return a.category.localeCompare(b.category);
      });
  }

  /**
   * Generate workspace extension profile
   */
  generateWorkspaceProfile(
    stack: TechnologyStack,
    ide: IDEType,
    customExtensions: string[] = [],
    excludeExtensions: string[] = []
  ): WorkspaceExtensionProfile {
    let extensions = this.getExtensionsForStack(stack, ide);
    
    // Add custom extensions
    for (const customId of customExtensions) {
      const customExt = this.extensionDatabase.get(customId);
      if (customExt && customExt.supportedIDEs.includes(ide)) {
        extensions.push(customExt);
      }
    }

    // Remove excluded extensions
    extensions = extensions.filter(ext => !excludeExtensions.includes(ext.id));

    // Resolve conflicts
    extensions = this.resolveConflicts(extensions);

    const configuration = this.generateExtensionConfiguration(extensions, stack, ide);
    const installationInstructions = this.generateInstallationInstructions(extensions, ide);
    const conflictResolution = this.generateConflictResolution(extensions);

    return {
      stack,
      ide,
      extensions,
      configuration,
      installationInstructions,
      conflictResolution,
    };
  }

  /**
   * Generate IDE-specific extension configuration files
   */
  async generateExtensionFiles(
    workspacePath: string,
    profile: WorkspaceExtensionProfile
  ): Promise<string[]> {
    const generatedFiles: string[] = [];

    switch (profile.ide) {
      case IDEType.VSCode:
        generatedFiles.push(...await this.generateVSCodeExtensionFiles(workspacePath, profile));
        break;
      case IDEType.Cursor:
        generatedFiles.push(...await this.generateCursorExtensionFiles(workspacePath, profile));
        break;
      case IDEType.IntelliJIDEA:
      case IDEType.WebStorm:
      case IDEType.PyCharm:
        generatedFiles.push(...await this.generateJetBrainsExtensionFiles(workspacePath, profile));
        break;
      default:
        throw new Error(`Unsupported IDE: ${profile.ide}`);
    }

    return generatedFiles;
  }

  /**
   * Initialize the extension database with predefined extensions
   */
  private initializeExtensionDatabase(): void {
    const extensions: ExtensionRecommendation[] = [
      // JavaScript/TypeScript Extensions
      {
        id: 'ms-vscode.vscode-typescript-next',
        name: 'TypeScript Importer',
        description: 'Automatically searches for TypeScript definitions',
        required: true,
        category: ExtensionCategory.LANGUAGE_SUPPORT,
        supportedIDEs: [IDEType.VSCode, IDEType.Cursor],
        supportedLanguages: ['javascript', 'typescript'],
      },
      {
        id: 'esbenp.prettier-vscode',
        name: 'Prettier - Code formatter',
        description: 'Code formatter using prettier',
        required: true,
        category: ExtensionCategory.FORMATTING,
        supportedIDEs: [IDEType.VSCode, IDEType.Cursor],
        supportedLanguages: ['javascript', 'typescript'],
      },
      {
        id: 'dbaeumer.vscode-eslint',
        name: 'ESLint',
        description: 'Integrates ESLint JavaScript into VS Code',
        required: true,
        category: ExtensionCategory.LINTING,
        supportedIDEs: [IDEType.VSCode, IDEType.Cursor],
        supportedLanguages: ['javascript', 'typescript'],
      },

      // Python Extensions
      {
        id: 'ms-python.python',
        name: 'Python',
        description: 'IntelliSense, linting, debugging, code navigation',
        required: true,
        category: ExtensionCategory.LANGUAGE_SUPPORT,
        supportedIDEs: [IDEType.VSCode, IDEType.Cursor],
        supportedLanguages: ['python'],
      },
      {
        id: 'ms-python.black-formatter',
        name: 'Black Formatter',
        description: 'Formatting support for Python using Black',
        required: true,
        category: ExtensionCategory.FORMATTING,
        supportedIDEs: [IDEType.VSCode, IDEType.Cursor],
        supportedLanguages: ['python'],
      },

      // Java Extensions
      {
        id: 'redhat.java',
        name: 'Language Support for Java',
        description: 'Java language support via Eclipse JDT Language Server',
        required: true,
        category: ExtensionCategory.LANGUAGE_SUPPORT,
        supportedIDEs: [IDEType.VSCode, IDEType.Cursor],
        supportedLanguages: ['java'],
      },

      // General Purpose Extensions
      {
        id: 'ms-vscode.vscode-json',
        name: 'JSON',
        description: 'JSON language support',
        required: true,
        category: ExtensionCategory.LANGUAGE_SUPPORT,
        supportedIDEs: [IDEType.VSCode, IDEType.Cursor],
        supportedLanguages: [], // Supports all languages
      },
      {
        id: 'eamodio.gitlens',
        name: 'GitLens',
        description: 'Supercharge Git capabilities',
        required: false,
        category: ExtensionCategory.VERSION_CONTROL,
        supportedIDEs: [IDEType.VSCode, IDEType.Cursor],
        supportedLanguages: [], // Supports all languages
      },
    ];

    // Populate the database and mappings
    for (const extension of extensions) {
      this.extensionDatabase.set(extension.id, extension);
      
      // Populate stack-extension mapping
      for (const stack of extension.supportedLanguages) {
        if (!this.stackExtensionMap.has(stack)) {
          this.stackExtensionMap.set(stack, []);
        }
        this.stackExtensionMap.get(stack)!.push(extension.id);
      }

      // Add general-purpose extensions to all stacks
      if (extension.supportedLanguages.length === 0) {
        for (const stack of Object.values(TechnologyStack)) {
          if (!this.stackExtensionMap.has(stack)) {
            this.stackExtensionMap.set(stack, []);
          }
          this.stackExtensionMap.get(stack)!.push(extension.id);
        }
      }

      // Populate IDE-extension mapping
      for (const ide of extension.supportedIDEs) {
        if (!this.ideExtensionMap.has(ide)) {
          this.ideExtensionMap.set(ide, []);
        }
        this.ideExtensionMap.get(ide)!.push(extension.id);
      }
    }
  }

  /**
   * Resolve conflicts between extensions
   */
  private resolveConflicts(extensions: ExtensionRecommendation[]): ExtensionRecommendation[] {
    const resolved: ExtensionRecommendation[] = [];
    const conflictGroups: Map<string, ExtensionRecommendation[]> = new Map();

    // Group conflicting extensions
    for (const extension of extensions) {
      let hasConflict = false;
      
      for (const conflictId of extension.conflictsWith || []) {
        const conflictingExt = extensions.find(e => e.id === conflictId);
        if (conflictingExt) {
          const groupKey = [extension.id, conflictId].sort().join('|');
          if (!conflictGroups.has(groupKey)) {
            conflictGroups.set(groupKey, []);
          }
          conflictGroups.get(groupKey)!.push(extension, conflictingExt);
          hasConflict = true;
        }
      }

      if (!hasConflict) {
        resolved.push(extension);
      }
    }

    // Resolve conflicts by preferring required extensions
    for (const [, conflictingExtensions] of conflictGroups) {
      const uniqueExtensions = Array.from(new Set(conflictingExtensions));
      const requiredExtensions = uniqueExtensions.filter(e => e.required);
      
      if (requiredExtensions.length > 0) {
        resolved.push(requiredExtensions[0]);
      } else {
        resolved.push(uniqueExtensions[0]);
      }
    }

    return resolved;
  }

  /**
   * Generate extension configuration
   */
  private generateExtensionConfiguration(
    extensions: ExtensionRecommendation[],
    stack: TechnologyStack,
    _ide: IDEType
  ): ExtensionConfiguration {
    const recommendations = extensions.map(e => e.id);
    const unwantedRecommendations: string[] = [];
    const settings: Record<string, any> = {};

    // Merge extension-specific settings
    for (const extension of extensions) {
      if (extension.settings) {
        Object.assign(settings, extension.settings);
      }
    }

    // Add stack-specific settings
    this.addStackSpecificSettings(settings, stack);

    return {
      recommendations,
      unwantedRecommendations,
      settings,
    };
  }

  /**
   * Add technology stack-specific settings
   */
  private addStackSpecificSettings(settings: Record<string, any>, stack: TechnologyStack): void {
    switch (stack) {
      case 'javascript':
      case 'typescript':
        Object.assign(settings, {
          'typescript.preferences.includePackageJsonAutoImports': 'auto',
          'typescript.suggest.autoImports': true,
          'javascript.suggest.autoImports': true,
          'eslint.enable': true,
          'prettier.enable': true,
        });
        break;
      case 'python':
        Object.assign(settings, {
          'python.defaultInterpreterPath': './venv/bin/python',
          'python.linting.enabled': true,
          'python.formatting.provider': 'black',
          'python.testing.pytestEnabled': true,
        });
        break;
      case 'java':
        Object.assign(settings, {
          'java.configuration.updateBuildConfiguration': 'automatic',
          'java.compile.nullAnalysis.mode': 'automatic',
          'java.debug.settings.enableRunDebugCodeLens': true,
        });
        break;
    }
  }

  /**
   * Generate VSCode extension files
   */
  private async generateVSCodeExtensionFiles(
    workspacePath: string,
    profile: WorkspaceExtensionProfile
  ): Promise<string[]> {
    const vscodeDir = path.join(workspacePath, '.vscode');
    await fs.mkdir(vscodeDir, { recursive: true });

    const files: string[] = [];

    // Generate extensions.json
    const extensionsPath = path.join(vscodeDir, 'extensions.json');
    const extensionsConfig = {
      recommendations: profile.configuration.recommendations,
      unwantedRecommendations: profile.configuration.unwantedRecommendations,
    };
    await fs.writeFile(extensionsPath, JSON.stringify(extensionsConfig, null, 2));
    files.push(extensionsPath);

    return files;
  }

  /**
   * Generate Cursor extension files
   */
  private async generateCursorExtensionFiles(
    workspacePath: string,
    profile: WorkspaceExtensionProfile
  ): Promise<string[]> {
    const cursorDir = path.join(workspacePath, '.cursor');
    await fs.mkdir(cursorDir, { recursive: true });

    const files: string[] = [];

    // Generate extensions.json
    const extensionsPath = path.join(cursorDir, 'extensions.json');
    const extensionsConfig = {
      recommendations: profile.configuration.recommendations,
      unwantedRecommendations: profile.configuration.unwantedRecommendations,
    };
    await fs.writeFile(extensionsPath, JSON.stringify(extensionsConfig, null, 2));
    files.push(extensionsPath);

    return files;
  }

  /**
   * Generate JetBrains extension files
   */
  private async generateJetBrainsExtensionFiles(
    workspacePath: string,
    profile: WorkspaceExtensionProfile
  ): Promise<string[]> {
    const ideaDir = path.join(workspacePath, '.idea');
    await fs.mkdir(ideaDir, { recursive: true });

    const files: string[] = [];

    // Generate plugins.xml
    const pluginsPath = path.join(ideaDir, 'plugins.xml');
    const pluginsXml = this.generateJetBrainsPluginsXml(profile.extensions);
    await fs.writeFile(pluginsPath, pluginsXml);
    files.push(pluginsPath);

    return files;
  }

  /**
   * Generate JetBrains plugins.xml
   */
  private generateJetBrainsPluginsXml(extensions: ExtensionRecommendation[]): string {
    const jetbrainsExtensions = extensions.filter(ext => 
      ext.supportedIDEs.some(ide => 
        [IDEType.IntelliJIDEA, IDEType.WebStorm, IDEType.PyCharm].includes(ide)
      )
    );

    const pluginEntries = jetbrainsExtensions.map(ext => 
      `    <plugin id="${ext.id}" name="${ext.name}" />`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectPluginManager">
${pluginEntries}
  </component>
</project>`;
  }

  /**
   * Generate installation instructions
   */
  private generateInstallationInstructions(
    extensions: ExtensionRecommendation[],
    ide: IDEType
  ): string[] {
    const instructions: string[] = [];

    instructions.push(`# Extension Installation Instructions for ${ide}`);
    instructions.push('');
    instructions.push('## Automatic Installation');
    instructions.push('Extensions will be recommended when you open this workspace.');
    instructions.push('');
    instructions.push('## Manual Installation');
    instructions.push('Install the following extensions:');
    instructions.push('');

    for (const ext of extensions) {
      instructions.push(`- ${ext.name} (${ext.id})`);
      if (ext.description) {
        instructions.push(`  ${ext.description}`);
      }
      if (ext.required) {
        instructions.push('  **Required**');
      }
      instructions.push('');
    }

    return instructions;
  }

  /**
   * Generate conflict resolution information
   */
  private generateConflictResolution(extensions: ExtensionRecommendation[]): string[] {
    const resolutions: string[] = [];
    const conflicts = new Set<string>();

    for (const ext of extensions) {
      if (ext.conflictsWith && ext.conflictsWith.length > 0) {
        for (const conflictId of ext.conflictsWith) {
          const conflictKey = [ext.id, conflictId].sort().join('|');
          if (!conflicts.has(conflictKey)) {
            conflicts.add(conflictKey);
            resolutions.push(`${ext.name} conflicts with extension ${conflictId}`);
            resolutions.push(`Resolution: Only ${ext.name} is included in this workspace`);
            resolutions.push('');
          }
        }
      }
    }

    if (resolutions.length === 0) {
      resolutions.push('No extension conflicts detected in this workspace.');
    }

    return resolutions;
  }
} 