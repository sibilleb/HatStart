/**
 * Base Command Executor
 * Common functionality for all platform-specific command executors
 */

import { ChildProcess, exec, spawn } from 'child_process';
import { promisify } from 'util';
import type { Architecture, Platform } from '../../shared/manifest-types.js';
import type {
    CommandExecutionError,
    CommandExecutionErrorType,
    CommandExecutionOptions,
    CommandExecutionResult,
    CommandValidationResult,
    ICommandExecutor,
    IPlatformCommandAdapter,
    ShellType
} from './types.js';

const execAsync = promisify(exec);

/**
 * Abstract base class for command executors
 */
export abstract class BaseCommandExecutor implements ICommandExecutor {
  public readonly platform: Platform;
  public readonly architecture: Architecture;
  
  protected readonly platformAdapter: IPlatformCommandAdapter;
  protected readonly runningProcesses = new Map<number, ChildProcess>();

  constructor(platform: Platform, architecture: Architecture, platformAdapter: IPlatformCommandAdapter) {
    this.platform = platform;
    this.architecture = architecture;
    this.platformAdapter = platformAdapter;
  }

  /**
   * Execute a command with the specified options
   */
  public async execute(
    command: string,
    args: string[] = [],
    options: CommandExecutionOptions = {}
  ): Promise<CommandExecutionResult> {
    const startTime = new Date();
    const resolvedOptions = this.resolveOptions(options);

    try {
      // Validate command if not in silent mode
      if (!resolvedOptions.silent) {
        const validation = await this.validateCommand(command);
        if (!validation.available) {
          throw this.createError(
            'command_not_found',
            `Command '${command}' not found`,
            command,
            args,
            { validation }
          );
        }
      }

      // Choose execution method based on mode
      switch (resolvedOptions.mode) {
        case 'spawn':
          return await this.executeWithSpawn(command, args, resolvedOptions, startTime);
        case 'shell':
          return await this.executeWithShell(command, args, resolvedOptions, startTime);
        case 'elevated':
          return await this.executeElevated(command, args, resolvedOptions, startTime);
        case 'exec':
        default:
          return await this.executeWithExec(command, args, resolvedOptions, startTime);
      }
    } catch (error) {
      const endTime = new Date();
      
      if (error instanceof Error && 'type' in error) {
        // Already a CommandExecutionError
        return this.createErrorResult(error as CommandExecutionError, command, args, startTime, endTime);
      }
      
      // Convert generic error to CommandExecutionError
      const commandError = this.createError(
        'unknown_error',
        error instanceof Error ? error.message : String(error),
        command,
        args,
        { originalError: error }
      );
      
      return this.createErrorResult(commandError, command, args, startTime, endTime);
    }
  }

  /**
   * Execute a command and stream output in real-time
   */
  public async executeStream(
    command: string,
    args: string[] = [],
    options: CommandExecutionOptions = {}
  ): Promise<CommandExecutionResult> {
    const resolvedOptions = { ...options, mode: 'spawn' as const };
    return this.execute(command, args, resolvedOptions);
  }

  /**
   * Execute a shell command (command + args as single string)
   */
  public async executeShell(
    commandLine: string,
    options: CommandExecutionOptions = {}
  ): Promise<CommandExecutionResult> {
    const resolvedOptions = { ...options, mode: 'shell' as const };
    const [command, ...args] = this.parseCommandLine(commandLine);
    return this.execute(command, args, resolvedOptions);
  }

  /**
   * Validate if a command is available on the system
   */
  public async validateCommand(command: string): Promise<CommandValidationResult> {
    return this.platformAdapter.validateCommand(command);
  }

  /**
   * Check if multiple commands are available
   */
  public async validateCommands(commands: string[]): Promise<Record<string, CommandValidationResult>> {
    const results: Record<string, CommandValidationResult> = {};
    
    // Execute validations in parallel for better performance
    const validationPromises = commands.map(async (command) => {
      const result = await this.validateCommand(command);
      return { command, result };
    });
    
    const validationResults = await Promise.all(validationPromises);
    
    for (const { command, result } of validationResults) {
      results[command] = result;
    }
    
    return results;
  }

