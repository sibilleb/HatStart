/**
 * Dependency Resolution Type Definitions
 * Comprehensive types for dependency graph construction and resolution
 */

import type { 
  ToolManifest, 
  ToolDependency, 
  ToolCategory, 
  Platform, 
  Architecture,
  DependencyType 
} from '../../shared/manifest-types.js';

// Core dependency graph types

/**
 * Represents a node in the dependency graph with enhanced metadata
 */
export interface DependencyGraphNode {
  /** The tool manifest this node represents */
  tool: ToolManifest;
  /** Unique identifier for graph traversal */
  id: string;
  /** Category this tool belongs to */
  category: ToolCategory;
  /** Current installation status */
  installationStatus: InstallationStatus;
  /** Version information for dependency resolution */
  versionInfo: NodeVersionInfo;
  /** Platform-specific metadata */
  platformMetadata: PlatformMetadata;
  /** Graph-specific metadata */
  graphMetadata: NodeGraphMetadata;
}

/**
 * Represents an edge in the dependency graph
 */
export interface DependencyGraphEdge {
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Dependency relationship details */
  dependency: EnhancedToolDependency;
  /** Edge weight for resolution algorithms */
  weight: number;
  /** Platform-specific applicability */
  platforms: Platform[];
  /** Resolution metadata */
  resolutionMetadata: EdgeResolutionMetadata;
}

/**
 * Enhanced tool dependency with additional resolution metadata
 */
export interface EnhancedToolDependency extends ToolDependency {
  /** Dependency strength/priority (0-100) */
  priority: number;
  /** Whether this dependency can be deferred */
  deferrable: boolean;
  /** Installation order hint */
  installationOrder: number;
  /** Conflict resolution strategy */
  conflictResolution: ConflictResolutionStrategy;
  /** Version resolution metadata */
  versionResolution: VersionResolutionMetadata;
}

/**
 * Installation status for a tool
 */
export type InstallationStatus = 
  | 'not-installed'
  | 'installing'
  | 'installed'
  | 'update-available'
  | 'failed'
  | 'conflicted';

/**
 * Version information for graph nodes
 */
export interface NodeVersionInfo {
  /** Currently installed version */
  installedVersion?: string;
  /** Available versions that satisfy dependencies */
  availableVersions: string[];
  /** Resolved version for installation */
  resolvedVersion?: string;
  /** Version constraints from dependencies */
  constraints: VersionConstraint[];
  /** Version compatibility matrix */
  compatibility: VersionCompatibilityMatrix;
}

/**
 * Version constraint representation
 */
export interface VersionConstraint {
  /** Source dependency that imposed this constraint */
  sourceId: string;
  /** Constraint type */
  type: ConstraintType;
  /** Version specification */
  version: string;
  /** Whether this is a hard or soft constraint */
  strict: boolean;
  /** Platform-specific applicability */
  platforms?: Platform[];
}

/**
 * Types of version constraints
 */
export type ConstraintType = 
  | 'exact'          // =1.0.0
  | 'minimum'        // >=1.0.0
  | 'maximum'        // <=2.0.0
  | 'range'          // >=1.0.0 <2.0.0
  | 'compatible'     // ~1.0.0
  | 'latest'         // latest stable
  | 'exclude';       // !=1.5.0

/**
 * Version compatibility matrix for cross-platform support
 */
export interface VersionCompatibilityMatrix {
  /** Platform-specific version mappings */
  platformVersions: Record<Platform, string[]>;
  /** Architecture-specific versions */
  architectureVersions: Record<Architecture, string[]>;
  /** Cross-platform compatibility rules */
  compatibilityRules: CompatibilityRule[];
}

/**
 * Compatibility rule for version resolution
 */
export interface CompatibilityRule {
  /** Rule identifier */
  id: string;
  /** Source platform/arch */
  source: PlatformArchitecture;
  /** Target platform/arch */
  target: PlatformArchitecture;
  /** Version mapping function */
  versionMapping: string;
  /** Rule priority */
  priority: number;
}

/**
 * Platform and architecture combination
 */
export interface PlatformArchitecture {
  platform: Platform;
  architecture: Architecture;
}

/**
 * Platform-specific metadata for nodes
 */
export interface PlatformMetadata {
  /** Supported platforms */
  supportedPlatforms: Platform[];
  /** Platform-specific installation methods */
  installationMethods: Record<Platform, string[]>;
  /** Platform-specific dependencies */
  platformDependencies: Record<Platform, string[]>;
  /** Resource requirements per platform */
  resourceRequirements: Record<Platform, ResourceRequirement>;
}

/**
 * Resource requirements for installation
 */
export interface ResourceRequirement {
  /** Minimum memory in MB */
  minMemory: number;
  /** Minimum disk space in MB */
  minDiskSpace: number;
  /** Network requirements */
  networkRequired: boolean;
  /** Administrative privileges required */
  requiresAdmin: boolean;
}

