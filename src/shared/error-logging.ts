/**
 * HatStart Error Logging and Monitoring System
 * Comprehensive logging, monitoring, and analytics for error tracking
 */

import type {
    ErrorCategory,
    ErrorCollection,
    ErrorSeverity,
    HatStartError
} from './error-handling';

/**
 * Log levels for controlling output
 */
export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

/**
 * Log entry interface
 */
export interface LogEntry {
  /** Unique log entry ID */
  id: string;
  /** Timestamp when log was created */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Component that generated the log */
  component: string;
  /** Log message */
  message: string;
  /** Additional data */
  data?: Record<string, unknown>;
  /** Associated error if applicable */
  error?: HatStartError;
  /** User session context */
  session?: {
    userId?: string;
    sessionId?: string;
  };
}

/**
 * Log transport interface for different outputs
 */
export interface LogTransport {
  /** Transport name */
  name: string;
  /** Minimum log level to handle */
  level: LogLevel;
  /** Write log entry */
  write(entry: LogEntry): Promise<void>;
  /** Close transport */
  close?(): Promise<void>;
}

/**
 * Error metrics interface
 */
export interface ErrorMetrics {
  /** Total error count */
  totalErrors: number;
  /** Errors by severity */
  bySeverity: Record<ErrorSeverity, number>;
  /** Errors by category */
  byCategory: Record<ErrorCategory, number>;
  /** Errors by component */
  byComponent: Record<string, number>;
  /** Error rate (errors per minute) */
  errorRate: number;
  /** Time range for metrics */
  timeRange: {
    start: string;
    end: string;
  };
}

/**
 * Error pattern interface for analytics
 */
export interface ErrorPattern {
  /** Pattern ID */
  id: string;
  /** Error code or pattern */
  pattern: string;
  /** Number of occurrences */
  count: number;
  /** First occurrence */
  firstSeen: string;
  /** Last occurrence */
  lastSeen: string;
  /** Affected components */
  components: string[];
  /** Suggested actions */
  suggestedActions: string[];
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level */
  level: LogLevel;
  /** Enable console output */
  enableConsole: boolean;
  /** Enable file logging */
  enableFile: boolean;
  /** Log file path */
  logFilePath?: string;
  /** Maximum log file size in bytes */
  maxFileSize: number;
  /** Number of backup files to keep */
  maxBackupFiles: number;
  /** Enable error reporting */
  enableErrorReporting: boolean;
  /** Enable metrics collection */
  enableMetrics: boolean;
  /** Metrics retention period in milliseconds */
  metricsRetention: number;
}

/**
 * Default logger configuration
 */
const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: 'info',
  enableConsole: true,
  enableFile: true,
  logFilePath: '.hatstart/logs/error.log',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxBackupFiles: 5,
  enableErrorReporting: true,
  enableMetrics: true,
  metricsRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Log level priority mapping
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
  critical: 4,
};

/**
 * Console log transport
 */
export class ConsoleTransport implements LogTransport {
  name = 'console';
  level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  async write(entry: LogEntry): Promise<void> {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const levelStr = entry.level.toUpperCase().padStart(8);
    const component = entry.component.padEnd(20);
    
    const message = `${timestamp} [${levelStr}] ${component} ${entry.message}`;
    
    switch (entry.level) {
      case 'critical':
      case 'error':
        console.error(message, entry.data || '');
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
      case 'warning':
        console.warn(message, entry.data || '');
        break;
      case 'debug':
        console.debug(message, entry.data || '');
        break;
      default:
        console.log(message, entry.data || '');
    }
  }
}

/**
 * File log transport
 */
export class FileTransport implements LogTransport {
  name = 'file';
  level: LogLevel;
  private filePath: string;
  private maxSize: number;
  private maxBackups: number;

