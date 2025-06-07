/**
 * macOS Installer Class
 * Implements macOS-specific installation methods including homebrew, PKG, DMG, and direct downloads
 */

import { existsSync } from 'fs';
import { join } from 'path';
import type { InstallationCommand, Platform } from '../shared/manifest-types.js';
import { BaseInstaller } from './base-installer.js';
import type {
  InstallationOptions,
  InstallerCapabilities
} from './installer-types.js';

/**
 * macOS-specific installer implementation
 */
export class MacOSInstaller extends BaseInstaller {
  public readonly platform: Platform = 'macos';
  
  public readonly capabilities: InstallerCapabilities = {
    supportedMethods: ['homebrew', 'direct-download', 'script', 'package-manager'],
    supportsElevation: true,
    supportsProgress: true,
    supportsVerification: true,
    supportsRollback: false,
    supportsCancel: true,
    supportsParallelInstallation: false,
    supportedArchitectures: ['x64', 'arm64']
  };

  /**
   * Check if this installer can handle the given installation command
   */
  public canHandle(command: InstallationCommand): boolean {
    if (command.platform !== 'macos') {
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
      const initialProgress = this.createProgress(
        toolId,
        command.command,
        'installing',
        'Preparing installation',
        0,
        5
      );
      this.emitProgress(toolId, initialProgress);

      // Execute installation based on method
      switch (command.method) {
        case 'homebrew':
          await this.installViaHomebrew(command, options, toolId);
          break;
        case 'direct-download':
          await this.installViaDirectDownload(command, options, toolId);
          break;
        case 'script':
          await this.installViaScript(command, options, toolId);
          break;
        case 'package-manager':
          await this.installViaPackageManager(command, options, toolId);
          break;
        default:
          throw this.createError(
            'platform_unsupported',
            `Unsupported installation method: ${command.method}`,
            `Method '${command.method}' is not supported on macOS`,
            command.command
          );
      }

      // Update progress to completion
      const completedProgress = this.createProgress(
        toolId,
        command.command,
        'completed',
        'Installation completed',
        5,
        5
      );
      this.emitProgress(toolId, completedProgress);

    } catch (error) {
      const failedProgress = this.createProgress(
        toolId,
        command.command,
        'failed',
        'Installation failed',
        0,
        5,
        error instanceof Error ? error.message : 'Unknown error'
      );
      this.emitProgress(toolId, failedProgress);
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
   * Install via Homebrew
   */
  private async installViaHomebrew(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    // Check if homebrew is available
    const brewAvailable = await this.checkCommandExists('brew');
    if (!brewAvailable) {
      throw this.createError(
        'dependency_missing',
        'Homebrew is not installed. Please install it from https://brew.sh/',
        'Homebrew is required for this installation method',
        command.command
      );
    }

    const progress = this.createProgress(
      toolId,
      command.command,
      'installing',
      'Installing via Homebrew',
      1,
      5
    );
    this.emitProgress(toolId, progress);

    // Build brew command
    const args = command.args || [];
    const brewArgs = ['install', ...args];
    
    // Add common flags
    if (options.force) {
      brewArgs.push('--force');
    }

    // Execute brew install
    const result = await this.executeCommandWithProgress(
      'brew',
      brewArgs,
      toolId,
      {
        timeout: options.timeout || 600000, // 10 minutes default for homebrew
        workingDirectory: options.workingDirectory,
        environment: options.environment,
        onOutput: (data) => {
          // Parse homebrew output for progress
          if (data.includes('Downloading')) {
            const downloadProgress = this.createProgress(
              toolId,
              command.command,
              'installing',
              'Downloading package',
              2,
              5
            );
            this.emitProgress(toolId, downloadProgress);
          } else if (data.includes('Installing')) {
            const installProgress = this.createProgress(
              toolId,
              command.command,
              'installing',
              'Installing package',
              3,
              5
            );
            this.emitProgress(toolId, installProgress);
          } else if (data.includes('was successfully installed') || data.includes('already installed')) {
            const finalProgress = this.createProgress(
              toolId,
              command.command,
              'installing',
              'Finalizing installation',
              4,
              5
            );
            this.emitProgress(toolId, finalProgress);
          }
        }
      }
    );

    if (!result.success) {
      throw this.createError(
        'command_failed',
        `Homebrew installation failed: ${result.stderr}`,
        result.stderr || 'Unknown error during homebrew installation',
        `brew ${brewArgs.join(' ')}`,
        result.exitCode,
        result.stderr,
        result.stdout
      );
    }
  }

  /**
   * Install via direct download (PKG, DMG, ZIP, TAR)
   */
  private async installViaDirectDownload(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    if (!command.downloadUrl) {
      throw this.createError(
        'command_failed',
        'Download URL is required for direct download installation',
        'No download URL provided in installation command',
        command.command
      );
    }

    const downloadProgress = this.createProgress(
      toolId,
      command.command,
      'installing',
      'Downloading installer',
      1,
      5
    );
    this.emitProgress(toolId, downloadProgress);

    // Download the installer
    const installerPath = await this.downloadFile(command.downloadUrl, options);

    const installProgress = this.createProgress(
      toolId,
      command.command,
      'installing',
      'Installing downloaded package',
      3,
      5
    );
    this.emitProgress(toolId, installProgress);

    // Determine installer type and execute
    const fileExtension = command.downloadUrl.split('.').pop()?.toLowerCase();
    
    switch (fileExtension) {
      case 'pkg':
        await this.executePkgInstaller(installerPath, command, options);
        break;
      case 'dmg':
        await this.executeDmgInstaller(installerPath, command, options);
        break;
      case 'zip':
      case 'tar':
      case 'gz':
        await this.executeArchiveInstaller(installerPath, command, options);
        break;
      default:
        throw this.createError(
          'command_failed',
          `Unsupported installer file type: ${fileExtension}`,
          `File extension '${fileExtension}' is not supported for macOS installation`,
          command.command
        );
    }
  }

  /**
   * Install via shell script
   */
  private async installViaScript(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    const progress = this.createProgress(
      toolId,
      command.command,
      'installing',
      'Executing installation script',
      1,
      5
    );
    this.emitProgress(toolId, progress);

    // Build script command
    const args = command.args || [];
    const scriptArgs = ['-c', command.command, ...args];

    // Execute script with bash
    const result = await this.executeCommandWithProgress(
      '/bin/bash',
      scriptArgs,
      toolId,
      {
        timeout: options.timeout || 300000, // 5 minutes default
        workingDirectory: options.workingDirectory,
        environment: options.environment,
        onOutput: (data) => {
          // Update progress based on script output
          if (data.includes('Installing') || data.includes('Downloading')) {
            const scriptProgress = this.createProgress(
              toolId,
              command.command,
              'installing',
              'Running installation script',
              3,
              5
            );
            this.emitProgress(toolId, scriptProgress);
          }
        }
      }
    );

    if (!result.success) {
      throw this.createError(
        'command_failed',
        `Script installation failed: ${result.stderr}`,
        result.stderr || 'Unknown error during script execution',
        `/bin/bash -c ${command.command}`,
        result.exitCode,
        result.stderr,
        result.stdout
      );
    }
  }

  /**
   * Install via generic package manager (fallback to homebrew)
   */
  private async installViaPackageManager(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    // On macOS, package-manager typically means homebrew
    await this.installViaHomebrew(command, options, toolId);
  }

  /**
   * Download file using curl
   */
  private async downloadFile(
    url: string,
    options: InstallationOptions
  ): Promise<string> {
    const downloadPath = `/tmp/hatstart-download-${Date.now()}-${url.split('/').pop()}`;
    
    // Build curl command
    const curlArgs = [
      '-L', // Follow redirects
      '-o', downloadPath,
      url
    ];

    // Add timeout
    if (options.timeout) {
      curlArgs.push('--max-time', Math.floor(options.timeout / 1000).toString());
    }

    // Add user agent
    curlArgs.push('-A', 'HatStart/1.0');

    const result = await this.executeCommand('curl', curlArgs, {
      timeout: options.timeout || 300000, // 5 minutes default
      workingDirectory: options.workingDirectory,
      environment: options.environment
    });

    if (!result.success) {
      throw this.createError(
        'network_error',
        `Failed to download installer: ${result.stderr}`,
        result.stderr || 'Unknown download error',
        `curl ${curlArgs.join(' ')}`,
        result.exitCode,
        result.stderr,
        result.stdout
      );
    }

    if (!existsSync(downloadPath)) {
      throw this.createError(
        'network_error',
        'Downloaded file not found',
        `File was not created at expected path: ${downloadPath}`,
        `curl ${curlArgs.join(' ')}`
      );
    }

    return downloadPath;
  }

  /**
   * Execute PKG installer
   */
  private async executePkgInstaller(
    installerPath: string,
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void> {
    const installerArgs = ['-pkg', installerPath, '-target', '/'];

    // Add sudo if elevation is required
    const executeCommand = command.requiresElevation ? 'sudo' : 'installer';
    const finalArgs = command.requiresElevation ? ['installer', ...installerArgs] : installerArgs;

    const result = await this.executeCommand(
      executeCommand,
      finalArgs,
      {
        timeout: options.timeout || 300000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      }
    );

    if (!result.success) {
      throw this.createError(
        'command_failed',
        `PKG installation failed: ${result.stderr}`,
        result.stderr || 'Unknown error during PKG installation',
        `${executeCommand} ${finalArgs.join(' ')}`,
        result.exitCode,
        result.stderr,
        result.stdout
      );
    }
  }

  /**
   * Execute DMG installer
   */
  private async executeDmgInstaller(
    installerPath: string,
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void> {
    // Mount the DMG
    const mountResult = await this.executeCommand('hdiutil', ['attach', installerPath, '-nobrowse'], {
      timeout: options.timeout || 60000
    });

    if (!mountResult.success) {
      throw this.createError(
        'command_failed',
        `Failed to mount DMG: ${mountResult.stderr}`,
        mountResult.stderr || 'Unknown error mounting DMG',
        `hdiutil attach ${installerPath}`,
        mountResult.exitCode,
        mountResult.stderr,
        mountResult.stdout
      );
    }

    try {
      // Extract mount point from output
      const mountPoint = mountResult.stdout.split('\n')
        .find(line => line.includes('/Volumes/'))
        ?.split('\t')
        .pop()
        ?.trim();

      if (!mountPoint) {
        throw this.createError(
          'command_failed',
          'Could not determine mount point',
          'DMG mounted but mount point could not be determined',
          `hdiutil attach ${installerPath}`
        );
      }

      // Find .app bundle in mounted volume
      const lsResult = await this.executeCommand('ls', [mountPoint], { timeout: 10000 });
      const appBundle = lsResult.stdout.split('\n')
        .find(line => line.endsWith('.app'));

      if (!appBundle) {
        throw this.createError(
          'command_failed',
          'No .app bundle found in DMG',
          `No application bundle found in mounted DMG at ${mountPoint}`,
          `ls ${mountPoint}`
        );
      }

      // Copy app to Applications folder
      const sourcePath = join(mountPoint, appBundle);
      const targetPath = `/Applications/${appBundle}`;

      const copyResult = await this.executeCommand('cp', ['-R', sourcePath, targetPath], {
        timeout: options.timeout || 120000
      });

      if (!copyResult.success) {
        throw this.createError(
          'command_failed',
          `Failed to copy application: ${copyResult.stderr}`,
          copyResult.stderr || 'Unknown error copying application',
          `cp -R ${sourcePath} ${targetPath}`,
          copyResult.exitCode,
          copyResult.stderr,
          copyResult.stdout
        );
      }

    } finally {
      // Always unmount the DMG
      await this.executeCommand('hdiutil', ['detach', installerPath], { timeout: 30000 });
    }
  }

  /**
   * Execute archive installer (ZIP, TAR)
   */
  private async executeArchiveInstaller(
    installerPath: string,
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void> {
    const extractPath = `/tmp/hatstart-extract-${Date.now()}`;
    
    // Create extraction directory
    await this.executeCommand('mkdir', ['-p', extractPath], { timeout: 10000 });

    try {
      // Extract archive
      const fileExtension = installerPath.split('.').pop()?.toLowerCase();
      let extractCommand: string;
      let extractArgs: string[];

      if (fileExtension === 'zip') {
        extractCommand = 'unzip';
        extractArgs = ['-q', installerPath, '-d', extractPath];
      } else {
        extractCommand = 'tar';
        extractArgs = ['-xf', installerPath, '-C', extractPath];
      }

      const extractResult = await this.executeCommand(extractCommand, extractArgs, {
        timeout: options.timeout || 120000
      });

      if (!extractResult.success) {
        throw this.createError(
          'command_failed',
          `Failed to extract archive: ${extractResult.stderr}`,
          extractResult.stderr || 'Unknown error extracting archive',
          `${extractCommand} ${extractArgs.join(' ')}`,
          extractResult.exitCode,
          extractResult.stderr,
          extractResult.stdout
        );
      }

      // Find and install application
      const lsResult = await this.executeCommand('ls', [extractPath], { timeout: 10000 });
      const appBundle = lsResult.stdout.split('\n')
        .find(line => line.endsWith('.app'));

      if (appBundle) {
        // Copy app bundle to Applications
        const sourcePath = join(extractPath, appBundle);
        const targetPath = `/Applications/${appBundle}`;

        const copyResult = await this.executeCommand('cp', ['-R', sourcePath, targetPath], {
          timeout: options.timeout || 120000
        });

        if (!copyResult.success) {
          throw this.createError(
            'command_failed',
            `Failed to install application: ${copyResult.stderr}`,
            copyResult.stderr || 'Unknown error installing application',
            `cp -R ${sourcePath} ${targetPath}`,
            copyResult.exitCode,
            copyResult.stderr,
            copyResult.stdout
          );
        }
      } else {
        // Look for install script or binary
        const installScript = lsResult.stdout.split('\n')
          .find(line => line.includes('install') || line.includes('setup'));

        if (installScript) {
          const scriptPath = join(extractPath, installScript);
          await this.executeCommand('chmod', ['+x', scriptPath], { timeout: 10000 });
          
          const installResult = await this.executeCommand(scriptPath, [], {
            timeout: options.timeout || 300000,
            workingDirectory: extractPath
          });

          if (!installResult.success) {
            throw this.createError(
              'command_failed',
              `Installation script failed: ${installResult.stderr}`,
              installResult.stderr || 'Unknown error running installation script',
              scriptPath,
              installResult.exitCode,
              installResult.stderr,
              installResult.stdout
            );
          }
        } else {
          throw this.createError(
            'command_failed',
            'No installable content found in archive',
            `No .app bundle or install script found in extracted archive at ${extractPath}`,
            `ls ${extractPath}`
          );
        }
      }

    } finally {
      // Clean up extraction directory
      await this.executeCommand('rm', ['-rf', extractPath], { timeout: 30000 });
    }
  }

  /**
   * Generate tool ID for tracking
   */
  protected generateToolId(command: InstallationCommand): string {
    return `macos-${command.method}-${command.command}-${Date.now()}`;
  }
} 