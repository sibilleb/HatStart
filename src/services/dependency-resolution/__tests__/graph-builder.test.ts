/**
 * Graph Builder Unit Tests
 * Comprehensive test suite for dependency graph construction functionality
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  DependencyGraphBuilder,
  createDependencyGraphBuilder,
  buildGraphFromManifests,
  buildGraphFromCategory,
  buildGraphFromMaster,
  type GraphConstructionResult,
  type GraphConstructionContext
} from '../graph-builder.js';
import type {
  GraphConstructionOptions
} from '../types.js';
import type {
  ToolManifest,
  ToolDependency,
  ToolCategory,
  Platform,
  Architecture,
  CategoryManifest,
  MasterManifest,
  DependencyType
} from '../../../shared/manifest-types.js';

describe('DependencyGraphBuilder', () => {
  let builder: DependencyGraphBuilder;
  let mockManifests: ToolManifest[];
  let mockCategoryManifest: CategoryManifest;
  let mockMasterManifest: MasterManifest;

  beforeEach(() => {
    builder = new DependencyGraphBuilder('linux', 'x64');
    mockManifests = createMockManifests();
    mockCategoryManifest = createMockCategoryManifest();
    mockMasterManifest = createMockMasterManifest();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('Constructor and Factory Functions', () => {
    test('should create builder with default options', () => {
      const newBuilder = new DependencyGraphBuilder('macos', 'arm64');
      expect(newBuilder).toBeDefined();
    });

    test('should create builder with custom options', () => {
      const options: GraphConstructionOptions = {
        includeOptional: false,
        includeSuggested: true,
        maxNodes: 1000,
        validateDuringConstruction: false
      };
      
      const newBuilder = new DependencyGraphBuilder('windows', 'x64', options);
      expect(newBuilder).toBeDefined();
    });

    test('should create builder using factory function', () => {
      const factoryBuilder = createDependencyGraphBuilder('linux', 'x64');
      expect(factoryBuilder).toBeDefined();
    });
  });

  describe('Manifest Validation', () => {
    test('should validate valid manifests', async () => {
      const result = await builder.buildFromManifests([mockManifests[0]]);
      
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.statistics.manifestsProcessed).toBe(1);
    });

    test('should detect missing tool ID', async () => {
      const invalidManifest: ToolManifest = {
        ...mockManifests[0],
        id: ''
      };
      
      const result = await builder.buildFromManifests([invalidManifest]);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_TOOL_ID');
    });

    test('should detect missing tool name', async () => {
      const invalidManifest: ToolManifest = {
        ...mockManifests[0],
        name: ''
      };
      
      const result = await builder.buildFromManifests([invalidManifest]);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_TOOL_NAME');
    });

    test('should warn about platform incompatibility', async () => {
      const windowsOnlyManifest: ToolManifest = {
        ...mockManifests[0],
        systemRequirements: {
          platforms: ['windows'],
          architectures: ['x64']
        }
      };
      
      // Builder is configured for Linux
      const result = await builder.buildFromManifests([windowsOnlyManifest]);
      
      // Should have platform incompatibility warning
      expect(result.warnings.some(w => w.code === 'PLATFORM_INCOMPATIBLE')).toBe(true);
    });

    test('should validate dependency references', async () => {
      const manifestWithInvalidDep: ToolManifest = {
        ...mockManifests[0],
        dependencies: [{
          toolId: '',
          type: 'required'
        }]
      };
      
      const result = await builder.buildFromManifests([manifestWithInvalidDep]);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_DEPENDENCY')).toBe(true);
    });
  });

  describe('Graph Construction from Manifests', () => {
    test('should build graph from single manifest', async () => {
      const result = await builder.buildFromManifests([mockManifests[0]]);
      
      expect(result.success).toBe(true);
      expect(result.graph.getAllNodes()).toHaveLength(1);
      expect(result.statistics.nodesCreated).toBe(1);
      expect(result.statistics.manifestsProcessed).toBe(1);
    });

    test('should build graph from multiple manifests', async () => {
      const result = await builder.buildFromManifests(mockManifests);
      
      expect(result.success).toBe(true);
      expect(result.graph.getAllNodes()).toHaveLength(3);
      expect(result.statistics.nodesCreated).toBe(3);
      expect(result.statistics.manifestsProcessed).toBe(3);
    });

    test('should create edges for dependencies', async () => {
      const result = await builder.buildFromManifests(mockManifests);
      
      expect(result.success).toBe(true);
      expect(result.graph.getAllEdges().length).toBeGreaterThan(0);
      expect(result.statistics.edgesCreated).toBeGreaterThan(0);
    });

    test('should handle missing dependencies gracefully', async () => {
      const manifestWithMissingDep: ToolManifest = {
        ...mockManifests[0],
        dependencies: [{
          toolId: 'non-existent-tool',
          type: 'required'
        }]
      };
      
      const result = await builder.buildFromManifests([manifestWithMissingDep]);
      
      expect(result.success).toBe(true); // Should not fail, just warn
      expect(result.warnings.some(w => w.code === 'MISSING_DEPENDENCY')).toBe(true);
    });

    test('should respect include options for dependency types', async () => {
      const builderNoOptional = new DependencyGraphBuilder('linux', 'x64', {
        includeOptional: false,
        includeSuggested: false,
        maxNodes: 5000,
        validateDuringConstruction: true
      });
      
      const result = await builderNoOptional.buildFromManifests(mockManifests);
      
      // Should have fewer edges when optional dependencies are excluded
      expect(result.success).toBe(true);
      expect(result.graph.getAllEdges().length).toBeLessThanOrEqual(
        mockManifests.filter(m => m.dependencies?.some(d => d.type === 'required')).length
      );
    });
  });

  describe('Graph Construction from Category Manifest', () => {
    test('should build graph from category manifest', async () => {
      const result = await builder.buildFromCategoryManifest(mockCategoryManifest);
      
      expect(result.success).toBe(true);
      expect(result.graph.getAllNodes()).toHaveLength(mockCategoryManifest.tools.length);
      expect(result.statistics.manifestsProcessed).toBe(mockCategoryManifest.tools.length);
    });
  });

  describe('Graph Construction from Master Manifest', () => {
    test('should build graph from master manifest', async () => {
      const result = await builder.buildFromMasterManifest(mockMasterManifest);
      
      const expectedToolCount = mockMasterManifest.categories.reduce(
        (total, category) => total + category.tools.length, 
        0
      );
      
      expect(result.success).toBe(true);
      expect(result.graph.getAllNodes()).toHaveLength(expectedToolCount);
      expect(result.statistics.manifestsProcessed).toBe(expectedToolCount);
    });
  });

  describe('Individual Tool Management', () => {
    test('should add single tool to graph', async () => {
      const success = await builder.addToolToGraph(mockManifests[0]);
      
      expect(success).toBe(true);
    });

    test('should not add duplicate tools', async () => {
      await builder.addToolToGraph(mockManifests[0]);
      const success = await builder.addToolToGraph(mockManifests[0]);
      
      expect(success).toBe(false);
    });

    test('should remove tool from graph', async () => {
      await builder.addToolToGraph(mockManifests[0]);
      const success = builder.removeToolFromGraph(mockManifests[0].id);
      
      expect(success).toBe(true);
    });

    test('should handle removal of non-existent tool', () => {
      const success = builder.removeToolFromGraph('non-existent-tool');
      
      expect(success).toBe(false);
    });
  });

  describe('Cycle Detection', () => {
    test('should detect circular dependencies', async () => {
      const cyclicManifests = createCyclicManifests();
      const result = await builder.buildFromManifests(cyclicManifests);
      
      expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCIES')).toBe(true);
    });

    test('should handle self-dependencies', async () => {
      const selfDepManifest: ToolManifest = {
        ...mockManifests[0],
        dependencies: [{
          toolId: mockManifests[0].id,
          type: 'required'
        }]
      };
      
      const result = await builder.buildFromManifests([selfDepManifest]);
      
      expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCIES')).toBe(true);
    });
  });

  describe('Construction Statistics and Metadata', () => {
    test('should provide accurate construction statistics', async () => {
      const result = await builder.buildFromManifests(mockManifests);
      
      expect(result.statistics.manifestsProcessed).toBe(mockManifests.length);
      expect(result.statistics.nodesCreated).toBe(mockManifests.length);
      expect(result.statistics.constructionTime).toBeGreaterThan(0);
    });

    test('should include construction metadata', async () => {
      const result = await builder.buildFromManifests(mockManifests);
      
      expect(result.metadata.targetPlatform).toBe('linux');
      expect(result.metadata.targetArchitecture).toBe('x64');
      expect(result.metadata.constructionStarted).toBeDefined();
      expect(result.metadata.constructionCompleted).toBeDefined();
    });

    test('should track dependency resolution count', async () => {
      const result = await builder.buildFromManifests(mockManifests);
      
      expect(result.statistics.dependenciesResolved).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle construction errors gracefully', async () => {
      // Create a manifest that will cause issues
      const problematicManifest: ToolManifest = {
        id: 'problem-tool',
        name: 'Problem Tool',
        description: 'A tool that causes problems',
        category: 'testing' as ToolCategory,
        systemRequirements: {
          platforms: ['linux'],
          architectures: ['x64']
        },
        version: {
          stable: '1.0.0'
        },
        installation: [],
        schemaVersion: '1.0.0',
        dependencies: undefined as any // This might cause issues
      };
      
      const result = await builder.buildFromManifests([problematicManifest]);
      
      // Should not crash, but may have warnings or handle gracefully
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    test('should provide detailed error information', async () => {
      const invalidManifest: ToolManifest = {
        id: '',
        name: '',
        description: '',
        category: 'testing' as ToolCategory,
        systemRequirements: {
          platforms: [],
          architectures: []
        },
        version: {
          stable: '1.0.0'
        },
        installation: [],
        schemaVersion: '1.0.0'
      };
      
      const result = await builder.buildFromManifests([invalidManifest]);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      result.errors.forEach(error => {
        expect(error.code).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.path).toBeDefined();
        expect(error.severity).toBe('error');
      });
    });
  });

  describe('Convenience Functions', () => {
    test('should build graph using buildGraphFromManifests', async () => {
      const result = await buildGraphFromManifests(mockManifests);
      
      expect(result.success).toBe(true);
      expect(result.graph.getAllNodes()).toHaveLength(mockManifests.length);
    });

    test('should build graph using buildGraphFromCategory', async () => {
      const result = await buildGraphFromCategory(mockCategoryManifest);
      
      expect(result.success).toBe(true);
      expect(result.graph.getAllNodes()).toHaveLength(mockCategoryManifest.tools.length);
    });

    test('should build graph using buildGraphFromMaster', async () => {
      const result = await buildGraphFromMaster(mockMasterManifest);
      
      const expectedToolCount = mockMasterManifest.categories.reduce(
        (total, category) => total + category.tools.length, 
        0
      );
      
      expect(result.success).toBe(true);
      expect(result.graph.getAllNodes()).toHaveLength(expectedToolCount);
    });

    test('should allow custom platform and architecture in convenience functions', async () => {
      const result = await buildGraphFromManifests(
        mockManifests, 
        'macos', 
        'arm64'
      );
      
      expect(result.success).toBe(true);
      expect(result.metadata.targetPlatform).toBe('macos');
      expect(result.metadata.targetArchitecture).toBe('arm64');
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
        platforms: ['linux', 'macos', 'windows'],
        command: `install-${id}`,
        requiresAdmin: false,
        estimatedTime: 60
      }
    ],
    dependencies,
    schemaVersion: '1.0.0'
  };
}

function createMockCategoryManifest(): CategoryManifest {
  return {
    category: 'backend',
    name: 'Backend Development',
    description: 'Tools for backend development',
    tools: createMockManifests(),
    lastUpdated: new Date().toISOString(),
    schemaVersion: '1.0.0'
  };
}

function createMockMasterManifest(): MasterManifest {
  return {
    metadata: {
      name: 'Test Master Manifest',
      version: '1.0.0',
      description: 'Mock master manifest for testing',
      author: 'Test Suite',
      lastUpdated: new Date().toISOString(),
      schemaVersion: '1.0.0'
    },
    categories: [
      {
        category: 'backend',
        name: 'Backend Development',
        description: 'Backend tools',
        tools: [createMockManifests()[0], createMockManifests()[1]],
        lastUpdated: new Date().toISOString(),
        schemaVersion: '1.0.0'
      },
      {
        category: 'frontend',
        name: 'Frontend Development', 
        description: 'Frontend tools',
        tools: [createMockManifests()[2]],
        lastUpdated: new Date().toISOString(),
        schemaVersion: '1.0.0'
      }
    ],
    platforms: ['linux', 'macos', 'windows'],
    lastUpdated: new Date().toISOString(),
    schemaVersion: '1.0.0'
  };
}

function createCyclicManifests(): ToolManifest[] {
  return [
    createMockManifest('tool-a', 'Tool A', 'backend', [
      { toolId: 'tool-b', type: 'required' as DependencyType }
    ]),
    createMockManifest('tool-b', 'Tool B', 'backend', [
      { toolId: 'tool-c', type: 'required' as DependencyType }
    ]),
    createMockManifest('tool-c', 'Tool C', 'backend', [
      { toolId: 'tool-a', type: 'required' as DependencyType }
    ])
  ];
}