/**
 * Windows Installer Tests
 * Comprehensive test suite for the Windows installer implementation
 */

import { exec } from 'child_process';
import { existsSync } from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import type { InstallationCommand } from '../../shared/manifest-types.js';
import type { InstallationOptions } from '../installer-types.js';
import { WindowsInstaller } from '../windows-installer.js';

// Mock dependencies
vi.mock('child_process');
vi.mock('fs');

const mockExec = exec as MockedFunction<typeof exec>;
const mockExistsSync = existsSync as MockedFunction<typeof existsSync>;

describe('WindowsInstaller', () => {
  let installer: WindowsInstaller;
  let mockCommand: InstallationCommand;
  let mockOptions: InstallationOptions;

  beforeEach(() => {
    installer = new WindowsInstaller();
    
    mockCommand = {
      method: 'winget',
      platform: 'windows',
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
      expect(installer.platform).toBe('windows');
    });

    it('should have correct capabilities', () => {
      expect(installer.capabilities).toEqual({
        supportedMethods: ['winget', 'chocolatey', 'scoop', 'direct-download', 'script'],
        supportsElevation: true,
        supportsProgress: true,
        supportsVerification: true,
        supportsRollback: false,
        supportsCancel: true,
        supportsParallelInstallation: false,
        supportedArchitectures: ['x64', 'x86', 'arm64']
      });
    });
  });

  describe('canHandle', () => {
    it('should handle Windows commands with supported methods', () => {
      const supportedMethods: Array<'winget' | 'chocolatey' | 'scoop' | 'direct-download' | 'script'> = 
        ['winget', 'chocolatey', 'scoop', 'direct-download', 'script'];
      
      supportedMethods.forEach(method => {
        const command = { ...mockCommand, method };
        expect(installer.canHandle(command)).toBe(true);
      });
    });

    it('should not handle non-Windows commands', () => {
      const macCommand = { ...mockCommand, platform: 'macos' as const };
      expect(installer.canHandle(macCommand)).toBe(false);
    });

    it('should not handle unsupported methods', () => {
      const unsupportedCommand = { ...mockCommand, method: 'homebrew' as const };
      expect(installer.canHandle(unsupportedCommand)).toBe(false);
    });
  });

  describe('Winget Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'winget';
    });

    it('should install successfully via winget', async () => {
      // Mock winget availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'winget v1.0', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock winget install command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Successfully installed test-package', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.method).toBe('winget');
    });

    it('should fail when winget is not available', async () => {
      // Mock winget not available
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Command not found'), '', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('dependency_missing');
    });

    it('should add silent flag when not interactive', async () => {
      mockOptions.interactive = false;

      // Mock winget availability
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'winget v1.0', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock winget install and capture command
      let capturedCommand = '';
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        capturedCommand = cmd as string;
        if (typeof callback === 'function') {
          callback(null, 'Successfully installed', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      await installer.install(mockCommand, mockOptions);
      
      expect(capturedCommand).toContain('--silent');
    });

    it('should add force flag when force option is true', async () => {
      mockOptions.force = true;

      // Mock winget availability
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'winget v1.0', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock winget install and capture command
      let capturedCommand = '';
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

  describe('Chocolatey Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'chocolatey';
    });

    it('should install successfully via chocolatey', async () => {
      // Mock chocolatey availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Chocolatey v1.0', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock chocolatey install command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Chocolatey installed 1/1 packages', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.method).toBe('chocolatey');
    });

    it('should fail when chocolatey is not available', async () => {
      // Mock chocolatey not available
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Command not found'), '', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('dependency_missing');
    });
  });

  describe('Scoop Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'scoop';
    });

    it('should install successfully via scoop', async () => {
      // Mock scoop availability check
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Current Scoop version', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock scoop install command
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'test-package was installed successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.method).toBe('scoop');
    });
  });

  describe('Direct Download Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'direct-download';
      mockCommand.downloadUrl = 'https://example.com/installer.msi';
    });

    it('should install MSI file successfully', async () => {
      // Mock file download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Download completed', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock file existence check
      mockExistsSync.mockReturnValue(true);

      // Mock MSI installation
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Installation completed', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should install EXE file successfully', async () => {
      mockCommand.downloadUrl = 'https://example.com/installer.exe';

      // Mock file download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Download completed', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock file existence check
      mockExistsSync.mockReturnValue(true);

      // Mock EXE installation
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Installation completed', '');
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
      // Mock failed download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Network error'), '', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      // Mock file doesn't exist
      mockExistsSync.mockReturnValue(false);

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('network_error');
    });

    it('should fail for unsupported file types', async () => {
      mockCommand.downloadUrl = 'https://example.com/installer.zip';

      // Mock successful download
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Download completed', '');
        }
        return {} as ReturnType<typeof exec>;
      });

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
      mockCommand.command = 'Install-Package -Name TestTool';
    });

    it('should install successfully via PowerShell script', async () => {
      // Mock PowerShell script execution
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Script executed successfully', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.method).toBe('script');
    });

    it('should fail when script execution fails', async () => {
      // Mock failed script execution
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Script failed'), '', 'Execution error');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('command_failed');
    });
  });

  describe('Verification', () => {
    it('should verify installation using verify command', async () => {
      mockCommand.verifyCommand = 'test-tool --version';

      // Mock successful verification
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'test-tool v1.0.0', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.verify(mockCommand, mockOptions);
      
      expect(result).toBe(true);
    });

    it('should verify installation using verify pattern', async () => {
      mockCommand.verifyCommand = 'test-tool --version';
      mockCommand.verifyPattern = 'v\\d+\\.\\d+\\.\\d+';

      // Mock verification with pattern matching
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'test-tool v1.0.0', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.verify(mockCommand, mockOptions);
      
      expect(result).toBe(true);
    });

    it('should fail verification when pattern does not match', async () => {
      mockCommand.verifyCommand = 'test-tool --version';
      mockCommand.verifyPattern = 'v\\d+\\.\\d+\\.\\d+';

      // Mock verification with non-matching output
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'test-tool unknown version', '');
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
          callback(null, 'test-tool found', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const result = await installer.verify(mockCommand, mockOptions);
      
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported installation methods', async () => {
      mockCommand.method = 'homebrew' as const;

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
      expect(error.type).toBe('dependency_missing'); // winget not available
      expect(error.message).toContain('Windows Package Manager');
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
        };
      }
      
      const progressEvents: ProgressEvent[] = [];
      
      installer.on('progress', (toolId, progress) => {
        progressEvents.push({ toolId, progress });
      });

      // Mock successful winget installation
      mockExec.mockImplementation((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Successfully installed', '');
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
      
      // Initially should return pending
      const initialStatus = await installer.getInstallationStatus(toolId);
      expect(initialStatus).toBe('pending');
    });

    it('should support installation cancellation', async () => {
      const toolId = 'test-tool-id';
      
      const result = await installer.cancelInstallation(toolId);
      expect(result).toBe(false); // No active installation to cancel
    });
  });
}); 