/**
 * HatStart Error Handling System
 * Comprehensive error management with classification, recovery, and user-friendly messaging
 */

import type { LoadError } from './manifest-loader';
import type { ExtendedValidationError } from './manifest-validator';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * Error categories for classification
 */
export type ErrorCategory = 
  | 'filesystem'
  | 'network'
  | 'validation'
  | 'parsing'
  | 'permission'
  | 'configuration'
  | 'system'
  | 'user'
  | 'unknown';

/**
 * Error recovery strategy
 */
export type RecoveryStrategy = 
  | 'retry'
  | 'fallback'
  | 'skip'
  | 'prompt'
  | 'abort'
  | 'ignore';

/**
 * Enhanced error interface with comprehensive context
 */
export interface HatStartError {
  /** Unique error code for programmatic handling */
  code: string;
  /** Error category for classification */
  category: ErrorCategory;
  /** Severity level */
  severity: ErrorSeverity;
  /** Technical error message for developers/logs */
  technicalMessage: string;
  /** User-friendly message for display */
  userMessage: string;
  /** Detailed context information */
  context: ErrorContext;
  /** Original error if wrapped */
  originalError?: Error;
  /** Suggested recovery strategies */
  recoveryStrategies: RecoveryStrategy[];
  /** Timestamp when error occurred */
  timestamp: string;
  /** Stack trace for debugging */
  stack?: string;
}

/**
 * Error context information
 */
export interface ErrorContext {
  /** Component where error occurred */
  component: string;
  /** Operation being performed */
  operation: string;
  /** Resource being accessed (file path, URL, etc.) */
  resource?: string;
  /** Additional contextual data */
  metadata?: Record<string, unknown>;
  /** User session information */
  session?: {
    userId?: string;
    sessionId?: string;
    userAgent?: string;
  };
}

/**
 * Error aggregation for bulk operations
 */
export interface ErrorCollection {
  /** List of errors */
  errors: HatStartError[];
  /** Summary statistics */
  summary: {
    total: number;
    critical: number;
    errors: number;
    warnings: number;
    info: number;
  };
  /** Overall operation status */
  overallSeverity: ErrorSeverity;
  /** Whether operation can continue */
  canContinue: boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Whether to use jitter */
  useJitter: boolean;
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  /** Whether to log errors */
  enableLogging: boolean;
  /** Log level threshold */
  logLevel: ErrorSeverity;
  /** Whether to show user notifications */
  showUserNotifications: boolean;
  /** Default retry configuration */
  defaultRetry: RetryConfig;
  /** Maximum errors to collect before aborting */
  maxErrorsInCollection: number;
}

/**
 * Default error handling configuration
 */
