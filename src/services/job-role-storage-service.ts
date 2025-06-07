/**
 * Job Role Storage Service
 * Manages saving and loading job role configurations to and from local storage
 */

import type { JobRoleConfig } from '../types/job-role-types';

/**
 * Storage options for job role configurations
 */
interface StorageOptions {
  /** Specify a custom file name */
  fileName?: string;
  /** Include built-in role configurations */
  includeBuiltIn?: boolean;
}

/**
 * Default storage options
 */
const DEFAULT_STORAGE_OPTIONS: StorageOptions = {
  fileName: 'job-role-configs.json',
  includeBuiltIn: false
};

/**
 * Service for persisting job role configurations
 */
export class JobRoleStorageService {
  /**
   * Save job role configurations to a local file
   */
  async saveConfigsToFile(
    configs: JobRoleConfig[], 
    options: StorageOptions = DEFAULT_STORAGE_OPTIONS
  ): Promise<boolean> {
    try {
      const { fileName = DEFAULT_STORAGE_OPTIONS.fileName } = options;
      const configsJson = JSON.stringify(configs, null, 2);
      
      // Use Electron IPC to save to file system
      const saved = await window.electronAPI.saveToFile({
        fileName,
        data: configsJson,
        directory: 'configs'
      });
      
      return saved;
    } catch (error) {
      console.error('Failed to save job role configurations:', error);
      return false;
    }
  }

  /**
   * Load job role configurations from a local file
   */
  async loadConfigsFromFile(
    fileName: string = DEFAULT_STORAGE_OPTIONS.fileName!
  ): Promise<JobRoleConfig[] | null> {
    try {
      // Use Electron IPC to load from file system
      const configsJson = await window.electronAPI.loadFromFile({
        fileName,
        directory: 'configs'
      });
      
      if (!configsJson) {
        console.warn(`Job role configuration file '${fileName}' not found`);
        return null;
      }
      
      return JSON.parse(configsJson) as JobRoleConfig[];
    } catch (error) {
      console.error('Failed to load job role configurations:', error);
      return null;
    }
  }

  /**
   * Check if a job role configuration file exists
   */
  async configFileExists(
    fileName: string = DEFAULT_STORAGE_OPTIONS.fileName!
  ): Promise<boolean> {
    try {
      return await window.electronAPI.fileExists({
        fileName,
        directory: 'configs'
      });
    } catch (error) {
      console.error('Failed to check if job role configuration file exists:', error);
      return false;
    }
  }

  /**
   * Delete a job role configuration file
   */
  async deleteConfigFile(
    fileName: string = DEFAULT_STORAGE_OPTIONS.fileName!
  ): Promise<boolean> {
    try {
      return await window.electronAPI.deleteFile({
        fileName,
        directory: 'configs'
      });
    } catch (error) {
      console.error('Failed to delete job role configuration file:', error);
      return false;
    }
  }

  /**
   * List all available job role configuration files
   */
  async listConfigFiles(): Promise<string[]> {
    try {
      return await window.electronAPI.listFiles({
        directory: 'configs',
        extension: '.json'
      });
    } catch (error) {
      console.error('Failed to list job role configuration files:', error);
      return [];
    }
  }
}

// Singleton instance for global usage
export const jobRoleStorageService = new JobRoleStorageService(); 