/**
 * Version Manager Types and Interfaces
 * Defines the unified interface for managing multiple versions of programming languages and tools
 */

import type { Architecture, Platform } from '../shared/manifest-types.js';

/**
 * Supported version manager types
 */
export type VersionManagerType = 
  | 'mise'      // Universal version manager (recommended)
  | 'asdf'      // Popular plugin-based manager (Unix-only)
  | 'proto'     // Modern Rust-based manager
  | 'nvm'       // Node.js version manager
  | 'pyenv'     // Python version manager
  | 'rbenv'     // Ruby version manager
  | 'jenv'      // Java version manager
  | 'rustup'    // Rust toolchain manager
  | 'gvm'       // Go version manager
  | 'volta'     // JavaScript toolchain manager
  | 'fnm'       // Fast Node.js manager
  | 'jabba'     // Cross-platform Java manager
  | 'sdkman';   // JVM ecosystem manager

/**
 * Programming languages and tools that support version management
 */
export type VersionedTool = 
  | 'node'
  | 'python'
  | 'ruby'
  | 'java'
  | 'go'
  | 'rust'
  | 'php'
  | 'perl'
  | 'lua'
  | 'elixir'
  | 'erlang'
  | 'julia'
  | 'crystal'
  | 'swift'
  | 'scala'
  | 'kotlin'
  | 'dart'
  | 'flutter'
  | 'deno'
  | 'bun'
  | 'terraform'
  | 'cmake'
  | 'zig'
  | 'lean'
  | 'r'
  | 'neovim';

/**
 * Version specification formats
 */
export type VersionSpecifier = 
  | string          // Exact version: "18.17.0"
  | 'latest'        // Latest stable version
  | 'lts'           // Latest LTS version (if applicable)
  | 'system'        // Use system-installed version
  | { 
      major: number;          // Major version constraint
      minor?: number;         // Minor version constraint  
      patch?: number;         // Patch version constraint
      prerelease?: string;    // Pre-release identifier
    };

/**
 * Version information
 */
export interface VersionInfo {
  /** Version string */
  version: string;
  /** Whether this is an LTS version */
  isLTS?: boolean;
  /** Whether this is a pre-release version */
  isPrerelease?: boolean;
  /** Release date */
  releaseDate?: Date;
  /** End of life date (if known) */
  endOfLife?: Date;
  /** Whether this version is currently installed */
  isInstalled: boolean;
  /** Whether this is the currently active version */
  isActive: boolean;
  /** Installation path (if installed) */
  installationPath?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Version manager status
 */
export type VersionManagerStatus = 
  | 'not_installed'     // Version manager is not installed
  | 'installed'         // Version manager is installed but not configured
  | 'configured'        // Version manager is installed and configured
  | 'active'            // Version manager is active and managing versions
  | 'error';            // Version manager has configuration errors

/**
 * Version operation types
 */
export type VersionOperation = 
  | 'install'
  | 'uninstall'
  | 'switch'
  | 'list'
  | 'list_remote'
  | 'current'
  | 'global'
  | 'local'
  | 'shell';

/**
 * Version operation result
 */
export interface VersionOperationResult {
  /** Whether operation was successful */
  success: boolean;
  /** Operation that was performed */
  operation: VersionOperation;
  /** Tool that was operated on */
  tool: VersionedTool;
  /** Version that was operated on */
  version?: string;
  /** Result message */
  message: string;
  /** Error details (if operation failed) */
  error?: string;
  /** Command output */
  output?: string;
  /** Operation duration in milliseconds */
  duration: number;
  /** Timestamp when operation completed */
  timestamp: Date;
}

/**
 * Version manager configuration
 */
export interface VersionManagerConfig {
  /** Version manager type */
  type: VersionManagerType;
  /** Installation path */
  installationPath?: string;
  /** Configuration file path */
  configPath?: string;
  /** Shell integration enabled */
  shellIntegration: boolean;
  /** Auto-switching enabled */
  autoSwitch: boolean;
  /** Global default versions */
  globalVersions: Record<VersionedTool, string>;
  /** Environment variables */
  environment: Record<string, string>;
  /** Additional configuration options */
  options: Record<string, unknown>;
}

/**
 * Project version configuration
 */
export interface ProjectVersionConfig {
  /** Project root directory */
  projectRoot: string;
  /** Tool versions for this project */
  versions: Record<VersionedTool, VersionSpecifier>;
  /** Environment variables for this project */
  environment?: Record<string, string>;
  /** Configuration file path */
  configFile?: string;
  /** Whether configuration is inherited from parent directories */
  inherited?: boolean;
}

/**
 * Version manager capabilities
 */
export interface VersionManagerCapabilities {
  /** Supported tools */
  supportedTools: VersionedTool[];
  /** Whether it can install versions */
  canInstall: boolean;
  /** Whether it can uninstall versions */
  canUninstall: boolean;
  /** Whether it supports global version setting */
  supportsGlobal: boolean;
  /** Whether it supports local (project) version setting */
  supportsLocal: boolean;
  /** Whether it supports shell-specific versions */
  supportsShell: boolean;
  /** Whether it supports automatic version switching */
  supportsAutoSwitch: boolean;
  /** Whether it supports LTS versions */
  supportsLTS: boolean;
  /** Whether it supports listing remote versions */
  supportsRemoteList: boolean;
  /** Whether it requires shell integration */
  requiresShellIntegration: boolean;
  /** Supported platforms */
  supportedPlatforms: Platform[];
  /** Supported architectures */
  supportedArchitectures: Architecture[];
}

/**
 * Unified version manager interface
 */
export interface IVersionManager {
  /** Version manager type */
  readonly type: VersionManagerType;
  
