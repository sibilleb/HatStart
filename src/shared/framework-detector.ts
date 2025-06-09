/**
 * Framework and Library Detection Module
 * Cross-platform detection for web, backend, and mobile frameworks
 */

import { exec } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import type { DetectionResult, PlatformType } from './detection-types';

const execAsync = promisify(exec);

export interface FrameworkCommand {
  /** Target platform */
  platform: PlatformType;
  /** Primary command to execute */
  command: string;
  /** Alternative commands to try */
  alternatives?: string[];
  /** Version extraction regex */
  versionRegex?: RegExp;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Package manager or detection method */
  method?: 'command' | 'package-manager' | 'filesystem' | 'registry';
}

export interface PackageManagerInfo {
  /** Package manager name */
  name: string;
  /** Commands to check for packages */
  commands: FrameworkCommand[];
  /** Package file patterns to check */
  packageFiles?: string[];
  /** Directory patterns that indicate framework presence */
  directories?: string[];
}

export interface FrameworkDefinition {
  /** Framework/library name */
  name: string;
  /** Framework category */
  category: FrameworkCategory;
  /** Is this an essential framework for most projects? */
  essential: boolean;
  /** Detection commands for each platform */
  commands: FrameworkCommand[];
  /** Package manager specific detection */
  packageManagers?: PackageManagerInfo[];
  /** File-based detection patterns */
  filePatterns?: {
    /** Configuration files that indicate framework presence */
    configFiles: string[];
    /** Directory structures that indicate framework */
    directories: string[];
    /** Package.json dependencies to check */
    dependencies?: string[];
  };
}

export type FrameworkCategory = 
  | 'web-frontend' 
  | 'web-backend' 
  | 'mobile' 
  | 'desktop' 
  | 'testing' 
  | 'build-tools' 
  | 'database' 
  | 'devops';

export class FrameworkDetector {
  private frameworks: Map<FrameworkCategory, FrameworkDefinition[]> = new Map();
  private detectionCache = new Map<string, DetectionResult>();

  constructor() {
    this.initializeFrameworks();
  }

  /**
   * Detect all frameworks on the system
   */
  public async detectAllFrameworks(): Promise<Map<FrameworkCategory, DetectionResult[]>> {
    const results = new Map<FrameworkCategory, DetectionResult[]>();

    for (const [category, frameworks] of this.frameworks.entries()) {
      const categoryResults: DetectionResult[] = [];
      
      for (const framework of frameworks) {
        const result = await this.detectFramework(framework);
        categoryResults.push(result);
      }
      
      results.set(category, categoryResults);
    }

    return results;
  }

  /**
   * Detect frameworks in a specific category
   */
  public async detectFrameworksByCategory(category: FrameworkCategory): Promise<DetectionResult[]> {
    const frameworks = this.frameworks.get(category) || [];
    const results: DetectionResult[] = [];

    for (const framework of frameworks) {
      const result = await this.detectFramework(framework);
      results.push(result);
    }

    return results;
  }

  /**
   * Detect a specific framework by name
   */
  public async detectFrameworkByName(name: string): Promise<DetectionResult | undefined> {
    // Check cache first
    if (this.detectionCache.has(name)) {
      return this.detectionCache.get(name);
    }

    // Find framework across all categories
    for (const frameworks of this.frameworks.values()) {
      const framework = frameworks.find(f => f.name.toLowerCase() === name.toLowerCase());
      if (framework) {
        const result = await this.detectFramework(framework);
        this.detectionCache.set(name, result);
        return result;
      }
    }

    return undefined;
  }

  /**
   * Detect a specific framework
   */
  private async detectFramework(framework: FrameworkDefinition): Promise<DetectionResult> {
    const platform = this.getCurrentPlatform();

    // Try command-based detection first
    const commandResult = await this.tryCommandDetection(framework, platform);
    if (commandResult.found) {
      return commandResult;
    }

    // Try package manager detection
    if (framework.packageManagers) {
      const packageResult = await this.tryPackageManagerDetection(framework, platform);
      if (packageResult.found) {
        return packageResult;
      }
    }

    // Try file-based detection
    if (framework.filePatterns) {
      const fileResult = await this.tryFileDetection(framework);
      if (fileResult.found) {
        return fileResult;
      }
    }

    return {
      name: framework.name,
      found: false,
      detectionMethod: 'command',
      error: 'Framework not detected using any method'
    };
  }

