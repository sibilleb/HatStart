/**
 * Type Guards for Version Management System
 * Provides runtime type validation for version detection results
 */

import type { DetectionResult } from '../../shared/detection-types';
import type {
  IVersionInfo,
  IVersionOperationResult,
  ProjectVersionConfig,
  VersionedTool,
  VersionManagerConfig,
  VersionManagerType
} from '../version-manager-types';

/**
 * Type guard for IVersionInfo objects
 * 
 * Validates that an object conforms to the IVersionInfo interface
 * with comprehensive runtime type checking.
 */
export function isVersionInfo(value: unknown): value is IVersionInfo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Required fields validation
  if (typeof obj.tool !== 'string') {
    return false;
  }

  if (typeof obj.version !== 'string') {
    return false;
  }

  if (typeof obj.major !== 'number' || !Number.isInteger(obj.major) || obj.major < 0) {
    return false;
  }

  if (typeof obj.minor !== 'number' || !Number.isInteger(obj.minor) || obj.minor < 0) {
    return false;
  }

  if (typeof obj.patch !== 'number' || !Number.isInteger(obj.patch) || obj.patch < 0) {
    return false;
  }

  // Optional fields validation
  if (obj.prerelease !== undefined && typeof obj.prerelease !== 'string') {
    return false;
  }

  if (obj.build !== undefined && typeof obj.build !== 'string') {
    return false;
  }

  if (obj.isActive !== undefined && typeof obj.isActive !== 'boolean') {
    return false;
  }

  if (obj.isInstalled !== undefined && typeof obj.isInstalled !== 'boolean') {
    return false;
  }

  if (obj.installPath !== undefined && typeof obj.installPath !== 'string') {
    return false;
  }

  // Validate metadata if present
  if (obj.metadata !== undefined) {
    if (typeof obj.metadata !== 'object' || obj.metadata === null) {
      return false;
    }

    const metadata = obj.metadata as Record<string, unknown>;
    
    if (metadata.releaseDate !== undefined && !(metadata.releaseDate instanceof Date)) {
      return false;
    }

    if (metadata.eolDate !== undefined && !(metadata.eolDate instanceof Date)) {
      return false;
    }

    if (metadata.isLts !== undefined && typeof metadata.isLts !== 'boolean') {
      return false;
    }

    if (metadata.ltsCodename !== undefined && typeof metadata.ltsCodename !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for arrays of IVersionInfo objects
 */
export function isVersionInfoArray(value: unknown): value is IVersionInfo[] {
  return Array.isArray(value) && value.every(isVersionInfo);
}

/**
 * Type guard for IVersionOperationResult objects
 * 
 * Validates that an object conforms to the IVersionOperationResult interface
 * with comprehensive runtime type checking.
 */
export function isVersionOperationResult(value: unknown): value is IVersionOperationResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Required fields validation
  if (typeof obj.success !== 'boolean') {
    return false;
  }

  const validOperations = ['install', 'uninstall', 'switch', 'list', 'detect', 'configure'];
  if (typeof obj.operation !== 'string' || !validOperations.includes(obj.operation)) {
    return false;
  }

  if (typeof obj.tool !== 'string') {
    return false;
  }

  if (typeof obj.message !== 'string') {
    return false;
  }

  if (typeof obj.duration !== 'number' || obj.duration < 0) {
    return false;
  }

  if (!(obj.timestamp instanceof Date)) {
    return false;
  }

  // Optional fields validation
  if (obj.error !== undefined && typeof obj.error !== 'string') {
    return false;
  }

  if (obj.data !== undefined) {
    if (typeof obj.data !== 'object' || obj.data === null || Array.isArray(obj.data)) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for DetectionResult objects
 */
export function isDetectionResult(value: unknown): value is DetectionResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Required fields
  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    return false;
  }

  if (typeof obj.found !== 'boolean') {
    return false;
  }

  if (typeof obj.detectionMethod !== 'string') {
    return false;
  }

  // Optional fields validation
  if (obj.version !== undefined && typeof obj.version !== 'string') {
    return false;
  }

  if (obj.path !== undefined && typeof obj.path !== 'string') {
    return false;
  }

  if (obj.error !== undefined && typeof obj.error !== 'string') {
    return false;
  }

  if (obj.metadata !== undefined && (typeof obj.metadata !== 'object' || obj.metadata === null)) {
    return false;
  }

  return true;
}

/**
 * Type guard for version strings (semantic versioning)
 */
export function isValidVersionString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  // Basic semantic versioning pattern: major.minor.patch with optional pre-release
  const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9-.]+))?(?:\+([a-zA-Z0-9-.]+))?$/;
  
  // Also allow simpler patterns like "18" or "3.11"
  const simplePattern = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/;
  
  return semverPattern.test(value) || simplePattern.test(value);
}

