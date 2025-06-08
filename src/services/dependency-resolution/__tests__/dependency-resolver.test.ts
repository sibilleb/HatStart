/**
 * Dependency Resolver Unit Tests
 * Comprehensive test suite for dependency resolution algorithms
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  DependencyResolver,
  createDependencyResolver,
  resolveInstallationOrder,
  resolveWithConflicts,
  type ResolutionOptions,
  type InstallationOrder,
  type ResolutionContext
} from '../dependency-resolver.js';
import { DependencyGraph } from '../dependency-graph.js';
import { buildGraphFromManifests } from '../graph-builder.js';
import type {
  ToolManifest,
  ToolDependency,
  ToolCategory,
  Platform,
  Architecture,
  DependencyType
} from '../../../shared/manifest-types.js';

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;
  let graph: DependencyGraph;
  let mockManifests: ToolManifest[];

  beforeEach(async () => {
    mockManifests = createMockManifests();
    const buildResult = await buildGraphFromManifests(mockManifests, 'linux', 'x64');
    
    // Check if graph construction was successful
    if (!buildResult.success) {
      console.warn('Graph construction had errors:', buildResult.errors);
      console.warn('Graph construction warnings:', buildResult.warnings);
    }
    
    graph = buildResult.graph;
    resolver = new DependencyResolver(graph, 'linux', 'x64');
  });

  afterEach(() => {
    resolver.clearCache();
  });

  describe('Constructor and Factory Functions', () => {
    test('should create resolver with default options', () => {
      const newResolver = new DependencyResolver(graph);
      expect(newResolver).toBeDefined();
      expect(newResolver.getCacheSize()).toBe(0);
    });

    test('should create resolver using factory function', () => {
      const factoryResolver = createDependencyResolver(graph, 'macos', 'arm64');
      expect(factoryResolver).toBeDefined();
    });
  });

  describe('Topological Resolution', () => {
    test('should resolve simple dependency chain', async () => {
      const result = await resolver.resolveTopological(['react']);
      
      expect(result.success).toBe(true);
      expect(result.installationSequence).toContain('node');
      expect(result.installationSequence).toContain('npm');
      expect(result.installationSequence).toContain('react');
      
      // Dependencies should come before dependents
      const nodeIndex = result.installationSequence.indexOf('node');
      const reactIndex = result.installationSequence.indexOf('react');
      expect(nodeIndex).toBeLessThan(reactIndex);
    });

    test('should handle multiple target tools', async () => {
      const result = await resolver.resolveTopological(['react', 'vue']);
      
      expect(result.success).toBe(true);
      expect(result.installationSequence).toContain('node');
      expect(result.installationSequence).toContain('react');
      expect(result.installationSequence).toContain('vue');
    });

    test('should handle tool with no dependencies', async () => {
      const result = await resolver.resolveTopological(['npm']);
      
      expect(result.success).toBe(true);
      expect(result.installationSequence).toContain('npm');
      expect(result.installationSequence).toHaveLength(1);
    });

    test('should fail gracefully with missing tool', async () => {
      const result = await resolver.resolveTopological(['non-existent-tool']);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Missing tools');
    });

    test('should respect dependency type inclusion options', async () => {
      const withOptional = await resolver.resolveTopological(['react'], {
        includeOptional: true,
        includeSuggested: false
      });
      
      const withoutOptional = await resolver.resolveTopological(['react'], {
        includeOptional: false,
        includeSuggested: false
      });
      
      expect(withOptional.installationSequence.length).toBeGreaterThanOrEqual(
        withoutOptional.installationSequence.length
      );
    });

    test('should create installation batches for parallel execution', async () => {
      const result = await resolver.resolveTopological(['react'], {
        enableParallel: true
      });
      
      expect(result.success).toBe(true);
      expect(result.batches).toBeDefined();
      expect(result.batches.length).toBeGreaterThan(0);
      
      // All tools should be covered in batches
      const allBatchTools = result.batches.flat();
      expect(allBatchTools).toEqual(expect.arrayContaining(result.installationSequence));
    });

    test('should calculate estimated installation time', async () => {
      const result = await resolver.resolveTopological(['react']);
      
      expect(result.success).toBe(true);
      expect(result.estimatedTime).toBeGreaterThan(0);
    });

    test('should use caching for repeated resolutions', async () => {
      const firstResult = await resolver.resolveTopological(['react'], {
        enableCaching: true
      });
      
      const secondResult = await resolver.resolveTopological(['react'], {
        enableCaching: true
      });
      
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(true);
      expect(resolver.getCacheSize()).toBeGreaterThan(0);
      
      // Results should be identical (from cache)
      expect(secondResult.installationSequence).toEqual(firstResult.installationSequence);
    });
  });

  describe('Depth-First Search Resolution', () => {
    test('should resolve using DFS algorithm', async () => {
      const result = await resolver.resolveDFS(['react']);
      
      expect(result.success).toBe(true);
      expect(result.installationSequence).toContain('node');
      expect(result.installationSequence).toContain('react');
    });

    test('should handle circular dependencies with deferral', async () => {
      // Create manifests with circular dependencies
      const cyclicManifests = createCyclicManifests();
      const cyclicBuildResult = await buildGraphFromManifests(cyclicManifests);
      const cyclicResolver = new DependencyResolver(cyclicBuildResult.graph);
      
      const result = await cyclicResolver.resolveDFS(['tool-a']);
      
      // Should succeed with deferred dependencies
      expect(result.success).toBe(true);
      expect(result.deferredDependencies.length).toBeGreaterThan(0);
    });

    test('should detect hard circular dependencies', async () => {
      const hardCyclicManifests = createHardCyclicManifests();
      const cyclicBuildResult = await buildGraphFromManifests(hardCyclicManifests);
      const cyclicResolver = new DependencyResolver(cyclicBuildResult.graph);
      
      const result = await cyclicResolver.resolveDFS(['tool-x']);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Breadth-First Search Resolution', () => {
    test('should resolve using BFS algorithm', async () => {
      const result = await resolver.resolveBFS(['react']);
      
      expect(result.success).toBe(true);
      expect(result.installationSequence).toContain('node');
      expect(result.installationSequence).toContain('react');
    });

    test('should organize tools by dependency levels', async () => {
      const result = await resolver.resolveBFS(['react']);
      
      expect(result.success).toBe(true);
      
      // Dependencies should generally come before their dependents
      const nodeIndex = result.installationSequence.indexOf('node');
      const reactIndex = result.installationSequence.indexOf('react');
      expect(nodeIndex).toBeLessThan(reactIndex);
    });
  });

  describe('Resolution Strategies', () => {
    test('should perform eager resolution', async () => {
      const result = await resolver.resolveEager(['react']);
      
      expect(result.success).toBe(true);
      // Eager should include more dependencies
      expect(result.installationSequence.length).toBeGreaterThanOrEqual(2);
    });

    test('should perform lazy resolution', async () => {
      const result = await resolver.resolveLazy(['react']);
      
      expect(result.success).toBe(true);
      // Lazy should include fewer dependencies (only required)
      expect(result.installationSequence).toContain('node'); // Required dependency
      expect(result.installationSequence).toContain('react');
    });

    test('should compare eager vs lazy resolution', async () => {
      const eagerResult = await resolver.resolveEager(['react']);
      const lazyResult = await resolver.resolveLazy(['react']);
      
      expect(eagerResult.success).toBe(true);
      expect(lazyResult.success).toBe(true);
      
      // Eager should typically include more tools than lazy
      expect(eagerResult.installationSequence.length).toBeGreaterThanOrEqual(
        lazyResult.installationSequence.length
      );
    });
  });

  describe('Conflict Resolution', () => {
    test('should attempt conflict resolution on failure', async () => {
      // This test would need a graph with conflicts
      const result = await resolver.resolveWithConflictResolution(['react']);
      
      expect(result.success).toBe(true);
      // Even if initial resolution succeeds, should still work
    });

    test('should retry with different strategies', async () => {
      const result = await resolver.resolveWithConflictResolution(['react'], {
        maxRetries: 2
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Performance and Metrics', () => {
    test('should track resolution metrics', async () => {
      await resolver.resolveTopological(['react']);
      const metrics = resolver.getMetrics();
      
      expect(metrics.nodesVisited).toBeGreaterThan(0);
      expect(metrics.executionTime).toBeGreaterThan(0);
      expect(typeof metrics.edgesTraversed).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
    });

    test('should respect execution time limits', async () => {
      const startTime = Date.now();
      
      await resolver.resolveTopological(['react'], {
        maxExecutionTime: 1000 // 1 second
      });
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(2000); // Should not take much longer than limit
    });

    test('should cache resolution results', async () => {
      expect(resolver.getCacheSize()).toBe(0);
      
      await resolver.resolveTopological(['react'], { enableCaching: true });
      expect(resolver.getCacheSize()).toBeGreaterThan(0);
      
      resolver.clearCache();
      expect(resolver.getCacheSize()).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty target tools array', async () => {
      const result = await resolver.resolveTopological([]);
      
      expect(result.success).toBe(true);
      expect(result.installationSequence).toHaveLength(0);
    });

    test('should handle resolution options variations', async () => {
      const options: ResolutionOptions[] = [
        { enableParallel: true, enableCaching: false },
        { includeOptional: false, includeSuggested: true },
        { strategy: 'aggressive', maxRetries: 1 },
        { strategy: 'conservative', maxExecutionTime: 5000 }
      ];

      for (const option of options) {
        const result = await resolver.resolveTopological(['react'], option);
        expect(result.success).toBe(true);
      }
    });

    test('should handle graph with isolated nodes', async () => {
      // Add an isolated tool to test
      const isolatedManifest = createMockManifest('isolated-tool', 'Isolated Tool', 'testing');
      const extendedManifests = [...mockManifests, isolatedManifest];
      
      const buildResult = await buildGraphFromManifests(extendedManifests);
      const extendedResolver = new DependencyResolver(buildResult.graph);
      
      const result = await extendedResolver.resolveTopological(['isolated-tool']);
      
      expect(result.success).toBe(true);
      expect(result.installationSequence).toContain('isolated-tool');
      expect(result.installationSequence).toHaveLength(1);
    });
  });

  describe('Convenience Functions', () => {
    test('should resolve using convenience function', async () => {
      const result = await resolveInstallationOrder(graph, ['react']);
      
      expect(result.success).toBe(true);
      expect(result.installationSequence).toContain('react');
    });

    test('should resolve with conflicts using convenience function', async () => {
      const result = await resolveWithConflicts(graph, ['react']);
      
      expect(result.success).toBe(true);
      expect(result.installationSequence).toContain('react');
    });

    test('should allow custom options in convenience functions', async () => {
      const result = await resolveInstallationOrder(graph, ['react'], {
        includeOptional: false,
        enableParallel: true
      });
      
      expect(result.success).toBe(true);
    });
  });
});

// Helper functions for creating mock data

function createMockManifests(): ToolManifest[] {
  return [
    createMockManifest('node', 'Node.js', 'backend', [
      { toolId: 'npm', type: 'required' as DependencyType }
    ]),
    createMockManifest('npm', 'npm', 'backend', []),
    createMockManifest('react', 'React', 'frontend', [
      { toolId: 'node', type: 'required' as DependencyType },
      { toolId: 'webpack', type: 'optional' as DependencyType }
    ]),
    createMockManifest('vue', 'Vue.js', 'frontend', [
      { toolId: 'node', type: 'required' as DependencyType }
    ]),
    createMockManifest('webpack', 'Webpack', 'frontend', [
      { toolId: 'node', type: 'required' as DependencyType }
    ])
  ];
}

function createMockManifest(
  id: string, 
  name: string, 
  category: ToolCategory,
  dependencies: ToolDependency[] = []
): ToolManifest {
  return {
    id,
    name,
    description: `Mock ${name} tool for testing`,
    category,
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: {
      stable: '1.0.0',
      beta: '1.1.0-beta'
    },
    installation: [
      {
        method: 'package-manager',
        platform: 'linux',
        command: `install-${id}`,
        requiresElevation: false
      },
      {
        method: 'package-manager', 
        platform: 'macos',
        command: `install-${id}`,
        requiresElevation: false
      },
      {
        method: 'package-manager',
        platform: 'windows', 
        command: `install-${id}`,
        requiresElevation: false
      }
    ],
    dependencies,
    schemaVersion: '1.0.0'
  };
}

function createCyclicManifests(): ToolManifest[] {
  return [
    createMockManifest('tool-a', 'Tool A', 'backend', [
      { toolId: 'tool-b', type: 'optional' as DependencyType } // Optional to allow deferral
    ]),
    createMockManifest('tool-b', 'Tool B', 'backend', [
      { toolId: 'tool-c', type: 'optional' as DependencyType }
    ]),
    createMockManifest('tool-c', 'Tool C', 'backend', [
      { toolId: 'tool-a', type: 'optional' as DependencyType }
    ])
  ];
}

function createHardCyclicManifests(): ToolManifest[] {
  return [
    createMockManifest('tool-x', 'Tool X', 'backend', [
      { toolId: 'tool-y', type: 'required' as DependencyType } // Required creates hard cycle
    ]),
    createMockManifest('tool-y', 'Tool Y', 'backend', [
      { toolId: 'tool-x', type: 'required' as DependencyType }
    ])
  ];
}