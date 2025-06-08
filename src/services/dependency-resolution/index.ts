/**
 * Dependency Resolution Module
 * Clean API exports for dependency graph functionality
 */

// Core implementation exports
export { DependencyGraph } from './dependency-graph.js';
export { 
  DependencyGraphBuilder, 
  createDependencyGraphBuilder,
  buildGraphFromManifests,
  buildGraphFromCategory,
  buildGraphFromMaster,
  type GraphConstructionResult,
  type GraphConstructionContext
} from './graph-builder.js';
export {
  DependencyResolver,
  createDependencyResolver,
  resolveInstallationOrder,
  resolveWithConflicts,
  type ResolutionOptions,
  type InstallationOrder,
  type ResolutionContext
} from './dependency-resolver.js';
export {
  AdvancedDependencyResolver,
  createAdvancedDependencyResolver,
  type VersionResolutionResult,
  type VersionConflict,
  type ParallelResolutionConfig
} from './advanced-algorithms.js';
export {
  ConflictDetector,
  createConflictDetector,
  detectConflicts,
  type ConflictDetail,
  type ConflictDetectionResult,
  type VersionConflictDetail,
  type CircularDependencyDetail,
  type PlatformIncompatibilityDetail,
  type ConflictResolutionStrategy
} from './conflict-detector.js';
export {
  ConflictResolver,
  createConflictResolver,
  resolveConflicts,
  type ResolutionExecutionResult,
  type ResolutionPolicy,
  type ResolutionContext,
  type VersionPinning,
  type ToolSubstitution,
  type ExecutedResolutionStep
} from './conflict-resolver.js';
export {
  DependencyAwareCategoryInstaller,
  createDependencyAwareCategoryInstaller,
  type DependencyAwareInstallationOptions,
  type EnhancedInstallationOptions,
  type DependencyInstallationResult,
  type DependencyResolutionConfig,
  type NativePackageManagerInfo,
  type NativePackageInfo
} from './dependency-aware-category-installer.js';
export {
  DependencyCLIVisualizer,
  createDependencyCLIVisualizer,
  promptForResolution,
  CLIProgressIndicator,
  type CLIVisualizationOptions,
  type CLIPromptOptions
} from './dependency-cli-visualizer.js';

// Type exports for external consumption
export type {
  // Core graph types
  DependencyGraphNode,
  DependencyGraphEdge,
  EnhancedToolDependency,
  
  // Configuration types
  GraphTraversalConfig,
  GraphValidationConfig,
  GraphConstructionOptions,
  GraphSerializationOptions,
  
  // Status and metadata types
  InstallationStatus,
  NodeVersionInfo,
  PlatformMetadata,
  NodeGraphMetadata,
  EdgeResolutionMetadata,
  
  // Version and constraint types
  VersionConstraint,
  VersionCompatibilityMatrix,
  VersionResolutionMetadata,
  ConstraintType,
  VersionResolutionMethod,
  
  // Conflict and resolution types
  ConflictStatus,
  ConflictResolution,
  ResolutionAction,
  ConflictType,
  ConflictResolutionStrategy,
  ActionType,
  ActionImpact,
  
  // Algorithm and traversal types
  TraversalAlgorithm,
  TraversalState,
  VisitOrder,
  ResolutionStrategy,
  ResolutionResult,
  
  // Performance and statistics types
  GraphStatistics,
  ComplexityMetrics,
  PerformanceConstraints,
  EdgePerformanceMetrics,
  
  // Validation types
  ValidationRule,
  ValidationStrictness,
  
  // Utility types
  PlatformArchitecture,
  ResourceRequirement,
  CompatibilityRule,
  NodeTimestamps,
  GraphExportFormat
} from './types.js';

// Convenience re-exports from manifest types
export type {
  ToolManifest,
  ToolDependency,
  ToolCategory,
  Platform,
  Architecture,
  DependencyType,
  ValidationResult,
  ValidationError
} from '../../shared/manifest-types.js';

// Factory functions and utilities (to be implemented in future subtasks)

// Import types needed for factory functions
import type {
  GraphTraversalConfig,
  GraphValidationConfig,
  GraphConstructionOptions,
  TraversalAlgorithm,
  VisitOrder,
  ValidationStrictness
} from './types.js';
import { DependencyGraph } from './dependency-graph.js';

/**
 * Create a new empty dependency graph
 */
export function createDependencyGraph(): DependencyGraph {
  return new DependencyGraph();
}

/**
 * Default graph traversal configuration
 */
export const DEFAULT_TRAVERSAL_CONFIG: Partial<GraphTraversalConfig> = {
  algorithm: 'dependency-first' as TraversalAlgorithm,
  visitOrder: 'dependency-order' as VisitOrder,
  detectCycles: true,
  performanceConstraints: {
    maxExecutionTime: 30000, // 30 seconds
    maxMemoryUsage: 512, // 512 MB
    maxGraphSize: 10000, // 10k nodes
    enableCaching: true
  }
};

/**
 * Default graph validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: Partial<GraphValidationConfig> = {
  rules: [],
  strictness: 'moderate' as ValidationStrictness,
  crossPlatformValidation: true,
  performanceValidation: true
};

/**
 * Default graph construction options
 */
export const DEFAULT_CONSTRUCTION_OPTIONS: GraphConstructionOptions = {
  includeOptional: true,
  includeSuggested: false,
  maxNodes: 5000,
  validateDuringConstruction: true
};

// Module metadata
export const MODULE_INFO = {
  name: 'dependency-resolution',
  version: '1.0.0',
  description: 'Dependency graph data structures for HatStart tool management',
  author: 'HatStart Development Team',
  capabilities: [
    'Dependency graph construction',
    'Graph traversal algorithms',
    'Cycle detection',
    'Platform compatibility validation',
    'Version constraint resolution',
    'Conflict detection',
    'Conflict resolution strategies',
    'Automated conflict resolution',
    'Interactive resolution planning',
    'Version pinning recommendations',
    'Tool substitution suggestions',
    'CategoryInstaller framework integration',
    'Native package manager integration',
    'Dependency-aware installation',
    'Installation order optimization',
    'Package manager query integration',
    'Performance optimization',
    'Cross-platform support'
  ]
} as const;