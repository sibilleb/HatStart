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
 * Version information for a specific tool
 * 
 * Represents detailed information about a tool version, including
 * semantic version components and metadata.
 */
export interface IVersionInfo {
  /** 
   * Tool name
   * @example 'node', 'python', 'ruby'
   */
  readonly tool: VersionedTool;
  
  /** 
   * Full version string as reported by the tool
   * @example '18.17.0', '3.11.4', '3.0.0'
   */
  readonly version: string;
  
  /** 
   * Major version number
   * @example 18 for Node.js 18.17.0
   */
  readonly major: number;
  
  /** 
   * Minor version number
   * @example 17 for Node.js 18.17.0
   */
  readonly minor: number;
  
  /** 
   * Patch version number
   * @example 0 for Node.js 18.17.0
   */
  readonly patch: number;
  
  /** 
   * Pre-release identifier (if any)
   * @example 'beta', 'rc1', 'alpha'
   */
  readonly prerelease?: string;
  
  /** 
   * Build metadata (if any)
   * @example 'build.123', 'sha.abc123'
   */
  readonly build?: string;
  
  /** 
   * Whether this is the currently active version
   * @default false
   */
  readonly isActive?: boolean;
  
  /** 
   * Whether this version is installed locally
   * @default true
   */
  readonly isInstalled?: boolean;
  
  /** 
   * Installation path for this version (if known)
   * @example '/home/user/.nvm/versions/node/v18.17.0'
   */
  readonly installPath?: string;
  
  /** 
   * Additional metadata about this version
   */
  readonly metadata?: {
    /** Release date */
    readonly releaseDate?: Date;
    /** End of life date */
    readonly eolDate?: Date;
    /** Whether this is an LTS version */
    readonly isLts?: boolean;
    /** LTS codename (if applicable) */
    readonly ltsCodename?: string;
  };
}

/**
 * Result of a version management operation
 * 
 * Standardized result format for all version management operations
 * including installation, switching, uninstallation, etc.
 */
export interface IVersionOperationResult {
  /** 
   * Whether the operation completed successfully
   */
  readonly success: boolean;
  
  /** 
   * Type of operation that was performed
   */
  readonly operation: 'install' | 'uninstall' | 'switch' | 'list' | 'detect' | 'configure';
  
  /** 
   * Tool that was operated on
   */
  readonly tool: VersionedTool;
  
  /** 
   * Human-readable message describing the result
   * @example 'Successfully installed Node.js 18.17.0'
   */
  readonly message: string;
  
  /** 
   * Error message if the operation failed
   */
  readonly error?: string;
  
  /** 
   * Duration of the operation in milliseconds
   */
  readonly duration: number;
  
  /** 
   * Timestamp when the operation completed
   */
  readonly timestamp: Date;
  
  /** 
   * Additional operation-specific data
   */
  readonly data?: Record<string, unknown>;
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
 * Version manager configuration
 * 
 * Defines the complete configuration for a version manager instance,
 * including installation paths, shell integration, and tool-specific settings.
 */
export interface VersionManagerConfig {
  /** 
   * Version manager type identifier
   * @example 'nvm', 'pyenv', 'mise'
   */
  readonly type: VersionManagerType;
  
  /** 
   * Installation path for the version manager
   * @example '/home/user/.nvm', '/usr/local/bin/pyenv'
   * @default Determined by version manager's default installation location
   */
  readonly installationPath?: string;
  
  /** 
   * Configuration file path for the version manager
   * @example '/home/user/.nvmrc', '/home/user/.python-version'
   * @default Determined by version manager's default config location
   */
  readonly configPath?: string;
  
  /** 
   * Whether shell integration is enabled
   * When enabled, the version manager will modify shell profiles to provide
   * automatic version switching and PATH management
   * @default true
   */
  shellIntegration: boolean;
  
  /** 
   * Whether automatic version switching is enabled
   * When enabled, the version manager will automatically switch to the
   * appropriate version when entering a directory with a version file
   * @default true
   */
  autoSwitch: boolean;
  
  /** 
   * Global default versions for each supported tool
   * These versions will be used when no local version is specified
   * @example { node: '18.17.0', python: '3.11.0' }
   */
  globalVersions: Partial<Record<VersionedTool, string>>;
  
  /** 
   * Environment variables to set when this version manager is active
   * @example { NODE_ENV: 'development', PYTHON_PATH: '/custom/path' }
   */
  environment: Record<string, string>;
  
