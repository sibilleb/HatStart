/**
 * Detection Error Handling System
 * Centralized error types and categorization for system detection
 */

export const ErrorCategory = {
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
} as const;

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory];

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];

export interface ErrorContext {
  /** Component where error occurred */
  component: string;
  /** Operation being performed */
  operation: string;
  /** Platform where error occurred */
  platform?: string;
  /** Command that failed (if applicable) */
  command?: string;
  /** File path involved (if applicable) */
  filePath?: string;
  /** Registry key involved (if applicable) */
  registryKey?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp when error occurred */
  timestamp: Date;
}

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Delay between retries in milliseconds */
  delayMs: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
  /** Maximum delay cap in milliseconds */
  maxDelayMs: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: DetectionError) => boolean;
}

export class DetectionError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly suggestedAction?: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext,
    options: {
      isRetryable?: boolean;
      suggestedAction?: string;
      originalError?: Error;
    } = {}
  ) {
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
  public static commandExecution(
    command: string,
    component: string,
    operation: string,
    originalError: Error,
    platform?: string
  ): DetectionError {
    return new DetectionError(
      `Command execution failed: ${command}`,
      ErrorCategory.COMMAND_EXECUTION,
      ErrorSeverity.MEDIUM,
      {
        component,
        operation,
        command,
        platform,
        timestamp: new Date(),
        metadata: { exitCode: originalError.message.includes('code') ? originalError.message : undefined }
      },
      {
        originalError,
        isRetryable: true,
        suggestedAction: 'Check if the command exists and is accessible in the system PATH'
      }
    );
  }

  /**
   * Create a filesystem access error
   */
  public static filesystemAccess(
    filePath: string,
    component: string,
    operation: string,
    originalError: Error
  ): DetectionError {
    return new DetectionError(
      `Filesystem access failed: ${filePath}`,
      ErrorCategory.FILESYSTEM_ACCESS,
      ErrorSeverity.LOW,
      {
        component,
        operation,
        filePath,
        timestamp: new Date()
      },
      {
        originalError,
        isRetryable: false,
        suggestedAction: 'Verify the file path exists and permissions are correct'
      }
    );
  }

  /**
   * Create a registry access error (Windows only)
   */
  public static registryAccess(
    registryKey: string,
    component: string,
    operation: string,
    originalError: Error
  ): DetectionError {
    return new DetectionError(
      `Registry access failed: ${registryKey}`,
      ErrorCategory.REGISTRY_ACCESS,
      ErrorSeverity.MEDIUM,
      {
        component,
        operation,
        registryKey,
        platform: 'windows',
        timestamp: new Date()
      },
      {
        originalError,
        isRetryable: false,
        suggestedAction: 'Check registry permissions or try running with elevated privileges'
      }
    );
  }

  /**
   * Create a timeout error
   */
  public static timeout(
    operation: string,
    component: string,
    timeoutMs: number,
    command?: string
  ): DetectionError {
    return new DetectionError(
      `Operation timed out after ${timeoutMs}ms: ${operation}`,
      ErrorCategory.TIMEOUT,
      ErrorSeverity.HIGH,
      {
        component,
        operation,
        command,
        timestamp: new Date(),
        metadata: { timeoutMs }
      },
      {
        isRetryable: true,
        suggestedAction: 'Increase timeout value or check system performance'
      }
    );
  }

  /**
   * Create a permission denied error
   */
  public static permissionDenied(
    resource: string,
    component: string,
    operation: string
  ): DetectionError {
    return new DetectionError(
      `Permission denied accessing: ${resource}`,
      ErrorCategory.PERMISSION_DENIED,
      ErrorSeverity.HIGH,
      {
        component,
        operation,
        timestamp: new Date(),
        metadata: { resource }
      },
      {
        isRetryable: false,
        suggestedAction: 'Run with elevated privileges or check resource permissions'
      }
    );
  }

  /**
   * Create a parsing error
   */
  public static parsing(
    data: string,
    component: string,
    operation: string,
    originalError: Error
  ): DetectionError {
    return new DetectionError(
      `Failed to parse data: ${originalError.message}`,
      ErrorCategory.PARSING_ERROR,
      ErrorSeverity.MEDIUM,
      {
        component,
        operation,
        timestamp: new Date(),
        metadata: { 
          dataSnippet: data.substring(0, 100) + (data.length > 100 ? '...' : ''),
          dataLength: data.length
        }
      },
      {
        originalError,
        isRetryable: false,
        suggestedAction: 'Check data format and parsing logic'
      }
    );
  }

  /**
   * Create an unsupported system error
   */
  public static unsupportedSystem(
    platform: string,
    component: string,
    operation: string
  ): DetectionError {
    return new DetectionError(
      `Unsupported system: ${platform}`,
      ErrorCategory.SYSTEM_UNSUPPORTED,
      ErrorSeverity.HIGH,
      {
        component,
        operation,
        platform,
        timestamp: new Date()
      },
      {
        isRetryable: false,
        suggestedAction: 'Add support for this platform or use alternative detection methods'
      }
    );
  }

  /**
   * Create a network access error
   */
  public static networkAccess(
    endpoint: string,
    component: string,
    operation: string,
    originalError: Error
  ): DetectionError {
    return new DetectionError(
      `Network access failed: ${endpoint}`,
      ErrorCategory.NETWORK_ACCESS,
      ErrorSeverity.MEDIUM,
      {
        component,
        operation,
        timestamp: new Date(),
        metadata: { endpoint }
      },
      {
        originalError,
        isRetryable: true,
        suggestedAction: 'Check network connectivity and endpoint availability'
      }
    );
  }

  /**
   * Determine if an error category is generally retryable
   */
  private determineRetryability(category: ErrorCategory): boolean {
    const retryableCategories: ErrorCategory[] = [
      ErrorCategory.COMMAND_EXECUTION,
      ErrorCategory.NETWORK_ACCESS,
      ErrorCategory.TIMEOUT
    ];
    return retryableCategories.includes(category);
  }

  /**
   * Convert error to a plain object for logging/serialization
   */
  public toJSON(): Record<string, unknown> {
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

/**
 * Error recovery strategies
 */
export class ErrorRecovery {
  /**
   * Attempt to recover from an error using fallback strategies
   */
  public static async attemptRecovery<T>(
    operation: () => Promise<T>,
    fallbackStrategies: Array<() => Promise<T>>,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const detectionError = error instanceof DetectionError ? 
        error : 
        new DetectionError(
          error instanceof Error ? error.message : String(error),
          ErrorCategory.UNKNOWN,
          ErrorSeverity.MEDIUM,
          context,
          { originalError: error instanceof Error ? error : undefined }
        );

      // Try fallback strategies
      for (let i = 0; i < fallbackStrategies.length; i++) {
        try {
          const result = await fallbackStrategies[i]();
          return result;
        } catch {
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
  public static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    context: ErrorContext
  ): Promise<T> {
    let lastError: Error;
    let delay = options.delayMs;

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const detectionError = error instanceof DetectionError ? 
          error : 
          new DetectionError(
            lastError.message,
            ErrorCategory.UNKNOWN,
            ErrorSeverity.MEDIUM,
            context,
            { originalError: lastError }
          );

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

    throw lastError!;
  }
}

/**
 * Default retry options for common scenarios
 */
export const DEFAULT_RETRY_OPTIONS: Record<string, RetryOptions> = {
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