  constructor(
    filePath: string,
    level: LogLevel = 'info',
    maxSize = 10 * 1024 * 1024,
    maxBackups = 5
  ) {
    this.level = level;
    this.filePath = filePath;
    this.maxSize = maxSize;
    this.maxBackups = maxBackups;
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      const { dirname } = await import('path');
      
      // Ensure log directory exists
      await fs.mkdir(dirname(this.filePath), { recursive: true });
      
      // Check file size and rotate if needed
      await this.rotateIfNeeded();
      
      // Format log entry
      const logLine = JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level,
        component: entry.component,
        message: entry.message,
        data: entry.data,
        error: entry.error ? {
          code: entry.error.code,
          category: entry.error.category,
          severity: entry.error.severity,
          message: entry.error.technicalMessage,
          stack: entry.error.stack,
        } : undefined,
        session: entry.session,
      }) + '\n';
      
      // Append to log file
      await fs.appendFile(this.filePath, logLine, 'utf8');
    } catch (error) {
      // Fallback to console if file logging fails
      console.error('Failed to write to log file:', error);
      console.error('Original log entry:', entry);
    }
  }

  async close(): Promise<void> {
    // No cleanup needed for file transport
  }

  private async rotateIfNeeded(): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      
      try {
        const stats = await fs.stat(this.filePath);
        if (stats.size >= this.maxSize) {
          await this.rotateFiles();
        }
      } catch {
        // File doesn't exist yet, no rotation needed
      }
    } catch (error) {
      console.warn('Failed to check log file size:', error);
    }
  }

  private async rotateFiles(): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      const { extname, basename } = await import('path');
      
      const ext = extname(this.filePath);
      const base = basename(this.filePath, ext);
      const dir = this.filePath.replace(basename(this.filePath), '');
      
      // Remove oldest backup if it exists
      const oldestBackup = `${dir}${base}.${this.maxBackups}${ext}`;
      try {
        await fs.unlink(oldestBackup);
      } catch {
        // File doesn't exist, ignore
      }
      
      // Rotate existing backups
      for (let i = this.maxBackups - 1; i >= 1; i--) {
        const from = `${dir}${base}.${i}${ext}`;
        const to = `${dir}${base}.${i + 1}${ext}`;
        try {
          await fs.rename(from, to);
        } catch {
          // File doesn't exist, ignore
        }
      }
      
      // Move current log to backup
      const firstBackup = `${dir}${base}.1${ext}`;
      try {
        await fs.rename(this.filePath, firstBackup);
      } catch {
        // File doesn't exist, ignore
      }
    } catch (error) {
      console.warn('Failed to rotate log files:', error);
    }
  }
}

/**
 * Error metrics collector
 */
export class ErrorMetricsCollector {
  private errors: HatStartError[] = [];
  private retentionPeriod: number;

  constructor(retentionPeriod = 7 * 24 * 60 * 60 * 1000) {
    this.retentionPeriod = retentionPeriod;
  }

  /**
   * Record an error for metrics
   */
  recordError(error: HatStartError): void {
    this.errors.push(error);
    this.cleanup();
  }

  /**
   * Get error metrics for a time range
   */
  getMetrics(timeRange?: { start: string; end: string }): ErrorMetrics {
    const now = new Date();
    const start = timeRange?.start 
      ? new Date(timeRange.start) 
      : new Date(now.getTime() - 60 * 60 * 1000); // Last hour
    const end = timeRange?.end ? new Date(timeRange.end) : now;

    const filteredErrors = this.errors.filter(error => {
      const errorTime = new Date(error.timestamp);
      return errorTime >= start && errorTime <= end;
    });

    const bySeverity = {
      critical: 0,
      error: 0,
      warning: 0,
      info: 0,
    } as Record<ErrorSeverity, number>;

    const byCategory = {
      filesystem: 0,
      network: 0,
      validation: 0,
      parsing: 0,
      permission: 0,
      configuration: 0,
      system: 0,
      user: 0,
      unknown: 0,
    } as Record<ErrorCategory, number>;

    const byComponent: Record<string, number> = {};

    for (const error of filteredErrors) {
      bySeverity[error.severity]++;
      byCategory[error.category]++;
      
      const component = error.context.component;
      byComponent[component] = (byComponent[component] || 0) + 1;
    }

    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const errorRate = filteredErrors.length / Math.max(durationMinutes, 1);

    return {
      totalErrors: filteredErrors.length,
      bySeverity,
      byCategory,
      byComponent,
      errorRate,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };
  }

  /**
   * Analyze error patterns
   */
  analyzePatterns(): ErrorPattern[] {
    const patterns = new Map<string, ErrorPattern>();
    
    for (const error of this.errors) {
      const pattern = error.code;
      
      if (patterns.has(pattern)) {
        const existing = patterns.get(pattern)!;
        existing.count++;
        existing.lastSeen = error.timestamp;
        
        if (!existing.components.includes(error.context.component)) {
          existing.components.push(error.context.component);
        }
      } else {
        patterns.set(pattern, {
          id: `pattern-${pattern}`,
          pattern,
          count: 1,
          firstSeen: error.timestamp,
          lastSeen: error.timestamp,
          components: [error.context.component],
          suggestedActions: this.getSuggestedActions(error),
        });
      }
    }
    
    return Array.from(patterns.values())
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Clear all recorded errors
   */
  clear(): void {
    this.errors = [];
  }

  private cleanup(): void {
    const cutoff = new Date(Date.now() - this.retentionPeriod);
    this.errors = this.errors.filter(error => 
      new Date(error.timestamp) > cutoff
    );
  }

  private getSuggestedActions(error: HatStartError): string[] {
    const actions: string[] = [];
    
    switch (error.category) {
      case 'filesystem':
        actions.push('Check file permissions');
        actions.push('Verify file path exists');
        break;
      case 'network':
        actions.push('Check network connectivity');
        actions.push('Verify URL is accessible');
        break;
      case 'validation':
        actions.push('Review data format');
        actions.push('Check required fields');
        break;
      case 'parsing':
        actions.push('Validate JSON/YAML syntax');
        actions.push('Check file encoding');
        break;
    }
    
    return actions;
  }
}

/**
 * Main error logger
 */
export class ErrorLogger {
  private config: LoggerConfig;
  private transports: LogTransport[] = [];
  private metricsCollector: ErrorMetricsCollector;
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
    this.metricsCollector = new ErrorMetricsCollector(this.config.metricsRetention);
    this.sessionId = this.generateSessionId();
    
