/**
 * Dependency Graph Implementation
 * Core data structure for representing and manipulating tool dependencies
 */

import type {
  DependencyGraphNode,
  DependencyGraphEdge,
  GraphTraversalConfig,
  GraphValidationConfig,
  GraphStatistics,
  GraphConstructionOptions,
  GraphSerializationOptions,
  TraversalState,
  TraversalAlgorithm,
  VisitOrder,
  ConflictStatus,
  ResolutionResult,
  ValidationRule,
  ComplexityMetrics
} from './types.js';

import type { 
  ToolManifest, 
  ToolCategory, 
  Platform,
  ValidationResult,
  ValidationError 
} from '../../shared/manifest-types.js';

/**
 * Main dependency graph class using adjacency list representation
 */
export class DependencyGraph {
  private nodes: Map<string, DependencyGraphNode>;
  private adjacencyList: Map<string, Set<string>>;
  private reverseAdjacencyList: Map<string, Set<string>>;
  private edges: Map<string, DependencyGraphEdge>;
  private metadata: GraphMetadata;
  private statistics: GraphStatistics | null;
  private validationCache: Map<string, ValidationResult>;

  constructor() {
    this.nodes = new Map();
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
    this.edges = new Map();
    this.metadata = this.initializeMetadata();
    this.statistics = null;
    this.validationCache = new Map();
  }

  /**
   * Add a node to the graph
   */
  public addNode(node: DependencyGraphNode): boolean {
    try {
      if (this.nodes.has(node.id)) {
        return false; // Node already exists
      }

      this.nodes.set(node.id, node);
      this.adjacencyList.set(node.id, new Set());
      this.reverseAdjacencyList.set(node.id, new Set());
      
      this.invalidateCache();
      this.updateMetadata('nodeAdded', node.id);
      
      return true;
    } catch (error) {
      console.error(`Failed to add node ${node.id}:`, error);
      return false;
    }
  }

  /**
   * Remove a node from the graph
   */
  public removeNode(nodeId: string): boolean {
    try {
      if (!this.nodes.has(nodeId)) {
        return false; // Node doesn't exist
      }

      // Remove all edges connected to this node
      const outgoingEdges = this.adjacencyList.get(nodeId) || new Set();
      const incomingEdges = this.reverseAdjacencyList.get(nodeId) || new Set();

      // Remove outgoing edges
      for (const targetId of Array.from(outgoingEdges)) {
        this.removeEdge(nodeId, targetId);
      }

      // Remove incoming edges
      for (const sourceId of Array.from(incomingEdges)) {
        this.removeEdge(sourceId, nodeId);
      }

      // Remove the node itself
      this.nodes.delete(nodeId);
      this.adjacencyList.delete(nodeId);
      this.reverseAdjacencyList.delete(nodeId);

      this.invalidateCache();
      this.updateMetadata('nodeRemoved', nodeId);

      return true;
    } catch (error) {
      console.error(`Failed to remove node ${nodeId}:`, error);
      return false;
    }
  }

