/**
 * RBenv Version Manager Adapter
 * Implements the unified interface for RBenv - a lightweight Ruby version manager
 */

import type { Architecture, Platform } from '../../shared/simple-manifest-types';
import { VersionManagerInstaller } from '../version-manager-installer';
import type {
    VersionedTool,
    IVersionInfo,
    VersionManagerCapabilities,
    VersionManagerType,
    IVersionOperationResult,
    VersionSpecifier
} from '../version-manager-types';
import { BaseVersionManagerAdapter } from './base-adapter';

/**
 * RBenv adapter implementation
 * RBenv is a lightweight Ruby version manager for Unix-based systems
 */
export class RbenvAdapter extends BaseVersionManagerAdapter {
  public readonly type: VersionManagerType = 'rbenv';
  
  public readonly capabilities: VersionManagerCapabilities = {
    supportedTools: ['ruby'],
    canInstall: true,
    canUninstall: true,
    supportsGlobal: true,
    supportsLocal: true,
    supportsShell: true,
    supportsAutoSwitch: false, // Ruby doesn't have built-in auto-switching
    supportsLTS: false, // Ruby doesn't have LTS versions
    supportsRemoteList: true,
    requiresShellIntegration: true,
    supportedPlatforms: ['darwin', 'linux'],
    supportedArchitectures: ['x64', 'arm64']
  };

  private installer: VersionManagerInstaller;

  constructor(platform: Platform, architecture: Architecture) {
    super(platform, architecture);
    this.installer = new VersionManagerInstaller(platform);
  }

  /**
   * Install RBenv itself
   */
  public async installManager(): Promise<IVersionOperationResult> {
    const result = await this.installer.installVersionManager('rbenv');
    
    if (result.success) {
      this._status = 'installed';
      
      // Also install ruby-build plugin
      await this.installRubyBuildPlugin();
    }
    
    return {
      success: result.success,
      operation: 'install',
      tool: 'rbenv' as VersionedTool,
      message: result.message,
      error: result.error,
      duration: result.duration,
      timestamp: result.timestamp
    };
  }

  /**
   * Install ruby-build plugin for rbenv
   */
  private async installRubyBuildPlugin(): Promise<void> {
    const pluginPath = `${this.homeDir}/.rbenv/plugins/ruby-build`;
    
    // Check if already installed
    const checkResult = await this.executeCommand('test', ['-d', pluginPath]);
    if (checkResult.success) {
      return;
    }
    
    // Clone ruby-build
    const result = await this.executeCommand('git', [
      'clone',
      'https://github.com/rbenv/ruby-build.git',
      pluginPath
    ]);
    
    if (!result.success) {
      throw new Error(`Failed to install ruby-build plugin: ${result.stderr}`);
    }
  }

  // Command generation methods
  protected getVersionCommand(): { command: string; args: string[] } {
    return { command: 'rbenv', args: ['--version'] };
  }

  protected getListInstalledCommand(_tool: VersionedTool): { command: string; args: string[] } {
    return { command: 'rbenv', args: ['versions'] };
  }

  protected getListAvailableCommand(_tool: VersionedTool): { command: string; args: string[] } {
    return { command: 'rbenv', args: ['install', '--list'] };
  }

  protected getCurrentVersionCommand(_tool: VersionedTool): { command: string; args: string[] } {
    return { command: 'rbenv', args: ['version'] };
  }

  protected getInstallCommand(_tool: VersionedTool, version: string): { command: string; args: string[] } {
    return { command: 'rbenv', args: ['install', version] };
  }

  protected getUninstallCommand(_tool: VersionedTool, version: string): { command: string; args: string[] } {
    return { command: 'rbenv', args: ['uninstall', '-f', version] };
  }

  protected getSwitchCommand(
    _tool: VersionedTool, 
    version: string, 
    scope: 'global' | 'local' | 'shell'
  ): { command: string; args: string[] } {
    switch (scope) {
      case 'global':
        return { command: 'rbenv', args: ['global', version] };
      case 'local':
        return { command: 'rbenv', args: ['local', version] };
      case 'shell':
        return { command: 'rbenv', args: ['shell', version] };
    }
  }

  protected getInitCommand(): { command: string; args: string[] } {
    switch (this.shellType) {
      case 'bash':
        return { command: 'eval', args: ['"$(rbenv init -)"'] };
      case 'zsh':
        return { command: 'eval', args: ['"$(rbenv init -)"'] };
      case 'fish':
        return { command: 'rbenv', args: ['init', '-', '|', 'source'] };
      default:
        return { command: 'eval', args: ['"$(rbenv init -)"'] };
    }
  }

