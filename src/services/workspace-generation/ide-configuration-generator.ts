import { promises as fs } from 'fs';
import * as path from 'path';
import type { IDEType } from '../ide-configuration/types';
import type { TechnologyStack } from './workspace-requirements-service';
import { WorkspaceRequirementsService } from './workspace-requirements-service';
import { WorkspaceTemplateManager } from './workspace-template-manager';
import { WorkspaceNamingService } from './workspace-naming-service';
import type { GeneratedWorkspace as TemplateGeneratedWorkspace, TemplateType } from './workspace-template-manager';

export interface IDEConfigurationOptions {
  outputDirectory: string;
  selectedLanguages: string[];
  selectedIDEs: IDEType[];
  templateType?: string;
  customSettings?: Record<string, unknown>;
  enableExtensionRecommendations?: boolean;
  enableTasksConfiguration?: boolean;
  enableDebugConfiguration?: boolean;
  enableLinterIntegration?: boolean;
  enableFormatterIntegration?: boolean;
}

export interface GeneratedWorkspace {
  language: string;
  ide: IDEType;
  workspacePath: string;
  configurationFiles: string[];
  extensionsInstalled: string[];
  tasksConfigured: string[];
  debugConfigured: boolean;
}

export interface IDEConfigurationResult {
  success: boolean;
  workspaces: GeneratedWorkspace[];
  errors: string[];
  warnings: string[];
  summary: {
    totalWorkspaces: number;
    totalConfigFiles: number;
    totalExtensions: number;
    processingTimeMs: number;
  };
}

export class IDEConfigurationGenerator {
  private templateManager: WorkspaceTemplateManager;
  private namingService: WorkspaceNamingService;
  private requirementsService: WorkspaceRequirementsService;

  constructor() {
    this.templateManager = new WorkspaceTemplateManager();
    this.namingService = new WorkspaceNamingService();
    this.requirementsService = new WorkspaceRequirementsService();
  }

