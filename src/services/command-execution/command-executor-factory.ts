/**
 * Command Executor Factory
 * Creates platform-specific command executors
 */

import { arch, platform } from 'os';
import type { Architecture, Platform } from '../../shared/simple-manifest-types';
import { BaseCommandExecutor } from './base-command-executor';
import { CommandBuilder } from './command-builder';
import { UnixPlatformAdapter } from './platform-adapters/unix-adapter';
import { WindowsPlatformAdapter } from './platform-adapters/windows-adapter';
import type {
    ICommandBuilder,
    ICommandExecutor,
    ICommandExecutorFactory,
    IPlatformCommandAdapter,
} from './types';

/**
 * Platform-specific command executor implementations
 */
class UnixCommandExecutor extends BaseCommandExecutor {
  constructor() {
    const currentPlatform = platform() as Platform;
    const currentArch = arch() as Architecture;
    const adapter = new UnixPlatformAdapter(currentPlatform);
    super(currentPlatform, currentArch, adapter);
  }
}

class WindowsCommandExecutor extends BaseCommandExecutor {
  constructor() {
    const currentPlatform = 'windows' as Platform;
    const currentArch = arch() as Architecture;
    const adapter = new WindowsPlatformAdapter();
    super(currentPlatform, currentArch, adapter);
  }
}

/**
 * Command executor factory implementation
 */
export class CommandExecutorFactory implements ICommandExecutorFactory {
  private static instance: CommandExecutorFactory;
  private executorCache = new Map<string, ICommandExecutor>();

  /**
   * Get singleton instance
   */
  public static getInstance(): CommandExecutorFactory {
    if (!CommandExecutorFactory.instance) {
      CommandExecutorFactory.instance = new CommandExecutorFactory();
    }
    return CommandExecutorFactory.instance;
  }

  /**
   * Create command executor for current platform
   */
  public createExecutor(): ICommandExecutor {
    const currentPlatform = this.detectPlatform();
    return this.createExecutorForPlatform(currentPlatform);
  }

  /**
   * Create command executor for specific platform
   */
  public createExecutorForPlatform(targetPlatform: Platform): ICommandExecutor {
    const cacheKey = `${targetPlatform}-${arch()}`;
    
    if (this.executorCache.has(cacheKey)) {
      return this.executorCache.get(cacheKey)!;
    }

    let executor: ICommandExecutor;

    switch (targetPlatform) {
      case 'windows':
        executor = new WindowsCommandExecutor();
        break;
      case 'macos':
      case 'linux':
        executor = new UnixCommandExecutor();
        break;
      default:
        throw new Error(`Unsupported platform: ${targetPlatform}`);
    }

    this.executorCache.set(cacheKey, executor);
    return executor;
  }

  /**
   * Create command builder with current platform executor
   */
  public createBuilder(): ICommandBuilder {
    const executor = this.createExecutor();
    return new CommandBuilder(executor);
  }

  /**
   * Create command builder for specific platform
   */
  public createBuilderForPlatform(targetPlatform: Platform): ICommandBuilder {
    const executor = this.createExecutorForPlatform(targetPlatform);
    return new CommandBuilder(executor);
  }

  /**
   * Get available platforms
   */
  public getAvailablePlatforms(): Platform[] {
    return ['windows', 'macos', 'linux'];
  }

  /**
   * Get supported platforms (alias for getAvailablePlatforms)
   */
  public getSupportedPlatforms(): Platform[] {
    return this.getAvailablePlatforms();
  }

  /**
   * Check if platform is supported
   */
  public isPlatformSupported(targetPlatform: Platform): boolean {
    return this.getAvailablePlatforms().includes(targetPlatform);
  }

  /**
   * Get current platform information
   */
  public getPlatformInfo(): { platform: Platform; architecture: Architecture } {
    return {
      platform: this.detectPlatform(),
      architecture: arch() as Architecture,
    };
  }

  /**
   * Clear executor cache
   */
  public clearCache(): void {
    this.executorCache.clear();
  }

  /**
   * Create custom executor with specific adapter
   */
  public createCustomExecutor(
    targetPlatform: Platform,
    targetArch: Architecture,
    adapter: IPlatformCommandAdapter
  ): ICommandExecutor {
    return new (class extends BaseCommandExecutor {
      constructor() {
        super(targetPlatform, targetArch, adapter);
      }
    })();
  }

  // Private helper methods

  private detectPlatform(): Platform {
    const osPlatform = platform();
    
    switch (osPlatform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        // Default to linux for other Unix-like systems
        return 'linux';
    }
  }
}

/**
 * Default factory instance for convenience
 */
export const commandExecutorFactory = CommandExecutorFactory.getInstance();

/**
 * Convenience functions for common use cases
 */

/**
 * Create a command executor for the current platform
 */
export function createCommandExecutor(): ICommandExecutor {
  return commandExecutorFactory.createExecutor();
}

/**
 * Create a command builder for the current platform
 */
export function createCommandBuilder(): ICommandBuilder {
  return commandExecutorFactory.createBuilder();
}

/**
 * Execute a simple command with default options
 */
export async function executeCommand(
  command: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number } = {}
) {
  const builder = createCommandBuilder()
    .command(command)
    .args(...args);

  if (options.cwd) {
    builder.cwd(options.cwd);
  }

  if (options.timeout) {
    builder.timeout(options.timeout);
  }

  return builder.execute();
} 