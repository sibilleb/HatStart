/**
 * PyEnv Version Manager Adapter
 * Implements the unified interface for PyEnv (Python Version Manager)
 * Handles both Unix (pyenv) and Windows (pyenv-win) variants
 */

import type { Architecture, Platform } from '../../shared/simple-manifest-types';
import { VersionManagerInstaller } from '../version-manager-installer';
import type {
    VersionedTool,
    VersionInfo,
    VersionManagerCapabilities,
    VersionManagerType,
    VersionOperationResult,
    VersionSpecifier,
} from '../version-manager-types';
import { BaseVersionManagerAdapter } from './base-adapter';

/**
 * PyEnv adapter implementation
 * Supports Python version management with platform-specific implementations
 */
export class PyenvAdapter extends BaseVersionManagerAdapter {
  public readonly type: VersionManagerType = 'pyenv';
  
  public readonly capabilities: VersionManagerCapabilities = {
    supportedTools: ['python'], // PyEnv only supports Python
    canInstall: true,
    canUninstall: true,
    supportsGlobal: true,
    supportsLocal: true,
    supportsShell: true,
    supportsAutoSwitch: false, // PyEnv doesn't have built-in auto-switching
    supportsLTS: false, // Python doesn't have LTS versions
    supportsRemoteList: true,
    requiresShellIntegration: true,
    supportedPlatforms: ['macos', 'linux', 'windows'],
    supportedArchitectures: ['x64', 'arm64']
  };

  private installer: VersionManagerInstaller;
  private isWindows: boolean;

  constructor(platform: Platform, architecture: Architecture) {
    super(platform, architecture);
    this.installer = new VersionManagerInstaller(platform, architecture);
    this.isWindows = platform === 'windows';
  }

  /**
   * Install PyEnv itself
   */
  public async installManager(): Promise<VersionOperationResult> {
    const result = await this.installer.installVersionManager('pyenv');
    
    if (result.success) {
      this._status = 'installed';
    }
    
    return {
      success: result.success,
      operation: 'install',
      tool: 'python' as VersionedTool,
      message: result.message,
      error: result.error,
      output: result.output,
      duration: result.duration,
      timestamp: result.timestamp
    };
  }

  // Command generation methods
  protected getVersionCommand(): { command: string; args: string[] } {
    return { command: 'pyenv', args: ['--version'] };
  }

  protected getListInstalledCommand(_tool: VersionedTool): { command: string; args: string[] } {
    // PyEnv doesn't need the tool parameter since it only manages Python
    return { command: 'pyenv', args: ['versions'] };
  }

  protected getListAvailableCommand(_tool: VersionedTool): { command: string; args: string[] } {
    // PyEnv doesn't need the tool parameter since it only manages Python
    return { command: 'pyenv', args: ['install', '--list'] };
  }

  protected getCurrentVersionCommand(_tool: VersionedTool): { command: string; args: string[] } {
    // PyEnv doesn't need the tool parameter since it only manages Python
    return { command: 'pyenv', args: ['version'] };
  }

  protected getInstallCommand(_tool: VersionedTool, version: string): { command: string; args: string[] } {
    return { command: 'pyenv', args: ['install', version] };
  }

  protected getUninstallCommand(_tool: VersionedTool, version: string): { command: string; args: string[] } {
    return { command: 'pyenv', args: ['uninstall', '-f', version] };
  }

  protected getSwitchCommand(
    _tool: VersionedTool, 
    version: string, 
    scope: 'global' | 'local' | 'shell'
  ): { command: string; args: string[] } {
    switch (scope) {
      case 'global':
        return { command: 'pyenv', args: ['global', version] };
      case 'local':
        return { command: 'pyenv', args: ['local', version] };
      case 'shell':
        return { command: 'pyenv', args: ['shell', version] };
    }
  }

  protected getInitCommand(): { command: string; args: string[] } {
    if (this.isWindows) {
      // Windows pyenv-win doesn't use eval
      return { command: 'pyenv', args: ['rehash'] };
    }
    
    switch (this.shellType) {
      case 'bash':
      case 'zsh':
        return { command: 'eval', args: ['"$(pyenv init -)"'] };
      case 'fish':
        return { command: 'pyenv', args: ['init', '-', '|', 'source'] };
      default:
        return { command: 'eval', args: ['"$(pyenv init -)"'] };
    }
  }

  // Output parsing methods
  protected parseInstalledVersions(_tool: VersionedTool, output: string): VersionInfo[] {
    const versions: VersionInfo[] = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // PyEnv format: "* 3.11.4 (set by /home/user/.pyenv/version)"
      //               "  3.10.12"
      //               "  system"
      const match = line.match(/^(\s*\*?)\s*(\S+)(\s+\(set by.*\))?/);
      if (match) {
        const [, prefix, version] = match;
        if (version !== 'system') {
          versions.push({
            version,
            isInstalled: true,
            isActive: prefix.includes('*'),
            isLTS: false, // Python doesn't have LTS
            isPrerelease: this.isPythonPrerelease(version)
          });
        }
      }
    }
    
