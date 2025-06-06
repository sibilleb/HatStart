"use strict";
/**
 * Performance Optimizations for HatStart Manifest System
 * Provides caching, parallel processing, and memory management for manifest operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceUtils = exports.defaultPerformanceOptimizer = exports.PerformanceOptimizer = exports.PerformanceProfiler = exports.MemoryMonitor = exports.ParallelProcessor = exports.PerformanceCache = void 0;
/**
 * High-performance cache with LRU eviction and memory management
 */
class PerformanceCache {
    constructor(config = {}) {
        this.cache = new Map();
        this.totalSize = 0;
        this.hits = 0;
        this.misses = 0;
        this.config = {
            enableCaching: config.enableCaching ?? true,
            maxCacheSize: config.maxCacheSize ?? 50 * 1024 * 1024, // 50MB
            cacheTtl: config.cacheTtl ?? 30 * 60 * 1000, // 30 minutes
            enableParallelProcessing: config.enableParallelProcessing ?? true,
            maxConcurrency: config.maxConcurrency ?? 4,
            enableMemoryMonitoring: config.enableMemoryMonitoring ?? true,
            memoryPressureThreshold: config.memoryPressureThreshold ?? 0.8
        };
    }
    get(key) {
        if (!this.config.enableCaching)
            return undefined;
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return undefined;
        }
        // Check TTL
        if (Date.now() - entry.timestamp > this.config.cacheTtl) {
            this.cache.delete(key);
            this.totalSize -= entry.size;
            this.misses++;
            return undefined;
        }
        // Update access info
        entry.accessCount++;
        entry.lastAccess = Date.now();
        this.hits++;
        return entry.data;
    }
    set(key, data) {
        if (!this.config.enableCaching)
            return;
        const size = this.estimateSize(data);
        const now = Date.now();
        // Remove existing entry if present
        const existing = this.cache.get(key);
        if (existing) {
            this.totalSize -= existing.size;
        }
        const entry = {
            data,
            timestamp: now,
            accessCount: 1,
            lastAccess: now,
            size
        };
        this.cache.set(key, entry);
        this.totalSize += size;
        this.evictIfNeeded();
    }
    clear() {
        this.cache.clear();
        this.totalSize = 0;
        this.hits = 0;
        this.misses = 0;
    }
    getHitRate() {
        const total = this.hits + this.misses;
        return total > 0 ? this.hits / total : 0;
    }
    getSize() {
        return this.totalSize;
    }
    estimateSize(data) {
        try {
            return JSON.stringify(data).length * 2; // Rough estimate with object overhead
        }
        catch {
            return 1024; // Default size
        }
    }
    evictIfNeeded() {
        if (this.totalSize <= this.config.maxCacheSize)
            return;
        // Sort by LRU + access frequency
        const entries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => {
            const aScore = a.lastAccess + a.accessCount * 1000;
            const bScore = b.lastAccess + b.accessCount * 1000;
            return aScore - bScore;
        });
        // Remove oldest entries until under limit
        const targetSize = this.config.maxCacheSize * 0.7;
        while (this.totalSize > targetSize && entries.length > 0) {
            const [key, entry] = entries.shift();
            this.cache.delete(key);
            this.totalSize -= entry.size;
        }
    }
}
exports.PerformanceCache = PerformanceCache;
/**
 * Parallel processing queue with concurrency control
 */
