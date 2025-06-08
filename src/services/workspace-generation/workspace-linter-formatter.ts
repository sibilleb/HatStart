import fs from 'fs/promises';
import path from 'path';

export interface LinterConfig {
  name: string;
  configFile: string;
  packageName: string;
  version?: string;
  isRequired: boolean;
  settings: Record<string, unknown>;
  ignorePatterns?: string[];
  extensions?: string[];
}

export interface FormatterConfig {
  name: string;
  configFile: string;
  packageName: string;
  version?: string;
  isRequired: boolean;
  settings: Record<string, unknown>;
  fileExtensions: string[];
  ideIntegration?: {
    vscode?: Record<string, unknown>;
    cursor?: Record<string, unknown>;
  };
}

export interface LanguageLintingProfile {
  language: string;
  linters: LinterConfig[];
  formatters: FormatterConfig[];
  preCommitHooks?: string[];
  editorConfig?: Record<string, unknown>;
  gitIgnorePatterns?: string[];
}

export interface WorkspaceLintingConfiguration {
  workspaceName: string;
  workspacePath: string;
  ideType: 'VSCode' | 'Cursor' | 'JetBrains';
  languages: string[];
  profiles: LanguageLintingProfile[];
  globalSettings: {
    enableAutoFix: boolean;
    enableFormatOnSave: boolean;
    enableLintOnSave: boolean;
    maxLineLength: number;
    indentSize: number;
    useSpaces: boolean;
  };
}

export class WorkspaceLinterFormatterService {
  private readonly languageConfigs: Map<string, LanguageLintingProfile>;

  constructor() {
    this.languageConfigs = new Map();
    this.initializeLanguageConfigs();
  }

