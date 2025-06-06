/**
 * HatStart Manifest Type Definitions
 * Comprehensive interfaces for developer tool management and installation
 */

// Base types for type safety
export type ToolCategory = 
  | 'frontend'
  | 'backend'
  | 'devops'
  | 'mobile'
  | 'design'
  | 'testing'
  | 'database'
  | 'productivity'
  | 'security'
  | 'language'
  | 'version-control'
  | 'cloud';

export type Platform = 
  | 'windows'
  | 'macos'
  | 'linux';

export type Architecture = 
  | 'x64'
  | 'arm64'
  | 'x86';

export type ExperienceLevel = 
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export type InstallationMethod = 
  | 'package-manager'
  | 'direct-download'
  | 'script'
  | 'homebrew'
  | 'chocolatey'
  | 'apt'
  | 'yum'
  | 'snap'
  | 'flatpak'
  | 'winget'
  | 'scoop'
  | 'npm'
  | 'cargo'
  | 'pip'
  | 'gem'
  | 'go-install';

export type DependencyType = 
  | 'required'
  | 'optional'
  | 'conflicts'
  | 'suggests';

// Type for configuration values
export type ConfigValue = string | number | boolean | string[] | Record<string, unknown>;

// System requirements interface
export interface SystemRequirements {
  /** Minimum supported operating systems */
  platforms: Platform[];
  /** Supported CPU architectures */
  architectures: Architecture[];
  /** Minimum RAM in MB */
  minRam?: number;
  /** Minimum disk space in MB */
  minDiskSpace?: number;
  /** Required system features or capabilities */
  requiredFeatures?: string[];
  /** Environment variables that must be set */
  requiredEnvVars?: string[];
}

// Installation command interface
export interface InstallationCommand {
  /** Installation method type */
  method: InstallationMethod;
  /** Target platform for this command */
  platform: Platform;
  /** Target architecture (if specific) */
  architecture?: Architecture;
  /** Command to execute */
  command: string;
  /** Arguments to pass to the command */
  args?: string[];
  /** Pre-installation commands */
  preInstall?: string[];
  /** Post-installation commands */
  postInstall?: string[];
  /** Verification command to check if installation succeeded */
  verifyCommand?: string;
  /** Expected verification output pattern */
  verifyPattern?: string;
  /** Whether to run with elevated privileges */
  requiresElevation?: boolean;
  /** Working directory for command execution */
  workingDirectory?: string;
  /** Environment variables to set during installation */
  environment?: Record<string, string>;
}

// Dependency relationship interface
export interface ToolDependency {
  /** Tool ID that this depends on */
  toolId: string;
  /** Type of dependency relationship */
  type: DependencyType;
  /** Minimum version required */
  minVersion?: string;
  /** Maximum version supported */
  maxVersion?: string;
  /** Version range specification */
  versionRange?: string;
  /** Whether this dependency is platform-specific */
  platforms?: Platform[];
  /** Reason for the dependency */
  reason?: string;
}

// Configuration option interface
export interface ConfigurationOption {
  /** Configuration key */
  key: string;
  /** Display name for the option */
  name: string;
  /** Description of what this configures */
  description: string;
  /** Data type of the configuration value */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Default value */
  defaultValue?: ConfigValue;
  /** Possible values (for enums) */
  possibleValues?: ConfigValue[];
  /** Whether this option is required */
  required?: boolean;
  /** Validation pattern for string values */
  pattern?: string;
  /** Platform-specific applicability */
  platforms?: Platform[];
}

// Version information interface
export interface VersionInfo {
  /** Current stable version */
  stable: string;
  /** Latest beta version */
  beta?: string;
  /** Latest alpha/preview version */
  preview?: string;
  /** Minimum supported version */
  minimum?: string;
  /** Recommended version */
  recommended?: string;
  /** Version check command */
  checkCommand?: string;
  /** Pattern to extract version from command output */
  versionPattern?: string;
}

// Documentation and help interface
export interface ToolDocumentation {
  /** Official documentation URL */
  officialDocs?: string;
  /** Quick start guide URL */
  quickStart?: string;
  /** API reference URL */
  apiReference?: string;
  /** Tutorial links */
  tutorials?: string[];
  /** Video tutorials */
  videos?: string[];
  /** Community resources */
  community?: string[];
  /** Troubleshooting guide */
  troubleshooting?: string;
}