  /** Version manager capabilities */
  readonly capabilities: VersionManagerCapabilities;
  
  /** Current status */
  readonly status: VersionManagerStatus;

  /**
   * Initialize the version manager
   */
  initialize(): Promise<void>;

  /**
   * Check if the version manager is installed and configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Install the version manager itself
   */
  installManager(): Promise<VersionOperationResult>;

  /**
   * Configure the version manager (shell integration, etc.)
   */
  configure(config: Partial<VersionManagerConfig>): Promise<VersionOperationResult>;

  /**
   * List installed versions for a tool
   */
  listInstalled(tool: VersionedTool): Promise<VersionInfo[]>;

  /**
   * List available versions for a tool (remote)
   */
  listAvailable(tool: VersionedTool): Promise<VersionInfo[]>;

  /**
   * Get currently active version for a tool
   */
  getCurrentVersion(tool: VersionedTool): Promise<VersionInfo | null>;

  /**
   * Install a specific version of a tool
   */
  installVersion(
    tool: VersionedTool, 
    version: VersionSpecifier,
    options?: VersionInstallOptions
  ): Promise<VersionOperationResult>;

  /**
   * Uninstall a specific version of a tool
   */
  uninstallVersion(
    tool: VersionedTool, 
    version: string
  ): Promise<VersionOperationResult>;

  /**
   * Switch to a specific version of a tool
   */
  switchVersion(
    tool: VersionedTool, 
    version: string,
    scope?: 'global' | 'local' | 'shell'
  ): Promise<VersionOperationResult>;

  /**
   * Set global default version for a tool
   */
  setGlobalVersion(
    tool: VersionedTool, 
    version: string
  ): Promise<VersionOperationResult>;

  /**
   * Set local (project) version for a tool
   */
  setLocalVersion(
    tool: VersionedTool, 
    version: string,
    projectRoot?: string
  ): Promise<VersionOperationResult>;

  /**
   * Get project version configuration
   */
  getProjectConfig(projectRoot?: string): Promise<ProjectVersionConfig | null>;

  /**
   * Set project version configuration
   */
  setProjectConfig(
    config: ProjectVersionConfig
  ): Promise<VersionOperationResult>;

  /**
   * Refresh environment (reload shell integration)
   */
  refreshEnvironment(): Promise<VersionOperationResult>;

  /**
   * Get version manager configuration
   */
  getConfig(): Promise<VersionManagerConfig>;

  /**
   * Update version manager configuration
   */
  updateConfig(config: Partial<VersionManagerConfig>): Promise<VersionOperationResult>;
}

/**
 * Version installation options
 */
export interface VersionInstallOptions {
  /** Force installation even if already installed */
  force?: boolean;
  /** Skip verification after installation */
  skipVerification?: boolean;
  /** Installation timeout in milliseconds */
  timeout?: number;
  /** Progress callback */
  onProgress?: (progress: VersionInstallProgress) => void;
  /** Additional installation flags */
  flags?: string[];
  /** Environment variables for installation */
  environment?: Record<string, string>;
}

/**
 * Version installation progress
 */
export interface VersionInstallProgress {
  /** Tool being installed */
  tool: VersionedTool;
  /** Version being installed */
  version: string;
  /** Current step */
  step: string;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Additional details */
  details?: string;
}

/**
 * Version manager factory interface
 */
export interface IVersionManagerFactory {
  /**
   * Create a version manager instance
   */
  createVersionManager(type: VersionManagerType): IVersionManager;

  /**
   * Get all supported version manager types
   */
  getSupportedTypes(): VersionManagerType[];

  /**
   * Get recommended version manager for a tool
   */
  getRecommendedManager(tool: VersionedTool): VersionManagerType;

  /**
   * Check if a version manager type is supported on current platform
   */
  isSupported(type: VersionManagerType, platform?: Platform): boolean;
}

/**
 * Version management engine interface
 */
export interface IVersionManagementEngine {
  /**
   * Get all available version managers
   */
  getAvailableManagers(): Promise<IVersionManager[]>;

  /**
   * Get version manager for a specific tool
   */
  getManagerForTool(tool: VersionedTool): Promise<IVersionManager | null>;

  /**
   * Install and configure the best version manager for a tool
   */
  setupManagerForTool(tool: VersionedTool): Promise<IVersionManager>;

  /**
   * Detect and configure existing version managers
   */
  detectExistingManagers(): Promise<IVersionManager[]>;

  /**
   * Get unified view of all tool versions across managers
   */
  getAllToolVersions(): Promise<Record<VersionedTool, VersionInfo[]>>;

  /**
   * Switch tool version using the appropriate manager
   */
  switchToolVersion(
    tool: VersionedTool,
    version: string,
    scope?: 'global' | 'local' | 'shell'
  ): Promise<VersionOperationResult>;

  /**
   * Install tool version using the appropriate manager
   */
  installToolVersion(
    tool: VersionedTool,
    version: VersionSpecifier,
    options?: VersionInstallOptions
  ): Promise<VersionOperationResult>;

  /**
   * Get current workspace configuration
   */
  getWorkspaceConfig(workspaceRoot?: string): Promise<ProjectVersionConfig | null>;

  /**
   * Apply workspace configuration
   */
  applyWorkspaceConfig(
    config: ProjectVersionConfig
  ): Promise<VersionOperationResult[]>;
} 