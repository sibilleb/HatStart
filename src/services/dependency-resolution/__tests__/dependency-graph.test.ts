/**
 * Dependency Graph Unit Tests
 * Comprehensive test suite for dependency graph functionality
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { DependencyGraph } from '../dependency-graph.js';
import type {
  DependencyGraphNode,
  DependencyGraphEdge,
  GraphTraversalConfig,
  GraphValidationConfig,
  EnhancedToolDependency,
  TraversalAlgorithm,
  VisitOrder
} from '../types.js';
import type { ToolManifest, Platform, ToolCategory } from '../../../shared/manifest-types.js';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;
  let mockNodes: DependencyGraphNode[];
  let mockEdges: DependencyGraphEdge[];

  beforeEach(() => {
    graph = new DependencyGraph();
    mockNodes = createMockNodes();
    mockEdges = createMockEdges();
  });

  afterEach(() => {
    graph.clear();
  });

  describe('Node Management', () => {
    test('should add nodes successfully', () => {
      const node = mockNodes[0];
      const result = graph.addNode(node);
      
      expect(result).toBe(true);
      expect(graph.getNode(node.id)).toEqual(node);
      expect(graph.getAllNodes()).toHaveLength(1);
    });

    test('should not add duplicate nodes', () => {
      const node = mockNodes[0];
      
      expect(graph.addNode(node)).toBe(true);
      expect(graph.addNode(node)).toBe(false);
      expect(graph.getAllNodes()).toHaveLength(1);
    });

    test('should remove nodes successfully', () => {
      const node = mockNodes[0];
      graph.addNode(node);
      
      const result = graph.removeNode(node.id);
      
      expect(result).toBe(true);
      expect(graph.getNode(node.id)).toBeUndefined();
      expect(graph.getAllNodes()).toHaveLength(0);
    });

    test('should not remove non-existent nodes', () => {
      const result = graph.removeNode('non-existent');
      
      expect(result).toBe(false);
    });

    test('should handle node removal with dependencies', () => {
      // Add nodes and edges
      mockNodes.forEach(node => graph.addNode(node));
      const edge = mockEdges[0];
      graph.addEdge(edge);
      
      // Remove source node
      const result = graph.removeNode(edge.from);
      
      expect(result).toBe(true);
      expect(graph.getNode(edge.from)).toBeUndefined();
      expect(graph.getEdge(edge.from, edge.to)).toBeUndefined();
    });
  });

  describe('Edge Management', () => {
    beforeEach(() => {
      // Add all mock nodes before testing edges
      mockNodes.forEach(node => graph.addNode(node));
    });

    test('should add edges successfully', () => {
      const edge = mockEdges[0];
      const result = graph.addEdge(edge);
      
      expect(result).toBe(true);
      expect(graph.getEdge(edge.from, edge.to)).toEqual(edge);
      expect(graph.getAllEdges()).toHaveLength(1);
    });

    test('should not add duplicate edges', () => {
      const edge = mockEdges[0];
      
      expect(graph.addEdge(edge)).toBe(true);
      expect(graph.addEdge(edge)).toBe(false);
      expect(graph.getAllEdges()).toHaveLength(1);
    });

    test('should not add edges with missing nodes', () => {
      const invalidEdge: DependencyGraphEdge = {
        ...mockEdges[0],
        from: 'non-existent-from',
        to: 'non-existent-to'
      };
      
      // Should return false and log error, not throw
      const result = graph.addEdge(invalidEdge);
      expect(result).toBe(false);
    });

    test('should remove edges successfully', () => {
      const edge = mockEdges[0];
      graph.addEdge(edge);
      
      const result = graph.removeEdge(edge.from, edge.to);
      
      expect(result).toBe(true);
      expect(graph.getEdge(edge.from, edge.to)).toBeUndefined();
      expect(graph.getAllEdges()).toHaveLength(0);
    });

    test('should not remove non-existent edges', () => {
      const result = graph.removeEdge('node1', 'node2');
      
      expect(result).toBe(false);
    });
  });

  describe('Dependency Relationships', () => {
    beforeEach(() => {
      mockNodes.forEach(node => graph.addNode(node));
      mockEdges.forEach(edge => graph.addEdge(edge));
    });

    test('should get direct dependencies', () => {
      const dependencies = graph.getDependencies('node-1');
      
      expect(dependencies).toContain('node-2');
      expect(dependencies).toHaveLength(1);
    });

    test('should get direct dependents', () => {
      const dependents = graph.getDependents('node-2');
      
      expect(dependents).toContain('node-1');
      expect(dependents).toHaveLength(1);
    });

    test('should get transitive dependencies', () => {
      // Add chain: node-1 -> node-2 -> node-3
      const additionalEdge: DependencyGraphEdge = createMockEdge('node-2', 'node-3');
      graph.addEdge(additionalEdge);
      
      const transitiveDeps = graph.getTransitiveDependencies('node-1');
      
      expect(transitiveDeps).toContain('node-2');
      expect(transitiveDeps).toContain('node-3');
      expect(transitiveDeps).toHaveLength(2);
    });

    test('should get transitive dependents', () => {
      // Add chain: node-1 -> node-2 -> node-3
      const additionalEdge: DependencyGraphEdge = createMockEdge('node-2', 'node-3');
      graph.addEdge(additionalEdge);
      
      const transitiveDeps = graph.getTransitiveDependents('node-3');
      
      expect(transitiveDeps).toContain('node-2');
      expect(transitiveDeps).toContain('node-1');
      expect(transitiveDeps).toHaveLength(2);
    });

    test('should handle circular dependencies in transitive queries', () => {
      // Create cycle: node-1 -> node-2 -> node-3 -> node-1
      const edge2 = createMockEdge('node-2', 'node-3');
      const edge3 = createMockEdge('node-3', 'node-1');
      graph.addEdge(edge2);
      graph.addEdge(edge3);
      
      const transitiveDeps = graph.getTransitiveDependencies('node-1');
      
      // Should handle cycles gracefully and not infinite loop
      expect(transitiveDeps).toContain('node-2');
      expect(transitiveDeps).toContain('node-3');
      // In a cycle, all nodes are transitively dependent, including the starting node
      expect(transitiveDeps.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Graph Traversal', () => {
    beforeEach(() => {
      graph.clear(); // Clear any previous state
      mockNodes.forEach(node => graph.addNode(node));
      mockEdges.forEach(edge => graph.addEdge(edge));
    });

    test('should perform depth-first traversal', () => {
      const config: GraphTraversalConfig = {
        algorithm: 'depth-first' as TraversalAlgorithm,
        startNodes: ['node-1'],
        visitOrder: 'dependency-order' as VisitOrder,
        detectCycles: true,
        performanceConstraints: {
          maxExecutionTime: 5000,
          maxMemoryUsage: 100,
          maxGraphSize: 1000,
          enableCaching: true
        }
      };
      
      const result = graph.traverse(config);
      
      expect(result.nodes).toContain('node-1');
      expect(result.algorithm).toBe('depth-first');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    test('should perform breadth-first traversal', () => {
      const config: GraphTraversalConfig = {
        algorithm: 'breadth-first' as TraversalAlgorithm,
        startNodes: ['node-1'],
        visitOrder: 'dependency-order' as VisitOrder,
        detectCycles: true,
        performanceConstraints: {
          maxExecutionTime: 5000,
          maxMemoryUsage: 100,
          maxGraphSize: 1000,
          enableCaching: true
        }
      };
      
      const result = graph.traverse(config);
      
      expect(result.nodes).toContain('node-1');
      expect(result.algorithm).toBe('breadth-first');
    });

    test('should perform topological sort', () => {
      const config: GraphTraversalConfig = {
        algorithm: 'topological' as TraversalAlgorithm,
        startNodes: [],
        visitOrder: 'dependency-order' as VisitOrder,
        detectCycles: true,
        performanceConstraints: {
          maxExecutionTime: 5000,
          maxMemoryUsage: 100,
          maxGraphSize: 1000,
          enableCaching: true
        }
      };
      
      const result = graph.traverse(config);
      
      expect(result.nodes).toHaveLength(mockNodes.length);
      // Verify topological order: dependencies appear before dependents
      const nodeIndex = new Map<string, number>();
      result.nodes.forEach((nodeId, index) => {
        nodeIndex.set(nodeId, index);
      });
      
      // node-2 should appear before node-1 (since node-1 depends on node-2)
      const node1Index = nodeIndex.get('node-1');
      const node2Index = nodeIndex.get('node-2');
      
      if (node1Index !== undefined && node2Index !== undefined) {
        // In topological sort, dependencies come first, so node-2 (dependency) should come before node-1 (dependent)
        expect(node2Index).toBeLessThan(node1Index);
      } else {
        // If we can't find both nodes, just verify the result contains expected nodes
        expect(result.nodes).toContain('node-1');
        expect(result.nodes).toContain('node-2');
      }
    });

    test('should perform dependency-first traversal', () => {
      const config: GraphTraversalConfig = {
        algorithm: 'dependency-first' as TraversalAlgorithm,
        startNodes: [],
        visitOrder: 'dependency-order' as VisitOrder,
        detectCycles: true,
        performanceConstraints: {
          maxExecutionTime: 5000,
          maxMemoryUsage: 100,
          maxGraphSize: 1000,
          enableCaching: true
        }
      };
      
      const result = graph.traverse(config);
      
      expect(result.nodes).toHaveLength(mockNodes.length);
      // Nodes with fewer dependencies should appear first
      expect(result.nodes).toContain('node-1');
      expect(result.nodes).toContain('node-2');
      expect(result.nodes).toContain('node-3');
    });

    test('should perform category-first traversal', () => {
      const config: GraphTraversalConfig = {
        algorithm: 'category-first' as TraversalAlgorithm,
        startNodes: [],
        visitOrder: 'category-order' as VisitOrder,
        detectCycles: true,
        performanceConstraints: {
          maxExecutionTime: 5000,
          maxMemoryUsage: 100,
          maxGraphSize: 1000,
          enableCaching: true
        }
      };
      
      const result = graph.traverse(config);
      
      expect(result.nodes).toHaveLength(mockNodes.length);
      expect(result.algorithm).toBe('category-first');
    });

    test('should handle traversal with max depth', () => {
      const config: GraphTraversalConfig = {
        algorithm: 'depth-first' as TraversalAlgorithm,
        startNodes: ['node-1'],
        maxDepth: 1,
        visitOrder: 'dependency-order' as VisitOrder,
        detectCycles: true,
        performanceConstraints: {
          maxExecutionTime: 5000,
          maxMemoryUsage: 100,
          maxGraphSize: 1000,
          enableCaching: true
        }
      };
      
      const result = graph.traverse(config);
      
      expect(result.nodes).toHaveLength(2); // node-1 and its direct dependency
    });

    test('should throw error for unsupported algorithm', () => {
      const config: GraphTraversalConfig = {
        algorithm: 'invalid-algorithm' as TraversalAlgorithm,
        startNodes: ['node-1'],
        visitOrder: 'dependency-order' as VisitOrder,
        detectCycles: true,
        performanceConstraints: {
          maxExecutionTime: 5000,
          maxMemoryUsage: 100,
          maxGraphSize: 1000,
          enableCaching: true
        }
      };
      
      expect(() => graph.traverse(config)).toThrow();
    });
  });

  describe('Cycle Detection', () => {
    beforeEach(() => {
      mockNodes.forEach(node => graph.addNode(node));
    });

    test('should detect no cycles in acyclic graph', () => {
      graph.addEdge(mockEdges[0]); // node-1 -> node-2
      
      const result = graph.detectCycles();
      
      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toHaveLength(0);
      expect(result.cycleCount).toBe(0);
    });

    test('should detect simple cycle', () => {
      // Create cycle: node-1 -> node-2 -> node-1
      graph.addEdge(mockEdges[0]); // node-1 -> node-2
      const backEdge = createMockEdge('node-2', 'node-1');
      graph.addEdge(backEdge);
      
      const result = graph.detectCycles();
      
      expect(result.hasCycles).toBe(true);
      expect(result.cycleCount).toBeGreaterThan(0);
      expect(result.affectedNodes).toContain('node-1');
      expect(result.affectedNodes).toContain('node-2');
    });

    test('should detect multiple cycles', () => {
      // Create two separate cycles
      graph.addEdge(mockEdges[0]); // node-1 -> node-2
      graph.addEdge(createMockEdge('node-2', 'node-1')); // cycle 1
      graph.addEdge(createMockEdge('node-3', 'node-3')); // self-cycle
      
      const result = graph.detectCycles();
      
      expect(result.hasCycles).toBe(true);
      expect(result.cycleCount).toBeGreaterThan(0);
    });

    test('should handle self-loops', () => {
      const selfLoop = createMockEdge('node-1', 'node-1');
      graph.addEdge(selfLoop);
      
      const result = graph.detectCycles();
      
      expect(result.hasCycles).toBe(true);
      expect(result.affectedNodes).toContain('node-1');
    });
  });

  describe('Graph Validation', () => {
    beforeEach(() => {
      mockNodes.forEach(node => graph.addNode(node));
      mockEdges.forEach(edge => graph.addEdge(edge));
    });

    test('should validate graph structure successfully', () => {
      const config: GraphValidationConfig = {
        rules: [],
        strictness: 'moderate',
        crossPlatformValidation: false,
        performanceValidation: false
      };
      
      const result = graph.validate(config);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect platform compatibility issues', () => {
      // Create nodes with incompatible platforms
      const incompatibleNode = createMockNode('incompatible', 'frontend', ['windows'] as Platform[]);
      const linuxOnlyNode = createMockNode('linux-only', 'backend', ['linux'] as Platform[]);
      
      graph.addNode(incompatibleNode);
      graph.addNode(linuxOnlyNode);
      
      const incompatibleEdge = createMockEdge('incompatible', 'linux-only');
      graph.addEdge(incompatibleEdge);
      
      const config: GraphValidationConfig = {
        rules: [],
        strictness: 'moderate',
        crossPlatformValidation: true,
        performanceValidation: false
      };
      
      const result = graph.validate(config);
      
      // Should have warnings about platform incompatibility
      expect(result.warnings.length).toBeGreaterThan(0);
      const platformWarning = result.warnings.find(w => w.code === 'PLATFORM_INCOMPATIBILITY');
      expect(platformWarning).toBeDefined();
    });

    test('should detect orphaned nodes', () => {
      // Add an isolated node
      const orphanedNode = createMockNode('orphaned', 'testing', ['windows', 'macos', 'linux'] as Platform[]);
      graph.addNode(orphanedNode);
      
      const config: GraphValidationConfig = {
        rules: [],
        strictness: 'moderate',
        crossPlatformValidation: false,
        performanceValidation: false
      };
      
      const result = graph.validate(config);
      
      const orphanWarning = result.warnings.find(w => w.code === 'ORPHANED_NODE');
      expect(orphanWarning).toBeDefined();
    });

    test('should cache validation results', () => {
      const config: GraphValidationConfig = {
        rules: [],
        strictness: 'moderate',
        crossPlatformValidation: false,
        performanceValidation: false
      };
      
      const result1 = graph.validate(config);
      const result2 = graph.validate(config);
      
      // Results should be identical (cached)
      expect(result1).toEqual(result2);
    });

    test('should invalidate cache on graph changes', () => {
      const config: GraphValidationConfig = {
        rules: [],
        strictness: 'moderate',
        crossPlatformValidation: false,
        performanceValidation: false
      };
      
      const result1 = graph.validate(config);
      
      // Add a small delay to ensure timestamp difference
      const startTime = Date.now();
      while (Date.now() - startTime < 2) {
        // Wait for at least 2ms
      }
      
      // Modify graph
      const newNode = createMockNode('new-node', 'security', ['linux'] as Platform[]);
      graph.addNode(newNode);
      
      const result2 = graph.validate(config);
      
      // Results should be different due to graph modification
      expect(result1.metadata.validatedAt).not.toBe(result2.metadata.validatedAt);
    });
  });

  describe('Graph Statistics', () => {
    beforeEach(() => {
      mockNodes.forEach(node => graph.addNode(node));
      mockEdges.forEach(edge => graph.addEdge(edge));
    });

    test('should calculate basic statistics', () => {
      const stats = graph.calculateStatistics();
      
      expect(stats.nodeCount).toBe(mockNodes.length);
      expect(stats.edgeCount).toBe(mockEdges.length);
      expect(stats.maxDepth).toBeGreaterThanOrEqual(0);
      expect(stats.averageDegree).toBeGreaterThanOrEqual(0);
    });

    test('should calculate category distribution', () => {
      const stats = graph.calculateStatistics();
      
      expect(stats.categoryDistribution).toBeDefined();
      expect(stats.categoryDistribution.frontend).toBeGreaterThan(0);
      expect(stats.categoryDistribution.backend).toBeGreaterThan(0);
    });

    test('should calculate platform coverage', () => {
      const stats = graph.calculateStatistics();
      
      expect(stats.platformCoverage).toBeDefined();
      expect(stats.platformCoverage.windows).toBeGreaterThan(0);
      expect(stats.platformCoverage.macos).toBeGreaterThan(0);
      expect(stats.platformCoverage.linux).toBeGreaterThan(0);
    });

    test('should calculate complexity metrics', () => {
      const stats = graph.calculateStatistics();
      
      expect(stats.complexityMetrics).toBeDefined();
      expect(stats.complexityMetrics.cyclomaticComplexity).toBeGreaterThanOrEqual(0);
      expect(stats.complexityMetrics.dependencyDensity).toBeGreaterThanOrEqual(0);
      expect(stats.complexityMetrics.modularityScore).toBeGreaterThanOrEqual(0);
    });

    test('should cache statistics', () => {
      const stats1 = graph.calculateStatistics();
      const stats2 = graph.calculateStatistics();
      
      // Should return the same object (cached)
      expect(stats1).toBe(stats2);
    });

    test('should invalidate statistics cache on changes', () => {
      const stats1 = graph.calculateStatistics();
      
      // Modify graph
      const newNode = createMockNode('stats-test', 'devops', ['linux'] as Platform[]);
      graph.addNode(newNode);
      
      const stats2 = graph.calculateStatistics();
      
      // Should recalculate
      expect(stats1).not.toBe(stats2);
      expect(stats2.nodeCount).toBe(stats1.nodeCount + 1);
    });
  });

  describe('Graph Filtering and Querying', () => {
    beforeEach(() => {
      mockNodes.forEach(node => graph.addNode(node));
      mockEdges.forEach(edge => graph.addEdge(edge));
    });

    test('should get nodes by category', () => {
      const frontendNodes = graph.getNodesByCategory('frontend');
      const backendNodes = graph.getNodesByCategory('backend');
      
      expect(frontendNodes).toHaveLength(1);
      expect(backendNodes).toHaveLength(1);
      expect(frontendNodes[0].category).toBe('frontend');
      expect(backendNodes[0].category).toBe('backend');
    });

    test('should get nodes by platform', () => {
      const windowsNodes = graph.getNodesByPlatform('windows');
      const linuxNodes = graph.getNodesByPlatform('linux');
      
      expect(windowsNodes.length).toBeGreaterThan(0);
      expect(linuxNodes.length).toBeGreaterThan(0);
      
      windowsNodes.forEach(node => {
        expect(node.platformMetadata.supportedPlatforms).toContain('windows');
      });
    });

    test('should create subgraph', () => {
      const nodeIds = ['node-1', 'node-2'];
      const subgraph = graph.getSubgraph(nodeIds);
      
      expect(subgraph.getAllNodes()).toHaveLength(2);
      expect(subgraph.getAllEdges()).toHaveLength(1); // The edge between node-1 and node-2
    });

    test('should handle empty subgraph', () => {
      const subgraph = graph.getSubgraph([]);
      
      expect(subgraph.isEmpty()).toBe(true);
      expect(subgraph.getAllNodes()).toHaveLength(0);
      expect(subgraph.getAllEdges()).toHaveLength(0);
    });
  });

  describe('Graph Utilities', () => {
    test('should check if graph is empty', () => {
      expect(graph.isEmpty()).toBe(true);
      
      graph.addNode(mockNodes[0]);
      expect(graph.isEmpty()).toBe(false);
    });

    test('should get graph size', () => {
      const size1 = graph.getSize();
      expect(size1.nodes).toBe(0);
      expect(size1.edges).toBe(0);
      
      mockNodes.forEach(node => graph.addNode(node));
      mockEdges.forEach(edge => graph.addEdge(edge));
      
      const size2 = graph.getSize();
      expect(size2.nodes).toBe(mockNodes.length);
      expect(size2.edges).toBe(mockEdges.length);
    });

    test('should clear graph', () => {
      mockNodes.forEach(node => graph.addNode(node));
      mockEdges.forEach(edge => graph.addEdge(edge));
      
      expect(graph.isEmpty()).toBe(false);
      
      graph.clear();
      
      expect(graph.isEmpty()).toBe(true);
      expect(graph.getAllNodes()).toHaveLength(0);
      expect(graph.getAllEdges()).toHaveLength(0);
    });
  });
});

// Helper functions for creating mock data

function createMockNodes(): DependencyGraphNode[] {
  return [
    createMockNode('node-1', 'frontend', ['windows', 'macos', 'linux'] as Platform[]),
    createMockNode('node-2', 'backend', ['windows', 'macos', 'linux'] as Platform[]),
    createMockNode('node-3', 'testing', ['windows', 'macos', 'linux'] as Platform[])
  ];
}

function createMockNode(
  id: string, 
  category: ToolCategory, 
  platforms: Platform[]
): DependencyGraphNode {
  const mockTool: ToolManifest = {
    id,
    name: `Mock Tool ${id}`,
    description: `Mock tool for testing: ${id}`,
    category,
    systemRequirements: {
      platforms,
      architectures: ['x64', 'arm64']
    },
    version: {
      stable: '1.0.0'
    },
    installation: [],
    schemaVersion: '1.0.0'
  };

  return {
    tool: mockTool,
    id,
    category,
    installationStatus: 'not-installed',
    versionInfo: {
      availableVersions: ['1.0.0', '1.1.0'],
      constraints: [],
      compatibility: {
        platformVersions: {},
        architectureVersions: {},
        compatibilityRules: []
      }
    },
    platformMetadata: {
      supportedPlatforms: platforms,
      installationMethods: {},
      platformDependencies: {},
      resourceRequirements: {}
    },
    graphMetadata: {
      depth: 0,
      dependentCount: 0,
      dependencyCount: 0,
      onCriticalPath: false,
      traversalState: 'unvisited',
      timestamps: {}
    }
  };
}

function createMockEdges(): DependencyGraphEdge[] {
  return [
    createMockEdge('node-1', 'node-2')
  ];
}

function createMockEdge(from: string, to: string): DependencyGraphEdge {
  const mockDependency: EnhancedToolDependency = {
    toolId: to,
    type: 'required',
    priority: 50,
    deferrable: false,
    installationOrder: 1,
    conflictResolution: 'fail-fast',
    versionResolution: {
      confidence: 100,
      resolutionMethod: 'latest-compatible',
      fallbackVersions: [],
      appliedConstraints: []
    }
  };

  return {
    from,
    to,
    dependency: mockDependency,
    weight: 1,
    platforms: ['windows', 'macos', 'linux'] as Platform[],
    resolutionMetadata: {
      resolutionAttempts: 0,
      lastResolutionResult: 'pending',
      resolutionStrategy: 'conservative',
      conflictStatus: {
        hasConflict: false,
        conflictsWith: [],
        conflictType: 'version'
      },
      performanceMetrics: {
        resolutionTime: 0,
        memoryUsage: 0,
        networkRequests: 0,
        cacheHitRate: 0
      }
    }
  };
}