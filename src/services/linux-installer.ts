/**
 * Linux Installer Class
 * Implements Linux-specific installation methods including apt, yum, snap, flatpak, and direct downloads
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
 * Linux-specific installer implementation
 */
export class LinuxInstaller extends BaseInstaller {
  public readonly platform: Platform = 'linux';
  
  public readonly capabilities: InstallerCapabilities = {
    supportedMethods: ['apt', 'yum', 'snap', 'flatpak', 'direct-download', 'script', 'package-manager'],
    supportsElevation: true,
    supportsProgress: true,
    supportsVerification: true,
    supportsRollback: false,
    supportsCancel: true,
    supportsParallelInstallation: false,
    supportedArchitectures: ['x64', 'arm64', 'arm']
  };

  /**
   * Check if this installer can handle the given installation command
   */
  public canHandle(command: InstallationCommand): boolean {
    if (command.platform !== 'linux') {
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
        case 'apt':
          await this.installViaApt(command, options, toolId);
          break;
        case 'yum':
          await this.installViaYum(command, options, toolId);
          break;
        case 'snap':
          await this.installViaSnap(command, options, toolId);
          break;
        case 'flatpak':
          await this.installViaFlatpak(command, options, toolId);
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
            `Method '${command.method}' is not supported on Linux`,
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
   * Install via APT (Debian/Ubuntu)
   */
  private async installViaApt(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    // Check if apt is available
    const aptAvailable = await this.checkCommandExists('apt-get') || await this.checkCommandExists('apt');
    if (!aptAvailable) {
      throw this.createError(
        'dependency_missing',
        'APT package manager is not available. This method requires a Debian-based distribution.',
        'APT is required for this installation method',
        command.command
      );
    }

    const progress = this.createProgress(
      toolId,
      command.command,
      'installing',
      'Installing via APT',
      1,
      5
    );
    this.emitProgress(toolId, progress);

    // Update package list first
    const updateResult = await this.executeCommand('sudo', ['apt-get', 'update'], {
      timeout: 60000,
      workingDirectory: options.workingDirectory,
      environment: options.environment
    });

    if (!updateResult.success) {
      console.warn('APT update failed, continuing with installation:', updateResult.stderr);
    }

    // Build apt command
    const args = command.args || [];
    const aptArgs = ['apt-get', 'install', '-y', ...args];
    
    if (options.force) {
      aptArgs.push('--reinstall');
    }

    // Execute apt install
    const result = await this.executeCommandWithProgress(
      'sudo',
      aptArgs,
      toolId,
      {
        timeout: options.timeout || 600000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      }
    );

    if (!result.success) {
      throw this.createError(
        'command_failed',
        `APT installation failed: ${result.stderr}`,
        result.stderr || 'Unknown APT error',
        `sudo apt-get install -y ${args.join(' ')}`,
        result.exitCode,
        result.stderr,
        result.stdout
      );
    }
  }

  /**
   * Install via YUM (Red Hat/CentOS/Fedora)
   */
  private async installViaYum(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    const yumAvailable = await this.checkCommandExists('yum');
    const dnfAvailable = await this.checkCommandExists('dnf');
    
    if (!yumAvailable && !dnfAvailable) {
      throw this.createError(
        'dependency_missing',
        'YUM/DNF package manager is not available. This method requires a Red Hat-based distribution.',
        'YUM or DNF is required for this installation method',
        command.command
      );
    }

    const packageManager = dnfAvailable ? 'dnf' : 'yum';
    
    const progress = this.createProgress(
      toolId,
      command.command,
      'installing',
      `Installing via ${packageManager.toUpperCase()}`,
      1,
      5
    );
    this.emitProgress(toolId, progress);

    const args = command.args || [];
    const yumArgs = [packageManager, 'install', '-y', ...args];
    
    if (options.force) {
      yumArgs.push('--skip-broken');
    }

    const result = await this.executeCommandWithProgress(
      'sudo',
      yumArgs,
      toolId,
      {
        timeout: options.timeout || 600000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      }
    );

    if (!result.success) {
      throw this.createError(
        'command_failed',
        `${packageManager.toUpperCase()} installation failed: ${result.stderr}`,
        result.stderr || `Unknown ${packageManager.toUpperCase()} error`,
        `sudo ${packageManager} install -y ${args.join(' ')}`,
        result.exitCode,
        result.stderr,
        result.stdout
      );
    }
  }

  /**
   * Install via Snap
   */
  private async installViaSnap(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    const snapAvailable = await this.checkCommandExists('snap');
    if (!snapAvailable) {
      throw this.createError(
        'dependency_missing',
        'Snap package manager is not available. Please install snapd.',
        'Snap is required for this installation method',
        command.command
      );
    }

    const progress = this.createProgress(
      toolId,
      command.command,
      'installing',
      'Installing via Snap',
      1,
      5
    );
    this.emitProgress(toolId, progress);

    const args = command.args || [];
    const snapArgs = ['install', ...args];
    
    if (options.force) {
      snapArgs.push('--dangerous');
    }

    const result = await this.executeCommandWithProgress(
      'sudo',
      ['snap', ...snapArgs],
      toolId,
      {
        timeout: options.timeout || 300000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      }
    );

    if (!result.success) {
      throw this.createError(
        'command_failed',
        `Snap installation failed: ${result.stderr}`,
        result.stderr || 'Unknown Snap error',
        `sudo snap install ${args.join(' ')}`,
        result.exitCode,
        result.stderr,
        result.stdout
      );
    }
  }

  /**
   * Install via Flatpak
   */
  private async installViaFlatpak(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    const flatpakAvailable = await this.checkCommandExists('flatpak');
    if (!flatpakAvailable) {
      throw this.createError(
        'dependency_missing',
        'Flatpak package manager is not available. Please install flatpak.',
        'Flatpak is required for this installation method',
        command.command
      );
    }

    const progress = this.createProgress(
      toolId,
      command.command,
      'installing',
      'Installing via Flatpak',
      1,
      5
    );
    this.emitProgress(toolId, progress);

    const args = command.args || [];
    const flatpakArgs = ['install', '-y', ...args];
    
    if (options.force) {
      flatpakArgs.push('--reinstall');
    }

    const result = await this.executeCommandWithProgress(
      'flatpak',
      flatpakArgs,
      toolId,
      {
        timeout: options.timeout || 600000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      }
    );

    if (!result.success) {
      throw this.createError(
        'command_failed',
        `Flatpak installation failed: ${result.stderr}`,
        result.stderr || 'Unknown Flatpak error',
        `flatpak install -y ${args.join(' ')}`,
        result.exitCode,
        result.stderr,
        result.stdout
      );
    }
  }

  /**
   * Install via direct download
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
        'No download URL provided',
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

    const fileExtension = installerPath.toLowerCase();
    
    if (fileExtension.endsWith('.deb')) {
      await this.executeDebInstaller(installerPath, command, options);
    } else if (fileExtension.endsWith('.rpm')) {
      await this.executeRpmInstaller(installerPath, command, options);
    } else if (fileExtension.endsWith('.tar.gz') || fileExtension.endsWith('.tgz') || 
               fileExtension.endsWith('.tar.xz') || fileExtension.endsWith('.tar.bz2')) {
      await this.executeArchiveInstaller(installerPath, command, options);
    } else if (fileExtension.endsWith('.appimage')) {
      await this.executeAppImageInstaller(installerPath, command, options);
    } else {
      throw this.createError(
        'platform_unsupported',
        `Unsupported installer type: ${fileExtension}`,
        `File type '${fileExtension}' is not supported for Linux installation`,
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

    const args = command.args || [];
    const scriptArgs = ['-c', command.command, ...args];

    const result = await this.executeCommandWithProgress(
      '/bin/bash',
      scriptArgs,
      toolId,
      {
        timeout: options.timeout || 300000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      }
    );

    if (!result.success) {
      throw this.createError(
        'command_failed',
        `Script installation failed: ${result.stderr}`,
        result.stderr || 'Unknown script error',
        `/bin/bash -c "${command.command}"`,
        result.exitCode,
        result.stderr,
        result.stdout
      );
    }
  }

  /**
   * Install via package manager (fallback to best available)
   */
  private async installViaPackageManager(
    command: InstallationCommand,
    options: InstallationOptions,
    toolId: string
  ): Promise<void> {
    const packageManagers = [
      { name: 'apt', check: 'apt-get' },
      { name: 'dnf', check: 'dnf' },
      { name: 'yum', check: 'yum' },
      { name: 'snap', check: 'snap' },
      { name: 'flatpak', check: 'flatpak' }
    ];

    for (const pm of packageManagers) {
      if (await this.checkCommandExists(pm.check)) {
        const pmCommand: InstallationCommand = {
          ...command,
          method: pm.name as any
        };
        
        switch (pm.name) {
          case 'apt':
            await this.installViaApt(pmCommand, options, toolId);
            return;
          case 'dnf':
          case 'yum':
            await this.installViaYum(pmCommand, options, toolId);
            return;
          case 'snap':
            await this.installViaSnap(pmCommand, options, toolId);
            return;
          case 'flatpak':
            await this.installViaFlatpak(pmCommand, options, toolId);
            return;
        }
      }
    }

    throw this.createError(
      'dependency_missing',
      'No supported package manager found. Please install apt, yum, dnf, snap, or flatpak.',
      'No package manager available for installation',
      command.command
    );
  }

  /**
   * Download file using curl or wget
   */
  private async downloadFile(
    url: string,
    options: InstallationOptions
  ): Promise<string> {
    const fileName = url.split('/').pop() || 'installer';
    const downloadPath = join('/tmp', `hatstart-${Date.now()}-${fileName}`);

    const curlAvailable = await this.checkCommandExists('curl');
    const wgetAvailable = await this.checkCommandExists('wget');

    if (!curlAvailable && !wgetAvailable) {
      throw this.createError(
        'dependency_missing',
        'Neither curl nor wget is available for downloading files',
        'curl or wget is required for file downloads',
        `download ${url}`
      );
    }

    let result;
    if (curlAvailable) {
      const curlArgs = [
        '-L',
        '-o', downloadPath,
        '--user-agent', 'HatStart/1.0',
        '--connect-timeout', '30',
        '--max-time', '300',
        url
      ];

      result = await this.executeCommand('curl', curlArgs, {
        timeout: options.timeout || 300000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      });
    } else {
      const wgetArgs = [
        '-O', downloadPath,
        '--user-agent=HatStart/1.0',
        '--timeout=30',
        '--tries=3',
        url
      ];

      result = await this.executeCommand('wget', wgetArgs, {
        timeout: options.timeout || 300000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      });
    }

    if (!result.success) {
      throw this.createError(
        'network_error',
        `Failed to download installer: ${result.stderr}`,
        result.stderr || 'Unknown download error',
        curlAvailable ? `curl -L -o ${downloadPath} ${url}` : `wget -O ${downloadPath} ${url}`,
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
        `download ${url}`
      );
    }

    return downloadPath;
  }

  /**
   * Execute DEB installer
   */
  private async executeDebInstaller(
    installerPath: string,
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void> {
    const dpkgAvailable = await this.checkCommandExists('dpkg');
    if (!dpkgAvailable) {
      throw this.createError(
        'dependency_missing',
        'dpkg is not available for DEB package installation',
        'dpkg is required for DEB package installation',
        command.command
      );
    }

    const result = await this.executeCommand('sudo', ['dpkg', '-i', installerPath], {
      timeout: options.timeout || 300000,
      workingDirectory: options.workingDirectory,
      environment: options.environment
    });

    if (!result.success) {
      await this.executeCommand('sudo', ['apt-get', 'install', '-f', '-y'], {
        timeout: 60000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      });

      throw this.createError(
        'command_failed',
        `DEB installation failed: ${result.stderr}`,
        result.stderr || 'Unknown DEB installation error',
        `sudo dpkg -i ${installerPath}`,
        result.exitCode,
        result.stderr,
        result.stdout
      );
    }
  }

  /**
   * Execute RPM installer
   */
  private async executeRpmInstaller(
    installerPath: string,
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void> {
    const rpmAvailable = await this.checkCommandExists('rpm');
    if (!rpmAvailable) {
      throw this.createError(
        'dependency_missing',
        'rpm is not available for RPM package installation',
        'rpm is required for RPM package installation',
        command.command
      );
    }

    const result = await this.executeCommand('sudo', ['rpm', '-i', installerPath], {
      timeout: options.timeout || 300000,
      workingDirectory: options.workingDirectory,
      environment: options.environment
    });

    if (!result.success) {
      throw this.createError(
        'command_failed',
        `RPM installation failed: ${result.stderr}`,
        result.stderr || 'Unknown RPM installation error',
        `sudo rpm -i ${installerPath}`,
        result.exitCode,
        result.stderr,
        result.stdout
      );
    }
  }

  /**
   * Execute archive installer
   */
  private async executeArchiveInstaller(
    installerPath: string,
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void> {
    const extractDir = `/tmp/hatstart-extract-${Date.now()}`;
    
    await this.executeCommand('mkdir', ['-p', extractDir], {
      timeout: 10000,
      workingDirectory: options.workingDirectory,
      environment: options.environment
    });

    let extractResult;
    if (installerPath.endsWith('.tar.gz') || installerPath.endsWith('.tgz')) {
      extractResult = await this.executeCommand('tar', ['-xzf', installerPath, '-C', extractDir], {
        timeout: 120000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      });
    } else if (installerPath.endsWith('.tar.xz')) {
      extractResult = await this.executeCommand('tar', ['-xJf', installerPath, '-C', extractDir], {
        timeout: 120000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      });
    } else if (installerPath.endsWith('.tar.bz2')) {
      extractResult = await this.executeCommand('tar', ['-xjf', installerPath, '-C', extractDir], {
        timeout: 120000,
        workingDirectory: options.workingDirectory,
        environment: options.environment
      });
    }

    if (!extractResult?.success) {
      throw this.createError(
        'command_failed',
        `Archive extraction failed: ${extractResult?.stderr}`,
        extractResult?.stderr || 'Unknown extraction error',
        `tar -xf ${installerPath}`,
        extractResult?.exitCode,
        extractResult?.stderr,
        extractResult?.stdout
      );
    }

    const installScript = join(extractDir, 'install.sh');
    if (existsSync(installScript)) {
      const installResult = await this.executeCommand('sudo', ['bash', installScript], {
        timeout: options.timeout || 300000,
        workingDirectory: extractDir,
        environment: options.environment
      });

      if (!installResult.success) {
        throw this.createError(
          'command_failed',
          `Install script failed: ${installResult.stderr}`,
          installResult.stderr || 'Unknown install script error',
          `sudo bash ${installScript}`,
          installResult.exitCode,
          installResult.stderr,
          installResult.stdout
        );
      }
    } else {
      const binDir = join(extractDir, 'bin');
      if (existsSync(binDir)) {
        const copyResult = await this.executeCommand('sudo', ['cp', '-r', binDir + '/*', '/usr/local/bin/'], {
          timeout: 60000,
          workingDirectory: options.workingDirectory,
          environment: options.environment
        });

        if (!copyResult.success) {
          throw this.createError(
            'command_failed',
            `Binary copy failed: ${copyResult.stderr}`,
            copyResult.stderr || 'Unknown copy error',
            `sudo cp -r ${binDir}/* /usr/local/bin/`,
            copyResult.exitCode,
            copyResult.stderr,
            copyResult.stdout
          );
        }
      } else {
        const appName = command.command.replace(/[^a-zA-Z0-9]/g, '-');
        const optDir = `/opt/${appName}`;
        
        const copyResult = await this.executeCommand('sudo', ['cp', '-r', extractDir, optDir], {
          timeout: 60000,
          workingDirectory: options.workingDirectory,
          environment: options.environment
        });

        if (!copyResult.success) {
          throw this.createError(
            'command_failed',
            `Directory copy failed: ${copyResult.stderr}`,
            copyResult.stderr || 'Unknown copy error',
            `sudo cp -r ${extractDir} ${optDir}`,
            copyResult.exitCode,
            copyResult.stderr,
            copyResult.stdout
          );
        }
      }
    }

    await this.executeCommand('rm', ['-rf', extractDir], {
      timeout: 30000,
      workingDirectory: options.workingDirectory,
      environment: options.environment
    });
  }

  /**
   * Execute AppImage installer
   */
  private async executeAppImageInstaller(
    installerPath: string,
    command: InstallationCommand,
    options: InstallationOptions
  ): Promise<void> {
    const appName = command.command.replace(/[^a-zA-Z0-9]/g, '-');
    const appImagePath = `/opt/${appName}.AppImage`;

    const copyResult = await this.executeCommand('sudo', ['cp', installerPath, appImagePath], {
      timeout: 60000,
      workingDirectory: options.workingDirectory,
      environment: options.environment
    });

    if (!copyResult.success) {
      throw this.createError(
        'command_failed',
        `AppImage copy failed: ${copyResult.stderr}`,
        copyResult.stderr || 'Unknown copy error',
        `sudo cp ${installerPath} ${appImagePath}`,
        copyResult.exitCode,
        copyResult.stderr,
        copyResult.stdout
      );
    }

    const chmodResult = await this.executeCommand('sudo', ['chmod', '+x', appImagePath], {
      timeout: 10000,
      workingDirectory: options.workingDirectory,
      environment: options.environment
    });

    if (!chmodResult.success) {
      throw this.createError(
        'command_failed',
        `AppImage chmod failed: ${chmodResult.stderr}`,
        chmodResult.stderr || 'Unknown chmod error',
        `sudo chmod +x ${appImagePath}`,
        chmodResult.exitCode,
        chmodResult.stderr,
        chmodResult.stdout
      );
    }

    const symlinkResult = await this.executeCommand('sudo', ['ln', '-sf', appImagePath, `/usr/local/bin/${appName}`], {
      timeout: 10000,
      workingDirectory: options.workingDirectory,
      environment: options.environment
    });

    if (!symlinkResult.success) {
      console.warn('Failed to create symlink for AppImage:', symlinkResult.stderr);
    }
  }

  /**
   * Generate unique tool ID for tracking installations
   */
  protected generateToolId(command: InstallationCommand): string {
    return `linux-${command.method}-${command.command}-${Date.now()}`;
  }
} 