  /**
   * Initialize built-in language configurations
   */
  private initializeLanguageConfigs(): void {
    // JavaScript/TypeScript Configuration
    this.languageConfigs.set('JavaScript', {
      language: 'JavaScript',
      linters: [
        {
          name: 'ESLint',
          configFile: '.eslintrc.json',
          packageName: 'eslint',
          version: '^8.0.0',
          isRequired: true,
          settings: {
            env: {
              browser: true,
              es2021: true,
              node: true
            },
            extends: [
              'eslint:recommended'
            ],
            parserOptions: {
              ecmaVersion: 'latest',
              sourceType: 'module'
            },
            rules: {
              'no-unused-vars': 'warn',
              'no-console': 'warn',
              'prefer-const': 'error',
              'no-var': 'error'
            }
          },
          ignorePatterns: ['node_modules/', 'dist/', 'build/'],
          extensions: ['.js', '.jsx']
        }
      ],
      formatters: [
        {
          name: 'Prettier',
          configFile: '.prettierrc.json',
          packageName: 'prettier',
          version: '^3.0.0',
          isRequired: true,
          settings: {
            semi: true,
            trailingComma: 'es5',
            singleQuote: true,
            printWidth: 80,
            tabWidth: 2,
            useTabs: false
          },
          fileExtensions: ['.js', '.jsx', '.json', '.md'],
          ideIntegration: {
            vscode: {
              'editor.defaultFormatter': 'esbenp.prettier-vscode',
              'editor.formatOnSave': true
            },
            cursor: {
              'editor.defaultFormatter': 'esbenp.prettier-vscode',
              'editor.formatOnSave': true
            }
          }
        }
      ],
      preCommitHooks: ['lint-staged'],
      editorConfig: {
        root: true,
        '*': {
          charset: 'utf-8',
          end_of_line: 'lf',
          insert_final_newline: true,
          trim_trailing_whitespace: true
        },
        '*.{js,jsx}': {
          indent_style: 'space',
          indent_size: 2
        }
      },
      gitIgnorePatterns: ['node_modules/', '.eslintcache']
    });

    this.languageConfigs.set('TypeScript', {
      language: 'TypeScript',
      linters: [
        {
          name: 'ESLint with TypeScript',
          configFile: '.eslintrc.json',
          packageName: '@typescript-eslint/eslint-plugin',
          version: '^6.0.0',
          isRequired: true,
          settings: {
            env: {
              browser: true,
              es2021: true,
              node: true
            },
            extends: [
              'eslint:recommended',
              '@typescript-eslint/recommended'
            ],
            parser: '@typescript-eslint/parser',
            parserOptions: {
              ecmaVersion: 'latest',
              sourceType: 'module',
              project: './tsconfig.json'
            },
            plugins: ['@typescript-eslint'],
            rules: {
              '@typescript-eslint/no-unused-vars': 'warn',
              '@typescript-eslint/no-explicit-any': 'warn',
              '@typescript-eslint/prefer-nullish-coalescing': 'error',
              '@typescript-eslint/prefer-optional-chain': 'error'
            }
          },
          ignorePatterns: ['node_modules/', 'dist/', 'build/', '*.js'],
          extensions: ['.ts', '.tsx']
        }
      ],
      formatters: [
        {
          name: 'Prettier',
          configFile: '.prettierrc.json',
          packageName: 'prettier',
          version: '^3.0.0',
          isRequired: true,
          settings: {
            semi: true,
            trailingComma: 'es5',
            singleQuote: true,
            printWidth: 80,
            tabWidth: 2,
            useTabs: false,
            parser: 'typescript'
          },
          fileExtensions: ['.ts', '.tsx', '.json', '.md'],
          ideIntegration: {
            vscode: {
              'editor.defaultFormatter': 'esbenp.prettier-vscode',
              'editor.formatOnSave': true,
              'typescript.preferences.quoteStyle': 'single'
            }
          }
        }
      ],
      preCommitHooks: ['lint-staged'],
      editorConfig: {
        root: true,
        '*': {
          charset: 'utf-8',
          end_of_line: 'lf',
          insert_final_newline: true,
          trim_trailing_whitespace: true
        },
        '*.{ts,tsx}': {
          indent_style: 'space',
          indent_size: 2
        }
      },
      gitIgnorePatterns: ['node_modules/', '.eslintcache', 'dist/', 'build/']
    });

    // Python Configuration
    this.languageConfigs.set('Python', {
      language: 'Python',
      linters: [
        {
          name: 'Flake8',
          configFile: '.flake8',
          packageName: 'flake8',
          version: '^6.0.0',
          isRequired: true,
          settings: {
            'max-line-length': 88,
            'extend-ignore': ['E203', 'W503'],
            'exclude': ['.git', '__pycache__', 'dist', 'build', '.venv']
          },
          ignorePatterns: ['__pycache__/', '*.pyc', '.venv/', 'dist/', 'build/'],
          extensions: ['.py']
        }
      ],
      formatters: [
        {
          name: 'Black',
          configFile: 'pyproject.toml',
          packageName: 'black',
          version: '^23.0.0',
          isRequired: true,
          settings: {
            'line-length': 88,
            'target-version': ['py38', 'py39', 'py310', 'py311'],
            'include': '\\.pyi?$',
            'exclude': '/(\\.|_build|buck-out|build|dist)/'
          },
          fileExtensions: ['.py', '.pyi'],
          ideIntegration: {
            vscode: {
              'python.formatting.provider': 'black',
              'editor.formatOnSave': true
            }
          }
        }
      ],
      preCommitHooks: ['black', 'flake8'],
      editorConfig: {
        root: true,
        '*': {
          charset: 'utf-8',
          end_of_line: 'lf',
          insert_final_newline: true,
          trim_trailing_whitespace: true
        },
        '*.py': {
          indent_style: 'space',
          indent_size: 4,
          max_line_length: 88
        }
      },
      gitIgnorePatterns: ['__pycache__/', '*.pyc', '*.pyo', '.venv/', 'dist/', 'build/', '*.egg-info/']
    });

    // Java Configuration
    this.languageConfigs.set('Java', {
      language: 'Java',
      linters: [
        {
          name: 'Checkstyle',
          configFile: 'checkstyle.xml',
          packageName: 'checkstyle',
          version: '^10.0.0',
          isRequired: true,
          settings: {
            'module': 'Checker',
            'charset': 'UTF-8',
            'severity': 'warning'
          },
          extensions: ['.java']
        }
      ],
      formatters: [
        {
          name: 'Google Java Format',
          configFile: '.java-format',
          packageName: 'google-java-format',
          version: '^1.17.0',
          isRequired: true,
          settings: {
            'style': 'google',
            'indent': 2,
            'column-limit': 120
          },
          fileExtensions: ['.java'],
          ideIntegration: {
            vscode: {
              'java.format.settings.url': 'https://raw.githubusercontent.com/google/styleguide/gh-pages/eclipse-java-google-style.xml',
              'editor.formatOnSave': true
            }
          }
        }
      ],
      editorConfig: {
        root: true,
        '*': {
          charset: 'utf-8',
          end_of_line: 'lf',
          insert_final_newline: true,
          trim_trailing_whitespace: true
        },
        '*.java': {
          indent_style: 'space',
          indent_size: 2,
          max_line_length: 120
        }
      },
      gitIgnorePatterns: ['target/', '*.class', '*.jar', '.settings/', '.project', '.classpath']
    });

    // Rust Configuration
    this.languageConfigs.set('Rust', {
      language: 'Rust',
      linters: [
        {
          name: 'Clippy',
          configFile: 'clippy.toml',
          packageName: 'clippy',
          isRequired: true,
          settings: {
            'avoid-breaking-exported-api': false,
            'msrv': '1.70.0'
          },
          extensions: ['.rs']
        }
      ],
      formatters: [
        {
          name: 'rustfmt',
          configFile: 'rustfmt.toml',
          packageName: 'rustfmt',
          isRequired: true,
          settings: {
            'edition': '2021',
            'max_width': 100,
            'hard_tabs': false,
            'tab_spaces': 4,
            'newline_style': 'Unix'
          },
          fileExtensions: ['.rs'],
          ideIntegration: {
            vscode: {
              'rust-analyzer.rustfmt.extraArgs': ['--edition', '2021'],
              'editor.formatOnSave': true
            }
          }
        }
      ],
      editorConfig: {
        root: true,
        '*': {
          charset: 'utf-8',
          end_of_line: 'lf',
          insert_final_newline: true,
          trim_trailing_whitespace: true
        },
        '*.rs': {
          indent_style: 'space',
          indent_size: 4,
          max_line_length: 100
        }
      },
      gitIgnorePatterns: ['target/', 'Cargo.lock']
    });
  }

