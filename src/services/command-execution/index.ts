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
} from './types.js';

// Base implementations
export { BaseCommandExecutor } from './base-command-executor.js';

// Platform adapters
export { UnixPlatformAdapter } from './platform-adapters/unix-adapter.js';
export { WindowsPlatformAdapter } from './platform-adapters/windows-adapter.js';

// Command builder
export { CommandBuilder } from './command-builder.js';

// Factory and convenience functions
export {
    CommandExecutorFactory,
    commandExecutorFactory, createCommandBuilder, createCommandExecutor, executeCommand
} from './command-executor-factory.js';

// Re-export platform and architecture types for convenience
export type { Architecture, Platform } from '../../shared/manifest-types.js';
