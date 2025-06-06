/**
 * HatStart Error Recovery System
 * Implements retry mechanisms, fallback strategies, and resilience patterns
 */

import type {
    HatStartError,
    RecoveryStrategy,
    RetryConfig
} from './error-handling';

/**
 * Operation result with recovery information
 */
export interface OperationResult<T> {
  /** Whether operation succeeded */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error if failed */
  error?: HatStartError;
  /** Number of attempts made */
  attempts: number;
  /** Total time spent */
  duration: number;
  /** Recovery strategy used */
  recoveryStrategy?: RecoveryStrategy;
}

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold to open circuit */
  failureThreshold: number;
  /** Reset timeout in milliseconds */
  resetTimeout: number;
  /** Success threshold to close circuit in half-open state */
  successThreshold: number;
  /** Monitoring window in milliseconds */
  monitoringWindow: number;
}

/**
 * Fallback strategy function type
 */
export type FallbackStrategy<T> = (error: HatStartError) => Promise<T>;

/**
 * Operation function type for retry wrapper
 */
export type OperationFunction<T> = () => Promise<T>;

/**
 * Recovery action result
 */
export interface RecoveryActionResult {
  /** Whether recovery action succeeded */
  success: boolean;
  /** Should retry original operation */
  shouldRetry: boolean;
  /** Modified parameters for retry */
  modifiedParams?: Record<string, unknown>;
  /** Error if recovery failed */
  error?: HatStartError;
}

/**
 * Recovery action function type
 */
export type RecoveryAction = (error: HatStartError) => Promise<RecoveryActionResult>;

/**
 * Retry manager with advanced backoff strategies
 */
export class RetryManager {
  private defaultConfig: RetryConfig;

  constructor(defaultConfig?: Partial<RetryConfig>) {
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
  async executeWithRetry<T>(
    operation: OperationFunction<T>,
    config?: Partial<RetryConfig>,
    errorFactory?: (attempt: number, lastError?: Error) => HatStartError
  ): Promise<OperationResult<T>> {
    const retryConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    let lastError: HatStartError | undefined;
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
      } catch (error) {
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
  async executeWithFallback<T>(
    primaryOperation: OperationFunction<T>,
    fallbackStrategy: FallbackStrategy<T>,
    config?: Partial<RetryConfig>
  ): Promise<OperationResult<T>> {
    // Try primary operation first
    const primaryResult = await this.executeWithRetry(primaryOperation, config);
    
    if (primaryResult.success) {
      return primaryResult;
    }

    // Execute fallback strategy
    try {
      const fallbackData = await fallbackStrategy(primaryResult.error!);
      return {
        success: true,
        data: fallbackData,
        attempts: primaryResult.attempts,
        duration: primaryResult.duration,
        recoveryStrategy: 'fallback',
      };
    } catch (fallbackError) {
      const hatStartError = fallbackError instanceof Error 
        ? this.createDefaultError(fallbackError, primaryResult.attempts + 1)
        : primaryResult.error!;

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
  private isRetryable(error: HatStartError): boolean {
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
  private calculateDelay(attempt: number, config: RetryConfig): number {
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
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create default error for unknown error types
   */
  private createDefaultError(error: unknown, attempt: number): HatStartError {
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

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private recentCalls: Array<{ timestamp: number; success: boolean }> = [];

  private config: CircuitBreakerConfig;
  
  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: OperationFunction<T>): Promise<T> {
    this.cleanupOldCalls();

    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failures;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
    this.recentCalls = [];
  }

  private onSuccess(): void {
    this.recordCall(true);

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.recordCall(false);
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'closed' && this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    } else if (this.state === 'half-open') {
      this.state = 'open';
    }
  }

  private recordCall(success: boolean): void {
    const now = Date.now();
    this.recentCalls.push({ timestamp: now, success });
  }

  private cleanupOldCalls(): void {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.recentCalls = this.recentCalls.filter(call => call.timestamp > cutoff);
  }
}

/**
 * Error recovery orchestrator
 */
export class ErrorRecoveryOrchestrator {
  private retryManager: RetryManager;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private recoveryActions: Map<string, RecoveryAction> = new Map();

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryManager = new RetryManager(retryConfig);
  }

  /**
   * Register a circuit breaker for a service
   */
  registerCircuitBreaker(
    serviceName: string, 
    config: CircuitBreakerConfig
  ): void {
    this.circuitBreakers.set(serviceName, new CircuitBreaker(config));
  }

  /**
   * Register a recovery action for an error code
   */
  registerRecoveryAction(errorCode: string, action: RecoveryAction): void {
    this.recoveryActions.set(errorCode, action);
  }

  /**
   * Execute operation with full error recovery
   */
  async executeWithRecovery<T>(
    operation: OperationFunction<T>,
    options: {
      serviceName?: string;
      retryConfig?: Partial<RetryConfig>;
      fallback?: FallbackStrategy<T>;
      errorFactory?: (attempt: number, lastError?: Error) => HatStartError;
    } = {}
  ): Promise<OperationResult<T>> {
    const { serviceName, retryConfig, fallback, errorFactory } = options;

    // Wrap operation with circuit breaker if service name provided
    const wrappedOperation = serviceName && this.circuitBreakers.has(serviceName)
      ? () => this.circuitBreakers.get(serviceName)!.execute(operation)
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
     private async attemptRecovery(error: HatStartError): Promise<RecoveryActionResult> {
    const recoveryAction = this.recoveryActions.get(error.code);
    
    if (!recoveryAction) {
      return {
        success: false,
        shouldRetry: false,
      };
    }

    try {
      return await recoveryAction(error);
    } catch (recoveryError) {
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
  private createRecoveryError(
    recoveryError: Error, 
    originalError: HatStartError
  ): HatStartError {
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
  getCircuitBreakerStatus(serviceName: string): {
    state: CircuitBreakerState;
    failures: number;
  } | null {
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
  resetCircuitBreaker(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    
    if (circuitBreaker) {
      circuitBreaker.reset();
      return true;
    }
    
    return false;
  }
}

/**
 * Common recovery actions
 */
export const CommonRecoveryActions = {
  /**
   * Create cache directory recovery action
   */
  createCacheDirectory: (cachePath: string): RecoveryAction => {
    return async (): Promise<RecoveryActionResult> => {
      try {
        const { promises: fs } = await import('fs');
        await fs.mkdir(cachePath, { recursive: true });
        
        return {
          success: true,
          shouldRetry: true,
        };
             } catch {
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
  fallbackToAlternativeSource: (alternativeSource: string): RecoveryAction => {
    return async (): Promise<RecoveryActionResult> => {
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
  clearCacheAndRetry: (cacheDir: string): RecoveryAction => {
    return async (): Promise<RecoveryActionResult> => {
      try {
        const { promises: fs } = await import('fs');
        const files = await fs.readdir(cacheDir);
        
        await Promise.all(
          files.map(file => 
            fs.unlink(`${cacheDir}/${file}`).catch(() => {})
          )
        );
        
        return {
          success: true,
          shouldRetry: true,
        };
      } catch {
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
export const defaultErrorRecovery = new ErrorRecoveryOrchestrator(); 