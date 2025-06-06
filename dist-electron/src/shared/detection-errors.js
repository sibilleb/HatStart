"use strict";
/**
 * Detection Error Handling System
 * Centralized error types and categorization for system detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RETRY_OPTIONS = exports.ErrorRecovery = exports.DetectionError = exports.ErrorSeverity = exports.ErrorCategory = void 0;
exports.ErrorCategory = {
    COMMAND_EXECUTION: 'command_execution',
    FILESYSTEM_ACCESS: 'filesystem_access',
    REGISTRY_ACCESS: 'registry_access',
    NETWORK_ACCESS: 'network_access',
    TIMEOUT: 'timeout',
    PERMISSION_DENIED: 'permission_denied',
    PARSING_ERROR: 'parsing_error',
    CONFIGURATION_ERROR: 'configuration_error',
    SYSTEM_UNSUPPORTED: 'system_unsupported',
    UNKNOWN: 'unknown'
};
exports.ErrorSeverity = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};
class DetectionError extends Error {
    constructor(message, category, severity, context, options = {}) {
        super(message);
        this.name = 'DetectionError';
        this.category = category;
        this.severity = severity;
        this.context = context;
        this.isRetryable = options.isRetryable ?? this.determineRetryability(category);
        this.suggestedAction = options.suggestedAction;
        this.originalError = options.originalError;
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DetectionError);
        }
    }
    /**
     * Create a command execution error
     */
    static commandExecution(command, component, operation, originalError, platform) {
        return new DetectionError(`Command execution failed: ${command}`, exports.ErrorCategory.COMMAND_EXECUTION, exports.ErrorSeverity.MEDIUM, {
            component,
            operation,
            command,
            platform,
            timestamp: new Date(),
            metadata: { exitCode: originalError.message.includes('code') ? originalError.message : undefined }
        }, {
            originalError,
            isRetryable: true,
            suggestedAction: 'Check if the command exists and is accessible in the system PATH'
        });
    }
    /**
     * Create a filesystem access error
     */
    static filesystemAccess(filePath, component, operation, originalError) {
        return new DetectionError(`Filesystem access failed: ${filePath}`, exports.ErrorCategory.FILESYSTEM_ACCESS, exports.ErrorSeverity.LOW, {
            component,
            operation,
            filePath,
            timestamp: new Date()
        }, {
            originalError,
            isRetryable: false,
            suggestedAction: 'Verify the file path exists and permissions are correct'
        });
    }
    /**
     * Create a registry access error (Windows only)
     */
    static registryAccess(registryKey, component, operation, originalError) {
        return new DetectionError(`Registry access failed: ${registryKey}`, exports.ErrorCategory.REGISTRY_ACCESS, exports.ErrorSeverity.MEDIUM, {
            component,
            operation,
            registryKey,
            platform: 'windows',
            timestamp: new Date()
        }, {
            originalError,
            isRetryable: false,
            suggestedAction: 'Check registry permissions or try running with elevated privileges'
        });
    }
    /**
     * Create a timeout error
     */
    static timeout(operation, component, timeoutMs, command) {
        return new DetectionError(`Operation timed out after ${timeoutMs}ms: ${operation}`, exports.ErrorCategory.TIMEOUT, exports.ErrorSeverity.HIGH, {
            component,
            operation,
            command,
            timestamp: new Date(),
            metadata: { timeoutMs }
        }, {
            isRetryable: true,
            suggestedAction: 'Increase timeout value or check system performance'
        });
    }
    /**
     * Create a permission denied error
     */
    static permissionDenied(resource, component, operation) {
        return new DetectionError(`Permission denied accessing: ${resource}`, exports.ErrorCategory.PERMISSION_DENIED, exports.ErrorSeverity.HIGH, {
            component,
            operation,
            timestamp: new Date(),
            metadata: { resource }
        }, {
            isRetryable: false,
            suggestedAction: 'Run with elevated privileges or check resource permissions'
        });
    }
    /**
     * Create a parsing error
     */
    static parsing(data, component, operation, originalError) {
        return new DetectionError(`Failed to parse data: ${originalError.message}`, exports.ErrorCategory.PARSING_ERROR, exports.ErrorSeverity.MEDIUM, {
            component,
            operation,
            timestamp: new Date(),
            metadata: {
                dataSnippet: data.substring(0, 100) + (data.length > 100 ? '...' : ''),
                dataLength: data.length
            }
        }, {
            originalError,
            isRetryable: false,
            suggestedAction: 'Check data format and parsing logic'
        });
    }
    /**
     * Create an unsupported system error
     */
    static unsupportedSystem(platform, component, operation) {
        return new DetectionError(`Unsupported system: ${platform}`, exports.ErrorCategory.SYSTEM_UNSUPPORTED, exports.ErrorSeverity.HIGH, {
            component,
            operation,
            platform,
            timestamp: new Date()
        }, {
            isRetryable: false,
            suggestedAction: 'Add support for this platform or use alternative detection methods'
        });
    }
    /**
     * Create a network access error
     */
    static networkAccess(endpoint, component, operation, originalError) {
        return new DetectionError(`Network access failed: ${endpoint}`, exports.ErrorCategory.NETWORK_ACCESS, exports.ErrorSeverity.MEDIUM, {
            component,
            operation,
            timestamp: new Date(),
            metadata: { endpoint }
        }, {
            originalError,
            isRetryable: true,
            suggestedAction: 'Check network connectivity and endpoint availability'
        });
    }
    /**
     * Determine if an error category is generally retryable
     */
    determineRetryability(category) {
        const retryableCategories = [
            exports.ErrorCategory.COMMAND_EXECUTION,
            exports.ErrorCategory.NETWORK_ACCESS,
            exports.ErrorCategory.TIMEOUT
        ];
        return retryableCategories.includes(category);
    }
    /**
     * Convert error to a plain object for logging/serialization
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            category: this.category,
            severity: this.severity,
            context: this.context,
            isRetryable: this.isRetryable,
            suggestedAction: this.suggestedAction,
            stack: this.stack,
            originalError: this.originalError ? {
                name: this.originalError.name,
                message: this.originalError.message,
                stack: this.originalError.stack
            } : undefined
        };
    }
}
exports.DetectionError = DetectionError;
/**
 * Error recovery strategies
 */
