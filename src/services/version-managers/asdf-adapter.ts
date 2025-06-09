/**
 * ASDF Version Manager Adapter
 * Implements the unified interface for ASDF - a universal version manager with plugin support
 */

import type { Architecture, Platform } from '../../shared/simple-manifest-types';
import { VersionManagerInstaller } from '../version-manager-installer';
import type {
  VersionedTool,
  VersionInfo,
  VersionInstallOptions,
  VersionManagerCapabilities,
  VersionManagerType,
  VersionOperationResult,
  VersionSpecifier,
} from '../version-manager-types';
import { BaseVersionManagerAdapter } from './base-adapter';

/**
 * ASDF adapter implementation
 * ASDF is a universal version manager for Unix-based systems with plugin support for 500+ tools
 */
export class AsdfAdapter extends BaseVersionManagerAdapter {
  public readonly type: VersionManagerType = 'asdf';
  
  public readonly capabilities: VersionManagerCapabilities = {
    supportedTools: [
      'node', 'python', 'ruby', 'java', 'go', 'rust', 'php', 'perl',
      'lua', 'elixir', 'erlang', 'julia', 'crystal', 'swift', 'scala',
      'kotlin', 'dart', 'flutter', 'deno', 'terraform', 'cmake',
      'zig', 'r', 'neovim'
    ],
    canInstall: true,
    canUninstall: true,
    supportsGlobal: true,
    supportsLocal: true,
    supportsShell: true,
    supportsAutoSwitch: false, // ASDF doesn't have built-in auto-switch
    supportsLTS: false, // ASDF doesn't have built-in LTS support
    supportsRemoteList: true,
    requiresShellIntegration: true,
    supportedPlatforms: ['macos', 'linux'],
    supportedArchitectures: ['x64', 'arm64']
  };

  private installer: VersionManagerInstaller;
  
  // Plugin name mapping for ASDF
  private readonly pluginMap: Record<string, string> = {
    node: 'nodejs',
    go: 'golang',
    dotnet: 'dotnet-core',
  };

  constructor(platform: Platform, architecture: Architecture) {
    super(platform, architecture);
    this.installer = new VersionManagerInstaller(platform, architecture);
  }

  /**
   * Install ASDF itself
   */
  public async installManager(): Promise<VersionOperationResult> {
    const result = await this.installer.installVersionManager('asdf');
    
    if (result.success) {
      this._status = 'installed';
    }
    
    return {
      success: result.success,
      operation: 'install',
      tool: 'asdf' as VersionedTool,
      message: result.message,
      error: result.error,
      output: result.output,
      duration: result.duration,
      timestamp: result.timestamp
    };
  }

  /**
   * Get the plugin name for a given tool
   */
  private getPluginName(tool: VersionedTool): string {
    return this.pluginMap[tool] || tool;
  }

  /**
   * Check if a plugin is installed
   */
  private async isPluginInstalled(tool: VersionedTool): Promise<boolean> {
    const pluginName = this.getPluginName(tool);
    const result = await this.executeCommand('asdf', ['plugin', 'list']);
    
    if (!result.success) {
      return false;
    }
    
    const plugins = result.stdout.split('\n').map(p => p.trim()).filter(Boolean);
    return plugins.includes(pluginName);
  }

  /**
   * Install a plugin if not already installed
   */
  private async ensurePluginInstalled(tool: VersionedTool): Promise<void> {
    if (await this.isPluginInstalled(tool)) {
      return;
    }

    const pluginName = this.getPluginName(tool);
    const result = await this.executeCommand('asdf', ['plugin', 'add', pluginName]);
    
    if (!result.success) {
      throw new Error(`Failed to install ASDF plugin for ${pluginName}: ${result.stderr}`);
    }
  }

  // Command generation methods
  protected getVersionCommand(): { command: string; args: string[] } {
    return { command: 'asdf', args: ['--version'] };
  }

  protected getListInstalledCommand(tool: VersionedTool): { command: string; args: string[] } {
    const pluginName = this.getPluginName(tool);
    return { command: 'asdf', args: ['list', pluginName] };
  }

  protected getListAvailableCommand(tool: VersionedTool): { command: string; args: string[] } {
    const pluginName = this.getPluginName(tool);
    return { command: 'asdf', args: ['list', 'all', pluginName] };
  }

  protected getCurrentVersionCommand(tool: VersionedTool): { command: string; args: string[] } {
    const pluginName = this.getPluginName(tool);
    return { command: 'asdf', args: ['current', pluginName] };
  }

  protected getInstallCommand(tool: VersionedTool, version: string): { command: string; args: string[] } {
    const pluginName = this.getPluginName(tool);
    return { command: 'asdf', args: ['install', pluginName, version] };
  }

  protected getUninstallCommand(tool: VersionedTool, version: string): { command: string; args: string[] } {
    const pluginName = this.getPluginName(tool);
    return { command: 'asdf', args: ['uninstall', pluginName, version] };
  }

  protected getSwitchCommand(
    tool: VersionedTool, 
    version: string, 
    scope: 'global' | 'local' | 'shell'
  ): { command: string; args: string[] } {
    const pluginName = this.getPluginName(tool);
    
    switch (scope) {
      case 'global':
        return { command: 'asdf', args: ['global', pluginName, version] };
      case 'local':
        return { command: 'asdf', args: ['local', pluginName, version] };
      case 'shell':
        return { command: 'asdf', args: ['shell', pluginName, version] };
    }
  }

