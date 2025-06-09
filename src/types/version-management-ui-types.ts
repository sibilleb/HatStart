/**
 * Version Management UI Types
 * UI-specific types for version management components
 */

import type {
    VersionedTool,
    IVersionInfo,
    VersionInstallOptions,
    VersionInstallProgress,
    VersionManagerConfig,
    VersionManagerStatus,
    VersionManagerType,
    IVersionOperationResult,
    VersionSpecifier
} from '../services/version-manager-types';
import type { Platform } from '../shared/simple-manifest-types';

/**
 * UI-specific version manager information
 */
export interface VersionManagerUI {
  /** Version manager type */
  type: VersionManagerType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Icon identifier */
  icon: string;
  /** Current status */
  status: VersionManagerStatus;
  /** Whether this is the recommended manager */
  isRecommended: boolean;
  /** Whether this manager is currently installed */
  isInstalled: boolean;
  /** Whether this manager is currently active */
  isActive: boolean;
  /** Supported tools */
  supportedTools: VersionedTool[];
  /** Supported platforms */
  supportedPlatforms: Platform[];
  /** Installation URL or command */
  installationUrl?: string;
  /** Documentation URL */
  documentationUrl?: string;
  /** Configuration */
  config?: VersionManagerConfig;
  /** Last operation result */
  lastOperation?: IVersionOperationResult;
}

/**
 * UI-specific tool version information
 */
export interface ToolVersionUI extends IVersionInfo {
  /** Tool this version belongs to */
  tool: VersionedTool;
  /** Version manager that manages this version */
  manager: VersionManagerType;
  /** Display name for the version */
  displayName: string;
  /** Whether this version is recommended */
  isRecommended: boolean;
  /** Installation status */
  installationStatus: 'not-installed' | 'installing' | 'installed' | 'failed' | 'updating';
  /** Installation progress (0-100) */
  installationProgress?: number;
  /** Installation error message */
  installationError?: string;
  /** Size information */
  size?: string;
  /** Estimated installation time */
  estimatedInstallTime?: string;
}

/**
 * Version management operation types
 */
export type VersionManagementOperation = 
  | 'install-manager'
  | 'configure-manager'
  | 'install-version'
  | 'uninstall-version'
  | 'switch-version'
  | 'set-global'
  | 'set-local'
  | 'refresh-environment'
  | 'detect-versions'
  | 'update-config';

/**
 * Version management operation status
 */
export interface VersionManagementOperationStatus {
  /** Operation type */
  operation: VersionManagementOperation;
  /** Current status */
  status: 'idle' | 'running' | 'success' | 'error';
  /** Progress percentage (0-100) */
  progress: number;
  /** Current step description */
  currentStep: string;
  /** Error message (if status is 'error') */
  error?: string;
  /** Result (if status is 'success') */
  result?: IVersionOperationResult;
  /** Start time */
  startTime?: Date;
  /** End time */
  endTime?: Date;
}

/**
 * Version selector filter options
 */
export interface VersionSelectorFilters {
  /** Show only installed versions */
  showOnlyInstalled: boolean;
  /** Show only LTS versions */
  showOnlyLTS: boolean;
  /** Show pre-release versions */
  showPrerelease: boolean;
  /** Search query */
  searchQuery: string;
  /** Version range filter */
  versionRange?: {
    min?: string;
    max?: string;
  };
}

/**
 * Project version configuration UI state
 */
export interface ProjectVersionConfigUI {
  /** Project root path */
  projectRoot: string;
  /** Project name */
  projectName: string;
  /** Whether configuration exists */
  hasConfig: boolean;
  /** Configuration file path */
  configFile?: string;
  /** Tool versions */
  versions: Record<VersionedTool, {
    version: VersionSpecifier;
    isInstalled: boolean;
    isActive: boolean;
    manager: VersionManagerType;
  }>;
  /** Environment variables */
  environment: Record<string, string>;
  /** Whether configuration is inherited */
  inherited: boolean;
  /** Parent configuration (if inherited) */
  parentConfig?: ProjectVersionConfigUI;
  /** Validation errors */
  validationErrors: string[];
  /** Whether configuration has unsaved changes */
  hasUnsavedChanges: boolean;
}

/**
 * Props for VersionManagerCard component
 */
export interface VersionManagerCardProps {
  /** Version manager information */
  manager: VersionManagerUI;
  /** Whether this manager is selected */
  isSelected: boolean;
  /** Selection change handler */
  onToggle: (managerType: VersionManagerType, selected: boolean) => void;
  /** Install manager handler */
  onInstall: (managerType: VersionManagerType) => void;
  /** Configure manager handler */
  onConfigure: (managerType: VersionManagerType) => void;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Current operation status */
  operationStatus?: VersionManagementOperationStatus;
}

/**
 * Props for VersionSelector component
 */
export interface VersionSelectorProps {
  /** Tool to select version for */
  tool: VersionedTool;
  /** Available versions */
  versions: ToolVersionUI[];
  /** Currently selected version */
  selectedVersion?: string;
  /** Version selection handler */
  onVersionSelect: (tool: VersionedTool, version: string) => void;
  /** Version installation handler */
  onVersionInstall: (tool: VersionedTool, version: string, options?: VersionInstallOptions) => void;
  /** Version uninstall handler */
  onVersionUninstall: (tool: VersionedTool, version: string) => void;
  /** Filter options */
  filters: VersionSelectorFilters;
  /** Filter change handler */
  onFiltersChange: (filters: VersionSelectorFilters) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string;
}

/**
 * Props for VersionManagerPanel component
 */
