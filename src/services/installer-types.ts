/**
 * Installer Types and Interfaces
 * Defines the core types and interfaces for the HatStart installer system
 */

import type { Architecture, InstallationCommand, InstallationMethod, Platform } from '../shared/manifest-types.js';

/**
 * Installation result status
 */
export type InstallationStatus = 
  | 'pending'
  | 'downloading'
  | 'installing'
  | 'configuring'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped';

/**
 * Installation error types
 */
export type InstallationErrorType =
  | 'network_error'
  | 'permission_denied'
  | 'insufficient_space'
  | 'dependency_missing'
  | 'command_failed'
  | 'verification_failed'
  | 'user_cancelled'
  | 'platform_unsupported'
  | 'unknown_error';

/**
 * Installation progress information
 */
export interface InstallationProgress {
  /** Current installation status */
  status: InstallationStatus;
  /** Current step being executed */
  currentStep: string;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Number of completed steps */
  completedSteps: number;
  /** Total number of steps */
  totalSteps: number;
  /** Current tool being installed */
  toolName: string;
  /** Tool ID being installed */
  toolId: string;
  /** Additional progress details */
  details?: string;
  /** Error message (if status is failed) */
  error?: string;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Download progress (if applicable) */
  downloadProgress?: {
    downloaded: number;
    total: number;
    speed: number; // bytes per second
  };
}

/**
 * Installation error information
 */
export interface InstallationError {
  /** Error type classification */
  type: InstallationErrorType;
  /** Human-readable error message */
  message: string;
  /** Technical error details */
  details?: string;
  /** Error code (if applicable) */
  code?: string | number;
  /** Command that failed (if applicable) */
  command?: string;
  /** Exit code from failed command */
  exitCode?: number;
  /** Standard error output */
  stderr?: string;
  /** Standard output */
  stdout?: string;
  /** Suggested resolution steps */
  suggestions?: string[];
  /** Whether the error is recoverable */
  recoverable: boolean;
  /** Timestamp when error occurred */
  timestamp: Date;
}

/**
 * Installation result
 */
export interface InstallationResult {
  /** Whether installation was successful */
  success: boolean;
  /** Final installation status */
  status: InstallationStatus;
  /** Tool that was installed */
  toolId: string;
  /** Tool name */
  toolName: string;
  /** Installation method used */
  method: InstallationMethod;
  /** Platform where installation occurred */
  platform: Platform;
  /** Architecture targeted */
  architecture?: Architecture;
  /** Installed version (if detected) */
  version?: string;
  /** Installation path (if known) */
  installationPath?: string;
  /** Installation duration in milliseconds */
  duration: number;
  /** Installation errors (if any) */
  errors: InstallationError[];
  /** Installation warnings */
  warnings: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Verification result (if verification was performed) */
  verification?: { success: boolean; details?: string };
  /** Timestamp when installation started */
  startTime: Date;
  /** Timestamp when installation completed */
  endTime: Date;
}

/**
 * Installation options
 */
export interface InstallationOptions {
  /** Force installation even if already installed */
  force?: boolean;
  /** Skip verification steps */
  skipVerification?: boolean;
  /** Skip post-installation configuration */
  skipConfiguration?: boolean;
  /** Installation timeout in milliseconds */
  timeout?: number;
  /** Working directory for installation */
  workingDirectory?: string;
  /** Environment variables to set */
  environment?: Record<string, string>;
  /** Whether to run with elevated privileges */
  elevated?: boolean;
  /** Whether to run in interactive mode */
  interactive?: boolean;
  /** Progress callback function */
  onProgress?: (progress: InstallationProgress) => void;
  /** Error callback function */
  onError?: (error: InstallationError) => void;
  /** Custom installation parameters */
  customParams?: Record<string, unknown>;
  /** Whether to perform a dry run (simulation) */
  dryRun?: boolean;
}

/**
 * Command execution result
 */
export interface CommandExecutionResult {
  /** Exit code from command */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error output */
  stderr: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Whether command was successful (exit code 0) */
  success: boolean;
  /** Command that was executed */
  command: string;
  /** Arguments passed to command */
  args: string[];
  /** Working directory where command was executed */
  workingDirectory?: string;
}

/**
 * Platform-specific installer capabilities
 */
export interface InstallerCapabilities {
  /** Supported installation methods */
  supportedMethods: InstallationMethod[];
  /** Whether elevated privileges are supported */
  supportsElevation: boolean;
  /** Whether progress tracking is available */
  supportsProgress: boolean;
  /** Whether verification is supported */
  supportsVerification: boolean;
  /** Whether rollback is supported */
  supportsRollback: boolean;
  /** Whether installation cancellation is supported */
  supportsCancel: boolean;
  /** Whether parallel installations are supported */
  supportsParallelInstallation: boolean;
  /** Maximum number of parallel installations */
  maxParallelInstallations?: number;
  /** Supported architectures */
  supportedArchitectures: Architecture[];
}

/**
 * Base installer interface that all platform-specific installers must implement
 */
export interface IInstaller {
  /** Platform this installer supports */
  readonly platform: Platform;
  
  /** Installer capabilities */
  readonly capabilities: InstallerCapabilities;

  /**
   * Check if the installer can handle the given installation command
   */
  canHandle(command: InstallationCommand): boolean;

  /**
   * Install a tool using the provided installation command
   */
  install(
    command: InstallationCommand,
    options?: InstallationOptions
  ): Promise<InstallationResult>;

  /**
   * Verify that a tool is properly installed
   */
  verify(
    command: InstallationCommand,
    options?: InstallationOptions
  ): Promise<boolean>;

  /**
   * Uninstall a tool (if supported)
   */
  uninstall?(
    command: InstallationCommand,
    options?: InstallationOptions
  ): Promise<InstallationResult>;

  /**
   * Get installation status for a tool
   */
  getInstallationStatus(toolId: string): Promise<InstallationStatus>;

  /**
   * Cancel an ongoing installation
   */
  cancelInstallation(toolId: string): Promise<boolean>;

  /**
   * Get detailed information about an installation
   */
  getInstallationInfo(toolId: string): Promise<InstallationResult | null>;
}

/**
 * Installer factory interface for creating platform-specific installers
 */
export interface IInstallerFactory {
  /**
   * Create an installer for the specified platform
   */
  createInstaller(platform: Platform): IInstaller;

  /**
   * Get all supported platforms
   */
  getSupportedPlatforms(): Platform[];

  /**
   * Check if a platform is supported
   */
  isPlatformSupported(platform: Platform): boolean;
}

/**
 * Installation manager interface for coordinating multiple installations
 */
export interface IInstallationManager {
  /**
   * Install multiple tools
   */
  installTools(
    commands: InstallationCommand[],
    options?: InstallationOptions
  ): Promise<InstallationResult[]>;

  /**
   * Get installation queue status
   */
  getQueueStatus(): Promise<{
    pending: number;
    active: number;
    completed: number;
    failed: number;
  }>;

  /**
   * Clear installation queue
   */
  clearQueue(): Promise<void>;

  /**
   * Pause all installations
   */
  pauseAll(): Promise<void>;

  /**
   * Resume all installations
   */
  resumeAll(): Promise<void>;
} 