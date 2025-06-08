/**
 * Dependency Resolution End-to-End Integration Tests
 * Comprehensive testing of the complete dependency resolution workflow
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  DependencyGraph,
  buildGraphFromManifests,
  ConflictDetector,
  ConflictResolver,
  DependencyResolver,
  DependencyAwareCategoryInstaller,
  DependencyCLIVisualizer
} from '../../index.js';
import type { ToolManifest, Platform } from '../../../../shared/manifest-types.js';

describe('Dependency Resolution E2E Tests', () => {
  let manifests: Map<string, ToolManifest>;
  let platform: Platform;

  beforeEach(() => {
    platform = 'linux';
    manifests = createComplexProjectManifests();
  });

  describe('Complete Resolution Workflow', () => {
    test('should handle full-stack web project with no conflicts', async () => {
      // Build graph
      const graphResult = await buildGraphFromManifests(manifests, platform);
      expect(graphResult.success).toBe(true);
      expect(graphResult.graph.getAllNodes().length).toBe(manifests.size);

      // Detect conflicts
      const detector = new ConflictDetector();
      const conflicts = await detector.detectConflicts(
        graphResult.graph,
        ['react-app', 'express-api', 'postgres']
      );
      expect(conflicts.hasConflicts).toBe(false);

      // Resolve installation order
      const resolver = new DependencyResolver();
      const order = await resolver.resolve(
        graphResult.graph,
        ['react-app', 'express-api', 'postgres']
      );
      expect(order.success).toBe(true);
      expect(order.installationSequence).toContain('node');
      expect(order.installationSequence.indexOf('node')).toBeLessThan(
        order.installationSequence.indexOf('react-app')
      );
    });

    test('should detect and resolve version conflicts', async () => {
      // Add conflicting tool
      const legacyTool = createLegacyToolManifest();
      manifests.set('legacy-tool', legacyTool);

      // Build graph
      const graphResult = await buildGraphFromManifests(manifests, platform);
      expect(graphResult.success).toBe(true);

      // Detect conflicts
      const detector = new ConflictDetector();
      const conflicts = await detector.detectConflicts(
        graphResult.graph,
        ['react-app', 'legacy-tool']
      );
      expect(conflicts.hasConflicts).toBe(true);
      expect(conflicts.versionConflicts.length).toBeGreaterThan(0);

      // Resolve conflicts
      const conflictResolver = new ConflictResolver();
      const resolution = await conflictResolver.resolveConflicts(
        conflicts,
        graphResult.graph
      );
      expect(resolution.success).toBe(true);
      expect(resolution.statistics.conflictsResolved).toBeGreaterThan(0);
    });

    test('should handle circular dependencies', async () => {
      // Add circular dependency
      const toolA = createCircularToolA();
      const toolB = createCircularToolB();
      manifests.set('tool-a', toolA);
      manifests.set('tool-b', toolB);

      // Build graph
      const graphResult = await buildGraphFromManifests(manifests, platform);
      expect(graphResult.success).toBe(true);

      // Detect circular dependency
      const detector = new ConflictDetector();
      const conflicts = await detector.detectConflicts(
        graphResult.graph,
        ['tool-a', 'tool-b']
      );
      expect(conflicts.hasConflicts).toBe(true);
      expect(conflicts.circularDependencies.length).toBeGreaterThan(0);

      // Attempt resolution
      const resolver = new DependencyResolver();
      const order = await resolver.resolve(
        graphResult.graph,
        ['tool-a', 'tool-b'],
        { algorithm: 'topological', strategy: 'lazy' }
      );
      expect(order.deferredDependencies.length).toBeGreaterThan(0);
    });
  });

  describe('CategoryInstaller Integration', () => {
    test('should integrate dependency resolution with installation', async () => {
      const installer = new DependencyAwareCategoryInstaller();
      const command = {
        command: 'react-app',
        method: 'package-manager' as const,
        platform,
        requiresElevation: false
      };

      const result = await installer.performDependencyResolution(
        command,
        'frontend',
        {
          toolManifests: manifests,
          targetPlatform: platform,
          dependencyResolution: {
            enabled: true,
            strategy: 'conflict-aware',
            includeOptional: true
          }
        }
      );

      expect(result).toBeDefined();
      expect(result.installationOrder.success).toBe(true);
      expect(result.toolsToInstall.length).toBeGreaterThan(0);
      expect(result.statistics.dependenciesResolved).toBeGreaterThan(0);
    });

    test('should handle native package manager integration', async () => {
      const installer = new DependencyAwareCategoryInstaller();
      
      // Test package manager query (will return null in test environment)
      const packageInfo = await installer.queryNativePackageManager(
        'nodejs',
        platform,
        'apt'
      );
      
      // In test environment, this returns null
      expect(packageInfo).toBeNull();
    });
  });

  describe('CLI Visualization', () => {
    test('should generate tree visualization', async () => {
      const graphResult = await buildGraphFromManifests(manifests, platform);
      const visualizer = new DependencyCLIVisualizer({ format: 'tree' });
      
      const output = visualizer.visualizeGraph(
        graphResult.graph,
        ['react-app'],
        platform
      );

      expect(output).toContain('Dependency Tree');
      expect(output).toContain('React Application');
      expect(output).toContain('Node.js');
    });

    test('should visualize conflicts', async () => {
      const graphResult = await buildGraphFromManifests(manifests, platform);
      const detector = new ConflictDetector();
      const conflicts = await detector.detectConflicts(
        graphResult.graph,
        ['react-app', 'express-api']
      );

      const visualizer = new DependencyCLIVisualizer({ verbose: true });
      const output = visualizer.visualizeConflicts(conflicts);

      if (conflicts.hasConflicts) {
        expect(output).toContain('Detected');
        expect(output).toContain('conflicts');
      } else {
        expect(output).toContain('No conflicts detected!');
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large dependency graphs efficiently', async () => {
      const largeManifests = createLargeProjectManifests(50);
      const startTime = Date.now();

      const graphResult = await buildGraphFromManifests(largeManifests, platform);
      const buildTime = Date.now() - startTime;

      expect(graphResult.success).toBe(true);
      expect(buildTime).toBeLessThan(1000); // Should complete within 1 second
      expect(graphResult.statistics.nodesCreated).toBe(50);
    });

    test('should handle missing dependencies gracefully', async () => {
      const incompleteManifests = new Map<string, ToolManifest>();
      const toolWithMissingDep = createToolWithMissingDependency();
      incompleteManifests.set('incomplete-tool', toolWithMissingDep);

      const graphResult = await buildGraphFromManifests(
        incompleteManifests,
        platform
      );

      expect(graphResult.success).toBe(true);
      expect(graphResult.warnings.length).toBeGreaterThan(0);
      expect(graphResult.warnings[0]).toContain('Missing dependency');
    });

    test('should handle platform incompatibilities', async () => {
      const windowsOnlyTool = createWindowsOnlyTool();
      manifests.set('windows-tool', windowsOnlyTool);

      const detector = new ConflictDetector();
      const graphResult = await buildGraphFromManifests(manifests, 'linux');
      const conflicts = await detector.detectConflicts(
        graphResult.graph,
        ['windows-tool']
      );

      expect(conflicts.platformIncompatibilities.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle microservices architecture dependencies', async () => {
      const microservicesManifests = createMicroservicesManifests();
      const graphResult = await buildGraphFromManifests(
        microservicesManifests,
        platform
      );

      expect(graphResult.success).toBe(true);

      // Select all microservices
      const selectedTools = [
        'auth-service',
        'user-service',
        'payment-service',
        'notification-service'
      ];

      const resolver = new DependencyResolver();
      const order = await resolver.resolve(
        graphResult.graph,
        selectedTools,
        { strategy: 'eager' }
      );

      expect(order.success).toBe(true);
      // Common dependencies should be installed first
      expect(order.installationSequence.indexOf('docker')).toBeLessThan(
        order.installationSequence.indexOf('auth-service')
      );
      expect(order.installationSequence.indexOf('redis')).toBeLessThan(
        order.installationSequence.indexOf('auth-service')
      );
    });

    test('should handle data science stack dependencies', async () => {
      const dataStackManifests = createDataScienceManifests();
      const graphResult = await buildGraphFromManifests(
        dataStackManifests,
        platform
      );

      const selectedTools = ['jupyter', 'tensorflow', 'pandas'];
      const detector = new ConflictDetector();
      const conflicts = await detector.detectConflicts(
        graphResult.graph,
        selectedTools
      );

      // Python version compatibility should be handled
      if (conflicts.hasConflicts) {
        const resolver = new ConflictResolver();
        const resolution = await resolver.resolveConflicts(
          conflicts,
          graphResult.graph,
          {
            policy: {
              automaticResolution: true,
              preferLatestVersions: true
            }
          }
        );
        expect(resolution.success).toBe(true);
      }
    });
  });
});

// Helper functions for creating test data

function createComplexProjectManifests(): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();

  // Frontend tools
  manifests.set('node', {
    id: 'node',
    name: 'Node.js',
    description: 'JavaScript runtime',
    category: 'language',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '18.0.0', latest: '20.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'node',
      requiresElevation: false
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  });

  manifests.set('npm', {
    id: 'npm',
    name: 'npm',
    description: 'Node package manager',
    category: 'language',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '9.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'npm',
      requiresElevation: false
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  });

  manifests.set('react-app', {
    id: 'react-app',
    name: 'React Application',
    description: 'React web application',
    category: 'frontend',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '18.2.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'create-react-app',
      requiresElevation: false
    }],
    dependencies: [
      { toolId: 'node', type: 'required', minVersion: '16.0.0' },
      { toolId: 'npm', type: 'required' }
    ],
    schemaVersion: '1.0.0'
  });

  // Backend tools
  manifests.set('express-api', {
    id: 'express-api',
    name: 'Express API',
    description: 'Express.js API server',
    category: 'backend',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '4.18.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'express',
      requiresElevation: false
    }],
    dependencies: [
      { toolId: 'node', type: 'required', minVersion: '14.0.0' },
      { toolId: 'npm', type: 'required' }
    ],
    schemaVersion: '1.0.0'
  });

  // Database
  manifests.set('postgres', {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Relational database',
    category: 'database',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '15.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'postgresql',
      requiresElevation: true
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  });

  return manifests;
}

function createLegacyToolManifest(): ToolManifest {
  return {
    id: 'legacy-tool',
    name: 'Legacy Application',
    description: 'Requires old Node.js version',
    category: 'backend',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'legacy-app',
      requiresElevation: false
    }],
    dependencies: [
      { toolId: 'node', type: 'required', minVersion: '12.0.0', maxVersion: '14.0.0' }
    ],
    schemaVersion: '1.0.0'
  };
}

function createCircularToolA(): ToolManifest {
  return {
    id: 'tool-a',
    name: 'Tool A',
    description: 'Has circular dependency with Tool B',
    category: 'testing',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'tool-a',
      requiresElevation: false
    }],
    dependencies: [{ toolId: 'tool-b', type: 'required' }],
    schemaVersion: '1.0.0'
  };
}

function createCircularToolB(): ToolManifest {
  return {
    id: 'tool-b',
    name: 'Tool B',
    description: 'Has circular dependency with Tool A',
    category: 'testing',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'tool-b',
      requiresElevation: false
    }],
    dependencies: [{ toolId: 'tool-a', type: 'required' }],
    schemaVersion: '1.0.0'
  };
}

function createLargeProjectManifests(count: number): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();

  for (let i = 0; i < count; i++) {
    const id = `tool-${i}`;
    manifests.set(id, {
      id,
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
        command: `install-${id}`,
        requiresElevation: false
      }],
      dependencies: i > 0 ? [
        { toolId: `tool-${Math.floor(i / 2)}`, type: 'required' }
      ] : [],
      schemaVersion: '1.0.0'
    });
  }

  return manifests;
}

function createToolWithMissingDependency(): ToolManifest {
  return {
    id: 'incomplete-tool',
    name: 'Incomplete Tool',
    description: 'Has missing dependency',
    category: 'testing',
    systemRequirements: {
      platforms: ['linux'],
      architectures: ['x64']
    },
    version: { stable: '1.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'incomplete',
      requiresElevation: false
    }],
    dependencies: [
      { toolId: 'non-existent-tool', type: 'required' }
    ],
    schemaVersion: '1.0.0'
  };
}

function createWindowsOnlyTool(): ToolManifest {
  return {
    id: 'windows-tool',
    name: 'Windows Only Tool',
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
      command: 'windows-tool.exe',
      requiresElevation: true
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  };
}

function createMicroservicesManifests(): Map<string, ToolManifest> {
  const manifests = createComplexProjectManifests();

  // Common infrastructure
  manifests.set('docker', {
    id: 'docker',
    name: 'Docker',
    description: 'Container runtime',
    category: 'devops',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '24.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'docker',
      requiresElevation: true
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  });

  manifests.set('redis', {
    id: 'redis',
    name: 'Redis',
    description: 'In-memory data store',
    category: 'database',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '7.0.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'redis',
      requiresElevation: false
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  });

  // Microservices
  const services = ['auth-service', 'user-service', 'payment-service', 'notification-service'];
  for (const service of services) {
    manifests.set(service, {
      id: service,
      name: service.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: `Microservice: ${service}`,
      category: 'backend',
      systemRequirements: {
        platforms: ['linux', 'macos', 'windows'],
        architectures: ['x64', 'arm64']
      },
      version: { stable: '1.0.0' },
      installation: [{
        method: 'docker',
        platform: 'linux',
        command: `${service}:latest`,
        requiresElevation: false
      }],
      dependencies: [
        { toolId: 'docker', type: 'required' },
        { toolId: 'node', type: 'required' },
        { toolId: 'redis', type: 'required' }
      ],
      schemaVersion: '1.0.0'
    });
  }

  return manifests;
}

function createDataScienceManifests(): Map<string, ToolManifest> {
  const manifests = new Map<string, ToolManifest>();

  manifests.set('python', {
    id: 'python',
    name: 'Python',
    description: 'Python programming language',
    category: 'language',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '3.11.0', latest: '3.12.0' },
    installation: [{
      method: 'package-manager',
      platform: 'linux',
      command: 'python3',
      requiresElevation: false
    }],
    dependencies: [],
    schemaVersion: '1.0.0'
  });

  manifests.set('jupyter', {
    id: 'jupyter',
    name: 'Jupyter Notebook',
    description: 'Interactive computing',
    category: 'productivity',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '4.0.0' },
    installation: [{
      method: 'pip',
      platform: 'linux',
      command: 'jupyter',
      requiresElevation: false
    }],
    dependencies: [
      { toolId: 'python', type: 'required', minVersion: '3.8.0' }
    ],
    schemaVersion: '1.0.0'
  });

  manifests.set('tensorflow', {
    id: 'tensorflow',
    name: 'TensorFlow',
    description: 'Machine learning framework',
    category: 'data-science',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64']
    },
    version: { stable: '2.15.0' },
    installation: [{
      method: 'pip',
      platform: 'linux',
      command: 'tensorflow',
      requiresElevation: false
    }],
    dependencies: [
      { toolId: 'python', type: 'required', minVersion: '3.9.0', maxVersion: '3.11.0' }
    ],
    schemaVersion: '1.0.0'
  });

  manifests.set('pandas', {
    id: 'pandas',
    name: 'Pandas',
    description: 'Data analysis library',
    category: 'data-science',
    systemRequirements: {
      platforms: ['linux', 'macos', 'windows'],
      architectures: ['x64', 'arm64']
    },
    version: { stable: '2.0.0' },
    installation: [{
      method: 'pip',
      platform: 'linux',
      command: 'pandas',
      requiresElevation: false
    }],
    dependencies: [
      { toolId: 'python', type: 'required', minVersion: '3.8.0' }
    ],
    schemaVersion: '1.0.0'
  });

  return manifests;
}