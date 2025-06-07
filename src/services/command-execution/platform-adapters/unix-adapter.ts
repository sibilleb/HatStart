/**
 * Unix Platform Command Adapter
 * Handles command execution for Unix-based systems (Linux, macOS)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { Platform } from '../../../shared/manifest-types.js';
import type {
    CommandExecutionOptions,
    CommandExecutionResult,
    CommandValidationResult,
    IPlatformCommandAdapter,
    ShellType,
} from '../types.js';

const execAsync = promisify(exec);

/**
 * Unix platform adapter for command execution
 */
export class UnixPlatformAdapter implements IPlatformCommandAdapter {
  public readonly platform: Platform;
  public readonly supportedShells: ShellType[] = ['bash', 'zsh', 'fish', 'sh'];
  public readonly defaultShell: ShellType;

  constructor(platform: Platform) {
    this.platform = platform;
    this.defaultShell = this.detectDefaultShell();
  }

  /**
   * Execute a command on Unix platform
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
      const { stdout } = await execAsync(`which "${command}"`, { timeout: 5000 });
      const path = stdout.trim();
      
      if (path) {
        // Try to get version if possible
        let version: string | undefined;
        try {
          const versionCommands = [`${command} --version`, `${command} -v`, `${command} version`];
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
          method: 'which',
          metadata: { shell: this.defaultShell },
        };
      }
    } catch {
      // Command not found
    }

    return {
      available: false,
      platform: this.platform,
      method: 'which',
    };
  }

  /**
   * Get the appropriate shell command for execution
   */
  public getShellCommand(shell: ShellType): { command: string; args: string[] } {
    switch (shell) {
      case 'bash':
        return { command: '/bin/bash', args: ['-c'] };
      case 'zsh':
        return { command: '/bin/zsh', args: ['-c'] };
      case 'fish':
        return { command: '/usr/bin/fish', args: ['-c'] };
      case 'sh':
        return { command: '/bin/sh', args: ['-c'] };
      default:
        return { command: '/bin/bash', args: ['-c'] };
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
    
    // Ensure PATH is set
    if (!environment.PATH) {
      environment.PATH = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
    }
    
    // Set default shell if not specified
    if (!environment.SHELL) {
      environment.SHELL = this.getShellPath(this.defaultShell);
    }
    
    return environment;
  }

  /**
   * Handle platform-specific command escaping
   */
  public escapeCommand(command: string): string {
    // Escape special characters for Unix shells
    if (command.includes(' ') || command.includes('"') || command.includes("'")) {
      return `"${command.replace(/"/g, '\\"')}"`;
    }
    return command;
  }

  /**
   * Handle platform-specific argument escaping
   */
  public escapeArguments(args: string[]): string[] {
    return args.map(arg => {
      // Escape arguments that contain special characters
      if (arg.includes(' ') || arg.includes('"') || arg.includes("'") || 
          arg.includes('$') || arg.includes('`') || arg.includes('\\')) {
        return `"${arg.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')}"`;
      }
      return arg;
    });
  }

  /**
   * Check if elevation is supported
   */
  public supportsElevation(): boolean {
    return true; // Unix systems support sudo
  }

  /**
   * Get elevation command prefix
   */
  public getElevationCommand(): { command: string; args: string[] } | null {
    return { command: 'sudo', args: [] };
  }

  // Private helper methods

  private detectDefaultShell(): ShellType {
    const shell = process.env.SHELL || '';
    
    if (shell.includes('zsh')) return 'zsh';
    if (shell.includes('fish')) return 'fish';
    if (shell.includes('bash')) return 'bash';
    
    // Default to bash for Unix systems
    return 'bash';
  }

  private getShellPath(shell: ShellType): string {
    switch (shell) {
      case 'bash':
        return '/bin/bash';
      case 'zsh':
        return '/bin/zsh';
      case 'fish':
        return '/usr/bin/fish';
      case 'sh':
        return '/bin/sh';
      default:
        return '/bin/bash';
    }
  }
} 