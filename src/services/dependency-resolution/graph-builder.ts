/**
 * Dependency Graph Builder
 * Implements logic to construct dependency graphs from tool manifests
 */

import type {
  DependencyGraph,
  DependencyGraphNode,
  DependencyGraphEdge,
  EnhancedToolDependency,
  GraphConstructionOptions,
  VersionConstraint,
  InstallationStatus,
  NodeVersionInfo,
  PlatformMetadata,
  NodeGraphMetadata,
  EdgeResolutionMetadata,
  ResolutionResult,
  ResolutionStrategy,
  ConflictStatus,
  ConflictType,
  EdgePerformanceMetrics,
  VersionResolutionMetadata,
  VersionResolutionMethod,
  ConstraintType,
  VersionCompatibilityMatrix,
  CompatibilityRule,
  PlatformArchitecture,
  ResourceRequirement
} from './types.js';

import type {
  ToolManifest,
  ToolDependency,
  DependencyType,
  ToolCategory,
  Platform,
  Architecture,
  CategoryManifest,
  MasterManifest,
  ValidationResult,
  ValidationError
} from '../../shared/manifest-types.js';

import { createDependencyGraph } from './index.js';

/**
 * Result of graph construction operation
 */
export interface GraphConstructionResult {
  /** Successfully constructed graph */
  graph: DependencyGraph;
  /** Construction success status */
  success: boolean;
  /** Processing statistics */
  statistics: {
    /** Number of manifests processed */
    manifestsProcessed: number;
    /** Number of nodes created */
    nodesCreated: number;
    /** Number of edges created */
    edgesCreated: number;
    /** Number of dependencies resolved */
    dependenciesResolved: number;
    /** Number of conflicts detected */
    conflictsDetected: number;
    /** Construction time in milliseconds */
    constructionTime: number;
  };
  /** Validation errors encountered */
  errors: ValidationError[];
  /** Warning messages */
  warnings: ValidationError[];
  /** Metadata about the construction process */
  metadata: {
    /** Platform this graph was built for */
    targetPlatform: Platform;
    /** Architecture this graph was built for */
    targetArchitecture: Architecture;
    /** Options used for construction */
    options: GraphConstructionOptions;
    /** Timestamp when construction began */
    constructionStarted: string;
    /** Timestamp when construction completed */
    constructionCompleted: string;
  };
}

/**
 * Context for graph construction operations
 */
export interface GraphConstructionContext {
  /** Target platform for dependency resolution */
  targetPlatform: Platform;
  /** Target architecture */
  targetArchitecture: Architecture;
  /** Construction options */
  options: GraphConstructionOptions;
  /** Processed manifests cache */
  manifestCache: Map<string, ToolManifest>;
  /** Dependency resolution cache */
  dependencyCache: Map<string, ToolDependency[]>;
  /** Version constraint cache */
  constraintCache: Map<string, VersionConstraint[]>;
  /** Construction errors */
  errors: ValidationError[];
  /** Construction warnings */
  warnings: ValidationError[];
}

/**
 * Main graph builder class for constructing dependency graphs from manifests
 */
export class DependencyGraphBuilder {
  private context: GraphConstructionContext;
  private graph: DependencyGraph;
  private nodeIdCounter: number = 0;

  constructor(
    targetPlatform: Platform,
    targetArchitecture: Architecture,
    options: GraphConstructionOptions = {
      includeOptional: true,
      includeSuggested: false,
      maxNodes: 5000,
      validateDuringConstruction: true
    }
  ) {
    this.context = {
      targetPlatform,
      targetArchitecture,
      options,
      manifestCache: new Map(),
      dependencyCache: new Map(),
      constraintCache: new Map(),
      errors: [],
      warnings: []
    };
    this.graph = createDependencyGraph();
  }

