/**
 * Workspace Generation Service
 * Main service that orchestrates IDE workspace generation based on user selections
 */

import type { ToolSelection } from '../../types/ui-types';
import type { JobRole } from '../../types/job-role-types';
import type { IDEType } from '../ide-configuration/types';
import type { 
  WorkspaceGenerationRequirements, 
  TechnologyStack
} from './workspace-requirements-service';
import { WorkspaceRequirementsService } from './workspace-requirements-service';
import { WorkspaceManifestLoader } from './workspace-manifest-loader';
import { WorkspaceManifestValidator } from './workspace-manifest-validator';
import { WorkspaceTemplateManager } from './workspace-template-manager';
import { IDEConfigurationGenerator } from './ide-configuration-generator-simple';
import { WorkspaceNamingService } from './workspace-naming-service';
import type { WorkspaceManifest } from './workspace-manifest';
import { SystemDetectionService } from '../system-detection-service';
import { JobRoleConfigService } from '../job-role-config-service';

export interface WorkspaceGenerationOptions {
  selectedTools: ToolSelection;
  selectedIDE: IDEType;
  selectedJobRole?: JobRole;
  baseDirectory: string;
  workspaceName?: string;
  includeManifests?: boolean;
}

export interface GeneratedWorkspace {
  id: string;
  name: string;
  path: string;
  ide: IDEType;
  stack: TechnologyStack[];
  configuration: {
    extensions: string[];
    settings: Record<string, unknown>;
    linters: Array<{ name: string; config?: unknown }>;
    formatters: Array<{ name: string; config?: unknown }>;
    debugConfigs?: unknown[];
    tasks?: unknown[];
  };
  files: Array<{
    path: string;
    content: string;
  }>;
  commands: Array<{
    description: string;
    command: string;
  }>;
}

export class WorkspaceGenerationService {
  private requirementsService: WorkspaceRequirementsService;
  private manifestLoader: WorkspaceManifestLoader;
  private manifestValidator: WorkspaceManifestValidator;
  private templateManager: WorkspaceTemplateManager;
  private configGenerator: IDEConfigurationGenerator;
  private namingService: WorkspaceNamingService;
  private systemDetection: SystemDetectionService;
  private jobRoleConfig: JobRoleConfigService;

  constructor() {
    this.requirementsService = new WorkspaceRequirementsService();
    this.manifestLoader = new WorkspaceManifestLoader();
    this.manifestValidator = new WorkspaceManifestValidator();
    this.templateManager = new WorkspaceTemplateManager();
    this.configGenerator = new IDEConfigurationGenerator();
    this.namingService = new WorkspaceNamingService();
    this.systemDetection = new SystemDetectionService();
    this.jobRoleConfig = new JobRoleConfigService();
  }

  /**
   * Generate a workspace based on user selections
   */
  async generateWorkspace(options: WorkspaceGenerationOptions): Promise<GeneratedWorkspace> {
    console.log('🚀 WorkspaceGenerationService: Starting workspace generation', options);

    // Step 1: Determine technology stacks from selected tools
    const stacks = await this.determineTechnologyStacks(options.selectedTools);
    console.log('📊 Detected technology stacks:', stacks);

    // Step 2: Gather requirements
    const requirements = await this.requirementsService.gatherRequirements(
      stacks,
      options.selectedIDE,
      options.baseDirectory
    );
    console.log('📋 Gathered requirements:', requirements);

    // Step 3: Load relevant workspace manifests if enabled
    let manifests: WorkspaceManifest[] = [];
    if (options.includeManifests) {
      manifests = await this.loadRelevantManifests(
        stacks, 
        options.selectedJobRole,
        Array.from(options.selectedTools.selectedTools)
      );
      console.log('📄 Loaded manifests:', manifests.length);
    }

    // Step 4: Generate workspace name
    const workspaceName = options.workspaceName || 
      this.namingService.generateWorkspaceName(stacks, options.selectedIDE);

    // Step 5: Merge requirements with manifests
    const mergedConfiguration = await this.mergeConfigurations(
      requirements,
      manifests,
      options.selectedIDE
    );

    // Step 6: Generate IDE-specific configuration files
    const configFiles = await this.configGenerator.generateConfiguration(
      options.selectedIDE,
      mergedConfiguration,
      workspaceName
    );

    // Step 7: Create workspace structure
    const workspace: GeneratedWorkspace = {
      id: `${workspaceName}-${Date.now()}`,
      name: workspaceName,
      path: `${options.baseDirectory}/${workspaceName}`,
      ide: options.selectedIDE,
      stack: stacks,
      configuration: mergedConfiguration,
      files: configFiles,
      commands: this.generateSetupCommands(requirements, options.selectedIDE)
    };

    console.log('✅ WorkspaceGenerationService: Workspace generated successfully', workspace);
    return workspace;
  }

