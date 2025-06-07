/**
 * Shell Integration Manager
 * Handles shell profile management and environment variable persistence
 */

import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { homedir, platform } from 'os';
import { dirname, join } from 'path';
import type { Platform } from '../../shared/manifest-types.js';
import { createCommandExecutor } from '../command-execution/index.js';
import type {
    EnvironmentVariable,
    IShellIntegrationManager,
    PathEntry,
    ShellIntegration,
    ShellProfile
} from './types.js';

/**
 * Shell integration manager implementation
 */
export class ShellIntegrationManager implements IShellIntegrationManager {
  private platform: Platform;
  private commandExecutor;

  constructor() {
    this.platform = this.detectPlatform();
    this.commandExecutor = createCommandExecutor();
  }

  /**
   * Detect current platform
   */
  private detectPlatform(): Platform {
    const platformName = platform();
    switch (platformName) {
      case 'darwin':
        return 'macos';
      case 'win32':
        return 'windows';
      case 'linux':
        return 'linux';
      default:
        return 'linux'; // Default fallback
    }
  }

  /**
   * Detect available shell profiles
   */
  async detectShellProfiles(): Promise<ShellProfile[]> {
    if (this.platform === 'windows') {
      return [
        'Microsoft.PowerShell_profile.ps1',
      ];
    }

    const profiles: ShellProfile[] = [
      '.bash_profile',
      '.bashrc',
      '.zshrc',
      '.profile',
      '.fish/config.fish',
    ];

    // Check which profiles actually exist
    const existingProfiles: ShellProfile[] = [];

    for (const profile of profiles) {
      const profilePath = this.getShellProfilePath(profile);
      try {
        await access(profilePath);
        existingProfiles.push(profile);
      } catch {
        // Profile doesn't exist
      }
    }

    return existingProfiles;
  }

  /**
   * Get current shell type
   */
  async getCurrentShell(): Promise<string> {
    try {
      if (this.platform === 'windows') {
        return 'powershell';
      }

      const result = await this.commandExecutor.execute('echo', ['$SHELL']);
      if (result.success && result.stdout) {
        const shell = result.stdout.trim();
        return shell.split('/').pop() || 'bash';
      }
      return 'bash';
    } catch {
      return this.platform === 'windows' ? 'powershell' : 'bash';
    }
  }

