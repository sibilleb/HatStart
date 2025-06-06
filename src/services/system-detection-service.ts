/**
 * System Detection Integration Service
 * Bridges the system detection framework with UI components via Electron IPC
 */

import type {
    CategoryDetectionResult,
    DetectionResult,
    SystemDetectionReport,
    ToolCategory
} from '../shared/detection-types.js';

import type {
    CategoryInfo,
    Tool,
    ToolCategory as UIToolCategory
} from '../types/ui-types.js';

// Import the shared ElectronAPI type
import '../types/electron.d.ts';

/**
 * System Detection Service
 * Provides interface to system detection functionality for the UI via Electron IPC
 */
export class SystemDetectionService {
    private cache: SystemDetectionReport | null = null;
    private cacheExpiry: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor() {
        console.log('🔧 SystemDetectionService: Initialized for Electron IPC communication');
    }

    /**
     * Get system detection report (cached for 5 minutes)
     */
    public async getSystemDetectionReport(): Promise<SystemDetectionReport> {
        // Return cached report if available and recent
        if (this.cache && this.isReportRecent()) {
            return this.cache;
        }

        // Run real system detection via IPC
        const response = await window.electronAPI.detectInstalledTools();
        
        if (!response.success || !response.data) {
            throw new Error(response.error?.message || 'System detection failed');
        }

        this.cache = response.data;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        return this.cache;
    }

    /**
     * Force refresh of detection data
     */
    public async refreshDetection(): Promise<SystemDetectionReport> {
        this.cache = null;
        this.cacheExpiry = 0;
        return this.getSystemDetectionReport();
    }

    /**
     * Check if report is still valid (not expired)
     */
    private isReportRecent(): boolean {
        return Date.now() < this.cacheExpiry;
    }

    /**
     * Convert detection report to UI-friendly category format
     */
    public async getCategoriesForUI(): Promise<CategoryInfo[]> {
        const report = await this.getSystemDetectionReport();
        return this.convertDetectionReportToCategories(report);
    }

    /**
     * Convert system detection report to UI categories
     */
    private convertDetectionReportToCategories(report: SystemDetectionReport): CategoryInfo[] {
        const categories: CategoryInfo[] = [];

        for (const categoryResult of report.categories) {
            const uiCategory = this.convertCategoryResult(categoryResult);
            if (uiCategory) {
                categories.push(uiCategory);
            }
        }

        return categories;
    }

    /**
     * Convert a single category detection result to UI format
     */
    private convertCategoryResult(categoryResult: CategoryDetectionResult): CategoryInfo | null {
        const uiCategory = this.mapSystemCategoryToUI(categoryResult.category);
        if (!uiCategory) {
            return null;
        }

        const tools: Tool[] = categoryResult.tools.map(detectionResult => 
            this.convertDetectionResultToTool(detectionResult, categoryResult.category)
        );

        // Add some additional tools that might not be detected but are popular options
        const additionalTools = this.getAdditionalToolsForCategory(categoryResult.category);
        tools.push(...additionalTools);

        return {
            id: uiCategory.id,
            name: uiCategory.name,
            description: uiCategory.description,
            icon: uiCategory.icon,
            color: uiCategory.color,
            tools
        };
    }

    /**
     * Convert detection result to UI Tool format
     */
    private convertDetectionResultToTool(result: DetectionResult, category: ToolCategory): Tool {
        // Determine if tool is recommended based on category and detection result
        const isRecommended = this.isToolRecommended(result.name, category, result.found);
        
        // Estimate installation size and time (these would come from a tool database in a real app)
        const metadata = this.getToolMetadata(result.name);

        // Map system category to UI category
        const uiCategoryInfo = this.mapSystemCategoryToUI(category);

        return {
            id: this.generateToolId(result.name),
            name: result.name,
            description: this.getToolDescription(result.name, category),
            isInstalled: result.found,
            isRecommended,
            category: uiCategoryInfo?.id || 'frameworks',
            version: result.version,
            tags: this.getToolTags(result.name, category),
            size: metadata.size,
            installationTime: metadata.installTime,
            dependencies: [], // Would be populated from tool database
            platforms: ['windows', 'macos', 'linux'], // Default to all platforms
        };
    }

