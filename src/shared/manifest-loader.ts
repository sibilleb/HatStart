/**
 * HatStart Manifest Loading System
 * Handles loading manifests from various sources and formats
 */

import type {
  CategoryManifest,
  MasterManifest,
  ToolManifest,
  ValidationError,
  ValidationResult
} from './manifest-types';

// Loading configuration interface
export interface LoaderConfig {
  /** Timeout in milliseconds for remote requests */
  timeout?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Supported file formats */
  supportedFormats?: ManifestFormat[];
  /** Custom headers for remote requests */
  headers?: Record<string, string>;
  /** Whether to follow redirects */
  followRedirects?: boolean;
  /** Maximum number of redirects to follow */
  maxRedirects?: number;
  /** Cache directory for remote manifests */
  cacheDir?: string;
  /** Cache TTL in seconds */
  cacheTtl?: number;
}

// Supported manifest formats
export type ManifestFormat = 'json' | 'yaml' | 'yml';

// Loading result interface
export interface LoadResult<T> {
  /** Whether loading was successful */
  success: boolean;
  /** Loaded and parsed data */
  data?: T;
  /** Error information if loading failed */
  error?: LoadError;
  /** Metadata about the loading operation */
  metadata: {
    source: string;
    format: ManifestFormat;
    loadedAt: string;
    size: number;
    encoding: string;
    fromCache?: boolean;
  };
}

// Loading error interface
export interface LoadError {
  /** Error code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Original error if available */
  originalError?: Error;
  /** Error context */
  context?: Record<string, unknown>;
}

// Default configuration
const DEFAULT_CONFIG: Required<LoaderConfig> = {
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
export class ManifestLoader {
  private config: Required<LoaderConfig>;

  constructor(config: LoaderConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Load a tool manifest from a source
   */
  async loadToolManifest(source: string): Promise<LoadResult<ToolManifest>> {
    return this.loadManifest<ToolManifest>(source);
  }

  /**
   * Load a category manifest from a source
   */
  async loadCategoryManifest(source: string): Promise<LoadResult<CategoryManifest>> {
    return this.loadManifest<CategoryManifest>(source);
  }

  /**
   * Load a master manifest from a source
   */
  async loadMasterManifest(source: string): Promise<LoadResult<MasterManifest>> {
    return this.loadManifest<MasterManifest>(source);
  }

  /**
   * Load multiple manifests in parallel
   */
  async loadMultipleManifests<T>(sources: string[]): Promise<LoadResult<T>[]> {
    const promises = sources.map(source => this.loadManifest<T>(source));
    return Promise.all(promises);
  }

  /**
   * Generic manifest loading method
   */
  private async loadManifest<T>(source: string): Promise<LoadResult<T>> {
    try {
      // Determine source type and format
      const sourceInfo = this.analyzeSource(source);
      
      // Load raw content
      const rawContent = await this.loadRawContent(source, sourceInfo);
      
      // Parse content based on format
      const parsedData = await this.parseContent<T>(rawContent.content, sourceInfo.format);
      
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
    } catch (error) {
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
  private analyzeSource(source: string): { type: 'file' | 'url'; format: ManifestFormat } {
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
  private detectFormat(source: string): ManifestFormat {
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
  private async loadRawContent(source: string, sourceInfo: { type: 'file' | 'url'; format: ManifestFormat }): Promise<{
    content: string;
    size: number;
    encoding: string;
    fromCache?: boolean;
  }> {
    if (sourceInfo.type === 'url') {
      return this.loadFromUrl(source);
    } else {
      return this.loadFromFile();
    }
  }

  /**
   * Load content from a local file
   */
  private async loadFromFile(): Promise<{
    content: string;
    size: number;
    encoding: string;
  }> {
    // This is a placeholder - actual implementation would use Node.js fs module
    // In a real Electron app, this would be handled in the main process
    throw new Error('File loading not implemented - should be handled in main process');
  }

  /**
   * Load content from a remote URL
   */
  private async loadFromUrl(url: string): Promise<{
    content: string;
    size: number;
    encoding: string;
    fromCache?: boolean;
  }> {
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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Parse content based on format
   */
  private async parseContent<T>(content: string, format: ManifestFormat): Promise<T> {
    try {
      switch (format) {
        case 'json':
          return JSON.parse(content) as T;
        
        case 'yaml':
        case 'yml':
          // For now, we'll only support JSON
          // In the future, we could add yaml parser
          throw new Error('YAML parsing not yet implemented - use JSON format');
        
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid ${format.toUpperCase()} syntax: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create a standardized loading error
   */
  private createLoadError(error: unknown, source: string): LoadError {
    if (error instanceof Error) {
      // Categorize common error types
      let code = 'UNKNOWN_ERROR';
      
      if (error.message.includes('timeout')) {
        code = 'TIMEOUT_ERROR';
      } else if (error.message.includes('HTTP')) {
        code = 'HTTP_ERROR';
      } else if (error.message.includes('Invalid JSON') || error.message.includes('Invalid YAML')) {
        code = 'PARSE_ERROR';
      } else if (error.message.includes('Content too large')) {
        code = 'SIZE_ERROR';
      } else if (error.message.includes('not found') || error.message.includes('ENOENT')) {
        code = 'NOT_FOUND_ERROR';
      } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
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
  updateConfig(newConfig: Partial<LoaderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): LoaderConfig {
    return { ...this.config };
  }
}

// Utility functions for validation
export function validateLoadResult<T>(result: LoadResult<T>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

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
export const defaultManifestLoader = new ManifestLoader(); 