    return versions;
  }

  protected parseAvailableVersions(_tool: VersionedTool, output: string): VersionInfo[] {
    const versions: VersionInfo[] = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const version = line.trim();
      // Filter out non-version lines and development versions
      if (version && 
          !version.startsWith('Available versions:') &&
          !version.includes('-dev') &&
          this.isValidPythonVersion(version)) {
        versions.push({
          version,
          isInstalled: false,
          isActive: false,
          isLTS: false,
          isPrerelease: this.isPythonPrerelease(version)
        });
      }
    }
    
    // Sort versions in descending order
    versions.sort((a, b) => this.compareVersions(b.version, a.version));
    
    return versions;
  }

  protected parseCurrentVersion(_tool: VersionedTool, output: string): VersionInfo | null {
    // PyEnv format: "3.11.4 (set by /home/user/.pyenv/version)"
    const match = output.match(/^(\S+)(\s+\(set by.*\))?/);
    
    if (match) {
      const version = match[1];
      if (version === 'system') {
        return null;
      }
      
      return {
        version,
        isInstalled: true,
        isActive: true,
        isLTS: false,
        isPrerelease: this.isPythonPrerelease(version)
      };
    }
    
    return null;
  }

  protected getProjectConfigFileName(): string {
    return '.python-version';
  }

  protected parseProjectConfig(content: string): Record<VersionedTool, VersionSpecifier> {
    const version = content.trim();
    const versions: Partial<Record<VersionedTool, VersionSpecifier>> = {};
    
    if (version && version !== 'system') {
      versions.python = version;
    }
    
    return versions as Record<VersionedTool, VersionSpecifier>;
  }

  protected formatProjectConfig(versions: Record<VersionedTool, VersionSpecifier>): string {
    const pythonVersion = versions.python;
    if (!pythonVersion) {
      return '';
    }
    
    if (typeof pythonVersion === 'string') {
      return pythonVersion + '\n';
    }
    
    // Convert semantic version to string
    return this.formatSemanticVersion(pythonVersion) + '\n';
  }

  protected async getInstallationPath(): Promise<string | undefined> {
    if (this.isWindows) {
      return process.env.PYENV || process.env.PYENV_ROOT || `${this.homeDir}\\.pyenv\\pyenv-win`;
    }
    return process.env.PYENV_ROOT || `${this.homeDir}/.pyenv`;
  }

  protected async getConfigPath(): Promise<string | undefined> {
    // PyEnv doesn't have a central config file
    return undefined;
  }

  // Additional override methods for PyEnv-specific behavior
  protected async updateShellIntegration(enabled: boolean): Promise<void> {
    const profileFile = await this.getShellProfileFile();
    if (!profileFile) return;
    
    const pyenvRoot = await this.getInstallationPath() || `${this.homeDir}/.pyenv`;
    
    let initLines: string[];
    if (this.isWindows) {
      // Windows pyenv-win uses different initialization
      initLines = [
        `$env:PYENV = "${pyenvRoot}"`,
        `$env:Path = "$env:PYENV\\bin;$env:PYENV\\shims;$env:Path"`
      ];
    } else {
      initLines = [
        `export PYENV_ROOT="${pyenvRoot}"`,
        `export PATH="$PYENV_ROOT/bin:$PATH"`,
        `eval "$(pyenv init -)"`
      ];
      
      // Add pyenv-virtualenv if available
      initLines.push(`if command -v pyenv virtualenv-init > /dev/null; then eval "$(pyenv virtualenv-init -)"; fi`);
    }
    
    try {
      const { readFile, writeFile } = await import('fs/promises');
      let content = await readFile(profileFile, 'utf-8');
      
      if (enabled) {
        // Check if PyEnv is already in the profile
        if (!content.includes('PYENV_ROOT') && !content.includes('PYENV')) {
          content += '\n# PyEnv initialization\n' + initLines.join('\n') + '\n';
          await writeFile(profileFile, content, 'utf-8');
        }
      } else {
        // Remove PyEnv initialization
        for (const line of initLines) {
          content = content.replace(new RegExp(`.*${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*\n`, 'g'), '');
        }
        await writeFile(profileFile, content, 'utf-8');
      }
    } catch {
      // Profile file might not exist yet
      if (enabled) {
        const { writeFile } = await import('fs/promises');
        await writeFile(profileFile, '# PyEnv initialization\n' + initLines.join('\n') + '\n', 'utf-8');
      }
    }
  }

  protected async getEnvironmentVariables(): Promise<Record<string, string>> {
    const vars: Record<string, string> = {};
    
    if (process.env.PYENV_ROOT) {
      vars.PYENV_ROOT = process.env.PYENV_ROOT;
    }
    
    if (process.env.PYENV_VERSION) {
      vars.PYENV_VERSION = process.env.PYENV_VERSION;
    }
    
    if (process.env.PYENV_VIRTUALENV_INIT) {
      vars.PYENV_VIRTUALENV_INIT = process.env.PYENV_VIRTUALENV_INIT;
    }
    
    if (this.isWindows && process.env.PYENV) {
      vars.PYENV = process.env.PYENV;
    }
    
    return vars;
  }

  // Helper methods
  private isValidPythonVersion(version: string): boolean {
    // Match standard Python version patterns
    return /^\d+\.\d+\.\d+/.test(version);
  }

  private isPythonPrerelease(version: string): boolean {
    return version.includes('a') || // Alpha
           version.includes('b') || // Beta
           version.includes('rc') || // Release candidate
           version.includes('dev'); // Development
  }

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
} 