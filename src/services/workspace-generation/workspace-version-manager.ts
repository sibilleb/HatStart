import fs from 'fs/promises';
import path from 'path';
import type { IDEType, ProgrammingLanguage } from './workspace-installer-integration';

// Mock VersionManagementEngine interface for compilation
interface VersionManagementEngine {
  isVersionManagerAvailable(manager: string): Promise<boolean>;
  listInstalledVersions(manager: string): Promise<string[]>;
  listAvailableVersions(manager: string): Promise<string[]>;
  installVersion(manager: string, version: string): Promise<{ success: boolean; error?: string }>;
  isVersionInstalled(manager: string, version: string): Promise<boolean>;
  getEnvironmentSetup(manager: string, version: string): Promise<{
    variables: Record<string, string>;
    pathAdditions: string[];
    shellCommands: string[];
  }>;
}

export interface VersionRequirement {
  language: ProgrammingLanguage;
  version: string;
  versionManager: string;
  isRequired: boolean;
  fallbackVersions?: string[];
}

export interface WorkspaceVersionConfiguration {
  workspaceName: string;
  workspacePath: string;
  ideType: IDEType;
  versionRequirements: VersionRequirement[];
  environmentVariables: Record<string, string>;
  shellConfiguration: {
    rcFile: string;
    exports: string[];
    pathAdditions: string[];
  };
}

export interface VersionInstallationResult {
  language: ProgrammingLanguage;
  requestedVersion: string;
  installedVersion: string;
  versionManager: string;
  success: boolean;
  error?: string;
  configurationFiles: string[];
}

export interface WorkspaceVersionSetupResult {
  workspaceName: string;
  success: boolean;
  results: VersionInstallationResult[];
  environmentSetup: {
    variables: Record<string, string>;
    pathAdditions: string[];
    shellCommands: string[];
  };
  configurationFiles: string[];
  errors: string[];
}

/**
 * WorkspaceVersionManager integrates version managers with workspace generation
 * to ensure each language-isolated workspace has the correct tool versions
 */
export class WorkspaceVersionManager {
  private versionEngine: VersionManagementEngine;
  private logger: Console;

  constructor(versionEngine?: VersionManagementEngine) {
    this.versionEngine = versionEngine || {} as VersionManagementEngine;
    this.logger = console;
  }

  /**
   * Analyze workspace requirements and determine version manager needs
   */
  async analyzeVersionRequirements(
    requirements: WorkspaceRequirement,
    workspacePath: string
  ): Promise<VersionRequirement[]> {
    const versionRequirements: VersionRequirement[] = [];

    // Analyze each detected language
    for (const language of requirements.detectedLanguages) {
      const versionManager = this.getVersionManagerForLanguage(language);
      if (versionManager) {
        // Check if version manager is available
        const isAvailable = await this.versionEngine.isVersionManagerAvailable(versionManager);
        
        if (isAvailable) {
          // Get recommended version for the language
          const recommendedVersion = await this.getRecommendedVersion(language, workspacePath);
          
          versionRequirements.push({
            language,
            version: recommendedVersion,
            versionManager,
            isRequired: true,
            fallbackVersions: await this.getFallbackVersions(language, versionManager)
          });
        } else {
          this.logger.warn(`Version manager ${versionManager} not available for ${language}`);
        }
      }
    }

    return versionRequirements;
  }

