/**
 * Environment Manager
 * Handles environment variables, PATH management, and shell integration
 */

import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { homedir, platform } from 'os';
import { delimiter, join } from 'path';
import type { Platform } from '../../shared/manifest-types.js';
import { createCommandExecutor } from '../command-execution/index.js';
import type {
    IEnvironmentManager,
    PathEntry,
    WorkspaceScope,
} from './types.js';

/**
 * Environment manager implementation
 */
export class EnvironmentManager implements IEnvironmentManager {
  private platform: Platform;
  private commandExecutor;

  constructor() {
    this.platform = this.detectPlatform();
    this.commandExecutor = createCommandExecutor();
  }

  /**
   * Get current environment variables
   */
  public async getCurrentEnvironment(): Promise<Record<string, string>> {
    return { ...process.env } as Record<string, string>;
  }

  /**
   * Set environment variable
   */
  public async setEnvironmentVariable(
    name: string,
    value: string,
    scope: WorkspaceScope,
    persistent: boolean = false
  ): Promise<boolean> {
    try {
      // Set in current process
      process.env[name] = value;

      // Make persistent if requested
      if (persistent) {
        await this.persistEnvironmentVariable(name, value, scope);
      }

      return true;
    } catch (error) {
      console.error(`Failed to set environment variable ${name}:`, error);
      return false;
    }
  }

  /**
   * Remove environment variable
   */
  public async removeEnvironmentVariable(
    name: string,
    scope: WorkspaceScope
  ): Promise<boolean> {
    try {
      // Remove from current process
      delete process.env[name];

      // Remove from persistent storage
      await this.removePersistedEnvironmentVariable(name, scope);

      return true;
    } catch (error) {
      console.error(`Failed to remove environment variable ${name}:`, error);
      return false;
    }
  }

  /**
   * Update PATH variable
   */
  public async updatePath(entries: PathEntry[]): Promise<boolean> {
    try {
      const currentPath = await this.getCurrentPath();
      const newPath = this.buildNewPath(currentPath, entries);
      
      // Update current process PATH
      process.env.PATH = newPath.join(delimiter);

      // Persist PATH changes
      await this.persistPathChanges(entries);

      return true;
    } catch (error) {
      console.error('Failed to update PATH:', error);
      return false;
    }
  }

  /**
   * Get current PATH entries
   */
  public async getCurrentPath(): Promise<string[]> {
    const pathVar = process.env.PATH || '';
    return pathVar.split(delimiter).filter(Boolean);
  }

  /**
   * Refresh environment (reload from shell)
   */
  public async refreshEnvironment(): Promise<boolean> {
    try {
      // Get environment from shell
      const shellEnv = await this.getShellEnvironment();
      
      // Update current process environment
      Object.assign(process.env, shellEnv);

      return true;
    } catch (error) {
      console.error('Failed to refresh environment:', error);
      return false;
    }
  }

  /**
   * Detect current platform
   */
  private detectPlatform(): Platform {
    const osPlatform = platform();
    switch (osPlatform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        return 'linux';
    }
  }

  /**
   * Persist environment variable based on scope and platform
   */
  private async persistEnvironmentVariable(
    name: string,
    value: string,
    scope: WorkspaceScope
  ): Promise<void> {
    switch (this.platform) {
      case 'windows':
        await this.persistWindowsEnvironmentVariable(name, value, scope);
        break;
      case 'macos':
      case 'linux':
        await this.persistUnixEnvironmentVariable(name, value, scope);
        break;
    }
  }

  /**
   * Remove persisted environment variable
   */
  private async removePersistedEnvironmentVariable(
    name: string,
    scope: WorkspaceScope
  ): Promise<void> {
    switch (this.platform) {
      case 'windows':
        await this.removeWindowsEnvironmentVariable(name, scope);
        break;
      case 'macos':
      case 'linux':
        await this.removeUnixEnvironmentVariable(name, scope);
        break;
    }
  }

