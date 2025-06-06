"use strict";
/**
 * Sample Manifest Data
 * Demonstrates the TypeScript interfaces in practice
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleMasterManifest = exports.sampleFrontendCategory = exports.sampleVSCode = exports.sampleNodeJS = void 0;
// Sample tool manifests
exports.sampleNodeJS = {
    id: 'nodejs',
    name: 'Node.js',
    description: 'JavaScript runtime built on Chrome\'s V8 JavaScript engine',
    longDescription: 'Node.js is a free, open-source, cross-platform JavaScript runtime environment that lets developers create servers, web apps, command line tools and scripts.',
    category: 'language',
    tags: ['javascript', 'runtime', 'server'],
    experienceLevel: ['beginner', 'intermediate', 'advanced'],
    systemRequirements: {
        platforms: ['windows', 'macos', 'linux'],
        architectures: ['x64', 'arm64'],
        minRam: 512,
        minDiskSpace: 200,
    },
    version: {
        stable: '20.11.0',
        recommended: '20.11.0',
        checkCommand: 'node --version',
        versionPattern: '^v?(.+)$'
    },
    installation: [
        {
            method: 'direct-download',
            platform: 'windows',
            command: 'winget',
            args: ['install', 'OpenJS.NodeJS'],
            verifyCommand: 'node --version',
            verifyPattern: 'v20'
        },
        {
            method: 'homebrew',
            platform: 'macos',
            command: 'brew',
            args: ['install', 'node'],
            verifyCommand: 'node --version',
            verifyPattern: 'v20'
        },
        {
            method: 'apt',
            platform: 'linux',
            command: 'curl',
            args: ['-fsSL', 'https://deb.nodesource.com/setup_20.x'],
            postInstall: ['sudo apt-get install -y nodejs'],
            verifyCommand: 'node --version',
            verifyPattern: 'v20'
        }
    ],
    ideIntegration: {
        vscode: {
            extensionId: 'ms-vscode.vscode-typescript-next',
            settings: {
                'typescript.preferences.importModuleSpecifier': 'relative'
            }
        },
        cursor: {
            extensionId: 'ms-vscode.vscode-typescript-next',
            rules: ['@typescript-eslint/recommended']
        }
    },
    documentation: {
        officialDocs: 'https://nodejs.org/docs/',
        quickStart: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs',
        apiReference: 'https://nodejs.org/api/'
    },
    website: 'https://nodejs.org/',
    repository: 'https://github.com/nodejs/node',
    license: 'MIT',
    maintainer: {
        name: 'Node.js Foundation',
        url: 'https://nodejs.org/'
    },
    popularityScore: 95,
    isActiveMaintained: true,
    lastUpdated: '2024-01-15T00:00:00Z',
    schemaVersion: '1.0.0'
};
exports.sampleVSCode = {
    id: 'vscode',
    name: 'Visual Studio Code',
    description: 'Free source-code editor with debugging, task running, and version control',
    longDescription: 'Visual Studio Code is a lightweight but powerful source code editor which runs on your desktop and is available for Windows, macOS and Linux.',
    category: 'productivity',
    tags: ['editor', 'ide', 'microsoft'],
    experienceLevel: ['beginner', 'intermediate', 'advanced'],
    systemRequirements: {
        platforms: ['windows', 'macos', 'linux'],
        architectures: ['x64', 'arm64'],
        minRam: 1024,
        minDiskSpace: 500,
    },
    version: {
        stable: '1.85.1',
        recommended: '1.85.1',
        checkCommand: 'code --version',
        versionPattern: '^(.+)\\n'
    },
    installation: [
        {
            method: 'direct-download',
            platform: 'windows',
            command: 'winget',
            args: ['install', 'Microsoft.VisualStudioCode'],
            verifyCommand: 'code --version'
        },
        {
            method: 'homebrew',
            platform: 'macos',
            command: 'brew',
            args: ['install', '--cask', 'visual-studio-code'],
            verifyCommand: 'code --version'
        },
        {
            method: 'snap',
            platform: 'linux',
            command: 'snap',
            args: ['install', 'code', '--classic'],
            verifyCommand: 'code --version'
        }
    ],
    configuration: [
        {
            key: 'editor.fontSize',
            name: 'Font Size',
            description: 'Controls the font size in pixels',
            type: 'number',
            defaultValue: 14,
            required: false
        },
        {
            key: 'editor.theme',
            name: 'Color Theme',
            description: 'The color theme to use',
            type: 'string',
            defaultValue: 'Default Dark+',
            possibleValues: ['Default Dark+', 'Default Light+', 'Monokai', 'Solarized Dark'],
            required: false
        }
    ],
    documentation: {
        officialDocs: 'https://code.visualstudio.com/docs',
        quickStart: 'https://code.visualstudio.com/docs/introvideos/basics'
    },
    website: 'https://code.visualstudio.com/',
    repository: 'https://github.com/microsoft/vscode',
    license: 'MIT',
    maintainer: {
        name: 'Microsoft',
        url: 'https://microsoft.com'
    },
    popularityScore: 88,
    isActiveMaintained: true,
    lastUpdated: '2024-01-10T00:00:00Z',
    schemaVersion: '1.0.0'
};
// Sample category manifest
exports.sampleFrontendCategory = {
    category: 'frontend',
    name: 'Frontend Development',
    description: 'Tools for building user interfaces and client-side applications',
    icon: '🎨',
    color: '#3B82F6',
    tools: [], // Would be populated with frontend tools
    recommendations: [
        {
            name: 'Modern React Stack',
            description: 'Complete setup for React development with TypeScript',
            toolIds: ['nodejs', 'vscode', 'react', 'typescript', 'vite'],
            experienceLevel: 'intermediate'
        }
    ],
    lastUpdated: '2024-01-15T00:00:00Z',
    schemaVersion: '1.0.0'
};
// Sample master manifest
exports.sampleMasterManifest = {
    metadata: {
        name: 'HatStart Developer Tools',
        version: '1.0.0',
        description: 'Comprehensive collection of developer tools and their installation instructions',
        lastUpdated: '2024-01-15T00:00:00Z',
        schemaVersion: '1.0.0'
    },
    categories: [
        'frontend',
        'backend',
        'devops',
        'mobile',
        'design',
        'testing',
        'database',
        'productivity',
        'security',
        'language',
        'version-control',
        'cloud'
    ],
    categoryManifests: {
        'frontend': exports.sampleFrontendCategory,
        'backend': exports.sampleFrontendCategory, // Placeholder
        'devops': exports.sampleFrontendCategory, // Placeholder
        'mobile': exports.sampleFrontendCategory, // Placeholder
        'design': exports.sampleFrontendCategory, // Placeholder
        'testing': exports.sampleFrontendCategory, // Placeholder
        'database': exports.sampleFrontendCategory, // Placeholder
        'productivity': exports.sampleFrontendCategory, // Placeholder
        'security': exports.sampleFrontendCategory, // Placeholder
        'language': exports.sampleFrontendCategory, // Placeholder
        'version-control': exports.sampleFrontendCategory, // Placeholder
        'cloud': exports.sampleFrontendCategory // Placeholder
    },
    defaults: {
        experienceLevel: 'intermediate',
        platform: 'macos',
        architecture: 'arm64',
        installationPreferences: ['homebrew', 'direct-download', 'script']
    }
};
//# sourceMappingURL=sample-manifest.js.map