// IDE integration interface
export interface IDEIntegration {
  /** VSCode extension ID */
  vscode?: {
    extensionId: string;
    settings?: Record<string, ConfigValue>;
    snippets?: string[];
  };
  /** Cursor IDE integration */
  cursor?: {
    extensionId?: string;
    settings?: Record<string, ConfigValue>;
    rules?: string[];
  };
  /** JetBrains IDE integration */
  jetbrains?: {
    pluginId?: string;
    settings?: Record<string, ConfigValue>;
  };
  /** Vim/Neovim integration */
  vim?: {
    plugins?: string[];
    config?: string;
  };
}

// Main tool manifest interface
export interface ToolManifest {
  /** Unique identifier for the tool */
  id: string;
  /** Display name of the tool */
  name: string;
  /** Brief description */
  description: string;
  /** Detailed description */
  longDescription?: string;
  /** Tool category */
  category: ToolCategory;
  /** Sub-categories or tags */
  tags?: string[];
  /** Recommended experience level */
  experienceLevel: ExperienceLevel[];
  /** System requirements */
  systemRequirements: SystemRequirements;
  /** Version information */
  version: VersionInfo;
  /** Installation methods for different platforms */
  installation: InstallationCommand[];
  /** Tool dependencies */
  dependencies?: ToolDependency[];
  /** Configuration options */
  configuration?: ConfigurationOption[];
  /** IDE integrations */
  ideIntegration?: IDEIntegration;
  /** Documentation and resources */
  documentation?: ToolDocumentation;
  /** Official website */
  website?: string;
  /** Repository URL */
  repository?: string;
  /** License information */
  license?: string;
  /** Maintainer information */
  maintainer?: {
    name: string;
    email?: string;
    url?: string;
  };
  /** Tool popularity score (0-100) */
  popularityScore?: number;
  /** Whether tool is actively maintained */
  isActiveMaintained?: boolean;
  /** Last update timestamp */
  lastUpdated?: string;
  /** Manifest schema version */
  schemaVersion: string;
}

// Category manifest interface
export interface CategoryManifest {
  /** Category information */
  category: ToolCategory;
  /** Display name for the category */
  name: string;
  /** Category description */
  description: string;
  /** Category icon */
  icon?: string;
  /** Color theme for category */
  color?: string;
  /** Tools in this category */
  tools: ToolManifest[];
  /** Category-specific configuration */
  configuration?: ConfigurationOption[];
  /** Recommended tool combinations */
  recommendations?: {
    name: string;
    description: string;
    toolIds: string[];
    experienceLevel: ExperienceLevel;
  }[];
  /** Last update timestamp */
  lastUpdated: string;
  /** Manifest schema version */
  schemaVersion: string;
}

// Master manifest interface
export interface MasterManifest {
  /** Manifest metadata */
  metadata: {
    name: string;
    version: string;
    description: string;
    lastUpdated: string;
    schemaVersion: string;
  };
  /** Available categories */
  categories: ToolCategory[];
  /** Category manifests */
  categoryManifests: Record<ToolCategory, CategoryManifest>;
  /** Global configuration options */
  globalConfiguration?: ConfigurationOption[];
  /** Default settings */
  defaults?: {
    experienceLevel: ExperienceLevel;
    platform: Platform;
    architecture: Architecture;
    installationPreferences: InstallationMethod[];
  };
}

// Validation result interfaces
export interface ValidationError {
  /** Error code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Path to the problematic field */
  path: string;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Suggested fix */
  suggestion?: string;
}

export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** List of validation errors/warnings */
  errors: ValidationError[];
  /** Warnings that don't prevent functionality */
  warnings: ValidationError[];
  /** Validation metadata */
  metadata: {
    validatedAt: string;
    schemaVersion: string;
    validatorVersion: string;
  };
}

// Cache-related interfaces
export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Cache timestamp */
  timestamp: number;
  /** Data hash for integrity checking */
  hash: string;
  /** Time-to-live in seconds */
  ttl?: number;
  /** Cache metadata */
  metadata?: Record<string, unknown>;
}

export interface CacheOptions {
  /** Time-to-live in seconds */
  ttl?: number;
  /** Maximum cache size */
  maxSize?: number;
  /** Whether to persist cache to disk */
  persistent?: boolean;
  /** Cache key prefix */
  prefix?: string;
} 