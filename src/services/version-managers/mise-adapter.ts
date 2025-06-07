/**
 * Mise Version Manager Adapter
 * Implements the unified interface for Mise (formerly rtx) - a modern, cross-platform version manager
 */

import type { Architecture, Platform } from '../../shared/manifest-types.js';
import { VersionManagerInstaller } from '../version-manager-installer.js';
import type {
    VersionedTool,
    VersionInfo,
    VersionManagerCapabilities,
    VersionManagerType,
    VersionOperationResult,
    VersionSpecifier,
} from '../version-manager-types.js';
import { BaseVersionManagerAdapter } from './base-adapter.js';

/**
 * Mise adapter implementation
 * Mise is a universal version manager that supports 800+ tools via plugins
 */
export class MiseAdapter extends BaseVersionManagerAdapter {
  public readonly type: VersionManagerType = 'mise';
  
  public readonly capabilities: VersionManagerCapabilities = {
    supportedTools: [
      'node', 'python', 'ruby', 'java', 'go', 'rust', 'php', 'perl',
      'lua', 'elixir', 'erlang', 'julia', 'crystal', 'swift', 'scala',
      'kotlin', 'dart', 'flutter', 'deno', 'bun', 'terraform', 'cmake',
      'zig', 'lean', 'r', 'neovim'
    ],
    canInstall: true,
    canUninstall: true,
    supportsGlobal: true,
    supportsLocal: true,
    supportsShell: true,
    supportsAutoSwitch: true,
    supportsLTS: true,
    supportsRemoteList: true,
    requiresShellIntegration: true,
    supportedPlatforms: ['macos', 'linux', 'windows'],
    supportedArchitectures: ['x64', 'arm64']
  };

  private installer: VersionManagerInstaller;

  constructor(platform: Platform, architecture: Architecture) {
    super(platform, architecture);
    this.installer = new VersionManagerInstaller(platform, architecture);
  }

  /**
   * Install Mise itself
   */
  public async installManager(): Promise<VersionOperationResult> {
    const result = await this.installer.installVersionManager('mise');
    
    if (result.success) {
      this._status = 'installed';
    }
    
    return {
      success: result.success,
      operation: 'install',
      tool: 'mise' as VersionedTool,
      message: result.message,
      error: result.error,
      output: result.output,
      duration: result.duration,
      timestamp: result.timestamp
    };
  }

  // Command generation methods
  protected getVersionCommand(): { command: string; args: string[] } {
    return { command: 'mise', args: ['--version'] };
  }

  protected getListInstalledCommand(tool: VersionedTool): { command: string; args: string[] } {
    return { command: 'mise', args: ['list', tool] };
  }

  protected getListAvailableCommand(tool: VersionedTool): { command: string; args: string[] } {
    return { command: 'mise', args: ['list-remote', tool] };
  }

  protected getCurrentVersionCommand(tool: VersionedTool): { command: string; args: string[] } {
    return { command: 'mise', args: ['current', tool] };
  }

  protected getInstallCommand(tool: VersionedTool, version: string): { command: string; args: string[] } {
    return { command: 'mise', args: ['install', `${tool}@${version}`] };
  }

  protected getUninstallCommand(tool: VersionedTool, version: string): { command: string; args: string[] } {
    return { command: 'mise', args: ['uninstall', `${tool}@${version}`] };
  }

  protected getSwitchCommand(
    tool: VersionedTool, 
    version: string, 
    scope: 'global' | 'local' | 'shell'
  ): { command: string; args: string[] } {
    switch (scope) {
      case 'global':
        return { command: 'mise', args: ['use', '--global', `${tool}@${version}`] };
      case 'local':
        return { command: 'mise', args: ['use', `${tool}@${version}`] };
      case 'shell':
        return { command: 'mise', args: ['shell', `${tool}@${version}`] };
    }
  }

  protected getInitCommand(): { command: string; args: string[] } {
    switch (this.shellType) {
      case 'bash':
        return { command: 'eval', args: ['"$(mise activate bash)"'] };
      case 'zsh':
        return { command: 'eval', args: ['"$(mise activate zsh)"'] };
      case 'fish':
        return { command: 'mise', args: ['activate', 'fish', '|', 'source'] };
      case 'powershell':
        return { command: 'mise', args: ['activate', 'powershell'] };
      default:
        return { command: 'eval', args: ['"$(mise activate bash)"'] };
    }
  }

