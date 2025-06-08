/**
 * Workspace Manifest Loader
 * Loads and validates workspace manifests from YAML/JSON files
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { WorkspaceManifest } from './workspace-manifest';
import type { IDEWorkspaceTemplate } from '../../shared/manifest-types';

export class WorkspaceManifestLoader {
  private manifestCache: Map<string, WorkspaceManifest> = new Map();
  private manifestDirectory: string;

  constructor(manifestDirectory: string = path.join(process.cwd(), 'workspace-manifests')) {
    this.manifestDirectory = manifestDirectory;
  }

  /**
   * Load a single workspace manifest from file
   */
  async loadManifest(filePath: string): Promise<WorkspaceManifest> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const extension = path.extname(filePath).toLowerCase();
      
      let manifest: WorkspaceManifest;
      
      if (extension === '.yaml' || extension === '.yml') {
        manifest = yaml.load(content) as WorkspaceManifest;
      } else if (extension === '.json') {
        manifest = JSON.parse(content) as WorkspaceManifest;
      } else {
        throw new Error(`Unsupported file format: ${extension}`);
      }
      
      // Validate manifest
      this.validateManifest(manifest);
      
      // Cache the manifest
      this.manifestCache.set(manifest.id, manifest);
      
      return manifest;
    } catch (error) {
      throw new Error(`Failed to load manifest from ${filePath}: ${error}`);
    }
  }

  /**
   * Load all workspace manifests from a directory
   */
  async loadAllManifests(): Promise<WorkspaceManifest[]> {
    try {
      const files = await fs.readdir(this.manifestDirectory);
      const manifestFiles = files.filter(f => 
        f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json')
      );
      
      const manifests = await Promise.all(
        manifestFiles.map(file => 
          this.loadManifest(path.join(this.manifestDirectory, file))
        )
      );
      
      return manifests;
    } catch (error) {
      console.warn(`Failed to load manifests from directory: ${error}`);
      return [];
    }
  }

  /**
   * Get manifest by ID
   */
  getManifest(id: string): WorkspaceManifest | undefined {
    return this.manifestCache.get(id);
  }

  /**
   * Get manifests for a specific tool
   */
  getManifestsForTool(toolId: string): WorkspaceManifest[] {
    return Array.from(this.manifestCache.values()).filter(
      manifest => manifest.toolId === toolId
    );
  }

  /**
   * Get manifests for a specific job role
   */
  getManifestsForRole(roleId: string): WorkspaceManifest[] {
    return Array.from(this.manifestCache.values()).filter(
      manifest => manifest.targetJobRoles?.includes(roleId as any)
    );
  }

  /**
   * Validate a workspace manifest
   */
  private validateManifest(manifest: WorkspaceManifest): void {
    const errors: string[] = [];

    // Required fields
    if (!manifest.id) errors.push('Manifest ID is required');
    if (!manifest.name) errors.push('Manifest name is required');
    if (!manifest.toolId) errors.push('Tool ID is required');
    if (!manifest.stack) errors.push('Stack is required');
    if (!manifest.templateType) errors.push('Template type is required');
    if (!manifest.version) errors.push('Version is required');

    // At least one IDE workspace should be defined
    if (!manifest.ideWorkspaces || Object.keys(manifest.ideWorkspaces).length === 0) {
      errors.push('At least one IDE workspace configuration is required');
    }

    // Validate IDE workspace configurations
    if (manifest.ideWorkspaces) {
      Object.entries(manifest.ideWorkspaces).forEach(([ide, config]) => {
        this.validateIDEWorkspaceTemplate(config, ide, errors);
      });
    }

    if (errors.length > 0) {
      throw new Error(`Manifest validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Validate IDE workspace template configuration
   */
  private validateIDEWorkspaceTemplate(
    template: IDEWorkspaceTemplate | undefined,
    ide: string,
    errors: string[]
  ): void {
    if (!template) return;

    // Validate extensions are strings
    if (template.workspaceExtensions) {
      template.workspaceExtensions.forEach((ext, index) => {
        if (typeof ext !== 'string') {
          errors.push(`${ide} extension at index ${index} must be a string`);
        }
      });
    }

    // Validate linters
    if (template.linters) {
      template.linters.forEach((linter, index) => {
        if (!linter.name) {
          errors.push(`${ide} linter at index ${index} must have a name`);
        }
      });
    }

    // Validate formatters
    if (template.formatters) {
      template.formatters.forEach((formatter, index) => {
        if (!formatter.name) {
          errors.push(`${ide} formatter at index ${index} must have a name`);
        }
      });
    }

    // Validate debug configs
    if (template.debugConfigs) {
      template.debugConfigs.forEach((config, index) => {
        if (!config.type || !config.request || !config.name) {
          errors.push(`${ide} debug config at index ${index} must have type, request, and name`);
        }
      });
    }

    // Validate tasks
    if (template.tasks) {
      template.tasks.forEach((task, index) => {
        if (!task.type || !task.label || !task.command) {
          errors.push(`${ide} task at index ${index} must have type, label, and command`);
        }
      });
    }
  }

  /**
   * Merge workspace manifest with tool manifest IDE integration
   */
  mergeWithToolManifest(
    workspaceManifest: WorkspaceManifest,
    toolIDEIntegration?: any
  ): WorkspaceManifest {
    if (!toolIDEIntegration) return workspaceManifest;

    const merged = { ...workspaceManifest };

    // Merge IDE configurations
    Object.entries(toolIDEIntegration).forEach(([ide, toolConfig]) => {
      if (toolConfig && typeof toolConfig === 'object') {
        const ideKey = ide as keyof typeof merged.ideWorkspaces;
        if (!merged.ideWorkspaces[ideKey]) {
          merged.ideWorkspaces[ideKey] = {} as IDEWorkspaceTemplate;
        }

        // Merge workspace template from tool manifest
        if (toolConfig.workspaceTemplate) {
          const workspaceTemplate = merged.ideWorkspaces[ideKey]!;
          
          // Merge extensions (avoid duplicates)
          if (toolConfig.workspaceTemplate.workspaceExtensions) {
            workspaceTemplate.workspaceExtensions = [
              ...new Set([
                ...(workspaceTemplate.workspaceExtensions || []),
                ...toolConfig.workspaceTemplate.workspaceExtensions
              ])
            ];
          }

          // Merge settings
          if (toolConfig.workspaceTemplate.workspaceSettings) {
            workspaceTemplate.workspaceSettings = {
              ...toolConfig.workspaceTemplate.workspaceSettings,
              ...workspaceTemplate.workspaceSettings
            };
          }

          // Merge other arrays (linters, formatters, etc.)
          ['linters', 'formatters', 'debugConfigs', 'tasks'].forEach(key => {
            if (toolConfig.workspaceTemplate[key]) {
              workspaceTemplate[key] = [
                ...(workspaceTemplate[key] || []),
                ...toolConfig.workspaceTemplate[key]
              ];
            }
          });
        }
      }
    });

    return merged;
  }
}