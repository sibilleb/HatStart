"use strict";
/**
 * Main Process Manifest Loader
 * Handles file system operations for manifest loading in Electron main process
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainManifestLoader = exports.MainProcessManifestLoader = void 0;
const electron_1 = require("electron");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Main process file loader for manifests
 */
class MainProcessManifestLoader {
    constructor() {
        // Use app's user data directory for cache
        this.cacheDir = (0, path_1.join)(electron_1.app.getPath('userData'), '.hatstart', 'cache');
    }
    /**
     * Load a manifest file from the local file system
     */
    async loadManifestFromFile(filePath) {
        try {
            const resolvedPath = (0, path_1.resolve)(filePath);
            const format = this.detectFormat(filePath);
            // Check if file exists and is readable
            await fs_1.promises.access(resolvedPath, fs_1.promises.constants.R_OK);
            // Get file stats
            const stats = await fs_1.promises.stat(resolvedPath);
            if (!stats.isFile()) {
                throw new Error(`Path is not a file: ${resolvedPath}`);
            }
            // Check file size (10MB limit)
            const maxSize = 10 * 1024 * 1024;
            if (stats.size > maxSize) {
                throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize})`);
            }
            // Read file content
            const content = await fs_1.promises.readFile(resolvedPath, 'utf8');
            // Parse content based on format
            const parsedData = this.parseContent(content, format);
            return {
                success: true,
                data: parsedData,
                metadata: {
                    source: resolvedPath,
                    format,
                    loadedAt: new Date().toISOString(),
                    size: stats.size,
                    encoding: 'utf-8',
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: this.createLoadError(error, filePath),
                metadata: {
                    source: filePath,
                    format: this.detectFormat(filePath),
                    loadedAt: new Date().toISOString(),
                    size: 0,
                    encoding: 'unknown',
                },
            };
        }
    }
    /**
     * Load multiple manifest files in parallel
     */
    async loadMultipleManifests(filePaths) {
        const promises = filePaths.map(path => this.loadManifestFromFile(path));
        return Promise.all(promises);
    }
    /**
     * Discover manifest files in a directory
     */
    async discoverManifests(directory, recursive = true) {
        try {
            const resolvedDir = (0, path_1.resolve)(directory);
            const manifestFiles = [];
            await this.scanDirectory(resolvedDir, manifestFiles, recursive);
            return manifestFiles;
        }
        catch (error) {
            console.error('Error discovering manifests:', error);
            return [];
        }
    }
    /**
     * Create a local manifest file
     */
    async saveManifest(data, filePath) {
        try {
            const resolvedPath = (0, path_1.resolve)(filePath);
            const format = this.detectFormat(filePath);
            // Ensure directory exists
            const dirPath = (0, path_1.join)(resolvedPath, '..');
            await fs_1.promises.mkdir(dirPath, { recursive: true });
            let content;
            switch (format) {
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    break;
                default:
                    throw new Error(`Unsupported format for saving: ${format}`);
            }
            await fs_1.promises.writeFile(resolvedPath, content, 'utf8');
        }
        catch (error) {
            throw new Error(`Failed to save manifest: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Ensure cache directory exists
     */
    async ensureCacheDir() {
        try {
            await fs_1.promises.mkdir(this.cacheDir, { recursive: true });
        }
        catch (error) {
            console.warn('Failed to create cache directory:', error);
        }
    }
    /**
     * Clear cache directory
     */
    async clearCache() {
        try {
            const files = await fs_1.promises.readdir(this.cacheDir);
            const deletePromises = files.map(file => fs_1.promises.unlink((0, path_1.join)(this.cacheDir, file)).catch(() => { }) // Ignore errors
            );
            await Promise.all(deletePromises);
        }
        catch (error) {
            console.warn('Failed to clear cache:', error);
        }
    }
    /**
     * Get default manifest directories
     */
    getDefaultManifestDirs() {
        const userDataPath = electron_1.app.getPath('userData');
        const appPath = electron_1.app.getAppPath();
        return [
            (0, path_1.join)(userDataPath, 'manifests'),
            (0, path_1.join)(appPath, 'manifests'),
            (0, path_1.join)(appPath, 'resources', 'manifests'),
        ];
    }
    /**
     * Detect manifest format from file extension
     */
    detectFormat(filePath) {
        const ext = (0, path_1.extname)(filePath).toLowerCase();
        switch (ext) {
            case '.yaml':
            case '.yml':
                return 'yaml';
            case '.json':
            default:
                return 'json';
        }
    }
    /**
     * Parse content based on format
     */
    parseContent(content, format) {
        try {
            switch (format) {
                case 'json':
                    return JSON.parse(content);
                case 'yaml':
                case 'yml':
                    // For now, we'll only support JSON
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
     * Recursively scan directory for manifest files
     */
    async scanDirectory(directory, manifestFiles, recursive) {
        try {
            const entries = await fs_1.promises.readdir(directory, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = (0, path_1.join)(directory, entry.name);
                if (entry.isFile() && this.isManifestFile(entry.name)) {
                    manifestFiles.push(fullPath);
                }
                else if (entry.isDirectory() && recursive && !entry.name.startsWith('.')) {
                    await this.scanDirectory(fullPath, manifestFiles, recursive);
                }
            }
        }
        catch (error) {
            // Ignore permission errors and continue
            if (!(error instanceof Error) || !error.message.includes('EACCES')) {
                console.warn(`Error scanning directory ${directory}:`, error);
            }
        }
    }
    /**
     * Check if a file is a manifest file based on name and extension
     */
    isManifestFile(fileName) {
        const ext = (0, path_1.extname)(fileName).toLowerCase();
        const baseName = fileName.toLowerCase();
        // Must have supported extension
        if (!['.json', '.yaml', '.yml'].includes(ext)) {
            return false;
        }
        // Must contain 'manifest' in the name or be in common manifest file names
        const manifestKeywords = ['manifest', 'config', 'tools', 'category'];
        return manifestKeywords.some(keyword => baseName.includes(keyword));
    }
    /**
     * Create a standardized loading error
     */
    createLoadError(error, source) {
        if (error instanceof Error) {
            let code = 'UNKNOWN_ERROR';
            if (error.message.includes('ENOENT') || error.message.includes('not found')) {
                code = 'NOT_FOUND_ERROR';
            }
            else if (error.message.includes('EACCES') || error.message.includes('permission')) {
                code = 'PERMISSION_ERROR';
            }
            else if (error.message.includes('EISDIR')) {
                code = 'IS_DIRECTORY_ERROR';
            }
            else if (error.message.includes('Invalid JSON') || error.message.includes('Invalid YAML')) {
                code = 'PARSE_ERROR';
            }
            else if (error.message.includes('too large')) {
                code = 'SIZE_ERROR';
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
}
exports.MainProcessManifestLoader = MainProcessManifestLoader;
// Export default instance
exports.mainManifestLoader = new MainProcessManifestLoader();
//# sourceMappingURL=manifest-loader-main.js.map