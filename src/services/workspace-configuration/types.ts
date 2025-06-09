/**
 * Workspace Configuration Types
 * Interfaces and types for managing workspace-level configuration and environment
 */

import type { Architecture, Platform } from '../../shared/simple-manifest-types';
import type {
  ProjectVersionConfig,
  VersionedTool,
  VersionManagerType,
  IVersionOperationResult,
  VersionSpecifier,
} from '../version-manager-types';

/**
 * Workspace configuration scope
 */
export type WorkspaceScope = 
  | 'global'     // System-wide configuration
  | 'user'       // User-specific configuration
  | 'workspace'  // Workspace-specific configuration
  | 'project';   // Project-specific configuration

/**
 * Environment variable operation types
 */
export type EnvironmentOperation = 
  | 'set'        // Set environment variable
  | 'append'     // Append to environment variable (e.g., PATH)
  | 'prepend'    // Prepend to environment variable
  | 'remove'     // Remove environment variable
  | 'replace';   // Replace environment variable value

/**
 * Shell profile types
 */
export type ShellProfile = 
  | '.bashrc'
  | '.bash_profile'
  | '.zshrc'
  | '.zsh_profile'
  | '.profile'
  | '.fish/config.fish'
  | 'Microsoft.PowerShell_profile.ps1'
  | 'cmd_autorun';

/**
 * Environment variable configuration
 */
export interface EnvironmentVariable {
  /** Variable name */
  name: string;
  /** Variable value */
  value: string;
  /** Operation to perform */
  operation: EnvironmentOperation;
  /** Scope of the variable */
  scope: WorkspaceScope;
  /** Whether the variable is persistent */
  persistent: boolean;
  /** Platform-specific configuration */
  platformSpecific?: Partial<Record<Platform, string>>;
}

/**
 * PATH entry configuration
 */
export interface PathEntry {
  /** Path to add */
  path: string;
  /** Priority (lower numbers = higher priority) */
  priority: number;
  /** Whether to prepend or append */
  position: 'prepend' | 'append';
  /** Tool that owns this path entry */
  tool?: VersionedTool;
  /** Version manager that manages this path */
  manager?: VersionManagerType;
  /** Whether the path is conditional (only add if directory exists) */
  conditional: boolean;
}

/**
 * Shell integration configuration
 */
export interface ShellIntegration {
  /** Shell profile to modify */
  profile: ShellProfile;
  /** Initialization commands */
  initCommands: string[];
  /** Environment variables to set */
  environmentVariables: EnvironmentVariable[];
  /** PATH entries to add */
  pathEntries: PathEntry[];
  /** Whether integration is enabled */
  enabled: boolean;
  /** Backup file path */
  backupPath?: string;
  /** Whether to create backup before modification */
  backupBeforeModification?: boolean;
}

/**
 * Tool version configuration for workspace
 */
export interface WorkspaceToolConfig {
  /** Tool name */
  tool: VersionedTool;
  /** Version specifier */
  version: VersionSpecifier;
  /** Version manager to use */
  manager: VersionManagerType;
  /** Tool-specific environment variables */
  environment?: Record<string, string>;
  /** Tool-specific PATH entries */
  pathEntries?: PathEntry[];
  /** Whether this tool is active in the workspace */
  active: boolean;
}

/**
 * Workspace configuration
 * 
 * Comprehensive configuration for a development workspace, including tool versions,
 * environment variables, shell integrations, and project-specific settings.
 * This configuration defines the complete development environment for a workspace.
 */
export interface WorkspaceConfiguration {
  /** 
   * Workspace root directory (absolute path)
   * @example '/home/user/projects/my-workspace'
   */
  readonly workspaceRoot: string;
  
  /** 
   * Human-readable workspace name
   * @example 'My Development Workspace'
   * @default Derived from workspace directory name
   */
  readonly name?: string;
  
