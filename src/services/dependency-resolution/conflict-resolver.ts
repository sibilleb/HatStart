/**
 * Conflict Resolution Strategies
 * Implements automated and guided resolution of dependency conflicts
 */

import type {
  DependencyGraph,
  DependencyGraphNode,
  DependencyGraphEdge,
  ConflictType,
  ResolutionStrategy
} from './types.js';

import type {
  ConflictDetail,
  ConflictDetectionResult,
  VersionConflictDetail,
  CircularDependencyDetail,
  PlatformIncompatibilityDetail,
  ConflictResolutionStrategy,
  ResolutionStep
} from './conflict-detector.js';

import type {
  InstallationOrder,
  ResolutionOptions
} from './dependency-resolver.js';

import type {
  ToolManifest,
  ToolDependency,
  Platform,
  Architecture,
  DependencyType
} from '../../shared/manifest-types.js';

/**
 * Resolution execution result
 */
export interface ResolutionExecutionResult {
  /** Whether the resolution was successful */
  success: boolean;
  /** Modified dependency graph after resolution */
  modifiedGraph: DependencyGraph;
  /** Updated installation order */
  updatedInstallationOrder: InstallationOrder;
  /** Applied resolution steps */
  appliedSteps: ExecutedResolutionStep[];
  /** Remaining unresolved conflicts */
  remainingConflicts: ConflictDetail[];
  /** Resolution statistics */
  statistics: {
    conflictsResolved: number;
    stepsExecuted: number;
    executionTime: number;
    userInteractions: number;
    automatedResolutions: number;
  };
  /** Resolution summary */
  summary: {
    description: string;
    impact: 'low' | 'medium' | 'high';
    reversible: boolean;
    sideEffects: string[];
  };
}

/**
 * Executed resolution step with result
 */
export interface ExecutedResolutionStep extends ResolutionStep {
  /** Execution result */
  result: 'success' | 'failed' | 'skipped' | 'requires-user-input';
  /** Error message if failed */
  error?: string;
  /** User input if required */
  userInput?: unknown;
  /** Execution time */
  executionTime: number;
  /** Affected tools */
  affectedTools: string[];
}

/**
 * Resolution policy configuration
 */
export interface ResolutionPolicy {
  /** Automatic resolution preferences */
  automatic: {
    /** Enable automatic resolution */
    enabled: boolean;
    /** Maximum number of automatic steps */
    maxSteps: number;
    /** Allowed automatic actions */
    allowedActions: ResolutionStep['action'][];
    /** Risk tolerance for automatic actions */
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  };
  /** Version resolution preferences */
  versioning: {
    /** Prefer latest compatible versions */
    preferLatest: boolean;
    /** Allow major version upgrades */
    allowMajorUpgrades: boolean;
    /** Allow downgrades */
    allowDowngrades: boolean;
    /** Version pinning strategy */
    pinningStrategy: 'exact' | 'major' | 'minor' | 'patch';
  };
  /** Platform handling preferences */
  platform: {
    /** Fallback to alternatives for unsupported platforms */
    useAlternatives: boolean;
    /** Allow platform-specific workarounds */
    allowWorkarounds: boolean;
    /** Prefer native solutions */
    preferNative: boolean;
  };
  /** User interaction preferences */
  interaction: {
    /** Prompt for confirmation before major changes */
    confirmMajorChanges: boolean;
    /** Provide detailed explanations */
    verboseExplanations: boolean;
    /** Allow user to override recommendations */
    allowOverrides: boolean;
  };
}

/**
 * Resolution context for strategy execution
 */
