/**
 * macOS Installer Tests
 * Comprehensive test suite for the macOS installer implementation
 */

import { exec } from 'child_process';
import { existsSync } from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import type { InstallationCommand } from '../../shared/manifest-types.js';
import type { CommandExecutionResult, InstallationOptions } from '../installer-types.js';
import { MacOSInstaller } from '../macos-installer.js';

// Mock dependencies
vi.mock('child_process');
vi.mock('fs');

const mockExec = exec as MockedFunction<typeof exec>;
const mockExistsSync = existsSync as MockedFunction<typeof existsSync>;

describe('MacOSInstaller', () => {
  let installer: MacOSInstaller;
  let mockCommand: InstallationCommand;
  let mockOptions: InstallationOptions;

  beforeEach(() => {
    installer = new MacOSInstaller();
    
    mockCommand = {
      method: 'homebrew',
      platform: 'macos',
      command: 'test-tool',
      args: ['test-package'],
      verifyCommand: 'test-tool --version'
    };

    mockOptions = {
      force: false,
      interactive: false,
      timeout: 30000
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Platform and Capabilities', () => {
    it('should have correct platform', () => {
      expect(installer.platform).toBe('macos');
    });

    it('should have correct capabilities', () => {
      expect(installer.capabilities).toEqual({
        supportedMethods: ['homebrew', 'direct-download', 'script', 'package-manager'],
        supportsElevation: true,
        supportsProgress: true,
        supportsVerification: true,
        supportsRollback: false,
        supportsCancel: true,
        supportsParallelInstallation: false,
        supportedArchitectures: ['x64', 'arm64']
      });
    });
  });

  describe('canHandle', () => {
    it('should handle macOS commands with supported methods', () => {
      expect(installer.canHandle(mockCommand)).toBe(true);
      
      mockCommand.method = 'direct-download';
      expect(installer.canHandle(mockCommand)).toBe(true);
      
      mockCommand.method = 'script';
      expect(installer.canHandle(mockCommand)).toBe(true);
      
      mockCommand.method = 'package-manager';
      expect(installer.canHandle(mockCommand)).toBe(true);
    });

    it('should not handle non-macOS commands', () => {
      mockCommand.platform = 'windows';
      expect(installer.canHandle(mockCommand)).toBe(false);
    });

    it('should not handle unsupported methods', () => {
      mockCommand.method = 'winget';
      expect(installer.canHandle(mockCommand)).toBe(false);
    });
  });

  describe('Homebrew Installation', () => {
    it('should install successfully via homebrew', async () => {
      // Mock the base installer methods
      const mockExecuteCommand = vi.spyOn(installer, 'executeCommand' as keyof MacOSInstaller);
      const mockExecuteCommandWithProgress = vi.spyOn(installer, 'executeCommandWithProgress' as keyof MacOSInstaller);
      const mockCheckCommandExists = vi.spyOn(installer, 'checkCommandExists' as keyof MacOSInstaller);
      
      // Mock homebrew availability check
      mockCheckCommandExists.mockResolvedValue(true);
      
      // Mock homebrew install command
      mockExecuteCommandWithProgress.mockResolvedValue({
        exitCode: 0,
        stdout: 'Successfully installed test-package',
        stderr: '',
        duration: 1000,
        success: true,
        command: 'brew',
        args: ['install', 'test-package'],
        workingDirectory: undefined
      } as CommandExecutionResult);

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.method).toBe('homebrew');
      
      // Cleanup
      mockExecuteCommand.mockRestore();
      mockExecuteCommandWithProgress.mockRestore();
      mockCheckCommandExists.mockRestore();
    });

    it('should fail when homebrew is not available', async () => {
      // Mock homebrew not available
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Command not found'), '', 'brew: command not found');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('dependency_missing');
    });

    it('should add force flag when force option is true', async () => {
      mockOptions.force = true;
      let capturedCommand = '';

      // Mock homebrew availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'brew version', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock homebrew install command and capture it
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        capturedCommand = cmd as string;
        if (typeof callback === 'function') {
          callback(null, 'Successfully installed', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      await installer.install(mockCommand, mockOptions);
      
      expect(capturedCommand).toContain('--force');
    });
  });

  describe('Direct Download Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'direct-download';
    });

    it('should install PKG file successfully', async () => {
      mockCommand.downloadUrl = 'https://example.com/installer.pkg';
      
      // Mock file download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Downloaded successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock file exists check
      mockExistsSync.mockReturnValue(true);

      // Mock PKG installation
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Installation successful', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should install DMG file successfully', async () => {
      mockCommand.downloadUrl = 'https://example.com/installer.dmg';
      
      // Mock file download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Downloaded successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock file exists check
      mockExistsSync.mockReturnValue(true);

      // Mock DMG mount
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, '/dev/disk1\t\t\t/Volumes/TestApp', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock ls command to find app
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'TestApp.app\nREADME.txt', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock copy command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Copy successful', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock DMG unmount
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Unmounted successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should install ZIP file successfully', async () => {
      mockCommand.downloadUrl = 'https://example.com/installer.zip';
      
      // Mock file download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Downloaded successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock file exists check
      mockExistsSync.mockReturnValue(true);

      // Mock mkdir for extraction
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Directory created', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock unzip command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Extracted successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock ls command to find app
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'TestApp.app\nREADME.txt', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock copy command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Copy successful', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock cleanup
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Cleanup successful', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should fail when download URL is missing', async () => {
      delete mockCommand.downloadUrl;

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('command_failed');
    });

    it('should fail when download fails', async () => {
      mockCommand.downloadUrl = 'https://example.com/installer.pkg';
      
      // Mock download failure
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Download failed'), '', 'Network error');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('network_error');
    });

    it('should fail for unsupported file types', async () => {
      mockCommand.downloadUrl = 'https://example.com/installer.exe';
      
      // Mock file download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Downloaded successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock file exists check
      mockExistsSync.mockReturnValue(true);

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('command_failed');
    });
  });

  describe('Script Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'script';
      mockCommand.command = 'curl -sSL https://example.com/install.sh | bash';
    });

    it('should install successfully via script', async () => {
      // Mock script execution
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Installation completed successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.method).toBe('script');
    });

    it('should fail when script execution fails', async () => {
      // Mock script failure
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Script failed'), '', 'Script execution error');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('command_failed');
    });
  });

  describe('Package Manager Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'package-manager';
    });

    it('should fallback to homebrew for package-manager method', async () => {
      // Mock homebrew availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'brew version', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock homebrew install command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Successfully installed test-package', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });
  });

  describe('Verification', () => {
    it('should verify installation using verify command', async () => {
      // Mock verification command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'test-tool version 1.0.0', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.verify(mockCommand, mockOptions);
      
      expect(result).toBe(true);
    });

    it('should verify installation using verify pattern', async () => {
      mockCommand.verifyPattern = 'version \\d+\\.\\d+\\.\\d+';
      
      // Mock verification command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'test-tool version 1.0.0', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.verify(mockCommand, mockOptions);
      
      expect(result).toBe(true);
    });

    it('should fail verification when pattern does not match', async () => {
      mockCommand.verifyPattern = 'version \\d+\\.\\d+\\.\\d+';
      
      // Mock verification command with non-matching output
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'test-tool: command not found', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.verify(mockCommand, mockOptions);
      
      expect(result).toBe(false);
    });

    it('should fall back to command existence check when no verify command', async () => {
      delete mockCommand.verifyCommand;
      
      // Mock command existence check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, '/usr/local/bin/test-tool', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.verify(mockCommand, mockOptions);
      
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported installation methods', async () => {
      mockCommand.method = 'chocolatey';

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('platform_unsupported');
    });

    it('should handle command execution timeouts', async () => {
      mockOptions.timeout = 1000; // 1 second timeout

      // Mock long-running command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        setTimeout(() => {
          if (typeof callback === 'function') {
            callback(new Error('Timeout'), '', '');
          }
        }, 2000); // 2 seconds
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should create proper error objects with metadata', async () => {
      // Mock command failure
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Command failed'), '', 'Error details');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      
      const error = result.errors[0];
      expect(error.type).toBe('dependency_missing'); // homebrew not available
      expect(error.message).toContain('Homebrew');
      expect(error.recoverable).toBe(false);
      expect(error.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Progress Tracking', () => {
    it('should emit progress events during installation', async () => {
      interface ProgressEvent {
        toolId: string;
        progress: {
          status: string;
          percentage: number;
          currentStep: string;
        };
      }

      const progressEvents: ProgressEvent[] = [];
      
      installer.on('progress', (data: ProgressEvent) => {
        progressEvents.push(data);
      });

      // Mock homebrew availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'brew version', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock homebrew install command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Successfully installed test-package', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      await installer.install(mockCommand, mockOptions);
      
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0].progress.status).toBe('installing');
      expect(progressEvents[0].progress.percentage).toBeGreaterThan(0);
    });
  });

  describe('Installation Status Management', () => {
    it('should track installation status', async () => {
      const toolId = 'test-tool-id';
      
      // Initially should be pending
      const initialStatus = await installer.getInstallationStatus(toolId);
      expect(initialStatus).toBe('pending');
    });

    it('should support installation cancellation', async () => {
      const toolId = 'test-tool-id';
      
      const cancelled = await installer.cancelInstallation(toolId);
      expect(cancelled).toBe(false); // No active installation to cancel
    });
  });

  describe('Architecture Support', () => {
    it('should handle Intel (x64) architecture', async () => {
      mockCommand.architecture = 'x64';
      
      // Mock homebrew availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'brew version', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock homebrew install command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Successfully installed test-package', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should handle Apple Silicon (arm64) architecture', async () => {
      mockCommand.architecture = 'arm64';
      
      // Mock homebrew availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'brew version', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock homebrew install command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Successfully installed test-package', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should reject unsupported architectures', async () => {
      mockCommand.architecture = 'x86';
      
      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('platform_unsupported');
    });
  });

  describe('TAR Archive Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'direct-download';
      mockCommand.downloadUrl = 'https://example.com/installer.tar.gz';
    });

    it('should install TAR.GZ file successfully', async () => {
      // Mock file download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Downloaded successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock file exists check
      mockExistsSync.mockReturnValue(true);

      // Mock mkdir for extraction
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Directory created', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock tar extraction command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Extracted successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock ls command to find app
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'TestApp.app\nREADME.txt', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock copy command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Copy successful', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock cleanup
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Cleanup successful', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should handle TAR files with install scripts', async () => {
      // Mock file download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Downloaded successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock file exists check
      mockExistsSync.mockReturnValue(true);

      // Mock mkdir for extraction
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Directory created', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock tar extraction command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Extracted successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock ls command to find install script (no .app found)
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'install.sh\nREADME.txt', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock chmod to make script executable
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Permissions set', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock script execution
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Installation completed', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock cleanup
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Cleanup successful', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });
  });

  describe('DMG Edge Cases', () => {
    beforeEach(() => {
      mockCommand.method = 'direct-download';
      mockCommand.downloadUrl = 'https://example.com/installer.dmg';
    });

    it('should handle DMG mount failures', async () => {
      // Mock file download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Downloaded successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock file exists check
      mockExistsSync.mockReturnValue(true);

      // Mock DMG mount failure
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Mount failed'), '', 'hdiutil: mount failed');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('command_failed');
    });

    it('should handle DMG with no app bundle found', async () => {
      // Mock file download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Downloaded successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock file exists check
      mockExistsSync.mockReturnValue(true);

      // Mock DMG mount
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, '/dev/disk1\t\t\t/Volumes/TestApp', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock ls command with no app found
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'README.txt\nLICENSE', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock DMG unmount (cleanup)
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Unmounted successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('command_failed');
    });
  });

  describe('Homebrew Edge Cases', () => {
    it('should handle homebrew installation with warnings', async () => {
      // Mock homebrew availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'brew version', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock homebrew install command with warnings
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Warning: test-package already installed\nSuccessfully installed test-package', 'Warning: Some warning message');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.warnings).toBeDefined();
    });

    it('should handle homebrew cask installations', async () => {
      mockCommand.args = ['--cask', 'test-app'];

      // Mock homebrew availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'brew version', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock homebrew cask install command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Successfully installed test-app', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });
  });

  describe('Interactive Installation', () => {
    it('should handle interactive installation mode', async () => {
      mockOptions.interactive = true;

      // Mock homebrew availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'brew version', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock homebrew install command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Successfully installed test-package', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should handle non-interactive installation mode', async () => {
      mockOptions.interactive = false;

      // Mock homebrew availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'brew version', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock homebrew install command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Successfully installed test-package', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });
  });
}); 