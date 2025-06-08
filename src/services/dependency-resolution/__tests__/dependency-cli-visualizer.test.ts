/**
 * Dependency CLI Visualizer Tests
 * Test suite for command-line dependency visualization
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DependencyCLIVisualizer,
  createDependencyCLIVisualizer,
  promptForResolution,
  CLIProgressIndicator
} from '../dependency-cli-visualizer.js';
import { DependencyGraph } from '../dependency-graph.js';
import type {
  ConflictDetectionResult,
  ConflictDetail,
  ResolutionExecutionResult
} from '../types.js';
import type { ToolManifest } from '../../../shared/manifest-types.js';

// Mock chalk for testing
vi.mock('chalk', () => {
  const mockChalk = {
    bold: {
      blue: (text: string) => `[BOLD_BLUE]${text}[/BOLD_BLUE]`
    },
    green: (text: string) => `[GREEN]${text}[/GREEN]`,
    red: (text: string) => `[RED]${text}[/RED]`,
    yellow: (text: string) => `[YELLOW]${text}[/YELLOW]`,
    blue: (text: string) => `[BLUE]${text}[/BLUE]`,
    gray: (text: string) => `[GRAY]${text}[/GRAY]`,
    white: (text: string) => `[WHITE]${text}[/WHITE]`,
    magenta: (text: string) => `[MAGENTA]${text}[/MAGENTA]`
  };
  return { default: mockChalk, ...mockChalk };
});

describe('DependencyCLIVisualizer', () => {
  let visualizer: DependencyCLIVisualizer;
  let mockGraph: DependencyGraph;

  beforeEach(() => {
    visualizer = new DependencyCLIVisualizer({ useColor: true });
    mockGraph = createMockGraph();
  });

  describe('Constructor and Factory', () => {
    test('should create visualizer with default options', () => {
      const defaultViz = new DependencyCLIVisualizer();
      expect(defaultViz).toBeInstanceOf(DependencyCLIVisualizer);
    });

    test('should create visualizer with custom options', () => {
      const customViz = new DependencyCLIVisualizer({
        verbose: true,
        useColor: false,
        maxDepth: 5,
        format: 'table'
      });
      expect(customViz).toBeInstanceOf(DependencyCLIVisualizer);
    });

    test('should create visualizer using factory function', () => {
      const factoryViz = createDependencyCLIVisualizer({ verbose: true });
      expect(factoryViz).toBeInstanceOf(DependencyCLIVisualizer);
    });
  });

  describe('Graph Visualization', () => {
    test('should visualize graph as tree', () => {
      const output = visualizer.visualizeGraph(mockGraph, ['node'], 'linux');
      
      expect(output).toContain('Dependency Tree');
      expect(output).toContain('Node.js');
      expect(output).toContain('npm');
    });

    test('should visualize graph as table', () => {
      const tableViz = new DependencyCLIVisualizer({ format: 'table' });
      const output = tableViz.visualizeGraph(mockGraph, ['node'], 'linux');
      
      expect(output).toContain('Dependency Table');
      expect(output).toContain('Tool');
      expect(output).toContain('Category');
      expect(output).toContain('Version');
      expect(output).toContain('Status');
    });

    test('should visualize graph as JSON', () => {
      const jsonViz = new DependencyCLIVisualizer({ format: 'json' });
      const output = jsonViz.visualizeGraph(mockGraph, ['node'], 'linux');
      
      const data = JSON.parse(output);
      expect(data).toHaveProperty('selectedTools');
      expect(data).toHaveProperty('nodes');
      expect(data).toHaveProperty('statistics');
    });

    test('should respect max depth in tree view', () => {
      const shallowViz = new DependencyCLIVisualizer({ maxDepth: 1 });
      const deepGraph = createDeepGraph();
      
      const output = shallowViz.visualizeGraph(deepGraph, ['root'], 'linux');
      
      // Should not show nodes beyond depth 1
      expect(output).toContain('root');
      expect(output).toContain('level-1');
      expect(output).not.toContain('level-2');
    });

    test('should show unconnected nodes in verbose mode', () => {
      const verboseViz = new DependencyCLIVisualizer({ verbose: true });
      const output = verboseViz.visualizeGraph(mockGraph, ['node'], 'linux');
      
      if (output.includes('Unconnected Tools')) {
        expect(output).toContain('Unconnected Tools');
      }
    });

    test('should handle empty selected tools', () => {
      const output = visualizer.visualizeGraph(mockGraph, [], 'linux');
      
      expect(output).toContain('Dependency Tree');
    });
  });

  describe('Conflict Visualization', () => {
    test('should show no conflicts message', () => {
      const conflicts: ConflictDetectionResult = createNoConflicts();
      const output = visualizer.visualizeConflicts(conflicts);
      
      expect(output).toContain('No conflicts detected!');
      expect(output).toContain('[GREEN]');
    });

    test('should visualize conflicts by type', () => {
      const conflicts = createMockConflicts();
      const output = visualizer.visualizeConflicts(conflicts);
      
      expect(output).toContain('Detected 2 conflicts');
      expect(output).toContain('version-conflict Conflicts');
      expect(output).toContain('circular-dependency Conflicts');
    });

    test('should show conflict details', () => {
      const conflicts = createMockConflicts();
      const output = visualizer.visualizeConflicts(conflicts);
      
      expect(output).toContain('[MAJOR]');
      expect(output).toContain('Version conflict between');
      expect(output).toContain('Involved tools:');
    });

    test('should show suggested resolutions in verbose mode', () => {
      const verboseViz = new DependencyCLIVisualizer({ verbose: true });
      const conflicts = createMockConflicts();
      const output = verboseViz.visualizeConflicts(conflicts);
      
      expect(output).toContain('Suggested resolutions:');
      expect(output).toContain('Pin to v16.0.0');
      expect(output).toContain('90% confidence');
    });

    test('should show conflict statistics in verbose mode', () => {
      const verboseViz = new DependencyCLIVisualizer({ verbose: true });
      const conflicts = createMockConflicts();
      const output = verboseViz.visualizeConflicts(conflicts);
      
      expect(output).toContain('Conflict Statistics');
      expect(output).toContain('Total Conflicts:');
      expect(output).toContain('Critical:');
      expect(output).toContain('Resolvable:');
    });
  });

  describe('Resolution Visualization', () => {
    test('should show successful resolution', () => {
      const resolution = createSuccessfulResolution();
      const output = visualizer.visualizeResolution(resolution);
      
      expect(output).toContain('Resolution completed successfully!');
      expect(output).toContain('[GREEN]');
    });

    test('should show failed resolution', () => {
      const resolution = createFailedResolution();
      const output = visualizer.visualizeResolution(resolution);
      
      expect(output).toContain('Resolution failed');
      expect(output).toContain('[RED]');
    });

    test('should show resolution summary', () => {
      const resolution = createSuccessfulResolution();
      const output = visualizer.visualizeResolution(resolution);
      
      expect(output).toContain('Resolution Summary');
      expect(output).toContain('Successfully resolved conflicts');
      expect(output).toContain('Impact: low');
      expect(output).toContain('Reversible: Yes');
    });

    test('should show applied steps', () => {
      const resolution = createSuccessfulResolution();
      const output = visualizer.visualizeResolution(resolution);
      
      expect(output).toContain('Applied Steps');
      expect(output).toContain('1. ✓ Pin Node.js to v16.0.0');
      expect(output).toContain('2. ✓ Update React to v18.2.0');
    });

    test('should show resolution statistics in verbose mode', () => {
      const verboseViz = new DependencyCLIVisualizer({ verbose: true });
      const resolution = createSuccessfulResolution();
      const output = verboseViz.visualizeResolution(resolution);
      
      expect(output).toContain('Resolution Statistics');
      expect(output).toContain('Conflicts Resolved: 2');
      expect(output).toContain('Steps Executed: 2');
      expect(output).toContain('Execution Time: 150ms');
    });
  });

  describe('Color Output', () => {
    test('should apply colors when enabled', () => {
      const output = visualizer.visualizeGraph(mockGraph, ['node'], 'linux');
      
      expect(output).toContain('[BOLD_BLUE]');
      expect(output).toContain('[MAGENTA]'); // Language category color
    });

    test('should not apply colors when disabled', () => {
      const noColorViz = new DependencyCLIVisualizer({ useColor: false });
      const output = noColorViz.visualizeGraph(mockGraph, ['node'], 'linux');
      
      expect(output).not.toContain('[BOLD_BLUE]');
      expect(output).not.toContain('[MAGENTA]');
    });

    test('should color by severity', () => {
      const conflicts = createMockConflicts();
      const output = visualizer.visualizeConflicts(conflicts);
      
      expect(output).toContain('[YELLOW]'); // Major severity
      expect(output).toContain('[BLUE]'); // Minor severity
    });
  });

  describe('Table Formatting', () => {
    test('should format table with proper alignment', () => {
      const tableViz = new DependencyCLIVisualizer({ format: 'table' });
      const output = tableViz.visualizeGraph(mockGraph, ['node'], 'linux');
      
      const lines = output.split('\n');
      const header = lines.find(line => line.includes('Tool'))!;
      const separator = lines.find(line => line.includes('|-'))!;
      
      expect(header).toMatch(/\|\s+Tool\s+\|/);
      expect(separator).toMatch(/\|-+\|/);
    });

    test('should pad columns correctly', () => {
      const tableViz = new DependencyCLIVisualizer({ format: 'table' });
      const output = tableViz.visualizeGraph(mockGraph, ['node'], 'linux');
      
      const lines = output.split('\n');
      const dataLine = lines.find(line => line.includes('node'))!;
      
      // Each column should be padded to 15 characters
      expect(dataLine).toMatch(/\|\s*node\s+/);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty graph', () => {
      const emptyGraph = new DependencyGraph();
      const output = visualizer.visualizeGraph(emptyGraph, [], 'linux');
      
      expect(output).toContain('Dependency Tree');
    });

    test('should handle graph with no edges', () => {
      const noEdgeGraph = new DependencyGraph();
      const manifest = createMockManifest('isolated');
      noEdgeGraph.addNode(manifest);
      
      const output = visualizer.visualizeGraph(noEdgeGraph, ['isolated'], 'linux');
      
      expect(output).toContain('Isolated Tool');
    });

    test('should handle very long tool names', () => {
      const longNameGraph = new DependencyGraph();
      const manifest = createMockManifest('tool', 'Very Long Tool Name That Exceeds Normal Length');
      longNameGraph.addNode(manifest);
      
      const output = visualizer.visualizeGraph(longNameGraph, ['tool'], 'linux');
      
      expect(output).toContain('Very Long Tool Name');
    });
  });
});

describe('CLIProgressIndicator', () => {
  let indicator: CLIProgressIndicator;
  let writeStub: any;

  beforeEach(() => {
    indicator = new CLIProgressIndicator('Processing...');
    writeStub = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    writeStub.mockRestore();
  });

  test('should display spinning animation', () => {
    indicator.start();
    
    vi.advanceTimersByTime(160); // Two frames
    
    expect(writeStub).toHaveBeenCalledTimes(2);
    expect(writeStub).toHaveBeenCalledWith(expect.stringContaining('Processing...'));
  });

  test('should stop with success', () => {
    indicator.start();
    indicator.stop(true);
    
    expect(writeStub).toHaveBeenCalledWith(expect.stringContaining('✓'));
    expect(writeStub).toHaveBeenCalledWith(expect.stringContaining('Processing...'));
    expect(writeStub).toHaveBeenCalledWith(expect.stringContaining('ms'));
  });

  test('should stop with failure', () => {
    indicator.start();
    indicator.stop(false);
    
    expect(writeStub).toHaveBeenCalledWith(expect.stringContaining('✗'));
  });

  test('should update message', () => {
    indicator.start();
    indicator.update('New message');
    
    vi.advanceTimersByTime(80);
    
    expect(writeStub).toHaveBeenCalledWith(expect.stringContaining('New message'));
  });
});

describe('promptForResolution', () => {
  let consoleLogStub: any;

  beforeEach(() => {
    consoleLogStub = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogStub.mockRestore();
  });

  test('should display prompt message and choices', async () => {
    const options = {
      message: 'Select resolution strategy:',
      choices: [
        { value: 'pin', label: 'Pin version', description: 'Pin to specific version' },
        { value: 'upgrade', label: 'Upgrade all', description: 'Upgrade to latest' }
      ],
      defaultChoice: 'pin'
    };

    const result = await promptForResolution(options);
    
    expect(consoleLogStub).toHaveBeenCalledWith('Select resolution strategy:');
    expect(consoleLogStub).toHaveBeenCalledWith(expect.stringContaining('Pin version (default)'));
    expect(consoleLogStub).toHaveBeenCalledWith(expect.stringContaining('Upgrade all'));
    expect(result).toBe('pin');
  });

  test('should return first choice if no default', async () => {
    const options = {
      message: 'Choose option:',
      choices: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' }
      ]
    };

    const result = await promptForResolution(options);
    
    expect(result).toBe('a');
  });
});

// Helper functions

function createMockGraph(): DependencyGraph {
  const graph = new DependencyGraph();
  
  const nodeManifest = createMockManifest('node', 'Node.js', 'language', '16.0.0');
  const npmManifest = createMockManifest('npm', 'npm', 'language', '8.0.0');
  const reactManifest = createMockManifest('react', 'React', 'frontend', '18.0.0');
  
  graph.addNode(nodeManifest, { installed: true });
  graph.addNode(npmManifest, { installed: true });
  graph.addNode(reactManifest, { installed: false });
  
  // npm is bundled with node, so no edge needed
  graph.addEdge('react', 'node', { type: 'required' });
  graph.addEdge('react', 'npm', { type: 'required' });
  
  return graph;
}

function createDeepGraph(): DependencyGraph {
  const graph = new DependencyGraph();
  
  for (let i = 0; i < 5; i++) {
    const id = i === 0 ? 'root' : `level-${i}`;
    const name = i === 0 ? 'Root Tool' : `Level ${i} Tool`;
    const manifest = createMockManifest(id, name);
    graph.addNode(manifest);
    
    if (i > 0) {
      const parentId = i === 1 ? 'root' : `level-${i - 1}`;
      graph.addEdge(id, parentId, { type: 'required' });
    }
  }
  
  return graph;
}

function createMockManifest(
  id: string, 
  name?: string, 
  category?: string, 
  version?: string
): ToolManifest {
  return {
    id,
    name: name || `${id} Tool`,
    description: `Description for ${id}`,
    category: (category || 'testing') as any,
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64']
    },
    version: version ? { stable: version } : { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: `install ${id}`,
      requiresElevation: false
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  };
}

function createNoConflicts(): ConflictDetectionResult {
  return {
    hasConflicts: false,
    conflicts: [],
    versionConflicts: [],
    circularDependencies: [],
    platformIncompatibilities: [],
    overallSeverity: 'none',
    canProceed: true,
    statistics: {
      totalConflicts: 0,
      criticalConflicts: 0,
      resolvableConflicts: 0,
      blockerConflicts: 0,
      detectionTime: 50
    },
    recommendations: []
  };
}

function createMockConflicts(): ConflictDetectionResult {
  return {
    hasConflicts: true,
    conflicts: [
      {
        id: 'conflict-1',
        type: 'version-conflict',
        severity: 'major',
        description: 'Version conflict between Node.js requirements',
        involvedTools: ['node', 'react'],
        suggestedResolutions: [{
          strategy: 'version-pinning',
          name: 'Pin to v16.0.0',
          confidence: 90,
          description: 'Pin Node.js to compatible version'
        }],
        blocksInstallation: false,
        resolvable: true,
        details: {}
      },
      {
        id: 'conflict-2',
        type: 'circular-dependency',
        severity: 'minor',
        description: 'Circular dependency detected',
        involvedTools: ['tool-a', 'tool-b'],
        suggestedResolutions: [],
        blocksInstallation: false,
        resolvable: false,
        details: {}
      }
    ],
    versionConflicts: [],
    circularDependencies: [],
    platformIncompatibilities: [],
    overallSeverity: 'major',
    canProceed: true,
    statistics: {
      totalConflicts: 2,
      criticalConflicts: 0,
      resolvableConflicts: 1,
      blockerConflicts: 0,
      detectionTime: 100
    },
    recommendations: []
  };
}

function createSuccessfulResolution(): ResolutionExecutionResult {
  return {
    success: true,
    modifiedGraph: new DependencyGraph(),
    updatedInstallationOrder: {
      installationSequence: [],
      batches: [],
      deferredDependencies: [],
      circularDependencies: [],
      estimatedTime: 0,
      success: true,
      warnings: [],
      errors: []
    },
    appliedSteps: [
      {
        action: { type: 'pin-version', toolId: 'node', version: '16.0.0' },
        description: 'Pin Node.js to v16.0.0',
        result: 'success',
        impact: { reversible: true, sideEffects: [] },
        executionTime: 50
      },
      {
        action: { type: 'upgrade-version', toolId: 'react', version: '18.2.0' },
        description: 'Update React to v18.2.0',
        result: 'success',
        impact: { reversible: true, sideEffects: [] },
        executionTime: 100
      }
    ],
    remainingConflicts: [],
    statistics: {
      conflictsResolved: 2,
      stepsExecuted: 2,
      executionTime: 150,
      userInteractions: 0,
      automatedResolutions: 2
    },
    summary: {
      description: 'Successfully resolved conflicts',
      impact: 'low',
      reversible: true,
      sideEffects: []
    }
  };
}

function createFailedResolution(): ResolutionExecutionResult {
  return {
    success: false,
    modifiedGraph: new DependencyGraph(),
    updatedInstallationOrder: {
      installationSequence: [],
      batches: [],
      deferredDependencies: [],
      circularDependencies: [],
      estimatedTime: 0,
      success: false,
      warnings: [],
      errors: ['Failed to resolve conflicts']
    },
    appliedSteps: [],
    remainingConflicts: [{
      id: 'unresolved-1',
      type: 'version-conflict',
      severity: 'critical',
      description: 'Cannot resolve version conflict',
      involvedTools: ['tool-x'],
      suggestedResolutions: [],
      blocksInstallation: true,
      resolvable: false,
      details: {}
    }],
    statistics: {
      conflictsResolved: 0,
      stepsExecuted: 0,
      executionTime: 50,
      userInteractions: 0,
      automatedResolutions: 0
    },
    summary: {
      description: 'Failed to resolve conflicts',
      impact: 'high',
      reversible: false,
      sideEffects: []
    }
  };
}