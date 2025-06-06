import type {
    Architecture,
    ValidationError as BaseValidationError,
    CategoryManifest,
    InstallationMethod,
    MasterManifest,
    Platform,
    ToolCategory,
    ToolManifest
} from './manifest-types';

/**
 * Union type for any manifest data
 */
export type ManifestData = ToolManifest | CategoryManifest | MasterManifest;

/**
 * Extended validation error with additional context
 */
export interface ExtendedValidationError extends BaseValidationError {
    field: string;
    value?: unknown;
}

/**
 * Detailed validation result with enhanced error reporting
 */
export interface DetailedValidationResult<T> {
    isValid: boolean;
    data: T | null;
    errors: string[];
    warnings: string[];
    errorDetails: ExtendedValidationError[];
}

/**
 * Manifest validator class providing comprehensive validation for all manifest types
 */
export class ManifestValidator {
    
    /**
     * Validate any manifest data and determine its type
     */
    validateManifest(data: unknown): DetailedValidationResult<ManifestData> {
        if (!this.isObject(data)) {
            return this.createError('root', 'Manifest must be an object', 'INVALID_TYPE');
        }

        const obj = data as Record<string, unknown>;

        // Determine manifest type based on structure
        if ('tools' in obj && Array.isArray(obj.tools)) {
            return this.validateCategoryManifest(obj) as DetailedValidationResult<ManifestData>;
        } else if ('categoryManifests' in obj && this.isObject(obj.categoryManifests)) {
            return this.validateMasterManifest(obj) as DetailedValidationResult<ManifestData>;
        } else if ('name' in obj && 'version' in obj && 'category' in obj) {
            return this.validateToolManifest(obj) as DetailedValidationResult<ManifestData>;
        }

        return this.createError('root', 'Unable to determine manifest type', 'UNKNOWN_TYPE');
    }

    /**
     * Validate a tool manifest
     */
    validateToolManifest(data: unknown): DetailedValidationResult<ToolManifest> {
        const errors: ExtendedValidationError[] = [];
        const warnings: string[] = [];

        if (!this.isObject(data)) {
            return this.createError('root', 'Tool manifest must be an object', 'INVALID_TYPE');
        }

        const obj = data as Record<string, unknown>;

        // Required fields validation
        this.validateRequired(obj, 'id', 'string', errors);
        this.validateRequired(obj, 'name', 'string', errors);
        this.validateRequired(obj, 'description', 'string', errors);
        this.validateRequired(obj, 'category', 'string', errors);
        this.validateRequired(obj, 'schemaVersion', 'string', errors);

        // Validate category is a known value
        if (obj.category && typeof obj.category === 'string') {
            const validCategories: ToolCategory[] = [
                'frontend', 'backend', 'mobile', 'devops', 'design', 
                'testing', 'database', 'productivity', 'security', 
                'language', 'version-control', 'cloud'
            ];
            if (!validCategories.includes(obj.category as ToolCategory)) {
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
            data: errors.length === 0 ? (obj as unknown as ToolManifest) : null,
            errors: errors.map(e => e.message),
            warnings,
            errorDetails: errors
        };
    }

    /**
     * Validate a category manifest
     */
    validateCategoryManifest(data: unknown): DetailedValidationResult<CategoryManifest> {
        const errors: ExtendedValidationError[] = [];
        const warnings: string[] = [];

        if (!this.isObject(data)) {
            return this.createError('root', 'Category manifest must be an object', 'INVALID_TYPE');
        }

        const obj = data as Record<string, unknown>;

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
            data: errors.length === 0 ? (obj as unknown as CategoryManifest) : null,
            errors: errors.map(e => e.message),
            warnings,
            errorDetails: errors
        };
    }

    /**
     * Validate a master manifest
     */
    validateMasterManifest(data: unknown): DetailedValidationResult<MasterManifest> {
        const errors: ExtendedValidationError[] = [];
        const warnings: string[] = [];

        if (!this.isObject(data)) {
            return this.createError('root', 'Master manifest must be an object', 'INVALID_TYPE');
        }

        const obj = data as Record<string, unknown>;

        // Required fields
        this.validateRequired(obj, 'metadata', 'object', errors);
        this.validateRequired(obj, 'categories', 'array', errors);
        this.validateRequired(obj, 'categoryManifests', 'object', errors);

        // Validate metadata object
        if (obj.metadata && this.isObject(obj.metadata)) {
            const metadata = obj.metadata as Record<string, unknown>;
            this.validateRequired(metadata, 'name', 'string', errors, 'metadata');
            this.validateRequired(metadata, 'version', 'string', errors, 'metadata');
            this.validateRequired(metadata, 'lastUpdated', 'string', errors, 'metadata');
            this.validateRequired(metadata, 'schemaVersion', 'string', errors, 'metadata');
        }

        // Validate category manifests
        if (obj.categoryManifests && this.isObject(obj.categoryManifests)) {
            const categoryManifests = obj.categoryManifests as Record<string, unknown>;
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
            data: errors.length === 0 ? (obj as unknown as MasterManifest) : null,
            errors: errors.map(e => e.message),
            warnings,
            errorDetails: errors
        };
    }