  /**
   * Generate IDE configurations for all selected languages and IDEs
   */
  async generateConfigurations(options: IDEConfigurationOptions): Promise<IDEConfigurationResult> {
    const startTime = Date.now();
    const result: IDEConfigurationResult = {
      success: true,
      workspaces: [],
      errors: [],
      warnings: [],
      summary: {
        totalWorkspaces: 0,
        totalConfigFiles: 0,
        totalExtensions: 0,
        processingTimeMs: 0,
      },
    };

    try {
      // Ensure output directory exists
      await this.ensureDirectoryExists(options.outputDirectory);

      // Generate workspace for each language-IDE combination
      for (const language of options.selectedLanguages) {
        for (const ide of options.selectedIDEs) {
          try {
            const workspace = await this.generateWorkspaceConfiguration(
              language,
              ide,
              options
            );
            result.workspaces.push(workspace);
            result.summary.totalWorkspaces++;
            result.summary.totalConfigFiles += workspace.configurationFiles.length;
            result.summary.totalExtensions += workspace.extensionsInstalled.length;
          } catch (error) {
            const errorMessage = `Failed to generate workspace for ${language} with ${ide}: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMessage);
            result.success = false;
          }
        }
      }

      // Generate cross-workspace documentation
      await this.generateWorkspaceDocumentation(options.outputDirectory, result.workspaces);

    } catch (error) {
      result.errors.push(`Configuration generation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.success = false;
    }

    result.summary.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Generate configuration for a specific language-IDE combination
   */
  private async generateWorkspaceConfiguration(
    language: string,
    ide: IDEType,
    options: IDEConfigurationOptions
  ): Promise<GeneratedWorkspace> {
    // Get workspace requirements
    const requirements = await this.requirementsService.gatherRequirements(
      [language as any], // Cast to TechnologyStack
      ide,
      options.outputDirectory
    );

    // Generate workspace name and path
    const namingConfig: WorkspaceNamingConfig = {
      projectName: 'workspace',
      stack: language as TechnologyStack,
      ideType: ide,
      templateType: (options.templateType as TemplateType) || 'basic',
    };
    const workspaceNames = this.namingService.generateWorkspaceNames(namingConfig, options.outputDirectory);
    const workspacePath = workspaceNames.fullPath;

    // Ensure workspace directory exists
    await this.ensureDirectoryExists(workspacePath);

    // Get and process template
    const template = this.templateManager.getRecommendedTemplate(
      language as any, // Cast to TechnologyStack
      ide,
      options.templateType as any || 'basic'
    );

    if (!template) {
      throw new Error(`No template found for ${language} with ${ide}`);
    }

    const processedTemplate = this.templateManager.generateWorkspaceStructure(template, {
      projectName: workspaceNames.workspaceName,
      stack: language as TechnologyStack,
      ideType: ide,
      templateType: (options.templateType as TemplateType) || 'basic',
      workspaceRoot: workspacePath,
      customizations: options.customSettings || {},
      detectedTools: {},
    });

    // Generate IDE-specific configuration files
    const configurationFiles = await this.generateIDEConfigurationFiles(
      workspacePath,
      ide,
      processedTemplate,
      requirements
    );

    // Generate workspace file if supported
    if (this.supportsWorkspaceFile(ide)) {
      const workspaceFile = await this.generateWorkspaceFile(
        workspacePath,
        workspaceNames.workspaceName,
        ide,
        requirements
      );
      configurationFiles.push(workspaceFile);
    }

    // Generate additional configuration files
    const additionalFiles = await this.generateAdditionalConfigurationFiles(
      workspacePath,
      language,
      requirements,
      options
    );
    configurationFiles.push(...additionalFiles);

    // Find the requirement for this language
    const requirement = requirements.workspaceRequirements.find(req => req.stack === language);
    
    return {
      language,
      ide,
      workspacePath,
      configurationFiles,
      extensionsInstalled: requirement?.extensions || [],
      tasksConfigured: requirement?.buildTools || [],
      debugConfigured: options.enableDebugConfiguration !== false,
    };
  }

  /**
   * Generate IDE-specific configuration files
   */
  private async generateIDEConfigurationFiles(
    workspacePath: string,
    ide: IDEType,
    template: TemplateGeneratedWorkspace,
    requirements: WorkspaceRequirement[]
  ): Promise<string[]> {
    const configFiles: string[] = [];

    switch (ide) {
      case IDEType.VSCode:
        configFiles.push(...await this.generateVSCodeConfiguration(workspacePath, template, requirements));
        break;
      case IDEType.Cursor:
        configFiles.push(...await this.generateCursorConfiguration(workspacePath, template, requirements));
        break;
      case IDEType.IntelliJIDEA:
      case IDEType.WebStorm:
      case IDEType.PyCharm:
        configFiles.push(...await this.generateJetBrainsConfiguration(workspacePath, ide, template, requirements));
        break;
      default:
        throw new Error(`Unsupported IDE: ${ide}`);
    }

    return configFiles;
  }

  /**
   * Generate VSCode configuration files
   */
  private async generateVSCodeConfiguration(
    workspacePath: string,
    template: TemplateGeneratedWorkspace,
    _requirements: WorkspaceRequirement[]
  ): Promise<string[]> {
    const vscodeDir = path.join(workspacePath, '.vscode');
    await this.ensureDirectoryExists(vscodeDir);

    const configFiles: string[] = [];

    // Generate settings.json
    const settingsPath = path.join(vscodeDir, 'settings.json');
    await fs.writeFile(settingsPath, JSON.stringify(template.settings, null, 2));
    configFiles.push(settingsPath);

    // Generate extensions.json
    if (template.extensions.length > 0) {
      const extensionsPath = path.join(vscodeDir, 'extensions.json');
      const extensions = {
        recommendations: template.extensions,
        unwantedRecommendations: [],
      };
      await fs.writeFile(extensionsPath, JSON.stringify(extensions, null, 2));
      configFiles.push(extensionsPath);
    }

    // Generate tasks.json
    if (template.tasks && template.tasks.length > 0) {
      const tasksPath = path.join(vscodeDir, 'tasks.json');
      const tasks = {
        version: '2.0.0',
        tasks: template.tasks,
      };
      await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2));
      configFiles.push(tasksPath);
    }

    return configFiles;
  }

  /**
   * Generate Cursor configuration files
   */
  private async generateCursorConfiguration(
    workspacePath: string,
    template: TemplateGeneratedWorkspace,
    _requirements: WorkspaceRequirement[]
  ): Promise<string[]> {
    const cursorDir = path.join(workspacePath, '.cursor');
    await this.ensureDirectoryExists(cursorDir);

    const configFiles: string[] = [];

    // Generate settings.json (similar to VSCode but with Cursor-specific settings)
    const settingsPath = path.join(cursorDir, 'settings.json');
    
    // Add Cursor-specific settings
    const cursorSettings = {
      ...template.settings,
      'cursor.ai.enabled': true,
      'cursor.ai.model': 'gpt-4',
      'cursor.ai.suggestions': true,
    };
    
    await fs.writeFile(settingsPath, JSON.stringify(cursorSettings, null, 2));
    configFiles.push(settingsPath);

    // Generate extensions.json
    if (template.extensions.length > 0) {
      const extensionsPath = path.join(cursorDir, 'extensions.json');
      const extensions = {
        recommendations: template.extensions,
        unwantedRecommendations: [],
      };
      await fs.writeFile(extensionsPath, JSON.stringify(extensions, null, 2));
      configFiles.push(extensionsPath);
    }

    // Copy VSCode configuration files to maintain compatibility
    const vscodeDir = path.join(workspacePath, '.vscode');
    await this.ensureDirectoryExists(vscodeDir);

    // Generate tasks.json in .vscode for compatibility
    if (template.tasks && template.tasks.length > 0) {
      const tasksPath = path.join(vscodeDir, 'tasks.json');
      const tasks = {
        version: '2.0.0',
        tasks: template.tasks,
      };
      await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2));
      configFiles.push(tasksPath);
    }

    // Generate launch.json in .vscode for compatibility
    if (template.debugConfig) {
      const launchPath = path.join(vscodeDir, 'launch.json');
      const launch = {
        version: '0.2.0',
        configurations: Array.isArray(template.debugConfig) ? template.debugConfig : [template.debugConfig],
      };
      await fs.writeFile(launchPath, JSON.stringify(launch, null, 2));
      configFiles.push(launchPath);
    }

    return configFiles;
  }

