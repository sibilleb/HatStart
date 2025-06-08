import fs from 'fs/promises';
import path from 'path';
import { IDEDetector } from '../../shared/ide-detector';
import { ExtensionRecommendation } from './extension-manager';
import { WorkspaceRequirements, WorkspaceRequirementsService } from './workspace-requirements-service';
import { WorkspaceTemplateManager } from './workspace-template-manager';

// Type definitions
export type IDEType = 'vscode' | 'cursor' | 'jetbrains' | 'vim' | 'emacs';
export type ProgrammingLanguage = 'javascript' | 'typescript' | 'python' | 'java' | 'rust' | 'go' | 'csharp' | 'cpp' | 'php' | 'ruby';

// Mock interfaces for missing dependencies
interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

interface CategoryInstaller {
  installCategory(category: string, options: Record<string, unknown>): Promise<{ success: boolean; error?: string; wasUpdated?: boolean }>;
  getInstalledVersion(tool: string): Promise<string | null>;
}

interface ConfigurationValidator {
  validateWorkspaceConfiguration(path: string): Promise<{
    isValid: boolean;
    issues: Array<{
      component: string;
      message: string;
      severity: 'error' | 'warning';
      suggestion?: string;
    }>;
  }>;
}

export interface WorkspaceInstallationRequest {
  workspaceName: string;
  workspacePath: string;
  languages: ProgrammingLanguage[];
  preferredIDE: IDEType;
  templateType?: string;
  customExtensions?: ExtensionRecommendation[];
  installIDEIfMissing?: boolean;
  installExtensions?: boolean;
  setupToolchain?: boolean;
  createWorkspaceFiles?: boolean;
}

export interface WorkspaceInstallationResult {
  success: boolean;
  workspacePath: string;
  installedComponents: InstalledComponent[];
  errors: InstallationError[];
  warnings: string[];
  configurationFiles: string[];
  nextSteps: string[];
}

export interface InstalledComponent {
  type: 'ide' | 'extension' | 'tool' | 'runtime' | 'configuration';
  name: string;
  version?: string;
  path?: string;
  status: 'installed' | 'updated' | 'skipped' | 'failed';
  details?: string;
}

export interface InstallationError {
  component: string;
  type: 'ide' | 'extension' | 'tool' | 'runtime' | 'configuration';
  error: string;
  severity: 'critical' | 'warning' | 'info';
  suggestion?: string;
}

export interface WorkspaceInstallationProgress {
  phase: 'detection' | 'ide-setup' | 'extension-install' | 'toolchain-setup' | 'workspace-creation' | 'validation' | 'complete';
  progress: number; // 0-100
  currentTask: string;
  estimatedTimeRemaining?: number;
}

export class WorkspaceInstallerIntegration {
  private logger: Logger;
  private categoryInstaller: CategoryInstaller;
  private templateManager: WorkspaceTemplateManager;
  private requirementsService: WorkspaceRequirementsService;
  private configValidator: ConfigurationValidator;
  private ideDetector: IDEDetector;

  constructor(
    categoryInstaller: CategoryInstaller,
    templateManager: WorkspaceTemplateManager,
    requirementsService: WorkspaceRequirementsService,
    configValidator: ConfigurationValidator,
    ideDetector: IDEDetector
  ) {
    this.logger = new Logger('WorkspaceInstallerIntegration');
    this.categoryInstaller = categoryInstaller;
    this.templateManager = templateManager;
    this.requirementsService = requirementsService;
    this.configValidator = configValidator;
    this.ideDetector = ideDetector;
  }

