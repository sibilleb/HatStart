/**
 * Advanced Dependency Resolution Algorithms
 * Specialized algorithms for complex dependency scenarios
 */

import type {
  DependencyGraph,
  DependencyGraphNode,
  DependencyGraphEdge,
  VersionConstraint,
  ConflictResolution,
  ResolutionStrategy
} from './types.js';

import type {
  ToolManifest,
  Platform,
  Architecture,
  DependencyType
} from '../../shared/manifest-types.js';

import { DependencyResolver, type InstallationOrder, type ResolutionOptions } from './dependency-resolver.js';

/**
 * Version-aware resolution result
 */
export interface VersionResolutionResult {
  /** Resolved tool versions */
  resolvedVersions: Map<string, string>;
  /** Version conflicts detected */
  versionConflicts: VersionConflict[];
  /** Resolution success status */
  success: boolean;
  /** Applied resolution strategies */
  appliedStrategies: string[];
  /** Warnings about version choices */
  warnings: string[];
}

/**
 * Version conflict information
 */
export interface VersionConflict {
  /** Tool ID with version conflict */
  toolId: string;
  /** Conflicting version requirements */
  conflictingRequirements: {
    requiredBy: string;
    versionConstraint: string;
  }[];
  /** Suggested resolution */
  suggestedResolution?: string;
  /** Conflict severity */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Parallel resolution configuration
 */
export interface ParallelResolutionConfig {
  /** Maximum number of parallel workers */
  maxWorkers: number;
  /** Batch size for parallel processing */
  batchSize: number;
  /** Timeout for individual batch processing */
  batchTimeout: number;
  /** Whether to fail fast on first error */
  failFast: boolean;
}

/**
 * Advanced dependency resolution algorithms
 */
export class AdvancedDependencyResolver extends DependencyResolver {
  private versionCache: Map<string, VersionResolutionResult> = new Map();

  /**
   * Resolve dependencies with version constraint satisfaction
   */
  public async resolveWithVersionConstraints(
    targetTools: string[],
    options: ResolutionOptions = {}
  ): Promise<InstallationOrder & { versionResolution: VersionResolutionResult }> {
    // First perform standard resolution
    const standardResult = await this.resolveTopological(targetTools, options);
    
    if (!standardResult.success) {
      return {
        ...standardResult,
        versionResolution: {
          resolvedVersions: new Map(),
          versionConflicts: [],
          success: false,
          appliedStrategies: [],
          warnings: ['Standard resolution failed, skipping version resolution']
        }
      };
    }

    // Then resolve version constraints
    const versionResolution = await this.resolveVersionConstraints(
      standardResult.installationSequence,
      options
    );

    // If version resolution failed, attempt conflict resolution
    if (!versionResolution.success) {
      const conflictResolvedVersions = await this.resolveVersionConflicts(
        versionResolution.versionConflicts,
        options
      );
      
      if (conflictResolvedVersions.success) {
        versionResolution.resolvedVersions = conflictResolvedVersions.resolvedVersions;
        versionResolution.success = true;
        versionResolution.appliedStrategies.push(...conflictResolvedVersions.appliedStrategies);
      }
    }

    return {
      ...standardResult,
      versionResolution
    };
  }

