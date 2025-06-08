/**
 * Conflict Detection System
 * Comprehensive conflict detection for version conflicts, circular dependencies, and incompatible requirements
 */

import type {
  DependencyGraph,
  DependencyGraphNode,
  DependencyGraphEdge,
  VersionConstraint,
  ConflictType,
  ConflictResolution,
  ResolutionStrategy
} from './types.js';

import type {
  ToolManifest,
  ToolDependency,
  Platform,
  Architecture,
  DependencyType
} from '../../shared/manifest-types.js';

/**
 * Detailed conflict information
 */
export interface ConflictDetail {
  /** Unique conflict identifier */
  id: string;
  /** Type of conflict detected */
  type: ConflictType;
  /** Severity level of the conflict */
  severity: 'critical' | 'major' | 'minor' | 'warning';
  /** Tools involved in the conflict */
  involvedTools: string[];
  /** Detailed description of the conflict */
  description: string;
  /** Root cause analysis */
  rootCause: string;
  /** Suggested resolution strategies */
  suggestedResolutions: ConflictResolutionStrategy[];
  /** Platform-specific impact */
  platformImpact: Record<Platform, 'high' | 'medium' | 'low' | 'none'>;
  /** Whether this conflict blocks installation */
  blocking: boolean;
  /** Dependencies that caused this conflict */
  conflictingDependencies: ConflictingDependency[];
  /** Metadata about conflict detection */
  metadata: {
    detectedAt: string;
    detectionMethod: string;
    confidence: number; // 0-100
    affectedComponents: string[];
  };
}

/**
 * Version conflict details
 */
export interface VersionConflictDetail {
  /** Tool with version conflict */
  toolId: string;
  /** Required versions from different sources */
  versionRequirements: VersionRequirement[];
  /** Incompatible version ranges */
  incompatibleRanges: string[];
  /** Best compromise version if available */
  compromiseVersion?: string;
  /** Reason why no version satisfies all requirements */
  unsatisfiableReason: string;
}

/**
 * Version requirement from a dependency source
 */
export interface VersionRequirement {
  /** Tool that requires this version */
  requiredBy: string;
  /** Version constraint */
  constraint: string;
  /** Type of dependency */
  dependencyType: DependencyType;
  /** Is this requirement strict or flexible */
  strict: boolean;
  /** Platforms this requirement applies to */
  platforms?: Platform[];
}

/**
 * Dependency that conflicts with others
 */
export interface ConflictingDependency {
  /** Source tool */
  from: string;
  /** Target tool */
  to: string;
  /** Dependency details */
  dependency: ToolDependency;
  /** What it conflicts with */
  conflictsWith: string[];
  /** Conflict reason */
  reason: string;
}

/**
 * Circular dependency cycle information
 */
export interface CircularDependencyDetail {
  /** Tools involved in the cycle */
  cycle: string[];
  /** Length of the cycle */
  cycleLength: number;
  /** Type of dependencies in cycle */
  dependencyTypes: DependencyType[];
  /** Can the cycle be broken */
  breakable: boolean;
  /** Suggested break points */
  breakPoints: CycleBreakPoint[];
  /** Impact if cycle is not resolved */
  impact: 'critical' | 'moderate' | 'low';
}

/**
 * Potential point to break a circular dependency
 */
export interface CycleBreakPoint {
  /** Edge to remove/modify */
  edge: { from: string; to: string };
  /** Strategy to break the cycle */
  strategy: 'defer' | 'optional' | 'substitute' | 'remove';
  /** Impact of breaking at this point */
  impact: number; // 0-100, lower is better
  /** Description of the break strategy */
  description: string;
}

/**
 * Platform incompatibility details
 */
export interface PlatformIncompatibilityDetail {
  /** Tools with platform issues */
  incompatibleTools: string[];
  /** Target platform */
  targetPlatform: Platform;
  /** Target architecture */
  targetArchitecture: Architecture;
  /** Missing platform support details */
  missingSupport: PlatformSupportGap[];
  /** Workarounds available */
  workarounds: PlatformWorkaround[];
}

/**
 * Platform support gap
 */
export interface PlatformSupportGap {
  /** Tool with missing support */
  toolId: string;
  /** Missing platforms */
  missingPlatforms: Platform[];
  /** Missing architectures */
  missingArchitectures: Architecture[];
  /** Alternative tools that support the platform */
  alternatives: string[];
}

/**
 * Platform compatibility workaround
 */
