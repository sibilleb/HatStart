/**
 * Workspace Manifest Validator
 * Provides comprehensive validation for workspace manifests
 */

import type { WorkspaceManifest } from './workspace-manifest';
import type { JobRole } from '../../types/job-role-types';
import type { ToolCategory } from '../../shared/manifest-types';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

export interface ValidationSuggestion {
  field: string;
  message: string;
  severity: 'info';
}

export class WorkspaceManifestValidator {
  private knownToolIds: Set<string>;
  private knownJobRoles: Set<JobRole>;
  private knownCategories: Set<ToolCategory>;

  constructor(
    knownToolIds: string[] = [],
    knownJobRoles: JobRole[] = [],
    knownCategories: ToolCategory[] = []
  ) {
    this.knownToolIds = new Set(knownToolIds);
    this.knownJobRoles = new Set(knownJobRoles);
    this.knownCategories = new Set(knownCategories);
  }

  /**
   * Validate a workspace manifest
   */
  validate(manifest: WorkspaceManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Validate required fields
    this.validateRequiredFields(manifest, errors);

    // Validate field formats
    this.validateFieldFormats(manifest, errors, warnings);

    // Validate references
    this.validateReferences(manifest, warnings);

    // Validate IDE configurations
    this.validateIDEConfigurations(manifest, errors, warnings);

    // Check for best practices
    this.checkBestPractices(manifest, suggestions);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private validateRequiredFields(manifest: WorkspaceManifest, errors: ValidationError[]): void {
    const requiredFields: (keyof WorkspaceManifest)[] = [
      'id', 'name', 'description', 'toolId', 'stack', 'templateType', 'version'
    ];

    requiredFields.forEach(field => {
      if (!manifest[field]) {
        errors.push({
          field,
          message: `${field} is required`,
          severity: 'error'
        });
      }
    });

    if (!manifest.ideWorkspaces || Object.keys(manifest.ideWorkspaces).length === 0) {
      errors.push({
        field: 'ideWorkspaces',
        message: 'At least one IDE workspace configuration is required',
        severity: 'error'
      });
    }
  }

  private validateFieldFormats(
    manifest: WorkspaceManifest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate ID format (lowercase, hyphenated)
    if (manifest.id && !/^[a-z0-9-]+$/.test(manifest.id)) {
      errors.push({
        field: 'id',
        message: 'ID must contain only lowercase letters, numbers, and hyphens',
        severity: 'error'
      });
    }

    // Validate version format
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      warnings.push({
        field: 'version',
        message: 'Version should follow semantic versioning (e.g., 1.0.0)',
        severity: 'warning'
      });
    }

    // Validate template type
    const validTemplateTypes = [
      'basic', 'fullstack', 'library', 'microservice', 'desktop',
      'mobile', 'data-science', 'devops', 'testing', 'documentation'
    ];
    if (manifest.templateType && !validTemplateTypes.includes(manifest.templateType)) {
      errors.push({
        field: 'templateType',
        message: `Template type must be one of: ${validTemplateTypes.join(', ')}`,
        severity: 'error'
      });
    }
  }

  private validateReferences(manifest: WorkspaceManifest, warnings: ValidationWarning[]): void {
    // Validate tool ID reference
    if (manifest.toolId && this.knownToolIds.size > 0 && !this.knownToolIds.has(manifest.toolId)) {
      warnings.push({
        field: 'toolId',
        message: `Tool ID '${manifest.toolId}' is not recognized`,
        severity: 'warning'
      });
    }

    // Validate related tools
    if (manifest.relatedTools) {
      manifest.relatedTools.forEach((toolId, index) => {
        if (this.knownToolIds.size > 0 && !this.knownToolIds.has(toolId)) {
          warnings.push({
            field: `relatedTools[${index}]`,
            message: `Related tool ID '${toolId}' is not recognized`,
            severity: 'warning'
          });
        }
      });
    }

    // Validate job roles
    if (manifest.targetJobRoles) {
      manifest.targetJobRoles.forEach((role, index) => {
        if (this.knownJobRoles.size > 0 && !this.knownJobRoles.has(role)) {
          warnings.push({
            field: `targetJobRoles[${index}]`,
            message: `Job role '${role}' is not recognized`,
            severity: 'warning'
          });
        }
      });
    }
  }

