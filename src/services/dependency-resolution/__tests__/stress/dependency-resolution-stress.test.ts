/**
 * Dependency Resolution Stress Tests
 * Performance and scalability testing for dependency resolution
 */

import { describe, test, expect } from 'vitest';
import {
  DependencyGraph,
  buildGraphFromManifests,
  DependencyResolver,
  ConflictDetector,
  ConflictResolver
} from '../../index.js';
import type { ToolManifest, Platform } from '../../../../shared/manifest-types.js';

describe('Dependency Resolution Stress Tests', () => {
  const platform: Platform = 'linux';

  describe('Large Graph Performance', () => {
    test('should handle 100 nodes efficiently', async () => {
      const manifests = createLinearDependencyChain(100);
      const startTime = Date.now();

      const result = await buildGraphFromManifests(manifests, platform);
      const buildTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.graph.getAllNodes().length).toBe(100);
      expect(buildTime).toBeLessThan(500); // Should complete within 500ms
    });

    test('should handle 500 nodes with complex dependencies', async () => {
      const manifests = createComplexDependencyGraph(500);
      const startTime = Date.now();

      const result = await buildGraphFromManifests(manifests, platform);
      const buildTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.graph.getAllNodes().length).toBe(500);
      expect(buildTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should resolve 100 node graph quickly', async () => {
      const manifests = createLinearDependencyChain(100);
      const graphResult = await buildGraphFromManifests(manifests, platform);
      
      const resolver = new DependencyResolver();
      const startTime = Date.now();
      
      const order = await resolver.resolve(
        graphResult.graph,
        ['tool-99'], // Last in chain
        { algorithm: 'topological' }
      );
      
      const resolveTime = Date.now() - startTime;

      expect(order.success).toBe(true);
      expect(order.installationSequence.length).toBe(100);
      expect(resolveTime).toBeLessThan(200); // Should resolve within 200ms
    });
  });

  describe('Deep Dependency Chains', () => {
    test('should handle 50 levels of dependencies', async () => {
      const manifests = createDeepDependencyTree(50);
      const graphResult = await buildGraphFromManifests(manifests, platform);
      
      const resolver = new DependencyResolver();
      const order = await resolver.resolve(
        graphResult.graph,
        ['leaf-49']
      );

      expect(order.success).toBe(true);
      expect(order.installationSequence.length).toBe(50);
      // Should maintain correct order
      expect(order.installationSequence[0]).toBe('root');
      expect(order.installationSequence[49]).toBe('leaf-49');
    });

    test('should detect cycles in deep graphs', async () => {
      const manifests = createDeepCyclicGraph(30);
      const graphResult = await buildGraphFromManifests(manifests, platform);
      
      const detector = new ConflictDetector();
      const conflicts = await detector.detectConflicts(
        graphResult.graph,
        Array.from(manifests.keys())
      );

      expect(conflicts.hasConflicts).toBe(true);
      expect(conflicts.circularDependencies.length).toBeGreaterThan(0);
    });
  });

  describe('Wide Dependency Trees', () => {
    test('should handle tools with 50 direct dependencies', async () => {
      const manifests = createWideDependencyTree(50);
      const graphResult = await buildGraphFromManifests(manifests, platform);
      
      const resolver = new DependencyResolver();
      const order = await resolver.resolve(
        graphResult.graph,
        ['hub-tool']
      );

      expect(order.success).toBe(true);
      expect(order.installationSequence.length).toBe(51); // 50 deps + hub
      expect(order.batches[0].length).toBe(50); // All deps in first batch
      expect(order.batches[1]).toContain('hub-tool');
    });

    test('should parallelize independent dependencies', async () => {
      const manifests = createParallelizableGraph(100);
      const graphResult = await buildGraphFromManifests(manifests, platform);
      
      const resolver = new DependencyResolver();
      const order = await resolver.resolve(
        graphResult.graph,
        ['final-tool'],
        { algorithm: 'bfs' }
      );

      expect(order.success).toBe(true);
      expect(order.batches.length).toBeLessThan(10); // Should have multiple parallel batches
      expect(order.batches[0].length).toBeGreaterThan(10); // First batch should be large
    });
  });

  describe('Conflict Resolution Performance', () => {
    test('should resolve 50 version conflicts efficiently', async () => {
      const manifests = createVersionConflictScenario(50);
      const graphResult = await buildGraphFromManifests(manifests, platform);
      
      const detector = new ConflictDetector();
      const conflicts = await detector.detectConflicts(
        graphResult.graph,
        Array.from(manifests.keys())
      );

      expect(conflicts.hasConflicts).toBe(true);
      expect(conflicts.versionConflicts.length).toBeGreaterThan(0);

      const conflictResolver = new ConflictResolver();
      const startTime = Date.now();
      
      const resolution = await conflictResolver.resolveConflicts(
        conflicts,
        graphResult.graph,
        {
          policy: {
            automaticResolution: true,
            preferLatestVersions: true
          }
        }
      );
      
      const resolveTime = Date.now() - startTime;

      expect(resolution.success).toBe(true);
      expect(resolveTime).toBeLessThan(1000); // Should resolve within 1 second
    });

    test('should handle complex conflict scenarios', async () => {
      const manifests = createComplexConflictScenario();
      const graphResult = await buildGraphFromManifests(manifests, platform);
      
      const detector = new ConflictDetector();
      const conflicts = await detector.detectConflicts(
        graphResult.graph,
        Array.from(manifests.keys()),
        { thoroughnessLevel: 'comprehensive' }
      );

      const conflictResolver = new ConflictResolver();
      const resolution = await conflictResolver.resolveConflicts(
        conflicts,
        graphResult.graph
      );

      if (conflicts.hasConflicts) {
        expect(resolution.statistics.conflictsResolved).toBeGreaterThan(0);
      }
    });
  });

  describe('Memory Usage', () => {
    test('should not exceed memory limits with 1000 nodes', async () => {
      const manifests = createComplexDependencyGraph(1000);
      const initialMemory = process.memoryUsage().heapUsed;
      
      const result = await buildGraphFromManifests(manifests, platform);
      
      const memoryIncrease = process.memoryUsage().heapUsed - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      expect(result.success).toBe(true);
      expect(memoryIncreaseMB).toBeLessThan(100); // Should use less than 100MB
    });
  });

  describe('Edge Case Stress Tests', () => {
    test('should handle diamond dependency patterns', async () => {
      const manifests = createDiamondDependencyPattern(10);
      const graphResult = await buildGraphFromManifests(manifests, platform);
      
      const resolver = new DependencyResolver();
      const order = await resolver.resolve(
        graphResult.graph,
        ['diamond-10']
      );

      expect(order.success).toBe(true);
      // Each tool should appear only once
      const uniqueTools = new Set(order.installationSequence);
      expect(uniqueTools.size).toBe(order.installationSequence.length);
    });

    test('should handle star dependency patterns', async () => {
      const manifests = createStarDependencyPattern(100);
      const graphResult = await buildGraphFromManifests(manifests, platform);
      
      const resolver = new DependencyResolver();
      const order = await resolver.resolve(
        graphResult.graph,
        Array.from(manifests.keys())
      );

      expect(order.success).toBe(true);
      expect(order.batches.length).toBe(2); // Center and all dependents
    });
  });
});

