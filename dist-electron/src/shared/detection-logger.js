"use strict";
/**
 * Detection Logging System
 * Centralized logging with configurable levels and structured output
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.detectionLogger = exports.DetectionLogger = exports.MemoryLogOutput = exports.ConsoleLogOutput = exports.LogLevel = void 0;
const detection_errors_js_1 = require("./detection-errors.js");
exports.LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    SILENT: 4
};
/**
 * Console log output with optional colorization
 */
class ConsoleLogOutput {
    constructor(colorize = true) {
        this.colorize = colorize;
    }
    write(entry) {
        const message = this.formatMessage(entry);
        switch (entry.level) {
            case exports.LogLevel.DEBUG:
                console.debug(message);
                break;
            case exports.LogLevel.INFO:
                console.info(message);
                break;
            case exports.LogLevel.WARN:
                console.warn(message);
                break;
            case exports.LogLevel.ERROR:
                console.error(message);
                break;
        }
    }
    formatMessage(entry) {
        const parts = [];
        // Timestamp
        if (entry.timestamp) {
            const timestamp = entry.timestamp.toISOString();
            parts.push(this.colorize ? `\x1b[90m${timestamp}\x1b[0m` : timestamp);
        }
        // Level  
        const levelStr = Object.keys(exports.LogLevel).find(key => exports.LogLevel[key] === entry.level)?.padEnd(5) || 'UNKNOWN';
        if (this.colorize) {
            const colorCode = this.getLevelColor(entry.level);
            parts.push(`${colorCode}${levelStr}\x1b[0m`);
        }
        else {
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
    getLevelColor(level) {
        switch (level) {
            case exports.LogLevel.DEBUG: return '\x1b[90m'; // Gray
            case exports.LogLevel.INFO: return '\x1b[32m'; // Green
            case exports.LogLevel.WARN: return '\x1b[33m'; // Yellow
            case exports.LogLevel.ERROR: return '\x1b[31m'; // Red
            default: return '\x1b[0m'; // Reset
        }
    }
}
exports.ConsoleLogOutput = ConsoleLogOutput;
/**
 * Memory log output for testing and debugging
 */
class MemoryLogOutput {
    constructor(maxEntries = 1000) {
        this.entries = [];
        this.maxEntries = maxEntries;
    }
    write(entry) {
        this.entries.push(entry);
        // Trim old entries if needed
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(-this.maxEntries);
        }
    }
    getEntries() {
        return [...this.entries];
    }
    clear() {
        this.entries = [];
    }
    getEntriesByLevel(level) {
        return this.entries.filter(entry => entry.level === level);
    }
    getEntriesByComponent(component) {
        return this.entries.filter(entry => entry.component === component);
    }
}
exports.MemoryLogOutput = MemoryLogOutput;
/**
 * Main detection logger
 */
class DetectionLogger {
    constructor(config = {}) {
        this.outputs = [];
        this.buffer = [];
        this.bufferTimer = null;
        this.config = {
            level: exports.LogLevel.INFO,
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
    addOutput(output) {
        this.outputs.push(output);
    }
    /**
     * Remove a log output destination
     */
    removeOutput(output) {
        const index = this.outputs.indexOf(output);
        if (index >= 0) {
            this.outputs.splice(index, 1);
        }
    }
    /**
     * Update logger configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        // Restart buffer flushing if needed
        if (this.config.enableBuffering && !this.bufferTimer) {
            this.startBufferFlushing();
        }
        else if (!this.config.enableBuffering && this.bufferTimer) {
            this.stopBufferFlushing();
        }
    }
    /**
     * Log a debug message
     */
    debug(component, operation, message, metadata) {
        this.log(exports.LogLevel.DEBUG, component, operation, message, metadata);
    }
    /**
     * Log an info message
     */
    info(component, operation, message, metadata) {
        this.log(exports.LogLevel.INFO, component, operation, message, metadata);
    }
    /**
     * Log a warning message
     */
    warn(component, operation, message, metadata) {
        this.log(exports.LogLevel.WARN, component, operation, message, metadata);
    }
    /**
     * Log an error message
     */
    error(component, operation, message, error, metadata) {
        let errorDetails;
        if (error instanceof detection_errors_js_1.DetectionError) {
            errorDetails = {
                name: error.name,
                message: error.message,
                category: error.category,
                severity: error.severity,
                stack: this.config.includeStackTrace ? error.stack : undefined
            };
        }
        else if (error) {
            errorDetails = {
                name: error.name,
                message: error.message,
                stack: this.config.includeStackTrace ? error.stack : undefined
            };
        }
        this.log(exports.LogLevel.ERROR, component, operation, message, metadata, errorDetails);
    }
    /**
     * Log the start of an operation
     */
    startOperation(component, operation, metadata) {
        this.debug(component, operation, `Starting operation`, metadata);
        return Date.now();
    }
    /**
     * Log the completion of an operation
     */
    endOperation(component, operation, startTime, metadata) {
        const duration = Date.now() - startTime;
        this.info(component, operation, `Operation completed`, { ...metadata, duration });
    }
    /**
     * Log operation failure
     */
    failOperation(component, operation, startTime, error, metadata) {
        const duration = Date.now() - startTime;
        this.error(component, operation, `Operation failed`, error, { ...metadata, duration });
    }
    /**
     * Core logging method
     */
    log(level, component, operation, message, metadata, error, duration) {
        if (level < this.config.level) {
            return; // Log level too low
        }
        const entry = {
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
        }
        else {
            this.writeEntry(entry);
        }
    }
    /**
     * Write log entry to all outputs
     */
    async writeEntry(entry) {
        for (const output of this.outputs) {
            try {
                await output.write(entry);
            }
            catch (error) {
                // Avoid infinite recursion by using console directly
                console.error('Failed to write log entry:', error);
            }
        }
    }
    /**
     * Start buffer flushing
     */
    startBufferFlushing() {
        this.bufferTimer = setInterval(() => {
            this.flushBuffer();
        }, this.config.bufferFlushInterval);
    }
    /**
     * Stop buffer flushing
     */
    stopBufferFlushing() {
        if (this.bufferTimer) {
            clearInterval(this.bufferTimer);
            this.bufferTimer = null;
        }
    }
    /**
     * Flush buffered log entries
     */
    async flushBuffer() {
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
                }
                catch (error) {
                    console.error('Failed to flush log output:', error);
                }
            }
        }
    }
    /**
     * Clean up resources
     */
    destroy() {
        this.stopBufferFlushing();
        this.flushBuffer();
    }
}
exports.DetectionLogger = DetectionLogger;
/**
 * Global logger instance
 */
exports.detectionLogger = new DetectionLogger({
    level: exports.LogLevel.INFO,
    includeTimestamp: true,
    includeStackTrace: true,
    colorizeOutput: true
});
/**
 * Convenience logging functions
 */
exports.log = {
    debug: (component, operation, message, metadata) => exports.detectionLogger.debug(component, operation, message, metadata),
    info: (component, operation, message, metadata) => exports.detectionLogger.info(component, operation, message, metadata),
    warn: (component, operation, message, metadata) => exports.detectionLogger.warn(component, operation, message, metadata),
    error: (component, operation, message, error, metadata) => exports.detectionLogger.error(component, operation, message, error, metadata),
    startOperation: (component, operation, metadata) => exports.detectionLogger.startOperation(component, operation, metadata),
    endOperation: (component, operation, startTime, metadata) => exports.detectionLogger.endOperation(component, operation, startTime, metadata),
    failOperation: (component, operation, startTime, error, metadata) => exports.detectionLogger.failOperation(component, operation, startTime, error, metadata)
};
//# sourceMappingURL=detection-logger.js.map