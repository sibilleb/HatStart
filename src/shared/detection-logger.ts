/**
 * Detection Logging System
 * Centralized logging with configurable levels and structured output
 */

import { DetectionError } from './detection-errors.js';

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export interface LogEntry {
  /** Timestamp when log was created */
  timestamp: Date;
  /** Log level */
  level: LogLevel;
  /** Component that generated the log */
  component: string;
  /** Operation being performed */
  operation: string;
  /** Log message */
  message: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Error details (if applicable) */
  error?: {
    name: string;
    message: string;
    category?: string;
    severity?: string;
    stack?: string;
  };
  /** Duration of operation (if applicable) */
  duration?: number;
}

export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Whether to include timestamps */
  includeTimestamp: boolean;
  /** Whether to include stack traces for errors */
  includeStackTrace: boolean;
  /** Whether to colorize console output */
  colorizeOutput: boolean;
  /** Maximum log entries to keep in memory */
  maxMemoryEntries: number;
  /** Whether to buffer logs for batch processing */
  enableBuffering: boolean;
  /** Buffer flush interval in milliseconds */
  bufferFlushInterval: number;
}

export interface LogOutput {
  /** Write a log entry to output */
  write(entry: LogEntry): Promise<void> | void;
  /** Flush any buffered entries */
  flush?(): Promise<void> | void;
}

/**
 * Console log output with optional colorization
 */
export class ConsoleLogOutput implements LogOutput {
  private colorize: boolean;
  
  constructor(colorize: boolean = true) {
    this.colorize = colorize;
  }

  public write(entry: LogEntry): void {
    const message = this.formatMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
        console.error(message);
        break;
    }
  }

  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [];
    
    // Timestamp
    if (entry.timestamp) {
      const timestamp = entry.timestamp.toISOString();
      parts.push(this.colorize ? `\x1b[90m${timestamp}\x1b[0m` : timestamp);
    }

    // Level  
    const levelStr = Object.keys(LogLevel).find(key => LogLevel[key as keyof typeof LogLevel] === entry.level)?.padEnd(5) || 'UNKNOWN';
    if (this.colorize) {
      const colorCode = this.getLevelColor(entry.level);
      parts.push(`${colorCode}${levelStr}\x1b[0m`);
    } else {
      parts.push(levelStr);
    }

    // Component and operation
    const context = `[${entry.component}:${entry.operation}]`;
    parts.push(this.colorize ? `\x1b[36m${context}\x1b[0m` : context);

    // Message
    parts.push(entry.message);

    // Duration (if applicable)
    if (entry.duration !== undefined) {
      const duration = `(${entry.duration}ms)`;
      parts.push(this.colorize ? `\x1b[33m${duration}\x1b[0m` : duration);
    }

    let result = parts.join(' ');

    // Metadata
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const metadata = JSON.stringify(entry.metadata, null, 2);
      result += `\n  Metadata: ${metadata}`;
    }

    // Error details
    if (entry.error) {
      result += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.category) {
        result += `\n  Category: ${entry.error.category}`;
      }
      if (entry.error.severity) {
        result += `\n  Severity: ${entry.error.severity}`;
      }
      if (entry.error.stack) {
        result += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return result;
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '\x1b[90m'; // Gray
      case LogLevel.INFO: return '\x1b[32m';  // Green
      case LogLevel.WARN: return '\x1b[33m';  // Yellow
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      default: return '\x1b[0m';              // Reset
    }
  }
}

/**
 * Memory log output for testing and debugging
 */
export class MemoryLogOutput implements LogOutput {
  private entries: LogEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  public write(entry: LogEntry): void {
    this.entries.push(entry);
    
    // Trim old entries if needed
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  public getEntries(): LogEntry[] {
    return [...this.entries];
  }

  public clear(): void {
    this.entries = [];
  }

  public getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter(entry => entry.level === level);
  }

  public getEntriesByComponent(component: string): LogEntry[] {
    return this.entries.filter(entry => entry.component === component);
  }
}

/**
 * Main detection logger
 */