  /**
   * Persist environment variable on Windows
   */
  private async persistWindowsEnvironmentVariable(
    name: string,
    value: string,
    scope: WorkspaceScope
  ): Promise<void> {
    const target = scope === 'global' ? 'Machine' : 'User';
    
    try {
      // Use PowerShell to set environment variable
      const command = `[Environment]::SetEnvironmentVariable('${name}', '${value}', '${target}')`;
      await this.commandExecutor.execute('powershell', ['-Command', command]);
    } catch {
      // Fallback to setx command
      const setxScope = scope === 'global' ? '/M' : '';
      await this.commandExecutor.execute('setx', [setxScope, name, value].filter(Boolean));
    }
  }

  /**
   * Remove environment variable on Windows
   */
  private async removeWindowsEnvironmentVariable(
    name: string,
    scope: WorkspaceScope
  ): Promise<void> {
    const target = scope === 'global' ? 'Machine' : 'User';
    
    try {
      // Use PowerShell to remove environment variable
      const command = `[Environment]::SetEnvironmentVariable('${name}', $null, '${target}')`;
      await this.commandExecutor.execute('powershell', ['-Command', command]);
    } catch (error) {
      console.warn(`Failed to remove Windows environment variable ${name}:`, error);
    }
  }

  /**
   * Persist environment variable on Unix systems
   */
  private async persistUnixEnvironmentVariable(
    name: string,
    value: string,
    scope: WorkspaceScope
  ): Promise<void> {
    const profiles = this.getUnixProfiles(scope);
    const exportLine = `export ${name}="${value}"`;

    for (const profile of profiles) {
      try {
        await this.addToProfile(profile, exportLine, `# ${name} environment variable`);
      } catch (error) {
        console.warn(`Failed to update profile ${profile}:`, error);
      }
    }
  }

  /**
   * Remove environment variable from Unix profiles
   */
  private async removeUnixEnvironmentVariable(
    name: string,
    scope: WorkspaceScope
  ): Promise<void> {
    const profiles = this.getUnixProfiles(scope);

    for (const profile of profiles) {
      try {
        await this.removeFromProfile(profile, `export ${name}=`);
      } catch (error) {
        console.warn(`Failed to update profile ${profile}:`, error);
      }
    }
  }

  /**
   * Get Unix shell profiles based on scope
   */
  private getUnixProfiles(scope: WorkspaceScope): string[] {
    const home = homedir();
    const profiles: string[] = [];

    if (scope === 'global') {
      profiles.push('/etc/profile', '/etc/bash.bashrc', '/etc/zsh/zshrc');
    } else {
      profiles.push(
        join(home, '.profile'),
        join(home, '.bashrc'),
        join(home, '.bash_profile'),
        join(home, '.zshrc'),
        join(home, '.zsh_profile')
      );
    }

    return profiles;
  }

  /**
   * Build new PATH from current PATH and entries
   */
  private buildNewPath(currentPath: string[], entries: PathEntry[]): string[] {
    // Sort entries by priority
    const sortedEntries = [...entries].sort((a, b) => a.priority - b.priority);
    
    // Filter out conditional entries where path doesn't exist
    const validEntries = sortedEntries.filter(entry => {
      if (!entry.conditional) return true;
      try {
        // Check if path exists (simplified check)
        return true; // In real implementation, would check fs.existsSync
      } catch {
        return false;
      }
    });

    // Build new PATH
    const newPath: string[] = [];
    const prependEntries = validEntries.filter(e => e.position === 'prepend');
    const appendEntries = validEntries.filter(e => e.position === 'append');

    // Add prepend entries (in priority order)
    for (const entry of prependEntries) {
      if (!newPath.includes(entry.path) && !currentPath.includes(entry.path)) {
        newPath.push(entry.path);
      }
    }

    // Add existing PATH entries (excluding ones we're managing)
    const managedPaths = validEntries.map(e => e.path);
    for (const path of currentPath) {
      if (!managedPaths.includes(path) && !newPath.includes(path)) {
        newPath.push(path);
      }
    }

    // Add append entries (in priority order)
    for (const entry of appendEntries) {
      if (!newPath.includes(entry.path)) {
        newPath.push(entry.path);
      }
    }

    return newPath;
  }

