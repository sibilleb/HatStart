import type {
    SimpleManifest
} from '../shared/simple-manifest-types';

/**
 * Simple Manifest API for renderer process
 * Provides typed wrapper around Electron IPC for manifest operations
 */
export class ManifestAPI {
  /**
   * Load a manifest from a file path
   */
  async loadManifest(filePath: string): Promise<{ success: boolean; data?: SimpleManifest; error?: string }> {
    return window.electronAPI.invoke('manifest:load-file', filePath) as Promise<{ 
      success: boolean; 
      data?: SimpleManifest; 
      error?: string 
    }>;
  }

  /**
   * Load the default manifest
   */
  async loadDefaultManifest(): Promise<{ success: boolean; data?: SimpleManifest; error?: string }> {
    return window.electronAPI.invoke('load-manifest') as Promise<{ 
      success: boolean; 
      data?: SimpleManifest; 
      error?: string 
    }>;
  }

  /**
   * Save a manifest to a file
   */
  async saveManifest(manifest: SimpleManifest, filePath: string): Promise<{ success: boolean; error?: string }> {
    return window.electronAPI.invoke('manifest:save', manifest, filePath) as Promise<{ 
      success: boolean; 
      error?: string 
    }>;
  }
}

// Export a default instance
export const manifestAPI = new ManifestAPI();