export class DetectionLogger {
  private config: LoggerConfig;
  private outputs: LogOutput[] = [];
  private buffer: LogEntry[] = [];
  private bufferTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      includeTimestamp: true,
      includeStackTrace: true,
      colorizeOutput: true,
      maxMemoryEntries: 1000,
      enableBuffering: false,
      bufferFlushInterval: 5000,
      ...config
    };

    // Set up default console output
    this.addOutput(new ConsoleLogOutput(this.config.colorizeOutput));

    // Set up buffer flushing if enabled
    if (this.config.enableBuffering) {
      this.startBufferFlushing();
    }
  }

  /**
   * Add a log output destination
   */
  public addOutput(output: LogOutput): void {
    this.outputs.push(output);
  }

  /**
   * Remove a log output destination
   */
  public removeOutput(output: LogOutput): void {
    const index = this.outputs.indexOf(output);
    if (index >= 0) {
      this.outputs.splice(index, 1);
    }
  }

  /**
   * Update logger configuration
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart buffer flushing if needed
    if (this.config.enableBuffering && !this.bufferTimer) {
      this.startBufferFlushing();
    } else if (!this.config.enableBuffering && this.bufferTimer) {
      this.stopBufferFlushing();
    }
  }

  /**
   * Log a debug message
   */
  public debug(component: string, operation: string, message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, component, operation, message, metadata);
  }

  /**
   * Log an info message
   */
  public info(component: string, operation: string, message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, component, operation, message, metadata);
  }

  /**
   * Log a warning message
   */
  public warn(component: string, operation: string, message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, component, operation, message, metadata);
  }

  /**
   * Log an error message
   */
  public error(component: string, operation: string, message: string, error?: Error | DetectionError, metadata?: Record<string, unknown>): void {
    let errorDetails;
    
    if (error instanceof DetectionError) {
      errorDetails = {
        name: error.name,
        message: error.message,
        category: error.category,
        severity: error.severity,
        stack: this.config.includeStackTrace ? error.stack : undefined
      };
    } else if (error) {
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: this.config.includeStackTrace ? error.stack : undefined
      };
    }

    this.log(LogLevel.ERROR, component, operation, message, metadata, errorDetails);
  }

  /**
   * Log the start of an operation
   */
  public startOperation(component: string, operation: string, metadata?: Record<string, unknown>): number {
    this.debug(component, operation, `Starting operation`, metadata);
    return Date.now();
  }

  /**
   * Log the completion of an operation
   */
  public endOperation(component: string, operation: string, startTime: number, metadata?: Record<string, unknown>): void {
    const duration = Date.now() - startTime;
    this.info(component, operation, `Operation completed`, { ...metadata, duration });
  }

  /**
   * Log operation failure
   */
  public failOperation(component: string, operation: string, startTime: number, error: Error | DetectionError, metadata?: Record<string, unknown>): void {
    const duration = Date.now() - startTime;
    this.error(component, operation, `Operation failed`, error, { ...metadata, duration });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    component: string,
    operation: string,
    message: string,
    metadata?: Record<string, unknown>,
    error?: LogEntry['error'],
    duration?: number
  ): void {
    if (level < this.config.level) {
      return; // Log level too low
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component,
      operation,
      message,
      metadata,
      error,
      duration
    };

    if (this.config.enableBuffering) {
      this.buffer.push(entry);
    } else {
      this.writeEntry(entry);
    }
  }

  /**
   * Write log entry to all outputs
   */
  private async writeEntry(entry: LogEntry): Promise<void> {
    for (const output of this.outputs) {
      try {
        await output.write(entry);
      } catch (error) {
        // Avoid infinite recursion by using console directly
        console.error('Failed to write log entry:', error);
      }
    }
  }

  /**
   * Start buffer flushing
   */
  private startBufferFlushing(): void {
    this.bufferTimer = setInterval(() => {
      this.flushBuffer();
    }, this.config.bufferFlushInterval);
  }

  /**
   * Stop buffer flushing
   */
  private stopBufferFlushing(): void {
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer);
      this.bufferTimer = null;
    }
  }

  /**
   * Flush buffered log entries
   */
  public async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = this.buffer.splice(0);
    
    for (const entry of entries) {
      await this.writeEntry(entry);
    }

    // Flush outputs if they support it
    for (const output of this.outputs) {
      if (output.flush) {
        try {
          await output.flush();
        } catch (error) {
          console.error('Failed to flush log output:', error);
        }
      }
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stopBufferFlushing();
    this.flushBuffer();
  }
}

/**
 * Global logger instance
 */
export const detectionLogger = new DetectionLogger({
  level: LogLevel.INFO,
  includeTimestamp: true,
  includeStackTrace: true,
  colorizeOutput: true
});

/**
 * Convenience logging functions
 */
export const log = {
  debug: (component: string, operation: string, message: string, metadata?: Record<string, unknown>) =>
    detectionLogger.debug(component, operation, message, metadata),
  
  info: (component: string, operation: string, message: string, metadata?: Record<string, unknown>) =>
    detectionLogger.info(component, operation, message, metadata),
  
  warn: (component: string, operation: string, message: string, metadata?: Record<string, unknown>) =>
    detectionLogger.warn(component, operation, message, metadata),
  
  error: (component: string, operation: string, message: string, error?: Error | DetectionError, metadata?: Record<string, unknown>) =>
    detectionLogger.error(component, operation, message, error, metadata),
  
  startOperation: (component: string, operation: string, metadata?: Record<string, unknown>) =>
    detectionLogger.startOperation(component, operation, metadata),
  
  endOperation: (component: string, operation: string, startTime: number, metadata?: Record<string, unknown>) =>
    detectionLogger.endOperation(component, operation, startTime, metadata),
  
  failOperation: (component: string, operation: string, startTime: number, error: Error | DetectionError, metadata?: Record<string, unknown>) =>
    detectionLogger.failOperation(component, operation, startTime, error, metadata)
}; 