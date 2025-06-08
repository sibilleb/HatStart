/**
 * Simple Installer Service
 * A minimal implementation that replaces 10,558 lines of over-engineered code
 * with a practical solution for running package manager commands
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface Tool {
  id: string;
  name: string;
  category?: string;
  packageName?: Record<string, string>; // Platform-specific package names
  customInstall?: Record<string, string>; // Custom install commands
  verification?: string; // Command to verify installation
}

export interface InstallResult {
  success: boolean;
  tool: string;
  message: string;
  error?: Error;
}

export type Platform = 'darwin' | 'win32' | 'linux';
export type ProgressCallback = (message: string, progress: number) => void;

/**
 * Simple installer that handles tool installation across platforms
 */
export class SimpleInstaller {
  private platform: Platform;
  
  constructor() {
    this.platform = process.platform as Platform;
  }

  /**
   * Install a single tool
   */
  async install(
    tool: Tool, 
    onProgress?: ProgressCallback
  ): Promise<InstallResult> {
    try {
      onProgress?.(`Installing ${tool.name}...`, 0);

      // Check if already installed
      if (await this.isInstalled(tool)) {
        return {
          success: true,
          tool: tool.id,
          message: `${tool.name} is already installed`
        };
      }

      onProgress?.(`${tool.name} not found, installing...`, 20);

      // Get install command
      const command = this.getInstallCommand(tool);
      if (!command) {
        throw new Error(`No installation method available for ${tool.name} on ${this.platform}`);
      }

      // Execute installation
      onProgress?.(`Running: ${command}`, 40);
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      // Log output for debugging
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

      onProgress?.(`Verifying installation...`, 80);

      // Verify installation
      const installed = await this.isInstalled(tool);
      if (!installed) {
        throw new Error(`${tool.name} installation verification failed`);
      }

      onProgress?.(`✓ ${tool.name} installed successfully`, 100);

      return {
        success: true,
        tool: tool.id,
        message: `Successfully installed ${tool.name}`
      };

    } catch (error) {
      return {
        success: false,
        tool: tool.id,
        message: `Failed to install ${tool.name}: ${error.message}`,
        error: error as Error
      };
    }
  }

  /**
   * Install multiple tools
   */
  async installMultiple(
    tools: Tool[],
    onProgress?: ProgressCallback
  ): Promise<InstallResult[]> {
    const results: InstallResult[] = [];
    
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const overallProgress = (i / tools.length) * 100;
      
      onProgress?.(`Installing ${tool.name} (${i + 1}/${tools.length})`, overallProgress);
      
      const result = await this.install(tool);
      results.push(result);
    }

    return results;
  }

  /**
   * Check if a tool is already installed
   */
  private async isInstalled(tool: Tool): Promise<boolean> {
    try {
      const command = tool.verification || tool.id;
      await execAsync(`${command} --version`);
      return true;
    } catch {
      // Try common variations
      try {
        await execAsync(`${tool.id} -v`);
        return true;
      } catch {
        try {
          await execAsync(`which ${tool.id}`);
          return true;
        } catch {
          return false;
        }
      }
    }
  }

  /**
   * Get the appropriate install command for the platform
   */
  private getInstallCommand(tool: Tool): string | null {
    // Check for custom install command first
    if (tool.customInstall?.[this.platform]) {
      return tool.customInstall[this.platform];
    }

    // Get package name (use tool id if not specified)
    const packageName = tool.packageName?.[this.platform] || tool.id;

    // Return platform-specific package manager command
    switch (this.platform) {
      case 'darwin':
        return `brew install ${packageName}`;
      
      case 'win32':
        // Try chocolatey first, then winget
        return `choco install -y ${packageName} || winget install ${packageName}`;
      
      case 'linux':
        // Detect Linux distribution and use appropriate package manager
        return this.getLinuxInstallCommand(packageName);
      
      default:
        return null;
    }
  }

  /**
   * Get Linux-specific install command based on distribution
   */
  private getLinuxInstallCommand(packageName: string): string {
    // Simple detection - in real use, would check /etc/os-release
    // For MVP, assume Ubuntu/Debian (most common)
    return `sudo apt-get update && sudo apt-get install -y ${packageName}`;
  }

  /**
   * Check if package managers are available
   */
  async checkPrerequisites(): Promise<{
    platform: string;
    packageManager: string;
    available: boolean;
  }> {
    const managers = {
      darwin: 'brew',
      win32: 'choco',
      linux: 'apt-get'
    };

    const manager = managers[this.platform] || 'unknown';

    try {
      await execAsync(`${manager} --version`);
      return {
        platform: this.platform,
        packageManager: manager,
        available: true
      };
    } catch {
      return {
        platform: this.platform,
        packageManager: manager,
        available: false
      };
    }
  }

  /**
   * Get platform-specific setup instructions
   */
  getSetupInstructions(): string {
    switch (this.platform) {
      case 'darwin':
        return 'Install Homebrew: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
      
      case 'win32':
        return 'Install Chocolatey: https://chocolatey.org/install';
      
      case 'linux':
        return 'Package managers are usually pre-installed on Linux';
      
      default:
        return 'Unsupported platform';
    }
  }
}

/**
 * Export a singleton instance for convenience
 */
export const installer = new SimpleInstaller();

/**
 * Helper function to install tools from manifest
 */
export async function installFromManifest(
  manifestPath: string,
  categories?: string[],
  onProgress?: ProgressCallback
): Promise<InstallResult[]> {
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);
    
    // Filter tools by category if specified
    let tools = manifest.tools || [];
    if (categories && categories.length > 0) {
      tools = tools.filter((tool: Tool) => 
        categories.includes(tool.category || 'uncategorized')
      );
    }

    return installer.installMultiple(tools, onProgress);
  } catch (error) {
    throw new Error(`Failed to load manifest: ${error.message}`);
  }
}