  /**
   * Get the current shell type
   */
  public getCurrentShell(): ShellType {
    return this.platformAdapter.defaultShell;
  }

  /**
   * Get available shells on the system
   */
  public async getAvailableShells(): Promise<ShellType[]> {
    const shells = this.platformAdapter.supportedShells;
    const availableShells: ShellType[] = [];
    
    for (const shell of shells) {
      const validation = await this.validateCommand(shell);
      if (validation.available) {
        availableShells.push(shell);
      }
    }
    
    return availableShells;
  }

  /**
   * Kill a running command by process ID
   */
  public async killProcess(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<boolean> {
    try {
      const childProcess = this.runningProcesses.get(pid);
      if (childProcess) {
        childProcess.kill(signal);
        this.runningProcesses.delete(pid);
        return true;
      }
      
      // Try to kill process directly
      process.kill(pid, signal);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get platform-specific command adapter
   */
  public getPlatformAdapter(): IPlatformCommandAdapter {
    return this.platformAdapter;
  }

  // Protected helper methods

  /**
   * Execute command using child_process.exec
   */
  protected async executeWithExec(
    command: string,
    args: string[],
    options: CommandExecutionOptions,
    startTime: Date
  ): Promise<CommandExecutionResult> {
    const fullCommand = this.buildFullCommand(command, args, options);
    const execOptions = this.buildExecOptions(options);

    try {
      const { stdout, stderr } = await execAsync(fullCommand, execOptions);
      const endTime = new Date();

      return this.createSuccessResult(
        command,
        args,
        stdout,
        stderr,
        0,
        startTime,
        endTime,
        options
      );
         } catch (error: unknown) {
       const endTime = new Date();
       const execError = error as { code?: number; stdout?: string; stderr?: string; signal?: NodeJS.Signals; message?: string };
       const commandError = this.createError(
         this.classifyExecError(execError),
         execError.message || 'Command execution failed',
         command,
         args,
         {
           exitCode: execError.code,
           stdout: execError.stdout,
           stderr: execError.stderr,
           signal: execError.signal,
         }
       );

      return this.createErrorResult(commandError, command, args, startTime, endTime);
    }
  }

  /**
   * Execute command using child_process.spawn
   */
  protected async executeWithSpawn(
    command: string,
    args: string[],
    options: CommandExecutionOptions,
    startTime: Date
  ): Promise<CommandExecutionResult> {
    return new Promise((resolve) => {
      const spawnOptions = this.buildSpawnOptions(options);
      const childProcess = spawn(command, args, spawnOptions);
      
      if (childProcess.pid) {
        this.runningProcesses.set(childProcess.pid, childProcess);
      }

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let timeoutHandle: NodeJS.Timeout | null = null;

      // Set up timeout
      if (options.timeout) {
        timeoutHandle = setTimeout(() => {
          timedOut = true;
          childProcess.kill(options.killSignal || 'SIGTERM');
        }, options.timeout);
      }

      // Handle stdout
      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString(options.encoding || 'utf8');
          stdout += output;
          
          if (options.onProgress) {
            options.onProgress({
              type: 'stdout',
              data: output,
              timestamp: new Date(),
            });
          }
        });
      }

      // Handle stderr
      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data: Buffer) => {
          const output = data.toString(options.encoding || 'utf8');
          stderr += output;
          
          if (options.onProgress) {
            options.onProgress({
              type: 'stderr',
              data: output,
              timestamp: new Date(),
            });
          }
        });
      }

             // Handle process completion
       childProcess.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
        const endTime = new Date();
        
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        
        if (childProcess.pid) {
          this.runningProcesses.delete(childProcess.pid);
        }

        if (timedOut) {
          const error = this.createError(
            'timeout',
            `Command timed out after ${options.timeout}ms`,
            command,
            args,
            { timeout: options.timeout }
          );
          resolve(this.createErrorResult(error, command, args, startTime, endTime));
          return;
        }