  /**
   * Resolve dependencies with parallel processing for large graphs
   */
  public async resolveParallel(
    targetTools: string[],
    config: ParallelResolutionConfig,
    options: ResolutionOptions = {}
  ): Promise<InstallationOrder> {
    const startTime = Date.now();

    try {
      // Split target tools into batches
      const batches = this.createTargetBatches(targetTools, config.batchSize);
      const results: InstallationOrder[] = [];

      // Process batches in parallel (simulated with concurrent promises)
      const batchPromises = batches.map(async (batch, index) => {
        const batchStartTime = Date.now();
        
        try {
          const batchResult = await Promise.race([
            this.resolveTopological(batch, options),
            this.createTimeoutPromise(config.batchTimeout)
          ]);

          if (batchResult instanceof Error) {
            throw batchResult;
          }

          return {
            ...batchResult,
            batchIndex: index,
            batchTime: Date.now() - batchStartTime
          };
        } catch (error) {
          if (config.failFast) {
            throw error;
          }
          return this.createFailureResult(`Batch ${index} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      // Wait for all batches to complete
      const batchResults = await Promise.allSettled(batchPromises);

      // Collect successful results
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value.success) {
          results.push(result.value);
        } else if (config.failFast) {
          const error = result.status === 'rejected' ? result.reason : result.value.errors[0];
          return this.createFailureResult(`Parallel resolution failed: ${error}`);
        }
      }

      // Merge results from all successful batches
      const mergedResult = this.mergeBatchResults(results);
      mergedResult.warnings.push(`Processed ${batches.length} batches in parallel`);

      return mergedResult;

    } catch (error) {
      return this.createFailureResult(`Parallel resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Intelligent dependency resolution with learning
   */
  public async resolveIntelligent(
    targetTools: string[],
    options: ResolutionOptions = {}
  ): Promise<InstallationOrder & { intelligenceMetrics: IntelligenceMetrics }> {
    const startTime = Date.now();
    
    // Analyze dependency patterns
    const patterns = this.analyzeDependencyPatterns(targetTools);
    
    // Choose optimal algorithm based on graph characteristics
    const algorithm = this.selectOptimalAlgorithm(patterns);
    
    // Apply algorithm with adaptive parameters
    let result: InstallationOrder;
    switch (algorithm) {
      case 'topological':
        result = await this.resolveTopological(targetTools, options);
        break;
      case 'dfs':
        result = await this.resolveDFS(targetTools, options);
        break;
      case 'bfs':
        result = await this.resolveBFS(targetTools, options);
        break;
      default:
        result = await this.resolveTopological(targetTools, options);
    }

    // Learn from this resolution for future optimizations
    const metrics = this.updateLearningMetrics(patterns, algorithm, result, Date.now() - startTime);

    return {
      ...result,
      intelligenceMetrics: metrics
    };
  }

  /**
   * Resolve with dependency substitution (alternative tools)
   */
  public async resolveWithSubstitutions(
    targetTools: string[],
    substitutionMap: Map<string, string[]>,
    options: ResolutionOptions = {}
  ): Promise<InstallationOrder & { substitutions: Map<string, string> }> {
    const appliedSubstitutions = new Map<string, string>();
    
    // Try initial resolution
    let result = await this.resolveTopological(targetTools, options);
    
    // If failed, try substitutions
    if (!result.success) {
      for (const [originalTool, alternatives] of substitutionMap) {
        if (targetTools.includes(originalTool)) {
          for (const alternative of alternatives) {
            const modifiedTargets = targetTools.map(tool => 
              tool === originalTool ? alternative : tool
            );
            
            const substitutionResult = await this.resolveTopological(modifiedTargets, options);
            
            if (substitutionResult.success) {
              appliedSubstitutions.set(originalTool, alternative);
              result = substitutionResult;
              result.warnings.push(`Substituted ${originalTool} with ${alternative}`);
              break;
            }
          }
          
          if (result.success) break;
        }
      }
    }

    return {
      ...result,
      substitutions: appliedSubstitutions
    };
  }

  // Private helper methods

  private async resolveVersionConstraints(
    toolSequence: string[],
    options: ResolutionOptions
  ): Promise<VersionResolutionResult> {
    const resolvedVersions = new Map<string, string>();
    const versionConflicts: VersionConflict[] = [];
    const appliedStrategies: string[] = [];

    for (const toolId of toolSequence) {
      const node = this.graph.getNode(toolId);
      if (!node) continue;

      // Collect version constraints from all dependencies
      const constraints = this.collectVersionConstraints(toolId);
      
      if (constraints.length === 0) {
        // No constraints, use latest stable version
        resolvedVersions.set(toolId, node.tool.version.stable);
        continue;
      }

      // Try to find a version that satisfies all constraints
      const satisfyingVersion = this.findSatisfyingVersion(node, constraints);
      
      if (satisfyingVersion) {
        resolvedVersions.set(toolId, satisfyingVersion);
        appliedStrategies.push(`constraint-satisfaction:${toolId}`);
      } else {
        // Record conflict
        versionConflicts.push({
          toolId,
          conflictingRequirements: constraints.map(c => ({
            requiredBy: c.sourceId,
            versionConstraint: c.version
          })),
          severity: 'error'
        });
      }
    }

    return {
      resolvedVersions,
      versionConflicts,
      success: versionConflicts.length === 0,
      appliedStrategies,
      warnings: []
    };
  }

  private async resolveVersionConflicts(
    conflicts: VersionConflict[],
    options: ResolutionOptions
  ): Promise<VersionResolutionResult> {
    const resolvedVersions = new Map<string, string>();
    const appliedStrategies: string[] = [];

    for (const conflict of conflicts) {
      const node = this.graph.getNode(conflict.toolId);
      if (!node) continue;

      // Apply conflict resolution strategy
      let resolvedVersion: string | null = null;

      // Strategy 1: Use latest version that satisfies most constraints
      resolvedVersion = this.findBestCompromiseVersion(node, conflict);
      if (resolvedVersion) {
        appliedStrategies.push(`compromise-version:${conflict.toolId}`);
      }

      // Strategy 2: Use recommended version if available
      if (!resolvedVersion && node.tool.version.recommended) {
        resolvedVersion = node.tool.version.recommended;
        appliedStrategies.push(`recommended-version:${conflict.toolId}`);
      }

      // Strategy 3: Fall back to stable version
      if (!resolvedVersion) {
        resolvedVersion = node.tool.version.stable;
        appliedStrategies.push(`fallback-stable:${conflict.toolId}`);
      }

      resolvedVersions.set(conflict.toolId, resolvedVersion);
    }

    return {
      resolvedVersions,
      versionConflicts: [],
      success: true,
      appliedStrategies,
      warnings: [`Resolved ${conflicts.length} version conflicts using fallback strategies`]
    };
  }

  private collectVersionConstraints(toolId: string): VersionConstraint[] {
    const constraints: VersionConstraint[] = [];
    const incomingEdges = this.graph.getIncomingEdges(toolId);

    for (const edge of incomingEdges) {
      const { dependency } = edge;
      
      if (dependency.minVersion) {
        constraints.push({
          sourceId: edge.from,
          type: 'minimum',
          version: dependency.minVersion,
          strict: dependency.type === 'required',
          platforms: dependency.platforms
        });
      }

      if (dependency.maxVersion) {
        constraints.push({
          sourceId: edge.from,
          type: 'maximum',
          version: dependency.maxVersion,
          strict: dependency.type === 'required',
          platforms: dependency.platforms
        });
      }
    }

    return constraints;
  }

  private findSatisfyingVersion(
    node: DependencyGraphNode,
    constraints: VersionConstraint[]
  ): string | null {
    const availableVersions = node.versionInfo.availableVersions;
    
    for (const version of availableVersions) {
      if (this.versionSatisfiesConstraints(version, constraints)) {
        return version;
      }
    }

    return null;
  }

  private versionSatisfiesConstraints(
    version: string,
    constraints: VersionConstraint[]
  ): boolean {
    for (const constraint of constraints) {
      if (!this.versionSatisfiesConstraint(version, constraint)) {
        return false;
      }
    }
    return true;
  }

  private versionSatisfiesConstraint(
    version: string,
    constraint: VersionConstraint
  ): boolean {
    // Simplified version comparison (would use semver in real implementation)
    const versionNum = this.parseVersionNumber(version);
    const constraintNum = this.parseVersionNumber(constraint.version);

    switch (constraint.type) {
      case 'minimum':
        return versionNum >= constraintNum;
      case 'maximum':
        return versionNum <= constraintNum;
      case 'exact':
        return versionNum === constraintNum;
      default:
        return true;
    }
  }

  private parseVersionNumber(version: string): number {
    // Simplified version parsing (would use proper semver parsing)
    const parts = version.split('.').map(p => parseInt(p.replace(/\D/g, ''), 10) || 0);
    return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
  }

  private findBestCompromiseVersion(
    node: DependencyGraphNode,
    conflict: VersionConflict
  ): string | null {
    // Find version that satisfies the most constraints
    const availableVersions = node.versionInfo.availableVersions;
    let bestVersion: string | null = null;
    let maxSatisfiedConstraints = 0;

    for (const version of availableVersions) {
      let satisfiedCount = 0;
      
      for (const req of conflict.conflictingRequirements) {
        // Simplified constraint checking
        if (this.versionMatchesConstraint(version, req.versionConstraint)) {
          satisfiedCount++;
        }
      }

      if (satisfiedCount > maxSatisfiedConstraints) {
        maxSatisfiedConstraints = satisfiedCount;
        bestVersion = version;
      }
    }

    return bestVersion;
  }

  private versionMatchesConstraint(version: string, constraint: string): boolean {
    // Simplified constraint matching
    if (constraint.startsWith('>=')) {
      const minVersion = constraint.substring(2);
      return this.parseVersionNumber(version) >= this.parseVersionNumber(minVersion);
    }
    if (constraint.startsWith('<=')) {
      const maxVersion = constraint.substring(2);
      return this.parseVersionNumber(version) <= this.parseVersionNumber(maxVersion);
    }
    return version === constraint;
  }

  private createTargetBatches(targets: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < targets.length; i += batchSize) {
      batches.push(targets.slice(i, i + batchSize));
    }
    return batches;
  }

  private async createTimeoutPromise(timeout: number): Promise<Error> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeout);
    });
  }

  private mergeBatchResults(results: InstallationOrder[]): InstallationOrder {
    const mergedSequence: string[] = [];
    const mergedBatches: string[][] = [];
    const mergedWarnings: string[] = [];
    const mergedErrors: string[] = [];
    let totalTime = 0;

    for (const result of results) {
      mergedSequence.push(...result.installationSequence);
      mergedBatches.push(...result.batches);
      mergedWarnings.push(...result.warnings);
      mergedErrors.push(...result.errors);
      totalTime += result.estimatedTime;
    }

    // Remove duplicates from sequence
    const uniqueSequence = Array.from(new Set(mergedSequence));

    return {
      installationSequence: uniqueSequence,
      batches: mergedBatches,
      deferredDependencies: [],
      circularDependencies: [],
      estimatedTime: totalTime,
      success: mergedErrors.length === 0,
      warnings: mergedWarnings,
      errors: mergedErrors
    };
  }

  private analyzeDependencyPatterns(targetTools: string[]): DependencyPatterns {
    // Analyze graph characteristics to choose optimal algorithm
    const patterns: DependencyPatterns = {
      graphSize: this.graph.getAllNodes().length,
      averageDependencyDepth: 0,
      circularityRisk: 0,
      parallelizability: 0,
      complexity: 'simple'
    };

    // Calculate average dependency depth
    let totalDepth = 0;
    let nodeCount = 0;

    for (const toolId of targetTools) {
      const depth = this.calculateDependencyDepth(toolId);
      totalDepth += depth;
      nodeCount++;
    }

    patterns.averageDependencyDepth = nodeCount > 0 ? totalDepth / nodeCount : 0;

    // Assess other characteristics
    patterns.circularityRisk = this.assessCircularityRisk(targetTools);
    patterns.parallelizability = this.assessParallelizability(targetTools);
    patterns.complexity = this.determineComplexity(patterns);

    return patterns;
  }

  private calculateDependencyDepth(toolId: string, visited = new Set<string>()): number {
    if (visited.has(toolId)) return 0; // Prevent infinite recursion
    
    visited.add(toolId);
    const edges = this.graph.getOutgoingEdges(toolId);
    
    if (edges.length === 0) return 1;
    
    let maxDepth = 0;
    for (const edge of edges) {
      const depth = this.calculateDependencyDepth(edge.to, new Set(visited));
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth + 1;
  }

  private assessCircularityRisk(targetTools: string[]): number {
    // Simple heuristic based on graph structure
    const edgeCount = this.graph.getAllEdges().length;
    const nodeCount = this.graph.getAllNodes().length;
    
    if (nodeCount === 0) return 0;
    
    const density = edgeCount / (nodeCount * (nodeCount - 1));
    return Math.min(density * 10, 1); // Normalize to 0-1
  }

  private assessParallelizability(targetTools: string[]): number {
    // Count independent subgraphs
    let independentTools = 0;
    
    for (const toolId of targetTools) {
      let hasInternalDependencies = false;
      for (const otherToolId of targetTools) {
        if (toolId !== otherToolId && this.graph.hasPath(toolId, otherToolId)) {
          hasInternalDependencies = true;
          break;
        }
      }
      if (!hasInternalDependencies) {
        independentTools++;
      }
    }
    
    return targetTools.length > 0 ? independentTools / targetTools.length : 0;
  }

  private determineComplexity(patterns: DependencyPatterns): 'simple' | 'moderate' | 'complex' {
    if (patterns.graphSize < 10 && patterns.averageDependencyDepth < 3) {
      return 'simple';
    } else if (patterns.graphSize < 100 && patterns.averageDependencyDepth < 6) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  private selectOptimalAlgorithm(patterns: DependencyPatterns): 'topological' | 'dfs' | 'bfs' {
    if (patterns.complexity === 'simple') {
      return 'topological';
    } else if (patterns.circularityRisk > 0.3) {
      return 'dfs'; // Better for cycle detection
    } else if (patterns.parallelizability > 0.7) {
      return 'bfs'; // Better for parallel-friendly graphs
    } else {
      return 'topological'; // Default choice
    }
  }

  private updateLearningMetrics(
    patterns: DependencyPatterns,
    algorithm: string,
    result: InstallationOrder,
    executionTime: number
  ): IntelligenceMetrics {
    return {
      algorithmUsed: algorithm,
      patternAnalysis: patterns,
      performance: {
        executionTime,
        success: result.success,
        toolsResolved: result.installationSequence.length
      },
      adaptiveInsights: [
        `Algorithm ${algorithm} ${result.success ? 'succeeded' : 'failed'} for ${patterns.complexity} complexity graph`,
        `Execution time: ${executionTime}ms for ${result.installationSequence.length} tools`
      ]
    };
  }

  private createFailureResult(error: string): InstallationOrder {
    return {
      installationSequence: [],
      batches: [],
      deferredDependencies: [],
      circularDependencies: [],
      estimatedTime: 0,
      success: false,
      warnings: [],
      errors: [error]
    };
  }
}

// Supporting interfaces

interface DependencyPatterns {
  graphSize: number;
  averageDependencyDepth: number;
  circularityRisk: number;
  parallelizability: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

interface IntelligenceMetrics {
  algorithmUsed: string;
  patternAnalysis: DependencyPatterns;
  performance: {
    executionTime: number;
    success: boolean;
    toolsResolved: number;
  };
  adaptiveInsights: string[];
}

/**
 * Factory function for advanced dependency resolver
 */
export function createAdvancedDependencyResolver(
  graph: DependencyGraph,
  targetPlatform: Platform = 'linux',
  targetArchitecture: Architecture = 'x64'
): AdvancedDependencyResolver {
  return new AdvancedDependencyResolver(graph, targetPlatform, targetArchitecture);
}