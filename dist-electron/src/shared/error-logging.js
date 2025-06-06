"use strict";
/**
 * HatStart Error Logging and Monitoring System
 * Comprehensive logging, monitoring, and analytics for error tracking
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
exports.LoggerUtils = exports.defaultErrorLogger = exports.ErrorLogger = exports.ErrorMetricsCollector = exports.FileTransport = exports.ConsoleTransport = void 0;
/**
 * Default logger configuration
 */
const DEFAULT_LOGGER_CONFIG = {
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
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warning: 2,
    error: 3,
    critical: 4,
};
/**
 * Console log transport
 */
class ConsoleTransport {
    constructor(level = 'info') {
        this.name = 'console';
        this.level = level;
    }
    async write(entry) {
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
exports.ConsoleTransport = ConsoleTransport;
/**
 * File log transport
 */
class FileTransport {
    constructor(filePath, level = 'info', maxSize = 10 * 1024 * 1024, maxBackups = 5) {
        this.name = 'file';
        this.level = level;
        this.filePath = filePath;
        this.maxSize = maxSize;
        this.maxBackups = maxBackups;
    }
    async write(entry) {
        try {
            const { promises: fs } = await Promise.resolve().then(() => __importStar(require('fs')));
            const { dirname } = await Promise.resolve().then(() => __importStar(require('path')));
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
        }
        catch (error) {
            // Fallback to console if file logging fails
            console.error('Failed to write to log file:', error);
            console.error('Original log entry:', entry);
        }
    }
    async close() {
        // No cleanup needed for file transport
    }
    async rotateIfNeeded() {
        try {
            const { promises: fs } = await Promise.resolve().then(() => __importStar(require('fs')));
            try {
                const stats = await fs.stat(this.filePath);
                if (stats.size >= this.maxSize) {
                    await this.rotateFiles();
                }
            }
            catch {
                // File doesn't exist yet, no rotation needed
            }
        }
        catch (error) {
            console.warn('Failed to check log file size:', error);
        }
    }
    async rotateFiles() {
        try {
            const { promises: fs } = await Promise.resolve().then(() => __importStar(require('fs')));
            const { extname, basename } = await Promise.resolve().then(() => __importStar(require('path')));
            const ext = extname(this.filePath);
            const base = basename(this.filePath, ext);
            const dir = this.filePath.replace(basename(this.filePath), '');
            // Remove oldest backup if it exists
            const oldestBackup = `${dir}${base}.${this.maxBackups}${ext}`;
            try {
                await fs.unlink(oldestBackup);
            }
            catch {
                // File doesn't exist, ignore
            }
            // Rotate existing backups
            for (let i = this.maxBackups - 1; i >= 1; i--) {
                const from = `${dir}${base}.${i}${ext}`;
                const to = `${dir}${base}.${i + 1}${ext}`;
                try {
                    await fs.rename(from, to);
                }
                catch {
                    // File doesn't exist, ignore
                }
            }
            // Move current log to backup
            const firstBackup = `${dir}${base}.1${ext}`;
            try {
                await fs.rename(this.filePath, firstBackup);
            }
            catch {
                // File doesn't exist, ignore
            }
        }
        catch (error) {
            console.warn('Failed to rotate log files:', error);
        }
    }
}
exports.FileTransport = FileTransport;
/**
 * Error metrics collector
 */
class ErrorMetricsCollector {
    constructor(retentionPeriod = 7 * 24 * 60 * 60 * 1000) {
        this.errors = [];
        this.retentionPeriod = retentionPeriod;
    }
    /**
     * Record an error for metrics
     */
    recordError(error) {
        this.errors.push(error);
        this.cleanup();
    }
    /**
     * Get error metrics for a time range
     */
    getMetrics(timeRange) {
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
        };
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
        };
        const byComponent = {};
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
    analyzePatterns() {
        const patterns = new Map();
        for (const error of this.errors) {
            const pattern = error.code;
            if (patterns.has(pattern)) {
                const existing = patterns.get(pattern);
                existing.count++;
                existing.lastSeen = error.timestamp;
                if (!existing.components.includes(error.context.component)) {
                    existing.components.push(error.context.component);
                }
            }
            else {
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
    clear() {
        this.errors = [];
    }
    cleanup() {
        const cutoff = new Date(Date.now() - this.retentionPeriod);
        this.errors = this.errors.filter(error => new Date(error.timestamp) > cutoff);
    }
    getSuggestedActions(error) {
        const actions = [];
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
exports.ErrorMetricsCollector = ErrorMetricsCollector;
/**
 * Main error logger
 */
class ErrorLogger {
    constructor(config = {}) {
        this.transports = [];
        this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
        this.metricsCollector = new ErrorMetricsCollector(this.config.metricsRetention);
        this.sessionId = this.generateSessionId();
        this.initializeTransports();
    }
    /**
     * Log an error
     */
    async logError(error, additionalData) {
        const entry = {
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
    async log(level, component, message, data) {
        const entry = {
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
    async logErrorCollection(collection) {
        await this.log('info', 'ErrorLogger', `Error collection summary: ${collection.summary.total} total errors`, { summary: collection.summary });
        for (const error of collection.errors) {
            await this.logError(error);
        }
    }
    /**
     * Get error metrics
     */
    getMetrics(timeRange) {
        return this.metricsCollector.getMetrics(timeRange);
    }
    /**
     * Analyze error patterns
     */
    analyzePatterns() {
        return this.metricsCollector.analyzePatterns();
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.reinitializeTransports();
    }
    /**
     * Close logger and cleanup resources
     */
    async close() {
        await Promise.all(this.transports.map(transport => transport.close ? transport.close() : Promise.resolve()));
        this.transports = [];
    }
    initializeTransports() {
        this.transports = [];
        if (this.config.enableConsole) {
            this.transports.push(new ConsoleTransport(this.config.level));
        }
        if (this.config.enableFile && this.config.logFilePath) {
            this.transports.push(new FileTransport(this.config.logFilePath, this.config.level, this.config.maxFileSize, this.config.maxBackupFiles));
        }
    }
    async reinitializeTransports() {
        await this.close();
        this.initializeTransports();
    }
    async writeToTransports(entry) {
        const levelPriority = LOG_LEVEL_PRIORITY[entry.level];
        const writePromises = this.transports
            .filter(transport => LOG_LEVEL_PRIORITY[transport.level] <= levelPriority)
            .map(transport => transport.write(entry).catch(error => console.error(`Transport ${transport.name} failed:`, error)));
        await Promise.all(writePromises);
    }
    mapSeverityToLogLevel(severity) {
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
    generateLogId() {
        return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ErrorLogger = ErrorLogger;
/**
 * Default error logger instance
 */
exports.defaultErrorLogger = new ErrorLogger();
/**
 * Logger utility functions
 */
exports.LoggerUtils = {
    /**
     * Format error metrics for display
     */
    formatMetrics(metrics) {
        const rate = metrics.errorRate.toFixed(2);
        return `Error Metrics (${rate}/min): ${metrics.totalErrors} total, ` +
            `${metrics.bySeverity.critical} critical, ${metrics.bySeverity.error} errors, ` +
            `${metrics.bySeverity.warning} warnings`;
    },
    /**
     * Export logs to JSON
     */
    async exportLogs(filePath, entries) {
        try {
            const { promises: fs } = await Promise.resolve().then(() => __importStar(require('fs')));
            const { dirname } = await Promise.resolve().then(() => __importStar(require('path')));
            await fs.mkdir(dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf8');
        }
        catch (error) {
            console.error('Failed to export logs:', error);
        }
    },
    /**
     * Create log filter
     */
    createFilter(options) {
        return (entry) => {
            if (options.level) {
                const entryPriority = LOG_LEVEL_PRIORITY[entry.level];
                const filterPriority = LOG_LEVEL_PRIORITY[options.level];
                if (entryPriority < filterPriority)
                    return false;
            }
            if (options.component && entry.component !== options.component) {
                return false;
            }
            if (options.timeRange) {
                const entryTime = new Date(entry.timestamp);
                const start = new Date(options.timeRange.start);
                const end = new Date(options.timeRange.end);
                if (entryTime < start || entryTime > end)
                    return false;
            }
            return true;
        };
    },
};
//# sourceMappingURL=error-logging.js.map