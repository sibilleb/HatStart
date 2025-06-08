/**
 * Simple Manifest Loader
 * Replaces 398 lines with basic file loading - no caching, no remote loading, no complexity
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type { SimpleManifest, SimpleTool } from './simple-manifest-types';

/**
 * Load a manifest from a JSON file
 */
export async function loadManifest(filePath: string): Promise<SimpleManifest> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Basic structure check
    if (!data.version || !Array.isArray(data.tools)) {
      throw new Error('Invalid manifest format: missing version or tools array');
    }
    
    return data as SimpleManifest;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load manifest from ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Load the default built-in manifest
 */
export async function loadDefaultManifest(): Promise<SimpleManifest> {
  const defaultPath = path.join(__dirname, 'default-tools.json');
  return loadManifest(defaultPath);
}

/**
 * Save a manifest to a JSON file
 */
export async function saveManifest(
  manifest: SimpleManifest, 
  filePath: string
): Promise<void> {
  const content = JSON.stringify(manifest, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Merge multiple manifests (for extensibility)
 */
export function mergeManifests(...manifests: SimpleManifest[]): SimpleManifest {
  const toolMap = new Map<string, SimpleTool>();
  
  // Later manifests override earlier ones
  for (const manifest of manifests) {
    for (const tool of manifest.tools) {
      toolMap.set(tool.id, tool);
    }
  }
  
  return {
    version: '1.0.0',
    tools: Array.from(toolMap.values())
  };
}

// That's it! 65 lines of actually useful code.