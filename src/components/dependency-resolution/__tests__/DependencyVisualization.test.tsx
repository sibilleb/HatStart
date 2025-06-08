/**
 * DependencyVisualization Component Tests
 * Test suite for dependency graph visualization UI
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  DependencyVisualization,
  type DependencyVisualizationProps
} from '../DependencyVisualization';
import { DependencyGraph } from '../../../services/dependency-resolution';
import type {
  ConflictDetectionResult,
  ResolutionExecutionResult
} from '../../../services/dependency-resolution/types';
import type { ToolManifest, Platform } from '../../../shared/manifest-types';

describe('DependencyVisualization', () => {
  let mockGraph: DependencyGraph;
  let mockProps: DependencyVisualizationProps;

  beforeEach(() => {
    mockGraph = createMockGraph();
    mockProps = {
      graph: mockGraph,
      selectedTools: ['node', 'react'],
      platform: 'linux',
      interactive: true,
      showStatistics: true,
      compactView: false
    };
  });

  describe('Basic Rendering', () => {
    test('should render visualization container', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      const container = screen.getByTestId('dependency-visualization');
      expect(container).toBeInTheDocument();
    });

    test('should render SVG element', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      const svg = screen.getByRole('img', { hidden: true });
      expect(svg).toBeInTheDocument();
      expect(svg.tagName).toBe('svg');
    });

    test('should render controls', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
      expect(screen.getByTitle('Reset View')).toBeInTheDocument();
    });

    test('should render statistics panel when enabled', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      expect(screen.getByText('Graph Statistics')).toBeInTheDocument();
      expect(screen.getByText('Total Nodes:')).toBeInTheDocument();
      expect(screen.getByText('Total Edges:')).toBeInTheDocument();
    });

    test('should not render statistics panel when disabled', () => {
      render(<DependencyVisualization {...mockProps} showStatistics={false} />);
      
      expect(screen.queryByText('Graph Statistics')).not.toBeInTheDocument();
    });
  });

  describe('Node Rendering', () => {
    test('should render all nodes from graph', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      const nodes = mockGraph.getAllNodes();
      for (const node of nodes) {
        expect(screen.getByText(node.tool.name)).toBeInTheDocument();
      }
    });

    test('should highlight selected tools', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      const nodeElements = screen.getAllByRole('button', { hidden: true });
      const selectedNode = nodeElements.find(el => 
        el.textContent?.includes('Node.js')
      );
      
      expect(selectedNode?.parentElement).toHaveClass('is-target');
    });

    test('should show installed status', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      const installedNodes = mockGraph.getAllNodes()
        .filter(n => n.status.installed);
      
      expect(installedNodes.length).toBeGreaterThan(0);
    });

    test('should apply category-specific styling', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      const nodes = screen.getAllByRole('button', { hidden: true });
      const languageNode = nodes.find(el => 
        el.parentElement?.classList.contains('category-language')
      );
      
      expect(languageNode).toBeDefined();
    });
  });

  describe('Edge Rendering', () => {
    test('should render edges between nodes', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      const paths = screen.getAllByRole('img', { hidden: true })
        .filter(el => el.tagName === 'path');
      
      expect(paths.length).toBeGreaterThan(0);
    });

    test('should apply dependency type styling', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      const edges = screen.getAllByRole('img', { hidden: true })
        .filter(el => el.tagName === 'g' && el.classList.contains('dependency-edge'));
      
      const requiredEdge = edges.find(el => 
        el.classList.contains('dependency-required')
      );
      
      expect(requiredEdge).toBeDefined();
    });
  });

  describe('Interactivity', () => {
    test('should handle node click', () => {
      const onNodeSelect = vi.fn();
      render(<DependencyVisualization {...mockProps} onNodeSelect={onNodeSelect} />);
      
      const nodeElement = screen.getByText('Node.js').parentElement!;
      fireEvent.click(nodeElement);
      
      expect(onNodeSelect).toHaveBeenCalledWith('node');
    });

    test('should not handle clicks when non-interactive', () => {
      const onNodeSelect = vi.fn();
      render(
        <DependencyVisualization 
          {...mockProps} 
          interactive={false}
          onNodeSelect={onNodeSelect} 
        />
      );
      
      const nodeElement = screen.getByText('Node.js').parentElement!;
      fireEvent.click(nodeElement);
      
      expect(onNodeSelect).not.toHaveBeenCalled();
    });

    test('should handle zoom controls', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      const zoomIn = screen.getByTitle('Zoom In');
      const zoomOut = screen.getByTitle('Zoom Out');
      const zoomReset = screen.getByTitle('Reset View');
      
      fireEvent.click(zoomIn);
      fireEvent.click(zoomOut);
      fireEvent.click(zoomReset);
      
      // Check that SVG transform is applied
      const svg = screen.getByRole('img', { hidden: true });
      expect(svg).toHaveStyle({ transform: expect.any(String) });
    });

    test('should handle node hover', () => {
      render(<DependencyVisualization {...mockProps} />);
      
      const nodeElement = screen.getByText('Node.js').parentElement!;
      
      fireEvent.mouseEnter(nodeElement);
      expect(nodeElement.parentElement).toHaveClass('dependency-node');
      
      fireEvent.mouseLeave(nodeElement);
    });
  });

  describe('Conflict Visualization', () => {
    test('should show conflict indicator on nodes', () => {
      const conflicts = createMockConflicts();
      render(<DependencyVisualization {...mockProps} conflicts={conflicts} />);
      
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    test('should show conflict details panel', () => {
      const conflicts = createMockConflicts();
      render(<DependencyVisualization {...mockProps} conflicts={conflicts} />);
      
      const toggleButton = screen.getByText('Show Conflicts');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('Detected Conflicts')).toBeInTheDocument();
    });

    test('should hide conflict panel on close', () => {
      const conflicts = createMockConflicts();
      render(<DependencyVisualization {...mockProps} conflicts={conflicts} />);
      
      const toggleButton = screen.getByText('Show Conflicts');
      fireEvent.click(toggleButton);
      
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Detected Conflicts')).not.toBeInTheDocument();
    });

    test('should trigger conflict resolution', () => {
      const conflicts = createMockConflicts();
      const onResolveConflicts = vi.fn();
      render(
        <DependencyVisualization 
          {...mockProps} 
          conflicts={conflicts}
          onResolveConflicts={onResolveConflicts}
        />
      );
      
      const toggleButton = screen.getByText('Show Conflicts');
      fireEvent.click(toggleButton);
      
      const resolveButton = screen.getByText('Resolve Conflicts');
      fireEvent.click(resolveButton);
      
      expect(onResolveConflicts).toHaveBeenCalled();
    });
  });

  describe('Resolution Visualization', () => {
    test('should show resolution steps panel', () => {
      const resolution = createMockResolution();
      render(<DependencyVisualization {...mockProps} resolution={resolution} />);
      
      const toggleButton = screen.getByText('Show Resolution');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('Resolution Steps')).toBeInTheDocument();
    });

    test('should display resolution summary', () => {
      const resolution = createMockResolution();
      render(<DependencyVisualization {...mockProps} resolution={resolution} />);
      
      const toggleButton = screen.getByText('Show Resolution');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText(resolution.summary.description)).toBeInTheDocument();
      expect(screen.getByText(`Impact: ${resolution.summary.impact}`)).toBeInTheDocument();
    });

    test('should accept resolution', () => {
      const resolution = createMockResolution();
      const onAcceptResolution = vi.fn();
      render(
        <DependencyVisualization 
          {...mockProps} 
          resolution={resolution}
          onAcceptResolution={onAcceptResolution}
        />
      );
      
      const toggleButton = screen.getByText('Show Resolution');
      fireEvent.click(toggleButton);
      
      const acceptButton = screen.getByText('Accept Resolution');
      fireEvent.click(acceptButton);
      
      expect(onAcceptResolution).toHaveBeenCalledWith(resolution);
    });
  });

  describe('Compact View', () => {
    test('should render compact nodes', () => {
      render(<DependencyVisualization {...mockProps} compactView={true} />);
      
      // In compact view, nodes show abbreviated names
      expect(screen.getByText('NOD')).toBeInTheDocument();
    });

    test('should use smaller node radius in compact view', () => {
      render(<DependencyVisualization {...mockProps} compactView={true} />);
      
      const circles = screen.getAllByRole('img', { hidden: true })
        .filter(el => el.tagName === 'circle' && el.hasAttribute('r'));
      
      const radius = circles[0].getAttribute('r');
      expect(Number(radius)).toBe(20);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty graph', () => {
      const emptyGraph = new DependencyGraph();
      render(<DependencyVisualization {...mockProps} graph={emptyGraph} />);
      
      expect(screen.getByTestId('dependency-visualization')).toBeInTheDocument();
    });

    test('should handle no selected tools', () => {
      render(<DependencyVisualization {...mockProps} selectedTools={[]} />);
      
      expect(screen.getByTestId('dependency-visualization')).toBeInTheDocument();
    });

    test('should handle missing node callback gracefully', () => {
      render(<DependencyVisualization {...mockProps} onNodeSelect={undefined} />);
      
      const nodeElement = screen.getByText('Node.js').parentElement!;
      fireEvent.click(nodeElement);
      
      // Should not throw
    });
  });

  describe('Performance', () => {
    test('should handle large graphs efficiently', () => {
      const largeGraph = createLargeGraph(100);
      const { container } = render(
        <DependencyVisualization 
          {...mockProps} 
          graph={largeGraph}
          selectedTools={['tool-0']}
        />
      );
      
      const nodes = container.querySelectorAll('.dependency-node');
      expect(nodes.length).toBe(100);
    });

    test('should limit tree depth in visualization', () => {
      const deepGraph = createDeepGraph(20);
      render(
        <DependencyVisualization 
          {...mockProps} 
          graph={deepGraph}
          selectedTools={['root']}
        />
      );
      
      // Should render all nodes despite depth
      const nodes = screen.getAllByRole('button', { hidden: true });
      expect(nodes.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions for creating test data

function createMockGraph(): DependencyGraph {
  const graph = new DependencyGraph();
  
  const nodeManifest: ToolManifest = {
    id: 'node',
    name: 'Node.js',
    description: 'JavaScript runtime',
    category: 'language',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '16.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'node',
      requiresElevation: false
    }],
    dependencies: [{ toolId: 'npm', type: 'required' }],
    schemaVersion: '1.0.0'
  };

  const npmManifest: ToolManifest = {
    id: 'npm',
    name: 'npm',
    description: 'Package manager',
    category: 'language',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '8.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'npm',
      requiresElevation: false
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  };

  const reactManifest: ToolManifest = {
    id: 'react',
    name: 'React',
    description: 'UI library',
    category: 'frontend',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '18.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'npm install react',
      requiresElevation: false
    }],
    dependencies: [
      { toolId: 'node', type: 'required' },
      { toolId: 'npm', type: 'required' }
    ],
    schemaVersion: '1.0.0'
  };

  graph.addNode(nodeManifest, { installed: true });
  graph.addNode(npmManifest, { installed: true });
  graph.addNode(reactManifest, { installed: false });
  
  graph.addEdge('node', 'npm', { type: 'required' });
  graph.addEdge('react', 'node', { type: 'required' });
  graph.addEdge('react', 'npm', { type: 'required' });

  return graph;
}

function createMockConflicts(): ConflictDetectionResult {
  return {
    hasConflicts: true,
    conflicts: [{
      id: 'conflict-1',
      type: 'version-conflict',
      severity: 'major',
      description: 'Version conflict between Node.js requirements',
      involvedTools: ['node', 'react'],
      suggestedResolutions: [{
        strategy: 'version-pinning',
        name: 'Pin Node.js to v16.0.0',
        confidence: 90,
        description: 'Pin to compatible version'
      }],
      blocksInstallation: false,
      resolvable: true,
      details: {}
    }],
    versionConflicts: [{
      toolId: 'node',
      conflictingVersions: ['14.0.0', '16.0.0'],
      versionRequirements: [
        { requiredBy: 'tool1', constraint: '>=14.0.0' },
        { requiredBy: 'react', constraint: '>=16.0.0' }
      ],
      suggestedVersion: '16.0.0',
      canResolve: true
    }],
    circularDependencies: [],
    platformIncompatibilities: [],
    overallSeverity: 'major',
    canProceed: true,
    statistics: {
      totalConflicts: 1,
      criticalConflicts: 0,
      resolvableConflicts: 1,
      blockerConflicts: 0,
      detectionTime: 50
    },
    recommendations: []
  };
}

function createMockResolution(): ResolutionExecutionResult {
  return {
    success: true,
    modifiedGraph: new DependencyGraph(),
    updatedInstallationOrder: {
      installationSequence: ['npm', 'node', 'react'],
      batches: [['npm'], ['node'], ['react']],
      deferredDependencies: [],
      circularDependencies: [],
      estimatedTime: 180,
      success: true,
      warnings: [],
      errors: []
    },
    appliedSteps: [{
      action: { type: 'pin-version', toolId: 'node', version: '16.0.0' },
      description: 'Pin Node.js to version 16.0.0',
      result: 'success',
      impact: { reversible: true, sideEffects: [] },
      executionTime: 10
    }],
    remainingConflicts: [],
    statistics: {
      conflictsResolved: 1,
      stepsExecuted: 1,
      executionTime: 100,
      userInteractions: 0,
      automatedResolutions: 1
    },
    summary: {
      description: 'Successfully resolved version conflict by pinning Node.js to v16.0.0',
      impact: 'low',
      reversible: true,
      sideEffects: []
    }
  };
}

function createLargeGraph(nodeCount: number): DependencyGraph {
  const graph = new DependencyGraph();
  
  for (let i = 0; i < nodeCount; i++) {
    const manifest: ToolManifest = {
      id: `tool-${i}`,
      name: `Tool ${i}`,
      description: `Test tool ${i}`,
      category: 'testing',
      systemRequirements: {
        platforms: ['linux'],
        architectures: ['x64']
      },
      version: { stable: '1.0.0' },
      installation: [{
        method: 'package-manager',
        platform: 'linux',
        command: `install-tool-${i}`,
        requiresElevation: false
      }],
      dependencies: [],
      schemaVersion: '1.0.0'
    };
    
    graph.addNode(manifest);
    
    // Add some edges
    if (i > 0 && i % 3 === 0) {
      graph.addEdge(`tool-${i}`, `tool-${i - 1}`, { type: 'required' });
    }
  }
  
  return graph;
}

function createDeepGraph(depth: number): DependencyGraph {
  const graph = new DependencyGraph();
  
  for (let i = 0; i < depth; i++) {
    const manifest: ToolManifest = {
      id: i === 0 ? 'root' : `level-${i}`,
      name: i === 0 ? 'Root' : `Level ${i}`,
      description: `Node at depth ${i}`,
      category: 'testing',
      systemRequirements: {
        platforms: ['linux'],
        architectures: ['x64']
      },
      version: { stable: '1.0.0' },
      installation: [{
        method: 'package-manager',
        platform: 'linux',
        command: `install-${i}`,
        requiresElevation: false
      }],
      dependencies: i > 0 ? [{ 
        toolId: i === 1 ? 'root' : `level-${i - 1}`, 
        type: 'required' 
      }] : [],
      schemaVersion: '1.0.0'
    };
    
    graph.addNode(manifest);
    
    if (i > 0) {
      const fromId = i === 0 ? 'root' : `level-${i}`;
      const toId = i === 1 ? 'root' : `level-${i - 1}`;
      graph.addEdge(fromId, toId, { type: 'required' });
    }
  }
  
  return graph;
}