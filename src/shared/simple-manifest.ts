/**
 * Simple Manifest System
 * Everything you need in one place - no complexity, just functionality
 */

export * from './simple-manifest-types';
export * from './simple-manifest-loader';
export * from './simple-manifest-validator';

// Re-export default tools for convenience
import defaultTools from './default-tools.json';
import type { SimpleManifest } from './simple-manifest-types';

export const DEFAULT_MANIFEST: SimpleManifest = defaultTools as SimpleManifest;