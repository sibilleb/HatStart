"use strict";
/**
 * Renderer-side Manifest API
 * Provides a clean interface for manifest loading operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.manifestAPI = exports.ManifestAPI = void 0;
/**
 * Environment detection for renderer process
 */
function isRenderer() {
    try {
        // Check if we're in a browser-like environment
        return typeof globalThis !== 'undefined' &&
            'window' in globalThis &&
            globalThis.window !== null &&
            'electronAPI' in globalThis.window &&
            globalThis.window.electronAPI !== null;
    }
    catch {
        return false;
    }
}
/**
 * Get electronAPI safely
 */
function getElectronAPI() {
    if (!isRenderer()) {
        throw new Error('ManifestAPI can only be used in renderer process with electronAPI');
    }
    return globalThis.window.electronAPI;
}
/**
 * Manifest API for renderer process
 */
class ManifestAPI {
    /**
     * Load a tool manifest from a file path
     */
    async loadToolManifest(filePath) {
        const electronAPI = getElectronAPI();
        return electronAPI.invoke('manifest:load-file', filePath, 'tool');
    }
    /**
     * Load a category manifest from a file path
     */
    async loadCategoryManifest(filePath) {
        const electronAPI = getElectronAPI();
        return electronAPI.invoke('manifest:load-file', filePath, 'category');
    }
    /**
     * Load a master manifest from a file path
     */
    async loadMasterManifest(filePath) {
        const electronAPI = getElectronAPI();
        return electronAPI.invoke('manifest:load-file', filePath, 'master');
    }
    /**
     * Load a generic manifest from a file path
     */
    async loadManifest(filePath) {
        const electronAPI = getElectronAPI();
        return electronAPI.invoke('manifest:load-file', filePath);
    }
    /**
     * Load multiple manifests in parallel
     */
    async loadMultipleManifests(filePaths) {
        const electronAPI = getElectronAPI();
        return electronAPI.invoke('manifest:load-multiple', filePaths);
    }
    /**
     * Discover manifest files in a directory
     */
    async discoverManifests(directory, recursive = true) {
        const electronAPI = getElectronAPI();
        return electronAPI.invoke('manifest:discover', directory, recursive);
    }
    /**
     * Save a manifest to a file
     */
    async saveManifest(data, filePath) {
        const electronAPI = getElectronAPI();
        return electronAPI.invoke('manifest:save', data, filePath);
    }
    /**
     * Get default manifest directories
     */
    async getDefaultManifestDirs() {
        const electronAPI = getElectronAPI();
        return electronAPI.invoke('manifest:get-default-dirs');
    }
    /**
     * Ensure cache directory exists
     */
    async ensureCacheDir() {
        const electronAPI = getElectronAPI();
        return electronAPI.invoke('manifest:ensure-cache-dir');
    }
    /**
     * Clear manifest cache
     */
    async clearCache() {
        const electronAPI = getElectronAPI();
        return electronAPI.invoke('manifest:clear-cache');
    }
    /**
     * Validate a loaded manifest result
     */
    validateLoadResult(result) {
        const errors = [];
        const warnings = [];
        if (!result.success) {
            errors.push(result.error?.message || 'Loading failed');
        }
        if (result.metadata.size === 0) {
            warnings.push('Loaded content is empty');
        }
        if (result.metadata.size > 1024 * 1024) { // 1MB
            warnings.push(`Content is large (${result.metadata.size} bytes)`);
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Get manifest format from file path
     */
    getManifestFormat(filePath) {
        const extension = filePath.split('.').pop()?.toLowerCase();
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
     * Check if a file path looks like a manifest file
     */
    isManifestFile(filePath) {
        const fileName = filePath.split('/').pop()?.toLowerCase() || '';
        const extension = fileName.split('.').pop();
        // Must have supported extension
        if (!['json', 'yaml', 'yml'].includes(extension || '')) {
            return false;
        }
        // Must contain manifest-related keywords
        const manifestKeywords = ['manifest', 'config', 'tools', 'category'];
        return manifestKeywords.some(keyword => fileName.includes(keyword));
    }
}
exports.ManifestAPI = ManifestAPI;
// Export a default instance
exports.manifestAPI = new ManifestAPI();
//# sourceMappingURL=manifest-api.js.map