  protected getInitCommand(): { command: string; args: string[] } {
    switch (this.shellType) {
      case 'bash':
        return { command: 'source', args: ['$HOME/.asdf/asdf.sh'] };
      case 'zsh':
        return { command: 'source', args: ['$HOME/.asdf/asdf.sh'] };
      case 'fish':
        return { command: 'source', args: ['$HOME/.asdf/asdf.fish'] };
      default:
        return { command: 'source', args: ['$HOME/.asdf/asdf.sh'] };
    }
  }

  // Override install to ensure plugin is installed first
  public async installVersion(
    tool: VersionedTool,
    version: VersionSpecifier,
    options?: VersionInstallOptions
  ): Promise<VersionOperationResult> {
    try {
      await this.ensurePluginInstalled(tool);
      return super.installVersion(tool, version, options);
    } catch (error) {
      return this.createErrorResult('install', tool, error);
    }
  }

  // Override list methods to ensure plugin is installed first
  public async listInstalled(tool: VersionedTool): Promise<VersionInfo[]> {
    await this.ensurePluginInstalled(tool);
    return super.listInstalled(tool);
  }

  public async listAvailable(tool: VersionedTool): Promise<VersionInfo[]> {
    await this.ensurePluginInstalled(tool);
    return super.listAvailable(tool);
  }

  // Output parsing methods
  protected parseInstalledVersions(tool: VersionedTool, output: string): VersionInfo[] {
    const versions: VersionInfo[] = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Remove leading asterisk for current version and trim
      const version = line.trim().replace(/^\*\s*/, '').trim();
      
      if (version && !version.includes('No version')) {
        versions.push({
          version,
          isInstalled: true,
          isActive: line.trim().startsWith('*'),
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
      if (version && !version.includes('No versions') && !version.includes('plugin')) {
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
    // ASDF format: "nodejs 18.17.0 /path/to/.tool-versions"
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.includes('No version')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const version = parts[1];
          return {
            version,
            isInstalled: true,
            isActive: true,
            isLTS: this.isLTSVersion(tool, version),
            isPrerelease: this.isPrereleaseVersion(version)
          };
        }
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
      const [plugin, version] = line.trim().split(/\s+/, 2);
      if (plugin && version) {
        // Reverse map plugin name to tool name
        const tool = this.getToolFromPlugin(plugin);
        if (tool && this.isValidTool(tool)) {
          versions[tool as VersionedTool] = version;
        }
      }
    }
    
    return versions as Record<VersionedTool, VersionSpecifier>;
  }

  protected formatProjectConfig(versions: Record<VersionedTool, VersionSpecifier>): string {
    const lines: string[] = ['# ASDF tool versions'];
    
    for (const [tool, version] of Object.entries(versions)) {
      const pluginName = this.getPluginName(tool as VersionedTool);
      if (typeof version === 'string') {
        lines.push(`${pluginName} ${version}`);
      } else {
        // Convert semantic version to string
        const versionStr = this.formatSemanticVersion(version);
        lines.push(`${pluginName} ${versionStr}`);
      }
    }
    
    return lines.join('\n') + '\n';
  }

  protected async getInstallationPath(): Promise<string | undefined> {
    return process.env.ASDF_DIR || `${this.homeDir}/.asdf`;
  }

  protected async getConfigPath(): Promise<string | undefined> {
    const asdfDir = await this.getInstallationPath();
    return asdfDir ? `${asdfDir}/asdfrc` : undefined;
  }

  // Helper methods
  private getToolFromPlugin(pluginName: string): string {
    // Reverse lookup in plugin map
    for (const [tool, plugin] of Object.entries(this.pluginMap)) {
      if (plugin === pluginName) {
        return tool;
      }
    }
    return pluginName;
  }

  private isValidTool(tool: string): boolean {
    return this.capabilities.supportedTools.includes(tool as VersionedTool);
  }

  private isLTSVersion(tool: VersionedTool, version: string): boolean {
    // Node.js LTS versions
    if (tool === 'node') {
      const major = parseInt(version.split('.')[0]);
      return major % 2 === 0 && major >= 14; // Even major versions >= 14 are LTS
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

  protected async getEnvironmentVariables(): Promise<Record<string, string>> {
    const vars: Record<string, string> = {};
    
    if (process.env.ASDF_DIR) {
      vars.ASDF_DIR = process.env.ASDF_DIR;
    }
    
    if (process.env.ASDF_DATA_DIR) {
      vars.ASDF_DATA_DIR = process.env.ASDF_DATA_DIR;
    }
    
    return vars;
  }

  protected async getAdditionalOptions(): Promise<Record<string, unknown>> {
    const options: Record<string, unknown> = {};
    
    try {
      // Check for legacy version file support
      const configPath = await this.getConfigPath();
      if (configPath) {
        const { readFile } = await import('fs/promises');
        try {
          const content = await readFile(configPath, 'utf-8');
          if (content.includes('legacy_version_file = yes')) {
            options.legacyVersionFile = true;
          }
        } catch {
          // Config file might not exist
        }
      }
    } catch {
      // Ignore errors
    }
    
    return options;
  }
} 