class ErrorRecovery {
    /**
     * Attempt to recover from an error using fallback strategies
     */
    static async attemptRecovery(operation, fallbackStrategies, context) {
        try {
            return await operation();
        }
        catch (error) {
            const detectionError = error instanceof DetectionError ?
                error :
                new DetectionError(error instanceof Error ? error.message : String(error), exports.ErrorCategory.UNKNOWN, exports.ErrorSeverity.MEDIUM, context, { originalError: error instanceof Error ? error : undefined });
            // Try fallback strategies
            for (let i = 0; i < fallbackStrategies.length; i++) {
                try {
                    const result = await fallbackStrategies[i]();
                    return result;
                }
                catch {
                    // Continue to next fallback strategy
                    continue;
                }
            }
            // All strategies failed, throw the original error
            throw detectionError;
        }
    }
    /**
     * Execute operation with retry logic
     */
    static async withRetry(operation, options, context) {
        let lastError;
        let delay = options.delayMs;
        for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const detectionError = error instanceof DetectionError ?
                    error :
                    new DetectionError(lastError.message, exports.ErrorCategory.UNKNOWN, exports.ErrorSeverity.MEDIUM, context, { originalError: lastError });
                // Check if error is retryable
                const isRetryable = options.isRetryable ?
                    options.isRetryable(detectionError) :
                    detectionError.isRetryable;
                if (!isRetryable || attempt === options.maxAttempts) {
                    throw detectionError;
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay));
                // Exponential backoff
                delay = Math.min(delay * options.backoffMultiplier, options.maxDelayMs);
            }
        }
        throw lastError;
    }
}
exports.ErrorRecovery = ErrorRecovery;
/**
 * Default retry options for common scenarios
 */
exports.DEFAULT_RETRY_OPTIONS = {
    command: {
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 5000
    },
    network: {
        maxAttempts: 5,
        delayMs: 2000,
        backoffMultiplier: 1.5,
        maxDelayMs: 10000
    },
    filesystem: {
        maxAttempts: 2,
        delayMs: 500,
        backoffMultiplier: 2,
        maxDelayMs: 2000
    }
};
//# sourceMappingURL=detection-errors.js.map