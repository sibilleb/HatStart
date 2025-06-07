/**
 * Command Execution Types
 * Unified interfaces for cross-platform command execution
 */

import type { Architecture, Platform } from '../../shared/manifest-types.js';

/**
 * Command execution modes
 */
export type CommandExecutionMode = 
  | 'exec'      // Basic execution with buffered output
  | 'spawn'     // Real-time execution with streaming output
  | 'shell'     // Execute through shell with full shell features
  | 'elevated'; // Execute with elevated privileges

/**
 * Shell types supported across platforms
 */
export type ShellType = 
  | 'bash'
  | 'zsh'
  | 'fish'
  | 'powershell'
  | 'cmd'
  | 'sh';

/**
 * Command execution options
 */
export interface CommandExecutionOptions {
  /** Execution mode */
  mode?: CommandExecutionMode;
  /** Execution timeout in milliseconds */
  timeout?: number;
  /** Working directory */
  workingDirectory?: string;
  /** Environment variables to set/override */
  environment?: Record<string, string>;
  /** Whether to inherit parent process environment */
  inheritEnvironment?: boolean;
  /** Shell to use for execution */
  shell?: ShellType | boolean;
  /** Whether to run with elevated privileges */
  elevated?: boolean;
  /** Input to send to the command */
  input?: string;
  /** Encoding for input/output */
  encoding?: BufferEncoding;
  /** Whether to capture stderr separately */
  separateStderr?: boolean;
  /** Maximum buffer size for output */
  maxBuffer?: number;
  /** Kill signal to use for timeout */
  killSignal?: NodeJS.Signals;
  /** Progress callback for streaming output */
  onProgress?: (data: CommandOutputData) => void;
  /** Error callback for execution errors */
  onError?: (error: CommandExecutionError) => void;
  /** Whether to suppress output logging */
  silent?: boolean;
  /** Custom execution context */
  context?: Record<string, unknown>;
}

/**
 * Command output data for streaming
 */
export interface CommandOutputData {
  /** Output type */
  type: 'stdout' | 'stderr';
  /** Output data */
  data: string;
  /** Timestamp when data was received */
  timestamp: Date;
  /** Whether this is the final output */
  final?: boolean;
}

/**
 * Command execution result
 */
export interface CommandExecutionResult {
  /** Whether command executed successfully (exit code 0) */
  success: boolean;
  /** Command exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error output */
  stderr: string;
  /** Combined output (stdout + stderr) */
  output: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Command that was executed */
  command: string;
  /** Arguments passed to command */
  args: string[];
  /** Working directory where command was executed */
  workingDirectory?: string;
  /** Environment variables used */
  environment?: Record<string, string>;
  /** Platform where command was executed */
  platform: Platform;
  /** Process ID (if available) */
  pid?: number;
  /** Signal that terminated the process (if any) */
  signal?: NodeJS.Signals;
  /** Whether command was killed due to timeout */
  timedOut: boolean;
  /** Timestamp when execution started */
  startTime: Date;
  /** Timestamp when execution completed */
  endTime: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Command execution error types
 */
export type CommandExecutionErrorType =
  | 'command_not_found'
  | 'permission_denied'
  | 'timeout'
  | 'killed'
  | 'spawn_error'
  | 'shell_error'
  | 'elevation_failed'
  | 'working_directory_not_found'
  | 'environment_error'
  | 'unknown_error';

/**
 * Command execution error
 */
export interface CommandExecutionError extends Error {
  /** Error type classification */
  type: CommandExecutionErrorType;
  /** Command that failed */
  command: string;
  /** Arguments passed to command */
  args: string[];
  /** Exit code (if available) */
  exitCode?: number;
  /** Signal that caused the error (if any) */
  signal?: NodeJS.Signals;
  /** Standard output before error */
  stdout?: string;
  /** Standard error output */
  stderr?: string;
  /** Working directory */
  workingDirectory?: string;
  /** Whether the error is recoverable */
  recoverable: boolean;
  /** Suggested resolution steps */
  suggestions?: string[];
  /** Original error that caused this error */
  cause?: Error;
  /** Timestamp when error occurred */
  timestamp: Date;
}

/**
 * Command validation result
 */
export interface CommandValidationResult {
  /** Whether command is available */
  available: boolean;
  /** Command path (if found) */
  path?: string;
  /** Command version (if detectable) */
  version?: string;
  /** Platform where command was found */
  platform: Platform;
  /** Method used to find command */
  method: 'which' | 'where' | 'type' | 'command' | 'filesystem';
  /** Additional metadata about the command */
  metadata?: Record<string, unknown>;
}

/**
 * Platform-specific command adapter interface
 */
export interface IPlatformCommandAdapter {
  /** Platform this adapter supports */
  readonly platform: Platform;
  
