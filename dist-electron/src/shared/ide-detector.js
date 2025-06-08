"use strict";
/**
 * IDE and Development Tool Detection Module
 * Cross-platform detection for IDEs, code editors, and development tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ideDetector = exports.IDEDetector = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class IDEDetector {
    constructor() {
        this.tools = new Map();
        this.detectionCache = new Map();
        this.initializeTools();
    }
    /**
     * Detect all IDEs and development tools on the system
     */
    async detectAllTools() {
        const results = new Map();
        for (const [category, tools] of this.tools.entries()) {
            const categoryResults = [];
            for (const tool of tools) {
                const result = await this.detectTool(tool);
                categoryResults.push(result);
            }
            results.set(category, categoryResults);
        }
        return results;
    }
    /**
     * Detect tools in a specific category
     */
    async detectToolsByCategory(category) {
        const tools = this.tools.get(category) || [];
        const results = [];
        for (const tool of tools) {
            const result = await this.detectTool(tool);
            results.push(result);
        }
        return results;
    }
    /**
     * Detect a specific tool by name
     */
    async detectToolByName(name) {
        // Check cache first
        if (this.detectionCache.has(name)) {
            return this.detectionCache.get(name);
        }
        // Find tool across all categories
        for (const tools of this.tools.values()) {
            const tool = tools.find(t => t.name.toLowerCase() === name.toLowerCase());
            if (tool) {
                const result = await this.detectTool(tool);
                this.detectionCache.set(name, result);
                return result;
            }
        }
        return undefined;
    }
    /**
     * Detect plugins/extensions for a specific IDE
     */
    async detectPlugins(ideName) {
        const tool = this.findToolByName(ideName);
        if (!tool || !tool.plugins) {
            return [];
        }
        const pluginResults = [];
        const platform = this.getCurrentPlatform();
        for (const plugin of tool.plugins) {
            const result = await this.detectPlugin(tool, plugin, platform);
            pluginResults.push(result);
        }
        return pluginResults;
    }
    /**
     * Detect a specific tool
     */
    async detectTool(tool) {
        const platform = this.getCurrentPlatform();
        // Try command-based detection first
        const commandResult = await this.tryCommandDetection(tool, platform);
        if (commandResult.found) {
            return commandResult;
        }
        // Try registry detection (Windows only)
        if (platform === 'windows') {
            const registryResult = await this.tryRegistryDetection(tool, platform);
            if (registryResult.found) {
                return registryResult;
            }
        }
        // Try filesystem detection
        const filesystemResult = await this.tryFilesystemDetection(tool, platform);
        if (filesystemResult.found) {
            return filesystemResult;
        }
        return {
            name: tool.name,
            found: false,
            detectionMethod: 'command',
            error: 'Tool not detected using any method'
        };
    }
    /**
     * Try command-based detection
     */
    async tryCommandDetection(tool, platform) {
        // Find command for current platform
        const platformCommand = tool.commands.find(cmd => cmd.platform === platform && (cmd.method === 'command' || !cmd.method));
        if (!platformCommand) {
            return {
                name: tool.name,
                found: false,
                detectionMethod: 'command',
                error: `No detection command defined for platform: ${platform}`
            };
        }
        // Try primary command
        const primaryResult = await this.executeCommand(tool.name, platformCommand);
        if (primaryResult.found) {
            return primaryResult;
        }
        // Try alternative commands
        if (platformCommand.alternatives) {
            for (const altCommand of platformCommand.alternatives) {
                const altResult = await this.executeCommand(tool.name, {
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
            name: tool.name,
            found: false,
            detectionMethod: 'command',
            error: primaryResult.error || 'Command not found'
        };
    }
    /**
     * Try Windows registry detection
     */
    async tryRegistryDetection(tool, platform) {
        if (platform !== 'windows') {
            return {
                name: tool.name,
                found: false,
                detectionMethod: 'registry',
                error: 'Registry detection only available on Windows'
            };
        }
        const registryCommand = tool.commands.find(cmd => cmd.platform === platform && cmd.method === 'registry' && cmd.registryKey);
        if (!registryCommand || !registryCommand.registryKey) {
            return {
                name: tool.name,
                found: false,
                detectionMethod: 'registry',
                error: 'No registry key configured for Windows detection'
            };
        }
        try {
            const { stdout } = await execAsync(`reg query "${registryCommand.registryKey}" /s`, { timeout: registryCommand.timeout || 5000, encoding: 'utf8' });
            if (stdout.includes(registryCommand.registryKey)) {
                let version;
                if (registryCommand.versionRegex) {
                    const match = stdout.match(registryCommand.versionRegex);
                    version = match?.[1];
                }
                return {
                    name: tool.name,
                    found: true,
                    version,
                    detectionMethod: 'registry',
                    metadata: {
                        registryKey: registryCommand.registryKey,
                        platform
                    }
                };
            }
        }
        catch {
            // Registry key not found or access denied
        }
        return {
            name: tool.name,
            found: false,
            detectionMethod: 'registry',
            error: 'Not found in Windows registry'
        };
    }
    /**
     * Try filesystem detection
     */
    async tryFilesystemDetection(tool, platform) {
        const installationPaths = tool.installationPaths?.[platform] || [];
        const foundPaths = [];
        // Check standard installation paths
        for (const path of installationPaths) {
            const expandedPath = this.expandPath(path, platform);
            if ((0, fs_1.existsSync)(expandedPath)) {
                foundPaths.push(expandedPath);
            }
        }
        // Check for configuration files in user directories
        if (tool.configFiles) {
            const configPaths = this.getConfigPaths(platform);
            for (const configPath of configPaths) {
                for (const configFile of tool.configFiles) {
                    const fullPath = (0, path_1.join)(configPath, configFile);
                    if ((0, fs_1.existsSync)(fullPath)) {
                        foundPaths.push(fullPath);
                    }
                }
            }
        }
        if (foundPaths.length > 0) {
            // Try to extract version from found installation
            const version = await this.extractVersionFromPath(foundPaths[0], tool);
            return {
                name: tool.name,
                found: true,
                version,
                path: foundPaths[0],
                detectionMethod: 'filesystem',
                metadata: {
                    foundPaths,
                    platform
                }
            };
        }
        return {
            name: tool.name,
            found: false,
            detectionMethod: 'filesystem',
            error: 'Not found in standard installation paths'
        };
    }
    /**
     * Detect a plugin for a specific IDE
     */
    async detectPlugin(ide, plugin, platform) {
        const userConfigPaths = this.getConfigPaths(platform);
        const foundIndicators = [];
        // Check plugin path patterns
        for (const configPath of userConfigPaths) {
            for (const pathPattern of plugin.pathPatterns) {
                const pluginPath = (0, path_1.join)(configPath, pathPattern);
                if ((0, fs_1.existsSync)(pluginPath)) {
                    foundIndicators.push(`Plugin directory: ${pluginPath}`);
                }
            }
            // Check config file patterns
            if (plugin.configPatterns) {
                for (const configPattern of plugin.configPatterns) {
                    const configFilePath = (0, path_1.join)(configPath, configPattern);
                    if ((0, fs_1.existsSync)(configFilePath)) {
                        foundIndicators.push(`Config file: ${configFilePath}`);
                    }
                }
            }
        }
        if (foundIndicators.length > 0) {
            return {
                name: `${ide.name} - ${plugin.name}`,
                found: true,
                detectionMethod: 'filesystem',
                metadata: {
                    indicators: foundIndicators,
                    pluginName: plugin.name,
                    ideHost: ide.name
                }
            };
        }
        return {
            name: `${ide.name} - ${plugin.name}`,
            found: false,
            detectionMethod: 'filesystem',
            error: 'Plugin not found in expected locations'
        };
    }
    /**
     * Execute a detection command
     */
    async executeCommand(toolName, cmd) {
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
                name: toolName,
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
                name: toolName,
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
            const whichCommand = platform === 'windows' ?
                `where ${command.split(' ')[0]}` :
                `which ${command.split(' ')[0]}`;
            const { stdout } = await execAsync(whichCommand, {
                timeout: 2000,
                encoding: 'utf8'
            });
            return stdout.trim().split('\n')[0];
        }
        catch {
            return undefined;
        }
    }
    /**
     * Extract version from installation path
     */
    async extractVersionFromPath(path, _tool) {
        try {
            // Try to read version from common version files
            const versionFiles = ['VERSION', 'version.txt', 'RELEASE', 'package.json'];
            for (const versionFile of versionFiles) {
                const versionPath = (0, path_1.join)(path, versionFile);
                if ((0, fs_1.existsSync)(versionPath)) {
                    const content = (0, fs_1.readFileSync)(versionPath, 'utf8');
                    if (versionFile === 'package.json') {
                        try {
                            const packageData = JSON.parse(content);
                            return packageData.version;
                        }
                        catch {
                            continue;
                        }
                    }
                    else {
                        // Try to extract version using common patterns
                        const versionMatch = content.match(/(\d+\.\d+(?:\.\d+)?)/);
                        if (versionMatch) {
                            return versionMatch[1];
                        }
                    }
                }
            }
        }
        catch {
            // Ignore file read errors
        }
        return undefined;
    }
    /**
     * Expand path variables based on platform
     */
    expandPath(path, _platform) {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const appDataDir = process.env.APPDATA || '';
        const localAppDataDir = process.env.LOCALAPPDATA || '';
        return path
            .replace(/\$HOME/g, homeDir)
            .replace(/%USERPROFILE%/g, homeDir)
            .replace(/%APPDATA%/g, appDataDir)
            .replace(/%LOCALAPPDATA%/g, localAppDataDir)
            .replace(/~/g, homeDir);
    }
    /**
     * Get configuration paths for the current platform
     */
    getConfigPaths(platform) {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        switch (platform) {
            case 'windows':
                return [
                    process.env.APPDATA || '',
                    process.env.LOCALAPPDATA || '',
                    (0, path_1.join)(homeDir, 'AppData', 'Roaming'),
                    (0, path_1.join)(homeDir, 'AppData', 'Local')
                ].filter(Boolean);
            case 'macos':
                return [
                    (0, path_1.join)(homeDir, 'Library', 'Application Support'),
                    (0, path_1.join)(homeDir, 'Library', 'Preferences'),
                    (0, path_1.join)(homeDir, '.config'),
                    homeDir
                ];
            case 'linux':
                return [
                    (0, path_1.join)(homeDir, '.config'),
                    (0, path_1.join)(homeDir, '.local', 'share'),
                    homeDir,
                    '/opt',
                    '/usr/local'
                ];
            default:
                return [homeDir];
        }
    }
    /**
     * Find tool by name across all categories
     */
    findToolByName(name) {
        for (const tools of this.tools.values()) {
            const tool = tools.find(t => t.name.toLowerCase() === name.toLowerCase());
            if (tool) {
                return tool;
            }
        }
        return undefined;
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
     * Initialize tool definitions
     */
    initializeTools() {
        // Initialize IDEs
        this.initializeIDEs();
        // Initialize code editors
        this.initializeEditors();
        // Initialize version control tools
        this.initializeVersionControl();
        // Initialize containerization tools
        this.initializeContainerization();
        // Initialize database tools
        this.initializeDatabaseTools();
        // Initialize API tools
        this.initializeAPITools();
        // Initialize terminal tools
        this.initializeTerminalTools();
    }
    /**
     * Initialize IDE detection
     */
    initializeIDEs() {
        const ides = [
            {
                name: 'IntelliJ IDEA',
                category: 'ide',
                essential: true,
                commands: [
                    {
                        platform: 'windows',
                        command: 'idea --version',
                        versionRegex: /IntelliJ IDEA (\d+\.\d+(?:\.\d+)?)/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'idea --version',
                        versionRegex: /IntelliJ IDEA (\d+\.\d+(?:\.\d+)?)/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'idea --version',
                        versionRegex: /IntelliJ IDEA (\d+\.\d+(?:\.\d+)?)/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'windows',
                        method: 'registry',
                        command: '',
                        registryKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\JetBrains\\IntelliJ IDEA',
                        timeout: 5000
                    }
                ],
                installationPaths: {
                    windows: ['%LOCALAPPDATA%\\JetBrains\\IntelliJ IDEA*', 'C:\\Program Files\\JetBrains\\IntelliJ IDEA*'],
                    macos: ['/Applications/IntelliJ IDEA.app', '~/Applications/IntelliJ IDEA.app'],
                    linux: ['/opt/intellij-idea*', '~/intellij-idea*', '/usr/local/intellij-idea*']
                },
                configFiles: ['.idea', 'IntelliJIdea*'],
                plugins: [
                    {
                        name: 'TypeScript',
                        pathPatterns: ['JetBrains/IntelliJIdea*/plugins/typescript'],
                        configPatterns: ['JetBrains/IntelliJIdea*/options/typescript.xml']
                    }
                ]
            },
            {
                name: 'Eclipse',
                category: 'ide',
                essential: true,
                commands: [
                    {
                        platform: 'windows',
                        command: 'eclipse -version',
                        versionRegex: /Eclipse IDE for .*? Developers, Version (\d+\.\d+(?:\.\d+)?)/,
                        timeout: 15000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'eclipse -version',
                        versionRegex: /Eclipse IDE for .*? Developers, Version (\d+\.\d+(?:\.\d+)?)/,
                        timeout: 15000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'eclipse -version',
                        versionRegex: /Eclipse IDE for .*? Developers, Version (\d+\.\d+(?:\.\d+)?)/,
                        timeout: 15000,
                        method: 'command'
                    }
                ],
                installationPaths: {
                    windows: ['C:\\Program Files\\Eclipse*', '%USERPROFILE%\\eclipse*'],
                    macos: ['/Applications/Eclipse.app', '~/Applications/Eclipse.app', '~/eclipse*'],
                    linux: ['/opt/eclipse*', '~/eclipse*', '/usr/local/eclipse*']
                },
                configFiles: ['.metadata', 'eclipse.ini']
            },
            {
                name: 'Visual Studio',
                category: 'ide',
                essential: true,
                commands: [
                    {
                        platform: 'windows',
                        command: 'devenv /?',
                        versionRegex: /Microsoft Visual Studio (\d+)/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'windows',
                        method: 'registry',
                        command: '',
                        registryKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\VisualStudio',
                        timeout: 5000
                    }
                ],
                installationPaths: {
                    windows: [
                        'C:\\Program Files\\Microsoft Visual Studio\\*',
                        'C:\\Program Files (x86)\\Microsoft Visual Studio\\*'
                    ],
                    macos: ['/Applications/Visual Studio.app'],
                    linux: []
                }
            }
        ];
        this.tools.set('ide', ides);
    }
    /**
     * Initialize code editor detection
     */
    initializeEditors() {
        const editors = [
            {
                name: 'Visual Studio Code',
                category: 'editor',
                essential: true,
                commands: [
                    {
                        platform: 'windows',
                        command: 'code --version',
                        versionRegex: /(\d+\.\d+\.\d+)/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'code --version',
                        versionRegex: /(\d+\.\d+\.\d+)/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'code --version',
                        versionRegex: /(\d+\.\d+\.\d+)/,
                        timeout: 10000,
                        method: 'command'
                    }
                ],
                installationPaths: {
                    windows: [
                        '%LOCALAPPDATA%\\Programs\\Microsoft VS Code',
                        'C:\\Program Files\\Microsoft VS Code'
                    ],
                    macos: ['/Applications/Visual Studio Code.app'],
                    linux: ['/usr/bin/code', '/snap/bin/code', '/usr/local/bin/code']
                },
                configFiles: ['.vscode', 'Code - OSS'],
                plugins: [
                    {
                        name: 'TypeScript',
                        pathPatterns: ['.vscode/extensions/ms-vscode.vscode-typescript-next*'],
                        configPatterns: ['.vscode/settings.json']
                    },
                    {
                        name: 'ESLint',
                        pathPatterns: ['.vscode/extensions/dbaeumer.vscode-eslint*'],
                        configPatterns: ['.eslintrc*']
                    },
                    {
                        name: 'Prettier',
                        pathPatterns: ['.vscode/extensions/esbenp.prettier-vscode*'],
                        configPatterns: ['.prettierrc*']
                    }
                ]
            },
            {
                name: 'Cursor',
                category: 'editor',
                essential: true,
                commands: [
                    {
                        platform: 'windows',
                        command: 'cursor --version',
                        versionRegex: /(\d+\.\d+\.\d+)/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'cursor --version',
                        versionRegex: /(\d+\.\d+\.\d+)/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'cursor --version',
                        versionRegex: /(\d+\.\d+\.\d+)/,
                        timeout: 10000,
                        method: 'command'
                    }
                ],
                installationPaths: {
                    windows: [
                        '%LOCALAPPDATA%\\Programs\\Cursor',
                        'C:\\Program Files\\Cursor'
                    ],
                    macos: ['/Applications/Cursor.app'],
                    linux: ['/usr/bin/cursor', '/snap/bin/cursor', '/usr/local/bin/cursor']
                },
                configFiles: ['.cursor', '.vscode'],
                plugins: [
                    {
                        name: 'TypeScript',
                        pathPatterns: ['.cursor/extensions/ms-vscode.vscode-typescript-next*'],
                        configPatterns: ['.cursor/settings.json']
                    },
                    {
                        name: 'ESLint',
                        pathPatterns: ['.cursor/extensions/dbaeumer.vscode-eslint*'],
                        configPatterns: ['.eslintrc*']
                    },
                    {
                        name: 'Prettier',
                        pathPatterns: ['.cursor/extensions/esbenp.prettier-vscode*'],
                        configPatterns: ['.prettierrc*']
                    }
                ]
            },
            {
                name: 'Sublime Text',
                category: 'editor',
                essential: false,
                commands: [
                    {
                        platform: 'windows',
                        command: 'subl --version',
                        versionRegex: /Sublime Text Build (\d+)/,
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'subl --version',
                        versionRegex: /Sublime Text Build (\d+)/,
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'subl --version',
                        versionRegex: /Sublime Text Build (\d+)/,
                        timeout: 5000,
                        method: 'command'
                    }
                ],
                installationPaths: {
                    windows: [
                        'C:\\Program Files\\Sublime Text*',
                        '%LOCALAPPDATA%\\Programs\\Sublime Text*'
                    ],
                    macos: ['/Applications/Sublime Text.app'],
                    linux: ['/opt/sublime_text*', '/usr/bin/subl']
                }
            }
        ];
        this.tools.set('editor', editors);
    }
    /**
     * Initialize version control tool detection
     */
    initializeVersionControl() {
        const versionControl = [
            {
                name: 'Git',
                category: 'version-control',
                essential: true,
                commands: [
                    {
                        platform: 'windows',
                        command: 'git --version',
                        versionRegex: /git version (\d+\.\d+\.\d+)/,
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'git --version',
                        versionRegex: /git version (\d+\.\d+\.\d+)/,
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'git --version',
                        versionRegex: /git version (\d+\.\d+\.\d+)/,
                        timeout: 5000,
                        method: 'command'
                    }
                ],
                configFiles: ['.gitconfig', '.git']
            },
            {
                name: 'GitHub CLI',
                category: 'version-control',
                essential: false,
                commands: [
                    {
                        platform: 'windows',
                        command: 'gh --version',
                        versionRegex: /gh version (\d+\.\d+\.\d+)/,
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'gh --version',
                        versionRegex: /gh version (\d+\.\d+\.\d+)/,
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'gh --version',
                        versionRegex: /gh version (\d+\.\d+\.\d+)/,
                        timeout: 5000,
                        method: 'command'
                    }
                ]
            }
        ];
        this.tools.set('version-control', versionControl);
    }
    /**
     * Initialize containerization tool detection
     */
    initializeContainerization() {
        const containerTools = [
            {
                name: 'Docker',
                category: 'containerization',
                essential: true,
                commands: [
                    {
                        platform: 'windows',
                        command: 'docker --version',
                        versionRegex: /Docker version (\d+\.\d+\.\d+)/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'docker --version',
                        versionRegex: /Docker version (\d+\.\d+\.\d+)/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'docker --version',
                        versionRegex: /Docker version (\d+\.\d+\.\d+)/,
                        timeout: 10000,
                        method: 'command'
                    }
                ],
                configFiles: ['.docker', 'Dockerfile', 'docker-compose.yml']
            },
            {
                name: 'Kubernetes',
                category: 'containerization',
                essential: false,
                commands: [
                    {
                        platform: 'windows',
                        command: 'kubectl version --client',
                        versionRegex: /Client Version: version\.Info{.*GitVersion:"v(\d+\.\d+\.\d+)"/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'kubectl version --client',
                        versionRegex: /Client Version: version\.Info{.*GitVersion:"v(\d+\.\d+\.\d+)"/,
                        timeout: 10000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'kubectl version --client',
                        versionRegex: /Client Version: version\.Info{.*GitVersion:"v(\d+\.\d+\.\d+)"/,
                        timeout: 10000,
                        method: 'command'
                    }
                ]
            }
        ];
        this.tools.set('containerization', containerTools);
    }
    /**
     * Initialize database tool detection
     */
    initializeDatabaseTools() {
        const databaseTools = [
            {
                name: 'MySQL',
                category: 'database',
                essential: false,
                commands: [
                    {
                        platform: 'windows',
                        command: 'mysql --version',
                        versionRegex: /mysql.*?Ver (\d+\.\d+\.\d+)/,
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'mysql --version',
                        versionRegex: /mysql.*?Ver (\d+\.\d+\.\d+)/,
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'mysql --version',
                        versionRegex: /mysql.*?Ver (\d+\.\d+\.\d+)/,
                        timeout: 5000,
                        method: 'command'
                    }
                ]
            },
            {
                name: 'PostgreSQL',
                category: 'database',
                essential: false,
                commands: [
                    {
                        platform: 'windows',
                        command: 'psql --version',
                        versionRegex: /psql \(PostgreSQL\) (\d+\.\d+(?:\.\d+)?)/,
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'psql --version',
                        versionRegex: /psql \(PostgreSQL\) (\d+\.\d+(?:\.\d+)?)/,
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'psql --version',
                        versionRegex: /psql \(PostgreSQL\) (\d+\.\d+(?:\.\d+)?)/,
                        timeout: 5000,
                        method: 'command'
                    }
                ]
            }
        ];
        this.tools.set('database', databaseTools);
    }
    /**
     * Initialize API tool detection
     */
    initializeAPITools() {
        const apiTools = [
            {
                name: 'Postman',
                category: 'api-tools',
                essential: false,
                commands: [
                    {
                        platform: 'windows',
                        command: 'postman --version',
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'macos',
                        command: 'postman --version',
                        timeout: 5000,
                        method: 'command'
                    },
                    {
                        platform: 'linux',
                        command: 'postman --version',
                        timeout: 5000,
                        method: 'command'
                    }
                ],
                installationPaths: {
                    windows: ['%LOCALAPPDATA%\\Postman'],
                    macos: ['/Applications/Postman.app'],
                    linux: ['/opt/Postman', '~/Postman']
                }
            }
        ];
        this.tools.set('api-tools', apiTools);
    }
    /**
     * Initialize terminal tool detection
     */
    initializeTerminalTools() {
        const terminalTools = [
            {
                name: 'Windows Terminal',
                category: 'terminal',
                essential: false,
                commands: [
                    {
                        platform: 'windows',
                        command: 'wt --version',
                        versionRegex: /(\d+\.\d+\.\d+)/,
                        timeout: 5000,
                        method: 'command'
                    }
                ],
                installationPaths: {
                    windows: ['%LOCALAPPDATA%\\Microsoft\\WindowsApps\\wt.exe']
                }
            },
            {
                name: 'iTerm2',
                category: 'terminal',
                essential: false,
                commands: [
                    {
                        platform: 'macos',
                        command: 'osascript -e "tell application \\"iTerm\\" to version"',
                        timeout: 5000,
                        method: 'command'
                    }
                ],
                installationPaths: {
                    macos: ['/Applications/iTerm.app']
                }
            }
        ];
        this.tools.set('terminal', terminalTools);
    }
}
exports.IDEDetector = IDEDetector;
// Export singleton instance for global use
exports.ideDetector = new IDEDetector();
//# sourceMappingURL=ide-detector.js.map