  // Output parsing methods
  protected parseInstalledVersions(tool: VersionedTool, output: string): IVersionInfo[] {
    const versions: IVersionInfo[] = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // RBenv format: "* 3.1.2 (set by /path/to/.ruby-version)"
      // or "  2.7.6"
      const match = line.match(/^(\*?\s*)(\d+\.\d+\.\d+(?:-\w+)?)/);
      if (match) {
        const isActive = match[1].includes('*');
        const version = match[2];
        
        versions.push(this.createVersionInfo(tool, version, {
          isInstalled: true,
          isActive
        }));
      }
    }
    
    return versions;
  }

  protected parseAvailableVersions(tool: VersionedTool, output: string): IVersionInfo[] {
    const versions: IVersionInfo[] = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const version = line.trim();
      // Skip non-version lines
      if (!version || 
          version.startsWith('Available versions:') ||
          version.startsWith('Only') ||
          !version.match(/^\d+\.\d+/)) {
        continue;
      }
      
      versions.push(this.createVersionInfo(tool, version, {
        isInstalled: false,
        isActive: false
      }));
    }
    
    // Sort versions in descending order (newest first)
    versions.sort((a, b) => this.compareVersions(b.version, a.version));
    
    return versions;
  }

  protected parseCurrentVersion(tool: VersionedTool, output: string): IVersionInfo | null {
    // RBenv format: "3.1.2 (set by /path/to/.ruby-version)"
    const match = output.match(/^(\d+\.\d+\.\d+(?:-\w+)?)/);
    
    if (match) {
      const version = match[1];
      return this.createVersionInfo(tool, version, {
        isInstalled: true,
        isActive: true
      });
    }
    
    return null;
  }

  protected getProjectConfigFileName(): string {
    return '.ruby-version';
  }

  protected parseProjectConfig(content: string): Record<VersionedTool, VersionSpecifier> {
    const version = content.trim();
    const config: Partial<Record<VersionedTool, VersionSpecifier>> = {};
    
    if (version) {
      config.ruby = version;
    }
    
    return config as Record<VersionedTool, VersionSpecifier>;
  }

  protected formatProjectConfig(versions: Record<VersionedTool, VersionSpecifier>): string {
    const rubyVersion = versions.ruby;
    
    if (rubyVersion) {
      if (typeof rubyVersion === 'string') {
        return rubyVersion + '\n';
      } else {
        return this.formatSemanticVersion(rubyVersion) + '\n';
      }
    }
    
    return '';
  }

  protected async getInstallationPath(): Promise<string | undefined> {
    return process.env.RBENV_ROOT || `${this.homeDir}/.rbenv`;
  }

  protected async getConfigPath(): Promise<string | undefined> {
    // RBenv doesn't have a central config file
    return undefined;
  }

  // Helper methods

  private compareVersions(a: string, b: string): number {
    const aParts = a.split(/[.-]/).map(p => parseInt(p) || 0);
    const bParts = b.split(/[.-]/).map(p => parseInt(p) || 0);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart !== bPart) {
        return aPart - bPart;
      }
    }
    
    return 0;
  }

  private formatSemanticVersion(version: VersionSpecifier): string {
    if (typeof version === 'string') {
      return version;
    }
    
    let versionStr = '';
    if (version.major !== undefined) {
      versionStr += version.major;
      if (version.minor !== undefined) {
        versionStr += `.${version.minor}`;
        if (version.patch !== undefined) {
          versionStr += `.${version.patch}`;
        }
      }
    }
    
    if (version.prerelease) {
      versionStr += `-${version.prerelease}`;
    }
    
    return versionStr || 'latest';
  }

  protected async getEnvironmentVariables(): Promise<Record<string, string>> {
    const vars: Record<string, string> = {};
    
    if (process.env.RBENV_ROOT) {
      vars.RBENV_ROOT = process.env.RBENV_ROOT;
    }
    
    if (process.env.RBENV_VERSION) {
      vars.RBENV_VERSION = process.env.RBENV_VERSION;
    }
    
    return vars;
  }

  protected async getAdditionalOptions(): Promise<Record<string, unknown>> {
    const options: Record<string, unknown> = {};
    
    // Check if ruby-build is installed
    const pluginPath = `${this.homeDir}/.rbenv/plugins/ruby-build`;
    const checkResult = await this.executeCommand('test', ['-d', pluginPath]);
    options.rubyBuildInstalled = checkResult.success;
    
    return options;
  }

  protected async checkShellIntegration(): Promise<boolean> {
    // Check if rbenv init is in shell profile
    const profileFile = await this.getShellProfileFile();
    if (!profileFile) return false;
    
    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(profileFile, 'utf-8');
      return content.includes('rbenv init');
    } catch {
      return false;
    }
  }
} 