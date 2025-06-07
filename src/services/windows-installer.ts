/**
 * Windows Installer Class
 * Implements Windows-specific installation methods including winget, chocolatey, scoop, MSI, and EXE
 */

import { existsSync } from 'fs';
import { join } from 'path';
import type { InstallationCommand, Platform } from '../shared/manifest-types.js';
import { BaseInstaller } from './base-installer.js';
import type {
  InstallationErrorType,
  InstallationOptions,
  InstallationProgress,
  InstallerCapabilities
} from './installer-types.js';

/**
 * Windows-specific installer implementation
 */
export class WindowsInstaller extends BaseInstaller {
  public readonly platform: Platform = 'windows';
  
  public readonly capabilities: InstallerCapabilities = {
    supportedMethods: ['winget', 'chocolatey', 'scoop', 'direct-download', 'script'],
    supportsElevation: true,
    supportsProgress: true,
    supportsVerification: true,
    supportsRollback: false,
    supportsCancel: true,
    supportsParallelInstallation: false,
    supportedArchitectures: ['x64', 'x86', 'arm64']
  };

  /**
   * Check if this installer can handle the given installation command
   */
  public canHandle(command: InstallationCommand): boolean {
    if (command.platform !== 'windows') {
      return false;
    }

    return this.capabilities.supportedMethods.includes(command.method);
  }

