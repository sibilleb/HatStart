"use strict";
/**
 * Simple Manifest Validator
 * Replaces 708 lines with basic validation that actually matters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateManifest = validateManifest;
exports.isValidManifest = isValidManifest;
const VALID_CATEGORIES = [
    'language', 'framework', 'database', 'devops', 'productivity', 'other'
];
const VALID_PLATFORMS = ['darwin', 'win32', 'linux'];
/**
 * Validate a manifest and return errors if any
 */
function validateManifest(manifest) {
    const errors = [];
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
function validateTool(tool, index) {
    const errors = [];
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
    if (!tool.category || !VALID_CATEGORIES.includes(tool.category)) {
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
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Check if manifest is valid (convenience function)
 */
function isValidManifest(manifest) {
    return validateManifest(manifest).length === 0;
}
// 85 lines of practical validation
//# sourceMappingURL=simple-manifest-validator.js.map