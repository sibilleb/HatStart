/**
 * System Detection Framework
 * Main orchestrator for cross-platform tool detection
 */

import { EventEmitter } from 'events';
import type {
    CategoryDetectionResult,
    DetectionCache,
    DetectionConfig,
    DetectionEvents,
    DetectionProgress,
    DetectionResult,
    DetectionRule,
    PlatformStrategy,
    PlatformType,
    SystemDetectionReport,
    SystemInfo,
    ToolCategory
} from './detection-types.js';

export class SystemDetector extends EventEmitter {
  private config: DetectionConfig;
  private cache: DetectionCache | null = null;
  private systemInfo: SystemInfo | null = null;
  private detectionRules: Map<ToolCategory, DetectionRule[]> = new Map();

  constructor(config: Partial<DetectionConfig> = {}) {
    super();
    
    // Default configuration
    this.config = {
      parallel: true,
      maxConcurrency: 5,
      defaultTimeout: 10000, // 10 seconds
      cacheResults: true,
      cacheDuration: 30 * 60 * 1000, // 30 minutes
      verbosity: 'normal',
      ...config
    };

    this.initializeDetectionRules();
  }

  /**
   * Emit typed events
   */
  public emit<K extends keyof DetectionEvents>(
    event: K,
    data: DetectionEvents[K]
  ): boolean {
    return super.emit(event, data);
  }

  /**
   * Add typed event listeners
   */
  public on<K extends keyof DetectionEvents>(
    event: K,
    listener: (data: DetectionEvents[K]) => void
  ): this {
    return super.on(event, listener);
  }

  /**
   * Detect system information
   */
  public async detectSystemInfo(): Promise<SystemInfo> {
    if (this.systemInfo && this.isCacheValid()) {
      return this.systemInfo;
    }

    const platform = this.detectPlatform();
    const architecture = this.detectArchitecture();
    const version = await this.detectOSVersion(platform);
    
    let distribution: string | undefined;
    let distributionVersion: string | undefined;

    if (platform === 'linux') {
      const distInfo = await this.detectLinuxDistribution();
      distribution = distInfo.distribution;
      distributionVersion = distInfo.version;
    }

    this.systemInfo = {
      platform,
      architecture,
      version,
      distribution,
      distributionVersion
    };

    return this.systemInfo;
  }

  /**
   * Run comprehensive system detection
   */
  public async detectTools(categories?: ToolCategory[]): Promise<SystemDetectionReport> {
    const startTime = Date.now();
    const systemInfo = await this.detectSystemInfo();
    
    // Determine which categories to process
    const categoriesToProcess = categories || Array.from(this.detectionRules.keys());
    const filteredCategories = this.filterCategories(categoriesToProcess);

    // Initialize progress tracking
    const totalTools = this.calculateTotalTools(filteredCategories);
    const progress: DetectionProgress = {
      categoriesCompleted: 0,
      totalCategories: filteredCategories.length,
      toolsCompleted: 0,
      totalTools,
      startTime: new Date()
    };

    this.emit('detection-started', { progress });

    try {
      const categoryResults: CategoryDetectionResult[] = [];

      if (this.config.parallel) {
        // Process categories in parallel with concurrency control
        const results = await this.processCategorialParallel(filteredCategories, progress);
        categoryResults.push(...results);
      } else {
        // Process categories sequentially
        for (const category of filteredCategories) {
          const result = await this.processCategory(category, progress);
          categoryResults.push(result);
          progress.categoriesCompleted++;
          this.emit('category-completed', { category, result, progress });
        }
      }

      const endTime = Date.now();
      const detectionTime = endTime - startTime;

      // Generate summary
      const summary = this.generateSummary(categoryResults, detectionTime);

      const report: SystemDetectionReport = {
        systemInfo,
        timestamp: new Date(),
        categories: categoryResults,
        summary
      };

      this.emit('detection-completed', { report });
      return report;

    } catch (error) {
      this.emit('detection-error', { 
        error: error as Error, 
        context: 'System detection process' 
      });
      throw error;
    }
  }

  /**
   * Detect a specific tool
   */
  public async detectTool(toolName: string): Promise<DetectionResult> {
    const systemInfo = await this.detectSystemInfo();
    const rule = this.findDetectionRule(toolName);
    
    if (!rule) {
      return {
        name: toolName,
        found: false,
        detectionMethod: 'command',
        error: `No detection rule found for tool: ${toolName}`
      };
    }

    return this.executeDetectionRule(rule, systemInfo);
  }

  /**
   * Initialize default detection rules
   */
  private initializeDetectionRules(): void {
    // This will be populated with comprehensive detection rules
    // For now, we'll set up the basic structure
    this.detectionRules.clear();
    
    // Each category will be populated in separate methods
    this.initializeProgrammingLanguageRules();
    this.initializeIDEEditorRules();
    this.initializeVersionControlRules();
    // ... other categories will be added as we implement them
  }

