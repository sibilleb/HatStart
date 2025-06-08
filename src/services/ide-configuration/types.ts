/**
 * IDE Configuration System Types
 * Comprehensive type definitions for managing IDE configurations, extensions, and workspace settings
 */

import type { Platform } from '../../shared/manifest-types.js';

/**
 * Supported IDE types
 */
export type IDEType = 'vscode' | 'cursor' | 'jetbrains' | 'vim' | 'neovim';

/**
 * Configuration value types that can be stored in IDE settings
 */
export type ConfigValue = string | number | boolean | string[] | number[] | Record<string, unknown>;

/**
 * IDE extension information
 */
export interface IDEExtension {
  /** Extension identifier (e.g., 'ms-python.python') */
  id: string;
  /** Display name of the extension */
  name: string;
  /** Extension description */
  description?: string;
  /** Publisher of the extension */
  publisher?: string;
  /** Version requirement (e.g., '^1.0.0') */
  version?: string;
  /** Whether this extension is required */
  required?: boolean;
  /** Platform-specific availability */
  platforms?: Platform[];
  /** Configuration settings specific to this extension */
  settings?: Record<string, ConfigValue>;
}

/**
 * IDE workspace settings configuration
 */
export interface IDEWorkspaceSettings {
  /** General editor settings */
  editor?: Record<string, ConfigValue>;
  /** Language-specific settings */
  languages?: Record<string, Record<string, ConfigValue>>;
  /** Extension-specific settings */
  extensions?: Record<string, ConfigValue>;
  /** Debug configuration */
  debug?: Record<string, ConfigValue>;
  /** Terminal settings */
  terminal?: Record<string, ConfigValue>;
  /** Custom settings */
  custom?: Record<string, ConfigValue>;
}

/**
 * IDE user settings configuration (global settings)
 */
export interface IDEUserSettings extends IDEWorkspaceSettings {
  /** Theme and appearance settings */
  appearance?: {
    theme?: string;
    iconTheme?: string;
    fontSize?: number;
    fontFamily?: string;
    colorCustomizations?: Record<string, string>;
  };
  /** Keybinding customizations */
  keybindings?: Array<{
    key: string;
    command: string;
    when?: string;
    args?: unknown;
  }>;
}

/**
 * IDE configuration profile
 */
export interface IDEConfigurationProfile {
  /** Profile name */
  name: string;
  /** Profile description */
  description?: string;
  /** Target IDE type */
  ideType: IDEType;
  /** Extensions to install */
  extensions: IDEExtension[];
  /** Workspace settings */
  workspaceSettings: IDEWorkspaceSettings;
  /** User settings (optional, for global configuration) */
  userSettings?: IDEUserSettings;
  /** Code snippets */
  snippets?: Record<string, IDESnippet[]>;
  /** Tasks configuration */
  tasks?: IDETask[];
  /** Launch configurations for debugging */
  launchConfigurations?: IDELaunchConfiguration[];
}

/**
 * Code snippet definition
 */
export interface IDESnippet {
  /** Snippet name */
  name: string;
  /** Snippet prefix (trigger) */
  prefix: string;
  /** Snippet body (array of lines) */
  body: string[];
  /** Snippet description */
  description?: string;
  /** Language scope */
  scope?: string;
}

/**
 * Task configuration for build/run tasks
 */
export interface IDETask {
  /** Task label */
  label: string;
  /** Task type (e.g., 'shell', 'npm') */
  type: string;
  /** Command to execute */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Task group (e.g., 'build', 'test') */
  group?: string;
  /** Problem matcher */
  problemMatcher?: string | string[];
  /** Whether this is the default task for its group */
  isDefault?: boolean;
}

/**
 * Debug launch configuration
 */
