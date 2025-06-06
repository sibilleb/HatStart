import type {
    LoadResult,
    LoaderConfig,
    ManifestFormat
} from '../shared/manifest-loader';
import type {
    CategoryManifest,
    MasterManifest,
    ToolManifest
} from '../shared/manifest-types';

/**
 * Manifest API for renderer process
 * Provides typed wrapper around Electron IPC for manifest operations
 */
export class ManifestAPI {
  /**
   * Load a tool manifest from a file path
   */
  async loadToolManifest(filePath: string): Promise<LoadResult<ToolManifest>> {
    return window.electronAPI.invoke('manifest:load-file', filePath, 'tool') as Promise<LoadResult<ToolManifest>>;
  }

  /**
   * Load a category manifest from a file path
   */
  async loadCategoryManifest(filePath: string): Promise<LoadResult<CategoryManifest>> {
    return window.electronAPI.invoke('manifest:load-file', filePath, 'category') as Promise<LoadResult<CategoryManifest>>;
  }

  /**
   * Load a master manifest from a file path
   */
  async loadMasterManifest(filePath: string): Promise<LoadResult<MasterManifest>> {
    return window.electronAPI.invoke('manifest:load-file', filePath, 'master') as Promise<LoadResult<MasterManifest>>;
  }

  /**
   * Load a generic manifest from a file path
   */
  async loadManifest<T>(filePath: string): Promise<LoadResult<T>> {
    return window.electronAPI.invoke('manifest:load-file', filePath) as Promise<LoadResult<T>>;
  }

  /**
   * Load multiple manifests in parallel
   */
  async loadMultipleManifests<T>(filePaths: string[]): Promise<LoadResult<T>[]> {
    return window.electronAPI.invoke('manifest:load-multiple', filePaths) as Promise<LoadResult<T>[]>;
  }

  /**
   * Discover manifest files in a directory
   */
  async discoverManifests(directory: string, recursive = true): Promise<string[]> {
    return window.electronAPI.invoke('manifest:discover', directory, recursive) as Promise<string[]>;
  }

  /**
   * Save a manifest to a file
   */
  async saveManifest<T>(data: T, filePath: string): Promise<{ success: boolean }> {
    return window.electronAPI.invoke('manifest:save', data, filePath) as Promise<{ success: boolean }>;
  }

  /**
   * Get default manifest directories
   */
  async getDefaultManifestDirs(): Promise<string[]> {
    return window.electronAPI.invoke('manifest:get-default-dirs') as Promise<string[]>;
  }

  /**
   * Ensure cache directory exists
   */
  async ensureCacheDir(): Promise<{ success: boolean }> {
    return window.electronAPI.invoke('manifest:ensure-cache-dir') as Promise<{ success: boolean }>;
  }

  /**
   * Clear manifest cache
   */
  async clearCache(): Promise<{ success: boolean }> {
    return window.electronAPI.invoke('manifest:clear-cache') as Promise<{ success: boolean }>;
  }

  /**
   * Validate a loaded manifest result
   */
  validateLoadResult<T>(result: LoadResult<T>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

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
  getManifestFormat(filePath: string): ManifestFormat {
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
  isManifestFile(filePath: string): boolean {
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

// Export a default instance
export const manifestAPI = new ManifestAPI();

// Export types for convenience
export type {
    CategoryManifest,
    LoadResult,
    LoaderConfig,
    ManifestFormat,
    MasterManifest,
    ToolManifest
};