  /** 
   * Tool configurations for this workspace
   * Defines which tools are available and their version requirements
   */
  tools: WorkspaceToolConfig[];
  
  /** 
   * Global environment variables for the workspace
   * These variables will be set for all projects within the workspace
   */
  environment: EnvironmentVariable[];
  
  /** 
   * Global PATH configuration for the workspace
   * Defines additional directories to include in the PATH
   */
  pathConfiguration: PathEntry[];
  
  /** 
   * Shell integrations for the workspace
   * Configures how the workspace integrates with different shell environments
   */
  shellIntegrations: ShellIntegration[];
  
  /** 
   * Project configurations for nested projects
   * Each project can have its own specific version requirements
   */
  projects: readonly ProjectVersionConfig[];
  
  /** 
   * Configuration metadata
   * Information about when and how this configuration was created
   */
  metadata: {
    /** 
     * Configuration schema version
     * Used for migration and compatibility checking
     * @example '1.0.0'
     */
    readonly version: string;
    
    /** 
     * When this configuration was last updated
     */
    lastUpdated: Date;
    
    /** 
     * Platform this configuration was created on
     * @example 'linux', 'darwin', 'win32'
     */
    readonly platform: Platform;
    
    /** 
     * Architecture this configuration was created on
     * @example 'x64', 'arm64'
     */
    readonly architecture: Architecture;
    
    /** 
     * User who created or last modified this configuration
     * @example 'john.doe@company.com'
     */
    readonly user?: string;
    
    /**
     * Additional metadata for workspace identification
     */
    readonly additionalMetadata?: {
      /** Workspace type or category */
      readonly workspaceType?: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'data' | 'devops' | 'generic';
      /** Primary programming languages used */
      readonly primaryLanguages?: readonly VersionedTool[];
      /** Workspace description */
      readonly description?: string;
      /** Tags for categorization */
      readonly tags?: readonly string[];
    };
  };
}

/**
 * Environment synchronization result
 */
export interface EnvironmentSyncResult {
  /** Whether synchronization was successful */
  success: boolean;
  /** Environment variables that were changed */
  changedVariables: string[];
  /** PATH entries that were modified */
  modifiedPaths: string[];
  /** Shell profiles that were updated */
  updatedProfiles: ShellProfile[];
  /** Error message if synchronization failed */
  error?: string;
  /** Warnings during synchronization */
  warnings: string[];
  /** Duration of synchronization in milliseconds */
  duration: number;
}

/**
 * Workspace detection result
 */
export interface WorkspaceDetectionResult {
  /** Whether a workspace was detected */
  detected: boolean;
  /** Workspace root directory */
  workspaceRoot?: string;
  /** Detected workspace type */
  workspaceType?: 'git' | 'npm' | 'python' | 'rust' | 'go' | 'java' | 'generic';
  /** Configuration files found */
  configFiles: string[];
  /** Version manager configurations detected */
  versionManagers: VersionManagerType[];
  /** Tools detected in the workspace */
  detectedTools: VersionedTool[];
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Configuration backup
 */
export interface ConfigurationBackup {
  /** Backup timestamp */
  timestamp: Date;
  /** Original configuration */
  configuration: WorkspaceConfiguration;
  /** Files that were backed up */
  backedUpFiles: string[];
  /** Backup directory */
  backupDirectory: string;
  /** Reason for backup */
  reason: string;
}

/**
 * Workspace configuration service interface
 */
export interface IWorkspaceConfigurationService {
  /**
   * Detect workspace configuration
   */
  detectWorkspace(directory?: string): Promise<WorkspaceDetectionResult>;

  /**
   * Load workspace configuration
   */
  loadConfiguration(workspaceRoot: string): Promise<WorkspaceConfiguration | null>;

  /**
   * Save workspace configuration
   */
  saveConfiguration(config: WorkspaceConfiguration): Promise<void>;

