/**
 * Dependency Resolution Algorithms
 * Implements scalable graph algorithms for dependency resolution and installation ordering
 */

import type {
  DependencyGraph,
  DependencyGraphNode,
  DependencyGraphEdge,
  TraversalAlgorithm,
  VisitOrder,
  GraphTraversalConfig,
  ResolutionStrategy,
  ResolutionResult,
  ConflictResolution,
  PerformanceConstraints,
  NodeVersionInfo,
  VersionConstraint
} from './types.js';

import type {
  ToolManifest,
  Platform,
  Architecture,
  DependencyType
} from '../../shared/manifest-types.js';

/**
 * Resolution context for algorithm execution
 */
export interface ResolutionContext {
  /** Target platform for resolution */
  targetPlatform: Platform;
  /** Target architecture */
  targetArchitecture: Architecture;
  /** Resolution strategy to use */
  strategy: ResolutionStrategy;
  /** Performance constraints */
  constraints: PerformanceConstraints;
  /** Node visit tracking */
  visited: Set<string>;
  /** Resolution state tracking */
  resolutionState: Map<string, ResolutionResult>;
  /** Conflict tracking */
  conflicts: Map<string, ConflictResolution[]>;
  /** Algorithm execution metrics */
  metrics: {
    nodesVisited: number;
    edgesTraversed: number;
    executionTime: number;
    memoryUsage: number;
    cacheHits: number;
    conflictsFound: number;
  };
}

/**
 * Installation order result
 */
export interface InstallationOrder {
  /** Ordered list of tool IDs for installation */
  installationSequence: string[];
  /** Installation batches (tools that can be installed in parallel) */
  batches: string[][];
  /** Dependencies that were deferred */
  deferredDependencies: string[];
  /** Circular dependencies detected */
  circularDependencies: string[][];
  /** Total estimated installation time */
  estimatedTime: number;
  /** Resolution success status */
  success: boolean;
  /** Resolution warnings */
  warnings: string[];
  /** Resolution errors */
  errors: string[];
}

/**
 * Dependency resolution options
 */
export interface ResolutionOptions {
  /** Resolution strategy */
  strategy?: ResolutionStrategy;
  /** Maximum resolution time in milliseconds */
  maxExecutionTime?: number;
  /** Whether to include optional dependencies */
  includeOptional?: boolean;
  /** Whether to include suggested dependencies */
  includeSuggested?: boolean;
  /** Whether to enable parallel resolution */
  enableParallel?: boolean;
  /** Whether to use caching */
  enableCaching?: boolean;
  /** Maximum number of retries for failed resolutions */
  maxRetries?: number;
}

/**
 * Main dependency resolver class implementing various resolution algorithms
 */
export class DependencyResolver {
  private graph: DependencyGraph;
  private context: ResolutionContext;
  private cache: Map<string, InstallationOrder> = new Map();

  constructor(
    graph: DependencyGraph,
    targetPlatform: Platform = 'linux',
    targetArchitecture: Architecture = 'x64'
  ) {
    this.graph = graph;
    this.context = {
      targetPlatform,
      targetArchitecture,
      strategy: 'conservative',
      constraints: {
        maxExecutionTime: 30000,
        maxMemoryUsage: 512,
        maxGraphSize: 10000,
        enableCaching: true
      },
      visited: new Set(),
      resolutionState: new Map(),
      conflicts: new Map(),
      metrics: {
        nodesVisited: 0,
        edgesTraversed: 0,
        executionTime: 0,
        memoryUsage: 0,
        cacheHits: 0,
        conflictsFound: 0
      }
    };
  }

