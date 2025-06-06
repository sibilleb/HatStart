// Test utilities for HatStart Detection Testing Framework
import * as path from 'path';

// Platform detection for test customization
export const TEST_PLATFORM = process.platform;
export const IS_WINDOWS = process.platform === 'win32';
export const IS_MACOS = process.platform === 'darwin';
export const IS_LINUX = process.platform === 'linux';

// Test fixture paths
export const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
export const MOCK_DATA_DIR = path.join(FIXTURES_DIR, 'mock-data');
export const SAMPLE_CONFIGS_DIR = path.join(FIXTURES_DIR, 'sample-configs');

// Utility functions for testing
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const createMockCommand = (output: string, exitCode: number = 0) => ({
  stdout: output,
  stderr: '',
  exitCode
});

// Validation helpers
export function isValidDetectionResult(result: unknown): boolean {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    'category' in result &&
    'detectedItems' in result
  );
}

export function isValidVersion(version: string): boolean {
  const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-.]+)?$/;
  return versionRegex.test(version);
}

export function matchesPlatform(result: { platform?: string }): boolean {
  return result.platform === process.platform;
}

// Mock command results for testing
export const MOCK_COMMANDS = {
  NODE_VERSION: 'v18.17.0',
  PYTHON_VERSION: 'Python 3.9.7',
  JAVA_VERSION: 'openjdk version "11.0.19" 2023-04-18',
  GIT_VERSION: 'git version 2.39.0',
  DOCKER_VERSION: 'Docker version 24.0.2, build cb74dfc',
  VS_CODE_VERSION: '1.80.1'
};

// Expected detection categories
export const DETECTION_CATEGORIES = [
  'operating-system',
  'programming-languages',
  'frameworks',
  'development-tools',
  'editors',
  'version-control',
  'containerization',
  'databases'
] as const;

export type DetectionCategory = typeof DETECTION_CATEGORIES[number]; 