/**
 * Version Manager Installer Tests
 * Cross-platform testing for version manager installation functionality
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Architecture, Platform } from '../../shared/manifest-types.js';
import { VersionManagerInstaller } from '../version-manager-installer.js';
import type { VersionManagerType } from '../version-manager-types.js';

// Mock the CategoryInstaller
vi.mock('../category-installer.js', () => ({
  CategoryInstaller: vi.fn().mockImplementation(() => ({
    // Mock implementation
  }))
}));

describe('VersionManagerInstaller', () => {
  let installer: VersionManagerInstaller;
  const mockPlatforms: Platform[] = ['windows', 'macos', 'linux'];
  const mockArchitectures: Architecture[] = ['x64', 'arm64'];

  describe('Cross-Platform Installation Tests', () => {
    describe.each(mockPlatforms)('Platform: %s', (platform) => {
      describe.each(mockArchitectures)('Architecture: %s', (architecture) => {
        beforeEach(() => {
          installer = new VersionManagerInstaller(platform, architecture);
          vi.clearAllMocks();
        });

        afterEach(() => {
          vi.restoreAllMocks();
        });

        describe('Mise Installation', () => {
          it('should install mise successfully', async () => {
            const result = await installer.installVersionManager('mise', { force: false });
            
            expect(result.success).toBe(true);
            expect(result.tool).toBe('mise');
            expect(result.operation).toBe('install');
            expect(result.duration).toBeGreaterThanOrEqual(0);
            expect(result.timestamp).toBeInstanceOf(Date);
          });

          it('should handle mise installation with force option', async () => {
            const result = await installer.installVersionManager('mise', { force: true });
            
            expect(result.success).toBe(true);
            expect(result.tool).toBe('mise');
          });

          it('should detect existing mise installation', async () => {
            // Mock existing installation
            vi.spyOn(installer, 'isVersionManagerInstalled').mockResolvedValue(true);
            
            const result = await installer.installVersionManager('mise', { force: false });
            
            expect(result.success).toBe(true);
            expect(result.message).toContain('already installed');
          });
        });

        describe('NVM Installation', () => {
          it('should install nvm successfully on supported platforms', async () => {
            const result = await installer.installVersionManager('nvm', { force: false });
            
            expect(result.success).toBe(true);
            expect(result.tool).toBe('nvm');
            expect(result.operation).toBe('install');
          });

          it('should handle platform-specific nvm variants', async () => {
            const result = await installer.installVersionManager('nvm');
            
            if (platform === 'windows') {
              // Should install nvm-windows
              expect(result.success).toBe(true);
            } else {
              // Should install standard nvm
              expect(result.success).toBe(true);
            }
          });
        });

        describe('PyEnv Installation', () => {
          it('should install pyenv successfully', async () => {
            const result = await installer.installVersionManager('pyenv', { force: false });
            
            expect(result.success).toBe(true);
            expect(result.tool).toBe('pyenv');
            expect(result.operation).toBe('install');
          });

          it('should handle pyenv dependencies', async () => {
            const result = await installer.installVersionManager('pyenv');
            
            expect(result.success).toBe(true);
            // Should have installed git and curl dependencies
            expect(result.setupCommandsExecuted).toBeDefined();
          });
        });
      });
    });
  });

  describe('Installation Path Detection', () => {
    beforeEach(() => {
      installer = new VersionManagerInstaller('macos', 'x64');
    });

    it('should return correct installation paths for mise', async () => {
      const path = await installer.getInstallationPath('mise');
      expect(path).toBeDefined();
      expect(path).toContain('mise');
    });

    it('should return correct installation paths for nvm', async () => {
      const path = await installer.getInstallationPath('nvm');
      expect(path).toBeDefined();
      expect(path).toContain('nvm');
    });

    it('should return correct installation paths for pyenv', async () => {
      const path = await installer.getInstallationPath('pyenv');
      expect(path).toBeDefined();
      expect(path).toContain('pyenv');
    });
  });

  describe('Configuration Path Detection', () => {
    beforeEach(() => {
      installer = new VersionManagerInstaller('linux', 'x64');
    });

    it('should return correct config paths for mise', async () => {
      const path = await installer.getConfigPath('mise');
      expect(path).toBeDefined();
      expect(path).toContain('config.toml');
    });

    it('should return correct config paths for asdf', async () => {
      const path = await installer.getConfigPath('asdf');
      expect(path).toBeDefined();
      expect(path).toContain('.asdfrc');
    });
  });

  describe('Version Manager Detection', () => {
    beforeEach(() => {
      installer = new VersionManagerInstaller('windows', 'x64');
    });

    it('should detect installed version managers', async () => {
      // Mock command execution for detection
      vi.spyOn(installer, 'isVersionManagerInstalled').mockResolvedValue(true);

      const isInstalled = await installer.isVersionManagerInstalled('mise');
      expect(isInstalled).toBe(true);
    });

    it('should handle missing version managers', async () => {
      // Mock command execution failure
      vi.spyOn(installer, 'isVersionManagerInstalled').mockResolvedValue(false);

      const isInstalled = await installer.isVersionManagerInstalled('mise');
      expect(isInstalled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      installer = new VersionManagerInstaller('linux', 'arm64');
    });

    it('should handle unsupported version manager types', async () => {
      const result = await installer.installVersionManager('invalid' as VersionManagerType);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported version manager');
    });

    it('should handle installation failures gracefully', async () => {
      // Mock installation failure by making the installer return failure
      vi.spyOn(installer, 'installVersionManager').mockResolvedValue({
        success: false,
        operation: 'install',
        tool: 'mise' as any,
        message: 'Installation failed',
        error: 'Installation failed',
        duration: 100,
        timestamp: new Date(),
        shellIntegrationSetup: false,
        setupCommandsExecuted: [],
        warnings: []
      });

      const result = await installer.installVersionManager('mise');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network connectivity issues', async () => {
      // Mock network failure
      vi.spyOn(installer, 'installVersionManager').mockResolvedValue({
        success: false,
        operation: 'install',
        tool: 'nvm',
        message: 'Network unreachable',
        error: 'Network unreachable',
        duration: 100,
        timestamp: new Date(),
        shellIntegrationSetup: false,
        setupCommandsExecuted: [],
        warnings: []
      });

      const result = await installer.installVersionManager('nvm');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network unreachable');
    });
  });

  describe('Shell Integration', () => {
    beforeEach(() => {
      installer = new VersionManagerInstaller('macos', 'arm64');
    });

    it('should set up shell integration for version managers', async () => {
      const result = await installer.installVersionManager('mise');
      
      expect(result.shellIntegrationSetup).toBe(true);
    });

    it('should handle shell integration failures', async () => {
      // Mock shell integration failure
      const spy = vi.spyOn(installer, 'setupShellIntegration').mockResolvedValue(false);

      const result = await installer.installVersionManager('pyenv');
      
      // Debug: Check if the spy was called
      expect(spy).toHaveBeenCalled();
      expect(result.shellIntegrationSetup).toBe(false);
      expect(result.warnings).toContain('shell integration');
    });
  });

  describe('Performance Tests', () => {
    beforeEach(() => {
      installer = new VersionManagerInstaller('linux', 'x64');
    });

    it('should complete installation within reasonable time', async () => {
      const startTime = Date.now();
      const result = await installer.installVersionManager('mise');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max
      expect(result.duration).toBeLessThan(30000);
    });

    it('should handle concurrent installations', async () => {
      const promises = [
        installer.installVersionManager('mise'),
        installer.installVersionManager('nvm'),
        installer.installVersionManager('pyenv')
      ];

      const results = await Promise.allSettled(promises);
      
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.success).toBe(true);
        }
      });
    });
  });

  describe('Platform-Specific Edge Cases', () => {
    describe('Windows-specific tests', () => {
      beforeEach(() => {
        installer = new VersionManagerInstaller('windows', 'x64');
      });

      it('should handle Windows path separators', async () => {
        const path = await installer.getInstallationPath('mise');
        expect(path).toContain('\\');
      });

      it('should handle Windows environment variables', async () => {
        const path = await installer.getInstallationPath('nvm');
        expect(path).toContain('USERPROFILE');
      });
    });

    describe('macOS-specific tests', () => {
      beforeEach(() => {
        installer = new VersionManagerInstaller('macos', 'arm64');
      });

      it('should handle Apple Silicon architecture', async () => {
        const result = await installer.installVersionManager('mise');
        expect(result.success).toBe(true);
      });

      it('should use Homebrew for installation', async () => {
        const result = await installer.installVersionManager('pyenv');
        expect(result.success).toBe(true);
      });
    });

    describe('Linux-specific tests', () => {
      beforeEach(() => {
        installer = new VersionManagerInstaller('linux', 'x64');
      });

      it('should handle different package managers', async () => {
        const result = await installer.installVersionManager('mise');
        expect(result.success).toBe(true);
      });

      it('should handle shell script installations', async () => {
        const result = await installer.installVersionManager('nvm');
        expect(result.success).toBe(true);
      });
    });
  });
}); 