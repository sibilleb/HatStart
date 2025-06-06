"use strict";
/**
 * Enhanced Manifest Loader with Comprehensive Error Handling
 * Integrates error handling, recovery, and logging for robust manifest operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedLoaderUtils = exports.defaultEnhancedLoader = exports.EnhancedManifestLoader = void 0;
const error_handling_1 = require("./error-handling");
const error_logging_1 = require("./error-logging");
const error_recovery_1 = require("./error-recovery");
const manifest_loader_1 = require("./manifest-loader");
const manifest_validator_1 = require("./manifest-validator");
/**
 * Enhanced Manifest Loader with integrated error handling
 */
class EnhancedManifestLoader {
    constructor(config = {}, customErrorHandler, customErrorRecovery) {
        this.manifestLoader = new manifest_loader_1.ManifestLoader();
        this.validator = new manifest_validator_1.ManifestValidator();
        this.errorHandler = customErrorHandler || error_handling_1.defaultErrorHandler;
        this.errorRecovery = customErrorRecovery || error_recovery_1.defaultErrorRecovery;
        this.errorCollector = new error_handling_1.ErrorCollector();
        this.setupRecoveryActions(config);
    }
    /**
     * Load and validate a manifest with comprehensive error handling
     */
    async loadManifest(source, config = {}) {
        const startTime = Date.now();
        const operation = async () => {
            // Load manifest using base loader
            const loadResult = await this.manifestLoader.loadFromSource(source, config);
            if (!loadResult.success || !loadResult.data) {
                throw this.convertLoadError(loadResult.error || new Error('Unknown load error'));
            }
            // Validate manifest
            const validationResult = this.validator.validateManifest(loadResult.data);
            if (!validationResult.isValid) {
                throw this.createValidationError(validationResult);
            }
            return loadResult.data;
        };
        // Execute with full error recovery
        const result = await this.errorRecovery.executeWithRecovery(operation, {
            serviceName: 'manifest-loader',
            retryConfig: {
                maxAttempts: config.maxRetries || 3,
                initialDelay: 1000,
                backoffMultiplier: 2,
                maxDelay: 10000,
                useJitter: true,
            },
            fallback: config.alternativeSources?.length
                ? this.createFallbackStrategy(config.alternativeSources, config)
                : undefined,
            errorFactory: (attempt, error) => this.createEnhancedError(error, source, attempt),
        });
        // Process result and create enhanced response
        const enhancedResult = await this.processResult(result, source, startTime, config);
        // Log errors if enabled
        if (config.enableLogging !== false) {
            await this.logResults(enhancedResult);
        }
        return enhancedResult;
    }
    /**
     * Load multiple manifests with batch error handling
     */
    async loadManifests(sources, config = {}) {
        const results = await Promise.allSettled(sources.map(source => this.loadManifest(source, config)));
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            else {
                const error = this.createEnhancedError(result.reason, sources[index], 1);
                return {
                    success: false,
                    error,
                    allErrors: [error],
                    metrics: {
                        attempts: 1,
                        duration: 0,
                        errorsHandled: 1,
                    },
                    warnings: [],
                };
            }
        });
    }
    /**
     * Validate manifest with enhanced error reporting
     */
    validateManifest(data, config = {}) {
        const startTime = Date.now();
        try {
            const validationResult = this.validator.validateManifest(data);
            if (validationResult.isValid) {
                return {
                    success: true,
                    data: data,
                    allErrors: [],
                    validation: validationResult,
                    metrics: {
                        attempts: 1,
                        duration: Date.now() - startTime,
                        errorsHandled: 0,
                    },
                    warnings: this.convertValidationWarnings(validationResult),
                };
            }
            else {
                const error = this.createValidationError(validationResult);
                return {
                    success: false,
                    error,
                    allErrors: [error],
                    validation: validationResult,
                    metrics: {
                        attempts: 1,
                        duration: Date.now() - startTime,
                        errorsHandled: 1,
                    },
                    warnings: [],
                };
            }
        }
        catch (error) {
            const enhancedError = this.createEnhancedError(error, 'validation', 1);
            return {
                success: false,
                error: enhancedError,
                allErrors: [enhancedError],
                metrics: {
                    attempts: 1,
                    duration: Date.now() - startTime,
                    errorsHandled: 1,
                },
                warnings: [],
            };
        }
    }
    /**
     * Get error metrics from recent operations
     */
    getErrorMetrics(timeRange) {
        return error_logging_1.defaultErrorLogger.getMetrics(timeRange);
    }
    /**
     * Analyze error patterns from recent operations
     */
    analyzeErrorPatterns() {
        return error_logging_1.defaultErrorLogger.analyzePatterns();
    }
    /**
     * Register custom recovery action
     */
    registerRecoveryAction(errorCode, action) {
        this.errorRecovery.registerRecoveryAction(errorCode, action);
    }
    /**
     * Get current error collection
     */
    getErrorCollection() {
        return this.errorCollector.getErrorCollection();
    }
    /**
     * Clear accumulated errors
     */
    clearErrors() {
        this.errorCollector.clear();
    }
    setupRecoveryActions(config) {
        // Setup default recovery actions
        if (config.cacheDir) {
            this.errorRecovery.registerRecoveryAction('FILE_NOT_FOUND', error_recovery_1.CommonRecoveryActions.createCacheDirectory(config.cacheDir));
            this.errorRecovery.registerRecoveryAction('CACHE_CORRUPTION', error_recovery_1.CommonRecoveryActions.clearCacheAndRetry(config.cacheDir));
        }
        // Setup fallback recovery
        if (config.alternativeSources?.length) {
            config.alternativeSources.forEach((source, index) => {
                this.errorRecovery.registerRecoveryAction(`FALLBACK_SOURCE_${index}`, error_recovery_1.CommonRecoveryActions.fallbackToAlternativeSource(source));
            });
        }
    }
    createFallbackStrategy(sources, config) {
        return async (error) => {
            for (const source of sources) {
                try {
                    const result = await this.manifestLoader.loadFromSource(source, config);
                    if (result.success && result.data) {
                        return result.data;
                    }
                }
                catch {
                    // Continue to next source
                }
            }
            throw error; // All fallbacks failed
        };
    }
    async processResult(result, source, startTime, config) {
        const duration = Date.now() - startTime;
        if (result.success && result.data) {
            // Validate successful result
            const validationResult = this.validator.validateManifest(result.data);
            return {
                success: true,
                data: result.data,
                allErrors: [],
                validation: validationResult,
                metrics: {
                    attempts: result.attempts,
                    duration,
                    recoveryStrategy: result.recoveryStrategy,
                    errorsHandled: 0,
                },
                warnings: this.convertValidationWarnings(validationResult),
            };
        }
        else {
            const error = result.error || this.createGenericError(source);
            this.errorCollector.addError(error);
            return {
                success: false,
                error,
                allErrors: [error],
                metrics: {
                    attempts: result.attempts,
                    duration,
                    recoveryStrategy: result.recoveryStrategy,
                    errorsHandled: 1,
                },
                warnings: [],
            };
        }
    }
    convertLoadError(loadError) {
        if (loadError && typeof loadError === 'object' && 'code' in loadError) {
            const le = loadError;
            return {
                code: le.code,
                category: this.mapLoadErrorCategory(le.code),
                severity: 'error',
                technicalMessage: le.message,
                userMessage: this.createUserMessage(le.code, le.message),
                context: {
                    component: 'EnhancedManifestLoader',
                    operation: 'loadManifest',
                    metadata: le.context || {},
                },
                originalError: le.originalError,
                recoveryStrategies: this.getRecoveryStrategies(le.code),
                timestamp: new Date().toISOString(),
            };
        }
        else {
            return this.createEnhancedError(loadError, 'unknown-source', 1);
        }
    }
    createValidationError(validationResult) {
        const firstError = validationResult.errors[0];
        return {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            severity: 'error',
            technicalMessage: `Validation failed: ${firstError?.message || 'Unknown validation error'}`,
            userMessage: 'The manifest file contains invalid data.',
            context: {
                component: 'EnhancedManifestLoader',
                operation: 'validateManifest',
                metadata: {
                    errorCount: validationResult.errors.length,
                    warningCount: validationResult.warnings.length,
                    firstError: firstError,
                },
            },
            recoveryStrategies: ['prompt', 'abort'],
            timestamp: new Date().toISOString(),
        };
    }
    createEnhancedError(error, source, attempt) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            code: 'ENHANCED_LOADER_ERROR',
            category: 'system',
            severity: 'error',
            technicalMessage: `Enhanced loader error on attempt ${attempt}: ${message}`,
            userMessage: 'An error occurred while loading the manifest.',
            context: {
                component: 'EnhancedManifestLoader',
                operation: 'loadManifest',
                metadata: { source, attempt },
            },
            originalError: error instanceof Error ? error : undefined,
            recoveryStrategies: ['retry', 'fallback', 'abort'],
            timestamp: new Date().toISOString(),
        };
    }
    createGenericError(source) {
        return {
            code: 'OPERATION_FAILED',
            category: 'system',
            severity: 'error',
            technicalMessage: 'Operation failed without specific error',
            userMessage: 'The operation could not be completed.',
            context: {
                component: 'EnhancedManifestLoader',
                operation: 'processResult',
                metadata: { source },
            },
            recoveryStrategies: ['retry', 'abort'],
            timestamp: new Date().toISOString(),
        };
    }
    convertValidationWarnings(validationResult) {
        return validationResult.warnings.map(warning => ({
            code: 'VALIDATION_WARNING',
            category: 'validation',
            severity: 'warning',
            technicalMessage: warning.message,
            userMessage: 'There are minor issues with the manifest.',
            context: {
                component: 'EnhancedManifestLoader',
                operation: 'validateManifest',
                metadata: { field: warning.field },
            },
            recoveryStrategies: ['ignore', 'prompt'],
            timestamp: new Date().toISOString(),
        }));
    }
    mapLoadErrorCategory(code) {
        if (code.includes('FILE') || code.includes('DIRECTORY'))
            return 'filesystem';
        if (code.includes('HTTP') || code.includes('NETWORK'))
            return 'network';
        if (code.includes('PARSE') || code.includes('JSON'))
            return 'parsing';
        return 'system';
    }
    createUserMessage(code, technicalMessage) {
        switch (code) {
            case 'FILE_NOT_FOUND':
                return 'The manifest file could not be found.';
            case 'HTTP_ERROR':
                return 'Failed to download the manifest file.';
            case 'PARSE_ERROR':
                return 'The manifest file is not in a valid format.';
            default:
                return 'An error occurred while loading the manifest.';
        }
    }
    getRecoveryStrategies(code) {
        switch (code) {
            case 'HTTP_ERROR':
            case 'TIMEOUT_ERROR':
                return ['retry', 'fallback'];
            case 'FILE_NOT_FOUND':
                return ['fallback', 'prompt'];
            case 'PARSE_ERROR':
                return ['prompt', 'abort'];
            default:
                return ['retry', 'abort'];
        }
    }
    async logResults(result) {
        if (result.error) {
            await error_logging_1.defaultErrorLogger.logError(result.error, {
                metrics: result.metrics,
                allErrorsCount: result.allErrors.length,
            });
        }
        for (const warning of result.warnings) {
            await error_logging_1.defaultErrorLogger.logError(warning);
        }
        if (result.allErrors.length > 1) {
            await error_logging_1.defaultErrorLogger.log('warning', 'EnhancedManifestLoader', `Multiple errors encountered: ${result.allErrors.length} total`, { errorCodes: result.allErrors.map(e => e.code) });
        }
    }
}
exports.EnhancedManifestLoader = EnhancedManifestLoader;
/**
 * Default enhanced manifest loader instance
 */
