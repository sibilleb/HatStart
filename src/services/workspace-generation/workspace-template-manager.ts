/**
 * Workspace Template Manager
 * Manages flexible, reusable IDE workspace templates for language-isolated environments
 */

import type { IDEType } from '../ide-configuration/types.js';
import type { TechnologyStack } from './workspace-requirements-service.js';

/**
 * Template types for different workspace purposes
 */
export type TemplateType = 
  | 'basic'           // Basic development setup
  | 'fullstack'       // Full-stack development
  | 'library'         // Library/package development
  | 'microservice'    // Microservice development
  | 'desktop'         // Desktop application
  | 'mobile'          // Mobile development
  | 'data-science'    // Data science/ML
  | 'devops'          // DevOps/Infrastructure
  | 'testing'         // Testing-focused
  | 'documentation';  // Documentation projects

/**
 * Template configuration for a specific technology stack and IDE
 */
export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  stack: TechnologyStack;
  ideType: IDEType;
  templateType: TemplateType;
  
  // Template metadata
  version: string;
  author?: string;
  tags: string[];
  
  // Template structure
  directories: TemplateDirectory[];
  files: TemplateFile[];
  
  // IDE-specific configurations
  settings: Record<string, unknown>;
  extensions: string[];
  tasks: TemplateTask[];
  
  // Development tools configuration
  linters: ToolConfig[];
  formatters: ToolConfig[];
  debuggers: ToolConfig[];
  
  // Version manager configuration
  versionManager?: VersionManagerConfig;
  
  // Environment variables template
  environmentVariables: EnvironmentVariable[];
  
  // Dependencies and scripts
  dependencies: DependencyConfig;
  scripts: Record<string, string>;
  
  // Template customization options
  customizable: CustomizationOption[];
}

/**
 * Directory structure template
 */
export interface TemplateDirectory {
  path: string;
  description?: string;
  optional?: boolean;
  condition?: string; // Condition for creating this directory
}

/**
 * File template configuration
 */
export interface TemplateFile {
  path: string;
  content: string | TemplateContent;
  description?: string;
  optional?: boolean;
  condition?: string;
  executable?: boolean;
}

/**
 * Template content with variable substitution
 */
export interface TemplateContent {
  template: string;
  variables: Record<string, string | number | boolean>;
}

/**
 * IDE task configuration
 */
export interface TemplateTask {
  label: string;
  type: string;
  command: string;
  args?: string[];
  group?: string;
  presentation?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

/**
 * Tool configuration (linter, formatter, debugger)
 */
export interface ToolConfig {
  name: string;
  configFile?: string;
  settings: Record<string, unknown>;
  enabled: boolean;
}

/**
 * Version manager configuration
 */
export interface VersionManagerConfig {
  type: 'nvm' | 'pyenv' | 'rbenv' | 'gvm' | 'rustup' | 'sdkman';
  version: string;
  configFile: string;
}

/**
 * Environment variable template
 */
export interface EnvironmentVariable {
  name: string;
  value: string;
  description?: string;
  required?: boolean;
}

/**
 * Dependency configuration
 */
export interface DependencyConfig {
  packageManager: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Template customization option
 */
export interface CustomizationOption {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'select';
  defaultValue: unknown;
  options?: string[]; // For select type
  validation?: string; // Regex for validation
}

/**
 * Template generation context
 */
export interface TemplateContext {
  projectName: string;
  stack: TechnologyStack;
  ideType: IDEType;
  templateType: TemplateType;
  workspaceRoot: string;
  customizations: Record<string, unknown>;
  detectedTools: Record<string, string>; // Tool name -> version
}

/**
 * Workspace Template Manager
 * Handles creation, modification, and selection of workspace templates
 */
export class WorkspaceTemplateManager {
  private templates: Map<string, WorkspaceTemplate> = new Map();
  private templateRegistry: Map<string, string> = new Map(); // stack-ide-type -> template id