    this.initializeTransports();
  }

  /**
   * Log an error
   */
  async logError(error: HatStartError, additionalData?: Record<string, unknown>): Promise<void> {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level: this.mapSeverityToLogLevel(error.severity),
      component: error.context.component,
      message: error.technicalMessage,
      data: additionalData,
      error,
      session: {
        sessionId: this.sessionId,
        userId: error.context.session?.userId,
      },
    };

    await this.writeToTransports(entry);
    
    if (this.config.enableMetrics) {
      this.metricsCollector.recordError(error);
    }
  }

  /**
   * Log a general message
   */
  async log(
    level: LogLevel,
    component: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
      session: {
        sessionId: this.sessionId,
      },
    };

    await this.writeToTransports(entry);
  }

  /**
   * Log error collection
   */
  async logErrorCollection(collection: ErrorCollection): Promise<void> {
    await this.log(
      'info',
      'ErrorLogger',
      `Error collection summary: ${collection.summary.total} total errors`,
      { summary: collection.summary }
    );

    for (const error of collection.errors) {
      await this.logError(error);
    }
  }

  /**
   * Get error metrics
   */
  getMetrics(timeRange?: { start: string; end: string }): ErrorMetrics {
    return this.metricsCollector.getMetrics(timeRange);
  }

  /**
   * Analyze error patterns
   */
  analyzePatterns(): ErrorPattern[] {
    return this.metricsCollector.analyzePatterns();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.reinitializeTransports();
  }

  /**
   * Close logger and cleanup resources
   */
  async close(): Promise<void> {
    await Promise.all(
      this.transports.map(transport => 
        transport.close ? transport.close() : Promise.resolve()
      )
    );
    this.transports = [];
  }

  private initializeTransports(): void {
    this.transports = [];

    if (this.config.enableConsole) {
      this.transports.push(new ConsoleTransport(this.config.level));
    }

    if (this.config.enableFile && this.config.logFilePath) {
      this.transports.push(new FileTransport(
        this.config.logFilePath,
        this.config.level,
        this.config.maxFileSize,
        this.config.maxBackupFiles
      ));
    }
  }

  private async reinitializeTransports(): Promise<void> {
    await this.close();
    this.initializeTransports();
  }

  private async writeToTransports(entry: LogEntry): Promise<void> {
    const levelPriority = LOG_LEVEL_PRIORITY[entry.level];
    
    const writePromises = this.transports
      .filter(transport => LOG_LEVEL_PRIORITY[transport.level] <= levelPriority)
      .map(transport => transport.write(entry).catch(error => 
        console.error(`Transport ${transport.name} failed:`, error)
      ));

    await Promise.all(writePromises);
  }

  private mapSeverityToLogLevel(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  }

  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Default error logger instance
 */
export const defaultErrorLogger = new ErrorLogger();

/**
 * Logger utility functions
 */
export const LoggerUtils = {
  /**
   * Format error metrics for display
   */
  formatMetrics(metrics: ErrorMetrics): string {
    const rate = metrics.errorRate.toFixed(2);
    
    return `Error Metrics (${rate}/min): ${metrics.totalErrors} total, ` +
           `${metrics.bySeverity.critical} critical, ${metrics.bySeverity.error} errors, ` +
           `${metrics.bySeverity.warning} warnings`;
  },

  /**
   * Export logs to JSON
   */
  async exportLogs(filePath: string, entries: LogEntry[]): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      const { dirname } = await import('path');
      
      await fs.mkdir(dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  },

  /**
   * Create log filter
   */
  createFilter(
    options: {
      level?: LogLevel;
      component?: string;
      timeRange?: { start: string; end: string };
    }
  ): (entry: LogEntry) => boolean {
    return (entry: LogEntry) => {
      if (options.level) {
        const entryPriority = LOG_LEVEL_PRIORITY[entry.level];
        const filterPriority = LOG_LEVEL_PRIORITY[options.level];
        if (entryPriority < filterPriority) return false;
      }

      if (options.component && entry.component !== options.component) {
        return false;
      }

      if (options.timeRange) {
        const entryTime = new Date(entry.timestamp);
        const start = new Date(options.timeRange.start);
        const end = new Date(options.timeRange.end);
        if (entryTime < start || entryTime > end) return false;
      }

      return true;
    };
  },
}; 