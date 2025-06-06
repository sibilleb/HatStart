"use strict";
/**
 * HatStart Manifest Loading System
 * Handles loading manifests from various sources and formats
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultManifestLoader = exports.ManifestLoader = void 0;
exports.validateLoadResult = validateLoadResult;
// Default configuration
const DEFAULT_CONFIG = {
    timeout: 30000, // 30 seconds
    maxSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['json', 'yaml', 'yml'],
    headers: {
        'User-Agent': 'HatStart/1.0.0',
        'Accept': 'application/json, application/yaml, text/yaml',
    },
    followRedirects: true,
    maxRedirects: 5,
    cacheDir: '.hatstart/cache',
    cacheTtl: 3600, // 1 hour
};
/**
 * Manifest Loader Class
 * Handles loading manifests from various sources
 */
class ManifestLoader {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Load a tool manifest from a source
     */
    async loadToolManifest(source) {
        return this.loadManifest(source);
    }
    /**
     * Load a category manifest from a source
     */
    async loadCategoryManifest(source) {
        return this.loadManifest(source);
    }
    /**
     * Load a master manifest from a source
     */
    async loadMasterManifest(source) {
        return this.loadManifest(source);
    }
    /**
     * Load multiple manifests in parallel
     */
    async loadMultipleManifests(sources) {
        const promises = sources.map(source => this.loadManifest(source));
        return Promise.all(promises);
    }
    /**
     * Generic manifest loading method
     */
    async loadManifest(source) {
        try {
            // Determine source type and format
            const sourceInfo = this.analyzeSource(source);
            // Load raw content
            const rawContent = await this.loadRawContent(source, sourceInfo);
            // Parse content based on format
            const parsedData = await this.parseContent(rawContent.content, sourceInfo.format);
            // Create successful result
            return {
                success: true,
                data: parsedData,
                metadata: {
                    source,
                    format: sourceInfo.format,
                    loadedAt: new Date().toISOString(),
                    size: rawContent.size,
                    encoding: rawContent.encoding,
                    fromCache: rawContent.fromCache,
                },
            };
        }
        catch (error) {
            // Create error result
            return {
                success: false,
                error: this.createLoadError(error, source),
                metadata: {
                    source,
                    format: this.detectFormat(source),
                    loadedAt: new Date().toISOString(),
                    size: 0,
                    encoding: 'unknown',
                },
            };
        }
    }
    /**
     * Analyze source to determine type and format
     */
    analyzeSource(source) {
        const isUrl = source.startsWith('http://') || source.startsWith('https://');
        const format = this.detectFormat(source);
        return {
            type: isUrl ? 'url' : 'file',
            format,
        };
    }
    /**
     * Detect manifest format from source path/URL
     */
    detectFormat(source) {
        const extension = source.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'yaml':
            case 'yml':
                return 'yaml';
            case 'json':
            default:
                return 'json';
        }
    }
    /**
     * Load raw content from source
     */
    async loadRawContent(source, sourceInfo) {
        if (sourceInfo.type === 'url') {
            return this.loadFromUrl(source);
        }
        else {
            return this.loadFromFile();
        }
    }
    /**
     * Load content from a local file
     */
    async loadFromFile() {
        // This is a placeholder - actual implementation would use Node.js fs module
        // In a real Electron app, this would be handled in the main process
        throw new Error('File loading not implemented - should be handled in main process');
    }
    /**
     * Load content from a remote URL
     */
    async loadFromUrl(url) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const response = await fetch(url, {
                method: 'GET',
                headers: this.config.headers,
                signal: controller.signal,
                redirect: this.config.followRedirects ? 'follow' : 'manual',
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            // Check content length
            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) > this.config.maxSize) {
                throw new Error(`Content too large: ${contentLength} bytes (max: ${this.config.maxSize})`);
            }
            const content = await response.text();
            // Check actual size
            if (content.length > this.config.maxSize) {
                throw new Error(`Content too large: ${content.length} bytes (max: ${this.config.maxSize})`);
            }
            return {
                content,
                size: content.length,
                encoding: response.headers.get('content-encoding') || 'utf-8',
            };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.config.timeout}ms`);
            }
            throw error;
        }
    }
    /**
     * Parse content based on format
     */
    async parseContent(content, format) {
        try {
            switch (format) {
                case 'json':
                    return JSON.parse(content);
                case 'yaml':
                case 'yml':
                    // For now, we'll only support JSON
                    // In the future, we could add yaml parser
                    throw new Error('YAML parsing not yet implemented - use JSON format');
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid ${format.toUpperCase()} syntax: ${error.message}`);
            }
            throw error;
        }
    }
    /**
     * Create a standardized loading error
     */
    createLoadError(error, source) {
        if (error instanceof Error) {
            // Categorize common error types
            let code = 'UNKNOWN_ERROR';
            if (error.message.includes('timeout')) {
                code = 'TIMEOUT_ERROR';
            }
            else if (error.message.includes('HTTP')) {
                code = 'HTTP_ERROR';
            }
            else if (error.message.includes('Invalid JSON') || error.message.includes('Invalid YAML')) {
                code = 'PARSE_ERROR';
            }
            else if (error.message.includes('Content too large')) {
                code = 'SIZE_ERROR';
            }
            else if (error.message.includes('not found') || error.message.includes('ENOENT')) {
                code = 'NOT_FOUND_ERROR';
            }
            else if (error.message.includes('permission') || error.message.includes('EACCES')) {
                code = 'PERMISSION_ERROR';
            }
            return {
                code,
                message: error.message,
                originalError: error,
                context: { source },
            };
        }
        return {
            code: 'UNKNOWN_ERROR',
            message: 'An unknown error occurred',
            context: { source, error },
        };
    }
    /**
     * Update loader configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.ManifestLoader = ManifestLoader;
// Utility functions for validation
function validateLoadResult(result) {
    const errors = [];
    const warnings = [];
    if (!result.success) {
        errors.push({
            code: result.error?.code || 'LOAD_FAILED',
            message: result.error?.message || 'Loading failed',
            path: 'root',
            severity: 'error',
        });
    }
    if (result.metadata.size === 0) {
        warnings.push({
            code: 'EMPTY_CONTENT',
            message: 'Loaded content is empty',
            path: 'root',
            severity: 'warning',
        });
    }
    if (result.metadata.size > 1024 * 1024) { // 1MB
        warnings.push({
            code: 'LARGE_CONTENT',
            message: `Content is large (${result.metadata.size} bytes)`,
            path: 'root',
            severity: 'warning',
        });
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
            validatedAt: new Date().toISOString(),
            schemaVersion: '1.0.0',
            validatorVersion: '1.0.0',
        },
    };
}
// Export a default instance
exports.defaultManifestLoader = new ManifestLoader();
//# sourceMappingURL=manifest-loader.js.map