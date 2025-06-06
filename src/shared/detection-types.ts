/**
 * System Detection Framework Types
 * Comprehensive type definitions for cross-platform tool detection
 */

export type PlatformType = 'windows' | 'macos' | 'linux';
export type ArchitectureType = 'x64' | 'x86' | 'arm64' | 'arm';

export interface SystemInfo {
  /** Operating system platform */
  platform: PlatformType;
  /** System architecture */
  architecture: ArchitectureType;
  /** OS version string */
  version: string;
  /** Linux distribution name (if applicable) */
  distribution?: string;
  /** Distribution version (if applicable) */
  distributionVersion?: string;
}

export interface DetectionResult {
  /** Tool name */
  name: string;
  /** Whether the tool was found */
  found: boolean;
  /** Version string if detected */
  version?: string;
  /** Installation path */
  path?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Detection method used */
  detectionMethod: DetectionMethod;
  /** Error message if detection failed */
  error?: string;
}

export type DetectionMethod = 
  | 'command' 
  | 'registry' 
  | 'filesystem' 
  | 'package-manager' 
  | 'environment-variable'
  | 'application-folder';

export interface DetectionRule {
  /** Tool name */
  name: string;
  /** Platform-specific detection strategies */
  strategies: PlatformStrategy[];
  /** Category this tool belongs to */
  category: ToolCategory;
  /** Whether this tool is essential for the category */
  essential?: boolean;
}

export interface PlatformStrategy {
  /** Target platform */
  platform: PlatformType;
  /** Detection method */
  method: DetectionMethod;
  /** Command to execute or path to check */
  command?: string;
  /** Arguments for command */
  args?: string[];
  /** Registry key (Windows only) */
  registryKey?: string;
  /** File/directory paths to check */
  paths?: string[];
  /** Environment variable to check */
  envVar?: string;
  /** Expected output pattern for validation */
  expectedPattern?: string;
  /** Version extraction regex */
  versionRegex?: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

export type ToolCategory = 
  | 'programming-languages'
  | 'web-frameworks'
  | 'mobile-frameworks'
  | 'backend-frameworks'
  | 'databases'
  | 'version-control'
  | 'containers'
  | 'cloud-tools'
  | 'ides-editors'
  | 'testing-tools'
  | 'security-tools'
  | 'build-tools'
  | 'package-managers';

export interface CategoryDetectionResult {
  /** Category name */
  category: ToolCategory;
  /** Detection results for tools in this category */
  tools: DetectionResult[];
  /** Category-level summary */
  summary: {
    /** Total tools checked */
    totalChecked: number;
    /** Number of tools found */
    found: number;
    /** Number of essential tools found */
    essentialFound: number;
    /** Number of essential tools missing */
    essentialMissing: number;
  };
}

export interface SystemDetectionReport {
  /** System information */
  systemInfo: SystemInfo;
  /** Timestamp of detection */
  timestamp: Date;
  /** Detection results by category */
  categories: CategoryDetectionResult[];
  /** Overall summary */
  summary: {
    /** Total tools detected across all categories */
    totalFound: number;
    /** Total tools checked */
    totalChecked: number;
    /** Detection success rate */
    successRate: number;
    /** Total detection time in milliseconds */
    detectionTime: number;
  };
  /** Any global errors or warnings */
  errors?: string[];
}

export interface DetectionConfig {
  /** Whether to enable parallel detection */
  parallel: boolean;
  /** Maximum concurrent detections */
  maxConcurrency: number;
  /** Default timeout for commands */
  defaultTimeout: number;
  /** Whether to cache results */
  cacheResults: boolean;
  /** Cache duration in milliseconds */
  cacheDuration: number;
  /** Categories to include in detection */
  includeCategories?: ToolCategory[];
  /** Categories to exclude from detection */
  excludeCategories?: ToolCategory[];
  /** Specific tools to detect */
  includeTools?: string[];
  /** Tools to skip detection for */
  excludeTools?: string[];
  /** Verbosity level for logging */
  verbosity: 'silent' | 'minimal' | 'normal' | 'verbose' | 'debug';
}

export interface DetectionCache {
  /** Cache entries keyed by tool name */
  entries: Map<string, CacheEntry>;
  /** Cache creation timestamp */
  createdAt: Date;
  /** Cache expiration timestamp */
  expiresAt: Date;
}

export interface CacheEntry {
  /** Cached detection result */
  result: DetectionResult;
  /** When this entry was cached */
  cachedAt: Date;
  /** System info when cached (to detect system changes) */
  systemInfo: SystemInfo;
}

export interface DetectionProgress {
  /** Current category being processed */
  currentCategory?: ToolCategory;
  /** Current tool being detected */
  currentTool?: string;
  /** Number of categories completed */
  categoriesCompleted: number;
  /** Total categories to process */
  totalCategories: number;
  /** Number of tools completed */
  toolsCompleted: number;
  /** Total tools to process */
  totalTools: number;
  /** Start time */
  startTime: Date;
  /** Estimated completion time */
  estimatedCompletion?: Date;
}

// Event types for detection progress
export interface DetectionEvents {
  'detection-started': { progress: DetectionProgress };
  'category-started': { category: ToolCategory; progress: DetectionProgress };
  'tool-detected': { tool: string; result: DetectionResult; progress: DetectionProgress };
  'category-completed': { category: ToolCategory; result: CategoryDetectionResult; progress: DetectionProgress };
  'detection-completed': { report: SystemDetectionReport };
  'detection-error': { error: Error; context?: string };
} 