  /**
   * Determine technology stacks from selected tools
   */
  private async determineTechnologyStacks(selection: ToolSelection): Promise<TechnologyStack[]> {
    const report = await this.systemDetection.getSystemDetectionReport();
    const stacks = new Set<TechnologyStack>();

    // Get all selected tools details
    const selectedToolIds = Array.from(selection.selectedTools);
    
    for (const category of report.categories) {
      for (const tool of category.tools) {
        if (selectedToolIds.includes(tool.id || tool.name)) {
          // Map tool to technology stack
          const stack = this.mapToolToStack(tool.name);
          if (stack) {
            stacks.add(stack);
          }
        }
      }
    }

    return Array.from(stacks);
  }

  /**
   * Map tool name to technology stack
   */
  private mapToolToStack(toolName: string): TechnologyStack | null {
    const name = toolName.toLowerCase();
    
    if (name.includes('node') || name.includes('npm') || name.includes('react')) {
      return 'javascript';
    }
    if (name.includes('typescript') || name.includes('angular')) {
      return 'typescript';
    }
    if (name.includes('python') || name.includes('pip') || name.includes('django')) {
      return 'python';
    }
    if (name.includes('java') || name.includes('maven') || name.includes('gradle')) {
      return 'java';
    }
    if (name.includes('rust') || name.includes('cargo')) {
      return 'rust';
    }
    if (name.includes('go') || name.includes('golang')) {
      return 'go';
    }
    if (name.includes('csharp') || name.includes('dotnet') || name.includes('.net')) {
      return 'csharp';
    }
    if (name.includes('cpp') || name.includes('c++') || name.includes('cmake')) {
      return 'cpp';
    }
    if (name.includes('php') || name.includes('composer') || name.includes('laravel')) {
      return 'php';
    }
    if (name.includes('ruby') || name.includes('rails') || name.includes('gem')) {
      return 'ruby';
    }
    
    return null;
  }

  /**
   * Load relevant workspace manifests
   */
  private async loadRelevantManifests(
    stacks: TechnologyStack[],
    jobRole?: JobRole,
    selectedTools?: string[]
  ): Promise<WorkspaceManifest[]> {
    const allManifests = await this.manifestLoader.loadAllManifests();
    
    // Filter manifests based on relevance
    return allManifests.filter(manifest => {
      // Check if manifest matches any of the stacks
      const stackMatch = stacks.some(stack => manifest.stack === stack);
      
      // Check if manifest targets the job role
      const roleMatch = !jobRole || 
        manifest.targetJobRoles?.includes(jobRole);
      
      // Check if manifest is for any selected tools
      const toolMatch = !selectedTools || 
        selectedTools.some(toolId => 
          manifest.toolId === toolId || 
          manifest.relatedTools?.includes(toolId)
        );
      
      return stackMatch || roleMatch || toolMatch;
    });
  }

