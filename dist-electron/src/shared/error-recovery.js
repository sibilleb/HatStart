"use strict";
/**
 * HatStart Error Recovery System
 * Implements retry mechanisms, fallback strategies, and resilience patterns
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
exports.defaultErrorRecovery = exports.CommonRecoveryActions = exports.ErrorRecoveryOrchestrator = exports.CircuitBreaker = exports.RetryManager = void 0;
/**
 * Retry manager with advanced backoff strategies
 */
class RetryManager {
    constructor(defaultConfig) {
        this.defaultConfig = {
            maxAttempts: 3,
            initialDelay: 1000,
            backoffMultiplier: 2,
            maxDelay: 10000,
            useJitter: true,
            ...defaultConfig,
        };
    }
    /**
     * Execute operation with retry logic
     */
    async executeWithRetry(operation, config, errorFactory) {
        const retryConfig = { ...this.defaultConfig, ...config };
        const startTime = Date.now();
        let lastError;
        let attempts = 0;
        while (attempts < retryConfig.maxAttempts) {
            attempts++;
            try {
                const data = await operation();
                return {
                    success: true,
                    data,
                    attempts,
                    duration: Date.now() - startTime,
                };
            }
            catch (error) {
                const hatStartError = errorFactory
                    ? errorFactory(attempts, error instanceof Error ? error : undefined)
                    : this.createDefaultError(error, attempts);
                lastError = hatStartError;
                // Check if error is retryable
                if (!this.isRetryable(hatStartError) || attempts >= retryConfig.maxAttempts) {
                    break;
                }
                // Wait before retry
                const delay = this.calculateDelay(attempts, retryConfig);
                await this.delay(delay);
            }
        }
        return {
            success: false,
            error: lastError,
            attempts,
            duration: Date.now() - startTime,
        };
    }
    /**
     * Execute operation with fallback
     */
    async executeWithFallback(primaryOperation, fallbackStrategy, config) {
        // Try primary operation first
        const primaryResult = await this.executeWithRetry(primaryOperation, config);
        if (primaryResult.success) {
            return primaryResult;
        }
        // Execute fallback strategy
        try {
            const fallbackData = await fallbackStrategy(primaryResult.error);
            return {
                success: true,
                data: fallbackData,
                attempts: primaryResult.attempts,
                duration: primaryResult.duration,
                recoveryStrategy: 'fallback',
            };
        }
        catch (fallbackError) {
            const hatStartError = fallbackError instanceof Error
                ? this.createDefaultError(fallbackError, primaryResult.attempts + 1)
                : primaryResult.error;
            return {
                success: false,
                error: hatStartError,
                attempts: primaryResult.attempts + 1,
                duration: primaryResult.duration,
                recoveryStrategy: 'fallback',
            };
        }
    }
    /**
     * Check if error is retryable based on category and severity
     */
    isRetryable(error) {
        // Don't retry critical errors or user actions
        if (error.severity === 'critical' || error.category === 'user') {
            return false;
        }
        // Check if retry is in recovery strategies
        return error.recoveryStrategies.includes('retry');
    }
    /**
     * Calculate delay with exponential backoff and jitter
     */
    calculateDelay(attempt, config) {
        const baseDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        const clampedDelay = Math.min(baseDelay, config.maxDelay);
        if (config.useJitter) {
            // Add jitter to avoid thundering herd problem
            const jitter = Math.random() * 0.3; // 30% jitter
            return clampedDelay * (1 + jitter);
        }
        return clampedDelay;
    }
    /**
     * Delay execution
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Create default error for unknown error types
     */
    createDefaultError(error, attempt) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            code: 'UNKNOWN_ERROR',
            category: 'unknown',
            severity: 'error',
            technicalMessage: `Operation failed on attempt ${attempt}: ${message}`,
            userMessage: 'An unexpected error occurred.',
            context: {
                component: 'RetryManager',
                operation: 'executeWithRetry',
                metadata: { attempt },
            },
            originalError: error instanceof Error ? error : undefined,
            recoveryStrategies: ['retry', 'abort'],
            timestamp: new Date().toISOString(),
        };
    }
}
exports.RetryManager = RetryManager;
/**
 * Circuit breaker pattern implementation
 */