const DEFAULT_ERROR_CONFIG: ErrorHandlingConfig = {
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
export const ERROR_CODES = {
  // Filesystem errors
  FILE_NOT_FOUND: {
    category: 'filesystem' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'The requested file could not be found.',
    recoveryStrategies: ['retry', 'prompt', 'abort'] as RecoveryStrategy[],
  },
  FILE_PERMISSION_DENIED: {
    category: 'permission' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'You do not have permission to access this file.',
    recoveryStrategies: ['prompt', 'abort'] as RecoveryStrategy[],
  },
  FILE_TOO_LARGE: {
    category: 'filesystem' as ErrorCategory,
    severity: 'warning' as ErrorSeverity,
    userMessage: 'The file is too large to process.',
    recoveryStrategies: ['skip', 'abort'] as RecoveryStrategy[],
  },
  
  // Network errors
  NETWORK_TIMEOUT: {
    category: 'network' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'The network request timed out.',
    recoveryStrategies: ['retry', 'fallback', 'abort'] as RecoveryStrategy[],
  },
  NETWORK_UNAVAILABLE: {
    category: 'network' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'Network connection is unavailable.',
    recoveryStrategies: ['retry', 'prompt', 'abort'] as RecoveryStrategy[],
  },
  HTTP_ERROR: {
    category: 'network' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'Server responded with an error.',
    recoveryStrategies: ['retry', 'fallback', 'abort'] as RecoveryStrategy[],
  },
  
  // Parsing errors
  INVALID_JSON: {
    category: 'parsing' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'The file contains invalid JSON data.',
    recoveryStrategies: ['skip', 'prompt', 'abort'] as RecoveryStrategy[],
  },
  INVALID_YAML: {
    category: 'parsing' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'The file contains invalid YAML data.',
    recoveryStrategies: ['skip', 'prompt', 'abort'] as RecoveryStrategy[],
  },
  UNSUPPORTED_FORMAT: {
    category: 'parsing' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'The file format is not supported.',
    recoveryStrategies: ['skip', 'abort'] as RecoveryStrategy[],
  },
  
  // Validation errors
  VALIDATION_FAILED: {
    category: 'validation' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'The data does not meet the required format.',
    recoveryStrategies: ['skip', 'prompt', 'abort'] as RecoveryStrategy[],
  },
  MISSING_REQUIRED_FIELD: {
    category: 'validation' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'A required field is missing from the data.',
    recoveryStrategies: ['skip', 'prompt', 'abort'] as RecoveryStrategy[],
  },
  INVALID_FIELD_TYPE: {
    category: 'validation' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'A field contains an invalid data type.',
    recoveryStrategies: ['skip', 'prompt', 'abort'] as RecoveryStrategy[],
  },
  
  // System errors
  SYSTEM_ERROR: {
    category: 'system' as ErrorCategory,
    severity: 'critical' as ErrorSeverity,
    userMessage: 'A system error occurred.',
    recoveryStrategies: ['retry', 'abort'] as RecoveryStrategy[],
  },
  OUT_OF_MEMORY: {
    category: 'system' as ErrorCategory,
    severity: 'critical' as ErrorSeverity,
    userMessage: 'The system is running out of memory.',
    recoveryStrategies: ['abort'] as RecoveryStrategy[],
  },
  
  // Configuration errors
  INVALID_CONFIG: {
    category: 'configuration' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'The configuration is invalid.',
    recoveryStrategies: ['prompt', 'fallback', 'abort'] as RecoveryStrategy[],
  },
  
  // User errors
  USER_CANCELLED: {
    category: 'user' as ErrorCategory,
    severity: 'info' as ErrorSeverity,
    userMessage: 'Operation was cancelled by user.',
    recoveryStrategies: ['abort'] as RecoveryStrategy[],
  },
  
  // Unknown errors
  UNKNOWN_ERROR: {
    category: 'unknown' as ErrorCategory,
    severity: 'error' as ErrorSeverity,
    userMessage: 'An unexpected error occurred.',
    recoveryStrategies: ['retry', 'abort'] as RecoveryStrategy[],
  },
} as const;

/**
 * Error factory for creating standardized errors
 */
export class ErrorFactory {
  private config: ErrorHandlingConfig;

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_CONFIG, ...config };
  }

  /**
   * Create a HatStart error from a code and context
   */
  createError(
    code: keyof typeof ERROR_CODES,
    context: ErrorContext,
    technicalMessage?: string,
    originalError?: Error
  ): HatStartError {
    const errorDef = ERROR_CODES[code];
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
  createFromLoadError(loadError: LoadError, context: ErrorContext): HatStartError {
    // Map LoadError codes to HatStartError codes
    const codeMap: Record<string, keyof typeof ERROR_CODES> = {
      'NOT_FOUND_ERROR': 'FILE_NOT_FOUND',
      'PERMISSION_ERROR': 'FILE_PERMISSION_DENIED',
      'SIZE_ERROR': 'FILE_TOO_LARGE',
      'TIMEOUT_ERROR': 'NETWORK_TIMEOUT',
      'HTTP_ERROR': 'HTTP_ERROR',
      'PARSE_ERROR': 'INVALID_JSON',
    };

    const mappedCode = codeMap[loadError.code] || 'UNKNOWN_ERROR';
    
    return this.createError(
      mappedCode,
      context,
      loadError.message,
      loadError.originalError
    );
  }

  /**
   * Create error from validation error
   */
  createFromValidationError(
    validationError: ExtendedValidationError,
    context: ErrorContext
  ): HatStartError {
    const codeMap: Record<string, keyof typeof ERROR_CODES> = {
      'MISSING_REQUIRED': 'MISSING_REQUIRED_FIELD',
      'INVALID_TYPE': 'INVALID_FIELD_TYPE',
      'VALIDATION_ERROR': 'VALIDATION_FAILED',
    };

    const mappedCode = codeMap[validationError.code] || 'VALIDATION_FAILED';
    
    return this.createError(
      mappedCode,
      {
        ...context,
        metadata: {
          ...context.metadata,
          field: validationError.field,
          value: validationError.value,
        },
      },
      validationError.message
    );
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorHandlingConfig {
    return { ...this.config };
  }
}

/**
 * Error collection manager for bulk operations
 */
export class ErrorCollectionManager {
  private errors: HatStartError[] = [];
  private maxErrors: number;

  constructor(maxErrors = 100) {
    this.maxErrors = maxErrors;
  }

  /**
   * Add an error to the collection
   */
  addError(error: HatStartError): boolean {
    if (this.errors.length >= this.maxErrors) {
      return false; // Collection is full
    }

    this.errors.push(error);
    return true;
  }

  /**
   * Add multiple errors
   */
  addErrors(errors: HatStartError[]): number {
    let added = 0;
    for (const error of errors) {
      if (this.addError(error)) {
        added++;
      } else {
        break; // Collection is full
      }
    }
    return added;
  }

  /**
   * Get error collection
   */
  getCollection(): ErrorCollection {
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
  clear(): void {
    this.errors = [];
  }

  /**
   * Check if collection is full
   */
  isFull(): boolean {
    return this.errors.length >= this.maxErrors;
  }

  /**
   * Filter errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): HatStartError[] {
    return this.errors.filter(error => error.severity === severity);
  }

  /**
   * Filter errors by category
   */
  getErrorsByCategory(category: ErrorCategory): HatStartError[] {
    return this.errors.filter(error => error.category === category);
  }

  private calculateSummary() {
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

  private determineOverallSeverity(): ErrorSeverity {
    if (this.errors.some(e => e.severity === 'critical')) return 'critical';
    if (this.errors.some(e => e.severity === 'error')) return 'error';
    if (this.errors.some(e => e.severity === 'warning')) return 'warning';
    return 'info';
  }

  private canOperationContinue(): boolean {
    return !this.errors.some(e => e.severity === 'critical');
  }
}

/**
 * Default error factory instance
 */
export const defaultErrorFactory = new ErrorFactory();

/**
 * Error utilities and formatters
 */
export const ErrorUtils = {
  formatForUser(error: HatStartError): string {
    return error.userMessage || error.technicalMessage;
  },

  formatForLog(error: HatStartError): string {
    return `[${error.code}] ${error.technicalMessage} (${error.category}/${error.severity})`;
  },

  isRecoverable(error: HatStartError): boolean {
    return error.recoveryStrategies.length > 0 && 
           !error.recoveryStrategies.includes('abort');
  },

  getSuggestedRecovery(error: HatStartError): RecoveryStrategy | null {
    return error.recoveryStrategies[0] || null;
  },

  createErrorSummary(collection: ErrorCollection): string {
    const { summary } = collection;
    return `${summary.total} errors: ${summary.critical} critical, ${summary.errors} errors, ${summary.warnings} warnings`;
  },
};

/**
 * Default error factory instance
 */
export const defaultErrorHandler = new ErrorFactory();

/**
 * Error collection manager alias for convenience  
 */
export const ErrorCollector = ErrorCollectionManager;