/**
 * Node-specific graph metadata
 */
export interface NodeGraphMetadata {
  /** Topological sort order */
  topologicalOrder?: number;
  /** Depth in dependency tree */
  depth: number;
  /** Number of dependents */
  dependentCount: number;
  /** Number of dependencies */
  dependencyCount: number;
  /** Critical path indicator */
  onCriticalPath: boolean;
  /** Graph traversal state */
  traversalState: TraversalState;
  /** Resolution timestamps */
  timestamps: NodeTimestamps;
}

/**
 * Graph traversal state for algorithms
 */
export type TraversalState = 
  | 'unvisited'
  | 'visiting'
  | 'visited'
  | 'resolved'
  | 'failed';

/**
 * Timestamps for resolution tracking
 */
export interface NodeTimestamps {
  /** When node was discovered */
  discovered?: number;
  /** When resolution started */
  resolutionStarted?: number;
  /** When resolution completed */
  resolutionCompleted?: number;
  /** Last installation attempt */
  lastInstallAttempt?: number;
}

/**
 * Edge resolution metadata
 */
export interface EdgeResolutionMetadata {
  /** Resolution attempt count */
  resolutionAttempts: number;
  /** Last resolution result */
  lastResolutionResult: ResolutionResult;
  /** Resolution strategy used */
  resolutionStrategy: ResolutionStrategy;
  /** Conflict detection results */
  conflictStatus: ConflictStatus;
  /** Performance metrics */
  performanceMetrics: EdgePerformanceMetrics;
}

/**
 * Resolution result for dependencies
 */
export type ResolutionResult = 
  | 'pending'
  | 'satisfied'
  | 'unsatisfied'
  | 'conflicted'
  | 'deferred'
  | 'failed';

/**
 * Resolution strategy for dependencies
 */
export type ResolutionStrategy = 
  | 'eager'          // Resolve immediately
  | 'lazy'           // Resolve when needed
  | 'conservative'   // Use most stable versions
  | 'aggressive'     // Use latest versions
  | 'minimal'        // Minimal set of dependencies
  | 'optimal';       // Best overall solution

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy = 
  | 'fail-fast'      // Fail on first conflict
  | 'skip'           // Skip conflicting dependencies
  | 'override'       // Use newer version
  | 'downgrade'      // Use older compatible version
  | 'isolate'        // Install in isolation
  | 'user-choice';   // Prompt user for decision

/**
 * Conflict status for edges
 */
export interface ConflictStatus {
  /** Whether there's a conflict */
  hasConflict: boolean;
  /** Conflicting dependencies */
  conflictsWith: string[];
  /** Conflict type */
  conflictType: ConflictType;
  /** Suggested resolution */
  suggestedResolution?: ConflictResolution;
}

/**
 * Types of dependency conflicts
 */
export type ConflictType = 
  | 'version'        // Version incompatibility
  | 'platform'       // Platform incompatibility
  | 'circular'       // Circular dependency
  | 'mutual-exclusion' // Tools that can't coexist
  | 'resource'       // Resource conflict
  | 'configuration'; // Configuration conflict

/**
 * Conflict resolution suggestion
 */
export interface ConflictResolution {
  /** Resolution strategy */
  strategy: ConflictResolutionStrategy;
  /** Recommended actions */
  actions: ResolutionAction[];
  /** Estimated success probability */
  successProbability: number;
  /** Alternative resolutions */
  alternatives: ConflictResolution[];
}

/**
 * Resolution action to resolve conflicts
 */
export interface ResolutionAction {
  /** Action type */
  type: ActionType;
  /** Target tool ID */
  targetId: string;
  /** Action parameters */
  parameters: Record<string, unknown>;
  /** Action description */
  description: string;
  /** Estimated impact */
  impact: ActionImpact;
}

/**
 * Types of resolution actions
 */
export type ActionType = 
  | 'install'
  | 'uninstall'
  | 'upgrade'
  | 'downgrade'
  | 'configure'
  | 'isolate'
  | 'defer';

/**
 * Impact assessment for actions
 */
export interface ActionImpact {
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high';
  /** Estimated time in minutes */
  estimatedTime: number;
  /** Affects existing installations */
  affectsExisting: boolean;
  /** Requires user interaction */
  requiresUserInteraction: boolean;
}

/**
 * Performance metrics for edges
 */
export interface EdgePerformanceMetrics {
  /** Resolution time in ms */
  resolutionTime: number;
  /** Memory usage during resolution */
  memoryUsage: number;
  /** Network requests made */
  networkRequests: number;
  /** Cache hit rate */
  cacheHitRate: number;
}

/**
 * Version resolution metadata
 */
