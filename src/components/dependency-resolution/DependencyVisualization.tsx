/**
 * Dependency Visualization Component
 * Interactive visualization of dependency graphs and conflict resolution
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DependencyGraph,
  DependencyGraphNode,
  DependencyGraphEdge,
  ConflictDetectionResult,
  ConflictDetail,
  ResolutionExecutionResult
} from '../../services/dependency-resolution';
import type { ToolCategory, Platform } from '../../shared/manifest-types';

/**
 * Props for DependencyVisualization component
 */
export interface DependencyVisualizationProps {
  /** Dependency graph to visualize */
  graph: DependencyGraph;
  /** Selected tools for installation */
  selectedTools: string[];
  /** Conflict detection results */
  conflicts?: ConflictDetectionResult;
  /** Resolution execution result */
  resolution?: ResolutionExecutionResult;
  /** Target platform */
  platform: Platform;
  /** Callback when user selects a node */
  onNodeSelect?: (nodeId: string) => void;
  /** Callback when user initiates conflict resolution */
  onResolveConflicts?: () => void;
  /** Callback when user accepts resolution */
  onAcceptResolution?: (resolution: ResolutionExecutionResult) => void;
  /** Enable interactive mode */
  interactive?: boolean;
  /** Show statistics panel */
  showStatistics?: boolean;
  /** Compact view mode */
  compactView?: boolean;
}

/**
 * Node visualization state
 */
interface NodeVisualizationState {
  /** Node position */
  position: { x: number; y: number };
  /** Node selection state */
  selected: boolean;
  /** Node highlight state */
  highlighted: boolean;
  /** Node conflict state */
  hasConflict: boolean;
  /** Node installation state */
  isTarget: boolean;
  /** Node already installed */
  isInstalled: boolean;
}

/**
 * Edge visualization state
 */
interface EdgeVisualizationState {
  /** Edge highlight state */
  highlighted: boolean;
  /** Edge is part of conflict */
  isConflicting: boolean;
  /** Edge is part of circular dependency */
  isCircular: boolean;
}

/**
 * Dependency visualization component
 */