// Helper functions for stress test scenarios

function createLinearDependencyChain(length: number): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();

  for (let i = 0; i < length; i++) {
    const id = `tool-${i}`;
    manifests.set(id, {
      id,
      name: `Tool ${i}`,
      description: `Linear chain tool ${i}`,
      category: 'testing',
      systemRequirements: {
        platforms: ['linux'],
        architectures: ['x64']
      },
      version: { stable: '1.0.0' },
      installation: [{
        method: 'package-manager',
        platform: 'linux',
        command: id,
        requiresElevation: false
      }],
      dependencies: i > 0 ? [
        { toolId: `tool-${i - 1}`, type: 'required' }
      ] : [],
      schemaVersion: '1.0.0'
    });
  }

  return manifests;
}

function createComplexDependencyGraph(nodeCount: number): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();

  for (let i = 0; i < nodeCount; i++) {
    const id = `tool-${i}`;
    const dependencies = [];

    // Create dependencies based on various patterns
    if (i > 0) {
      // Parent dependency
      dependencies.push({ toolId: `tool-${Math.floor(i / 2)}`, type: 'required' as const });
      
      // Cross dependencies for complexity
      if (i > 10 && i % 5 === 0) {
        dependencies.push({ toolId: `tool-${i - 10}`, type: 'optional' as const });
      }
      
      if (i > 20 && i % 7 === 0) {
        dependencies.push({ toolId: `tool-${i - 20}`, type: 'suggested' as const });
      }
    }

    manifests.set(id, {
      id,
      name: `Tool ${i}`,
      description: `Complex graph tool ${i}`,
      category: 'testing',
      systemRequirements: {
        platforms: ['linux'],
        architectures: ['x64']
      },
      version: { stable: `${Math.floor(i / 100)}.${Math.floor((i % 100) / 10)}.${i % 10}` },
      installation: [{
        method: 'package-manager',
        platform: 'linux',
        command: id,
        requiresElevation: false
      }],
      dependencies,
      schemaVersion: '1.0.0'
    });
  }

  return manifests;
}

