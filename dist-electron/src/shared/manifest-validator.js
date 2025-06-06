"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manifestValidator = exports.ManifestValidator = void 0;
/**
 * Manifest validator class providing comprehensive validation for all manifest types
 */
class ManifestValidator {
    /**
     * Validate any manifest data and determine its type
     */
    validateManifest(data) {
        if (!this.isObject(data)) {
            return this.createError('root', 'Manifest must be an object', 'INVALID_TYPE');
        }
        const obj = data;
        // Determine manifest type based on structure
        if ('tools' in obj && Array.isArray(obj.tools)) {
            return this.validateCategoryManifest(obj);
        }
        else if ('categoryManifests' in obj && this.isObject(obj.categoryManifests)) {
            return this.validateMasterManifest(obj);
        }
        else if ('name' in obj && 'version' in obj && 'category' in obj) {
            return this.validateToolManifest(obj);
        }
        return this.createError('root', 'Unable to determine manifest type', 'UNKNOWN_TYPE');
    }
    /**
     * Validate a tool manifest
     */
    validateToolManifest(data) {
        const errors = [];
        const warnings = [];
        if (!this.isObject(data)) {
            return this.createError('root', 'Tool manifest must be an object', 'INVALID_TYPE');
        }
        const obj = data;
        // Required fields validation
        this.validateRequired(obj, 'id', 'string', errors);
        this.validateRequired(obj, 'name', 'string', errors);
        this.validateRequired(obj, 'description', 'string', errors);
        this.validateRequired(obj, 'category', 'string', errors);
        this.validateRequired(obj, 'schemaVersion', 'string', errors);
        // Validate category is a known value
        if (obj.category && typeof obj.category === 'string') {
            const validCategories = [
                'frontend', 'backend', 'mobile', 'devops', 'design',
                'testing', 'database', 'productivity', 'security',
                'language', 'version-control', 'cloud'
            ];
            if (!validCategories.includes(obj.category)) {
                errors.push({
                    code: 'INVALID_CATEGORY',
                    message: `Category '${obj.category}' is not valid. Must be one of: ${validCategories.join(', ')}`,
                    path: 'category',
                    severity: 'error',
                    field: 'category',
                    value: obj.category
                });
            }
        }
        // Validate required arrays/objects
        if (obj.experienceLevel !== undefined) {
            if (!Array.isArray(obj.experienceLevel)) {
                errors.push(this.createValidationError('experienceLevel', 'Experience level must be an array', 'INVALID_TYPE', obj.experienceLevel));
            }
        }
        if (obj.systemRequirements !== undefined) {
            this.validateSystemRequirements(obj.systemRequirements, 'systemRequirements', errors);
        }
        if (obj.version !== undefined) {
            this.validateVersionInfo(obj.version, 'version', errors);
        }
        if (obj.installation !== undefined) {
            this.validateInstallationCommands(obj.installation, 'installation', errors);
        }
        // Optional field validations
        if (obj.website !== undefined) {
            this.validateUrl(obj.website, 'website', errors);
        }
        if (obj.repository !== undefined) {
            this.validateUrl(obj.repository, 'repository', errors);
        }
        if (obj.documentation !== undefined) {
            this.validateToolDocumentation(obj.documentation, 'documentation', errors);
        }
        if (obj.ideIntegration !== undefined) {
            this.validateIDEIntegration(obj.ideIntegration, 'ideIntegration', errors);
        }
        if (obj.configuration !== undefined) {
            this.validateConfigurationOptions(obj.configuration, 'configuration', errors);
        }
        // Add warnings for recommended fields
        if (!obj.website && !obj.repository) {
            warnings.push('Tool website or repository URL is recommended for better user experience');
        }
        if (!obj.documentation) {
            warnings.push('Documentation is recommended for user guidance');
        }
        return {
            isValid: errors.length === 0,
            data: errors.length === 0 ? obj : null,
            errors: errors.map(e => e.message),
            warnings,
            errorDetails: errors
        };
    }
    /**
     * Validate a category manifest
     */
    validateCategoryManifest(data) {
        const errors = [];
        const warnings = [];
        if (!this.isObject(data)) {
            return this.createError('root', 'Category manifest must be an object', 'INVALID_TYPE');
        }
        const obj = data;
        // Required fields
        this.validateRequired(obj, 'category', 'string', errors);
        this.validateRequired(obj, 'name', 'string', errors);
        this.validateRequired(obj, 'description', 'string', errors);
        this.validateRequired(obj, 'tools', 'array', errors);
        this.validateRequired(obj, 'lastUpdated', 'string', errors);
        this.validateRequired(obj, 'schemaVersion', 'string', errors);
        // Validate tools array
        if (obj.tools && Array.isArray(obj.tools)) {
            obj.tools.forEach((tool, index) => {
                const toolResult = this.validateToolManifest(tool);
                if (!toolResult.isValid) {
                    toolResult.errorDetails.forEach(error => {
                        errors.push({
                            ...error,
                            field: `tools[${index}].${error.field}`,
                            path: `tools[${index}].${error.path}`
                        });
                    });
                }
                warnings.push(...toolResult.warnings.map(w => `tools[${index}]: ${w}`));
            });
        }
        return {
            isValid: errors.length === 0,
            data: errors.length === 0 ? obj : null,
            errors: errors.map(e => e.message),
            warnings,
            errorDetails: errors
        };
    }
    /**
     * Validate a master manifest
     */
    validateMasterManifest(data) {
        const errors = [];
        const warnings = [];
        if (!this.isObject(data)) {
            return this.createError('root', 'Master manifest must be an object', 'INVALID_TYPE');
        }
        const obj = data;
        // Required fields
        this.validateRequired(obj, 'metadata', 'object', errors);
        this.validateRequired(obj, 'categories', 'array', errors);
        this.validateRequired(obj, 'categoryManifests', 'object', errors);
        // Validate metadata object
        if (obj.metadata && this.isObject(obj.metadata)) {
            const metadata = obj.metadata;
            this.validateRequired(metadata, 'name', 'string', errors, 'metadata');
            this.validateRequired(metadata, 'version', 'string', errors, 'metadata');
            this.validateRequired(metadata, 'lastUpdated', 'string', errors, 'metadata');
            this.validateRequired(metadata, 'schemaVersion', 'string', errors, 'metadata');
        }
        // Validate category manifests
        if (obj.categoryManifests && this.isObject(obj.categoryManifests)) {
            const categoryManifests = obj.categoryManifests;
            Object.entries(categoryManifests).forEach(([category, manifest]) => {
                const categoryResult = this.validateCategoryManifest(manifest);
                if (!categoryResult.isValid) {
                    categoryResult.errorDetails.forEach(error => {
                        errors.push({
                            ...error,
                            field: `categoryManifests.${category}.${error.field}`,
                            path: `categoryManifests.${category}.${error.path}`
                        });
                    });
                }
                warnings.push(...categoryResult.warnings.map(w => `categoryManifests.${category}: ${w}`));
            });
        }
        return {
            isValid: errors.length === 0,
            data: errors.length === 0 ? obj : null,
            errors: errors.map(e => e.message),
            warnings,
            errorDetails: errors
        };
    }
    /**
     * Validate version information
     */
    validateVersionInfo(version, field, errors) {
        if (!this.isObject(version)) {
            errors.push(this.createValidationError(field, 'Version info must be an object', 'INVALID_TYPE', version));
            return;
        }
        const versionObj = version;
        // Validate required stable version
        if (!versionObj.stable || typeof versionObj.stable !== 'string') {
            errors.push(this.createValidationError(`${field}.stable`, 'Stable version is required and must be a string', 'MISSING_STABLE_VERSION', versionObj.stable));
        }
        else {
            // Validate semantic versioning format
            const versionRegex = /^\d+\.\d+(\.\d+)?(-[\w\d.-]+)?$/;
            if (!versionRegex.test(versionObj.stable)) {
                errors.push(this.createValidationError(`${field}.stable`, `Version '${versionObj.stable}' does not follow semantic versioning format`, 'INVALID_VERSION_FORMAT', versionObj.stable));
            }
        }
        // Validate optional version fields
        ['beta', 'preview', 'minimum', 'recommended'].forEach(versionType => {
            if (versionObj[versionType] !== undefined && typeof versionObj[versionType] !== 'string') {
                errors.push(this.createValidationError(`${field}.${versionType}`, `${versionType} version must be a string`, 'INVALID_TYPE', versionObj[versionType]));
            }
        });
    }
    /**
     * Validate installation commands
     */
    validateInstallationCommands(installation, field, errors) {
        if (!Array.isArray(installation)) {
            errors.push(this.createValidationError(field, 'Installation must be an array', 'INVALID_TYPE', installation));
            return;
        }
        const validMethods = [
            'package-manager', 'direct-download', 'script', 'homebrew', 'chocolatey',
            'apt', 'yum', 'snap', 'flatpak', 'winget', 'scoop', 'npm', 'cargo', 'pip', 'gem', 'go-install'
        ];
        installation.forEach((command, index) => {
            if (!this.isObject(command)) {
                errors.push(this.createValidationError(`${field}[${index}]`, 'Installation command must be an object', 'INVALID_TYPE', command));
                return;
            }
            const commandObj = command;
            // Validate required fields
            if (!commandObj.method || !validMethods.includes(commandObj.method)) {
                errors.push(this.createValidationError(`${field}[${index}].method`, `Invalid installation method. Must be one of: ${validMethods.join(', ')}`, 'INVALID_METHOD', commandObj.method));
            }
            if (!commandObj.platform || typeof commandObj.platform !== 'string') {
                errors.push(this.createValidationError(`${field}[${index}].platform`, 'Platform is required and must be a string', 'MISSING_PLATFORM', commandObj.platform));
            }
            if (!commandObj.command || typeof commandObj.command !== 'string') {
                errors.push(this.createValidationError(`${field}[${index}].command`, 'Command is required and must be a string', 'MISSING_COMMAND', commandObj.command));
            }
        });
    }
    /**
     * Validate tool documentation
     */
    validateToolDocumentation(documentation, field, errors) {
        if (!this.isObject(documentation)) {
            errors.push(this.createValidationError(field, 'Documentation must be an object', 'INVALID_TYPE', documentation));
            return;
        }
        const docObj = documentation;
        // Validate URL fields
        const urlFields = ['officialDocs', 'quickStart', 'apiReference', 'troubleshooting'];
        urlFields.forEach(urlField => {
            if (docObj[urlField] !== undefined) {
                this.validateUrl(docObj[urlField], `${field}.${urlField}`, errors);
            }
        });
        // Validate array fields
        const arrayFields = ['tutorials', 'videos', 'community'];
        arrayFields.forEach(arrayField => {
            if (docObj[arrayField] !== undefined) {
                if (!Array.isArray(docObj[arrayField])) {
                    errors.push(this.createValidationError(`${field}.${arrayField}`, `${arrayField} must be an array`, 'INVALID_TYPE', docObj[arrayField]));
                }
                else {
                    docObj[arrayField].forEach((url, index) => {
                        this.validateUrl(url, `${field}.${arrayField}[${index}]`, errors);
                    });
                }
            }
        });
    }
    /**
     * Validate IDE integration
     */
    validateIDEIntegration(ideIntegration, field, errors) {
        if (!this.isObject(ideIntegration)) {
            errors.push(this.createValidationError(field, 'IDE integration must be an object', 'INVALID_TYPE', ideIntegration));
            return;
        }
        const validIDEs = ['vscode', 'cursor', 'jetbrains', 'vim'];
        const integrationObj = ideIntegration;
        Object.entries(integrationObj).forEach(([ide, config]) => {
            if (!validIDEs.includes(ide)) {
                errors.push(this.createValidationError(`${field}.${ide}`, `Invalid IDE '${ide}'. Must be one of: ${validIDEs.join(', ')}`, 'INVALID_IDE', ide));
                return;
            }
            if (!this.isObject(config)) {
                errors.push(this.createValidationError(`${field}.${ide}`, 'IDE configuration must be an object', 'INVALID_TYPE', config));
            }
        });
    }
    /**
     * Validate system requirements
     */
    validateSystemRequirements(requirements, field, errors) {
        if (!this.isObject(requirements)) {
            errors.push(this.createValidationError(field, 'System requirements must be an object', 'INVALID_TYPE', requirements));
            return;
        }
        const reqObj = requirements;
        // Validate platforms array
        if (reqObj.platforms && Array.isArray(reqObj.platforms)) {
            const validPlatforms = ['windows', 'macos', 'linux'];
            reqObj.platforms.forEach((platform, index) => {
                if (!validPlatforms.includes(platform)) {
                    errors.push(this.createValidationError(`${field}.platforms[${index}]`, `Invalid platform '${platform}'. Must be one of: ${validPlatforms.join(', ')}`, 'INVALID_PLATFORM', platform));
                }
            });
        }
        // Validate architectures array
        if (reqObj.architectures && Array.isArray(reqObj.architectures)) {
            const validArchitectures = ['x64', 'arm64', 'x86'];
            reqObj.architectures.forEach((arch, index) => {
                if (!validArchitectures.includes(arch)) {
                    errors.push(this.createValidationError(`${field}.architectures[${index}]`, `Invalid architecture '${arch}'. Must be one of: ${validArchitectures.join(', ')}`, 'INVALID_ARCHITECTURE', arch));
                }
            });
        }
        // Validate numeric fields
        if (reqObj.minRam !== undefined && typeof reqObj.minRam !== 'number') {
            errors.push(this.createValidationError(`${field}.minRam`, 'Minimum RAM must be a number (in MB)', 'INVALID_TYPE', reqObj.minRam));
        }
        if (reqObj.minDiskSpace !== undefined && typeof reqObj.minDiskSpace !== 'number') {
            errors.push(this.createValidationError(`${field}.minDiskSpace`, 'Minimum disk space must be a number (in MB)', 'INVALID_TYPE', reqObj.minDiskSpace));
        }
    }
    /**
     * Validate configuration options
     */
    validateConfigurationOptions(configuration, field, errors) {
        if (!Array.isArray(configuration)) {
            errors.push(this.createValidationError(field, 'Configuration must be an array', 'INVALID_TYPE', configuration));
            return;
        }
        configuration.forEach((config, index) => {
            if (!this.isObject(config)) {
                errors.push(this.createValidationError(`${field}[${index}]`, 'Configuration option must be an object', 'INVALID_TYPE', config));
                return;
            }
            const configObj = config;
            // Validate required fields
            ['key', 'name', 'type'].forEach(subfield => {
                if (!configObj[subfield] || typeof configObj[subfield] !== 'string') {
                    errors.push(this.createValidationError(`${field}[${index}].${subfield}`, `Configuration ${subfield} is required and must be a string`, 'MISSING_FIELD', configObj[subfield]));
                }
            });
            // Validate type
            if (configObj.type) {
                const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
                if (!validTypes.includes(configObj.type)) {
                    errors.push(this.createValidationError(`${field}[${index}].type`, `Invalid configuration type '${configObj.type}'. Must be one of: ${validTypes.join(', ')}`, 'INVALID_CONFIG_TYPE', configObj.type));
                }
            }
        });
    }
    /**
     * Validate URL format
     */
    validateUrl(url, field, errors) {
        if (typeof url !== 'string') {
            errors.push(this.createValidationError(field, 'URL must be a string', 'INVALID_TYPE', url));
            return;
        }
        try {
            new URL(url);
        }
        catch {
            errors.push(this.createValidationError(field, `Invalid URL format: ${url}`, 'INVALID_URL', url));
        }
    }
    /**
     * Validate required field
     */
    validateRequired(obj, field, expectedType, errors, pathPrefix = '') {
        if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
            errors.push(this.createValidationError(field, `Field '${field}' is required`, 'MISSING_REQUIRED', obj[field], pathPrefix));
            return;
        }
        if (expectedType === 'string' && typeof obj[field] !== 'string') {
            errors.push(this.createValidationError(field, `Field '${field}' must be a string`, 'INVALID_TYPE', obj[field], pathPrefix));
        }
        if (expectedType === 'array' && !Array.isArray(obj[field])) {
            errors.push(this.createValidationError(field, `Field '${field}' must be an array`, 'INVALID_TYPE', obj[field], pathPrefix));
        }
        if (expectedType === 'object' && !this.isObject(obj[field])) {
            errors.push(this.createValidationError(field, `Field '${field}' must be an object`, 'INVALID_TYPE', obj[field], pathPrefix));
        }
    }
    /**
     * Check if value is a plain object
     */
    isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    /**
     * Create an error result
     */
    createError(field, message, code) {
        return {
            isValid: false,
            data: null,
            errors: [message],
            warnings: [],
            errorDetails: [{
                    field,
                    message,
                    code,
                    path: field,
                    severity: 'error'
                }]
        };
    }
    /**
     * Create a validation error result
     */
    createValidationError(field, message, code, value, pathPrefix) {
        return {
            field,
            message,
            code,
            value,
            path: pathPrefix ? `${pathPrefix}.${field}` : field,
            severity: 'error'
        };
    }
}
exports.ManifestValidator = ManifestValidator;
// Export a default instance
exports.manifestValidator = new ManifestValidator();
//# sourceMappingURL=manifest-validator.js.map