  /**
   * Resolve dependencies for a set of target tools using topological sorting
   */
  public async resolveTopological(
    targetTools: string[],
    options: ResolutionOptions = {}
  ): Promise<InstallationOrder> {
    const startTime = Date.now();
    this.resetContext(options);

    try {
      // Check cache first
      const cacheKey = this.createCacheKey(targetTools, options);
      if (options.enableCaching !== false && this.cache.has(cacheKey)) {
        this.context.metrics.cacheHits++;
        return this.cache.get(cacheKey)!;
      }

      // Validate target tools exist
      const missingTools = targetTools.filter(toolId => !this.graph.hasNode(toolId));
      if (missingTools.length > 0) {
        return this.createFailureResult(`Missing tools: ${missingTools.join(', ')}`);
      }

      // Get subgraph containing only reachable nodes
      const reachableNodes = this.getReachableNodes(targetTools, options);
      
      // Check for cycles first
      const cycleDetection = this.graph.detectCycles();
      if (cycleDetection.hasCycles) {
        return this.createFailureResult(`Circular dependencies detected: ${cycleDetection.cycles.map(cycle => cycle.join(' -> ')).join(', ')}`);
      }

      // Perform topological sort using traverse method
      const traversalResult = this.graph.traverse({
        algorithm: 'topological',
        visitOrder: 'dependency-order',
        detectCycles: true,
        performanceConstraints: this.context.constraints
      });

      // Filter to only include reachable nodes - topological sort already gives installation order
      const installationSequence = traversalResult.nodes
        .filter(nodeId => reachableNodes.has(nodeId));
        // No need to reverse - topological sort gives us dependencies first, which is what we want

      // Update metrics
      this.context.metrics.nodesVisited = installationSequence.length;
      this.context.metrics.edgesTraversed = this.graph.getAllEdges().filter(edge => 
        installationSequence.includes(edge.from) && installationSequence.includes(edge.to)
      ).length;

      // Create installation batches for parallel execution
      const batches = this.createInstallationBatches(installationSequence, options);

      // Calculate estimated time
      const estimatedTime = this.calculateEstimatedTime(installationSequence);

      this.context.metrics.executionTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms

      const result: InstallationOrder = {
        installationSequence,
        batches,
        deferredDependencies: [],
        circularDependencies: cycleDetection.cycles || [],
        estimatedTime,
        success: true,
        warnings: [],
        errors: []
      };

      // Cache result
      if (options.enableCaching !== false) {
        this.cache.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      this.context.metrics.executionTime = Date.now() - startTime;
      return this.createFailureResult(`Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resolve dependencies using depth-first search with backtracking
   */
  public async resolveDFS(
    targetTools: string[],
    options: ResolutionOptions = {}
  ): Promise<InstallationOrder> {
    const startTime = Date.now();
    this.resetContext(options);

    try {
      const installationSequence: string[] = [];
      const visited = new Set<string>();
      const visiting = new Set<string>(); // For cycle detection
      const deferredDependencies: string[] = [];

      // DFS traversal function
      const dfsVisit = (nodeId: string): boolean => {
        if (visiting.has(nodeId)) {
          // Cycle detected - add to deferred if optional
          const node = this.graph.getNode(nodeId);
          if (node && this.isOptionalDependency(nodeId)) {
            deferredDependencies.push(nodeId);
            return true;
          }
          return false; // Hard failure for required circular dependency
        }

        if (visited.has(nodeId)) {
          return true; // Already processed
        }

        visiting.add(nodeId);
        this.context.metrics.nodesVisited++;

        // Process dependencies first
        const edges = this.graph.getOutgoingEdges(nodeId);
        for (const edge of edges) {
          if (this.shouldIncludeEdge(edge, options)) {
            this.context.metrics.edgesTraversed++;
            
            if (!dfsVisit(edge.to)) {
              visiting.delete(nodeId);
              return false; // Propagate failure
            }
          }
        }

        visiting.delete(nodeId);
        visited.add(nodeId);
        
        // Add to installation sequence (dependencies are already added)
        if (!installationSequence.includes(nodeId)) {
          installationSequence.push(nodeId);
        }

        return true;
      };

      // Start DFS from target tools
      for (const toolId of targetTools) {
        if (!dfsVisit(toolId)) {
          return this.createFailureResult(`DFS resolution failed for tool: ${toolId}`);
        }
      }

      // Create batches
      const batches = this.createInstallationBatches(installationSequence, options);
      const estimatedTime = this.calculateEstimatedTime(installationSequence);

      this.context.metrics.executionTime = Date.now() - startTime;

      return {
        installationSequence,
        batches,
        deferredDependencies,
        circularDependencies: [],
        estimatedTime,
        success: true,
        warnings: deferredDependencies.length > 0 ? [`Deferred ${deferredDependencies.length} optional dependencies`] : [],
        errors: []
      };

    } catch (error) {
      this.context.metrics.executionTime = Date.now() - startTime;
      return this.createFailureResult(`DFS resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resolve dependencies using breadth-first search
   */
  public async resolveBFS(
    targetTools: string[],
    options: ResolutionOptions = {}
  ): Promise<InstallationOrder> {
    const startTime = Date.now();
    this.resetContext(options);

    try {
      const installationSequence: string[] = [];
      const visited = new Set<string>();
      const queue: string[] = [...targetTools];
      const levelMap = new Map<string, number>(); // Track dependency levels

      // Initialize levels
      targetTools.forEach(toolId => levelMap.set(toolId, 0));

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        
        if (visited.has(nodeId)) {
          continue;
        }

        visited.add(nodeId);
        this.context.metrics.nodesVisited++;

        // Process dependencies
        const edges = this.graph.getOutgoingEdges(nodeId);
        for (const edge of edges) {
          if (this.shouldIncludeEdge(edge, options)) {
            this.context.metrics.edgesTraversed++;
            
            if (!visited.has(edge.to)) {
              queue.push(edge.to);
              // Set dependency level (one level deeper than current)
              const currentLevel = levelMap.get(nodeId) || 0;
              if (!levelMap.has(edge.to) || levelMap.get(edge.to)! > currentLevel + 1) {
                levelMap.set(edge.to, currentLevel + 1);
              }
            }
          }
        }
      }

      // Sort by dependency level (dependencies installed first)
      const sortedNodes = Array.from(visited).sort((a, b) => {
        const levelA = levelMap.get(a) || 0;
        const levelB = levelMap.get(b) || 0;
        return levelB - levelA; // Higher level (deeper dependencies) first
      });

      installationSequence.push(...sortedNodes);

      const batches = this.createInstallationBatches(installationSequence, options);
      const estimatedTime = this.calculateEstimatedTime(installationSequence);

      this.context.metrics.executionTime = Date.now() - startTime;

      return {
        installationSequence,
        batches,
        deferredDependencies: [],
        circularDependencies: [],
        estimatedTime,
        success: true,
        warnings: [],
        errors: []
      };

    } catch (error) {
      this.context.metrics.executionTime = Date.now() - startTime;
      return this.createFailureResult(`BFS resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Eager resolution strategy - resolves all dependencies immediately
   */
  public async resolveEager(
    targetTools: string[],
    options: ResolutionOptions = {}
  ): Promise<InstallationOrder> {
    const eagerOptions = {
      ...options,
      includeOptional: true,
      includeSuggested: true,
      strategy: 'aggressive' as ResolutionStrategy
    };

    return this.resolveTopological(targetTools, eagerOptions);
  }

  /**
   * Lazy resolution strategy - resolves only required dependencies
   */
  public async resolveLazy(
    targetTools: string[],
    options: ResolutionOptions = {}
  ): Promise<InstallationOrder> {
    const lazyOptions = {
      ...options,
      includeOptional: false,
      includeSuggested: false,
      strategy: 'conservative' as ResolutionStrategy
    };

    return this.resolveTopological(targetTools, lazyOptions);
  }

  /**
   * Resolve with conflict detection and automatic resolution
   */
  public async resolveWithConflictResolution(
    targetTools: string[],
    options: ResolutionOptions = {}
  ): Promise<InstallationOrder> {
    // First attempt normal resolution
    let result = await this.resolveTopological(targetTools, options);

    // If conflicts detected, attempt resolution
    if (!result.success || result.errors.length > 0) {
      result = await this.attemptConflictResolution(targetTools, options, result);
    }

    return result;
  }

  // Private helper methods

  private resetContext(options: ResolutionOptions): void {
    this.context.strategy = options.strategy || 'conservative';
    this.context.constraints.maxExecutionTime = options.maxExecutionTime || 30000;
    this.context.visited.clear();
    this.context.resolutionState.clear();
    this.context.conflicts.clear();
    this.context.metrics = {
      nodesVisited: 0,
      edgesTraversed: 0,
      executionTime: 0,
      memoryUsage: 0,
      cacheHits: 0,
      conflictsFound: 0
    };
  }

  private getReachableNodes(targetTools: string[], options: ResolutionOptions): Set<string> {
    const reachable = new Set<string>();
    const queue = [...targetTools];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      
      if (reachable.has(nodeId)) {
        continue;
      }

      reachable.add(nodeId);

      // Add dependencies
      const edges = this.graph.getOutgoingEdges(nodeId);
      for (const edge of edges) {
        if (this.shouldIncludeEdge(edge, options) && !reachable.has(edge.to)) {
          queue.push(edge.to);
        }
      }
    }

    return reachable;
  }

  private shouldIncludeEdge(edge: DependencyGraphEdge, options: ResolutionOptions): boolean {
    const { dependency } = edge;
    
    switch (dependency.type) {
      case 'required':
        return true;
      case 'optional':
        return options.includeOptional !== false;
      case 'suggests':
        return options.includeSuggested === true;
      case 'conflicts':
        return false; // Conflicts are handled separately
      default:
        return false;
    }
  }

  private isOptionalDependency(nodeId: string): boolean {
    const incomingEdges = this.graph.getIncomingEdges(nodeId);
    return incomingEdges.some(edge => 
      edge.dependency.type === 'optional' || edge.dependency.type === 'suggests'
    );
  }

  private createInstallationBatches(sequence: string[], options: ResolutionOptions): string[][] {
    if (!options.enableParallel) {
      return sequence.map(toolId => [toolId]);
    }

    const batches: string[][] = [];
    const processed = new Set<string>();
    
    for (const toolId of sequence) {
      if (processed.has(toolId)) {
        continue;
      }

      // Find all tools that can be installed in parallel with this one
      const batch = [toolId];
      processed.add(toolId);

      // Check remaining tools for parallel installation opportunities
      for (const otherToolId of sequence) {
        if (processed.has(otherToolId)) {
          continue;
        }

        // Can install in parallel if no direct dependency relationship
        if (!this.graph.hasPath(toolId, otherToolId) && !this.graph.hasPath(otherToolId, toolId)) {
          batch.push(otherToolId);
          processed.add(otherToolId);
        }
      }

      batches.push(batch);
    }

    return batches;
  }

  private calculateEstimatedTime(sequence: string[]): number {
    let totalTime = 0;
    
    for (const toolId of sequence) {
      const node = this.graph.getNode(toolId);
      if (node?.tool.installation) {
        // Use the first available installation method for target platform
        const installation = node.tool.installation.find(inst => 
          inst.platform === this.context.targetPlatform
        );
        // Default 60 seconds per tool since InstallationCommand doesn't have estimatedTime
        totalTime += 60;
      }
    }

    return totalTime;
  }

  private async attemptConflictResolution(
    targetTools: string[],
    options: ResolutionOptions,
    failedResult: InstallationOrder
  ): Promise<InstallationOrder> {
    // Implement basic conflict resolution strategies
    const maxRetries = options.maxRetries || 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Try with different strategies
      const retryOptions = { ...options };
      
      if (attempt === 1) {
        // First retry: be more conservative
        retryOptions.includeOptional = false;
        retryOptions.includeSuggested = false;
      } else if (attempt === 2) {
        // Second retry: try lazy resolution
        return this.resolveLazy(targetTools, retryOptions);
      } else {
        // Final attempt: minimal resolution
        retryOptions.includeOptional = false;
        retryOptions.includeSuggested = false;
        retryOptions.enableParallel = false;
      }

      const retryResult = await this.resolveTopological(targetTools, retryOptions);
      if (retryResult.success) {
        retryResult.warnings.push(`Resolved after ${attempt} retry attempts`);
        return retryResult;
      }
    }

    // If all retries failed, return the original failure
    failedResult.errors.push(`Failed to resolve conflicts after ${maxRetries} attempts`);
    return failedResult;
  }

  private createCacheKey(targetTools: string[], options: ResolutionOptions): string {
    const keyData = {
      tools: targetTools.sort(),
      platform: this.context.targetPlatform,
      arch: this.context.targetArchitecture,
      options: {
        strategy: options.strategy,
        includeOptional: options.includeOptional,
        includeSuggested: options.includeSuggested,
        enableParallel: options.enableParallel
      }
    };
    
    return JSON.stringify(keyData);
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

  /**
   * Get resolution metrics for performance analysis
   */
  public getMetrics(): typeof this.context.metrics {
    return { ...this.context.metrics };
  }

  /**
   * Clear resolution cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  public getCacheSize(): number {
    return this.cache.size;
  }
}

/**
 * Factory function to create a dependency resolver
 */
export function createDependencyResolver(
  graph: DependencyGraph,
  targetPlatform: Platform = 'linux',
  targetArchitecture: Architecture = 'x64'
): DependencyResolver {
  return new DependencyResolver(graph, targetPlatform, targetArchitecture);
}

/**
 * Convenience function for quick topological resolution
 */
export async function resolveInstallationOrder(
  graph: DependencyGraph,
  targetTools: string[],
  options: ResolutionOptions = {}
): Promise<InstallationOrder> {
  const resolver = createDependencyResolver(graph);
  return resolver.resolveTopological(targetTools, options);
}

/**
 * Convenience function for conflict-aware resolution
 */
export async function resolveWithConflicts(
  graph: DependencyGraph,
  targetTools: string[],
  options: ResolutionOptions = {}
): Promise<InstallationOrder> {
  const resolver = createDependencyResolver(graph);
  return resolver.resolveWithConflictResolution(targetTools, options);
}