  /**
   * Generate JetBrains IDE configuration files
   */
  private async generateJetBrainsConfiguration(
    workspacePath: string,
    ide: IDEType,
    template: ProcessedTemplate,
    requirements: WorkspaceRequirements
  ): Promise<string[]> {
    const ideaDir = path.join(workspacePath, '.idea');
    await this.ensureDirectoryExists(ideaDir);

    const configFiles: string[] = [];

    // Generate workspace.xml
    const workspaceXmlPath = path.join(ideaDir, 'workspace.xml');
    const workspaceXml = this.generateJetBrainsWorkspaceXml(requirements);
    await fs.writeFile(workspaceXmlPath, workspaceXml);
    configFiles.push(workspaceXmlPath);

    // Generate modules.xml
    const modulesXmlPath = path.join(ideaDir, 'modules.xml');
    const modulesXml = this.generateJetBrainsModulesXml(workspacePath);
    await fs.writeFile(modulesXmlPath, modulesXml);
    configFiles.push(modulesXmlPath);

    // Generate misc.xml
    const miscXmlPath = path.join(ideaDir, 'misc.xml');
    const miscXml = this.generateJetBrainsMiscXml(requirements);
    await fs.writeFile(miscXmlPath, miscXml);
    configFiles.push(miscXmlPath);

    // Generate inspectionProfiles/profiles_settings.xml
    const inspectionDir = path.join(ideaDir, 'inspectionProfiles');
    await this.ensureDirectoryExists(inspectionDir);
    
    const profilesSettingsPath = path.join(inspectionDir, 'profiles_settings.xml');
    const profilesSettings = this.generateJetBrainsInspectionProfiles();
    await fs.writeFile(profilesSettingsPath, profilesSettings);
    configFiles.push(profilesSettingsPath);

    return configFiles;
  }

  /**
   * Generate workspace file for IDEs that support it
   */
  private async generateWorkspaceFile(
    workspacePath: string,
    workspaceName: string,
    ide: IDEType,
    requirements: WorkspaceRequirements
  ): Promise<string> {
    let workspaceFile: string;
    let content: string;

    switch (ide) {
      case IDEType.VSCode:
      case IDEType.Cursor:
        workspaceFile = path.join(workspacePath, `${workspaceName}.code-workspace`);
        content = JSON.stringify({
          folders: [
            {
              name: workspaceName,
              path: '.',
            },
          ],
          settings: requirements.ideSettings,
          extensions: {
            recommendations: requirements.recommendedExtensions.map(ext => ext.id),
          },
        }, null, 2);
        break;
      default:
        throw new Error(`Workspace files not supported for ${ide}`);
    }

    await fs.writeFile(workspaceFile, content);
    return workspaceFile;
  }

