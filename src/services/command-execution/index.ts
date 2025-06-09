/**
 * Command Execution Layer
 * Unified command execution interface for cross-platform operations
 */

// Core interfaces and types
export type {
    CommandExecutionError,
    CommandExecutionErrorType, CommandExecutionMode, CommandExecutionOptions,
    CommandExecutionResult, CommandOutputData, CommandValidationResult, ICommandBuilder, ICommandExecutor, ICommandExecutorFactory,
    IPlatformCommandAdapter, ShellType
} from './types';

// Base implementations
export { BaseCommandExecutor } from './base-command-executor';

// Platform adapters
export { UnixPlatformAdapter } from './platform-adapters/unix-adapter';
export { WindowsPlatformAdapter } from './platform-adapters/windows-adapter';

// Command builder
export { CommandBuilder } from './command-builder';

// Factory and convenience functions
export {
    CommandExecutorFactory,
    commandExecutorFactory, createCommandBuilder, createCommandExecutor, executeCommand
} from './command-executor-factory';

// Re-export platform and architecture types for convenience
export type { Architecture, Platform } from '../../shared/simple-manifest-types';
