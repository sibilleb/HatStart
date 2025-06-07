/**
 * Tests for Manifest Migration Utility
 */

import { beforeEach, describe, expect, it } from '@jest/globals';
import { ManifestMigration } from '../manifest-migration';
import type { CategoryManifest, MasterManifest, ToolCategory, ToolManifest } from '../manifest-types';

describe('ManifestMigration', () => {
  let migration: ManifestMigration;

  beforeEach(() => {
    migration = new ManifestMigration();
  });

  describe('migrateToolManifest', () => {
    it('should convert experienceLevel array to experienceRequirement object', () => {
      const oldManifest: ToolManifest = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        category: 'frontend',
        experienceLevel: ['beginner', 'intermediate', 'advanced'],
        systemRequirements: {
          platforms: ['windows', 'macos', 'linux'],
          architectures: ['x64']
        },
        version: {
          stable: '1.0.0'
        },
        installation: [],
        schemaVersion: '1.0.0'
      };

      const result = migration.migrateToolManifest(oldManifest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.experienceRequirement).toBeDefined();
      expect(result.data!.experienceRequirement!.minimumLevel).toBe('beginner');
      expect(result.data!.experienceRequirement!.recommendedLevel).toBe('intermediate');
      expect(result.data!.experienceRequirement!.rationale).toContain('suitable for beginners');
      expect(result.changes).toContain('Converted experienceLevel array to experienceRequirement object');
      expect(result.warnings).toContain('experienceLevel field is deprecated and will be removed in future versions');
    });

    it('should handle expert level by mapping to advanced', () => {
      const oldManifest: ToolManifest = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        category: 'backend',
        experienceLevel: ['intermediate', 'advanced', 'expert'],
        systemRequirements: {
          platforms: ['linux'],
          architectures: ['x64']
        },
        version: {
          stable: '1.0.0'
        },
        installation: [],
        schemaVersion: '1.0.0'
      };

      const result = migration.migrateToolManifest(oldManifest);

      expect(result.success).toBe(true);
      expect(result.data!.experienceRequirement!.minimumLevel).toBe('intermediate');
      expect(result.data!.experienceRequirement!.recommendedLevel).toBe('advanced');
    });

    it('should generate learning resources from documentation', () => {
      const oldManifest: ToolManifest = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        category: 'frontend',
        systemRequirements: {
          platforms: ['windows'],
          architectures: ['x64']
        },
        version: {
          stable: '1.0.0'
        },
        installation: [],
        documentation: {
          officialDocs: 'https://example.com/docs',
          quickStart: 'https://example.com/quickstart',
          apiReference: 'https://example.com/api',
          tutorials: ['https://example.com/tutorial1', 'https://example.com/tutorial2'],
          videos: ['https://example.com/video1']
        },
        schemaVersion: '1.0.0'
      };

      const result = migration.migrateToolManifest(oldManifest);

      expect(result.success).toBe(true);
      expect(result.data!.learningResources).toBeDefined();
      expect(result.data!.learningResources!.length).toBeGreaterThan(0);
      
      const resources = result.data!.learningResources!;
      expect(resources.some(r => r.type === 'tutorial' && r.url === 'https://example.com/quickstart')).toBe(true);
      expect(resources.some(r => r.type === 'documentation' && r.url === 'https://example.com/docs')).toBe(true);
      expect(resources.some(r => r.type === 'video')).toBe(true);
      expect(result.changes).toContain('Generated default learning resources from documentation links');
    });

    it('should generate difficulty indicators for complex tools', () => {
      const oldManifest: ToolManifest = {
        id: 'kubernetes',
        name: 'Kubernetes',
        description: 'Container orchestration',
        category: 'devops',
        systemRequirements: {
          platforms: ['linux'],
          architectures: ['x64']
        },
        version: {
          stable: '1.0.0'
        },
        installation: [],
        configuration: new Array(15).fill({ key: 'test', name: 'Test', description: 'Test config', type: 'string' as const }),
        dependencies: [
          { toolId: 'docker', type: 'required' },
          { toolId: 'kubectl', type: 'required' },
          { toolId: 'helm', type: 'required' },
          { toolId: 'etcd', type: 'required' },
          { toolId: 'containerd', type: 'required' },
          { toolId: 'cni', type: 'required' }
        ],
        schemaVersion: '1.0.0'
      };

      const result = migration.migrateToolManifest(oldManifest);

      expect(result.success).toBe(true);
      expect(result.data!.difficultyIndicators).toBeDefined();
      expect(result.data!.difficultyIndicators!.length).toBeGreaterThan(0);
      expect(result.data!.difficultyIndicators).toContain('Requires extensive configuration');
      expect(result.data!.difficultyIndicators).toContain('Has many dependencies to manage');
      expect(result.data!.difficultyIndicators).toContain('Command-line interface only');
      expect(result.data!.difficultyIndicators).toContain('Steep learning curve');
      expect(result.changes).toContain('Generated difficulty indicators based on tool characteristics');
    });

    it('should not modify manifest if already migrated', () => {
      const newManifest: ToolManifest = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        category: 'frontend',
        experienceRequirement: {
          minimumLevel: 'intermediate',
          recommendedLevel: 'advanced',
          rationale: 'Custom rationale'
        },
        learningResources: [
          {
            title: 'Custom Resource',
            url: 'https://example.com',
            type: 'tutorial',
            experienceLevel: 'beginner'
          }
        ],
        difficultyIndicators: ['Custom indicator'],
        systemRequirements: {
          platforms: ['windows'],
          architectures: ['x64']
        },
        version: {
          stable: '1.0.0'
        },
        installation: [],
        schemaVersion: '1.0.0'
      };

      const result = migration.migrateToolManifest(newManifest);

      expect(result.success).toBe(true);
      expect(result.data!.experienceRequirement).toEqual(newManifest.experienceRequirement);
      expect(result.data!.learningResources).toEqual(newManifest.learningResources);
      expect(result.data!.difficultyIndicators).toEqual(newManifest.difficultyIndicators);
      expect(result.changes.length).toBe(0);
    });
  });

  describe('migrateCategoryManifest', () => {
    it('should migrate all tools in a category', () => {
      const oldCategory: CategoryManifest = {
        category: 'frontend',
        name: 'Frontend Development',
        description: 'Frontend tools',
        tools: [
          {
            id: 'tool1',
            name: 'Tool 1',
            description: 'First tool',
            category: 'frontend',
            experienceLevel: ['beginner'],
            systemRequirements: { platforms: ['windows'], architectures: ['x64'] },
            version: { stable: '1.0.0' },
            installation: [],
            schemaVersion: '1.0.0'
          },
          {
            id: 'tool2',
            name: 'Tool 2',
            description: 'Second tool',
            category: 'frontend',
            experienceLevel: ['intermediate', 'advanced'],
            systemRequirements: { platforms: ['macos'], architectures: ['arm64'] },
            version: { stable: '2.0.0' },
            installation: [],
            schemaVersion: '1.0.0'
          }
        ],
        lastUpdated: '2024-01-01T00:00:00Z',
        schemaVersion: '1.0.0'
      };

      const result = migration.migrateCategoryManifest(oldCategory);

      expect(result.success).toBe(true);
      expect(result.data!.tools.length).toBe(2);
      expect(result.data!.tools[0].experienceRequirement).toBeDefined();
      expect(result.data!.tools[1].experienceRequirement).toBeDefined();
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changes.some(c => c.includes('Tool 0 (tool1)'))).toBe(true);
      expect(result.changes.some(c => c.includes('Tool 1 (tool2)'))).toBe(true);
    });
  });

  describe('migrateMasterManifest', () => {
    it('should migrate all category manifests', () => {
      const oldMaster = {
        metadata: {
          name: 'Test Master',
          version: '1.0.0',
          description: 'Test master manifest',
          lastUpdated: '2024-01-01T00:00:00Z',
          schemaVersion: '1.0.0'
        },
        categories: ['frontend', 'backend'] as ToolCategory[],
        categoryManifests: {
          frontend: {
            category: 'frontend' as const,
            name: 'Frontend',
            description: 'Frontend tools',
            tools: [{
              id: 'react',
              name: 'React',
              description: 'UI library',
              category: 'frontend' as const,
              experienceLevel: ['intermediate'],
              systemRequirements: { platforms: ['windows'], architectures: ['x64'] },
              version: { stable: '18.0.0' },
              installation: [],
              schemaVersion: '1.0.0'
            }],
            lastUpdated: '2024-01-01T00:00:00Z',
            schemaVersion: '1.0.0'
          },
          backend: {
            category: 'backend' as const,
            name: 'Backend',
            description: 'Backend tools',
            tools: [{
              id: 'nodejs',
              name: 'Node.js',
              description: 'JS runtime',
              category: 'backend' as const,
              experienceLevel: ['beginner', 'intermediate'],
              systemRequirements: { platforms: ['linux'], architectures: ['x64'] },
              version: { stable: '20.0.0' },
              installation: [],
              schemaVersion: '1.0.0'
            }],
            lastUpdated: '2024-01-01T00:00:00Z',
            schemaVersion: '1.0.0'
          }
        } as Partial<Record<ToolCategory, CategoryManifest>>
      } as MasterManifest;

      const result = migration.migrateMasterManifest(oldMaster);

      expect(result.success).toBe(true);
      expect(result.data!.categoryManifests.frontend.tools[0].experienceRequirement).toBeDefined();
      expect(result.data!.categoryManifests.backend.tools[0].experienceRequirement).toBeDefined();
      expect(result.changes.some(c => c.includes('Category frontend'))).toBe(true);
      expect(result.changes.some(c => c.includes('Category backend'))).toBe(true);
    });
  });
}); 