  /**
   * Generate additional configuration files (linters, formatters, etc.)
   */
  private async generateAdditionalConfigurationFiles(
    workspacePath: string,
    language: string,
    requirements: WorkspaceRequirements,
    options: IDEConfigurationOptions
  ): Promise<string[]> {
    const configFiles: string[] = [];

    // Generate linter configurations
    if (options.enableLinterIntegration !== false) {
      for (const linter of requirements.linters) {
        const linterConfig = await this.generateLinterConfiguration(workspacePath, linter, language);
        if (linterConfig) {
          configFiles.push(linterConfig);
        }
      }
    }

    // Generate formatter configurations
    if (options.enableFormatterIntegration !== false) {
      for (const formatter of requirements.formatters) {
        const formatterConfig = await this.generateFormatterConfiguration(workspacePath, formatter, language);
        if (formatterConfig) {
          configFiles.push(formatterConfig);
        }
      }
    }

    // Generate package manager configurations
    for (const packageManager of requirements.packageManagers) {
      const packageConfig = await this.generatePackageManagerConfiguration(workspacePath, packageManager, language);
      if (packageConfig) {
        configFiles.push(packageConfig);
      }
    }

    // Generate .gitignore
    const gitignorePath = await this.generateGitignore(workspacePath, language, requirements);
    if (gitignorePath) {
      configFiles.push(gitignorePath);
    }

    // Generate README.md
    const readmePath = await this.generateReadme(workspacePath, language, requirements);
    configFiles.push(readmePath);

    return configFiles;
  }

  /**
   * Generate linter configuration file
   */
  private async generateLinterConfiguration(
    workspacePath: string,
    linter: string,
    language: string
  ): Promise<string | null> {
    const configs: Record<string, { filename: string; content: any }> = {
      eslint: {
        filename: '.eslintrc.json',
        content: {
          env: {
            browser: true,
            es2021: true,
            node: true,
          },
          extends: [
            'eslint:recommended',
            ...(language === 'typescript' ? ['@typescript-eslint/recommended'] : []),
          ],
          parser: language === 'typescript' ? '@typescript-eslint/parser' : undefined,
          parserOptions: {
            ecmaVersion: 12,
            sourceType: 'module',
          },
          plugins: language === 'typescript' ? ['@typescript-eslint'] : [],
          rules: {},
        },
      },
      pylint: {
        filename: '.pylintrc',
        content: `[MASTER]
init-hook='import sys; sys.path.append(".")'

[MESSAGES CONTROL]
disable=C0111,R0903,R0913

[FORMAT]
max-line-length=88
`,
      },
      flake8: {
        filename: '.flake8',
        content: `[flake8]
max-line-length = 88
extend-ignore = E203, W503
`,
      },
    };

    const config = configs[linter];
    if (!config) {
      return null;
    }

    const configPath = path.join(workspacePath, config.filename);
    const content = typeof config.content === 'string' 
      ? config.content 
      : JSON.stringify(config.content, null, 2);
    
    await fs.writeFile(configPath, content);
    return configPath;
  }

  /**
   * Generate formatter configuration file
   */
  private async generateFormatterConfiguration(
    workspacePath: string,
    formatter: string,
    language: string
  ): Promise<string | null> {
    const configs: Record<string, { filename: string; content: any }> = {
      prettier: {
        filename: '.prettierrc.json',
        content: {
          semi: true,
          trailingComma: 'es5',
          singleQuote: true,
          printWidth: 80,
          tabWidth: 2,
        },
      },
      black: {
        filename: 'pyproject.toml',
        content: `[tool.black]
line-length = 88
target-version = ['py38']
include = '\\.pyi?$'
`,
      },
    };

    const config = configs[formatter];
    if (!config) {
      return null;
    }

    const configPath = path.join(workspacePath, config.filename);
    const content = typeof config.content === 'string' 
      ? config.content 
      : JSON.stringify(config.content, null, 2);
    
    await fs.writeFile(configPath, content);
    return configPath;
  }