class CircuitBreaker {
    constructor(config) {
        this.state = 'closed';
        this.failures = 0;
        this.lastFailureTime = 0;
        this.successCount = 0;
        this.recentCalls = [];
        this.config = config;
    }
    /**
     * Execute operation through circuit breaker
     */
    async execute(operation) {
        this.cleanupOldCalls();
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
                this.state = 'half-open';
                this.successCount = 0;
            }
            else {
                throw new Error('Circuit breaker is open');
            }
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    /**
     * Get current circuit breaker state
     */
    getState() {
        return this.state;
    }
    /**
     * Get failure count
     */
    getFailureCount() {
        return this.failures;
    }
    /**
     * Reset circuit breaker
     */
    reset() {
        this.state = 'closed';
        this.failures = 0;
        this.lastFailureTime = 0;
        this.successCount = 0;
        this.recentCalls = [];
    }
    onSuccess() {
        this.recordCall(true);
        if (this.state === 'half-open') {
            this.successCount++;
            if (this.successCount >= this.config.successThreshold) {
                this.state = 'closed';
                this.failures = 0;
            }
        }
        else {
            this.failures = 0;
        }
    }
    onFailure() {
        this.recordCall(false);
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.state === 'closed' && this.failures >= this.config.failureThreshold) {
            this.state = 'open';
        }
        else if (this.state === 'half-open') {
            this.state = 'open';
        }
    }
    recordCall(success) {
        const now = Date.now();
        this.recentCalls.push({ timestamp: now, success });
    }
    cleanupOldCalls() {
        const cutoff = Date.now() - this.config.monitoringWindow;
        this.recentCalls = this.recentCalls.filter(call => call.timestamp > cutoff);
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Error recovery orchestrator
 */
class ErrorRecoveryOrchestrator {
    constructor(retryConfig) {
        this.circuitBreakers = new Map();
        this.recoveryActions = new Map();
        this.retryManager = new RetryManager(retryConfig);
    }
    /**
     * Register a circuit breaker for a service
     */
    registerCircuitBreaker(serviceName, config) {
        this.circuitBreakers.set(serviceName, new CircuitBreaker(config));
    }
    /**
     * Register a recovery action for an error code
     */
    registerRecoveryAction(errorCode, action) {
        this.recoveryActions.set(errorCode, action);
    }
    /**
     * Execute operation with full error recovery
     */
    async executeWithRecovery(operation, options = {}) {
        const { serviceName, retryConfig, fallback, errorFactory } = options;
        // Wrap operation with circuit breaker if service name provided
        const wrappedOperation = serviceName && this.circuitBreakers.has(serviceName)
            ? () => this.circuitBreakers.get(serviceName).execute(operation)
            : operation;
        // Execute with retry
        const result = await (fallback
            ? this.retryManager.executeWithFallback(wrappedOperation, fallback, retryConfig)
            : this.retryManager.executeWithRetry(wrappedOperation, retryConfig, errorFactory));
        // If operation failed, try recovery actions
        if (!result.success && result.error) {
            const recoveryResult = await this.attemptRecovery(result.error);
            if (recoveryResult.success && recoveryResult.shouldRetry) {
                // Retry operation after successful recovery
                return this.executeWithRecovery(operation, {
                    ...options,
                    retryConfig: {
                        ...retryConfig,
                        maxAttempts: 1 // Only one retry after recovery
                    }
                });
            }
        }
        return result;
    }
    /**
     * Attempt to recover from an error
     */
    async attemptRecovery(error) {
        const recoveryAction = this.recoveryActions.get(error.code);
        if (!recoveryAction) {
            return {
                success: false,
                shouldRetry: false,
            };
        }
        try {
            return await recoveryAction(error);
        }
        catch (recoveryError) {
            return {
                success: false,
                shouldRetry: false,
                error: recoveryError instanceof Error
                    ? this.createRecoveryError(recoveryError, error)
                    : error,
            };
        }
    }
    /**
     * Create error for recovery failures
     */
    createRecoveryError(recoveryError, originalError) {
        return {
            code: 'RECOVERY_FAILED',
            category: 'system',
            severity: 'error',
            technicalMessage: `Recovery failed for ${originalError.code}: ${recoveryError.message}`,
            userMessage: 'Automatic error recovery failed.',
            context: {
                component: 'ErrorRecoveryOrchestrator',
                operation: 'attemptRecovery',
                metadata: { originalErrorCode: originalError.code },
            },
            originalError: recoveryError,
            recoveryStrategies: ['abort'],
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Get circuit breaker status
     */
    getCircuitBreakerStatus(serviceName) {
        const circuitBreaker = this.circuitBreakers.get(serviceName);
        if (!circuitBreaker) {
            return null;
        }
        return {
            state: circuitBreaker.getState(),
            failures: circuitBreaker.getFailureCount(),
        };
    }
    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker(serviceName) {
        const circuitBreaker = this.circuitBreakers.get(serviceName);
        if (circuitBreaker) {
            circuitBreaker.reset();
            return true;
        }
        return false;
    }
}
exports.ErrorRecoveryOrchestrator = ErrorRecoveryOrchestrator;
/**
 * Common recovery actions
 */
exports.CommonRecoveryActions = {
    /**
     * Create cache directory recovery action
     */
    createCacheDirectory: (cachePath) => {
        return async () => {
            try {
                const { promises: fs } = await Promise.resolve().then(() => __importStar(require('fs')));
                await fs.mkdir(cachePath, { recursive: true });
                return {
                    success: true,
                    shouldRetry: true,
                };
            }
            catch {
                return {
                    success: false,
                    shouldRetry: false,
                };
            }
        };
    },
    /**
     * Fallback to alternative source
     */
    fallbackToAlternativeSource: (alternativeSource) => {
        return async () => {
            return {
                success: true,
                shouldRetry: true,
                modifiedParams: { source: alternativeSource },
            };
        };
    },
    /**
     * Clear cache and retry
     */
    clearCacheAndRetry: (cacheDir) => {
        return async () => {
            try {
                const { promises: fs } = await Promise.resolve().then(() => __importStar(require('fs')));
                const files = await fs.readdir(cacheDir);
                await Promise.all(files.map(file => fs.unlink(`${cacheDir}/${file}`).catch(() => { })));
                return {
                    success: true,
                    shouldRetry: true,
                };
            }
            catch {
                return {
                    success: false,
                    shouldRetry: false,
                };
            }
        };
    },
};
/**
 * Default error recovery orchestrator instance
 */
exports.defaultErrorRecovery = new ErrorRecoveryOrchestrator();
//# sourceMappingURL=error-recovery.js.map