        const result = this.createSuccessResult(
          command,
          args,
          stdout,
          stderr,
          code || 0,
          startTime,
          endTime,
          options,
          {
            pid: childProcess.pid,
            signal,
            timedOut,
          }
        );

        resolve(result);
      });

      // Handle process errors
      childProcess.on('error', (error) => {
        const endTime = new Date();
        
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        
        if (childProcess.pid) {
          this.runningProcesses.delete(childProcess.pid);
        }

        const commandError = this.createError(
          'spawn_error',
          error.message,
          command,
          args,
          { originalError: error }
        );

        resolve(this.createErrorResult(commandError, command, args, startTime, endTime));
      });

      // Send input if provided
      if (options.input && childProcess.stdin) {
        childProcess.stdin.write(options.input);
        childProcess.stdin.end();
      }
    });
  }

  /**
   * Execute command through shell
   */
  protected async executeWithShell(
    command: string,
    args: string[],
    options: CommandExecutionOptions,
    startTime: Date
  ): Promise<CommandExecutionResult> {
    const shell = options.shell === true ? this.getCurrentShell() : (options.shell as ShellType);
    const shellCommand = this.platformAdapter.getShellCommand(shell);
    const fullCommand = this.buildFullCommand(command, args, options);
    
    const shellArgs = [...shellCommand.args, fullCommand];
    
    return this.executeWithSpawn(shellCommand.command, shellArgs, options, startTime);
  }

  /**
   * Execute command with elevated privileges
   */
  protected async executeElevated(
    command: string,
    args: string[],
    options: CommandExecutionOptions,
    startTime: Date
  ): Promise<CommandExecutionResult> {
    if (!this.platformAdapter.supportsElevation()) {
      const error = this.createError(
        'elevation_failed',
        'Elevation not supported on this platform',
        command,
        args
      );
      const endTime = new Date();
      return this.createErrorResult(error, command, args, startTime, endTime);
    }

    const elevationCommand = this.platformAdapter.getElevationCommand();
    if (!elevationCommand) {
      const error = this.createError(
        'elevation_failed',
        'No elevation command available',
        command,
        args
      );
      const endTime = new Date();
      return this.createErrorResult(error, command, args, startTime, endTime);
    }

    const fullCommand = this.buildFullCommand(command, args, options);
    const elevatedArgs = [...elevationCommand.args, fullCommand];
    
    return this.executeWithSpawn(elevationCommand.command, elevatedArgs, options, startTime);
  }

  // Helper methods

  protected resolveOptions(options: CommandExecutionOptions): Required<CommandExecutionOptions> {
    return {
      mode: options.mode || 'exec',
      timeout: options.timeout || 30000,
      workingDirectory: options.workingDirectory || process.cwd(),
      environment: options.environment || {},
      inheritEnvironment: options.inheritEnvironment !== false,
      shell: options.shell || false,
      elevated: options.elevated || false,
      input: options.input || '',
      encoding: options.encoding || 'utf8',
      separateStderr: options.separateStderr !== false,
      maxBuffer: options.maxBuffer || 1024 * 1024, // 1MB
      killSignal: options.killSignal || 'SIGTERM',
      onProgress: options.onProgress || (() => {}),
      onError: options.onError || (() => {}),
      silent: options.silent || false,
      context: options.context || {},
    };
  }

  protected buildFullCommand(command: string, args: string[]): string {
    const escapedCommand = this.platformAdapter.escapeCommand(command);
    const escapedArgs = this.platformAdapter.escapeArguments(args);
    return `${escapedCommand} ${escapedArgs.join(' ')}`.trim();
  }

  protected buildExecOptions(options: CommandExecutionOptions) {
    const environment = this.platformAdapter.prepareEnvironment(
      options.inheritEnvironment ? process.env as Record<string, string> : {},
      options.environment
    );

    return {
      timeout: options.timeout,
      cwd: options.workingDirectory,
      env: environment,
      encoding: options.encoding as BufferEncoding,
      maxBuffer: options.maxBuffer,
      killSignal: options.killSignal,
    };
  }

  protected buildSpawnOptions(options: CommandExecutionOptions) {
    const environment = this.platformAdapter.prepareEnvironment(
      options.inheritEnvironment ? process.env as Record<string, string> : {},
      options.environment
    );

    return {
      cwd: options.workingDirectory,
      env: environment,
      stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe'],
      shell: false, // We handle shell execution separately
    };
  }

  protected parseCommandLine(commandLine: string): string[] {
    // Simple command line parsing - can be enhanced for more complex cases
    return commandLine.trim().split(/\s+/);
  }

  protected classifyExecError(error: { code?: string | number; signal?: NodeJS.Signals }): CommandExecutionErrorType {
    if (error.code === 'ENOENT') return 'command_not_found';
    if (error.code === 'EACCES') return 'permission_denied';
    if (error.code === 'ETIMEDOUT') return 'timeout';
    if (error.signal) return 'killed';
    return 'unknown_error';
  }

  protected createError(
    type: CommandExecutionErrorType,
    message: string,
    command: string,
    args: string[],
    metadata: Record<string, unknown> = {}
  ): CommandExecutionError {
    const error = new Error(message) as CommandExecutionError;
    error.type = type;
    error.command = command;
    error.args = args;
    error.exitCode = metadata.exitCode as number;
    error.signal = metadata.signal as NodeJS.Signals;
    error.stdout = metadata.stdout as string;
    error.stderr = metadata.stderr as string;
    error.workingDirectory = metadata.workingDirectory as string;
    error.recoverable = this.isRecoverableError(type);
    error.suggestions = this.getErrorSuggestions(type, command);
    error.cause = metadata.originalError as Error;
    error.timestamp = new Date();
    
    return error;
  }

  protected createSuccessResult(
    command: string,
    args: string[],
    stdout: string,
    stderr: string,
    exitCode: number,
    startTime: Date,
    endTime: Date,
    options: CommandExecutionOptions,
    metadata: Record<string, unknown> = {}
  ): CommandExecutionResult {
    return {
      success: exitCode === 0,
      exitCode,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      output: `${stdout}${stderr}`.trim(),
      duration: endTime.getTime() - startTime.getTime(),
      command,
      args,
      workingDirectory: options.workingDirectory,
      environment: options.environment,
      platform: this.platform,
      pid: metadata.pid as number,
      signal: metadata.signal as NodeJS.Signals,
      timedOut: metadata.timedOut as boolean || false,
      startTime,
      endTime,
      metadata,
    };
  }

  protected createErrorResult(
    error: CommandExecutionError,
    command: string,
    args: string[],
    startTime: Date,
    endTime: Date
  ): CommandExecutionResult {
    return {
      success: false,
      exitCode: error.exitCode || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      output: error.stderr || error.message,
      duration: endTime.getTime() - startTime.getTime(),
      command,
      args,
      workingDirectory: error.workingDirectory,
      environment: {},
      platform: this.platform,
      timedOut: error.type === 'timeout',
      startTime,
      endTime,
      metadata: { error },
    };
  }

  protected isRecoverableError(type: CommandExecutionErrorType): boolean {
    switch (type) {
      case 'timeout':
      case 'killed':
      case 'environment_error':
        return true;
      case 'command_not_found':
      case 'permission_denied':
      case 'elevation_failed':
      case 'working_directory_not_found':
        return false;
      default:
        return false;
    }
  }

  protected getErrorSuggestions(type: CommandExecutionErrorType, command: string): string[] {
    switch (type) {
      case 'command_not_found':
        return [
          `Install the '${command}' command`,
          'Check if the command is in your PATH',
          'Verify the command name is correct',
        ];
      case 'permission_denied':
        return [
          'Run with elevated privileges',
          'Check file/directory permissions',
          'Ensure you have execute permissions',
        ];
      case 'timeout':
        return [
          'Increase the timeout value',
          'Check if the command is hanging',
          'Verify network connectivity if applicable',
        ];
      case 'elevation_failed':
        return [
          'Run as administrator/root',
          'Check elevation permissions',
          'Use platform-specific elevation commands',
        ];
      default:
        return ['Check the command and try again'];
    }
  }
} 