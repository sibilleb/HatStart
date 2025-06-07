/**
 * Linux Installer Tests
 * Comprehensive test suite for the Linux installer implementation
 */

import { existsSync } from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import type { InstallationCommand } from '../../shared/manifest-types.js';
import type { CommandExecutionResult, InstallationOptions } from '../installer-types.js';
import { LinuxInstaller } from '../linux-installer.js';

// Mock dependencies
vi.mock('child_process');
vi.mock('fs');

const mockExistsSync = existsSync as MockedFunction<typeof existsSync>;

describe('LinuxInstaller', () => {
  let installer: LinuxInstaller;
  let mockCommand: InstallationCommand;
  let mockOptions: InstallationOptions;

  beforeEach(() => {
    installer = new LinuxInstaller();
    
    mockCommand = {
      command: 'test-package',
      method: 'apt',
      platform: 'linux',
      architecture: 'x64',
      args: ['test-package']
    };

    mockOptions = {
      timeout: 30000,
      force: false,
      interactive: false,
      skipVerification: true // Skip verification by default for most tests
    };

    // Reset all mocks
    vi.clearAllMocks();
    
    // Default mock for file existence
    mockExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Platform and Capabilities', () => {
    it('should have correct platform', () => {
      expect(installer.platform).toBe('linux');
    });

    it('should have correct capabilities', () => {
      expect(installer.capabilities).toEqual({
        supportedMethods: ['apt', 'yum', 'snap', 'flatpak', 'direct-download', 'script', 'package-manager'],
        supportsElevation: true,
        supportsProgress: true,
        supportsVerification: true,
        supportsRollback: false,
        supportsCancel: true,
        supportsParallelInstallation: false,
        supportedArchitectures: ['x64', 'arm64', 'arm']
      });
    });

    it('should support all expected architectures', () => {
      expect(installer.capabilities.supportedArchitectures).toContain('x64');
      expect(installer.capabilities.supportedArchitectures).toContain('arm64');
      expect(installer.capabilities.supportedArchitectures).toContain('arm');
    });
  });

  describe('canHandle', () => {
    it('should handle Linux commands with supported methods', () => {
      const supportedMethods = ['apt', 'yum', 'snap', 'flatpak', 'direct-download', 'script', 'package-manager'];
      
      supportedMethods.forEach(method => {
        const command = { ...mockCommand, method: method as any };
        expect(installer.canHandle(command)).toBe(true);
      });
    });

    it('should not handle non-Linux commands', () => {
      const windowsCommand = { ...mockCommand, platform: 'windows' as any };
      expect(installer.canHandle(windowsCommand)).toBe(false);
    });

    it('should not handle unsupported methods', () => {
      const unsupportedCommand = { ...mockCommand, method: 'unsupported' as any };
      expect(installer.canHandle(unsupportedCommand)).toBe(false);
    });
  });

  describe('APT Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'apt';
    });

    it('should install successfully via apt', async () => {
      // Mock the base installer methods
      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      // Mock apt availability
      mockCheckCommandExists.mockResolvedValue(true);

      // Mock apt update command
      mockExecuteCommand.mockResolvedValueOnce({
        success: true,
        exitCode: 0,
        stdout: 'Reading package lists... Done',
        stderr: ''
      } as CommandExecutionResult);

      // Mock apt install command
      mockExecuteCommandWithProgress.mockResolvedValueOnce({
        success: true,
        exitCode: 0,
        stdout: 'Successfully installed test-package',
        stderr: ''
      } as CommandExecutionResult);

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.method).toBe('apt');
      expect(mockCheckCommandExists).toHaveBeenCalledWith('apt-get');
    });

    it('should handle apt with force flag', async () => {
      mockOptions.force = true;
      
      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });
      mockExecuteCommandWithProgress.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });

      await installer.install(mockCommand, mockOptions);
      
      // Verify that --reinstall flag was added
      expect(mockExecuteCommandWithProgress).toHaveBeenCalledWith(
        'sudo',
        expect.arrayContaining(['--reinstall']),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should fail when apt is not available', async () => {
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');
      mockCheckCommandExists.mockResolvedValue(false);

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('dependency_missing');
      expect(result.errors[0].message).toContain('APT package manager is not available');
    });

    it('should handle apt installation failure', async () => {
      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });
      mockExecuteCommandWithProgress.mockResolvedValue({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'Package not found'
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('command_failed');
      expect(result.errors[0].message).toContain('APT installation failed');
    });
  });

  describe('YUM Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'yum';
    });

    it('should install successfully via yum', async () => {
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      // Mock yum availability (but not dnf)
      mockCheckCommandExists.mockImplementation((cmd: string) => {
        return Promise.resolve(cmd === 'yum');
      });

      mockExecuteCommandWithProgress.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Successfully installed test-package',
        stderr: ''
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.method).toBe('yum');
    });

    it('should prefer dnf over yum when available', async () => {
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      // Mock both dnf and yum availability
      mockCheckCommandExists.mockResolvedValue(true);

      mockExecuteCommandWithProgress.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Successfully installed test-package',
        stderr: ''
      });

      await installer.install(mockCommand, mockOptions);
      
      // Should use dnf when both are available
      expect(mockExecuteCommandWithProgress).toHaveBeenCalledWith(
        'sudo',
        expect.arrayContaining(['dnf', 'install']),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should fail when neither yum nor dnf is available', async () => {
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');
      mockCheckCommandExists.mockResolvedValue(false);

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('dependency_missing');
      expect(result.errors[0].message).toContain('YUM/DNF package manager is not available');
    });
  });

  describe('Snap Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'snap';
    });

    it('should install successfully via snap', async () => {
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommandWithProgress.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'test-package installed',
        stderr: ''
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.method).toBe('snap');
    });

    it('should handle snap with force flag', async () => {
      mockOptions.force = true;
      
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommandWithProgress.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });

      await installer.install(mockCommand, mockOptions);
      
      expect(mockExecuteCommandWithProgress).toHaveBeenCalledWith(
        'sudo',
        expect.arrayContaining(['--dangerous']),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should fail when snap is not available', async () => {
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');
      mockCheckCommandExists.mockResolvedValue(false);

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('dependency_missing');
      expect(result.errors[0].message).toContain('Snap package manager is not available');
    });
  });

  describe('Flatpak Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'flatpak';
    });

    it('should install successfully via flatpak', async () => {
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommandWithProgress.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Installation complete',
        stderr: ''
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.method).toBe('flatpak');
    });

    it('should handle flatpak with force flag', async () => {
      mockOptions.force = true;
      
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommandWithProgress.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });

      await installer.install(mockCommand, mockOptions);
      
      expect(mockExecuteCommandWithProgress).toHaveBeenCalledWith(
        'flatpak',
        expect.arrayContaining(['--reinstall']),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should fail when flatpak is not available', async () => {
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');
      mockCheckCommandExists.mockResolvedValue(false);

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('dependency_missing');
      expect(result.errors[0].message).toContain('Flatpak package manager is not available');
    });
  });

  describe('Direct Download Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'direct-download';
      mockCommand.downloadUrl = 'https://example.com/package.deb';
    });

    it('should install DEB package successfully', async () => {
      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');
      const mockDownloadFile = vi.spyOn(installer as any, 'downloadFile');

      mockDownloadFile.mockResolvedValue('/tmp/package.deb');
      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Package installed successfully',
        stderr: ''
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(mockDownloadFile).toHaveBeenCalledWith('https://example.com/package.deb', mockOptions);
    });

    it('should install RPM package successfully', async () => {
      mockCommand.downloadUrl = 'https://example.com/package.rpm';
      
      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');
      const mockDownloadFile = vi.spyOn(installer as any, 'downloadFile');

      mockDownloadFile.mockResolvedValue('/tmp/package.rpm');
      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Package installed successfully',
        stderr: ''
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should install TAR.GZ archive successfully', async () => {
      mockCommand.downloadUrl = 'https://example.com/package.tar.gz';
      
      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockDownloadFile = vi.spyOn(installer as any, 'downloadFile');

      mockDownloadFile.mockResolvedValue('/tmp/package.tar.gz');
      mockExecuteCommand.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Extracted successfully',
        stderr: ''
      });

      // Mock file existence for install script
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes('install.sh');
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should install AppImage successfully', async () => {
      mockCommand.downloadUrl = 'https://example.com/app.AppImage';
      
      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockDownloadFile = vi.spyOn(installer as any, 'downloadFile');

      mockDownloadFile.mockResolvedValue('/tmp/app.AppImage');
      mockExecuteCommand.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'AppImage installed',
        stderr: ''
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
      expect(result.errors[0].message).toContain('Download URL is required');
    });

    it('should fail for unsupported file types', async () => {
      mockCommand.downloadUrl = 'https://example.com/package.unknown';
      
      const mockDownloadFile = vi.spyOn(installer as any, 'downloadFile');
      mockDownloadFile.mockResolvedValue('/tmp/package.unknown');

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('platform_unsupported');
      expect(result.errors[0].message).toContain('Unsupported installer type');
    });
  });

  describe('Script Installation', () => {
    beforeEach(() => {
      mockCommand.method = 'script';
      mockCommand.command = 'curl -sSL https://example.com/install.sh | bash';
    });

    it('should install successfully via script', async () => {
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');

      mockExecuteCommandWithProgress.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Installation completed successfully',
        stderr: ''
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.method).toBe('script');
    });

    it('should handle script installation failure', async () => {
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');

      mockExecuteCommandWithProgress.mockResolvedValue({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'Script execution failed'
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('command_failed');
      expect(result.errors[0].message).toContain('Script installation failed');
    });
  });

  describe('Package Manager Fallback', () => {
    beforeEach(() => {
      mockCommand.method = 'package-manager';
    });

    it('should fallback to apt when available', async () => {
      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      // Mock apt availability
      mockCheckCommandExists.mockImplementation((cmd: string) => {
        return Promise.resolve(cmd === 'apt-get');
      });

      mockExecuteCommand.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });
      mockExecuteCommandWithProgress.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should fallback to dnf when apt is not available', async () => {
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      // Mock dnf availability but not apt
      mockCheckCommandExists.mockImplementation((cmd: string) => {
        return Promise.resolve(cmd === 'dnf');
      });

      mockExecuteCommandWithProgress.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should fail when no package manager is available', async () => {
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');
      mockCheckCommandExists.mockResolvedValue(false);

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('dependency_missing');
      expect(result.errors[0].message).toContain('No supported package manager found');
    });
  });

  describe('Verification', () => {
    it('should verify installation with command', async () => {
      mockCommand.verifyCommand = 'test-package --version';
      // Don't skip verification for this test
      mockOptions.skipVerification = false;
      
      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');
      const mockIsAlreadyInstalled = vi.spyOn(installer as any, 'isAlreadyInstalled');

      // Mock that tool is NOT already installed so installation proceeds
      mockIsAlreadyInstalled.mockResolvedValue(false);
      
      // Mock successful installation
      mockCheckCommandExists.mockResolvedValue(true);
      
      // Mock all executeCommand calls to return success
      mockExecuteCommand.mockResolvedValue({ 
        success: true, 
        exitCode: 0, 
        stdout: 'test-package version 1.0.0', 
        stderr: '' 
      });
      
      // Mock apt install (executeCommandWithProgress call)
      mockExecuteCommandWithProgress.mockResolvedValue({ 
        success: true, 
        exitCode: 0, 
        stdout: '', 
        stderr: '' 
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.verification).toBeDefined();
      expect(result.verification?.success).toBe(true);
    });

    it('should verify installation with pattern', async () => {
      mockCommand.verifyPattern = 'version \\d+\\.\\d+\\.\\d+';
      mockCommand.verifyCommand = 'test-package --version';
      // Don't skip verification for this test
      mockOptions.skipVerification = false;
      
      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');
      const mockIsAlreadyInstalled = vi.spyOn(installer as any, 'isAlreadyInstalled');

      // Mock that tool is NOT already installed so installation proceeds
      mockIsAlreadyInstalled.mockResolvedValue(false);
      
      // Mock successful installation
      mockCheckCommandExists.mockResolvedValue(true);
      
      // Mock all executeCommand calls to return success
      mockExecuteCommand.mockResolvedValue({ 
        success: true, 
        exitCode: 0, 
        stdout: 'test-package version 1.2.3', 
        stderr: '' 
      });
      
      // Mock apt install (executeCommandWithProgress call)
      mockExecuteCommandWithProgress.mockResolvedValue({ 
        success: true, 
        exitCode: 0, 
        stdout: '', 
        stderr: '' 
      });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.verification).toBeDefined();
      expect(result.verification?.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported installation method', async () => {
      const unsupportedCommand = { ...mockCommand, method: 'unsupported' as any };

      const result = await installer.install(unsupportedCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('platform_unsupported');
      expect(result.errors[0].message).toContain('Unsupported installation method');
    });

    it('should handle network errors during download', async () => {
      mockCommand.method = 'direct-download';
      mockCommand.downloadUrl = 'https://example.com/package.deb';
      
      const mockDownloadFile = vi.spyOn(installer as any, 'downloadFile');
      mockDownloadFile.mockRejectedValue(new Error('Network error'));

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle missing dependencies', async () => {
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');
      mockCheckCommandExists.mockResolvedValue(false);

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('dependency_missing');
    });
  });

  describe('Progress Tracking', () => {
    it('should emit progress events during installation', async () => {
      const progressEvents: any[] = [];
      installer.on('progress', (event) => {
        progressEvents.push(event);
      });

      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });
      mockExecuteCommandWithProgress.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });

      await installer.install(mockCommand, mockOptions);
      
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toHaveProperty('toolId');
      expect(progressEvents[0]).toHaveProperty('status');
      expect(progressEvents[0]).toHaveProperty('percentage');
    });

    it('should track progress through installation steps', async () => {
      const progressEvents: any[] = [];
      installer.on('progress', (event) => {
        progressEvents.push(event);
      });

      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });
      mockExecuteCommandWithProgress.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });

      await installer.install(mockCommand, mockOptions);
      
      // Should have initial, intermediate, and completion progress events
      const statuses = progressEvents.map(e => e.status);
      expect(statuses).toContain('installing');
      expect(statuses).toContain('completed');
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
    it('should handle x64 architecture', async () => {
      const x64Command = { ...mockCommand, architecture: 'x64' as any };
      expect(installer.canHandle(x64Command)).toBe(true);
    });

    it('should handle arm64 architecture', async () => {
      const arm64Command = { ...mockCommand, architecture: 'arm64' as any };
      expect(installer.canHandle(arm64Command)).toBe(true);
    });

    it('should handle arm architecture', async () => {
      const armCommand = { ...mockCommand, architecture: 'arm' as any };
      expect(installer.canHandle(armCommand)).toBe(true);
    });
  });

  describe('Interactive Installation', () => {
    it('should handle interactive installation mode', async () => {
      mockOptions.interactive = true;

      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });
      mockExecuteCommandWithProgress.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });

      const result = await installer.install(mockCommand, mockOptions);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });
  });

  describe('Timeout Handling', () => {
    it('should respect custom timeout values', async () => {
      mockOptions.timeout = 60000; // 1 minute

      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });
      mockExecuteCommandWithProgress.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });

      await installer.install(mockCommand, mockOptions);
      
      // Verify timeout was passed to execution methods
      expect(mockExecuteCommandWithProgress).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({
          timeout: 60000
        })
      );
    });
  });

  describe('Environment Variables', () => {
    it('should pass environment variables to commands', async () => {
      mockOptions.environment = { 
        DEBIAN_FRONTEND: 'noninteractive',
        CUSTOM_VAR: 'test-value'
      };

      const mockExecuteCommand = vi.spyOn(installer as any, 'executeCommand');
      const mockExecuteCommandWithProgress = vi.spyOn(installer as any, 'executeCommandWithProgress');
      const mockCheckCommandExists = vi.spyOn(installer as any, 'checkCommandExists');

      mockCheckCommandExists.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });
      mockExecuteCommandWithProgress.mockResolvedValue({ success: true, exitCode: 0, stdout: '', stderr: '' });

      await installer.install(mockCommand, mockOptions);
      
      // Verify environment was passed to execution methods
      expect(mockExecuteCommandWithProgress).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({
          environment: mockOptions.environment
        })
      );
    });
  });
}); 