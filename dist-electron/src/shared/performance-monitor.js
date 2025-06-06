"use strict";
/**
 * Performance Monitoring System for HatStart
 * Tracks and analyzes performance metrics for manifest operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceUtils = exports.performanceMonitor = exports.PerformanceMonitor = void 0;
/**
 * High-performance monitoring system
 */
class PerformanceMonitor {
    constructor(maxHistorySize = 1000) {
        this.metrics = [];
        this.activeOperations = new Map();
        this.maxHistorySize = maxHistorySize;
    }
    /**
     * Start tracking an operation
     */
    startOperation(operation, metadata) {
        const id = `${operation}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const metric = {
            operation,
            startTime: performance.now(),
            memoryBefore: this.getCurrentMemoryUsage(),
            metadata
        };
        this.activeOperations.set(id, metric);
        return id;
    }
    /**
     * End tracking an operation
     */
    endOperation(id) {
        const metric = this.activeOperations.get(id);
        if (!metric) {
            return null;
        }
        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;
        metric.memoryAfter = this.getCurrentMemoryUsage();
        this.activeOperations.delete(id);
        this.addMetric(metric);
        return metric;
    }
    /**
     * Track a complete operation with automatic timing
     */
    async trackOperation(operation, fn, metadata) {
        const id = this.startOperation(operation, metadata);
        try {
            const result = await fn();
            this.endOperation(id);
            return result;
        }
        catch (error) {
            const metric = this.activeOperations.get(id);
            if (metric) {
                metric.metadata = { ...metric.metadata, error: String(error) };
            }
            this.endOperation(id);
            throw error;
        }
    }
    /**
     * Track a synchronous operation
     */
    trackSync(operation, fn, metadata) {
        const id = this.startOperation(operation, metadata);
        try {
            const result = fn();
            this.endOperation(id);
            return result;
        }
        catch (error) {
            const metric = this.activeOperations.get(id);
            if (metric) {
                metric.metadata = { ...metric.metadata, error: String(error) };
            }
            this.endOperation(id);
            throw error;
        }
    }
    /**
     * Get performance report for a specific operation
     */
    getReport(operation) {
        const relevantMetrics = operation
            ? this.metrics.filter(m => m.operation === operation)
            : this.metrics;
        if (relevantMetrics.length === 0) {
            return {
                totalOperations: 0,
                averageDuration: 0,
                minDuration: 0,
                maxDuration: 0,
                operationsPerSecond: 0,
                memoryEfficiency: 0,
                recentOperations: []
            };
        }
        const durations = relevantMetrics
            .filter(m => m.duration !== undefined)
            .map(m => m.duration);
        const totalDuration = durations.reduce((sum, d) => sum + d, 0);
        const averageDuration = totalDuration / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        // Calculate operations per second over the last minute
        const oneMinuteAgo = performance.now() - 60000;
        const recentOps = relevantMetrics.filter(m => m.startTime > oneMinuteAgo);
        const operationsPerSecond = recentOps.length / 60;
        // Calculate memory efficiency (inverse of memory growth)
        const memoryGrowths = relevantMetrics
            .filter(m => m.memoryBefore && m.memoryAfter)
            .map(m => Math.max(0, m.memoryAfter - m.memoryBefore));
        const avgMemoryGrowth = memoryGrowths.length > 0
            ? memoryGrowths.reduce((sum, g) => sum + g, 0) / memoryGrowths.length
            : 0;
        const memoryEfficiency = Math.max(0, 1 - (avgMemoryGrowth / 1024 / 1024)); // Normalize to MB
        return {
            totalOperations: relevantMetrics.length,
            averageDuration,
            minDuration,
            maxDuration,
            operationsPerSecond,
            memoryEfficiency,
            recentOperations: relevantMetrics.slice(-10) // Last 10 operations
        };
    }
    /**
     * Get all tracked operations
     */
    getAllMetrics() {
        return [...this.metrics];
    }
    /**
     * Clear all metrics
     */
    clear() {
        this.metrics = [];
        this.activeOperations.clear();
    }
    /**
     * Export metrics for analysis
     */
    exportMetrics() {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            summary: this.getReport()
        }, null, 2);
    }
    addMetric(metric) {
        this.metrics.push(metric);
        // Trim history if needed
        if (this.metrics.length > this.maxHistorySize) {
            this.metrics = this.metrics.slice(-this.maxHistorySize);
        }
    }
    getCurrentMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            return process.memoryUsage().heapUsed;
        }
        // Browser fallback - not as accurate but better than nothing
        if (typeof performance !== 'undefined' && 'memory' in performance) {
            const perfMemory = performance.memory;
            return perfMemory?.usedJSHeapSize || 0;
        }
        return 0;
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
/**
 * Global performance monitor instance
 */
exports.performanceMonitor = new PerformanceMonitor();
/**
 * Performance utilities
 */
exports.PerformanceUtils = {
    /**
     * Format duration for display
     */
    formatDuration(ms) {
        if (ms < 1)
            return `${(ms * 1000).toFixed(0)}μs`;
        if (ms < 1000)
            return `${ms.toFixed(1)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    },
    /**
     * Format memory for display
     */
    formatMemory(bytes) {
        if (bytes < 1024)
            return `${bytes}B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)}KB`;
        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
    },
    /**
     * Format performance report
     */
    formatReport(report) {
        return [
            `Operations: ${report.totalOperations}`,
            `Avg Duration: ${exports.PerformanceUtils.formatDuration(report.averageDuration)}`,
            `Range: ${exports.PerformanceUtils.formatDuration(report.minDuration)} - ${exports.PerformanceUtils.formatDuration(report.maxDuration)}`,
            `Ops/sec: ${report.operationsPerSecond.toFixed(1)}`,
            `Memory Efficiency: ${(report.memoryEfficiency * 100).toFixed(1)}%`
        ].join(', ');
    },
    /**
     * Create a performance decorator for methods
     */
    monitored(operation) {
        return function (target, propertyKey, descriptor) {
            const originalMethod = descriptor.value;
            const className = target.constructor.name;
            const operationName = operation || `${className}.${propertyKey}`;
            descriptor.value = async function (...args) {
                if (originalMethod.constructor.name === 'AsyncFunction') {
                    return exports.performanceMonitor.trackOperation(operationName, () => originalMethod.apply(this, args));
                }
                else {
                    return exports.performanceMonitor.trackSync(operationName, () => originalMethod.apply(this, args));
                }
            };
            return descriptor;
        };
    }
};
//# sourceMappingURL=performance-monitor.js.map