export interface ResolutionContext {
  /** Original conflicts to resolve */
  originalConflicts: ConflictDetail[];
  /** Current dependency graph */
  graph: DependencyGraph;
  /** Target tools for installation */
  targetTools: string[];
  /** Resolution policy */
  policy: ResolutionPolicy;
  /** Platform information */
  platform: Platform;
  /** Architecture information */
  architecture: Architecture;
  /** User interaction callbacks */
  callbacks: {
    /** Request user confirmation */
    requestConfirmation?: (message: string, options: string[]) => Promise<string>;
    /** Request user input */
    requestInput?: (prompt: string, type: 'text' | 'number' | 'boolean') => Promise<unknown>;
    /** Notify user of progress */
    notifyProgress?: (message: string, progress: number) => void;
  };
  /** Resolution state */
  state: {
    /** Steps executed so far */
    executedSteps: ExecutedResolutionStep[];
    /** Current working graph */
    workingGraph: DependencyGraph;
    /** Modified tool manifests */
    modifiedManifests: Map<string, ToolManifest>;
  };
}

/**
 * Tool substitution recommendation
 */
export interface ToolSubstitution {
  /** Original tool to replace */
  originalTool: string;
  /** Recommended replacement */
  replacementTool: string;
  /** Reason for substitution */
  reason: string;
  /** Compatibility score (0-100) */
  compatibilityScore: number;
  /** Features lost in substitution */
  featuresLost: string[];
  /** Features gained in substitution */
  featuresGained: string[];
  /** Migration complexity */
  migrationComplexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Version pinning recommendation
 */
export interface VersionPinning {
  /** Tool to pin */
  toolId: string;
  /** Recommended version to pin to */
  pinnedVersion: string;
  /** Reason for pinning */
  reason: string;
  /** Impact of pinning */
  impact: {
    /** Features that might be unavailable */
    limitedFeatures: string[];
    /** Security implications */
    securityImplications: string[];
    /** Compatibility with other tools */
    compatibilityImpact: string[];
  };
}

/**
 * Advanced conflict resolver with multiple resolution strategies
 */
export class ConflictResolver {
  private graph: DependencyGraph;
  private defaultPolicy: ResolutionPolicy;

  constructor(graph: DependencyGraph) {
    this.graph = graph;
    this.defaultPolicy = this.createDefaultPolicy();
  }