  /**
   * Try command-based detection
   */
  private async tryCommandDetection(
    framework: FrameworkDefinition, 
    platform: PlatformType
  ): Promise<DetectionResult> {
    // Find command for current platform
    const platformCommand = framework.commands.find(cmd => cmd.platform === platform);
    if (!platformCommand) {
      return {
        name: framework.name,
        found: false,
        detectionMethod: 'command',
        error: `No detection command defined for platform: ${platform}`
      };
    }

    // Try primary command
    const primaryResult = await this.executeCommand(framework.name, platformCommand);
    if (primaryResult.found) {
      return primaryResult;
    }

    // Try alternative commands
    if (platformCommand.alternatives) {
      for (const altCommand of platformCommand.alternatives) {
        const altResult = await this.executeCommand(framework.name, {
          ...platformCommand,
          command: altCommand
        });
        if (altResult.found) {
          return {
            ...altResult,
            metadata: {
              ...altResult.metadata,
              usedAlternative: altCommand
            }
          };
        }
      }
    }

    return {
      name: framework.name,
      found: false,
      detectionMethod: 'command',
      error: primaryResult.error || 'Command not found'
    };
  }

  /**
   * Try package manager based detection
   */
  private async tryPackageManagerDetection(
    framework: FrameworkDefinition,
    platform: PlatformType
  ): Promise<DetectionResult> {
    if (!framework.packageManagers) {
      return {
        name: framework.name,
        found: false,
        detectionMethod: 'package-manager',
        error: 'No package manager detection configured'
      };
    }

    for (const packageManager of framework.packageManagers) {
      // Check if package manager is available
      const pmCommand = packageManager.commands.find(cmd => cmd.platform === platform);
      if (!pmCommand) continue;

      try {
        const result = await this.executeCommand(framework.name, pmCommand);
        if (result.found) {
          return {
            ...result,
            detectionMethod: 'package-manager',
            metadata: {
              ...result.metadata,
              packageManager: packageManager.name
            }
          };
        }
      } catch {
        // Continue to next package manager
        continue;
      }
    }

    return {
      name: framework.name,
      found: false,
      detectionMethod: 'package-manager',
      error: 'Not found in any package manager'
    };
  }

  /**
   * Try file-based detection
   */
  private async tryFileDetection(framework: FrameworkDefinition): Promise<DetectionResult> {
    if (!framework.filePatterns) {
          return {
      name: framework.name,
      found: false,
      detectionMethod: 'filesystem',
      error: 'No file patterns configured'
    };
    }

    const { configFiles, directories, dependencies } = framework.filePatterns;
    const foundIndicators: string[] = [];

    // Check for configuration files in current directory and common locations
    const searchPaths = ['.', './src', './app', './public'];
    
    for (const searchPath of searchPaths) {
      for (const configFile of configFiles) {
        const filePath = join(process.cwd(), searchPath, configFile);
        if (existsSync(filePath)) {
          foundIndicators.push(`Config file: ${configFile}`);
          
          // Try to extract version from config file if it's a package.json
          if (configFile === 'package.json' && dependencies) {
            const version = this.extractVersionFromPackageJson(filePath, dependencies);
            if (version) {
              return {
                name: framework.name,
                found: true,
                version,
                detectionMethod: 'filesystem',
                metadata: {
                  configFile: filePath,
                  indicators: foundIndicators
                }
              };
            }
          }
        }
      }

      // Check for directory structures
      for (const directory of directories) {
        const dirPath = join(process.cwd(), searchPath, directory);
        if (existsSync(dirPath)) {
          foundIndicators.push(`Directory: ${directory}`);
        }
      }
    }

    if (foundIndicators.length > 0) {
      return {
        name: framework.name,
        found: true,
        detectionMethod: 'filesystem',
        metadata: {
          indicators: foundIndicators
        }
      };
    }

    return {
      name: framework.name,
      found: false,
      detectionMethod: 'filesystem',
      error: 'No framework indicators found in file system'
    };
  }