  /**
   * Install a complete workspace with language isolation
   */
  async installWorkspace(
    request: WorkspaceInstallationRequest,
    progressCallback?: (progress: WorkspaceInstallationProgress) => void
  ): Promise<WorkspaceInstallationResult> {
    const result: WorkspaceInstallationResult = {
      success: false,
      workspacePath: request.workspacePath,
      installedComponents: [],
      errors: [],
      warnings: [],
      configurationFiles: [],
      nextSteps: []
    };

    try {
      this.logger.info(`Starting workspace installation: ${request.workspaceName}`);
      
      // Phase 1: Detection and Requirements Analysis
      this.updateProgress(progressCallback, {
        phase: 'detection',
        progress: 10,
        currentTask: 'Analyzing requirements and detecting existing tools'
      });

      const requirements = await this.analyzeRequirements(request);
      const existingTools = await this.detectExistingTools(request.preferredIDE);

      // Phase 2: IDE Setup
      this.updateProgress(progressCallback, {
        phase: 'ide-setup',
        progress: 25,
        currentTask: 'Setting up IDE environment'
      });

      if (request.installIDEIfMissing) {
        const ideResult = await this.setupIDE(request.preferredIDE, existingTools);
        result.installedComponents.push(...ideResult.components);
        result.errors.push(...ideResult.errors);
      }

      // Phase 3: Extension Installation
      this.updateProgress(progressCallback, {
        phase: 'extension-install',
        progress: 45,
        currentTask: 'Installing language-specific extensions'
      });

      if (request.installExtensions) {
        const extensionResult = await this.installExtensions(request, requirements);
        result.installedComponents.push(...extensionResult.components);
        result.errors.push(...extensionResult.errors);
      }

      // Phase 4: Toolchain Setup
      this.updateProgress(progressCallback, {
        phase: 'toolchain-setup',
        progress: 65,
        currentTask: 'Setting up development toolchain'
      });

      if (request.setupToolchain) {
        const toolchainResult = await this.setupToolchain(request.languages, requirements);
        result.installedComponents.push(...toolchainResult.components);
        result.errors.push(...toolchainResult.errors);
      }

      // Phase 5: Workspace Creation
      this.updateProgress(progressCallback, {
        phase: 'workspace-creation',
        progress: 80,
        currentTask: 'Creating workspace configuration files'
      });

      if (request.createWorkspaceFiles) {
        const workspaceResult = await this.createWorkspaceFiles(request, requirements);
        result.configurationFiles.push(...workspaceResult.files);
        result.errors.push(...workspaceResult.errors);
      }

      // Phase 6: Validation
      this.updateProgress(progressCallback, {
        phase: 'validation',
        progress: 95,
        currentTask: 'Validating workspace configuration'
      });

      const validationResult = await this.validateWorkspace(request.workspacePath);
      result.warnings.push(...validationResult.warnings);
      result.errors.push(...validationResult.errors);

      // Phase 7: Complete
      this.updateProgress(progressCallback, {
        phase: 'complete',
        progress: 100,
        currentTask: 'Workspace installation complete'
      });

      result.success = result.errors.filter(e => e.severity === 'critical').length === 0;
      result.nextSteps = this.generateNextSteps(request, result);

      this.logger.info(`Workspace installation completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;

    } catch (error) {
      this.logger.error('Workspace installation failed:', error);
      result.errors.push({
        component: 'workspace-installer',
        type: 'configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
        severity: 'critical',
        suggestion: 'Check logs for detailed error information'
      });
      return result;
    }
  }

  /**
   * Install multiple language-isolated workspaces
   */
  async installMultiLanguageWorkspaces(
    baseRequest: Omit<WorkspaceInstallationRequest, 'languages' | 'workspaceName' | 'workspacePath'>,
    languages: ProgrammingLanguage[],
    baseWorkspacePath: string,
    progressCallback?: (progress: WorkspaceInstallationProgress) => void
  ): Promise<WorkspaceInstallationResult[]> {
    const results: WorkspaceInstallationResult[] = [];
    const totalLanguages = languages.length;

    for (let i = 0; i < languages.length; i++) {
      const language = languages[i];
      const workspaceName = `${baseRequest.workspaceName || 'workspace'}-${language}`;
      const workspacePath = path.join(baseWorkspacePath, workspaceName);

      this.updateProgress(progressCallback, {
        phase: 'workspace-creation',
        progress: Math.round((i / totalLanguages) * 100),
        currentTask: `Creating ${language} workspace (${i + 1}/${totalLanguages})`
      });

      const languageRequest: WorkspaceInstallationRequest = {
        ...baseRequest,
        workspaceName,
        workspacePath,
        languages: [language]
      };

      const result = await this.installWorkspace(languageRequest);
      results.push(result);
    }

    return results;
  }

  /**
   * Analyze workspace requirements
   */
  private async analyzeRequirements(request: WorkspaceInstallationRequest): Promise<WorkspaceRequirements> {
    return await this.requirementsService.analyzeRequirements({
      languages: request.languages,
      preferredIDE: request.preferredIDE,
      projectPath: request.workspacePath,
      templateType: request.templateType
    });
  }

  /**
   * Detect existing development tools
   */
  private async detectExistingTools(preferredIDE: IDEType): Promise<Map<string, string>> {
    const existingTools = new Map<string, string>();

    try {
      // Detect IDE
      const ideDetected = await this.ideDetector.detectIDE(preferredIDE);
      if (ideDetected.isInstalled) {
        existingTools.set(preferredIDE, ideDetected.version || 'unknown');
      }

      // Detect common development tools
      const commonTools = ['node', 'npm', 'yarn', 'python', 'pip', 'java', 'mvn', 'gradle', 'go', 'rust', 'cargo'];
      
      for (const tool of commonTools) {
        try {
          const version = await this.categoryInstaller.getInstalledVersion(tool);
          if (version) {
            existingTools.set(tool, version);
          }
        } catch {
          // Tool not installed, continue
        }
      }

    } catch (error) {
      this.logger.warn('Error detecting existing tools:', error);
    }

    return existingTools;
  }

  /**
   * Setup IDE environment
   */
  private async setupIDE(ideType: IDEType, existingTools: Map<string, string>): Promise<{
    components: InstalledComponent[];
    errors: InstallationError[];
  }> {
    const components: InstalledComponent[] = [];
    const errors: InstallationError[] = [];

    try {
      if (!existingTools.has(ideType)) {
        this.logger.info(`Installing ${ideType}...`);
        
        const installResult = await this.categoryInstaller.installCategory('ide', {
          specificTools: [ideType],
          skipExisting: false
        });

        if (installResult.success) {
          components.push({
            type: 'ide',
            name: ideType,
            status: 'installed',
            details: 'Successfully installed IDE'
          });
        } else {
          errors.push({
            component: ideType,
            type: 'ide',
            error: installResult.error || 'Failed to install IDE',
            severity: 'critical',
            suggestion: 'Try installing the IDE manually'
          });
        }
      } else {
        components.push({
          type: 'ide',
          name: ideType,
          version: existingTools.get(ideType),
          status: 'skipped',
          details: 'IDE already installed'
        });
      }
    } catch (error) {
      errors.push({
        component: ideType,
        type: 'ide',
        error: error instanceof Error ? error.message : 'Unknown error',
        severity: 'critical'
      });
    }

    return { components, errors };
  }

  /**
   * Install language-specific extensions
   */
  private async installExtensions(
    request: WorkspaceInstallationRequest,
    _requirements: WorkspaceRequirements
  ): Promise<{
    components: InstalledComponent[];
    errors: InstallationError[];
  }> {
    const components: InstalledComponent[] = [];
    const errors: InstallationError[] = [];

    try {
      // Get extension recommendations
      const extensionProfile = await this.templateManager.getExtensionProfile(
        request.languages,
        request.preferredIDE
      );

      // Install extensions using CategoryInstaller
      for (const extension of extensionProfile.extensions) {
        try {
          const installResult = await this.installExtension(extension, request.preferredIDE);
          
          if (installResult.success) {
            components.push({
              type: 'extension',
              name: extension.name,
              version: extension.version,
              status: installResult.wasUpdated ? 'updated' : 'installed',
              details: extension.description
            });
          } else {
            errors.push({
              component: extension.name,
              type: 'extension',
              error: installResult.error || 'Failed to install extension',
              severity: extension.required ? 'critical' : 'warning',
              suggestion: 'Try installing the extension manually from the IDE marketplace'
            });
          }
        } catch (error) {
          errors.push({
            component: extension.name,
            type: 'extension',
            error: error instanceof Error ? error.message : 'Unknown error',
            severity: extension.required ? 'critical' : 'warning'
          });
        }
      }

      // Install custom extensions if provided
      if (request.customExtensions) {
        for (const extension of request.customExtensions) {
          try {
            const installResult = await this.installExtension(extension, request.preferredIDE);
            
            if (installResult.success) {
              components.push({
                type: 'extension',
                name: extension.name,
                status: 'installed',
                details: 'Custom extension'
              });
            }
          } catch (error) {
            errors.push({
              component: extension.name,
              type: 'extension',
              error: error instanceof Error ? error.message : 'Unknown error',
              severity: 'warning'
            });
          }
        }
      }

    } catch (error) {
      errors.push({
        component: 'extension-manager',
        type: 'extension',
        error: error instanceof Error ? error.message : 'Unknown error',
        severity: 'critical'
      });
    }

    return { components, errors };
  }

  /**
   * Install a single extension
   */
  private async installExtension(
    extension: ExtensionRecommendation,
    ideType: IDEType
  ): Promise<{ success: boolean; wasUpdated: boolean; error?: string }> {
    try {
      // Use CategoryInstaller to install the extension
      const result = await this.categoryInstaller.installCategory('extension', {
        specificTools: [extension.id],
        ideType: ideType,
        skipExisting: false
      });

      return {
        success: result.success,
        wasUpdated: result.wasUpdated || false,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        wasUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Setup development toolchain
   */
  private async setupToolchain(
    languages: ProgrammingLanguage[],
    requirements: WorkspaceRequirements
  ): Promise<{
    components: InstalledComponent[];
    errors: InstallationError[];
  }> {
    const components: InstalledComponent[] = [];
    const errors: InstallationError[] = [];

    try {
      // Install language runtimes and tools
      for (const language of languages) {
        const languageTools = requirements.toolRecommendations.get(language);
        if (!languageTools) continue;

        // Install runtime
        if (languageTools.runtime) {
          try {
            const result = await this.categoryInstaller.installCategory('runtime', {
              specificTools: [languageTools.runtime.name],
              version: languageTools.runtime.version
            });

            if (result.success) {
              components.push({
                type: 'runtime',
                name: languageTools.runtime.name,
                version: languageTools.runtime.version,
                status: 'installed'
              });
            } else {
              errors.push({
                component: languageTools.runtime.name,
                type: 'runtime',
                error: result.error || 'Failed to install runtime',
                severity: 'critical'
              });
            }
          } catch (error) {
            errors.push({
              component: languageTools.runtime.name,
              type: 'runtime',
              error: error instanceof Error ? error.message : 'Unknown error',
              severity: 'critical'
            });
          }
        }

        // Install package managers
        for (const packageManager of languageTools.packageManagers) {
          try {
            const result = await this.categoryInstaller.installCategory('tool', {
              specificTools: [packageManager.name],
              version: packageManager.version
            });

            if (result.success) {
              components.push({
                type: 'tool',
                name: packageManager.name,
                version: packageManager.version,
                status: 'installed'
              });
            }
          } catch (error) {
            errors.push({
              component: packageManager.name,
              type: 'tool',
              error: error instanceof Error ? error.message : 'Unknown error',
              severity: 'warning'
            });
          }
        }

        // Install build tools
        for (const buildTool of languageTools.buildTools) {
          try {
            const result = await this.categoryInstaller.installCategory('tool', {
              specificTools: [buildTool.name],
              version: buildTool.version
            });

            if (result.success) {
              components.push({
                type: 'tool',
                name: buildTool.name,
                version: buildTool.version,
                status: 'installed'
              });
            }
          } catch (error) {
            errors.push({
              component: buildTool.name,
              type: 'tool',
              error: error instanceof Error ? error.message : 'Unknown error',
              severity: 'warning'
            });
          }
        }
      }

    } catch (error) {
      errors.push({
        component: 'toolchain-setup',
        type: 'tool',
        error: error instanceof Error ? error.message : 'Unknown error',
        severity: 'critical'
      });
    }

    return { components, errors };
  }

  /**
   * Create workspace configuration files
   */
  private async createWorkspaceFiles(
    request: WorkspaceInstallationRequest,
    _requirements: WorkspaceRequirements
  ): Promise<{
    files: string[];
    errors: InstallationError[];
  }> {
    const files: string[] = [];
    const errors: InstallationError[] = [];

    try {
      // Ensure workspace directory exists
      await fs.mkdir(request.workspacePath, { recursive: true });

      // Generate workspace template
      const template = await this.templateManager.generateWorkspaceTemplate({
        languages: request.languages,
        ideType: request.preferredIDE,
        templateType: request.templateType || 'basic',
        projectName: request.workspaceName,
        includeExtensions: true,
        includeSettings: true,
        includeTasks: true,
        includeDebugConfig: true
      });

      // Create workspace files
      for (const [filePath, content] of Object.entries(template.files)) {
        try {
          const fullPath = path.join(request.workspacePath, filePath);
          const dir = path.dirname(fullPath);
          
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(fullPath, content, 'utf8');
          
          files.push(filePath);
        } catch (error) {
          errors.push({
            component: filePath,
            type: 'configuration',
            error: error instanceof Error ? error.message : 'Failed to create file',
            severity: 'warning'
          });
        }
      }

      this.logger.info(`Created ${files.length} workspace configuration files`);

    } catch (error) {
      errors.push({
        component: 'workspace-files',
        type: 'configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
        severity: 'critical'
      });
    }

    return { files, errors };
  }

  /**
   * Validate workspace configuration
   */
  private async validateWorkspace(workspacePath: string): Promise<{
    warnings: string[];
    errors: InstallationError[];
  }> {
    const warnings: string[] = [];
    const errors: InstallationError[] = [];

    try {
      // Use ConfigurationValidator to validate the workspace
      const validationResult = await this.configValidator.validateWorkspaceConfiguration(workspacePath);

      if (!validationResult.isValid) {
        for (const issue of validationResult.issues) {
          if (issue.severity === 'error') {
            errors.push({
              component: issue.component,
              type: 'configuration',
              error: issue.message,
              severity: 'warning',
              suggestion: issue.suggestion
            });
          } else {
            warnings.push(`${issue.component}: ${issue.message}`);
          }
        }
      }

    } catch (error) {
      errors.push({
        component: 'workspace-validation',
        type: 'configuration',
        error: error instanceof Error ? error.message : 'Validation failed',
        severity: 'warning'
      });
    }

    return { warnings, errors };
  }

  /**
   * Generate next steps for the user
   */
  private generateNextSteps(
    request: WorkspaceInstallationRequest,
    result: WorkspaceInstallationResult
  ): string[] {
    const steps: string[] = [];

    if (result.success) {
      steps.push(`Open ${request.preferredIDE} and load the workspace from: ${request.workspacePath}`);
      
      if (result.installedComponents.some(c => c.type === 'extension')) {
        steps.push('Restart your IDE to ensure all extensions are properly loaded');
      }

      if (request.languages.length > 1) {
        steps.push('Consider creating separate workspaces for each language to avoid extension conflicts');
      }

      steps.push('Review and customize the generated configuration files as needed');
      steps.push('Install any additional project-specific dependencies');
    } else {
      steps.push('Review the installation errors and resolve any critical issues');
      steps.push('Try running the installation again after fixing the errors');
      steps.push('Consider installing missing components manually');
    }

    return steps;
  }

  /**
   * Update progress callback
   */
  private updateProgress(
    callback: ((progress: WorkspaceInstallationProgress) => void) | undefined,
    progress: WorkspaceInstallationProgress
  ): void {
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Get installation status for a workspace
   */
  async getWorkspaceStatus(workspacePath: string): Promise<{
    isValid: boolean;
    installedComponents: string[];
    missingComponents: string[];
    configurationIssues: string[];
  }> {
    try {
      const validationResult = await this.configValidator.validateWorkspaceConfiguration(workspacePath);
      
      return {
        isValid: validationResult.isValid,
        installedComponents: [], // TODO: Implement component detection
        missingComponents: [], // TODO: Implement missing component detection
        configurationIssues: validationResult.issues.map(issue => issue.message)
      };
    } catch (error) {
      return {
        isValid: false,
        installedComponents: [],
        missingComponents: [],
        configurationIssues: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Repair a workspace installation
   */
  async repairWorkspace(
    workspacePath: string,
    _options: {
      reinstallExtensions?: boolean;
      recreateConfigFiles?: boolean;
      updateToolchain?: boolean;
    } = {}
  ): Promise<WorkspaceInstallationResult> {
    // TODO: Implement workspace repair functionality
    throw new Error('Workspace repair functionality not yet implemented');
  }

  /**
   * Uninstall workspace components
   */
  async uninstallWorkspace(
    workspacePath: string,
    _options: {
      removeConfigFiles?: boolean;
      uninstallExtensions?: boolean;
      removeToolchain?: boolean;
    } = {}
  ): Promise<{ success: boolean; removedComponents: string[]; errors: string[] }> {
    // TODO: Implement workspace uninstallation
    throw new Error('Workspace uninstallation functionality not yet implemented');
  }
} 