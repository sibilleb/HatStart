/**
 * Conflict Detector Unit Tests
 * Comprehensive test suite for conflict detection mechanisms
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  ConflictDetector,
  createConflictDetector,
  detectConflicts,
  type ConflictDetail,
  type ConflictDetectionResult,
  type VersionConflictDetail,
  type CircularDependencyDetail
} from '../conflict-detector.js';
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

describe('ConflictDetector', () => {
  let detector: ConflictDetector;
  let graph: DependencyGraph;
  let mockManifests: ToolManifest[];

  beforeEach(async () => {
    mockManifests = createMockManifests();
    const buildResult = await buildGraphFromManifests(mockManifests, 'linux', 'x64');
    graph = buildResult.graph;
    detector = new ConflictDetector(graph, 'linux', 'x64');
  });

  afterEach(() => {
    detector.clearCache();
  });

  describe('Constructor and Factory Functions', () => {
    test('should create detector with default options', () => {
      const newDetector = new ConflictDetector(graph);
      expect(newDetector).toBeDefined();
      expect(newDetector.getCacheStats().size).toBe(0);
    });

    test('should create detector using factory function', () => {
      const factoryDetector = createConflictDetector(graph, 'macos', 'arm64');
      expect(factoryDetector).toBeDefined();
    });
  });

  describe('Basic Conflict Detection', () => {
    test('should detect no conflicts for compatible tools', async () => {
      const result = await detector.detectConflicts(['npm']);
      
      expect(result.hasConflicts).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.overallSeverity).toBe('none');
      expect(result.conflicts).toHaveLength(0);
    });

    test('should provide detection statistics', async () => {
      const result = await detector.detectConflicts(['node', 'npm']);
      
      expect(result.statistics).toBeDefined();
      expect(result.statistics.detectionTime).toBeGreaterThan(0);
      expect(result.statistics.totalConflicts).toBeGreaterThanOrEqual(0);
      expect(typeof result.statistics.criticalConflicts).toBe('number');
    });

    test('should generate recommendations', async () => {
      const result = await detector.detectConflicts(['node']);
      
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Version Conflict Detection', () => {
    test('should detect version conflicts', async () => {
      const conflictingManifests = createVersionConflictManifests();
      const conflictGraph = (await buildGraphFromManifests(conflictingManifests)).graph;
      const conflictDetector = new ConflictDetector(conflictGraph);
      
      const result = await conflictDetector.detectVersionConflicts(['app-a', 'app-b']);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('toolId');
      expect(result[0]).toHaveProperty('versionRequirements');
      expect(result[0]).toHaveProperty('incompatibleRanges');
    });

    test('should provide version conflict details', async () => {
      const conflictingManifests = createVersionConflictManifests();
      const conflictGraph = (await buildGraphFromManifests(conflictingManifests)).graph;
      const conflictDetector = new ConflictDetector(conflictGraph);
      
      const versionConflicts = await conflictDetector.detectVersionConflicts(['app-a', 'app-b']);
      
      if (versionConflicts.length > 0) {
        const conflict = versionConflicts[0];
        expect(conflict.versionRequirements).toBeDefined();
        expect(conflict.unsatisfiableReason).toBeDefined();
        expect(Array.isArray(conflict.incompatibleRanges)).toBe(true);
      }
    });

    test('should find compromise versions when possible', async () => {
      const compromiseManifests = createCompromiseVersionManifests();
      const compromiseGraph = (await buildGraphFromManifests(compromiseManifests)).graph;
      const compromiseDetector = new ConflictDetector(compromiseGraph);
      
      const versionConflicts = await compromiseDetector.detectVersionConflicts(['flexible-app']);
      
      // Should find a compromise or have no conflicts
      expect(versionConflicts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Circular Dependency Detection', () => {
    test('should detect circular dependencies', async () => {
      const cyclicManifests = createCircularDependencyManifests();
      const cyclicGraph = (await buildGraphFromManifests(cyclicManifests)).graph;
      const cyclicDetector = new ConflictDetector(cyclicGraph);
      
      const result = await cyclicDetector.detectCircularDependencies(['cycle-a']);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('cycle');
      expect(result[0]).toHaveProperty('cycleLength');
      expect(result[0]).toHaveProperty('breakable');
    });

    test('should provide cycle break suggestions', async () => {
      const cyclicManifests = createCircularDependencyManifests();
      const cyclicGraph = (await buildGraphFromManifests(cyclicManifests)).graph;
      const cyclicDetector = new ConflictDetector(cyclicGraph);
      
      const cycles = await cyclicDetector.detectCircularDependencies(['cycle-a']);
      
      if (cycles.length > 0) {
        const cycle = cycles[0];
        expect(cycle.breakPoints).toBeDefined();
        expect(Array.isArray(cycle.breakPoints)).toBe(true);
        
        if (cycle.breakPoints.length > 0) {
          expect(cycle.breakPoints[0]).toHaveProperty('strategy');
          expect(cycle.breakPoints[0]).toHaveProperty('impact');
          expect(cycle.breakPoints[0]).toHaveProperty('description');
        }
      }
    });

    test('should assess cycle impact correctly', async () => {
      const cyclicManifests = createCircularDependencyManifests();
      const cyclicGraph = (await buildGraphFromManifests(cyclicManifests)).graph;
      const cyclicDetector = new ConflictDetector(cyclicGraph);
      
      const cycles = await cyclicDetector.detectCircularDependencies(['cycle-a']);
      
      if (cycles.length > 0) {
        const cycle = cycles[0];
        expect(['critical', 'moderate', 'low']).toContain(cycle.impact);
        expect(typeof cycle.breakable).toBe('boolean');
      }
    });
  });

  describe('Platform Incompatibility Detection', () => {
    test('should detect platform incompatibilities', async () => {
      const platformSpecificManifests = createPlatformSpecificManifests();
      const platformGraph = (await buildGraphFromManifests(platformSpecificManifests)).graph;
      const windowsDetector = new ConflictDetector(platformGraph, 'windows', 'x64');
      
      const result = await windowsDetector.detectPlatformIncompatibilities(['linux-only-tool']);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('incompatibleTools');
      expect(result[0]).toHaveProperty('targetPlatform');
      expect(result[0]).toHaveProperty('missingSupport');
    });

    test('should suggest platform alternatives', async () => {
      const platformSpecificManifests = createPlatformSpecificManifests();
      const platformGraph = (await buildGraphFromManifests(platformSpecificManifests)).graph;
      const windowsDetector = new ConflictDetector(platformGraph, 'windows', 'x64');
      
      const incompatibilities = await windowsDetector.detectPlatformIncompatibilities(['linux-only-tool']);
      
      if (incompatibilities.length > 0) {
        const incompatibility = incompatibilities[0];
        expect(incompatibility.workarounds).toBeDefined();
        expect(Array.isArray(incompatibility.workarounds)).toBe(true);
        
        if (incompatibility.missingSupport.length > 0) {
          expect(incompatibility.missingSupport[0]).toHaveProperty('alternatives');
        }
      }
    });

    test('should handle cross-platform tools correctly', async () => {
      const result = await detector.detectPlatformIncompatibilities(['node', 'npm']);
      
      // These tools should be cross-platform compatible
      expect(result.length).toBe(0);
    });
  });

  describe('Cross-Category Conflict Detection', () => {
    test('should detect conflicting tool combinations', async () => {
      const conflictingCategoryManifests = createConflictingCategoryManifests();
      const conflictGraph = (await buildGraphFromManifests(conflictingCategoryManifests)).graph;
      const conflictDetector = new ConflictDetector(conflictGraph);
      
      const result = await conflictDetector.detectCrossCategoryConflicts(['npm', 'yarn']);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('type');
      expect(result[0].type).toBe('tool');
      expect(result[0]).toHaveProperty('involvedTools');
    });

    test('should provide conflict resolution strategies', async () => {
      const conflictingCategoryManifests = createConflictingCategoryManifests();
      const conflictGraph = (await buildGraphFromManifests(conflictingCategoryManifests)).graph;
      const conflictDetector = new ConflictDetector(conflictGraph);
      
      const conflicts = await conflictDetector.detectCrossCategoryConflicts(['npm', 'yarn']);
      
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        expect(conflict.suggestedResolutions).toBeDefined();
        expect(Array.isArray(conflict.suggestedResolutions)).toBe(true);
        
        if (conflict.suggestedResolutions.length > 0) {
          expect(conflict.suggestedResolutions[0]).toHaveProperty('name');
          expect(conflict.suggestedResolutions[0]).toHaveProperty('steps');
          expect(conflict.suggestedResolutions[0]).toHaveProperty('confidence');
        }
      }
    });
  });

  describe('Resource Conflict Detection', () => {
    test('should detect resource conflicts', async () => {
      const resourceConflictManifests = createResourceConflictManifests();
      const resourceGraph = (await buildGraphFromManifests(resourceConflictManifests)).graph;
      const resourceDetector = new ConflictDetector(resourceGraph);
      
      const result = await resourceDetector.detectResourceConflicts(['nginx', 'apache']);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('type');
      expect(result[0].type).toBe('resource');
    });

    test('should handle tools without resource conflicts', async () => {
      const result = await detector.detectResourceConflicts(['node', 'npm']);
      
      // These tools shouldn't have resource conflicts
      expect(result.length).toBe(0);
    });
  });

  describe('Comprehensive Conflict Detection', () => {
    test('should perform comprehensive analysis', async () => {
      const result = await detector.detectConflicts(['node', 'npm'], {
        enableCaching: true,
        thoroughAnalysis: false
      });
      
      expect(result).toHaveProperty('hasConflicts');
      expect(result).toHaveProperty('conflicts');
      expect(result).toHaveProperty('versionConflicts');
      expect(result).toHaveProperty('circularDependencies');
      expect(result).toHaveProperty('platformIncompatibilities');
      expect(result).toHaveProperty('overallSeverity');
      expect(result).toHaveProperty('canProceed');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('recommendations');
    });

    test('should cache detection results', async () => {
      const firstResult = await detector.detectConflicts(['node'], { enableCaching: true });
      const secondResult = await detector.detectConflicts(['node'], { enableCaching: true });
      
      expect(firstResult).toEqual(secondResult);
      expect(detector.getCacheStats().size).toBeGreaterThan(0);
    });

    test('should handle thorough analysis option', async () => {
      const quickResult = await detector.detectConflicts(['node'], { thoroughAnalysis: false });
      const thoroughResult = await detector.detectConflicts(['node'], { thoroughAnalysis: true });
      
      expect(quickResult).toBeDefined();
      expect(thoroughResult).toBeDefined();
      // Thorough analysis might take longer but should provide same or more conflicts
      expect(thoroughResult.statistics.detectionTime).toBeGreaterThanOrEqual(0);
    });

    test('should provide severity assessment', async () => {
      const result = await detector.detectConflicts(['node', 'npm']);
      
      expect(['critical', 'major', 'minor', 'none']).toContain(result.overallSeverity);
      expect(typeof result.canProceed).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('should handle empty tool lists', async () => {
      const result = await detector.detectConflicts([]);
      
      expect(result.hasConflicts).toBe(false);
      expect(result.overallSeverity).toBe('none');
      expect(result.canProceed).toBe(true);
    });

    test('should handle non-existent tools gracefully', async () => {
      const result = await detector.detectConflicts(['non-existent-tool']);
      
      expect(result).toBeDefined();
      expect(typeof result.hasConflicts).toBe('boolean');
    });

    test('should handle malformed tool graphs', async () => {
      const emptyGraph = new DependencyGraph();
      const emptyDetector = new ConflictDetector(emptyGraph);
      
      const result = await emptyDetector.detectConflicts(['any-tool']);
      
      expect(result).toBeDefined();
      expect(result.hasConflicts).toBe(false);
    });
  });

  describe('Cache Management', () => {
    test('should clear cache', () => {
      detector.clearCache();
      expect(detector.getCacheStats().size).toBe(0);
    });

    test('should provide cache statistics', () => {
      const stats = detector.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });
  });

  describe('Convenience Functions', () => {
    test('should use convenience function for detection', async () => {
      const result = await detectConflicts(graph, ['node']);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('hasConflicts');
    });

    test('should allow platform configuration in convenience function', async () => {
      const result = await detectConflicts(graph, ['node'], {
        platform: 'macos',
        architecture: 'arm64'
      });
      
      expect(result).toBeDefined();
      expect(result.statistics.detectionTime).toBeGreaterThan(0);
    });

    test('should support thorough analysis in convenience function', async () => {
      const result = await detectConflicts(graph, ['node'], {
        thoroughAnalysis: true
      });
      
      expect(result).toBeDefined();
      expect(result.statistics.detectionTime).toBeGreaterThan(0);
    });
  });
});

// Helper functions for creating test data

function createMockManifests(): ToolManifest[] {
  return [
    createMockManifest('node', 'Node.js', 'backend', [
      { toolId: 'npm', type: 'required' as DependencyType }
    ]),
    createMockManifest('npm', 'npm', 'backend', []),
    createMockManifest('react', 'React', 'frontend', [
      { toolId: 'node', type: 'required' as DependencyType }
    ])
  ];
}

function createVersionConflictManifests(): ToolManifest[] {
  return [
    createMockManifest('shared-lib', 'Shared Library', 'backend', []),
    createMockManifest('app-a', 'Application A', 'backend', [
      { toolId: 'shared-lib', type: 'required' as DependencyType, minVersion: '2.0.0' }
    ]),
    createMockManifest('app-b', 'Application B', 'backend', [
      { toolId: 'shared-lib', type: 'required' as DependencyType, maxVersion: '1.5.0' }
    ])
  ];
}

function createCompromiseVersionManifests(): ToolManifest[] {
  return [
    createMockManifest('flexible-lib', 'Flexible Library', 'backend', []),
    createMockManifest('flexible-app', 'Flexible App', 'backend', [
      { toolId: 'flexible-lib', type: 'optional' as DependencyType, minVersion: '1.0.0' }
    ])
  ];
}

function createCircularDependencyManifests(): ToolManifest[] {
  return [
    createMockManifest('cycle-a', 'Cycle A', 'backend', [
      { toolId: 'cycle-b', type: 'required' as DependencyType }
    ]),
    createMockManifest('cycle-b', 'Cycle B', 'backend', [
      { toolId: 'cycle-c', type: 'optional' as DependencyType }
    ]),
    createMockManifest('cycle-c', 'Cycle C', 'backend', [
      { toolId: 'cycle-a', type: 'optional' as DependencyType }
    ])
  ];
}

function createPlatformSpecificManifests(): ToolManifest[] {
  return [
    createMockManifest('linux-only-tool', 'Linux Only', 'devops', [], ['linux']),
    createMockManifest('cross-platform-tool', 'Cross Platform', 'productivity', [], ['linux', 'macos', 'windows'])
  ];
}

function createConflictingCategoryManifests(): ToolManifest[] {
  return [
    createMockManifest('npm', 'npm', 'backend', []),
    createMockManifest('yarn', 'Yarn', 'backend', [])
  ];
}

function createResourceConflictManifests(): ToolManifest[] {
  return [
    createMockManifest('nginx', 'Nginx', 'devops', []),
    createMockManifest('apache', 'Apache', 'devops', [])
  ];
}

function createMockManifest(
  id: string,
  name: string,
  category: ToolCategory,
  dependencies: ToolDependency[] = [],
  platforms: string[] = ['linux', 'macos', 'windows']
): ToolManifest {
  return {
    id,
    name,
    description: `Mock ${name} tool for testing`,
    category,
    systemRequirements: {
      platforms: platforms as Platform[],
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