  /**
   * Merge requirements with manifest configurations
   */
  private async mergeConfigurations(
    requirements: WorkspaceGenerationRequirements,
    manifests: WorkspaceManifest[],
    ide: IDEType
  ): Promise<GeneratedWorkspace['configuration']> {
    const extensions = new Set<string>();
    const settings: Record<string, unknown> = {};
    const linters: Array<{ name: string; config?: unknown }> = [];
    const formatters: Array<{ name: string; config?: unknown }> = [];
    const debugConfigs: unknown[] = [];
    const tasks: unknown[] = [];

    // Add extensions from requirements
    requirements.workspaceRequirements.forEach(req => {
      req.extensions.forEach(ext => extensions.add(ext));
      Object.assign(settings, req.settings);
      req.linters.forEach(linter => linters.push({ name: linter }));
      req.formatters.forEach(formatter => formatters.push({ name: formatter }));
    });

    // Merge manifest configurations
    manifests.forEach(manifest => {
      const ideConfig = manifest.ideWorkspaces[ide];
      if (ideConfig) {
        // Add extensions
        ideConfig.workspaceExtensions?.forEach(ext => extensions.add(ext));
        
        // Merge settings
        if (ideConfig.workspaceSettings) {
          Object.assign(settings, ideConfig.workspaceSettings);
        }
        
        // Add linters with configs
        ideConfig.linters?.forEach(linter => {
          const existing = linters.find(l => l.name === linter.name);
          if (!existing) {
            linters.push({
              name: linter.name,
              config: linter.settings
            });
          }
        });
        
        // Add formatters with configs
        ideConfig.formatters?.forEach(formatter => {
          const existing = formatters.find(f => f.name === formatter.name);
          if (!existing) {
            formatters.push({
              name: formatter.name,
              config: formatter.settings
            });
          }
        });
        
        // Add debug configurations
        ideConfig.debugConfigs?.forEach(config => debugConfigs.push(config));
        
        // Add tasks
        ideConfig.tasks?.forEach(task => tasks.push(task));
      }
    });

    return {
      extensions: Array.from(extensions),
      settings,
      linters,
      formatters,
      debugConfigs: debugConfigs.length > 0 ? debugConfigs : undefined,
      tasks: tasks.length > 0 ? tasks : undefined
    };
  }

  /**
   * Generate setup commands for the workspace
   */
  private generateSetupCommands(
    requirements: WorkspaceGenerationRequirements,
    ide: IDEType
  ): Array<{ description: string; command: string }> {
    const commands: Array<{ description: string; command: string }> = [];

    // IDE-specific workspace opening command
    switch (ide) {
      case 'vscode':
        commands.push({
          description: 'Open workspace in VSCode',
          command: 'code .'
        });
        break;
      case 'cursor':
        commands.push({
          description: 'Open workspace in Cursor',
          command: 'cursor .'
        });
        break;
      case 'jetbrains':
        commands.push({
          description: 'Open workspace in JetBrains IDE',
          command: 'idea .'
        });
        break;
    }

    // Add package manager setup commands
    requirements.workspaceRequirements.forEach(req => {
      req.packageManagers.forEach(pm => {
        switch (pm) {
          case 'npm':
            commands.push({
              description: 'Initialize npm project',
              command: 'npm init -y'
            });
            break;
          case 'pip':
            commands.push({
              description: 'Create Python virtual environment',
              command: 'python -m venv venv'
            });
            break;
          case 'cargo':
            commands.push({
              description: 'Initialize Rust project',
              command: 'cargo init'
            });
            break;
        }
      });
    });

    return commands;
  }

  /**
   * Validate a generated workspace
   */
  async validateWorkspace(workspace: GeneratedWorkspace): Promise<boolean> {
    try {
      // Validate configuration
      if (!workspace.configuration.extensions.length) {
        console.warn('⚠️ No extensions configured for workspace');
      }

      // Validate files
      if (!workspace.files.length) {
        console.error('❌ No configuration files generated');
        return false;
      }

      // Validate IDE support
      const supportedIDEs: IDEType[] = ['vscode', 'cursor', 'jetbrains'];
      if (!supportedIDEs.includes(workspace.ide)) {
        console.error('❌ Unsupported IDE:', workspace.ide);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Workspace validation failed:', error);
      return false;
    }
  }

  /**
   * Preview workspace configuration without generating files
   */
  async previewWorkspace(options: WorkspaceGenerationOptions): Promise<Partial<GeneratedWorkspace>> {
    const stacks = await this.determineTechnologyStacks(options.selectedTools);
    const requirements = await this.requirementsService.gatherRequirements(
      stacks,
      options.selectedIDE,
      options.baseDirectory
    );

    const workspaceName = options.workspaceName || 
      this.namingService.generateWorkspaceName(stacks, options.selectedIDE);

    return {
      name: workspaceName,
      ide: options.selectedIDE,
      stack: stacks,
      configuration: {
        extensions: requirements.workspaceRequirements.flatMap(r => r.extensions),
        settings: Object.assign({}, ...requirements.workspaceRequirements.map(r => r.settings)),
        linters: requirements.workspaceRequirements.flatMap(r => 
          r.linters.map(l => ({ name: l }))
        ),
        formatters: requirements.workspaceRequirements.flatMap(r => 
          r.formatters.map(f => ({ name: f }))
        )
      }
    };
  }
}