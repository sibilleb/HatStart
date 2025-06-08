/**
 * Version Management UI Components
 * React components for managing programming language versions and version managers
 */

// Core components
export { VersionManagerCard } from './VersionManagerCard.js';
export { VersionManagerPanel } from './VersionManagerPanel.js';
export { VersionSelector } from './VersionSelector.js';
export { VersionManagerContainer } from './VersionManagerContainer.js';

// Re-export types for convenience
export type {
    ProjectVersionConfigProps, ProjectVersionConfigUI, ToolVersionUI, VersionInstallationProgressProps, VersionManagementAction,
    VersionManagementContextValue, VersionManagementOperation,
    VersionManagementOperationStatus, VersionManagementState, VersionManagerCardProps, VersionManagerPanelProps, VersionManagerSettingsProps, VersionManagerUI, VersionSelectorFilters, VersionSelectorProps
} from '../../types/version-management-ui-types.js';