  /**
   * Get linting profile for a specific language
   */
  getLanguageLintingProfile(language: string): LanguageLintingProfile | null {
    return this.languageConfigs.get(language) || null;
  }

  /**
   * Create workspace linting configuration
   */
  async createWorkspaceLintingConfiguration(
    workspaceName: string,
    workspacePath: string,
    ideType: 'VSCode' | 'Cursor' | 'JetBrains',
    languages: string[]
  ): Promise<WorkspaceLintingConfiguration> {
    const profiles: LanguageLintingProfile[] = [];

    for (const language of languages) {
      const profile = this.getLanguageLintingProfile(language);
      if (profile) {
        profiles.push(profile);
      }
    }

    return {
      workspaceName,
      workspacePath,
      ideType,
      languages,
      profiles,
      globalSettings: {
        enableAutoFix: true,
        enableFormatOnSave: true,
        enableLintOnSave: true,
        maxLineLength: 100,
        indentSize: 2,
        useSpaces: true
      }
    };
  }

  /**
   * Generate linter configuration files
   */
  async generateLinterConfigurations(
    workspacePath: string,
    configuration: WorkspaceLintingConfiguration
  ): Promise<void> {
    for (const profile of configuration.profiles) {
      for (const linter of profile.linters) {
        const configPath = path.join(workspacePath, linter.configFile);
        
        let configContent: string;
        
        if (linter.configFile.endsWith('.json')) {
          configContent = JSON.stringify(linter.settings, null, 2);
        } else if (linter.configFile.endsWith('.toml')) {
          configContent = this.generateTomlConfig(linter.settings);
        } else if (linter.configFile.endsWith('.xml')) {
          configContent = this.generateXmlConfig(linter.settings);
        } else {
          configContent = this.generateIniConfig(linter.settings);
        }

        await fs.writeFile(configPath, configContent, 'utf-8');
      }
    }
  }

  /**
   * Generate formatter configuration files
   */
  async generateFormatterConfigurations(
    workspacePath: string,
    configuration: WorkspaceLintingConfiguration
  ): Promise<void> {
    for (const profile of configuration.profiles) {
      for (const formatter of profile.formatters) {
        const configPath = path.join(workspacePath, formatter.configFile);
        
        let configContent: string;
        
        if (formatter.configFile.endsWith('.json')) {
          configContent = JSON.stringify(formatter.settings, null, 2);
        } else if (formatter.configFile.endsWith('.toml')) {
          configContent = this.generateTomlConfig(formatter.settings);
        } else {
          configContent = this.generateIniConfig(formatter.settings);
        }

        await fs.writeFile(configPath, configContent, 'utf-8');
      }
    }
  }

