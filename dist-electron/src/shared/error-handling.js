"use strict";
/**
 * HatStart Error Handling System
 * Comprehensive error management with classification, recovery, and user-friendly messaging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCollector = exports.defaultErrorHandler = exports.ErrorUtils = exports.defaultErrorFactory = exports.ErrorCollectionManager = exports.ErrorFactory = exports.ERROR_CODES = void 0;
/**
 * Default error handling configuration
 */
const DEFAULT_ERROR_CONFIG = {
    enableLogging: true,
    logLevel: 'warning',
    showUserNotifications: true,
    defaultRetry: {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        useJitter: true,
    },
    maxErrorsInCollection: 100,
};
/**
 * Error code definitions with metadata
 */
exports.ERROR_CODES = {
    // Filesystem errors
    FILE_NOT_FOUND: {
        category: 'filesystem',
        severity: 'error',
        userMessage: 'The requested file could not be found.',
        recoveryStrategies: ['retry', 'prompt', 'abort'],
    },
    FILE_PERMISSION_DENIED: {
        category: 'permission',
        severity: 'error',
        userMessage: 'You do not have permission to access this file.',
        recoveryStrategies: ['prompt', 'abort'],
    },
    FILE_TOO_LARGE: {
        category: 'filesystem',
        severity: 'warning',
        userMessage: 'The file is too large to process.',
        recoveryStrategies: ['skip', 'abort'],
    },
    // Network errors
    NETWORK_TIMEOUT: {
        category: 'network',
        severity: 'error',
        userMessage: 'The network request timed out.',
        recoveryStrategies: ['retry', 'fallback', 'abort'],
    },
    NETWORK_UNAVAILABLE: {
        category: 'network',
        severity: 'error',
        userMessage: 'Network connection is unavailable.',
        recoveryStrategies: ['retry', 'prompt', 'abort'],
    },
    HTTP_ERROR: {
        category: 'network',
        severity: 'error',
        userMessage: 'Server responded with an error.',
        recoveryStrategies: ['retry', 'fallback', 'abort'],
    },
    // Parsing errors
    INVALID_JSON: {
        category: 'parsing',
        severity: 'error',
        userMessage: 'The file contains invalid JSON data.',
        recoveryStrategies: ['skip', 'prompt', 'abort'],
    },
    INVALID_YAML: {
        category: 'parsing',
        severity: 'error',
        userMessage: 'The file contains invalid YAML data.',
        recoveryStrategies: ['skip', 'prompt', 'abort'],
    },
    UNSUPPORTED_FORMAT: {
        category: 'parsing',
        severity: 'error',
        userMessage: 'The file format is not supported.',
        recoveryStrategies: ['skip', 'abort'],
    },
    // Validation errors
    VALIDATION_FAILED: {
        category: 'validation',
        severity: 'error',
        userMessage: 'The data does not meet the required format.',
        recoveryStrategies: ['skip', 'prompt', 'abort'],
    },
    MISSING_REQUIRED_FIELD: {
        category: 'validation',
        severity: 'error',
        userMessage: 'A required field is missing from the data.',
        recoveryStrategies: ['skip', 'prompt', 'abort'],
    },
    INVALID_FIELD_TYPE: {
        category: 'validation',
        severity: 'error',
        userMessage: 'A field contains an invalid data type.',
        recoveryStrategies: ['skip', 'prompt', 'abort'],
    },
    // System errors
    SYSTEM_ERROR: {
        category: 'system',
        severity: 'critical',
        userMessage: 'A system error occurred.',
        recoveryStrategies: ['retry', 'abort'],
    },
    OUT_OF_MEMORY: {
        category: 'system',
        severity: 'critical',
        userMessage: 'The system is running out of memory.',
        recoveryStrategies: ['abort'],
    },
    // Configuration errors
    INVALID_CONFIG: {
        category: 'configuration',
        severity: 'error',
        userMessage: 'The configuration is invalid.',
        recoveryStrategies: ['prompt', 'fallback', 'abort'],
    },
    // User errors
    USER_CANCELLED: {
        category: 'user',
        severity: 'info',
        userMessage: 'Operation was cancelled by user.',
        recoveryStrategies: ['abort'],
    },
    // Unknown errors
    UNKNOWN_ERROR: {
        category: 'unknown',
        severity: 'error',
        userMessage: 'An unexpected error occurred.',
        recoveryStrategies: ['retry', 'abort'],
    },
};
/**
 * Error factory for creating standardized errors
 */