  /**
   * Extract version from package.json dependencies
   */
  private extractVersionFromPackageJson(packageJsonPath: string, dependencies: string[]): string | undefined {
    try {
      const packageContent = readFileSync(packageJsonPath, 'utf8');
      const packageData = JSON.parse(packageContent);
      
      // Check dependencies, devDependencies, and peerDependencies
      const allDeps = {
        ...packageData.dependencies,
        ...packageData.devDependencies,
        ...packageData.peerDependencies
      };

      for (const dep of dependencies) {
        if (allDeps[dep]) {
          return allDeps[dep].replace(/^[\^~]/, ''); // Remove version prefixes
        }
      }
    } catch {
      // Ignore JSON parse errors
    }

    return undefined;
  }

  /**
   * Execute a detection command
   */
  private async executeCommand(
    frameworkName: string,
    cmd: FrameworkCommand
  ): Promise<DetectionResult> {
    try {
      const { stdout, stderr } = await execAsync(cmd.command, {
        timeout: cmd.timeout || 5000,
        encoding: 'utf8'
      });

      const output = stdout || stderr;
      let version: string | undefined;

      // Extract version if regex is provided
      if (cmd.versionRegex && output) {
        const match = output.match(cmd.versionRegex);
        version = match?.[1];
      }

      // Try to find installation path
      const installationPath = await this.findInstallationPath(cmd.command);

      return {
        name: frameworkName,
        found: true,
        version,
        path: installationPath,
        detectionMethod: cmd.method || 'command',
        metadata: {
          command: cmd.command,
          platform: cmd.platform,
          output: output.trim().split('\n')[0] // First line only
        }
      };
    } catch (error) {
      return {
        name: frameworkName,
        found: false,
        detectionMethod: cmd.method || 'command',
        error: error instanceof Error ? error.message : 'Command execution failed'
      };
    }
  }

  /**
   * Find installation path for a command
   */
  private async findInstallationPath(command: string): Promise<string | undefined> {
    try {
      const platform = this.getCurrentPlatform();
      const whichCommand = platform === 'windows' ? `where ${command.split(' ')[0]}` : `which ${command.split(' ')[0]}`;
      
      const { stdout } = await execAsync(whichCommand, {
        timeout: 2000,
        encoding: 'utf8'
      });

      return stdout.trim().split('\n')[0];
    } catch {
      return undefined;
    }
  }