  /**
   * Generate package manager configuration
   */
  private async generatePackageManagerConfiguration(
    workspacePath: string,
    packageManager: string,
    language: string
  ): Promise<string | null> {
    const configs: Record<string, { filename: string; content: any }> = {
      npm: {
        filename: 'package.json',
        content: {
          name: path.basename(workspacePath),
          version: '1.0.0',
          description: '',
          main: 'index.js',
          scripts: {
            test: 'echo "Error: no test specified" && exit 1',
          },
          keywords: [],
          author: '',
          license: 'ISC',
        },
      },
      pip: {
        filename: 'requirements.txt',
        content: '# Add your Python dependencies here\n',
      },
      poetry: {
        filename: 'pyproject.toml',
        content: `[tool.poetry]
name = "${path.basename(workspacePath)}"
version = "0.1.0"
description = ""
authors = ["Your Name <you@example.com>"]

[tool.poetry.dependencies]
python = "^3.8"

[tool.poetry.dev-dependencies]
pytest = "^6.0"

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
`,
      },
    };

    const config = configs[packageManager];
    if (!config) {
      return null;
    }

    const configPath = path.join(workspacePath, config.filename);
    
    // Check if file already exists to avoid overwriting
    try {
      await fs.access(configPath);
      return null; // File exists, don't overwrite
    } catch {
      // File doesn't exist, create it
    }

    const content = typeof config.content === 'string' 
      ? config.content 
      : JSON.stringify(config.content, null, 2);
    
    await fs.writeFile(configPath, content);
    return configPath;
  }

  /**
   * Generate .gitignore file
   */
  private async generateGitignore(
    workspacePath: string,
    language: string,
    requirements: WorkspaceRequirements
  ): Promise<string | null> {
    const gitignoreTemplates: Record<string, string[]> = {
      javascript: [
        'node_modules/',
        'npm-debug.log*',
        'yarn-debug.log*',
        'yarn-error.log*',
        '.env',
        '.env.local',
        '.env.development.local',
        '.env.test.local',
        '.env.production.local',
        'dist/',
        'build/',
        '.DS_Store',
      ],
      typescript: [
        'node_modules/',
        'npm-debug.log*',
        'yarn-debug.log*',
        'yarn-error.log*',
        '.env',
        '.env.local',
        '.env.development.local',
        '.env.test.local',
        '.env.production.local',
        'dist/',
        'build/',
        '*.tsbuildinfo',
        '.DS_Store',
      ],
      python: [
        '__pycache__/',
        '*.py[cod]',
        '*$py.class',
        '*.so',
        '.Python',
        'build/',
        'develop-eggs/',
        'dist/',
        'downloads/',
        'eggs/',
        '.eggs/',
        'lib/',
        'lib64/',
        'parts/',
        'sdist/',
        'var/',
        'wheels/',
        '*.egg-info/',
        '.installed.cfg',
        '*.egg',
        '.env',
        '.venv',
        'env/',
        'venv/',
        'ENV/',
        'env.bak/',
        'venv.bak/',
        '.pytest_cache/',
        '.coverage',
        'htmlcov/',
        '.DS_Store',
      ],
    };

    const patterns = gitignoreTemplates[language] || [
      '.DS_Store',
      '.env',
      'node_modules/',
      'dist/',
      'build/',
    ];

    const gitignorePath = path.join(workspacePath, '.gitignore');
    const content = patterns.join('\n') + '\n';
    
    await fs.writeFile(gitignorePath, content);
    return gitignorePath;
  }

  /**
   * Generate README.md file
   */
  private async generateReadme(
    workspacePath: string,
    language: string,
    requirements: WorkspaceRequirements
  ): Promise<string> {
    const workspaceName = path.basename(workspacePath);
    const content = `# ${workspaceName}

This is a ${language} workspace configured for development.

## Setup

### Prerequisites

${requirements.versionManagers.length > 0 ? `- ${requirements.versionManagers.join(', ')} for version management` : ''}
${requirements.packageManagers.length > 0 ? `- ${requirements.packageManagers.join(', ')} for package management` : ''}

### Installation

${this.generateInstallationInstructions(language, requirements)}

### Development

${this.generateDevelopmentInstructions(language, requirements)}

## Tools Configured

- **Linters**: ${requirements.linters.join(', ') || 'None'}
- **Formatters**: ${requirements.formatters.join(', ') || 'None'}
- **Debuggers**: ${requirements.debuggers.join(', ') || 'None'}
- **Build Tools**: ${requirements.buildTools.join(', ') || 'None'}

## Extensions

This workspace includes the following recommended extensions:

${requirements.recommendedExtensions.map(ext => `- ${ext.name} (${ext.id})`).join('\n')}

## Getting Started

1. Open this workspace in your IDE
2. Install recommended extensions when prompted
3. Run the setup commands above
4. Start coding!
`;

    const readmePath = path.join(workspacePath, 'README.md');
    await fs.writeFile(readmePath, content);
    return readmePath;
  }

