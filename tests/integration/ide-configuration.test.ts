/**
 * Integration Tests for IDE Configuration System
 * Tests configuration validation and extension management
 */

import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigurationValidator } from '../../src/services/ide-configuration/configuration-validator.js';
import { ExtensionManager } from '../../src/services/ide-configuration/extension-manager.js';

import type {
    IDEConfigurationProfile,
    IDEExtension,
    IDEType
} from '../../src/services/ide-configuration/types.js';

import { IS_MACOS, IS_WINDOWS } from '../utils/test-helpers.js';

// Mock child_process before importing other modules
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    exec: vi.fn(),
  };
});

describe('IDE Configuration System Integration', () => {
  let tempDir: string;
  let configValidator: ConfigurationValidator;
  let extensionManager: ExtensionManager;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = join(tmpdir(), `hatstart-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Initialize components
    configValidator = new ConfigurationValidator();
    extensionManager = new ExtensionManager('vscode', 'code');

    // Mock console to reduce test noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Restore mocks
    vi.restoreAllMocks();
  });

  describe('Configuration Validation Integration', () => {
    it('should validate complete IDE configuration profiles', async () => {
      const testProfile: IDEConfigurationProfile = {
        name: 'Test Development Profile',
        description: 'Test profile for integration testing',
        ideType: 'vscode',
        extensions: [
          {
            id: 'ms-python.python',
            name: 'Python',
            publisher: 'ms-python',
            version: '2023.10.0',
            description: 'Python language support',
            required: true,
            platforms: ['windows', 'macos', 'linux']
          }
        ],
        workspaceSettings: {
          editor: {
            fontSize: 14,
            tabSize: 2
          },
          extensions: {
            'python.defaultInterpreterPath': '/usr/bin/python3'
          }
        },
        tasks: [],
        snippets: {},
        launchConfigurations: []
      };

      const result = await configValidator.validateConfiguration(testProfile);

      expect(result.valid).toBe(true);
      // Allow for warnings but no errors
      expect(result.summary.errors).toBe(0);
      // If there are warnings, they should be minor
      if (result.issues.length > 0) {
        expect(result.issues.every(issue => issue.severity === 'warning' || issue.severity === 'info')).toBe(true);
      }
    });

    it('should detect validation issues in malformed profiles', async () => {
      const invalidProfile: IDEConfigurationProfile = {
        name: '', // Invalid: empty name
        description: 'Test profile',
        ideType: 'vscode',
        extensions: [
          {
            id: 'invalid-extension',
            name: 'Invalid Extension',
            publisher: '', // Invalid: empty publisher
            version: 'not-a-version', // Invalid: malformed version
            description: ''
          }
        ],
        workspaceSettings: {},
        tasks: [],
        snippets: {},
        launchConfigurations: []
      };

      const result = await configValidator.validateConfiguration(invalidProfile);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.summary.errors).toBeGreaterThan(0);
    });

    it('should validate configuration files', async () => {
      const configFile = join(tempDir, 'test-config.json');
      const validConfig = {
        name: 'Test Config',
        ideType: 'vscode',
        extensions: [],
        workspaceSettings: {
          editor: {
            fontSize: 14
          }
        }
      };

      await writeFile(configFile, JSON.stringify(validConfig, null, 2));

      const result = await configValidator.validateConfigurationFile(configFile, 'vscode');

      expect(result.valid).toBe(true);
      expect(result.summary.errors).toBe(0);
    });

    it('should detect JSON syntax errors in configuration files', async () => {
      const configFile = join(tempDir, 'invalid-config.json');
      const invalidJson = '{ "name": "Test", "invalid": }'; // Missing value

      await writeFile(configFile, invalidJson);

      const result = await configValidator.validateConfigurationFile(configFile, 'vscode');

      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.code === 'SYNTAX_ERROR')).toBe(true);
    });
  });

  describe('Extension Management Integration', () => {
    it('should handle extension installation workflow', async () => {
      // Mock the child_process exec function
      const { exec } = await import('child_process');
      const mockExec = exec as unknown as vi.MockedFunction<typeof exec>;
      
      mockExec.mockImplementation((command: string, options?: unknown, callback?: (error: Error | null, stdout: string, stderr: string) => void) => {
        if (typeof options === 'function') {
          callback = options;
        }
        // Simulate successful installation
        callback?.(null, 'Extension installed successfully', '');
        return {} as ReturnType<typeof exec>;
      });

      // Mock the extension check
      vi.spyOn(extensionManager, 'isExtensionInstalled').mockResolvedValue(true);

      const result = await extensionManager.installExtension('ms-python.python');

      expect(result.success).toBe(true);
      expect(result.configured?.extensions).toContain('ms-python.python');
    });

    it('should handle extension installation failures', async () => {
      // Mock failed command execution
      const { exec } = await import('child_process');
      const mockExec = exec as unknown as vi.MockedFunction<typeof exec>;
      
      mockExec.mockImplementation((command: string, options?: unknown, callback?: (error: Error | null, stdout: string, stderr: string) => void) => {
        if (typeof options === 'function') {
          callback = options;
        }
        // Simulate failed installation
        callback?.(new Error('Installation failed'), '', 'Installation failed');
        return {} as ReturnType<typeof exec>;
      });

      const result = await extensionManager.installExtension('invalid-extension');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Installation failed');
    });

    it('should list installed extensions', async () => {
      // Mock the command output
      const { exec } = await import('child_process');
      const mockExec = exec as unknown as vi.MockedFunction<typeof exec>;
      
      const mockOutput = 'ms-python.python@2023.10.0\nms-vscode.vscode-typescript-next@5.1.0';
      mockExec.mockImplementation((command: string, options?: unknown, callback?: (error: Error | null, stdout: string, stderr: string) => void) => {
        if (typeof options === 'function') {
          callback = options;
        }
        callback?.(null, mockOutput, '');
        return {} as ReturnType<typeof exec>;
      });

      const extensions = await extensionManager.listInstalledExtensions();

      expect(extensions).toHaveLength(2);
      expect(extensions[0].id).toBe('ms-python.python');
      expect(extensions[0].version).toBe('2023.10.0');
    });

    it('should check if extension is installed', async () => {
      // Mock installed extensions list
      vi.spyOn(extensionManager, 'listInstalledExtensions').mockResolvedValue([
        {
          id: 'ms-python.python',
          name: 'Python',
          version: '2023.10.0'
        }
      ]);

      const isInstalled = await extensionManager.isExtensionInstalled('ms-python.python');
      const isNotInstalled = await extensionManager.isExtensionInstalled('non-existent.extension');

      expect(isInstalled).toBe(true);
      expect(isNotInstalled).toBe(false);
    });

    it('should validate extension dependencies', async () => {
      // Mock extension info
      vi.spyOn(extensionManager, 'getExtensionInfo').mockResolvedValue({
        id: 'test.extension',
        name: 'Test Extension',
        version: '1.0.0'
      });

      const result = await extensionManager.validateExtensionDependencies('test.extension');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple extension installations', async () => {
      // Mock successful installations
      vi.spyOn(extensionManager, 'installExtension')
        .mockResolvedValue({ success: true, configured: { extensions: ['test'] } });

      const extensionIds = ['ext1', 'ext2', 'ext3'];
      const results = await extensionManager.installExtensions(extensionIds);

      expect(results).toHaveLength(3);
      expect(results.every(result => result.success)).toBe(true);
    });
  });

  describe('Cross-Platform Compatibility', () => {
    const ideTypes: IDEType[] = ['vscode', 'cursor', 'jetbrains', 'vim', 'neovim'];

    it.each(ideTypes)('should handle %s configuration validation', async (ideType) => {
      const baseProfile: IDEConfigurationProfile = {
        name: `${ideType} Test Profile`,
        description: `Test profile for ${ideType}`,
        ideType,
        extensions: [],
        workspaceSettings: {
          editor: {
            fontSize: 14,
            tabSize: 2
          }
        },
        tasks: [],
        snippets: {},
        launchConfigurations: []
      };

      const validationResult = await configValidator.validateConfiguration(baseProfile);
      expect(validationResult.valid).toBe(true);
    });

    it('should handle platform-specific extensions', async () => {
      const platformSpecificExtension: IDEExtension = {
        id: 'test.platform-specific',
        name: 'Platform Specific Extension',
        platforms: IS_WINDOWS ? ['windows'] : IS_MACOS ? ['macos'] : ['linux']
      };

      const profile: IDEConfigurationProfile = {
        name: 'Platform Test',
        ideType: 'vscode',
        extensions: [platformSpecificExtension],
        workspaceSettings: {},
        tasks: [],
        snippets: {},
        launchConfigurations: []
      };

      const result = await configValidator.validateConfiguration(profile);
      expect(result.valid).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle large configuration profiles efficiently', async () => {
      const largeProfile: IDEConfigurationProfile = {
        name: 'Large Test Profile',
        description: 'Profile with many extensions and settings',
        ideType: 'vscode',
        extensions: Array.from({ length: 50 }, (_, i) => ({
          id: `test.extension-${i}`,
          name: `Test Extension ${i}`,
          publisher: 'test',
          version: '1.0.0',
          description: `Test extension number ${i}`
        })),
        workspaceSettings: {
          editor: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`testSetting${i}`, `value${i}`])
          )
        },
        tasks: [],
        snippets: {},
        launchConfigurations: []
      };

      const startTime = Date.now();
      const result = await configValidator.validateConfiguration(largeProfile);
      const endTime = Date.now();

      expect(result.valid).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent validation operations', async () => {
      const profiles = Array.from({ length: 5 }, (_, i) => ({
        name: `Concurrent Profile ${i}`,
        description: `Test profile ${i}`,
        ideType: 'vscode' as IDEType,
        extensions: [],
        workspaceSettings: {
          editor: { [`testSetting${i}`]: `value${i}` }
        },
        tasks: [],
        snippets: {},
        launchConfigurations: []
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        profiles.map(profile => configValidator.validateConfiguration(profile))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(results.every(result => result.valid)).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // Should run concurrently
    });

    it('should recover from validation errors gracefully', async () => {
      // Create a more realistically invalid profile
      const corruptProfile: IDEConfigurationProfile = {
        name: '', // Invalid: empty name
        description: '',
        ideType: 'vscode',
        extensions: [
          {
            id: '', // Invalid: empty ID
            name: '',
            publisher: '',
            version: 'invalid-version-format'
          }
        ],
        workspaceSettings: {},
        tasks: [],
        snippets: {},
        launchConfigurations: []
      };

      const result = await configValidator.validateConfiguration(corruptProfile);

      // The validator should detect these issues
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.summary.errors).toBeGreaterThan(0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle a complete development environment setup', async () => {
      const fullStackProfile: IDEConfigurationProfile = {
        name: 'Full Stack Development',
        description: 'Complete setup for full-stack development',
        ideType: 'vscode',
        extensions: [
          {
            id: 'ms-python.python',
            name: 'Python',
            publisher: 'ms-python',
            version: '2023.10.0',
            description: 'Python language support',
            required: true,
            platforms: ['windows', 'macos', 'linux']
          },
          {
            id: 'ms-vscode.vscode-typescript-next',
            name: 'TypeScript',
            publisher: 'ms-vscode',
            version: '5.1.0',
            description: 'TypeScript support',
            required: true,
            platforms: ['windows', 'macos', 'linux']
          }
        ],
        workspaceSettings: {
          editor: {
            fontSize: 14,
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: false
          },
          extensions: {
            'files.autoSave': 'afterDelay',
            'files.autoSaveDelay': 1000,
            'python.defaultInterpreterPath': '/usr/bin/python3',
            'typescript.preferences.importModuleSpecifier': 'relative'
          }
        },
        tasks: [],
        snippets: {},
        launchConfigurations: []
      };

      // Validate the profile
      const validationResult = await configValidator.validateConfiguration(fullStackProfile);
      expect(validationResult.valid).toBe(true);
    });

    it('should handle team collaboration scenarios', async () => {
      const teamProfile: IDEConfigurationProfile = {
        name: 'Team Standard Configuration',
        description: 'Standardized configuration for team collaboration',
        ideType: 'vscode',
        extensions: [
          {
            id: 'esbenp.prettier-vscode',
            name: 'Prettier',
            publisher: 'esbenp',
            version: '9.10.4',
            description: 'Code formatter',
            required: true,
            platforms: ['windows', 'macos', 'linux']
          }
        ],
        workspaceSettings: {
          editor: {
            formatOnSave: true,
            codeActionsOnSave: {
              'source.fixAll.eslint': true
            }
          },
          extensions: {
            'prettier.requireConfig': true,
            'eslint.validate': ['javascript', 'typescript', 'javascriptreact', 'typescriptreact']
          }
        },
        tasks: [],
        snippets: {},
        launchConfigurations: []
      };

      const validationResult = await configValidator.validateConfiguration(teamProfile);
      expect(validationResult.valid).toBe(true);

      // Test that the configuration enforces team standards
      expect(teamProfile.workspaceSettings.editor?.formatOnSave).toBe(true);
      expect(teamProfile.workspaceSettings.extensions?.['prettier.requireConfig']).toBe(true);
    });
  });
}); 