  /**
   * Build dependency graph from a collection of tool manifests
   */
  public async buildFromManifests(manifests: ToolManifest[]): Promise<GraphConstructionResult> {
    const startTime = Date.now();
    const constructionStarted = new Date().toISOString();

    try {
      // Reset state
      this.resetState();

      // Phase 1: Validate and cache manifests
      const validManifests = await this.validateAndCacheManifests(manifests);
      
      // Phase 2: Create nodes for all tools
      const createdNodes = await this.createNodesFromManifests(validManifests);
      
      // Phase 3: Resolve dependencies and create edges
      const createdEdges = await this.resolveDependenciesAndCreateEdges(validManifests);
      
      // Phase 4: Validate graph structure
      if (this.context.options.validateDuringConstruction) {
        await this.validateGraphStructure();
      }

      // Phase 5: Detect and handle cycles
      const cycleDetection = this.graph.detectCycles();
      if (cycleDetection.hasCycles) {
        this.addError('CIRCULAR_DEPENDENCIES', 
          `Detected ${cycleDetection.cycleCount} circular dependencies`, 
          'graph.cycles');
      }

      const endTime = Date.now();
      const constructionCompleted = new Date().toISOString();

      return {
        graph: this.graph,
        success: this.context.errors.length === 0,
        statistics: {
          manifestsProcessed: validManifests.length,
          nodesCreated: createdNodes,
          edgesCreated: createdEdges,
          dependenciesResolved: this.getTotalDependenciesResolved(),
          conflictsDetected: this.getConflictCount(),
          constructionTime: Math.max(1, endTime - startTime) // Ensure at least 1ms
        },
        errors: this.context.errors,
        warnings: this.context.warnings,
        metadata: {
          targetPlatform: this.context.targetPlatform,
          targetArchitecture: this.context.targetArchitecture,
          options: this.context.options,
          constructionStarted,
          constructionCompleted
        }
      };
    } catch (error) {
      this.addError('CONSTRUCTION_FAILURE', 
        `Graph construction failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        'graph.construction');
      
      return this.createFailureResult(startTime, constructionStarted);
    }
  }

  /**
   * Build dependency graph from a category manifest
   */
  public async buildFromCategoryManifest(categoryManifest: CategoryManifest): Promise<GraphConstructionResult> {
    return this.buildFromManifests(categoryManifest.tools);
  }

  /**
   * Build dependency graph from a master manifest
   */
  public async buildFromMasterManifest(masterManifest: MasterManifest): Promise<GraphConstructionResult> {
    const allManifests: ToolManifest[] = [];
    
    // Extract tools from all categories
    for (const category of masterManifest.categories) {
      allManifests.push(...category.tools);
    }
    
    return this.buildFromManifests(allManifests);
  }

  /**
   * Add a single tool manifest to the graph
   */
  public async addToolToGraph(manifest: ToolManifest): Promise<boolean> {
    try {
      // Validate manifest
      const validation = this.validateManifest(manifest);
      if (!validation.isValid) {
        this.context.errors.push(...validation.errors);
        return false;
      }

      // Check if tool already exists
      if (this.context.manifestCache.has(manifest.id)) {
        this.addWarning('DUPLICATE_TOOL', 
          `Tool ${manifest.id} already exists in graph`, 
          `tools.${manifest.id}`);
        return false;
      }

      // Cache manifest
      this.context.manifestCache.set(manifest.id, manifest);

      // Create node
      const node = this.createNodeFromManifest(manifest);
      if (!this.graph.addNode(node)) {
        this.addError('NODE_CREATION_FAILED', 
          `Failed to add node for tool ${manifest.id}`, 
          `nodes.${manifest.id}`);
        return false;
      }

      // Resolve dependencies for this tool
      await this.resolveDependenciesForTool(manifest);

      return true;
    } catch (error) {
      this.addError('TOOL_ADDITION_FAILED', 
        `Failed to add tool ${manifest.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        `tools.${manifest.id}`);
      return false;
    }
  }

  /**
   * Remove a tool from the graph
   */
  public removeToolFromGraph(toolId: string): boolean {
    try {
      // Remove from cache
      this.context.manifestCache.delete(toolId);
      this.context.dependencyCache.delete(toolId);
      this.context.constraintCache.delete(toolId);

      // Remove from graph
      return this.graph.removeNode(toolId);
    } catch (error) {
      this.addError('TOOL_REMOVAL_FAILED', 
        `Failed to remove tool ${toolId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        `tools.${toolId}`);
      return false;
    }
  }

  // Private implementation methods

  private resetState(): void {
    this.graph.clear();
    this.context.manifestCache.clear();
    this.context.dependencyCache.clear();
    this.context.constraintCache.clear();
    this.context.errors = [];
    this.context.warnings = [];
    this.nodeIdCounter = 0;
  }

  private async validateAndCacheManifests(manifests: ToolManifest[]): Promise<ToolManifest[]> {
    const validManifests: ToolManifest[] = [];

    for (const manifest of manifests) {
      const validation = this.validateManifest(manifest);
      
      // Always add warnings, regardless of validation result
      this.context.warnings.push(...validation.warnings);
      
      if (validation.isValid) {
        this.context.manifestCache.set(manifest.id, manifest);
        validManifests.push(manifest);
      } else {
        this.context.errors.push(...validation.errors);
      }
    }

    return validManifests;
  }

  private validateManifest(manifest: ToolManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Basic validation
    if (!manifest.id || manifest.id.trim() === '') {
      errors.push({
        code: 'MISSING_TOOL_ID',
        message: 'Tool manifest must have a valid ID',
        path: `manifest.id`,
        severity: 'error'
      });
    }

    if (!manifest.name || manifest.name.trim() === '') {
      errors.push({
        code: 'MISSING_TOOL_NAME',
        message: 'Tool manifest must have a valid name',
        path: `manifest.name`,
        severity: 'error'
      });
    }

    if (!manifest.category) {
      errors.push({
        code: 'MISSING_CATEGORY',
        message: 'Tool manifest must specify a category',
        path: `manifest.category`,
        severity: 'error'
      });
    }

    // Platform compatibility validation
    const supportsPlatform = manifest.systemRequirements?.platforms?.includes(this.context.targetPlatform);
    if (!supportsPlatform) {
      warnings.push({
        code: 'PLATFORM_INCOMPATIBLE',
        message: `Tool ${manifest.id} does not support target platform ${this.context.targetPlatform}`,
        path: `manifest.systemRequirements.platforms`,
        severity: 'warning'
      });
    }

    // Dependency validation
    if (manifest.dependencies) {
      for (let i = 0; i < manifest.dependencies.length; i++) {
        const dep = manifest.dependencies[i];
        if (!dep.toolId || dep.toolId.trim() === '') {
          errors.push({
            code: 'INVALID_DEPENDENCY',
            message: `Dependency ${i} has invalid toolId`,
            path: `manifest.dependencies[${i}].toolId`,
            severity: 'error'
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validatedAt: new Date().toISOString(),
        schemaVersion: manifest.schemaVersion || '1.0.0',
        validatorVersion: '1.0.0'
      }
    };
  }

  private async createNodesFromManifests(manifests: ToolManifest[]): Promise<number> {
    let createdCount = 0;

    for (const manifest of manifests) {
      try {
        const node = this.createNodeFromManifest(manifest);
        
        if (this.graph.addNode(node)) {
          createdCount++;
        } else {
          this.addWarning('NODE_CREATION_SKIPPED', 
            `Node for tool ${manifest.id} was not created (possibly duplicate)`, 
            `nodes.${manifest.id}`);
        }
      } catch (error) {
        this.addError('NODE_CREATION_ERROR', 
          `Failed to create node for tool ${manifest.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          `nodes.${manifest.id}`);
      }
    }

    return createdCount;
  }

  private createNodeFromManifest(manifest: ToolManifest): DependencyGraphNode {
    const nodeId = manifest.id;
    
    // Create version info
    const versionInfo: NodeVersionInfo = {
      availableVersions: this.extractAvailableVersions(manifest),
      constraints: [],
      compatibility: this.createVersionCompatibilityMatrix(manifest)
    };

    // Create platform metadata  
    const platformMetadata: PlatformMetadata = {
      supportedPlatforms: manifest.systemRequirements?.platforms || [],
      installationMethods: this.extractInstallationMethods(manifest),
      platformDependencies: {},
      resourceRequirements: this.extractResourceRequirements(manifest)
    };

    // Create graph metadata
    const graphMetadata: NodeGraphMetadata = {
      depth: 0,
      dependentCount: 0,
      dependencyCount: manifest.dependencies?.length || 0,
      onCriticalPath: false,
      traversalState: 'unvisited',
      timestamps: {
        discovered: Date.now()
      }
    };

    return {
      tool: manifest,
      id: nodeId,
      category: manifest.category,
      installationStatus: 'not-installed' as InstallationStatus,
      versionInfo,
      platformMetadata,
      graphMetadata
    };
  }

  private async resolveDependenciesAndCreateEdges(manifests: ToolManifest[]): Promise<number> {
    let createdCount = 0;

    for (const manifest of manifests) {
      if (manifest.dependencies) {
        for (const dependency of manifest.dependencies) {
          if (this.shouldIncludeDependency(dependency)) {
            // Check if dependent tool exists
            if (!this.context.manifestCache.has(dependency.toolId)) {
              this.addWarning('MISSING_DEPENDENCY', 
                `Tool ${manifest.id} depends on ${dependency.toolId} which is not available`, 
                `dependencies.${dependency.toolId}`);
              continue;
            }

            try {
              const edge = this.createEdgeFromDependency(manifest.id, dependency);
              
              if (this.graph.addEdge(edge)) {
                createdCount++;
              } else {
                this.addWarning('EDGE_CREATION_SKIPPED', 
                  `Edge ${manifest.id} -> ${dependency.toolId} was not created`, 
                  `edges.${manifest.id}-${dependency.toolId}`);
              }
            } catch (error) {
              this.addError('EDGE_CREATION_ERROR', 
                `Failed to create edge ${manifest.id} -> ${dependency.toolId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
                `edges.${manifest.id}-${dependency.toolId}`);
            }
          }
        }
      }
    }

    return createdCount;
  }

  private shouldIncludeDependency(dependency: ToolDependency): boolean {
    const { type } = dependency;
    const { includeOptional, includeSuggested } = this.context.options;

    switch (type) {
      case 'required':
        return true;
      case 'optional':
        return includeOptional;
      case 'suggests':
        return includeSuggested;
      case 'conflicts':
        return false; // Conflicts are handled separately
      default:
        return false;
    }
  }

  private createEdgeFromDependency(fromId: string, dependency: ToolDependency): DependencyGraphEdge {
    // Create enhanced dependency with resolution metadata
    const enhancedDependency: EnhancedToolDependency = {
      ...dependency,
      priority: this.calculateDependencyPriority(dependency),
      deferrable: dependency.type === 'optional' || dependency.type === 'suggests',
      installationOrder: this.calculateInstallationOrder(dependency),
      conflictResolution: 'fail-fast',
      versionResolution: this.createVersionResolutionMetadata(dependency)
    };

    // Create edge resolution metadata
    const resolutionMetadata: EdgeResolutionMetadata = {
      resolutionAttempts: 0,
      lastResolutionResult: 'pending' as ResolutionResult,
      resolutionStrategy: 'conservative' as ResolutionStrategy,
      conflictStatus: {
        hasConflict: false,
        conflictsWith: [],
        conflictType: 'version' as ConflictType
      },
      performanceMetrics: {
        resolutionTime: 0,
        memoryUsage: 0,
        networkRequests: 0,
        cacheHitRate: 0
      } as EdgePerformanceMetrics
    };

    return {
      from: fromId,
      to: dependency.toolId,
      dependency: enhancedDependency,
      weight: this.calculateEdgeWeight(dependency),
      platforms: dependency.platforms || [this.context.targetPlatform],
      resolutionMetadata
    };
  }

  private async resolveDependenciesForTool(manifest: ToolManifest): Promise<void> {
    if (!manifest.dependencies) {
      return;
    }

    for (const dependency of manifest.dependencies) {
      if (this.shouldIncludeDependency(dependency)) {
        // Check if dependent tool exists
        if (!this.context.manifestCache.has(dependency.toolId)) {
          this.addWarning('MISSING_DEPENDENCY', 
            `Tool ${manifest.id} depends on ${dependency.toolId} which is not available`, 
            `dependencies.${dependency.toolId}`);
          continue;
        }

        // Create edge
        try {
          const edge = this.createEdgeFromDependency(manifest.id, dependency);
          this.graph.addEdge(edge);
        } catch (error) {
          this.addError('DEPENDENCY_RESOLUTION_ERROR', 
            `Failed to resolve dependency ${manifest.id} -> ${dependency.toolId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            `dependencies.${dependency.toolId}`);
        }
      }
    }
  }

  private async validateGraphStructure(): Promise<void> {
    const validation = this.graph.validate({
      rules: [],
      strictness: 'moderate',
      crossPlatformValidation: true,
      performanceValidation: true
    });

    if (!validation.isValid) {
      this.context.errors.push(...validation.errors);
    }
    
    this.context.warnings.push(...validation.warnings);
  }

  // Helper methods for creating node metadata

  private extractAvailableVersions(manifest: ToolManifest): string[] {
    const versions: string[] = [];
    
    if (manifest.version?.stable) {
      versions.push(manifest.version.stable);
    }
    
    if (manifest.version?.beta) {
      versions.push(manifest.version.beta);
    }
    
    if (manifest.version?.nightly) {
      versions.push(manifest.version.nightly);
    }

    return versions.length > 0 ? versions : ['latest'];
  }

  private createVersionCompatibilityMatrix(manifest: ToolManifest): VersionCompatibilityMatrix {
    const platforms = manifest.systemRequirements?.platforms || [];
    const architectures = manifest.systemRequirements?.architectures || [];
    
    const platformVersions: Record<Platform, string[]> = {} as Record<Platform, string[]>;
    const architectureVersions: Record<Architecture, string[]> = {} as Record<Architecture, string[]>;
    
    const availableVersions = this.extractAvailableVersions(manifest);
    
    // Assume all versions are compatible with all supported platforms/architectures
    for (const platform of platforms) {
      platformVersions[platform] = [...availableVersions];
    }
    
    for (const arch of architectures) {
      architectureVersions[arch] = [...availableVersions];
    }

    return {
      platformVersions,
      architectureVersions,
      compatibilityRules: []
    };
  }

  private extractInstallationMethods(manifest: ToolManifest): Record<Platform, string[]> {
    const methods: Record<Platform, string[]> = {} as Record<Platform, string[]>;
    
    for (const installation of manifest.installation) {
      const platform = installation.platform;
      if (!methods[platform]) {
        methods[platform] = [];
      }
      methods[platform].push(installation.method);
    }

    return methods;
  }

  private extractResourceRequirements(manifest: ToolManifest): Record<Platform, ResourceRequirement> {
    const requirements: Record<Platform, ResourceRequirement> = {} as Record<Platform, ResourceRequirement>;
    
    // Default resource requirements - would ideally come from manifest
    const defaultRequirement: ResourceRequirement = {
      minMemory: 512, // MB
      minDiskSpace: 100, // MB
      networkRequired: true,
      requiresAdmin: false
    };

    for (const platform of (manifest.systemRequirements?.platforms || [])) {
      requirements[platform] = { ...defaultRequirement };
    }

    return requirements;
  }

  private calculateDependencyPriority(dependency: ToolDependency): number {
    switch (dependency.type) {
      case 'required':
        return 100;
      case 'optional':
        return 50;
      case 'suggests':
        return 25;
      case 'conflicts':
        return 0;
      default:
        return 50;
    }
  }

  private calculateInstallationOrder(dependency: ToolDependency): number {
    // Higher priority dependencies should be installed first (lower order number)
    return dependency.type === 'required' ? 1 : 2;
  }

  private calculateEdgeWeight(dependency: ToolDependency): number {
    // Weight represents importance/strength of dependency
    return this.calculateDependencyPriority(dependency) / 100;
  }

  private createVersionResolutionMetadata(dependency: ToolDependency): VersionResolutionMetadata {
    return {
      confidence: dependency.type === 'required' ? 100 : 75,
      resolutionMethod: 'latest-compatible' as VersionResolutionMethod,
      fallbackVersions: [],
      appliedConstraints: this.createVersionConstraints(dependency)
    };
  }

  private createVersionConstraints(dependency: ToolDependency): VersionConstraint[] {
    const constraints: VersionConstraint[] = [];

    if (dependency.minVersion) {
      constraints.push({
        sourceId: dependency.toolId,
        type: 'minimum' as ConstraintType,
        version: dependency.minVersion,
        strict: dependency.type === 'required',
        platforms: dependency.platforms
      });
    }

    if (dependency.maxVersion) {
      constraints.push({
        sourceId: dependency.toolId,
        type: 'maximum' as ConstraintType,
        version: dependency.maxVersion,
        strict: dependency.type === 'required',
        platforms: dependency.platforms
      });
    }

    if (dependency.versionRange) {
      constraints.push({
        sourceId: dependency.toolId,
        type: 'range' as ConstraintType,
        version: dependency.versionRange,
        strict: dependency.type === 'required',
        platforms: dependency.platforms
      });
    }

    return constraints;
  }

  // Utility methods

  private getTotalDependenciesResolved(): number {
    return this.graph.getAllEdges().length;
  }

  private getConflictCount(): number {
    // Count nodes/edges with conflicts
    return this.graph.getAllEdges().filter(edge => 
      edge.resolutionMetadata.conflictStatus.hasConflict
    ).length;
  }

  private createFailureResult(startTime: number, constructionStarted: string): GraphConstructionResult {
    const endTime = Date.now();
    
    return {
      graph: this.graph,
      success: false,
      statistics: {
        manifestsProcessed: 0,
        nodesCreated: 0,
        edgesCreated: 0,
        dependenciesResolved: 0,
        conflictsDetected: 0,
        constructionTime: endTime - startTime
      },
      errors: this.context.errors,
      warnings: this.context.warnings,
      metadata: {
        targetPlatform: this.context.targetPlatform,
        targetArchitecture: this.context.targetArchitecture,
        options: this.context.options,
        constructionStarted,
        constructionCompleted: new Date().toISOString()
      }
    };
  }

  private addError(code: string, message: string, path: string): void {
    this.context.errors.push({
      code,
      message,
      path,
      severity: 'error'
    });
  }

  private addWarning(code: string, message: string, path: string): void {
    this.context.warnings.push({
      code,
      message,
      path,
      severity: 'warning'
    });
  }
}

/**
 * Factory function to create a new dependency graph builder
 */
export function createDependencyGraphBuilder(
  targetPlatform: Platform,
  targetArchitecture: Architecture,
  options?: GraphConstructionOptions
): DependencyGraphBuilder {
  return new DependencyGraphBuilder(targetPlatform, targetArchitecture, options);
}

/**
 * Convenience function to build a graph from manifests
 */
export async function buildGraphFromManifests(
  manifests: ToolManifest[],
  targetPlatform: Platform = 'linux',
  targetArchitecture: Architecture = 'x64',
  options?: GraphConstructionOptions
): Promise<GraphConstructionResult> {
  const builder = createDependencyGraphBuilder(targetPlatform, targetArchitecture, options);
  return builder.buildFromManifests(manifests);
}

/**
 * Convenience function to build a graph from a category manifest
 */
export async function buildGraphFromCategory(
  categoryManifest: CategoryManifest,
  targetPlatform: Platform = 'linux',
  targetArchitecture: Architecture = 'x64',
  options?: GraphConstructionOptions
): Promise<GraphConstructionResult> {
  const builder = createDependencyGraphBuilder(targetPlatform, targetArchitecture, options);
  return builder.buildFromCategoryManifest(categoryManifest);
}

/**
 * Convenience function to build a graph from a master manifest
 */
export async function buildGraphFromMaster(
  masterManifest: MasterManifest,
  targetPlatform: Platform = 'linux',
  targetArchitecture: Architecture = 'x64',
  options?: GraphConstructionOptions
): Promise<GraphConstructionResult> {
  const builder = createDependencyGraphBuilder(targetPlatform, targetArchitecture, options);
  return builder.buildFromMasterManifest(masterManifest);
}