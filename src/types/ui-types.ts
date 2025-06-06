/**
 * UI Types for HatStart Application
 * Defines interfaces for category-based tool selection UI components
 */

/**
 * Represents a development tool that can be installed
 */
export interface Tool {
  id: string;
  name: string;
  description: string;
  version?: string;
  isInstalled: boolean;
  isRecommended?: boolean;
  category: ToolCategory;
  installationUrl?: string;
  documentationUrl?: string;
  icon?: string;
  tags?: string[];
  dependencies?: string[];
  platforms: Platform[];
  size?: string;
  installationTime?: string;
}

/**
 * Tool categories that organize tools into logical groups
 */
export type ToolCategory = 
  | 'programming-languages'
  | 'code-editors'
  | 'version-control'
  | 'databases'
  | 'containerization'
  | 'cloud-tools'
  | 'api-tools'
  | 'terminal'
  | 'browsers'
  | 'design-tools'
  | 'productivity'
  | 'security'
  | 'frameworks';

/**
 * Platform types supported by the application
 */
export type Platform = 'windows' | 'macos' | 'linux';

/**
 * Category information with display metadata
 */
export interface CategoryInfo {
  id: ToolCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  tools: Tool[];
  isExpanded?: boolean;
  recommendedCount?: number;
  installedCount?: number;
}

/**
 * User's tool selection state
 */
export interface ToolSelection {
  selectedTools: Set<string>;
  deselectedRecommendations: Set<string>;
  customSelections: Set<string>;
}

/**
 * Installation status for tools
 */
export type InstallationStatus = 
  | 'not-installed'
  | 'installing'
  | 'installed'
  | 'failed'
  | 'updating';

/**
 * Tool with installation status
 */
export interface ToolWithStatus extends Tool {
  installationStatus: InstallationStatus;
  installationProgress?: number;
  installationError?: string;
}

/**
 * Filter and search options
 */
export interface FilterOptions {
  searchQuery: string;
  showOnlyRecommended: boolean;
  showOnlyNotInstalled: boolean;
  selectedCategories: Set<ToolCategory>;
  selectedPlatforms: Set<Platform>;
}

/**
 * Props for CategoryCard component
 */
export interface CategoryCardProps {
  category: CategoryInfo;
  isExpanded: boolean;
  onToggle: (categoryId: ToolCategory) => void;
  selection: ToolSelection;
  onSelectionChange: (selection: ToolSelection) => void;
  filterOptions: FilterOptions;
}

/**
 * Props for SelectableItemCard component
 */
export interface SelectableItemCardProps {
  tool: ToolWithStatus;
  isSelected: boolean;
  onToggle: (toolId: string, selected: boolean) => void;
  onInstall?: (toolId: string) => void;
  disabled?: boolean;
}

/**
 * Props for CategoryGrid component
 */
export interface CategoryGridProps {
  categories: CategoryInfo[];
  expandedCategories: Set<ToolCategory>;
  onCategoryToggle: (categoryId: ToolCategory) => void;
  selection: ToolSelection;
  onSelectionChange: (selection: ToolSelection) => void;
  filterOptions: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

/**
 * Recommendation with additional context
 */
export interface RecommendedTool extends Tool {
  recommendationReason: 'essential' | 'suggested' | 'popular';
  detectedAsInstalled?: boolean;
  popularWith?: string;
  requiredFor?: string;
  suggestedFor?: string;
}

/**
 * Props for RecommendationPanel component
 */
export interface RecommendationPanelProps {
  recommendations: RecommendedTool[];
  selection: ToolSelection;
  onSelectionChange: (selection: ToolSelection) => void;
  onAcceptAll?: () => void;
  onDismiss: () => void;
  detectedEnvironment?: string;
  isVisible?: boolean;
}

/**
 * Installation progress information
 */
export interface InstallationProgress {
  isInstalling: boolean;
  currentTool: string;
  completed: number;
  total: number;
  errors?: string[];
}

/**
 * Props for SelectionSummary component
 */
export interface SelectionSummaryProps {
  selection: ToolSelection;
  tools: Tool[];
  onInstallSelected: (toolIds: string[]) => void;
  onClearSelection: () => void;
  onExportSelection?: () => void;
  installationProgress?: InstallationProgress;
  estimatedTime?: string;
  estimatedSize?: string;
  isVisible?: boolean;
  position?: 'bottom' | 'bottom-right' | 'bottom-left' | 'floating';
}

/**
 * Theme and UI configuration
 */
export interface UITheme {
  mode: 'light' | 'dark';
  accentColor: string;
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  animations: boolean;
}

/**
 * Application state for the main UI
 */
export interface AppState {
  categories: CategoryInfo[];
  tools: ToolWithStatus[];
  selection: ToolSelection;
  filterOptions: FilterOptions;
  expandedCategories: Set<ToolCategory>;
  theme: UITheme;
  isLoading: boolean;
  error?: string;
}

/**
 * Action types for state management
 */
export type AppAction =
  | { type: 'SET_CATEGORIES'; payload: CategoryInfo[] }
  | { type: 'SET_TOOLS'; payload: ToolWithStatus[] }
  | { type: 'UPDATE_SELECTION'; payload: ToolSelection }
  | { type: 'UPDATE_FILTERS'; payload: FilterOptions }
  | { type: 'TOGGLE_CATEGORY'; payload: ToolCategory }
  | { type: 'SET_THEME'; payload: UITheme }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'UPDATE_TOOL_STATUS'; payload: { toolId: string; status: InstallationStatus; progress?: number; error?: string } }; 