  /**
   * Generate workspace documentation
   */
  private async generateWorkspaceDocumentation(
    outputDirectory: string,
    workspaces: GeneratedWorkspace[]
  ): Promise<void> {
    const docContent = `# Generated Workspaces

This directory contains language-isolated workspaces for development.

## Workspaces

${workspaces.map(ws => `
### ${ws.language} (${ws.ide})

- **Path**: \`${path.relative(outputDirectory, ws.workspacePath)}\`
- **Extensions**: ${ws.extensionsInstalled.length}
- **Configuration Files**: ${ws.configurationFiles.length}
- **Tasks**: ${ws.tasksConfigured.join(', ') || 'None'}
- **Debug**: ${ws.debugConfigured ? 'Enabled' : 'Disabled'}
`).join('\n')}

## Usage

Each workspace is isolated and contains only the configuration and extensions relevant to its specific language and IDE. This prevents extension conflicts and optimizes performance.

To use a workspace:

1. Open the workspace directory in your IDE
2. Install recommended extensions when prompted
3. Follow the README.md in each workspace for setup instructions

## Architecture

This setup follows the language-isolated workspace pattern, where:

- Each programming language gets its own workspace directory
- IDE configurations are tailored to the specific language and tools
- Extensions are carefully selected to avoid conflicts
- Settings are optimized for the specific development stack

Generated on: ${new Date().toISOString()}
`;

    const docPath = path.join(outputDirectory, 'WORKSPACES.md');
    await fs.writeFile(docPath, docContent);
  }

  /**
   * Helper methods
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private mergeSettings(templateSettings: any, requirementSettings: any): any {
    return {
      ...templateSettings,
      ...requirementSettings,
    };
  }

  private supportsWorkspaceFile(ide: IDEType): boolean {
    return ide === IDEType.VSCode || ide === IDEType.Cursor;
  }

  private generateInstallationInstructions(language: string, requirements: WorkspaceRequirements): string {
    const instructions: Record<string, string> = {
      javascript: `\`\`\`bash
npm install
# or
yarn install
\`\`\``,
      typescript: `\`\`\`bash
npm install
# or
yarn install
\`\`\``,
      python: `\`\`\`bash
# Using pip
pip install -r requirements.txt

# Using poetry
poetry install
\`\`\``,
    };

    return instructions[language] || `Follow the setup instructions for ${language}.`;
  }

  private generateDevelopmentInstructions(language: string, requirements: WorkspaceRequirements): string {
    const instructions: Record<string, string> = {
      javascript: `\`\`\`bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
\`\`\``,
      typescript: `\`\`\`bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Type checking
npm run type-check
\`\`\``,
      python: `\`\`\`bash
# Run the application
python main.py

# Run tests
pytest

# Format code
black .

# Lint code
flake8 .
\`\`\``,
    };

    return instructions[language] || `Follow the development workflow for ${language}.`;
  }

  private generateJetBrainsWorkspaceXml(requirements: WorkspaceRequirements): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ChangeListManager">
    <list default="true" id="default" name="Default Changelist" comment="" />
    <option name="SHOW_DIALOG" value="false" />
    <option name="HIGHLIGHT_CONFLICTS" value="true" />
    <option name="HIGHLIGHT_NON_ACTIVE_CHANGELIST" value="false" />
    <option name="LAST_RESOLUTION" value="IGNORE" />
  </component>
  <component name="ProjectViewState">
    <option name="hideEmptyMiddlePackages" value="true" />
    <option name="showLibraryContents" value="true" />
  </component>
  <component name="PropertiesComponent">
    <property name="RunOnceActivity.OpenProjectViewOnStart" value="true" />
    <property name="WebServerToolWindowFactoryState" value="false" />
  </component>
</project>`;
  }

  private generateJetBrainsModulesXml(workspacePath: string): string {
    const moduleName = path.basename(workspacePath);
    return `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectModuleManager">
    <modules>
      <module fileurl="file://$PROJECT_DIR$/${moduleName}.iml" filepath="$PROJECT_DIR$/${moduleName}.iml" />
    </modules>
  </component>
</project>`;
  }

  private generateJetBrainsMiscXml(requirements: WorkspaceRequirements): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectRootManager" version="2" languageLevel="JDK_11" default="true" project-jdk-name="11" project-jdk-type="JavaSDK">
    <output url="file://$PROJECT_DIR$/out" />
  </component>
</project>`;
  }

  private generateJetBrainsInspectionProfiles(): string {
    return `<component name="InspectionProjectProfileManager">
  <settings>
    <option name="USE_PROJECT_PROFILE" value="false" />
    <version value="1.0" />
  </settings>
</component>`;
  }
} 