    /**
     * Map system detection category to UI category
     */
    private mapSystemCategoryToUI(category: ToolCategory): { 
        id: UIToolCategory; 
        name: string; 
        description: string; 
        icon: string; 
        color: string; 
    } | null {
        const categoryMap: Partial<Record<ToolCategory, { 
            id: UIToolCategory; 
            name: string; 
            description: string; 
            icon: string; 
            color: string; 
        }>> = {
            'programming-languages': {
                id: 'programming-languages',
                name: 'Programming Languages',
                description: 'Core programming languages and runtimes',
                icon: '💻',
                color: '#3B82F6'
            },
            'ides-editors': {
                id: 'code-editors',
                name: 'Code Editors & IDEs',
                description: 'Development environments and text editors',
                icon: '📝',
                color: '#8B5CF6'
            },
            'version-control': {
                id: 'version-control',
                name: 'Version Control',
                description: 'Source code management and collaboration tools',
                icon: '🔧',
                color: '#10B981'
            },
            'build-tools': {
                id: 'frameworks', // Map to existing UI category
                name: 'Build & Package Tools',
                description: 'Compilation, bundling, and package management',
                icon: '⚙️',
                color: '#F59E0B'
            },
            'testing-tools': {
                id: 'frameworks', // Map to existing UI category  
                name: 'Testing Frameworks',
                description: 'Testing libraries and quality assurance tools',
                icon: '🧪',
                color: '#EF4444'
            },
            'web-frameworks': {
                id: 'frameworks',
                name: 'Frameworks & Libraries',
                description: 'Application frameworks and development libraries',
                icon: '🚀',
                color: '#8B5CF6'
            },
            'databases': {
                id: 'databases',
                name: 'Databases',
                description: 'Database systems and data storage solutions',
                icon: '🗄️',
                color: '#059669'
            },
            'containers': {
                id: 'containerization',
                name: 'Containerization',
                description: 'Container platforms and orchestration tools',
                icon: '📦',
                color: '#0EA5E9'
            },
            'cloud-tools': {
                id: 'cloud-tools',
                name: 'Cloud Platforms',
                description: 'Cloud services and deployment platforms',
                icon: '☁️',
                color: '#6366F1'
            }
        };

        return categoryMap[category] || null;
    }

    /**
     * Determine if a tool should be recommended
     */
    private isToolRecommended(toolName: string, category: ToolCategory, isInstalled: boolean): boolean {
        // If already installed, it's not a recommendation
        if (isInstalled) {
            return false;
        }

        // Recommend popular/essential tools based on category
        const recommendedTools: Record<string, string[]> = {
            'programming-languages': ['node', 'python', 'java', 'go'],
            'ides-editors': ['vscode', 'vim', 'jetbrains'],
            'version-control': ['git', 'github-cli'],
            'build-tools': ['npm', 'yarn', 'webpack', 'docker'],
            'testing-tools': ['jest', 'mocha', 'pytest'],
            'web-frameworks': ['react', 'vue', 'angular', 'express'],
            'databases': ['postgresql', 'mongodb', 'redis'],
            'containers': ['docker', 'kubernetes'],
            'cloud-tools': ['aws-cli', 'gcloud', 'azure-cli']
        };

        const categoryRecommendations = recommendedTools[category] || [];
        return categoryRecommendations.some(rec => 
            toolName.toLowerCase().includes(rec.toLowerCase())
        );
    }

    /**
     * Get additional tools that might not be detected but are popular options
     */
    private getAdditionalToolsForCategory(category: ToolCategory): Tool[] {
        const additionalTools: Partial<Record<ToolCategory, Partial<Tool>[]>> = {
            'programming-languages': [
                { name: 'Rust', description: 'Systems programming language focused on safety and performance' },
                { name: 'TypeScript', description: 'Typed superset of JavaScript' },
                { name: 'Kotlin', description: 'Modern programming language for JVM and Android' }
            ],
            'ides-editors': [
                { name: 'WebStorm', description: 'Professional IDE for JavaScript development' },
                { name: 'Atom', description: 'Hackable text editor for the 21st century' },
                { name: 'Sublime Text', description: 'Sophisticated text editor for code, markup and prose' }
            ],
            'version-control': [
                { name: 'Sourcetree', description: 'Free Git GUI client' },
                { name: 'GitKraken', description: 'Legendary Git GUI client' }
            ],
            'build-tools': [
                { name: 'Vite', description: 'Next generation frontend tooling' },
                { name: 'Parcel', description: 'Zero configuration build tool' },
                { name: 'Rollup', description: 'Module bundler for JavaScript' }
            ],
            'testing-tools': [
                { name: 'Cypress', description: 'End-to-end testing framework' },
                { name: 'Vitest', description: 'Blazing fast unit test framework' }
            ],
            'web-frameworks': [
                { name: 'Svelte', description: 'Cybernetically enhanced web apps' },
                { name: 'Next.js', description: 'React framework for production' }
            ],
            'databases': [
                { name: 'SQLite', description: 'Lightweight embedded database' },
                { name: 'Elasticsearch', description: 'Distributed search and analytics engine' }
            ],
            'containers': [
                { name: 'Podman', description: 'Daemonless container engine' },
                { name: 'Docker Compose', description: 'Multi-container Docker applications' }
            ],
            'cloud-tools': [
                { name: 'Terraform', description: 'Infrastructure as code' },
                { name: 'Ansible', description: 'Automation platform' }
            ]
        };

        const categoryTools = additionalTools[category] || [];
        const uiCategoryInfo = this.mapSystemCategoryToUI(category);
        
        return categoryTools.map(toolData => ({
            id: this.generateToolId(toolData.name!),
            name: toolData.name!,
            description: toolData.description!,
            isInstalled: false,
            isRecommended: true,
            category: uiCategoryInfo?.id || 'frameworks',
            version: undefined,
            tags: this.getToolTags(toolData.name!, category),
            size: this.getToolMetadata(toolData.name!).size,
            installationTime: this.getToolMetadata(toolData.name!).installTime,
            dependencies: [],
            platforms: ['windows', 'macos', 'linux'] as const,
        }));
    }