export interface PlatformWorkaround {
  /** Description of workaround */
  description: string;
  /** Complexity of implementing workaround */
  complexity: 'simple' | 'moderate' | 'complex';
  /** Reliability of workaround */
  reliability: number; // 0-100
  /** Steps to implement */
  steps: string[];
}

/**
 * Conflict resolution strategy
 */
export interface ConflictResolutionStrategy {
  /** Strategy name */
  name: string;
  /** Strategy type */
  type: 'automatic' | 'manual' | 'interactive';
  /** Confidence in this strategy */
  confidence: number; // 0-100
  /** Steps to resolve */
  steps: ResolutionStep[];
  /** Estimated time to resolve */
  estimatedTime: number; // minutes
  /** Success probability */
  successProbability: number; // 0-100
  /** Side effects of this resolution */
  sideEffects: string[];
}

/**
 * Individual resolution step
 */
export interface ResolutionStep {
  /** Step description */
  description: string;
  /** Action type */
  action: 'substitute' | 'defer' | 'upgrade' | 'downgrade' | 'remove' | 'configure';
  /** Target tool */
  target: string;
  /** Parameters for the action */
  parameters: Record<string, unknown>;
  /** Whether this step requires user confirmation */
  requiresConfirmation: boolean;
}

/**
 * Complete conflict detection result
 */
export interface ConflictDetectionResult {
  /** Whether any conflicts were found */
  hasConflicts: boolean;
  /** All detected conflicts */
  conflicts: ConflictDetail[];
  /** Version-specific conflicts */
  versionConflicts: VersionConflictDetail[];
  /** Circular dependency details */
  circularDependencies: CircularDependencyDetail[];
  /** Platform incompatibilities */
  platformIncompatibilities: PlatformIncompatibilityDetail[];
  /** Overall conflict severity */
  overallSeverity: 'critical' | 'major' | 'minor' | 'none';
  /** Whether installation can proceed */
  canProceed: boolean;
  /** Summary statistics */
  statistics: {
    totalConflicts: number;
    criticalConflicts: number;
    resolvableConflicts: number;
    blockerConflicts: number;
    detectionTime: number;
  };
  /** Recommended next actions */
  recommendations: string[];
}

/**
 * Advanced conflict detector with comprehensive analysis capabilities
 */
export class ConflictDetector {
  private graph: DependencyGraph;
  private targetPlatform: Platform;
  private targetArchitecture: Architecture;
  private detectionCache: Map<string, ConflictDetectionResult> = new Map();

  constructor(
    graph: DependencyGraph,
    targetPlatform: Platform = 'linux',
    targetArchitecture: Architecture = 'x64'
  ) {
    this.graph = graph;
    this.targetPlatform = targetPlatform;
    this.targetArchitecture = targetArchitecture;
  }

  /**
   * Perform comprehensive conflict detection
   */
  public async detectConflicts(
    targetTools: string[],
    options: { enableCaching?: boolean; thoroughAnalysis?: boolean } = {}
  ): Promise<ConflictDetectionResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.createCacheKey(targetTools, options);
      if (options.enableCaching !== false && this.detectionCache.has(cacheKey)) {
        return this.detectionCache.get(cacheKey)!;
      }

      const conflicts: ConflictDetail[] = [];
      const versionConflicts: VersionConflictDetail[] = [];
      const circularDependencies: CircularDependencyDetail[] = [];
      const platformIncompatibilities: PlatformIncompatibilityDetail[] = [];

      // 1. Detect version conflicts
      const versionResults = await this.detectVersionConflicts(targetTools);
      versionConflicts.push(...versionResults);

      // 2. Detect circular dependencies
      const circularResults = await this.detectCircularDependencies(targetTools);
      circularDependencies.push(...circularResults);

      // 3. Detect platform incompatibilities
      const platformResults = await this.detectPlatformIncompatibilities(targetTools);
      platformIncompatibilities.push(...platformResults);

      // 4. Detect cross-category conflicts
      const crossCategoryResults = await this.detectCrossCategoryConflicts(targetTools);
      conflicts.push(...crossCategoryResults);

      // 5. Detect resource conflicts
      const resourceResults = await this.detectResourceConflicts(targetTools);
      conflicts.push(...resourceResults);

      // 6. Advanced analysis if requested
      if (options.thoroughAnalysis) {
        const advancedResults = await this.performAdvancedAnalysis(targetTools);
        conflicts.push(...advancedResults);
      }

      // Compile final result
      const result = this.compileDetectionResult(
        conflicts,
        versionConflicts,
        circularDependencies,
        platformIncompatibilities,
        Date.now() - startTime
      );

