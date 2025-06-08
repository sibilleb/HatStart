/**
 * Configuration Validation System
 * Comprehensive validation tools for IDE configurations
 */

import { readFile } from 'fs/promises';
import type {
  IDEConfigurationProfile,
  IDEExtension,
  IDEType,
  IDEWorkspaceSettings
} from './types.js';

/**
 * Validation severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Validation issue interface
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  path?: string;
  line?: number;
  column?: number;
  suggestion?: string;
  documentation?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Configuration schema interface
 */
export interface ConfigurationSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, ConfigurationSchema>;
  items?: ConfigurationSchema;
  required?: string[];
  enum?: unknown[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  description?: string;
  deprecated?: boolean;
  deprecationMessage?: string;
}

/**
 * IDE-specific validation rules
 */
export interface IDEValidationRules {
  extensions: {
    allowedMarketplaces: string[];
    requiredFields: string[];
    deprecatedExtensions: Record<string, string>;
  };
  settings: {
    schema: ConfigurationSchema;
    conflictingSettings: Record<string, string[]>;
    deprecatedSettings: Record<string, string>;
  };
  workspace: {
    requiredFiles: string[];
    recommendedStructure: string[];
  };
}

/**
 * Configuration Validator implementation
 */
export class ConfigurationValidator {
  private validationRules: Map<IDEType, IDEValidationRules>;
  private schemaCache: Map<string, ConfigurationSchema>;

  constructor() {
    this.validationRules = new Map();
    this.schemaCache = new Map();
    this.initializeValidationRules();
  }

  /**
   * Validate IDE configuration profile
   */
  async validateConfiguration(
    profile: IDEConfigurationProfile
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // Validate extensions
    if (profile.extensions) {
      const extensionIssues = await this.validateExtensions(profile.ideType, profile.extensions);
      issues.push(...extensionIssues);
    }

    // Validate workspace settings
    if (profile.workspaceSettings) {
      const settingsIssues = await this.validateSettings(profile.ideType, profile.workspaceSettings);
      issues.push(...settingsIssues);
    }

    // Validate user settings
    if (profile.userSettings) {
      const userSettingsIssues = await this.validateSettings(profile.ideType, profile.userSettings);
      issues.push(...userSettingsIssues);
    }

    // Perform semantic validation
    const semanticIssues = await this.performSemanticValidation(profile);
    issues.push(...semanticIssues);

    return this.createValidationResult(issues);
  }

