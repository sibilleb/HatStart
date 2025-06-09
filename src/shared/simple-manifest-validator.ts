/**
 * Simple Manifest Validator
 * Replaces 708 lines with basic validation that actually matters
 */

import type { SimpleManifest, ToolCategory } from './simple-manifest-types';

const VALID_CATEGORIES: ToolCategory[] = [
  'language', 'ide', 'database', 'web-frameworks', 'containers', 
  'infrastructure', 'cloud', 'testing', 'monitoring', 
  'package-managers', 'developer-tools', 'other'
];

/**
 * Validate a manifest and return errors if any
 */
export function validateManifest(manifest: unknown): string[] {
  const errors: string[] = [];
  
  if (!isObject(manifest)) {
    return ['Manifest must be an object'];
  }
  
  // Check version
  if (!manifest.version || typeof manifest.version !== 'string') {
    errors.push('Manifest must have a version string');
  }
  
  // Check tools array
  if (!Array.isArray(manifest.tools)) {
    errors.push('Manifest must have a tools array');
    return errors; // Can't continue without tools
  }
  
  // Validate each tool
  manifest.tools.forEach((tool, index) => {
    const toolErrors = validateTool(tool, index);
    errors.push(...toolErrors);
  });
  
  return errors;
}

/**
 * Validate a single tool
 */
function validateTool(tool: unknown, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Tool[${index}]`;
  
  if (!isObject(tool)) {
    return [`${prefix}: must be an object`];
  }
  
  // Required fields
  if (!tool.id || typeof tool.id !== 'string') {
    errors.push(`${prefix}: must have an id string`);
  }
  
  if (!tool.name || typeof tool.name !== 'string') {
    errors.push(`${prefix}: must have a name string`);
  }
  
  if (!tool.category || !VALID_CATEGORIES.includes(tool.category as ToolCategory)) {
    errors.push(`${prefix}: must have a valid category (${VALID_CATEGORIES.join(', ')})`);
  }
  
  // Optional fields validation
  if (tool.packageNames && !isObject(tool.packageNames)) {
    errors.push(`${prefix}: packageNames must be an object`);
  }
  
  if (tool.customInstall && !isObject(tool.customInstall)) {
    errors.push(`${prefix}: customInstall must be an object`);
  }
  
  return errors;
}

/**
 * Type guard for objects
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if manifest is valid (convenience function)
 */
export function isValidManifest(manifest: unknown): manifest is SimpleManifest {
  return validateManifest(manifest).length === 0;
}

// 85 lines of practical validation