"use strict";
/**
 * Tests for Manifest Migration Utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const manifest_migration_1 = require("../manifest-migration");
(0, globals_1.describe)('ManifestMigration', () => {
    let migration;
    (0, globals_1.beforeEach)(() => {
        migration = new manifest_migration_1.ManifestMigration();
    });
    (0, globals_1.describe)('migrateToolManifest', () => {
        (0, globals_1.it)('should convert experienceLevel array to experienceRequirement object', () => {
            const oldManifest = {
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
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.data).toBeDefined();
            (0, globals_1.expect)(result.data.experienceRequirement).toBeDefined();
            (0, globals_1.expect)(result.data.experienceRequirement.minimumLevel).toBe('beginner');
            (0, globals_1.expect)(result.data.experienceRequirement.recommendedLevel).toBe('intermediate');
            (0, globals_1.expect)(result.data.experienceRequirement.rationale).toContain('suitable for beginners');
            (0, globals_1.expect)(result.changes).toContain('Converted experienceLevel array to experienceRequirement object');
            (0, globals_1.expect)(result.warnings).toContain('experienceLevel field is deprecated and will be removed in future versions');
        });
        (0, globals_1.it)('should handle expert level by mapping to advanced', () => {
            const oldManifest = {
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
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.data.experienceRequirement.minimumLevel).toBe('intermediate');
            (0, globals_1.expect)(result.data.experienceRequirement.recommendedLevel).toBe('advanced');
        });
        (0, globals_1.it)('should generate learning resources from documentation', () => {
            const oldManifest = {
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
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.data.learningResources).toBeDefined();
            (0, globals_1.expect)(result.data.learningResources.length).toBeGreaterThan(0);
            const resources = result.data.learningResources;
            (0, globals_1.expect)(resources.some(r => r.type === 'tutorial' && r.url === 'https://example.com/quickstart')).toBe(true);
            (0, globals_1.expect)(resources.some(r => r.type === 'documentation' && r.url === 'https://example.com/docs')).toBe(true);
            (0, globals_1.expect)(resources.some(r => r.type === 'video')).toBe(true);
            (0, globals_1.expect)(result.changes).toContain('Generated default learning resources from documentation links');
        });
        (0, globals_1.it)('should generate difficulty indicators for complex tools', () => {
            const oldManifest = {
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
                configuration: new Array(15).fill({ key: 'test', name: 'Test', description: 'Test config', type: 'string' }),
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
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.data.difficultyIndicators).toBeDefined();
            (0, globals_1.expect)(result.data.difficultyIndicators.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.data.difficultyIndicators).toContain('Requires extensive configuration');
            (0, globals_1.expect)(result.data.difficultyIndicators).toContain('Has many dependencies to manage');
            (0, globals_1.expect)(result.data.difficultyIndicators).toContain('Command-line interface only');
            (0, globals_1.expect)(result.data.difficultyIndicators).toContain('Steep learning curve');
            (0, globals_1.expect)(result.changes).toContain('Generated difficulty indicators based on tool characteristics');
        });
        (0, globals_1.it)('should not modify manifest if already migrated', () => {
            const newManifest = {
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
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.data.experienceRequirement).toEqual(newManifest.experienceRequirement);
            (0, globals_1.expect)(result.data.learningResources).toEqual(newManifest.learningResources);
            (0, globals_1.expect)(result.data.difficultyIndicators).toEqual(newManifest.difficultyIndicators);
            (0, globals_1.expect)(result.changes.length).toBe(0);
        });
    });
    (0, globals_1.describe)('migrateCategoryManifest', () => {
        (0, globals_1.it)('should migrate all tools in a category', () => {
            const oldCategory = {
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
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.data.tools.length).toBe(2);
            (0, globals_1.expect)(result.data.tools[0].experienceRequirement).toBeDefined();
            (0, globals_1.expect)(result.data.tools[1].experienceRequirement).toBeDefined();
            (0, globals_1.expect)(result.changes.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.changes.some(c => c.includes('Tool 0 (tool1)'))).toBe(true);
            (0, globals_1.expect)(result.changes.some(c => c.includes('Tool 1 (tool2)'))).toBe(true);
        });
    });
    (0, globals_1.describe)('migrateMasterManifest', () => {
        (0, globals_1.it)('should migrate all category manifests', () => {
            const oldMaster = {
                metadata: {
                    name: 'Test Master',
                    version: '1.0.0',
                    description: 'Test master manifest',
                    lastUpdated: '2024-01-01T00:00:00Z',
                    schemaVersion: '1.0.0'
                },
                categories: ['frontend', 'backend'],
                categoryManifests: {
                    frontend: {
                        category: 'frontend',
                        name: 'Frontend',
                        description: 'Frontend tools',
                        tools: [{
                                id: 'react',
                                name: 'React',
                                description: 'UI library',
                                category: 'frontend',
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
                        category: 'backend',
                        name: 'Backend',
                        description: 'Backend tools',
                        tools: [{
                                id: 'nodejs',
                                name: 'Node.js',
                                description: 'JS runtime',
                                category: 'backend',
                                experienceLevel: ['beginner', 'intermediate'],
                                systemRequirements: { platforms: ['linux'], architectures: ['x64'] },
                                version: { stable: '20.0.0' },
                                installation: [],
                                schemaVersion: '1.0.0'
                            }],
                        lastUpdated: '2024-01-01T00:00:00Z',
                        schemaVersion: '1.0.0'
                    }
                }
            };
            const result = migration.migrateMasterManifest(oldMaster);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.data.categoryManifests.frontend.tools[0].experienceRequirement).toBeDefined();
            (0, globals_1.expect)(result.data.categoryManifests.backend.tools[0].experienceRequirement).toBeDefined();
            (0, globals_1.expect)(result.changes.some(c => c.includes('Category frontend'))).toBe(true);
            (0, globals_1.expect)(result.changes.some(c => c.includes('Category backend'))).toBe(true);
        });
    });
});
//# sourceMappingURL=manifest-migration.test.js.map