  /**
   * Resolve conflicts automatically using configured policies
   */
  public async resolveConflicts(
    conflicts: ConflictDetectionResult,
    targetTools: string[],
    options: {
      policy?: Partial<ResolutionPolicy>;
      platform?: Platform;
      architecture?: Architecture;
      callbacks?: ResolutionContext['callbacks'];
    } = {}
  ): Promise<ResolutionExecutionResult> {
    const startTime = Date.now();

    try {
      // Create resolution context
      const context = this.createResolutionContext(conflicts, targetTools, options);

      // Execute resolution strategies
      const result = await this.executeResolutionStrategies(context);

      // Update statistics
      result.statistics.executionTime = Math.max(1, Date.now() - startTime);

      return result;

    } catch (error) {
      return this.createFailureResult(
        `Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Resolve version conflicts using various strategies
   */
  public async resolveVersionConflicts(
    versionConflicts: VersionConflictDetail[],
    policy: Partial<ResolutionPolicy> = {}
  ): Promise<{
    resolutions: VersionPinning[];
    success: boolean;
    unresolvedConflicts: VersionConflictDetail[];
  }> {
    const resolutions: VersionPinning[] = [];
    const unresolvedConflicts: VersionConflictDetail[] = [];
    const mergedPolicy = { ...this.defaultPolicy, ...policy };

    for (const conflict of versionConflicts) {
      const resolution = await this.resolveVersionConflict(conflict, mergedPolicy);
      
      if (resolution) {
        resolutions.push(resolution);
      } else {
        unresolvedConflicts.push(conflict);
      }
    }

    return {
      resolutions,
      success: unresolvedConflicts.length === 0,
      unresolvedConflicts
    };
  }

  /**
   * Resolve circular dependencies by breaking cycles
   */
  public async resolveCircularDependencies(
    circularDependencies: CircularDependencyDetail[],
    policy: Partial<ResolutionPolicy> = {}
  ): Promise<{
    resolutions: ResolutionStep[];
    success: boolean;
    unresolvedCycles: CircularDependencyDetail[];
  }> {
    const resolutions: ResolutionStep[] = [];
    const unresolvedCycles: CircularDependencyDetail[] = [];
    const mergedPolicy = { ...this.defaultPolicy, ...policy };

    for (const cycle of circularDependencies) {
      const resolution = await this.resolveCircularDependency(cycle, mergedPolicy);
      
      if (resolution) {
        resolutions.push(...resolution);
      } else {
        unresolvedCycles.push(cycle);
      }
    }

    return {
      resolutions,
      success: unresolvedCycles.length === 0,
      unresolvedCycles
    };
  }

  /**
   * Resolve platform incompatibilities with substitutions
   */
  public async resolvePlatformIncompatibilities(
    platformConflicts: PlatformIncompatibilityDetail[],
    policy: Partial<ResolutionPolicy> = {}
  ): Promise<{
    substitutions: ToolSubstitution[];
    success: boolean;
    unresolvedIncompatibilities: PlatformIncompatibilityDetail[];
  }> {
    const substitutions: ToolSubstitution[] = [];
    const unresolvedIncompatibilities: PlatformIncompatibilityDetail[] = [];
    const mergedPolicy = { ...this.defaultPolicy, ...policy };

    for (const incompatibility of platformConflicts) {
      const resolution = await this.resolvePlatformIncompatibility(incompatibility, mergedPolicy);
      
      if (resolution.length > 0) {
        substitutions.push(...resolution);
      } else {
        unresolvedIncompatibilities.push(incompatibility);
      }
    }

    return {
      substitutions,
      success: unresolvedIncompatibilities.length === 0,
      unresolvedIncompatibilities
    };
  }

  /**
   * Generate interactive resolution plan
   */
  public async generateResolutionPlan(
    conflicts: ConflictDetectionResult,
    targetTools: string[],
    policy: Partial<ResolutionPolicy> = {}
  ): Promise<{
    plan: ResolutionStep[];
    estimatedTime: number;
    riskAssessment: {
      risk: 'low' | 'medium' | 'high';
      factors: string[];
      mitigation: string[];
    };
    userDecisionPoints: {
      step: number;
      decision: string;
      options: string[];
      recommendation: string;
    }[];
  }> {
    const mergedPolicy = { ...this.defaultPolicy, ...policy };
    const plan: ResolutionStep[] = [];
    const userDecisionPoints: any[] = [];
    let estimatedTime = 0;

    // Analyze conflicts and generate steps
    for (const conflict of conflicts.conflicts) {
      const steps = await this.generateStepsForConflict(conflict, mergedPolicy);
      plan.push(...steps);
      
      // Calculate estimated time
      estimatedTime += steps.reduce((sum, step) => sum + this.estimateStepTime(step), 0);

      // Identify user decision points
      steps.forEach((step, index) => {
        if (step.requiresConfirmation || this.requiresUserDecision(step, mergedPolicy)) {
          userDecisionPoints.push({
            step: plan.length - steps.length + index,
            decision: step.description,
            options: this.getDecisionOptions(step),
            recommendation: this.getRecommendation(step, mergedPolicy)
          });
        }
      });
    }

    return {
      plan,
      estimatedTime,
      riskAssessment: this.assessResolutionRisk(plan, mergedPolicy),
      userDecisionPoints
    };
  }

  // Private implementation methods

  private createDefaultPolicy(): ResolutionPolicy {
    return {
      automatic: {
        enabled: true,
        maxSteps: 10,
        allowedActions: ['defer', 'substitute', 'configure'],
        riskTolerance: 'moderate'
      },
      versioning: {
        preferLatest: true,
        allowMajorUpgrades: false,
        allowDowngrades: true,
        pinningStrategy: 'minor'
      },
      platform: {
        useAlternatives: true,
        allowWorkarounds: true,
        preferNative: true
      },
      interaction: {
        confirmMajorChanges: true,
        verboseExplanations: true,
        allowOverrides: true
      }
    };
  }

  private createResolutionContext(
    conflicts: ConflictDetectionResult,
    targetTools: string[],
    options: any
  ): ResolutionContext {
    return {
      originalConflicts: conflicts.conflicts,
      graph: this.graph,
      targetTools,
      policy: { ...this.defaultPolicy, ...options.policy },
      platform: options.platform || 'linux',
      architecture: options.architecture || 'x64',
      callbacks: options.callbacks || {},
      state: {
        executedSteps: [],
        workingGraph: this.graph, // Would clone in real implementation
        modifiedManifests: new Map()
      }
    };
  }

  private async executeResolutionStrategies(
    context: ResolutionContext
  ): Promise<ResolutionExecutionResult> {
    const executedSteps: ExecutedResolutionStep[] = [];
    const resolvedConflicts: ConflictDetail[] = [];
    let userInteractions = 0;
    let automatedResolutions = 0;

    // Sort conflicts by priority (critical first)
    const sortedConflicts = this.prioritizeConflicts(context.originalConflicts);

    for (const conflict of sortedConflicts) {
      if (executedSteps.length >= context.policy.automatic.maxSteps) {
        break; // Respect maximum steps limit
      }

      const steps = await this.generateStepsForConflict(conflict, context.policy);
      
      for (const step of steps) {
        const executionResult = await this.executeResolutionStep(step, context);
        executedSteps.push(executionResult);

        if (executionResult.result === 'success') {
          if (step.requiresConfirmation) {
            userInteractions++;
          } else {
            automatedResolutions++;
          }
        }

        if (executionResult.result === 'requires-user-input') {
          userInteractions++;
        }
      }

      // Check if conflict is resolved
      if (await this.isConflictResolved(conflict, context)) {
        resolvedConflicts.push(conflict);
      }
    }

    // Generate updated installation order
    const updatedInstallationOrder = await this.generateUpdatedInstallationOrder(context);

    return {
      success: resolvedConflicts.length === context.originalConflicts.length,
      modifiedGraph: context.state.workingGraph,
      updatedInstallationOrder,
      appliedSteps: executedSteps,
      remainingConflicts: context.originalConflicts.filter(c => !resolvedConflicts.includes(c)),
      statistics: {
        conflictsResolved: resolvedConflicts.length,
        stepsExecuted: executedSteps.length,
        executionTime: 0, // Will be set by caller
        userInteractions,
        automatedResolutions
      },
      summary: {
        description: this.generateResolutionSummary(executedSteps, resolvedConflicts),
        impact: this.assessOverallImpact(executedSteps),
        reversible: this.areStepsReversible(executedSteps),
        sideEffects: this.collectSideEffects(executedSteps)
      }
    };
  }

  private async resolveVersionConflict(
    conflict: VersionConflictDetail,
    policy: ResolutionPolicy
  ): Promise<VersionPinning | null> {
    const node = this.graph.getNode(conflict.toolId);
    if (!node) return null;

    // Find best version based on policy
    const bestVersion = this.findBestVersion(conflict, policy);
    
    if (bestVersion) {
      return {
        toolId: conflict.toolId,
        pinnedVersion: bestVersion,
        reason: `Resolves version conflicts between ${conflict.versionRequirements.map(vr => vr.requiredBy).join(', ')}`,
        impact: {
          limitedFeatures: this.assessFeatureLimitations(conflict.toolId, bestVersion),
          securityImplications: this.assessSecurityImplications(conflict.toolId, bestVersion),
          compatibilityImpact: this.assessCompatibilityImpact(conflict.toolId, bestVersion)
        }
      };
    }

    return null;
  }

  private async resolveCircularDependency(
    cycle: CircularDependencyDetail,
    policy: ResolutionPolicy
  ): Promise<ResolutionStep[] | null> {
    if (!cycle.breakable || cycle.breakPoints.length === 0) {
      return null;
    }

    // Choose best break point based on policy
    const bestBreakPoint = cycle.breakPoints.sort((a, b) => a.impact - b.impact)[0];
    
    return [{
      description: bestBreakPoint.description,
      action: bestBreakPoint.strategy as any,
      target: bestBreakPoint.edge.from,
      parameters: { 
        to: bestBreakPoint.edge.to,
        strategy: bestBreakPoint.strategy
      },
      requiresConfirmation: policy.interaction.confirmMajorChanges && bestBreakPoint.impact > 50
    }];
  }

  private async resolvePlatformIncompatibility(
    incompatibility: PlatformIncompatibilityDetail,
    policy: ResolutionPolicy
  ): Promise<ToolSubstitution[]> {
    const substitutions: ToolSubstitution[] = [];

    if (!policy.platform.useAlternatives) {
      return substitutions;
    }

    for (const gap of incompatibility.missingSupport) {
      if (gap.alternatives.length > 0) {
        const bestAlternative = this.selectBestAlternative(gap.toolId, gap.alternatives, policy);
        
        if (bestAlternative) {
          substitutions.push({
            originalTool: gap.toolId,
            replacementTool: bestAlternative,
            reason: `${gap.toolId} does not support ${incompatibility.targetPlatform}`,
            compatibilityScore: this.calculateCompatibilityScore(gap.toolId, bestAlternative),
            featuresLost: [],
            featuresGained: [],
            migrationComplexity: 'moderate'
          });
        }
      }
    }

    return substitutions;
  }

  private async generateStepsForConflict(
    conflict: ConflictDetail,
    policy: ResolutionPolicy
  ): Promise<ResolutionStep[]> {
    // Return the suggested resolutions from the conflict
    const steps: ResolutionStep[] = [];
    
    for (const resolution of conflict.suggestedResolutions) {
      if (this.isResolutionAllowed(resolution, policy)) {
        steps.push(...resolution.steps);
      }
    }

    return steps;
  }

  private async executeResolutionStep(
    step: ResolutionStep,
    context: ResolutionContext
  ): Promise<ExecutedResolutionStep> {
    const startTime = Date.now();

    try {
      let result: ExecutedResolutionStep['result'] = 'success';
      const affectedTools: string[] = [step.target];

      // Check if user confirmation is needed
      if (step.requiresConfirmation && context.callbacks.requestConfirmation) {
        const confirmation = await context.callbacks.requestConfirmation(
          `Confirm: ${step.description}`,
          ['Yes', 'No', 'Skip']
        );
        
        if (confirmation === 'No') {
          result = 'failed';
        } else if (confirmation === 'Skip') {
          result = 'skipped';
        }
      }

      // Execute the step if confirmed
      if (result === 'success') {
        result = await this.performStepAction(step, context);
      }

      return {
        ...step,
        result,
        executionTime: Date.now() - startTime,
        affectedTools
      };

    } catch (error) {
      return {
        ...step,
        result: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        affectedTools: [step.target]
      };
    }
  }

  private async performStepAction(
    step: ResolutionStep,
    context: ResolutionContext
  ): Promise<ExecutedResolutionStep['result']> {
    switch (step.action) {
      case 'substitute':
        return this.performSubstitution(step, context);
      case 'defer':
        return this.performDeferral(step, context);
      case 'upgrade':
      case 'downgrade':
        return this.performVersionChange(step, context);
      case 'remove':
        return this.performRemoval(step, context);
      case 'configure':
        return this.performConfiguration(step, context);
      default:
        return 'failed';
    }
  }

  private async performSubstitution(
    step: ResolutionStep,
    context: ResolutionContext
  ): Promise<ExecutedResolutionStep['result']> {
    // Simulate tool substitution
    const target = step.target;
    const replacement = step.parameters.replacement as string;
    
    if (replacement && context.state.workingGraph.hasNode(replacement)) {
      // Would perform actual substitution logic here
      return 'success';
    }
    
    return 'failed';
  }

  private async performDeferral(
    step: ResolutionStep,
    context: ResolutionContext
  ): Promise<ExecutedResolutionStep['result']> {
    // Simulate dependency deferral
    return 'success';
  }

  private async performVersionChange(
    step: ResolutionStep,
    context: ResolutionContext
  ): Promise<ExecutedResolutionStep['result']> {
    // Simulate version change
    const targetVersion = step.parameters.version as string;
    
    if (targetVersion) {
      // Would perform actual version change logic here
      return 'success';
    }
    
    return 'failed';
  }

  private async performRemoval(
    step: ResolutionStep,
    context: ResolutionContext
  ): Promise<ExecutedResolutionStep['result']> {
    // Simulate tool removal
    if (context.state.workingGraph.hasNode(step.target)) {
      // Would perform actual removal logic here
      return 'success';
    }
    
    return 'failed';
  }

  private async performConfiguration(
    step: ResolutionStep,
    context: ResolutionContext
  ): Promise<ExecutedResolutionStep['result']> {
    // Simulate configuration change
    return 'success';
  }

  // Utility methods

  private prioritizeConflicts(conflicts: ConflictDetail[]): ConflictDetail[] {
    return conflicts.sort((a, b) => {
      const severityOrder = { critical: 3, major: 2, minor: 1, warning: 0 };
      const aSeverity = severityOrder[a.severity] || 0;
      const bSeverity = severityOrder[b.severity] || 0;
      
      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity; // Higher severity first
      }
      
      // If same severity, prioritize blocking conflicts
      if (a.blocking !== b.blocking) {
        return a.blocking ? -1 : 1;
      }
      
      return 0;
    });
  }

  private findBestVersion(conflict: VersionConflictDetail, policy: ResolutionPolicy): string | null {
    // Simplified version selection logic
    const node = this.graph.getNode(conflict.toolId);
    if (!node) return null;

    const availableVersions = node.versionInfo.availableVersions;
    
    if (policy.versioning.preferLatest) {
      return availableVersions[availableVersions.length - 1];
    }
    
    return availableVersions[0]; // Return first available
  }

  private selectBestAlternative(
    originalTool: string,
    alternatives: string[],
    policy: ResolutionPolicy
  ): string | null {
    if (alternatives.length === 0) return null;
    
    // Simple selection: return first alternative
    return alternatives[0];
  }

  private calculateCompatibilityScore(toolA: string, toolB: string): number {
    // Simplified compatibility scoring
    return 85; // Default high compatibility
  }

  private isResolutionAllowed(resolution: ConflictResolutionStrategy, policy: ResolutionPolicy): boolean {
    if (!policy.automatic.enabled && resolution.type === 'automatic') {
      return false;
    }
    
    const hasAllowedActions = resolution.steps.some(step => 
      policy.automatic.allowedActions.includes(step.action)
    );
    
    return hasAllowedActions;
  }

  private async isConflictResolved(conflict: ConflictDetail, context: ResolutionContext): boolean {
    // Simplified resolution check
    return true; // Assume resolved for now
  }

  private async generateUpdatedInstallationOrder(context: ResolutionContext): Promise<InstallationOrder> {
    // Return a basic installation order
    return {
      installationSequence: context.targetTools,
      batches: [context.targetTools],
      deferredDependencies: [],
      circularDependencies: [],
      estimatedTime: 300,
      success: true,
      warnings: [],
      errors: []
    };
  }

  private generateResolutionSummary(steps: ExecutedResolutionStep[], resolved: ConflictDetail[]): string {
    return `Resolved ${resolved.length} conflicts using ${steps.length} resolution steps`;
  }

  private assessOverallImpact(steps: ExecutedResolutionStep[]): 'low' | 'medium' | 'high' {
    const criticalActions = ['remove', 'substitute'];
    const hasCriticalActions = steps.some(step => criticalActions.includes(step.action));
    
    if (hasCriticalActions) return 'high';
    if (steps.length > 5) return 'medium';
    return 'low';
  }

  private areStepsReversible(steps: ExecutedResolutionStep[]): boolean {
    const irreversibleActions = ['remove'];
    return !steps.some(step => irreversibleActions.includes(step.action));
  }

  private collectSideEffects(steps: ExecutedResolutionStep[]): string[] {
    const sideEffects: string[] = [];
    
    for (const step of steps) {
      if (step.action === 'substitute') {
        sideEffects.push(`Tool ${step.target} replaced with alternative`);
      } else if (step.action === 'remove') {
        sideEffects.push(`Tool ${step.target} removed from installation`);
      }
    }
    
    return sideEffects;
  }

  private estimateStepTime(step: ResolutionStep): number {
    const timeMap: Record<ResolutionStep['action'], number> = {
      substitute: 30,
      defer: 5,
      upgrade: 15,
      downgrade: 15,
      remove: 10,
      configure: 20
    };
    
    return timeMap[step.action] || 10;
  }

  private requiresUserDecision(step: ResolutionStep, policy: ResolutionPolicy): boolean {
    if (step.requiresConfirmation) return true;
    
    const majorActions = ['substitute', 'remove', 'upgrade'];
    return majorActions.includes(step.action) && policy.interaction.confirmMajorChanges;
  }

  private getDecisionOptions(step: ResolutionStep): string[] {
    return ['Execute', 'Skip', 'Cancel', 'Modify'];
  }

  private getRecommendation(step: ResolutionStep, policy: ResolutionPolicy): string {
    if (policy.automatic.riskTolerance === 'aggressive') {
      return 'Execute';
    } else if (policy.automatic.riskTolerance === 'conservative') {
      return 'Skip';
    }
    return 'Execute';
  }

  private assessResolutionRisk(plan: ResolutionStep[], policy: ResolutionPolicy): {
    risk: 'low' | 'medium' | 'high';
    factors: string[];
    mitigation: string[];
  } {
    const factors: string[] = [];
    const mitigation: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    const criticalSteps = plan.filter(step => ['remove', 'substitute'].includes(step.action));
    if (criticalSteps.length > 0) {
      factors.push(`${criticalSteps.length} critical modification steps`);
      riskLevel = 'medium';
    }

    if (plan.length > 10) {
      factors.push('Large number of resolution steps');
      riskLevel = 'high';
    }

    if (riskLevel !== 'low') {
      mitigation.push('Create backup before proceeding');
      mitigation.push('Test in isolated environment first');
    }

    return { risk: riskLevel, factors, mitigation };
  }

  private assessFeatureLimitations(toolId: string, version: string): string[] {
    return []; // Simplified
  }

  private assessSecurityImplications(toolId: string, version: string): string[] {
    return []; // Simplified
  }

  private assessCompatibilityImpact(toolId: string, version: string): string[] {
    return []; // Simplified
  }

  private createFailureResult(error: string, executionTime: number): ResolutionExecutionResult {
    return {
      success: false,
      modifiedGraph: this.graph,
      updatedInstallationOrder: {
        installationSequence: [],
        batches: [],
        deferredDependencies: [],
        circularDependencies: [],
        estimatedTime: 0,
        success: false,
        warnings: [],
        errors: [error]
      },
      appliedSteps: [],
      remainingConflicts: [],
      statistics: {
        conflictsResolved: 0,
        stepsExecuted: 0,
        executionTime,
        userInteractions: 0,
        automatedResolutions: 0
      },
      summary: {
        description: 'Resolution failed',
        impact: 'low',
        reversible: true,
        sideEffects: []
      }
    };
  }
}

/**
 * Factory function to create a conflict resolver
 */
export function createConflictResolver(graph: DependencyGraph): ConflictResolver {
  return new ConflictResolver(graph);
}

/**
 * Convenience function for quick conflict resolution
 */
export async function resolveConflicts(
  graph: DependencyGraph,
  conflicts: ConflictDetectionResult,
  targetTools: string[],
  options: {
    policy?: Partial<ResolutionPolicy>;
    platform?: Platform;
    architecture?: Architecture;
  } = {}
): Promise<ResolutionExecutionResult> {
  const resolver = createConflictResolver(graph);
  return resolver.resolveConflicts(conflicts, targetTools, options);
}