  /**
   * Apply workspace configuration
   */
  applyConfiguration(config: WorkspaceConfiguration): Promise<EnvironmentSyncResult>;

  /**
   * Synchronize environment with current configuration
   */
  synchronizeEnvironment(workspaceRoot?: string): Promise<EnvironmentSyncResult>;

  /**
   * Update tool version in workspace
   */
  updateToolVersion(
    tool: VersionedTool,
    version: VersionSpecifier,
    manager: VersionManagerType,
    workspaceRoot?: string
  ): Promise<IVersionOperationResult>;

  /**
   * Add tool to workspace
   */
  addTool(
    tool: VersionedTool,
    version: VersionSpecifier,
    manager: VersionManagerType,
    workspaceRoot?: string
  ): Promise<IVersionOperationResult>;

  /**
   * Remove tool from workspace
   */
  removeTool(
    tool: VersionedTool,
    workspaceRoot?: string
  ): Promise<IVersionOperationResult>;

  /**
   * Get current workspace configuration
   */
  getCurrentConfiguration(workspaceRoot?: string): Promise<WorkspaceConfiguration | null>;

  /**
   * Create backup of current configuration
   */
  createBackup(
    workspaceRoot: string,
    reason: string
  ): Promise<ConfigurationBackup>;

  /**
   * Restore configuration from backup
   */
  restoreBackup(backup: ConfigurationBackup): Promise<EnvironmentSyncResult>;

  /**
   * Validate workspace configuration
   */
  validateConfiguration(config: WorkspaceConfiguration): Promise<ValidationResult>;
}

/**
 * Environment manager interface
 */
export interface IEnvironmentManager {
  /**
   * Get current environment variables
   */
  getCurrentEnvironment(): Promise<Record<string, string>>;

  /**
   * Set environment variable
   */
  setEnvironmentVariable(
    name: string,
    value: string,
    scope: WorkspaceScope,
    persistent?: boolean
  ): Promise<boolean>;

  /**
   * Remove environment variable
   */
  removeEnvironmentVariable(
    name: string,
    scope: WorkspaceScope
  ): Promise<boolean>;

  /**
   * Update PATH variable
   */
  updatePath(entries: PathEntry[]): Promise<boolean>;

  /**
   * Get current PATH entries
   */
  getCurrentPath(): Promise<string[]>;

  /**
   * Refresh environment (reload from shell)
   */
  refreshEnvironment(): Promise<boolean>;
}

/**
 * Shell integration manager interface
 */
export interface IShellIntegrationManager {
  /**
   * Detect available shell profiles
   */
  detectShellProfiles(): Promise<ShellProfile[]>;

  /**
   * Get current shell type
   */
  getCurrentShell(): Promise<string>;

  /**
   * Update shell profile
   */
  updateShellProfile(
    profile: ShellProfile,
    integration: ShellIntegration
  ): Promise<boolean>;

  /**
   * Remove shell integration
   */
  removeShellIntegration(
    profile: ShellProfile,
    integration: ShellIntegration
  ): Promise<boolean>;

  /**
   * Backup shell profile
   */
  backupShellProfile(profile: ShellProfile): Promise<string>;

  /**
   * Restore shell profile from backup
   */
  restoreShellProfile(profile: ShellProfile, backupPath: string): Promise<boolean>;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  /** Whether configuration is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Suggestions for improvement */
  suggestions: string[];
}

/**
 * Workspace configuration events
 */
export type WorkspaceConfigurationEvent = 
  | 'configuration-loaded'
  | 'configuration-saved'
  | 'configuration-applied'
  | 'environment-synchronized'
  | 'tool-added'
  | 'tool-removed'
  | 'tool-version-changed'
  | 'backup-created'
  | 'backup-restored';

/**
 * Event listener interface
 */
export interface IWorkspaceConfigurationEventListener {
  onEvent(event: WorkspaceConfigurationEvent, data: unknown): void;
} 