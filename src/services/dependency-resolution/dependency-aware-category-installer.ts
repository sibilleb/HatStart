/**
 * Dependency-Aware Category Installer
 * Enhanced CategoryInstaller with integrated dependency resolution
 */

import {
  CategoryInstaller,
  type ICategoryInstaller,
  type CategoryInstallationConfig
} from '../category-installer.js';
import {
  DependencyGraph,
  DependencyGraphBuilder,
  DependencyResolver,
  ConflictDetector,
  ConflictResolver,
  buildGraphFromManifests,
  resolveInstallationOrder,
  detectConflicts,
  resolveConflicts,
  type ResolutionExecutionResult,
  type ConflictDetectionResult,
  type InstallationOrder,
  type ResolutionPolicy
} from './index.js';
import type {
  InstallationCommand,
  ToolCategory,
  ToolManifest,
  Platform,
  Architecture
} from '../../shared/manifest-types.js';
import type { InstallationOptions } from '../installer-types.js';

/**
 * Dependency resolution configuration for category installer
 */
export interface DependencyResolutionConfig {
  /** Enable dependency resolution for this installation */
  enabled: boolean;
  /** Resolution strategy */
  strategy: 'eager' | 'lazy' | 'conflict-aware';
  /** Include optional dependencies */
  includeOptional: boolean;
  /** Include suggested dependencies */
  includeSuggested: boolean;
  /** Maximum resolution depth */
  maxDepth: number;
  /** Conflict resolution policy */
  conflictPolicy: Partial<ResolutionPolicy>;
  /** Native package manager integration */
  nativePackageManagerIntegration: boolean;
  /** Manifest cache TTL in milliseconds */
  manifestCacheTTL: number;
}

/**
 * Enhanced installation options with dependency resolution
 */
export interface DependencyAwareInstallationOptions extends InstallationOptions {
  /** Dependency resolution configuration */
  dependencyResolution?: Partial<DependencyResolutionConfig>;
  /** Tool manifests for dependency resolution */
  toolManifests?: Map<string, ToolManifest>;
  /** Target platform for dependency resolution */
  targetPlatform?: Platform;
  /** Target architecture for dependency resolution */
  targetArchitecture?: Architecture;
}

/**
 * Dependency resolution result with installation context
 */
export interface DependencyInstallationResult {
  /** Installation order determined by dependency resolution */
  installationOrder: InstallationOrder;
  /** Conflicts detected during resolution */
  conflicts: ConflictDetectionResult;
  /** Resolution execution result */
  resolution: ResolutionExecutionResult;
  /** Tools that need to be installed */
  toolsToInstall: string[];
  /** Tools that are already installed */
  alreadyInstalled: string[];
  /** Installation statistics */
  statistics: {
    totalTools: number;
    dependenciesResolved: number;
    conflictsDetected: number;
    conflictsResolved: number;
    resolutionTime: number;
  };
}

/**
 * Native package manager integration
 */
export interface NativePackageManagerInfo {
  /** Package manager type */
  type: 'apt' | 'yum' | 'homebrew' | 'chocolatey' | 'winget' | 'snap' | 'flatpak';
  /** Available packages */
  availablePackages: Map<string, NativePackageInfo>;
  /** Installed packages */
  installedPackages: Map<string, NativePackageInfo>;
}

/**
 * Native package information
 */
export interface NativePackageInfo {
  /** Package name */
  name: string;
  /** Available versions */
  versions: string[];
  /** Currently installed version */
  installedVersion?: string;
  /** Package dependencies */
  dependencies: string[];
  /** Description */
  description: string;
}

/**
 * Enhanced category installer with dependency resolution capabilities
 */
export class DependencyAwareCategoryInstaller extends CategoryInstaller implements ICategoryInstaller {
  private dependencyGraph: DependencyGraph;
  private manifestCache: Map<string, { manifest: ToolManifest; timestamp: number }> = new Map();
  private nativePackageManagerCache: Map<Platform, NativePackageManagerInfo> = new Map();
  private resolutionCache: Map<string, DependencyInstallationResult> = new Map();

  constructor() {
    super();
    this.dependencyGraph = new DependencyGraph();
  }

