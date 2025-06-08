/**
 * Dependency Resolution Panel
 * Integration component for dependency resolution in HatStart UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DependencyVisualization } from './DependencyVisualization';
import {
  DependencyGraph,
  buildGraphFromManifests,
  createConflictDetector,
  createConflictResolver,
  type ConflictDetectionResult,
  type ResolutionExecutionResult
} from '../../services/dependency-resolution';
import type { ToolManifest, Platform } from '../../shared/manifest-types';
import type { JobRoleConfig } from '../../data/job-role-configs';

/**
 * Props for DependencyResolutionPanel
 */
export interface DependencyResolutionPanelProps {
  /** Selected job role configuration */
  jobRole: JobRoleConfig;
  /** Selected tools for installation */
  selectedTools: string[];
  /** Available tool manifests */
  toolManifests: Map<string, ToolManifest>;
  /** Target platform */
  platform: Platform;
  /** Callback when resolution is complete */
  onResolutionComplete?: (result: ResolutionExecutionResult) => void;
  /** Callback when user wants to proceed with installation */
  onProceedToInstall?: (installationOrder: string[]) => void;
}

/**
 * Resolution state
 */
interface ResolutionState {
  graph?: DependencyGraph;
  conflicts?: ConflictDetectionResult;
  resolution?: ResolutionExecutionResult;
  isAnalyzing: boolean;
  isResolving: boolean;
  error?: string;
}

/**
 * Dependency resolution panel component
 */
export const DependencyResolutionPanel: React.FC<DependencyResolutionPanelProps> = ({
  jobRole,
  selectedTools,
  toolManifests,
  platform,
  onResolutionComplete,
  onProceedToInstall
}) => {
  const [state, setState] = useState<ResolutionState>({
    isAnalyzing: false,
    isResolving: false
  });

  // Analyze dependencies and detect conflicts
  const analyzeDependencies = useCallback(async () => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: undefined }));

    try {
      // Build dependency graph
      const result = await buildGraphFromManifests(
        toolManifests,
        platform,
        { includeOptional: true, includeSuggested: false }
      );

      if (!result.success) {
        throw new Error(result.errors.join(', '));
      }

      // Detect conflicts
      const detector = createConflictDetector();
      const conflicts = await detector.detectConflicts(
        result.graph,
        selectedTools,
        { thoroughnessLevel: 'balanced' }
      );

      setState(prev => ({
        ...prev,
        graph: result.graph,
        conflicts,
        isAnalyzing: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Failed to analyze dependencies'
      }));
    }
  }, [selectedTools, toolManifests, platform]);

  // Build dependency graph when tools change
  useEffect(() => {
    if (selectedTools.length === 0) {
      setState({ isAnalyzing: false, isResolving: false });
      return;
    }

    analyzeDependencies();
  }, [selectedTools, toolManifests, platform, analyzeDependencies]);

  // Resolve conflicts
  const handleResolveConflicts = useCallback(async () => {
    if (!state.graph || !state.conflicts) return;

    setState(prev => ({ ...prev, isResolving: true, error: undefined }));

    try {
      const resolver = createConflictResolver();
      const resolution = await resolver.resolveConflicts(
        state.conflicts,
        state.graph,
        {
          policy: {
            automaticResolution: true,
            preferLatestVersions: true,
            allowBreakingChanges: false,
            requireUserConfirmation: false
          }
        }
      );

      setState(prev => ({
        ...prev,
        resolution,
        isResolving: false
      }));

      onResolutionComplete?.(resolution);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isResolving: false,
        error: error instanceof Error ? error.message : 'Failed to resolve conflicts'
      }));
    }
  }, [state.graph, state.conflicts, onResolutionComplete]);

  // Accept resolution and proceed
  const handleAcceptResolution = useCallback((resolution: ResolutionExecutionResult) => {
    if (!resolution.success || !resolution.updatedInstallationOrder) return;

    const installationOrder = resolution.updatedInstallationOrder.installationSequence;
    onProceedToInstall?.(installationOrder);
  }, [onProceedToInstall]);

  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: string) => {
    console.log('Selected node:', nodeId);
    // Could show additional details or actions for the selected node
  }, []);

  // Render loading state
  if (state.isAnalyzing) {
    return (
      <div className="dependency-resolution-panel loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Analyzing dependencies...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <div className="dependency-resolution-panel error">
        <div className="error-message">
          <h3>Error</h3>
          <p>{state.error}</p>
          <button onClick={analyzeDependencies} className="retry-button">
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!state.graph || selectedTools.length === 0) {
    return (
      <div className="dependency-resolution-panel empty">
        <div className="empty-message">
          <h3>No Tools Selected</h3>
          <p>Select tools from the categories to analyze dependencies.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dependency-resolution-panel">
      <div className="panel-header">
        <h2>Dependency Analysis</h2>
        <p className="job-role-info">
          Analyzing dependencies for <strong>{jobRole.title}</strong> role
        </p>
      </div>

      <div className="visualization-wrapper">
        <DependencyVisualization
          graph={state.graph}
          selectedTools={selectedTools}
          conflicts={state.conflicts}
          resolution={state.resolution}
          platform={platform}
          onNodeSelect={handleNodeSelect}
          onResolveConflicts={handleResolveConflicts}
          onAcceptResolution={handleAcceptResolution}
          interactive={true}
          showStatistics={true}
        />
      </div>

      {state.isResolving && (
        <div className="resolving-overlay">
          <div className="resolving-content">
            <div className="spinner"></div>
            <p>Resolving conflicts...</p>
          </div>
        </div>
      )}

      {state.conflicts && state.conflicts.hasConflicts && !state.resolution && (
        <div className="action-bar">
          <div className="conflict-summary">
            <span className="conflict-count">
              {state.conflicts.statistics.totalConflicts} conflicts detected
            </span>
            {state.conflicts.canProceed && (
              <span className="can-proceed">Can proceed with installation</span>
            )}
          </div>
          <button 
            className="resolve-button primary"
            onClick={handleResolveConflicts}
            disabled={state.isResolving}
          >
            Resolve Conflicts Automatically
          </button>
        </div>
      )}

      {state.resolution && state.resolution.success && (
        <div className="action-bar success">
          <div className="resolution-summary">
            <span className="success-icon">✓</span>
            <span>All conflicts resolved successfully</span>
          </div>
          <button 
            className="proceed-button primary"
            onClick={() => handleAcceptResolution(state.resolution!)}
          >
            Proceed to Installation
          </button>
        </div>
      )}
    </div>
  );
};

export default DependencyResolutionPanel;