  /**
   * Set up version managers for a workspace
   */
  async setupWorkspaceVersions(
    config: WorkspaceVersionConfiguration
  ): Promise<WorkspaceVersionSetupResult> {
    const results: VersionInstallationResult[] = [];
    const errors: string[] = [];
    const environmentVariables: Record<string, string> = {};
    const pathAdditions: string[] = [];
    const shellCommands: string[] = [];
    const configurationFiles: string[] = [];

    this.logger.info(`Setting up versions for workspace: ${config.workspaceName}`);

    // Process each version requirement
    for (const requirement of config.versionRequirements) {
      try {
        const result = await this.setupLanguageVersion(requirement, config.workspacePath);
        results.push(result);

        if (result.success) {
          // Collect environment setup
          const envSetup = await this.getEnvironmentSetup(
            requirement.language,
            requirement.versionManager,
            result.installedVersion,
            config.workspacePath
          );

          Object.assign(environmentVariables, envSetup.variables);
          pathAdditions.push(...envSetup.pathAdditions);
          shellCommands.push(...envSetup.shellCommands);
          configurationFiles.push(...result.configurationFiles);
        } else {
          errors.push(`Failed to setup ${requirement.language}: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = `Error setting up ${requirement.language}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMessage);
        this.logger.error(errorMessage);

        results.push({
          language: requirement.language,
          requestedVersion: requirement.version,
          installedVersion: '',
          versionManager: requirement.versionManager,
          success: false,
          error: errorMessage,
          configurationFiles: []
        });
      }
    }

    // Generate workspace-specific configuration files
    await this.generateWorkspaceVersionConfig(config, environmentVariables, pathAdditions);

    return {
      workspaceName: config.workspaceName,
      success: errors.length === 0,
      results,
      environmentSetup: {
        variables: environmentVariables,
        pathAdditions,
        shellCommands
      },
      configurationFiles,
      errors
    };
  }

  /**
   * Set up a specific language version using its version manager
   */
  private async setupLanguageVersion(
    requirement: VersionRequirement,
    workspacePath: string
  ): Promise<VersionInstallationResult> {
    const { language, version, versionManager } = requirement;

    this.logger.info(`Setting up ${language} ${version} using ${versionManager}`);

    try {
      // Check if version is already installed
      const installedVersions = await this.versionEngine.listInstalledVersions(versionManager);
      const isInstalled = installedVersions.includes(version);

      let installedVersion = version;

      if (!isInstalled) {
        // Install the requested version
        const installResult = await this.versionEngine.installVersion(versionManager, version);
        if (!installResult.success) {
          // Try fallback versions
          if (requirement.fallbackVersions) {
            for (const fallbackVersion of requirement.fallbackVersions) {
              const fallbackResult = await this.versionEngine.installVersion(versionManager, fallbackVersion);
              if (fallbackResult.success) {
                installedVersion = fallbackVersion;
                break;
              }
            }
          }
          
          if (installedVersion === version) {
            throw new Error(`Failed to install ${language} ${version}: ${installResult.error}`);
          }
        }
      }

      // Set as default for this workspace
      await this.setWorkspaceDefault(versionManager, installedVersion, workspacePath);

      // Generate configuration files
      const configFiles = await this.generateVersionConfigFiles(
        language,
        versionManager,
        installedVersion,
        workspacePath
      );

      return {
        language,
        requestedVersion: version,
        installedVersion,
        versionManager,
        success: true,
        configurationFiles: configFiles
      };

    } catch (error) {
      return {
        language,
        requestedVersion: version,
        installedVersion: '',
        versionManager,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        configurationFiles: []
      };
    }
  }

  /**
   * Get the appropriate version manager for a programming language
   */
  private getVersionManagerForLanguage(language: ProgrammingLanguage): string | null {
    const versionManagerMap: Record<ProgrammingLanguage, string> = {
      'javascript': 'nvm',
      'typescript': 'nvm',
      'python': 'pyenv',
      'java': 'jenv',
      'rust': 'rustup',
      'go': 'g',
      'csharp': 'dotnet',
      'cpp': 'vcpkg',
      'php': 'phpenv',
      'ruby': 'rbenv'
    };

    return versionManagerMap[language] || null;
  }

  /**
   * Get recommended version for a language
   */
  private async getRecommendedVersion(
    language: ProgrammingLanguage,
    workspacePath: string
  ): Promise<string> {
    // Check for existing version files in the workspace
    const versionFiles = await this.checkForVersionFiles(language, workspacePath);
    if (versionFiles.length > 0) {
      const version = await this.parseVersionFromFile(versionFiles[0]);
      if (version) return version;
    }

    // Return default recommended versions
    const defaultVersions: Record<ProgrammingLanguage, string> = {
      'javascript': '20.11.0',
      'typescript': '20.11.0',
      'python': '3.11.7',
      'java': '21',
      'rust': 'stable',
      'go': '1.21.5',
      'csharp': '8.0',
      'cpp': 'latest',
      'php': '8.3',
      'ruby': '3.2.0'
    };

    return defaultVersions[language] || 'latest';
  }

  /**
   * Get fallback versions for a language
   */
  private async getFallbackVersions(
    language: ProgrammingLanguage,
    versionManager: string
  ): Promise<string[]> {
    try {
      const availableVersions = await this.versionEngine.listAvailableVersions(versionManager);
      
      // Return the 3 most recent stable versions
      const stableVersions = availableVersions
        .filter(v => !v.includes('beta') && !v.includes('alpha') && !v.includes('rc'))
        .slice(0, 3);

      return stableVersions;
    } catch (error) {
      this.logger.warn(`Could not get fallback versions for ${language}: ${error}`);
      return [];
    }
  }

  /**
   * Check for existing version files in workspace
   */
  private async checkForVersionFiles(
    language: ProgrammingLanguage,
    workspacePath: string
  ): Promise<string[]> {
    const versionFileMap: Record<ProgrammingLanguage, string[]> = {
      'javascript': ['.nvmrc', '.node-version'],
      'typescript': ['.nvmrc', '.node-version'],
      'python': ['.python-version', 'pyproject.toml', 'runtime.txt'],
      'java': ['.java-version', 'pom.xml', 'build.gradle'],
      'rust': ['rust-toolchain.toml', 'rust-toolchain'],
      'go': ['go.mod'],
      'csharp': ['.dotnet-version', '*.csproj'],
      'cpp': ['vcpkg.json', 'conanfile.txt'],
      'php': ['.php-version', 'composer.json'],
      'ruby': ['.ruby-version', 'Gemfile']
    };

    const possibleFiles = versionFileMap[language] || [];
    const existingFiles: string[] = [];

    for (const file of possibleFiles) {
      const filePath = path.join(workspacePath, file);
      try {
        await fs.access(filePath);
        existingFiles.push(filePath);
      } catch {
        // File doesn't exist, continue
      }
    }

    return existingFiles;
  }

  /**
   * Parse version from a version file
   */
  private async parseVersionFromFile(filePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);

      switch (fileName) {
        case '.nvmrc':
        case '.node-version':
        case '.python-version':
        case '.java-version':
        case '.php-version':
        case '.ruby-version':
          return content.trim();
        
        case 'package.json': {
          const packageJson = JSON.parse(content);
          return packageJson.engines?.node || null;
        }
        
        case 'pyproject.toml': {
          const pythonVersionMatch = content.match(/python\s*=\s*"([^"]+)"/);
          return pythonVersionMatch ? pythonVersionMatch[1] : null;
        }
        
        case 'go.mod': {
          const goVersionMatch = content.match(/go\s+(\d+\.\d+)/);
          return goVersionMatch ? goVersionMatch[1] : null;
        }
        
        default:
          return null;
      }
    } catch (error) {
      this.logger.warn(`Could not parse version from ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Set workspace-specific default version
   */
  private async setWorkspaceDefault(
    versionManager: string,
    version: string,
    workspacePath: string
  ): Promise<void> {
    // This would typically create workspace-specific version files
    // For now, we'll create a simple version file
    const versionFile = path.join(workspacePath, `.${versionManager}-version`);
    await fs.writeFile(versionFile, version, 'utf-8');
  }

  /**
   * Generate version-specific configuration files
   */
  private async generateVersionConfigFiles(
    language: ProgrammingLanguage,
    versionManager: string,
    version: string,
    workspacePath: string
  ): Promise<string[]> {
    const configFiles: string[] = [];

    try {
      // Generate language-specific configuration
      switch (language) {
        case 'javascript':
        case 'typescript':
          if (versionManager === 'nvm') {
            const nvmrcPath = path.join(workspacePath, '.nvmrc');
            await fs.writeFile(nvmrcPath, version, 'utf-8');
            configFiles.push(nvmrcPath);
          }
          break;

        case 'python':
          if (versionManager === 'pyenv') {
            const pythonVersionPath = path.join(workspacePath, '.python-version');
            await fs.writeFile(pythonVersionPath, version, 'utf-8');
            configFiles.push(pythonVersionPath);
          }
          break;

        case 'java':
          if (versionManager === 'jenv') {
            const javaVersionPath = path.join(workspacePath, '.java-version');
            await fs.writeFile(javaVersionPath, version, 'utf-8');
            configFiles.push(javaVersionPath);
          }
          break;

        case 'ruby':
          if (versionManager === 'rbenv') {
            const rubyVersionPath = path.join(workspacePath, '.ruby-version');
            await fs.writeFile(rubyVersionPath, version, 'utf-8');
            configFiles.push(rubyVersionPath);
          }
          break;
      }

      this.logger.info(`Generated ${configFiles.length} configuration files for ${language}`);
    } catch (error) {
      this.logger.error(`Error generating config files for ${language}: ${error}`);
    }

    return configFiles;
  }

  /**
   * Get environment setup for a language version
   */
  private async getEnvironmentSetup(
    language: ProgrammingLanguage,
    versionManager: string,
    version: string,
    workspacePath: string
  ): Promise<{
    variables: Record<string, string>;
    pathAdditions: string[];
    shellCommands: string[];
  }> {
    const variables: Record<string, string> = {};
    const pathAdditions: string[] = [];
    const shellCommands: string[] = [];

    // Get version manager specific environment setup
    try {
      const envSetup = await this.versionEngine.getEnvironmentSetup(versionManager, version);
      Object.assign(variables, envSetup.variables);
      pathAdditions.push(...envSetup.pathAdditions);
      shellCommands.push(...envSetup.shellCommands);
    } catch (error) {
      this.logger.warn(`Could not get environment setup for ${versionManager}: ${error}`);
    }

    // Add language-specific environment variables
    switch (language) {
      case 'python':
        variables.PYTHONPATH = workspacePath;
        break;
      case 'java':
        variables.JAVA_HOME = await this.getJavaHome(version);
        break;
      case 'go':
        variables.GOPATH = path.join(workspacePath, 'go');
        variables.GOROOT = await this.getGoRoot(version);
        break;
    }

    return { variables, pathAdditions, shellCommands };
  }

  /**
   * Generate workspace-specific version configuration
   */
  private async generateWorkspaceVersionConfig(
    config: WorkspaceVersionConfiguration,
    environmentVariables: Record<string, string>,
    pathAdditions: string[]
  ): Promise<void> {
    const configPath = path.join(config.workspacePath, '.workspace-versions.json');
    
    const workspaceConfig = {
      workspaceName: config.workspaceName,
      ideType: config.ideType,
      versionRequirements: config.versionRequirements,
      environment: {
        variables: environmentVariables,
        pathAdditions
      },
      generatedAt: new Date().toISOString()
    };

    await fs.writeFile(configPath, JSON.stringify(workspaceConfig, null, 2), 'utf-8');
    this.logger.info(`Generated workspace version configuration: ${configPath}`);
  }

  /**
   * Get Java home for a specific version
   */
  private async getJavaHome(version: string): Promise<string> {
    // This would typically query jenv or system for Java installation path
    return `/usr/lib/jvm/java-${version}`;
  }

  /**
   * Get Go root for a specific version
   */
  private async getGoRoot(version: string): Promise<string> {
    // This would typically query the Go installation path
    return `/usr/local/go-${version}`;
  }

  /**
   * Validate workspace version setup
   */
  async validateWorkspaceVersions(workspacePath: string): Promise<{
    isValid: boolean;
    issues: Array<{
      language: ProgrammingLanguage;
      issue: string;
      severity: 'error' | 'warning';
    }>;
  }> {
    const issues: Array<{
      language: ProgrammingLanguage;
      issue: string;
      severity: 'error' | 'warning';
    }> = [];

    try {
      const configPath = path.join(workspacePath, '.workspace-versions.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // Validate each version requirement
      for (const requirement of config.versionRequirements) {
        const isInstalled = await this.versionEngine.isVersionInstalled(
          requirement.versionManager,
          requirement.version
        );

        if (!isInstalled) {
          issues.push({
            language: requirement.language,
            issue: `Version ${requirement.version} not installed`,
            severity: 'error'
          });
        }
      }
    } catch (error) {
      issues.push({
        language: 'javascript', // Default language for config issues
        issue: `Could not validate workspace versions: ${error}`,
        severity: 'error'
      });
    }

    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }
} 