export interface IDELaunchConfiguration {
  /** Configuration name */
  name: string;
  /** Configuration type (e.g., 'node', 'python') */
  type: string;
  /** Request type (e.g., 'launch', 'attach') */
  request: string;
  /** Program to debug */
  program?: string;
  /** Arguments to pass to the program */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Additional configuration properties */
  [key: string]: unknown;
}

/**
 * IDE configuration operation result
 */
export interface IDEConfigurationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
  /** Warning messages */
  warnings?: string[];
  /** Information about what was configured */
  configured?: {
    extensions?: string[];
    settings?: string[];
    files?: string[];
  };
}

/**
 * IDE configuration manager interface
 */
export interface IIDEConfigurationManager {
  /** IDE type this manager handles */
  readonly ideType: IDEType;
  
  /** Check if the IDE is installed and available */
  isIDEAvailable(): Promise<boolean>;
  
  /** Get the IDE version */
  getIDEVersion(): Promise<string | null>;
  
  /** Install extensions */
  installExtensions(extensions: IDEExtension[]): Promise<IDEConfigurationResult>;
  
  /** Uninstall extensions */
  uninstallExtensions(extensionIds: string[]): Promise<IDEConfigurationResult>;
  
  /** List installed extensions */
  listInstalledExtensions(): Promise<IDEExtension[]>;
  
  /** Apply workspace settings */
  applyWorkspaceSettings(workspaceRoot: string, settings: IDEWorkspaceSettings): Promise<IDEConfigurationResult>;
  
  /** Apply user settings */
  applyUserSettings(settings: IDEUserSettings): Promise<IDEConfigurationResult>;
  
  /** Create workspace configuration files */
  createWorkspaceConfiguration(workspaceRoot: string, profile: IDEConfigurationProfile): Promise<IDEConfigurationResult>;
  
  /** Validate configuration */
  validateConfiguration(profile: IDEConfigurationProfile): Promise<IDEConfigurationResult>;
  
  /** Get current workspace settings */
  getCurrentWorkspaceSettings(workspaceRoot: string): Promise<IDEWorkspaceSettings | null>;
  
  /** Get current user settings */
  getCurrentUserSettings(): Promise<IDEUserSettings | null>;
}

/**
 * IDE configuration factory interface
 */
export interface IIDEConfigurationFactory {
  /** Create a configuration manager for the specified IDE */
  createManager(ideType: IDEType): IIDEConfigurationManager | null;
  
  /** Get all supported IDE types */
  getSupportedIDEs(): IDEType[];
  
  /** Detect available IDEs on the system */
  detectAvailableIDEs(): Promise<IDEType[]>;
}

/**
 * Configuration template for generating IDE-specific configurations
 */
export interface IDEConfigurationTemplate {
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Target IDE types */
  supportedIDEs: IDEType[];
  /** Template variables */
  variables?: Record<string, {
    description: string;
    defaultValue?: ConfigValue;
    required?: boolean;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  }>;
  /** Generate configuration profile from template */
  generate(variables: Record<string, ConfigValue>): IDEConfigurationProfile;
}

/**
 * Workspace-specific IDE configuration
 */
export interface WorkspaceIDEConfiguration {
  /** Workspace root directory */
  workspaceRoot: string;
  /** Workspace name */
  workspaceName?: string;
  /** IDE configurations for this workspace */
  ideConfigurations: Record<IDEType, IDEConfigurationProfile>;
  /** Shared settings across all IDEs */
  sharedSettings?: {
    /** Project-specific environment variables */
    environment?: Record<string, string>;
    /** Common file associations */
    fileAssociations?: Record<string, string>;
    /** Shared code formatting rules */
    formatting?: Record<string, ConfigValue>;
  };
}

/**
 * Configuration validation error
 */
export interface IDEConfigurationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Path to the problematic configuration */
  path?: string;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Configuration validation result
 */
export interface IDEConfigurationValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** Validation errors */
  errors: IDEConfigurationError[];
  /** Validation warnings */
  warnings: IDEConfigurationError[];
} 