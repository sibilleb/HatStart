/**
 * Windows Platform Command Adapter
 * Handles command execution for Windows systems
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { Platform } from '../../../shared/simple-manifest-types';
import type {
    CommandExecutionOptions,
    CommandExecutionResult,
    CommandValidationResult,
    IPlatformCommandAdapter,
    ShellType,
} from '../types';

const execAsync = promisify(exec);

/**
 * Windows platform adapter for command execution
 */
export class WindowsPlatformAdapter implements IPlatformCommandAdapter {
  public readonly platform: Platform = 'windows';
  public readonly supportedShells: ShellType[] = ['powershell', 'cmd'];
  public readonly defaultShell: ShellType = 'powershell';

  /**
   * Execute a command on Windows platform
   */
  public async execute(
    _command: string,
    _args: string[],
    _options: CommandExecutionOptions
  ): Promise<CommandExecutionResult> {
    // This method is implemented in the base executor
    // Platform adapters focus on platform-specific utilities
    throw new Error('Execute method should be called through CommandExecutor');
  }

  /**
   * Validate if a command is available
   */
  public async validateCommand(command: string): Promise<CommandValidationResult> {
    try {
      // Use 'where' command on Windows to find executable
      const { stdout } = await execAsync(`where "${command}"`, { timeout: 5000 });
      const path = stdout.trim().split('\n')[0]; // Take first result
      
      if (path) {
        // Try to get version if possible
        let version: string | undefined;
        try {
          const versionCommands = [
            `"${command}" --version`,
            `"${command}" -v`,
            `"${command}" version`,
            `"${command}" /version`, // Windows-style
          ];
          
          for (const versionCmd of versionCommands) {
            try {
              const { stdout: versionOutput } = await execAsync(versionCmd, { timeout: 3000 });
              if (versionOutput) {
                // Extract version from first line
                const firstLine = versionOutput.split('\n')[0];
                const versionMatch = firstLine.match(/(\d+\.\d+(?:\.\d+)?)/);
                if (versionMatch) {
                  version = versionMatch[1];
                  break;
                }
              }
            } catch {
              // Continue to next version command
            }
          }
        } catch {
          // Version detection failed, but command exists
        }

        return {
          available: true,
          path,
          version,
          platform: this.platform,
          method: 'where',
          metadata: { shell: this.defaultShell },
        };
      }
    } catch {
      // Command not found, try with .exe extension
      try {
        const { stdout } = await execAsync(`where "${command}.exe"`, { timeout: 5000 });
        const path = stdout.trim().split('\n')[0];
        
        if (path) {
          return {
            available: true,
            path,
            platform: this.platform,
            method: 'where',
            metadata: { shell: this.defaultShell, extension: '.exe' },
          };
        }
      } catch {
        // Still not found
      }
    }

    return {
      available: false,
      platform: this.platform,
      method: 'where',
    };
  }

  /**
   * Get the appropriate shell command for execution
   */
  public getShellCommand(shell: ShellType): { command: string; args: string[] } {
    switch (shell) {
      case 'powershell':
        return { command: 'powershell.exe', args: ['-Command'] };
      case 'cmd':
        return { command: 'cmd.exe', args: ['/c'] };
      default:
        return { command: 'powershell.exe', args: ['-Command'] };
    }
  }

  /**
   * Prepare environment variables for execution
   */
  public prepareEnvironment(
    baseEnv: Record<string, string>,
    additionalEnv?: Record<string, string>
  ): Record<string, string> {
    const environment = { ...baseEnv };
    
    // Add additional environment variables
    if (additionalEnv) {
      Object.assign(environment, additionalEnv);
    }
    
    // Ensure PATH is set with Windows defaults
    if (!environment.PATH) {
      environment.PATH = [
        'C:\\Windows\\System32',
        'C:\\Windows',
        'C:\\Windows\\System32\\Wbem',
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0',
        'C:\\Program Files\\Git\\cmd',
        'C:\\Program Files\\nodejs',
      ].join(';');
    }
    
    // Set default shell if not specified
    if (!environment.COMSPEC) {
      environment.COMSPEC = 'C:\\Windows\\System32\\cmd.exe';
    }
    
    // Set PowerShell execution policy environment variable
    if (!environment.PSExecutionPolicyPreference) {
      environment.PSExecutionPolicyPreference = 'RemoteSigned';
    }
    
    return environment;
  }

  /**
   * Handle platform-specific command escaping
   */
  public escapeCommand(command: string): string {
    // Windows command escaping
    if (command.includes(' ') || command.includes('"')) {
      return `"${command.replace(/"/g, '""')}"`;
    }
    return command;
  }

  /**
   * Handle platform-specific argument escaping
   */
  public escapeArguments(args: string[]): string[] {
    return args.map(arg => {
      // Windows argument escaping
      if (arg.includes(' ') || arg.includes('"') || arg.includes('%')) {
        return `"${arg.replace(/"/g, '""')}"`;
      }
      return arg;
    });
  }

  /**
   * Check if elevation is supported
   */
  public supportsElevation(): boolean {
    return true; // Windows supports UAC elevation
  }

  /**
   * Get elevation command prefix
   */
  public getElevationCommand(): { command: string; args: string[] } | null {
    // Use PowerShell Start-Process with -Verb RunAs for elevation
    return {
      command: 'powershell.exe',
      args: ['-Command', 'Start-Process', '-Verb', 'RunAs', '-FilePath'],
    };
  }
} 