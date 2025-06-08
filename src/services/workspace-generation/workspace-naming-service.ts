/**
 * Workspace Naming Service
 * Provides consistent naming conventions for language-isolated IDE workspaces
 */

import type { IDEType } from '../ide-configuration/types.js';
import type { TechnologyStack } from './workspace-requirements-service.js';
import type { TemplateType } from './workspace-template-manager.js';

/**
 * Workspace naming configuration
 */
export interface WorkspaceNamingConfig {
  projectName: string;
  stack: TechnologyStack;
  ideType: IDEType;
  templateType?: TemplateType;
  includeIdeInName?: boolean;
  includeTemplateType?: boolean;
  customSuffix?: string;
}

/**
 * Generated workspace names and paths
 */
export interface WorkspaceNames {
  workspaceName: string;
  directoryName: string;
  displayName: string;
  configFileName: string;
  fullPath: string;
}

/**
 * Workspace Naming Service
 * Generates consistent, descriptive names for language-isolated workspaces
 */
export class WorkspaceNamingService {
  private readonly stackDisplayNames: Record<TechnologyStack, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    rust: 'Rust',
    go: 'Go',
    csharp: 'C#',
    cpp: 'C++',
    php: 'PHP',
    ruby: 'Ruby',
  };

  private readonly ideDisplayNames: Record<IDEType, string> = {
    vscode: 'VSCode',
    cursor: 'Cursor',
    jetbrains: 'JetBrains',
    vim: 'Vim',
    neovim: 'Neovim',
  };

  /**
   * Generate workspace names and paths
   */
  generateWorkspaceNames(
    config: WorkspaceNamingConfig,
    baseDirectory: string = './workspaces'
  ): WorkspaceNames {
    const workspaceName = this.generateWorkspaceName(config);
    const directoryName = this.generateDirectoryName(config);
    const displayName = this.generateDisplayName(config);
    const configFileName = this.generateConfigFileName(config);
    const fullPath = `${baseDirectory}/${directoryName}`;

    return {
      workspaceName,
      directoryName,
      displayName,
      configFileName,
      fullPath,
    };
  }

  /**
   * Generate workspace name (used in IDE workspace files)
   */
  private generateWorkspaceName(config: WorkspaceNamingConfig): string {
    const parts: string[] = [config.projectName];
    
    // Add stack identifier
    parts.push(this.stackDisplayNames[config.stack] || config.stack);
    
    // Add template type if specified and not basic
    if (config.includeTemplateType && config.templateType && config.templateType !== 'basic') {
      parts.push(this.capitalizeFirst(config.templateType));
    }
    
    // Add IDE if specified
    if (config.includeIdeInName) {
      parts.push(this.ideDisplayNames[config.ideType] || config.ideType);
    }
    
    // Add custom suffix if provided
    if (config.customSuffix) {
      parts.push(config.customSuffix);
    }
    
    return parts.join(' ');
  }

  /**
   * Generate directory name (filesystem-safe)
   */
  private generateDirectoryName(config: WorkspaceNamingConfig): string {
    const parts: string[] = [];
    
    // Start with project name (sanitized)
    parts.push(this.sanitizeForFilesystem(config.projectName));
    
    // Add stack
    parts.push(config.stack);
    
    // Add template type if not basic
    if (config.templateType && config.templateType !== 'basic') {
      parts.push(config.templateType);
    }
    
    // Add IDE if specified
    if (config.includeIdeInName) {
      parts.push(config.ideType);
    }
    
    // Add custom suffix if provided
    if (config.customSuffix) {
      parts.push(this.sanitizeForFilesystem(config.customSuffix));
    }
    
    return parts.join('-');
  }

  /**
   * Generate display name (human-readable)
   */
  private generateDisplayName(config: WorkspaceNamingConfig): string {
    const stackName = this.stackDisplayNames[config.stack] || config.stack;
    const ideName = this.ideDisplayNames[config.ideType] || config.ideType;
    
    let displayName = `${config.projectName} (${stackName})`;
    
    if (config.templateType && config.templateType !== 'basic') {
      displayName += ` - ${this.capitalizeFirst(config.templateType)}`;
    }
    
    if (config.includeIdeInName) {
      displayName += ` [${ideName}]`;
    }
    
    return displayName;
  }

  /**
   * Generate IDE-specific configuration file name
   */
  private generateConfigFileName(config: WorkspaceNamingConfig): string {
    const baseName = this.sanitizeForFilesystem(config.projectName);
    const stack = config.stack;
    
    switch (config.ideType) {
      case 'vscode':
      case 'cursor':
        return `${baseName}-${stack}.code-workspace`;
      case 'jetbrains':
        return `${baseName}-${stack}.iws`;
      case 'vim':
      case 'neovim':
        return `${baseName}-${stack}.vim`;
      default:
        return `${baseName}-${stack}.workspace`;
    }
  }

  /**
   * Generate workspace identifier for internal use
   */
  generateWorkspaceId(config: WorkspaceNamingConfig): string {
    const parts = [
      this.sanitizeForFilesystem(config.projectName),
      config.stack,
      config.ideType,
    ];
    
    if (config.templateType && config.templateType !== 'basic') {
      parts.push(config.templateType);
    }
    
    return parts.join('_');
  }

  /**
   * Parse workspace directory name to extract configuration
   */
  parseWorkspaceDirectory(directoryName: string): Partial<WorkspaceNamingConfig> | null {
    const parts = directoryName.split('-');
    
    if (parts.length < 2) {
      return null;
    }
    
    const [projectName, stack, ...rest] = parts;
    
    // Validate stack
    if (!this.isValidStack(stack as TechnologyStack)) {
      return null;
    }
    
    const config: Partial<WorkspaceNamingConfig> = {
      projectName: projectName.replace(/_/g, ' '),
      stack: stack as TechnologyStack,
    };
    
    // Try to identify template type and IDE from remaining parts
    for (const part of rest) {
      if (this.isValidTemplateType(part)) {
        config.templateType = part as TemplateType;
      } else if (this.isValidIdeType(part)) {
        config.ideType = part as IDEType;
      } else {
        config.customSuffix = part;
      }
    }
    
    return config;
  }

  /**
   * Validate workspace name format
   */
  validateWorkspaceName(name: string): boolean {
    // Check for valid characters and reasonable length
    const validPattern = /^[a-zA-Z0-9\s\-_()[\]]+$/;
    return validPattern.test(name) && name.length >= 3 && name.length <= 100;
  }

  /**
   * Suggest alternative names if conflicts exist
   */
  suggestAlternativeNames(
    config: WorkspaceNamingConfig,
    existingNames: string[],
    baseDirectory: string = './workspaces'
  ): WorkspaceNames[] {
    const suggestions: WorkspaceNames[] = [];
    const baseNames = this.generateWorkspaceNames(config, baseDirectory);
    
    // If no conflict, return original
    if (!existingNames.includes(baseNames.directoryName)) {
      return [baseNames];
    }
    
    // Generate numbered alternatives
    for (let i = 2; i <= 10; i++) {
      const altConfig = {
        ...config,
        customSuffix: `v${i}`,
      };
      
      const altNames = this.generateWorkspaceNames(altConfig, baseDirectory);
      
      if (!existingNames.includes(altNames.directoryName)) {
        suggestions.push(altNames);
      }
      
      if (suggestions.length >= 5) break;
    }
    
    // Generate timestamp-based alternative if needed
    if (suggestions.length === 0) {
      const timestamp = new Date().toISOString().slice(0, 10);
      const timestampConfig = {
        ...config,
        customSuffix: timestamp,
      };
      
      suggestions.push(this.generateWorkspaceNames(timestampConfig, baseDirectory));
    }
    
    return suggestions;
  }

  /**
   * Get recommended workspace structure for a project
   */
  getRecommendedWorkspaceStructure(
    projectName: string,
    stacks: TechnologyStack[],
    ideType: IDEType,
    baseDirectory: string = './workspaces'
  ): WorkspaceNames[] {
    return stacks.map(stack => {
      const config: WorkspaceNamingConfig = {
        projectName,
        stack,
        ideType,
        templateType: 'basic',
        includeIdeInName: false,
        includeTemplateType: false,
      };
      
      return this.generateWorkspaceNames(config, baseDirectory);
    });
  }

  // Helper methods
  private sanitizeForFilesystem(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private isValidStack(stack: string): boolean {
    return Object.keys(this.stackDisplayNames).includes(stack);
  }

  private isValidTemplateType(type: string): boolean {
    const validTypes = [
      'basic', 'fullstack', 'library', 'microservice', 'desktop',
      'mobile', 'data-science', 'devops', 'testing', 'documentation'
    ];
    return validTypes.includes(type);
  }

  private isValidIdeType(type: string): boolean {
    return Object.keys(this.ideDisplayNames).includes(type);
  }
}

// Export singleton instance
export const workspaceNamingService = new WorkspaceNamingService(); 