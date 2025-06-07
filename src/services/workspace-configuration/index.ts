/**
 * Workspace Configuration Layer
 * Unified workspace configuration and environment management
 */

// Core interfaces and types
export type {
    ConfigurationBackup, EnvironmentOperation, EnvironmentSyncResult, EnvironmentVariable, IEnvironmentManager,
    IShellIntegrationManager,
    IWorkspaceConfigurationEventListener, IWorkspaceConfigurationService, PathEntry,
    ShellIntegration, ShellProfile, ValidationResult, WorkspaceConfiguration, WorkspaceConfigurationEvent, WorkspaceDetectionResult, WorkspaceScope, WorkspaceToolConfig
} from './types.js';

// Main implementations
export { EnvironmentManager } from './environment-manager.js';
export { ShellIntegrationManager } from './shell-integration-manager.js';
export { VersionManagerIntegration } from './version-manager-integration.js';
export { WorkspaceConfigurationService } from './workspace-configuration-service.js';

// Import classes for factory functions
import { EnvironmentManager } from './environment-manager.js';
import type { IEnvironmentManager, IWorkspaceConfigurationService } from './types.js';
import { WorkspaceConfigurationService } from './workspace-configuration-service.js';

// Convenience factory function
export function createWorkspaceConfigurationService(): IWorkspaceConfigurationService {
  return new WorkspaceConfigurationService();
}

// Convenience factory function
export function createEnvironmentManager(): IEnvironmentManager {
  return new EnvironmentManager();
}

// Default export for main service
export default WorkspaceConfigurationService; 