export interface VersionResolutionMetadata {
  /** Resolved version */
  resolvedVersion?: string;
  /** Resolution confidence (0-100) */
  confidence: number;
  /** Resolution method used */
  resolutionMethod: VersionResolutionMethod;
  /** Fallback versions */
  fallbackVersions: string[];
  /** Resolution constraints applied */
  appliedConstraints: VersionConstraint[];
}

/**
 * Methods for version resolution
 */
export type VersionResolutionMethod = 
  | 'exact-match'
  | 'semantic-versioning'
  | 'latest-compatible'
  | 'user-specified'
  | 'heuristic'
  | 'fallback';

// Graph algorithm types

/**
 * Graph traversal configuration
 */
export interface GraphTraversalConfig {
  /** Traversal algorithm */
  algorithm: TraversalAlgorithm;
  /** Starting nodes */
  startNodes: string[];
  /** Maximum depth */
  maxDepth?: number;
  /** Visit order preference */
  visitOrder: VisitOrder;
  /** Cycle detection enabled */
  detectCycles: boolean;
  /** Performance constraints */
  performanceConstraints: PerformanceConstraints;
}

/**
 * Graph traversal algorithms
 */
export type TraversalAlgorithm = 
  | 'depth-first'
  | 'breadth-first'
  | 'topological'
  | 'dijkstra'
  | 'dependency-first'
  | 'category-first';

/**
 * Visit order preferences
 */
export type VisitOrder = 
  | 'dependency-order'   // Dependencies before dependents
  | 'category-order'     // Category-based grouping
  | 'priority-order'     // Priority-based ordering
  | 'alphabetical'       // Alphabetical ordering
  | 'custom';            // Custom ordering function

/**
 * Performance constraints for algorithms
 */
export interface PerformanceConstraints {
  /** Maximum execution time in ms */
  maxExecutionTime: number;
  /** Maximum memory usage in MB */
  maxMemoryUsage: number;
  /** Maximum graph size (nodes) */
  maxGraphSize: number;
  /** Enable result caching */
  enableCaching: boolean;
}

/**
 * Graph validation configuration
 */
export interface GraphValidationConfig {
  /** Validation rules to apply */
  rules: ValidationRule[];
  /** Strictness level */
  strictness: ValidationStrictness;
  /** Cross-platform validation */
  crossPlatformValidation: boolean;
  /** Performance validation */
  performanceValidation: boolean;
}

/**
 * Validation rules for graphs
 */
export interface ValidationRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Validation function */
  validator: string; // Function name or expression
  /** Rule severity */
  severity: 'error' | 'warning' | 'info';
  /** Platforms this rule applies to */
  platforms?: Platform[];
}

/**
 * Validation strictness levels
 */
export type ValidationStrictness = 
  | 'strict'    // All rules must pass
  | 'moderate'  // Warnings allowed
  | 'permissive'; // Only errors fail validation

/**
 * Graph statistics for analysis
 */
export interface GraphStatistics {
  /** Total number of nodes */
  nodeCount: number;
  /** Total number of edges */
  edgeCount: number;
  /** Maximum depth */
  maxDepth: number;
  /** Average degree */
  averageDegree: number;
  /** Strongly connected components */
  stronglyConnectedComponents: number;
  /** Critical path length */
  criticalPathLength: number;
  /** Category distribution */
  categoryDistribution: Record<ToolCategory, number>;
  /** Platform coverage */
  platformCoverage: Record<Platform, number>;
  /** Complexity metrics */
  complexityMetrics: ComplexityMetrics;
}

/**
 * Complexity metrics for graphs
 */
export interface ComplexityMetrics {
  /** Cyclomatic complexity */
  cyclomaticComplexity: number;
  /** Dependency density */
  dependencyDensity: number;
  /** Fan-in/fan-out ratios */
  fanInOutRatio: number;
  /** Modularity score */
  modularityScore: number;
  /** Clustering coefficient */
  clusteringCoefficient: number;
}

// Export utility types

/**
 * Graph construction options
 */
export interface GraphConstructionOptions {
  /** Include optional dependencies */
  includeOptional: boolean;
  /** Include suggested dependencies */
  includeSuggested: boolean;
  /** Platform filter */
  platformFilter?: Platform[];
  /** Category filter */
  categoryFilter?: ToolCategory[];
  /** Maximum graph size */
  maxNodes?: number;
  /** Validation during construction */
  validateDuringConstruction: boolean;
}

/**
 * Graph export format
 */
export type GraphExportFormat = 
  | 'json'
  | 'graphviz'
  | 'cytoscape'
  | 'networkx'
  | 'adjacency-matrix'
  | 'edge-list';

/**
 * Graph import/export options
 */
export interface GraphSerializationOptions {
  /** Export format */
  format: GraphExportFormat;
  /** Include metadata */
  includeMetadata: boolean;
  /** Include performance data */
  includePerformanceData: boolean;
  /** Compression enabled */
  compressed: boolean;
  /** Pretty formatting */
  prettyFormat: boolean;
}