function createDeepDependencyTree(depth: number): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();

  for (let i = 0; i < depth; i++) {
    const id = i === 0 ? 'root' : `leaf-${i}`;
    manifests.set(id, {
      id,
      name: `${id} Tool`,
      description: `Deep tree level ${i}`,
      category: 'testing',
      systemRequirements: {
        platforms: ['linux'],
        architectures: ['x64']
      },
      version: { stable: '1.0.0' },
      installation: [{
        method: 'package-manager',
        platform: 'linux',
        command: id,
        requiresElevation: false
      }],
      dependencies: i > 0 ? [
        { toolId: i === 1 ? 'root' : `leaf-${i - 1}`, type: 'required' }
      ] : [],
      schemaVersion: '1.0.0'
    });
  }

  return manifests;
}

function createDeepCyclicGraph(depth: number): Map<string, ToolManifest> {
  const manifests = createDeepDependencyTree(depth);
  
  // Add cycle at the end
  const lastTool = manifests.get(`leaf-${depth - 1}`)!;
  lastTool.dependencies.push({ toolId: 'root', type: 'optional' });

  return manifests;
}

function createWideDependencyTree(width: number): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();

  // Create base dependencies
  for (let i = 0; i < width; i++) {
    const id = `dep-${i}`;
    manifests.set(id, {
      id,
      name: `Dependency ${i}`,
      description: `Wide tree dependency ${i}`,
      category: 'testing',
      systemRequirements: {
        platforms: ['linux'],
        architectures: ['x64']
      },
      version: { stable: '1.0.0' },
      installation: [{
        method: 'package-manager',
        platform: 'linux',
        command: id,
        requiresElevation: false
      }],
      dependencies: [],
      schemaVersion: '1.0.0'
    });
  }

  // Create hub tool that depends on all
  manifests.set('hub-tool', {
    id: 'hub-tool',
    name: 'Hub Tool',
    description: 'Depends on many tools',
    category: 'testing',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'hub-tool',
      requiresElevation: false
    }],
    dependencies: Array.from({ length: width }, (_, i) => ({
      toolId: `dep-${i}`,
      type: 'required' as const
    })),
    schemaVersion: '1.0.0'
  });

  return manifests;
}

function createParallelizableGraph(nodeCount: number): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();
  const layerSize = Math.floor(Math.sqrt(nodeCount));
  const layers = Math.floor(nodeCount / layerSize);

  // Create layers of independent tools
  for (let layer = 0; layer < layers; layer++) {
    for (let i = 0; i < layerSize; i++) {
      const id = `layer-${layer}-tool-${i}`;
      const dependencies = [];
      
      // Depend on previous layer
      if (layer > 0) {
        dependencies.push({
          toolId: `layer-${layer - 1}-tool-${Math.floor(i / 2)}`,
          type: 'required' as const
        });
      }

      manifests.set(id, {
        id,
        name: `Layer ${layer} Tool ${i}`,
        description: `Parallelizable graph node`,
        category: 'testing',
        systemRequirements: {
          platforms: ['linux'],
          architectures: ['x64']
        },
        version: { stable: '1.0.0' },
        installation: [{
          method: 'package-manager',
          platform: 'linux',
          command: id,
          requiresElevation: false
        }],
        dependencies,
        schemaVersion: '1.0.0'
      });
    }
  }

  // Final tool depends on last layer
  manifests.set('final-tool', {
    id: 'final-tool',
    name: 'Final Tool',
    description: 'Depends on last layer',
    category: 'testing',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'final-tool',
      requiresElevation: false
    }],
    dependencies: Array.from({ length: layerSize }, (_, i) => ({
      toolId: `layer-${layers - 1}-tool-${i}`,
      type: 'required' as const
    })),
    schemaVersion: '1.0.0'
  });

  return manifests;
}

function createVersionConflictScenario(conflictCount: number): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();

  // Create base tool with multiple versions
  manifests.set('base-tool', {
    id: 'base-tool',
    name: 'Base Tool',
    description: 'Tool with version conflicts',
    category: 'testing',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '3.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'base-tool',
      requiresElevation: false
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  });

  // Create tools with conflicting version requirements
  for (let i = 0; i < conflictCount; i++) {
    const id = `consumer-${i}`;
    const minVersion = `${i % 3}.0.0`;
    const maxVersion = `${(i % 3) + 1}.0.0`;

    manifests.set(id, {
      id,
      name: `Consumer ${i}`,
      description: `Requires specific base-tool version`,
      category: 'testing',
      systemRequirements: {
        platforms: ['linux'],
        architectures: ['x64']
      },
      version: { stable: '1.0.0' },
      installation: [{
        method: 'package-manager',
        platform: 'linux',
        command: id,
        requiresElevation: false
      }],
      dependencies: [{
        toolId: 'base-tool',
        type: 'required',
        minVersion,
        maxVersion
      }],
      schemaVersion: '1.0.0'
    });
  }

  return manifests;
}

