"use strict";
/**
 * Framework and Library Detection Module
 * Cross-platform detection for web, backend, and mobile frameworks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.frameworkDetector = exports.FrameworkDetector = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class FrameworkDetector {
    constructor() {
        this.frameworks = new Map();
        this.detectionCache = new Map();
        this.initializeFrameworks();
    }
    /**
     * Detect all frameworks on the system
     */
    async detectAllFrameworks() {
        const results = new Map();
        for (const [category, frameworks] of this.frameworks.entries()) {
            const categoryResults = [];
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
    async detectFrameworksByCategory(category) {
        const frameworks = this.frameworks.get(category) || [];
        const results = [];
        for (const framework of frameworks) {
            const result = await this.detectFramework(framework);
            results.push(result);
        }
        return results;
    }
    /**
     * Detect a specific framework by name
     */
    async detectFrameworkByName(name) {
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
    async detectFramework(framework) {
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
    async tryCommandDetection(framework, platform) {
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
    async tryPackageManagerDetection(framework, platform) {
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
            if (!pmCommand)
                continue;
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
            }
            catch (error) {
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
    async tryFileDetection(framework) {
        if (!framework.filePatterns) {
            return {
                name: framework.name,
                found: false,
                detectionMethod: 'filesystem',
                error: 'No file patterns configured'
            };
        }
        const { configFiles, directories, dependencies } = framework.filePatterns;
        const foundIndicators = [];
        // Check for configuration files in current directory and common locations
        const searchPaths = ['.', './src', './app', './public'];
        for (const searchPath of searchPaths) {
            for (const configFile of configFiles) {
                const filePath = (0, path_1.join)(process.cwd(), searchPath, configFile);
                if ((0, fs_1.existsSync)(filePath)) {
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
                const dirPath = (0, path_1.join)(process.cwd(), searchPath, directory);
                if ((0, fs_1.existsSync)(dirPath)) {
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
    extractVersionFromPackageJson(packageJsonPath, dependencies) {
        try {
            const packageContent = (0, fs_1.readFileSync)(packageJsonPath, 'utf8');
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
        }
        catch (error) {
            // Ignore JSON parse errors
        }
        return undefined;
    }
    /**
     * Execute a detection command
     */
    async executeCommand(frameworkName, cmd) {
        try {
            const { stdout, stderr } = await execAsync(cmd.command, {
                timeout: cmd.timeout || 5000,
                encoding: 'utf8'
            });
            const output = stdout || stderr;
            let version;
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
        }
        catch (error) {
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
    async findInstallationPath(command) {
        try {
            const platform = this.getCurrentPlatform();
            const whichCommand = platform === 'windows' ? `where ${command.split(' ')[0]}` : `which ${command.split(' ')[0]}`;
            const { stdout } = await execAsync(whichCommand, {
                timeout: 2000,
                encoding: 'utf8'
            });
            return stdout.trim().split('\n')[0];
        }
        catch (error) {
            return undefined;
        }
    }
    /**
     * Get current platform
     */
    getCurrentPlatform() {
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
    initializeFrameworks() {
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
    initializeWebFrontendFrameworks() {
        const frameworks = [
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
                name: 'Vue.js',
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
                    configFiles: ['vue.config.js', 'vite.config.js', 'package.json'],
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
    initializeWebBackendFrameworks() {
        const frameworks = [
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
                name: 'Express.js',
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
                    configFiles: ['package.json', 'app.js', 'server.js', 'index.js'],
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
    initializeMobileFrameworks() {
        const frameworks = [
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
                    configFiles: ['package.json', 'metro.config.js', 'react-native.config.js'],
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
    initializeBuildTools() {
        const frameworks = [
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
                    configFiles: ['webpack.config.js', 'webpack.config.ts', 'package.json'],
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
                    configFiles: ['vite.config.js', 'vite.config.ts', 'package.json'],
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
    initializeTestingFrameworks() {
        const frameworks = [
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
                    configFiles: ['jest.config.js', 'jest.config.ts', 'package.json'],
                    directories: ['__tests__', 'test', 'tests', 'node_modules/jest'],
                    dependencies: ['jest', '@types/jest']
                }
            }
        ];
        this.frameworks.set('testing', frameworks);
    }
}
exports.FrameworkDetector = FrameworkDetector;
// Export singleton instance for global use
exports.frameworkDetector = new FrameworkDetector();
//# sourceMappingURL=framework-detector.js.map