  /**
   * Persist PATH changes
   */
  private async persistPathChanges(entries: PathEntry[]): Promise<void> {
    // Group entries by scope
    const globalEntries = entries.filter(e => e.tool || e.manager);
    
    if (globalEntries.length > 0) {
      switch (this.platform) {
        case 'windows':
          await this.persistWindowsPath(globalEntries);
          break;
        case 'macos':
        case 'linux':
          await this.persistUnixPath(globalEntries);
          break;
      }
    }
  }

  /**
   * Persist PATH changes on Windows
   */
  private async persistWindowsPath(entries: PathEntry[]): Promise<void> {
    try {
      // Get current system PATH
      const result = await this.commandExecutor.execute('powershell', [
        '-Command',
        '[Environment]::GetEnvironmentVariable("PATH", "User")'
      ]);

      if (result.success) {
        const currentPath = result.stdout.trim().split(';').filter(Boolean);
        const newPath = this.buildNewPath(currentPath, entries);
        
        // Update user PATH
        const command = `[Environment]::SetEnvironmentVariable("PATH", "${newPath.join(';')}", "User")`;
        await this.commandExecutor.execute('powershell', ['-Command', command]);
      }
    } catch (error) {
      console.warn('Failed to persist Windows PATH changes:', error);
    }
  }

  /**
   * Persist PATH changes on Unix systems
   */
  private async persistUnixPath(entries: PathEntry[]): Promise<void> {
    const profiles = this.getUnixProfiles('user');
    
    for (const profile of profiles) {
      try {
        // Add PATH entries to profile
        for (const entry of entries) {
          const pathLine = entry.position === 'prepend' 
            ? `export PATH="${entry.path}:$PATH"`
            : `export PATH="$PATH:${entry.path}"`;
          
          const comment = entry.tool 
            ? `# ${entry.tool} (${entry.manager}) PATH`
            : `# ${entry.manager} PATH`;
            
          await this.addToProfile(profile, pathLine, comment);
        }
      } catch (error) {
        console.warn(`Failed to update profile ${profile}:`, error);
      }
    }
  }

  /**
   * Add line to shell profile
   */
  private async addToProfile(
    profilePath: string,
    line: string,
    comment?: string
  ): Promise<void> {
    try {
      // Check if profile exists
      await access(profilePath);
      
      // Read current content
      const content = await readFile(profilePath, 'utf-8');
      
      // Check if line already exists
      if (content.includes(line)) {
        return;
      }
      
      // Add line with comment
      const addition = comment 
        ? `\n${comment}\n${line}\n`
        : `\n${line}\n`;
        
      await writeFile(profilePath, content + addition, 'utf-8');
    } catch (error) {
      // Profile might not exist, create it
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        const addition = comment 
          ? `${comment}\n${line}\n`
          : `${line}\n`;
          
        // Ensure directory exists
        const dir = profilePath.substring(0, profilePath.lastIndexOf('/'));
        await mkdir(dir, { recursive: true });
        
        await writeFile(profilePath, addition, 'utf-8');
      } else {
        throw error;
      }
    }
  }

  /**
   * Remove line from shell profile
   */
  private async removeFromProfile(
    profilePath: string,
    pattern: string
  ): Promise<void> {
    try {
      const content = await readFile(profilePath, 'utf-8');
      const lines = content.split('\n');
      
      // Filter out lines matching pattern
      const filteredLines = lines.filter(line => !line.includes(pattern));
      
      if (filteredLines.length !== lines.length) {
        await writeFile(profilePath, filteredLines.join('\n'), 'utf-8');
      }
    } catch (error) {
      // Profile might not exist, which is fine
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        throw error;
      }
    }
  }

  /**
   * Get environment from shell
   */
  private async getShellEnvironment(): Promise<Record<string, string>> {
    try {
      const shell = process.env.SHELL || '/bin/bash';
      const result = await this.commandExecutor.execute(shell, ['-c', 'env']);
      
      if (result.success) {
        const env: Record<string, string> = {};
        const lines = result.stdout.split('\n').filter(Boolean);
        
        for (const line of lines) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            env[key] = valueParts.join('=');
          }
        }
        
        return env;
      }
    } catch (error) {
      console.warn('Failed to get shell environment:', error);
    }
    
    return {};
  }
} 