    /**
     * Validate version information
     */
    private validateVersionInfo(version: unknown, field: string, errors: ExtendedValidationError[]): void {
        if (!this.isObject(version)) {
            errors.push(this.createValidationError(field, 'Version info must be an object', 'INVALID_TYPE', version));
            return;
        }

        const versionObj = version as Record<string, unknown>;
        
        // Validate required stable version
        if (!versionObj.stable || typeof versionObj.stable !== 'string') {
            errors.push(this.createValidationError(`${field}.stable`, 'Stable version is required and must be a string', 'MISSING_STABLE_VERSION', versionObj.stable));
        } else {
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
    private validateInstallationCommands(installation: unknown, field: string, errors: ExtendedValidationError[]): void {
        if (!Array.isArray(installation)) {
            errors.push(this.createValidationError(field, 'Installation must be an array', 'INVALID_TYPE', installation));
            return;
        }

        const validMethods: InstallationMethod[] = [
            'package-manager', 'direct-download', 'script', 'homebrew', 'chocolatey',
            'apt', 'yum', 'snap', 'flatpak', 'winget', 'scoop', 'npm', 'cargo', 'pip', 'gem', 'go-install'
        ];

        installation.forEach((command, index) => {
            if (!this.isObject(command)) {
                errors.push(this.createValidationError(`${field}[${index}]`, 'Installation command must be an object', 'INVALID_TYPE', command));
                return;
            }

            const commandObj = command as Record<string, unknown>;

            // Validate required fields
            if (!commandObj.method || !validMethods.includes(commandObj.method as InstallationMethod)) {
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
    private validateToolDocumentation(documentation: unknown, field: string, errors: ExtendedValidationError[]): void {
        if (!this.isObject(documentation)) {
            errors.push(this.createValidationError(field, 'Documentation must be an object', 'INVALID_TYPE', documentation));
            return;
        }

        const docObj = documentation as Record<string, unknown>;

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
                } else {
                    (docObj[arrayField] as unknown[]).forEach((url, index) => {
                        this.validateUrl(url, `${field}.${arrayField}[${index}]`, errors);
                    });
                }
            }
        });
    }

    /**
     * Validate IDE integration
     */
    private validateIDEIntegration(ideIntegration: unknown, field: string, errors: ExtendedValidationError[]): void {
        if (!this.isObject(ideIntegration)) {
            errors.push(this.createValidationError(field, 'IDE integration must be an object', 'INVALID_TYPE', ideIntegration));
            return;
        }

        const validIDEs = ['vscode', 'cursor', 'jetbrains', 'vim'];
        const integrationObj = ideIntegration as Record<string, unknown>;

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
    private validateSystemRequirements(requirements: unknown, field: string, errors: ExtendedValidationError[]): void {
        if (!this.isObject(requirements)) {
            errors.push(this.createValidationError(field, 'System requirements must be an object', 'INVALID_TYPE', requirements));
            return;
        }

        const reqObj = requirements as Record<string, unknown>;

        // Validate platforms array
        if (reqObj.platforms && Array.isArray(reqObj.platforms)) {
            const validPlatforms: Platform[] = ['windows', 'macos', 'linux'];
            reqObj.platforms.forEach((platform, index) => {
                if (!validPlatforms.includes(platform as Platform)) {
                    errors.push(this.createValidationError(`${field}.platforms[${index}]`, `Invalid platform '${platform}'. Must be one of: ${validPlatforms.join(', ')}`, 'INVALID_PLATFORM', platform));
                }
            });
        }

        // Validate architectures array
        if (reqObj.architectures && Array.isArray(reqObj.architectures)) {
            const validArchitectures: Architecture[] = ['x64', 'arm64', 'x86'];
            reqObj.architectures.forEach((arch, index) => {
                if (!validArchitectures.includes(arch as Architecture)) {
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
    private validateConfigurationOptions(configuration: unknown, field: string, errors: ExtendedValidationError[]): void {
        if (!Array.isArray(configuration)) {
            errors.push(this.createValidationError(field, 'Configuration must be an array', 'INVALID_TYPE', configuration));
            return;
        }

        configuration.forEach((config, index) => {
            if (!this.isObject(config)) {
                errors.push(this.createValidationError(`${field}[${index}]`, 'Configuration option must be an object', 'INVALID_TYPE', config));
                return;
            }

            const configObj = config as Record<string, unknown>;
            
            // Validate required fields
            ['key', 'name', 'type'].forEach(subfield => {
                if (!configObj[subfield] || typeof configObj[subfield] !== 'string') {
                    errors.push(this.createValidationError(`${field}[${index}].${subfield}`, `Configuration ${subfield} is required and must be a string`, 'MISSING_FIELD', configObj[subfield]));
                }
            });

            // Validate type
            if (configObj.type) {
                const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
                if (!validTypes.includes(configObj.type as string)) {
                    errors.push(this.createValidationError(`${field}[${index}].type`, `Invalid configuration type '${configObj.type}'. Must be one of: ${validTypes.join(', ')}`, 'INVALID_CONFIG_TYPE', configObj.type));
                }
            }
        });
    }

    /**
     * Validate URL format
     */
    private validateUrl(url: unknown, field: string, errors: ExtendedValidationError[]): void {
        if (typeof url !== 'string') {
            errors.push(this.createValidationError(field, 'URL must be a string', 'INVALID_TYPE', url));
            return;
        }

        try {
            new URL(url);
        } catch {
            errors.push(this.createValidationError(field, `Invalid URL format: ${url}`, 'INVALID_URL', url));
        }
    }

    /**
     * Validate required field
     */
    private validateRequired(obj: Record<string, unknown>, field: string, expectedType: string, errors: ExtendedValidationError[], pathPrefix: string = ''): void {
        
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
    private isObject(value: unknown): value is Record<string, unknown> {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * Create an error result
     */
    private createError<T>(field: string, message: string, code: string): DetailedValidationResult<T> {
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
                severity: 'error' as const
            }]
        };
    }

    /**
     * Create a validation error result
     */
    private createValidationError(field: string, message: string, code: string, value?: unknown, pathPrefix?: string): ExtendedValidationError {
        return {
            field,
            message,
            code,
            value,
            path: pathPrefix ? `${pathPrefix}.${field}` : field,
            severity: 'error' as const
        };
    }
}

// Export a default instance
export const manifestValidator = new ManifestValidator();