  /**
   * Validate configuration file syntax
   */
  async validateConfigurationFile(
    filePath: string,
    ideType: IDEType
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    try {
      const content = await readFile(filePath, 'utf-8');
      
      // Parse JSON configuration
      let parsedConfig: unknown;
      try {
        parsedConfig = JSON.parse(content);
      } catch (parseError) {
        issues.push({
          severity: 'error',
          code: 'SYNTAX_ERROR',
          message: `Invalid JSON syntax: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          path: filePath,
          suggestion: 'Check for missing commas, brackets, or quotes'
        });
        return this.createValidationResult(issues);
      }

      // Validate against schema
      const schemaIssues = await this.validateAgainstSchema(parsedConfig, ideType, filePath);
      issues.push(...schemaIssues);

    } catch (error) {
      issues.push({
        severity: 'error',
        code: 'FILE_READ_ERROR',
        message: `Cannot read configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: filePath
      });
    }

    return this.createValidationResult(issues);
  }

  /**
   * Validate extensions
   */
  private async validateExtensions(
    ideType: IDEType,
    extensions: IDEExtension[]
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const rules = this.validationRules.get(ideType);

    if (!rules) {
      return issues;
    }

    for (const extension of extensions) {
      // Check required fields
      for (const field of rules.extensions.requiredFields) {
        if (!(field in extension)) {
          issues.push({
            severity: 'error',
            code: 'MISSING_REQUIRED_FIELD',
            message: `Extension missing required field: ${field}`,
            path: `extensions.${extension.id}`,
            suggestion: `Add the ${field} field to the extension configuration`
          });
        }
      }

      // Check for deprecated extensions
      if (extension.id in rules.extensions.deprecatedExtensions) {
        issues.push({
          severity: 'warning',
          code: 'DEPRECATED_EXTENSION',
          message: `Extension ${extension.id} is deprecated: ${rules.extensions.deprecatedExtensions[extension.id]}`,
          path: `extensions.${extension.id}`,
          suggestion: 'Consider using the recommended alternative'
        });
      }

      // Validate version format
      if (extension.version && !this.isValidVersionFormat(extension.version)) {
        issues.push({
          severity: 'error',
          code: 'INVALID_VERSION_FORMAT',
          message: `Invalid version format: ${extension.version}`,
          path: `extensions.${extension.id}.version`,
          suggestion: 'Use semantic versioning format (e.g., "1.0.0" or "^1.0.0")'
        });
      }

      // Check extension ID format
      if (!extension.id.includes('.')) {
        issues.push({
          severity: 'warning',
          code: 'INVALID_EXTENSION_ID',
          message: `Extension ID should include publisher: ${extension.id}`,
          path: `extensions.${extension.id}`,
          suggestion: 'Use format "publisher.extension-name"'
        });
      }
    }

    return issues;
  }

  /**
   * Validate settings
   */
  private async validateSettings(
    ideType: IDEType,
    settings: IDEWorkspaceSettings
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const rules = this.validationRules.get(ideType);

    if (!rules) {
      return issues;
    }

    // Check for deprecated settings
    const allSettings = {
      ...settings.editor,
      ...settings.extensions,
      ...settings.debug,
      ...settings.terminal,
      ...settings.custom
    };

    for (const setting of Object.keys(allSettings)) {
      if (setting in rules.settings.deprecatedSettings) {
        issues.push({
          severity: 'warning',
          code: 'DEPRECATED_SETTING',
          message: `Setting ${setting} is deprecated. Use ${rules.settings.deprecatedSettings[setting]} instead`,
          path: `settings.${setting}`,
          suggestion: `Replace with ${rules.settings.deprecatedSettings[setting]}`
        });
      }
    }

    // Check for conflicting settings
    for (const [setting, conflicts] of Object.entries(rules.settings.conflictingSettings)) {
      if (setting in allSettings) {
        for (const conflict of conflicts) {
          if (conflict in allSettings) {
            issues.push({
              severity: 'warning',
              code: 'CONFLICTING_SETTINGS',
              message: `Settings ${setting} and ${conflict} may conflict`,
              path: `settings.${setting}`,
              suggestion: 'Review these settings to ensure they work together'
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Validate workspace structure
   */
  private async validateWorkspaceStructure(
    ideType: IDEType,
    workspaceFiles: Record<string, string>
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const rules = this.validationRules.get(ideType);

    if (!rules) {
      return issues;
    }

    // Check for required files
    for (const requiredFile of rules.workspace.requiredFiles) {
      if (!(requiredFile in workspaceFiles)) {
        issues.push({
          severity: 'error',
          code: 'MISSING_REQUIRED_FILE',
          message: `Required workspace file missing: ${requiredFile}`,
          path: `workspace.${requiredFile}`,
          suggestion: `Create the ${requiredFile} file`
        });
      }
    }

    // Check for recommended structure
    for (const recommendedFile of rules.workspace.recommendedStructure) {
      if (!(recommendedFile in workspaceFiles)) {
        issues.push({
          severity: 'info',
          code: 'MISSING_RECOMMENDED_FILE',
          message: `Recommended workspace file missing: ${recommendedFile}`,
          path: `workspace.${recommendedFile}`,
          suggestion: `Consider creating ${recommendedFile} for better IDE integration`
        });
      }
    }

    return issues;
  }

  /**
   * Perform semantic validation
   */
  private async performSemanticValidation(
    profile: IDEConfigurationProfile
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Check extension compatibility
    if (profile.extensions) {
      const compatibilityIssues = await this.checkExtensionCompatibility(profile.extensions);
      issues.push(...compatibilityIssues);
    }

    // Validate setting values
    if (profile.workspaceSettings) {
      const settingValueIssues = await this.validateSettingValues(profile.ideType, profile.workspaceSettings);
      issues.push(...settingValueIssues);
    }

    // Check performance implications
    const performanceIssues = await this.checkPerformanceImplications(profile);
    issues.push(...performanceIssues);

    return issues;
  }

  /**
   * Validate against schema
   */
  private async validateAgainstSchema(
    config: unknown,
    ideType: IDEType,
    filePath: string
  ): Promise<ValidationIssue[]> {
    const schema = await this.getSchemaForIDE(ideType);
    return this.validateObjectAgainstSchema(config, schema, filePath);
  }

  /**
   * Validate object against schema
   */
  private async validateObjectAgainstSchema(
    obj: unknown,
    schema: ConfigurationSchema,
    path: string
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    if (obj === null || obj === undefined) {
      if (schema.required && schema.required.length > 0) {
        issues.push({
          severity: 'error',
          code: 'REQUIRED_PROPERTY_MISSING',
          message: 'Required property is missing',
          path
        });
      }
      return issues;
    }

    // Type validation
    const actualType = Array.isArray(obj) ? 'array' : typeof obj;
    if (actualType !== schema.type) {
      issues.push({
        severity: 'error',
        code: 'TYPE_MISMATCH',
        message: `Expected ${schema.type}, got ${actualType}`,
        path
      });
      return issues;
    }

    // Object property validation
    if (schema.type === 'object' && typeof obj === 'object' && obj !== null) {
      const objRecord = obj as Record<string, unknown>;

      // Check required properties
      if (schema.required) {
        for (const requiredProp of schema.required) {
          if (!(requiredProp in objRecord)) {
            issues.push({
              severity: 'error',
              code: 'REQUIRED_PROPERTY_MISSING',
              message: `Required property '${requiredProp}' is missing`,
              path: `${path}.${requiredProp}`
            });
          }
        }
      }

      // Validate properties
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in objRecord) {
            const propIssues = await this.validateObjectAgainstSchema(
              objRecord[propName],
              propSchema,
              `${path}.${propName}`
            );
            issues.push(...propIssues);
          }
        }
      }
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(obj)) {
      if (schema.items) {
        for (let i = 0; i < obj.length; i++) {
          const itemIssues = await this.validateObjectAgainstSchema(
            obj[i],
            schema.items,
            `${path}[${i}]`
          );
          issues.push(...itemIssues);
        }
      }
    }

    // String validation
    if (schema.type === 'string' && typeof obj === 'string') {
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(obj)) {
          issues.push({
            severity: 'error',
            code: 'PATTERN_MISMATCH',
            message: `String does not match required pattern: ${schema.pattern}`,
            path
          });
        }
      }

      if (schema.enum && !schema.enum.includes(obj)) {
        issues.push({
          severity: 'error',
          code: 'ENUM_MISMATCH',
          message: `Value must be one of: ${schema.enum.join(', ')}`,
          path
        });
      }
    }

    // Number validation
    if (schema.type === 'number' && typeof obj === 'number') {
      if (schema.minimum !== undefined && obj < schema.minimum) {
        issues.push({
          severity: 'error',
          code: 'MINIMUM_VALUE',
          message: `Value must be at least ${schema.minimum}`,
          path
        });
      }

      if (schema.maximum !== undefined && obj > schema.maximum) {
        issues.push({
          severity: 'error',
          code: 'MAXIMUM_VALUE',
          message: `Value must be at most ${schema.maximum}`,
          path
        });
      }
    }

    // Deprecation warning
    if (schema.deprecated) {
      issues.push({
        severity: 'warning',
        code: 'DEPRECATED_PROPERTY',
        message: schema.deprecationMessage || 'This property is deprecated',
        path
      });
    }

    return issues;
  }

  /**
   * Check extension compatibility
   */
  private async checkExtensionCompatibility(
    extensions: IDEExtension[]
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Check for known incompatible extensions
    const incompatiblePairs = [
      ['ms-python.python', 'ms-python.python-preview'],
      ['bradlc.vscode-tailwindcss', 'tailwindcss.tailwindcss']
    ];

    const extensionIds = extensions.map(ext => ext.id);

    for (const [ext1, ext2] of incompatiblePairs) {
      if (extensionIds.includes(ext1) && extensionIds.includes(ext2)) {
        issues.push({
          severity: 'warning',
          code: 'INCOMPATIBLE_EXTENSIONS',
          message: `Extensions ${ext1} and ${ext2} may conflict`,
          suggestion: 'Consider using only one of these extensions'
        });
      }
    }

    return issues;
  }

  /**
   * Validate setting values
   */
  private async validateSettingValues(
    ideType: IDEType,
    settings: IDEWorkspaceSettings
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Validate editor settings
    if (settings.editor) {
      if ('editor.fontSize' in settings.editor) {
        const fontSize = settings.editor['editor.fontSize'] as number;
        if (fontSize < 8 || fontSize > 72) {
          issues.push({
            severity: 'warning',
            code: 'INVALID_FONT_SIZE',
            message: `Font size ${fontSize} may be too small or large`,
            path: 'settings.editor.fontSize',
            suggestion: 'Use a font size between 8 and 72'
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check performance implications
   */
  private async checkPerformanceImplications(
    profile: IDEConfigurationProfile
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Check for too many extensions
    if (profile.extensions && profile.extensions.length > 50) {
      issues.push({
        severity: 'warning',
        code: 'TOO_MANY_EXTENSIONS',
        message: `Large number of extensions (${profile.extensions.length}) may impact performance`,
        suggestion: 'Consider reducing the number of extensions or using workspace-specific profiles'
      });
    }

    // Check for performance-impacting settings
    if (profile.workspaceSettings) {
      const performanceSettings = [
        'files.watcherExclude',
        'search.exclude',
        'typescript.disableAutomaticTypeAcquisition'
      ];

      for (const setting of performanceSettings) {
        if (setting in (profile.workspaceSettings.custom || {})) {
          issues.push({
            severity: 'info',
            code: 'PERFORMANCE_SETTING',
            message: `Setting ${setting} can impact performance`,
            path: `settings.${setting}`,
            suggestion: 'Review this setting for optimal performance'
          });
        }
      }
    }

    return issues;
  }

  /**
   * Get schema for IDE
   */
  private async getSchemaForIDE(ideType: IDEType): Promise<ConfigurationSchema> {
    const cacheKey = `schema-${ideType}`;
    
    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey)!;
    }

    const schema = this.getDefaultSchemaForIDE(ideType);
    this.schemaCache.set(cacheKey, schema);
    return schema;
  }

  /**
   * Get default schema for IDE
   */
  private getDefaultSchemaForIDE(ideType: IDEType): ConfigurationSchema {
    const baseSchema: ConfigurationSchema = {
      type: 'object',
      properties: {
        extensions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              version: { type: 'string' },
              required: { type: 'boolean' }
            },
            required: ['id']
          }
        },
        workspaceSettings: {
          type: 'object'
        },
        userSettings: {
          type: 'object'
        }
      }
    };

    // Customize schema based on IDE type
    switch (ideType) {
      case 'vscode':
      case 'cursor':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            workspaceSettings: {
              type: 'object',
              properties: {
                editor: {
                  type: 'object',
                  properties: {
                    'editor.fontSize': { type: 'number', minimum: 8, maximum: 72 },
                    'editor.tabSize': { type: 'number', minimum: 1, maximum: 8 },
                    'files.autoSave': { type: 'string', enum: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'] }
                  }
                }
              }
            }
          }
        };
      default:
        return baseSchema;
    }
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    // VSCode/Cursor rules
    this.validationRules.set('vscode', {
      extensions: {
        allowedMarketplaces: ['vscode', 'open-vsx'],
        requiredFields: ['id'],
        deprecatedExtensions: {
          'ms-vscode.vscode-typescript-next': 'Built into VSCode',
          'ms-python.python': 'Use ms-python.python-next'
        }
      },
      settings: {
        schema: this.getDefaultSchemaForIDE('vscode'),
        conflictingSettings: {
          'editor.formatOnSave': ['prettier.requireConfig'],
          'typescript.preferences.includePackageJsonAutoImports': ['typescript.suggest.autoImports']
        },
        deprecatedSettings: {
          'typescript.experimental.syntaxFolding': 'editor.foldingStrategy',
          'python.pythonPath': 'python.defaultInterpreterPath'
        }
      },
      workspace: {
        requiredFiles: ['.vscode/settings.json'],
        recommendedStructure: ['.vscode/extensions.json', '.vscode/launch.json', '.vscode/tasks.json']
      }
    });

    // Copy VSCode rules for Cursor (they're very similar)
    this.validationRules.set('cursor', this.validationRules.get('vscode')!);

    // JetBrains rules
    this.validationRules.set('jetbrains', {
      extensions: {
        allowedMarketplaces: ['jetbrains'],
        requiredFields: ['id'],
        deprecatedExtensions: {}
      },
      settings: {
        schema: this.getDefaultSchemaForIDE('jetbrains'),
        conflictingSettings: {},
        deprecatedSettings: {}
      },
      workspace: {
        requiredFiles: ['.idea/workspace.xml'],
        recommendedStructure: ['.idea/modules.xml', '.idea/vcs.xml']
      }
    });

    // Vim rules
    this.validationRules.set('vim', {
      extensions: {
        allowedMarketplaces: ['vim-plug', 'pathogen'],
        requiredFields: ['name'],
        deprecatedExtensions: {}
      },
      settings: {
        schema: this.getDefaultSchemaForIDE('vim'),
        conflictingSettings: {},
        deprecatedSettings: {}
      },
      workspace: {
        requiredFiles: ['.vimrc'],
        recommendedStructure: ['.vim/']
      }
    });
  }

  /**
   * Create validation result
   */
  private createValidationResult(issues: ValidationIssue[]): ValidationResult {
    const summary = {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length
    };

    return {
      valid: summary.errors === 0,
      issues,
      summary
    };
  }

  /**
   * Check if version format is valid
   */
  private isValidVersionFormat(version: string): boolean {
    // Semantic versioning pattern
    const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/;
    return semverPattern.test(version);
  }
}

/**
 * Factory function to create configuration validator
 */
export function createConfigurationValidator(): ConfigurationValidator {
  return new ConfigurationValidator();
}

/**
 * Utility function to format validation issues
 */
export function formatValidationIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) {
    return '✅ No validation issues found';
  }

  let output = '';
  
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const info = issues.filter(i => i.severity === 'info');

  if (errors.length > 0) {
    output += `❌ Errors (${errors.length}):\n`;
    errors.forEach(issue => {
      output += `  ${issue.code}: ${issue.message}`;
      if (issue.path) output += ` (${issue.path})`;
      if (issue.suggestion) output += `\n    💡 ${issue.suggestion}`;
      output += '\n';
    });
    output += '\n';
  }

  if (warnings.length > 0) {
    output += `⚠️  Warnings (${warnings.length}):\n`;
    warnings.forEach(issue => {
      output += `  ${issue.code}: ${issue.message}`;
      if (issue.path) output += ` (${issue.path})`;
      if (issue.suggestion) output += `\n    💡 ${issue.suggestion}`;
      output += '\n';
    });
    output += '\n';
  }

  if (info.length > 0) {
    output += `ℹ️  Info (${info.length}):\n`;
    info.forEach(issue => {
      output += `  ${issue.code}: ${issue.message}`;
      if (issue.path) output += ` (${issue.path})`;
      if (issue.suggestion) output += `\n    💡 ${issue.suggestion}`;
      output += '\n';
    });
  }

  return output.trim();
}