class ErrorFactory {
    constructor(config = {}) {
        this.config = { ...DEFAULT_ERROR_CONFIG, ...config };
    }
    /**
     * Create a HatStart error from a code and context
     */
    createError(code, context, technicalMessage, originalError) {
        const errorDef = exports.ERROR_CODES[code];
        const timestamp = new Date().toISOString();
        return {
            code,
            category: errorDef.category,
            severity: errorDef.severity,
            technicalMessage: technicalMessage || `Error ${code} in ${context.component}`,
            userMessage: errorDef.userMessage,
            context,
            originalError,
            recoveryStrategies: errorDef.recoveryStrategies,
            timestamp,
            stack: originalError?.stack || new Error().stack,
        };
    }
    /**
     * Create error from LoadError
     */
    createFromLoadError(loadError, context) {
        // Map LoadError codes to HatStartError codes
        const codeMap = {
            'NOT_FOUND_ERROR': 'FILE_NOT_FOUND',
            'PERMISSION_ERROR': 'FILE_PERMISSION_DENIED',
            'SIZE_ERROR': 'FILE_TOO_LARGE',
            'TIMEOUT_ERROR': 'NETWORK_TIMEOUT',
            'HTTP_ERROR': 'HTTP_ERROR',
            'PARSE_ERROR': 'INVALID_JSON',
        };
        const mappedCode = codeMap[loadError.code] || 'UNKNOWN_ERROR';
        return this.createError(mappedCode, context, loadError.message, loadError.originalError);
    }
    /**
     * Create error from validation error
     */
    createFromValidationError(validationError, context) {
        const codeMap = {
            'MISSING_REQUIRED': 'MISSING_REQUIRED_FIELD',
            'INVALID_TYPE': 'INVALID_FIELD_TYPE',
            'VALIDATION_ERROR': 'VALIDATION_FAILED',
        };
        const mappedCode = codeMap[validationError.code] || 'VALIDATION_FAILED';
        return this.createError(mappedCode, {
            ...context,
            metadata: {
                ...context.metadata,
                field: validationError.field,
                value: validationError.value,
            },
        }, validationError.message);
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.ErrorFactory = ErrorFactory;
/**
 * Error collection manager for bulk operations
 */
class ErrorCollectionManager {
    constructor(maxErrors = 100) {
        this.errors = [];
        this.maxErrors = maxErrors;
    }
    /**
     * Add an error to the collection
     */
    addError(error) {
        if (this.errors.length >= this.maxErrors) {
            return false; // Collection is full
        }
        this.errors.push(error);
        return true;
    }
    /**
     * Add multiple errors
     */
    addErrors(errors) {
        let added = 0;
        for (const error of errors) {
            if (this.addError(error)) {
                added++;
            }
            else {
                break; // Collection is full
            }
        }
        return added;
    }
    /**
     * Get error collection
     */
    getCollection() {
        const summary = this.calculateSummary();
        return {
            errors: [...this.errors],
            summary,
            overallSeverity: this.determineOverallSeverity(),
            canContinue: this.canOperationContinue(),
        };
    }
    /**
     * Clear all errors
     */
    clear() {
        this.errors = [];
    }
    /**
     * Check if collection is full
     */
    isFull() {
        return this.errors.length >= this.maxErrors;
    }
    /**
     * Filter errors by severity
     */
    getErrorsBySeverity(severity) {
        return this.errors.filter(error => error.severity === severity);
    }
    /**
     * Filter errors by category
     */
    getErrorsByCategory(category) {
        return this.errors.filter(error => error.category === category);
    }
    calculateSummary() {
        const summary = {
            total: this.errors.length,
            critical: 0,
            errors: 0,
            warnings: 0,
            info: 0,
        };
        for (const error of this.errors) {
            switch (error.severity) {
                case 'critical':
                    summary.critical++;
                    break;
                case 'error':
                    summary.errors++;
                    break;
                case 'warning':
                    summary.warnings++;
                    break;
                case 'info':
                    summary.info++;
                    break;
            }
        }
        return summary;
    }
    determineOverallSeverity() {
        if (this.errors.some(e => e.severity === 'critical'))
            return 'critical';
        if (this.errors.some(e => e.severity === 'error'))
            return 'error';
        if (this.errors.some(e => e.severity === 'warning'))
            return 'warning';
        return 'info';
    }
    canOperationContinue() {
        return !this.errors.some(e => e.severity === 'critical');
    }
}
exports.ErrorCollectionManager = ErrorCollectionManager;
/**
 * Default error factory instance
 */
exports.defaultErrorFactory = new ErrorFactory();
/**
 * Error utilities and formatters
 */
exports.ErrorUtils = {
    formatForUser(error) {
        return error.userMessage || error.technicalMessage;
    },
    formatForLog(error) {
        return `[${error.code}] ${error.technicalMessage} (${error.category}/${error.severity})`;
    },
    isRecoverable(error) {
        return error.recoveryStrategies.length > 0 &&
            !error.recoveryStrategies.includes('abort');
    },
    getSuggestedRecovery(error) {
        return error.recoveryStrategies[0] || null;
    },
    createErrorSummary(collection) {
        const { summary } = collection;
        return `${summary.total} errors: ${summary.critical} critical, ${summary.errors} errors, ${summary.warnings} warnings`;
    },
};
/**
 * Default error factory instance
 */
exports.defaultErrorHandler = new ErrorFactory();
/**
 * Error collection manager alias for convenience
 */
exports.ErrorCollector = ErrorCollectionManager;
//# sourceMappingURL=error-handling.js.map