/**
 * Type guard for VersionManagerConfig objects
 * 
 * Validates that an object conforms to the VersionManagerConfig interface
 * with comprehensive runtime type checking and validation.
 */
export function isVersionManagerConfig(value: unknown): value is VersionManagerConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Required fields validation
  if (typeof obj.type !== 'string' || !isValidVersionManagerType(obj.type)) {
    return false;
  }

  if (typeof obj.shellIntegration !== 'boolean') {
    return false;
  }

  if (typeof obj.autoSwitch !== 'boolean') {
    return false;
  }

  // Optional fields validation with proper type checking
  if (obj.installationPath !== undefined) {
    if (typeof obj.installationPath !== 'string' || obj.installationPath.trim().length === 0) {
      return false;
    }
  }

  if (obj.configPath !== undefined) {
    if (typeof obj.configPath !== 'string' || obj.configPath.trim().length === 0) {
      return false;
    }
  }

  // Validate globalVersions as Partial<Record<VersionedTool, string>>
  if (obj.globalVersions !== undefined) {
    if (typeof obj.globalVersions !== 'object' || obj.globalVersions === null) {
      return false;
    }
    
    const globalVersions = obj.globalVersions as Record<string, unknown>;
    for (const [tool, version] of Object.entries(globalVersions)) {
      if (!isValidVersionedTool(tool) || typeof version !== 'string') {
        return false;
      }
    }
  }

  // Validate environment as Record<string, string>
  if (obj.environment !== undefined) {
    if (typeof obj.environment !== 'object' || obj.environment === null) {
      return false;
    }
    
    const environment = obj.environment as Record<string, unknown>;
    for (const [key, value] of Object.entries(environment)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        return false;
      }
    }
  }

  // Validate options as Record<string, unknown>
  if (obj.options !== undefined) {
    if (typeof obj.options !== 'object' || obj.options === null) {
      return false;
    }
  }

  return true;
}

/**
 * Helper function to validate VersionManagerType
 */
function isValidVersionManagerType(value: string): value is VersionManagerType {
  const validTypes: VersionManagerType[] = [
    'mise', 'asdf', 'proto', 'nvm', 'pyenv', 'rbenv', 'jenv', 
    'rustup', 'gvm', 'volta', 'fnm', 'jabba', 'sdkman'
  ];
  return validTypes.includes(value as VersionManagerType);
}

/**
 * Helper function to validate VersionedTool
 */
function isValidVersionedTool(value: string): value is VersionedTool {
  const validTools: VersionedTool[] = [
    'node', 'python', 'ruby', 'java', 'go', 'rust', 'php', 'perl', 'lua',
    'elixir', 'erlang', 'julia', 'crystal', 'swift', 'scala', 'kotlin',
    'dart', 'flutter', 'deno', 'bun', 'terraform', 'cmake', 'zig', 'lean', 'r', 'neovim'
  ];
  return validTools.includes(value as VersionedTool);
}

/**
 * Type guard for ProjectVersionConfig objects
 * 
 * Validates that an object conforms to the ProjectVersionConfig interface
 * with comprehensive runtime type checking and validation.
 */