  /** 
   * Additional configuration options specific to the version manager
   * This allows for version manager-specific settings that don't fit
   * into the standard configuration schema
   * @example { nvmrc_lookup: true, use_mirror: 'https://npm.taobao.org/mirrors/node' }
   */
  options: Record<string, unknown>;
}

/**
 * Project version configuration
 * 
 * Defines version requirements and environment settings for a specific project.
 * This configuration is typically stored in project-specific files like .nvmrc,
 * .python-version, or .tool-versions.
 */
export interface ProjectVersionConfig {
  /** 
   * Project root directory (absolute path)
   * @example '/home/user/projects/my-app'
   */
  readonly projectRoot: string;
  
  /** 
   * Tool versions required for this project
   * Maps tool names to their required version specifiers
   * @example { node: '18.17.0', python: '>=3.9.0', ruby: 'lts' }
   */
  versions: Record<VersionedTool, VersionSpecifier>;
  
  /** 
   * Project-specific environment variables
   * These variables will be set when working in this project
   * @example { NODE_ENV: 'development', API_URL: 'http://localhost:3000' }
   */
  environment?: Record<string, string>;
  
  /** 
   * Path to the configuration file
   * @example '/home/user/projects/my-app/.nvmrc'
   * @default Determined by the version manager and project structure
   */
  readonly configFile?: string;
  
  /** 
   * Whether this configuration is inherited from parent directories
   * When true, indicates that some settings come from parent directory configs
   * @default false
   */
  readonly inherited?: boolean;
  
  /**
   * Configuration metadata
   */
  readonly metadata?: {
    /** When this configuration was created */
    createdAt?: Date;
    /** When this configuration was last modified */
    lastModified?: Date;
    /** Version manager that created this configuration */
    createdBy?: VersionManagerType;
    /** Configuration format version */
    formatVersion?: string;
  };
}

/**
 * Version manager capabilities
 * 
 * Defines what operations and features a specific version manager supports.
 * This information is used to determine which version manager to use for
 * specific operations and to provide appropriate UI feedback.
 */
export interface VersionManagerCapabilities {
  /** 
   * Tools that this version manager can manage
   * @example ['node', 'npm', 'yarn'] for nvm
   */
  readonly supportedTools: readonly VersionedTool[];
  
  /** 
   * Whether this version manager can install new versions of tools
   * @default true
   */
  readonly canInstall: boolean;
  
  /** 
   * Whether this version manager can uninstall versions of tools
   * @default true
   */
  readonly canUninstall: boolean;
  
  /** 
   * Whether this version manager supports setting global default versions
   * Global versions are used when no local version is specified
   * @default true
   */
  readonly supportsGlobal: boolean;
  
  /** 
   * Whether this version manager supports project-local version settings
   * Local versions override global versions within a project directory
   * @default true
   */
  readonly supportsLocal: boolean;
  
  /** 
   * Whether this version manager supports shell-specific version settings
   * Shell versions are temporary and only affect the current shell session
   * @default false
   */
  readonly supportsShell: boolean;
  
  /** 
   * Whether this version manager supports automatic version switching
   * When enabled, the version manager automatically switches to the appropriate
   * version when entering a directory with a version configuration file
   * @default false
   */
  readonly supportsAutoSwitch: boolean;
  
  /** 
   * Whether this version manager supports LTS (Long Term Support) versions
   * LTS versions are stable releases with extended support periods
   * @default false
   */
  readonly supportsLTS: boolean;
  
  /** 
   * Whether this version manager can list available versions from remote sources
   * This allows users to see what versions are available for installation
   * @default true
   */
  readonly supportsRemoteList: boolean;
  
  /** 
   * Whether this version manager requires shell integration to function properly
   * Shell integration modifies shell profiles to provide PATH management
   * @default true
   */
  readonly requiresShellIntegration: boolean;
  
  /** 
   * Platforms where this version manager is supported
   * @example ['linux', 'darwin'] for Unix-only managers
   */
  readonly supportedPlatforms: readonly Platform[];
  
  /** 
   * CPU architectures where this version manager is supported
   * @example ['x64', 'arm64'] for modern managers
   */
  readonly supportedArchitectures: readonly Architecture[];
  
  /**
   * Additional capability flags for version manager-specific features
   */
  readonly additionalCapabilities?: {
    /** Whether the manager supports plugin systems */
    readonly supportsPlugins?: boolean;
    /** Whether the manager supports custom installation sources */
    readonly supportsCustomSources?: boolean;
    /** Whether the manager supports version aliasing */
    readonly supportsAliases?: boolean;
    /** Whether the manager supports parallel installations */
    readonly supportsParallelInstalls?: boolean;
    /** Whether the manager supports version caching */
    readonly supportsCaching?: boolean;
    /** Whether the manager supports offline mode */
    readonly supportsOfflineMode?: boolean;
  };
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
  installManager(): Promise<IVersionOperationResult>;

  /**
   * Configure the version manager (shell integration, etc.)
   */
  configure(config: Partial<VersionManagerConfig>): Promise<IVersionOperationResult>;

