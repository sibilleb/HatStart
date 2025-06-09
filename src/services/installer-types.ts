/**
 * Simple installer types to replace complex installer framework
 */

export interface InstallationOptions {
  force?: boolean;
  silent?: boolean;
  timeout?: number;
}

export interface CommandExecutionResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: Error;
}

// Re-export types from simple-installer
export type { Tool, InstallResult, Platform, ProgressCallback } from './simple-installer';