  /** Supported shell types */
  readonly supportedShells: ShellType[];
  
  /** Default shell for this platform */
  readonly defaultShell: ShellType;

  /**
   * Execute a command on this platform
   */
  execute(
    command: string,
    args: string[],
    options: CommandExecutionOptions
  ): Promise<CommandExecutionResult>;

  /**
   * Validate if a command is available
   */
  validateCommand(command: string): Promise<CommandValidationResult>;

  /**
   * Get the appropriate shell command for execution
   */
  getShellCommand(shell: ShellType): { command: string; args: string[] };

  /**
   * Prepare environment variables for execution
   */
  prepareEnvironment(
    baseEnv: Record<string, string>,
    additionalEnv?: Record<string, string>
  ): Record<string, string>;

  /**
   * Handle platform-specific command escaping
   */
  escapeCommand(command: string): string;

  /**
   * Handle platform-specific argument escaping
   */
  escapeArguments(args: string[]): string[];

  /**
   * Check if elevation is supported
   */
  supportsElevation(): boolean;

  /**
   * Get elevation command prefix
   */
  getElevationCommand(): { command: string; args: string[] } | null;
}

/**
 * Command executor interface
 */
export interface ICommandExecutor {
  /** Current platform */
  readonly platform: Platform;
  
  /** Current architecture */
  readonly architecture: Architecture;

  /**
   * Execute a command with the specified options
   */
  execute(
    command: string,
    args?: string[],
    options?: CommandExecutionOptions
  ): Promise<CommandExecutionResult>;

  /**
   * Execute a command and stream output in real-time
   */
  executeStream(
    command: string,
    args?: string[],
    options?: CommandExecutionOptions
  ): Promise<CommandExecutionResult>;

  /**
   * Execute a shell command (command + args as single string)
   */
  executeShell(
    commandLine: string,
    options?: CommandExecutionOptions
  ): Promise<CommandExecutionResult>;

  /**
   * Validate if a command is available on the system
   */
  validateCommand(command: string): Promise<CommandValidationResult>;

  /**
   * Check if multiple commands are available
   */
  validateCommands(commands: string[]): Promise<Record<string, CommandValidationResult>>;

  /**
   * Get the current shell type
   */
  getCurrentShell(): ShellType;

  /**
   * Get available shells on the system
   */
  getAvailableShells(): Promise<ShellType[]>;

  /**
   * Kill a running command by process ID
   */
  killProcess(pid: number, signal?: NodeJS.Signals): Promise<boolean>;

  /**
   * Get platform-specific command adapter
   */
  getPlatformAdapter(): IPlatformCommandAdapter;
}

/**
 * Command builder interface for fluent command construction
 */
export interface ICommandBuilder {
  /**
   * Set the base command
   */
  command(cmd: string): ICommandBuilder;

  /**
   * Add arguments
   */
  args(...args: string[]): ICommandBuilder;

  /**
   * Set working directory
   */
  cwd(directory: string): ICommandBuilder;

  /**
   * Set environment variables
   */
  env(variables: Record<string, string>): ICommandBuilder;

  /**
   * Set execution timeout
   */
  timeout(ms: number): ICommandBuilder;

  /**
   * Set shell to use
   */
  shell(shell: ShellType | boolean): ICommandBuilder;

  /**
   * Enable elevated execution
   */
  elevated(): ICommandBuilder;

  /**
   * Set execution mode
   */
  mode(mode: CommandExecutionMode): ICommandBuilder;

  /**
   * Add progress callback
   */
  onProgress(callback: (data: CommandOutputData) => void): ICommandBuilder;

  /**
   * Add error callback
   */
  onError(callback: (error: CommandExecutionError) => void): ICommandBuilder;

  /**
   * Execute the built command
   */
  execute(): Promise<CommandExecutionResult>;

  /**
   * Execute with streaming output
   */
  executeStream(): Promise<CommandExecutionResult>;
}

/**
 * Command execution factory interface
 */
export interface ICommandExecutorFactory {
  /**
   * Create a command executor for the current platform
   */
  createExecutor(): ICommandExecutor;

  /**
   * Create a command executor for a specific platform
   */
  createExecutorForPlatform(platform: Platform, architecture: Architecture): ICommandExecutor;

  /**
   * Create a command builder
   */
  createBuilder(): ICommandBuilder;

  /**
   * Get supported platforms
   */
  getSupportedPlatforms(): Platform[];

  /**
   * Check if a platform is supported
   */
  isPlatformSupported(platform: Platform): boolean;
} 