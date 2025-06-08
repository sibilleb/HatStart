"use strict";
/**
 * Simple Manifest Loader
 * Replaces 398 lines with basic file loading - no caching, no remote loading, no complexity
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadManifest = loadManifest;
exports.loadDefaultManifest = loadDefaultManifest;
exports.saveManifest = saveManifest;
exports.mergeManifests = mergeManifests;
const fs_1 = require("fs");
const path = __importStar(require("path"));
/**
 * Load a manifest from a JSON file
 */
async function loadManifest(filePath) {
    try {
        const content = await fs_1.promises.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        // Basic structure check
        if (!data.version || !Array.isArray(data.tools)) {
            throw new Error('Invalid manifest format: missing version or tools array');
        }
        return data;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to load manifest from ${filePath}: ${error.message}`);
        }
        throw error;
    }
}
/**
 * Load the default built-in manifest
 */
async function loadDefaultManifest() {
    const defaultPath = path.join(__dirname, 'default-tools.json');
    return loadManifest(defaultPath);
}
/**
 * Save a manifest to a JSON file
 */
async function saveManifest(manifest, filePath) {
    const content = JSON.stringify(manifest, null, 2);
    await fs_1.promises.writeFile(filePath, content, 'utf-8');
}
/**
 * Merge multiple manifests (for extensibility)
 */
function mergeManifests(...manifests) {
    const toolMap = new Map();
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
//# sourceMappingURL=simple-manifest-loader.js.map