  /**
   * Get shell profile file path
   */
  private getShellProfilePath(profile: ShellProfile): string {
    const homeDir = homedir();

    switch (profile) {
      case '.bash_profile':
        return join(homeDir, '.bash_profile');
      case '.bashrc':
        return join(homeDir, '.bashrc');
      case '.zshrc':
        return join(homeDir, '.zshrc');
      case '.zsh_profile':
        return join(homeDir, '.zsh_profile');
      case '.fish/config.fish':
        return join(homeDir, '.config', 'fish', 'config.fish');
      case '.profile':
        return join(homeDir, '.profile');
      case 'Microsoft.PowerShell_profile.ps1':
        return join(homeDir, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
      default:
        throw new Error(`Unknown shell profile: ${profile}`);
    }
  }

  /**
   * Read shell profile content
   */
  async readShellProfile(profile: ShellProfile): Promise<string> {
    if (profile === 'cmd_autorun') {
      // Read from Windows registry
      try {
        const result = await this.commandExecutor.execute('reg', [
          'query',
          'HKCU\\Software\\Microsoft\\Command Processor',
          '/v',
          'AutoRun',
        ]);
        
        if (result.success && result.stdout) {
          const match = result.stdout.match(/AutoRun\s+REG_SZ\s+(.+)/);
          return match ? match[1].trim() : '';
        }
        return '';
      } catch {
        return '';
      }
    }

    const profilePath = this.getShellProfilePath(profile);
    try {
      return await readFile(profilePath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Write shell profile content
   */
  async writeShellProfile(profile: ShellProfile, content: string): Promise<void> {
    if (profile === 'cmd_autorun') {
      // Write to Windows registry
      if (content.trim()) {
        await this.commandExecutor.execute('reg', [
          'add',
          'HKCU\\Software\\Microsoft\\Command Processor',
          '/v',
          'AutoRun',
          '/t',
          'REG_SZ',
          '/d',
          content,
          '/f',
        ]);
      } else {
        // Delete the registry key if content is empty
        try {
          await this.commandExecutor.execute('reg', [
            'delete',
            'HKCU\\Software\\Microsoft\\Command Processor',
            '/v',
            'AutoRun',
            '/f',
          ]);
        } catch {
          // Key might not exist
        }
      }
      return;
    }

    const profilePath = this.getShellProfilePath(profile);
    
    // Ensure directory exists
    await mkdir(dirname(profilePath), { recursive: true });
    
    await writeFile(profilePath, content, 'utf-8');
  }

  /**
   * Create backup of shell profile
   */
  async createBackup(profile: ShellProfile): Promise<string> {
    const content = await this.readShellProfile(profile);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.getShellProfilePath(profile)}.backup.${timestamp}`;
    
    if (profile !== 'cmd_autorun') {
      await writeFile(backupPath, content, 'utf-8');
    }
    
    return backupPath;
  }

  /**
   * Restore shell profile from backup
   */
  async restoreFromBackup(profile: ShellProfile, backupPath: string): Promise<void> {
    if (profile === 'cmd_autorun') {
      throw new Error('Cannot restore CMD autorun from file backup');
    }

    const content = await readFile(backupPath, 'utf-8');
    await this.writeShellProfile(profile, content);
  }

  /**
   * Add environment variable to shell profile
   */
  async addEnvironmentVariable(
    profile: ShellProfile,
    variable: EnvironmentVariable,
  ): Promise<void> {
    const content = await this.readShellProfile(profile);
    const newContent = this.addVariableToContent(content, variable, profile);
    await this.writeShellProfile(profile, newContent);
  }

  /**
   * Remove environment variable from shell profile
   */
  async removeEnvironmentVariable(
    profile: ShellProfile,
    variableName: string,
  ): Promise<void> {
    const content = await this.readShellProfile(profile);
    const newContent = this.removeVariableFromContent(content, variableName, profile);
    await this.writeShellProfile(profile, newContent);
  }

  /**
   * Add PATH entry to shell profile
   */
  async addPathEntry(profile: ShellProfile, pathEntry: PathEntry): Promise<void> {
    const content = await this.readShellProfile(profile);
    const newContent = this.addPathToContent(content, pathEntry, profile);
    await this.writeShellProfile(profile, newContent);
  }

  /**
   * Remove PATH entry from shell profile
   */
  async removePathEntry(profile: ShellProfile, path: string): Promise<void> {
    const content = await this.readShellProfile(profile);
    const newContent = this.removePathFromContent(content, path, profile);
    await this.writeShellProfile(profile, newContent);
  }

  /**
   * Install shell integration
   */
  async installShellIntegration(integration: ShellIntegration): Promise<void> {
    const profiles = await this.getAvailableShellProfiles();
    
    for (const profile of profiles) {
      if (integration.backupBeforeModification) {
        await this.createBackup(profile);
      }

      // Add environment variables
      for (const variable of integration.environmentVariables) {
        await this.addEnvironmentVariable(profile, variable);
      }

      // Add PATH entries
      for (const pathEntry of integration.pathEntries) {
        await this.addPathEntry(profile, pathEntry);
      }

      // Add custom initialization script
      if (integration.initializationScript) {
        const content = await this.readShellProfile(profile);
        const scriptComment = `# HatStart initialization script`;
        const newContent = content.includes(scriptComment)
          ? content
          : `${content}\n\n${scriptComment}\n${integration.initializationScript}\n`;
        await this.writeShellProfile(profile, newContent);
      }
    }
  }

  /**
   * Uninstall shell integration
   */
  async uninstallShellIntegration(integration: ShellIntegration): Promise<void> {
    const profiles = await this.getAvailableShellProfiles();
    
    for (const profile of profiles) {
      // Remove environment variables
      for (const variable of integration.environmentVariables) {
        await this.removeEnvironmentVariable(profile, variable.name);
      }

      // Remove PATH entries
      for (const pathEntry of integration.pathEntries) {
        await this.removePathEntry(profile, pathEntry.path);
      }

      // Remove initialization script
      if (integration.initializationScript) {
        const content = await this.readShellProfile(profile);
        const scriptComment = `# HatStart initialization script`;
        const lines = content.split('\n');
        const startIndex = lines.findIndex(line => line.includes(scriptComment));
        
        if (startIndex !== -1) {
          // Find the end of the script block
          let endIndex = startIndex + 1;
          while (endIndex < lines.length && !lines[endIndex].startsWith('#')) {
            endIndex++;
          }
          
          // Remove the script block
          lines.splice(startIndex, endIndex - startIndex);
          await this.writeShellProfile(profile, lines.join('\n'));
        }
      }
    }
  }

  /**
   * Add variable to shell profile content
   */
  private addVariableToContent(
    content: string,
    variable: EnvironmentVariable,
    profile: ShellProfile,
  ): string {
    const { name, value } = variable;
    
    // Remove existing variable if present
    const cleanContent = this.removeVariableFromContent(content, name, profile);
    
    let exportLine: string;
    
    if (profile.includes('powershell')) {
      exportLine = `$env:${name} = "${value}"`;
    } else if (profile === 'cmd_autorun') {
      exportLine = `set ${name}=${value}`;
    } else if (profile === 'fish_config') {
      exportLine = `set -gx ${name} "${value}"`;
    } else {
      // Bash/Zsh/POSIX shells
      exportLine = `export ${name}="${value}"`;
    }
    
    return `${cleanContent}\n${exportLine}`;
  }

  /**
   * Remove variable from shell profile content
   */
  private removeVariableFromContent(
    content: string,
    variableName: string,
    profile: ShellProfile,
  ): string {
    const lines = content.split('\n');
    
    let pattern: RegExp;
    
    if (profile.includes('powershell')) {
      pattern = new RegExp(`^\\s*\\$env:${variableName}\\s*=`, 'i');
    } else if (profile === 'cmd_autorun') {
      pattern = new RegExp(`^\\s*set\\s+${variableName}\\s*=`, 'i');
    } else if (profile === 'fish_config') {
      pattern = new RegExp(`^\\s*set\\s+(-gx\\s+)?${variableName}\\s+`, 'i');
    } else {
      // Bash/Zsh/POSIX shells
      pattern = new RegExp(`^\\s*(export\\s+)?${variableName}\\s*=`, 'i');
    }
    
    return lines.filter(line => !pattern.test(line)).join('\n');
  }

  /**
   * Add PATH entry to shell profile content
   */
  private addPathToContent(
    content: string,
    pathEntry: PathEntry,
    profile: ShellProfile,
  ): string {
    const { path, position = 'append' } = pathEntry;
    
    // Remove existing PATH entry if present
    const cleanContent = this.removePathFromContent(content, path, profile);
    
    let pathLine: string;
    
    if (profile.includes('powershell')) {
      if (position === 'prepend') {
        pathLine = `$env:PATH = "${path};$env:PATH"`;
      } else {
        pathLine = `$env:PATH = "$env:PATH;${path}"`;
      }
    } else if (profile === 'cmd_autorun') {
      if (position === 'prepend') {
        pathLine = `set PATH=${path};%PATH%`;
      } else {
        pathLine = `set PATH=%PATH%;${path}`;
      }
    } else if (profile === 'fish_config') {
      if (position === 'prepend') {
        pathLine = `set -gx PATH "${path}" $PATH`;
      } else {
        pathLine = `set -gx PATH $PATH "${path}"`;
      }
    } else {
      // Bash/Zsh/POSIX shells
      if (position === 'prepend') {
        pathLine = `export PATH="${path}:$PATH"`;
      } else {
        pathLine = `export PATH="$PATH:${path}"`;
      }
    }
    
    return `${cleanContent}\n${pathLine}`;
  }

  /**
   * Remove PATH entry from shell profile content
   */
  private removePathFromContent(
    content: string,
    path: string,
    profile: ShellProfile,
  ): string {
    const lines = content.split('\n');
    const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    let pattern: RegExp;
    
    if (profile.includes('powershell')) {
      pattern = new RegExp(`\\$env:PATH\\s*=\\s*"[^"]*${escapedPath}[^"]*"`, 'i');
    } else if (profile === 'cmd_autorun') {
      pattern = new RegExp(`set\\s+PATH\\s*=\\s*[^\\n]*${escapedPath}`, 'i');
    } else if (profile === 'fish_config') {
      pattern = new RegExp(`set\\s+(-gx\\s+)?PATH\\s+[^\\n]*${escapedPath}`, 'i');
    } else {
      // Bash/Zsh/POSIX shells
      pattern = new RegExp(`export\\s+PATH\\s*=\\s*"[^"]*${escapedPath}[^"]*"`, 'i');
    }
    
    return lines.filter(line => !pattern.test(line)).join('\n');
  }
} 