  /**
   * Enhanced pre-installation with dependency resolution
   */
  public async executePreInstallationSteps(
    command: InstallationCommand,
    category: ToolCategory,
    options: DependencyAwareInstallationOptions
  ): Promise<void> {
    // Execute base pre-installation steps
    await super.executePreInstallationSteps(command, category, options);

    // Perform dependency resolution if enabled
    if (this.isDependencyResolutionEnabled(options)) {
      await this.performDependencyResolution(command, category, options);
    }
  }

  /**
   * Perform comprehensive dependency resolution
   */
  public async performDependencyResolution(
    command: InstallationCommand,
    category: ToolCategory,
    options: DependencyAwareInstallationOptions
  ): Promise<DependencyInstallationResult> {
    const startTime = Date.now();
    console.log(`Starting dependency resolution for ${command.command}`);

    try {
      // Get dependency resolution configuration
      const config = this.getDependencyResolutionConfig(options);

      // Load tool manifests
      const manifests = await this.loadToolManifests(command, options);

      // Build dependency graph
      console.log('Building dependency graph...');
      const graph = await this.buildDependencyGraph(manifests, options);

      // Detect conflicts
      console.log('Detecting conflicts...');
      const conflicts = await this.detectDependencyConflicts(graph, [command.command], options);

      // Resolve conflicts if any
      let resolution: ResolutionExecutionResult;
      if (conflicts.hasConflicts) {
        console.log(`Detected ${conflicts.conflicts.length} conflicts, attempting resolution...`);
        resolution = await this.resolveDependencyConflicts(graph, conflicts, [command.command], options);
      } else {
        // No conflicts, create successful resolution result
        resolution = this.createSuccessfulResolution(graph, [command.command]);
      }

      // Determine installation order
      console.log('Determining installation order...');
      const installationOrder = await this.determineInstallationOrder(graph, [command.command], config);

      // Check what's already installed
      const { toolsToInstall, alreadyInstalled } = await this.checkInstalledTools(
        installationOrder.installationSequence,
        options
      );

      const result: DependencyInstallationResult = {
        installationOrder,
        conflicts,
        resolution,
        toolsToInstall,
        alreadyInstalled,
        statistics: {
          totalTools: installationOrder.installationSequence.length,
          dependenciesResolved: installationOrder.installationSequence.length - 1,
          conflictsDetected: conflicts.conflicts.length,
          conflictsResolved: resolution.statistics.conflictsResolved,
          resolutionTime: Date.now() - startTime
        }
      };

      // Cache the result
      const cacheKey = this.createCacheKey(command, options);
      this.resolutionCache.set(cacheKey, result);

      console.log(`Dependency resolution completed in ${result.statistics.resolutionTime}ms`);
      console.log(`Tools to install: ${toolsToInstall.join(', ')}`);
      console.log(`Already installed: ${alreadyInstalled.join(', ')}`);

      return result;

    } catch (error) {
      console.error('Dependency resolution failed:', error);
      throw new Error(`Dependency resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Install dependencies in resolved order
   */
  public async installDependencies(
    resolutionResult: DependencyInstallationResult,
    category: ToolCategory,
    options: DependencyAwareInstallationOptions
  ): Promise<void> {
    console.log('Installing dependencies in resolved order...');

    // Install in batches to handle parallel installations
    for (const batch of resolutionResult.installationOrder.batches) {
      const batchPromises = batch
        .filter(toolId => resolutionResult.toolsToInstall.includes(toolId))
        .map(async (toolId) => {
          try {
            await this.installSingleDependency(toolId, category, options);
            console.log(`Successfully installed dependency: ${toolId}`);
          } catch (error) {
            console.error(`Failed to install dependency ${toolId}:`, error);
            throw error;
          }
        });

      // Wait for all tools in this batch to complete
      await Promise.all(batchPromises);
    }

    console.log('All dependencies installed successfully');
  }

  /**
   * Query native package manager for tool information
   */
  public async queryNativePackageManager(
    toolId: string,
    platform: Platform,
    packageManager: string
  ): Promise<NativePackageInfo | null> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      let queryCommand: string;
      let parseOutput: (output: string) => NativePackageInfo | null;

      switch (packageManager) {
        case 'apt':
          queryCommand = `apt-cache show ${toolId} 2>/dev/null`;
          parseOutput = this.parseAptOutput.bind(this);
          break;
        case 'yum':
          queryCommand = `yum info ${toolId} 2>/dev/null`;
          parseOutput = this.parseYumOutput.bind(this);
          break;
        case 'homebrew':
          queryCommand = `brew info ${toolId} 2>/dev/null`;
          parseOutput = this.parseHomebrewOutput.bind(this);
          break;
        case 'chocolatey':
          queryCommand = `choco info ${toolId} 2>nul`;
          parseOutput = this.parseChocolateyOutput.bind(this);
          break;
        case 'winget':
          queryCommand = `winget show ${toolId} 2>nul`;
          parseOutput = this.parseWingetOutput.bind(this);
          break;
        default:
          console.warn(`Unsupported package manager: ${packageManager}`);
          return null;
      }

      const { stdout } = await execAsync(queryCommand, { timeout: 30000 });
      return parseOutput(stdout);

    } catch (error) {
      console.warn(`Failed to query ${packageManager} for ${toolId}:`, error);
      return null;
    }
  }

  /**
   * Integrate with native package managers for dependency information
   */
  public async integrateWithNativePackageManagers(
    manifests: Map<string, ToolManifest>,
    platform: Platform
  ): Promise<void> {
    console.log(`Integrating with native package managers for ${platform}...`);

    const packageManagers = this.getPackageManagersForPlatform(platform);
    
    for (const packageManager of packageManagers) {
      try {
        const packageInfo = await this.loadNativePackageManagerInfo(packageManager, platform);
        this.nativePackageManagerCache.set(platform, packageInfo);

        // Enhance manifests with native package manager data
        for (const [toolId, manifest] of manifests) {
          const nativeInfo = packageInfo.availablePackages.get(toolId);
          if (nativeInfo) {
            await this.enhanceManifestWithNativeInfo(manifest, nativeInfo);
          }
        }

        console.log(`Successfully integrated with ${packageManager}`);
      } catch (error) {
        console.warn(`Failed to integrate with ${packageManager}:`, error);
      }
    }
  }

  // Private helper methods

  private isDependencyResolutionEnabled(options: DependencyAwareInstallationOptions): boolean {
    return options.dependencyResolution?.enabled !== false; // Default to enabled
  }

  private getDependencyResolutionConfig(options: DependencyAwareInstallationOptions): DependencyResolutionConfig {
    const defaultConfig: DependencyResolutionConfig = {
      enabled: true,
      strategy: 'conflict-aware',
      includeOptional: true,
      includeSuggested: false,
      maxDepth: 10,
      conflictPolicy: {
        automatic: {
          enabled: true,
          maxSteps: 10,
          allowedActions: ['defer', 'substitute', 'configure'],
          riskTolerance: 'moderate'
        },
        versioning: {
          preferLatest: true,
          allowMajorUpgrades: false,
          allowDowngrades: true,
          pinningStrategy: 'minor'
        },
        platform: {
          useAlternatives: true,
          allowWorkarounds: true,
          preferNative: true
        }
      },
      nativePackageManagerIntegration: true,
      manifestCacheTTL: 300000 // 5 minutes
    };

    return { ...defaultConfig, ...options.dependencyResolution };
  }

  private async loadToolManifests(
    command: InstallationCommand,
    options: DependencyAwareInstallationOptions
  ): Promise<Map<string, ToolManifest>> {
    // Use provided manifests or load from cache/filesystem
    if (options.toolManifests) {
      return options.toolManifests;
    }

    // For this implementation, create a basic manifest for the requested tool
    // In a real implementation, this would load from a manifest registry
    const manifest: ToolManifest = {
      id: command.command,
      name: command.command,
      description: `Tool manifest for ${command.command}`,
      category: 'productivity', // Default category
      systemRequirements: {
        platforms: [command.platform as Platform],
        architectures: ['x64', 'arm64']
      },
      version: {
        stable: '1.0.0'
      },
      installation: [command],
      dependencies: [], // Would be populated from real manifest data
      schemaVersion: '1.0.0'
    };

    return new Map([[command.command, manifest]]);
  }

  private async buildDependencyGraph(
    manifests: Map<string, ToolManifest>,
    options: DependencyAwareInstallationOptions
  ): Promise<DependencyGraph> {
    const platform = options.targetPlatform || 'linux';
    const architecture = options.targetArchitecture || 'x64';

    // Use the graph builder to construct the dependency graph
    const result = await buildGraphFromManifests(
      Array.from(manifests.values()),
      platform,
      architecture,
      {
        includeOptional: options.dependencyResolution?.includeOptional ?? true,
        includeSuggested: options.dependencyResolution?.includeSuggested ?? false,
        maxNodes: 1000,
        validateDuringConstruction: true
      }
    );

    if (!result.success) {
      throw new Error(`Failed to build dependency graph: ${result.errors.join(', ')}`);
    }

    return result.graph;
  }

  private async detectDependencyConflicts(
    graph: DependencyGraph,
    targetTools: string[],
    options: DependencyAwareInstallationOptions
  ): Promise<ConflictDetectionResult> {
    const platform = options.targetPlatform || 'linux';
    const architecture = options.targetArchitecture || 'x64';

    return await detectConflicts(graph, targetTools, {
      platform,
      architecture,
      thoroughAnalysis: true
    });
  }

  private async resolveDependencyConflicts(
    graph: DependencyGraph,
    conflicts: ConflictDetectionResult,
    targetTools: string[],
    options: DependencyAwareInstallationOptions
  ): Promise<ResolutionExecutionResult> {
    const config = this.getDependencyResolutionConfig(options);

    return await resolveConflicts(graph, conflicts, targetTools, {
      policy: config.conflictPolicy,
      platform: options.targetPlatform || 'linux',
      architecture: options.targetArchitecture || 'x64'
    });
  }

  private createSuccessfulResolution(
    graph: DependencyGraph,
    targetTools: string[]
  ): ResolutionExecutionResult {
    return {
      success: true,
      modifiedGraph: graph,
      updatedInstallationOrder: {
        installationSequence: targetTools,
        batches: [targetTools],
        deferredDependencies: [],
        circularDependencies: [],
        estimatedTime: 60,
        success: true,
        warnings: [],
        errors: []
      },
      appliedSteps: [],
      remainingConflicts: [],
      statistics: {
        conflictsResolved: 0,
        stepsExecuted: 0,
        executionTime: 0,
        userInteractions: 0,
        automatedResolutions: 0
      },
      summary: {
        description: 'No conflicts detected, installation can proceed',
        impact: 'low',
        reversible: true,
        sideEffects: []
      }
    };
  }

  private async determineInstallationOrder(
    graph: DependencyGraph,
    targetTools: string[],
    config: DependencyResolutionConfig
  ): Promise<InstallationOrder> {
    return await resolveInstallationOrder(graph, targetTools, {
      algorithm: 'topological',
      strategy: config.strategy,
      includeOptional: config.includeOptional,
      includeSuggested: config.includeSuggested,
      maxIterations: 1000,
      timeout: 30000
    });
  }

  private async checkInstalledTools(
    tools: string[],
    options: DependencyAwareInstallationOptions
  ): Promise<{ toolsToInstall: string[]; alreadyInstalled: string[] }> {
    const toolsToInstall: string[] = [];
    const alreadyInstalled: string[] = [];

    for (const toolId of tools) {
      try {
        const isInstalled = await this.checkIfToolIsInstalled(toolId, options);
        if (isInstalled) {
          alreadyInstalled.push(toolId);
        } else {
          toolsToInstall.push(toolId);
        }
      } catch (error) {
        console.warn(`Failed to check installation status for ${toolId}:`, error);
        // Assume not installed if check fails
        toolsToInstall.push(toolId);
      }
    }

    return { toolsToInstall, alreadyInstalled };
  }

  private async checkIfToolIsInstalled(
    toolId: string,
    options: DependencyAwareInstallationOptions
  ): Promise<boolean> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Try common ways to check if a tool is installed
      const checkCommands = [
        `which ${toolId}`,
        `${toolId} --version`,
        `${toolId} -v`,
        `command -v ${toolId}`
      ];

      for (const cmd of checkCommands) {
        try {
          await execAsync(cmd, { timeout: 5000 });
          return true;
        } catch {
          continue;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  private async installSingleDependency(
    toolId: string,
    category: ToolCategory,
    options: DependencyAwareInstallationOptions
  ): Promise<void> {
    // This would integrate with the base installer to install individual dependencies
    console.log(`Installing dependency: ${toolId}`);
    
    // In a real implementation, this would:
    // 1. Get the tool's manifest
    // 2. Create an installation command
    // 3. Use the appropriate platform installer
    // 4. Handle installation errors and retries
    
    // For now, simulate installation
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private createCacheKey(command: InstallationCommand, options: DependencyAwareInstallationOptions): string {
    return JSON.stringify({
      command: command.command,
      platform: command.platform,
      config: options.dependencyResolution
    });
  }

  private getPackageManagersForPlatform(platform: Platform): string[] {
    switch (platform) {
      case 'linux':
        return ['apt', 'yum', 'snap', 'flatpak'];
      case 'macos':
        return ['homebrew'];
      case 'windows':
        return ['chocolatey', 'winget'];
      default:
        return [];
    }
  }

  private async loadNativePackageManagerInfo(
    packageManager: string,
    platform: Platform
  ): Promise<NativePackageManagerInfo> {
    // Simplified implementation - would query actual package managers
    return {
      type: packageManager as any,
      availablePackages: new Map(),
      installedPackages: new Map()
    };
  }

  private async enhanceManifestWithNativeInfo(
    manifest: ToolManifest,
    nativeInfo: NativePackageInfo
  ): Promise<void> {
    // Enhance manifest with native package manager information
    // This would update version information, dependencies, etc.
    console.log(`Enhancing manifest for ${manifest.id} with native package info`);
  }

  // Package manager output parsers

  private parseAptOutput(output: string): NativePackageInfo | null {
    // Parse apt-cache show output
    const lines = output.split('\n');
    const info: Partial<NativePackageInfo> = {};

    for (const line of lines) {
      if (line.startsWith('Package:')) {
        info.name = line.substring(9).trim();
      } else if (line.startsWith('Version:')) {
        info.versions = [line.substring(9).trim()];
      } else if (line.startsWith('Description:')) {
        info.description = line.substring(13).trim();
      } else if (line.startsWith('Depends:')) {
        info.dependencies = line.substring(9).trim().split(',').map(d => d.trim());
      }
    }

    return info.name ? info as NativePackageInfo : null;
  }

  private parseYumOutput(output: string): NativePackageInfo | null {
    // Parse yum info output
    const lines = output.split('\n');
    const info: Partial<NativePackageInfo> = {};

    for (const line of lines) {
      if (line.startsWith('Name')) {
        info.name = line.split(':')[1]?.trim();
      } else if (line.startsWith('Version')) {
        info.versions = [line.split(':')[1]?.trim()];
      } else if (line.startsWith('Summary')) {
        info.description = line.split(':')[1]?.trim();
      }
    }

    return info.name ? { ...info, dependencies: [] } as NativePackageInfo : null;
  }

  private parseHomebrewOutput(output: string): NativePackageInfo | null {
    // Parse brew info output
    const lines = output.split('\n');
    const info: Partial<NativePackageInfo> = {};

    for (const line of lines) {
      if (line.includes(':')) {
        const firstLine = lines[0];
        const match = firstLine.match(/^(\S+):\s*(.+)/);
        if (match) {
          info.name = match[1];
          info.description = match[2];
        }
      }
    }

    return info.name ? { ...info, versions: ['latest'], dependencies: [] } as NativePackageInfo : null;
  }

  private parseChocolateyOutput(output: string): NativePackageInfo | null {
    // Parse choco info output
    const lines = output.split('\n');
    const info: Partial<NativePackageInfo> = {};

    for (const line of lines) {
      if (line.includes('Title:')) {
        info.name = line.split(':')[1]?.trim();
      } else if (line.includes('Version:')) {
        info.versions = [line.split(':')[1]?.trim()];
      } else if (line.includes('Summary:')) {
        info.description = line.split(':')[1]?.trim();
      }
    }

    return info.name ? { ...info, dependencies: [] } as NativePackageInfo : null;
  }

  private parseWingetOutput(output: string): NativePackageInfo | null {
    // Parse winget show output
    const lines = output.split('\n');
    const info: Partial<NativePackageInfo> = {};

    for (const line of lines) {
      if (line.includes('Publisher:')) {
        // Winget output parsing would be more complex
        info.name = 'tool'; // Simplified
        info.versions = ['latest'];
        info.description = 'Tool installed via winget';
        info.dependencies = [];
      }
    }

    return info.name ? info as NativePackageInfo : null;
  }
}

/**
 * Factory function to create a dependency-aware category installer
 */
export function createDependencyAwareCategoryInstaller(): DependencyAwareCategoryInstaller {
  return new DependencyAwareCategoryInstaller();
}

/**
 * Enhanced installation options type export
 */
export type { DependencyAwareInstallationOptions as EnhancedInstallationOptions };