  // Output parsing methods
  protected parseInstalledVersions(tool: VersionedTool, output: string): VersionInfo[] {
    const versions: VersionInfo[] = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Mise format: "python  3.11.4  ~/.local/share/mise/installs/python/3.11.4"
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && parts[0] === tool) {
        const version = parts[1];
        const installPath = parts[2] || undefined;
        
        versions.push({
          version,
          isInstalled: true,
          isActive: false, // Will be determined separately
          installationPath: installPath,
          isLTS: this.isLTSVersion(tool, version),
          isPrerelease: this.isPrereleaseVersion(version)
        });
      }
    }
    
    return versions;
  }

  protected parseAvailableVersions(tool: VersionedTool, output: string): VersionInfo[] {
    const versions: VersionInfo[] = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const version = line.trim();
      if (version && !version.startsWith('#')) {
        versions.push({
          version,
          isInstalled: false,
          isActive: false,
          isLTS: this.isLTSVersion(tool, version),
          isPrerelease: this.isPrereleaseVersion(version)
        });
      }
    }
    
    // Sort versions in descending order (newest first)
    versions.sort((a, b) => this.compareVersions(b.version, a.version));
    
    return versions;
  }

  protected parseCurrentVersion(tool: VersionedTool, output: string): VersionInfo | null {
    // Mise format: "python  3.11.4  ~/.local/share/mise/installs/python/3.11.4"
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && parts[0] === tool) {
        const version = parts[1];
        const installPath = parts[2] || undefined;
        
        return {
          version,
          isInstalled: true,
          isActive: true,
          installationPath: installPath,
          isLTS: this.isLTSVersion(tool, version),
          isPrerelease: this.isPrereleaseVersion(version)
        };
      }
    }
    
    return null;
  }

  protected getProjectConfigFileName(): string {
    return '.tool-versions';
  }

  protected parseProjectConfig(content: string): Record<VersionedTool, VersionSpecifier> {
    const versions: Partial<Record<VersionedTool, VersionSpecifier>> = {};
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    for (const line of lines) {
      const [tool, version] = line.trim().split(/\s+/);
      if (tool && version && this.isValidTool(tool)) {
        versions[tool as VersionedTool] = version;
      }
    }
    
    return versions as Record<VersionedTool, VersionSpecifier>;
  }

  protected formatProjectConfig(versions: Record<VersionedTool, VersionSpecifier>): string {
    const lines: string[] = ['# Mise tool versions'];
    
    for (const [tool, version] of Object.entries(versions)) {
      if (typeof version === 'string') {
        lines.push(`${tool} ${version}`);
      } else {
        // Convert semantic version to string
        const versionStr = this.formatSemanticVersion(version);
        lines.push(`${tool} ${versionStr}`);
      }
    }
    
    return lines.join('\n') + '\n';
  }

  protected async getInstallationPath(): Promise<string | undefined> {
    if (this.platform === 'windows') {
      return process.env.MISE_ROOT || `${this.homeDir}\\.local\\bin\\mise.exe`;
    }
    return process.env.MISE_ROOT || `${this.homeDir}/.local/bin/mise`;
  }

  protected async getConfigPath(): Promise<string | undefined> {
    return `${this.homeDir}/.config/mise/config.toml`;
  }

  // Additional override methods for Mise-specific behavior
  protected async checkAutoSwitch(): Promise<boolean> {
    try {
      const configPath = await this.getConfigPath();
      if (!configPath) return false;
      
      const { readFile } = await import('fs/promises');
      const content = await readFile(configPath, 'utf-8');
      
      // Check if experimental auto-install is enabled
      return content.includes('experimental = true') || 
             content.includes('legacy_version_file = true');
    } catch {
      return false;
    }
  }

  protected async getEnvironmentVariables(): Promise<Record<string, string>> {
    const vars: Record<string, string> = {};
    
    if (process.env.MISE_ROOT) {
      vars.MISE_ROOT = process.env.MISE_ROOT;
    }
    
    if (process.env.MISE_CONFIG_FILE) {
      vars.MISE_CONFIG_FILE = process.env.MISE_CONFIG_FILE;
    }
    
    if (process.env.MISE_DATA_DIR) {
      vars.MISE_DATA_DIR = process.env.MISE_DATA_DIR;
    }
    
    return vars;
  }

  protected async getAdditionalOptions(): Promise<Record<string, unknown>> {
    const options: Record<string, unknown> = {};
    
    try {
      // Get Mise settings
      const result = await this.executeCommand('mise', ['settings']);
      if (result.success) {
        // Parse TOML output
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/^(\w+)\s*=\s*(.+)$/);
          if (match) {
            const [, key, value] = match;
            options[key] = this.parseTomlValue(value);
          }
        }
      }
    } catch {
      // Ignore errors
    }
    
    return options;
  }

  // Helper methods
  private isValidTool(tool: string): boolean {
    return this.capabilities.supportedTools.includes(tool as VersionedTool);
  }

  private isLTSVersion(tool: VersionedTool, version: string): boolean {
    // Node.js LTS versions
    if (tool === 'node') {
      const major = parseInt(version.split('.')[0]);
      return major % 2 === 0 && major >= 14; // Even major versions >= 14 are LTS
    }
    
    // Python LTS-like versions (stable releases)
    if (tool === 'python') {
      return !version.includes('a') && !version.includes('b') && !version.includes('rc');
    }
    
    return false;
  }

  private isPrereleaseVersion(version: string): boolean {
    return /[a-zA-Z]/.test(version) && 
           (version.includes('alpha') || 
            version.includes('beta') || 
            version.includes('rc') ||
            version.includes('dev') ||
            version.includes('preview'));
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(p => parseInt(p) || 0);
    const bParts = b.split('.').map(p => parseInt(p) || 0);
    
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

  private parseTomlValue(value: string): unknown {
    value = value.trim();
    
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    
    return value;
  }
} 