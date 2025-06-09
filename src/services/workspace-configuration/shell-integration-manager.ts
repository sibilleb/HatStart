/**
 * Shell Integration Manager
 * Handles shell profile management and environment variable persistence
 */

import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { homedir, platform } from 'os';
import { dirname, join } from 'path';
import type { Platform } from '../../shared/simple-manifest-types';
import { createCommandExecutor } from '../command-execution/index';
import type { ICommandExecutor } from '../command-execution/types';
import type {
    IShellIntegrationManager,
    ShellIntegration,
    ShellProfile
} from './types';

/**
 * Shell integration manager implementation
 * 
 * Manages shell profile modifications and environment setup for version managers
 * and development tools. Provides cross-platform shell integration capabilities.
 */
export class ShellIntegrationManager implements IShellIntegrationManager {
  private readonly platform: Platform;
  private readonly commandExecutor: ICommandExecutor;

  constructor() {
    this.platform = platform() as Platform;
    this.commandExecutor = createCommandExecutor();
  }

  /**
   * Detect available shell profiles
   */
  async detectShellProfiles(): Promise<ShellProfile[]> {
    const profiles: ShellProfile[] = [];
    const homeDir = homedir();

    const possibleProfiles: ShellProfile[] = [
      '.bashrc',
      '.bash_profile', 
      '.zshrc',
      '.zsh_profile',
      '.profile',
      '.fish/config.fish'
    ];

    if (this.platform === 'windows') {
      possibleProfiles.push('Microsoft.PowerShell_profile.ps1', 'cmd_autorun');
    }

    for (const profile of possibleProfiles) {
      try {
        const profilePath = join(homeDir, profile);
        await access(profilePath);
        profiles.push(profile);
      } catch {
        // Profile doesn't exist
      }
    }

    return profiles;
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
        const shellName = shell.split('/').pop() || 'bash';
        return shellName;
      }
      return 'bash';
    } catch {
      return 'bash';
    }
  }

  /**
   * Update shell profile with integration
   */
  async updateShellProfile(
    profile: ShellProfile,
    integration: ShellIntegration
  ): Promise<boolean> {
    try {
      const profilePath = this.getProfilePath(profile);
      
      // Create backup if requested
      if (integration.backupBeforeModification) {
        await this.backupShellProfile(profile);
      }

      // Apply the integration
      await this.writeIntegrationToProfile(profilePath, integration);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove shell integration from profile
   */
  async removeShellIntegration(
    profile: ShellProfile,
    integration: ShellIntegration
  ): Promise<boolean> {
    try {
      const profilePath = this.getProfilePath(profile);
      await this.removeIntegrationFromProfile(profilePath, integration);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create backup of shell profile
   */
  async backupShellProfile(profile: ShellProfile): Promise<string> {
    const profilePath = this.getProfilePath(profile);
    const backupPath = `${profilePath}.backup.${Date.now()}`;
    
    try {
      await access(profilePath);
      const content = await readFile(profilePath, 'utf-8');
      await writeFile(backupPath, content, 'utf-8');
      return backupPath;
    } catch {
      // Profile doesn't exist, create empty backup
      await writeFile(backupPath, '', 'utf-8');
      return backupPath;
    }
  }

  /**
   * Restore shell profile from backup
   */
  async restoreShellProfile(profile: ShellProfile, backupPath: string): Promise<boolean> {
    try {
      const profilePath = this.getProfilePath(profile);
      const content = await readFile(backupPath, 'utf-8');
      await writeFile(profilePath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the full path to a shell profile file
   */
  private getProfilePath(profile: ShellProfile): string {
    const homeDir = homedir();
    
    if (profile === 'cmd_autorun') {
      // Windows CMD autorun registry key - not a file path
      return 'HKEY_CURRENT_USER\\Software\\Microsoft\\Command Processor\\AutoRun';
    }
    
    return join(homeDir, profile);
  }

  /**
   * Write integration commands to shell profile
   */
  private async writeIntegrationToProfile(
    profilePath: string, 
    integration: ShellIntegration
  ): Promise<void> {
    // Ensure directory exists
    await mkdir(dirname(profilePath), { recursive: true });

    let content = '';
    try {
      content = await readFile(profilePath, 'utf-8');
    } catch {
      // File doesn't exist, start with empty content
    }

    // Build integration content
    const integrationContent = this.buildIntegrationContent(integration);
    
    // Check if integration is already present
    if (!content.includes(integrationContent)) {
      content += '\n' + integrationContent + '\n';
      await writeFile(profilePath, content, 'utf-8');
    }
  }

  /**
   * Remove integration commands from shell profile
   */
  private async removeIntegrationFromProfile(
    profilePath: string,
    integration: ShellIntegration
  ): Promise<void> {
    try {
      const content = await readFile(profilePath, 'utf-8');
      const integrationContent = this.buildIntegrationContent(integration);
      
      const updatedContent = content.replace(integrationContent, '').trim();
      await writeFile(profilePath, updatedContent, 'utf-8');
    } catch {
      // Profile doesn't exist, nothing to remove
    }
  }

  /**
   * Build the shell integration content string
   */
  private buildIntegrationContent(integration: ShellIntegration): string {
    const lines: string[] = [];
    
    // Add environment variables
    for (const envVar of integration.environmentVariables) {
      if (envVar.operation === 'set') {
        lines.push(`export ${envVar.name}="${envVar.value}"`);
      }
    }
    
    // Add PATH entries
    for (const pathEntry of integration.pathEntries) {
      if (pathEntry.position === 'prepend') {
        lines.push(`export PATH="${pathEntry.path}:$PATH"`);
      } else {
        lines.push(`export PATH="$PATH:${pathEntry.path}"`);
      }
    }
    
    // Add initialization commands
    lines.push(...integration.initCommands);
    
    return lines.join('\n');
  }
} 