exports.defaultEnhancedLoader = new EnhancedManifestLoader();
/**
 * Utility functions for enhanced loading
 */
exports.EnhancedLoaderUtils = {
    /**
     * Create configuration for development environment
     */
    createDevelopmentConfig(overrides = {}) {
        return {
            timeout: 10000,
            maxRetries: 2,
            enableLogging: true,
            enableRecovery: true,
            errorHandling: {
                enableCollection: true,
                maxCollectionSize: 100,
            },
            ...overrides,
        };
    },
    /**
     * Create configuration for production environment
     */
    createProductionConfig(overrides = {}) {
        return {
            timeout: 30000,
            maxRetries: 5,
            enableLogging: true,
            enableRecovery: true,
            errorHandling: {
                enableCollection: true,
                maxCollectionSize: 1000,
            },
            ...overrides,
        };
    },
    /**
     * Analyze load results for insights
     */
    analyzeResults(results) {
        const total = results.length;
        const successful = results.filter(r => r.success).length;
        const totalAttempts = results.reduce((sum, r) => sum + r.metrics.attempts, 0);
        const withRecovery = results.filter(r => r.metrics.recoveryStrategy).length;
        const errorCounts = new Map();
        results.forEach(r => {
            r.allErrors.forEach(e => {
                errorCounts.set(e.code, (errorCounts.get(e.code) || 0) + 1);
            });
        });
        const commonErrors = Array.from(errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([code]) => code);
        return {
            successRate: successful / total,
            avgAttempts: totalAttempts / total,
            commonErrors,
            recoveryEffectiveness: withRecovery / Math.max(total - successful, 1),
        };
    },
};
//# sourceMappingURL=enhanced-manifest-loader.js.map