  /**
   * Add an edge to the graph
   */
  public addEdge(edge: DependencyGraphEdge): boolean {
    try {
      const edgeKey = this.getEdgeKey(edge.from, edge.to);
      
      if (this.edges.has(edgeKey)) {
        return false; // Edge already exists
      }

      if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
        console.error(`Cannot add edge: nodes ${edge.from} or ${edge.to} do not exist`);
        return false;
      }

      this.edges.set(edgeKey, edge);
      this.adjacencyList.get(edge.from)?.add(edge.to);
      this.reverseAdjacencyList.get(edge.to)?.add(edge.from);

      this.invalidateCache();
      this.updateMetadata('edgeAdded', edgeKey);

      return true;
    } catch (error) {
      console.error(`Failed to add edge ${edge.from} -> ${edge.to}:`, error);
      return false;
    }
  }

  /**
   * Remove an edge from the graph
   */
  public removeEdge(fromId: string, toId: string): boolean {
    try {
      const edgeKey = this.getEdgeKey(fromId, toId);
      
      if (!this.edges.has(edgeKey)) {
        return false; // Edge doesn't exist
      }

      this.edges.delete(edgeKey);
      this.adjacencyList.get(fromId)?.delete(toId);
      this.reverseAdjacencyList.get(toId)?.delete(fromId);

      this.invalidateCache();
      this.updateMetadata('edgeRemoved', edgeKey);

      return true;
    } catch (error) {
      console.error(`Failed to remove edge ${fromId} -> ${toId}:`, error);
      return false;
    }
  }

  /**
   * Get a node by ID
   */
  public getNode(nodeId: string): DependencyGraphNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Check if a node exists
   */
  public hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  /**
   * Get an edge by source and target IDs
   */
  public getEdge(fromId: string, toId: string): DependencyGraphEdge | undefined {
    const edgeKey = this.getEdgeKey(fromId, toId);
    return this.edges.get(edgeKey);
  }

  /**
   * Get all nodes in the graph
   */
  public getAllNodes(): DependencyGraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges in the graph
   */
  public getAllEdges(): DependencyGraphEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get outgoing edges from a node
   */
  public getOutgoingEdges(nodeId: string): DependencyGraphEdge[] {
    const outgoingEdges: DependencyGraphEdge[] = [];
    const dependencies = this.getDependencies(nodeId);
    
    for (const depId of dependencies) {
      const edge = this.getEdge(nodeId, depId);
      if (edge) {
        outgoingEdges.push(edge);
      }
    }
    
    return outgoingEdges;
  }

  /**
   * Get incoming edges to a node
   */
  public getIncomingEdges(nodeId: string): DependencyGraphEdge[] {
    const incomingEdges: DependencyGraphEdge[] = [];
    const dependents = this.getDependents(nodeId);
    
    for (const depId of dependents) {
      const edge = this.getEdge(depId, nodeId);
      if (edge) {
        incomingEdges.push(edge);
      }
    }
    
    return incomingEdges;
  }

  /**
   * Get direct dependencies of a node
   */
  public getDependencies(nodeId: string): string[] {
    const dependencies = this.adjacencyList.get(nodeId);
    return dependencies ? Array.from(dependencies) : [];
  }

  /**
   * Get direct dependents of a node
   */
  public getDependents(nodeId: string): string[] {
    const dependents = this.reverseAdjacencyList.get(nodeId);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * Get all transitive dependencies of a node
   */
  public getTransitiveDependencies(nodeId: string): string[] {
    const visited = new Set<string>();
    const dependencies = new Set<string>();

    const dfs = (currentId: string) => {
      if (visited.has(currentId)) {
        return;
      }
      visited.add(currentId);

      const directDeps = this.getDependencies(currentId);
      for (const depId of directDeps) {
        dependencies.add(depId);
        dfs(depId);
      }
    };

    dfs(nodeId);
    return Array.from(dependencies);
  }

  /**
   * Get all transitive dependents of a node
   */
  public getTransitiveDependents(nodeId: string): string[] {
    const visited = new Set<string>();
    const dependents = new Set<string>();

    const dfs = (currentId: string) => {
      if (visited.has(currentId)) {
        return;
      }
      visited.add(currentId);

      const directDeps = this.getDependents(currentId);
      for (const depId of directDeps) {
        dependents.add(depId);
        dfs(depId);
      }
    };

    dfs(nodeId);
    return Array.from(dependents);
  }

  /**
   * Check if there's a path from one node to another
   */
  public hasPath(fromId: string, toId: string): boolean {
    if (!this.hasNode(fromId) || !this.hasNode(toId)) {
      return false;
    }

    if (fromId === toId) {
      return true;
    }

    const visited = new Set<string>();
    const queue = [fromId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      if (visited.has(currentId)) {
        continue;
      }
      
      visited.add(currentId);

      const dependencies = this.getDependencies(currentId);
      for (const depId of dependencies) {
        if (depId === toId) {
          return true;
        }
        if (!visited.has(depId)) {
          queue.push(depId);
        }
      }
    }

    return false;
  }

  /**
   * Perform graph traversal with specified algorithm
   */
  public traverse(config: GraphTraversalConfig): TraversalResult {
    try {
      const startTime = Date.now();
      this.resetTraversalStates();

      let result: string[];
      switch (config.algorithm) {
        case 'depth-first':
          result = this.depthFirstTraversal(config);
          break;
        case 'breadth-first':
          result = this.breadthFirstTraversal(config);
          break;
        case 'topological':
          result = this.topologicalSort(config);
          break;
        case 'dependency-first':
          result = this.dependencyFirstTraversal(config);
          break;
        case 'category-first':
          result = this.categoryFirstTraversal(config);
          break;
        default:
          throw new Error(`Unsupported traversal algorithm: ${config.algorithm}`);
      }

      const endTime = Date.now();
      return {
        nodes: result,
        executionTime: endTime - startTime,
        algorithm: config.algorithm,
        visitOrder: config.visitOrder,
        metadata: this.getTraversalMetadata(result)
      };
    } catch (error) {
      console.error('Graph traversal failed:', error);
      throw error;
    }
  }

  /**
   * Detect cycles in the graph
   */
  public detectCycles(): CycleDetectionResult {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart).concat([nodeId]);
        cycles.push(cycle);
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const dependencies = this.getDependencies(nodeId);
      for (const depId of dependencies) {
        if (dfs(depId, [...path, nodeId])) {
          // Cycle detected, but continue to find all cycles
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check all nodes to find all cycles
    for (const nodeId of Array.from(this.nodes.keys())) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return {
      hasCycles: cycles.length > 0,
      cycles,
      cycleCount: cycles.length,
      affectedNodes: this.getAffectedNodesFromCycles(cycles)
    };
  }

  /**
   * Validate the graph structure and constraints
   */
  public validate(config: GraphValidationConfig): ValidationResult {
    const cacheKey = this.getValidationCacheKey(config);
    const cached = this.validationCache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // Basic structural validation
      this.validateStructure(errors, warnings);
      
      // Platform compatibility validation
      if (config.crossPlatformValidation) {
        this.validatePlatformCompatibility(errors, warnings);
      }

      // Custom rule validation
      for (const rule of config.rules) {
        this.validateRule(rule, errors, warnings);
      }

      // Cycle validation
      const cycleResult = this.detectCycles();
      if (cycleResult.hasCycles) {
        const severity = config.strictness === 'strict' ? 'error' : 'warning';
        const targetArray = severity === 'error' ? errors : warnings;
        
        targetArray.push({
          code: 'CIRCULAR_DEPENDENCY',
          message: `Found ${cycleResult.cycleCount} circular dependencies`,
          path: 'graph.cycles',
          severity,
          suggestion: 'Review and remove circular dependencies'
        });
      }

      const isValid = errors.length === 0 && (config.strictness !== 'strict' || warnings.length === 0);
      
      const result: ValidationResult = {
        isValid,
        errors,
        warnings,
        metadata: {
          validatedAt: new Date().toISOString(),
          schemaVersion: '1.0.0',
          validatorVersion: '1.0.0'
        }
      };

      this.validationCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Graph validation failed:', error);
      
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          path: 'graph',
          severity: 'error'
        }],
        warnings: [],
        metadata: {
          validatedAt: new Date().toISOString(),
          schemaVersion: '1.0.0',
          validatorVersion: '1.0.0'
        }
      };
    }
  }

  /**
   * Calculate graph statistics
   */
  public calculateStatistics(): GraphStatistics {
    if (this.statistics && this.isStatisticsCacheValid()) {
      return this.statistics;
    }

    const nodeCount = this.nodes.size;
    const edgeCount = this.edges.size;
    
    let maxDepth = 0;
    let totalDegree = 0;
    const categoryDistribution: Record<ToolCategory, number> = {} as Record<ToolCategory, number>;
    const platformCoverage: Record<Platform, number> = {} as Record<Platform, number>;

    // Calculate basic metrics
    for (const node of Array.from(this.nodes.values())) {
      const depth = this.calculateNodeDepth(node.id);
      maxDepth = Math.max(maxDepth, depth);
      
      const degree = this.getDependencies(node.id).length + this.getDependents(node.id).length;
      totalDegree += degree;

      // Update category distribution
      categoryDistribution[node.category] = (categoryDistribution[node.category] || 0) + 1;

      // Update platform coverage
      for (const platform of node.platformMetadata.supportedPlatforms) {
        platformCoverage[platform] = (platformCoverage[platform] || 0) + 1;
      }
    }

    const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
    
    // Calculate strongly connected components
    const stronglyConnectedComponents = this.calculateStronglyConnectedComponents();
    
    // Calculate critical path
    const criticalPathLength = this.calculateCriticalPath();
    
    // Calculate complexity metrics
    const complexityMetrics = this.calculateComplexityMetrics();

    this.statistics = {
      nodeCount,
      edgeCount,
      maxDepth,
      averageDegree,
      stronglyConnectedComponents,
      criticalPathLength,
      categoryDistribution,
      platformCoverage,
      complexityMetrics
    };

    return this.statistics;
  }

  /**
   * Get nodes by category
   */
  public getNodesByCategory(category: ToolCategory): DependencyGraphNode[] {
    return Array.from(this.nodes.values()).filter(node => node.category === category);
  }

  /**
   * Get nodes by platform
   */
  public getNodesByPlatform(platform: Platform): DependencyGraphNode[] {
    return Array.from(this.nodes.values()).filter(
      node => node.platformMetadata.supportedPlatforms.includes(platform)
    );
  }

  /**
   * Get subgraph for specific nodes
   */
  public getSubgraph(nodeIds: string[]): DependencyGraph {
    const subgraph = new DependencyGraph();
    const nodeSet = new Set(nodeIds);

    // Add nodes
    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (node) {
        subgraph.addNode(node);
      }
    }

    // Add edges that connect included nodes
    for (const edge of Array.from(this.edges.values())) {
      if (nodeSet.has(edge.from) && nodeSet.has(edge.to)) {
        subgraph.addEdge(edge);
      }
    }

    return subgraph;
  }

  /**
   * Clear the graph
   */
  public clear(): void {
    this.nodes.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
    this.edges.clear();
    this.validationCache.clear();
    this.statistics = null;
    this.metadata = this.initializeMetadata();
  }

  /**
   * Check if the graph is empty
   */
  public isEmpty(): boolean {
    return this.nodes.size === 0;
  }

  /**
   * Get graph size metrics
   */
  public getSize(): { nodes: number; edges: number } {
    return {
      nodes: this.nodes.size,
      edges: this.edges.size
    };
  }

  // Private helper methods

  private getEdgeKey(fromId: string, toId: string): string {
    return `${fromId}->${toId}`;
  }

  private initializeMetadata(): GraphMetadata {
    return {
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      operations: []
    };
  }

  private updateMetadata(operation: string, target: string): void {
    this.metadata.lastModified = Date.now();
    this.metadata.operations.push({
      type: operation,
      target,
      timestamp: Date.now()
    });
  }

  private invalidateCache(): void {
    this.statistics = null;
    this.validationCache.clear();
  }

  private resetTraversalStates(): void {
    for (const node of Array.from(this.nodes.values())) {
      node.graphMetadata.traversalState = 'unvisited';
    }
  }

  private depthFirstTraversal(config: GraphTraversalConfig): string[] {
    const result: string[] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string, depth: number) => {
      if (visited.has(nodeId) || (config.maxDepth && depth > config.maxDepth)) {
        return;
      }

      visited.add(nodeId);
      result.push(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        node.graphMetadata.traversalState = 'visiting';
      }

      const dependencies = this.getDependencies(nodeId);
      for (const depId of dependencies) {
        dfs(depId, depth + 1);
      }

      if (node) {
        node.graphMetadata.traversalState = 'visited';
      }
    };

    for (const startNode of config.startNodes) {
      if (!visited.has(startNode)) {
        dfs(startNode, 0);
      }
    }

    return result;
  }

  private breadthFirstTraversal(config: GraphTraversalConfig): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [];

    // Initialize queue with start nodes
    for (const startNode of config.startNodes) {
      queue.push({ nodeId: startNode, depth: 0 });
    }

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;

      if (visited.has(nodeId) || (config.maxDepth && depth > config.maxDepth)) {
        continue;
      }

      visited.add(nodeId);
      result.push(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        node.graphMetadata.traversalState = 'visited';
      }

      const dependencies = this.getDependencies(nodeId);
      for (const depId of dependencies) {
        if (!visited.has(depId)) {
          queue.push({ nodeId: depId, depth: depth + 1 });
        }
      }
    }

    return result;
  }

  private topologicalSort(config: GraphTraversalConfig): string[] {
    const inDegree = new Map<string, number>();
    const result: string[] = [];
    const queue: string[] = [];

    // Initialize dependency count (number of outgoing edges = number of dependencies)
    for (const nodeId of Array.from(this.nodes.keys())) {
      // Dependency count is the number of outgoing edges (adjacency list)
      inDegree.set(nodeId, this.adjacencyList.get(nodeId)?.size || 0);
    }

    // Find nodes with no dependencies (can be processed first)  
    for (const [nodeId, degree] of Array.from(inDegree.entries())) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      // For each node that depends on the current node (those that have this as a dependency)
      const dependents = this.getDependents(nodeId);
      for (const depId of dependents) {
        const newDegree = (inDegree.get(depId) || 0) - 1;
        inDegree.set(depId, newDegree);
        
        if (newDegree === 0) {
          queue.push(depId);
        }
      }
    }

    // Check for cycles
    if (result.length !== this.nodes.size) {
      throw new Error('Graph contains cycles, cannot perform topological sort');
    }

    return result;
  }

  private dependencyFirstTraversal(config: GraphTraversalConfig): string[] {
    // Sort by dependency count (fewer dependencies first)
    const nodes = Array.from(this.nodes.keys()).sort((a, b) => {
      const depsA = this.getDependencies(a).length;
      const depsB = this.getDependencies(b).length;
      return depsA - depsB;
    });

    return nodes;
  }

  private categoryFirstTraversal(config: GraphTraversalConfig): string[] {
    const categorizedNodes = new Map<ToolCategory, string[]>();

    // Group nodes by category
    for (const node of Array.from(this.nodes.values())) {
      if (!categorizedNodes.has(node.category)) {
        categorizedNodes.set(node.category, []);
      }
      categorizedNodes.get(node.category)!.push(node.id);
    }

    // Flatten in category order
    const result: string[] = [];
    const categoryOrder: ToolCategory[] = [
      'language', 'version-control', 'backend', 'frontend', 
      'database', 'devops', 'testing', 'security', 'cloud',
      'mobile', 'design', 'productivity'
    ];

    for (const category of categoryOrder) {
      const nodes = categorizedNodes.get(category);
      if (nodes) {
        result.push(...nodes);
      }
    }

    return result;
  }

  private getTraversalMetadata(nodes: string[]): TraversalMetadata {
    return {
      totalNodes: nodes.length,
      startTime: Date.now(),
      endTime: Date.now(),
      memoryUsage: process.memoryUsage?.().heapUsed || 0
    };
  }

  private calculateNodeDepth(nodeId: string): number {
    const visited = new Set<string>();
    let maxDepth = 0;

    const dfs = (currentId: string, depth: number) => {
      if (visited.has(currentId)) {
        return;
      }
      visited.add(currentId);
      maxDepth = Math.max(maxDepth, depth);

      const dependencies = this.getDependencies(currentId);
      for (const depId of dependencies) {
        dfs(depId, depth + 1);
      }
    };

    dfs(nodeId, 0);
    return maxDepth;
  }

  private calculateStronglyConnectedComponents(): number {
    // Simplified implementation - would use Tarjan's algorithm in production
    const visited = new Set<string>();
    let componentCount = 0;

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) {
        return;
      }
      visited.add(nodeId);

      const dependencies = this.getDependencies(nodeId);
      for (const depId of dependencies) {
        dfs(depId);
      }
    };

    for (const nodeId of Array.from(this.nodes.keys())) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
        componentCount++;
      }
    }

    return componentCount;
  }

  private calculateCriticalPath(): number {
    // Simplified implementation - would use proper critical path algorithm in production
    let longestPath = 0;
    
    for (const nodeId of Array.from(this.nodes.keys())) {
      const depth = this.calculateNodeDepth(nodeId);
      longestPath = Math.max(longestPath, depth);
    }

    return longestPath;
  }

  private calculateComplexityMetrics(): ComplexityMetrics {
    const nodeCount = this.nodes.size;
    const edgeCount = this.edges.size;

    return {
      cyclomaticComplexity: edgeCount - nodeCount + 2,
      dependencyDensity: nodeCount > 0 ? edgeCount / (nodeCount * (nodeCount - 1)) : 0,
      fanInOutRatio: this.calculateFanInOutRatio(),
      modularityScore: this.calculateModularityScore(),
      clusteringCoefficient: this.calculateClusteringCoefficient()
    };
  }

  private calculateFanInOutRatio(): number {
    let totalFanIn = 0;
    let totalFanOut = 0;

    for (const nodeId of Array.from(this.nodes.keys())) {
      totalFanIn += this.getDependents(nodeId).length;
      totalFanOut += this.getDependencies(nodeId).length;
    }

    return totalFanOut > 0 ? totalFanIn / totalFanOut : 0;
  }

  private calculateModularityScore(): number {
    // Simplified modularity calculation based on category clustering
    const categoryGroups = new Map<ToolCategory, Set<string>>();
    
    for (const node of Array.from(this.nodes.values())) {
      if (!categoryGroups.has(node.category)) {
        categoryGroups.set(node.category, new Set());
      }
      categoryGroups.get(node.category)!.add(node.id);
    }

    let intraGroupEdges = 0;
    const totalEdges = this.edges.size;

    for (const edge of Array.from(this.edges.values())) {
      const fromNode = this.nodes.get(edge.from);
      const toNode = this.nodes.get(edge.to);
      
      if (fromNode && toNode && fromNode.category === toNode.category) {
        intraGroupEdges++;
      }
    }

    return totalEdges > 0 ? intraGroupEdges / totalEdges : 0;
  }

  private calculateClusteringCoefficient(): number {
    let totalCoefficient = 0;
    let nodeCount = 0;

    for (const nodeId of Array.from(this.nodes.keys())) {
      const neighbors = new Set([
        ...this.getDependencies(nodeId),
        ...this.getDependents(nodeId)
      ]);

      if (neighbors.size < 2) {
        continue;
      }

      let neighborConnections = 0;
      const neighborArray = Array.from(neighbors);

      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          if (this.getEdge(neighborArray[i], neighborArray[j]) || 
              this.getEdge(neighborArray[j], neighborArray[i])) {
            neighborConnections++;
          }
        }
      }

      const possibleConnections = (neighbors.size * (neighbors.size - 1)) / 2;
      const coefficient = possibleConnections > 0 ? neighborConnections / possibleConnections : 0;
      
      totalCoefficient += coefficient;
      nodeCount++;
    }

    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }

  private validateStructure(errors: ValidationError[], warnings: ValidationError[]): void {
    // Check for orphaned nodes
    for (const nodeId of Array.from(this.nodes.keys())) {
      const dependencies = this.getDependencies(nodeId);
      const dependents = this.getDependents(nodeId);
      
      if (dependencies.length === 0 && dependents.length === 0) {
        warnings.push({
          code: 'ORPHANED_NODE',
          message: `Node ${nodeId} has no dependencies or dependents`,
          path: `nodes.${nodeId}`,
          severity: 'warning',
          suggestion: 'Consider removing orphaned nodes or adding connections'
        });
      }
    }

    // Check for missing node references in edges
    for (const edge of Array.from(this.edges.values())) {
      if (!this.nodes.has(edge.from)) {
        errors.push({
          code: 'MISSING_SOURCE_NODE',
          message: `Edge references non-existent source node: ${edge.from}`,
          path: `edges.${this.getEdgeKey(edge.from, edge.to)}`,
          severity: 'error'
        });
      }

      if (!this.nodes.has(edge.to)) {
        errors.push({
          code: 'MISSING_TARGET_NODE',
          message: `Edge references non-existent target node: ${edge.to}`,
          path: `edges.${this.getEdgeKey(edge.from, edge.to)}`,
          severity: 'error'
        });
      }
    }
  }

  private validatePlatformCompatibility(errors: ValidationError[], warnings: ValidationError[]): void {
    for (const edge of Array.from(this.edges.values())) {
      const fromNode = this.nodes.get(edge.from);
      const toNode = this.nodes.get(edge.to);

      if (fromNode && toNode) {
        const fromPlatforms = new Set(fromNode.platformMetadata.supportedPlatforms);
        const toPlatforms = new Set(toNode.platformMetadata.supportedPlatforms);
        
        // Check if there's at least one common platform
        const commonPlatforms = Array.from(fromPlatforms).filter(p => toPlatforms.has(p));
        
        if (commonPlatforms.length === 0) {
          warnings.push({
            code: 'PLATFORM_INCOMPATIBILITY',
            message: `Dependency ${edge.from} -> ${edge.to} has no common supported platforms`,
            path: `edges.${this.getEdgeKey(edge.from, edge.to)}`,
            severity: 'warning',
            suggestion: 'Review platform compatibility for this dependency'
          });
        }
      }
    }
  }

  private validateRule(rule: ValidationRule, errors: ValidationError[], warnings: ValidationError[]): void {
    // Simplified rule validation - would implement proper rule engine in production
    try {
      // This would evaluate the validation function
      const passed = true; // Placeholder
      
      if (!passed) {
        const targetArray = rule.severity === 'error' ? errors : warnings;
        targetArray.push({
          code: rule.id,
          message: rule.description,
          path: 'graph',
          severity: rule.severity,
          suggestion: `Review rule: ${rule.name}`
        });
      }
    } catch (error) {
      errors.push({
        code: 'RULE_EVALUATION_ERROR',
        message: `Failed to evaluate rule ${rule.id}: ${error}`,
        path: 'validation.rules',
        severity: 'error'
      });
    }
  }

  private getAffectedNodesFromCycles(cycles: string[][]): string[] {
    const affected = new Set<string>();
    for (const cycle of cycles) {
      for (const nodeId of cycle) {
        affected.add(nodeId);
      }
    }
    return Array.from(affected);
  }

  private getValidationCacheKey(config: GraphValidationConfig): string {
    return JSON.stringify({
      rules: config.rules.map(r => r.id),
      strictness: config.strictness,
      crossPlatform: config.crossPlatformValidation,
      performance: config.performanceValidation,
      timestamp: this.metadata.lastModified
    });
  }

  private isCacheValid(result: ValidationResult): boolean {
    // Simple time-based cache validity
    const cacheTime = new Date(result.metadata.validatedAt).getTime();
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    return (now - cacheTime) < maxAge;
  }

  private isStatisticsCacheValid(): boolean {
    // Statistics cache is valid until next modification
    return this.statistics !== null;
  }
}

// Supporting interfaces

interface GraphMetadata {
  createdAt: number;
  lastModified: number;
  version: string;
  operations: GraphOperation[];
}

interface GraphOperation {
  type: string;
  target: string;
  timestamp: number;
}

interface TraversalResult {
  nodes: string[];
  executionTime: number;
  algorithm: TraversalAlgorithm;
  visitOrder: VisitOrder;
  metadata: TraversalMetadata;
}

interface TraversalMetadata {
  totalNodes: number;
  startTime: number;
  endTime: number;
  memoryUsage: number;
}

interface CycleDetectionResult {
  hasCycles: boolean;
  cycles: string[][];
  cycleCount: number;
  affectedNodes: string[];
}