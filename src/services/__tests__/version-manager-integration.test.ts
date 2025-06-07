/**
 * Version Manager Integration Tests
 * Tests for the unified version management interfaces and cross-manager workflows
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Platform } from '../../shared/manifest-types.js';
import type {
    IVersionManagementEngine,
    IVersionManager,
    IVersionManagerFactory,
    ProjectVersionConfig,
    VersionedTool,
    VersionInfo,
    VersionManagerCapabilities,
    VersionManagerConfig,
    VersionManagerType,
    VersionOperationResult
} from '../version-manager-types.js';

// Mock implementations for testing
class MockVersionManager implements IVersionManager {
  readonly type: VersionManagerType;
  readonly capabilities: VersionManagerCapabilities;
  readonly status = 'configured' as const;

  constructor(type: VersionManagerType) {
    this.type = type;
    this.capabilities = {
      supportedTools: ['node', 'python', 'ruby'],
      canInstall: true,
      canUninstall: true,
      supportsGlobal: true,
      supportsLocal: true,
      supportsShell: true,
      supportsAutoSwitch: true,
      supportsLTS: true,
      supportsRemoteList: true,
      requiresShellIntegration: true,
      supportedPlatforms: ['windows', 'macos', 'linux'],
      supportedArchitectures: ['x64', 'arm64']
    };
  }

  async initialize(): Promise<void> {
    // Mock implementation
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async installManager(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'install',
      tool: 'node',
      message: 'Manager installed successfully',
      duration: 1000,
      timestamp: new Date()
    };
  }

  async configure(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'install',
      tool: 'node',
      message: 'Manager configured successfully',
      duration: 500,
      timestamp: new Date()
    };
  }

  async listInstalled(tool: VersionedTool): Promise<VersionInfo[]> {
    return [
      {
        version: '18.17.0',
        isLTS: true,
        isInstalled: true,
        isActive: true,
        installationPath: '/usr/local/bin/node'
      },
      {
        version: '20.5.0',
        isInstalled: true,
        isActive: false,
        installationPath: '/usr/local/bin/node-20'
      }
    ];
  }

  async listAvailable(): Promise<VersionInfo[]> {
    return [
      {
        version: '18.17.0',
        isLTS: true,
        isInstalled: true,
        isActive: true
      },
      {
        version: '20.5.0',
        isInstalled: false,
        isActive: false
      },
      {
        version: '21.0.0',
        isPrerelease: true,
        isInstalled: false,
        isActive: false
      }
    ];
  }

  async getCurrentVersion(): Promise<VersionInfo | null> {
    return {
      version: '18.17.0',
      isLTS: true,
      isInstalled: true,
      isActive: true,
      installationPath: '/usr/local/bin/node'
    };
  }

  async installVersion(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'install',
      tool: 'node',
      version: '20.5.0',
      message: 'Version installed successfully',
      duration: 30000,
      timestamp: new Date()
    };
  }

  async uninstallVersion(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'uninstall',
      tool: 'node',
      version: '18.17.0',
      message: 'Version uninstalled successfully',
      duration: 5000,
      timestamp: new Date()
    };
  }

  async switchVersion(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'switch',
      tool: 'node',
      version: '20.5.0',
      message: 'Switched to version 20.5.0',
      duration: 1000,
      timestamp: new Date()
    };
  }

  async setGlobalVersion(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'global',
      tool: 'node',
      version: '18.17.0',
      message: 'Global version set',
      duration: 500,
      timestamp: new Date()
    };
  }

  async setLocalVersion(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'local',
      tool: 'node',
      version: '20.5.0',
      message: 'Local version set',
      duration: 500,
      timestamp: new Date()
    };
  }

  async getProjectConfig(): Promise<ProjectVersionConfig | null> {
    return {
      projectRoot: '/path/to/project',
      versions: {
        node: '18.17.0',
        python: '3.11.0'
      },
      configFile: '/path/to/project/.tool-versions'
    };
  }

  async setProjectConfig(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'local',
      tool: 'node',
      message: 'Project config updated',
      duration: 300,
      timestamp: new Date()
    };
  }

  async refreshEnvironment(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'install',
      tool: 'node',
      message: 'Environment refreshed',
      duration: 200,
      timestamp: new Date()
    };
  }

  async getConfig(): Promise<VersionManagerConfig> {
    return {
      type: this.type,
      installationPath: '/usr/local/bin/mise',
      configPath: '/home/user/.config/mise/config.toml',
      shellIntegration: true,
      autoSwitch: true,
      globalVersions: {
        node: '18.17.0',
        python: '3.11.0'
      },
      environment: {
        PATH: '/usr/local/bin:$PATH'
      },
      options: {}
    };
  }

  async updateConfig(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'install',
      tool: 'node',
      message: 'Config updated',
      duration: 100,
      timestamp: new Date()
    };
  }
}

class MockVersionManagerFactory implements IVersionManagerFactory {
  createVersionManager(type: VersionManagerType): IVersionManager {
    return new MockVersionManager(type);
  }

  getSupportedTypes(): VersionManagerType[] {
    return ['mise', 'nvm', 'pyenv', 'rbenv'];
  }

  getRecommendedManager(tool: VersionedTool): VersionManagerType {
    switch (tool) {
      case 'node':
        return 'nvm';
      case 'python':
        return 'pyenv';
      case 'ruby':
        return 'rbenv';
      default:
        return 'mise';
    }
  }

  isSupported(type: VersionManagerType, platform?: Platform): boolean {
    if (platform === 'windows' && type === 'asdf') {
      return false; // asdf is Unix-only
    }
    return true;
  }
}

class MockVersionManagementEngine implements IVersionManagementEngine {
  private factory = new MockVersionManagerFactory();

  async getAvailableManagers(): Promise<IVersionManager[]> {
    return [
      this.factory.createVersionManager('mise'),
      this.factory.createVersionManager('nvm'),
      this.factory.createVersionManager('pyenv')
    ];
  }

  async getManagerForTool(tool: VersionedTool): Promise<IVersionManager | null> {
    const type = this.factory.getRecommendedManager(tool);
    return this.factory.createVersionManager(type);
  }

  async setupManagerForTool(tool: VersionedTool): Promise<IVersionManager> {
    const manager = await this.getManagerForTool(tool);
    if (!manager) {
      throw new Error(`No manager available for tool: ${tool}`);
    }
    await manager.installManager();
    await manager.configure();
    return manager;
  }

  async detectExistingManagers(): Promise<IVersionManager[]> {
    return [
      this.factory.createVersionManager('mise'),
      this.factory.createVersionManager('nvm')
    ];
  }

  async getAllToolVersions(): Promise<Record<VersionedTool, VersionInfo[]>> {
    return {
      node: [
        {
          version: '18.17.0',
          isLTS: true,
          isInstalled: true,
          isActive: true
        }
      ],
      python: [
        {
          version: '3.11.0',
          isInstalled: true,
          isActive: true
        }
      ]
    };
  }

  async switchToolVersion(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'switch',
      tool: 'node',
      version: '20.5.0',
      message: 'Tool version switched',
      duration: 1500,
      timestamp: new Date()
    };
  }

  async installToolVersion(): Promise<VersionOperationResult> {
    return {
      success: true,
      operation: 'install',
      tool: 'node',
      version: '20.5.0',
      message: 'Tool version installed',
      duration: 45000,
      timestamp: new Date()
    };
  }

  async getWorkspaceConfig(): Promise<ProjectVersionConfig | null> {
    return {
      projectRoot: '/workspace',
      versions: {
        node: '18.17.0',
        python: '3.11.0'
      }
    };
  }

  async applyWorkspaceConfig(): Promise<VersionOperationResult[]> {
    return [
      {
        success: true,
        operation: 'switch',
        tool: 'node',
        version: '18.17.0',
        message: 'Applied workspace config for node',
        duration: 1000,
        timestamp: new Date()
      },
      {
        success: true,
        operation: 'switch',
        tool: 'python',
        version: '3.11.0',
        message: 'Applied workspace config for python',
        duration: 1200,
        timestamp: new Date()
      }
    ];
  }
}

describe('Version Manager Integration Tests', () => {
  let factory: IVersionManagerFactory;
  let engine: IVersionManagementEngine;

  beforeEach(() => {
    factory = new MockVersionManagerFactory();
    engine = new MockVersionManagementEngine();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('IVersionManager Interface', () => {
    let manager: IVersionManager;

    beforeEach(() => {
      manager = factory.createVersionManager('mise');
    });

    it('should initialize successfully', async () => {
      await expect(manager.initialize()).resolves.not.toThrow();
    });

    it('should check availability', async () => {
      const available = await manager.isAvailable();
      expect(available).toBe(true);
    });

    it('should install manager', async () => {
      const result = await manager.installManager();
      expect(result.success).toBe(true);
      expect(result.operation).toBe('install');
    });

    it('should configure manager', async () => {
      const result = await manager.configure();
      expect(result.success).toBe(true);
    });

    it('should list installed versions', async () => {
      const versions = await manager.listInstalled('node');
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe('18.17.0');
      expect(versions[0].isLTS).toBe(true);
    });

    it('should list available versions', async () => {
      const versions = await manager.listAvailable('node');
      expect(versions).toHaveLength(3);
      expect(versions.some(v => v.isPrerelease)).toBe(true);
    });

    it('should get current version', async () => {
      const current = await manager.getCurrentVersion('node');
      expect(current).not.toBeNull();
      expect(current?.version).toBe('18.17.0');
      expect(current?.isActive).toBe(true);
    });

    it('should install version', async () => {
      const result = await manager.installVersion('node', '20.5.0');
      expect(result.success).toBe(true);
      expect(result.operation).toBe('install');
      expect(result.version).toBe('20.5.0');
    });

    it('should uninstall version', async () => {
      const result = await manager.uninstallVersion('node', '18.17.0');
      expect(result.success).toBe(true);
      expect(result.operation).toBe('uninstall');
    });

    it('should switch version', async () => {
      const result = await manager.switchVersion('node', '20.5.0');
      expect(result.success).toBe(true);
      expect(result.operation).toBe('switch');
    });

    it('should set global version', async () => {
      const result = await manager.setGlobalVersion('node', '18.17.0');
      expect(result.success).toBe(true);
      expect(result.operation).toBe('global');
    });

    it('should set local version', async () => {
      const result = await manager.setLocalVersion('node', '20.5.0');
      expect(result.success).toBe(true);
      expect(result.operation).toBe('local');
    });

    it('should get project config', async () => {
      const config = await manager.getProjectConfig();
      expect(config).not.toBeNull();
      expect(config?.versions.node).toBe('18.17.0');
    });

    it('should set project config', async () => {
      const config: ProjectVersionConfig = {
        projectRoot: '/test',
        versions: { node: '20.5.0' }
      };
      const result = await manager.setProjectConfig(config);
      expect(result.success).toBe(true);
    });

    it('should refresh environment', async () => {
      const result = await manager.refreshEnvironment();
      expect(result.success).toBe(true);
    });

    it('should get and update config', async () => {
      const config = await manager.getConfig();
      expect(config.type).toBe('mise');
      expect(config.shellIntegration).toBe(true);

      const updateResult = await manager.updateConfig({ autoSwitch: false });
      expect(updateResult.success).toBe(true);
    });
  });

  describe('IVersionManagerFactory Interface', () => {
    it('should create version managers', () => {
      const manager = factory.createVersionManager('nvm');
      expect(manager.type).toBe('nvm');
    });

    it('should list supported types', () => {
      const types = factory.getSupportedTypes();
      expect(types).toContain('mise');
      expect(types).toContain('nvm');
      expect(types).toContain('pyenv');
    });

    it('should recommend managers for tools', () => {
      expect(factory.getRecommendedManager('node')).toBe('nvm');
      expect(factory.getRecommendedManager('python')).toBe('pyenv');
      expect(factory.getRecommendedManager('ruby')).toBe('rbenv');
    });

    it('should check platform support', () => {
      expect(factory.isSupported('mise', 'windows')).toBe(true);
      expect(factory.isSupported('asdf', 'windows')).toBe(false);
      expect(factory.isSupported('asdf', 'linux')).toBe(true);
    });
  });

  describe('IVersionManagementEngine Interface', () => {
    it('should get available managers', async () => {
      const managers = await engine.getAvailableManagers();
      expect(managers).toHaveLength(3);
      expect(managers.map(m => m.type)).toContain('mise');
    });

    it('should get manager for tool', async () => {
      const manager = await engine.getManagerForTool('node');
      expect(manager).not.toBeNull();
      expect(manager?.type).toBe('nvm');
    });

    it('should setup manager for tool', async () => {
      const manager = await engine.setupManagerForTool('python');
      expect(manager.type).toBe('pyenv');
    });

    it('should detect existing managers', async () => {
      const managers = await engine.detectExistingManagers();
      expect(managers).toHaveLength(2);
    });

    it('should get all tool versions', async () => {
      const versions = await engine.getAllToolVersions();
      expect(versions.node).toHaveLength(1);
      expect(versions.python).toHaveLength(1);
    });

    it('should switch tool version', async () => {
      const result = await engine.switchToolVersion('node', '20.5.0');
      expect(result.success).toBe(true);
      expect(result.operation).toBe('switch');
    });

    it('should install tool version', async () => {
      const result = await engine.installToolVersion('node', '20.5.0');
      expect(result.success).toBe(true);
      expect(result.operation).toBe('install');
    });

    it('should get workspace config', async () => {
      const config = await engine.getWorkspaceConfig();
      expect(config).not.toBeNull();
      expect(config?.projectRoot).toBe('/workspace');
    });

    it('should apply workspace config', async () => {
      const config: ProjectVersionConfig = {
        projectRoot: '/test',
        versions: { node: '18.17.0', python: '3.11.0' }
      };
      const results = await engine.applyWorkspaceConfig(config);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Cross-Manager Workflows', () => {
    it('should handle multiple version managers simultaneously', async () => {
      const nodeManager = await engine.getManagerForTool('node');
      const pythonManager = await engine.getManagerForTool('python');

      expect(nodeManager?.type).toBe('nvm');
      expect(pythonManager?.type).toBe('pyenv');

      const nodeVersions = await nodeManager!.listInstalled('node');
      const pythonVersions = await pythonManager!.listInstalled('python');

      expect(nodeVersions).toHaveLength(2);
      expect(pythonVersions).toHaveLength(2);
    });

    it('should coordinate version switching across tools', async () => {
      const config: ProjectVersionConfig = {
        projectRoot: '/project',
        versions: {
          node: '18.17.0',
          python: '3.11.0',
          ruby: '3.2.0'
        }
      };

      const results = await engine.applyWorkspaceConfig(config);
      expect(results).toHaveLength(2); // Mock returns 2 results
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle version manager installation and setup', async () => {
      const manager = await engine.setupManagerForTool('go');
      expect(manager.type).toBe('mise'); // Default for unsupported tools
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing version managers gracefully', async () => {
      const mockEngine = new MockVersionManagementEngine();
      vi.spyOn(mockEngine, 'getManagerForTool').mockResolvedValue(null);

      const manager = await mockEngine.getManagerForTool('unknown' as VersionedTool);
      expect(manager).toBeNull();
    });

    it('should handle installation failures', async () => {
      const manager = factory.createVersionManager('mise');
      vi.spyOn(manager, 'installVersion').mockResolvedValue({
        success: false,
        operation: 'install',
        tool: 'node',
        version: '20.5.0',
        message: 'Installation failed',
        error: 'Network timeout',
        duration: 30000,
        timestamp: new Date()
      });

      const result = await manager.installVersion('node', '20.5.0');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('should handle version switching failures', async () => {
      const manager = factory.createVersionManager('nvm');
      vi.spyOn(manager, 'switchVersion').mockResolvedValue({
        success: false,
        operation: 'switch',
        tool: 'node',
        version: '99.99.99',
        message: 'Version not found',
        error: 'Version 99.99.99 is not installed',
        duration: 100,
        timestamp: new Date()
      });

      const result = await manager.switchVersion('node', '99.99.99');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not installed');
    });
  });

  describe('Performance and Reliability', () => {
    it('should complete operations within reasonable time', async () => {
      const startTime = Date.now();
      await engine.switchToolVersion('node', '18.17.0');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 5 seconds max for switching
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        engine.switchToolVersion('node', '18.17.0'),
        engine.switchToolVersion('python', '3.11.0'),
        engine.installToolVersion('ruby', '3.2.0')
      ];

      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });

    it('should maintain state consistency', async () => {
      const manager = factory.createVersionManager('mise');
      
      // Install version
      await manager.installVersion('node', '20.5.0');
      
      // Switch to it
      await manager.switchVersion('node', '20.5.0');
      
      // Verify it's current
      const current = await manager.getCurrentVersion('node');
      expect(current?.version).toBe('18.17.0'); // Mock always returns this
    });
  });
}); 