  /**
   * Initialize programming language detection rules
   */
  private initializeProgrammingLanguageRules(): void {
    const rules: DetectionRule[] = [
      {
        name: 'Node.js',
        category: 'programming-languages',
        essential: true,
        strategies: [
          {
            platform: 'windows',
            method: 'command',
            command: 'node',
            args: ['--version'],
            versionRegex: 'v(\\d+\\.\\d+\\.\\d+)',
            timeout: 5000
          },
          {
            platform: 'macos',
            method: 'command',
            command: 'node',
            args: ['--version'],
            versionRegex: 'v(\\d+\\.\\d+\\.\\d+)',
            timeout: 5000
          },
          {
            platform: 'linux',
            method: 'command',
            command: 'node',
            args: ['--version'],
            versionRegex: 'v(\\d+\\.\\d+\\.\\d+)',
            timeout: 5000
          }
        ]
      },
      {
        name: 'Python',
        category: 'programming-languages',
        essential: true,
        strategies: [
          {
            platform: 'windows',
            method: 'command',
            command: 'python',
            args: ['--version'],
            versionRegex: 'Python (\\d+\\.\\d+\\.\\d+)',
            timeout: 5000
          },
          {
            platform: 'macos',
            method: 'command',
            command: 'python3',
            args: ['--version'],
            versionRegex: 'Python (\\d+\\.\\d+\\.\\d+)',
            timeout: 5000
          },
          {
            platform: 'linux',
            method: 'command',
            command: 'python3',
            args: ['--version'],
            versionRegex: 'Python (\\d+\\.\\d+\\.\\d+)',
            timeout: 5000
          }
        ]
      }
      // More programming languages will be added here
    ];

    this.detectionRules.set('programming-languages', rules);
  }

  /**
   * Initialize IDE/Editor detection rules
   */
  private initializeIDEEditorRules(): void {
    const rules: DetectionRule[] = [
      {
        name: 'Visual Studio Code',
        category: 'ides-editors',
        essential: true,
        strategies: [
          {
            platform: 'windows',
            method: 'command',
            command: 'code',
            args: ['--version'],
            versionRegex: '(\\d+\\.\\d+\\.\\d+)',
            timeout: 5000
          },
          {
            platform: 'macos',
            method: 'application-folder',
            paths: ['/Applications/Visual Studio Code.app'],
            timeout: 1000
          },
          {
            platform: 'linux',
            method: 'command',
            command: 'code',
            args: ['--version'],
            versionRegex: '(\\d+\\.\\d+\\.\\d+)',
            timeout: 5000
          }
        ]
      }
      // More IDEs will be added here
    ];

    this.detectionRules.set('ides-editors', rules);
  }

  /**
   * Initialize version control detection rules
   */
  private initializeVersionControlRules(): void {
    const rules: DetectionRule[] = [
      {
        name: 'Git',
        category: 'version-control',
        essential: true,
        strategies: [
          {
            platform: 'windows',
            method: 'command',
            command: 'git',
            args: ['--version'],
            versionRegex: 'git version (\\d+\\.\\d+\\.\\d+)',
            timeout: 5000
          },
          {
            platform: 'macos',
            method: 'command',
            command: 'git',
            args: ['--version'],
            versionRegex: 'git version (\\d+\\.\\d+\\.\\d+)',
            timeout: 5000
          },
          {
            platform: 'linux',
            method: 'command',
            command: 'git',
            args: ['--version'],
            versionRegex: 'git version (\\d+\\.\\d+\\.\\d+)',
            timeout: 5000
          }
        ]
      }
    ];

    this.detectionRules.set('version-control', rules);
  }