  constructor() {
    this.initializeBuiltInTemplates();
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): WorkspaceTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates for a specific technology stack and IDE
   */
  getTemplatesForStack(stack: TechnologyStack, ideType: IDEType): WorkspaceTemplate[] {
    return this.getAllTemplates().filter(
      template => template.stack === stack && template.ideType === ideType
    );
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): WorkspaceTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get recommended template for a stack and IDE combination
   */
  getRecommendedTemplate(
    stack: TechnologyStack, 
    ideType: IDEType, 
    templateType: TemplateType = 'basic'
  ): WorkspaceTemplate | undefined {
    const key = `${stack}-${ideType}-${templateType}`;
    const templateId = this.templateRegistry.get(key);
    return templateId ? this.templates.get(templateId) : undefined;
  }

  /**
   * Register a new template
   */
  registerTemplate(template: WorkspaceTemplate): void {
    this.templates.set(template.id, template);
    
    // Register in the registry for quick lookup
    const key = `${template.stack}-${template.ideType}-${template.templateType}`;
    this.templateRegistry.set(key, template.id);
  }

  /**
   * Create a custom template based on an existing one
   */
  createCustomTemplate(
    baseTemplateId: string,
    customizations: Partial<WorkspaceTemplate>
  ): WorkspaceTemplate {
    const baseTemplate = this.getTemplate(baseTemplateId);
    if (!baseTemplate) {
      throw new Error(`Base template ${baseTemplateId} not found`);
    }

    const customTemplate: WorkspaceTemplate = {
      ...baseTemplate,
      ...customizations,
      id: customizations.id || `${baseTemplateId}-custom-${Date.now()}`,
      version: customizations.version || '1.0.0-custom',
    };

    this.registerTemplate(customTemplate);
    return customTemplate;
  }

  /**
   * Generate workspace structure from template
   */
  generateWorkspaceStructure(
    template: WorkspaceTemplate,
    context: TemplateContext
  ): GeneratedWorkspace {
    return {
      directories: this.processDirectories(template.directories, context),
      files: this.processFiles(template.files, context),
      settings: this.processSettings(template.settings, context),
      extensions: template.extensions,
      tasks: this.processTasks(template.tasks, context),
      toolConfigs: {
        linters: template.linters,
        formatters: template.formatters,
        debuggers: template.debuggers,
      },
      versionManager: template.versionManager,
      environmentVariables: template.environmentVariables,
      dependencies: template.dependencies,
      scripts: template.scripts,
    };
  }

  /**
   * Validate template configuration
   */
  validateTemplate(template: WorkspaceTemplate): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (!template.stack) errors.push('Technology stack is required');
    if (!template.ideType) errors.push('IDE type is required');

    // Validate file paths
    template.files.forEach((file, index) => {
      if (!file.path) {
        errors.push(`File at index ${index} missing path`);
      }
    });