    /**
     * Generate unique tool ID
     */
    private generateToolId(toolName: string): string {
        return toolName.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Get tool description based on name and category
     */
    private getToolDescription(toolName: string, category: ToolCategory): string {
        const descriptions: Record<string, string> = {
            // Programming Languages
            'node': 'JavaScript runtime built on Chrome\'s V8 JavaScript engine',
            'python': 'High-level programming language with clean syntax',
            'java': 'Object-oriented programming language and computing platform',
            'go': 'Open source programming language that makes it easy to build simple, reliable, and efficient software',
            
            // IDEs/Editors
            'vscode': 'Free source-code editor made by Microsoft',
            'vim': 'Highly configurable text editor',
            'sublime': 'Sophisticated text editor for code, markup and prose',
            
            // Version Control
            'git': 'Distributed version control system',
            'github-cli': 'GitHub\'s official command line tool',
            
            // Build Tools
            'npm': 'Package manager for the JavaScript programming language',
            'yarn': 'Fast, reliable, and secure dependency management',
            'webpack': 'Static module bundler for modern JavaScript applications',
            'docker': 'Platform for developing, shipping, and running applications',
        };

        return descriptions[toolName.toLowerCase()] || `${toolName} - A ${category.replace('-', ' ')} tool`;
    }

    /**
     * Get tool tags based on name and category
     */
    private getToolTags(toolName: string, category: ToolCategory): string[] {
        const tagMap: Record<string, string[]> = {
            'node': ['runtime', 'javascript', 'backend'],
            'python': ['language', 'scripting', 'data-science'],
            'java': ['language', 'enterprise', 'jvm'],
            'vscode': ['editor', 'microsoft', 'extensions'],
            'vim': ['editor', 'terminal', 'modal'],
            'git': ['vcs', 'distributed', 'collaboration'],
            'npm': ['package-manager', 'javascript', 'registry'],
            'docker': ['containers', 'virtualization', 'deployment'],
        };

        const baseTags = tagMap[toolName.toLowerCase()] || [];
        const categoryTag = category.replace('-', ' ');
        
        return [...baseTags, categoryTag];
    }

    /**
     * Get tool metadata (size, install time, etc.)
     */
    private getToolMetadata(toolName: string): { size: string; installTime: string } {
        // In a real application, this would come from a comprehensive tool database
        const metadata: Record<string, { size: string; installTime: string }> = {
            'node': { size: '50MB', installTime: '2 min' },
            'python': { size: '100MB', installTime: '5 min' },
            'java': { size: '200MB', installTime: '8 min' },
            'vscode': { size: '150MB', installTime: '3 min' },
            'docker': { size: '500MB', installTime: '10 min' },
            'git': { size: '30MB', installTime: '1 min' },
        };

        return metadata[toolName.toLowerCase()] || { size: '25MB', installTime: '2 min' };
    }

    /**
     * Get basic system information
     */
    public async getSystemInfo() {
        const report = await this.getSystemDetectionReport();
        return {
            platform: report.systemInfo.platform,
            osVersion: report.systemInfo.version,
            arch: report.systemInfo.architecture,
            totalTools: report.categories.reduce((sum, cat) => sum + cat.tools.length, 0),
            detectedTools: report.categories.reduce((sum, cat) => 
                sum + cat.tools.filter(tool => tool.found).length, 0
            ),
            timestamp: report.timestamp
        };
    }
}

// Export singleton instance
export const systemDetectionService = new SystemDetectionService(); 