class ParallelProcessor {
    constructor(config = {}) {
        this.activeOperations = 0;
        this.queue = [];
        this.results = [];
        this.config = {
            enableCaching: config.enableCaching ?? true,
            maxCacheSize: config.maxCacheSize ?? 50 * 1024 * 1024,
            cacheTtl: config.cacheTtl ?? 30 * 60 * 1000,
            enableParallelProcessing: config.enableParallelProcessing ?? true,
            maxConcurrency: config.maxConcurrency ?? 4,
            enableMemoryMonitoring: config.enableMemoryMonitoring ?? true,
            memoryPressureThreshold: config.memoryPressureThreshold ?? 0.8
        };
    }
    async processInParallel(items, processor) {
        if (!this.config.enableParallelProcessing || items.length === 0) {
            return Promise.all(items.map(processor));
        }
        const results = [];
        const batches = this.createBatches(items, this.config.maxConcurrency);
        for (const batch of batches) {
            const batchPromises = batch.map((item, batchIndex) => {
                const originalIndex = batches.slice(0, batches.indexOf(batch))
                    .reduce((acc, b) => acc + b.length, 0) + batchIndex;
                return processor(item, originalIndex);
            });
            const batchResults = await Promise.allSettled(batchPromises);
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
                    // Re-throw the error to maintain error handling behavior
                    throw result.reason;
                }
            });
        }
        return results;
    }
    getActiveOperations() {
        return this.activeOperations;
    }
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
}
exports.ParallelProcessor = ParallelProcessor;
/**
 * Memory monitor for tracking system memory usage
 */
class MemoryMonitor {
    constructor(config = {}) {
        this.memoryHistory = [];
        this.maxHistorySize = 100;
        this.config = {
            enableCaching: config.enableCaching ?? true,
            maxCacheSize: config.maxCacheSize ?? 50 * 1024 * 1024,
            cacheTtl: config.cacheTtl ?? 30 * 60 * 1000,
            enableParallelProcessing: config.enableParallelProcessing ?? true,
            maxConcurrency: config.maxConcurrency ?? 4,
            enableMemoryMonitoring: config.enableMemoryMonitoring ?? true,
            memoryPressureThreshold: config.memoryPressureThreshold ?? 0.8
        };
    }
    getCurrentMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            return process.memoryUsage().heapUsed;
        }
        return 0; // Fallback for browser environments
    }
    getMemoryPressure() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            return usage.heapUsed / usage.heapTotal;
        }
        return 0;
    }
    isMemoryPressureHigh() {
        return this.getMemoryPressure() > this.config.memoryPressureThreshold;
    }
    recordMemoryUsage() {
        if (!this.config.enableMemoryMonitoring)
            return;
        const usage = this.getCurrentMemoryUsage();
        this.memoryHistory.push(usage);
        if (this.memoryHistory.length > this.maxHistorySize) {
            this.memoryHistory.shift();
        }
    }
    getMemoryTrend() {
        if (this.memoryHistory.length < 10)
            return 'stable';
        const recent = this.memoryHistory.slice(-5);
        const older = this.memoryHistory.slice(-10, -5);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        const threshold = 0.05; // 5% change threshold
        const change = (recentAvg - olderAvg) / olderAvg;
        if (change > threshold)
            return 'increasing';
        if (change < -threshold)
            return 'decreasing';
        return 'stable';
    }
}
exports.MemoryMonitor = MemoryMonitor;
/**
 * Performance profiler for manifest operations
 */
class PerformanceProfiler {
    constructor() {
        this.operations = new Map();
        this.completedOperations = [];
        this.maxHistory = 1000;
    }
    startOperation(operationId, description) {
        this.operations.set(operationId, {
            id: operationId,
            description: description || operationId,
            startTime: performance.now(),
            startMemory: this.getCurrentMemory()
        });
    }
    endOperation(operationId) {
        const operation = this.operations.get(operationId);
        if (!operation)
            return null;
        operation.endTime = performance.now();
        operation.endMemory = this.getCurrentMemory();
        operation.duration = operation.endTime - operation.startTime;
        operation.memoryDelta = operation.endMemory - operation.startMemory;
        this.operations.delete(operationId);
        this.completedOperations.push(operation);
        if (this.completedOperations.length > this.maxHistory) {
            this.completedOperations.shift();
        }
        return operation;
    }
    getMetrics() {
        const completed = this.completedOperations;
        const totalOps = completed.length;
        const errors = completed.filter(op => op.error).length;
        const avgLoadTime = totalOps > 0
            ? completed.reduce((sum, op) => sum + (op.duration || 0), 0) / totalOps
            : 0;
        return {
            cacheHitRate: 0, // To be set by cache
            averageLoadTime: avgLoadTime,
            memoryUsage: this.getCurrentMemory(),
            activeOperations: this.operations.size,
            totalOperations: totalOps,
            errorsCount: errors
        };
    }
    getRecentOperations(count = 10) {
        return this.completedOperations.slice(-count);
    }
    clearHistory() {
        this.completedOperations = [];
    }
    getCurrentMemory() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            return process.memoryUsage().heapUsed;
        }
        return 0;
    }
}
exports.PerformanceProfiler = PerformanceProfiler;
/**
 * Comprehensive performance optimization system
 */
