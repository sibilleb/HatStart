/**
 * Base Installer Class
 * Provides common functionality for all platform-specific installers
 */

import { ChildProcess, exec, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { promisify } from 'util';
import type { InstallationCommand, Platform, ToolCategory } from '../shared/manifest-types.js';
import { CategoryInstaller, type ICategoryInstaller } from './category-installer.js';
import type {
    CommandExecutionResult,
    IInstaller,
    InstallationError,
    InstallationErrorType,
    InstallationOptions,
    InstallationProgress,
    InstallationResult,
    InstallationStatus,
    InstallerCapabilities
} from './installer-types.js';

const execAsync = promisify(exec);

/**
 * Abstract base class for all installers
 */
export abstract class BaseInstaller extends EventEmitter implements IInstaller {
  public abstract readonly platform: Platform;
  public abstract readonly capabilities: InstallerCapabilities;

  protected readonly activeInstallations = new Map<string, {
    process?: ChildProcess;
    startTime: Date;
    progress: InstallationProgress;
    options: InstallationOptions;
  }>();

  // Category installer for handling tool-specific logic
  protected readonly categoryInstaller: ICategoryInstaller;

  constructor() {
    super();
    this.categoryInstaller = new CategoryInstaller();
  }

  /**
   * Check if the installer can handle the given installation command
   */
  public abstract canHandle(command: InstallationCommand): boolean;

  /**
   * Install a tool using the provided installation command
   */
  public async install(
    command: InstallationCommand,
    options: InstallationOptions = {},
    category?: ToolCategory
  ): Promise<InstallationResult> {
    const startTime = new Date();
    const toolId = this.generateToolId(command);
    
    try {
      // Initialize installation tracking
      this.initializeInstallation(toolId, command, options, startTime);

      // Validate installation command
      this.validateInstallationCommand(command);

      // Enhance command with category-specific logic
      let enhancedCommand = command;
      if (category) {
        enhancedCommand = this.categoryInstaller.enhanceInstallationCommand(command, category, options);
      }

      // Check if already installed (unless force is specified)
      if (!options.force && await this.isAlreadyInstalled(enhancedCommand)) {
        return this.createSuccessResult(enhancedCommand, startTime, 'skipped', 'Tool already installed');
      }

      // Execute category-specific pre-installation steps
      if (category) {
        await this.categoryInstaller.executePreInstallationSteps(enhancedCommand, category, options);
      }

      // Execute pre-installation steps
      await this.executePreInstallation(enhancedCommand, options);

      // Execute main installation
      await this.executeInstallation(enhancedCommand, options);

      // Execute post-installation steps
      await this.executePostInstallation(enhancedCommand, options);

      // Execute category-specific post-installation steps
      if (category) {
        await this.categoryInstaller.executePostInstallationSteps(enhancedCommand, category, options);
      }

      // Verify installation (unless skipped)
      let verification: { success: boolean; details?: string } | undefined;
      if (!options.skipVerification) {
        let verified = await this.verify(enhancedCommand, options);
        
        // Additional category-specific verification
        if (category && verified) {
          verified = await this.categoryInstaller.verifyCategoryInstallation(enhancedCommand, category, options);
        }
        
        verification = { success: verified };
        if (!verified) {
          verification.details = 'Installation verification failed';
          throw new Error('Installation verification failed');
        }
      }

      // Clean up and return success result
      this.cleanupInstallation(toolId);
      return this.createSuccessResult(enhancedCommand, startTime, 'completed', undefined, verification);

    } catch (error) {
      this.cleanupInstallation(toolId);
      return this.createErrorResult(command, startTime, error);
    }
  }

  /**
   * Verify that a tool is properly installed
   */
  public async verify(
    command: InstallationCommand,
    options: InstallationOptions = {}
  ): Promise<boolean> {
    try {
      if (command.verifyCommand) {
        const result = await this.executeCommand(
          command.verifyCommand,
          [],
          {
            timeout: options.timeout || 30000,
            workingDirectory: options.workingDirectory,
            environment: options.environment
          }
        );

        if (command.verifyPattern && result.stdout) {
          const pattern = new RegExp(command.verifyPattern);
          return pattern.test(result.stdout);
        }

        return result.success;
      }

      // Fallback to basic command existence check
      return await this.checkCommandExists(command.command);
    } catch {
      return false;
    }
  }

  /**
   * Get installation status for a tool
   */
  public async getInstallationStatus(toolId: string): Promise<InstallationStatus> {
    const installation = this.activeInstallations.get(toolId);
    return installation?.progress.status || 'pending';
  }

  /**
   * Cancel an ongoing installation
   */
  public async cancelInstallation(toolId: string): Promise<boolean> {
    const installation = this.activeInstallations.get(toolId);
    if (!installation) {
      return false;
    }

    try {
      if (installation.process) {
        installation.process.kill('SIGTERM');
      }
      
      installation.progress.status = 'cancelled';
      this.emitProgress(toolId, installation.progress);
      this.cleanupInstallation(toolId);
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get detailed information about an installation
   */
  public async getInstallationInfo(toolId: string): Promise<InstallationResult | null> {
    const installation = this.activeInstallations.get(toolId);
    if (!installation) {
      return null;
    }

    // Create a partial result for ongoing installations
    return {
      success: installation.progress.status === 'completed',
      status: installation.progress.status,
      toolId,
      toolName: installation.progress.toolName,
      method: 'package-manager', // This would be determined from the command
      platform: this.platform,
      duration: Date.now() - installation.startTime.getTime(),
      errors: [],
      warnings: [],
      startTime: installation.startTime,
      endTime: new Date() // Temporary end time for ongoing installations
    };
  }

  /**
   * Execute a command with proper error handling and logging
   */
  protected async executeCommand(
    command: string,
    args: string[] = [],
    options: {
      timeout?: number;
      workingDirectory?: string;
      environment?: Record<string, string>;
      elevated?: boolean;
    } = {}
  ): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;

    try {
      const execOptions = {
        timeout: options.timeout || 60000,
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environment },
        encoding: 'utf8' as const
      };

      const { stdout, stderr } = await execAsync(fullCommand, execOptions);
      const duration = Date.now() - startTime;

      return {
        exitCode: 0,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        duration,
        success: true,
        command,
        args,
        workingDirectory: options.workingDirectory
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const execError = error as { code?: number; stdout?: string; stderr?: string; message?: string };
      
      return {
        exitCode: execError.code || 1,
        stdout: execError.stdout?.toString() || '',
        stderr: execError.stderr?.toString() || execError.message || 'Unknown error',
        duration,
        success: false,
        command,
        args,
        workingDirectory: options.workingDirectory
      };
    }
  }

  /**
   * Execute a command with real-time progress tracking
   */
  protected async executeCommandWithProgress(
    command: string,
    args: string[],
    toolId: string,
    options: {
      timeout?: number;
      workingDirectory?: string;
      environment?: Record<string, string>;
      onOutput?: (data: string) => void;
    } = {}
  ): Promise<CommandExecutionResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const installation = this.activeInstallations.get(toolId);

      const childProcess = spawn(command, args, {
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environment },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Store process reference for cancellation
      if (installation) {
        installation.process = childProcess;
      }

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        options.onOutput?.(output);
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        options.onOutput?.(output);
      });

      childProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
          duration,
          success: code === 0,
          command,
          args,
          workingDirectory: options.workingDirectory
        });
      });

      childProcess.on('error', (error) => {
        const duration = Date.now() - startTime;
        
        resolve({
          exitCode: 1,
          stdout,
          stderr: error.message,
          duration,
          success: false,
          command,
          args,
          workingDirectory: options.workingDirectory
        });
      });

      // Set timeout if specified
      if (options.timeout) {
        setTimeout(() => {
          childProcess.kill('SIGTERM');
          reject(new Error(`Command timeout after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  /**
   * Check if a command exists on the system
   */
  protected async checkCommandExists(command: string): Promise<boolean> {
    try {
      const baseCommand = command.split(' ')[0];
      const whichCommand = this.platform === 'windows' ? `where ${baseCommand}` : `which ${baseCommand}`;
      
      const result = await this.executeCommand(whichCommand, [], { timeout: 5000 });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Create installation progress object
   */
  protected createProgress(
    toolId: string,
    toolName: string,
    status: InstallationStatus,
    currentStep: string,
    completedSteps: number,
    totalSteps: number,
    details?: string
  ): InstallationProgress {
    const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    return {
      status,
      currentStep,
      percentage,
      completedSteps,
      totalSteps,
      toolName,
      toolId,
      details
    };
  }

  /**
   * Emit progress update
   */
  protected emitProgress(toolId: string, progress: InstallationProgress): void {
    const installation = this.activeInstallations.get(toolId);
    if (installation) {
      installation.progress = progress;
      installation.options.onProgress?.(progress);
      this.emit('progress', progress);
    }
  }

  /**
   * Create error object
   */
  protected createError(
    type: InstallationErrorType,
    message: string,
    details?: string,
    command?: string,
    exitCode?: number,
    stderr?: string,
    stdout?: string,
    recoverable: boolean = false
  ): InstallationError {
    return {
      type,
      message,
      details,
      command,
      exitCode,
      stderr,
      stdout,
      suggestions: this.getErrorSuggestions(type),
      recoverable,
      timestamp: new Date()
    };
  }

  /**
   * Abstract methods that must be implemented by platform-specific installers
   */
  protected abstract executeInstallation(
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void>;

  protected abstract isAlreadyInstalled(command: InstallationCommand): Promise<boolean>;

  /**
   * Protected helper methods
   */
  protected async executePreInstallation(
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void> {
    if (command.preInstall && command.preInstall.length > 0) {
      for (const preCommand of command.preInstall) {
        await this.executeCommand(preCommand, [], {
          timeout: options.timeout,
          workingDirectory: options.workingDirectory,
          environment: options.environment
        });
      }
    }
  }

  protected async executePostInstallation(
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void> {
    if (command.postInstall && command.postInstall.length > 0) {
      for (const postCommand of command.postInstall) {
        await this.executeCommand(postCommand, [], {
          timeout: options.timeout,
          workingDirectory: options.workingDirectory,
          environment: options.environment
        });
      }
    }
  }

  protected validateInstallationCommand(command: InstallationCommand): void {
    if (!command.command) {
      throw this.createError(
        'command_failed',
        'Installation command is required',
        'No command specified in installation command',
        command.command
      );
    }
    
    if (command.platform !== this.platform) {
      throw this.createError(
        'platform_unsupported',
        `Platform mismatch: expected ${this.platform}, got ${command.platform}`,
        `This installer only supports ${this.platform} platform`,
        command.command
      );
    }

    if (!this.capabilities.supportedMethods.includes(command.method)) {
      throw this.createError(
        'platform_unsupported',
        `Unsupported installation method: ${command.method}`,
        `Method '${command.method}' is not supported on ${this.platform}`,
        command.command
      );
    }
  }

  protected generateToolId(command: InstallationCommand): string {
    return `${command.platform}-${command.method}-${Date.now()}`;
  }

  protected initializeInstallation(
    toolId: string,
    command: InstallationCommand,
    options: InstallationOptions,
    startTime: Date
  ): void {
    const progress = this.createProgress(
      toolId,
      command.command, // Use command as tool name for now
      'pending',
      'Initializing installation',
      0,
      5
    );

    this.activeInstallations.set(toolId, {
      startTime,
      progress,
      options
    });

    this.emitProgress(toolId, progress);
  }

  protected cleanupInstallation(toolId: string): void {
    this.activeInstallations.delete(toolId);
  }

  protected createSuccessResult(
    command: InstallationCommand,
    startTime: Date,
    status: InstallationStatus = 'completed',
    details?: string,
    verification?: { success: boolean; details?: string }
  ): InstallationResult {
    return {
      success: true,
      status,
      toolId: this.generateToolId(command),
      toolName: command.command,
      method: command.method,
      platform: command.platform,
      architecture: command.architecture,
      duration: Date.now() - startTime.getTime(),
      errors: [],
      warnings: [],
      metadata: details ? { details } : undefined,
      verification,
      startTime,
      endTime: new Date()
    };
  }

  protected createErrorResult(
    command: InstallationCommand,
    startTime: Date,
    error: unknown
  ): InstallationResult {
    let installationError: InstallationError;

    // Check if the error is already an InstallationError
    if (error && typeof error === 'object' && 'type' in error && 'message' in error && 'timestamp' in error) {
      installationError = error as InstallationError;
    } else {
      // Convert generic error to InstallationError
      const errorObj = error as { message?: string; stack?: string; code?: number; stderr?: string; stdout?: string };
      installationError = this.createError(
        'unknown_error',
        errorObj.message || 'Installation failed',
        errorObj.stack,
        command.command,
        errorObj.code,
        errorObj.stderr,
        errorObj.stdout
      );
    }

    return {
      success: false,
      status: 'failed',
      toolId: this.generateToolId(command),
      toolName: command.command,
      method: command.method,
      platform: command.platform,
      architecture: command.architecture,
      duration: Date.now() - startTime.getTime(),
      errors: [installationError],
      warnings: [],
      startTime,
      endTime: new Date()
    };
  }

  protected getErrorSuggestions(type: InstallationErrorType): string[] {
    const suggestions: Record<InstallationErrorType, string[]> = {
      network_error: [
        'Check your internet connection',
        'Try again later',
        'Check if the download URL is accessible'
      ],
      permission_denied: [
        'Run the installer with administrator/sudo privileges',
        'Check file permissions',
        'Ensure you have write access to the installation directory'
      ],
      insufficient_space: [
        'Free up disk space',
        'Choose a different installation directory',
        'Clean up temporary files'
      ],
      dependency_missing: [
        'Install required dependencies first',
        'Check system requirements',
        'Update your package manager'
      ],
      command_failed: [
        'Check if the command exists',
        'Verify command syntax',
        'Check system PATH environment variable'
      ],
      verification_failed: [
        'Check if the tool was installed correctly',
        'Verify installation path',
        'Try reinstalling the tool'
      ],
      user_cancelled: [
        'Installation was cancelled by user'
      ],
      platform_unsupported: [
        'This tool is not supported on your platform',
        'Check for alternative tools',
        'Contact the tool maintainer'
      ],
      unknown_error: [
        'Check the error details',
        'Try the installation again',
        'Contact support if the problem persists'
      ]
    };

    return suggestions[type] || suggestions.unknown_error;
  }
} 