  /**
   * Detect current platform
   */
  private detectPlatform(): PlatformType {
    const platform = process.platform;
    
    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Detect system architecture
   */
  private detectArchitecture() {
    const arch = process.arch;
    
    switch (arch) {
      case 'x64':
        return 'x64';
      case 'ia32':
        return 'x86';
      case 'arm64':
        return 'arm64';
      case 'arm':
        return 'arm';
      default:
        return 'x64'; // Default fallback
    }
  }

  /**
   * Detect OS version
   */
  private async detectOSVersion(_platform: PlatformType): Promise<string> {
    // This would be implemented with platform-specific logic
    // For now, return a placeholder
    const os = await import('os');
    return process.platform + ' ' + os.release();
  }

  /**
   * Detect Linux distribution
   */
  private async detectLinuxDistribution(): Promise<{ distribution?: string; version?: string }> {
    // This would be implemented to detect Linux distributions
    // For now, return empty
    return {};
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return new Date() < this.cache.expiresAt;
  }

  /**
   * Filter categories based on configuration
   */
  private filterCategories(categories: ToolCategory[]): ToolCategory[] {
    let filtered = categories;

    if (this.config.includeCategories) {
      filtered = filtered.filter(cat => this.config.includeCategories!.includes(cat));
    }

    if (this.config.excludeCategories) {
      filtered = filtered.filter(cat => !this.config.excludeCategories!.includes(cat));
    }

    return filtered;
  }

  /**
   * Calculate total number of tools to be detected
   */
  private calculateTotalTools(categories: ToolCategory[]): number {
    return categories.reduce((total, category) => {
      const rules = this.detectionRules.get(category) || [];
      return total + rules.length;
    }, 0);
  }

  /**
   * Process categories in parallel
   */
  private async processCategorialParallel(
    categories: ToolCategory[], 
    progress: DetectionProgress
  ): Promise<CategoryDetectionResult[]> {
    const concurrency = Math.min(this.config.maxConcurrency, categories.length);
    const results: CategoryDetectionResult[] = [];
    
    // Process in batches
    for (let i = 0; i < categories.length; i += concurrency) {
      const batch = categories.slice(i, i + concurrency);
      const batchPromises = batch.map(category => this.processCategory(category, progress));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      progress.categoriesCompleted += batch.length;
    }

    return results;
  }

  /**
   * Process a single category
   */
  private async processCategory(
    category: ToolCategory, 
    progress: DetectionProgress
  ): Promise<CategoryDetectionResult> {
    progress.currentCategory = category;
    this.emit('category-started', { category, progress });

    const rules = this.detectionRules.get(category) || [];
    const toolResults: DetectionResult[] = [];

    for (const rule of rules) {
      progress.currentTool = rule.name;
      
      try {
        const result = await this.executeDetectionRule(rule, this.systemInfo!);
        toolResults.push(result);
        progress.toolsCompleted++;
        this.emit('tool-detected', { tool: rule.name, result, progress });
      } catch (error) {
        const errorResult: DetectionResult = {
          name: rule.name,
          found: false,
          detectionMethod: 'command',
          error: (error as Error).message
        };
        toolResults.push(errorResult);
        progress.toolsCompleted++;
        this.emit('tool-detected', { tool: rule.name, result: errorResult, progress });
      }
    }

    const summary = this.generateCategorySummary(toolResults, rules);

    return {
      category,
      tools: toolResults,
      summary
    };
  }

  /**
   * Execute a detection rule
   */
  private async executeDetectionRule(
    rule: DetectionRule, 
    systemInfo: SystemInfo
  ): Promise<DetectionResult> {
    // Find the appropriate strategy for current platform
    const strategy = rule.strategies.find(s => s.platform === systemInfo.platform);
    
    if (!strategy) {
      return {
        name: rule.name,
        found: false,
        detectionMethod: 'command',
        error: `No detection strategy for platform: ${systemInfo.platform}`
      };
    }

    // For now, we'll implement basic command detection
    // More detection methods will be implemented in subsequent subtasks
    if (strategy.method === 'command') {
      return this.executeCommandDetection(rule.name, strategy);
    }

    // Placeholder for other detection methods
    return {
      name: rule.name,
      found: false,
      detectionMethod: strategy.method,
      error: `Detection method ${strategy.method} not yet implemented`
    };
  }

  /**
   * Execute command-based detection
   */
  private async executeCommandDetection(
    toolName: string,
    _strategy: PlatformStrategy
  ): Promise<DetectionResult> {
    // This will be implemented with actual command execution
    // For now, return a placeholder
    return {
      name: toolName,
      found: false,
      detectionMethod: 'command',
      error: 'Command detection not yet implemented'
    };
  }

  /**
   * Find detection rule by tool name
   */
  private findDetectionRule(toolName: string): DetectionRule | undefined {
    for (const [, rules] of this.detectionRules) {
      const rule = rules.find(r => r.name === toolName);
      if (rule) return rule;
    }
    return undefined;
  }

  /**
   * Generate category summary
   */
  private generateCategorySummary(results: DetectionResult[], rules: DetectionRule[]) {
    const found = results.filter(r => r.found).length;
    const essentialRules = rules.filter(r => r.essential);
    const essentialFound = results.filter(r => 
      r.found && essentialRules.some(rule => rule.name === r.name)
    ).length;

    return {
      totalChecked: results.length,
      found,
      essentialFound,
      essentialMissing: essentialRules.length - essentialFound
    };
  }

  /**
   * Generate overall summary
   */
  private generateSummary(results: CategoryDetectionResult[], detectionTime: number) {
    const totalFound = results.reduce((sum, cat) => sum + cat.summary.found, 0);
    const totalChecked = results.reduce((sum, cat) => sum + cat.summary.totalChecked, 0);

    return {
      totalFound,
      totalChecked,
      successRate: totalChecked > 0 ? (totalFound / totalChecked) * 100 : 0,
      detectionTime
    };
  }
}

export default SystemDetector; 