class PerformanceOptimizer {
    constructor(config = {}) {
        this.config = {
            enableCaching: config.enableCaching ?? true,
            maxCacheSize: config.maxCacheSize ?? 50 * 1024 * 1024,
            cacheTtl: config.cacheTtl ?? 30 * 60 * 1000,
            enableParallelProcessing: config.enableParallelProcessing ?? true,
            maxConcurrency: config.maxConcurrency ?? 4,
            enableMemoryMonitoring: config.enableMemoryMonitoring ?? true,
            memoryPressureThreshold: config.memoryPressureThreshold ?? 0.8
        };
        this.cache = new PerformanceCache(this.config);
        this.processor = new ParallelProcessor(this.config);
        this.memoryMonitor = new MemoryMonitor(this.config);
        this.profiler = new PerformanceProfiler();
    }
    /**
     * Execute operation with full performance optimization
     */
    async optimizedOperation(operationId, cacheKey, operation, description) {
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached !== undefined) {
            return cached;
        }
        // Start profiling
        this.profiler.startOperation(operationId, description);
        try {
            // Check memory pressure
            if (this.memoryMonitor.isMemoryPressureHigh()) {
                this.cache.clear(); // Emergency cache clear
            }
            // Execute operation
            const result = await operation();
            // Cache result
            this.cache.set(cacheKey, result);
            // Record memory usage
            this.memoryMonitor.recordMemoryUsage();
            return result;
        }
        catch (error) {
            throw error;
        }
        finally {
            this.profiler.endOperation(operationId);
        }
    }
    /**
     * Process multiple operations in parallel with optimization
     */
    async optimizedBatch(items, processor, operationIdPrefix = 'batch') {
        const batchId = `${operationIdPrefix}-${Date.now()}`;
        this.profiler.startOperation(batchId, `Batch processing ${items.length} items`);
        try {
            return await this.processor.processInParallel(items, processor);
        }
        finally {
            this.profiler.endOperation(batchId);
        }
    }
    /**
     * Get comprehensive performance metrics
     */
    getMetrics() {
        const metrics = this.profiler.getMetrics();
        metrics.cacheHitRate = this.cache.getHitRate();
        return metrics;
    }
    /**
     * Clear all caches and reset performance data
     */
    reset() {
        this.cache.clear();
        this.profiler.clearHistory();
    }
}
exports.PerformanceOptimizer = PerformanceOptimizer;
/**
 * Default performance optimizer instance
 */
exports.defaultPerformanceOptimizer = new PerformanceOptimizer();
/**
 * Performance utilities
 */
exports.PerformanceUtils = {
    /**
     * Create a cache key from multiple parts
     */
    createCacheKey(...parts) {
        return parts.join(':');
    },
    /**
     * Format performance metrics for display
     */
    formatMetrics(metrics) {
        return [
            `Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`,
            `Avg Load Time: ${metrics.averageLoadTime.toFixed(2)}ms`,
            `Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
            `Active Operations: ${metrics.activeOperations}`,
            `Total Operations: ${metrics.totalOperations}`,
            `Errors: ${metrics.errorsCount}`
        ].join(', ');
    },
    /**
     * Determine optimal concurrency based on system resources
     */
    getOptimalConcurrency() {
        if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
            return Math.max(2, Math.min(8, navigator.hardwareConcurrency));
        }
        return 4; // Default fallback
    }
};
//# sourceMappingURL=performance-optimizations.js.map