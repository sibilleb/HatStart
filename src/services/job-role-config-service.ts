/**
 * Job Role Configuration Service
 * Manages loading, validation, and customization of job role configurations
 */

import { DEFAULT_JOB_ROLE_CONFIGS } from '../data/job-role-configs';
import type { JobRole, JobRoleConfig } from '../types/job-role-types';

/**
 * Validation result for a job role configuration
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Service for managing job role configurations
 */
export class JobRoleConfigService {
  private configs: Map<JobRole, JobRoleConfig>;
  private customConfigs: Map<string, JobRoleConfig>;

  constructor() {
    this.configs = new Map(DEFAULT_JOB_ROLE_CONFIGS.map(config => [config.id as JobRole, config]));
    this.customConfigs = new Map();
  }

  /**
   * Get all available job role configurations
   */
  getAllConfigs(): JobRoleConfig[] {
    return [...this.configs.values(), ...this.customConfigs.values()];
  }

  /**
   * Get a specific job role configuration by ID
   */
  getConfig(roleId: JobRole | string): JobRoleConfig | undefined {
    if (this.configs.has(roleId as JobRole)) {
      return this.configs.get(roleId as JobRole);
    }
    return this.customConfigs.get(roleId);
  }

  /**
   * Add a new custom job role configuration
   * @returns true if successful, false if failed
   */
  addCustomConfig(config: JobRoleConfig): boolean {
    const validation = this.validateConfig(config);
    
    if (!validation.isValid) {
      console.error('Invalid job role configuration:', validation.errors);
      return false;
    }

    if (this.configs.has(config.id as JobRole) || this.customConfigs.has(config.id)) {
      console.error(`Job role with ID '${config.id}' already exists`);
      return false;
    }

    this.customConfigs.set(config.id, config);
    return true;
  }

  /**
   * Update an existing job role configuration
   * @returns true if successful, false if failed
   */
  updateConfig(roleId: JobRole | string, updates: Partial<JobRoleConfig>): boolean {
    let config: JobRoleConfig | undefined;
    
    if (this.configs.has(roleId as JobRole)) {
      config = this.configs.get(roleId as JobRole);
    } else if (this.customConfigs.has(roleId as string)) {
      config = this.customConfigs.get(roleId as string);
    }

    if (!config) {
      console.error(`Job role with ID '${roleId}' not found`);
      return false;
    }

    // Create a new config with updates
    const updatedConfig = {
      ...config,
      ...updates,
      // Don't allow changing the ID
      id: config.id
    };

    const validation = this.validateConfig(updatedConfig);
    if (!validation.isValid) {
      console.error('Invalid job role configuration update:', validation.errors);
      return false;
    }

    // Update the appropriate map
    if (this.configs.has(roleId as JobRole)) {
      this.configs.set(roleId as JobRole, updatedConfig as JobRoleConfig);
    } else {
      this.customConfigs.set(roleId as string, updatedConfig as JobRoleConfig);
    }

    return true;
  }

  /**
   * Delete a custom job role configuration
   * @returns true if successful, false if failed
   */
  deleteCustomConfig(roleId: string): boolean {
    if (!this.customConfigs.has(roleId)) {
      console.error(`Custom job role with ID '${roleId}' not found`);
      return false;
    }

    this.customConfigs.delete(roleId);
    return true;
  }

  /**
   * Import job role configurations from JSON
   * @returns The number of successfully imported configurations
   */
  importConfigs(configsJson: string): number {
    try {
      const configs = JSON.parse(configsJson) as JobRoleConfig[];
      let importedCount = 0;

      for (const config of configs) {
        if (this.addCustomConfig(config)) {
          importedCount++;
        }
      }

      return importedCount;
    } catch (error) {
      console.error('Failed to import job role configurations:', error);
      return 0;
    }
  }

  /**
   * Export all job role configurations to JSON
   */
  exportConfigs(includeBuiltIn: boolean = true): string {
    const configs = includeBuiltIn 
      ? [...this.configs.values(), ...this.customConfigs.values()]
      : [...this.customConfigs.values()];
    
    return JSON.stringify(configs, null, 2);
  }

  /**
   * Reset all configurations to defaults
   */
  resetToDefaults(): void {
    this.configs = new Map(DEFAULT_JOB_ROLE_CONFIGS.map(config => [config.id as JobRole, config]));
    this.customConfigs.clear();
  }

  /**
   * Get recommended tools for a specific job role
   */
  getRecommendedTools(roleId: JobRole | string): string[] {
    const config = this.getConfig(roleId);
    if (!config) return [];

    return [
      ...config.primaryTools,
      ...config.recommendedTools
    ];
  }

  /**
   * Get essential tools for a specific job role
   */
  getEssentialTools(roleId: JobRole | string): string[] {
    const config = this.getConfig(roleId);
    if (!config) return [];

    return [...config.primaryTools];
  }

  /**
   * Get tool categories for a specific job role
   */
  getToolCategories(roleId: JobRole | string): string[] {
    const config = this.getConfig(roleId);
    if (!config) return [];

    return [...config.categories];
  }

  /**
   * Validate a job role configuration
   */
  private validateConfig(config: JobRoleConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.id) errors.push('Missing ID');
    if (!config.name) errors.push('Missing name');
    if (!config.description) errors.push('Missing description');
    
    // Array validations
    if (!Array.isArray(config.primaryTools)) {
      errors.push('primaryTools must be an array');
    }
    
    if (!Array.isArray(config.recommendedTools)) {
      errors.push('recommendedTools must be an array');
    }
    
    if (!Array.isArray(config.optionalTools)) {
      errors.push('optionalTools must be an array');
    }
    
    if (!Array.isArray(config.categories)) {
      errors.push('categories must be an array');
    }
    
    if (!Array.isArray(config.skillAreas)) {
      errors.push('skillAreas must be an array');
    }
    
    if (!Array.isArray(config.workflowTypes)) {
      errors.push('workflowTypes must be an array');
    }

    // Tool list validations
    const allTools = [
      ...config.primaryTools,
      ...config.recommendedTools,
      ...config.optionalTools
    ];

    // Check for duplicate tools
    const duplicateTools = allTools.filter((tool, index) => 
      allTools.indexOf(tool) !== index
    );
    
    if (duplicateTools.length > 0) {
      warnings.push(`Duplicate tools found: ${duplicateTools.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Singleton instance for global usage
export const jobRoleConfigService = new JobRoleConfigService(); 