export const DependencyVisualization: React.FC<DependencyVisualizationProps> = ({
  graph,
  selectedTools,
  conflicts,
  resolution,
  platform: _platform,
  onNodeSelect,
  onResolveConflicts,
  onAcceptResolution,
  interactive = true,
  showStatistics = true,
  compactView = false
}) => {
  // Component state
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [nodeStates, setNodeStates] = useState<Map<string, NodeVisualizationState>>(new Map());
  const [edgeStates, setEdgeStates] = useState<Map<string, EdgeVisualizationState>>(new Map());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showConflictDetails, setShowConflictDetails] = useState(false);
  const [showResolutionSteps, setShowResolutionSteps] = useState(false);

  // Calculate graph layout
  const graphLayout = useMemo(() => {
    return calculateGraphLayout(graph, selectedTools, compactView);
  }, [graph, selectedTools, compactView]);

  // Update node and edge states based on conflicts
  const updateVisualizationStates = useCallback(() => {
    const newNodeStates = new Map<string, NodeVisualizationState>();
    const newEdgeStates = new Map<string, EdgeVisualizationState>();

    // Initialize node states
    for (const node of graph.getAllNodes()) {
      const nodeId = node.tool.id;
      const position = graphLayout.nodePositions.get(nodeId) || { x: 0, y: 0 };
      
      newNodeStates.set(nodeId, {
        position,
        selected: nodeId === selectedNode,
        highlighted: nodeId === hoveredNode || isNodeHighlighted(nodeId),
        hasConflict: hasNodeConflict(nodeId),
        isTarget: selectedTools.includes(nodeId),
        isInstalled: node.status.installed
      });
    }

    // Initialize edge states
    for (const edge of graph.getAllEdges()) {
      const edgeKey = `${edge.from}-${edge.to}`;
      
      newEdgeStates.set(edgeKey, {
        highlighted: isEdgeHighlighted(edge),
        isConflicting: isEdgeConflicting(edge),
        isCircular: isEdgeCircular(edge)
      });
    }

    setNodeStates(newNodeStates);
    setEdgeStates(newEdgeStates);
  }, [graph, selectedTools, selectedNode, hoveredNode, graphLayout.nodePositions, conflicts]);

  useEffect(() => {
    updateVisualizationStates();
  }, [updateVisualizationStates]);

  // Handle node selection
  const handleNodeClick = useCallback((nodeId: string) => {
    if (!interactive) return;

    setSelectedNode(nodeId);
    onNodeSelect?.(nodeId);
  }, [interactive, onNodeSelect]);

  // Handle zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
  const handleZoomReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };


  // Check if node should be highlighted
  const isNodeHighlighted = (nodeId: string): boolean => {
    if (!selectedNode) return false;
    
    // Highlight connected nodes
    const connectedNodes = new Set<string>();
    const edges = graph.getOutgoingEdges(selectedNode);
    edges.forEach(edge => connectedNodes.add(edge.to));
    
    const incomingEdges = graph.getIncomingEdges(selectedNode);
    incomingEdges.forEach(edge => connectedNodes.add(edge.from));
    
    return connectedNodes.has(nodeId);
  };

  // Check if node has conflicts
  const hasNodeConflict = (nodeId: string): boolean => {
    if (!conflicts?.hasConflicts) return false;
    
    return conflicts.conflicts.some(conflict => 
      conflict.involvedTools.includes(nodeId)
    );
  };

  // Check if edge should be highlighted
  const isEdgeHighlighted = (edge: DependencyGraphEdge): boolean => {
    if (!selectedNode) return false;
    return edge.from === selectedNode || edge.to === selectedNode;
  };

  // Check if edge is part of a conflict
  const isEdgeConflicting = (edge: DependencyGraphEdge): boolean => {
    if (!conflicts?.hasConflicts) return false;
    
    // Check version conflicts
    const hasVersionConflict = conflicts.versionConflicts.some(vc =>
      vc.toolId === edge.to && 
      vc.versionRequirements.some(vr => vr.requiredBy === edge.from)
    );
    
    return hasVersionConflict;
  };

  // Check if edge is part of a circular dependency
  const isEdgeCircular = (edge: DependencyGraphEdge): boolean => {
    if (!conflicts?.circularDependencies.length) return false;
    
    return conflicts.circularDependencies.some(cd => {
      const cycle = cd.cycle;
      for (let i = 0; i < cycle.length; i++) {
        const from = cycle[i];
        const to = cycle[(i + 1) % cycle.length];
        if (from === edge.from && to === edge.to) return true;
      }
      return false;
    });
  };

  // Render node
  const renderNode = (node: DependencyGraphNode) => {
    const nodeId = node.tool.id;
    const state = nodeStates.get(nodeId);
    if (!state) return null;

    const { position, selected, highlighted, hasConflict, isTarget, isInstalled } = state;
    
    // Determine node styling
    const nodeClass = [
      'dependency-node',
      selected && 'selected',
      highlighted && 'highlighted',
      hasConflict && 'has-conflict',
      isTarget && 'is-target',
      isInstalled && 'is-installed',
      getCategoryClass(node.tool.category)
    ].filter(Boolean).join(' ');

    return (
      <g
        key={nodeId}
        transform={`translate(${position.x}, ${position.y})`}
        className={nodeClass}
        onClick={() => handleNodeClick(nodeId)}
        onMouseEnter={() => setHoveredNode(nodeId)}
        onMouseLeave={() => setHoveredNode(null)}
        style={{ cursor: interactive ? 'pointer' : 'default' }}
        role="button"
        aria-label={`${node.tool.name} node`}
      >
        <circle r={compactView ? 20 : 30} />
        {!compactView && (
          <>
            <text y="5" textAnchor="middle" className="node-label">
              {node.tool.name}
            </text>
            {hasConflict && (
              <text y="20" textAnchor="middle" className="conflict-indicator">
                ⚠️
              </text>
            )}
          </>
        )}
        {compactView && (
          <text y="5" textAnchor="middle" className="node-label-compact">
            {node.tool.id.substring(0, 3).toUpperCase()}
          </text>
        )}
        {isInstalled && (
          <circle r={compactView ? 25 : 35} className="installed-indicator" />
        )}
      </g>
    );
  };

  // Render edge
  const renderEdge = (edge: DependencyGraphEdge) => {
    const edgeKey = `${edge.from}-${edge.to}`;
    const state = edgeStates.get(edgeKey);
    if (!state) return null;

    const fromState = nodeStates.get(edge.from);
    const toState = nodeStates.get(edge.to);
    if (!fromState || !toState) return null;

    const { highlighted, isConflicting, isCircular } = state;
    
    // Determine edge styling
    const edgeClass = [
      'dependency-edge',
      highlighted && 'highlighted',
      isConflicting && 'conflicting',
      isCircular && 'circular',
      getDependencyTypeClass(edge.dependency.type)
    ].filter(Boolean).join(' ');

    // Calculate edge path
    const path = calculateEdgePath(
      fromState.position,
      toState.position,
      compactView ? 20 : 30
    );

    return (
      <g key={edgeKey} className={edgeClass}>
        <path d={path} fill="none" markerEnd="url(#arrowhead)" />
        {!compactView && edge.dependency.minVersion && (
          <text>
            <textPath href={`#path-${edgeKey}`} startOffset="50%">
              {edge.dependency.minVersion}
            </textPath>
          </text>
        )}
      </g>
    );
  };

  // Render statistics panel
  const renderStatistics = () => {
    if (!showStatistics) return null;

    const stats = graph.getStatistics();
    const conflictStats = conflicts?.statistics;

    return (
      <div className="statistics-panel">
        <h3>Graph Statistics</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Total Nodes:</span>
            <span className="stat-value">{stats.totalNodes}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Edges:</span>
            <span className="stat-value">{stats.totalEdges}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Complexity:</span>
            <span className="stat-value">{stats.complexity.cyclomatic}</span>
          </div>
          {conflictStats && (
            <>
              <div className="stat-item">
                <span className="stat-label">Conflicts:</span>
                <span className="stat-value conflict">{conflictStats.totalConflicts}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Critical:</span>
                <span className="stat-value critical">{conflictStats.criticalConflicts}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Resolvable:</span>
                <span className="stat-value resolvable">{conflictStats.resolvableConflicts}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Render conflict details
  const renderConflictDetails = () => {
    if (!showConflictDetails || !conflicts?.hasConflicts) return null;

    return (
      <div className="conflict-details-panel">
        <div className="panel-header">
          <h3>Detected Conflicts</h3>
          <button 
            className="close-button"
            onClick={() => setShowConflictDetails(false)}
          >
            ×
          </button>
        </div>
        <div className="conflict-list">
          {conflicts.conflicts.map(conflict => (
            <ConflictDetailItem key={conflict.id} conflict={conflict} />
          ))}
        </div>
        {conflicts.canProceed && onResolveConflicts && (
          <button 
            className="resolve-button"
            onClick={onResolveConflicts}
          >
            Resolve Conflicts
          </button>
        )}
      </div>
    );
  };

  // Render resolution steps
  const renderResolutionSteps = () => {
    if (!showResolutionSteps || !resolution) return null;

    return (
      <div className="resolution-steps-panel">
        <div className="panel-header">
          <h3>Resolution Steps</h3>
          <button 
            className="close-button"
            onClick={() => setShowResolutionSteps(false)}
          >
            ×
          </button>
        </div>
        <div className="resolution-summary">
          <p>{resolution.summary.description}</p>
          <div className="impact-badge impact-{resolution.summary.impact}">
            Impact: {resolution.summary.impact}
          </div>
        </div>
        <div className="steps-list">
          {resolution.appliedSteps.map((step, index) => (
            <div key={index} className={`resolution-step ${step.result}`}>
              <span className="step-number">{index + 1}</span>
              <span className="step-description">{step.description}</span>
              <span className={`step-result ${step.result}`}>{step.result}</span>
            </div>
          ))}
        </div>
        {resolution.success && onAcceptResolution && (
          <button 
            className="accept-button"
            onClick={() => onAcceptResolution(resolution)}
          >
            Accept Resolution
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="dependency-visualization" data-testid="dependency-visualization">
      <div className="visualization-container">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${graphLayout.width} ${graphLayout.height}`}
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`
          }}
          role="img"
          aria-label="Dependency graph visualization"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" />
            </marker>
          </defs>
          
          <g className="edges-layer">
            {graph.getAllEdges().map(edge => renderEdge(edge))}
          </g>
          
          <g className="nodes-layer">
            {graph.getAllNodes().map(node => renderNode(node))}
          </g>
        </svg>
        
        <div className="controls">
          <button onClick={handleZoomIn} title="Zoom In">+</button>
          <button onClick={handleZoomOut} title="Zoom Out">-</button>
          <button onClick={handleZoomReset} title="Reset View">⟲</button>
          {conflicts?.hasConflicts && (
            <button 
              onClick={() => setShowConflictDetails(!showConflictDetails)}
              className="conflict-toggle"
            >
              {showConflictDetails ? 'Hide' : 'Show'} Conflicts
            </button>
          )}
          {resolution && (
            <button 
              onClick={() => setShowResolutionSteps(!showResolutionSteps)}
              className="resolution-toggle"
            >
              {showResolutionSteps ? 'Hide' : 'Show'} Resolution
            </button>
          )}
        </div>
      </div>
      
      {renderStatistics()}
      {renderConflictDetails()}
      {renderResolutionSteps()}
    </div>
  );
};

/**
 * Conflict detail item component
 */
const ConflictDetailItem: React.FC<{ conflict: ConflictDetail }> = ({ conflict }) => {
  return (
    <div className={`conflict-item ${conflict.severity}`}>
      <div className="conflict-header">
        <span className="conflict-type">{conflict.type}</span>
        <span className={`severity-badge ${conflict.severity}`}>
          {conflict.severity}
        </span>
      </div>
      <p className="conflict-description">{conflict.description}</p>
      <div className="involved-tools">
        {conflict.involvedTools.map(tool => (
          <span key={tool} className="tool-tag">{tool}</span>
        ))}
      </div>
      {conflict.suggestedResolutions.length > 0 && (
        <div className="resolutions">
          <h4>Suggested Resolutions:</h4>
          {conflict.suggestedResolutions.map((res, index) => (
            <div key={index} className="resolution-option">
              <span className="resolution-name">{res.name}</span>
              <span className="confidence">{res.confidence}% confidence</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper functions

/**
 * Calculate graph layout using force-directed algorithm
 */
function calculateGraphLayout(
  graph: DependencyGraph,
  selectedTools: string[],
  compactView: boolean
): { nodePositions: Map<string, { x: number; y: number }>; width: number; height: number } {
  const nodePositions = new Map<string, { x: number; y: number }>();
  const nodes = graph.getAllNodes();
  
  // Simple hierarchical layout based on dependency depth
  const nodeDepths = calculateNodeDepths(graph, selectedTools);
  const maxDepth = Math.max(...Array.from(nodeDepths.values()));
  
  const levelCounts = new Map<number, number>();
  for (const [nodeId, depth] of nodeDepths) {
    levelCounts.set(depth, (levelCounts.get(depth) || 0) + 1);
  }
  
  const levelIndices = new Map<number, number>();
  const spacing = compactView ? 100 : 150;
  const verticalSpacing = compactView ? 80 : 120;
  
  const width = Math.max(...Array.from(levelCounts.values())) * spacing + 100;
  const height = (maxDepth + 1) * verticalSpacing + 100;
  
  for (const node of nodes) {
    const id = node.tool.id;
    const depth = nodeDepths.get(id) || 0;
    const levelIndex = levelIndices.get(depth) || 0;
    const levelCount = levelCounts.get(depth) || 1;
    
    const x = 50 + (width - 100) * (levelIndex + 0.5) / levelCount;
    const y = 50 + depth * verticalSpacing;
    
    nodePositions.set(id, { x, y });
    levelIndices.set(depth, levelIndex + 1);
  }
  
  return { nodePositions, width, height };
}

/**
 * Calculate node depths from selected tools
 */
function calculateNodeDepths(
  graph: DependencyGraph,
  selectedTools: string[]
): Map<string, number> {
  const depths = new Map<string, number>();
  const visited = new Set<string>();
  
  const calculateDepth = (nodeId: string, currentDepth: number) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    depths.set(nodeId, Math.min(depths.get(nodeId) || Infinity, currentDepth));
    
    const edges = graph.getOutgoingEdges(nodeId);
    for (const edge of edges) {
      calculateDepth(edge.to, currentDepth + 1);
    }
  };
  
  // Start from selected tools
  for (const toolId of selectedTools) {
    calculateDepth(toolId, 0);
  }
  
  // Handle disconnected nodes
  for (const node of graph.getAllNodes()) {
    if (!depths.has(node.tool.id)) {
      depths.set(node.tool.id, 0);
    }
  }
  
  return depths;
}

/**
 * Calculate edge path between two nodes
 */
function calculateEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  nodeRadius: number
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) return '';
  
  // Calculate start and end points on node perimeters
  const startX = from.x + (dx / distance) * nodeRadius;
  const startY = from.y + (dy / distance) * nodeRadius;
  const endX = to.x - (dx / distance) * nodeRadius;
  const endY = to.y - (dy / distance) * nodeRadius;
  
  // Create curved path
  const controlX = (startX + endX) / 2;
  const controlY = (startY + endY) / 2 - 30;
  
  return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
}

/**
 * Get CSS class for tool category
 */
function getCategoryClass(category: ToolCategory): string {
  return `category-${category}`;
}

/**
 * Get CSS class for dependency type
 */
function getDependencyTypeClass(type: string): string {
  return `dependency-${type}`;
}

export default DependencyVisualization;