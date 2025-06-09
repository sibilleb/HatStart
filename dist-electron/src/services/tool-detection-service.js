"use strict";
/**
 * Tool Detection Service
 * Detects installed tools and their versions with caching for performance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolDetectionService = exports.ToolDetectionService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Service for detecting installed tools and their versions
 */
class ToolDetectionService {
    constructor() {
        this.cache = {};
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }
    /**
     * Detect if a tool is installed and get its version
     */
    async detectTool(tool) {
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
    async detectMultipleTools(tools) {
        const results = await Promise.all(tools.map(tool => this.detectTool(tool)));
        return results;
    }
    /**
     * Clear the cache for a specific tool or all tools
     */
    clearCache(toolId) {
        if (toolId) {
            delete this.cache[toolId];
        }
        else {
            this.cache = {};
        }
    }
    /**
     * Get cached result if available and not expired
     */
    getFromCache(toolId) {
        const cached = this.cache[toolId];
        if (cached && cached.expires > Date.now()) {
            return cached.result;
        }
        return null;
    }
    /**
     * Cache a detection result
     */
    cacheResult(toolId, result) {
        this.cache[toolId] = {
            result,
            expires: Date.now() + this.CACHE_DURATION
        };
    }
    /**
     * Perform the actual detection for a tool
     */
    async performDetection(tool) {
        const result = {
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
            }
            else {
                // Try common version command patterns
                result.installed = await this.tryCommonCommands(tool.id);
                if (result.installed) {
                    result.version = await this.getToolVersion(tool.id);
                }
            }
        }
        catch {
            // Tool not found or command failed
            result.installed = false;
        }
        return result;
    }
    /**
     * Try common command patterns to detect if a tool is installed
     */
    async tryCommonCommands(toolId) {
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
            }
            catch {
                // Continue to next command
            }
        }
        return false;
    }
    /**
     * Get the version of an installed tool
     */
    async getToolVersion(toolId) {
        const versionCommands = [
            `${toolId} --version`,
            `${toolId} -v`,
            `${toolId} version`
        ];
        for (const command of versionCommands) {
            try {
                const { stdout } = await execAsync(command);
                const version = this.extractVersion(stdout);
                if (version)
                    return version;
            }
            catch {
                // Continue to next command
            }
        }
        return undefined;
    }
    /**
     * Extract version number from command output
     */
    extractVersion(output) {
        // Clean the output
        const cleanOutput = output.trim();
        // Common version patterns
        const patterns = [
            /v?(\d+\.\d+\.\d+(?:\.\d+)?)/, // v1.2.3 or 1.2.3.4
            /version\s+(\d+\.\d+\.\d+)/i, // version 1.2.3
            /(\d+\.\d+\.\d+)/, // 1.2.3
            /v?(\d+\.\d+)/, // v1.2 or 1.2
        ];
        for (const pattern of patterns) {
            const match = cleanOutput.match(pattern);
            if (match) {
                return match[1];
            }
        }
        // Special cases for specific tools
        // Node.js: "v24.1.0" -> "24.1.0"
        if (cleanOutput.startsWith('v') && /^\d+\.\d+/.test(cleanOutput.substring(1))) {
            return cleanOutput.substring(1);
        }
        // Python: "Python 3.13.4" -> "3.13.4"
        const pythonMatch = cleanOutput.match(/Python\s+(\d+\.\d+\.\d+)/);
        if (pythonMatch) {
            return pythonMatch[1];
        }
        // Git: "git version 2.49.0" -> "2.49.0"
        const gitMatch = cleanOutput.match(/git\s+version\s+(\d+\.\d+\.\d+)/);
        if (gitMatch) {
            return gitMatch[1];
        }
        // Docker: "Docker version 28.2.2, build e6534b4eb7" -> "28.2.2"
        const dockerMatch = cleanOutput.match(/Docker\s+version\s+(\d+\.\d+\.\d+)/);
        if (dockerMatch) {
            return dockerMatch[1];
        }
        // If no pattern matches, return the first line (cleaned)
        return cleanOutput.split('\n')[0];
    }
}
exports.ToolDetectionService = ToolDetectionService;
// Export singleton instance
exports.toolDetectionService = new ToolDetectionService();
//# sourceMappingURL=tool-detection-service.js.map