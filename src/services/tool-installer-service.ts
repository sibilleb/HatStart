/**
 * Tool Installer Service
 * Bridges the gap between the UI tool selection and the simple installer
 * Replaces the complex CategoryInstaller with straightforward logic
 */

import { SimpleInstaller, Tool, InstallResult, ProgressCallback } from './simple-installer';
import type { SimpleManifest, SimpleTool } from '../shared/simple-manifest';
import type { DetectionResult } from '../shared/detection-types';

export interface InstallOptions {
  dryRun?: boolean;
  force?: boolean; // Install even if already present
  onProgress?: ProgressCallback;
}

/**
 * Service that manages tool installation using the simple installer
 */
export class ToolInstallerService {
  private installer: SimpleInstaller;

  constructor() {
    this.installer = new SimpleInstaller();
  }

  /**
   * Install selected tools from the UI
   */
  async installTools(
    selectedToolIds: string[],
    manifest: SimpleManifest,
    options: InstallOptions = {}
  ): Promise<InstallResult[]> {
    // Convert manifest tools to simple tool format
    const tools: Tool[] = this.convertManifestTools(selectedToolIds, manifest);

    if (options.dryRun) {
      // Just return what would be installed
      return tools.map(tool => ({
        success: true,
        tool: tool.id,
        message: `Would install ${tool.name}`
      }));
    }

    // Check prerequisites
    const prereq = await this.installer.checkPrerequisites();
    if (!prereq.available) {
      throw new Error(
        `Package manager ${prereq.packageManager} not found. ` +
        `Setup instructions: ${this.installer.getSetupInstructions()}`
      );
    }

    // Install tools
    return this.installer.installMultiple(tools, options.onProgress);
  }

  /**
   * Install tools by category
   */
  async installCategory(
    category: string,
    manifest: SimpleManifest,
    options: InstallOptions = {}
  ): Promise<InstallResult[]> {
    // Find all tools in the category
    const categoryTools = manifest.tools.filter(tool => tool.category === category);
    const toolIds = categoryTools.map(tool => tool.id);
    return this.installTools(toolIds, manifest, options);
  }

  /**
   * Convert manifest tools to simple tool format
   */
  private convertManifestTools(
    selectedIds: string[],
    manifest: SimpleManifest
  ): Tool[] {
    const tools: Tool[] = [];

    for (const manifestTool of manifest.tools) {
      if (selectedIds.includes(manifestTool.id)) {
        tools.push({
          id: manifestTool.id,
          name: manifestTool.name,
          category: manifestTool.category,
          packageName: manifestTool.packageNames,
          customInstall: manifestTool.customInstall,
          verification: manifestTool.verification
        });
      }
    }

    return tools;
  }


  /**
   * Get installation summary
   */
  async getInstallationSummary(
    results: InstallResult[]
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    alreadyInstalled: number;
    failures: Array<{ tool: string; error: string }>;
  }> {
    const summary = {
      total: results.length,
      successful: 0,
      failed: 0,
      alreadyInstalled: 0,
      failures: [] as Array<{ tool: string; error: string }>
    };

    for (const result of results) {
      if (result.success) {
        if (result.message.includes('already installed')) {
          summary.alreadyInstalled++;
        } else {
          summary.successful++;
        }
      } else {
        summary.failed++;
        summary.failures.push({
          tool: result.tool,
          error: result.error?.message || result.message
        });
      }
    }

    return summary;
  }
}

// Export singleton instance
export const toolInstaller = new ToolInstallerService();