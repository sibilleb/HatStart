/**
 * Test type definitions for mocking installer methods
 */

import type { CommandExecutionResult } from '../command-execution/types.js';
import type { BaseInstaller } from '../base-installer.js';
import type { InstallationCommand } from '../../shared/manifest-types.js';
import type { InstallationOptions } from '../installer-types.js';

/**
 * Type for executeCommand method
 */
export type ExecuteCommandMethod = (
  command: string,
  args?: string[],
  options?: {
    timeout?: number;
    workingDirectory?: string;
    environment?: Record<string, string>;
    elevated?: boolean;
  }
) => Promise<CommandExecutionResult>;

/**
 * Type for checkCommandExists method
 */
export type CheckCommandExistsMethod = (command: string) => Promise<boolean>;

/**
 * Type for executeCommandWithProgress method
 */
export type ExecuteCommandWithProgressMethod = (
  command: string,
  args: string[],
  toolId: string,
  options?: {
    timeout?: number;
    workingDirectory?: string;
    environment?: Record<string, string>;
    onOutput?: (data: string) => void;
  }
) => Promise<CommandExecutionResult>;

/**
 * Type for isAlreadyInstalled method
 */
export type IsAlreadyInstalledMethod = (command: InstallationCommand) => Promise<boolean>;

/**
 * Type for downloadFile method
 */
export type DownloadFileMethod = (url: string, options: InstallationOptions) => Promise<string>;

/**
 * Interface for accessing protected methods in tests
 */
export interface TestableInstaller extends BaseInstaller {
  executeCommand: ExecuteCommandMethod;
  checkCommandExists: CheckCommandExistsMethod;
  executeCommandWithProgress: ExecuteCommandWithProgressMethod;
  isAlreadyInstalled: IsAlreadyInstalledMethod;
  downloadFile: DownloadFileMethod;
}

/**
 * Type guard to cast installer to testable interface
 */
export function asTestableInstaller(installer: BaseInstaller): TestableInstaller {
  return installer as TestableInstaller;
}