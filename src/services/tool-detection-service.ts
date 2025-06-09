/**
 * Tool Detection Service
 * Detects installed tools and their versions with caching for performance
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { SimpleTool } from '../shared/simple-manifest-types';

const execAsync = promisify(exec);

export interface ToolDetectionResult {
  toolId: string;
  installed: boolean;
  version?: string;
  lastChecked: Date;
}

interface DetectionCache {
  [toolId: string]: {
    result: ToolDetectionResult;
    expires: number;
  };
}

/**
 * Service for detecting installed tools and their versions
 */
export class ToolDetectionService {
  private cache: DetectionCache = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Detect if a tool is installed and get its version
   */
  async detectTool(tool: SimpleTool): Promise<ToolDetectionResult> {
    // Check cache first
    const cached = this.getFromCache(tool.id);
    if (cached) {
      return cached;
    }

    // Perform detection
    const result = await this.performDetection(tool);
    
    // Cache the result
    this.cacheResult(tool.id, result);
    
    return result;
  }

  /**
   * Detect multiple tools
   */
  async detectMultipleTools(tools: SimpleTool[]): Promise<ToolDetectionResult[]> {
    const results = await Promise.all(
      tools.map(tool => this.detectTool(tool))
    );
    return results;
  }

  /**
   * Clear the cache for a specific tool or all tools
   */
  clearCache(toolId?: string): void {
    if (toolId) {
      delete this.cache[toolId];
    } else {
      this.cache = {};
    }
  }

  /**
   * Get cached result if available and not expired
   */
  private getFromCache(toolId: string): ToolDetectionResult | null {
    const cached = this.cache[toolId];
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
    return null;
  }

  /**
   * Cache a detection result
   */
  private cacheResult(toolId: string, result: ToolDetectionResult): void {
    this.cache[toolId] = {
      result,
      expires: Date.now() + this.CACHE_DURATION
    };
  }

  /**
   * Perform the actual detection for a tool
   */
  private async performDetection(tool: SimpleTool): Promise<ToolDetectionResult> {
    const result: ToolDetectionResult = {
      toolId: tool.id,
      installed: false,
      lastChecked: new Date()
    };

    try {
      // Use the verification command if provided, otherwise default patterns
      if (tool.verification) {
        const { stdout } = await execAsync(tool.verification);
        result.installed = true;
        result.version = this.extractVersion(stdout);
      } else {
        // Try common version command patterns
        result.installed = await this.tryCommonCommands(tool.id);
        if (result.installed) {
          result.version = await this.getToolVersion(tool.id);
        }
      }
    } catch {
      // Tool not found or command failed
      result.installed = false;
    }

    return result;
  }

  /**
   * Try common command patterns to detect if a tool is installed
   */
  private async tryCommonCommands(toolId: string): Promise<boolean> {
    const commands = [
      `${toolId} --version`,
      `${toolId} -v`,
      `${toolId} version`,
      `which ${toolId}`,
      `where ${toolId}` // Windows
    ];

    for (const command of commands) {
      try {
        await execAsync(command);
        return true;
      } catch {
        // Continue to next command
      }
    }

    return false;
  }

  /**
   * Get the version of an installed tool
   */
  private async getToolVersion(toolId: string): Promise<string | undefined> {
    const versionCommands = [
      `${toolId} --version`,
      `${toolId} -v`,
      `${toolId} version`
    ];

    for (const command of versionCommands) {
      try {
        const { stdout } = await execAsync(command);
        const version = this.extractVersion(stdout);
        if (version) return version;
      } catch {
        // Continue to next command
      }
    }

    return undefined;
  }

  /**
   * Extract version number from command output
   */
  private extractVersion(output: string): string | undefined {
    // Common version patterns
    const patterns = [
      /(\d+\.\d+\.\d+)/,           // 1.2.3
      /v?(\d+\.\d+)/,              // v1.2 or 1.2
      /version\s+(\d+\.\d+\.\d+)/i, // version 1.2.3
      /(\d+\.\d+\.\d+\.\d+)/       // 1.2.3.4
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // If no pattern matches, return the first line (cleaned)
    return output.split('\n')[0].trim();
  }
}

// Export singleton instance
export const toolDetectionService = new ToolDetectionService();