    // Validate directory paths
    template.directories.forEach((dir, index) => {
      if (!dir.path) {
        errors.push(`Directory at index ${index} missing path`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Initialize built-in templates for common technology stacks
   */
  private initializeBuiltInTemplates(): void {
    // JavaScript/TypeScript templates
    this.registerTemplate(this.createJavaScriptTemplate('vscode'));
    this.registerTemplate(this.createJavaScriptTemplate('cursor'));
    this.registerTemplate(this.createTypeScriptTemplate('vscode'));
    this.registerTemplate(this.createTypeScriptTemplate('cursor'));

    // Python templates
    this.registerTemplate(this.createPythonTemplate('vscode'));
    this.registerTemplate(this.createPythonTemplate('cursor'));

    // Java templates
    this.registerTemplate(this.createJavaTemplate('vscode'));
    this.registerTemplate(this.createJavaTemplate('cursor'));

    // Add more templates as needed...
  }

  /**
   * Create JavaScript template for specific IDE
   */
  private createJavaScriptTemplate(ideType: IDEType): WorkspaceTemplate {
    return {
      id: `javascript-${ideType}-basic`,
      name: `JavaScript Basic (${ideType.toUpperCase()})`,
      description: 'Basic JavaScript development workspace',
      stack: 'javascript',
      ideType,
      templateType: 'basic',
      version: '1.0.0',
      tags: ['javascript', 'node', 'web'],
      
      directories: [
        { path: 'src', description: 'Source code directory' },
        { path: 'tests', description: 'Test files' },
        { path: 'docs', description: 'Documentation', optional: true },
      ],
      
      files: [
        {
          path: 'package.json',
          content: {
            template: JSON.stringify({
              name: '{{projectName}}',
              version: '1.0.0',
              description: '',
              main: 'src/index.js',
              scripts: {
                start: 'node src/index.js',
                test: 'jest',
                lint: 'eslint src/',
                format: 'prettier --write src/',
              },
            }, null, 2),
            variables: {},
          },
        },
        {
          path: 'src/index.js',
          content: '// Main application entry point\nconsole.log("Hello, World!");\n',
        },
        {
          path: '.gitignore',
          content: 'node_modules/\n.env\n.DS_Store\ndist/\nbuild/\n',
        },
      ],
      
      settings: this.getJavaScriptSettings(ideType),
      extensions: this.getJavaScriptExtensions(ideType),
      tasks: this.getJavaScriptTasks(),
      
      linters: [
        {
          name: 'eslint',
          configFile: '.eslintrc.json',
          settings: {
            extends: ['eslint:recommended'],
            env: { node: true, es2021: true },
            parserOptions: { ecmaVersion: 12, sourceType: 'module' },
          },
          enabled: true,
        },
      ],
      
      formatters: [
        {
          name: 'prettier',
          configFile: '.prettierrc',
          settings: {
            semi: true,
            trailingComma: 'es5',
            singleQuote: true,
            printWidth: 80,
          },
          enabled: true,
        },
      ],
      
      debuggers: [
        {
          name: 'node',
          settings: {
            type: 'node',
            request: 'launch',
            program: '${workspaceFolder}/src/index.js',
          },
          enabled: true,
        },
      ],
      
      versionManager: {
        type: 'nvm',
        version: '18.0.0',
        configFile: '.nvmrc',
      },
      
      environmentVariables: [
        {
          name: 'NODE_ENV',
          value: 'development',
          description: 'Node.js environment',
        },
      ],
      
      dependencies: {
        packageManager: 'npm',
        dependencies: {},
        devDependencies: {
          eslint: '^8.0.0',
          prettier: '^2.0.0',
          jest: '^29.0.0',
        },
      },
      
      scripts: {
        setup: 'npm install',
        dev: 'npm run start',
        build: 'echo "No build step configured"',
      },
      
      customizable: [
        {
          key: 'useTypeScript',
          label: 'Use TypeScript',
          description: 'Enable TypeScript support',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'framework',
          label: 'Framework',
          description: 'Choose a framework',
          type: 'select',
          defaultValue: 'none',
          options: ['none', 'express', 'fastify', 'koa'],
        },
      ],
    };
  }

  /**
   * Create TypeScript template for specific IDE
   */
  private createTypeScriptTemplate(ideType: IDEType): WorkspaceTemplate {
    const jsTemplate = this.createJavaScriptTemplate(ideType);
    
    return {
      ...jsTemplate,
      id: `typescript-${ideType}-basic`,
      name: `TypeScript Basic (${ideType.toUpperCase()})`,
      description: 'Basic TypeScript development workspace',
      stack: 'typescript',
      tags: ['typescript', 'node', 'web'],
      
      files: [
        ...jsTemplate.files.filter(f => f.path !== 'src/index.js'),
        {
          path: 'src/index.ts',
          content: '// Main application entry point\nconsole.log("Hello, TypeScript!");\n',
        },
        {
          path: 'tsconfig.json',
          content: JSON.stringify({
            compilerOptions: {
              target: 'ES2020',
              module: 'commonjs',
              outDir: './dist',
              rootDir: './src',
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true,
            },
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist'],
          }, null, 2),
        },
      ],
      
      extensions: this.getTypeScriptExtensions(ideType),
      
      dependencies: {
        ...jsTemplate.dependencies,
        devDependencies: {
          ...jsTemplate.dependencies.devDependencies,
          typescript: '^5.0.0',
          '@types/node': '^20.0.0',
          'ts-node': '^10.0.0',
        },
      },
    };
  }

  /**
   * Create Python template for specific IDE
   */
  private createPythonTemplate(ideType: IDEType): WorkspaceTemplate {
    return {
      id: `python-${ideType}-basic`,
      name: `Python Basic (${ideType.toUpperCase()})`,
      description: 'Basic Python development workspace',
      stack: 'python',
      ideType,
      templateType: 'basic',
      version: '1.0.0',
      tags: ['python', 'development'],
      
      directories: [
        { path: 'src', description: 'Source code directory' },
        { path: 'tests', description: 'Test files' },
        { path: 'docs', description: 'Documentation', optional: true },
      ],
      
      files: [
        {
          path: 'requirements.txt',
          content: '# Python dependencies\n',
        },
        {
          path: 'src/main.py',
          content: '#!/usr/bin/env python3\n"""Main application entry point."""\n\nif __name__ == "__main__":\n    print("Hello, Python!")\n',
          executable: true,
        },
        {
          path: '.gitignore',
          content: '__pycache__/\n*.py[cod]\n*$py.class\n.env\nvenv/\n.venv/\ndist/\nbuild/\n*.egg-info/\n',
        },
        {
          path: 'pyproject.toml',
          content: '[build-system]\nrequires = ["setuptools>=45", "wheel"]\nbuild-backend = "setuptools.build_meta"\n\n[project]\nname = "{{projectName}}"\nversion = "0.1.0"\ndescription = ""\nauthors = [{name = "Author", email = "author@example.com"}]\nrequires-python = ">=3.8"\n',
        },
      ],
      
      settings: this.getPythonSettings(ideType),
      extensions: this.getPythonExtensions(ideType),
      tasks: this.getPythonTasks(),
      
      linters: [
        {
          name: 'flake8',
          configFile: '.flake8',
          settings: {
            'max-line-length': 88,
            extend_ignore: ['E203', 'W503'],
          },
          enabled: true,
        },
      ],
      
      formatters: [
        {
          name: 'black',
          settings: {
            'line-length': 88,
            'target-version': ['py38'],
          },
          enabled: true,
        },
      ],
      
      debuggers: [
        {
          name: 'python',
          settings: {
            type: 'python',
            request: 'launch',
            program: '${workspaceFolder}/src/main.py',
            console: 'integratedTerminal',
          },
          enabled: true,
        },
      ],
      
      versionManager: {
        type: 'pyenv',
        version: '3.11.0',
        configFile: '.python-version',
      },
      
      environmentVariables: [
        {
          name: 'PYTHONPATH',
          value: '${workspaceFolder}/src',
          description: 'Python module search path',
        },
      ],
      
      dependencies: {
        packageManager: 'pip',
        dependencies: {},
        devDependencies: {
          'black': '>=23.0.0',
          'flake8': '>=6.0.0',
          'pytest': '>=7.0.0',
        },
      },
      
      scripts: {
        setup: 'pip install -r requirements.txt',
        dev: 'python src/main.py',
        test: 'pytest tests/',
        lint: 'flake8 src/',
        format: 'black src/',
      },
      
      customizable: [
        {
          key: 'useVirtualEnv',
          label: 'Use Virtual Environment',
          description: 'Create a virtual environment',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'framework',
          label: 'Framework',
          description: 'Choose a Python framework',
          type: 'select',
          defaultValue: 'none',
          options: ['none', 'django', 'flask', 'fastapi'],
        },
      ],
    };
  }

  /**
   * Create Java template for specific IDE
   */
  private createJavaTemplate(ideType: IDEType): WorkspaceTemplate {
    return {
      id: `java-${ideType}-basic`,
      name: `Java Basic (${ideType.toUpperCase()})`,
      description: 'Basic Java development workspace',
      stack: 'java',
      ideType,
      templateType: 'basic',
      version: '1.0.0',
      tags: ['java', 'development'],
      
      directories: [
        { path: 'src/main/java', description: 'Main Java source code' },
        { path: 'src/test/java', description: 'Test source code' },
        { path: 'src/main/resources', description: 'Resources', optional: true },
      ],
      
      files: [
        {
          path: 'pom.xml',
          content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.example</groupId>
    <artifactId>{{projectName}}</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.9.0</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>`,
        },
        {
          path: 'src/main/java/Main.java',
          content: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n    }\n}\n',
        },
        {
          path: '.gitignore',
          content: 'target/\n*.class\n*.jar\n*.war\n*.ear\n.idea/\n*.iml\n.vscode/\n',
        },
      ],
      
      settings: this.getJavaSettings(ideType),
      extensions: this.getJavaExtensions(ideType),
      tasks: this.getJavaTasks(),
      
      linters: [
        {
          name: 'checkstyle',
          configFile: 'checkstyle.xml',
          settings: {},
          enabled: true,
        },
      ],
      
      formatters: [
        {
          name: 'google-java-format',
          settings: {},
          enabled: true,
        },
      ],
      
      debuggers: [
        {
          name: 'java',
          settings: {
            type: 'java',
            request: 'launch',
            mainClass: 'Main',
            projectName: '{{projectName}}',
          },
          enabled: true,
        },
      ],
      
      versionManager: {
        type: 'sdkman',
        version: '17.0.0',
        configFile: '.sdkmanrc',
      },
      
      environmentVariables: [
        {
          name: 'JAVA_HOME',
          value: '${env:JAVA_HOME}',
          description: 'Java installation directory',
        },
      ],
      
      dependencies: {
        packageManager: 'maven',
        dependencies: {},
        devDependencies: {},
      },
      
      scripts: {
        setup: 'mvn clean install',
        dev: 'mvn exec:java -Dexec.mainClass="Main"',
        build: 'mvn clean package',
        test: 'mvn test',
      },
      
      customizable: [
        {
          key: 'buildTool',
          label: 'Build Tool',
          description: 'Choose build tool',
          type: 'select',
          defaultValue: 'maven',
          options: ['maven', 'gradle'],
        },
        {
          key: 'javaVersion',
          label: 'Java Version',
          description: 'Java version to use',
          type: 'select',
          defaultValue: '17',
          options: ['11', '17', '21'],
        },
      ],
    };
  }

  // Helper methods for IDE-specific configurations
  private getJavaScriptSettings(ideType: IDEType): Record<string, unknown> {
    const baseSettings = {
      'editor.tabSize': 2,
      'editor.insertSpaces': true,
      'files.eol': '\n',
    };

    if (ideType === 'vscode' || ideType === 'cursor') {
      return {
        ...baseSettings,
        'javascript.preferences.includePackageJsonAutoImports': 'auto',
        'typescript.preferences.includePackageJsonAutoImports': 'auto',
        'eslint.enable': true,
        'editor.formatOnSave': true,
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
      };
    }

    return baseSettings;
  }

  private getJavaScriptExtensions(ideType: IDEType): string[] {
    if (ideType === 'vscode' || ideType === 'cursor') {
      return [
        'esbenp.prettier-vscode',
        'dbaeumer.vscode-eslint',
        'ms-vscode.vscode-json',
        'bradlc.vscode-tailwindcss',
      ];
    }
    return [];
  }

  private getTypeScriptExtensions(ideType: IDEType): string[] {
    const jsExtensions = this.getJavaScriptExtensions(ideType);
    if (ideType === 'vscode' || ideType === 'cursor') {
      return [
        ...jsExtensions,
        'ms-vscode.vscode-typescript-next',
      ];
    }
    return jsExtensions;
  }

  private getPythonSettings(ideType: IDEType): Record<string, unknown> {
    const baseSettings = {
      'editor.tabSize': 4,
      'editor.insertSpaces': true,
      'files.eol': '\n',
    };

    if (ideType === 'vscode' || ideType === 'cursor') {
      return {
        ...baseSettings,
        'python.defaultInterpreterPath': './venv/bin/python',
        'python.formatting.provider': 'black',
        'python.linting.enabled': true,
        'python.linting.flake8Enabled': true,
        'editor.formatOnSave': true,
      };
    }

    return baseSettings;
  }

  private getPythonExtensions(ideType: IDEType): string[] {
    if (ideType === 'vscode' || ideType === 'cursor') {
      return [
        'ms-python.python',
        'ms-python.flake8',
        'ms-python.black-formatter',
        'ms-python.isort',
      ];
    }
    return [];
  }

  private getJavaSettings(ideType: IDEType): Record<string, unknown> {
    const baseSettings = {
      'editor.tabSize': 4,
      'editor.insertSpaces': true,
      'files.eol': '\n',
    };

    if (ideType === 'vscode' || ideType === 'cursor') {
      return {
        ...baseSettings,
        'java.configuration.updateBuildConfiguration': 'automatic',
        'java.compile.nullAnalysis.mode': 'automatic',
        'editor.formatOnSave': true,
      };
    }

    return baseSettings;
  }

  private getJavaExtensions(ideType: IDEType): string[] {
    if (ideType === 'vscode' || ideType === 'cursor') {
      return [
        'vscjava.vscode-java-pack',
        'redhat.java',
        'vscjava.vscode-maven',
        'vscjava.vscode-java-debug',
      ];
    }
    return [];
  }

  private getJavaScriptTasks(): TemplateTask[] {
    return [
      {
        label: 'npm: start',
        type: 'shell',
        command: 'npm',
        args: ['start'],
        group: 'build',
      },
      {
        label: 'npm: test',
        type: 'shell',
        command: 'npm',
        args: ['test'],
        group: 'test',
      },
    ];
  }

  private getPythonTasks(): TemplateTask[] {
    return [
      {
        label: 'python: run',
        type: 'shell',
        command: 'python',
        args: ['src/main.py'],
        group: 'build',
      },
      {
        label: 'pytest: test',
        type: 'shell',
        command: 'pytest',
        args: ['tests/'],
        group: 'test',
      },
    ];
  }

  private getJavaTasks(): TemplateTask[] {
    return [
      {
        label: 'maven: compile',
        type: 'shell',
        command: 'mvn',
        args: ['compile'],
        group: 'build',
      },
      {
        label: 'maven: test',
        type: 'shell',
        command: 'mvn',
        args: ['test'],
        group: 'test',
      },
    ];
  }

  // Template processing methods
  private processDirectories(
    directories: TemplateDirectory[],
    context: TemplateContext
  ): string[] {
    return directories
      .filter(dir => this.shouldInclude(dir.condition, context))
      .map(dir => this.substituteVariables(dir.path, context));
  }

  private processFiles(
    files: TemplateFile[],
    context: TemplateContext
  ): ProcessedFile[] {
    return files
      .filter(file => this.shouldInclude(file.condition, context))
      .map(file => ({
        path: this.substituteVariables(file.path, context),
        content: this.processFileContent(file.content, context),
        executable: file.executable || false,
      }));
  }

  private processSettings(
    settings: Record<string, unknown>,
    context: TemplateContext
  ): Record<string, unknown> {
    const processed: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'string') {
        processed[key] = this.substituteVariables(value, context);
      } else {
        processed[key] = value;
      }
    }
    
    return processed;
  }

  private processTasks(
    tasks: TemplateTask[],
    context: TemplateContext
  ): TemplateTask[] {
    return tasks.map(task => ({
      ...task,
      command: this.substituteVariables(task.command, context),
      args: task.args?.map(arg => this.substituteVariables(arg, context)),
    }));
  }

  private processFileContent(
    content: string | TemplateContent,
    context: TemplateContext
  ): string {
    if (typeof content === 'string') {
      return this.substituteVariables(content, context);
    }

    let processedContent = content.template;
    
    // Substitute template variables
    for (const [key, value] of Object.entries(content.variables)) {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(
        new RegExp(placeholder, 'g'),
        String(value)
      );
    }
    
    // Substitute context variables
    return this.substituteVariables(processedContent, context);
  }

  private substituteVariables(text: string, context: TemplateContext): string {
    return text
      .replace(/\{\{projectName\}\}/g, context.projectName)
      .replace(/\{\{workspaceRoot\}\}/g, context.workspaceRoot)
      .replace(/\{\{stack\}\}/g, context.stack)
      .replace(/\{\{ideType\}\}/g, context.ideType);
  }

  private shouldInclude(condition: string | undefined, _context: TemplateContext): boolean {
    if (!condition) return true;
    
    // Simple condition evaluation
    // In a real implementation, you might want a more sophisticated expression evaluator
    return true;
  }
}

/**
 * Generated workspace structure
 */
export interface GeneratedWorkspace {
  directories: string[];
  files: ProcessedFile[];
  settings: Record<string, unknown>;
  extensions: string[];
  tasks: TemplateTask[];
  toolConfigs: {
    linters: ToolConfig[];
    formatters: ToolConfig[];
    debuggers: ToolConfig[];
  };
  versionManager?: VersionManagerConfig;
  environmentVariables: EnvironmentVariable[];
  dependencies: DependencyConfig;
  scripts: Record<string, string>;
}

/**
 * Processed file with substituted content
 */
export interface ProcessedFile {
  path: string;
  content: string;
  executable: boolean;
}

/**
 * Template validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Export singleton instance
export const workspaceTemplateManager = new WorkspaceTemplateManager(); 