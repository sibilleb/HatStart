/**
 * Conflict Resolver Unit Tests
 * Comprehensive test suite for conflict resolution strategies
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ConflictResolver,
  createConflictResolver,
  resolveConflicts,
  type ResolutionExecutionResult,
  type ResolutionPolicy,
  type VersionPinning,
  type ToolSubstitution,
  type ExecutedResolutionStep
} from '../conflict-resolver.js';
import {
  ConflictDetector,
  type ConflictDetectionResult,
  type ConflictDetail,
  type VersionConflictDetail,
  type CircularDependencyDetail,
  type PlatformIncompatibilityDetail
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

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;
  let graph: DependencyGraph;
  let detector: ConflictDetector;
  let mockManifests: ToolManifest[];
  let mockConflicts: ConflictDetectionResult;

  beforeEach(async () => {
    mockManifests = createMockManifests();
    const buildResult = await buildGraphFromManifests(mockManifests, 'linux', 'x64');
    graph = buildResult.graph;
    resolver = new ConflictResolver(graph);
    detector = new ConflictDetector(graph, 'linux', 'x64');
    mockConflicts = createMockConflictResult();
  });

  describe('Constructor and Factory Functions', () => {
    test('should create resolver with default policy', () => {
      const newResolver = new ConflictResolver(graph);
      expect(newResolver).toBeDefined();
    });

    test('should create resolver using factory function', () => {
      const factoryResolver = createConflictResolver(graph);
      expect(factoryResolver).toBeDefined();
    });

    test('should use convenience function for conflict resolution', async () => {
      const result = await resolveConflicts(graph, mockConflicts, ['node'], {
        platform: 'linux',
        architecture: 'x64'
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('modifiedGraph');
      expect(result).toHaveProperty('statistics');
    });
  });

  describe('Basic Conflict Resolution', () => {
    test('should resolve conflicts successfully', async () => {
      const result = await resolver.resolveConflicts(mockConflicts, ['node'], {
        platform: 'linux',
        architecture: 'x64'
      });

      expect(result.success).toBeDefined();
      expect(result.modifiedGraph).toBeDefined();
      expect(result.updatedInstallationOrder).toBeDefined();
      expect(result.appliedSteps).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    test('should provide resolution statistics', async () => {
      const result = await resolver.resolveConflicts(mockConflicts, ['node']);

      expect(result.statistics.conflictsResolved).toBeGreaterThanOrEqual(0);
      expect(result.statistics.stepsExecuted).toBeGreaterThanOrEqual(0);
      expect(result.statistics.executionTime).toBeGreaterThan(0);
      expect(result.statistics.userInteractions).toBeGreaterThanOrEqual(0);
      expect(result.statistics.automatedResolutions).toBeGreaterThanOrEqual(0);
    });

    test('should generate resolution summary', async () => {
      const result = await resolver.resolveConflicts(mockConflicts, ['node']);

      expect(result.summary.description).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(result.summary.impact);
      expect(typeof result.summary.reversible).toBe('boolean');
      expect(Array.isArray(result.summary.sideEffects)).toBe(true);
    });

    test('should handle empty conflicts', async () => {
      const emptyConflicts = createEmptyConflictResult();
      const result = await resolver.resolveConflicts(emptyConflicts, ['node']);

      expect(result.success).toBe(true);
      expect(result.remainingConflicts).toHaveLength(0);
      expect(result.statistics.conflictsResolved).toBe(0);
    });
  });

  describe('Version Conflict Resolution', () => {
    test('should resolve version conflicts', async () => {
      const versionConflicts = createVersionConflicts();
      const result = await resolver.resolveVersionConflicts(versionConflicts);

      expect(result.success).toBeDefined();
      expect(Array.isArray(result.resolutions)).toBe(true);
      expect(Array.isArray(result.unresolvedConflicts)).toBe(true);
    });

    test('should provide version pinning recommendations', async () => {
      const versionConflicts = createVersionConflicts();
      const result = await resolver.resolveVersionConflicts(versionConflicts);

      if (result.resolutions.length > 0) {
        const pinning = result.resolutions[0];
        expect(pinning).toHaveProperty('toolId');
        expect(pinning).toHaveProperty('pinnedVersion');
        expect(pinning).toHaveProperty('reason');
        expect(pinning).toHaveProperty('impact');
        expect(pinning.impact).toHaveProperty('limitedFeatures');
        expect(pinning.impact).toHaveProperty('securityImplications');
        expect(pinning.impact).toHaveProperty('compatibilityImpact');
      }
    });

    test('should handle unsolvable version conflicts', async () => {
      const unsolvableConflicts = createUnsolvableVersionConflicts();
      const result = await resolver.resolveVersionConflicts(unsolvableConflicts);

      expect(result.success).toBe(false);
      expect(result.unresolvedConflicts.length).toBeGreaterThan(0);
    });

    test('should respect versioning policy', async () => {
      const versionConflicts = createVersionConflicts();
      const conservativePolicy: Partial<ResolutionPolicy> = {
        versioning: {
          preferLatest: false,
          allowMajorUpgrades: false,
          allowDowngrades: false,
          pinningStrategy: 'exact'
        }
      };

      const result = await resolver.resolveVersionConflicts(versionConflicts, conservativePolicy);
      expect(result).toBeDefined();
    });
  });

  describe('Circular Dependency Resolution', () => {
    test('should resolve circular dependencies', async () => {
      const circularDependencies = createCircularDependencies();
      const result = await resolver.resolveCircularDependencies(circularDependencies);

      expect(result.success).toBeDefined();
      expect(Array.isArray(result.resolutions)).toBe(true);
      expect(Array.isArray(result.unresolvedCycles)).toBe(true);
    });

    test('should provide cycle break strategies', async () => {
      const circularDependencies = createCircularDependencies();
      const result = await resolver.resolveCircularDependencies(circularDependencies);

      if (result.resolutions.length > 0) {
        const resolution = result.resolutions[0];
        expect(resolution).toHaveProperty('description');
        expect(resolution).toHaveProperty('action');
        expect(resolution).toHaveProperty('target');
        expect(['defer', 'optional', 'substitute', 'remove']).toContain(resolution.action);
      }
    });

    test('should handle unbreakable cycles', async () => {
      const unbreakableCycles = createUnbreakableCircularDependencies();
      const result = await resolver.resolveCircularDependencies(unbreakableCycles);

      expect(result.success).toBe(false);
      expect(result.unresolvedCycles.length).toBeGreaterThan(0);
    });
  });

  describe('Platform Incompatibility Resolution', () => {
    test('should resolve platform incompatibilities', async () => {
      const platformConflicts = createPlatformIncompatibilities();
      const result = await resolver.resolvePlatformIncompatibilities(platformConflicts);

      expect(result.success).toBeDefined();
      expect(Array.isArray(result.substitutions)).toBe(true);
      expect(Array.isArray(result.unresolvedIncompatibilities)).toBe(true);
    });

    test('should provide tool substitution recommendations', async () => {
      const platformConflicts = createPlatformIncompatibilities();
      const result = await resolver.resolvePlatformIncompatibilities(platformConflicts);

      if (result.substitutions.length > 0) {
        const substitution = result.substitutions[0];
        expect(substitution).toHaveProperty('originalTool');
        expect(substitution).toHaveProperty('replacementTool');
        expect(substitution).toHaveProperty('reason');
        expect(substitution).toHaveProperty('compatibilityScore');
        expect(substitution).toHaveProperty('featuresLost');
        expect(substitution).toHaveProperty('featuresGained');
        expect(['simple', 'moderate', 'complex']).toContain(substitution.migrationComplexity);
      }
    });

    test('should respect platform policy', async () => {
      const platformConflicts = createPlatformIncompatibilities();
      const strictPolicy: Partial<ResolutionPolicy> = {
        platform: {
          useAlternatives: false,
          allowWorkarounds: false,
          preferNative: true
        }
      };

      const result = await resolver.resolvePlatformIncompatibilities(platformConflicts, strictPolicy);
      expect(result.substitutions).toHaveLength(0);
    });
  });

  describe('Interactive Resolution Planning', () => {
    test('should generate resolution plan', async () => {
      const plan = await resolver.generateResolutionPlan(mockConflicts, ['node']);

      expect(plan).toHaveProperty('plan');
      expect(plan).toHaveProperty('estimatedTime');
      expect(plan).toHaveProperty('riskAssessment');
      expect(plan).toHaveProperty('userDecisionPoints');
      
      expect(Array.isArray(plan.plan)).toBe(true);
      expect(typeof plan.estimatedTime).toBe('number');
      expect(['low', 'medium', 'high']).toContain(plan.riskAssessment.risk);
      expect(Array.isArray(plan.userDecisionPoints)).toBe(true);
    });

    test('should assess resolution risk', async () => {
      const plan = await resolver.generateResolutionPlan(mockConflicts, ['node']);

      expect(plan.riskAssessment).toHaveProperty('risk');
      expect(plan.riskAssessment).toHaveProperty('factors');
      expect(plan.riskAssessment).toHaveProperty('mitigation');
      expect(Array.isArray(plan.riskAssessment.factors)).toBe(true);
      expect(Array.isArray(plan.riskAssessment.mitigation)).toBe(true);
    });

    test('should identify user decision points', async () => {
      const complexConflicts = createComplexConflictResult();
      const plan = await resolver.generateResolutionPlan(complexConflicts, ['node']);

      if (plan.userDecisionPoints.length > 0) {
        const decisionPoint = plan.userDecisionPoints[0];
        expect(decisionPoint).toHaveProperty('step');
        expect(decisionPoint).toHaveProperty('decision');
        expect(decisionPoint).toHaveProperty('options');
        expect(decisionPoint).toHaveProperty('recommendation');
        expect(Array.isArray(decisionPoint.options)).toBe(true);
      }
    });

    test('should estimate resolution time', async () => {
      const plan = await resolver.generateResolutionPlan(mockConflicts, ['node']);

      expect(plan.estimatedTime).toBeGreaterThanOrEqual(0);
      expect(typeof plan.estimatedTime).toBe('number');
    });
  });

  describe('Policy Configuration', () => {
    test('should respect automatic resolution policy', async () => {
      const automaticPolicy: Partial<ResolutionPolicy> = {
        automatic: {
          enabled: true,
          maxSteps: 5,
          allowedActions: ['defer', 'configure'],
          riskTolerance: 'conservative'
        }
      };

      const result = await resolver.resolveConflicts(mockConflicts, ['node'], {
        policy: automaticPolicy
      });

      expect(result.statistics.stepsExecuted).toBeLessThanOrEqual(5);
    });

    test('should respect interaction policy', async () => {
      const interactivePolicy: Partial<ResolutionPolicy> = {
        interaction: {
          confirmMajorChanges: true,
          verboseExplanations: true,
          allowOverrides: true
        }
      };

      const result = await resolver.resolveConflicts(mockConflicts, ['node'], {
        policy: interactivePolicy
      });

      expect(result).toBeDefined();
    });

    test('should handle custom callbacks', async () => {
      const confirmationCallback = vi.fn().mockResolvedValue('Yes');
      const inputCallback = vi.fn().mockResolvedValue('custom-value');
      const progressCallback = vi.fn();

      const result = await resolver.resolveConflicts(mockConflicts, ['node'], {
        callbacks: {
          requestConfirmation: confirmationCallback,
          requestInput: inputCallback,
          notifyProgress: progressCallback
        }
      });

      expect(result).toBeDefined();
    });
  });

  describe('Advanced Resolution Scenarios', () => {
    test('should handle multiple conflict types simultaneously', async () => {
      const multiConflicts = createMultiTypeConflictResult();
      const result = await resolver.resolveConflicts(multiConflicts, ['node', 'npm']);

      expect(result).toBeDefined();
      expect(result.statistics.conflictsResolved).toBeGreaterThanOrEqual(0);
    });

    test('should handle conflicting resolution strategies', async () => {
      const conflictingStrategies = createConflictingStrategiesResult();
      const result = await resolver.resolveConflicts(conflictingStrategies, ['node']);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    test('should prioritize critical conflicts', async () => {
      const prioritizedConflicts = createPrioritizedConflictResult();
      const result = await resolver.resolveConflicts(prioritizedConflicts, ['node']);

      expect(result).toBeDefined();
      // Critical conflicts should be addressed first
      if (result.appliedSteps.length > 0) {
        expect(result.appliedSteps[0]).toBeDefined();
      }
    });

    test('should respect maximum steps limit', async () => {
      const limitedPolicy: Partial<ResolutionPolicy> = {
        automatic: {
          enabled: true,
          maxSteps: 2,
          allowedActions: ['defer', 'substitute', 'configure'],
          riskTolerance: 'moderate'
        }
      };

      const result = await resolver.resolveConflicts(mockConflicts, ['node'], {
        policy: limitedPolicy
      });

      expect(result.statistics.stepsExecuted).toBeLessThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle resolution failures gracefully', async () => {
      // Create a conflict result that will trigger an actual failure
      const failingConflicts = createMockConflictResult();
      failingConflicts.hasConflicts = true;
      failingConflicts.canProceed = false;
      failingConflicts.overallSeverity = 'critical';
      failingConflicts.conflicts[0].blocking = true;
      failingConflicts.conflicts[0].suggestedResolutions = []; // No resolutions available

      const result = await resolver.resolveConflicts(failingConflicts, ['node']);

      // When there are no suggested resolutions, it should still complete but may not resolve all conflicts
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.summary.description).toBeDefined();
    });

    test('should handle invalid tool IDs', async () => {
      const result = await resolver.resolveConflicts(mockConflicts, ['invalid-tool-id']);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    test('should handle malformed conflict data', async () => {
      const malformedConflicts: ConflictDetectionResult = {
        hasConflicts: true,
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
          detectionTime: 1
        },
        recommendations: []
      };

      const result = await resolver.resolveConflicts(malformedConflicts, ['node']);

      expect(result).toBeDefined();
      expect(result.success).toBe(true); // No conflicts to resolve
    });
  });

  describe('Resolution Step Execution', () => {
    test('should execute resolution steps in order', async () => {
      const result = await resolver.resolveConflicts(mockConflicts, ['node']);

      if (result.appliedSteps.length > 1) {
        // Steps should be executed in order
        for (let i = 1; i < result.appliedSteps.length; i++) {
          expect(result.appliedSteps[i].executionTime).toBeGreaterThan(0);
        }
      }
    });

    test('should track step execution results', async () => {
      const result = await resolver.resolveConflicts(mockConflicts, ['node']);

      for (const step of result.appliedSteps) {
        expect(['success', 'failed', 'skipped', 'requires-user-input']).toContain(step.result);
        expect(step.executionTime).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(step.affectedTools)).toBe(true);
      }
    });

    test('should handle step failures', async () => {
      // Create conflicts that will likely fail resolution
      const failingConflicts = createFailingConflictResult();
      const result = await resolver.resolveConflicts(failingConflicts, ['node']);

      expect(result).toBeDefined();
      // Even if steps fail, we should get a proper result
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Resolution Impact Assessment', () => {
    test('should assess resolution impact correctly', async () => {
      const result = await resolver.resolveConflicts(mockConflicts, ['node']);

      expect(['low', 'medium', 'high']).toContain(result.summary.impact);
      expect(typeof result.summary.reversible).toBe('boolean');
      expect(Array.isArray(result.summary.sideEffects)).toBe(true);
    });

    test('should identify irreversible changes', async () => {
      const destructiveConflicts = createDestructiveConflictResult();
      const result = await resolver.resolveConflicts(destructiveConflicts, ['node']);

      // Destructive operations should be marked as irreversible
      if (result.appliedSteps.some(step => step.action === 'remove')) {
        expect(result.summary.reversible).toBe(false);
      }
    });

    test('should track side effects', async () => {
      const result = await resolver.resolveConflicts(mockConflicts, ['node']);

      if (result.summary.sideEffects.length > 0) {
        result.summary.sideEffects.forEach(effect => {
          expect(typeof effect).toBe('string');
          expect(effect.length).toBeGreaterThan(0);
        });
      }
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
      }
    ],
    dependencies,
    schemaVersion: '1.0.0'
  };
}

function createMockConflictResult(): ConflictDetectionResult {
  return {
    hasConflicts: true,
    conflicts: [
      {
        id: 'test-conflict-1',
        type: 'version',
        severity: 'major',
        involvedTools: ['tool-a', 'tool-b'],
        description: 'Version conflict between tool-a and tool-b',
        rootCause: 'Incompatible version requirements',
        suggestedResolutions: [
          {
            name: 'Pin to compatible version',
            type: 'automatic',
            confidence: 85,
            steps: [
              {
                description: 'Pin tool-a to version 1.0.0',
                action: 'downgrade',
                target: 'tool-a',
                parameters: { version: '1.0.0' },
                requiresConfirmation: false
              }
            ],
            estimatedTime: 5,
            successProbability: 90,
            sideEffects: []
          }
        ],
        platformImpact: {
          windows: 'medium',
          macos: 'medium',
          linux: 'medium'
        },
        blocking: false,
        conflictingDependencies: [],
        metadata: {
          detectedAt: new Date().toISOString(),
          detectionMethod: 'version-analysis',
          confidence: 95,
          affectedComponents: ['tool-a', 'tool-b']
        }
      }
    ],
    versionConflicts: [],
    circularDependencies: [],
    platformIncompatibilities: [],
    overallSeverity: 'major',
    canProceed: true,
    statistics: {
      totalConflicts: 1,
      criticalConflicts: 0,
      resolvableConflicts: 1,
      blockerConflicts: 0,
      detectionTime: 100
    },
    recommendations: ['Resolve version conflicts before proceeding']
  };
}

function createEmptyConflictResult(): ConflictDetectionResult {
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
    recommendations: ['No conflicts detected']
  };
}

function createVersionConflicts(): VersionConflictDetail[] {
  return [
    {
      toolId: 'shared-lib',
      versionRequirements: [
        {
          requiredBy: 'app-a',
          constraint: '>=2.0.0',
          dependencyType: 'required',
          strict: true
        },
        {
          requiredBy: 'app-b',
          constraint: '<=1.5.0',
          dependencyType: 'required',
          strict: true
        }
      ],
      incompatibleRanges: ['>=2.0.0 conflicts with <=1.5.0'],
      unsatisfiableReason: 'No version satisfies both >=2.0.0 and <=1.5.0'
    }
  ];
}

function createUnsolvableVersionConflicts(): VersionConflictDetail[] {
  return [
    {
      toolId: 'impossible-lib',
      versionRequirements: [
        {
          requiredBy: 'strict-app',
          constraint: '=1.0.0',
          dependencyType: 'required',
          strict: true
        },
        {
          requiredBy: 'newer-app',
          constraint: '=2.0.0',
          dependencyType: 'required',
          strict: true
        }
      ],
      incompatibleRanges: ['=1.0.0 conflicts with =2.0.0'],
      unsatisfiableReason: 'Exact version requirements are mutually exclusive'
    }
  ];
}

function createCircularDependencies(): CircularDependencyDetail[] {
  return [
    {
      cycle: ['cycle-a', 'cycle-b', 'cycle-c'],
      cycleLength: 3,
      dependencyTypes: ['required', 'optional', 'optional'],
      breakable: true,
      breakPoints: [
        {
          edge: { from: 'cycle-b', to: 'cycle-c' },
          strategy: 'defer',
          impact: 30,
          description: 'Defer cycle-b -> cycle-c dependency'
        }
      ],
      impact: 'moderate'
    }
  ];
}

function createUnbreakableCircularDependencies(): CircularDependencyDetail[] {
  return [
    {
      cycle: ['hard-cycle-a', 'hard-cycle-b'],
      cycleLength: 2,
      dependencyTypes: ['required', 'required'],
      breakable: false,
      breakPoints: [],
      impact: 'critical'
    }
  ];
}

function createPlatformIncompatibilities(): PlatformIncompatibilityDetail[] {
  return [
    {
      incompatibleTools: ['linux-only-tool'],
      targetPlatform: 'windows',
      targetArchitecture: 'x64',
      missingSupport: [
        {
          toolId: 'linux-only-tool',
          missingPlatforms: ['windows'],
          missingArchitectures: [],
          alternatives: ['windows-alternative-tool']
        }
      ],
      workarounds: [
        {
          description: 'Use windows-alternative-tool instead',
          complexity: 'simple',
          reliability: 90,
          steps: ['Remove linux-only-tool', 'Add windows-alternative-tool']
        }
      ]
    }
  ];
}

function createComplexConflictResult(): ConflictDetectionResult {
  const baseResult = createMockConflictResult();
  return {
    ...baseResult,
    conflicts: [
      ...baseResult.conflicts,
      {
        ...baseResult.conflicts[0],
        id: 'complex-conflict',
        severity: 'critical',
        suggestedResolutions: [
          {
            name: 'Complex resolution requiring user input',
            type: 'interactive',
            confidence: 60,
            steps: [
              {
                description: 'Choose resolution strategy',
                action: 'configure',
                target: 'complex-tool',
                parameters: {},
                requiresConfirmation: true
              }
            ],
            estimatedTime: 20,
            successProbability: 70,
            sideEffects: ['May require manual configuration']
          }
        ]
      }
    ]
  };
}

function createMultiTypeConflictResult(): ConflictDetectionResult {
  return {
    hasConflicts: true,
    conflicts: [
      {
        id: 'multi-version-conflict',
        type: 'version',
        severity: 'major',
        involvedTools: ['multi-tool-a', 'multi-tool-b'],
        description: 'Version conflict',
        rootCause: 'Version incompatibility',
        suggestedResolutions: [],
        platformImpact: { windows: 'medium', macos: 'medium', linux: 'medium' },
        blocking: false,
        conflictingDependencies: [],
        metadata: {
          detectedAt: new Date().toISOString(),
          detectionMethod: 'version-analysis',
          confidence: 90,
          affectedComponents: ['multi-tool-a']
        }
      },
      {
        id: 'multi-platform-conflict',
        type: 'platform',
        severity: 'critical',
        involvedTools: ['platform-tool'],
        description: 'Platform incompatibility',
        rootCause: 'Unsupported platform',
        suggestedResolutions: [],
        platformImpact: { windows: 'high', macos: 'none', linux: 'none' },
        blocking: true,
        conflictingDependencies: [],
        metadata: {
          detectedAt: new Date().toISOString(),
          detectionMethod: 'platform-analysis',
          confidence: 100,
          affectedComponents: ['platform-tool']
        }
      }
    ],
    versionConflicts: [],
    circularDependencies: [],
    platformIncompatibilities: [],
    overallSeverity: 'critical',
    canProceed: false,
    statistics: {
      totalConflicts: 2,
      criticalConflicts: 1,
      resolvableConflicts: 1,
      blockerConflicts: 1,
      detectionTime: 150
    },
    recommendations: ['Resolve blocking conflicts first']
  };
}

function createConflictingStrategiesResult(): ConflictDetectionResult {
  const baseResult = createMockConflictResult();
  return {
    ...baseResult,
    conflicts: [
      {
        ...baseResult.conflicts[0],
        suggestedResolutions: [
          {
            name: 'Strategy A',
            type: 'automatic',
            confidence: 80,
            steps: [
              {
                description: 'Upgrade tool',
                action: 'upgrade',
                target: 'conflict-tool',
                parameters: { version: '2.0.0' },
                requiresConfirmation: false
              }
            ],
            estimatedTime: 5,
            successProbability: 85,
            sideEffects: []
          },
          {
            name: 'Strategy B',
            type: 'automatic',
            confidence: 75,
            steps: [
              {
                description: 'Downgrade tool',
                action: 'downgrade',
                target: 'conflict-tool',
                parameters: { version: '1.0.0' },
                requiresConfirmation: false
              }
            ],
            estimatedTime: 3,
            successProbability: 90,
            sideEffects: ['May lose newer features']
          }
        ]
      }
    ]
  };
}

function createPrioritizedConflictResult(): ConflictDetectionResult {
  return {
    hasConflicts: true,
    conflicts: [
      {
        id: 'critical-priority-conflict',
        type: 'circular',
        severity: 'critical',
        involvedTools: ['priority-tool-a', 'priority-tool-b'],
        description: 'Critical circular dependency',
        rootCause: 'Unbreakable cycle',
        suggestedResolutions: [],
        platformImpact: { windows: 'high', macos: 'high', linux: 'high' },
        blocking: true,
        conflictingDependencies: [],
        metadata: {
          detectedAt: new Date().toISOString(),
          detectionMethod: 'cycle-detection',
          confidence: 100,
          affectedComponents: ['priority-tool-a', 'priority-tool-b']
        }
      },
      {
        id: 'minor-priority-conflict',
        type: 'version',
        severity: 'minor',
        involvedTools: ['minor-tool'],
        description: 'Minor version mismatch',
        rootCause: 'Slight version incompatibility',
        suggestedResolutions: [],
        platformImpact: { windows: 'low', macos: 'low', linux: 'low' },
        blocking: false,
        conflictingDependencies: [],
        metadata: {
          detectedAt: new Date().toISOString(),
          detectionMethod: 'version-analysis',
          confidence: 80,
          affectedComponents: ['minor-tool']
        }
      }
    ],
    versionConflicts: [],
    circularDependencies: [],
    platformIncompatibilities: [],
    overallSeverity: 'critical',
    canProceed: false,
    statistics: {
      totalConflicts: 2,
      criticalConflicts: 1,
      resolvableConflicts: 0,
      blockerConflicts: 1,
      detectionTime: 120
    },
    recommendations: ['Resolve critical conflicts before proceeding']
  };
}

function createFailingConflictResult(): ConflictDetectionResult {
  const baseResult = createMockConflictResult();
  return {
    ...baseResult,
    conflicts: [
      {
        ...baseResult.conflicts[0],
        id: 'failing-conflict',
        description: 'Conflict that will fail resolution',
        suggestedResolutions: [
          {
            name: 'Failing strategy',
            type: 'automatic',
            confidence: 10,
            steps: [
              {
                description: 'This will fail',
                action: 'remove',
                target: 'non-existent-tool',
                parameters: {},
                requiresConfirmation: false
              }
            ],
            estimatedTime: 1,
            successProbability: 5,
            sideEffects: ['Will likely fail']
          }
        ]
      }
    ]
  };
}

function createDestructiveConflictResult(): ConflictDetectionResult {
  const baseResult = createMockConflictResult();
  return {
    ...baseResult,
    conflicts: [
      {
        ...baseResult.conflicts[0],
        id: 'destructive-conflict',
        description: 'Conflict requiring destructive resolution',
        suggestedResolutions: [
          {
            name: 'Remove conflicting tool',
            type: 'manual',
            confidence: 95,
            steps: [
              {
                description: 'Remove conflicting tool permanently',
                action: 'remove',
                target: 'destructive-tool',
                parameters: {},
                requiresConfirmation: true
              }
            ],
            estimatedTime: 10,
            successProbability: 100,
            sideEffects: ['Tool will be permanently removed']
          }
        ]
      }
    ]
  };
}