export interface VersionManagerPanelProps {
  /** Available version managers */
  managers: VersionManagerUI[];
  /** Available tools */
  tools: VersionedTool[];
  /** Tool versions by tool */
  toolVersions: Record<VersionedTool, ToolVersionUI[]>;
  /** Currently selected tool */
  selectedTool?: VersionedTool;
  /** Tool selection handler */
  onToolSelect: (tool: VersionedTool) => void;
  /** Manager operation handler */
  onManagerOperation: (operation: VersionManagementOperation, manager: VersionManagerType, data?: unknown) => void;
  /** Version operation handler */
  onVersionOperation: (operation: VersionManagementOperation, tool: VersionedTool, version?: string, data?: unknown) => void;
  /** Current operation statuses */
  operationStatuses: Record<string, VersionManagementOperationStatus>;
  /** Whether the panel is visible */
  isVisible: boolean;
  /** Panel close handler */
  onClose: () => void;
}

/**
 * Props for VersionInstallationProgress component
 */
export interface VersionInstallationProgressProps {
  /** Installation progress information */
  progress: VersionInstallProgress;
  /** Whether installation is active */
  isActive: boolean;
  /** Cancel installation handler */
  onCancel?: () => void;
  /** Installation completion handler */
  onComplete?: (result: IVersionOperationResult) => void;
  /** Installation error handler */
  onError?: (error: string) => void;
}

/**
 * Props for ProjectVersionConfig component
 */
export interface ProjectVersionConfigProps {
  /** Project configuration */
  config: ProjectVersionConfigUI;
  /** Available tools */
  availableTools: VersionedTool[];
  /** Available versions by tool */
  availableVersions: Record<VersionedTool, ToolVersionUI[]>;
  /** Configuration change handler */
  onConfigChange: (config: ProjectVersionConfigUI) => void;
  /** Save configuration handler */
  onSave: () => void;
  /** Reset configuration handler */
  onReset: () => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string;
}

/**
 * Props for VersionManagerSettings component
 */
export interface VersionManagerSettingsProps {
  /** Version manager configurations */
  configs: Record<VersionManagerType, VersionManagerConfig>;
  /** Configuration change handler */
  onConfigChange: (managerType: VersionManagerType, config: Partial<VersionManagerConfig>) => void;
  /** Save settings handler */
  onSave: () => void;
  /** Reset settings handler */
  onReset: () => void;
  /** Import settings handler */
  onImport?: (file: File) => void;
  /** Export settings handler */
  onExport?: () => void;
  /** Whether settings are being saved */
  isSaving?: boolean;
  /** Error message */
  error?: string;
}

/**
 * Version management state
 */
export interface VersionManagementState {
  /** Available version managers */
  managers: VersionManagerUI[];
  /** Available tools */
  tools: VersionedTool[];
  /** Tool versions by tool */
  toolVersions: Record<VersionedTool, ToolVersionUI[]>;
  /** Currently selected tool */
  selectedTool?: VersionedTool;
  /** Current project configuration */
  projectConfig?: ProjectVersionConfigUI;
  /** Version manager configurations */
  managerConfigs: Record<VersionManagerType, VersionManagerConfig>;
  /** Current operation statuses */
  operationStatuses: Record<string, VersionManagementOperationStatus>;
  /** Version selector filters */
  filters: VersionSelectorFilters;
  /** Whether the system is loading */
  isLoading: boolean;
  /** Error message */
  error?: string;
  /** Whether the version management panel is visible */
  isPanelVisible: boolean;
}

/**
 * Version management actions
 */
export type VersionManagementAction =
  | { type: 'SET_MANAGERS'; payload: VersionManagerUI[] }
  | { type: 'SET_TOOLS'; payload: VersionedTool[] }
  | { type: 'SET_TOOL_VERSIONS'; payload: Record<VersionedTool, ToolVersionUI[]> }
  | { type: 'SELECT_TOOL'; payload: VersionedTool }
  | { type: 'SET_PROJECT_CONFIG'; payload: ProjectVersionConfigUI }
  | { type: 'SET_MANAGER_CONFIGS'; payload: Record<VersionManagerType, VersionManagerConfig> }
  | { type: 'SET_OPERATION_STATUS'; payload: { key: string; status: VersionManagementOperationStatus } }
  | { type: 'SET_FILTERS'; payload: VersionSelectorFilters }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'SET_PANEL_VISIBLE'; payload: boolean }
  | { type: 'UPDATE_MANAGER'; payload: { type: VersionManagerType; updates: Partial<VersionManagerUI> } }
  | { type: 'UPDATE_TOOL_VERSION'; payload: { tool: VersionedTool; version: string; updates: Partial<ToolVersionUI> } };

/**
 * Version management context
 */
export interface VersionManagementContextValue {
  /** Current state */
  state: VersionManagementState;
  /** Dispatch action */
  dispatch: (action: VersionManagementAction) => void;
  /** Manager operations */
  managerOperations: {
    installManager: (type: VersionManagerType) => Promise<void>;
    configureManager: (type: VersionManagerType, config: Partial<VersionManagerConfig>) => Promise<void>;
    refreshManager: (type: VersionManagerType) => Promise<void>;
  };
  /** Version operations */
  versionOperations: {
    installVersion: (tool: VersionedTool, version: string, options?: VersionInstallOptions) => Promise<void>;
    uninstallVersion: (tool: VersionedTool, version: string) => Promise<void>;
    switchVersion: (tool: VersionedTool, version: string, scope?: 'global' | 'local' | 'shell') => Promise<void>;
    refreshVersions: (tool: VersionedTool) => Promise<void>;
  };
  /** Project operations */
  projectOperations: {
    loadProjectConfig: (projectRoot: string) => Promise<void>;
    saveProjectConfig: (config: ProjectVersionConfigUI) => Promise<void>;
    applyProjectConfig: (config: ProjectVersionConfigUI) => Promise<void>;
  };
} 