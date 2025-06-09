/**
 * Simple Manifest Types
 * Replaces 426 lines of over-engineered types with just the essentials
 */

/**
 * Basic tool definition - all we really need
 */
export interface SimpleTool {
  id: string;
  name: string;
  category: ToolCategory;
  description?: string;
  
  // Platform-specific package names (e.g., { darwin: 'node', win32: 'nodejs' })
  packageNames?: Record<string, string>;
  
  // Custom install commands if not using package manager
  customInstall?: Record<string, string>;
  
  // Command to verify installation (defaults to `${id} --version`)
  verification?: string;
  
  // Simple flag for job role recommendations
  recommendedFor?: string[];
}

/**
 * Tool categories - organized for better UI clarity
 */
export type ToolCategory = 
  | 'language'
  | 'ide'
  | 'database'
  | 'web-frameworks'
  | 'containers'
  | 'infrastructure'
  | 'cloud'
  | 'testing'
  | 'monitoring'
  | 'package-managers'
  | 'developer-tools'
  | 'other';

/**
 * The complete manifest - just version and tools
 */
export interface SimpleManifest {
  version: string;
  tools: SimpleTool[];
}

/**
 * Platform detection result
 */
export interface PlatformInfo {
  platform: 'darwin' | 'win32' | 'linux';
  arch: 'x64' | 'arm64';
  packageManager: 'brew' | 'chocolatey' | 'apt' | 'yum' | 'unknown';
}

/**
 * Installation method (how to install a tool)
 */
export type InstallationMethod = 'packageManager' | 'direct' | 'script';

/**
 * Re-export common types for convenience
 */
export type Platform = 'darwin' | 'win32' | 'linux';
export type Architecture = 'x64' | 'arm64';

// That's it! 50 lines instead of 426, and it does everything we need.