  /**
   * Execute the installation process
   */
  protected async executeInstallation(
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void> {
    const toolId = this.generateToolId(command);
    
    try {
      // Update progress
      this.updateProgress(toolId, {
        status: 'installing',
        percentage: 10,
        currentStep: 'Preparing installation',
        totalSteps: 5
      });

      // Execute installation based on method
      switch (command.method) {
        case 'winget':
          await this.installViaWinget(command, options, toolId);
          break;
        case 'chocolatey':
          await this.installViaChocolatey(command, options, toolId);
          break;
        case 'scoop':
          await this.installViaScoop(command, options, toolId);
          break;
        case 'direct-download':
          await this.installViaDirectDownload(command, options, toolId);
          break;
        case 'script':
          await this.installViaScript(command, options, toolId);
          break;
        default:
          throw this.createInstallationError(
            'platform_unsupported',
            `Unsupported installation method: ${command.method}`,
            command
          );
      }

      // Update progress to completion
      this.updateProgress(toolId, {
        status: 'completed',
        percentage: 100,
        currentStep: 'Installation completed',
        totalSteps: 5
      });

    } catch (error) {
      this.updateProgress(toolId, {
        status: 'failed',
        percentage: 0,
        currentStep: 'Installation failed',
        totalSteps: 5,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check if the tool is already installed
   */
  protected async isAlreadyInstalled(command: InstallationCommand): Promise<boolean> {
    if (!command.verifyCommand) {
      return false;
    }

    try {
      const result = await this.executeCommand(command.verifyCommand, [], { timeout: 10000 });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Install via Windows Package Manager (winget)
   */
  private async installViaWinget(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    // Check if winget is available
    const wingetAvailable = await this.checkCommandExists('winget');
    if (!wingetAvailable) {
      throw this.createInstallationError(
        'dependency_missing',
        'Windows Package Manager (winget) is not available. Please install it from the Microsoft Store.',
        command
      );
    }

    this.updateProgress(toolId, {
      status: 'installing',
      percentage: 30,
      currentStep: 'Installing via winget',
      totalSteps: 5
    });

    // Build winget command
    const args = command.args || [];
    const wingetArgs = ['install', ...args];
    
    // Add common flags
    if (!options.interactive) {
      wingetArgs.push('--silent');
    }
    
    if (options.force) {
      wingetArgs.push('--force');
    }

    // Execute winget install
    const result = await this.executeCommandWithProgress(
      'winget',
      wingetArgs,
      toolId,
      {
        timeout: options.timeout || 300000, // 5 minutes default
        workingDirectory: options.workingDirectory,
        environment: options.environment,
        onOutput: (data) => {
          // Parse winget output for progress if possible
          if (data.includes('Successfully installed')) {
            this.updateProgress(toolId, {
              status: 'installing',
              percentage: 90,
              currentStep: 'Finalizing installation',
              totalSteps: 5
            });
          }
        }
      }
    );

    if (!result.success) {
      throw this.createInstallationError(
        'command_failed',
        `Winget installation failed: ${result.stderr}`,
        command,
        { exitCode: result.exitCode, output: result.stderr }
      );
    }
  }

  /**
   * Install via Chocolatey
   */
  private async installViaChocolatey(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    // Check if chocolatey is available
    const chocoAvailable = await this.checkCommandExists('choco');
    if (!chocoAvailable) {
      throw this.createInstallationError(
        'dependency_missing',
        'Chocolatey is not installed. Please install it from https://chocolatey.org/install',
        command
      );
    }

    this.updateProgress(toolId, {
      status: 'installing',
      percentage: 30,
      currentStep: 'Installing via Chocolatey',
      totalSteps: 5
    });

    // Build chocolatey command
    const args = command.args || [];
    const chocoArgs = ['install', ...args];
    
    // Add common flags
    if (!options.interactive) {
      chocoArgs.push('-y'); // Accept all prompts
    }
    
    if (options.force) {
      chocoArgs.push('--force');
    }

    // Execute chocolatey install
    const result = await this.executeCommandWithProgress(
      'choco',
      chocoArgs,
      toolId,
      {
        timeout: options.timeout || 600000, // 10 minutes default
        workingDirectory: options.workingDirectory,
        environment: options.environment,
        onOutput: (data) => {
          // Parse chocolatey output for progress
          if (data.includes('Chocolatey installed')) {
            this.updateProgress(toolId, {
              status: 'installing',
              percentage: 90,
              currentStep: 'Finalizing installation',
              totalSteps: 5
            });
          }
        }
      }
    );

    if (!result.success) {
      throw this.createInstallationError(
        'command_failed',
        `Chocolatey installation failed: ${result.stderr}`,
        command,
        { exitCode: result.exitCode, output: result.stderr }
      );
    }
  }

  /**
   * Install via Scoop
   */
  private async installViaScoop(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    // Check if scoop is available
    const scoopAvailable = await this.checkCommandExists('scoop');
    if (!scoopAvailable) {
      throw this.createInstallationError(
        'dependency_missing',
        'Scoop is not installed. Please install it from https://scoop.sh/',
        command
      );
    }

    this.updateProgress(toolId, {
      status: 'installing',
      percentage: 30,
      currentStep: 'Installing via Scoop',
      totalSteps: 5
    });

    // Build scoop command
    const args = command.args || [];
    const scoopArgs = ['install', ...args];

    // Execute scoop install
    const result = await this.executeCommandWithProgress(
      'scoop',
      scoopArgs,
      toolId,
      {
        timeout: options.timeout || 300000, // 5 minutes default
        workingDirectory: options.workingDirectory,
        environment: options.environment,
        onOutput: (data) => {
          // Parse scoop output for progress
          if (data.includes('was installed successfully')) {
            this.updateProgress(toolId, {
              status: 'installing',
              percentage: 90,
              currentStep: 'Finalizing installation',
              totalSteps: 5
            });
          }
        }
      }
    );

    if (!result.success) {
      throw this.createInstallationError(
        'command_failed',
        `Scoop installation failed: ${result.stderr}`,
        command,
        { exitCode: result.exitCode, output: result.stderr }
      );
    }
  }

  /**
   * Install via direct download (MSI/EXE)
   */
  private async installViaDirectDownload(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    if (!command.downloadUrl) {
      throw this.createInstallationError(
        'command_failed',
        'Download URL is required for direct download installation',
        command
      );
    }

    this.updateProgress(toolId, {
      status: 'downloading',
      percentage: 20,
      currentStep: 'Downloading installer',
      totalSteps: 5
    });

    // Download the installer
    const downloadPath = await this.downloadFile(command.downloadUrl, options);

    this.updateProgress(toolId, {
      status: 'installing',
      percentage: 60,
      currentStep: 'Running installer',
      totalSteps: 5
    });

    // Determine installer type and execute
    const fileExtension = downloadPath.toLowerCase().split('.').pop();
    let result;

    if (fileExtension === 'msi') {
      result = await this.executeMsiInstaller(downloadPath, command, options, toolId);
    } else if (fileExtension === 'exe') {
      result = await this.executeExeInstaller(downloadPath, command, options, toolId);
    } else {
      throw this.createInstallationError(
        'command_failed',
        `Unsupported installer type: ${fileExtension}`,
        command
      );
    }

    if (!result.success) {
      throw this.createInstallationError(
        'command_failed',
        `Direct download installation failed: ${result.stderr}`,
        command,
        { exitCode: result.exitCode, output: result.stderr }
      );
    }
  }

  /**
   * Install via PowerShell script
   */
  private async installViaScript(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    this.updateProgress(toolId, {
      status: 'installing',
      percentage: 30,
      currentStep: 'Executing installation script',
      totalSteps: 5
    });

    // Execute PowerShell script
    const scriptCommand = command.command;
    const args = command.args || [];

    const result = await this.executeCommandWithProgress(
      'powershell',
      ['-ExecutionPolicy', 'Bypass', '-Command', scriptCommand, ...args],
      toolId,
      {
        timeout: options.timeout || 600000, // 10 minutes default
        workingDirectory: options.workingDirectory,
        environment: options.environment
      }
    );

    if (!result.success) {
      throw this.createInstallationError(
        'command_failed',
        `Script installation failed: ${result.stderr}`,
        command,
        { exitCode: result.exitCode, output: result.stderr }
      );
    }
  }

  /**
   * Download a file from URL
   */
  private async downloadFile(
    url: string,
    options: InstallationOptions
  ): Promise<string> {
    // Use PowerShell to download the file
    const tempDir = process.env.TEMP || 'C:\\temp';
    const fileName = url.split('/').pop() || 'installer.exe';
    const downloadPath = join(tempDir, fileName);

    const downloadCommand = `
      $ProgressPreference = 'SilentlyContinue'
      Invoke-WebRequest -Uri "${url}" -OutFile "${downloadPath}"
    `;

    const result = await this.executeCommand(
      'powershell',
      ['-ExecutionPolicy', 'Bypass', '-Command', downloadCommand],
      {
        timeout: options.timeout || 300000, // 5 minutes for download
        workingDirectory: options.workingDirectory,
        environment: options.environment
      }
    );

    if (!result.success || !existsSync(downloadPath)) {
      throw this.createInstallationError(
        'network_error',
        `Failed to download installer from ${url}: ${result.stderr}`,
        { method: 'direct-download', platform: 'windows', command: '', downloadUrl: url }
      );
    }

    return downloadPath;
  }

  /**
   * Execute MSI installer
   */
  private async executeMsiInstaller(
    installerPath: string,
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ) {
    const msiArgs = ['/i', `"${installerPath}"`];
    
    // Add silent installation flags if not interactive
    if (!options.interactive) {
      msiArgs.push('/quiet', '/norestart');
    }

    // Add any additional MSI arguments
    if (command.args) {
      msiArgs.push(...command.args);
    }

    return this.executeCommandWithProgress(
      'msiexec',
      msiArgs,
      toolId,
      {
        timeout: options.timeout || 600000, // 10 minutes default
        workingDirectory: options.workingDirectory,
        environment: options.environment
      }
    );
  }

  /**
   * Execute EXE installer
   */
  private async executeExeInstaller(
    installerPath: string,
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ) {
    const exeArgs = command.args || [];
    
    // Add silent installation flags if not interactive
    if (!options.interactive) {
      // Common silent flags for EXE installers
      if (!exeArgs.some(arg => arg.includes('/S') || arg.includes('/silent'))) {
        exeArgs.push('/S'); // Most common silent flag
      }
    }

    return this.executeCommandWithProgress(
      `"${installerPath}"`,
      exeArgs,
      toolId,
      {
        timeout: options.timeout || 600000, // 10 minutes default
        workingDirectory: options.workingDirectory,
        environment: options.environment
      }
    );
  }

  /**
   * Generate a unique tool ID for tracking
   */
  protected generateToolId(command: InstallationCommand): string {
    const packageName = command.args?.[0] || command.command || 'unknown';
    return `windows-${command.method}-${packageName}-${Date.now()}`;
  }

  /**
   * Update installation progress
   */
  private updateProgress(toolId: string, progress: Partial<InstallationProgress>): void {
    const installation = this.activeInstallations.get(toolId);
    if (installation) {
      Object.assign(installation.progress, progress);
      this.emit('progress', toolId, installation.progress);
    }
  }

  /**
   * Create a standardized installation error
   */
  private createInstallationError(
    type: InstallationErrorType,
    message: string,
    command: InstallationCommand,
    metadata?: Record<string, unknown>
  ): Error {
    const error = new Error(message) as Error & {
      type: InstallationErrorType;
      command: InstallationCommand;
      metadata?: Record<string, unknown>;
    };
    
    error.type = type;
    error.command = command;
    error.metadata = metadata;
    
    return error;
  }
} 