export function isProjectVersionConfig(value: unknown): value is ProjectVersionConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Required fields validation
  if (typeof obj.projectRoot !== 'string' || obj.projectRoot.trim().length === 0) {
    return false;
  }

  // Validate versions as Record<VersionedTool, VersionSpecifier>
  if (typeof obj.versions !== 'object' || obj.versions === null) {
    return false;
  }

  const versions = obj.versions as Record<string, unknown>;
  for (const [tool, version] of Object.entries(versions)) {
    if (!isValidVersionedTool(tool)) {
      return false;
    }
    
    // Validate VersionSpecifier (string, 'latest', 'lts', 'system', or version object)
    if (typeof version === 'string') {
      if (!['latest', 'lts', 'system'].includes(version) && !isValidVersionString(version)) {
        return false;
      }
    } else if (typeof version === 'object' && version !== null) {
      const versionObj = version as Record<string, unknown>;
      if (typeof versionObj.major !== 'number' || versionObj.major < 0) {
        return false;
      }
      if (versionObj.minor !== undefined && (typeof versionObj.minor !== 'number' || versionObj.minor < 0)) {
        return false;
      }
      if (versionObj.patch !== undefined && (typeof versionObj.patch !== 'number' || versionObj.patch < 0)) {
        return false;
      }
      if (versionObj.prerelease !== undefined && typeof versionObj.prerelease !== 'string') {
        return false;
      }
    } else {
      return false;
    }
  }

  // Optional fields validation
  if (obj.environment !== undefined) {
    if (typeof obj.environment !== 'object' || obj.environment === null) {
      return false;
    }
    
    const environment = obj.environment as Record<string, unknown>;
    for (const [key, value] of Object.entries(environment)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        return false;
      }
    }
  }

  if (obj.configFile !== undefined) {
    if (typeof obj.configFile !== 'string' || obj.configFile.trim().length === 0) {
      return false;
    }
  }

  if (obj.inherited !== undefined && typeof obj.inherited !== 'boolean') {
    return false;
  }

  // Validate metadata if present
  if (obj.metadata !== undefined) {
    if (typeof obj.metadata !== 'object' || obj.metadata === null) {
      return false;
    }
    
    const metadata = obj.metadata as Record<string, unknown>;
    if (metadata.createdAt !== undefined && !(metadata.createdAt instanceof Date)) {
      return false;
    }
    if (metadata.lastModified !== undefined && !(metadata.lastModified instanceof Date)) {
      return false;
    }
    if (metadata.createdBy !== undefined && !isValidVersionManagerType(metadata.createdBy as string)) {
      return false;
    }
    if (metadata.formatVersion !== undefined && typeof metadata.formatVersion !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Validates and safely parses version detection output
 */
export function safeParseVersionOutput(
  output: string,
  parser: (output: string) => IVersionInfo | null
): IVersionInfo | null {
  try {
    if (typeof output !== 'string') {
      return null;
    }

    const result = parser(output);
    
    if (result === null) {
      return null;
    }

    // Validate the parsed result
    if (!isVersionInfo(result)) {
      console.warn('Parser returned invalid IVersionInfo object:', result);
      return null;
    }

    return result;
  } catch (error) {
    console.warn('Error parsing version output:', error);
    return null;
  }
}

/**
 * Validates and safely parses version list output
 */
export function safeParseVersionListOutput(
  output: string,
  parser: (output: string) => IVersionInfo[]
): IVersionInfo[] {
  try {
    if (typeof output !== 'string') {
      return [];
    }

    const result = parser(output);
    
    if (!Array.isArray(result)) {
      console.warn('Parser returned non-array result:', result);
      return [];
    }

    // Filter out invalid entries
    const validResults = result.filter(isVersionInfo);
    
    if (validResults.length !== result.length) {
      console.warn(`Filtered out ${result.length - validResults.length} invalid IVersionInfo objects`);
    }

    return validResults;
  } catch (error) {
    console.warn('Error parsing version list output:', error);
    return [];
  }
}

/**
 * Creates a safe IVersionInfo object with validated fields
 */
export function createSafeVersionInfo(
  tool: VersionedTool,
  version: string,
  isInstalled: boolean,
  isActive: boolean,
  options: Partial<IVersionInfo> = {}
): IVersionInfo {
  // Validate required fields
  if (!isValidVersionString(version)) {
    throw new Error(`Invalid version string: ${version}`);
  }

  // Parse semantic version components
  const versionMatch = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+(.+))?$/);
  const major = versionMatch ? parseInt(versionMatch[1], 10) : 0;
  const minor = versionMatch ? parseInt(versionMatch[2], 10) : 0;
  const patch = versionMatch ? parseInt(versionMatch[3], 10) : 0;
  const prerelease = versionMatch?.[4];
  const build = versionMatch?.[5];

  const versionInfo: IVersionInfo = {
    tool,
    version,
    major,
    minor,
    patch,
    prerelease,
    build,
    isActive,
    isInstalled,
    installPath: options.installPath,
    metadata: options.metadata,
  };

  // Validate the complete object
  if (!isVersionInfo(versionInfo)) {
    throw new Error('Failed to create valid IVersionInfo object');
  }

  return versionInfo;
} 