function createComplexConflictScenario(): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();

  // Multiple types of conflicts
  // 1. Version conflicts
  manifests.set('lib-v1', {
    id: 'lib-v1',
    name: 'Library v1',
    description: 'Version 1.x library',
    category: 'library',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '1.5.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'lib-v1',
      requiresElevation: false
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  });

  manifests.set('lib-v2', {
    id: 'lib-v2',
    name: 'Library v2',
    description: 'Version 2.x library',
    category: 'library',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '2.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'lib-v2',
      requiresElevation: false
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  });

  // 2. Circular dependencies
  manifests.set('circular-a', {
    id: 'circular-a',
    name: 'Circular A',
    description: 'Part of circular dependency',
    category: 'testing',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'circular-a',
      requiresElevation: false
    }],
    dependencies: [{ toolId: 'circular-b', type: 'required' }],
    schemaVersion: '1.0.0'
  });

  manifests.set('circular-b', {
    id: 'circular-b',
    name: 'Circular B',
    description: 'Part of circular dependency',
    category: 'testing',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'circular-b',
      requiresElevation: false
    }],
    dependencies: [{ toolId: 'circular-c', type: 'required' }],
    schemaVersion: '1.0.0'
  });

  manifests.set('circular-c', {
    id: 'circular-c',
    name: 'Circular C',
    description: 'Part of circular dependency',
    category: 'testing',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'circular-c',
      requiresElevation: false
    }],
    dependencies: [{ toolId: 'circular-a', type: 'optional' }],
    schemaVersion: '1.0.0'
  });

  // 3. Platform conflicts
  manifests.set('windows-only', {
    id: 'windows-only',
    name: 'Windows Only',
    description: 'Only runs on Windows',
    category: 'testing',
    systemRequirements: {
      platforms: ['windows'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'installer',
      platform: 'windows',
      command: 'windows.exe',
      requiresElevation: true
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  });

  manifests.set('linux-app', {
    id: 'linux-app',
    name: 'Linux App',
    description: 'Depends on Windows tool',
    category: 'testing',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'linux-app',
      requiresElevation: false
    }],
    dependencies: [{ toolId: 'windows-only', type: 'required' }],
    schemaVersion: '1.0.0'
  });

  return manifests;
}

function createDiamondDependencyPattern(levels: number): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();

  // Create diamond pattern
  for (let level = 0; level <= levels; level++) {
    const id = `diamond-${level}`;
    const dependencies = [];

    if (level > 0) {
      // Each level depends on two from previous level
      dependencies.push({ toolId: `diamond-${level - 1}`, type: 'required' as const });
      if (level > 1) {
        dependencies.push({ toolId: `diamond-${level - 2}`, type: 'optional' as const });
      }
    }

    manifests.set(id, {
      id,
      name: `Diamond ${level}`,
      description: `Diamond pattern level ${level}`,
      category: 'testing',
      systemRequirements: {
        platforms: ['linux'],
        architectures: ['x64']
      },
      version: { stable: '1.0.0' },
      installation: [{
        method: 'package-manager',
        platform: 'linux',
        command: id,
        requiresElevation: false
      }],
      dependencies,
      schemaVersion: '1.0.0'
    });
  }

  return manifests;
}

function createStarDependencyPattern(points: number): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();

  // Create center
  manifests.set('star-center', {
    id: 'star-center',
    name: 'Star Center',
    description: 'Center of star pattern',
    category: 'testing',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'star-center',
      requiresElevation: false
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  });

  // Create points
  for (let i = 0; i < points; i++) {
    const id = `star-point-${i}`;
    manifests.set(id, {
      id,
      name: `Star Point ${i}`,
      description: `Point of star pattern`,
      category: 'testing',
      systemRequirements: {
        platforms: ['linux'],
        architectures: ['x64']
      },
      version: { stable: '1.0.0' },
      installation: [{
        method: 'package-manager',
        platform: 'linux',
        command: id,
        requiresElevation: false
      }],
      dependencies: [{ toolId: 'star-center', type: 'required' }],
      schemaVersion: '1.0.0'
    });
  }

  return manifests;
}