  /**
   * List installed versions for a tool
   */
  listInstalled(tool: VersionedTool): Promise<IVersionInfo[]>;

  /**
   * List available versions for a tool (remote)
   */
  listAvailable(tool: VersionedTool): Promise<IVersionInfo[]>;

  /**
   * Get currently active version for a tool
   */
  getCurrentVersion(tool: VersionedTool): Promise<IVersionInfo | null>;

  /**
   * Install a specific version of a tool
   */
  installVersion(
    tool: VersionedTool, 
    version: VersionSpecifier,
    options?: VersionInstallOptions
  ): Promise<IVersionOperationResult>;

  /**
   * Uninstall a specific version of a tool
   */
  uninstallVersion(
    tool: VersionedTool, 
    version: string
  ): Promise<IVersionOperationResult>;

  /**
   * Switch to a specific version of a tool
   */
  switchVersion(
    tool: VersionedTool, 
    version: string,
    scope?: 'global' | 'local' | 'shell'
  ): Promise<IVersionOperationResult>;

  /**
   * Set global default version for a tool
   */
  setGlobalVersion(
    tool: VersionedTool, 
    version: string
  ): Promise<IVersionOperationResult>;

  /**
   * Set local (project) version for a tool
   */
  setLocalVersion(
    tool: VersionedTool, 
    version: string,
    projectRoot?: string
  ): Promise<IVersionOperationResult>;

  /**
   * Get project version configuration
   */
  getProjectConfig(projectRoot?: string): Promise<ProjectVersionConfig | null>;

  /**
   * Set project version configuration
   */
  setProjectConfig(
    config: ProjectVersionConfig
  ): Promise<IVersionOperationResult>;

  /**
   * Refresh environment (reload shell integration)
   */
  refreshEnvironment(): Promise<IVersionOperationResult>;

  /**
   * Get version manager configuration
   */
  getConfig(): Promise<VersionManagerConfig>;

  /**
   * Update version manager configuration
   */
  updateConfig(config: Partial<VersionManagerConfig>): Promise<IVersionOperationResult>;
}

/**
 * Version installation options
 * 
 * Configuration options for installing tool versions through version managers.
 * These options control the installation behavior and provide hooks for
 * monitoring installation progress.
 */
export interface VersionInstallOptions {
  /** 
   * Force installation even if the version is already installed
   * When true, will reinstall the version even if it already exists
   * @default false
   */
  force?: boolean;
  
  /** 
   * Skip verification after installation
   * When true, will not verify that the installed version works correctly
   * @default false
   */
  skipVerification?: boolean;
  
  /** 
   * Installation timeout in milliseconds
   * Maximum time to wait for installation to complete
   * @default 300000 (5 minutes)
   * @minimum 1000
   */
  timeout?: number;
  
  /** 
   * Progress callback function
   * Called periodically during installation to report progress
   * @param progress Current installation progress information
   */
  onProgress?: (progress: VersionInstallProgress) => void;
  
  /** 
   * Additional installation flags to pass to the version manager
   * These are version manager-specific flags that control installation behavior
   * @example ['--with-openssl', '--enable-shared'] for Python compilation
   */
  flags?: readonly string[];
  
  /** 
   * Environment variables to set during installation
   * These variables will be available to the installation process
   * @example { CC: 'gcc-9', CFLAGS: '-O2' } for compilation settings
   */
  environment?: Readonly<Record<string, string>>;
  
  /**
   * Installation priority level
   * Controls resource allocation and scheduling for the installation
   * @default 'normal'
   */
  priority?: 'low' | 'normal' | 'high';
  
  /**
   * Whether to install in quiet mode
   * When true, reduces output verbosity during installation
   * @default false
   */
  quiet?: boolean;
  
  /**
   * Custom installation source or mirror
   * Allows overriding the default download source for the version
   * @example 'https://npm.taobao.org/mirrors/node' for Node.js
   */
  source?: string;
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
  getAllToolVersions(): Promise<Record<VersionedTool, IVersionInfo[]>>;

  /**
   * Switch tool version using the appropriate manager
   */
  switchToolVersion(
    tool: VersionedTool,
    version: string,
    scope?: 'global' | 'local' | 'shell'
  ): Promise<IVersionOperationResult>;

  /**
   * Install tool version using the appropriate manager
   */
  installToolVersion(
    tool: VersionedTool,
    version: VersionSpecifier,
    options?: VersionInstallOptions
  ): Promise<IVersionOperationResult>;

  /**
   * Get current workspace configuration
   */
  getWorkspaceConfig(workspaceRoot?: string): Promise<ProjectVersionConfig | null>;

  /**
   * Apply workspace configuration
   */
  applyWorkspaceConfig(
    config: ProjectVersionConfig
  ): Promise<IVersionOperationResult[]>;
} 