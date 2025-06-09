/**
 * Version Management UI Components
 * React components for managing programming language versions and version managers
 */

// Core components
export { VersionManagerCard } from './VersionManagerCard';
export { VersionManagerPanel } from './VersionManagerPanel';
export { VersionSelector } from './VersionSelector';
export { VersionManagerContainer } from './VersionManagerContainer';

// Re-export types for convenience
export type {
    ProjectVersionConfigProps, ProjectVersionConfigUI, ToolVersionUI, VersionInstallationProgressProps, VersionManagementAction,
    VersionManagementContextValue, VersionManagementOperation,
    VersionManagementOperationStatus, VersionManagementState, VersionManagerCardProps, VersionManagerPanelProps, VersionManagerSettingsProps, VersionManagerUI, VersionSelectorFilters, VersionSelectorProps
} from '../../types/version-management-ui-types';
