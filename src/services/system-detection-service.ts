/**
 * System Detection Integration Service
 * Bridges the system detection framework with UI components via Electron IPC
 */

import type {
    CategoryDetectionResult,
    DetectionResult,
    SystemDetectionReport,
    ToolCategory
} from '../shared/detection-types';

import type {
    CategoryInfo,
    Tool,
    ToolCategory as UIToolCategory
} from '../types/ui-types';

// Import the shared ElectronAPI type
import '../types/electron.d.ts';

// Map detection categories to UI categories
const categoryMap: Record<string, UIToolCategory> = {
    'programming-languages': 'language',
    'web-frameworks': 'web-frameworks',
    'mobile-frameworks': 'web-frameworks',
    'backend-frameworks': 'web-frameworks',
    'databases': 'database',
    'version-control': 'developer-tools',
    'containers': 'containers',
    'cloud-tools': 'cloud',
    'ides-editors': 'ide',
    'testing-tools': 'testing',
    'security-tools': 'testing', // Security tools go in testing category
    'build-tools': 'developer-tools',
    'package-managers': 'package-managers'
};

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
            console.log('SystemDetectionService: Returning cached report');
            return this.cache;
        }

        console.log('SystemDetectionService: Calling detectInstalledTools...');
        // Run real system detection via IPC
        const response = await window.electronAPI.detectInstalledTools();
        console.log('SystemDetectionService: Response:', response);
        
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
        console.log('SystemDetectionService: Converting report to categories:', report);
        const categories = this.convertDetectionReportToCategories(report);
        console.log('SystemDetectionService: Converted categories:', categories);
        return categories;
    }

    /**
     * Convert system detection report to UI categories
     */
    private convertDetectionReportToCategories(report: SystemDetectionReport): CategoryInfo[] {
        const categories: CategoryInfo[] = [];

        console.log('SystemDetectionService: Processing categories:', report.categories);
        for (const categoryResult of report.categories) {
            console.log('SystemDetectionService: Processing category:', categoryResult);
            const uiCategory = this.convertCategoryResult(categoryResult);
            console.log('SystemDetectionService: Converted to UI category:', uiCategory);
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
        // Category mappings with expanded organization
        const categoryMappings: Record<string, { id: string; name: string; description: string; icon: string; color: string }> = {
            'language': {
                id: 'language',
                name: 'Programming Languages',
                description: 'Core programming languages and runtimes',
                icon: '💻',
                color: '#3B82F6'
            },
            'ide': {
                id: 'ide',
                name: 'Code Editors & IDEs',
                description: 'Integrated Development Environments and code editors',
                icon: '📝',
                color: '#8B5CF6'
            },
            'database': {
                id: 'database',
                name: 'Databases',
                description: 'Database systems and data storage solutions',
                icon: '🗄️',
                color: '#059669'
            },
            'web-frameworks': {
                id: 'web-frameworks',
                name: 'Web Frameworks',
                description: 'Frontend and backend web frameworks',
                icon: '🏗️',
                color: '#EC4899'
            },
            'containers': {
                id: 'containers',
                name: 'Containers & Orchestration',
                description: 'Container platforms and orchestration tools',
                icon: '📦',
                color: '#0EA5E9'
            },
            'infrastructure': {
                id: 'infrastructure',
                name: 'Infrastructure as Code',
                description: 'Infrastructure automation and configuration tools',
                icon: '🏛️',
                color: '#7C3AED'
            },
            'cloud': {
                id: 'cloud',
                name: 'Cloud Tools',
                description: 'Cloud platform CLIs and SDKs',
                icon: '☁️',
                color: '#6366F1'
            },
            'testing': {
                id: 'testing',
                name: 'Testing & Quality',
                description: 'Testing frameworks and code quality tools',
                icon: '🧪',
                color: '#EF4444'
            },
            'monitoring': {
                id: 'monitoring',
                name: 'Monitoring & Observability',
                description: 'Application and infrastructure monitoring',
                icon: '📊',
                color: '#14B8A6'
            },
            'package-managers': {
                id: 'package-managers',
                name: 'Package Managers',
                description: 'Language-specific package management tools',
                icon: '📦',
                color: '#F97316'
            },
            'developer-tools': {
                id: 'developer-tools',
                name: 'Developer Tools',
                description: 'Version control, API tools, and utilities',
                icon: '🔧',
                color: '#10B981'
            },
            // Legacy mappings for backward compatibility
            'productivity': {
                id: 'developer-tools',
                name: 'Developer Tools',
                description: 'Version control, API tools, and utilities',
                icon: '🔧',
                color: '#10B981'
            },
            'devops': {
                id: 'containers',
                name: 'DevOps Tools',
                description: 'DevOps and deployment tools',
                icon: '🚀',
                color: '#F59E0B'
            },
            'framework': {
                id: 'web-frameworks',
                name: 'Frameworks',
                description: 'Web frameworks and libraries',
                icon: '🏗️',
                color: '#EC4899'
            }
        };

        const uiCategory = categoryMappings[categoryResult.category];
        if (!uiCategory) {
            console.log('SystemDetectionService: No mapping for category:', categoryResult.category);
            return null;
        }

        const tools: Tool[] = categoryResult.tools.map(detectionResult => 
            this.convertDetectionResultToTool(detectionResult, categoryResult.category)
        );

        return {
            id: uiCategory.id as ToolCategory,
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
    private convertDetectionResultToTool(result: DetectionResult, category: string): Tool {
        // Simple conversion for MVP - use metadata if available
        const toolId = result.name; // This is actually the tool ID from manifest (e.g., "nodejs")
        const displayName = result.metadata?.displayName as string || result.name;
        const description = result.metadata?.description as string || `${displayName} - Development tool`;
        
        console.log('SystemDetectionService: Converting tool - ID:', toolId, 'Display Name:', displayName);
        console.log('SystemDetectionService: Full result:', result);
        
        return {
            id: toolId, // Use the manifest ID
            name: displayName, // This is the display name
            description: description,
            isInstalled: result.found,
            isRecommended: false, // Simple MVP - no recommendations yet
            category: categoryMap[category] || 'developer-tools',
            version: result.version,
            tags: [categoryMap[category] || 'developer-tools'],
            size: '50MB', // Default estimate
            installationTime: '1 min', // Default 1 minute as string
            dependencies: [],
            platforms: ['win32', 'darwin', 'linux'],
        };
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