      // Cache result
      if (options.enableCaching !== false) {
        this.detectionCache.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      return this.createFailureResult(
        `Conflict detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Detect version conflicts between dependencies
   */
  public async detectVersionConflicts(targetTools: string[]): Promise<VersionConflictDetail[]> {
    const conflicts: VersionConflictDetail[] = [];
    const toolVersionRequirements = new Map<string, VersionRequirement[]>();

    // Collect all version requirements
    for (const toolId of targetTools) {
      this.collectVersionRequirements(toolId, toolVersionRequirements, new Set());
    }

    // Analyze each tool for version conflicts
    for (const [toolId, requirements] of toolVersionRequirements) {
      if (requirements.length <= 1) continue;

      const conflictDetail = this.analyzeVersionRequirements(toolId, requirements);
      if (conflictDetail) {
        conflicts.push(conflictDetail);
      }
    }

    return conflicts;
  }

  /**
   * Detect circular dependencies in the dependency graph
   */
  public async detectCircularDependencies(targetTools: string[]): Promise<CircularDependencyDetail[]> {
    const cycles: CircularDependencyDetail[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const toolId of targetTools) {
      if (!visited.has(toolId)) {
        const foundCycles = this.findCyclesFromNode(toolId, visited, recursionStack, []);
        cycles.push(...foundCycles);
      }
    }

    return this.analyzeCycles(cycles);
  }

  /**
   * Detect platform compatibility issues
   */
  public async detectPlatformIncompatibilities(targetTools: string[]): Promise<PlatformIncompatibilityDetail[]> {
    const incompatibilities: PlatformIncompatibilityDetail[] = [];
    const reachableTools = this.getReachableTools(targetTools);
    const incompatibleTools: string[] = [];
    const missingSupport: PlatformSupportGap[] = [];

    for (const toolId of reachableTools) {
      const node = this.graph.getNode(toolId);
      if (!node) continue;

      const platformSupport = this.checkPlatformSupport(node);
      if (!platformSupport.supported) {
        incompatibleTools.push(toolId);
        missingSupport.push({
          toolId,
          missingPlatforms: platformSupport.missingPlatforms,
          missingArchitectures: platformSupport.missingArchitectures,
          alternatives: platformSupport.alternatives
        });
      }
    }

    if (incompatibleTools.length > 0) {
      incompatibilities.push({
        incompatibleTools,
        targetPlatform: this.targetPlatform,
        targetArchitecture: this.targetArchitecture,
        missingSupport,
        workarounds: this.generatePlatformWorkarounds(missingSupport)
      });
    }

    return incompatibilities;
  }

  /**
   * Detect conflicts between different tool categories
   */
  public async detectCrossCategoryConflicts(targetTools: string[]): Promise<ConflictDetail[]> {
    const conflicts: ConflictDetail[] = [];
    const categoryMap = new Map<string, string[]>();

    // Group tools by category
    for (const toolId of this.getReachableTools(targetTools)) {
      const node = this.graph.getNode(toolId);
      if (node) {
        const category = node.tool.category;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(toolId);
      }
    }

    // Check for known conflicting tool combinations
    const conflictingCombinations = this.getKnownConflictingCombinations();
    
    for (const combination of conflictingCombinations) {
      const foundTools = combination.tools.filter(toolId => 
        this.getReachableTools(targetTools).includes(toolId)
      );

      if (foundTools.length >= 2) {
        conflicts.push(this.createCrossCategoryConflict(combination, foundTools));
      }
    }

    return conflicts;
  }

  /**
   * Detect resource conflicts (ports, file paths, etc.)
   */
  public async detectResourceConflicts(targetTools: string[]): Promise<ConflictDetail[]> {
    const conflicts: ConflictDetail[] = [];
    const resourceUsage = new Map<string, string[]>();

    // Analyze resource usage for each tool
    for (const toolId of this.getReachableTools(targetTools)) {
      const node = this.graph.getNode(toolId);
      if (node) {
        const resources = this.extractResourceUsage(node);
        
        for (const [resource, usage] of Object.entries(resources)) {
          if (!resourceUsage.has(resource)) {
            resourceUsage.set(resource, []);
          }
          resourceUsage.get(resource)!.push(toolId);
        }
      }
    }

    // Find resource conflicts
    for (const [resource, users] of resourceUsage) {
      if (users.length > 1) {
        conflicts.push(this.createResourceConflict(resource, users));
      }
    }

    return conflicts;
  }

  // Private helper methods

  private collectVersionRequirements(
    toolId: string,
    requirements: Map<string, VersionRequirement[]>,
    visited: Set<string>
  ): void {
    if (visited.has(toolId)) return;
    visited.add(toolId);

    const edges = this.graph.getOutgoingEdges(toolId);
    for (const edge of edges) {
      const dep = edge.dependency;
      
      if (dep.minVersion || dep.maxVersion || dep.versionRange) {
        if (!requirements.has(edge.to)) {
          requirements.set(edge.to, []);
        }
        
        requirements.get(edge.to)!.push({
          requiredBy: toolId,
          constraint: this.formatVersionConstraint(dep),
          dependencyType: dep.type,
          strict: dep.type === 'required',
          platforms: dep.platforms
        });
      }

      this.collectVersionRequirements(edge.to, requirements, visited);
    }
  }

  private analyzeVersionRequirements(
    toolId: string,
    requirements: VersionRequirement[]
  ): VersionConflictDetail | null {
    // Group requirements by constraint type
    const constraints = this.parseVersionConstraints(requirements);
    
    // Check for incompatibilities
    const incompatibilities = this.findVersionIncompatibilities(constraints);
    
    if (incompatibilities.length > 0) {
      return {
        toolId,
        versionRequirements: requirements,
        incompatibleRanges: incompatibilities,
        compromiseVersion: this.findCompromiseVersion(toolId, requirements),
        unsatisfiableReason: this.generateUnsatisfiableReason(incompatibilities)
      };
    }

    return null;
  }

  private findCyclesFromNode(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): CircularDependencyDetail[] {
    const cycles: CircularDependencyDetail[] = [];

    if (recursionStack.has(nodeId)) {
      // Found a cycle
      const cycleStart = path.indexOf(nodeId);
      const cycle = path.slice(cycleStart).concat([nodeId]);
      
      if (cycle.length > 1) {
        cycles.push(this.createCircularDependencyDetail(cycle));
      }
      return cycles;
    }

    if (visited.has(nodeId)) {
      return cycles;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const edges = this.graph.getOutgoingEdges(nodeId);
    for (const edge of edges) {
      const foundCycles = this.findCyclesFromNode(
        edge.to,
        visited,
        recursionStack,
        [...path, nodeId]
      );
      cycles.push(...foundCycles);
    }

    recursionStack.delete(nodeId);
    return cycles;
  }

  private createCircularDependencyDetail(cycle: string[]): CircularDependencyDetail {
    const dependencyTypes: DependencyType[] = [];
    const breakPoints: CycleBreakPoint[] = [];

    // Analyze cycle edges
    for (let i = 0; i < cycle.length - 1; i++) {
      const from = cycle[i];
      const to = cycle[i + 1];
      const edge = this.graph.getEdge(from, to);
      
      if (edge) {
        dependencyTypes.push(edge.dependency.type);
        
        // Evaluate break points
        if (edge.dependency.type !== 'required') {
          breakPoints.push({
            edge: { from, to },
            strategy: edge.dependency.type === 'optional' ? 'defer' : 'optional',
            impact: this.calculateBreakImpact(edge),
            description: `Make ${from} -> ${to} dependency ${edge.dependency.type === 'optional' ? 'deferred' : 'optional'}`
          });
        }
      }
    }

    return {
      cycle: cycle.slice(0, -1), // Remove duplicate last element
      cycleLength: cycle.length - 1,
      dependencyTypes,
      breakable: breakPoints.length > 0,
      breakPoints: breakPoints.sort((a, b) => a.impact - b.impact),
      impact: this.assessCycleImpact(dependencyTypes)
    };
  }

  private checkPlatformSupport(node: DependencyGraphNode): {
    supported: boolean;
    missingPlatforms: Platform[];
    missingArchitectures: Architecture[];
    alternatives: string[];
  } {
    const manifest = node.tool;
    const supportedPlatforms = manifest.systemRequirements?.platforms || [];
    const supportedArchitectures = manifest.systemRequirements?.architectures || [];

    const missingPlatforms = supportedPlatforms.includes(this.targetPlatform) ? [] : [this.targetPlatform];
    const missingArchitectures = supportedArchitectures.includes(this.targetArchitecture) ? [] : [this.targetArchitecture];

    return {
      supported: missingPlatforms.length === 0 && missingArchitectures.length === 0,
      missingPlatforms,
      missingArchitectures,
      alternatives: this.findAlternativeTools(manifest.category, this.targetPlatform)
    };
  }

  private getReachableTools(targetTools: string[]): string[] {
    const reachable = new Set<string>();
    const queue = [...targetTools];

    while (queue.length > 0) {
      const toolId = queue.shift()!;
      
      if (reachable.has(toolId)) continue;
      reachable.add(toolId);

      const edges = this.graph.getOutgoingEdges(toolId);
      for (const edge of edges) {
        queue.push(edge.to);
      }
    }

    return Array.from(reachable);
  }

  private compileDetectionResult(
    conflicts: ConflictDetail[],
    versionConflicts: VersionConflictDetail[],
    circularDependencies: CircularDependencyDetail[],
    platformIncompatibilities: PlatformIncompatibilityDetail[],
    detectionTime: number
  ): ConflictDetectionResult {
    const allConflicts = [
      ...conflicts,
      ...versionConflicts.map(vc => this.versionConflictToConflictDetail(vc)),
      ...circularDependencies.map(cd => this.circularDependencyToConflictDetail(cd)),
      ...platformIncompatibilities.map(pi => this.platformIncompatibilityToConflictDetail(pi))
    ];

    const criticalConflicts = allConflicts.filter(c => c.severity === 'critical').length;
    const blockerConflicts = allConflicts.filter(c => c.blocking).length;
    
    return {
      hasConflicts: allConflicts.length > 0,
      conflicts: allConflicts,
      versionConflicts,
      circularDependencies,
      platformIncompatibilities,
      overallSeverity: this.determineOverallSeverity(allConflicts),
      canProceed: blockerConflicts === 0,
      statistics: {
        totalConflicts: allConflicts.length,
        criticalConflicts,
        resolvableConflicts: allConflicts.filter(c => c.suggestedResolutions.length > 0).length,
        blockerConflicts,
        detectionTime: Math.max(1, detectionTime) // Ensure at least 1ms
      },
      recommendations: this.generateRecommendations(allConflicts)
    };
  }

  // Utility methods for formatting and analysis

  private formatVersionConstraint(dep: ToolDependency): string {
    const parts: string[] = [];
    if (dep.minVersion) parts.push(`>=${dep.minVersion}`);
    if (dep.maxVersion) parts.push(`<=${dep.maxVersion}`);
    if (dep.versionRange) parts.push(dep.versionRange);
    return parts.join(' && ') || 'any';
  }

  private parseVersionConstraints(requirements: VersionRequirement[]): Record<string, string[]> {
    // Simplified constraint parsing - would use semver in real implementation
    const constraints: Record<string, string[]> = {};
    
    for (const req of requirements) {
      if (!constraints[req.requiredBy]) {
        constraints[req.requiredBy] = [];
      }
      constraints[req.requiredBy].push(req.constraint);
    }
    
    return constraints;
  }

  private findVersionIncompatibilities(constraints: Record<string, string[]>): string[] {
    // Simplified incompatibility detection
    const incompatibilities: string[] = [];
    const allConstraints = Object.values(constraints).flat();
    
    // Look for obvious conflicts like >=2.0 && <=1.0
    for (let i = 0; i < allConstraints.length; i++) {
      for (let j = i + 1; j < allConstraints.length; j++) {
        if (this.areConstraintsIncompatible(allConstraints[i], allConstraints[j])) {
          incompatibilities.push(`${allConstraints[i]} conflicts with ${allConstraints[j]}`);
        }
      }
    }
    
    return incompatibilities;
  }

  private areConstraintsIncompatible(constraint1: string, constraint2: string): boolean {
    // Simplified constraint conflict detection
    if (constraint1.includes('>=') && constraint2.includes('<=')) {
      const min = this.extractVersion(constraint1);
      const max = this.extractVersion(constraint2);
      return this.compareVersions(min, max) > 0;
    }
    
    return false;
  }

  private extractVersion(constraint: string): string {
    return constraint.replace(/[><=]/g, '').trim();
  }

  private compareVersions(v1: string, v2: string): number {
    // Simplified version comparison
    const parts1 = v1.split('.').map(p => parseInt(p) || 0);
    const parts2 = v2.split('.').map(p => parseInt(p) || 0);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 !== part2) {
        return part1 - part2;
      }
    }
    
    return 0;
  }

  private findCompromiseVersion(toolId: string, requirements: VersionRequirement[]): string | undefined {
    const node = this.graph.getNode(toolId);
    if (!node) return undefined;
    
    const availableVersions = node.versionInfo.availableVersions;
    
    // Find a version that satisfies most requirements
    for (const version of availableVersions) {
      if (this.versionSatisfiesMostRequirements(version, requirements)) {
        return version;
      }
    }
    
    return undefined;
  }

  private versionSatisfiesMostRequirements(version: string, requirements: VersionRequirement[]): boolean {
    // Simplified check - would use proper semver satisfaction
    let satisfied = 0;
    
    for (const req of requirements) {
      if (this.versionSatisfiesConstraint(version, req.constraint)) {
        satisfied++;
      }
    }
    
    return satisfied >= requirements.length * 0.8; // 80% satisfaction threshold
  }

  private versionSatisfiesConstraint(version: string, constraint: string): boolean {
    // Simplified constraint satisfaction
    if (constraint === 'any') return true;
    if (constraint.includes('>=')) {
      const minVersion = this.extractVersion(constraint);
      return this.compareVersions(version, minVersion) >= 0;
    }
    if (constraint.includes('<=')) {
      const maxVersion = this.extractVersion(constraint);
      return this.compareVersions(version, maxVersion) <= 0;
    }
    return true;
  }

  private generateUnsatisfiableReason(incompatibilities: string[]): string {
    return `Version requirements cannot be satisfied: ${incompatibilities.join(', ')}`;
  }

  private calculateBreakImpact(edge: DependencyGraphEdge): number {
    // Calculate impact of breaking this edge (0-100, lower is better)
    let impact = 50; // Base impact
    
    if (edge.dependency.type === 'required') {
      impact += 40;
    } else if (edge.dependency.type === 'optional') {
      impact -= 20;
    } else if (edge.dependency.type === 'suggests') {
      impact -= 30;
    }
    
    return Math.max(0, Math.min(100, impact));
  }

  private assessCycleImpact(dependencyTypes: DependencyType[]): 'critical' | 'moderate' | 'low' {
    const requiredCount = dependencyTypes.filter(type => type === 'required').length;
    
    if (requiredCount === dependencyTypes.length) {
      return 'critical';
    } else if (requiredCount > dependencyTypes.length / 2) {
      return 'moderate';
    } else {
      return 'low';
    }
  }

  private findAlternativeTools(category: string, platform: Platform): string[] {
    // Find alternative tools in the same category that support the platform
    const alternatives: string[] = [];
    
    for (const node of this.graph.getAllNodes()) {
      if (node.tool.category === category) {
        const supportedPlatforms = node.tool.systemRequirements?.platforms || [];
        if (supportedPlatforms.includes(platform)) {
          alternatives.push(node.tool.id);
        }
      }
    }
    
    return alternatives;
  }

  private getKnownConflictingCombinations(): Array<{ tools: string[]; reason: string }> {
    // Known tool combinations that conflict
    return [
      {
        tools: ['npm', 'yarn'],
        reason: 'Package managers conflict with each other'
      },
      {
        tools: ['python2', 'python3'],
        reason: 'Different Python versions may conflict'
      }
    ];
  }

  private createCrossCategoryConflict(
    combination: { tools: string[]; reason: string },
    foundTools: string[]
  ): ConflictDetail {
    return {
      id: `cross-category-${foundTools.join('-')}`,
      type: 'tool',
      severity: 'major',
      involvedTools: foundTools,
      description: `Tools ${foundTools.join(', ')} conflict with each other`,
      rootCause: combination.reason,
      suggestedResolutions: [{
        name: 'Remove conflicting tools',
        type: 'manual',
        confidence: 80,
        steps: [{
          description: `Choose one of: ${foundTools.join(', ')}`,
          action: 'remove',
          target: foundTools[1],
          parameters: {},
          requiresConfirmation: true
        }],
        estimatedTime: 5,
        successProbability: 90,
        sideEffects: []
      }],
      platformImpact: {
        windows: 'medium',
        macos: 'medium',
        linux: 'medium'
      },
      blocking: true,
      conflictingDependencies: [],
      metadata: {
        detectedAt: new Date().toISOString(),
        detectionMethod: 'cross-category-analysis',
        confidence: 85,
        affectedComponents: foundTools
      }
    };
  }

  private extractResourceUsage(node: DependencyGraphNode): Record<string, string> {
    // Extract resource usage patterns from tool manifest
    const resources: Record<string, string> = {};
    
    // Common port assignments (simplified)
    const commonPorts: Record<string, number> = {
      'nginx': 80,
      'apache': 80,
      'mysql': 3306,
      'postgresql': 5432,
      'redis': 6379,
      'mongodb': 27017
    };
    
    const toolId = node.tool.id;
    if (commonPorts[toolId]) {
      resources[`port-${commonPorts[toolId]}`] = `Port ${commonPorts[toolId]}`;
    }
    
    return resources;
  }

  private createResourceConflict(resource: string, users: string[]): ConflictDetail {
    return {
      id: `resource-${resource}-${users.join('-')}`,
      type: 'resource',
      severity: 'major',
      involvedTools: users,
      description: `Multiple tools competing for ${resource}`,
      rootCause: `Resource ${resource} can only be used by one tool at a time`,
      suggestedResolutions: [{
        name: 'Configure different resources',
        type: 'manual',
        confidence: 70,
        steps: [{
          description: `Configure ${users[1]} to use different ${resource.split('-')[0]}`,
          action: 'configure',
          target: users[1],
          parameters: { resource: resource },
          requiresConfirmation: true
        }],
        estimatedTime: 15,
        successProbability: 80,
        sideEffects: ['May require manual configuration']
      }],
      platformImpact: {
        windows: 'high',
        macos: 'high',
        linux: 'high'
      },
      blocking: true,
      conflictingDependencies: [],
      metadata: {
        detectedAt: new Date().toISOString(),
        detectionMethod: 'resource-analysis',
        confidence: 90,
        affectedComponents: users
      }
    };
  }

  private performAdvancedAnalysis(targetTools: string[]): Promise<ConflictDetail[]> {
    // Placeholder for advanced conflict analysis
    // Would include AI-based pattern recognition, historical conflict data, etc.
    return Promise.resolve([]);
  }

  private analyzeCycles(cycles: CircularDependencyDetail[]): CircularDependencyDetail[] {
    // Remove duplicate cycles and analyze them
    const uniqueCycles = new Map<string, CircularDependencyDetail>();
    
    for (const cycle of cycles) {
      const key = cycle.cycle.sort().join('-');
      if (!uniqueCycles.has(key) || uniqueCycles.get(key)!.cycleLength > cycle.cycleLength) {
        uniqueCycles.set(key, cycle);
      }
    }
    
    return Array.from(uniqueCycles.values());
  }

  private generatePlatformWorkarounds(missingSupport: PlatformSupportGap[]): PlatformWorkaround[] {
    const workarounds: PlatformWorkaround[] = [];
    
    for (const gap of missingSupport) {
      if (gap.alternatives.length > 0) {
        workarounds.push({
          description: `Use ${gap.alternatives[0]} instead of ${gap.toolId}`,
          complexity: 'simple',
          reliability: 85,
          steps: [
            `Remove ${gap.toolId} from installation`,
            `Add ${gap.alternatives[0]} as replacement`
          ]
        });
      }
    }
    
    return workarounds;
  }

  private versionConflictToConflictDetail(vc: VersionConflictDetail): ConflictDetail {
    return {
      id: `version-${vc.toolId}`,
      type: 'version',
      severity: 'major',
      involvedTools: [vc.toolId, ...vc.versionRequirements.map(vr => vr.requiredBy)],
      description: `Version conflict for ${vc.toolId}`,
      rootCause: vc.unsatisfiableReason,
      suggestedResolutions: [],
      platformImpact: { windows: 'medium', macos: 'medium', linux: 'medium' },
      blocking: true,
      conflictingDependencies: [],
      metadata: {
        detectedAt: new Date().toISOString(),
        detectionMethod: 'version-analysis',
        confidence: 95,
        affectedComponents: [vc.toolId]
      }
    };
  }

  private circularDependencyToConflictDetail(cd: CircularDependencyDetail): ConflictDetail {
    return {
      id: `circular-${cd.cycle.join('-')}`,
      type: 'circular',
      severity: cd.impact === 'critical' ? 'critical' : 'major',
      involvedTools: cd.cycle,
      description: `Circular dependency: ${cd.cycle.join(' -> ')} -> ${cd.cycle[0]}`,
      rootCause: 'Tools depend on each other in a circular manner',
      suggestedResolutions: cd.breakPoints.map(bp => ({
        name: bp.description,
        type: 'automatic' as const,
        confidence: 100 - bp.impact,
        steps: [{
          description: bp.description,
          action: bp.strategy as any,
          target: bp.edge.from,
          parameters: { to: bp.edge.to },
          requiresConfirmation: false
        }],
        estimatedTime: 1,
        successProbability: 100 - bp.impact,
        sideEffects: []
      })),
      platformImpact: { windows: 'high', macos: 'high', linux: 'high' },
      blocking: !cd.breakable,
      conflictingDependencies: [],
      metadata: {
        detectedAt: new Date().toISOString(),
        detectionMethod: 'cycle-detection',
        confidence: 100,
        affectedComponents: cd.cycle
      }
    };
  }

  private platformIncompatibilityToConflictDetail(pi: PlatformIncompatibilityDetail): ConflictDetail {
    return {
      id: `platform-${pi.targetPlatform}-${pi.incompatibleTools.join('-')}`,
      type: 'platform',
      severity: 'critical',
      involvedTools: pi.incompatibleTools,
      description: `Platform incompatibility for ${pi.targetPlatform}`,
      rootCause: `Tools ${pi.incompatibleTools.join(', ')} do not support ${pi.targetPlatform}`,
      suggestedResolutions: pi.workarounds.map(w => ({
        name: w.description,
        type: 'manual' as const,
        confidence: w.reliability,
        steps: w.steps.map(step => ({
          description: step,
          action: 'substitute' as const,
          target: pi.incompatibleTools[0],
          parameters: {},
          requiresConfirmation: true
        })),
        estimatedTime: w.complexity === 'simple' ? 5 : w.complexity === 'moderate' ? 15 : 30,
        successProbability: w.reliability,
        sideEffects: []
      })),
      platformImpact: { [pi.targetPlatform]: 'high' } as any,
      blocking: true,
      conflictingDependencies: [],
      metadata: {
        detectedAt: new Date().toISOString(),
        detectionMethod: 'platform-analysis',
        confidence: 100,
        affectedComponents: pi.incompatibleTools
      }
    };
  }

  private determineOverallSeverity(conflicts: ConflictDetail[]): 'critical' | 'major' | 'minor' | 'none' {
    if (conflicts.length === 0) return 'none';
    
    const severities = conflicts.map(c => c.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('major')) return 'major';
    return 'minor';
  }

  private generateRecommendations(conflicts: ConflictDetail[]): string[] {
    const recommendations: string[] = [];
    
    if (conflicts.length === 0) {
      recommendations.push('No conflicts detected. Installation can proceed.');
      return recommendations;
    }
    
    const blockers = conflicts.filter(c => c.blocking);
    if (blockers.length > 0) {
      recommendations.push(`Resolve ${blockers.length} blocking conflicts before installation`);
    }
    
    const resolvable = conflicts.filter(c => c.suggestedResolutions.length > 0);
    if (resolvable.length > 0) {
      recommendations.push(`${resolvable.length} conflicts have suggested resolutions`);
    }
    
    return recommendations;
  }

  private createCacheKey(targetTools: string[], options: any): string {
    return JSON.stringify({
      tools: targetTools.sort(),
      platform: this.targetPlatform,
      arch: this.targetArchitecture,
      options
    });
  }

  private createFailureResult(error: string, detectionTime: number): ConflictDetectionResult {
    return {
      hasConflicts: true,
      conflicts: [{
        id: 'detection-failure',
        type: 'system',
        severity: 'critical',
        involvedTools: [],
        description: 'Conflict detection failed',
        rootCause: error,
        suggestedResolutions: [],
        platformImpact: { windows: 'none', macos: 'none', linux: 'none' },
        blocking: true,
        conflictingDependencies: [],
        metadata: {
          detectedAt: new Date().toISOString(),
          detectionMethod: 'error',
          confidence: 0,
          affectedComponents: []
        }
      }],
      versionConflicts: [],
      circularDependencies: [],
      platformIncompatibilities: [],
      overallSeverity: 'critical',
      canProceed: false,
      statistics: {
        totalConflicts: 1,
        criticalConflicts: 1,
        resolvableConflicts: 0,
        blockerConflicts: 1,
        detectionTime: Math.max(1, detectionTime) // Ensure at least 1ms
      },
      recommendations: ['Fix conflict detection system before proceeding']
    };
  }

  /**
   * Clear conflict detection cache
   */
  public clearCache(): void {
    this.detectionCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.detectionCache.size,
      hitRate: 0 // Would track in real implementation
    };
  }
}

/**
 * Factory function to create a conflict detector
 */
export function createConflictDetector(
  graph: DependencyGraph,
  targetPlatform: Platform = 'linux',
  targetArchitecture: Architecture = 'x64'
): ConflictDetector {
  return new ConflictDetector(graph, targetPlatform, targetArchitecture);
}

/**
 * Convenience function for quick conflict detection
 */
export async function detectConflicts(
  graph: DependencyGraph,
  targetTools: string[],
  options: { platform?: Platform; architecture?: Architecture; thoroughAnalysis?: boolean } = {}
): Promise<ConflictDetectionResult> {
  const detector = createConflictDetector(
    graph,
    options.platform || 'linux',
    options.architecture || 'x64'
  );
  
  return detector.detectConflicts(targetTools, {
    enableCaching: true,
    thoroughAnalysis: options.thoroughAnalysis || false
  });
}