  /**
   * Get current platform
   */
  private getCurrentPlatform(): PlatformType {
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
   * Initialize framework definitions
   */
  private initializeFrameworks(): void {
    // Initialize web frontend frameworks
    this.initializeWebFrontendFrameworks();
    
    // Initialize web backend frameworks
    this.initializeWebBackendFrameworks();
    
    // Initialize mobile frameworks
    this.initializeMobileFrameworks();
    
    // Initialize build tools
    this.initializeBuildTools();
    
    // Initialize testing frameworks
    this.initializeTestingFrameworks();
  }

  /**
   * Initialize web frontend framework detection
   */
  private initializeWebFrontendFrameworks(): void {
    const frameworks: FrameworkDefinition[] = [
      {
        name: 'React',
        category: 'web-frontend',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'npx react --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'macos',
            command: 'npx react --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'linux',
            command: 'npx react --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            commands: [
              {
                platform: 'windows',
                command: 'npm list react --depth=0',
                versionRegex: /react@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'macos',
                command: 'npm list react --depth=0',
                versionRegex: /react@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'linux',
                command: 'npm list react --depth=0',
                versionRegex: /react@(\d+\.\d+\.\d+)/,
                timeout: 10000
              }
            ]
          }
        ],
        filePatterns: {
          configFiles: ['package.json', 'react-app-env.d.ts', 'tsconfig.json'],
          directories: ['node_modules/react', 'src/components', 'public'],
          dependencies: ['react', 'react-dom', 'react-scripts']
        }
      },
      {
        name: 'Vue',
        category: 'web-frontend',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'vue --version',
            versionRegex: /@vue\/cli (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'macos',
            command: 'vue --version',
            versionRegex: /@vue\/cli (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'linux',
            command: 'vue --version',
            versionRegex: /@vue\/cli (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            commands: [
              {
                platform: 'windows',
                command: 'npm list vue --depth=0',
                versionRegex: /vue@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'macos',
                command: 'npm list vue --depth=0',
                versionRegex: /vue@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'linux',
                command: 'npm list vue --depth=0',
                versionRegex: /vue@(\d+\.\d+\.\d+)/,
                timeout: 10000
              }
            ]
          }
        ],
        filePatterns: {
          configFiles: ['vue.config', 'vite.config', 'package.json'],
          directories: ['node_modules/vue', 'src/views', 'src/router'],
          dependencies: ['vue', '@vue/cli-service', 'vite']
        }
      },
      {
        name: 'Angular',
        category: 'web-frontend',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'ng version',
            versionRegex: /Angular CLI: (\d+\.\d+\.\d+)/,
            timeout: 15000,
            method: 'command'
          },
          {
            platform: 'macos',
            command: 'ng version',
            versionRegex: /Angular CLI: (\d+\.\d+\.\d+)/,
            timeout: 15000,
            method: 'command'
          },
          {
            platform: 'linux',
            command: 'ng version',
            versionRegex: /Angular CLI: (\d+\.\d+\.\d+)/,
            timeout: 15000,
            method: 'command'
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            commands: [
              {
                platform: 'windows',
                command: 'npm list @angular/core --depth=0',
                versionRegex: /@angular\/core@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'macos',
                command: 'npm list @angular/core --depth=0',
                versionRegex: /@angular\/core@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'linux',
                command: 'npm list @angular/core --depth=0',
                versionRegex: /@angular\/core@(\d+\.\d+\.\d+)/,
                timeout: 10000
              }
            ]
          }
        ],
        filePatterns: {
          configFiles: ['angular.json', 'tsconfig.json', 'package.json'],
          directories: ['node_modules/@angular', 'src/app'],
          dependencies: ['@angular/core', '@angular/cli', '@angular/common']
        }
      }
    ];

    this.frameworks.set('web-frontend', frameworks);
  }

  /**
   * Initialize web backend framework detection
   */
  private initializeWebBackendFrameworks(): void {
    const frameworks: FrameworkDefinition[] = [
      {
        name: 'Django',
        category: 'web-backend',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'django-admin --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 5000,
            method: 'command'
          },
          {
            platform: 'macos',
            command: 'django-admin --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 5000,
            method: 'command'
          },
          {
            platform: 'linux',
            command: 'django-admin --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 5000,
            method: 'command'
          }
        ],
        packageManagers: [
          {
            name: 'pip',
            commands: [
              {
                platform: 'windows',
                command: 'pip show django',
                versionRegex: /Version: (\d+\.\d+\.\d+)/,
                timeout: 5000
              },
              {
                platform: 'macos',
                command: 'pip3 show django',
                versionRegex: /Version: (\d+\.\d+\.\d+)/,
                timeout: 5000
              },
              {
                platform: 'linux',
                command: 'pip3 show django',
                versionRegex: /Version: (\d+\.\d+\.\d+)/,
                timeout: 5000
              }
            ]
          }
        ],
        filePatterns: {
          configFiles: ['manage.py', 'settings.py', 'urls.py', 'requirements.txt'],
          directories: ['static', 'templates', 'migrations'],
          dependencies: []
        }
      },
      {
        name: 'Express',
        category: 'web-backend',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'express --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 5000,
            method: 'command'
          },
          {
            platform: 'macos',
            command: 'express --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 5000,
            method: 'command'
          },
          {
            platform: 'linux',
            command: 'express --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 5000,
            method: 'command'
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            commands: [
              {
                platform: 'windows',
                command: 'npm list express --depth=0',
                versionRegex: /express@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'macos',
                command: 'npm list express --depth=0',
                versionRegex: /express@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'linux',
                command: 'npm list express --depth=0',
                versionRegex: /express@(\d+\.\d+\.\d+)/,
                timeout: 10000
              }
            ]
          }
        ],
        filePatterns: {
          configFiles: ['package.json', 'app', 'server', 'index'],
          directories: ['node_modules/express', 'routes', 'middleware'],
          dependencies: ['express']
        }
      }
    ];

    this.frameworks.set('web-backend', frameworks);
  }

  /**
   * Initialize mobile framework detection
   */
  private initializeMobileFrameworks(): void {
    const frameworks: FrameworkDefinition[] = [
      {
        name: 'React Native',
        category: 'mobile',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'react-native --version',
            versionRegex: /react-native: (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'macos',
            command: 'react-native --version',
            versionRegex: /react-native: (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'linux',
            command: 'react-native --version',
            versionRegex: /react-native: (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            commands: [
              {
                platform: 'windows',
                command: 'npm list react-native --depth=0',
                versionRegex: /react-native@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'macos',
                command: 'npm list react-native --depth=0',
                versionRegex: /react-native@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'linux',
                command: 'npm list react-native --depth=0',
                versionRegex: /react-native@(\d+\.\d+\.\d+)/,
                timeout: 10000
              }
            ]
          }
        ],
        filePatterns: {
          configFiles: ['package.json', 'metro.config', 'react-native.config'],
          directories: ['android', 'ios', 'node_modules/react-native'],
          dependencies: ['react-native', '@react-native-community/cli']
        }
      },
      {
        name: 'Flutter',
        category: 'mobile',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'flutter --version',
            versionRegex: /Flutter (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'macos',
            command: 'flutter --version',
            versionRegex: /Flutter (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'linux',
            command: 'flutter --version',
            versionRegex: /Flutter (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          }
        ],
        filePatterns: {
          configFiles: ['pubspec.yaml', 'pubspec.lock', 'analysis_options.yaml'],
          directories: ['lib', 'android', 'ios', 'test'],
          dependencies: []
        }
      }
    ];

    this.frameworks.set('mobile', frameworks);
  }

  /**
   * Initialize build tools detection
   */
  private initializeBuildTools(): void {
    const frameworks: FrameworkDefinition[] = [
      {
        name: 'Webpack',
        category: 'build-tools',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'webpack --version',
            versionRegex: /webpack (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'macos',
            command: 'webpack --version',
            versionRegex: /webpack (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'linux',
            command: 'webpack --version',
            versionRegex: /webpack (\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            commands: [
              {
                platform: 'windows',
                command: 'npm list webpack --depth=0',
                versionRegex: /webpack@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'macos',
                command: 'npm list webpack --depth=0',
                versionRegex: /webpack@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'linux',
                command: 'npm list webpack --depth=0',
                versionRegex: /webpack@(\d+\.\d+\.\d+)/,
                timeout: 10000
              }
            ]
          }
        ],
        filePatterns: {
          configFiles: ['webpack.config', 'webpack.config.ts', 'package.json'],
          directories: ['node_modules/webpack'],
          dependencies: ['webpack', 'webpack-cli']
        }
      },
      {
        name: 'Vite',
        category: 'build-tools',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'vite --version',
            versionRegex: /vite\/(\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'macos',
            command: 'vite --version',
            versionRegex: /vite\/(\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'linux',
            command: 'vite --version',
            versionRegex: /vite\/(\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            commands: [
              {
                platform: 'windows',
                command: 'npm list vite --depth=0',
                versionRegex: /vite@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'macos',
                command: 'npm list vite --depth=0',
                versionRegex: /vite@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'linux',
                command: 'npm list vite --depth=0',
                versionRegex: /vite@(\d+\.\d+\.\d+)/,
                timeout: 10000
              }
            ]
          }
        ],
        filePatterns: {
          configFiles: ['vite.config', 'vite.config.ts', 'package.json'],
          directories: ['node_modules/vite'],
          dependencies: ['vite']
        }
      }
    ];

    this.frameworks.set('build-tools', frameworks);
  }

  /**
   * Initialize testing framework detection
   */
  private initializeTestingFrameworks(): void {
    const frameworks: FrameworkDefinition[] = [
      {
        name: 'Jest',
        category: 'testing',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'jest --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'macos',
            command: 'jest --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          },
          {
            platform: 'linux',
            command: 'jest --version',
            versionRegex: /(\d+\.\d+\.\d+)/,
            timeout: 10000,
            method: 'command'
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            commands: [
              {
                platform: 'windows',
                command: 'npm list jest --depth=0',
                versionRegex: /jest@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'macos',
                command: 'npm list jest --depth=0',
                versionRegex: /jest@(\d+\.\d+\.\d+)/,
                timeout: 10000
              },
              {
                platform: 'linux',
                command: 'npm list jest --depth=0',
                versionRegex: /jest@(\d+\.\d+\.\d+)/,
                timeout: 10000
              }
            ]
          }
        ],
        filePatterns: {
          configFiles: ['jest.config', 'jest.config.ts', 'package.json'],
          directories: ['__tests__', 'test', 'tests', 'node_modules/jest'],
          dependencies: ['jest', '@types/jest']
        }
      }
    ];

    this.frameworks.set('testing', frameworks);
  }
}

// Export singleton instance for global use
export const frameworkDetector = new FrameworkDetector(); 