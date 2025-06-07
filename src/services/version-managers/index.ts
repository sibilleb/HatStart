/**
 * Version Manager Adapters
 * Export all version manager adapter implementations
 */

export { AsdfAdapter } from './asdf-adapter.js';
export { BaseVersionManagerAdapter } from './base-adapter.js';
export { MiseAdapter } from './mise-adapter.js';
export { NvmAdapter } from './nvm-adapter.js';
export { PyenvAdapter } from './pyenv-adapter.js';
export { RbenvAdapter } from './rbenv-adapter.js';

// Re-export types from version-manager-types for convenience
export type {
    IVersionManagementEngine, IVersionManager,
    IVersionManagerFactory, ProjectVersionConfig, VersionInfo, VersionInstallOptions,
    VersionInstallProgress, VersionManagerCapabilities,
    VersionManagerConfig,
    VersionManagerStatus, VersionManagerType, VersionOperationResult,
    VersionSpecifier, VersionedTool
} from '../version-manager-types.js';

