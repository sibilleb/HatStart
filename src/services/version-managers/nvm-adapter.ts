/**
 * NVM Version Manager Adapter
 * Implements the unified interface for NVM (Node Version Manager)
 * Handles both Unix (nvm) and Windows (nvm-windows) variants
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
 * NVM adapter implementation
 * Supports Node.js version management with platform-specific implementations
 */
export class NvmAdapter extends BaseVersionManagerAdapter {
  public readonly type: VersionManagerType = 'nvm';
  
  public readonly capabilities: VersionManagerCapabilities = {
    supportedTools: ['node'], // NVM only supports Node.js
    canInstall: true,
    canUninstall: true,
    supportsGlobal: true,
    supportsLocal: true,
    supportsShell: this.platform !== 'windows', // Windows NVM doesn't support shell-specific versions
    supportsAutoSwitch: this.platform !== 'windows',
    supportsLTS: true,
    supportsRemoteList: true,
    requiresShellIntegration: this.platform !== 'windows',
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
   * Install NVM itself
   */
  public async installManager(): Promise<VersionOperationResult> {
    const result = await this.installer.installVersionManager('nvm');
    
    if (result.success) {
      this._status = 'installed';
    }
    
    return {
      success: result.success,
      operation: 'install',
      tool: 'node' as VersionedTool,
      message: result.message,
      error: result.error,
      output: result.output,
      duration: result.duration,
      timestamp: result.timestamp
    };
  }

  // Command generation methods
  protected getVersionCommand(): { command: string; args: string[] } {
    if (this.isWindows) {
      return { command: 'nvm', args: ['version'] };
    }
    return { command: 'nvm', args: ['--version'] };
  }

  protected getListInstalledCommand(_tool: VersionedTool): { command: string; args: string[] } {
    // NVM doesn't need the tool parameter since it only manages Node.js
    return { command: 'nvm', args: ['list'] };
  }

  protected getListAvailableCommand(_tool: VersionedTool): { command: string; args: string[] } {
    // NVM doesn't need the tool parameter since it only manages Node.js
    if (this.isWindows) {
      return { command: 'nvm', args: ['list', 'available'] };
    }
    return { command: 'nvm', args: ['ls-remote'] };
  }

  protected getCurrentVersionCommand(_tool: VersionedTool): { command: string; args: string[] } {
    // NVM doesn't need the tool parameter since it only manages Node.js
    return { command: 'nvm', args: ['current'] };
  }

  protected getInstallCommand(_tool: VersionedTool, version: string): { command: string; args: string[] } {
    return { command: 'nvm', args: ['install', version] };
  }

  protected getUninstallCommand(_tool: VersionedTool, version: string): { command: string; args: string[] } {
    return { command: 'nvm', args: ['uninstall', version] };
  }

  protected getSwitchCommand(
    _tool: VersionedTool, 
    version: string, 
    scope: 'global' | 'local' | 'shell'
  ): { command: string; args: string[] } {
    if (this.isWindows) {
      // Windows NVM only supports global switching
      return { command: 'nvm', args: ['use', version] };
    }
    
    switch (scope) {
      case 'global':
        return { command: 'nvm', args: ['alias', 'default', version] };
      case 'local':
        // For local, we'll create/update .nvmrc file
        return { command: 'echo', args: [version, '>', '.nvmrc'] };
      case 'shell':
        return { command: 'nvm', args: ['use', version] };
    }
  }

  protected getInitCommand(): { command: string; args: string[] } {
    if (this.isWindows) {
      // Windows NVM doesn't require shell initialization
      return { command: 'echo', args: ['NVM for Windows is ready'] };
    }
    
    const nvmDir = process.env.NVM_DIR || `${this.homeDir}/.nvm`;
    
    switch (this.shellType) {
      case 'bash':
      case 'zsh':
        return { 
          command: 'source', 
          args: [`${nvmDir}/nvm.sh`] 
        };
      case 'fish':
        return { 
          command: 'bass', 
          args: ['source', `${nvmDir}/nvm.sh`] 
        };
      default:
        return { 
          command: 'source', 
          args: [`${nvmDir}/nvm.sh`] 
        };
    }
  }

  // Output parsing methods
  protected parseInstalledVersions(_tool: VersionedTool, output: string): VersionInfo[] {
    const versions: VersionInfo[] = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    if (this.isWindows) {
      // Windows format: "  * 18.17.0 (Currently using 64-bit executable)"
      //                 "    16.20.1"
      for (const line of lines) {
        const match = line.match(/^\s*(\*?)\s*(\d+\.\d+\.\d+)/);
        if (match) {
          const [, active, version] = match;
          versions.push({
            version,
            isInstalled: true,
            isActive: active === '*',
            isLTS: this.isNodeLTSVersion(version),
            isPrerelease: false
          });
        }
      }
    } else {
      // Unix format: "->     v18.17.0"
      //              "       v16.20.1"
      for (const line of lines) {
        const match = line.match(/^(\s*->)?\s*v?(\d+\.\d+\.\d+)/);
        if (match) {
          const [, arrow, version] = match;
          versions.push({
            version,
            isInstalled: true,
            isActive: !!arrow,
            isLTS: this.isNodeLTSVersion(version),
            isPrerelease: false
          });
        }
      }
    }
    
    return versions;
  }

  protected parseAvailableVersions(_tool: VersionedTool, output: string): VersionInfo[] {
    const versions: VersionInfo[] = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    if (this.isWindows) {
      // Windows format shows only latest versions in a table
      // |   CURRENT    |     LTS      |  OLD STABLE  | OLD UNSTABLE |
      // |--------------|--------------|--------------|--------------|
      // |    21.2.0    |   20.10.0    |   0.12.18    |   0.11.16    |
      let inTable = false;
      for (const line of lines) {
        if (line.includes('CURRENT') && line.includes('LTS')) {
          inTable = true;
          continue;
        }
        if (inTable && line.includes('|')) {
          const parts = line.split('|').map(p => p.trim()).filter(p => p);
          for (const part of parts) {
            if (part.match(/^\d+\.\d+\.\d+$/)) {
              versions.push({
                version: part,
                isInstalled: false,
                isActive: false,
                isLTS: false, // Will be determined by version number
                isPrerelease: false
              });
            }
          }
        }
      }
    } else {
      // Unix format: "v18.17.0   (Latest LTS: Hydrogen)"
      //              "v16.20.1"
      for (const line of lines) {
        const match = line.match(/^\s*v?(\d+\.\d+\.\d+)(\s+\(.*LTS.*\))?/);
        if (match) {
          const [, version, ltsInfo] = match;
          versions.push({
            version,
            isInstalled: false,
            isActive: false,
            isLTS: !!ltsInfo || this.isNodeLTSVersion(version),
            isPrerelease: false
          });
        }
      }
    }
    
    // Sort versions in descending order
    versions.sort((a, b) => this.compareVersions(b.version, a.version));
    
    return versions;
  }

  protected parseCurrentVersion(_tool: VersionedTool, output: string): VersionInfo | null {
    const version = output.trim().replace(/^v/, '');
    
    if (!version || version === 'none' || version === 'system') {
      return null;
    }
    
    return {
      version,
      isInstalled: true,
      isActive: true,
      isLTS: this.isNodeLTSVersion(version),
      isPrerelease: false
    };
  }

  protected getProjectConfigFileName(): string {
    return '.nvmrc';
  }

  protected parseProjectConfig(content: string): Record<VersionedTool, VersionSpecifier> {
    const version = content.trim().replace(/^v/, '');
    const versions: Partial<Record<VersionedTool, VersionSpecifier>> = {};
    
    if (version) {
      versions.node = version;
    }
    
    return versions as Record<VersionedTool, VersionSpecifier>;
  }

  protected formatProjectConfig(versions: Record<VersionedTool, VersionSpecifier>): string {
    const nodeVersion = versions.node;
    if (!nodeVersion) {
      return '';
    }
    
    if (typeof nodeVersion === 'string') {
      return nodeVersion + '\n';
    }
    
    // Convert semantic version to string
    return this.formatSemanticVersion(nodeVersion) + '\n';
  }

  protected async getInstallationPath(): Promise<string | undefined> {
    if (this.isWindows) {
      return process.env.NVM_HOME || `${process.env.APPDATA}\\nvm`;
    }
    return process.env.NVM_DIR || `${this.homeDir}/.nvm`;
  }

  protected async getConfigPath(): Promise<string | undefined> {
    // NVM doesn't have a central config file
    return undefined;
  }

  // Additional override methods for NVM-specific behavior
  protected async checkShellIntegration(): Promise<boolean> {
    if (this.isWindows) {
      // Windows NVM doesn't require shell integration
      return true;
    }
    
    return super.checkShellIntegration();
  }

  protected async updateShellIntegration(enabled: boolean): Promise<void> {
    if (this.isWindows) {
      // Windows NVM doesn't require shell integration
      return;
    }
    
    const profileFile = await this.getShellProfileFile();
    if (!profileFile) return;
    
    const nvmDir = process.env.NVM_DIR || `${this.homeDir}/.nvm`;
    const initLines = [
      `export NVM_DIR="${nvmDir}"`,
      `[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"  # This loads nvm`,
      `[ -s "$NVM_DIR/bash_completion" ] && \\. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion`
    ];
    
    try {
      const { readFile, writeFile } = await import('fs/promises');
      let content = await readFile(profileFile, 'utf-8');
      
      if (enabled) {
        // Check if NVM is already in the profile
        if (!content.includes('NVM_DIR')) {
          content += '\n# NVM initialization\n' + initLines.join('\n') + '\n';
          await writeFile(profileFile, content, 'utf-8');
        }
      } else {
        // Remove NVM initialization
        for (const line of initLines) {
          content = content.replace(new RegExp(`.*${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*\n`, 'g'), '');
        }
        await writeFile(profileFile, content, 'utf-8');
      }
         } catch {
       // Profile file might not exist yet
       if (enabled) {
         const { writeFile } = await import('fs/promises');
         await writeFile(profileFile, '# NVM initialization\n' + initLines.join('\n') + '\n', 'utf-8');
       }
     }
  }

  protected async getEnvironmentVariables(): Promise<Record<string, string>> {
    const vars: Record<string, string> = {};
    
    if (this.isWindows) {
      if (process.env.NVM_HOME) {
        vars.NVM_HOME = process.env.NVM_HOME;
      }
      if (process.env.NVM_SYMLINK) {
        vars.NVM_SYMLINK = process.env.NVM_SYMLINK;
      }
    } else {
      if (process.env.NVM_DIR) {
        vars.NVM_DIR = process.env.NVM_DIR;
      }
      if (process.env.NVM_BIN) {
        vars.NVM_BIN = process.env.NVM_BIN;
      }
    }
    
    return vars;
  }

  // Helper methods
  private isNodeLTSVersion(version: string): boolean {
    const major = parseInt(version.split('.')[0]);
    return major % 2 === 0 && major >= 14; // Even major versions >= 14 are LTS
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
} 