  /**
   * Generate complete linting and formatting setup
   */
  async setupWorkspaceLintingAndFormatting(
    configuration: WorkspaceLintingConfiguration
  ): Promise<{ success: boolean; configuredTools: string[]; errors: string[] }> {
    const configuredTools: string[] = [];
    const errors: string[] = [];

    try {
      // Generate linter configurations
      await this.generateLinterConfigurations(configuration.workspacePath, configuration);
      configuredTools.push('linters');

      // Generate formatter configurations
      await this.generateFormatterConfigurations(configuration.workspacePath, configuration);
      configuredTools.push('formatters');

      // Generate IDE settings
      await this.generateIDESettings(configuration.workspacePath, configuration);
      configuredTools.push('ide-settings');

      return {
        success: true,
        configuredTools,
        errors
      };
    } catch (error) {
      errors.push(`Failed to setup linting and formatting: ${(error as Error).message}`);
      return {
        success: false,
        configuredTools,
        errors
      };
    }
  }

  /**
   * Generate IDE-specific settings
   */
  private async generateIDESettings(
    workspacePath: string,
    configuration: WorkspaceLintingConfiguration
  ): Promise<void> {
    const ideSettings: Record<string, unknown> = {
      'editor.formatOnSave': configuration.globalSettings.enableFormatOnSave,
      'editor.codeActionsOnSave': {
        'source.fixAll': configuration.globalSettings.enableAutoFix
      },
      'editor.tabSize': configuration.globalSettings.indentSize,
      'editor.insertSpaces': configuration.globalSettings.useSpaces,
      'editor.rulers': [configuration.globalSettings.maxLineLength]
    };

    // Add language-specific settings
    for (const profile of configuration.profiles) {
      for (const formatter of profile.formatters) {
        if (formatter.ideIntegration) {
          const integration = formatter.ideIntegration[configuration.ideType.toLowerCase() as keyof typeof formatter.ideIntegration];
          if (integration) {
            Object.assign(ideSettings, integration);
          }
        }
      }
    }

    // Generate IDE-specific configuration files
    if (configuration.ideType === 'VSCode') {
      const vscodeDir = path.join(workspacePath, '.vscode');
      await fs.mkdir(vscodeDir, { recursive: true });
      
      const settingsPath = path.join(vscodeDir, 'settings.json');
      await fs.writeFile(settingsPath, JSON.stringify(ideSettings, null, 2), 'utf-8');
    } else if (configuration.ideType === 'Cursor') {
      const cursorDir = path.join(workspacePath, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      const settingsPath = path.join(cursorDir, 'settings.json');
      await fs.writeFile(settingsPath, JSON.stringify(ideSettings, null, 2), 'utf-8');
    }
  }

  /**
   * Helper method to generate TOML configuration
   */
  private generateTomlConfig(settings: Record<string, unknown>): string {
    let toml = '';
    
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        toml += `[${key}]\n`;
        for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
          toml += `${subKey} = ${JSON.stringify(subValue)}\n`;
        }
        toml += '\n';
      } else {
        toml += `${key} = ${JSON.stringify(value)}\n`;
      }
    }
    
    return toml;
  }

  /**
   * Helper method to generate XML configuration
   */
  private generateXmlConfig(_settings: Record<string, unknown>): string {
    // Basic XML generation for Checkstyle
    let xml = '<?xml version="1.0"?>\n';
    xml += '<!DOCTYPE module PUBLIC "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN" "https://checkstyle.org/dtds/configuration_1_3.dtd">\n';
    xml += '<module name="Checker">\n';
    xml += '  <property name="charset" value="UTF-8"/>\n';
    xml += '  <property name="severity" value="warning"/>\n';
    xml += '  <module name="TreeWalker">\n';
    xml += '    <module name="LineLength">\n';
    xml += '      <property name="max" value="120"/>\n';
    xml += '    </module>\n';
    xml += '  </module>\n';
    xml += '</module>\n';
    
    return xml;
  }

  /**
   * Helper method to generate INI configuration
   */
  private generateIniConfig(settings: Record<string, unknown>): string {
    let ini = '';
    
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        ini += `[${key}]\n`;
        for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
          ini += `${subKey} = ${subValue}\n`;
        }
        ini += '\n';
      } else {
        ini += `${key} = ${value}\n`;
      }
    }
    
    return ini;
  }
} 