  private validateIDEConfigurations(
    manifest: WorkspaceManifest,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    if (!manifest.ideWorkspaces) return;

    Object.entries(manifest.ideWorkspaces).forEach(([ide, config]) => {
      if (!config) return;

      // Validate extensions
      if (config.workspaceExtensions) {
        config.workspaceExtensions.forEach((ext, index) => {
          if (typeof ext !== 'string' || ext.trim() === '') {
            errors.push({
              field: `ideWorkspaces.${ide}.workspaceExtensions[${index}]`,
              message: 'Extension ID must be a non-empty string',
              severity: 'error'
            });
          }
        });
      }

      // Validate linters
      if (config.linters) {
        config.linters.forEach((linter, index) => {
          if (!linter.name) {
            errors.push({
              field: `ideWorkspaces.${ide}.linters[${index}].name`,
              message: 'Linter name is required',
              severity: 'error'
            });
          }
        });
      }

      // Validate formatters
      if (config.formatters) {
        config.formatters.forEach((formatter, index) => {
          if (!formatter.name) {
            errors.push({
              field: `ideWorkspaces.${ide}.formatters[${index}].name`,
              message: 'Formatter name is required',
              severity: 'error'
            });
          }
        });
      }

      // Validate debug configs
      if (config.debugConfigs) {
        config.debugConfigs.forEach((debug, index) => {
          if (!debug.type || !debug.request || !debug.name) {
            errors.push({
              field: `ideWorkspaces.${ide}.debugConfigs[${index}]`,
              message: 'Debug configuration must have type, request, and name',
              severity: 'error'
            });
          }
        });
      }

      // Validate tasks
      if (config.tasks) {
        config.tasks.forEach((task, index) => {
          if (!task.type || !task.label || !task.command) {
            errors.push({
              field: `ideWorkspaces.${ide}.tasks[${index}]`,
              message: 'Task must have type, label, and command',
              severity: 'error'
            });
          }
        });
      }
    });
  }

  private checkBestPractices(manifest: WorkspaceManifest, suggestions: ValidationSuggestion[]): void {
    // Check for author information
    if (!manifest.author) {
      suggestions.push({
        field: 'author',
        message: 'Consider adding author information for attribution',
        severity: 'info'
      });
    }

    // Check for tags
    if (!manifest.tags || manifest.tags.length === 0) {
      suggestions.push({
        field: 'tags',
        message: 'Consider adding tags for better discoverability',
        severity: 'info'
      });
    }

    // Check for comprehensive IDE support
    const supportedIDEs = Object.keys(manifest.ideWorkspaces || {});
    if (supportedIDEs.length < 2) {
      suggestions.push({
        field: 'ideWorkspaces',
        message: 'Consider adding support for more IDEs (VSCode, Cursor, JetBrains)',
        severity: 'info'
      });
    }

    // Check for environment variables in sensitive data
    Object.entries(manifest.ideWorkspaces || {}).forEach(([ide, config]) => {
      if (config?.environmentVariables) {
        Object.entries(config.environmentVariables).forEach(([key, value]) => {
          if (value && (value.includes('password') || value.includes('secret') || value.includes('key'))) {
            suggestions.push({
              field: `ideWorkspaces.${ide}.environmentVariables.${key}`,
              message: 'Avoid hardcoding sensitive values. Use placeholders instead',
              severity: 'info'
            });
          }
        });
      }
    });
  }

  /**
   * Update known references for validation
   */
  updateKnownReferences(
    toolIds?: string[],
    jobRoles?: JobRole[],
    categories?: ToolCategory[]
  ): void {
    if (toolIds) this.knownToolIds = new Set(toolIds);
    if (jobRoles) this.knownJobRoles = new Set(jobRoles);
    if (categories) this.knownCategories = new Set(categories);
  }
}